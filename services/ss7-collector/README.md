# Djezzy SOC - SS7/Diameter Signaling Collector

**Version:** 1.0.0  
**Service Name:** ss7-collector  
**Port:** 7000 (API), 2904 (M3UA), 2905 (SCTP), 3868 (Diameter)

---

## Overview

The SS7 Collector is a critical component of the Djezzy National SOC Platform responsible for capturing, normalizing, and streaming telecommunications signaling messages. It provides real-time visibility into SS7 (Signaling System No. 7) and Diameter protocol traffic flowing through the network.

### Key Capabilities

- **SIGTRAN/M3UA Capture:** Listens on standard SIGTRAN ports for M3UA-adapted SS7 messages
- **SCTP Monitoring:** Captures Stream Control Transmission Protocol packets
- **Diameter Ingestion:** Receives LTE/EPS Diameter messages (S6a, Gx, Rx, Cx)
- **Kafka Integration:** Publishes normalized events to `ss7-raw-events` topic
- **PCAP Archiving:** Optional packet capture storage for forensic analysis

---

## Architecture

```
                    ┌─────────────────┐
                    │   STP / MSC     │
                    │  (Network Elements)
                    └────────┬────────┘
                             │
              SIGTRAN (M3UA/SCTP) / Diameter
                             │
                    ┌────────▼────────┐
                    │   SS7 COLLECTOR  │ ◄── Management API :7000
                    │                 │
                    │  ┌─────────────┐│
                    │  │ Message     ││
                    │  │ Normalizer  ││
                    │  └──────┬──────┘│
                    │         │        │
                    │  ┌──────▼──────┐│
                    │  │ Kafka      ││
                    │  │ Producer    ││
                    │  └──────┬──────┘│
                    └─────────┼────────┘
                              │
                     ss7-raw-events topic
                              │
                    ┌─────────▼────────┐
                    │  SS7 ANALYZER    │
                    └──────────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SS7_HOST` | 0.0.0.0 | API bind address |
| `SS7_PORT` | 7000 | API port number |
| `SS7_M3UA_LISTEN_PORT` | 2904 | M3UA/SIGTRAN listen port |
| `SS7_SCTP_LISTEN_PORT` | 2905 | SCTP listen port |
| `SS7_DIAMETER_LISTEN_PORT` | 3868 | Diameter listen port |
| `KAFKA_BOOTSTRAP_SERVERS` | kafka-0:9092,... | Kafka broker addresses |
| `OUTPUT_TOPIC` | ss7-raw-events | Output Kafka topic |
| `PCAP_ENABLED` | true | Enable PCAP capture |
| `PCAP_DIR` | /var/capture/ss7 | PCAP storage directory |
| `PCAP_MAX_SIZE_MB` | 512 | Max PCAP directory size (MB) |
| `LOG_LEVEL` | INFO | Logging verbosity |

### Example docker-compose.yml

```yaml
ss7-collector:
  build: ./services/ss7-collector
  container_name: djezzy-ss7-collector
  # REMEDIATION CRIT-003: Required capabilities for raw socket access
  cap_add:
    - NET_RAW
    - NET_ADMIN
    - SYS_TIME
  ports:
    - "2904:2904"   # M3UA (SIGTRAN)
    - "2905:2905"   # SCTP
    - "3868:3868"   # Diameter
    - "7000:7000"   # Management API
  environment:
    - KAFKA_BOOTSTRAP_SERVERS=kafka-0:9092,kafka-1:9092,kafka-2:9092
    - OUTPUT_TOPIC=ss7-raw-events
    - PCAP_ENABLED=true
    - LOG_LEVEL=INFO
  volumes:
    - ./config/ss7:/etc/ss7-collector
    - ss7_pcaps:/var/capture/ss7
```

---

## API Endpoints

### Health Check

```bash
curl http://localhost:7000/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "ss7-collector",
  "version": "1.0.0",
  "uptime_seconds": 3600.5,
  "capture_stats": {
    "m3ua_messages": 15234,
    "sctp_packets": 45678,
    "diameter_messages": 2345,
    "errors": 12
  }
}
```

### Statistics

```bash
curl http://localhost:7000/api/v1/stats
```

**Response:**
```json
{
  "messages_processed": 63257,
  "alerts_generated": 234,
  "errors": 45,
  "messages_per_second": 125.3,
  "kafka_produce_success_rate": 0.9998,
  "uptime_seconds": 7200.0
}
```

---

## Message Format

### Normalized Event Schema

Events published to Kafka follow this schema:

