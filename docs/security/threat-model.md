# Djezzy National SOC Platform - STRIDE Threat Model

**Document Classification:** CONFIDENTIAL  
**Version:** 1.0  
**Last Updated:** 2024-01-15  
**Framework:** STRIDE (Microsoft) + DREAD Risk Assessment

---

## Executive Summary

This threat model document identifies and assesses potential security threats to the Djezzy National Security Operations Center (SOC) Platform. The analysis uses the **STRIDE methodology** (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) combined with **DREAD risk scoring** to prioritize mitigation efforts.

### Key Findings Summary

| Threat Category | High Risk Threats | Mitigation Priority |
|-----------------|-------------------|---------------------|
| Spoofing | 2 | HIGH |
| Tampering | 3 | CRITICAL |
| Repudiation | 2 | MEDIUM |
| Information Disclosure | 4 | CRITICAL |
| Denial of Service | 3 | HIGH |
| Elevation of Privilege | 4 | CRITICAL |

---

## 1. System Overview & Trust Boundaries

### 1.1 Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL ZONE (Internet)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Analysts   │  │   Engineers  │  │    Admins    │                      │
│  │  (Browser)   │  │  (Browser)   │  │  (Browser)   │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│         │                 │                 │                               │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DMZ ZONE                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        LOAD BALANCER / WAF                           │   │
│  │                    (TLS Termination Point)                           │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                       API GATEWAY                                    │   │
│  │              (Rate Limiting, Auth Validation)                        │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTERNAL ZONE (Kubernetes Cluster)                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     FRONTEND (Next.js)                               │   │
│  │                  (Static Content, SPA)                              │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────▼──────────────────────────────────────┐   │
│  │                    AUTH SERVICE                                      │   │
│  │           (SSO, MFA, Session Management)                             │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                 │
│         ▼                       ▼                       ▼                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐            │
│  │ SIEM Backend │      │Alert Manager │      │Threat Intel  │            │
│  │(Elasticsearch│      │              │      │    Feed      │            │
│  │ /TimescaleDB)│      └──────────────┘      └──────────────┘            │
│  └──────┬───────┘                                                       │
│         │                                                                │
│  ┌──────▼───────┐                                                        │
│  │   Database   │                                                        │
│  │   Cluster    │                                                        │
│  └──────────────┘                                                        │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                         TRUST BOUNDARY                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagram (Simplified)

```
[User] --HTTPS--> [WAF] --> [API Gateway] --> [Auth Check] --> [Service] --> [DB]
                                          |                |
                                          v                v
                                   [Audit Log]       [SIEM Index]
```

### 1.3 Trust Boundaries

| Boundary | Description | Protection Mechanisms |
|----------|-------------|----------------------|
| External → DMZ | Internet to Load Balancer | TLS 1.3, WAF, Geo-blocking |
| DMZ → Internal | API Gateway to Services | mTLS, Network Policies, RBAC |
| Service → Service | Inter-service communication | Service mesh, mTLS, Zero-trust |
| Application → Data | App to Database | Encrypted connections, Column encryption |
| User → Session | Authentication boundary | SSO, MFA, Secure session tokens |

---

## 2. STRIDE Threat Analysis

### 2.1 SPOOFING (Identity Spoofing)

#### THREAT S-001: Attacker Impersonates Legitimate User

| Attribute | Value |
|-----------|-------|
| **ID** | SPOOF-001 |
| **Title** | User Identity Spoofing via Stolen Credentials |
| **Description** | An attacker obtains valid user credentials through phishing, credential stuffing, or breach reuse to impersonate a legitimate SOC analyst or administrator. |
| **Target** | Authentication endpoints, SSO integration points |
| **Attack Vector** | Network, Human |
| **Threat Agent** | External attacker, Insider |

**DREAD Score:**
| Factor | Score (1-10) | Rationale |
|--------|--------------|-----------|
| Damage | 8 | Full access to sensitive security operations |
| Reproducibility | 7 | Automated tools available |
| Exploitability | 8 | Credential theft is well-documented |
| Affected Users | 6 | All authenticated users at risk |
| Discoverability | 5 | Requires obtaining credentials first |
| **TOTAL** | **34/50** | **HIGH RISK** |

