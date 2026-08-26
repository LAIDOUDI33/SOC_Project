# Djezzy SOC Platform - Structured Logging Standard

## Overview

This document defines the mandatory logging standard for all 26+ containers in the National SOC Platform. Compliance ensures:

- **Traceability**: End-to-end trace ID propagation from packet capture to alert
- **Privacy**: Automatic IMSI/MSISDN masking per ANRT requirements
- **Consistency**: Unified JSON format parseable by Wazuh, Elasticsearch, and Grafana
- **Compliance**: ANRT/ARTP audit trail requirements for telecom security data

---

## Log Schema (Mandatory Format)

All services MUST output logs in this JSON structure:

```json
{
  "timestamp": "2026-08-04T10:30:45.123Z",
  "service": "ss7-collector",
  "level": "INFO",
  "trace_id": "a1b2c3d4e5f67890",
  "message": "signaling_packet_captured",
  "protocol": "M3UA",
  "imsi": "603021******0001",
  "source_ip": "10.0.1.100",
  "host": "djezzy-ss7-collector-0",
  "environment": "production",
  "version": "1.0.0",
  "syslog_severity": 6,
  "function": "process_sctp_packet",
  "line": 142
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO8601 | ✅ | UTC time with milliseconds |
| `service` | string | ✅ | Container/service name |
| `level` | enum | ✅ | DEBUG/INFO/WARNING/ERROR/CRITICAL |
| `trace_id` | string | ✅ | Correlation ID across services |
| `message` | string | ✅ | Human-readable log message |
| `host` | string | ✅ | Hostname of container |
| `environment` | string | ✅ | production/staging/development |
| `version` | string | ✅ | Service version |
| `syslog_severity` | int | ✅ | Syslog numeric severity (2-7) |

### Custom Fields (Service-Specific)

Services MAY add additional fields relevant to their domain:

```json
{
  "protocol": "M3UA",
  "source_ip": "10.0.1.100",
  "destination_ip": "10.0.2.50",
  "packet_size": 256,
  "opc": "1-2-3",
  "dpc": "4-5-6"
}
```

---

## Sensitive Data Masking Rules

Per **ANRT Directive on Subscriber Privacy** (2019), the following fields MUST be masked in all logs:

### Masking Patterns

| Field | Pattern | Example Input | Example Output |
|-------|---------|---------------|----------------|
| IMSI | 15 digits | `603021200000001` | `603021******0001` |
| MSISDN | Phone number | `+2135551234567` | `+213555****4567` |
| IMEI | 15 digits | `356938035643809` | `************3809` |
| ICCID | 19-20 digits | `8921304090001234567` | `****************4567` |
| Password/Secret | Any value | `supersecret123` | `************` |
| API Key/Token | Any value | `sk_live_abc123` | `************` |

### Implementation

Masking is automatic when using the `structured_logging.py` module:

```python
from config.logging.structured_logging import get_logger, mask_sensitive

logger = get_logger("my-service")

# This will auto-mask the IMSI field:
logger.info("subscriber_lookup", extra={
    "imsi": "603021200000001",  # Automatically masked to 603021******0001
    "msisdn": "+2135551234567"   # Automatically masked to +213555****4567
})
```

---

## Trace ID Propagation

### Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────┐
│ ss7-collector│────▶│   Kafka      │────▶│ ss7-analyzer   │────▶│  Wazuh   │
│              │     │              │     │                │     │          │
│ trace-id:    │     │ Headers:     │     │ trace-id:      │     │ trace-id:│
│ abc123       │     │ trace-id     │     │ abc123         │     │ abc123   │
└──────────────┘     └──────────────┘     └────────────────┘     └──────────┘
                           │
                           ▼
                    ┌────────────────┐
                    │diameter-monitor │
                    │                │
                    │ trace-id: abc123│
                    └────────────────┘
```

### Implementation Guide

#### Producer Side (ss7-collector)

```python
from config.logging.structured_logging import (
    get_logger, 
    create_kafka_headers_with_trace,
    set_trace_id
)
import json
from confluent_kafka import Producer

logger = get_logger("ss7-collector")
producer = Producer({'bootstrap.servers': 'kafka:9092'})

def process_and_send(packet):
    # Set trace at start of processing
    trace_id = set_trace_id()
    
    logger.info("processing_packet", extra={"size": len(packet)})
    
    # ... process packet ...
    
    # Create headers with trace for propagation
    headers = create_kafka_headers_with_trace({
        'protocol': packet.protocol,
        'source_ip': packet.source_ip
    })
    
    producer.produce(
        topic='ss7-raw-events',
        key=trace_id.encode(),
        value=json.dumps(packet.to_dict()).encode(),
        headers=[(k, v.encode()) for k, v in headers.items()]
    )
    
    clear_trace_id()
```

