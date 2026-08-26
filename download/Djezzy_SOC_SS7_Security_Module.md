# Djezzy SOC Platform - SS7 Security Monitoring Module

## Overview

This document specifies the SS7/Diameter security monitoring module for the Djezzy National SOC Platform. 
SS7 monitoring is **mandatory** for telecommunications operators to detect signaling attacks, fraud attempts, 
and privacy violations targeting the core network infrastructure.

## Architecture Position

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DJEZZY SOC PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   Wazuh     │◄───│  SS7 Collector│◄───│   STP/HLR/VLR/MSC       │   │
│  │   SIEM      │    │  (Kamailio/  │    │   (Core Network Elements) │   │
│  │             │    │   Custom)     │    │                          │   │
│  └──────┬──────┘    └──────┬───────┘    └──────────────────────────┘   │
│         │                  │                                           │
│         ▼                  ▼                                           │
│  ┌─────────────┐    ┌──────────────┐                                   │
│  │ TheHive Cases│◄───│ SS7 Analyzer │                                   │
│  │             │    │ (Python/C++)  │                                   │
│  └─────────────┘    └──────┬───────┘                                   │
│                            │                                            │
│                            ▼                                            │
│                 ┌──────────────────┐                                    │
│                 │  Kafka: ss7-events│                                   │
│                 │  Topic           │                                    │
│                 └──────────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## New Services Required

### Service 40: SS7 Signaling Collector (`ss7-collector`)

**Purpose:** Capture and normalize SS7/Diameter messages from STP (Signal Transfer Points)

```yaml
# docker-compose.prod.yml addition
ss7-collector:
  image: djezzy-soc/ss7-collector:latest
  build: ./services/ss7-collector/
  environment:
    - SS7_LISTEN_INTERFACE=eth0
    - SS7_M3UA_PORT=2904
    - SS7_SCTP_PORT=2905
    - DIAMETER_PORT=3868
    - KAFKA_BOOTSTRAP_SERVERS=kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092
    - OUTPUT_TOPIC=ss7-raw-events
  volumes:
    - ss7-config:/etc/ss7-collector
    - ss7-pcaps:/var/capture/ss7
  networks:
    - soc-events
  deploy:
    resources:
      limits:
        cpus: '8.0'
        memory: 16G
  ports:
    - "2904:2904"   # M3UA (MTP3 User Adaptation)
    - "2905:2905"   # SCTP (Stream Control Transmission Protocol)
    - "3868:3868"   # Diameter
```

### Service 41: SS7 Security Analyzer (`ss7-analyzer`)

**Purpose:** Real-time analysis of SS7 messages for attack detection

```yaml
# docker-compose.prod.yml addition
ss7-analyzer:
  image: djezzy-soc/ss7-analyzer:latest
  build: ./services/ss7-analyzer/
  environment:
    - KAFKA_INPUT_TOPIC=ss7-raw-events
    - KAFKA_OUTPUT_TOPIC=ss7-alerts
    - ELASTICSEARCH_HOST=http://elasticsearch-master:9200
    - THEHIVE_URL=http://thehive:9000
    - THEHIVE_API_KEY=${THEHIVE_API_KEY}
    - ANALYSIS_RULES=/etc/ss7-analyzer/rules/
  volumes:
    - ss7-rules:/etc/ss7-analyzer/rules
    - ss7-models:/var/models/ss7
  networks:
    - soc-backend
    - soc-events
  depends_on:
    - kafka-broker-1
    - elasticsearch-master
    - thehive
```

### Service 42: Diameter Monitor (`diameter-monitor`)

**Purpose:** LTE/EPS diameter interface monitoring (S6a, S6d, Gx, Rx, Cx)

```yaml
# docker-compose.prod.yml addition  
diameter-monitor:
  image: djezzy-soc/diameter-monitor:latest
  build: ./services/diameter-monitor/
  environment:
    - DIAMETER_LISTEN_PORT=3868
    - REALM=djezzy.dz
    - HOST_NAME=monitor.djezzy.dz
    - KAFKA_TOPIC=diameter-events
  networks:
    - soc-events
  ports:
    - "3869:3868"
```

## SS7 Detection Rules

### Rule Set 1: Location Tracking Detection

```yaml
# /etc/ss7-analyzer/rules/location_tracking.yaml
rule: SS7_LOCATION_TRACKING_SUSPICIOUS
description: "Detect potential subscriber location tracking via excessive SRI requests"
source: ss7-collector
condition:
  message_type: MAP_SEND_ROUTING_INFO_FOR_SM
  threshold:
    count: 10
    window: 60s
    per_subscriber: true
  aggregation: source_global_title + imsi_prefix
severity: HIGH
action:
  - create_thehive_case
  - send_alert_wazuh
  - block_source_gt_if_repeated(threshold: 50/hour)
mitre_technique: T1419  # SIM Card Swap
mitre_tactic: Reconnaissance
```

