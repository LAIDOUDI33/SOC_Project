# Djezzy National SOC Platform - Data Classification Scheme

**Document Classification:** INTERNAL  
**Version:** 1.0  
**Effective Date:** 2024-01-15  
**Regulatory Framework:** ANRT Telecommunications Security Regulations, Algerian Cybersecurity Law 18-07

---

## 1. Purpose and Scope

### 1.1 Purpose

This document establishes the official data classification scheme for the Djezzy National Security Operations Center (SOC) Platform. It defines:

- Four classification levels with clear criteria
- Handling requirements for each level
- Specific examples relevant to telecommunications SOC operations
- Compliance obligations under ANRT regulations

### 1.2 Scope

This classification applies to:
- All data processed, stored, or transmitted by the SOC platform
- Data created by or imported into the system
- Third-party data received (threat intelligence, etc.)
- Logs, reports, and analytical outputs
- Metadata and configuration data

### 1.3 Legal and Regulatory Basis

| Regulation | Requirement | Relevance |
|------------|-------------|-----------|
| **ANRT Telecom Security Regulations** | Data localization, subscriber protection | Primary driver |
| **Algerian Law 18-07 (Cybersecurity)** | Critical infrastructure protection | Legal basis |
| **GDPR Principles** (for EU citizens) | Privacy protection | International compliance |
| **NIST SP 800-53** | Security controls framework | Best practice reference |
| **ISO 27001:2022** | Information security management | Certification alignment |

---

## 2. Classification Levels

### 2.1 Classification Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        RESTRICTED                                │
│     (Highest Sensitivity - Severe consequences if leaked)        │
│     Examples: Raw IMSI, Decrypted communications, Keys          │
├─────────────────────────────────────────────────────────────────┤
│                      CONFIDENTIAL                                │
│     (High Sensitivity - Significant organizational impact)        │
│     Examples: Incident details, Threat intel, Investigation data │
├─────────────────────────────────────────────────────────────────┤
│                        INTERNAL                                  │
│     (Moderate Sensitivity - Internal use only)                   │
│     Examples: Operational metrics, General logs, Procedures     │
├─────────────────────────────────────────────────────────────────┤
│                          PUBLIC                                  │
│     (No Sensitivity - Approved for external release)             │
│     Examples: Published reports, Marketing materials            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Level Definitions

#### PUBLIC

| Attribute | Definition |
|-----------|------------|
| **Definition** | Information approved for public release without restriction |
| **Impact if Leaked** | None - already intended for public consumption |
| **Ownership** | Communications/Marketing with Security review |
| **Examples** | Public security advisories, Published white papers, Marketing materials about SOC capabilities, Public-facing documentation |

**Handling Requirements:**
- ✅ Can be shared externally without restriction
- ✅ May be stored on any approved system
- ✅ No encryption required for transmission
- ✅ No special access controls needed
- ⚠️ Must still be reviewed by Communications before publishing

---

#### INTERNAL

| Attribute | Definition |
|-----------|------------|
| **Definition** | Information intended for use within Djezzy employees and authorized contractors only |
| **Impact if Leaked** | Moderate - could provide operational intelligence to competitors or attackers |
| **Ownership** | Business unit that created the information |
| **Examples** | Internal procedures and runbooks, Aggregated operational statistics (non-sensitive), General system architecture diagrams (sanitized), Training materials, Meeting minutes (non-strategic), Performance metrics (non-customer specific) |

**Handling Requirements:**
- ❌ Not for external disclosure without approval
- ✅ Access limited to Djezzy employees and authorized contractors
- ✅ Standard password protection for documents
- ✅ TLS required for transmission over networks
- ✅ Store on corporate-approved systems only
- ⚠️ Mark documents with "INTERNAL - Djezzy Confidential" header/footer
- 🔒 Retention: 3 years default

---

#### CONFIDENTIAL

| Attribute | Definition |
|-----------|------------|
| **Definition** | Sensitive information whose unauthorized disclosure could cause significant harm to Djezzy, customers, or partners |
| **Impact if Leaked** | High - Financial loss, regulatory penalties, competitive disadvantage, reputational damage |
| **Ownership** | Data owner designated per domain |
| **Examples** | **Security Incidents (details)**, **Threat Intelligence feeds**, **Vulnerability assessments**, **Security configuration details**, **Audit logs (containing operational details)**, **Employee/user personal data (PII)**, **Business continuity plans**, **Vendor/supplier confidential information**, **Contract terms and pricing** |

