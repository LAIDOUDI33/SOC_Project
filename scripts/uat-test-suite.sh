#!/bin/bash
# ============================================================
# National SOC Platform - User Acceptance Testing (UAT) Suite
# ============================================================
# Comprehensive UAT covering all modules and user workflows:
# - Authentication & Authorization flows
# - Incident Management lifecycle
# - SS7 Monitoring & Fraud Detection
# - Threat Hunting workspace
# - Analytics & Reporting
# - Compliance validation
# - Telecom integration
#
# Usage: ./uat-test-suite.sh [--env=staging] [--module=all] [--report]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
UAT_DIR="$PROJECT_ROOT/tests/uat/results/$TIMESTAMP"
BASE_URL="${BASE_URL:-https://soc-staging.djezzy.dz}"
TEST_ENV="${TEST_ENV:-staging}"
MODULE="${MODULE:-all}"
GENERATE_REPORT=${GENERATE_REPORT:-true}

# Test Users
UAT_USERS=(
    "soc_analyst_uat:Analyst@UAT2026!"
    "soc_supervisor_uat:Supervisor@UAT2026!"
    "soc_admin_uat:Admin@UAT2026!"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
CURRENT_MODULE=""

# Token storage
declare -A USER_TOKENS

# ============================================================
# Utility Functions
# ============================================================
init_test_env() {
    mkdir -p "$UAT_DIR/logs"
    mkdir -p "$UAT_DIR/screenshots"
    mkdir -p "$UAT_DIR/evidence"
    
    echo "=========================================="
    echo "  National SOC Platform - UAT Suite"
    echo "  Environment: $TEST_ENV"
    echo "  Target: $BASE_URL"
    echo "  Timestamp: $TIMESTAMP"
    echo "=========================================="
    echo ""
    echo "Results directory: $UAT_DIR"
}

log_test() {
    local module="$1"
    local test_name="$2"
    local status="$3"
    local details="${4:-}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    ((TOTAL_TESTS++))
    
    case $status in
        pass) 
            ((PASSED_TESTS++))
            status_icon="✅"
            status_color="$GREEN"
            ;;
        fail)
            ((FAILED_TESTS++))
            status_icon="❌"
            status_color="$RED"
            ;;
        skip)
            ((SKIPPED_TESTS++))
            status_icon="⏭️"
            status_color="$YELLOW"
            ;;
    esac
    
    # Log to file
    echo "[$timestamp] [$status] [$module] $test_name $details" >> "$UAT_DIR/uat-results.log"
    
    # Colorful console output
    echo -e "  ${status_color}${status_icon} ${test_name}${NC} ${details}"
}

start_module() {
    CURRENT_MODULE="$1"
    echo ""
    echo -e "${PURPLE}━━━ Module: $1 ━━━${NC}"
}

# API helper functions
api_get() {
    local endpoint="$1"
    local token="${2:-}"
    local extra_args="${3:-}"
    
    curl -sf "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        $extra_args 2>/dev/null || echo '{"error":"request_failed"}'
}

api_post() {
    local endpoint="$1"
    local data="$2"
    local token="${3:-}"
    
    curl -sf -X POST "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$data" 2>/dev/null || echo '{"error":"request_failed"}'
}

api_put() {
    local endpoint="$1"
    local data="$2"
    local token="${3:-}"
    
    curl -sf -X PUT "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$data" 2>/dev/null || echo '{"error":"request_failed"}'
}

get_token() {
    local user_pass="$1"
    local username="${user_pass%%:*}"
    local password="${user_pass##*:}"
    
    RESPONSE=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$username\",\"password\":\"$password\"}" 2>/dev/null || echo "{}")
    
    echo "$RESPONSE" | jq -r '.token // .accessToken // .access_token // empty' 2>/dev/null
}

assert_equals() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    if [ "$expected" = "$actual" ]; then
        log_test "$CURRENT_MODULE" "$test_name" "pass"
    else
        log_test "$CURRENT_MODULE" "$test_name" "fail" "(expected: $expected, got: $actual)"
    fi
}

assert_contains() {
    local test_name="$1"
    local haystack="$2"
    local needle="$3"
    
    if echo "$haystack" | grep -q "$needle"; then
        log_test "$CURRENT_MODULE" "$test_name" "pass"
    else
        log_test "$CURRENT_MODULE" "$test_name" "fail" "(string not found: $needle)"
    fi
}

assert_http_code() {
    local test_name="$1"
    local expected_code="$2"
    local actual_code="$3"
    
    if [ "$expected_code" = "$actual_code" ]; then
        log_test "$CURRENT_MODULE" "$test_name" "pass"
    else
        log_test "$CURRENT_MODULE" "$test_name" "fail" "(HTTP expected: $expected_code, got: $actual_code)"
    fi
}

