-- ============================================================
-- National SOC Platform - Hunt Sessions Migration
-- 
-- This migration adds the threat hunting tables required
-- for production-ready threat hunting functionality.
-- 
-- Run this against your PostgreSQL database:
--   psql -U your_user -d your_database -f migrate-hunt-sessions.sql
-- 
-- @version 1.0.0
-- @date 2026-08-23
-- ============================================================

BEGIN;

-- ============================================================
-- HUNT SESSIONS TABLE
-- Stores threat hunting session metadata and state
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_sessions" (
    -- Primary identification
    "id" TEXT NOT NULL PRIMARY KEY,
    
    -- Basic information
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "hypothesis" TEXT NOT NULL,
    
    -- Status tracking
    "status" TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    
    -- Owner information
    "hunter_id" TEXT NOT NULL,
    "hunter_name" TEXT DEFAULT 'Unknown',
    
    -- Query configuration (JSON fields)
    "query" TEXT,
    "query_language" TEXT DEFAULT 'KQL'
        CHECK (query_language IN ('KQL', 'LUCENE', 'SIGMA', 'EQL', 'YARA', 'SQL')),
    "data_source" TEXT DEFAULT 'SIEM'
        CHECK (data_source IN ('SIEM', 'EDR', 'NSM', 'DNS', 'PROXY', 'MAIL', 'ACTIVE_DIRECTORY', 'CLOUD', 'THREAT_INTEL', 'CUSTOM')),
    "time_range" JSONB DEFAULT NULL,
    
    -- Progress tracking
    "progress" INTEGER NOT NULL DEFAULT 0
        CHECK (progress >= 0 AND progress <= 100),
    "total_results" INTEGER NOT NULL DEFAULT 0,
    "true_positives" INTEGER NOT NULL DEFAULT 0,
    "false_positives" INTEGER NOT NULL DEFAULT 0,
    "incidents_created" INTEGER NOT NULL DEFAULT 0,
    
    -- External integrations
    "grr_hunt_id" TEXT,  -- GRR (Google Rapid Response) integration
    
    -- Collaboration
    "reviewers" TEXT[] DEFAULT '{}',
    "tags" TEXT[] DEFAULT '{}',
    "notes" TEXT DEFAULT NULL,
    
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3) DEFAULT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_status" ON "hunt_sessions"("status");
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_hunter_id" ON "hunt_sessions"("hunter_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_updated_at" ON "hunt_sessions"("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_tags" ON "hunt_sessions" USING GIN("tags");

-- Add comments for documentation
COMMENT ON TABLE "hunt_sessions" IS 'Threat hunting sessions for hypothesis-based investigations';
COMMENT ON COLUMN "hunt_sessions".hypothesis IS 'The investigation hypothesis being tested';
COMMENT ON COLUMN "hunt_sessions".progress IS 'Completion percentage (0-100)';
COMMENT ON COLUMN "hunt_sessions".time_range IS 'JSON: { start: ISO8601, end: ISO8601 }';

-- ============================================================
-- HUNT RESULTS/FINDINGS TABLE
-- Individual findings from hunting sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_results" (
    -- Primary identification
    "id" TEXT NOT NULL PRIMARY KEY,
    
    -- Relationship to session
    "session_id" TEXT NOT NULL REFERENCES "hunt_sessions"("id") ON DELETE CASCADE,
    
    -- Finding details
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
    "confidence" REAL NOT NULL DEFAULT 50.0
        CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Status workflow
    "status" TEXT NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'INVESTIGATING', 'CONFIRMED_FALSE_POSITIVE', 'CONFIRMED_TRUE_POSITIVE', 'ESCALATED')),
    
    -- Evidence (JSON array of evidence objects)
    "evidence" JSONB DEFAULT '[]'::JSONB,
    
    -- Extracted IOCs from this finding
    "extracted_iocs" JSONB DEFAULT '[]'::JSONB,
    
    -- MITRE ATT&CK mapping
    "tactics" TEXT[] DEFAULT '{}',
    "techniques" TEXT[] DEFAULT '{}',
    
    -- Recommended actions
    "recommendations" TEXT[] DEFAULT '{}',
    
    -- Link to incident if escalated
    "linked_incident_id" TEXT,
    
    -- Audit information
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_hunt_results_session_id" ON "hunt_results"("session_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_severity" ON "hunt_results"("severity");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_status" ON "hunt_results"("status");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_linked_incident" ON "hunt_results"("linked_incident_id");

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS "idx_hunt_results_search" ON "hunt_results" 
    USING GIN(to_tsvector('english', title || ' ' || description));

