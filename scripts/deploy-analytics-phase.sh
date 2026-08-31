#!/bin/bash
# =============================================================================
# CyberSOC Platform - Analytics Phase Deployment Script
# =============================================================================
# Deploys Analytics & ML microservices to production Kubernetes cluster
# 
# Phases:
#   1. Pre-deployment validation
#   2. Namespace & RBAC setup
#   3. Infrastructure (PVCs, ConfigMaps, Secrets)
#   4. Core Services (Predictive, Behavioral, ML Server)
#   5. Networking (Services, NetworkPolicies)
#   6. Batch Processing (CronJobs)
#   7. Monitoring & Observability
#   8. Post-deployment validation
#
# Usage:
#   ./deploy-analytics-phase.sh [options]
#   Options:
#     --skip-validation    Skip pre-flight checks
#     --dry-run            Print commands without executing
#     --namespace NS       Override namespace (default: cybersoc-analytics)
#     --values FILE        Override Helm values file
#     --verbose            Enable verbose output
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
K8S_ANALYTICS_DIR="${PROJECT_ROOT}/k8s/analytics"
HELM_VALUES="${PROJECT_ROOT}/k8s/helm/analytics-values-production.yaml"
NAMESPACE="cybersoc-analytics"
DRY_RUN=false
SKIP_VALIDATION=false
VERBOSE=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-validation) SKIP_VALIDATION=true ;;
            --dry-run) DRY_RUN=true ;;
            --namespace) NAMESPACE="$2"; shift ;;
            --values) HELM_VALUES="$2"; shift ;;
            --verbose) VERBOSE=true ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
        shift
    done
}

# Run kubectl command with optional dry-run
kubectl_cmd() {
    if [ "$DRY_RUN" = true ]; then
        log_info "DRY-RUN: kubectl $*"
    else
        if [ "$VERBOSE" = true ]; then
            kubectl "$@"
        else
            kubectl "$@" >/dev/null 2>&1
        fi
    fi
}

# Check command success
check_success() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Command failed with exit code $exit_code"
        return 1
    fi
    return 0
}

