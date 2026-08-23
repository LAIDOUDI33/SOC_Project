#!/usr/bin/env bash
# ============================================================================
# Djezzy National SOC Platform - Production Health Check Script
#
# Comprehensive health monitoring for production deployments:
# - Tests /api/incidents/health endpoint
# - Tests /api/threats/health endpoint (if exists)
# - Tests /api/stream/health endpoint
# - Checks response times (<500ms threshold)
# - Reports overall system health status
#
# Usage: ./health-check.sh [options]
#
# Options:
#   --url BASE_URL      Base URL to check (default: http://localhost:3000)
#   --timeout SECONDS   Request timeout in seconds (default: 10)
#   --threshold MS      Response time threshold (default: 500ms)
#   --retries N         Number of retries on failure (default: 3)
#   --json              Output results in JSON format
#   --quiet             Only output final result
#   --all-checks        Run all available health checks
#
# Exit codes:
#   0 - System is healthy
#   1 - System is degraded (some checks failed/warning)
#   2 - System is down (critical failures)
#
# @version 2.0.0
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default configuration
BASE_URL="${HEALTH_CHECK_URL:-http://localhost:3000}"
REQUEST_TIMEOUT=10
RESPONSE_THRESHOLD_MS=500
MAX_RETRIES=3
RETRY_DELAY=2

# Output options
JSON_OUTPUT=false
QUIET_MODE=false
RUN_ALL_CHECKS=false

# Health check endpoints to test
declare -a HEALTH_ENDPOINTS=(
    "/api/incidents/health"
    "/api/stream/health"
)

# Additional optional endpoints
declare -a OPTIONAL_ENDPOINTS=(
    "/api/threats/health"
    "/api/health"
    "/api/system"
)

# Results tracking
declare -A CHECK_RESULTS=()
declare -A CHECK_LATENCIES=()
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0
OVERALL_STATUS="healthy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)       BASE_URL="$2"; shift 2 ;;
        --timeout)   REQUEST_TIMEOUT="$2"; shift 2 ;;
        --threshold) RESPONSE_THRESHOLD_MS="$2"; shift 2 ;;
        --retries)   MAX_RETRIES="$2"; shift 2 ;;
        --json)      JSON_OUTPUT=true; shift ;;
        --quiet)     QUIET_MODE=true; shift ;;
        --all-checks) RUN_ALL_CHECKS=true; shift ;;
        *)           echo "Unknown option: $1"; exit 2 ;;
    esac
done

# ============================================================================
# Utility Functions
# ============================================================================

log() {
    local level=$1
    shift
    local message=$*
    
    if [[ "$QUIET_MODE" == "true" && "$level" != "ERROR" && "$level" != "RESULT" ]]; then
        return
    fi
    
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        return  # Suppress normal output in JSON mode
    fi
    
    case $level in
        INFO)    echo -e "${CYAN}[INFO]${NC}    $message" ;;
        SUCCESS) echo -e "${GREEN}[PASS]${NC}    $message" ;;
        WARN)    echo -e "${YELLOW}[WARN]${NC}    $message" ;;
        ERROR)   echo -e "${RED}[FAIL]${NC}    $message" ;;
        RESULT)  echo -e "${BOLD}$message${NC}" ;;
        HEADER)  echo -e "\n${BOLD}$message${NC}" ;;
        *)       echo "[$level] $message" ;;
    esac
}

get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S %Z'
}

format_duration_ms() {
    local ms=$1
    if [[ $ms -lt 1000 ]]; then
        echo "${ms}ms"
    else
        local secs=$(( ms / 1000 ))
        local remaining_ms=$(( ms % 1000 ))
        printf "%d.%03ds" $secs $remaining_ms
    fi
}

# ============================================================================
# HTTP Health Check Function
# ============================================================================

