#!/usr/bin/env bash
# ============================================================================
# Djezzy National SOC Platform - Production Deployment Script
#
# Comprehensive deployment automation with:
# - Pre-deployment validation checks
# - Database migration execution
# - Next.js application build
# - Service management (systemd/docker)
# - Post-deployment health verification
# - Automatic rollback on failure
# - Complete audit logging
#
# Usage: ./deploy.sh [options] [environment]
#
# Options:
#   --skip-checks      Skip pre-deployment checks (not recommended)
#   --skip-migrations  Skip database migrations
#   --skip-build       Skip build step (use existing .next)
#   --no-restart       Don't restart service after deploy
#   --no-rollback      Disable automatic rollback on failure
#   --dry-run          Show what would be done without executing
#   --backup           Create backup before deploying
#   --verbose          Enable verbose output
#   --log-file FILE    Custom log file path
#
# Environments:
#   staging            Deploy to staging environment (default)
#   production         Deploy to production
#
# Exit codes:
#   0 - Deployment successful
#   1 - Pre-deployment checks failed
#   2 - Build failed
#   3 - Migration failed
#   4 - Service restart failed
#   5 - Health check failed after deploy
#   6 - Rollback failed
#
# @version 2.0.0
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_LOGS="$PROJECT_ROOT/logs/deployments"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$DEPLOYMENT_LOGS/deploy_${TIMESTAMP}.log"
BACKUP_DIR="$PROJECT_ROOT/backups/pre_deployment_${TIMESTAMP}"

# Deployment configuration
APP_NAME="soc-platform"
SERVICE_NAME="${SERVICE_NAME:-soc-platform}"
DEPLOY_ENV="${1:-staging}"
HEALTH_CHECK_URL="http://localhost:3000/api/health"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=5
MAX_RETRIES=3
ROLLBACK_ON_FAILURE=true
CREATE_BACKUP=true

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# State tracking
DEPLOYMENT_START_TIME=$(date +%s)
CURRENT_STEP=""
ROLLBACK_AVAILABLE=false
PREV_DEPLOYMENT_HASH=""

# Parse arguments
SKIP_CHECKS=false
SKIP_MIGRATIONS=false
SKIP_BUILD=false
NO_RESTART=false
NO_ROLLBACK=false
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)     SKIP_CHECKS=true; shift ;;
        --skip-migrations) SKIP_MIGRATIONS=true; shift ;;
        --skip-build)      SKIP_BUILD=true; shift ;;
        --no-restart)      NO_RESTART=true; shift ;;
        --no-rollback)     NO_ROLLBACK=true; ROLLBACK_ON_FAILURE=false; shift ;;
        --dry-run)         DRY_RUN=true; shift ;;
        --backup)          CREATE_BACKUP=true; shift ;;
        --verbose)         VERBOSE=true; shift ;;
        --log-file)        LOG_FILE="$2"; shift 2 ;;
        --staging)         DEPLOY_ENV="staging"; shift ;;
        --production)      DEPLOY_ENV="production"; shift ;;
        *)                 shift ;;
    esac
done

# ============================================================================
# Utility Functions
# ============================================================================

setup_logging() {
    mkdir -p "$DEPLOYMENT_LOGS"
    touch "$LOG_FILE"
}

log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)    echo -e "${CYAN}[INFO]${NC}    [$timestamp] $message" ;;
        SUCCESS) echo -e "${GREEN}[OK]${NC}      [$timestamp] $message" ;;
        WARN)    echo -e "${YELLOW}[WARN]${NC}    [$timestamp] $message" ;;
        ERROR)   echo -e "${RED}[ERROR]${NC}   [$timestamp] $message" ;;
        STEP)    echo -e "\n${BOLD}${BLUE}====> $message${NC}" ;;
        HEADER)  echo -e "\n${BOLD}========================================${NC}"
                 echo -e "${BOLD}$message${BOLD}"
                 echo -e "${BOLD}================================--------${NC}" ;;
        *)       echo "[$level] $message" ;;
    esac
    
    echo "[$timestamp] [$level] [STEP:$CURRENT_STEP] $message" >> "$LOG_FILE"
}

