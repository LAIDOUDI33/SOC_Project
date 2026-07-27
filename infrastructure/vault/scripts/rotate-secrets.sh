#!/bin/bash
# ============================================================
# National SOC Platform - Vault Secret Rotation Script
# Djezzy Telecom - Automated Secrets Rotation
# ============================================================
#
# This script automates the rotation of various secrets in Vault
# for the SOC platform. It handles:
# - JWT signing keys
# - Database credentials
# - API keys and tokens
# - TLS certificates
# - Encryption keys
#
# Usage: ./rotate-secrets.sh [all|jwt|database|api-keys|certs|encryption]
#        ./rotate-secrets.sh --dry-run (preview only)
#        ./rotate-secrets.sh --force (skip confirmation)
#
# Schedule: Run via cron or Kubernetes CronJob
#   - JWT keys: Weekly (Sunday 02:00)
#   - Database creds: Automatic via Vault dynamic secrets
#   - API keys: Monthly (1st of month)
#   - Certificates: Before expiry (30 days before)
#   - Encryption keys: Annually with re-encryption
#
# Prerequisites:
# - VAULT_ADDR and VAULT_TOKEN environment variables set
# - vault CLI installed and authenticated
# - Proper permissions (admin or soc-admin policy)
#

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

SCRIPT_NAME="vault-secret-rotation"
LOG_FILE="/var/log/vault/rotation.log"
NOTIFICATION_CHANNEL="#soc-security"
VAULT_PATH_PREFIX="soc-platform/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Rotation intervals (in days)
JWT_ROTATION_DAYS=7
API_KEY_ROTATION_DAYS=30
CERT_ROTATION_BEFORE_EXPIRY=30
ENCRYPTION_KEY_ROTATION_DAYS=365

# Dry run mode
DRY_RUN=false
FORCE_MODE=false
ROTATE_TYPE="all"

# ============================================================
# Helper Functions
# ============================================================

log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
    
    case $level in
        INFO)  echo -e "${GREEN}$message${NC}" ;;
        WARN)  echo -e "${YELLOW}$message${NC}" ;;
        ERROR) echo -e "${RED}$message${NC}" ;;
        DEBUG) echo -e "${BLUE}$message${NC}" ;;
    esac
}

notify() {
    local message=$1
    local severity=${2:-info}
    
    log INFO "Sending notification: $message"
    
    # Slack notification (if webhook configured)
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            -d "{
                \"text\": \"🔐 *Vault Secret Rotation* ($severity)\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"$message\"
                        }
                    },
                    {
                        \"type\": \"context\",
                        \"elements\": [
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"Host: $(hostname) | Time: $(date) | Script: $SCRIPT_NAME\"
                            }
                        ]
                    }
                ]
            }" > /dev/null 2>&1 || true
    fi
    
    # PagerDuty notification for critical events
    if [[ "$severity" == "critical" ]] && [[ -n "${PAGERDUTY_KEY:-}" ]]; then
        curl -s -X POST "https://events.pagerduty.com/v2/enqueue" \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"$PAGERDUTY_KEY\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Vault Secret Rotation Alert\",
                    \"severity\": \"warning\",
                    \"source\": \"vault-rotation-script\",
                    \"custom_details\": {\"message\": \"$message\"}
                }
            }" > /dev/null 2>&1 || true
    fi
}

check_vault_connection() {
    if ! vault status > /dev/null 2>&1; then
        log ERROR "Cannot connect to Vault at $VAULT_ADDR"
        notify "❌ Cannot connect to Vault server" critical
        exit 1
    fi
    
    log DEBUG "Connected to Vault (sealed: $(vault status -format=json | jq -r '.sealed'))"
}

confirm_action() {
    if [[ "$FORCE_MODE" == "true" ]]; then
        return 0
    fi
    
    echo -e "${YELLOW}⚠️  This will rotate secrets. Are you sure? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log INFO "Rotation cancelled by user"
        exit 0
    fi
}

# ============================================================
# Rotation Functions
# ============================================================

