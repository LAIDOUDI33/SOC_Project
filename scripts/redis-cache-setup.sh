#!/bin/bash
# ===========================================
# National SOC Platform - Redis Cache Setup
# Algeria 2026-2030 | Production Setup Script
# 
# This script:
# - Verifies Redis connectivity
# - Tests caching layer functionality
# - Validates rate limiting configuration
# - Monitors cache performance metrics
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  National SOC - Redis Caching Layer Setup${NC}"
echo -e "${BLUE}  Algeria 2026-2030 | High-Traffic Ready${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ===========================================
# Configuration
# ===========================================

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
APP_URL="${APP_URL:-http://localhost:3000}"

# ===========================================
# Functions
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_redis_cli() {
    if command -v redis-cli &> /dev/null; then
        return 0
    else
        return 1
    fi
}

test_redis_connection() {
    log_info "Testing Redis connection..."
    
    if [ -n "$REDIS_PASSWORD" ]; then
        REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD"
    else
        REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    fi
    
    # Test connection
    if PING_RESULT=$($REDIS_CMD ping 2>/dev/null); then
        if [ "$PING_RESULT" = "PONG" ]; then
            log_success "Redis connection successful"
            return 0
        else
            log_error "Redis returned unexpected response: $PING_RESULT"
            return 1
        fi
    else
        log_error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        return 1
    fi
}

test_cache_operations() {
    log_info "Testing basic cache operations..."
    
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    [ -n "$REDIS_PASSWORD" ] && REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD"
    
    # Test SET operation
    TEST_KEY="soc:test:connection"
    TEST_VALUE="$(date -Iseconds)"
    
    if $REDIS_CMD SET "$TEST_KEY" "$TEST_VALUE" EX 60 > /dev/null 2>&1; then
        log_success "Cache SET operation works"
    else
        log_error "Cache SET operation failed"
        return 1
    fi
    
    # Test GET operation
    RETRIEVED_VALUE=$($REDIS_CMD GET "$TEST_KEY" 2>/dev/null)
    if [ "$RETRIEVED_VALUE" = "$TEST_VALUE" ]; then
        log_success "Cache GET operation works"
    else
        log_error "Cache GET operation failed (expected: $TEST_VALUE, got: $RETRIEVED_VALUE)"
        return 1
    fi
    
    # Cleanup test key
    $REDIS_CMD DEL "$TEST_KEY" > /dev/null 2>&1
    
    return 0
}

test_rate_limiting() {
    log_info "Testing rate limiting setup..."
    
    # Check if rate limiter module exists
    if grep -q "rate-limiter" src/lib/rate-limiter.ts 2>/dev/null; then
        log_success "Rate limiter module exists"
        
        # Check configuration
        if grep -q "DEFAULT_RATE_LIMIT_TIERS" src/lib/rate-limiter.ts 2>/dev/null; then
            log_success "Rate limit tiers configured"
            
            # Display configured limits
            log_info "Configured rate limits:"
            grep -A2 "name:" src/lib/rate-limer.ts | head -20 || true
            
            return 0
        else
            log_warning "Rate limit tiers not found in configuration"
            return 1
        fi
    else
        log_error "Rate limiter module not found"
        return 1
    fi
}

verify_cached_endpoints() {
    log_info "Verifying cached API endpoints..."
    
    ENDPOINTS=(
        "/api/alerts/cached"
        "/api/incidents/cached"
        "/api/threats/cached"
        "/api/telecom/cached"
        "/api/dashboard"
        "/api/cache"
    )
    
    ALL_EXIST=true
    
    for endpoint in "${ENDPOINTS[@]}"; do
        if [ -f "src/app/api${endpoint}/route.ts" ] || \
           [ -f "src/app/api${endpoint%.cached}.ts" ]; then
            log_success "Endpoint exists: ${endpoint}"
        else
            log_warning "Endpoint missing: ${endpoint}"
            ALL_EXIST=false
        fi
    done
    
    if [ "$ALL_EXIST" = true ]; then
        return 0
    else
        return 1
    fi
}

check_redis_memory_config() {
    log_info "Checking Redis memory configuration..."
    
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    [ -n "$REDIS_PASSWORD" ] && REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD"
    
    # Get memory policy
    MEMORY_POLICY=$($REDIS_CMD CONFIG GET maxmemory-policy 2>/dev/null | tail -1)
    MAX_MEMORY=$($REDIS_CMD CONFIG GET maxmemory 2>/dev/null | tail -1)
    
    if [ -n "$MEMORY_POLICY" ]; then
        log_success "Memory policy: $MEMORY_POLICY"
    else
        log_warning "Memory policy not set (using default)"
    fi
    
    if [ -n "$MAX_MEMORY" ] && [ "$MAX_MEMORY" != "0" ]; then
        # Convert bytes to human readable
        if [ "$MAX_MEMORY" -gt 1073741824 ]; then
            MAX_MEMORY_HR=$(echo "scale=2; $MAX_MEMORY / 1073741824" | bc)GB
        elif [ "$MAX_MEMORY" -gt 1048576 ]; then
            MAX_MEMORY_HR=$(echo "scale=2; $MAX_MEMORY / 1048576" | bc)MB
        else
            MAX_MEMORY_HR="${MAX_MEMORY}B"
        fi
        log_success "Max memory: $MAX_MEMORY_HR"
    else
        log_warning "Max memory not limited (unbounded)"
    fi
}