execute() {
    local cmd=$*
    log "DEBUG" "Executing: $cmd"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would execute: $cmd"
        return 0
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        eval "$cmd" 2>&1 | tee -a "$LOG_FILE"
        return ${PIPESTATUS[0]}
    else
        eval "$cmd" >> "$LOG_FILE" 2>&1
    fi
}

get_duration() {
    local start=$1
    local end=$(date +%s)
    local duration=$(( end - start ))
    local mins=$(( duration / 60 ))
    local secs=$(( duration % 60 ))
    printf "%dm %02ds" $mins $secs
}

cleanup_on_error() {
    local exit_code=$?
    local step="$CURRENT_STEP"
    
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Deployment failed during step: $step"
        log "ERROR" "Exit code: $exit_code"
        
        if [[ "$ROLLBACK_ON_FAILURE" == "true" && "$NO_ROLLBACK" != "true" && "$ROLLBACK_AVAILABLE" == "true" ]]; then
            log "WARN" "Initiating automatic rollback..."
            rollback_deployment || log "ERROR" "Rollback failed!"
        fi
    fi
    
    exit $exit_code
}

trap cleanup_on_error EXIT

# ============================================================================
# Step 1: Pre-flight Checks
# ============================================================================

preflight_checks() {
    CURRENT_STEP="preflight"
    log "STEP" "Running pre-flight checks..."
    
    # Check we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log "ERROR" "Not a valid project directory (no package.json)"
        exit 1
    fi
    log "SUCCESS" "Project directory valid"
    
    # Check for required tools
    local required_tools=("node" "npm")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 1
        fi
    done
    log "SUCCESS" "Required tools available"
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    local major_version=${node_version%%.*}
    if [[ "$major_version" -lt 18 ]]; then
        log "ERROR" "Node.js version $node_version is too old (>=18 required)"
        exit 1
    fi
    log "SUCCESS" "Node.js version OK: v$node_version"
    
    # Environment-specific warnings
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        if [[ "${NODE_ENV:-}" != "production" ]]; then
            log "WARN" "Deploying to production but NODE_ENV='$NODE_ENV'"
        fi
        
        if [[ "$SKIP_CHECKS" == "true" ]]; then
            log "ERROR" "--skip-checks is not allowed for production deployments"
            exit 1
        fi
    fi
}

# ============================================================================
# Step 2: Pre-deployment Validation
# ============================================================================

run_pre_deploy_checks() {
    CURRENT_STEP="pre-deploy-checks"
    
    if [[ "$SKIP_CHECKS" == "true" ]]; then
        log "WARN" "Skipping pre-deployment checks (--skip-checks)"
        return 0
    fi
    
    log "STEP" "Running pre-deployment validation..."
    
    local check_script="$SCRIPT_DIR/pre-deploy-check.sh"
    
    if [[ ! -x "$check_script" ]]; then
        chmod +x "$check_script"
    fi
    
    if ! "$check_script" --json >> "$LOG_FILE" 2>&1; then
        local exit_code=$?
        log "ERROR" "Pre-deployment checks failed (exit code: $exit_code)"
        
        if [[ "$DEPLOY_ENV" == "production" ]]; then
            log "ERROR" "Cannot proceed with failed checks in production"
            exit 1
        fi
        
        log "WARN" "Proceeding despite check failures (non-production)"
    else
        log "SUCCESS" "Pre-deployment checks passed"
    fi
}

# ============================================================================
# Step 3: Create Backup
# ============================================================================

