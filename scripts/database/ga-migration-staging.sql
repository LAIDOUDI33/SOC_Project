-- =============================================================================
-- CyberSOC Platform - Production PostgreSQL Schema (GA Migration)
-- =============================================================================
-- This script creates the complete production schema for CyberSOC Platform
-- Compatible with PostgreSQL 15+ (Algeria/Staging Environment)
--
-- Execution Order:
--   1. Run this schema creation script
--   2. Run partitioning setup (enterprise-partitioning-setup.sql)
--   3. Run indexes optimization
--   4. Validate with migration verification queries
--
-- Author: CyberSOC DBA Team
-- Version: 2.0.0-GA
-- Date: 2026-08-26
-- =============================================================================

-- Set statement timeouts for safety
SET statement_timeout = '300s';
SET lock_timeout = '60s';
SET idle_in_transaction_session_timeout = '10min';

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search/similarity
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- For exclusion constraints

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE threat_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE incident_status AS ENUM ('new', 'triage', 'investigating', 'contained', 'eradicated', 'recovered', 'closed');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'suppressed', 'resolved');
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer', 'auditor', 'responder', 'hunter');
CREATE TYPE auth_provider AS ENUM ('local', 'ldap', 'saml', 'oauth');
CREATE TYPE mfa_method AS ENUM ('totp', 'sms', 'email', 'fido2');
CREATE TYPE integration_type AS ENUM ('siem', 'edr', 'soar', 'ti', 'vuln', 'ticket');
CREATE TYPE compliance_framework AS ENUM ('anrt', 'iso27001', 'gdpr', 'pci-dss', 'soc2');
CREATE TYPE data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted', 'top_secret');
CREATE TYPE ss7_message_type AS ENUM ('initialdp', 'idp', 'acr', 'connect', 'release', 'pause', 'resume', 'forward');
CREATE TYPE fraud_type AS ENUM ('cli', 'irsf', 'pbx_hack', 'sim_swap', 'roaming', 'premium_rate', 'wangiri');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table (central authentication store)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255),  -- Null for SSO/LDAP users
    role user_role NOT NULL DEFAULT 'viewer',
    auth_provider auth_provider NOT NULL DEFAULT 'local',
    
    -- MFA Configuration
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_method mfa_method,
    mfa_secret_encrypted TEXT,  -- Encrypted TOTP secret
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    password_changed_at TIMESTAMPTZ,
    
    -- PII (encrypted at application layer)
    phone_encrypted TEXT,
    department VARCHAR(100),
    employee_id VARCHAR(50),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- Sessions table (Redis-backed metadata, this is audit trail)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) NOT NULL,  -- SHA-256 of session token
    
    -- Device info
    device_fingerprint VARCHAR(64),
    user_agent TEXT,
    ip_address INET NOT NULL,
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status
    is_valid BOOLEAN NOT NULL DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(200),
    
    CONSTRAINT unique_session_token UNIQUE (session_token_hash),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE is_valid = true;
CREATE INDEX idx_sessions_token ON sessions(session_token_hash) WHERE is_valid = true;
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE is_valid = true;

-- Audit Log (immutable append-only for compliance)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES users(id),
    actor_username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    
    -- Details (JSONB for flexibility)
    details JSONB NOT NULL DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- Classification
    data_classification data_classification NOT NULL DEFAULT 'internal'
);

CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_details_gin ON audit_log USING GIN(details);

