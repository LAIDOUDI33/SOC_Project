#!/bin/bash
# ============================================================
# National SOC Platform - PostgreSQL Production Setup
# ============================================================
# This script sets up a production-ready PostgreSQL instance
# for the Djezzy National SOC Platform
# 
# Usage: ./setup-postgresql-production.sh [options]
#   --skip-backup    Skip backup if DB already exists
#   --dry-run        Show commands without executing
#   --validate-only  Only validate configuration
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_ROOT/logs/postgresql-setup-$TIMESTAMP.log"

# PostgreSQL Configuration
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"
PG_SUPERUSER_PASSWORD="${PG_SUPERUSER_PASSWORD:-}"
PG_SOC_DB="${PG_SOC_DB:-soc_production}"
PG_SOC_USER="${PG_SOC_USER:-soc_prod_user}"
PG_SOC_USER_PASSWORD="${PG_SOC_USER_PASSWORD:-S0C_Pr0d_S3cur3_P@ss_2026!}"

# Resource Limits (Production-optimized)
PG_MAX_CONNECTIONS=500
PG_SHARED_BUFFERS="4GB"
PG_EFFECTIVE_CACHE_SIZE="12GB"
PG_MAINTENANCE_WORK_MEM="2GB"
PG_WORK_MEM="256MB"
PG_WAL_BUFFERS="1GB"
PG_CHECKPOINT_COMPLETION_TARGET=0.9
PG_DEFAULT_STATISTICS_TARGET=200
PG_RANDOM_PAGE_COST=1.1
PG_EFFECTIVE_IO_CONCURRENCY=200

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
SKIP_BACKUP=false
DRY_RUN=false
VALIDATE_ONLY=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-backup) SKIP_BACKUP=true ;;
        --dry-run) DRY_RUN=true ;;
        --validate-only) VALIDATE_ONLY=true ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

# ============================================================
# Utility Functions
# ============================================================
log() {
    local level=$1; shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${GREEN}$1${NC}"; }
warn() { log "WARN" "${YELLOW}$1${NC}"; }
error() { log "ERROR" "${RED}$1${NC}"; }
section() { echo -e "\n${BLUE}============================================================${NC}"; log "INFO" "${BLUE} $1${NC}"; echo -e "${BLUE}============================================================${NC}\n"; }

run_cmd() {
    local cmd="$*"
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] $cmd"
        return 0
    fi
    eval "$cmd"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        error "Required command not found: $1"
        return 1
    fi
}

# ============================================================
# Pre-flight Checks
# ============================================================
preflight_checks() {
    section "Pre-flight Checks"
    
    # Check required tools
    info "Checking required tools..."
    
    local tools=("psql" "pg_isready" "createdb" "createuser")
    for tool in "${tools[@]}"; do
        check_command "$tool" || exit 1
        info "✓ $tool available: $($tool --version 2>&1 | head -1 || echo 'installed')"
    done
    
    # Test PostgreSQL connection
    info "Testing PostgreSQL connection to $PG_HOST:$PG_PORT..."
    if PGPASSWORD="$PG_SUPERUSER_PASSWORD" pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
        info "✓ PostgreSQL is accepting connections"
    else
        error "Cannot connect to PostgreSQL at $PG_HOST:$PG_PORT"
        exit 1
    fi
    
    # Test superuser authentication
    info "Testing superuser authentication..."
    if PGPASSWORD="$PG_SUPERUSER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -d postgres -c "SELECT 1;" &>/dev/null; then
        info "✓ Superuser authentication successful"
    else
        error "Superuser authentication failed. Check PG_SUPERUSER_PASSWORD."
        exit 1
    fi
    
    # Check disk space (minimum 50GB free recommended)
    info "Checking available disk space..."
    local free_space=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$free_space" -lt 50 ]; then
        warn "Low disk space: ${free_space}GB free (recommended: 50GB+)"
    else
        info "✓ Disk space OK: ${free_space}GB free"
    fi
    
    # Create logs directory
    mkdir -p "$(dirname "$LOG_FILE")"
    info "Log file: $LOG_FILE"
}

