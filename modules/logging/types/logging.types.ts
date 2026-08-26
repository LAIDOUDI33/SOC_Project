/**
 * Centralized Logging & Audit System - Type Definitions
 * National SOC Platform for Algeria (2026-2030)
 * 
 * This module provides comprehensive type definitions for:
 * - Structured log entries
 * - Audit trail records
 * - Log shipping configurations
 * - Retention policies
 * - PII detection and masking
 * - Compliance formats (SOC2, GDPR, ISO27001)
 */

// ============================================================================
// LOG LEVELS
// ============================================================================

/**
 * Standard log levels for the SOC platform
 * Ordered by severity from lowest to highest
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Numeric values for log level comparison and filtering
 */
export const LogLevelValues: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 10,
  [LogLevel.INFO]: 20,
  [LogLevel.WARN]: 30,
  [LogLevel.ERROR]: 40,
  [LogLevel.CRITICAL]: 50
};

/**
 * Log level metadata including color codes for UI display
 */
export interface LogLevelMetadata {
  level: LogLevel;
  value: number;
  color: string;
  backgroundColor: string;
  icon: string;
  description: string;
}

/**
 * Complete log level configuration map
 */
export const LogLevelConfig: Record<LogLevel, LogLevelMetadata> = {
  [LogLevel.DEBUG]: {
    level: LogLevel.DEBUG,
    value: 10,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    icon: '🔍',
    description: 'Detailed debugging information'
  },
  [LogLevel.INFO]: {
    level: LogLevel.INFO,
    value: 20,
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    icon: 'ℹ️',
    description: 'General informational messages'
  },
  [LogLevel.WARN]: {
    level: LogLevel.WARN,
    value: 30,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    icon: '⚠️',
    description: 'Warning conditions that need attention'
  },
  [LogLevel.ERROR]: {
    level: LogLevel.ERROR,
    value: 40,
    color: '#EF4444',
    backgroundColor: '#FEE2E2',
    icon: '❌',
    description: 'Error conditions that need investigation'
  },
  [LogLevel.CRITICAL]: {
    level: LogLevel.CRITICAL,
    value: 50,
    color: '#DC2626',
    backgroundColor: '#FECACA',
    icon: '🚨',
    description: 'Critical conditions requiring immediate action'
  }
};

// ============================================================================
// LOG SOURCES / CATEGORIES
// ============================================================================

/**
 * Log source categories for classification and filtering
 */
export enum LogSource {
  // Authentication & Authorization
  AUTH = 'auth',
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_TOKEN = 'auth.token',
  AUTH_MFA = 'auth.mfa',
  
  // API Operations
  API = 'api',
  API_REQUEST = 'api.request',
  API_RESPONSE = 'api.response',
  API_ERROR = 'api.error',
  
  // System Events
  SYSTEM = 'system',
  SYSTEM_STARTUP = 'system.startup',
  SYSTEM_SHUTDOWN = 'system.shutdown',
  SYSTEM_CONFIG = 'system.config',
  SYSTEM_HEALTH = 'system.health',
  
  // Security Events
  SECURITY = 'security',
  SECURITY_ALERT = 'security.alert',
  SECURITY_INCIDENT = 'security.incident',
  SECURITY_SCAN = 'security.scan',
  SECURITY_VULNERABILITY = 'security.vulnerability',
  
  // Audit Trail
  AUDIT = 'audit',
  AUDIT_CREATE = 'audit.create',
  AUDIT_READ = 'audit.read',
  AUDIT_UPDATE = 'audit.update',
  AUDIT_DELETE = 'audit.delete',
  
  // Integration Sources
  WAZUH = 'wazuh',
  SURICATA = 'suricata',
  MISP = 'misp',
  THEHIVE = 'thehive',
  ELASTICSEARCH = 'elasticsearch',
  GRAFANA = 'grafana',
  
  // Network
  NETWORK = 'network',
  NETWORK_FIREWALL = 'network.firewall',
  NETWORK_IDS = 'network.ids',
  NETWORK_DNS = 'network.dns',
  
  // Application
  APPLICATION = 'application',
  DATABASE = 'database',
  SCHEDULED_JOB = 'scheduled_job'
}

/**
 * Log source metadata for UI display and configuration
 */
export interface LogSourceMetadata {
  source: LogSource;
  category: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  retentionDefault: number; // days
}

/**
 * Complete log source configuration
 */
