#!/bin/bash
# ============================================================
# CyberSOC Grafana Dashboard Import Script
# Target: Djezzy Telecom Algeria - Production Monitoring
# Dashboard: Analytics & ML Services (12 panels)
# ============================================================

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_CYAN='\033[0;36m'
COLOR_RESET='\033[0m'

log_info() { echo -e "${COLOR_CYAN}ℹ️  $1${COLOR_RESET}"; }
log_success() { echo -e "${COLOR_GREEN}✅ $1${COLOR_RESET}"; }
log_warn() { echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"; }
log_error() { echo -e "${COLOR_RED}❌ $1${COLOR_RESET}"; }

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
GRAFANA_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_PASS="${GRAFANA_ADMIN_PASSWORD:-admin}"
DASHBOARD_FILE="/home/z/my-project/monitoring/grafana/dashboards/analytics/analytics-ml-dashboard.json"
DASHBOARD_UID="cybersoc-analytics-ml-dashboard"
DASHBOARD_TITLE="CyberSOC Analytics & ML Dashboard"

echo "============================================================"
echo "  CyberSOC Grafana Dashboard Import"
echo "  Target: grafana.soc.djezzy.dz"
echo "  Dashboard: $DASHBOARD_TITLE"
echo "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================================"
echo ""

# ---------------------------------------------------------
# Prerequisites Check
# ---------------------------------------------------------
log_info "Checking prerequisites..."

# Check if jq is installed
if ! command -v jq &>/dev/null; then
    log_error "jq is required but not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y jq
fi

# Check if curl is installed
if ! command -v curl &>/dev/null; then
    log_error "curl is required but not installed."
    exit 1
fi

# Check dashboard file exists
if [ ! -f "$DASHBOARD_FILE" ]; then
    log_error "Dashboard file not found: $DASHBOARD_FILE"
    exit 1
fi

log_success "Prerequisites check passed"

# ---------------------------------------------------------
# Validate Dashboard JSON
# ---------------------------------------------------------
log_info "Validating dashboard JSON structure..."

if jq empty "$DASHBOARD_FILE" 2>/dev/null; then
    log_success "Dashboard JSON is valid"
else
    log_error "Dashboard JSON is invalid"
    exit 1
fi

# Extract and verify key fields
DASHBOARD_TITLE_CHECK=$(jq -r '.title' "$DASHBOARD_FILE")
PANEL_COUNT=$(jq '.panels | length' "$DASHBOARD_FILE")

log_success "Dashboard: $DASHBOARD_TITLE_CHECK"
log_success "Panels: $PANEL_COUNT configured"

if [ "$PANEL_COUNT" -lt 10 ]; then
    log_warn "Expected at least 10 panels, found $PANEL_COUNT"
fi

echo ""

# ---------------------------------------------------------
# Method 1: Grafana HTTP API Import (Recommended)
# ---------------------------------------------------------
log_info "Method 1: Grafana HTTP API Import"
echo "------------------------------------------------------------"

# Check Grafana connectivity
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    --user "$GRAFANA_USER:$GRAFANA_PASS" \
    "$GRAFANA_URL/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "Grafana is reachable at $GRAFANA_URL"
    
    # Prepare dashboard payload for import
    # Set overwrite=true to update existing dashboard
    PAYLOAD=$(jq \
        --argjson dashboard "$(cat $DASHBOARD_FILE)" \
        --argjson overwrite "true" \
        --argjson message "Imported via CyberSOC deployment automation - $(date -u '+%Y-%m-%d %H:%M:%S UTC')" \
        '{
            dashboard: $dashboard | .id = null,
            overwrite: $overwrite,
            message: $message,
            folder: "CyberSOC",
            folderUid: "cybersoc-folder"
        }' <<< '{}')
    
    # Import dashboard via API
    log_info "Importing dashboard via API..."
    
    RESPONSE=$(curl -sk -X POST \
        --user "$GRAFANA_USER:$GRAFANA_PASS" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        "$GRAFANA_URL/api/dashboards/db" 2>/dev/null)
    
    if echo "$RESPONSE" | jq -e '.uid' >/dev/null 2>&1; then
        IMPORTED_UID=$(echo "$RESPONSE" | jq -r '.uid')
        IMPORTED_URL="$GRAFANA_URL/d/$IMPORTED_UID"
        log_success "Dashboard imported successfully!"
        log_success "UID: $IMPORTED_UID"
        log_success "URL: $IMPORTED_URL"
        
        # Set dashboard home (star)
        curl -sk -X POST \
            --user "$GRAFANA_USER:$GRAFANA_PASS" \
            "$GRAFANA_API/user/stars/dashboard/$IMPORTED_UID" >/dev/null 2>&1 || true
        
    else
        log_warn "API import response: $RESPONSE"
        log_info "Falling back to provisioning method..."
    fi
    
else
    log_warn "Grafana not reachable at $GRAFANA_URL (HTTP $HTTP_CODE)"
    log_info "Use provisioning method for cluster deployment"
fi

echo ""

# ---------------------------------------------------------
# Method 2: Kubernetes ConfigMap Provisioning (Production)
# ---------------------------------------------------------
log_info "Method 2: Kubernetes ConfigMap Provisioning"
echo "------------------------------------------------------------"

CONFIGMAP_NAME="grafana-dashboard-analytics-ml"
NAMESPACE="monitoring"

log_info "Creating ConfigMap for dashboard provisioning..."

# Create ConfigMap YAML
cat > /tmp/grafana-dashboard-cm.yaml << CM_EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: $CONFIGMAP_NAME
  namespace: $NAMESPACE
  labels:
    grafana_dashboard: "1"
    app.kubernetes.io/name: grafana
    app.kubernetes.io/component: dashboard
    cybersoc.djezzy.dz/analytics: "true"
    cybersoc.djezzy.dz/environment: production
  annotations:
    cybersoc.djezzy.dz/version: "1.0.0"
    cybersoc.djezzy.dz/deployed-at: "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
data:
  analytics-ml-dashboard.json: |
CM_EOF

# Append dashboard JSON with proper indentation (6 spaces for YAML)
jq -c '.' "$DASHBOARD_FILE" | sed 's/^/      /' >> /tmp/grafana-dashboard-cm.yaml

log_success "ConfigMap manifest created: /tmp/grafana-dashboard-cm.yaml"

# Show apply command
log_info "To apply to cluster, run:"
echo ""
echo "  kubectl apply -f /tmp/grafana-dashboard-cm.yaml"
echo ""

# If kubectl is available, try to apply
if command -v kubectl &>/dev/null; then
    if kubectl get namespace "$NAMESPACE" &>/dev/null 2>&1; then
        log_info "Applying ConfigMap to cluster..."
        if kubectl apply -f /tmp/grafana-dashboard-cm.yaml 2>&1; then
            log_success "ConfigMap applied successfully!"
            
            # Restart Grafana to pick up new dashboard
            log_info "Restarting Grafana pod to load new dashboard..."
            kubectl rollout restart deployment/grafana -n "$NAMESPACE" 2>/dev/null || \
            kubectl rollout restart statefulset/grafana -n "$NAMESPACE" 2>/dev/null || \
            log_warn "Please restart Grafana manually: kubectl rollout restart deployment/grafana -n $NAMESPACE"
        else
            log_warn "Failed to apply ConfigMap (cluster permissions?)"
        fi
    else
        log_warn "Namespace '$NAMESPACE' not found (cluster unavailable)"
    fi
else
    log_warn "kubectl not available (offline mode)"
fi

echo ""

# ---------------------------------------------------------
# Method 3: Grafana CLI Import (Alternative)
# ---------------------------------------------------------
log_info "Method 3: Grafana CLI Tool (grafana-cli)"
echo "------------------------------------------------------------"

if command -v grafana-cli &>/dev/null; then
    log_info "Importing via grafana-cli..."
    
    grafana-cli --homepath "/usr/share/grafana" \
        --config "/etc/grafana/grafana.ini" \
        dashboards import "$DASHBOARD_FILE" 2>&1 || \
        log_warn "grafana-cli import failed (may need admin credentials)"
else
    log_info "grafana-cli not installed (optional method)"
fi

echo ""

# ---------------------------------------------------------
# Verify Dashboard Panels
# ---------------------------------------------------------
log_info "Dashboard Panel Summary"
echo "------------------------------------------------------------"

# Extract panel information from dashboard
jq -r '.panels[] | "  \(.id | tostring) | \(.type) | \(.title)"' "$DASHBOARD_FILE" 2>/dev/null | while read panel_line; do
    PANEL_ID=$(echo "$panel_line" | cut -d'|' -f1 | xargs)
    PANEL_TYPE=$(echo "$panel_line" | cut -d'|' -f2 | xargs)
    PANEL_TITLE=$(echo "$panel_line" | cut -d'|' -f3- | xargs)
    
    case $PANEL_TYPE in
        gauge)       log_success "Panel $PANEL_ID: $PANEL_TITLE [GAUGE]" ;;
        timeseries)  log_success "Panel $PANEL_ID: $PANEL_TITLE [TIME SERIES]" ;;
        stat)        log_success "Panel $PANEL_ID: $PANEL_TITLE [STAT]" ;;
        table)       log_success "Panel $PANEL_ID: $PANEL_TITLE [TABLE]" ;;
        bar)         log_success "Panel $PANEL_ID: $PANEL_TITLE [BAR CHART]" ;;
        *)           log_info "Panel $PANEL_ID: $PANEL_TITLE [$PANEL_TYPE]" ;;
    esac
done

echo ""

# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------
echo "============================================================"
echo "  GRAFANA IMPORT SUMMARY"
echo "============================================================"
echo ""
echo "  Dashboard: $DASHBOARD_TITLE"
echo "  UID: $DASHBOARD_UID"
echo "  Panels: $PANEL_COUNT"
echo ""
echo "  Access URLs:"
echo "    Grafana:        $GRAFANA_URL"
echo "    Dashboard:      ${GRAFANA_URL}/d/${DASHBOARD_UID}"
echo "    Direct Link:    ${GRAFANA_URL}/d/cybersoc-analytics-ml-dashboard"
echo ""
echo "  Data Sources Required:"
echo "    - Prometheus (primary metrics)"
echo "    - Elasticsearch (behavior logs)"
echo "    - Jaeger (distributed tracing)"
echo "    - Loki (service logs)"
echo ""
echo "  Refresh Interval: 30 seconds"
echo "  Time Range: Default 1 hour"
echo ""
log_success "Grafana dashboard setup complete!"
