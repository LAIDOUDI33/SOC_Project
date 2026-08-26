#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - Backup Automation Script
# Module 9: Production Deployment Scripts
#
# Usage:
#   ./backup.sh [command] [options]
#
# Commands:
#   full        - Full backup of all data
#   databases   - Backup only databases
#   files       - Backup configuration and files
#   pre-deploy  - Quick backup before deployment
#   list        - List available backups
#   restore     - Restore from a specific backup
#   cleanup     - Remove old backups per retention policy
#
# Options:
#   --type TYPE         - Backup type: full|incremental (default: full)
#   --destination DIR   - Custom destination directory
#   --compress LEVEL    - Compression level (1-9, default: 6)
#   --encrypt           - Encrypt backup with GPG
#   --no-verify         - Skip backup verification
#   --dry-run           - Show what would be done
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.prod.yml"
BACKUP_BASE="/var/backups/soc"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DATE_ONLY=$(date '+%Y%m%d')

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
COMMAND="${1:-full}"
shift || true
BACKUP_TYPE="full"
DESTINATION=""
COMPRESSION_LEVEL=6
ENCRYPT=false
VERIFY=true
DRY_RUN=false

# Retention policy (configurable)
RETENTION_HOURLY=24
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=12
MIN_AGE_HOURS=1
MAX_STORAGE_GB=500

# =============================================================================
# Utility Functions
# =============================================================================

log_info() { echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') - $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') - $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $*" >&2; }
log_debug() { [[ "${VERBOSE:-false}" == "true" ]] && echo -e "${BLUE}[DEBUG]${NC} $(date '+%H:%M:%S') - $*"; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") [command] [options]

Commands:
    full        Full backup of all data (databases, configs, files)
    databases   Backup only databases (PostgreSQL, Redis, Elasticsearch)
    files       Backup configuration files and static assets
    pre-deploy  Quick backup before deployment
    list        List available backups with details
    restore     Restore from a specific backup
    cleanup     Remove old backups per retention policy

Options:
    --type TYPE         Backup type: full|incremental (default: full)
    --destination DIR   Custom destination directory
    --compress LEVEL    Compression level 1-9 (default: 6)
    --encrypt           Encrypt backup with GPG
    --no-verify         Skip backup verification
    --dry-run           Show what would be done without executing
    -h, --help          Show this help message

Examples:
    $(basename "$0") full                          # Full backup
    $(basename "$0") databases                     # Database only
    $(basename "$0") pre-deploy                    # Quick pre-deploy backup
    $(basename "$0") list                          # List backups
    $(basename "$0") restore --backup 20240115_120000  # Restore specific backup
    $(basename "$0") cleanup                       # Clean old backups

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --type) BACKUP_TYPE="$2"; shift 2 ;;
            --destination) DESTINATION="$2"; shift 2 ;;
            --compress) COMPRESSION_LEVEL="$2"; shift 2 ;;
            --encrypt) ENCRYPT=true; shift ;;
            --no-verify) VERIFY=false; shift ;;
            --dry-run) DRY_RUN=true; shift ;;
            -h|--help) show_usage; exit 0 ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
    
    # Set destination if not specified
    DESTINATION="${DESTINATION:-${BACKUP_BASE}}"
}

