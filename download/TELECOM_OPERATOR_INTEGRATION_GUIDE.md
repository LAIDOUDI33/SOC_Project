# Algeria National SOC Platform - Telecom Operator Integration Guide
# 🇩🇿 Mobile Operator Deployment & Configuration

## Overview

This guide provides comprehensive instructions for integrating the **Algeria National SOC Platform** with mobile telecommunications operators. It covers network architecture, security monitoring setup, ARPT compliance, and operational procedures.

**Supported Operators:**
- 📱 **Mobilis** (Algérie Télécom Mobile) - MCC: 603, MNC: 01
- 📱 **Djezzy** (Vodafone Algeria) - MCC: 603, MNC: 02  
- 📱 **Ooredoo Algeria** - MCC: 603, MNC: 03

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Network Architecture](#network-architecture)
3. [Installation Steps](#installation-steps)
4. [Protocol Integration](#protocol-integration)
5. [ARPT Compliance Setup](#arpt-compliance-setup)
6. [Operator-Specific Configuration](#operator-specific-configuration)
7. [Security Monitoring](#security-monitoring)
8. [Testing & Validation](#testing--validation)
9. [Operational Procedures](#operational-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Server CPU** | 8 cores | 16+ cores |
| **RAM** | 32 GB | 64 GB |
| **Storage** | 500 GB SSD | 1 TB NVMe |
| **Network** | 1 Gbps | 10 Gbps |
| **Database** | PostgreSQL 14+ | PostgreSQL 15 with replication |

### Software Requirements

```bash
# Core Dependencies
- Docker & Docker Compose (latest)
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Nginx 1.24+

# Security Tools
- Wazuh SIEM 4.x
- Suricata IDS 7.x
- MISP 2.4+
- TheHive 5.x
```

### Network Access Requirements

The SOC platform requires connectivity to:

```
┌─────────────────────────────────────────────────────────────┐
│                    SOC Platform Network                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌──────────┐    ┌─────────────────────┐  │
│   │  Wazuh   │    │ Suricata │    │      MISP          │  │
│   │   SIEM   │    │   IDS    │    │  Threat Intel       │  │
│   └────┬────┘    └────┬─────┘    └──────────┬──────────┘  │
│        │               │                       │              │
│        ▼               ▼                       ▼              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Core Network (GN/MGi)                 │  │
│   │                                                     │  │
│   │   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │  │
│   │   │ HLR  │  │ MSC  │  │ SGSN │  │ GGSN │         │  │
│   │   └──────┘  └──────┘  └──────┘  └──────┘         │  │
│   │                                                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                         │                                   │        │
│   ┌────────────────────┴───────────────────────────────┐  │
│   │              Radio Access Network                │  │
│   │                                                   │  │
│   │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │  │
│   │   │BSC  │  │ RNC │  │eNB │  │gNB │            │  │
│   │   └─────┘  └─────┘  └─────┘  └─────┘           │  │
│   └───────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Network Architecture

### Data Collection Points

#### 1. Signaling Monitoring (SS7/Diameter)

**SS7 Monitoring Setup:**
```yaml
# SS7 Probe/Monitor Configuration
ss7_monitor:
  type: "passive_probe"  # or "STP_link"
  
  # Connection to STP (Signaling Transfer Point)
  stp_connection:
    host: "stp.operator.dz"
    port: 2940
    protocol: "M2PA"  # MTP2 User Adaptation
    
  # Capture filters
  capture_filters:
    - "MAP/any"           # All MAP operations
    - "ISUP/any"          # ISUP call control
    - "CAP/any"            # CAMEL Application Part
    - "TCAP/any"           # Transaction Capabilities Application Part
    
  # Critical operations to alert on
  critical_operations:
    - "sendRoutingInfoForSM"
    - "provideSubscriberInfo"
    - "forwardShortMessage"
    - "cancelLocation"

**Diameter Monitoring:**
```yaml
# Diameter/LTE Monitoring
diameter_monitor:
  interface_type: "S6a"  # HSS interface
  
  hss_connection:
    host: "hss.operator.dz"
    realm: "operator.dz"
    
  monitored_commands:
    - "Authentication-Information-Request"
    - "Update-Location-Request"
    - "Cancel-Location-Request"
    - "Notify-Request"
```

#### 2. GTP Tunnel Monitoring

**GTPv1/v2 Traffic Mirroring:**
```bash
# Configure traffic mirroring on Gi-LAN/Gn interfaces
# For Cisco routers:
interface TenGigabitEthernet0/0/0
  ip mirror source <source-interface> destination <SOC-probe-ip>

# For GGSN/PGW (Linux-based):
# Use tcpdump or specialized probe
tcpdump -i eth0 -G -s0 -w - 'port 2123 or port 2152 or port 3386' | \
  socat - UDP-DATAGRAM:5555 -
```

#### 3. CDR/NDR Integration

**Call Detail Records:**
```sql
-- CDR table structure for fraud detection
CREATE TABLE cdr_records (
  id SERIAL PRIMARY KEY,
  record_type VARCHAR(20),     -- MOCT/MTCT/SMS
  calling_number VARCHAR(20),
  called_number VARCHAR(20),
  imsi VARCHAR(30),
  imei VARCHAR(20),
  timestamp TIMESTAMP,
  duration INTEGER,
  cell_id BIGINT,
  lac INTEGER,
  mcc VARCHAR(5),
  mnc VARCHAR(5),
  roaming_indicator BOOLEAN,
  service_type VARCHAR(20),
  charge_amount DECIMAL(10,2)
);

-- Indexes for common queries
CREATE INDEX idx_cdr_imsi ON cdr_records(imsi);
CREATE INDEX idx_cdr_timestamp ON cdr_records(timestamp);
CREATE INDEX idx_cdr_roaming ON cdr_records(roaming_indicator, timestamp);
```

---

## Installation Steps

### Step 1: Environment Preparation

```bash
# Create SOC user and directories
sudo useradd -m -s /bin/bash socadmin
sudo mkdir -p /opt/soc-platform/{config,data,logs,backups,certs}
sudo chown -R socadmin:socadmin /opt/soc-platform

# Set kernel parameters for high-performance networking
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65536
sudo sysctl -w net.core.netdev_max_backlog=5000

# Persist settings
echo "net.core.somaxconn=65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog=65536" >> /etc/sysctl.conf
sysctl -p
```

### Step 2: Database Setup

```bash
# Initialize PostgreSQL
sudo -u postgres psql <<EOF
CREATE USER soc_user WITH PASSWORD '<strong_password>';
CREATE DATABASE soc_production OWNER = soc_user;
GRANT ALL PRIVILEGES ON DATABASE soc_production TO soc_user;
\c soc_production
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOF

# Run migrations
cd /opt/soc-platform
npm run db:migrate

# Seed initial data (operators, threat types, etc.)
npm run db:seed
```

### Step 3: Docker Services Deployment

```bash
# Clone repository
git clone https://github.com/LAIDOUDI33/SOC_Project.git /opt/soc-platform
cd /opt/soc-platform

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
# Set DATABASE_URL, OPERATOR_ID, API keys, etc.

# Start services
docker compose up -d

# Verify all services are running
docker compose ps
docker compose logs -f
```

### Step 4: SSL/TLS Configuration

```bash
# Generate certificates (or use operator's PKI)
mkdir -p /opt/soc-platform/certs

# Self-signed for internal use (replace with proper certs in production)
openssl req -x509 -nodes -days 3650 \
  -newkey rsa:4096 \
  -keyout /opt/soc-platform/certs/soc.key \
  -out /opt/soc-platform/certs/soc.crt \
  -subj "/C=DZ/O=National SOC/CN=soc.arpt.gov.dz"

# Secure permissions
chmod 600 /opt/soc-platform/certs/soc.key
chown socadmin:socadmin /opt/soc-platform/certs/*
```

### Step 5: Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/soc-platform
upstream soc_backend {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name soc.arpt.gov.dz;

    ssl_certificate /opt/soc-platform/certs/soc.crt;
    ssl_certificate_key /opt/soc-platform/certs/soc.key;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://soc_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint (no auth required)
    location /health {
        proxy_pass http://soc_backend;
        access_log off;
    }
}
```

---

## Protocol Integration

### SS7/MAP Integration

**Wazuh Decoder Configuration:**
```xml
<!-- /var/ossec/etc/decoders/ss7_map_decoder.xml -->
<decoder name="ss7-map">
  <prematch>^SS7</prematch>
</decoder>

<decoder name="ss7-map-location">
  <parent>ss7-map</parent>
  <prematch type="pcre2">sendRoutingInfoForSM|provideSubscriberInfo</prematch>
  <regex offset="after_prematch">IMSI:\s+(\d{15})</regex>
  <order>IMSISUB</order>
</decoder>
```

**Custom Rules for SS7 Attacks:**
```xml
<!-- /var/ossec/rules/ss7_attack_rules.xml -->
<group name="ss7,attack,telecom">
  
  <!-- Location Tracking Detection -->
  <rule id="150001" level="12">
    <if_sid>ss7-map</if_sid>
    <field name="ss7.operation">sendRoutingInfoForSM</field>
    <description>Potential subscriber location tracking attempt</description>
  </rule>

  <!-- SMS Interception -->
  <rule id="150002" level="13">
    <if_sid>ss7-map</if_sid>
    <field name="ss7.operation">forwardShortMessage</field>
    <description>SMS interception detected - review immediately</description>
  </rule>

  <!-- Unusual HLR Query Pattern -->
  <rule id="150003" level="10">
    <if_sid>ss7-map</if_sid>
    <field name="ss7.query_count">|5</field>
    <description>High volume of subscriber queries from single origin</description>
  </rule>

</group>
```

### GTP Integration with Suricata

**Suricata Rules for Telecom:**
```conf
# /etc/suricata/rules/telecom_gtp.rules

# GTP Tunnel Hijacking Attempt
alert gtp any any -> any any (msg:"GTP-C Create PDP Context with suspicious TEID"; \
  content:"|00 10 02|"; gtp_version:1; msg_type:16; \
  classtype:telecom-gtp-hijack; sid:2000001; rev:1;)

# GTPv2 Session Manipulation
alert gtp any any -> any any (msg:"GTPv2 Create Session with zero APN"; \
  gtp_version:2; msg_type:32; \
  classtype:telecom-gtp-manipulation; sid:2000002; rev:1;)

# Abnormal GTP Message Rate (DoS indicator)
alert gtp any any -> any any (msg:"High rate GTP messages - possible signaling storm"; \
  threshold:type both, track by_src, count 100, seconds 60; \
  classtype:telecom-signaling-storm; sid:2000003; rev:1;)

# Suspicious APN Usage
alert gtp any any -> any any (msg:"Suspicious APN in GTP session"; \
  content:"APN"; nocase; pcre:/free|bypass|vpn|tunnel/i; \
  classtype:telecom-policy-violation; sid:2000004; rev:1;)
```

### Diameter/LTE Monitoring

**FreeRadius Server for Diameter Proxying:**
```conf
# /etc/freeradius/clients.conf
client hss.operator.dz {
    ipaddr = <HSS_IP_ADDRESS>
    secret = <shared_secret>
    nas_type = diameter
    virtual_server = lte-auth
}

# Dictionary additions for LTE
$INCLUDE dictionary/dictionary.lte
$INCLUDE dictionary/diameter.dictionary
```

---

## ARPT Compliance Setup

### Automated Reporting Configuration

```javascript
// config/arpt-compliance.js
module.exports = {
  // Reporting schedule (Cron expressions)
  schedules: {
    monthlyReport: '0 6 1 * *',           // 1st of each month at 06:00
    incidentNotification: '*/15 * * * *', // Every 15 minutes check
    breachUrgent: '* * * * *',             # Continuous monitoring
  },
  
  // ARPT submission endpoint
  submission: {
    url: process.env.ARPT_API_URL || 'https://api.arpt.dz/v1/reports',
    apiKey: process.env.ARPT_API_KEY,
    format: 'ARPT-XML-v2.0',
    encryption: 'AES-256-GCM'
  },
  
  // Required report fields per ARPT specification
  requiredFields: {
    organizationId: true,
    reportingPeriod: { start: true, end: true },
    summary: {
      totalIncidents: true,
      criticalIncidents: true,
      subscribersAffected: true,
      servicesImpacted: true
    },
    incidents: [{
      reference: true,
      category: true,
      title: true,
      description: true,
      severity: true,
      timeline: true,
      impactAssessment: true,
      mitigationsTaken: true
    }],
    metrics: {
      securityEvents: true,
      fraudAttempts: true,
      privacyViolations: true,
      complianceStatus: true
    }
  },
  
  // Data retention enforcement
  retentionPolicy: {
    years: 7,                    // 7 years per Algerian law
    anonymizeAfter: '90d',        // Anonymize PII after 90 days
    secureDelete: true,          // Use cryptographic deletion
    auditTrailKeep: 'forever'     // Never delete audit logs
  }
};
```

### Subscriber Privacy Protection

```typescript
// Privacy levels configuration
const PRIVACY_LEVELS = {
  standard: {
    imsiMask: 'keep-mcc-mnc-only',
    msisdnMask: 'mask-last-6-digits',
    ipAddressHash: 'sha256',
    locationPrecision: 'wilaya-level'
  },
  enhanced: {
    imsiMask: 'keep-mcc-only',
    msisdnMask: 'mask-last-8-digits',
    ipAddressHash: 'sha256',
    locationPrecision: 'region-level',
    requireJustification: true,
    autoAnonymizeReports: true
  },
  maximum: {
    imsiMask: 'full-redact',
    msisdnMask: 'full-redact',
    ipAddressHash: 'sha512',
    locationPrecision: 'country-level',
    requireJustification: true,
    dualAuthorization: true,
    logAllAccess: true
  }
};
```

---

## Operator-Specific Configuration

### Mobilis Configuration

```yaml
# config/operators/mobilis.yaml
operator:
  id: mobilis
  name: "Mobilis"
  parent: "Algérie Télécom"
  mcc: "603"
  mnc: "01"
  
network:
  core:
    hlr:
      host: "hlr.mobilis.internal"
      point_code: "1-1-1"
      backup: "hlr-backup.mobilis.internal"
      
    msc_pool:
      - host: "msc01.mobilis.internal"
        point_code: "2-1-1"
        capacity: 2000000
      - host: "msc02.mobilis.internal"
        point_code: "2-1-2"
        capacity: 1800000
        
    sgsn_pool:
      - host: "sgsn01.mobilis.internal"
        point_code: "3-1-1"
        apns: ["internet.mobilis.dz", "mms.mobilis.dz"]
        
    ggsn:
      host: "ggsn.mobilis.internal"
      apns:
        default: "internet.mobilis.dz"
        mms: "mms.mobilis.dz"
        enterprise: "corp.mobilis.dz"
        
  radio:
    bsc_count: 48
    rnc_count: 12
    enodeb_count: 3500
    gnodeb_count: 850
    
monitoring:
  ss7_probes:
    - location: "algiers-dc"
      stp_primary: "stp-alg-01"
      links: ["link-hlr", "link-msc-pool"]
      
  diameter:
    hss_realm: "mobilis.dz"
    pcrf_realm: "pcrf.mobilis.dz"
    
compliance:
  arpt_contact: "arpt@mobilis.dz"
  data_retention_days: 2555
  privacy_level: "maximum"
  
thresholds:
  max_auth_failures_per_minute: 10
  max_roaming_attempts_per_hour: 45
  suspicious_location_change_km: 400
  signaling_storm_threshold: 8000
```

### Djezzy Configuration

```yaml
# config/operators/djezzy.yaml
operator:
  id: djezzy
  name: "Djezzy"
  parent: "Vodafone Group"
  mcc: "603"
  mnc: "02"
  
network:
  # Similar structure with Djezzy-specific values
  core:
    hlr:
      host: "hlr.djezzy.internal"
      point_code: "1-2-1"
      
    msc_pool:
      - host: "msc01.djezzy.internal"
        point_code: "2-2-1"
      - host: "msc02.djezzy.internal"
        point_code: "2-2-2"
        
  radio:
    bsc_count: 42
    rnc_count: 10
    enodeb_count: 2800
    gnodeb_count: 620
    
compliance:
  # Vodafone global policies + local ARPT requirements
  privacy_level: "enhanced"
  
thresholds:
  max_auth_failures_per_minute: 15
  # Djezzy has higher thresholds due to larger international presence
  max_roaming_attempts_per_hour: 60
```

### Ooredoo Configuration

```yaml
# config/operators/ooredoo.yaml
operator:
  id: ooredoo
  name: "Ooredoo Algeria"
  parent: "Ooredoo Group"
  mcc: "603"
  mnc: "03"
  
network:
  core:
    hlr:
      host: "hlr.ooredoo.internal"
      point_code: "1-3-1"
      
  radio:
    bsc_count: 35
    rnc_count: 8
    enodeb_count: 2200
    gnodeb_count: 480
    
compliance:
  privacy_level: "enhanced"
  
thresholds:
  max_auth_failures_per_minute: 12
  max_roaming_attempts_per_hour: 50
```

---

## Security Monitoring

### Real-time Alert Dashboard

Key metrics to monitor:

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|---------------------|--------|
| SS7 location requests/min | >100 | >500 | Investigate potential tracking |
| GTP tunnel creation failures | >10% | >25% | Check for DoS |
| Authentication failures/subscriber | >5/min | >20/min | Potential credential stuffing |
| Roaming anomalies/hour | >10 | >50 | Fraud investigation |
| SIM swap attempts/day | >5 | >20 | Block and investigate |
| IRSF indicators | Any | >3/day | Immediate response |

### Alert Escalation Matrix

```
Level 1 (Info) → Auto-closed after 24h if no pattern
Level 2 (Low) → Analyst queue, review within 4h
Level 3 (Medium) → Senior analyst assignment, 1h SLA
Level 4 (High) → Incident creation, 30min SLA
Level 5 (Critical) → Manager notification + ARPT if applicable, immediate
```

---

## Testing & Validation

### Pre-Deployment Checklist

```bash
#!/bin/bash
# pre-deployment-check.sh

echo "=== SOC Platform Pre-Deployment Validation ==="

# 1. Database Connectivity
echo "[1/10] Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Database OK" || echo "❌ Database FAILED"

# 2. Redis Connection
echo "[2/10] Testing Redis..."
redis-cli -h $REDIS_HOST ping >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Redis OK" || echo "❌ Redis FAILED"

# 3. Wazuh Agent Status
echo "[3/10] Checking Wazuh agents..."
curl -sf http://localhost:55000/agents/summary >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Wazuh OK" || echo "⚠️ Wazuh not responding"

# 4. Suricata Status
echo "[4/10] Checking Suricata..."
suricata -T >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Suricata rules loaded" || echo "⚠️ Suricata issue"

# 5. Protocol Parser Tests
echo "[5/10] Testing protocol parsers..."
node -e "
const { GTPParser } = require('./src/lib/telecom/protocol-parsers');
const testPacket = Buffer.from('300001400000000000000010', 'hex');
const result = GTPParser.parse(testPacket);
console.log(result.severity === 'info' ? '✅ GTP parser OK' : '⚠️ GTP parser warning');
"

# 6-10. Additional checks...
echo ""
echo "=== Validation Complete ==="
```

### Integration Test Scenarios

1. **SS7 Location Tracking Test**
   - Simulate `sendRoutingInfoForSM` from unusual point code
   - Verify alert generation
   - Check ARPT notification trigger

2. **GTP Tunnel Attack Test**
   - Send malformed GTP Create PDP Context
   - Validate detection and blocking

3. **Roaming Fraud Test**
   - Simulate high-value destination calls
   - Verify IRSF detection

4. **Data Breach Simulation**
   - Generate breach notification
   - Validate 24-hour ARPT reporting window

---

## Operational Procedures

### Daily Operations

| Time | Task | Frequency |
|------|------|----------|
| 06:00 | Review overnight alerts | Daily |
| 09:00 | ARPT compliance check | Daily |
| 12:00 | Threat intel update sync | Daily |
| 18:00 | Metrics collection | Daily |
| 22:00 | Backup verification | Daily |

### Incident Response Flow

```
Alert Detected
     ↓
Automatic Classification (ML + Rules)
     ↓
┌─────────────────────┐
│ Severity Assessment  │ ← Human analyst review for High/Critical
└─────────────────────┘
     ↓
┌─────────────────────┐
│ Triage & Assignment │
└─────────────────────┘
     ↓
┌─────────────────────┐
│ Investigation       │ ← Protocol analysis, PCAP review
└─────────────────────┘
     ↓
┌─────────────────────┐
│ Containment         │ ← Block IPs, isolate affected systems
└─────────────────────┘
     ↓
┌─────────────────────┐
│ Eradication         │ ← Patch vulnerabilities, remove persistence
└─────────────────────┘
     ↓
┌─────────────────────┐
│ Recovery & Lessons  │
└─────────────────────┘
     ↓
┌─────────────────────┐
│ ARPT Report (if req) │ ← Within 24h for critical incidents
└─────────────────────┘
```

---

## Troubleshooting

### Common Issues

#### Issue: SS7 probes not receiving traffic
```bash
# Check STP connectivity
tcpdump -i eth0 port 2940 -c 10

# Verify M3UA link status
ss7_tool status --link link-name

# Check firewall rules
iptables -L -n | grep 2940
```

#### Issue: GTP parsing errors
```bash
# Verify packet capture is working
tcpdump -i eth0 port 2123 -c 5 -XX

# Check byte order (network vs host)
# GTP uses big-endian for header fields
```

#### Issue: ARPT submission failing
```bash
# Test API connectivity
curl -X POST https://api.arpt.dz/v1/test \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# Validate XML schema
xmllint --schema arpt-schema.xsd report.xml
```

### Support Contacts

| Resource | Contact |
|----------|---------|
| **Platform Support** | soc-support@arpt.gov.dz |
| **ARPT Technical** | technique@arpt.gov.dz |
| **Emergency SOC Line** | +213 555-SOC1 (24/7) |
| **Operator NOC** | See operator-specific contacts above |

---

## Appendix A: Quick Reference Commands

```bash
# Start all services
docker compose up -d

# View real-time alerts
curl -s http://localhost:3000/api/alerts?status=NEW | jq

# Generate ARPT report
curl -X POST http://localhost:3000/api/telecom \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"monthly_security","operator":"mobilis","year":2026,"month":7}'

# Parse captured packet
curl -X POST http://localhost:3000/api/telecom/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rawData":"300001400000000000000010","protocol":"gtp_v1"}'

# Check system health
curl -s http://localhost:3000/api/health | jq .status

# View WebSocket stats
curl -s http://localhost:3003/get_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Appendix B: File Locations

```
/opt/soc-platform/
├── config/
│   ├── operators/
│   │   ├── mobilis.yaml
│   │   ├── djezzy.yaml
│   │   └── ooredoo.yaml
│   ├── wazuh/
│   │   ├── decoders/
│   │   └── rules/
│   ├── suricata/
│   │   └── rules/
│   └── arpt-compliance.js
├── data/
│   ├── postgresql/
│   └── redis/
├── logs/
│   ├── nginx/
│   ├── application/
│   └── security/
├── backups/
│   ├── database/
│   └── configs/
└── certs/
    ├── soc.crt
    └── soc.key
```

---

**Document Version:** 2.0.0  
**Last Updated:** 2026-07-25  
**Classification:** Operator Internal Use Only  

*🇩🇿 Securing Algeria's Digital Future*