rotate_jwt_keys() {
    log INFO "=== Starting JWT Key Rotation ==="
    
    # Current key version
    CURRENT_VERSION=$(vault read -field=min_decryption_version transit/keys/jwt-signing-key 2>/dev/null || echo "0")
    NEW_VERSION=$((CURRENT_VERSION + 1))
    
    log INFO "Current JWT key version: $CURRENT_VERSION → New version: $NEW_VERSION"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DRY "[DRY RUN] Would rotate JWT signing key to version $NEW_VERSION"
        return 0
    fi
    
    # Rotate the key
    vault write -f transit/keys/jwt-signing-key/rotate
    
    # Update the secret in KV store with new key info
    vault kv put ${VAULT_PATH_PREFIX}/auth/jwt \
        access_secret=$(openssl rand -base64 32) \
        refresh_secret=$(openssl rand -base64 32) \
        rotated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
        rotated_by=$(vault token lookup -format=json | jq -r '.data.display_name') \
        previous_version=$CURRENT_VERSION
    
    log INFO "✅ JWT keys rotated successfully"
    notify "✅ JWT signing keys rotated (v$CURRENT_VERSION → v$NEW_VERSION)" info
}

rotate_database_credentials() {
    log INFO "=== Rotating Dynamic Database Credentials ==="
    
    # Note: Dynamic credentials are auto-rotated by Vault
    # This function forces rotation by revoking current leases
    
    ROLES=("soc-app-read" "soc-app-write" "soc-metrics")
    
    for role in "${ROLES[@]}"; do
        log INFO "Checking credentials for role: $role"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log DRY "[DRY RUN] Would revoke leases for database/creds/$role"
            continue
        fi
        
        # List active leases and revoke them
        LEASES=$(vault list -format=json sys/leases/lookup/database/creds/$role 2>/dev/null | jq -r '.[]' || echo "")
        
        if [[ -n "$LEASES" ]]; then
            echo "$LEASES" | while read -r lease_id; do
                vault lease revoke "$lease_id" 2>/dev/null || true
                log DEBUG "Revoked lease: $lease_id"
            done
            log INFO "Revoked old leases for $role"
        else
            log INFO "No active leases found for $role"
        fi
    done
    
    log INFO "✅ Database credential rotation triggered"
}