**Mitigations:**
- ✅ Multi-Factor Authentication (MFA) mandatory for all users
- ✅ SSO integration with corporate identity provider
- ✅ Password complexity requirements with breach detection
- ✅ Account lockout after failed attempts
- ✅ Session timeout and re-authentication for sensitive actions
- ✅ Device fingerprinting and anomaly detection
- ⏳ Behavioral analytics for login patterns (Roadmap Q2)

---

#### THREAT S-002: Attacker Spoofs API/Service Identity

| Attribute | Value |
|-----------|-------|
| **ID** | SPOOF-002 |
| **Title** | Service Identity Spoofing in Cluster |
| **Description** | An attacker with network access spoofs a legitimate service identity to intercept or manipulate inter-service communication. |
| **Target** | Kubernetes service identities, mTLS certificates |
| **Attack Vector** | Internal network |
| **Threat Agent** | Compromised insider, Lateral movement from compromised pod |

**DREAD Score:** 28/50 - **MEDIUM RISK**

**Mitigations:**
- ✅ Mutual TLS (mTLS) for all service-to-service communication
- ✅ Certificate rotation policy (90 days)
- ✅ SPIFFE/SPIRE for workload identity
- ✅ Network policies restricting pod communication
- ✅ Service mesh (Istio/Linkerd) enforcement

---

### 2.2 TAMPERING (Data Tampering)

#### THREAT T-001: Modification of Security Alerts/Incidents

| Attribute | Value |
|-----------|-------|
| **ID** | TAMP-001 |
| **Title** | Alert/Incident Data Tampering |
| **Description** | An attacker modifies security alerts to hide malicious activity or creates false alerts to distract analysts. |
| **Target** | SIEM database, Alert Manager state |
| **Attack Vector** | Privileged access, SQL injection, API exploitation |
| **Threat Agent** | External attacker (elevated), Malicious insider |

**DREAD Score:**
| Factor | Score (1-10) | Rationale |
|--------|--------------|-----------|
| Damage | 9 | Could hide real attacks, cause misresponse |
| Reproducibility | 7 | Once access obtained, trivially reproducible |
| Exploitability | 6 | Requires elevated privileges |
| Affected Users | 9 | All SOC operations affected |
| Discoverability | 4 | May go undetected without integrity checks |
| **TOTAL** | **35/50** | **HIGH RISK** |

**Mitigations:**
- ✅ Write-once audit trail for all alert modifications
- ✅ Cryptographic hash chains for log integrity
- ✅ Role-based access control with least privilege
- ✅ Change detection and alerting on critical fields
- ✅ Immutable storage (WORM) for original alerts
- ✅ Digital signatures on incident updates

---

#### THREAT T-002: Configuration Tampering

| Attribute | Value |
|-----------|-------|
| **ID** | TAMP-002 |
| **Title** | System Configuration Tampering |
| **Description** | Attacker modifies system configurations to weaken security controls, disable logging, or create backdoors. |
| **Target** | Kubernetes configs, application settings, WAF rules |
| **Attack Vector** | Admin console, Config files, API |
| **Threat Agent** | Compromised admin account, Supply chain |

**DREAD Score:** 33/50 - **HIGH RISK**

**Mitigations:**
- ✅ GitOps workflow with signed commits
- ✅ Configuration drift detection
- ✅ Change approval workflow for production
- ✅ Backup and rollback capability
- ✅ Configuration encryption at rest

---

#### THREAT T-003: API Request Tampering

| Attribute | Value |
|-----------|-------|
| **ID** | TAMP-003 |
| **Title** | API Parameter Manipulation |
| **Description** | Attacker manipulates API request parameters to bypass business logic, escalate privileges, or access unauthorized data. |
| **Target** | All API endpoints |
| **Attack Vector** | Client-side manipulation, MITM (if TLS bypassed) |
| **Threat Agent** | Authenticated user, External attacker |

**DREAD Score:** 31/50 - **HIGH RISK**

