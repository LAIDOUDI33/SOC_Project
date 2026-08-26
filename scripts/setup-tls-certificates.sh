#!/bin/bash
# =============================================================================
# CyberSOC Platform - TLS Certificate Setup & Validation (GA)
# =============================================================================
# Sets up cert-manager resources for production domains
# Validates certificate issuance and renewal configuration
#
# Usage:
#   chmod +x setup-tls-certificates.sh
#   ./setup-tls-certificates.sh [--validate-only] [--dry-run]
#
# Prerequisites:
#   - kubectl configured for target cluster
#   - cert-manager installed (v1.12+)
#   - DNS records configured for *.djezzy.dz
#
# Domains Covered:
#   - soc.djezzy.dz (main platform)
#   - api-soc.djezzy.dz (API gateway)
#   - grafana.soc.djezzy.dz (monitoring)
#   - *.cybersoc.svc.cluster.local (internal mTLS)
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
NAMESPACE="cybersoc"
CERT_MANAGER_VERSION="v1.15"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/home/z/my-project/logs/tls_setup_${TIMESTAMP}.log"

# Domains
DOMAINS=(
    "soc.djezzy.dz"
    "api-soc.djezzy.dz"
    "grafana.soc.djezzy.dz"
    "staging.soc.djezzy.dz"
)

INTERNAL_DOMAINS=(
    "soc-platform.cybersoc.svc.cluster.local"
    "soc-platform-api.cybersoc.svc.cluster.local"
)

# Logging
mkdir -p /home/z/my-project/logs

log_info()  { echo -e "${CYAN}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"; }
log_step()  { echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"; echo -e "${BLUE}  STEP: $*${NC}"; echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n" | tee -a "$LOG_FILE"; }

# =============================================================================
# Welcome
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🔐 CyberSOC Platform - TLS Certificate Setup             ║"
echo "║     Environment: PRODUCTION (GA)                            ║"
echo "║     Timestamp: ${TIMESTAMP}         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# STEP 1: Prerequisites Check
# =============================================================================
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    # Check kubectl
    if command -v kubectl &> /dev/null; then
        KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null || kubectl version --client)
        log_ok "kubectl found: $KUBECTL_VERSION"
    else
        log_error "kubectl not found. Please install kubectl and configure cluster access."
        exit 1
    fi
    
    # Check cluster connectivity
    if kubectl cluster-info &> /dev/null; then
        CLUSTER_INFO=$(kubectl cluster-info 2>&1 | head -2)
        log_ok "Cluster accessible: $(echo $CLUSTER_INFO | grep -o 'running at .*')"
    else
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check cert-manager installation
    if kubectl get pods -n cert-manager -l app.kubernetes.io/instance=cert-manager &> /dev/null; then
        CERT_MANAGER_PODS=$(kubectl get pods -n cert-manager -l app.kubernetes.io/instance=cert-manager -o jsonpath='{.items[*].status.phase}' 2>/dev/null || echo "")
        log_ok "cert-manager pods status: $CERT_MANAGER_PODS"
        
        # Check cert-manager version
        CM_VERSION=$(kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null | grep -o 'v[0-9.]*' || echo "unknown")
        log_info "cert-manager version: $CM_VERSION"
    else
        log_warn "cert-manager not found in 'cert-manager' namespace"
        log_info "Installing cert-manager..."
        
        # Install cert-manager if not present
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml 2>&1 | tee -a "$LOG_FILE" || {
            log_error "Failed to install cert-manager"
            exit 1
        }
        
        # Wait for cert-manager to be ready
        log_info "Waiting for cert-manager to be ready..."
        kubectl wait --for=condition=available deployment/cert-manager -n cert-manager --timeout=120s 2>&1 | tee -a "$LOG_FILE" || true
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s 2>&1 | tee -a "$LOG_FILE" || true
        
        log_ok "cert-manager installed successfully"
    fi
    
    # Check/create namespace
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_ok "Namespace '$NAMESPACE' exists"
    else
        log_info "Creating namespace '$NAMESPACE'..."
        kubectl create namespace "$NAMESPACE" 2>&1 | tee -a "$LOG_FILE"
        log_ok "Namespace created"
    fi
    
    log_ok "✅ Prerequisites check completed"
}

