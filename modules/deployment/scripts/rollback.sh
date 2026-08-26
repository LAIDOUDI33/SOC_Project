#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - Emergency Rollback Script
# Module 9: Production Deployment Scripts
#
# This script handles emergency rollback procedures:
#   - Rollback to previous deployment
#   - Service-level rollback
#   - Database point-in-time recovery
#   - Configuration restoration
#
# Usage:
#   ./rollback.sh [command] [options]
#
# Commands:
#   full           Full system rollback to last known good state
#   service SVC    Rollback specific service only
#   config         Restore configuration from backup
#   database       Restore database from backup
#   list           List available rollback points
#   status         Show current rollback status
#
# Options:
#   --target VER    Target version/backup to rollback to
#   --force         Force rollback without confirmation
#   --dry-run       Show what would be done
#   --keep-current  Keep current state as backup before rollback
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.prod.yml"
BACKUP_DIR="/var/backups/soc"
ROLLBACK_LOG="${PROJECT_ROOT}/.rollback-history"
DEPLOYMENT_INFO="${PROJECT_ROOT}/.deployment-info"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default values
COMMAND="${1:-full}"
shift || true
TARGET_VERSION=""
FORCE=false
DRY_RUN=false
KEEP_CURRENT=false

# =============================================================================
# Utility Functions
# =============================================================================

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') - $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $*" >&2; }
log_step() { echo -e "\n${BLUE}═══ $* ═══${NC}\n"; }

show_banner() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ⚠️  NATIONAL SOC PLATFORM - ROLLBACK PROCEDURE ⚠️      ║
║     Emergency Rollback Script                             ║
║                                                           ║
║     WARNING: This operation will revert the platform       ║
║     to a previous state. Use with caution!                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [command] [options]

Commands:
    full           Full system rollback to last known good state
    service SVC    Rollback specific service (postgres, redis, etc.)
    config         Restore configuration files from backup
    database       Restore databases from backup
    list           List available rollback points
    status         Show current deployment and rollback status

Options:
    --target VER    Target backup/version to rollback to
    --force         Force without confirmation prompts
    --dry-run       Show what would be done without executing
    --keep-current  Backup current state before rollback
    -h, --help      Show this help message

Examples:
    $(basename "$0") full                          # Full rollback
    $(basename "$0") full --target 20240115_120000  # Rollback to specific backup
    $(basename "$0") service postgres               # Rollback PostgreSQL only
    $(basename "$0") list                           # Show available rollbacks

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --target)       TARGET_VERSION="$2"; shift 2 ;;
            --force)        FORCE=true; shift ;;
            --dry-run)      DRY_RUN=true; shift ;;
            --keep-current) KEEP_CURRENT=true; shift ;;
            -h|--help)      show_usage; exit 0 ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
}

confirm_action() {
    local message="$1"
    
    if [[ "${FORCE}" == "true" ]]; then
        return 0
    fi
    
    echo ""
    echo -e "${RED}${message}${NC}"
    read -rp "Type 'ROLLBACK' to confirm: " confirm
    
    if [[ "${confirm}" == "ROLLBACK" ]]; then
        return 0
    else
        log_error "Rollback cancelled by user."
        exit 1
    fi
}

get_current_version() {
    if [[ -f "${DEPLOYMENT_INFO}" ]]; then
        grep "^version=" "${DEPLOYMENT_INFO}" | cut -d'=' -f2 || echo "unknown"
    else
        echo "unknown"
    fi
}

get_latest_backup() {
    if [[ -n "${TARGET_VERSION}" ]]; then
        find "${BACKUP_DIR}" -name "*${TARGET_VERSION}*" -type f \( -name "*.tar.gz" -o -name "*.sql.gz" \) 2>/dev/null | head -1
    else
        find "${BACKUP_DIR}" -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | sort -r | head -1
    fi
}

log_rollback_event() {
    local action="$1"
    local target="$2"
    local result="$3"
    local timestamp
    timestamp=$(date -Iseconds)
    
    echo "${timestamp}|${action}|${target}|$(whoami)|${result}" >> "${ROLLBACK_LOG}"
}

# =============================================================================
# Pre-Rollback Safety Checks
# =============================================================================