ensure_backup_dirs() {
    local dirs=(
        "${DESTINATION}"
        "${DESTINATION}/databases"
        "${DESTINATION}/configs"
        "${DESTINATION}/files"
        "${DESTINATION}/archives"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "${dir}" 2>/dev/null || {
            log_error "Cannot create directory: ${dir}"
            exit 1
        }
    done
}

get_backup_prefix() {
    echo "soc_platform_${TIMESTAMP}"
}

# =============================================================================
# Database Backup Functions
# =============================================================================

backup_postgresql() {
    log_info "Backing up PostgreSQL..."
    local prefix
    prefix=$(get_backup_prefix)
    local backup_file="${DESTINATION}/databases/${prefix}_postgres.sql.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would backup PostgreSQL to ${backup_file}"
        return 0
    fi
    
    # Execute pg_dump inside container
    docker exec soc-postgres pg_dumpall \
        -U "${POSTGRES_USER:-soc_admin}" \
        | gzip -"${COMPRESSION_LEVEL}" > "${backup_file}" 2>/dev/null || {
        log_error "PostgreSQL backup failed"
        return 1
    }
    
    # Verify backup
    if [[ "${VERIFY}" == "true" ]] && ! gzip -t "${backup_file}" 2>/dev/null; then
        log_error "PostgreSQL backup verification failed"
        rm -f "${backup_file}"
        return 1
    fi
    
    local size
    size=$(du -sh "${backup_file}" | cut -f1)
    log_info "PostgreSQL backup completed: ${size}"
}

backup_redis() {
    log_info "Backing up Redis..."
    local prefix
    prefix=$(get_backup_prefix)
    local backup_file="${DESTINATION}/databases/${prefix}_redis.rdb"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would backup Redis to ${backup_file}"
        return 0
    fi
    
    # Trigger Redis BGSAVE and copy RDB file
    docker exec soc-redis redis-cli -a "${REDIS_PASSWORD:-}" BGSAVE >/dev/null 2>&1 || true
    sleep 5
    
    docker cp soc-redis:/data/dump.rdb "${backup_file}" 2>/dev/null || {
        log_warn "Redis backup failed (may not have data)"
        return 0
    }
    
    local size
    size=$(du -sh "${backup_file}" | cut -f1)
    log_info "Redis backup completed: ${size}"
}

backup_elasticsearch() {
    log_info "Backing up Elasticsearch snapshots..."
    local prefix
    prefix=$(get_backup_prefix)
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would create Elasticsearch snapshot"
        return 0
    fi
    
    # Create snapshot repository and snapshot via API
    curl -s -X PUT "localhost:9200/_snapshot/soc_backup/${prefix}" \
        -H 'Content-Type: application/json' \
        -u "${ELASTICSEARCH_USER:-elastic}:${ELASTICSEARCH_PASSWORD:-}" \
        -d '{"indices": "*", "ignore_unavailable": true, "include_global_state": false}' \
        >/dev/null 2>&1 || log_warn "Elasticsearch snapshot may have failed"
    
    log_info "Elasticsearch snapshot initiated"
}

backup_misp_database() {
    log_info "Backing up MISP database..."
    local prefix
    prefix=$(get_backup_prefix)
    local backup_file="${DESTINATION}/databases/${prefix}_misp.sql.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would backup MISP database to ${backup_file}"
        return 0
    fi
    
    # MISP uses MySQL/MariaDB internally or PostgreSQL
    if docker ps | grep -q soc-misp; then
        docker exec soc-misp mysqldump -u misp -p"${MISP_MYSQL_PASSWORD:-}" misp 2>/dev/null | \
            gzip -"${COMPRESSION_LEVEL}" > "${backup_file}" 2>/dev/null || \
            log_warn "MISP database backup failed"
        
        if [[ -f "${backup_file}" ]]; then
            local size
            size=$(du -sh "${backup_file}" | cut -f1)
            log_info "MISP database backup completed: ${size}"
        fi
    fi
}

# =============================================================================
# File Backup Functions
# =============================================================================

backup_configurations() {
    log_info "Backing up configurations..."
    local prefix
    prefix=$(get_backup_prefix)
    local backup_file="${DESTINATION}/configs/${prefix}_configs.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would backup configurations to ${backup_file}"
        return 0
    fi
    
    tar czf "${backup_file}" \
        -C "${PROJECT_ROOT}" \
        configs/ \
        docker/docker-compose.prod.yml \
        --exclude='*.secret' \
        --exclude='*.key' \
        2>/dev/null || {
        log_error "Configuration backup failed"
        return 1
    }
    
    local size
    size=$(du -sh "${backup_file}" | cut -f1)
    log_info "Configuration backup completed: ${size}"
}

backup_ssl_certificates() {
    log_info "Backing up SSL certificates..."
    local prefix
    prefix=$(get_backup_prefix)
    local cert_dir="/opt/soc-platform/certs"
    local backup_file="${DESTINATION}/configs/${prefix}_certs.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]] || [[ ! -d "${cert_dir}" ]]; then
        return 0
    fi
    
    tar czf "${backup_file}" -C / opt/soc-platform/certs/ 2>/dev/null || \
        log_warn "SSL certificate backup failed"
}

backup_wazuh_rules() {
    log_info "Backing up Wazuh custom rules..."
    local prefix
    prefix=$(get_backup_prefix)
    local rules_dir="/opt/soc-platform/configs/wazuh/rules"
    local backup_file="${DESTINATION}/configs/${prefix}_wazuh_rules.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]] || [[ ! -d "${rules_dir}" ]]; then
        return 0
    fi
    
    tar czf "${backup_file}" -C / opt/soc-platform/configs/wazuh/rules/ 2>/dev/null || \
        log_warn "Wazuh rules backup failed"
}

# =============================================================================
# Archive Creation
# =============================================================================

create_archive() {
    log_info "Creating consolidated archive..."
    local prefix
    prefix=$(get_backup_prefix)
    local archive_file="${DESTINATION}/archives/${prefix}_${BACKUP_TYPE}.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would create archive: ${archive_file}"
        return 0
    fi
    
    # Create archive from individual backups
    tar czf "${archive_file}" \
        -C "${DESTINATION}" \
        databases/ \
        configs/ \
        --transform "s/^/${prefix}_/" \
        2>/dev/null || {
        log_error "Archive creation failed"
        return 1
    }
    
    # Create checksum
    sha256sum "${archive_file}" > "${archive_file}.sha256" 2>/dev/null
    
    # Encrypt if requested
    if [[ "${ENCRYPT}" == "true" ]]; then
        gpg --symmetric --cipher-algo AES256 --compress-algo zlib \
            -o "${archive_file}.gpg" "${archive_file}" 2>/dev/null && \
            rm -f "${archive_file}" "${archive_file}.sha256" || \
            log_warn "Encryption failed, keeping unencrypted archive"
    fi
    
    local size
    size=$(du -sh "${archive_file}"*.gz* 2>/dev/null | cut -f1)
    log_info "Archive created: ${size}"
    
    echo "${archive_file}"
}

create_manifest() {
    local prefix
    prefix=$(get_backup_prefix)
    local manifest_file="${DESTINATION}/archives/${prefix}_manifest.json"
    
    cat > "${manifest_file}" << EOF
{
    "backup_id": "${prefix}",
    "timestamp": "$(date -Iseconds)",
    "type": "${BACKUP_TYPE}",
    "hostname": "$(hostname)",
    "platform_version": "$(cat ${PROJECT_ROOT}/VERSION 2>/dev/null || echo 'unknown')",
    "components": {
        "postgresql": "$([ -f "${DESTINATION}/databases/${prefix}_postgres.sql.gz" ] && echo 'success' || echo 'skipped')",
        "redis": "$([ -f "${DESTINATION}/databases/${prefix}_redis.rdb" ] && echo 'success' || echo 'skipped')",
        "elasticsearch": "snapshot_initiated",
        "misp": "$([ -f "${DESTINATION}/databases/${prefix}_misp.sql.gz" ] && echo 'success' || echo 'skipped')",
        "configs": "$([ -f "${DESTINATION}/configs/${prefix}_configs.tar.gz" ] && echo 'success' || echo 'skipped')",
        "certs": "$([ -f "${DESTINATION}/configs/${prefix}_certs.tar.gz" ] && echo 'success' || echo 'skipped')",
        "wazuh_rules": "$([ -f "${DESTINATION}/configs/${prefix}_wazuh_rules.tar.gz" ] && echo 'success' || echo 'skipped')"
    },
    "total_size": "$(du -sb ${DESTINATION} 2>/dev/null | cut -f1)",
    "compression_level": ${COMPRESSION_LEVEL},
    "encrypted": ${ENCRYPT}
}
EOF
    
    log_debug "Manifest created: ${manifest_file}"
}

# =============================================================================
# Command Implementations
# =============================================================================

cmd_full() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     FULL BACKUP                         ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    ensure_backup_dirs
    
    # Databases
    backup_postgresql
    backup_redis
    backup_elasticsearch
    backup_misp_database
    
    # Files
    backup_configurations
    backup_ssl_certificates
    backup_wazuh_rules
    
    # Create final archive
    create_archive
    create_manifest
    
    echo ""
    log_info "==========================================="
    log_info "✅ Full backup completed successfully!"
    log_info "Location: ${DESTINATION}/archives/"
    log_info "==========================================="
}

