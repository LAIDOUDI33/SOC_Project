# National SOC Platform - Incident Response Runbooks

**Version:** 2.0 (Production Ready)
**Last Updated:** 2026-01-25
**Classification:** Internal Use Only

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Incident Classification Framework](#incident-classification-framework)
3. [Severity Levels & SLAs](#severity-levels--slas)
4. [Runbook: Critical Security Incident (P0)](#runbook-critical-security-incident-p0)
5. [Runbook: Data Breach Incident](#runbook-data-breach-incident)
6. [Runbook: SS7/Telecom Fraud Attack](#runbook-ss7telecom-fraud-attack)
7. [Runbook: Ransomware/Malware Outbreak](#runbook-ransomwaremalware-outbreak)
8. [Runbook: DDoS Attack](#runbook-ddos-attack)
9. [Runbook: Insider Threat](#runbook-insider-threat)
10. [Runbook: APT/Advanced Persistent Threat](#runbook-aptadvanced-persistent-threat)
11. [Communication Templates](#communication-templates)
12. [Post-Incident Procedures](#post-incident-procedures)

---

## Executive Summary

### Purpose
These runbooks provide standardized, repeatable procedures for the National SOC Platform incident response team to effectively detect, contain, eradicate, and recover from security incidents while minimizing business impact.

### Scope
These procedures cover:
- **Cybersecurity incidents** affecting Djezzy infrastructure
- **Telecom-specific attacks** (SS7 fraud, IRSF, SIM swap)
- **Data breaches** involving customer data
- **Insider threats** and privilege escalation
- **Advanced Persistent Threats (APTs)** targeting national infrastructure

### Key Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| SOC Manager | [Name] | +213 XXX XXX XXX | 24/7 |
| Security Lead | [Name] | +213 XXX XXX XXX | 24/7 |
| Telecom Security Lead | [Name] | +213 XXX XXX XXX | Business Hours |
| Legal Counsel | [Name] | +213 XXX XXX XXX | Emergency |
| Communications | [Name] | +213 XXX XXX XXX | Business Hours |
| ANRT Liaison | [Name] | +213 XXX XXX XXX | Emergency |

---

## Incident Classification Framework

### Category Matrix

```
┌─────────────────┬──────────────────┬────────────────────┬─────────────────┐
│   CATEGORY      │   DESCRIPTION    │   EXAMPLES         │   PRIMARY TEAM   │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ MALWARE         │ Malicious        │ Ransomware,       │ EDR/SIEM Team   │
│                 │ software, trojans│ Trojans, Worms    │                 │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ INTRUSION       │ Unauthorized     │ APT, Lateral      │ Threat Hunting   │
│                 │ access,          │ Movement,         │ Team            │
│                 │ persistence      │ Backdoors         │                 │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ TELECOM_FRAUD   │ Telecom-specific │ SS7 Attacks, IRSF, │ Telecom Security │
│                 │ fraud attacks    │ SIM Swap,         │ Team            │
│                 │                  │ Wangiri           │                 │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ DATA_BREACH     │ Unauthorized     │ PII Exposure,     │ IR Team + Legal  │
│                 │ data exposure    │ Database Dump     │                 │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ DOS             │ Denial of        │ DDoS, Resource    │ Network Security  │
│                 │ service attacks  │ Exhaustion        │ Team            │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ INSIDER_THREAT  │ Internal threats │ Data Theft,       │ HR + Legal + IR  │
│                 │ from employees   │ Sabotage          │                 │
├─────────────────┼──────────────────┼────────────────────┼─────────────────┤
│ VULNERABILITY   │ Exploitation of  │ Zero-day,         │ Vuln Management  │
│                 │ known/unknown    │ Unpatched Systems │ Team            │
│                 │ vulnerabilities  │                   │                 │
└─────────────────┴──────────────────┴────────────────────┴─────────────────┘
```

---

## Severity Levels & SLAs

### Severity Definitions

#### P0 - CRITICAL (Immediate Action Required)

**Definition:** Active attack causing or imminently causing severe business impact, safety risk, or regulatory violation.

**Criteria:**
- Active data exfiltration of sensitive customer data (>1000 records)
- Ransomware encryption in progress on production systems
- Active domain administrator compromise
- SS7 fraud attack with confirmed financial loss >$10K/hour
- Complete outage of critical telecom services (HLR, MSC, SGSN)
- Nation-state APT with confirmed lateral movement
- Regulatory breach requiring notification within 24 hours

**SLA Targets:**
- Initial Triage: **15 minutes**
- Executive Notification: **30 minutes**
- Containment Initiated: **1 hour**
- Status Update Frequency: **Every 30 minutes**

**Response Actions:**
1. Immediately page all on-call responders
2. Activate War Room (physical or virtual)
3. Engage external parties if needed (CERT, law enforcement)
4. Prepare for regulatory notification
5. Document all actions in real-time

---

#### P1 - HIGH (Urgent Response Required)

**Definition:** Significant security incident with potential for substantial impact if not contained quickly.

**Criteria:**
- Confirmed malware infection on >10 endpoints
- Successful phishing campaign with credential theft
- Web application compromise with defacement/data access
- Privilege escalation to admin rights on non-critical system
- SS7 anomaly detected with suspicious patterns
- Vulnerability exploitation in internet-facing system
- Insider threat indicators with evidence of data access

**SLA Targets:**
- Initial Triage: **1 hour**
- Containment Initiated: **4 hours**
- Status Update Frequency: **Every 2 hours**

---

#### P2 - MEDIUM (Timely Response Required)

**Definition:** Security incident requiring investigation but with limited immediate impact.

**Criteria:**
- Single endpoint malware detection (contained)
- Suspicious activity requiring investigation
- Policy violations without confirmed malicious intent
- Minor vulnerability exploited in non-critical system
- Failed intrusion attempts with clear indicators
- Small-scale phishing (1-5 users affected)

**SLA Targets:**
- Initial Triage: **4 hours**
- Investigation Complete: **24 hours**
- Status Update Frequency: **Daily**

---

#### P3 - LOW (Standard Response)

**Definition:** Minor security issues or informational alerts.

**Criteria:**
- Informational security findings
- Routine vulnerability scans results
- Minor policy deviations
- External security reports (low severity)
- General security recommendations

**SLA Targets:**
- Initial Review: **1 week**
- Resolution: **30 days**
- Status Update Frequency: **Weekly**

---

## Runbook: Critical Security Incident (P0)

### Phase 1: Detection & Triage (0-15 minutes)

#### 1.1 Alert Validation

```bash
# Verify alert legitimacy through multiple sources
# Check SIEM correlation
curl -X GET "${SOC_API}/api/alerts/${ALERT_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

# Cross-reference with other security tools
# Wazuh/SIEM verification
curl -X GET "${WAZUH_API}/alerts?rule.id=${RULE_ID}&offset=0&limit=50" \
  -H "Authorization: Bearer ${WAZUH_TOKEN}"

# EDR check for related endpoints
curl -X POST "${GRR_API}/hunt/create" \
  -H "Authorization: Bearer ${GRR_TOKEN}" \
  -d '{
    "name": "P0_Incident_${INCIDENT_ID}_Initial_Hunt",
    "hunt_type": "FILE",
    "rules": [
      {"type": "FILE", "path": "/tmp/*", "modifiers": ["CASE_INSENSITIVE"]}
    ]
  }'
```

#### 1.2 Initial Assessment Checklist

- [ ] Alert is not a false positive (verified by 2 analysts)
- [ ] Impact scope identified (systems, data, users affected)
- [ ] Attack vector preliminarily identified
- [ ] Threat actor classification (if known)
- [ ] Business impact assessment initiated

#### 1.3 Escalation Decision Tree

```
DETECTED ALERT
      │
      ▼
Is it CRITICAL? ───NO──▶ Follow P1/P2 Runbook
      │YES
      ▼
Is it ACTIVE? ───NO──▶ Preserve evidence, investigate as HIGH
      │YES
      ▼
Is customer data involved? ───YES──▶ Include Legal/Privacy team
      │NO                    Prepare breach notification docs
      ▼
Activate P0 Response
```

### Phase 2: Activation (15-60 minutes)

#### 2.1 Team Notification

**Immediate Notifications (within 15 minutes):**

| Role | Method | Information Shared |
|------|--------|-------------------|
| SOC Manager | Phone + SMS | Incident summary, initial impact |
| CISO/CIO | Phone | Business impact assessment |
| Affected System Owner | Email + Phone | Systems affected, containment status |
| Legal Counsel | Phone | Potential regulatory implications |
| Communications | Email | Prepare holding statement |

**Notification Template:**

```
🔴 P0 SECURITY INCIDENT DECLARED

Incident ID: INC-${TIMESTAMP}
Declared: ${DATETIME}
Severity: CRITICAL (P0)
Category: ${CATEGORY}

Summary:
${BRIEF_SUMMARY_2-3_SENTENCES}

Affected Systems:
- ${SYSTEM_1} (${IMPACT})
- ${SYSTEM_2} (${IMPACT})

Current Status: CONTAINMENT_IN_PROGRESS
Next Update: ${NEXT_UPDATE_TIME}

War Room: ${LOCATION/URL}
Conference Bridge: ${BRIDGE_NUMBER}
```

#### 2.2 War Room Setup

**Physical War Room Requirements:**
- Dedicated meeting room with secure communications
- Large displays for:
  - Real-time dashboard (SOC platform)
  - Network traffic analysis
  - Timeline reconstruction
  - Evidence tracking board
- Secure devices only (no personal phones)
- Whiteboard for diagramming

**Virtual War Room (if remote):**
- Encrypted video conference (Zoom/Teams with E2E)
- Dedicated Slack channel (#incident-P0-${ID})
- Shared Miro/Mural board for visualization
- Secure document sharing (encrypted)

#### 2.3 Role Assignments

| Role | Responsibilities | Assigned To |
|------|------------------|-------------|
| **Incident Commander** | Overall coordination, decisions | SOC Manager |
| **Technical Lead** | Investigation, containment execution | Senior Analyst |
| **Communications Lead** | Internal/external comms | Comms Team |
| **Legal Advisor** | Regulatory, law enforcement | Legal Counsel |
| **Scribe** | Documentation, timeline | Junior Analyst |
| **Liaison(s)** | Vendor management, external coord | As needed |

### Phase 3: Containment (1-4 hours)

#### 3.1 Short-Term Containment (Immediate)

**Network Isolation:**

```bash
# Block attacker IPs at firewall level
iptables -A INPUT -s ${ATTACKER_IP} -j DROP

# If internal compromised host:
# Isolate VLAN
interface=${COMPROMISED_INTERFACE}
vlan isolate ${interface}

# For cloud environments:
aws ec2 modify-network-interface-attribute \
  --network-interface-id ${ENI_ID} \
  --no-source-dest-check
```

**Account/Credential Containment:**

```bash
# Disable compromised accounts
curl -X PATCH "${SOC_API}/api/admin/users/${USER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"is_active": false, "lock_reason": "P0_INCIDENT_CONTAINMENT"}'

# Force session termination
curl -X DELETE "${SOC_API}/api/admin/sessions?user_id=${USER_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Rotate credentials (automated where possible)
./scripts/security/rotate-compromised-credentials.sh ${USER_ID}
```

**Endpoint Containment via GRR:**

```bash
# Isolate endpoint from network
curl -X POST "${GRR_API}/clients/${CLIENT_ID}/network" \
  -H "Authorization: Bearer ${GRR_TOKEN}" \
  -d '{"action": "isolate"}'

# Kill malicious processes
curl -X POST "${GRR_API}/clients/${CLIENT_ID}/processes/kill" \
  -H "Authorization: Bearer ${GRR_TOKEN}" \
  -d '{"pid": ${MALICIOUS_PID}}'
```

#### 3.2 System-Specific Containment Procedures

**For Ransomware:**
1. Identify patient zero (first infected system)
2. Disconnect ALL potentially affected systems from network
3. Do NOT reboot infected systems (preserves memory forensics)
4. Identify ransomware variant (for decryption possibility)
5. Enable shadow copy protection on unaffected systems
6. Prepare recovery from clean backups

**For Data Exfiltration:**
1. Block egress at perimeter firewall
2. Enable enhanced logging on all egress points
3. Identify data accessed (database audit logs)
4. Determine scope of exposure
5. Preserve logs showing what was accessed
6. Engage digital forensics team

**For SS7 Fraud:**
1. Block fraudulent MSISDNs/IMSIs
2. Implement additional signaling rules
3. Contact roaming partners if international
4. Trace fraud path (originating network)
5. Preserve CDRs and signaling logs
6. Coordinate with ANRT/law enforcement

#### 3.3 Backup & Evidence Preservation

```bash
# Create forensic images before any remediation
mkdir -p /evidence/P0-${INCIDENT_ID}/$(date +%Y%m%d_%H%M%S)

# Memory acquisition (volatile evidence)
# Linux:
dump_memory.sh ${COMPROMISED_HOST} > /evidence/P0-${INCIDENT_ID}/${HOSTNAME}.mem

# Disk image
dd if=/dev/sda of=/evidence/P0-${INCIDENT_ID}/${HOSTNAME}.img bs=4M conv=noerror,sync

# Database snapshot (if database compromised)
pg_dump -Fc -f /evidence/P0-${INCIDENT_ID}/db_snapshot.dump ${DATABASE_NAME}

# Log collection
tar czf /evidence/P0-${INCIDENT_ID}/logs.tar.gz \
  /var/log/* \
  /var/log/wazuh/logs/* \
  /var/log/suricata/*

# Calculate hashes for integrity
sha256sum /evidence/P0-${INCIDENT_ID}/* > /evidence/P0-${INCIDENT_ID}/checksums.sha256
```

### Phase 4: Eradication (4-24 hours)

#### 4.1 Malware Removal

```bash
# Deploy YARA scan across environment
cat > /tmp/p0_hunt.yara << 'EOF'
rule P0_Malware_Hunt {
    meta:
        description = "Hunt for IOCs from P0 incident"
        author = "SOC Team"
        date = "$(date +%Y-%m-%d)"
    
    strings:
        $ioc1 = "${IOC_1}" ascii wide nocase
        $ioc2 = "${IOC_2}" ascii wide nocase
        $domain = "${MALICIOUS_DOMAIN}" nocase
        $ip = "${ATTACKER_IP}"
    
    condition:
        any of them
}
EOF

# Execute hunt via GRR
curl -X POST "${GRR_API}/hunts" \
  -H "Authorization: Bearer ${GRR_TOKEN}" \
  -d @- << EOF
{
  "name": "P0_YARA_Hunt_${INCIDENT_ID}",
  "hunt_type": "YARA",
  "yara_rule": "$(cat /tmp/p0_hunt.yara)",
  "client_limit": 0
}
EOF
```

#### 4.2 Persistence Mechanism Removal

Common persistence locations to check:

```bash
# Linux persistence mechanisms
locations=(
    "/etc/crontab"
    "/etc/cron.d/"
    "/etc/init.d/"
    "/etc/systemd/system/"
    "~/.config/autostart/"
    "/etc/rc.local"
    "~/.bashrc"
    "~/.profile"
    "/etc/ld.so.preload"
    "/etc/modprobe.d/"
    "/lib/modules/*/kernel/"
)

for loc in "${locations[@]}"; do
    echo "=== Checking $loc ==="
    ls -la $loc 2>/dev/null || echo "Not found"
done

# Windows persistence (via Osquery)
osqueryi "SELECT * FROM startup_items;"
osqueryi "SELECT * FROM scheduled_tasks WHERE enabled=1;"
osqueryi "SELECT * FROM registry WHERE key LIKE '%\\Run%';"

# Check for new user accounts created during incident window
osqueryi "SELECT * FROM users WHERE uid >= ${MIN_UID_DURING_INCIDENT};"
```

#### 4.3 Credential Reset Priority

| Credential Type | Priority | Rotation Method |
|-----------------|----------|-----------------|
| Domain Admin | IMMEDIATE | Manual reset, verify no backdoors |
| Service Accounts | HIGH | Automated rotation script |
| Database Credentials | HIGH | Application config update |
| API Keys | HIGH | Regenerate, update consumers |
| SSH Keys | HIGH | Revoke compromised, regenerate |
| User Passwords | MEDIUM | Forced password reset on next login |
| Encryption Keys | CRITICAL | Certificate reissuance |

### Phase 5: Recovery (24-72 hours)

#### 5.1 System Restoration Procedure

```bash
# Only restore from KNOWN CLEAN backups
# Verify backup integrity before restoration
sha256sum -c backup-checksum.sha256

# Restore priority order:
# 1. Critical infrastructure (AD, DNS, DHCP)
# 2. Security tools (SIEM, EDR)
# 3. Business-critical applications
# 4. User workstations

# Example: Restore from verified backup
# Bare metal restore (if needed)
rear -v recover

# Or file-level restore
rsync -avz --progress /backup/clean/${SYSTEM}/ /mnt/restored/

# Post-restore validation
./scripts/security/post-restore-validation.sh ${SYSTEM_ID}
```

#### 5.2 Enhanced Monitoring During Recovery

```yaml
# Enhanced monitoring rules for post-incident period
# Add to monitoring system for 30 days post-recovery

- name: P0_Post_Incident_Anomaly_Detection
  condition:
    - source: endpoint
      type: process_creation
      filters:
        - command_line contains: ${ATTACK_PATTERN_1}
        OR command_line contains: ${ATTACK_PATTERN_2}
  
  action:
    type: alert
    severity: critical
    notify: [soc-oncall, incident-commander]
    
- name: P0_Network_Egress_Monitoring
  condition:
    - source: network
      type: connection
      filters:
        - destination_ip in: ${BLOCKED_IP_RANGES}
        AND bytes_out > 1024
  
  action:
    type: block_and_alert
    duration: 30_days
```

### Phase 6: Lessons Learned (7-14 days post-incident)

#### 6.1 Post-Mortem Meeting Agenda

1. **Timeline Reconstruction** (30 min)
   - Walk through complete incident timeline
   - Identify decision points and outcomes
   
2. **What Went Well** (15 min)
   - Effective detections
   - Good collaboration
   - Tools that helped

3. **Areas for Improvement** (30 min)
   - Detection gaps
   - Response delays
   - Communication issues
   - Tool limitations

4. **Action Items** (30 min)
   - Specific improvements
   - Owners and deadlines
   - Tracking mechanism

#### 6.2 Post-Mortem Report Template

```markdown
# Post-Incident Report: ${INCIDENT_TITLE}

**Report Date:** $(date +%Y-%m-%d)
**Incident ID:** INC-${INCIDENT_ID}
**Classification:** ${SEVERITY} - ${CATEGORY}

## Executive Summary
[2-3 paragraph summary suitable for leadership]

## Timeline
| Time (UTC) | Event | Source | Action Taken |
|------------|-------|--------|--------------|
| YYYY-MM-DD HH:MM | Initial detection | SIEM Alert #12345 | Auto-triage |
| ... | ... | ... | ... |

## Impact Assessment
- **Systems Affected:** ${COUNT} systems
- **Data Compromised:** ${SCOPE}
- **Business Impact:** ${DOLLAR_AMOUNT} estimated loss
- **Downtime:** ${DURATION}
- **Customers Affected:** ${NUMBER}

## Root Cause Analysis
[Technical root cause with supporting evidence]

## Containment Actions Taken
[List of all containment actions]

## Eradication Steps
[List of eradication steps]

## Recovery Process
[Recovery timeline and steps]

## Lessons Learned
### What Worked Well
- ...

### What Could Be Improved
- ...

## Recommendations
| # | Recommendation | Owner | Priority | Deadline |
|---|----------------|-------|----------|----------|
| 1 | ... | ... | High | ... |
| 2 | ... | ... | Medium | ... |

## Appendix
- Evidence inventory
- Log samples
- IoC list
- Communication records
```

---

## Runbook: Data Breach Incident

### Immediate Actions (First Hour)

1. **Confirm Breach Scope**
   ```sql
   -- Query to identify exposed records
   SELECT 
       table_name,
       COUNT(*) as records_affected,
       MIN(created_at) as earliest_access,
       MAX(created_at) as latest_access
   FROM audit_logs
   WHERE 
       table_name IN ('customers', 'subscribers', 'users')
       AND actor_id = '${COMPROMISED_ACCOUNT}'
       AND timestamp BETWEEN '${BREACH_START}' AND '${BREACH_END}'
   GROUP BY table_name;
   ```

2. **Legal Notification Trigger**
   - GDPR: 72-hour notification requirement
   - Local regulations may have shorter windows
   - Engage legal counsel immediately

3. **Customer Impact Assessment**
   ```python
   # Script to assess customer data exposure
   affected_customers = query_affected_records()
   
   for customer in affected_customers:
       risk_score = calculate_exposure_risk(customer)
       
       if risk_score == 'HIGH':
           # Proactive notification required
           schedule_notification(
               customer_id=customer.id,
               template='breach_notification_high_risk',
               within_hours=24
           )
   ```

### Regulatory Notification Checklist

- [ ] ANRT notified (telecom regulator)
- [ ] CNIL/GDPR authority notified (if EU citizens affected)
- [ ] Customer notifications prepared
- [ ] Media response prepared (if public disclosure required)
- [ ] Law enforcement engaged (if criminal activity)

---

## Runbook: SS7/Telecom Fraud Attack

### Detection Indicators

```yaml
# SS7 Fraud Detection Rules
fraud_indicators:
  - name: irsf_detection
    description: International Revenue Share Fraud
    conditions:
      - destination_prefix in: [premium_rate_ranges]
      - call_duration between: [1800, 3600]  # 30-60 minutes
      - calling_number.roaming: true
      - calls_per_hour > 5
    
  - name: sim_swap_fraud
    description: SIM Swap followed by OTP interception
    conditions:
      - sendRoutingInfoForSM requests > threshold
      - locationUpdate from different country
      - banking_app_authentication within 24h
    
  - name: wangiri
    description: One-ring scam pattern
    conditions:
      - call_duration < 5 seconds
      - callback to premium number
      - same originating number mass calling
```

### Containment Actions

1. **Block Fraudulent MSISDNs**
   ```bash
   # Block subscriber from network
   curl -X POST "${HLR_API}/subscribers/${MSISDN}/block" \
     -H "Authorization: Bearer ${API_TOKEN}" \
     -d '{
       "reason": "FRAUD_INVESTIGATION",
       "block_type": "FULL",
       "incident_id": "'${INCIDENT_ID}'"
     }'
   ```

2. **Implement Signaling Firewall Rules**
   ```
   # Diameter/SS7 firewall rule additions
   BLOCK SendRoutingInfoForSM FROM {suspicious_GT} TO {protected_MSISDN_range}
   BLOCK ProvideRoamingNumber WHEN {IMSI_recently_ported}
   ALERT ON locationUpdate WHEN {same_IMSI_different_IMEI}
   ```

3. **Coordinate with Roaming Partners**
   - Notify hub operators of fraudulent activity
   - Request CDRs from visited networks
   - Consider temporary blocking of high-risk destination ranges

---

## Communication Templates

### Internal Notification (All Hands)

```
Subject: 🔒 Security Incident - All Staff Briefing

Team,

We are currently managing a [severity] security incident.
Here's what you need to know:

WHAT HAPPENED:
[Brief, factual description - 2-3 sentences]

WHAT WE'RE DOING:
- [Containment action 1]
- [Investigation action 2]

WHAT YOU NEED TO DO:
- Be vigilant for phishing attempts using this event
- Report anything suspicious to soc@djezzy.dz
- Do not discuss this externally (media, social media)

WHEN TO EXPECT UPDATES:
- Next update: [time]
- Channel: [#slack-channel]

Questions? Contact: [soc-manager@djezzy.dz]

Thank you for your cooperation.

[SOC Manager Name]
```

### Customer Notification (If Required)

```
Subject: Important Notice About Your Account Security

Dear [Customer Name],

We recently became aware of a security incident that may have 
affected your account information.

WHAT HAPPENED:
[Clear, non-technical explanation]

WHAT INFORMATION WAS INVOLVED:
[Specific data types]

WHAT WE ARE DOING:
[Remediation steps taken]

WHAT YOU CAN DO:
[Recommended customer actions - change password, monitor, etc.]

CONTACT US:
[Support contact information]

We take the security of your information seriously and apologize 
for any inconvenience.

[Djezzy Security Team]
```

---

## Post-Incident Procedures

### Service Restoration Checklist

- [ ] All systems restored from clean backups
- [ ] Security patches applied to prevent recurrence
- [ ] Enhanced monitoring in place (30-day elevated status)
- [ ] Access controls reviewed and tightened
- [ ] Staff debrief completed
- [ ] Post-mortem report written and distributed
- [ ] Action items assigned and tracked
- [ ] Regulatory notifications sent (if required)
- [ ] Customer notifications sent (if required)
- [ ] Playbooks updated based on lessons learned

### Continuous Improvement Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                     IMPROVEMENT CYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│    │ Detect   │ ──▶  │ Respond  │ ──▶  │ Recover  │        │
│    │ Gaps     │      │ Delays   │      │ Issues   │        │
│    └────┬─────┘      └────┬─────┘      └────┬─────┘        │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│    ┌──────────────────────────────────────────────────┐     │
│    │              ROOT CAUSE ANALYSIS                  │     │
│    └─────────────────────┬────────────────────────────┘     │
│                          │                                  │
│                          ▼                                  │
│    ┌──────────────────────────────────────────────────┐     │
│    │              IMPLEMENT CHANGES                    │     │
│    │  • Update detection rules                         │     │
│    │  • Improve playbooks                              │     │
│    │  • Enhance tooling                                │     │
│    │  • Train staff                                    │     │
│    └──────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Document Control:**
- **Owner:** SOC Manager
- **Review Frequency:** Quarterly or after each major incident
- **Approval:** CISO
- **Distribution:** SOC Team, IT Leadership, Legal, Communications

**Version History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | SOC Team | Initial version |
| 2.0 | 2026-01-25 | SOC Team | Production hardening, added SS7 fraud |
