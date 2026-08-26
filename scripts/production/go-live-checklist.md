# National SOC Platform - Go-Live Checklist
## Djezzy Production Deployment | Phase 10

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Classification:** Confidential - Internal Use Only  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Pre-Launch Security Review](#2-pre-launch-security-review)
3. [Performance Baseline Requirements](#3-performance-baseline-requirements)
4. [Backup Verification Steps](#4-backup-verification-steps)
5. [Failover Testing Scenarios](#5-failover-testing-scenarios)
6. [Runbook Readiness Criteria](#6-runbook-readiness-criteria)
7. [Training Completion Requirements](#7-training-completion-requirements)
8. [Stakeholder Sign-off Sections](#8-stakeholder-sign-off-sections)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Post-Launch Monitoring Plan](#10-post-launch-monitoring-plan)
11. [Hypercare Period Activities](#11-hypercare-period-activities)

---

## 1. Executive Summary

### Purpose
This document provides a comprehensive checklist for the production go-live of the **National SOC Platform** for Djezzy Algeria. It ensures all security, operational, and compliance requirements are met before exposing the system to production traffic.

### Scope
- **Platform:** National SOC Platform (Next.js 16, PostgreSQL, Redis, Kubernetes)
- **Environment:** Production (soc.djezzy.dz)
- **Region:** Algeria (Africa/Algiers timezone)
- **Compliance Framework:** ANOR, ISO 27001, NIST CSF

### Go-Live Timeline
| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Pre-flight Checks Complete | TBD | ⬜ Pending |
| Security Sign-off | TBD | ⬜ Pending |
| Stakeholder Approval | TBD | ⬜ Pending |
| Production Cutover | TBD | ⬜ Pending |
| Hypercare Start | TBD | ⬜ Pending |

---

## 2. Pre-Launch Security Review

### 2.1 Infrastructure Security

| # | Check Item | Status | Evidence Location | Verified By | Date |
|---|-----------|--------|-------------------|-------------|------|
| 2.1.1 | Kubernetes Pod Security Standards enforced | ⬜ | k8s/pss-policy.yaml | | |
| 2.1.2 | NetworkPolicy default-deny-all applied | ⬜ | k8s/network-policies.yaml | | |
| 2.1.3 | ServiceAccount token auto-mount disabled | ⬜ | deployment.yaml | | |
| 2.1.4 | ReadOnlyRootFilesystem enabled on all pods | ⬜ | deployment.yaml | | |
| 2.1.5 | Capabilities dropped (ALL) for containers | ⬜ | deployment.yaml | | |
| 2.1.6 | No privileged containers in cluster | ⬜ | `kubectl get pods` audit | | |
| 2.1.7 | Image pull policy set to Always | ⬜ | deployment.yaml | | |
| 2.1.8 | Container images signed/verified | ⬜ | Registry logs | | |
| 2.1.9 | Resource quotas configured per namespace | ⬜ | k8s/resourcequotas.yaml | | |
| 2.1.10 | Seccomp/AppArmor profiles configured | ⬜ | pod spec | | |

### 2.2 Application Security

| # | Check Item | Status | Evidence Location | Verified By | Date |
|---|-----------|--------|-------------------|-------------|------|
| 2.2.1 | TLS 1.2+ enforced (TLS 1.3 preferred) | ⬜ | nginx config / cert check | | |
| 2.2.2 | Valid SSL certificate installed | ⬜ | Certificate details | | |
| 2.2.3 | HSTS header configured (max-age ≥ 6 months) | ⬜ | Security headers scan | | |
| 2.2.4 | Content-Security-Policy implemented | ⬜ | CSP header output | | |
| 2.2.5 | X-Frame-Options set to SAMEORIGIN | ⬜ | Header response | | |
| 2.2.6 | Rate limiting active on API endpoints | ⬜ | nginx config | | |
| 2.2.7 | Authentication brute-force protection | ⬜ | Auth config | | |
| 2.2.8 | Session management secure (HttpOnly, Secure) | ⬜ | Cookie inspection | | |
| 2.2.9 | CSRF protection implemented | ⬜ | Code review | | |
| 2.2.10 | Input validation on all endpoints | ⬜ | Pen test results | | |
| 2.2.11 | SQL injection protection (Prisma ORM) | ⬜ | Code review | | |
| 2.2.12 | XSS prevention in place | ⬜ | SAST/DAST results | | |
| 2.2.13 | Dependencies scanned (no critical vulns) | ⬜ | npm audit report | | |
| 2.2.14 | Secrets not in code/repository | ⬜ | Git history scan | | |
| 2.2.15 | Environment variables properly secured | ⬜ | K8s secrets config | | |

### 2.3 Database Security

| # | Check Item | Status | Evidence Location | Verified By | Date |
|---|-----------|--------|-------------------|-------------|------|
| 2.3.1 | PostgreSQL SSL/TLS connections required | ⬜ | pg_hba.conf | | |
| 2.3.2 | Strong password policy (SCRAM-SHA-256) | ⬜ | postgresql.conf | | |
| 2.3.3 | Connection limits per user role | ⬜ | Role configuration | | |
| 2.3.4 | Audit logging enabled (pgaudit) | ⬜ | Audit config | | |
| 2.3.5 | Row-Level Security on sensitive tables | ⬜ | RLS policies | | |
| 2.3.6 | Encryption at rest enabled (TDE/pgcrypto) | ⬜ | DB settings | | |
| 2.3.7 | Backup encryption verified | ⬜ | Backup test | | |
| 2.3.8 | Public schema privileges revoked | ⬜ | Permission audit | | |
| 2.3.9 | Extension installation controlled | ⬜ | Extension policy | | |
| 2.3.10 | Database firewall rules configured | ⬜ | Network ACLs | | |

### 2.4 Penetration Testing Results

| Test Type | Status | Critical | High | Medium | Low | Report Date |
|----------|--------|----------|------|--------|-----|-------------|
| External Network Penetration | ⬜ | 0 | 0 | 0 | 0 | |
| Web Application Assessment | ⬜ | 0 | 0 | 0 | 0 | |
| API Security Testing | ⬜ | 0 | 0 | 0 | 0 | |
| Social Engineering | ⬜ | N/A | N/A | N/A | N/A | |
| Physical Security | ⬜ | N/A | N/A | N/A | N/A | |

**All Critical and High findings MUST be remediated before go-live.**

---

## 3. Performance Baseline Requirements

### 3.1 Application Performance Targets

| Metric | Target | Threshold | Measured Value | Status |
|--------|--------|-----------|----------------|--------|
| Page Load Time (P50) | < 2s | < 3s | ___ ms | ⬜ |
| Page Load Time (P95) | < 4s | < 6s | ___ ms | ⬜ |
| Page Load Time (P99) | < 8s | < 12s | ___ ms | ⬜ |
| API Response Time (P50) | < 200ms | < 500ms | ___ ms | ⬜ |
| API Response Time (P95) | < 500ms | < 1000ms | ___ ms | ⬜ |
| API Response Time (P99) | < 1500ms | < 3000ms | ___ ms | ⬜ |
| Time to First Byte (TTFB) | < 300ms | < 500ms | ___ ms | ⬜ |
| WebSocket Latency | < 100ms | < 200ms | ___ ms | ⬜ |

### 3.2 Database Performance Targets

| Metric | Target | Threshold | Measured Value | Status |
|--------|--------|-----------|----------------|--------|
| Query P95 Response Time | < 100ms | < 200ms | ___ ms | ⬜ |
| Connection Pool Utilization | < 70% | < 85% | ___ % | ⬜ |
| Active Connections | < 80% max | < 90% max | ___ | ⬜ |
| Replication Lag | < 1s | < 5s | ___ ms | ⬜ |
| Index Hit Ratio | > 99% | > 95% | ___ % | ⬜ |
| Cache Hit Ratio | > 95% | > 90% | ___ % | ⬜ |

### 3.3 Infrastructure Performance

| Metric | Target | Threshold | Measured Value | Status |
|--------|--------|-----------|----------------|--------|
| CPU Utilization (avg) | < 60% | < 80% | ___ % | ⬜ |
| Memory Utilization (avg) | < 70% | < 85% | ___ % | ⬜ |
| Disk I/O Wait | < 10ms | < 20ms | ___ ms | ⬜ |
| Network Throughput | < 70% capacity | < 85% capacity | ___ % | ⬜ |
| Pod Startup Time | < 30s | < 60s | ___ s | ⬜ |
| Auto-scale Trigger Time | < 2min | < 5min | ___ s | ⬜ |

### 3.4 Load Testing Summary

| Scenario | Concurrent Users | RPS Target | Pass Rate | Avg Response | Status |
|----------|------------------|------------|-----------|--------------|--------|
| Normal Load | 500 | 1000 | > 99% | < 300ms | ⬜ |
| Peak Load | 2000 | 4000 | > 98% | < 800ms | ⬜ |
| Stress Test | 5000 | 10000 | > 95% | < 2000ms | ⬜ |
| Soak Test (24h) | 1000 | 2000 | > 99.5% | < 500ms | ⬜ |
| Spike Test | 100→5000 (30s) | - | > 95% | < 3000ms | ⬜ |

---

## 4. Backup Verification Steps

### 4.1 Backup Configuration Validation

| # | Check Item | Status | Details | Verified By | Date |
|---|-----------|--------|---------|-------------|------|
| 4.1.1 | Automated backup schedule configured | ⬜ | Schedule: _______ | | |
| 4.1.2 | Full backup frequency verified | ⬜ | Every: _______ | | |
| 4.1.3 | Incremental backup frequency | ⬜ | Every: _______ | | |
| 4.1.4 | Backup retention period set | ⬜ | Retain: _______ | | |
| 4.1.5 | Off-site replication active | ⬜ | Location: _______ | | |
| 4.1.6 | Backup encryption enabled | ⬜ | Algorithm: AES-256 | | |
| 4.1.7 | Backup integrity checks scheduled | ⬜ | Frequency: _______ | | |
| 4.1.8 | Backup monitoring/alerting configured | ⬜ | Alert channel: _______ | | |

### 4.2 Backup Restoration Testing

| # | Test Case | Status | Result | Execution Date | Executed By |
|---|-----------|--------|--------|----------------|-------------|
| 4.2.1 | Full database restoration | ⬜ | PASS/FAIL | | |
| 4.2.2 | Point-in-time recovery (PITR) | ⬜ | PASS/FAIL | | |
| 4.2.3 | Single table restoration | ⬜ | PASS/FAIL | | |
| 4.2.4 | Configuration restore | ⬜ | PASS/FAIL | | |
| 4.2.5 | Certificate/key restore | ⬜ | PASS/FAIL | | |
| 4.2.6 | Cross-environment restore test | ⬜ | PASS/FAIL | | |
| 4.2.7 | RTO verification (< 4 hours) | ⬜ | Time: _____ | | |
| 4.2.8 | RPO verification (< 1 hour) | ⬜ | Data loss: _____ | | |

### 4.3 Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

| Component | RPO Target | RTO Target | Tested RPO | Tested RTO | Status |
|-----------|------------|------------|------------|------------|--------|
| Primary Database | 15 min | 2 hours | | | ⬜ |
| Redis Cache | 5 min | 30 min | | | ⬜ |
| Application Config | Real-time | 15 min | | | ⬜ |
| Certificates/Keys | Real-time | 5 min | | | ⬜ |
| Log Data | 1 hour | 4 hours | | | ⬜ |

---

## 5. Failover Testing Scenarios

### 5.1 High Availability Tests

| # | Scenario | Expected Behavior | Actual Result | Status | Date |
|---|----------|-------------------|---------------|--------|------|
| 5.1.1 | Pod crash/restart | Automatic restart within 30s | | ⬜ | |
| 5.1.2 | Node failure | Pods reschedule to healthy nodes | | ⬜ | |
| 5.1.3 | Availability Zone failure | Failover to secondary AZ | | ⬜ | |
| 5.1.4 | Primary database failover | Automatic promotion of replica | | ⬜ | |
| 5.1.5 | Redis master failure | Sentinel promotes replica | | ⬜ | |
| 5.1.6 | Ingress controller failure | Secondary ingress takes over | | ⬜ | |
| 5.1.7 | DNS resolution failure | Fallback DNS servers used | | ⬜ | |
| 5.1.8 | Certificate expiry (simulated) | Auto-renewal triggers | | ⬜ | |

### 5.2 Disaster Recovery Tests

| # | Scenario | RTO Target | Actual RTO | Data Loss | Status | Date |
|---|----------|------------|------------|-----------|--------|------|
| 5.2.1 | Region failure | < 4 hours | | | ⬜ | |
| 5.2.2 | Complete data center loss | < 4 hours | | | ⬜ | |
| 5.2.3 | Ransomware attack recovery | < 8 hours | | | ⬜ | |
| 5.2.4 | Corrupted database recovery | < 2 hours | | | ⬜ | |
| 5.2.5 | Configuration drift recovery | < 1 hour | | | ⬜ | |

### 5.3 Chaos Engineering Tests

| Test Type | Tool Used | Frequency | Last Run | Result | Notes |
|-----------|-----------|-----------|----------|--------|-------|
| Pod Kill | Chaos Mesh/Litmus | Weekly | | ⬜ | |
| Network Latency | Toxiproxy | Bi-weekly | | ⬜ | |
| CPU Starvation | Chaos Blade | Monthly | | ⬜ | |
| Disk Fill Simulation | Custom | Quarterly | | ⬜ | |
| DNS Failure | Chaos Mesh | Monthly | | ⬜ | |

---

## 6. Runbook Readiness Criteria

### 6.1 Required Runbooks

| # | Runbook Name | Owner | Status | Last Reviewed | Link |
|---|-------------|-------|--------|---------------|------|
| 6.1.1 | On-Call Procedures | SOC Ops | ⬜ | | |
| 6.1.2 | Incident Response (P1/P2) | SOC Manager | ⬜ | | |
| 6.1.3 | Escalation Matrix | SOC Lead | ⬜ | | |
| 6.1.4 | Service Degradation | Platform Team | ⬜ | | |
| 6.1.5 | Database Incident | DBA Team | ⬜ | | |
| 6.1.6 | Security Incident | Security Team | ⬜ | | |
| 6.1.7 | Certificate Renewal | DevOps | ⬜ | | |
| 6.1.8 | Deployment Rollback | Release Team | ⬜ | | |
| 6.1.9 | Backup Restoration | DBA Team | ⬜ | | |
| 6.1.10 | DDoS Response | Security/Ops | ⬜ | | |
| 6.1.11 | Maintenance Procedures | Platform Team | ⬜ | | |
| 6.1.12 | Vendor Escalation | Procurement | ⬜ | | |

### 6.2 Runbook Quality Criteria

Each runbook must include:
- [ ] Clear trigger conditions and severity levels
- [ ] Step-by-step remediation instructions
- [ ] Required permissions and access
- [ ] Commands/scripts ready to execute
- [ ] Rollback steps if remediation fails
- [ ] Communication templates
- [ ] Escalation contacts and timing
- [ ] Related runbooks cross-references
- [ ] Post-incident review requirements

---

## 7. Training Completion Requirements

### 7.1 Training Matrix

| Role | Required Trainings | Completion % | Status |
|------|-------------------|--------------|--------|
| **SOC Analyst** | Platform Overview, Dashboard Usage, Alert Triage, Incident Handling | ___% | ⬜ |
| **SOC Responder** | All Analyst + Advanced Investigation, Threat Hunting, Playbooks | ___% | ⬜ |
| **SOC Manager** | All Responder + Reporting, Escalation, Compliance | ___% | ⬜ |
| **Platform Engineer** | Architecture, Deployment, Monitoring, Troubleshooting | ___% | ⬜ |
| **DBA** | Database Architecture, Backup/Restore, Performance Tuning | ___% | ⬜ |
| **Security Engineer** | Hardening, Vulnerability Management, Pen Test Review | ___% | ⬜ |

### 7.2 Training Sessions Conducted

| Session | Topic | Date | Attendees | Duration | Materials |
|---------|-------|------|-----------|----------|-----------|
| | Platform Overview | | | | ⬜ |
| | Security Operations Workflow | | | | ⬜ |
| | Incident Response Process | | | | ⬜ |
| | Dashboard & Analytics | | | | ⬜ |
| | System Administration | | | | ⬜ |
| | Emergency Procedures | | | | ⬜ |
| | Hands-on Lab Exercises | | | | ⬜ |

### 7.3 Competency Verification

| Team Member | Role | Theory Exam | Practical Test | Certified | Date |
|-------------|------|-------------|----------------|-----------|------|
| | | ⬜ PASS/FAIL | ⬜ PASS/FAIL | ⬜ Yes/No | |
| | | ⬜ PASS/FAIL | ⬜ PASS/FAIL | ⬜ Yes/No | |
| | | ⬜ PASS/FAIL | ⬜ PASS/FAIL | ⬜ Yes/No | |

---

## 8. Stakeholder Sign-off Sections

### 8.1 Technical Sign-off

| Role | Name | Signature | Date | Comments |
|------|------|-----------|------|----------|
| **Platform Architect** | | | | |
| **Security Architect** | | | | |
| **Database Administrator** | | | | |
| **DevOps Lead** | | | | |
| **Network Engineer** | | | | |

### 8.2 Business Sign-off

| Role | Name | Signature | Date | Comments |
|------|------|-----------|------|----------|
| **SOC Director** | | | | |
| **IT Director** | | | | |
| **CISO / Security Head** | | | | |
| **Business Owner** | | | | |
| **Project Sponsor** | | | | |

### 8.3 Compliance Sign-off

| Role | Name | Signature | Date | Comments |
|------|------|-----------|------|----------|
| **Compliance Officer** | | | | |
| **ANOR Liaison** | | | | |
| **Data Protection Officer** | | | | |
| **Internal Audit** | | | | |

### 8.4 Pre-Go-Live Gate Review Meeting

**Meeting Date:** _______________  
**Time:** _______________  
**Location/Virtual:** _______________

#### Agenda Items:
1. Security assessment summary
2. Performance baseline review
3. Backup/DR verification status
4. Runbook completeness review
5. Training completion status
6. Open risks and mitigations
7. Hypercare plan review
8. Communication plan confirmation

#### Decision:

☐ **APPROVED** - Proceed with go-live as scheduled  
☐ **CONDITIONAL** - Approved with following conditions:  
   _________________________________________________  
☐ **DEFERRED** - Do not proceed. Reasons:  
   _________________________________________________

**Decision Maker:** ____________________ **Date:** ____________

---

## 9. Rollback Procedures

### 9.1 Pre-Rollback Checklist

- [ ] Identify rollback trigger/failure condition
- [ ] Document current state (screenshots, metrics, logs)
- [ ] Notify stakeholders of impending rollback
- [ ] Verify backup availability for data rollback
- [ ] Confirm rollback window (maintenance mode acceptable?)
- [ ] Prepare communication for end users

### 9.2 Application Rollback Procedure

```bash
# Step 1: Verify current version
kubectl rollout history deployment/soc-platform -n soc-platform

# Step 2: Scale down gracefully (optional - for clean rollback)
kubectl scale deployment/soc-platform -n soc-platform --replicas=0

# Step 3: Rollback to previous version
kubectl rollout undo deployment/soc-platform -n soc-platform

# Step 4: Monitor rollout status
kubectl rollout status deployment/soc-platform -n soc-platform --timeout=300s

# Step 5: Verify health endpoints
curl -k https://soc.djezzy.dz/api/health

# Step 6: Check pod status
kubectl get pods -n soc-platform -l app.kubernetes.io/name=soc-platform
```

### 9.3 Database Rollback Procedure

```bash
# For schema migrations:
# Step 1: Identify migration to rollback
bunx prisma migrate status

# Step 2: Resolve migration (creates rollback)
bunx prisma migrate resolve --rolled-back <migration_name>

# Step 3: If data rollback needed:
psql -h postgres-host -U soc_admin -d soc_platform < rollback_script.sql

# Step 4: Verify data integrity
psql -c "SELECT COUNT(*) FROM incidents;" soc_platform
```

### 9.4 Full Environment Rollback (Disaster Recovery)

| Step | Action | Command/Reference | ETA | Owner |
|------|--------|-------------------|-----|-------|
| 1 | Declare incident | Use PagerDuty/Opsgenie | Immediate | On-call |
| 2 | Activate DR site | Follow DR Runbook | 5 min | Infra Lead |
| 3 | Redirect DNS (if needed) | DNS provider console | 5 min | Net Admin |
| 4 | Restore database from backup | Backup script | 30-120 min | DBA |
| 5 | Verify application health | Health checks | 10 min | Platform |
| 6 | Notify stakeholders | Comms template | 15 min | Manager |
| 7 | Monitor for issues | Dashboards | Continuous | On-call |

### 9.5 Rollback Success Criteria

- [ ] Application responding to health checks
- [ ] Database connectivity verified
- [ ] Key user workflows functional
- [ ] Error rates below threshold
- [ ] No data corruption detected
- [ ] Stakeholders notified of completion

---

## 10. Post-Launch Monitoring Plan

### 10.1 Monitoring Dashboard Access

| Dashboard | URL | Purpose | Refresh Interval |
|-----------|-----|---------|------------------|
| Production Overview | grafana.soc.djezzy.dz/d/production | System-wide health | 30s |
| Application Metrics | grafana.soc.djezzy.dz/d/application | App performance | 15s |
| Database Metrics | grafana.soc.djezzy.dz/d/database | DB performance | 15s |
| Infrastructure | grafana.soc.djezzy.dz/d/infrastructure | K8s resources | 30s |
| Security Events | grafana.soc.djezzy.dz/d/security | Security overview | 60s |
| Certificate Status | grafana.soc.djezzy.dz/d/certificates | TLS monitoring | 5m |

### 10.2 Key Metrics to Monitor (First 72 Hours)

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| HTTP 5xx Errors | > 1% | > 5% | Investigate immediately |
| P95 Latency | > 2s | > 5s | Scale or investigate |
| Error Rate | > 0.5% | > 2% | Check logs, rollback? |
| Active Users | - | < expected | Check accessibility |
| DB Connections | > 70% | > 90% | Scale pool or DB |
| Memory Usage | > 75% | > 90% | Scale pods |
| CPU Usage | > 70% | > 90% | Scale pods |
| Disk Space | > 75% | > 90% | Cleanup or expand |
| Certificate Expiry | < 30 days | < 7 days | Renew immediately |

### 10.3 Alert Routing

| Severity | Notification Channel | Response Time | Escalation |
|----------|---------------------|---------------|------------|
| P1 - Critical | PagerDuty + Phone + Slack | 5 minutes | 15 minutes |
| P2 - High | PagerDuty + Slack | 15 minutes | 1 hour |
| P3 - Medium | Slack + Email | 1 hour | 4 hours |
| P4 - Low | Email only | Next business day | - |

### 10.4 Logging & Observability

| Log Source | Access Method | Retention | SIEM Integration |
|------------|---------------|-----------|------------------|
| Application Logs | ELK/Kibana | 30 days hot, 1 year cold | ✅ Enabled |
| Access Logs | NGINX → ELK | 90 days | ✅ Enabled |
| Database Logs | PG → ELK | 90 days | ✅ Enabled |
| Audit Logs | Dedicated storage | 7 years (compliance) | ✅ Enabled |
| K8s Events | Prometheus/Grafana | 7 days | Optional |
| Security Events | SIEM Platform | 7 years | ✅ Enabled |

---

## 11. Hypercare Period Activities

### 11.1 Hypercare Schedule

**Duration:** 14 days from go-live  
**Start Date:** _______________  
**End Date:** _______________

### 11.2 Coverage Plan

| Week | Days | Hours (Local Time) | Primary Support | Backup Support |
|------|------|-------------------|-----------------|----------------|
| Week 1 | Mon-Fri | 07:00 - 20:00 | | |
| Week 1 | Sat-Sun | 08:00 - 18:00 | | |
| Week 2 | Mon-Fri | 08:00 - 18:00 | | |
| Week 2 | Sat-Sun | On-call only | | |

### 11.3 Daily Standup Agenda (During Hypercare)

**Time:** 09:00 AM daily (during hypercare)  
**Attendees:** Core team, On-call engineer

1. **System Health Summary** (5 min)
   - Overnight incidents/issues
   - Current system status (green/yellow/red)
   - Key metrics vs. baseline

2. **Issues Review** (10 min)
   - Open bugs/tickets from last 24h
   - Customer-reported issues
   - Blockers or workarounds needed

3. **Action Items** (5 min)
   - Items from previous day - status update
   - New action items with owners
   - Escalations required

4. **Risk Review** (5 min)
   - Emerging concerns
   - Capacity/planning needs
   - Communication updates

### 11.4 Hypercare Exit Criteria

Before exiting hypercare period, confirm:

- [ ] No P1/P2 incidents in last 72 hours
- [ ] Error rate below 0.1% for 7 consecutive days
- [ ] Performance within baseline targets (±10%)
- [ ] All critical bugs resolved or have workaround
- [ ] Documentation updated with lessons learned
- [ ] Knowledge base articles created for common issues
- [ ] Team comfortable with operations
- [ ] Handoff to BAU team completed
- [ ] Post-go-live retrospective scheduled

### 11.5 Post-Hypercare Transition

| Activity | Owner | Due Date | Status |
|----------|-------|----------|--------|
| Hypercare retrospective | SOC Manager | End of Week 2 | ⬜ |
| Lessons learned document | Tech Lead | End of Week 3 | ⬜ |
| Runbook updates based on experience | Platform Team | End of Week 3 | ⬜ |
| BAU handoff documentation | SOC Manager | End of Week 3 | ⬜ |
| Support model transition | IT Director | End of Week 4 | ⬜ |

---

## Appendices

### Appendix A: Contact Directory

| Role | Name | Phone | Email | Slack |
|------|------|-------|-------|-------|
| On-Call Engineer (Primary) | | | | @ |
| On-Call Engineer (Backup) | | | | @ |
| SOC Manager | | | | @ |
| Platform Lead | | | | @ |
| DBA on-call | | | | @ |
| Security On-Call | | | | @ |
| Vendor Support (K8s) | | | | |
| Vendor Support (DB) | | | | |
| Executive Escalation | | | | |

### Appendix B: Emergency Contacts

| Situation | Contact | Number | Available |
|-----------|---------|--------|-----------|
| Production Outage | On-Call | | 24/7 |
| Security Incident | CISO Office | | Business hours |
| Executive Notification | CIO Office | | Business hours |
| Press/Media Inquiry | Communications | | Business hours |
| Legal Emergency | Legal Dept | | Business hours |

### Appendix C: Useful Commands Quick Reference

```bash
# Check overall system health
curl -s https://soc.djezzy.dz/api/health | jq .

# Check pod status
kubectl get pods -n soc-platform -o wide

# View recent logs
kubectl logs -f deployment/soc-platform -n soc-platform --tail=100

# Check error rates
kubectl exec -it deploy/soc-platform -- cat /app/logs/error.log | tail -50

# Database connectivity test
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $USER -d soc_platform -c "SELECT 1;"

# Redis connectivity test
redis-cli -h $REDIS_HOST -a $REDIS_PASS ping

# Certificate check
echo | openssl s_client -connect soc.djezzy.dz:443 2>/dev/null | openssl x509 -noout -dates

# Force new deployment
kubectl rollout restart deployment/soc-platform -n soc-platform
```

### Appendix D: Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | SOC Platform Team | Initial version for go-live |

---

**Document Classification:** CONFIDENTIAL  
**Distribution:** Djezzy SOC Team, IT Leadership, Security Team  
**Review Cycle:** Before each major release

---

*End of Go-Live Checklist*
