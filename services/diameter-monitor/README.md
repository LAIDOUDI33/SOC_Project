# Djezzy SOC - Diameter Protocol Monitor

**Version:** 1.0.0  
**Service Name:** diameter-monitor  
**Port:** 8001 (API), 3869 (Diameter Listener)

---

## Overview

The Diameter Monitor specializes in LTE/EPS (Evolved Packet System) Diameter interface security monitoring. It analyzes Diameter protocol messages exchanged between LTE network elements, focusing on authentication interfaces, policy control, and multimedia subsystem signaling.

### Key Capabilities

- **S6a/HSS Monitoring:** Subscriber authentication and location updates
- **Gx/PCRF Monitoring:** Policy and charging control
- **Rx/AF Monitoring:** Application function QoS requests
- **Cx/IMS Monitoring:** IP Multimedia Subsystem authentication
- **ULR Storm Detection:** Sliding window rate limiting for DoS protection
- **Authentication Failure Tracking:** Brute force and credential attack detection

---

## Supported Diameter Interfaces

| Interface | Application ID | Purpose | Monitored Operations |
|-----------|----------------|---------|----------------------|
| S6a | 16777236 | HSS ↔ MME | AIR, ULR, PUR, IDA |
| S6d | 16777237 | HSS → SGSN | GPRS authentication |
| Cx | 16777250 | HSS ↔ I-CSCF | UAR, SAR, LIR, PPR |
| Dx | 16777251 | HSS → AS | User data server |
| Gx | 16777250 (alt) | PCRF ↔ PCEF | CCR-I, CCR-U, RAR |
| Rx | 16777238 | AF ↔ PCRF | AAR, AAA |
| S13 | 16777251 | EIR ↔ MME | PI, EM |
| SLh | 16777263 | GMLC ↔ HSS | LSR, LRA |
| SGd | 16777221 | AS → SGSN | MO-SMS delivery |

---

## Architecture

```
                    ┌─────────────────┐
                    │   MME / HSS     │
                    │   / PCRF       │
                    └────────┬────────┘
                             │
                   Diameter Protocol
                             │
                    ┌────────▼────────┐
                    │ DIAMETER MONITOR │ ◄── API :8001
                    │                 │
                    │  ┌─────────────┐│
                    │  │ Sliding      ││
                    │  │ Window       ││
                    │  │ Rate Limiter ││
                    │  └──────┬──────┘│
                    │         │        │
                    │  ┌──────▼──────┐│
                    │  │ Alert        ││
                    │  │ Generator    ││
                    │  └──────┬──────┘│
                    └─────────┼────────┘
                              │
                diameter-alerts topic
                              │
                    ┌─────────▼────────┐
                    │  SS7 ANALYZER    │
                    │  (Correlation)    │
                    └──────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DIAMETER_HOST` | 0.0.0.0 | API bind address |
| `DIAMETER_PORT` | 8001 | API port number |
| `DIAMETER_LISTEN_PORT` | 3869 | Diameter listen port |
| `DIAMETER_REALM` | djezzy.dz | Diameter realm |
| `DIAMETER_HOST_NAME` | diameter-monitor.djezzy.dz | FQDN for this service |
| `KAFKA_BOOTSTRAP_SERVERS` | kafka-0:9092,... | Kafka broker addresses |
| `INPUT_TOPIC` | ss7-raw-events | Input topic (shared with SS7 analyzer) |
| `OUTPUT_TOPIC` | diameter-alerts | Output topic for Diameter-specific alerts |
| `CONSUMER_GROUP` | diameter-monitor-group | Kafka consumer group |

### Rate Limiting Configuration

The ULR storm detection uses configurable sliding windows:

```python
# In diameter_monitor/__main__.py:
ulr_rate_limiter = SlidingWindowRateLimiter(
    window_seconds=60,  # 60-second window
    max_requests=50      # Max 50 ULRs per window per IMSI/source
)

auth_failure_limiter = SlidingWindowRateLimiter(
    window_seconds=60,
    max_requests=20      # Max 20 auth failures per minute
)
```

