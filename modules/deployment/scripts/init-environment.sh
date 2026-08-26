#!/usr/bin/env bash
# =============================================================================
# National SOC Platform - Environment Initialization Script
# Module 9: Production Deployment Scripts
#
# This script performs first-time setup:
#   - Generates .env file with secure defaults
#   - Creates SSL certificates (self-signed for dev)
#   - Generates encryption keys and secrets
#   - Sets up directory structure
#   - Creates initial database users
#
# Usage:
#   ./init-environment.sh [options]
#
# Options:
#   --environment ENV    Environment: development|staging|production (default: production)
#   --domain DOMAIN      Base domain for services
#   --generate-keys       Regenerate all keys/secrets
#   --non-interactive     Run without prompts (use defaults)
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_DIR="${PROJECT_ROOT}/configs"
ENV_FILE="${CONFIG_DIR}/.env"
SECRETS_DIR="${CONFIG_DIR}/secrets"
CERTS_DIR="/opt/soc-platform/certs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
ENVIRONMENT="production"
BASE_DOMAIN="soc.local"
GENERATE_KEYS=false
NON_INTERACTIVE=false

# =============================================================================
# Utility Functions
# =============================================================================

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step() { echo -e "\n${BLUE}━━━ $* ━━━${NC}\n"; }

show_banner() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     National SOC Platform - Environment Setup             ║
║     Algeria (2026-2030)                                   ║
║                                                           ║
║     This script will initialize your deployment           ║
║     environment with secure defaults.                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
}

generate_random_string() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d '/+=' | head -c "$length"
}

generate_hex_string() {
    local length="${1:-32}"
    openssl rand -hex "$((length/2))" | head -c "$length"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --environment)  ENVIRONMENT="$2"; shift 2 ;;
            --domain)       BASE_DOMAIN="$2"; shift 2 ;;
            --generate-keys) GENERATE_KEYS=true; shift ;;
            --non-interactive) NON_INTERACTIVE=true; shift ;;
            -h|--help)
                echo "Usage: $(basename "$0") [--environment ENV] [--domain DOMAIN] [--generate-keys] [--non-interactive]"
                exit 0
                ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
}

prompt() {
    local prompt_text="$1"
    local default_value="$2"
    local var_name="$3"
    
    if [[ "${NON_INTERACTIVE}" == "true" ]]; then
        eval "${var_name}='${default_value}'"
        return
    fi
    
    read -rp "  ${prompt_text} [${default_value}]: " input
    eval "${var_name}=\"${input:-${default_value}}\""
}

prompt_password() {
    local prompt_text="$1"
    local var_name="$2"
    local confirm_var="$3"
    
    if [[ "${NON_INTERACTIVE}" == "true" ]]; then
        eval "${var_name}='$(generate_random_string 24)'"
        return
    fi
    
    while true; do
        read -rsp "  ${prompt_text}: " input1
        echo ""
        read -rsp "  Confirm ${prompt_text}: " input2
        echo ""
        
        if [[ "${input1}" == "${input2}" ]]; then
            eval "${var_name}='${input1}'"
            if [[ -n "${confirm_var}" ]]; then
                eval "${confirm_var}='${input1}'"
            fi
            break
        else
            log_error "Passwords do not match, please try again."
        fi
    done
}

# =============================================================================
# Directory Setup
# =============================================================================

setup_directories() {
    log_step "Creating directory structure"
    
    local dirs=(
        "${CONFIG_DIR}"
        "${SECRETS_DIR}"
        "${CONFIG_DIR}/nginx/conf.d"
        "${CONFIG_DIR}/nginx/includes"
        "${CONFIG_DIR}/postgresql"
        "${CONFIG_DIR}/redis"
        "${CONFIG_DIR}/elasticsearch"
        "${CONFIG_DIR}/kibana"
        "${CONFIG_DIR}/grafana/provisioning"
        "${CONFIG_DIR}/prometheus"
        "${CONFIG_DIR}/alertmanager"
        "${CONFIG_DIR}/wazuh"
        "${CONFIG_DIR}/suricata"
        "${CONFIG_DIR}/misp"
        "${CONFIG_DIR}/thehive"
        "${CONFIG_DIR}/cortex"
        "${CONFIG_DIR}/rabbitmq"
        "${CONFIG_DIR}/keycloak"
        "/opt/soc-platform/certs"
        "/opt/soc-platform/secrets"
        "/var/lib/soc/postgres"
        "/var/lib/soc/redis"
        "/var/lib/soc/elasticsearch"
        "/var/lib/soc/wazuh"
        "/var/log/soc"
        "/var/backups/soc"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "${dir}" ]]; then
            mkdir -p "${dir}"
            log_info "Created: ${dir}"
        else
            log_debug "Exists: ${dir}"
        fi
    done
    
    # Set restrictive permissions on secrets directories
    chmod 700 "${SECRETS_DIR}" /opt/soc-platform/secrets 2>/dev/null || true
}