export const LogSourceConfig: Record<LogSource, LogSourceMetadata> = {
  [LogSource.AUTH]: { source: LogSource.AUTH, category: 'authentication', displayName: 'Authentication', description: 'Authentication events', icon: '🔐', color: '#8B5CF6', retentionDefault: 365 },
  [LogSource.AUTH_LOGIN]: { source: LogSource.AUTH_LOGIN, category: 'authentication', displayName: 'Login Events', description: 'User login attempts', icon: '📥', color: '#8B5CF6', retentionDefault: 365 },
  [LogSource.AUTH_LOGOUT]: { source: LogSource.AUTH_LOGOUT, category: 'authentication', displayName: 'Logout Events', description: 'User logout events', icon: '📤', color: '#8B5CF6', retentionDefault: 90 },
  [LogSource.AUTH_TOKEN]: { source: LogSource.AUTH_TOKEN, category: 'authentication', displayName: 'Token Events', description: 'Token operations', icon: '🎫', color: '#8B5CF6', retentionDefault: 30 },
  [LogSource.AUTH_MFA]: { source: LogSource.AUTH_MFA, category: 'authentication', displayName: 'MFA Events', description: 'Multi-factor authentication', icon: '🔑', color: '#8B5CF6', retentionDefault: 180 },
  [LogSource.API]: { source: LogSource.API, category: 'api', displayName: 'API', description: 'API operations', icon: '🔌', color: '#06B6D4', retentionDefault: 90 },
  [LogSource.API_REQUEST]: { source: LogSource.API_REQUEST, category: 'api', displayName: 'API Requests', description: 'Incoming API requests', icon: '📨', color: '#06B6D4', retentionDefault: 90 },
  [LogSource.API_RESPONSE]: { source: LogSource.API_RESPONSE, category: 'api', displayName: 'API Responses', description: 'API response data', icon: '📩', color: '#06B6D4', retentionDefault: 30 },
  [LogSource.API_ERROR]: { source: LogSource.API_ERROR, category: 'api', displayName: 'API Errors', description: 'API error responses', icon: '💥', color: '#06B6D4', retentionDefault: 180 },
  [LogSource.SYSTEM]: { source: LogSource.SYSTEM, category: 'system', displayName: 'System', description: 'System-level events', icon: '⚙️', color: '#64748B', retentionDefault: 90 },
  [LogSource.SYSTEM_STARTUP]: { source: LogSource.SYSTEM_STARTUP, category: 'system', displayName: 'Startup', description: 'System startup events', icon: '🚀', color: '#64748B', retentionDefault: 30 },
  [LogSource.SYSTEM_SHUTDOWN]: { source: LogSource.SYSTEM_SHUTDOWN, category: 'system', displayName: 'Shutdown', description: 'System shutdown events', icon: '🛑', color: '#64748B', retentionDefault: 30 },
  [LogSource.SYSTEM_CONFIG]: { source: LogSource.SYSTEM_CONFIG, category: 'system', displayName: 'Configuration', description: 'Configuration changes', icon: '⚙️', color: '#64748B', retentionDefault: 365 },
  [LogSource.SYSTEM_HEALTH]: { source: LogSource.SYSTEM_HEALTH, category: 'system', displayName: 'Health Checks', description: 'System health status', icon: '💚', color: '#64748B', retentionDefault: 14 },
  [LogSource.SECURITY]: { source: LogSource.SECURITY, category: 'security', displayName: 'Security', description: 'Security-related events', icon: '🛡️', color: '#EF4444', retentionDefault: 2555 }, // 7 years
  [LogSource.SECURITY_ALERT]: { source: LogSource.SECURITY_ALERT, category: 'security', displayName: 'Alerts', description: 'Security alerts', icon: '🚨', color: '#EF4444', retentionDefault: 2555 },
  [LogSource.SECURITY_INCIDENT]: { source: LogSource.SECURITY_INCIDENT, category: 'security', displayName: 'Incidents', description: 'Security incidents', icon: '🔴', color: '#EF4444', retentionDefault: 2555 },
  [LogSource.SECURITY_SCAN]: { source: LogSource.SECURITY_SCAN, category: 'security', displayName: 'Scans', description: 'Security scan results', icon: '🔬', color: '#EF4444', retentionDefault: 365 },
  [LogSource.SECURITY_VULNERABILITY]: { source: LogSource.SECURITY_VULNERABILITY, category: 'security', displayName: 'Vulnerabilities', description: 'Vulnerability findings', icon: '🐛', color: '#EF4444', retentionDefault: 1825 }, // 5 years
  [LogSource.AUDIT]: { source: LogSource.AUDIT, category: 'audit', displayName: 'Audit', description: 'Audit trail entries', icon: '📋', color: '#059669', retentionDefault: 2555 },
  [LogSource.AUDIT_CREATE]: { source: LogSource.AUDIT_CREATE, category: 'audit', displayName: 'Create Audit', description: 'Resource creation audit', icon: '➕', color: '#059669', retentionDefault: 2555 },
  [LogSource.AUDIT_READ]: { source: LogSource.AUDIT_READ, category: 'audit', displayName: 'Read Audit', description: 'Resource access audit', icon: '👁️', color: '#059669', retentionDefault: 1095 }, // 3 years
  [LogSource.AUDIT_UPDATE]: { source: LogSource.AUDIT_UPDATE, category: 'audit', displayName: 'Update Audit', description: 'Resource modification audit', icon: '✏️', color: '#059669', retentionDefault: 2555 },
  [LogSource.AUDIT_DELETE]: { source: LogSource.AUDIT_DELETE, category: 'audit', displayName: 'Delete Audit', description: 'Resource deletion audit', icon: '🗑️', color: '#059669', retentionDefault: 2555 },
  [LogSource.WAZUH]: { source: LogSource.WAZUH, category: 'integration', displayName: 'Wazuh', description: 'Wazuh SIEM logs', icon: '🦅', color: '#FF6600', retentionDefault: 365 },
  [LogSource.SURICATA]: { source: LogSource.SURICATA, category: 'integration', displayName: 'Suricata', description: 'Suricata IDS/IPS logs', icon: '🐉', color: '#00CC66', retentionDefault: 365 },
  [LogSource.MISP]: { source: LogSource.MISP, category: 'integration', displayName: 'MISP', description: 'MISP threat intelligence', icon: '🦋', color: '#E74C3C', retentionDefault: 365 },
  [LogSource.THEHIVE]: { source: LogSource.THEHIVE, category: 'integration', displayName: 'TheHive', description: 'TheHive case management', icon: '🐝', color: '#F39C12', retentionDefault: 2555 },
  [LogSource.ELASTICSEARCH]: { source: LogSource.ELASTICSEARCH, category: 'integration', displayName: 'Elasticsearch', description: 'Elasticsearch operations', icon: '🔍', color: '#FEC514', retentionDefault: 90 },
  [LogSource.GRAFANA]: { source: LogSource.GRAFANA, category: 'integration', displayName: 'Grafana', description: 'Grafana dashboard access', icon: '📊', color: '#F46800', retentionDefault: 90 },
  [LogSource.NETWORK]: { source: LogSource.NETWORK, category: 'network', displayName: 'Network', description: 'Network events', icon: '🌐', color: '#0EA5E9', retentionDefault: 180 },
  [LogSource.NETWORK_FIREWALL]: { source: LogSource.NETWORK_FIREWALL, category: 'network', displayName: 'Firewall', description: 'Firewall events', icon: '🧱', color: '#0EA5E9', retentionDefault: 365 },
  [LogSource.NETWORK_IDS]: { source: LogSource.NETWORK_IDS, category: 'network', displayName: 'IDS/IPS', description: 'Intrusion detection events', icon: '🎯', color: '#0EA5E9', retentionDefault: 365 },
  [LogSource.NETWORK_DNS]: { source: LogSource.NETWORK_DNS, category: 'network', displayName: 'DNS', description: 'DNS query logs', icon: '🌍', color: '#0EA5E9', retentionDefault: 90 },
  [LogSource.APPLICATION]: { source: LogSource.APPLICATION, category: 'application', displayName: 'Application', description: 'Application-level logs', icon: '📱', color: '#8B5CF6', retentionDefault: 90 },
  [LogSource.DATABASE]: { source: LogSource.DATABASE, category: 'application', displayName: 'Database', description: 'Database operations', icon: '🗄️', color: '#8B5CF6', retentionDefault: 180 },
  [LogSource.SCHEDULED_JOB]: { source: LogSource.SCHEDULED_JOB, category: 'application', displayName: 'Scheduled Jobs', description: 'Scheduled task execution', icon: '⏰', color: '#8B5CF6', retentionDefault: 90 }
};