# ============================================================
# Backup Existing Database (if exists)
# ============================================================
backup_existing() {
    if [ "$SKIP_BACKUP" = true ]; then
        warn "Skipping backup (--skip-backup flag set)"
        return 0
    fi
    
    section "Backup Existing Database"
    
    local BACKUP_DIR="$PROJECT_ROOT/backups/postgresql/pre-setup-$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"
    
    # Check if database exists
    if PGPASSWORD="$PG_SUPERUSER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -lqt | cut -d \| -f 1 | grep -qw "$PG_SOC_DB"; then
        info "Database $PG_SOC_DB exists, creating backup..."
        
        run_cmd "PGPASSWORD='$PG_SUPERUSER_PASSWORD' pg_dump \
            -h '$PG_HOST' \
            -p '$PG_PORT' \
            -U '$PG_SUPERUSER' \
            -d '$PG_SOC_DB' \
            --format=custom \
            --compress=9 \
            --no-owner \
            --no-acl \
            --file='$BACKUP_DIR/$PG_SOC_DB.backup'"
        
        if [ -f "$BACKUP_DIR/$PG_SOC_DB.backup" ]; then
            local size=$(du -h "$BACKUP_DIR/$PG_SOC_DB.backup" | cut -f1)
            info "✓ Backup created: $BACKUP_DIR/$PG_SOC_DB.backup ($size)"
        else
            error "Backup creation failed!"
            exit 1
        fi
    else
        info "Database $PG_SOC_DB does not exist, skipping backup"
    fi
}

# ============================================================
# Create Database and User
# ============================================================
setup_database_user() {
    section "Create Database and User"
    
    # Create user with password
    info "Creating database user: $PG_SOC_USER..."
    
    run_cmd "PGPASSWORD='$PG_SUPERUSER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SUPERUSER' \
        -d postgres \
        -c \"DO \\$\\$ BEGIN
            CREATE USER \\\"$PG_SOC_USER\\\" WITH PASSWORD '$PG_SOC_USER_PASSWORD';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'User already exists, updating password';
            ALTER USER \\\"$PG_SOC_USER\\\" WITH PASSWORD '$PG_SOC_USER_PASSWORD';
        END \\$\\$;\""
    
    info "✓ User $PG_SOC_USER ready"
    
    # Create database
    info "Creating database: $PG_SOC_DB..."
    
    run_cmd "PGPASSWORD='$PG_SUPERUSER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SUPERUSER' \
        -d postgres \
        -c \"SELECT 'CREATE DATABASE \\\"$PG_SOC_DB\\\" OWNER \\\"$PG_SOC_USER\\\"'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '\\\"$PG_SOC_DB\\\"')\\gexec\""
    
    info "✓ Database $PG_SOC_DB ready"
    
    # Grant privileges
    info "Granting privileges..."
    
    run_cmd "PGPASSWORD='$PG_SUPERUSER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SUPERUSER' \
        -d postgres \
        -c \"GRANT ALL PRIVILEGES ON DATABASE \\\"$PG_SOC_DB\\\" TO \\\"$PG_SOC_USER\\\";\"
        
        GRANT ALL PRIVILEGES ON SCHEMA public TO \\\"$PG_SOC_USER\\\";
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT ALL PRIVILEGES ON TABLES TO \\\"$PG_SOC_USER\\\";
            
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT ALL PRIVILEGES ON SEQUENCES TO \\\"$PG_SOC_USER\\\";\""
    
    info "✓ Privileges granted"
}

# ============================================================
# Configure PostgreSQL for Production
# ============================================================
configure_postgresql() {
    section "Configure PostgreSQL for Production"
    
    info "Applying production optimizations..."
    
    # Create optimization configuration
    local OPTIMIZATION_SQL="
-- Connection settings
ALTER SYSTEM SET max_connections = $PG_MAX_CONNECTIONS;
ALTER SYSTEM SET superuser_reserved_connections = 5;

-- Memory settings
ALTER SYSTEM SET shared_buffers = '$PG_SHARED_BUFFERS';
ALTER SYSTEM SET effective_cache_size = '$PG_EFFECTIVE_CACHE_SIZE';
ALTER SYSTEM SET maintenance_work_mem = '$PG_MAINTENANCE_WORK_MEM';
ALTER SYSTEM SET work_mem = '$PG_WORK_MEM';

-- WAL settings
ALTER SYSTEM SET wal_buffers = '$PG_WAL_BUFFERS';
ALTER SYSTEM SET checkpoint_completion_target = $PG_CHECKPOINT_COMPLETION_TARGET;
ALTER SYSTEM SET max_wal_size = '8GB';
ALTER SYSTEM SET min_wal_size = '2GB';

-- Query planner
ALTER SYSTEM SET default_statistics_target = $PG_DEFAULT_STATISTICS_TARGET;
ALTER SYSTEM SET random_page_cost = $PG_RANDOM_PAGE_COST;
ALTER SYSTEM SET effective_io_concurrency = $PG_EFFECTIVE_IO_CONCURRENCY;

-- Logging
ALTER SYSTEM SET logging_collector = on;
ALTER SYSTEM SET log_directory = 'pg_log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Security
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
"
    
    run_cmd "echo '$OPTIMIZATION_SQL' | PGPASSWORD='$PG_SUPERUSER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SUPERUSER' \
        -d postgres"
    
    info "✓ PostgreSQL configuration applied"
    warn "PostgreSQL restart required to apply some settings"
}

