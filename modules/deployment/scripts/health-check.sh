#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - System Health Check Script
# Module 9: Production Deployment Scripts
#
# Usage:
#   ./health-check.sh [options]
#
# Options:
#   --quick           Quick check (essential services only)
#   --full            Full comprehensive check
#   --json            Output in JSON format
#   --services SVC    Check specific services only
#   --wait            Wait for services to become healthy
#   --timeout SECS    Timeout for wait mode (default: 300)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker/docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default values
MODE="full"
OUTPUT_FORMAT="text"
SPECIFIC_SERVICES=""
WAIT_MODE=false
TIMEOUT=300

# Service definitions with health check endpoints
declare -A SERVICE_PORTS=(
    ["postgres"]="5432"
    ["redis"]="6379"
    ["nginx"]="80"
    ["elasticsearch"]="9200"
    ["kibana"]="5601"
    ["grafana"]="3000"
    ["prometheus"]="9090"
    ["alertmanager"]="9093"
    ["wazuh-manager"]="55000"
    ["suricata"]=""
    ["misp"]="8081"
    ["thehive"]="9000"
    ["cortex"]="9001"
    ["minio"]="9000"
    ["rabbitmq"]="5672"
    ["keycloak"]="8080"
    ["api-gateway"]="4000"
    ["frontend"]="3000"
)

declare -A SERVICE_CATEGORIES=(
    ["postgres"]="database"
    ["redis"]="cache"
    ["nginx"]="proxy"
    ["elasticsearch"]="search"
    ["kibana"]="visualization"
    ["grafana"]="monitoring"
    ["prometheus"]="metrics"
    ["alertmanager"]="alerts"
    ["wazuh-manager"]="siem"
    ["suricata"]="ids-ips"
    ["misp"]="threat-intel"
    ["thehive"]="soar"
    ["cortex"]="analysis"
    ["minio"]="storage"
    ["rabbitmq"]="messaging"
    ["keycloak"]="identity"
    ["api-gateway"]="api"
    ["frontend"]="web"
)

declare -A CRITICAL_SERVICES=(
    ["postgres"]=true
    ["redis"]=true
    ["nginx"]=true
    ["elasticsearch"]=true
    ["wazuh-manager"]=true
)

# Health status tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNED_CHECKS=0
declare -a CHECK_RESULTS=()

# =============================================================================
# Utility Functions
# =============================================================================

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_debug() { [[ "${VERBOSE:-false}" == "true" ]] && echo -e "${BLUE}[DEBUG]${NC} $*"; }

show_banner() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║     National SOC Platform - System Health Check            ║
║     Algeria (2026-2030)                                    ║
╚═══════════════════════════════════════════════════════════╝
EOF
}

add_result() {
    local service="$1"
    local status="$2"
    local message="$3"
    
    ((TOTAL_CHECKS++)) || true
    
    case "${status}" in
        healthy) ((PASSED_CHECKS++)) ;;
        unhealthy) ((FAILED_CHECKS++)) ;;
        degraded) ((WARNED_CHECKS++)) ;;
    esac
    
    CHECK_RESULTS+=("${service}|${status}|${message}")
}

print_result() {
    local service="$1"
    local status="$2"
    local message="$3"
    
    local icon color
    case "${status}" in
        healthy)  icon="✓"; color="${GREEN}" ;;
        unhealthy) icon="✗"; color="${RED}" ;;
        degraded)  icon="!"; color="${YELLOW}" ;;
        *)         icon="?"; color="${CYAN}" ;;
    esac
    
    if [[ "${OUTPUT_FORMAT}" == "json" ]]; then
        return
    fi
    
    printf "  ${color}%-4s${NC} %-20s %s\n" "${icon}" "${service}" "${message}"
}