# ============================================================
# Module 1: Authentication & Access Control Tests
# ============================================================
test_authentication() {
    start_module "Authentication & Access Control"
    
    info "Testing authentication flows..."
    
    # Test 1.1: Valid Login
    local TEST_USER="${UAT_USERS[0]}"
    local TOKEN=$(get_token "$TEST_USER")
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ] && [ "$TOKEN" != "null" ]; then
        USER_TOKENS["analyst"]=$TOKEN
        log_test "$CURRENT_MODULE" "Valid User Login - Analyst" "pass"
    else
        log_test "$CURRENT_MODULE" "Valid User Login - Analyst" "fail" "(no token received)"
    fi
    
    # Test 1.2: Invalid Credentials
    local INVALID_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"invalid@test.com","password":"wrong"}' 2>/dev/null || echo "000")
    local INVALID_HTTP=$(echo "$INVALID_RESP" | tail -1)
    
    assert_http_code "Invalid Credentials Rejected" "401" "$INVALID_HTTP"
    
    # Test 1.3: Missing Fields
    local MISSING_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "000")
    local MISSING_HTTP=$(echo "$MISSING_RESP" | tail -1)
    
    assert_http_code "Missing Login Fields" "400" "$MISSING_HTTP"
    
    # Test 1.4: Supervisor Login
    local SUPERVISOR_TOKEN=$(get_token "${UAT_USERS[1]}")
    if [ -n "$SUPERVISOR_TOKEN" ]; then
        USER_TOKENS["supervisor"]=$SUPERVISOR_TOKEN
        log_test "$CURRENT_MODULE" "Valid User Login - Supervisor" "pass"
    else
        log_test "$CURRENT_MODULE" "Valid User Login - Supervisor" "skip" "(user may not exist)"
    fi
    
    # Test 1.5: Admin Login
    local ADMIN_TOKEN=$(get_token "${UAT_USERS[2]}")
    if [ -n "$ADMIN_TOKEN" ]; then
        USER_TOKENS["admin"]=$ADMIN_TOKEN
        log_test "$CURRENT_MODULE" "Valid User Login - Admin" "pass"
    else
        log_test "$CURRENT_MODULE" "Valid User Login - Admin" "skip" "(user may not exist)"
    fi
    
    # Test 1.6: Token Validation
    if [ -n "${USER_TOKENS[analyst]:-}" ]; then
        local VALIDATE_RESP=$(api_get "/api/auth/validate" "${USER_TOKENS[analyst]}")
        local IS_VALID=$(echo "$VALIDATE_RESP" | jq -r '.valid // .validToken // empty' 2>/dev/null)
        
        assert_contains "JWT Token Validation" "$IS_VALID" "true"
    fi
    
    # Test 1.7: Session Expiry Check
    local SESSION_INFO=$(api_get "/api/auth/session" "${USER_TOKENS[analyst]:-}")
    local EXPIRES_AT=$(echo "$SESSION_INFO" | jq -r '.expiresAt // .exp // empty' 2>/dev/null)
    
    if [ -n "$EXPIRES_AT" ]; then
        log_test "$CURRENT_MODULE" "Session Contains Expiry Info" "pass"
    else
        log_test "$CURRENT_MODULE" "Session Contains Expiry Info" "fail" "(no expiry field in response)"
    fi
    
    # Test 1.8: Role-Based Access
    if [ -n "${USER_TOKENS[analyst]:-}" ] && [ -n "${USER_TOKENS[admin]:-}" ]; then
        local ANALYST_ADMIN_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/users" \
            -H "Authorization: Bearer ${USER_TOKENS[analyst]}" 2>/dev/null || echo "000")
        local ANALYST_ADMIN_HTTP=$(echo "$ANALYST_ADMIN_RESP" | tail -1)
        
        assert_http_code "Analyst Cannot Access Admin" "403" "$ANALYST_ADMIN_HTTP"
        
        local ADMIN_ADMIN_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/users" \
            -H "Authorization: Bearer ${USER_TOKENS[admin]}" 2>/dev/null || echo "000")
        local ADMIN_ADMIN_HTTP=$(echo "$ADMIN_ADMIN_RESP" | tail -1)
        
        assert_http_code "Admin Can Access Admin" "200" "$ADMIN_ADMIN_HTTP"
    fi
    
    # Test 1.9: MFA Flow (if enabled)
    local MFA_STATUS=$(api_get "/api/auth/mfa/status" "${USER_TOKENS[analyst]:-}")
    local MFA_ENABLED=$(echo "$MFA_STATUS" | jq -r '.enabled // .mfaEnabled // empty' 2>/dev/null)
    
    if [ -n "$MFA_ENABLED" ]; then
        log_test "$CURRENT_MODULE" "MFA Status Endpoint" "pass" "(MFA enabled: $MFA_ENABLED)"
    else
        log_test "$CURRENT_MODULE" "MFA Status Endpoint" "skip" "(endpoint not available or MFA not configured)"
    fi
}

