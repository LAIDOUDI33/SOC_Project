#!/bin/bash
# 🇩🇿 National SOC - Production Deployment Script
# Automated deployment with health checks

set -e  # Exit on any error

# ────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/docker"
COMPOSE_FILE="${DOCKER_DIR}/docker-compose.yml"
ENV_FILE="${DOCKER_DIR}/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────
# UTILITY FUNCTIONS
# ────────────────────────────────────────────────────────
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Installing..."
        install_docker
    else
        log_success "Docker is installed: $(docker --version)"
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose V2 is not installed"
        exit 1
    fi
}

install_docker() {
    log_info "Installing Docker Engine..."
    
    # Update packages
    apt-get update
    
    # Install dependencies
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installed successfully"
}

# ────────────────────────────────────────────────────────
# PRE-DEPLOYMENT CHECKS
# ────────────────────────────────────────────────────────
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check .env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning ".env file not found. Creating from template..."
        cp "${ENV_FILE}.example" "$ENV_FILE"
        log_error "Please edit ${ENV_FILE} with your configuration before running deploy again."
        exit 1
    fi
    
    # Validate required variables
    source "$ENV_FILE"
    
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "MINIO_ACCESS_KEY"
        "MINIO_SECRET_KEY"
        "NEXTAUTH_SECRET"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]] || [[ "${!var}" == CHANGE_ME* ]]; then
            log_error "Required environment variable ${var} is not set or still has default value in .env"
            exit 1
        fi
    done
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df -BG "$DOCKER_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ "$available_space" -lt 10 ]]; then
        log_warning "Low disk space: ${available_space}GB available (recommended: 10GB+)"
    fi
    
    # Check available memory
    local total_mem=$(free -g | awk '/Mem:/ {print $2}')
    if [[ "$total_mem" -lt 8 ]]; then
        log_warning "Low RAM: ${total_mem}GB total (recommended: 8GB+)"
    fi
    
    log_success "Pre-deployment checks passed"
}

# ────────────────────────────────────────────────────────
# SSL CERTIFICATE SETUP
# ────────────────────────────────────────────────────────
setup_ssl() {
    log_info "Setting up SSL certificates..."
    
    local ssl_dir="${DOCKER_DIR}/ssl"
    mkdir -p "$ssl_dir"
    
    if [[ "$SSL_STAGING" == "true" ]]; then
        log_info "Using Let's Encrypt staging environment (for testing)"
        STAGING_FLAG="--staging"
    else
        STAGING_FLAG=""
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        apt-get update
        apt-get install -y certbot
    fi
    
    # Obtain certificate
    certbot certonly --webroot \
        -w "${DOCKER_DIR}/html" \
        -d "$SSL_DOMAIN" \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --non-interactive \
        $STAGING_FLAG \
        --rsa-key-size 4096
    
    # Copy certificates to expected location
    cp "/etc/letsencrypt/live/${SSL_DOMAIN}/fullchain.pem" "${ssl_dir}/fullchain.pem"
    cp "/etc/letsencrypt/live/${SSL_DOMAIN}/privkey.pem" "${ssl_dir}/privkey.pem"
    cp "/etc/letsencrypt/live/${SSL_DOMAIN}/chain.pem" "${ssl_dir}/chain.pem"
    
    # Set up auto-renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/${SSL_DOMAIN}/*.pem ${ssl_dir}/ && cd ${DOCKER_DIR} && docker compose restart nginx") | crontab -
    
    log_success "SSL certificates configured for ${SSL_DOMAIN}"
}

# ────────────────────────────────────────────────────────
# DEPLOYMENT FUNCTIONS
# ────────────────────────────────────────────────────────
deploy_infrastructure() {
    log_info "Deploying SOC infrastructure stack..."
    
    cd "$DOCKER_DIR"
    
    # Pull latest images
    log_info "Pulling Docker images..."
    docker compose pull
    
    # Create volumes and networks
    log_info "Creating infrastructure..."
    docker compose up -d --build --remove-orphans
    
    log_success "Infrastructure deployed"
}

wait_for_healthy() {
    log_info "Waiting for services to become healthy..."
    
    local services=("postgres" "redis" "nginx")
    local max_attempts=30
    local attempt=1
    
    for service in "${services[@]}"; do
        log_info "Checking ${service} health..."
        
        while [[ $attempt -le $max_attempts ]]; do
            if docker compose ps "$service" | grep -q "healthy\|running"; then
                log_success "${service} is healthy"
                break
            fi
            
            log_info "Attempt ${attempt}/${max_attempts} - waiting for ${service}..."
            sleep 5
            ((attempt++))
        done
        
        if [[ $attempt -gt $max_attempts ]]; then
            log_error "${service} failed to become healthy within timeout"
            show_logs "$service"
            exit 1
        fi
        
        attempt=1
    done
}