safety_checks() {
    log_step "Running safety checks..."
    
    # Check Docker is running
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running!"
        exit 1
    fi
    log_info "✓ Docker daemon is running"
    
    # Check compose file exists
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Docker Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi
    log_info "✓ Docker Compose file exists"
    
    # Check for backups
    local backup_count
    backup_count=$(find "${BACKUP_DIR}" -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | wc -l)
    
    if [[ ${backup_count} -eq 0 ]]; then
        log_error "No pre-deployment backups found!"
        log_error "Cannot perform rollback safely."
        exit 1
    fi
    log_info "✓ Found ${backup_count} backup(s) available"
    
    # Check disk space (need at least 5GB free)
    local free_space
    free_space=$(df / | awk 'NR==2 {print $4}')
    
    if [[ ${free_space} -lt 5242880 ]]; then  # 5GB in KB
        log_warn "Low disk space: less than 5GB free"
    else
        log_info "✓ Sufficient disk space available"
    fi
}

# =============================================================================
# Command Implementations
# =============================================================================

cmd_full() {
    show_banner
    safety_checks
    
    local current_version
    current_version=$(get_current_version)
    local target_backup
    target_backup=$(get_latest_backup)
    
    if [[ -z "${target_backup}" ]]; then
        log_error "No suitable backup found for rollback!"
        exit 1
    fi
    
    log_step "Full System Rollback"
    log_info "Current version: ${current_version}"
    log_info "Target backup: ${target_backup}"
    
    confirm_action "⚠️  This will stop all services and restore from backup!"
    
    # Backup current state if requested
    if [[ "${KEEP_CURRENT}" == "true" ]]; then
        log_info "Backing up current state before rollback..."
        bash "${SCRIPT_DIR}/backup.sh" pre-deploy || log_warn "Pre-rollback backup failed"
    fi
    
    # Stop all services
    log_info "Stopping all services..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: docker compose down"
    else
        docker compose -f "${COMPOSE_FILE}" down --remove-orphans || {
            log_error "Failed to stop services"
            exit 1
        }
    fi
    
    # Restore from backup
    log_info "Restoring from backup..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: tar xzf ${target_backup} -C /"
    else
        tar xzf "${target_backup}" -C / || {
            log_error "Failed to restore from backup!"
            log_error "System may be in inconsistent state!"
            exit 1
        }
    fi
    
    # Start services
    log_info "Starting services with restored configuration..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: docker compose up -d"
    else
        docker compose -f "${COMPOSE_FILE}" up -d || {
            log_error "Failed to start services after rollback!"
            exit 1
        }
    fi
    
    # Wait for services
    log_info "Waiting for services to initialize..."
    sleep 60
    
    # Verify
    log_info "Verifying rollback..."
    if [[ "${DRY_RUN}" != "true" ]]; then
        if bash "${SCRIPT_DIR}/health-check.sh" --quick; then
            log_rollback_event "full" "${target_backup}" "success"
            
            echo ""
            log_info "==========================================="
            log_info "✅ Rollback completed successfully!"
            log_info "==========================================="
        else
            log_rollback_event "full" "${target_backup}" "partial"
            log_warn "Rollback completed but health check shows issues."
            log_warn "Manual intervention may be required."
        fi
    else
        log_info "[DRY-RUN] Rollback simulation complete"
    fi
}

