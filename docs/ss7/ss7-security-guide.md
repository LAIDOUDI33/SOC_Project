# SS7 Security Operations Guide

**Djezzy National SOC Platform**  
**Classification: CONFIDENTIAL - Internal Use Only**  
**Version: 1.0.0 | Last Updated: 2024**

---

## Table of Contents

1. [Overview](#overview)
2. [SS7 Protocol Architecture](#ss7-protocol-architecture)
3. [SS7 Attack Vectors in Telecom Networks](#ss7-attack-vectors-in-telecom-networks)
4. [Detection Methodologies](#detection-methodologies)
5. [Incident Response Procedures](#incident-response-procedures)
6. [ANRT Reporting Requirements](#anrt-reporting-requirements)
7. [Integration with SOC Platform](#integration-with-soc-platform)
8. [Appendices](#appendices)

---

## Overview

### Purpose

This document provides comprehensive guidance for Security Operations Center (SOC) personnel at Djezzy Algeria on identifying, analyzing, and responding to SS7 (Signaling System No. 7) security threats. SS7 is the core protocol suite used in telecommunications networks for call setup, SMS delivery, and other critical services.

### Scope

This guide covers:
- Understanding SS7 protocol vulnerabilities and attack vectors
- Real-time detection of fraudulent activities
- Incident response procedures specific to SS7 attacks
- Compliance with Autorité de Régulation des Postes et des Télécommunications d'Algérie (ANRT) requirements
- Integration with Djezzy's SOC monitoring infrastructure

### Target Audience

- SOC Analysts (Tier 1, Tier 2, Tier 3)
- Security Engineers
- Network Operations Center (NOC) personnel with security responsibilities
- Fraud Management Team members
- Compliance Officers

### Document Conventions

| Symbol/Format | Meaning |
|---------------|---------|
| ⚠️ **WARNING** | Critical security information requiring immediate attention |
| 📋 **NOTE** | Important operational context |
| 🔧 **PROCEDURE** | Step-by-step operational procedure |
| 📊 **METRIC** | Key Performance Indicator or threshold |

---

## SS7 Protocol Architecture

### Protocol Stack Overview

SS7 uses a layered architecture that provides various services for telecommunications:

```
┌─────────────────────────────────────────────┐
│           APPLICATIONS LAYER                │
│  ISUP │ MAP │ CAP │ INAP │ LCS │ SIP-I     │
├─────────────────────────────────────────────┤
│           TRANSACTION CAPABILITIES           │
│              TCAP (ITU-T Q.773)             │
├─────────────────────────────────────────────┤
│        SIGNALLING CONNECTION CONTROL         │
│             SCCP (ITU-T Q.713)              │
├─────────────────────────────────────────────┤
│            MESSAGE TRANSFER PART            │
│          MTP3 │ M3UA (SIGTRAN)             │
├─────────────────────────────────────────────┤
│               DATA LINK LAYER               │
│    MTP2 │ SCTP (for SIGTRAN transport)      │
└─────────────────────────────────────────────┘
```

### Key Protocols and Their Functions

#### MTP3 (Message Transfer Part Level 3)
- **Function**: Routing and discrimination of signaling messages
- **Security Concern**: Point code spoofing possible without authentication

#### SCCP (Signalling Connection Control Part)
- **Function**: Enhanced addressing via Global Titles (GT), connection-oriented messaging
- **Security Concern**: GT translation attacks, routing manipulation

#### TCAP (Transaction Capabilities Application Part)
- **Function**: Non-circuit related (NCR) transaction handling
- **Security Concern**: Component manipulation, operation injection

#### MAP (Mobile Application Part)
- **Function**: Subscriber management, location services, SMS routing
- **Critical Operations**:
  - `sendAuthenticationInfo` - Retrieves authentication vectors
  - `updateLocation` - Updates subscriber location
  - `insertSubscriberData` - Modifies subscriber profile
  - `routingInfoForSM` - Routes SMS messages

#### CAP (CAMEL Application Part)
- **Function**: Intelligent network services (prepaid, VPN, freephone)
- **Critical Operations**:
  - `initialDP` - Initiates service logic
  - `applyCharging` - Manages billing

#### ISUP (ISDN User Part)
- **Function**: Circuit-switched call setup and teardown
- **Security Concern**: Call interception, toll fraud

### SIGTRAN Transport

Modern networks use SIGTRAN (Signaling Transport over IP) to carry SS7 over IP networks:

```
Traditional SS7:      SIGTRAN:
MTP2 → MTP3 → SCCP   SCTP → M3UA → SCCP
                      (IP-based transport)
```

**Key Components**:
- **SCTP** (Stream Control Transmission Protocol): Reliable transport
- **M3UA** (MTP3 User Adaptation): MTP3 over IP adaptation
- **SUA** (SCCP User Adaptation): Direct SCCP over IP

---

## SS7 Attack Vectors in Telecom Networks

### 1. International Revenue Share Fraud (IRSF)

#### Description
IRSF is one of the most financially damaging telecom fraud types globally. Attackers generate high volumes of calls to international premium-rate numbers they control, sharing revenue with complicit operators in destination countries.

#### Attack Characteristics

| Indicator | Threshold | Severity |
|-----------|-----------|----------|
| International calls/hour | >10 | 🟡 Medium |
| Unique premium destinations | >5 | 🟠 High |
| Calls at exact billing intervals (60s, 180s) | Pattern match | 🔴 Critical |
| Unusual time patterns (off-hours volume) | Detected | 🟠 High |

#### Technical Implementation

```
Attack Flow:
[Compromised SIM] → [MSC] → [STP] → [IGMSC] → [International Premium Number]
                         ↓
                   [Fraudster receives revenue share]
```

#### Detection Signatures

⚠️ **CRITICAL INDICATORS**:
- Sudden spike in international traffic from single MSISDN
- Multiple calls with duration exactly at billing intervals (±5 seconds)
- Destinations matching known premium-rate number ranges (+882, +883, etc.)
- Traffic pattern inconsistent with subscriber profile

📋 **ANALYST NOTE**: IRSF often originates from compromised legitimate subscriptions or bulk-purchased prepaid SIMs. Correlate with SIM provisioning events.

---

### 2. SIM Swap Fraud

#### Description
SIM swap allows attackers to take control of a victim's phone number by socially engineering the mobile operator to issue a replacement SIM card. Once successful, attackers can intercept OTP messages, access banking accounts, and impersonate victims.

#### Attack Flow

```
Phase 1: Reconnaissance
├── Attacker gathers victim PII (via phishing, data breaches)
├── Identifies target mobile operator
└── Prepares social engineering script

Phase 2: SIM Swap Execution
├── Contacts operator (call center, retail store, dealer portal)
├── Presents forged/stolen identity documents
└── Requests replacement SIM due to "lost/damaged" SIM

Phase 3: Exploitation
├── New SIM activates → Location Update sent to HLR
├── Victim's original SIM deactivated
├── Attacker intercepts SMS OTPs
└── Accesses banking, email, cryptocurrency accounts
```

#### SS7-Level Indicators

| Event Sequence | Time Window | Risk Level |
|----------------|-------------|------------|
| Auth failure → Location Update | <5 minutes | 🔴 Critical |
| Multiple InsertSubscriberData | <1 hour | 🔴 Critical |
| Location Update from unusual VLR | Any | 🟠 High |
| Provisioning after password reset | <2 hours | 🟠 High |

#### Detection Rules (from ss7-rules.yaml)

```yaml
sim_swap:
  indicators:
    - multiple_provisioning_attempts (window: 60min, max: 2)
    - location_update_while_active_call
    - authentication_failure_burst (window: 30min, max: 5)
    - provisioning_after_password_reset (window: 2h)
```

---

### 3. Wangiri (One-Ring) Fraud

#### Description
Japanese for "one ring and cut," Wangiri involves making brief calls to thousands of numbers, hoping victims will call back to premium-rate numbers. The attacker profits from the termination charges.

#### Attack Characteristics

| Parameter | Typical Value |
|-----------|---------------|
| Call duration | 1-5 seconds |
| Ring count | Usually 1 ring |
| Answer rate | <5% (intentional) |
| Victims per hour | 100+ unique numbers |
| Callback destination | International premium rate |

#### Detection Approach

```python
# Pseudocode for Wangiri detection
def detect_wangiri(caller_records):
    if (avg_call_duration < 5 seconds AND 
        unique_victims > 20 per hour AND
        callback_number_is_premium):
        return FRAUD_INDICATOR(
            type="WANGIRI",
            severity="HIGH",
            confidence=calculate_confidence()
        )
```

---

### 4. SMS Flooding / SMShing

#### Description
Mass sending of SMS messages for spam campaigns, phishing (SMShing), or denial-of-service against individual subscribers.

#### Variants

1. **SMS Spam**: Bulk unsolicited commercial messages
2. **SMShing**: Phishing via SMS containing malicious links
3. **SMS DoS**: Overwhelming target's device with messages
4. **OTP Interception**: Combined with SIM swap for account takeover

#### Detection Thresholds

| Metric | Normal | Suspicious | Alert |
|--------|--------|------------|-------|
| SMS/minute (single sender) | <5 | 5-15 | >15 |
| SMS/hour (single sender) | <50 | 50-150 | >150 |
| URL-containing SMS ratio | <20% | 20-50% | >50% |
| Duplicate content ratio | <30% | 30-70% | >70% |

---

### 5. Location Tracking / Privacy Violation

#### Description
Abuse of SS7 location services to track subscribers without authorization. Can be used for stalking, surveillance, or corporate espionage.

#### Vulnerable Operations

- `anyTimeInterrogation`: Retrieves subscriber location from VLR
- `provideSubscriberInfo`: Provides detailed location information
- `subscribeLocationNotification`: Enables continuous tracking

#### Detection Approach

Monitor for:
- Excessive location queries for single target (>50/hour)
- Same requester querying many different targets
- Queries at high frequency (<5 min intervals)
- Foreign entities querying local subscribers

---

### 6. Call Interception / Eavesdropping

#### Description
Exploiting SS7 vulnerabilities to redirect calls through attacker-controlled infrastructure, enabling eavesdropping.

#### Methods

1. **Forwarding Manipulation**: Using MAP `registerSS` to set unconditional call forwarding
2. **Location Update Spoofing**: Forcing registration to attacker-controlled MSC
3. **Parameter Manipulation**: Modifying call setup parameters in transit

#### ⚠️ CRITICAL WARNING
Call interception is extremely difficult to detect through passive monitoring alone. Requires correlation with:
- Subscriber complaints about call quality issues
- Unexpected roaming registrations
- Anomalies in call detail records (CDRs)

---

## Detection Methodologies

### Real-Time Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SS7 MONITORING PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ STP TAP  │→→│ Collector│→→│ Analyzer │→→│  Alert   │    │
│  │(Passive) │   │ Cluster  │   │ Engine   │   │ Manager  │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│       │                              │              │          │
│       ▼                              ▼              ▼          │
│  PCAP Storage              Rule Engine       SIEM/SOC          │
│  (90-day retention)        (ss7-rules.yaml)   Integration      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Detection Techniques

#### 1. Signature-Based Detection

Uses predefined rules from `config/ss7/ss7-rules.yaml`:

**Advantages**:
- Low false positive rate for known attack patterns
- Fast processing suitable for real-time
- Easy to understand and maintain

**Limitations**:
- Cannot detect novel attack variants
- Requires continuous rule updates

**Implementation Example**:
```yaml
rules:
  irsf:
    threshold:
      international_calls_per_hour: 10
      unique_destinations: 5
      duration_pattern: "exactly_60s"
```

#### 2. Behavioral Analysis / Baseline Deviation

Establishes normal behavior profiles and detects anomalies:

**Metrics Tracked**:
- Per-subscriber call/SMS volume patterns
- Geographic calling patterns
- Time-of-day usage profiles
- Roaming behavior baselines

**Algorithm Types**:
- Statistical deviation (Z-score > 3σ)
- Machine learning (Isolation Forest, Autoencoders)
- Time series analysis (seasonal decomposition)

#### 3. Heuristic Scoring

Multi-factor risk scoring combining multiple indicators:

```
Risk Score = Σ (Indicator_Weight × Indicator_Value)

Score Ranges:
  0-25:   🟢 Low Risk - Monitor only
  26-50:  🟡 Medium Risk - Enhanced logging
  51-75:  🟠 High Risk - Alert generation
  76-100: 🔴 Critical Risk - Immediate action
```

#### 4. Correlation Analysis

Cross-referencing SS7 events with other data sources:

| Data Source | Correlation Value |
|-------------|-------------------|
| CDR Records | Verify call completion, durations |
| SIM Provisioning DB | Detect unauthorized changes |
| Customer Complaints | Validate suspected fraud |
| External Threat Intel | Known bad actors, premium ranges |
| Law Enforcement Requests | Legal interception verification |

### Tools Deployment

#### PCAP Analyzer (`services/ss7-tools/ss7-pcap-analyzer.py`)

**Purpose**: Offline analysis of captured SS7 traffic

**Usage Examples**:
```bash
# Basic analysis with JSON output
python ss7-pcap-analyzer.py capture.pcap --format json --output report.json

# Enable fraud detection with CSV export
python ss7-pcap-analyzer.py capture.pcap --fraud-check --csv-export

# Filter by protocol
python ss7-pcap-analyzer.py capture.pcap --filter MAP --verbose
```

**Output Format**:
```json
{
  "metadata": {
    "generated_at": "2024-01-15T10:30:00Z",
    "analyzer_version": "1.0.0"
  },
  "summary": {
    "total_packets_analyzed": 15420,
    "ss7_messages_extracted": 8934,
    "fraud_indicators_found": 12
  },
  "fraud_indicators": [...]
}
```

#### Traffic Simulator (`services/ss7-tools/ss7-simulator.py`)

**Purpose**: Generate realistic SS7 traffic for testing detection rules

**Usage Examples**:
```bash
# Simulate IRSF attack pattern
python ss7-simulator.py --scenario irsf_attack --rate 100 --duration 300

# Generate normal traffic mixed with attacks
python ss7-simulator.py --scenario mixed_traffic --output test_traffic.json

# List available scenarios
python ss7-simulator.py --list-scenarios
```

**Available Scenarios**:
| Scenario | Description |
|----------|-------------|
| `normal_calls` | Legitimate traffic patterns |
| `irsf_attack` | International Revenue Share Fraud |
| `sim_swap` | SIM swap fraud sequence |
| `wangiri` | One-ring fraud pattern |
| `sms_flood` | SMS flooding/spam attack |
| `mixed_traffic` | Combination of normal and malicious |
| `load_test` | High-volume throughput testing |

---

## Incident Response Procedures

### Severity Classification

| Level | Name | Response Time | Escalation |
|-------|------|---------------|------------|
| **P1** | Critical | Immediate | CISO, ANRT notification required |
| **P2** | High | <15 minutes | SOC Manager, Fraud Team |
| **P3** | Medium | <1 hour | Tier 2 Analyst |
| **P4** | Low | <24 hours | Tier 1 Analyst |

### Standard Operating Procedures

#### 🔧 SOP-001: IRSF Detection Response

**Trigger**: IRSF rule alert with confidence >80%

**Immediate Actions (T+0 to T+5 min)**:
1. ✅ Acknowledge alert in SOC ticketing system
2. ✅ Verify alert details (subscriber, destinations, volumes)
3. ✅ Execute automatic block on outgoing international calls for affected MSISDN(s)
4. ✅ Notify on-call security analyst via PagerDuty/SMS

**Investigation Phase (T+5 to T+30 min)**:
1. 📋 Pull complete CDR history (72 hours) for affected subscriber(s)
2. 📋 Check SIM provisioning records - when was SIM activated?
3. 📋 Verify subscriber identity documents on file
4. 📋 Cross-reference with known fraud databases
5. 📋 Identify all premium destinations called

**Containment Actions (T+30 min)**:
1. 🔒 If confirmed fraud: Full service suspension
2. 🔒 Flag all associated MSISDNs (same identity, address, payment method)
3. 🔒 Preserve evidence for potential law enforcement referral
4. 🔒 Calculate financial exposure for management report

**Reporting (T+1 hour)**:
1. 📊 Prepare incident summary for SOC Management
2. 📊 If financial impact >$10,000: Initiate ANRT reporting process
3. 📊 Document lessons learned for rule tuning

---

#### 🔧 SOP-002: SIM Swap Detection Response

**Trigger**: SIM swap indicator with composite score >75

**Immediate Actions (T+0 to T+2 min)**:
1. ✅ HOLD new SIM activation pending verification
2. ✅ Send warning SMS to old SIM number (if still active)
3. ✅ Create priority incident ticket
4. ✅ Page SIM Swap response team

**Verification Phase (T+2 to T+15 min)**:
1. 📋 Contact subscriber via registered alternative methods:
   - Registered email
   - Emergency contact number
   - Account recovery questions
2. 📋 Review provisioning request details:
   - Channel used (retail, call center, portal)
   - Agent ID (if applicable)
   - Identity verification method used
3. 📋 Check for recent account changes (password reset, email change)

**Resolution Paths**:

**Path A: Confirmed Legitimate**
- Release SIM hold
- Document verification completed
- No further action required

**Path B: Confirmed Fraudulent**
- Block new SIM permanently
- Restore service to original SIM
- Initiate full investigation
- Prepare law enforcement package
- Notify affected subscriber of breach

**Path C: Unable to Verify**
- Maintain SIM hold (max 4 hours)
- Require in-person verification at retail store
- Escalate to Fraud Investigation team

---

#### 🔧 SOP-003: Wangiri Response

**Trigger**: Wangiri pattern detected affecting >100 subscribers

**Immediate Actions**:
1. ✅ Block originating number(s) from network
2. ✅ Identify callback premium number(s)
3. ✅ Flag callback numbers as suspicious
4. ✅ Generate victim list for notification

**Victim Notification**:
- Send SMS warning to all called numbers
- Template: *"Djezzy Alert: You may have received a fraudulent missed call. Do not call back unknown international numbers."*

**Investigation**:
1. Trace originating subscription (may be stolen/compromised)
2. Investigate callback number ownership
3. Check for premium rate agreement violations
4. Report to GSMA Fraud Forum if cross-border

---

### Evidence Preservation Checklist

For all incidents requiring potential legal action:

- [ ] Complete PCAP captures (original format, chain of custody documented)
- [ ] SS7 message logs with timestamps (UTC)
- [ ] CDR extracts for affected period
- [ ] Subscriber profile snapshots (before/after incident)
- [ ] SIM provisioning audit trail
- [ ] Alert and response timeline (SOC ticket notes)
- [ ] Analyst notes and findings
- [ ] Financial impact calculations

**Retention Period**: Minimum 7 years per ANRT requirements

---

## ANRT Reporting Requirements

### Regulatory Framework

The **Autorité de Régulation des Postes et des Télécommunications d'Algérie (ANRT)** mandates specific reporting for telecom security incidents.

### Mandatory Reportable Events

| Category | Reporting Deadline | Format |
|----------|-------------------|--------|
| Critical fraud incidents (loss >$50K) | Within 24 hours | ANRT-FR-001 |
| SIM swap fraud (confirmed) | Within 48 hours | ANRT-FR-001 |
| Network security breaches | Within 4 hours | ANRT-SEC-001 |
| Monthly fraud summary | By 5th of following month | ANRT-FR-002 |
| Quarterly security posture | Within 30 days of quarter end | ANRT-SEC-002 |

### Report Format (ANRT-FR-001)

```json
{
  "report_id": "DJEZZY-2024-00123",
  "report_type": "FRAUD_INCIDENT",
  "submission_timestamp": "2024-01-15T14:30:00Z",
  "operator_id": "DZ-DJEZZY",
  
  "incident_details": {
    "detection_datetime": "2024-01-14T22:15:00Z",
    "incident_category": "IRSF",
    "anrt_category": "FRAUD-IRSF",
    "severity": "CRITICAL",
    
    "affected_subscribers": {
      "count": 3,
      "msisdns_redacted": ["21355****123", "21366***456", "21379***789"]
    },
    
    "financial_impact": {
      "estimated_loss_usd": 25000,
      "currency": "USD",
      "calculation_method": "termination_charges_incurred"
    }
  },
  
  "attack_analysis": {
    "attack_vector": "International premium rate calls",
    "entry_point": "Compromised prepaid subscriptions",
    "duration_minutes": 127,
    "calls_generated": 1847,
    "destinations_affected": 12,
    
    "indicators_of_compromise": [
      "Premium rate destinations in +882 range",
      "Call durations clustered at 60-second intervals"
    ]
  },
  
  "response_actions": [
    {
      "action": "Subscriber blocking",
      "timestamp": "2024-01-14T22:17:00Z",
      "executed_by": "SOC Automated System"
    },
    {
      "action": "International barring applied",
      "timestamp": "2024-01-14T22:18:00Z",
      "executed_by": "SOC Analyst A. Benali"
    }
  ],
  
  "remediation_status": "CONTAINED",
  "law_enforcement_referral": false,
  "additional_notes": ""
}
```

### Submission Method

**Primary**: Secure API endpoint  
`https://reporting.anrt.dz/api/v1/incidents`

**Backup**: Encrypted email to `security-incidents@anrt.dz`

**Authentication**: X.509 certificate issued by ANRT PKI

---

## Integration with SOC Platform

### Architecture Overview

The SS7 security tools integrate with the broader Djezzy SOC platform:

```
                    ┌─────────────────────────┐
                    │   Djezzy SOC Platform    │
                    │                          │
  ┌─────────────────┼─────────────────────────┼──────────────────┐
  │                 │                         │                  │
  │  ┌──────────┐   │   ┌───────────────┐    │  ┌────────────┐  │
  │  │ SIEM     │◄──┼──►│ SS7 Security  │◄──┼──│ Fraud Mgmt │  │
  │  │ (QRadar) │   │   │ Module        │    │  │ Platform   │  │
  │  └──────────┘   │   └───────────────┘    │  └────────────┘  │
  │                 │         ▲              │                  │
  │  ┌──────────┐   │         │              │  ┌────────────┐  │
  │  │ SOAR     │◄──┼─────────┘              ├──│ Ticketing  │  │
  │  │ (Phantom)│   │                        │  │ (ServiceNow)│  │
  │  └──────────┘   │   ┌───────────────┐    │  └────────────┘  │
  │                 │   │ Config Store  │    │                  │
  │  ┌──────────┐   │   │ (YAML files)  │    │  ┌────────────┐  │
  │  │ Threat   │◄──┼──►│               │◄──┼──│ Dashboard  │  │
  │  │ Intel    │   │   └───────────────┘    │  │ (Grafana)  │  │
  │  └──────────┘   │                        │  └────────────┘  │
  └─────────────────┴────────────────────────┴──────────────────┘
```

### Configuration Files Location

All SS7 security configurations are stored under `config/ss7/`:

| File | Purpose | Reload Required |
|------|---------|-----------------|
| `ss7-rules.yaml` | Fraud detection rules and thresholds | Yes (hot-reload supported) |
| `network-topology.yaml` | Network node definitions | Only for topology display |
| `diameter-mapping.yaml` | Protocol interworking definitions | Only for IWF operations |

### API Endpoints

The SS7 module exposes the following internal APIs:

```
POST /api/ss7/analyze
  Body: { "pcap_file": "/path/to/capture.pcap", "options": {...} }
  Response: AnalysisReport JSON

POST /api/ss7/simulate
  Body: { "scenario": "irsf_attack", "rate": 100, "duration": 300 }
  Response: SimulationStats JSON

GET /api/ss7/rules
  Response: Current active rules

PUT /api/ss7/rules/{rule_id}/threshold
  Body: { "international_calls_per_hour": 15 }
  Response: Updated rule

GET /api/ss7/alerts?severity=critical&status=open
  Response: Active alerts list

POST /api/ss7/alerts/{alert_id}/acknowledge
  Response: Acknowledged alert
```

### Dashboard Metrics

Key metrics displayed on SOC dashboard:

**Real-time (refreshed every 30 seconds)**:
- Active fraud alerts by severity
- Messages per second by protocol
- Top 10 suspicious subscribers
- Rule hit counts

**Hourly/Daily Trends**:
- Fraud attempts detected vs. confirmed
- Average detection latency
- False positive rate by rule
- Financial exposure prevented

### Alert Enrichment

SS7 alerts are automatically enriched with:

1. **Subscriber Context**
   - Subscription type (prepaid/postpaid)
   - Activation date
   - Current plan
   - Roaming status

2. **Geographic Context**
   - Home wilaya
   - Current location (if available)
   - International vs. domestic classification

3. **Historical Context**
   - 72-hour usage baseline
   - Previous fraud flags
   - Recent provisioning events

4. **Threat Intelligence**
   - Known bad actor matches
   - Premium number database lookup
   - Dark web credential exposure check

---

## Appendices

### Appendix A: Quick Reference - MAP Operation Codes

| Code | Operation | Security Sensitivity |
|------|-----------|---------------------|
| 2 | updateLocation | 🟡 Medium |
| 3 | cancelLocation | 🟠 High |
| 44 | mo-forwardSM | 🟢 Low |
| 45 | mt-forwardSM | 🟢 Low |
| 46 | purgeMS | 🟠 High |
| 49 | checkIMEI | 🟢 Low |
| 50 | sendAuthenticationInfo | 🔴 Critical |
| 51 | insertSubscriberData | 🔴 Critical |
| 52 | deleteSubscriberData | 🟠 High |
| 56 | provideRoamingNumber | 🟡 Medium |
| 59 | readyForSM | 🟢 Low |
| 60 | processUnstructuredSS-Request | 🟡 Medium |
| 37 | anyTimeInterrogation | 🟠 High |

### Appendix B: Point Code Reference (Djezzy Allocation)

| Range | Node Type | Example |
|-------|-----------|---------|
| 1-10 | STP Infrastructure | STP-Algiers = 0001 |
| 20-50 | HLR Pool | HLR-Main = 0014 |
| 51-150 | MSC/VLR | MSC-Algiers = 0033 |
| 201-220 | SGSN | SGSN-1 = 00C9 |
| 240-255 | SCP/IN | SCP-Main = 00F0 |
| 256-270 | SMSC | SMSC-Djezzy = 0100 |
| 280-290 | IGMSC | IGMSC-Intl = 0118 |

### Appendix C: Contact Information

| Role | Contact | Hours |
|------|---------|-------|
| SOC Duty Phone | Internal Extension 5500 | 24/7 |
| On-Call Security Engineer | PagerDuty: @soc-security | 24/7 |
| Fraud Investigation Team | fraud-team@djezzy.dz | Business hours |
| ANRT Security Desk | security@anrt.dz | Business hours |
| GSMA Fraud Forum | fraud.forum@gsm.org | As needed |

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **CAP** | CAMEL Application Part - Intelligent Network protocol |
| **CAMEL** | Customized Applications for Mobile Networks Enhanced Logic |
| **CDR** | Call Detail Record - Billing record for communications |
| **GT** | Global Title - Address used in SCCP for routing |
| **HLR** | Home Location Register - Subscriber database |
| **IMSI** | International Mobile Subscriber Identity - Unique subscriber ID |
| **IRSF** | International Revenue Share Fraud |
| **ISUP** | ISDN User Part - Call setup protocol |
| **MAP** | Mobile Application Part - Core mobility management protocol |
| **MSISDN** | Mobile Station International PSTN Number - Phone number |
| **MTP3** | Message Transfer Part level 3 - Routing layer |
| **PC** | Point Code - Node address in SS7 network |
| **SCCP** | Signalling Connection Control Part - Enhanced addressing |
| **SIGTRAN** | Signaling Transport - SS7 over IP (SCTP/M3UA) |
| **SIM** | Subscriber Identity Module - Smart card in mobile device |
| **SCTP** | Stream Control Transmission Protocol - Transport for SIGTRAN |
| **TCAP** | Transaction Capabilities Application Part - Transaction handling |
| **VLR** | Visitor Location Register - Temporary subscriber data |
| **Wangiri** | Japanese: "One ring and cut" - Call-back fraud technique |

### Appendix E: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01-15 | SOC Engineering | Initial release |

---

**END OF DOCUMENT**

*For questions or clarifications, contact the SOC Engineering team at soc-engineering@djezzy.dz*