-- Partition by month for retention management (7 years per ANRT)
CREATE TABLE audit_log_partitioned (
    LIKE audit_log INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create initial partitions (current year + buffer)
DO $$
DECLARE
    start_date DATE := date_trunc('year', CURRENT_DATE);
BEGIN
    FOR i IN 0..11 LOOP
        EXECUTE format('
            CREATE TABLE audit_log_%s PARTITION OF audit_log_partitioned
            FOR VALUES FROM (%s) TO (%s)',
            to_char(start_date + interval '1 month' * i, 'YYYY_MM'),
            start_date + interval '1 month' * i,
            start_date + interval '1 month' * (i + 1)
        );
    END LOOP;
END $$;

-- =============================================================================
-- SECURITY INCIDENT MANAGEMENT
-- =============================================================================

-- Incidents table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., INC-2026-00042
    
    -- Classification
    title TEXT NOT NULL,
    description TEXT,
    severity threat_severity NOT NULL,
    status incident_status NOT NULL DEFAULT 'new',
    data_classification data_classification NOT NULL DEFAULT 'confidential',
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_team VARCHAR(100),
    escalation_level INTEGER NOT NULL DEFAULT 0,
    
    -- Timeline
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    eradicated_at TIMESTAMPTZ,
    recovered_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Impact
    affected_systems TEXT[] NOT NULL DEFAULT '{}',
    affected_assets INTEGER NOT NULL DEFAULT 0,
    data_breached BOOLEAN NOT NULL DEFAULT false,
    records_affected INTEGER,
    
    -- Relationships
    parent_incident UUID REFERENCES incidents(id),
    related_incidents UUID[] NOT NULL DEFAULT '{}',
    
    -- Metrics
    mttd_minutes INTEGER,  -- Mean Time To Detect
    mttr_minutes INTEGER,  -- Mean Time To Respond
    
    -- Audit
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_mttd CHECK (mttd_minutes IS NULL OR mttd_minutes >= 0),
    CONSTRAINT valid_mttr CHECK (mttr_minutes IS NULL OR mttr_minutes >= 0)
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to) WHERE status NOT IN ('closed', 'recovered');
CREATE INDEX idx_incidents_detected ON incidents(detected_at DESC);
CREATE INDEX idx_incidents_number ON incidents(incident_number);

-- Incident timeline events
CREATE TABLE incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL,  -- note, status_change, assignment, escalation, etc.
    event_summary TEXT NOT NULL,
    event_details JSONB NOT NULL DEFAULT '{}',
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    visible_to_customer BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_incident_events_incident ON incident_events(incident_id, created_at);

-- Alerts table (from SIEM/correlation engine)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(50) UNIQUE NOT NULL,  -- External alert ID from SIEM
    
    -- Source
    source_type VARCHAR(50) NOT NULL,  -- siem, edr, ti, custom
    source_instance VARCHAR(100),
    rule_name VARCHAR(200) NOT NULL,
    rule_id VARCHAR(100),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    severity threat_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    
    -- Observables (JSONB for flexible IoC storage)
    observables JSONB NOT NULL DEFAULT '[]',
    
    -- Context
    raw_event JSONB,  -- Original event from source
    
    -- Enrichment
    threat_intel_matches JSONB NOT NULL DEFAULT '[]',
    mitre_tactics TEXT[] NOT NULL DEFAULT '{}',
    mitre_techniques TEXT[] NOT NULL DEFAULT '{}',
    
    -- Correlation
    correlated_incident UUID REFERENCES incidents(id),
    correlation_score NUMERIC(3,2),  -- 0.00 to 1.00
    
    -- Timing
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    
    -- Suppression
    suppressed_until TIMESTAMPTZ,
    suppression_reason TEXT,
    
    -- TTP Mapping
    kill_chain_phase VARCHAR(50),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status) WHERE status = 'active';
CREATE INDEX idx_alerts_severity ON alerts(severity) WHERE status = 'active';
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_rule ON alerts(rule_name);
CREATE INDEX idx_alerts_incident ON alerts(correlated_incident);
CREATE INDEX idx_alerts_observables ON alerts USING GIN(observables);

-- Full-text search on alert titles
CREATE INDEX idx_alerts_title_search ON alerts USING GIN(to_tsvector('english', title));

-- =============================================================================
-- THREAT INTELLIGENCE
-- =============================================================================