check_endpoint() {
    local endpoint=$1
    local url="${BASE_URL}${endpoint}"
    local check_name=$(echo "$endpoint" | sed 's|^/api/||' | sed 's|/health||' | tr '/' '_')
    
    log "INFO" "Checking: $url"
    
    local response_time_start=$(date +%s%N 2>/dev/null || date +%s)
    local http_code=""
    local response_body=""
    local curl_exit_code=0
    
    # Execute HTTP request with timeout
    local curl_output
    curl_output=$(curl -sf \
        --connect-timeout "$REQUEST_TIMEOUT" \
        --max-time "$REQUEST_TIMEOUT" \
        -o /tmp/health_check_response_$$ \
        -w '%{http_code}|%{time_total}' \
        "$url" 2>/dev/null) || curl_exit_code=$?
    
    local response_time_end=$(date +%s%N 2>/dev/null || date +%s)
    
    # Parse results
    IFS='|' read -r http_code total_time <<< "$curl_output"
    
    # Calculate response time in milliseconds
    local response_time_ms=0
    if [[ -n "$total_time" ]]; then
        response_time_ms=$(echo "$total_time * 1000" | bc 2>/dev/null || echo "$(( ${response_time_end} - ${response_time_start} ) / 1000000 )")
    else
        response_time_ms=$(( (response_time_end - response_time_start) / 1000000 ))
    fi
    
    # Read response body
    if [[ -f /tmp/health_check_response_$$ ]]; then
        response_body=$(cat /tmp/health_check_response_$$ 2>/dev/null || echo "")
        rm -f /tmp/health_check_response_$$
    fi
    
    # Evaluate result
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CHECK_LATENCIES["$check_name"]="$response_time_ms"
    
    # Check for connection/curl errors
    if [[ $curl_exit_code -ne 0 ]]; then
        case $curl_exit_code in
            6)  error_msg="Could not resolve host" ;;
            7)  error_msg="Failed to connect" ;;
            28) error_msg="Request timed out (${REQUEST_TIMEOUT}s)" ;;
            *)  error_msg="Connection error (code: $curl_exit_code)" ;;
        esac
        
        CHECK_RESULTS["$check_name"]="FAILED"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log "ERROR" "$check_name: $error_msg"
        return 2
    fi
    
    # Check HTTP status code
    if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
        case $http_code in
            000) error_msg="No response (connection refused?)" ;;
            404) error_msg="Endpoint not found (404)" ;;
            500) error_msg="Server error (500)" ;;
            502) error_msg="Bad gateway (502)" ;;
            503) error_msg="Service unavailable (503)" ;;
            *)   error_msg="HTTP error ($http_code)" ;;
        esac
        
        # 404 might be expected for optional endpoints
        if [[ "$http_code" == "404" ]]; then
            CHECK_RESULTS["$check_name"]="SKIPPED"
            log "WARN" "$check_name: Endpoint not found (skipping)"
            return 0
        fi
        
        CHECK_RESULTS["$check_name"]="FAILED"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log "ERROR" "$check_name: $error_msg"
        return 2
    fi
    
    # Check response time threshold
    local formatted_time=$(format_duration_ms $response_time_ms)
    
    if [[ $response_time_ms -gt $RESPONSE_THRESHOLD_MS ]]; then
        CHECK_RESULTS["$check_name"]="WARNING"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        log "WARN" "$check_name: Slow response (${formatted_time}, threshold: $(format_duration_ms $RESPONSE_THRESHOLD_MS))"
        return 1
    fi
    
    # Parse and validate JSON response
    local status_field=""
    if command -v jq &>/dev/null && [[ -n "$response_body" ]]; then
        status_field=$(echo "$response_body" | jq -r '.status // .health // empty' 2>/dev/null || echo "")
        
        case "$status_field" in
            healthy|ok|operational|connected)
                # All good
                ;;
            degraded|warning)
                CHECK_RESULTS["$check_name"]="WARNING"
                WARNING_CHECKS=$((WARNING_CHECKS + 1))
                log "WARN" "$check_name: Service reports degraded status (${formatted_time})"
                return 1
                ;;
            unhealthy|error|down|disconnected)
                CHECK_RESULTS["$check_name"]="FAILED"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                log "ERROR" "$check_name: Service reports unhealthy status (${formatted_time})"
                return 2
                ;;
        esac
    fi
    
    # Success!
    CHECK_RESULTS["$check_name"]="PASSED"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    log "SUCCESS" "$check_name: OK (${formatted_time})"
    return 0
}

# Retry logic for a single endpoint
check_endpoint_with_retry() {
    local endpoint=$1
    local attempt=1
    local result=2
    
    while [[ $attempt -le $MAX_RETRIES ]]; do
        if [[ $attempt -gt 1 ]]; then
            log "INFO" "Retry $attempt/$MAX_RETRIES for $endpoint..."
            sleep $RETRY_DELAY
        fi
        
        check_endpoint "$endpoint"
        result=$?
        
        if [[ $result -eq 0 ]]; then
            return 0
        fi
        
        attempt=$((attempt + 1))
    done
    
    return $result
}