show_logs() {
    local service="$1"
    log_error "Recent logs for ${service}:"
    docker compose logs --tail=50 "$service"
}

run_health_check() {
    log_info "Running health check..."
    
    # Wait a moment for everything to settle
    sleep 10
    
    # Test nginx health endpoint
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "000")
    if [[ "$http_code" == "200" ]]; then
        log_success "Nginx health check passed (HTTP ${http_code})"
    else
        log_warning "Nginx health check returned HTTP ${http_code}"
    fi
    
    # Test HTTPS (if configured)
    if [[ -f "${DOCKER_DIR}/ssl/fullchain.pem" ]]; then
        local https_code=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost/health || echo "000")
        if [[ "$https_code" == "200" ]]; then
            log_success "HTTPS health check passed (HTTP ${https_code})"
        fi
    fi
    
    # Show service status
    log_info "Service status:"
    docker compose ps
}

# ────────────────────────────────────────────────────────
# MAIN DEPLOYMENT COMMANDS
# ────────────────────────────────────────────────────────
deploy() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     🇩🇿 National SOC Production Deployment              ║"
    echo "║     Algeria 2026-2030 | Open Source Platform             ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    check_root
    check_docker
    pre_deploy_checks
    
    # Optional SSL setup
    if [[ "$1" == "--ssl" ]] || [[ "$1" == "--all" ]]; then
        setup_ssl
    fi
    
    deploy_infrastructure
    wait_for_healthy
    run_health_check
    
    echo ""
    log_success "=========================================="
    log_success "  🎉 SOC Platform Deployed Successfully!"
    log_success "=========================================="
    echo ""
    log_info "Next steps:"
    log_info "  1. View logs:   ./manage.sh logs"
    log_info "  2. Check status: ./manage.sh status"
    log_info "  3. Stop stack:   ./manage.sh stop"
    echo ""
}

stop() {
    cd "$DOCKER_DIR"
    log_info "Stopping SOC platform..."
    docker compose down
    log_success "Platform stopped"
}

start() {
    cd "$DOCKER_DIR"
    log_info "Starting SOC platform..."
    docker compose up -d
    wait_for_healthy
    log_success "Platform started"
}

restart() {
    stop
    sleep 5
    start
}

logs() {
    cd "$DOCKER_DIR"
    local service="$1"
    if [[ -n "$service" ]]; then
        docker compose logs -f "$service"
    else
        docker compose logs -f
    fi
}

status() {
    cd "$DOCKER_DIR"
    echo ""
    log_info "SOC Platform Status:"
    echo "───────────────────────────────────────────"
    docker compose ps
    echo ""
    log_info "Resource Usage:"
    echo "───────────────────────────────────────────"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

backup() {
    log_info "Creating backup..."
    local backup_dir="/opt/soc/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    cd "$DOCKER_DIR"
    
    # Backup PostgreSQL
    docker compose exec postgres pg_dumpall -U soc_admin > "${backup_dir}/database.sql"
    
    # Backup Redis
    docker compose exec redis redis-cli BGSAVE
    cp "${SCRIPT_DIR}/data/redis/dump.rdb" "${backup_dir}/" 2>/dev/null || true
    
    # Backup MinIO (if using)
    docker exec soc-minio mc mirror data/ "${backup_dir}/minio/" 2>/dev/null || true
    
    # Compress backup
    tar -czf "${backup_dir}.tar.gz" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    log_success "Backup created: ${backup_dir}.tar.gz"
}

cleanup() {
    cd "$DOCKER_DIR"
    log_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (yes/no): " confirm
    if [[ "$confirm" == "yes" ]]; then
        docker compose down -v --remove-orphans
        docker system prune -af
        log_success "Cleanup complete"
    else
        log_info "Aborted"
    fi
}

# ────────────────────────────────────────────────────────
# CLI INTERFACE
# ────────────────────────────────────────────────────────
case "${1:-help}" in
    deploy|init)
        deploy "$2"
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$2"
        ;;
    status)
        status
        ;;
    backup)
        backup
        ;;
    cleanup)
        cleanup
        ;;
    ssl)
        setup_ssl
        ;;
    help|--help|-h)
        echo ""
        echo "🇩🇿 National SOC Platform Manager"
        echo "─────────────────────────────────"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  deploy [--ssl|--all]  Deploy full infrastructure stack"
        echo "  start                 Start all services"
        echo "  stop                  Stop all services"
        echo "  restart               Restart all services"
        echo "  logs [service]        View logs (optionally for specific service)"
        echo "  status                Show service status and resource usage"
        echo "  backup                Create database and file backups"
        echo "  cleanup               Remove all containers and volumes"
        echo "  ssl                   Setup/renew SSL certificates"
        echo "  help                  Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 deploy --ssl       Deploy with SSL certificate setup"
        echo "  $0 logs postgres      View PostgreSQL logs"
        echo "  $0 status             Check all services"
        echo ""
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