rotate_api_keys() {
    log INFO "=== Starting API Keys Rotation ==="
    
    declare -A API_KEYS=(
        ["wazuh"]="soc-platform/data/integrations/wazuh"
        ["thehive"]="soc-platform/data/integrations/thehive"
        ["cortex"]="soc-platform/data/integrations/cortex"
        ["misp"]="soc-platform/data/integrations/misp"
        ["opencti"]="soc-platform/data/integrations/opencti"
        ["slack"]="soc-platform/data/alerting/slack"
        ["pagerduty"]="soc-platform/data/alerting/pagerduty"
    )
    
    for integration in "${!API_KEYS[@]}"; do
        path="${API_KEYS[$integration]}"
        
        log INFO "Rotating API key for: $integration"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log DRY "[DRY RUN] Would generate new API key for $integration"
            continue
        fi
        
        # Generate new random key
        NEW_KEY=$(openssl rand -hex 24)
        
        # Get existing metadata to preserve
        EXISTING_DATA=$(vault kv get -format=json "$path" 2>/dev/null | jq -r '.data.data // empty' || echo "{}")
        
        # Update with new key, preserving other fields
        UPDATED_DATA=$(echo "$EXISTING_DATA" | jq \
            --arg api_key "$NEW_KEY" \
            --arg rotated "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '. + {"api_key": $api_key, "rotated_at": $rotated}')
        
        # Write back to Vault
        echo "$UPDATED_DATA" | vault kv put "$path" -
        
        log INFO "✅ Rotated API key for $integration"
    done
    
    notify "✅ All integration API keys rotated" info
}

rotate_tls_certificates() {
    log INFO "=== Checking TLS Certificate Expiry ==="
    
    declare -A CERT_ROLES=(
        ["soc-server"]="soc-server"
        ["soc-client"]="soc-client"
        ["soc-probe"]="soc-probe"
    )
    
    WARNING_THRESHOLD=$((CERT_ROTATION_BEFORE_EXPIRY * 86400))  # Convert days to seconds
    
    for cert_name in "${!CERT_ROLES[@]}"; do
        role="${CERT_ROLES[$cert_name]}"
        
        log INFO "Checking certificate: $cert_name (role: $role)"
        
        # Get certificate expiry
        CERT_INFO=$(vault read pki-int/cert-issue/$role -format=json 2>/dev/null || echo "")
        
        if [[ -z "$CERT_INFO" ]]; then
            log WARN "Could not retrieve certificate info for $cert_name"
            continue
        fi
        
        EXPIRY_DATE=$(echo "$CERT_INFO" | jq -r '.data.expiration // empty')
        
        if [[ -z "$EXPIRY_DATE" ]]; then
            log WARN "No expiry date found for $cert_name"
            continue
        fi
        
        NOW=$(date +%s)
        EXPIRY_UNIX=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$EXPIRY_DATE" "+%s")
        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_UNIX - NOW) / 86400 ))
        
        log INFO "Certificate $cert_name expires in $DAYS_UNTIL_EXPIRY days"
        
        if [[ $DAYS_UNTIL_EXPIRY -le $CERT_ROTATION_BEFORE_EXPIRY ]]; then
            log WARN "⚠️ Certificate $cert_name expires soon ($DAYS_UNTIL_EXPIRY days)"
            
            if [[ "$DRY_RUN" == "true" ]]; then
                log DRY "[DRY RUN] Would issue new certificate for $cert_name"
                continue
            fi
            
            # Issue new certificate
            vault write pki-int/issue/$role \
                common_name="soc.djezzy.dz" \
                ttl="${CERT_ROTATION_BEFORE_EXPIRY}d" > /dev/null
            
            notify "🔒 Certificate $cert_name renewed (was expiring in $DAYS_UNTIL_EXPIRY days)" warn
        else
            log INFO "✅ Certificate $cert_name is valid ($DAYS_UNTIL_EXPIRY days remaining)"
        fi
    done
}

rotate_encryption_keys() {
    log INFO "=== Checking Encryption Key Rotation ==="
    
    KEY_NAME="soc-data"
    
    # Get current key information
    KEY_INFO=$(vault read transit/keys/$KEY_NAME -format=json 2>/dev/null)
    
    if [[ -z "$KEY_INFO" ]]; then
        log ERROR "Cannot find encryption key: $KEY_NAME"
        return 1
    fi
    
    LATEST_VERSION=$(echo "$KEY_INFO" | jq -r '.data.latest_version')
    CREATION_TIME=$(echo "$KEY_INFO" | jq -r ".data.keys.\"$LATEST_VERSION\".creation_time")
    
    # Calculate age in days
    AGE_SECONDS=$(( $(date +%s) - CREATION_TIME ))
    AGE_DAYS=$(( AGE_SECONDS / 86400 ))
    
    log INFO "Encryption key $KEY_NAME is $AGE_DAYS old (version: $LATEST_VERSION)"
    
    if [[ $AGE_DAYS -ge $ENCRYPTION_KEY_ROTATION_DAYS ]]; then
        log WARN "Encryption key is due for rotation ($AGE_DAYS days old)"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log DRY "[DRY RUN] Would rotate encryption key $KEY_NAME"
            return 0
        fi
        
        # Rotate encryption key
        vault write -f transit/keys/$KEY_NAME/rotate
        
        NEW_VERSION=$((LATEST_VERSION + 1))
        
        log INFO "✅ Encryption key rotated (v$LATEST_VERSION → v$NEW_VERSION)"
        notify "🔐 Encryption key $KEY_NAME rotated (v$LATEST_VERSION → v$NEW_VERSION)" info
        
        # Trigger data re-encryption (async job would handle this)
        log INFO "Note: Data re-encryption should be scheduled separately"
    else
        DAYS_REMAINING=$(( ENCRYPTION_KEY_ROTATION_DAYS - AGE_DAYS ))
        log INFO "✅ Encryption key is valid ($DAYS_REMAINING days until rotation)"
    fi
}