-- Threat Intelligence Indicators (IoCs)
CREATE TABLE threat_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Indicator Value
    indicator_type VARCHAR(20) NOT NULL,  -- ipv4, domain, url, hash, email
    indicator_value TEXT NOT NULL,
    
    -- Classification
    confidence NUMERIC(2,1) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    severity threat_severity NOT NULL,
    
    -- Source
    source VARCHAR(100) NOT NULL,  -- MISP, OpenCTI, manual, etc.
    source_reference VARCHAR(200),
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ,
    
    -- Context
    description TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    ioc_json JSONB NOT NULL DEFAULT '{}',
    
    -- Malware/Family
    malware_family VARCHAR(100),
    malware_type VARCHAR(50),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    false_positive BOOLEAN NOT NULL DEFAULT false,
    expiration TIMESTAMPTZ,
    
    -- Relationships
    campaign_id UUID,
    actor_id UUID,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_indicator UNIQUE (indicator_type, indicator_value)
);

CREATE INDEX idx_threat_indicators_value ON threat_indicators(indicator_value);
CREATE INDEX idx_threat_indicators_type ON threat_indicators(indicator_type);
CREATE INDEX idx_threat_indicators_active ON threat_indicators(is_active) WHERE is_active = true;
CREATE INDEX idx_threat_indicators_search ON threat_indicators USING GIN(to_tsvector('english', COALESCE(description, '')));

-- Threat Actors/Campaigns
CREATE TABLE threat_actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(50) UNIQUE NOT NULL,  -- APT-XXX, TRA-XXX naming
    
    name VARCHAR(200) NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    
    -- Attribution
    country VARCHAR(100),
    motivation VARCHAR(50),  -- financial, espionage, sabotage, hacktivism
    sophistication VARCHAR(20) NOT NULL,  -- advanced, intermediate, basic
    
    -- TTPs
    tactics_techniques JSONB NOT NULL DEFAULT '{}',
    known_tools TEXT[] NOT NULL DEFAULT '{}',
    
    -- Assessment
    assessment TEXT,
    last_activity TIMESTAMPTZ,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threat_actors_name ON threat_actors(name);
CREATE INDEX idx_threat_actors_country ON threat_actors(country);
CREATE INDEX idx_threat_actors_motivation ON threat_actors(motivation);

-- =============================================================================
-- THREAT HUNTING
-- =============================================================================

-- Hunt Sessions
CREATE TABLE hunt_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name TEXT NOT NULL,
    description TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, active, paused, completed, cancelled
    
    -- Creator
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Schedule
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    total_hypotheses INTEGER NOT NULL DEFAULT 0,
    confirmed_findings INTEGER NOT NULL DEFAULT 0,
    false_positives INTEGER NOT NULL DEFAULT 0,
    
    -- Output
    output_incidents UUID[] NOT NULL DEFAULT '{}',
    output_indicators UUID[] NOT NULL DEFAULT '{}',
    
    -- Tags
    tags TEXT[] NOT NULL DEFAULT '{}',
    hunt_type VARCHAR(50),  -- hypothesis-driven, data-driven, entity-centric
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hunt_sessions_status ON hunt_sessions(status);
CREATE INDEX idx_hunt_sessions_creator ON hunt_sessions(created_by);
CREATE INDEX idx_hunt_sessions_type ON hunt_sessions(hunt_type);

-- Hypotheses
CREATE TABLE hunt_hypotheses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES hunt_sessions(id) ON DELETE CASCADE,
    
    hypothesis_text TEXT NOT NULL,
    description TEXT,
    
    -- Methodology
    methodology TEXT,  -- How we'll test it
    data_sources TEXT[] NOT NULL DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'untested',  -- untested, testing, confirmed, refuted, inconclusive
    
    -- Results
    findings JSONB NOT NULL DEFAULT '[]',
    evidence_references TEXT[] NOT NULL DEFAULT '{}',
    
    -- Timing
    tested_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hunt_hypotheses_session ON hunt_hypotheses(session_id);
