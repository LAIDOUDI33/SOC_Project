# Advanced Threat Hunting Training

**Document ID:** SOC-TRN-002  
**Version:** 2.0  
**Classification:** Internal - Sensitive Training Material  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Threat Hunting Team

---

## Table of Contents

1. [Course Overview](#course-overview)
2. [Module 1: Threat Hunting Methodology](#module-1-threat-hunting-methodology)
3. [Module 2: Hypothesis-Based Hunting](#module-2-hypothesis-based-hunting)
4. [Module 3: MITRE ATT&CK Framework](#module-3-mitre-attck-framework)
5. [Module 4: Query Techniques - Sigma](#module-4-query-techniques-sigma)
6. [Module 5: Query Techniques - YARA](#module-5-query-techniques-yara)
7. [Module 6: Telecom-Specific Hunt Scenarios](#module-6-telecom-specific-hunt-scenarios)
8. [Module 7: Advanced Investigation Techniques](#module-7-advanced-investigation-techniques)
9. [Practical Hunt Exercises](#practical-hunt-exercises)
10. [Resources and References](#resources-and-references)

---

## Course Overview

### Target Audience

This advanced course is designed for:
- SOC Analysts (Tier 2+) with 2+ years experience
- Incident Responders seeking proactive capabilities
- Security Engineers developing detection content
- Threat Intelligence analysts

### Prerequisites

Participants must have:
- Completed SOC Analyst Fundamentals (SOC-TRN-001)
- Minimum 6 months hands-on SIEM/EDR experience
- Understanding of networking and operating systems fundamentals
- Familiarity with basic SQL/log query languages

### Learning Objectives

| Objective | Description | Assessment |
|-----------|-------------|------------|
| **LO1** | Apply structured threat hunting methodology | Practical hunt |
| **LO2** | Develop and test actionable hypotheses | Hypothesis workshop |
| **LO3** | Map threats to MITRE ATT&CK framework | Mapping exercise |
| **LO4** | Create effective Sigma detection rules | Rule development |
| **LO5** | Write YARA rules for malware detection | Lab exercise |
| **LO6** | Conduct telecom-specific threat hunts | Scenario completion |
| **LO7** | Document and communicate hunt findings | Report writing |

### Course Duration

- **Total Hours:** 32 hours (4 days intensive or 6 weeks part-time)
- **Theory:** 12 hours (37.5%)
- **Hands-on Labs:** 18 hours (56.25%)
- **Assessment:** 2 hours (6.25%)

### Course Philosophy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THREAT HUNTING PHILOSOPHY                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Threat hunting is the proactive search for adversaries           │
│   who have evaded existing security controls. It requires           │
│   curiosity, creativity, and persistence."                         │
│                                                                     │
│  KEY PRINCIPLES:                                                   │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐                       │
│  │  PROACTIVE      │    │  ADVERSARY-     │                       │
│  │  MINDSET        │    │  PERSPECTIVE    │                       │
│  │                 │    │                 │                       │
│  │ Don't wait for  │    │ Think like an   │                       │
│  │ alerts - seek   │    │ attacker. What  │                       │
│  │ out threats!     │    │ would you do?   │                       │
│  └─────────────────┘    └─────────────────┘                       │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐                       │
│  │  HYPOTHESIS-    │    │  EVIDENCE-      │                       │
│  │  DRIVEN         │    │  BASED          │                       │
│  │                 │    │                 │                       │
│  │ Start with a    │    │ Every claim     │                       │
│  │ theory, prove   │    │ needs data to   │                       │
│  │ or disprove it  │    │ support it      │                       │
│  └─────────────────┘    └─────────────────┘                       │
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐                       │
│  │  ITERATIVE      │    │  CONTINUOUS     │                       │
│  │  PROCESS        │    │  IMPROVEMENT    │                       │
│  │                 │    │                 │                       │
│  │ One hunt leads  │    │ Feed findings   │                       │
│  │ to another      │    │ back into       │                       │
│  └─────────────────┘    │ detections      │                       │
│                         └─────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module 1: Threat Hunting Methodology

### The Hunting Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THREAT HUNTING LIFECYCLE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         ┌──────────────┐                           │
│                         │  1. PREPARE  │                           │
│                         │              │                           │
│                         │ Define scope │                           │
│                         │ Gather tools │                           │
│                         │ Set baselines│                           │
│                         └──────┬───────┘                           │
│                                │                                    │
│                                ▼                                    │
│                    ┌───────────────────────┐                       │
│                    │   2. FORMULATE        │                       │
│                    │   HYPOTHESIS         │                       │
│                    │                      │                       │
│                    │ "I suspect that..."  │                       │
│                    └──────────┬───────────┘                       │
│                               │                                   │
│                               ▼                                   │
│               ┌───────────────────────────────┐                   │
│               │     3. INVESTIGATE (HUNT)     │                   │
│               │                               │                   │
│               │  ┌─────────┐  ┌─────────┐   │                   │
│               │  │Query    │  │Analyze  │   │                   │
│               │  │Data     │  │Results  │   │                   │
│               │  └─────────┘  └─────────┘   │                   │
│               └──────────────┬──────────────┘                   │
│                              │                                   │
│                              ▼                                   │
│               ┌───────────────────────────────┐                   │
│               │    4. ANALYZE FINDINGS        │                   │
│               │                               │                   │
│               │  True Positive? → Triage      │                   │
│               │  False Positive? → Refine     │                   │
│               │  Inconclusive? → Deepen hunt  │                   │
│               └──────────────┬──────────────┘                   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│    │ 5A. RESPOND │ │ 5B. REFINE  │ │ 5C. CLOSE   │             │
│    │             │ │             │ │             │             │
│    │Escalate to  │ │Adjust hypo- │ │Document    │             │
│    │IR if needed │ │thesis & re- │ │negative     │             │
│    │Create IOC   ││hunt         │ │findings     │             │
│    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘             │
│           │                │               │                    │
│           └────────────────┼───────────────┘                    │
│                            │                                    │
│                            ▼                                    │
│                  ┌──────────────────┐                          │
│                  │ 6. FEEDBACK LOOP │                          │
│                  │                  │                          │
│                  │ Update detections│                          │
│                  │ Share intel      │                          │
│                  │ Improve process  │                          │
│                  └──────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Sources for Hunting

#### Primary Data Sources at Djezzy SOC

| Source | Data Type | Retention | Hunt Use Cases |
|--------|-----------|-----------|----------------|
| **Elasticsearch/Wazuh** | Log events | 90 days | Initial investigation, pattern search |
| **Arkime** | PCAP data | 14 days | Network-level analysis, C2 identification |
| **Zeek logs** | Protocol metadata | 30 days | Behavioral analysis, exfiltration |
| **OSQuery/GRR** | Endpoint telemetry | Real-time | Host-based hunting, persistence |
| **TheHive/Cortex** | Case data | Indefinite | Previous incident correlation |
| **MISP/OpenCTI** | Threat intelligence | Indefinite | IOC matching, actor attribution |

#### Data Quality Requirements

Before beginning any hunt, verify:

```bash
#!/bin/bash
# data_quality_check.sh - Pre-hunt data quality verification

echo "=== DATA QUALITY CHECK ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1. Elasticsearch cluster health
ES_HEALTH=$(curl -sf http://elasticsearch.soc.djezzy.local:9200/_cluster/health | jq -r '.status')
echo "Elasticsearch Status: $ES_HEALTH"

if [ "$ES_HEALTH" = "green" ] || [ "$ES_HEALTH" = "yellow" ]; then
  echo "✓ Elasticsearch operational"
else
  echo "✗ Elasticsearch issues detected"
fi

# 2. Check recent log ingestion
RECENT_DOCS=$(curl -sf http://elasticsearch.soc.djezzy.local:9200/wazuh-alerts-*/_count \
  -d '{"query":{"range":{"timestamp":{"gte":"now-1h"}}}}' | jq -r '.count')
echo "Documents ingested (last hour): $RECENT_DOCS"

if [ "$RECENT_DOCS" -gt 100 ]; then
  echo "✓ Normal ingestion rate"
else
  echo "⚠ Low ingestion - possible gap"
fi

# 3. Arkime connectivity
ARKIME_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://arkime.soc.djezzy.local)
echo "Arkime Status: HTTP $ARKIME_STATUS"

# 4. OSQuery agent status
ONLINE_AGENTS=$(osqueryi "SELECT COUNT(*) FROM osquery_info;" 2>/dev/null || echo "0")
echo "OSQuery Agents: Check via GRR console"

echo ""
echo "=== QUALITY CHECK COMPLETE ==="
```

### Hunt Documentation Standards

Every hunt must be documented with:

```markdown
## THUNT-[YEAR]-[SEQUENCE]: [Brief Title]

### Metadata
- **Hunter:** [Name]
- **Date Range:** [Start] to [End]
- **Data Sources Used:** [List]
- **Time Invested:** [Hours]

### Hypothesis
> State your initial hypothesis clearly.

### Methodology
Describe your approach, queries executed, tools used.

### Findings
#### Positive Findings (if any)
- Finding 1: [Description]
- Evidence: [References]
- Severity: [Assessment]

#### Negative Findings
What you searched for but didn't find (still valuable).

### Conclusions
Was hypothesis confirmed, disproven, or inconclusive?

### Recommendations
- Detection improvements
- Control gaps identified
- Further hunts suggested

### Artifacts
- Saved queries
- Exported IOCs
- Relevant screenshots
```

---

## Module 2: Hypothesis-Based Hunting

### What is a Hypothesis?

A hypothesis is a testable statement about potential adversary activity that can be proven or disproven through investigation.

#### Good vs. Bad Hypotheses

| ❌ Weak Hypothesis | ✅ Strong Hypothesis |
|-------------------|---------------------|
| "Something bad might be happening" | "An adversary may be using PowerShell for lateral movement on domain controllers" |
| "Let's look for malware" | "Based on recent Emotet campaigns, I suspect macro-enabled Office documents are being delivered via email" |
| "Check for hackers" | "Given our recent VPN deployment, credentials may be captured and reused from unmanaged devices" |

### Hypothesis Development Framework

```
HYPOTHESIS DEVELOPMENT MODEL:
============================

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   TRIGGER ──────────────────────────────────────────────────┐   │
│   What sparked this hunt idea?                              │   │
│   • Threat intelligence report                             │   │
│   • Anomaly in baseline data                               │   │
│   • Recent incident pattern                                 │   │
│   • New vulnerability disclosure                            │   │
│   • Industry trend/alert                                   │   │
│   • Red team assessment finding                            │   │
│   • Intuition/experience                                  │   │
│                                                          │   │
└──────────────────────────────────────────────────────────┘   │
                              │                                  │
                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CONTEXTUALIZE                                               │   │
│   How does this apply to Djezzy specifically?                 │   │
│   • What assets are most relevant?                           │   │
│   • What data sources do we have?                            │   │
│   • What is normal for our environment?                     │   │
│   • What controls already exist?                             │   │
│                                                                 │
└──────────────────────────────────────────────────────────┘   │
                              │                                  │
                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FORMALIZE                                                    │   │
│   Write testable hypothesis statements                         │   │
│                                                                 │
│   Template:                                                    │
│   "I hypothesize that [ADVERSARY/ACTION] is [OCCURRING]       │
│    on/in [TARGET] using [TECHNIQUE], which will manifest as    │
│    [OBSERVABLE INDICATORS]."                                  │   │
│                                                                 │
└──────────────────────────────────────────────────────────┘   │
                              │                                  │
                              ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   DERIVE QUERIES                                               │   │
│   What specific searches will test this?                       │   │
│   • What fields to search?                                     │   │
│   • What values indicate compromise?                           │   │
│   • What time range is relevant?                              │   │
│   • How to handle false positives?                             │   │
│                                                                 │
└──────────────────────────────────────────────────────────┘   │
```

### Example Hypotheses for Telecom Environment

#### Hypothesis 1: Credential Theft via Phishing

```
CONTEXT: Recent Emotet campaign targeting Algerian organizations

HYPOTHESIS:
"I hypothesize that Djezzy employees' credentials are being 
harvested through phishing emails containing malicious attachments, 
which would manifest as:
- Unusual email attachment types (.js, .vbs, .docm) reaching inboxes
- Successful authentication from new geographic locations
- MFA bypass attempts following email opens"

QUERIES TO TEST:
1. Email gateway logs for blocked/suspicious attachments
2. Authentication logs for new location/country combinations
3. MFA challenge/failure patterns correlated with email recipients
```

#### Hypothesis 2: SS7 Signaling Exploitation

```
CONTEXT: Research paper on SS7 vulnerabilities in MENA region networks

HYPOTHESIS:
"I hypothesize that external actors are exploiting SS7 protocol 
weaknesses to track subscriber locations or intercept communications, 
which would manifest as:
- Unusual SS7 MAP messages from unexpected network elements
- Location requests without corresponding service usage
- International roaming authentication anomalies"

QUERIES TO TEST:
1. SS7 firewall logs for blocked/unusual message types
2. Roaming authentication success rates by partner network
3. Location update frequency analysis per subscriber segment
```

#### Hypothesis 3: Insider Data Exfiltration

```
CONTEXT: Upcoming organizational restructuring announcement

HYPOTHESIS:
"I hypothesize that employees potentially affected by restructuring 
may attempt to exfiltrate sensitive data before changes take effect, 
which would manifest as:
- Increased access to databases containing subscriber records
- Large file transfers to personal cloud storage services
- USB device connections on workstations outside normal patterns
- After-hours database query volume increase"

QUERIES TO TEST:
1. Database audit logs for sensitive table access
2. Proxy/DNS logs for cloud storage domains
3. Endpoint telemetry for USB activity
4. Time-based analysis of data access patterns
```

### Hypothesis Testing Worksheet

```python
# hypothesis_tracker.py - Track and test hypotheses

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional
import json

class HypothesisStatus(Enum):
    PENDING = "pending"
    TESTING = "testing"
    CONFIRMED = "confirmed"
    DISPROVEN = "disproven"
    INCONCLUSIVE = "inconclusive"

@dataclass
class Hypothesis:
    id: str
    title: str
    statement: str
    trigger: str
    context: str
    status: HypothesisStatus = HypothesisStatus.PENDING
    queries: List[dict] = None
    findings: List[str] = None
    conclusions: str = ""
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        if self.queries is None:
            self.queries = []
        if self.findings is None:
            self.findings = []
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if not self.updated_at:
            self.updated_at = self.created_at
    
    def add_query(self, name: str, source: str, query: str, expected_evidence: str):
        """Add a test query for this hypothesis"""
        self.queries.append({
            'name': name,
            'source': source,
            'query': query,
            'expected_evidence': expected_evidence,
            'result': None,
            'status': 'pending'
        })
        self.status = HypothesisStatus.TESTING
        self.updated_at = datetime.utcnow().isoformat()
    
    def record_finding(self, evidence: str, significance: str):
        """Record a finding from hypothesis testing"""
        self.findings.append({
            'evidence': evidence,
            'significance': significance,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def conclude(self, status: HypothesisStatus, conclusion: str):
        """Finalize hypothesis with conclusion"""
        self.status = status
        self.conclusions = conclusion
        self.updated_at = datetime.utcnow().isoformat()
    
    def to_markdown(self) -> str:
        """Export hypothesis as markdown documentation"""
        md = f"""## {self.title}
**ID:** {self.id}
**Status:** {self.status.value}
**Created:** {self.created_at}

### Statement
{self.statement}

### Trigger
{self.trigger}

### Context
{self.context}

### Test Queries
"""
        for i, q in enumerate(self.queries, 1):
            md += f"""#### Query {i}: {q['name']}
- **Source:** {q['source']}
- **Expected Evidence:** {q['expected_evidence']}
- **Status:** {q.get('status', 'pending')}
- **Result:** {q.get('result', 'Not yet run')}
```

        if self.findings:
            md += "\n### Findings\n"
            for f in self.findings:
                md += f"- **{f['significance']}:** {f['evidence']}\n"

        md += f"""
### Conclusion
{self.conclusions}
"""
        return md


# Example usage
if __name__ == "__main__":
    hunt = Hypothesis(
        id="THUNT-2025-001",
        title="PowerShell Lateral Movement Detection",
        statement="""
        I hypothesize that adversaries who gain initial access to workstations 
        are using PowerShell remoting for lateral movement to domain controllers, 
        which would manifest as WinRM connections from non-admin workstations 
        to server segments combined with PowerShell process spawning on targets.
        """,
        trigger="Recent Citrix CVE exploitation in financial sector",
        context="Djezzy has 500+ Windows endpoints including 15 domain controllers"
    )
    
    # Add test queries
    hunt.add_query(
        name="WinRM Connections to DCs",
        source="Elasticsearch/Suricata",
        query='dest_port:5985 AND dest_ip:(10.0.0.100 OR 10.0.0.101 OR 10.0.0.102)',
        expected_evidence="Connections from non-server IPs to DC ports 5985/5986"
    )
    
    hunt.add_query(
        name="Remote PowerShell Execution",
        source="OSQuery/GRR",
        query="SELECT * FROM processes WHERE name LIKE '%powershell%' AND cmdline LIKE '%-ComputerName%';",
        expected_evidence="Processes with remote execution parameters"
    )
    
    print(hunt.to_markdown())
```

---

## Module 3: MITRE ATT&CK Framework

### Introduction to ATT&CK

MITRE ATT&CK (Adversary Tactics, Techniques, and Common Knowledge) is a knowledge base of adversary behaviors based on real-world observations.

#### Why ATT&CK Matters for Threat Hunting

```
BENEFITS OF ATT&CK FOR HUNTING:
==============================

1. COMMON LANGUAGE
   - Standardized terminology for discussing threats
   - Clear communication across teams
   - Consistent documentation

2. ADVERSARY MINDSET
   - Understand how attackers operate
   - Anticipate next steps
   - Identify gaps in visibility

3. COVERAGE ASSESSMENT
   - Map existing detections to techniques
   - Identify blind spots
   - Prioritize detection development

4. THREAT INTELLIGENCE INTEGRATION
   - Correlate reports with framework
   - Actor-specific techniques
   - Trending attack methods
```

### ATT&CK Structure

```
MITRE ATT&CK FRAMEWORK STRUCTURE:
=================================

TACTICS (The "WHY")
├── What is the adversary trying to achieve?
├── High-level goals
└── 14 tactics in Enterprise matrix

TECHNIQUES (The "HOW")
├── Specific methods to achieve tactics
├── Unique identifiers (Txxxx)
└── ~200+ techniques in Enterprise matrix

SUB-TECHNIQUES (The "DETAIL")
├── More specific variations
├── More granular identifiers (Txxxx.00x)
└── ~400+ sub-techniques

PROCEDURES / SOFTWARE (The "EXAMPLES")
├── Real-world implementations
├── Specific tools/malware observed
└── Context for detection
```

### Key Tactics for Telecom SOC

| Tactic ID | Tactic Name | Relevance to Telecom | Priority for Djezzy |
|-----------|-------------|---------------------|-------------------|
| TA0001 | Initial Access | HIGH - Phishing, supply chain | Critical |
| TA0002 | Execution | HIGH - Malware, scripts | Critical |
| TA0003 | Persistence | HIGH - Backdoors, scheduled tasks | High |
| TA0004 | Privilege Escalation | CRITICAL - Domain admin targeting | Critical |
| TA0005 | Defense Evasion | HIGH - AV evasion, logging disable | High |
| TA0006 | Credential Access | CRITICAL - Kerberos attacks | Critical |
| TA0007 | Discovery | HIGH - Network/domain enumeration | Medium |
| TA0008 | Lateral Movement | CRITICAL - RDP, PSRemoting | Critical |
| TA0009 | Collection | HIGH - Subscriber data targeting | Critical |
| TA0010 | Exfiltration | HIGH - Data theft | Critical |
| TA0011 | Command & Control | HIGH - C2 establishment | High |

### Mapping Hunts to ATT&CK

```yaml
# attck_hunt_mapping.yml - Example hunt-to-ATT&CK mapping

hunts:
  - name: "Credential Dumping Detection"
    tactic: "TA0006"  # Credential Access
    techniques:
      - "T1003.001"  # OS Credential Dumping: LSASS Memory
      - "T1557.001"  # Account Manipulation: Additional Cloud Credentials
    hypothesis: "Adversaries are attempting to dump credentials from memory"
    data_sources:
      - "Process creation (Event ID 4688)"
      - "LSASS access alerts"
      - "EDR telemetry"
    queries:
      - name: "LSASS Process Access"
        query: "process.name:lsass.exe AND event.type:access"
        
  - name: "RDP Lateral Movement"
    tactic: "TA0008"  # Lateral Movement
    techniques:
      - "T1021.001"  # Remote Services: RDP
      - "T1563.002"  # Service: RDP"
    hypothesis: "Attackers are using RDP for lateral movement"
    data_sources:
      - "Windows Security Event Log"
      - "Network connection logs"
      - "Authentication logs"
    queries:
      - name: "Unusual RDP Source"
        query: "event_id:4624 AND logon_type:10 AND NOT src_ip:(10.0.0.0/8)"

  - name: "Data Staging for Exfiltration"
    tactic: "TA0010"  # Exfiltration
    techniques:
      - "T1560.001"  # Archive Collected Data: Archive via Utility
      - "T1005"      # Data from Local System"
    hypothesis: "Insider threat staging data before exfiltration"
    data_sources:
      - "File system audit"
      - "DLP alerts"
      - "USB device logs"
    queries:
      - name: "Archive Creation in Temp"
        query: "file.path:C:\\Users\\*\\AppData\\Local\\Temp\\*.zip"
```

### ATT&CK Navigator Integration

Use ATT&CK Navigator to visualize coverage:

```javascript
// Generate layer JSON for ATT&CK Navigator
const generateLayer = () => {
  return {
    "name": "Djezzy SOC Detection Coverage",
    "versions": {
      "attack": "15",
      "navigator": "5.0.0",
      "layer": "4.5"
    },
    "domain": "enterprise-attack",
    "description": "Detection coverage for Djezzy National SOC Platform",
    "filters": {
      "platforms": ["Windows", "Linux", "Network"]
    },
    "techniques": [
      // Techniques we CAN detect
      {
        "techniqueID": "T1059",
        "color": "#00ff00",  // Green = good coverage
        "comment": "SIEM detects suspicious PowerShell execution",
        "enabled": true,
        "metadata": [
          {"name": "Detection", "value": "Wazuh rule 91122"},
          {"name": "Data Source", "value": "Windows Event Log"}
        ]
      },
      // Techniques with PARTIAL detection
      {
        "techniqueID": "T1003",
        "color": "#ffff00",  // Yellow = partial coverage
        "comment": "Only detect some credential dumping methods",
        "enabled": true,
        "metadata": [
          {"name": "Detection", "value": "Partial - EDR only"},
          {"name": "Gap", "value": "Need LSASS protection monitoring"}
        ]
      },
      // Techniques we CANNOT detect (blind spots)
      {
        "techniqueID": "T1562",
        "color": "#ff0000",  // Red = no coverage
        "comment": "No detection for defense impairment",
        "enabled": false,
        "metadata": [
          {"name": "Gap", "value": "Blind spot - need development"}
        ]
      }
    ]
  };
};
```

---

## Module 4: Query Techniques - Sigma

### What is Sigma?

Sigma is a generic signature format for log data that allows you to describe detection methods once and convert them to various target formats (Elasticsearch, Splunk, etc.).

### Sigma Rule Structure

```yaml
title: Suspicious PowerShell Execution with Encoded Command
id: djezzy_soc_001
status: experimental
description: |
  Detects PowerShell commands with encoded payloads, commonly 
  used by attackers to evade detection.
references:
  - https://attack.mitre.org/techniques/T1059/001/
author: Djezzy SOC Team
date: 2025/01/15
modified: 2025/01/15
logsource:
  category: process_creation
  product: windows
detection:
  selection_img:
    Image|endswith: '\powershell.exe'
  selection_encoded:
    CommandLine|contains:
      - '-EncodedCommand'
      - '-enc '
      - '-e '
  condition: all of selection_*
falsepositives:
  - Legitimate administrative scripts using encoding
level: high
tags:
  - attack.execution
  - attack.t1059.001
  - djezzy.telecom
```

### Sigma Conversion Pipeline

```
SIGMA RULE → TARGET QUERY
========================

Sigma Rule (YAML)
       │
       ▼
┌──────────────────┐
│  Sigma Converter │
│  (sigmac)        │
└────────┬─────────┘
         │
         ├──▶ Elasticsearch Query (for Wazuh/Kibana)
         ├──▶ KQL Query (for Microsoft Sentinel)
         ├──▶ SPL Query (for Splunk)
         ├──▶ Suricata Rule (for IDS)
         └──▶ Other formats...
```

### Writing Effective Sigma Rules

#### Best Practices

| Practice | Do ✅ | Don't ❌ |
|----------|-------|----------|
| **Specificity** | Target specific malicious behavior | Catch everything (too noisy) |
| **Context** | Include multiple conditions | Single field match only |
| **Documentation** | Explain what and why | Leave rule undocumented |
| **Testing** | Validate against real logs | Assume it works |
| **Maintenance** | Review and update regularly | Set and forget |

#### Common Patterns for Telecom SOC

```yaml
# Pattern 1: Brute Force Detection
title: Multiple Failed Authentications Followed by Success
id: djezzy_soc_bruteforce_001
status: stable
description: Detects brute force login attempts followed by successful authentication
logsource:
  product: windows
  service: security
detection:
  selection_fail:
    EventID: 4625
    LogonType:
      - 2   # Interactive
      - 10  # Remote Interactive
      - 3   # Network
  selection_success:
    EventID: 4624
  timeframe: 5m
  condition:
    selection_fail | near selection_success
falsepositives:
  - Users forgetting passwords
  - Locked accounts trying again after unlock
level: medium
tags:
  - attack.t1110.004
  - djezzy.authentication

---
# Pattern 2: Unusual Admin Activity After Hours
title: Administrative Account Activity Outside Business Hours
id: djezzy_soc_admin_hours_001
status: experimental
description: Detects privileged account usage during unusual hours
logsource:
  category: process_creation
  product: windows
detection:
  selection_time:
    TimeGenerated:
      - Mo: ['Sa', 'Su']  # Weekend
      - Hr: ['19', '20', '21', '22', '23', '00', '01', '02', '03', '04', '05', '06']
  selection_user:
    User|contains:
      - 'admin'
      - 'Administrator'
  selection_privileged:
    IntegrityLevel: 'High'
  condition: all of selection_
falsepositives:
  - Legitimate emergency maintenance
  - Automated tasks running late
level: medium
tags:
  - attack.valid_accounts
  - attack.t1078.003
  - djezzy.privileged_access

---
# Pattern 3: Potential Data Exfiltration via Archive Tools
title: Sensitive File Archiving in User Profile
id: djezzy_soc_exfil_archive_001
status: experimental
description: Detects creation of archive files in user directories, potential exfiltration prep
logsource:
  category: file_event
  product: windows
detection:
  selection_tools:
    Image|endswith:
      - '\winrar.exe'
      - '\7z.exe'
      - '\tar.exe'
      - '\zip.exe'
  selection_location:
    TargetFilename|contains:
      - '\AppData\Local\Temp'
      - '\Downloads'
      - '\Desktop'
  selection_sensitive:
    TargetFilename|contains:
      - 'subscriber'
      - 'customer'
      - 'billing'
      - 'imsi'
      - 'msisdn'
  condition: all of selection_
falsepositives:
  - Legitimate backup operations
  - Software installation archives
level: high
tags:
  - attack.collection
  - attack.t1560.001
  - djezzy.data_exfil
```

### Converting and Deploying Sigma Rules

```bash
#!/bin/bash
# sigma_deploy.sh - Convert and deploy Sigma rules to Elasticsearch

SIGMA_DIR="/opt/sigma/rules/djezzy_custom"
OUTPUT_DIR="/etc/wazuh/rules/custom_sigma"
ES_INDEX="wazuh-alerts-*"

echo "Converting Sigma rules..."

# Convert all custom rules to Elasticsearch format
sigmac -t elasticsearch -c sigma_config.yml $SIGMA_DIR/*.yml > $OUTPUT_DIR/all_rules.ndjson

# Validate output
if [ -f "$OUTPUT_DIR/all_rules.ndjson" ]; then
  RULE_COUNT=$(grep -c "^{" $OUTPUT_DIR/all_rules.ndjson 2>/dev/null || echo "0")
  echo "Converted $RULE_COUNT rules successfully"
else
  echo "ERROR: Sigma conversion failed"
  exit 1
fi

# Deploy to Wazuh/Elasticsearch
echo "Deploying rules..."
# Copy to Wazuh rules directory
cp $OUTPUT_DIR/*.ndjson /var/ossec/etc/rules/

# Restart Wazuh manager to load new rules
systemctl restart wazuh-manager

echo "Deployment complete!"
```

---

## Module 5: Query Techniques - YARA

### What is YARA?

YARA (Yet Another Recursive Acronym) is a tool for identifying and classifying malware. It creates signatures (rules) based on textual or binary patterns.

### YARA Rule Structure

```yara
rule Djezzy_Telecom_Malware_Generic : Trojan Generic {
    meta:
        description = "Generic detection for telecom-targeted malware"
        author = "Djezzy SOC Team"
        date = "2025-01-15"
        version = 1.0
        hash = "SHA256 placeholder"
    
    strings:
        // Suspicious strings commonly found in telecom malware
        $s1 = "ss7" nocase wide ascii
        $s2 = "hlr" nocase wide ascii
        $s3 = "imsi" nocase wide ascii
        $s4 = "msisdn" nocase wide ascii
        $s5 = "subscriber" nocase wide ascii
        
        // Common C2 indicators
        $c1 = "powershell" nocase
        $c2 = "-encodedcommand" nocase
        $c3 = "DownloadString" nocase
        $c4 = "[System.Convert]::FromBase64String" nocase
        
        // Suspicious API calls (in imports)
        $a1 = "VirtualAlloc" nocase
        $a2 = "CreateThread" nocase
        $a3 = "WriteProcessMemory" nocase
        
        // Hex patterns for common shellcode
        $hex1 = { E8 ?? ?? ?? ?? 45 33 C9 }  // Common prologue
        $hex2 = { 48 89 5C 24 ?? 48 89 6C 24 ?? }  // x64 stack frame
    
    condition:
        // Require multiple string matches for higher confidence
        (2 of ($s*) and 1 of ($c*)) or
        (all of ($a*) and $hex1) or
        (uint16(0) == 0x5A4D and filesize < 2MB and 3 of them)
}
```

### YARA for Different Use Cases

#### Use Case 1: Document Macro Detection

```yara
rule Djezzy_Office_Macro_Malicious {
    meta:
        description = "Detects malicious macros in Office documents"
        author = "Djezzy SOC"
        severity = "high"
    
    strings:
        // Auto-execution triggers
        $auto_open = "Auto_Open" nocase wide ascii
        $auto_close = "Auto_Close" nocase wide ascii
        $workbook_open = "Workbook_Open" nocase wide ascii
        $document_open = "Document_Open" nocase wide ascii
        
        // Shell execution
        $shell = "Shell" nocase wide ascii
        $wscript_shell = "WScript.Shell" nocase wide ascii
        $run = ".Run(" nocase wide ascii
        $exec = ".Exec(" nocase wide ascii
        
        // Download and execute
        $xmlhttp = "XMLHTTP" nocase wide ascii
        $adodb_stream = "ADODB.Stream" nocase wide ascii
        $msxml2 = "MSXML2" nocase wide ascii
        
        // Obfuscation
        $chr = "Chr(" nocase wide ascii
        $char = "Char(" nocase wide ascii
        $strreverse = "StrReverse" nocase wide ascii
    
    condition:
        (uint16(0) == 0xCF48 or uint16(0) == 0xD0CF) and
        (any of ($auto_*) and (any of ($shell*) or any of ($exec*))) or
        (any of ($xmlhttp) and any of ($adodb_stream))
}
```

#### Use Case 2: Ransomware Detection

```yara
rule Djezzy_Ransomware_Generic {
    meta:
        description = "Generic ransomware behavior detection"
        author = "Djezzy SOC"
        severity = "critical"
    
    strings:
        // Wall note / ransom message indicators
        $wallnote1 = "Your files are encrypted" nocase wide ascii
        $wallnote2 = "pay the ransom" nocase wide ascii
        $wallnote3 = "bitcoin" nocase wide ascii
        $wallnote4 = "decrypt" nocase wide ascii
        $wallnote5 = "YOUR_FILES_ARE_ENCRYPTED" nocase wide ascii
        
        // Encryption-related APIs
        $crypt1 = "CryptGenKey" nocase
        $crypt2 = "CryptEncrypt" nocase
        $rsa = "RSA" nocase
        $aes = "AES" nocase
        
        // File extension modification
        $extension = ".encrypted" nocase
        $lockbit = ".lockbit" nocase
        $blackcat = ".kittyi" nocase
        
        // Anti-analysis / anti-VM
        $vmware = "VMWARE" nocase
        $virtualbox = "VIRTUALBOX" nocase
        $sandboxie = "SANDBOXIE" nocase
    
    condition:
        (2 of ($wallnote*) and 1 of ($crypt*)) or
        (filesize < 500KB and 3 of ($wallnote*)) or
        (any of ($vmware, $virtualbox, $sandboxie) and 2 of ($wallnote*))
}
```

#### Use Case 3: Webshell Detection

```yara
rule Djezzy_Webshell_Detection {
    meta:
        description = "Detect webshells in web application files"
        author = "Djezzy SOC"
        severity = "critical"
    
    strings:
        // PHP webshells
        $php_eval = "eval(" nocase
        $php_assert = "assert(" nocase
        $php_system = "system(" nocase
        $php_exec = "exec(" nocase
        $php_passthru = "passthru(" nocase
        $php_shell_exec = "shell_exec(" nocase
        $php_base64_decode = "base64_decode(" nocase
        $php_gzinflate = "gzinflate(" nocase
        $php_str_rot13 = "str_rot13(" nocase
        $php_preg_replace = "/e\"" nocase  // Deprecated eval modifier
        
        // ASP/ASP.NET webshells
        $asp_execute = "Server.Execute(" nocase
        $asp_createobject = "Server.CreateObject(" nocase
        $asp_wscript = "WScript.Shell" nocase
        $asp_request_form = "Request.Form[" nocase
        $asp_request_qs = "Request.QueryString[" nocase
        
        // JSP webshells
        $jsp_runtime = "Runtime.getRuntime()" nocase
        $jsp_processbuilder = "ProcessBuilder" nocase
        $jsp_getwriter = "getWriter()" nocase
        
        // Common obfuscation patterns
        $obf_base64 = "base64" nocase
        $obf_chr = "chr(" nocase
        $obf_unescape = "unescape(" nocase
        $obf_fromcharcode = "fromCharCode" nocase
    
    condition:
        // PHP files
        (filename contains ".php" and 3 of ($php_*)) or
        // ASP files
        (filename contains ".asp" and 2 of ($asp_*)) or
        // JSP files
        (filename contains ".jsp" and 2 of ($jsp_*)) or
        // Any webshell with obfuscation
        (any of ($php_*, $asp_*, $jsp_*) and 2 of ($obf_*))
}
```

### Running YARA Scans

```bash
#!/bin/bash
# yara_scan.sh - Execute YARA scans against evidence

RULES_DIR="/opt/yara/rules"
SCAN_TARGET="$1"
OUTPUT_FILE="/tmp/yara_scan_$(date +%s).txt"

if [ -z "$SCAN_TARGET" ]; then
  echo "Usage: $0 <file_or_directory>"
  exit 1
fi

echo "Running YARA scan on: $SCAN_TARGET"
echo "Rules directory: $RULES_DIR"
echo "Output: $OUTPUT_FILE"
echo ""

# Run scan with recursive option for directories
if [ -d "$SCAN_TARGET" ]; then
  yara -r -w -s $RULES_DIR/* "$SCAN_TARGET" > "$OUTPUT_FILE"
elif [ -f "$SCAN_TARGET" ]; then
  yara -w -s $RULES_DIR/* "$SCAN_TARGET" > "$OUTPUT_FILE"
else
  echo "Error: $SCAN_TARGET does not exist"
  exit 1
fi

# Parse results
MATCH_COUNT=$(wc -l < "$OUTPUT_FILE")

if [ "$MATCH_COUNT" -gt 0 ]; then
  echo "⚠️  ALERT: $MATCH_COUNT rule matches found!"
  echo ""
  cat "$OUTPUT_FILE"
  
  # Extract matched rule names
  MATCHED_RULES=$(awk '{print $1}' "$OUTPUT_FILE" | sort -u)
  echo ""
  echo "Matched rules:"
  echo "$MATCHED_RULES"
  
  # If critical rules matched, alert
  if echo "$MATCHED_RULES" | grep -qi "critical\|ransomware\|webshell"; then
    echo ""
    echo "🚨 CRITICAL DETECTION - Immediate review required!"
    # Send alert to SOC platform
    curl -X POST "https://api.soc.djezzy.local/api/alerts" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": \"YARA Critical Match\",
        \"severity\": \"high\",
        \"source\": \"yara_scan\",
        \"details\": $(cat $OUTPUT_FILE | jq -Rs .)
      }"
  fi
else
  echo "✅ No rule matches found."
fi
```

---

## Module 6: Telecom-Specific Hunt Scenarios

### Hunt Scenario 1: SIM Swapping Fraud Ring

**Background:** SIM swapping attacks allow attackers to hijack phone numbers to intercept 2FA codes and access accounts.

**Hypothesis:** "An organized fraud ring may be operating inside or colluding with Djezzy staff to facilitate unauthorized SIM swaps."

**Data Sources Required:**
- Billing system audit logs
- SIM provisioning system logs
- Employee access logs
- Customer complaint records

**Hunt Queries:**

```sql
-- Query 1: Identify unusual SIM swap patterns by employee
SELECT 
    employee_id,
    employee_name,
    COUNT(*) as swaps_processed,
    COUNT(DISTINCT customer_msisdn) as unique_customers,
    MIN(swap_time) as first_swap,
    MAX(swap_time) as last_swap,
    -- Flag swaps outside normal working hours
    SUM(CASE WHEN EXTRACT(HOUR FROM swap_time) NOT BETWEEN 8 AND 18 THEN 1 ELSE 0 END) as after_hours_swaps,
    -- Flag same-day re-swaps (potential fraud indicator)
    SUM(CASE WHEN customer_msisdn IN (
        SELECT customer_msisdn 
        FROM sim_swaps 
        WHERE swap_time > NOW() - INTERVAL '90 days'
        GROUP BY customer_msisdn 
        HAVING COUNT(*) > 2
    ) THEN 1 ELSE 0 END) as repeat_customer_swaps
FROM sim_swaps
WHERE swap_time >= NOW() - INTERVAL '90 days'
GROUP BY employee_id, employee_name
HAVING COUNT(*) > 50  -- Threshold for investigation
ORDER BY swaps_processed DESC;

-- Query 2: Identify customers targeted for SIM swap multiple times
SELECT 
    msisdn,
    COUNT(*) as total_swaps,
    COUNT(DISTINCT requesting_employee) as different_employees,
    ARRAY_AGG(employee_name ORDER BY swap_time) as employee_sequence,
    MAX(swap_time) as most_recent_swap,
    -- Check if complaints followed
    EXISTS (
        SELECT 1 FROM customer_complaints c 
        WHERE c.msisdn = s.msisdn 
        AND c.complaint_type = 'sim_swap'
        AND c.complaint_date > s.swap_time - INTERVAL '7 days'
    ) as had_complaint
FROM sim_swaps s
WHERE swap_time >= NOW() - INTERVAL '180 days'
GROUP BY msisdn
HAVING COUNT(*) >= 3  -- Multiple swaps is suspicious
ORDER BY total_swaps DESC;
```

### Hunt Scenario 2: SS7 Signaling Abuse

**Background:** SS7 protocol vulnerabilities can be exploited for location tracking, call interception, and fraud.

**Hypothesis:** "External actors may be exploiting SS7 signaling weaknesses to track high-value subscribers or intercept communications."

**Hunt Queries:**

```yaml
# ss7_hunt_queries.yaml - SS7 abuse detection queries

queries:
  - name: "Unusual Location Requests"
    description: "Detect excessive location updates for single subscriber"
    source: "SS7 Firewall / HLR Audit Logs"
    query: |
      SELECT 
          imsi,
          msisdn,
          COUNT(location_update_requests) as loc_req_count,
          COUNT(DISTINCT requesting_network) as source_networks,
          MAX(request_time) as last_request,
          -- Flag if requests come from unusual networks
          BOOL_OR(requesting_network NOT IN (
              SELECT network_code FROM roaming_partners WHERE status = 'active'
          )) as from_unknown_network
      FROM ss7_signaling_log
      WHERE message_type = 'MAP_UPDATE_LOCATION'
          AND request_time >= NOW() - INTERVAL '24 hours'
      GROUP BY imsi, msisdn
      HAVING COUNT(location_update_requests) > 20  -- Abnormal threshold
      ORDER BY loc_req_count DESC;
      
  - name: "Suspicious Interception Attempts"
    description: "Detect potential call interception patterns"
    source: "SS7 Firewall Logs"
    query: |
      SELECT 
          calling_party,
          called_party,
          COUNT(intercept_attempts),
          requesting_spc,
          timestamp
      FROM ss7_signaling_log
      WHERE message_type IN ('MAP_PROVIDE_ROUTING_INFO', 'MAP_SEND_ROUTING_INFO_FOR_SM')
          AND interception_indicator = true
      GROUP BY calling_party, called_party, requesting_spc
      HAVING COUNT(*) > 3
      ORDER BY COUNT(*) DESC;
```

### Hunt Scenario 3: Billing System Manipulation

**Hypothesis:** "Insiders may be manipulating billing records to provide free service or redirect funds."

**Data Sources:**
- Billing transaction logs
- Credit adjustment audit trail
- Discount/promotion application logs
- Employee role assignments

**Indicators to Hunt:**

| Indicator | Query Logic | Risk Level |
|-----------|-------------|------------|
| Large credit adjustments | Credits > 10000 DZD by single employee | High |
| Post-billing adjustments | Adjustments > 24 hours after cycle close | High |
| Self-service credits | Employee credited own account | Critical |
| Pattern discounts | Same discount code applied repeatedly | Medium |
| Deleted transactions | Transaction deletion events | Critical |

---

## Module 7: Advanced Investigation Techniques

### Timeline Analysis

Building accurate timelines is crucial for understanding attack progression.

```python
# timeline_builder.py - Construct investigation timelines

import json
from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Any

class TimelineAnalyzer:
    """Build and analyze incident timelines from multiple sources"""
    
    def __init__(self):
        self.events = []
        self.sources = set()
    
    def add_source(self, source_name: str, events: List[Dict]):
        """Add events from a data source"""
        self.sources.add(source_name)
        
        for event in events:
            normalized = self._normalize_event(event, source_name)
            self.events.append(normalized)
    
    def _normalize_event(self, event: Dict, source: str) -> Dict:
        """Normalize event to standard format"""
        return {
            'timestamp': self._parse_timestamp(event.get('timestamp')),
            'source': source,
            'event_type': event.get('type', 'unknown'),
            'severity': event.get('severity', 'info'),
            'raw_data': event,
            'description': self._generate_description(event)
        }
    
    def _parse_timestamp(self, ts: Any) -> datetime:
        """Parse various timestamp formats"""
        if isinstance(ts, datetime):
            return ts
        if isinstance(ts, (int, float)):
            # Unix epoch
            return datetime.fromtimestamp(ts)
        if isinstance(ts, str):
            # Try common formats
            for fmt in ['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ',
                       '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S']:
                try:
                    return datetime.strptime(ts, fmt)
                except ValueError:
                    continue
        return datetime.now()  # Fallback
    
    def _generate_description(self, event: Dict) -> str:
        """Generate human-readable description"""
        templates = {
            'authentication': "{user} {action} from {src_ip} ({result})",
            'process': "Process '{name}' started (PID: {pid}, Cmdline: {cmdline})",
            'network': "Connection {direction} {src_ip}:{src_port} -> {dst_ip}:{dst_port}",
            'file_access': "File {action}: {path}",
            'dns': "DNS query: {query} -> {answer}"
        }
        
        event_type = event.get('type', 'unknown')
        template = templates.get(event_type, "Unknown event: {raw}")
        
        try:
            return template.format(**{k: str(v)[:50] for k, v in event.items()})
        except KeyError:
            return f"{event_type} event"
    
    def sort_timeline(self) -> List[Dict]:
        """Return sorted timeline"""
        return sorted(self.events, key=lambda x: x['timestamp'])
    
    def find_gaps(self, threshold_minutes: int = 30) -> List[Dict]:
        """Find time gaps in the timeline (possible evidence gaps)"""
        sorted_events = self.sort_timeline()
        gaps = []
        
        for i in range(1, len(sorted_events)):
            diff = sorted_events[i]['timestamp'] - sorted_events[i-1]['timestamp']
            
            if diff > timedelta(minutes=threshold_minutes):
                gaps.append({
                    'start': sorted_events[i-1]['timestamp'],
                    'end': sorted_events[i]['timestamp'],
                    'duration_minutes': diff.total_seconds() / 60,
                    'before_event': sorted_events[i-1]['description'],
                    'after_event': sorted_events[i]['description']
                })
        
        return gaps
    
    def identify_attack_phases(self) -> Dict[str, List[Dict]]:
        """Categorize events into attack phases"""
        phases = defaultdict(list)
        
        phase_mapping = {
            'reconnaissance': ['port_scan', 'dns_enumeration', 'directory_enumeration'],
            'initial_access': ['phishing_click', 'exploit_attempt', 'successful_login'],
            'execution': ['process_creation', 'powershell', 'cmd_execution'],
            'persistence': ['scheduled_task', 'registry_modification', 'service_creation'],
            'credential_access': ['hash_dump', 'token_theft', 'credential_dump'],
            'lateral_movement': ['remote_login', 'smb_access', 'psremoting'],
            'collection': ['file_read', 'data_access', 'screenshot'],
            'exfiltration': ['large_upload', 'dns_tunnel', 'unusual_outbound'],
            'command_control': ['beacon', 'c2_connection']
        }
        
        for event in self.events:
            categorized = False
            
            for phase, indicators in phase_mapping.items():
                if any(ind in event.get('description', '').lower() or 
                       ind in event.get('event_type', '').lower() for ind in indicators):
                    phases[phase].append(event)
                    categorized = True
                    break
            
            if not categorized:
                phases['uncategorized'].append(event)
        
        return dict(phases)
    
    def export_timeline(self, format_type: str = 'markdown') -> str:
        """Export timeline in specified format"""
        sorted_events = self.sort_timeline()
        
        if format_type == 'markdown':
            lines = ["# Investigation Timeline\n"]
            lines.append(f"**Total Events:** {len(sorted_events)}")
            lines.append(f"**Sources:** {', '.join(self.sources)}")
            lines.append(f"**Time Range:** {sorted_events[0]['timestamp']} to {sorted_events[-1]['timestamp']}\n")
            
            lines.append("| Timestamp | Source | Event | Details |")
            lines.append("|-----------|--------|-------|---------|")
            
            for event in sorted_events:
                lines.append(
                    f"| {event['timestamp']} | {event['source']} | "
                    f"{event['event_type']} | {event['description']} |"
                )
            
            return '\n'.join(lines)
        
        elif format_type == 'json':
            return json.dumps(sorted_events, indent=2, default=str)
        
        else:
            raise ValueError(f"Unknown format: {format_type}")


# Usage example
if __name__ == "__main__":
    analyzer = TimelineAnalyzer()
    
    # Add events from different sources
    analyzer.add_source("Elasticsearch", [
        {'timestamp': '2025-01-15T08:15:23Z', 'type': 'authentication',
         'user': 'admin', 'action': 'login failed', 'src_ip': '10.0.0.55'},
        {'timestamp': '2025-01-15T08:16:45Z', 'type': 'authentication',
         'user': 'admin', 'action': 'login success', 'src_ip': '10.0.0.55'}
    ])
    
    analyzer.add_source("GRR", [
        {'timestamp': '2025-01-15T08:17:12Z', 'type': 'process',
         'name': 'powershell.exe', 'pid': 1234, 'cmdline': 'powershell -enc XYZ...'}
    ])
    
    # Analyze
    print(analyzer.export_timeline())
    
    print("\n\n### Attack Phases ###")
    phases = analyzer.identify_attack_phases()
    for phase, events in phases.items():
        print(f"\n{phase.upper()}: {len(events)} events")
        for e in events[:3]:
            print(f"  - [{e['timestamp']}] {e['description']}")
```

---

## Practical Hunt Exercises

### Exercise 1: The Phantom Connection

**Scenario:** You notice an anomaly in network traffic - a workstation is communicating with an IP address that has no business reason to contact.

**Provided:**
- 24 hours of Zeek conn.log entries for the subnet
- Arkime session metadata
- OSQuery process list snapshot

**Tasks:**
1. Formulate a hypothesis about the activity
2. Develop queries to investigate
3. Determine if this is benign or malicious
4. If malicious, identify the full scope
5. Document your findings in hunt report format

### Exercise 2: The Insider Pattern

**Scenario:** A database administrator resigned yesterday. Today, their account accessed tables they never touched before.

**Provided:**
- Database audit logs (90 days)
- Authentication logs
- DLP alerts (last week)

**Tasks:**
1. Establish baseline behavior for this user
2. Identify anomalous activities
3. Determine if data was accessed or exfiltrated
4. Build a case for HR/Legal if warranted

### Exercise 3: Zero-Day precursor

**Scenario:** Threat intelligence indicates a new vulnerability in software Djezzy uses. You need to hunt for signs of exploitation before patches are available.

**Provided:**
- Vulnerability details (CVE, affected versions)
- EDR telemetry (7 days)
- Web proxy logs

**Tasks:**
1. Translate vulnerability details into hunt hypotheses
2. Create detection logic (Sigma/YARA)
3. Search historical data for precursors
4. Recommend immediate protective actions

---

## Resources and References

### Internal Resources

| Resource | Location | Purpose |
|----------|-----------|---------|
| Hunt Library | `/opt/hunts/library/` | Reusable hunt queries |
| Sigma Rules Repo | `gitlab.djezzy.local/soc/sigma-rules` | Custom detection rules |
| YARA Rules | `/opt/yara/rules/` | Malware signatures |
| ATT&CK Coverage Map | Confluence → SOC → ATT&CK | Detection gap analysis |
| Hunt Templates | `/opt/hunts/templates/` | Documentation templates |

### External References

| Resource | URL | Description |
|----------|-----|-------------|
| MITRE ATT&CK | attack.mitre.org | Adversary behavior knowledge base |
| Sigma Hub | github.com/SigmaHQ/sigma | Community Sigma rules |
| YARA Documentation | yara.readthedocs.io | Official YARA docs |
| Atomic Red Team | atomicredteam.io | Testing detection coverage |
| Cyber Threat Coalition | cyberthreatcoalition.org | IOCs and intel sharing |
| First.org (FAIR) | first.org | Risk quantification |

### Recommended Reading

1. "The Threat Hunter's Methodology" - Sqrrl/Datawire
2. "Hunting Operational Threats" - MITRE Engenuity
3. "Active Defense: A Comprehensive Guide to Network Security" - Bejtlich
4. "Intelligence-Driven Incident Response" - Babbington

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-04-01 | Threat Hunt Lead | Initial curriculum |
| 2.0 | 2025-01-15 | SOC Training Manager | Complete revision, added telecom scenarios |

---

*This document supports advanced threat hunter certification. For questions, contact soc-hunting@djezzy.dz.*