**Handling Requirements:**
- ❌ Strictly prohibited from external disclosure
- ✅ Need-to-know access principle enforced
- ✅ Role-based access controls mandatory
- ✅ AES-256 encryption at rest required
- ✅ TLS 1.3 encryption in transit required
- ✅ Two-person rule for highly sensitive operations
- ✅ Audit logging of all access
- ⚠️ Mark with "CONFIDENTIAL - Djezzy Proprietary"
- 🔒 Retention: 5 years minimum (ANRT requirement)
- 📋 Breach notification required if leaked

---

#### RESTRICTED

| Attribute | Definition |
|-----------|------------|
| **Definition** | Extremely sensitive information requiring the highest level of protection; typically regulated data with legal exposure |
| **Impact if Leaked** | **Critical** - Criminal liability, regulatory fines (up to % revenue), license revocation, national security implications |
| **Ownership** | CISO with Board oversight for exceptions |
| **Examples** | **IMSI (International Mobile Subscriber Identity)**, **MSISDN with subscriber mapping**, **Decrypted lawful intercept data**, **Cryptographic keys and certificates (private)**, **Authentication credentials (passwords, tokens)**, **Source code of security-critical components**, **M&A information**, **Strategic security plans**, **Law enforcement sensitive data** |

**Handling Requirements:**
- ❌ **NEVER** to be disclosed outside specifically authorized individuals
- ✅ Named individual access lists (not just roles)
- ✅ MFA mandatory for all access
- ✅ AES-256-GCM encryption at rest
- ✅ TLS 1.3 with certificate pinning in transit
- ✅ Hardware Security Module (HSM) for key storage where applicable
- ✅ Data Loss Prevention (DLP) controls active
- ✅ Comprehensive audit logging with integrity protection
- ✅ Physical access controls for printed copies
- ✅ Secure deletion required when no longer needed
- ⚠️ Mark with "RESTRICTED - Handle per ANRT Guidelines"
- 🔒 Retention: 7 years (exceeds ANRT 5-year minimum)
- 🚨 Immediate escalation to CISO for any suspected breach
- 📋 **Criminal penalties may apply for mishandling**

---

## 3. Classification Criteria Matrix

### 3.1 Decision Tree

```
START
  │
  ├─► Is this information approved for public release?
  │     └─ YES → PUBLIC
  │     └─ NO  ↓
  │
  ├─► Does this contain subscriber identities (IMSI/MSISDN)?
  │     └─ YES → RESTRICTED
  │     └─ NO  ↓
  │
  ├─► Does this contain cryptographic material or credentials?
  │     └─ YES → RESTRICTED
  │     └─ NO  ↓
  │
  ├─► Would leakage cause regulatory penalty or criminal liability?
  │     └─ YES → RESTRICTED
  │     └─ NO  ↓
  │
  ├─► Would leakage cause significant financial/reputational damage?
  │     └─ YES → CONFIDENTIAL
  │     └─ NO  ↓
  │
  └─► Is this meant for internal Djezzy use only?
        └─ YES → INTERNAL
        └─ NO  → Review needed (escalate to Data Steward)
```

### 3.2 Quick Reference Card

| Question | If YES → Classify as |
|----------|---------------------|
| Is it customer/subscriber PII? | RESTRICTED |
| Is it a password, key, or secret? | RESTRICTED |
| Is it related to lawful intercept? | RESTRICTED |
| Could it cause >$100K damage if leaked? | CONFIDENTIAL |
| Is it a security incident detail? | CONFIDENTIAL |
| Is it vendor confidential? | CONFIDENTIAL |
| Would competitors benefit from this? | CONFIDENTIAL |
| Is it internal procedure/process? | INTERNAL |
| Has Communications approved public release? | PUBLIC |

---

## 4. SOC-Specific Data Classification Guide

### 4.1 Common SOC Data Types

