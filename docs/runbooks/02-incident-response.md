# Incident Response Runbook

**Document ID:** SOC-RB-002  
**Version:** 2.0  
**Classification:** Internal Use Only - Sensitive  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Incident Response Team

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Incident Lifecycle Phases](#incident-lifecycle-phases)
3. [Phase 1: Preparation](#phase-1-preparation)
4. [Phase 2: Detection and Analysis](#phase-2-detection-and-analysis)
5. [Phase 3: Containment](#phase-3-containment)
6. [Phase 4: Eradication](#phase-4-eradication)
7. [Phase 5: Recovery](#phase-5-recovery)
8. [Phase 6: Lessons Learned](#phase-6-lessons-learned)
9. [Communication Templates](#communication-templates)
10. [Evidence Preservation Procedures](#evidence-preservation-procedures)
11. [Post-Incident Review Checklist](#post-incident-review-checklist)

---

## Purpose and Scope

This runbook defines the comprehensive incident response procedures for the Djezzy National Security Operations Center (SOC). It establishes a structured methodology for identifying, containing, eradicating, and recovering from security incidents while maintaining compliance with Algerian telecommunications regulations (ANRT) and international best practices (NIST SP 800-61, ISO 27035).

### Applicability

This procedure applies to:
- All security incidents affecting Djezzy telecommunications infrastructure
- Events involving subscriber data, network elements, or business systems
- Incidents requiring coordination with external parties (ANRT, law enforcement, CSIRT)
- All SOC personnel regardless of shift or role assignment

---

## Incident Lifecycle Phases

The Djezzy SOC follows the NIST Incident Response Lifecycle with telecommunications-specific adaptations:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INCIDENT RESPONSE LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌──────────┐    ┌──────────────┐    ┌────────────┐              │
│    │          │    │              │    │            │              │
│    │PREPARATION├───►│ DETECTION &  ├───►│CONTAINMENT │              │
│    │          │    │   ANALYSIS   │    │            │              │
│    └──────────┘    └──────────────┘    └─────┬──────┘              │
│         ▲                                    │                     │
│         │                                    ▼                     │
│    ┌────┴─────┐    ┌──────────────┐    ┌────────────┐             │
│    │          │    │              │    │            │             │
│    │ LESSONS  │◄───│  RECOVERY    │◄───│ERADICATION │             │
│    │ LEARNED  │    │              │    │            │             │
│    └──────────┘    └──────────────┘    └────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase Summary

| Phase | Primary Objective | Key Deliverables | Typical Duration |
|-------|-------------------|------------------|------------------|
| Preparation | Maintain readiness | Tools, training, playbooks | Ongoing |
| Detection & Analysis | Identify and understand incident | Triage report, scope assessment | 1-4 hours |
| Containment | Limit damage and prevent spread | Containment actions log | 1-8 hours |
| Eradication | Remove threat artifacts | Clean-up verification | 2-24 hours |
| Recovery | Restore normal operations | System validation, monitoring | 4-48 hours |
| Lessons Learned | Improve future response | PIR report, action items | 1-2 weeks post-incident |

---

## Phase 1: Preparation

### Pre-Incident Readiness Requirements

#### Tool Availability Verification

Before any incident occurs, ensure the following tools are operational:

```bash
#!/bin/bash
# IR_Tool_Check.sh - Verify incident response tool availability

echo "=== Djezzy SOC IR Tool Status Check ==="
date

# SIEM Access
curl -s -o /dev/null -w "Elasticsearch: %{http_code}\n" https://elasticsearch.soc.djezzy.local:9200/_cluster/health
curl -s -o /dev/null -w "Kibana: %{http_code}\n" https://kibana.soc.djezzy.local/api/status

# SOAR Platform
curl -s -o /dev/null -w "TheHive: %{http_code}\n" https://hive.soc.djezzy.local/api/v1/status
curl -s -o /dev/null -w "Cortex: %{http_code}\n" https://cortex.soc.djezzy.local/api/status

# Network Forensics
curl -s -o /dev/null -w "Arkime: %{http_code}\n" https://arkime.soc.djezzy.local
curl -s -o /dev/null -w "Zeek Controller: %{http_code}\n" http://zeek-controller.soc.djezzy.local:8080

# Threat Intelligence
curl -s -o /dev/null -w "MISP: %{http_code}\n" https://misp.soc.djezzy.local/servers/getVersion
curl -s -o /dev/null -w "OpenCTI: %{http_code}\n" https://opencti.soc.djezzy.local/graphql

echo "=== Check Complete ==="
```

#### On-Call Roster Maintenance

Maintain current contact information for all IR team members:

| Role | Primary | Backup | Escalation Contact |
|------|---------|--------|-------------------|
| IR Lead | [Name/Phone] | [Name/Phone] | SOC Manager |
| Network IR Specialist | [Name/Phone] | [Name/Phone] | NetOps Lead |
| Endpoint IR Specialist | [Name/Phone] | [Name/Phone] | IT Security Manager |
| Forensics Analyst | [Name/Phone] | [Name/Phone] | IR Lead |
| Communications Liaison | [Name/Phone] | [Name/Phone] | Corp Comms |

#### Evidence Collection Kit

Ensure forensic workstations contain:

- [ ] FTK Imager or equivalent imaging software
- [ ] USB write-blockers (minimum 2)
- [ ] Blank forensic drives (minimum 2TB capacity)
- [ ] Bootable forensic OS (SANS SIFT/REMnux)
- [ ] Network capture tools (Wireshark, tcpdump)
- [ ] Memory acquisition tools (WinPMEM, LiME)
- [ ] Hash calculation utilities (sha256sum, md5sum)
- [ ] Chain of custody forms (printed)

---

## Phase 2: Detection and Analysis

### Initial Detection Sources

The Djezzy SOC receives alerts from multiple detection layers:

| Source | Alert Types | Confidence Level | Response Priority |
|--------|-------------|------------------|-------------------|
| SIEM (Wazuh) | Log-based detections | Medium-High | Standard |
| EDR (OSQuery/GRR) | Behavioral anomalies | High | Elevated |
| NSM (Suricata/Zeek) | Network-based threats | Medium-High | Standard |
| TIP (MISP/OpenCTI) | IOC matches | Varies by source | Context-dependent |
| Fraud Detection | Telecom fraud patterns | High | Business-critical |
| ANOMALY (ML) | Statistical outliers | Low-Medium | Investigative |

### Analysis Methodology

#### Step 1: Initial Triage (0-15 minutes)

Upon incident identification:

```python
# Initial triage checklist implementation
def initial_triage(alert):
    """
    Perform initial incident triage
    Returns: severity, initial_classification, recommended_actions
    """
    
    triage_result = {
        'alert_id': alert.id,
        'timestamp': datetime.utcnow(),
        'analyst': get_current_analyst(),
        'findings': {}
    }
    
    # Extract key indicators
    iocs = extract_iocs(alert.raw_data)
    affected_assets = identify_affected_assets(iocs)
    
    # Severity assessment
    triage_result['severity'] = assess_severity(
        criticality=affected_assets.criticality,
        evidence_strength=alert.confidence,
        data_sensitivity=check_data_exposure(affected_assets),
        active_threat=verify_active_compromise(iocs)
    )
    
    # Initial classification
    triage_result['classification'] = classify_incident_type(
        alert.category,
        iocs,
        alert.behavioral_indicators
    )
    
    # Recommended immediate actions
    triage_result['actions'] = generate_action_plan(
        triage_result['severity'],
        triage_result['classification']
    )
    
    return triage_result
```

#### Step 2: Scope Assessment (15 minutes - 2 hours)

Determine the full extent of the incident:

**Scope Assessment Matrix:**

| Dimension | Data Points to Collect | Collection Method |
|-----------|----------------------|-------------------|
| Temporal | First compromise, duration, timeline reconstruction | Log analysis, artifact dating |
| Spatial | Affected systems, network segments, physical locations | Asset inventory cross-reference |
| User | Compromised accounts, privileged access abuse | Authentication logs, session data |
| Data | Exposed records, accessed databases, exfiltrated content | DLP logs, database audit |
| External | Attacker infrastructure, C2 servers, related campaigns | Threat intel correlation |

**Scope Documentation Template:**

```markdown
## Incident Scope Assessment

**Incident ID:** INC-[YEAR]-[SEQUENCE]
**Assessment Date:** [DATE]
**Assessor:** [ANALYST NAME]

### Affected Assets
| Asset Name | Type | Criticality | Role in Incident |
|------------|------|-------------|------------------|
| | | | |

### Timeline Reconstruction
| Time (UTC) | Event | Source | Confidence |
|------------|-------|--------|------------|
| | | | |

### Data Impact Assessment
- **Records Potentially Affected:** [NUMBER]
- **Data Types Involved:** [LIST]
- **Subscriber Data Exposure:** [YES/NO/PENDING]
- **Regulatory Notification Required:** [YES/NO/PENDING]
```

#### Step 3: Attack Vector Analysis

Identify how the attacker gained access:

**Common Attack Vectors in Telecom Environment:**

| Vector | Indicators | Detection Methods |
|--------|------------|-------------------|
| Phishing | Malicious email, credential harvest | Email gateway logs, user reports |
| Exploitation | Vulnerability exploitation attempts | EDR alerts, patch status |
| Supply Chain | Compromised vendor/software | Software integrity checks |
| Insider | Privilege abuse, data theft | UEBA alerts, DLP triggers |
| Physical | Unauthorized access, device theft | Physical security logs |
| Telecom-specific | SS7 attacks, SIM swap | Fraud system, signaling analysis |

---

## Phase 3: Containment

### Containment Strategy Selection

Choose containment strategy based on incident type and business impact:

```
                    ┌──────────────────────────────┐
                    │   CONTAINMENT DECISION       │
                    │                              │
     ┌──────────────┤   Is immediate isolation     ├──────────────┐
     │              │   feasible without major     │              │
     │              │   business impact?           │              │
     │              └──────────────┬───────────────┘              │
     │                             │                              │
     ▼ YES                         ▼ NO                           │
┌─────────────┐          ┌─────────────────────┐                  │
│  ISOLATE    │          │ MONITOR & CONTROL   │                  │
│  AFFECTED   │          │                     │                  │
│  SYSTEMS    │          │ • Enhanced logging   │                  │
│             │          │ • Traffic filtering  │                  │
│ Actions:    │          │ • Account restriction│                  │
│ • Network   │          │ • Access limitation  │                  │
│   isolation │          │                     │                  │
│ • Account   │          │ Prepare for rapid    │                  │
│   disable   │          │ escalation if needed │                  │
│ • Process   │          └─────────────────────┘                  │
│   kill      │                      │                            │
└─────────────┘                      │                            │
                                     ▼                            │
                        ┌─────────────────────────┐               │
                        │ CONTINUOUS REASSESSMENT │◄──────────────┘
                        └─────────────────────────┘
```

### Containment Procedures by Scenario

#### Scenario A: Compromised Workstation/Server

```bash
#!/bin/bash
# contain_endpoint.sh - Automated endpoint containment

HOSTNAME=$1
INCIDENT_ID=$2
ANALYST=$3

echo "[$(date)] Initiating containment for $HOSTNAME"
echo "Incident ID: $INCIDENT_ID"
echo "Analyst: $ANALYST"

# Log all actions
exec > >(tee -a "/var/log/soc/containment_${INCIDENT_ID}.log") 2>&1

# Step 1: Network Isolation
echo "[ACTION 1] Applying network isolation..."
# Option A: VLAN move via switch API
curl -X POST "https://nac.djezzy.local/api/v1/devices/$HOSTNAME/isolate" \
  -H "Authorization: Bearer $NAC_TOKEN" \
  -d "{\"reason\": \"IR-$INCIDENT_ID\", \"analyst\": \"$ANALYST\"}"

# Option B: Firewall block (if VLAN not available)
# iptables -A INPUT -s $HOSTNAME_IP -j DROP
# iptables -A OUTPUT -d $HOSTNAME_IP -j DROP

# Step 2: Disable compromised accounts
echo "[ACTION 2] Disabling associated service accounts..."
# LDAP account disable
ldapmodify -x -H ldap://ldap.djezzy.local \
  -D "cn=admin,dc=djezzy,dc=dz" -w "$LDAP_PASS" <<EOF
dn: uid=service_account,ou=users,dc=djezzy,dc=dz
changetype: modify
replace: userAccountControl
userAccountControl: 514
EOF

# Step 3: Collect volatile data before potential loss
echo "[ACTION 3] Initiating volatile data collection..."
ssh forensics@collection-server "/opt/ir-tools/collect_volatile.sh $HOSTNAME"

# Step 4: Create memory image if possible
echo "[ACTION 4] Attempting memory acquisition..."
ssh $HOSTNAME "sudo /usr/local/bin/winpmem.exe --output C:\\\\memory.raw --format raw" || \
  echo "Memory acquisition failed - document reason"

echo "[$(date)] Initial containment complete for $HOSTNAME"
```

#### Scenario B: Active Network Attack (DDoS/C2)

```bash
#!/bin/bash
# contain_network.sh - Network-level containment

ATTACK_TYPE=$1
TARGET_IP=$2
INCIDENT_ID=$3

case $ATTACK_TYPE in
  "ddos")
    echo "Activating DDoS mitigation procedures..."
    
    # Activate Cloudflare/CDN mitigation
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/ddos/mitigate" \
      -H "Authorization: Bearer $CF_TOKEN" \
      -d '{"attack_id": "'$INCIDENT_ID'", "target": "'$TARGET_IP'"}'
    
    # Implement rate limiting at edge
    # Update nginx rate limiting rules
    
    # Coordinate with upstream ISP if needed
    notify_upstream_isp "$TARGET_IP" "$INCIDENT_ID"
    ;;
    
  "c2_traffic")
    echo "Blocking command-and-control communications..."
    
    # Extract C2 domains/IPs from threat intelligence
    C2_INDICATORS=$(curl -s "https://misp.soc.djezzy.local/attributes/restSearch" \
      -H "Authorization: $MISP_KEY" \
      -d '{"type":["domain","ip-dst","url"],"eventinfo":"C2"}' | \
      jq -r '.response.Attribute[].value')
    
    # Block at firewall
    for indicator in $C2_INDICATORS; do
      echo "Blocking: $indicator"
      # Add to firewall blocklist
    done
    
    # Sinkhole DNS queries if applicable
    ;;
    
  *)
    echo "Unknown attack type: $ATTACK_TYPE"
    exit 1
    ;;
esac
```

#### Scenario C: Account Compromise

```bash
#!/bin/bash
# contain_account.sh - Account-level containment

COMPROMISED_USER=$1
INCIDENT_ID=$2

echo "Containing compromised account: $COMPROMISED_USER"

# 1. Force password reset and lock account
ldapmodify -x -H ldap://ldap.djezzy.local <<EOF
dn: uid=$COMPROMISED_USER,ou=users,dc=djezzy,dc=dz
changetype: modify
replace: pwdReset
pwdReset: TRUE
replace: userAccountControl
userAccountControl: 514
EOF

# 2. Revoke all active sessions
# Clear Kerberos tickets
# Invalidate OAuth tokens
# Terminate VPN sessions

# 3. Review recent authentication events
echo "Extracting auth history for $COMPROMISED_USER..."
ldapsearch -x -H ldap://ldap.djezzy.local \
  "(uid=$COMPROMISED_USER)" \
  -b "ou=audit,dc=djezzy,dc=dz" \
  > "/tmp/auth_history_${INCIDENT_ID}.ldif"

# 4. Check for privilege escalation
echo "Checking for privilege changes..."
# Query sudo logs, admin group membership changes

# 5. Notify user through secure channel
send_secure_notification "$COMPROMISED_USER" "account_compromised_template"

echo "Account containment initiated for $COMPROMISED_USER"
```

### Containment Decision Log

All containment actions must be documented:

```markdown
## Containment Action Log

**Incident ID:** INC-2025-XXXX
**Containment Lead:** [NAME]

| Timestamp (UTC) | Action | Target | Authorizing Analyst | Rationale | Result |
|-----------------|--------|--------|---------------------|-----------|--------|
| | | | | | |
```

---

## Phase 4: Eradication

### Eradication Objectives

1. **Remove malicious artifacts** completely from affected systems
2. **Eliminate persistence mechanisms** (backdoors, scheduled tasks, registry keys)
3. **Close exploited vulnerabilities** that enabled initial access
4. **Verify clean state** before recovery begins

### Eradication Procedures

#### Malware Removal Procedure

```
ERADICATION CHECKLIST - MALWARE INCIDENT

□ Identify all malware components
  - Executables
  - Scripts/macros
  - Persistence mechanisms
  - Configuration files
  - Dropped files

□ Document malware samples for analysis
  - Submit to sandbox (Cortex)
  - Preserve original hashes
  - Note file locations and timestamps

□ Remove malicious files
  - Delete identified malware
  - Clean registry entries (Windows)
  - Remove cron jobs/scheduled tasks
  - Delete unauthorized services

□ Remove persistence mechanisms
  - Check startup folders
  - Review scheduled tasks
  - Examine WMI event subscriptions
  - Audit browser extensions
  - Check DLL search order hijacking

□ Verify removal completeness
  - Re-scan with multiple AV engines
  - Compare file hashes against known-good baseline
  - Monitor for recreation attempts
```

#### Credential Reset Procedure

For incidents involving credential compromise:

```bash
#!/bin/bash
# reset_credentials.sh - Comprehensive credential rotation

INCIDENT_ID=$1
SCOPE=${2:-"affected"}  # affected, department, or all

echo "Credential reset procedure for incident $INCIDENT_ID"
echo "Scope: $SCOPE"

case $SCOPE in
  "affected")
    # Reset only confirmed compromised accounts
    ACCOUNTS=$(cat /tmp/compromised_accounts_$INCIDENT_ID.txt)
    ;;
  "department")
    # Reset all accounts in affected department
    DEPT=$(grep "affected_department" /tmp/incident_$INCIDENT_ID.json | cut -d'"' -f4)
    ACCOUNTS=$(ldapsearch -x "(department=$DEPT)" uid | grep "^uid:" | awk '{print $2}')
    ;;
  "all")
    # Emergency full credential reset
    echo "WARNING: Full credential reset requested"
    read -p "Confirm emergency reset (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
      exit 1
    fi
    ACCOUNTS=$(ldapsearch -x "(objectClass=person)" uid | grep "^uid:" | awk '{print $2}')
    ;;
esac

for account in $ACCOUNTS; do
  echo "Resetting credentials for: $account"
  
  # Generate new temporary password
  NEW_PASS=$(openssl rand -base64 16)
  
  # Force password change on next login
  ldapmodify -x -H ldap://ldap.djezzy.local <<EOF
dn: uid=$account,ou=users,dc=djezzy,dc=dz
changetype: modify
replace: userPassword
userPassword: $(slappasswd -s "$NEW_PASS")
replace: pwdReset
pwdReset: TRUE
EOF
  
  # Store temp password securely for handover
  echo "$account:$NEW_PASS" >> /tmp/password_resets_$INCIDENT_ID.enc
  
done

echo "Credential reset complete. Handover required."
```

### Vulnerability Remediation Coordination

Coordinate with vulnerability management team:

| Urgency | Timeline | Examples |
|---------|----------|----------|
| Emergency | < 24 hours | Active exploitation, public exploit available |
| High | < 7 days | Critical CVSS, internet-facing |
| Medium | < 30 days | Internal systems, requires maintenance window |
| Low | Next cycle | Defense-in-depth improvements |

---

## Phase 5: Recovery

### Recovery Planning

Before restoring systems:

```markdown
## Recovery Plan Template

**Incident ID:** INC-2025-XXXX
**Recovery Coordinator:** [NAME]
**Target Recovery Date:** [DATE]

### Systems to Recover
| System | Priority | Recovery Method | Validation Criteria |
|--------|----------|-----------------|---------------------|
| | | | |

### Rollback Triggers
If any of the following occur during recovery, halt and reassess:
- [ ] Detection of persistent malicious activity
- [ ] Unexpected system behavior
- [ ] New alerts from recovered system
- [ ] Failed validation checks

### Monitoring Period
- Enhanced monitoring duration: [72 hours minimum]
- Monitoring criteria: [specific alerts, thresholds]
- Escalation contacts during monitoring: [list]
```

### System Restoration Procedure

```bash
#!/bin/bash
# recover_system.sh - Controlled system restoration

SYSTEM_HOSTNAME=$1
BACKUP_DATE=$2  # Format: YYYY-MM-DD
INCIDENT_ID=$3

echo "Starting recovery process for $SYSTEM_HOSTNAME"
echo "Using backup from: $BACKUP_DATE"
echo "Incident reference: $INCIDENT_ID"

# Pre-recovery verification
echo "=== PRE-RECOVERY VERIFICATION ==="

# 1. Verify backup integrity
echo "Verifying backup integrity..."
RESTORE_POINT="/backups/$SYSTEM_HOSTNAME/$BACKUP_DATE"
if [ ! -f "$RESTORE_POINT/checksum.sha256" ]; then
  echo "ERROR: Checksum file missing for backup"
  exit 1
fi
cd "$RESTORE_POINT" && sha256sum -c checksum.sha256
if [ $? -ne 0 ]; then
  echo "ERROR: Backup checksum verification failed"
  exit 1
fi

# 2. Verify no active threats on restore target
echo "Scanning backup for known IOCs..."
# Run YARA scan on backup contents
/opt/yara/bin/yara /opt/ir-rules/malware.yar "$RESTORE_POINT/system.img"

# 3. Confirm patch level meets minimum requirements
echo "Verifying patch level..."
# Check that critical patches are included or will be applied

# Begin restoration
echo "=== BEGINNING RESTORATION ==="

# 4. Take pre-restoration snapshot (if VM)
if is_virtual_machine "$SYSTEM_HOSTNAME"; then
  echo "Creating pre-restoration snapshot..."
  create_snapshot "$SYSTEM_HOSTNAME" "pre-restore-$INCIDENT_ID"
fi

# 5. Restore from verified backup
echo "Restoring system from backup..."
# Implementation depends on backup system (Veeam, Commvault, etc.)

# 6. Apply security hardening
echo "Applying security hardening..."
apply_hardening_baseline "$SYSTEM_HOSTNAME"

# 7. Apply outstanding security patches
echo "Applying security patches..."
patch_system "$SYSTEM_HOSTNAME" --security-only

# Post-restoration validation
echo "=== POST-RECOVERY VALIDATION ==="

# 8. Run comprehensive security scan
run_security_scan "$SYSTEM_HOSTNAME" --full

# 9. Validate functionality
validate_system_functionality "$SYSTEM_HOSTNAME"

# 10. Enable enhanced monitoring
enable_enhanced_monitoring "$SYSTEM_HOSTNAME" --duration 72h

echo "Recovery process completed for $SYSTEM_HOSTNAME"
echo "Enter 72-hour enhanced monitoring period"
```

### Return to Normal Operations

**Criteria for declaring incident closed:**

- [ ] All malicious artifacts eradicated
- [ ] Vulnerabilities remediated or mitigated
- [ ] Systems restored and validated
- [ ] Enhanced monitoring period complete (72 hours min)
- [ ] No recurrence of attack indicators
- [ ] Stakeholder sign-off obtained
- [ ] Documentation complete
- [ ] Lessons learned conducted (within 2 weeks)

---

## Phase 6: Lessons Learned

### Post-Incident Review (PIR) Process

Schedule PIR within 5 business days of incident closure.

**Required Participants:**
- Incident Commander
- Technical Lead(s)
- Affected Business Unit Representative
- Communications (if external notification occurred)
- Relevant stakeholder(s)

### PIR Agenda Template

```markdown
# Post-Incident Review: INC-2025-XXXX

## Meeting Information
- **Date:** [DATE]
- **Duration:** 60-90 minutes
- **Facilitator:** [NAME]
- **Note Taker:** [NAME]

## Agenda

### 1. Executive Summary (10 min)
- What happened in plain language?
- What was the business impact?
- Current status

### 2. Timeline Review (20 min)
- Walk through key decision points
- Identify decision rationale
- Note timestamps vs SLAs

### 3. What Went Well (15 min)
- Effective responses
- Tools/processes that helped
- Team strengths demonstrated

### 4. Opportunities for Improvement (25 min)
- Delays or obstacles encountered
- Gaps in detection/response
- Communication issues
- Tool limitations

### 5. Action Items (15 min)
- Specific, measurable improvements
- Owners and deadlines
- Tracking mechanism

### 6. Adjourn (5 min)
- Next steps
- Follow-up meeting if needed
```

---

## Communication Templates

### Internal Notification Template

```markdown
Subject: [SEVERITY] Security Incident Notification - INC-XXXXX

Dear [Recipient/Team],

This message is to inform you of a security incident currently being 
managed by the Security Operations Center.

INCIDENT SUMMARY:
- Incident ID: INC-XXXXX
- Severity: [P1/P2/P3/P4]
- Status: [Active/Contained/Resolved]
- Detected: [DATETIME UTC]

DESCRIPTION:
[Brief description suitable for audience level]

IMPACT ASSESSMENT:
- Affected Systems: [List or "None confirmed"]
- Data Exposure: [Confirmed/Suspected/None]
- Service Impact: [Yes/No - details if yes]

CURRENT ACTIONS:
[What is being done]

WHAT YOU NEED TO DO:
[Specific actions if required, or "No action required"]

NEXT UPDATE:
[Time of next planned update]

Questions or concerns should be directed to:
- Incident Commander: [Name, Contact]
- SOC Duty Phone: [Number]

[This classification: INTERNAL USE ONLY]
```

### Executive Briefing Template

```markdown
EXECUTIVE BRIEFING: Security Incident INC-XXXXX

CLASSIFICATION: CONFIDENTIAL
PREPARED: [DATE/TIME]
PREPARED BY: [CISO/SOC Manager]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION SUMMARY
-----------------
[One paragraph executive summary - what happened, current status]

BUSINESS IMPACT
--------------
Financial: [Estimated cost if quantifiable]
Operational: [Service impact description]
Reputational: [Media/customer impact risk]
Regulatory: [ANRT/notification requirements]

TIMELINE
-------
Detected: [Date/Time]
Contained: [Date/Time or "Ongoing"]
Resolved: [Date/Time or "Ongoing"]
Duration: [Total time]

ROOT CAUSE
----------
[High-level cause without excessive technical detail]

ACTIONS TAKEN
-------------
[Key decisions and actions in bullet format]

RESOURCE UTILIZATION
--------------------
Internal Staff: [FTE-hours or headcount involved]
External Resources: [Consultants, vendors engaged if any]
Cost to Date: [If tracked]

REMAINING RISK
--------------
[What residual risk exists]

RECOMMENDATIONS
---------------
[Strategic recommendations to prevent recurrence]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ANRT Regulatory Notification Template

```markdown
NOTIFICATION DE INCIDENTE DE CYBERSÉCURITÉ
------------------------------------------

OPÉRATEUR: Djezzy (Orascom Telecom Algérie)
RÉFÉRENCE: INC-YYYY-NNNNN
DATE DE NOTIFICATION: [DD/MM/YYYY]
HEURE DE NOTIFICATION: [HH:MM UTC]

1. NATURE DE L'INCIDENT
   Type: [Technique détaillé]
   Catégorie: [Conformément à la classification ANRT]

2. CHRONOLOGIE
   Date/heure de détection: 
   Date/heure de début estimée:
   Durée:

3. IMPACT ÉVALUÉ
   Nombre d'abonnés potentiellement affectés:
   Services impactés:
   Données personnelles concernées: [OUI/NON - détails]

4. MESURES PRISES
   Mesures de confinement:
   Mesures d'éradication:
   Mesures de récupération:

5. COORDINATION
   Contact principal: [Nom, Fonction, Téléphone, Email]
   Autorités informées: [Liste]

6. STATUT ACTUEL
   [En cours/Contenu/Résolu]

PIÈCES JOINTES:
- Rapport technique détaillé (si disponible)
- Indicateurs de compromission (IOCs)

---
Autorité de Régulation de la Poste et des Télécommunications (ANRT)
Division Cybersécurité
Email: cybersurete@anrt.dz
```

---

## Evidence Preservation Procedures

### Legal Considerations

All evidence preservation must consider:
- Potential legal proceedings (civil/criminal)
- ANRT regulatory investigations
- Internal disciplinary actions
- Insurance claims

### Evidence Handling Chain of Custody

```markdown
CHAIN OF CUSTODY FORM

CASE NUMBER: INC-XXXXX
EVIDENCE ITEM #: [SEQUENTIAL]

ITEM DESCRIPTION:
--------------------------------------------------
Type: [Hard Drive/Image/Memory Dump/Log File/etc.]
Make/Model: 
Serial Number:
Description:
Hash (MD5):
Hash (SHA-256):
Size:

COLLECTION INFORMATION:
--------------------------------------------------
Collected By: [Name, Title]
Collection Date/Time: [UTC]
Collection Location:
Reason for Collection:

TRANSFER LOG:
--------------------------------------------------
| Date/Time | Released By | Received By | Purpose | Location |
|-----------|-------------|-------------|---------|----------|
|           |             |             |         |          |
|           |             |             |         |          |
|           |             |             |         |          |
```

### Evidence Acquisition Commands

#### Disk Imaging
```bash
# Create forensic image with hashing
ftk_imager.exe --source "\\?\Device\HarddiskVolume1" \
  --destination "E:\forensics\INC-XXXXX\Evidence001.E01" \
  --e01 --compress 6 \
  | tee "E:\forensics\INC-XXXXX\imaging_log.txt"

# Verify image integrity
# MD5 and SHA-256 calculated automatically by FTK Imager
```

#### Memory Acquisition (Linux)
```bash
# Acquire Linux memory using LiME
insmod lime.ko "path=/tmp/memory_dump.lime format=lime md5=true"

# Calculate hash immediately
md5sum /tmp/memory_dump.lime > /tmp/memory_dump.lime.md5
sha256sum /tmp/memory_dump.lime > /tmp/memory_dump.lime.sha256
```

#### Memory Acquisition (Windows)
```bash
# WinPMEM acquisition
winpmem-x64.exe --output C:\memory.raw --format raw

# Hash the dump
certutil -hashfile C:\memory.raw SHA256 > C:\memory.raw.sha256
```

#### Network Capture Preservation
```bash
# Export relevant PCAP from Arkime
curl -s "https://arkime.soc.djezzy.local/api/sessions/export" \
  -H "Authorization: Bearer $ARKIME_TOKEN" \
  -d "date=-7&expression=ip==1.2.3.4&filename=INC-XXXXX_network.pcap" \
  -o /evidence/INC-XXXXX/INC-XXXXX_network.pcap

# Verify pcap integrity
tcpdump -r /evidence/INC-XXXXX/INC-XXXXX_network.pcap -q > /dev/null && echo "PCAP valid"
```

### Evidence Storage Requirements

| Requirement | Specification |
|-------------|---------------|
| Storage Location | Write-once media or secure evidence server |
| Encryption | AES-256 encryption at rest |
| Access Control | Dual-control access required |
| Retention Period | Minimum 7 years (per legal hold requirements) |
| Backup | Mirror copy maintained offsite |
| Integrity | Hash verification quarterly |

---

## Post-Incident Review Checklist

### Immediate Actions (Within 24 Hours of Closure)

- [ ] Update incident status to "Closed" in TheHive
- [ ] Send closure notification to stakeholders
- [ ] Archive all evidence to long-term storage
- [ ] Update metrics dashboard with final statistics
- [ ] Schedule PIR meeting (within 5 business days)

### Documentation Review (Within 48 Hours)

- [ ] Complete incident timeline with all timestamps
- [ ] Document all containment actions taken
- [ ] Record eradication procedures performed
- [ ] List all systems affected and their status
- [ ] Compile financial impact estimate if applicable
- [ ] Gather lessons learned input from team members

### PIR Meeting (Within 5 Business Days)

- [ ] Schedule meeting with required participants
- [ ] Distribute pre-read materials 24 hours in advance
- [ ] Facilitate structured review session
- [ ] Document action items with owners and due dates
- [ ] Distribute meeting notes within 24 hours

### Improvement Implementation (Ongoing)

- [ ] Create improvement tickets for each action item
- [ ] Prioritize based on effort/impact matrix
- [ ] Assign to appropriate teams
- [ ] Track completion in project management tool
- [ ] Report progress to SOC leadership monthly

### Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| Mean Time to Detect (MTTD) | Detection time - Initial compromise time | < 4 hours |
| Mean Time to Contain (MTTC) | Containment time - Detection time | < 1 hour (P1) |
| Mean Time to Resolve (MTTR) | Resolution time - Detection time | < 24 hours (P1) |
| False Positive Rate | FP count / Total alerts | < 40% |
| Repeat Incident Rate | Recurrences / Total incidents | < 10% |

---

## Appendix: Quick Reference Cards

### Incident Commander Quick Reference

```
╔═══════════════════════════════════════════════════════════════╗
║            INCIDENT COMMANDER QUICK REFERENCE                 ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  INITIAL RESPONSE (First 15 minutes):                         ║
║  1. Acknowledge alert in TheHive                               ║
║  2. Assign preliminary severity                               ║
║  3. Notify on-call per escalation matrix                      ║
║  4. Begin documentation                                       ║
║  5. If P1: Initiate bridge call                               ║
║                                                               ║
║  KEY CONTACTS:                                                ║
║  Bridge Line: +213XXXXXXXXX                                   ║
║  SOC Manager Direct: +213XXXXXXXXX                            ║
║  ANRT Cyber: cybersurete@anrt.dz                              ║
║                                                               ║
║  CRITICAL REMINDERS:                                          ║
║  - Preserve evidence before cleanup                           ║
║  - Document everything in real-time                           ║
║  - When in doubt, escalate up                                 ║
║  - Subscriber data = automatic elevation                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-03-15 | IR Team Lead | Initial framework |
| 1.5 | 2024-08-01 | SOC Manager | Added telecom scenarios |
| 2.0 | 2025-01-15 | CISO Office | Full revision, ANRT templates |

---

*This document contains sensitive operational procedures. Distribution is limited to authorized Djezzy SOC personnel and approved contractors. Handle according to information classification guidelines.*
