# Djezzy National SOC Platform - Key Rotation Policy

**Document ID:** SEC-POL-007  
**Version:** 1.0.0  
**Classification:** CONFIDENTIAL  
**Effective Date:** January 15, 2024  
**Review Date:** July 15, 2024  
**Owner:** Security Operations Team (SOC)  
**Approver:** Chief Information Security Officer (CISO)

---

## 1. Purpose and Scope

### 1.1 Purpose
This policy establishes procedures for cryptographic key rotation within the Djezzy National SOC Platform to ensure:
- Compliance with ANRT encryption key management requirements
- Protection against key compromise and cryptographic attacks
- Maintenance of data confidentiality, integrity, and availability
- Alignment with NIST SP 800-57 guidelines

### 1.2 Scope
This policy applies to all cryptographic keys used within the Djezzy National SOC Platform, including:
- Database encryption keys (PostgreSQL TDE)
- Application-level encryption keys
- TLS/SSL certificates and private keys
- Kafka topic encryption keys
- Kubernetes secrets encryption keys
- API signing and verification keys
- HashiCorp Vault transit engine keys
- HSM master keys

### 1.3 Exclusions
- Keys managed by third-party SaaS providers (covered under vendor agreements)
- Public keys in asymmetric key pairs (rotated per separate certificate policy)

---

## 2. Key Classification and Rotation Intervals

| Key Type | Classification | Maximum Lifetime | Rotation Interval | ANRT Requirement |
|----------|---------------|------------------|-------------------|------------------|
| HSM Master Key | ROOT | 5 years | On compromise only | FIPS 140-2 L3 |
| KMS Master Key | ROOT | 3 years | Annual | Documented |
| Database DEK | DATA | 2 years | Quarterly (90 days) | AES-256 |
| Application DEK | DATA | 1 year | Monthly (30 days) | AES-256-GCM |
| TLS Private Key | TRANSPORT | 1 year | Annual | TLS 1.3 |
| API Signing Key | SIGNING | 1 year | Semi-annual | RSASSA-PSS |
| Kafka Topic Key | TRANSIT | 6 months | Quarterly | AES-256-GCM |
| Session Key | SESSION | 24 hours | Per session | Random generation |
| Backup Encryption Key | BACKUP | 2 years | With backup cycle | AES-256 |

**Legend:**
- **DEK**: Data Encryption Key
- **ROOT**: Root/Master key (highest sensitivity)
- **TRANSPORT**: Transport layer security
- **SIGNING**: Digital signature operations
- **TRANSIT**: Data in motion protection
- **SESSION**: Ephemeral session keys
- **BACKUP**: Archive/backup encryption

---

## 3. Key Lifecycle Management

### 3.1 Key Generation

#### Requirements
- All keys must be generated using approved CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
- Minimum key lengths as per ANRT requirements:
  - Symmetric: **256 bits minimum** (AES)
  - Asymmetric (RSA): **4096 bits minimum**
  - Asymmetric (ECC): **P-384 or higher**
  - HMAC: **256 bits minimum**

#### Approved Key Sources
```
Priority Order:
1. HSM (Thales Luna) - For root/master keys
2. HashiCorp Vault Transit Engine - For data encryption keys
3. AWS KMS (Algeria region) - For cloud-integrated services
❌ PROHIBITED: Software-only key generation for production keys
```

### 3.2 Key Storage

| Key Type | Storage Location | Access Control |
|----------|-----------------|----------------|
| Root Keys | HSM (FIPS 140-2 L3) | MFA + dual control |
| KMS Keys | Vault Transit | Named entity + audit |
| DEKs | Vault KV / KMS | Service account + policy |
| TLS Keys | Kubernetes Secrets (encrypted) | Pod identity |
| API Keys | Vault PKI/Cubbyhole | Short-lived tokens |

### 3.3 Key Distribution

- All key distribution must use secure channels (TLS 1.3 or equivalent)
- Never transmit keys via email, chat, or unencrypted channels
- Use envelope encryption pattern for DEK distribution:
  ```
  [Encrypted DEK] = Encrypt(DEK, KEK)
  [Message] = Encrypt(Plaintext, DEK)
  Transmit: Encrypted DEK + Message
  ```