create_backup() {
    CURRENT_STEP="backup"
    
    if [[ "$CREATE_BACKUP" != "true" ]]; then
        log "INFO" "Backup disabled"
        return 0
    fi
    
    log "STEP" "Creating deployment backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Store current git hash for potential rollback
    if git rev-parse HEAD &>/dev/null; then
        PREV_DEPLOYMENT_HASH=$(git rev-parse HEAD)
        echo "$PREV_DEPLOYMENT_HASH" > "$BACKUP_DIR/git_hash.txt"
        log "INFO" "Current commit: $PREV_DEPLOYMENT_HASH"
    fi
    
    # Backup built assets
    if [[ -d "$PROJECT_ROOT/.next" ]]; then
        cp -r "$PROJECT_ROOT/.next" "$BACKUP_DIR/" 2>/dev/null || true
        log "INFO" "Backed up .next directory"
    fi
    
    # Backup Prisma migrations
    if [[ -d "$PROJECT_ROOT/prisma/migrations" ]]; then
        cp -r "$PROJECT_ROOT/prisma/migrations" "$BACKUP_DIR/prisma_migrations" 2>/dev/null || true
        log "INFO" "Backed up Prisma migrations"
    fi
    
    # Backup database (if PostgreSQL with pg_dump available)
    if command -v pg_dump &>/dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
        log "INFO" "Creating database backup..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_backup.sql" 2>/dev/null && \
            log "SUCCESS" "Database backed up" || \
            log "WARN" "Database backup failed (continuing anyway)"
    fi
    
    ROLLBACK_AVAILABLE=true
    log "SUCCESS" "Backup created at $BACKUP_DIR"
}

# ============================================================================
# Step 4: Database Migrations
# ============================================================================

run_migrations() {
    CURRENT_STEP="migrations"
    
    if [[ "$SKIP_MIGRATIONS" == "true" ]]; then
        log "INFO" "Skipping database migrations (--skip-migrations)"
        return 0
    fi
    
    log "STEP" "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Generate Prisma client first
    log "INFO" "Generating Prisma client..."
    if ! execute bun run db:generate; then
        log "ERROR" "Prisma client generation failed"
        exit 3
    fi
    log "SUCCESS" "Prisma client generated"
    
    # Run migrations
    log "INFO" "Applying database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would run: prisma migrate deploy"
        return 0
    fi
    
    # Try migrate deploy first (for production), fallback to db push
    if npx prisma migrate deploy 2>> "$LOG_FILE"; then
        log "SUCCESS" "Database migrations applied successfully"
    elif execute bun run db:push; then
        log "SUCCESS" "Database schema pushed (db:push)"
    else
        log "ERROR" "Database migration failed"
        exit 3
    fi
    
    # Verify migration status
    log "INFO" "Verifying migration status..."
    if npx prisma migrate status >> "$LOG_FILE" 2>&1; then
        log "SUCCESS" "Migration status verified"
    else
        log "WARN" "Could not verify migration status"
    fi
}

# ============================================================================
# Step 5: Build Application
# ============================================================================

build_application() {
    CURRENT_STEP="build"
    
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log "INFO" "Skipping build step (--skip-build)"
        return 0
    fi
    
    log "STEP" "Building Next.js application..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    log "INFO" "Cleaning previous build..."
    rm -rf .next 2>/dev/null || true
    
    # Install dependencies
    log "INFO" "Installing dependencies..."
    if ! execute bun install; then
        log "ERROR" "Dependency installation failed"
        exit 2
    }
    log "SUCCESS" "Dependencies installed"
    
    # Build the application
    log "INFO" "Building application (this may take a while)..."
    local build_start=$(date +%s)
    
    if ! execute bun run build; then
        log "ERROR" "Application build failed"
        exit 2
    fi
    
    local build_duration=$(get_duration $build_start)
    log "SUCCESS" "Application built successfully ($build_duration)"
    
    # Verify build output
    if [[ ! -d "$PROJECT_ROOT/.next" ]]; then
        log "ERROR" "Build output directory not found"
        exit 2
    fi
    
    log "INFO" "Build artifacts size: $(du -sh .next | cut -f1)"
}

# ============================================================================
# Step 6: Restart Service
# ============================================================================