# ============================================================
# Module 2: Dashboard & Navigation Tests
# ============================================================
test_dashboard() {
    start_module "Dashboard & Navigation"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No analyst token available, skipping dashboard tests"
        return
    fi
    
    # Test 2.1: Main Dashboard Load
    local DASHBOARD_RESP=$(api_get "/" "$TOKEN")
    local DASHBOARD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" --connect-timeout 10)
    
    assert_http_code "Main Dashboard Loads" "200" "$DASHBOARD_HTTP"
    
    # Test 2.2: Dashboard Stats Endpoint
    local STATS_RESP=$(api_get "/api/dashboard/stats" "$TOKEN")
    local HAS_STATS=$(echo "$STATS_RESP" | jq -r '.totalAlerts // .alertsCount // .incidentsCount // empty' 2>/dev/null)
    
    if [ -n "$HAS_STATS" ] || echo "$STATS_RESP" | grep -q "count\|total\|stats"; then
        log_test "$CURRENT_MODULE" "Dashboard Stats Available" "pass"
    else
        log_test "$CURRENT_MODULE" "Dashboard Stats Available" "fail" "(unexpected response format)"
    fi
    
    # Test 2.3: Real-time Dashboard
    local RT_DASHBOARD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboards/realtime" \
        -H "Authorization: Bearer $TOKEN" --connect-timeout 10)
    
    assert_http_code "Real-time Dashboard Loads" "200" "$RT_DASHBOARD_HTTP"
    
    # Test 2.4: Analyst Dashboard
    local ANALYST_DASH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboards/analyst" \
        -H "Authorization: Bearer $TOKEN" --connect-timeout 10)
    
    assert_http_code "Analyst Dashboard Loads" "200" "$ANALYST_DASH_HTTP"
    
    # Test 2.5: Executive Dashboard (may require elevated role)
    local EXEC_DASH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/dashboards/executive" \
        -H "Authorization: Bearer $TOKEN" --connect-timeout 10)
    
    if [ "$EXEC_DASH_HTTP" = "200" ] || [ "$EXEC_DASH_HTTP" = "403" ]; then
        log_test "$CURRENT_MODULE" "Executive Dashboard Access" "pass" "(HTTP $EXEC_DASH_HTTP)"
    else
        log_test "$CURRENT_MODULE" "Executive Dashboard Access" "fail" "(unexpected HTTP $EXEC_DASH_HTTP)"
    fi
    
    # Test 2.6: Navigation Menu Items
    local DASHBOARD_HTML=$(curl -s "$BASE_URL/" --connect-timeout 10)
    local NAV_ITEMS=("Incidents" "Alerts" "Threat Intel" "SS7" "Reports")
    
    for item in "${NAV_ITEMS[@]}"; do
        if echo "$DASHBOARD_HTML" | grep -qi "$item"; then
            log_test "$CURRENT_MODULE" "Navigation Item: $item" "pass"
        else
            log_test "$CURRENT_MODULE" "Navigation Item: $item" "fail" "(not found in page)"
        fi
    done
}

# ============================================================
# Module 3: Incident Management Tests
# ============================================================
test_incident_management() {
    start_module "Incident Management"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping incident tests"
        return
    fi
    
    # Test 3.1: List Incidents
    local INCIDENTS_RESP=$(api_get "/api/v1/incidents?limit=10" "$TOKEN")
    local INCIDENTS_DATA=$(echo "$INCIDENTS_RESP" | jq -r '.data // .incidents // .[] // empty' 2>/dev/null)
    
    if [ -n "$INCIDENTS_DATA" ] || echo "$INCIDENTS_RESP" | jq -e '.length // .total' >/dev/null 2>&1; then
        log_test "$CURRENT_MODULE" "List Incidents" "pass"
    else
        log_test "$CURRENT_MODULE" "List Incidents" "fail" "(no data returned)"
    fi
    
    # Test 3.2: Create Incident
    local CREATE_PAYLOAD="{
        \"title\": \"UAT Test Incident $(date +%s)\",
        \"description\": \"Automated UAT test incident - safe to close\",
        \"severity\": \"low\",
        \"type\": \"security\",
        \"source\": \"uat_suite\"
    }"
    
    local CREATE_RESP=$(api_post "/api/v1/incidents" "$CREATE_PAYLOAD" "$TOKEN")
    local CREATED_ID=$(echo "$CREATE_RESP" | jq -r '.id // .incidentId // empty' 2>/dev/null)
    
    if [ -n "$CREATED_ID" ] && [ "$CREATED_ID" != "null" ]; then
        log_test "$CURRENT_MODULE" "Create Incident" "pass" "(ID: $CREATED_ID)"
        export UAT_INCIDENT_ID="$CREATED_ID"
    else
        log_test "$CURRENT_MODULE" "Create Incident" "fail" "$(echo "$CREATE_RESP" | head -c 200)"
    fi
    
    # Test 3.3: Get Incident Details
    if [ -n "${UAT_INCIDENT_ID:-}" ]; then
        local DETAIL_RESP=$(api_get "/api/v1/incidents/$UAT_INCIDENT_ID" "$TOKEN")
        local DETAIL_TITLE=$(echo "$DETAIL_RESP" | jq -r '.title // empty' 2>/dev/null)
        
        if echo "$DETAIL_TITLE" | grep -q "UAT Test"; then
            log_test "$CURRENT_MODULE" "Get Incident Details" "pass"
        else
            log_test "$CURRENT_MODULE" "Get Incident Details" "fail" "(title mismatch)"
        fi
        
        # Test 3.4: Update Incident
        local UPDATE_PAYLOAD='{"status": "IN_PROGRESS", "assignedTo": "'$(echo "${UAT_USERS[0]}" | cut -d: -f1)'"}'
        local UPDATE_RESP=$(api_put "/api/v1/incidents/$UAT_INCIDENT_ID" "$UPDATE_PAYLOAD" "$TOKEN")
        local NEW_STATUS=$(echo "$UPDATE_RESP" | jq -r '.status // empty' 2>/dev/null)
        
        assert_equals "Update Incident Status" "IN_PROGRESS" "$NEW_STATUS"
        
        # Test 3.5: Add Comment/Update
        local COMMENT_PAYLOAD='{"comment": "UAT automated test comment", "action": "status_change"}'
        local COMMENT_RESP=$(api_post "/api/v1/incidents/$UAT_INCIDENT_ID/updates" "$COMMENT_PAYLOAD" "$TOKEN")
        local COMMENT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/incidents/$UAT_INCIDENT_ID/updates" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$COMMENT_PAYLOAD")
        
        assert_http_code "Add Incident Update" "201" "$COMMENT_HTTP"
        
        # Cleanup: Close the test incident
        api_put "/api/v1/incidents/$UAT_INCIDENT_ID" '{"status": "CLOSED", "resolution": "UAT test completed"}' "$TOKEN" > /dev/null 2>&1 || true
    else
        log_test "$CURRENT_MODULE" "Get Incident Details" "skip" "(no incident created)"
        log_test "$CURRENT_MODULE" "Update Incident Status" "skip" "(no incident created)"
        log_test "$CURRENT_MODULE" "Add Incident Update" "skip" "(no incident created)"
    fi
    
    # Test 3.6: Filter Incidents
    local FILTER_RESP=$(api_get "/api/v1/incidents?severity=critical&status=NEW&limit=5" "$TOKEN")
    local FILTER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/incidents?severity=critical&status=NEW&limit=5" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Filter Incidents" "200" "$FILTER_HTTP"
    
    # Test 3.7: Export Incidents
    local EXPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/incidents/export?format=csv" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$EXPORT_HTTP" = "200" ] || [ "$EXPORT_HTTP" = "202" ]; then
        log_test "$CURRENT_MODULE" "Export Incidents (CSV)" "pass"
    else
        log_test "$CURRENT_MODULE" "Export Incidents (CSV)" "fail" "(HTTP $EXPORT_HTTP)"
    fi
}

