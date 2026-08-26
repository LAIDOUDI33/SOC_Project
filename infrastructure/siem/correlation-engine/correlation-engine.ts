# =============================================================================
# Djezzy National SOC Platform - Phase 5: SIEM Integration
# Security Event Correlation Engine
# =============================================================================
# Advanced event correlation for:
# - Multi-source event aggregation
# - Attack chain detection (MITRE ATT&CK)
# - Anomaly detection
# - Automated alert generation
# - Telecom fraud pattern recognition
# =============================================================================

import { EventEmitter } from 'events';
import { Client } from '@elastic/elasticsearch';
import * as crypto from 'crypto';

// ========================================
// Type Definitions
// ========================================

export interface CorrelationEvent {
  id: string;
  timestamp: Date;
  source: EventSource;
  severity: Severity;
  category: EventCategory;
  rawEvent: Record<string, any>;
  enrichedData?: EnrichedData;
  riskScore: number;
  tags: string[];
}

export interface EventSource {
  ip: string;
  hostname: string;
  type: 'filebeat' | 'metricbeat' | 'packetbeat' | 'api' | 'kafka' | 'syslog';
  domain: string; // telecom, network, endpoint, cloud, identity
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface EnrichedData {
  geoLocation?: {
    country: string;
    city: string;
    coordinates: [number, number];
  };
  asnInfo?: {
    number: number;
    organization: string;
  };
  threatIntel?: ThreatMatch[];
  userContext?: UserContext;
  historicalPattern?: HistoricalPattern;
}

export interface ThreatMatch {
  indicatorType: string;
  indicatorValue: string;
  feedName: string;
  confidence: number;
  lastSeen: Date;
  tags: string[];
}

export interface UserContext {
  userId: string;
  username: string;
  department: string;
  role: string;
  riskProfile: 'low' | 'medium' | 'high' | 'privileged';
  recentAuthFailures: number;
  unusualActivityFlags: string[];
}

export interface HistoricalPattern {
  baselineFrequency: number;
  currentFrequency: number;
  deviationFactor: number;
  isAnomaly: boolean;
  anomalyScore: number;
}

export type EventCategory = 
  | 'authentication'
  | 'network_connection'
  | 'dns_query'
  | 'file_access'
  | 'process_execution'
  | 'registry_change'
  | 'telecom_signaling'
  | 'fraud_indicator'
  | 'malware_detection'
  | 'policy_violation'
  | 'data_exfiltration'
  | 'privilege_escalation';

// MITRE ATT&CK Mapping
export interface MitreTactic {
  id: string;
  name: string;
  url: string;
}

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: MitreTactic;
  detectionDifficulty: 'easy' | 'moderate' | 'hard';
  subtechniques?: MitreTechnique[];
}

// Correlation Rule Definition
export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: EventCategory;
  
  // Time window for correlation (in seconds)
  windowSize: number;
  
  // Conditions to match
  conditions: CorrelationCondition[];
  
  // Aggregation settings
  aggregation?: AggregationConfig;
  
  // Threshold to trigger alert
  threshold: ThresholdConfig;
  
  // MITRE ATT&CK mapping
  mitreMapping?: {
    tactics: MitreTactic[];
    techniques: MitreTechnique[];
  };
  
  // Response actions
  responseActions?: ResponseAction[];
  
  // Suppression rules
  suppression?: SuppressionRule[];
  
  // Metadata
  author: string;
  version: string;
  enabled: boolean;
  falsePositiveRate: number; // 0-1, estimated false positive rate
  tags: string[];
}

export interface CorrelationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 
            'regex' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' |
            'exists' | 'not_exists' | 'ip_range' | 'cidr_match';
  value: any;
  negate?: boolean;
}

export interface AggregationConfig {
  groupBy: string[]; // Fields to group events by
  function: 'count' | 'sum' | 'avg' | 'max' | 'min' | 'unique_count';
  field?: string; // Field to aggregate on (for sum, avg, etc.)
}

export interface ThresholdConfig {
  operator: 'gt' | 'gte' | 'eq' | 'lt' | 'lte';
  value: number;
  timeWindow?: number; // Override rule window size
}

export interface ResponseAction {
  type: 'alert' | 'block_ip' | 'isolate_endpoint' | 'disable_account' | 
        'notify_analyst' | 'create_incident' | 'run_playbook' | 'webhook';
  config: Record<string, any>;
  priority: number;
  autoExecute: boolean; // Whether to execute automatically or require approval
}

export interface SuppressionRule {
  field: string;
  value: any;
  duration: number; // Seconds to suppress after match
  reason: string;
}

