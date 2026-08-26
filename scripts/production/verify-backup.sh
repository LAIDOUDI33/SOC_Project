#!/bin/bash
# =============================================================================
# CyberSOC Platform - Pre-Deployment Backup Verification
# =============================================================================
# Verifies backup integrity before production deployment
# Run this BEFORE any deployment to production!
#
# Usage: ./scripts/production/verify-backup.sh [--detailed]
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/cybersoc/backups"
LOG_FILE="/var/log/cybersoc/backup-verification-${TIMESTAMP}.log"

log_info()  { echo -e "${CYAN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🔐 CyberSOC Platform - Backup Verification              ║"
echo "║     Environment: PRODUCTION                                ║"
echo "║     Timestamp: ${TIMESTAMP}                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Check 1: Backup directory exists
log_step "Checking Backup Directory"
if [ -d "$BACKUP_DIR" ]; then
    log_ok "Backup directory exists: $BACKUP_DIR"
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.dump" 2>/dev/null | wc -l)
    log_info "Found $BACKUP_COUNT backup files"
    ((CHECKS_PASSED++))
else
    log_error "Backup directory not found: $BACKUP_DIR"
    ((CHECKS_FAILED++))
fi

# Check 2: Most recent backup integrity
log_step "Verifying Latest Backup Integrity"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -n "$LATEST_BACKUP" ]; then
    log_info "Latest backup: $LATEST_BACKUP"
    
    # Verify gzip integrity
    if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
        log_ok "Gzip integrity verified"
        ((CHECKS_PASSED++))
    else
        log_error "Gzip integrity check FAILED!"
        ((CHECKS_FAILED++))
    fi
    
    # Check backup size (should be > 1MB for meaningful backup)
    BACKUP_SIZE=$(stat -f%z "$LATEST_BACKUP" 2>/dev/null || stat -c%s "$LATEST_BACKUP" 2>/dev/null || echo "0")
    if [ "$BACKUP_SIZE" -gt 1048576 ]; then
        log_ok "Backup size adequate: $((BACKUP_SIZE / 1024 / 1024))MB"
    else
        log_warn "Backup seems small: ${BACKUP_SIZE} bytes - verify content"
    fi
    
    # Check backup age (should be < 24 hours for pre-deployment)
    BACKUP_AGE=$(( ($(date +%s) - $(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP" 2>/dev/null)) / 3600 ))
    if [ "$BACKUP_AGE" -lt 24 ]; then
        log_ok "Backup is recent (${BACKUP_AGE} hours old)"
        ((CHECKS_PASSED++))
    else
        log_warn "Backup is old (${BACKUP_AGE} hours) - consider fresh backup"
        ((CHECKS_FAILED++))
    fi
else
    log_error "No backup files found!"
    ((CHECKS_FAILED++))
fi

# Check 3: Database connectivity
log_step "Testing Database Connectivity"
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        log_ok "Database connection successful"
        ((CHECKS_PASSED++))
    else
        log_error "Cannot connect to database!"
        ((CHECKS_FAILED++))
    fi
else
    log_warn "psql not available - skipping DB connectivity test"
fi

# Check 4: Backup encryption verification
log_step "Verifying Backup Encryption"
ENCRYPTED_BACKUPS=$(find "$BACKUP_DIR" -name "*.enc" 2>/dev/null | wc -l)
if [ "$ENCRYPTED_BACKUPS" -gt 0 ]; then
    log_ok "Found $ENCRYPTED_BACKUPS encrypted backups"
    ((CHECKS_PASSED++))
else
    log_warn "No encrypted backups found - ensure backups are encrypted at rest"
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Checks Passed: $((CHECKS_PASSED)) ✅                                        ║"
echo "║  Checks Failed: $((CHECKS_FAILED)) ❌                                         ║"
echo "║                                                              ║"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo "║  Status: ✅ ALL CHECKS PASSED - Ready for deployment         ║"
else
    echo "║  Status: ⚠️  ISSUES FOUND - Review before deployment        ║"
fi

echo "║                                                              ║"
echo "║  Log file: $LOG_FILE"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

exit $CHECKS_FAILED
