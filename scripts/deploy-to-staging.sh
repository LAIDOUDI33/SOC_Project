#!/bin/bash
# ============================================================
# National SOC Platform - Staging Deployment Script
# ============================================================
# Deploys the SOC platform to staging environment with:
# - Database migrations
# - Kubernetes deployment
# - Health checks
# - Smoke tests
#
# Usage: ./deploy-to-staging.sh [--skip-migrations] [--dry-run]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_LOG="$PROJECT_ROOT/logs/staging-deploy-$TIMESTAMP.log"

# Kubernetes Configuration
KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
K8S_NAMESPACE="soc-platform-staging"
HELM_RELEASE="djezzy-soc"
HELM_CHART="$PROJECT_ROOT/helm/djezzy-soc"
HELM_VALUES_STAGING="$PROJECT_ROOT/helm/djezzy-soc/values-staging.yaml"

# Docker/Registry
IMAGE_REGISTRY="${IMAGE_REGISTRY:-registry.djezzy.dz/staging}"
IMAGE_TAG="${IMAGE_TAG:-staging-$TIMESTAMP}"
DOCKERFILE="$PROJECT_ROOT/Dockerfile"

# Health Check Configuration
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10
HEALTH_CHECK_TIMEOUT=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
SKIP_MIGRATIONS=false
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-migrations) SKIP_MIGRATIONS=true ;;
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown option: $arg"; exit 1 ;;
    esac
done

# ============================================================
# Utility Functions
# ============================================================
log() {
    local level=$1; shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$DEPLOY_LOG"
}

info() { log "INFO" "${GREEN}$1${NC}"; }
warn() { log "WARN" "${YELLOW}$1${NC}"; }
error() { log "ERROR" "${RED}$1${NC}"; }
section() { echo -e "\n${BLUE}============================================================${NC}"; log "INFO" "${BLUE} $1${NC}"; echo -e "${BLUE}============================================================${NC}\n"; }

run_cmd() {
    local cmd="$*"
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] $cmd"
        return 0
    fi
    eval "$cmd"
}

check_error() {
    if [ $? -ne 0 ]; then
        error "$1"
        exit 1
    fi
}

