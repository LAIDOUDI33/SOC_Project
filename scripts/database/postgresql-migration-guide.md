# PostgreSQL Migration Guide for National SOC Platform

## Overview

This guide provides comprehensive instructions for migrating the National SOC Platform from SQLite to PostgreSQL. PostgreSQL offers significant advantages for production deployments including better concurrency, advanced indexing, JSON support, and enterprise-grade reliability.

**Migration Benefits:**
- **Concurrency**: Better multi-writer performance
- **Data Integrity**: Advanced constraints and foreign keys
- **JSON/JSONB**: Native support for complex data structures
- **Full-Text Search**: Built-in search capabilities
- **Partitioning**: Table partitioning for large datasets
- **Extensions**: pg_trgm, hstore, uuid-ossp, etc.
- **Replication**: Built-in streaming replication
- **Backup**: Point-in-time recovery (PITR)

---

## Prerequisites

### System Requirements
- PostgreSQL 15+ (recommended 16.x)
- Minimum 4 CPU cores, 8GB RAM (development)
- Production: 16+ cores, 64GB+ RAM, SSD storage
- Network access to database server
- Admin privileges on target PostgreSQL instance

### Tools Required
```bash
# Install migration tools
npm install -g prisma
pip install sqlite3-to-postgres  # Alternative tool

# Or use Docker for quick setup
docker run -d \
  --name postgres-soc \
  -e POSTGRES_USER=soc_admin \
  -e POSTGRES_PASSWORD=<secure-password> \
  -e POSTGRES_DB=national_soc \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

---

## Step-by-Step Migration Process

### Phase 1: Preparation (Day 1)

#### 1.1 Backup Existing Data
```bash
# Create backup of current SQLite database
cp prisma/soc.db prisma/soc.db.backup.$(date +%Y%m%d)

# Export SQLite schema for reference
sqlite3 prisma/soc.db ".schema" > backup/sqlite-schema-backup.sql

# Export all data as SQL insert statements
sqlite3 prisma/soc.db ".dump" > backup/sqlite-full-dump.sql
```

#### 1.2 Review Current Schema
Analyze your existing `prisma/schema.prisma`:
- Count total models (currently 42)
- Identify custom types and enums
- Note any SQLite-specific features used
- Document relationships and constraints

### Phase 2: Schema Conversion (Days 2-3)

#### 2.1 Update Prisma Schema Provider

Change your datasource configuration:

```diff
datasource db {
-   provider = "sqlite"
+   provider = "postgresql"
    url      = env("DATABASE_URL")
}
```

#### 2.2 Update Connection String

Update `.env` file:
```env
# Old (SQLite)
DATABASE_URL="file:./soc.db"

# New (PostgreSQL)
DATABASE_URL="postgresql://soc_admin:<password>@localhost:5432/national_soc?schema=public"
```

### Phase 3: Data Type Mapping

| SQLite Type | PostgreSQL Type | Notes |
|-------------|-----------------|-------|
| `String` | `TEXT` or `VARCHAR(n)` | Use TEXT for unlimited, VARCHAR for constrained |
| `Int` | `INTEGER` | Direct mapping |
| `BigInt` | `BIGINT` | Direct mapping |
| `Float` / `Decimal` | `DECIMAL(p,s)` | Specify precision |
| `Boolean` | `BOOLEAN` | Direct mapping |
| `DateTime` | `TIMESTAMP(3)` | With timezone option |
| `Json` | `JSONB` | **Major improvement** - queryable JSON |
| `Bytes` | `BYTEA` | Binary data |
| `@id @default(cuid())` | `TEXT` or `UUID` | Consider UUID for distributed systems |

### Phase 4: Key Schema Changes

#### 4.1 ID Fields (Recommended Change)

```diff
model User {
-   id        String   @id @default(cuid())
+   id        String   @id @default(uuid()) @db.Uuid
    email     String   @unique
    ...
}
```

#### 4.2 DateTime with Timezone

```diff
model Alert {
    ...
-   createdAt DateTime @default(now())
-   updatedAt DateTime @updatedAt
+   createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
+   updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
}
```

#### 4.3 JSON Fields to JSONB

```diff
model Incident {
    ...
-   affectedAssets String?
+   affectedAssets Json?
    
-   tags           String?
+   tags           Json?
}
```

#### 4.4 String Length Constraints

```diff
model User {
-   email     String   @unique
+   email     String   @unique @db.VarChar(255)
    
-   name      String
+   name      String   @db.VarChar(255)
    
-   username  String   @unique
+   username  String   @unique @db.VarChar(100)
}
```

### Phase 5: Index Optimization for PostgreSQL

#### 5.1 Primary Indexes (Automatic)

Prisma creates indexes automatically for:
- `@id` fields
- `@unique` fields
- `@@index` definitions

#### 5.2 Recommended Additional Indexes

```prisma
// For alerts table - common queries
model Alert {
  // ... fields
  
  @@index([severity])                    // Filter by severity
  @@index([status])                      // Filter by status  
  @@index([source])                      // Filter by source
  @@index([createdAt])                   // Sort by time
  @@index([incidentId])                  // Join to incidents
  @@index([severity, status])            // Composite filter
  @@index([source, createdAt])           // Source timeline queries
}