```json
{
  "@timestamp": "2026-08-03T15:30:00.000Z",
  "protocol": "ss7|m3ua|sctp|diameter",
  "message_type": "initialAddressMessage|user-location-register-request|...",
  "source_ip": "10.0.1.100",
  "destination_ip": "10.0.1.200",
  "calling_party_gt": {
    "address": "213550000001",
    "tt": 0,
    "np": 1,
    "nai": "60302"
  },
  "called_party_gt": {
    "address": "213551000002"
  },
  "imsi": "603021200000001",
  "msisdn": "+213550000001",
  "payload": { ... },
  "raw_packet_base64": "AQIDBA==..."
}
```

---

## Deployment Requirements

### Linux Capabilities

The container requires elevated capabilities for raw socket access:

```yaml
cap_add:
  - NET_RAW      # Required for raw packet capture
  - NET_ADMIN    # Required for network interface configuration
  - SYS_TIME     # Required for accurate packet timestamping
```

### Network Access

Ensure the host network allows:

- **Inbound:** Ports 2904, 2905, 3868 from STP/MSC/HSS elements
- **Outbound:** Port 9092+ to Kafka brokers
- **Multicast:** For SCTP multicast groups (if applicable)

### Resource Recommendations

| Parameter | Minimum | Production |
|-----------|---------|------------|
| CPU Cores | 2 | 8 |
| Memory | 4 GB | 16 GB |
| Disk (PCAP) | 50 GB | 500 GB SSD |
| Network Bandwidth | 1 Gbps | 10 Gbps |

---

## Testing

### Unit Tests

```bash
# Run from services/ss7-collector/
python -m pytest tests/ -v
```

### Integration Test (Capture Verification)

```bash
# Send test M3UA message
python scripts/send_test_m3ua.py --target localhost:2904

# Verify Kafka output
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic ss7-raw-events --from-beginning --max-messages 1
```

### Health Check Validation

```bash
# Basic health
curl -f http://localhost:7000/health || echo "HEALTH CHECK FAILED"

# Detailed stats
curl -s http://localhost:7000/api/v1/stats | python -m json.tool
```

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied on Socket Bind

**Error:** `PermissionError: [Errno 1] Operation not permitted`

**Solution:** Ensure `cap_add: [NET_RAW, NET_ADMIN]` is set in Docker Compose or Kubernetes manifest.

#### 2. Kafka Connection Refused

**Error:** `kafka.errors.NoBrokersAvailable: Could not connect to any broker`

**Solution:** 
- Verify Kafka brokers are running: `docker-compose ps kafka-0 kafka-1 kafka-2`
- Check network connectivity: `docker exec ss7-collector ping kafka-0`
- Ensure both containers are on same network: `soc-events`

#### 3. High Memory Usage

**Symptoms:** Container OOM killed, slow processing

**Solutions:**
- Reduce `PCAP_MAX_SIZE_MB` if PCAP archiving is enabled
- Increase memory limit in deployment
- Check for memory leaks with `docker stats ss7-collector`

#### 4. Missing Packets

**Symptoms:** Expected messages not appearing in Kafka

**Diagnosis:**
```bash
# Check if interface is in promiscuous mode
ip link show eth0 | grep PROMISC

# Check packet counts
curl -s http://localhost:7000/api/v1/stats
```

---

## Security Considerations

### Data Sensitivity

This service handles **highly sensitive telecommunications data** including:

- IMSI (International Mobile Subscriber Identity)
- MSISDN (Mobile Station ISDN Number)
- Call detail information
- Subscriber location data

### Recommended Controls

1. **Network Isolation:** Deploy in dedicated `soc-events` network segment
2. **Encryption at Rest:** Encrypt PCAP files at rest using LUKS or similar
3. **Encryption in Transit:** Use TLS for Kafka communication (see Kafka TLS config)
4. **Access Control:** Limit API access to authorized systems only
5. **Data Retention:** Implement automatic PCAP purging per retention policy

### ANRT Compliance Notes

Per Algerian regulatory requirements:

- All subscriber data must be processed within Algeria (on-premises)
- Signaling data retention must comply with ANRT data protection guidelines
- Access logs must be retained for minimum 24 months
- Incident reports must be submitted within required timeframes

---

## Support & Contacts

- **Engineering Team:** soc-engineering@djezzy.dz
- **Security Operations:** soc-soc@djezzy.dz
- **On-Call:** Refer to PagerDuty rotation schedule

---

**Last Updated:** 2026-08-03  
**Document Version:** 1.0.0
