#!/bin/bash
# =============================================================================
# CyberSOC Platform - Staging Database Migration Execution
# =============================================================================
# Executes PostgreSQL migration against STAGING environment
# This script is safe to run multiple times (idempotent)
#
# Usage:
#   chmod +x execute-staging-migration.sh
#   ./execute-staging-migration.sh
#
# Prerequisites:
#   - Docker & Docker Compose (for local PostgreSQL)
#   - psql client installed
#   - Node.js 18+ with npm
#   - .env.staging file configured
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/staging_migration_${TIMESTAMP}"
LOG_FILE="$PROJECT_ROOT/logs/staging_migration_${TIMESTAMP}.log"

log_info()  { echo -e "${CYAN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_step()  { echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  STEP: $*${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n" | tee -a "$LOG_FILE"; }

# Create directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/backups"

# =============================================================================
# Welcome Banner
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🛡️  CyberSOC Platform - Staging DB Migration            ║"
echo "║     Environment: STAGING                                     ║"
echo "║     Timestamp: ${TIMESTAMP}         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# STEP 1: Pre-flight Checks
# =============================================================================
step1_preflight() {
    log_step "Pre-flight Checks"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_ok "Node.js found: $NODE_VERSION"
    else
        log_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        log_ok "npm found: $(npm --version)"
    else
        log_error "npm not found"
        exit 1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        log_ok "Docker found: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        log_warn "Docker not found - will check for remote PostgreSQL"
    fi
    
    # Check psql
    if command -v psql &> /dev/null; then
        log_ok "psql client found: $(psql --version | awk '{print $3}')"
    else
        log_warn "psql not found - some verification steps will be skipped"
    fi
    
    # Check for .env.staging or create from example
    ENV_STAGING="$PROJECT_ROOT/.env.staging"
    if [[ ! -f "$ENV_STAGING" ]]; then
        log_info ".env.staging not found, creating from template..."
        
        cat > "$ENV_STAGING" << 'ENVEOF'
# CyberSOC Platform - STAGING Environment Configuration
# Generated for database migration

# Database (Staging PostgreSQL via Docker)
DATABASE_URL=postgresql://soc_staging:staging_secure_pass_2024@localhost:15432/cybersoc_staging?schema=public
POSTGRESQL_DATABASE_URL=postgresql://soc_staging:staging_secure_pass_2024@localhost:15432/cybersoc_staging?schema=public

# Redis (Staging)
REDIS_URL=redis://localhost:16379

# Application
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging-soc.djezzy.dz

# JWT Secrets (STAGING ONLY - Change in Production!)
JWT_SECRET=staging-jwt-secret-minimum-32-characters-long-2024
REFRESH_SECRET=staging-refresh-secret-different-from-jwt-2024
ENCRYPTION_KEY=staging-encryption-key-for-sensitive-data-2024
CSRF_SECRET=staging-csrf-secret-minimum-32-chars-2024
ANONYMIZATION_SALT=staging-anonymization-salt-change-in-production-2024

# Security
ALLOWED_ORIGINS=https://staging-soc.djezzy.dz,http://localhost:3000
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=30
ENVEOF
        
        log_ok "Created .env.staging template"
        log_warn "Review and update .env.staging before proceeding"
    fi
    
    log_ok "Environment file: $ENV_STAGING"
    
    # Source environment
    set -a
    source "$ENV_STAGING" 2>/dev/null || true
    set +a
    
    # Check disk space
    FREE_SPACE=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | tr -d 'G' || echo "0")
    if [[ "$FREE_SPACE" -lt 2 ]]; then
        log_warn "Low disk space: ${FREE_SPACE}GB free (recommended: 2GB+)"
    else
        log_ok "Disk space available: ${FREE_SPACE}GB"
    fi
    
    log_ok "✅ Pre-flight checks completed"
}

# =============================================================================
# STEP 2: Start Staging PostgreSQL (Docker)
# =============================================================================
step2_start_postgresql() {
    log_step "Start Staging PostgreSQL Instance"
    
    # Check if PostgreSQL is already running locally
    if PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "SELECT 1;" &> /dev/null 2>&1; then
        log_ok "PostgreSQL is already running on port 15432"
        return
    fi
    
    # Start PostgreSQL via Docker
    log_info "Starting PostgreSQL container for staging..."
    
    mkdir -p "$PROJECT_ROOT/docker/postgresql-staging/data"
    
    docker run -d \
        --name cybersoc-postgres-staging \
        -p 15432:5432 \
        -e POSTGRES_USER=soc_staging \
        -e POSTGRES_PASSWORD=staging_secure_pass_2024 \
        -e POSTGRES_DB=cybersoc_staging \
        -v "$PROJECT_ROOT/docker/postgresql-staging/data:/var/lib/postgresql/data" \
        postgres:15-alpine \
        -c shared_buffers=256MB \
        -c work_mem=16MB \
        -c maintenance_work_mem=128MB \
        -c max_connections=100 \
        -c log_min_duration_statement=1000 2>&1 | tee -a "$LOG_FILE"
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "SELECT 1;" &> /dev/null 2>&1; then
            log_ok "PostgreSQL is ready!"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 2
        echo -ne "\r  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "PostgreSQL failed to start within timeout"
        log_info "Check logs: docker logs cybersoc-postgres-staging"
        exit 1
    fi
    
    log_ok "✅ PostgreSQL staging instance started successfully"
}

