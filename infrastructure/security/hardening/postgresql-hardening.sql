-- ============================================================
-- National SOC Platform - PostgreSQL Security Hardening
-- Djezzy Production Environment - CIS Benchmark Compliant
-- ============================================================
-- This script implements comprehensive PostgreSQL security
-- measures aligned with:
-- - CIS PostgreSQL Benchmark v1.0
-- - ANOR Regulatory Requirements for Telecom Operators
-- - GDPR Data Protection Requirements
-- - NIST Cybersecurity Framework (CSF)
--
-- IMPORTANT: Run this as superuser (postgres) in production.
-- Review and customize settings for your environment.
-- ============================================================

-- ============================================================
-- 1. SSL/TLS CONNECTION REQUIREMENT
-- ============================================================
-- Enforces encrypted connections to protect data in transit.
-- All non-SSL connections are rejected.

-- Show current SSL settings (for verification)
SELECT name, setting, short_desc 
FROM pg_settings 
WHERE name LIKE 'ssl%' OR name LIKE 'tls%';

-- Note: These settings require postgresql.conf modification:
-- ssl = on
-- ssl_cert_file = '/etc/ssl/certs/soc-postgresql.crt'
-- ssl_key_file = '/etc/ssl/private/soc-postgresql.key'
-- ssl_ca_file = '/etc/ssl/certs/ca-bundle.crt'
-- ssl_ciphers = 'HIGH:!aNULL:!MD5:!3DES:!CAMELLIA'
-- ssl_prefer_server_ciphers = on
-- ssl_min_protocol_version = 'TLSv1.2'
-- ssl_max_protocol_version = 'TLSv1.3'

-- Force SSL connections via pg_hba.conf:
-- hostssl    all             all             0.0.0.0/0               scram-sha-256
-- local      all             all                                     scram-sha-256

-- Create function to check if connection is encrypted
CREATE OR REPLACE FUNCTION is_connection_encrypted()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT ssl_is_used());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to application roles
GRANT EXECUTE ON FUNCTION is_connection_encrypted() TO soc_app_role;

-- ============================================================
-- 2. STRONG PASSWORD POLICY
-- ============================================================
-- Implements password complexity requirements using
-- PostgreSQL's built-in authentication mechanisms.

-- Password validation extension (if available)
-- Requires: CREATE EXTENSION IF NOT EXISTS password_cracklib;
-- Or use: pgaudit extension for enterprise features

-- Create custom password validation function
CREATE OR REPLACE FUNCTION validate_password_strength(p_password TEXT)
RETURNS TABLE(is_valid BOOLEAN, message TEXT) AS $$
DECLARE
    min_length INTEGER := 12;
    has_upper BOOLEAN := p_password ~ '[A-Z]';
    has_lower BOOLEAN := p_password ~ '[a-z]';
    has_digit BOOLEAN := p_password ~ '[0-9]';
    has_special BOOLEAN := p_password ~ '[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]';
BEGIN
    -- Check minimum length
    IF LENGTH(p_password) < min_length THEN
        RETURN QUERY SELECT FALSE, format('Password must be at least %s characters', min_length);
        RETURN;
    END IF;
    
    -- Check complexity requirements
    IF NOT (has_upper AND has_lower AND has_digit AND has_special) THEN
        RETURN QUERY SELECT FALSE, 'Password must contain uppercase, lowercase, digits, and special characters';
        RETURN;
    END IF;
    
    -- Check for common weak passwords (basic list)
    IF LOWER(p_password) IN ('password', '123456', 'admin', 'djezzy', 'soc2024', 'welcome') THEN
        RETURN QUERY SELECT FALSE, 'Password is too common';
        RETURN;
    END IF;
    
    -- Check for username/password similarity (would need username parameter)
    
    RETURN QUERY SELECT TRUE, 'Password meets strength requirements';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. CONNECTION LIMITS PER USER/ROLE
-- ============================================================
-- Prevents resource exhaustion attacks by limiting
-- concurrent connections per user role.

-- View current connection limits
SELECT rolname, rolconnlimit 
FROM pg_roles 
WHERE rolconnlimit > 0 OR rolname LIKE 'soc%';

-- Set connection limits for different role types
-- Superuser/Admin: Higher limit for operations
ALTER ROLE soc_admin CONNECTION LIMIT 50;

-- Application service account: Moderate limit
ALTER ROLE soc_app_user CONNECTION LIMIT 100;

