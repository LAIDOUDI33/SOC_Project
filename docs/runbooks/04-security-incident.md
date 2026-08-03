# Security Incident Runbook

**Document ID:** SOC-RB-004  
**Version:** 2.0  
**Classification:** Confidential - Sensitive  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Security Team

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Incident Type Classifications](#incident-type-classifications)
3. [Malware Incidents](#malware-incidents)
4. [DDoS Attacks](#ddos-attacks)
5. [Advanced Persistent Threats (APT)](#advanced-persistent-threats-apt)
6. [Insider Threats](#insider-threats)
7. [Telecom-Specific Incidents](#telecom-specific-incidents)
8. [Containment Strategies by Type](#containment-strategies-by-type)
9. [ANRT Regulatory Reporting](#anrt-regulatory-reporting)
10. [Coordination with National CSIRT](#coordination-with-national-csirt)

---

## Purpose and Scope

This runbook provides detailed response procedures for specific types of security incidents that may affect the Djezzy telecommunications infrastructure. It supplements the general Incident Response Runbook (SOC-RB-002) with type-specific technical procedures, containment strategies, and regulatory requirements unique to each incident category.

### Telecom-Specific Considerations

As a major Algerian telecommunications operator, Djezzy faces unique security challenges:

| Challenge | Impact | Mitigation Approach |
|-----------|--------|---------------------|
| **Subscriber Data Protection** | IMSI, MSISDN, call records highly sensitive | Strict access controls, encryption at rest |
| **Network Infrastructure** | SS7/Diameter signaling vulnerable to attack | Signaling firewall, monitoring |
| **Regulatory Compliance** | ANRT reporting requirements | Automated reporting workflows |
| **National Critical Infrastructure** | Potential nation-state targeting | Enhanced monitoring, threat intel sharing |

---

## Incident Type Classifications

### Incident Category Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY INCIDENT TYPES                          │
├─────────────────┬──────────┬───────────┬──────────┬────────────────┤
│ INCIDENT TYPE   │ SEVERITY │ SCOPE     │ RESPONSE │ REPORTING      │
│                 │ RANGE    │           │ TIME     │ REQUIREMENT    │
├─────────────────┼──────────┼───────────┼──────────┼────────────────┤
│ MALWARE         │ P2-P4    │ Endpoint  │ 4-24h    │ Case-dependent │
│ DDoS            │ P1-P3    │ Network   │ 1-8h     │ If service     │
│                 │          │           │          │ impact >10%    │
│ APT             │ P1       │ Enterprise│ Weeks    │ ANRT + CSIRT   │
│ INSIDER THREAT  │ P1-P3    │ Varies    │ Days     │ Legal/HR coord │
│ TELECOM FRAUD   │ P1-P2    │ Revenue   │ 2-24h    │ ANRT required  │
│ DATA BREACH     │ P1-P2    │ Data      │ Hours    │ ANRT mandatory │
│ SUPPLY CHAIN    │ P1-P3    │ Varies    │ Days     │ Case-dependent │
└─────────────────┴──────────┴───────────┴──────────┴────────────────┘
```

---

## Malware Incidents

### Detection Indicators

| Indicator Type | Examples | Detection Source |
|---------------|----------|------------------|
| **Signature-based** | Known malware hashes, YARA matches | EDR, Antivirus |
| **Behavioral** | Unusual process execution, file changes | OSQuery, EDR |
| **Network** | C2 beaconing, data exfiltration patterns | Suricata, Zeek |
| **Memory artifacts** | Injected code, suspicious hooks | Volatility, GRR |

### Response Procedure: Malware Detection

#### Phase 1: Immediate Containment (0-30 minutes)

```bash
#!/bin/bash
# malware_containment.sh - Initial malware containment

AFFECTED_HOST=$1
INCIDENT_ID=$2
ANALYST=$(whoami)

echo "=== MALWARE CONTAINMENT PROCEDURE ==="
echo "Host: $AFFECTED_HOST"
echo "Incident: $INCIDENT_ID"
echo "Analyst: $ANALYST"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Step 1: Network Isolation
echo "[1/6] Initiating network isolation..."

# Option A: Via NAC (Network Access Control)
NAC_RESPONSE=$(curl -s -X POST "https://nac.djezzy.local/api/v1/devices/isolate" \
  -H "Authorization: Bearer $NAC_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"hostname\": \"$AFFECTED_HOST\",
    \"reason\": \"MALWARE-$INCIDENT_ID\",
    \"analyst\": \"$ANALYST\",
    \"quarantine_vlan\": \"VLAN_QUARANTINE\"
  }")

echo "NAC Response: $NAC_RESPONSE"

# Option B: Firewall block if NAC unavailable
# iptables -I INPUT -s $AFFECTED_HOST_IP -j DROP
# iptables -I OUTPUT -d $AFFECTED_HOST_IP -j DROP

# Step 2: Suspend Compromised Accounts
echo "[2/6] Suspending associated service accounts..."
# Query for accounts recently used on affected host
COMPROMISED_ACCOUNTS=$(ldapsearch -x \
  "((&(objectClass=person)(logonhost=$AFFECTED_HOST)))" \
  uid 2>/dev/null | grep "^uid:" | awk '{print $2}')

for account in $COMPROMISED_ACCOUNTS; do
  echo "Disabling account: $account"
  ldapmodify -x -H ldap://ldap.djezzy.local <<EOF
dn: uid=$account,ou=users,dc=djezzy,dc=dz
changetype: modify
replace: userAccountControl
userAccountControl: 514
EOF
done

# Step 3: Collect Volatile Data
echo "[3/6] Collecting volatile evidence..."
mkdir -p /evidence/$INCIDENT_ID

# Live response via GRR if available
grr_shell "$AFFECTED_HOST" <<'GRR_COMMANDS'
# Collect network connections
netstat -ano > /tmp/network_connections.txt

# Collect running processes (full paths)
wmic process get Name,ProcessId,ParentProcessId,ExecutablePath /format:csv > /tmp/processes.csv

# Collect scheduled tasks
schtasks /query /fo CSV /v > /tmp/scheduled_tasks.csv

# Collect autostart entries
wmic startup list full /format:csv > /tmp/autostart.csv

# Collect DNS cache
ipconfig /displaydns > /tmp/dns_cache.txt
GRR_COMMANDS

# Download collected files
grr_download "$AFFECTED_HOST" "/tmp/*.txt" "/evidence/$INCIDENT_ID/"
grr_download "$AFFECTED_HOST" "/tmp/*.csv" "/evidence/$INCIDENT_ID/"

# Step 4: Memory Acquisition
echo "[4/6] Acquiring memory image..."
grr_memory_acquire "$AFFECTED_HOST" --output "/evidence/$INCIDENT_ID/memory.raw"

# Step 5: Create Disk Image (if feasible)
echo "[5/6] Initiating disk imaging..."
# For critical incidents, create full forensic image
# grr_disk_image "$AFFECTED_HOST" --output "/evidence/$INCIDENT_ID/disk.E01"

# Step 6: Document Actions
echo "[6/6] Documenting containment actions..."
cat >> /evidence/$INCIDENT_ID/containment_log.json <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "action": "initial_containment",
  "host": "$AFFECTED_HOST",
  "analyst": "$ANALYST",
  "actions_taken": [
    "network_isolation",
    "account_suspension",
    "volatile_data_collection",
    "memory_acquisition"
  ],
  "incident_id": "$INCIDENT_ID"
}
EOF

echo "=== CONTAINMENT PHASE COMPLETE ==="
echo "Evidence location: /evidence/$INCIDENT_ID/"
```

#### Phase 2: Malware Analysis

```python
# malware_analysis_workflow.py - Structured analysis workflow
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional

class MalwareAnalysisWorkflow:
    """Structured workflow for malware incident analysis"""
    
    def __init__(self, incident_id: str):
        self.incident_id = incident_id
        self.analysis_report = {
            'incident_id': incident_id,
            'analysis_start': datetime.utcnow().isoformat(),
            'samples': [],
            'indicators': [],
            'conclusions': [],
            'recommendations': []
        }
    
    def submit_sample(self, file_path: str) -> Dict:
        """Submit malware sample for analysis"""
        
        # Calculate hashes
        with open(file_path, 'rb') as f:
            file_data = f.read()
            
        hashes = {
            'md5': hashlib.md5(file_data).hexdigest(),
            'sha1': hashlib.sha1(file_data).hexdigest(),
            'sha256': hashlib.sha256(file_data).hexdigest()
        }
        
        # Submit to sandbox (Cortex/VirusTotal)
        sample_info = {
            'file_path': file_path,
            'hashes': hashes,
            'file_size': len(file_data),
            'submission_time': datetime.utcnow().isoformat(),
            'sandbox_status': 'submitted'
        }
        
        # Submit to Cortex analyzers
        cortex_job = self._submit_to_cortex(file_path)
        sample_info['cortex_job_id'] = cortex_job.get('job_id')
        
        # Check VirusTotal
        vt_results = self._check_virustotal(hashes['sha256'])
        sample_info['virustotal'] = vt_results
        
        self.analysis_report['samples'].append(sample_info)
        return sample_info
    
    def _submit_to_cortex(self, file_path: str) -> Dict:
        """Submit to Cortex analysis platform"""
        import requests
        
        CORTEX_URL = "https://cortex.soc.djezzy.local/api/analyze"
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'analyzers': ['VirusTotal_GetReport', 'YARA_Scan', 
                             'Cuckoo_Scan', 'HybridAnalysis_GetReport'],
                'tlp': 2
            }
            headers = {'Authorization': f'Bearer {CORTEX_KEY}'}
            
            response = requests.post(CORTEX_URL, files=files, 
                                   data=data, headers=headers)
            return response.json()
    
    def _check_virustotal(self, sha256: str) -> Dict:
        """Check VirusTotal for existing results"""
        import requests
        
        VT_URL = f"https://www.virustotal.com/api/v3/files/{sha256}"
        headers = {'x-apikey': VT_API_KEY}
        
        response = requests.get(VT_URL, headers=headers)
        if response.status_code == 200:
            return response.json().get('data', {}).get('attributes', {})
        return {'status': 'not_found'}
    
    def extract_iocs(self, analysis_results: Dict) -> List[Dict]:
        """Extract IOCs from analysis results"""
        iocs = []
        
        # Domain IOCs
        domains = analysis_results.get('domains', [])
        for domain in domains:
            iocs.append({
                'type': 'domain',
                'value': domain,
                'confidence': 'high',
                'source': 'sandbox_analysis',
                'incident_id': self.incident_id
            })
        
        # IP addresses
        ips = analysis_results.get('ips', [])
        for ip in ips:
            iocs.append({
                'type': 'ip-dst',
                'value': ip,
                'confidence': 'medium',
                'source': 'sandbox_analysis',
                'incident_id': self.incident_id
            })
        
        # File hashes (related samples)
        related_hashes = analysis_results.get('related_samples', [])
        for hash_info in related_hashes:
            iocs.append({
                'type': 'sha256',
                'value': hash_info,
                'confidence': 'high',
                'source': 'family_relation',
                'incident_id': self.incident_id
            })
        
        self.analysis_report['indicators'].extend(iocs)
        return iocs
    
    def generate_yara_rule(self, sample characteristics: Dict) -> str:
        """Generate YARA rule from sample characteristics"""
        
        rule = f'''
rule Malware_{self.incident_id.replace("-", "_")} {{
    meta:
        description = "Auto-generated rule for {self.incident_id}"
        author = "Djezzy SOC"
        date = "{datetime.utcnow().strftime('%Y-%m-%d')}"
        hash = "{sample_characteristics.get('sha256', '')}"
    
    strings:
        {self._extract_strings(sample_characteristics)}
    
    condition:
        all of them
}}
'''
        return rule
    
    def publish_to_misp(self, iocs: List[Dict]) -> bool:
        """Publish extracted IOCs to MISP"""
        import requests
        
        MISP_URL = "https://misp.soc.djezzy.local/events"
        
        event = {
            'info': f'Malware IOCs - {self.incident_id}',
            'distribution': 0,  # Organization only
            'threat_level_id': 3,  # High
            'analysis': 2,  # Completed
            'Attribute': iocs
        }
        
        headers = {
            'Authorization': MISP_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        response = requests.post(MISP_URL, json=event, headers=headers)
        return response.status_code == 201
```

---

## DDoS Attacks

### DDoS Classification for Telecom

| Attack Type | Target | Characteristics | Detection Method |
|-------------|--------|-----------------|------------------|
| **Volumetric** | Bandwidth saturation | High packet rates, Mbps/Gbps | NetFlow analysis, SNMP |
| **Protocol** | Server/resources | SYN floods, amplification | Connection tracking |
| **Application Layer** | Web services | Slowloris, HTTP floods | WAF logs, app metrics |
| **Telecom-Specific** | SS7/SIGTRAN | Signaling flood | SS7 firewall alerts |

### Detection Thresholds

```yaml
# ddos_detection_thresholds.yml
ddos_detection:
  volumetric:
    warning_threshold_pps: 50000    # Packets per second
    critical_threshold_pps: 500000
    warning_threshold_mbps: 100     # Megabits per second
    critical_threshold_mbps: 1000
  
  protocol:
    syn_flood_threshold: 1000/sec
    new_connections_per_second: 500
    half_open_connections: 10000
  
  application:
    http_requests_per_second: 10000
    http_errors_per_second: 500
    slow_connection_count: 1000
  
  telecom_signaling:
    ss7_messages_per_second: 5000    # Normal is much lower
    diameter_transactions_per_sec: 2000
    unusual_roaming_attempts: 100/hour
```

### Response Procedure: DDoS Attack

```bash
#!/bin/bash
# ddos_response.sh - DDoS mitigation procedure

ATTACK_TYPE=$1
TARGET_IP=$2
ATTACK_SIZE_Gbps=${3:-0}
INCIDENT_ID="DDOS-$(date +%Y%m%d%H%M%S)"

echo "=== DDoS RESPONSE PROCEDURE ==="
echo "Attack Type: $ATTACK_TYPE"
echo "Target: $TARGET_IP"
echo "Estimated Size: ${ATTACK_SIZE_Gbps} Gbps"
echo "Incident ID: $INCIDENT_ID"

case $ATTACK_TYPE in
  "volumetric")
    echo "Activating volumetric attack mitigation..."
    
    # Step 1: Activate CDN/DDoS scrubbing provider
    echo "[1/5] Activating Cloudflare mitigation..."
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/ddos/mitigate" \
      -H "Authorization: Bearer $CF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"attack_id\": \"$INCIDENT_ID\",
        \"target\": \"$TARGET_IP\",
        \"mitigation_mode\": \"managed_challenge\"
      }"
    
    # Step 2: Implement rate limiting at edge
    echo "[2/5] Updating edge rate limits..."
    # Update nginx/Caddy rate limiting
    cat > /etc/nginx/conf.d/rate_limit_ddos.conf <<'NGINX'
limit_req_zone $binary_remote_addr zone=ddos_limit:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=ddos_conn:10m;

server {
    limit_req zone=ddos_limit burst=20 nodelay;
    limit_conn ddos_conn 10;
    
    # Return 429 for rate limited
    limit_req_status 429;
    limit_conn_status 429;
}
NGINX
    nginx -t && nginx -s reload
    
    # Step 3: Coordinate with upstream ISP
    echo "[3/5] Notifying upstream ISP for blackhole/scrubbing..."
    # Contact ISP NOC for traffic scrubbing if internal capacity exceeded
    if [ "$ATTACK_SIZE_Gbps" -gt 10 ]; then
      notify_isp_noc "$TARGET_IP" "$ATTACK_SIZE_Gbps" "$INCIDENT_ID"
    fi
    
    # Step 4: Implement BGP blackholing if necessary (last resort)
    if [ "$ATTACK_SIZE_Gbps" -gt 50 ]; then
      echo "[4/5] CRITICAL: Considering BGP blackhole..."
      read -p "Authorize BGP blackhole of $TARGET_IP? (yes/no): " AUTH
      if [ "$AUTH" = "yes" ]; then
        bgp_blackhole "$TARGET_IP" "$INCIDENT_ID"
      fi
    fi
    ;;
    
  "protocol")
    echo "Activating protocol attack mitigation..."
    
    # Enable SYN cookies
    sysctl -w net.ipv4.tcp_syncookies=1
    
    # Tune connection thresholds
    sysctl -w net.ipv4.tcp_max_syn_backlog=8192
    sysctl -w net.ipv4.tcp_synack_retries=2
    sysctl -w net.ipv4.tcp_syn_retries=2
    
    # Deploy iptables rules
    iptables -A INPUT -p tcp --syn -m limit --limit 10/s --limit-burst 20 -j ACCEPT
    iptables -A INPUT -p tcp --syn -j DROP
    
    # Enable connection tracking limiting
    modprobe connlimit
    iptables -A INPUT -p tcp --syn --dport 80 -m connlimit --connlimit-above 20 -j DROP
    iptables -A INPUT -p tcp --syn --dport 443 -m connlimit --connlimit-above 20 -j DROP
    ;;
    
  "application")
    echo "Activating application layer mitigation..."
    
    # Step 1: Enable WAF rules for DDoS
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE/firewall/waf/packages" \
      -H "Authorization: Bearer $CF_TOKEN" \
      -d '{"package_id": "ddos_mitigation", "sensitivity": "high"}'
    
    # Step 2: Implement challenge/response
    # Already handled via Cloudflare managed challenge above
    
    # Step 3: Scale application layer
    echo "Scaling frontend pods to handle load..."
    kubectl scale deployment soc-platform-frontend --replicas=10 -n soc-platform
    ;;
    
  "ss7_signaling")
    echo "CRITICAL: SS7 signaling attack detected!"
    
    # This requires immediate attention from network security team
    send_page "network-security-on-call" "CRITICAL: SS7 Attack detected - $INCIDENT_ID"
    
    # Activate SS7 firewall rules
    ss7_firewall_activate "block_unusual_signaling"
    
    # Notify ANRT (mandatory for signaling attacks)
    anrt_notify_ss7_incident "$INCIDENT_ID"
    ;;
    
  *)
    echo "Unknown attack type: $ATTACK_TYPE"
    exit 1
    ;;
esac

# Step 5: Begin documentation and monitoring
echo "[Final] Setting up enhanced monitoring..."
setup_ddos_monitoring "$TARGET_IP" "$INCIDENT_ID"

echo "=== DDoS RESPONSE INITIATED ==="
echo "Monitor attack using: watch -n 5 ./ddos_status.sh $INCIDENT_ID"
```

---

## Advanced Persistent Threats (APT)

### APT Indicators in Telecom Environment

| Indicator Category | Specific Signs | Relevance to Telecom |
|-------------------|----------------|---------------------|
| **Initial Access** | Spear-phishing, supply chain, zero-day | Targeted executives, vendors |
| **Reconnaissance** | Network scanning, data enumeration | Subscriber database queries |
| **C2 Communication** | DNS tunneling, custom protocols | Blending with legitimate traffic |
| **Lateral Movement** | Pass-the-hash, ticket abuse | Moving toward HLR/billing |
| **Data Staging** | Compression, encryption prep | Call detail records, subscriber data |
| **Exfiltration** | Covert channels, timing | Large data transfers to external |

### APT Response Framework

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APT INCIDENT RESPONSE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: DETECTION & VALIDATION                                    │
│  ├─ Verify threat intelligence match                                │
│  ├─ Assess initial scope                                           │
│  ├─ Determine actor attribution (if possible)                       │
│  └─ Classify as APT based on indicators                             │
│                                                                     │
│  PHASE 2: COVERT CONTAINMENT                                        │
│  ├─ DO NOT alert attacker (if possible)                             │
│  ├─ Implement silent blocking/filtering                             │
│  ├─ Preserve all evidence                                          │
│  └─ Prepare for potential escalation                                │
│                                                                     │
│  PHASE 3: DEEP INVESTIGATION                                        │
│  ├─ Full timeline reconstruction                                    │
│  ├─ Identify all compromised assets                                 │
│  ├─ Map attacker TTPs                                              │
│  └─ MITRE ATT&CK mapping                                           │
│                                                                     │
│  PHASE 4: COORDINATED ERADICATION                                   │
│  ├─ Plan simultaneous actions                                       │
│  ├─ Coordinate with external parties (ANRT, CSIRT)                  │
│  ├─ Execute remediation                                             │
│  └─ Monitor for re-entry attempts                                   │
│                                                                     │
│  PHASE 5: RECOVERY & HARDENING                                      │
│  ├─ Rebuild compromised systems                                     │
│  ├─ Enhance detection capabilities                                  │
│  └─ Update threat intelligence feeds                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### APT Investigation Checklist

```markdown
## APT INVESTIGATION CHECKLIST

### Actor Attribution Analysis
□ Identify target sector relevance (telco-specific threats?)
□ Match TTPs to known threat actor groups
□ Check national/geographic focus of similar campaigns
□ Assess motivation (espionage, financial, sabotage)

### Full Scope Assessment
□ Timeline reconstruction (earliest possible entry point)
□ All systems accessed (domain admin equivalent?)
□ Data accessed or exfiltrated
□ Persistence mechanisms deployed
□ Backdoors or webshells installed

### Evidence Preservation Priority
1. Memory images (volatile artifacts lost on reboot)
2. Active network connections (C2 endpoints)
3. Running processes (malicious tools)
4. Scheduled tasks/persistence
5. Registry/artifact modifications
6. Log files (before rotation)

### Coordination Requirements
□ National CSIRT notification (within 24 hours)
□ ANRT briefing preparation
□ Law enforcement liaison (if criminal activity)
□ Vendor coordination (if supply chain involved)

### Reporting Documentation
□ Detailed technical report (internal)
□ Executive summary (leadership)
□ Sanitized report (for sharing)
□ IOC package for community distribution
□ Lessons learned document
```

---

## Insider Threats

### Insider Threat Categories

| Category | Motivation | Indicators | Detection Method |
|----------|------------|-----------|------------------|
| **Malicious** | Financial gain, revenge, ideology | Data exfiltration, sabotage | DLP, UEBA |
| **Negligent** | Convenience, bypass controls | Policy violations, shadow IT | CASB, training |
| **Compromised** | Account takeover | Anomalous behavior | UEBA, behavioral |

### Insider Threat Detection Signals

```yaml
# insider_threat_indicators.yml
risk_indicators:
  data_access:
    - name: bulk_export
      threshold: ">1000 records in single query"
      weight: high
      alert: true
      
    - name: sensitive_table_access
      tables: ["subscribers", "call_records", "imsi_mapping"]
      conditions: ["outside_business_hours", "unusual_volume"]
      weight: critical
      alert: true
      
    - name: pattern_reconnaissance
      behavior: "sequential table scanning"
      window: "1 hour"
      weight: medium
      alert: false  # accumulate score only

  authentication:
    - name: impossible_travel
      description: "Login from geographically impossible locations"
      time_window: "1 hour"
      distance_km: 1000
      weight: critical
      alert: true
      
    - name: credential_abuse
      behavior: "authentication failures followed by success"
      threshold: ">5 failures"
      weight: high
      alert: true
      
    - name: privileged_access_anomaly
      behavior: "First-time use of privileged account"
      conditions: ["new_device", "unusual_time"]
      weight: high
      alert: true

  behavioral:
    - name: departure_risk
      triggers: ["resignation_submitted", "termination_pending"]
      behaviors: ["increased_data_access", "usb_usage", "email_forwarding"]
      weight: high
      monitoring: "enhanced"

  system_activity:
    - name: unauthorized_software
      behavior: "installation of unauthorized applications"
      examples: ["cloud_storage_clients", "remote_access_tools", "data_wiping"]
      weight: medium
      alert: true
      
    - name: log_clearing
      behavior: "security log modification or clearing"
      weight: critical
      alert: true
      action: "immediate_investigation"
```

### Insider Threat Investigation Procedure

```bash
#!/bin/bash
# insider_threat_investigation.sh - Structured investigation

SUBJECT_USER=$1
INDICATOR_TYPE=$2
INCIDENT_ID="INSIDER-$(date +%Y%m%d%H%M%S)"

echo "=== INSIDER THREAT INVESTIGATION ==="
echo "Subject: $SUBJECT_USER"
echo "Indicator: $INDICATOR_TYPE"
echo "Incident ID: $INCIDENT_ID"
echo "Investigator: $(whoami)"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# IMPORTANT: Maintain confidentiality throughout investigation
# Do not alert subject prematurely

# Step 1: Preserve evidence without alerting subject
echo "[1/6] Preserving evidence..."

# Create secure evidence directory
mkdir -p /evidence/$INCIDENT_ID
chmod 700 /evidence/$INCIDENT_ID

# Collect authentication logs
ldapsearch -x "(&(uid=$SUBJECT_USER)(objectClass=person))" \
  -b "ou=audit,dc=djezzy,dc=dz" \
  > /evidence/$INCIDENT_ID/auth_logs.ldif

# Collect DLP events (if applicable)
query_dlp_events --user "$SUBJECT_USER" --days 30 \
  > /evidence/$INCIDENT_ID/dlp_events.json

# Collect endpoint activity (via EDR)
osquery_query "SELECT * FROM users WHERE username='$SUBJECT_USER';" \
  > /evidence/$INCIDENT_ID/user_profile.json

# Step 2: Data access audit
echo "[2/6] Auditing data access patterns..."

# Database access audit
psql -U security_audit -d postgres <<SQL
SELECT 
    schema_name,
    table_name,
    operation_type,
    COUNT(*) as access_count,
    MIN(access_time) as first_access,
    MAX(access_time) as last_access,
    SUM(row_count_estimate) as total_rows_touched
FROM data_access_audit
WHERE user_name = '$SUBJECT_USER'
  AND access_time >= NOW() - INTERVAL '90 days'
GROUP BY schema_name, table_name, operation_type
ORDER BY total_rows_touched DESC
LIMIT 50;
SQL

# Step 3: Network activity review
echo "[3/6] Reviewing network activity..."

# Extract proxy logs for subject's IP addresses
get_user_ips "$SUBJECT_USER" | while read ip; do
  extract_proxy_logs --src-ip "$ip" --days 30 \
    >> /evidence/$INCIDENT_ID/proxy_logs.txt
done

# Check for unusual outbound connections
grep -E "(POST|PUT|upload|transfer)" /evidence/$INCIDENT_ID/proxy_logs.txt \
  | head -100 > /evidence/$INCIDENT_ID/suspicious_transfers.txt

# Step 4: File system activity
echo "[4/6] Checking file system activity..."

# USB device connection history (via Endpoint Manager)
query_usb_history --user "$SUBJECT_USER" --days 90 \
  > /evidence/$INCIDENT_ID/usb_activity.json

# Cloud storage usage
query_cloud_sync --user "$SUBJECT_USER" \
  > /evidence/$INCIDENT_ID/cloud_activity.json

# Email forwarding rules (potential data exfiltration)
query_email_rules --user "$SUBJECT_USER" \
  > /evidence/$INCIDENT_ID/email_rules.json

# Step 5: Interview preparation
echo "[5/6] Preparing interview materials..."

cat > /evidence/$INCIDENT_ID/interview_prep.md <<EOF
# Interview Preparation: $SUBJECT_USER

## Background Information
- Employee ID: $(get_employee_id "$SUBJECT_USER")
- Department: $(get_department "$SUBJECT_USER")
- Role: $(get_role "$SUBJECT_USER")
- Hire Date: $(get_hire_date "$SUBJECT_USER")
- Access Level: $(get_access_level "$SUBJECT_USER")

## Key Questions to Address
1. Explain the following activities observed on [DATES]:
   - [List specific anomalous activities]

2. What business need drove the following data accesses?
   - [List large/unusual data accesses]

3. Are you aware of any policy exceptions granted?

4. Who can corroborate your work activities during this period?

## Evidence Summary
$(wc -l /evidence/$INCIDENT_ID/*.* | tail -1)

## Recommended Next Steps
- [ ] Schedule interview with HR present
- [ ] Review findings with legal counsel
- [ ] Determine if law enforcement involvement needed
EOF

# Step 6: Risk scoring
echo "[6/6] Calculating risk score..."

RISK_SCORE=$(calculate_insider_risk \
  --user "$SUBJECT_USER" \
  --evidence-dir "/evidence/$INCIDENT_ID")

echo "Risk Score: $RISK_SCORE/100"

if [ "$RISK_SCORE" -ge 80 ]; then
  echo "CRITICAL RISK - Immediate containment recommended"
  echo "Actions: Account restriction, HR notification, legal briefing"
elif [ "$RISK_SCORE" -ge 60 ]; then
  echo "HIGH RISK - Enhanced monitoring recommended"
  echo "Actions: Continue investigation, prepare interview"
else
  echo "MODERATE RISK - Continued observation"
  echo "Actions: Document findings, schedule routine check-in"
fi

echo "=== INVESTIGATION PHASE COMPLETE ==="
echo "Next steps per insider threat playbook"
```

---

## Telecom-Specific Incidents

### SIM Swapping Fraud

```markdown
## SIM SWAP INCIDENT RESPONSE

Detection Sources:
- Multiple SIM swap requests for same subscriber
- Requests from unusual locations/channels
- Post-swap behavior anomalies (password resets, 2FA bypass)

Response Procedure:

1. IMMEDIATE ACTIONS (0-15 minutes)
   □ Freeze affected subscriber accounts
   □ Block SIM swap completion for flagged requests
   □ Preserve request audit trail
   □ Alert fraud team

2. INVESTIGATION (15 min - 4 hours)
   □ Identify all affected subscribers
   □ Determine fraud vector (compromised agent, phishing, etc.)
   □ Calculate financial exposure
   □ Identify pattern (organized crime vs individual)

3. REMEDIATION (4-24 hours)
   □ Reverse fraudulent SIM swaps
   □ Restore original SIM profiles
   □ Reset compromised credentials
   □ Notify affected customers

4. REGULATORY (Within 72 hours)
   □ ANRT notification if threshold met
   □ Internal compliance report
   □ Process improvement recommendations
```

### SS7/Diameter Signaling Attacks

```yaml
# ss7_security_response.yml
signaling_attack_types:
  location_tracking:
    description: "Unauthorized subscriber location queries"
    detection: "AnyLocationRequest spikes, roaming anomalies"
    response:
      immediate: "Block querying entity"
      regulatory: "ANRT notification required"
      evidence: "Capture CDRs, signaling logs"
      
  interception:
    description: "Call/SMS interception attempts"
    detection: "Unusual redirect requests, duplicate sessions"
    response:
      immediate: "Isolate suspected network element"
      regulatory: "Law enforcement notification"
      evidence: "Full PCAP of signaling session"
      
  fraud:
    description: "Premium rate manipulation, bypass"
    detection: "Revenue anomaly detection, charge verification"
    response:
      immediate: "Block premium destinations"
      regulatory: "ANRT + financial crimes unit"
      evidence: "Billing records, CDRs
```

---

## Containment Strategies by Type

### Strategy Matrix

| Incident Type | Primary Containment | Secondary Measures | Duration |
|--------------|-------------------|-------------------|----------|
| **Malware** | Host isolation | Account suspension, IOC blocking | Hours-days |
| **DDoS** | Traffic scrubbing | Rate limiting, scaling | Hours |
| **APT** | Silent monitoring | Selective blocking, deception | Weeks-months |
| **Insider** | Access reduction | Enhanced monitoring, interview | Days-weeks |
| **Data Breach** | Exfiltration block | Credential reset, forensic | Days |
| **Telecom Fraud** | Service block | Subscriber verification | Hours-days |

### Containment Decision Framework

```
                    ┌──────────────────────────────┐
                    │   CONTAINMENT DECISION       │
                    │                              │
     ┌──────────────┤  Is stealth important?      ├──────────────┐
     │              │  (Attacker awareness risk)  │              │
     │              └──────────────┬───────────────┘              │
     │                             │                              │
     ▼ YES                         ▼ NO                           │
┌─────────────┐          ┌─────────────────────┐                  │
│  STEALTH    │          │   AGGRESSIVE         │                  │
│  MODE       │          │   CONTAINMENT        │                  │
│             │          │                     │                  │
│ • Silent    │          │ • Immediate isolation│                  │
│   blocking  │          │ • Account disable    │                  │
│ • Traffic   │          │ • Credential reset   │                  │
│   redirect  │          │ • Public disclosure  │                  │
│ • Deception │          │                     │                  │
│   deployment│          │ Use when:            │                  │
│             │          │ - Active damage      │                  │
│ Use when:   │          │ - Data at risk       │                  │
│ - APT hunt  │          │ - Safety priority    │                  │
│ - Investigation│       │                     │                  │
└─────────────┘          └─────────────────────┘                  │
                                                                      │
                              ┌──────────────────────────────────────┘
                              │
                              ▼
                 ┌─────────────────────────────┐
                 │   DOCUMENT ALL ACTIONS      │
                 │   Preserve chain of custody │
                 └─────────────────────────────┘
```

---

## ANRT Regulatory Reporting

### Mandatory Reportable Events

Per ANRT Cybersecurity Regulations for Telecommunications Operators:

| Event Category | Reporting Deadline | Report Format | Recipient |
|---------------|-------------------|---------------|-----------|
| Major Service Disruption | 4 hours | Initial notification | ANRT Cyber Division |
| Confirmed Data Breach | 72 hours | Full report | ANRT + Affected Subscribers |
| Significant Security Incident | 7 days | Incident report | ANRT |
| Suspicious Activity Pattern | Monthly | Aggregate statistics | ANRT |
| Annual Security Audit | Annually | Comprehensive report | ANRT |

### ANRT Notification Workflow

```python
# anrt_reporting.py - Automated ANRT notification system
import json
import requests
from datetime import datetime
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class ANRTNotification:
    """Structure for ANRT regulatory notifications"""
    operator_id: str = "DJEZZY"
    notification_id: str = ""
    notification_type: str = ""  # initial, update, final
    incident_id: str = ""
    incident_category: str = ""
    timestamp: str = ""
    
    # Incident details
    summary: str = ""
    affected_services: list = None
    estimated_affected_subscribers: int = 0
    data_breach_confirmed: bool = False
    data_types_affected: list = None
    
    # Technical details (sanitized)
    attack_vector: str = ""
    containment_status: str = ""
    recovery_status: str = ""
    
    # Contacts
    technical_contact: Dict = None
    executive_contact: Dict = None
    
    def __post_init__(self):
        if self.data_types_affected is None:
            self.data_types_affected = []
        if self.affected_services is None:
            self.affected_services = []
        if self.timestamp == "":
            self.timestamp = datetime.utcnow().isoformat()
        if self.notification_id == "":
            self.notification_id = f"ANRT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

class ANRTReportingService:
    """Service for managing ANRT regulatory notifications"""
    
    ANRT_API_BASE = "https://notification.anrt.dz/api/v1"
    ANRT_EMAIL = "cybersurete@anrt.dz"
    
    def __init__(self, api_key: str, encryption_key: str):
        self.api_key = api_key
        self.encryption_key = encryption_key
    
    def submit_initial_notification(self, notification: ANRTNotification) -> Dict:
        """Submit initial 4-hour notification for major incidents"""
        
        payload = {
            "notification_id": notification.notification_id,
            "operator_id": notification.operator_id,
            "notification_type": "initial",
            "submission_timestamp": notification.timestamp,
            
            "incident_summary": {
                "incident_id": notification.incident_id,
                "category": notification.incident_category,
                "summary": notification.summary,
                "first_detected": notification.timestamp,  # Would be actual detection time
                "current_status": "active"
            },
            
            "impact_assessment": {
                "services_affected": notification.affected_services,
                "estimated_subscribers_affected": notification.estimated_affected_subscribers,
                "data_breach": notification.data_breach_confirmed,
                "data_categories": self._sanitize_data_types(notification.data_types_affected),
                "service_impact_percentage": self._calculate_impact_percentage(notification)
            },
            
            "initial_response": {
                "containment_actions_taken": [],
                "coordination_with_authorities": False,
                "subscriber_notification": False
            },
            
            "contacts": {
                "technical_24h": notification.technical_contact,
                "executive": notification.executive_contact
            }
        }
        
        # Submit to ANRT portal
        response = requests.post(
            f"{self.ANRT_API_BASE}/notifications/initial",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        return {
            "success": response.status_code == 201,
            "response_code": response.status_code,
            "notification_id": notification.notification_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def submit_final_report(self, notification: ANRTNotification, 
                           root_cause: str, lessons_learned: list) -> Dict:
        """Submit final 72-hour comprehensive report"""
        
        payload = {
            "notification_id": notification.notification_id,
            "operator_id": notification.operator_id,
            "notification_type": "final",
            "submission_timestamp": datetime.utcnow().isoformat(),
            
            "incident_timeline": self._build_timeline(notification.incident_id),
            
            "technical_analysis": {
                "root_cause": root_cause,
                "attack_vector": notification.attack_vector,
                "vulnerabilities_exploited": [],
                "indicators_of_compromise": [],  # Sanitized
                "systems_affected": []
            },
            
            "response_actions": {
                "detection_method": "",
                "containment_strategy": notification.containment_status,
                "eradication_steps": [],
                "recovery_actions": notification.recovery_status,
                "total_resolution_time_hours": 0
            },
            
            "impact_final_assessment": {
                "actual_subscribers_affected": notification.estimated_affected_subscribers,
                "data_records_exposed": 0,
                "service_downtime_minutes": 0,
                "financial_impact_dzd": 0
            },
            
            "preventive_measures": {
                "immediate_actions": [],
                "long_term_improvements": lessons_learned,
                "policy_updates": []
            },
            
            "regulatory_compliance": {
                "subscriber_notified": False,
                "notification_date": None,
                "law_enforcement_involved": False
            }
        }
        
        response = requests.post(
            f"{self.ANRT_API_BASE}/notifications/final",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=60
        )
        
        return response.json()
    
    def _sanitize_data_types(self, data_types: list) -> list:
        """Remove sensitive classification details for reporting"""
        sanitized = []
        mapping = {
            "imsi": "Subscriber Identifier",
            "msisdn": "Phone Number",
            "call_detail_record": "Call Records",
            "location_data": "Location Information",
            "billing_data": "Billing Information",
            "identity_document": "Identity Verification"
        }
        for dt in data_types:
            sanitized.append(mapping.get(dt.lower(), dt))
        return sanitized
    
    def _calculate_impact_percentage(self, notification: ANRTNotification) -> float:
        """Calculate service impact percentage"""
        # This would integrate with actual subscriber base data
        total_subscribers = 16_000_000  # Approximate Djezzy subscriber base
        if notification.estimated_affected_subscribers > 0:
            return (notification.estimated_affected_subscribers / total_subscribers) * 100
        return 0.0
    
    def _build_timeline(self, incident_id: str) -> list:
        """Build incident timeline from case management system"""
        # Integrate with TheHive API to pull timeline
        hive_url = "https://hive.soc.djezzy.local/api/v1/case"
        # Implementation would query TheHive timeline
        return []  # Placeholder
```

---

## Coordination with National CSIRT

### Algeria CSIRT Engagement Process

Djezzy SOC maintains a formal relationship with the Algerian National Computer Emergency Response Team (Alg-CSIRT/CERT-DZ).

### When to Engage National CSIRT

| Scenario | Engagement Level | Timeline |
|----------|------------------|----------|
| Nation-state APT activity | Full coordination | Within 24 hours |
| Large-scale DDoS from domestic sources | Information sharing | As needed |
| New malware variant affecting multiple sectors | Bi-lateral exchange | Within 48 hours |
| Critical vulnerability discovery | Responsible disclosure | Per vendor coordination |
| Cross-border incident | International coordination | Immediately |

### CSIRT Information Sharing Format

```json
{
  "portal": "TRUSTED-integrator",
  "message_type": "incident_report",
  "classification": "amber",
  "sender": "soc@djezzy.dz",
  "recipient": "cert@cert.dz",
  
  "incident": {
    "incident_id": "INC-2025-XXXXX",
    "detection_time": "2025-01-15T08:30:00Z",
    "reporting_time": "2025-01-15T10:00:00Z",
    
    "initial assessment": {
      "category": "apt",
      "target_sector": "telecommunications",
      "threat_actor_confidence": "medium",
      "ttps_observed": [
        "T1566.001",  // Spearphishing Attachment
        "T1059.001",  // PowerShell
        "T1021.001",  // Remote Desktop Protocol
        "T1048.003"   // Exfiltration over Alternative Protocol
      ]
    },
    
    "indicators": {
      "hashes": ["sha256:..."],
      "domains": [...],
      "ips": [...],
      "urls": [...]
    },
    
    "requested_action": [
      "threat_intel_correlation",
      "victim_notification_support",
      "international_liaison_if_applicable"
    ],
    
    "contact": {
      "operational": {
        "name": "SOC Duty Officer",
        "email": "soc-duty@djezzy.dz",
        "phone": "+213XXXXXXXXX",
        "pgp_fingerprint": "..."
      },
      "management": {
        "name": "CISO",
        "email": "ciso@djezzy.dz"
      }
    }
  }
}
```

---

## Appendix: Quick Reference Cards

### Security Incident Commander Card

```
╔═══════════════════════════════════════════════════════════════╗
║        SECURITY INCIDENT COMMANDER QUICK REFERENCE            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  MALWARE:                                                     ║
║  1. Isolate host (NAC/Firewall)                               ║
║  2. Collect volatile evidence FIRST                           ║
║  3. Submit sample to Cortex sandbox                          ║
║  4. Extract IOCs, push to MISP                                ║
║                                                               ║
║  DDoS:                                                        ║
║  1. Activate Cloudflare mitigation                           ║
║  2. Implement edge rate limiting                             ║
║  3. ISP scrubbing if >10Gbps                                 ║
║  4. BGP blackhole as last resort                             ║
║                                                               ║
║  APT:                                                         ║
║  1. DO NOT alert attacker - covert mode                      ║
║  2. Preserve ALL evidence immediately                        ║
║  3. Engage CSIRT within 24 hours                             ║
║  4. Prepare ANRT notification                                ║
║                                                               ║
║  INSIDER:                                                    ║
║  1. Silent evidence collection                               ║
║  2. Involve HR/Legal BEFORE confrontation                   ║
║  3. Document everything thoroughly                           ║
║  4. Follow labor law requirements                           ║
║                                                               ║
║  REGULATORY TRIGGERS:                                         ║
║  ▸ Subscriber data breach → ANRT <72h                       ║
║  ▸ Service >10% impacted → ANRT <4h                         ║
║  ▸ SS7/signaling attack → ANRT immediate                   ║
║                                                               ║
║  KEY CONTACTS:                                                ║
║  ANRT Cyber: cybersurete@anrt.dz                             ║
║  CERT-DZ: cert@cert.dz                                       ║
║  Legal Emergency: [Contact]                                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-04-01 | Security Team | Initial framework |
| 1.5 | 2024-09-01 | SOC Lead | Added telecom-specific scenarios |
| 2.0 | 2025-01-15 | CISO Office | Complete revision, ANRT integration |

---

*This document contains sensitive security procedures. Distribution limited to authorized personnel with need-to-know. Handle according to CONFIDENTIAL classification guidelines.*