| Data Type | Default Classification | Justification |
|-----------|----------------------|---------------|
| **Raw Security Events** | CONFIDENTIAL | Contains operational details |
| **Aggregated Statistics** | INTERNAL | Non-sensitive summaries |
| **Incident Reports** | CONFIDENTIAL | Investigative details |
| **Public Incident Advisories** | PUBLIC | Sanitized for release |
| **Threat Intel (Commercial)** | CONFIDENTIAL | License restricted |
| **Threat Intel (Government)** | RESTRICTED | Source sensitivity |
| **IOC Lists (Sanitized)** | INTERNAL | Useful but not sensitive |
| **Alert Contents** | CONFIDENTIAL | May contain sensitive data |
| **User Activity Logs** | CONFIDENTIAL | PII, behavioral data |
| **Authentication Logs** | CONFIDENTIAL | Credentials-related |
| **Configuration Backups** | RESTRICTED | Contain secrets |
| **Encryption Keys** | RESTRICTED | Crown jewels |
| **API Keys/Tokens** | RESTRICTED | Access credentials |
| **Network Diagrams (Detailed)** | CONFIDENTIAL | Infrastructure info |
| **Runbooks/Procedures** | INTERNAL | Operational knowledge |
| **Audit Trails** | CONFIDENTIAL | Accountability data |
| **Compliance Reports** | CONFIDENTIAL | Regulatory data |
| **Forensic Images** | RESTRICTED | Potential evidence |
| **Malware Samples** | RESTRICTED | Dangerous goods |

### 4.2 Special Case: Telecom Subscriber Data

Per ANRT regulations, the following are **automatically RESTRICTED**:

| Data Element | Format Example | Masking Required |
|--------------|----------------|------------------|
| **IMSI** | 60301123456789 | Show only last 6 digits: `*******56789` |
| **MSISDN** | +213561123456 | Show only last 4 digits: `*** *** 2345` |
| **IMEI** | 356938035643809 | Full mask: `**************` |
| **Subscriber Name** | Ahmed Benali | Partial: `Ahmed B***` |
| **Subscriber Address** | 123 Rue X, Algiers | Full mask except city |
| **Call Detail Records** | (Complex) | Aggregate/anonymize only |
| **Location Data** | Coordinates | Generalize to governorate level |
| **Traffic Data** | (Complex) | Aggregate/anonymize only |

**Legal Note:** Mishandling of subscriber data can result in:
- Fine up to 5% of annual turnover (ANRT)
- Criminal prosecution under Law 18-07
- Operating license suspension
- Personal liability for responsible executives

---

## 5. Handling Procedures by Classification

### 5.1 Storage Requirements

| Requirement | PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED |
|-------------|--------|----------|--------------|-----------|
| **Encryption at Rest** | Optional | Recommended | **Required (AES-256)** | **Required (AES-256-GCM)** |
| **Access Controls** | None | Basic auth | **RBAC + MFA** | **Named ACL + MFA** |
| **Audit Logging** | Optional | Basic | **Full** | **Full + Integrity** |
| **Backup Encryption** | Optional | Yes | **Required** | **Required + Isolated** |
| **Data Location** | Any | Algeria preferred | **Algeria Only** | **Algeria Only (HSM)** |
| **Retention Management** | Standard | Standard | **5+ Years** | **7+ Years** |

### 5.2 Transmission Requirements

| Requirement | PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED |
|-------------|--------|----------|--------------|-----------|
| **Protocol** | HTTPS OK | TLS 1.2+ | **TLS 1.3** | **TLS 1.3 + Pinning** |
| **Email** | Clear OK | Internal only | **Encrypted** | **Encrypted + Password** |
| **Removable Media** | Allowed | **Allowed (encrypted)** | **Prohibited** | **Prohibited** |
| **Print Output** | Allowed | **Watermark** | **Secure Print** | **Prohibited** |
| **Screen Display** | Any | Clean desk | **Privacy filter** | **Secure area** |

### 5.3 Access Provisioning

| Classification | Access Request Process | Approval Authority | Review Frequency |
|----------------|----------------------|-------------------|------------------|
| PUBLIC | Self-service | None | N/A |
| INTERNAL | Manager request | Line manager | Annual |
| CONFIDENTIAL | Formal request + justification | Data owner + Manager | Semi-annual |
| RESTRICTED | Written justification + background check | CISO + Data owner | Quarterly |

### 5.4 Sharing and Disclosure