// ============================================================================
// CORE LOG ENTRY STRUCTURE
// ============================================================================

/**
 * Core structured log entry format
 * All log entries follow this JSON structure for consistency
 */
export interface LogEntry {
  /** Unique identifier for this log entry (UUID v4) */
  id: string;
  
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  
  /** Log severity level */
  level: LogLevel;
  
  /** Source/category of the log entry */
  source: LogSource;
  
  /** Human-readable message describing the event */
  message: string;
  
  /** Structured data associated with the event */
  data?: Record<string, unknown>;
  
  /** Error details if this is an error-level log */
  error?: LogError;
  
  /** Request correlation ID for distributed tracing */
  correlationId?: string;
  
  /** Parent span ID for tracing hierarchies */
  parentSpanId?: string;
  
  /** Span ID for this specific operation */
  spanId?: string;
  
  /** Hostname where the log was generated */
  hostname: string;
  
  /** Service/application name that generated the log */
  service: string;
  
  /** Environment where the log was generated */
  environment: Environment;
  
  /** Version of the application/service */
  version: string;
  
  /** User ID if applicable (may be hashed for privacy) */
  userId?: string;
  
  /** Session ID if applicable */
  sessionId?: string;
  
  /** IP address of the client (may be anonymized) */
  clientIp?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Request ID for API requests */
  requestId?: string;
  
  /** PII detection results */
  piiDetected?: PIIDetectionResult;
  
  /** Processing duration in milliseconds */
  durationMs?: number;
  
  /** Custom tags for categorization and filtering */
  tags?: string[];
  
  /** Index name for Elasticsearch storage */
  _index?: string;
}

/**
 * Error information attached to error-level log entries
 */
export interface LogError {
  /** Error class/type name */
  name: string;
  
  /** Error message */
  message: string;
  
  /** Stack trace if available */
  stackTrace?: string;
  
  /** Error code if applicable */
  code?: string;
  
  /** HTTP status code if this is an HTTP error */
  statusCode?: number;
  
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Deployment environments
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  DR = 'disaster-recovery'
}

// ============================================================================
// AUDIT TRAIL TYPES
// ============================================================================

/**
 * Action types for audit trail classification
 */
export enum AuditAction {
  // CRUD Operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // Authentication Actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  TOKEN_ISSUED = 'token_issued',
  TOKEN_REVOKED = 'token_revoked',
  
  // Authorization Actions
  GRANT_PERMISSION = 'grant_permission',
  REVOKE_PERMISSION = 'revoke_permission',
  ROLE_ASSIGNMENT = 'role_assignment',
  ROLE_REMOVAL = 'role_removal',
  
  // Administrative Actions
  CONFIG_CHANGE = 'config_change',
  SYSTEM_START = 'system_start',
  SYSTEM_STOP = 'system_stop',
  USER_CREATE = 'user_create',
  USER_DISABLE = 'user_disable',
  USER_ENABLE = 'user_enable',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  
  // Security Actions
  ALERT_ACKNOWLEDGE = 'alert_acknowledge',
  ALERT_ESCALATE = 'alert_escalate',
  INCIDENT_CREATE = 'incident_create',
  INCIDENT_UPDATE = 'incident_update',
  INCIDENT_CLOSE = 'incident_close',
  BLOCK_IP = 'block_ip',
  UNBLOCK_IP = 'unblock_ip',
  
  // Data Access
  DATA_ACCESS = 'data_access',
  DATA_DOWNLOAD = 'data_download',
  DATA_PRINT = 'data_print',
  QUERY_EXECUTED = 'query_executed',
  REPORT_GENERATED = 'report_generated',
  
  // Integration Actions
  THREAT_INTEL_QUERY = 'threat_intel_query',
  IOC_LOOKUP = 'ioc_lookup',
  CASE_CREATED = 'case_created',
  CASE_UPDATED = 'case_updated',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed'
}

/**
 * Actor types for identifying who performed an action
 */
export enum ActorType {
  USER = 'user',
  SERVICE = 'service',
  SYSTEM = 'system',
  API_KEY = 'api_key',
  EXTERNAL = 'external'
}

/**
 * Information about who performed the audited action
 */
export interface AuditActor {
  /** Unique identifier for the actor */
  id: string;
  
  /** Type of actor */
  type: ActorType;
  
  /** Display name (may be redacted based on permissions) */
  displayName?: string;
  
  /** Username/login identifier */
  username?: string;
  
  /** Email address (may be hashed) */
  email?: string;
  
  /** Role(s) at time of action */
  roles?: string[];
  
  /** Department/organization unit */
  department?: string;
  
  /** IP address of the actor */
  ipAddress?: string;
  
  /** User agent used by the actor */
  userAgent?: string;
  
  /** Session identifier */
  sessionId?: string;
}

/**
 * Resource target information
 */
export interface AuditResource {
  /** Type of resource affected */
  type: ResourceType;
  
  /** Unique identifier of the resource */
  id: string;
  
  /** Name/description of the resource */
  name?: string;
  
  /** Path/URL to the resource */
  path?: string;
  
  /** Previous state before the action (for updates/deletes) */
  previousState?: Record<string, unknown>;
  
  /** New state after the action (for creates/updates) */
  newState?: Record<string, unknown];
  
  /** Fields that were changed (for updates) */
  changedFields?: string[];
}

/**
 * Types of resources that can be audited
 */