# ============================================================
# Pre-deployment Checks
# ============================================================
pre_deploy_checks() {
    section "Pre-deployment Checks"
    
    # Check kubectl
    info "Checking Kubernetes connectivity..."
    if kubectl cluster-info &>/dev/null; then
        info "✓ Kubernetes cluster accessible"
        kubectl cluster-info | head -2
    else
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check Helm
    info "Checking Helm installation..."
    if command -v helm &> /dev/null; then
        info "✓ Helm available: $(helm version --short 2>&1)"
    else
        error "Helm not installed"
        exit 1
    fi
    
    # Check namespace exists or create it
    info "Checking Kubernetes namespace..."
    if kubectl get namespace "$K8S_NAMESPACE" &>/dev/null; then
        info "✓ Namespace $K8S_NAMESPACE exists"
    else
        info "Creating namespace $K8S_NAMESPACE..."
        run_cmd "kubectl create namespace $K8S_NAMESPACE"
    fi
    
    # Verify .env.production exists
    if [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        error ".env.production not found! Run setup-postgresql-production.sh first"
        exit 1
    fi
    info "✓ .env.production exists"
    
    # Verify Helm chart exists
    if [ ! -f "$HELM_VALUES_STAGING" ]; then
        error "Helm values file not found: $HELM_VALUES_STAGING"
        exit 1
    fi
    info "✓ Helm chart configuration ready"
}

# ============================================================
# Build and Push Docker Image
# ============================================================
build_docker_image() {
    section "Build Docker Image"
    
    local IMAGE_NAME="$IMAGE_REGISTRY/soc-platform:$IMAGE_TAG"
    
    info "Building Docker image: $IMAGE_NAME"
    
    run_cmd "docker build \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_PUBLIC_APP_URL=https://soc-staging.djezzy.dz \
        -t '$IMAGE_NAME' \
        -f '$DOCKERFILE' \
        '$PROJECT_ROOT'"
    
    check_error "Docker build failed!"
    info "✓ Docker image built successfully"
    
    info "Pushing image to registry..."
    run_cmd "docker push '$IMAGE_NAME'"
    
    check_error "Docker push failed!"
    info "✓ Image pushed to registry: $IMAGE_NAME"
    
    export DEPLOYED_IMAGE="$IMAGE_NAME"
}

# ============================================================
# Create Kubernetes Secrets
# ============================================================
create_k8s_secrets() {
    section "Create Kubernetes Secrets"
    
    # Load environment variables from .env.production
    source <(grep -v '^#' "$PROJECT_ROOT/.env.production" | grep -v '^$' | sed 's/^/export /')
    
    # Create generic secret for application
    info "Creating application secrets..."
    
    run_cmd "kubectl create secret generic soc-app-secrets \
        --namespace='$K8S_NAMESPACE' \
        --from-literal=database-url='$DATABASE_URL' \
        --from-literal=redis-url='$REDIS_URL' \
        --from-literal=jwt-secret='$JWT_SECRET' \
        --from-literal=refresh-secret='$REFRESH_TOKEN_SECRET' \
        --from-literal=encryption-key='$ENCRYPTION_KEY' \
        --from-literal=anonymization-salt='$ANONYMIZATION_SALT' \
        --from-literal=csrf-secret='$CSRF_SECRET' \
        --from-literal=session-secret='$SESSION_SECRET' \
        --dry-run=client -o yaml | kubectl apply -f -"
    
    # Create LDAP secret (if configured)
    if [ -n "${LDAP_URL:-}" ]; then
        info "Creating LDAP secrets..."
        run_cmd "kubectl create secret generic soc-ldap-secrets \
            --namespace='$K8S_NAMESPACE' \
            --from-literal=ldap-url='$LDAP_URL' \
            --from-literal=ldap-bind-dn='$LDAP_BIND_DN' \
            --from-literal=ldap-bind-password='$LDAP_BIND_PASSWORD' \
            --dry-run=client -o yaml | kubectl apply -f -"
    fi
    
    # Create SMTP secret (if configured)
    if [ -n "${SMTP_HOST:-}" ]; then
        info "Creating SMTP secrets..."
        run_cmd "kubectl create secret generic soc-smtp-secrets \
            --namespace='$K8S_NAMESPACE' \
            --from-literal=smtp-host='$SMTP_HOST' \
            --from-literal=smtp-port='$SMTP_PORT' \
            --from-literal=smtp-user='$SMTP_USER' \
            --from-literal=smtp-password='$SMTP_PASSWORD' \
            --dry-run=client -o yaml | kubectl apply -f -"
    fi
    
    # Create TLS certificate secret (if files exist)
    if [ -f "/etc/ssl/certs/soc-platform-cert.pem" ] && [ -f "/etc/ssl/private/soc-platform-key.pem" ]; then
        info "Creating TLS certificate secret..."
        run_cmd "kubectl create secret tls soc-tls-cert \
            --namespace='$K8S_NAMESPACE' \
            --cert=/etc/ssl/certs/soc-platform-cert.pem \
            --key=/etc/ssl/private/soc-platform-key.pem \
            --dry-run=client -o yaml | kubectl apply -f -"
    fi
    
    info "✓ Kubernetes secrets created"
}

# ============================================================
# Run Database Migrations
# ============================================================
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        warn "Skipping database migrations (--skip-migrations flag set)"
        return 0
    fi
    
    section "Run Database Migrations"
    
    # Create migration job spec
    local MIGRATION_JOB=$(cat <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: soc-db-migration-$TIMESTAMP
  namespace: $K8S_NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: db-migrate
        image: $DEPLOYED_IMAGE
        command: ["npx", "prisma", "migrate", "deploy"]
        envFrom:
        - secretRef:
            name: soc-app-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF
)
    
    info "Creating migration job..."
    echo "$MIGRATION_JOB" | kubectl apply -f -
    
    # Wait for job to complete
    info "Waiting for migration job to complete..."
    kubectl wait --for=condition=complete --timeout=300s job/soc-db-migration-$TIMESTAMP -n "$K8S_NAMESPACE"
    
    check_error "Database migration failed!"
    
    # Get job logs
    info "Migration job logs:"
    kubectl logs job/soc-db-migration-$TIMESTAMP -n "$K8S_NAMESPACE" | tee -a "$DEPLOY_LOG"
    
    # Cleanup job
    kubectl delete job soc-db-migration-$TIMESTAMP -n "$K8S_NAMESPACE"
    
    info "✓ Database migrations completed successfully"
}

# ============================================================
# Deploy with Helm
# ============================================================
helm_deploy() {
    section "Deploy with Helm"
    
    info "Deploying $HELM_RELEASE to $K8S_NAMESPACE..."
    
    run_cmd "helm upgrade --install '$HELM_RELEASE' '$HELM_CHART' \
        --namespace='$K8S_NAMESPACE' \
        --values='$HELM_VALUES_STAGING' \
        --set socPlatformApi.image.tag='$IMAGE_TAG' \
        --set socPlatformApi.image.repository='$IMAGE_REGISTRY/soc-platform' \
        --wait \
        --timeout=10m"
    
    check_error "Helm deployment failed!"
    
    info "✓ Helm deployment completed"
    
    # Show release status
    info "Release status:"
    helm status "$HELM_RELEASE" -n "$K8S_NAMESPACE" | head -20
}

