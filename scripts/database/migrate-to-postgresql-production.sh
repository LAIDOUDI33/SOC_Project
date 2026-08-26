#!/bin/bash
# =============================================================================
# CyberSOC Platform - PostgreSQL Production Migration Script
# =============================================================================
# Migrates from SQLite development database to PostgreSQL production cluster
# Includes connection pooling setup, HA configuration, and performance tuning
#
# Usage:
#   ./scripts/database/migrate-to-postgresql-production.sh [environment]
#   Environments: staging | production
#
# Prerequisites:
#   - PostgreSQL 15+ installed and running
#   - psql client available
#   - Environment variables set or .env.production configured
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/db_migration_${TIMESTAMP}"

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check PostgreSQL client
    if ! command -v psql &> /dev/null; then
        log_error "psql client not found. Please install PostgreSQL client."
        exit 1
    fi
    log_ok "PostgreSQL client found"
    
    # Check environment file
    ENV_FILE="$PROJECT_ROOT/.env.${ENVIRONMENT}"
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    log_ok "Environment file found: $ENV_FILE"
    
    # Source environment (carefully - only what we need)
    export $(grep -E '^DATABASE_URL|^DB_' "$ENV_FILE" | xargs)
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL not set in environment file"
        exit 1
    fi
    log_ok "DATABASE_URL configured"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    log_ok "Backup directory created: $BACKUP_DIR"
    
    # Check disk space (need at least 5GB free)
    FREE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ "$FREE_SPACE" -lt 5 ]]; then
        log_warn "Low disk space: ${FREE_SPACE}GB free (recommended: 5GB+)"
    fi
    
    log_ok "Pre-flight checks passed"
}

# =============================================================================
# Step 1: Backup Existing Database
# =============================================================================

backup_existing_db() {
    log_info "Step 1: Backing up existing database..."
    
    # Find SQLite database
    SQLITE_DB="$PROJECT_ROOT/db/custom.db"
    if [[ ! -f "$SQLITE_DB" ]]; then
        log_warn "SQLite database not found at $SQLITE_DB"
        log_warn "Attempting to find alternative location..."
        SQLITE_DB=$(find "$PROJECT_ROOT" -name "*.db" -type f 2>/dev/null | head -1)
        
        if [[ -z "$SQLITE_DB" ]]; then
            log_error "No SQLite database found. Cannot proceed with migration."
            exit 1
        fi
    fi
    
    log_ok "Found SQLite database: $SQLITE_DB"
    
    # Create SQLite backup
    SQLITE_BACKUP="$BACKUP_DIR/sqlite_backup_${TIMESTAMP}.db"
    cp "$SQLITE_DB" "$SQLITE_BACKUP"
    log_ok "SQLite backup created: $SQLITE_BACKUP"
    
    # Export SQLite data to SQL (for inspection)
    SQLITE_DUMP="$BACKUP_DIR/sqlite_dump_${TIMESTAMP}.sql"
    sqlite3 "$SQLITE_DB" ".dump" > "$SQLITE_DUMP"
    log_ok "SQLite dump created: $SQLITE_DUMP"
    
    # Show table counts
    log_info "Current tables in SQLite:"
    sqlite3 "$SQLITE_DB" ".tables" | while read -r table; do
        count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "N/A")
        echo "  - $table: $count rows"
    done
}

# =============================================================================
# Step 2: Prepare PostgreSQL Database
# =============================================================================

