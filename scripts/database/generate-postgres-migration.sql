-- ============================================================
-- National SOC Platform - SQLite to PostgreSQL Migration Script
-- ============================================================
--
-- This script converts the SQLite schema to PostgreSQL format
-- with optimizations for production use.
--
-- Usage:
--   1. Create PostgreSQL database
--   2. Run this script with: psql -U soc_admin -d national_soc -f generate-postgres-migration.sql
--   3. Migrate data using pgloader or custom scripts
--
-- Version: 1.0.0
-- Compatible with: PostgreSQL 15+, Prisma 5.x
-- ============================================================

-- Start transaction
BEGIN;

-- ============================================================
-- EXTENSIONS (PostgreSQL-specific features)
-- ============================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Case-insensitive text (useful for emails, usernames)
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable UUID generation by default
-- Note: In Prisma, use @default(uuid()) which maps to uuid_generate_v4()

-- ============================================================
-- ENUM TYPES (PostgreSQL native enums)
-- ============================================================

CREATE TYPE severity_enum AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');
CREATE TYPE alert_status_enum AS ENUM ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE alert_type_enum AS ENUM ('DETECTION', 'ANOMALY', 'CORRELATION', 'THREAT_INTEL');
CREATE TYPE incident_type_enum AS ENUM (
    'NETWORK_INTRUSION', 'MALWARE', 'DATA_BREACH', 'DDoS', 
    'TELECOM_FRAUD', 'SS7_ATTACK', 'APT', 'INSIDER_THREAT',
    'PHYSICAL_SECURITY', 'THIRD_PARTY', 'POLICY_VIOLATION'
);
CREATE TYPE incident_status_enum AS ENUM (
    'OPEN', 'IN_PROGRESS', 'CONTAINMENT', 'ERADICATION', 
    'RECOVERY', 'LESSONS_LEARNED', 'CLOSED'
);
CREATE TYPE indicator_type_enum AS ENUM (
    'IPV4', 'IPV6', 'DOMAIN', 'URL', 'EMAIL', 
    'FILE_HASH_MD5', 'FILE_HASH_SHA1', 'FILE_HASH_SHA256', 
    'IMSI', 'IMEI', 'MSISDN', 'CVE'
);
CREATE TYPE tlp_level_enum AS ENUM ('WHITE', 'GREEN', 'AMBER', 'RED');
CREATE TYPE fraud_type_enum AS ENUM (
    'SIM_SWAP_FRAUD', 'IRSF', 'PBX_HACK', 'PREMIUM_RATE', 
    'BONUS_ABUSE', 'LOCATION_TRACKING', 'INTERCEPTION'
);
CREATE TYPE subscriber_status_enum AS ENUM (
    'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'FRAUD_LOCKED', 'BARRED'
);
CREATE TYPE element_status_enum AS ENUM ('OPERATIONAL', 'DEGRADED', 'DOWN', 'MAINTENANCE', 'UNKNOWN');
CREATE TYPE auth_level_enum AS ENUM ('none', 'partial', 'authenticated', 'mfa_verified', 'elevated');

-- ============================================================
-- DOMAIN 1: AUTHENTICATION & AUTHORIZATION
-- ============================================================

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'User roles and permissions for SOC platform';

-- Users table (PostgreSQL optimized)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,  -- case-insensitive email
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    last_login_at TIMESTAMPTZ(6),
    password_changed_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    
    -- LDAP/AD Integration fields
    ldap_dn TEXT,
    ldap_guid UUID,
    ldap_sid VARCHAR(255),
    employee_id VARCHAR(100),
    department VARCHAR(255),
    
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_department ON users(department);

COMMENT ON TABLE users IS 'SOC platform user accounts';

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    permissions JSONB DEFAULT '{}'::jsonb,
    last_used_at TIMESTAMPTZ(6),
    expires_at TIMESTAMPTZ(6),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_api_keys_name_user UNIQUE(name, user_id)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,  -- IPv6 support
    user_agent TEXT,
    auth_level VARCHAR(50) DEFAULT 'authenticated',
    device_info JSONB,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    last_activity_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ(6),
    invalid_reason VARCHAR(255)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_auth_level ON sessions(auth_level);

-- ============================================================
-- DOMAIN 2: SECURITY ALERTS & INCIDENTS
-- ============================================================

