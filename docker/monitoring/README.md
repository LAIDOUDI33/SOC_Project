# 📊 National SOC Platform - Monitoring Stack Documentation

## Overview

The Algeria National SOC Platform includes a comprehensive **Prometheus + Grafana** monitoring stack designed for high-traffic telecom operator environments (100K+ events/second capability).

### Architecture Components

| Component | Version | Port | Purpose |
|-----------|---------|------|---------|
| Prometheus | v2.48.0 | 9090 | Metrics collection & alerting |
| Grafana | 10.2.0 | 3001 | Visualization dashboards |
| Alertmanager | v0.26.0 | 9093 | Alert routing & notifications |
| Node Exporter | v1.7.0 | 9100 | System metrics (CPU, Memory, Disk) |
| PostgreSQL Exporter | v0.14.0 | 9187 | Database performance metrics |
| Redis Exporter | v1.55.0 | 9121 | Cache performance metrics |
| Blackbox Exporter | v0.24.0 | 9115 | Uptime & endpoint monitoring |
| Nginx Exporter | 0.11.0 | 9113 | Web server metrics |

---

## Quick Start

### 1. Start All Services

```bash
# Using docker-manager script
./scripts/docker-manager.sh start

# Or manually with docker-compose
docker-compose up -d prometheus grafana alertmanager node-exporter postgres-exporter redis-exporter blackbox-exporter nginx-exporter soc-app postgres redis nginx
```

### 2. Access Dashboards

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Grafana | http://localhost:3001 | admin / CHANGE_ME_GRAFANA_PASSWORD |
| Prometheus | http://localhost:9090 | No auth (internal) |
| Alertmanager | http://localhost:9093 | No auth (internal) |

### 3. Verify Metrics Collection

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check if SOC app metrics are being scraped
curl http://localhost:9090/api/v1/query?query=soc_alerts_total

# Verify custom metrics endpoint
curl http://localhost:3000/api/metrics/prometheus
```

---

## Available Dashboards

### 1. 🖥️ System Infrastructure Overview
**UID:** `infrastructure-system-overview`

- CPU, Memory, Disk usage gauges
- Network I/O by interface
- System load averages (1/5/15 min)
- File descriptors, zombie processes
- System uptime, swap usage

**Use Case:** Infrastructure team monitoring server health

### 2. 🚀 Application Performance Dashboard
**UID:** `application-performance-dashboard`

- API response time percentiles (p50/p95/p99)
- Request throughput (RPS)
- HTTP status code distribution
- Error rate trends
- WebSocket connections
- Latency heatmap by endpoint

**Use Case:** DevOps team monitoring application performance

### 3. 🗄️ PostgreSQL Database Monitoring
**UID:** `database-postgresql-dashboard`

- Connection pool usage (%)
- Active database connections
- Query throughput (QPS)
- Average query duration
- Connection states (Active/Idle/Waiting)
- Database storage usage (DB/Tables/Index)
- Lock contention (Deadlocks & Conflicts)
- Replication status

**Use Case:** DBA team monitoring database performance

### 4. ⚡ Redis Cache Monitoring Dashboard
**UID:** `cache-redis-dashboard`

- Memory usage percentage
- Cache hit rate (%)
- Total stored keys
- Commands processed/sec
- Command operations by type (GET/SET/DEL)
- Key evictions & expirations
- Command latency percentiles
- Client connections (Active/Blocked/Replicas)

**Use Case:** Performance team monitoring cache efficiency

### 5. 🛡️ SOC Security Operations Dashboard
**UID:** `security-soc-operations-dashboard`

- Total security alerts (live)
- Critical alerts requiring immediate action
- Open incidents count
- Mean Time to Resolve (MTTR)
- Alerts by severity distribution
- Alert ingestion rate (alerts/sec)
- Alert categories (Malware/Intrusion/DDoS/Phishing)
- Threat indicators detected
- Authentication attempts (success vs failure)

**Use Case:** SOC analysts monitoring security operations

### 6. 📡 Telecom Operator Dashboard
**UID:** `soc-telecom-dashboard`

- GTP packet rate (packets/sec)
- SS7/SIGTRAN message rate
- Diameter request rate
- GTP messages by type (Create/Update/Delete Session)
- SS7 MAP operations
- Roaming subscribers by visited network
- Authentication failures by reason
- Active subscribers & PDP contexts
- Fraud alerts
- Protocol processing success rate

**Use Case:** Telecom team monitoring mobile operator protocols

### 7. 🇩🇿 SOC Main Operations Dashboard
**UID:** `soc-operations-main`

- Combined view of all critical KPIs
- Cross-platform overview for NOC/SOC managers
- Real-time alert statistics
- Incident response times
- WebSocket real-time metrics
- System uptime SLA
- API success rate

**Use Case:** Management/NOC overview dashboard

---

## Custom Metrics Endpoint

### Location: `/api/metrics/prometheus`

The Next.js application exposes custom SOC-specific metrics in **Prometheus text exposition format**:

#### Available Metric Groups

```prometheus
# Application Info
soc_platform_info{version, environment, country}
soc_platform_uptime_seconds

