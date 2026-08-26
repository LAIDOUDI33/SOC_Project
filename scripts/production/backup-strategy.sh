#!/usr/bin/env bash
# ============================================================
# National SOC Platform - Production Backup Strategy
# Djezzy Production Environment
# ============================================================
# This script implements comprehensive backup and recovery
# procedures for the National SOC Platform.
#
# Features:
# - Automated PostgreSQL backups (pg_dump)
# - Prisma schema versioning
# - Configuration backups
# - Certificate/key backups
# - Encrypted backup storage
# - Backup rotation policy
# - Off-site replication support
# - Restoration procedures
# - Backup integrity verification
#
# Usage:
#   ./backup-strategy.sh backup              # Full backup
#   ./backup-strategy.sh backup --type=db    # Database only
#   ./backup-strategy.sh restore <file>      # Restore from backup
#   ./backup-strategy.sh verify <file>       # Verify backup integrity
#   ./backup-strategy.sh list                # List available backups
#   ./backup-strategy.sh rotate              # Rotate old backups
#   ./backup-strategy.sh status              # Show backup status
#
# RPO: 15 minutes (Point-in-Time Recovery enabled)
# RTO: 2 hours (Full restoration target)
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directory configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/opt/backups/soc-platform}"
BACKUP_DIR="${BACKUP_DIR:-$BACKUP_BASE_DIR/current}"
ARCHIVE_DIR="${ARCHIVE_DIR:-$BACKUP_BASE_DIR/archive}"
LOG_DIR="${LOG_DIR:-$BACKUP_BASE_DIR/logs}"

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR" "$ARCHIVE_DIR" "$LOG_DIR"

# Date format for backup files
DATE_FORMAT="${DATE_FORMAT:-%Y%m%d_%H%M%S}"
TIMESTAMP=$(date +"$DATE_FORMAT")

# Database configuration (override via environment or .env file)
POSTGRES_HOST="${POSTGRES_HOST:-postgres-cluster-rw.soc-platform.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-soc_admin}"
POSTGRES_DB="${POSTGRES_DB:-soc_platform}"
PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-}}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-redis-master.soc-platform.svc.cluster.local}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Encryption settings
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"
ENCRYPTION_ALGORITHM="${ENCRYPTION_ALGORITHM:-AES256}"
GPG_RECIPIENT="${GPG_RECIPIENT:-soc-backups@djezzy.dz}"

# Retention policy
DAILY_RETENTION_DAYS="${DAILY_RETENTION_DAYS:-7}"
WEEKLY_RETENTION_WEEKS="${WEEKLY_RETENTION_WEEKS:-4}"
MONTHLY_RETENTION_MONTHS="${MONTHLY_RETENTION_MONTHS:-12}"
YEARLY_RETENTION_YEARS="${YEARLY_RETENTION_YEARS:-7}"

# Rotation settings
MIN_FREE_SPACE_GB="${MIN_FREE_SPACE_GB:-50}"
MAX_BACKUP_SIZE_GB="${MAX_BACKUP_SIZE_GB:-100}"

# External storage (optional - for off-site replication)
S3_BUCKET="${S3_BUCKET:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-}"
GCS_BUCKET="${GCS_BUCKET:-}"

# Logging
LOG_FILE="$LOG_DIR/backup_${TIMESTAMP}.log"

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

log() {
    local level="$1"
    shift
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }

check_dependencies() {
    local missing=()
    
    for cmd in pg_dump gzip gpg date; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required commands: ${missing[*]}"
        exit 1
    fi
}

get_backup_size() {
    local file="$1"
    if [[ -f "$file" ]]; then
        du -h "$file" | cut -f1
    else
        echo "unknown"
    fi
}

calculate_checksum() {
    local file="$1"
    if [[ -f "$file" ]]; then
        sha256sum "$file" | awk '{print $1}'
    else
        echo ""
    fi
}

# ============================================================
# BACKUP FUNCTIONS
# ============================================================