---

## Detection Rules

### 1. S6a Authentication Failure (HIGH)

**Trigger:** Authentication-Information-Answer with non-success result code

**Result Codes Detected:**
- `5001` (DIAMETER_AUTH_REJECTED)
- `5420` (DIAMETER_ERROR_USER_UNKNOWN)
- `5003` (DIAMETER_ERROR_IDENTITIES_DONT_MATCH)
- `4181` (DIAMETER_ERROR_ROAMING_NOT_ALLOWED)

**Alert Example:**
```json
{
  "rule_name": "DIAMETER_S6A_AUTH_FAILURE",
  "severity": "HIGH",
  "title": "S6a Authentication Failure - DIAMETER_AUTH_REJECTED",
  "description": "Authentication failed on S6a interface for IMSI 60302...",
  "indicators": ["Result Code: 5001", "Application: S6a"]
}
```

### 2. ULR Storm Detection (CRITICAL) ⭐ *REMEDIATION COMPLETE*

**Trigger:** Excessive User-Location-Register requests from same IMSI/source

**Thresholds:**
- >50 ULRs per 60-second window per IMSI+source combination
- Triggers CRITICAL severity alert

**Indicators of Attack:**
- HSS DoS/flooding
- Device cloning activity
- Roaming fraud preparation
- Signaling storm precursor

**Response Actions:**
- Auto-create TheHive case at P1 priority
- Notify SS7 operations team immediately
- Consider temporary source blocking

### 3. Unknown Application ID (LOW)

**Trigger:** Diameter message with unrecognized Application ID

**Purpose:** Detect probing/misconfiguration

---

## Result Code Reference

### Standard IETF Result Codes (RFC 3588)

| Code | Name | Meaning |
|------|------|---------|
| 2001 | DIAMETER_SUCCESS | Success |
| 2002 | DIAMETER_MULTI_ROUND_ANSWER | Ongoing auth (E-AKA) |
| 3001 | DIAMETER_COMMAND_NOT_SUPPORTED | Unknown command |
| 3002 | DIAMETER_UNABLE_TO_DELIVER | Peer unreachable |
| 3003 | DIAMETER_REALM_NOT_SERVED | Wrong realm |
| 3004 | DIAMETER_TOO_BUSY | Temporarily overloaded |
| 3010 | DIAMETER_INVALID_HDR_BITS | Malformed header |
| 3011 | DIAMETER_INVALID_MSG_LENGTH | Wrong length |
| 3013 | DIAMETER_TIMEOUT | Processing timeout |
| 5001 | DIAMETER_AUTH_REJECTED | Auth failed |
| 5004 | DIAMETER_UNABLE_TO_COMPLY | Cannot fulfill |
| 5005 | DIAMETER_INVALID_AVP_VALUE | Bad parameter value |
| 5008 | DIAMETER_MISSING_AVP | Required AVP missing |
| 5012 | DIAMETER_AVP_OCCURRS_TOO_MANY_TIMES | Duplicate AVP |
| 5420 | DIAMETER_ERROR_USER_UNKNOWN | 3GPP: Unknown subscriber |

---

## API Endpoints

### Health Check

```bash
curl http://localhost:8001/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "diameter-monitor",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "messages_processed": 12345,
  "alerts_generated": 23,
  "errors": 5,
  "rate_limiters": {
    "ulr_tracker": {
      "active_keys": 15,
      "total_tracked_events": 2345
    }
  }
}
```

### Rate Limiter Statistics

```bash
curl http://localhost:8001/api/v1/rate-limiters
```

**Response:**
```json
{
  "ulr_rate_limiter": {
    "window_seconds": 60,
    "max_requests": 50,
    "active_trackers": {
      "ulr_60302..._10.0.1.100": {
        "current_count": 25,
        "max_allowed": 50,
        "is_exceeded": false,
        "rate_per_second": 0.42
      },
      "ulr_60303..._10.0.1.101": {
        "current_count": 67,
        "max_allowed": 50,
        "is_exceeded": true,
        "rate_per_second": 1.12
      }
    }
  }
}
```

