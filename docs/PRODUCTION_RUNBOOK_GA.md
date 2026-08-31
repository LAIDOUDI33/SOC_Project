# CyberSOC Platform - Production Operations Runbook
## GA Deployment Operational Procedures

**Version:** 1.0-GA  
**Effective Date:2026-08-26  
**Classification:** INTERNAL - OPERATIONAL  

---

## 1. System Overview

### Architecture Summary
```
┌─────────────────────────────────────────────────────────────────┐
│                    CYBERSOC PLATFORM (GA)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ Frontend  │────│ API GW   │────│ Services │                  │
│  │ (Next.js) │    │(Nginx)   │    │ (Node.js)│                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│       │               │               │                         │
│       └───────────────┼───────────────┘                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │   │
│  │  │PostgreSQL│  │ Redis   │  │ Kafka   │  │ ES      │     │   │
│  │  │ HA (3+2)│  │ Cluster │  │9-broker │  │9-node   │     │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  MONITORING                               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │   │
│  │  │Prometheus│  │ Grafana │  │ Jaeger  │                   │   │
│  │  └─────────┘  └─────────┘  └─────────┘                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key URLs (Production)
| Service | URL | Authentication |
|---------|-----|----------------|
| Main Application | https://soc.djezzy.dz | SSO/LDAP |
| API Gateway | https://api-soc.djezzy.dz | JWT Bearer |
| Grafana Dashboards | https://grafana.soc.djezzy.dz | SSO |
| Prometheus | Internal only | Basic Auth |
| AlertManager | Internal only | Web UI |

---

## 2. Daily Operations Checklist

### Morning Checks (09:00 ALGERIA Time)

- [ ] **System Health Dashboard** - Check Grafana SOC Overview
  - All components GREEN
  - No active P1/P2 alerts
  
- [ ] **Security Events Review**
  - Overnight alerts triaged
  - No critical incidents escalated
  
- [ ] **Backup Verification**
  - Nightly backup completed successfully
  - Backup integrity check passed

- [ ] **Capacity Metrics**
  - CPU < 70% across cluster
  - Memory < 80%
  - Disk space > 30% free

- [ ] **SSL/TLS Certificate Status**
  - All certs valid (>30 days to expiry)
  - No cert renewal errors

### End-of-Day Checks (18:00)

- [ ] Incident summary review
- [ ] Pending tasks documented for next shift
- [ ] Runbook updates if procedures changed
- [ ] Team handoff notes prepared

---

## 3. Incident Response Procedures

### Severity Levels

| Level | Name | Response Time | Escalation | Example |
|-------|------|---------------|------------|---------|
| P1 | Critical | 5 min | Immediate CTO | System down, data breach |
| P2 | High | 15 min | 30 min to Mgmt | Major feature broken |
| P3 | Medium | 1 hour | Next business day | Degraded performance |
| P4 | Low | 24 hours | Weekly review | Minor issues |

### P1 Incident Procedure

```bash
# 1. Declare incident
incident declare --severity=P1 --title="Brief description"

# 2. Assemble response team
# - On-call engineer (automatic via PagerDuty)
# - Security Lead (auto-escalate)
# - CTO (notify after 5 min)

# 3. Create bridge call
zoom create --topic="P1: <incident title>" 

# 4. Initial assessment (10 min)
- What is the impact?
- How many users affected?
- Is there a security component?
- Any data exposure?

# 5. Mitigation options
- Rollback to previous version?
- Failover to DR site?
- Implement emergency fix?

# 6. Communication cadence
- T+0: Initial alert
- T+15: Status update
- T+30: ETA or escalation
- T+60: Resolution or war room
```

---

## 4. Maintenance Procedures

### Scheduled Maintenance Window

**Standard Window:** Sunday 02:00-06:00 Algeria Time  
**Emergency Maintenance:** Any time with CTO approval + 2-hour notice  

### Pre-Maintenance Checklist

```bash
#!/bin/bash
# pre_maintenance.sh

echo "=== Pre-Maintenance Checklist ==="

# 1. Notify stakeholders
slack-post "#soc-alerts" "⚠️  Maintenance starting in 30 minutes"

# 2. Verify backups current
./scripts/production/verify-backup.sh --detailed

# 3. Disable alerting (maintenance mode)
prometheus-silence add --duration=4h --comment="Scheduled maintenance" --author="$USER"

# 4. Drain connections gracefully
kubectl drain node-$NODE --ignore-daemonsets --delete-emptydir-data --force --grace-period=300

# 5. Record pre-maintenance state
kubectl get pods -n cybersoc -o wide > /tmp/pre-maintenance-pods.txt
kubectl get pvc -n cybersoc > /tmp/pre-maintenance-pvc.txt

echo "✅ Ready for maintenance"
```

### Post-Maintenance Validation

```bash
#!/bin/bash
# post_maintenance.sh