-- Comments
COMMENT ON TABLE "hunt_results" IS 'Individual findings/results from threat hunting sessions';
COMMENT ON COLUMN "hunt_results".evidence IS 'JSON array of { type, content, source, timestamp } objects';
COMMENT ON COLUMN "hunt_results".extracted_iocs IS 'JSON array of { type, value, context } objects';

-- ============================================================
-- HUNT SESSION IOC TRACKING
-- IOCs extracted during hunts (optional separate table)
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_session_iocs" (
    "id" SERIAL PRIMARY KEY,
    "session_id" TEXT NOT NULL REFERENCES "hunt_sessions"("id") ON DELETE CASCADE,
    "result_id" TEXT REFERENCES "hunt_results"("id") ON DELETE SET NULL,
    
    -- IOC data
    "type" TEXT NOT NULL
        CHECK (type IN ('IPV4', 'IPV6', 'DOMAIN', 'URL', 'HASH', 'EMAIL', 'MSISDN', 'IMEI', 'IMSI', 'MAC_ADDRESS', 'SS7_GT', 'FILE_NAME', 'REGISTRY_KEY', 'MUTANT', 'CVE', 'JA3_HASH', 'CERTIFICATE_HASH', 'BITCOIN_ADDRESS', 'OTHER')),
    "value" TEXT NOT NULL,
    
    -- Context
    "context" TEXT DEFAULT NULL,
    "confidence" REAL DEFAULT 50.0,
    
    -- Source info
    "source_finding_id" TEXT,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Whether it was added to main IOC database
    "added_to_tip" BOOLEAN DEFAULT FALSE,
    "tip_indicator_id" TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_hunt_session_iocs_session" ON "hunt_session_iocs"("session_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_session_iocs_type_value" ON "hunt_session_iocs"("type", "value");

-- Unique constraint to prevent duplicates within session
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hunt_session_iocs_unique" 
    ON "hunt_session_iocs"("session_id", "type", "value");

COMMENT ON TABLE "hunt_session_iocs" IS 'IOCs extracted during threat hunting sessions';

-- ============================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp for hunt_sessions
CREATE OR REPLACE FUNCTION update_hunt_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hunt_sessions_updated_at ON "hunt_sessions";
CREATE TRIGGER trigger_update_hunt_sessions_updated_at
    BEFORE UPDATE ON "hunt_sessions"
    FOR EACH ROW
    EXECUTE FUNCTION update_hunt_sessions_updated_at();

-- Same for hunt_results
CREATE OR REPLACE FUNCTION update_hunt_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hunt_results_updated_at ON "hunt_results";
CREATE TRIGGER trigger_update_hunt_results_updated_at
    BEFORE UPDATE ON "hunt_results"
    FOR EACH ROW
    EXECUTE FUNCTION update_hunt_results_updated_at();

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Active hunting sessions view
CREATE OR REPLACE VIEW v_active_hunt_sessions AS
SELECT 
    hs.*,
    COUNT(hr.id) as findings_count,
    COUNT(CASE WHEN hr.status = 'NEW' THEN 1 END) as new_findings_count,
    COUNT(CASE WHEN hr.severity = 'CRITICAL' THEN 1 END) as critical_findings_count
FROM hunt_sessions hs
LEFT JOIN hunt_results hr ON hs.id = hr.session_id
WHERE hs.status IN ('DRAFT', 'RUNNING', 'PAUSED')
GROUP BY hs.id;

-- Hunt statistics view
CREATE OR REPLACE VIEW v_hunt_statistics AS
SELECT 
    DATE(created_at) as hunt_date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions,
    AVG(progress) as avg_progress,
    SUM(total_results) as total_results_found,
    SUM(true_positives) as total_true_positives,
    SUM(false_positives) as total_false_positives
FROM hunt_sessions
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY hunt_date DESC;

-- ============================================================
-- GRANTS (adjust for your setup)
-- ============================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_role;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: hunt_sessions, hunt_results, hunt_session_iocs';
    RAISE NOTICE 'Views created: v_active_hunt_sessions, v_hunt_statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Verify with:';
    RAISE NOTICE '  SELECT count(*) FROM hunt_sessions;';
    RAISE NOTICE '  SELECT count(*) FROM hunt_results;';
    RAISE NOTICE '  \\d+ hunt_sessions';
END $$;
