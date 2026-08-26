#!/bin/bash
# ===========================================
# National SOC Platform - Production Startup Script
# Algeria 2026-2030 | Telecom Operator Scale
#
# Usage: ./scripts/start-production.sh [command]
# Commands:
#   start       - Start all services
#   stop        - Stop all services
#   restart     - Restart all services
#   status      - Check service status
#   logs        - View logs
#   backup      - Create database backup
#   migrate     - Run database migrations
#   scale       - Scale application instances
#   health      - Health check all services
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="soc-platform"
BACKUP_DIR="./backups"
LOG_DIR="./logs"

# ============= HELPER FUNCTIONS =============

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==> $1${NC}"
}

check_env_file() {
    if [ ! -f ".env" ]; then
        log_warn ".env file not found, copying from .env.docker..."
        cp .env.docker .env
        log_info "Please update .env with your production values!"
        return 1
    fi
    return 0
}

create_directories() {
    mkdir -p "$BACKUP_DIR" "$LOG_DIR" \
        docker/nginx/ssl \
        docker/postgres/init-scripts \
        uploads \
        prisma/migrations
}

# ============= COMMANDS =============

cmd_start() {
    log_step "Starting National SOC Platform..."
    
    check_env_file || true
    create_directories
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE pull
    
    # Start services
    log_info "Starting services..."
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE up -d
    
    # Wait for healthy state
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Show status
    cmd_status
    
    log_info "\n🚀 SOC Platform is starting up!"
    log_info "Application URL: https://localhost (via Nginx)"
    log_info "Health Check: http://localhost/health"
    log_info "API Health: http://localhost/api/health"
}

cmd_stop() {
    log_step "Stopping National SOC Platform..."
    
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down
    
    log_info "✅ All services stopped"
}

cmd_restart() {
    log_step "Restarting National SOC Platform..."
    
    cmd_stop
    sleep 5
    cmd_start
}

cmd_status() {
    log_step "Service Status:"
    
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE ps
    
    echo ""
    log_info "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

cmd_logs() {
    local service=${1:-}
    
    if [ -z "$service" ]; then
        log_info "Showing logs from all services..."
        docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f --tail=100
    else
        log_info "Showing logs from: $service"
        docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f --tail=100 "$service"
    fi
}

cmd_backup() {
    log_step "Creating Database Backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/soc_backup_$TIMESTAMP.sql.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    docker exec soc-postgres pg_dumpall -U soc_user | gzip > "$BACKUP_FILE"
    
    log_info "✅ Backup created: $BACKUP_FILE"
    log_info "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

cmd_migrate() {
    log_step "Running Database Migrations..."
    
    # Run Prisma migrations inside app container
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE exec soc-app npx prisma migrate deploy
    
    log_info "✅ Database migrations completed"
}

cmd_scale() {
    local instances=${1:-3}
    
    log_step "Scaling Application to $instances instances..."
    
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE up -d --scale soc-app=$instances
    
    log_info "✅ Scaled to $instances application instances"
    cmd_status
}

cmd_health() {
    log_step "Health Checks:"
    
    echo ""
    echo -e "${BLUE}PostgreSQL:${NC}"
    docker exec soc-postgres pg_isready -U soc_user && echo "  ✅ Healthy" || echo "  ❌ Unhealthy"
    
    echo ""
    echo -e "${BLUE}Redis:${NC}"
    docker exec soc-redis redis-cli ping && echo "  ✅ Healthy" || echo "  ❌ Unhealthy"
    
    echo ""
    echo -e "${BLUE}Application:${NC}"
    curl -sf http://localhost:3000/api/health > /dev/null && echo "  ✅ Healthy" || echo "  ❌ Unhealthy"
    
    echo ""
    echo -e "${BLUE}Nginx:${NC}"
    curl -sf http://localhost/health > /dev/null && echo "  ✅ Healthy" || echo "  ❌ Unhealthy"
}

cmd_shell() {
    local service=${1:-soc-app}
    
    log_info "Opening shell in: $service"
    docker compose -p $PROJECT_NAME -f $COMPOSE_FILE exec "$service" /bin/sh
}

cmd_cleanup() {
    log_warn "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        docker compose -p $PROJECT_NAME -f $COMPOSE_FILE down -v --rmi all
        log_info "✅ Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# ============= MAIN =============

case "${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "$2"
        ;;
    backup)
        cmd_backup
        ;;
    migrate)
        cmd_migrate
        ;;
    scale)
        cmd_scale "$2"
        ;;
    health)
        cmd_health
        ;;
    shell)
        cmd_shell "$2"
        ;;
    cleanup)
        cmd_cleanup
        ;;
    help|*)
        echo "National SOC Platform - Docker Management Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  start       Start all services"
        echo "  stop        Stop all services"
        echo "  restart     Restart all services"
        echo "  status      Check service status"
        echo "  logs [svc]  View logs (optional: service name)"
        echo "  backup      Create database backup"
        echo "  migrate     Run database migrations"
        echo "  scale [N]   Scale to N app instances (default: 3)"
        echo "  health      Health check all services"
        echo "  shell [svc] Open shell in service"
        echo "  cleanup     Remove all containers and volumes"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start              # Start platform"
        echo "  $0 scale 5            # Scale to 5 instances"
        echo "  $0 logs soc-app       # View app logs"
        echo "  $0 backup             # Create backup"
        ;;
esac
