# Djezzy National SOC Platform - Data Migration Guide
## Phase 4: SQLite → PostgreSQL Migration

### 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Migration Process](#migration-process)
5. [Data Transformations](#data-transformations)
6. [Validation Rules](#validation-rules)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Checklists](#checklists)

---

## Overview

This guide covers the complete data migration from the **SQLite prototype database** to **PostgreSQL** for production deployment of the Djezzy National SOC Platform.

### Why Migrate?

| Feature | SQLite (Prototype) | PostgreSQL (Production) |
|---------|---------------------|-------------------------|
| **Concurrency** | Single writer | Unlimited concurrent connections |
| **Performance** | Good for small datasets | Optimized for large-scale workloads |
| **Features** | Basic SQL | Advanced (JSONB, Full-text search, etc.) |
| **Scalability** | Limited | Horizontal scaling ready |
| **Backup/Recovery** | File copy | Point-in-time recovery, streaming replication |
| **Security** | Basic | Row-level security, enterprise auth |
| **Compliance** | Limited | ARTP/ANSSI audit logging |

### Migration Scope

- **Source**: `03_SOC_Dashboard/prisma/soc.db` (SQLite, ~217KB)
- **Target**: PostgreSQL 16 cluster (`soc_platform` database)
- **Tables**: 19 tables across 5 domains
- **Estimated Records**: Varies (seeded with demo data)

---

## Prerequisites

### Software Requirements

```bash
# Node.js >= 18
node --version  # v18.x or higher

# TypeScript
npx tsc --version

# PostgreSQL client tools
psql --version   # Should be 14+

# Optional: pg_dump for backups
pg_dump --version
```

### Database Requirements

#### Source (SQLite)

The source database should exist at:
```
03_SOC_Dashboard/prisma/soc.db
```

#### Target (PostgreSQL)

PostgreSQL must be running and accessible:

```bash
# Test connection
psql -h localhost -U soc_admin -d soc_platform -c "SELECT version();"
```

**Required database setup:**
- Database: `soc_platform`
- User: `soc_admin` (with CREATE TABLE privileges)
- Schema: `public` (or custom schema)

### Environment Variables

```bash
# Required: PostgreSQL connection string
export DATABASE_URL="postgresql://soc_admin:PASSWORD@localhost:5432/soc_platform"

# Optional: Debug mode
export DEBUG=1
```

---

## Architecture

### Migration System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Migration Orchestrator                     │
│                      (CLI Entry Point)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  SQLite      │  │  Data        │  │  PostgreSQL      │  │
│  │  Reader      │─▶│ Transformer  │─▶│  Writer          │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                    │            │
│         ▼                  ▼                    ▼            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Validation   │  │ Progress     │  │ Rollback Manager │  │
│  │ Engine       │  │ Tracker      │  │ (Backups)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 Report Generator                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
SQLite DB ──▶ Read Batch (1000 records)
                │
                ▼
         Transform Data
         (Type conversions,
          Field mappings,
          Validations)
                │
                ▼
         Write to PostgreSQL
         (UPSERT with conflict handling)
                │
                ▼
         Validate & Log Progress
```

---

## Migration Process

### Step 1: Generate Migration Plan

Analyze both databases and create a detailed migration plan:

```bash
cd /home/z/my-project
npx ts-node infrastructure/migration/scripts/run-migration.ts plan
```

**Output:** `infrastructure/migration/reports/migration-plan.json`

**Plan includes:**
- List of tables to migrate
- Record counts and estimated sizes
- Transformation rules per table
- Dependency order for migration
- Risk assessment
- Estimated duration

### Step 2: Execute Migration

Run the full migration with automatic validation:

```bash
npx ts-node infrastructure/migration/scripts/run-migration.ts execute
```

**Options:**

```bash
# Dry-run (no changes to target)
npx ts-node run-migration.ts execute --dry-run

# Continue on errors
npx ts-node run-migration.ts execute --continue

# Custom batch size
npx ts-node run-migration.ts execute --batch-size=5000

# Strict validation mode
npx ts-node run-migration.ts execute --strict
```

**What happens during execution:**

1. ✅ Connect to source (SQLite) and target (PostgreSQL)
2. 💾 Create pre-migration backup (if enabled)
3. 🔍 Validate source data quality
4. 🏗️ Prepare target schema (create/alter tables)
5. 📦 Migrate tables in dependency order:
   - `roles` → `users` → `sessions`, `mfa_devices`
   - `threat_intel_feeds` → `indicators_of_compromise` → `threat_campaigns`
   - `network_elements` → `telecom_subscribers` → `telecom_events`
   - `users` → `alerts`, `incidents` → related tables
   - `compliance_assessments` → `compliance_findings`
6. ✅ Post-migration validation
7. 🔗 Create indexes and constraints
8. 📊 Generate report

### Step 3: Validate Migration

Verify data integrity after migration:

```bash
npx ts-node infrastructure/migration/scripts/run-migration.ts validate
```

**Validations performed:**

- ✅ Record count comparison (source vs target)
- ✅ NOT NULL constraint checks
- ✅ Foreign key integrity
- ✅ Data format validation
- ✅ Sample data comparison (1000 records)
- ✅ Index verification

### Step 4: Check Status

View current migration status:

```bash
npx ts-node infrastructure/migration/scripts/run-migration.ts status
```

**Output example:**
```
📊 Migration Status:

📂 Source Database (SQLite):
   Path: /path/to/soc.db
   Size: 0.21 MB
   Tables: 10
   Records: 150

🎯 Target Database (PostgreSQL):
   Host: localhost:5432
   Database: soc_platform
   Tables: 27
   Records: 150

💾 Available Backups:
   - backup-1690000000000 (2026-07-28) - 45KB

📜 Migration History:
   - 2026-07-28T12:00:00Z: COMPLETED (19 tables)
```

---

## Data Transformations

### Type Conversions

| SQLite Type | PostgreSQL Type | Transformation |
|-------------|-----------------|----------------|
| `INTEGER` (0/1) | `BOOLEAN` | `0→false, 1→true` |
| `TEXT` (JSON string) | `JSONB` | Parse JSON string |
| `TEXT` (timestamp) | `TIMESTAMPTZ` | Parse ISO format |
| `TEXT` (comma-separated) | `TEXT[]` | Split to array |
| `INTEGER` (Unix timestamp) | `TIMESTAMPTZ` | Convert to ISO |
| `BLOB` | `BYTEA` | Direct copy |

### Field Mappings

Some fields are renamed between schemas:

| SQLite Field | PostgreSQL Field | Reason |
|-------------|------------------|--------|
| `ldapDN` | `ldap_dn` | Snake_case convention |
| `ldapGUID` | `ldap_guid` | Snake_case convention |
| `employeeId` | `employee_id` | Snake_case convention |

### Special Handling

#### Sessions Table
- Tokens are hashed before storage (SHA-256)
- Refresh tokens also hashed
- Original tokens cannot be recovered (security measure)

#### JSON Fields
- Parsed from strings to native JSONB
- Invalid JSON is stored as string with warning
- Empty arrays `[]` used as default

#### Timestamps
- Multiple formats supported:
  - ISO 8601: `2024-01-15T10:30:00Z`
  - ISO date: `2024-01-15 10:30:00`
  - Unix timestamp: `1705315800` or `1705315800000`

---

## Validation Rules

### Pre-Migration Validation (Source)

Checks performed on SQLite data before migration:

```javascript
{
  "requiredFields": {
    "users": ["email", "username", "passwordHash", "name", "roleId"],
    "alerts": ["title", "severity", "status", "source"],
    "incidents": ["title", "status", "severity"]
  },
  
  "formatValidation": {
    "email": /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "timestamp": /^(\d{4}-\d{2}-\d{2}| \d+)$/,
    "json": /^[\[{]/
  },
  
  "integrityChecks": {
    "noOrphanedRecords": true,
    "noDuplicates": true,
    "referentialIntegrity": true
  }
}
```

### Post-Migration Validation (Target)

Checks performed on PostgreSQL after migration:

1. **Record Count Match**
   - Each table's count must match source ± tolerance

2. **Constraint Validation**
   - NOT NULL constraints satisfied
   - UNIQUE constraints not violated
   - CHECK constraints pass

3. **Foreign Key Integrity**
   - All foreign keys reference existing records
   - No orphaned records

4. **Sample Comparison**
   - 1000 random records compared field-by-field
   - ≥95% match rate required

### Data Quality Score

Calculated based on:

```
Base Score = (Passed Checks / Total Checks) × 100

Deductions:
- Null required fields: -2 points each (max -20)
- Invalid formats: -1 point each (max -15)
- Duplicate records: -3 points each (max -15)
- Orphaned records: -2 points each (max -10)

Final Score = max(0, Base Score - Deductions)
```

**Score Interpretation:**
- **90-100%**: ✅ Excellent - Ready for production
- **80-89%**: ⚠️ Good - Minor issues acceptable
- **70-79%**: ⚡ Fair - Review warnings
- **<70%**: ❌ Poor - Fix issues before proceeding

---

## Rollback Procedures

### Automatic Backup

Before migration, a full backup is created using `pg_dump`:

```bash
pg_dump $DATABASE_URL \
  --format=directory \
  --file=$BACKUP_PATH/dump \
  --jobs=4
```

**Backup includes:**
- Complete schema (CREATE TABLE statements)
- All data (COPY statements)
- Indexes and constraints
- Sequences
- Triggers

### Manual Rollback

If migration fails or issues are found:

```bash
# Rollback to latest backup
npx ts-node infrastructure/migration/scripts/run-migration.ts rollback

# Rollback to specific backup
npx ts-node run-migration.ts rollback --backup=backup-XXXXX
```

**Rollback process:**

1. Drop all migrated tables (in reverse dependency order)
2. Restore from pg_dump directory
3. Recreate indexes
4. Verify restoration
5. Generate rollback report

### Available Backups

List all available backups:

```bash
ls -la /tmp/soc-migration-backups/
```

**Retention policy:**
- Maximum 5 backups kept
- Oldest deleted automatically when limit exceeded
- Each backup ~size of database

---

## Troubleshooting

### Common Issues

#### 1. Connection Failed

**Error:** `Failed to connect to PostgreSQL`

**Solutions:**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify credentials
psql -h localhost -U soc_admin -d soc_platform

# Check DATABASE_URL
echo $DATABASE_URL
```

#### 2. Permission Denied

**Error:** `permission denied for table users`

**Solutions:**
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE soc_platform TO soc_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO soc_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO soc_admin;
```

#### 3. Unique Constraint Violation

**Error:** `duplicate key value violates unique constraint`

**Causes:**
- Running migration twice without truncating
- Source data has duplicates

**Solutions:**
```bash
# Option 1: Re-run with clean state (truncates target first)
-- Add TRUNCATE step in migration config

# Option 2: Use UPSERT (default behavior)
-- Already handled by INSERT ... ON CONFLICT DO UPDATE
```

#### 4. Type Conversion Error

**Error:** `invalid input syntax for type json`

**Solutions:**
- Check source data for malformed JSON
- Run validation first to identify issues
- Use `--continue` flag to skip problematic records

#### 5. Out of Memory

**Error:** `JavaScript heap out of memory`

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Reduce batch size
npx ts-node run-migration.ts execute --batch-size=100
```

### Debug Mode

Enable detailed logging:

```bash
export DEBUG=1
npx ts-node run-migration.ts execute 2>&1 | tee migration-debug.log
```

### Getting Help

**Logs:**
- Migration progress: `/tmp/soc-migration-progress.log`
- Debug output: `migration-debug.log` (when enabled)

**Support Contacts:**
- SOC Operations: soc-ops@djezzy.dz
- Database Team: dba@djezzy.dz

---

## Checklists

### Pre-Migration Checklist

- [ ] PostgreSQL server running and accessible
- [ ] `DATABASE_URL` environment variable set
- [ ] Target database created (`soc_platform`)
- [ ] User has CREATE TABLE privileges
- [ ] Sufficient disk space for backup (2x database size)
- [ ] Application stopped (no active writes to source)
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Stakeholders notified of maintenance window

### Post-Migration Checklist

- [ ] Migration completed without critical errors
- [ ] Validation score ≥ 80%
- [ ] Record counts match (±1% tolerance)
- [ ] Application connects to new database
- [ ] Basic functionality tested:
  - [ ] User login works
  - [ ] Alerts display correctly
  - [ ] Incidents can be created/updated
  - [ ] Dashboard loads properly
- [ ] Performance acceptable (response times < 2s)
- [ ] Backup verified working
- [ ] Monitoring alerts configured
- [ ] Documentation updated

### Rollback Checklist (if needed)

- [ ] Users notified of rollback
- [ ] Application stopped
- [ ] Backup ID identified
- [ ] Rollback command executed
- [ ] Verification queries passed
- [ ] Application restarted
- [ ] Functionality verified
- [ ] Incident report filed (if production issue)

---

## Quick Reference

### Essential Commands

```bash
# Generate plan
npx ts-node run-migration.ts plan

# Execute migration
npx ts-node run-migration.ts execute

# Dry run
npx ts-node run-migration.ts execute --dry-run

# Validate
npx ts-node run-migration.ts validate

# Status
npx ts-node run-migration.ts status

# Report
npx ts-node run-migration.ts report

# Rollback
npx ts-node run-migration.ts rollback
```

### File Locations

```
infrastructure/migration/
├── scripts/
│   ├── run-migration.ts           # CLI entry point
│   ├── migration-orchestrator.ts  # Main orchestrator
│   └── lib/
│       ├── sqlite-reader.ts       # SQLite reader module
│       ├── postgresql-writer.ts   # PostgreSQL writer module
│       ├── data-transformer.ts    # Data transformation engine
│       ├── validation-engine.ts   # Validation & integrity checks
│       ├── progress-tracker.ts    # Progress tracking & reporting
│       ├── rollback-manager.ts    # Backup & rollback management
│       ├── report-generator.ts    # Multi-format report generation
│       └── types.ts               # TypeScript type definitions
├── config/
│   └── migration.config.json      # Configuration file
├── reports/                        # Generated reports
│   ├── migration-report-*.json
│   ├── migration-report-*.md
│   └── migration-report-*.html
└── docs/
    └── DATA_MIGRATION_GUIDE.md    # This document
```

---

## Next Steps

After completing Phase 4 (Data Migration):

1. **Phase 5**: Backup & Disaster Recovery Setup
2. **Phase 6**: Security Hardening (Network Policies, WAF)
3. **Phase 7**: Monitoring & Alerting Enhancement
4. **Phase 8**: Performance & Load Testing

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-28  
**Classification**: Confidential - Djezzy Internal Use Only
