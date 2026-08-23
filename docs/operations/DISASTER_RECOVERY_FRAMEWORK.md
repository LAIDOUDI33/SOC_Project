# ============================================================
# Disaster Recovery Framework - National SOC Platform
# ============================================================
## Objective
Ensure business continuity with defined RTO (Recovery Time Objective) and RPO (Recovery Point Objective).

## Recovery Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| **RTO** (Recovery Time) | < 4 hours | Time to restore service after disaster |
| **RPO** (Recovery Point) | < 1 hour | Maximum acceptable data loss |
| **MTTD** (Mean Time To Detect) | < 15 minutes | Time to detect an outage |
| **MTTR** (Mean Time To Resolve) | < 2 hours | Time to fully restore service |

## Disaster Categories
### Tier 1 - Critical (< 1 hour recovery)
- Complete platform outage
- Database corruption/failure
- Security breach requiring shutdown

### Tier 2 - High (< 4 hours recovery)
- Single component failure (SIEM, SOAR, etc.)
- Data center power/network issue
- Major software failure

### Tier 3 - Medium (< 24 hours recovery)
- Degraded performance
- Non-critical feature failure
- External dependency outage

## Backup Strategy

### Database Backups (PostgreSQL)
```bash
# Full backup (daily at 02:00 AM)
pg_dump -Fc -U soc_user soc_production | gzip > backups/db/full_$(date +%Y%m%d).sql.gz

# Incremental WAL archiving (continuous)
# Configure postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

# Point-in-time recovery capability: YES
# RPO achieved: < 5 minutes (WAL-based)
```

### Application Backups
- **Configuration**: Git repository (committed after every change)
- **Static assets**: S3/MinIO bucket with versioning enabled
- **Encryption keys**: Hardware Security Module (HSM) or HashiCorp Vault
- **SSL certificates**: Automated renewal with certbot/Let's Encrypt

### Backup Retention
| Backup Type | Retention Period | Storage Location |
|-------------|-----------------|------------------|
| Full DB daily | 30 days | Offsite (different DC) |
| Full DB weekly | 12 weeks | Cold storage (AWS Glacier) |
| Full DB monthly | 1 year | Archive storage |
| WAL archives | 3 days | Local + replica |
| Config backups | 1 year | Git + encrypted cloud |

## Recovery Procedures

### Scenario 1: Database Server Failure
**Detection**: Health check failure, monitoring alerts
**Recovery Steps**:
1. Promote read-replica to primary (automated via Patroni)
2. Update DNS/Application config to point to new primary
3. Verify data integrity (check sequence numbers)
4. Notify stakeholders
**Expected RTO**: < 15 minutes (with automatic failover)

### Scenario 2: Data Corruption
**Detection**: Query errors, checksum failures, data inconsistency
**Recovery Steps**:
1. Identify corruption scope/timeline
2. Stop writes to affected tables
3. Restore from latest known-good backup
4. Replay WAL logs to point before corruption
5. Verify data integrity
6. Resume operations
**Expected RTO**: 2-4 hours (depending on corruption)

### Scenario 3: Complete Data Center Loss
**Detection**: All monitoring down, external health checks failing
**Recovery Steps**:
1. Declare disaster (follow escalation matrix)
2. Activate DR site (secondary data center)
3. Restore database from offsite backup
4. Deploy latest application version
5. Update DNS (TTL should be low: 60 seconds)
6. Verify all systems operational
7. Communicate with stakeholders
**Expected RTO**: 4-8 hours

## Testing Schedule
| Test Type | Frequency | Last Executed | Status |
|-----------|-----------|---------------|--------|
| Backup restore test | Weekly | TBD | 🔴 Pending |
| Failover drill | Monthly | TBD | 🔴 Pending |
| DR site activation | Quarterly | TBD | 🔴 Pending |
| Tabletop exercise | Quarterly | TBD | 🔴 Pending |
| Full DR test | Annually | TBD | 🔴 Pending |

## Escalation Matrix
| Severity | Response Time | Escalation Path |
|----------|--------------|----------------|
| P1-Critical | Immediate | On-call → SOC Manager → CISO → CEO |
| P2-High | 15 min | On-call → Team Lead → SOC Manager |
| P3-Medium | 1 hour | On-call → Team Lead |
| P4-Low | 4 hours | Next business day |

## Communication Plan
### Internal (IT/SOC Team)
- Slack channel: #soc-incidents
- PagerDuty escalation
- War room conference bridge

### External (Stakeholders)
- Status page: https://status.djezzy.com/soc
- Email distribution: soc-stakeholders@djezzy.dz
- SMS alerts for critical incidents

## Contacts
| Role | Name | Primary | Secondary |
|------|-----|---------|-----------|
| DR Coordinator | [TBD] | +213 XXX XXX XXX | - |
| Database Admin | [TBD] | +213 XXX XXX XXX | - |
| Network Admin | [TBD] | +213 XXX XXX XXX | - |
| Security Lead | [TBD] | +213 XXX XXX XXX | - |

---
*Document Version: 1.0*
*Last Updated: $(date +%Y-%m-%d)*
*Owner: SOC Operations Team*