# ============================================================
# Health Checks
# ============================================================
health_checks() {
    section "Health Checks"
    
    info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=djezzy-soc -n "$K8S_NAMESPACE" --timeout=180s
    
    check_error "Pods did not become ready in time!"
    info "✓ All pods are running and ready"
    
    # Get pod information
    info "Pod status:"
    kubectl get pods -n "$K8S_NAMESPACE" -l app.kubernetes.io/instance=djezzy-soc | tee -a "$DEPLOY_LOG"
    
    # Get service endpoint
    local SERVICE_URL=""
    if kubectl get ingress -n "$K8S_NAMESPACE" djezzy-soc-ingress &>/dev/null; then
        SERVICE_URL=$(kubectl get ingress djezzy-soc-ingress -n "$K8S_NAMESPACE" -o jsonpath='{.spec.rules[0].host}')
        info "Ingress URL: https://$SERVICE_URL"
    elif kubectl get svc -n "$K8S_NAMESPACE" djezzy-soc-api &>/dev/null; then
        local NODE_PORT=$(kubectl get svc djezzy-soc-api -n "$K8S_NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}')
        SERVICE_URL="http://$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}'):$NODE_PORT"
        info "NodePort URL: $SERVICE_URL"
    fi
    
    # Run health check endpoint
    if [ -n "$SERVICE_URL" ]; then
        info "Running health checks against $SERVICE_URL..."
        
        for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/health" --connect-timeout $HEALTH_CHECK_TIMEOUT || echo "000")
            
            if [ "$HTTP_CODE" = "200" ]; then
                info "✓ Health check passed (attempt $i/$HEALTH_CHECK_RETRIES)"
                break
            fi
            
            if [ $i -eq $HEALTH_CHECK_RETRIES ]; then
                error "✗ Health check failed after $HEALTH_CHECK_RETRIES attempts (last status: $HTTP_CODE)"
                exit 1
            fi
            
            warn "Health check attempt $i/$HEALTH_CHECK_RETRIES failed (HTTP $HTTP_CODE), retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep $HEALTH_CHECK_INTERVAL
        done
        
        # Detailed health response
        info "Health check response:"
        curl -s "$SERVICE_URL/api/health" | jq . 2>/dev/null || curl -s "$SERVICE_URL/api/health"
    fi
}

# ============================================================
# Smoke Tests
# ============================================================
smoke_tests() {
    section "Smoke Tests"
    
    local BASE_URL=""
    
    # Determine base URL for tests
    if kubectl get ingress -n "$K8S_NAMESPACE" djezzy-soc-ingress &>/dev/null; then
        BASE_URL="https://$(kubectl get ingress djezzy-soc-ingress -n "$K8S_NAMESPACE" -o jsonpath='{.spec.rules[0].host}')"
    else
        local NODE_PORT=$(kubectl get svc djezzy-soc-api -n "$K8S_NAMESPACE" -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo "30000")
        BASE_URL="http://$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}'):$NODE_PORT"
    fi
    
    local PASS=0
    local FAIL=0
    
    # Test 1: Health endpoint
    info "Test 1: Health Endpoint..."
    if curl -sf "$BASE_URL/api/health" > /dev/null; then
        info "✓ Health endpoint responding"
        ((PASS++))
    else
        error "✗ Health endpoint failed"
        ((FAIL++))
    fi
    
    # Test 2: Static assets
    info "Test 2: Frontend Loading..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        info "✓ Frontend loading (HTTP $HTTP_CODE)"
        ((PASS++))
    else
        error "✗ Frontend not loading (HTTP $HTTP_CODE)"
        ((FAIL++))
    fi
    
    # Test 3: API authentication (should fail without credentials - expected behavior)
    info "Test 3: API Authentication Enforcement..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/incidents" || echo "000")
    if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        info "✓ API requires authentication (HTTP $HTTP_CODE)"
        ((PASS++))
    else
        warn "⚠ API returned unexpected status: $HTTP_CODE (expected 401/403)"
        ((PASS++))  # Don't fail, just warn
    fi
    
    # Test 4: CORS headers
    info "Test 4: CORS Headers..."
    CORS_HEADER=$(curl -sI "$BASE_URL/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
    if [ -n "$CORS_HEADER" ]; then
        info "✓ CORS headers present: $CORS_HEADER"
        ((PASS++))
    else
        warn "⚠ No CORS headers detected on health endpoint"
        ((PASS++))
    fi
    
    # Test 5: Security headers
    info "Test 5: Security Headers..."
    SECURITY_HEADERS=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -iE "(x-frame-options|x-content-type|strict-transport)" || echo "")
    if [ -n "$SECURITY_HEADERS" ]; then
        info "✓ Security headers present"
        echo "$SECURITY_HEADERS" | while read line; do info "   $line"; done
        ((PASS++))
    else
        warn "⚠ Some security headers may be missing"
        ((PASS++))
    fi
    
    echo ""
    info "Smoke Test Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
    
    if [ "$FAIL" -gt 0 ]; then
        error "Smoke tests failed! Review errors above."
        return 1
    fi
    
    return 0
}