**Mitigations:**
- ✅ Server-side validation for all inputs
- ✅ Input sanitization library implemented
- ✅ Type-safe API contracts (OpenAPI/Zod)
- ✅ HMAC signing for sensitive operations
- ✅ Rate limiting per endpoint type

---

### 2.3 REPUDIATION (Non-repudiation)

#### THREAT R-001: User Denies Action

| Attribute | Value |
|-----------|-------|
| **ID** | REPU-001 |
| **Title** | Action Repudiation by Users/Administrators |
| **Description** | A user performs an action (data deletion, config change, alert dismissal) and later denies having done so. |
| **Target** | Audit logs, User activity records |
| **Attack Vector** | Claiming account compromise, system error |
| **Threat Agent** | Any authenticated user (including admins) |

**DREAD Score:** 24/50 - **MEDIUM RISK**

**Mitigations:**
- ✅ Comprehensive audit logging for all actions
- ✅ Strong authentication binding (MFA at time of action)
- ✅ Immutable audit logs (WORM storage)
- ✅ Digital signatures on critical actions
- ✅ Session recording for administrative actions
- ✅ ANRT-compliant 5-year retention

---

#### THREAT R-002: System Log Repudiation

| Attribute | Value |
|-----------|-------|
| **ID** | REPU-002 |
| **Title** | Log Integrity Compromise |
| **Description** | Attacker modifies or deletes logs to cover tracks, making it impossible to prove what occurred. |
| **Target** | Centralized logging infrastructure |
| **Attack Vector** | Log server compromise, Log injection |
| **Threat Agent** | Privileged insider, Advanced persistent threat |

**DREAD Score:** 27/50 - **MEDIUM RISK**

**Mitigations:**
- ✅ Hash chain integrity verification
- ✅ Real-time log forwarding to SIEM
- ✅ Write-once storage media
- ✅ Log access auditing
- ✅ Separate log management plane

---

### 2.4 INFORMATION DISCLOSURE

#### THREAT I-001: IMSI/MSISDN Exposure (ANRT Critical)

| Attribute | Value |
|-----------|-------|
| **ID** | INFO-001 |
| **Title** | Subscriber Identity Information Leakage |
| **Description** | IMSI (International Mobile Subscriber Identity) or MSISDN (phone number) data is exposed through APIs, logs, exports, or UI, violating ANRT regulations. |
| **Target** | All systems handling subscriber data |
| **Attack Vector** | API response, Log file, Export function, Screen scrape |
| **Threat Agent** | Any party receiving data |

**DREAD Score:**
| Factor | Score (1-10) | Rationale |
|--------|--------------|-----------|
| Damage | 10 | Regulatory fines, license revocation, reputational damage |
| Reproducibility | 9 | Multiple potential exposure vectors |
| Exploitability | 8 | May be exposed through multiple interfaces |
| Affected Users | 9 | All subscribers potentially affected |
| Discoverability | 7 | Audits, automated scanning can detect |
| **TOTAL** | **43/50** | **CRITICAL RISK** |

**Mitigations:**
- ✅ Mandatory masking in all outputs (API, UI, exports)
- ✅ Input validation library with IMSI/MSISDN masking functions
- ✅ PII detection in logs with automatic redaction
- ✅ Access control for raw data viewing
- ✅ Export functionality enforces masking
- ✅ Regular privacy audits
- ✅ Data classification enforcement

---

#### THREAT I-002: Sensitive Security Data Exposure

| Attribute | Value |
|-----------|-------|
| **ID** | INFO-002 |
| **Title** | Security Operations Data Leak |
| **Description** | Confidential security information (threat intel, investigation details, vulnerability data) is disclosed to unauthorized parties. |
| **Target** | SIEM data, Incident reports, Threat intelligence |
| **Attack Vector** | Data export, Unauthorized access, Misconfigured permissions |
| **Threat Agent** | Insider, External attacker with access |

**DREAD Score:** 38/50 - **CRITICAL RISK**

**Mitigations:**
- ✅ Role-based data access controls
- ✅ Data classification labels enforced
- ✅ Encryption at rest (AES-256-GCM)
- ✅ Encryption in transit (TLS 1.3)
- ✅ DLP controls on export channels
- ✅ Watermarking on exported documents

---

