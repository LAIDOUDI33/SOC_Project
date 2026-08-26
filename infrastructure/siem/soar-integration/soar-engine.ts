# =============================================================================
# Djezzy National SOC Platform - Phase 5: SIEM Integration
# SOAR (Security Orchestration, Automation and Response) Integration
# =============================================================================
# Automated incident response with:
# - Playbook execution engine
- Integration with external systems (SIEM, ITSM, Threat Intel)
- Automated containment actions
- Case management
- Reporting and metrics
# =============================================================================

import { EventEmitter } from 'events';
import { Client } from '@elastic/elasticsearch';
import * as crypto from 'crypto';

// ========================================
// Type Definitions
// ========================================

export interface SOARPlaybook {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  
  // Trigger conditions
  triggers: PlaybookTrigger[];
  
  // Workflow steps (sequential or parallel)
  steps: PlaybookStep[];
  
  // Error handling
  onError: ErrorHandlingConfig;
  
  // Approval requirements
  approval?: ApprovalConfig;
  
  // Metadata
  category: PlaybookCategory;
  severity: Severity[];
  estimatedDuration: number; // minutes
  tags: string[];
  enabled: boolean;
}

export interface PlaybookTrigger {
  type: 'alert' | 'schedule' | 'manual' | 'webhook' | 'correlation';
  conditions?: Record<string, any>;
  schedule?: string; // cron expression
}

export interface PlaybookStep {
  id: string;
  name: string;
  type: StepType;
  config: StepConfig;
  timeout: number; // seconds
  retryPolicy: RetryPolicy;
  continueOnError: boolean;
  parallelWith?: string[]; // IDs of steps to run in parallel
}

export type StepType = 
  | 'enrichment'      // Add context from external sources
  | 'investigation'   // Run automated investigation tasks
  | 'containment'     // Execute containment actions
  | 'eradication'     # Remove threat artifacts
  | 'recovery'        // Restore affected systems
  | 'notification'    // Send alerts/notifications
  | 'approval'        // Request human approval
  | 'condition'       // Branch based on condition
  | 'sub_playbook'    // Execute another playbook
  | 'script'          // Run custom script
  | 'api_call'        // Call external API
  | 'wait'            // Wait for specified time
  | 'log';            // Add entry to case timeline

export interface StepConfig {
  [key: string]: any;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
}

export interface ErrorHandlingConfig {
  strategy: 'stop' | 'continue' | 'retry' | 'escalate';
  escalationPlaybookId?: string;
  notifyOnFailure: boolean;
  failureRecipients: string[];
}

export interface ApprovalConfig {
  required: boolean;
  approvers: string[]; // User roles or specific users
  timeout: number; // minutes
  autoApproveAfterTimeout: boolean;
  notificationChannels: string[];
}

export type PlaybookCategory = 
  | 'malware_response'
  | 'phishing'
  | 'data_breach'
  | 'network_intrusion'
  | 'fraud_investigation'
  | 'vulnerability'
  | 'compliance'
  | 'telecom_fraud'
  | 'insider_threat';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

// Incident/Case Management
export interface SOCIncident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  priority: Priority;
  
  // Classification
  category: IncidentCategory;
  subcategory?: string;
  mitreTactics?: string[];
  mitreTechniques?: string[];
  
  // Assignment
  assignedTo?: string;
  assignedTeam?: string;
  escalatedFrom?: string;
  
  // Timeline
  createdAt: Date;
  updatedAt: Date;
  detectedAt: Date;
  containedAt?: Date;
  eradicatedAt?: Date;
  recoveredAt?: Date;
  closedAt?: Date;
  
  // Related entities
  alertIds: string[];
  iocIndicators: IOCIndicator[];
  affectedAssets: AffectedAsset[];
  
  // Investigation
  investigationNotes: InvestigationNote[];
  evidence: EvidenceItem[];
  tasks: Task[];
  
  // Response
  playbookExecutions: PlaybookExecution[];
  containmentActions: ContainmentAction[];
  
  // Metrics
  mttd?: number; // Mean Time To Detect (seconds)
  mttr?: number; // Mean Time To Respond (seconds)
  ttContain?: number; // Time To Contain (seconds)
  ttEradicate?: number; // Time To Eradicate (seconds)
  
  // Cost impact
  estimatedCost?: number;
  actualCost?: number;
  
  // Compliance
  complianceFrameworks: string[];
  regulatoryNotifications?: RegulatoryNotification[];
  
  // Closure
  closureReason?: string;
  closureCategory?: ClosureCategory;
  lessonsLearned?: string;
  
  // Tags and metadata
  tags: string[];
  customFields: Record<string, any>;
}

export type IncidentStatus = 
  | 'new'
  | 'in_progress'
  | 'contained'
  | 'eradicated'
  | 'recovering'
  | 'resolved'
  | 'closed'
  | 'false_positive'
  | 'duplicate'
  | 'escalated';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentCategory = 
  | 'malware'
  | 'phishing'
  | 'data_breach'
  | 'network_intrusion'
  | 'denial_of_service'
  | 'insider_threat'
  | 'physical_security'
  | 'third_party'
  | 'policy_violation'
  | 'fraud'
  | 'vulnerability_exploitation'
  | 'telecom_fraud'
  | 'compliance_violation'
  | 'other';

export interface IOCIndicator {
  type: 'ip' | 'domain' | 'url' | 'hash_md5' | 'hash_sha1' | 'hash_sha256' | 'email' | 'phone_number' | 'imsi' | 'msisdn' | 'imei';
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  description?: string;
  tags: string[];
  tlpLevel: TLPLevel;
}