### 3.4 Key Destruction

When a key reaches end-of-life:
1. **Cryptographic Erasure**: Zeroize key material from memory/storage
2. **Secure Deletion**: Overwrite storage sectors (minimum 7-pass DoD 5220.22-M)
3. **Audit Log**: Record destruction with timestamp, operator, reason
4. **Verification**: Verify destruction through HSM audit logs or attestation

**Key Retirement States:**
```
ACTIVE → DEACTIVATING → DEACTIVATED → DESTROYED
                ↓
          COMPROMISED → REVOKED → DESTROYED (immediate)
```

---

## 4. Key Rotation Procedures

### 4.1 Automated Rotation (Preferred)

The following keys support automated rotation via HashiCorp Vault:

```hcl
# Example: Auto-rotation configuration for application DEK
path "transit/keys/app-data-key" {
  capabilities = ["read", "update"]
}

# Vault auto-rotation settings
auto_rotation_config = {
  enabled = true
  period = "720h"  # 30 days
}
```

#### Automated Rotation Process
1. **Schedule**: Cron job triggers at configured interval
2. **New Key**: Generate new key version under same key name
3. **Re-encryption**: Background job re-encrypts existing data with new key version
4. **Verification**: Compare sample decrypts between old and new versions
5. **Decommission**: Mark old key version for scheduled deletion after grace period
6. **Notification**: Alert security team of successful rotation

### 4.2 Manual Rotation Procedure

For keys requiring manual intervention:

#### Pre-Rotation Checklist
- [ ] Change request approved by CISO or delegate
- [ ] Maintenance window scheduled (if service impact expected)
- [ ] Rollback plan documented
- [ ] Testing environment validated
- [ ] Stakeholders notified

#### Rotation Steps

**Step 1: Generate New Key**
```bash
# Via Vault CLI
vault write -f transit/keys/<key-name>/rotate

# Or generate new key entirely
vault write transit/keys/<new-key-name> \
    type=aes256-gcm96 \
    exportable=false \
    allow_plaintext_backup=false
```

**Step 2: Update Configuration**
```bash
# Update application config map
kubectl create configmap app-config \
    --from-literal=ENCRYPTION_KEY_NAME=<new-key-name> \
    --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new config
kubectl rollout restart deployment/<app-name> -n <namespace>
```

**Step 3: Re-encrypt Existing Data**
```bash
# For database fields - run migration script
./scripts/reencrypt-data.sh --source-key=<old-key> --target-key=<new-key>

# For Kafka topics - use consumer/producer pattern
# Read with old key, write with new key
```

**Step 4: Verification**
```bash
# Test decryption with new key
vault read transit/decrypt/<new-key-name> \
    ciphertext=<test-ciphertext>

# Verify application functionality
curl -X GET https://api.djezzy.dz/api/v1/health
```

**Step 5: Decommission Old Key**
```bash
# After grace period (minimum 7 days)
vault write transit/keys/<old-key-name>/config \
    min_decryption_version=<next-version> \
    min_encryption_version=<current-version>

# Schedule deletion (after retention period)
vault write transit/keys/<old-key-name>/rotate \
    # Mark for eventual deletion
```

### 4.3 Emergency Rotation (Compromised Key)

**IMMEDIATE ACTIONS (within 15 minutes):**

1. **Revoke Compromised Key**
   ```bash
   vault write sys/leases/revoke-prefix <key-path>
   vault write transit/keys/<compromised-key>/config \
       min_decryption_version=99999  # Block all decryption
   ```

2. **Activate Incident Response**
   - Page Security On-Call
   - Open incident ticket (SEV-1)
   - Begin forensic analysis

3. **Rotate to New Key Immediately**
   - Generate new key on different HSM partition if possible
   - Update all configurations
   - Force re-authentication for all sessions

4. **Assess Damage**
   - Determine what data was encrypted with compromised key
   - Identify time window of exposure
   - Evaluate need for customer notification (ANRT requirement)