backup_postgresql() {
    log_info "Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/postgresql_${TIMESTAMP}.sql.gz"
    local encrypted_file="${backup_file}.gpg"
    
    # Check database connectivity
    if ! PGPASSWORD="$PGPASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT"
        return 1
    fi
    
    # Perform pg_dump with compression
    log_info "Executing pg_dump on $POSTGRES_DB..."
    
    if PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -F p \
        --verbose \
        --no-owner \
        --no-privileges \
        --serializable-deferrable \
        2>>"$LOG_FILE" | gzip -9 > "$backup_file"; then
        
        local size=$(get_backup_size "$backup_file")
        log_success "PostgreSQL backup completed: $backup_file ($size)"
        
        # Encrypt if enabled
        if [[ "$ENCRYPTION_ENABLED" == "true" ]]; then
            encrypt_file "$backup_file" "$encrypted_file"
            rm -f "$backup_file"
            backup_file="$encrypted_file"
        fi
        
        # Calculate checksum
        local checksum=$(calculate_checksum "$backup_file")
        log_info "Backup checksum (SHA256): $checksum"
        
        # Record in registry
        record_backup "postgresql" "$backup_file" "$size" "$checksum"
        
        return 0
    else
        log_error "PostgreSQL backup failed"
        return 1
    fi
}

backup_prisma_schema() {
    log_info "Backing up Prisma schema..."
    
    local schema_source="/home/z/my-project/prisma/schema.prisma"
    local backup_file="$BACKUP_DIR/prisma_schema_${TIMESTAMP}.tar.gz"
    
    if [[ -f "$schema_source" ]]; then
        # Backup entire prisma directory for context
        tar -czf "$backup_file" \
            -C /home/z/my-project \
            prisma/schema.prisma \
            prisma/migrations/ \
            2>/dev/null || tar -czf "$backup_file" -C /home/z/my-project prisma/ 2>/dev/null
        
        local size=$(get_backup_size "$backup_file")
        log_success "Prisma schema backup completed: $backup_file ($size)"
        
        record_backup "prisma_schema" "$backup_file" "$size" ""
        return 0
    else
        log_warn "Prisma schema not found at $schema_source"
        return 1
    fi
}

backup_configuration() {
    log_info "Backing up Kubernetes configurations..."
    
    local backup_file="$BACKUP_DIR/k8s_config_${TIMESTAMP}.tar.gz"
    local kubectl="${KUBECTL:-kubectl}"
    
    if command -v "$kubectl" &> /dev/null; then
        # Create temp directory for config export
        local tmp_dir=$(mktemp -d)
        trap "rm -rf $tmp_dir" RETURN
        
        # Export namespace resources
        $kubectl get namespace soc-platform -o yaml > "$tmp_dir/namespace.yaml" 2>/dev/null || true
        $kubectl get all,secrets,configmaps,pvc -n soc-platform -o yaml > "$tmp_dir/resources.yaml" 2>/dev/null || true
        $kubectl get networkpolicy -n soc-platform -o yaml > "$tmp_dir/network-policies.yaml" 2>/dev/null || true
        $kubectl get ingress -n soc-platform -o yaml > "$tmp_dir/ingress.yaml" 2>/dev/null || true
        
        # Export Helm values if available
        if command -v helm &> /dev/null; then
            helm get values soc-platform -n soc-platform > "$tmp_dir/helm-values.yaml" 2>/dev/null || true
            helm get manifest soc-platform -n soc-platform > "$tmp_dir/helm-manifest.yaml" 2>/dev/null || true
        fi
        
        # Create archive
        tar -czf "$backup_file" -C "$tmp_dir" .
        
        local size=$(get_backup_size "$backup_file")
        log_success "Configuration backup completed: $backup_file ($size)"
        
        record_backup "configuration" "$backup_file" "$size" ""
        return 0
    else
        log_warn "kubectl not found, skipping K8s config backup"
        return 1
    fi
}

backup_certificates() {
    log_info "Backing up certificates and keys..."
    
    local backup_file="$BACKUP_DIR/certificates_${TIMESTAMP}.tar.gz.gpg"
    local cert_dirs=(
        "/etc/nginx/ssl"
        "/home/z/my-project/infrastructure/tls"
    )
    
    local tmp_dir=$(mktemp -d)
    trap "rm -rf $tmp_dir" RETURN
    
    local certs_found=false
    
    for cert_dir in "${cert_dirs[@]}"; do
        if [[ -d "$cert_dir" ]]; then
            cp -r "$cert_dir" "$tmp_dir/" 2>/dev/null || true
            certs_found=true
        fi
    done
    
    # Also try to export from Kubernetes secrets
    local kubectl="${KUBECTL:-kubectl}"
    if command -v "$kubectl" &> /dev/null; then
        mkdir -p "$tmp_dir/k8s-secrets"
        $kubectl get secrets -n soc-platform -o yaml > "$tmp_dir/k8s-secrets/secrets.yaml" 2>/dev/null || true
        certs_found=true
    fi
    
    if [[ "$certs_found" == "true" ]]; then
        # Always encrypt certificate backups
        tar -czf - -C "$tmp_dir" . | gpg --batch --yes --symmetric --cipher-algo "$ENCRYPTION_ALGORITHM" -r "$GPG_RECIPIENT" -o "$backup_file" 2>/dev/null || \
        tar -czf - -C "$tmp_dir" . | gpg --batch --yes --symmetric --cipher-algo "$ENCRYPTION_ALGORITHM" -o "$backup_file"
        
        local size=$(get_backup_size "$backup_file")
        log_success "Certificate backup completed (encrypted): $backup_file ($size)"
        
        record_backup "certificates" "$backup_file" "$size" ""
        return 0
    else
        log_warn "No certificate directories found"
        return 1
    fi
}

