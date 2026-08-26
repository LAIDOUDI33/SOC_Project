#!/bin/bash
# ============================================
# Algeria National SOC Platform
# Database Migration Verification Script
# ============================================
#
# This script verifies that database migrations have been
# applied correctly and all schema components are in place.
#
# Usage: ./scripts/db-migration-verify.sh [options]
#   Options:
#     --full          Run comprehensive verification (default)
#     --quick         Quick health check only
#     --schema        Verify schema structure only
#     --data          Verify seed data only
#     --indexes       Verify indexes only
#     --fix           Attempt to fix common issues
#     --backup        Create backup before verification
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-soc_prod}"
DB_USER="${DB_USER:-postgres}"
SCHEMA_PATH="${SCHEMA_PATH:-./prisma/schema.prisma}"
MIGRATION_DIR="${MIGRATION_DIR:-./prisma/migrations}"
SEED_FILE="${SEED_FILE:-./prisma/seed-algeria.ts}"

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS_COUNT++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL_COUNT++)); }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; ((WARN_COUNT++)); }

header() {
    echo ""
    echo "═".repeat(70)
    echo "$1"
    echo "═".repeat(70)
    echo ""
}

# Check PostgreSQL connection
check_connection() {
    header "DATABASE CONNECTION TEST"
    
    if command -v psql &> /dev/null; then
        if PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
            log_pass "PostgreSQL connection successful"
            log_info "Host: $DB_HOST:$DB_PORT, Database: $DB_NAME"
            return 0
        else
            log_fail "Cannot connect to PostgreSQL"
            log_info "Check DB_HOST, DB_PORT, DB_NAME, DB_USER environment variables"
            return 1
        fi
    else
        log_fail "psql client not found"
        return 1
    fi
}

# Check Prisma schema exists
check_schema_file() {
    header "PRISMA SCHEMA VERIFICATION"
    
    if [ -f "$SCHEMA_PATH" ]; then
        log_pass "Prisma schema file found: $SCHEMA_PATH"
        
        # Count models
        MODEL_COUNT=$(grep -c "^model " "$SCHEMA_PATH" || echo "0")
        log_info "Models defined: $MODEL_COUNT"
        
        # Count enums
        ENUM_COUNT=$(grep -c "^enum " "$SCHEMA_PATH" || echo "0")
        log_info "Enums defined: $ENUM_COUNT"
        
        # Expected counts
        if [ "$MODEL_COUNT" -ge "20" ]; then
            log_pass "Model count meets minimum (>= 20): $MODEL_COUNT"
        else
            log_fail "Model count below expected: $MODEL_COUNT (expected >= 20)"
        fi
        
        if [ "$ENUM_COUNT" -ge "45" ]; then
            log_pass "Enum count meets minimum (>= 45): $ENUM_COUNT"
        else
            log_fail "Enum count below expected: $ENUM_COUNT (expected >= 45)"
        fi
        
        return 0
    else
        log_fail "Prisma schema not found: $SCHEMA_PATH"
        return 1
    fi
}