CREATE INDEX idx_hunt_hypotheses_status ON hunt_hypotheses(status) WHERE status IN ('testing', 'untested');

-- Hunt Queries (for repeatability)
CREATE TABLE hunt_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hypothesis_id UUID REFERENCES hunt_hypotheses(id) ON DELETE CASCADE,
    
    query_name VARCHAR(200),
    query_type VARCHAR(50) NOT NULL,  -- sql, kql, splunk, sigma, yara
    query_text TEXT NOT NULL,
    
    -- Target
    target_data_source VARCHAR(100) NOT NULL,
    
    -- Results
    result_count INTEGER,
    execution_time_ms INTEGER,
    executed_at TIMESTAMPTZ,
    
    -- Sample results (limited)
    sample_results JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hunt_queries_hypothesis ON hunt_queries(hypothesis_id);
CREATE INDEX idx_hunt_queries_type ON hunt_queries(query_type);

-- =============================================================================
-- SS7 / TELECOM SECURITY (Djezzy-Specific)
-- =============================================================================

-- SS7 Messages Monitoring
CREATE TABLE ss7_messages (
    id BIGSERIAL PRIMARY KEY,
    
    -- Message Identity
    message_id VARCHAR(50) UNIQUE NOT NULL,
    message_type ss7_message_type NOT NULL,
    
    -- Network Entities
    originating_point_code VARCHAR(20),
    destination_point_code VARCHAR(20),
    global_title_calling VARCHAR(30),
    global_title_called VARCHAR(30),
    
    -- Timestamps
    sccp_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Analysis
    is_suspicious BOOLEAN NOT NULL DEFAULT false,
    risk_score NUMERIC(3,2) CHECK (risk_score BETWEEN 0 AND 10),
    fraud_indicators JSONB NOT NULL DEFAULT '[]',
    
    -- Raw Message (for forensics)
    raw_payload BYTEA,
    decoded_fields JSONB NOT NULL DEFAULT '{}',
    
    -- Correlation
    linked_alert UUID REFERENCES alerts(id),
    linked_incident UUID REFERENCES incidents(id),
    
    -- Retention (ANRT requires 5 years for telecom)
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 years'),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition by month (high volume table)
CREATE TABLE ss7_messages_partitioned (
    LIKE ss7_messages INCLUDING ALL
) PARTITION BY RANGE (received_at);

-- Create partitions for current + next quarter
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE);
BEGIN
    FOR i IN 0..5 LOOP
        EXECUTE format('
            CREATE TABLE ss7_messages_%s PARTITION OF ss7_messages_partitioned
            FOR VALUES FROM (%s) TO (%s)',
            to_char(start_date + interval '1 month' * i, 'YYYY_MM'),
            start_date + interval '1 month' * i,
            start_date + interval '1 month' * (i + 1)
        );
    END LOOP;
END $$;

CREATE INDEX idx_ss7_messages_type ON ss7_messages(message_type);
CREATE INDEX idx_ss7_messages_suspicious ON ss7_messages(is_suspicious) WHERE is_suspicious = true;
CREATE INDEX idx_ss7_messages_received ON ss7_messages(received_at DESC);
CREATE INDEX idx_ss7_messages_gt_called ON ss7_messages(global_title_called);
CREATE INDEX idx_ss7_messages_risk ON ss7_messages(risk_score DESC) WHERE risk_score >= 5;

