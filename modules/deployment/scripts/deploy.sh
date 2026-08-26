#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - Main Deployment Script
# Module 9: Production Deployment Scripts
#
# Usage:
#   ./deploy.sh [command] [options]
#
# Commands:
#   deploy      - Deploy or update the platform (default)
#   rollback    - Rollback to previous version
#   status      - Show deployment status
#   stop        - Stop all services
#   start       - Start all services
#   restart     - Restart all services
#   logs        - Show service logs
#
# Options:
#   --env FILE          - Environment file path (default: .env)
#   --services SVC,...  - Specific services to deploy
#   --no-backup         - Skip backup before deployment
#   --force             - Force deployment without confirmation
#   --dry-run           - Show what would be done without executing
#   --verbose           - Enable verbose output
#   --version VER       - Deploy specific version
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_DIR="${PROJECT_ROOT}/docker"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_ROOT}/configs/.env"
BACKUP_DIR="/var/backups/soc"
LOG_DIR="/var/log/soc"
DEPLOYMENT_INFO="${PROJECT_ROOT}/.deployment-info"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMMAND="${1:-deploy}"
shift || true
NO_BACKUP=false
FORCE=false
DRY_RUN=false
VERBOSE=false
SPECIFIC_SERVICES=""
VERSION=""

# =============================================================================
# Utility Functions
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*" >&2
}

log_debug() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
    fi
}

show_banner() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║     National SOC Platform - Deployment Script              ║"
    echo "║     Algeria (2026-2030)                                    ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [command] [options]

Commands:
    deploy      Deploy or update the platform (default)
    rollback    Rollback to previous version
    status      Show deployment and service status
    stop        Stop all services
    start       Start all services
    restart     Restart all services
    logs        Show service logs

Options:
    --env FILE          Environment file path (default: .env)
    --services SVC,...  Deploy specific services only
    --no-backup         Skip backup before deployment
    --force             Force without confirmation
    --dry-run           Show what would be done
    --verbose           Enable verbose output
    --version VER       Deploy specific version/tag
    -h, --help          Show this help message

Examples:
    $(basename "$0") deploy                          # Full deployment
    $(basename "$0") deploy --services postgres,redis # Deploy specific services
    $(basename "$0") rollback                        # Rollback to previous version
    $(basename "$0") logs --services wazuh-manager    # View Wazuh logs
    $(basename "$0") status                           # Show current status

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --env)
                ENV_FILE="$2"
                shift 2
                ;;
            --services)
                SPECIFIC_SERVICES="$2"
                shift 2
                ;;
            --no-backup)
                NO_BACKUP=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

check_prerequisites() {
    log_debug "Checking prerequisites..."
    
    local missing=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        missing+=("docker-compose")
    fi
    
    # Check compose file
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Docker Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_warn "Environment file not found: ${ENV_FILE}"
        log_warn "Run './init-environment.sh' to create it"
        if [[ "${FORCE}" != "true" ]]; then
            exit 1
        fi
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi
    
    log_debug "Prerequisites check passed"
}

ensure_directories() {
    local dirs=(
        "${BACKUP_DIR}"
        "${LOG_DIR}"
        "${BACKUP_DIR}/images"
        "${BACKUP_DIR}/configs"
        "${BACKUP_DIR}/databases"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "${dir}" ]]; then
            mkdir -p "${dir}"
            log_debug "Created directory: ${dir}"
        fi
    done
}

get_current_version() {
    if [[ -f "${DEPLOYMENT_INFO}" ]]; then
        grep "^version:" "${DEPLOYMENT_INFO}" | cut -d' ' -f2 || echo "unknown"
    else
        echo "none"
    fi
}

record_deployment() {
    local version="${1:-unknown}"
    local status="${2:-success}"
    local timestamp
    timestamp=$(date '+%Y-%m-%dT%H:%M:%S%z')
    
    cat > "${DEPLOYMENT_INFO}" << EOF
# Deployment Information
deployed_at=${timestamp}
version=${version}
environment=${SOC_ENVIRONMENT:-production}
deployed_by=$(whoami)
status=${status}
EOF
    
    # Log to deployment history
    echo "${timestamp}|${version}|$(whoami)|${status}" >> "${LOG_DIR}/deployments.log"
}

# =============================================================================
# Command Implementations
# =============================================================================