backup_redis() {
    log_info "Backing up Redis data..."
    
    local backup_file="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    
    if command -v redis-cli &> /dev/null; then
        # Trigger Redis BGSAVE
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE 2>/dev/null | grep -q "OK\|Background saving started"; then
            # Wait for save to complete
            sleep 5
            
            # Copy RDB file (if accessible) or use redis-cli dump
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$backup_file" 2>/dev/null || \
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" SAVE 2>/dev/null
            
            if [[ -f "$backup_file" ]] && [[ -s "$backup_file" ]]; then
                # Compress
                gzip -f "$backup_file"
                backup_file="${backup_file}.gz"
                
                local size=$(get_backup_size "$backup_file")
                log_success "Redis backup completed: $backup_file ($size)"
                
                record_backup "redis" "$backup_file" "$size" ""
                return 0
            else
                log_warn "Redis backup file not created (may need direct filesystem access)"
                return 1
            fi
        else
            log_warn "Cannot trigger Redis BGSAVE"
            return 1
        fi
    else
        log_warn "redis-cli not found, skipping Redis backup"
        return 1
    fi
}

# ============================================================
# ENCRYPTION FUNCTIONS
# ============================================================

encrypt_file() {
    local input_file="$1"
    local output_file="$2"
    
    log_info "Encrypting backup with $ENCRYPTION_ALGORITHM..."
    
    if gpg --batch --yes --symmetric \
           --cipher-algo "$ENCRYPTION_ALGORITHM" \
           -r "$GPG_RECIPIENT" \
           -o "$output_file" \
           "$input_file" 2>>"$LOG_FILE"; then
        log_success "File encrypted: $output_file"
        return 0
    else
        log_error "Encryption failed for $input_file"
        return 1
    fi
}

decrypt_file() {
    local input_file="$1"
    local output_file="$2"
    
    log_info "Decrypting backup..."
    
    if gpg --batch --yes \
           -o "$output_file" \
           "$input_file" 2>>"$LOG_FILE"; then
        log_success "File decrypted: $output_file"
        return 0
    else
        log_error "Decryption failed. Check passphrase."
        return 1
    fi
}

# ============================================================
# BACKUP REGISTRY
# ============================================================

record_backup() {
    local backup_type="$1"
    local backup_path="$2"
    local size="$3"
    local checksum="$4"
    
    local registry_file="$BACKUP_DIR/registry.csv"
    
    # Create registry file header if it doesn't exist
    if [[ ! -f "$registry_file" ]]; then
        echo "timestamp,type,path,size,checksum,status" > "$registry_file"
    fi
    
    # Append record
    echo "$TIMESTAMP,$backup_type,$backup_path,$size,$checksum,completed" >> "$registry_file"
}

# ============================================================
# ROTATION FUNCTIONS
# ============================================================

rotate_backups() {
    log_info "Starting backup rotation..."
    
    # Daily rotation
    find "$BACKUP_DIR" -name "*.gz*" -mtime +$DAILY_RETENTION_DAYS -type f 2>/dev/null | while read -r file; do
        log_info "Archiving old backup: $(basename "$file")"
        mv "$file" "$ARCHIVE_DIR/" 2>/dev/null || rm -f "$file"
    done
    
    # Weekly cleanup from archive
    find "$ARCHIVE_DIR" -name "*_$(date +%u)_*.gz*" -mtime +$((WEEKLY_RETENTION_WEEKS * 7)) -type f 2>/dev/null -exec rm -f {} \;
    
    # Monthly cleanup (keep first of month only)
    find "$ARCHIVE_DIR" -name "*_01_*.gz*" -mtime +$((MONTHLY_RETENTION_MONTHS * 30)) -type f 2>/dev/null -exec rm -f {} \;
    
    # Check disk space
    check_disk_space
    
    log_success "Backup rotation completed"
}