#### THREAT I-003: Error Message Information Disclosure

| Attribute | Value |
|-----------|-------|
| **ID** | INFO-003 |
| **Title** | Technical Details in Error Messages |
| **Description** | Error messages reveal stack traces, database details, internal paths, or version information useful to attackers. |
| **Target** | All user-facing error responses |
| **Attack Vector** | Triggering error conditions |
| **Threat Agent** | Anyone who can interact with the system |

**DREAD Score:** 26/50 - **MEDIUM RISK**

**Mitigations:**
- ✅ Generic error messages to end users
- ✅ Detailed errors only in secure logs
- ✅ Custom error pages configured
- ✅ Stack trace disabled in production
- ✅ No framework/version headers

---

#### THREAT I-004: Cross-Site Data Access

| Attribute | Value |
|-----------|-------|
| **ID** | INFO-004 |
| **Title** | IDOR Leading to Cross-Tenant/User Data Access |
| **Description** | Insecure Direct Object Reference allows users to access other users' dashboards, alerts, or incidents. |
| **Target** | API endpoints with resource IDs |
| **Attack Vector** | Sequential/guessable ID enumeration |
| **Threat Agent** | Authenticated user |

**DREAD Score:** 32/50 - **HIGH RISK**

**Mitigations:**
- ✅ UUIDs instead of sequential IDs
- ✅ Authorization check on every resource access
- ✅ Ownership validation before data return
- ✅ Access control middleware

---

### 2.5 DENIAL OF SERVICE (DoS)

#### THREAT D-001: API Endpoint Exhaustion

| Attribute | Value |
|-----------|-------|
| **ID** | DENY-001 |
| **Title** | Resource Exhaustion via API Abuse |
| **Description** | Attacker overwhelms API endpoints with legitimate-looking requests, exhausting server resources and denying service to legitimate users. |
| **Target** | All public API endpoints, especially search/export |
| **Attack Vector** | High-volume requests, Expensive queries |
| **Threat Agent** | External attacker, Competitor |

**DREAD Score:**
| Factor | Score (1-10) | Rationale |
|--------|--------------|-----------|
| Damage | 7 | SOC operations impaired during attack |
| Reproducibility | 9 | Easy to automate |
| Exploitability | 8 | Simple HTTP flood |
| Affected Users | 8 | All platform users |
| Discoverability | 3 | Hard to distinguish from high load |
| **TOTAL** | **35/50** | **HIGH RISK** |

**Mitigations:**
- ✅ Distributed rate limiting (Redis-backed)
- ✅ Per-user, per-endpoint rate limits
- ✅ Query complexity limits (time range, result count)
- ✅ Auto-scaling for traffic spikes
- ✅ WAF with DoS protection layer
- ✅ CDN caching for static content
- ⏳ DDoS mitigation service (Roadmap Q2)

---

#### THREAT D-002: Database Exhaustion

| Attribute | Value |
|-----------|-------|
| **ID** | DENY-002 |
| **Title** | SIEM Query Overload |
| **Description** | Expensive SIEM queries (large time ranges, full-text searches) consume excessive database resources. |
| **Target** | TimescaleDB/Elasticsearch cluster |
| **Attack Vector** | Search API abuse |
| **Threat Agent** | Authenticated user (abuse), Attacker with credentials |

**DREAD Score:** 30/50 - **HIGH RISK**

**Mitigations:**
- ✅ Query timeout enforcement
- ✅ Maximum time range restrictions
- ✅ Result set size limits
- ✅ Query queue prioritization
- ✅ Resource quotas per user role
- ✅ Read replicas for search workloads

---

#### THREAT D-003: WebSocket Connection Flood

| Attribute | Value |
|-----------|-------|
| **ID** | DENY-003 |
| **Title** | Real-time Stream Connection Exhaustion |
| **Description** | Attacker opens excessive WebSocket connections to the real-time alert stream, exhausting connection limits. |
| **Target** | SIEM streaming endpoint |
| **Attack Vector** | Multiple WebSocket handshakes |
| **Threat Agent** | External attacker |

**DREAD Score:** 28/50 - **MEDIUM RISK**

