#!/usr/bin/env bash
# ============================================================
# National SOC Platform - Pre-Flight Validation Script
# Djezzy Production Environment
# ============================================================
# This script performs comprehensive pre-flight checks before
# production deployment or go-live.
#
# Usage:
#   ./pre-flight-checks.sh                    # Run all checks
#   ./pre-flight-checks.sh --quick            # Quick health check only
#   ./pre-flight-checks.sh --section=security  # Run specific section
#   ./pre-flight-checks.sh --json             # Output JSON format
#
# Exit codes:
#   0 - All checks passed
#   1 - Some warnings (non-critical)
#   2 - Critical failures detected
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables (override via environment or .env)
KUBECTL="${KUBECTL:-kubectl}"
NAMESPACE="${NAMESPACE:-soc-platform}"
APP_NAME="${APP_NAME:-soc-platform}"
DOMAIN="${DOMAIN:-soc.djezzy.dz}"
API_DOMAIN="${API_DOMAIN:-api.soc.djezzy.dz}"
GRAFANA_DOMAIN="${GRAFANA_DOMAIN:-grafana.soc.djezzy.dz}"

# Thresholds
CERT_WARNING_DAYS="${CERT_WARNING_DAYS:-30}"
CERT_CRITICAL_DAYS="${CERT_CRITICAL_DAYS:-7}"
CPU_WARNING_THRESHOLD="${CPU_WARNING_THRESHOLD:-70}"
CPU_CRITICAL_THRESHOLD="${CPU_CRITICAL_THRESHOLD:-90}"
MEMORY_WARNING_THRESHOLD="${MEMORY_WARNING_THRESHOLD:-75}"
MEMORY_CRITICAL_THRESHOLD="${MEMORY_CRITICAL_THRESHOLD:-90}"
DISK_WARNING_THRESHOLD="${DISK_WARNING_THRESHOLD:-80}"
DISK_CRITICAL_THRESHOLD="${DISK_CRITICAL_THRESHOLD:-90}"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0
FAILED_CHECKS=0

# Output format
OUTPUT_FORMAT="text"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --quick)
            QUICK_MODE=true
            ;;
        --json)
            OUTPUT_FORMAT="json"
            ;;
        --section=*)
            SECTION="${arg#*=}"
            ;;
        --help|-h)
            echo "Usage: $0 [--quick] [--json] [--section=section_name]"
            exit 0
            ;;
    esac
done

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${GREEN}✓ PASS${NC}: $1"
    fi
}

log_warn() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${YELLOW}⚠ WARN${NC}: $1"
    fi
}

log_fail() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${RED}✗ FAIL${NC}: $1"
    fi
}

log_section() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}  $1${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    fi
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_fail "Required command '$1' not found"
        return 1
    fi
    return 0
}

# ============================================================
# SECTION 1: KUBERNETES CLUSTER HEALTH
# ============================================================