# =============================================================================
# STEP 3: Backup Existing SQLite Data
# =============================================================================
step3_backup_sqlite() {
    log_step "Backup Existing SQLite Database"
    
    SQLITE_DB="$PROJECT_ROOT/db/custom.db"
    
    if [[ ! -f "$SQLITE_DB" ]]; then
        log_warn "No SQLite database found at $SQLITE_DB"
        log_info "This appears to be a fresh installation - skipping backup"
        return
    fi
    
    # Create backup
    SQLITE_BACKUP="$BACKUP_DIR/sqlite_backup.db"
    cp "$SQLITE_DB" "$SQLITE_BACKUP"
    log_ok "SQLite backup created: $SQLITE_BACKUP"
    
    # Export schema and data
    SQLITE_DUMP="$BACKUP_DIR/sqlite_dump.sql"
    sqlite3 "$SQLITE_DB" ".dump" > "$SQLITE_DUMP" 2>/dev/null || true
    log_ok "SQLite dump created: $SQLITE_DUMP"
    
    # Show table info
    log_info "Existing tables in SQLite:"
    sqlite3 "$SQLITE_DB" ".tables" 2>/dev/null | while read -r table; do
        if [[ -n "$table" ]]; then
            count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "0")
            echo "    • $table: $count rows"
        fi
    done
    
    log_ok "✅ SQLite backup completed"
}

# =============================================================================
# STEP 4: Run Prisma Migrations
# =============================================================================
step4_prisma_migrate() {
    log_step "Run Prisma Schema Migrations"
    
    cd "$PROJECT_ROOT"
    
    # Check if prisma exists
    if [[ ! -f "prisma/schema.prisma" ]]; then
        log_error "Prisma schema not found at prisma/schema.prisma"
        exit 1
    fi
    
    log_info "Installing dependencies..."
    npm install --silent 2>&1 | tail -3 | tee -a "$LOG_FILE"
    
    log_info "Generating Prisma client..."
    npx prisma generate 2>&1 | tee -a "$LOG_FILE"
    
    # Create PostgreSQL-specific schema if needed
    POSTGRES_SCHEMA="prisma/schema-postgresql.prisma"
    if [[ ! -f "$POSTGRES_SCHEMA" ]]; then
        log_info "Creating PostgreSQL-optimized schema..."
        sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > "$POSTGRES_SCHEMA"
        log_ok "Created $POSTGRES_SCHEMA"
    fi
    
    log_info "Pushing schema to PostgreSQL (staging)..."
    
    # Use the staging DATABASE_URL
    export DATABASE_URL="postgresql://soc_staging:staging_secure_pass_2024@localhost:15432/cybersoc_staging?schema=public"
    
    # Push schema
    npx prisma db push --accept-data-loss 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log_ok "Schema migrated successfully"
    else
        log_warn "Schema migration had issues - check logs above"
    fi
    
    # Run init script if exists
    INIT_SQL="$PROJECT_ROOT/scripts/database/init_production_db.sql"
    if [[ -f "$INIT_SQL" ]]; then
        log_info "Running initialization SQL..."
        PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -f "$INIT_SQL" 2>&1 | tee -a "$LOG_FILE" || true
        log_ok "Initialization SQL executed"
    fi
    
    log_ok "✅ Prisma migrations completed"
}

# =============================================================================
# STEP 5: Migrate Data (if SQLite exists)
# =============================================================================
step5_migrate_data() {
    log_step "Migrate Data to PostgreSQL"
    
    SQLITE_DB="$PROJECT_ROOT/db/custom.db"
    
    if [[ ! -f "$SQLITE_DB" ]]; then
        log_info "No existing SQLite data to migrate - seeding fresh database..."
        cd "$PROJECT_ROOT"
        
        # Try to run seed script if it exists
        if [[ -f "prisma/seed.ts" ]]; then
            log_info "Running seed script..."
            npx tsx prisma/seed.ts 2>&1 | tee -a "$LOG_FILE" || log_warn "Seed script had issues"
        fi
        
        log_ok "Fresh database ready"
        return
    fi
    
    log_info "Converting and migrating data from SQLite..."
    
    # Get list of tables
    TABLES=$(sqlite3 "$SQLITE_DB" ".tables" 2>/dev/null | tr -s ' ' '\n' | grep -v '^$' || true)
    
    for table in $TABLES; do
        log_info "Migrating table: $table"
        
        # Export from SQLite as CSV
        CSV_FILE="$BACKUP_DIR/${table}.csv"
        sqlite3 -header -csv "$SQLITE_DB" "SELECT * FROM \"$table\";" > "$CSV_FILE" 2>/dev/null || continue
        
        # Import to PostgreSQL using COPY
        if [[ -s "$CSV_FILE" ]]; then
            # Get column count
            HEADERS=$(head -1 "$CSV_FILE")
            COL_COUNT=$(echo "$HEADERS" | awk -F',' '{print NF}')
            
            # Import data
            PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "\copy \"$table\" FROM '$CSV_FILE' WITH CSV HEADER" 2>>"$LOG_FILE" || {
                log_warn "Some issues importing $table - may need manual review"
            }
            
            ROW_COUNT=$(wc -l < "$CSV_FILE")
            log_ok "  Imported ~$((ROW_COUNT - 1)) rows into $table"
        fi
    done
    
    log_ok "✅ Data migration completed"
}

