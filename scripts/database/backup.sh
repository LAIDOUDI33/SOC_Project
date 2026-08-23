#!/bin/bash
# ============================================================
# Automated Backup Script for SOC Platform
# ============================================================
# Schedule: Cron job running daily at 02:00 AM
# 0 2 * * * /home/z/my-project/scripts/database/backup.sh >> /var/log/soc-backups.log 2>&1
# ============================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/backups/soc-platform"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$TIMESTAMP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$TIMESTAMP] WARNING${NC} $1"
}

error() {
    echo -e "${RED}[$TIMESTAMP] ERROR${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/wal"
mkdir -p "$BACKUP_DIR/configs"

log "Starting backup process..."

# ========================================
# 1. Database Backup (PostgreSQL)
# ========================================
log "Backing up PostgreSQL database..."

DB_BACKUP_FILE="$BACKUP_DIR/daily/soc_production_$DATE.sql.gz"

if command -v pg_dump &> /dev/null; then
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER"            -Fc soc_production | gzip > "$DB_BACKUP_FILE"; then
        log "✅ Database backup completed: $DB_BACKUP_FILE"
        log "   Size: $(du -h "$DB_BACKUP_FILE" | cut -f1)"
    else
        error "Database backup FAILED"
        exit 1
    fi
else
    warn "pg_dump not found, skipping database backup"
fi

# ========================================
# 2. Configuration Backup
# ========================================
log "Backing up configuration files..."

CONFIG_BACKUP_DIR="$BACKUP_DIR/configs/$DATE"
mkdir -p "$CONFIG_BACKUP_DIR"

# Backup environment files (excluding secrets)
cp -r /opt/soc-platform/.env.production.template "$CONFIG_BACKUP_DIR/" 2>/dev/null || true
cp -r /opt/soc-platform/k8s/ "$CONFIG_BACKUP_DIR/k8s/" 2>/dev/null || true
cp -r /opt/soc-platform/config/ "$CONFIG_BACKUP_DIR/config/" 2>/dev/null || true

log "✅ Configuration backed up to $CONFIG_BACKUP_DIR"

# ========================================
# 3. Prune Old Backups
# ========================================
log "Pruning backups older than $RETENTION_DAYS days..."

find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
find "$BACKUP_DIR/wal" -name "*.wal*" -mtime +3 -delete 2>/dev/null || true
find "$BACKUP_DIR/configs" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

log "✅ Old backups pruned"

# ========================================
# 4. Verify Backup Integrity
# ========================================
log "Verifying backup integrity..."

if [ -f "$DB_BACKUP_FILE" ]; then
    if gunzip -t "$DB_BACKUP_FILE" 2>/dev/null; then
        log "✅ Backup integrity verified"
    else
        error "Backup integrity check FAILED!"
        exit 1
    fi
    
    # Show backup summary
    echo ""
    echo "========================================="
    echo "BACKUP SUMMARY"
    echo "========================================="
    echo "Date: $DATE"
    echo "Database: $DB_BACKUP_FILE"
    echo "Size: $(du -sh "$DB_BACKUP_FILE" | cut -f1)"
    echo "Config: $CONFIG_BACKUP_DIR"
    echo "Total disk usage:"
    du -sh "$BACKUP_DIR" 2>/dev/null || true
    echo "========================================="
else
    warn "No backup file found to verify"
fi

# ========================================
# 5. Upload to Offsite Storage (Optional)
# ========================================
if command -v aws s3 &> /dev/null; then
    log "Uploading to S3 (offsite backup)..."
    aws s3 cp "$DB_BACKUP_FILE" "s3://djezzy-soc-backups/production/$DATE.sql.gz"         --storage-class STANDARD_IA 2>/dev/null &&         log "✅ Offsite upload complete" ||         warn "Offsite upload failed (non-critical)"
fi

log "🎉 Backup process completed successfully!"
exit 0