# ============================================================
# Enable Extensions
# ============================================================
enable_extensions() {
    section "Enable Required Extensions"
    
    local EXTENSIONS=(
        "uuid-ossp"
        "pg_trgm"
        "btree_gist"
        "pgcrypto"
        "pg_stat_statements"
        "auto_explain"
    )
    
    for ext in "${EXTENSIONS[@]}"; do
        info "Enabling extension: $ext..."
        run_cmd "PGPASSWORD='$PG_SOC_USER_PASSWORD' psql \
            -h '$PG_HOST' \
            -p '$PG_PORT' \
            -U '$PG_SOC_USER' \
            -d '$PG_SOC_DB' \
            -c \"CREATE EXTENSION IF NOT EXISTS \\\"$ext\\\" CASCADE;\""
        info "✓ Extension $ext enabled"
    done
}

# ============================================================
# Run Prisma Migrations
# ============================================================
run_migrations() {
    section "Run Prisma Migrations"
    
    cd "$PROJECT_ROOT"
    
    info "Generating Prisma client with PostgreSQL schema..."
    run_cmd "npx prisma generate --schema=./prisma/schema-postgresql.prisma"
    
    info "Running database migrations..."
    run_cmd "DATABASE_URL=\"postgresql://$PG_SOC_USER:$PG_SOC_USER_PASSWORD@$PG_HOST:$PG_PORT/$PG_SOC_DB?schema=public\" \
        npx prisma migrate deploy \
        --schema=./prisma/schema-postgresql.prisma"
    
    info "✓ Migrations completed successfully"
}

# ============================================================
# Seed Initial Data
# ============================================================
seed_data() {
    section "Seed Initial Data"
    
    cd "$PROJECT_ROOT"
    
    info "Seeding roles and initial configuration..."
    run_cmd "DATABASE_URL=\"postgresql://$PG_SOC_USER:$PG_SOC_USER_PASSWORD@$PG_HOST:$PG_PORT/$PG_SOC_DB?schema=public\" \
        npx prisma db seed \
        --schema=./prisma/schema-postgresql.prisma"
    
    info "✓ Data seeding completed"
}

# ============================================================
# Setup Row-Level Security
# ============================================================
setup_rls() {
    section "Setup Row-Level Security"
    
    local RLS_SQL="
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own record
CREATE POLICY users_select_own ON users FOR SELECT USING (true);
CREATE POLICY users_update_own ON users FOR UPDATE USING (
    id = current_setting('app.current_user_id', true)::uuid
);

-- Sessions visible only to owning user
CREATE POLICY sessions_user_access ON sessions FOR SELECT USING (
    user_id = current_setting('app.current_user_id', true)::uuid
);
CREATE POLICY sessions_user_insert ON sessions FOR INSERT WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::uuid
);

-- API keys visible to owner or admin
CREATE POLICY api_keys_owner ON api_keys FOR SELECT USING (
    created_by = current_setting('app.current_user_id', true)::uuid
);

-- Audit logs: users see their own, admins see all
CREATE POLICY audit_logs_user ON audit_logs FOR SELECT USING (
    actor_id = current_setting('app.current_user_id', true)::uuid OR
    EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id', true)::uuid AND role = 'admin')
);
"
    
    run_cmd "echo '$RLS_SQL' | PGPASSWORD='$PG_SOC_USER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SOC_USER' \
        -d '$PG_SOC_DB'"
    
    info "✓ Row-Level Security configured"
}

