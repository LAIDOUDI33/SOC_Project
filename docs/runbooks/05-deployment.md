# Deployment Runbook

**Document ID:** SOC-RB-005  
**Version:** 1.5  
**Classification:** Internal Use Only  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC DevOps Team

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Deployment Overview](#deployment-overview)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Rolling Update Procedure](#rolling-update-procedure)
5. [Rollback Procedures](#rollback-procedures)
6. [Rollback Triggers](#rollback-triggers)
7. [Post-Deployment Validation](#post-deployment-validation)
8. [Environment-Specific Procedures](#environment-specific-procedures)

---

## Purpose and Scope

This runbook defines standardized procedures for deploying updates to the Djezzy National SOC Platform. It ensures consistent, safe, and auditable deployments across all environments while minimizing service disruption.

### Deployment Principles

| Principle | Implementation |
|-----------|----------------|
| **Automation First** | All deployments via CI/CD pipeline, no manual changes |
| **Incremental Updates** | Rolling deployments with health checks |
| **Reversibility** | Every deployment must be rollback-capable |
| **Observability** | Enhanced monitoring during deployment window |
| **Zero-Downtime Goal** | Blue-green or canary where feasible |

### Supported Deployment Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Full Release** | Complete version upgrade | Major/minor releases |
| **Hotfix** | Critical security fix only | Emergency patches |
| **Configuration** | Config/secret update only | Non-code changes |
| **Infrastructure** | Kubernetes/Helm changes | Scaling, resource changes |

---

## Deployment Overview

### Architecture Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│   │  DEVELOPER  │────▶│   GITLAB CI  │────▶│  ARTIFACTRY │        │
│   │  WORKSTATION│     │    PIPELINE  │     │   REPOSITORY│        │
│   └─────────────┘     └──────┬──────┘     └──────┬──────┘        │
│                              │                    │                │
│                              ▼                    ▼                │
│                       ┌──────────────────────────────┐            │
│                       │      HELM CHARTS             │            │
│                       │  (soc-platform / djezzy-soc) │            │
│                       └──────────────┬───────────────┘            │
│                                      │                            │
│                    ┌─────────────────┼─────────────────┐          │
│                    ▼                 ▼                 ▼          │
│             ┌────────────┐   ┌────────────┐   ┌────────────┐    │
│             │  STAGING   │   │ PRODUCTION │   │   DR SITE  │    │
│             │ (Pre-prod) │   │  (Primary) │   │  (Backup)  │    │
│             └────────────┘   └────────────┘   └────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Deployment Environments

| Environment | Purpose | Access | Approval Required |
|-------------|---------|--------|-------------------|
| **Development** | Developer testing | Developers | None |
| **Staging** | Pre-production validation | DevOps, QA | Tech Lead |
| **Production** | Live operations | DevOps Lead + Manager | Change Advisory Board |
| **DR Site** | Disaster recovery sync | DevOps Lead | Production deployment approval |

---

## Pre-Deployment Checklist

### Standard Pre-Deployment Verification

```markdown
## PRE-DEPLOYMENT CHECKLIST

**Deployment ID:** DEP-[YYYYMMDD]-[SEQUENCE]
**Target Version:** [VERSION]
**Target Environment:** [ENVIRONMENT]
**Scheduled Window:** [START] - [END] UTC
**Deployment Engineer:** [NAME]

### Code & Build Verification
- [ ] Code reviewed and approved in GitLab MR
- [ ] All automated tests passing (unit, integration)
- [ ] Security scan completed (no HIGH/CRITICAL findings)
- [ ] License compliance check passed
- [ ] Build artifact created and tagged in Artifactory
- [ ] Artifact integrity verified (checksum match)

### Configuration Management
- [ ] Helm values file updated for target environment
- [ ] Secrets updated in Kubernetes secrets/Vault
- [ ] Environment variables documented and reviewed
- [ ] Feature flags configured appropriately
- [ ] Database migrations prepared (if applicable)

### Testing Validation
- [ ] Staging environment deployment successful
- [ ] Smoke tests passing on staging
- [ ] Performance benchmarks within acceptable range
- [ ] Security regression testing complete
- [ ] Integration tests with external services passed

### Operational Readiness
- [ ] Runbook updated for new features (if applicable)
- [ ] Monitoring dashboards/alerts configured
- [ ] Rollback plan documented and tested
- [ ] On-call engineer notified of deployment window
- [ ] Stakeholder communication sent

### Approval Gate
- [ ] Technical Lead approval: _______________ Date: _______
- [ ] SOC Manager approval (Production): _______________ Date: _______
- [ ] CAB approval (if required): _______________ Date: _______

---
**Checklist Status:** ☐ Incomplete | ☑ Ready to Deploy
```

### Automated Pre-Flight Checks

```bash
#!/bin/bash
# preflight_checks.sh - Automated pre-deployment validation

set -euo pipefail

DEPLOY_VERSION=${1:-"unknown"}
TARGET_ENV=${2:-"staging"}
DEPLOYER=$(whoami)

echo "=========================================="
echo "  Djezzy SOC Platform - Pre-flight Checks"
echo "=========================================="
echo "Version: $DEPLOY_VERSION"
echo "Environment: $TARGET_ENV"
echo "Deployer: $DEPLOYER"
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

PASS=0
FAIL=0
WARN=0

check_pass() { echo "✅ PASS: $1"; ((PASS++)); }
check_fail() { echo "❌ FAIL: $1"; ((FAIL++)); }
check_warn() { echo "⚠️  WARN: $1"; ((WARN++)); }

# ============================================
# 1. CLUSTER CONNECTIVITY
# ============================================
echo ""
echo "--- Cluster Connectivity ---"

if kubectl cluster-info >/dev/null 2>&1; then
  check_pass "Kubernetes cluster accessible"
else
  check_fail "Cannot connect to Kubernetes cluster"
  exit 1
fi

CURRENT_CTX=$(kubectl config current-context)
echo "Context: $CURRENT_CTX"

# Verify correct context for target environment
case $TARGET_ENV in
  staging)
    if [[ "$CURRENT_CTX" == *"staging"* ]] || [[ "$CURRENT_CTX" == *"dev"* ]]; then
      check_pass "Context matches staging environment"
    else
      check_fail "Wrong context for staging: $CURRENT_CTX"
    fi
    ;;
  production)
    if [[ "$CURRENT_CTX" == *"production"* ]] || [[ "$CURRENT_CTX" == *"prod"* ]]; then
      check_pass "Context matches production environment"
    else
      check_fail "Wrong context for production: $CURRENT_CTX"
    fi
    ;;
esac

# ============================================
# 2. RESOURCE AVAILABILITY
# ============================================
echo ""
echo "--- Resource Availability ---"

# Check node status
READY_NODES=$(kubectl get nodes --no-headers | grep -c "Ready")
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)

if [ "$READY_NODES" -eq "$TOTAL_NODES" ]; then
  check_pass "All nodes ready ($READY_NODES/$TOTAL_NODES)"
else
  check_warn "Some nodes not ready ($READY_NODES/$TOTAL_NODES)"
fi

# Check resource utilization
CPU_CAPACITY=$(kubectl describe nodes | grep "cpu:" | head -1 | awk '{print $2}')
MEM_CAPACITY=$(kubectl describe nodes | grep "memory:" | head -1 | awk '{print $2}')

CPU_REQUESTED=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "N/A")
MEM_REQUESTED=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$4} END {print sum}' || echo "N/A")

echo "CPU Capacity: $CPU_CAPACITY | Requested: ${CPU_REQUESTED:-checking...}"
echo "Memory Capacity: $MEM_CAPACITY | Requested: ${MEM_REQUESTED:-checking...}"

# Check persistent volume availability
PV_COUNT=$(kubectl get pv | grep -c "Available" || true)
if [ "$PV_COUNT" -gt 0 ]; then
  check_pass "Persistent volumes available ($PV_COUNT)"
else
  check_warn "No unbound PVs available"
fi

# ============================================
# 3. APPLICATION HEALTH (CURRENT)
# ============================================
echo ""
echo "--- Current Application Health ---"

# Check current deployment status
for DEPLOYMENT in soc-platform soc-platform-backend soc-platform-worker; do
  READY_REPLICAS=$(kubectl get deployment $DEPLOYMENT -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  DESIRED_REPLICAS=$(kubectl get deployment $DEPLOYMENT -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
  
  if [ "$READY_REPLICAS" = "$DESIRED_REPLICAS" ] && [ "$DESIRED_REPLICAS" != "0" ]; then
    check_pass "$DEPLOYMENT healthy ($READY_REPLICAS/$DESIRED_REPLICAS replicas)"
  elif [ "$DESIRED_REPLICAS" = "0" ]; then
    check_warn "$DEPLOYMENT has 0 desired replicas"
  else
    check_fail "$DEPLOYMENT not healthy ($READY_REPLICAS/$DESIRED_REPLICAS)"
  fi
done

# ============================================
# 4. DATABASE CONNECTIVITY
# ============================================
echo ""
echo "--- Database Connectivity ---"

# PostgreSQL
if pg_isready -h postgres.$(kubectl config view --minify -o jsonpath='{..namespace}').svc.cluster.local -p 5432 2>/dev/null; then
  check_pass "PostgreSQL accepting connections"
else
  # Try via kubernetes service
  PG_POD=$(kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -n "$PG_POD" ]; then
    kubectl exec $PG_POD -- pg_isready >/dev/null 2>&1 && \
      check_pass "PostgreSQL accessible via pod" || \
      check_fail "PostgreSQL not responding"
  else
    check_warn "PostgreSQL pod not found in namespace"
  fi
fi

# Redis
REDIS_POD=$(kubectl get pods -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$REDIS_POD" ]; then
  REDIS_RESPONSE=$(kubectl exec $REDIS_POD -- redis-cli ping 2>/dev/null || echo "")
  if [ "$REDIS_RESPONSE" = "PONG" ]; then
    check_pass "Redis responding"
  else
    check_fail "Redis not responding"
  fi
else
  check_warn "Redis pod not found"
fi

# Elasticsearch
ES_URL="http://elasticsearch.$(kubectl config view --minify -o jsonpath='{..namespace}').svc.cluster.local:9200"
ES_HEALTH=$(curl -sf "$ES_URL/_cluster/health" 2>/dev/null | jq -r '.status' || echo "unreachable")

if [ "$ES_HEALTH" = "green" ] || [ "$ES_HEALTH" = "yellow" ]; then
  check_pass "Elasticsearch cluster status: $ES_HEALTH"
else
  check_fail "Elasticsearch status: $ES_HEALTH"
fi

# ============================================
# 5. HELM CONFIGURATION VALIDATION
# ============================================
echo ""
echo "--- Helm Configuration ---"

# Verify helm chart exists
CHART_PATH="./helm/soc-platform"
if [ -f "$CHART_PATH/Chart.yaml" ]; then
  CHART_VERSION=$(grep '^version:' $CHART_PATH/Chart.yaml | awk '{print $2}')
  check_pass "Helm chart found (version $CHART_VERSION)"
else
  check_fail "Helm chart not found at $CHART_PATH"
fi

# Verify values files exist
VALUES_FILE="./helm/soc-platform/values-${TARGET_ENV}.yaml"
if [ -f "$VALUES_FILE" ]; then
  check_pass "Values file exists for $TARGET_ENV"
else
  # Fall back to default
  if [ -f "./helm/soc-platform/values.yaml" ]; then
    check_warn "Using default values file (no $TARGET_ENV specific)"
    VALUES_FILE="./helm/soc-platform/values.yaml"
  else
    check_fail "No values file found"
  fi
fi

# Template validation (dry-run)
echo "Running helm template validation..."
helm template soc-platform $CHART_PATH \
  -f $VALUES_FILE \
  --set image.tag=$DEPLOY_VERSION \
  > /tmp/helm-template-output.yaml 2>/tmp/helm-errors.log

if [ $? -eq 0 ]; then
  check_pass "Helm template renders successfully"
else
  check_fail "Helm template errors:"
  cat /tmp/helm-errors.log | head -20
fi

# ============================================
# 6. SECURITY SCANNING RESULTS
# ============================================
echo ""
echo "--- Security Scanning ---"

# Check for recent Trivy scan results (from CI)
TRIVY_REPORT="./reports/trivy-$DEPLOY_VERSION.json"
if [ -f "$TRIVY_REPORT" ]; then
  CRITICAL_COUNT=$(jq '[.Results[]? | select(.Severity=="CRITICAL")] | length' $TRIVY_REPORT 2>/dev/null || echo "0")
  HIGH_COUNT=$(jq '[.Results[]? | select(.Severity=="HIGH")] | length' $TRIVY_REPORT 2>/dev/null || echo "0")
  
  if [ "$CRITICAL_COUNT" -eq 0 ] && [ "$HIGH_COUNT" -eq 0 ]; then
    check_pass "No CRITICAL or HIGH vulnerabilities"
  elif [ "$CRITICAL_COUNT" -gt 0 ]; then
    check_fail "$CRITICAL_COUNT CRITICAL vulnerabilities found!"
  else
    check_warn "$HIGH_COUNT HIGH vulnerabilities (proceed with caution)"
  fi
else
  check_warn "No Trivy report found for version $DEPLOY_VERSION"
fi

# ============================================
# 7. BACKUP VERIFICATION
# ============================================
echo ""
echo "--- Backup Status ---"

# Check recent backup completion (production only)
if [ "$TARGET_ENV" = "production" ]; then
  LAST_BACKUP=$(kubectl get job -l app=pg-backup --sort-by='.metadata.creationTimestamp' -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null)
  
  if [ -n "$LAST_BACKUP" ]; then
    BACKUP_STATUS=$(kubectl get job $LAST_BACKUP -o jsonpath='{.status.succeeded}' 2>/dev/null)
    BACKUP_AGE=$(( ($(date +%s) - $(kubectl get job $LAST_BACKUP -o jsonpath='.metadata.creationTimestamp' | date -u +%s)) / 3600 ))
    
    if [ "$BACKUP_STATUS" = "1" ] && [ "$BACKUP_AGE" -lt 24 ]; then
      check_pass "Recent backup successful (${BACKUP_AGE}h ago)"
    else
      check_warn "Last backup may be stale or failed"
    fi
  else
    check_warn "No backup jobs found"
  fi
else
  check_skip "Backup check skipped for non-production"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "=========================================="
echo "  PRE-FLIGHT CHECK SUMMARY"
echo "=========================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Warnings: $WARN"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ PRE-FLIGHT FAILED - Do not proceed with deployment"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "⚠️  PRE-FLIGHT PASSED WITH WARNINGS - Review warnings before proceeding"
  exit 0
else
  echo "✅ ALL PRE-FLIGHT CHECKS PASSED - Ready to deploy"
  exit 0
fi
```

---

## Rolling Update Procedure

### Standard Rolling Deployment

```bash
#!/bin/bash
# rolling_deploy.sh - Standard rolling update procedure

set -euo pipefail

VERSION=${1:?Usage: $0 <version> <environment>}
ENVIRONMENT=${2:-staging}
RELEASE_NAME="soc-platform"
NAMESPACE="soc-platform"
HELM_CHART="./helm/soc-platform"
VALUES_FILE="./helm/soc-platform/values-${ENVIRONMENT}.yaml"

echo "============================================"
echo "  ROLLING DEPLOYMENT PROCEDURE"
echo "============================================"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Release: $RELEASE_NAME"
echo "Namespace: $NAMESPACE"
echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Step 1: Record pre-deployment state
echo "[1/7] Recording pre-deployment state..."
mkdir -p ./deployments/$(date +%Y%m%d_%H%M%S)
PRE_DEPLOY_DIR="./deployments/$(ls -dt ./deployments/* | head -1)"

# Save current replica counts
kubectl get deployment -n $NAMESPACE -o wide > $PRE_DEPLOY_DIR/pre-deploy-state.txt
helm list -n $NAMESPACE > $PRE_DEPLOY_DIR/pre-helm-releases.txt
helm get values $RELEASE_NAME -n $NAMESPACE > $PRE_DEPLOY_DIR/pre-values.yaml

echo "Pre-deployment state saved to: $PRE_DEPLOY_DIR"

# Step 2: Create deployment marker
echo "[2/7] Creating deployment marker..."
kubectl create configmap deploy-marker \
  --from-literal=version="$VERSION" \
  --from-literal=start-time="$(date -Iseconds)" \
  --from-literal=deployer="$(whoami)" \
  --from-literal=status="deploying" \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Execute rolling update
echo "[3/7] Executing rolling update..."
echo "Command: helm upgrade --install $RELEASE_NAME $HELM_CHART \\"
echo "  -f $VALUES_FILE \\"
echo "  --set image.tag=$VERSION \\"
echo "  --namespace $NAMESPACE \\"
echo "  --wait --timeout 10m"

helm upgrade --install $RELEASE_NAME $HELM_CHART \
  -f $VALUES_FILE \
  --set image.tag=$VERSION \
  --namespace $NAMESPACE \
  --wait --timeout 10m \
  --history-max 10

if [ $? -ne 0 ]; then
  echo "ERROR: Helm upgrade failed!"
  echo "Initiating rollback procedure..."
  ./rollback.sh $RELEASE_NAME $NAMESPACE 1
  exit 1
fi

echo "Helm upgrade completed successfully"

# Step 4: Monitor rollout progress
echo "[4/7] Monitoring rollout progress..."

for DEPLOYMENT in $(kubectl get deployments -n $NAMESPACE -o name); do
  DEPLOY_NAME=$(basename $DEPLOYMENT)
  echo "Waiting for $DEPLOY_NAME rollout..."
  
  kubectl rollout status $DEPLOYMENT -n $NAMESPACE --timeout=300s
  
  if [ $? -ne 0 ]; then
    echo "WARNING: Rollout timeout for $DEPLOY_NAME"
    echo "Checking deployment status..."
    kubectl describe $DEPLOYMENT -n $NAMESPACE | tail -30
  fi
done

# Step 5: Verify pod health
echo "[5/7] Verifying pod health..."
sleep 10  # Allow for readiness probes

READY_PODS=$(kubectl get pods -n $NAMESPACE -l app=soc-platform \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.phase}{"\n"}{end}')

UNHEALTHY=$(echo "$READY_PODS" | grep -v "Running" | wc -l || true)

if [ "$UNHEALTHY" -eq 0 ]; then
  check_pass "All pods running and healthy"
else
  echo "WARNING: $UNHEALTHY unhealthy pods detected"
  echo "$READY_PODS"
fi

# Step 6: Run smoke tests
echo "[6/7] Running smoke tests..."
./scripts/smoke_tests.sh $ENVIRONMENT

SMOKE_RESULT=$?
if [ $SMOKE_RESULT -ne 0 ]; then
  echo "Smoke tests FAILED! Initiating rollback..."
  ./rollback.sh $RELEASE_NAME $NAMESPACE 1
  exit 1
fi

# Step 7: Update deployment marker
echo "[7/7] Updating deployment marker..."
kubectl create configmap deploy-marker \
  --from-literal=version="$VERSION" \
  --from-literal=start-time="$(date -Iseconds)" \
  --from-literal=deployer="$(whoami)" \
  --from-literal=status="complete" \
  --from-literal=completion-time="$(date -Iseconds)" \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Save post-deployment state
kubectl get deployment -n $NAMESPACE -o wide > $PRE_DEPLOY_DIR/post-deploy-state.txt

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "============================================"
echo "Version: $VERSION"
echo "Completed: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "Artifacts: $PRE_DEPLOY_DIR"
```

### Smoke Test Suite

```typescript
// scripts/smoke_tests.ts - Post-deployment smoke tests
import axios from 'axios';

interface SmokeTestResult {
  name: string;
  status: 'pass' | 'fail';
  duration_ms: number;
  error?: string;
  details?: string;
}

class SmokeTestSuite {
  private baseUrl: string;
  private results: SmokeTestResult[] = [];

  constructor(environment: string) {
    const urls: Record<string, string> = {
      staging: 'https://staging-soc.djezzy.local',
      production: 'https://soc.djezzy.local'
    };
    this.baseUrl = urls[environment] || urls.staging;
  }

  async runAll(): Promise<SmokeTestResult[]> {
    console.log(`Running smoke tests against ${this.baseUrl}`);
    
    await this.testHealthEndpoint();
    await this.testApiConnectivity();
    await this.testAuthentication();
    await this.testAlertRetrieval();
    await this.testDashboardLoad();
    
    return this.results;
  }

  private async testHealthEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      const duration = Date.now() - start;
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.results.push({
          name: 'Health Endpoint',
          status: 'pass',
          duration_ms: duration,
          details: `Status: ${response.data.status}`
        });
      } else {
        this.results.push({
          name: 'Health Endpoint',
          status: 'fail',
          duration_ms: duration,
          error: `Unexpected status: ${response.status}, data: ${JSON.stringify(response.data)}`
        });
      }
    } catch (error: any) {
      this.results.push({
        name: 'Health Endpoint',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: error.message
      });
    }
  }

  private async testApiConnectivity(): Promise<void> {
    const endpoints = [
      '/api/alerts?limit=1',
      '/api/incidents?limit=1',
      '/api/metrics',
      '/api/threats?limit=1'
    ];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500
        });

        this.results.push({
          name: `API: ${endpoint}`,
          status: response.status === 200 ? 'pass' : 'fail',
          duration_ms: Date.now() - start,
          details: `HTTP ${response.status}`
        });
      } catch (error: any) {
        this.results.push({
          name: `API: ${endpoint}`,
          status: 'fail',
          duration_ms: Date.now() - start,
          error: error.message
        });
      }
    }
  }

  private async testAuthentication(): Promise<void> {
    const start = Date.now();
    try {
      // Test that auth endpoint responds correctly
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: 'smoke-test-user',
        password: 'invalid-password-for-test'
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should get 401, not 500
      if (response.status === 401) {
        this.results.push({
          name: 'Authentication Endpoint',
          status: 'pass',
          duration_ms: Date.now() - start,
          details: 'Correctly rejects invalid credentials'
        });
      } else {
        this.results.push({
          name: 'Authentication Endpoint',
          status: 'fail',
          duration_ms: Date.now() - start,
          error: `Unexpected response code: ${response.status}`
        });
      }
    } catch (error: any) {
      this.results.push({
        name: 'Authentication Endpoint',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: error.message
      });
    }
  }

  private async testAlertRetrieval(): Promise<void> {
    const start = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/api/alerts`, {
        params: { limit: 5 },
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${process.env.SMOKE_TEST_TOKEN || ''}`
        },
        validateStatus: () => true
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        this.results.push({
          name: 'Alert Retrieval',
          status: 'pass',
          duration_ms: Date.now() - start,
          details: `Retrieved ${response.data.length} alerts`
        });
      } else {
        this.results.push({
          name: 'Alert Retrieval',
          status: 'warn',
          duration_ms: Date.now() - start,
          details: `Response code: ${response.status}`
        });
      }
    } catch (error: any) {
      this.results.push({
        name: 'Alert Retrieval',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: error.message
      });
    }
  }

  private async testDashboardLoad(): Promise<void> {
    const start = Date.now();
    try {
      const response = await axios.get(this.baseUrl, {
        timeout: 30000,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.includes('<html')) {
        this.results.push({
          name: 'Dashboard Load',
          status: 'pass',
          duration_ms: Date.now() - start,
          details: `Page loaded in ${Date.now() - start}ms`
        });
      } else {
        this.results.push({
          name: 'Dashboard Load',
          status: 'fail',
          duration_ms: Date.now() - start,
          error: `Invalid response`
        });
      }
    } catch (error: any) {
      this.results.push({
        name: 'Dashboard Load',
        status: 'fail',
        duration_ms: Date.now() - start,
        error: error.message
      });
    }
  }

  printSummary(): void {
    console.log('\n=== SMOKE TEST SUMMARY ===');
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}\n`);
    
    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${result.name} (${result.duration_ms}ms)`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.details) console.log(`   Details: ${result.details}`);
    }
    
    if (failed > 0) {
      console.log('\n❌ SMOKE TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ ALL SMOKE TESTS PASSED');
    }
  }
}

// Execute if run directly
const env = process.argv[2] || 'staging';
const suite = new SmokeTestSuite(env);
suite.runAll().then(() => suite.printSummary());
```

---

## Rollback Procedures

### Automated Rollback Script

```bash
#!/bin/bash
# rollback.sh - Automated rollback procedure

set -euo pipefail

RELEASE_NAME=${1:?Usage: $0 <release-name> [namespace] [revision]}
NAMESPACE=${2:-soc-platform}
REVISION=${3:-0}

echo "============================================"
echo "  ROLLBACK PROCEDURE"
echo "============================================"
echo "Release: $RELEASE_NAME"
echo "Namespace: $NAMESPACE"
echo "Revision: $REVISION (0 = previous)"
echo "Initiated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Determine target revision
if [ "$REVISION" = "0" ]; then
  CURRENT_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE --max 1 -o json | jq -r '.[0].revision')
  TARGET_REVISION=$((CURRENT_REVISION - 1))
  echo "Current revision: $CURRENT_REVISION"
  echo "Rolling back to previous revision: $TARGET_REVISION"
else
  TARGET_REVISION=$REVISION
  echo "Rolling back to specified revision: $TARGET_REVISION"
fi

# Validate target revision exists
REVISION_EXISTS=$(helm history $RELEASE_NAME -n $NAMESPACE --max 100 -o json | \
  jq --arg rev "$TARGET_REVISION" '.[] | select(.revision == ($rev | tonumber)) | .revision')

if [ -z "$REVISION_EXISTS" ]; then
  echo "ERROR: Revision $TARGET_REVISION does not exist"
  helm history $RELEASE_NAME -n $NAMESPACE
  exit 1
fi

# Get target revision info for logging
TARGET_INFO=$(helm history $RELEASE_NAME -n $NAMESPACE --max 100 -o json | \
  jq --arg rev "$TARGET_REVISION" '.[] | select(.revision == ($rev | tonumber))')

echo ""
echo "Target Revision Details:"
echo "$TARGET_INFO" | jq '{revision, updated, status, chart, app_version, description}'

# Confirm rollback (skip with --yes flag)
if [ "${4:-}" != "--yes" ]; then
  echo ""
  read -p "Confirm rollback to revision $TARGET_REVISION? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
  fi
fi

# Create rollback log directory
ROLLBACK_DIR="./rollbacks/$(date +%Y%m%d_%H%M%S)"
mkdir -p $ROLLBACK_DIR

# Capture current state before rollback
echo "Capturing pre-rollback state..."
kubectl get all -n $NAMESPACE > $ROLLBACK_DIR/pre-rollback-state.txt
helm status $RELEASE_NAME -n $NAMESPACE > $ROLLBACK_DIR/pre-helm-status.txt

# Execute rollback
echo ""
echo "Executing rollback..."
helm rollback $RELEASE_NAME $TARGET_REVISION -n $NAMESPACE --wait --timeout 10m

if [ $? -ne 0 ]; then
  echo "ERROR: Helm rollback command failed!"
  echo "Manual intervention required."
  
  # Attempt to diagnose
  echo ""
  echo "=== DIAGNOSTIC INFO ==="
  kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20
  kubectl describe deployment $(kubectl get deployment -n $NAMESPACE -o name | head -1) -n $NAMESPACE | tail -50
  
  exit 1
fi

# Monitor rollout after rollback
echo ""
echo "Monitoring post-rollback rollout..."
for DEPLOYMENT in $(kubectl get deployments -n $NAMESPACE -o name); do
  echo "Waiting for $(basename $DEPLOYMENT)..."
  kubectl rollout status $DEPLOYMENT -n $NAMESPACE --timeout=300s
done

# Wait for pods to stabilize
echo "Waiting for pod stabilization..."
sleep 30

# Verify rollback success
echo ""
echo "Verifying rollback success..."
POST_ROLLBACK_REVISION=$(helm history $RELEASE_NAME -n $NAMESPACE --max 1 -o json | jq -r '.[0].revision')

if [ "$POST_ROLLBACK_REVISION" = "$TARGET_REVISION" ]; then
  echo "✅ Rollback to revision $TARGET_REVISION confirmed"
else
  echo "⚠️  Unexpected revision after rollback: $POST_ROLLBACK_REVISION"
fi

# Check pod health
READY_PODS=$(kubectl get pods -n $NAMESPACE -l app=soc-platform \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.status.phase}{"\n"}{end}' | grep -c "Running")

TOTAL_PODS=$(kubectl get pods -n $NAMESPACE -l app=soc-platform --no-headers | wc -l)

echo "Pod status: $READY_PODS/$TOTAL_PODS running"

# Capture post-rollback state
kubectl get all -n $NAMESPACE > $ROLLBACK_DIR/post-rollback-state.txt
helm status $RELEASE_NAME -n $NAMESPACE > $ROLLBACK_DIR/post-helm-status.txt

# Generate rollback report
cat > $ROLLBACK_DIR/rollback-report.md <<EOF
# Rollback Report

**Timestamp:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')
**Initiator:** $(whoami)
**Release:** $RELEASE_NAME
**Namespace:** $NAMESPACE

## Rollback Details
- **From Revision:** $CURRENT_REVISION
- **To Revision:** $TARGET_REVISION
- **Reason:** Manual/Automated trigger

## Post-Rollback Status
- **Current Revision:** $POST_ROLLBACK_REVISION
- **Healthy Pods:** $READY_PODS/$TOTAL_PODS

## Artifacts Location
$ROLLBACK_DIR

## Next Steps
- [ ] Investigate root cause of failed deployment
- [ ] Address issues before redeploying
- [ ] Update runbooks if needed
EOF

echo ""
echo "============================================"
echo "  ROLLBACK COMPLETED"
echo "============================================"
echo "Artifacts: $ROLLBACK_DIR"
echo "Report: $ROLLBACK_DIR/rollback-report.md"
```

---

## Rollback Triggers

### Automatic Rollback Conditions

The following conditions should trigger automatic or immediate manual rollback:

| Trigger Category | Condition | Action | Threshold |
|------------------|-----------|--------|-----------|
| **Error Rate** | HTTP 5xx errors spike | Auto-rollback | > 5% for 2 minutes |
| **Latency** | P95/P99 latency degradation | Auto-rollback | > 3x baseline for 5 min |
| **Crash Looping** | Pods repeatedly restarting | Auto-rollback | > 3 restarts in 5 min |
| **Health Check Failure** | /health returns unhealthy | Auto-rollback | Continuous for 60 seconds |
| **Data Corruption** | Database query failures | Manual rollback | Any occurrence |
| **Security Alert** | New vulnerability discovered | Emergency rollback | Per severity |

### Rollback Decision Flowchart

```
DEPLOYMENT ISSUE DETECTED
         │
         ▼
Is it a ROLLBACK TRIGGER condition?
         │
    ┌────┴────┐
    │ YES     │ NO
    ▼         ▼
Automatic?   Continue
rollback     monitoring
possible?
    │
┌───┴───┐
│YES    │ NO
▼       ▼
Execute Initiate
auto-  manual
roll-  rollback
back    procedure
    │       │
    └───┬───┘
        ▼
   VERIFY
   rollback
   success
        │
        ▼
   INVESTIGATE
   root cause
```

### Monitoring During Deployment Window

```yaml
# deployment_monitoring_rules.yml
# Prometheus rules active during deployment windows
groups:
  - name: deployment_safety
    interval: 15s
    rules:
      # Error rate spike detection
      - alert: DeploymentErrorRateSpike
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[2m]))
            /
            sum(rate(http_requests_total[2m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          action: auto_rollback
        annotations:
          summary: "Error rate exceeded threshold during deployment"
          description: "Error rate is {{ $value | humanizePercentage }} (>5%)"

      # Crash looping detection
      - alert: DeploymentCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total[10m]) > 3
        for: 2m
        labels:
          severity: critical
          action: auto_rollback
        annotations:
          summary: "Pod crash looping detected"
          description: "{{ $labels.pod }} has restarted {{ $value }} times"

      # Latency degradation
      - alert: DeploymentLatencyDegradation
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[3m])
          ) > 3
        for: 3m
        labels:
          severity: warning
          action: monitor_closely
        annotations:
          summary: "P95 latency degraded during deployment"
          description: "P95 latency is {{ $value }}s (>3x baseline)"

      # Health check failure
      - alert: DeploymentHealthCheckFailure
        expr: up{job="soc-platform"} == 0
        for: 1m
        labels:
          severity: critical
          action: auto_rollback
        annotations:
          summary: "Health check failing after deployment"
          description: "Instance {{ $labels.instance }} is down"
```

---

## Post-Deployment Validation

### Validation Checklist

```markdown
## POST-DEPLOYMENT VALIDATION

**Deployment ID:** DEP-[ID]
**Version Deployed:** [VERSION]
**Deployed By:** [NAME]

### Immediate Validation (First 15 minutes)
- [ ] All pods running and ready
- [ ] No crash loops observed
- [ ] Health endpoint returning 'healthy'
- [ ] Error rates at normal baseline (< 1%)
- [ ] Latency within acceptable range

### Functional Validation (First hour)
- [ ] User login/logout working
- [ ] Dashboard loads correctly
- [ ] Alerts display properly
- [ ] Incident creation works
- [ ] Reports generate successfully
- [ ] Search functionality operational

### Integration Validation (First 2 hours)
- [ ] SIEM integration processing logs
- [ ] SOAR playbooks triggering correctly
- [ ] Threat intelligence feeds updating
- [ ] Email notifications sending
- [ ] External API calls succeeding

### Extended Monitoring (24 hours)
- [ ] Memory usage stable (no leaks)
- [ ] CPU utilization normal
- [ ] Database connection pool healthy
- [ ] No unexpected errors in logs
- [ ] User activity patterns normal

### Sign-off
- [ ] Deployer sign-off: _______________ Time: _______
- [ ] QA validation: _______________ Time: _______
- [ ] Operations acceptance: _______________ Time: _______
```

---

## Environment-Specific Procedures

### Staging Deployment

Staging deployments follow an accelerated process:

1. **No CAB approval required** (Tech Lead sufficient)
2. **Automated testing mandatory** before promotion
3. **Data can be refreshed** from production snapshot
4. **Feature flags** should be enabled for testing

### Production Deployment

Production requires additional controls:

1. **Change Advisory Board (CAB)** approval for major releases
2. **Maintenance window** scheduled during low-traffic period
3. **On-call engineer** must be available during deployment
4. **Communication** sent to stakeholders before and after
5. **Rollback plan** documented and validated

### Production Deployment Communication Templates

**Pre-Deployment Notice (24 hours ahead):**

```markdown
Subject: Scheduled Maintenance - SOC Platform Update

Dear SOC Users,

A scheduled maintenance window has been planned for the 
Djezzy National SOC Platform:

**Date:** [DATE]
**Time:** [START_TIME] - [END_TIME] UTC
**Duration:** Approximately [X] minutes
**Impact:** Brief service interruption expected

**Changes:**
- [Summary of changes]

**What to expect:**
- Platform may be unavailable for short periods
- Active sessions will need to reconnect
- Running reports may need to be restarted

Questions: Contact soc-ops@djezzy.dz

Thank you for your patience.
SOC Operations Team
```

**Post-Deployment Confirmation:**

```markdown
Subject: Maintenance Complete - SOC Platform v[VERSION]

Dear SOC Users,

Scheduled maintenance has been completed successfully.

**Completed At:** [TIME] UTC
**Platform Version:** v[VERSION]
**Downtime Experienced:** [ACTUAL]/[ESTIMATED] minutes

**Verification:**
✓ All systems operational
✓ Health checks passing
✓ User access verified

Please report any issues to soc-help@djezzy.dz

SOC Operations Team
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-05-01 | DevOps Team | Initial creation |
| 1.5 | 2025-01-10 | DevOps Lead | Added monitoring triggers, templates |

---

*This document supports safe deployment practices. Review quarterly and after any deployment incidents.*