# =============================================================================
# Secret Generation
# =============================================================================

generate_secrets() {
    log_step "Generating secrets and encryption keys"
    
    # Check if secrets already exist
    if [[ -f "${SECRETS_DIR}/.generated" ]] && [[ "${GENERATE_KEYS}" != "true" ]]; then
        log_info "Secrets already exist. Use --generate-keys to regenerate."
        return
    fi
    
    log_info "Generating new secrets..."
    
    # Database passwords
    POSTGRES_PASSWORD=$(generate_random_string 24)
    REDIS_PASSWORD=$(generate_random_string 24)
    
    # Elasticsearch
    ELASTICSEARCH_PASSWORD=$(generate_random_string 24)
    KIBANA_PASSWORD="${ELASTICSEARCH_PASSWORD}"
    
    # Wazuh
    WAZUH_API_PASSWORD=$(generate_random_string 24)
    WAZUH_CLUSTER_KEY=$(generate_hex_string 32)
    
    # MISP
    MISP_ADMIN_PASSPHRASE=$(generate_random_string 16)
    MISP_MYSQL_PASSWORD=$(generate_random_string 24)
    MISP_API_KEY=$(generate_hex_string 40)
    
    # TheHive/Cortex
    THEHIVE_SECRET=$(generate_hex_string 32)
    CORTEX_SECRET=$(generate_hex_string 32)
    THEHIVE_API_KEY=$(generate_hex_string 40)
    CORTEX_API_KEY=$(generate_hex_string 40)
    
    # MinIO
    MINIO_ROOT_PASSWORD=$(generate_random_string 24)
    
    # RabbitMQ
    RABBITMQ_PASSWORD=$(generate_random_string 24)
    
    # Keycloak
    KEYCLOAK_DB_PASSWORD=$(generate_random_string 24)
    KEYCLOAK_ADMIN_PASSWORD=$(generate_random_string 16)
    
    # Application secrets
    JWT_SECRET=$(generate_hex_string 48)
    ENCRYPTION_KEY=$(generate_hex_string 32)
    API_GATEWAY_SECRET=$(generate_hex_string 32)
    
    # Grafana
    GRAFANA_ADMIN_PASSWORD=$(generate_random_string 16)
    
    # Mark as generated
    date > "${SECRETS_DIR}/.generated"
    
    log_info "All secrets generated successfully."
}

# =============================================================================
# SSL Certificate Generation
# =============================================================================

generate_certificates() {
    log_step "Setting up SSL certificates"
    
    local cert_file="${CERTS_DIR}/soc-platform.crt"
    local key_file="${CERTS_DIR}/soc-platform.key"
    
    if [[ -f "${cert_file}" ]] && [[ -f "${key_file}" ]] && [[ "${GENERATE_KEYS}" != "true" ]]; then
        log_info "Certificates already exist."
        return
    fi
    
    if [[ "${ENVIRONMENT}" == "development" ]] || [[ "${ENVIRONMENT}" == "staging" ]]; then
        log_info "Generating self-signed certificate for ${ENVIRONMENT}..."
        
        openssl req -x509 -nodes -days 365 \
            -newkey rsa:4096 \
            -keyout "${key_file}" \
            -out "${cert_file}" \
            -subj "/C=DZ/O=National SOC/CN=${BASE_DOMAIN}" \
            -addext "subjectAltName=DNS:${BASE_DOMAIN},DNS:*.${BASE_DOMAIN},DNS:localhost,IP:127.0.0.1"
        
        chmod 600 "${key_file}"
        chmod 644 "${cert_file}"
        
        log_info "Self-signed certificate created."
    else
        log_warn "Production environment detected."
        log_warn "Please provide valid certificates from a CA at:"
        log_warn "  ${cert_file}"
        log_warn "  ${key_file}"
        log_warn ""
        log_warn "For Let's Encrypt, run: certbot certonly --webroot -w /var/www/html -d ${BASE_DOMAIN}"
        
        # Create placeholder files
        touch "${cert_file}" "${key_file}"
        chmod 600 "${key_file}"
    fi
}

