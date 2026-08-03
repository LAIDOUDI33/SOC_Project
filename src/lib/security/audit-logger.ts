/**
 * Djezzy National SOC Platform - Security Event Audit Logger
 * 
 * Comprehensive audit logging for security events with ANRT compliance:
 * - 5-year minimum log retention
 * - Immutable/tamper-proof logs (WORM storage)
 * - AES-256 encryption at rest
 * - TLS 1.3 in transit
 * - Data localization (within Algeria)
 * 
 * Event Categories:
 * - Authentication events
 * - Authorization events
 * - Data access events
 * - Administrative actions
 * - Security policy violations
 * - System events
 * 
 * @module security/audit-logger
 * @version 1.0.0
 */

import { createHash, randomUUID, createHmac } from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_DISABLED'
  | 'AUTH_MFA_VERIFY_SUCCESS'
  | 'AUTH_MFA_VERIFY_FAILURE'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_PASSWORD_RESET_REQUEST'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_ACCOUNT_UNLOCKED'
  | 'AUTHZ_GRANT'
  | 'AUTHZ_DENY'
  | 'AUTHZ_PRIVILEGE_ESCALATION'
  | 'AUTHZ_ROLE_CHANGE'
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'DATA_MASKING_APPLIED'
  | 'DATA_QUERY'
  | 'ADMIN_USER_CREATE'
  | 'ADMIN_USER_UPDATE'
  | 'ADMIN_USER_DELETE'
  | 'ADMIN_ROLE_ASSIGN'
  | 'ADMIN_ROLE_REVOKE'
  | 'ADMIN_CONFIG_CHANGE'
  | 'ADMIN_SYSTEM_STARTUP'
  | 'ADMIN_SYSTEM_SHUTDOWN'
  | 'SECURITY_POLICY_VIOLATION'
  | 'SECURITY_RATE_LIMIT_EXCEEDED'
  | 'SECURITY_WAF_BLOCK'
  | 'SECURITY_INTRUSION_ATTEMPT'
  | 'SECURITY_VULNERABILITY_SCAN'
  | 'SYSTEM_ERROR'
  | 'SYSTEM_WARNING'
  | 'SYSTEM_API_CALL'
  | 'COMPLIANCE_DATA_LOCALIZATION_CHECK'
  | 'COMPLIANCE_ENCRYPTION_VERIFICATION';

export type AuditEventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface AuditEvent {
  /** Unique event identifier */
  eventId: string;
  /** Timestamp in ISO 8601 format (UTC+1 Algeria timezone) */
  timestamp: string;
  /** Event type classification */
  eventType: AuditEventType;
  /** Event severity level */
  severity: AuditEventSeverity;
  /** Category grouping */
  category: AuditCategory;
  /** User who triggered the event (if applicable) */
  userId?: string;
  /** Username (for human readability) */
  username?: string;
  /** User's role at time of event */
  userRole?: string;
  /** Source IP address (may be masked for privacy) */
  sourceIp: string;
  /** User agent string */
  userAgent?: string;
  /** Resource/action being accessed */
  resource: string;
  /** HTTP method if applicable */
  httpMethod?: string;
  /** Request URL/path */
  requestPath?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Action performed */
  action: string;
  /** Outcome of action */
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'BLOCKED';
  /** Detailed description of event */
  message: string;
  /** Additional context data (structured) */
  metadata?: Record<string, unknown>;
  /** Data classification of affected resources */
  dataClassification: DataClassification;
  /** Session ID for correlation */
  sessionId?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Risk score (0-100) for prioritization */
  riskScore: number;
  /** Whether event requires immediate review */
  requiresReview: boolean;
  /** Retention period in days (per ANRT: 1825 days = 5 years) */
  retentionDays: number;
  /** Hash chain link for integrity verification */
  integrityHash?: string;
  /** Previous event hash for chain */
  previousEventHash?: string;
}

export type AuditCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATA_ACCESS'
  | 'ADMINISTRATION'
  | 'SECURITY'
  | 'SYSTEM'
  | 'COMPLIANCE';