restart_service() {
    CURRENT_STEP="restart"
    
    if [[ "$NO_RESTART" == "true" ]]; then
        log "INFO" "Service restart skipped (--no-restart)"
        return 0
    fi
    
    log "STEP" "Restarting service..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "[DRY-RUN] Would restart service"
        return 0
    fi
    
    # Determine service management method
    if command -v systemctl &>/dev/null && systemctl is-active "$SERVICE_NAME" &>/dev/null; then
        # Systemd service
        log "INFO" "Restarting via systemd: $SERVICE_NAME"
        
        if ! execute sudo systemctl restart "$SERVICE_NAME"; then
            log "ERROR" "Systemd service restart failed"
            exit 4
        fi
        
        # Wait for service to start
        log "INFO" "Waiting for service to start..."
        sleep 5
        
        if systemctl is-active "$SERVICE_NAME" &>/dev/null; then
            log "SUCCESS" "Service restarted via systemd"
        else
            log "ERROR" "Service failed to start"
            journalctl -u "$SERVICE_NAME" --no-pager -n 20 >> "$LOG_FILE" 2>&1 || true
            exit 4
        fi
        
    elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "$APP_NAME"; then
        # Docker container
        log "INFO" "Restarting via Docker: $APP_NAME"
        
        if ! execute docker restart "$APP_NAME"; then
            log "ERROR" "Docker container restart failed"
            exit 4
        fi
        
        log "INFO" "Waiting for container to start..."
        sleep 10
        
        if docker ps --format '{{.Names}}' | grep -q "$APP_NAME"; then
            log "SUCCESS" "Container restarted via Docker"
        else
            log "ERROR" "Container failed to start"
            docker logs "$APP_NAME" --tail 20 >> "$LOG_FILE" 2>&1 || true
            exit 4
        fi
        
    elif [[ -f "$PROJECT_ROOT/.env" ]] && pgrep -f "next-server\|node.*server.js" &>/dev/null; then
        # Process-based (PM2 or direct node)
        log "INFO" "Attempting process-based restart..."
        
        if command -v pm2 &>/dev/null && pm2 list | grep -q "$APP_NAME"; then
            if ! execute pm2 restart "$APP_NAME"; then
                log "ERROR" "PM2 restart failed"
                exit 4
            fi
            log "SUCCESS" "Service restarted via PM2"
        else
            log "WARN" "No recognized service manager found"
            log "INFO" "Manual restart may be required"
        fi
    else
        log "WARN" "No running service detected to restart"
        log "INFO" "Service will need to be started manually"
    fi
}

# ============================================================================
# Step 7: Post-deployment Health Checks
# ============================================================================

health_check() {
    CURRENT_STEP="health-check"
    
    log "STEP" "Running post-deployment health checks..."
    
    local health_check_script="$SCRIPT_DIR/health-check.sh"
    
    if [[ -x "$health_check_script" ]]; then
        log "INFO" "Using health-check.sh script..."
        
        local health_result=0
        "$health_check_script" >> "$LOG_FILE" 2>&1 || health_result=$?
        
        case $health_result in
            0) log "SUCCESS" "Health check passed - system healthy" ;;
            1) 
                log "WARN" "Health check warning - system degraded but operational"
                if [[ "$DEPLOY_ENV" == "production" ]]; then
                    log "WARN" "Production system degraded - monitoring recommended"
                fi
                ;;
            *)
                log "ERROR" "Health check failed (exit code: $health_result)"
                exit 5
                ;;
        esac
    else
        # Fallback: simple HTTP health check
        log "INFO" "Running basic HTTP health check..."
        
        local elapsed=0
        local healthy=false
        
        while [[ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]]; do
            local http_status
            http_status=$(curl -sf -o /dev/null -w '%{http_code}' "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
            
            if [[ "$http_status" =~ ^2[0-9][0-9]$ ]]; then
                healthy=true
                break
            fi
            
            sleep $HEALTH_CHECK_INTERVAL
            elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
        done
        
        if [[ "$healthy" == "true" ]]; then
            log "SUCCESS" "HTTP health check passed (${elapsed}s)"
        else
            log "ERROR" "HTTP health check failed after ${elapsed}s timeout"
            
            # Get more details
            curl -sv "$HEALTH_CHECK_URL" >> "$LOG_FILE" 2>&1 || true
            exit 5
        fi
    fi
}