check_service_health() {
    local service="$1"
    local port="${SERVICE_PORTS[$service]:-}"
    local category="${SERVICE_CATEGORIES[$service]:-unknown}"
    
    # Skip if specific services requested and this isn't one of them
    if [[ -n "${SPECIFIC_SERVICES}" ]]; then
        if ! echo "${SPECIFIC_SERVICES}" | grep -qE "(^|,)${service}(,|$)"; then
            return 0
        fi
    fi
    
    # Quick mode: only check critical services
    if [[ "${MODE}" == "quick" ]] && [[ "${CRITICAL_SERVICES[$service]:-false}" != "true" ]]; then
        return 0
    fi
    
    log_debug "Checking ${service}..."
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^soc-${service}$" 2>/dev/null; then
        add_result "${service}" "unhealthy" "Container not running"
        print_result "${service}" "unhealthy" "Container not running"
        return 1
    fi
    
    # Port-based health check
    if [[ -n "${port}" ]]; then
        if timeout 5 bash -c "echo >/dev/tcp/localhost/${port}" 2>/dev/null; then
            add_result "${service}" "healthy" "Listening on port ${port}"
            print_result "${service}" "healthy" "Port ${port} open"
        else
            add_result "${service}" "unhealthy" "Not responding on port ${port}"
            print_result "${service}" "unhealthy" "Port ${port} not responding"
            return 1
        fi
    else
        # For services without standard ports, just check container status
        local container_status
        container_status=$(docker inspect --format='{{.State.Status}}' "soc-${service}" 2>/dev/null)
        
        if [[ "${container_status}" == "running" ]]; then
            add_result "${service}" "healthy" "Container running"
            print_result "${service}" "healthy" "Container running"
        else
            add_result "${service}" "unhealthy" "Container status: ${container_status}"
            print_result "${service}" "unhealthy" "Status: ${container_status}"
            return 1
        fi
    fi
    
    return 0
}

# =============================================================================
# System Resource Checks
# =============================================================================

check_system_resources() {
    echo ""
    echo "--- System Resources ---"
    
    # Memory check
    local mem_total mem_used mem_percent
    mem_total=$(free -g | awk '/Mem:/ {print $2}')
    mem_used=$(free -g | awk '/Mem:/ {print $3}')
    mem_percent=$(free | awk '/Mem:/ {printf "%.0f", ($3/$2)*100}')
    
    if [[ ${mem_percent} -gt 90 ]]; then
        add_result "memory" "degraded" "Memory usage at ${mem_percent}% (${mem_used}/${mem_total}GB)"
        print_result "memory" "degraded" "Usage: ${mem_percent}% (${mem_used}/${mem_total}GB)"
    elif [[ ${mem_percent} -gt 80 ]]; then
        add_result "memory" "degraded" "Memory usage at ${mem_percent}% (${mem_used}/${mem_total}GB)"
        print_result "memory" "degraded" "Usage: ${mem_percent}% (${mem_used}/${mem_total}GB)"
    else
        add_result "memory" "healthy" "Memory usage at ${mem_percent}% (${mem_used}/${mem_total}GB)"
        print_result "memory" "healthy" "Usage: ${mem_percent}% (${mem_used}/${mem_total}GB)"
    fi
    
    # Disk space check
    local disk_total disk_used disk_percent
    disk_total=$(df -h / | awk 'NR==2 {print $2}')
    disk_used=$(df -h / | awk 'NR==2 {print $3}')
    disk_percent=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
    
    if [[ ${disk_percent} -gt 90 ]]; then
        add_result "disk" "unhealthy" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
        print_result "disk" "unhealthy" "Usage: ${disk_percent}% (${disk_used}/${disk_total})"
    elif [[ ${disk_percent} -gt 80 ]]; then
        add_result "disk" "degraded" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
        print_result "disk" "degraded" "Usage: ${disk_percent}% (${disk_used}/${disk_total})"
    else
        add_result "disk" "healthy" "Disk usage at ${disk_percent}% (${disk_used}/${disk_total})"
        print_result "disk" "healthy" "Usage: ${disk_percent}% (${disk_used}/${disk_total})"
    fi
    
    # CPU load check
    local load_avg cpu_count load_status
    load_avg=$(cat /proc/loadavg | awk '{print $1,$2,$3}')
    cpu_count=$(nproc)
    load_1min=$(echo "${load_avg}" | awk '{print $1}')
    load_status=$(awk "BEGIN {printf \"%.0f\", (${load_1min} / ${cpu_count}) * 100}")
    
    if [[ ${load_status%.*} -gt 90 ]]; then
        add_result "cpu" "degraded" "Load average: ${load_avg} (CPUs: ${cpu_count})"
        print_result "cpu" "degraded" "Load: ${load_avg} (CPUs: ${cpu_count})"
    else
        add_result "cpu" "healthy" "Load average: ${load_avg} (CPUs: ${cpu_count})"
        print_result "cpu" "healthy" "Load: ${load_avg} (CPUs: ${cpu_count})"
    fi
    
    # Docker daemon check
    if docker info &>/dev/null; then
        add_result "docker" "healthy" "Docker daemon running"
        print_result "docker" "healthy" "Docker daemon responsive"
    else
        add_result "docker" "unhealthy" "Docker daemon not responding"
        print_result "docker" "unhealthy" "Docker daemon not responding"
    fi
}