### Rule Set 2: IRSF (International Revenue Share Fraud) Detection

```yaml
# /etc/ss7-analyzer/rules/irsf_fraud.yaml
rule: SS7_IRSF_PATTERN_DETECTED
description: "Detect International Revenue Share Fraud signature"
source: ss7-collector
condition:
  message_type: ISUP_IAM  # Initial Address Message
  pattern:
    destination_country: high_risk_countries  # Configurable list
    call_duration_pattern: short_calls  # < 10 seconds
    calling_number_type: premium_rate
    volume_threshold:
      count: 100
      window: 300s
severity: CRITICAL
action:
  - create_thehive_case(priority: P1)
  - notify_fraud_team
  - trigger_blocking_rule
  - generate_cdr_report
tags: [fraud, irsf, financial]
```

### Rule Set 3: USSD Attack Detection

```yaml
# /etc/ss7-analyzer/rules/ussd_attack.yaml
rule: SS7_USSD_BRUTE_FORCE
description: "Detect brute force attacks via USSD (e.g., balance inquiry flooding)"
source: ss7-collector
condition:
  message_type: MAP_PROCESS_UNSTRUCTURED_SS_REQUEST
  ussd_code_patterns:
    - "*100#"   # Balance check
    - "*101#"   # Credit transfer
    - "*123#"   # Common service codes
  threshold:
    count: 30
    window: 60s
    per_msisdn: true
severity: MEDIUM
action:
  - rate_limit_msisdn
  - alert_analyst
  - log_for_forensics
```

### Rule Set 4: SMS Interception Indicators

```yaml
# /etc/ss7-analyzer/rules/sms_interception.yaml
rule: SS7_SMS_FORWARDING_SUSPICIOUS
description: "Detect potential SMS forwarding to unauthorized destinations"
source: ss7-collector
condition:
  message_type: MAP_FORWARD_SHORT_MESSAGE
  indicators:
    - forward_to_multiple_destinations(count: >5, window: 300s)
    - forward_to_international_high_risk
    - timing_pattern: business_hours_only_suspicious
    - content_matches: [otp_pattern, banking_code]
severity: HIGH
action:
  - create_thehive_case
  - flag_for_investigation
  - correlate_with_app_logs
mitre_technique: T1421  # SMS Interception
```

## Hardware Requirements for SS7 Module

### Additional Server: SOC-SS7-01 (or add to existing NSM server)

| Component | Specification | Purpose |
|-----------|--------------|---------|
| **CPU** | 16+ vCPU dedicated | Real-time packet processing |
| **Memory** | 64GB RAM | Message buffering, state tables |
| **Storage** | 2TB NVMe SSD | PCAP retention (high write throughput) |
| **Network** | 10Gbps mirror from STPs | SS7 message capture |
| **NIC Features** | Multi-queue RSS | Parallel processing |

### Port Requirements

| Port | Protocol | Source | Destination | Purpose |
|------|----------|--------|-------------|---------|
| 2904 | M3UA | STP/MSC | SS7 Collector | SS7 over SIGTRAN |
| 2905 | SCTP | STP/MSC | SS7 Collector | Transport layer |
| 3868 | Diameter | HSS/PCRF | Diameter Monitor | LTE signaling |
| 7000 | HTTP | Analyst Workstation | SS7 Analyzer UI | Management |

## Integration with Existing Stack

### Kafka Topics

```bash
# New topics for SS7 module
kafka-topics.sh --create --topic ss7-raw-events --partitions 12 --replication-factor 3
kafka-topics.sh --create --topic ss7-alerts --partitions 6 --replication-factor 3
kafka-topics.sh --create --topic diameter-events --partitions 6 --replication-factor 3
kafka-topics.sh --create --topic ss7-fraud-indicators --partitions 4 --replication-factor 3
```

### Elasticsearch Index Template

```json
{
  "template": "ss7-*",
  "settings": {
    "number_of_shards": 6,
    "number_of_replicas": 1,
    "refresh_interval": "5s"
  },
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "message_type": { "type": "keyword" },
      "calling_party": { "type": "keyword" },
      "called_party": { "type": "keyword" },
      "imsi": { "type": "keyword", "fields": { "text": { "type": "text" } } },
      "global_title": { "type": "keyword" },
      "subsystem_number": { "type": "integer" },
      "opcode": { "type": "keyword" },
      "risk_score": { "type": "float" },
      "attack_category": { "type": "keyword" },
      "location_info": { "type": "geo_point" },
      "roaming_status": { "type": "keyword" }
    }
  }
}
```