export enum ResourceType {
  // User Resources
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  
  // System Resources
  CONFIGURATION = 'configuration',
  SYSTEM_SETTING = 'system_setting',
  API_KEY = 'api_key',
  
  // Security Resources
  ALERT = 'alert',
  INCIDENT = 'incident',
  IOC = 'ioc',
  THREAT_INTELLIGENCE = 'threat_intelligence',
  CASE = 'case',
  TASK = 'task',
  
  // Data Resources
  LOG_ENTRY = 'log_entry',
  REPORT = 'report',
  DASHBOARD = 'dashboard',
  DATASOURCE = 'datasource',
  
  // Network Resources
  FIREWALL_RULE = 'firewall_rule',
  IDS_RULE = 'ids_rule',
  BLOCKED_IP = 'blocked_ip',
  
  // Infrastructure
  SERVER = 'server',
  AGENT = 'agent',
  SENSOR = 'sensor'
}

/**
 * Outcome of the audited action
 */
export enum AuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  DENIED = 'denied',
  ERROR = 'error'
}

/**
 * Complete audit trail entry
 * These records are immutable once created
 */
export interface AuditEntry {
  /** Unique identifier for this audit record (UUID v4) */
  id: string;
  
  /** ISO 8601 timestamp of when the action occurred */
  timestamp: string;
  
  /** The action that was performed */
  action: AuditAction;
  
  /** Who performed the action */
  actor: AuditActor;
  
  /** What resource was affected */
  resource: AuditResource;
  
  /** Whether the action succeeded or failed */
  outcome: AuditOutcome;
  
  /** Human-readable description of what happened */
  description: string;
  
  /** Additional context about the action */
  context?: Record<string, unknown>;
  
  /** Reason for failure or denial (if applicable) */
  failureReason?: string;
  
  /** IP-based geolocation data */
  geoLocation?: GeoLocation;
  
  /** Risk score assigned to this action (0-100) */
  riskScore?: number;
  
  /** Hash of the previous audit entry for chain integrity */
  previousEntryHash?: string;
  
  /** Hash of this entry for tamper evidence */
  entryHash: string;
  
  /** Digital signature if signing is enabled */
  signature?: string;
  
  /** Retention expiration date */
  retentionUntil: string;
  
  /** Compliance categories this entry satisfies */
  complianceTags: ComplianceCategory[];
  
  /** Index for Elasticsearch storage */
  _index?: string;
}

/**
 * Geolocation data for audit entries
 */
export interface GeoLocation {
  country: string;
  country_code: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  asn_organization?: string;
}

// ============================================================================
// COMPLIANCE TYPES
// ============================================================================

/**
 * Compliance frameworks supported by the logging system
 */
export enum ComplianceFramework {
  SOC2 = 'SOC2',
  GDPR = 'GDPR',
  ISO27001 = 'ISO27001',
  NIST = 'NIST',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  ALGERIAN_CYBERSECURITY_LAW = 'ALGERIAN_CYBERSECURITY_LAW'
}

/**
 * Categories within each compliance framework
 */
export enum ComplianceCategory {
  // SOC2 Categories
  SOC2_ACCESS_CONTROL = 'SOC2.AC.1',
  SOC2_CHANGE_MANAGEMENT = 'SOC2.CM.1',
  SOC2_SYSTEM_OPERATIONS = 'SOC2.SO.1',
  SOC2_RISK_MITIGATION = 'SOC2.RM.1',
  SOC2_LOGGING_MONITORING = 'SOC2.LM.1',
  
  // GDPR Articles
  GDPR_ARTICLE_5 = 'GDPR.Art5',       // Principles
  GDPR_ARTICLE_25 = 'GDPR.Art25',     // Data protection by design
  GDPR_ARTICLE_30 = 'GDPR.Art30',     // Records of processing
  GDPR_ARTICLE_32 = 'GDPR.Art32',     // Security of processing
  GDPR_ARTICLE_33 = 'GDPR.Art33',     // Breach notification
  
  // ISO27001 Controls
  ISO_A_12_3 = 'ISO27001.A.12.3',    // Backup
  ISO_A_12_4 = 'ISO27001.A.12.4',    // Logging
  ISO_A_13_1 = 'ISO27001.A.13.1',    // Network controls
  ISO_A_13_2 = 'ISO27001.A.13.2',    // Information transfer
  ISO_A_14_1 = 'ISO27001.A.14.1',    // Information security requirements
  ISO_A_15_1 = 'ISO27001.A.15.1',    // Information security in supplier relationships
  ISO_A_16_1 = 'ISO27001.A.16.1',    // Incident management
  
  // NIST Controls
  NIST_AC_2 = 'NIST.AC-2',           // Account management
  NIST_AC_6 = 'NIST.AC-6',           // Least privilege
  NIST_AU_2 = 'NIST.AU-2',           // Audit events
  NIST_AU_3 = 'NIST.AU-3',           // Content of audit records
  NIST_AU_5 = 'NIST.AU-5',           // Response to audit processing failures
  NIST_AU_6 = 'NIST.AU-6',           // Audit review and analysis
  NIST_AU_9 = 'NIST.AU-9',           // Protection of audit information
  NIST_AU_12 = 'NIST.AU-12',         // Audit generation
  NIST_SC_8 = 'NIST.SC-8',           // Transmission confidentiality
  NIST_SI_4 = 'NIST.SI-4',           // System monitoring
  
  // Algerian Cybersecurity Law
  ALGERIAN_ARTICLE_8 = 'ALGERIAN.Art8',   // Incident reporting
  ALGERIAN_ARTICLE_10 = 'ALGERIAN.Art10', // Log retention
  ALGERIAN_ARTICLE_12 = 'ALGERIAN.Art12', // Access control
  ALGERIAN_ARTICLE_15 = 'ALGERIAN.Art15'  // Data protection
}

/**
 * Compliance report structure
 */
export interface ComplianceReport {
  /** Report generation timestamp */
  generatedAt: string;
  
  /** Reporting period start */
  periodStart: string;
  
  /** Reporting period end */
  periodEnd: string;
  
  /** Framework being reported on */
  framework: ComplianceFramework;
  
