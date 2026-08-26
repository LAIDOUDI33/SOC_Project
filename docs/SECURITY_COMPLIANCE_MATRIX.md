# National SOC Platform - Security Compliance Matrix
## Djezzy Algeria | Regulatory & Standards Alignment

**Document Version:** 1.0.0  
**Classification:** CONFIDENTIAL - Internal Use Only  
**Last Updated:** 2026-01-20  
**Compliance Owner:** CISO / Security Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [ANOR Regulatory Requirements Mapping](#2-anor-regulatory-requirements-mapping)
3. [ISO 27001 Control Implementation Status](#3-iso-27001-control-implementation-status)
4. [NIST Cybersecurity Framework Alignment](#4-nist-cybersecurity-framework-alignment)
5. [GDPR Data Protection Measures](#5-gdpr-data-protection-measures)
6. [Telecom Security Standards (ETSI/3GPP)](#6-telecom-security-standards-etsi3gpp)
7. [Penetration Testing Schedule](#7-penetration-testing-schedule)
8. [Vulnerability Management Program](#8-vulnerability-management-program)
9. [Third-Party Risk Assessment](#9-third-party-risk-assessment)
10. [Data Classification Policy](#10-data-classification-policy)
11. [Retention and Disposal Policies](#11-retention-and-disposal-policies)

---

## 1. Executive Summary

### 1.1 Purpose
This document provides a comprehensive mapping of security controls implemented in the **National SOC Platform** against major regulatory frameworks and international standards relevant to Djezzy Algeria's telecommunications operations.

### 1.2 Scope
- **Platform:** National SOC Platform (Production Environment)
- **Organization:** Djezzy Algeria (Telecommunications Operator)
- **Regulatory Jurisdiction:** Algeria (ANOR), with EU considerations for data flows

### 1.3 Compliance Frameworks Covered

| Framework | Applicability | Compliance Target |
|-----------|---------------|-------------------|
| ANOR Regulations | Mandatory (Algeria) | Full compliance |
| ISO 27001:2022 | Voluntary / Contractual | Certification target |
| NIST CSF 2.0 | Best Practice | Profile alignment |
| GDPR | Data processing | Article compliance |
| ETSI Telecom Security | Industry standard | Implementation |
| 3GPP Security | Mobile network | Relevant controls |

### 1.4 Overall Compliance Status

| Category | Controls Total | Implemented | In Progress | Not Started | % Complete |
|----------|---------------|-------------|-------------|-------------|------------|
| ANOR Requirements | 45 | 42 | 3 | 0 | 93% |
| ISO 27001 Annex A | 93 | 85 | 6 | 2 | 91% |
| NIST CSF Functions | 108 | 98 | 8 | 2 | 91% |
| GDPR Articles | 25 | 23 | 2 | 0 | 92% |
| ETSI/3GPP | 35 | 32 | 3 | 0 | 91% |

---

## 2. ANOR Regulatory Requirements Mapping

### 2.1 Overview
Autorité Nationale de Régulation Postale et des Communications Électroniques (ANOR) is Algeria's telecommunications regulator. The SOC Platform must comply with ANOR's cybersecurity requirements for telecom operators.

### 2.2 Control Mapping Table

| ANOR Req ID | Requirement Description | Control Implementation | Status | Evidence Location |
|-------------|------------------------|----------------------|--------|-------------------|
| **ANOR-CYBER-01** | Establish CSIRT/SOC capability | National SOC Platform deployed with 24/7 monitoring | ✅ Implemented | Architecture docs |
| **ANOR-CYBER-02** | Incident reporting to ANOR | Automated incident reporting workflow configured | ✅ Implemented | Runbook §9 |
| **ANOR-CYBER-03** | Log retention (minimum 2 years) | Elasticsearch cluster with 2-year hot/warm/cold storage | ✅ Implemented | Infrastructure config |
| **ANOR-CYBER-04** | Real-time threat detection | SIEM integration with Sigma rules, ML anomaly detection | ✅ Implemented | SIEM config |
| **ANOR-CYBER-05** | Network traffic monitoring | Packetbeat + NetworkPolicy logging enabled | ✅ Implemented | Beats config |
| **ANOR-CYBER-06** | Access control and authentication | LDAP/SAML integration, MFA enforced | ✅ Implemented | Auth config |
| **ANOR-CYBER-07** | Encryption of sensitive data | TLS 1.3, AES-256 encryption at rest, RLS implemented | ✅ Implemented | Security hardening docs |
| **ANOR-CYBER-08** | Vulnerability management program | Monthly scanning, 30-day SLA for critical fixes | ✅ Implemented | Vuln management policy |
| **ANOR-CYBER-09** | Penetration testing (annual) | Annual pentest scheduled with licensed provider | 🔄 Scheduled | Pentest contract |
| **ANOR-CYBER-10** | Business continuity planning | DR procedures documented, tested quarterly | ✅ Implemented | DR runbook |
| **ANOR-CYBER-11** | Staff security awareness training | Quarterly training, onboarding security module | ✅ Implemented | Training records |
| **ANOR-CYBER-12** | Third-party risk management | Vendor assessment process, security clauses in contracts | ✅ Implemented | Vendor policy |
| **ANOR-CYBER-13** | Data localization requirements | Primary data storage within Algeria borders | ✅ Implemented | Infrastructure location |
| **ANOR-CYBER-14** | Secure development practices | SAST/DAST in CI/CD, secure coding guidelines | ✅ Implemented | DevSecOps pipeline |
| **ANOR-CYBER-15** | Change management | All changes via ITSM, emergency change procedure | ✅ Implemented | Change policy |

### 2.3 ANOR-Specific Telecom Security Requirements

| Requirement Area | ANOR Reference | Implementation | Gap (if any) |
|------------------|----------------|----------------|--------------|
| Signaling Security (SS7/Diameter) | ANOR-TEL-001 | Monitoring via probes | Additional probes needed |
| Subscriber Data Protection | ANOR-TEL-002 | Access controls, audit logging | None |
| Roaming Security | ANOR-TEL-003 | Fraud detection integrated | N/A (domestic focus) |
| Lawful Interception Capability | ANOR-TEL-004 | LI interface documented | Legal review pending |
| Emergency Services Access | ANOR-TEL-005 | Priority routing configured | Tested quarterly |

---

## 3. ISO 27001 Control Implementation Status

### 3.1 ISO 27001:2022 Annex A Controls

#### Clause 5: Organizational Security (Controls 5.1-5.37)

| Control ID | Control Name | Implementation Status | Evidence |
|------------|-------------|----------------------|----------|
| 5.1 | Policies for information security | ✅ Implemented | ISMS Policy Document v2.0 |
| 5.2 | Information security roles and responsibilities | ✅ Implemented | RACI Matrix |
| 5.3 | Segregation of duties | ✅ Implemented | Role definitions |
| 5.4 | Management responsibilities | ✅ Implemented | Management commitment |
| 5.5 | Contact with authorities | ✅ Implemented | Contact list |
| 5.6 | Contact with special interest groups | ✅ Implemented | Forum memberships |
| 5.7 | Threat intelligence | ✅ Implemented | Threat Intel feeds |
| 8 | Information security in project management | ✅ Implemented | SDLC security gates |
| 9 | Inventory of information and assets | ✅ Implemented | CMDB |
| 10 | Acceptable use of information | ✅ Implemented | AUP Policy |
| 11 | Return of assets | ✅ Implemented | Offboarding checklist |
| 12 | Classification of information | ✅ Implemented | Classification policy |
| 13 | Labelling of information | ✅ Implemented | Labeling scheme |
| 14 | Information transfer | ✅ Implemented | Transfer procedures |
| 15 | Access control policy | ✅ Implemented | Access control policy |
| 16 | Identity management | ✅ Implemented | IAM system |
| 17 | Authentication information | ✅ Implemented | Password policy, MFA |
| 18 | Access rights | ✅ Implemented | RBAC implementation |
| 19 | Information access restriction | ✅ Implemented | Need-to-know basis |
| 20 | Physical access | 🔄 Partial | Data center access logs |
| 21 | Secure development | ✅ Implemented | DevSecOps pipeline |
| 22 | Supplier service security | ✅ Implemented | Vendor assessments |
| 23 | Information security for supplier agreements | ✅ Implemented | Contract templates |
| 24 | Managing supplier service continuity | ✅ Implemented | BCP requirements |
| 25 | Monitoring, logging, reporting | ✅ Implemented | SIEM platform |
| 26 | Information security event reporting | ✅ Implemented | Incident process |
| 27 | Readiness for information security incidents | ✅ Implemented | Playbooks available |
| 28 | Information security incident response | ✅ Implemented | IR procedures |
| 29 | Learning from incidents | ✅ Implemented | PIR process |
| 30 | Collection of evidence | ✅ Implemented | Forensic procedures |
| 31 | Information security during disruption | ✅ Implemented | BCP/DR plans |
| 32 | ICT readiness | ✅ Implemented | DR testing |
| 33 | Protection of information during disruption | ✅ Implemented | Backup encryption |
| 34 | ICT continuity | ✅ Implemented | HA architecture |
| 35 | Network security management | ✅ Implemented | Network segmentation |
| 36 | Security of network services | ✅ Implemented | Hardened configs |
| 37 | Segregation of networks | ✅ Implemented | VLANs, NSPs |

#### Clause 8: Technology Security (Controls 8.1-8.32)

| Control ID | Control Name | Implementation Status | Evidence |
|------------|-------------|----------------------|----------|
| 8.1 | User endpoint devices | ✅ Implemented | Endpoint policy |
| 8.2 | Privileged access rights | ✅ Implemented | PAM solution |
| 8.3 | Information access restriction | ✅ Implemented | Access controls |
| 8.4 | Access source and destination | ✅ Implemented | Firewall rules |
| 8.5 | Secure authentication | ✅ Implemented | MFA, certificates |
| 8.6 | Capacity management | ✅ Implemented | HPA, monitoring |
| 8.7 | Protection against malware | ✅ Implemented | EDR deployed |
| 8.8 | Management of technical vulnerabilities | ✅ Implemented | VM program |
| 8.9 | Configuration management | ✅ Implemented | IaC, GitOps |
| 8.10 | Deletion of data | ✅ Implemented | Secure deletion |
| 8.11 | Data masking | ✅ Implemented | Test data masking |
| 8.12 | Data leakage prevention | ✅ Implemented | DLP rules |
| 8.13 | Information backup | ✅ Implemented | Backup strategy |
| 8.14 | Redundancy of information | ✅ Implemented | Replication |
| 8.15 | Logging | ✅ Implemented | Centralized logging |
| 8.16 | Logging activities synchronization | ✅ Implemented | NTP configured |
| 8.17 | Protection of log information | ✅ Implemented | Log integrity |
| 8.18 | Administrative activities logging | ✅ Implemented | Audit trail |
| 8.19 | Clock synchronization | ✅ Implemented | NTP servers |
| 8.20 | Installation of software | ✅ Implemented | Approved images only |
| 8.21 | Networks security | ✅ Implemented | Network policies |
| 8.22 | Security of network services | ✅ Implemented | TLS enforcement |
| 8.23 | Segregation of networks | ✅ Implemented | Micro-segmentation |
| 8.24 | Web filtering | ✅ Implemented | DNS filtering |
| 8.25 | Use of cryptography | ✅ Implemented | Encryption standards |
| 8.26 | Secure development lifecycle | ✅ Implemented | SSDF alignment |
| 8.27 | Security requirements | ✅ Implemented | Security stories |
| 8.28 | Secure architecture | ✅ Implemented | Threat modeling |
| 8.29 | Secure coding | ✅ Implemented | Code review, SAST |
| 8.30 | Security testing | ✅ Implemented | DAST, pentesting |
| 8.31 | Outsourced development | ✅ Implemented | Vendor security reqs |
| 8.32 | Change management | ✅ Implemented | Change Advisory Board |

### 3.2 Statement of Applicability (SoA) Exclusions

| Control ID | Justification for Exclusion | Risk Acceptance |
|------------|------------------------------|-----------------|
| 5.20 | Physical access managed by data center provider | Contractual requirement |
| 8.23 (partial) | Some legacy systems not yet segmented | Risk accepted, remediation planned |

---

## 4. NIST Cybersecurity Framework Alignment

### 4.1 NIST CSF 2.0 Function Mapping

#### GOVERN (GV) Function

| GV Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| GV.OC-01 | Organizational cybersecurity policies | ISMS Policy | ✅ |
| GV.OC-02 | Cybersecurity supply chain risk | Vendor mgmt | ✅ |
| GV.OC-03 | Cybersecurity roles and responsibilities | RACI matrix | ✅ |
| GV.RM-01 | Priority of risks based on enterprise context | Risk register | ✅ |
| GV.RM-02 | Risk response | Risk treatment plan | ✅ |
| GV.SC-01 | Cybersecurity supply chain risk management | Vendor assessments | ✅ |
| GV.SC-02 | Suppliers and service providers | Contracts | ✅ |
| GV.MA-01 | Organizational configuration | CMDB | ✅ |
| GV.MA-02 | Cybersecurity policies reviewed | Annual review | ✅ |
| GV.MA-03 | System inventory | Asset registry | ✅ |
| GV.MA-04 | Vulnerability disclosure | Coordinated disclosure | ✅ |
| GV.MA-05 | Continuous improvement | PIR process | ✅ |
| GV.CT-01 | Governance communication | Reporting cadence | ✅ |

#### IDENTIFY (ID) Function

| ID Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| ID.AM-01 | Enterprise asset inventory | CMDB, K8s resources | ✅ |
| ID.AM-02 | Software platforms/applications | SBOM maintained | ✅ |
| ID.AM-03 | Organizational cybersecurity objectives | Security goals defined | ✅ |
| ID.AM-04 | Critical infrastructure | Dependencies mapped | ✅ |
| ID.AM-05 | Risk management strategy | Risk framework | ✅ |
| ID.AM-06 | Asset prioritization | Criticality ratings | ✅ |
| ID.AM-07 | Supply chain risk | TPRM process | ✅ |
| ID.AM-08 | Cybersecurity policies | Policy suite | ✅ |
| ID.AM-09 | Roles and responsibilities | Job descriptions | ✅ |
| ID.AM-10 | Legal and regulatory requirements | Compliance matrix | ✅ |
| ID.AM-11 | Governance and risk processes | GRC tooling | ✅ |
| ID.IM-01 | Network architecture | Diagrams documented | ✅ |
| ID.IM-02 | Data flow mapping | Data flow diagrams | ✅ |
| ID.IM-03 | Remote access | VPN, bastion hosts | ✅ |
| ID.RA-01 | Risk identification process | Risk assessments | ✅ |
| ID.RA-02 | Threat intelligence | TI feeds integrated | ✅ |
| ID.RA-03 | Vulnerability discovery | Scanning tools | ✅ |
| ID.RA-04 | Attack path analysis | Red team exercises | 🔄 Planned |
| ID.RA-05 | Risk monitoring | Dashboards | ✅ |
| ID.RA-06 | Risk response | Treatment decisions | ✅ |
| ID.RA-07 | Risk acceptance criteria | Risk appetite | ✅ |
| ID.CT-01 | Risk communication | Reports to leadership | ✅ |

#### PROTECT (PR) Function

| PR Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| PR.AA-01 | Identity management and access control | IAM, RBAC | ✅ |
| PR.AA-02 | Identity authenticator lifecycle | Credential rotation | ✅ |
| PR.AA-03 | Authenticator management | MFA, certificates | ✅ |
| PR.AA-04 | Identity repository | LDAP directory | ✅ |
| PR.AA-05 | Authorization enforcement | Policy engine | ✅ |
| PR.AM-01 | Baseline configuration | Hardened configs | ✅ |
| PR.AM-02 | Configuration management | IaC, GitOps | ✅ |
| PR.AM-03 | Software vulnerability mitigation | Patching SLAs | ✅ |
| PR.AM-04 | Software supply chain security | Image signing | ✅ |
| PR.DS-01 | Data-at-rest protection | Encryption | ✅ |
| PR.DS-02 | Data-in-transit protection | TLS 1.3 | ✅ |
| PR.DS-03 | Data integrity | Checksums, signing | ✅ |
| PR.DS-04 | Data availability | Backups, replication | ✅ |
| PR.DS-05 | Data classification | Classification policy | ✅ |
| PR.DS-06 | Data minimization | Retention policies | ✅ |
| PR.PS-01 | Malware protection | EDR, AV | ✅ |
| PR.PS-02 | Resource protection | Resource quotas | ✅ |
| PR.PS-03 | Integrity verification | FIM | ✅ |
| PR.PT-04 | Principle of least privilege | Minimal permissions | ✅ |
| PR.PT-05 | Account management | Provisioning/deprovisioning | ✅ |
| PR.PT-06 | Security impact analysis | Threat modeling | ✅ |
| PR.PT-07 | Network management | Network policies | ✅ |
| PR.PT-08 | Communications protection | TLS everywhere | ✅ |
| PR.CT-01 | User training | Security awareness | ✅ |
| PR.CT-02 | Technical personnel skills | Certifications | ✅ |

#### DETECT (DE) Function

| DE Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| DE.AE-01 | Event collection | SIEM, logging | ✅ |
| DE.AE-02 | Event analysis | Correlation rules | ✅ |
| DE.AE-03 | Network discovery | Asset discovery | ✅ |
| DE.AE-04 | Network monitoring | Traffic analysis | ✅ |
| DE.AE-05 | Malicious activity detection | IDS/IPS rules | ✅ |
| DE.CM-01 | Incident analysis | Investigation tools | ✅ |
| DE.CM-02 | Incident analysis support | Forensics capability | ✅ |
| DE.CM-03 | Incident response automation | SOAR playbooks | ✅ |
| DE.CM-04 | Impact analysis | BIA completed | ✅ |
| DE.CT-01 | Detection process sharing | Info sharing | ✅ |
| DE.CT-02 | Detection process improvement | Tuning feedback loop | ✅ |
| DE.DP-04 | Detection continuous improvement | Metrics tracking | ✅ |
| DE.DP-05 | Detection process testing | Purple team exercises | 🔄 Planned |

#### RESPOND (RS) Function

| RS Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| RS.RP-01 | Incident response execution | Playbooks | ✅ |
| RS.RP-02 | Incident analysis | Investigation SOP | ✅ |
| RS.RP-03 | Incident notification | Escalation matrix | ✅ |
| RS.RP-04 | Incident containment | Isolation procedures | ✅ |
| RS.RP-05 | Incident mitigation | Remediation steps | ✅ |
| RS.CO-01 | Incident response plan | IR plan document | ✅ |
| RS.CO-02 | Incident coordination | Comms templates | ✅ |
| RS.CO-03 | Analysis and detection | Tools and techniques | ✅ |
| RS.CO-4 | Mitigation | Response actions | ✅ |
| RS.AN-01 | Lessons learned | PIR process | ✅ |
| RS.AN-02 | Response actions improvement | Action items | ✅ |
| RS.AN-03 | Risk information sharing | ISAC participation | ✅ |
| RS.AN-04 | Detection process improvements | Rule tuning | ✅ |
| RS.MF-01 | Response process testing | Tabletop exercises | ✅ |
| RS.MF-2 | Response process training | IR training | ✅ |

#### RECOVER (RC) Function

| RC Subcategory | Control Example | Implementation | Status |
|----------------|-----------------|----------------|--------|
| RC.RP-01 | Recovery execution | DR procedures | ✅ |
| RC.RP-2 | Recovery plan | BCP/DR plans | ✅ |
| RC.CO-1 | Recovery plan communication | Stakeholder comms | ✅ |
| RC.CO-2 | Recovery activities coordination | DR team structure | ✅ |
| RC.AN-1 | Recovery plan improvements | Post-exercise updates | ✅ |
| RC.AN-2 | Risk information sharing | Lessons learned | ✅ |
| RC.MF-1 | Recovery process testing | DR tests quarterly | ✅ |
| RC.MF-2 | Recovery process training | DR drills | ✅ |

---

## 5. GDPR Data Protection Measures

### 5.1 Applicability Assessment

The SOC Platform may process personal data of:
- Djezzy employees (operators, analysts)
- End customers (via fraud detection, incident data)
- Third-party individuals (threat actors in security events)

### 5.2 GDPR Article Compliance Matrix

| GDPR Article | Requirement | Implementation | Status |
|--------------|-------------|----------------|--------|
| Art. 5 | Principles (lawfulness, fairness, transparency) | Privacy notice, lawful basis documentation | ✅ |
| Art. 6 | Lawful basis for processing | Legitimate interest documented | ✅ |
| Art. 7 | Consent (where applicable) | Cookie consent mechanism | ✅ |
| Art. 9 | Special category data | Health data handling procedures | ✅ |
| Art. 12 | Transparent information | Privacy policy published | ✅ |
| Art. 13 | Information to be provided | Data subject notices | ✅ |
| Art. 14 | Information where data not obtained from subject | Third-party data handling | ✅ |
| Art. 15 | Right of access | DSAR process documented | ✅ |
| Art. 16 | Right to rectification | Data correction process | ✅ |
| Art. 17 | Right to erasure | Data deletion procedures | ✅ |
| Art. 18 | Right to restriction | Restriction mechanisms | ✅ |
| Art. 19 | Notification obligation regarding rectification/erasure | Process documented | ✅ |
| Art. 20 | Right to data portability | Export functionality | 🔄 In Progress |
| Art. 21 | Right to object | Objection handling | ✅ |
| Art. 22 | Automated decision making/profiling | Human oversight required | ✅ |
| Art. 25 | Data protection by design and default | Privacy by design | ✅ |
| Art. 30 | Records of processing activities | RoPA maintained | ✅ |
| Art. 32 | Security of processing | Technical measures | ✅ |
| Art. 33 | Notification of personal data breach | Breach notification <72h | ✅ |
| Art. 34 | Communication of breach to data subject | Subject notification | ✅ |
| Art. 35 | Data protection impact assessment | DPIA template | ✅ |
| Art. 36 | Prior consultation | Supervisory authority contact | ✅ |
| Art. 37 | Designation of DPO | DPO appointed | ✅ |
| Art. 38 | Position of DPO | DPO independence ensured | ✅ |
| Art. 39 | Tasks of DPO | DPO responsibilities defined | ✅ |
| Art. 44-49 | International transfers | SCCs for cross-border transfers | ✅ |

### 5.3 Data Processing Register Entry

| Field | Value |
|-------|-------|
| Controller | Djezzy Algeria SPA |
| Processor (if any) | Cloud Provider (infrastructure only) |
| Purposes | Security operations, fraud prevention, incident response |
| Categories of data | Network data, authentication logs, incident reports |
| Recipients | Authorized personnel, law enforcement (upon request) |
| Transfers outside EU/EEA | Algeria (adequacy decision pending) |
| Retention period | Per data classification (see §11) |
| Technical measures | Encryption, access controls, audit logging |
| Organizational measures | Training, NDAs, need-to-know |

---

## 6. Telecom Security Standards (ETSI/3GPP)

### 6.1 ETSI TS 303 645 (Consumer IoT)

| Requirement | Relevance | Implementation |
|-------------|-----------|----------------|
| No universal default passwords | N/A (enterprise) | N/A |
| Implement a means to manage vulnerabilities | Relevant | Patching process |
| Securely store credentials | Relevant | Secrets manager |
| Encrypt communications | Relevant | TLS 1.3 |
| Regular security updates | Relevant | CI/CD pipeline |
| Sensitive security parameters via secure method | Relevant | External secrets |
| Interrupt software updates | N/A | N/A |
| Personal data protection | Relevant | GDPR compliance |
| Minimize exposed attack surface | Relevant | Hardening |
| Deliver software integrity info | Relevant | Image signing |

### 6.2 3GPP Security Standards

| Standard | Topic | Implementation |
|----------|-------|----------------|
| TS 33.210 | Access Domain Security | AAA integration |
| TS 33.210 | Network Domain Security | IPsec tunnels |
| TS 33.102 | 3G Security Architecture | Signaling protection |
| TS 33.501 | Lawful Interception | LI interface |
| TS 33.117 | Security Assurance | DevSecOps |

### 6.3 Telecom-Specific Security Measures

| Measure | Standard Reference | Status |
|---------|-------------------|--------|
| SS7/Diameter firewalling | GS PRD.33 | ✅ Deployed |
| GTP tunnel inspection | GS PRD.33 | ✅ Configured |
| SIM card cloning detection | Operator-specific | ✅ Integrated |
| Roaming fraud detection | GS PRD.32 | ✅ Active |
| Call detail record protection | Local regulation | ✅ Encrypted |
| Location privacy | GS PRD.22 | ✅ Masked |

---

## 7. Penetration Testing Schedule

### 7.1 Testing Calendar

| Test Type | Frequency | Next Date | Scope | Provider |
|-----------|-----------|----------|-------|----------|
| External Network Pentest | Annual | Q2 2026 | Public-facing infrastructure | Licensed firm |
| Web Application Assessment | Semi-annual | Q1 2026 | soc.djezzy.dz, API | Licensed firm |
| Internal Network Pentest | Annual | Q3 2026 | Internal network segments | Internal team / External |
| Wireless Assessment | Annual | Q4 2026 | Office WiFi, guest networks | Licensed firm |
| Social Engineering | Annual | Q2 2026 | Phishing, physical | Licensed firm |
| Red Team Exercise | Annual | Q4 2026 | Full scope | Licensed firm |
| API Security Testing | Quarterly | Ongoing | REST APIs | Automated + Manual |
| Container Security | Monthly | Ongoing | Docker/K8s images | Automated (Trivy) |

### 7.2 Pentest Rules of Engagement (RoE Template

```
═══════════════════════════════════════════════════════════════
RULES OF ENGAGEMENT - PENETRATION TEST
Project: National SOC Platform
Date Range: DD MMM YYYY - DD MMM YYYY
═══════════════════════════════════════════════════════════════

AUTHORIZED SCOPES:
• Production URL: https://soc.djezzy.dz
• Staging URL: https://staging.soc.djezzy.dz
• API endpoints: https://api.soc.djezzy.dz/*
• IP ranges: [To be provided]

EXPLICITLY NOT IN SCOPE:
• Denial of service attacks
• Social engineering of employees
• Physical security testing
• Testing third-party integrations directly
• Any action causing data loss or corruption

TESTING TYPES ALLOWED:
• Network reconnaissance (passive)
• Vulnerability scanning
• Manual exploitation (with care)
• SQL injection testing (safe payloads)
• XSS testing (proof-of-concept only)

REPORTING REQUIREMENTS:
• Executive summary
• Technical findings with CVSS scores
• Remediation recommendations
• Evidence (sanitized)

CONTACT FOR ISSUES:
Primary: On-call engineer
Escalation: Security Lead
Emergency: CISO Office
═══════════════════════════════════════════════════════════════
```

### 7.3 Vulnerability Severity Classification

| Level | CVSS Score | Response Time | Examples |
|-------|-----------|---------------|----------|
| Critical | 9.0-10.0 | 24 hours | RCE, auth bypass |
| High | 7.0-8.9 | 7 days | SQL injection, XSS (stored) |
| Medium | 4.0-6.9 | 30 days | CSRF, information disclosure |
| Low | 0.1-3.9 | 90 days | Missing headers, informational |
| Informational | 0.0 | Best effort | Best practices |

---

## 8. Vulnerability Management Program

### 8.1 VM Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│              VULNERABILITY MANAGEMENT LIFECYCLE              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DISCOVERY → ASSESSMENT → PRIORITIZATION → REMEDIATION     │
│      ↓            ↓               ↓              ↓         │
│   Scanning     Risk Rating      Ticketing       Patching    │
│   (Automated)  (CVSS + Context) (Auto/Manual)    (Verified)  │
│                                                              │
│  VERIFICATION → REPORTING → TRENDING                        │
│      ↓             ↓           ↓                             │
│   Rescan        Metrics      Dashboard                       │
│   (Confirm fix)  (KPIs)      (Leadership view)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Scanning Schedule

| Asset Type | Scanner | Frequency | Owner |
|------------|---------|-----------|-------|
| Kubernetes Cluster | Trivy, kube-bench | Daily | Platform |
| Container Images | Trivy, Grype | On-push + daily | DevOps |
| Web Applications | OWASP ZAP, Burp | Weekly | Security |
| Network Infrastructure | Nessus | Weekly | NetOps |
| Source Code | SonarQube, Semgrep | On-commit | Development |
| Dependencies | Dependabot, Snyk | On-update | Development |
| Cloud Infrastructure | Prowler, ScoutSuite | Daily | Cloud |
| Database | pgAudit, specialized | Weekly | DBA |

### 8.3 Key Performance Indicators

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Mean Time to Detect (MTTD) | < 1 day | ___ days | ↗️ |
| Mean Time to Remediate (MTTR) - Critical | < 24 hours | ___ hours | ↗️ |
| Mean Time to Remediate (MTTR) - High | < 7 days | ___ days | ↗️ |
| Vulnerability SLA Compliance | > 95% | ___ % | ↗️ |
| False Positive Rate | < 10% | ___ % | ↗️ |
| Scan Coverage | > 95% of assets | ___ % | ↗️ |
| Open Critical/High Vulns | < 10 at any time | ___ | ↘️ |

---

## 9. Third-Party Risk Assessment

### 9.1 Vendor Tier Classification

| Tier | Criteria | Assessment Depth | Review Frequency |
|------|----------|------------------|------------------|
| Critical | Access to production data, admin rights | Full assessment + Audit | Annual + Event-driven |
| High | Customer-facing, sensitive data | Standard assessment | Annual |
| Medium | Limited data access, non-critical | Questionnaire | Biennial |
| Low | No data access, commodity | Self-certification | Onboarding only |

### 9.2 Vendor Assessment Criteria

| Category | Weight | Criteria |
|----------|--------|----------|
| Security Governance | 20% | Policies, certifications, training |
| Data Protection | 25% | Encryption, access controls, DSR |
| Business Continuity | 15% | DR capabilities, financial stability |
| Technical Security | 20% | SDLC, pen testing, vuln mgmt |
| Compliance | 10% | Certifications, regulatory |
| Contractual | 10% | SLAs, liability, insurance |

### 9.3 Approved Vendor List (Sample)

| Vendor | Service | Tier | Last Assessment | Status |
|--------|---------|------|-----------------|--------|
| Cloud Provider | Infrastructure | Critical | 2025-Q4 | ✅ Approved |
| DNS/WAF Provider | Security | High | 2025-Q3 | ✅ Approved |
| Certificate Authority | PKI | High | 2025-Q2 | ✅ Approved |
| SIEM Vendor | Security Tool | High | 2025-Q4 | ✅ Approved |
| Monitoring Tool | Observability | Medium | 2025-Q3 | ✅ Approved |
| HR System | Business App | Medium | 2025-Q2 | ✅ Approved |

### 9.4 Third-Party Security Requirements (Contract Clauses)

All vendor contracts must include:

```markdown
## Security Requirements

1. **Data Protection**
   - Vendor must implement encryption at rest (AES-256 minimum)
   - Vendor must implement encryption in transit (TLS 1.2+)
   - Vendor must notify within 24h of any data breach
   - Vendor must comply with GDPR/ANOR as applicable

2. **Access Control**
   - Vendor must implement MFA for all administrative access
   - Vendor must maintain audit logs for minimum 1 year
   - Vendor must provide access logs upon request
   - Vendor must restrict access to need-to-know basis

3. **Security Compliance**
   - Vendor must undergo annual penetration testing
   - Vendor must provide SOC 2 Type II report (or equivalent)
   - Vendor must have vulnerability management program
   - Vendor must conduct background checks on staff

4. **Incident Response**
   - Vendor must have documented IR plan
   - Vendor must cooperate in joint investigations
   - Vendor must provide timely status updates
   - Vendor must preserve evidence when requested

5. **Termination**
   - Vendor must return/delete all customer data upon termination
   - Vendor must certify data destruction
   - Vendor must provide transition assistance
```

---

## 10. Data Classification Policy

### 10.1 Classification Levels

| Level | Name | Definition | Examples | Handling Requirements |
|-------|------|------------|---------|----------------------|
| 4 | **RESTRICTED** | Extremely sensitive; unauthorized disclosure could cause severe harm | Encryption keys, passwords, executive communications | Air-gapped, dual-control, encrypted |
| 3 | **CONFIDENTIAL** | Sensitive internal data; limited distribution | Employee data, financial data, security configs | Need-to-know, encrypted at rest/transit |
| 2 | **INTERNAL** | General internal business data | Policies, procedures, meeting notes | Internal-only, no public release |
| 1 | **PUBLIC** | Approved for public release | Marketing materials, public website content | No restrictions |

### 10.2 Data Classification Decision Tree

```
Is this data regulated by law/government?
├── YES → RESTRICTED or CONFIDENTIAL (based on sensitivity)
└── NO
    Could this cause significant harm if publicly disclosed?
    ├── YES → CONFIDENTIAL
    └── NO
        Is this meant for external/public consumption?
        ├── YES → PUBLIC
        └── NO → INTERNAL
```

### 10.3 Handling Requirements by Classification

| Control | PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED |
|---------|--------|----------|---------------|------------|
| Encryption at Rest | Optional | Recommended | Required | Required (HSM) |
| Encryption in Transit | TLS optional | TLS 1.2+ | TLS 1.3 | TLS 1.3 + mTLS |
| Access Control | Open | Authenticated | RBAC | RBAC + MFA + Approval |
| Audit Logging | Minimal | Standard | Comprehensive | Comprehensive + Tamper-proof |
| Sharing Restrictions | None | Internal only | NDA required | Written approval |
| Storage Locations | Any | Company systems | Approved systems only | Specific approved systems |
| Disposal | Standard delete | Secure delete | Certified destruction | Certified destruction + Witness |
| Backup Encryption | Optional | Recommended | Required | Required (separate key) |
| Retention | As needed | Per policy | Per policy | Minimum necessary |

---

## 11. Retention and Disposal Policies

### 11.1 Data Retention Schedule

| Data Type | Classification | Retention Period | Legal Basis | Storage Tier |
|-----------|---------------|------------------|-------------|--------------|
| Security Events (Critical) | Confidential | 7 years | ANOR, legal | Cold (Archive) |
| Security Events (Info) | Internal | 2 years | Operational | Warm |
| Authentication Logs | Confidential | 2 years | ANOR, audit | Warm |
| Access Logs | Internal | 1 year | Operational | Hot |
| Application Logs | Internal | 90 days | Debugging | Hot |
| Incident Reports | Confidential | 7 years | Legal, ANOR | Cold |
| PIR Documents | Confidential | 7 years | Legal | Cold |
| User Activity | Confidential | 2 years | ANOR, GDPR | Warm |
| Performance Metrics | Internal | 1 year | Operational | Warm |
| Backups (Database) | Confidential | 30 days (operational) + 1 year (archive) | BCP | Hot + Cold |
| Backups (Config) | Confidential | 1 year | BCP | Warm |
| Certificates/Keys | Restricted | Lifetime + 3 years | Security | HSM/Cold |
| Personal Data (Employees) | Confidential | Employment + 5 years | Labor law | Warm |
| Personal Data (Customers) | Confidential | Contract term + 3 years | GDPR, consumer law | Warm |
| Training Records | Internal | Employment + 3 years | Compliance | Warm |
| Audit Trails | Confidential | 7 years | ANOR, legal | Cold (WORM) |
| Threat Intelligence | Internal | 2 years | Operational | Warm |
| Vulnerability Scans | Internal | 3 years | Due diligence | Warm |

### 11.2 Data Disposal Procedures

#### Electronic Data Disposal

| Method | Data Classification | Verification |
|--------|-------------------|--------------|
| Standard Delete | PUBLIC, INTERNAL | File system confirmation |
| Secure Erase (1-pass) | Internal (some) | Tool log |
| Secure Erase (3-pass DoD) | Confidential | Tool log + spot check |
| Cryptographic Erase | Confidential, RESTRICTED | Key destruction certificate |
| Physical Destruction | RESTRICTED (media) | Destruction certificate + witness |

#### Disposal Workflow

```bash
# Example: Secure file deletion using shred
shred -vfz -n 3 /path/to/confidential/file

# Example: Secure disk wipe
dd if=/dev/urandom of=/dev/sdX bs=1M status=progress

# For cloud storage:
# 1. Delete object
# 2. Verify deletion (list operation)
# 3. Wait for replication propagation
# 4. Document disposal in log
```

### 11.3 Legal Hold Procedures

When litigation or investigation is anticipated:

1. **Identify Custodians:** Determine who may have relevant data
2. **Issue Legal Hold:** Formal notice to preserve all data
3. **Suspend Normal Deletion:** Block automated retention policies
4. **Preserve Metadata:** Ensure timestamps, access logs preserved
5. **Document Chain of Custody:** Track all access/modifications
6. **Engage eDiscovery Tools:** If volume is large
7. **Coordinate with Legal:** Regular status updates

---

## Appendix A: Compliance Dashboard Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Overall Compliance Score | ___% | > 90% | 🟢/🟡/🔴 |
| Critical Findings Open | ___ | 0 | 🟢/🟡/🔴 |
| Overdue Remediation Items | ___ | 0 | 🟢/🟡/🔴 |
| Security Training Completion | ___% | 100% | 🟢/🟡/🔴 |
| Pentest Findings Remediated | ___% | > 95% | 🟢/🟡/🔴 |
| Policy Review Currency | ___ months | < 12 months | 🟢/🟡/🔴 |
| Vendor Assessments Current | ___% | 100% | 🟢/🟡/🔴 |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| ANOR | Autorité Nationale de Régulation Postale et des Communications Électroniques |
| BCP | Business Continuity Plan |
| CMDB | Configuration Management Database |
| CSIRT | Computer Security Incident Response Team |
| CVSS | Common Vulnerability Scoring System |
| DLP | Data Loss Prevention |
| DPIA | Data Protection Impact Assessment |
| DR | Disaster Recovery |
| DSAR | Data Subject Access Request |
| DPO | Data Protection Officer |
| EDR | Endpoint Detection and Response |
| GDPR | General Data Protection Regulation |
| GRC | Governance, Risk, and Compliance |
| HSM | Hardware Security Module |
| IAM | Identity and Access Management |
| IR | Incident Response |
| ISAC | Information Sharing and Analysis Center |
| ISMS | Information Security Management System |
| MFA | Multi-Factor Authentication |
| MTTR | Mean Time To Remediate |
| MTTD | Mean Time To Detect |
| PIR | Post-Incident Review |
| RBAC | Role-Based Access Control |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| SIEM | Security Information and Event Management |
| SLA | Service Level Agreement |
| SOC | Security Operations Center (also Service Organization Control) |
| SOAR | Security Orchestration, Automation and Response |
| SSD | Secure Software Development Framework |
| WAF | Web Application Firewall |

---

## Appendix C: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Security Team | Initial version for go-live |

---

## Appendix D: Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CISO | | | |
| DPO | | | |
| IT Director | | | |
| Compliance Officer | | | |
| Legal Counsel | | | |

---

*End of Security Compliance Matrix*
