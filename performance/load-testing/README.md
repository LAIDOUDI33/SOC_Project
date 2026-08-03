# Djezzy SOC Platform - Performance Load Testing Suite

## Overview

Comprehensive load testing suite for validating the **Djezzy National SOC Platform** performance under extreme conditions. This suite is designed to verify that the platform meets its **enterprise-scale targets**:

### Baseline Targets

| Metric | Target | Critical Threshold | Action Required |
|--------|--------|-------------------|-----------------|
| **P95 Response Time** | <200ms (API), <2s (Dashboard) | >1000ms | Immediate investigation |
| **Error Rate** | <0.1% | >1% | Critical - rollback |
| **Throughput** | 500K+ EPS | <100K EPS | Scale infrastructure |
| **Concurrent Users** | 10,000+ stable | Degradation >50% | Horizontal scaling |
| **CPU Usage** | <70% average | >90% sustained | Optimize queries / scale |
| **Memory Usage** | <75% average | >95% sustained | Memory leak investigation |
| **Cache Hit Rate** | >95% | <80% | Cache strategy review |
| **API RPS Capacity** | 10,000+ RPS | <5,000 RPS | Infrastructure upgrade |

---

## Directory Structure

```
performance/load-testing/
├── k6-dashboard-load.js        # Dashboard load test (1000+ users)
├── k6-api-stress.js            # API stress test (10K RPS target)
├── k6-ingestion.js             # Event ingestion throughput (500K EPS)
├── k6-scripts/                 # Additional k6 scripts
│   ├── dashboard-load.js       # Original dashboard test
│   ├── api-stress.js           # Original API stress test
│   ├── ingestion-throughput.js # Original ingestion test
│   ├── concurrent-users.js     # Concurrency simulation
│   └── soak-test.js            # 24-hour endurance test
├── locustfile.py               # Locust alternative with user personas
└── jmeter/
    └── test-plan.jmx           # JMeter comprehensive test plan
```

---

## Prerequisites

### k6 Installation

```bash
# macOS (Homebrew)
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install -y k6 k6-extras

# Using Go (from source)
go install go.k6.io/k6/v6/latest/k6

# Docker (recommended for distributed testing)
docker pull grafana/k6:latest

# Run with Docker
docker run --rm -i grafana/k6 run - <script.js
```

### Locust Installation

```bash
pip install locust requests

# With optional web UI extras
pip install "locust[extra]"
```

### JMeter Installation

Download from [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi) and extract.

---

## Quick Start

### 1. Dashboard Load Test (1000 Users)

Validates dashboard page performance with realistic user behavior.

```bash
# Basic run with defaults (1000 users target)
k6 run performance/load-testing/k6-dashboard-load.js \
  --summary-export=results/dashboard-summary.json \
  --out json=results/dashboard-metrics.json

# Custom configuration
BASE_URL=https://soc.djezzy.dz \
TEST_USER=loadtest \
TEST_PASS=yourpassword \
k6 run performance/load-testing/k6-dashboard-load.js \
  --duration 30m
```

**Expected Results:**
```
Dashboard Load Test:
  - P50 Response Time: 300-600ms
  - P95 Response Time: 800-1500ms (<2000ms target ✓)
  - P99 Response Time: 1200-2500ms
  - Error Rate: <0.05%
  - Throughput: 5,000-8,000 requests/min at peak (1000 users)
```

### 2. API Stress Test (10K RPS)

Identifies bottlenecks in individual API endpoints.

```bash
# Target 10K RPS
k6 run performance/load-testing/k6-api-stress.js \
  BASE_URL=https://api.soc.djezzy.dz \
  --duration 15m

# Custom RPS target
TARGET_RPS=15000 \
k6 run performance/load-testing/k6-api-stress.js
```

**Expected Results:**
```
API Stress Test:
  - P95 Latency: 80-180ms (<200ms target ✓)
  - P99 Latency: 150-400ms
  - Error Rate: <0.01%
  - Max Throughput: 12,000+ req/s achievable
  - Connection Pool: Stable at 5000+ connections
```

### 3. Event Ingestion Throughput (500K EPS)

Validates event ingestion pipeline capacity.

```bash
# Target 500K EPS with batch size of 100
TARGET_EPS=500000 \
BATCH_SIZE=100 \
INGESTION_TOKEN=your-ingestion-token \
k6 run performance/load-testing/k6-ingestion.js \
  --duration 20m

# High-throughput configuration
TARGET_EPS=750000 \
BATCH_SIZE=250 \
DURATION=30m \
k6 run performance/load-testing/k6-ingestion.js
```

**Expected Results:**
```
Ingestion Throughput:
  - Sustained EPS: 450,000-550,000 (>500K target ✓)
  - Batch Acceptance Rate: >99.9%
  - Average Latency: 20-45ms per batch (<50ms target ✓)
  - P99 Latency: <100ms
  - Error Rate: <0.01%
```