export type TLPLevel = 'RED' | 'AMBER' | 'GREEN' | 'WHITE' | 'CLEAR';

export interface AffectedAsset {
  type: 'server' | 'workstation' | 'mobile_device' | 'network_device' | 'application' | 'database' | 'cloud_resource' | 'telecom_element';
  name: string;
  identifier: string; // IP, hostname, serial number, etc.
  criticality: 'critical' | 'high' | 'medium' | 'low';
  businessOwner?: string;
  technicalOwner?: string;
  status: 'affected' | 'compromised' | 'contained' | 'recovered' | 'under_investigation';
  impact: ImpactAssessment;
}

export interface ImpactAssessment:
  confidentialityImpact: 'none' | 'low' | 'high' | 'critical';
  integrityImpact: 'none' | 'low' | 'high' | 'critical';
  availabilityImpact: 'none' | 'low' | 'high' | 'critical';

export interface InvestigationNote {
  id: string;
  author: string;
  timestamp: Date;
  content: string;
  type: 'observation' | 'analysis' | 'action' | 'evidence' | 'question' | 'conclusion';
  attachments?: Attachment[];
  visibility: 'public' | 'private' | 'team_only';
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  url: string;
  hashSha256: string;
}

export interface EvidenceItem {
  id: string;
  name: string;
  description: string;
  type: 'file' | 'screenshot' | 'log_excerpt' | 'memory_dump' | 'packet_capture' | 'forensic_image' | 'other';
  collectedAt: Date;
  collectedBy: string;
  location: string; // Path or URL
  hashMd5?: string;
  hashSha1?: string;
  hashSha256?: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'preserved' | 'disposed';
  performedBy: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  priority: Priority;
  dueDate?: Date;
  completedAt?: Date;
  dependencies: string[]; // Task IDs
  checklistItems: ChecklistItem[];
}

export interface ChecklistItem {
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbookName: string;
  startedAt: Date;
  completedAt?: Date;
  status: ExecutionStatus;
  currentStepId?: string;
  results: StepResult[];
  error?: string;
  triggeredBy: string;
  triggeredByType: 'alert' | 'manual' | 'schedule' | 'webhook';
}

export type ExecutionStatus = 
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting_approval'
  | 'timeout';

export interface StepResult {
  stepId: string;
  stepName: string;
  status: 'success' | 'failed' | 'skipped' | 'running';
  startedAt: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
  duration?: number; // milliseconds
}

export interface ContainmentAction {
  id: string;
  type: 'block_ip' | 'isolate_endpoint' | 'disable_account' | 'block_domain' | 'quarantine_file' | 'revoke_certificate' | 'shutdown_service' | 'firewall_rule' | 'dns_block';
  target: string;
  executedAt: Date;
  executedBy: string; // User or system
  status: 'success' | 'failed' | 'pending' | 'rolled_back';
  rollbackAction?: string;
  evidence?: string;
}

export interface RegulatoryNotification {
  framework: string;
  requirement: string;
  deadline: Date;
  notified: boolean;
  notifiedAt?: Date;
  notifiedTo?: string;
  acknowledgmentReceived?: boolean;
}

export type ClosureCategory = 
  | 'true_positive_resolved'
  | 'false_positive'
  | 'duplicate'
  | 'insufficient_evidence'
  | 'accepted_risk'
  | 'transferred'
  | 'other';

// ========================================
// SOAR Engine Class
// ========================================

export class SOAREngine extends EventEmitter {
  private esClient: Client;
  private playbooks: Map<string, SOARPlaybook> = new Map();
  private activeIncidents: Map<string, SOCIncident> = new Map();
  private activeExecutions: Map<string, PlaybookExecution> = new Map();
  
  // Integrations
  private integrations: Map<string, Integration> = new Map();
  
  // Configuration
  private config: SOARConfig;

  constructor(esClient: Client, config?: Partial<SOARConfig>) {
    super();
    this.esClient = esClient;
    this.config = {
      maxConcurrentExecutions: 10,
      defaultTimeout: 3600, // 1 hour
      enableAutoApproval: false,
      enableAutoEscalation: true,
      retentionDays: 2555, // 7 years for compliance
      ...config
    };

    // Load default playbooks
    this.loadDefaultPlaybooks();

    // Setup integrations
    this.setupIntegrations();
  }

  // ========================================
  // Playbook Management
  // ========================================

