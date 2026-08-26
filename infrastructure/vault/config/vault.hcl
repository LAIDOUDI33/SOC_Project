# ============================================================
# National SOC Platform - HashiCorp Vault Configuration
# Djezzy Telecom - Production Secrets Management
# ============================================================
#
# This configuration file sets up Vault for the SOC platform
# with high availability, auto-unseal, and audit logging.
#
# Deployment: Kubernetes (via Helm) or Standalone
# Documentation: infrastructure/vault/docs/VAULT_SETUP.md
#

# ============================================================
# Main Vault Server Configuration
# ============================================================

storage "consul" {
  address = "consul.vault.svc.cluster.local:8501"
  path    = "vault/"
  scheme  = "https"
  token   = "${CONSUL_TOKEN}"

  # High availability settings
  ha_enabled = true
  
  # Performance tuning
  max_parallel = 128
  
  # Redirect to leader for reads
  redirect_addr = "https://${POD_NAME}.vault-internal.vault.svc.cluster.local:8200"
}

# Alternative: Raft storage (recommended for production)
# storage "raft" {
#   path    = "/vault/data"
#   node_id = "${NODE_ID}"
   
#   # Cluster configuration
#   retry_join {
#     leader_api_addr = "https://vault-0.vault-internal:8200"
#     leader_ca_cert_file = "/vault/tls/ca.crt"
#     leader_client_cert_file = "/vault/tls/client.crt"
#     leader_client_key_file = "/vault/tls/client.key"
#   }
  
#   # Performance
#   performance_multiplier = 2
# }

# ============================================================
# Listener Configuration (TLS Required)
# ============================================================

listener "tcp" {
  address       = ":8200"
  tls_cert_file = "/vault/tls/server.crt"
  tls_key_file  = "/vault/tls/server.key"
  tls_client_ca_file = "/vault/tls/ca.crt"
  
  # Security requirements
  tls_min_version = "tls12"
  tls_prefer_server_ciphers = "true"
  tls_cipher_suites = "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
  
  # Rate limiting
  max_request_duration = "90s"
  request_max_duration = "90s"
  
  # Telemetry
  telemetry {
    unauthenticated_metrics_access = false
  }
}

# ============================================================
# API & Cluster Configuration
# ============================================================

api_cache_config {
  enabled = true
  
  # Cache size based on SOC platform needs
  api_response_cache_size {
    size = "1gb"  # Cache frequent API responses
  }
}

cluster_address = "https://${POD_NAME}.vault-internal.vault.svc.cluster.local:8201"
cluster_name = "djezzy-soc-vault"

# Disable mlock in containers (requires privileged mode otherwise)
disable_mlock = true

# ============================================================
# UI Configuration
# ============================================================

ui = true

# ============================================================
# Auto-Unseal with AWS KMS (Production)
# ============================================================

seal "awskms" {
  region     = "${AWS_REGION}"
  kms_key_id = "${KMS_KEY_ID}"
  endpoint   = "${KMS_ENDPOINT}"  # Optional: custom endpoint
  
  # Additional security
  encryption_key = ""  # Let Vault generate
}

# Alternative: Azure Key Vault
# seal "azurekeyvault" {
#   tenant_id      = "${AZURE_TENANT_ID}"
#   vault_name     = "${AZURE_VAULT_NAME}"
#   key_name       = "${AZURE_KEY_NAME}"
# }

# Alternative: Google Cloud KMS
# seal "gcpckms" {
#   project     = "${GCP_PROJECT}"
#   region      = "${GCP_REGION}"
#   key_ring    = "${GCP_KEY_RING}"
#   crypto_key  = "${GCP_CRYPTO_KEY}"
# }

# ============================================================
# Audit Logging (CRITICAL for Compliance)
# ============================================================

audit "file" {
  options = {
    file_path = "/vault/audit/audit.log"
    
    # Log format (JSON for SIEM integration)
    mode        = "0640"
    format      = "json"
    
    # HMAC verification (detect tampering)
    hmac_accessor = false
    log_raw      = false
    
    # Rotation settings
    rotate_duration = "86400s"  # Daily rotation
    rotate_bytes   = 52428800   # 50MB per file
    
    # Sync to object storage for DR
    sync {
      prefix = "audit/vault/"
      target = "s3://djezzy-vault-audit-${ENVIRONMENT}/"
      region = "${AWS_REGION}"
    }
  }
  
  # SIEM forwarding (Wazuh/Splunk)
  sink_type = "stdout"
}

# Alternative: Send directly to Splunk
# audit "splunk" {
#   type = "sink"
#   config = {
#     splunk_token = "${SPLUNK_HEC_TOKEN}"
#     splunk_url   = "${SPLUNK_HEC_URL}"
#     splunk_index = "vault-audit"
#   }
# }

# ============================================================
# Telemetry (Prometheus + Grafana)
# ============================================================

telemetry {
  prometheus_retention_time = "24h"
  disable_hostname          = true
  
  # Metrics filtering
  filter_default = true
  allowed_prefixes = [
    "vault/",
    "vault.core",
    "vault.route",
    "vault.audit"
  ]
}

# ============================================================
# Enterprise Features (if using Vault Enterprise)
# ============================================================

# Replication (DR site)
# replication {
#   primary_cluster_addr = "https://vault-primary.djezzy.dz:8201"
# }

# Sentinel policies (advanced authorization)
# sentinel {}

# ============================================================
# Plugin Directory (Custom Plugins)
# ============================================================

plugin_directory = "/usr/local/lib/vault-plugins"

# ============================================================
# Maximum Lease TTL (Security Hardening)
# ============================================================

# Force short-lived secrets
default_lease_ttl = "1h"       # Default: 1 hour
max_lease_ttl     = "720h"     # Maximum: 30 days

# Specific overrides for different secret types
raw_storage_endpoint = false

# Disable clustering in dev mode
disable_clustering = false

# Performance tuning
cache_size = "131072"  # 128KB cache

# ============================================================
# CORS Configuration (for Web UI)
# ============================================================

disable_cors = false
cors_enabled_domains = [
  "https://vault.djezzy.dz",
  "https://soc.djezzy.dz",
  "https://*.djezzy.dz"
]

# ============================================================
# Strict MIME Type Checking
# ============================================================

disable_printable_check = true

# ============================================================
# Environment-specific Overrides
# ============================================================

# Production specific
${PRODUCTION_OVERRIDES}

# Staging specific
${STAGING_OVERRIDES}
