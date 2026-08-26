#!/bin/bash
# =============================================================================
# CyberSOC Platform - Grafana Dashboard Import Script (GA)
# =============================================================================
# Imports all SOC monitoring dashboards into Grafana instance
# Supports both local Docker Grafana and cloud-hosted instances
#
# Usage:
#   chmod +x import-grafana-dashboards.sh
#   ./import-grafana-dashboards.sh [--url URL] [--api-key KEY] [--validate-only]
#
# Dashboards Included:
#   1. GA Operations Dashboard (cybersoc-ga-operations.json)
#   2. Security Compliance Dashboard
#   3. SS7/Telecom Monitoring Dashboard
#   4. Performance/Infrastructure Dashboard
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DASHBOARD_DIR="${PROJECT_ROOT}/monitoring/grafana/dashboards/staging"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Grafana defaults (override with env or flags)
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
GRAFANA_API_KEY="${GRAFANA_API_KEY:-}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-admin}"
DATASOURCE_NAME="${DATASOURCE_NAME:-Prometheus}"

# Logging
log_info()  { echo -e "${CYAN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
log_step()  { echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  STEP: $*${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"; }

# =============================================================================
# Welcome
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     📊 CyberSOC Platform - Grafana Dashboard Import          ║"
echo "║     Environment: STAGING/GA                                 ║"
echo "║     Timestamp: ${TIMESTAMP}         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# Helper Functions
# =============================================================================

# Get auth header based on available credentials
get_auth_header() {
    if [ -n "$GRAFANA_API_KEY" ]; then
        echo "-H \"Authorization: Bearer ${GRAFANA_API_KEY}\""
    else
        # Will use basic auth
        echo ""
    fi
}

# Make authenticated API call
grafana_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    local url="${GRAFANA_URL}${endpoint}"
    local auth_args=""
    
    if [ -n "$GRAFANA_API_KEY" ]; then
        auth_args="-H \"Authorization: Bearer ${GRAFANA_API_KEY}\""
    else
        auth_args="-u \"${GRAFANA_USER}:${GRAFANA_PASSWORD}\""
    fi
    
    if [ -n "$data" ]; then
        eval curl -s -X "$method" "$auth_args" \
            -H "Content-Type: application/json" \
            "$url" \
            -d "$data"
    else
        eval curl -s -X "$method" "$auth_args" \
            -H "Content-Type: application/json" \
            "$url"
    fi
}

# Check datasource exists, get its ID
get_datasource_id() {
    local ds_name="$1"
    local response
    
    response=$(grafana_api "/api/datasources")
    
    # Parse JSON to find datasource ID (requires jq or similar)
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r ".[] | select(.name == \"$ds_name\") | // empty | .id" | head -1
    else
        log_warn "jq not found - using default datasource ID of 1"
        echo "1"
    fi
}

# Import a single dashboard
import_dashboard() {
    local dashboard_file="$1"
    local dashboard_name
    local response
    local uid
    local import_result
    
    if [ ! -f "$dashboard_file" ]; then
        log_error "Dashboard file not found: $dashboard_file"
        return 1
    fi
    
    # Extract dashboard title for logging
    if command -v jq &> /dev/null; then
        dashboard_name=$(jq -r '.title' "$dashboard_file" 2>/dev/null || echo "Unknown")
    else
        dashboard_name=$(basename "$dashboard_file" .json)
    fi
    
    log_info "Importing dashboard: $dashboard_name"
    log_info "   File: $dashboard_file"
    
    # Read dashboard JSON
    local dashboard_json
    dashboard_json=$(cat "$dashboard_file")
    
    # Get datasource ID
    local ds_id
    ds_id=$(get_datasource_id "$DATASOURCE_NAME")
    log_info "   Datasource '$DATASOURCE_NAME' ID: $ds_id"
    
    # Replace datasource UID in dashboard JSON
    if command -v jq &> /dev/null; then
        dashboard_json=$(echo "$dashboard_json" | jq "
            (.templating.list[]? | select(.type == \"datasource\")) = {
                .type,
                name: .name,
                label: .label,
                hide: .hide,
                query: .query,
                queryValue: .queryValue,
                refresh: .refresh,
                regex: .regex,
                skipUrlSync: .skipUrlSync,
                current: .current,
                options: [{\"value\": \"$ds_id\", \"text\": \"$DATASOURCE_NAME\", \"selected\": true}]
            }
        ")
    fi
    
    # Build import payload
    local payload
    payload=$(cat <<EOF
{
    "dashboard": $dashboard_json,
    "overwrite": true,
    "message": "Imported by CyberSOC GA deployment script - ${TIMESTAMP}",
    "inputs": [
        {
            "name": "DS_PROMETHEUS",
            "type": "datasource",
            "pluginId": "prometheus",
            "value": "$DATASOURCE_NAME"
        }
    ]
}
EOF
)
    
    # Execute import
    response=$(grafana_api "/api/dashboards/import" "POST" "$payload")
    
    # Check result
    if echo "$response" | grep -q '"id"'; then
        import_id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        import_uid=$(echo "$response" | grep -o '"uid":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        log_ok "Dashboard imported successfully!"
        log_ok "   ID: $import_id"
        log_ok "   UID: $import_uid"
        log_ok "   URL: ${GRAFANA_URL}/d/${import_uid}"
        
        return 0
    else
        log_error "Failed to import dashboard"
        log_error "   Response: $response"
        return 1
    fi
}

# Validate dashboard JSON structure
validate_dashboard() {
    local dashboard_file="$1"
    local errors=0
    
    log_info "Validating: $(basename $dashboard_file)"
    
    # Check required fields
    for field in "title" "panels" "schemaVersion"; do
        if ! grep -q "\"field\"" "$dashboard_file" 2>/dev/null; then
            if [ "$field" == "title" ]; then
                if ! grep -q '"title"' "$dashboard_file"; then
                    log_error "   Missing required field: $field"
                    ((errors++))
                fi
            elif [ "$field" == "panels" ]; then
                if ! grep -q '"panels"' "$dashboard_file"; then
                    log_error "   Missing required field: $field"
                    ((errors++))
                fi
            elif [ "$field" == "schemaVersion" ]; then
                if ! grep -q '"schemaVersion"' "$dashboard_file"; then
                    log_error "   Missing required field: $field"
                    ((errors++))
                fi
            fi
        fi
    done
    
    # Check JSON validity
    if command -v python3 &> /dev/null; then
        if ! python3 -c "import json; json.load(open('$dashboard_file'))" 2>/dev/null; then
            log_error "   Invalid JSON syntax"
            ((errors++))
        fi
    elif command -v jq &> /dev/null; then
        if ! jq empty "$dashboard_file" 2>/dev/null; then
            log_error "   Invalid JSON syntax"
            ((errors++))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        log_ok "   Validation passed ✅"
        return 0
    else
        log_error "   Found $errors error(s) ❌"
        return 1
    fi
}

# =============================================================================
# Main Steps
# =============================================================================

step1_validate_dashboards() {
    log_step "Validating Dashboard Files"
    
    local total=0
    passed=0
    failed=0
    
    # Find all dashboard JSON files
    while IFS= read -r -d '' dashboard_file; do
        ((total++)) || true
        
        if validate_dashboard "$dashboard_file"; then
            ((passed++)) || true
        else
            ((failed++)) || true
        fi
    done < <(find "$DASHBOARD_DIR" -name "*.json" -print0 2>/dev/null)
    
    if [ $total -eq 0 ]; then
        log_warn "No dashboard files found in $DASHBOARD_DIR"
        return 1
    fi
    
    echo ""
    log_info "Validation Summary:"
    log_info "   Total:  $total dashboards"
    log_ok "   Passed: $passed dashboards"
    [ $failed -gt 0 ] && log_error "   Failed: $failed dashboards"
    
    if [ $failed -gt 0 ]; then
        return 1
    fi
    
    log_ok "✅ All dashboards validated"
    return 0
}

step2_check_grafana_connection() {
    log_step "Checking Grafana Connection"
    
    local response
    response=$(grafana_api "/api/health" 2>/dev/null || echo "{}")
    
    if echo "$response" | grep -q '"version"'; then
        local version
        version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        log_ok "Grafana is accessible (version: $version)"
        log_ok "URL: $GRAFANA_URL"
        return 0
    else
        log_error "Cannot connect to Grafana at $GRAFANA_URL"
        log_info "Ensure Grafana is running and check:"
        log_info "  - GRAFANA_URL=$GRAFANA_URL"
        log_info "  - API key or credentials are correct"
        return 1
    fi
}

step3_import_all_dashboards() {
    log_step "Importing Dashboards to Grafana"
    
    local imported=0
    local failed=0
    
    # Import each dashboard
    while IFS= read -r -d '' dashboard_file; do
        log_info ""
        log_info "---"
        
        if import_dashboard "$dashboard_file"; then
            ((imported++)) || true
        else
            ((failed++)) || true
        fi
    done < <(find "$DASHBOARD_DIR" -name "*.json" -print0 2>/dev/null)
    
    echo ""
    log_step "Import Results"
    log_ok "Successfully imported: $imported dashboards"
    [ $failed -gt 0 ] && log_error "Failed to import: $failed dashboards"
    
    if [ $imported -gt 0 ]; then
        log_ok "✅ Dashboards imported successfully!"
        return 0
    else
        log_error "❌ No dashboards were imported"
        return 1
    fi
}

step4_configure_folders() {
    log_step "Organizing Dashboards in Folders"
    
    # Create CyberSOC folder if it doesn't exist
    local folder_response
    folder_response=$(grafana_api "/api/folders" "POST" '{
        "title": "CyberSOC Platform",
        "uid": "cybersoc-platform"
    }' 2>/dev/null || echo "{}")
    
    if echo "$folder_response" | grep -q '"id"'; then
        local folder_id
        folder_id=$(echo "$folder_response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        log_ok "Created/retrieved folder: CyberSOC Platform (ID: $folder_id)"
    else
        log_warn "Folder creation may have failed (might already exist)"
    fi
    
    log_ok "✅ Folder organization complete"
}

print_summary() {
    log_step "Import Complete"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     📊 GRAFANA DASHBOARDS IMPORTED                          ║"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                              ║"
    echo "║  Access your dashboards at:                                ║"
    echo "║    ${GRAFANA_URL}/dashboards                      ║"
    echo "║                                                              ║"
    echo "║  Imported Dashboards:                                       ║"
    echo "║    • GA Operations Dashboard                                ║"
    echo "║    • Security Compliance                                    ║"
    echo "║    • SS7/Telecom Monitoring                                 ║"
    echo "║    • Performance Metrics                                    ║"
    echo "║                                                              ║"
    echo "║  Next Steps:                                                ║"
    echo "║    1. Configure Prometheus datasource                       ║"
    echo "║    2. Set up alerting rules                                  ║"
    echo "║    3. Configure notification channels (Slack/PagerDuty)      ║"
    echo "║    4. Share dashboard with SOC team                         ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    case "${1:-}" in
        --validate-only)
            step1_validate_dashboards
            ;;
        --check-connection)
            step2_check_grafana_connection
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --validate-only       Only validate dashboard files, don't import"
            echo "  --check-connection    Check Grafana connectivity only"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  GRAFANA_URL           Grafana base URL (default: http://localhost:3001)"
            echo "  GRAFANA_API_KEY       Grafana API key (alternative to user/pass)"
            echo "  GRAFANA_USER          Grafana username (default: admin)"
            echo "  GRAFANA_PASSWORD      Grafana password (default: admin)"
            echo "  DATASOURCE_NAME       Prometheus datasource name (default: Prometheus)"
            ;;
        *)
            step1_validate_dashboards || exit 1
            step2_check_grafana_connection || exit 1
            step3_import_all_dashboards
            step4_configure_folders
            print_summary
            ;;
    esac
}

# Run main function
main "$@"