prepare_postgresql() {
    log_info "Step 2: Preparing PostgreSQL database..."
    
    # Extract connection info from DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    DB_USER=$(echo "$DATABASE_URL" | sed -E 's/.*\/\/([^:]+):.*/\1/')
    DB_PASS=$(echo "$DATABASE_URL" | sed -E 's/.*\/\/[^:]+:([^@]+).*/\1/')
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:]+):.*/\1/')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/' | grep -oE '[0-9]+' || echo "5432")
    DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/.*\/([^\?]+).*/\1/')
    
    log_info "Database: $DB_NAME on $DB_HOST:$DB_PORT as $DB_USER"
    
    # Test connection
    if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_ok "PostgreSQL connection successful"
    else
        log_warn "Database may not exist yet. Attempting to create..."
        
        # Try connecting to postgres database to create our database
        PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" 2>/dev/null || {
            log_error "Failed to create database. Please check credentials and permissions."
            exit 1
        }
        log_ok "Database created: $DB_NAME"
    fi
    
    # Save connection info for later steps
    cat > "$BACKUP_DIR/pg_connection.conf" << EOF
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGUSER=$DB_USER
PGPASSWORD=$DB_PASS
PGDATABASE=$DB_NAME
EOF
    chmod 600 "$BACKUP_DIR/pg_connection.conf"
    log_ok "Connection config saved"
}

# =============================================================================
# Step 3: Convert Schema (SQLite → PostgreSQL)
# =============================================================================

convert_schema() {
    log_info "Step 3: Converting schema from SQLite to PostgreSQL..."
    
    PRISMA_SCHEMA="$PROJECT_ROOT/prisma/schema.prisma"
    POSTGRES_SCHEMA="$PROJECT_ROOT/prisma/schema-postgresql.prisma"
    
    if [[ ! -f "$PRISMA_SCHEMA" ]]; then
        log_error "Prisma schema not found: $PRISMA_SCHEMA"
        exit 1
    fi
    
    # Check if PostgreSQL schema already exists
    if [[ -f "$POSTGRES_SCHEMA" ]]; then
        log_ok "PostgreSQL schema already exists: $POSTGRES_SCHEMA"
    else
        # Convert provider from sqlite to postgresql
        sed 's/provider = "sqlite"/provider = "postgresql"/' "$PRISMA_SCHEMA" > "$POSTGRES_SCHEMA"
        
        # Update database URL reference
        sed -i 's|url      = env("DATABASE_URL")|url      = env("POSTGRESQL_DATABASE_URL")|' "$POSTGRES_SCHEMA"
        
        log_ok "PostgreSQL schema created: $POSTGRES_SCHEMA"
    fi
    
    # Run Prisma migration
    log_info "Running Prisma migrations..."
    cd "$PROJECT_ROOT"
    
    # Set PostgreSQL URL for migration
    export POSTGRESQL_DATABASE_URL="$DATABASE_URL"
    
    # Generate client and push schema
    npx prisma generate --schema="$POSTGRES_SCHEMA" 2>&1 | tail -5
    npx prisma db push --schema="$POSTGRES_SCHEMA" 2>&1 | tail -10
    
    log_ok "Schema migrated to PostgreSQL"
}

# =============================================================================
# Step 4: Migrate Data
# =============================================================================