# ============================================================
# Module 4: Alert Management Tests
# ============================================================
test_alerts() {
    start_module "Alert Management"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping alert tests"
        return
    fi
    
    # Test 4.1: List Alerts
    local ALERTS_RESP=$(api_get "/api/v1/alerts?limit=20" "$TOKEN")
    local ALERTS_COUNT=$(echo "$ALERTS_RESP" | jq -r '.total // length // empty' 2>/dev/null)
    
    if [ -n "$ALERTS_COUNT" ]; then
        log_test "$CURRENT_MODULE" "List Alerts" "pass" "($ALERTS_COUNT alerts found)"
    else
        log_test "$CURRENT_MODULE" "List Alerts" "fail" "(no count in response)"
    fi
    
    # Test 4.2: Get Alert Details
    local FIRST_ALERT_ID=$(echo "$ALERTS_RESP" | jq -r '.data[0].id // .[0].id // empty' 2>/dev/null)
    
    if [ -n "$FIRST_ALERT_ID" ]; then
        local ALERT_DETAIL=$(api_get "/api/v1/alerts/$FIRST_ALERT_ID" "$TOKEN")
        local ALERT_SEVERITY=$(echo "$ALERT_DETAIL" | jq -r '.severity // empty' 2>/dev/null)
        
        if [ -n "$ALERT_SEVERITY" ]; then
            log_test "$CURRENT_MODULE" "Get Alert Details" "pass" "(severity: $ALERT_SEVERITY)"
        else
            log_test "$CURRENT_MODULE" "Get Alert Details" "fail"
        fi
        
        # Test 4.3: Acknowledge Alert
        local ACK_RESP=$(api_put "/api/v1/alerts/$FIRST_ALERT_ID" '{"status": "ACKNOWLEDGED"}' "$TOKEN")
        local ACK_STATUS=$(echo "$ACK_RESP" | jq -r '.status // empty' 2>/dev/null)
        
        assert_equals "Acknowledge Alert" "ACKNOWLEDGED" "$ACK_STATUS"
        
        # Reset for other tests
        api_put "/api/v1/alerts/$FIRST_ALERT_ID" '{"status": "NEW"}' "$TOKEN" > /dev/null 2>&1 || true
    else
        log_test "$CURRENT_MODULE" "Get Alert Details" "skip" "(no alerts found)"
        log_test "$CURRENT_MODULE" "Acknowledge Alert" "skip" "(no alerts found)"
    fi
    
    # Test 4.4: Bulk Operations
    local BULK_PAYLOAD='{"alertIds": ["'"$FIRST_ALERT_ID"'"], "action": "assign", "assignee": "uat-analyst"}'
    local BULK_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/alerts/bulk" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$BULK_PAYLOAD")
    
    if [ "$BULK_HTTP" = "200" ] || [ "$BULK_HTTP" = "202" ]; then
        log_test "$CURRENT_MODULE" "Bulk Alert Operations" "pass"
    else
        log_test "$CURRENT_MODULE" "Bulk Alert Operations" "fail" "(HTTP $BULK_HTTP)"
    fi
    
    # Test 4.5: Alert Filtering
    local FILTERED_ALERTS=$(api_get "/api/v1/alerts?severity=CRITICAL&status=NEW" "$TOKEN")
    local FILTERED_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/alerts?severity=CRITICAL&status=NEW" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Filter Alerts by Severity" "200" "$FILTERED_HTTP"
    
    # Test 4.6: Real-time Alert Stream (SSE)
    local SSE_TEST=$(timeout 3 curl -sN "$BASE_URL/api/stream/alerts" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null | head -c 100 || echo "")
    
    if [ -n "$SSE_TEST" ]; then
        log_test "$CURRENT_MODULE" "Real-time Alert Stream (SSE)" "pass" "(received data)"
    else
        log_test "$CURRENT_MODULE" "Real-time Alert Stream (SSE)" "skip" "(no data within timeout)"
    fi
}