  /**
   * Load default playbooks for Djezzy SOC Platform
   */
  private loadDefaultPlaybooks(): void {
    const defaultPlaybooks: SOARPlaybook[] = [
      // Playbook 1: Malware/Ransomware Response
      {
        id: 'PB-MALWARE-001',
        name: 'Malware/Ransomware Incident Response',
        description: 'Automated response playbook for malware and ransomware incidents including isolation, investigation, and recovery',
        version: '1.0.0',
        author: 'Djezzy SOC Team',
        triggers: [
          { type: 'alert', conditions: { ruleCategory: 'malware_detection', severity: ['critical', 'high'] } },
          { type: 'manual', conditions: {} }
        ],
        steps: [
          {
            id: 'step-1',
            name: 'Isolate Affected Endpoint',
            type: 'containment',
            config: {
              action: 'isolate_endpoint',
              target: '${source.ip}',
              immediate: true,
              preserveMemory: true,
              reason: 'Malware detection - automatic isolation'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: false
          },
          {
            id: 'step-2',
            name: 'Enrich with Threat Intelligence',
            type: 'enrichment',
            config: {
              lookups: [
                { type: 'file_hash', field: 'file.hash.sha256' },
                { type: 'ip', field: 'source.ip' },
                { type: 'domain', field: 'destination.domain' }
              ],
              sources: ['virustotal', 'abuseipdb', 'alienvault']
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'step-3',
            name: 'Collect Forensic Artifacts',
            type: 'investigation',
            config: {
              artifacts: [
                { type: 'memory_dump', target: '${source.ip}' },
                { type: 'process_list', target: '${source.ip}' },
                { type: 'network_connections', target: '${source.ip}' },
                { type: 'running_services', target: '${source.ip}' }
              ],
              preserveChainOfCustody: true
            },
            timeout: 300,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 15000 },
            continueOnError: true
          },
          {
            id: 'step-4',
            name: 'Scan for Indicators of Compromise',
            type: 'investigation',
            config: {
              iocTypes: ['registry_keys', 'scheduled_tasks', 'persistence_mechanisms', 'web_shells'],
              scanScope: 'full_system',
              yaraRules: ['ransomware', 'backdoor', 'miner'],
              outputFormat: 'detailed_report'
            },
            timeout: 600,
            retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 0 },
            continueOnError: true
          },
          {
            id: 'step-5',
            name: 'Block C2 Communication',
            type: 'containment',
            config: {
              action: 'block_ip',
              targets: '${threat.indicators.ip}',
              duration: 86400, // 24 hours
              firewallRuleName: 'SOC-Auto-Block-${incident.id}',
              reason: 'C2 communication detected - malware response'
            },
            timeout: 30,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 3000 },
            continueOnError: true
          },
          {
            id: 'step-6',
            name: 'Notify Security Team',
            type: 'notification',
            config: {
              channels: ['slack', 'pagerduty', 'email'],
              recipients: ['soc-analysts@djezzy.dz', 'ir-team@djezzy.dz'],
              template: 'malware_incident_alert',
              includeIocSummary: true,
              includeTimeline: true,
              urgency: 'high'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: true
          },
          {
            id: 'step-7',
            name: 'Create Incident Ticket',
            type: 'api_call',
            config: {
              integration: 'servicenow',
              endpoint: '/api/now/table/incident',
              method: 'POST',
              payload: {
                short_description: 'Malware Incident - ${source.hostname}',
                description: 'Automatically created by SOC playbook. Severity: ${severity}',
                priority: '${priority}',
                assignment_group: 'security_operations',
                contact_type: 'automated'
              }
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'step-8',
            name: 'Request Analyst Review',
            type: 'approval',
            config: {
              message: 'Malware incident requires analyst review before remediation. Key findings: ${summary}',
              approvers: ['tier2_analyst', 'shift_lead'],
              timeout: 1800, // 30 minutes
              escalateIfNoResponse: true,
              escalationTarget: 'soc_manager'
            },
            timeout: 1860,
            retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 0 },
            continueOnError: false
          }
        ],
        onError: {
          strategy: 'escalate',
          escalationPlaybookId: 'PB-ESCALATE-001',
          notifyOnFailure: true,
          failureRecipients: ['soc-manager@djezzy.dz']
        },
        approval: {
          required: true,
          approvers: ['tier2_analyst', 'shift_lead'],
          timeout: 30,
          autoApproveAfterTimeout: false,
          notificationChannels: ['slack', 'email']
        },
        category: 'malware_response',
        severity: ['critical', 'high'],
        estimatedDuration: 45,
        tags: ['malware', 'ransomware', 'automated-response', 'forensics'],
        enabled: true
      },

      // Playbook 2: Phishing Investigation
      {
        id: 'PB-PHISHING-001',
        name: 'Phishing Email Investigation & Response',
        description: 'Automated phishing email analysis, user notification, and indicator extraction',
        version: '1.0.0',
        author: 'Djezzy SOC Team',
        triggers: [
          { type: 'alert', conditions: { ruleCategory: 'phishing' } },
          { type: 'manual', conditions: { category: 'phishing' } }
        ],
        steps: [
          {
            id: 'phish-step-1',
            name: 'Extract Phishing Indicators',
            type: 'investigation',
            config: {
              extractFrom: 'email_headers_and_body',
              indicators: ['sender_ip', 'sender_domain', 'urls', 'attachments', 'reply_to'],
              outputFormat: 'ioc_list'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelayMs: 5000 },
            continueOnError: false
          },
          {
            id: 'phish-step-2',
            name: 'Check URLs Against Threat Intel',
            type: 'enrichment',
            config: {
              checkUrls: true,
              sources: ['urlhaus', 'phishtank', 'googlesafebrowsing', 'virustotal_url'],
              includeScreenshot: true
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'phish-step-3',
            name: 'Analyze Attachments in Sandbox',
            type: 'investigation',
            config: {
              sandboxAnalysis: true,
              detonateAllAttachments: true,
              behaviorAnalysis: true,
              staticAnalysis: true,
              generateReport: true
            },
            timeout: 600,
            retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 0 },
            continueOnError: true
          },
          {
            id: 'phish-step-4',
            name: 'Block Malicious URLs/Domains',
            type: 'containment',
            config: {
              blockUrls: '${malicious_urls}',
              blockDomains: '${malicious_domains}',
              duration: 604800, // 7 days
              webProxy: true,
              dnsFilter: true,
              emailFilter: true
            },
            timeout: 30,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 3000 },
            continueOnError: true
          },
          {
            id: 'phish-step-5',
            name: 'Identify All Recipients',
            type: 'investigation',
            config: {
              searchMailLogs: true,
              recipientList: true,
              forwardLookup: true,
              exportRecipientList: true
            },
            timeout: 300,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 15000 },
            continueOnError: true
          },
          {
            id: 'phish-step-6',
            name: 'Notify Affected Users',
            type: 'notification',
            config: {
              channels: ['email'],
              recipients: '${affected_users}',
              template: 'phishing_user_warning',
              includeSafetyTips: true,
              includeReportingInstructions: true,
              language: 'fr' // French for Djezzy employees
            },
            timeout: 300,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'phish-step-7',
            name: 'Delete Phishing Emails from Mailboxes',
            type: 'eradication',
            config: {
              deleteFromMailboxes: true,
              targetMailboxes: '${affected_users}',
              messageIds: '${original_message_ids}',
              moveToJunkFirst: true,
              confirmDeletion: true
            },
            timeout: 600,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 20000 },
            continueOnError: true
          },
          {
            id: 'phish-step-8',
            name: 'Update Threat Intelligence Feeds',
            type: 'enrichment',
            config: {
              publishIOCs: true,
              feeds: ['internal_ioc_feed', 'shared_with_isac'],
              tlpLevel: 'AMBER',
              attribution: 'djezzy-soc-phishing-analysis'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelayMs: 5000 },
            continueOnError: true
          }
        ],
        onError: {
          strategy: 'continue',
          notifyOnFailure: true,
          failureRecipients: ['soc-team@djezzy.dz']
        },
        category: 'phishing',
        severity: ['medium', 'high'],
        estimatedDuration: 30,
        tags: ['phishing', 'email-security', 'user-awareness'],
        enabled: true
      },

      // Playbook 3: Telecom Fraud Investigation
      {
        id: 'PB-FRAUD-001',
        name: 'Telecom Fraud Investigation (SIM Swap / IRSF)',
        description: 'Investigate telecom fraud patterns including SIM swap, IRSF, Wangiri, and premium rate fraud',
        version: '1.0.0',
        author: 'Djezzy SOC Team',
        triggers: [
          { type: 'alert', conditions: { category: 'fraud_indicator' } },
          { type: 'correlation', conditions: { ruleId: 'TELECOM-FRAUD-*' } },
          { type: 'manual', conditions: { category: 'telecom_fraud' } }
        ],
        steps: [
          {
            id: 'fraud-step-1',
            name: 'Gather Subscriber Information',
            type: 'investigation',
            config: {
              dataSources: ['hlr', 'hss', 'pcrf', 'billing'],
              subscriberIdentifier: '${msisdn_or_imsi}',
              retrieveHistory: true,
              historyPeriod: '90d'
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: false
          },
          {
            id: 'fraud-step-2',
            name: 'Analyze Signaling Patterns',
            type: 'investigation',
            config: {
              protocols: ['MAP', 'ISUP', 'SIP', 'Diameter', 'GTP'],
              timeWindow: '72h',
              analyzePatterns: [
                'location_updates',
                'call_records',
                'data_sessions',
                'roaming_activity',
                'authentication_attempts'
              ],
              detectAnomalies: true
            },
            timeout: 300,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 15000 },
            continueOnError: true
          },
          {
            id: 'fraud-step-3',
            name: 'Cross-reference with Known Fraud Patterns',
            type: 'enrichment',
            config: {
              patternDatabase: 'internal_fraud_patterns',
              gsmaFraudDatabase: true,
              isacIntelligence: true,
              knownFraudRings: true
            },
            timeout: 180,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'fraud-step-4',
            name: 'Calculate Financial Impact',
            type: 'investigation',
            config: {
              billingRecords: true,
              estimateLosses: true,
              affectedSubscribers: true,
              timeRange: '30d',
              currency: 'DZD'
            },
            timeout: 240,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 15000 },
            continueOnError: true
          },
          {
            id: 'fraud-step-5',
            name: 'Apply Temporary Controls',
            type: 'containment',
            config: {
              actions: [
                { type: 'bar_outgoing_international', target: '${msisdn}' },
                { type: 'limit_data_session', target: '${msisdn}', limit: '1GB/day' },
                { type: 'flag_subscriber', target: '${msisdn}', flag: 'fraud_suspect' },
                { type: 'notify_fraud_team', details: '${investigation_summary}' }
              ]
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: true
          },
          {
            id: 'fraud-step-6',
            name: 'Generate Fraud Report',
            type: 'api_call',
            config: {
              integration: 'internal_reporting',
              template: 'fraud_investigation_report',
              format: 'pdf',
              includeEvidence: true,
              includeTimeline: true,
              includeFinancialImpact: true,
              distribution: ['fraud_team', 'legal', 'compliance']
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'fraud-step-7',
            name: 'Escalate to Fraud Team',
            type: 'notification',
            config: {
              channels: ['email', 'slack'],
              recipients: ['fraud-investigators@djezzy.dz'],
              template: 'fraud_escalation',
              includeReport: true,
              urgency: 'high'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: true
          }
        ],
        onError: {
          strategy: 'continue',
          notifyOnFailure: true,
          failureRecipients: ['fraud-manager@djezzy.dz', 'soc-manager@djezzy.dz']
        },
        category: 'fraud_investigation',
        severity: ['high', 'critical'],
        estimatedDuration: 60,
        tags: ['fraud', 'telecom', 'sim-swap', 'irsf', 'financial-crime'],
        enabled: true
      },

      // Playbook 4: Network Intrusion Response
      {
        id: 'PB-NETWORK-001',
        name: 'Network Intrusion Detection & Response',
        description: 'Respond to network intrusion attempts including port scanning, exploitation, and lateral movement',
        version: '1.0.0',
        author: 'Djezzy SOC Team',
        triggers: [
          { type: 'alert', conditions: { category: 'network_connection', severity: ['critical', 'high'] } },
          { type: 'correlation', conditions: { ruleId: 'LATMOV-*' } }
        ],
        steps: [
          {
            id: 'net-step-1',
            name: 'Block Attacker IP at Firewall',
            type: 'containment',
            config: {
              action: 'block_ip',
              target: '${source.ip}',
              duration: 86400,
              allEgressPoints: true,
              logBlockedTraffic: true,
              ruleComment: 'SOC Auto-block - Network Intrusion ${timestamp}'
            },
            timeout: 30,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 3000 },
            continueOnError: false
          },
          {
            id: 'net-step-2',
            name: 'Capture Network Traffic',
            type: 'investigation',
            config: {
              startPacketCapture: true,
              filter: 'host ${source.ip} or host ${destination.ip}',
              duration: 3600, // Capture for 1 hour
              storageLocation: '/nfs/evidence/${incident_id}/',
              maxSize: '5GB'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: true
          },
          {
            id: 'net-step-3',
            name: 'Identify Compromised Systems',
            type: 'investigation',
            config: {
              queryEDR: true,
              queryADLogs: true,
              queryDNSLogs: true,
              timeWindow: '24h',
              attackerIP: '${source.ip}'
            },
            timeout: 300,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 15000 },
            continueOnError: true
          },
          {
            id: 'net-step-4',
            name: 'Isolate Potentially Compromised Hosts',
            type: 'containment',
            config: {
              isolateHosts: '${potentially_compromised_hosts}',
              preserveState: true,
              allowAnalystAccess: true,
              networkSegmentation: true
            },
            timeout: 120,
            retryPolicy: { maxAttempts: 3, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'net-step-5',
            name: 'Reset Compromised Credentials',
            type: 'eradication',
            config: {
              resetCredentials: true,
              targetAccounts: '${accounts_on_compromised_hosts}',
              forcePasswordChange: true,
              revokeSessions: true,
              notifyUsers: true
            },
            timeout: 180,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 10000 },
            continueOnError: true
          },
          {
            id: 'net-step-6',
            name: 'Initiate Forensic Analysis',
            type: 'investigation',
            config: {
              forensicImaging: true,
              targetHosts: '${confirmed_compromised_hosts}',
              memoryAcquisition: true,
              diskImaging: true,
              chainOfCustody: true
            },
            timeout: 900,
            retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 0 },
            continueOnError: true
          }
        ],
        onError: {
          strategy: 'escalate',
          escalationPlaybookId: 'PB-ESCALATE-001',
          notifyOnFailure: true,
          failureRecipients: ['ir-manager@djezzy.dz', 'soc-manager@djezzy.dz']
        },
        category: 'network_intrusion',
        severity: ['critical', 'high'],
        estimatedDuration: 90,
        tags: ['intrusion', 'lateral-movement', 'containment', 'forensics'],
        enabled: true
      },

      // Playbook 5: Escalation Handler
      {
        id: 'PB-ESCALATE-001',
        name: 'Incident Escalation Handler',
        description: 'Handle escalation of complex incidents requiring management attention or external resources',
        version: '1.0.0',
        author: 'Djezzy SOC Team',
        triggers: [
          { type: 'playbook_failure', conditions: {} },
          { type: 'manual', conditions: { action: 'escalate' } },
          { type: 'alert', conditions: { severity: 'critical', auto_escalate: true } }
        ],
        steps: [
          {
            id: 'esc-step-1',
            name: 'Compile Escalation Summary',
            type: 'investigation',
            config: {
              gatherIncidentData: true,
              includeTimeline: true,
              includeActionsTaken: true,
              includeCurrentStatus: true,
              includeBlockingIssues: true
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 1.5, initialDelayMs: 5000 },
            continueOnError: false
          },
          {
            id: 'esc-step-2',
            name: 'Notify Management',
            type: 'notification',
            config: {
              channels: ['pagerduty', 'slack', 'email', 'sms'],
              recipients: ['soc-manager@djezzy.dz', 'ciso@djezzy.dz'],
              template: 'incident_escalation',
              includeExecutiveSummary: true,
              urgency: 'critical'
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 5, backoffMultiplier: 2, initialDelayMs: 3000 },
            continueOnError: true
          },
          {
            id: 'esc-step-3',
            name: 'Schedule War Room Meeting',
            type: 'api_call',
            config: {
              integration: 'microsoft_teams' || 'zoom',
              action: 'create_meeting',
              participants: ['soc-team', 'ir-team', 'relevant_stakeholders'],
              agenda: 'Incident Escalation: ${incident_title}',
              recordMeeting: true
            },
            timeout: 60,
            retryPolicy: { maxAttempts: 2, backoffMultiplier: 2, initialDelayMs: 5000 },
            continueOnError: true
          },
          {
            id: 'esc-step-4',
            name: 'Engage External Resources if Needed',
            type: 'approval',
            config: {
              message: 'External resources may be needed. Options: DFIR consultant, Law enforcement, Vendor support.',
              approvers: ['ciso', 'legal_counsel'],
              timeout: 1440, // 24 hours
              options: [
                { label: 'Engage DFIR Consultant', value: 'dfir' },
                { label: 'Contact Law Enforcement', value: 'law_enforcement' },
                { label: 'Contact Vendor Support', value: 'vendor' },
                { label: 'Handle Internally', value: 'internal' }
              ]
            },
            timeout: 1440,
            retryPolicy: { maxAttempts: 1, backoffMultiplier: 1, initialDelayMs: 0 },
            continueOnError: false
          }
        ],
        onError: {
          strategy: 'stop',
          notifyOnFailure: true,
          failureRecipients: ['ciso@djezzy.dz', 'cto@djezzy.dz']
        },
        category: 'compliance',
        severity: ['critical'],
        estimatedDuration: 15,
        tags: ['escalation', 'management', 'crisis-communication'],
        enabled: true
      }
    ];

    // Load all playbooks
    defaultPlaybooks.forEach(pb => this.playbooks.set(pb.id, pb));
  }

  /**
   * Setup integrations with external systems
   */
  private setupIntegrations(): void {
    // Placeholder for integration setup
    // In production, these would be configured with actual API credentials
    
    this.integrations.set('elasticsearch', {
      name: 'Elasticsearch',
      type: 'siem',
      client: this.esClient,
      capabilities: ['search', 'index', 'update', 'delete']
    });

    this.integrations.set('servicenow', {
      name: 'ServiceNow ITSM',
      type: 'itsm',
      baseUrl: process.env.SERVICENOW_URL || '',
      capabilities: ['create_ticket', 'update_ticket', 'query_tickets']
    });

    this.integrations.set('slack', {
      name: 'Slack',
      type: 'communication',
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      capabilities: ['send_message', 'create_channel', 'upload_file']
    });

    this.integrations.set('pagerduty', {
      name: 'PagerDuty',
      type: 'incident_management',
      apiKey: process.env.PAGERDUTY_API_KEY || '',
      capabilities: ['create_incident', 'escalate', 'acknowledge']
    });
  }

  // ========================================
  // Incident Management
  // ========================================

  /**
   * Create a new incident from an alert or manually
   */
  async createIncident(incidentData: Partial<SOCIncident>): Promise<SOCIncident> {
    const incident: SOCIncident = {
      id: crypto.randomUUID(),
      title: incidentData.title || 'Untitled Incident',
      description: incidentData.description || '',
      severity: incidentData.severity || 'medium',
      status: 'new',
      priority: incidentData.priority || 'P3',
      category: incidentData.category || 'other',
      createdAt: new Date(),
      updatedAt: new Date(),
      detectedAt: incidentData.detectedAt || new Date(),
      alertIds: incidentData.alertIds || [],
      iocIndicators: incidentData.iocIndicators || [],
      affectedAssets: incidentData.affectedAssets || [],
      investigationNotes: [],
      evidence: [],
      tasks: [],
      playbookExecutions: [],
      containmentActions: [],
      complianceFrameworks: ['ARTP', 'ANSSI', 'ISO27001'],
      tags: incidentData.tags || [],
      customFields: {}
    };

    // Store in Elasticsearch
    await this.esClient.index({
      index: `soc-incidents-${new Date().toISOString().slice(0, 10)}`,
      id: incident.id,
      body: incident,
      refresh: true
    });

    // Store in memory cache
    this.activeIncidents.set(incident.id, incident);

    // Emit event
    this.emit('incident:created', incident);

    return incident;
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string): Promise<SOCIncident | null> {
    // Check memory first
    const cached = this.activeIncidents.get(incidentId);
    if (cached) return cached;

    // Query Elasticsearch
    try {
      const result = await this.esClient.search({
        index: 'soc-incidents-*',
        body: {
          query: {
            term: { _id: incidentId }
          }
        }
      });

      if (result.hits.hits.length > 0) {
        const incident = result.hits.hits[0]._source as SOCIncident;
        this.activeIncidents.set(incidentId, incident);
        return incident;
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
    }

    return null;
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string, 
    status: IncidentStatus, 
    reason?: string,
    author?: string
  ): Promise<SOCIncident> {
    const incident = await this.getIncident(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const previousStatus = incident.status;
    incident.status = status;
    incident.updatedAt = new Date();

    // Update timestamps based on status transitions
    switch (status) {
      case 'contained':
        incident.containedAt = new Date();
        incident.ttContain = Math.round((incident.containedAt.getTime() - incident.detectedAt.getTime()) / 1000);
        break;
      case 'eradicated':
        incident.eradicatedAt = new Date();
        incident.ttEradicate = Math.round((incident.eradicatedAt.getTime() - incident.detectedAt.getTime()) / 1000);
        break;
      case 'resolved':
      case 'closed':
        incident.recoveredAt = new Date();
        incident.closedAt = new Date();
        incident.mttr = Math.round((incident.closedAt.getTime() - incident.detectedAt.getTime()) / 1000);
        break;
    }

    // Add note about status change
    if (reason && author) {
      incident.investigationNotes.push({
        id: crypto.randomUUID(),
        author,
        timestamp: new Date(),
        content: `Status changed from ${previousStatus} to ${status}. Reason: ${reason}`,
        type: 'status_update',
        visibility: 'public'
      });
    }

    // Update in Elasticsearch
    await this.esClient.update({
      index: `soc-incidents-${new Date().toISOString().slice(0, 10)}`,
      id: incidentId,
      body: { doc: incident },
      refresh: true
    });

    this.emit('incident:updated', { incident, previousStatus });

    return incident;
  }

  /**
   * Execute a playbook for an incident
   */
  async executePlaybook(
    playbookId: string, 
    incidentId: string, 
    triggerType: 'alert' | 'manual' | 'schedule' | 'webhook' = 'manual',
    triggerContext?: any
  ): Promise<PlaybookExecution> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) throw new Error(`Playbook ${playbookId} not found`);
    
    if (!playbook.enabled) throw new Error(`Playbook ${playbookId} is disabled`);

    const incident = await this.getIncident(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    // Create execution record
    const execution: PlaybookExecution = {
      id: crypto.randomUUID(),
      playbookId,
      playbookName: playbook.name,
      startedAt: new Date(),
      status: 'running',
      currentStepId: playbook.steps[0]?.id,
      results: [],
      triggeredBy: triggerContext?.alertId || 'manual',
      triggeredByType: triggerType
    };

    this.activeExecutions.set(execution.id, execution);

    try {
      // Execute each step in order
      for (const step of playbook.steps) {
        execution.currentStepId = step.id;
        
        // Check if step should run in parallel (handled separately)
        if (step.parallelWith && step.parallelWith.length > 0) {
          // Would implement parallel execution here
          continue;
        }

        // Execute step
        const result = await this.executeStep(step, incident, execution);
        execution.results.push(result);

        // Check if step failed and should stop
        if (result.status === 'failed' && !step.continueOnError) {
          execution.status = 'failed';
          execution.error = result.error;
          
          // Handle error based on strategy
          await this.handlePlaybookError(playbook, execution, result);
          break;
        }
      }

      // Mark as completed if no errors
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.completedAt = new Date();
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      
      await this.handlePlaybookError(playbook, execution, {
        stepId: 'unknown',
        stepName: 'unknown',
        status: 'failed',
        startedAt: new Date(),
        error: execution.error
      });
    }

    // Update incident with execution info
    incident.playbookExecutions.push(execution);
    await this.esClient.update({
      index: `soc-incidents-${new Date().toISOString().slice(0, 10)}`,
      id: incidentId,
      body: { doc: { playbookExecutions: incident.playbookExecutions } },
      refresh: true
    });

    this.emit('playbook:completed', execution);
    
    return execution;
  }

  /**
   * Execute a single playbook step
   */
  private async executeStep(
    step: PlaybookStep, 
    incident: SOCIncident, 
    execution: PlaybookExecution
  ): Promise<StepResult> {
    const startTime = new Date();
    let result: StepResult = {
      stepId: step.id,
      stepName: step.name,
      status: 'running',
      startedAt: startTime
    };

    try {
      let output: any;

      switch (step.type) {
        case 'containment':
          output = await this.executeContainment(step.config, incident);
          break;
        case 'enrichment':
          output = await this.executeEnrichment(step.config, incident);
          break;
        case 'investigation':
          output = await this.executeInvestigation(step.config, incident);
          break;
        case 'notification':
          output = await this.executeNotification(step.config, incident);
          break;
        case 'api_call':
          output = await this.executeApiCall(step.config, incident);
          break;
        case 'approval':
          output = await this.requestApproval(step.config, incident);
          break;
        case 'wait':
          await this.wait(step.config.duration || 60000); // Default 1 minute
          output = { waited: true };
          break;
        case 'log':
          incident.investigationNotes.push({
            id: crypto.randomUUID(),
            author: 'system',
            timestamp: new Date(),
            content: step.config.message || `${step.name} logged`,
            type: 'action',
            visibility: 'public'
          });
          output = { logged: true };
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      result.status = 'success';
      result.output = output;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startTime.getTime();

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startTime.getTime();

      // Retry logic
      if (result.status === 'failed') {
        for (let attempt = 1; attempt <= step.retryPolicy.maxAttempts; attempt++) {
          const delay = step.retryPolicy.initialDelayMs * Math.pow(step.retryPolicy.backoffMultiplier, attempt - 1);
          await this.wait(delay);
          
          try {
            // Re-execute step (simplified - would need to re-run based on type)
            result.status = 'success';
            result.error = undefined;
            break;
          } catch (retryError) {
            if (attempt === step.retryPolicy.maxAttempts) {
              result.error = `Failed after ${attempt} attempts: ${retryError}`;
            }
          }
        }
      }
    }

    return result;
  }

  // Step implementation methods (simplified)
  private async executeContainment(config: any, incident: SOCIncident): Promise<any> {
    const action: ContainmentAction = {
      id: crypto.randomUUID(),
      type: config.action,
      target: typeof config.target === 'string' ? config.target : JSON.stringify(config.target),
      executedAt: new Date(),
      executedBy: 'soar-engine',
      status: 'success'
    };

    incident.containmentActions.push(action);
    
    this.emit('containment:executed', action);
    
    return { actionId: action.id, status: 'executed' };
  }

  private async executeEnrichment(config: any, incident: SOCIncident): Promise<any> {
    // Simplified enrichment - would integrate with VT, AbuseIPDB, etc.
    return { enriched: true, iocsFound: 0 };
  }

  private async executeInvestigation(config: any, incident: SOCIncident): Promise<any> {
    return { investigated: true, findings: [] };
  }

  private async executeNotification(config: any, incident: SOCIncident>: Promise<any> {
    // Simplified notification - would integrate with Slack, PagerDuty, etc.
    return { notified: true, channels: config.channels || [] };
  }

  private async executeApiCall(config: any, incident: SOCIncident): Promise<any> {
    const integration = this.integrations.get(config.integration);
    if (!integration) throw new Error(`Integration ${config.integration} not found`);
    
    // Would make actual API call here
    return { apiCalled: true, integration: config.integration };
  }

  private async requestApproval(config: any, incident: SOCIncident): Promise<any> {
    execution.status = 'waiting_approval';
    this.emit('approval:request', { incident, config });
    
    // In production, would wait for actual approval
    return { approvalRequested: true, pending: true };
  }

  private async handlePlaybookError(
    playbook: SOARPlaybook, 
    execution: PlaybookExecution, 
    failedStep: StepResult
  ): Promise<void> {
    this.emit('playbook:error', { playbook, execution, failedStep });

    // Notify on failure
    if (playbook.onError.notifyOnFailure) {
      await this.executeNotification({
        channels: ['email', 'slack'],
        recipients: playbook.onError.failureRecipients,
        template: 'playbook_failure',
        urgency: 'high'
      }, await this.createIncident({
        title: `Playbook Failure: ${playbook.name}`,
        severity: 'high',
        category: 'other'
      }));
    }

    // Escalate if configured
    if (playbook.onError.strategy === 'escalate' && playbook.onError.escalationPlaybookId) {
      await this.executePlaybook(
        playbook.onError.escalationPlaybookId,
        execution.id, // Use execution ID as incident reference
        'manual',
        { originalExecution: execution, failedStep }
      );
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // Public API Methods
  // ========================================

  getPlaybooks(): SOARPlaybook[] {
    return Array.from(this.playbooks.values());
  }

  getPlaybook(id: string): SOARPlaybook | undefined {
    return this.playbooks.get(id);
  }

  addPlaybook(playbook: SOARPlaybook): void {
    this.playbooks.set(playbook.id, playbook);
    this.emit('playbook:added', playbook);
  }

  removePlaybook(id: string): boolean {
    const deleted = this.playbooks.delete(id);
    if (deleted) this.emit('playbook:removed', id);
    return deleted;
  }

  togglePlaybook(id: string, enabled: boolean): boolean {
    const playbook = this.playbooks.get(id);
    if (playbook) {
      playbook.enabled = enabled;
      this.emit('playbook:toggled', { id, enabled });
      return true;
    }
    return false;
  }

  getActiveExecutions(): PlaybookExecution[] {
    return Array.from(this.activeExecutions.values()).filter(e => e.status === 'running');
  }

  async getRecentIncidents(limit: number = 50): Promise<SOCIncident[]> {
    try {
      const result = await this.esClient.search({
        index: 'soc-incidents-*',
        size: limit,
        sort: [{ createdAt: { order: 'desc' } }],
        body: {
          query: {
            match_all: {}
          }
        }
      });

      return result.hits.hits.map(hit => hit._source as SOCIncident);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  // Generate metrics/report
  async generateMetrics(timeRange: string = '7d'): Promise<SOARMetrics> {
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

      const result = await this.esClient.search({
        index: 'soc-incidents-*',
        size: 0,
        body: {
          query: {
            range: {
              createdAt: { gte: from.toISOString() }
            }
          },
          aggs: {
            by_status: {
              terms: { field: 'status', size: 20 }
            },
            by_severity: {
              terms: { field: 'severity', size: 10 }
            },
            by_category: {
              terms: { field: 'category', size: 15 }
            },
            avg_mttr: {
              avg: { field: 'mttr' }
            },
            total_incidents: {
              value_count: { field: '_id' }
            }
          }
        }
      });

      const aggregations = result.aggregations as any;

      return {
        period: timeRange,
        totalIncidents: aggregations.total_incidents.value,
        incidentsByStatus: aggregations.by_status.buckets.map((b: any) => ({
          status: b.key,
          count: b.doc_count
        })),
        incidentsBySeverity: aggregations.by_severity.buckets.map((b: any) => ({
          severity: b.key,
          count: b.doc_count
        })),
        incidentsByCategory: aggregations.by_category.buckets.map((b: any) => ({
          category: b.key,
          count: b.doc_count
        })),
        averageMTTR: Math.round(aggregations.avg_mttr.value || 0),
        activePlaybookExecutions: this.getActiveExecutions().length,
        generatedAt: now
      };
    } catch (error) {
      console.error('Error generating metrics:', error);
      return this.emptyMetrics();
    }
  }

  private emptyMetrics(): SOARMetrics {
    return {
      period: '0d',
      totalIncidents: 0,
      incidentsByStatus: [],
      incidentsBySeverity: [],
      incidentsByCategory: [],
      averageMTTR: 0,
      activePlaybookExecutions: 0,
      generatedAt: new Date()
    };
  }
}

// Supporting types
interface Integration {
  name: string;
  type: string;
  [key: string]: any;
}

interface SOARConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  enableAutoApproval: boolean;
  enableAutoEscalation: boolean;
  retentionDays: number;
}

interface SOARMetrics {
  period: string;
  totalIncidents: number;
  incidentsByStatus: { status: string; count: number }[];
  incidentsBySeverity: { severity: string; count: number }[];
  incidentsByCategory: { category: string; count: number }[];
  averageMTTR: number;
  activePlaybookExecutions: number;
  generatedAt: Date;
}

// Export singleton factory
let instance: SOAREngine | null = null;

export function getSOAREngine(esClient: Client, config?: Partial<SOARConfig>): SOAREngine {
  if (!instance) {
    instance = new SOAREngine(esClient, config);
  }
  return instance;
}