| Scenario | PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED |
|----------|--------|----------|--------------|-----------|
| **Internal sharing (same team)** | ✅ Free | ✅ Free | ✅ Inform owner | ✅ Explicit approval |
| **Internal sharing (different dept)** | ✅ Free | ✅ Manager ok | ✅ Owner approval | ❌ Exception only |
| **External (partners)** | ✅ Free | ❌ NDA required | ❌ DPA + NDA | ❌ Board approval |
| **External (regulators)** | ✅ Free | ✅ Legal review | ✅ Legal + CISO | ✅ CEO + Legal |
| **External (law enforcement)** | ✅ Free | ✅ Legal required | ✅ Legal + CISO | ✅ Court order + CEO |
| **Cloud processing** | ✅ Any | ✅ Algeria region | ✅ Algeria + DPA | ❌ On-prem only |

---

## 6. Labeling Standards

### 6.1 Document Labeling

All documents must include classification markings:

**Header Format:**
```
╔══════════════════════════════════════════════════════╗
║  CLASSIFICATION: [PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED]
║  OWNER: [Department/Name]
║  CREATED: [Date]
║  REVIEW DATE: [Date]
╚══════════════════════════════════════════════════════╝
```

**Footer Format:**
```
[CLASSIFICATION] - Djezzy Algeria - Document [ID] - Page X of Y
If found, please contact: security@djezzy.dz
```

### 6.2 Electronic Data Labeling

| Data Type | Labeling Method |
|-----------|-----------------|
| Files | Metadata tag + filename prefix |
| Database rows | `classification` column (ENUM) |
| API responses | `X-Data-Classification` header |
| Email | Subject line prefix `[CONFIDENTIAL]` |
| Chat messages | Channel designation |

### 6.3 Visual Classification Markers

| Level | Color Code | Banner Style |
|-------|------------|--------------|
| PUBLIC | Green | Thin green bar |
| INTERNAL | Blue | Blue header band |
| CONFIDENTIAL | Orange | Orange header + footer |
| RESTRICTED | Red | Red border + watermark |

---

## 7. Downclassification and Declassification

### 7.1 Downclassification Process

Data may be downclassified (moved to lower sensitivity) only when:

1. Original sensitivity reason no longer applies
2. Time-based declassification period has elapsed
3. Legal/regulatory hold has expired
4. Formal approval obtained

**Process:**
1. Submit request to Data Owner
2. Provide justification
3. Legal/Compliance review (for CONFIDENTIAL+)
4. CISO approval (for RESTRICTED)
5. Update all instances and metadata
6. Record decision in classification log

### 7.2 Automatic Downclassification Triggers

| Data Type | Initial Class | Downclass To | Trigger |
|-----------|---------------|--------------|---------|
| Active Incident | CONFIDENTIAL | INTERNAL | 90 days post-closure |
| Security Alert | CONFIDENTIAL | INTERNAL | 30 days (no action taken) |
| Threat Intel (Actionable) | CONFIDENTIAL | INTERNAL | IOC older than 1 year |
| Authentication Events | CONFIDENTIAL | INTERNAL | 180 days |

### 7.3 Secure Disposal

| Classification | Disposal Method | Verification |
|----------------|-----------------|--------------|
| PUBLIC | Standard delete | N/A |
| INTERNAL | Secure delete (1-pass) | Spot check |
| CONFIDENTIAL | **NIST 800-88 Purge** | Certificate of destruction |
| RESTRICTED | **NIST 800-88 Destroy** | Witnessed + certified |

---

## 8. Roles and Responsibilities

### 8.1 Data Governance Roles

| Role | Responsibilities |
|------|------------------|
| **Data Owner** | Defines classification, approves access, accountable for data |
| **Data Custodian** | Implements technical controls, manages storage |
| **Data Steward** | Ensures quality, handles classification questions |
| **Security Officer** | Provides guidance, monitors compliance, investigates breaches |
| **All Employees** | Classify data they create, follow handling procedures, report incidents |

### 8.2 Specific Responsibilities for SOC Team

| SOC Role | Classification Responsibility |
|----------|------------------------------|
| **SOC Analyst** | Correctly classify incidents, handle alerts per class |
| **SOC Engineer** | Implement technical controls, manage access |
| **SOC Manager** | Approve access requests, review classifications |
| **SOC Director** | Own CONFIDENTIAL data in SOC domain |
| **CISO** | Own RESTRICTED data, final arbiter |