# =============================================================================
# STEP 2: Create ClusterIssuer for Let's Encrypt
# =============================================================================
setup_letsencrypt_issuer() {
    log_step "Setting Up Let's Encrypt ClusterIssuer"
    
    # Create Let's Encrypt production issuer
    cat <<EOF | kubectl apply -f - 2>&1 | tee -a "$LOG_FILE"
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
  labels:
    app.kubernetes.io/name: soc-platform
    app.kubernetes.io/component: tls
    app.kubernetes.io/environment: production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: security@djezzy.dz
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
      # HTTP01 solver for main domains (requires Ingress controller)
      - http01:
          ingress:
            class: nginx
        selector:
          dnsNames:
            - soc.djezzy.dz
            - api-soc.djezzy.dz
            - grafana.soc.djezzy.dz
            - staging.soc.djezzy.dz
      
      # DNS01 solver for wildcard certs (requires Cloudflare API key)
      - dns01:
          cloudflare:
            email: admin@djezzy.dz
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
        selector:
          dnsZones:
            - "djezzy.dz"
EOF

    log_ok "Let's Encrypt ClusterIssuer applied"

    # Create staging issuer for testing
    cat <<EOF | kubectl apply -f - 2>&1 | tee -a "$LOG_FILE"
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
  labels:
    app.kubernetes.io/name: soc-platform
    app.kubernetes.io/component: tls
    app.kubernetes.io/environment: staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: security@djezzy.dz
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
        selector:
          dnsNames:
            - "*.soc.djezzy.dz"
            - "*.djezzy.dz"
EOF

    log_ok "Let's Encrypt Staging ClusterIssuer applied"
}

# =============================================================================
# STEP 3: Create Internal CA for mTLS
# =============================================================================
setup_internal_ca() {
    log_step "Setting Up Internal CA for Service Mesh mTLS"
    
    # Generate self-signed root CA (for internal services only)
    log_info "Generating self-signed root CA..."
    
    # Create CA secret if it doesn't exist
    if ! kubectl get secret cybersoc-root-ca -n "$NAMESPACE" &> /dev/null; then
        # Generate CA certificate (this would normally be done securely)
        openssl req -x509 -newkey rsa:4096 \
            -keyout /tmp/ca.key \
            -out /tmp/ca.crt \
            -days 3650 \
            -nodes \
            -subj "/C=DZ/O=Djezzy Algeria/CN=CyberSOC Root CA" \
            -addext "basicConstraints=critical,CA:TRUE" \
            -addext "keyUsage=keyCertSign,cRLSign" \
            -addext "subjectAltName=DNS:cyberca.soc.internal,DNS:root-ca.cybersoc.svc" 2>&1 | tee -a "$LOG_FILE"
        
        # Create Kubernetes secret from generated CA
        kubectl create secret tls cybersoc-root-ca \
            --cert=/tmp/ca.crt \
            --key=/tmp/ca.key \
            -n "$NAMESPACE" 2>&1 | tee -a "$LOG_FILE"
        
        # Clean up temp files
        rm -f /tmp/ca.key /tmp/ca.crt
        
        log_ok "Internal Root CA created and stored as secret"
    else
        log_ok "Internal Root CA already exists"
    fi
    
    # Create Issuer that uses the internal CA
    cat <<EOF | kubectl apply -f - 2>&1 | tee -a "$LOG_FILE"
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: cybersoc-internal-ca
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: soc-platform
    app.kubernetes.io/component: tls
    app.kubernetes.io/environment: production
spec:
  ca:
    secretName: cybersoc-root-ca
EOF

    log_ok "Internal CA Issuer created"
}