// Correlation Alert Output
export interface CorrelationAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  timestamp: Date;
  firstEventTime: Date;
  lastEventTime: Date;
  eventCount: number;
  correlatedEvents: CorrelationEvent[];
  
  // Aggregated data
  aggregatedValues?: Record<string, any>;
  
  // Risk scoring
  riskScore: number;
  confidence: number;
  
  // Context
  context: AlertContext;
  
  // MITRE mapping
  mitreMapping?: {
    tactics: MitreTactic[];
    techniques: MitreTechnique[];
  };
  
  // Recommended actions
  recommendedActions: ResponseAction[];
  
  // Status tracking
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';
  assignedAnalyst?: string;
  incidentId?: string;
  notes?: AlertNote[];
}

export interface AlertContext {
  sourceIps: string[];
  destinationIps: string[];
  affectedUsers: string[];
  affectedAssets: string[];
  timeline: TimelineEntry[];
  relatedAlerts: string[]; // IDs of related alerts
  killChainPhase?: string;
}

export interface TimelineEntry {
  timestamp: Date;
  event: string;
  significance: 'critical' | 'major' | 'minor' | 'informational';
  source: string;
}

export interface AlertNote {
  timestamp: Date;
  author: string;
  content: string;
  type: 'analysis' | 'action' | 'status_update' | 'external';
}

// ========================================
// Correlation Engine Class
// ========================================

export class SecurityCorrelationEngine extends EventEmitter {
  private esClient: Client;
  private rules: Map<string, CorrelationRule> = new Map();
  private activeWindows: Map<string, CorrelationEvent[]> = new Map();
  private alertHistory: Map<string, CorrelationAlert[]> = new Map();
  private suppressionList: Map<string, Date> = new Map();
  
  // Configuration
  private config: CorrelationEngineConfig;

  constructor(esClient: Client, config?: Partial<CorrelationEngineConfig>) {
    super();
    this.esClient = esClient;
    this.config = {
      maxEventsPerWindow: 10000,
      defaultWindowSize: 300, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      alertRetentionDays: 90,
      enableMitreMapping: true,
      enableAutoResponse: false,
      maxConcurrentRules: 50,
      ...config
    };

    // Start cleanup interval
    setInterval(() => this.cleanupOldWindows(), this.config.cleanupInterval);
    
    // Load default rules
    this.loadDefaultRules();
  }

  // ========================================
  // Rule Management
  // ========================================