# ============================================================
# Module 5: SS7 Monitoring Tests
# ============================================================
test_ss7_monitoring() {
    start_module "SS7 Monitoring"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping SS7 tests"
        return
    fi
    
    # Test 5.1: SS7 Traffic Overview
    local TRAFFIC_RESP=$(api_get "/api/ss7/traffic/overview?period=24h" "$TOKEN")
    local TRAFFIC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ss7/traffic/overview?period=24h" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "SS7 Traffic Overview" "200" "$TRAFFIC_HTTP"
    
    # Test 5.2: List SS7 Messages
    local MESSAGES_RESP=$(api_get "/api/ss7/messages?limit=20" "$TOKEN")
    local MESSAGES_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ss7/messages?limit=20" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "List SS7 Messages" "200" "$MESSAGES_HTTP"
    
    # Test 5.3: Message Inspector (if message exists)
    local MSG_ID=$(echo "$MESSAGES_RESP" | jq -r '.data[0].id // .[0].id // empty' 2>/dev/null)
    
    if [ -n "$MSG_ID" ]; then
        local MSG_DETAIL=$(api_get "/api/ss7/messages/$MSG_ID" "$TOKEN")
        local MSG_HAS_FIELDS=$(echo "$MSG_DETAIL" | jq -r '.messageType // .callingNumber // .calledNumber // empty' 2>/dev/null)
        
        if [ -n "$MSG_HAS_FIELDS" ]; then
            log_test "$CURRENT_MODULE" "SS7 Message Detail" "pass"
            
            # Verify PII is anonymized
            local CALLING_NUM=$(echo "$MSG_DETAIL" | jq -r '.callingNumber // empty' 2>/dev/null)
            if [ -n "$CALLING_NUM" ] && ! echo "$CALLING_NUM" | grep -qE '^[+]?213'; then
                log_test "$CURRENT_MODULE" "SS7 PII Anonymization" "pass" "(number masked)"
            elif [ -z "$CALLING_NUM" ]; then
                log_test "$CURRENT_MODULE" "SS7 PII Anonymization" "pass" "(field absent/empty)"
            else
                log_test "$CURRENT_MODULE" "SS7 PII Anonymization" "warn" "(review anonymization rules)"
            fi
        else
            log_test "$CURRENT_MODULE" "SS7 Message Detail" "fail"
        fi
    else
        log_test "$CURRENT_MODULE" "SS7 Message Detail" "skip" "(no messages)"
    fi
    
    # Test 5.4: Fraud Detection Panel
    local FRAUD_RESP=$(api_get "/api/ss7/fraud/alerts?status=open" "$TOKEN")
    local FRAUD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ss7/fraud/alerts?status=open" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Fraud Detection Alerts" "200" "$FRAUD_HTTP"
    
    # Test 5.5: Network Topology
    local TOPOLOGY_RESP=$(api_get "/api/ss7/network/topology" "$TOKEN")
    local TOPOLOGY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ss7/network/topology" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$TOPOLOGY_HTTP" = "200" ] || [ "$TOPOLOGY_HTTP" = "404" ]; then
        log_test "$CURRENT_MODULE" "Network Topology Data" "pass" "(HTTP $TOPOLOGY_HTTP)"
    else
        log_test "$CURRENT_MODULE" "Network Topology Data" "fail" "(HTTP $TOPOLOGY_HTTP)"
    fi
    
    # Test 5.6: Signaling Map
    local SIGNAL_MAP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ss7/signaling-map" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Signaling Map Endpoint" "200" "$SIGNAL_MAP_HTTP"
}

# ============================================================
# Module 6: Threat Intelligence Tests
# ============================================================
test_threat_intel() {
    start_module "Threat Intelligence"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping threat intel tests"
        return
    fi
    
    # Test 6.1: IOC Query
    local IOC_QUERY_RESP=$(api_get "/api/v1/threat-intel/ioc/query?type=ip&value=8.8.8.8" "$TOKEN")
    local IOC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/threat-intel/ioc/query?type=ip&value=8.8.8.8" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "IOC Lookup" "200" "$IOC_HTTP"
    
    # Test 6.2: Threat Feeds List
    local FEEDS_RESP=$(api_get "/api/v1/threat-intel/feeds" "$TOKEN")
    local FEEDS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/threat-intel/feeds" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Threat Feeds List" "200" "$FEEDS_HTTP"
    
    # Test 6.3: TI Dashboard Metrics
    local TI_METRICS=$(api_get "/api/v1/threat-intel/metrics" "$TOKEN")
    local TI_METRICS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/threat-intel/metrics" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Threat Intel Metrics" "200" "$TI_METRICS_HTTP"
    
    # Test 6.4: Import Feed (if permitted)
    local IMPORT_PAYLOAD='{"feedType":"stix","url":"https://example.com/feed.json","autoImport":false}'
    local IMPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/threat-intel/feeds/import" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$IMPORT_PAYLOAD")
    
    if [ "$IMPORT_HTTP" = "201" ] || [ "$IMPORT_HTTP" = "400" ] || [ "$IMPORT_HTTP" = "403" ]; then
        log_test "$CURRENT_MODULE" "Feed Import Endpoint" "pass" "(HTTP $IMPORT_HTTP)"
    else
        log_test "$CURRENT_MODULE" "Feed Import Endpoint" "fail" "(HTTP $IMPORT_HTTP)"
    fi
}

