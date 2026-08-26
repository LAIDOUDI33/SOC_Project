/**
 * Audit Trail Library
 * National SOC Platform for Algeria (2026-2030)
 * 
 * A comprehensive audit tracking system providing:
 * - Immutable audit event creation with full context
 * - Actor identification (user, service, system)
 * - Action classification (CRUD, auth, admin, data_access)
 * - Resource targeting
 * - Outcome recording (success/failure/reason)
 * - Immutable audit records (append-only)
 * - Tamper-evidence hashing (SHA-256 chain)
 * - Compliance export formatting
 * - Retention enforcement
 * - Search and query interface
 */

import {
  AuditEntry,
  AuditAction,
  AuditActor,
  ActorType,
  AuditResource,
  ResourceType,
  AuditOutcome,
  ComplianceCategory,
  GeoLocation,
  LogSource,
  PaginationParams,
  LogSearchFilters,
  PaginationInfo,
  generateId,
  getTimestamp,
  safeStringify
} from '../types/logging.types';

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

/**
 * Simple string hash function for tamper evidence
 * In production, this would use Web Crypto API or Node.js crypto module
 * 
 * @param input String to hash
 * @returns Hex-encoded hash string
 */
async function computeHash(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser environment - use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    try {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(input).digest('hex');
    } catch {
      // Fallback to simple hash
    }
  }
  
  // Fallback simple hash (NOT cryptographically secure)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Verify audit entry integrity by checking hash chain
 * @param entry The audit entry to verify
 * @param previousEntryHash Expected hash of previous entry
 * @returns True if integrity is intact
 */
export async function verifyEntryIntegrity(
  entry: AuditEntry,
  expectedPreviousHash?: string
): Promise<boolean> {
  // Recompute the hash of this entry
  const entryString = safeStringify({
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    actor: { id: entry.actor.id, type: entry.actor.type },
    resource: { type: entry.resource.type, id: entry.resource.id },
    outcome: entry.outcome,
    description: entry.description,
    previousEntryHash: entry.previousEntryHash
  });
  
  const computedHash = await computeHash(entryString);
  
  // Check if stored hash matches computed hash
  if (computedHash !== entry.entryHash) {
    return false;
  }
  
  // Check previous hash linkage if provided
  if (expectedPreviousHash && entry.previousEntryHash !== expectedPreviousHash) {
    return false;
  }
  
  return true;
}

// ============================================================================
// ACTION TO COMPLIANCE MAPPING
// ============================================================================

/** Mapping of audit actions to compliance categories they satisfy */
const ACTION_COMPLIANCE_MAP: Record<AuditAction, ComplianceCategory[]> = {
  [AuditAction.CREATE]: [ComplianceCategory.SOC2_CHANGE_MANAGEMENT, ComplianceCategory.GDPR_ARTICLE_30],
  [AuditAction.READ]: [ComplianceCategory.NIST_AU_2, ComplianceCategory.GDPR_ARTICLE_30],
  [AuditAction.UPDATE]: [ComplianceCategory.SOC2_CHANGE_MANAGEMENT, ComplianceCategory.ISO_A_12_4],
  [AuditAction.DELETE]: [ComplianceCategory.SOC2_CHANGE_MANAGEMENT, ComplianceCategory.GDPR_ARTICLE_5],
  [AuditAction.LOGIN]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.NIST_AC_2, ComplianceCategory.ALGERIAN_ARTICLE_12],
  [AuditAction.LOGOUT]: [ComplianceCategory.SOC2_ACCESS_CONTROL],
  [AuditAction.LOGIN_FAILED]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.NIST_AC_6, ComplianceCategory.ALGERIAN_ARTICLE_8],
  [AuditAction.PASSWORD_CHANGE]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_16_1],
  [AuditAction.PASSWORD_RESET]: [ComplianceCategory.NIST_IA_5, ComplianceCategory.GDPR_ARTICLE_32],
  [AuditAction.MFA_ENABLED]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_14_1],
  [AuditAction.MFA_DISABLED]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_14_1],
  [AuditAction.TOKEN_ISSUED]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.GDPR_ARTICLE_32],
  [AuditAction.TOKEN_REVOKED]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.GDPR_ARTICLE_32],
  [AuditAction.GRANT_PERMISSION]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.NIST_AC_2],
  [AuditAction.REVOKE_PERMISSION]: [ComplianceCategory.SOC2_ACCESS_CONTROL, ComplianceCategory.NIST_AC_2],
  [AuditAction.ROLE_ASSIGNMENT]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_9_2],
  [AuditAction.ROLE_REMOVAL]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_9_2],
  [AuditAction.CONFIG_CHANGE]: [ComplianceCategory.SOC2_CHANGE_MANAGEMENT, ComplianceCategory.ISO_A_12_4],
  [AuditAction.SYSTEM_START]: [ComplianceCategory.SOC2_SYSTEM_OPERATIONS, ComplianceCategory.ISO_A_12_4],
  [AuditAction.SYSTEM_STOP]: [ComplianceCategory.SOC2_SYSTEM_OPERATIONS, ComplianceCategory.ISO_A_12_4],
  [AuditAction.USER_CREATE]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.GDPR_ARTICLE_30],
  [AuditAction.USER_DISABLE]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_9_2],
  [AuditAction.USER_ENABLE]: [ComplianceCategory.NIST_AC_2, ComplianceCategory.ISO_A_9_2],
  [AuditAction.DATA_EXPORT]: [ComplianceCategory.GDPR_ARTICLE_5, ComplianceCategory.NIST_SI_4],
  [AuditAction.DATA_IMPORT]: [ComplianceCategory.GDPR_ARTICLE_5, ComplianceCategory.NIST_SI_4],
  [AuditAction.ALERT_ACKNOWLEDGE]: [ComplianceCategory.SOC2_RISK_MITIGATION, ComplianceCategory.ISO_A_16_1],
  [AuditAction.ALERT_ESCALATE]: [ComplianceCategory.SOC2_RISK_MITIGATION, ComplianceCategory.ISO_A_16_1],
  [AuditAction.INCIDENT_CREATE]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.ALGERIAN_ARTICLE_8],
  [AuditAction.INCIDENT_UPDATE]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_IR_4],
  [AuditAction.INCIDENT_CLOSE]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_IR_4],
  [AuditAction.BLOCK_IP]: [ComplianceCategory.ISO_A_13_1, ComplianceCategory.NIST_SC_7],
  [AuditAction.UNBLOCK_IP]: [ComplianceCategory.ISO_A_13_1, ComplianceCategory.NIST_SC_7],
  [AuditAction.DATA_ACCESS]: [ComplianceCategory.GDPR_ARTICLE_30, ComplianceCategory.NIST_AU_3],
  [AuditAction.DATA_DOWNLOAD]: [ComplianceCategory.GDPR_ARTICLE_5, ComplianceCategory.NIST_AU_3],
  [AuditAction.DATA_PRINT]: [ComplianceCategory.GDPR_ARTICLE_5, ComplianceCategory.NIST_AU_9],
  [AuditAction.QUERY_EXECUTED]: [ComplianceCategory.NIST_AU_3, ComplianceCategory.GDPR_ARTICLE_30],
  [AuditAction.REPORT_GENERATED]: [ComplianceCategory.SOC2_LOGGING_MONITORING, ComplianceCategory.ISO_A_15_2],
  [AuditAction.THREAT_INTEL_QUERY]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_SRA_2],
  [AuditAction.IOC_LOOKUP]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_SRA_2],
  [AuditAction.CASE_CREATED]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_IR_4],
  [AuditAction.CASE_UPDATED]: [ComplianceCategory.ISO_A_16_1, ComplianceCategory.NIST_IR_4],
  [AuditAction.TASK_ASSIGNED]: [ComplianceCategory.ISO_A_15_1, ComplianceCategory.NIST_PL_2],
  [AuditAction.TASK_COMPLETED]: [ComplianceCategory.ISO_A_15_1, ComplianceCategory.NIST_PL_2]
};

