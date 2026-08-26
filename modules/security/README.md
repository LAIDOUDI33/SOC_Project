# Module 8: Security Hardening & SSL/TLS Configuration

**National SOC Platform for Algeria (2026-2030)**

## Overview

This module provides comprehensive security hardening capabilities for the National SOC Platform, including:

- **SSL/TLS Certificate Management** - Monitor, validate, and manage certificates
- **Security Headers** - OWASP-recommended security header generation and validation
- **Access Control** - RBAC, firewall rules, IP whitelist/blacklist management
- **Audit Logging** - Comprehensive security event logging and compliance tracking
- **Vulnerability Management** - Scan results, remediation tracking
- **Compliance Checking** - CIS Controls, NIST SP 800-53, ISO 27001 alignment
- **Encryption Utilities** - AES-256-GCM, RSA-OAEP, hashing functions
- **Input Validation** - XSS prevention, SQL injection detection

---

## Table of Contents

1. [Architecture](#architecture)
2. [File Structure](#file-structure)
3. [Quick Start](#quick-start)
4. [API Endpoints](#api-endpoints)
5. [React Hooks](#react-hooks)
6. [Components](#components)
7. [Configuration](#configuration)
8. [Security Features](#security-features)
9. [Hardening Checklist](#hardening-checklist)
10. [Certificate Management](#certificate-management)
11. [Incident Response](#incident-response)
12. [Compliance Mapping](#compliance-mapping)
13. [Penetration Testing](#penetration-testing)
14. [Troubleshooting](#troubleshooting)

---

## Architecture

```
modules/security/
├── types/
│   └── security.types.ts          # Comprehensive TypeScript types (~900 lines)
├── lib/
│   └── security-lib.ts            # Core security utilities (~1800 lines)
├── api/
│   ├── headers/route.ts           # Security headers API
│   ├── ssl/route.ts               # SSL/TLS management API
│   ├── audit/route.ts             # Audit & compliance API
│   └── access/route.ts            # Access control API
├── hooks/
│   └── use-security.ts            # React hooks for data fetching
├── components/
│   └── SecurityDashboard.tsx      # Main dashboard component
└── configs/
    ├── nginx-security.conf         # Hardened Nginx configuration
    ├── tls-params.conf             # TLS parameters
    ├── csp-policies.json           # CSP configurations
    ├── cors-config.json            # CORS policies
    ├── rate-limits.json            # Rate limiting rules
    └── security-headers.json       # Header configurations
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React UI      │────▶│   API Routes    │────▶│  Security Lib   │
│ (Dashboard)     │◀────│ (Next.js)       │◀────│ (Utilities)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐     ┌─────────────────┐
                       │   Config Files   │     │  Type Definitions│
                       │ (JSON/Conf)      │     │ (TypeScript)     │
                       └─────────────────┘     └─────────────────┘
```

---

## File Structure

| File | Lines | Purpose |
|------|-------|---------|
| `types/security.types.ts` | ~900 | Complete TypeScript type definitions |
| `lib/security-lib.ts` | ~1800 | Core security utility functions |
| `api/headers/route.ts` | ~500 | Security headers endpoint |
| `api/ssl/route.ts` | ~600 | SSL/TLS management endpoints |
| `api/audit/route.ts` | ~700 | Audit & compliance endpoints |
| `api/access/route.ts` | ~700 | Access control endpoints |
| `hooks/use-security.ts` | ~650 | React hooks library |
| `components/SecurityDashboard.tsx` | ~1200 | Main dashboard component |

**Total: ~6650+ lines of production-ready code**

---

## Quick Start

### Installation

The security module is part of the main project. No additional installation required.

```bash
cd /home/z/my-project
npm install
```

### Importing Types

```typescript
import type {
  Certificate,
  TLSConfiguration,
  AuditLogEntry,
  FirewallRule,
  Vulnerability,
  ComplianceCheck,
} from '@/modules/security/types/security.types';
```

### Using Security Library

```typescript
import {
  generateSecurityHeaders,
  validateTLSConfiguration,
  sanitizeInput,
  detectSQLInjection,
  hashPassword,
  verifyPassword,
  encryptAES256GCM,
  decryptAES256GCM,
  signJWT,
  verifyJWT,
  recordAuditEvent,
  checkIPReputation,
} from '@/modules/security/lib/security-lib';
```

### Using React Hooks

```tsx
import { 
  useSecurityDashboard,
  useSSLCertificates,
  useAuditLogs,
  useComplianceStatus,
} from '@/modules/security/hooks/use-security';

function MyComponent() {
  const { posture, loading } = useSecurityDashboard({ autoRefresh: true });
  
  if (loading) return <Loading />;
  
  return (
    <div>
      <h1>Security Score: {posture?.overallScore}</h1>
      <p>Grade: {posture?.grade}</p>
    </div>
  );
}
```

---

## API Endpoints

### Security Headers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/headers` | Get recommended security headers |
| POST | `/api/security/headers/validate` | Validate existing headers |

**Example Response:**
```json
{
  "success": true,
  "data": {
    "headers": {
      "Content-Security-Policy": "...",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "X-Frame-Options": "DENY"
    },
    "owaspCompliance": { "score": 95, "compliant": [...], "nonCompliant": [...] }
  }
}
```

### SSL/TLS Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/ssl?action=status` | Get certificate status summary |
| GET | `/api/security/ssl?action=certificates` | List all certificates |
| POST | `/api/security/ssl?action=generate-csr` | Generate CSR |
| POST | `/api/security/ssl?action=install` | Install certificate |
| GET | `/api/security/ssl?action=config` | Get TLS configuration |
| PUT | `/api/security/ssl` | Update TLS config |
| GET | `/api/security/ssl?action=scan` | Run SSL vulnerability scan |

### Audit & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/audit?action=logs` | Get audit logs |
| POST | `/api/security/audit?action=log` | Record audit entry |
| GET | `/api/security/audit?action=compliance` | Get compliance status |
| POST | `/api/security/audit?action=compliance/run` | Run compliance check |
| GET | `/api/security/audit?action=vulnerabilities` | Get vulnerabilities |
| POST | `/api/security/audit?action=scan` | Trigger security scan |
| GET | `/api/security/audit?action=posture` | Get security posture |

### Access Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/security/access?action=policies` | List access policies |
| POST | `/api/security/access?action=policies` | Create policy |
| PUT | `/api/security/access?action=policies` | Update policy |
| DELETE | `/api/security/access?action=policies&id=:id` | Delete policy |
| GET | `/api/security/access?action=firewall-rules` | List firewall rules |
| POST | `/api/security/access?action=ip-blocklist` | Add to blocklist |
| POST | `/api/security/access?action=ip-whitelist` | Add to whitelist |
| GET | `/api/security/access?action=roles` | List roles & permissions |

---

## React Hooks

### `useSecurityDashboard(options?)`
Combined hook for the main dashboard view.

```tsx
const {
  posture,           // Overall security posture
  certificateStatus, // Certificate status summary
  recentAlerts,      // Number of active alerts
  complianceScore,   // Compliance percentage
  vulnerabilityCount,// Open vulnerabilities
  loading,           // Loading state
  error,             // Error message if any
  healthStatus,      // 'healthy' | 'warning' | 'critical'
  refetch,           // Manual refresh function
} = useSecurityDashboard({
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute
});
```

### `useSSLCertificates(options?)`
Certificate management with CRUD operations.

```tsx
const {
  data,              // Paginated certificate list
  status,            // Status counts (valid, expiring, expired)
  generateCSR,       // Function to create CSR
  installCertificate,// Function to install cert
  loading,
  error,
  refetch,
} = useSSLCertificates({ status: 'expiring_soon', page: 1 });
```

### `useAuditLogs(filters?)`
Audit log access with filtering.

```tsx
const {
  data,              // Paginated log entries
  statistics,        // Log statistics
  recordEvent,       // Function to log events
  loading,
  refetch,
} = useAuditLogs({
  category: 'authentication',
  severity: 'critical',
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
});
```

### `useComplianceStatus(framework?)`
Compliance checking across frameworks.

```tsx
const {
  data,              // Full compliance report
  runCheck,          // Trigger new check
  supportedFrameworks,// Available frameworks
  loading,
} = useComplianceStatus('CIS_Controls_v8');
```

---

## Components

### `<SecurityDashboard />`

Main security console component with tabbed interface:

```tsx
import SecurityDashboard from '@/modules/security/components/SecurityDashboard';

export default function Page() {
  return <SecurityDashboard />;
}
```

**Tabs:**
1. **Overview** - Security score, critical issues, recommendations
2. **Certificates** - SSL/TLS monitoring and management
3. **Audit Log** - Security event timeline with filters
4. **Compliance** - CIS/NIST checklist with pass/fail
5. **Access Control** - Policies, firewall rules, IP lists
6. **Vulnerabilities** - Scan results with severity ratings
7. **Hardening Guide** - Recommendations based on findings

---

## Configuration

### Nginx Configuration

Copy and include in your nginx setup:

```nginx
include /path/to/modules/security/configs/nginx-security.conf;
```

Generate DH parameters:
```bash
openssl dhparam -out /etc/nginx/dhparam.pem 4096
```

### TLS Parameters

Include in server block:
```nginx
include /path/to/modules/security/configs/tls-params.conf;
```

### CSP Policies

Load from JSON:
```typescript
import cspPolicies from './configs/csp-policies.json';
// Use cspPolicies.policies.default for web app
```

### Rate Limits

Configure per-endpoint limits:
```typescript
import rateLimits from './configs/rate-limits.json';
// Apply rateLimits.rules to your rate limiter middleware
```

---

## Security Features

### Encryption Support

```typescript
// AES-256-GCM Encryption
const encrypted = await encryptAES256GCM('sensitive data', encryptionKey);
const decrypted = await decryptAES256GCM(encrypted, encryptionKey);

// RSA-OAEP Encryption
const encrypted = await encryptRSAOAEP(data, publicKeyPEM);
const decrypted = await decryptRSAOAEP(encrypted, privateKeyPEM);
```

### Password Security

```typescript
// Hash password (PBKDF2-SHA512, 600K iterations)
const hash = await hashPassword('userPassword123!');

// Verify password
const isValid = await verifyPassword('input', storedHash);

// Analyze strength
const analysis = analyzePasswordStrength(password);
console.log(analysis.score); // 0-100
console.log(analysis.strength); // 'very_weak' to 'very strong'
```

### Input Sanitization

```typescript
// XSS Prevention
const result = sanitizeInput(userInput, {
  encodeHTML: true,
  removeScripts: true,
  maxLength: 1000,
});

if (!result.clean) {
  console.warn('XSS patterns detected:', result.detectedPatterns);
}

// SQL Injection Detection
const sqlResult = detectSQLInjection(input);
if (!sqlResult.safe) {
  console.error('SQL injection attempt:', sqlResult.detectedPatterns);
}
```

### JWT Token Handling

```typescript
// Sign token
const token = await signJWT(
  { sub: userId, role: 'analyst', permissions: [...] },
  secretKey,
  15 * 60 // 15 minutes expiry
);

// Verify token
const payload = await verifyJWT(token, secretKey);

// Generate token pair (access + refresh)
const tokens = await generateTokenPair(payload, accessSecret, refreshSecret);
```

---

## Hardening Checklist

Based on **CIS Benchmarks** and **NIST Guidelines**

### Network Security
- [ ] TLS 1.2+ only (no SSLv3, TLS 1.0, 1.1)
- [ ] Strong cipher suites configured
- [ ] HSTS enabled with max-age ≥ 31536000
- [ ] OCSP stapling enabled
- [ ] Perfect forward secrecy (ECDHE/DHE)
- [ ] Firewall rules implemented
- [ ] Unnecessary ports closed

### Application Security
- [ ] Content Security Policy implemented
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy restricting features
- [ ] CORS properly configured
- [ ] Rate limiting on all endpoints

### Authentication & Authorization
- [ ] MFA enforced for all users
- [ ] Strong password policy (12+ chars, complexity)
- [ ] Account lockout after failed attempts
- [ ] Session timeout configured
- [ ] Secure session management
- [ ] RBAC properly implemented
- [ ] API key authentication for services

### Data Protection
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Key management procedures
- [ ] Backup encryption enabled
- [ ] Data classification implemented
- [ ] DLP controls where needed

### Logging & Monitoring
- [ ] Centralized security logging
- [ ] Log integrity protection
- [ ] Alerting on critical events
- [ ] Audit trail for sensitive actions
- [ ] Log retention policy (1 year minimum)
- [ ] SIEM integration active

### Incident Response
- [ ] IR playbooks documented
- [ ] Escalation procedures defined
- [ ] Communication templates ready
- [ ] Forensic tools available
- [ ] Recovery procedures tested
- [ ] Post-incident review process

---

## Certificate Management

### Certificate Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Generate  │───▶│   Request   │───▶│   Install   │───▶│   Monitor   │
│     CSR     │    │   Signing   │    │ Certificate │    │   Expiry    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                                                       │
       │                    ┌─────────────┐                   │
       └────────────────────│   Renew     │◀──────────────────┘
                            │ Certificate │
                            └─────────────┘
```

### Auto-Renewal Setup (Let's Encrypt Example)

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d soc.algeria.dz -d www.soc.algeria.dz \
  --api-soc.algeria.dz -d grafana.soc.algeria.dz

# Test renewal
certbot renew --dry-run

# Setup cron job (twice daily)
0 */12 * * * root certbot renew --quiet
```

### Certificate Monitoring Alerts

| Days Until Expiry | Severity | Action Required |
|-------------------|----------|-----------------|
| > 60 days | Info | Normal operation |
| 30-60 days | Warning | Schedule renewal |
| 14-30 days | High | Immediate renewal |
| < 14 days | Critical | Emergency renewal |
| Expired | Critical | Service disruption risk |

---

## Incident Response Procedures

### Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|------------|---------------|------------|
| P1 - Critical | Active breach, data exfiltration | 15 minutes | CISO, Legal, PR |
| P2 - High | Confirmed compromise, limited impact | 1 hour | Security Lead |
| P3 - Medium | Suspicious activity, investigation needed | 4 hours | Analyst Team |
| P4 - Low | Policy violation, minor issue | 24 hours | Assigned Analyst |

### Response Workflow

```
Detection → Triage → Containment → Eradication → Recovery → Lessons Learned
    │          │         │            │           │              │
    ▼          ▼         ▼            ▼           ▼              ▼
  [Alert]  [Assess]  [Isolate]   [Remove]   [Restore]    [Report]
```

### Key Contacts (Template)

| Role | Name | Phone | Email |
|------|------|-------|-------|
| CISO | TBD | +213 XXX XXX XXX | ciso@soc.algeria.dz |
| Security Lead | TBD | +213 XXX XXX XXX | sec-lead@soc.algeria.dz |
| On-Call Engineer | Rotating | +213 XXX XXX XXX | oncall@soc.algeria.dz |
| Legal Counsel | TBD | +213 XXX XXX XXX | legal@gov.dz |

---

## Compliance Mapping

### CIS Controls v8 Coverage

| Control ID | Control Name | Implementation | Status |
|------------|--------------|----------------|--------|
| CIS 01 | Inventory of Enterprise Assets | CMDB integration | ✅ Implemented |
| CIS 02 | Inventory of Software Assets | Package management | ✅ Implemented |
| CIS 03 | Data Protection | Encryption at rest/transit | ✅ Implemented |
| CIS 04 | Secure Configuration | Hardening configs | ✅ Implemented |
| CIS 05 | Account Management | IAM system | ✅ Implemented |
| CIS 06 | Access Control | RBAC implementation | ✅ Implemented |
| CIS 07 | Continuous Vulnerability Management | Scanning pipeline | ✅ Implemented |
| CIS 08 | Audit Log Management | Centralized logging | ✅ Implemented |
| CIS 09 | Email and Web Browser Protections | Security headers | ✅ Implemented |
| CIS 10 | Malware Defenses | EDR integration | 🔄 In Progress |

### NIST Cybersecurity Framework

| Function | Category | Implementation |
|----------|----------|----------------|
| Identify | Asset Management | CMDB, Discovery |
| Identify | Risk Assessment | Regular assessments |
| Protect | Identity MFA | Enforced platform-wide |
| Protect | Data Security | Encryption, DLP |
| Detect | Anomaly Detection | SIEM, IDS/IPS |
| Respond | Response Planning | Playbooks defined |
| Recover | Recovery Procedures | Backups tested |

### ISO 27001:2022 Controls

| Annex A Control | Description | Evidence Location |
|-----------------|-------------|------------------|
| A.5.1-5.3 | Leadership & Policies | Policy documents |
| A.6.1-6.3 | HR Security | Training records |
| A.8.1-8.2 | Asset Management | CMDB |
| A.9.1-9.4 | Access Control | IAM system |
| A.10.1 | Cryptographic controls | Key management |
| A.12.1-12.6 | Operations security | Runbooks, configs |
| A.13.1-13.2 | Communications security | TLS configs |
| A.14.1-14.3 | System acquisition | SDLC docs |
| A.15.1-15.2 | Supplier relationships | Vendor assessments |
| A.16.1-17.2 | IR, BC, Compliance | IR plans, audits |

---

## Penetration Testing Guidelines

### Scope

| Target | In Scope | Out of Scope |
|--------|----------|--------------|
| Web Application | *.soc.algeria.dz | Third-party APIs |
| API Endpoints | /api/* | Legacy systems |
| Infrastructure | Production DMZ | Internal networks |
| Mobile Apps | SOC mobile client | App store infrastructure |

### Rules of Engagement

1. **Testing Window**: Pre-approved dates/times only
2. **Tools**: Approved pentest tools only
3. **Data**: Do not exfiltrate any data
4. **Impact**: Stop immediately if service degradation detected
5. **Reporting**: All findings to designated contact only
6. **Storage**: Delete all testing artifacts after engagement

### Reporting Template

```markdown
## Executive Summary
- Overall Risk Rating: [Critical/High/Medium/Low]
- Total Findings: X (Y Critical, Z High)
- Key Recommendations: [...]

## Findings Summary
| ID | Title | Severity | CVSS | Status |
|----|-------|----------|------|--------|

## Detailed Findings
### [Finding ID]: [Title]
- **Severity**: ...
- **CVSS Score**: ...
- **Description**: ...
- **Proof of Concept**: ...
- **Remediation**: ...
- **References**: ...

## Appendix
- Raw output files
- Screenshots
- Tool configurations
```

---

## Troubleshooting

### Common Issues

#### Certificate Errors

**Problem**: `NET::ERR_CERT_COMMON_NAME_INVALID`
```
Solution:
1. Verify SAN includes all required domains
2. Check certificate chain is complete
3. Ensure intermediate certs are installed
```

**Problem**: Certificate not trusted by browsers
```
Solution:
1. Verify CA is in browser trust store
2. Check certificate transparency logs
3. Validate chain order
```

#### TLS Configuration

**Problem**: Weak cipher suites accepted
```
Solution:
1. Update tls-params.conf
2. Remove weak ciphers from ssl_ciphers directive
3. Reload nginx: nginx -t && systemctl reload nginx
4. Test with: openssl s_client -connect host:443
```

**Problem**: HSTS not working
```
Solution:
1. Ensure site loads over HTTPS first
2. Check max-age value (minimum 15768000)
3. Verify no HTTPS downgrade redirects
4. Clear browser cache before testing
```

#### Security Headers

**Problem**: CSP blocking legitimate resources
```
Solution:
1. Enable CSP report-only mode first
2. Review CSP violation reports
3. Add missing domains to appropriate directives
4. Consider using nonces for scripts
```

#### Performance Impact

**Problem**: Security measures causing slowdown
```
Solution:
1. Profile with/without security headers
2. Optimize OCSP stapling resolver
3. Adjust session cache size
4. Consider hardware acceleration for crypto
```

### Debug Commands

```bash
# Check TLS configuration
openssl s_client -connect soc.algeria.dz:443 -tls1_2

# Test security headers
curl -I https://soc.algeria.dz

# Verify certificate chain
openssl crl2pkcs7 -nocrl -certfile fullchain.pem | openssl pkcs7 -print_certs -noout

# Test CSP (browser console)
# Open DevTools > Console > look for CSP errors

# Check rate limiting
for i in {1..150}; do curl -s https://api.soc.algeria.dz/test > /dev/null; done
```

### Getting Help

For issues specific to this module:
1. Check this README documentation
2. Review code comments and JSDoc
3. Check GitHub Issues for known problems
4. Contact: security-team@soc.algeria.dz

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial release - Complete security module |

---

## License

© National SOC Platform Algeria 2026-2030

This module is part of the open-source National SOC Platform initiative.
All security implementations follow industry best practices and are designed
for production deployment in national cybersecurity operations centers.