echo "=== Post-Maintenance Validation ==="

# 1. Re-enable alerting
prometheus-silence expire-all

# 2. Health checks
curl -sf https://soc.djezzy.dz/health | jq .
curl -sf https://api-soc.djezzy.dz/health | jq .

# 3. Pod status
kubectl get pods -n cybersoc -l app=soc-platform

# 4. Database connectivity test
psql "$DATABASE_URL" -c "SELECT NOW();"

# 5. Test user-facing features
# Login, view dashboard, create incident, run report

# 6. Notify completion
slack-post "#soc-deployments" "✅ Maintenance complete - all systems operational"

echo "✅ Post-maintenance validation complete"
```

---

## 5. Security Operations

### Daily Security Tasks

1. **Threat Intelligence Review**
   - Check MISP for new IOCs relevant to telecom/SOC
   - Update detection rules if needed

2. **Alert Triage**
   - Review all HIGH/CRITICAL alerts from last 24 hours
   - False positive tuning
   - Escalate legitimate threats

3. **Access Audit**
   - New user access requests processed
   - Terminated user access revoked
   - Privileged access reviewed

4. **Vulnerability Scan Review**
   - New CVEs affecting our stack?
   - Patch priority assessment

### Security Incident Quick Reference

```bash
# Suspected breach? IMMEDIATELY:
1. Isolate affected system: kubectl delete pod <pod-name> -n cybersoc
2. Preserve evidence: kubectl logs <pod> > /evidence/pod-logs.txt
3. Notify Security Lead: pagerduty trigger security-lead
4. Document timeline: Start incident log
5. DO NOT reboot/shutdown - preserves memory forensics

# Data exfiltration suspected?
1. Check network flows: kubectl exec <pod> -- netstat -tulpn
2. Review audit logs: query audit_logs WHERE action = 'data_export'
3. Enable enhanced logging: Set LOG_LEVEL=debug temporarily
4. Engage IR team if confirmed
```

---

## 6. Backup & Recovery Operations

### Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database Full | Daily 02:00 | 90 days | Encrypted cloud storage |
| Database Incremental | Every 6 hours | 7 days | Local + cloud |
| ConfigMaps/Secrets | On change | 30 days | Git + Vault |
| Logs (ELK) | Continuous | 2555 days (7 yr) | Hot/Warm/Cold |

### Restore Procedures

See `docs/ROLLBACK_PROCEDURES.md` for detailed rollback steps.

**Quick Restore Commands:**

```bash
# Database restore (from latest backup)
pg_restore --clean --if-exists --dbname=soc_platform /backups/latest.dump

# Kubernetes resource restore
kubectl apply -f /backups/k8s-manifests-latest.yaml

# Configuration restore
vault kv put secret/cybersoc @/backups/vault-export.json
```

---

## 7. Monitoring & Alerting

### Key Metrics to Watch

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| HTTP Error Rate (5xx) | > 1% | > 5% | Investigate errors |
| Response Time P99 | > 2s | > 5s | Performance issue |
| Database Connections | > 80% pool | > 95% pool | Scale DB |
| Kafka Consumer Lag | > 1000 msgs | > 10000 msgs | Scale consumers |
| Disk Usage | > 80% | > 90% | Cleanup/scale |
| Memory Usage | > 85% | > 95% | OOM risk |

### Dashboard Links

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| SOC Overview | grafana/d/cybersoc-platform-overview | System health |
| Security | grafana/d/cybersoc-security-compliance | Sec metrics |
| GA Operations | grafana/d/cybersoc-ga-operations | Deploy status |
| Infrastructure | grafana/d/system-overview | K8s/infra |

---

## 8. Contact & Escalation

### Team Roster (GA Deployment)

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| On-Call Engineer | Rotation | PagerDuty | 24/7 |
| Security Lead | TBD | security-lead@djezzy.dz | Business hours + P1 |
| Platform Architect | TBD | platform-arch@djezzy.dz | Business hours + P1 |
| CTO | TBD | cto@djezzy.dz | Emergency only |
| ANRT Liaison | TBD | anrt-liaison@djezzy.dz | Compliance issues |

### External Contacts

| Service | Provider | Support Contact | Contract # |
|---------|----------|-----------------|------------|
| Cloud Infrastructure | Provider A | support@provider.com | CONT-001 |
| DDoS Protection | Cloudflare | enterprise@cloudflare.com | CF-002 |
| Certificate Authority | Let's Encrypt | N/A (automated) | N/A |

---

## 9. Runbook Maintenance

This document must be:
- Reviewed monthly by operations team
- Updated after any incident
- Version controlled in Git
- Accessible during incidents (offline copy available)

**Last Review:** 2026-08-26  
**Next Review:** Monthly  
**Document Owner:** CyberSOC Operations Lead  

---

*End of Production Operations Runbook*