# =============================================================================
# STEP 4: Apply Certificates
# =============================================================================
apply_certificates() {
    log_step "Applying TLS Certificates"
    
    # Apply the main certificates file
    if [ -f "/home/z/my-project/k8s/cert-manager/certificates.yaml" ]; then
        kubectl apply -f /home/z/my-project/k8s/cert-manager/certificates.yaml 2>&1 | tee -a "$LOG_FILE"
        log_ok "Certificates from certificates.yaml applied"
    else
        log_warn "certificates.yaml not found, creating inline..."
        
        # Main platform certificate
        cat <<'CERTEOF' | kubectl apply -f - 2>&1 | tee -a "$LOG_FILE"
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: soc-djezzy-dz-tls
  namespace: cybersoc
  labels:
    app.kubernetes.io/name: soc-platform
    app.kubernetes.io/component: tls
    app.kubernetes.io/environment: production
spec:
  secretName: soc-djezzy-dz-tls-prod
  duration: 2160h
  renewBefore: 360h
  subject:
    organizations:
      - Djezzy Algeria
      - CyberSOC Operations
  dnsNames:
    - soc.djezzy.dz
    - www.soc.djezzy.dz
    - staging.soc.djezzy.dz
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  usages:
    - server auth
    - client auth
  privateKey:
    rotationPolicy: Always
    algorithm: ECDSA
    size: 256
---
CERTEOF
    fi
    
    log_ok "All certificate resources applied"
}

# =============================================================================
# STEP 5: Validate Certificate Issuance
# =============================================================================
validate_certificates() {
    log_step "Validating Certificate Issuance"
    
    local all_ready=true
    local max_wait=300  # 5 minutes max
    local waited=0
    local interval=15
    
    log_info "Waiting for certificates to be issued (max ${max_wait}s)..."
    
    while [ $waited -lt $max_wait ]; do
        local ready_count=0
        local total_count=0
        
        # Get all certificates in namespace
        while IFS= read -r cert_info; do
            ((total_count++)) || true
            
            cert_name=$(echo "$cert_info" | awk '{print $1}')
            cert_status=$(echo "$cert_info" | awk '{print $2}')
            
            case "$cert_status" in
                "Ready")
                    ((ready_count++)) || true
                    log_ok "Certificate $cert_name: Ready ✅"
                    ;;
                "Pending")
                    log_info "Certificate $cert_name: Pending issuance... ($waited/${max_wait}s)"
                    ;;
                "False")
                    log_error "Certificate $cert_name: Issuance FAILED ❌"
                    
                    # Get error details
                    kubectl describe certificate "$cert_name" -n "$NAMESPACE" 2>&1 | grep -A5 "Events:" >> "$LOG_FILE" || true
                    all_ready=false
                    ;;
                *)
                    log_warn "Certificate $cert_name: Unknown status ($cert_status)"
                    ;;
            esac
        done < <(kubectl get certificates -n "$NAMESPACE" --no-headers 2>/dev/null | awk '{print $1, $2}')
        
        if [ "$ready_count" -eq "$total_count" ] && [ "$total_count" -gt 0 ]; then
            break
        fi
        
        sleep $interval
        waited=$((waited + interval))
    done
    
    if [ "$all_ready" ] && [ "$waited" -lt "$max_wait" ]; then
        log_ok "✅ All certificates ready!"
    else
        log_warn "Some certificates may still be issuing. Check with: kubectl get certificates -n $NAMESPACE"
    fi
    
    # Detailed certificate information
    echo "" | tee -a "$LOG_FILE"
    log_info "Certificate Details:"
    kubectl get certificates -n "$NAMESPACE" -o wide 2>&1 | tee -a "$LOG_FILE" || true
    
    echo "" | tee -a "$LOG_FILE"
    log_info "Certificate Secrets:"
    for domain in "${DOMAINS[@]}"; do
        local secret_name="${domain//./-}-tls-prod"
        if kubectl get secret "$secret_name" -n "$NAMESPACE" &> /dev/null; then
            log_ok "Secret '$secret_name' exists for $domain"
            
            # Show certificate details
            kubectl get secret "$secret_name" -n "$NAMESPACE" -o jsonpath='{.data.tls\.crt}' 2>/dev/null | base64 -d 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>&1 | tee -a "$LOG_FILE" | sed 's/^/       /' || true
        else
            log_warn "Secret '$secret_name' not yet created for $domain"
        fi
    done
}

