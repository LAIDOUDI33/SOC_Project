# ============================================================
# National SOC Platform - Vault Secrets Engines Configuration
# Djezzy Telecom - Production Secrets Management
# ============================================================
#
# This script configures all secrets engines for the SOC platform.
# Run this after Vault is initialized and unsealed.
#
# Usage: vault secrets enable <engine>
#        vault write <path> <config>
#
# Documentation: infrastructure/vault/docs/SECRETS_ENGINES.md
#

# ============================================================
# 1. Key-Value Secrets Engine (v2) - General Secrets
# ============================================================

# Enable KV v2 for the main SOC platform secrets
vault secrets enable -path=soc-platform -version=2 kv-v2

# Configure with CAS (Check-and-Set) for conflict prevention
vault write soc-platform/config max_versions=10 cas_required=true

# Create versioned secret paths structure
# Note: Actual secrets are written via CI/CD or manual process

# ============================================================
# 2. Database Secrets Engine (Dynamic Credentials)
# ============================================================

# Enable database engine
vault secrets enable -path=database database

# PostgreSQL Production
vault write database/config/postgresql-production \
    plugin_name=postgresql-database-plugin \
    allowed_roles="soc-app-read,soc-app-write,soc-migration,soc-metrics" \
    connection_url="postgresql://{{username}}:{{password}}@postgres-primary.soc-platform.svc.cluster.local:5432/soc_platform?sslmode=require"

# PostgreSQL Staging
vault write database/config/postgresql-staging \
    plugin_name=postgresql-database-plugin \
    allowed_roles="soc-app-read-staging,soc-app-write-staging" \
    connection_url="postgresql://{{username}}:{{password}}@postgres-staging.soc-platform.svc.cluster.local:5432/soc_platform_staging?sslmode=require"

# ============================================================
# Database Roles (Dynamic Credentials)
# ============================================================

# Read-only role for analysts (1 hour lease)
vault write database/roles/soc-app-read \
    db_name=postgresql-production \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"

# Write role for application (30 min lease, auto-rotate)
vault write database/roles/soc-app-write \
    db_name=postgresql-production \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="30m" \
    max_ttl="2h"

# Migration role (longer lease for migrations)
vault write database/roles/soc-migration \
    db_name=postgresql-production \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' SUPERUSER;" \
    revocation_statements="ALTER ROLE \"{{name}}\" NOSUPERUSER; DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="8h" \
    max_ttl="24h"

# Metrics role (read-only for Prometheus)
vault write database/roles/soc-metrics \
    db_name=postgresql-production \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT pg_read_all_stats TO \"{{name}}\"; GRANT SELECT ON pg_stat_database TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="15m" \
    max_ttl="1h"

# Staging roles
vault write database/roles/soc-app-read-staging \
    db_name=postgresql-staging \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="2h" \
    max_ttl="8h"

# ============================================================
# 3. Transit Secrets Engine (Encryption as a Service)
# ============================================================

# Enable transit engine
vault secrets enable -path=transit transit

# ============================================================
# Encryption Keys
# ============================================================

# Main data encryption key (AES-256-GCM)
vault write -f transit/keys/soc-data \
    type=aes256-gcm96 \
    derived=false \
    allow_plaintext_backup=false \
    exportable=false \
    allow_rotation=true \
    min_decryption_version=1 \
    min_encryption_version=0

# JWT signing key (Ed25519 for signatures)
vault write -f transit/keys/jwt-signing-key \
    type=ed25519 \
    derived=false \
    allow_plaintext_backup=false \
    exportable=false \
    signing_version=1

# CI/CD test key (separate from production)
vault write -f transit/keys/jwt-ci-key \
    type=ed25519 \
    derived=false \
    allow_plaintext_backup=false \
    exportable=false

# API key encryption (for storing encrypted API keys)
vault write -f transit/keys/api-keys \
    type=aes256-gcm96 \
    derived=true \
    convergent_encryption=true

# Compliance data encryption (FIPS-compliant if needed)
vault write -f transit/keys/compliance-data \
    type=aes256-gcm96 \
    derived=false \
    exportable=false

# ============================================================
# 4. PKI Secrets Engine (TLS Certificates)
# ============================================================

# Enable PKI for internal certificates
vault secrets enable -path=pki-int pki

# Set max TTL to 1 year for internal certs
vault write pki-int/config/urls \
    issuing_certificates="https://vault.djezzy.dz/v1/pki-int/ca" \
    crl_distribution_points="https://vault.djezzy.dz/v1/pki-int/crl"

vault write pki-int/config/max_lease_ttl=8760h  # 1 year

# Generate internal root CA
vault write -format=json pki-intermediate/generate/internal \
    common_name="Djezzy SOC Platform Internal CA" \
    ttl=8760h | jq -r '.data.csr' > /tmp/int-ca.csr

# Sign the intermediate CA (would be signed by root in production)
# vault write pki-root/root/sign-intermediate csr=@/tmp/int-ca.csr \
#     format=pem_bundle ttl=43800h > /tmp/intermediate.pem

# Set URLs
vault write pki-int/config/urls \
    issuing_certificates=["https://vault.djezzy.dz/v1/pki-int/ca"] \
    crl_distribution_points=["https://vault.djezzy.dz/v1/pki-int/crl"]

# ============================================================
# Certificate Roles
# ============================================================

# Application server certificates (90 days)
vault write pki-int/roles/soc-server \
    allowed_domains="soc.djezzy.dz,soc-staging.djezzy.dz,*.soc.djezzy.dz" \
    allow_subdomains=true \
    max_ttl=2160h \
    require_cn=false \
    organization="Djezzy Telecom" \
    ou="SOC Platform"