# Security Alerts
soc_alerts_total
soc_alerts_today
soc_alerts_total{severity}
soc_alerts_by_type{alert_type}
soc_alerts_by_source{source}

# Incidents
soc_incidents_open_count
soc_incidents_in_progress_count
soc_incidents_resolved_count
soc_incidents_total
soc_mean_time_to_resolve
soc_mean_time_to_acknowledge

# Threat Intelligence
soc_active_indicators_count
soc_iocs_total
soc_threats_total

# Telecom Protocols (Demo Data)
telecom_gtp_packets_total{message_type}
telecom_ss7_messages_total{operation_code}
telecom_diameter_requests_total{command_code}
telecom_active_subscribers_count
telecom_fraud_alerts_total

# System Components
soc_component_health_score{name, category}
soc_component_up{name, category}

# Authentication
auth_successes_total
auth_failures_total

# WebSocket
websocket_connections
websocket_messages_sent_total
websocket_messages_received_total
```

### Testing the Endpoint

```bash
# Get all metrics in Prometheus format
curl -H "Accept: text/plain" http://localhost:3000/api/metrics/prometheus

# Parse with jq (if JSON format needed)
curl http://localhost:3000/api/metrics/prometheus | head -100
```

---

## Alerting Rules

### Alert Categories

The monitoring stack includes **40+ pre-configured alerting rules** organized into categories:

#### Infrastructure Alerts
| Alert Name | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| HighCPUUsage | >80% for 5m | warning | Monitor |
| CriticalCPUUsage | >95% for 2m | critical | Scale up |
| HighMemoryUsage | >85% for 5m | warning | Investigate |
| DiskSpaceWarning | <20% free for 10m | warning | Cleanup |
| DiskSpaceCritical | <10% free for 5m | critical | Immediate cleanup |
| HighSystemLoad | Load >0.8 for 5m | warning | Investigate |

#### Application Alerts
| Alert Name | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| ApplicationDown | Up == 0 for 1m | critical | Restart service |
| HighResponseTime | p95 >2s for 5m | warning | Optimize queries |
| CriticalResponseTime | p99 >5s for 3m | critical | Emergency fix |
| HighErrorRate | >5% errors for 5m | warning | Check logs |
| CriticalErrorRate | >20% errors for 2m | critical | Page on-call |
| LowWebSocketConnections | <50 for 15m | warning | Check WS config |

#### Database Alerts
| Alert Name | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| PostgreSQLDown | Up == 0 for 1m | critical | Failover |
| HighPostgreSQLConnections | >80% for 5m | warning | Increase pool |
| SlowPostgreSQLQueries | Avg >1s for 10m | warning | Optimize SQL |
| RapidDatabaseGrowth | >10GB/day for 4h | warning | Review retention |
| PostgreSQLDeadlocks | >10/hour for 5m | warning | Fix transactions |

#### Redis Alerts
| Alert Name | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| RedisDown | Up == 0 for 1m | critical | Restart Redis |
| RedisHighMemoryUsage | >80% for 5m | warning | Review eviction policy |
| RedisCriticalMemoryUsage | >95% for 2m | critical | Add memory |
| RedisLowHitRate | <70% for 15m | warning | Review cache strategy |

#### Security & Telecom Alerts
| Alert Name | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| AlertSurgeDetected | >1000/s for 2m | warning | Check for attack |
| CriticalAlertVolume | >500 critical/s for 1m | critical | Major incident |
| GTPProtocolAnomalies | >100 errors/s for 3m | warning | Check roaming config |
| SS7SuspiciousActivity | >50 suspicious/s for 2m | critical | Signaling attack! |
| BruteForceAttackSuspected | >100 fail/s for 2m | critical | Enable IP blocking |

---

## Notification Channels

### Configured Receivers

| Receiver | Channels | Use Case |
|----------|----------|----------|
| `critical-alerts` | Slack #soc-critical, Email NOC, PagerDuty | Immediate critical alerts |
| `warning-alerts` | Slack #soc-warnings, Email team | Delayed warnings |
| `security-alerts` | Slack #soc-security, TheHive webhook | Security incidents |
| `telecom-alerts` | Slack #soc-telecom | Telecom protocol issues |
| `compliance-alerts` | Slack #soc-compliance | ARPT compliance issues |

### Slack Integration Setup

1. Create incoming webhook URLs for each Slack channel
2. Set environment variables:
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/TXXX/BXXX/XXX"
   ```
3. Update `alertmanager.yml` with your webhook URLs

### PagerDuty Integration

1. Create PagerDuty service and get integration key
2. Set environment variable:
   ```bash
   export PAGERDUTY_SERVICE_KEY="your-service-key"
   ```

---

## Configuration Files

### Directory Structure