# =============================================================================
# Environment File Generation
# =============================================================================

generate_env_file() {
    log_step "Generating environment configuration"
    
    if [[ -f "${ENV_FILE}" ]] && [[ "${GENERATE_KEYS}" != "true" ]]; then
        log_warn "Environment file exists. Backing up and regenerating..."
        cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%s)"
    fi
    
    cat > "${ENV_FILE}" << ENVEOF
# ═══════════════════════════════════════════════════════════════
# National SOC Platform - Environment Configuration
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# Environment: ${ENVIRONMENT}
# 
# ⚠️  IMPORTANT: Keep this file secure! Contains sensitive data.
# ═══════════════════════════════════════════════════════════════

# ────────────────────────────────────────────────────────────────
# General Settings
# ────────────────────────────────────────────────────────────────
SOC_ENVIRONMENT=${ENVIRONMENT}
VERSION=latest
DOCKER_REGISTRY=

# ────────────────────────────────────────────────────────────────
# Domain Configuration
# ────────────────────────────────────────────────────────────────
BASE_DOMAIN=${BASE_DOMAIN}
API_DOMAIN=api.${BASE_DOMAIN}
GRAFANA_DOMAIN=grafana.${BASE_DOMAIN}
KIBANA_DOMAIN=kibana.${BASE_DOMAIN}
MISP_DOMAIN=misp.${BASE_DOMAIN}
THEHIVE_DOMAIN=thehive.${BASE_DOMAIN}
MINIO_DOMAIN=minio.${BASE_DOMAIN}
KEYCLOAK_DOMAIN=auth.${BASE_DOMAIN}
ALERTMANAGER_DOMAIN=alertmanager.${BASE_DOMAIN}

# ────────────────────────────────────────────────────────────────
# PostgreSQL Database
# ────────────────────────────────────────────────────────────────
POSTGRES_USER=soc_admin
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=soc_platform
POSTGRES_PORT=5432
POSTGRES_SHARED_BUFFERS=2GB
POSTGRES_EFFECTIVE_CACHE=6GB
POSTGRES_MAX_CONNECTIONS=300

# ────────────────────────────────────────────────────────────────
# Redis Cache
# ────────────────────────────────────────────────────────────────
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# ────────────────────────────────────────────────────────────────
# Elasticsearch
# ────────────────────────────────────────────────────────────────
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}
ES_PORT=9200
ES_JVM_MIN_HEAP=2g
ES_JVM_MAX_HEAP=4g

# ────────────────────────────────────────────────────────────────
# Wazuh SIEM
# ────────────────────────────────────────────────────────────────
WAZUH_API_USERNAME=wazuh
WAZUH_API_PASSWORD=${WAZUH_API_PASSWORD}
WAZUH_CLUSTER_KEY=${WAZUH_CLUSTER_KEY}

# ────────────────────────────────────────────────────────────────
# MISP Threat Intelligence
# ────────────────────────────────────────────────────────────────
MISP_MYSQL_HOST=postgres
MISP_MYSQL_PORT=5432
MISP_MYSQL_USER=misp
MISP_MYSQL_PASSWORD=${MISP_MYSQL_PASSWORD}
MISP_MYSQL_DATABASE=misp
MISP_ADMIN_EMAIL=admin@soc.dz
MISP_ADMIN_PASSPHRASE=${MISP_ADMIN_PASSPHRASE}
MISP_API_KEY=${MISP_API_KEY}
MISP_PORT=8081