cmd_databases() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     DATABASE BACKUP                      ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    ensure_backup_dirs
    
    backup_postgresql
    backup_redis
    backup_elasticsearch
    backup_misp_database
    
    log_info "✅ Database backup completed!"
}

cmd_files() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     FILE BACKUP                          ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    ensure_backup_dirs
    
    backup_configurations
    backup_ssl_certificates
    backup_wazuh_rules
    
    log_info "✅ File backup completed!"
}

cmd_pre_deploy() {
    log_info "Creating pre-deployment backup (quick)..."
    
    ensure_backup_dirs
    
    local prefix
    prefix="pre-deploy_${TIMESTAMP}"
    local quick_backup="${DESTINATION}/${prefix}.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would create pre-deploy backup: ${quick_backup}"
        return 0
    fi
    
    # Quick backup of critical items only
    tar czf "${quick_backup}" \
        -C / \
        opt/soc-platform/configs/ \
        var/lib/soc/postgres/ \
        var/lib/soc/redis/ \
        var/lib/soc/wazuh/ \
        2>/dev/null || {
        log_error "Pre-deploy backup failed"
        return 1
    }
    
    local size
    size=$(du -sh "${quick_backup}" | cut -f1)
    log_info "Pre-deploy backup created: ${size}"
    echo "${quick_backup}"
}