---

## 9. Compliance and Audit

### 9.1 ANRT Compliance Checklist

| Requirement | Classification Mapping | Control |
|-------------|----------------------|---------|
| Data localization | All classes | Algeria-only storage |
| IMSI/MSISDN protection | RESTRICTED | Mandatory masking |
| 5-year log retention | CONFIDENTIAL+ | Immutable storage |
| Encryption | CONFIDENTIAL+ | AES-256 minimum |
| Access control | CONFIDENTIAL+ | RBAC + MFA |
| Breach notification | RESTRICTED | 72-hour process |
| Audit trail | CONFIDENTIAL+ | Tamper-proof logging |

### 9.2 Classification Audit Procedures

| Audit Type | Frequency | Scope | Method |
|------------|-----------|-------|--------|
| Self-assessment | Monthly | Team's data | Sample review |
| Internal audit | Quarterly | Department | Random sampling |
| External audit | Annual | Enterprise | Full assessment |
| Regulatory inspection | As requested | Per scope | ANRT specified |

### 9.3 Metrics and KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data classified at creation | >95% | Automated scanning |
| Misclassification rate | <2% | Audit findings |
| Classification review currency | 100% < 1 year old | Metadata timestamp |
| Handling procedure compliance | >99% | Spot checks + automation |
| Breach incidents | 0 | Incident tracking |

---

## 10. Training and Awareness

### 10.1 Required Training

| Audience | Training Topic | Frequency | Duration |
|----------|---------------|-----------|----------|
| All employees | Data classification basics | Annual | 30 min |
| New hires | Full classification training | At hire | 60 min |
| SOC team | SOC-specific classification | Quarterly | 45 min |
| Managers | Classification approvals | Annual | 60 min |
| IT staff | Technical implementation | Annual | 90 min |

### 10.2 Quick Reference Materials

- This document (full reference)
- Wallet card summary (distributed to all staff)
- Desktop wallpaper/classification colors
- In-system tooltips and help text
- Classification decision chatbot (planned)

---

## 11. Exceptions and Escalations

### 11.1 Exception Process

When business need requires deviation from standard handling:

1. Document business justification
2. Identify compensating controls
3. Submit to appropriate approver:
   - INTERNAL→PUBLIC: Manager
   - CONFIDENTIAL→INTERNAL: Data Owner
   - RESTRICTED→CONFIDENTIAL: CISO
4. Time-limit the exception (max 90 days)
5. Monitor and review

### 11.2 Escalation Path

```
Team Lead → Manager → Data Owner → Security Officer → CISO → CEO → Board
```

For suspected breaches involving RESTRICTED data:
```
Immediate: CISO + Legal + CEO (within 1 hour)
```

---

## Appendix A: Classification Decision Examples

| Scenario | Classification | Rationale |
|----------|---------------|-----------|
| Report showing "we blocked 1M attacks today" | PUBLIC | Aggregated, non-sensitive |
| Report showing "IP 203.0.113.5 attacked us" | INTERNAL | Specific indicator |
| Report showing "user ahmed.benali@djezzy.dz logged in at 10AM" | RESTRICTED | Links MSISDN to activity |
| List of Djezzy IP ranges | CONFIDENTIAL | Infrastructure info |
| Source code of our custom SIEM connector | RESTRICTED | Intellectual property |
| Interview candidate resume | CONFIDENTIAL | PII |
| Published CVE for software we use | PUBLIC | Public knowledge |
| Our patch status for that CVE | CONFIDENTIAL | Attacker-relevant |
| ANRT inspection checklist (blank) | INTERNAL | Procedure |
| ANRT inspection results | CONFIDENTIAL | Regulatory data |

---

## Appendix B: Related Documents

- Djezzy Information Security Policy
- Djezny Acceptable Use Policy
- ANRT Telecommunications Security Guidelines
- Djezzy Data Protection Policy
- Djezzy Incident Response Plan
- Djezzy Vendor Security Assessment Form
- Djezzy Data Processing Agreement Template

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Security Team | Initial release |

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CISO | | | |
| DPO | | | |
| Legal Counsel | | | |