# =============================================================================
# Service Health Checks
# =============================================================================

check_all_services() {
    echo ""
    echo "--- Service Health ---"
    
    # Core infrastructure
    check_service_health "postgres"
    check_service_health "redis"
    check_service_health "nginx"
    
    # Security tools
    check_service_health "wazuh-manager"
    check_service_health "suricata"
    check_service_health "misp"
    check_service_health "thehive"
    check_service_health "cortex"
    
    # Observability
    check_service_health "elasticsearch"
    check_service_health "kibana"
    check_service_health "grafana"
    check_service_health "prometheus"
    check_service_health "alertmanager"
    
    # Storage and messaging
    check_service_health "minio"
    check_service_health "rabbitmq"
    check_service_health "keycloak"
    
    # Application
    check_service_health "api-gateway"
    check_service_health "frontend"
}

# =============================================================================
# Connectivity Checks
# =============================================================================

check_connectivity() {
    echo ""
    echo "--- Connectivity ---"
    
    # Internal network connectivity
    local services_to_check=("postgres:5432" "redis:6379" "elasticsearch:9200")
    
    for svc_port in "${services_to_check[@]}"; do
        local svc="${svc_port%%:*}"
        local port="${svc_port##*:}"
        
        if docker exec "soc-${svc}" true 2>/dev/null; then
            add_result "connect:${svc}" "healthy" "Container accessible"
            print_result "connect:${svc}" "healthy" "Can exec into ${svc}"
        else
            add_result "connect:${svc}" "degraded" "Cannot exec into container"
            print_result "connect:${svc}" "degraded" "Cannot exec into ${svc}"
        fi
    done
    
    # External connectivity (DNS resolution)
    if timeout 5 ping -c 1 8.8.8.8 &>/dev/null; then
        add_result "internet" "healthy" "External connectivity OK"
        print_result "internet" "healthy" "External network reachable"
    else
        add_result "internet" "degraded" "No external connectivity"
        print_result "internet" "degraded" "No external connectivity (may be intentional)"
    fi
}

# =============================================================================
# Database-Specific Checks
# =============================================================================

check_databases() {
    echo ""
    echo "--- Database Status ---"
    
    # PostgreSQL
    if docker exec soc-postgres pg_isready -U soc_admin &>/dev/null; then
        local db_connections db_size
        db_connections=$(docker exec soc-postgres psql -U soc_admin -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
        db_size=$(docker exec soc-postgres psql -U soc_admin -t -c "SELECT pg_size_pretty(pg_database_size('soc_platform'));" 2>/dev/null | tr -d ' ')
        
        add_result "postgres:status" "healthy" "${db_connections} active connections, size: ${db_size}"
        print_result "postgres:status" "healthy" "Connections: ${db_connections}, Size: ${db_size}"
    else
        add_result "postgres:status" "unhealthy" "PostgreSQL not accepting connections"
        print_result "postgres:status" "unhealthy" "Not accepting connections"
    fi
    
    # Redis
    local redis_status redis_memory
    redis_status=$(docker exec soc-redis redis-cli -a "${REDIS_PASSWORD:-}" ping 2>/dev/null)
    redis_memory=$(docker exec soc-redis redis-cli -a "${REDIS_PASSWORD:-}" info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    
    if [[ "${redis_status}" == "PONG" ]]; then
        add_result "redis:status" "healthy" "Responding, memory: ${redis_memory}"
        print_result "redis:status" "healthy" "PONG, Memory: ${redis_memory}"
    else
        add_result "redis:status" "unhealthy" "Redis not responding"
        print_result "redis:status" "unhealthy" "Not responding"
    fi
    
    # Elasticsearch cluster health
    local es_health
    es_health=$(curl -sf http://localhost:9200/_cluster/health?pretty 2>/dev/null | grep '"status"' | head -1 | grep -oP '(?<=")\w+(?=")' || echo "unknown")
    
    case "${es_health}" in
        green)
            add_result "elasticsearch:cluster" "healthy" "Cluster status: GREEN"
            print_result "elasticsearch:cluster" "healthy" "Cluster: GREEN"
            ;;
        yellow)
            add_result "elasticsearch:cluster" "degraded" "Cluster status: YELLOW"
            print_result "elasticsearch:cluster" "degraded" "Cluster: YELLOW"
            ;;
        red)
            add_result "elasticsearch:cluster" "unhealthy" "Cluster status: RED"
            print_result "elasticsearch:cluster" "unhealthy" "Cluster: RED"
            ;;
        *)
            add_result "elasticsearch:cluster" "unhealthy" "Cannot reach Elasticsearch"
            print_result "elasticsearch:cluster" "unhealthy" "Unreachable"
            ;;
    esac
}

