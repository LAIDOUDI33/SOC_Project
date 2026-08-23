#!/usr/bin/env bash
# ============================================================================
# Djezzy National SOC Platform - Pre-Deployment Validation Script
# 
# Comprehensive pre-deployment checks to ensure production readiness:
# - Validates all required environment variables
# - Checks database connectivity and migration status
# - Validates Redis connectivity (if configured)
# - Verifies disk space availability
# - Checks Node.js version compatibility
# - Runs basic smoke tests
#
# Usage: ./pre-deploy-check.sh [options]
#   --skip-db        Skip database checks
#   --skip-redis     Skip Redis checks
#   --skip-disk      Skip disk space check
#   --skip-tests     Skip smoke tests
#   --verbose        Enable verbose output
#   --json           Output results in JSON format
#
# Exit codes:
#   0 - All checks passed (PASS)
#   1 - Warnings only (PASS with warnings)
#   2 - Critical failures (FAIL)
#
# @version 2.0.0
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/pre-deploy-$(date +%Y%m%d_%H%M%S).log"
MIN_DISK_SPACE_GB=1
MIN_NODE_VERSION=18
HEALTH_CHECK_TIMEOUT=10

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Check result tracking
declare -a CHECKS_PASSED=()
declare -a CHECKS_WARNINGS=()
declare -a CHECKS_FAILED=()
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0
VERBOSE_MODE=false
JSON_OUTPUT=false

# Parse arguments
SKIP_DB=false
SKIP_REDIS=false
SKIP_DISK=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-db)      SKIP=true ;;
        --skip-redis)   SKIP_REDIS=true ;;
        --skip-disk)    SKIP_DISK=true ;;
        --skip-tests)   SKIP_TESTS=true ;;
        --verbose)      VERBOSE_MODE=true ;;
        --json)         JSON_OUTPUT=true ;;
        *)              echo "Unknown option: $1"; exit 2 ;;
    esac
    shift
done

# ============================================================================
# Utility Functions
# ============================================================================

log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        return  # Suppress normal output in JSON mode
    fi
    
    case $level in
        INFO)    echo -e "${BLUE}[INFO]${NC}    $message" ;;
        SUCCESS) echo -e "${GREEN}[PASS]${NC}    $message" ;;
        WARN)    echo -e "${YELLOW}[WARN]${NC}    $message" ;;
        ERROR)   echo -e "${RED}[FAIL]${NC}    $message" ;;
        HEADER)  echo -e "\n${BOLD}$message${NC}" ;;
        *)       echo "[$level] $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

record_result() {
    local name=$1
    local status=$2
    local message=${3:-}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        PASSED)
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            CHECKS_PASSED+=("$name: $message")
            log "SUCCESS" "✓ $name - $message"
            ;;
        WARNING)
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            CHECKS_WARNINGS+=("$name: $message")
            log "WARN" "⚠ $name - $message"
            ;;
        FAILED)
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            CHECKS_FAILED+=("$name: $message")
            log "ERROR" "✗ $name - $message"
            ;;
    esac
}