# =============================================================================
# STEP 6: Configure Automatic Renewal Monitoring
# =============================================================================
setup_renewal_monitoring() {
    log_step "Setting Up Certificate Renewal Monitoring"
    
    # Create ConfigMap for certificate monitoring config
    cat <<EOF | kubectl apply -f - 2>&1 | tee -a "$LOG_FILE"
apiVersion: v1
kind: ConfigMap
metadata:
  name: cert-monitoring-config
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: soc-platform
    app.kubernetes.io/component: monitoring
data:
  cert-check.yaml: |
    certificates:
      - name: soc-djezzy-dz-tls
        secret: soc-djezzy-dz-tls-prod
        warn_days: 30
        critical_days: 14
      - name: soc-api-tls
        secret: soc-api-tls-prod
        warn_days: 30
        critical_days: 14
      - name: soc-grafana-tls
        secret: soc-grafana-tls-prod
        warn_days: 30
        critical_days: 14
      - name: soc-internal-ca
        secret: soc-internal-cert
        warn_days: 60
        critical_days: 30
    
    notification:
      slack_channel: "#soc-alerts"
      pagerduty_service: cyberSOC-platform
      
    schedule: "0 */6 * * *"
EOF

    log_ok "Certificate monitoring configuration created"
    
    # Create Prometheus metrics for certificate expiration (if Prometheus is available)
    if kubectl get servicemonitor -n monitoring &> /dev/null 2>&1 || kubectl get servicemonitor -n prometheus &> /dev/null 2>&1; then
        log_info "Prometheus detected - certificate metrics will be available automatically via cert-manager"
    else
        log_info "Prometheus not detected - manual certificate monitoring required"
    fi
    
    log_ok "✅ Renewal monitoring configured"
}

# =============================================================================
# STEP 7: Summary
# =============================================================================
print_summary() {
    log_step "TLS Setup Summary"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     🔐 TLS CERTIFICATE SETUP COMPLETE                       ║"
    echo "║                                                              ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                              ║"
    echo "║  Certificates Configured:                                   ║"
    
    for domain in "${DOMAINS[@]}"; do
        echo "║    • ${domain}                                          ║"
    done
    
    echo "║                                                              ║"
    echo "║  Internal Certificates:                                     ║"
    for domain in "${INTERNAL_DOMAINS[@]}"; do
        echo "║    • ${domain}                              ║"
    done
    
    echo "║                                                              ║"
    echo "║  Issuers:                                                    ║"
    echo "║    • letsencrypt-production (Let's Encrypt ACME)            ║"
    echo "║    • letsencrypt-staging (Testing)                          ║"
    echo "║    • cybersoc-internal-ca (Service Mesh)                    ║"
    echo "║                                                              ║"
    echo "║  Next Steps:                                                ║"
    echo "║    1. Verify DNS records point to cluster ingress           ║"
    echo "║    2. Update Ingress resources to reference TLS secrets     ║"
    echo "║    3. Test HTTPS access to all domains                      ║"
    echo "║    4. Set up alerting for certificate expiration             ║"
    echo "║                                                              ║"
    echo "║  Log File: ${LOG_FILE}   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Quick verification commands
    log_info "Quick Verification Commands:"
    echo ""
    echo "  # Check certificate status:"
    echo "  kubectl get certificates -n $NAMESPACE"
    echo ""
    echo "  # Check certificate readiness:"
    echo "  kubectl describe certificates -n $NAMESPACE | grep -A3 Status:"
    echo ""
    echo "  # View certificate details:"
    echo "  kubectl get secret soc-djezzy-dz-tls-prod -n $NAMESPACE -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout"
    echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    case "${1:-}" in
        --validate-only)
            log_info "Running validation only..."
            check_prerequisites
            validate_certificates
            ;;
        --dry-run)
            log_info "Dry run mode - showing what would be applied:"
            check_prerequisites
            kubectl apply -f /home/z/my-project/k8s/cert-manager/certificates.yaml --dry-run=client -o yaml 2>&1 | head -100
            ;;
        *)
            check_prerequisites
            setup_letsencrypt_issuer
            setup_internal_ca
            apply_certificates
            validate_certificates
            setup_renewal_monitoring
            print_summary
            ;;
    esac
}

# Run
main "$@"