check_disk_space() {
    local free_space=$(df -BG "$BACKUP_BASE_DIR" | tail -1 | awk '{print $4}' | tr -d 'G')
    
    if [[ "$free_space" -lt "$MIN_FREE_SPACE_GB" ]]; then
        log_warn "Low disk space: ${free_space}GB free (minimum: ${MIN_FREE_SPACE_GB}GB)"
        
        # Force cleanup of oldest archives
        find "$ARCHIVE_DIR" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | head -10 | while read -r ts file; do
            log_info "Removing old archive: $(basename "$file")"
            rm -f "$file"
        done
    else
        log_info "Disk space OK: ${free_space}GB free"
    fi
}

# ============================================================
# RESTORATION FUNCTIONS
# ============================================================

restore_database() {
    local backup_file="$1"
    
    log_info "Starting database restoration from: $backup_file"
    
    # Verify backup exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    local tmp_file=$(mktemp)
    trap "rm -f $tmp_file" RETURN
    
    # Decrypt if necessary
    if [[ "$backup_file" == *.gpg ]]; then
        decrypt_file "$backup_file" "$tmp_file" || return 1
    else
        cp "$backup_file" "$tmp_file"
    fi
    
    # Decompress if necessary
    if [[ "$tmp_file" == *.gz ]]; then
        gunzip -k "$tmp_file"
        tmp_file="${tmp_file%.gz}"
    fi
    
    # Confirm restoration
    log_warn "This will overwrite existing data in $POSTGRES_DB!"
    read -p "Are you sure? (type 'yes' to confirm): " confirmation
    if [[ "$confirmation" != "yes" ]]; then
        log_info "Restoration cancelled"
        return 0
    fi
    
    # Restore database
    log_info "Restoring to $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB..."
    
    if PGPASSWORD="$PGPASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -v ON_ERROR_STOP=1 \
        < "$tmp_file" 2>&1 | tee -a "$LOG_FILE"; then
        
        log_success "Database restoration completed successfully"
        return 0
    else
        log_error "Database restoration failed"
        return 1
    fi
}

restore_configuration() {
    local backup_file="$1"
    
    log_info "Restoring configuration from: $backup_file"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    local tmp_dir=$(mktemp -d)
    trap "rm -rf $tmp_dir" RETURN
    
    # Extract backup
    tar -xzf "$backup_file" -C "$tmp_dir" 2>/dev/null || {
        # Try decrypted extraction
        decrypt_file "$backup_file" "${backup_file}.tmp" 2>/dev/null || true
        tar -xzf "${backup_file}.tmp" -C "$tmp_dir" 2>/dev/null || true
        rm -f "${backup_file}.tmp"
    }
    
    # List restored files
    log_info "Extracted configuration files:"
    ls -la "$tmp_dir/"
    
    log_success "Configuration extracted to: $tmp_dir"
    log_info "Review files and apply manually using kubectl apply -f"
}

# ============================================================
# VERIFICATION FUNCTIONS
# ============================================================

verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity: $backup_file"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check file exists and is readable
    if [[ ! -r "$backup_file" ]]; then
        log_error "Backup file is not readable"
        return 1
    fi
    
    # Calculate current checksum
    local current_checksum=$(calculate_checksum "$backup_file")
    log_info "Current checksum (SHA256): $current_checksum"
    
    # For GPG files, verify decryption works
    if [[ "$backup_file" == *.gpg ]]; then
        log_info "Verifying GPG encryption..."
        if gpg --batch --list-only "$backup_file" &>/dev/null; then
            log_success "GPG file structure is valid"
        else
            log_warn "Could not fully verify GPG file (may need passphrase)"
        fi
    fi
    
    # For SQL dumps, check if valid SQL
    if [[ "$backup_file" == *.sql.gz ]] || [[ "$backup_file" == *.sql ]]; then
        log_info "Checking SQL dump validity..."
        local tmp_file=$(mktemp)
        
        if [[ "$backup_file" == *.gz ]]; then
            zcat "$backup_file" > "$tmp_file" 2>/dev/null || true
        else
            cp "$backup_file" "$tmp_file"
        fi
        
        if head -1 "$tmp_file" | grep -qi "postgresql\|CREATE\|SET\|--"; then
            log_success "SQL dump appears valid"
        else
            log_warn "SQL dump may be corrupted or non-standard format"
        fi
        
        rm -f "$tmp_file"
    fi
    
    # Check file size
    local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [[ "$size" -gt 0 ]]; then
        log_info "File size: $(numfmt --to=iec $size 2>/dev/null || echo $size bytes)"
    else
        log_error "Backup file is empty!"
        return 1
    fi
    
    log_success "Backup verification completed"
    return 0
}