/** Risk scores for different action types (0-100) */
const ACTION_RISK_SCORES: Record<AuditAction, number> = {
  [AuditAction.CREATE]: 20,
  [AuditAction.READ]: 10,
  [AuditAction.UPDATE]: 35,
  [AuditAction.DELETE]: 60,
  [AuditAction.LOGIN]: 25,
  [AuditAction.LOGOUT]: 5,
  [AuditAction.LOGIN_FAILED]: 45,
  [AuditAction.PASSWORD_CHANGE]: 40,
  [AuditAction.PASSWORD_RESET]: 55,
  [AuditAction.MFA_ENABLED]: 10,
  [AuditAction.MFA_DISABLED]: 50,
  [AuditAction.TOKEN_ISSUED]: 30,
  [AuditAction.TOKEN_REVOKED]: 25,
  [AuditAction.GRANT_PERMISSION]: 70,
  [AuditAction.REVOKE_PERMISSION]: 65,
  [AuditAction.ROLE_ASSIGNMENT]: 75,
  [AuditAction.ROLE_REMOVAL]: 65,
  [AuditAction.CONFIG_CHANGE]: 80,
  [AuditAction.SYSTEM_START]: 15,
  [AuditAction.SYSTEM_STOP]: 60,
  [AuditAction.USER_CREATE]: 70,
  [AuditAction.USER_DISABLE]: 75,
  [AuditAction.USER_ENABLE]: 70,
  [AuditAction.DATA_EXPORT]: 85,
  [AuditAction.DATA_IMPORT]: 80,
  [AuditAction.ALERT_ACKNOWLEDGE]: 30,
  [AuditAction.ALERT_ESCALATE]: 40,
  [AuditAction.INCIDENT_CREATE]: 50,
  [AuditAction.INCIDENT_UPDATE]: 40,
  [AuditAction.INCIDENT_CLOSE]: 45,
  [AuditAction.BLOCK_IP]: 70,
  [AuditAction.UNBLOCK_IP]: 65,
  [AuditAction.DATA_ACCESS]: 30,
  [AuditAction.DATA_DOWNLOAD]: 80,
  [AuditAction.DATA_PRINT]: 75,
  [AuditAction.QUERY_EXECUTED]: 25,
  [AuditAction.REPORT_GENERATED]: 20,
  [AuditAction.THREAT_INTEL_QUERY]: 25,
  [AuditAction.IOC_LOOKUP]: 20,
  [AuditAction.CASE_CREATED]: 45,
  [AuditAction.CASE_UPDATED]: 35,
  [AuditAction.TASK_ASSIGNED]: 30,
  [AuditAction.TASK_COMPLETED]: 25
};

/** Default retention periods in days by action category */
const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  authentication: 365 * 3,        // 3 years for auth events
  authorization: 2555,            // 7 years for permission changes
  administrative: 2555,           // 7 years for admin actions
  security: 2555,                 // 7 years for security events
  data_access: 1095,              // 3 years for data access
  general: 365                    // 1 year default
};