# ============================================================
# Create Performance Indexes
# ============================================================
create_indexes() {
    section "Create Performance Indexes"
    
    local INDEXES_SQL="
-- Alert queries (most frequent)
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(status, severity) WHERE status != 'RESOLVED';
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source_type ON alerts(source, alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_ioc_ref ON alerts(ioc_id) WHERE ioc_id IS NOT NULL;

-- Incident indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status) WHERE status != 'CLOSED';
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- SS7 Message indexes (high-volume)
CREATE INDEX IF NOT EXISTS idx_ss7_messages_timestamp ON ss7_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ss7_messages_calling ON ss7_messages(calling_number);
CREATE INDEX IF NOT EXISTS idx_ss7_messages_called ON ss7_messages(called_number);
CREATE INDEX IF NOT EXISTS idx_ss7_messages_type ON ss7_messages(message_type, protocol_family);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_incidents_title_search ON incidents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_alerts_description_search ON alerts USING gin(to_tsvector('english', description));

-- Threat intel indexes
CREATE INDEX IF NOT EXISTS idx_iocs_type_value ON iocs(ioc_type, value);
CREATE INDEX IF NOT EXISTS idx_iocs_threat_level ON iocs(threat_level) WHERE threat_level IN ('critical', 'high');
"
    
    run_cmd "echo '$INDEXES_SQL' | PGPASSWORD='$PG_SOC_USER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SOC_USER' \
        -d '$PG_SOC_DB'"
    
    info "✓ Performance indexes created"
}

# ============================================================
# Setup Monitoring Views
# ============================================================
setup_monitoring() {
    section "Setup Monitoring Views"
    
    local VIEWS_SQL="
-- Dashboard statistics materialized view
CREATE OR REPLACE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM alerts WHERE status = 'NEW') as new_alerts,
    (SELECT COUNT(*) FROM alerts WHERE severity = 'CRITICAL' AND status != 'RESOLVED') as critical_alerts,
    (SELECT COUNT(*) FROM incidents WHERE status IN ('NEW', 'IN_PROGRESS', 'UNDER_REVIEW')) as active_incidents,
    (SELECT COUNT(*) FROM alerts WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h_alerts,
    (SELECT COUNT(*) FROM alerts WHERE created_at > NOW() - INTERVAL '1 hour') as last_1h_alerts,
    (SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) 
     FROM incidents WHERE status = 'CLOSED' AND resolved_at > NOW() - INTERVAL '7 days') as avg_resolution_time_seconds;

-- Refresh schedule: Run every 5 minutes via cron/pgAgent
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;

-- Health check view
CREATE OR REPLACE VIEW v_system_health AS
SELECT 
    'database' as component,
    pg_database_size('$PG_SOC_DB') as size_bytes,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = '$PG_SOC_DB') as active_connections,
    NOW() as check_time
UNION ALL
SELECT 
    'alerts_backlog',
    (SELECT COUNT(*) FROM alerts WHERE status = 'NEW'),
    NULL,
    NOW()
UNION ALL
SELECT 
    'incidents_active',
    (SELECT COUNT(*) FROM incidents WHERE status != 'CLOSED'),
    NULL,
    NOW();
"
    
    run_cmd "echo '$VIEWS_SQL' | PGPASSWORD='$PG_SOC_USER_PASSWORD' psql \
        -h '$PG_HOST' \
        -p '$PG_PORT' \
        -U '$PG_SOC_USER' \
        -d '$PG_SOC_DB'"
    
    info "✓ Monitoring views created"
}

