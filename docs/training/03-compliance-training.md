# ANRT Compliance Training

**Document ID:** SOC-TRN-003  
**Version**: 2.0  
**Classification: Internal - Regulatory Training Material  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Compliance Team

---

## Table of Contents

1. [Course Overview](#course-overview)
2. [Module 1: Algerian Regulatory Framework](#module-1-algerian-regulatory-framework)
3. [Module 2: ANRT Cybersecurity Requirements](#module-2-anrt-cybersecurity-requirements)
4. [Module 3: Data Protection Obligations](#module-3-data-protection-obligations)
5. [Module 4: Incident Notification Procedures](#module-4-incident-notification-procedures)
6. [Module 5: Data Handling and Privacy Protection](#module-5-data-handling-and-privacy-protection)
7. [Module 6: IMSI/MSISDN Masking Procedures](#module-6-imsismsdn-masking-procedures)
8. [Module 7: Audit and Compliance Verification](#module-7-audit-and-compliance-verification)
9. [Practical Scenarios](#practical-scenarios)
10. [Assessment and Certification](#assessment-and-certification)

---

## Course Overview

### Target Audience

This mandatory compliance training is required for:
- All SOC analysts (annual recertification)
- Security engineers with data access
- Incident responders
- Anyone handling subscriber data
- New employees within first 30 days of hire

### Learning Objectives

| Objective | Description | Assessment |
|-----------|-------------|------------|
| **LO1** | Explain ANRT's role in Algerian telecommunications regulation | Written exam |
| **LO2** | Identify key cybersecurity obligations under current regulations | Scenario analysis |
| **LO3** | Apply correct data handling procedures for subscriber information | Practical test |
| **LO4** | Execute proper incident notification to ANRT | Role-play exercise |
| **LO5** | Implement IMSI/MSISDN masking per policy | Technical exercise |
| **LO6** | Document activities for audit purposes | Documentation review |

### Course Duration

- **Total Hours:** 8 hours (1 day intensive or 2 half-days)
- **Theory:** 5 hours (62.5%)
- **Practical Exercises:** 2 hours (25%)
- **Assessment:** 1 hour (12.5%)

### Why This Matters

```
┌─────────────────────────────────────────────────────────────────────┐
│              WHY COMPLIANCE MATTERS AT DJEZZY                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LEGAL OBLIGATIONS                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Djezzy operates under license from ANRT                   │   │
│  │ • Non-compliance can result in fines up to 5% of revenue    │   │
│  │ • Criminal liability possible for willful violations        │   │
│  │ • License revocation is ultimate penalty                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  TRUST OBLIGATIONS                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • 16+ million subscribers trust us with their data          │   │
│  │ • Personal communications must remain private               │   │
│  │ • Location data is highly sensitive                         │   │
│  │ • Breaches erode customer confidence                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  NATIONAL SECURITY                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Telecom infrastructure is critical national asset         │   │
│  │ • Attacks may have national security implications           │   │
│  │ • Coordination with authorities is mandatory               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Algerian Regulatory Framework

### The Telecommunications Sector in Algeria

#### Key Regulatory Bodies

| Body | Full Name | Role | Website |
|------|-----------|------|---------|
| **ANRT** | Autorité de Régulation de la Poste et des Télécommunications | Primary telecom regulator | www.anrt.dz |
| **APR** | Autorité Postale Regulation | Postal services oversight | - |
| **CNIL equivalent** | Data protection authority | Privacy regulation | Under development |

#### Legal Framework Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                  ALGERIAN TELECOM LEGAL FRAMEWORK                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LEVEL 1: CONSTITUTION & LAWS                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Constitution of Algeria (Article 47, 48)                 │   │
│  │ • Law 2000-03 on Postal & Telecom Activities               │   │
│  │ • Law 2018-09 on Electronic Transactions                   │   │
│  │ • Penal Code provisions (cybercrime articles)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  LEVEL 2: REGULATORY DECREEES                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Executive Decree on Electronic Communications            │   │
│  │ • Decree on Information Systems Security                  │   │
│  │ • Interministerial orders on cybersecurity                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  LEVEL 3: ANRT REGULATIONS & DECISIONS                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Decision XXX on Operator Security Obligations            │   │
│  │ • Decision YYY on Incident Reporting Requirements          │   │
│  │ • Decision ZZZ on Subscriber Data Protection               │   │
│  │ • Technical specifications and standards                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  LEVEL 4: OPERATOR INTERNAL POLICIES                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Djezzy Security Policy                                   │   │
│  │ • Data Classification Guidelines                           │   │
│  │ • Acceptable Use Policies                                  │   │
│  │ • Incident Response Procedures                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ANRT's Mandate and Powers

ANRT (Autorité de Régulation de la Poste et des Télécommunications) has significant authority over telecommunications operators:

| Power | Description | Impact on Djezzy |
|-------|-------------|------------------|
| **Licensing** | Grant/revoke operating licenses | Core business dependency |
| **Regulation** | Set technical and operational standards | Must comply with all requirements |
| **Enforcement** | Impose fines and sanctions | Financial and reputational risk |
| **Investigation** | Conduct audits and investigations | Must cooperate fully |
| **Dispute Resolution** | Handle consumer complaints | Affects customer relations |

### Key Regulations Affecting SOC Operations

```markdown
## PRIMARY APPLICABLE REGULATIONS

### 1. Cybersecurity Obligations (Decision 2023/M/SPCRT/001)
**Summary:** Operators must maintain security capabilities proportionate to risks.

Key Requirements:
- Establish a dedicated cybersecurity function (SOC)
- Implement continuous monitoring systems
- Maintain incident response capabilities
- Report significant incidents to ANRT
- Conduct regular security assessments
- Protect subscriber personal data

**SOC Relevance:**
- Justifies our existence and staffing
- Defines minimum capabilities we must maintain
- Sets reporting thresholds we must follow

### 2. Data Protection Requirements (Decision 2022/D/ANRT/015)
**Summary:** Strict rules on collection, processing, and protection of subscriber data.

Key Requirements:
- Collect only necessary data
- Obtain informed consent where required
- Implement appropriate security measures
- Limit access to need-to-know basis
- Retain data only as long as necessary
- Enable subject access requests

**SOC Relevance:**
- Governs how we handle data during investigations
- Requires masking/anonymization in many contexts
- Limits what data we can retain in logs

### 3. Incident Notification Rules (Decision 2023/I/ANRT/008)
**Summary:** Mandatory reporting timeline for security incidents.

Notification Thresholds:
- CRITICAL (< 4 hours): Major service disruption, suspected state attack
- HIGH (< 72 hours): Confirmed data breach, significant system compromise
- MONTHLY: Aggregate statistics on all security events

**SOC Relevance:**
- Directly impacts our IR procedures
- Requires specific documentation and formats
- Triggers coordination with legal/comms teams

### 4. Lawful Interception Framework (Interministerial Order)
**Summary:** Technical and procedural requirements for lawful interception capability.

Key Requirements:
- Maintain LI capability for authorized requests
- Ensure integrity and confidentiality of LI data
- Designate responsible personnel
- Document all LI activities

**SOC Relevance:**
- Separate from our security monitoring
- Specific personnel with clearance required
- Audit trail requirements
```

---

## Module 2: ANRT Cybersecurity Requirements

### Security Capability Requirements

ANRT expects licensed operators to demonstrate these security capabilities:

```
┌─────────────────────────────────────────────────────────────────────┐
│              REQUIRED SECURITY CAPABILITIES (per ANRT)              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. SECURITY OPERATIONS CENTER (SOC)                        │   │
│  │     □ 24/7/365 monitoring capability                       │   │
│  │     □ Qualified security personnel                          │   │
│  │     □ Defined escalation procedures                        │   │
│  │     □ Documented playbooks and procedures                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. THREAT DETECTION                                        │   │
│  │     □ Intrusion detection systems                            │   │
│  │     □ Malware detection and prevention                      │   │
│  │     □ Network traffic analysis                              │   │
│  │     □ Log management and correlation                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. INCIDENT RESPONSE                                       │   │
│  │     □ Incident response plan                                │   │
│  │     □ Forensic investigation capability                     │   │
│  │     □ Evidence preservation procedures                      │   │
│  │     □ Recovery procedures                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. VULNERABILITY MANAGEMENT                                │   │
│  │     □ Asset inventory                                       │   │
│  │     □ Vulnerability scanning program                        │   │
│  │     □ Patch management process                              │   │
│  │     □ Penetration testing schedule                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  5. ACCESS CONTROL                                          │   │
│  │     □ Identity and access management                        │   │
│  │     □ Privileged access management                          │   │
│  │     □ Multi-factor authentication for sensitive systems      │   │
│  │     □ Regular access reviews                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  6. DATA PROTECTION                                         │   │
│  │     □ Data classification scheme                             │   │
│  │     □ Encryption at rest and in transit                     │   │
│  │     □ Backup and recovery procedures                        │   │
│  │     □ Data loss prevention                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  7. SECURITY GOVERNANCE                                     │   │
│  │     □ Security policies documented                           │   │
│  │     □ Risk assessment program                                │   │
│  │     □ Security awareness training                            │   │
│  │     □ Third-party risk management                            │   │
│  │     □ Business continuity planning                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### How Djezzy SOC Meets These Requirements

| Requirement | Our Implementation | Evidence Location |
|-------------|-------------------|-------------------|
| 24/7 Monitoring | 3-shift coverage model | Shift schedules |
| Qualified Personnel | Certified analysts, ongoing training | Training records |
| SIEM | Wazuh + Elasticsearch cluster | Infrastructure docs |
| IDS/IPS | Suricata deployment | Network architecture |
| EDR | OSQuery + GRR integration | Endpoint docs |
| IR Plan | Runbook RB-002 | Documentation |
| Vulnerability Management | OpenVAS + DefectDojo | VM reports |
| Access Control | LDAP + MFA + RBAC | IAM policies |
| Data Encryption | TLS 1.3, AES-256 at rest | Security configs |
| Awareness Training | This course! | LMS records |

### Annual Compliance Reporting

Djezzy must submit annual security reports to ANRT:

```yaml
# anrt_annual_report_structure.yml
annual_security_report:
  submission_deadline: "March 31"  # For previous calendar year
  
  sections:
    - title: "Executive Summary"
      content:
        - Security posture overview
        - Major incidents summary
        - Key improvements made
    
    - title: "Organization & Governance"
      content:
        - Security team structure and staffing
        - Roles and responsibilities
        - Board-level oversight
    
    - title: "Security Capabilities"
      content:
        - SOC operations metrics
        - Tool inventory and status
        - Detection coverage assessment
    
    - title: "Incident Statistics"
      content:
        - Total incidents by category
        - Incidents reported to ANRT
        - Average response times
        - Resolution outcomes
    
    - title: "Vulnerability Management"
      content:
        - Assets under management
        - Vulnerabilities discovered
        - Remediation rates
        - Critical outstanding issues
    
    - title: "Training & Awareness"
      content:
        - Staff training completion rates
        - Phishing simulation results
        - Security awareness campaigns
    
    - title: "Third-Party Risk"
      content:
        - Vendor inventory
        - Assessments completed
        - Findings and remediation
    
    - title: "Plans for Coming Year"
      content:
        - Planned investments
        - Improvement initiatives
        - Resource requirements
```

---

## Module 3: Data Protection Obligations

### What Constitutes "Personal Data"

In the telecom context, personal data includes:

| Data Category | Examples | Sensitivity Level |
|---------------|----------|-------------------|
| **Identity Data** | Name, address, ID number, photo | High |
| **Account Data** | MSISDN, contract details, billing info | High |
| **Technical Identifiers** | IMSI, IMEI, IP addresses | Very High |
| **Communication Data** | Call records (CDR), SMS content, location | Very High |
| **Financial Data** | Payment info, credit score, transaction history | High |
| **Behavioral Data** | Usage patterns, browsing history, app usage | Medium-High |

### Data Processing Principles

```
DATA PROTECTION PRINCIPLES (Applicable to SOC Operations):
======================================================

1. PURPOSE LIMITATION
   ┌───────────────────────────────────────────────────────────┐
   │ Only collect/process data for specified, legitimate       │
   │ purposes. Don't use security data for unrelated reasons. │
   │                                                           │
   │ Example: We collect logs for threat detection, NOT for    │
   │ marketing analytics or employee performance review.       │
   └───────────────────────────────────────────────────────────┘

2. DATA MINIMIZATION
   ┌───────────────────────────────────────────────────────────┐
   │ Collect only what is necessary. Avoid over-collection.    │
   │                                                           │
   │ Example: For malware investigation, we need file hashes   │
   │ and process trees, NOT the actual document contents      │
   │ unless specifically required.                             │
   └───────────────────────────────────────────────────────────┘

3. STORAGE LIMITATION
   ┌───────────────────────────────────────────────────────────┐
   │ Keep data only as long as needed. Delete when purpose     │
   │ is complete.                                              │
   │                                                           │
   │ Example: Investigation logs retained 7 years per legal    │
   │ hold requirement; routine alerts purged after 90 days.    │
   └───────────────────────────────────────────────────────────┘

4. ACCURACY
   ┌───────────────────────────────────────────────────────────┐
   │ Keep data accurate and up to date. Correct errors when    │
   │ discovered.                                               │
   │                                                           │
   │ Example: If we misattribute an alert to wrong user,      │
   │ correct the record immediately.                           │
   └───────────────────────────────────────────────────────────┘

5. INTEGRITY & CONFIDENTIALITY
   ┌───────────────────────────────────────────────────────────┐
   │ Protect against unauthorized access, alteration, or       │
   │ disclosure.                                                │
   │                                                           │
   │ Example: Encryption at rest, access controls, audit logs │
   └───────────────────────────────────────────────────────────┘

6. ACCOUNTABILITY
   ┌───────────────────────────────────────────────────────────┐
   │ Be able to demonstrate compliance. Document everything.   │
   │                                                           │
   │ Example: Every data access logged, every query auditable. │
   └───────────────────────────────────────────────────────────┘
```

### Lawful Bases for Processing

As SOC analysts, our lawful bases for processing subscriber data:

| Activity | Legal Basis | Documentation Required |
|----------|-------------|------------------------|
| **Security Monitoring** | Legitimate interest (security) | Security policy, privacy impact assessment |
| **Incident Response** | Legal obligation (ANRT reqs) | IR runbooks, notification records |
| **Fraud Prevention** | Legitimate interest (asset protection) | Fraud investigation SOPs |
| **Threat Intelligence** | Legitimate interest (collective defense) | TLP handling procedures |
| **Lawful Interception** | Legal obligation (court order) | LI authorization records |

---

## Module 4: Incident Notification Procedures

### When to Notify ANRT

#### Immediate Notification (Within 4 Hours)

Trigger notification IMMEDIATELY if any of these occur:

| Condition | Examples |
|-----------|----------|
| **Major Service Disruption** | >10% subscribers affected, core network element down |
| **Suspected State-Sponsored Attack** | APT indicators, nation-state TTPs |
| **Critical Infrastructure Compromise** | HLR accessed, signaling system breached |
| **Massive Data Breach** | >100,000 subscriber records exposed |
| **National Security Implication** | Attack coordinated with external events |

#### Standard Notification (Within 72 Hours)

Notify within 72 hours for:

| Condition | Examples |
|-----------|----------|
| **Confirmed Data Breach** | Any subscriber data confirmed exposed |
| **Significant System Compromise** | Server fully compromised, admin access gained |
| **Ongoing Attack** | Active intrusion not yet contained |
| **Third-Party Breach Impact** | Vendor breach affecting our data |

#### Monthly Reporting

Submit aggregated statistics monthly:

- Total security incidents by category
- Alerts processed and outcomes
- False positive rates
- System availability metrics
- Training completion statistics

### Notification Process Flow

```
INCIDENT DETECTED
       │
       ▼
┌──────────────────────┐
│ ASSESS NOTIFICATION │
│ REQUIREMENT          │
│                      │
│ Does this meet ANRT  │
│ notification criteria?│
└──────────┬───────────┘
           │
     ┌─────┴─────┐
     │ YES       │ NO
     ▼           ▼
┌─────────┐  ┌─────────────┐
│ START   │  │ Document   │
│ NOTIF   │  │ internally │
│ PROCESS │  │ only       │
└────┬────┘  └─────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ STEP 1: INITIAL ASSESSMENT (15 min)         │
│                                             │
│ □ Determine incident scope                  │
│ □ Estimate affected subscribers             │
│ □ Classify incident type                    │
│ □ Assign preliminary severity               │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ STEP 2: INTERNAL ESCALATION (30 min)        │
│                                             │
│ □ Notify CISO                              │
│ □ Notify Legal/Compliance                  │
│ □ Notify Corporate Communications (if needed)│
│ □ Assemble notification team                │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ STEP 3: PREPARE NOTIFICATION (1 hour)       │
│                                             │
│ □ Complete notification template            │
│ □ Sanitize sensitive details                │
│ □ Get management approval                   │
│ □ Prepare supporting evidence               │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ STEP 4: SUBMIT TO ANRT                      │
│                                             │
│ Method: Official portal / secure email      │
│ Recipient: cybersurete@anrt.dz              │
│ Format: Per template (see below)            │
│ Confirmation: Record reference number       │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ STEP 5: FOLLOW-UP REPORTING                 │
│                                             │
│ □ Updates every 24 hours until resolved     │
│ □ Final report within 30 days               │
│ □ Lessons learned documentation             │
└─────────────────────────────────────────────┘
```

### Notification Template (French - Official Language)

```markdown
NOTIFICATION D'INCIDENT DE CYBERSÉCURITÉ
========================================

OPÉRATEUR: ORASCOM TÉLÉCOM ALGÉRIE (Djezzy)
RÉFÉRENCE OPÉRATEUR: DJEZZY-XXX
NOTIFICATION N°: INC-NOTIF-YYYY-NNNNN
DATE DE NOTIFICATION: [DD/MM/YYYY]
HEURE DE NOTIFICATION: [HH:MM] UTC
CLASSIFICATION: INITIALE / MISE À JOUR / FINALE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NATURE DE L'INCIDENT
-----------------------
Type: [Technique détaillé]
Catégorie ANRT: [Conformément à la classification]
Première détection: [DATE/HEURE] UTC
Durée estimée: [X heures/jours]

Description sommaire:
[Paragraphe décrivant l'incident en langage clair]

2. CHRONOLOGIE
-------------
[Date/Heure UTC] - Événement initial détecté
[Date/Heure UTC] - Première analyse
[Date/Heure UTC] - Mesures de confinement engagées
[Date/Heure UTC] - État actuel

3. IMPACT ÉVALUÉ
-----------------
Services affectés:
- [ ] Voix (fixe/mobile)
- [ ] Données mobiles
- [ ] Services valeur ajoutée
- [ ] Systèmes internes

Estimation abonnés potentiellement affectés: [Nombre ou fourchette]
Données personnelles concernées: [OUI/NON - détails si oui]
Impact financier estimé: [Si connu]

4. ANALYSE TECHNIQUE
-------------------
Vecteur d'attaque identifié/suspecté:
[Phishing / Exploitation / Interne / Supply Chain / Autre]

Indicateurs de compromission (IOCs):
- Adresses IP: [...]
- Noms de domaine: [...]
- Empreintes de fichiers (hashes): [...]

Techniques utilisées (si connues):
[Références MITRE ATT&CK si applicable]

5. MESURES PRISES
---------------
Mesures immédiates:
- [Liste des actions entreprises]

Mesures de confinement:
- [Comment l'incident est contenu/isolé]

Coordination avec les autorités:
- [Autorités informées le cas échéant]

6. STATUT ACTUEL
---------------
État: [Actif / Contenu / En cours de résolution / Résolu]
Prochaines étapes prévues:
[Plan pour la résolution complète]

7. COORDINATION ET CONTACTS
----------------------------
Contact technique principal:
Nom: [NOM COMPLET]
Fonction: [FONCTION]
Téléphone: [+213 XX XX XX XX]
Email: [EMAIL]

Contact gestionnaire:
Nom: [NOM COMPLET]
Fonction: [FONCTION]
Téléphone: [+213 XX XX XX XX]
Email: [EMAIL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pièces jointes:
- Rapport technique détaillé (si disponible)
- Journal des actions entreprises
- Preuves pertinentes (sanitisées)

---
Autorité de Régulation de la Poste et des Télécommunications (ANRT)
Division Cybersécurité
Email: cybersurete@anrt.dz
Téléphone: [+213 XX XX XX XX]
```

---

## Module 5: Data Handling and Privacy Protection

### Data Classification at Djezzy

All data handled by SOC must be classified:

```
DATA CLASSIFICATION LEVELS:
===========================

┌─────────────────────────────────────────────────────────────────────┐
│  PUBLIC                                                          │
│  ════════                                                        │
│  Definition: Information intended for public disclosure           │
│  Examples: Marketing materials, public pricing, press releases   │
│  Handling: No special restrictions                                │
│  SOC Relevance: Rarely encountered in security work              │
├─────────────────────────────────────────────────────────────────────┤
│  INTERNAL                                                       │
│  ═════════                                                      │
│ Definition: Internal business information, not secret           │
│  Examples: Organizational charts, internal policies, procedures  │
│  Handling: Share within Djezzy only, no public disclosure       │
│  SOC Relevance: Some operational documents, training materials   │
├─────────────────────────────────────────────────────────────────────┤
│  CONFIDENTIAL                                                   │
│  ═════════════                                                   │
│ Definition: Sensitive business information requiring protection │
│  Examples: Financial reports, strategic plans, vendor contracts  │
│  Handling: Need-to-know basis, encryption for transmission     │
│  SOC Relevance: Some investigation findings, vulnerability data  │
├─────────────────────────────────────────────────────────────────────┤
│  RESTRICTED / SENSITIVE                                         │
│  ═══════════════════════                                         │
│ Definition: Highly sensitive, limited distribution              │
│  Examples: Customer PII, subscriber data, security credentials  │
│  Handling: Strict access controls, masking, audit logging      │
│  SOC Relevance: MOST security data falls here                  │
├─────────────────────────────────────────────────────────────────────┤
│  TOP SECRET / CRITICAL                                          │
│  ═══════════════════                                            │
│ Definition: Extremely sensitive, very limited access           │
│  Examples: Crypto keys, lawful intercept data, board materials  │
│  Handling: Maximum controls, air-gapped if needed               │
│  SOC Relevance: Encryption keys, certain IR evidence           │
└─────────────────────────────────────────────────────────────────────┘
```

### Handling Requirements by Classification

| Control | Public | Internal | Confidential | Restricted |
|---------|--------|----------|--------------|-------------|
| **Encryption at Rest** | Optional | Recommended | Required | Required |
| **Encryption in Transit** | Recommended | Required | Required | Required |
| **Access Logging** | No | Basic | Detailed | Comprehensive |
| **Masking** | No | No | Partial | Yes (mandatory) |
| **Retention** | Indefinite | 3 years | 7 years | Per policy |
| **Destruction** | Standard | Secure delete | Secure erase | Cryptographic erase |
| **Sharing** | Anyone | Djezzy staff | Need-to-know | Named individuals only |

### Secure Data Handling Procedures

#### Procedure: Accessing Restricted Data

```markdown
## SECURE DATA ACCESS PROCEDURE

### Step 1: Verify Authorization
□ Confirm you have legitimate business need
□ Check your access rights are appropriate
□ Ensure investigation/case justifies access level

### Step 2: Access in Controlled Environment
□ Use designated secure workstation if available
□ Ensure screen is not visible to unauthorized persons
□ Do not copy data to local machine unless necessary

### Step 3: Minimum Necessary Principle
□ Access ONLY data required for immediate task
□ Do not "browse" out of curiosity
□ Query with specific filters, avoid broad searches

### Step 4: During Analysis
□ Keep data in memory/session, not saved locally
□ If saving required, use encrypted storage only
□ Never email or transfer via unsecured channels

### Step 5: When Task Complete
□ Close all applications containing data
□ Clear clipboard, temp files, browser cache
□ Document what was accessed and why
□ Report any inadvertent exposure immediately
```

#### Procedure: Sharing Data Externally

```markdown
## EXTERNAL DATA SHARING PROCEDURE

### Allowed External Recipients
✓ ANRT (with proper classification marking)
✓ Law enforcement (with court order/legal basis)
✓ CERT-DZ (under trust agreement)
✓ Other telecom operators (for fraud/security, under NDA)
✓ Vendors (minimum necessary, under contract)

### Prohibited Actions
❌ Posting subscriber data on public forums/social media
❌ Sharing with colleagues without need-to-know
❌ Transferring to personal devices/accounts
❌ Including in unencrypted emails
❌ Discussing in public spaces

### Required Approvals
For RESTRICTED data sharing externally:
1. CISO approval (or delegate)
2. Legal review (if new recipient type)
3. Data minimization confirmation
4. Secure transfer method verification
5. Audit log entry
```

---

## Module 6: IMSI/MSISDN Masking Procedures

### Understanding the Identifiers

| Identifier | Full Name | Format | Sensitivity |
|------------|-----------|--------|-------------|
| **IMSI** | International Mobile Subscriber Identity | 15 digits (e.g., 602039000000001) | EXTREME - Unique subscriber identifier |
| **MSISDN** | Mobile Station International ISDN Number | Phone number (e.g., +2135551234567) | HIGH - Directly identifies subscriber |
| **IMEI** | International Mobile Equipment Identity | 15 digits | HIGH - Device identifier |
| **TMSI** | Temporary Mobile Subscriber Identity | Hex string | Medium - Changes frequently |

### Why Masking is Mandatory

```
WHY IMSI/MSISDN MASKING MATTERS:
==================================

1. PRIVACY PROTECTION
   ───────────────────
   These identifiers directly link to individual subscribers.
   Exposure could enable stalking, harassment, or identity theft.
   
   Example: With MSISDN → Can find social media accounts,
   track location history, conduct social engineering.

2. REGULATORY REQUIREMENT
   ──────────────────────
   ANRT regulations explicitly require protection of subscriber
   identity data. Unmasked storage/display is a violation.

3. FRAUD PREVENTION
   ──────────────────
   Unmasked identifiers in logs/databases are targets for
   insider threats and external attackers seeking to commit
   SIM swap fraud or other crimes.

4. FORENSMIC INTEGRITY
   ───────────────────
   Even legitimate investigations should use masked data
   except when full values are legally required and authorized.
```

### Masking Standards

#### Standard Masking Formats

| Context | IMSI Masking | MSISDN Masking |
|---------|--------------|---------------|
| **General Display** | `60203***********` | `+213****1234567` |
| **Log Files** | `IMSI_REDACTED` | `MSISDN_REDACTED` |
| **Reports (Internal)** | `60203[REDACTED_10]` | `+2135[REDACTED_7]` |
| **Reports (External)** | `[SUBSCRIBER_ID]` | `[PHONE_NUMBER]` |
| **Legal/Law Enforcement** | Full value (authorized) | Full value (authorized) |
| **Analytics/Aggregation** | Hashed value | Hashed value |

#### Implementation Examples

```python
# imsi_msisdn_masking.py - Data masking utilities

import hashlib
import re
from typing import Tuple

class TelecomIdentifierMasker:
    """Handles masking of telecom-specific identifiers"""
    
    # Regex patterns for identification
    IMSI_PATTERN = re.compile(r'^\d{15}$')
    MSISDN_PATTERN = re.compile(r'^(\+?213)?0?[5-7]\d{8}$')
    IMEI_PATTERN = re.compile(r'^\d{15}$')
    
    def __init__(self, salt: str = None):
        """
        Initialize masker with optional salt for consistent hashing
        
        Args:
            salt: Salt value for hashing (should be constant per deployment)
        """
        self.salt = salt or "djezzy-soc-masking-salt-v1"
    
    def identify_type(self, value: str) -> str:
        """
        Identify the type of telecom identifier
        
        Returns: 'imsi', 'msisdn', 'imei', or 'unknown'
        """
        if not value:
            return 'unknown'
        
        cleaned = value.replace(' ', '').replace('-', '')
        
        if self.IMSI_PATTERN.match(cleaned):
            return 'imsi'
        elif self.MSISDN_PATTERN.match(cleaned):
            return 'msisdn'
        elif self.IMEI_PATTERN.match(cleaned):
            # Additional validation for IMEI (Luhn check)
            if self._validate_imei_luhn(cleaned):
                return 'imei'
        return 'unknown'
    
    def mask(self, value: str, context: str = 'general') -> str:
        """
        Mask identifier based on context
        
        Args:
            value: The identifier to mask
            context: 'general', 'log', 'report_internal', 
                     'report_external', 'analytics', 'legal'
        
        Returns:
            Masked or original value depending on context
        """
        id_type = self.identify_type(value)
        
        if id_type == 'unknown':
            return value
        
        # Legal context returns full value (with logging)
        if context == 'legal':
            self._log_access(value, id_type, 'legal_access')
            return value
        
        # Apply masking based on type and context
        if id_type == 'imsi':
            return self._mask_imsi(value, context)
        elif id_type == 'msisdn':
            return self._mask_msisdn(value, context)
        elif id_type == 'imei':
            return self._mask_imei(value, context)
        
        return value
    
    def _mask_imsi(self, value: str, context: str) -> str:
        """Apply IMSI masking based on context"""
        cleaned = value.replace(' ', '')
        
        if context == 'log':
            return '[IMSI_REDACTED]'
        elif context == 'report_external':
            return '[SUBSCRIBER_ID]'
        elif context == 'analytics':
            return self._hash_value(cleaned)
        else:  # general, report_internal
            # Show MCC+MNC (first 5-6 digits), mask rest
            if len(cleaned) >= 6:
                return cleaned[:6] + '*' * (len(cleaned) - 6)
            return '*' * len(cleaned)
    
    def _mask_msisdn(self, value: str, context: str) -> str:
        """Apply MSISDN masking based on context"""
        cleaned = value.replace(' ', '').replace('+', '').replace('-', '')
        
        if context == 'log':
            return '[MSISDN_REDACTED]'
        elif context == 'report_external':
            return '[PHONE_NUMBER]'
        elif context == 'analytics':
            return self._hash_value(cleaned)
        else:  # general, report_internal
            # Show country code prefix, mask rest
            if len(cleaned) >= 8:
                # Preserve area code pattern if Algerian
                if cleaned.startswith('213'):
                    return '+213' + '*' * (len(cleaned) - 3)
                elif cleaned.startswith('0'):
                    return '0' + '*' * (len(cleaned) - 1)
                return '*' * 4 + cleaned[-4:]  # Show last 4
            return '*' * len(cleaned)
    
    def _mask_imei(self, value: str, context: str) -> str:
        """Apply IMEI masking based on context"""
        cleaned = value.replace(' ', '')
        
        if context in ['log', 'report_external']:
            return '[DEVICE_ID]'
        elif context == 'analytics':
            return self._hash_value(cleaned)
        else:
            # Show TAC (Type Allocation Code), mask serial
            if len(cleaned) >= 8:
                return cleaned[:8] + '*' * (len(cleaned) - 8)
            return '*' * len(cleaned)
    
    def _hash_value(self, value: str) -> str:
        """
        Create consistent hash of value for analytics use
        Allows correlation without exposing actual value
        """
        hash_input = f"{self.salt}:{value}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]
    
    def _validate_imei_luhn(self, imei: str) -> bool:
        """Validate IMEI using Luhn algorithm"""
        if len(imei) != 15 or not imei.isdigit():
            return False
        
        total = 0
        for i, digit in enumerate(imei):
            n = int(digit)
            if i % 2 == 1:  # Double every second digit from right
                n *= 2
                if n > 9:
                    n -= 9
            total += n
        
        return total % 10 == 0
    
    def _log_access(self, value: str, id_type: str, reason: str):
        """Log access to unmasked identifiers"""
        import datetime
        # In production, this would write to secure audit log
        audit_entry = {
            'timestamp': datetime.datetime.utcnow().isoformat(),
            'identifier_type': id_type,
            'identifier_hash': hashlib.sha256(value.encode()).hexdigest()[:8],
            'access_reason': reason,
            'user': 'current_user'  # Would get from session
        }
        print(f"[AUDIT] {audit_entry}")  # Placeholder


# Usage examples
if __name__ == "__main__":
    masker = TelecomIdentifierMasker()
    
    # Test data
    test_values = [
        ("602039000000001", "IMSI"),
        ("+2135551234567", "MSISDN"),
        ("359693030073231", "IMEI")
    ]
    
    contexts = ['general', 'log', 'report_internal', 'report_external', 'analytics']
    
    print("MASKING DEMONSTRATION")
    print("=" * 80)
    
    for value, id_type in test_values:
        print(f"\n{id_type}: {value}")
        print("-" * 40)
        for ctx in contexts:
            masked = masker.mask(value, ctx)
            print(f"  {ctx:20s}: {masked}")
```

### Masking in Practice

#### When Masking Applies

| Situation | Masking Required? | Notes |
|-----------|-------------------|-------|
| Alert display in UI | ✅ Yes | Always mask by default |
| Case notes in TheHive | ✅ Yes | Use masked form |
| Reports to management | ⚠️ Partial | May show partial for investigation |
| ANRT notifications | ⚠️ Case-by-case | Follow notification guidelines |
| Law enforcement request | ❌ No (with auth) | Full values with proper authorization |
| Threat intelligence sharing | ✅ Yes | Always share hashed/masked versions |
| Analytics/aggregation | ✅ Yes | Use hashed values for correlation |
| Debugging/troubleshooting | ⚠️ Limited | Use full only in secure dev environments |

---

## Module 7: Audit and Compliance Verification

### Internal Audit Procedures

The SOC undergoes regular audits to verify compliance:

```
AUDIT CALENDAR:
===============

┌─────────────────────────────────────────────────────────────────────┐
│                    ANNUAL AUDIT SCHEDULE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q1 (January-March)                                               │
│  ├─ January: Annual security policy review                       │
│  ├─ February: Access control audit (user reviews)                │
│  └─ March: ANRT annual report submission                          │
│                                                                     │
│  Q2 (April-June)                                                 │
│  ├─ April: Vulnerability management audit                         │
│  ├─ May: Data retention and disposal verification                 │
│  └─ June: Mid-year compliance self-assessment                     │
│                                                                     │
│  Q3 (July-September)                                             │
│  ├─ July: Third-party risk assessment update                     │
│  ├─ August: Incident response drill/test                         │
│  └─ September: Training compliance verification                   │
│                                                                     │
│  Q4 (October-December)                                           │
│  ├─ October: Penetration test results review                     │
│  ├─ November: Disaster recovery test                              │
│  └─ December: Year-end compliance report                         │
│                                                                     │
│  AD-HOC                                                            │
│  ├─ ANRT requested audits (any time)                             │
│  ├─ Post-incident reviews                                         │
│  └─ System change impact assessments                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Audit Preparation Checklist

When notified of an upcoming audit:

```markdown
## AUDIT PREPARATION CHECKLIST

### 2 Weeks Before Audit
□ Review scope and objectives of audit
□ Identify relevant documentation
□ Brief team members who may be interviewed
□ Verify access control records are current
□ Test retrieval of requested evidence types

### 1 Week Before Audit
□ Compile documentation package
□ Prepare demonstration environment (if applicable)
□ Brief executive sponsor
□ Confirm auditor logistics (access, workspace)
□ Review previous audit findings and remediation status

### Day of Audit
□ Welcome auditor and provide orientation
□ Provide requested documentation promptly
□ Accommodate interviews as scheduled
□ Take notes on questions and concerns raised
□ Document any additional requests

### After Audit
□ Review draft findings
□ Prepare responses to findings
□ Develop remediation plans for gaps
□ Track remediation to closure
□ Update procedures based on lessons learned
```

### Common Audit Findings and Remediation

| Finding Category | Common Issues | Remediation |
|-----------------|---------------|-------------|
| **Documentation** | Outdated procedures, missing evidence | Regular doc review cycle |
| **Access Control** | Orphaned accounts, excessive privileges | Quarterly access reviews |
| **Logging** | Gaps in audit trail, short retention | Centralized logging, extended retention |
| **Training** | Incomplete training records | LMS tracking, reminders |
| **Incident Response** | Timeline gaps, incomplete documentation | Improved case management |
| **Data Protection** | Unmasked data in inappropriate locations | Automated masking tools |

---

## Practical Scenarios

### Scenario 1: The Curious Analyst

**Situation:** During a slow shift, an analyst decides to look up phone numbers of celebrities or people they know in the subscriber database.

**Questions:**
1. Is this allowed?
2. What policy does it violate?
3. What should happen?

**Answer:**
1. **NO** - This is strictly prohibited
2. Violates: Data minimization principle, acceptable use policy, privacy regulations
3. Consequences: Disciplinary action, potential termination, possible legal liability

**Correct Action:** If you observe this behavior, report to SOC Lead and/or HR. If you're tempted, DON'T DO IT.

### Scenario 2: The Urgent Request

**Situation:** A manager urgently asks you to pull the call records for a specific MSISDN. They say it's for a "customer complaint."

**Questions:**
1. Should you fulfill this request?
2. What verification should you do?
3. How do you handle this properly?

**Answer:**
1. Not immediately - requires verification
2. Check:
   - Is there an open ticket/case referencing this?
   - Does the requester have legitimate need?
   - Is this a fishing expedition or real investigation?
3. Proper handling:
   - Request formal ticket/reference
   - Verify through official channels
   - Log the request and your actions
   - Apply masking unless full values justified
   - Escalate if pressure seems inappropriate

### Scenario 3: The ANRT Notification

**Situation:** You discover a breach that appears to affect 50,000 subscriber records. You believe it started 3 days ago.

**Questions:**
1. Do you need to notify ANRT?
2. By when?
3. Who needs to be involved?

**Answer:**
1. **YES** - Absolutely
2. **IMMEDIATELY** - Within 4 hours of confirming scope
3. Involve:
   - Your direct supervisor/SOC Lead
   - CISO
   - Legal/Compliance team
   - Corporate Communications (prepare for potential media)
   - Executive leadership (may need board notification)

---

## Assessment and Certification

### Written Examination

The compliance exam covers:

| Section | Questions | Points | Topics |
|---------|-----------|--------|---------|
| Regulatory Framework | 20 | 25% | ANRT role, laws, regulations |
| Data Protection | 20 | 25% | Principles, classifications, handling |
| Incident Notification | 15 | 20% | Timelines, templates, procedures |
| Masking Procedures | 15 | 18% | Formats, implementation, exceptions |
| Practical Application | 10 | 12% | Scenario-based decision making |

**Passing Score:** 80% (higher than other courses due to regulatory importance)

### Practical Assessment

Complete these tasks demonstrating proper handling:

| Task | Time Limit | Skills Tested |
|------|-----------|---------------|
| Classify data items | 10 min | Data classification judgment |
| Apply correct masking | 10 min | Masking format knowledge |
| Complete notification template | 15 min | Procedure familiarity |
| Make ethical decision | 10 min | Judgment in gray areas |
| Document access properly | 10 min | Audit trail understanding |

### Certification

| Certificate | Validity | Renewal Requirements |
|-------------|----------|---------------------|
| **Djezzy Compliance Certified** | 1 year | Refresher course + exam |
| **Annual Attestation** | Per year | Sign acknowledgment of policies |

### Non-Compliance Consequences

Failure to comply with these requirements can result in:

| Violation Type | Internal Consequence | External Consequence |
|---------------|---------------------|---------------------|
| Minor (first offense) | Warning, additional training | - |
| Minor (repeated) | Performance improvement plan | - |
| Major | Suspension, demotion | Potential ANRT finding |
| Serious | Termination | Fines, license impact |
| Criminal | Termination, legal referral | Prosecution possible |

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║           DJEZZY SOC COMPLIANCE QUICK REFERENCE                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  GOLDEN RULES:                                               ║
║  ✓ Subscriber data is SACRED - protect it always             ║
║  ✓ When in doubt, MASK it                                    ║
║  ✓ If unsure about sharing, DON'T                             ║
║  ✓ Document EVERYTHING                                        ║
║  ✓ Report violations - protect yourself and Djezzy          ║
║                                                               ║
║  KEY TIMELINES:                                              ║
║  Major incident → ANRT < 4 hours                             ║
║  Data breach → ANRT < 72 hours                               ║
║  Monthly stats → ANRT by 10th of month                      ║
║                                                               ║
║  MASKING DEFAULTS:                                           ║
║  IMSI:  60203*********** (show MCC+MNC only)                 ║
║  MSISDN: +213*******4567 (show country code only)            ║
║  Logs: [IMSI_REDACTED] / [MSISDN_REDACTED]                  ║
║                                                               ║
║  EMERGENCY CONTACTS:                                         ║
║  Compliance Officer: compliance@djezzy.dz                   ║
║  Legal: legal@djezzy.dz                                     ║
║  ANRT Cyber: cybersurete@anrt.dz                             ║
║  Ethics Hotline: ethics-hotline@djezzy.dz (anonymous)       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-06-01 | Compliance Team | Initial version |
| 2.0 | 2025-01-15 | CISO Office | Updated regulations, added scenarios |

---

*This document contains mandatory compliance training material. All Djezzy SOC personnel must complete this training annually. Non-compliance with the principles described herein may result in disciplinary action.*