  /** Overall compliance percentage */
  overallCompliance: number;
  
  /** Status per requirement */
  requirements: ComplianceRequirementStatus[];
  
  /** Summary statistics */
  summary: ComplianceSummary;
  
  /** Recommendations for improvement */
  recommendations: ComplianceRecommendation[];
  
  /** Evidence references */
  evidence: EvidenceReference[];
}

/**
 * Status of a single compliance requirement
 */
export interface ComplianceRequirementStatus {
  /** Requirement identifier */
  requirementId: ComplianceCategory;
  
  /** Requirement title */
  title: string;
  
  /** Description of what's required */
  description: string;
  
  /** Current status */
  status: ComplianceStatus;
  
  /** Percentage complete (0-100) */
  completeness: number;
  
  /** Number of supporting log entries */
  evidenceCount: number;
  
  /** Last evidence timestamp */
  lastEvidenceAt?: string;
  
  /** Gaps or issues identified */
  gaps?: string[];
}

/**
 * Compliance status enumeration
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NON_COMPLIANT = 'non_compliant',
  NOT_APPLICABLE = 'not_applicable',
  PENDING_REVIEW = 'pending_review'
}

/**
 * High-level compliance summary
 */
export interface ComplianceSummary {
  totalRequirements: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  notApplicableCount: number;
  pendingReviewCount: number;
  totalLogEntriesAnalyzed: number;
  totalAuditEntriesAnalyzed: number;
}

/**
 * Recommendation for improving compliance
 */
export interface ComplianceRecommendation {
  /** Unique recommendation ID */
  id: string;
  
  /** Related requirement(s) */
  relatedRequirements: ComplianceCategory[];
  
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  
  /** Title of recommendation */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Suggested actions */
  actions: string[];
  
  /** Estimated effort */
  estimatedEffort: string;
  
  /** Target date for implementation */
  targetDate?: string;
}

/**
 * Reference to evidence supporting compliance
 */
export interface EvidenceReference {
  /** Type of evidence */
  type: 'log_entry' | 'audit_entry' | 'document' | 'screenshot' | 'configuration';
  
  /** Reference ID or location */
  reference: string;
  
  /** Timestamp of evidence */
  timestamp: string;
  
  /** Brief description */
  description: string;
}

// ============================================================================
// PII DETECTION AND MASKING
// ============================================================================

/**
 * Types of personally identifiable information that can be detected
 */
export enum PIIType {
  EMAIL_ADDRESS = 'email_address',
  PHONE_NUMBER = 'phone_number',
  NATIONAL_ID = 'national_id',
  PASSPORT_NUMBER = 'passport_number',
  CREDIT_CARD = 'credit_card',
  IBAN = 'iban',
  IP_ADDRESS = 'ip_address',
  MAC_ADDRESS = 'mac_address',
  FULL_NAME = 'full_name',
  USERNAME = 'username',
  PASSWORD = 'password',
  API_KEY = 'api_key',
  JWT_TOKEN = 'jwt_token',
  SESSION_ID = 'session_id',
  ADDRESS = 'address',
  DATE_OF_BIRTH = 'date_of_birth',
  HEALTH_INFORMATION = 'health_information',
  FINANCIAL_ACCOUNT = 'financial_account',
  BIOMETRIC_DATA = 'biometric_data'
}

/**
 * Result of PII scanning a log entry
 */
export interface PIIDetectionResult {
  /** Whether any PII was detected */
  hasPII: boolean;
  
  /** List of detected PII items */
  items: PIIItem[];
  
  /** Overall risk level based on PII content */
  riskLevel: PIIRiskLevel;
  
  /** Recommended actions */
  recommendedActions: PIIAction[];
}

/**
 * Individual PII item found in log content
 */
export interface PIIItem {
  /** Type of PII detected */
  type: PIIType;
  
  /** The original value (for internal use only) */
  rawValue: string;
  
  /** Masked version of the value */
  maskedValue: string;
  
  /** Position in the original text */
  position: {
    start: number;
    end: number;
  };
  
  /** Field name where PII was found */
  fieldName: string;
  
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Risk level assessment for PII exposure
 */
export enum PIIRiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Actions that can be taken on detected PII
 */
export enum PIIAction {
  MASK = 'mask',
  HASH = 'hash',
  REDACT = 'reduct',
  ENCRYPT = 'encrypt',
  QUARANTINE = 'quarantine',
  ALERT = 'alert',
  IGNORE = 'ignore'
}

/**
 * Configuration for PII detection and handling
 */
 export interface PIIDetectionConfig {
  /** Enable/disable PII detection */
  enabled: boolean;
  
  /** PII types to detect */
  detectTypes: PIIType[];
  
  /** Default action for each PII type */
  defaultActions: Partial<Record<PIIType, PIIAction>>;
  
  /** Minimum confidence threshold */
  minConfidence: number;
  
  /** Fields to always scan */
  scanFields: string[];
  
  /** Fields to exclude from scanning */
  excludeFields: string[];
  
  /** Custom regex patterns for additional PII types */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    action: PIIAction;
  }>;
}

// ============================================================================
// LOG SHIPPING CONFIGURATIONS
// ============================================================================

/**
 * Transport types for log shipping
 */
export enum LogTransportType {
  CONSOLE = 'console',
  FILE = 'file',
  ELASTICSEARCH = 'elasticsearch',
  HTTP = 'HTTP',
  SYSLOG = 'syslog',
  KAFKA = 'kafka',
  S3 = 's3',
  GCS = 'gcs',
  AZURE_BLOB = 'azure_blob'
}

/**
 * Transport-specific configuration
 */
export interface TransportConfig {
  /** Transport type */
  type: LogTransportType;
  
  /** Whether this transport is enabled */
  enabled: boolean;
  
  /** Minimum log level to send to this transport */
  minLevel: LogLevel;
  
  /** Maximum log level to send (optional) */
  maxLevel?: LogLevel;
  
  /** Buffer size before flushing (number of entries) */
  bufferSize: number;
  
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  
  /** Retry configuration */
  retry: RetryConfig;
  
  /** Transport-specific options */
  options: TransportOptions;
}

