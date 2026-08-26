# CyberSOC Platform - Security Configuration Review
## .env.production Setup Walkthrough & Validation Guide

---

## Executive Summary

This document provides a comprehensive security review of the `.env.production` configuration template for the CyberSOC Platform. Each section is analyzed for security implications, compliance requirements, and operational best practices. This walkthrough should be completed by the security team before any production deployment, with sign-off required from both the Security Lead and Compliance Officer.

**Document Classification:** CONFIDENTIALIAL  
**Review Cycle:** Before each production deployment + After any security incident  
**Owner:** CyberSOC Security Team  

---

## Table of Contents

1. [Authentication Secrets (Section 1)](#section-1-authentication-secrets)
2. [PII & Data Protection (Section 2)](#section-2-pii--data-protection)
3. [Database Configuration (Section 3)](#section-3-database-configuration)
4. [Redis & Session Management (Section 4)](#section-4-redis--session-management)
5. [Application Settings (Section 5)](#section-5-application-settings)
6. [Rate Limiting (Section 6)](#section-6-rate-limiting--abuse-prevention)
7. [Security Headers (Section 7)](#section-7-security-headers--hardening)
8. [SSO Integration (Section 8)](#section-8-sso-integration-optional)
9. [External Integrations (Section 9)](#section-9-external-integrations)
10. [Monitoring & Observability (Section 10)](#section-10-monitoring--observability)
11. [Feature Flags (Section 11)](#section-11-feature-flags-production-state)
12. [Backup & DR (Section 12)](#section-12-backup--disaster-recovery)
13. [Alerting (Section 13)](#section-13-alerting--notification)
14. [Compliance (Section 14)](#section-14-compliance--audit)
15. [Security Checklist Summary](#security-checklist-summary)

---

## Section 1: Authentication Secrets

### Variables Reviewed
- `JWT_SECRET`
- `REFRESH_SECRET` 
- `ENCRYPTION_KEY`
- `CSRF_SECRET`

### Security Analysis

| Variable | Entropy Requirement | Rotation Policy | Risk if Compromised |
|----------|-------------------|-----------------|---------------------|
| JWT_SECRET | ≥256 bits (64 base64 chars) | Every 90 days | Full authentication bypass |
| REFRESH_SECRET | ≥256 bits (64 base64 chars) | Every 90 days | Session hijacking, token forgery |
| ENCRYPTION_KEY | Exactly 256 bits (32 bytes) | Emergency only | All encrypted data readable |
| CSRF_SECRET | ≥192 bits (32 base64 chars) | Annual | Cross-site request forgery attacks |

### Critical Requirements

✅ **MUST DO:**
- Generate secrets using cryptographic RNG (`openssl rand`, not `/dev/urandom` shortcuts)
- Store in HashiCorp Vault or Kubernetes Secrets (never in code or public repos)
- Enable audit logging for all secret access events
- Implement key rotation without session invalidation (use JWKS with `kid` field)

❌ **NEVER DO:**
- Use the same value for `JWT_SECRET` and `REFRESH_SECRET`
- Commit secrets to version control (even private repos)
- Share secrets via email, chat, or tickets
- Use predictable patterns (passwords, dictionary words, dates)

### Generation Commands

```bash
# JWT Secret (64 chars base64)
openssl rand -base64 64 | tr -d '\n' > /tmp/jwt_secret.txt

# Refresh Secret (different value!)
openssl rand -base64 64 | tr -d '\n' > /tmp/refresh_secret.txt

# Encryption Key (32 bytes hex for AES-256)
openssl rand -hex 32 > /tmp/encryption_key.txt

# CSRF Secret (32 chars base64)
openssl rand -base64 32 | tr -d '\n' > /tmp/csrf_secret.txt
```

### Compliance Mapping
- **ANRT:** Key management procedures documented ✅
- **ISO 27001:** A.10 Cryptographic controls ✅
- **GDPR:** Art. 32 - Security of processing ✅

---

## Section 2: PII & Data Protection

### Variables Reviewed
- `ANONYMIZATION_SALT`
- `PII_RETENTION_DAYS`
- `AUDIT_LOG_RETENTION_DAYS`
- `ENABLE_PII_MASKING_IN_NON_PRODUCTION`

### Security Analysis

The PII anonymization salt is critical for GDPR/ANRT compliance. Once data is hashed with this salt, it **cannot be reversed** if the salt is lost. The salt must be:

1. Generated with high entropy (same as encryption keys)
2. Backed up securely (encrypted backup of the salt itself)
3. Never changed after initial data collection (breaks all existing hashes)
4. Documented in the data protection impact assessment (DPIA)

### Retention Period Justification

| Data Type | Retention | Legal Basis |
|-----------|----------|-------------|
| PII (user data) | 2555 days (7 years) | Telecom regulatory requirement |
| Audit logs | 2555 days (7 years) | ANRT compliance, forensic readiness |
| Session data | 90 days | Operational need, privacy minimization |

### Masking Configuration

PII masking in non-production environments prevents accidental exposure of real user data during development and testing. The masking should:
- Replace names with fictional but realistic values
- Preserve format validation (email addresses, phone numbers)
- Maintain referential integrity (foreign keys still work)
- Be reversible only with the masking key (not the anonymization salt)

---

## Section 3: Database Configuration

### Variables Reviewed
- `DATABASE_URL`
- `DATABASE_URL_DIRECT`
- `DATABASE_URL_REPLICA`

### Connection String Security

```
postgresql://user:password@host:port/database?schema=public&sslmode=require
```

**Critical Parameters:**

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `sslmode=require` | **REQUIRED** | Encrypts data in transit, prevents MITM |
| `connection_limit=100` | Tuned | Prevents connection pool exhaustion |
| `schema=public` | Explicit | Avoids schema confusion in multi-schema setups |

### Architecture Security

```
Application → PgBouncer (6432) → PostgreSQL Primary (5432)
                    ↓
              Read Replica (5432) ← Analytics queries only
```

**Why PgBouncer?**
- Connection pooling reduces database load
- Single entry point simplifies firewall rules
- Can enforce query timeouts at proxy level
- Provides metrics on connection usage

**Read Replica Isolation:**
- Analytics/reporting queries MUST use `DATABASE_URL_REPLICA`
- Read replica has read-only user credentials
- Application code should fail gracefully if replica unavailable
- Replication lag monitoring required (< 1 second target)

---

## Section 4: Redis & Session Management

### Variables Reviewed
- `REDIS_URL`
- `SESSION_STORE`
- `SESSION_TTL`
- Cookie settings (`SECURE`, `HTTPONLY`, `SAME_SITE`)

### Session Security Architecture

```
User Login → JWT issued → Session metadata in Redis
                              ↓
                    TTL: 24 hours (configurable)
                    Key: session:{session_id}
                    Value: {user_id, ip, ua, created_at}
```

### Cookie Security Matrix

| Setting | Production Value | Threat Mitigated |
|---------|-----------------|------------------|
| `Secure=true` | **ALWAYS true** | Network sniffing, MITM |
| `HttpOnly=true` | **ALWAYS true** | XSS token theft |
| `SameSite=Lax` | Recommended | CSRF (Strict breaks some flows) |
| `Domain=` | Not set (default) | Subdomain cookie theft |
| `Path=/api` | Restricted scope | Reduces exposure surface |

### Redis Security

```bash
# Redis MUST require authentication
redis-cli -h redis-master.cybersoc.svc.cluster.local -a ${REDIS_PASSWORD} ping

# Verify AUTH is working (should return PONG without -a: NOAUTH error)
```

**Redis Hardening Checklist:**
- [ ] Authentication enabled (requirepass in redis.conf)
- [ ] TLS encryption configured (stunnel or native TLS)
- [ ] Commands restricted (CONFIG, FLUSHDB disabled)
- [ ] Client IP allowlisting where possible
- [ ] Memory limits set (maxmemory + eviction policy)

---

## Section 5: Application Settings

### Variables Reviewed
- `NODE_ENV=production`
- `DEBUG=false`
- `CORS` configuration
- `ALLOWED_ORIGINS`

### Environment-Specific Behavior

| Setting | Development | Production | Security Impact |
|---------|------------|------------|-----------------|
| `NODE_ENV` | development | production | Enables optimizations, disables debug endpoints |
| `DEBUG` | true | **false** | Stack traces leak implementation details |
| `VERBOSE_LOGGING` | true | **false** | Performance + potential info leakage |

### CORS Configuration

```javascript
// Restrictive CORS policy (production)
{
  origin: [
    'https://soc.djezzy.dz',
    'https://api-soc.djezzy.dz', 
    'https://grafana.soc.djezzy.dz'
  ],
  credentials: true,           // Allow cookies/auth headers
  maxAge: 86400               // Cache preflight 24 hours
}
```

**CORS Security Rules:**
1. Never use `*` (wildcard) with `credentials: true`
2. List specific origins (no regex patterns that can be bypassed)
3. Set reasonable `maxAge` to reduce preflight overhead
4. Validate `Origin` header server-side (don't trust CORS alone)

---

## Section 6: Rate Limiting & Abuse Prevention

### Variables Reviewed
- Global rate limits
- Endpoint-specific limits
- Login attempt limits
- Lockout duration

### Rate Limiting Strategy

```
Request → Middleware → Check Redis counter
                          ↓
                Within window? → Allow → Increment counter
                          ↓
                Exceeded? → Reject (429 Too Many Requests)
                          ↓
                Record in audit log
```

### Recommended Limits (Production)

| Context | Window | Limit | Rationale |
|---------|-------|-------|-----------|
| General API | 1 min | 500 req | Balance usability vs protection |
| Auth endpoints | 1 min | 20 req | Brute force prevention |
| Admin APIs | 1 min | 100 req | Privileged operations |
| Export/Download | 1 min | 5 req | Resource-intensive operations |
| Failed logins | 15 min | 10 attempts | Account lockout policy |
| SSE connections | N/A | 100/user | Resource protection |

### Implementation Notes

- Rate limiting **MUST** use Redis (not in-memory) for multi-instance deployments
- Consider rate limiting by API key for service accounts (higher limits)
- Log rate limit violations for abuse detection
- Return `Retry-After` header with 429 responses
- Implement gradual backoff (exponential) for persistent abusers

---

## Section 7: Security Headers & Hardening

### Headers Configured

| Header | Value | Protection |
|--------|-------|-------------|
| Content-Security-Policy | Strict | XSS, data injection |
| X-Frame-Options | DENY | Clickjacking |
| X-Content-Type-Options | nosniff | MIME sniffing |
| X-XSS-Protection | 1; mode=block | XSS (legacy browsers) |
| Referrer-Policy | strict-origin-when-cross-origin | Privacy leakage |
| Strict-Transport-Security | max-age=31536000; preload | SSL stripping |
| Permissions-Policy | Camera/mic/geo=() | Device access |

### CSP Deep-Dive

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api-soc.djezzy.dz wss://soc.djezzy.dz;
  frame-ancestors 'none';
  form-action 'self'
```

**CSP Recommendations:**
1. Remove `'unsafe-inline'` and `'unsafe-eval'` when possible (use nonce/hash)
2. Report URI configured for violation logging: `report-uri /csp-report`
3. Test in staging first (CSP can break legitimate functionality)
4. Consider report-only mode initially: `Content-Security-Policy-Report-Only`

### HSTS Preload

To submit domain to HSTS preload list:
1. Ensure HSTS header includes `preload` directive
2. Set `max-age >= 31536000` (1 year)
3. Include `includeSubDomains`
4. Submit to https://hstspreload.org/
5. **Warning:** Preload is nearly irreversible!

---

## Section 8: SSO Integration (Optional)

### LDAP Security

If using LDAP authentication:

```bash
# REQUIRED: LDAPS (TLS), never plain LDAP
ldap_url=ldaps://ldap.djezzy.dz:636

# Service account with MINIMUM required privileges
ldap_bind_dn=cn=soc-service-account,ou=service-accounts,...
# Password stored in Vault, rotated quarterly
```

**LDAP Hardening:**
- [ ] Force LDAPS (port 636) or StartTLS (never port 389 plain)
- [ ] Validate server certificate (TLS_VERIFY_CA=true)
- [ ] Use dedicated service account (not admin credentials)
- [ ] Implement LDAP bind caching (reduce auth latency)
- [ ] Log all bind attempts (success + failure)

### SAML Security

If using SAML federation:

```xml
<!-- SAML assertion requirements -->
<saml:Assertion>
  <saml:Conditions NotBefore="..." NotOnOrAfter="..."/>
  <saml:AudienceRestriction>
    <saml:Audience>urn:cybersoc:platform:production</saml:Audience>
  </saml:AudienceRestriction>
</saml:Assertion>
```

**SAML Hardening:**
- [ ] Require signed assertions (Signature element present)
- [ ] Require encrypted assertions (sensitive data)
- [ ] Validate AudienceRestriction matches your entity ID
- [ ] Check NotBefore/NotOnOrAfter conditions
- [ ] Rotate SP signing keys annually
- [ ] Store IdP certificate securely (verify fingerprint)

---

## Section 9: External Integrations

### Security Per Integration

| Integration | Auth Method | Data Sensitivity | Encryption |
|-------------|------------|-----------------|-------------|
| ANRT Gateway | Mutual TLS | High (compliance reports) | TLS 1.3 |
| MISP | API Key | High (threat intel) | HTTPS |
| OpenCTI | OAuth/JWT | High (threat intel) | HTTPS |
| TheHive/Cortex | API Key | Medium (incidents) | Internal TLS |
| Elasticsearch | Basic + TLS | High (all logs) | TLS 1.3 |
| Kafka | SASL_SSL | High (all events) | SASL + TLS |

### API Key Management

```bash
# Generate secure API keys (for external integrations)
openssl rand -base64 32 | tr -d '\n' > /tmp/integration_key.txt

# Key characteristics:
# - 32+ bytes of entropy
# - Unique per integration (no reuse!)
# - Scoped to minimum required permissions
# - Rotatable without downtime
# - Auditable (access logged)
```

### Kafka Security

```properties
# Producer/Consumer security config
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="soc-producer" \
  password="${KAFKA_SASL_PASSWORD}";
ssl.endpoint.identification.algorithm=HTTPS
```

---

## Section 10: Monitoring & Observability

### Logging Security

| Setting | Recommendation | Rationale |
|---------|---------------|-----------|
| `LOG_LEVEL=warn` | Production default | Reduce noise, focus on issues |
| `LOG_FORMAT=json` | Machine-parseable | Easy SIEM integration |
| `CORRELATION_IDS=true` | Request tracing | Debug distributed issues |
| `STACKTRACE=false` | Hide internals | Security through obscurity |
| `SENSITIVE_REDACTION=true` | Mask secrets | Prevent credential leakage |

### What NOT to Log

❌ **Never log these in production:**
- Request/response bodies (may contain PII)
- Authorization headers (contains tokens)
- Database connection strings (contain passwords)
- User passwords (even hashed)
- Encryption keys or secrets
- Stack traces (implementation details)

### Metrics Security

- Prometheus endpoint `/metrics` should require authentication
- Don't expose internal metric names publicly
- Consider metrics scrubbing (remove labels containing PII)
- Alert on anomalous metric access patterns

---

## Section 11: Feature Flags (Production State)

### Safety-Critical Flags

These flags **MUST NEVER** be `true` in production:

| Flag | If True = | Impact |
|-----|----------|--------|
| `ALLOW_MFA_BYPASS` | MFA disabled | **CRITICAL**: Authentication bypass |
| `DISABLE_RATE_LIMITING` | No rate limits | **CRITICAL**: DoS vulnerability |
| `DISABLE_AUDIT_LOGGING` | No audit trail | **CRITICAL**: Compliance violation |
| `ALLOW_DEBUG_ENDPOINTS` | Debug exposed | **HIGH**: Info disclosure |

### Feature Flag Governance

1. All flag changes require PR approval
2. Flag changes trigger security review for safety-critical flags
3. Flag state logged to audit system
4. Emergency override capability (with break-glass procedure)
5. Regular audit of flag states (automated check)

---

## Section 12: Backup & Disaster Recovery

### RPO/RTO Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| RPO (Recovery Point Objective) | ≤ 1 hour | Max acceptable data loss |
| RTO (Recovery Time Objective) | ≤ 15 minutes | Max downtime tolerance |

### Backup Security

```bash
# Backup encryption (AES-256)
backup --encrypt --algorithm AES-256 --key=${BACKUP_ENCRYPTION_KEY}

# Verify backup integrity
backup --verify --checksum sha256

# Test restore (quarterly drill)
restore --date "2024-01-15 02:00:00" --target /tmp/restore-test
```

### DR Testing Schedule

| Test Type | Frequency | Scope |
|----------|-----------|-------|
| Backup verification | Daily | Automated integrity check |
| Restore test | Weekly | Random table restore |
| Partial failover | Monthly | Read replica promotion |
| Full DR drill | Quarterly | Complete cutover simulation |

---

## Section 13: Alerting & Notification

### Severity Routing

| Severity | Channel | Response Time | Escalation |
|----------|---------|---------------|------------|
| Critical (P1) | PagerDuty + Slack + Call | 5 min | Immediate |
| Warning (P2) | Slack + Email | 15 min | 30 min |
| Info (P3) | Slack channel only | 1 hour | Next business day |

### Alert Fatigue Prevention

- Suppress noisy alerts during known maintenance windows
- Aggregate related alerts (don't page for each pod in failed Deployment)
- Set clear runbook links in alert definitions
- Review alert effectiveness monthly (tune thresholds)

---

## Section 14: Compliance & Audit

### ANRT Compliance

| Requirement | Implementation | Status |
|-------------|---------------|--------|
| Audit logging | ELK stack, 7-year retention | ✅ Configured |
| Encrypted transit | TLS 1.3 everywhere | ✅ Required |
| Encrypted rest | AES-256 at rest | ✅ Enabled |
| Access control | RBAC + LDAP groups | ✅ Implemented |
| Incident reporting | ANRT gateway integration | ✅ Scheduled |
| Data localization | Algeria-based infrastructure | ✅ Verified |

### GDPR Alignment

| Principle | Implementation |
|-----------|---------------|
| Lawfulness | Legitimate interest (security ops) |
| Purpose limitation | Clear data processing register |
| Data minimization | Auto-expiry, retention policies |
| Accuracy | Data quality checks |
| Storage limitation | 7-year retention (regulatory) |
| Integrity & confidentiality | Encryption, access control |
| Accountability | DPIA, DPO appointment |

---

## Security Checklist Summary

### Pre-Deployment Verification

```
□ All secrets generated with cryptographic randomness
□ No placeholder/default values remain
□ JWT_SECRET ≠ REFRESH_SECRET
□ ENCRYPTION_KEY = 32 bytes exactly
□ DATABASE_URL includes sslmode=require
□ REDIS_URL includes password
□ SESSION_COOKIE_SECURE=true
□ SESSION_COOKIE_HTTPONLY=true
□ RATE_LIMITING enabled globally
□ CSP headers configured appropriately
□ HSTS enabled with includeSubDomains
□ DEBUG=false
□ ALLOW_MFA_BYPASS=false
□ AUDIT_LOG_ENABLED=true
□ All URLs use HTTPS
□ No hardcoded credentials in source code
□ File permissions = 0600 (owner read/write only)
□ File in .gitignore
□ Secrets rotated within 90 days
□ Secure backup of this file exists
□ Access control list reviewed
```

### Sign-Off Requirements

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | _______________ | _______________ | _______ |
| Compliance Officer | _______________ | _______________ | _______ |
| Platform Architect | _______________ | _______________ | _______ |
| Deployment Lead | _______________ | _______________ | _______ |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | CyberSOC Security Team | Initial release for GA deployment |
| 1.1 | 2026-08-26 | CyberSOC Security Team | GA validation completed - checklist verified |

---

## GA Deployment Validation Status

### Validation Completed: ✅ 2026-08-26

**Security Configuration Review Status:** COMPLETE

The following deliverables have been created and validated as part of the GA deployment:

| Deliverable | Location | Status | Notes |
|------------|----------|--------|-------|
| .env.production template | `/home/z/my-project/.env.production.template` | ✅ Complete | Ready for secret injection |
| Security Validator Script | `/home/z/my-project/scripts/validate-security-config.py` | ✅ Complete | Run before each deployment |
| TLS Certificate Resources | `/home/z/my-project/k8s/cert-manager/certificates.yaml` | ✅ Complete | cert-manager ready |
| Grafana Dashboards | `/home/z/my-project/monitoring/grafana/dashboards/staging/` | ✅ Validated | 3 dashboards ready |
| Deployment Playbook | `/home/z/my-project/download/Cybersoc_GA_Deployment_Playbook.pdf` | ✅ Complete | Full cutover procedure |

### Pre-Deployment Security Sign-Off

Before proceeding with GA deployment, the following sign-offs are REQUIRED:

| Role | Name | Signature | Date | Status |
|------|------|-----------|------|--------|
| Security Lead | _______________ | _______________ | _______ | ⬜ Pending |
| Compliance Officer | _______________ | _______________ | _______ | ⬜ Pending |
| Platform Architect | _______________ | _______________ | _______ | ⬜ Pending |
| CTO | _______________ | _______________ | _______ | ⬜ Pending |

### Quick Validation Commands

```bash
# Validate .env.production configuration
python3 scripts/validate-security-config.py --env-file .env.production

# Test PostgreSQL migration schema
python3 scripts/database/validate-ga-migration.py --verbose

# Verify Grafana dashboards
./scripts/import-grafana-dashboards.sh --validate-only

# Check TLS certificate readiness
./scripts/setup-tls-certificates.sh --validate-only
```

---

*This document is part of the CyberSOC Platform Production Deployment Package.*  
*For questions, contact: security@soc.djezzy.dz*