### Grafana Dashboards

**Dashboard: SS7 Security Overview**
- Panels:
  - Messages per second by type (real-time)
  - Top 10 source GTs by alert count
  - Geographic heatmap of suspicious origins
  - Fraud indicator trend (24h)
  - Active investigation cases from SS7 alerts
  - Subscriber privacy incident timeline

**Dashboard: IRSF Fraud Detection**
- Panels:
  - High-risk destination countries (ranked)
  - Call duration distribution for international routes
  - Revenue at risk calculation (real-time)
  - Blocking rule effectiveness
  - Time-series comparison week-over-week

## Deployment Procedure

### Phase 1: Passive Monitoring Setup (Week 1-2)

1. **Network tap configuration**
   ```bash
   # Mirror SS7 traffic from STP to collector
   ip link add name ss7-mirror type mirror
   ip link set dev eth0 master ss7-mirror
   ip link set dev ss7-mirror up
   ```

2. **Deploy SS7 Collector**
   ```bash
   docker compose -f docker-compose.prod.yml up -d ss7-collector
   ```

3. **Validate message capture**
   ```bash
   # Check message ingestion rate
   kafka-console-consumer --topic ss7-raw-events --from-beginning \
     --max-messages 100 | jq '.message_type' | sort | uniq -c | sort -rn
   ```

### Phase 2: Rule Activation (Week 3-4)

1. **Start with read-only mode** (alerts only, no blocking)
2. **Tune thresholds** based on baseline traffic analysis
3. **Enable low-severity rules first**, gradually activate critical rules
4. **Establish false-positive feedback loop** with analysts

### Phase 3: Active Response (Week 5-6)

1. **Enable automatic case creation** in TheHive
2. **Activate rate-limiting responses** for confirmed attack patterns
3. **Integrate with fraud management system** (if exists)
4. **Configure regulatory reporting** for ANRT (Algerian regulator)

## Regulatory Compliance (Algeria)

### ANRT Requirements

| Requirement | Implementation | Evidence |
|-------------|---------------|----------|
| SS7 attack logging | All MAP/ISUP messages retained | Elasticsearch indices, 90-day retention |
| Incident reporting | Automated reports to ANRT portal | Monthly summary + immediate for critical |
| Subscriber privacy protection | Location query monitoring | TheHive cases for each suspicious SRI |
| Fraud prevention | IRSF detection & blocking | Dashboard metrics, blocked GT list |
| Lawful intercept support | LI interface logging | Separate audit trail, encrypted storage |

## Vendor Integration Options

### Option A: Build In-House (Recommended for Djezzy)

**Pros:**
- Full control over detection logic
- Custom rules for Algerian market specifics
- No vendor lock-in
- Integrates natively with existing stack

**Cons:**
- 6-8 weeks development time
- Requires telecom security expertise
- Ongoing maintenance responsibility

**Estimated Cost:** Development effort only (infrastructure already provisioned)

### Option B: Commercial SS7 Firewall Integration

**Vendors:**
- **Mobileum** - RAID (Risk & Assurance for Telecom)
- **Sapindra** - Signal Exchange Firewall
- **Huawei** - USPP (Unified Signaling Protection Platform)
- **ZTE** - SS7 Firewalls

**Integration Pattern:**
```
Commercial SS7 Firewall → Syslog/REST API → SS7 Collector → Kafka → Full Stack
```

**Pros:**
- Battle-tested detection engines
- Vendor support and updates
- Faster deployment (2-3 weeks)

**Cons:**
- License costs ($200K-$500K annually)
- Less flexible customization
- Potential integration complexity

## Recommended Next Steps

1. **Immediate (This Week):**
   - Assess current SS7 visibility (do you have access to signaling logs?)
   - Identify STP mirror points for passive capture
   - Review existing fraud detection capabilities

2. **Short-term (Next 2 Weeks):**
   - Deploy SS7 Collector in monitor-only mode
   - Establish baseline traffic profiles
   - Create initial detection rules based on known attack signatures

3. **Medium-term (Next Month):**
   - Activate full analysis pipeline
   - Integrate with TheHive case management
   - Train analysts on SS7-specific investigation procedures

4. **Long-term (Quarter):**
   - Implement active response capabilities
   - Build regulatory reporting automation
   - Consider Diameter/LTE signaling expansion

---

*Document Version: 1.0*
*Classification: Internal Operations Document*
*Last Updated: August 2025*
