/**
 * 🇩🇿 National SOC - Wazuh Integration Types
 * TypeScript type definitions for Wazuh API responses
 */

// ────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────

export interface WazuhConfig {
  /** Wazuh API base URL (e.g., https://wazuh:55000) */
  baseUrl: string;
  /** API username */
  username: string;
  /** API password */
  password: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
}

// ────────────────────────────────────────────────────────
// AGENT TYPES
// ────────────────────────────────────────────────────────

export interface WazuhAgent {
  /** Agent unique ID */
  id: string;
  /** Agent display name */
  name: string;
  /** IP address of agent */
  ip: string;
  /** Agent status: active, disconnected, never_connected */
  status: 'active' | 'disconnected' | 'never_connected';
  /** Date agent was added */
  dateAdd: string;
  /** Last keep-alive timestamp */
  lastKeepAlive: string;
  /** Agent version */
  version: string;
  /** Operating system name */
  os: {
    platform: string;
    name: string;
    version: string;
  };
  /** Node name (cluster) */
  nodeName?: string;
  /** Registration server */
  registerServer?: string;
  /** Group assignments */
  group?: string[];
  /** Configuration checksum */
  configSum?: string;
  /** Merged configuration checksum */
  mergedSum?: string;
  /** Manager hostname */
  manager: string;
  /** Whether agent is active response enabled */
  activeResponse?: boolean;
  /** Whether FIM is enabled */
  fimEnabled?: boolean;
  /** Whether rootcheck is enabled */
  rootcheckEnabled?: boolean;
}

export interface WazuhAgentSummary {
  total: number;
  active: number;
  disconnected: number;
  never_connected: number;
  coverage: number; // Percentage
}

// ────────────────────────────────────────────────────────
// ALERT TYPES
// ────────────────────────────────────────────────────────

export interface WazuhAlert {
  /** Alert timestamp (ISO 8601) */
  timestamp: string;
  
  /** Rule information */
  rule: {
    /** Rule ID */
    id: number;
    /** Rule level (0-16+) */
    level: number;
    /** Rule description */
    description: string;
    /** Rule groups */
    groups: string[];
    /** Rule fidelity (confidence) */
    fidelity?: number;
    /** MITRE ATT&CK technique ID */
    mitre?: {
      id: string;
      tactic: string;
      technique: string;
    };
  };
  
  /** Agent that generated alert */
  agent: {
    id: string;
    name: string;
    ip: string;
  };
  
  /** Full log message */
  full_log: string;
  
  /** Source details */
  srcip?: string;
  srcport?: number;
  
  /** Destination details */
  dstip?: string;
  dstport?: number;
  
  /** Protocol (tcp, udp, icmp) */
  protocol?: string;
  
  /** HTTP request data */
  http?: {
    method: string;
    url: string;
    status_code: number;
  };
  
  /** DNS query data */
  dns?: {
    query: string;
    rcode: string;
    rtype: string;
  };
  
  /** User/Account info */
  user?: string;
  /** Syslog facility */
  syslog?: {
    facility: string;
    severity: string;
    level: number;
  };
  
  /** File/FIM data */
  file?: string;
  /** Hash values */
  hash?: string;
  
  /** Compliance check result */
  compliance?: {
    id: string;
    status: 'passed' | 'failed';
    reason: string;
  };
  
  /** Vulnerability data */
  vulnerability?: {
    cve: string;
    cvss: number;
    cvss_vector: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    package: {
      name: string;
      cpe: string;
      version: string;
    };
    reference: string;
  };

  /** Custom fields */
  data?: Record<string, any>;
  
  /** Internal Wazuh fields */
  _id?: string;
  decoder?: {
    name: string;
    parent: string;
  };
  location: string;
  manager: {
    name: string;
  };
}

// ────────────────────────────────────────────────────────
// SUMMARY & AGGREGATION TYPES
// ────────────────────────────────────────────────────────

export interface WazuhSummary {
  totalEvents: number;
  totalFired: number;
  signature: Record<string, number>;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  byAgent: Array<{ agent: string; count: number }>;
  timeline: Array<{
    timestamp: string;
    count: number;
  }>;
}

export interface WazuhAggregation {
  field: string;
  buckets: Array<{
    key: string | number;
    doc_count: number;
  }>;
  totalBuckets: number;
  otherDocCount: number;
}