# ============================================================================
# Additional System Checks
# ============================================================================

check_system_resources() {
    log "INFO" "Checking system resources..."
    
    # Memory usage
    local mem_percent=0
    if [[ -f /proc/meminfo ]]; then
        local mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        if [[ $mem_total -gt 0 ]]; then
            mem_percent=$(( (mem_total - mem_available) * 100 / mem_total ))
        fi
        
        if [[ $mem_percent -gt 90 ]]; then
            log "WARN" "Memory usage high: ${mem_percent}%"
            CHECK_RESULTS["memory"]="WARNING"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        elif [[ $mem_percent -gt 95 ]]; then
            log "ERROR" "Memory usage critical: ${mem_percent}%"
            CHECK_RESULTS["memory"]="FAILED"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            log "INFO" "Memory usage: ${mem_percent}%"
            CHECK_RESULTS["memory"]="PASSED"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    fi
    
    # Disk space
    local disk_percent=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    if [[ $disk_percent -gt 90 ]]; then
        log "WARN" "Disk usage high: ${disk_percent}%"
        CHECK_RESULTS["disk"]="WARNING"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
    elif [[ $disk_percent -gt 98 ]]; then
        log "ERROR" "Disk usage critical: ${disk_percent}%"
        CHECK_RESULTS["disk"]="FAILED"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    else
        log "INFO" "Disk usage: ${disk_percent}%"
        CHECK_RESULTS["disk"]="PASSED"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    # CPU load (1 min average)
    if [[ -f /proc/loadavg ]]; then
        local load_avg=$(awk '{print $1}' /proc/loadavg)
        local cpu_count=$(nproc 2>/dev/null || echo 1)
        local load_threshold=$(echo "$cpu_count * 1.5" | bc 2>/dev/null || echo 999)
        
        if (( $(echo "$load_avg > $load_threshold" | bc -l 2>/dev/null || echo 0) )); then
            log "WARN" "CPU load high: $load_avg (cores: $cpu_count)"
            CHECK_RESULTS["cpu"]="WARNING"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        else
            log "INFO" "CPU load: $load_avg (cores: $cpu_count)"
            CHECK_RESULTS["cpu"]="PASSED"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    fi
    
    # Process check - is Next.js running?
    if pgrep -f "next-server\|node.*server.js\|bun.*server.js" &>/dev/null; then
        log "INFO" "Next.js process running"
        CHECK_RESULTS["process"]="PASSED"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "ERROR" "Next.js process not found"
        CHECK_RESULTS["process"]="FAILED"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

check_port_connectivity() {
    log "INFO" "Checking port connectivity..."
    
    # Extract port from URL
    local port=$(echo "$BASE_URL" | sed -E 's|.*:([0-9]+).*|\1|')
    port=${port:-80}
    
    local host=$(echo "$BASE_URL" | sed -E 's|https?://([^:/]+).*|\1|')
    host=${host:-localhost}
    
    if command -v nc &>/dev/null; then
        if nc -z -w5 "$host" "$port" 2>/dev/null; then
            log "INFO" "Port $port is open on $host"
            CHECK_RESULTS["port"]="PASSED"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "ERROR" "Port $port is not reachable on $host"
            CHECK_RESULTS["port"]="FAILED"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    elif command -v bash &>/dev/null; then
        if timeout 5 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            log "INFO" "Port $port is open on $host"
            CHECK_RESULTS["port"]="PASSED"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "ERROR" "Port $port is not reachable on $host"
            CHECK_RESULTS["port"]="FAILED"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    else
        log "INFO" "Cannot test port (no nc or bash)"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

# ============================================================================
# Determine Overall Status
# ============================================================================

calculate_overall_status() {
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        OVERALL_STATUS="unhealthy"
        return 2
    elif [[ $WARNING_CHECKS -gt 0 ]]; then
        OVERALL_STATUS="degraded"
        return 1
    else
        OVERALL_STATUS="healthy"
        return 0
    fi
}

# ============================================================================
# Output Functions
# ============================================================================

print_summary() {
    local exit_code=0
    calculate_overall_status || exit_code=$?
    
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        print_json_results
        return $exit_code
    fi
    
    log "HEADER" ""
    log "HEADER" "=========================================="
    log "HEADER" "🏥 HEALTH CHECK SUMMARY"
    log "HEADER" "=========================================="
    log "INFO" "Timestamp:     $(get_timestamp)"
    log "INFO" "Target:        $BASE_URL"
    log "INFO" "Threshold:     $(format_duration_ms $RESPONSE_THRESHOLD_MS)"
    log "INFO" "Timeout:       ${REQUEST_TIMEOUT}s"
    log "INFO" ""
    log "INFO" "Total checks:  $TOTAL_CHECKS"
    log "INFO" "Passed:        $PASSED_CHECKS ✅"
    log "INFO" "Warnings:      $WARNING_CHECKS ⚠️"
    log "INFO" "Failed:        $FAILED_CHECKS ❌"
    
    # Detailed results
    log "HEADER" ""
    log "HEADER" "Detailed Results:"
    log "HEADER" "----------------------------------------"
    
    for check_name in "${!CHECK_RESULTS[@]}"; do
        local result="${CHECK_RESULTS[$check_name]}"
        local latency="${CHECK_LATENCIES[$check_name]:-N/A}"
        
        case $result in
            PASSED)
                log "SUCCESS" "✓ $check_name ($(format_duration_ms $latency))"
                ;;
            WARNING)
                log "WARN"    "⚠ $check_name ($(format_duration_ms $latency))"
                ;;
            FAILED)
                log "ERROR"   "✗ $check_name"
                ;;
            SKIPPED)
                log "INFO"    "○ $check_name (skipped)"
                ;;
        esac
    done
    
    # Final verdict
    log "HEADER" ""
    log "HEADER" "------------------------------------------"
    
    case $exit_code in
        0) 
            log "RESULT" "🟢 STATUS: HEALTHY"
            log "INFO" "All systems operational"
            ;;
        1) 
            log "RESULT" "🟡 STATUS: DEGRADED"
            log "INFO" "System operational with warnings"
            ;;
        2) 
            log "RESULT" "🔴 STATUS: UNHEALTHY"
            log "ERROR" "Immediate attention required!"
            ;;
    esac
    
    log "HEADER" "=========================================="
    
    return $exit_code
}