### 4. Concurrent Users Test (10,000 Users)

Validates stability with maximum expected concurrency.

```bash
k6 run performance/load-testing/k6-scripts/concurrent-users.js \
  BASE_URL=https://soc.djezzy.dz \
  --iterations 100000
```

**User Persona Distribution:**

| Persona | Percentage | Behavior Pattern |
|---------|------------|------------------|
| SOC Analyst | 40% | Alert investigation, log searches, correlation |
| SOC Operator | 30% | Alert acknowledgment, status updates, triage |
| Threat Hunter | 15% | Advanced queries, pivoting, deep analysis |
| Manager | 10% | Reports, KPI monitoring, dashboards |
| Admin | 5% | User management, health checks, config |

### 5. Soak Test (24-Hour Endurance)

Detects memory leaks and resource degradation over extended periods.

```bash
SOAK_USER=soak-user \
SOAK_PASS=soak-password \
DURATION=24h \
k6 run performance/load-testing/k6-scripts/soak-test.js
```

**Monitoring Focus:**
- Memory usage trends (should be stable, not growing linearly)
- Response time degradation (should not increase over time)
- Connection pool exhaustion
- Garbage collection impact patterns
- Disk I/O stability

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Target SOC platform URL | `http://localhost:3000` |
| `TEST_USER` | Username for authentication | `loadtest-user` |
| `TEST_PASS` | Password for authentication | `loadtest-pass-2024!` |
| `AUTH_TOKEN` | Pre-authenticated token (skip login) | None |
| `TARGET_EPS` | Target events per second | `500000` |
| `TARGET_RPS` | Target requests per second | `10000` |
| `BATCH_SIZE` | Events per batch request | `100` |
| `DURATION` | Test duration | Varies by script |
| `TEST_RUN_ID` | Unique identifier for test run | Auto-generated |
| `INGESTION_TOKEN` | Token for event ingestion endpoint | `perf-test-token` |
| `MAX_LATENCY` | Maximum acceptable latency (ms) | `50` |
| `ERROR_RATE` | Acceptable error rate threshold | `0.0001` |
| `COMPRESSION` | Enable payload compression | `true` |

---

## Test Scenarios Explained

### Dashboard Load Test (`k6-dashboard-load.js`)

**Purpose:** Validate dashboard page performance under realistic user loads.

**Load Profile:**
```
Users: 0 → 10 → 100 → 500 → 1000 (target) → 1500 (stress) → 0
Duration: ~25 minutes total
Think time: 2-5 seconds between actions (realistic user behavior)
```

**Key Metrics:**
- Page load time (target <2s P95)
- Time to First Byte (TTFB)
- Full content render time
- API call parallelization efficiency
- Static resource loading

### API Stress Test (`k6-api-stress.js`)

**Purpose:** Identify bottlenecks in individual API endpoints.

**Tested Endpoints:**
| Endpoint | Weight | Priority | Target P95 |
|----------|--------|----------|------------|
| `/api/v1/events` | 25% | Critical | 100ms |
| `/api/alerts` | 20% | Critical | 200ms |
| `/api/metrics` | 15% | Critical | 150ms |
| `/api/dashboard` | 12% | Critical | 200ms |
| `/api/incidents` | 15% | Critical | 180ms |
| Other endpoints | 13% | Standard | 250ms |

### Ingestion Throughput Test (`k6-ingestion.js`)

**Purpose:** Validate 500K+ Events Per Second capacity.

**Configuration Options:**
```bash
TARGET_EPS=500000    # Target events per second
BATCH_SIZE=100       # Events per batch request
DURATION=10m         # Test duration
MAX_LATENCY=50       # P95 latency threshold in ms
```

**Event Types Generated:**
- Network connections (firewall logs)
- Security alerts (IDS/IPS signatures)
- Authentication attempts (SSH, web, etc.)
- Malware detections (EDR alerts)
- Intrusion signatures (Suricata/Snort)
- DNS queries
- HTTP requests
- File access events
- Process executions

---

## Results Analysis

### Interpreting k6 Output

```
checks.........................: 98.50% ✓ 1.52% ✗
data_received.................: 2.5 GB
data_sent.....................: 450 MB
http_req_blocked..............: avg=1.23ms min=0s max=500ms p(90)=2.5ms p(95)=5ms
http_req_connect..............: avg=3.45ms min=0s max=200ms p(90)=8ms p(95)=15ms
http_req_duration............: avg=85ms min=0s max=2s p(90)=120ms p(95)=180ms {expected_response_time: true}
http_req_failed................: 0.05% ✓
http_req_receiving............: avg=12ms min=0s max=500ms p(90)=25ms p(95)=40ms
http_req_sending..............: avg=2ms min=0s max=100ms p(90)=5ms p(95)=10ms
http_req_waiting..............: avg=70ms min=0s max=1.9s p(90)=100ms p(95)=150ms
http_reqs.....................: 5002345 3.33/s
iteration_duration............: avg=300ms min=0s max=2.5s p(90)=400ms p(95)=600ms
iterations....................: 5002345 3.33/s
vus...........................: 1 min=10 max=1000
vus_max........................: 1000
```