# ────────────────────────────────────────────────────────────────
# TheHive SOAR
# ────────────────────────────────────────────────────────────────
THEHIVE_SECRET=${THEHIVE_SECRET}
THEHIVE_API_KEY=${THEHIVE_API_KEY}
THEHIVE_PORT=9000
THEHIVE_JVM_MIN_HEAP=1g
THEHIVE_JVM_MAX_HEAP=2g

# ────────────────────────────────────────────────────────────────
# Cortex Analysis Engine
# ────────────────────────────────────────────────────────────────
CORTEX_SECRET=${CORTEX_SECRET}
CORTEX_API_KEY=${CORTEX_API_KEY}
CORTEX_PORT=9001
CORTEX_JVM_MIN_HEAP=512m
CORTEX_JVM_MAX_HEAP=1g

# ────────────────────────────────────────────────────────────────
# MinIO Object Storage
# ────────────────────────────────────────────────────────────────
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# ────────────────────────────────────────────────────────────────
# RabbitMQ Message Broker
# ────────────────────────────────────────────────────────────────
RABBITMQ_USER=soc_user
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
RABBITMQ_AMQP_PORT=5672
RABBITMQ_MGMT_PORT=15672

# ────────────────────────────────────────────────────────────────
# Keycloak Identity Provider
# ────────────────────────────────────────────────────────────────
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=${KEYCLOAK_DB_PASSWORD}
KEYCLOAK_DB=keycloak
KEYCLOAK_REALM=soc-platform
KEYCLOAK_PORT=8080

# ────────────────────────────────────────────────────────────────
# Application Configuration
# ────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
API_GATEWAY_PORT=4000
API_GATEWAY_REPLICAS=2
FRONTEND_REPLICAS=2

# ────────────────────────────────────────────────────────────────
# Monitoring & Observability
# ────────────────────────────────────────────────────────────────
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
PROMETHEUS_RETENTION=30d
PROMETHEUS_RETENTION_SIZE=50GB

# ────────────────────────────────────────────────────────────────
# Suricata IDS/IPS
# ────────────────────────────────────────────────────────────────
SURICATA_INTERFACE=eth0

# ────────────────────────────────────────────────────────────────
# Logging Configuration
# ────────────────────────────────────────────────────────────────
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000

# ────────────────────────────────────────────────────────────────
# External Service APIs (Optional)
# ────────────────────────────────────────────────────────────────
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
IPINFO_TOKEN=
SHODAN_API_KEY=
HYBRIDANALYSIS_API_KEY=
DOMAINTOOLS_USERNAME=
DOMAINTOOLS_KEY=
JOESANDBOX_API_KEY=
JOESANDBOX_PASSWORD=

# ────────────────────────────────────────────────────────────────
# Notification Configuration
# ────────────────────────────────────────────────────────────────
SLACK_WEBHOOK_URL=
PAGERDUTY_KEY=
SMTP_HOST=localhost
SMTP_PORT=587
EMAIL_FROM=alerts@soc.dz
EMAIL_TO=soc-team@dz
ENVEOF
    
    chmod 600 "${ENV_FILE}"
    log_info "Environment file created: ${ENV_FILE}"
}

# =============================================================================
# Finalization
# =============================================================================

print_summary() {
    log_step "Setup Complete!"
    
    cat << EOF

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  ✅ Environment initialization completed successfully!    ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Next Steps:                                              ║
║                                                           ║
║  1. Review the environment file:                          ║
║     cat ${ENV_FILE}                                       ║
║                                                           ║
║  2. Start the platform:                                   ║
║     ./deploy.sh deploy                                    ║
║                                                           ║
║  3. Check service health:                                 ║
║     ./health-check.sh                                     ║
║                                                           ║
║  ⚠️  Important Security Notes:                            ║
║     • Store ${ENV_FILE} securely                           ║
║     • Change default passwords before production          ║
║     • Use valid SSL certificates in production            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

EOF
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    parse_arguments "$@"
    show_banner
    
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Base Domain: ${BASE_DOMAIN}"
    echo ""
    
    setup_directories
    generate_secrets
    generate_certificates
    generate_env_file
    print_summary
}

main "$@"