export interface AuditLoggerConfig {
  /** Application identifier */
  applicationId: string;
  /** Environment name */
  environment: 'production' | 'staging' | 'development';
  /** Minimum severity level to log */
  minSeverity: AuditEventSeverity;
  /** Enable console logging */
  enableConsoleLog: boolean;
  /** Enable file/database persistence */
  enablePersistence: boolean;
  /** Storage backend configuration */
  storage: {
    type: 'console' | 'file' | 'database' | 'siem';
    connectionString?: string;
    tableName?: string;
    indexName?: string;
  };
  /** Retention policies per classification */
  retentionPolicies: {
    public: number;       // days
    internal: number;     // days
    confidential: number; // days
    restricted: number;   // days (minimum 1825 per ANRT)
  };
  /** PII masking configuration */
  piiMasking: {
    enabled: boolean;
    maskIMSIMSISDN: boolean;
    maskEmail: boolean;
    maskIP: boolean;
  };
  /** HMAC key for integrity verification */
  integrityKey: string;
  /** SIEM forwarding configuration */
  siemForwarding?: {
    enabled: boolean;
    endpoint: string;
    batchSize: number;
    flushIntervalMs: number;
  };
}

// ============================================================================
// Severity Mappings
// ============================================================================

/** Map event types to default severity levels */
const EVENT_SEVERITY_MAP: Record<AuditEventType, AuditEventSeverity> = {
  // Authentication events
  AUTH_SUCCESS: 'INFO',
  AUTH_FAILURE: 'MEDIUM',
  AUTH_LOGOUT: 'INFO',
  AUTH_SESSION_EXPIRED: 'LOW',
  AUTH_MFA_ENABLED: 'INFO',
  AUTH_MFA_DISABLED: 'HIGH',
  AUTH_MFA_VERIFY_SUCCESS: 'INFO',
  AUTH_MFA_VERIFY_FAILURE: 'MEDIUM',
  AUTH_PASSWORD_CHANGE: 'INFO',
  AUTH_PASSWORD_RESET_REQUEST: 'MEDIUM',
  AUTH_TOKEN_REFRESH: 'LOW',
  AUTH_ACCOUNT_LOCKED: 'HIGH',
  AUTH_ACCOUNT_UNLOCKED: 'HIGH',
  // Authorization events
  AUTHZ_GRANT: 'LOW',
  AUTHZ_DENY: 'MEDIUM',
  AUTHZ_PRIVILEGE_ESCALATION: 'HIGH',
  AUTHZ_ROLE_CHANGE: 'HIGH',
  // Data access events
  DATA_ACCESS: 'LOW',
  DATA_EXPORT: 'MEDIUM',
  DATA_MASKING_APPLIED: 'INFO',
  DATA_QUERY: 'LOW',
  // Administration events
  ADMIN_USER_CREATE: 'HIGH',
  ADMIN_USER_UPDATE: 'HIGH',
  ADMIN_USER_DELETE: 'CRITICAL',
  ADMIN_ROLE_ASSIGN: 'HIGH',
  ADMIN_ROLE_REVOKE: 'HIGH',
  ADMIN_CONFIG_CHANGE: 'HIGH',
  ADMIN_SYSTEM_STARTUP: 'INFO',
  ADMIN_SYSTEM_SHUTDOWN: 'HIGH',
  // Security events
  SECURITY_POLICY_VIOLATION: 'HIGH',
  SECURITY_RATE_LIMIT_EXCEEDED: 'MEDIUM',
  SECURITY_WAF_BLOCK: 'HIGH',
  SECURITY_INTRUSION_ATTEMPT: 'CRITICAL',
  SECURITY_VULNERABILITY_SCAN: 'MEDIUM',
  // System events
  SYSTEM_ERROR: 'HIGH',
  SYSTEM_WARNING: 'MEDIUM',
  SYSTEM_API_CALL: 'LOW',
  // Compliance events
  COMPLIANCE_DATA_LOCALIZATION_CHECK: 'INFO',
  COMPLIANCE_ENCRYPTION_VERIFICATION: 'INFO',
};