#### Consumer Side (ss7-analyzer, diameter-monitor)

```python
from config.logging.structured_logging import (
    get_logger,
    process_incoming_kafka_message,
    clear_trace_id
)

logger = get_logger("ss7-analyzer")

def on_message(msg):
    # Extracts trace from headers/body and sets context automatically
    message_data, trace_id = process_incoming_kafka_message(
        msg.value(),
        dict(msg.headers()) if msg.headers() else None
    )
    
    logger.info("analyzing_message", extra={
        "protocol": message_data.get("protocol"),
        "imsi": message_data.get("imsi")  # Auto-masked
    })
    
    # ... analyze ...
    
    # Clean up when done
    clear_trace_id()
```

---

## Service Integration Checklist

Each service must implement the following:

### 1. Import and Initialize

```python
# At top of __main__.py or main entry point
from config.logging.structured_logging import init_logging, get_logger

# Call once at startup
init_logging(
    service_name="your-service-name",
    log_level=os.getenv('LOG_LEVEL', 'INFO'),
    log_to_file=True,  # Enable file logging in production
    log_directory="/var/log/soc"
)

logger = get_logger()
```

### 2. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVICE_NAME` | hostname | Service identifier in logs |
| `LOG_LEVEL` | INFO | Minimum log level |
| `ENVIRONMENT` | development | Environment tag |
| `SERVICE_VERSION` | 1.0.0 | Version for log entries |

### 3. Docker Compose Updates

Add to each service's environment section:

```yaml
services:
  your-service:
    environment:
      - SERVICE_NAME=your-service-name
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - ENVIRONMENT=production
      - SERVICE_VERSION=1.0.0
    volumes:
      - /var/log/soc:/var/log/soc  # Mount shared log volume
```

---

## Log Levels Usage Guide

| Level | Syslog | When to Use | Example |
|-------|--------|-------------|---------|
| `DEBUG` | 7 | Development diagnostics | "Parsed M3UA payload: {...}" |
| `INFO` | 6 | Normal operations | "Captured 150 packets in window" |
| `WARNING` | 4 | Anomalies needing attention | "High latency detected: 500ms" |
| `ERROR` | 3 | Failures requiring investigation | "Kafka connection lost after 3 retries" |
| `CRITICAL` | 2 | Security incidents / outages | "ULR storm detected from IMSI ***..." |

---

## Migration Path for Existing Services

### Before (Non-Standard)

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info(f"Processing IMSI {imsi} from IP {ip}")
# Output: INFO:__main__:Processing IMSI 603021200000001 from IP 10.0.1.100
```

### After (Standard)

```python
from config.logging.structured_logging import get_logger

logger = get_logger("service-name")

logger.info("Processing subscriber", extra={
    "imsi": imsi,  # Auto-masked
    "source_ip": ip
})
# Output: {"timestamp":"...","service":"service-name","level":"INFO","trace_id":"...","message":"Processing subscriber","imsi":"603021******0001","source_ip":"10.0.1.100",...}
```

---

## Verification Commands

### Check Log Format Compliance

```bash
# Verify JSON format (should not error)
tail -n 100 /var/log/soc/ss7-collector.log | jq . > /dev/null && echo "✅ Valid JSON"

# Check for unmasked IMSI (should return no results)
grep -E '"imsi":"\\d{15}"' /var/log/soc/*.log && echo "❌ Unmasked IMSI found!" || echo "✅ All IMSI masked"

# Check trace presence (should have trace_id in every line)
jq -r '.trace_id' /var/log/soc/ss7-collector.log | grep -v 'no-trace' | wc -l
```

### Test Trace Propagation

```bash
# Find a trace ID in collector logs
TRACE_ID=$(jq -r '.trace_id' /var/log/soc/ss7-collector.log | head -1)

# Same trace should appear in analyzer logs
grep $TRACE_ID /var/log/soc/ss7-analyzer.log && echo "✅ Trace propagated!" || echo "❌ Trace broken"
```

---

## Files in This Module

| File | Purpose |
|------|---------|
| `structured_logging.py` | Main Python module with all classes/functions |
| `LOGGING_STANDARD.md` | This documentation file |

---

## Changelog

### v1.0.0 (2026-08-04) - Initial Release

- Structured JSON formatter
- Trace ID propagation via Kafka headers
- Sensitive data masking (IMSI, MSISDN, IMEI, ICCID)
- Service-specific logger wrappers
- Syslog severity mapping
- Docker/Kubernetes integration examples

---

**Remediation Status**: MED-003 ✅ COMPLETE  
**Last Updated**: 2026-08-04  
**Document Owner**: Djezzy SOC Platform Team