/**
 * Retry configuration for failed shipments
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  
  /** Maximum delay between retries */
  maxDelayMs: boolean;
  
  /** Whether to retry on specific HTTP status codes */
  retryOnStatusCodes?: number[];
}

/**
 * Transport-specific options union type
 */
export type TransportOptions =
  | ConsoleTransportOptions
  | FileTransportOptions
  | ElasticsearchTransportOptions
  | HttpTransportOptions
  | SyslogTransportOptions
  | KafkaTransportOptions
  | CloudStorageTransportOptions;

/** Console transport options */
export interface ConsoleTransportOptions {
  /** Use colored output */
  colors: boolean;
  
  /** Output format ('json' | 'pretty' | 'simple') */
  format: 'json' | 'pretty' | 'simple';
  
  /** Include timestamps */
  timestamps: boolean;
  
  /** Target stream ('stdout' | 'stderr') */
  target: 'stdout' | 'stderr';
}

/** File transport options */
export interface FileTransportOptions {
  /** Directory for log files */
  logDirectory: string;
  
  /** Filename pattern (supports date placeholders) */
  filenamePattern: string;
  
  /** Maximum file size in bytes before rotation */
  maxFileSize: number;
  
  /** Maximum number of files to keep */
  maxFiles: number;
  
  /** Whether to compress rotated files */
  compress: boolean;
  
  /** File encoding */
  encoding: BufferEncoding;
}

/** Elasticsearch transport options */
export interface ElasticsearchTransportOptions {
  /** Elasticsearch node URL(s) */
  nodes: string[];
  
  /** Authentication credentials */
  auth?: {
    username: string;
    password: string;
  } | {
    apiKey: string;
  } | {
    bearerToken: string;
  };
  
  /** Index pattern (supports date math) */
  indexPattern: string;
  
  /** Pipeline to use */
  pipeline?: string;
  
  /** TLS configuration */
  tls?: TLSConfig;
  
  /** Timeout in milliseconds */
  timeout: number;
  
  /** Sniff for nodes on startup */
  sniffOnStart: boolean;
  
  /** Sniff interval in milliseconds */
  sniffInterval?: number;
}

/** HTTP transport options */
export interface HttpTransportOptions {
  /** Endpoint URL */
  endpoint: string;
  
  /** HTTP method */
  method: 'POST' | 'PUT';
  
  /** Headers to include */
  headers: Record<string, string>;
  
  /** Timeout in milliseconds */
  timeout: number;
  
  /** TLS configuration */
  tls?: TLSConfig;
}

/** Syslog transport options */
export interface SyslogTransportOptions {
  /** Syslog host */
  host: string;
  
  /** Syslog port */
  port: number;
  
  /** Protocol ('tcp' | 'udp' | 'unix') */
  protocol: 'tcp' | 'udp' | 'unix';
  
  /** Facility code */
  facility: number;
  
  /** App name */
  appName: string;
  
  /** Unix socket path (if protocol is unix) */
  socketPath?: string;
}

/** Kafka transport options */
export interface KafkaTransportOptions {
  /** Kafka broker list */
  brokers: string[];
  
  /** Topic to publish to */
  topic: string;
  
  /** Client ID */
  clientId: string;
  
  /** Partition key field */
  partitionKeyField?: string;
  
  /** SASL authentication config */
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  
  /** SSL/TLS configuration */
  ssl?: TLSConfig;
}

/** Cloud storage transport options (S3/GCS/Azure Blob) */
export interface CloudStorageTransportOptions {
  /** Provider */
  provider: 'aws-s3' | 'gcp-gcs' | 'azure-blob';
  
  /** Bucket/container name */
  bucket: string;
  
  /** Key prefix */
  prefix: string;
  
  /** Credentials */
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  };
  
  /** Region */
  region?: string;
  
  /** Storage class */
  storageClass?: string;
  
  /** Compression format */
  compression: 'none' | 'gzip' | 'zstd';
}

/** TLS configuration */
export interface TLSConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
  passphrase?: string;
}

/**
 * Complete shipping configuration
 */
export interface ShippingConfiguration {
  /** Unique configuration identifier */
  id: string;
  
  /** Configuration name */
  name: string;
  
  /** Source filter - which sources to ship */
  sources: LogSource[];
  
  /** Level filter */
  minLevel: LogLevel;
  
  /** Transports to use */
  transports: TransportConfig[];
  
  /** Whether shipping is active */
  active: boolean;
  
  /** Created at timestamp */
  createdAt: string;
  
  /** Updated at timestamp */
  updatedAt: string;
  
  /** Statistics */
  stats: ShippingStats;
}

/**
 * Shipping statistics
 */
export interface ShippingStats {
  /** Total entries shipped */
  totalShipped: number;
  
  /** Total entries failed */
  totalFailed: number;
  
  /** Current backlog size */
  backlogSize: number;
  
  /** Last successful shipment */
  lastShippedAt?: string;
  
  /** Last failure */
  lastFailureAt?: string;
  
  /** Average shipment latency in ms */
  avgLatencyMs: number;
  
  /** Bytes shipped */
  bytesShipped: number;
}

/**
 * Shipper health status
 */
export interface ShipperStatus {
  /** Overall status */
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  
  /** Per-transport status */
  transports: TransportStatus[];
  
  /** Backlog information */
  backlog: BacklogInfo;
  
  /** Uptime percentage */
  uptimePercent: number;
  
  /** Last check timestamp */
  lastCheckAt: string;
}

/**
 * Individual transport status
 */
export interface TransportStatus {
  /** Transport type */
  type: LogTransportType;
  
  /** Connection status */
  connected: boolean;
  
  /** Health status */
  healthy: boolean;
  
  /** Error message if unhealthy */
  error?: string;
  
  /** Last successful operation */
  lastSuccessAt?: string;
  
  /** Entries processed */
  entriesProcessed: number;
  
  /** Entries failed */
  entriesFailed: number;
}

/**
 * Backlog information
 */
export interface BacklogInfo {
  /** Total entries waiting to be shipped */
  totalEntries: number;
  
  /** Oldest entry age in milliseconds */
  oldestEntryAgeMs: number;
  