migrate_data() {
    log_info "Step 4: Migrating data from SQLite to PostgreSQL..."
    
    SOURCE_SQLITE="$BACKUP_DIR/sqlite_dump_${TIMESTAMP}.sql"
    TARGET_POSTGRES="$BACKUP_DIR/postgresql_converted_${TIMESTAMP}.sql"
    
    # Convert SQLite dump to PostgreSQL format
    log_info "Converting SQL dialect..."
    
    # Common conversions
    sed \
        -e 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' \
        -e 's/AUTOINCREMENT/DEFAULT nextval/g' \
        -e 's/boolean/BOOLEAN/g' \
        -e 's/"true"/TRUE/g' \
        -e 's/"false"/FALSE/g' \
        -e 's/BLOB/BYTEA/g' \
        -e 's/DATETIME/TIMESTAMPTZ/g' \
        -e 's/INSERT INTO "\([^"]*\)"/INSERT INTO \1/g' \
        -e 's/"\([^"]*\)"/\1/g' \
        "$SOURCE_SQLITE" > "$TARGET_POSTGRES"
    
    log_ok "SQL conversion complete"
    
    # Load data into PostgreSQL
    log_info "Loading data into PostgreSQL..."
    
    source "$BACKUP_DIR/pg_connection.conf"
    
    # Execute converted SQL
    if PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$TARGET_POSTGRES" 2>&1 | tee "$BACKUP_DIR/migration_log_${TIMESTAMP}.log" | tail -20; then
        log_ok "Data migration completed successfully"
    else
        log_warn "Some errors during migration. Check log file."
    fi
    
    # Verify row counts
    log_info "Verifying row counts..."
    
    echo "" >> "$BACKUP_DIR/migration_report.txt"
    echo "=== Migration Report - $TIMESTAMP ===" >> "$BACKUP_DIR/migration_report.txt"
    echo "Source: SQLite ($SQLITE_DB)" >> "$BACKUP_DIR/migration_report.txt"
    echo "Target: PostgreSQL ($DB_NAME @ $DB_HOST)" >> "$BACKUP_DIR/migration_report.txt"
    echo "" >> "$BACKUP_DIR/migration_report.txt"
    printf "%-30s %15s %15s\n" "Table" "SQLite Rows" "PostgreSQL Rows" >> "$BACKUP_DIR/migration_report.txt"
    printf "%-30s %15s %15s\n" "-----" "-----------" "---------------" >> "$BACKUP_DIR/migration_report.txt"
    
    # Get tables from SQLite
    sqlite3 "$SQLITE_DB" ".tables" | while read -r table; do
        sqlite_count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        pg_count=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | tr -d ' ' || echo "N/A")
        
        printf "%-30s %15s %15s\n" "$table" "$sqlite_count" "$pg_count" >> "$BACKUP_DIR/migration_report.txt"
        
        if [[ "$sqlite_count" == "$pg_count" ]]; then
            log_ok "  $table: $pg_count rows ✓"
        else
            log_warn "  $table: SQLite=$sqlite_count, PG=$pg_count ⚠"
        fi
    done
    
    log_ok "Migration report saved: $BACKUP_DIR/migration_report.txt"
}

# =============================================================================
# Step 5: Configure Connection Pooling (PgBouncer)
# =============================================================================

configure_pgbouncer() {
    log_info "Step 5: Configuring PgBouncer connection pooling..."
    
    PGBOUNCER_CONF="/etc/pgbouncer/pgbouncer.ini"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Production PgBouncer configuration
        cat << 'EOF' | sudo tee "$PGBOUNCER_CONF" > /dev/null || log_warn "Could not write PgBouncer config (requires sudo)"
[databases]
cybersoc = host=localhost port=5432 dbname=cybersoc

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 3
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = postgres,cybersoc
stats_users = stats
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
server_reset_query = DISCARD ALL
server_check_query = SELECT 1
server_check_delay = 30
server_idle_timeout = 300
connection_lifetime = 3600
client_idle_timeout = 0
dns_max_ttl = 15
dns_nxdomain_ttl = 15
EOF
        
        log_ok "PgBouncer configuration written (requires restart)"
        log_info "To apply: sudo systemctl restart pgbouncer"
    else
        log_skip "PgBouncer configuration skipped for $ENVIRONMENT"
    fi
}

# =============================================================================
# Step 6: Performance Tuning
# =============================================================================

performance_tuning() {
    log_info "Step 6: Applying PostgreSQL performance tuning..."
    
    TUNING_CONF="$BACKUP_DIR/postgresql_tuning_${TIMESTAMP}.conf"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        cat > "$TUNING_CONF" << 'EOF'
# =============================================================================
# CyberSOC PostgreSQL Production Tuning
# Optimized for high-concurrency SOC workloads (10K+ EPS)
# =============================================================================

# CONNECTION SETTINGS
max_connections = 500
superuser_reserved_connections = 5

# MEMORY SETTINGS (adjust based on available RAM)
shared_buffers = 8GB                    # 25% of total RAM
effective_cache_size = 24GB             # 75% of total RAM
work_mem = 64MB                         # Per-operation memory
maintenance_work_mem = 2GB              # Maintenance operations
huge_pages = try                        # Use huge pages if available

# WAL SETTINGS
wal_buffers = 256MB
checkpoint_completion_target = 0.9
max_wal_size = 8GB
min_wal_size = 2GB
wal_compression = zstd

# QUERY TUNING
default_statistics_target = 500
random_page_cost = 1.1                   # SSD storage
effective_io_concurrency = 200           # SSD RAID
jit = on                                # Enable JIT compilation

# LOGGING
log_min_duration_statement = 1000       # Log slow queries (>1s)
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_statement = 'ddl'

# AUTOVACUUM
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 1min
autovacuum_vacuum_scale_factor = 0.05
autovacuum_analyze_scale_factor = 0.02
autovacuum_vacuum_cost_limit = 2000

# REPLICATION (for read replicas)
wal_level = replica
max_replication_slots = 5
max_wal_senders = 5
hot_standby = on
EOF
        
        log_ok "Production tuning config created: $TUNING_CONF"
        log_info "Apply manually: Copy settings to postgresql.conf and restart PostgreSQL"
    else
        # Staging tuning (conservative)
        cat > "$TUNING_CONF" << 'EOF'
# Staging PostgreSQL Tuning
max_connections = 100
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 16MB
maintenance_work_mem = 256MB
default_statistics_target = 200
log_min_duration_statement = 5000
EOF
        
        log_ok "Staging tuning config created: $TUNING_CONF"
    fi
}