-- Alerts table (high volume, optimized for querying)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity severity_enum NOT NULL,
    status alert_status_enum NOT NULL DEFAULT 'NEW',
    alert_type alert_type_enum NOT NULL DEFAULT 'DETECTION',
    source VARCHAR(100) NOT NULL,
    source_ip VARCHAR(45),
    dest_ip VARCHAR(45),
    source_port INTEGER,
    dest_port INTEGER,
    protocol VARCHAR(20),
    raw_event JSONB,
    mitre_technique_id VARCHAR(20),  -- e.g., T1035
    mitre_tactic VARCHAR(100),
    confidence_score DECIMAL(5,2),
    assigned_to_id UUID REFERENCES users(id),
    incident_id UUID,  -- Will be foreign key after incidents table
    suppression_rule_id UUID,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB,
    first_seen TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_source ON alerts(source);
CREATE INDEX idx_alerts_incident_id ON alerts(incident_id);
CREATE INDEX idx_alerts_assigned_to_id ON alerts(assigned_to_id);
CREATE INDEX idx_alerts_first_seen ON alerts(first_seen);
CREATE INDEX idx_alerts_severity_status ON alerts(severity, status);
CREATE INDEX idx_alerts_source_first_seen ON alerts(source, first_seen);
CREATE INDEX idx_alerts_mitre_technique_id ON alerts(mitre_technique_id);

-- Full-text search index on title
CREATE INDEX idx_alerts_title_fts ON alerts USING gin(to_tsvector('simple', title));

-- Alert Comments
CREATE TABLE alert_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_comments_alert_id ON alert_comments(alert_id);
CREATE INDEX idx_alert_comments_user_id ON alert_comments(user_id);

-- Suppression Rules
CREATE TABLE suppression_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filter_criteria JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    suppress_forever BOOLEAN DEFAULT false,
    suppress_until TIMESTAMPTZ(6),
    match_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppression_rules_is_active ON suppression_rules(is_active);
CREATE INDEX idx_suppression_rules_suppress_until ON suppression_rules(suppress_until);

-- Incidents table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tatc_code VARCHAR(50) UNIQUE NOT NULL,  -- TATC-2026-0001
    title VARCHAR(500) NOT NULL,
    description TEXT,
    incident_type incident_type_enum NOT NULL,
    severity severity_enum NOT NULL,
    status incident_status_enum NOT NULL DEFAULT 'OPEN',
    phase VARCHAR(50),  -- DETECTION, TRIAGE, CONTAINMENT, etc.
    assigned_to_id UUID REFERENCES users(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    impact_score DECIMAL(3,1),  -- 1.0-10.0
    confidence_score DECIMAL(5,2),  -- 0-100
    blast_radius TEXT,
    affected_assets JSONB,
    affected_services JSONB,
    affected_subscribers INTEGER,
    root_cause_analysis JSONB,
    containment_actions JSONB,
    eradication_steps JSONB,
    lessons_learned JSONB,
    sla_breach BOOLEAN DEFAULT false,
    sla_deadline TIMESTAMPTZ(6),
    resolved_at TIMESTAMPTZ(6),
    closed_at TIMESTAMPTZ(6),
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);
CREATE INDEX idx_incidents_assigned_to_id ON incidents(assigned_to_id);
CREATE INDEX idx_incidents_tatc_code ON incidents(tatc_code);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_status_severity ON incidents(status, severity);