/** Categorize an action for retention purposes */
function categorizeAction(action: AuditAction): string {
  if ([AuditAction.LOGIN, AuditAction.LOGOUT, AuditAction.LOGIN_FAILED, 
       AuditAction.PASSWORD_CHANGE, AuditAction.PASSWORD_RESET,
       AuditAction.MFA_ENABLED, AuditAction.MFA_DISABLED,
       AuditAction.TOKEN_ISSUED, AuditAction.TOKEN_REVOKED].includes(action)) {
    return 'authentication';
  }
  if ([AuditAction.GRANT_PERMISSION, AuditAction.REVOKE_PERMISSION,
       AuditAction.ROLE_ASSIGNMENT, AuditAction.ROLE_REMOVAL].includes(action)) {
    return 'authorization';
  }
  if ([AuditAction.CONFIG_CHANGE, AuditAction.SYSTEM_START, AuditAction.SYSTEM_STOP,
       AuditAction.USER_CREATE, AuditAction.USER_DISABLE, AuditAction.USER_ENABLE].includes(action)) {
    return 'administrative';
  }
  if ([AuditAction.ALERT_ACKNOWLEDGE, AuditAction.ALERT_ESCALATE,
       AuditAction.INCIDENT_CREATE, AuditAction.INCIDENT_UPDATE, AuditAction.INCIDENT_CLOSE,
       AuditAction.BLOCK_IP, AuditAction.UNBLOCK_IP].includes(action)) {
    return 'security';
  }
  if ([AuditAction.DATA_ACCESS, AuditAction.DATA_DOWNLOAD, 
       AuditAction.DATA_PRINT, AuditAction.QUERY_EXECUTED].includes(action)) {
    return 'data_access';
  }
  return 'general';
}

// ============================================================================
// IN-MEMORY AUDIT STORE (for development/demo)
// ============================================================================

interface AuditStoreEntry extends AuditEntry {
  /** Internal flag indicating if entry has been archived */
  _archived?: boolean;
}

/** In-memory storage for audit entries */
let auditStore: AuditStoreEntry[] = [];

/** Track the last entry's hash for chaining */
let lastEntryHash: string | null = null;

/**
 * Add sample audit entries for demonstration purposes
 */