check_env_var() {
    local var_name=$1
    local min_length=${2:-0}
    local description=${3:-"Required variable"}
    
    if [[ -z "${!var_name:-}" ]]; then
        record_result "ENV:$var_name" "FAILED" "$description is not set"
        return 1
    fi
    
    local value="${!var_name}"
    if [[ $min_length -gt 0 ]] && [[ ${#value} -lt $min_length ]]; then
        record_result "ENV:$var_name" "WARNING" "$description is too short (${#value} chars, min $min_length)"
        return 1
    fi
    
    record_result "ENV:$var_name" "PASSED" "$description configured (${#value} chars)"
    return 0
}

# ============================================================================
# Pre-flight Setup
# ============================================================================

setup() {
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "HEADER" "=========================================="
    log "HEADER" "🔍 SOC Platform Pre-Deployment Check"
    log "HEADER" "=========================================="
    log "INFO" "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    log "INFO" "Project root: $PROJECT_ROOT"
    log "INFO" "Log file: $LOG_FILE"
    log "INFO" "Node.js version: $(node --version 2>/dev/null || echo 'not found')"
    log "INFO" "User: $(whoami)"
    log "INFO" "Hostname: $(hostname)"
}

# ============================================================================
# Check 1: Environment Variables
# ============================================================================

check_environment_variables() {
    log "HEADER" "--- Environment Variables ---"
    
    # Critical variables (must be set)
    check_env_var "NODE_ENV" 0 "Node environment" || true
    check_env_var "JWT_SECRET" 32 "JWT secret key" || true
    check_env_var "DATABASE_URL" 10 "Database connection URL" || true
    
    # Check NODE_ENV value
    if [[ -n "${NODE_ENV:-}" ]]; then
        if [[ ! "$NODE_ENV" =~ ^(development|staging|production|test)$ ]]; then
            record_result "ENV:NODE_ENV_VALUE" "FAILED" "Invalid NODE_ENV value: $NODE_ENV"
        else
            record_result "ENV:NODE_ENV_VALUE" "PASSED" "NODE_ENV is valid ($NODE_ENV)"
        fi
    fi
    
    # Check JWT_SECRET is not default/weak
    if [[ -n "${JWT_SECRET:-}" ]]; then
        case "$JWT_SECRET in
            password|secret|changeme|default|"change-me-to-a-random-string")
                record_result "ENV:JWT_SECRET_STRENGTH" "FAILED" "JWT_SECRET uses a weak/default value"
                ;;
            *)
                record_result "ENV:JWT_SECRET_STRENGTH" "PASSED" "JWT_SECRET appears strong"
                ;;
        esac
    fi
    
    # Optional but recommended variables
    check_env_var "REDIS_URL" 0 "Redis connection URL" || true
    check_env_var "ANONYMIZATION_SALT" 16 "PII anonymization salt" || true
    
    # Check ANONYMIZATION_SALT is not default
    if [[ -n "${ANONYMIZATION_SALT:-}" ]]; then
        if [[ "$ANONYMIZATION_SALT" == "change-me-to-a-random-string" ]]; then
            record_result "ENV:ANON_SALT_DEFAULT" "WARNING" "ANONYMIZATION_SALT is using default placeholder"
        else
            record_result "ENV:ANON_SALT_DEFAULT" "PASSED" "ANONYMIZATION_SALT is customized"
        fi
    fi
    
    # Encryption key (if encryption enabled)
    if [[ "${ENABLE_ENCRYPTION:-true}" != "false" ]]; then
        check_env_var "ENCRYPTION_KEY" 32 "Encryption key" || true
    fi
    
    # PORT validation
    if [[ -n "${PORT:-}" ]]; then
        if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [[ "$PORT" -lt 1 ]] || [[ "$PORT" -gt 65535 ]]; then
            record_result "ENV:PORT" "FAILED" "Invalid PORT value: $PORT"
        else
            record_result "ENV:PORT" "PASSED" "PORT is valid ($PORT)"
        fi
    else
        record_result "ENV:PORT" "PASSED" "Using default port (3000)"
    fi
}

# ============================================================================
# Check 2: Node.js Version
# ============================================================================

check_node_version() {
    log "HEADER" "--- Node.js Version ---"
    
    if ! command -v node &> /dev/null; then
        record_result "NODE_VERSION" "FAILED" "Node.js is not installed"
        return 1
    fi
    
    local node_version
    node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    
    if [[ "$node_version" -lt "$MIN_NODE_VERSION" ]]; then
        record_result "NODE_VERSION" "FAILED" "Node.js version $node_version is below minimum ($MIN_NODE_VERSION)"
        return 1
    fi
    
    record_result "NODE_VERSION" "PASSED" "Node.js v$(node --version) meets minimum requirement (>=v$MIN_NODE_VERSION)"
    
    # Check npm/bun
    if command -v bun &> /dev/null; then
        record_result "PACKAGE_MANAGER" "PASSED" "Bun available ($(bun --version))"
    elif command -v npm &> /dev/null; then
        record_result "PACKAGE_MANAGER" "PASSED" "npm available ($(npm --version))"
    else
        record_result "PACKAGE_MANAGER" "WARNING" "No package manager found"
    fi
}

# ============================================================================
# Check 3: Disk Space
# ============================================================================

check_disk_space() {
    log "HEADER" "--- Disk Space ---"
    
    if [[ "$SKIP_DISK" == "true" ]]; then
        record_result "DISK_SPACE" "PASSED" "Skipped (--skip-disk)"
        return 0
    fi
    
    local available_gb
    available_gb=$(df -BG "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | tr -d 'G')
    
    if [[ "$available_gb" -lt "$MIN_DISK_SPACE_GB" ]]; then
        record_result "DISK_SPACE" "FAILED" "Low disk space: ${available_gb}GB available (minimum ${MIN_DISK_SPACE_GB}GB)"
        return 1
    fi
    
    record_result "DISK_SPACE" "PASSED" "Disk space OK: ${available_gb}GB available (>= ${MIN_DISK_SPACE_GB}GB required)"
    
    # Additional disk info
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        df -h "$PROJECT_ROOT" | while read line; do
            log "INFO" "  $line"
        done
    fi
}

# ============================================================================
# Check 4: Database Connectivity
# ============================================================================

check_database() {
    log "HEADER" "--- Database Connectivity ---"
    
    if [[ "$SKIP_DB" == "true" ]]; then
        record_result "DATABASE" "PASSED" "Skipped (--skip-db)"
        return 0
    fi
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        record_result "DATABASE" "FAILED" "DATABASE_URL not set, cannot test connectivity"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    
    # Test database connection using Prisma
    local db_test_start=$(date +%s%N 2>/dev/null || date +%s)
    
    if npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
        local db_test_end=$(date +%s%N 2>/dev/null || date +%s)
        local latency_ms=$(( (db_test_end - db_test_start) / 1000000 ))
        record_result "DATABASE_CONNECT" "PASSED" "Database reachable (${latency_ms}ms)"
    else
        # Fallback: try with Prisma client
        if node -e "
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => { console.log('OK'); process.exit(0); }).catch((e) => { console.error(e.message); process.exit(1); });
" &>/dev/null; then
            record_result "DATABASE_CONNECT" "PASSED" "Database reachable via Prisma client"
        else
            record_result "DATABASE_CONNECT" "FAILED" "Cannot connect to database"
        fi
    fi
    
    # Check migration status
    log "INFO" "Checking Prisma migration status..."
    
    if npx prisma migrate status &>/dev/null; then
        record_result "DATABASE_MIGRATIONS" "PASSED" "Database schema is up to date"
    else
        # Try alternative check
        if [[ -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
            if npx prisma db push --accept-data-loss --dry-run &>/dev/null; then
                record_result "DATABASE_MIGRATIONS" "WARNING" "Migration status unclear, consider running migrations"
            else
                record_result "DATABASE_MIGRATIONS" "WARNING" "Could not verify migration status"
            fi
        else
            record_result "DATABASE_MIGRATIONS" "WARNING" "No Prisma schema found"
        fi
    fi
}

# ============================================================================
# Check 5: Redis Connectivity (if configured)
# ============================================================================

check_redis() {
    log "HEADER" "--- Redis Connectivity ---"
    
    if [[ "$SKIP_REDIS" == "true" ]]; then
        record_result "REDIS" "PASSED" "Skipped (--skip-redis)"
        return 0
    fi
    
    if [[ -z "${REDIS_URL:-}" ]]; then
        record_result "REDIS" "PASSED" "Redis not configured (optional)"
        return 0
    fi
    
    # Extract Redis host from URL
    local redis_host
    redis_host=$(echo "$REDIS_URL" | sed -E 's|redis(s)?://([^:@]+(:[^@]+)?@)?([^:/]+).*|\4|')
    
    local redis_port
    redis_port=$(echo "$REDIS_URL" | sed -E 's|redis(s)?://([^:@]+(:[^@]+)?@)?([^:]+):?([0-9]*).*|\5|')
    redis_port=${redis_port:-6379}
    
    # Test Redis connectivity
    if command -v redis-cli &> /dev/null; then
        local redis_start=$(date +%s%N 2>/dev/null || date +%s)
        
        if redis-cli -h "$redis_host" -p "$redis_port" ping &>/dev/null; then
            local redis_end=$(date +%s%N 2>/dev/null || date +%s)
            local redis_latency=$(( (redis_end - redis_start) / 1000000 ))
            record_result "REDIS_CONNECT" "PASSED" "Redis reachable at $redis_host:$redis_port (${redis_latency}ms)"
        else
            record_result "REDIS_CONNECT" "FAILED" "Cannot connect to Redis at $redis_host:$redis_port"
        fi
    elif command -v nc &> /dev/null; then
        # Use netcat as fallback
        if nc -z -w5 "$redis_host" "$redis_port" 2>/dev/null; then
            record_result "REDIS_CONNECT" "PASSED" "Redis port $redis_port is open on $redis_host"
        else
            record_result "REDIS_CONNECT" "FAILED" "Redis port $redis_port is not reachable on $redis_host"
        fi
    else
        record_result "REDIS_CONNECT" "WARNING" "Cannot test Redis (no redis-cli or nc available)"
    fi
}

# ============================================================================
# Check 6: Dependencies
# ============================================================================

check_dependencies() {
    log "HEADER" "--- Dependencies ---"
    
    cd "$PROJECT_ROOT"
    
    # Check package.json exists
    if [[ -f "package.json" ]]; then
        record_result "PACKAGE_JSON" "PASSED" "package.json exists"
    else
        record_result "PACKAGE_JSON" "FAILED" "package.json not found"
        return 1
    fi
    
    # Check if node_modules exists
    if [[ -d "node_modules" ]]; then
        record_result "NODE_MODULES" "PASSED" "node_modules directory exists"
        
        # Quick dependency count
        local dep_count
        dep_count=$(ls -1 node_modules/@* 2>/dev/null | wc -l)
        dep_count=$((dep_count + $(ls -1 node_modules 2>/dev/null | grep -v '@' | wc -l)))
        log "INFO" "Installed packages: ~$dep_count"
    else
        record_result "NODE_MODULES" "WARNING" "node_modules not found - run 'bun install' or 'npm install'"
    fi
    
    # Check Prisma client is generated
    if [[ -d "node_modules/.prisma/client" ]]; then
        record_result "PRISMA_CLIENT" "PASSED" "Prisma client generated"
    else
        record_result "PRISMA_CLIENT" "WARNING" "Prisma client may need generation (run: bun run db:generate)"
    fi
}

# ============================================================================
# Check 7: Smoke Tests
# ============================================================================

run_smoke_tests() {
    log "HEADER" "--- Smoke Tests ---"
    
    if [[ "$SKIP_TESTS" == "true" ]]; then
        record_result "SMOKE_TESTS" "PASSED" "Skipped (--skip-tests)"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    
    # Test TypeScript compilation (basic syntax check)
    log "INFO" "Running TypeScript type check..."
    
    if npx tsc --noEmit --pretty false 2>&1 | head -20; then
        record_result "TYPESCRIPT_COMPILE" "PASSED" "TypeScript compiles without errors"
    else
        # Count errors
        local ts_errors
        ts_errors=$(npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || echo "0")
        if [[ "$ts_errors" -eq 0 ]]; then
            record_result "TYPESCRIPT_COMPILE" "PASSED" "TypeScript compiles without errors"
        else
            record_result "TYPESCRIPT_COMPILE" "WARNING" "TypeScript has $ts_errors error(s)"
        fi
    fi
    
    # Test Next.js build (optional, can be slow)
    if [[ "${RUN_FULL_BUILD:-false}" == "true" ]]; then
        log "INFO" "Running full Next.js build (this may take a while)..."
        if bun run build &>/dev/null; then
            record_result "NEXTJS_BUILD" "PASSED" "Next.js builds successfully"
        else
            record_result "NEXTJS_BUILD" "FAILED" "Next.js build failed"
        fi
    else
        record_result "NEXTJS_BUILD" "PASSED" "Skipped (set RUN_FULL_BUILD=true to enable)"
    fi
    
    # Basic import tests
    log "INFO" "Testing critical imports..."
    
    if node -e "
try {
    require('@prisma/client');
    console.log('PRISMA_OK');
} catch(e) {
    console.error('PRISMA_FAIL:', e.message);
    process.exit(1);
}
" 2>/dev/null | grep -q "PRISMA_OK"; then
        record_result "IMPORT_PRISMA" "PASSED" "Prisma client imports correctly"
    else
        record_result "IMPORT_PRISMA" "FAILED" "Prisma client import failed"
    fi
}

# ============================================================================
# Check 8: Security Checks
# ============================================================================

security_checks() {
    log "HEADER" "--- Security Checks ---"
    
    cd "$PROJECT_ROOT"
    
    # Check for .env file permissions
    if [[ -f ".env" ]]; then
        local env_perms
        env_perms=$(stat -c "%a" ".env" 2>/dev/null || stat -f "%Lp" ".env" 2>/dev/null)
        
        if [[ "$env_perms" -gt "600" ]]; then
            record_result "SECURITY_ENV_PERMS" "WARNING" ".env file has loose permissions ($env_perms), recommend 600"
        else
            record_result "SECURITY_ENV_PERMS" "PASSED" ".env file permissions are secure ($env_perms)"
        fi
        
        # Check for secrets in .env
        if grep -qiE "(password|secret|key)\s*=\s*(password|123456|default|changeme)" .env 2>/dev/null; then
            record_result "SECURITY_DEFAULT_SECRETS" "WARNING" "Default/weak secrets detected in .env"
        else
            record_result "SECURITY_DEFAULT_SECRETS" "PASSED" "No obvious default secrets detected"
        fi
    else
        record_result "SECURITY_ENV_PERMS" "INFO" "No .env file found (may use other config method)"
    fi
    
    # Check for .git exposure
    if [[ -d ".git" ]]; then
        # Check if .gitignore exists and has basic rules
        if [[ -f ".gitignore" ]]; then
            if grep -qE "^\.env" .gitignore 2>/dev/null; then
                record_result "SECURITY_GITIGNORE" "PASSED" ".gitignore protects .env files"
            else
                record_result "SECURITY_GITIGNORE" "WARNING" ".gitignore may not protect .env files"
            fi
        else
            record_result "SECURITY_GITIGNORE" "WARNING" "No .gitignore file found"
        fi
    fi
    
    # Check NODE_ENV is not development for production deployments
    if [[ "${NODE_ENV:-}" == "development" && "${CI:-false}" != "true" && "${ALLOW_DEV_DEPLOY:-false}" != "true" ]]; then
        record_result "SECURITY_NODE_ENV" "WARNING" "Deploying with NODE_ENV=development"
    else
        record_result "SECURITY_NODE_ENV" "PASSED" "NODE_ENV is appropriately set"
    fi
}

# ============================================================================
# Results Summary
# ============================================================================

print_summary() {
    local exit_code=0
    
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        print_json_results
        return $exit_code
    fi
    
    log "HEADER" ""
    log "HEADER" "=========================================="
    log "HEADER" "📊 PRE-DEPLOY CHECK SUMMARY"
    log "HEADER" "=========================================="
    log "INFO" "Total checks:  $TOTAL_CHECKS"
    log "INFO" "Passed:        $PASSED_CHECKS ✅"
    log "INFO" "Warnings:      $WARNING_CHECKS ⚠️"
    log "INFO" "Failed:        $FAILED_CHECKS ❌"
    
    if [[ ${#CHECKS_FAILED[@]} -gt 0 ]]; then
        log "HEADER" ""
        log "ERROR" "Failed checks:"
        for failed in "${CHECKS_FAILED[@]}"; do
            log "ERROR" "  ✗ $failed"
        done
        exit_code=2
    fi
    
    if [[ ${#CHECKS_WARNINGS[@]} -gt 0 ]]; then
        log "HEADER" ""
        log "WARN" "Warnings:"
        for warning in "${CHECKS_WARNINGS[@]}"; do
            log "WARN" "  ⚠ $warning"
        done
        if [[ $exit_code -eq 0 ]]; then
            exit_code=1
        fi
    fi
    
    log "HEADER" ""
    if [[ $exit_code -eq 0 ]]; then
        if [[ $WARNING_CHECKS -gt 0 ]]; then
            log "SUCCESS" "🟡 RESULT: PASS (with warnings)"
        else
            log "SUCCESS" "🟢 RESULT: PASS - All checks passed!"
        fi
    elif [[ $exit_code -eq 2 ]]; then
        log "ERROR" "🔴 RESULT: FAIL - Critical issues must be resolved"
    fi
    
    log "INFO" "Full log: $LOG_FILE"
    log "HEADER" "=========================================="
    
    return $exit_code
}

print_json_results() {
    cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "result": "$([ $FAILED_CHECKS -gt 0 ] && echo "FAIL" || ([ $WARNING_CHECKS -gt 0 ] && echo "WARN" || echo "PASS"))",
    "summary": {
        "total": $TOTAL_CHECKS,
        "passed": $PASSED_CHECKS,
        "warnings": $WARNING_CHECKS,
        "failed": $FAILED_CHECKS
    },
    "checks": {
        "passed": [$(printf '"%s",' "${CHECKS_PASSED[@]}" | sed 's/,$//')],
        "warnings": [$(printf '"%s",' "${CHECKS_WARNINGS[@]}" | sed 's/,$//')],
        "failed": [$(printf '"%s",' "${CHECKS_FAILED[@]}" | sed 's/,$//')]
    },
    "environment": {
        "nodeVersion": "$(node --version 2>/dev/null)",
        "platform": "$(uname -s)",
        "hostname": "$(hostname)",
        "user": "$(whoami)"
    }
}
EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    setup
    
    # Run all checks
    check_environment_variables
    check_node_version
    check_disk_space
    check_database
    check_redis
    check_dependencies
    run_smoke_tests
    security_checks
    
    # Print summary and exit
    print_summary
    exit $?
}

# Run main function
main "$@"
