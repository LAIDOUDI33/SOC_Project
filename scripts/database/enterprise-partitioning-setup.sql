-- ============================================================
-- National SOC Platform - Enterprise Partitioning Setup
-- Time-based partitioning for high-volume tables
-- ============================================================
-- This script sets up PostgreSQL partitioning for tables that
-- will receive high-volume data (SS7 messages, alerts, audit logs)
--
-- Partitioning Strategy:
-- - SS7 Messages: Daily partitions (millions of records/day)
-- - Alerts: Weekly partitions (thousands of records/day)
-- - Audit Logs: Monthly partitions (compliance retention)
-- ============================================================

-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- ============================================================
-- 1. SS7 MESSAGES PARTITIONING (Daily)
-- ============================================================

-- Create partitioned table (if not exists as partitioned)
-- Note: This requires migrating existing data to the new structure

-- Create the parent partitioned table
CREATE TABLE IF NOT EXISTS ss7_messages_partitioned (
    LIKE ss7_messages INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create initial partitions (current month + buffer)
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE);
    i INTEGER;
BEGIN
    FOR i IN 0..30 LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS ss7_messages_part_%s 
            PARTITION OF ss7_messages_partitioned
            FOR VALUES FROM (%s) TO (%s + INTERVAL ''1 day'')',
            to_char(start_date + i, 'YYYY_MM_DD'),
            quote_literal(start_date + i),
            quote_literal(start_date + i)
        );
    END LOOP;
END $$;

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_ss7_part_timestamp 
    ON ss7_messages_partitioned(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ss7_part_calling 
    ON ss7_messages_partitioned(calling_number);

CREATE INDEX IF NOT EXISTS idx_ss7_part_called 
    ON ss7_messages_partitioned(called_number);

-- Function to auto-create new partitions
CREATE OR REPLACE FUNCTION ss7_auto_partition()
RETURNS void AS $$
DECLARE
    next_date DATE;
    partition_name text;
BEGIN
    -- Check if tomorrow's partition exists
    next_date := CURRENT_DATE + 1;
    partition_name := 'ss7_messages_part_' || to_char(next_date, 'YYYY_MM_DD');
    
    -- Create if not exists
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I 
        PARTITION OF ss7_messages_partitioned
        FOR VALUES FROM (%L) TO (%L + INTERVAL ''1 day'')',
        partition_name,
        next_date,
        next_date
    );
    
    -- Drop partitions older than retention period (configurable)
    -- Default: Keep 1 year of data
    EXECUTE format('
        DROP TABLE IF EXISTS ss7_messages_part_%s',
        to_char(CURRENT_DATE - 366, 'YYYY_MM_DD')
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule: Run daily via pg_cron or external cron
-- SELECT cron.schedule('ss7-partition', '0 3 * * *', 'SELECT ss7_auto_partition()');

-- ============================================================
-- 2. ALERTS PARTITIONING (Weekly)
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts_partitioned (
    LIKE alerts INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create weekly partitions for current quarter
DO $$
DECLARE
    start_date DATE := date_trunc('week', CURRENT_DATE);
    i INTEGER;
BEGIN
    FOR i IN 0..12 LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS alerts_part_week_%s 
            PARTITION OF alerts_partitioned
            FOR VALUES FROM (%s) TO (%s + INTERVAL ''1 week'')',
            to_char(start_date + (i * 7), 'YYYY_WW'),
            quote_literal(start_date + (i * 7)),
            quote_literal(start_date + (i * 7))
        );
    END LOOP;
END $$;

-- Indexes for alert partitions
CREATE INDEX IF NOT EXISTS idx_alerts_part_status_severity 
    ON alerts_partitioned(status, severity) 
    WHERE status != 'RESOLVED';

CREATE INDEX IF NOT EXISTS idx_alerts_part_tenant 
    ON alerts_partitioned(tenant_id, created_at DESC);

-- Auto-partition function for alerts
CREATE OR REPLACE FUNCTION alerts_auto_partition()
RETURNS void AS $$
DECLARE
    next_week DATE;
    partition_name text;
BEGIN
    next_week := date_trunc('week', CURRENT_DATE) + 7 * 4; -- 4 weeks ahead
    partition_name := 'alerts_part_week_' || to_char(next_week, 'YYYY_WW');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I 
        PARTITION OF alerts_partitioned
        FOR VALUES FROM (%L) TO (%L + INTERVAL ''1 week'')',
        partition_name,
        next_week,
        next_week
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. AUDIT LOGS PARTITIONING (Monthly - Compliance Retention)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for 2 years
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE);
    i INTEGER;
BEGIN
    FOR i IN 0..23 LOOP
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS audit_logs_part_%s 
            PARTITION OF audit_logs_partitioned
            FOR VALUES FROM (%s) TO (%s + INTERVAL ''1 month'')',
            to_char(start_date + (interval '1 month' * i), 'YYYY_MM'),
            quote_literal(start_date + (interval '1 month' * i)),
            quote_literal(start_date + (interval '1 month' * i))
        );
    END LOOP;