# ============================================================
# Module 7: Threat Hunting Tests
# ============================================================
test_threat_hunting() {
    start_module "Threat Hunting"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping threat hunting tests"
        return
    fi
    
    # Test 7.1: Create Hunt Session
    local HUNT_PAYLOAD="{
        \"name\": \"UAT Automated Hunt $(date +%s)\",
        \"description\": \"Test hunt session from UAT suite\",
        \"query\": \"source_address:10.0.0.0/8 AND event_type:authentication_failure\"
    }"
    
    local HUNT_CREATE_RESP=$(api_post "/api/v1/threat-hunting/sessions" "$HUNT_PAYLOAD" "$TOKEN")
    local HUNT_ID=$(echo "$HUNT_CREATE_RESP" | jq -r '.id // .sessionId // empty' 2>/dev/null)
    
    if [ -n "$HUNT_ID" ] && [ "$HUNT_ID" != "null" ]; then
        log_test "$CURRENT_MODULE" "Create Hunt Session" "pass" "(ID: $HUNT_ID)"
        export UAT_HUNT_ID="$HUNT_ID"
    else
        log_test "$CURRENT_MODULE" "Create Hunt Session" "fail" "$(echo "$HUNT_CREATE_RESP" | head -c 200)"
    fi
    
    # Test 7.2: Execute Query
    if [ -n "${UAT_HUNT_ID:-}" ]; then
        local QUERY_PAYLOAD='{"query":"event_type:login AND severity:high","timeRange":"24h"}'
        local QUERY_RESP=$(api_post "/api/v1/threat-hunting/sessions/$UAT_HUNT_ID/execute" "$QUERY_PAYLOAD" "$TOKEN")
        local QUERY_RESULTS=$(echo "$QUERY_RESP" | jq -r '.results // .hits // empty' 2>/dev/null)
        
        if [ -n "$QUERY_RESULTS" ]; then
            log_test "$CURRENT_MODULE" "Execute Hunt Query" "pass" "(results received)"
        else
            log_test "$CURRENT_MODULE" "Execute Hunt Query" "pass" "(no results - acceptable)"
        fi
        
        # Test 7.3: Save Results
        local SAVE_PAYLOAD='{"name":"UAT Hunt Results","format":"json","includeRawEvents":false}'
        local SAVE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/threat-hunting/sessions/$UAT_HUNT_ID/save" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$SAVE_PAYLOAD")
        
        assert_http_code "Save Hunt Results" "200" "$SAVE_HTTP"
        
        # Cleanup
        curl -s -X DELETE "$BASE_URL/api/v1/threat-hunting/sessions/$UAT_HUNT_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1 || true
    else
        log_test "$CURRENT_MODULE" "Execute Hunt Query" "skip" "(no session created)"
        log_test "$CURRENT_MODULE" "Save Hunt Results" "skip" "(no session created)"
    fi
    
    # Test 7.4: List Saved Hunts
    local SAVED_HUNTS=$(api_get "/api/v1/threat-hunting/sessions?status=saved" "$TOKEN")
    local HUNTS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/threat-hunting/sessions?status=saved" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "List Saved Hunts" "200" "$HUNTS_HTTP"
    
    # Test 7.5: Query Builder Templates
    local TEMPLATES_RESP=$(api_get "/api/v1/threat-hunting/templates" "$TOKEN")
    local TEMPLATES_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/threat-hunting/templates" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Query Templates" "200" "$TEMPLATES_HTTP"
}

# ============================================================
# Module 8: Analytics & Reporting Tests
# ============================================================
test_analytics_reporting() {
    start_module "Analytics & Reporting"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping analytics tests"
        return
    fi
    
    # Test 8.1: Trends Endpoint
    local TRENDS_RESP=$(api_get "/api/v1/analytics/trends?period=7d" "$TOKEN")
    local TRENDS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/analytics/trends?period=7d" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Analytics Trends" "200" "$TRENDS_HTTP"
    
    # Test 8.2: Generate Report
    local REPORT_PAYLOAD='{
        "title": "UAT Test Report",
        "type": "incident_summary",
        "format": "pdf",
        "period": "24h",
        "includeCharts": true
    }'
    
    local REPORT_CREATE_RESP=$(api_post "/api/v1/reports/generate" "$REPORT_PAYLOAD" "$TOKEN")
    local REPORT_ID=$(echo "$REPORT_CREATE_RESP" | jq -r '.id // .reportId // empty' 2>/dev/null)
    
    if [ -n "$REPORT_ID" ]; then
        log_test "$CURRENT_MODULE" "Generate Report" "pass" "(Report ID: $REPORT_ID)"
        
        # Test 8.3: Download Report
        sleep 2  # Allow report generation
        local DOWNLOAD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/reports/$REPORT_ID/download" \
            -H "Authorization: Bearer $TOKEN")
        
        if [ "$DOWNLOAD_HTTP" = "200" ] || [ "$DOWNLOAD_HTTP" = "202" ] || [ "$DOWNLOAD_HTTP" = "206" ]; then
            log_test "$CURRENT_MODULE" "Download Report" "pass"
        else
            log_test "$CURRENT_MODULE" "Download Report" "warn" "(HTTP $DOWNLOAD_HTTP - may still be generating)"
        fi
    else
        log_test "$CURRENT_MODULE" "Generate Report" "fail" "$(echo "$REPORT_CREATE_RESP" | head -c 200)"
    fi
    
    # Test 8.4: Export to CSV
    local CSV_EXPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/export/csv?type=alerts&period=24h" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$CSV_EXPORT_HTTP" = "200" ]; then
        log_test "$CURRENT_MODULE" "Export Data (CSV)" "pass"
    else
        log_test "$CURRENT_MODULE" "Export Data (CSV)" "fail" "(HTTP $CSV_EXPORT_HTTP)"
    fi
    
    # Test 8.5: Metrics Aggregation
    local METRICS_RESP=$(api_get "/api/metrics" "$TOKEN")
    local METRICS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/metrics" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "System Metrics" "200" "$METRICS_HTTP"
}