// For incidents table
model Incident {
  // ... fields
  
  @@index([status])
  @@index([severity])
  @@index([assignedToId])
  @@index([createdAt])
  @@index([tatcCode])                    // TATC lookup
}

// For threat indicators
model ThreatIndicator {
  // ... fields
  
  @@index([type])                        // Filter by type
  @@index([value])                       // Value lookup
  @@index([isActive])                    // Active indicators only
  @@index([confidence])                  // Sort by confidence
}

// For SS7 messages (high volume)
model Ss7Message {
  // ... fields
  
  @@index([messageType])
  @@index([timestamp])
  @@index([originatingGT, timestamp])    // GT timeline
  @@index([destinationGT])
}
```

#### 5.3 Full-Text Search Indexes

```sql
-- Add after migration (PostgreSQL-specific)
CREATE INDEX alerts_title_fts ON alerts 
USING gin(to_tsvector('english', title));

CREATE INDEX incidents_description_fts ON incidents 
USING gin(to_tsvector('french', description));  -- French for Algeria context
```

### Phase 6: Running Migration

#### 6.1 Generate PostgreSQL-Specific Schema

```bash
# Create new PostgreSQL schema file
cp prisma/schema.prisma prisma/schema-postgresql.prisma

# Edit schema-postgresql.prisma with all changes above
```

#### 6.2 Initialize PostgreSQL Database

```bash
# Set environment
export DATABASE_URL="postgresql://soc_admin:password@localhost:5432/national_soc"

# Run migration (creates tables)
npx prisma migrate dev --name init_postgresql --schema prisma/schema-postgresql.prisma
```

#### 6.3 Data Migration Options

**Option A: Using Prisma Seed Script**
```typescript
// prisma/migrate-data.ts
import { PrismaClient } from '@prisma/client';
import SQLite3 from 'sqlite3';

const sourceDb = new SQLite3.Database('./prisma/soc.db');
const targetPrisma = new PrismaClient();

async function migrateTable(tableName: string, transform?: (row: any) => any) {
  return new Promise((resolve, reject) => {
    sourceDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
      if (err) reject(err);
      
      for (const row of rows) {
        const data = transform ? transform(row) : row;
        await targetPrisma[tableName.toLowerCase()].create({ data });
      }
      
      resolve(rows.length);
    });
  });
}
```

**Option B: Using pg_dump/pg_restore (for large datasets)**
```bash
# Convert SQLite dump to PostgreSQL format
# Use tools like:
# - sqlite3-to-postgres (Python)
# - pgloader (recommended for large DBs)

# With pgloader
pgloader sqlite:///path/to/soc.db postgresql://user@host/national_soc
```

**Option C: Manual Export/Import**
```bash
# Export from SQLite
sqlite3 soc.db ".mode csv"
sqlite3 soc.db ".export users /tmp/users.csv"