END $$;

-- Indexes for audit log partitions
CREATE INDEX IF NOT EXISTS idx_audit_part_timestamp 
    ON audit_logs_partitioned(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_part_actor 
    ON audit_logs_partitioned(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_part_action 
    ON audit_logs_partitioned(action, timestamp DESC);

-- Auto-partition function for audit logs
CREATE OR REPLACE FUNCTION audit_auto_partition()
RETURNS void AS $$
DECLARE
    next_month DATE;
    partition_name text;
BEGIN
    next_month := date_trunc('month', CURRENT_DATE) + interval '2 months';
    partition_name := 'audit_logs_part_' || to_char(next_month, 'YYYY_MM');
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I 
        PARTITION OF audit_logs_partitioned
        FOR VALUES FROM (%L) TO (%L + interval ''1 month'')',
        partition_name,
        next_month,
        next_month
    );
    
    -- Archive/drop partitions older than 7 years (compliance requirement)
    EXECUTE format('
        DROP TABLE IF EXISTS audit_logs_part_%s',
        to_char(CURRENT_DATE - interval '7 years', 'YYYY_MM')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. MAINTENANCE FUNCTIONS
-- ============================================================

-- Function to run all partition maintenance
CREATE OR REPLACE FUNCTION run_partition_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN    
    result := result || 'SS7 Partitions: ' || ss7_auto_partition() || E'\n';
    result := result || 'Alerts Partitions: ' || alerts_auto_partition() || E'\n';
    result := result || 'Audit Partitions: ' || audit_auto_partition() || E'\n';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get partition statistics
CREATE OR REPLACE FUNCTION get_partition_stats()
RETURNS TABLE(
    parent_table TEXT,
    partition_name TEXT,
    from_value TIMESTAMPTZ,
    to_value TIMESTAMPTZ,
    row_count BIGINT,
    size_mb FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT AS parent_table,
        p.relname::TEXT AS partition_name,
        pg_range.partitionboundlower(pg_get_partition_def(p.oid, true))::TIMESTAMPTZ AS from_value,
        pg_range.partitionboundupper(pg_get_partition_def(p.oid, true))::TIMESTAMPTZ AS to_value,
        pg_class.reltuples::BIGINT AS row_count,
        pg_total_relation_size(p.oid) / (1024*1024)::FLOAT AS size_mb
    FROM pg_inherits i
    JOIN pg_class p ON p.oid = i.inhrelid
    JOIN pg_class c ON c.oid = i.inhparent
    WHERE c.relname IN ('ss7_messages_partitioned', 'alerts_partitioned', 'audit_logs_partitioned')
    ORDER BY c.relname, from_value;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. DATA MIGRATION HELPER (Optional)
-- ============================================================

-- Function to migrate data from non-partitioned to partitioned tables
-- Run this after verifying partitioned tables work correctly
CREATE OR REPLACE FUNCTION migrate_to_partitioned(
    source_table TEXT,
    target_table TEXT,
    batch_size INT DEFAULT 10000
) RETURNS BIGINT AS $$
DECLARE
    total_migrated BIGINT := 0;
    batch_count BIGINT;
    min_id BIGINT;
    max_id BIGINT;
BEGIN
    -- Get ID range
    EXECUTE format('SELECT COALESCE(MIN(id), 0), COALESCE(MAX(id), 0) FROM %I', source_table)
        INTO min_id, max_id;
    
    WHILE min_id <= max_id LOOP
        -- Insert batch
        EXECUTE format('
            INSERT INTO %I 
            SELECT * FROM %I 
            WHERE id >= %s AND id < %s
            ON CONFLICT DO NOTHING',
            target_table, source_table, min_id, min_id + batch_size
        );
        
        GET DIAGNOSTICS batch_count = ROW_COUNT;
        total_migrated := total_migrated + batch_count;
        
        min_id := min_id + batch_size;
        
        -- Log progress every 100k rows
        IF total_migrated % 100000 = 0 THEN
            RAISE INFO 'Migrated % records from % to %', total_migrated, source_table, target_table;
        END IF;
    END LOOP;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO soc_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO soc_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO soc_admin;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO soc_admin;

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- To enable automatic partition management, install pg_cron:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule('partition-maintenance', '0 2 * * *', 'SELECT run_partition_maintenance()');
--
-- To migrate existing data:
--   SELECT migrate_to_partitioned('ss7_messages', 'ss7_messages_partitioned', 50000);
--   -- After verification, rename tables:
--   ALTER TABLE ss7_messages RENAME TO ss7_messages_old;
--   ALTER TABLE ss7_messages_partitioned RENAME TO ss7_messages;
--
-- Monitoring queries:
--   SELECT * FROM get_partition_stats();
--   SELECT run_partition_maintenance();