# ============================================================================
# Rollback Functionality
# ============================================================================

rollback_deployment() {
    CURRENT_STEP="rollback"
    
    log "STEP" "INITIATING ROLLBACK..."
    
    if [[ "$ROLLBACK_AVAILABLE" != "true" ]]; then
        log "ERROR" "No backup available for rollback"
        return 1
    fi
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "ERROR" "Backup directory not found: $BACKUP_DIR"
        return 1
    fi
    
    log "INFO" "Rolling back from backup: $BACKUP_DIR"
    
    # Restore previous build
    if [[ -d "$BACKUP_DIR/.next" ]]; then
        rm -rf "$PROJECT_ROOT/.next" 2>/dev/null || true
        cp -r "$BACKUP_DIR/.next" "$PROJECT_ROOT/"
        log "INFO" "Restored .next directory"
    fi
    
    # Restore git state if applicable
    if [[ -f "$BACKUP_DIR/git_hash.txt" ]] && git rev-parse HEAD &>/dev/null; then
        local prev_hash
        prev_hash=$(cat "$BACKUP_DIR/git_hash.txt")
        log "INFO" "Restoring git state to: $prev_hash"
        git checkout "$prev_hash" --force 2>/dev/null || log "WARN" "Git checkout failed"
    fi
    
    # Restart service with old version
    if [[ "$NO_RESTART" != "true" ]]; then
        log "INFO" "Restarting service with rolled-back version..."
        NO_ROLLBACK=true  # Prevent infinite loop
        restart_service || log "ERROR" "Service restart after rollback failed"
    fi
    
    # Verify rollback health
    log "INFO" "Verifying rollback health..."
    sleep 10
    
    local http_status
    http_status=$(curl -sf -o /dev/null -w '%{http_code}' "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
    
    if [[ "$http_status" =~ ^2[0-9][0-9]$ ]]; then
        log "SUCCESS" "Rollback completed successfully - service restored"
        return 0
    else
        log "ERROR" "Rollback may have failed - manual intervention required"
        return 1
    fi
}

# ============================================================================
# Final Summary
# ============================================================================

print_summary() {
    local total_time=$(get_duration $DEPLOYMENT_START_TIME)
    local final_status="SUCCESS"
    
    log "HEADER" ""
    log "HEADER" "🚀 DEPLOYMENT SUMMARY"
    log "HEADER" "=========================================="
    log "INFO" "Environment:    $DEPLOY_ENV"
    log "INFO" "Duration:       $total_time"
    log "INFO" "Timestamp:      $(date '+%Y-%m-%d %H:%M:%S')"
    log "INFO" "Deployed by:    $(whoami)@$(hostname)"
    log "INFO" "Log file:       $LOG_FILE"
    
    if [[ -n "$PREV_DEPLOYMENT_HASH" ]]; then
        log "INFO" "Git commit:     $PREV_DEPLOYMENT_HASH"
    fi
    
    if [[ -d "$BACKUP_DIR" ]]; then
        log "INFO" "Backup location: $BACKUP_DIR"
    fi
    
    log "HEADER" ""
    log "SUCCESS" "✅ DEPLOYMENT COMPLETED SUCCESSFULLY"
    log "HEADER" "=========================================="
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup_logging
    
    log "HEADER" "🔒 Djezzy National SOC Platform - Deployment"
    log "INFO" "Starting deployment to '$DEPLOY_ENV' environment"
    log "INFO" "Project root: $PROJECT_ROOT"
    log "INFO" "Dry run: $DRY_RUN"
    
    # Execute deployment steps
    preflight_checks
    run_pre_deploy_checks
    create_backup
    run_migrations
    build_application
    restart_service
    health_check
    
    # Success!
    print_summary
    
    # Disable error trap on success
    trap - EXIT
    exit 0
}

# Run main function
main