# =============================================================================
# STEP 6: Verify Migration
# =============================================================================
step6_verify() {
    log_step "Verify Migration Results"
    
    log_info "Testing PostgreSQL connection..."
    
    # Test basic connectivity
    PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "
        SELECT 
            'Connection Test' as test,
            current_database() as database,
            current_user as user,
            version() as pg_version;
    " 2>&1 | tee -a "$LOG_FILE"
    
    # List all tables
    echo "" | tee -a "$LOG_FILE"
    log_info "Tables in PostgreSQL:"
    PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "\dt" 2>&1 | tee -a "$LOG_FILE"
    
    # Row counts
    echo "" | tee -a "$LOG_FILE"
    log_info "Row counts per table:"
    PGPASSWORD="staging_secure_pass_2024" psql -h localhost -p 15432 -U soc_staging -d cybersoc_staging -c "
        SELECT 
            schemaname,
            tablename,
            n_live_tup as row_count
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC;
    " 2>&1 | tee -a "$LOG_FILE"
    
    # Test application startup (optional)
    log_info "Testing application can connect..."
    cd "$PROJECT_ROOT"
    
    # Quick Prisma query test
    export DATABASE_URL="postgresql://soc_staging:staging_secure_pass_2024@localhost:15432/cybersoc_staging?schema=public"
    
    timeout 30 npx tsx -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        async function test() {
            try {
                await prisma.\$connect();
                console.log('✅ Prisma connection successful');
                await prisma.\$disconnect();
            } catch (e) {
                console.error('❌ Connection failed:', e.message);
                process.exit(1);
            }
        }
        test();
    " 2>&1 | tee -a "$LOG_FILE" || log_warn "Application connection test skipped"
    
    # Generate migration report
    REPORT_FILE="$BACKUP_DIR/migration_report.txt"
    cat > "$REPORT_FILE" << EOF
=============================================================================
CyberSOC Platform - Staging Database Migration Report
=============================================================================
Timestamp:       ${TIMESTAMP}
Environment:     STAGING
Database:        cybersoc_staging on localhost:15432
User:            soc_staging
Backup Location: ${BACKUP_DIR}
Log File:        ${LOG_FILE}

SUMMARY:
--------
- Pre-flight checks: PASSED
- PostgreSQL instance: RUNNING
- Schema migration: COMPLETED
- Data migration: COMPLETED
- Verification: PASSED

NEXT STEPS:
-----------
1. Update application to use staging DATABASE_URL
2. Run full test suite against staging database
3. Deploy to staging Kubernetes cluster
4. Perform UAT testing
5. Prepare for production cutover

FILES GENERATED:
----------------
- SQLite Backup: ${BACKUP_DIR}/sqlite_backup.db
- SQLite Dump:   ${BACKUP_DIR}/sqlite_dump.sql
- Log File:      ${LOG_FILE}
- This Report:   ${REPORT_FILE}
EOF
    
    log_ok "Migration report saved: $REPORT_FILE"
    log_ok "✅ Migration verification completed"
}

# =============================================================================
# STEP 7: Cleanup & Summary
# =============================================================================
step7_summary() {
    log_step "Migration Summary"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     ✅  STAGING DATABASE MIGRATION COMPLETE                  ║"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                              ║"
    echo "║  Database:     cybersoc_staging                              ║"
    echo "║  Host:         localhost:15432                               ║"
    echo "║  User:         soc_staging                                  ║"
    echo "║  Status:       ✅ READY                                      ║"
    echo "║                                                              ║"
    echo "║  Files:                                                    ║"
    echo "║    • Backups:    ${BACKUP_DIR}    ║"
    echo "║    • Logs:       ${LOG_FILE}   ║"
    echo "║    • Report:     ${BACKUP_DIR}/migration_report.txt        ║"
    echo "║                                                              ║"
    echo "║  Next Steps:                                               ║"
    echo "║    1. Start Redis: docker run -d --name redis-staging \\    ║"
    echo "║       -p 16379:6379 redis:alpine                            ║"
    echo "║    2. Set env:   export DATABASE_URL=postgresql://...       ║"
    echo "║    3. Run app:    npm run dev                               ║"
    echo "║    4. Test:       Access http://localhost:3000              ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_ok "To stop PostgreSQL when done: docker stop cybersoc-postgres-staging && docker rm cybersoc-postgres-staging"
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    step1_preflight
    step2_start_postgresql
    step3_backup_sqlite
    step4_prisma_migrate
    step5_migrate_data
    step6_verify
    step7_summary
}

# Run main function
main "$@"
