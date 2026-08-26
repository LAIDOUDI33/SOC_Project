-- 🇩🇿 National SOC - PostgreSQL Initialization Script
-- This script runs on first container start
-- Sets up database structure, users, and security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create application user with limited privileges (if not admin)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'soc_app') THEN
        CREATE ROLE soc_app WITH LOGIN PASSWORD 'soc_app_password_change_me';
    END IF;
END
$$;

-- Grant necessary permissions to application user
GRANT CONNECT ON DATABASE soc_production TO soc_app;
GRANT USAGE ON SCHEMA public TO soc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO soc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO soc_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO soc_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO soc_app;

-- Create read-only user for reporting/monitoring
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'soc_readonly') THEN
        CREATE ROLE soc_readonly WITH LOGIN PASSWORD 'soc_readonly_password_change_me';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE soc_production TO soc_readonly;
GRANT USAGE ON SCHEMA public TO soc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO soc_readonly;

-- Create audit log function (tracks all data changes)
CREATE OR REPLACE FUNCTION audit_log_func()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO audit_logs (
        table_name,
        operation,
        old_values,
        new_values,
        performed_by,
        performed_at,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        current_user,
        NOW(),
        inet_client_addr()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance: Create indexes for common queries
-- These will be applied when Prisma runs migrations

-- Example indexes (adjust based on actual schema):
-- CREATE INDEX idx_alerts_severity ON alerts(severity);
-- CREATE INDEX idx_alerts_status ON alerts(status);
-- CREATE INDEX idx_alerts_created_at ON alerts(created_at);
-- CREATE INDEX idx_incidents_status ON incidents(status);
-- CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);

-- Notify initialization complete
NOTIFY psql_init, 'SOC Database initialized successfully';