**Mitigations:**
- ✅ Concurrent connection limit per user
- ✅ Connection authentication required
- ✅ Heartbeat timeout for stale connections
- ✅ Maximum message size/rate per connection
- ✅ Connection rate limiting

---

### 2.6 ELEVATION OF PRIVILEGE

#### THREAT E-001: Vertical Privilege Escalation

| Attribute | Value |
|-----------|-------|
| **ID** | ELEV-001 |
| **Title** | Regular User Gains Administrative Access |
| **Description** | A standard analyst user exploits vulnerabilities to gain administrator privileges within the SOC platform. |
| **Target** | Role assignment, Permission checks, Admin APIs |
| **Attack Vector** | API exploitation, Session token manipulation, RBAC bypass |
| **Threat Agent** | Malicious insider, External attacker with any user access |

**DREAD Score:**
| Factor | Score (1-10) | Rationale |
|--------|--------------|-----------|
| Damage | 10 | Complete platform compromise possible |
| Reproducibility | 6 | Depends on specific vulnerability |
| Exploitability | 7 | Multiple potential vectors |
| Affected Users | 10 | Entire organization affected |
| Discoverability | 5 | May be stealthy if logs not monitored |
| **TOTAL** | **38/50** | **CRITICAL RISK** |

**Mitigations:**
- ✅ Principle of least privilege enforced
- ✅ Role-based access control with explicit grants
- ✅ Admin actions require additional MFA
- ✅ Privilege change audit alerts
- ✅ Regular access reviews
- ✅ Separation of duties for sensitive operations
- ✅ JWT token validation with proper scope claims

---

#### THREAT E-002: Horizontal Privilege Escalation

| Attribute | Value |
|-----------|-------|
| **ID** | ELEV-002 |
| **Title** | User Accesses Another User's Data |
| **Description** | A user accesses another user's incidents, dashboards, or settings through IDOR or session fixation. |
| **Target** | User-scoped resources |
| **Attack Vector** | ID manipulation, Session hijacking |
| **Threat Agent** | Authenticated user |

**DREAD Score:** 29/50 - **MEDIUM-HIGH RISK**

**Mitigations:**
- ✅ UUID-based resource identifiers
- ✅ Ownership verification on every access
- ✅ Strict session management
- ✅ SameSite cookie attributes
- ✅ CSRF protection on state-changing operations

---

#### THREAT E-003: Kubernetes Pod Escalation

| Attribute | Value |
|-----------|-------|
| **ID** | ELEV-003 |
| **Title** | Container Escape to Cluster Admin |
| **Description** | Attacker escapes a compromised container/pod to gain cluster-level privileges. |
| **Target** | Kubernetes API, Node access |
| **Attack Vector** | Vulnerable container image, Mounted secrets, HostPath volumes |
| **Threat Agent** | External attacker, Compromised service account |

**DREAD Score:** 36/50 - **HIGH RISK**

**Mitigations:**
- ✅ Pod Security Standards (Restricted profile)
- ✅ No containers running as root
- ✅ Read-only root filesystem
- ✅ Minimal capabilities (drop ALL)
- ✅ No host networking/PID/IPC
- ✅ Secrets mounted as read-only volumes
- ✅ Network segmentation via Network Policies
- ✅ Regular image vulnerability scanning

---

## 3. Threat Summary Matrix