# Client authentication certificates (30 days)
vault write pki-int/roles/soc-client \
    allowed_domains="djezzy.dz" \
    client_flag=true \
    max_ttl=720h \
    organization="Djezzy Telecom"

# Probe certificates (7 days - short-lived for telecom probes)
vault write pki-int/roles/soc-probe \
    allowed_domains="probe.soc.djezzy.dz,ss7-probe.soc.djezzy.dz" \
    max_ttl=168h \
    organization="Djezzy Telecom" \
    ou="Telecom Probes"

# ============================================================
# 5. Authentication Methods
# ============================================================

# Kubernetes Auth Method (Primary for pods)
vault auth enable -path=kubernetes kubernetes

# Configure Kubernetes auth for production cluster
vault write auth/kubernetes/config \
    kubernetes_host=https://kubernetes.default.svc:443 \
    token_reviewer_jwt_file=/var/run/secrets/kubernetes.io/serviceaccount/token \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/ca.crt \
    issuer="https://kubernetes.default.svc.cluster.local"

# Kubernetes Roles
vault write auth/kubernetes/role/soc-app \
    bound_service_account_names="soc-platform-app" \
    bound_service_account_namespaces="soc-platform" \
    policies="soc-admin" \
    ttl="24h"

vault write auth/kubernetes/role/ci-pipeline \
    bound_service_account_names="github-runner" \
    bound_service_account_namespaces="github-actions,cicd" \
    policies="ci-cd" \
    ttl="1h"

vault write auth/kubernetes/role/monitoring \
    bound_service_account_names="prometheus,grafana" \
    bound_service_account_namespaces="monitoring" \
    policies="monitoring" \
    ttl="4h"

# JWT/OIDC Auth Method (GitHub Actions, developers)
vault auth enable -path=jwt jwt

# GitHub Actions JWT
vault write auth/jwt/config \
    bound_issuer="https://token.actions.githubusercontent.com" \
    jwks_url="https://token.actions.githubusercontent.com/.well-known/jwks"

vault write auth/jwt/role/github-ci \
    bound_audiences="https://github.com/LAIDOUDI33/SOC_Project" \
    bound_subject_pattern="ref:refs/heads/(main|develop|release/.*)" \
    user_claim="sub" \
    role_type="jwt" \
    policies="ci-cd" \
    ttl="1h" \
    max_ttl="2h"

# LDAP/AD Auth Method (Djezzy corporate directory)
vault auth enable -path=ldap ldap

vault write auth/ldap/config \
    url="ldaps://ldap-prod.djezzy.dz:636" \
    binddn="CN=vault-svc,OU=Service Accounts,OU=Security,OU=IT,DC=djezzy,DC=dz" \
    bindpass="${LDAP_BIND_PASSWORD}" \
    userdn="OU=Users,DC=djezzy,DC=dz" \
    groupdn="OU=Groups,DC=djezzy,DC=dz" \
    upndomain="djezzy.dz" \
    insecure_tls=false \
    starttls=true

# LDAP Group Policies Mapping
vault write auth/ldap/groups/SOC_Admins policies="soc-admin" ttl="8h"
vault write auth/ldap/groups/Threat_Hunters policies="soc-responder" ttl="4h"
vault write auth/ldap/groups/SOC_Analysts policies="soc-analyst" ttl="4h"
vault write auth/ldap/groups/SOC_Responders policies="soc-responder" ttl="4h"
vault write auth/ldap/groups/IT_Management policies="soc-admin" ttl="12h"
vault write auth/ldap/groups/Auditors policies="compliance" ttl="2h"

# AppRole Auth Method (For non-interactive access)
vault auth enable -path=approle approle

vault write auth/approle/role/telecom-probe \
    token_policies="telecom-probe" \
    token_ttl="1h" \
    token_max_ttl="4h" \
    secret_id_ttl="0"  # Never expires, rotate manually

vault write auth/approle/role/backup-service \
    token_policies="backup" \
    token_ttl="2h" \
    token_max_ttl="8h" \
    secret_id_num_uses=10  # Limited use backup token

# ============================================================
# 6. Identity Groups & Entities
# ============================================================

# Create groups for team management
vault write identity/group name="soc-team" \
    policies="soc-admin" \
    member_group_ids="" \
    metadata="{team=\"SOC Operations\", department=\"Security\", cost_center=\"SEC-001\"}"

vault write identity/group name="analysts" \
    policies="soc-analyst" \
    metadata="{team=\"SOC Analysts\", department=\"Security\"}"

vault write identity/group name="responders" \
    policies="soc-responder" \
    metadata="{team=\"Incident Response\", department=\"Security\"}"

# ============================================================
# 7. Secret Rotation Configuration
# ============================================================

# Auto-rotation for application secrets
vault write soc-platform/config rotation {
    # Rotate these secrets automatically
    auto_rotate = true
    rotation_period = "168h"  # 7 days
    
    # Notify on rotation
    notify_on_rotate = true
    notification_channel = "#soc-security"
}

# ============================================================
# 8. Enterprise Features (if available)
# ============================================================

# Sentinel Policies (Advanced Authorization)
# Example: Prevent deletion of production secrets during business hours
# sentinel policy = <<EOF
# import "time"
# 
# main = rule {
#   time.hour >= 9 and time.hour <= 17
# }
# EOF

# Replication (DR Site)
# vault write sys/replication/primary/secondary-enable \
#     secondary_api_addr = "https://vault-dr.djezzy.dz:8200" \
#     token = "${DR_TOKEN}"
