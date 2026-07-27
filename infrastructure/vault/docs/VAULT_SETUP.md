# National SOC Platform - HashiCorp Vault Setup Guide
# Djezzy Telecom - Production Secrets Management

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Secrets Engines Setup](#secrets-engines-setup)
7. [Authentication Methods](#authentication-methods)
8. [Kubernetes Integration](#kubernetes-integration)
9. [CI/CD Integration](#cicd-integration)
10. [Secret Rotation](#secret-rotation)
11. [Monitoring & Alerting](#monitoring--alerting)
12. [Disaster Recovery](#disaster-recovery)
13. [Runbooks](#runbooks)

---

## Overview

HashiCorp Vault is the centralized secrets management solution for the Djezzy National SOC Platform. It provides:

- **Secrets Encryption**: AES-256-GCM encryption at rest and in transit
- **Dynamic Credentials**: Short-lived database credentials (auto-rotating)
- **Identity-Based Access**: LDAP/AD integration with Djezzy corporate directory
- **Audit Logging**: Complete audit trail for ARTP/ANSSI compliance
- **High Availability**: Multi-node cluster with automatic failover

### Key Benefits

| Feature | Benefit | Compliance Impact |
|---------|---------|-------------------|
| Dynamic DB Credentials | No static passwords | ✅ ANSSI |
| Auto-Rotation | Reduced exposure window | ✅ ARTP |
| Audit Logs | Complete traceability | ✅ Both |
| Encryption as Service | Data protection | ✅ GDPR |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Djezzy SOC Platform                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Web    │  │   API    │  │   SIEM   │  │   SOAR   │   │
│  │   App    │  │ Server   │  │ (Wazuh)  │  │(TheHive) │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       ▼             ▼             ▼             ▼          │
│  ┌──────────────────────────────────────────────────┐      │
│  │           External Secrets Operator              │      │
│  │         (Vault → Kubernetes Secrets Sync)        │      │
│  └────────────────────┬─────────────────────────────┘      │
│                       │                                    │
│                       ▼                                    │
│  ┌──────────────────────────────────────────────────┐      │
│  │                 HashiCorp Vault                   │      │
│  │                                                   │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │      │
│  │  │   KV    │ │Database │ │ Transit │            │      │
│  │  │  v2     │ │ Engine  │ │  Engine │            │      │
│  │  └─────────┘ └─────────┘ └─────────┘            │      │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │      │
│  │  │   PKI   │ │  LDAP   │ │  JWT    │            │      │
│  │  │ Engine  │ │  Auth   │ │  Auth   │            │      │
│  │  └─────────┘ └─────────┘ └─────────┘            │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  Backends:                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │PostgreSQL│  │  Redis   │  │Consul/Raft│                  │
│  │ Primary  │  │ Cluster  │  │ Storage  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | High Availability |
|-----------|---------|-------------------|
| **Vault Server** | Secrets engine | 3+ nodes, Raft consensus |
| **Consul** | Service discovery | 3+ nodes |
| **PostgreSQL** | Database backend | Streaming replication |
| **External Secrets Operator** | K8s sync | Deployment (1 replica) |

---

## Prerequisites

### Infrastructure Requirements

```yaml
# Minimum production specifications
vault:
  cpu: "2 cores"
  memory: "4 GiB"
  storage: "50 GiB SSD"
  
consul:
  cpu: "1 core"
  memory: "2 GiB"
  storage: "20 GiB SSD"

network:
  latency: "<5ms between nodes"
  bandwidth: "1 Gbps dedicated"
```

### Software Requirements

- **Kubernetes**: v1.25+
- **Helm**: v3.12+
- **Vault**: v1.15+ (Enterprise recommended)
- **Consul**: v1.16+ (if using Consul storage)
- **AWS/GCP/Azure KMS**: For auto-unseal

### Access Requirements

- AWS IAM role for KMS auto-unseal
- Djezzy AD service account for LDAP auth
- TLS certificates from Djezzy Internal CA or Let's Encrypt

---

## Installation

### Option A: Helm Chart (Recommended for Kubernetes)

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Create namespace
kubectl create namespace vault-system

# Install Vault with HA configuration
helm install vault hashicorp/vault \
  --namespace vault-system \
  --values infrastructure/vault/config/values-production.yaml \
  --wait \
  --timeout=10m
```

### Option B: Docker Compose (Development/Staging)

```bash
cd infrastructure/vault/config

docker compose up -d

# Initialize Vault (first time only)
docker exec vault-container vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > init-keys.json

# Unseal Vault (requires 3 of 5 keys)
docker exec vault-container vault operator unseal <KEY_1>
docker exec vault-container vault operator unseal <KEY_2>
docker exec vault-container vault operator unseal <KEY_3>
```

### Option C: Standalone Binary (Bare Metal)

```bash
# Download Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/
sudo chmod +x /usr/local/bin/vault

# Create config directory
sudo mkdir -p /etc/vault /opt/vault/data /var/log/vault
sudo cp vault.hcl /etc/vault/vault.hcl

# Create systemd service
sudo cp systemd/vault.service /etc/systemd/system/
sudo systemctl enable vault
sudo systemctl start vault
```

---

## Configuration

### Main Configuration File

The main configuration is in `infrastructure/vault/config/vault.hcl`.

Key settings to customize:

```hcl
# Storage Backend (choose one)
storage "raft" {
  path = "/opt/vault/data"
}

# Listener (TLS required)
listener "tcp" {
  address = ":8200"
  tls_cert_file = "/etc/vault/tls/server.crt"
  tls_key_file = "/etc/vault/tls/server.key"
}

# Auto-unseal (recommended for production)
seal "awskms" {
  region = "eu-west-3"  # Paris region for Algeria
  kms_key_id = "alias/vault-unseal-key"
}
```

### Environment Variables

```bash
# Required
export VAULT_ADDR="https://vault.djezzy.dz"
export VAULT_NAMESPACE=""  # Enterprise only

# For CLI access
export VAULT_TOKEN="<root-token>"  # Only during initial setup
```

---

## Secrets Engines Setup

After installation, run the setup script:

```bash
chmod +x infrastructure/vault/config/setup-secrets-engines.sh
./infrastructure/vault/config/setup-secrets-engines.sh
```

This configures:

### 1. KV Secrets Engine (v2)

Path: `soc-platform/data/*`

Stores:
- Application configuration
- API keys (encrypted)
- Integration credentials
- Environment-specific secrets

```bash
# Example: Write a secret
vault kv put soc-platform/data/auth/jwt \
  access_secret=$(openssl rand -base64 32) \
  refresh_secret=$(openssl rand -base64 32) \
  issuer="https://soc.djezzy.dz" \
  audience="soc-platform"

# Read a secret
vault kv get soc-platform/data/auth/jwt

# List all secrets
vault kv list soc-platform/data/
```

### 2. Database Secrets Engine

Path: `database/creds/*`

Provides dynamic PostgreSQL credentials:

```bash
# Generate read-only credentials (1 hour lease)
vault read database/creds/soc-app-read

# Output:
# Key                Value
# ---                -----
# lease_id           database/creds/soc-app-read/abc123
# lease_duration     1h
# renewable          true
# username           v-soc-app-read-abc123xyz
# password           A1b2C3d4E5f6...

# Credentials automatically revoked after lease expires!
```

### 3. Transit Secrets Engine

Path: `transit/*`

Encryption operations without handling raw keys:

```bash
# Encrypt data
vault write transit/encrypt/soc-data \
  plaintext=$(echo -n "sensitive-data" | base64)

# Output ciphertext: vault:v1:abc123...

# Decrypt data
vault write transit/decrypt/soc-data \
  ciphertext="vault:v1:abc123..."

# Sign JWT claims
vault write transit/sign/jwt-signing-key \
  input=$(echo -n '{"sub":"user123"}' | base64)
```

### 4. PKI Secrets Engine

Path: `pki-int/*`

Internal TLS certificate management:

```bash
# Issue server certificate
vault write pki-int/issue/soc-server \
  common_name="app.soc.djezzy.dz" \
  ttl="2160h"  # 90 days

# Output: PEM-encoded certificate + private key + CA chain
```

---

## Authentication Methods

### 1. Kubernetes Auth (Primary for Pods)

Automatically authenticates pods based on ServiceAccount:

```bash
# Configure (one-time setup)
vault write auth/kubernetes/config \
  kubernetes_host=https://kubernetes.default.svc:443 \
  token_reviewer_jwt_file=/var/run/secrets/kubernetes.io/serviceaccount/token

# Create role for SOC platform
vault write auth/kubernetes/role/soc-app \
  bound_service_account_names="soc-platform-app" \
  bound_service_account_namespaces="soc-platform" \
  policies="soc-admin" \
  ttl="24h"
```

Pod authentication happens automatically via External Secrets Operator.

### 2. LDAP/AD Auth (For Human Users)

Integrates with Djezzy corporate Active Directory:

```bash
# Login with corporate credentials
vault login -method=ldap \
  username=abenali \
  password='your-ad-password'

# Policies assigned based on AD group membership:
# - SOC_Admins → soc-admin policy
# - Threat_Hunters → soc-responder policy
# - SOC_Analysts → soc-analyst policy
```

### 3. JWT/OIDC Auth (CI/CD Pipelines)

GitHub Actions integration:

```bash
# GitHub Actions workflow authenticates using OIDC token
# See .github/workflows/vault-integration.yml

# Manual test:
vault login -method=jwt \
  role=github-ci \
  jwt="<github-oidc-token>"
```

### 4. AppRole Auth (Machine-to-Machine)

For non-interactive services:

```bash
# Get RoleID and SecretID (securely distributed)
vault read auth/approle/role/telecom-probe/role-id
vault write -f auth/approle/role/telecom-probe/secret-id

# Login
vault login -method=approle \
  role_id=<ROLE_ID> \
  secret_id=<SECRET_ID>
```

---

## Kubernetes Integration

The External Secrets Operator (ESO) syncs Vault secrets to Kubernetes.

### Installation

```bash
# Install ESO
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

### Apply External Secret Manifests

```bash
kubectl apply -f infrastructure/vault/manifests/external-secrets.yaml
```

This creates:
- **ClusterSecretStore**: Connection to Vault
- **ServiceAccount**: Authentication identity
- **ExternalSecrets**: Individual secret mappings

### Verify Synchronization

```bash
# Check secret status
kubectl get externalsecrets -n soc-platform

# View synced Kubernetes secret
kubectl get secret jwt-secrets -n soc-platform -o yaml

# Watch for changes
kubectl get externalsecrets -n soc-platform -w
```

### Refresh Intervals

| Secret Type | Refresh Interval | Reason |
|-------------|------------------|--------|
| Database creds | 1 hour | Dynamic rotation |
| JWT secrets | 24 hours | Infrequent change |
| API keys | 12 hours | Moderate rotation |
| TLS certs | 7 days | Certificate lifecycle |
| Compliance | Monthly | Regulatory cycle |

---

## CI/CD Integration

GitHub Actions workflow integrates with Vault for secure deployments.

### Workflow Trigger

```yaml
# Call the Vault integration workflow
jobs:
  deploy:
    uses: ./.github/workflows/vault-integration.yml
    with:
      environment: production
      vault_role: github-ci
      secrets_needed: "auth/jwt,config/app,integrations/wazuh,database/creds"
```

### What Happens

1. **Authentication**: GitHub OIDC token exchanged for Vault token
2. **Secret Fetching**: Requested secrets retrieved from Vault
3. **Dynamic Credentials**: Database credentials generated on-the-fly
4. **Injection**: Secrets available as masked environment variables
5. **Cleanup**: Token and leases revoked after job completion

### Security Features

- ✅ Tokens valid for max 1 hour
- ✅ All values masked in logs
- ✅ Automatic cleanup on job end
- ✅ Audit trail of all accesses

---

## Secret Rotation

### Automated Rotation Script

Location: `infrastructure/vault/scripts/rotate-secrets.sh`

#### Schedule via CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-secret-rotation
  namespace: vault-system
spec:
  schedule: "0 2 * * 0"  # Sunday 02:00 Algeria time
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vault-auth-sa
          containers:
          - name: rotator
            image: vault:1.15.0
            command: ["/scripts/rotate-secrets.sh", "all"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
            env:
            - name: VAULT_ADDR
              value: "https://vault.djezzy.dz:8200"
            - name: VAULT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: vault-token
                  key: token
          volumes:
          - name: scripts
            configMap:
              name: vault-rotation-scripts
```

#### Manual Execution

```bash
# Rotate all secrets
./rotate-secrets.sh all

# Dry run (preview only)
./rotate-secrets.sh --dry-run

# Force rotation (skip confirmation)
./rotate-secrets.sh --force

# Rotate specific type
./rotate-secrets.sh jwt
./rotate-secrets.sh api-keys
./rotate-secrets.sh certs
```

### Rotation Schedule

| Secret Type | Frequency | Method |
|--------------|-----------|--------|
| JWT signing keys | Weekly | Key rotation |
| Database creds | Automatic | Dynamic (1h lease) |
| API keys | Monthly | Regeneration |
| TLS certificates | Before expiry | PKI re-issue |
| Encryption keys | Annually | Key rotation + re-encrypt |
| LDAP bind password | Quarterly | Coordination with AD team |

---

## Monitoring & Alerting

### Prometheus Metrics

Vault exposes metrics at `/v1/sys/metrics` (requires metrics capability):

```yaml
# Prometheus scrape config
scrape_configs:
  - job_name: 'vault'
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    scheme: https
    tls_config:
      ca_file: /etc/vault/tls/ca.crt
    bearer_token: <VAULT_TOKEN>
    static_configs:
      - targets: ['vault.djezzy.dz:8200']
```

### Key Metrics to Monitor

| Metric | Alert Condition | Severity |
|--------|-----------------|----------|
| `vault.core.unsealed` | == 0 | CRITICAL |
| `vault.runtime.heap_alloc_bytes` | > 8GB | WARNING |
| `vault.token.count` | Spike > 1000/min | INFO |
| `vault.http.request.duration_seconds` | P99 > 500ms | WARNING |
| `vault.database.creds.issued` | == 0 for >1h | WARNING |

### Grafana Dashboard

Import dashboard from: `monitoring/grafana/dashboards/vault.json`

Includes:
- Token usage trends
- Lease counts by engine
- Request latency distribution
- Memory utilization
- Seal status

### Alert Rules

```yaml
# monitoring/prometheus/vault-alerts.yml
groups:
- name: vault_alerts
  rules:
  - alert: VaultSealed
    expr: vault_core_unsealed == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Vault instance is sealed!"
      
  - alert: VaultHighMemory
    expr: vault_runtime_heap_alloc_bytes > 8589934592
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Vault memory usage > 8GB"
      
  - alert: VaultTokenLeakDetected
    expr: increase(vault_token_count[1h]) > 1000
    labels:
      severity: info
    annotations:
      summary: "Unusual token creation rate detected"
```

---

## Disaster Recovery

### Backup Strategy

#### 1. Raft Snapshots (Automatic)

```bash
# Take manual snapshot
vault operator raft snapshot save -force backup-$(date +%Y%m%d).raft

# List snapshots
vault operator raft snapshot list

# Restore from snapshot
vault operator raft snapshot restore backup-20240101.raft
```

#### 2. Export/Import (Full Migration)

```bash
# Export all secrets (encrypted)
vault operator migrate -target-addr="https://new-vault.djezzy.dz:8200"

# Or use kv export tool
vault kv export soc-platform/data/ > soc-platform-backup.json
```

#### 3. Snapshot to S3 (Automated)

Configure in `vault.hcl`:

```hcl
audit "file" {
  options = {
    sync {
      prefix = "audit/vault/"
      target = "s3://djezzy-vault-backups-${ENVIRONMENT}/"
      region = "eu-west-3"
    }
  }
}
```

### Recovery Procedures

See Runbooks section below for detailed recovery procedures.

---

## Runbooks

### RB-001: Vault Unseal After Restart

**Trigger**: Pod restart, node failure

**Symptoms**:
- `vault status` shows sealed: true
- Applications getting 503 errors
- External Secrets not syncing

**Resolution**:

```bash
# Check seal status
kubectl exec -it vault-0 -n vault-system -- vault status

# If sealed, unseal with KMS (automatic if configured)
# Or manually:
kubectl exec -it vault-0 -n vault-system -- vault operator unseal <UNSEAL_KEY>
kubectl exec -it vault-0 -n vault-system -- vault operator unseal <UNSEAL_KEY>
kubectl exec -it vault-0 -n vault-system -- vault operator unseal <UNSEAL_KEY>

# Verify
kubectl exec -it vault-0 -n vault-system -- vault status
```

**Prevention**:
- Enable auto-unseal with AWS KMS/GCP KMS
- Ensure KMS key has proper IAM permissions

---

### RB-002: Lost Root Token

**Trigger**: Token expired, not documented

**Symptoms**:
- Cannot authenticate with root token
- Cannot perform admin operations

**Resolution**:

```bash
# Generate new root token (requires physical access to 3 of 5 key holders)
vault operator generate-root -init
vault operator generate-root \
  -nonce=<NONCE> \
  -shard=<SHARD_1>
vault operator generate-root \
  -nonce=<NONCE> \
  -shard=<SHARD_2>
vault operator generate-root \
  -nonce=<NONCE> \
  -shard=<SHARD_3>

# New root token will be displayed
# Store securely and revoke old tokens
```

**Prevention**:
- Store root token in secure password manager
- Use admin policies instead of root token for daily ops
- Document key holders and emergency contacts

---

### RB-003: Secret Not Syncing to K8s

**Trigger**: ESO error, Vault connectivity issue

**Symptoms**:
- `kubectl get secret` shows old value
- Application using stale credentials
- ExternalSecret in error state

**Resolution**:

```bash
# Check ExternalSecret status
kubectl get externalsecret <NAME> -n soc-platform -o yaml

# Describe for error details
kubectl describe externalsecret <NAME> -n soc-platform

# Check ESO pod logs
kubectl logs -l app.kubernetes.io/name=external-secrets -n external-secrets

# Common fixes:
# 1. Reconcile the ExternalSecret
kubectl annotate externalsecret <NAME> -n soc-platform force-sync=$(date +%s)

# 2. Restart ESO controller
kubectl rollout restart deployment external-secrets -n external-secrets

# 3. Verify Vault connectivity
kubectl run vault-test --image=curlimages/curl -- curl -sf ${VAULT_ADDR}/v1/sys/health
```

**Prevention**:
- Set appropriate refresh intervals
- Monitor ESO reconciliation errors
- Network policies allow ESO→Vault communication

---

### RB-004: Database Credential Exhaustion

**Trigger**: Leaks not revoked, high traffic

**Symptoms**:
- `vault read database/creds/<role>` fails
- Error: "maximum number of roles reached"
- Application connection failures

**Resolution**:

```bash
# Check active leases
vault list sys/leases/lookup/database/creds/

# Bulk revoke old leases
vault list sys/leases/lookup/database/creds/soc-app-read | jq -r '.[]' | while read lease; do
  vault lease revoke "$lease" 2>/dev/null || true
done

# Increase max credential limit (if needed)
vault write database/config/postgresql-production \
  max_connection_lifetime=1h \
  max_open_connections=100

# Verify
vault read database/creds/soc-app-read
```

**Prevention**:
- Set reasonable lease TTLs (1h default)
- Monitor lease count
- Implement proper cleanup in applications

---

### RB-005: Emergency Secret Exposure

**Trigger**: Accidental commit, log leak, breach

**Symptoms**:
- Secret found in git history
- Secret visible in logs/alerts
- Security incident reported

**Resolution**:

```bash
# IMMEDIATE ACTIONS (within 15 minutes):

# 1. Revoke compromised dynamic credentials
vault lease revoke -force-prefix="database/creds/"

# 2. Rotate static secrets
./rotate-secrets.sh --force api-keys
./rotate-secrets.sh --force jwt

# 3. Revoke any exposed tokens
vault token revoke <COMPROMISED_TOKEN>

# 4. Check audit logs for abuse
vault audit list -format=json | grep <TIMESTAMP_RANGE>

# 5. Notify security team
# Send PagerDuty alert, Slack notification

# POST-INCIDENT:
# 6. Review access patterns
# 7. Update policies if needed
# 8. Document incident
# 9. Implement additional controls
```

**Prevention**:
- Never log secrets (use Vault agent injection)
- Enable audit logging
- Regular secret access reviews
- Train developers on secret hygiene

---

## Support & Escalation

| Issue Type | First Response | Escalation | SLA |
|------------|----------------|-------------|-----|
| Sealed Vault | 5 min | On-call | 15 min restore |
| Secret Exposure | Immediate | Security Lead | 30 min rotate |
| Sync Failure | 15 min | Platform Team | 1 hour fix |
| Performance | 30 min | Vault Admin | 4 hour resolve |

### Contacts

- **Vault Admins**: vault-admins@djezzy.dz
- **Security Team**: security@djezzy.dz
- **On-Call**: PagerDuty schedule "vault-oncall"
- **Emergency**: +213 XX XX XX XX (SOC Operations Center)

---

## Appendix

### Useful Commands Reference

```bash
# Status checks
vault status
vault operator raft list-peers
vault sys health

# Token management
vault token lookup
vault token renew
vault token revoke <token_id>

# Lease management
vault lease lookup <lease_id>
vault lease renew <lease_id>
vault lease revoke <lease_id>
vault lease revoke-prefix database/creds/

# Policy management
vault policy read soc-admin
vault policy write my-policy my-policy.hcl
vault policy list

# Audit
vault audit list
vault audit enable file file_path=/vault/audit.log

# Migration
vault operator migrate -config=migration.hcl
```

### Troubleshooting Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| permission denied | Wrong policy | Check token policies |
| seal is sealed | Node restarted | Unseal with keys |
| no handler for route | Path doesn't exist | Enable secrets engine |
| lease not found | Already revoked | Generate new credential |
| connection refused | Vault down | Check pod/service status |

---

*Document Version: 1.0*
*Last Updated: $(date +%Y-%m-%d)*
*Maintained by: Djezzy SOC Platform Team*
