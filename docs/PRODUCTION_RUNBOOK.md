# National SOC Platform - Production Runbook
## Djezzy Operations Manual

**Document Version:** 1.0.0  
**Classification:** CONFIDENTIAL - Internal Use Only  
**Last Updated:** 2026-01-20  

---

## Table of Contents

1. [Introduction & Purpose](#1-introduction--purpose)
2. [On-Call Procedures](#2-on-call-procedures)
3. [Escalation Matrix](#3-escalation-matrix)
4. [Common Incident Response Procedures](#4-common-incident-response-procedures)
5. [Maintenance Window Procedures](#5-maintenance-window-procedures)
6. [Emergency Change Process](#6-emergency-change-process)
7. [Communication Templates](#7-communication-templates)
8. [Vendor Contact List](#8-vendor-contact-list)
9. [Disaster Recovery Procedures](#9-disaster-recovery-procedures)
10. [Business Continuity Triggers](#10-business-continuity-triggers)
11. [Post-Incident Review Process](#11-post-incident-review-process)

---

## 1. Introduction & Purpose

### 1.1 Document Scope
This runbook provides operational procedures for the **National SOC Platform** deployed for Djezzy Algeria. It is designed to be used by on-call engineers, SOC operators, and platform administrators during both normal operations and incident response.

### 1.2 Target Audience
| Role | Primary Use |
|------|-------------|
| On-Call Engineer | Incident response, troubleshooting |
| SOC Operator | Daily operations, alert handling |
| Platform Engineer | Infrastructure management |
| Security Engineer | Security incident handling |
| SOC Manager | Escalation, communication |

### 1.3 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   CloudFlare │ (DDoS Protection / WAF)
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │    NGINX Ingress (K8s)   │ ← TLS Termination
              │   soc.djezzy.dz:443     │
              └────────────┬────────────┘
                           │
       ┌───────────────────▼───────────────────┐
       │         Kubernetes Cluster            │
       │  ┌─────────────────────────────────┐  │
       │  │   SOC Platform Pods (Next.js)    │  │
       │  │   - soc-platform-deployment      │  │
       │  │   - Replicas: 5-30 (HPA)        │  │
       │  └──────────────┬──────────────────┘  │
       │                 │                      │
       │  ┌──────────────▼──────────────────┐  │
       │  │        Services                 │  │
       │  │  - PostgreSQL Cluster           │  │
       │  │  - Redis Sentinel               │  │
       │  │  - Elasticsearch (Logging)      │  │
       │  └─────────────────────────────────┘  │
       └───────────────────────────────────────┘
```

### 1.4 Key URLs & Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Production Application | https://soc.djezzy.dz | Main SOC Dashboard |
| API Endpoint | https://api.soc.djezzy.dz | REST API |
| Grafana | https://grafana.soc.djezzy.dz | Monitoring Dashboards |
| Health Check | https://soc.djezzy.dz/api/health | System Health Status |
| Metrics | https://soc.djezzy.dz/api/metrics | Prometheus Metrics |

---

## 2. On-Call Procedures

### 2.1 On-Call Schedule

| Shift | Hours (Local Time) | Coverage | Handover |
|-------|---------------------|----------|----------|
| Day Shift | 07:00 - 19:00 | Primary + Backup | 06:45 / 19:00 |
| Night Shift | 19:00 - 07:00 | On-call (remote) | 18:45 / 07:00 |
| Weekend | 08:00 - 20:00 | Reduced coverage | Via Slack |

### 2.2 On-Call Responsibilities

#### Primary Responsibilities:
- [ ] Monitor PagerDuty/Opsgenie alerts (response time < 5 min for P1)
- [ ] Acknowledge and triage all incoming alerts
- [ ] Execute runbook procedures for incidents
- [ ] Document all actions in ticketing system
- [ ] Communicate status updates to stakeholders
- [ ] Perform scheduled maintenance tasks
- [ ] Update shift handover notes

#### Daily Checklist (Start of Shift):
```bash
# 1. Review overnight alerts
# Check PagerDuty for any missed or escalated alerts

# 2. Verify system health
curl -s https://soc.djezzy.dz/api/health | jq .

# 3. Check Grafana dashboards
# Visit: grafana.soc.djezzy.dz/d/production-overview

# 4. Review open tickets
# Check Jira/ServiceNow for open P1/P2 items

# 5. Check backup status
./scripts/production/backup-strategy.sh status

# 6. Review security events
# Check #security-alerts Slack channel
```

#### Daily Checklist (End of Shift):
- [ ] All incidents documented with current status
- [ ] No unacknowledged alerts in queue
- [ ] Handover notes prepared for next engineer
- [ ] Knowledge base updated if new issues discovered
- [ ] Pending tasks clearly assigned

### 2.3 Shift Handover Template

```
═══════════════════════════════════════════════════════════════
SHIFT HANDOVER REPORT
Date: ___________  From: _________  To: _________
═══════════════════════════════════════════════════════════════

SYSTEM STATUS: ☐ GREEN  ☐ YELLOW  ☐ RED

OPEN INCIDENTS:
• Ticket #: ________ Severity: ___ Status: ________
  Summary: ________________________________________

PENDING TASKS:
• _________________________________________________

ISSUES REQUIRING ATTENTION:
• _________________________________________________

NOTES FOR NEXT SHIFT:
• _________________________________________________

Handover Completed By: ___________  Time: _________
Acknowledged By: ___________  Time: _________
```

---

## 3. Escalation Matrix

### 3.1 Technical Escalation Path

```
Level 1: On-Call Engineer
    ↓ (15 min no response or issue unresolved)
Level 2: Senior Platform Engineer / Tech Lead
    ↓ (1 hour no resolution or P1 ongoing)
Level 3: Platform Engineering Manager
    ↓ (2 hours or executive notification needed)
Level 4: IT Director / CTO
    ↓ (Business impact / media attention)
Level 5: Executive Team (CIO / CEO)
```

### 3.2 Escalation Contacts

| Level | Role | Name | Phone | Email | When to Escalate |
|-------|------|------|-------|-------|------------------|
| L1 | On-Call Primary | See Rotation | +213 XX XXX XXXX | oncall@djezzy.dz | First point of contact |
| L1 | On-Call Backup | See Rotation | +213 XX XXX XXXX | oncall-backup@djezzy.dz | No response from primary |
| L2 | Platform Lead | Ahmed B. | +213 XX XXX XXXX | a.benali@djezzy.dz | Complex technical issues |
| L2 | DBA Lead | Karim M. | +213 XX XXX XXXX | k.messaoudi@djezzy.dz | Database issues |
| L2 | Security Lead | Fatima Z. | +213 XX XXX XXXX | f.zitouni@djezzy.dz | Security incidents |
| L3 | Engineering Manager | Youcef K. | +213 XX XXX XXXX | y.kaci@djezzy.dz | P1 > 1 hour, resource needs |
| L4 | IT Director | Rachid H. | +213 XX XXX XXXX | r.haddad@djezzy.dz | Business impact, SLA breach |
| L5 | CIO | Mohamed S. | +213 XX XXX XXXX | m.saidi@djezzy.dz | Executive notification |

### 3.3 Security Escalation Path

For **security-specific incidents**, use this dedicated path:

```
Security Event Detected
    ↓
Security On-Call (immediate assessment)
    ↓
CISO Office (if confirmed threat)
    ↓
Legal Department (if data breach suspected)
    ↓
ANOR Notification (if regulatory requirement)
```

### 3.4 Escalation Triggers

| Trigger | Action | Timeline |
|---------|--------|----------|
| P1 not acknowledged | Auto-escalate to L2 | 5 minutes |
| P1 not resolved | Escalate to L3 | 30 minutes |
| P1 ongoing > 2 hours | Executive notification | 2 hours |
| Security incident confirmed | Notify CISO immediately | Immediate |
| Data breach suspected | Legal + CISO notification | < 1 hour |
| Public-facing outage | Communications team | < 30 minutes |
| Media inquiry received | PR/Legal only | Immediately |

---

## 4. Common Incident Response Procedures

### 4.1 Service Down / Unreachable

**Trigger:** Alert `SOCPlatformDown` or health check failure  
**Severity:** P1 - Critical  
**Target Resolution:** < 15 minutes

#### Diagnosis Steps:

```bash
# Step 1: Verify the alert is valid
curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://soc.djezzy.dz/api/health

# Step 2: Check pod status
kubectl get pods -n soc-platform -o wide

# Expected output: All pods Running, Ready
# If CrashLoopBackOff or Error → Continue diagnosis

# Step 3: Check recent events
kubectl get events -n soc-platform --sort-by='.lastTimestamp' | tail -20

# Step 4: Check pod logs (replace POD_NAME)
kubectl logs -f deployment/soc-platform -n soc-platform --tail=100

# Step 5: Check ingress controller
kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=nginx-ingress

# Step 6: Check node status
kubectl get nodes -o wide
```

#### Remediation Actions:

| Scenario | Action | Command |
|----------|--------|---------|
| Pod in CrashLoopBackOff | Restart deployment | `kubectl rollout restart deployment/soc-platform -n soc-platform` |
| Pod stuck in Pending | Check resources/scheduler | `kubectl describe pod <pod> -n soc-platform` |
| Image pull error | Check registry/auth | `kubectl describe pod <pod> -n soc-platform \| grep Events` |
| OOMKilled | Increase memory limit | Edit deployment → apply |
| Node NotReady | Cordon and reschedule | `kubectl cordon <node>` then delete pods |
| All pods down | Check namespace/config | `kubectl get all -n soc-platform` |

#### Verification:

```bash
# After remediation, verify service recovery
for i in {1..10}; do
  curl -s -o /dev/null -w "Attempt $i: HTTP %{http_code} in %{time_total}s\n" \
    https://soc.djezzy.dz/api/health
  sleep 5
done
```

---

### 4.2 High Latency / Slow Responses

**Trigger:** Alert `HighLatencyP95` or user complaints  
**Severity:** P2 - Warning (escalates to P1 if > 5s)

#### Diagnosis Steps:

```bash
# Step 1: Check current latency metrics
curl -w "\nTime Total: %{time_total}s\nTime Connect: %{time_connect}s\nTTFB: %{time_starttransfer}s\n" \
  -o /dev/null https://soc.djezzy.dz/

# Step 2: Check database query performance
# Connect to PostgreSQL and check slow queries
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
  SELECT query, calls, mean_exec_time, total_exec_time 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC LIMIT 10;
"

# Step 3: Check database connections
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
  SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
"

# Step 4: Check Redis performance
redis-cli -h $REDIS_HOST -a $REDIS_PASS info stats

# Step 5: Check CPU/memory on pods
kubectl top pods -n soc-platform

# Step 6: Check for garbage collection issues
kubectl logs deployment/soc-platform -n soc-platform --tail=500 | grep -i "gc\|memory\|heap"
```

#### Common Causes & Solutions:

| Cause | Symptoms | Solution |
|-------|----------|----------|
| DB slow queries | High P99, DB CPU high | Optimize queries, add indexes |
| Connection pool exhausted | Timeout errors | Increase pool size, check leaks |
| Memory pressure | Latency spikes, GC pauses | Add memory/pods, optimize usage |
| Network latency | Consistent delay | Check cross-AZ traffic, DNS |
| External API calls | Intermittent slowness | Add caching, timeouts, retries |

---

### 4.3 Database Issues

#### 4.3.1 PostgreSQL Connection Exhausted

**Trigger:** Alert `DatabaseConnectionExhausted`  
**Severity:** P1 - Critical

```bash
# Diagnosis
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
  SELECT count(*), state, wait_event_type 
  FROM pg_stat_activity 
  GROUP BY state, wait_event_type;
"

# Find long-running queries
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
  FROM pg_stat_activity 
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  ORDER BY duration DESC;
"

# Emergency: Terminate idle transactions (use carefully!)
# PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
#   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';
# "
```

#### 4.3.2 Replication Lag

**Trigger:** Alert `DatabaseReplicationLagCritical`  
**Severity:** P1 - Critical

```bash
# Check replication status
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d $DB_NAME -c "
  SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes
  FROM pg_stat_replication;
"

# If lag is high and increasing:
# 1. Check replica server load
# 2. Check network between primary/replica
# 3. Consider read traffic reduction on primary
```

---

### 4.4 Authentication Failures / Security Events

**Trigger:** Alert `AuthenticationFailureSpike`, `AdminAccountBruteForce`  
**Severity:** P1 (if admin), P2 (general)

#### Immediate Actions:

```bash
# 1. Identify source IPs of failed attempts
kubectl logs -n ingress-nginx ingress-nginx-controller-0 | \
  grep "401\|403" | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# 2. Check application auth logs
kubectl logs deployment/soc-platform -n soc-platform | \
  grep -i "auth.*fail\|login.*fail\|invalid" | tail -50

# 3. Block malicious IPs at WAF/Firewall level
# (Use Cloudflare dashboard or firewall rules)

# 4. Enable additional logging for investigation
# Consider enabling verbose auth logging temporarily
```

#### Investigation Checklist:
- [ ] Is this a targeted attack or automated scanning?
- [ ] Are admin accounts being targeted?
- [ ] Are credentials potentially compromised?
- [ ] Is there corresponding increase in successful logins?
- [ ] Do source IPs have legitimate business reason?

---

### 4.5 Certificate Expiry

**Trigger:** Alert `TLSCertificateExpiringSoon`  
**Severity:** P1 (< 24 hours), P2 (< 30 days), P3 (> 30 days)

#### For cert-manager managed certificates:

```bash
# Check certificate status
kubectl get certificates -n soc-platform
kubectl describe certificate soc-platform-wildcard -n soc-platform

# Check CertificateRequest
kubectl get certificaterequest -n soc-platform

# Check Order
kubectl get order -n soc-platform

# Force renewal (if stuck)
kubectl delete certificate soc-platform-wildcard -n soc-platform
# Cert-manager should automatically re-create and request new certificate

# Check Issuer status
kubectl describe clusterissuer letsencrypt-production
```

#### For manual certificate renewal:

```bash
# 1. Generate new CSR (if using external CA)
openssl req -new -newkey rsa:2048 -nodes -keyout soc.key -out soc.csr \
  -subj "/C=DZ/O=Djezzy/CN=soc.djezzy.dz"

# 2. Submit CA to get signed certificate
# ... follow CA's process ...

# 3. Create/update Kubernetes secret
kubectl create secret tls soc-tls-secret -n soc-platform \
  --cert=soc.crt --key=soc.key --dry-run=client -o yaml | kubectl apply -f -

# 4. Restart ingress to pick up new cert
kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx
```

#### Verification:

```bash
# Check new certificate details
echo | openssl s_client -connect soc.djezzy.dz:443 -servername soc.djezzy.dz 2>/dev/null | openssl x509 -noout -dates -subject
```

---

## 5. Maintenance Windows

### 5.1 Scheduled Maintenance Procedure

#### Pre-Maintenance (24 hours before):

- [ ] Create change ticket in ITSM system
- [ ] Send maintenance notification email (see templates)
- [ ] Update status page / internal communications
- [ ] Prepare rollback plan
- [ ] Coordinate with dependent teams
- [ ] Backup critical data (database snapshot)

#### Pre-Maintenance (1 hour before):

- [ ] Final verification of maintenance steps
- [ ] Confirm all stakeholders aware
- [ ] Prepare monitoring dashboard for maintenance mode
- [ ] Silence non-critical alerts in Alertmanager
- [ ] Have rollback commands ready

#### During Maintenance:

```bash
# Set maintenance mode annotation
kubectl annotate nodes --all maintenance="true" --overwrite

# Scale down deployment gracefully
kubectl scale deployment/soc-platform -n soc-platform --replicas=0

# Perform maintenance tasks...
# e.g., database upgrade, config changes, etc.

# Scale back up
kubectl scale deployment/soc-platform -n soc-platform --replicas=5

# Wait for pods to be ready
kubectl rollout status deployment/soc-platform -n soc-platform --timeout=300s

# Remove maintenance annotation
kubectl annotate nodes --all maintenance- 2>/dev/null || true
```

#### Post-Maintenance:

- [ ] Verify all services healthy
- [ ] Run smoke tests
- [ ] Check error rates normalized
- [ ] Remove alert silences
- [ ] Send completion notification
- [ ] Document any issues encountered
- [ ] Close change ticket

### 5.2 Standard Maintenance Windows

| Window | Day | Time (Local) | Duration | Type |
|--------|-----|--------------|----------|------|
| Weekly | Sunday | 02:00 - 04:00 | 2 hours | Patching |
| Monthly | 1st Sunday | 02:00 - 06:00 | 4 hours | Major updates |
| Quarterly | As planned | As planned | Variable | Upgrades |

---

## 6. Emergency Change Process

### 6.1 When Emergency Change is Needed

An emergency change is required when:
- Production system is down or severely degraded
- Security vulnerability requires immediate patching
- Critical bug affecting operations
- Regulatory/compliance requirement

### 6.2 Emergency Change Procedure

```
┌─────────────────────────────────────────────────────────────┐
│                  EMERGENCY CHANGE FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. IDENTIFY EMERGENCY                                       │
│     ↓                                                       │
│  2. CONTACT ON-CALL MANAGER (verbal approval OK)             │
│     ↓                                                       │
│  3. CREATE EMERGENCY TICKET (document everything)            │
│     ↓                                                       │
│  4. IMPLEMENT FIX (with peer review if possible)             │
│     ↓                                                       │
│  5. VERIFY RESOLUTION                                        │
│     ↓                                                       │
│  6. COMMUNICATE COMPLETION                                   │
│     ↓                                                       │
│  7. POST-INCIDENT REVIEW (within 48 hours)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Emergency Rollback Criteria

**Immediately rollback if:**
- Error rate increases significantly after change
- New errors appear that didn't exist before
- Performance degrades beyond acceptable thresholds
- Unexpected side effects observed
- Stakeholder requests stop

**Rollback Commands:**

```bash
# Application rollback
kubectl rollout undo deployment/soc-platform -n soc-platform

# Database migration rollback
bunx prisma migrate resolve --rolled-back <migration_name>

# Config change rollback
kubectl rollout history deployment/soc-platform -n soc-platform
kubectl rollout undo deployment/soc-platform -n soc-platform --to-revision=<N>
```

---

## 7. Communication Templates

### 7.1 Initial Incident Notification

```
Subject: [P1] SOC Platform Incident - <Brief Description>

INCIDENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident ID:        INC-YYYYMMDD-001
Severity:           P1 (Critical)
Status:             INVESTIGATING
Start Time:         YYYY-MM-DD HH:MM UTC
Affected Services:   • SOC Platform (soc.djezzy.dz)
                     • API (api.soc.djezzy.dz)
Impact:             • Users unable to access SOC platform
                     • Real-time monitoring unavailable
Current Status:     Investigating root cause
Next Update:        Within 30 minutes or upon significant change
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON-CALL ENGINEER: <Name>
CONTACT: <Phone> | <Email>

RUNBOOK: <Link to relevant runbook>
DASHBOARD: https://grafana.soc.djezzy.dz/d/production-overview
```

### 7.2 Status Update Template

```
Subject: [UPDATE] INC-YYYYMMDD-001 - <Status Summary>

INCIDENT UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident ID:    INC-YYYYMMDD-001
Previous Status: <Previous Status>
New Status:      <Current Status>
Time:            HH:MM UTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:
<Brief update on what has happened since last update>

CURRENT ACTIONS:
• <Action 1>
• <Action 2>

ESTIMATED RESOLUTION: <If known, otherwise "Under investigation">

NEXT UPDATE: <Time or "As warranted">
```

### 7.3 Resolution Template

```
Subject: [RESOLVED] INC-YYYYMMDD-001 - SOC Platform Restored

INCIDENT RESOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident ID:     INC-YYYYMMDD-001
Resolution Time: YYYY-MM-DD HH:MM UTC
Total Duration:  X hours Y minutes
Root Cause:      <Brief description>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY:
<What happened, why it happened, how it was resolved>

IMPACT ASSESSMENT:
• Duration of outage: X hours
• Users affected: ~N (estimated)
• Data loss: None / Minimal / Under assessment

PREVENTIVE ACTIONS:
• <Action 1 with owner and due date>
• <Action 2 with owner and due date>

POST-MORTEM:
Post-incident review scheduled for: <Date/Time>
All stakeholders invited.

On-Call Engineer: <Name>
```

### 7.4 Planned Maintenance Notification

```
Subject: [Scheduled Maintenance] SOC Platform - <Date> <Time Window>

MAINTENANCE NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type:          Scheduled Maintenance
System:        National SOC Platform (soc.djezzy.dz)
Date:          DD MMMM YYYY
Window:        HH:MM - HH:MM (Local Time / UTC+1)
Duration:      Expected X hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REASON:
<Explanation of maintenance being performed>

EXPECTED IMPACT:
• Service unavailable during maintenance window
• Users will see maintenance page
• Active sessions will be terminated

ACTIONS REQUIRED:
• Save work before maintenance window
• Log out before window starts (recommended)

CONTACT DURING MAINTENANCE:
On-Call: <Name> - <Phone>
Chat: #soc-maintenance Slack channel

Status Page: https://status.djezzy.dz
```

---

## 8. Vendor Contact List

### 8.1 Technology Vendors

| Vendor | Service | Support Contact | Contract # | SLA |
|--------|---------|-----------------|------------|-----|
| Cloud Provider | Infrastructure | support@cloud-provider.dz | CONT-XXX | 99.95% |
| DNS Provider | Domain/DNS | dns-support@provider.com | DNS-XXX | 100% |
| Certificate Authority | TLS Certs | cert-support@ca.com | CERT-XXX | N/A |
| WAF/DDoS Provider | Security | security@waf-provider.com | WAF-XXX | < 5min response |
| Database Support | PostgreSQL DBA | dba-support@vendor.com | DB-XXX | 4hr response |

### 8.2 Internal Support Teams

| Team | Responsibility | Contact | Hours |
|------|---------------|---------|-------|
| Network Ops | Firewall, Load Balancer, VPN | netops@djezzy.dz | 24/7 |
| Security Operations | SIEM, Threat Intel, IR | soc-security@djezzy.dz | 24/7 |
| Database Team | PostgreSQL, Backups | dba-team@djezzy.dz | Business hours + On-call |
| Help Desk | User support | helpdesk@djezzy.dz | Business hours |
| Facilities | Physical access, Power | facilities@djezzy.dz | Business hours |

### 8.3 External Contacts

| Organization | Purpose | Contact | Notes |
|--------------|---------|---------|-------|
| ANOR | Regulatory reporting | contact@anor.dz | Telecom regulator |
| Law Enforcement | Cybercrime reporting | cyber@gendarmerie.dz | For major breaches |
| CERT-DZ | National CSIRT | incident@cert.dz | Coordination |
| Cloudflare | DDoS mitigation | via portal | Premium support |

---

## 9. Disaster Recovery Procedures

### 9.1 DR Site Activation

**Trigger:** Complete primary region failure, > 4 hour estimated recovery

#### Activation Checklist:

```bash
# 1. Declare disaster (notify all stakeholders)
# Use emergency communication channel

# 2. Activate DR site infrastructure
# This may involve:
# - Starting standby Kubernetes cluster
# - Promoting read-replica database
# - Updating DNS records (reduce TTL beforehand)
# - Activating DR load balancer

# 3. Database failover (if using managed service)
# For cloud-managed PostgreSQL:
# - Use provider console to promote replica
# - Update connection strings
# - Verify data integrity

# 4. Update DNS (if using different endpoint)
# Example for Route53/cloud DNS:
# Update soc.djezzy.dz → DR site IP

# 5. Verify DR site operation
curl -sf https://dr-soc.djezzy.dz/api/health

# 6. Monitor extensively during DR operation
# Enable additional logging and metrics
```

### 9.2 Recovery Procedures (Return to Primary)

After primary site restoration:

```bash
# 1. Verify primary site fully operational
# Run full pre-flight checks

# 2. Sync data from DR back to primary
# Database: Use replication catch-up or manual sync
# Files/object storage: Sync latest data

# 3. Switch DNS back to primary
# Consider gradual cutover (canary approach)

# 4. Monitor both sites during transition

# 5. Decommission DR active mode once stable
# Return DR site to standby
```

### 9.3 RPO/RTO Targets

| Component | RPO Target | RTO Target | Actual RPO | Actual RTO |
|-----------|------------|------------|------------|------------|
| Application State | N/A | 30 min | | |
| PostgreSQL Database | 15 min | 2 hours | | |
| Redis Cache | 5 min | 30 min | | |
| Configuration | Real-time | 15 min | | |
| Certificates | Real-time | 5 min | | |
| Object Storage | 1 hour | 1 hour | | |

---

## 10. Business Continuity Triggers

### 10.1 BC Plan Activation Criteria

Activate Business Continuity plan when:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| System downtime | > 4 hours | Activate DR procedures |
| Data breach confirmed | Any | Legal + Security + Comms |
| Physical facility inaccessible | Any | Remote work activation |
| Key personnel unavailable | > 50% of team | Cross-train backup |
| Vendor failure | Critical vendor | Activate alternative |
| Cyber attack (ransomware) | Confirmed | Isolate + IR + DR |

### 10.2 Communication During Major Incidents

For incidents requiring business continuity activation:

1. **Immediate (0-30 min):**
   - Executive notification
   - Core team assembly
   - Initial stakeholder comms

2. **Short-term (30 min - 4 hours):**
   - Regular status updates (hourly)
   - Customer notification (if public-facing)
   - Media holding statement (if needed)

3. **Extended (4+ hours):**
   - Workaround implementation
   - Alternative service options
   - Detailed timeline for resolution

---

## 11. Post-Incident Review Process

### 11.1 PIR Requirements

**Mandatory for:**
- All P1 incidents
- Any incident with customer-visible impact
- Security incidents
- Any incident at team lead request

**Timeline:** Within 5 business days of resolution

### 11.2 PIR Template

```
═══════════════════════════════════════════════════════════════
POST-INCIDENT REVIEW
Incident: INC-YYYYMMDD-001
Date: YYYY-MM-DD
Participants: <List>
═══════════════════════════════════════════════════════════════

1. TIMELINE
┌──────────────┬──────────────────────────────────────────────┐
│ Time (UTC)   │ Event                                       │
├──────────────┼──────────────────────────────────────────────┤
│ HH:MM:SS     │ Alert triggered                              │
│ HH:MM:SS     │ On-call acknowledged                        │
│ HH:MM:SS     │ Diagnosis started                           │
│ HH:MM:SS     │ Root cause identified                      │
│ HH:MM:SS     │ Fix implemented                             │
│ HH:MM:SS     │ Service restored                            │
│ HH:MM:SS     │ Incident resolved                           │
└──────────────┴──────────────────────────────────────────────┘

2. IMPACT ASSESSMENT
• Duration: _____
• Users affected: ~_____
• Revenue impact: $_____ (if applicable)
• Reputation risk: Low / Medium / High

3. ROOT CAUSE
Primary Cause: ________________________________________
Contributing Factors:
• ___________________________________________________
• ___________________________________________________

4. WHAT WENT WELL
• ___________________________________________________
• ___________________________________________________

5. WHAT COULD BE IMPROVED
Detection: ___________________________________________
Diagnosis: ____________________________________________
Resolution: ___________________________________________
Communication: ________________________________________

6. ACTION ITEMS
┌────┬────────────────────────────┬──────────┬────────┬──────┐
│ #  │ Action Item                │ Owner    │ Due    │Status│
├────┼────────────────────────────┼──────────┼────────┼──────┤
│ 1  │                            │          │        │      │
│ 2  │                            │          │        │      │
└────┴────────────────────────────┴──────────┴────────┴──────┘

7. LESSONS LEARNED
___________________________________________________________

Prepared by: _________________ Date: _________
Approved by: _________________ Date: _________
```

### 11.3 PIR Follow-up

- [ ] Action items created in tracking system
- [ ] Owners assigned with due dates
- [ ] Runbooks updated based on lessons learned
- [ ] Monitoring/alerting improved if needed
- [ ] Training needs identified and scheduled
- [ ] PIR shared with wider team (sanitize sensitive info first)

---

## Appendix A: Quick Reference Commands

```bash
# === HEALTH CHECKS ===
curl -sf https://soc.djezzy.dz/api/health | jq .
kubectl get pods -n soc-platform
kubectl top pods -n soc-platform

# === LOGS ===
kubectl logs -f deployment/soc-platform -n soc-platform --tail=100
kubectl logs -f -l app.kubernetes.io/name=nginx-ingress -n ingress-nginx

# === SCALING ===
kubectl scale deployment/soc-platform -n soc-platform --replicas=N
kubectl autoscale deployment/soc-platform -n soc-platform --min=5 --max=30 --cpu-percent=65

# === ROLLBACK ===
kubectl rollout undo deployment/soc-platform -n soc-platform
kubectl rollout history deployment/soc-platform -n soc-platform

# === DEBUGGING ===
kubectl exec -it deploy/soc-platform -n soc-platform -- sh
kubectl port-forward svc/soc-platform 3000:80 -n soc-platform

# === DATABASE ===
PGPASSWORD=$PASS psql -h $HOST -U $USER -d $DB -c "SELECT version();"
kubectl exec -it postgres-pod -- psql -U $USER -d $DB

# === CERTIFICATES ===
echo | openssl s_client -connect soc.djezzy.dz:443 -servername soc.djezzy.dz 2>/dev/null | openssl x509 -noout -dates -subject

# === NETWORK DEBUG ===
kubectl run debug --image=nicolaka/netshoot -it --rm -- /bin/bash
kubectl run curl-debug --image=curlimages/curl:latest -it --rm -- curl -v https://soc.djezzy.dz/api/health
```

## Appendix B: Useful Dashboard Links

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Production Overview | /d/production-overview | Main ops dashboard |
| Application Detail | /d/application-detail | App-level metrics |
| Database Overview | /d/database-overview | PostgreSQL metrics |
| Infrastructure | /d/infrastructure | K8s cluster health |
| Security Events | /d/security-events | Security overview |
| Alerts History | /d/alerts-history | Historical alerts |

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | SOC Platform Team | Initial production runbook |

---

*End of Production Runbook*