-- Fraud Detection Events
CREATE TABLE fraud_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(50) UNIQUE NOT NULL,
    
    fraud_type fraud_type NOT NULL,
    severity threat_severity NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'detected',  -- detected, investigating, blocked, false_positive
    
    -- Affected Subscribers (PII encrypted)
    msisdn_encrypted VARCHAR(100),
    imsi_encrypted VARCHAR(100),
    imei_encrypted VARCHAR(100),
    
    -- Financial Impact (DZD)
    estimated_loss_dzd NUMERIC(15,2),
    actual_loss_dzd NUMERIC(15,2),
    
    -- Detection
    detection_rule VARCHAR(200),
    detection_confidence NUMERIC(3,2),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Investigation
    investigated_by UUID REFERENCES users(id),
    investigation_notes TEXT,
    case_number VARCHAR(20),
    
    -- Blocking Action
    blocked_at TIMESTAMPTZ,
    blocking_action VARCHAR(100),
    
    -- Analytics
    attacker_pattern JSONB NOT NULL DEFAULT '{}',
    victim_profile JSONB NOT NULL DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_events_type ON fraud_events(fraud_type);
CREATE INDEX idx_fraud_events_status ON fraud_events(status) WHERE status != 'blocked' AND status != 'false_positive';
CREATE INDEX idx_fraud_events_detected ON fraud_events(detected_at DESC);
CREATE INDEX idx_fraud_events_severity ON fraud_events(severity) WHERE severity IN ('critical', 'high');

-- =============================================================================
-- COMPLIANCE & AUDIT (ANRT/GDPR)
-- =============================================================================

-- Compliance Framework Requirements
CREATE TABLE compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework compliance_framework NOT NULL,
    requirement_id VARCHAR(50) NOT NULL,
    requirement_name TEXT NOT NULL,
    description TEXT,
    
    -- Control mapping
    control_id VARCHAR(50),
    control_description TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, implemented, partial, not_applicable
    implementation_evidence TEXT[],
    
    -- Review
    last_review TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    reviewer UUID REFERENCES users(id),
    
    -- Risk
    risk_rating VARCHAR(10),  -- high, medium, low
    gap_assessment TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_req UNIQUE (framework, requirement_id)
);

CREATE INDEX idx_compliance_framework ON compliance_requirements(framework);
CREATE INDEX idx_compliance_status ON compliance_requirements(status) WHERE status IN ('pending', 'partial');