# =============================================================================
# Step 7: Setup Replication (Production Only)
# =============================================================================

setup_replication() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        log_info "Step 7: Skipping replication setup (not production)"
        return
    fi
    
    log_info "Step 7: Setting up streaming replication..."
    
    REPLICATION_SCRIPT="$BACKUP_DIR/setup_replication.sql"
    
    cat > "$REPLICATION_SCRIPT" << 'EOF'
-- Create replication user (run once)
CREATE ROLE cybersoc_replicator WITH REPLICATION LOGIN PASSWORD '<REPLICATION_PASSWORD>';
GRANT pg_read_all_data TO cybersoc_replicator;

-- Publication for logical replication (if needed)
CREATE PUBLICATION cybersoc_publication FOR ALL TABLES;

-- Grant read access to replication user
GRANT USAGE ON SCHEMA public TO cybersoc_replicator;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cybersoc_replicator;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cybersoc_replicator;
EOF
    
    log_ok "Replication setup script created: $REPLICATION_SCRIPT"
    log_info "Review and execute manually after setting up replica servers"
}

# =============================================================================
# Step 8: Verification & Cleanup
# =============================================================================

verify_migration() {
    log_info "Step 8: Verifying migration..."
    
    source "$BACKUP_DIR/pg_connection.conf"
    
    # Test basic queries
    log_info "Testing PostgreSQL connectivity..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
        SELECT 
            current_database() as database,
            current_user as user,
            count(*) as table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    " 2>&1 | head -5
    
    # Test application connection
    log_info "Testing application-level queries..."
    
    # Check users table (if exists)
    USER_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "N/A")
    log_ok "Users in database: $USER_COUNT"
    
    # Final summary
    log_ok ""
    log_ok "=========================================="
    log_ok "MIGRATION COMPLETED SUCCESSFULLY"
    log_ok "=========================================="
    log_ok ""
    log_ok "Summary:"
    log_ok "  Environment:     $ENVIRONMENT"
    log_ok "  Host:            $PGHOST:$PGPORT"
    log_ok "  Database:        $PGDATABASE"
    log_ok "  Backup Location: $BACKUP_DIR"
    log_ok "  Timestamp:       $TIMESTAMP"
    log_ok ""
    log_ok "Next Steps:"
    log_ok "  1. Review migration report: $BACKUP_DIR/migration_report.txt"
    log_ok "  2. Update application .env to use PostgreSQL"
    log_ok "  3. Restart application services"
    log_ok "  4. Monitor for any issues"
    log_ok "  5. Keep backup for at least 30 days"
    log_ok ""
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     CyberSOC Platform - PostgreSQL Migration Tool        ║"
    echo "║     Environment: $(printf '%-38s' "$ENVIRONMENT")║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    preflight_checks
    backup_existing_db
    prepare_postgresql
    convert_schema
    migrate_data
    configure_pgbouncer
    performance_tuning
    setup_replication
    verify_migration
    
    log_ok "Migration process completed!"
}

# Run main function
main "$@"