5. **Document and Report**
   - Complete incident report within 24 hours
   - Notify ANRT if subscriber data affected
   - Post-mortem within 72 hours

---

## 5. Certificate Rotation (TLS)

### 5.1 Certificate Lifecycle

```
Request → Issue → Deploy → Monitor → Renew (80% lifetime) → Rotate
```

### 5.2 Automation with cert-manager

```yaml
# cert-manager Certificate resource
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: djezzy-soc-tls
  namespace: soc-frontend
spec:
  secretName: api-gateway-tls-cert
  duration: 2160h  # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  issuerRef:
    name: djezzy-letsencrypt-prod
  dnsNames:
    - api.djezzy.dz
    - soc.djezzy.dz
    - admin.djezzy.dz
```

### 5.3 Manual Certificate Rotation

If automated renewal fails:

```bash
# 1. Generate new CSR
openssl req -new -key private.key -out csr.pem \
    -subj "/C=DZ/O=Djezzy/CN=*.djezzy.dz"

# 2. Submit to CA (internal or public)

# 3. Receive certificate chain
cat fullchain.pem > new-cert.pem

# 4. Create/update Kubernetes Secret
kubectl create secret tls api-gateway-tls-cert \
    --cert=new-cert.pem \
    --key=new-private.key \
    --dry-run=client -o yaml | kubectl apply -f -

# 5. Reload NGINX/Kong
kubectl exec -it <gateway-pod> -- nginx -s reload
```

---

## 6. Monitoring and Alerting

### 6.1 Key Expiry Alerts

| Alert Name | Condition | Severity | Notification |
|------------|-----------|----------|--------------|
| Key Expiring Soon | TTL < 30 days | Warning | Slack #security |
| Key Expiring Critical | TTL < 7 days | Critical | PagerDuty + Email |
| Key Expired | TTL <= 0 | Critical | PagerDuty + Phone |
| Rotation Failed | Last rotation status != success | Warning | Slack #security |

### 6.2 Dashboards

Maintain Grafana dashboard showing:
- All keys with expiration countdown
- Rotation history (last 12 months)
- Key inventory by type/classification
- Compliance status (ANRT requirements)

---

## 7. Audit and Compliance

### 7.1 Required Audit Logs

Every key operation must be logged:
- Key creation (who, when, what type)
- Key access (who accessed, purpose)
- Key rotation (old key → new key mapping)
- Key destruction (verification of secure deletion)

### 7.2 Retention Requirements

Per ANRT regulations:
- Key operation logs: **5 years minimum**
- Key material backup: **Duration of data encryption + 5 years**

### 7.3 Compliance Reporting

Generate quarterly reports for:
- ANRT compliance officer
- Internal audit committee
- External auditors (annual)

Report contents:
- Inventory of all active keys
- Rotations performed in quarter
- Any exceptions or incidents
- Next quarter's planned rotations

---

## 8. Roles and Responsibilities

| Role | Responsibilities |
|------|-----------------|
| **CISO** | Policy approval, exception authorization |
| **Security Architect** | Key hierarchy design, procedure updates |
| **Security Engineer** | Day-to-day rotation execution |
| **Vault Admin** | KMS/HSM administration |
| **Application Owner** | Integration testing post-rotation |
| **Compliance Officer** | Audit verification, reporting |

---

## 9. Exceptions

Exception requests must include:
1. Business justification
2. Risk assessment
3. Compensating controls
4. Duration of exception
5. Approval from CISO

Exceptions are reviewed quarterly and must not exceed 90 days without renewal.

---

## 10. Related Documents

- [ANRT Technical Specification for Telecom Security](internal://anrt-spec)
- [NIST SP 800-57 Part 1 Rev. 5](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [HashiCorp Vault Transit Secrets Engine Docs](https://developer.hashicorp.com/vault/docs/secrets/transit)
- [FIPS 140-2 Requirements](https://csrc.nist.gov/publications/detail/fips/140/2/final)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-15 | Security Team | Initial release |

---

**Approval Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CISO | _________________ | _________________ | _______ |
| Security Director | _________________ | _________________ | _______ |
| IT Director | _________________ | _________________ | _______ |