// ────────────────────────────────────────────────────────
// SCA (Security Configuration Assessment) TYPES
// ────────────────────────────────────────────────────────

export interface SCAPolicy {
  id: string;
  name: string;
  description: string;
  file: string;
  passed: number;
  failed: number;
  score: number; // 0-100
  hash: string;
  hash_file: string;
  start_scan: string;
  end_scan: string;
  policies_id: string[];
}

export interface SCACheck {
  id: string;
  policy_id: string;
  title: string;
  description: string;
  rationale: string;
  remediation: string;
  references: string[];
  compliance: {
    pci_dss?: string;
    gdpr?: string;
    hipaa?: string;
    nist?: string;
    tsc?: string;
  };
  result: 'passed' | 'failed';
  status: string;
}

// ────────────────────────────────────────────────────────
// FIM (File Integrity Monitoring) TYPES
// ────────────────────────────────────────────────────────

export interface FIMEvent {
  timestamp: string;
  agent: {
    id: string;
    name: string;
  };
  path: string;
  event: 'added' | 'modified' | 'deleted';
  before?: {
    uid: string;
    gid: string;
    inode: number;
    md5: string;
    sha1: string;
    sha256: string;
    size: number;
    perm: string;
    uname: string;
    gname: string;
    mtime: string;
    attributes: string;
  };
  after?: {
    uid: string;
    gid: string;
    inode: number;
    md5: string;
    sha1: string;
    sha256: string;
    size: number;
    perm: string;
    uname: string;
    gname: string;
    mtime: string;
    attributes: string;
  };
  tags?: string[];
  hash_diff: boolean;
}

// ────────────────────────────────────────────────────────
// VULNERABILITY TYPES
// ────────────────────────────────────────────────────────

export interface Vulnerability {
  cve: string;
  cvss: number;
  cvss3_score?: number;
  cvss_vector: string;
  published: string;
  updated: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  enumeration: string;
  package: {
    name: string;
    cpe: string;
    vendor: string;
    version: string;
    arch: string;
    condition: string;
  };
  advisory: string;
  reference: string;
  detection_time: string;
  status: 'Resolved' | 'Vulnerable';
}

// ────────────────────────────────────────────────────────
// MANAGER TYPES
// ────────────────────────────────────────────────────────

export interface WazuhManagerInfo {
  version: string;
  compilation_date: string;
  type: string;
  md5: string;
  max_agents: number;
  openssl_support: boolean;
  tz_name: string;
  tz_offset: string;
}

export interface DaemonStatus {
  name: string;
  status: 'running' | 'stopped' | 'configured' | 'failed';
}

// ────────────────────────────────────────────────────────
// ACTIVE RESPONSE TYPES
// ────────────────────────────────────────────────────────

export interface ActiveResponseCommand {
  command: string;
  agentId: string;
  arguments?: Record<string, any>;
  custom?: boolean;
  timestamp: string;
  status: 'pending' | 'executed' | 'failed';
}

// ────────────────────────────────────────────────────────
// API RESPONSE WRAPPER
// ────────────────────────────────────────────────────────

export interface WazuhApiResponse<T> {
  error: number;
  data: T;
  message: string;
}

// ────────────────────────────────────────────────────────
// WEBHOOK / INTEGRATION TYPES
// ────────────────────────────────────────────────────────

export interface WazuhWebhookPayload {
  event_type: 'alert' | 'agent_status' | 'system_info';
  timestamp: string;
  payload: WazuhAlert | WazuhAgent | WazuhManagerInfo;
  source: 'wazuh';
}

// ────────────────────────────────────────────────────────
// DASHBOARD DISPLAY TYPES
// ────────────────────────────────────────────────────────

export interface WazuhDashboardData {
  summary: {
    agents: WazuhAgentSummary;
    alerts: WazuhSummary;
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
    };
    compliance: {
      pci_dss: number;
      gdpr: number;
      overall: number;
    };
  };
  recentAlerts: WazuhAlert[];
  topAttackedAgents: Array<{ agent: string; alerts: number }>;
  ruleDistribution: Array<{ rule: string; count: number }>;
  severityTrend: Array<{ time: string; critical: number; high: number; medium: number; low: number }>;
}