  /**
   * Load default correlation rules for Djezzy SOC Platform
   */
  private loadDefaultRules(): void {
    const defaultRules: CorrelationRule[] = [
      // Rule 1: Brute Force Attack Detection
      {
        id: 'BRUTE-001',
        name: 'Multiple Authentication Failures - Brute Force',
        description: 'Detects potential brute force attacks based on multiple failed authentication attempts from a single source within a time window',
        severity: 'high',
        category: 'authentication',
        windowSize: 300, // 5 minutes
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'authentication' },
          { field: 'event.outcome', operator: 'equals', value: 'failure' }
        ],
        aggregation: {
          groupBy: ['source.ip'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 10 },
        mitreMapping: {
          tactics: [{ id: 'TA0006', name: 'Credential Access', url: 'https://attack.mitre.org/tactics/TA0006/' }],
          techniques: [{
            id: 'T1110',
            name: 'Brute Force',
            tactic: { id: 'TA0006', name: 'Credential Access', url: '' },
            detectionDifficulty: 'easy'
          }]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'block_ip', config: { duration: 3600 }, priority: 2, autoExecute: this.config.enableAutoResponse },
          { type: 'notify_analyst', config: { channels: ['slack', 'email'] }, priority: 3, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.05,
        tags: ['brute-force', 'authentication', 'credential-access']
      },

      // Rule 2: Lateral Movement Detection
      {
        id: 'LATMOV-001',
        name: 'Lateral Movement - Unusual SMB/RDP Activity',
        description: 'Detects potential lateral movement via unusual SMB or RDP connections from workstations to multiple hosts',
        severity: 'critical',
        category: 'network_connection',
        windowSize: 3600, // 1 hour
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'network_connection' },
          { field: 'destination.port', operator: 'in', value: [445, 3389, 135, 139] },
          { field: 'source.hostname', operator: 'regex', value: '^WS\\d+|PC\\d+|DESKTOP.*' }
        ],
        aggregation: {
          groupBy: ['source.ip'],
          function: 'unique_count',
          field: 'destination.ip'
        },
        threshold: { operator: 'gte', value: 5 },
        mitreMapping: {
          tactics: [{ id: 'TA0008', name: 'Lateral Movement', url: 'https://attack.mitre.org/tactics/TA0008/' }],
          techniques: [
            {
              id: 'T1021',
              name: 'Remote Services',
              tactic: { id: 'TA0008', name: 'Lateral Movement', url: '' },
              detectionDifficulty: 'moderate'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'isolate_endpoint', config: { source: 'source.ip' }, priority: 2, autoExecute: this.config.enableAutoResponse },
          { type: 'notify_analyst', config: { channels: ['slack', 'pagerduty'] }, priority: 3, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.15,
        tags: ['lateral-movement', 'smb', 'rdp']
      },

      // Rule 3: Data Exfiltration Detection
      {
        id: 'DATAEXFIL-001',
        name: 'Large Data Transfer to External Location',
        description: 'Detects potential data exfiltration through large outbound transfers to external IPs or cloud storage services',
        severity: 'critical',
        category: 'data_exfiltration',
        windowSize: 1800, // 30 minutes
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'network_connection' },
          { field: 'source.geo.country_name', operator: 'not_equals', value: 'Algeria' }
        ],
        aggregation: {
          groupBy: ['source.ip', 'destination.ip'],
          function: 'sum',
          field: 'network.bytes'
        },
        threshold: { operator: 'gte', value: 1073741824 }, // 1 GB
        mitreMapping: {
          tactics: [{ id: 'TA0010', name: 'Exfiltration', url: 'https://attack.mitre.org/tactics/TA0010/' }],
          techniques: [
            {
              id: 'T1048',
              name: 'Exfiltration Over Alternative Protocol',
              tactic: { id: 'TA0010', name: 'Exfiltration', url: '' },
              detectionDifficulty: 'hard'
            },
            {
              id: 'T1567',
              name: 'Exfiltration Over Web Service',
              tactic: { id: 'TA0010', name: 'Exfiltration', url: '' },
              detectionDifficulty: 'moderate'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'block_ip', config: { destination: true, duration: 7200 }, priority: 2, autoExecute: this.config.enableAutoResponse },
          { type: 'create_incident', config: { priority: 'P1', assignTo: 'ir-team' }, priority: 3, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.10,
        tags: ['exfiltration', 'data-loss', 'dlp']
      },

      // Rule 4: Telecom SIM Swapping Fraud
      {
        id: 'TELECOM-FRAUD-001',
        name: 'SIM Swap Fraud Pattern - Multiple IMSI Changes',
        description: 'Detects potential SIM swap fraud by identifying rapid IMSI changes associated with the same MSISDN or unusual roaming patterns',
        severity: 'critical',
        category: 'telecom_signaling',
        windowSize: 86400, // 24 hours
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'telecom_signaling' },
          { field: 'telecom.protocol', operator: 'equals', value: 'MAP' },
          { field: 'ss7_op_code', operator: 'in', value: ['insertSubscriberData', 'updateLocation'] }
        ],
        aggregation: {
          groupBy: ['telecom.msisdn'],
          function: 'unique_count',
          field: 'telecom.imsi'
        },
        threshold: { operator: 'gte', value: 2 }, // More than 1 IMSI per MSISDN in 24h
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'create_incident', config: { priority: 'P1', type: 'fraud', assignTo: 'fraud-team' }, priority: 2, autoExecute: true },
          { type: 'run_playbook', config: { playbook: 'sim-swap-investigation' }, priority: 3, autoExecute: false }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.02,
        tags: ['fraud', 'sim-swap', 'telecom', 'map']
      },

      // Rule 5: DNS Tunneling Detection
      {
        id: 'DNS-001',
        name: 'Potential DNS Tunneling - High Entropy Queries',
        description: 'Detects potential DNS tunneling by analyzing query patterns with high entropy, long subdomain lengths, or unusual query volumes',
        severity: 'high',
        category: 'dns_query',
        windowSize: 300, // 5 minutes
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'dns_query' },
          { field: 'dns.question.name_length', operator: 'gt', value: 50 }
        ],
        aggregation: {
          groupBy: ['source.ip', 'dns.question.name'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 20 },
        mitreMapping: {
          tactics: [{ id: 'TA0011', name: 'Command and Control', url: 'https://attack.mitre.org/tactics/TA0011/' }],
          techniques: [
            {
              id: 'T1071',
              name: 'Application Layer Protocol',
              tactic: { id: 'TA0011', name: 'Command and Control', url: '' },
              detectionDifficulty: 'moderate'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'block_ip', config: { duration: 1800 }, priority: 2, autoExecute: this.config.enableAutoResponse }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.08,
        tags: ['dns-tunneling', 'c2', 'command-and-control']
      },

      // Rule 6: Privilege Escalation Detection
      {
        id: 'PRIVESC-001',
        name: 'Privilege Escalation - Sudo/Runas Abuse',
        description: 'Detects suspicious privilege escalation attempts including unusual sudo usage, token manipulation, or service abuse',
        severity: 'high',
        category: 'privilege_escalation',
        windowSize: 3600, // 1 hour
        conditions: [
          { field: 'event.category', operator: 'in', value: ['process_execution', 'authentication'] },
          { field: 'process.name', operator: 'in', value: ['sudo', 'runas', 'pkexec', 'doas', 'su'] }
        ],
        aggregation: {
          groupBy: ['user.name', 'source.ip'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 5 },
        mitreMapping: {
          tactics: [{ id: 'TA0004', name: 'Privilege Escalation', url: 'https://attack.mitre.org/tactics/TA0004/' }],
          techniques: [
            {
              id: 'T1548',
              name: 'Abuse Elevation Control Mechanism',
              tactic: { id: 'TA0004', name: 'Privilege Escalation', url: '' },
              detectionDifficulty: 'moderate'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'notify_analyst', config: { channels: ['slack', 'pagerduty'] }, priority: 2, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.12,
        tags: ['privilege-escalation', 'sudo', 'abuse']
      },

      // Rule 7: Ransomware Indicators
      {
        id: 'MALWARE-001',
        name: 'Ransomware Behavior Pattern - Mass File Encryption',
        description: 'Detects ransomware-like behavior through mass file modifications, encryption process execution, and ransom note creation',
        severity: 'critical',
        category: 'malware_detection',
        windowSize: 300, // 5 minutes
        conditions: [
          { field: 'event.category', operator: 'in', value: ['file_access', 'process_execution'] },
          { field: 'file.extension', operator: 'in', value: ['.encrypted', '.locked', '.crypto', '.ransom', '.xyz'] }
        ],
        aggregation: {
          groupBy: ['source.ip', 'process.executable'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 50 },
        mitreMapping: {
          tactics: [
            { id: 'TA0040', name: 'Impact', url: 'https://attack.mitre.org/tactics/TA0040/' },
            { id: 'TA0005', name: 'Defense Evasion', url: 'https://attack.mitre.org/tactics/TA0005/' }
          ],
          techniques: [
            {
              id: 'T1486',
              name: 'Data Encrypted for Impact',
              tactic: { id: 'TA0040', name: 'Impact', url: '' },
              detectionDifficulty: 'easy'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'isolate_endpoint', config: { immediate: true }, priority: 2, autoExecute: this.config.enableAutoResponse },
          { type: 'create_incident', config: { priority: 'P0', type: 'malware', assignTo: 'ir-team' }, priority: 3, autoExecute: true },
          { type: 'run_playbook', config: { playbook: 'ransomware-response' }, priority: 4, autoExecute: false }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.01,
        tags: ['ransomware', 'malware', 'encryption']
      },

      // Rule 8: International Revenue Share Fraud (IRSF)
      {
        id: 'TELECOM-FRAUD-002',
        name: 'International Revenue Share Fraud (IRSF) Pattern',
        description: 'Detects IRSF patterns through high-volume calls to premium-rate international numbers, especially to high-risk destinations',
        severity: 'high',
        category: 'fraud_indicator',
        windowSize: 3600, // 1 hour
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'telecom_signaling' },
          { field: 'telecom.protocol', operator: 'equals', value: 'ISUP' },
          { field: 'called_party', operator: 'regex', value: '^\\+(?:234|92|880|249|251|255|256|250|260|268|211|212|213|216|218|220|221|222|223|225|226|227|228|229|230|231|232|233|235|236|237|238|239|240|241|242|243|244|245|246|247|248|249|250|251|252|253|254|255|256|257|258|259|260|261|262|263|264|265|266|267|268|269|270)' }
        ],
        aggregation: {
          groupBy: ['calling_party'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 50 },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'run_playbook', config: { playbook: 'irsf-investigation' }, priority: 2, autoExecute: false },
          { type: 'create_incident', config: { priority: 'P2', type: 'fraud', assignTo: 'fraud-team' }, priority: 3, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.03,
        tags: ['fraud', 'irsf', 'premium-rate', 'international']
      },

      // Rule 9: Insider Threat - After Hours Access
      {
        id: 'INSIDER-001',
        name: 'Insider Threat - Unusual After-Hours Data Access',
        description: 'Detects potentially malicious insider activity through unusual access patterns outside normal working hours to sensitive data repositories',
        severity: 'medium',
        category: 'data_exfiltration',
        windowSize: 3600, // 1 hour
        conditions: [
          { field: 'event.category', operator: 'in', value: ['file_access', 'database_access'] },
          { field: '@timestamp', operator: 'custom', value: 'after_hours' } // Custom handler needed
        ],
        aggregation: {
          groupBy: ['user.name'],
          function: 'count'
        },
        threshold: { operator: 'gte', value: 100 },
        suppression: [
          { field: 'user.role', value: 'admin', duration: 0, reason: 'Admin access expected' }
        ],
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'notify_analyst', config: { channels: ['email'] }, priority: 2, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.20,
        tags: ['insider-threat', 'dlp', 'uba']
      },

      // Rule 10: Web Shell / Backdoor Detection
      {
        id: 'WEB-001',
        name: 'Web Shell / Backdoor Detection - Suspicious URL Patterns',
        description: 'Detects potential web shell activity through suspicious URL patterns, known web shell filenames, and anomalous HTTP request characteristics',
        severity: 'critical',
        category: 'malware_detection',
        windowSize: 300, // 5 minutes
        conditions: [
          { field: 'event.category', operator: 'equals', value: 'network_connection' },
          { field: 'destination.port', operator: 'in', value: [80, 443, 8080, 8443] },
          { field: 'url.path', operator: 'regex', value: '(?i)(c99|r57|b374k|weevely|alfa|webshell|cmd|cmd.exe|powershell|eval|base64_decode|shell_exec|system|passthru|exec|assert|preg_replace\\/e)' }
        ],
        threshold: { operator: 'gte', value: 1 },
        mitreMapping: {
          tactics: [
            { id: 'TA0003', name: 'Persistence', url: 'https://attack.mitre.org/tactics/TA0003/' },
            { id: 'TA0005', name: 'Defense Evasion', url: 'https://attack.mitre.org/tactics/TA0005/' }
          ],
          techniques: [
            {
              id: 'T1505',
              name: 'Server Software Component: Web Shell',
              tactic: { id: 'TA0003', name: 'Persistence', url: '' },
              detectionDifficulty: 'easy'
            }
          ]
        },
        responseActions: [
          { type: 'alert', config: {}, priority: 1, autoExecute: true },
          { type: 'isolate_endpoint', config: { immediate: true }, priority: 2, autoExecute: this.config.enableAutoResponse },
          { type: 'create_incident', config: { priority: 'P1', type: 'compromise', assignTo: 'ir-team' }, priority: 3, autoExecute: true }
        ],
        author: 'Djezzy SOC Team',
        version: '1.0.0',
        enabled: true,
        falsePositiveRate: 0.01,
        tags: ['web-shell', 'backdoor', 'persistence', 'web']
      }
    ];

    // Load all rules into the engine
    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Add a custom correlation rule
   */
  addRule(rule: CorrelationRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule:added', rule);
  }

  /**
   * Remove a correlation rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.emit('rule:removed', ruleId);
    }
    return deleted;
  }

  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.emit('rule:toggled', { ruleId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  getRules(): CorrelationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get a specific rule
   */
  getRule(ruleId: string): CorrelationRule | undefined {
    return this.rules.get(ruleId);
  }

  // ========================================
  // Event Processing
  // ========================================

  /**
   * Process incoming security event through correlation engine
   */
  async processEvent(event: CorrelationEvent): Promise<CorrelationAlert[]> {
    const alerts: CorrelationAlert[] = [];
    
    try {
      // Enrich event with additional context
      await this.enrichEvent(event);
      
      // Calculate initial risk score
      event.riskScore = this.calculateRiskScore(event);
      
      // Check against all enabled rules
      for (const [ruleId, rule] of this.rules) {
        if (!rule.enabled) continue;
        
        try {
          const alert = await this.evaluateRule(rule, event);
          if (alert) {
            alerts.push(alert);
            
            // Execute automatic responses
            await this.executeResponses(alert);
            
            // Emit alert event
            this.emit('alert:generated', alert);
          }
        } catch (error) {
          console.error(`Error evaluating rule ${ruleId}:`, error);
          this.emit('rule:error', { ruleId, error });
        }
      }
      
      // Store event in active windows for future correlation
      this.storeInWindow(event);
      
    } catch (error) {
      console.error('Error processing event:', error);
      this.emit('event:error', { event, error });
    }
    
    return alerts;
  }

  /**
   * Batch process multiple events
   */
  async processEvents(events: CorrelationEvent[]): Promise<CorrelationAlert[]> {
    const allAlerts: CorrelationAlert[] = [];
    
    // Process in parallel batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchAlerts = await Promise.all(
        batch.map(event => this.processEvent(event))
      );
      allAlerts.push(...batchAlerts.flat());
    }
    
    return allAlerts;
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Evaluate a single rule against an event
   */
  private async evaluateRule(rule: CorrelationEvent, event: CorrelationEvent): Promise<CorrelationAlert | null> {
    // Check if event matches rule conditions
    if (!this.matchesConditions(event, rule.conditions)) {
      return null;
    }
    
    // Get or create window for this rule
    const windowKey = `${rule.id}_${this.getGroupKey(event, rule.aggregation?.groupBy || [])}`;
    let windowEvents = this.activeWindows.get(windowKey) || [];
    
    // Add current event
    windowEvents.push(event);
    
    // Trim old events outside window
    const cutoff = new Date(Date.now() - rule.windowSize * 1000);
    windowEvents = windowEvents.filter(e => e.timestamp >= cutoff);
    
    // Update window
    this.activeWindows.set(windowKey, windowEvents);
    
    // Check threshold
    const aggregateValue = this.calculateAggregate(windowEvents, rule.aggregation);
    const meetsThreshold = this.checkThreshold(aggregateValue, rule.threshold);
    
    if (!meetsThreshold) {
      return null;
    }
    
    // Check suppression
    if (this.isSuppressed(rule, event)) {
      return null;
    }
    
    // Generate alert
    const alert = this.generateAlert(rule, windowEvents, aggregateValue);
    
    // Store in history
    const history = this.alertHistory.get(rule.id) || [];
    history.push(alert);
    this.alertHistory.set(rule.id, history.slice(-100)); // Keep last 100 alerts
    
    return alert;
  }

  /**
   * Check if event matches all conditions
   */
  private matchesConditions(event: CorrelationEvent, conditions: CorrelationCondition[]): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getNestedField(event, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(fieldValue: any, condition: CorrelationCondition): boolean {
    let result = false;
    
    switch (condition.operator) {
      case 'equals':
        result = fieldValue === condition.value;
        break;
      case 'not_equals':
        result = fieldValue !== condition.value;
        break;
      case 'contains':
        result = typeof fieldValue === 'string' && fieldValue.includes(condition.value);
        break;
      case 'not_contains':
        result = !(typeof fieldValue === 'string' && fieldValue.includes(condition.value));
        break;
      case 'regex':
        result = typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
        break;
      case 'in':
        result = Array.isArray(condition.value) && condition.value.includes(fieldValue);
        break;
      case 'not_in':
        result = !(Array.isArray(condition.value) && condition.value.includes(fieldValue));
        break;
      case 'gt':
        result = typeof fieldValue === 'number' && fieldValue > condition.value;
        break;
      case 'lt':
        result = typeof fieldValue === 'number' && fieldValue < condition.value;
        break;
      case 'gte':
        result = typeof fieldValue === 'number' && fieldValue >= condition.value;
        break;
      case 'lte':
        result = typeof fieldValue === 'number' && fieldValue <= condition.value;
        break;
      case 'exists':
        result = fieldValue !== undefined && fieldValue !== null;
        break;
      case 'not_exists':
        result = fieldValue === undefined || fieldValue === null;
        break;
      case 'ip_range':
        // Simplified IP range check
        result = this.isIpInRange(fieldValue, condition.value);
        break;
      case 'cidr_match':
        result = this.isIpInCIDR(fieldValue, condition.value);
        break;
      default:
        result = false;
    }
    
    return condition.negate ? !result : result;
  }

  /**
   * Get nested field value from object
   */
  private getNestedField(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Calculate aggregate value for events
   */
  private calculateAggregate(events: CorrelationEvent[], aggregation?: AggregationConfig): number {
    if (!aggregation) return events.length;
    
    switch (aggregation.function) {
      case 'count':
        return events.length;
      case 'sum':
        return events.reduce((sum, e) => {
          const val = this.getNestedField(e, aggregation.field!);
          return sum + (typeof val === 'number' ? val : 0);
        }, 0);
      case 'avg':
        const sum = events.reduce((s, e) => {
          const val = this.getNestedField(e, aggregation.field!);
          return s + (typeof val === 'number' ? val : 0);
        }, 0);
        return events.length > 0 ? sum / events.length : 0;
      case 'max':
        return Math.max(...events.map(e => {
          const val = this.getNestedField(e, aggregation.field!);
          return typeof val === 'number' ? val : 0;
        }));
      case 'min':
        return Math.min(...events.map(e => {
          const val = this.getNestedField(e, aggregation.field!);
          return typeof val === 'number' ? val : Infinity;
        }));
      case 'unique_count':
        const uniqueValues = new Set(events.map(e => {
          const val = this.getNestedField(e, aggregation.field!);
          return JSON.stringify(val);
        }));
        return uniqueValues.size;
      default:
        return events.length;
    }
  }

  /**
   * Check if aggregate meets threshold
   */
  private checkThreshold(value: number, threshold: ThresholdConfig): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'gte': return value >= threshold.value;
      case 'eq': return value === threshold.value;
      case 'lt': return value < threshold.value;
      case 'lte': return value <= threshold.value;
      default: return false;
    }
  }

  /**
   * Generate correlation alert from matched events
   */
  private generateAlert(rule: CorrelationRule, events: CorrelationEvent[], aggregateValue: number): CorrelationAlert {
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Extract context
    const sourceIps = [...new Set(sortedEvents.map(e => e.source.ip))];
    const destinationIps = [...new Set(sortedEvents.map(e => 
      this.getNestedField(e.rawEvent, 'destination.ip') || ''
    ).filter(Boolean))];
    const affectedUsers = [...new Set(sortedEvents.map(e => 
      this.getNestedField(e.rawEvent, 'user.name') || ''
    ).filter(Boolean))];
    
    // Build timeline
    const timeline: TimelineEntry[] = sortedEvents.slice(0, 20).map(e => ({
      timestamp: e.timestamp,
      event: `${e.category} from ${e.source.ip}`,
      significance: e.severity === 'critical' ? 'critical' : 
                 e.severity === 'high' ? 'major' : 
                 e.severity === 'medium' ? 'minor' : 'informational',
      source: e.source.type
    }));

    // Calculate confidence based on rule's FP rate and event count
    const baseConfidence = 1 - rule.falsePositiveRate;
    const volumeBonus = Math.min(events.length / 20, 0.2); // Up to 20% bonus for high volume
    const confidence = Math.min(baseConfidence + volumeBonus, 0.99);

    // Calculate overall risk score
    const avgRiskScore = events.reduce((sum, e) => sum + e.riskScore, 0) / events.length;
    const riskScore = Math.round(avgRiskScore * (1 + confidence * 0.5));

    return {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      timestamp: new Date(),
      firstEventTime: sortedEvents[0]?.timestamp || new Date(),
      lastEventTime: sortedEvents[sortedEvents.length - 1]?.timestamp || new Date(),
      eventCount: events.length,
      correlatedEvents: sortedEvents,
      aggregatedValues: { [rule.aggregation?.function || 'count']: aggregateValue },
      riskScore,
      confidence,
      context: {
        sourceIps,
        destinationIps,
        affectedUsers,
        affectedAssets: [...new Set(sortedEvents.map(e => e.source.hostname))],
        timeline,
        relatedAlerts: []
      },
      mitreMapping: rule.mitreMapping,
      recommendedActions: rule.responseActions || [],
      status: 'new',
      notes: []
    };
  }

  /**
   * Enrich event with additional context
   */
  private async enrichEvent(event: CorrelationEvent): Promise<void> {
    // GeoIP enrichment would happen here via Elasticsearch or external API
    // ASN lookup would happen here
    // Threat intel lookup would happen here
    // User context enrichment would happen here
    
    // Placeholder for actual implementation
    event.enrichedData = {
      geoLocation: {
        country: 'Algeria',
        city: 'Algiers',
        coordinates: [3.0588, 36.7538]
      }
    };
  }

  /**
   * Calculate risk score for individual event
   */
  private calculateRiskScore(event: CorrelationEvent): number {
    let score = 0;
    
    // Base score from severity
    const severityScores: Record<Severity, number> = {
      critical: 40,
      high: 30,
      medium: 20,
      low: 10,
      informational: 5
    };
    score += severityScores[event.severity] || 15;
    
    // Threat intel bonus
    if (event.enrichedData?.threatIntel?.length) {
      const maxConfidence = Math.max(...event.enrichedData.threatIntel.map(t => t.confidence));
      score += (maxConfidence / 100) * 30;
    }
    
    // Historical anomaly bonus
    if (event.enrichedData?.historicalPattern?.isAnomaly) {
      score += event.enrichedData.historicalPattern.anomalyScore * 0.2;
    }
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * Get grouping key for event window
   */
  private getGroupKey(event: CorrelationEvent, groupByFields: string[]): string {
    if (groupByFields.length === 0) return 'default';
    
    return groupByFields.map(field => {
      const value = this.getNestedField(event.rawEvent, field);
      return String(value || 'unknown');
    }).join('|');
  }

  /**
   * Store event in active window
   */
  private storeInWindow(event: CorrelationEvent): void {
    // Events are stored when evaluating rules
    // This method can be used for additional storage needs
  }

  /**
   * Check if alert should be suppressed
   */
  private isSuppressed(rule: CorrelationRule, event: CorrelationEvent): boolean {
    if (!rule.suppression) return false;
    
    return rule.suppression.some(suppression => {
      const fieldValue = this.getNestedField(event.rawEvent, suppression.field);
      const matches = fieldValue === suppression.value;
      
      if (matches) {
        const suppressionKey = `${rule.id}_${suppression.field}_${suppression.value}`;
        const suppressedUntil = this.suppressionList.get(suppressionKey);
        
        if (suppressedUntil && suppressedUntil > new Date()) {
          return true;
        }
        
        // Set new suppression
        this.suppressionList.set(suppressionKey, new Date(Date.now() + suppression.duration * 1000));
      }
      
      return false;
    });
  }

  /**
   * Execute automated response actions
   */
  private async executeResponses(alert: CorrelationAlert): Promise<void> {
    const autoActions = alert.recommendedActions.filter(a => a.autoExecute);
    
    for (const action of autoActions) {
      try {
        this.emit('action:execute', { alert, action });
        
        switch (action.type) {
          case 'alert':
            // Alert is already generated
            break;
          case 'block_ip':
            this.emit('firewall:block', {
              ip: alert.context.sourceIps[0],
              duration: action.config.duration || 3600,
              reason: `SOC Alert: ${alert.ruleName}`
            });
            break;
          case 'isolate_endpoint':
            this.emit('endpoint:isolate', {
              ip: alert.context.sourceIps[0],
              immediate: action.config.immediate || false,
              reason: `SOC Alert: ${alert.ruleName}`
            });
            break;
          case 'notify_analyst':
            this.emit('notification:send', {
              channels: action.config.channels || ['slack'],
              alert: alert
            });
            break;
          case 'create_incident':
            this.emit('incident:create', {
              ...action.config,
              alertId: alert.id,
              details: alert
            });
            break;
          case 'run_playbook':
            this.emit('soar:playbook:execute', {
              playbook: action.config.playbook,
              alert: alert
            });
            break;
          case 'webhook':
            this.emit('webhook:send', {
              url: action.config.url,
              payload: alert
            });
            break;
        }
        
        this.emit('action:completed', { alert, action });
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
        this.emit('action:error', { alert, action, error });
      }
    }
  }

  /**
   * Cleanup old event windows
   */
  private cleanupOldWindows(): void {
    const now = Date.now();
    
    for (const [key, events] of this.activeWindows.entries()) {
      const oldestAllowed = now - (this.config.defaultWindowSize * 1000 * 10); // Keep up to 10x default window
      const filtered = events.filter(e => e.timestamp.getTime() > oldestAllowed);
      
      if (filtered.length === 0) {
        this.activeWindows.delete(key);
      } else {
        this.activeWindows.set(key, filtered);
      }
    }
    
    // Clean up expired suppressions
    for (const [key, until] of this.suppressionList.entries()) {
      if (until <= new Date()) {
        this.suppressionList.delete(key);
      }
    }
  }

  // IP address utilities
  private isIpInRange(ip: string, range: string): boolean {
    // Simplified IP range check - implement full logic as needed
    return ip.startsWith(range.split('-')[0]);
  }

  private isIpInCIDR(ip: string, cidr: string): boolean {
    // Simplified CIDR check - use proper library in production
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    // Implement proper CIDR matching logic
    return ip.startsWith(range);
  }
}

// Configuration interface
interface CorrelationEngineConfig {
  maxEventsPerWindow: number;
  defaultWindowSize: number;
  cleanupInterval: number;
  alertRetentionDays: number;
  enableMitreMapping: boolean;
  enableAutoResponse: boolean;
  maxConcurrentRules: number;
}

// Export singleton factory
let instance: SecurityCorrelationEngine | null = null;

export function getCorrelationEngine(esClient: Client, config?: Partial<CorrelationEngineConfig>): SecurityCorrelationEngine {
  if (!instance) {
    instance = new SecurityCorrelationEngine(esClient, config);
  }
  return instance;
}