---

## Deployment Notes

### Resource Requirements

| Parameter | Minimum | Production |
|-----------|---------|------------|
| CPU Cores | 1 | 2 |
| Memory | 2 GB | 4 GB |
| Network | Standard | Low latency to Kafka |

### Scaling Considerations

- **Single instance sufficient** for most deployments (Diameter volume lower than SS7/MAP)
- **Horizontal scaling possible** via Kafka consumer groups (each instance gets partition subset)
- **State** is only in rate limiter windows (acceptable loss on restart)

---

## Testing

### Unit Tests

```bash
cd services/diameter-monitor
python -m pytest tests/ -v --cov=diameter_monitor
```

### ULR Storm Simulation

```python
# Test script to simulate ULR storm
import asyncio
from diameter_monitor import ulr_rate_limiter, _sync_rate_check

async def simulate_ulr_storm():
    imsi = "603021200000001"
    source = "10.0.1.100"
    key = f"ulr_{imsi}_{source}"
    
    print(f"Simulating ULR storm for IMSI {imsi}")
    
    for i in range(70):  # Exceed threshold of 50
        stats = _sync_rate_check(key, ulr_rate_limiter)
        
        if i % 10 == 0:
            print(f"  [{i}] Count: {stats['current_count']}, "
                  f"Exceeded: {stats['is_exceeded']}")
        
        if stats["is_exceeded"] and i == 51:
            print(f"  *** ALERT TRIGGERED at request {i} ***")

asyncio.run(simulate_ulr_storm())
```

---

## Integration with SS7 Analyzer

The diameter-monitor works alongside the ss7-analyzer:

1. **Both consume** from `ss7-raw-events` topic
2. **Filtering logic:**
   - diameter-monitor: `if message.get("protocol") == "diameter"`
   - ss7-analyzer: All protocols including SS7, SIGTRAN, SCTP
3. **Output topics:**
   - diameter-monitor: `diameter-alerts`
   - ss7-analyzer: `ss7-alerts`
4. **Correlation:** ss7-analyzer can consume from both alert topics for unified view

---

## Troubleshooting

### False Positive ULR Storm Alerts

**Symptoms:** Legitimate high-mobility subscribers triggering alerts

**Solutions:**
1. Increase threshold for known high-mobility IMSIs (roaming users)
2. Add whitelist for legitimate roaming partners
3. Use longer time windows (120s or 300s) for burst tolerance

### Missing Diameter Messages

**Symptoms:** No events despite active LTE network

**Diagnosis:**
```bash
# Check if consuming correct topic
curl http://localhost:8001/api/v1/stats

# Verify Kafka topic has messages
kafka-run-class kafka.tools.ConsumerOffsetChecker \
  --broker-list localhost:9092 --group diameter-monitor-group \
  --topic ss7-raw-events
```

---

## Security Notes

### Data Sensitivity

This service processes:
- IMSI (International Mobile Subscriber Identity)
- MSISDN ranges
- Authentication vectors (non-plaintext)
- Location information (tracking area codes)

### Recommended Controls

1. **Access Control:** Limit API access to authorized systems
2. **Encryption:** TLS for all external communications
3. **Audit Logging:** Log all alert generation and rule changes
4. **Data Minimization:** Store only necessary fields in alerts

---

## Changelog

### v1.0.0 (2026-08-03)
- Initial release
- S6a/Gx/Rx/Cx interface monitoring
- ULR storm detection with sliding window
- Authentication failure tracking
- Kafka integration
- Health check and statistics APIs

---

**Last Updated:** 2026-08-03  
**Document Version:** 1.0.0  
**Remediation Status:** HIGH-001 (ULR Storm Detection) ✅ Complete