| ID | Threat Title | Category | DREAD Score | Risk Level | Priority |
|----|-------------|----------|-------------|------------|----------|
| INFO-001 | IMSI/MSISDN Exposure | Information Disclosure | 43 | **CRITICAL** | P0 |
| ELEV-001 | Vertical Privilege Escalation | Elevation of Privilege | 38 | **CRITICAL** | P0 |
| INFO-002 | Security Data Leak | Information Disclosure | 38 | **CRITICAL** | P0 |
| TAMP-001 | Alert/Incident Tampering | Tampering | 35 | **HIGH** | P1 |
| DENY-001 | API Resource Exhaustion | Denial of Service | 35 | **HIGH** | P1 |
| SPOOF-001 | User Identity Spoofing | Spoofing | 34 | **HIGH** | P1 |
| ELEV-003 | K8s Pod Escalation | Elevation of Privilege | 36 | **HIGH** | P1 |
| TAMP-003 | API Request Tampering | Tampering | 31 | **HIGH** | P1 |
| INFO-004 | IDOR Cross-User Access | Information Disclosure | 32 | **HIGH** | P1 |
| TAMP-002 | Configuration Tampering | Tampering | 33 | **HIGH** | P1 |
| DENY-002 | Database Query Overload | Denial of Service | 30 | **HIGH** | P1 |
| ELEV-002 | Horizontal Privilege Escalation | Elevation of Privilege | 29 | **MEDIUM** | P2 |
| INFO-003 | Error Info Disclosure | Information Disclosure | 26 | **MEDIUM** | P2 |
| R-002 | Log Integrity Compromise | Repudiation | 27 | **MEDIUM** | P2 |
| DENY-003 | WebSocket Flood | Denial of Service | 28 | **MEDIUM** | P2 |
| SPOOF-002 | Service Identity Spoofing | Spoofing | 28 | **MEDIUM** | P2 |
| R-001 | User Action Repudiation | Repudiation | 24 | **LOW** | P3 |

---

## 4. Mitigation Status Tracking

### Implemented Controls

| Control ID | Control Description | Threats Addressed | Implementation Status |
|------------|--------------------|-------------------|----------------------|
| CTL-001 | Multi-Factor Authentication | SPOOF-001, ELEV-001 | ✅ Implemented |
| CTL-002 | Role-Based Access Control | ELEV-001, ELEV-002, INFO-004 | ✅ Implemented |
| CTL-003 | Input Validation Library | TAMP-003, INFO-003 | ✅ Implemented |
| CTL-004 | IMSI/MSISDN Masking | INFO-001 | ✅ Implemented |
| CTL-005 | Rate Limiting (Redis) | DENY-001, DENY-002, DENY-003 | ✅ Implemented |
| CTL-006 | Audit Logging (Immutable) | R-001, R-002, TAMP-001 | ✅ Implemented |
| CTL-007 | Security Headers/CSP | TAMP-003, INFO-003 | ✅ Implemented |
| CTL-008 | mTLS Service Mesh | SPOOF-002 | ✅ Implemented |
| CTL-009 | Pod Security Standards | ELEV-003 | ✅ Implemented |
| CTL-010 | Network Policies (Zero Trust) | ELEV-003, INFO-002 | ✅ Implemented |
| CTL-011 | WAF Rules (OWASP CRS) | TAMP-003, DENY-001 | ✅ Implemented |
| CTL-012 | Encryption at Rest (AES-256) | INFO-002 | ✅ Implemented |
| CTL-013 | TLS 1.3 Enforcement | SPOOF-001, TAMP-003 | ✅ Implemented |
| CTL-014 | Change Approval Workflow | TAMP-002, R-001 | 🔄 In Progress |
| CTL-015 | Behavioral Analytics | SPOOF-001, ELEV-001 | ⏳ Planned Q2 |

---

## 5. Residual Risk Acceptance

After implementing identified mitigations, the following residual risks are accepted:

| Residual Risk | Current Level | Accepted By | Date | Review Date |
|---------------|---------------|-------------|------|-------------|
| Sophisticated APT with valid credentials | Medium | CISO | 2024-01-15 | 2024-07-15 |
| Zero-day exploitation | Low-Medium | CISO | 2024-01-15 | 2024-04-15 |
| Insider threat (privileged admin) | Medium | CEO/CISO | 2024-01-15 | Quarterly |

---

## 6. Review Schedule

| Review Type | Frequency | Last Review | Next Review | Owner |
|-------------|-----------|-------------|-------------|-------|
| Full Threat Model Review | Annual | 2024-01-15 | 2025-01-15 | Security Architect |
| Post-Incident Update | After each major incident | As needed | N/A | Incident Commander |
| Architecture Change Trigger | On significant changes | As needed | N/A | Security Team |
| Control Effectiveness | Quarterly | 2024-01-01 | 2024-04-01 | GRC Team |

---

**Document Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Security Architect** | | | |
| **CISO** | | | |
| **CTO** | | | |
