# Database Migration Guide: SQLite → PostgreSQL

## Overview
This guide explains how to migrate your National SOC Platform database from SQLite to PostgreSQL for production deployment.

## Why Migrate?
| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrency | ❌ Locks entire DB | ✅ Full concurrent access |
| Connection Pooling | ❌ Not supported | ✅ Excellent support |
| Data Integrity | ⚠️ Can corrupt under load | ✅ ACID compliant |
| Replication | ❌ Not supported | ✅ Master-slave, streaming |
| Performance | ⚠️ Good for <100 req/s | ✅ Handles 1000s req/s |
| Full-text Search | ❌ Limited | ✅ Excellent with pg_trgm |
| JSON Queries | ⚠️ Basic | ✅ Advanced with JSONB |
| Production Ready | ❌ No | ✅ Enterprise-grade |

## Prerequisites
1. PostgreSQL 14+ installed and running
2. `pg_dump` and `pg_restore` available
3. Application stopped during migration

## Migration Steps

### Step 1: Backup Current Data
```bash
# Navigate to your project directory
cd /path/to/National_SOC_Complete_Project

# Create backup of current SQLite database
cp db/custom.db db/custom-backup-$(date +%Y%m%d).db

# Export data to SQL (if possible)
# Note: SQLite export may need manual adjustment for PostgreSQL compatibility
```

### Step 2: Update Environment Configuration
```bash
# Edit your .env file:
DATABASE_URL="postgresql://soc_admin:YOUR_PASSWORD@localhost:5432/soc_platform"
```

### Step 3: Replace Schema File
```bash
# Backup original schema
cp prisma/schema.prisma prisma/schema.sqlite.prisma.backup

# Use PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### Step 4: Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

-- Create database user (if not exists)
CREATE USER soc_admin WITH PASSWORD 'your-strong-password-here';

-- Create database
CREATE DATABASE soc_platform OWNER soc_admin;

-- Connect to new database
\c soc_platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE soc_platform TO soc_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO soc_admin;

\q
```

### Step 5: Generate and Run Migration
```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init_postgresql

# If you have existing data, use this instead:
# npx prisma db push --accept-data-loss  # WARNING: This will reset the database!
```

### Step 6: Seed Data (Optional)
```bash
# If using demo data, run the seed script
npm run db:seed

# Or use the CEO demo seed for presentation data
npx tsx prisma/seed-ceo-demo.ts
```

### Step 7: Verify Migration
```bash
# Start the application
npm run dev

# Check health endpoint
curl http://localhost:3000/api/health

# Verify database connection in logs
```

## Docker Compose Configuration

For production, use the provided `docker-compose.prod.yml` which includes:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: soc_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: soc_platform
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    # ... see full config in docker-compose.prod.yml
```

Start with:
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Rollback Plan

If migration fails:
```bash
# Restore SQLite schema
cp prisma/schema.sqlite.prisma.backup prisma/schema.prisma

# Restore .env
DATABASE_URL="file:./db/custom.db"

# Regenerate client
npx prisma generate

# Restore from backup
cp db/custom-backup-YYYYMMDD.db db/custom.db
```

## Post-Migration Checklist

- [ ] Application starts without errors
- [ ] Health check shows database as "healthy"
- [ ] Can login to the platform
- [ ] Alerts are displaying correctly
- [ ] Compliance module works
- [ ] All API endpoints respond correctly
- [ ] Real-time updates (SSE) functioning
- [ ] Sample data visible (if seeded)

## Performance Tuning (PostgreSQL)

After migration, consider these optimizations:

### 1. Connection Pooling
Prisma already handles connection pooling. Configure in `.env`:
```
DATABASE_URL="postgresql://soc_admin:password@localhost:5432/soc_platform?connection_limit=10&pool_timeout=20"
```

### 2. Indexes
The PostgreSQL schema includes strategic indexes on frequently queried fields.

### 3. Table Partitioning (for large datasets)
Consider partitioning tables by date:
- `alerts` by `firstSeen`
- `audit_logs` by `timestamp`
- `ss7_messages` by `timestamp`

### 4. Vacuum Settings
Add to `postgresql.conf`:
```
autovacuum = on
autovacuum_vacuum_scale_factor = 1.1  # More aggressive vacuuming
autovacuum_analyze_scale_factor = 1.05
autovacuum_analyze_threshold = 50MB
```

## Troubleshooting

### Issue: "relation does not exist"
**Cause:** Tables not created after migration
**Fix:** Run `npx prisma migrate deploy`

### Issue: "column does not exist"
**Cause:** Schema mismatch between code and database
**Fix:** Run `npx prisma db push` to sync schema

### Issue: "permission denied for schema public"
**Cause:** Insufficient privileges
**Fix:** Grant permissions as shown in Step 4

### Issue: "too many connections"
**Cause:** Connection pool exhausted
**Fix:** Increase pool size or add PgBouncer

## Support

For issues, check:
1. Documentation: `/docs/DATABASE_MIGRATION.md`
2. Logs: Check server console output
3. Health Endpoint: `GET /api/health`