cmd_deploy() {
    show_banner
    log_info "Starting deployment..."
    
    check_prerequisites
    ensure_directories
    
    local current_version
    current_version=$(get_current_version)
    local target_version="${VERSION:-latest}"
    
    log_info "Current version: ${current_version}"
    log_info "Target version: ${target_version}"
    
    # Pre-deployment health check
    if [[ "${FORCE}" != "true" ]] && [[ "${current_version}" != "none" ]]; then
        log_info "Running pre-deployment health check..."
        if ! bash "${SCRIPT_DIR}/health-check.sh" --quick 2>/dev/null; then
            log_warn "Pre-deployment health check failed!"
            if [[ "${FORCE}" != "true" ]]; then
                read -rp "Continue anyway? [y/N] " confirm
                if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
                    log_info "Deployment cancelled."
                    exit 0
                fi
            fi
        fi
    fi
    
    # Backup before deployment
    if [[ "${NO_BACKUP}" != "true" ]]; then
        log_info "Creating pre-deployment backup..."
        bash "${SCRIPT_DIR}/backup.sh" --pre-deploy || log_warn "Backup failed, continuing..."
    fi
    
    # Build docker compose command
    local compose_cmd="docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE}"
    
    if [[ -n "${SPECIFIC_SERVICES}" ]]; then
        compose_cmd+=" ${SPECIFIC_SERVICES//,/ }"
    fi
    
    # Pull images
    log_info "Pulling Docker images..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: ${compose_cmd} pull"
    else
        eval "${compose_cmd} pull" || {
            log_error "Failed to pull images"
            exit 1
        }
    fi
    
    # Deploy/Update
    log_info "Deploying services..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: ${compose_cmd} up -d --remove-orphans"
    else
        eval "${compose_cmd} up -d --remove-orphans" || {
            log_error "Deployment failed! Initiating rollback..."
            cmd_rollback
            exit 1
        }
    fi
    
    # Wait for services
    log_info "Waiting for services to become healthy..."
    sleep 30
    
    # Post-deployment verification
    log_info "Running post-deployment verification..."
    local verify_attempts=0
    local max_attempts=6
    
    while [[ ${verify_attempts} -lt ${max_attempts} ]]; do
        if bash "${SCRIPT_DIR}/health-check.sh" --quick 2>/dev/null; then
            break
        fi
        ((verify_attempts++)) || true
        log_warn "Verification attempt ${verify_attempts}/${max_attempts} failed, retrying in 30s..."
        sleep 30
    done
    
    if [[ ${verify_attempts} -ge ${max_attempts} ]]; then
        log_error "Post-deployment verification failed after ${max_attempts} attempts"
        if [[ "${AUTO_ROLLBACK:-true}" == "true" ]]; then
            cmd_rollback
        fi
        exit 1
    fi
    
    record_deployment "${target_version}" "success"
    
    log_info "==========================================="
    log_info "✅ Deployment completed successfully!"
    log_info "Version: ${target_version}"
    log_info "==========================================="
}

cmd_rollback() {
    show_banner
    log_info "Initiating rollback procedure..."
    
    check_prerequisites
    ensure_directories
    
    # Find latest backup
    local latest_backup
    latest_backup=$(find "${BACKUP_DIR}" -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | sort -r | head -1)
    
    if [[ -z "${latest_backup}" ]]; then
        log_error "No backup found for rollback!"
        exit 1
    fi
    
    log_info "Found backup: ${latest_backup}"
    
    if [[ "${FORCE}" != "true" ]]; then
        read -rp "Are you sure you want to rollback? This will restore from backup. [y/N] " confirm
        if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
            log_info "Rollback cancelled."
            exit 0
        fi
    fi
    
    # Stop current services
    log_info "Stopping current services..."
    docker compose -f "${COMPOSE_FILE}" down || true
    
    # Restore backup
    log_info "Restoring from backup..."
    tar xzf "${latest_backup}" -C / || {
        log_error "Failed to restore from backup"
        exit 1
    }
    
    # Start services with restored configuration
    log_info "Starting services with restored configuration..."
    docker compose -f "${COMPOSE_FILE}" up -d || {
        log_error "Failed to start services after rollback"
        exit 1
    }
    
    # Wait for services
    log_info "Waiting for services to start..."
    sleep 60
    
    # Verify rollback
    log_info "Verifying rollback..."
    bash "${SCRIPT_DIR}/health-check.sh" || {
        log_warn "Health check after rollback shows issues - manual intervention may be required"
    }
    
    record_deployment "rollback-$(date +%s)" "rolled-back"
    
    log_info "==========================================="
    log_info "✅ Rollback completed successfully!"
    log_info "==========================================="
}

cmd_status() {
    show_banner
    log_info "Platform Status Report"
    echo ""
    
    # System info
    echo "--- System Information ---"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p)"
    echo "Memory: $(free -h | awk '/Mem:/ {print $3 "/" $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
    echo ""
    
    # Deployment info
    echo "--- Deployment Information ---"
    if [[ -f "${DEPLOYMENT_INFO}" ]]; then
        cat "${DEPLOYMENT_INFO}"
    else
        echo "No deployment information found"
    fi
    echo ""
    
    # Service status
    echo "--- Service Status ---"
    if docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null; then
        :
    else
        echo "Docker Compose not running or no services defined"
    fi
    echo ""
    
    # Quick health summary
    echo "--- Health Summary ---"
    bash "${SCRIPT_DIR}/health-check.sh" --quick 2>/dev/null || echo "Some services may have issues"
}

cmd_stop() {
    log_info "Stopping all SOC Platform services..."
    docker compose -f "${COMPOSE_FILE}" down
    log_info "All services stopped."
}

cmd_start() {
    log_info "Starting all SOC Platform services..."
    docker compose -f "${COMPOSE_FILE}" up -d
    log_info "Services starting... Use 'logs' command to monitor startup."
}

cmd_restart() {
    log_info "Restarting all SOC Platform services..."
    docker compose -f "${COMPOSE_FILE}" restart
    log_info "Services restarted."
}

cmd_logs() {
    local follow="--follow"
    local tail="100"
    
    if [[ "${1:-}" == "--no-follow" ]]; then
        follow=""
    fi
    
    local cmd="docker compose -f ${COMPOSE_FILE} logs ${follow} --tail=${tail}"
    
    if [[ -n "${SPECIFIC_SERVICES}" ]]; then
        cmd+=" ${SPECIFIC_SERVICES//,/ }"
    fi
    
    eval "${cmd}"
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_arguments "$@"
    
    case "${COMMAND}" in
        deploy)
            cmd_deploy
            ;;
        rollback)
            cmd_rollback
            ;;
        status)
            cmd_status
            ;;
        stop)
            cmd_stop
            ;;
        start)
            cmd_start
            ;;
        restart)
            cmd_restart
            ;;
        logs)
            cmd_logs "$@"
            ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