# Import to PostgreSQL
\copy users FROM '/tmp/users.csv' WITH CSV HEADER
```

---

## Post-Migration Tasks

### 7.1 Verify Data Integrity

```sql
-- Check record counts match
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents;

-- Check foreign key integrity
SELECT tc.table_name, tc.constraint_name
FROM information_schema.table_constraints tc
WHERE constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 7.2 Performance Testing

```sql
-- Test alert queries
EXPLAIN ANALYZE SELECT * FROM alerts WHERE severity = 'CRITICAL' LIMIT 100;

-- Test incident joins
EXPLAIN ANALYZE 
SELECT i.*, a.title 
FROM incidents i 
LEFT JOIN alerts a ON i.id = a.incident_id 
WHERE i.status = 'OPEN';
```

### 7.3 Configure PostgreSQL for Production

See `/config/database/postgresql-tuning.conf` for recommended settings.

---

## Common Issues and Solutions

### Issue: CUID to UUID Migration
**Problem**: Existing IDs are CUID strings, want to switch to UUIDs
**Solution**: Keep CUIDs or create mapping table
```sql
ALTER TABLE users ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX users_id_uuid_idx ON users(id_uuid);
```

### Issue: JSON Field Queries
**Problem**: Need to query inside JSON fields
**Solution**: Use PostgreSQL's JSONB operators
```sql
-- Find incidents affecting specific asset
SELECT * FROM incidents 
WHERE affectedAssets ? 'HLR_01';

-- Find indicators with specific tag
SELECT * FROM threat_indicators 
WHERE tags ?| array['malware', 'C2'];
```

### Issue: Case Sensitivity
**Problem**: PostgreSQL is case-sensitive by default
**Solution**: Use citext type or ILIKE operator
```sql
-- Option 1: Use ILIKE
SELECT * FROM users WHERE email ILIKE 'admin@example.com';

-- Option 2: Use citext extension
CREATE EXTENSION citext;
ALTER TABLE users ALTER COLUMN email TYPE citext;
```

### Issue: Large Text Fields
**Problem**: Description fields can be very long
**Solution**: Use TEXT type (unlimited) with TOAST compression
```prisma
description String @db.Text  // Automatically uses TOAST
```

---

## Partitioning Strategy for Large Tables

For high-volume tables (alerts, ss7_messages, logs), consider partitioning:

```sql
-- Range partitioning by month for alerts
CREATE TABLE alerts (
  -- standard columns
) PARTITION BY RANGE (created_at);

CREATE TABLE alerts_2026_01 PARTITION OF alerts
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE alerts_2026_02 PARTITION OF alerts
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## Rollback Plan

If migration fails:
1. Switch DATABASE_URL back to SQLite
2. Restore from backup: `cp prisma/soc.db.backup.YYYYMMDD prisma/soc.db`
3. Revert schema changes in git
4. Restart application

---

## Validation Checklist

- [ ] All 42 models migrated successfully
- [ ] Record counts match between SQLite and PostgreSQL
- [ ] Foreign key relationships intact
- [ ] Unique constraints working
- [ ] Default values applied correctly
- [ ] Enum values preserved
- [ ] JSON data accessible
- [ ] Indexes created and being used
- [ ] Application connects successfully
- [ ] Basic CRUD operations work
- [ ] Authentication functions correctly
- [ ] Rate limiting works (if using Redis)
- [ ] Session management works
- [ ] Performance acceptable under load

---

## Support & References

- **Prisma PostgreSQL Docs**: https://www.prisma.io/docs/concepts/database-connectors/postgresql
- **PostgreSQL 16 Docs**: https://www.postgresql.org/docs/16/
- **SQLite to PG Migration**: https://wiki.postgresql.org/wiki/Converting_from_other_Databases_to_PostgreSQL
- **pgloader Documentation**: https://pgloader.io/

---

*Document Version: 1.0.0*
*Last Updated: January 2026*
*For: Djezzy National SOC Platform*
