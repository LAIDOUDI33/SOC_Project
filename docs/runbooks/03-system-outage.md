# System Outage Runbook

**Document ID:** SOC-RB-003  
**Version:** 1.5  
**Classification:** Internal Use Only  
**Last Updated:** January 2025  
**Owner:** Djezzy National SOC Operations Team

---

## Table of Contents

1. [Purpose and Scope](#purpose-and-scope)
2. [Degradation Detection](#degradation-detection)
3. [Outage Classification](#outage-classification)
4. [Initial Response Procedures](#initial-response-procedures)
5. [Failover Procedures](#failover-procedures)
6. [Disaster Recovery Activation](#disaster-recovery-activation)
7. [Communication Protocols](#communication-protocols)
8. [Recovery Validation](#recovery-validation)

---

## Purpose and Scope

This runbook provides procedures for detecting, responding to, and recovering from system outages affecting the Djezzy National SOC Platform and its dependent services. It covers both partial degradations and complete outages of critical infrastructure components.

### Scope of Systems Covered

| System Category | Components | Criticality |
|----------------|------------|-------------|
| **SOC Platform Core** | Web Application, API Gateway, Authentication | Critical |
| **Data Layer** | PostgreSQL Cluster, Elasticsearch, Redis Cache | Critical |
| **Security Tools** | Wazuh SIEM, Suricata IDS, TheHive SOAR | High |
| **Network Infrastructure** | Load Balancers, Firewalls, VPN Gateways | Critical |
| **Telecom Integrations** | Probe Manager, Fraud Detection, ANRT Gateway | High |
| **Monitoring & Observability** | Prometheus, Grafana, AlertManager | Medium |

---

## Degradation Detection

### Automated Monitoring Alerts

The Djezzy SOC platform utilizes multi-layered monitoring to detect service degradation:

#### Infrastructure-Level Monitoring (Prometheus)

```yaml
# prometheus/rules/soc_platform_alerts.yml
groups:
  - name: soc_platform_availability
    rules:
      # Service availability alerts
      - alert: SOCPlatformDown
        expr: up{job="soc-platform"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SOC Platform instance {{ $labels.instance }} is down"
          description: "Instance has been unreachable for > 1 minute"

      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate (>5%) on SOC Platform"
          description: "Current error rate: {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on SOC Platform"
          description: "P95 latency is {{ $value }}s"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.85
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} connections used"
```

#### Application-Level Health Checks

```typescript
// src/app/api/health/route.ts - Enhanced health check endpoint
import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    elasticsearch: ComponentHealth;
    externalServices: Record<string, ComponentHealth>;
  };
  metrics: {
    uptime: number;
    responseTimeMs: number;
    activeConnections: number;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
    checks: {},
    metrics: {
      uptime: process.uptime(),
      responseTimeMs: 0,
      activeConnections: 0,
    }
  };

  const startTime = Date.now();

  // Database Health Check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'up',
      latency_ms: Date.now() - dbStart,
    };
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown DB error'
    };
    health.status = 'unhealthy';
  }

  // Redis Health Check
  try {
    const redisStart = Date.now();
    await redis.ping();
    health.checks.redis = {
      status: 'up',
      latency_ms: Date.now() - redisStart,
    };
  } catch (error) {
    health.checks.redis = {
      status: 'down',
      error: 'Redis connection failed'
    };
    if (health.status !== 'unhealthy') health.status = 'degraded';
  }

  // Elasticsearch Health Check
  try {
    const esStart = Date.now();
    const esResponse = await fetch(`${process.env.ES_URL}/_cluster/health`);
    const esHealth = await esResponse.json();
    health.checks.elasticsearch = {
      status: esHealth.status === 'green' ? 'up' : 'degraded',
      latency_ms: Date.now() - esStart,
    };
    if (esHealth.status === 'red') {
      health.checks.elasticsearch.status = 'down';
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.checks.elasticsearch = {
      status: 'down',
      error: 'Elasticsearch unreachable'
    };
    health.status = 'unhealthy';
  }

  // External Services Health Checks
  const externalServices = ['thehive', 'cortex', 'misp', 'opencti'];
  health.checks.externalServices = {};

  for (const service of externalServices)) {
    try {
      const svcStart = Date.now();
      const response = await fetch(`${process.env[`${service.toUpperCase()}_URL`]}/health`, {
        timeout: 5000,
      });
      health.checks.externalServices[service] = {
        status: response.ok ? 'up' : 'degraded',
        latency_ms: Date.now() - svcStart,
      };
    } catch (error) {
      health.checks.externalServices[service] = {
        status: 'down',
        error: `${service} unreachable`
      };
    }
  }

  health.metrics.responseTimeMs = Date.now() - startTime;

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 503 : 503;

  return NextResponse.json(health, { status: statusCode });
}
```

### Manual Degradation Indicators

Watch for these signs that may not trigger automated alerts:

| Indicator | Symptom | Potential Cause |
|-----------|---------|-----------------|
| User complaints | Multiple reports of slow/unresponsive UI | Backend performance issue |
| Dashboard gaps | Missing data in visualizations | Data pipeline failure |
| Alert silence | Unusual lack of alerts | SIEM ingestion failure |
| Login failures | Users unable to authenticate | Identity provider issue |
| Query timeouts | Searches returning errors | Database/Elasticsearch overload |

---

## Outage Classification

### Severity Levels

| Level | Definition | Response Time | Example Scenarios |
|-------|------------|---------------|-------------------|
| **SEV-1** | Complete platform outage, all users affected | Immediate (< 5 min) | Datacenter failure, total network loss |
| **SEV-2** | Major functionality unavailable, most users affected | < 15 minutes | Primary database down, auth service failure |
| **SEV-3** | Partial degradation, subset of features/users affected | < 30 minutes | Single component failure, slow responses |
| **SEV-4** | Minor issue, workaround available | < 2 hours | Non-critical feature degraded |

### Impact Assessment Matrix

```
                    ┌─────────────────────────────────────┐
                    │         USER IMPACT                 │
                    │   Low    │    Medium    │    High   │
├───────────────────┼─────────┼─────────────┼───────────┤
│ DURATION         │         │             │           │
│ < 30 min         │ SEV-4   │   SEV-3     │   SEV-2   │
│ 30min - 4hr      │ SEV-3   │   SEV-2     │   SEV-1   │
│ > 4 hours        │ SEV-2   │   SEV-1     │   SEV-1   │
└───────────────────┴─────────┴─────────────┴───────────┘
```

---

## Initial Response Procedures

### Step 1: Verify and Confirm Outage (0-5 minutes)

Upon receiving an outage alert or report:

```bash
#!/bin/bash
# verify_outage.sh - Initial outage verification

echo "=== SOC Platform Outage Verification ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# 1. Check local connectivity to core services
echo "--- Connectivity Tests ---"

# Web Frontend
curl -sf -o /dev/null -w "Frontend (HTTPS): %{http_code} (%{time_total}s)\n" \
  https://soc.djezzy.local/health || echo "Frontend: UNREACHABLE"

# API Gateway
curl -sf -o /dev/null -w "API Gateway: %{http_code} (%{time_total}s)\n" \
  https://api.soc.djezzy.local/api/health || echo "API Gateway: UNREACHABLE"

# 2. Check backend services
echo ""
echo "--- Backend Services ---"

# PostgreSQL
pg_isready -h postgres.soc.djezzy.local -p 5432 2>/dev/null && \
  echo "PostgreSQL: OK" || echo "PostgreSQL: UNREACHABLE"

# Redis
redis-cli -h redis.soc.djezzy.local ping 2>/dev/null && \
  echo "Redis: OK" || echo "Redis: UNREACHABLE"

# Elasticsearch
curl -sf http://elasticsearch.soc.djezzy.local:9200/_cluster/health?pretty 2>/dev/null | \
  grep -o '"status":"[^"]*"' || echo "Elasticsearch: UNREACHABLE"

# 3. Check Kubernetes cluster
echo ""
echo "--- Kubernetes Status ---"
kubectl get nodes -o wide 2>/dev/null || echo "kubectl: NOT CONFIGURED"
kubectl get pods -A --field-selector=status.phase!=Running 2>/dev/null | \
  grep -v "No resources" || echo "All pods running"

# 4. Recent error logs sample
echo ""
echo "--- Recent Errors (last 10 lines) ---"
kubectl logs -l app=soc-platform --tail=10 --since=5m 2>/dev/null | grep -i error || echo "No recent errors in logs"

echo ""
echo "=== Verification Complete ==="
```

### Step 2: Initial Diagnosis (5-15 minutes)

Use this decision tree for rapid diagnosis:

```
OUTAGE DETECTED
      │
      ▼
Is the platform completely unreachable?
      │
      ├─ YES ──► Check infrastructure layer
      │            ├── Network connectivity (ping, traceroute)
      │            ├── DNS resolution
      │            ├── Load balancer status
      │            └── Datacenter power/environmental
      │
      └─ NO (Partial) ──► Identify failing component
                         │
                         ├── Authentication failures? ──► LDAP/SAML/IDP issues
                         ├── Database errors? ──► PostgreSQL/Elasticsearch problems
                         ├── Slow responses? ──► Resource exhaustion, query issues
                         ├── Feature-specific? ──► Microservice dependency failure
                         └── Intermittent? ──► Network instability, load issues
```

### Step 3: Declare Incident and Notify

Once outage is confirmed:

```bash
#!/bin/bash
# declare_outage.sh - Formal incident declaration

SEVERITY=$1
DESCRIPTION=$2
DECLARED_BY=$(whoami)

TIMESTAMP=$(date -u '+%Y%m%d_%H%M%S')
INCIDENT_ID="OUT-${TIMESTAMP}"

echo "Declaring outage incident: $INCIDENT_ID"
echo "Severity: $SEVERITY"
echo "Declared by: $DECLARED_BY"

# Create incident in TheHive
curl -X POST https://hive.soc.djezzy.local/api/v1/case \
  -H "Authorization: Bearer $THEHIVE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"System Outage - $INCIDENT_ID\",
    \"description\": \"$DESCRIPTION\",
    \"severity\": $SEVERITY,
    \"tags\": [\"outage\", \"infrastructure\"],
    \"tlp\": 2,
    \"flag\": true
  }"

# Send initial notification based on severity
case $SEVERITY in
  1)
    # SEV-1: Page all on-call, initiate bridge
    send_page "soc-on-call" "SEV-1 OUTAGE DECLARED: $INCIDENT_ID - $DESCRIPTION"
    send_page "infra-on-call" "SEV-1 OUTAGE DECLARED: $INCIDENT_ID"
    initiate_bridge_call "$INCIDENT_ID"
    ;;
  2)
    # SEV-2: Page primary on-call
    send_page "soc-on-call" "SEV-2 OUTAGE: $INCIDENT_ID - $DESCRIPTION"
    ;;
  3|4)
    # SEV-3/4: Slack notification only
    slack_notify "#soc-incidents" "⚠️ $SEVERITY Outage $INCIDENT_ID: $DESCRIPTION"
    ;;
esac

# Log declaration
echo "$(date -Iseconds) | $INCIDENT_ID | $SEVERITY | $DECLARED_BY | $DESCRIPTION" >> /var/log/soc/outages.log

echo "Incident declared: $INCIDENT_ID"
```

---

## Failover Procedures

### Database Failover (PostgreSQL)

The Djezzy SOC platform uses PostgreSQL with streaming replication for high availability.

#### Automatic Failover (Patroni)

Our PostgreSQL cluster uses Patroni for automated failover. Monitor failover events:

```bash
# Check cluster status
patronici list

# View current leader
patronici show-leader

# Check replication lag
psql -h postgres.soc.djezzy.local -U postgres -c "
  SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes
  FROM pg_stat_replication;
"
```

#### Manual Failover Procedure

If automatic failover fails or manual intervention is required:

```bash
#!/bin/bash
# postgres_failover.sh - Manual PostgreSQL failover

# WARNING: This should only be executed after confirming primary is down
echo "=== MANUAL POSTGRESQL FAILOVER ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1. Verify current state
echo "Step 1: Checking current cluster state..."
CURRENT_LEADER=$(patronici show-leader)
echo "Current Leader: $CURRENT_LEADER"

# 2. Confirm primary is unresponsive
echo "Step 2: Verifying primary unresponsive..."
PRIMARY_HOST="$CURRENT_LEADER"
if ping -c 3 -W 2 "$PRIMARY_HOST" >/dev/null 2>&1; then
  echo "WARNING: Primary is still responding to ping!"
  read -p "Are you sure you want to proceed with failover? (yes/no): " CONFIRM
  [ "$CONFIRM" != "yes" ] && exit 1
fi

# 3. Perform switchover/failover
echo "Step 3: Initiating failover..."
# Find best candidate (most caught-up replica)
BEST_REPLICA=$(psql -h postgres-replica.soc.djezzy.local -U postgres -t -c "
  SELECT client_addr FROM pg_stat_replication 
  ORDER BY pg_wal_lsn_diff(sent_lsn, replay_lsn) ASC LIMIT 1;
" | tr -d ' ')

echo "Promoting replica: $BEST_REPLICA"

# Patroni switchover (if primary alive) or failover (if primary dead)
if patronictl list | grep -q "running.*Leader"; then
  patronictl switchover --master "$PRIMARY_HOST" --candidate "$BEST_REPLICA" --force
else
  patronictl failover --candidate "$BEST_REPLICA"
fi

# 4. Verify new leader
echo "Step 4: Verifying new leader..."
sleep 5
NEW_LEADER=$(patronici show-leader)
echo "New Leader: $NEW_LEADER"

if [ "$NEW_LEADER" != "$PRIMARY_HOST" ]; then
  echo "FAILOVER SUCCESSFUL"
else
  echo "FAILOVER MAY HAVE FAILED - Manual intervention required"
  exit 1
fi

# 5. Update application connection strings if needed
echo "Step 5: Updating connection configuration..."
# Patroni typically handles this via service discovery, but verify:
# - DNS records updated
# - Connection poolers reconfigured
# - Applications reconnected

echo "=== FAILOVER COMPLETE ==="
```

### Elasticsearch Failover

```bash
#!/bin/bash
# elasticsearch_recovery.sh - Elasticsearch cluster recovery

echo "=== ELASTICSEARCH RECOVERY PROCEDURE ==="

# 1. Check cluster health
echo "Current cluster health:"
curl -s http://elasticsearch.soc.djezzy.local:9200/_cluster/health?pretty

# 2. If cluster is red, identify problem shards
echo ""
echo "Problematic shards:"
curl -s http://elasticsearch.soc.djezzy.local:9200/_cat/shards?v | grep RED

# 3. Attempt allocation retry
echo ""
echo "Retrying shard allocation..."
curl -X POST "http://elasticsearch.soc.djezzy.local:9200/_cluster/reroute?retry_failed" | jq .

# 4. If still failing, check which nodes are down
echo ""
echo "Node status:"
curl -s "http://elasticsearch.soc.djezzy.local:9200/_cat/nodes?v&health"

# 5. For missing nodes, consider excluding and reallocating
# WARNING: This may result in data loss!
# curl -X PUT "http://elasticsearch.soc.djezzy.local:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
#   "transient": {
#     "cluster.allocation.exclude._name": "missing-node-name"
#   }
# }'

echo ""
echo "Monitor recovery with:"
echo "  watch -n 5 'curl -s http://elasticsearch.soc.djezzy.local:9200/_cluster/health?pretty'"
```

### Application Failover (Kubernetes)

```bash
#!/bin/bash
# k8s_app_failover.sh - Application pod restart/redeployment

NAMESPACE=${1:-"soc-platform"}
DEPLOYMENT=${2:-"soc-platform"}

echo "=== KUBERNETES APPLICATION RECOVERY ==="
echo "Namespace: $NAMESPACE"
echo "Deployment: $DEPLOYMENT"

# 1. Check deployment status
echo "Current deployment status:"
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

# 2. Check for pod issues
echo ""
echo "Pod status:"
kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o wide

# 3. Check recent pod events
echo ""
echo "Recent events:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20

# 4. Option A: Restart (rolling restart)
echo ""
echo "Initiating rolling restart..."
kubectl rollout restart deployment/$DEPLOYMENT -n $NAMESPACE

# 5. Wait for healthy pods
echo "Waiting for rollout completion..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=300s

# 6. Verify service health
echo ""
echo "Verifying service health..."
sleep 10
kubectl exec -n $NAMESPACE deploy/$DEPLOYMENT -- curl -sf localhost/health | jq .status

echo "=== RECOVERY COMPLETE ==="
```

---

## Disaster Recovery Activation

### When to Activate DR

DR activation is required when:

- Primary datacenter is completely inaccessible
- Estimated recovery time exceeds 4 hours
- Data corruption affects primary site
- Natural disaster or facility emergency
- Cyber attack requiring complete infrastructure rebuild

### DR Site Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIMARY SITE (Algiers)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  App    │  │  PG     │  │  ES     │  │  Redis  │           │
│  │  Pods   │──│ Primary │  │ Cluster │  │ Cluster │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │                  │
│       └────────────┴─────┬──────┴────────────┘                  │
│                          │ Async Replication                    │
│                          │ RPO: 15 min (DB), 5 min (ES)        │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DR SITE (Oran Backup)                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  App    │  │  PG     │  │  ES     │  │  Redis  │           │
│  │  Standby│  │ Standby │  │ Standby │  │ Standby │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│              ACTIVATED ON FAILOVER                               │
└─────────────────────────────────────────────────────────────────┘
```

### DR Activation Checklist

```markdown
## DISASTER RECOVERY ACTIVATION CHECKLIST

**Authorization Required:** CISO + IT Director (or designee)
**Estimated RTO:** 2-4 hours
**RPO:** Up to 15 minutes data loss (database)

### PRE-ACTIVATION (0-15 minutes)

□ Obtain authorization for DR activation
□ Declare SEV-1 incident with DR tag
□ Assemble DR team (bridge call initiated)
□ Notify stakeholders of impending failover

□ Verify DR site accessibility
  - Network connectivity confirmed
  - Power/environmental systems operational
  - Staff access validated

### DATABASE FAILOVER (15-45 minutes)

□ Promote DR PostgreSQL to primary
  ```bash
  # On DR site
  patronici failover --candidate dr-pg-node-01
  ```

□ Verify database consistency
  ```bash
  # Check for replication gap
  psql -c "SELECT pg_last_xact_replay_timestamp();"
  ```

□ Update application connection strings
  - Point applications to DR database
  - Verify connection pooler configuration

### ELASTICSEARCH FAILOVER (30-60 minutes)

□ Activate DR Elasticsearch cluster
  - Verify index recovery status
  - Check for any corrupted indices

□ Redirect log shippers to DR cluster
  - Update Filebeat/Logstash outputs
  - Verify log flow resuming

### APPLICATION FAILOVER (45-90 minutes)

□ Update DNS records (TTL should be pre-lowered to 60s)
  ```
  soc-api.djezzy.local → DR load balancer IP
  soc.djezzy.local → DR load balancer IP
  ```

□ Activate DR Kubernetes workloads
  ```bash
  # Scale up DR deployments (pre-configured at 0 replicas)
  kubectl scale deployment soc-platform --replicas=3 -n soc-platform
  ```

□ Verify application health endpoints
  - All services returning healthy
  - Authentication working correctly
  - Dashboards loading properly

### VALIDATION (90-120 minutes)

□ Run smoke test suite
  - User login/logout
  - Alert creation and viewing
  - Report generation
  - API endpoint validation

□ Validate data integrity
  - Sample recent alerts present
  - Incidents accessible
  - Historical queries returning results

### COMMUNICATION (Throughout)

□ Update status page
□ Notify internal stakeholders
□ Prepare customer communication if needed
□ Document timeline for post-mortem

### RETURN TO PRIMARY (After Resolution)

□ Schedule maintenance window for failback
□ Verify primary site fully restored
□ Perform reverse replication sync
□ Execute controlled failback
□ Validate primary operations
□ Decommission DR active mode
```

---

## Communication Protocols

### Internal Communication Channels

| Channel | Use Case | Audience |
|---------|----------|----------|
| #soc-incidents (Slack) | Real-time updates, coordination | SOC Team, Infra |
| PagerDuty | Escalations, SEV-1/2 | On-call engineers |
| Bridge Call | Major incidents, DR activation | IR team, leadership |
| Email | Stakeholder updates, summaries | Management, business units |

### Status Update Template

```markdown
## Outage Status Update - [INCIDENT ID]

**Time:** [HH:MM UTC]
**Status:** [Investigating | Identified | Monitoring | Resolved]
**Severity:** [SEV-1 | SEV-2 | SEV-3 | SEV-4]

### Current State
[Brief description of current situation]

### Affected Services
- [ ] Web Interface
- [ ] API Endpoints
- [ ] Alert Processing
- [ ] Report Generation
- [ ] Authentication

### Next Update
[Time of next planned update or "Next update when significant change"]

---
Incident Commander: [Name]
Bridge Line: [Number] (if active)
```

### External Communication (If Required)

For outages potentially visible to customers or requiring regulatory notification:

```markdown
## Customer Communication Template (Draft)

SUBJECT: Service Availability Update

Dear Partners/Stakeholders,

We are currently experiencing technical difficulties affecting 
[Djezzy National SOC Platform / specific service].

**Start Time:** [DATE/TIME]
**Current Status:** [Active / Resolved]
**Impact:** [Description of impact]

Our technical teams are actively working to resolve the issue. 
We will provide updates every [INTERVAL] until service is fully restored.

We apologize for any inconvenience this may cause.

For urgent inquiries, please contact:
[Support contact information]

Sincerely,
Djezzy Technical Operations Team
```

---

## Recovery Validation

### Post-Recovery Checklist

After service restoration, complete these validations:

```bash
#!/bin/bash
# validate_recovery.sh - Post-outage validation script

echo "=== POST-OUTAGE VALIDATION ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

PASS_COUNT=0
FAIL_COUNT=0

check_pass() {
  echo "✓ PASS: $1"
  ((PASS_COUNT++))
}

check_fail() {
  echo "✗ FAIL: $1"
  ((FAIL_COUNT++))
}

# 1. Platform Accessibility
echo "--- Platform Accessibility ---"
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" https://soc.djezzy.local/health)
if [ "$HTTP_CODE" = "200" ]; then
  check_pass "Web frontend accessible (HTTP $HTTP_CODE)"
else
  check_fail "Web frontend returned HTTP $HTTP_CODE"
fi

API_CODE=$(curl -sf -o /dev/null -w "%{http_code}" https://api.soc.djezzy.local/api/health)
if [ "$API_CODE" = "200" ]; then
  check_pass "API gateway accessible (HTTP $API_CODE)"
else
  check_fail "API gateway returned HTTP $API_CODE"
fi

# 2. Database Operations
echo ""
echo "--- Database Operations ---"
if pg_isready -h postgres.soc.djezzy.local -p 5432 2>/dev/null; then
  check_pass "PostgreSQL accepting connections"
  
  # Test basic query
  if psql -h postgres.soc.djezzy.local -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
    check_pass "Basic query execution successful"
  else
    check_fail "Query execution failed"
  fi
  
  # Check replication (if applicable)
  REPL_LAG=$(psql -h postgres.soc.djezzy.local -U postgres -t -c "
    SELECT COALESCE(
      MAX(pg_wal_lsn_diff(sent_lsn, replay_lsn)), 0
    )::bigint FROM pg_stat_replication;
  " 2>/dev/null | tr -d ' ')
  
  if [ "${REPL_LAG:-0}" -lt 10485760 ]; then  # Less than 10MB
    check_pass "Replication lag acceptable (${REPL_LAG:-0} bytes)"
  else
    check_fail "Replication lag high (${REPL_LAG:-0} bytes)"
  fi
else
  check_fail "PostgreSQL not accessible"
  FAIL_COUNT=$((FAIL_COUNT + 2))
fi

# 3. Cache Layer
echo ""
echo "--- Cache Layer ---"
REDIS_RESPONSE=$(redis-cli -h redis.soc.djezzy.local ping 2>/dev/null)
if [ "$REDIS_RESPONSE" = "PONG" ]; then
  check_pass "Redis responding"
else
  check_fail "Redis not responding ($REDIS_RESPONSE)"
fi

# 4. Search Engine
echo ""
echo "--- Search Engine ---"
ES_HEALTH=$(curl -sf http://elasticsearch.soc.djezzy.local:9200/_cluster/health 2>/dev/null | \
  jq -r '.status' 2>/dev/null)
if [ "$ES_HEALTH" = "green" ] || [ "$ES_HEALTH" = "yellow" ]; then
  check_pass "Elasticsearch cluster status: $ES_HEALTH"
else
  check_fail "Elasticsearch cluster status: ${ES_HEALTH:-unreachable}"
fi

# 5. Alert Processing
echo ""
echo "--- Alert Processing ---"
# Check for recent alerts being processed
RECENT_ALERTS=$(curl -sf "https://api.soc.djezzy.local/api/alerts?limit=1" \
  -H "Authorization: Bearer $API_TOKEN" 2>/dev/null | jq '.total')
if [ -n "$RECENT_ALERTS" ] && [ "$RECENT_ALERTS" -ge 0 ] 2>/dev/null; then
  check_pass "Alert API functional ($RECENT_ALERTS alerts in queue)"
else
  check_fail "Alert API not responding"
fi

# 6. Authentication
echo ""
echo "--- Authentication ---"
AUTH_TEST=$(curl -sf -o /dev/null -w "%{http_code}" \
  https://api.soc.djezzy.local/api/auth/validate \
  -H "Authorization: Bearer test_invalid_token")
if [ "$AUTH_TEST" = "401" ]; then
  check_pass "Authentication endpoint responding (correctly rejects invalid token)"
else
  check_fail "Auth endpoint unexpected response: $AUTH_TEST"
fi

# Summary
echo ""
echo "=== VALIDATION SUMMARY ==="
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"

if [ $FAIL_COUNT -eq 0 ]; then
  echo "STATUS: ALL CHECKS PASSED"
  exit 0
else
  echo "STATUS: SOME CHECKS FAILED - Review required"
  exit 1
fi
```

### Extended Monitoring Period

Following any SEV-1 or SEV-2 outage:

- **First 2 hours:** Monitor every 15 minutes
- **Hours 2-24:** Monitor every 30 minutes
- **Hours 24-72:** Monitor hourly
- **Document any anomalies** during monitoring period

---

## Appendix: Emergency Contacts

| Role | Primary Contact | Backup | Notes |
|------|-----------------|--------|-------|
| SOC Manager | [Phone/Slack] | [Phone/Slack] | Decision authority for SEV-1/2 |
| Infrastructure Lead | [Phone/Slack] | [Phone/Slack] | Server/network issues |
| Database Admin | [Phone/Slack] | [Phone/Slack] | PostgreSQL/Elasticsearch |
| Vendor Support (Kubernetes) | [Support Line] | [Ticket Portal] | 24/7 support contract |
| Datacenter Facility | [Facility Phone] | [Facility Phone] | Physical access, power |
| Executive Sponsor | [Phone/Email] | [Phone/Email] | Business decisions |

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-06-01 | Infra Team | Initial creation |
| 1.5 | 2025-01-10 | SOC Ops | Added DR procedures, validation scripts |

---

*This document supports operational response to system outages. Review quarterly and after any significant infrastructure changes.*