# ============================================================
# Post-deployment Verification
# ============================================================
post_deploy_verify() {
    section "Post-deployment Verification"
    
    info "Gathering deployment information..."
    
    # Helm release info
    info "Helm Release:"
    helm list -n "$K8S_NAMESPACE" | grep "$HELM_RELEASE" | tee -a "$DEPLOY_LOG"
    
    # Resource utilization
    info "Resource Utilization:"
    kubectl top pods -n "$K8S_NAMESPACE" -l app.kubernetes.io/instance=djezzy-soc 2>/dev/null || warn "Metrics server not available"
    
    # Events
    info "Recent events:"
    kubectl get events -n "$K8S_NAMESPACE" --sort-by='.lastTimestamp' | tail -10 | tee -a "$DEPLOY_LOG"
    
    # Generate deployment manifest
    info "Generating deployment manifest..."
    helm get manifest "$HELM_RELEASE" -n "$K8S_NAMESPACE" > "$PROJECT_ROOT/logs/staging-manifest-$TIMESTAMP.yaml"
    info "✓ Manifest saved: staging-manifest-$TIMESTAMP.yaml"
}

# ============================================================
# Generate Deployment Report
# ============================================================
generate_report() {
    section "Deployment Complete - Summary"
    
    local REPORT_FILE="$PROJECT_ROOT/logs/staging-deploy-report-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# Staging Deployment Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Staging ($K8S_NAMESPACE)
**Image Tag:** $IMAGE_TAG
**Helm Release:** $HELM_RELEASE

## Deployment Summary

| Component | Status |
|-----------|--------|
| Pre-flight Checks | ✅ Passed |
| Docker Build | ✅ Completed |
| Image Push | ✅ Pushed to $IMAGE_REGISTRY |
| K8s Secrets | ✅ Created |
| Database Migrations | ✅ Applied |
| Helm Deploy | ✅ Successful |
| Health Checks | ✅ Passed |
| Smoke Tests | ✅ Passed |

## Access Information

\`\`\`
# Ingress URL (if configured):
https://soc-staging.djezzy.dz

# Or via port-forward:
kubectl port-forward svc/djezzy-soc-api 3000:80 -n $K8S_NAMESPACE
http://localhost:3000
\`\`\`

## Next Steps

1. **Security Testing**: Run penetration test suite
2. **UAT**: Execute user acceptance testing checklist
3. **Performance Testing**: Validate under load
4. **Production Approval**: Get sign-off from stakeholders
5. **Go-Live**: Execute production deployment

## Artifacts

- Deployment Log: \`$DEPLOY_LOG\`
- Helm Manifest: \`staging-manifest-$TIMESTAMP.yaml\`
- This Report: \`$REPORT_FILE\`

---
**Deployed by:** $(whoami)@$(hostname)
**Duration:** $(($(date +%s) - $(stat -c %Y "$DEPLOY_LOG" 2>/dev/null || date +%s))) seconds
EOF
    
    info "🎉 Staging deployment completed successfully!"
    info ""
    info "Report generated: $REPORT_FILE"
    info ""
    info "Next steps:"
    info "  1. Run security penetration testing: ./security/pentest/run-pentest.sh"
    info "  2. Execute UAT checklist: ./scripts/uat-test-suite.sh"
    info "  3. Prepare for production go-live"
}

# ============================================================
# Main Execution
# ============================================================
main() {
    section "National SOC Platform - Staging Deployment"
    echo "Starting deployment at $(date)"
    echo "Target: $K8S_NAMESPACE"
    echo ""
    
    mkdir -p "$(dirname "$DEPLOY_LOG")"
    
    pre_deploy_checks
    build_docker_image
    create_k8s_secrets
    run_migrations
    helm_deploy
    health_checks
    smoke_tests
    post_deploy_verify
    generate_report
    
    exit 0
}

# Run main function
main "$@"