display_cache_stats() {
    log_info "Current Redis cache statistics:"
    
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
    [ -n "$REDIS_PASSWORD" ] && REDIS_CMD="$REDIS_CMD -a $REDIS_PASSWORD"
    
    echo ""
    echo -e "${YELLOW}=== Redis Info ===${NC}"
    $REDIS_CMD INFO server 2>/dev/null | grep -E "(redis_version|uptime_in_seconds|connected_clients)" || true
    
    echo ""
    echo -e "${YELLOW}=== Memory Usage ===${NC}"
    $REDIS_CMD INFO memory 2>/dev/null | grep -E "(used_memory_human|used_memory_peak_human|mem_fragmentation_ratio)" || true
    
    echo ""
    echo -e "${YELLOW}=== Database Stats ===${NC}"
    DB_SIZE=$($REDIS_CMD DBSIZE 2>/dev/null)
    echo "Total keys: $DB_SIZE"
    
    echo ""
    echo -e "${YELLOW}=== SOC Cache Keys ===${NC}"
    $REDIS_CMD KEYS "soc:*" 2>/dev/null | head -10 || echo "No SOC keys found"
}

test_api_caching() {
    log_info "Testing API endpoint caching..."
    
    # Test dashboard KPI endpoint (most critical)
    DASHBOARD_RESPONSE=$(curl -s -w "\n%{http_code}" "$APP_URL/api/dashboard?type=kpi" 2>/dev/null || echo -e "\n000")
    HTTP_CODE=$(echo "$DASHBOARD_RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Dashboard API responding (HTTP $HTTP_CODE)"
        
        # Check for cache headers
        CACHE_HEADER=$(curl -sI "$APP_URL/api/dashboard?type=kpi" 2>/dev/null | grep -i "x-cache:" || true)
        if [ -n "$CACHE_HEADER" ]; then
            log_success "Cache headers present: $CACHE_HEADER"
        else
            log_warning "No X-Cache header found (endpoint may not be using cache)"
        fi
    else
        log_warning "Dashboard API returned HTTP $HTTP_CODE"
    fi
}

run_performance_test() {
    log_info "Running quick performance benchmark..."
    
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT --latency-history -i 100 2>/dev/null"
    
    # Simple latency test
    LATENCY=$($REDIS_CMD ping 2>/dev/null)
    
    if command -v bc &> /dev/null; then
        log_info "For detailed latency testing, run: redis-cli --latency-history -h $REDIS_HOST -p $REDIS_PORT"
    fi
}

generate_report() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Redis Caching Setup Report${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo "Redis Host: $REDIS_HOST:$REDIS_PORT"
    echo "App URL: $APP_URL"
    echo "Timestamp: $(date)"
    echo ""
    echo "Components Status:"
    echo "  - Redis Connection: $(test_redis_connection >/dev/null 2>&1 && echo '✓ OK' || echo '✗ FAILED')"
    echo "  - Cache Operations: $(test_cache_operations >/dev/null 2>&1 && echo '✓ OK' || echo '✗ FAILED')"
    echo "  - Rate Limiting: $(test_rate_limiting >/dev/null 2>&1 && echo '✓ OK' || echo '✗ FAILED')"
    echo "  - Cached Endpoints: $(verify_cached_endpoints >/dev/null 2>&1 && echo '✓ OK' || echo '✗ WARNING')"
    echo ""
    echo -e "${BLUE}============================================${NC}"
}

# ===========================================
# Main Execution
# ===========================================

main() {
    log_info "Starting Redis Caching Layer verification..."
    echo ""
    
    # Check prerequisites
    if ! check_redis_cli; then
        log_warning "redis-cli not found locally. Testing via Docker..."
        
        # Try Docker-based testing
        if docker compose ps redis &>/dev/null; then
            log_info "Using Docker Compose for Redis commands..."
            REDIS_CMD="docker compose exec -T redis redis-cli"
        else
            log_error "Docker Compose not running. Cannot verify Redis."
            exit 1
        fi
    fi
    
    # Run tests
    test_redis_connection
    echo ""
    
    test_cache_operations
    echo ""
    
    check_redis_memory_config
    echo ""
    
    test_rate_limiting
    echo ""
    
    verify_cached_endpoints
    echo ""
    
    # Optional: Display stats and test APIs (only if explicitly requested)
    if [ "${1:-}" = "--verbose" ] || [ "${1:-}" = "-v" ]; then
        display_cache_stats
        echo ""
        
        if [ "$APP_URL" != "" ]; then
            test_api_caching
            echo ""
        fi
    fi
    
    # Generate summary report
    generate_report
    
    log_success "Redis Caching Layer verification complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the application: npm run dev or docker compose up"
    echo "  2. Monitor cache performance: GET /api/cache?type=metrics"
    echo "  3. View cache status: GET /api/cache?type=overview"
    echo "  4. Invalidate caches: POST /api/cache/invalidate { category: 'alerts' }"
    echo ""
}

# Run main function with all arguments
main "$@"
