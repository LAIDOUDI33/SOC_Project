# Djezzy SOC - SS7 Security Analyzer

**Version:** 1.0.0  
**Service Name:** ss7-analyzer  
**Port:** 8000 (API)

---

## Overview

The SS7 Security Analyzer consumes normalized signaling events from Kafka and applies detection rules to identify attack patterns, fraud indicators, and policy violations. It is the "brain" of the SS7 Security Module, responsible for real-time threat detection in telecommunications signaling.

### Key Capabilities

- **18+ Detection Rules:** Covering location tracking, IRSF fraud, USSD attacks, SMS interception
- **Real-time Analysis:** Sub-second detection from event ingestion to alert generation
- **TheHive Integration:** Automatic case creation for critical findings
- **Configurable Rules:** YAML-based rule definitions for easy customization
- **ML-Ready:** Optional machine learning anomaly detection (disabled by default)

---

## Detection Rules

### Rule Categories

#### Location Tracking & Privacy Violations
| Rule ID | Name | Severity | Description |
|---------|------|----------|-------------|
| `SS7_LOCATION_TRACKING_SUSPICIOUS` | Excessive SRI Requests | HIGH | Detects potential subscriber tracking via SRI abuse |
| `SS7_SRI_FROM_UNUSUAL_SOURCE` | Unauthorized GT Source | MEDIUM | SRI from non-standard Global Titles |
| `SS7_ROAMING_NUMBER_ANOMALY` | PRN Anomaly | CRITICAL | Possible SIM swap or roaming fraud |
| `SS7_ATI_ABUSE_DETECTED` | ATI Harvesting | HIGH | Subscriber info harvesting via AnyTimeInterrogation |
| `SS7_UPDATE_LOCATION_STORM` | Device Cloning | CRITICAL | Abnormal updateLocation frequency |

#### Fraud Detection
| Rule ID | Name | Severity | Description |
|---------|------|----------|-------------|
| `SS7_IRSF_PATTERN_DETECTED` | International Revenue Share Fraud | CRITICAL | Short calls to premium-rate destinations |
| `SS7_WANGIRI_FRAUD_PATTERN` | Callback/Wangiri Fraud | HIGH | One-ring scam pattern detection |
| `SS7_USSD_BRUTE_FORCE` | USSD Service Attack | MEDIUM | Brute force on service codes |
| `SS7_SMS_FORWARDING_SUSPICIOUS` | SMS Interception | HIGH | Suspicious forwarding patterns |
| `SS7_PREMIUM_RATE_ABUSE` | Premium Rate Fraud | High-volume PRN calls |
| `SS7_SIM_BOX_DETECTED` | SIM Box/Gateway Fraud | CRITICAL | Bulk termination fraud |

#### Network Attacks
| Rule ID | Name | Severity | Description |
|---------|------|----------|-------------|
| `SS7_SIGNALING_DOS_DETECTED` | Signaling Flood/DoS | CRITICAL | Message flood targeting network elements |
| `SS7_GT_TRANSLATION_ATTACK` | Routing Manipulation | MEDIUM | Suspicious Global Title translation |
| `SS7_MALFORMED_MESSAGE_DETECTED` | Protocol Violation | LOW | Malformed/exploit attempt messages |
| `SS7_UNAUTHORIZED_MAP_OPERATION` | Privilege Escalation | HIGH | Unauthorized MAP operations |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | 0.0.0.0 | API bind address |
| `PORT` | 8000 | API port number |
| `KAFKA_BOOTSTRAP_SERVERS` | kafka-0:9092,... | Kafka broker addresses |
| `INPUT_TOPIC` | ss7-raw-events | Input topic for raw events |
| `OUTPUT_TOPIC` | ss7-alerts | Output topic for alerts |
| `CONSUMER_GROUP` | ss7-analyzer-group | Kafka consumer group ID |
| `THEHIVE_URL` | http://thehive:9000 | TheHive instance URL |
| `THEHIVE_API_KEY` | *(required)* | TheHive API key |
| `AUTO_CREATE_CASES` | true | Auto-create TheHive cases for alerts |
| `RULES_DIR` | /etc/ss7-analyzer/rules | Directory containing YAML rules |
| `ENABLE_ML_DETECTION` | false | Enable ML anomaly detection |
| `ANOMALY_THRESHOLD` | 0.85 | ML anomaly score threshold |

---

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

### Statistics

```bash
curl http://localhost:8000/api/v1/stats
```

### Rule Management

```bash
# List all loaded rules
curl http://localhost:8000/api/v1/rules

# Reload rules from disk
curl -X POST http://localhost:8000/api/v1/rules/reload
```

---

## Rule File Format

Rules are defined in YAML format under `config/ss7/rules/`:

### Example Rule Structure