-- Add foreign key from alerts to incidents
ALTER TABLE alerts ADD CONSTRAINT fk_alerts_incident 
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL;

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'TODO',  -- TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED
    priority VARCHAR(20) DEFAULT 'MEDIUM',  -- CRITICAL, HIGH, MEDIUM, LOW
    due_date TIMESTAMPTZ(6),
    completed_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_incident_id ON tasks(incident_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

-- Evidence Files
CREATE TABLE evidence_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,  -- bytes
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    hash_sha256 VARCHAR(64),
    description TEXT,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_files_incident_id ON evidence_files(incident_id);

-- Timeline Events
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- STATUS_CHANGE, NOTE, EVIDENCE_ADDED, etc.
    title VARCHAR(500) NOT NULL,
    content TEXT,
    metadata JSONB,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_events_incident_id ON timeline_events(incident_id);
CREATE INDEX idx_timeline_events_alert_id ON timeline_events(alert_id);
CREATE INDEX idx_timeline_events_event_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_events_created_at ON timeline_events(created_at);

-- ============================================================
-- DOMAIN 3: THREAT INTELLIGENCE
-- ============================================================

-- Threat Indicators
CREATE TABLE threat_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type indicator_type_enum NOT NULL,
    value TEXT NOT NULL,
    confidence DECIMAL(5,2) DEFAULT 50.00,
    source VARCHAR(100) NOT NULL,  -- OSINT, Internal, Partner, Feed, Hunting
    threat_actor VARCHAR(255),
    malware_family VARCHAR(255),
    campaign_id UUID,
    is_active BOOLEAN DEFAULT true,
    first_seen TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMPTZ(6),
    tags JSONB DEFAULT '[]'::jsonb,
    context JSONB,
    kill_chain_phase VARCHAR(100),
    tlp_level tlp_level_enum DEFAULT 'WHITE',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threat_indicators_type ON threat_indicators(type);
CREATE INDEX idx_threat_indicators_value ON threat_indicators(value);  -- For lookups
CREATE INDEX idx_threat_indicators_is_active ON threat_indicators(is_active);
CREATE INDEX idx_threat_indicators_confidence ON threat_indicators(confidence);
CREATE INDEX idx_threat_indicators_threat_actor ON threat_indicators(threat_actor);
CREATE INDEX idx_threat_indicators_source ON threat_indicators(source);
CREATE INDEX idx_threat_indicators_type_value ON threat_indicators(type, value);

-- GIN index for JSONB queries on context
CREATE INDEX idx_threat_indicators_context ON threat_indicators USING gin(context);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    alias VARCHAR(100),
    description TEXT,
    threat_actor VARCHAR(255),
    attribution_confidence DECIMAL(5,2),
    status VARCHAR(30) DEFAULT 'ACTIVE',  -- ACTIVE, DORMANT, CONCLUDED, UNKNOWN
    target_sector VARCHAR(100),
    target_region VARCHAR(100),
    objectives JSONB,
    techniques_used JSONB,
    financial_impact BIGINT,  -- estimated in DZD or USD
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_threat_actor ON campaigns(threat_actor);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_is_active ON campaigns(is_active);

ALTER TABLE threat_indicators ADD CONSTRAINT fk_threat_indicators_campaign 
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id);

-- ============================================================
-- DOMAIN 4: TELECOM/SS7 SPECIFIC
-- ============================================================

-- SS7 Messages (HIGH VOLUME - consider partitioning)
CREATE TABLE ss7_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_code INTEGER NOT NULL,  -- SS7 message code
    message_type VARCHAR(50) NOT NULL,  -- ISIAM, SRI_REQ, ATI_REQ, etc.
    originating_gt VARCHAR(50) NOT NULL,
    destination_gt VARCHAR(50) NOT NULL,
    originating_point_code VARCHAR(20),
    destination_point_code VARCHAR(20),
    sccp_layer VARCHAR(20),  -- TCAP, MAP, CAP, ISUP
    global_title VARCHAR(100),
    imsi VARCHAR(30),
    msisdn VARCHAR(20),
    timestamp TIMESTAMPTZ(6) NOT NULL,
    raw_data JSONB,
    parsed_data JSONB,
    anomaly_score DECIMAL(5,2),
    is_anomalous BOOLEAN DEFAULT false,
    alert_id UUID,
    network_element_id UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Partitioning hint: Uncomment below for time-based partitioning
-- CREATE INDEX idx_ss7_messages_timestamp ON ss7_messages(timestamp);
CREATE INDEX idx_ss7_messages_message_type ON ss7_messages(message_type);
CREATE INDEX idx_ss7_messages_originating_gt_timestamp ON ss7_messages(originating_gt, timestamp);
CREATE INDEX idx_ss7_messages_destination_gt ON ss7_messages(destination_gt);
CREATE INDEX idx_ss7_messages_imsi ON ss7_messages(imsi);
CREATE INDEX idx_ss7_messages_msisdn ON ss7_messages(msisdn);
CREATE INDEX idx_ss7_messages_is_anomalous ON ss7_messages(is_anomalous);

-- Fraud Detections
CREATE TABLE fraud_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fraud_type fraud_type_enum NOT NULL,
    severity severity_enum NOT NULL,
    status VARCHAR(30) DEFAULT 'DETECTED',  -- DETECTED, INVESTIGATING, CONFIRMED, etc.
    subscriber_imsi VARCHAR(30),
    subscriber_msisdn VARCHAR(20),
    subscriber_imei VARCHAR(20),
    amount_affected DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'DZD',
    detection_method VARCHAR(100) NOT NULL,
    detection_rule_id UUID,
    assigned_analyst_id UUID,
    incident_id UUID,
    first_occurrence TIMESTAMPTZ(6) NOT NULL,
    last_occurrence TIMESTAMPTZ(6) NOT NULL,
    resolved_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_detections_fraud_type ON fraud_detections(fraud_type);
CREATE INDEX idx_fraud_detections_status ON fraud_detections(status);
CREATE INDEX idx_fraud_detections_subscriber_msisdn ON fraud_detections(subscriber_msisdn);
CREATE INDEX idx_fraud_detections_severity ON fraud_detections(severity);
CREATE INDEX idx_fraud_detections_detection_method ON fraud_detections(detection_method);