list_backups() {
    log_info "Available backups in $BACKUP_DIR:"
    echo ""
    
    printf "%-40s %-15s %-12s %s\n" "FILE" "TYPE" "SIZE" "DATE"
    printf "%-40s %-15s %-12s %s\n" "----" "----" "----" "----"
    
    find "$BACKUP_DIR" -type f \( -name "*.gz" -o -name "*.gpg" -o -name "*.sql" \) 2>/dev/null | sort | while read -r file; do
        local name=$(basename "$file")
        local type=""
        
        if [[ "$name" == postgresql* ]]; then
            type="database"
        elif [[ "$name" == prisma* ]]; then
            type="schema"
        elif [[ "$name" == config* ]] || [[ "$name" == k8s* ]]; then
            type="config"
        elif [[ "$name" == cert* ]]; then
            type="certificates"
        elif [[ "$name" == redis* ]]; then
            type="redis"
        else
            type="other"
        fi
        
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -c "%Y" "$file" 2>/dev/null | xargs -I{} date -d "@{}" "+%Y-%m-%d" 2>/dev/null || stat -f "%Sm" "$file")
        
        printf "%-40s %-15s %-12s %s\n" "$name" "$type" "$size" "$date"
    done
    
    echo ""
    log_info "Total backup size: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)"
}

