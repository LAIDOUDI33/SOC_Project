# SOC Analyst Fundamentals Training

**Document ID:** SOC-TRN-001  
**Version:** 2.0  
**Classification:** Internal Training Material  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Training Team

---

## Table of Contents

1. [Course Overview](#course-overview)
2. [Module 1: Introduction to Security Operations](#module-1-introduction-to-security-operations)
3. [Module 2: Djezzy SOC Platform Architecture](#module-2-djezzy-soc-platform-architecture)
4. [Module 3: Tool Familiarization](#module-3-tool-familiarization)
5. [Module 4: SIEM Operations (Wazuh/Elasticsearch)](#module-4-siem-operations-wazuhelasticsearch)
6. [Module 5: SOAR Platform (TheHive/Cortex)](#module-5-soar-platform-thehivecortex)
7. [Module 6: EDR Operations (OSQuery/GRR)](#module-6-edr-operations-osquerygrr)
8. [Module 7: Network Security Monitoring](#module-7-network-security-monitoring)
9. [Module 8: Basic Threat Detection Techniques](#module-8-basic-threat-detection-techniques)
10. [Practical Exercises](#practical-exercises)
11. [Assessment and Certification](#assessment-and-certification)

---

## Course Overview

### Target Audience

This course is designed for:
- New SOC analysts joining the Djezzy National SOC team
- IT security staff transitioning to SOC roles
- Junior analysts seeking foundational knowledge
- Cross-functional team members requiring SOC awareness

### Prerequisites

Before beginning this course, participants should have:
- Basic understanding of networking concepts (TCP/IP, DNS, HTTP)
- Familiarity with operating systems (Windows, Linux)
- Fundamental cybersecurity awareness
- Willingness to learn and investigate

### Learning Objectives

Upon completion of this course, analysts will be able to:

| Objective | Description | Assessment Method |
|-----------|-------------|-------------------|
| **LO1** | Explain the role and function of a SOC in telecom environment | Written exam |
| **LO2** | Navigate and utilize all core SOC platform tools | Practical lab |
| **LO3** | Perform basic alert triage using established procedures | Scenario exercise |
| **LO4** | Identify common attack indicators across log sources | Case study analysis |
| **LO5** | Document findings according to SOC standards | Documentation review |
| **LO6** | Escalate incidents appropriately per severity matrix | Role-play exercise |

### Course Duration

- **Total Hours:** 40 hours (1 week intensive or 4 weeks part-time)
- **Theory:** 16 hours (40%)
- **Hands-on Labs:** 20 hours (50%)
- **Assessment:** 4 hours (10%)

### Course Schedule

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRAINING SCHEDULE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DAY 1: FOUNDATIONS                                                │
│  ┌─────────────────┬──────────────────┬──────────────────────────┐ │
│  │ 09:00 - 10:30   │ Module 1         │ Intro to SecOps          │ │
│  │ 10:45 - 12:15   │ Module 2         │ Platform Architecture    │ │
│  │ 13:00 - 14:30   │ Module 3 (Part 1)│ Tool Overview            │ │
│  │ 14:45 - 16:30   │ Lab 1            │ Platform Navigation      │ │
│  └─────────────────┴──────────────────┴──────────────────────────┘ │
│                                                                     │
│  DAY 2: SIEM & SOAR                                                │
│  ┌─────────────────┬──────────────────┬──────────────────────────┐ │
│  │ 09:00 - 11:00   │ Module 4         │ SIEM Operations          │ │
│  │ 11:15 - 12:30   │ Module 5         │ SOAR Platform            │ │
│  │ 13:30 - 16:30   │ Lab 2            │ Alert Triage Practice    │ │
│  └─────────────────┴──────────────────┴──────────────────────────┘ │
│                                                                     │
│  DAY 3: EDR & NETWORK                                              │
│  ┌─────────────────┬──────────────────┬──────────────────────────┐ │
│  │ 09:00 - 11:00   │ Module 6         │ EDR Operations           │ │
│  │ 11:15 - 12:30   │ Module 7         │ Network Security Monitor │ │
│  │ 13:30 - 16:30   │ Lab 3            │ Log Analysis             │ │
│  └─────────────────┴──────────────────┴──────────────────────────┘ │
│                                                                     │
│  DAY 4: THREAT DETECTION                                            │
│  ┌─────────────────┬──────────────────┬──────────────────────────┐ │
│  │ 09:00 - 11:00   │ Module 8         │ Detection Techniques     │ │
│  │ 11:15 - 12:30   │ Telecom Threats  │ Telco-Specific Scenarios │ │
│  │ 13:30 - 16:30   │ Lab 4            │ Investigation Exercise   │ │
│  └─────────────────┴──────────────────┴──────────────────────────┘ │
│                                                                     │
│  DAY 5: ASSESSMENT                                                 │
│  ┌─────────────────┬──────────────────┬──────────────────────────┐ │
│  │ 09:00 - 11:00   │ Review Session   │ Q&A, Topics Review       │ │
│  │ 11:15 - 13:00   │ Practical Exam   │ Hands-on Assessment      │ │
│  │ 14:00 - 15:30   │ Written Exam     │ Knowledge Test           │ │
│  │ 15:30 - 16:30   │ Certification    │ Results & Next Steps     │ │
│  └─────────────────┴──────────────────┴──────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Introduction to Security Operations

### What is a Security Operations Center (SOC)?

A Security Operations Center is a centralized function that monitors, detects, analyzes, and responds to cybersecurity incidents. For Djezzy as a major telecommunications operator, the SOC plays a critical role in protecting:

- **Network Infrastructure:** Core elements (HLR, MSC, SGSN, GGSN)
- **Subscriber Data:** Personal information of 16+ million subscribers
- **Business Systems:** Billing, CRM, enterprise applications
- **Regulatory Compliance:** ANRT requirements for telecom operators

### The SOC Mission at Djezzy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DJEZZY SOC MISSION                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "To protect Djezzy's telecommunications infrastructure,             │
│   subscriber data, and business operations through continuous        │
│   monitoring, rapid threat detection, and effective incident          │
│   response, while maintaining compliance with national              │
│   regulatory requirements."                                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CORE FUNCTIONS:                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  MONITOR    │  │  DETECT     │  │  ANALYZE    │                │
│  │  24/7/365   │  │  Threats    │  │  Alerts     │                │
│  │  All systems│  │  Anomalies  │  │  Incidents  │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  RESPOND    │  │  RECOVER    │  │  REPORT     │                │
│  │  Incidents  │  │  Systems    │  │  Metrics    │                │
│  │  Threats    │  │  Services   │  │  Compliance │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### SOC Team Structure

The Djezzy SOC operates with tiered analyst roles:

| Tier | Role | Responsibilities | Experience |
|------|------|------------------|------------|
| **Tier 1 (L1)** | SOC Analyst I | Initial triage, alert acknowledgment, basic investigation | 0-2 years |
| **Tier 2 (L2)** | SOC Analyst II | Deep investigation, threat hunting, incident handling | 2-4 years |
| **Tier 3 (L3)** | Senior Analyst | Complex incidents, threat intelligence, mentorship | 4-7 years |
| **Tier 4 (L4)** | SOC Lead | Shift management, escalation point, procedure development | 7+ years |
| **Management** | SOC Manager | Team leadership, budget, executive reporting | 10+ years |

### Key Performance Indicators (KPIs)

SOC analysts are measured on these metrics:

| KPI | Target | Measurement |
|-----|--------|-------------|
| **MTTA** (Mean Time to Acknowledge) | < 5 minutes (P1) | Alert timestamp → Acknowledge timestamp |
| **MTTT** (Mean Time to Triage) | < 15 minutes (P1) | Acknowledge → Classification complete |
| **Alerts Processed/Hour** | Varies by complexity | Individual productivity metric |
| **False Positive Rate** | < 40% | FP count / Total alerts handled |
| **Escalation Accuracy** | > 90% | Correct escalations / Total escalations |
| **Documentation Quality** | > 95% complete | Audited case completeness |

### Shift Structure

The Djezzy SOC operates 24/7/365 with rotating shifts:

```
SHIFT SCHEDULE (Example):
==========================

Morning Shift:  06:00 - 14:00 (Local Time)
Afternoon Shift: 14:00 - 22:00 (Local Time)
Night Shift:    22:00 - 06:00 (Local Time)

Shift Handover Requirements:
- Verbal briefing (minimum 15 minutes)
- Written handover document
- Open items list with ownership
- Notable events from shift
- System status summary
```

---

## Module 2: Djezzy SOC Platform Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DJEZZY NATIONAL SOC PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                          │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │   │
│  │  │   Web Dashboard  │  │   Mobile View    │  │   API Gateway│  │   │
│  │  │   (Next.js)      │  │   (Responsive)   │  │   (Caddy)    │  │   │
│  │  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │   │
│  └───────────┼────────────────────┼────────────────────┼──────────┘   │
│              │                    │                    │               │
│  ┌───────────┼────────────────────┼────────────────────┼──────────┐   │
│  │           ▼                    ▼                    ▼          │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │                  APPLICATION LAYER                      │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │   │
│  │  │  │ Alert   │ │Incident │ │Threat   │ │Telecom  │       │  │   │
│  │  │  │Service  │ │Service  │ │Intel    │ │Integ.   │       │  │   │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │  │   │
│  │  └───────┼──────────┼──────────┼──────────┼───────────────┘  │   │
│  └──────────┼──────────┼──────────┼──────────┼──────────────────┘   │
│             │          │          │          │                       │
│  ┌──────────┼──────────┼──────────┼──────────┼──────────────────┐   │
│  │          ▼          ▼          ▼          ▼                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │                    DATA LAYER                            │  │   │
│  │  │                                                         │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │   │
│  │  │  │ PostgreSQL  │  │Elasticsearch│  │    Redis     │   │  │   │
│  │  │  │ (Primary +  │  │ (Cluster)   │  │  (Cache)    │   │  │   │
│  │  │  │  Replica)   │  │             │  │             │   │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   SECURITY TOOLS LAYER                           │   │
│  │                                                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │  Wazuh   │ │ Suricata │ │  MISP    │ │OpenCTI   │          │   │
│  │  │  SIEM    │ │  IDS/NSM │ │  TIP     │ │ TIP      │          │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │   │
│  │       └──────────────┼────────────┼────────────┘               │   │
│  │                      │            │                             │   │
│  │  ┌──────────┐ ┌──────┴─────┐ ┌────┴─────┐ ┌──────────┐      │   │
│  │  │ TheHive  │ │  Cortex   │ │ OSQuery  │ │   GRR    │      │   │
│  │  │  SOAR    │ │ Analysis  │ │   EDR    │ │ IR Tool  │      │   │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────┘      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Overview

```
DATA SOURCES → INGESTION → PROCESSING → STORAGE → ANALYSIS → RESPONSE
                                                                               
┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Endpoints   │───▶│ Kafka    │───▶│ Wazuh    │───▶│PostgreSQL│───▶│ Dashboard │
│ (OSQuery)   │    │ Cluster  │    │ Parser   │    │          │    │ Display  │
└─────────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Network     │───▶│ Zeek     │───▶│Elasticse-│───▶│  Arkime  │───▶│ Analyst  │
│ (Zeek/Suricata│   │ Parser   │    │ arch     │    │ PCAP    │    │ Query   │
└─────────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ External    │───▶│ MISP API │───▶│ Enrichment│───▶│ TheHive  │───▶│ Incident │
│ Intel Feeds │    │          │    │ Engine   │    │ Cases    │    │ Response │
└─────────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘

┌─────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Telecom     │───▶│ Probe    │───▶│ Fraud    │───▶│ Alert    │───▶│ ANRT    │
│ Probes      │    │ Manager  │    │ Engine   │    │ Generator│    │ Reporting│
└─────────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Key Components Explained

#### Core Platform Services (39 services)

| Service Category | Examples | Purpose |
|------------------|----------|---------|
| **API Services** | Alerts, Incidents, Metrics, Threats | RESTful interfaces for platform functions |
| **Background Workers** | Alert processor, Log shipper, Report generator | Asynchronous task processing |
| **Authentication** | LDAP integration, SAML SSO, MFA | Identity and access management |
| **Real-time** | SSE streams, WebSocket handlers | Live data updates |

#### Security Tools Integration (15 tools)

| Tool | Category | Primary Function |
|------|----------|------------------|
| Wazuh | SIEM | Log collection, correlation, alerting |
| Elasticsearch | Search/Analytics | Log storage, search, visualization |
| Suricata | IDS/IPS | Network intrusion detection |
| Zeek | NSM | Network protocol analysis |
| Arkime | Packet Capture | Full packet capture and retrieval |
| TheHive | SOAR | Case management, collaboration |
| Cortex | Analysis | Automated analysis engines |
| MISP | Threat Intelligence | IOC sharing and management |
| OpenCTI | Threat Intelligence | Advanced threat intel platform |
| OSQuery | Endpoint Telemetry | Endpoint visibility |
| GRR | Incident Response | Remote live forensics |
| OpenVAS | Vulnerability Scanning | Vulnerability detection |
| DefectDojo | Vulnerability Management | Vulnerability lifecycle management |
| Kafka | Message Queue | Event streaming and buffering |
| Prometheus/Grafana | Monitoring | Metrics and dashboards |

---

## Module 3: Tool Familiarization

### Accessing the SOC Platform

#### Web Interface Access

```
Primary URL: https://soc.djezzy.local
Alternative: https://soc-platform.djezzy.local

Authentication Methods:
1. LDAP/Active Directory (primary)
2. SAML SSO (for corporate users)
3. MFA required for privileged access
```

#### Command-Line Access

```bash
# SSH to jump host
ssh analyst@jump.soc.djezzy.local

# From jump host, access various tools
# TheHive API
export THEHIVE_URL="https://hive.soc.djezzy.local"
export THEHIVE_KEY="your-api-key"

# Elasticsearch
export ES_URL="https://elasticsearch.soc.djezzy.local:9200"

# Kibana
# Access via: https://kibana.soc.djezzy.local
```

### Navigation Guide

#### Main Dashboard Components

```
┌─────────────────────────────────────────────────────────────────────┐
│  DJEZZY SOC PLATFORM - MAIN DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HEADER BAR                                                  │   │
│  │  [Logo]  Djezzy SOC  [Search...]  [🔔] [👤] [⚙️]           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ ALERTS SUMMARY │  │ INCIDENT STATUS │  │ THREAT LEVEL   │       │
│  │ Total: 1,234   │  │ Active: 12     │  │ 🔴 Elevated    │       │
│  │ New: 56        │  │ Today: 28      │  │ Score: 78/100  │       │
│  │ P1: 3          │  │ Resolved: 156  │  │               │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  SIDEBAR NAVIGATION                                         │   │
│  │                                                             │   │
│  │  📊 Dashboard                                               │   │
│  │  🚨 Alerts                                                  │   │
│  │  📋 Incidents                                               │   │
│  │  🔍 Threat Intelligence                                     │   │
│  │  📡 Telecom                                                 │   │
│  │  📈 Analytics                                               │   │
│  │  ⚙️ Administration                                          │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  MAIN CONTENT AREA                                          │   │
│  │  [Alert Feed]  [Metrics]  [Timeline]  [Activity]            │   │
│  │                                                             │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │ Recent Alerts Table                                  │   │   │
│  │  │ Time | Severity | Source | Title | Status | Actions  │   │   │
│  │  │ ...  | ...      | ...   | ...  | ...    | [...]     │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `G` then `A` | Go to Alerts | Global |
| `G` then `I` | Go to Incidents | Global |
| `G` then `T` | Go to Threat Intel | Global |
| `/` | Focus search bar | Global |
| `Esc` | Close modal/dialog | Global |
| `J` / `K` | Navigate down/up in lists | Tables |
| `Enter` | Open selected item | Lists |
| `E` | Expand item details | Alerts |
| `A` | Acknowledge alert | Alerts (when selected) |
| `Esc` then `E` | Escalate alert | Alerts (when selected) |

---

## Module 4: SIEM Operations (Wazuh/Elasticsearch)

### Understanding SIEM Architecture

The Djezzy SOC uses Wazuh integrated with Elasticsearch for security information and event management.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SIEM ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DATA SOURCES                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │Wazuh    │ │Windows  │ │Linux    │ │Network  │ │Telecom  │     │
│  │Agents   │ │Events   │ │Syslog   │ │Devices  │ │Probes   │     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘     │
│       └────────────┴────────────┴────────────┴────────────┘        │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WAZUH SERVER                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │  │ Wazuh       │  │ Decoders    │  │ Rules       │        │   │
│  │  │ Manager     │  │ (Parse)     │  │ (Correlate) │        │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │   │
│  │         └────────────────┼────────────────┘                 │   │
│  │                          ▼                                  │   │
│  │  ┌───────────────────────────────────────────────────┐    │   │
│  │  │ Alert Generation (based on rule matches)           │    │   │
│  │  └───────────────────────┬───────────────────────────┘    │   │
│  └──────────────────────────┼────────────────────────────────┘   │
│                             │                                      │
│                             ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  ELASTICSEARCH CLUSTER                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ Node 1  │  │ Node 2  │  │ Node 3  │  │ (Hot)   │       │   │
│  │  │(Master) │  │(Data)   │  │(Data)   │  │Indices  │       │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                             │                                      │
│                             ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  VISUALIZATION & ANALYSIS                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │  │ Kibana      │  │ Grafana     │  │ SOC UI      │        │   │
│  │  │ Dashboards  │  │ Metrics     │  │ Integration  │        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Working with Alerts in Kibana

#### Basic Alert Search

```json
// Example: Find all high-severity alerts from last hour
GET /wazuh-alerts-*/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "timestamp": {
              "gte": "now-1h"
            }
          }
        },
        {
          "term": {
            "rule.level": 10  // High severity rules
          }
        }
      ]
    }
  },
  "sort": [
    { "timestamp": "desc" }
  ],
  "size": 50
}
```

#### Common Search Patterns

| Use Case | KQL Query | Description |
|----------|-----------|-------------|
| Authentication failures | `rule.description:"authentication failure"` | Failed login attempts |
| Malware detection | `rule.mitre.id:*` | MITRE ATT&CK mapped alerts |
| Specific source IP | `srcip:"192.168.1.100"` | Activity from specific IP |
| Windows events | `system.windows.eventID:*` | Windows security events |
| Rule group | `rule.groups:"web"` | Web application attacks |

### Alert Lifecycle Understanding

```
ALERT LIFECYCLE:
===============

Event Generated → Decoded → Rule Matched → Alert Created 
       │              │           │               │
       ▼              ▼           ▼               ▼
   [Raw Log]    [Parsed]    [Correlated]    [In Queue]
                                           │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                          [New] --------→ [Acknowledged] ----→ [In Progress]
                              │              │                   │
                              │              ▼                   ▼
                              │        [False Positive]    [True Positive]
                              │              │                   │
                              │              ▼                   ▼
                              │           [Closed]    [Escalated → Incident]
                              │
                              └────────→ [Aging (auto-close after X days)]
```

---

## Module 5: SOAR Platform (TheHive/Cortex)

### TheHive Case Management

TheHive serves as our primary case management and collaboration platform.

#### Creating a Case

```python
# Example: Create case via TheHive API
import requests

THEHIVE_URL = "https://hive.soc.djezzy.local/api/v1"
API_KEY = "your-api-key"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

case_data = {
    "title": "Suspicious activity from external IP",
    "description": """
    ## Summary
    Multiple authentication failures followed by successful login 
    from IP 203.0.113.50
    
    ## Timeline
    - 08:15:23 UTC - First failed attempt
    - 08:15:25 UTC - Second failed attempt  
    - 08:17:01 UTC - Successful login (user: jsmith)
    
    ## Initial Assessment
    - Possible credential stuffing or brute force
    - Requires user verification
    """,
    "tags": ["brute-force", "authentication", "external-ip"],
    "tlp": 2,  # Amber
    "severity": 2,  # High
    "flag": True,
    "customFields": {
        "source-ip": "203.0.113.50",
        "affected-user": "jsmith",
        "initial-classification": "potential-compromise"
    }
}

response = requests.post(
    f"{THEHIVE_URL}/case",
    headers=headers,
    json=case_data
)

case = response.json()
print(f"Case created: {case['id']} - {case['caseId']}")
```

#### Case Workflow States

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Open    │───▶│ InProgress│───▶│ Resolved │───▶│  Closed  │
│  (New)   │    │(Active)  │    │(Contained│   │ (Done)   │
│          │    │          │    │ or Fixed) │           │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │              │              │              │
     │              ▼              ▼              │
     │        ┌──────────┐  ┌──────────┐         │
     └───────│Deleted   │  │ Exported │◀────────┘
              │(Cancel)  │  │(Archive) │
              └──────────┘  └──────────┘
```

### Cortex Analysis Engines

Cortex provides automated analysis capabilities that integrate with TheHive.

#### Available Analyzers

| Analyzer | Input Type | Output | Use Case |
|----------|------------|--------|----------|
| VirusTotal_GetReport | Hash, IP, Domain, URL | Reputation | Malware/threat check |
| IPInfo | IP Address | Geolocation, ASN | IP enrichment |
| Shodan | IP Address | Service info | Asset discovery |
| HybridAnalysis_GetReport | File hash | Sandbox results | Malware analysis |
| YARA_Scan | File content | YARA match | Custom detection |
| Cuckoo_Sandbox | File | Behavior report | Dynamic analysis |
| MISP_Search | IOC | Correlation | Threat intel lookup |
| OpenCTI_Lookup | IOC | Context | Advanced TI |

#### Running Analysis

```javascript
// Run VirusTotal analysis on an observable
async function runVTAnalysis(observableId, dataType) {
    const response = await fetch(
        `${CORTEX_URL}/api/analyze`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CORTEX_API_KEY}`
            },
            body: JSON.stringify({
                data: observableId,
                dataType: dataType,
                analyzers: ['VirusTotal_GetReport', 'IPInfo'],
                tlp: 2
            })
        }
    );
    
    return response.json(); // Returns job ID for polling
}

// Poll for results
async function pollAnalysisResults(jobId) {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const response = await fetch(
            `${CORTEX_URL}/api/analyzer/${jobId}`,
            { headers: { 'Authorization': `Bearer ${CORTEX_API_KEY}` }}
        );
        
        const result = await response.json();
        
        if (result.status === 'Success' || result.status === 'Error') {
            return result; // Analysis complete
        }
        
        await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
        attempts++;
    }
    
    throw new Error('Analysis timeout');
}
```

---

## Module 6: EDR Operations (OSQuery/GRR)

### OSQuery Fundamentals

OSQuery provides real-time endpoint visibility through SQL-like queries.

#### Key Concepts

```sql
-- OSQuery treats the operating system as a relational database
-- Tables represent system entities, rows are entities, columns are attributes

-- Example tables available:
-- processes, sockets, listeners, users, crontab, etc.
```

#### Essential Queries for Analysts

```sql
-- 1. Running processes with network connections
SELECT 
    p.name,
    p.pid,
    p.path,
    s.local_address,
    s.remote_address,
    s.remote_port,
    p.cmdline
FROM processes p
JOIN sockets s ON p.pid = s.pid
WHERE s.remote_address != '127.0.0.1'
ORDER BY p.name;

-- 2. Users currently logged in
SELECT 
    u.username,
    u.type,
    ll.time,
    ll.tty,
    ll.host
FROM logged_in_users ll
JOIN users u ON ll.uid = u.uid;

-- 3. Listening services (potential backdoors)
SELECT 
    p.name,
    p.pid,
    l.address,
    l.port,
    l.protocol,
    p.cmdline
FROM listening_ports l
JOIN processes p ON l.pid = p.pid
WHERE l.port > 1024  -- Focus on non-standard ports
ORDER BY l.port;

-- 4. Scheduled tasks/cron jobs (persistence mechanisms)
SELECT 
    name,
    command,
    path,
    run_user,
    run_day,
    run_time
FROM crontab;
-- Windows alternative: SELECT * FROM scheduled_tasks;

-- 5. Recently modified files in sensitive locations
SELECT 
    filename,
    path,
    mtime,
    size,
    mode
FROM file
WHERE (
    path LIKE '/etc/%' OR 
    path LIKE '/usr/local/bin/%' OR
    path LIKE '%AppData/Local/Temp%'
)
AND mtime > (strftime('%s','now') - 86400)  -- Last 24 hours
ORDER BY mtime DESC;

-- 6. Loaded kernel modules (Linux rootkit detection)
SELECT * FROM kernel_modules WHERE name NOT LIKE '%';

-- 7. USB device history
SELECT * FROM usb_devices ORDER BY time DESC LIMIT 20;

-- 8. Browser extensions (potential malicious extensions)
SELECT 
    name,
    identifier,
    version,
    path
FROM browser_plugins
WHERE path NOT LIKE '%Program Files%';
```

### GRR Rapid Response

GRR (Git Rapid Response) enables remote live forensics on endpoints.

#### Common GRR Flows

| Flow Name | Purpose | When to Use |
|-----------|---------|-------------|
| ListFiles | Browse filesystem | Locate suspicious files |
| GetFile | Retrieve file content | Collect evidence |
| NetworkConnections | Show active connections | Identify C2 |
| Processes | List running processes | Detect malware |
| RunCommand | Execute arbitrary command | Custom investigation |
| MemoryDump | Acquire RAM image | Advanced forensics |

#### Running GRR Investigations

```python
# grr_investigation.py - Example investigation workflow
from grr_api_client import grr_api
import json

# Connect to GRR server
api = grr_api.InitHttp(
    api_endpoint="http://grr.soc.djezzy.local:8000",
    auth=(username, password)
)

def investigate_host(client_id, suspicion_type="malware"):
    """Run standard investigation on a host"""
    
    client = api.Client(client_id=client_id)
    
    print(f"Investigating client: {client.data.os_info['fqdn']}")
    print(f"Last seen: {client.data.last_seen_at}")
    
    results = {}
    
    # 1. Get running processes
    print("[*] Collecting process list...")
    proc_flow = client.CreateFlow(name="Processes")
    proc_flow.WaitUntilDone()
    results['processes'] = proc_flow.GetCollectedFiles()
    
    # 2. Get network connections
    print("[*] Collecting network connections...")
    net_flow = client.CreateFlow(name="NetworkConnections")
    net_flow.WaitUntil_done()
    results['network'] = net_flow.GetCollectedFiles()
    
    # 3. Based on suspicion type, run additional flows
    if suspicion_type == "malware":
        # Get file system listing of temp directories
        vfs_flow = client.CreateFlow(
            name="ListFiles",
            args={"path": "/tmp"}
        )
        vfs_flow.WaitUntil_done()
        results['temp_files'] = vfs_flow.GetCollectedFiles()
        
    elif suspicion_type == "data_exfil":
        # Check USB history
        usb_flow = client.CreateFlow(
            name="ArtifactCollectorFlow",
            args={"artifact_list": ["WindowsUSBDevices"]}
        )
        usb_flow.WaitUntil_done()
        results['usb'] = usb_flow.GetCollectedFiles()
    
    return results

# Usage example
if __name__ == "__main__":
    CLIENT_ID = "C." + input("Enter client ID prefix: ")
    SUSPICION = input("Suspicion type (malware/data_exfil/general): ")
    
    results = investigate_host(CLIENT_ID, SUSPICION)
    
    # Save results
    with open(f"investigation_{CLIENT_ID}.json", "w") as f:
        json.dump(str(results), f, indent=2)
    
    print("Investigation complete. Results saved.")
```

---

## Module 7: Network Security Monitoring

### Tools Overview

| Tool | Function | Data Provided |
|------|----------|---------------|
| **Suricata** | IDS/IPS engine | Signature-based alerts, protocol analysis |
| **Zeek** (formerly Bro) | Network security monitor | Protocol-level logs, files extracted |
| **Arkime** | Full packet capture | PCAP retrieval, session reconstruction |

### Understanding Network Alerts

#### Suricata Alert Format

```json
{
  "timestamp": "2025-01-15T10:23:45.123Z",
  "alert": {
    "action": "allowed",
    "gid": 1,
    "signature_id": 2022401,
    "rev": 3,
    "signature": "ET TROJAN Win32.Cobalt Strike Beacon Malleable",
    "category": "A Network Trojan was detected",
    "severity": 1
  },
  "src_ip": "192.168.10.55",
  "src_port": 49152,
  "dest_ip": "203.0.113.100",
  "dest_port": 443,
  "proto": "TCP",
  "app_proto": "HTTP"
}
```

#### Key Alert Categories

| Category | Severity | Typical Response |
|----------|----------|------------------|
| **Trojan Activity** | High | Immediate investigation, potential containment |
| **Web Application Attack** | Medium | Review, block if confirmed malicious |
| **Policy Violation** | Low | Document, assess business need |
| **DNS Suspicious** | Medium-High | Investigate domain, potential C2 |
| **TLS Certificate** | Info-Low | Note unusual certificates |

### Using Arkime for Investigation

```bash
# Arkime CLI examples

# Find all sessions for an IP address
curl -s "https://arkime.soc.djezzy.local/api/sessions" \
  -H "Authorization: Bearer $ARKIME_TOKEN" \
  -d "date=-1&expression=ip==192.168.1.100"

# Find sessions to a specific destination port
curl -s "https://arkime.soc.djezzy.local/api/sessions" \
  -d "expression=port==4444&&protocols=http"

# Extract PCAP for analysis
curl -s "https://arkime.soc.djezzy.local/api/sessions/export" \
  -d "date=-1&expression=ip==192.168.1.100&&filename=suspicious_session.pcap" \
  -o /tmp/suspicious_session.pcap

# Open in Wireshark
wireshark /tmp/suspicious_session.pcap &
```

### Zeek Log Analysis

Zeek produces structured logs for different protocols:

| Log File | Content | Key Fields |
|----------|---------|------------|
| conn.log | All connections | uid, id.orig_h, id.resp_h, service |
| dns.log | DNS queries | query, qtype, answers |
| http.log | HTTP traffic | host, uri, user_agent, status_code |
| ssl.log | TLS handshake | subject, issuer, cipher |
| files.log | Transferred files | filename, mime_type, md5, sha256 |

#### Example Zeek Log Entry Analysis

```log
# conn.log entry interpretation
1589985825.123456	TCtjHh3aBfYqZ2NMSk	192.168.10.55	54321	203.0.113.100	443	tcp	internal	http	kept	F	F	0	0	0	0	0	0

Field breakdown:
- Timestamp: 1589985825.123456 (Unix epoch)
- UID: TCtjHh3aBfYqZ2NMSk (unique connection ID)
- Source IP: 192.168.10.55
- Source Port: 54321
- Dest IP: 203.0.113.100
- Dest Port: 443
- Protocol: tcp
- Service: http (detected application layer)
- Duration: internal (connection still active when logged)
- State: SF (SYN-FIN normal close)
- Bytes: 0 sent, 0 received (at time of logging)
```

---

## Module 8: Basic Threat Detection Techniques

### The Detection Mindset

Effective threat detection requires developing the right analytical mindset:

```
DETECTION MINDSET FRAMEWORK:
============================

1. CURIOSITY
   - "Why is this happening?"
   - "Is this normal for this system/user?"
   - "What else should I look for?"

2. SKEPTICISM
   - Don't accept surface explanations
   - Verify assumptions with data
   - Consider adversarial perspectives

3. ATTENTION TO DETAIL
   - Small anomalies can indicate big problems
   - Context matters - one data point rarely tells the story
   - Document everything

4. PATTERN RECOGNITION
   - Learn what "normal" looks like
   - Develop mental models of attack patterns
   - Build on previous investigations

5. PATIENCE
   - Thorough investigation takes time
   - Don't rush to conclusions
   - Follow evidence where it leads
```

### Indicator-Based Detection

#### Common IOCs (Indicators of Compromise)

| IOC Type | Example | Detection Method |
|----------|---------|------------------|
| **IP Address** | 203.0.113.50 | SIEM queries, firewall logs |
| **Domain** | evil.example.com | DNS logs, proxy logs |
| **URL** | http://evil.example.com/payload.exe | Proxy, DNS |
| **File Hash (MD5/SHA)** | abc123... | EDR, antivirus |
| **Email Subject** | "URGENT: Invoice Due" | Email gateway |
| **Registry Key** | HKLM\Run\Malware | EDR telemetry |
| **Named Pipe** | \\\\.\\pipe\\malware | EDR, process monitoring |
| **User-Agent** | MalwareBot/1.0 | Web logs |

#### Searching for IOCs

```bash
# Multi-source IOC search script
#!/bin/bash
IOC_VALUE=$1
echo "Searching for IOC: $IOC_VALUE"

# 1. Search Elasticsearch/Wazuh
curl -s "$ES_URL/wazuh-alerts-*/_search" -H 'Content-Type: application/json' -d "
{
  \"query\": {
    \"multi_match\": {
      \"query\": \"$IOC_VALUE\",
      \"fields\": [\"srcip\", \"destip\", \"url\", \"domain\"]
    }
  }
}" | jq '.hits.hits[]._source'

# 2. Search MISP
curl -s "$MISP_URL/attributes/restSearch" \
  -H "Authorization: $MISP_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"value\": \"$IOC_VALUE\"}" | jq '.response.Attribute[]'

# 3. Search Arkime sessions
curl -s "$ARKIME_URL/api/sessions?expression=ip==$IOC_VALUE" \
  -H "Authorization: Bearer $ARKIME_TOKEN"
```

### Behavioral Detection

Behavioral detection looks for patterns rather than specific indicators:

| Behavior Pattern | Potential Threat | Detection Approach |
|-----------------|-----------------|-------------------|
| Unusual login time/location | Compromised account | UEBA, geo-analysis |
| Large data transfer | Exfiltration | DLP, network monitoring |
| New process spawning | Malware execution | EDR process tree |
| Privilege escalation | Attacker persistence | Audit logs, EDR |
| Lateral movement | Spread of compromise | Authentication logs, network |
| Scheduled task creation | Persistence | EDR configuration audit |

### Baseline Establishment

Understanding "normal" is crucial for detecting anomalies:

```sql
-- Establish baseline for user authentication patterns
-- This query helps understand typical behavior

SELECT 
    username,
    COUNT(*) as total_logins,
    COUNT(DISTINCT src_ip) as unique_ips,
    MIN(timestamp) as first_login,
    MAX(timestamp) as last_login,
    AVG(EXTRACT(EPOCH FROM (next_login - current_login))) as avg_interval_hours
FROM (
    SELECT 
        username,
        src_ip,
        timestamp,
        LAG(timestamp) OVER (PARTITION BY username ORDER BY timestamp) as next_login
    FROM authentication_events
    WHERE timestamp >= NOW() - INTERVAL '90 days'
) sub
GROUP BY username
HAVING COUNT(*) > 10  -- Only users with sufficient data
ORDER BY total_logins DESC;
```

---

## Practical Exercises

### Exercise 1: Alert Triage Simulation

**Scenario:** You receive the following alert during your shift:

```
ALERT DETAILS:
=============
Alert ID: ALERT-2025-0115-001
Timestamp: 2025-01-15 08:23:45 UTC
Rule: "Multiple SSH Failed Followed By Success"
Severity: Medium (P2)
Source IP: 198.51.100.23
Target Host: ssh-server-03.djezzy.local
User Account: svc_backup
Details: 5 failed attempts, 1 success at 08:23:41
```

**Tasks:**
1. Acknowledge the alert in TheHive
2. Perform initial enrichment (check IP reputation, user context)
3. Determine if this is a true positive or false positive
4. Document your findings
5. Decide on appropriate action

**Solution Framework:**

```markdown
## Exercise 1 Solution

### Step 1: Acknowledgment
- Time to acknowledge: Should be < 5 minutes
- Assign preliminary severity based on initial read

### Step 2: Enrichment
Checklist:
- [ ] IP reputation (VirusTotal, AbuseIPDB)
- [ ] Geolocation of source IP
- [ ] User account type and privileges
- [ ] Historical authentication pattern for this user
- [ ] Whether this IP has connected before
- [ ] What happened after successful login

### Step 3: Classification Decision Tree
```
Is this IP known/whitelisted?
├── YES → Likely FP (verify whitelist is current)
└── NO → Continue

Is this user's typical behavior?
├── YES (similar pattern before) → Lower suspicion
└── NO → Higher suspicion

What did the account do after login?
├── Normal operations → Possibly legitimate (complicated password?)
├── Nothing/suspended → Could be testing
├── Unusual data access → HIGH CONCERN - escalate
└── Privilege escalation → CRITICAL - escalate immediately
```

### Step 4: Documentation Template
Create case note with:
- Actions taken
- Sources queried
- Findings
- Rationale for decision

### Step 5: Action Options
- Close as FP (with suppression rule)
- Monitor enhanced (watch for recurrence)
- Escalate to L2 for deeper investigation
- Contain (disable account, block IP)
```

### Exercise 2: Log Analysis Challenge

**Scenario:** A manager reports "something weird" with their computer being slow.

**Provided Data:**
- OSQuery output from the workstation
- Last 24 hours of authentication logs
- Network connections snapshot

**Tasks:**
1. Identify any anomalies in the provided data
2. Determine if there's evidence of compromise
3. If compromised, identify the likely attack vector
4. Recommend next steps

### Exercise 3: Incident Escalation Role-Play

**Scenario:** You discover what appears to be active ransomware encryption on a finance department server.

**Tasks:**
1. Follow the escalation matrix correctly
2. Communicate effectively with the fictional SOC Manager
3. Initiate appropriate containment actions
4. Document your decisions

---

## Assessment and Certification

### Written Examination

The written examination covers all modules:

| Section | Questions | Points | Topics |
|---------|-----------|--------|--------|
| SOC Fundamentals | 15 | 15% | Roles, KPIs, structure |
| Platform Architecture | 15 | 15% | Components, data flow |
| SIEM Operations | 20 | 20% | Queries, alert types |
| SOAR/Case Management | 15 | 15% | TheHive workflows |
| EDR/Network | 20 | 20% | OSQuery, Suricata basics |
| Detection Techniques | 15 | 15% | IOCs, behavioral analysis |

**Passing Score:** 70% minimum

### Practical Examination

The hands-on test simulates real SOC scenarios:

| Task | Time Limit | Skills Tested |
|------|-----------|---------------|
| Alert triage (5 alerts) | 30 min | Prioritization, classification |
| Case creation | 15 min | Documentation, TheHive usage |
| Log analysis | 30 min | Query writing, pattern recognition |
| IOC investigation | 20 min | Multi-tool correlation |
| Escalation decision | 15 min | Judgment, communication |

### Certification Levels

Upon successful completion:

| Level | Requirement | Validity |
|-------|-------------|----------|
| **Djezzy SOC Analyst I** | Pass written (70%+) + practical (70%+) | 2 years |
| **Djezzy SOC Analyst II** | Complete additional 6 months field experience + advanced exam | 2 years |

### Continuing Education Requirements

Certified analysts must complete:

- **Quarterly:** Minimum 4 hours refresher training
- **Annually:** Recertification exam or demonstrated competency review
- **As needed:** Tool-specific training when platforms update

---

## Appendix: Quick Reference Cards

### Analyst Quick Reference

```
╔═══════════════════════════════════════════════════════════════╗
║           Djezzy SOC ANALYST QUICK REFERENCE                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SEVERITY LEVELS:                                             ║
║  P1 Critical → <15min response, immediate escalation           ║
║  P2 High     → <30min response, dedicated investigation      ║
║  P3 Medium   → <4hr response, standard processing             ║
║  P4 Low      → <24hr response, routine                        ║
║                                                               ║
║  KEY URLS:                                                     ║
║  SOC Platform:  https://soc.djezzy.local                      ║
║  TheHive:       https://hive.soc.djezzy.local                 ║
║  Kibana:        https://kibana.soc.djezzy.local               ║
║  Arkime:        https://arkime.soc.djezzy.local               ║
║                                                               ║
║  ESCALATION CONTACTS:                                         ║
║  L2 Senior:    #soc-escalations (Slack)                       ║
║  SOC Lead:     soc-lead@djezzy.dz                             ║
║  On-call:      PagerDuty: soc-oncall                          ║
║                                                               ║
║  ALWAYS REMEMBER:                                             ║
║  ✓ Document EVERYTHING                                        ║
║  ✓ Preserve evidence before cleanup                           ║
║  ✓ When in doubt, ESCALATE UP                                 ║
║  ✓ Subscriber data = automatic elevation                      ║
║  ✓ Never ignore your gut feeling                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-03-01 | Training Team | Initial curriculum |
| 1.5 | 2024-09-01 | SOC Lead | Added telecom-specific content |
| 2.0 | 2025-01-15 | Training Manager | Comprehensive update |

---

*This document supports the Djezzy SOC Analyst certification program. For questions, contact soc-training@djezzy.dz.*