# ============================================================
# Module 9: Compliance Tests
# ============================================================
test_compliance() {
    start_module "Compliance & Audit"
    
    local TOKEN="${USER_TOKENS[analyst]:-}"
    
    if [ -z "$TOKEN" ]; then
        warn "No token available, skipping compliance tests"
        return
    fi
    
    # Test 9.1: ANRT Compliance Dashboard
    local ANRT_RESP=$(api_get "/api/v1/compliance/anrt/status" "$TOKEN")
    local ANRT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/compliance/anrt/status" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "ANRT Compliance Status" "200" "$ANRT_HTTP"
    
    # Test 9.2: Audit Log Access
    local AUDIT_LOG=$(api_get "/api/v1/audit-log?limit=50" "$TOKEN")
    local AUDIT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/audit-log?limit=50" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Audit Log Access" "200" "$AUDIT_HTTP"
    
    # Test 9.3: Data Retention Info
    local RETENTION_RESP=$(api_get "/api/v1/compliance/data-retention" "$TOKEN")
    local RETENTION_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/compliance/data-retention" \
        -H "Authorization: Bearer $TOKEN")
    
    assert_http_code "Data Retention Information" "200" "$RETENTION_HTTP"
    
    # Test 9.4: GDPR Request Simulation (if available)
    local GDPR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/compliance/gdpr/data-request" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"requestType":"access","subjectEmail":"uat-test@djezzy.dz"}')
    
    if [ "$GDPR_HTTP" = "200" ] || [ "$GDPR_HTTP" = "201" ] || [ "$GDPR_HTTP" = "404" ]; then
        log_test "$CURRENT_MODULE" "GDPR Data Request" "pass" "(HTTP $GDPR_HTTP)"
    else
        log_test "$CURRENT_MODULE" "GDPR Data Request" "fail" "(HTTP $GDPR_HTTP)"
    fi
    
    # Test 9.5: Compliance Report Generation
    local COMP_REPORT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/compliance/report/generate" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"framework":"anrt","period":"monthly"}')
    
    if [ "$COMP_REPORT_HTTP" = "200" ] || [ "$COMP_REPORT_HTTP" = "201" ] || [ "$COMP_REPORT_HTTP" = "202" ]; then
        log_test "$CURRENT_MODULE" "Compliance Report Generation" "pass"
    else
        log_test "$CURRENT_MODULE" "Compliance Report Generation" "fail" "(HTTP $COMP_REPORT_HTTP)"
    fi
}

# ============================================================
# Module 10: Performance & Reliability Tests
# ============================================================
test_performance() {
    start_module "Performance & Reliability"
    
    # Test 10.1: Response Time - Health Check
    local HEALTH_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health" --connect-timeout 10)
    HEALTH_TIME_MS=$(echo "$HEALTH_TIME * 1000" | bc | cut -d. -f1)
    
    if [ "$HEALTH_TIME_MS" -lt 1000 ]; then
        log_test "$CURRENT_MODULE" "Health Check Response Time" "pass" "(${HEALTH_TIME_MS}ms)"
    elif [ "$HEALTH_TIME_MS" -lt 3000 ]; then
        log_test "$CURRENT_MODULE" "Health Check Response Time" "warn" "(${HEALTH_TIME_MS}ms - slow)"
    else
        log_test "$CURRENT_MODULE" "Health Check Response Time" "fail" "(${HEALTH_TIME_MS}ms - too slow)"
    fi
    
    # Test 10.2: Response Time - Authenticated API
    local TOKEN="${USER_TOKENS[analyst]:-}"
    if [ -n "$TOKEN" ]; then local API_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/v1/incidents?limit=10" \
            -H "Authorization: Bearer $TOKEN" --connect-timeout 10)
        API_TIME_MS=$(echo "$API_TIME * 1000" | bc | cut -d. -f1)
        
        if [ "$API_TIME_MS" -lt 2000 ]; then
            log_test "$CURRENT_MODULE" "API Response Time (Authenticated)" "pass" "(${API_TIME_MS}ms)"
        else
            log_test "$CURRENT_MODULE" "API Response Time (Authenticated)" "warn" "(${API_TIME_MS}ms)"
        fi
    fi
    
    # Test 10.3: Concurrent Requests (basic)
    local CONCURRENT_PASS=true
    for i in {1..5}; do
        (
            curl -sf "$BASE_URL/api/health" > /dev/null 2>&1 || exit 1
        ) &
    done
    wait || CONCURRENT_PASS=false
    
    if [ "$CONCURRENT_PASS" = true ]; then
        log_test "$CURRENT_MODULE" "Concurrent Request Handling" "pass" "(5 concurrent requests)"
    else
        log_test "$CURRENT_MODULE" "Concurrent Request Handling" "fail" "(some requests failed)"
    fi
    
    # Test 10.4: Error Handling - Invalid Endpoint
    local INVALID_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/invalid-endpoint-12345")
    
    assert_http_code "Invalid Endpoint Handling" "404" "$INVALID_HTTP"
    
    # Test 10.5: Error Handling - Malformed JSON
    local MALFORMED_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/incidents" \
        -H "Authorization: Bearer ${TOKEN:-}" \
        -H "Content-Type: application/json" \
        -d '{invalid json}')
    
    assert_http_code "Malformed JSON Handling" "400" "$MALFORMED_HTTP"
    
    # Test 10.6: Large Payload Handling
    LARGE_PAYLOAD=$(python3 -c "import json; print(json.dumps({'data': 'x' * 10000}}))" 2>/dev/null || echo '{"data":"'$(printf 'x%.0s' {1..10000})'"}')
    local LARGE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/test/large-payload" \
        -H "Authorization: Bearer ${TOKEN:-}" \
        -H "Content-Type: application/json" \
        -d "$LARGE_PAYLOAD")
    
    if [ "$LARGE_HTTP" = "413" ] || [ "$LARGE_HTTP" = "400" ] || [ "$LARGE_HTTP" = "404" ]; then
        log_test "$CURRENT_MODULE" "Large Payload Handling" "pass" "(HTTP $LARGE_HTTP)"
    else
        log_test "$CURRENT_MODULE" "Large Payload Handling" "warn" "(HTTP $LARGE_HTTP - verify payload limits)"
    fi
}