-- Subscribers
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imsi VARCHAR(30) UNIQUE NOT NULL,
    msisdn VARCHAR(20) UNIQUE NOT NULL,
    imei VARCHAR(20),
    imsi_type VARCHAR(20),  -- PREPAID, POSTPAID, ROAMING, CORPORATE
    subscriber_status subscriber_status_enum DEFAULT 'ACTIVE',
    roaming_status VARCHAR(30),  -- HOME, INTERNATIONAL_ROAMING, NATIONAL_ROAMING
    home_country CHAR(3),  -- ISO 3166-1 alpha-3 (DZA for Algeria)
    visited_country CHAR(3),
    risk_score DECIMAL(5,2) DEFAULT 0,  -- 0-100
    fraud_flags JSONB DEFAULT '[]'::jsonb,
    location_lac INTEGER,
    location_cell_id INTEGER,
    last_activity_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscribers_msisdn ON subscribers(msisdn);
CREATE INDEX idx_subscribers_risk_score ON subscribers(risk_score);
CREATE INDEX idx_subscribers_subscriber_status ON subscribers(subscriber_status);
CREATE INDEX idx_subscribers_imsi_type ON subscribers(imsi_type);

-- Network Elements
CREATE TABLE network_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    element_type VARCHAR(50) NOT NULL,  -- HLR_HSS, STP, MSC, GMSC, SGSN, GGSN_PGW, etc.
    hostname VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    vendor VARCHAR(100),  -- Huawei, Ericsson, Nokia, ZTE, Samsung
    software_version VARCHAR(100),
    serial_number VARCHAR(100),
    status element_status_enum DEFAULT 'OPERATIONAL',
    capacity DECIMAL(5,2),  -- percentage used
    location VARCHAR(255),
    security_zone VARCHAR(50),  -- Core_Zone, DMZ, Access_Zone, OAM_Zone
    last_heartbeat TIMESTAMPTZ(6),
    metadata JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_elements_element_type ON network_elements(element_type);
CREATE INDEX idx_network_elements_status ON network_elements(status);
CREATE INDEX idx_network_elements_vendor ON network_elements(vendor);
CREATE INDEX idx_network_elements_security_zone ON network_elements(security_zone);

-- Add foreign keys for SS7 tables
ALTER TABLE ss7_messages ADD CONSTRAINT fk_ss7_messages_alert 
    FOREIGN KEY (alert_id) REFERENCES alerts(id);
ALTER TABLE ss7_messages ADD CONSTRAINT fk_ss7_messages_network_element 
    FOREIGN KEY (network_element_id) REFERENCES network_elements(id);

-- ============================================================
-- DOMAIN 5: COMPLIANCE & AUDIT (ARTP/ANSSI)
-- ============================================================

-- Compliance Checklists
CREATE TABLE compliance_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework VARCHAR(50) NOT NULL,  -- ARTP, ANSSI, ISO27001, NIST, GDPR
    category VARCHAR(100) NOT NULL,
    requirement_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    control_objective TEXT,
    status VARCHAR(30) DEFAULT 'NOT_ASSESSED',  -- COMPLIANT, PARTIAL, NON_COMPLIANT, etc.
    risk_rating VARCHAR(20),  -- CRITICAL, HIGH, MEDIUM, LOW
    evidence_required BOOLEAN DEFAULT true,
    evidence_files JSONB DEFAULT '[]'::jsonb,
    findings JSONB,
    remediation_plan JSONB,
    remediation_due DATE,
    owner_department VARCHAR(100),
    reviewer_id UUID,
    last_assessment_at TIMESTAMPTZ(6),
    next_assessment_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_checklists_framework ON compliance_checklists(framework);
CREATE INDEX idx_compliance_checklists_category ON compliance_checklists(category);
CREATE INDEX idx_compliance_checklists_status ON compliance_checklists(status);
CREATE INDEX idx_compliance_checklists_requirement_id ON compliance_checklists(requirement_id);

-- Audit Logs (HIGH VOLUME - consider partitioning)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,  -- LOGIN, LOGOUT, CREATE, READ, UPDATE, DELETE, EXPORT, CONFIG_CHANGE
    resource_type VARCHAR(100) NOT NULL,  -- User, Alert, Incident, Config, etc.
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id UUID,
    outcome VARCHAR(20) DEFAULT 'SUCCESS',  -- SUCCESS, FAILURE, ERROR
    error_message TEXT,
    duration_ms INTEGER,  -- Request duration in milliseconds
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_outcome ON audit_logs(outcome);
CREATE INDEX idx_audit_logs_action_created_at ON audit_logs(action, created_at);