  /** Estimated time to clear at current rate */
  estimatedClearTimeMs: number;
  
  /** By-source breakdown */
  bySource: Record<LogSource, number>;
}

// ============================================================================
// RETENTION POLICY TYPES
// ============================================================================

/**
 * Retention policy actions
 */
export enum RetentionAction {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  COMPRESS = 'compress',
  ANONYMIZE = 'anonymize',
  MOVE_TO_COLD = 'move_to_cold'
}

/**
 * Retention policy definition
 */
export interface RetentionPolicy {
  /** Unique policy identifier */
  id: string;
  
  /** Policy name */
  name: string;
  
  /** Policy description */
  description: string;
  
  /** Which log sources this applies to */
  sources: LogSource[] | '*';
  
  /** Which levels this applies to (empty = all) */
  levels?: LogLevel[];
  
  /** How long to retain logs */
  retentionPeriodDays: number;
  
  /** What action to take when retention expires */
  action: RetentionAction;
  
  /** Archive destination (if action is ARCHIVE) */
  archiveDestination?: string;
  
  /** Whether this policy is enabled */
  enabled: boolean;
  
  /** Priority (higher = processed first) */
  priority: number;
  
  /** Schedule for applying this policy (cron expression) */
  schedule?: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last applied timestamp */
  lastAppliedAt?: string;
  
  /** Who created this policy */
  createdBy: string;
  
  /** Statistics */
  stats: RetentionPolicyStats;
}

/**
 * Retention policy execution statistics
 */
export interface RetentionPolicyStats {
  /** Total times this policy has been applied */
  timesApplied: number;
  
  /** Total entries processed */
  totalProcessed: number;
  
  /** Total entries deleted/archived */
  totalActioned: number;
  
  /** Last run duration in ms */
  lastRunDurationMs?: number;
  
  /** Space freed in bytes */
  spaceFreedBytes: number;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  /** Source/source category */
  source: LogSource;
  
  /** Total entries stored */
  totalEntries: number;
  
  /** Total storage used in bytes */
  totalBytes: number;
  
  /** Oldest entry timestamp */
  oldestEntry: string;
  
  /** Newest entry timestamp */
  newestEntry: string;
  
  /** Estimated entries expiring in next 30 days */
  entriesExpiringSoon: number;
  
  /** Applicable retention policy */
  applicablePolicy?: RetentionPolicy;
  
  /** Breakdown by level */
  byLevel: Record<LogLevel, number>;
  
  /** Growth trend (entries per day over last 7 days) */
  growthTrend: number[];
}

// ============================================================================
// LOG CORRELATION AND SEARCH
// ============================================================================

/**
 * Search filters for log queries
 */
export interface LogSearchFilters {
  /** Text search query */
  query?: string;
  
  /** Filter by log levels */
  levels?: LogLevel[];
  
  /** Filter by sources */
  sources?: LogSource[];
  
  /** Time range start */
  startTime?: string;
  
  /** Time range end */
  endTime?: string;
  
  /** Filter by correlation ID */
  correlationId?: string;
  
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by session ID */
  sessionId?: string;
  
  /** Filter by request ID */
  requestId?: string;
  
  /** Filter by client IP */
  clientIp?: string;
  
  /** Filter by tags */
  tags?: string[];
  
  /** Filter by service */
  service?: string;
  
  /** Filter by environment */
  environment?: Environment;
  
  /** Filter by presence of errors */
  hasErrors?: boolean;
  
  /** Filter by PII detected */
  hasPII?: boolean;
  
  /** Custom field filters */
  customFilters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'not_exists' | 'in' | 'contains' | 'regex';
    value: unknown;
  }>;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  
  /** Items per page */
  pageSize: number;
  
  /** Sort field */
  sortBy?: keyof LogEntry;
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  
  /** Search after token (for cursor pagination) */
  searchAfter?: string;
}

/**
 * Log search result
 */
export interface LogSearchResult {
  /** Matching log entries */
  entries: LogEntry[];
  
  /** Total matching entries (before pagination) */
  totalCount: number;
  
  /** Pagination info */
  pagination: PaginationInfo;
  
  /** Aggregations/facets */
  aggregations?: LogAggregations;
  
  /** Query execution time in ms */
  tookMs: number;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  /** Current page */
  page: number;
  
  /** Page size */
  pageSize: number;
  
  /** Total pages */
  totalPages: number;
  
  /** Has next page */
  hasNextPage: boolean;
  
  /** Has previous page */
  hasPrevPage: boolean;
}

/**
 * Aggregation results for log searches
 */
export interface LogAggregations {
  /** Count by log level */
  byLevel: Record<LogLevel, number>;
  
  /** Count by source */
  bySource: Record<string, number>;
  
  /** Count by service */
  byService: Record<string, number>;
  
  /** Count over time (histogram) */
  overTime: TimeBucket[];
  
  /** Top values for a field */
  topValues?: Record<string, Array<{ value: string; count: number }>>;
}

/**
 * Time bucket for histogram aggregation
 */
export interface TimeBucket {
  /** Bucket start time */
  timestamp: string;
  
  /** Count in this bucket */
  count: number;
}

/**
 * Correlation rule definition
 */
export interface CorrelationRule {
  /** Rule ID */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Whether rule is enabled */
  enabled: boolean;
  
  /** Time window for correlation (ms) */
  timeWindowMs: number;
  
  /** Conditions to match */
  conditions: CorrelationCondition[];
  
  /** Action to take when correlated */
  action: CorrelationAction;
  
  /** Priority */
  priority: number;
}

/**
 * Single condition in a correlation rule
 */
export interface CorrelationCondition {
  /** Field to match */
  field: string;
  
  /** Operator */
  operator: 'eq' | 'neq' | 'contains' | 'regex' | 'gt' | 'lt' | 'exists';
  
  /** Value to match against */
  value: unknown;
  
  /** Source filter (optional) */
  source?: LogSource;
}

/**
 * Action to take when correlation matches
 */
export interface CorrelationAction {
  /** Action type */
  type: 'create_alert' | 'tag_entries' | 'send_notification' | 'run_playbook';
  
  /** Action configuration */
  config: Record<string, unknown>;
}