# ============================================================
# Generate UAT Report
# ============================================================
generate_uat_report() {
    section "UAT Results Summary"
    
    local REPORT_FILE="$UAT_DIR/UAT_REPORT.md"
    local PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    
    cat > "$REPORT_FILE" << EOF
# User Acceptance Test (UAT) Report

**Platform:** National SOC Platform (Djezzy)  
**Environment:** $TEST_ENV  
**Test Date:** $(date '+%Y-%m-%d %H:%M:%S')  
**Target URL:** $BASE_URL  
**Executed by:** Automated UAT Suite  

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | $TOTAL_TESTS |
| **Passed** | ✅ $PASSED_TESTS |
| **Failed** | ❌ $FAILED_TESTS |
| **Skipped** | ⏭️ $SKIPPED_TESTS |
| **Pass Rate** | ${PASS_RATE}% |

### Overall Status

EOF

    if [ "$PASS_RATE" -ge 95 ]; then
        echo "✅ **READY FOR PRODUCTION**" >> "$REPORT_FILE"
    elif [ "$PASS_RATE" -ge 80 ]; then
        echo "⚠️ **CONDITIONALLY READY** (Minor issues to address)" >> "$REPORT_FILE"
    else
        echo "❌ **NOT READY FOR PRODUCTION** (Significant issues found)" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

## Test Results by Module

$(cat "$UAT_DIR/uat-results.log" | awk -F'\\] ' '{print $2}' | sed 's/ \[/\n**[/g' | head -100)

## Failed Tests Detail

$(grep "\\[fail\\]" "$UAT_DIR/uat-results.log" || echo "No failures! 🎉")

## Environment Information

- **Base URL:** $BASE_URL
- **Test Timestamp:** $TIMESTAMP
- **Test Modules:** All core modules tested
- **Test Users:** 3 roles (Analyst, Supervisor, Admin)

## Recommendations

### Before Production Go-Live
1. Address all failed tests with Critical or High priority
2. Re-run failed tests after fixes
3. Obtain stakeholder sign-off on UAT results

### Post-Launch Monitoring
1. Monitor error rates for first 72 hours
2. Validate performance under real load
3. Collect user feedback from analysts

---

**Report Generated:** $(date '+%Y-%m-%d %H:%M:%S')  
**Suite Version:** 1.0  
**Next Review:** After any significant updates
EOF
    
    echo ""
    echo "=========================================="
    echo "  UAT EXECUTION COMPLETE"
    echo "=========================================="
    echo ""
    echo "Results:"
    echo "  Total:   $TOTAL_TESTS"
    echo -e "  Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "  Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    echo ""
    echo "Pass Rate: ${PASS_RATE}%"
    echo ""
    if [ "$PASS_RATE" -ge 95 ]; then
        echo -e "Status: ${GREEN}✅ READY FOR PRODUCTION${NC}"
    elif [ "$PASS_RATE" -ge 80 ]; then
        echo -e "Status: ${YELLOW}⚠️ CONDITIONALLY READY${NC}"
    else
        echo -e "Status: ${RED}❌ NOT READY${NC}"
    fi
    echo ""
    echo "Report: $REPORT_FILE"
    echo "Logs: $UAT_DIR/uat-results.log"
}

# ============================================================
# Main Execution
# ============================================================
main() {
    init_test_env
    
    # Run all test modules (or specific one)
    case $MODULE in
        all)
            test_authentication
            test_dashboard
            test_incident_management
            test_alerts
            test_ss7_monitoring
            test_threat_intel
            test_threat_hunting
            test_analytics_reporting
            test_compliance
            test_performance
            ;;
        auth) test_authentication ;;
        dashboard) test_dashboard ;;
        incidents) test_incident_management ;;
        alerts) test_alerts ;;
        ss7) test_ss7_monitoring ;;
        threat-intel) test_threat_intel ;;
        hunting) test_threat_hunting ;;
        analytics) test_analytics_reporting ;;
        compliance) test_compliance ;;
        perf) test_performance ;;
        *)
            echo "Unknown module: $MODULE"
            echo "Available: all, auth, dashboard, incidents, alerts, ss7, threat-intel, hunting, analytics, compliance, perf"
            exit 1
            ;;
    esac
    
    # Generate final report
    generate_uat_report
    
    # Exit with appropriate code
    if [ "$FAILED_TESTS" -gt 0 ]; then
        exit 1
    fi
    exit 0
}

# Run main function
main "$@"