# Check migrations directory
check_migrations() {
    header "MIGRATION FILES VERIFICATION"
    
    if [ -d "$MIGRATION_DIR" ]; then
        log_pass "Migrations directory exists: $MIGRATION_DIR"
        
        # Count migration folders
        MIGRATION_COUNT=$(find "$MIGRATION_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
        log_info "Migration folders found: $MIGRATION_COUNT"
        
        if [ "$MIGRATION_COUNT" -gt "0" ]; then
            log_pass "Migrations present"
            
            # List migrations
            log_info "Available migrations:"
            for migration_dir in "$MIGRATION_DIR"/*/; do
                if [ -f "${migration_dir}migration.sql" ]; then
                    MIG_NAME=$(basename "$migration_dir")
                    MIG_SIZE=$(wc -l < "${migration_dir}migration.sql")
                    log_info "  • $MIG_NAME ($MIG_SIZE lines)"
                fi
            done
        else
            log_warn "No migration folders found"
        fi
        
        return 0
    else
        log_fail "Migrations directory not found: $MIGRATION_DIR"
        return 1
    fi
}

# Verify database tables exist
verify_tables() {
    header "TABLE VERIFICATION"
    
    TABLES=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    
    EXPECTED_TABLES=(
        "users"
        "api_keys"
        "sessions"
        "alerts"
        "incidents"
        "tasks"
        "evidence"
        "threat_actors"
        "indicators"
        "campaigns"
        "assets"
        "system_components"
        "audit_logs"
        "notifications"
        "comments"
        "playbooks"
        "compliance_reports"
        "integrations"
        "dashboards"
        "widgets"
        "retention_policies"
    )
    
    MISSING_TABLES=()
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if echo "$TABLES" | grep -q "^${table}$"; then
            log_pass "Table exists: $table"
        else
            log_fail "Table missing: $table"
            MISSING_TABLES+=("$table")
        done
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
        log_pass "All expected tables present (${#EXPECTED_TABLES[@]}/${#EXPECTED_TABLES[@]})"
    else
        log_fail "Missing ${#MISSING_TABLES[@]} tables"
    fi
    
    return ${#MISSING_TABLES[@]}
}

# Verify enum types exist
verify_enums() {
    header "ENUM TYPE VERIFICATION"
    
    ENUMS=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');" 2>/dev/null | tr -d ' ')
    
    KEY_ENUMS=(
        "UserRole"
        "AlertSeverity"
        "AlertStatus"
        "IncidentSeverity"
        "TelecomProtocol"
        "AssetType"
        "TLPLevel"
        "ComplianceFramework"
    )
    
    for enum in "${KEY_ENUMS[@]}"; do
        if echo "$ENUMS" | grep -q "^${enum}$"; then
            log_pass "Enum type exists: $enum"
        else
            log_fail "Enum type missing: $enum"
        fi
    done
    
    TOTAL_ENUMS=$(echo "$ENUMS" | wc -w)
    log_info "Total enum types in database: $TOTAL_ENUMS"
}

# Verify indexes
verify_indexes() {
    header "INDEX VERIFICATION"
    
    INDEXES=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT indexname FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    INDEX_COUNT=$(echo "$INDEXS" | grep -c "." || echo "0")
    
    log_info "Total indexes: $INDEX_COUNT"
    
    CRITICAL_INDEXES=(
        "users_email_key"
        "users_role_idx"
        "alerts_severity_idx"
        "alerts_status_idx"
        "alerts_timestamp_idx"
        "incidents_status_idx"
        "incidents_severity_idx"
        "indicators_type_idx"
        "indicators_value_idx"
        "assets_type_idx"
    )
    
    for idx in "${CRITICAL_INDEXES[@]}"; do
        if echo "$INDEXES" | grep -q "^${idx}$"; then
            log_pass "Critical index exists: $idx"
        else
            log_warn "Index may be missing: $idx"
        fi
    done
    
    # Check for GIN indexes (full-text search)
    GIN_INDEXES=$(echo "$INDEXS" | grep "_search_idx" | wc -w)
    if [ "$GIN_INDEXES" -gt "0" ]; then
        log_pass "Full-text search indexes present: $GIN_INDEXES"
    else
        log_warn "No full-text search indexes found"
    fi
}

# Verify foreign keys
verify_foreign_keys() {
    header "FOREIGN KEY VERIFICATION"
    
    FK_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    log_info "Foreign key constraints: $FK_COUNT"
    
    if [ "$FK_COUNT" -ge "15" ]; then
        log_pass "Adequate foreign key constraints ($FK_COUNT >= 15)"
    else
        log_warn "Low foreign key count: $FK_COUNT"
    fi
}

# Verify triggers
verify_triggers() {
    header "TRIGGER VERIFICATION"
    
    TRIGGER_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    log_info "Triggers: $TRIGGER_COUNT"
    
    # Check for update_updated_at trigger
    UPDATE_TRIGGER=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE '%update_%_modtime%';" 2>/dev/null | tr -d ' ')
    
    if [ "$UPDATE_TRIGGER" -gt "0" ]; then
        log_pass "Auto-update triggers present: $UPDATE_TRIGGER"
    else
        log_warn "Auto-update triggers not found"
    fi
}

# Verify views
verify_views() {
    header "VIEW VERIFICATION"
    
    VIEWS=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT viewname FROM pg_views WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    
    EXPECTED_VIEWS=(
        "active_incidents"
        "telecom_alerts_summary"
        "system_health_overview"
        "arpt_compliance_dashboard"
    )
    
    for view in "${EXPECTED_VIEWS[@]}"; do
        if echo "$VIEWS" | grep -q "^${view}$"; then
            log_pass "View exists: $view"
        else
            log_warn "View missing: $view"
        fi
    done
}

# Verify seed data
verify_seed_data() {
    header "SEED DATA VERIFICATION"
    
    # Check user count
    USER_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    if [ "$USER_COUNT" -ge "5" ]; then
        log_pass "Users seeded: $USER_COUNT"
    elif [ "$USER_COUNT" -gt "0" ]; then
        log_warn "Low user count: $USER_COUNT (expected >= 5)"
    else
        log_fail "No users found - run seed script"
    fi
    
    # Check asset count
    ASSET_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM assets;" 2>/dev/null | tr -d ' ')
    if [ "$ASSET_COUNT" -ge "10" ]; then
        log_pass "Assets registered: $ASSET_COUNT"
    elif [ "$ASSET_COUNT" -gt "0" ]; then
        log_warn "Low asset count: $ASSET_COUNT"
    else
        log_fail "No assets found - run seed script"
    fi
    
    # Check incident count
    INCIDENT_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM incidents;" 2>/dev/null | tr -d ' ')
    log_info "Sample incidents: $INCIDENT_COUNT"
    
    # Check alert count
    ALERT_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM alerts;" 2>/dev/null | tr -d ' ')
    log_info "Sample alerts: $ALERT_COUNT"
    
    # Check telecom-specific data
    TELECOM_ALERTS=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM alerts WHERE \"telecomProtocol\" IS NOT NULL;" 2>/dev/null | tr -d ' ')
    log_info "Telecom protocol alerts: $TELECOM_ALERTS"
    
    # Check ARPT compliance data
    ARPT_INCIDENTS=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM incidents WHERE \"arptNotifiable\" = true;" 2>/dev/null | tr -d ' ')
    log_info "ARPT-notifiable incidents: $ARPT_INCIDENTS"
}

# Database statistics
show_stats() {
    header "DATABASE STATISTICS"
    
    PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            'Table Size' as metric,
            pg_size_pretty(pg_total_relation_size('pg_tables')) as value
        UNION ALL
        SELECT 
            'Database Size',
            pg_size_pretty(pg_database_size('$DB_NAME'))
        UNION ALL
        SELECT 
            'Total Tables',
            COUNT(*)::text
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        UNION ALL
        SELECT 
            'Total Rows (approx)',
            SUM(n_live_tup)::text
        FROM pg_stat_user_tables;
    " 2>/dev/null
}

# Quick check mode
quick_check() {
    header "QUICK HEALTH CHECK"
    
    # Can we connect?
    if PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_pass "Database connection OK"
    else
        log_fail "Cannot connect to database"
        exit 1
    fi
    
    # Do core tables exist?
    CORE_TABLES_EXIST=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'alerts', 'incidents', 'assets');
    " 2>/dev/null | tr -d ' ')
    
    if [ "$CORE_TABLES_EXIST" -eq "4" ]; then
        log_pass "Core tables present"
    else
        log_fail "Core tables missing ($CORE_TABLES_EXIST/4)"
    fi
    
    # Any data?
    HAS_DATA=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    log_info "Users in database: $HAS_DATA"
    
    log_info "Quick check complete"
}

# Fix common issues
fix_issues() {
    header "ATTEMPTING TO FIX ISSUES"
    
    log_info "Running Prisma generate..."
    npx prisma generate 2>&1 || true
    
    log_info "Pushing schema to database..."
    npx prisma db push 2>&1 || true
    
    log_info "Fix attempt complete - re-run verify to check"
}

# Create backup
create_backup() {
    header "CREATING DATABASE BACKUP"
    
    BACKUP_FILE="soc_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    log_info "Creating backup: $BACKUP_FILE"
    
    if PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" > "./backups/$BACKUP_FILE" 2>&1; then
        log_pass "Backup created successfully"
        BACKUP_SIZE=$(du -h "./backups/$BACKUP_FILE" | cut -f1)
        log_info "Backup size: $BACKUP_SIZE"
    else
        log_fail "Backup failed"
    fi
}

# Print summary
print_summary() {
    header "VERIFICATION SUMMARY"
    
    TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
    
    echo -e "${GREEN}✓ Passed:${NC}   $PASS_COUNT"
    echo -e "${RED}✗ Failed:${NC}   $FAIL_COUNT"
    echo -e "${YELLOW}⚠ Warnings:${NC} $WARN_COUNT"
    echo ""
    echo "Total checks: $TOTAL"
    
    if [ "$FAIL_COUNT" -eq "0" ]; then
        echo -e "\n${GREEN}🎉 All critical checks passed!${NC}\n"
        exit 0
    else
        echo -e "\n${RED}⚠ Some checks failed. Review output above.${NC}\n"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     ALGERIA NATIONAL SOC - DATABASE MIGRATION VERIFIER      ║"
    echo "║                    $(date '+%Y-%m-%d %H:%M:%S')                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    
    case "${1:---full}" in
        --quick)
            quick_check
            ;;
        --schema)
            check_connection && check_schema_file && check_migrations
            ;;
        --data)
            check_connection && verify_seed_data
            ;;
        --indexes)
            check_connection && verify_indexes
            ;;
        --fix)
            fix_issues
            ;;
        --backup)
            create_backup
            ;;
        --full|*)
            check_connection || exit 1
            check_schema_file
            check_migrations
            verify_tables
            verify_enums
            verify_indexes
            verify_foreign_keys
            verify_triggers
            verify_views
            verify_seed_data
            show_stats
            ;;
    esac
    
    print_summary
}

main "$@"
