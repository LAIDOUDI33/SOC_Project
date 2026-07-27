# ============================================================
# National SOC Platform - Vault Policies
# Djezzy Telecom - Role-Based Access Control
# ============================================================
#
# Policy Hierarchy:
# - admin (Full access)
# - soc-admin (SOC Platform administration)
# - soc-analyst (Read-only operational access)
# - soc-responder (Incident response with write)
# - ci-cd (Pipeline automation)
# - monitoring (Prometheus/Grafana read)
# - backup (Backup/restore operations)
#

# ============================================================
# Policy: admin (Vault Administrators)
# ============================================================

path "sys/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "identity/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/leases/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/renew/*" {
  capabilities = ["create", "update"]
}

path "audit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Full access to all secrets
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "soc-platform/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Database management
path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# PKI management
path "pki/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Transit encryption
path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# ============================================================
# Policy: soc-admin (SOC Platform Admins)
# ============================================================

path "soc-platform/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "soc-platform/metadata/*" {
  capabilities = ["list", "read", "delete"]
}

# Database credentials
path "database/creds/soc-app-*" {
  capabilities = ["read"]
}

path "database/roles/soc-app-*" {
  capabilities = ["read"]
}

# JWT signing keys (read only for verification)
path "transit/keys/jwt-signing-key" {
  capabilities = ["read", "verify"]
}

# LDAP integration secrets
path "soc-platform/data/auth/ldap" {
  capabilities = ["read", "update"]
}

# SAML certificates
path "soc-platform/data/auth/saml/*" {
  capabilities = ["read", "update"]
}

# Encryption keys (for data at rest)
path "transit/encrypt/soc-data" {
  capabilities = ["update"]
}

path "transit/decrypt/soc-data" {
  capabilities = ["update"]
}

# ============================================================
# Policy: soc-analyst (SOC Analysts - Read-Only)
# ============================================================

# Application configuration (read-only)
path "soc-platform/data/config/*" {
  capabilities = ["read"]
}

path "soc-platform/metadata/config/*" {
  capabilities = ["list", "read"]
}

# API keys and tokens (masked read)
path "soc-platform/data/api-keys/*" {
  capabilities = ["deny"]  # No direct access, use dynamic creds
}

# Database credentials (dynamic, short-lived)
path "database/creds/soc-app-read" {
  capabilities = ["read"]
}

# Third-party integrations (SIEM, SOAR) - read only
path "soc-platform/data/integrations/wazuh" {
  capabilities = ["read"]
}

path "soc-platform/data/integrations/thehive" {
  capabilities = ["read"]
}

path "soc-platform/data/integrations/cortex" {
  capabilities = ["read"]
}

# Monitoring endpoints
path "soc-platform/data/monitoring/*" {
  capabilities = ["read"]
}

# Compliance data (ARTP, ANSSI)
path "soc-platform/data/compliance/*" {
  capabilities = ["read"]
}

# ============================================================
# Policy: soc-responder (Incident Responders)
# ============================================================

# Everything analysts can do
path "soc-platform/data/config/*" {
  capabilities = ["read"]
}

path "database/creds/soc-app-read" {
  capabilities = ["read"]
}

# Additional: Write to incident-related paths
path "soc-platform/data/incidents/*" {
  capabilities = ["create", "read", "update"]
}

path "soc-platform/metadata/incidents/*" {
  capabilities = ["list", "read"]
}

# SOAR playbook execution
path "soc-platform/data/playbooks/*" {
  capabilities = ["read", "update"]
}

# Threat intelligence feeds
path "soc-platform/data/threat-intel/*" {
  capabilities = ["create", "read", "update"]
}

# Emergency: Escalation rights during incidents
path "soc-platform/data/emergency/*" {
  capabilities = ["create", "read", "update"]
}

# ============================================================
# Policy: ci-cd (GitHub Actions / CI Pipeline)
# ============================================================

# Read deployment configurations
path "soc-platform/data/deployments/*" {
  capabilities = ["read"]
}

# Generate database migration credentials
path "database/creds/soc-migration" {
  capabilities = ["read"]
}

# Read build-time secrets (not runtime!)
path "soc-platform/data/build/*" {
  capabilities = ["read"]
}

# JWT key for CI testing (separate from production)
path "transit/sign/jwt-ci-key" {
  capabilities = ["update"]
}

path "transit/verify/jwt-ci-key" {
  capabilities = ["update"]
}

# Docker registry credentials (for pushing images)
path "soc-platform/data/docker/registry" {
  capabilities = ["read"]
}

# Kubernetes service account token generation
path "auth/kubernetes/role/ci-pipeline" {
  capabilities = ["read"]
}

# Limited time-to-live for CI secrets
path "sys/leases/renew" {
  capabilities = ["update"]
  required_parameters = {
    increment = "3600"  # Max 1 hour renewal
  }
}

# ============================================================
# Policy: monitoring (Prometheus, Grafana)
# ============================================================

# Health check endpoints
path "soc-platform/data/health/*" {
  capabilities = ["read"]
}

# Metrics collection tokens
path "soc-platform/data/metrics/token" {
  capabilities = ["read"]
}

# Database metrics user
path "database/creds/soc-metrics" {
  capabilities = ["read"]
}

# Read-only monitoring config
path "soc-platform/data/config/monitoring" {
  capabilities = ["read"]
}

# ============================================================
# Policy: backup (Backup Operations)
# ============================================================

# Snapshot creation
path "sys/storage/raft/snapshot" {
  capabilities = ["update"]
}

# All secret backup (encrypted export)
path "secret/*" {
  capabilities = ["read"]
}

path "soc-platform/*" {
  capabilities = ["read"]
}

# Backup-specific path
path "backup/*" {
  capabilities = ["create", "read", "update"]
}

# ============================================================
# Policy: telecom-probe (SS7/SIP/GTP Probes)
# ============================================================

# Probe authentication credentials
path "soc-platform/data/telecom/probes/*" {
  capabilities = ["read"]
}

# Dynamic credentials for probe databases
path "database/creds/soc-probe-db" {
  capabilities = ["read"]
}

# HLR/HSS API keys
path "soc-platform/data/telecom/hlr-api" {
  capabilities = ["read"]
}

# Diameter gateway certs
path "soc-platform/data/telecom/diameter/*" {
  capabilities = ["read"]
}

# ============================================================
# Policy: compliance (ARTP/ANSSI Auditors)
# ============================================================

# Compliance reports and evidence
path "soc-platform/data/compliance/*" {
  capabilities = ["read"]
}

# Audit logs (read-only, no delete)
path "sys/audit" {
  capabilities = ["read", "list"]
}

# Policy review
path "sys/policies/acl" {
  capabilities = ["read", "list"]
}

# Identity information (for audit trails)
path "identity/entity/id" {
  capabilities = ["read", "list"]
}
