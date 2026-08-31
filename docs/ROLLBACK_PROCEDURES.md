# CyberSOC Platform - Production Rollback Procedures
## Emergency Cutover-Back Documentation

**Document Classification:** CRITICAL OPERATIONAL  
**Owner:** CyberSOC Operations Team  
**Last Updated:** 2026-08-26 12:36

---

## Executive Summary

This document defines the rollback procedures for reverting a failed CyberSOC Platform GA deployment. Rollback must be executable within **15 minutes (RTO)** to minimize service disruption.

**Rollback Authorization:** Requires CTO or Security Lead approval  
**Rollback Trigger:** Any P1 incident during deployment window  

---

## Table of Contents

1. [Pre-Rollback Checklist](#pre-rollback-checklist)
2. [Application Rollback](#application-rollback)
3. [Database Rollback](#database-rollback)
4. [Infrastructure Rollback](#infrastructure-rollback)
5. [Communication Protocol](#communication-protocol)
6. [Post-Rollback Validation](#post-rollback-validation)

---

## Pre-Rollback Checklist

### Immediate Actions (Minutes 0-5)

```
□ Confirm rollback authorization received (CTO/Security Lead)
□ Alert all stakeholders via #soc-deployments Slack channel
□ Open incident bridge call (Zoom/Teams)
□ Assign scribe to document all actions
□ Verify current deployment version (git rev-parse HEAD)
□ Identify rollback target version (previous stable commit)
```

### Safety Checks

```
□ No active security incidents in progress
□ Database backup verified and accessible
□ Current system state documented (screenshots, logs)
□ Rollback window confirmed (low traffic period preferred)
```

---

## Application Rollback

### Kubernetes Deployment Rollback

```bash
# 1. Identify current deployment revision
kubectl rollout history deployment/soc-platform -n cybersoc

# 2. Rollback to previous stable revision
kubectl rollout undo deployment/soc-platform -n cybersoc --to-revision=<STABLE_REVISION>

# 3. Monitor rollout status
kubectl rollout status deployment/soc-platform -n cybersoc --timeout=300s

# 4. Verify pod health
kubectl get pods -n cybersoc -l app=soc-platform

# 5. Check application health endpoint
curl -sf https://soc.djezzy.dz/health | jq .
```

### Helm Chart Rollback (If Applicable)

```bash
# List deployment history
helm history soc-platform -n cybersoc

# Rollback to previous release
helm rollback soc-platform <PREVIOUS_REVISION> -n cybersoc

# Verify release status
helm status soc-platform -n cybersoc
```

### Service-Specific Rollback Commands

| Component | Rollback Command | Verification |
|-----------|-----------------|--------------|
| API Gateway | `kubectl rollout restart deployment/api-gateway` | `/health` returns 200 |
| Frontend | `kubectl rollout restart deployment/soc-frontend` | UI loads correctly |
| WebSocket | `kubectl rollout restart deployment/soc-websocket` | Connection established |
| Workers | `kubectl rollout restart deployment/soc-workers` | Jobs processing |

---

## Database Rollback

### PostgreSQL Point-in-Time Recovery (PITR)

```bash
# 1. Stop application connections (prevent new writes)
kubectl scale deployment/soc-platform -n cybersoc --replicas=0

# 2. Identify recovery target time (before failed migration)
RECOVERY_TIME="2026-08-26 12:00:00 UTC"  # Set to time before issue

# 3. Execute PITR recovery
pg_restore   --clean   --if-exists   --dbname=soc_platform   --host=postgres-primary.cybersoc.svc.cluster.local   --port=5432   --username=postgres   "/opt/cybersoc/backups/pre-ga-deployment.dump"

# 4. Verify data integrity
psql -c "SELECT COUNT(*) FROM users;"
psql -c "SELECT COUNT(*) FROM incidents;"
psql -c "SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';"

# 5. Restart application
kubectl scale deployment/soc-platform -n cybersoc --replicas=3
```

### Migration-Specific Rollback

```bash
# If specific migration caused issues:
# 1. Identify problematic migration
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 2. Rollback migration (if down migration exists)
python manage.py migrate <app> <previous_version>

# OR manually revert:
BEGIN;
-- Undo migration SQL here
COMMIT;

# 3. Record rollback in migration table
DELETE FROM schema_migrations WHERE version = '<PROBLEMATIC_VERSION>';
```

---

## Infrastructure Rollback

### TLS Certificate Rollback

```bash
# Revert to previous certificate version
kubectl get certificates -n cybersoc > /tmp/current-certs.txt

# If new certs are causing issues, delete and re-create
kubectl delete certificate soc-djezzy-dz-tls -n cybersoc
kubectl apply -f k8s/cert-manager/certificates.yaml --previous-version

# Monitor certificate issuance
kubectl describe certificate soc-djezzy-dz-tls -n cybersoc
```

### ConfigMap/Secret Rollback

```bash
# List previous ConfigMap revisions
kubectl rollout history configmap/soc-config -n cybersoc

# Or restore from backup
kubectl get configmap soc-config -n cybersoc -o yaml > /tmp/current-config.yaml
kubectl apply -f /tmp/backup-config.yaml
kubectl rollout restart deployment/soc-platform -n cybersoc
```

### Network Policy Rollback

```bash
# If new network policies blocking traffic:
kubectl get networkpolicies -n cybersoc > /tmp/current-netpol.yaml

# Apply previous known-good policies
kubectl apply -f k8s/production/network-policies.previous.yaml
```

---

## Communication Protocol

### Stakeholder Notification Timeline

| Time (T=0) | Action | Channel | Audience |
|------------|--------|---------|----------|
| T+0min | Declare rollback incident | PagerDuty P1 | On-call team |
| T+2min | Post to #soc-alerts | Slack | All SOC team |
| T+5min | Email stakeholders | Email | Mgmt + Clients |
| T+15min | Status update (resolved/in-progress) | All channels | All |
| T+30min | Post-mortem scheduled | Calendar | Engineering |

### Communication Templates

**Initial Alert:**
```
🚨 ROLLBACK INITIATED - CyberSOC Production
Time: <timestamp>
Reason: <brief reason>
Est. Duration: 15 minutes
Impact: Potential service interruption
Bridge: <video call link>
Scribe: <name>
```

**Resolution Update:**
```
✅ ROLLBACK COMPLETE - CyberSOC Production
Time: <timestamp>
Duration: <actual minutes>
Root Cause: <initial assessment>
Service Status: Normal / Degraded
Next Steps: <post-mortem, fixes, etc.>
```

---

## Post-Rollback Validation

### Health Checks (Run in Order)

```bash
#!/bin/bash
# post_rollback_validation.sh

echo "=== Post-Rollback Validation ==="

# 1. Application health
curl -sf https://soc.djezzy.dz/health | jq -e '.status == "ok"' && echo "✅ Health OK" || echo "❌ Health FAIL"

# 2. Authentication working
curl -sf -X POST https://api-soc.djezzy.dz/auth/login   -H "Content-Type: application/json"   -d '{"username":"test","password":"test"}' | jq -e '.token != null' && echo "✅ Auth OK" || echo "⚠️  Auth needs testing"

# 3. Database connectivity
psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1 && echo "✅ DB OK" || echo "❌ DB FAIL"

# 4. Redis connectivity
redis-cli -u "$REDIS_URL" ping | grep -q PONG && echo "✅ Redis OK" || echo "❌ Redis FAIL"

# 5. Kafka connectivity
kafka-broker-api-versions --bootstrap-server "$KAFKA_BOOTSTRAP_SERVERS" >/dev/null 2>&1 && echo "✅ Kafka OK" || echo "⚠️  Kafka needs testing"

# 6. Monitoring dashboards accessible
curl -sf https://grafana.soc.djezzy.dz/api/health | jq -e '.version != null' && echo "✅ Grafana OK" || echo "⚠️  Grafana needs testing"

echo "=== Validation Complete ==="
```

### Data Integrity Checks

```sql
-- Run these after database rollback to verify data consistency
-- Record counts should match pre-deployment baseline

SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'threat_intel', COUNT(*) FROM threat_intel
ORDER BY table_name;

-- Verify no future timestamps (data corruption indicator)
SELECT COUNT(*) as corrupted_records FROM audit_logs 
WHERE created_at > NOW() + INTERVAL '1 hour';

-- Check referential integrity (sample)
SELECT COUNT(*) AS orphaned_incidents FROM incidents 
WHERE user_id NOT IN (SELECT id FROM users);
```

---

## Escalation Matrix

| Condition | Escalate To | SLA |
|-----------|-------------|-----|
| Rollback fails | CTO + Security Lead | Immediate |
| Data loss detected | CTO + Legal + Compliance | Immediate |
| Security breach during rollback | Security Lead + Incident Response | Immediate |
| Rollback successful but degraded | Platform Architect | T+30min |
| All systems normal after rollback | No escalation needed | N/A |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-26 | CyberSOC Ops | Initial GA procedures |

---

**Emergency Contacts:**
- **CTO:** cto@djezzy.dz | +213 XX XXX XX XX
- **Security Lead:** security-lead@djezzy.dz | +213 XX XXX XX XX
- **On-Call Engineer:** (PagerDuty rotation)
- **Emergency Bridge:** Zoom link in #soc-alerts channel

---

*This document is part of the CyberSOC Platform Operational Runbook Suite.*