```
docker/monitoring/
├── prometheus/
│   ├── prometheus.yml          # Main Prometheus configuration
│   ├── rules/
│   │   └── alerts.yml          # Alerting rules (40+ rules)
│   ├── alertmanager.yml        # Alertmanager routing config
│   └── blackbox.yml            # Probes for uptime monitoring
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasource.yml  # Prometheus + Alertmanager data sources
│   │   └── dashboards/
│   │       └── dashboard.yml   # Auto-provisioning config
│   └── dashboards/
│       ├── soc-operations-dashboard.json      # Main operations
│       ├── soc-telecom-dashboard.json         # Telecom protocols
│       ├── infrastructure/
│       │   └── system-overview.json           # System metrics
│       ├── application/
│       │   └── performance.json               # App performance
│       ├── database/
│       │   └── postgresql.json                # DB monitoring
│       ├── cache/
│       │   └── redis-dashboard.json           # Redis metrics
│       └── security/
│           └── soc-security-dashboard.json    # Security ops
```

### Environment Variables

Key variables in `.env.docker`:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD
GF_ANONYMOUS_ENABLED=false

# Alertmanager (Optional)
SMTP_HOST=smtp.arpt.gov.dz
SMTP_PORT=587
SMTP_FROM_EMAIL=noc@arpt.gov.dz
PAGERDUTY_SERVICE_KEY=CHANGE_ME

# Prometheus Retention
PROMETHEUS_RETENTION_TIME=30d
PROMETHEUS_RETENTION_SIZE=50GB
```

---

## Scaling Considerations

### For High-Traffic Telecom Environments (100K+ events/sec)

1. **Prometheus Tuning**
   ```yaml
   # In prometheus.yml
   storage.tsdb.head_chunks_write_queue_size: 2000
   storage.tsdb.wal_compression: gzip
   evaluation_interval: 10s  # Faster rule evaluation
   ```

2. **Vertical Scaling**
   ```yaml
   # Resource limits in docker-compose.yml
   prometheus:
     deploy:
       resources:
         limits:
           cpus: '4.0'
           memory: 8G
   ```

3. **Horizontal Scaling (Production)**
   - Deploy Prometheus with Thanos or Victoria Metrics for long-term storage
   - Use Grafana Mimir for multi-tenant metrics
   - Consider remote write to object storage

4. **Rate Limiting**
   - Adjust scrape intervals based on metric importance
   - Critical metrics: 5-10s interval
   - Standard metrics: 15-30s interval
   - Infrequent metrics: 60s+ interval

---

## Troubleshooting

### Common Issues

#### 1. Prometheus Not Scraping Metrics

```bash
# Check target status
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="soc-application")'

# Verify endpoint is accessible from Prometheus container
docker exec soc-prometheus wget -qO- http://soc-app:3000/api/metrics/prometheus | head -20
```

#### 2. Grafana Dashboards Not Loading

```bash
# Check dashboard provisioning logs
docker logs soc-grafana | grep -i dashboard

# Verify dashboard files exist
ls -la docker/monitoring/grafana/dashboards/

# Check data source is working in Grafana UI
# Administration → Data Sources → Prometheus → Test
```

#### 3. Alertmanager Not Sending Notifications

```bash
# Check Alertmanager logs
docker logs soc-alertmanager | grep -i error

# Test alert routing
curl -XPOST http://localhost:9093/-/reload

# Verify SMTP/webhook configs
docker exec soc-alertmanager cat /etc/alertmanager/alertmanager.yml
```

#### 4. High Memory Usage on Prometheus

```bash
# Check current series count
curl 'http://localhost:9090/api/v1/series_count' 

# Reduce retention if needed
# Edit prometheus.yml:
# storage.tsdb.retention.time=15d  # Reduce from 30d
```

---

## Maintenance Tasks

### Daily
- [ ] Check Grafana dashboards are loading correctly
- [ ] Review alert firing history
- [ ] Verify all targets are healthy in Prometheus

### Weekly
- [ ] Review and tune alert thresholds
- [ ] Check disk space for Prometheus data (/var/lib/soc/prometheus-data)
- [ ] Backup Grafana dashboard configurations
- [ ] Review slow queries in PostgreSQL dashboard

### Monthly
- [ ] Review and update alerting rules
- [ ] Audit notification channel configurations
- [ ] Evaluate need for additional dashboards
- [ ] Check Prometheus retention size and adjust if needed

---

## Security Notes

1. **Internal Access Only**: Prometheus and Alertmanager should not be exposed publicly
2. **Grafana Authentication**: Always set strong passwords; disable anonymous access in production
3. **Network Isolation**: All monitoring services run on internal Docker network (172.28.0.0/16)
4. **TLS Termination**: Use Nginx reverse proxy with SSL for external Grafana access
5. **API Security**: `/api/metrics/prometheus` endpoint should be rate-limited in production

---

## Support & Documentation

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **Alertmanager Docs**: https://prometheus.io/docs/alerting/latest/alertmanager/
- **ARPT Compliance**: Internal documentation portal

---

*Last Updated: 2026-07-26*
*Version: 1.0.0*
*Platform: Algeria National SOC Platform 2026-2030*