# =============================================================================
# Summary Output
# =============================================================================

print_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    local overall_status
    if [[ ${FAILED_CHECKS} -eq 0 ]] && [[ ${WARNED_CHECKS} -eq 0 ]]; then
        overall_status="HEALTHY"
        echo -e "  Overall Status: ${GREEN}${overall_status}${NC}"
    elif [[ ${FAILED_CHECKS} -eq 0 ]]; then
        overall_status="DEGRADED"
        echo -e "  Overall Status: ${YELLOW}${overall_status}${NC}"
    else
        overall_status="UNHEALTHY"
        echo -e "  Overall Status: ${RED}${overall_status}${NC}"
    fi
    
    echo ""
    echo "  Summary:"
    echo "    Total checks:  ${TOTAL_CHECKS}"
    echo -e "    Passed:       ${GREEN}${PASSED_CHECKS}${NC}"
    echo -e "    Warnings:     ${YELLOW}${WARNED_CHECKS}${NC}"
    echo -e "    Failed:       ${RED}${FAILED_CHECKS}${NC}"
    echo ""
    
    if [[ "${OUTPUT_FORMAT}" == "json" ]]; then
        output_json "${overall_status}"
    fi
    
    # Return appropriate exit code
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        return 1
    elif [[ ${WARNED_CHECKS} -gt 0 ]]; then
        return 2
    fi
    return 0
}

output_json() {
    local overall_status="$1"
    
    cat << EOF
{
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "overall_status": "${overall_status}",
    "summary": {
        "total": ${TOTAL_CHECKS},
        "passed": ${PASSED_CHECKS},
        "warnings": ${WARNED_CHECKS},
        "failed": ${FAILED_CHECKS}
    },
    "checks": [
$(for result in "${CHECK_RESULTS[@]}"; do
    IFS='|' read -r service status message <<< "${result}"
    cat << INNER
        {"service": "${service}", "status": "${status}", "message": "${message}"},
INNER
done | sed '$ s/,$//')
    ]
}
EOF
}

wait_for_healthy() {
    log_info "Waiting for all services to become healthy (timeout: ${TIMEOUT}s)..."
    
    local start_time
    start_time=$(date +%s)
    local elapsed=0
    
    while [[ ${elapsed} -lt ${TIMEOUT} ]]; do
        # Reset counters
        TOTAL_CHECKS=0
        PASSED_CHECKS=0
        FAILED_CHECKS=0
        WARNED_CHECKS=0
        CHECK_RESULTS=()
        
        # Run quick check
        MODE="quick"
        check_all_services > /dev/null 2>&1
        
        if [[ ${FAILED_CHECKS} -eq 0 ]]; then
            log_info "All critical services are healthy!"
            return 0
        fi
        
        local current_time
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        log_warn "Waiting... (${elapsed}s/${TIMEOUT}s) - ${FAILED_CHECKS} services still unhealthy"
        sleep 10
    done
    
    log_error "Timeout reached after ${TIMEOUT}s"
    return 1
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --quick)      MODE="quick"; shift ;;
            --full)       MODE="full"; shift ;;
            --json)       OUTPUT_FORMAT="json"; shift ;;
            --services)   SPECIFIC_SERVICES="$2"; shift 2 ;;
            --wait)       WAIT_MODE=true; shift ;;
            --timeout)    TIMEOUT="$2"; shift 2 ;;
            -h|--help)
                echo "Usage: $(basename "$0") [--quick|--full] [--json] [--services SVC] [--wait] [--timeout SECS]"
                exit 0
                ;;
            *) shift ;;
        esac
    done
    
    show_banner
    
    if [[ "${WAIT_MODE}" == "true" ]]; then
        wait_for_healthy
        exit $?
    fi
    
    check_system_resources
    check_all_services
    check_connectivity
    
    if [[ "${MODE}" == "full" ]]; then
        check_databases
    fi
    
    print_summary
    exit $?
}

main "$@"