check_kubernetes_cluster() {
    log_section "Kubernetes Cluster Health"
    
    # Check kubectl availability
    if ! check_command "$KUBECTL"; then
        return 1
    fi
    
    # Check cluster connectivity
    if $KUBECTL cluster-info &> /dev/null; then
        log_pass "Kubernetes cluster is accessible"
    else
        log_fail "Cannot connect to Kubernetes cluster"
        return 1
    fi
    
    # Check namespace exists
    if $KUBECTL get namespace "$NAMESPACE" &> /dev/null; then
        log_pass "Namespace '$NAMESPACE' exists"
    else
        log_fail "Namespace '$NAMESPACE' not found"
        return 1
    fi
    
    # Check node status
    local ready_nodes=$($KUBECTL get nodes --no-headers 2>/dev/null | grep -c "Ready" || true)
    local total_nodes=$($KUBECTL get nodes --no-headers 2>/dev/null | wc -l || true)
    
    if [[ "$ready_nodes" -eq "$total_nodes" ]] && [[ "$total_nodes" -gt 0 ]]; then
        log_pass "All nodes are Ready ($ready_nodes/$total_nodes)"
    elif [[ "$ready_nodes" -gt 0 ]]; then
        log_warn "Some nodes not Ready ($ready_nodes/$total_nodes)"
    else
        log_fail "No ready nodes found"
    fi
    
    # Check API server health
    local api_health=$(curl -sf -o /dev/null -w "%{http_code}" https://kubernetes.default.svc/healthz 2>/dev/null || echo "000")
    if [[ "$api_health" == "200" ]]; then
        log_pass "Kubernetes API server is healthy"
    else
        log_warn "Cannot verify API server health (code: $api_health)"
    fi
}

# ============================================================
# SECTION 2: APPLICATION POD HEALTH
# ============================================================

check_application_pods() {
    log_section "Application Pod Health"
    
    # Check deployment exists
    if $KUBECTL get deployment "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_pass "Deployment '$APP_NAME' exists"
    else
        log_fail "Deployment '$APP_NAME' not found"
        return 1
    fi
    
    # Check pod status
    local desired_replicas=$($KUBECTL get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    local ready_replicas=$($KUBECTL get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local available_replicas=$($KUBECTL get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
    
    if [[ "$ready_replicas" -eq "$desired_replicas" ]] && [[ "$desired_replicas" -gt 0 ]]; then
        log_pass "All pods are ready ($ready_replicas/$desired_replicas)"
    elif [[ "$available_replicas" -gt 0 ]]; then
        log_warn "Pods not fully ready ($available_replicas/$desired_replicas desired, $ready_replicas ready)"
    else
        log_fail "No pods available (desired: $desired_replicas)"
    fi
    
    # Check for crashing pods
    local crashing_pods=$($KUBECTL get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$APP_NAME" --no-headers 2>/dev/null | grep -c "CrashLoopBackOff\|Error\|OOMKilled" || true)
    if [[ "$crashing_pods" -eq 0 ]]; then
        log_pass "No pods in error state"
    else
        log_fail "$crashing_pods pod(s) in error state"
    fi
    
    # Check pod restarts
    local total_restarts=$($KUBECTL get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$APP_NAME" -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' 2>/dev/null | tr ' ' '\n' | awk '{s+=$1} END {print s+0}' || echo "0")
    if [[ "$total_restarts" -lt 10 ]]; then
        log_pass "Pod restart count is low ($total_restarts total)"
    else
        log_warn "High pod restart count ($total_restarts total)"
    fi
    
    # Check resource utilization
    check_pod_resources
}

check_pod_resources() {
    # Get CPU and memory usage (requires metrics-server)
    if $KUBECTL top pods -n "$NAMESPACE" &> /dev/null 2>&1; then
        local cpu_usage=$($KUBECTL top pods -n "$NAMESPACE" -l app.kubernetes.io/name="$APP_NAME" --no-headers 2>/dev/null | awk '{cpu+=$2} END {print cpu}' | sed 's/m//' || echo "0")
        local mem_usage=$($KUBECTL top pods -n "$NAMESPACE" -l app.kubernetes.io/name="$APP_NAME" --no-headers 2>/dev/null | awk '{mem+=$3} END {print mem}' | sed 's/Mi//' || echo "0")
        
        # Note: These are raw values, proper calculation would need limits comparison
        log_pass "Metrics-server is collecting data (CPU: ~${cpu_usage}m, Memory: ~${mem_usage}Mi)"
    else
        log_warn "Metrics-server not available for resource monitoring"
    fi
}

# ============================================================
# SECTION 3: SERVICE HEALTH CHECKS
# ============================================================

check_service_health() {
    log_section "Service Health Checks"
    
    # Check service exists
    if $KUBECTL get svc "$APP_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_pass "Service '$APP_NAME' exists"
        
        # Get service cluster IP
        local cluster_ip=$($KUBECTL get svc "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
        if [[ -n "$cluster_ip" ]] && [[ "$cluster_ip" != "None" ]]; then
            log_pass "Service has ClusterIP: $cluster_ip"
        fi
        
        # Get service port
        local port=$($KUBECTL get svc "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "")
        if [[ -n "$port" ]]; then
            log_pass "Service listening on port: $port"
        fi
    else
        log_fail "Service '$APP_NAME' not found"
    fi
    
    # Check ingress exists
    if $KUBECTL get ingress -n "$NAMESPACE" 2>/dev/null | grep -q "$APP_NAME\|soc"; then
        log_pass "Ingress configuration exists"
        
        # Get ingress hosts
        local hosts=$($KUBECTL get ingress -n "$NAMESPACE" -o jsonpath='{.items[*].spec.rules[*].host}' 2>/dev/null || echo "")
        if [[ -n "$hosts" ]]; then
            log_pass "Ingress hosts configured: $hosts"
        fi
    else
        log_warn "No Ingress configuration found"
    fi
}

# ============================================================
# SECTION 4: DATABASE CONNECTIVITY
# ============================================================

check_database_connectivity() {
    log_section "Database Connectivity"
    
    # Check PostgreSQL connectivity (if psql available)
    if command -v psql &> /dev/null; then
        local db_host="${POSTGRES_HOST:-postgres-cluster-rw.$NAMESPACE.svc.cluster.local}"
        local db_port="${POSTGRES_PORT:-5432}"
        local db_user="${POSTGRES_USER:-soc_admin}"
        local db_name="${POSTGRES_DB:-soc_platform}"
        
        # Test connection with timeout
        if timeout 5 psql "postgresql://$db_host:$db_port/$db_name" -c "SELECT 1 AS connection_test;" &> /dev/null 2>&1; then
            log_pass "PostgreSQL database is accessible"
            
            # Check database version
            local db_version=$(psql "postgresql://$db_host:$db_port/$db_name" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs || echo "unknown")
            log_pass "PostgreSQL version: $db_version"
            
            # Check active connections
            local connections=$(psql "postgresql://$db_host:$db_port/$db_name" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "unknown")
            log_pass "Active database connections: $connections"
            
            # Check SSL status
            local ssl_status=$(psql "postgresql://$db_host:$db_port/$db_name" -t -c "SHOW ssl;" 2>/dev/null | xargs || echo "unknown")
            if [[ "$ssl_status" == "on" ]]; then
                log_pass "SSL/TLS is enabled on database connections"
            else
                log_warn "SSL/TLS may not be enabled (ssl: $ssl_status)"
            fi
            
        else
            log_warn "Cannot connect to PostgreSQL at $db_host:$db_port"
        fi
    else
        log_warn "psql client not available for database testing"
    fi
    
    # Check Redis connectivity (if redis-cli available)
    if command -v redis-cli &> /dev/null; then
        local redis_host="${REDIS_HOST:-redis-master.$NAMESPACE.svc.cluster.local}"
        local redis_port="${REDIS_PORT:-6379}"
        
        if timeout 5 redis-cli -h "$redis_host" -p "$redis_port" ping 2>/dev/null | grep -q "PONG"; then
            log_pass "Redis server is responding"
            
            # Get Redis info
            local redis_version=$(redis-cli -h "$redis_host" -p "$redis_port" info server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r' || echo "unknown")
            log_pass "Redis version: $redis_version"
            
            # Check memory usage
            local redis_memory=$(redis-cli -h "$redis_host" -p "$redis_port" info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "unknown")
            log_pass "Redis memory usage: $redis_memory"
        else
            log_warn "Cannot connect to Redis at $redis_host:$redis_port"
        fi
    else
        log_warn "redis-cli not available for Redis testing"
    fi
}

# ============================================================
# SECTION 5: CERTIFICATE VALIDATION
# ============================================================

check_certificates() {
    log_section "Certificate Validation"
    
    local domains=("$DOMAIN" "$API_DOMAIN" "$GRAFANA_DOMAIN")
    
    for domain in "${domains[@]}"; do
        # Skip empty domains
        [[ -z "$domain" ]] && continue
        
        # Get certificate expiry
        local cert_info=$(echo | timeout 10 openssl s_client -connect "$domain":443 -servername "$domain" 2>/dev/null | openssl x509 -noout -enddate -subject -issuer 2>/dev/null || echo "")
        
        if [[ -n "$cert_info" ]]; then
            local expiry_date=$(echo "$cert_info" | grep endDate | cut -d= -f2)
            local subject=$(echo "$cert_info" | grep subject | sed 's/.*CN = //')
            local issuer=$(echo "$cert_info" | grep issuer | sed 's/.*CN = //' | head -1)
            
            # Convert expiry to epoch and calculate days remaining
            local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))
            
            if [[ "$days_remaining" -lt 0 ]]; then
                log_fail "Certificate for $domain has EXPIRED ($days_remaining days ago)"
            elif [[ "$days_remaining" -lt "$CERT_CRITICAL_DAYS" ]]; then
                log_fail "Certificate for $domain expiring in $days_remaining days (CRITICAL)"
            elif [[ "$days_remaining" -lt "$CERT_WARNING_DAYS" ]]; then
                log_warn "Certificate for $domain expiring in $days_remaining days"
            else
                log_pass "Certificate for $domain valid for $days_remaining more days"
            fi
            
            # Log certificate details in verbose mode
            log_info "  Subject: $subject"
            log_info "  Issuer: $issuer"
        else
            log_warn "Cannot retrieve certificate for $domain"
        fi
    done
    
    # Check TLS version support
    check_tls_versions
}

check_tls_versions() {
    local domain="${domains[0]:-$DOMAIN}"
    
    # Check TLS 1.2
    if echo | timeout 5 openssl s_client -connect "$domain":443 -tls1_2 2>/dev/null | grep -q "Cipher is"; then
        log_pass "TLS 1.2 is supported"
    else
        log_warn "TLS 1.2 may not be supported"
    fi
    
    # Check TLS 1.3
    if echo | timeout 5 openssl s_client -connect "$domain":443 -tls1_3 2>/dev/null | grep -q "Cipher is"; then
        log_pass "TLS 1.3 is supported"
    else
        log_warn "TLS 1.3 may not be supported"
    fi
    
    # Check for weak protocols (should fail)
    if echo | timeout 5 openssl s_client -connect "$domain":443 -tls1 -tls1_1 2>/dev/null | grep -q "Cipher is"; then
        log_fail "Weak TLS versions (1.0/1.1) are still accepted!"
    else
        log_pass "Weak TLS versions (1.0/1.1) correctly rejected"
    fi
}

# ============================================================
# SECTION 6: SECURITY CONFIGURATION
# ============================================================

check_security_configuration() {
    log_section "Security Configuration"
    
    # Check Pod Security Standards
    check_pod_security_standards
    
    # Check Network Policies
    check_network_policies
    
    # Check RBAC configuration
    check_rbac_configuration
    
    # Check secrets management
    check_secrets_management
}

check_pod_security_standards() {
    log_info "Checking Pod Security Standards..."
    
    # Check for privileged containers
    local privileged=$($KUBECTL get pods -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.items[].spec.containers[]?.securityContext.privileged // false' 2>/dev/null | \
        grep -c "true" || echo "0")
    
    if [[ "$privileged" -eq 0 ]]; then
        log_pass "No privileged containers found"
    else
        log_fail "$privileged privileged container(s) found!"
    fi
    
    # Check for root containers
    local root_containers=$($KUBECTL get pods -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '[.items[]?.spec.securityContext.runAsNonRoot // "not-set"] | map(. == false or . == "not-set") | length' 2>/dev/null || echo "0")
    
    if [[ "$root_containers" -eq 0 ]]; then
        log_pass "All containers running as non-root"
    else
        log_warn "$root_containers container(s) may be running as root"
    fi
}

check_network_policies() {
    log_info "Checking Network Policies..."
    
    # Check if default-deny policy exists
    if $KUBECTL get networkpolicy default-deny-all-ingress -n "$NAMESPACE" &> /dev/null 2>&1 || \
       $KUBECTL get networkpolicy -n "$NAMESPACE" 2>/dev/null | grep -qi "deny"; then
        log_pass "Default-deny NetworkPolicy is configured"
    else
        log_warn "No default-deny NetworkPolicy found"
    fi
    
    # Count network policies
    local np_count=$($KUBECTL get networkpolicy -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l || echo "0")
    if [[ "$np_count" -gt 0 ]]; then
        log_pass "$np_count NetworkPolicy(ies) defined in namespace"
    else
        log_warn "No NetworkPolicies defined"
    fi
}

check_rbac_configuration() {
    log_info "Checking RBAC Configuration..."
    
    # Check ServiceAccount token auto-mount
    local automount_sa=$($KUBECTL get pods -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.items[]?.spec.automountServiceAccountToken // "default"' 2>/dev/null | \
        grep -c "true" || echo "0")
    
    if [[ "$automount_sa" -eq 0 ]]; then
        log_pass "ServiceAccount token auto-mount disabled"
    else
        log_warn "$automount_sa pod(s) have token auto-mount enabled"
    fi
}

check_secrets_management() {
    log_info "Checking Secrets Management..."
    
    # Check for sealed secrets or external secrets operator
    if $KUBECTL get crd sealedsecrets.bitnami.com &> /dev/null 2>&1 || \
       $KUBECTL get crd externalsecrets.external-secrets.io &> /dev/null 2>&1; then
        log_pass "Secret encryption solution installed"
    else
        log_warn "No external secrets manager detected"
    fi
    
    # Check for secrets in base64 only (not encrypted)
    local plain_secrets=$($KUBECTL get secrets -n "$NAMESPACE" -o json 2>/dev/null | \
        jq -r '.items[]? | select(.metadata.name | endswith("-secret") or contains("password") or contains("credential")) | .data | length' 2>/dev/null | wc -l || echo "0")
    
    if [[ "$plain_secrets" -gt 0 ]]; then
        log_info "$plain_secrets secret(s) found (verify they're properly managed)"
    fi
}

# ============================================================
# SECTION 7: INTEGRATION ENDPOINTS
# ============================================================

check_integration_endpoints() {
    log_section "Integration Endpoints"
    
    # Application health endpoint
    check_endpoint "Application Health" "https://$DOMAIN/api/health" 200
    
    # API endpoint
    check_endpoint "API Endpoint" "https://$API_DOMAIN/api/health" 200
    
    # Metrics endpoint (internal)
    check_endpoint_internal "Metrics" "http://$APP_NAME.$NAMESPACE.svc.cluster.local:3000/api/metrics" 200
    
    # WebSocket endpoint (if applicable)
    check_websocket "WebSocket" "wss://$DOMAIN/api/stream"
}

check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    
    local http_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    local response_time=$(curl -sf -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "0")
    
    if [[ "$http_code" == "$expected_code" ]]; then
        log_pass "$name is healthy (${http_code}, ${response_time}s)"
    elif [[ "$http_code" != "000" ]]; then
        log_warn "$Name returned HTTP $http_code (expected $expected_code)"
    else
        log_fail "$name is unreachable"
    fi
}

check_endpoint_internal() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    
    # Try from within cluster using kubectl exec
    local pod_name=$($KUBECTL get pods -n "$NAMESPACE" -l app.kubernetes.io/name="$APP_NAME" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -n "$pod_name" ]]; then
        if $KUBECTL exec -n "$NAMESPACE" "$pod_name" -- curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null | grep -q "$expected_code"; then
            log_pass "$name endpoint is healthy internally"
        else
            log_warn "$name internal health check inconclusive"
        fi
    else
        log_warn "Cannot test $name internally (no pods available)"
    fi
}

check_websocket() {
    local name="$1"
    local url="$2"
    
    # Basic WebSocket upgrade test
    local ws_response=$(curl -sf -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" --max-time 5 "$url" 2>/dev/null || echo "000")
    
    if [[ "$ws_response" == "101" ]] || [[ "$ws_response" == "200" ]]; then
        log_pass "$name upgrade works (HTTP $ws_response)"
    else
        log_info "$name WebSocket test returned HTTP $ws_response (may require browser)"
    fi
}

# ============================================================
# SECTION 8: DNS RESOLUTION
# ============================================================

check_dns_resolution() {
    log_section "DNS Resolution"
    
    local domains_to_check=("$DOMAIN" "$API_DOMAIN" "$GRAFANA_DOMAIN" "kubernetes.default.svc.cluster.local")
    
    for domain in "${domains_to_check[@]}"; do
        [[ -z "$domain" ]] && continue
        
        # Resolve domain
        local resolved_ip=$(timeout 5 nslookup "$domain" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1 || \
                           timeout 5 dig +short "$domain" 2>/dev/null | head -1 || \
                           timeout 5 host "$domain" 2>/dev/null | head -1 | awk '{print $NF}' || echo "")
        
        if [[ -n "$resolved_ip" ]]; then
            log_pass "$domain resolves to $resolved_ip"
        else
            log_warn "$domain DNS resolution failed"
        fi
    done
    
    # Check internal Kubernetes DNS
    if $KUBECTL run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default 2>/dev/null | grep -q "Address:"; then
        log_pass "Internal Kubernetes DNS is working"
    else
        log_warn "Could not verify internal DNS (may need permissions)"
    fi
}

# ============================================================
# SECTION 9: RESOURCE UTILIZATION BASELINE
# ============================================================

check_resource_utilization() {
    log_section "Resource Utilization Baseline"
    
    # Node resource usage
    if $KUBECTL top nodes 2>/dev/null | grep -q "%"; then
        log_pass "Node metrics available"
        
        while IFS= read -r line; do
            local node_name=$(echo "$line" | awk '{print $1}')
            local cpu_percent=$(echo "$line" | awk '{print $5}' | tr -d '%')
            local mem_percent=$(echo "$line" | awk '{print $8}' | tr -d '%')
            
            if [[ -n "$cpu_percent" ]] && [[ "$cpu_percent" != "CPU%" ]]; then
                if [[ "$cpu_percent" -gt "$CPU_CRITICAL_THRESHOLD" ]]; then
                    log_fail "Node $node_name CPU critical: ${cpu_percent}%"
                elif [[ "$cpu_percent" -gt "$CPU_WARNING_THRESHOLD" ]]; then
                    log_warn "Node $node_name CPU high: ${cpu_percent}%"
                fi
                
                if [[ "$mem_percent" -gt "$MEMORY_CRITICAL_THRESHOLD" ]]; then
                    log_fail "Node $node_name Memory critical: ${mem_percent}%"
                elif [[ "$mem_percent" -gt "$MEMORY_WARNING_THRESHOLD" ]]; then
                    log_warn "Node $node_name Memory high: ${mem_percent}%"
                fi
            fi
        done < <($KUBECTL top nodes --no-headers 2>/dev/null)
    else
        log_warn "Node metrics not available (metrics-server required)"
    fi
    
    # Persistent Volume claims
    check_storage_utilization
}

check_storage_utilization() {
    log_info "Checking Storage Utilization..."
    
    # List PVCs with their status
    local pvcs=$($KUBECTL get pvc -n "$NAMESPACE" --no-headers 2>/dev/null | tail -n +1 || echo "")
    
    if [[ -n "$pvcs" ]]; then
        while IFS= read -r line; do
            local pvc_name=$(echo "$line" | awk '{print $1}')
            local pvc_status=$(echo "$line" | awk '{print $2}')
            local pvc_capacity=$(echo "$line" | awk '{print $4}')
            
            if [[ "$pvc_status" == "Bound" ]]; then
                log_pass "PVC $pvc_name is Bound ($pvc_capacity)"
            else
                log_warn "PVC $pvc_name status: $pvc_status"
            fi
        done <<< "$pvcs"
    else
        log_info "No PVCs found in namespace"
    fi
}

# ============================================================
# SECTION 10: LOAD BALANCER HEALTH
# ============================================================

check_load_balancer() {
    log_section "Load Balancer Health"
    
    # Check ingress controller
    local ingress_pods=$($KUBECTL get pods -n ingress-nginx -l app.kubernetes.io/name=nginx-ingress --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    
    if [[ "$ingress_pods" -gt 0 ]]; then
        log_pass "Ingress controller is running ($ingress_pods pods)"
    else
        # Try alternative namespace
        ingress_pods=$($KUBECTL get pods -A -l app.kubernetes.io/component=controller --no-headers 2>/dev/null | grep -c "Running" || echo "0")
        if [[ "$ingress_pods" -gt 0 ]]; then
            log_pass "Ingress controller is running ($ingress_pods pods)"
        else
            log_warn "Ingress controller status unknown"
        fi
    fi
    
    # Check load balancer service (if any)
    local lb_services=$($KUBECTL get svc -A -o json 2>/dev/null | \
        jq -r '.items[]? | select(.spec.type == "LoadBalancer") | "\(.metadata.namespace)/\(.metadata.name): \(.status.loadBalancer.ingress[0].hostname // .status.loadBalancer.ingress[0].ip // "pending")"' 2>/dev/null || echo "")
    
    if [[ -n "$lb_services" ]]; then
        while IFS= read -r lb; do
            log_pass "LoadBalancer: $lb"
        done <<< "$lb_services"
    fi
}

# ============================================================
# SECTION 11: BACKUP VERIFICATION
# ============================================================

check_backup_status() {
    log_section "Backup Status"
    
    # This section would integrate with your backup system
    # Examples: Velero, pgBackRest, cloud provider backups
    
    # Check for Velero backups (if installed)
    if command -v velero &> /dev/null; then
        local last_backup=$(velero backup get latest -o json 2>/dev/null | jq -r '.status.phase // "unknown"' || echo "unknown")
        if [[ "$last_backup" == "Completed" ]]; then
            log_pass "Latest Velero backup completed successfully"
        else
            log_warn "Velero backup status: $last_backup"
        fi
    else
        log_info "Velero CLI not available (backup checks skipped)"
    fi
    
    # Database backup verification (if psql available)
    if command -v psql &> /dev/null; then
        local db_host="${POSTGRES_HOST:-postgres-cluster-rw.$NAMESPACE.svc.cluster.local}"
        local last_backup_time=$(psql "postgresql://$db_host:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-soc_platform}" -t -c \
            "SELECT MAX(completed_at) FROM audit.backup_registry WHERE status = 'completed';" 2>/dev/null | xargs || echo "unknown")
        
        if [[ -n "$last_backup_time" ]] && [[ "$last_backup_time" != "unknown" ]]; then
            log_pass "Last successful backup: $last_backup_time"
        else
            log_info "Backup registry query failed or no backups recorded"
        fi
    fi
}

# ============================================================
# MAIN EXECUTION
# ============================================================

main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     National SOC Platform - Pre-Flight Checks           ║${NC}"
    echo -e "${BLUE}║     Djezzy Production Environment                       ║${NC}"
    echo -e "${BLUE}║     $(date '+%Y-%m-%d %H:%M:%S')                   ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Determine which sections to run
    if [[ -n "${SECTION:-}" ]]; then
        case "$SECTION" in
            kubernetes|k8s) check_kubernetes_cluster ;;
            pods|application) check_application_pods ;;
            services) check_service_health ;;
            database|db) check_database_connectivity ;;
            certificates|certs|tls) check_certificates ;;
            security) check_security_configuration ;;
            endpoints|integrations) check_integration_endpoints ;;
            dns) check_dns_resolution ;;
            resources) check_resource_utilization ;;
            loadbalancer|lb) check_load_balancer ;;
            backups) check_backup_status ;;
            *) echo "Unknown section: $SECTION"; exit 1 ;;
        esac
    elif [[ "${QUICK_MODE:-false}" == "true" ]]; then
        # Quick mode: essential checks only
        check_kubernetes_cluster
        check_application_pods
        check_service_health
        check_integration_endpoints
    else
        # Full mode: all checks
        check_kubernetes_cluster
        check_application_pods
        check_service_health
        check_database_connectivity
        check_certificates
        check_security_configuration
        check_integration_endpoints
        check_dns_resolution
        check_resource_utilization
        check_load_balancer
        check_backup_status
    fi
    
    # Print summary
    echo ""
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  PRE-FLIGHT CHECK SUMMARY${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo -e "  Total Checks:  ${TOTAL_CHECKS}"
    echo -e "  ${GREEN}Passed:        ${PASSED_CHECKS}${NC}"
    echo -e "  ${Yellow}Warnings:      ${WARNING_CHECKS}${NC}"
    echo -e "  ${RED}Failed:         ${FAILED_CHECKS}${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Return appropriate exit code
    if [[ "$FAILED_CHECKS" -gt 0 ]]; then
        echo -e "${RED}RESULT: CRITICAL FAILURES DETECTED - Do not proceed with deployment${NC}"
        exit 2
    elif [[ "$WARNING_CHECKS" -gt 0 ]]; then
        echo -e "${Yellow}RESULT: WARNINGS - Review warnings before proceeding${NC}"
        exit 1
    else
        echo -e "${Green}RESULT: ALL CHECKS PASSED - Safe to proceed${NC}"
        exit 0
    fi
}

# Run main function
main "$@"