-- Read-only analytics: Lower limit
ALTER ROLE soc_analyst CONNECTION LIMIT 20;

-- API service accounts: Based on expected load
ALTER ROLE soc_api_service CONNECTION LIMIT 200;

-- Monitoring/backup users: Low limit
ALTER ROLE soc_monitoring CONNECTION LIMIT 10;

-- Create alert for near-limit connections
CREATE OR REPLACE FUNCTION check_connection_usage()
RETURNS TABLE(role_name TEXT, current_conn INT, max_limit INT, usage_pct NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.rolname,
        COUNT(DISTINCT c.pid),
        r.rolconnlimit,
        CASE 
            WHEN r.rolconnlimit > 0 
            THEN ROUND((COUNT(DISTINCT c.pid)::NUMERIC / r.rolconnlimit) * 100, 1)
            ELSE 0 
        END
    FROM pg_roles r
    LEFT JOIN pg_stat_activity c ON c.usename = r.rolname
    WHERE r.rolconnlimit > 0
    GROUP BY r.rolname, r.rolconnlimit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. AUDIT LOGGING CONFIGURATION
-- ============================================================
-- Comprehensive audit logging for compliance and forensics.
-- Uses pgaudit extension if available.

-- Enable pgaudit extension (requires installation)
-- CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Audit configuration (add to postgresql.conf):
-- pgaudit.log = 'write, ddl, role'
-- pgaudit.log_catalog = off
-- pgaudit.log_client = on
-- pgaudit.log_level = 'log'
-- pgaudit.log_parameter = on
-- pgaudit.log_relation = on
-- pgaudit.log_statement_once = off

-- Custom audit table for critical events
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.security_events (
    id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    user_name TEXT NOT NULL,
    client_ip INET,
    object_type VARCHAR(50),
    object_name TEXT,
    action TEXT,
    statement_text TEXT,
    result VARCHAR(20),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_events_timestamp ON audit.security_events(event_timestamp);
CREATE INDEX idx_audit_events_type ON audit.security_events(event_type);
CREATE INDEX idx_audit_events_user ON audit.security_events(user_name);

-- Function to log security events
CREATE OR REPLACE FUNCTION audit.log_security_event(
    p_event_type VARCHAR,
    p_severity VARCHAR DEFAULT 'INFO',
    p_object_type VARCHAR DEFAULT NULL,
    p_object_name TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_statement TEXT DEFAULT NULL,
    p_result VARCHAR DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit.security_events (
        event_type, severity, user_name, client_ip,
        object_type, object_name, action, statement_text,
        result, details
    ) VALUES (
        p_event_type, p_severity, CURRENT_USER, inet_client_addr(),
        p_object_type, p_object_name, p_action, p_statement,
        p_result, p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for DDL auditing
CREATE OR REPLACE FUNCTION audit.ddl_trigger()
RETURNS EVENT_TRIGGER AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_get_ddl_commands() LOOP
        INSERT INTO audit.security_events (
            event_type, severity, user_name, client_ip,
            object_type, object_name, action, statement_text, result
        ) VALUES (
            'DDL_COMMAND',
            CASE 
                WHEN obj.command_tag IN ('DROP', 'TRUNCATE') THEN 'CRITICAL'
                WHEN obj.command_tag IN ('ALTER', 'CREATE') THEN 'WARNING'
                ELSE 'INFO'
            END,
            CURRENT_USER,
            inet_client_addr(),
            obj.object_type,
            COALESCE(obj.object_identity, 'N/A'),
            obj.command_tag,
            obj.command,
            'SUCCESS'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger for DDL commands
CREATE EVENT TRIGGER audit_ddl_commands
ON ddl_command_end
EXECUTE FUNCTION audit.ddl_trigger();

-- ============================================================
-- 5. ROW-LEVEL SECURITY (RLS) EXAMPLES
-- ============================================================
-- Implements data isolation based on user roles.
-- Critical for multi-tenant or departmental access control.

-- Example: Enable RLS on incidents table
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see incidents assigned to their team
CREATE POLICY incident_team_access ON incidents
    FOR ALL
    TO soc_analyst, soc_responder
    USING (
        team_id IN (
            SELECT ut.team_id FROM user_teams ut 
            JOIN users u ON u.id = ut.user_id 
            WHERE u.username = CURRENT_USER
        )
    );

-- Policy: SOC managers can see all incidents
CREATE POLICY incident_manager_full ON incidents
    FOR ALL
    TO soc_manager
    USING (true);

-- Policy: Service accounts have full access (for API operations)
CREATE POLICY incident_service_access ON incidents
    FOR ALL
    TO soc_api_service
    USING (true);

-- Example: RLS for threat intelligence (classification-based)
ALTER TABLE threat_intel ENABLE ROW LEVEL SECURITY;

-- Policy: Classification-based access
CREATE POLICY intel_classification ON threat_intel
    FOR SELECT
    TO soc_analyst
    USING (
        classification_level <= (
            SELECT MAX(clearance_level) FROM user_clearances uc
            JOIN users u ON u.id = uc.user_id
            WHERE u.username = CURRENT_USER
        )
    );

-- ============================================================
-- 6. ENCRYPTION AT REST CONFIGURATION
-- ============================================================
-- Documents encryption requirements for data at rest.
-- Actual implementation depends on hosting platform.

-- For AWS RDS: Enable TDE (Transparent Data Encryption)
-- ALTER SYSTEM SET transparent_huge_pages = off;

-- For self-managed: Use pgcrypto for column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption functions for sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(p_plaintext TEXT, p_key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN encrypt(p_plaintext::bytea, p_key, 'aes-cbc/pad:pkcs5');
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(p_ciphertext BYTEA, p_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN convert_from(decrypt(p_ciphertext, p_key, 'aes-cbc/pad:pkcs5'), 'UTF8');
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Example encrypted column storage
-- ALTER TABLE users ADD COLUMN ssn_encrypted BYTEA;
-- UPDATE users SET ssn_encrypted = encrypt_sensitive_data(ssn, current_setting('app.encryption_key'));

-- Key rotation tracking table
CREATE TABLE IF NOT EXISTS audit.encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-CBC',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT NOT NULL DEFAULT CURRENT_USER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BACKUP ENCRYPTION SETTINGS
-- ============================================================
-- Ensures backups are encrypted and secure.

-- Backup configuration notes (for postgresql.conf / backup scripts):
-- 
-- For pg_dump with encryption:
-- pg_dump dbname | gzip | gpg --symmetric --cipher-algo AES256 > backup.sql.gz.gpg
--
-- For pg_basebackup with compression:
-- pg_basebackup -D - -Ft -z -Xs | gpg --symmetric --cipher-algo AES256 > basebackup.tar.gz.gpg

-- Backup metadata tracking
CREATE TABLE IF NOT EXISTS audit.backup_registry (
    id BIGSERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,  -- 'full', 'incremental', 'schema'
    backup_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(32),
    checksum_sha256 VARCHAR(64),
    is_encrypted BOOLEAN DEFAULT true,
    encryption_algorithm VARCHAR(50),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,  -- 'in_progress', 'completed', 'failed'
    error_message TEXT,
    created_by TEXT NOT NULL DEFAULT CURRENT_USER
);

CREATE INDEX idx_backup_registry_time ON audit.backup_registry(started_at);
CREATE INDEX idx_backup_registry_status ON audit.backup_registry(status);

-- ============================================================
-- 8. PRIVILEGED ROLE RESTRICTIONS
-- ============================================================
-- Restricts dangerous permissions and implements
-- principle of least privilege.

-- Revoke unnecessary public permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE USAGE ON SCHEMA public FROM PUBLIC;

-- Remove default execute permissions on functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid::regprocedure as func_name
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.proargtypes::oid[] = '{}'::oid[]
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', func_record.func_name);
    END LOOP;
END $$;

-- Create restricted application roles
-- Role hierarchy: admin -> manager -> responder -> analyst -> readonly

-- Base read-only role
CREATE ROLE soc_readonly WITH NOLOGIN NOINHERIT;
GRANT CONNECT ON DATABASE soc_platform TO soc_readonly;
GRANT USAGE ON SCHEMA public TO soc_readonly;
GRANT USAGE ON SCHEMA audit TO soc_readonly;

-- Analyst role (read + limited write)
CREATE ROLE soc_analyst WITH NOLOGIN NOINHERRIT;
GRANT soc_readonly TO soc_analyst;
-- Add specific table grants as needed

-- Responder role (incident management)
CREATE ROLE soc_responder WITH NOLOGIN NOINHERIT;
GRANT soc_analyst TO soc_responder;
-- Add write permissions for incidents, alerts, etc.

-- Manager role (full operational access)
CREATE ROLE soc_manager WITH NOLOGIN NOINHERIT;
GRANT soc_responder TO soc_manager;
-- Add administrative grants

-- Admin role (system administration)
CREATE ROLE soc_admin WITH NOLOGIN NOINHERIT;
GRANT soc_manager TO soc_admin;
-- Add DDL permissions carefully

-- Service account for application
CREATE ROLE soc_app_role WITH NOLOGIN;
GRANT soc_responder TO soc_app_role;

-- API service account
CREATE ROLE soc_api_service WITH LOGIN PASSWORD '${API_SERVICE_PASSWORD}';
GRANT soc_app_role TO soc_api_service;
ALTER ROLE soc_api_service SET search_path = public, audit;

-- Monitoring account (read-only metrics)
CREATE ROLE soc_monitoring WITH LOGIN PASSWORD '${MONITORING_PASSWORD}';
GRANT soc_readonly TO soc_monitoring;
GRANT pg_read_all_settings TO soc_monitoring;
GRANT pg_read_all_stats TO soc_monitoring;

-- ============================================================
-- 9. EXTENSION SECURITY
-- ============================================================
-- Disables dangerous extensions and controls
-- which extensions can be installed.

-- Dangerous extensions that should be disabled/restricted:
-- - dblink: Allows connecting to other databases
-- - lo: Large objects (legacy, can cause issues)
-- - plpythonu/plperlu: Untrusted language handlers

-- Revoke ability to install extensions from non-superusers
REVOKE CREATE ON SCHEMA extension FROM PUBLIC;

-- Trusted extensions whitelist (allow only these)
CREATE OR REPLACE FUNCTION extension_allowed(p_extension_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    allowed_extensions TEXT[] := ARRAY[
        'pgcrypto',       -- Encryption functions
        'pg_stat_statements', -- Query statistics
        'btree_gin',      -- GIN indexes
        'btree_gist',     -- GiST indexes
        'uuid-ossp',      -- UUID generation
        'pg_trgm',        -- Trigram matching
        'hstore',         -- Key-value pairs
        'pgaudit'         -- Audit logging
    ];
BEGIN
    RETURN p_extension_name = ANY(allowed_extensions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log extension creation attempts
CREATE OR REPLACE FUNCTION audit_extension_creation()
RETURNS EVENT_TRIGGER AS $$
BEGIN
    INSERT INTO audit.security_events (
        event_type, severity, user_name, client_ip,
        object_type, object_name, action, result
    ) VALUES (
        'EXTENSION_CREATE',
        'WARNING',
        CURRENT_USER,
        inet_client_addr(),
        'extension',
        TG_TAG,
        'Extension creation attempted',
        CASE 
            WHEN extension_available(TG_TAG) THEN 'ALLOWED'
            ELSE 'BLOCKED'
        END
    );
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER audit_extension_creates
ON sql_drop
EXECUTE FUNCTION audit_extension_creation();

-- ============================================================
-- 10. SESSION AND AUTHENTICATION SETTINGS
-- ============================================================
-- Hardens session management and authentication.

-- Session timeout settings (via postgresql.conf):
-- idle_in_transaction_session_timeout = 10min
-- idle_session_timeout = 30min
-- statement_timeout = 5min (adjust per workload)
-- lock_timeout = 2min
-- authentication_timeout = 1min

-- Failed login attempt monitoring
CREATE TABLE IF NOT EXISTS audit.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_name TEXT NOT NULL,
    client_ip INET,
    success BOOLEAN NOT NULL,
    auth_method TEXT,
    failure_reason TEXT
);

CREATE INDEX idx_login_attempts_time ON audit.login_attempts(attempt_time);
CREATE INDEX idx_login_attempts_user ON audit.login_attempts(user_name);
CREATE INDEX idx_login_attempts_ip ON audit.login_attempts(client_ip);

-- Function to detect brute force attempts
CREATE OR REPLACE FUNCTION detect_brute_force(p_username TEXT, p_window INTERVAL DEFAULT INTERVAL '15 minutes')
RETURNS TABLE(attempts INT, is_locked BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*),
        CASE WHEN COUNT(*) >= 10 THEN TRUE ELSE FALSE END
    FROM audit.login_attempts
    WHERE user_name = p_username
    AND success = false
    AND attempt_time > NOW() - p_window;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock out after too many failed attempts (application-level enforcement query)
CREATE OR REPLACE FUNCTION should_lock_account(p_username TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_attempts INT;
BEGIN
    SELECT attempts INTO v_attempts FROM detect_brute_force(p_username);
    
    IF v_attempts >= 10 THEN
        -- Log the lockout event
        PERFORM audit.log_security_event(
            'ACCOUNT_LOCKOUT',
            'WARNING',
            'user',
            p_username,
            'Auto-lock due to failed login attempts',
            NULL,
            'LOCKED',
            jsonb_build_object('failed_attempts', v_attempts)
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. VIEW FOR SECURITY COMPLIANCE REPORTING
-- ============================================================
-- Consolidated view for security audits and compliance checks.

CREATE OR REPLACE VIEW security_compliance_status AS
SELECT 
    'SSL Configuration' as category,
    'ssl_enabled' as check_name,
    CASE WHEN setting = 'on' THEN 'PASS' ELSE 'FAIL' END as status,
    setting as current_value,
    'SSL must be enabled' as requirement
FROM pg_settings WHERE name = 'ssl'

UNION ALL

SELECT 
    'Password Encryption',
    'password_encryption',
    CASE WHEN setting = 'scram-sha-256' THEN 'PASS' ELSE 'FAIL' END,
    setting,
    'Use SCRAM-SHA-256'
FROM pg_settings WHERE name = 'password_encryption'

UNION ALL

SELECT 
    'Connection Security',
    'log_disconnections',
    CASE WHEN setting = 'on' THEN 'PASS' ELSE 'FAIL' END,
    setting,
    'Log all disconnections'
FROM pg_settings WHERE name = 'log_disconnections'

UNION ALL

SELECT 
    'Row Security',
    'enable_row_security',
    CASE WHEN setting = 'on' THEN 'PASS' ELSE 'FAIL' END,
    setting,
    'Enable row level security'
FROM pg_settings WHERE name = 'enable_row_security';

-- ============================================================
-- 12. MAINTENANCE FUNCTIONS
-- ============================================================
-- Utility functions for security maintenance.

-- Purge old audit records (retain 1 year by default)
CREATE OR REPLACE FUNCTION audit.purge_old_records(retention_days INT DEFAULT 365)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM audit.security_events 
    WHERE event_timestamp < NOW() - (retention_days || ' days')::INTERVAL
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM audit.login_attempts 
    WHERE attempt_time < NOW() - (retention_days || ' days')::INTERVAL;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate daily security summary report
CREATE OR REPLACE FUNCTION audit.generate_daily_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_events INT,
    critical_count INT,
    warning_count INT,
    unique_users INT,
    top_event_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE severity = 'CRITICAL'),
        COUNT(*) FILTER (WHERE severity = 'WARNING'),
        COUNT(DISTINCT user_name),
        (SELECT jsonb_agg(row_to_json(t))
         FROM (SELECT event_type, COUNT(*) as cnt 
               FROM audit.security_events 
               WHERE date(event_timestamp) = p_date
               GROUP BY event_type ORDER BY cnt DESC LIMIT 10) t)
    FROM audit.security_events
    WHERE date(event_timestamp) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DOCUMENTATION: POSTGRESQL HARDENING CHECKLIST
-- ============================================================
-- Verify each item before production deployment:
--
-- [ ] SSL/TLS enabled and enforced
-- [ ] Strong cipher suites configured
-- [ ] Certificate chain validated
-- [ ] Password policy implemented (SCRAM-SHA-256)
-- [ ] Connection limits configured per role
-- [ ] Audit logging enabled (pgaudit)
-- [ ] Row-Level Security enabled on sensitive tables
-- [ ] Encryption at rest configured (TDE/pgcrypto)
-- [ ] Backups encrypted
-- [ ] Public schema privileges revoked
-- [ ] Role hierarchy implemented
-- [ ] Extension installation controlled
-- [ ] Session timeouts configured
-- [ ] Failed login monitoring active
-- [ ] Compliance reporting view functional
-- [ ] Maintenance procedures documented
--
-- References:
-- - CIS PostgreSQL Benchmark: https://www.cisecurity.org/benchmark/postgresql
-- - PostgreSQL Documentation: https://www.postgresql.org/docs/current/security.html
-- - ANOR Telecom Security Guidelines: https://www.anor.dz
-- ============================================================

-- End of PostgreSQL Security Hardening Script