cmd_service() {
    local service="${1:-}"
    
    if [[ -z "${service}" ]]; then
        log_error "Please specify a service to rollback."
        log_info "Available services: postgres, redis, elasticsearch, wazuh-manager, misp, thehive, cortex"
        exit 1
    fi
    
    show_banner
    log_step "Service Rollback: ${service}"
    
    # Find service-specific backup
    local service_backup
    service_backup=$(find "${BACKUP_DIR}" -name "*_${service}*" -type f 2>/dev/null | sort -r | head -1)
    
    if [[ -z "${service_backup}" ]]; then
        log_warn "No specific backup found for ${service}"
        log_info "Will attempt to recreate container from compose definition"
        
        confirm_action "⚠️  This will recreate the ${service} container!"
        
        if [[ "${DRY_RUN}" != "true" ]]; then
            docker compose -f "${COMPOSE_FILE}" up -d --force-recreate "${service}" || {
                log_error "Failed to recreate ${service}"
                exit 1
            }
            
            sleep 30
            
            if docker ps | grep -q "soc-${service}"; then
                log_info "✅ Service ${service} recreated successfully"
            else
                log_error "❌ Failed to start ${service}"
                exit 1
            fi
        fi
    else
        log_info "Found backup: ${service_backup}"
        confirm_action "⚠️  This will restore ${service} from backup!"
        
        # Stop the service
        log_info "Stopping ${service}..."
        docker compose -f "${COMPOSE_FILE}" stop "${service}" 2>/dev/null || true
        
        # Restore data (implementation depends on service type)
        case "${service}" in
            postgres)
                log_info "Restoring PostgreSQL database..."
                if [[ "${DRY_RUN}" != "true" ]]; then
                    gunzip -c "${service_backup}" | docker exec -i soc-postgres psql -U soc_admin || {
                        log_error "PostgreSQL restore failed"
                        exit 1
                    }
                fi
                ;;
            redis)
                log_info "Restoring Redis data..."
                if [[ "${DRY_RUN}" != "true" ]]; then
                    docker cp "${service_backup}" soc-redis:/data/dump.rdb && \
                    docker restart soc-redis || {
                        log_error "Redis restore failed"
                        exit 1
                    }
                fi
                ;;
            *)
                log_error "Automated restore not implemented for ${service}"
                log_info "Manual restore may be required from: ${service_backup}"
                ;;
        esac
        
        # Restart the service
        log_info "Restarting ${service}..."
        if [[ "${DRY_RUN}" != "true" ]]; then
            docker compose -f "${COMPOSE_FILE}" up -d "${service}"
        fi
    fi
    
    log_rollback_event "service:${service}" "${service_backup:-recreate}" "success"
    log_info "✅ Service rollback completed for ${service}"
}

cmd_config() {
    show_banner
    log_step "Configuration Restoration"
    
    local config_backup
    config_backup=$(find "${BACKUP_DIR}" -name "*configs*.tar.gz" -type f 2>/dev/null | sort -r | head -1)
    
    if [[ -z "${config_backup}" ]]; then
        log_error "No configuration backup found!"
        exit 1
    fi
    
    log_info "Configuration backup: ${config_backup}"
    confirm_action "⚠️  This will overwrite current configuration files!"
    
    if [[ "${DRY_RUN}" != "true" ]]; then
        # Backup current configs first
        local temp_backup
        temp_backup="${BACKUP_DIR}/pre-config-restore-$(date +%s).tar.gz"
        tar czf "${temp_backup}" -C "${PROJECT_ROOT}" configs/ 2>/dev/null || true
        
        # Restore configurations
        tar xzf "${config_backup}" -C / || {
            log_error "Configuration restore failed!"
            # Attempt to restore our backup
            tar xzf "${temp_backup}" -C /
            exit 1
        }
        
        log_info "Configurations restored. Restarting affected services..."
        docker compose -f "${COMPOSE_FILE}" restart nginx api-gateway frontend 2>/dev/null || true
    fi
    
    log_rollback_event "config" "${config_backup}" "success"
    log_info "✅ Configuration restored successfully"
}

cmd_database() {
    show_banner
    log_step "Database Restoration"
    
    local db_type="${1:-all}"
    
    case "${db_type}" in
        postgres|mysql|redis|elasticsearch|all)
            ;;
        *)
            log_error "Invalid database type: ${db_type}"
            log_info "Valid types: postgres, mysql, redis, elasticsearch, all"
            exit 1
            ;;
    esac
    
    confirm_action "⚠️  This will restore database(s)! Current data will be lost!"
    
    local db_backups
    if [[ "${db_type}" == "all" ]]; then
        db_backups=$(find "${BACKUP_DIR}/databases" -name "*.sql.gz" -o -name "*.rdb" 2>/dev/null | sort -r)
    else
        db_backups=$(find "${BACKUP_DIR}/databases" -name "*${db_type}*" 2>/dev/null | sort -r | head -1)
    fi
    
    if [[ -z "${db_backups}" ]]; then
        log_error "No database backups found!"
        exit 1
    fi
    
    for backup in ${db_backups}; do
        log_info "Processing: ${backup}"
        
        if [[ "${backup}" == *postgres* ]] && [[ "${db_type}" =~ ^(postgres|all)$ ]]; then
            log_info "Restoring PostgreSQL..."
            if [[ "${DRY_RUN}" != "true" ]]; then
                gunzip -c "${backup}" | docker exec -i soc-postgres psql -U soc_admin || \
                    log_warn "PostgreSQL restore may have issues"
            fi
        elif [[ "${backup}" == *redis* ]] && [[ "${db_type}" =~ ^(redis|all)$ ]]; then
            log_info "Restoring Redis..."
            if [[ "${DRY_RUN}" != "true" ]]; then
                docker exec soc-redis redis-cli FLALL || true
                docker cp "${backup}" soc-redis:/data/dump.rdb
                docker restart soc-redis
            fi
        elif [[ "${backup}" == *misp* ]] && [[ "${db_type}" == "all" ]]; then
            log_info "Restoring MISP database..."
            if [[ "${DRY_RUN}" != "true" ]]; then
                gunzip -c "${backup}" | docker exec -i soc-misp mysql -u misp -p"${MISP_MYSQL_PASSWORD:-}" misp || \
                    log_warn "MISP restore may have issues"
            fi
        fi
    done
    
    log_rollback_event "database" "${db_type}" "success"
    log_info "✅ Database restoration completed"
}