print_json_results() {
    calculate_overall_status > /dev/null || true
    
    # Build JSON object of all results
    local results_json="{"
    local first=true
    for check_name in "${!CHECK_RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            results_json+=","
        fi
        results_json+="\"$check_name\":{\"status\":\"${CHECK_RESULTS[$check_name]}\",\"latencyMs\":${CHECK_LATENCIES[$check_name]:-0}}"
    done
    results_json+="}"
    
    cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "overallStatus": "$OVERALL_STATUS",
    "target": "$BASE_URL",
    "thresholdMs": $RESPONSE_THRESHOLD_MS,
    "timeoutSeconds": $REQUEST_TIMEOUT,
    "summary": {
        "total": $TOTAL_CHECKS,
        "passed": $PASSED_CHECKS,
        "warnings": $WARNING_CHECKS,
        "failed": $FAILED_CHECKS
    },
    "checks": $results_json,
    "systemInfo": {
        "hostname": "$(hostname)",
        "platform": "$(uname -s)",
        "kernel": "$(uname -r)"
    }
}
EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    # Print header unless quiet mode
    if [[ "$QUIET_MODE" != "true" && "$JSON_OUTPUT" != "true" ]]; then
        echo ""
        log "HEADER" "🔍 SOC Platform Health Check"
        log "INFO" "Checking: $BASE_URL"
        log "INFO" "Threshold: $(format_duration_ms $RESPONSE_THRESHOLD_MS)"
    fi
    
    # Run API endpoint health checks
    log "HEADER" "--- API Endpoints ---"
    
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        check_endpoint_with_retry "$endpoint" || true
    done
    
    # Optional endpoints
    if [[ "$RUN_ALL_CHECKS" == "true" ]]; then
        log "HEADER" "--- Optional Endpoints ---"
        for endpoint in "${OPTIONAL_ENDPOINTS[@]}"; do
            check_endpoint_with_retry "$endpoint" || true
        done
    fi
    
    # System resource checks
    log "HEADER" "--- System Resources ---"
    check_system_resources
    check_port_connectivity
    
    # Print summary and exit
    print_summary
    exit $?
}

# Run main function
main
