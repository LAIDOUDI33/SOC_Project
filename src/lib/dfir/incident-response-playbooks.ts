/**
 * National SOC Platform - Incident Response Playbooks
 * 
 * Automated incident response playbooks for:
 * - Ransomware response
 * - Data breach containment
 * - DDoS mitigation
 * - Insider threat investigation
 * - APT campaign response
 * - Telecom-specific: SS7 attack, SIM swap fraud
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 * @module dfir/incident-response-playbooks
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface Playbook {
  id: string;
  name: string;
  version: string;
  category: IncidentCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Metadata
  description: string;
  author: string;
  lastUpdated: Date;
  estimatedDuration: string;
  requiredRoles: string[];
  
  // Triggers
  triggers: PlaybookTrigger[];
  
  // Phases
  phases: PlaybookPhase[];
  
  // Configuration
  autoExecute: boolean;
  approvalRequired: boolean;
  notificationRules: NotificationRule[];
  
  // Metrics
  averageExecutionTime?: number; // minutes
  successRate?: number; // percentage
  lastExecuted?: Date;
}

export type IncidentCategory = 
  | 'ransomware'
  | 'data_breach'
  | 'ddos'
  | 'insider_threat'
  | 'apt'
  | 'malware'
  | 'phishing'
  | 'credential_compromise'
  | 'ss7_attack'
  | 'sim_swap_fraud'
  | 'voip_fraud'
  | 'telecom_fraud'
  | 'compliance_violation';

export interface PlaybookTrigger {
  type: 'alert' | 'ioc_match' | 'manual' | 'scheduled' | 'correlated';
  conditions: TriggerCondition[];
  matchLogic: 'all' | 'any';
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range' | 'regex';
  value: any;
  source?: string;
}

export interface PlaybookPhase {
  id: string;
  name: string;
  order: number;
  description: string;
  duration: string; // estimated
  
  tasks: PlaybookTask[];
  
  // Gates
  approvalGate?: boolean;
  rollbackAvailable?: boolean;
  
  // Status tracking
  status?: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface PlaybookTask {
  id: string;
  title: string;
  description: string;
  order: number;
  
  // Execution
  type: TaskType;
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
  executor?: string; // Role or specific person
  
  // Actions
  actions: TaskAction[];
  
  // Validation
  expectedOutcome?: string;
  validationCriteria?: string[];
  failureActions?: string[];
  
  // Dependencies
  dependsOnTasks?: string[];
  
  // Evidence
  evidenceRequired?: boolean;
  evidenceType?: string[];
  
  // Status
  status?: TaskStatus;
  assignedTo?: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
  notes?: string;
}

export type TaskType = 
  | 'detection'
  | 'analysis'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'communication'
  | 'documentation'
  | 'escalation'
  | 'verification';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskAction {
  type: 'api_call' | 'script' | 'manual_step' | 'notification' | 'approval' | 'evidence_collection';
  description: string;
  target?: string;
  parameters?: Record<string, any>;
  timeout?: number; // seconds
}

export interface TaskResult {
  success: boolean;
  output?: string;
  artifacts?: string[];
  timestamp: Date;
  executedBy: string;
  error?: string;
}

export interface NotificationRule {
  event: 'playbook_started' | 'phase_completed' | 'task_failed' | 'playbook_completed' | 'escalation_required';
  channels: ('email' | 'sms' | 'slack' | 'pagerduty')[];
  recipients: string[];
  template?: string;
  includeDetails: boolean;
}

// ============================================================
// PLAYBOOK EXECUTION ENGINE
// ============================================================

export class PlaybookEngine {
  private playbooks: Map<string, Playbook> = new Map();
  private executions: Map<string, PlaybookExecution> = new Map();
  private config: PlaybookConfig;

  constructor(config?: Partial<PlaybookConfig>) {
    this.config = { ...DEFAULT_PLAYBOOK_CONFIG, ...config };
    this.loadDefaultPlaybooks();
  }

  /**
   * Execute a playbook for an incident
   */
  async executePlaybook(
    playbookId: string,
    incidentId: string,
    context: ExecutionContext,
    executor: string
  ): Promise<PlaybookExecution> {
    const playbook = this.getPlaybook(playbookId);
    
    const execution: PlaybookExecution = {
      id: this.generateId('PBE'),
      playbookId,
      playbookName: playbook.name,
      incidentId,
      status: 'running',
      startedAt: new Date(),
      executor,
      context,
      currentPhase: 0,
      phases: playbook.phases.map(p => ({
        ...p,
        status: 'pending',
        tasks: p.tasks.map(t => ({ ...t, status: 'pending' })),
      })),
      timeline: [{
        timestamp: new Date(),
        action: 'playbook_started',
        details: `Playbook ${playbook.name} initiated by ${executor}`,
        actor: executor,
      }],
    };

    this.executions.set(execution.id, execution);

    try {
      // Execute each phase sequentially
      for (let phaseIndex = 0; phaseIndex < execution.phases.length; phaseIndex++) {
        const phase = execution.phases[phaseIndex];
        
        // Check if phase needs approval
        if (phase.approvalGate && playbook.approvalRequired) {
          phase.status = 'awaiting_approval';
          await this.waitForApproval(execution.id, phaseIndex);
        }

        phase.status = 'in_progress';
        phase.startedAt = new Date();
        execution.currentPhase = phaseIndex;

        this.addTimelineEntry(execution.id, `phase_started`, `Phase ${phase.name} started`);

        // Execute tasks in phase
        for (const task of phase.tasks) {
          if (task.status === 'skipped') continue;

          await this.executeTask(execution, phaseIndex, task, context);
        }

        phase.status = 'completed';
        phase.completedAt = new Date();

        this.addTimelineEntry(execution.id, `phase_completed`, `Phase ${phase.name} completed`);
        
        // Send notifications
        await this.sendNotifications(playbook, 'phase_completed', execution);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      
      this.addTimelineEntry(execution.id, 'playbook_completed', `Playbook completed successfully`);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.addTimelineEntry(execution.id, 'playbook_failed', `Playbook failed: ${execution.error}`);
      await this.sendNotifications(playbook, 'task_failed', execution);
    }

    return execution;
  }

  /**
   * Get available playbooks for incident type
   */
  getPlaybooksForIncident(category: IncidentCategory, severity: Playbook['severity']): Playbook[] {
    return Array.from(this.playbooks.values())
      .filter(p => p.category === category && p.severity === severity)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  /**
   * Auto-match playbook based on alerts/IOCs
   */
  async autoMatchPlaybook(alerts: AlertData[]): Promise<PlaybookMatch[]> {
    const matches: PlaybookMatch[] = [];

    for (const playbook of this.playbooks.values()) {
      let matchScore = 0;
      const matchedTriggers: string[] = [];

      for (const trigger of playbook.triggers) {
        for (const condition of trigger.conditions) {
          const alertMatches = alerts.filter(alert =>
            this.evaluateCondition(condition, alert)
          );

          if ((trigger.matchLogic === 'all' && alertMatches.length === alerts.length) ||
              (trigger.matchLogic === 'any' && alertMatches.length > 0)) {
            matchScore += 20;
            matchedTriggers.push(`${trigger.type}:${condition.field}`);
          }
        }
      }

      if (matchScore >= 40) { // Minimum threshold
        matches.push({
          playbook,
          matchScore: Math.min(100, matchScore),
          matchedTriggers,
          recommendation: matchScore > 80 ? 'highly_recommended' : matchScore > 60 ? 'recommended' : 'optional',
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async executeTask(
    execution: PlaybookExecution,
    phaseIndex: number,
    task: PlaybookTask,
    context: ExecutionContext
  ): Promise<void> {
    task.status = 'in_progress';
    task.startedAt = new Date();

    this.addTimelineEntry(
      execution.id,
      'task_started',
      `Task "${task.title}" started in phase ${execution.phases[phaseIndex].name}`
    );

    try {
      switch (task.automationLevel) {
        case 'fully_automated':
          await this.executeAutomatedTask(task, context);
          break;
        case 'semi_automated':
          await this.executeSemiAutomatedTask(task, context);
          break;
        case 'manual':
          task.status = 'waiting_manual';
          await this.waitForManualCompletion(execution.id, phaseIndex, task.id);
          break;
      }

      task.status = 'completed';
      task.completedAt = new Date();

      this.addTimelineEntry(execution.id, 'task_completed', `Task "${task.title}" completed`);

    } catch (error) {
      task.status = 'failed';
      task.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        executedBy: 'system',
      };

      this.addTimelineEntry(execution.id, 'task_failed', `Task "${task.title}" failed: ${task.result.error}`);

      // Check for failure actions
      if (task.failureActions && task.failureActions.length > 0) {
        this.addTimelineEntry(
          execution.id,
          'executing_failure_actions',
          `Executing ${task.failureActions.length} failure actions`
        );
      }

      throw error; // Propagate to fail the phase/playbook
    }
  }

  private async executeAutomatedTask(task: PlaybookTask, context: ExecutionContext): Promise<void> {
    for (const action of task.actions) {
      switch (action.type) {
        case 'api_call':
          // Simulate API call
          console.log(`[PlaybookEngine] Executing API call: ${action.target}`);
          await this.delay(action.timeout || 5000);
          break;

        case 'script':
          console.log(`[PlaybookEngine] Running script: ${action.description}`);
          await this.delay(action.timeout || 10000);
          break;

        case 'notification':
          console.log(`[PlaybookEngine] Sending notification: ${action.description}`);
          break;

        default:
          await this.delay(1000);
      }
    }

    task.result = {
      success: true,
      output: 'Automated task completed successfully',
      timestamp: new Date(),
      executedBy: 'system',
    };
  }

  private async executeSemiAutomatedTask(task: PlaybookTask, context: ExecutionContext): Promise<void> {
    // Run automated parts
    const automatedActions = task.actions.filter(a => 
      ['api_call', 'script'].includes(a.type)
    );
    
    for (const action of automatedActions) {
      await this.executeAutomatedTask({ ...task, actions: [action] }, context);
    }

    // Mark as waiting for manual verification
    task.status = 'waiting_verification';
    // In production, would wait for analyst confirmation
  }

  private async waitForApproval(executionId: string, phaseIndex: number): Promise<void> {
    // In production, would send notification and wait for response
    console.log(`[PlaybookEngine] Waiting for approval for execution ${executionId}, phase ${phaseIndex}`);
    // Simulate approval after delay
    await this.delay(2000);
  }

  private async waitForManualCompletion(executionId: string, phaseIndex: number, taskId: string): Promise<void> {
    // In production, would poll for task completion
    console.log(`[PlaybookEngine] Waiting for manual task completion: ${taskId}`);
    await this.delay(5000); // Simulate manual work
  }

  private evaluateCondition(condition: TriggerCondition, data: Record<string, any>): boolean {
    const value = data[condition.field];
    
    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'contains': return typeof value === 'string' && value.includes(condition.value);
      case 'greater_than': return typeof value === 'number' && value > condition.value;
      case 'less_than': return typeof value === 'number' && value < condition.value;
      case 'regex': return new RegExp(condition.value).test(String(value));
      default: return false;
    }
  }

  private async sendNotifications(playbook: Playbook, event: NotificationRule['event'], execution: PlaybookExecution): Promise<void> {
    const rules = playbook.notificationRules.filter(r => r.event === event);
    for (const rule of rules) {
      console.log(`[PlaybookEngine] Sending ${event} notification via ${rule.channels.join(', ')}`);
      // Would actually send notifications here
    }
  }

  private addTimelineEntry(executionId: string, action: string, details: string, actor?: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.timeline.push({
      timestamp: new Date(),
      action,
      details,
      actor: actor || 'system',
    });
  }

  private getPlaybook(id: string): Playbook {
    const playbook = this.playbooks.get(id);
    if (!playbook) throw new Error(`Playbook not found: ${id}`);
    return playbook;
  }

  private loadDefaultPlaybooks(): void {
    DEFAULT_PLAYBOOKS.forEach(pb => this.playbooks.set(pb.id, pb));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

export interface PlaybookConfig {
  autoExecuteCritical: boolean;
  requireApprovalForDestructive: boolean;
  maxConcurrentExecutions: number;
  defaultExecutor: string;
  enableAuditLogging: boolean;
}

export interface PlaybookExecution {
  id: string;
  playbookId: string;
  playbookName: string;
  incidentId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  executor: string;
  context: ExecutionContext;
  currentPhase: number;
  phases: (PlaybookPhase & { tasks: (PlaybookTask & { status?: TaskStatus })[] })[];
  timeline: TimelineEntry[];
  error?: string;
}

export interface ExecutionContext {
  incidentTitle: string;
  severity: string;
  affectedAssets: string[];
  initialAlerts: AlertData[];
  metadata?: Record<string, any>;
}

export interface AlertData {
  source: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  iocs?: Array<{ type: string; value: string }>;
  raw?: Record<string, any>;
}

export interface TimelineEntry {
  timestamp: Date;
  action: string;
  details: string;
  actor: string;
}

export interface PlaybookMatch {
  playbook: Playbook;
  matchScore: number;
  matchedTriggers: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'optional';
}

// ============================================================
// DEFAULT PLAYBOOKS
// ============================================================

const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: 'PB-RANSOMWARE-001',
    name: 'Ransomware Response Playbook',
    version: '2.1.0',
    category: 'ransomware',
    severity: 'critical',
    description: 'Comprehensive ransomware incident response including containment, eradication, and recovery procedures',
    author: 'Djezzy SOC Team',
    lastUpdated: new Date('2024-06-15'),
    estimatedDuration: '4-72 hours',
    requiredRoles: ['SOC Analyst', 'IR Lead', 'System Admin', 'Management'],
    triggers: [
      {
        type: 'alert',
        conditions: [
          { field: 'type', operator: 'equals', value: 'ransomware_detection' },
          { field: 'severity', operator: 'equals', value: 'critical' },
        ],
        matchLogic: 'all',
      },
      {
        type: 'ioc_match',
        conditions: [
          { field: 'file_extension', operator: 'regex', value: '\\.(encrypted|locked|crypto)' },
        ],
        matchLogic: 'any',
      },
    ],
    phases: [
      {
        id: 'PHASE-1',
        name: 'Detection & Triage',
        order: 1,
        description: 'Initial detection, scope assessment, and triage of ransomware incident',
        duration: '30-60 minutes',
        approvalGate: false,
        rollbackAvailable: true,
        tasks: [
          {
            id: 'TASK-1-1',
            title: 'Verify Ransomware Detection',
            description: 'Confirm ransomware activity through multiple sources',
            order: 1,
            type: 'detection',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Query EDR for encryption events', target: '/api/edr/events' },
              { type: 'api_call', description: 'Check for ransom notes on shares', target: '/api/file-scan' },
              { type: 'manual_step', description: 'Interview user who reported issue' },
            ],
            expectedOutcome: 'Confirmed ransomware with initial scope assessment',
            validationCriteria: ['EDR confirms encryption pattern', 'Ransom note located', 'Initial victim count documented'],
            evidenceRequired: true,
            evidenceType: ['screenshot', 'log_export'],
          },
          {
            id: 'TASK-1-2',
            title: 'Assess Initial Scope',
            description: 'Determine extent of compromise and affected systems',
            order: 2,
            type: 'analysis',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Query AD for compromised accounts', target: '/api/ad/query' },
              { type: 'script', description: 'Run network connectivity check from patient zero' },
              { type: 'manual_step', description: 'Map network shares accessed by compromised account' },
            ],
            dependsOnTasks: ['TASK-1-1'],
            expectedOutcome: 'Documented list of potentially affected systems',
          },
          {
            id: 'TASK-1-3',
            title: 'Escalate to IR Lead',
            description: 'Notify incident response lead and initiate war room',
            order: 3,
            type: 'escalation',
            automationLevel: 'fully_automated',
            actions: [
              { type: 'notification', description: 'Page IR Lead', target: 'pagerduty' },
              { type: 'notification', description: 'Email SOC management', target: 'email' },
              { type: 'api_call', description: 'Create incident ticket', target: '/api/incidents' },
            ],
            dependsOnTasks: ['TASK-1-1'],
          },
        ],
      },
      {
        id: 'PHASE-2',
        name: 'Containment',
        order: 2,
        description: 'Isolate affected systems to prevent further spread',
        duration: '1-4 hours',
        approvalGate: true,
        rollbackAvailable: true,
        tasks: [
          {
            id: 'TASK-2-1',
            title: 'Isolate Patient Zero',
            description: 'Disconnect confirmed infected system from network',
            order: 1,
            type: 'containment',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Disable network adapter via EDR', target: '/api/edr/isolate' },
              { type: 'manual_step', description: 'Physically disconnect if EDR fails' },
              { type: 'evidence_collection', description: 'Capture memory before isolation if possible' },
            ],
            expectedOutcome: 'Patient zero fully isolated from network',
            validationCriteria: ['Network connectivity test fails', 'EDR shows isolated status'],
          },
          {
            id: 'TASK-2-2',
            title: 'Isolate Potentially Affected Systems',
            description: 'Preemptively isolate systems showing early signs of infection',
            order: 2,
            type: 'containment',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Block C2 domains/IPs at firewall', target: '/api/firewall/block' },
              { type: 'api_call', description: 'Disable SMB across network segment', target: '/api/network/acl' },
              { type: 'script', description: 'Push host-based firewall rules' },
            ],
            dependsOnTasks: ['TASK-2-1'],
          },
          {
            id: 'TASK-2-3',
            title: 'Preserve Evidence',
            description: 'Create forensic images of affected systems before remediation',
            order: 3,
            type: 'evidence_collection',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Initiate disk image acquisition', target: '/api/forensics/image' },
              { type: 'api_call', description: 'Capture volatile memory', target: '/api/forensics/memory' },
              { type: 'manual_step', description: 'Document system state with photos' },
            ],
            dependsOnTasks: ['TASK-2-1'],
            evidenceRequired: true,
            evidenceType: ['disk_image', 'memory_capture'],
          },
        ],
      },
      {
        id: 'PHASE-3',
        name: 'Eradication',
        order: 3,
        description: 'Remove ransomware and backdoors from affected systems',
        duration: '2-24 hours',
        approvalGate: true,
        rollbackAvailable: false,
        tasks: [
          {
            id: 'TASK-3-1',
            title: 'Identify Ransomware Strain',
            description: 'Analyze ransomware sample to identify strain and potential decryption options',
            order: 1,
            type: 'analysis',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Submit sample to sandbox', target: '/api/sandbox/analyze' },
              { type: 'api_call', description: 'Check NoMoreRansom project', target: 'external:nmorsite' },
              { type: 'manual_step', description: 'Review ransom note for contact info' },
            ],
            expectedOutcome: 'Identified ransomware family and decryption availability',
          },
          {
            id: 'TASK-3-2',
            title: 'Clean Infected Systems',
            description: 'Remove ransomware payload and backdoors from all affected systems',
            order: 2,
            type: 'eradication',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'script', description: 'Run AV full scan with latest definitions' },
              { type: 'script', description: 'Remove persistence mechanisms' },
              { type: 'manual_step', description: 'Manual review of critical systems' },
            ],
            dependsOnTasks: ['TASK-3-1'],
            validationCriteria: ['AV scan clean', 'No suspicious processes', 'Persistence removed'],
          },
          {
            id: 'TASK-3-3',
            title: 'Patch Entry Vector',
            description: 'Address vulnerability that allowed initial compromise',
            order: 3,
            type: 'eradication',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Deploy emergency patch', target: '/api/patch/deploy' },
              { type: 'manual_step', description: 'Update security controls' },
              { type: 'documentation', description: 'Document root cause analysis' },
            ],
          },
        ],
      },
      {
        id: 'PHASE-4',
        name: 'Recovery',
        order: 4,
        description: 'Restore systems from clean backups and verify integrity',
        duration: '4-48 hours',
        approvalGate: true,
        rollbackAvailable: false,
        tasks: [
          {
            id: 'TASK-4-1',
            title: 'Verify Backup Integrity',
            description: 'Confirm backups are clean and not encrypted',
            order: 1,
            type: 'verification',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Scan backup repository', target: '/api/backup/scan' },
              { type: 'script', description: 'Test restore to isolated environment' },
              { type: 'manual_step', description: 'Verify backup checksums' },
            ],
            expectedOutcome: 'Confirmed clean backups available',
          },
          {
            id: 'TASK-4-2',
            title: 'Restore Critical Systems',
            description: 'Restore business-critical systems in priority order',
            order: 2,
            type: 'recovery',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Initiate bare metal restore', target: '/api/restore/bmr' },
              { type: 'manual_step', description: 'Validate restored system functionality' },
              { type: 'documentation', description: 'Document restore process and outcomes' },
            ],
            dependsOnTasks: ['TASK-4-1'],
          },
          {
            id: 'TASK-4-3',
            title: 'Monitor for Reinfection',
            description: 'Enhanced monitoring during recovery period',
            order: 3,
            type: 'detection',
            automationLevel: 'fully_automated',
            actions: [
              { type: 'api_call', description: 'Enable enhanced EDR monitoring', target: '/api/edr/config' },
              { type: 'api_call', description: 'Add IOCs to block lists', target: '/api/threat-feed/block' },
            ],
          },
        ],
      },
      {
        id: 'PHASE-5',
        name: 'Post-Incident Activities',
        order: 5,
        description: 'Documentation, lessons learned, and improvement recommendations',
        duration: '1-2 weeks',
        approvalGate: false,
        rollbackAvailable: false,
        tasks: [
          {
            id: 'TASK-5-1',
            title: 'Conduct Lessons Learned',
            description: 'Facilitate post-incident review meeting',
            order: 1,
            type: 'documentation',
            automationLevel: 'manual',
            actions: [
              { type: 'manual_step', description: 'Schedule lessons learned meeting within 5 business days' },
              { type: 'manual_step', description: 'Prepare timeline and key findings presentation' },
              { type: 'manual_step', document_description: 'Document what went well and areas for improvement' },
            ],
          },
          {
            id: 'TASK-5-2',
            title: 'Update Security Controls',
            description: 'Implement improvements identified during incident',
            order: 2,
            type: 'eradication',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Update detection rules', target: '/api/siem/rules' },
              { type: 'api_call', description: 'Adjust prevention controls', target: '/api/security/config' },
              { type: 'manual_step', description: 'Update policies and procedures' },
            ],
          },
          {
            id: 'TASK-5-3',
            title: 'Final Report',
            description: 'Complete executive and technical incident reports',
            order: 3,
            type: 'documentation',
            automationLevel: 'manual',
            actions: [
              { type: 'manual_step', description: 'Write technical report' },
              { type: 'manual_step', description: 'Write executive summary' },
              { type: 'manual_step', description: 'Obtain management sign-off' },
            ],
          },
        ],
      },
    ],
    autoExecute: false,
    approvalRequired: true,
    notificationRules: [
      {
        event: 'playbook_started',
        channels: ['email', 'slack', 'pagerduty'],
        recipients: ['soc-team@dz.djezzy.com', 'ir-lead@dz.djezzy.com'],
        includeDetails: true,
      },
      {
        event: 'task_failed',
        channels: ['email', 'pagerduty'],
        recipients: ['ir-lead@dz.djezzy.com'],
        includeDetails: true,
      },
      {
        event: 'playbook_completed',
        channels: ['email', 'slack'],
        recipients: ['soc-team@dz.djezzy.com', 'management@dz.djezzy.com'],
        includeDetails: true,
      },
    ],
  },
  {
    id: 'PB-SS7-ATTACK-001',
    name: 'SS7 Signaling Attack Response',
    version: '1.0.0',
    category: 'ss7_attack',
    severity: 'critical',
    description: 'Response playbook for SS7/Diameter signaling attacks including location tracking, interception, and fraud',
    author: 'Djezzy SOC Team',
    lastUpdated: new Date('2024-07-01'),
    estimatedDuration: '2-8 hours',
    requiredRoles: ['SOC Analyst', 'Telecom Security Specialist', 'SS7 Firewall Admin'],
    triggers: [
      {
        type: 'alert',
        conditions: [
          { field: 'source', operator: 'contains', value: 'ss7_firewall' },
          { field: 'type', operator: 'equals', value: 'signaling_attack' },
        ],
        matchLogic: 'all',
      },
    ],
    phases: [
      {
        id: 'SS7-PHASE-1',
        name: 'Attack Identification',
        order: 1,
        description: 'Identify type and scope of SS7 attack',
        duration: '30-60 minutes',
        tasks: [
          {
            id: 'SS7-TASK-1-1',
            title: 'Classify Attack Type',
            description: 'Determine attack category: location tracking, interception, fraud, DoS',
            order: 1,
            type: 'analysis',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Query SS7 firewall logs', target: '/api/ss7/logs' },
              { type: 'api_call', description: 'Analyze MAP messages', target: '/api/ss7/map-analysis' },
              { type: 'manual_step', description: 'Review signaling patterns' },
            ],
          },
          {
            id: 'SS7-TASK-1-2',
            title: 'Identify Target Subscribers',
            description: 'List MSISDNs/IMSIs targeted in the attack',
            order: 2,
            type: 'analysis',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Extract targeted GT/MSISDN from logs', target: '/api/ss7/targets' },
              { type: 'api_call', description: 'Cross-reference with HLR', target: '/api/hlr/query' },
            ],
          },
        ],
      },
      {
        id: 'SS7-PHASE-2',
        name: 'Containment',
        order: 2,
        description: 'Block malicious signaling and protect subscribers',
        duration: '1-2 hours',
        approvalGate: true,
        tasks: [
          {
            id: 'SS7-TASK-2-1',
            title: 'Block Attacking Network',
            description: 'Add attacking GT/PCG to SS7 firewall blocklist',
            order: 1,
            type: 'containment',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Push blocking rule to SS7 FW', target: '/api/ss7fw/block' },
              { type: 'manual_step', description: 'Verify rule propagation' },
            ],
          },
          {
            id: 'SS7-TASK-2-2',
            title: 'Protect Target Subscribers',
            description: 'Enable additional protection for targeted subscribers',
            order: 2,
            type: 'containment',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Enable subscriber privacy services', target: '/api/hlr/privacy' },
              { type: 'api_call', description: 'Alert subscribers if consumer fraud', target: '/api/notification/sms' },
            ],
          },
        ],
      },
      {
        id: 'SS7-PHASE-3',
        name: 'Investigation & Reporting',
        order: 3,
        description: 'Deep investigation and regulatory reporting',
        duration: '2-6 hours',
        tasks: [
          {
            id: 'SS7-TASK-3-1',
            title: 'Full Attack Reconstruction',
            description: 'Reconstruct complete attack timeline',
            order: 1,
            type: 'analysis',
            automationLevel: 'semi_automated',
            actions: [
              { type: 'api_call', description: 'Export all related signaling', target: '/api/ss7/export' },
              { type: 'manual_step', description: 'Create attack timeline' },
            ],
          },
          {
            id: 'SS7-TASK-3-2',
            title: 'ANOR Report Preparation',
            description: 'Prepare regulatory report if required',
            order: 2,
            type: 'documentation',
            automationLevel: 'manual',
            actions: [
              { type: 'manual_step', description: 'Draft ANOR incident report' },
              { type: 'manual_step', description: 'Coordinate with Legal/Compliance' },
            ],
          },
        ],
      },
    ],
    autoExecute: false,
    approvalRequired: true,
    notificationRules: [
      {
        event: 'playbook_started',
        channels: ['sms', 'email', 'pagerduty'],
        recipients: ['telecom-security@dz.djezzy.com', 'noc@dz.djezzy.com'],
        includeDetails: true,
      },
    ],
  },
];

// Default configuration
const DEFAULT_PLAYBOOK_CONFIG: PlaybookConfig = {
  autoExecuteCritical: false,
  requireApprovalForDestructive: true,
  maxConcurrentExecutions: 10,
  defaultExecutor: 'soc-analyst',
  enableAuditLogging: true,
};

// Export singleton
export const playbookEngine = new PlaybookEngine();
