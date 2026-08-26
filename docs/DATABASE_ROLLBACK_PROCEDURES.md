# Database Migration Rollback Procedures

## Algeria National SOC Platform - PostgreSQL 15

This document outlines rollback procedures for database migrations in the Algeria National SOC platform.

---

## Table of Contents

1. [Pre-Rollback Checklist](#pre-rollback-checklist)
2. [Rollback Methods](#rollback-methods)
3. [Migration-Specific Rollbacks](#migration-specific-rollbacks)
4. [Emergency Procedures](#emergency-procedures)
5. [Post-Rollback Verification](#post-rollback-verification)
6. [Recovery Procedures](#recovery-procedures)

---

## Pre-Rollback Checklist

Before initiating any rollback, complete these steps:

### 1. Assess Impact
- [ ] Identify which migration caused the issue
- [ ] Determine affected tables/data
- [ ] Estimate user impact (active sessions, ongoing incidents)
- [ ] Check if ARPT-notifiable data is affected

### 2. Create Backup
```bash
# Always create a backup before rollback
./scripts/db-migration-verify.sh --backup

# Or manual backup
pg_dump -h localhost -p 5432 -U postgres soc_prod > rollback_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Notify Stakeholders
- [ ] SOC Manager notification
- [ ] If during business hours: Alert active analysts
- [ ] If ARPT data affected: Notify compliance officer
- [ ] Document in incident tracking system

---

## Rollback Methods

### Method 1: Prisma Migrate Rollback (Recommended)

For migrations applied via Prisma:

```bash
# View migration history
npx prisma migrate status

# Rollback one migration
npx prisma migrate resolve --rolled-back <migration-name>

# Rollback multiple migrations (in reverse order)
npx prisma migrate resolve --rolled-back <latest-migration>
npx prisma migrate resolve --rolled-back <previous-migration>
```

### Method 2: SQL-Based Rollback

For direct SQL execution or when Prisma rollback fails:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U postgres -d soc_prod

-- View current schema version
SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;

-- Mark specific migration as rolled back
UPDATE _prisma_migrations 
SET rolled_back_at = NOW(), 
    logs = 'Manual rollback due to issue: <ticket-number>'
WHERE migration_name = '<migration-name>';
```

### Method 3: Full Schema Restore (Emergency Only)

**⚠️ WARNING: This will lose all data since the backup point**

```bash
# Stop application first
sudo systemctl stop soc-platform

# Restore from backup
psql -h localhost -p 5432 -U postgres soc_prod < backup_file.sql

# Verify restoration
./scripts/db-migration-verify.sh --full

# Restart application
sudo systemctl start soc-platform
```

---

## Migration-Specific Rollbacks

### Initial Migration (20260726000000_init)

If the initial baseline migration needs rollback:

```sql
-- DO NOT DROP TABLES DIRECTLY - Use Prisma instead

-- Step 1: Mark migration as rolled back
UPDATE _prisma_migrations 
SET rolled_back_at = NOW(), 
    logs = 'Initial migration rollback - <reason>'
WHERE id = '00a00b00c00d00e010a00b00c00d00f010a00b00c00d00f010a00b00c00d00f01';

-- Step 2: Drop all created objects in correct order (foreign keys first)
-- Note: This is destructive - ensure you have a backup!

-- Drop views first
DROP VIEW IF EXISTS arpt_compliance_dashboard;
DROP VIEW IF EXISTS system_health_overview;
DROP VIEW IF EXISTS telecom_alerts_summary;
DROP VIEW IF EXISTS active_incidents;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_modtime ON users;
DROP TRIGGER IF EXISTS update_api_keys_modtime ON api_keys;
-- ... repeat for all triggers

-- Drop tables in dependency order
DROP TABLE IF EXISTS widgets CASCADE;
DROP TABLE IF EXISTS dashboards CASCADE;
DROP TABLE IF EXISTS retention_policies CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS compliance_reports CASCADE;
DROP TABLE IF EXISTS playbooks CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_components CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS indicators CASCADE;
DROP TABLE IF EXISTS threat_actors CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "MfaMethod";
-- ... drop all enums
```

### Seed Data Rollback

To remove seed data while keeping schema:

```bash
# Run Prisma with clean seed script
npx prisma db execute --file ./scripts/clean-seed-data.sql
```

Or manually:
```sql
-- Remove data in dependency order
DELETE FROM comments;
DELETE FROM notifications;
DELETE FROM audit_logs;
DELETE FROM sessions;
DELETE FROM evidence;
DELETE FROM tasks;
DELETE FROM alerts;
DELETE FROM indicators;
DELETE FROM campaigns;
DELETE FROM threat_actors;
DELETE FROM compliance_reports;
DELETE FROM playbooks;
DELETE FROM integration;
DELETE FROM system_components;
DELETE FROM widgets;
DELETE FROM dashboards;
DELETE FROM retention_policies;
DELETE FROM assets;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ... repeat for other sequences
```

---

## Emergency Procedures

### Scenario 1: Migration Failed Mid-Execution

**Symptoms:** Partial schema, broken foreign keys, application errors

```bash
# 1. Stop all applications using the database
sudo systemctl stop soc-platform nginx

# 2. Check migration status
npx prisma migrate status

# 3. Identify stuck migration
psql -h localhost -p 5432 -U postgres -d soc_prod \
  -c "SELECT * FROM _prisma_migrations WHERE finished_at IS NULL;"

# 4. Force mark as rolled back (if safe to do so)
npx prisma migrate resolve --rolled-back <stuck-migration>

# 5. Verify and restart
./scripts/db-migration-verify.sh --full
sudo systemctl start soc-platform
```

### Scenario 2: Data Corruption After Migration

**Symptoms:** Query errors, missing data, inconsistent state

```bash
# 1. Immediate backup of current (corrupted) state
pg_dump -h localhost -p 5432 -U postgres soc_prod > corrupted_state_backup.sql

# 2. Check table integrity
psql -h localhost -p 5432 -U postgres -d soc_prod -c "
  SELECT tablename, 
         n_live_tup as row_count,
         n_dead_tup as dead_rows,
         last_vacuum,
         last_autovacuum
  FROM pg_stat_user_tables 
  ORDER BY n_dead_tup DESC 
  LIMIT 20;
"

# 3. If corruption is severe, restore from known-good backup
# See Method 3 above
```

### Scenario 3: Performance Degradation After Migration

**Symptoms:** Slow queries, timeout errors, high CPU

```bash
# 1. Check for missing indexes
psql -h localhost -p 5432 -U postgres -d soc_prod -c "
  SELECT schemaname, tablename, attname, null_frac
  FROM pg_stats 
  WHERE null_frac > 0.5 
  AND schemaname = 'public'
  ORDER BY null_frac DESC;
"

# 2. Analyze tables
ANALYZE VERBOSE;

# 3. Check for bloated tables
SELECT 
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(relpages * 8192) as table_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

# 4. Reindex if needed
REINDEX DATABASE soc_prod;
```

---

## Post-Rollback Verification

After any rollback, execute verification:

```bash
# Full verification suite
./scripts/db-migration-verify.sh --full

# Quick health check
./scripts/db-migration-verify.sh --quick

# Test application connectivity
curl -f http://localhost:3000/api/health || echo "Health check failed"
```

### Verification Checklist

- [ ] All expected tables exist
- [ ] Foreign key constraints intact
- [ ] Indexes present and being used
- [ ] Triggers functioning (updatedAt auto-update)
- [ ] Views return correct results
- [ ] Application connects without errors
- [ ] Sample queries return expected results
- [ ] No orphaned records (broken FK references)

### Test Queries for Verification

```sql
-- Test 1: Basic table access
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM alerts;
SELECT COUNT(*) FROM incidents;

-- Test 2: Foreign key integrity
SELECT u.name, COUNT(a.id) as alert_count 
FROM users u 
LEFT JOIN alerts a ON a."assignedToId" = u.id 
GROUP BY u.id;

-- Test 3: Telecom-specific fields
SELECT "telecomProtocol", COUNT(*) 
FROM alerts 
GROUP BY "telecomProtocol";

-- Test 4: Views work
SELECT * FROM active_incidents LIMIT 5;
SELECT * FROM telecom_alerts_summary;
SELECT * FROM system_health_overview;

-- Test 5: Triggers work
UPDATE users SET name = name WHERE id = (SELECT id FROM users LIMIT 1);
SELECT "updatedAt" > "createdAt" FROM users WHERE id = (SELECT id FROM users LIMIT 1);

-- Test 6: ARPT compliance view
SELECT * FROM arpt_compliance_dashboard;
```

---

## Recovery Procedures

### Point-in-Time Recovery (PITR)

If WAL archiving is enabled:

```bash
# Determine target time (before problematic migration)
TARGET_TIME="2026-07-26 14:30:00"

# Initialize recovery
pg_ctl stop -D /var/lib/postgresql/15/main

# Create recovery directory
mkdir -p /var/lib/postgresql/15/recovery

# Configure recovery
cat > /var/lib/postgresql/15/recovery.conf << EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start recovery
pg_ctl start -D /var/lib/postgresql/15/main

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Selective Table Recovery

If only specific tables need recovery:

```bash
# 1. Restore backup to separate database
createdb soc_recovery
psql -h localhost -p 5432 -U postgres soc_recovery < backup_file.sql

# 2. Copy data from recovery database
psql -h localhost -p 5432 -U postgres soc_prod << EOF
-- Truncate damaged table
TRUNCATE TABLE alerts CASCADE;

-- Restore from recovery database
INSERT INTO alerts 
SELECT * FROM soc_recovery.alerts;

-- Verify counts
SELECT 'alerts' as table_name, COUNT(*) FROM alerts
UNION ALL
SELECT 'recovery_alerts', COUNT(*) FROM soc_recovery.alerts;
EOF

# 3. Clean up
dropdb soc_recovery
```

---

## Contact & Escalation

| Issue Type | Primary Contact | Escalation |
|------------|-----------------|-------------|
| Migration Failure | SOC DBA | Platform Lead |
| Data Loss | SOC Manager | CISO |
| ARPT Impact | Compliance Officer | Legal |
| Production Outage | NOC | CTO |

---

## Version History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-07-26 | 1.0 | SOC Team | Initial version |

---

*Document maintained by Algeria National SOC Platform Team*
*Last updated: $(date '+%Y-%m-%d %H:%M')*