-- ============================================================
-- DOMAIN 6: SYSTEM CONFIGURATION
-- ============================================================

-- System Config
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'GENERAL',  -- GENERAL, SECURITY, TELECOM, COMPLIANCE, INTEGRATION, PERFORMANCE
    is_sensitive BOOLEAN DEFAULT false,
    value_type VARCHAR(20) DEFAULT 'STRING',  -- STRING, NUMBER, BOOLEAN, JSON
    updated_by UUID,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_configs_category ON system_configs(category);

-- System Health Metrics (TIME SERIES - consider partitioning)
CREATE TABLE system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,  -- CPU, MEMORY, DISK, NETWORK, LATENCY, ERROR_RATE, THROUGHPUT
    component VARCHAR(100) NOT NULL,  -- API_SERVER, DATABASE, REDIS, KAFKA, ELASTICSEARCH, etc.
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),  -- percent, mb, gb, ms, requests_per_sec, etc.
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    status VARCHAR(20) DEFAULT 'UNKNOWN',  -- OK, WARNING, CRITICAL, UNKNOWN
    recorded_at TIMESTAMPTZ(6) NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_health_metrics_metric_name ON system_health_metrics(metric_name);
CREATE INDEX idx_system_health_metrics_component ON system_health_metrics(component);
CREATE INDEX idx_system_health_metrics_recorded_at ON system_health_metrics(recorded_at);
CREATE INDEX idx_system_health_metrics_status ON system_health_metrics(status);
CREATE INDEX idx_system_health_metrics_component_recorded_at ON system_health_metrics(component, recorded_at);

-- ============================================================
-- DOMAIN 7: PLAYBOOKS & AUTOMATION (SOAR)
-- ============================================================

-- Playbooks
CREATE TABLE playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- INCIDENT_RESPONSE, THREAT_HUNTING, ENRICHMENT, CONTAINMENT, ERADICATION
    trigger_conditions JSONB NOT NULL,
    steps JSONB NOT NULL,  -- Array of playbook steps
    variables JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_draft BOOLEAN DEFAULT true,
    author_id UUID NOT NULL,
    reviewer_id UUID,
    last_run_at TIMESTAMPTZ(6),
    total_runs INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbooks_category ON playbooks(category);
CREATE INDEX idx_playbooks_is_active ON playbooks(is_active);
CREATE INDEX idx_playbooks_is_draft ON playbooks(is_draft);

-- Playbook Executions
CREATE TABLE playbook_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id),
    triggered_by UUID NOT NULL,  -- User ID or system ID
    incident_id UUID,
    alert_id UUID,
    status VARCHAR(30) DEFAULT 'RUNNING',  -- RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER,
    input_variables JSONB,
    output_results JSONB,
    error_details TEXT,
    started_at TIMESTAMPTZ(6) NOT NULL,
    completed_at TIMESTAMPTZ(6),
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_executions_playbook_id ON playbook_executions(playbook_id);
CREATE INDEX idx_playbook_executions_status ON playbook_executions(status);
CREATE INDEX idx_playbook_executions_started_at ON playbook_executions(started_at);

-- ============================================================
-- POST-MIGRATION OPTIMIZATIONS
-- ============================================================

-- Update statistics for query planner
ANALYZE;

-- Create materialized views for common aggregations (optional)
-- CREATE MATERIALIZED VIEW mv_alert_summary AS
-- SELECT 
--     DATE_TRUNC('day', created_at) as day,
--     severity,
--     COUNT(*) as count
-- FROM alerts
-- GROUP BY DATE_TRUNC('day', created_at), severity;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO soc_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO soc_app;

-- Commit transaction
COMMIT;

-- ============================================================
-- PARTITIONING EXAMPLES (for high-volume tables)
-- ============================================================
/*
-- Example: Monthly partitioning for alerts (uncomment if needed)

-- Create parent table as partitioned
CREATE TABLE alerts_partitioned (
    LIKE alerts INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create initial partitions
CREATE TABLE alerts_2026_01 PARTITION OF alerts_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE alerts_2026_02 PARTITION OF alerts_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Function to auto-create new partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        table_name,
        start_date,
        end_date
    );
END;
$$ LANGUAGE plpgsql;
*/

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these after migration to verify:
/*
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check row counts (should be 0 after schema creation)
SELECT 'users' as tbl, COUNT(*) FROM users
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'threat_indicators', COUNT(*) FROM threat_indicators;

-- Verify indexes are created
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Check enum types
SELECT typname FROM pg_type WHERE typtype = 'e';
*/

-- Migration complete!