/** Map event types to categories */
const EVENT_CATEGORY_MAP: Record<AuditEventType, AuditCategory> = {
  AUTH_SUCCESS: 'AUTHENTICATION',
  AUTH_FAILURE: 'AUTHENTICATION',
  AUTH_LOGOUT: 'AUTHENTICATION',
  AUTH_SESSION_EXPIRED: 'AUTHENTICATION',
  AUTH_MFA_ENABLED: 'AUTHENTICATION',
  AUTH_MFA_DISABLED: 'AUTHENTICATION',
  AUTH_MFA_VERIFY_SUCCESS: 'AUTHENTICATION',
  AUTH_MFA_VERIFY_FAILURE: 'AUTHENTICATION',
  AUTH_PASSWORD_CHANGE: 'AUTHENTICATION',
  AUTH_PASSWORD_RESET_REQUEST: 'AUTHENTICATION',
  AUTH_TOKEN_REFRESH: 'AUTHENTICATION',
  AUTH_ACCOUNT_LOCKED: 'AUTHENTICATION',
  AUTH_ACCOUNT_UNLOCKED: 'AUTHENTICATION',
  AUTHZ_GRANT: 'AUTHORIZATION',
  AUTHZ_DENY: 'AUTHORIZATION',
  AUTHZ_PRIVILEGE_ESCALATION: 'AUTHORIZATION',
  AUTHZ_ROLE_CHANGE: 'AUTHORIZATION',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_EXPORT: 'DATA_ACCESS',
  DATA_MASKING_APPLIED: 'DATA_ACCESS',
  DATA_QUERY: 'DATA_ACCESS',
  ADMIN_USER_CREATE: 'ADMINISTRATION',
  ADMIN_USER_UPDATE: 'ADMINISTRATION',
  ADMIN_USER_DELETE: 'ADMINISTRATION',
  ADMIN_ROLE_ASSIGN: 'ADMINISTRATION',
  ADMIN_ROLE_REVOKE: 'ADMINISTRATION',
  ADMIN_CONFIG_CHANGE: 'ADMINISTRATION',
  ADMIN_SYSTEM_STARTUP: 'ADMINISTRATION',
  ADMIN_SYSTEM_SHUTDOWN: 'ADMINISTRATION',
  SECURITY_POLICY_VIOLATION: 'SECURITY',
  SECURITY_RATE_LIMIT_EXCEEDED: 'SECURITY',
  SECURITY_WAF_BLOCK: 'SECURITY',
  SECURITY_INTRUSION_ATTEMPT: 'SECURITY',
  SECURITY_VULNERABILITY_SCAN: 'SECURITY',
  SYSTEM_ERROR: 'SYSTEM',
  SYSTEM_WARNING: 'SYSTEM',
  SYSTEM_API_CALL: 'SYSTEM',
  COMPLIANCE_DATA_LOCALIZATION_CHECK: 'COMPLIANCE',
  COMPLIANCE_ENCRYPTION_VERIFICATION: 'COMPLIANCE',
};

/** Base risk scores for event types */
const EVENT_RISK_SCORE_MAP: Record<AuditEventType, number> = {
  AUTH_SUCCESS: 0,
  AUTH_FAILURE: 25,
  AUTH_LOGOUT: 0,
  AUTH_SESSION_EXPIRED: 5,
  AUTH_MFA_ENABLED: 0,
  AUTH_MFA_DISABLED: 40,
  AUTH_MFA_VERIFY_SUCCESS: 0,
  AUTH_MFA_VERIFY_FAILURE: 30,
  AUTH_PASSWORD_CHANGE: 5,
  AUTH_PASSWORD_RESET_REQUEST: 35,
  AUTH_TOKEN_REFRESH: 5,
  AUTH_ACCOUNT_LOCKED: 50,
  AUTH_ACCOUNT_UNLOCKED: 45,
  AUTHZ_GRANT: 5,
  AUTHZ_DENY: 30,
  AUTHZ_PRIVILEGE_ESCALATION: 75,
  AUTHZ_ROLE_CHANGE: 40,
  DATA_ACCESS: 10,
  DATA_EXPORT: 35,
  DATA_MASKING_APPLIED: 5,
  DATA_QUERY: 10,
  ADMIN_USER_CREATE: 40,
  ADMIN_USER_UPDATE: 35,
  ADMIN_USER_DELETE: 65,
  ADMIN_ROLE_ASSIGN: 55,
  ADMIN_ROLE_REVOKE: 55,
  ADMIN_CONFIG_CHANGE: 50,
  ADMIN_SYSTEM_STARTUP: 10,
  ADMIN_SYSTEM_SHUTDOWN: 45,
  SECURITY_POLICY_VIOLATION: 70,
  SECURITY_RATE_LIMIT_EXCEEDED: 40,
  SECURITY_WAF_BLOCK: 55,
  SECURITY_INTRUSION_ATTEMPT: 95,
  SECURITY_VULNERABILITY_SCAN: 30,
  SYSTEM_ERROR: 45,
  SYSTEM_WARNING: 25,
  SYSTEM_API_CALL: 5,
  COMPLIANCE_DATA_LOCALIZATION_CHECK: 5,
  COMPLIANCE_ENCRYPTION_VERIFICATION: 5,
};