rotate_ldap_passwords() {
    log INFO "=== Checking LDAP Bind Password ==="
    
    LDAP_SECRET_PATH="${VAULT_PATH_PREFIX}/auth/ldap"
    
    # Check last rotation time
    LAST_ROTATION=$(vault kv get -field=rotated_at "$LDAP_SECRET_PATH" 2>/dev/null || echo "never")
    
    log INFO "LDAP password last rotated: $LAST_ROTATION"
    
    # Rotate every 90 days
    ROTATE_AFTER_DAYS=90
    
    if [[ "$LAST_ROTATION" != "never" ]]; then
        LAST_ROTATION_UNIX=$(date -d "$LAST_ROTATION" +%s 2>/dev/null || echo "0")
        NOW=$(date +%s)
        DAYS_SINCE_ROTATION=$(( (NOW - LAST_ROTATION_UNIX) / 86400 ))
        
        if [[ $DAYS_SINCE_ROTATION -lt $ROTATE_AFTER_DAYS ]]; then
            log INFO "LDAP password recently rotated ($DAYS_SINCE_ROTATION days ago)"
            return 0
        fi
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log DRY "[DRY RUN] Would rotate LDAP bind password"
        return 0
    fi
    
    # Generate new strong password (40 chars, alphanumeric + special)
    NEW_PASSWORD=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9!@#$%^&*()_+-=' | head -c 40)
    
    # Update in Vault
    vault kv put "$LDAP_SECRET_PATH" \
        bind_dn="CN=vault-svc,OU=Service Accounts,OU=Security,OU=IT,DC=djezzy,DC=dz" \
        bind_password="$NEW_PASSWORD" \
        base_dn="OU=Users,DC=djezzy,DC=dz" \
        search_filter="(sAMAccountName={username})" \
        rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        rotated_by="$(whoami)"
    
    # Note: Actual LDAP password change needs to be coordinated with AD team
    log INFO "✅ LDAP bind password updated in Vault"
    notify "🔑 LDAP bind password rotated in Vault (AD update required)" warn
}

# ============================================================
# Main Execution
# ============================================================

main() {
    log INFO "==========================================="
    log INFO "Starting Vault Secret Rotation"
    log INFO "Type: $ROTATE_TYPE"
    log INFO "Dry Run: $DRY_RUN"
    log INFO "Force Mode: $FORCE_MODE"
    log INFO "==========================================="
    
    check_vault_connection
    
    case $ROTATE_TYPE in
        all)
            confirm_action
            rotate_jwt_keys
            rotate_database_credentials
            rotate_api_keys
            rotate_tls_certificates
            rotate_encryption_keys
            rotate_ldap_passwords
            ;;
        jwt)
            confirm_action
            rotate_jwt_keys
            ;;
        database)
            rotate_database_credentials
            ;;
        api-keys)
            confirm_action
            rotate_api_keys
            ;;
        certs|certificates)
            rotate_tls_certificates
            ;;
        encryption)
            confirm_action
            rotate_encryption_keys
            ;;
        ldap)
            confirm_action
            rotate_ldap_passwords
            ;;
        *)
            echo "Usage: $0 [all|jwt|database|api-keys|certs|encryption|ldap] [--dry-run] [--force]"
            exit 1
            ;;
    esac
    
    log INFO "==========================================="
    log INFO "✅ Secret Rotation Complete"
    log INFO "==========================================="
    
    notify "✅ Vault secret rotation completed successfully ($ROTATE_TYPE)" info
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        --force|-f)
            FORCE_MODE=true
            shift
            ;;
        all|jwt|database|api-keys|certs|certificates|encryption|ldap)
            ROTATE_TYPE=$1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