-- Data Processing Register (GDPR Art. 30)
CREATE TABLE data_processing_register (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_name TEXT NOT NULL,
    process_owner UUID REFERENCES users(id) NOT NULL,
    
    -- Purpose
    purpose TEXT NOT NULL,
    lawful_basis VARCHAR(100) NOT NULL,  -- consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
    
    -- Data Categories
    data_categories TEXT[] NOT NULL DEFAULT '{}',
    data_subjects TEXT[] NOT NULL DEFAULT '{}',  -- customers, employees, visitors
    
    -- Data Flow
    data_source TEXT,
    data_recipients TEXT[] NOT NULL DEFAULT '{}',
    cross_border_transfer BOOLEAN NOT NULL DEFAULT false,
    transfer_safeguards TEXT,
    
    -- Retention
    retention_period INTERVAL NOT NULL,
    retention_justification TEXT,
    
    -- Security Measures
    technical_measures TEXT[] NOT NULL DEFAULT '{}',
    organizational_measures TEXT[] NOT NULL DEFAULT '{}',
    
    -- Risk Assessment
    dpia_required BOOLEAN NOT NULL DEFAULT false,
    dpia_completed BOOLEAN NOT NULL DEFAULT false,
    risk_level VARCHAR(20),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    review_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dpr_active ON data_processing_register(is_active) WHERE is_active = true;
CREATE INDEX idx_dpr_purpose ON data_processing_register USING GIN(to_tsvector('english', purpose));

-- =============================================================================
-- INTEGRATIONS
-- =============================================================================

-- External Integrations Registry
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    integration_type integration_type NOT NULL,
    
    -- Connection
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    api_key_last_rotated TIMESTAMPTZ,
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Health
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    last_health_check TIMESTAMPTZ,
    health_check_error TEXT,
    
    -- Sync
    sync_interval_seconds INTEGER,
    last_sync TIMESTAMPTZ,
    next_sync TIMESTAMPTZ,
    
    -- Stats
    total_syncs BIGINT NOT NULL DEFAULT 0,
    failed_syncs BIGINT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_integrations_enabled ON integrations(is_enabled) WHERE is_enabled = true;

-- Integration Sync Logs
CREATE TABLE integration_logs (
    id BIGSERIAL PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    
    sync_type VARCHAR(20) NOT NULL,  -- pull, push, health_check
    status VARCHAR(20) NOT NULL,  -- success, failure, timeout, partial
    
    -- Metrics
    records_processed INTEGER,
    records_created INTEGER,
    records_updated INTEGER,
    errors JSONB NOT NULL DEFAULT '[]',
    
    duration_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id, started_at DESC);
CREATE INDEX idx_integration_logs_status ON integration_logs(status) WHERE status != 'success';

-- =============================================================================
-- AUTOMATION / SOAR
-- =============================================================================

-- Playbooks
CREATE TABLE playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    
    -- Classification
    category VARCHAR(50) NOT NULL,  -- incident_response, threat_hunting, enrichment, containment
    severity_filter threat_severity[],
    
    -- Definition
    playbook_definition JSONB NOT NULL,  -- Workflow definition (YAML/JSON)
    
    -- Triggers
    trigger_type VARCHAR(50) NOT NULL,  -- manual, alert, scheduled, webhook
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    
    -- Execution
    is_active BOOLEAN NOT NULL DEFAULT false,
    approval_required BOOLEAN NOT NULL DEFAULT true,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    parent_playbook UUID REFERENCES playbooks(id),
    
    -- Stats
    total_runs INTEGER NOT NULL DEFAULT 0,
    successful_runs INTEGER NOT NULL DEFAULT 0,
    avg_runtime_seconds NUMERIC(8,2),
    
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbooks_category ON playbooks(category);
CREATE INDEX idx_playbooks_active ON playbooks(is_active) WHERE is_active = true;

-- Playbook Executions
CREATE TABLE playbook_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    
    -- Trigger
    triggered_by UUID REFERENCES users(id),
    trigger_alert UUID REFERENCES alerts(id),
    trigger_incident UUID REFERENCES incidents(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'running',  -- running, completed, failed, cancelled, waiting_approval
    
    -- Execution
    input_params JSONB NOT NULL DEFAULT '{}',
    output_results JSONB NOT NULL DEFAULT '{}',
    steps_executed JSONB NOT NULL DEFAULT '[]',
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Error Handling
    error_message TEXT,
    error_step VARCHAR(100),
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    -- Approval
    approval_requested_from UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_executions_playbook ON playbook_executions(playbook_id, started_at DESC);
CREATE INDEX idx_playbook_executions_status ON playbook_executions(status) WHERE status = 'running';

-- =============================================================================
-- SYSTEM CONFIGURATION
-- =============================================================================

-- Feature Flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    value BOOLEAN NOT NULL DEFAULT false,
    value_type VARCHAR(20) NOT NULL DEFAULT 'boolean',  -- boolean, percentage, json
    
    -- Targeting
    rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
    allowed_roles user_role[],
    allowed_users UUID[],
    
    -- Governance
    is_security_sensitive BOOLEAN NOT NULL DEFAULT false,
    change_reason TEXT,
    changed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, flag_name, description, is_security_sensitive) VALUES
    ('ALLOW_MFA_BYPASS', 'MFA Bypass', 'Allow bypassing multi-factor authentication', true),
    ('DISABLE_RATE_LIMITING', 'Disable Rate Limiting', 'Disable API rate limiting globally', true),
    ('DISABLE_AUDIT_LOGGING', 'Disable Audit Logging', 'Turn off audit trail logging', true),
    ('ALLOW_DEBUG_ENDPOINTS', 'Debug Endpoints', 'Expose debug/diagnostic endpoints', false),
    ('ENABLE_AI_COPILOT', 'AI Copilot', 'Enable AI-powered security assistant', false),
    ('ENABLE_PREDICTIVE_ANALYTICS', 'Predictive Analytics', 'Enable ML-based threat prediction', false),
    ('SS7_MONITORING_ACTIVE', 'SS7 Monitoring', 'Activate SS7 signaling monitoring', false),
    ('FRAUD_DETECTION_AUTO_BLOCK', 'Auto Block Fraud', 'Automatically block detected fraud', true);

-- System Settings
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    last_modified_by UUID REFERENCES users(id),
    last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
    ('platform_version', '"2.0.0-GA"', 'Current platform version'),
    ('maintenance_mode', 'false', 'Global maintenance mode flag'),
    ('max_concurrent_sessions', '100', 'Maximum concurrent user sessions'),
    ('session_timeout_minutes', '1440', 'Session timeout in minutes (24h default)'),
    ('password_min_length', '12', 'Minimum password length'),
    ('password_max_age_days', '90', 'Password expiration in days'),
    ('lockout_threshold', '5', 'Failed login attempts before lockout'),
    ('lockout_duration_minutes', '30', 'Account lockout duration'),
    ('audit_retention_days', '2555', 'Audit log retention (7 years ANRT)'),
    ('pii_retention_days', '2555', 'PII data retention (7 years regulatory)');

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Active Incidents Summary View
CREATE OR REPLACE VIEW v_active_incidents AS
SELECT 
    i.id,
    i.incident_number,
    i.title,
    i.severity,
    i.status,
    i.assigned_to,
    u.display_name as assigned_to_name,
    i.detected_at,
    i.mttd_minutes,
    i.mttr_minutes,
    EXTRACT(EPOCH FROM (NOW() - i.detected_at))/3600 as age_hours,
    COUNT(a.id) as alert_count
FROM incidents i
LEFT JOIN users u ON i.assigned_to = u.id
LEFT JOIN alerts a ON a.correlated_incident = i.id AND a.status = 'active'
WHERE i.status NOT IN ('closed', 'recovered')
GROUP BY i.id, u.display_name;

-- Dashboard Metrics View (refreshed materialized view for performance)
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT 
    (SELECT COUNT(*) FROM incidents WHERE status NOT IN ('closed', 'recovered')) as active_incidents,
    (SELECT COUNT(*) FROM alerts WHERE status = 'active') as active_alerts,
    (SELECT COUNT(*) FROM alerts WHERE severity = 'critical' AND status = 'active') as critical_alerts,
    (SELECT COUNT(*) FROM hunt_sessions WHERE status = 'active') as active_hunts,
    (SELECT COUNT(*) FROM fraud_events WHERE status = 'detected') as pending_fraud,
    (SELECT COUNT(*) FROM ss7_messages WHERE is_suspicious = true AND received_at > NOW() - interval '24 hours') as suspicious_ss7_24h,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM sessions WHERE is_valid = true) as active_sessions;

