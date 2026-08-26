-- ============================================
-- Algeria National SOC Platform - Initial Migration
-- PostgreSQL 15 | Production Baseline
-- Date: 2026-07-26
-- Schema Version: 1.0.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================
-- ENUM TYPES
-- ============================================

-- Authentication & User Enums
DO $$ BEGIN
    CREATE TYPE "MfaMethod" AS ENUM (
        'TOTP', 'SMS', 'EMAIL', 'FIDO2', 'WEBAUTHN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM (
        'VIEWER', 'ANALYST', 'SENIOR_ANALYST', 'INCIDENT_RESPONDER',
        'THREAT_HUNTER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert Enums
DO $$ BEGIN
    CREATE TYPE "TelecomProtocol" AS ENUM (
        'GTP', 'GTP_V2', 'DIAMETER', 'RADIUS', 'SS7_MAP', 'SS7_CAP',
        'SS7_ISUP', 'SIP', 'H248_MEGACO', 'SMPP', 'HTTP_REST', 'GRPC',
        'WEBRTC', 'LTE_NAS', 'NR_NAS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RatType" AS ENUM (
        'GSM_GPRS', 'UMTS', 'LTE', 'NR_5G', 'WLAN', 'WIMAX',
        'HSPA', 'CDMA2000', 'EVDO', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RoamingStatus" AS ENUM (
        'HOME', 'ROAMING_INTERNATIONAL', 'ROAMING_NATIONAL', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertSeverity" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertStatus" AS ENUM (
        'NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'CONTAINED', 'ERADICATED',
        'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED', 'CLOSED', 'SUPPRESSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertCategory" AS ENUM (
        'MALWARE', 'PHISHING', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH', 'DOS',
        'INSIDER_THREAT', 'SUPPLY_CHAIN', 'PHYSICAL', 'POLICY_VIOLATION',
        'VULNERABILITY', 'NETWORK_ANOMALY', 'FRAUD', 'TELECOM_FRAUD',
        'SIM_SWAP', 'SS7_ATTACK', 'IMSI_CATCHER', 'LOCATION_TRACKING',
        'SIGNALLING_STORM', 'BSS_FRAUD', 'IRREVENT_FRAUD', 'PREMIUM_RATE_FRAUD',
        'INTERCONNECT_FRAUD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Incident Enums
DO $$ BEGIN
    CREATE TYPE "IncidentSeverity" AS ENUM (
        'SEV0', 'SEV1', 'SEV2', 'SEV3', 'SEV4'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IncidentStatus" AS ENUM (
        'DETECTED', 'TRIAGE', 'IN_PROGRESS', 'CONTAINED', 'ERADICATED',
        'RECOVERY', 'POST_INCIDENT', 'CLOSED', 'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IncidentCategory" AS ENUM (
        'SECURITY_BREACH', 'MALWARE', 'PHISHING', 'DATA_EXFILTRATION',
        'RANSOMWARE', 'DDoS', 'INSIDER_THREAT', 'SUPPLY_CHAIN',
        'PHYSICAL_SECURITY', 'TELECOM_FRAUD', 'SUBSCRIPTION_FRAUD',
        'SIM_SWAP_ATTACK', 'SS7_VULNERABILITY', 'IMSI_CATCHER_ATTACK',
        'SIGNALLING_ATTACK', 'NETWORK_OUTAGE', 'REGULATORY_COMPLIANCE',
        'DATA_PRIVACY', 'THIRD_PARTY_BREACH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IncidentClassification" AS ENUM (
        'TRUE_POSITIVE', 'FALSE_POSITIVE', 'BENIGN_POSITIVE', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ImpactLevel" AS ENUM (
        'CRITICAL', 'MAJOR', 'MODERATE', 'MINOR', 'NEGLIGIBLE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UrgencyLevel" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SlaTarget" AS ENUM (
        'P1_CRITICAL_15MIN', 'P2_HIGH_1HOUR', 'P3_MEDIUM_4HOURS',
        'P4_LOW_24HOURS', 'P5_PLANNED_72HOURS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DataSensitivity" AS ENUM (
        'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'TOP_SECRET',
        'PERSONAL_DATA_PII', 'TELECOM_SUBSCRIBER', 'NATIONAL_SECURITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Task Enums
DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM (
        'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED',
        'SKIPPED', 'FAILED', 'AUTO_RUNNING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskType" AS ENUM (
        'INVESTIGATION', 'CONTAINMENT', 'ERADICATION', 'RECOVERY',
        'COMMUNICATION', 'DOCUMENTATION', 'ESCALATION', 'COORDINATION',
        'AUTOMATION', 'ANALYSIS', 'FORENSICS', 'NOTIFICATION', 'PATCHING',
        'ISOLATION', 'BLOCKLIST_UPDATE', 'TELECOM_SPECIFIC'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Evidence Enums
DO $$ BEGIN
    CREATE TYPE "EvidenceType" AS ENUM (
        'FILE', 'MEMORY_DUMP', 'DISK_IMAGE', 'NETWORK_CAPTURE', 'LOG_FILE',
        'SCREENSHOT', 'EMAIL', 'MALWARE_SAMPLE', 'REGISTRY_ENTRY',
        'DATABASE_RECORD', 'CLOUD_ARTIFACT', 'MOBILE_DEVICE', 'SIM_CARD',
        'CALL_RECORD', 'SMS_RECORD', 'LOCATION_DATA', 'CDR_RECORD',
        'SIGNALING_CAPTURE', 'PACKET_CAPTURE', 'PCAP_FILE', 'ETLR_RECORD',
        'HLR_RECORD', 'VLR_RECORD', 'AUCE_RECORD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EvidenceStatus" AS ENUM (
        'COLLECTING', 'COLLECTED', 'PROCESSING', 'ANALYZED', 'PRESERVED',
        'EXPIRED', 'DESTROYED', 'DISPUTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Threat Intelligence Enums
DO $$ BEGIN
    CREATE TYPE "OriginConfidence" AS ENUM (
        'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SourceQuality" AS ENUM (
        'EXCELLENT', 'GOOD', 'MEDIUM', 'LOW', 'UNVERIFIED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ThreatActorType" AS ENUM (
        'APT', 'CRIME_SYNDICATE', 'HACKTIVIST', 'INSIDER', 'NATION_STATE',
        'TERRORIST', 'UNKNOWN', 'SCRIPT_KIDDIE', 'COMPETITOR',
        'TELECOM_FRAUD_RING', 'STATE_SPONSORED', 'MERcenARY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ThreatMotivation" AS ENUM (
        'ESPIONAGE', 'FINANCIAL_GAIN', 'DESTRUCTION', 'IDEOLOGICAL',
        'POLITICAL', 'PERSONAL_GRATIFICATION', 'REPUTATIONAL',
        'STRATEGIC_ADVANTAGE', 'TERRORISM', 'TELECOM_REVENUE_FRAUD',
        'SUBSCRIPTION_THEFT', 'INTELLIGENCE_GATHERING', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CapabilityLevel" AS ENUM (
        'NOVICE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ELITE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IndicatorType" AS ENUM (
        'IP_DOMAIN', 'IP_ADDRESS', 'DOMAIN', 'URL', 'URL_PATH', 'EMAIL',
        'EMAIL_SUBJECT', 'FILE_HASH_MD5', 'FILE_HASH_SHA1', 'FILE_HASH_SHA256',
        'FILE_HASH_SSDEEP', 'CVE', 'MUTANT', 'REGISTRY_KEY', 'USER_AGENT',
        'YARA_RULE', 'SIGMA_RULE', 'SURICATA_RULE', 'SNORT_RULE', 'IMEI',
        'IMSI', 'MSISDN', 'ICCID', 'PHONE_NUMBER', 'BITCOIN_ADDRESS',
        'CIDR_BLOCK', 'JA3_HASH', 'JARM_HASH', 'CERTIFICATE_HASH',
        'SSH_KEY_FINGERPRINT', 'MAC_ADDRESS', 'BSSID', 'APN_NAME',
        'GTP_TUNNEL_ID', 'SS7_GLOBAL_TITLE', 'DNS_QUERY', 'TLS_SNI',
        'HOSTNAME', 'PROCESS_NAME', 'MUTEX', 'NAMED_PIPE', 'SERVICE_NAME',
        'DRIVER_NAME', 'Scheduled_TASK'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TLPLevel" AS ENUM (
        'RED', 'AMBER', 'GREEN', 'WHITE', 'CLEAR', 'AMBER_STRICT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IndicatorSeverity" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IndicatorAction" AS ENUM (
        'ALERT_ONLY', 'BLOCK', 'BLOCK_AND_ALERT', 'ALLOW_LIST', 'REDIRECT',
        'RATE_LIMIT', 'CAPTCHA_CHALLENGE', 'ISOLATE_ENDPOINT', 'QUARANTINE_FILE',
        'DISABLE_ACCOUNT', 'NOTIFY_OPERATOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "KillChainPhase" AS ENUM (
        'RECONNAISSANCE', 'WEAPONIZATION', 'DELIVERY', 'EXPLOITATION',
        'INSTALLATION', 'COMMAND_AND_CONTROL', 'ACTIONS_ON_OBJECTIVES',
        'EXFILTRATION', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Asset Enums
DO $$ BEGIN
    CREATE TYPE "AssetType" AS ENUM (
        -- Core Network Elements
        'HLR', 'VLR', 'MSC', 'GMSC', 'SGSN', 'GGSN', 'MME', 'SGW', 'PGW',
        'HSS', 'PCRF', 'IMS',
        -- Radio Access Network
        'NODEB', 'ENODEB', 'GNODEB', 'RNC', 'BSC', 'BTS',
        -- Signaling & Transport
        'STP', 'SSP', 'SIGTRAN_GATEWAY', 'DRA',
        -- IT Infrastructure
        'SERVER', 'WORKSTATION', 'FIREWALL', 'LOAD_BALANCER', 'ROUTER',
        'SWITCH', 'ACCESS_POINT', 'STORAGE', 'BACKUP_SYSTEM',
        -- Security Systems
        'SIEM', 'IDS_IPS', 'EDR', 'NAC', 'WAF', 'EMAIL_SECURITY',
        'DNS_SECURITY', 'VPN_CONCENTRATOR', 'HSM',
        -- Applications
        'APPLICATION', 'DATABASE', 'MESSAGE_QUEUE', 'CACHE', 'API_GATEWAY',
        'SERVICE_BUS',
        -- Telecom Specific
        'IN_BILLING_SYSTEM', 'CRM_SYSTEM', 'PROVISIONING_SYSTEM',
        'MEDiation_DEVICE', 'IN_CPE', 'SIM_REGISTRATION', 'NUMBER_PORTABILITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssetCategory" AS ENUM (
        'CORE_NETWORK', 'RADIO_ACCESS_NETWORK', 'TRANSPORT_NETWORK',
        'IT_INFRASTRUCTURE', 'SECURITY_SYSTEMS', 'APPLICATIONS', 'ENDPOINTS',
        'FACILITIES', 'THIRD_PARTY', 'CLOUD_SERVICE', 'MOBILE_DEVICE',
        'IOT_DEVICE', 'OT_ICS'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssetCriticality" AS ENUM (
        'MISSION_CRITICAL', 'BUSINESS_CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssetOperationalStatus" AS ENUM (
        'OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'FAILED', 'DECOMMISSIONED',
        'PROVISIONING', 'TESTING', 'UNKNOWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SecurityZone" AS ENUM (
        'DMZ', 'INTERNAL', 'RESTRICTED', 'HIGH_SECURITY', 'OPERATIONS',
        'MANAGEMENT', 'EXTERNAL', 'ISOLATED', 'SCADA_OT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- System Component Enums
DO $$ BEGIN
    CREATE TYPE "ComponentCategory" AS ENUM (
        'SIEM', 'SOAR', 'EDR', 'TIP', 'IDS_IPS', 'LOGGING', 'MONITORING',
        'SECURITY', 'INFRASTRUCTURE', 'DATABASE', 'CACHE', 'MESSAGE_QUEUE',
        'OBJECT_STORAGE', 'IDENTITY', 'NETWORK', 'BACKUP', 'TELECOM_CORE',
        'TELECOM_RAN', 'TELECOM_SIGNALLING', 'BILLING', 'PROVISIONING',
        'CUSTOMER_FACING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComponentStatus" AS ENUM (
        'OPERATIONAL', 'DEGRADED', 'DOWN', 'STARTING', 'MAINTENANCE',
        'ERROR', 'UNKNOWN', 'PARTIAL_OUTAGE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Audit Enums
DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM (
        'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
        'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'ROLE_CHANGE', 'PERMISSION_CHANGE',
        'PASSWORD_CHANGE', 'MFA_ENABLED', 'MFA_DISABLED', 'API_KEY_CREATED',
        'API_KEY_REVOKED', 'ALERT_ACKNOWLEDGE', 'ALERT_ESCALATE', 'ALERT_RESOLVE',
        'ALERT_SUPPRESS', 'ALERT_FALSE_POSITIVE', 'INCIDENT_CREATE', 'INCIDENT_UPDATE',
        'INCIDENT_ESCALATE', 'INCIDENT_CLOSE', 'TASK_CREATE', 'TASK_UPDATE',
        'TASK_COMPLETE', 'EVIDENCE_UPLOAD', 'EVIDENCE_ACCESS', 'EVIDENCE_DELETE',
        'INDICATOR_CREATE', 'INDICATOR_UPDATE', 'INDICATOR_ACTIVATE',
        'INDICATOR_DEACTIVATE', 'SYSTEM_START', 'SYSTEM_STOP', 'BACKUP_CREATE',
        'RESTORE_PERFORM', 'INTEGRATION_CONFIGURE', 'INTEGRATION_DISABLE',
        'REPORT_GENERATE', 'REPORT_EXPORT', 'USER_CREATE', 'USER_UPDATE',
        'USER_DISABLE', 'USER_UNLOCK', 'ASSET_REGISTER', 'ASSET_UPDATE',
        'ASSET_DECOMMISSION', 'PLAYBOOK_EXECUTE', 'PLAYBOOK_APPROVE',
        'DATA_PURGE', 'RETENTION_POLICY_CHANGE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ResourceType" AS ENUM (
        'USER', 'ALERT', 'INCIDENT', 'TASK', 'EVIDENCE', 'INDICATOR',
        'THREAT_ACTOR', 'CAMPAIGN', 'SYSTEM_COMPONENT', 'CONFIGURATION',
        'REPORT', 'API_KEY', 'INTEGRATION', 'PLAYBOOK', 'RULE', 'DASHBOARD',
        'ASSET', 'SESSION', 'COMPLIANCE_REPORT', 'AUDIT_LOG', 'API_TOKEN',
        'ROLE', 'PERMISSION', 'TELECOM_EVENT', 'SUBSCRIBER_RECORD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification Enums
DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM (
        'IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK', 'SLACK', 'TEAMS',
        'PAGERDUTY', 'TELEGRAM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM (
        'ALERT_ASSIGNED', 'ALERT_ESCALATED', 'ALERT_SLA_WARNING',
        'ALERT_SLA_BREACH', 'INCIDENT_CREATED', 'INCIDENT_UPDATED',
        'INCIDENT_ASSIGNED', 'INCIDENT_SLA_WARNING', 'INCIDENT_SLA_BREACH',
        'TASK_ASSIGNED', 'TASK_DUE', 'TASK_OVERDUE', 'THREAT_INTEL_UPDATE',
        'IOC_MATCH', 'SYSTEM_ALERT', 'SYSTEM_DOWN', 'SYSTEM_DEGRADED',
        'COMPLIANCE_REMINDER', 'REPORT_READY', 'MAINTENANCE_SCHEDULED',
        'ANNOUNCEMENT', 'SECURITY_BULLETIN', 'PHISHING_SIMULATION',
        'BACKUP_SUCCESS', 'BACKUP_FAILURE', 'INTEGRATION_ERROR',
        'DATA_RETENTION_ALERT', 'ARPT_DEADLINE', 'LICENSE_EXPIRY',
        'CAPACITY_THRESHOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationSeverity" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Comment/Collaboration Enums
DO $$ BEGIN
    CREATE TYPE "CommentableType" AS ENUM (
        'ALERT', 'INCIDENT', 'TASK', 'EVIDENCE', 'INDICATOR', 'THREAT_ACTOR',
        'CAMPAIGN', 'ASSET', 'PLAYBOOK', 'REPORT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Playbook Enums
DO $$ BEGIN
    CREATE TYPE "AutomationEngine" AS ENUM (
        'CUSTOM', 'THEHIVE', 'SOCRATIC', 'STACKSTORM', 'RANSOMWARE',
        'CALIPSO', 'SHUFFLE', 'COURIER', 'PLAYBOOK_AUTOMATOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TestResult" AS ENUM (
        'PASSED', 'FAILED', 'ERROR', 'SKIPPED', 'NOT_TESTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PlaybookCategory" AS ENUM (
        'MALWARE_RESPONSE', 'PHISHING_RESPONSE', 'NETWORK_INTRUSION',
        'DATA_EXFILTRATION', 'DENIAL_OF_SERVICE', 'INSIDER_THREAT',
        'VULNERABILITY_RESPONSE', 'PRIVILEGE_ESCALATION', 'SUPPLY_CHAIN',
        'TELECOM_FRAUD', 'SIM_SWAP_RESPONSE', 'SS7_ATTACK_RESPONSE',
        'IMSI_CATCHER_RESPONSE', 'SIGNALLING_ATTACK_RESPONSE', 'DDoS_MITIGATION',
        'RANSOMWARE_RESPONSE', 'DATA_BREACH_RESPONSE', 'COMPLIANCE_VIOLATION',
        'GENERAL_SECURITY', 'INCIDENT_TRIAGE', 'THREAT_HUNTING',
        'PEN_TEST_RESPONSE', 'PHYSICAL_SECURITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PlaybookSeverity" AS ENUM (
        'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Compliance/Report Enums
DO $$ BEGIN
    CREATE TYPE "ReportFormat" AS ENUM (
        'PDF', 'HTML', 'DOCX', 'XLSX', 'CSV', 'JSON', 'XML'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RetentionClass" AS ENUM (
        'SHORT_TERM', 'STANDARD', 'EXTENDED', 'LONG_TERM', 'PERMANENT',
        'REGULATORY', 'LEGAL_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplianceFramework" AS ENUM (
        'ISO_27001', 'ISO_27035', 'ISO_22301', 'NIST_CSF', 'NIST_800_53',
        'SOC2', 'GDPR', 'PCI_DSS', 'HIPAA', 'ARPT_TELECOM', 'NCSA_ALGERIA',
        'ITU_T_X805', 'ETSI_EN303', 'GSMA_NAAS', 'CUSTOM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReportStatus" AS ENUM (
        'DRAFT', 'GENERATING', 'REVIEWING', 'APPROVED', 'PUBLISHED',
        'ARCHIVED', 'REJECTED', 'SCHEDULED', 'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Integration Enums
DO $$ BEGIN
    CREATE TYPE "AuthType" AS ENUM (
        'API_KEY', 'BASIC_AUTH', 'OAUTH2', 'OAUTH1', 'BEARER_TOKEN',
        'MTLS', 'SSH_KEY', 'HEADER_AUTH', 'NO_AUTH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IntegrationType" AS ENUM (
        'SIEM', 'SOAR', 'EDR', 'TIP', 'IDS_IPS', 'FIREWALL', 'DNS_SECURITY',
        'EMAIL_SECURITY', 'PROXY', 'VULN_SCANNER', 'ASSET_MANAGEMENT',
        'TICKETING', 'MESSAGING', 'DIRECTORY', 'CLOUD_PROVIDER', 'BACKUP',
        'MONITORING', 'LOGGING', 'THREAT_FEED', 'TELECOM_HLR', 'TELECOM_GTP',
        'TELECOM_RADIUS', 'TELECOM_SIGTRAN', 'TELECOM_PROVISIONING',
        'TELECOM_BILLING', 'TELECOM_CDR', 'TELECOM_FRAUD', 'TELECOM_NMS',
        'OSS_BSS', 'CASE_MANAGEMENT', 'GRC', 'DATA_LOSS_PREVENTION',
        'SANDOX', 'MALWARE_ANALYSIS', 'INTELLIGENCE_PLATFORM', 'ORCHESTRATION',
        'TICKET_SYSTEM', 'COLLABORATION', 'NOTIFICATION', 'IDENTITY_PROVIDER',
        'SECRET_MANAGER', 'CONFIG_MANAGEMENT', 'DEPLOYMENT', 'OBSERVABILITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "IntegrationStatus" AS ENUM (
        'ACTIVE', 'INACTIVE', 'ERROR', 'CONFIGURED', 'TESTING', 'DISABLED',
        'DEPRECATED', 'MAINTENANCE', 'SYNCING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Dashboard Enums
DO $$ BEGIN
    CREATE TYPE "DashboardType" AS ENUM (
        'CUSTOM', 'EXECUTIVE', 'SOC_OVERVIEW', 'THREAT_INTELLIGENCE',
        'INCIDENT_RESPONSE', 'COMPLIANCE', 'OPERATIONS', 'TELECOM_OPERATIONS',
        'NETWORK_SECURITY', 'ENDPOINT_SECURITY', 'CLOUD_SECURITY', 'THIRD_RISK',
        'SYSTEM_HEALTH', 'REPORTING'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DashboardScope" AS ENUM (
        'GLOBAL', 'TEAM', 'ROLE_BASED', 'PERSONAL', 'PUBLIC'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WidgetType" AS ENUM (
        'METRIC_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'DONUT_CHART',
        'AREA_CHART', 'SCATTER_PLOT', 'GAUGE', 'TABLE', 'LIST', 'HEATMAP',
        'TREEMAP', 'GEO_MAP', 'TIMELINE', 'FUNNEL', 'SANKEY', 'RADAR',
        'STAT_BOX', 'PROGRESS', 'STATUS_GRID', 'ALERT_FEED', 'INCIDENT_LIST',
        'THREAT_FEED', 'ASSET_STATUS', 'SYSTEM_HEALTH', 'COMPLIANCE_SCORE',
        'TREND_INDICATOR', 'TOP_N', 'COMPARISON', 'KPI_TRACKER', 'SCORECARD',
        'TELECOM_TRAFFIC', 'SUBSCRIBER_STATS', 'NETWORK_TOPOLOGY', 'SIGNALING_FLOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Retention Policy Enums
DO $$ BEGIN
    CREATE TYPE "RetentionAction" AS ENUM (
        'ARCHIVE', 'DELETE', 'ANONYMIZE', 'AGGREGATE', 'MOVE_TO_COLD_STORAGE',
        'EXPORT_AND_DELETE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ============================================
-- TABLES
-- ============================================

-- Users Table
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT,
    
    -- Role & Permissions
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "department" VARCHAR(100),
    "permissions" JSONB,
    
    -- Contact Information
    "phone" VARCHAR(20),
    "alternativePhone" VARCHAR(20),
    "avatar" TEXT,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'fr-DZ',
    
    -- Account Status
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedUntil" TIMESTAMPTZ,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMPTZ,
    "lastLoginIp" VARCHAR(45),
    "passwordChangedAt" TIMESTAMPTZ,
    "passwordExpiresAt" TIMESTAMPTZ,
    
    -- MFA Configuration
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" JSONB,
    "mfaVerifiedAt" TIMESTAMPTZ,
    "mfaMethod" "MfaMethod" DEFAULT 'TOTP',
    
    -- Audit Fields
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    -- Timestamps
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Indexes for users
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
CREATE INDEX "users_department_idx" ON "users"("department");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");


-- API Keys Table
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" VARCHAR(8) NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Permissions & Scopes
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    
    -- Status
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMPTZ,
    "lastUsedIp" VARCHAR(45),
    "usageCount" BIGINT NOT NULL DEFAULT 0,
    
    -- Expiration
    "expiresAt" TIMESTAMPTZ,
    
    -- Audit
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "revokedAt" TIMESTAMPTZ,
    "revokedBy" TEXT,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");


-- Sessions Table
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Session Metadata
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "deviceFingerprint" VARCHAR(255),
    
    -- Security
    "isTwoFactorVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT true,
    
    -- Timing
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_sessionToken_key" UNIQUE ("sessionToken"),
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_sessionToken_idx" ON "sessions"("sessionToken");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");


-- Alerts Table (Core SOC Entity)
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "alertId" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    
    -- Classification
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "category" "AlertCategory",
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Source Information
    "source" VARCHAR(100) NOT NULL,
    "sourceRef" VARCHAR(255),
    "platform" VARCHAR(100),
    "rawEvent" JSONB,
    
    -- Network Details
    "sourceIp" VARCHAR(45),
    "destinationIp" VARCHAR(45),
    "sourcePort" INTEGER,
    "destinationPort" INTEGER,
    "protocol" VARCHAR(20),
    "icmpCode" INTEGER,
    "icmpType" INTEGER,
    "packetLength" INTEGER,
    
    -- Telecom-Specific Fields
    "telecomProtocol" "TelecomProtocol",
    "imsi" VARCHAR(15),
    "imei" VARCHAR(15),
    "msisdn" VARCHAR(15),
    "iccid" VARCHAR(22),
    "gtpSessionId" VARCHAR(100),
    "ss7OpCode" VARCHAR(20),
    "ss7CallingParty" VARCHAR(25),
    "ss7CalledParty" VARCHAR(25),
    "apn" VARCHAR(100),
    "cellId" VARCHAR(20),
    "lac" VARCHAR(10),
    "tac" VARCHAR(10),
    "ratType" "RatType",
    "roamingStatus" "RoamingStatus",
    
    -- Endpoint Details
    "hostname" VARCHAR(255),
    "agentId" VARCHAR(100),
    "username" VARCHAR(100),
    "processName" VARCHAR(255),
    "processId" INTEGER,
    "filePath" TEXT,
    "registryKey" VARCHAR(500),
    
    -- MITRE ATT&CK Mapping
    "mitreTactic" VARCHAR(100),
    "mitreTechnique" VARCHAR(100),
    "mitreId" VARCHAR(20),
    "mitreSubtechnique" VARCHAR(20),
    
    -- Threat Intelligence Enrichment
    "threatIntelMatch" BOOLEAN NOT NULL DEFAULT false,
    "iocIndicator" VARCHAR(500),
    "iocType" "IndicatorType",
    "threatActor" VARCHAR(255),
    "campaign" VARCHAR(255),
    
    -- Assignment & Response
    "assignedToId" TEXT,
    "incidentId" TEXT,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "slaDeadline" TIMESTAMPTZ,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    
    -- Timeline
    "timestamp" TIMESTAMPTZ NOT NULL,
    "firstSeen" TIMESTAMPTZ NOT NULL,
    "lastSeen" TIMESTAMPTZ,
    "acknowledgedAt" TIMESTAMPTZ,
    "resolvedAt" TIMESTAMPTZ,
    
    -- ARPT Compliance Fields
    "arptReportable" BOOLEAN NOT NULL DEFAULT false,
    "arptReportedAt" TIMESTAMPTZ,
    "arptReference" VARCHAR(100),
    "dataRetentionExpiry" TIMESTAMPTZ,
    
    -- Metadata
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "customFields" JSONB,
    "suppressionRule" VARCHAR(255),
    "isSuppressed" BOOLEAN NOT NULL DEFAULT false,
    "isFalsePositive" BOOLEAN NOT NULL DEFAULT false,
    "falsePositiveReason" TEXT,
    
    -- Soft Delete & Audit
    "deletedAt" TIMESTAMPTZ,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alerts_alertId_key" UNIQUE ("alertId"),
    CONSTRAINT "alerts_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "alerts_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes for alerts (critical for query performance)
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");
CREATE INDEX "alerts_status_idx" ON "alerts"("status");
CREATE INDEX "alerts_source_idx" ON "alerts"("source");
CREATE INDEX "alerts_timestamp_idx" ON "alerts"("timestamp");
CREATE INDEX "alerts_assignedToId_idx" ON "alerts"("assignedToId");
CREATE INDEX "alerts_incidentId_idx" ON "alerts"("incidentId");
CREATE INDEX "alerts_sourceIp_idx" ON "alerts"("sourceIp");
CREATE INDEX "alerts_destinationIp_idx" ON "alerts"("destinationIp");
CREATE INDEX "alerts_threatIntelMatch_idx" ON "alerts"("threatIntelMatch");
CREATE INDEX "alerts_telecomProtocol_idx" ON "alerts"("telecomProtocol");
CREATE INDEX "alerts_imsi_idx" ON "alerts"("imsi");
CREATE INDEX "alerts_msisdn_idx" ON "alerts"("msisdn");
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- Full-text search index for alerts
CREATE INDEX "alerts_title_search_idx" ON "alerts" USING gin(to_tsvector('english', "title"));
CREATE INDEX "alerts_description_search_idx" ON "alerts" USING gin(to_tsvector('english', coalesce("description", '')));


-- Incidents Table
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "incidentId" VARCHAR(50) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    
    -- Classification
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'SEV1',
    "status" "IncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "category" "IncidentCategory",
    "classification" "IncidentClassification",
    "impact" "ImpactLevel" NOT NULL DEFAULT 'MODERATE',
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    
    -- Assignment
    "handlerId" TEXT,
    "team" VARCHAR(100),
    "escalationTeam" TEXT[] NOT NULL DEFAULT '{}',
    
    -- SLA Tracking
    "slaTarget" "SlaTarget",
    "slaActualResponse" INTEGER,
    "slaActualResolution" INTEGER,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "slaBreachReason" TEXT,
    
    -- Timeline
    "detectedAt" TIMESTAMPTZ NOT NULL,
    "reportedAt" TIMESTAMPTZ,
    "acknowledgedAt" TIMESTAMPTZ,
    "containedAt" TIMESTAMPTZ,
    "eradicatedAt" TIMESTAMPTZ,
    "recoveredAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "targetResolution" TIMESTAMPTZ,
    
    -- Metrics
    "mttdMinutes" INTEGER,
    "mttrMinutes" INTEGER,
    "totalDowntime" INTEGER,
    
    -- Telecom Impact Assessment
    "telecomImpact" JSONB,
    "subscribersAffected" BIGINT NOT NULL DEFAULT 0,
    "baseStationsAffected" INTEGER NOT NULL DEFAULT 0,
    "networkRegion" VARCHAR(10),
    "servicesImpacted" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Scope
    "affectedAssets" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Asset Relation
    "assetId" TEXT,
    "affectedUsers" INTEGER NOT NULL DEFAULT 0,
    "dataBreach" BOOLEAN NOT NULL DEFAULT false,
    "recordsAffected" INTEGER,
    "dataSensitivity" "DataSensitivity",
    
    -- Resolution
    "rootCause" TEXT,
    "resolution" TEXT,
    "lessonsLearned" TEXT,
    "remediationActions" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Escalation Chain
    "escalationHistory" JSONB,
    
    -- ARPT Compliance
    "arptNotifiable" BOOLEAN NOT NULL DEFAULT false,
    "arptNotificationDate" TIMESTAMPTZ,
    "arptReference" VARCHAR(100),
    "regulatoryFindings" TEXT,
    
    -- Cost Tracking
    "costEstimate" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'DZD',
    
    -- Metadata
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "externalRefs" JSONB,
    "complianceImpact" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Soft Delete & Audit
    "deletedAt" TIMESTAMPTZ,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "incidents_incidentId_key" UNIQUE ("incidentId"),
    CONSTRAINT "incidents_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "incidents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "incidents_status_idx" ON "incidents"("status");
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");
CREATE INDEX "incidents_handlerId_idx" ON "incidents"("handlerId");
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt");
CREATE INDEX "incidents_category_idx" ON "incidents"("category");
CREATE INDEX "incidents_arptNotifiable_idx" ON "incidents"("arptNotifiable");


-- Tasks Table
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "taskType" "TaskType",
    
    -- Assignment
    "assignedToId" TEXT,
    "incidentId" TEXT NOT NULL,
    
    -- Timing
    "dueDate" TIMESTAMPTZ,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "timeEstimated" INTEGER,
    "timeSpent" INTEGER,
    
    -- Dependencies
    "parentTaskId" TEXT,
    "dependsOn" TEXT[] NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    
    -- Automation
    "automationJobId" VARCHAR(100),
    "autoRetryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "tasks_incidentId_idx" ON "tasks"("incidentId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");


-- Evidence Table
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "type" "EvidenceType" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'COLLECTING',
    
    -- File/Artifact
    "fileName" VARCHAR(500),
    "fileType" VARCHAR(100),
    "fileSize" BIGINT,
    "fileHashSha256" VARCHAR(64),
    "fileHashMd5" VARCHAR(32),
    "filePath" TEXT,
    "fileUrl" TEXT,
    "storageBucket" VARCHAR(255),
    
    -- Collection Details
    "collectedBy" TEXT,
    "collectedAt" TIMESTAMPTZ,
    "location" TEXT,
    "collectionMethod" VARCHAR(100),
    "preserved" BOOLEAN NOT NULL DEFAULT false,
    "chainOfCustody" JSONB,
    
    -- Relation
    "incidentId" TEXT NOT NULL,
    
    -- Analysis
    "analysisResult" TEXT,
    "analysisTools" TEXT[] NOT NULL DEFAULT '{}',
    "analyzedAt" TIMESTAMPTZ,
    "analyzedBy" TEXT,
    
    -- Legal Hold
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "legalHoldReason" TEXT,
    "legalHoldPlacedBy" TEXT,
    "legalHoldDate" TIMESTAMPTZ,
    
    -- Metadata
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "classification" "DataSensitivity",
    "retentionUntil" TIMESTAMPTZ,
    "retentionPolicy" VARCHAR(100),
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "evidence_incidentId_idx" ON "evidence"("incidentId");
CREATE INDEX "evidence_status_idx" ON "evidence"("status");
CREATE INDEX "evidence_type_idx" ON "evidence"("type");
CREATE INDEX "evidence_fileHashSha256_idx" ON "evidence"("fileHashSha256");


-- Threat Actors Table
CREATE TABLE "threat_actors" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "alias" JSONB,
    "description" TEXT,
    "type" "ThreatActorType" NOT NULL,
    "motivation" "ThreatMotivation",
    "capability" "CapabilityLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Attribution
    "country" VARCHAR(2),
    "region" VARCHAR(100),
    "originConfidence" "OriginConfidence" DEFAULT 'MEDIUM',
    "firstSeen" TIMESTAMPTZ,
    "lastSeen" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    
    -- Targeting Focus
    "targetSectors" TEXT[] NOT NULL DEFAULT '{}',
    "targetCountries" TEXT[] NOT NULL DEFAULT '{}',
    "targetRegions" TEXT[] NOT NULL DEFAULT '{}',
    
    -- TTPs
    "tactics" JSONB,
    "techniques" JSONB,
    
    -- Financial Intelligence
    "financialMotivation" TEXT,
    "knownInfrastructure" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "externalRefs" JSONB,
    "notes" TEXT,
    "sourceQuality" "SourceQuality" DEFAULT 'MEDIUM',
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "threat_actors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "threat_actors_name_key" UNIQUE ("name")
);

CREATE INDEX "threat_actors_type_idx" ON "threat_actors"("type");
CREATE INDEX "threat_actors_country_idx" ON "threat_actors"("country");
CREATE INDEX "threat_actors_isActive_idx" ON "threat_actors"("isActive");


-- Indicators Table (IOCs)
CREATE TABLE "indicators" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" "IndicatorType" NOT NULL,
    "value" TEXT NOT NULL,
    "valueNormalized" TEXT,
    "description" TEXT,
    
    -- Classification
    "tlp" "TLPLevel" NOT NULL DEFAULT 'WHITE',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "severity" "IndicatorSeverity" NOT NULL DEFAULT 'UNKNOWN',
    
    -- Source
    "source" VARCHAR(255),
    "sourceUrl" TEXT,
    "sourceDate" TIMESTAMPTZ,
    "threatActorId" TEXT,
    "campaignId" TEXT,
    
    -- Validity
    "validFrom" TIMESTAMPTZ,
    "validUntil" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    
    -- Enrichment
    "context" JSONB,
    "detectionCount" INTEGER NOT NULL DEFAULT 0,
    "firstDetected" TIMESTAMPTZ,
    "lastDetected" TIMESTAMPTZ,
    "falsePositiveRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "truePositiveRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Kill Chain / MITRE
    "killChainPhase" "KillChainPhase",
    "mitreTechniqueIds" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Actions
    "action" "IndicatorAction" NOT NULL DEFAULT 'ALERT_ONLY',
    
    -- Tags & Labels
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "labels" TEXT[] NOT NULL DEFAULT '{}',
    "externalRefs" JSONB,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "indicators_threatActorId_fkey" FOREIGN KEY ("threatActorId") REFERENCES "threat_actors"(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "indicators_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "indicators_type_idx" ON "indicators"("type");
CREATE INDEX "indicators_value_idx" ON "indicators"("value");
CREATE INDEX "indicators_valueNormalized_idx" ON "indicators"("valueNormalized");
CREATE INDEX "indicators_isActive_idx" ON "indicators"("isActive");
CREATE INDEX "indicators_tlp_idx" ON "indicators"("tlp");
CREATE INDEX "indicators_firstDetected_idx" ON "indicators"("firstDetected");
CREATE INDEX "indicators_lastDetected_idx" ON "indicators"("lastDetected");

-- Full-text search on indicator values
CREATE INDEX "indicators_value_search_idx" ON "indicators" USING gin(to_tsvector('english', "value"));


-- Campaigns Table
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    
    -- Timeline
    "startDate" TIMESTAMPTZ,
    "endDate" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    
    -- Targeting
    "targetSector" TEXT[] NOT NULL DEFAULT '{}',
    "targetCountry" TEXT[] NOT NULL DEFAULT '{}',
    "targetRegion" VARCHAR(100),
    
    -- Attribution
    "threatActorId" TEXT NOT NULL,
    
    -- Relations
    -- indicators relation
    
    -- Intelligence
    "objectives" TEXT,
    "intendedEffect" TEXT,
    
    -- Metadata
    "externalRefs" JSONB,
    "notes" TEXT,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campaigns_threatActorId_fkey" FOREIGN KEY ("threatActorId") REFERENCES "threat_actors"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "campaigns_threatActorId_idx" ON "campaigns"("threatActorId");
CREATE INDEX "campaigns_isActive_idx" ON "campaigns"("isActive");


-- Assets Table (Telecom Infrastructure)
CREATE TABLE "assets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "assetId" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "AssetType" NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "criticality" "AssetCriticality" NOT NULL DEFAULT 'MEDIUM',
    
    -- Location & Network
    "location" VARCHAR(255),
    "locationCode" VARCHAR(20),
    "region" VARCHAR(10),
    "zone" VARCHAR(50),
    "networkSegment" VARCHAR(100),
    
    -- Network Identity
    "ipAddress" VARCHAR(45),
    "ipAddresses" TEXT[] NOT NULL DEFAULT '{}',
    "hostname" VARCHAR(255),
    "fqdn" VARCHAR(500),
    "macAddress" VARCHAR(17),
    
    -- Telecom-Specific Attributes
    "vendor" VARCHAR(100),
    "model" VARCHAR(100),
    "softwareVersion" VARCHAR(100),
    "serialNumber" VARCHAR(100),
    "licenseInfo" TEXT,
    
    -- Capacity Information
    "capacityMax" INTEGER,
    "capacityCurrent" INTEGER,
    "capacityUnit" VARCHAR(50),
    
    -- Operational Status
    "operationalStatus" "AssetOperationalStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "maintenanceWindow" TEXT,
    "lastMaintenance" TIMESTAMPTZ,
    "nextMaintenance" TIMESTAMPTZ,
    
    -- Ownership
    "owner" VARCHAR(255),
    "ownerId" TEXT,
    
    -- Security
    "securityZone" "SecurityZone",
    "complianceRequired" TEXT[] NOT NULL DEFAULT '{}',
    "lastVulnerabilityScan" TIMESTAMPTZ,
    "vulnerabilityScore" INTEGER,
    "openVulnerabilities" INTEGER NOT NULL DEFAULT 0,
    
    -- Monitoring
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monitoringTool" VARCHAR(100),
    "alertingProfile" VARCHAR(100),
    
    -- Relations
    "parentAssetId" TEXT,
    
    -- Configuration
    "configuration" JSONB,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "customFields" JSONB,
    
    -- ARPT Compliance
    "arptRegistered" BOOLEAN NOT NULL DEFAULT false,
    "arptRegistrationRef" VARCHAR(100),
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assets_assetId_key" UNIQUE ("assetId"),
    CONSTRAINT "assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "assets_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "assets"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "assets_type_idx" ON "assets"("type");
CREATE INDEX "assets_category_idx" ON "assets"("category");
CREATE INDEX "assets_criticality_idx" ON "assets"("criticality");
CREATE INDEX "assets_operationalStatus_idx" ON "assets"("operationalStatus");
CREATE INDEX "assets_ipAddress_idx" ON "assets"("ipAddress");
CREATE INDEX "assets_hostname_idx" ON "assets"("hostname");
CREATE INDEX "assets_location_idx" ON "assets"("location");
CREATE INDEX "assets_vendor_idx" ON "assets"("vendor");


-- System Components Table
CREATE TABLE "system_components" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "category" "ComponentCategory" NOT NULL,
    "description" TEXT,
    
    -- Status
    "status" "ComponentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    
    -- Version & Uptime
    "version" VARCHAR(50),
    "uptimeSeconds" BIGINT NOT NULL DEFAULT 0,
    "lastCheck" TIMESTAMPTZ,
    
    -- Resources
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "networkIn" BIGINT,
    "networkOut" BIGINT,
    
    -- Endpoints
    "endpoint" VARCHAR(500),
    "apiKey" TEXT,
    "config" JSONB,
    
    -- Statistics
    "eventsToday" BIGINT NOT NULL DEFAULT 0,
    "alertsToday" INTEGER NOT NULL DEFAULT 0,
    "errorsToday" INTEGER NOT NULL DEFAULT 0,
    
    -- Health Checks
    "healthChecks" JSONB,
    "dependencies" TEXT[] NOT NULL DEFAULT '{}',
    
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Maintenance
    "maintenanceWindowStart" TIMESTAMPTZ,
    "maintenanceWindowEnd" TIMESTAMPTZ,
    "nextMaintenance" TIMESTAMPTZ,
    
    -- SLA
    "slaUptimeTarget" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
    "slaUptimeActual" DOUBLE PRECISION,
    "lastIncidentDate" TIMESTAMPTZ,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "system_components_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_components_name_key" UNIQUE ("name")
);

CREATE INDEX "system_components_category_idx" ON "system_components"("category");
CREATE INDEX "system_components_status_idx" ON "system_components"("status");


-- Audit Logs Table
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT,
    "userName" VARCHAR(255),
    "userRole" "UserRole",
    
    "action" "AuditAction" NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" VARCHAR(255),
    
    -- Request Context
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "sessionId" TEXT,
    "requestId" VARCHAR(100),
    
    -- Change Details
    "oldValue" JSONB,
    "newValue" JSONB,
    "changedFields" TEXT[] NOT NULL DEFAULT '{}',
    "metadata" JSONB,
    
    -- Result
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "errorCode" VARCHAR(50),
    "durationMs" INTEGER,
    
    -- Regulatory
    "arptRetainUntil" TIMESTAMPTZ,
    "complianceTag" VARCHAR(100),
    
    -- Timestamp
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_resourceType_idx" ON "audit_logs"("resourceType");
CREATE INDEX "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_ipAddress_idx" ON "audit_logs"("ipAddress");
CREATE INDEX "audit_logs_success_idx" ON "audit_logs"("success");

-- Partition audit logs by month for large datasets (optional, uncomment if needed)
-- CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
-- CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');


-- Notifications Table
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "message" TEXT,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    
    -- Status
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    
    -- Action
    "actionUrl" TEXT,
    "actionText" VARCHAR(100),
    "resourceId" TEXT,
    "resourceType" VARCHAR(100),
    
    -- Delivery Channels
    "deliveryChannels" "NotificationChannel"[] NOT NULL ARRAY['IN_APP'],
    "deliveryStatus" JSONB,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "slackSent" BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    "sendAt" TIMESTAMPTZ NOT NULL,
    "deliveredAt" TIMESTAMPTZ,
    "expireAt" TIMESTAMPTZ,
    
    -- Retry
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    
    -- Audit
    "createdBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_sendAt_idx" ON "notifications"("sendAt");


-- Comments Table
CREATE TABLE "comments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Polymorphic relation
    "commentableType" "CommentableType" NOT NULL,
    "commentableId" TEXT NOT NULL,
    
    -- Thread
    "parentId" TEXT,
    
    -- Metadata
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMPTZ,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isMentionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mentions" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Attachments
    "attachments" JSONB,
    
    -- Audit
    "createdBy" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "comments_userId_idx" ON "comments"("userId");
CREATE INDEX "comments_commentableType_idx" ON "comments"("commentableType");
CREATE INDEX "comments_commentableId_idx" ON "comments"("commentableId");
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");


-- Playbooks Table
CREATE TABLE "playbooks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "PlaybookCategory" NOT NULL,
    "severity" "PlaybookSeverity" NOT NULL DEFAULT 'MEDIUM',
    
    -- Content
    "content" TEXT NOT NULL,
    "steps" JSONB,
    
    -- Automation
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "automationEngine" "AutomationEngine" DEFAULT 'CUSTOM',
    "automationScript" TEXT,
    "triggers" JSONB,
    "inputs" JSONB,
    "outputs" JSONB,
    
    -- Approval Workflow
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approverRoles" TEXT[] NOT NULL DEFAULT '{}',
    "approvalWorkflow" JSONB,
    
    -- Versioning
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "parentPlaybookId" TEXT,
    
    -- Usage Stats
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "avgExecutionTime" INTEGER,
    "lastExecutedAt" TIMESTAMPTZ,
    
    -- Testing
    "testCases" JSONB,
    "lastTestResult" "TestResult",
    "lastTestedAt" TIMESTAMPTZ,
    
    -- Metadata
    "authorId" TEXT,
    "reviewers" TEXT[] NOT NULL DEFAULT '{}',
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "externalDocs" JSONB,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "playbooks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "playbooks_category_idx" ON "playbooks"("category");
CREATE INDEX "playbooks_isPublished_idx" ON "playbooks"("isPublished");


-- Compliance Reports Table
CREATE TABLE "compliance_reports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "framework" "ComplianceFramework" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    
    -- Period
    "periodStart" TIMESTAMPTZ NOT NULL,
    "periodEnd" TIMESTAMPTZ NOT NULL,
    "generatedAt" TIMESTAMPTZ,
    
    -- Content
    "summary" TEXT,
    "findings" JSONB,
    "recommendations" JSONB,
    "score" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    
    -- People
    "authorId" TEXT,
    "reviewerId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ,
    
    -- File
    "filePath" TEXT,
    "fileSize" BIGINT,
    "fileHash" VARCHAR(64),
    "fileFormat" "ReportFormat" DEFAULT 'PDF',
    
    -- Distribution
    "distributedTo" JSONB,
    "distributionDate" TIMESTAMPTZ,
    "distributionMethod" VARCHAR(50),
    
    -- ARPT Specific
    "arptSubmissionId" VARCHAR(100),
    "arptSubmissionDate" TIMESTAMPTZ,
    "arptAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "arptAckDate" TIMESTAMPTZ,
    
    -- Retention
    "retentionClass" "RetentionClass" DEFAULT 'STANDARD',
    "retainUntil" TIMESTAMPTZ,
    
    -- Metadata
    "version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "externalRef" VARCHAR(100),
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "compliance_reports_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "compliance_reports_framework_idx" ON "compliance_reports"("framework");
CREATE INDEX "compliance_reports_status_idx" ON "compliance_reports"("status");
CREATE INDEX "compliance_reports_periodStart_idx" ON "compliance_reports"("periodStart");
CREATE INDEX "compliance_reports_periodEnd_idx" ON "compliance_reports"("periodEnd");


-- Integrations Table
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "description" TEXT,
    
    -- Connection
    "endpoint" VARCHAR(500) NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "config" JSONB,
    
    -- Authentication
    "authType" "AuthType" DEFAULT 'API_KEY',
    "oauthConfig" JSONB,
    "certificatePath" TEXT,
    
    -- Status
    "status" "IntegrationStatus" NOT NULL DEFAULT 'CONFIGURED',
    "lastSync" TIMESTAMPTZ,
    "lastError" TEXT,
    "lastHealthCheck" TIMESTAMPTZ,
    
    -- Statistics
    "syncFrequency" VARCHAR(50),
    "eventsProcessed" BIGINT NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    
    -- Capabilities
    "capabilities" TEXT[] NOT NULL DEFAULT '{}',
    "supportedActions" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Health
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "responseTimeAvg" INTEGER,
    "responseTimeLast" INTEGER,
    "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    
    -- Rate Limiting
    "rateLimit" INTEGER,
    "rateLimitRemaining" INTEGER,
    "rateLimitReset" TIMESTAMPTZ,
    
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    
    -- Version Info
    "runningVersion" VARCHAR(50),
    "minSupportedVersion" VARCHAR(50),
    
    -- Telecom Operator Config
    "operatorConfig" JSONB,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integrations_type_idx" ON "integrations"("type");
CREATE INDEX "integrations_status_idx" ON "integrations"("status");
CREATE INDEX "integrations_isEnabled_idx" ON "integrations"("isEnabled");


-- Dashboards Table
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "DashboardType" NOT NULL DEFAULT 'CUSTOM',
    
    -- Layout
    "layout" JSONB,
    "refreshInterval" INTEGER,
    
    -- Scope
    "scope" "DashboardScope" DEFAULT 'PERSONAL',
    "ownerId" TEXT,
    
    -- Access Control
    "sharedWith" TEXT[] NOT NULL DEFAULT '{}',
    "editableBy" TEXT[] NOT NULL DEFAULT '{}',
    
    -- Filters
    "defaultFilters" JSONB,
    
    -- Metadata
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMPTZ,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dashboards_scope_idx" ON "dashboards"("scope");
CREATE INDEX "dashboards_ownerId_idx" ON "dashboards"("ownerId");


-- Widgets Table
CREATE TABLE "widgets" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dashboardId" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    
    -- Configuration
    "config" JSONB,
    "dataSource" VARCHAR(100),
    "query" TEXT,
    
    -- Position & Size
    "positionX" INTEGER NOT NULL DEFAULT 0,
    "positionY" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 4,
    "height" INTEGER NOT NULL DEFAULT 3,
    
    -- State
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,
    
    -- Refresh
    "refreshInterval" INTEGER,
    
    -- Audit
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "widgets_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "widgets_dashboardId_idx" ON "widgets"("dashboardId");
CREATE INDEX "widgets_type_idx" ON "widgets"("type");


-- Retention Policies Table
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "entityType" "ResourceType" NOT NULL,
    "action" "RetentionAction" DEFAULT 'ARCHIVE',
    
    -- Duration
    "retentionPeriodDays" INTEGER NOT NULL,
    "gracePeriodDays" INTEGER DEFAULT 30,
    
    -- Conditions
    "conditions" JSONB,
    "filters" JSONB,
    
    -- Schedule
    "schedule" VARCHAR(100),
    "lastRun" TIMESTAMPTZ,
    "nextRun" TIMESTAMPTZ,
    
    -- Statistics
    "recordsProcessed" BIGINT NOT NULL DEFAULT 0,
    "recordsArchived" BIGINT NOT NULL DEFAULT 0,
    "recordsDeleted" BIGINT NOT NULL DEFAULT 0,
    
    -- Status
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystemPolicy" BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit
    "createdBy" TEXT,
    "updatedBy" TEXT,
    
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retention_policies_entityType_idx" ON "retention_policies"("entityType");
CREATE INDEX "retention_policies_isEnabled_idx" ON "retention_policies"("isEnabled");


-- ============================================
-- FUNCTIONS AND TRIGERS
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updatedAt trigger to all tables with updatedAt column
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_modtime BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_modtime BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_modtime BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evidence_modtime BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_threat_actors_modtime BEFORE UPDATE ON threat_actors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_indicators_modtime BEFORE UPDATE ON indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_modtime BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_modtime BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_components_modtime BEFORE UPDATE ON system_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_modtime BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playbooks_modtime BEFORE UPDATE ON playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_reports_modtime BEFORE UPDATE ON compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_modtime BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboards_modtime BEFORE UPDATE ON dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_widgets_modtime BEFORE UPDATE ON widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retention_policies_modtime BEFORE UPDATE ON retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Function for generating alert IDs
CREATE OR REPLACE FUNCTION generate_alert_id()
RETURNS TRIGGER AS $$
DECLARE
    alert_seq TEXT;
    date_prefix TEXT;
BEGIN
    date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    -- Use a sequence-like approach with max+1
    EXECUTE format(
        'SELECT COALESCE(MAX(SUBSTRING(alert_id FROM 8)::int), 0) + 1 FROM alerts WHERE alert_id LIKE %L',
        'ALT-' || date_prefix || '-%'
    ) INTO alert_seq;
    NEW.alertId := 'ALT-' || date_prefix || '-' || LPAD(alert_seq::text, 5, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_alert_id_trigger BEFORE INSERT ON alerts FOR EACH ROW EXECUTE FUNCTION generate_alert_id();


-- Function for generating incident IDs
CREATE OR REPLACE FUNCTION generate_incident_id()
RETURNS TRIGGER AS $$
DECLARE
    inc_seq TEXT;
    year_text TEXT;
BEGIN
    year_text := EXTRACT(YEAR FROM CURRENT_DATE)::text;
    EXECUTE format(
        'SELECT COALESCE(MAX(SUBSTRING(incident_id FROM 5 FOR 4)::int), 0) + 1 FROM incidents WHERE incident_id LIKE %L',
        'INC-' || year_text || '-%'
    ) INTO inc_seq;
    NEW.incidentId := 'INC-' || year_text || '-' || LPAD(inc_seq::text, 3, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_incident_id_trigger BEFORE INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION generate_incident_id();


-- Function for generating asset IDs
CREATE OR REPLACE FUNCTION generate_asset_id()
RETURNS TRIGGER AS $$
DECLARE
    asset_num TEXT;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(MAX(SUBSTRING(asset_id FROM 5 FOR 3)::int), 0) + 1 FROM assets WHERE asset_id LIKE %L',
        'AST-' || SUBSTRING(NEW.type FOR 3) || '-%'
    ) INTO asset_num;
    NEW.assetId := 'AST-' || SUBSTRING(NEW.type FOR 3) || '-' || LPAD(asset_num::text, 3, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_asset_id_trigger BEFORE INSERT ON assets FOR EACH ROW EXECUTE FUNCTION generate_asset_id();


-- ============================================
-- VIEWS
-- ============================================

-- Active Incidents View
CREATE OR REPLACE VIEW active_incidents AS
SELECT 
    i.*,
    COUNT(DISTINCT a.id) as alert_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT e.id) as evidence_count
FROM incidents i
LEFT JOIN alerts a ON a."incidentId" = i.id AND a."deletedAt" IS NULL
LEFT JOIN tasks t ON t."incidentId" = i.id
LEFT JOIN evidence e ON e."incidentId" = i.id
WHERE i."deletedAt" IS NULL
    AND i.status NOT IN ('CLOSED', 'CANCELLED')
GROUP BY i.id;

-- Telecom Alerts Summary View (for mobile operator integration)
CREATE OR REPLACE VIEW telecom_alerts_summary AS
SELECT 
    "telecomProtocol",
    "ratType",
    "roamingStatus",
    severity,
    status,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE "threatIntelMatch" = true) as ioc_matches,
    COUNT(*) FILTER (WHERE "arptReportable" = true) as arpt_reportable,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM alerts
WHERE "deletedAt" IS NULL
    AND "telecomProtocol" IS NOT NULL
GROUP BY "telecomProtocol", "ratType", "roamingStatus", severity, status;

-- System Health Overview View
CREATE OR REPLACE VIEW system_health_overview AS
SELECT 
    category,
    COUNT(*) as total_components,
    COUNT(*) FILTER (WHERE status = 'OPERATIONAL') as operational,
    COUNT(*) FILTER (WHERE status = 'DEGRADED') as degraded,
    COUNT(*) FILTER (WHERE status = 'DOWN') as down,
    COUNT(*) FILTER (WHERE status IN ('ERROR', 'UNKNOWN')) as problematic,
    ROUND(AVG("healthScore")::numeric, 1) as avg_health_score,
    ROUND(AVG("cpuUsage")::numeric, 1) as avg_cpu,
    ROUND(AVG("memoryUsage")::numeric, 1) as avg_memory,
    ROUND(AVG("diskUsage")::numeric, 1) as avg_disk
FROM system_components
WHERE "isEnabled" = true
GROUP BY category;

-- ARPT Compliance Dashboard View
CREATE OR REPLACE VIEW arpt_compliance_dashboard AS
SELECT 
    -- Incident statistics
    (SELECT COUNT(*) FROM incidents WHERE "arptNotifiable" = true AND "deletedAt" IS NULL) as notifiable_incidents,
    (SELECT COUNT(*) FROM incidents WHERE "arptNotifiable" = true AND "arptNotificationDate" IS NOT NULL AND "deletedAt" IS NULL) as reported_incidents,
    (SELECT COUNT(*) FROM incidents WHERE "arptNotifiable" = true AND "arptNotificationDate" IS NULL AND "deletedAt" IS NULL) as pending_reports,
    
    -- Alert statistics
    (SELECT COUNT(*) FROM alerts WHERE "arptReportable" = true AND "deletedAt" IS NULL) as reportable_alerts,
    (SELECT COUNT(*) FROM alerts WHERE "arptReportable" = true AND "arptReportedAt" IS NOT NULL AND "deletedAt" IS NULL) as reported_alerts,
    
    -- Compliance reports
    (SELECT COUNT(*) FROM compliance_reports WHERE framework = 'ARPT_TELECOM' AND "deletedAt" IS NULL) as total_arpt_reports,
    (SELECT COUNT(*) FROM compliance_reports WHERE framework = 'ARPT_TELECOM' AND status = 'PUBLISHED' AND "deletedAt" IS NULL) as published_reports;


-- ============================================
-- INITIAL DATA - TELECOM OPERATORS (Algeria)
-- ============================================

-- This section is handled by the seed script
-- See prisma/seed.ts for initial data population


-- ============================================
-- MIGRATION METADATA
-- ============================================

-- Record this migration
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
    '00a00b00c00d00e00f010a00b00c00d00f010a00b00c00d00f010a00b00c00d00f01',
    'sha256:initial_migration_checksum_placeholder',
    now(),
    'init',
    '',
    null,
    now(),
    1
) ON CONFLICT DO NOTHING;
