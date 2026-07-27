-- ============================================================
-- National SOC Platform - PostgreSQL Initialization Script
-- Run this once to set up production database
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text similarity searches

-- ============================================================
-- Create custom types (enums)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM (
        'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED',
        'FALSE_POSITIVE', 'ESCALATED', 'SUPPRESSED', 'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_phase AS ENUM (
        'DETECTION', 'TRIAGE', 'CONTAINMENT', 'ERADICATION',
        'RECOVERY', 'LESSONS_LEARNED', 'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ioc_type AS ENUM (
        'IP_ADDRESS', 'DOMAIN', 'URL', 'HASH_MD5', 'HASH_SHA1',
        'HASH_SHA256', 'EMAIL', 'PHONE_NUMBER', 'IMSI', 'IMEI',
        'MSISDN', 'FILE_NAME'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM (
        'ACTIVE', 'DORMANT', 'CONTAINED', 'ERADICATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE subscriber_status AS ENUM (
        'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PREPAID', 'POSTPAID'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE roaming_status AS ENUM (
        'HOME', 'INTERNATIONAL_ROAMING', 'NATIONAL_ROAMING'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM (
        'ACTIVE', 'TERMINATED', 'TIMEOUT', 'ERROR'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_category AS ENUM (
        'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS',
        'CONFIGURATION', 'INCIDENT_MANAGEMENT', 'SYSTEM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Create tables with PostgreSQL optimizations
-- ============================================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Network Elements table
CREATE TABLE IF NOT EXISTS network_elements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    element_type TEXT NOT NULL,  -- HLR, MSC, SGSN, GGSN, etc.
    ip_address TEXT NOT NULL,
    vendor TEXT,
    software_version TEXT,
    status TEXT NOT NULL DEFAULT 'OPERATIONAL',
    location TEXT,
    region TEXT,
    config JSONB,
    metadata JSONB,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_elements_type ON network_elements(element_type);
CREATE INDEX idx_network_elements_ip ON network_elements(ip_address);
CREATE INDEX idx_network_elements_status ON network_elements(status);
CREATE INDEX idx_network_elements_region ON network_elements(region);

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    msisdn TEXT NOT NULL UNIQUE,
    imsi TEXT UNIQUE,
    imei TEXT,
    subscriber_status subscriber_status NOT NULL DEFAULT 'ACTIVE',
    roaming_status roaming_status NOT NULL DEFAULT 'HOME',
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    is_roaming BOOLEAN NOT NULL DEFAULT false,
    home_msc TEXT,
    visited_msc TEXT,
    home_sgsn TEXT,
    visited_sgsn TEXT,
    profile_data JSONB,
    metadata JSONB,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscribers_msisdn ON subscribers(msisdn);
CREATE INDEX idx_subscribers_imsi ON subscribers(imsi);
CREATE INDEX idx_subscribers_risk_score ON subscribers(risk_score);
CREATE INDEX idx_subscriber_status ON subscribers(subscriber_status);
CREATE INDEX idx_subscribers_roaming ON subscribers(roaming_status);
CREATE INDEX idx_subscribers_last_seen ON subscribers(last_seen);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    threat_actor TEXT,
    campaign_status campaign_status NOT NULL DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    ttps JSONB,  -- Tactics, Techniques, Procedures
    target_sectors JSONB,
    mitre_techniques JSONB[],
    severity TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(campaign_status);
CREATE INDEX idx_campaigns_threat_actor ON campaigns(threat_actor);
CREATE INDEX idx_campaigns_is_active ON campaigns(is_active);

-- Threat Indicators table
CREATE TABLE IF NOT EXISTS threat_indicators (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    indicator_type TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    severity TEXT,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    tags TEXT[],
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threat_indicators_type ON threat_indicators(indicator_type);
CREATE INDEX idx_threat_indicators_value ON threat_indicators(value);
CREATE INDEX idx_threat_indicators_source ON threat_indicators(source);
CREATE INDEX idx_threat_indicators_campaign ON threat_indicators(campaign_id);
CREATE INDEX idx_threat_indicators_active ON threat_indicators(is_active);
CREATE GIN INDEX idx_threat_indicators_tags ON threat_indicators USING gin(tags);

-- IOCs (Indicators of Compromise)
CREATE TABLE IF NOT EXISTS iocs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type ioc_type NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    source TEXT,
    threat_level TEXT NOT NULL DEFAULT 'MEDIUM',
    is_validated BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    tags TEXT[],
    context JSONB,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_iocs_type ON iocs(type);
CREATE INDEX idx_iocs_value ON iocs(value);
CREATE INDEX idx_iocs_source ON iocs(source);
CREATE INDEX idx_iocs_validated ON iocs(is_validated);
CREATE INDEX idx_iocs_active ON iocs(is_active);
CREATE GIN INDEX idx_iocs_tags ON iocs USING gin(tags);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    severity alert_severity NOT NULL DEFAULT 'MEDIUM',
    status alert_status NOT NULL DEFAULT 'NEW',
    source TEXT NOT NULL,  -- SIEM, IDS, SOC Analyst, etc.
    source_ref TEXT,      -- Reference ID from source system
    category TEXT,
    raw_event JSONB,
    ioc_id TEXT REFERENCES iocs(id) ON DELETE SET NULL,
    incident_id TEXT,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution TEXT,
    tags TEXT[],
    mitre_tactics TEXT[],
    mitre_techniques TEXT[],
    context JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_source ON alerts(source);
CREATE INDEX idx_alerts_first_seen ON alerts(first_seen);
CREATE INDEX idx_alerts_incident ON alerts(incident_id);
CREATE INDEX idx_alerts_assigned ON alerts(assigned_to);
CREATE INDEX idx_alerts_ioc ON alerts(ioc_id);
CREATE INDEX idx_alerts_created ON alerts(created_at);
CREATE GIN INDEX idx_alerts_tags ON alerts USING gin(tags);
CREATE GIN INDEX idx_alerts_raw ON alerts USING gin(raw_event);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tatc_code TEXT UNIQUE,  -- Telecom Algeria Threat Code
    title TEXT NOT NULL,
    description TEXT,
    severity incident_severity NOT NULL DEFAULT 'MEDIUM',
    status incident_status NOT NULL DEFAULT 'OPEN',
    phase incident_phase NOT NULL DEFAULT 'DETECTION',
    source TEXT,
    impact_assessment TEXT,
    affected_assets JSONB,
    affected_subscribers_count INTEGER DEFAULT 0,
    sla_breach BOOLEAN NOT NULL DEFAULT false,
    sla_target TIMESTAMPTZ,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    eradicated_at TIMESTAMPTZ,
    recovered_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    root_cause_analysis TEXT,
    lessons_learned TEXT,
    reporter_id TEXT REFERENCES users(id),
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    tags TEXT[],
    timeline JSONB[],  -- Array of timeline events
    artifacts JSONB,
    cost_estimate DECIMAL(12,2),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tatc ON incidents(tatc_code);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_phase ON incidents(phase);
CREATE INDEX idx_incidents_detected ON incidents(detected_at);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assignee ON incidents(assignee_id);
CREATE INDEX idx_incidents_campaign ON incidents(campaign_id);
CREATE INDEX idx_incidents_sla ON incidents(sla_breach);
CREATE GIN INDEX idx_incidents_tags ON incidents USING gin(tags);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'PENDING',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    checklist JSONB,  -- Array of subtasks
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_incident ON tasks(incident_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due ON tasks(due_date);

-- Incident Updates table
CREATE TABLE IF NOT EXISTS incident_updates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id),
    update_type TEXT NOT NULL,  -- STATUS_CHANGE, NOTE, EVIDENCE, ACTION_TAKEN
    content TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    attachments JSONB,
    internal_only BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_updates_incident ON incident_updates(incident_id);
CREATE INDEX idx_updates_author ON incident_updates(author_id);
CREATE INDEX idx_updates_created ON incident_updates(created_at);

-- SS7 Messages table (Telecom protocol data)
CREATE TABLE IF NOT EXISTS ss7_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    message_type TEXT NOT NULL,
    calling_party TEXT,
    called_party TEXT,
    gtt_address TEXT,
    imsi TEXT,
    msisdn TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    block_reason TEXT,
    anomaly_score INTEGER CHECK (anomaly_score >= 0 AND anomaly_score <= 100),
    raw_message BYTEA,
    parsed_fields JSONB,
    source_ne TEXT,
    destination_ne TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ss7_timestamp ON ss7_messages(timestamp);
CREATE INDEX idx_ss7_calling ON ss7_messages(calling_party);
CREATE INDEX idx_ss7_called ON ss7_messages(called_party);
CREATE INDEX idx_ss7_imsi ON ss7_messages(imsi);
CREATE INDEX idx_ss7_blocked ON ss7_messages(is_blocked);
CREATE INDEX idx_ss7_anomaly ON ss7_messages(anomaly_score);
CREATE INDEX idx_ss7_type ON ss7_messages(message_type);

-- GTP Sessions table
CREATE TABLE IF NOT EXISTS gtp_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL,
    imsi TEXT,
    msisdn TEXT,
    imei TEXT,
    apn TEXT,
    sgsn_address TEXT,
    ggsn_address TEXT,
    ip_address INET,
    session_status session_status NOT NULL DEFAULT 'ACTIVE',
    bytes_up BIGINT DEFAULT 0,
    bytes_down BIGINT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    anomaly_score INTEGER CHECK (anomaly_score >= 0 AND anomaly_score <= 100),
    rat_type TEXT,  -- Radio Access Technology
    location_info JSONB,
    qos_profile JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnect_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gtp_session ON gtp_sessions(session_id);
CREATE INDEX idx_gtp_imsi ON gtp_sessions(imsi);
CREATE INDEX idx_gtp_ip ON gtp_sessions(ip_address);
CREATE INDEX idx_gtp_status ON gtp_sessions(session_status);
CREATE INDEX idx_gtp_started ON gtp_sessions(started_at);
CREATE INDEX idx_gtp_anomaly ON gtp_sessions(anomaly_score);

-- SIP Sessions table
CREATE TABLE IF NOT EXISTS sip_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    call_id TEXT NOT NULL,
    calling_party TEXT,
    called_party TEXT,
    sip_method TEXT,
    sip_status INTEGER,
    invite_timestamp TIMESTAMPTZ,
    connect_timestamp TIMESTAMPTZ,
    disconnect_timestamp TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    sip_server TEXT,
    user_agent TEXT,
    is_fraud_suspected BOOLEAN NOT NULL DEFAULT false,
    fraud_type TEXT,
    raw_sip TEXT,
    signaling_data JSONB,
    media_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sip_call ON sip_sessions(call_id);
CREATE INDEX idx_sip_calling ON sip_sessions(calling_party);
CREATE INDEX idx_sip_called ON sip_sessions(called_party);
CREATE INDEX idx_sip_connect ON sip_sessions(connect_timestamp);
CREATE INDEX idx_sip_fraud ON sip_sessions(is_fraud_suspected);

-- Diameter Sessions table
CREATE TABLE IF NOT EXISTS diameter_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL,
    command_code INTEGER,
    application_id INTEGER,
    origin_host TEXT,
    origin_realm TEXT,
    destination_host TEXT,
    destination_realm TEXT,
    imsi TEXT,
    msisdn TEXT,
    session_status session_status NOT NULL DEFAULT 'ACTIVE',
    result_code INTEGER,
    avps JSONB,  # Attribute Value Pairs
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diameter_session ON diameter_sessions(session_id);
CREATE INDEX idx_diameter_command ON diameter_sessions(command_code);
CREATE INDEX idx_diameter_imsi ON diameter_sessions(imsi);
CREATE INDEX idx_diameter_status ON diameter_sessions(session_status);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    outcome TEXT NOT NULL,
    category audit_category NOT NULL DEFAULT 'SYSTEM',
    ip_address TEXT,
    user_agent TEXT,
    request_details JSONB,
    response_details JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource);
CREATE INDEX idx_audit_category ON audit_logs(category);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_outcome ON audit_logs(outcome);

-- ============================================================
-- Create optimized views for common queries
-- ============================================================

-- Active Incidents View
CREATE OR REPLACE VIEW v_active_incidents AS
SELECT 
    i.*,
    u.name as assignee_name,
    COUNT(DISTINCT a.id) as alert_count,
    COUNT(DISTINCT t.id) as task_count
FROM incidents i
LEFT JOIN users u ON i.assignee_id = u.id
LEFT JOIN alerts a ON a.incident_id = i.id
LEFT JOIN tasks t ON t.incident_id = i.id
WHERE i.status NOT IN ('RESOLVED', 'CLOSED')
GROUP BY i.id, u.name;

-- High Risk Subscribers View
CREATE OR REPLACE VIEW v_high_risk_subscribers AS
SELECT * FROM subscribers 
WHERE risk_score >= 70 
AND subscriber_status = 'ACTIVE'
ORDER BY risk_score DESC;

-- Recent Alerts Summary View
CREATE OR REPLACE VIEW v_recent_alerts_summary AS
SELECT 
    DATE_TRUNC('hour', first_seen) as hour_bucket,
    severity,
    COUNT(*) as alert_count,
    COUNT(*) FILTER (WHERE status = 'NEW') as new_count,
    COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED') as ack_count
FROM alerts
WHERE first_seen > NOW() - INTERVAL '24 hours'
GROUP BY hour_bucket, severity
ORDER BY hour_bucket DESC;

-- System Health Dashboard View
CREATE OR REPLACE VIEW v_system_health AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM alerts WHERE status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS')) as active_alerts,
    (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('RESOLVED', 'CLOSED')) as open_incidents,
    (SELECT COUNT(*) FROM subscribers WHERE risk_score > 70 AND subscriber_status = 'ACTIVE') as high_risk_subs,
    (SELECT COUNT(*) FROM ss7_messages WHERE timestamp > NOW() - INTERVAL '1 hour') as ss7_msgs_1h,
    (SELECT COUNT(*) FROM gtp_sessions WHERE session_status = 'ACTIVE') as active_gtp_sessions;

-- ============================================================
-- Create functions for automated operations
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables that need updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscribers_updated_at BEFORE UPDATE ON subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_network_elements_updated_at BEFORE UPDATE ON network_elements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_threat_indicators_updated_at BEFORE UPDATE ON threat_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_iocs_updated_at BEFORE UPDATE ON iocs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate subscriber risk score
CREATE OR REPLACE FUNCTION calculate_subscriber_risk(p_subscriber_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_risk_score INTEGER := 0;
    v_alert_count INTEGER;
    v_anomaly_avg NUMERIC;
BEGIN
    -- Count recent high-severity alerts for this subscriber
    SELECT COUNT(*) INTO v_alert_count
    FROM alerts a
    JOIN ss7_messages s ON s.imsi = (SELECT imsi FROM subscribers WHERE id = p_subscriber_id)
    WHERE a.severity IN ('CRITICAL', 'HIGH')
    AND a.first_seen > NOW() - INTERVAL '7 days';
    
    -- Get average anomaly score from recent sessions
    SELECT COALESCE(AVG(anomaly_score), 0) INTO v_anomaly_avg
    FROM gtp_sessions
    WHERE imsi = (SELECT imsi FROM subscribers WHERE id = p_subscriber_id)
    AND started_at > NOW() - INTERVAL '24 hours';
    
    -- Calculate composite score
    v_risk_score := LEAST(100, (v_alert_count * 10) + ROUND(v_anomaly_avg::INTEGER));
    
    UPDATE subscribers SET risk_score = v_risk_score WHERE id = p_subscriber_id;
    
    RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Insert initial seed data
-- ============================================================

INSERT INTO roles (id, name, description, permissions) VALUES
('role-admin-001', 'soc_admin', 'Full system administrator', '["*"]'),
('role-analyst-001', 'analyst', 'Security analyst with read/write access', '["alerts:read", "alerts:write", "incidents:read", "incidents:write", "threats:read", "dashboard:read"]'),
('role-hunter-001', 'threat_hunter', 'Threat hunting specialist', '["alerts:read", "incidents:read", "threats:read", "threats:write", "ioc:manage", "campaigns:manage"]'),
('role-engineer-001', 'telecom_engineer', 'Telecom network engineer', '["telecom:read", "telecom:write", "subscribers:read", "network-elements:read"]'),
('role-compliance-001', 'compliance_officer', 'Compliance and audit access', '["audit:read", "reports:read", "compliance:read"]')
ON CONFLICT (name) DO NOTHING;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE '✅ National SOC Platform PostgreSQL schema initialized successfully!';
    RAISE NOTICE '   - Created 18 tables';
    RAISE NOTICE '   - Created 15 enum types';
    RAISE NOTICE '   - Created 4 optimized views';
    RAISE NOTICE '   - Created utility functions';
    RAISE NOTICE '   - Inserted default roles';
END $$;
