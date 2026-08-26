-- ===========================================
-- National SOC Platform - PostgreSQL Initialization
-- Algeria 2026-2030 | Telecom Operator Scale
--
-- This script runs on first database creation
-- Optimized for high-traffic workloads
-- ===========================================

-- ============= EXTENSIONS =============

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crypto functions (for encryption)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram support (for fast text search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Statistics extension
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============= PERFORMANCE CONFIGURATION =============

-- Increase shared buffers if not already set
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET work_mem = '16MB';

-- Connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET superuser_reserved_connections = 5;

-- WAL settings for high write throughput
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET min_wal_size = '1GB';

-- Query planner optimization
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET default_statistics_target = 200;

-- Parallel query settings
ALTER SYSTEM SET max_worker_processes = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;

-- Logging configuration
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log slow queries (>1s)
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- ============= TABLESPACE FOR TELECOM DATA =============
-- (Optional - uncomment if using separate storage)

-- CREATE TABLESPACE telecom_data LOCATION '/var/lib/postgresql/data/telecom';
-- CREATE TABLESPACE telecom_index LOCATION '/var/lib/postgresql/data/telecom_idx';

-- ============= ROLES & PERMISSIONS =============

-- Application role (limited privileges)
CREATE ROLE soc_app_role WITH LOGIN PASSWORD 'CHANGE_ME_APP_ROLE_PASSWORD';
GRANT CONNECT ON DATABASE soc_production TO soc_app_role;
GRANT USAGE ON SCHEMA public TO soc_app_role;

-- Read-only role for reporting/analytics
CREATE ROLE soc_readonly WITH LOGIN PASSWORD 'CHANGE_ME_READONLY_PASSWORD';
GRANT CONNECT ON DATABASE soc_production TO soc_readonly;
GRANT USAGE ON SCHEMA public TO soc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO soc_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO soc_readonly;

-- Backup role
CREATE ROLE soc_backup WITH LOGIN PASSWORD 'CHANGE_ME_BACKUP_PASSWORD';
GRANT pg_read_all_stats, pg_backup_start TO soc_backup;

-- ============= MONITORING VIEWS =============

-- Active connections view
CREATE OR REPLACE VIEW v_active_connections AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    waiting,
    query
FROM pg_stat_activity 
WHERE state != 'idle'
ORDER BY query_start DESC;

-- Table sizes view
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    rowcount::int
FROM pg_tables t
LEFT JOIN (
    SELECT schemaname, relname, n_live_tup as rowcount
    FROM pg_stat_user_tables
) s ON s.schemaname = t.schemaname AND s.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Long-running queries view
CREATE OR REPLACE VIEW v_long_queries AS
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;

-- Grant access to monitoring views
GRANT SELECT ON v_active_connections TO soc_app_role, soc_readonly;
GRANT SELECT ON v_table_sizes TO soc_app_role, soc_readonly;
GRANT SELECT ON v_long_queries TO soc_app_role, soc_readonly;

-- ============= INDEX OPTIMIZATIONS =============
-- (These will be applied after Prisma migration creates tables)

-- Comments for future reference:
-- CREATE INDEX CONCURRENTLY idx_alerts_created_at_severity ON alerts(created_at, severity) WHERE deleted_at IS NULL;
-- CREATE INDEX CONCURRENTLY idx_incidents_status_severity ON incidents(status, severity) WHERE deleted_at IS NULL;
-- CREATE INDEX CONCURRENTLY idx_threat_intel_ioc_type ON threat_intel(ioc_type, threat_level) WHERE is_active = true;

-- ============= COMPLETION MESSAGE =============

DO $$
BEGIN
    RAISE NOTICE '✅ National SOC Platform database initialized successfully';
    RAISE NOTICE '   - Extensions installed: uuid-ossp, pgcrypto, pg_trgm, pg_stat_statements';
    RAISE NOTICE '   - Roles created: soc_app_role, soc_readonly, soc_backup';
    RAISE NOTICE '   - Monitoring views created: v_active_connections, v_table_sizes, v_long_queries';
END $$;