// ============================================================================
// Default Configuration
// ============================================================================

/** Default audit logger configuration */
export const DEFAULT_AUDIT_CONFIG: AuditLoggerConfig = {
  applicationId: 'djezzy-soc-platform',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  minSeverity: 'LOW',
  enableConsoleLog: true,
  enablePersistence: true,
  storage: {
    type: process.env.AUDIT_STORAGE_TYPE as AuditLoggerConfig['storage']['type'] || 'console',
    connectionString: process.env.AUDIT_STORAGE_CONNECTION,
    tableName: 'audit_events',
    indexName: 'audit-events-index',
  },
  retentionPolicies: {
    public: 365,         // 1 year
    internal: 1095,      // 3 years
    confidential: 1825,  // 5 years (ANRT minimum)
    restricted: 2555,    // 7 years (extra caution for RESTRICTED)
  },
  piiMasking: {
    enabled: true,
    maskIMSIMSISDN: true,
    maskEmail: true,
    maskIP: true,
  },
  integrityKey: process.env.AUDIT_INTEGRITY_KEY || 'default-change-in-production',
  siemForwarding: {
    enabled: process.env.SIEM_FORWARDING_ENABLED === 'true',
    endpoint: process.env.SIEM_AUDIT_ENDPOINT || 'https://siem-backend.djezzy-soc.svc.cluster.local/api/audit',
    batchSize: 100,
    flushIntervalMs: 5000,
  },
};

// ============================================================================
// AuditLogger Class
// ============================================================================

