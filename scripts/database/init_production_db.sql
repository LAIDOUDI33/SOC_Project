-- ============================================================
-- National SOC Platform - PostgreSQL Initialization
-- ============================================================
-- Run this script AFTER creating the database:
-- createdb soc_production -O soc_user
-- psql -U soc_user -d soc_production < init_production_db.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create application user (if not exists)
-- DO $$ BEGIN
--   CREATE USER soc_user WITH PASSWORD 'strong_password_here';
-- EXCEPTION WHEN duplicate_object THEN NULL;
-- END $$;

-- Grant privileges
-- GRANT ALL PRIVILEGES ON DATABASE soc_production TO soc_user;
-- GRANT ALL PRIVILEGES ON SCHEMA public TO soc_user;

-- Create secure roles
INSERT INTO role (id, name, description, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'viewer', 'Read-only access to dashboards and reports', '["alerts:read", "incidents:read", "reports:read"]'),
  ('00000000-0000-0000-0000-000000000002', 'analyst', 'Standard SOC analyst capabilities', '["alerts:read", "alerts:write", "incidents:read", "incidents:write", "threat-hunting:execute"]'),
  ('00000000-0000-0000-0000-000000000003', 'supervisor', 'Team lead with approval authority', '["alerts:*", "incidents:*", "threat-hunting:*", "users:read"]'),
  ('00000000-0000-0000-0000-000000000004', 'admin', 'Full system administration', '["*"]')
ON CONFLICT (id) DO NOTHING;

-- Performance indexes (created by Prisma but listed here for visibility)
-- These are automatically managed by Prisma migrations

-- Partitioning setup for high-volume tables (optional for >1M rows)
-- Note: Uncomment if you expect very high volume
/*
CREATE TABLE alerts_partitioned (
    LIKE alerts INCLUDING ALL
) PARTITION BY RANGE (firstSeen);

CREATE TABLE alerts_2026_01 PARTITION OF alerts_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    
CREATE TABLE alerts_2026_02 PARTITION OF alerts_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
*/

-- Materialized views for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'NEW') as new_alerts,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_alerts,
    COUNT(*) FILTER (WHERE status IN ('NEW', 'IN_PROGRESS')) as active_incidents,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h_alerts
FROM alerts
WITH NO DATA;

-- Schedule refresh: REFRESH MATERIALIZED VIEW mv_dashboard_stats;

-- Row Level Security (RLS) for sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY users_select_own ON users FOR SELECT USING (true);
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY sessions_user_access ON sessions FOR SELECT USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY sessions_user_insert ON sessions FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);

print('✅ Database initialized successfully');
print('');
print('Next steps:');
print('1. Run: npx prisma migrate deploy --name "production_init"');
print('2. Run: npx prisma db seed');
print('3. Verify: psql -U soc_user -d soc_production -c "\dt"');