/**
 * Alert condition for automated alerting on log patterns
 */
export interface AlertCondition {
  /** Condition ID */
  id: string;
  
  /** Condition name */
  name: string;
  
  /** Query/filter that triggers the alert */
  trigger: LogSearchFilters;
  
  /** Threshold: minimum occurrences within window */
  threshold: {
    count: number;
    windowMs: number;
  };
  
  /** Severity of resulting alert */
  severity: LogLevel;
  
  /** Notification channels */
  notifyChannels: string[];
  
  /** Cooldown between alerts (ms) */
  cooldownMs: number;
  
  /** Whether condition is enabled */
  enabled: boolean;
}

// ============================================================================
// ARCHIVE AND COMPRESSION TYPES
// ============================================================================

/**
 * Archive formats supported
 */
export enum ArchiveFormat {
  ZIP = 'zip',
  TAR_GZ = 'tar.gz',
  GZIP = 'gzip',
  XZ = 'xz'
}

/**
 * Export formats for log data
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  NDJSON = 'ndjson',
  PARQUET = 'parquet'
}

/**
 * Archive job status
 */
export enum ArchiveJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Archive job definition
 */
export interface ArchiveJob {
  /** Job ID */
  id: string;
  
  /** Job status */
  status: ArchiveJobStatus;
  
  /** Source filters */
  sources: LogSource[];
  
  /** Time range */
  startTime: string;
  endTime: string;
  
  /** Archive format */
  format: ArchiveFormat;
  
  /** Destination path/URL */
  destination: string;
  
  /** Compression settings */
  compression: {
    enabled: boolean;
    level: number;
  };
  
  /** Progress tracking */
  progress: {
    totalEntries: number;
    processedEntries: number;
    percentComplete: number;
  };
  
  /** Timing */
  startedAt: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  
  /** Error information if failed */
  error?: string;
  
  /** Result file size */
  resultSizeBytes?: number;
}

// ============================================================================
// DASHBOARD AND VISUALIZATION TYPES
// ============================================================================

/**
 * Dashboard widget types
 */
export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  NUMBER_CARD = 'number_card',
  STATUS_LIST = 'status_list',
  LOG_STREAM = 'log_stream',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge'
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  /** Widget ID */
  id: string;
  
  /** Widget type */
  type: WidgetType;
  
  /** Widget title */
  title: string;
  
  /** Position and size */
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Data configuration */
  dataSource: {
    type: 'logs' | 'audit' | 'metrics' | 'custom';
    query?: LogSearchFilters;
    aggregation?: string;
    refreshIntervalMs?: number;
  };
  
  /** Display options */
  displayOptions: Record<string, unknown>;
  
  /** Refresh state */
  lastUpdated?: string;
  loading?: boolean;
  error?: string;
}

/**
 * Log statistics for dashboard display
 */
export interface LogStatistics {
  /** Time range of statistics */
  period: {
    start: string;
    end: string;
  };
  
  /** Total log volume */
  totalLogs: number;
  
  /** Logs per second average */
  logsPerSecond: number;
  
  /** Volume by level */
  byLevel: Record<LogLevel, number>;
  
  /** Volume by source */
  bySource: Record<string, number>;
  
  /** Error rate as percentage */
  errorRate: number;
  
  /** Critical event count */
  criticalCount: number;
  
  /** PII exposure count */
  piiExposureCount: number;
  
  /** Trend data (hourly for last 24h) */
  hourlyTrend: HourlyLogData[];
  
  /** Top error messages */
  topErrors: Array<{
    message: string;
    count: number;
    percentage: number;
  }>;
  
  /** Active alerts count */
  activeAlerts: number;
  
  /** Shipping backlog */
  shippingBacklog: number;
  
  /** Storage usage */
  storageUsedBytes: number;
  storageQuotaBytes: number;
  storageUsagePercent: number;
}

/**
 * Hourly log data point
 */
export interface HourlyLogData {
  hour: string;
  total: number;
  errors: number;
  warnings: number;
  critical: number;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Module integration configurations
 */
export interface ModuleIntegration {
  /** Module identifier */
  module: 'wazuh' | 'suricata' | 'misp' | 'thehive' | 'elasticsearch' | 'grafana';
  
  /** Module display name */
  moduleName: string;
  
  /** Whether integration is enabled */
  enabled: boolean;
  
  /** Log forwarding configuration */
  forwardConfig: {
    /** Which event types to forward */
    eventTypes: string[];
    
    /** Transform function name */
    transformFunction: string;
    
    /** Destination index/pattern */
    destination: string;
    
    /** Forwarding mode ('realtime' | 'batch') */
    mode: 'realtime' | 'batch';
    
    /** Batch size if batch mode */
    batchSize?: number;
    
    /** Batch flush interval ms if batch mode */
    batchIntervalMs?: number;
  };
  
  /** Connection status */
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'unknown';
  
  /** Statistics */
  stats: {
    totalForwarded: number;
    totalFailed: number;
    lastForwardedAt?: string;
  };
}

/**
 * Wazuh-specific log mapping
 */
export interface WazuhLogMapping {
  /** Wazuh alert level to our log level */
  levelMapping: Record<number, LogLevel>;
  
  /** Field mappings */
  fieldMappings: Record<string, string>;
  
  /** Default source for Wazuh logs */
  defaultSource: LogSource;
}

/**
 * Suricata EVE JSON log mapping
 */
export interface SuricataLogMapping {
  /** Event type to log source mapping */
  eventTypeMapping: Record<string, LogSource>;
  
  /** Alert severity to log level mapping */
  severityMapping: Record<number, LogLevel>;
  
  /** Field mappings */
  fieldMappings: Record<string, string>;
}

/**
 * MISP activity log mapping
 */
export interface MispLogMapping {
  /** Activity type to audit action mapping */
  actionMapping: Record<string, AuditAction>;
  
  /** Field mappings */
  fieldMappings: Record<string, string>;
}

/**
 * TheHive case log mapping
 */
export interface TheHiveLogMapping {
  /** Case action to audit action mapping */
  actionMapping: Record<string, AuditAction>;
  
  /** Field mappings */
  fieldMappings: Record<string, string>;
}