-- Create unique index for refresh
CREATE UNIQUE INDEX idx_mv_dashboard_metrics_singleton ON mv_dashboard_metrics ((true));

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER threat_indicators_updated_at BEFORE UPDATE ON threat_indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER hunt_sessions_updated_at BEFORE UPDATE ON hunt_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER hunt_hypotheses_updated_at BEFORE UPDATE ON hunt_hypotheses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER fraud_events_updated_at BEFORE UPDATE ON fraud_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate incident number function
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    seq_num INTEGER;
BEGIN
    prefix := 'INC-' || TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(SUBSTRING(incidend_number FROM '-([0-9]+)$')::INTEGER), 0) + 1
    INTO seq_num
    FROM incidents
    WHERE incendid_number LIKE prefix || '%';
    
    NEW.incident_number := prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER generate_incident_number_trigger BEFORE INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- =============================================================================
-- STORED PROCEDURES FOR OPERATIONS
-- =============================================================================

-- Get SOC Dashboard Summary
CREATE OR REPLACE PROCEDURE get_soc_dashboard_summary(
    IN p_hours INTEGER DEFAULT 24,
    OUT active_incidents INTEGER,
    OUT critical_alerts INTEGER,
    OUT unresolved_alerts INTEGER,
    OUT mttd_avg NUMERIC,
    OUT top_attack_vectors JSON
)
LANGUAGE plpgsql AS $$
BEGIN
    SELECT COUNT(*) INTO active_incidents
    FROM incidents WHERE status NOT IN ('closed', 'recovered');
    
    SELECT COUNT(*) INTO critical_alerts
    FROM alerts WHERE severity = 'critical' AND status = 'active';
    
    SELECT COUNT(*) INTO unresolved_alerts
    FROM alerts WHERE status = 'active';
    
    SELECT COALESCE(AVG(mttd_minutes), 0) INTO mttd_avg
    FROM incidents WHERE detected_at > NOW() - (p_hours || ' hours')::interval;
    
    SELECT json_agg(json_build_object(
        'vector', kill_chain_phase,
        'count', cnt
    )) INTO top_attack_vectors
    FROM (
        SELECT kill_chain_phase, COUNT(*) as cnt
        FROM alerts
        WHERE triggered_at > NOW() - (p_hours || ' hours')::interval
          AND kill_chain_phase IS NOT NULL
        GROUP BY kill_chain_phase
        ORDER BY cnt DESC
        LIMIT 5
    ) sub;