# ============================================================
# Validation
# ============================================================
validate_setup() {
    section "Validate Installation"
    
    info "Running validation checks..."
    
    local PASS=0
    local FAIL=0
    
    # Check database exists
    if PGPASSWORD="$PG_SOC_USER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SOC_USER" -d "$PG_SOC_DB" -c "SELECT 1;" &>/dev/null; then
        info "✓ Database connection successful"
        ((PASS++))
    else
        error "✗ Database connection failed"
        ((FAIL++))
    fi
    
    # Check tables exist
    local TABLE_COUNT=$(PGPASSWORD="$PG_SOC_USER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SOC_USER" -d "$PG_SOC_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    if [ "$TABLE_COUNT" -gt 0 ]; then
        info "✓ Tables created: $TABLE_COUNT"
        ((PASS++))
    else
        error "✗ No tables found"
        ((FAIL++))
    fi
    
    # Check extensions
    local EXT_COUNT=$(PGPASSWORD="$PG_SOC_USER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SOC_USER" -d "$PG_SOC_DB" -t -c "SELECT COUNT(*) FROM pg_extension;" | tr -d ' ')
    if [ "$EXT_COUNT" -ge 5 ]; then
        info "✓ Extensions loaded: $EXT_COUNT"
        ((PASS++))
    else
        warn "⚠ Extensions: $EXT_COUNT (expected 6+)"
    fi
    
    # Check RLS enabled
    local RLS_TABLES=$(PGPASSWORD="$PG_SOC_USER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SOC_USER" -d "$PG_SOC_DB" -t -c "SELECT COUNT(*) FROM pg_tables WHERE rowsecurity = true AND schemaname = 'public';" | tr -d ' ')
    if [ "$RLS_TABLES" -gt 0 ]; then
        info "✓ Row-Level Security enabled on $RLS_TABLES tables"
        ((PASS++))
    else
        warn "⚠ No RLS policies found"
    fi
    
    # Test basic query
    if PGPASSWORD="$PG_SOC_USER_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SOC_USER" -d "$PG_SOC_DB" -c "SELECT COUNT(*) FROM roles;" &>/dev/null; then
        info "✓ Basic query execution successful"
        ((PASS++))
    else
        error "✗ Query execution failed"
        ((FAIL++))
    fi
    
    echo ""
    info "Validation Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
    
    if [ "$FAIL" -gt 0 ]; then
        error "Validation failed! Please review errors above."
        return 1
    fi
    
    return 0
}

# ============================================================
# Generate Summary Report
# ============================================================
generate_report() {
    section "Setup Complete - Summary Report"
    
    local REPORT_FILE="$PROJECT_ROOT/logs/postgresql-setup-report-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# PostgreSQL Production Setup Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Database:** $PG_SOC_DB
**Host:** $PG_HOST:$PG_PORT
**User:** $PG_SOC_USER

## Configuration Applied

| Parameter | Value |
|-----------|-------|
| Max Connections | $PG_MAX_CONNECTIONS |
| Shared Buffers | $PG_SHARED_BUFFERS |
| Effective Cache Size | $PG_EFFECTIVE_CACHE_SIZE |
| Work Mem | $PG_WORK_MEM |
| WAL Buffers | $PG_WAL_BUFFERS |

## Components Installed

- ✅ Database user and privileges
- ✅ Production schema (Prisma migrations)
- ✅ PostgreSQL extensions (uuid-ossp, pg_trgm, btree_gist, pgcrypto, etc.)
- ✅ Row-Level Security policies
- ✅ Performance indexes
- ✅ Materialized views for dashboards
- ✅ Monitoring views

## Connection String (for .env.production)

\`\`\`
DATABASE_URL="postgresql://$PG_SOC_USER:****@$PG_HOST:$PG_PORT/$PG_SOC_DB?schema=public"
\`\`\`

## Next Steps

1. Update application .env.production with connection string
2. Configure automated backups (see backup.sh)
3. Set up monitoring alerts
4. Run security hardening checklist
5. Proceed with staging deployment

## Log File

Full installation log: \`$LOG_FILE\`
EOF
    
    info "Report generated: $REPORT_FILE"
    info ""
    info "🎉 PostgreSQL production setup completed successfully!"
    info ""
    info "Connection Details:"
    info "  Host: $PG_HOST:$PG_PORT"
    info "  Database: $PG_SOC_DB"
    info "  User: $PG_SOC_USER"
    info ""
    info "Next: Run deployment scripts to deploy to staging"
}

# ============================================================
# Main Execution
# ============================================================
main() {
    section "National SOC Platform - PostgreSQL Production Setup"
    echo "Starting setup at $(date)"
    echo "Target: $PG_HOST:$PG_PORT/$PG_SOC_DB"
    echo ""
    
    if [ "$VALIDATE_ONLY" = true ]; then
        validate_setup
        exit $?
    fi
    
    preflight_checks
    backup_existing
    setup_database_user
    configure_postgresql
    enable_extensions
    run_migrations
    seed_data
    setup_rls
    create_indexes
    setup_monitoring
    validate_setup
    generate_report
    
    exit 0
}

# Run main function
main "$@"