### Identifying Performance Issues

| Issue | Symptom | Likely Cause | Recommended Action |
|-------|---------|--------------|-------------------|
| High P95 latency | P95 > 2x baseline | Database query slow | Add indexes, optimize queries |
| Increasing errors | Error rate climbs during test | Connection pool exhaustion | Increase pool size, add timeout |
| CPU saturation | CPU >90% sustained | Missing indexes / N+1 queries | Query optimization, caching |
| Memory growth | Memory increases linearly | Memory leak in application code | Profile memory, check closures |
| High variance | Large std dev in response times | Resource contention / GC pressure | Review GC settings, reduce allocations |
| Slow TTFB | http_req_waiting high | Server processing delay | Check middleware, auth overhead |
| Connection errors | Connection refused/timeouts | Server overwhelmed | Scale horizontally, add load balancer |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  pull_request:
    paths:
      - 'src/**'
      - 'prisma/**'
      - 'config/**'
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: soc_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747EF341C
          sudo apt-add-repository 'deb https://dl.k6.io/deb stable main'
          sudo apt-get update && sudo apt-get install k6
      
      - name: Start application
        run: npm run dev &
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test:test@localhost:5432/soc_test
          REDIS_URL: redis://localhost:6379
        
      - name: Wait for app to be ready
        run: sleep 10 && curl -f http://localhost:3000/api/health || exit 1
      
      - name: Run API Stress Test
        run: |
          k6 run performance/load-testing/k6-api-stress.js \
            BASE_URL=http://localhost:3000 \
            --duration 5m \
            --summary-export=k6-results.json \
            --out json=k6-metrics.json
      
      - name: Check Thresholds
        run: |
          node scripts/check-performance-thresholds.js k6-results.json
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            k6-results.json
            k6-metrics.json
```

### GitLab CI Example

```yaml
performance-test:
  stage: test
  image: grafana/k6:latest
  variables:
    BASE_URL: http://soc-platform:3000
  services:
    - name: redis:7-alpine
      alias: redis
  script:
    - k6 run performance/load-testing/k6-dashboard-load.js --duration 10m
    - k6 run performance/load-testing/k6-api-stress.js --duration 10m
  artifacts:
    when: always
    paths:
      - results/
    reports:
      junit: results/junit-report.xml
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: always
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

---

## Distributed Testing

For large-scale tests requiring more than one machine:

```bash
# Master node
k6 run --no-vu script.js \
  --address localhost:6565 \
  --execution-segment "0:1/3"

# Worker node 1
k6 run script.js \
  --address master-ip:6565 \
  --execution-segment "1/3:2/3"

# Worker node 2  
k6 run script.js \
  --address master-ip:6565 \
  --execution-segment "2/3:3/3"
```

Or use k6 Cloud for managed distributed testing:
```bash
k6 cloud script.js
```

---

## Best Practices

1. **Always test against staging first** before production deployments
2. **Use production-like data volumes** for accurate and representative results
3. **Monitor infrastructure metrics** during tests (CPU, memory, disk, network)
4. **Run tests during off-peak hours** if testing against shared environments
5. **Document baseline results** after each major release to track regression
6. **Test after every deployment** to catch regressions early
7. **Use distributed execution** for tests exceeding 5000 VUs
8. **Warm up the system** before measuring - include ramp-up phases
9. **Validate test data realism** - synthetic data should match production patterns
10. **Automate threshold checking** - fail CI/CD when thresholds are breached

---

## Troubleshooting

### Common Errors

**Connection Refused**
```bash
# Verify URL is correct and accessible
curl -I $BASE_URL/api/health

# Check firewall rules
telnet $HOSTNAME $PORT
```

**Authentication Failures**
```bash
# Ensure credentials are valid
curl -X POST $BASE_URL/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

**Resource Exhaustion on Test Runner**
```bash
# Increase available resources
# Use distributed testing for larger tests
ulimit -n 65535  # Increase file descriptor limit
```

**Timeouts During High Load**
```bash
# Adjust timeout values
export K6_TIMEOUT=60s

# Or in script options
{ timeout: '60s' }
```

**High Memory Usage by k6**
```bash
# Discard response bodies to reduce memory
discardResponseBodies: true

# Limit metrics collection
--summary-export=/dev/null
```

---

## Support & Contact

For questions or issues with this load testing suite:

- **Performance Team**: perf-team@djezzy.dz
- **SOC Platform Team**: soc-platform@djezzy.dz
- **SRE Team**: sre@djezzy.dz
- **Internal Wiki**: [Link to internal documentation]
- **Slack**: #soc-performance

---

*Last Updated: $(date +%Y-%m-%d)*
*Version: 2.0.0*
*Target: Djezzy National SOC Platform v2.x*