END;

-- Bulk acknowledge alerts procedure
CREATE OR REPLACE PROCEDURE bulk_acknowledge_alerts(
    p_alert_ids UUID[],
    p_user_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    alert_uuid UUID;
BEGIN
    FOREACH alert_uuid IN ARRAY p_alert_ids
    LOOP
        UPDATE alerts SET
            status = 'acknowledged',
            acknowledged_at = NOW(),
            acknowledged_by = p_user_id,
            updated_at = NOW()
        WHERE id = alert_uuid AND status = 'active';
        
        -- Log the acknowledgment
        INSERT INTO audit_log (actor_id, actor_username, action, resource_type, resource_id, details)
        SELECT p_user_id, u.username, 'ALERT_ACKNOWLEDGE', 'alert', alert_id::TEXT,
               jsonb_build_object('alert_id', alert_id, 'bulk_operation', true)
        FROM users u WHERE u.id = p_user_id;
    END LOOP;
END;

-- =============================================================================
-- GRANTS & ROLES (Template - Adjust for your environment)
-- =============================================================================

-- Application role (used by Next.js app)
CREATE ROLE cybersoc_app WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE cybersoc_staging TO cybersoc_app;
GRANT USAGE ON SCHEMA public TO cybersoc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cybersoc_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cybersoc_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cybersoc_app;

-- Read-only role (for reporting/analytics)
CREATE ROLE cybersoc_readonly WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE cybersoc_staging TO cybersoc_readonly;
GRANT USAGE ON SCHEMA public TO cybersoc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cybersoc_readonly;

-- Auditor role (can read + audit log insert)
CREATE ROLE cybersoc_auditor WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE cybersoc_staging TO cybersoc_auditor;
GRANT USAGE ON SCHEMA public TO cybersoc_auditor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cybersoc_auditor;
GRANT INSERT ON audit_log TO cybersoc_auditor;

-- Ensure future tables get correct grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cybersoc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cybersoc_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO cybersoc_app;

-- =============================================================================
-- FINAL VALIDATION
-- =============================================================================

-- Report on what was created
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    SELECT COUNT(*) INTO view_count FROM information_schema.views WHERE table_schema = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CyberSOC Schema Creation Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for data migration/validation.';
    RAISE NOTICE '========================================';
END;
$$;