# =============================================================================
# PHASE 1: Pre-Deployment Validation
# =============================================================================
pre_deployment_validation() {
    log_info "=== Phase 1: Pre-Deployment Validation ==="
    
    # Check kubectl connectivity
    log_info "Checking Kubernetes connectivity..."
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    log_success "Kubernetes cluster accessible"

    # Check kubectl version
    log_info "Checking kubectl version..."
    KUBECTL_VERSION=$(kubectl version --client --short -o json 2>/dev/null | grep -o '"gitVersion": "[^"]*"' || echo "unknown")
    log_success "kubectl version: ${KUBECTL_VERSION}"

    # Verify namespace doesn't exist or is safe to use
    log_info "Checking namespace ${NAMESPACE}..."
    if kubectl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
        log_warning "Namespace ${NAMESPACE} already exists"
    else
        log_success "Namespace ${NAMESPACE} available for creation"
    fi

    # Check required files exist
    log_info "Checking required manifest files..."
    local required_files=(
        "${K8S_ANALYTICS_DIR}/namespace.yaml"
        "${K8S_ANALYTICS_DIR}/predictive-analytics-deployment.yaml"
        "${K8S_ANALYTICS_DIR}/behavioral-analytics-deployment.yaml"
        "${K8S_ANALYTICS_DIR}/ml-model-server-deployment.yaml"
        "${K8S_ANALYTICS_DIR}/services.yaml"
        "${K8S_ANALYTICS_DIR}/configmaps.yaml"
        "${K8S_ANALYTICS_DIR}/network-policies.yaml"
        "${K8S_ANALYTICS_DIR}/persistent-volumes.yaml"
        "${K8S_ANALYTICS_DIR}/rbac.yaml"
        "${K8S_ANALYTICS_DIR}/cronjobs.yaml"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    log_success "All required manifest files present"

    # Check storage classes
    log_info "Verifying StorageClasses..."
    local storage_classes=("premium-ssd" "premium-nvme")
    for sc in "${storage_classes[@]}"; do
        if kubectl get storageclass "$sc" >/dev/null 2>&1; then
            log_success "StorageClass $sc available"
        else
            log_warning "StorageClass $sc not found - PVC creation may fail"
        fi
    done

    # Check node labels for ML workloads
    log_info "Checking for ML-capable nodes..."
    local ml_nodes=$(kubectl get nodes -l workload-class=ml-inference --no-headers 2>/dev/null | wc -l || echo "0")
    if [ "$ml_nodes" -gt 0 ]; then
        log_success "Found $ml_nodes ML-capable node(s)"
    else
        log_warning "No dedicated ML nodes found - using production nodes"
    fi

    log_success "=== Phase 1 Complete ==="
}

# =============================================================================
# PHASE 2: Namespace & RBAC Setup
# =============================================================================
setup_namespace_rbac() {
    log_info "=== Phase 2: Namespace & RBAC Setup ==="
    
    # Create namespace
    log_info "Creating namespace ${NAMESPACE}..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/namespace.yaml"
    check_success && log_success "Namespace created/updated"

    # Apply RBAC
    log_info "Applying RBAC configuration..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/rbac.yaml"
    check_success && log_success "RBAC configured"

    log_success "=== Phase 2 Complete ==="
}

# =============================================================================
# PHASE 3: Infrastructure Setup (PVCs, ConfigMaps, Secrets)
# =============================================================================
setup_infrastructure() {
    log_info "=== Phase 3: Infrastructure Setup ==="
    
    # Create Persistent Volume Claims
    log_info "Creating Persistent Volume Claims..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/persistent-volumes.yaml"
    check_success && log_success "PVCs created"

    # Wait for PVCs to bind
    log_info "Waiting for PVCs to bind..."
    sleep 5
    local pvcs=("analytics-models-pvc" "behavioral-profiles-pvc" "analytics-training-data-pvc" "analytics-output-pvc")
    for pvc in "${pvcs[@]}"; do
        if [ "$DRY_RUN" = false ]; then
            kubectl wait --for=condition=Bound pvc/"$pvc" -n "${NAMESPACE}" --timeout=60s >/dev/null 2>&1 || \
                log_warning "PVC $pvc not yet bound (may provision later)"
        fi
    done

    # Create ConfigMaps
    log_info "Creating ConfigMaps..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/configmaps.yaml"
    check_success && log_success "ConfigMaps created"

    # Note: Secrets should be created from Vault/External Secrets
    log_info "Checking secrets configuration..."
    if kubectl get secret analytics-secrets -n "${NAMESPACE}" >/dev/null 2>&1; then
        log_success "Secrets already exist"
    else
        log_warning "Secret 'analytics-secrets' not found - create from Vault before deploying services"
        log_info "Template available at: ${K8S_ANALYTICS_DIR}/secrets-template.yaml"
    fi

    log_success "=== Phase 3 Complete ==="
}

# =============================================================================
# PHASE 4: Deploy Core Services
# =============================================================================
deploy_core_services() {
    log_info "=== Phase 4: Deploying Core Analytics Services ==="
    
    # Deploy Predictive Analytics Engine
    log_info "Deploying Predictive Analytics Engine..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/predictive-analytics-deployment.yaml"
    check_success && log_success "Predictive Analytics Engine deployed"

    # Deploy Behavioral Analytics Engine
    log_info "Deploying Behavioral Analytics Engine (UEBA)..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/behavioral-analytics-deployment.yaml"
    check_success && log_success "Behavioral Analytics Engine deployed"

    # Deploy ML Model Server
    log_info "Deploying ML Model Server..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/ml-model-server-deployment.yaml"
    check_success && log_success "ML Model Server deployed"

    # Deploy Services
    log_info "Deploying Services..."
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/services.yaml"
    check_success && log_success "Services deployed"

    log_success "=== Phase 4 Complete ==="
}

# =============================================================================
# PHASE 5: Configure Networking
# =============================================================================
configure_networking() {
    log_info "=== Phase 5: Configuring Network Policies ==="
    
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/network-policies.yaml"
    check_success && log_success "Network policies applied"

    log_success "=== Phase 5 Complete ==="
}

# =============================================================================
# PHASE 6: Deploy Batch Processing Jobs
# =============================================================================
deploy_batch_jobs() {
    log_info "=== Phase 6: Deploying Batch Processing CronJobs ==="
    
    kubectl_cmd apply -f "${K8S_ANALYTICS_DIR}/cronjobs.yaml"
    check_success && log_success "CronJobs deployed"

    log_info "Scheduled jobs:"
    log_info "  - Model Retraining: Weekly Sunday 3AM"
    log_info "  - Baseline Update: Daily 2AM"
    log_info "  - Report Generation: Daily 6AM"
    log_info "  - Data Aggregation: Hourly"
    log_info "  - Backup/Export: Daily Midnight"

    log_success "=== Phase 6 Complete ==="
}

# =============================================================================
# PHASE 7: Monitoring & Observability
# =============================================================================
setup_monitoring() {
    log_info "=== Phase 7: Setting Up Monitoring ==="
    
    # Import Grafana dashboard
    log_info "Importing Grafana dashboards..."
    local grafana_dashboard="${PROJECT_ROOT}/monitoring/grafana/dashboards/analytics/analytics-ml-dashboard.json"
    
    if [ -f "$grafana_dashboard" ] && [ "$DRY_RUN" = false ]; then
        # Attempt to import via Grafana API (if configured)
        if [ -n "${GRAFANA_URL:-}" ] && [ -n "${GRAFANA_API_KEY:-}" ]; then
            curl -s -X POST "${GRAFANA_URL}/api/dashboards/db" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
                -d @"${grafana_dashboard}" >/dev/null 2>&1 && \
                log_success "Grafana dashboard imported" || \
                log_warning "Grafana import failed (manual import may be needed)"
        else
            log_info "Grafana URL/API key not set - skip auto-import"
            log_info "Dashboard file: ${grafana_dashboard}"
        fi
    else
        log_info "Dashboard file: ${grafana_dashboard}"
    fi

    # Verify Prometheus targets
    log_info "Checking Prometheus service discovery..."
    if [ "$DRY_RUN" = false ]; then
        # This would be checked after pods are running
        log_info "(Will verify after pods are ready)"
    fi

    log_success "=== Phase 7 Complete ==="
}

# =============================================================================
# PHASE 8: Post-Deployment Validation
# =============================================================================
post_deployment_validation() {
    log_info "=== Phase 8: Post-Deployment Validation ==="
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "Skipping validation in dry-run mode"
        return
    fi

    local max_wait=300  # 5 minutes
    local wait_interval=10
    local elapsed=0
    
    log_info "Waiting for deployments to roll out..."
    
    local deployments=(
        "predictive-analytics-engine"
        "behavioral-analytics-engine"
        "ml-model-server"
    )
    
    for deploy in "${deployments[@]}"; do
        log_info "Waiting for ${deploy}..."
        
        if kubectl rollout status deployment/"${deploy}" -n "${NAMESPACE}" --timeout="${max_wait}s" >/dev/null 2>&1; then
            log_success "${deploy} is ready"
        else
            log_error "${deploy} failed to become ready within timeout"
            
            # Get pod details for debugging
            log_error "Pod status:"
            kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name="${deploy}" 2>/dev/null || true
            
            log_error "Recent logs:"
            kubectl logs -n "${NAMESPACE}" -l app.kubernetes.io/name="${deploy}" --tail=20 2>/dev/null || true
        fi
    done

    # Check HPA status
    log_info "Checking Horizontal Pod Autoscalers..."
    kubectl get hpa -n "${NAMESPACE}" 2>/dev/null || log_warning "No HPAs found"

    # Check PDB status
    log_info "Checking Pod Disruption Budgets..."
    kubectl get pdb -n "${NAMESPACE}" 2>/dev/null || log_warning "No PDBs found"

    # Summary
    log_info "=== Deployment Summary ==="
    log_info "Namespace: ${NAMESPACE}"
    log_info "Deployments:"
    kubectl get deployments -n "${NAMESPACE}" 2>/dev/null || true
    log_info "Pods:"
    kubectl get pods -n "${NAMESPACE}" 2>/dev/null || true
    log_info "Services:"
    kubectl get svc -n "${NAMESPACE}" 2>/dev/null || true
    log_info "PVCs:"
    kubectl get pvc -n "${NAMESPACE}" 2>/dev/null || true

    log_success "=== Phase 8 Complete ==="
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║     CyberSOC Platform - Analytics Phase Deployment           ║"
    echo "║     Production | AI-Native SOC OS | ANRT Compliant          ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Starting Analytics Phase deployment at $(date)"
    log_info "Project root: ${PROJECT_ROOT}"
    log_info "K8s manifests: ${K8S_ANALYTICS_DIR}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Dry run: ${DRY_RUN}"
    echo ""

    parse_args "$@"

    # Execute phases
    if [ "$SKIP_VALIDATION" = false ]; then
        pre_deployment_validation
    else
        log_warning "Skipping pre-deployment validation"
    fi

    setup_namespace_rbac
    setup_infrastructure
    deploy_core_services
    configure_networking
    deploy_batch_jobs
    setup_monitoring
    post_deployment_validation

    echo ""
    log_success "========================================="
    log_success "Analytics Phase Deployment Complete!"
    log_success "========================================="
    echo ""
    log_info "Next Steps:"
    log_info "1. Verify secrets are injected from Vault"
    log_info "2. Test API endpoints:"
    log_info "   - curl https://analytics.soc.djezzy.dz/api/analytics/predictions"
    log_info "   - curl https://analytics.soc.djezzy.dz/api/analytics/behavior"
    log_info "3. Monitor dashboards in Grafana"
    log_info "4. Review CronJob execution history"
    echo ""
}

# Run main function
main "$@"