/**
 * Security Event Audit Logger
 * 
 * Provides comprehensive audit logging with:
 * - Structured event capture
 * - Integrity verification via hash chains
 * - PII masking for privacy
 * - Multiple output backends
 * - SIEM forwarding
 * 
 * @example
 * ```typescript
 * const auditLogger = new AuditLogger(DEFAULT_AUDIT_CONFIG);
 * 
 * // Log authentication failure
 * await auditLogger.log({
 *   eventType: 'AUTH_FAILURE',
 *   sourceIp: clientIp,
 *   resource: '/api/auth/login',
 *   action: 'LOGIN_ATTEMPT',
 *   outcome: 'FAILURE',
 *   message: 'Invalid credentials for user john.doe',
 *   userId: 'user-123',
 *   username: 'john.doe',
 *   metadata: { reason: 'invalid_password' },
 * });
 * ```
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private previousEventHash: string = '';
  private eventBuffer: AuditEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
    
    // Start auto-flush timer if SIEM forwarding enabled
    if (this.config.siemForwarding?.enabled) {
      this.flushTimer = setInterval(
        () => this.flush(),
        this.config.siemForwarding.flushIntervalMs
      );
    }
  }

  /**
   * Main logging method - creates and persists an audit event
   */
  async log(eventInput: Omit<AuditEvent, keyof AuditEventBase>): Promise<AuditEvent> {
    const event = await this.createEvent(eventInput);
    
    // Write to configured outputs
    await this.writeEvent(event);
    
    // Buffer for batch forwarding
    if (this.config.siemForwarding?.enabled) {
      this.eventBuffer.push(event);
      if (this.eventBuffer.length >= this.config.siemForwarding.batchSize) {
        await this.flush();
      }
    }
    
    return event;
  }

  /**
   * Convenience methods for common event types
   */

  /** Log successful authentication */
  async logAuthSuccess(params: {
    userId: string;
    username: string;
    userRole: string;
    sourceIp: string;
    userAgent?: string;
    sessionId: string;
    authMethod: 'password' | 'sso' | 'mfa' | 'token';
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: 'AUTH_SUCCESS',
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      sessionId: params.sessionId,
      resource: '/api/auth/login',
      action: `AUTH_${params.authMethod.toUpperCase()}`,
      outcome: 'SUCCESS',
      message: `Successful authentication for user ${params.username} via ${params.authMethod}`,
      metadata: { ...params.metadata, authMethod: params.authMethod },
      dataClassification: 'CONFIDENTIAL',
      requiresReview: false,
    });
  }

  /** Log failed authentication attempt */
  async logAuthFailure(params: {
    userId?: string;
    username?: string;
    sourceIp: string;
    userAgent?: string;
    resource: string;
    reason: 'invalid_credentials' | 'account_locked' | 'mfa_failed' | 'session_expired' | 'other';
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: 'AUTH_FAILURE',
      userId: params.userId,
      username: params.username,
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      resource: params.resource,
      action: 'LOGIN_ATTEMPT',
      outcome: 'FAILURE',
      message: `Failed authentication${params.username ? ` for user ${params.username}` : ''}: ${params.reason}`,
      metadata: { ...params.metadata, failureReason: params.reason },
      dataClassification: 'CONFIDENTIAL',
      requiresReview: params.reason === 'account_locked',
    });
  }

  /** Log authorization denial */
  async logAuthzDeny(params: {
    userId: string;
    username: string;
    userRole: string;
    sourceIp: string;
    resource: string;
    action: string;
    reason: string;
    httpMethod?: string;
    requestPath?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: 'AUTHZ_DENY',
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      sourceIp: params.sourceIp,
      resource: params.resource,
      httpMethod: params.httpMethod,
      requestPath: params.requestPath,
      action: params.action,
      outcome: 'BLOCKED',
      message: `Authorization denied for ${params.username} (${params.userRole}): ${params.reason}`,
      metadata: { ...params.metadata, denyReason: params.reason },
      dataClassification: 'INTERNAL',
      requiresReview: true,
    });
  }

  /** Log data access event */
  async logDataAccess(params: {
    userId: string;
    username: string;
    userRole: string;
    sourceIp: string;
    resource: string;
    action: 'READ' | 'EXPORT' | 'QUERY' | 'DOWNLOAD';
    dataType: string;
    recordCount?: number;
    dataClassification: DataClassification;
    maskingApplied?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const eventType = params.action === 'EXPORT' ? 'DATA_EXPORT' :
                      params.action === 'QUERY' ? 'DATA_QUERY' : 'DATA_ACCESS';
    
    return this.log({
      eventType,
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      sourceIp: params.sourceIp,
      resource: params.resource,
      action: `DATA_${params.action}`,
      outcome: 'SUCCESS',
      message: `Data ${params.action.toLowerCase()} on ${params.dataType}${params.recordCount ? ` (${params.recordCount} records)` : ''} by ${params.username}`,
      metadata: {
        ...params.metadata,
        dataType: params.dataType,
        recordCount: params.recordCount,
        maskingApplied: params.maskingApplied,
      },
      dataClassification: params.dataClassification,
      requiresReview: params.dataClassification === 'RESTRICTED',
    });
  }

  /** Log administrative action */
  async logAdminAction(params: {
    userId: string;
    username: string;
    userRole: string;
    sourceIp: string;
    action: string;
    targetResource: string;
    targetType: 'user' | 'role' | 'config' | 'system';
    outcome: 'SUCCESS' | 'FAILURE';
    details: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const eventTypeMap: Record<string, AuditEventType> = {
      user: params.outcome === 'SUCCESS' ? 'ADMIN_USER_CREATE' : 'ADMIN_USER_UPDATE',
      role: 'ADMIN_ROLE_ASSIGN',
      config: 'ADMIN_CONFIG_CHANGE',
      system: params.action.toUpperCase().includes('SHUTDOWN') ? 'ADMIN_SYSTEM_SHUTDOWN' : 'ADMIN_SYSTEM_STARTUP',
    };

    return this.log({
      eventType: eventTypeMap[params.targetType] || 'ADMIN_CONFIG_CHANGE',
      userId: params.userId,
      username: params.username,
      userRole: params.userRole,
      sourceIp: params.sourceIp,
      resource: params.targetResource,
      action: params.action,
      outcome: params.outcome,
      message: `Admin action: ${params.details}`,
      metadata: { ...params.metadata, targetType: params.targetType },
      dataClassification: 'CONFIDENTIAL',
      requiresReview: params.targetType === 'user' && params.action.includes('DELETE'),
    });
  }

  /** Log security incident/violation */
  async logSecurityEvent(params: {
    eventType: 'SECURITY_POLICY_VIOLATION' | 'SECURITY_RATE_LIMIT_EXCEEDED' | 'SECURITY_WAF_BLOCK' | 'SECURITY_INTRUSION_ATTEMPT';
    sourceIp: string;
    resource: string;
    severity?: AuditEventSeverity;
    details: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: params.eventType,
      sourceIp: params.sourceIp,
      resource: params.resource,
      action: 'SECURITY_EVENT',
      outcome: 'BLOCKED',
      message: `Security event: ${params.details}`,
      metadata: params.metadata,
      dataClassification: 'INTERNAL',
      requiresReview: true,
      severity: params.severity || EVENT_SEVERITY_MAP[params.eventType],
    });
  }

  /**
   * Flush buffered events to SIEM
   */
  async flush(): Promise<void> {
    if (!this.config.siemForwarding?.enabled || this.eventBuffer.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const response = await fetch(this.config.siemForwarding.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Audit-Source': this.config.applicationId,
          'X-Event-Count': eventsToSend.length.toString(),
        },
        body: JSON.stringify({
          source: this.config.applicationId,
          environment: this.config.environment,
          timestamp: new Date().toISOString(),
          eventCount: eventsToSend.length,
          events: eventsToSend.map(this.sanitizeForSIEM),
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send audit events to SIEM: ${response.status}`);
        // Re-add failed events to buffer
        this.eventBuffer.unshift(...eventsToSend);
      }
    } catch (error) {
      console.error('Error flushing audit events to SIEM:', error);
      this.eventBuffer.unshift(...eventsToSend);
    }
  }

  /**
   * Shutdown logger gracefully
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create a complete audit event from input
   */
  private async createEvent(eventInput: Omit<AuditEvent, keyof AuditEventBase>): Promise<AuditEvent> {
    const now = new Date();
    const eventType = eventInput.eventType;
    
    // Determine retention period based on data classification
    const classification = eventInput.dataClassification || 'INTERNAL';
    const retentionDays = this.config.retentionPolicies[classification];

    // Calculate integrity hash
    const eventData = {
      timestamp: now.toISOString(),
      eventType,
      ...eventInput,
    };
    
    const integrityHash = this.calculateIntegrityHash(eventData);

    const event: AuditEvent = {
      eventId: randomUUID(),
      timestamp: this.formatTimestamp(now),
      eventType,
      severity: eventInput.severity || EVENT_SEVERITY_MAP[eventType],
      category: EVENT_CATEGORY_MAP[eventType],
      sourceIp: this.maskPII('ip', eventInput.sourceIp),
      riskScore: EVENT_RISK_SCORE_MAP[eventType],
      retentionDays,
      requiresReview: eventInput.requiresReview ?? (EVENT_RISK_SCORE_MAP[eventType] >= 50),
      integrityHash,
      previousEventHash: this.previousEventHash || undefined,
      ...eventInput,
    };

    // Update hash chain
    this.previousEventHash = integrityHash;

    return event;
  }

  /**
   * Write event to configured outputs
   */
  private async writeEvent(event: AuditEvent): Promise<void> {
    // Console output
    if (this.config.enableConsoleLog) {
      this.writeToConsole(event);
    }

    // Persistence (file/database)
    if (this.config.enablePersistence) {
      switch (this.config.storage.type) {
        case 'file':
          await this.writeToFile(event);
          break;
        case 'database':
          await this.writeToDatabase(event);
          break;
        case 'siem':
          // Handled by flush mechanism
          break;
      }
    }
  }

  /**
   * Write to console (structured JSON)
   */
  private writeToConsole(event: AuditEvent): void {
    const logFn = this.getLogFunction(event.severity);
    logFn(JSON.stringify({
      '@timestamp': event.timestamp,
      '@level': event.severity.toLowerCase(),
      application: this.config.applicationId,
      environment: this.config.environment,
      ...event,
    }));
  }

  /**
   * Get appropriate console.log function for severity
   */
  private getLogFunction(severity: AuditEventSeverity): (...args: unknown[]) => void {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return console.error;
      case 'MEDIUM':
        return console.warn;
      default:
        return console.info;
    }
  }

  /**
   * Write event to file (placeholder for implementation)
   */
  private async writeToFile(_event: AuditEvent): Promise<void> {
    // Implementation depends on file system access
    // Would typically write to append-only log file
    // File should be on WORM storage for compliance
  }

  /**
   * Write event to database (placeholder for implementation)
   */
  private async writeToDatabase(_event: AuditEvent): Promise<void> {
    // Implementation depends on database driver
    // Would insert into audit_events table
    // Table should have immutability constraints
  }

  /**
   * Calculate HMAC-SHA256 integrity hash for event
   */
  private calculateIntegrityHash(eventData: Record<string, unknown>): string {
    const eventString = JSON.stringify({
      ...eventData,
      previousHash: this.previousEventHash,
    });
    
    return createHmac('sha256', this.config.integrityKey)
      .update(eventString)
      .digest('hex');
  }

  /**
   * Mask PII in event data
   */
  private maskPII(type: 'ip' | 'email' | 'imsi' | 'msisdn', value: string): string {
    if (!this.config.piiMasking.enabled) {
      return value;
    }

    switch (type) {
      case 'ip':
        if (this.config.piiMasking.maskIP) {
          // Mask last octet
          return value.replace(/\.\d+$/, '.***');
        }
        return value;
      case 'email':
        if (this.config.piiMasking.maskEmail) {
          // Mask local part
          const [local, domain] = value.split('@');
          if (local && domain) {
            return `${local[0]}***@${domain}`;
          }
        }
        return value;
      case 'imsi':
      case 'msisdn':
        if (this.config.piiMasking.maskIMSIMSISDN) {
          return `***${value.slice(-4)}`;
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Format timestamp for Algeria timezone (UTC+1)
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString(); // UTC, can be converted to local for display
  }

  /**
   * Sanitize event for SIEM forwarding
   */
  private sanitizeForSIEM(event: AuditEvent): Record<string, unknown> {
    return {
      event_id: event.eventId,
      timestamp: event.timestamp,
      event_type: event.eventType,
      severity: event.severity,
      category: event.category,
      user_id: event.userId,
      username: event.username,
      user_role: event.userRole,
      source_ip: event.sourceIp,
      resource: event.resource,
      action: event.action,
      outcome: event.outcome,
      message: event.message,
      risk_score: event.riskScore,
      metadata: event.metadata,
      correlation_id: event.correlationId,
    };
  }
}

// ============================================================================
// Base Event Fields Interface
// ============================================================================

interface AuditEventBase {
  eventId: string;
  timestamp: string;
  severity: AuditEventSeverity;
  category: AuditCategory;
  riskScore: number;
  retentionDays: number;
  requiresReview: boolean;
  integrityHash: string;
  previousEventHash?: string;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAuditLogger: AuditLogger | null = null;

/**
 * Get or create the default audit logger instance
 */
export function getAuditLogger(config?: Partial<AuditLoggerConfig>): AuditLogger {
  if (!defaultAuditLogger) {
    defaultAuditLogger = new AuditLogger(config);
  }
  return defaultAuditLogger;
}

/**
 * Quick log function using default logger
 */
export async function auditLog(
  eventInput: Omit<AuditEvent, keyof AuditEventBase>
): Promise<AuditEvent> {
  const logger = getAuditLogger();
  return logger.log(eventInput);
}

// ============================================================================
// Middleware Helpers
// ============================================================================

/**
 * Create audit logging middleware data extractor
 */
export function extractAuditContextFromRequest(request: Request): {
  sourceIp: string;
  userAgent?: string;
  requestPath: string;
  httpMethod: string;
  correlationId: string;
} {
  return {
    sourceIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              request.headers.get('x-real-ip') ||
              'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    requestPath: new URL(request.url).pathname,
    httpMethod: request.method,
    correlationId: request.headers.get('x-correlation-id') || randomUUID(),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default AuditLogger;
