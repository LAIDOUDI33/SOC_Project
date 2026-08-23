# National SOC Platform - Production Go-Live & Hypercare Runbook

**Document Classification:** INTERNAL - OPERATIONAL  
**Version:** 1.0  
**Effective Date:** 2026-08-23  
**Owner:** Djezzy IT Security Operations  

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Pre-Go-Live Checklist](#2-pre-go-live-checklist)
3. [Go-Live Execution Plan](#3-go-live-execution-plan)
4. [Hypercare Support Framework](#4-hypercare-support-framework)
5. [Incident Response Procedures](#5-incident-response-procedures)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Post-Go-Live Validation](#7-post-go-live-validation)
8. [Hypercare Exit Criteria](#8-hypercare-exit-criteria)

---

## 1. Executive Overview

### 1.1 Purpose
This runbook provides step-by-step procedures for deploying the National SOC Platform to production, including hypercare support procedures for the critical period following go-live.

### 1.2 Scope
- **Platform:** Djezzy National Security Operations Center (SOC) Platform
- **Environment:** Production (soc.djezzy.dz)
- **Duration:** Go-Live Day + 14 days Hypercare Period
- **Stakeholders:** IT Security, Network Operations, Telecom Engineering, Compliance

### 1.3 Success Criteria
| Criterion | Target | Measurement |
|-----------|--------|-------------|
| System Availability | 99.9% | Uptime monitoring |
| Incident Detection Time | < 5 minutes | Alert latency |
| Mean Time to Respond | < 15 minutes | Ticket timestamps |
| User Adoption | > 80% active users | Login analytics |
| Critical Bug Count | 0 | Issue tracker |

---

## 2. Pre-Go-Live Checklist

### 2.1 Technical Prerequisites (T-7 Days)

#### Infrastructure ✅
- [ ] Kubernetes cluster production-ready (3+ nodes, HA configured)
- [ ] PostgreSQL cluster running with replication
- [ ] Redis cluster operational with persistence
- [ ] Elasticsearch cluster healthy (all nodes green)
- [ ] Load balancer configured and tested
- [ ] TLS certificates valid (expiry > 90 days)
- [ ] DNS records propagated (soc.djezzy.dz, api.djezzy-soc.dz)
- [ ] Firewall rules reviewed and applied
- [ ] WAF rules deployed and tested
- [ ] Backup systems verified (RPO < 15 min, RTO < 1 hour)

#### Application ✅
- [ ] All code merged to main/release branch
- [ ] Docker images built and pushed to registry
- [ ] Database migrations tested on staging
- [ ] Environment variables configured in .env.production
- [ ] Kubernetes secrets created (encrypted)
- [ ] Helm charts updated with production values
- [ ] Health check endpoints responding correctly
- [ ] Logging pipeline functional (→ Loki/Elasticsearch)
- [ ] Metrics collection active (→ Prometheus)
- [ ] Alerting rules configured (→ PagerDuty/Slack)

#### Security ✅
- [ ] Penetration testing completed (0 Critical/High findings)
- [ ] Security headers validated
- [ ] Rate limiting configured and tested
- [ ] MFA enforced for all users
- [ ] Audit logging enabled
- [ ] PII anonymization verified
- [ ] Access control lists reviewed
- [ ] API keys rotated (no default keys)
- [ ] SSL/TLS configuration hardened
- [ ] CORS policies restrictive

### 2.2 Business Readiness (T-3 Days)

#### Documentation ✅
- [ ] Operations manual completed and distributed
- [ ] Runbooks published (incident response, DR, etc.)
- [ ] User training materials available
- [ ] FAQ/knowledge base populated
- [ ] Escalation contacts documented
- [ ] Vendor support contacts confirmed

#### Stakeholder Sign-off ✅
- [ ] CISO approval obtained
- [ ] IT Director approval obtained
- [ ] Network Operations approval obtained
- [ ] Compliance Officer approval obtained
- [ ] ANRT notification sent (if required)

#### Communication Plan ✅
- [ ] User notification email drafted
- [ ] Help desk staff briefed
- [ ] Executive summary prepared
- [ ] Status page configured
- [ ] Maintenance window communicated

### 2.3 Final Checks (T-1 Day)

#### Data Migration ✅
- [ ] Staging data backed up
- [ ] Production database initialized
- [ ] Seed data loaded (roles, config)
- [ ] User accounts provisioned (LDAP sync)
- [ ] Reference data imported (threat feeds, IOC)
- [ ] Historical data migrated (if applicable)
- [ ] Data integrity verified

#### Smoke Tests ✅
- [ ] All API endpoints responding (HTTP 200/401)
- [ ] Authentication flow working (login, MFA, logout)
- [ ] Database queries executing properly
- [ ] External integrations connected (MISP, TheHive, Wazuh)
- [ ] SS7 collectors receiving data
- [ ] Real-time streams functioning
- [ ] Report generation working
- [ ] Email notifications sending

---

## 3. Go-Live Execution Plan

### 3.1 Timeline Overview

```
T-24h    Final preparations, backup current state
T-2h     War room setup, all hands call
T-0      Maintenance mode ON, begin deployment
T+15min  Database migrations complete
T+30min  Application deployment complete
T+45min  Integration verification
T+1h     Health checks pass, smoke tests run
T+1.5h  Maintenance mode OFF, go-live!
T+2h     Hypercare support begins
T+72h    Intensive monitoring phase ends
T+14d    Hypercare period ends, BAU operations
```

### 3.2 Go-Live Day Schedule

#### T-24 Hours: Final Preparations
```bash
# 1. Create final pre-production backup
./scripts/database/backup.sh --environment=production --label="pre-golive"

# 2. Verify backup integrity
./scripts/database/verify-backup.sh --backup=$(ls -t backups/production/ | head -1)

# 3. Document current system state
./scripts/audit/capture-system-state.sh --output=logs/pre-golive-state.json

# 4. Send reminder notifications
./scripts/notify/send-golive-reminder.sh --hours=24
```

#### T-2 Hours: War Room Setup
**Location:** Physical: SOC Operations Center / Virtual: Zoom Bridge  
**Attendees:** 
- Platform Lead (Coordinator)
- Database Administrator
- DevOps Engineer
- Security Engineer
- Network Engineer
- Application Support (2x)
- Business Representative

**Checklist:**
- [ ] Monitoring dashboards displayed (Grafana)
- [ ] Runbook documents accessible
- [ ] Communication channels open (Slack #soc-golive)
- [ ] Rollback procedure reviewed
- [ ] All participants have necessary access

#### T-0: Deployment Execution

##### Step 1: Activate Maintenance Mode
```bash
# Set maintenance mode in ingress/load balancer
kubectl annotate ingress soc-platform-ingress \
    nginx.ingress.kubernetes.io/maintenance-page="/maintenance.html" \
    -n soc-platform-production

# Update application config
curl -X POST "$INTERNAL_API/system/maintenance" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "System upgrade in progress"}'
```

##### Step 2: Execute Database Migrations
```bash
# Run production migrations
helm upgrade djezzy-soc ./helm/djezzy-soc \
  --namespace=soc-platform-production \
  --values=./helm/djezzy-soc/values-production.yaml \
  --set database.migrations.enabled=true \
  --wait --timeout=10m

# Verify migration success
kubectl logs job/soc-db-migration-latest -n soc-platform-production
```

##### Step 3: Deploy Application
```bash
# Deploy new version
helm upgrade djezzy-soc ./helm/djezzy-soc \
  --namespace=soc-platform-production \
  --values=./helm/djezzy-soc/values-production.yaml \
  --set socPlatformApi.image.tag=$PRODUCTION_IMAGE_TAG \
  --wait --timeout=15m

# Verify rollout status
kubectl rollout status deployment/soc-platform-api \
  -n soc-platform-production
```

##### Step 4: Verify Deployment
```bash
# Check pod health
kubectl get pods -n soc-platform-production -l app.kubernetes.io/instance=djezzy-soc

# Check service endpoints
kubectl get endpoints -n soc-platform-production

# Run health checks
for pod in $(kubectl get pods -n soc-platform-production -l app.kubernetes.io/instance=djezzy-soc -o jsonpath='{.items[*].metadata.name}'); do
  kubectl exec $pod -n soc-platform-production -- curl -sf localhost:3000/api/health
done
```

##### Step 5: Integration Verification
```bash
# Test external integrations
./scripts/integration/test-all.sh --env=production

# Verify data flows
./scripts/monitoring/check-data-flows.sh

# Test alerting
./scripts/alerting/test-notification.sh --type=all
```

##### Step 6: Disable Maintenance Mode & Go Live!
```bash
# Remove maintenance annotation
kubectl annotate ingress soc-platform-ingress \
    nginx.ingress.kubernetes.io/maintenance-page- \
    -n soc-platform-production

# Disable app-level maintenance
curl -X POST "$INTERNAL_API/system/maintenance" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# Log go-live event
logger -p user.info "SOC PLATFORM GO-LIVE COMPLETE $(date)"
```

### 3.3 Post-Go-Live Verification (T+1h to T+2h)

#### Automated Checks
```bash
# Run comprehensive smoke test suite
./scripts/uat-test-suite.sh --env=production --module=critical

# Performance baseline capture
./scripts/performance/capture-baseline.sh

# Security validation
./scripts/security/quick-scan.sh https://soc.djezzy.dz
```

#### Manual Verification Checklist
- [ ] Homepage loads without errors
- [ ] Login works with LDAP credentials
- [ ] MFA prompt appears and accepts codes
- [ ] Dashboard displays real data
- [ ] Alerts are visible and actionable
- [ ] Incidents can be created and updated
- [ ] SS7 traffic is displaying
- [ ] Threat intel feeds are updating
- [ ] Reports can be generated
- [ ] Export functions work
- [ ] Search returns relevant results
- [ ] Notifications are received
- [ ] Mobile responsive layout works

---

## 4. Hypercare Support Framework

### 4.1 Support Structure

#### Hypercare Team Roster
| Role | Name | Contact | Shift |
|------|------|---------|-------|
| **Hypercare Lead** | [Assigned] | Phone + Slack | 24/7 |
| **Platform Engineer** | [Assigned] | Phone + Slack | Day Shift |
| **Database Admin** | [Assigned] | Phone + Slack | On-call |
| **Security Analyst** | [Assigned] | Phone + Slack | Day Shift |
| **Application Support** | [Assigned] x2 | Slack | Rotating |

#### Support Channels
- **Primary:** Slack #soc-hypercare (monitored 24/7)
- **Escalation:** Phone tree (response < 5 minutes)
- **Documentation:** Confluence runbook space
- **Status Updates:** Status page + Email digest

### 4.2 Monitoring Dashboard

#### Key Metrics (Display on Wall Screen)
```yaml
Dashboard: SOC Platform - Hypercare Monitoring

Panels:
  - Request Rate (req/s) - target: < 1000/s
  - Error Rate (%) - target: < 0.1%
  - Response Time (p95) - target: < 500ms
  - Active Users - monitor trend
  - Database Connections - target: < 80% pool
  - Queue Depth (Kafka) - target: < 1000
  - CPU/Memory Utilization - target: < 70%
  - Alert Volume/Hour - monitor spikes
```

#### Alert Thresholds (Hypercare-Elevated)
| Metric | Normal Threshold | Hypercare Threshold |
|--------|------------------|---------------------|
| Error Rate | > 1% | > 0.1% |
| Response Time p95 | > 2s | > 500ms |
| Database Latency | > 100ms | > 50ms |
| Failed Auth Attempts | > 50/min | > 10/min |
| Queue Backlog | > 10k | > 1k |

### 4.3 Daily Hypercare Routine

#### Daily Standup (09:00 ALG Time)
**Duration:** 30 minutes  
**Agenda:**
1. Overnight incident review (if any)
2. Current system health assessment
3. Open issues and blockers
4. User feedback summary
5. Today's focus areas
6. Risk assessment

**Template:**
```markdown
## Hypercare Standup - Day X (Date)

### Overnight Summary
- Incidents: N (Critical: N, High: N)
- System Availability: XX.X%
- Peak Load: XXX req/s

### Current Issues
| ID | Priority | Issue | Owner | Status |
|----|----------|-------|-------|--------|

### User Feedback
- Positive: ...
- Issues: ...

### Focus Areas
1. ...
2. ...

### Risks
- ...
```

#### Hourly Health Checks (Business Hours)
Every hour during business hours (08:00-20:00 ALG):
1. Review Grafana dashboard
2. Check error logs (last hour)
3. Verify data pipeline freshness
4. Confirm alerting is working
5. Update status page if needed

#### End-of-Day Wrap-Up (18:00 ALG)
1. Summarize day's activities
2. Document any workarounds
3. Prepare handoff notes for next shift
4. Update issue tracker
5. Send daily stakeholder email

### 4.4 Issue Classification & Response

#### Severity Levels During Hypercare
| Severity | Definition | Response Time | Resolution Target |
|----------|------------|---------------|-------------------|
| **P0-Critical** | System down, data loss risk, security breach | 5 minutes | 1 hour |
| **P1-High** | Major feature broken, performance degraded | 15 minutes | 4 hours |
| **P2-Medium** | Minor feature issue, workaround exists | 1 hour | 24 hours |
| **P3-Low** | Cosmetic, enhancement request | 4 hours | Next release |

#### Issue Escalation Path
```
Level 1: Application Support (Slack response)
    ↓ (15 min no response or P0/P1)
Level 2: Platform Engineer (Phone + Slack)
    ↓ (30 min no resolution or P0)
Level 3: Hypercare Lead (Phone + Conference bridge)
    ↓ (1 hour no resolution or business impact)
Level 4: CISO / IT Director (Executive escalation)
```

---

## 5. Incident Response Procedures

### 5.1 P0-Critical: System Outage

**Symptoms:**
- All users unable to access platform
- Error rate > 50%
- Health check failing

**Immediate Actions:**
```bash
# 1. Assess scope (60 seconds)
kubectl get pods -n soc-platform-production | grep -v Running
kubectl logs --tail=100 deployment/soc-platform-api -n soc-platform-production

# 2. Check infrastructure
kubectl top pods -n soc-platform-production
kubectl describe node $(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')

# 3. Check dependencies
./scripts/health/check-dependencies.sh --db --redis --es --kafka

# 4. If quick fix not obvious, initiate rollback
# (See Section 6)
```

**Communication:**
- T+0: Post to #soc-hypercare with severity tag
- T+5: Page on-call engineer if not acknowledged
- T+15: Open conference bridge for P0 war room
- T+30: Send stakeholder notification (email/SMS)

### 5.2 P1-High: Feature Degradation

**Example:** SS7 monitoring not displaying data

**Investigation Steps:**
```bash
# 1. Identify affected component
kubectl logs deployment/ss7-collector -n soc-platform-production --tail=200

# 2. Check upstream data source
nc -zv ss7-source.telco.internal 9090

# 3. Check message queue depth
kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group ss7-consumer

# 4. Review recent changes
git log --oneline -10
```

**Workaround Options:**
- Restart affected pod(s)
- Switch to failover data source
- Enable cached/mocked data display
- Post banner explaining issue

### 5.3 Security Incident

If security anomaly detected during hypercare:

1. **DO NOT** touch potentially compromised systems
2. Preserve evidence (logs, snapshots)
3. Engage Security team immediately
4. Follow Security Incident Playbook (separate document)
5. Consider temporary service suspension if data breach confirmed

---

## 6. Rollback Procedures

### 6.1 Decision Criteria for Rollback

**Initiate rollback if:**
- P0 incident unresolved after 30 minutes
- Data corruption detected
- Security vulnerability exploited
- Multiple P1 incidents simultaneously
- Stakeholder decision to abort

### 6.2 Rolling Back Application

```bash
#!/bin/bash
# rollback-application.sh
# Usage: ./rollback-application.sh --version=<previous-version>

VERSION=${1:?"Previous version required"}

echo "Starting rollback to version $VERSION..."

# 1. Get current state for diagnostics
kubectl get pods -n soc-platform-production -o yaml > /tmp/pre-rollback-state.yaml

# 2. Roll back Helm release
helm rollback djezzy-soc 1 \
  --namespace=soc-platform-production \
  --wait --timeout=10m

# 3. Verify rollback success
kubectl rollout status deployment/soc-platform-api \
  -n soc-platform-production

# 4. Run smoke tests
./scripts/uat-test-suite.sh --env=production --module=critical

# 5. Notify stakeholders
./scripts/notify/send-rollback-notification.sh --from=$CURRENT_VERSION --to=$VERSION

echo "Rollback complete"
```

### 6.3 Rolling Back Database

**⚠️ DANGEROUS - Only if data corruption confirmed**

```bash
#!/bin/bash
# rollback-database.sh
# Usage: ./rollback-database.sh --backup=<backup-file>

BACKUP=${1:?"Backup file required"}

echo "WARNING: Rolling back database from $BACKUP"
read -p "Are you sure? Type 'YES' to proceed: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "Aborted"
    exit 1
fi

# 1. Put application in maintenance mode
kubectl scale deployment soc-platform-api -n soc-platform-production --replicas=0

# 2. Restore database from backup
pg_restore --clean --if-exists \
  --dbname=soc_production \
  --host=pg-cluster-soc.djezzy.internal \
  --username=soc_admin \
  "$BACKUP"

# 3. Verify data integrity
psql -U soc_admin -d soc_production -c "SELECT COUNT(*) FROM incidents;"

# 4. Restart application
kubectl scale deployment soc-platform-api -n soc-platform-production --replicas=3

echo "Database rollback complete"
```

### 6.4 Post-Rollback Validation

After any rollback:
- [ ] System health restored (health checks passing)
- [ ] No data loss (verify record counts)
- [ ] Users can log in and operate
- [ ] Integrations functioning
- [ ] No residual errors in logs
- [ ] Root cause documented
- [ ] Stakeholders notified

---

## 7. Post-Go-Live Validation

### 7.1 Day 1 Validation (T+24h)

**Metrics to Capture:**
```bash
# Generate Day 1 report
./scripts/reports/generate-hypercare-report.sh --day=1

# Key metrics:
# - Total requests served
# - Error rate (should be < 0.5%)
# - Average response time
# - Active unique users
# - Incidents created
# - Alerts processed
# - Reports generated
# - Support tickets opened
```

**Validation Checklist:**
- [ ] No P0/P1 incidents overnight
- [ ] User login success rate > 95%
- [ ] All critical features used at least once
- [ ] Data pipelines current (< 5 min lag)
- [ ] Backup successful (overnight)
- [ ] No unexpected costs (cloud billing)

### 7.2 Day 7 Validation (End of Week 1)

**Review Meeting Agenda:**
1. Week 1 metrics summary
2. Incident retrospective (any P1/P2)
3. User feedback analysis
4. Performance vs. baselines
5. Training gaps identified
6. Week 2 focus areas
7. Hypercare extension decision (if needed)

**Deliverables:**
- Week 1 Hypercare Report
- Updated runbooks (based on issues found)
- FAQ additions (common user questions)
- Known Issues list

### 7.3 Day 14 Validation (Hypercare End)

**Final Hypercare Report Sections:**

#### Executive Summary
- Overall platform health assessment
- Go-Live success criteria met (Y/N)
- Recommendations for BAU operations

#### Metrics Comparison
| Metric | Baseline | Day 1 | Day 7 | Day 14 | Target Met? |
|---------|----------|-------|-------|--------|-------------|
| Availability | - | % | % | % | Y/N |
| Error Rate | - | % | % | % | Y/N |
| Response Time | - | ms | ms | ms | Y/N |
| Active Users | - | # | # | # | Y/N |
| Incidents (P0/P1) | - | # | # | # | Y/N |

#### Lessons Learned
- What went well
- What could be improved
- Unexpected challenges
- Best practices discovered

#### Handover to BAU
- Operational procedures finalized
- Monitoring thresholds normalized
- Support channels transitioned
- Documentation archived

---

## 8. Hypercare Exit Criteria

### 8.1 Requirements to End Hypercare

**ALL of the following must be true for 7 consecutive days:**

✅ **Availability:** System availability ≥ 99.9%  
✅ **Reliability:** Zero P0 incidents  
✅ **Performance:** Response times within SLA (p95 < 500ms)  
✅ **Stability:** Error rate < 0.1%  
✅ **Support:** < 5 support tickets/day (excluding questions)  
✅ **User Adoption:** > 70% of provisioned users active  
✅ **Automation:** All automated processes working (backups, reports, alerts)  
✅ **Knowledge:** Support team confident in handling issues independently  

### 8.2 Early Exit Conditions

May end hypercare early if:
- All exit criteria met for 7 days
- Stakeholder agreement (CISO + IT Director sign-off)
- No known critical bugs outstanding
- Support team certified as ready

### 8.3 Extension Triggers

MUST extend hypercare if:
- Any P0 incident in last 48 hours
- More than 2 P1 incidents in last 7 days
- New critical bug discovered
- Major feature not working as designed
- User adoption below 50%
- Support team requests more time

### 8.4 Transition to BAU Operations

Once hypercare ends:

1. **Support Model Change**
   - 24/7 coverage → Business hours + on-call
   - Slack #soc-hypercare → #soc-support
   - Elevated thresholds → Normal thresholds

2. **Monitoring Adjustment**
   - Remove hypercare dashboard (or archive)
   - Restore normal alert thresholds
   - Reduce log verbosity if increased

3. **Process Handover**
   - Archive hypercare runbook
   - Create BAU operations guide
   - Train Level 1 support team
   - Establish regular review cadence

4. **Documentation**
   - Final hypercare report signed off
   - Lessons learned documented
   - Improvement backlog items created
   - Success celebration! 🎉

---

## Appendices

### A. Emergency Contacts (Hypercare Period)

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Hypercare Lead | [Name] | +213 XXX XXX XXX | email@djezzy.dz |
| Platform Engineer | [Name] | +213 XXX XXX XXX | email@djezzy.dz |
| DBA | [Name] | +213 XXX XXX XXX | email@djezzy.dz |
| Security Lead | [Name] | +213 XXX XXX XXX | email@djezzy.dz |
| Executive Sponsor | [Name] | +213 XXX XXX XXX | email@djezzy.dz |

### B. Quick Reference Commands

```bash
# Check overall system health
kubectl get pods -n soc-platform-production

# View application logs (real-time)
kubectl logs -f deployment/soc-platform-api -n soc-platform-production --tail=100

# Scale application
kubectl scale deployment soc-platform-api -n soc-platform-production --replicas=5

# Restart a specific pod
kubectl delete pod <pod-name> -n soc-platform-production

# Port-forward for debugging
kubectl port-forward svc/soc-platform-api 3000:80 -n soc-platform-production

# Describe resource for troubleshooting
kubectl describe pod <pod-name> -n soc-platform-production

# Check node resources
kubectl top nodes

# Force Helm rollback
helm rollback djezzy-soc 1 -n soc-platform-production
```

### C. Useful URLs

| Service | URL |
|---------|-----|
| Production App | https://soc.djezzy.dz |
| Grafana Dashboards | https://grafana.monitoring.djezzy.internal |
| Prometheus | https://prometheus.monitoring.djezzy.internal |
| AlertManager | http://alertmanager:9093 |
| K8s Dashboard | https://k8s-dashboard.djezzy.internal |
| Status Page | https://status.djezzy.dz |

---

**Document Control:**
- Version: 1.0
- Last Updated: 2026-08-23
- Next Review: Post Hypercare (Day 14)
- Approvals: CISO ___________ Date _______