```yaml
- name: SS7_IRSF_PATTERN_DETECTED
  description: "Detect International Revenue Share Fraud signature"
  severity: CRITICAL
  enabled: true
  
  condition:
    op: and
    conditions:
      - field: message_type
        operator: equals
        value: initialAddressMessage
      
      - field: called_party_gt.address
        operator: matches
        value: "^(\\+|00)?(2[0-37]|4[1-35-9]|5[016-9]|6[0-9]|8[89]|9[0-9])"
      
      - field: _call_duration_seconds
        operator: less_than
        value: 15
      
      - field: _irsi_call_count_per_source
        operator: greater_than
        value: 50
  
  action:
    - create_thehive_case(priority: P1)
    - notify_fraud_team_immediately
    - trigger_blocking_rule
  
  tags:
    - fraud
    - irsf
    - financial_loss
    - critical
  
  mitre_technique: T1589
  mitre_tactic: Resource Development
```

### Condition Operators

| Operator | Description | Example |
|----------|-------------|--------|
| `equals` | Exact match | `value: "initialAddressMessage"` |
| `matches` | Regex match | `value: "^2135"` |
| `greater_than` | Numeric > | `value: 50` |
| `less_than` | Numeric < | `value: 15` |
| `in` | Member of list | `value: ["val1", "val2"]` |
| `exists` | Field present | `value: true` |

### Boolean Logic

```yaml
# AND - All conditions must match
condition:
  op: and
  conditions: [...]

# OR - Any condition can match
condition:
  op: or
  conditions: [...]

# NOT - Condition must not match
condition:
  op: not
  condition: {...}
```

---

## TheHive Integration

### Automatic Case Creation

When a rule with `create_thehive_case` action triggers, the analyzer automatically creates a case in TheHive with:

- **Title:** Based on rule name and key indicators
- **Severity:** Mapped from rule severity (CRITICAL -> P1, HIGH -> P2, etc.)
- **Tags:** From rule definition + automatic enrichment
- **Observables:** IMSI, MSISDN, calling/called parties, source IP
- **Custom Fields:** Protocol-specific data (GT, result codes, etc.)

### Case Example

```json
{
  "title": "[CRITICAL] IRSF Pattern Detected - IMSI 60302...",
  "severity": 1,
  "tags": ["ss7", "fraud", "irsf", "critical"],
  "observables": [
    {
      "dataType": "imsi",
      "data": "603021200000001",
      "sighting": true
    },
    {
      "dataType": "ip",
      "data": "10.0.1.100",
      "sighting": true
    }
  ]
}
```

---

## Performance Tuning

### Kafka Consumer Optimization

```yaml
# For higher throughput environments
environment:
  KAFKA_MAX_POLL_RECORDS: "500"
  KAFKA_SESSION_TIMEOUT_MS: "30000"
  KAFKA_MAX_PARTITION_FETCH_BYTES: "1048576"  # 1MB
  KAFKA_FETCH_MIN_BYTES: "1024"
```

### Rule Evaluation Optimization

- Rules are evaluated in order; put high-severity/frequent patterns first
- Use `enabled: false` to disable unused rules
- Keep regex patterns specific; avoid overly broad matches
- Consider using `_precomputed_fields` for expensive calculations

---

## Testing

### Run Test Suite

```bash
cd services/ss7-analyzer
python -m pytest tests/ -v --cov=ss7_analyzer
```

### Send Test Events

```bash
# Produce test event to input topic
echo '{
  "protocol": "ss7",
  "message_type": "initialAddressMessage",
  "calling_party_gt": {"address": "213550000001"},
  "called_party_gt": {"address": "213551000002"},
  "_call_duration_seconds": 5,
  "_irsi_call_count_per_source": 100
}' | kafka-console-producer --broker-list localhost:9092 \
     --topic ss7-raw-events
```

### Verify Alert Output

```bash
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic ss7-alerts --from-beginning --max-messages 1
```

---

## Troubleshooting

### Rules Not Loading

**Symptoms:** No alerts generated despite events flowing

**Diagnosis:**
```bash
# Check rules endpoint
curl -s http://localhost:8000/api/v1/rules | python -m json.tool

# Verify rules directory is mounted
docker exec ss7-analyzer ls -la /etc/ss7-analyzer/rules/
```

### TheHive Cases Not Created

**Symptoms:** Alerts in logs but no cases in TheHive

**Diagnosis:**
```bash
# Check TheHive connectivity
curl -s -H "Authorization: Bearer $THEHIVE_API_KEY" \
  http://thehive:9000/api/ping

# Verify API key has case creation permission
curl -s -H "Authorization: Bearer $THEHIVE_API_KEY" \
  http://thehive:9000/api/user/current
```

### High Latency

**Symptoms:** Alerts delayed >10 seconds from event ingestion

**Solutions:**
- Increase Kafka consumer parallelism (multiple consumer instances)
- Reduce rule complexity
- Check Kafka broker performance

---

## Support

- **Documentation:** See `/docs/ss7-analyzer/` for detailed API docs
- **Issues:** Create ticket in JIRA project `SOC-SS7`
- **Escalation:** Contact #soc-oncall Slack channel

---

**Last Updated:** 2026-08-03  
**Document Version:** 1.0.0