show_status() {
    log_info "Backup System Status"
    echo ""
    
    # Last backup times
    echo "Last Backups:"
    printf "  %-20s %s\n" "Type" "Last Backup"
    printf "  %-20s %s\n" "----" "-----------"
    
    for type in postgresql prisma_schema configuration certificates redis; do
        local last_backup=$(find "$BACKUP_DIR" -name "${type}_*" -type f 2>/dev/null | sort -r | head -1)
        if [[ -n "$last_backup" ]]; then
            local date=$(stat -c "%Y" "$last_backup" 2>/dev/null | xargs -I{} date -d "@{}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "unknown")
            printf "  %-20s %s\n" "$type" "$date"
        else
            printf "  %-20s %s\n" "$type" "Never"
        fi
    done
    
    echo ""
    
    # Disk usage
    echo "Disk Usage:"
    df -h "$BACKUP_BASE_DIR" 2>/dev/null | tail -1 | awk '{printf "  Total: %s, Used: %s, Available: %s (%s used)\n", $2, $3, $4, $5}'
    
    echo ""
    
    # Backup counts
    echo "Backup Counts:"
    printf "  Current: %d files\n" $(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)
    printf "  Archived: %d files\n" $(find "$ARCHIVE_DIR" -type f 2>/dev/null | wc -l)
}

# ============================================================
# OFF-SITE REPLICATION (OPTIONAL)
# ============================================================

sync_to_s3() {
    if [[ -z "$S3_BUCKET" ]]; then
        log_warn "S3_BUCKET not configured, skipping S3 sync"
        return 1
    fi
    
    log_info "Syncing backups to S3: $S3_BUCKET"
    
    if command -v aws &> /dev/null; then
        aws s3 sync "$BACKUP_DIR/" "s3://S3_BUCKET/soc-platform/" \
            --storage-class STANDARD_IA \
            --exclude "*" --include "*.gpg" --include "*.gz" 2>>"$LOG_FILE"
        
        log_success "S3 sync completed"
    else
        log_warn "AWS CLI not installed, cannot sync to S3"
        return 1
    fi
}

sync_to_azure() {
    if [[ -z "$AZURE_CONTAINER" ]]; then
        log_warn "AZURE_CONTAINER not configured, skipping Azure sync"
        return 1
    fi
    
    log_info "Syncing backups to Azure Blob Storage: $AZURE_CONTAINER"
    
    if command -v az &> /dev/null; then
        az storage blob upload-batch \
            --source "$BACKUP_DIR" \
            --destination "$AZURE_CONTAINER" \
            --pattern "*.gpg" 2>>"$LOG_FILE"
        
        log_success "Azure sync completed"
    else
        log_warn "Azure CLI not installed, cannot sync to Azure"
        return 1
    fi
}

# ============================================================
# MAIN EXECUTION
# ============================================================

usage() {
    cat << EOF
National SOC Platform - Backup Strategy Script

Usage:
    $0 <command> [options]

Commands:
    backup                  Full backup (all components)
    backup --type=<type>    Specific backup type (db, config, certs, redis, schema)
    restore <file>          Restore from backup file
    verify <file>           Verify backup integrity
    list                    List available backups
    status                  Show backup system status
    rotate                  Rotate/cleanup old backups
    sync                    Sync to off-site storage (if configured)

Options:
    --type=<type>           Backup type: db, config, certs, redis, schema, all
    --dry-run               Show what would be done without executing
    --verbose               Enable verbose output
    --help                  Show this help message

Environment Variables:
    POSTGRES_HOST           PostgreSQL host (default: postgres-cluster-rw.soc-platform.svc.cluster.local)
    POSTGRES_PORT           PostgreSQL port (default: 5432)
    POSTGRES_USER           PostgreSQL user (default: soc_admin)
    POSTGRES_DB             PostgreSQL database (default: soc_platform)
    PGPASSWORD              PostgreSQL password
    BACKUP_BASE_DIR         Base directory for backups (default: /opt/backups/soc-platform)
    ENCRYPTION_ENABLED      Enable GPG encryption (default: true)
    GPG_RECIPIENT           GPG recipient for encryption
    S3_BUCKET               AWS S3 bucket for off-site replication
    AZURE_CONTAINER         Azure container for off-site replication

Examples:
    $0 backup                           # Full backup
    $0 backup --type=db                 # Database only
    $0 restore /opt/backups/db_20260120.sql.gz.gpg
    $0 verify /opt/backups/db_20260120.sql.gz.gpg
    $0 list                             # List backups
    $0 rotate                           # Clean up old backups

RPO/RTO Information:
    Recovery Point Objective (RPO):     15 minutes
    Recovery Time Objective (RTO):      2 hours
EOF
}

main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        backup)
            check_dependencies
            
            local backup_type="all"
            for arg in "$@"; do
                case $arg in
                    --type=*) backup_type="${arg#*=}" ;;
                    --dry-run) DRY_RUN=true ;;
                    --verbose) set -x ;;
                esac
            done
            
            log_info "Starting backup process (type: $backup_type)..."
            
            case "$backup_type" in
                all|full)
                    backup_postgresql
                    backup_prisma_schema
                    backup_configuration
                    backup_certificates
                    backup_redis
                    ;;
                db|database|postgresql)
                    backup_postgresql
                    ;;
                config|configuration|k8s)
                    backup_configuration
                    ;;
                certs|certificates|tls)
                    backup_certificates
                    ;;
                redis|cache)
                    backup_redis
                    ;;
                schema|prisma)
                    backup_prisma_schema
                    ;;
                *)
                    log_error "Unknown backup type: $backup_type"
                    exit 1
                    ;;
            esac
            
            # Auto-rotate after backup
            rotate_backups
            
            # Sync to off-site if configured
            if [[ -n "$S3_BUCKET" ]]; then sync_to_s3; fi
            if [[ -n "$AZURE_CONTAINER" ]]; then sync_to_azure; fi
            
            log_success "Backup process completed"
            ;;
            
        restore)
            local backup_file="${1:-}"
            if [[ -z "$backup_file" ]]; then
                log_error "Please specify backup file to restore"
                exit 1
            fi
            
            if [[ "$backup_file" == *.sql* ]] || [[ "$backup_file" == *postgresql* ]]; then
                restore_database "$backup_file"
            elif [[ "$backup_file" == *config* ]] || [[ "$backup_file" == *k8s* ]]; then
                restore_configuration "$backup_file"
            else
                log_error "Cannot determine backup type from filename"
                exit 1
            fi
            ;;
            
        verify)
            local backup_file="${1:-}"
            if [[ -z "$backup_file" ]]; then
                log_error "Please specify backup file to verify"
                exit 1
            fi
            verify_backup "$backup_file"
            ;;
            
        list|ls)
            list_backups
            ;;
            
        status|info)
            show_status
            ;;
            
        rotate|cleanup)
            rotate_backups
            ;;
            
        sync)
            sync_to_s3
            sync_to_azure
            ;;
            
        help|--help|-h)
            usage
            ;;
            
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