cmd_list() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     Available Rollback Points          ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    printf "%-40s %-12s %-10s %s\n" "BACKUP FILE" "TYPE" "SIZE" "DATE"
    printf "%-40s %-12 %-10 %s\n" "────────────────────────────────" "──────" "─────" "──────────"
    
    # Pre-deploy backups
    find "${BACKUP_DIR}" -maxdepth 1 -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | sort -r | while read -r f; do
        local name size date
        name=$(basename "${f}")
        size=$(du -sh "${f}" | cut -f1)
        date=$(stat -c '%y' "${f}" | cut -d'.' -f1)
        printf "%-40s %-12s %-10s %s\n" "${name}" "pre-deploy" "${size}" "${date}"
    done
    
    # Database backups
    echo ""
    echo "--- Database Backups ---"
    find "${BACKUP_DIR}/databases" -type f 2>/dev/null | sort -r | head -20 | while read -r f; do
        local name size date
        name=$(basename "${f}")
        size=$(du -sh "${f}" | cut -f1)
        date=$(stat -c '%y' "${f}" | cut -d'.' -f1)
        printf "%-40s %-12s %-10s %s\n" "${name}" "database" "${size}" "${date}"
    done
    
    # Config backups
    echo ""
    echo "--- Configuration Backups ---"
    find "${BACKUP_DIR}/configs" -type f 2>/dev/null | sort -r | head -10 | while read -r f; do
        local name size date
        name=$(basename "${f}")
        size=$(du -sh "${f}" | cut -f1)
        date=$(stat -c '%y' "${f}" | cut -d'.' -f1)
        printf "%-40s %-12s %-10s %s\n" "${name}" "config" "${size}" "${date}"
    done
    
    # Rollback history
    if [[ -f "${ROLLBACK_LOG}" ]]; then
        echo ""
        echo "--- Recent Rollback History ---"
        printf "%-25s %-15s %-30s %-8s\n" "TIMESTAMP" "ACTION" "TARGET" "RESULT"
        tail -10 "${ROLLBACK_LOG}" | while IFS='|' read -r ts action target user result; do
            printf "%-25s %-15s %-30s %-8s\n" "${ts}" "${action}" "${target}" "${result}"
        done
    fi
}

cmd_status() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     Rollback Status                    ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    echo "--- Current Deployment ---"
    if [[ -f "${DEPLOYMENT_INFO}" ]]; then
        cat "${DEPLOYMENT_INFO}"
    else
        echo "No deployment information found"
    fi
    
    echo ""
    echo "--- Available Rollbacks ---"
    local backup_count
    backup_count=$(find "${BACKUP_DIR}" -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | wc -l)
    echo "Pre-deploy backups: ${backup_count}"
    
    local latest_backup
    latest_backup=$(find "${BACKUP_DIR}" -name "pre-deploy-*.tar.gz" -type f 2>/dev/null | sort -r | head -1)
    if [[ -n "${latest_backup}" ]]; then
        echo "Latest backup: $(basename "${latest_backup}")"
        echo "Backup age: $(( ($(date +%s) - $(stat -c '%Y' "${latest_backup}")) / 3600 )) hours ago"
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_arguments "$@"
    
    case "${COMMAND}" in
        full)     cmd_full ;;
        service)  cmd_service "${1:-}" ;;
        config)   cmd_config ;;
        database) cmd_database "${1:-all}" ;;
        list)     cmd_list ;;
        status)   cmd_status ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
