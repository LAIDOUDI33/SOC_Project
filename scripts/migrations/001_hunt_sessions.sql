-- ============================================================
-- National SOC Platform - Hunt Sessions Migration
-- 
-- This migration creates the threat hunting session tables.
-- Run this during deployment, NOT at runtime!
-- 
-- Usage: psql -U user -d database -f 001_hunt_sessions.sql
-- ============================================================

BEGIN;

-- ============================================================
-- HUNT SESSIONS TABLE
-- Stores metadata for threat hunting investigations
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "hypothesis" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  "hunter_id" TEXT NOT NULL,
  "hunter_name" TEXT,
  "query" TEXT,
  "query_language" TEXT DEFAULT 'SQL',
  "data_source" TEXT DEFAULT 'SIEM'
    CHECK (data_source IN ('SIEM', 'EDR', 'NTA', 'THREAT_INTEL', 'CUSTOM')),
  "time_range" JSONB DEFAULT '{"range": "24h"}'::JSONB,
  "progress" INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  "total_results" INTEGER NOT NULL DEFAULT 0,
  "true_positives" INTEGER NOT NULL DEFAULT 0,
  "false_positives" INTEGER NOT NULL DEFAULT 0,
  "incidents_created" INTEGER NOT NULL DEFAULT 0,
  "grr_hunt_id" TEXT,
  "reviewers" TEXT[] DEFAULT '{}',
  "tags" TEXT[] DEFAULT '{}',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_status" ON "hunt_sessions"("status");
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_hunter_id" ON "hunt_sessions"("hunter_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_created_at" ON "hunt_sessions"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_hunt_sessions_tags" ON "hunt_sessions" USING GIN("tags");

-- ============================================================
-- HUNT RESULTS TABLE
-- Stores findings from hunting sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_results" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "hunt_sessions"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM'
    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  "confidence" REAL NOT NULL DEFAULT 50
    CHECK (confidence >= 0 AND confidence <= 100),
  "status" TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW', 'INVESTIGATING', 'CONFIRMED', 'FALSE_POSITIVE', 'CLOSED')),
  "evidence" JSONB DEFAULT '[]'::JSONB,
  "extracted_iocs" JSONB DEFAULT '[]'::JSONB,
  "tactics" TEXT[] DEFAULT '{}',
  "techniques" TEXT[] DEFAULT '{}',
  "recommendations" TEXT[] DEFAULT '{}',
  "linked_incident_id" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for hunt results
CREATE INDEX IF NOT EXISTS "idx_hunt_results_session_id" ON "hunt_results"("session_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_severity" ON "hunt_results"("severity");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_status" ON "hunt_results"("status");
CREATE INDEX IF NOT EXISTS "idx_hunt_results_created_at" ON "hunt_results"("created_at" DESC);

-- ============================================================
-- HUNT SESSION IOCs TABLE
-- Links IOCs to hunt sessions for tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS "hunt_session_iocs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL REFERENCES "hunt_sessions"("id") ON DELETE CASCADE,
  "ioc_id" TEXT NOT NULL,
  "ioc_type" TEXT NOT NULL,
  "ioc_value" TEXT NOT NULL,
  "found_in_session" BOOLEAN DEFAULT TRUE,
  "added_automatically" BOOLEAN DEFAULT FALSE,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(session_id, ioc_id)
);

-- Index for IOC lookups
CREATE INDEX IF NOT EXISTS "idx_hunt_session_iocs_session" ON "hunt_session_iocs"("session_id");
CREATE INDEX IF NOT EXISTS "idx_hunt_session_iocs_value" ON "hunt_session_iocs"("ioc_value");

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Active hunt sessions view
CREATE OR REPLACE VIEW v_active_hunt_sessions AS
SELECT 
  hs.*,
  COUNT(hr.id) as findings_count,
  COUNT(hsi.id) as iocs_count
FROM hunt_sessions hs
LEFT JOIN hunt_results hr ON hr.session_id = hs.id
LEFT JOIN hunt_session_iocs hsi ON hsi.session_id = hs.id
WHERE hs.status IN ('RUNNING', 'PAUSED')
GROUP BY hs.id;

-- Hunt statistics view
CREATE OR REPLACE VIEW v_hunt_statistics AS
SELECT 
  DATE(created_at) as hunt_date,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
  AVG(progress) as avg_progress,
  SUM(total_results) as total_findings,
  SUM(true_positives) as total_true_positives,
  SUM(false_positives) as total_false_positives
FROM hunt_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY hunt_date DESC;

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_hunt_sessions_updated_at ON "hunt_sessions";
CREATE TRIGGER update_hunt_sessions_updated_at
  BEFORE UPDATE ON "hunt_sessions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hunt_results_updated_at ON "hunt_results";
CREATE TRIGGER update_hunt_results_updated_at
  BEFORE UPDATE ON "hunt_results"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verify tables were created
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name LIKE 'hunt_%'
ORDER BY table_name;