cmd_list() {
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     AVAILABLE BACKUPS                   ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    
    printf "%-35s %-12s %-10s %s\n" "FILENAME" "TYPE" "SIZE" "DATE"
    printf "%-35s %-12s %-10s %s\n" "-----------------------------------" "------------" "----------" "---------------------"
    
    find "${DESTINATION}/archives" -name "*.tar.gz*" -type f 2>/dev/null | sort -r | while read -r f; do
        local name
        name=$(basename "${f}")
        local type
        type=$(echo "${name}" | grep -oP '(?<=_)(full|incremental|pre-deploy)(?=_)' || echo "unknown")
        local size
        size=$(du -sh "${f}" | cut -f1)
        local date
        date=$(stat -c '%y' "${f}" | cut -d'.' -f1)
        printf "%-35s %-12s %-10s %s\n" "${name}" "${type}" "${size}" "${date}"
    done
    
    echo ""
    
    # Total storage used
    local total_size
    total_size=$(du -sh "${DESTINATION}" 2>/dev/null | cut -f1)
    log_info "Total backup storage used: ${total_size}"
}

cmd_restore() {
    local backup_id="${1:-}"
    
    if [[ -z "${backup_id}" ]]; then
        log_error "Please specify a backup to restore: ./backup.sh restore <backup_id>"
        log_info "Use './backup.sh list' to see available backups"
        exit 1
    fi
    
    echo ""
    echo "╔══════════════════════════════════════════╗"
    echo "║     RESTORE FROM BACKUP                 ║"
    echo "╚══════════════════════════════════════════╝"
    echo ""
    log_warn "⚠️  This will overwrite current data!"
    log_warn "Make sure you have a current backup first."
    echo ""
    
    read -rp "Are you absolutely sure? Type 'YES' to continue: " confirm
    if [[ "${confirm}" != "YES" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    local backup_file
    backup_file=$(find "${DESTINATION}/archives" -name "*${backup_id}*.tar.gz*" -type f 2>/dev/null | head -1)
    
    if [[ -z "${backup_file}" ]]; then
        log_error "Backup not found: ${backup_id}"
        exit 1
    fi
    
    log_info "Restoring from: ${backup_file}"
    
    # Decrypt if needed
    if [[ "${backup_file}" == *.gpg ]]; then
        gpg -d "${backup_file}" | tar xz -C /
    else
        tar xzf "${backup_file}" -C /
    fi
    
    log_info "Restore completed. Restarting services..."
    docker compose -f "${COMPOSE_FILE}" restart
    
    log_info "✅ Restore completed successfully!"
}

cmd_cleanup() {
    log_info "Running backup cleanup per retention policy..."
    
    # Clean hourly backups beyond retention
    find "${DESTINATION}/archives" -name "*_incremental_*" -mtime +1 -delete 2>/dev/null || true
    
    # Clean daily backups beyond retention  
    find "${DESTINATION}/archives" -name "*_full_*" -mtime +${RETENTION_DAILY} -delete 2>/dev/null || true
    
    # Clean pre-deploy backups older than 7 days
    find "${DESTINATION}" -name "pre-deploy-*" -mtime +7 -delete 2>/dev/null || true
    
    # Check storage limit
    local current_size_gb
    current_size_gb=$(du -s "${DESTINATION}" 2>/dev/null | awk '{printf "%.0f", $1/1024/1024}')
    
    if [[ ${current_size_gb} -gt ${MAX_STORAGE_GB} ]]; then
        log_warn "Storage exceeds limit (${current_size_gb}GB / ${MAX_STORAGE_GB}GB)"
        log_info "Removing oldest backups to free space..."
        
        # Remove oldest until under limit
        while [[ $(du -s "${DESTINATION}" 2>/dev/null | awk '{printf "%.0f", $1/1024/1024}') -gt ${MAX_STORAGE_GB} ]]; do
            find "${DESTINATION}/archives" -name "*.tar.gz" -type f -printf '%T@ %p\n' | \
                sort -n | head -1 | awk '{print $2}' | xargs rm -f 2>/dev/null || break
        done
    fi
    
    log_info "Cleanup completed."
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_arguments "$@"
    
    case "${COMMAND}" in
        full)       cmd_full ;;
        databases)  cmd_databases ;;
        files)      cmd_files ;;
        pre-deploy) cmd_pre_deploy ;;
        list)       cmd_list ;;
        restore)    cmd_restore "${1:-}" ;;
        cleanup)    cmd_cleanup ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