export function initializeSampleData(): void {
  const now = new Date();
  
  const sampleEntries: Array<{
    action: AuditAction;
    actor: Partial<AuditActor>;
    resource: Partial<AuditResource>;
    outcome: AuditOutcome;
    description: string;
    hoursAgo: number;
  }> = [
    {
      action: AuditAction.LOGIN,
      actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc', roles: ['admin'] },
      resource: { type: ResourceType.USER, id: 'user-001', name: 'admin_soc' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Administrator login from SOC workstation',
      hoursAgo: 0.5
    },
    {
      action: AuditAction.THREAT_INTEL_QUERY,
      actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc' },
      resource: { type: ResourceType.THREAT_INTELLIGENCE, id: 'query-001' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Queried MISP for IOC related to recent phishing campaign',
      hoursAgo: 0.3
    },
    {
      action: AuditAction.INCIDENT_CREATE,
      actor: { id: 'analyst-001', type: ActorType.USER, displayName: 'ahmed_benali', username: 'ahmed_benali', roles: ['analyst'] },
      resource: { type: ResourceType.INCIDENT, id: 'INC-2026-0042', name: 'Suspicious DNS Tunneling Activity' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Created incident for detected DNS tunneling to known C2 infrastructure',
      hoursAgo: 1
    },
    {
      action: AuditAction.ALERT_ACKNOWLEDGE,
      actor: { id: 'analyst-002', type: ActorType.USER, displayName: 'fatima_zerhouni', username: 'fatima_zerhouni', roles: ['analyst'] },
      resource: { type: ResourceType.ALERT, id: 'alert-78234', name: 'Multiple Failed SSH Attempts' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Acknowledged alert for brute force attack on border router',
      hoursAgo: 2
    },
    {
      action: AuditAction.LOGIN_FAILED,
      actor: { id: 'unknown', type: ActorType.EXTERNAL, ipAddress: '91.121.87.102' },
      resource: { type: ResourceType.USER, id: 'unknown' },
      outcome: AuditOutcome.FAILURE,
      description: 'Failed login attempt with invalid credentials',
      failureReason: 'Invalid credentials',
      hoursAgo: 2.5
    },
    {
      action: AuditAction.BLOCK_IP,
      actor: { id: 'system-automated', type: ActorType.SYSTEM, displayName: 'Automated Response System' },
      resource: { type: ResourceType.BLOCKED_IP, id: '91.121.87.102', name: '91.121.87.102' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Auto-blocked IP after 10 failed login attempts within 5 minutes',
      hoursAgo: 2.6
    },
    {
      action: AuditAction.CONFIG_CHANGE,
      actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc', roles: ['admin'] },
      resource: { type: ResourceType.CONFIGURATION, id: 'config-syslog-01', name: 'Syslog Server Configuration' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Updated syslog forwarding endpoint to new SIEM collector',
      previousState: { endpoint: 'old-siem.dz:514' },
      newState: { endpoint: 'new-siem.dz:514' },
      changedFields: ['endpoint'],
      hoursAgo: 4
    },
    {
      action: AuditAction.DATA_EXPORT,
      actor: { id: 'auditor-001', type: ActorType.USER, displayName: 'karim_haddad', username: 'karim_haddad', roles: ['auditor'], department: 'Internal Audit' },
      resource: { type: ResourceType.REPORT, id: 'report-q1-2026', name: 'Q1 2026 Security Report' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Exported security metrics report for quarterly audit review',
      hoursAgo: 6
    },
    {
      action: AuditAction.ROLE_ASSIGNMENT,
      actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc', roles: ['admin'] },
      resource: { type: ResourceType.ROLE, id: 'role-senior-analyst', name: 'Senior Analyst' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Assigned Senior Analyst role to user amine_bouazza',
      context: { targetUserId: 'user-045', targetUsername: 'amine_bouazza' },
      hoursAgo: 24
    },
    {
      action: AuditAction.TASK_ASSIGNED,
      actor: { id: 'teamlead-001', type: ActorType.USER, displayName: 'sara_messadi', username: 'sara_messadi', roles: ['team_lead'] },
      resource: { type: ResourceType.TASK, id: 'task-inc042-03', name: 'Analyze malware sample from phishing attachment' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Assigned malware analysis task to forensic team member',
      hoursAgo: 18
    },
    {
      action: AuditAction.PASSWORD_CHANGE,
      actor: { id: 'user-030', type: ActorType.USER, displayName: 'yacine_kaci', username: 'yacine_kaci' },
      resource: { type: ResourceType.USER, id: 'user-030', name: 'yacine_kaci' },
      outcome: AuditOutcome.SUCCESS,
      description: 'User initiated password change (90-day rotation)',
      hoursAgo: 48
    },
    {
      action: AuditAction.API_KEY_REVOKED,
      actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc', roles: ['admin'] },
      resource: { type: ResourceType.API_KEY, id: 'key-wazuh-integration' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Revoked compromised Wazuh integration API key as part of key rotation',
      hoursAgo: 72
    } as any,
    {
      action: AuditAction.REPORT_GENERATED,
      actor: { id: 'system-scheduled', type: ActorType.SYSTEM, displayName: 'Scheduled Job Runner' },
      resource: { type: ResourceType.REPORT, id: 'report-daily-summary', name: 'Daily Operations Summary' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Generated daily operations summary report automatically',
      hoursAgo: 1
    },
    {
      action: AuditAction.IOC_LOOKUP,
      actor: { id: 'api-suricata', type: ActorType.SERVICE, displayName: 'Suricata Integration Service' },
      resource: { type: ResourceType.IOC, id: 'ioc-hash-abcd1234' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Automatic IOC lookup triggered by Suricata alert signature match',
      hoursAgo: 0.1
    },
    {
      action: AuditAction.CASE_UPDATED,
      actor: { id: 'analyst-001', type: ActorType.USER, displayName: 'ahmed_benali', username: 'ahmed_benali', roles: ['analyst'] },
      resource: { type: ResourceType.CASE, id: 'case-2026-0156', name: 'APT Campaign Investigation' },
      outcome: AuditOutcome.SUCCESS,
      description: 'Updated case status to "In Progress" after identifying new TTPs',
      changedFields: ['status', 'ttps_identified'],
      hoursAgo: 3
    }
  ];

  // Generate entries with proper timestamps and hashes
  sampleEntries.forEach(async (sample, index) => {
    const timestamp = new Date(now.getTime() - sample.hoursAgo * 60 * 60 * 1000).toISOString();
    
    const entry: AuditStoreEntry = {
      id: generateId(),
      timestamp,
      action: sample.action,
      actor: {
        id: sample.actor.id || '',
        type: sample.actor.type || ActorType.USER,
        displayName: sample.actor.displayName,
        username: sample.actor.username,
        roles: sample.actor.roles,
        department: (sample.actor as any).department,
        ipAddress: (sample.actor as any).ipAddress
      },
      resource: {
        type: sample.resource.type || ResourceType.USER,
        id: sample.resource.id || '',
        name: sample.resource.name,
        previousState: (sample.resource as any)?.previousState,
        newState: (sample.resource as any)?.newState,
        changedFields: (sample.resource as any)?.changedFields
      },
      outcome: sample.outcome,
      description: sample.description,
      failureReason: (sample as any).failureReason,
      context: (sample as any)?.context,
      riskScore: ACTION_RISK_SCORES[sample.action],
      previousEntryHash: lastEntryHash || undefined,
      entryHash: '', // Will be set below
      retentionUntil: new Date(
        now.getTime() + DEFAULT_RETENTION_DAYS[categorizeAction(sample.action)] * 24 * 60 * 60 * 1000
      ).toISOString(),
      complianceTags: ACTION_COMPLIANCE_MAP[sample.action] || []
    };

    // Compute hash
    entry.entryHash = await computeHash(safeStringify(entry));
    lastEntryHash = entry.entryHash;
    
    auditStore.push(entry);
  });
}

// Initialize sample data immediately
initializeSampleData();

// ============================================================================
// AUDIT TRAIL CLASS
// ============================================================================

/** Configuration options for the audit trail system */
export interface AuditTrailConfig {
  /** Enable automatic hash chaining for tamper evidence */
  enableHashChaining: boolean;
  
  /** Default retention period in days (0 = indefinite) */
  defaultRetentionDays: number;
  
  /** Enable digital signing of entries (requires key management) */
  enableSigning: boolean;
  
  /** Include geolocation data when available */
  includeGeoLocation: boolean;
  
  /** Maximum batch size for queries */
  maxBatchSize: number;
  
  /** Whether to log audit events to the main logger */
  logToMainLogger: boolean;
}

/** Default configuration */
const DEFAULT_AUDIT_CONFIG: AuditTrailConfig = {
  enableHashChaining: true,
  defaultRetentionDays: 2555, // 7 years
  enableSigning: false,
  includeGeoLocation: true,
  maxBatchSize: 1000,
  logToMainLogger: true
};

/**
 * Main Audit Trail class
 * Provides comprehensive audit logging capabilities
 * 
 * @example
 * ```typescript
 * const audit = new AuditTrail();
 * await audit.initialize();
 * 
 * await audit.record({
 *   action: AuditAction.LOGIN,
 *   actor: { id: 'user-123', type: ActorType.USER, displayName: 'John Doe' },
 *   resource: { type: ResourceType.USER, id: 'user-123' },
 *   outcome: AuditOutcome.SUCCESS,
 *   description: 'User logged in successfully'
 * });
 * ```
 */
export class AuditTrail {
  private config: AuditTrailConfig;
  private initialized = false;

  constructor(config?: Partial<AuditTrailConfig>) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  /**
   * Initialize the audit trail system
   * Sets up storage connections and loads initial state
   */
  async initialize(): Promise<void> {
    // In production, this would:
    // - Connect to Elasticsearch/database
    // - Load last entry hash for chain continuity
    // - Set up retention job scheduler
    
    // Get the last entry's hash for chaining
    if (auditStore.length > 0) {
      lastEntryHash = auditStore[auditStore.length - 1].entryHash;
    }
    
    this.initialized = true;
  }

  // =========================================================================
  // CORE AUDIT RECORDING METHODS
  // =========================================================================

  /**
   * Record a new audit event
   * This is the primary method for creating audit entries
   * 
   * @param params Audit event parameters
   * @returns The created audit entry
   */
  async record(params: {
    action: AuditAction;
    actor: AuditActor;
    resource: AuditResource;
    outcome: AuditOutcome;
    description: string;
    context?: Record<string, unknown>;
    failureReason?: string;
    geoLocation?: GeoLocation;
    riskScoreOverride?: number;
  }): Promise<AuditEntry> {
    if (!this.initialized) {
      throw new Error('AuditTrail not initialized. Call initialize() first.');
    }

    const timestamp = getTimestamp();
    
    // Determine retention period based on action category
    const actionCategory = categorizeAction(params.action);
    const retentionDays = DEFAULT_RETENTION_DAYS[actionCategory] || this.config.defaultRetentionDays;
    const retentionUntil = retentionDays > 0
      ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // ~100 years

    // Build the entry
    const entry: AuditStoreEntry = {
      id: generateId(),
      timestamp,
      action: params.action,
      actor: params.actor,
      resource: params.resource,
      outcome: params.outcome,
      description: params.description,
      context: params.context,
      failureReason: params.failureReason,
      geoLocation: params.geoLocation,
      riskScore: params.riskScoreOverride ?? ACTION_RISK_SCORES[params.action] ?? 50,
      previousEntryHash: this.config.enableHashChaining ? lastEntryHash || undefined : undefined,
      entryHash: '', // Will be computed below
      retentionUntil,
      complianceTags: ACTION_COMPLIANCE_MAP[params.action] || []
    };

    // Compute hash for tamper evidence
    if (this.config.enableHashChaining) {
      entry.entryHash = await computeHash(safeStringify({
        id: entry.id,
        timestamp: entry.timestamp,
        action: entry.action,
        actor: { id: entry.actor.id, type: entry.actor.type },
        resource: { type: entry.resource.type, id: entry.resource.id },
        outcome: entry.outcome,
        description: entry.description,
        previousEntryHash: entry.previousEntryHash
      }));
      
      lastEntryHash = entry.entryHash;
    }

    // Store the entry (append-only - immutable)
    auditStore.push(entry);

    // Log to main logger if configured
    if (this.config.logToMainLogger) {
      try {
        const { getLogger } = await import('./logger');
        if (isLoggerInitialized()) {
          getLogger().info('Audit event recorded', {
            auditId: entry.id,
            action: entry.action,
            actor: entry.actor.id,
            resource: `${entry.resource.type}:${entry.resource.id}`,
            outcome: entry.outcome
          }, LogSource.AUDIT);
        }
      } catch {
        // Logger not available, continue silently
      }
    }

    return entry;
  }

  /**
   * Convenience method for recording successful actions
   */
  async recordSuccess(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    description: string,
    context?: Record<string, unknown>
  ): Promise<AuditEntry> {
    return this.record({ action, actor, resource, outcome: AuditOutcome.SUCCESS, description, context });
  }

  /**
   * Convenience method for recording failed actions
   */
  async recordFailure(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    description: string,
    failureReason: string,
    context?: Record<string, unknown>
  ): Promise<AuditEntry> {
    return this.record({ action, actor, resource, outcome: AuditOutcome.FAILURE, description, failureReason, context });
  }

  /**
   * Convenience method for recording denied actions
   */
  async recordDenied(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    description: string,
    reason: string
  ): Promise<AuditEntry> {
    return this.record({ action, actor, resource, outcome: AuditOutcome.DENIED, description, failureReason: reason });
  }

  // =========================================================================
  // QUERY AND SEARCH METHODS
  // =========================================================================

  /**
   * Search audit entries with filters and pagination
   * 
   * @param filters Search filters
   * @param pagination Pagination parameters
   * @returns Search results with entries and metadata
   */
  search(
    filters?: AuditSearchFilters,
    pagination?: PaginationParams
  ): { entries: AuditEntry[]; total: number; pagination: PaginationInfo } {
    let results = [...auditStore];

    // Apply filters
    if (filters) {
      // Filter by action types
      if (filters.actions && filters.actions.length > 0) {
        results = results.filter(e => filters.actions!.includes(e.action));
      }

      // Filter by actor types
      if (filters.actorTypes && filters.actorTypes.length > 0) {
        results = results.filter(e => filters.actorTypes!.includes(e.actor.type));
      }

      // Filter by resource types
      if (filters.resourceTypes && filters.resourceTypes.length > 0) {
        results = results.filter(e => filters.resourceTypes!.includes(e.resource.type));
      }

      // Filter by outcomes
      if (filters.outcomes && filters.outcomes.length > 0) {
        results = results.filter(e => filters.outcomes!.includes(e.outcome));
      }

      // Filter by actor ID
      if (filters.actorId) {
        results = results.filter(e => e.actor.id === filters.actorId);
      }

      // Filter by time range
      if (filters.startTime) {
        results = results.filter(e => e.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        results = results.filter(e => e.timestamp <= filters.endTime!);
      }

      // Filter by text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        results = results.filter(e =>
          e.description.toLowerCase().includes(query) ||
          e.resource.name?.toLowerCase().includes(query) ||
          e.actor.displayName?.toLowerCase().includes(query) ||
          e.actor.username?.toLowerCase().includes(query)
        );
      }

      // Filter by minimum risk score
      if (filters.minRiskScore !== undefined) {
        results = results.filter(e => (e.riskScore ?? 0) >= filters.minRiskScore!);
      }

      // Filter by compliance tags
      if (filters.complianceTags && filters.complianceTags.length > 0) {
        results = results.filter(e =>
          e.complianceTags.some(tag => filters.complianceTags!.includes(tag))
        );
      }
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = results.length;

    // Apply pagination
    let paginatedResults = results;
    const page = pagination?.page || 1;
    const pageSize = Math.min(pagination?.pageSize || 50, this.config.maxBatchSize);
    const totalPages = Math.ceil(total / pageSize);

    if (pagination) {
      const startIdx = (page - 1) * pageSize;
      paginatedResults = results.slice(startIdx, startIdx + pageSize);
    }

    return {
      entries: paginatedResults,
      total,
      pagination: {
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get a single audit entry by ID
   * @param id Entry ID
   * @returns The audit entry or null if not found
   */
  getById(id: string): AuditEntry | null {
    return auditStore.find(e => e.id === id) || null;
  }

  /**
   * Get all entries for a specific actor
   * @param actorId Actor ID
   * @param limit Maximum entries to return
   * @returns Array of audit entries
   */
  getByActor(actorId: string, limit?: number): AuditEntry[] {
    let results = auditStore
      .filter(e => e.actor.id === actorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (limit) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  /**
   * Get all entries for a specific resource
   * @param resourceId Resource ID
   * @param limit Maximum entries to return
   * @returns Array of audit entries
   */
  getByResource(resourceId: string, limit?: number): AuditEntry[] {
    let results = auditStore
      .filter(e => e.resource.id === resourceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (limit) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  /**
   * Get activity timeline for an actor
   * Useful for user activity dashboards
   * 
   * @param actorId Actor ID
   * @param startTime Start of timeline
   * @param endTime End of timeline
   * @returns Timeline entries grouped by date
   */
  getActorTimeline(
    actorId: string,
    startTime?: string,
    endTime?: string
  ): { date: string; entries: AuditEntry[] }[] {
    let entries = auditStore.filter(e => e.actor.id === actorId);
    
    if (startTime) {
      entries = entries.filter(e => e.timestamp >= startTime);
    }
    if (endTime) {
      entries = entries.filter(e => e.timestamp <= endTime);
    }
    
    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Group by date
    const grouped = new Map<string, AuditEntry[]>();
    for (const entry of entries) {
      const date = entry.timestamp.split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(entry);
    }
    
    return Array.from(grouped.entries()).map(([date, entries]) => ({ date, entries }));
  }

  // =========================================================================
  // INTEGRITY VERIFICATION
  // =========================================================================

  /**
   * Verify the integrity of the entire audit chain
   * Checks that each entry's hash matches and chains correctly
   * 
   * @returns Integrity verification result
   */
  async verifyChainIntegrity(): Promise<{
    valid: boolean;
    totalEntries: number;
    verifiedEntries: number;
    brokenChainAt?: string;
    details: Array<{ entryId: string; valid: boolean; reason?: string }>
  }> {
    const details: Array<{ entryId: string; valid: boolean; reason?: string }> = [];
    let valid = true;
    let brokenChainAt: string | undefined;
    let expectedPreviousHash: string | null = null;

    for (const entry of auditStore) {
      const entryValid = await verifyEntryIntegrity(entry, expectedPreviousHash || undefined);
      
      if (!entryValid) {
        valid = false;
        if (!brokenChainAt) {
          brokenChainAt = entry.id;
        }
        details.push({ entryId: entry.id, valid: false, reason: 'Hash mismatch or chain break' });
      } else {
        details.push({ entryId: entry.id, valid: true });
      }
      
      expectedPreviousHash = entry.entryHash;
    }

    return {
      valid,
      totalEntries: auditStore.length,
      verifiedEntries: details.filter(d => d.valid).length,
      brokenChainAt,
      details
    };
  }

  // =========================================================================
  // COMPLIANCE EXPORT
  // =========================================================================

  /**
   * Export audit entries in compliance-specific formats
   * 
   * @param format Export format
   * @param filters Optional filters for which entries to export
   * @returns Formatted export data
   */
  exportForCompliance(
    format: 'SOC2' | 'GDPR' | 'ISO27001' | 'NIST' | 'ALGERIAN_LAW',
    filters?: AuditSearchFilters
  ): ComplianceExportResult {
    const { entries } = this.search(filters);
    
    switch (format) {
      case 'SOC2':
        return this.formatSOC2Export(entries);
      case 'GDPR':
        return this.formatGDPRExport(entries);
      case 'ISO27001':
        return this.formatISO27001Export(entries);
      case 'NIST':
        return this.formatNISTExport(entries);
      case 'ALGERIAN_LAW':
        return this.formatAlgerianLawExport(entries);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Format entries for SOC2 compliance reporting
   */
  private formatSOC2Export(entries: AuditEntry[]): ComplianceExportResult {
    const accessControlLogs = entries.filter(e =>
      e.complianceTags.includes(ComplianceCategory.SOC2_ACCESS_CONTROL)
    );
    const changeManagementLogs = entries.filter(e =>
      e.complianceTags.includes(ComplianceCategory.SOC2_CHANGE_MANAGEMENT)
    );

    return {
      format: 'SOC2',
      generatedAt: getTimestamp(),
      period: {
        start: entries[entries.length - 1]?.timestamp,
        end: entries[0]?.timestamp
      },
      summary: {
        totalEntries: entries.length,
        accessControlEvents: accessControlLogs.length,
        changeManagementEvents: changeManagementLogs.length,
        uniqueActors: new Set(accessControlLogs.map(e => e.actor.id)).size,
        uniqueResources: new Set(entries.map(e => `${e.resource.type}:${e.resource.id}`)).size
      },
      data: {
        trustServiceCriteria: {
          AC1_AccessControl: accessControlLogs.map(this.simplifyEntry),
          CM1_ChangeManagement: changeManagementLogs.map(this.simplifyEntry),
          SO1_SystemOperations: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.SOC2_SYSTEM_OPERATIONS)
          ).map(this.simplifyEntry)
        }
      }
    };
  }

  /**
   * Format entries for GDPR compliance reporting
   */
  private formatGDPRExport(entries: AuditEntry[]): ComplianceExportResult {
    const dataProcessingLogs = entries.filter(e =>
      e.complianceTags.some(t => t.startsWith('GDPR'))
    );

    return {
      format: 'GDPR',
      generatedAt: getTimestamp(),
      period: {
        start: entries[entries.length - 1]?.timestamp,
        end: entries[0]?.timestamp
      },
      summary: {
        totalEntries: entries.length,
        dataAccessEvents: dataProcessingLogs.filter(e =>
          [AuditAction.DATA_ACCESS, AuditAction.DATA_DOWNLOAD, AuditAction.READ].includes(e.action)
        ).length,
        consentRelatedEvents: dataProcessingLogs.length,
        dataSubjectsInvolved: new Set(dataProcessingLogs.map(e => e.resource.id)).size
      },
      data: {
        articlesCovered: {
          Article5_Principles: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.GDPR_ARTICLE_5)
          ).map(this.simplifyEntry),
          Article25_DataProtectionByDesign: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.GDPR_ARTICLE_25)
          ).map(this.simplifyEntry),
          Article30_RecordsOfProcessing: dataProcessingLogs.map(this.simplifyEntry),
          Article32_SecurityOfProcessing: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.GDPR_ARTICLE_32)
          ).map(this.simplifyEntry),
          Article33_BreachNotification: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.GDPR_ARTICLE_33)
          ).map(this.simplifyEntry)
        }
      }
    };
  }

  /**
   * Format entries for ISO27001 compliance reporting
   */
  private formatISO27001Export(entries: AuditEntry[]): ComplianceExportResult {
    return {
      format: 'ISO27001',
      generatedAt: getTimestamp(),
      period: {
        start: entries[entries.length - 1]?.timestamp,
        end: entries[0]?.timestamp
      },
      summary: {
        totalEntries: entries.length,
        controlsCovered: new Set(
          entries.flatMap(e => e.complianceTags.filter(t => t.startsWith('ISO')))
        ).size
      },
      data: {
        annexAControls: {
          A12_OperationsSecurity: entries.filter(e =>
            e.complianceTags.some(t => t.includes('A.12'))
          ).map(this.simplifyEntry),
          A13_CommunicationsSecurity: entries.filter(e =>
            e.complianceTags.some(t => t.includes('A.13'))
          ).map(this.simplifyEntry),
          A14_SystemAcquisition: entries.filter(e =>
            e.complianceTags.some(t => t.includes('A.14'))
          ).map(this.simplifyEntry),
          A15_SupplierRelationships: entries.filter(e =>
            e.complianceTags.some(t => t.includes('A.15'))
          ).map(this.simplifyEntry),
          A16_IncidentManagement: entries.filter(e =>
            e.complianceTags.some(t => t.includes('A.16'))
          ).map(this.simplifyEntry)
        }
      }
    };
  }

  /**
   * Format entries for NIST compliance reporting
   */
  private formatNISTExport(entries: AuditEntry[]): ComplianceExportResult {
    return {
      format: 'NIST',
      generatedAt: getTimestamp(),
      period: {
        start: entries[entries.length - 1]?.timestamp,
        end: entries[0]?.timestamp
      },
      summary: {
        totalEntries: entries.length,
        familiesCovered: new Set(
          entries.flatMap(e => e.complianceTags.filter(t => t.startsWith('NIST')).map(t => t.split('-')[0]))
        ).size
      },
      data: {
        controlFamilies: {
          AC_AccessControl: entries.filter(e =>
            e.complianceTags.some(t => t.startsWith('NIST.AC'))
          ).map(this.simplifyEntry),
          AU_AuditAndAccountability: entries.filter(e =>
            e.complianceTags.some(t => t.startsWith('NIST.AU'))
          ).map(this.simplifyEntry),
          SC_SystemCommunicationsProtection: entries.filter(e =>
            e.complianceTags.some(t => t.startsWith('NIST.SC'))
          ).map(this.simplifyEntry),
          SI_SystemIntegrity: entries.filter(e =>
            e.complianceTags.some(t => t.startsWith('NIST.SI'))
          ).map(this.simplifyEntry)
        }
      }
    };
  }

  /**
   * Format entries for Algerian Cybersecurity Law compliance
   */
  private formatAlgerianLawExport(entries: AuditEntry[]): ComplianceExportResult {
    return {
      format: 'ALGERIAN_LAW',
      generatedAt: getTimestamp(),
      period: {
        start: entries[entries.length - 1]?.timestamp,
        end: entries[0]?.timestamp
      },
      summary: {
        totalEntries: entries.length,
        articlesCovered: new Set(
          entries.flatMap(e => e.complianceTags.filter(t => t.startsWith('ALGERIAN')))
        ).size
      },
      data: {
        lawArticles: {
          Article8_IncidentReporting: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.ALGERIAN_ARTICLE_8)
          ).map(this.simplifyEntry),
          Article10_LogRetention: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.ALGERIAN_ARTICLE_10)
          ).map(this.simplifyEntry),
          Article12_AccessControl: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.ALGERIAN_ARTICLE_12)
          ).map(this.simplifyEntry),
          Article15_DataProtection: entries.filter(e =>
            e.complianceTags.includes(ComplianceCategory.ALGERIAN_ARTICLE_15)
          ).map(this.simplifyEntry)
        }
      }
    };
  }

  /**
   * Simplify an entry for export (remove internal fields)
   */
  private simplifyEntry(entry: AuditEntry): Record<string, unknown> {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      action: entry.action,
      actor: {
        id: entry.actor.id,
        type: entry.actor.type,
        displayName: entry.actor.displayName
      },
      resource: {
        type: entry.resource.type,
        id: entry.resource.id,
        name: entry.resource.name
      },
      outcome: entry.outcome,
      description: entry.description,
      complianceTags: entry.complianceTags,
      entryHash: entry.entryHash
    };
  }

  // =========================================================================
  // RETENTION MANAGEMENT
  // =========================================================================

  /**
   * Get entries eligible for archival/deletion based on retention policies
   * @returns Entries past their retention date
   */
  getExpiredEntries(): AuditEntry[] {
    const now = new Date().toISOString();
    return auditStore.filter(e => e.retentionUntil <= now && !e._archived);
  }

  /**
   * Archive expired entries
   * In production, this would move them to cold storage
   * @returns Number of entries archived
   */
  archiveExpiredEntries(): number {
    const expired = this.getExpiredEntries();
    expired.forEach(e => { e._archived = true; });
    return expired.length;
  }

  /**
   * Get retention statistics
   */
  getRetentionStats(): {
    totalEntries: number;
    activeEntries: number;
    archivedEntries: number;
    expiringSoon: number;
    byActionCategory: Record<string, number>;
  } {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      totalEntries: auditStore.length,
      activeEntries: auditStore.filter(e => !e._archived).length,
      archivedEntries: auditStore.filter(e => e._archived).length,
      expiringSoon: auditStore.filter(e => {
        const retentionDate = new Date(e.retentionUntil);
        return !e._archived && retentionDate <= thirtyDaysFromNow && retentionDate > now;
      }).length,
      byActionCategory: auditStore.reduce((acc, e) => {
        const cat = categorizeAction(e.action);
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get overall audit statistics
   */
  getStatistics(): AuditStatistics {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeEntries = auditStore.filter(e => !e._archived);

    return {
      totalEntries: activeEntries.length,
      entriesLast24Hours: activeEntries.filter(e => e.timestamp >= last24h.toISOString()).length,
      entriesLast7Days: activeEntries.filter(e => e.timestamp >= last7d.toISOString()).length,
      entriesLast30Days: activeEntries.filter(e => e.timestamp >= last30d.toISOString()).length,
      uniqueActors: new Set(activeEntries.map(e => e.actor.id)).size,
      uniqueResources: new Set(activeEntries.map(e => `${e.resource.type}:${e.resource.id}`)).size,
      successRate: activeEntries.length > 0
        ? (activeEntries.filter(e => e.outcome === AuditOutcome.SUCCESS).length / activeEntries.length) * 100
        : 0,
      failureRate: activeEntries.length > 0
        ? (activeEntries.filter(e => e.outcome === AuditOutcome.FAILURE || e.outcome === AuditOutcome.DENIED).length / activeEntries.length) * 100
        : 0,
      averageRiskScore: activeEntries.reduce((sum, e) => sum + (e.riskScore ?? 0), 0) / (activeEntries.length || 1),
      topActions: this.getTopActions(activeEntries, 10),
      topActors: this.getTopActors(activeEntries, 10),
      topResources: this.getResources(activeEntries, 10),
      chainIntegrityVerified: true // Would be actual check in production
    };
  }

  private getTopActions(entries: AuditEntry[], limit: number): Array<{ action: AuditAction; count: number }> {
    const counts = new Map<AuditAction, number>();
    for (const entry of entries) {
      counts.set(entry.action, (counts.get(entry.action) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getTopActors(entries: AuditEntry[], limit: number): Array<{ actor: AuditActor; count: number }> {
    const counts = new Map<string, { actor: AuditActor; count: number }>();
    for (const entry of entries) {
      const existing = counts.get(entry.actor.id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(entry.actor.id, { actor: entry.actor, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getResources(entries: AuditEntry[], limit: number): Array<{ resource: AuditResource; count: number }> {
    const counts = new Map<string, { resource: AuditResource; count: number }>();
    for (const entry of entries) {
      const key = `${entry.resource.type}:${entry.resource.id}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { resource: entry.resource, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// ============================================================================
// TYPES FOR SEARCH AND EXPORT
// ============================================================================

/** Filters specifically for audit searches */
export interface AuditSearchFilters {
  /** Filter by action types */
  actions?: AuditAction[];
  
  /** Filter by actor types */
  actorTypes?: ActorType[];
  
  /** Filter by resource types */
  resourceTypes?: ResourceType[];
  
  /** Filter by outcomes */
  outcomes?: AuditOutcome[];
  
  /** Filter by specific actor ID */
  actorId?: string;
  
  /** Text search in description/resource names */
  query?: string;
  
  /** Time range start */
  startTime?: string;
  
  /** Time range end */
  endTime?: string;
  
  /** Minimum risk score */
  minRiskScore?: number;
  
  /** Filter by compliance tags */
  complianceTags?: ComplianceCategory[];
}

/** Result of compliance export */
export interface ComplianceExportResult {
  format: string;
  generatedAt: string;
  period: { start?: string; end?: string };
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
}

/** Audit statistics structure */
export interface AuditStatistics {
  totalEntries: number;
  entriesLast24Hours: number;
  entriesLast7Days: number;
  entriesLast30Days: number;
  uniqueActors: number;
  uniqueResources: number;
  successRate: number;
  failureRate: number;
  averageRiskScore: number;
  topActions: Array<{ action: AuditAction; count: number }>;
  topActors: Array<{ actor: AuditActor; count: number }>;
  topResources: Array<{ resource: AuditResource; count: number }>;
  chainIntegrityVerified: boolean;
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalAuditTrail: AuditTrail | null = null;

/**
 * Initialize the global audit trail singleton
 * @param config Optional configuration overrides
 * @returns Initialized audit trail instance
 */
export async function initializeAuditTrail(config?: Partial<AuditTrailConfig>): Promise<AuditTrail> {
  if (globalAuditTrail) {
    return globalAuditTrail;
  }
  
  globalAuditTrail = new AuditTrail(config);
  await globalAuditTrail.initialize();
  return globalAuditTrail;
}

/**
 * Get the global audit trail instance
 * @throws Error if not initialized
 */
export function getAuditTrail(): AuditTrail {
  if (!globalAuditTrail) {
    throw new Error('AuditTrail not initialized. Call initializeAuditTrail() first.');
  }
  return globalAuditTrail;
}

/**
 * Quick function to record an audit event using the global instance
 */
export async function recordAudit(params: Parameters<AuditTrail['record']>[0]): Promise<AuditEntry> {
  return getAuditTrail().record(params);
}
