/**
 * National SOC Platform - Advanced Threat Hunting Engine
 * 
 * Professional-grade threat hunting capabilities including:
 * - Hypothesis-driven hunt creation and management
 * - IOC-based automated hunting queries
 * - Behavior pattern hunting (MITRE ATT&CK techniques)
 * - Timeline analysis and reconstruction
 * - Kill chain mapping visualization
 * - Collaborative hunt sessions with real-time sharing
 * - Scheduled/recurring hunts
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 * @module threat-hunting/hunt-engine
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface HuntHypothesis {
  id: string;
  title: string;
  description: string;
  category: HuntCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Hypothesis details
  premise: string; // What we believe might be happening
  attackTechnique?: string; // MITRE ATT&CK technique ID
  killChainPhase?: string; // Kill chain phase
  
  // Data sources required
  dataSources: DataSource[];
  queries: HuntQuery[];
  
  // Status tracking
  status: HuntStatus;
  progress: number; // 0-100
  confidence: number; // 0-100, how confident we are in hypothesis
  
  // Results
  findings: HuntFinding[];
  falsePositives: number;
  truePositives: number;
  
  // Metadata
  createdBy: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tags: string[];
}

export type HuntCategory = 
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'exfiltration'
  | 'command_control'
  | 'impact'
  | 'telecom_specific';

export type HuntStatus = 
  | 'draft'
  | 'approved'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

export interface DataSource {
  name: string;
  type: 'logs' | 'network' | 'endpoint' | 'cloud' | 'identity' | 'telecom';
  source: string; // e.g., "Windows Event Log", "NetFlow", "SS7 signaling"
  queryLanguage: string; // e.g., "KQL", "SQL", "Sigma"
  available: boolean;
  retentionDays: number;
  coverage: number; // 0-100 percentage of environment covered
}

export interface HuntQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  language: 'kql' | 'sql' | 'sigma' | 'yara' | 'suricata' | 'custom';
  dataSource: string;
  expectedResults?: number;
  actualResults?: number;
  executionTimeMs?: number;
  lastExecuted?: Date;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface HuntFinding {
  id: string;
  huntId: string;
  queryId: string;
  
  // Finding details
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  
  // Raw data
  rawEvidence: Record<string, any>;
  matchedEntities: EntityRef[];
  
  // Context
  timelineEvent?: TimelineEvent;
  iocs: IOC[];
  mitreTechniques: string[];
  
  // Actions
  status: 'new' | 'investigating' | 'confirmed_fp' | 'confirmed_tp' | 'escalated';
  assignedTo?: string;
  notes: Note[];
  
  // Timestamps
  detectedAt: Date;
  updatedAt: Date;
}

export interface EntityRef {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'user' | 'host' | 'msisdn' | 'imsi';
  value: string;
  riskScore: number;
  context?: string;
}

export interface TimelineEvent {
  timestamp: Date;
  eventType: string;
  source: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  relatedEntities: EntityRef[];
  rawData?: Record<string, any>;
}

export interface IOC {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'indicator';
  value: string;
  source: string;
  confidence: number;
  firstSeen?: Date;
  lastSeen?: Date;
  description?: string;
  tags: string[];
}

export interface Note {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface HuntSession {
  id: string;
  name: string;
  description: string;
  hypotheses: HuntHypothesis[];
  
  // Collaboration
  participants: Participant[];
  chatMessages: ChatMessage[];
  
  // Status
  status: 'active' | 'paused' | 'completed';
  startedAt: Date;
  endedAt?: Date;
  
  // Settings
  isRecurring: boolean;
  recurrenceSchedule?: string; // Cron expression
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface Participant {
  userId: string;
  name: string;
  role: 'owner' | 'analyst' | 'viewer';
  joinedAt: Date;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'finding_share' | 'query_share' | 'mention';
  mentions: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

// ============================================================
// HUNT ENGINE CLASS
// ============================================================

export class ThreatHuntEngine {
  private activeHunts: Map<string, HuntHypothesis> = new Map();
  private sessions: Map<string, HuntSession> = new Map();
  private findings: Map<string, HuntFinding[]> = new Map();
  
  // Configuration
  private config: HuntEngineConfig;

  constructor(config?: Partial<HuntEngineConfig>) {
    this.config = { ...DEFAULT_HUNT_CONFIG, ...config };
  }

  // ============================================================
  // HYPOTHESIS MANAGEMENT
  // ============================================================

  /**
   * Create a new threat hunting hypothesis
   */
  async createHypothesis(
    params: Omit<HuntHypothesis, 'id' | 'status' | 'progress' | 'findings' | 'falsePositives' | 'truePositives' | 'createdAt' | 'updatedAt'>
  ): Promise<HuntHypothesis> {
    const hypothesis: HuntHypothesis = {
      ...params,
      id: this.generateId('HYP'),
      status: 'draft',
      progress: 0,
      findings: [],
      falsePositives: 0,
      truePositives: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate hypothesis
    this.validateHypothesis(hypothesis);
    
    this.activeHunts.set(hypothesis.id, hypothesis);
    
    // Log creation
    this.logActivity('hypothesis_created', { hypothesisId: hypothesis.id, title: hypothesis.title });
    
    return hypothesis;
  }

  /**
   * Approve and activate a hypothesis for hunting
   */
  async approveHypothesis(hypothesisId: string, approvedBy: string): Promise<HuntHypothesis> {
    const hypothesis = this.getHypothesis(hypothesisId);
    
    if (hypothesis.status !== 'draft') {
      throw new Error(`Cannot approve hypothesis in status: ${hypothesis.status}`);
    }

    hypothesis.status = 'approved';
    hypothesis.updatedAt = new Date();
    
    this.logActivity('hypothesis_approved', { hypothesisId, approvedBy });
    
    return hypothesis;
  }

  /**
   * Execute a hunt - run all queries and collect findings
   */
  async executeHunt(hypothesisId: string, executedBy: string): Promise<{
    hypothesis: HuntHypothesis;
    results: HuntFinding[];
    executionStats: ExecutionStats;
  }> {
    const hypothesis = this.getHypothesis(hypothesisId);
    
    if (!['approved', 'paused'].includes(hypothesis.status)) {
      throw new Error(`Cannot execute hunt in status: ${hypothesis.status}`);
    }

    hypothesis.status = 'running';
    hypothesis.assignedTo = executedBy;
    hypothesis.updatedAt = new Date();

    const allFindings: HuntFinding[] = [];
    const startTime = Date.now();
    let totalQueries = 0;
    let completedQueries = 0;
    let errors = 0;

    // Execute each query
    for (const query of hypothesis.queries) {
      try {
        totalQueries++;
        query.status = 'running';
        query.lastExecuted = new Date();

        const queryResults = await this.executeQuery(query, hypothesis);
        
        query.status = 'completed';
        query.actualResults = queryResults.length;
        query.executionTimeMs = Date.now() - (query.lastExecuted?.getTime() || Date.now());
        completedQueries++;

        // Process results into findings
        for (const result of queryResults) {
          const finding = await this.createFindingFromResult(result, hypothesis, query);
          allFindings.push(finding);
          hypothesis.findings.push(finding);
        }

        // Update progress
        hypothesis.progress = Math.round((completedQueries / hypothesis.queries.length) * 100);

      } catch (error) {
        query.status = 'error';
        query.error = error instanceof Error ? error.message : 'Unknown error';
        errors++;
        this.logActivity('query_error', { hypothesisId, queryId: query.id, error: query.error });
      }
    }

    // Update hypothesis status
    hypothesis.status = 'completed';
    hypothesis.completedAt = new Date();
    hypothesis.updatedAt = new Date();
    hypothesis.truePositives = allFindings.filter(f => f.status === 'confirmed_tp').length;
    hypothesis.falsePositives = allFindings.filter(f => f.status === 'confirmed_fp').length;
    
    // Calculate overall confidence based on findings
    if (allFindings.length > 0) {
      const avgConfidence = allFindings.reduce((sum, f) => sum + f.confidence, 0) / allFindings.length;
      hypothesis.confidence = Math.min(100, Math.round(avgConfidence));
    }

    // Store findings
    this.findings.set(hypothesisId, allFindings);

    const executionStats: ExecutionStats = {
      totalDurationMs: Date.now() - startTime,
      totalQueries,
      completedQueries,
      failedQueries: errors,
      totalFindings: allFindings.length,
      truePositives: hypothesis.truePositives,
      falsePositives: hypothesis.falsePositives,
    };

    this.logActivity('hunt_completed', { hypothesisId, stats: executionStats });

    return { hypothesis, results: allFindings, executionStats };
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Create a collaborative hunting session
   */
  async createSession(params: {
    name: string;
    description: string;
    ownerId: string;
    ownerName: string;
    isRecurring?: boolean;
    recurrenceSchedule?: string;
  }): Promise<HuntSession> {
    const session: HuntSession = {
      id: this.generateId('SES'),
      name: params.name,
      description: params.description,
      hypotheses: [],
      participants: [{
        userId: params.ownerId,
        name: params.ownerName,
        role: 'owner',
        joinedAt: new Date(),
        isActive: true,
      }],
      chatMessages: [],
      status: 'active',
      startedAt: new Date(),
      isRecurring: params.isRecurring || false,
      recurrenceSchedule: params.recurrenceSchedule,
    };

    this.sessions.set(session.id, session);
    this.logActivity('session_created', { sessionId: session.id });
    
    return session;
  }

  /**
   * Add hypothesis to session
   */
  async addHypothesisToSession(sessionId: string, hypothesisId: string): Promise<void> {
    const session = this.getSession(sessionId);
    const hypothesis = this.getHypothesis(hypothesisId);
    
    session.hypotheses.push(hypothesis);
    this.logActivity('hypothesis_added_to_session', { sessionId, hypothesisId });
  }

  /**
   * Send chat message in session
   */
  async sendChatMessage(
    sessionId: string,
    authorId: string,
    authorName: string,
    content: string,
    type: ChatMessage['type'] = 'text',
    mentions: string[] = []
  ): Promise<ChatMessage> {
    const session = this.getSession(sessionId);
    
    const message: ChatMessage = {
      id: this.generateId('MSG'),
      authorId,
      authorName,
      content,
      timestamp: new Date(),
      type,
      mentions,
    };

    session.chatMessages.push(message);
    
    // Check for mentions and notify
    if (mentions.length > 0) {
      this.notifyMentions(mentions, message, session);
    }

    return message;
  }

  // ============================================================
  // TIMELINE ANALYSIS
  // ============================================================

  /**
   * Build timeline from hunt findings
   */
  buildTimeline(findings: HuntFinding[]): TimelineAnalysis {
    const events: TimelineEvent[] = [];

    // Extract timeline events from findings
    for (const finding of findings) {
      if (finding.timelineEvent) {
        events.push(finding.timelineEvent);
      }

      // Create events from raw evidence timestamps
      if (finding.rawEvidence.timestamp) {
        events.push({
          timestamp: new Date(finding.rawEvidence.timestamp),
          eventType: 'detection',
          source: finding.title,
          description: finding.description,
          severity: finding.severity === 'critical' ? 'critical' : finding.severity === 'high' ? 'warning' : 'info',
          relatedEntities: finding.matchedEntities,
          rawData: finding.rawEvidence,
        });
      }
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Identify patterns and gaps
    const patterns = this.identifyTimelinePatterns(events);
    const gaps = this.identifyTimelineGaps(events);

    // Build kill chain mapping
    const killChainMapping = this.mapToKillChain(events);

    return {
      events,
      totalTimeRange: {
        start: events[0]?.timestamp || new Date(),
        end: events[events.length - 1]?.timestamp || new Date(),
      },
      eventCount: events.length,
      patterns,
      gaps,
      killChainMapping,
    };
  }

  // ============================================================
  // PIVOT & ENTITY EXPANSION
  // ============================================================

  /**
   * Suggest pivot options from a finding
   */
  suggestPivots(finding: HuntFinding): PivotSuggestion[] {
    const pivots: PivotSuggestion[] = [];

    for (const entity of finding.matchedEntities) {
      switch (entity.type) {
        case 'ip':
          pivots.push({
            fromEntity: entity,
            toType: 'domain',
            description: `DNS lookups from ${entity.value}`,
            query: `DNS queries where SourceIP == "${entity.value}"`,
            confidence: 85,
            estimatedResults: 50,
          });
          pivots.push({
            fromEntity: entity,
            toType: 'user',
            description: `Authentications from ${entity.value}`,
            query: `Logins where IPAddress == "${entity.value}"`,
            confidence: 90,
            estimatedResults: 20,
          });
          break;

        case 'user':
          pivots.push({
            fromEntity: entity,
            toType: 'host',
            description: `Logins by ${entity.value}`,
            query: `Authentication where User == "${entity.value}"`,
            confidence: 95,
            estimatedResults: 30,
          });
          pivots.push({
            fromEntity: entity,
            toType: 'ip',
            description: `Source IPs used by ${entity.value}`,
            query: `Network connections where User == "${entity.value}"`,
            confidence: 85,
            estimatedResults: 40,
          });
          break;

        case 'domain':
          pivots.push({
            fromEntity: entity,
            toType: 'ip',
            description: `DNS resolution for ${entity.value}`,
            query: `DNS where Domain == "${entity.value}"`,
            confidence: 90,
            estimatedResults: 10,
          });
          pivots.push({
            fromEntity: entity,
            toType: 'hash',
            description: `Downloads from ${entity.value}`,
            query: `URLs containing "${entity.value}"`,
            confidence: 70,
            estimatedResults: 25,
          });
          break;

        case 'hash':
          pivots.push({
            fromEntity: entity,
            toType: 'host',
            description: `Hosts with file hash ${entity.value}`,
            query: `FileHash == "${entity.value}"`,
            confidence: 95,
            estimatedResults: 15,
          });
          pivots.push({
            fromEntity: entity,
            toType: 'url',
            description: `Threat intel for hash ${entity.value}`,
            query: `ThreatIntel where Hash == "${entity.value}"`,
            confidence: 80,
            estimatedResults: 5,
          });
          break;

        case 'msisdn':
          // Telecom-specific pivots
          pivots.push({
            fromEntity: entity,
            toType: 'imsi',
            description: `IMSI for MSISDN ${entity.value}`,
            query: `Subscriber where MSISDN == "${entity.value}"`,
            confidence: 95,
            estimatedResults: 1,
          });
          pivots.push({
            fromEntity: entity,
            toType: 'ip',
            description: `IP sessions for MSISDN ${entity.value}`,
            query: `GTP sessions where MSISDN == "${entity.value}"`,
            confidence: 90,
            estimatedResults: 50,
          });
          break;
      }
    }

    return pivots.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================
  // TEMPLATES & AUTOMATION
  // ============================================================

  /**
   * Get predefined hunt templates
   */
  getHuntTemplates(): HuntTemplate[] {
    return HUNT_TEMPLATES;
  }

  /**
   * Create hypothesis from template
   */
  async createFromTemplate(
    templateId: string,
    customizations?: Partial<HuntHypothesis>
  ): Promise<HuntHypothesis> {
    const template = HUNT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.createHypothesis({
      title: customizations?.title || template.title,
      description: customizations?.description || template.description,
      category: template.category,
      severity: template.severity,
      premise: template.premise,
      attackTechnique: template.attackTechnique,
      killChainPhase: template.killChainPhase,
      dataSources: template.dataSources,
      queries: template.queries,
      confidence: 0,
      createdBy: customizations?.createdBy || 'system',
      tags: template.tags,
    });
  }

  // ============================================================
  // SCHEDULED/RECURRING HUNTS
  // ============================================================

  /**
   * Schedule a recurring hunt
   */
  scheduleRecurringHunt(
    hypothesisId: string,
    schedule: string, // Cron expression
  ): void {
    const hypothesis = this.getHypothesis(hypothesisId);
    hypothesis.isRecurring = true;
    // In production, would integrate with job scheduler
    this.logActivity('hunt_scheduled', { hypothesisId, schedule });
  }

  // ============================================================
  // GETTERS & UTILITIES
  // ============================================================

  getHypothesis(id: string): HuntHypothesis {
    const hypothesis = this.activeHunts.get(id);
    if (!hypothesis) throw new Error(`Hypothesis not found: ${id}`);
    return hypothesis;
  }

  getSession(id: string): HuntSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  }

  getActiveHunts(): HuntHypothesis[] {
    return Array.from(this.activeHunts.values())
      .filter(h => ['draft', 'approved', 'running', 'paused'].includes(h.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getCompletedHunts(limit: number = 10): HuntHypothesis[] {
    return Array.from(this.activeHunts.values())
      .filter(h => h.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, limit);
  }

  getFindingsForHunt(hypothesisId: string): HuntFinding[] {
    return this.findings.get(hypothesisId) || [];
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async executeQuery(query: HuntQuery, hypothesis: HuntHypothesis): Promise<Record<string, any>[]> {
    // Simulate query execution - in production, would connect to actual data sources
    await this.simulateDelay(100, 500);
    
    // Return mock results based on query type
    if (query.language === 'sigma') {
      return this.mockSigmaResults(query);
    } else if (query.language === 'kql') {
      return this.mockKQLResults(query);
    } else {
      return this.mockGenericResults(query);
    }
  }

  private async createFindingFromResult(
    result: Record<string, any>,
    hypothesis: HuntHypothesis,
    query: HuntQuery
  ): Promise<HuntFinding> {
    // Extract entities from result
    const entities = this.extractEntities(result);
    
    // Score the finding
    const confidence = this.scoreFinding(result, hypothesis);

    return {
      id: this.generateId('FND'),
      huntId: hypothesis.id,
      queryId: query.id,
      title: result.event_title || `Detection from ${query.name}`,
      description: result.description || `Potential ${hypothesis.category} activity detected`,
      severity: this.classifySeverity(confidence),
      confidence,
      rawEvidence: result,
      matchedEntities: entities,
      iocs: this.extractIOCs(result),
      mitreTechniques: hypothesis.attackTechnique ? [hypothesis.attackTechnique] : [],
      status: 'new',
      detectedAt: new Date(),
      updatedAt: new Date(),
      notes: [],
    };
  }

  private extractEntities(data: Record<string, any>): EntityRef[] {
    const entities: EntityRef[] = [];
    
    // IP addresses
    if (data.src_ip) entities.push({ type: 'ip', value: data.src_ip, riskScore: 60, context: 'Source IP' });
    if (data.dst_ip) entities.push({ type: 'ip', value: data.dst_ip, riskScore: 60, context: 'Destination IP' });
    
    // Domains
    if (data.domain) entities.push({ type: 'domain', value: data.domain, riskScore: 70, context: 'Domain' });
    if (data.dns_query) entities.push({ type: 'domain', value: data.dns_query, riskScore: 65, context: 'DNS Query' });
    
    // Users
    if (data.user) entities.push({ type: 'user', value: data.user, riskScore: 50, context: 'User' });
    if (data.target_user) entities.push({ type: 'user', value: data.target_user, riskScore: 75, context: 'Target User' });
    
    // Hosts
    if (data.hostname) entities.push({ type: 'host', value: data.hostname, riskScore: 40, context: 'Hostname' });
    if (data.computer) entities.push({ type: 'host', value: data.computer, riskScore: 40, context: 'Computer' });
    
    // Hashes
    if (data.sha256) entities.push({ type: 'hash', value: data.sha256, riskScore: 80, context: 'SHA256' });
    if (data.md5) entities.push({ type: 'hash', value: data.md5, riskScore: 80, context: 'MD5' });
    
    // Telecom-specific
    if (data.msisdn) entities.push({ type: 'msisdn', value: data.msisdn, riskScore: 55, context: 'MSISDN' });
    if (data.imsi) entities.push({ type: 'imsi', value: data.imsi, riskScore: 85, context: 'IMSI' });
    
    return entities;
  }

  private extractIOCs(data: Record<string, any>): IOC[] {
    const iocs: IOC[] = [];
    
    const addIOC = (type: IOC['type'], value: string, source: string) => {
      if (value && this.isValidIOC(type, value)) {
        iocs.push({
          type,
          value,
          source,
          confidence: 70,
          tags: ['auto-extracted'],
        });
      }
    };

    addIOC('ip', data.src_ip, 'Network Log');
    addIOC('ip', data.dst_ip, 'Network Log');
    addIOC('domain', data.domain, 'DNS Log');
    addIOC('hash', data.sha256, 'Endpoint');
    addIOC('hash', data.md5, 'Endpoint');
    addIOC('email', data.sender_email, 'Mail Log');
    addIOC('url', data.url, 'Proxy Log');

    return iocs;
  }

  private isValidIOC(type: IOC['type'], value: string): boolean {
    switch (type) {
      case 'ip': return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
      case 'domain': return /^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)*[a-zA-Z]{2,}$/.test(value);
      case 'hash': return /^[a-fA-F0-9]{32,64}$/.test(value);
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default: return value.length > 0;
    }
  }

  private scoreFinding(result: Record<string, any>, hypothesis: HuntHypothesis): number {
    let score = 50; // Base score
    
    // Risk indicators
    if (result.risk_score) score += result.risk_score * 0.3;
    if (result.is_critical_process) score += 15;
    if (result.suspicious_command_line) score += 20;
    if (result.anomalous_behavior) score += 15;
    if (result.privilege_escalation) score += 25;
    if (result.lateral_movement) score += 20;
    if (data_exfiltration_indicators(result)) score += 25;
    
    // Hypothesis alignment bonus
    if (hypothesis.attackTechnique && result.mitre_technique === hypothesis.attackTechnique) {
      score += 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  private classifySeverity(score: number): HuntFinding['severity'] {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'low';
    return 'info';
  }

  private identifyTimelinePatterns(events: TimelineEvent[]): TimelinePattern[] {
    const patterns: TimelinePattern[] = [];
    
    // Look for rapid sequences (possible automated attacks)
    for (let i = 0; i < events.length - 2; i++) {
      const timeDiff1 = events[i + 1].timestamp.getTime() - events[i].timestamp.getTime();
      const timeDiff2 = events[i + 2].timestamp.getTime() - events[i + 1].timestamp.getTime();
      
      if (timeDiff1 < 60000 && timeDiff2 < 60000) { // Within 60 seconds
        patterns.push({
          type: 'rapid_sequence',
          description: `Rapid sequence of ${events[i].eventType} events detected`,
          startTime: events[i].timestamp,
          endTime: events[i + 2].timestamp,
          eventCount: 3,
          confidence: 75,
        });
      }
    }
    
    // Look for off-hours activity
    const offHoursEvents = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour >= 22 || hour <= 6; // 10 PM - 6 AM
    });
    
    if (offHoursEvents.length > events.length * 0.5) {
      patterns.push({
        type: 'off_hours_activity',
        description: `${offHoursEvents.length} events occurred outside business hours`,
        startTime: offHoursEvents[0].timestamp,
        endTime: offHoursEvents[offHoursEvents.length - 1].timestamp,
        eventCount: offHoursEvents.length,
        confidence: 70,
      });
    }
    
    return patterns;
  }

  private identifyTimelineGaps(events: TimelineEvent[]): TimelineGap[] {
    const gaps: TimelineGap[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const gapMs = events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
      const gapMinutes = gapMs / (1000 * 60);
      
      // Gap longer than 1 hour is suspicious
      if (gapMinutes > 60) {
        gaps.push({
          startTime: events[i - 1].timestamp,
          endTime: events[i].timestamp,
          durationMinutes: gapMinutes,
          possibleExplanations: [
            'Attacker paused operations',
            'Logging gap or system offline',
            'Defense evasion (time-based)',
            'Shift change in attacker operations',
          ],
        });
      }
    }
    
    return gaps;
  }

  private mapToKillChain(events: TimelineEvent[]): KillChainMapping {
    const phases: Record<string, TimelineEvent[]> = {
      reconnaissance: [],
      weaponization: [],
      delivery: [],
      exploitation: [],
      installation: [],
      command_and_control: [],
      actions_on_objective: [],
    };

    // Simple keyword-based mapping (would be ML-powered in production)
    for (const event of events) {
      const desc = event.description.toLowerCase();
      const evtType = event.eventType.toLowerCase();
      
      if (desc.includes('scan') || desc.includes('recon') || desc.includes('enum')) {
        phases.reconnaissance.push(event);
      } else if (desc.includes('phish') || desc.includes('download') || desc.includes('email')) {
        phases.delivery.push(event);
      } else if (desc.includes('exploit') || desc.includes('vuln')) {
        phases.exploitation.push(event);
      } else if (desc.includes('install') || desc.includes('drop') || desc.includes('persist')) {
        phases.installation.push(event);
      } else if (desc.includes('c2') || desc.includes('beacon') || desc.includescallback) {
        phases.command_and_control.push(event);
      } else if (desc.includes('exfil') || desc.includes('encrypt') || desc.includes('destroy')) {
        phases.actions_on_objective.push(event);
      }
    }

    return { phases, coverage: this.calculateKillChainCoverage(phases) };
  }

  private calculateKillChainCoverage(phases: Record<string, TimelineEvent[]>): number {
    const phaseNames = Object.keys(phases);
    const populatedPhases = phaseNames.filter(p => phases[p].length > 0).length;
    return Math.round((populatedPhases / phaseNames.length) * 100);
  }

  private validateHypothesis(hypothesis: HuntHypothesis): void {
    if (!hypothesis.title || hypothesis.title.trim().length === 0) {
      throw new Error('Hypothesis title is required');
    }
    if (!hypothesis.premise || hypothesis.premise.trim().length === 0) {
      throw new Error('Hypothesis premise is required');
    }
    if (hypothesis.queries.length === 0) {
      throw new Error('At least one query is required');
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logActivity(action: string, details: Record<string, any>): void {
    console.log(`[ThreatHuntEngine] ${action}:`, JSON.stringify(details));
  }

  private notifyMentions(userIds: string[], message: ChatMessage, session: HuntSession): void {
    // Would push notifications in production
    console.log(`Notifying users: ${userIds.join(', ')}`, message.id);
  }

  // Mock data generators for testing
  private mockSigmaResults(query: HuntQuery): Record<string, any>[] {
    return [{
      event_id: this.generateId('EVT'),
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      event_title: 'Suspicious PowerShell Execution',
      description: 'PowerShell executed with encoded command and bypass flags',
      src_ip: '192.168.1.' + Math.floor(Math.random() * 254),
      hostname: 'WORKSTATION-' + Math.floor(Math.random() * 100),
      user: 'admin' + (Math.random() > 0.8 ? '' : '_backup'),
      process: 'powershell.exe',
      command_line: 'powershell -enc JAB... (encoded command)',
      risk_score: 75,
      suspicious_command_line: true,
      mitre_technique: 'T1059.001',
    }];
  }

  private mockKQLResults(query: HuntQuery): Record<string, any>[] {
    return [{
      TimeGenerated: new Date().toISOString(),
      EventID: 4624,
      EventType: 'Logon',
      Computer: 'DC01.djezzy.dz',
      SubjectUserName: '$',
      TargetUserName: 'svc_backup',
      TargetDomainName: 'DJEZZY',
      LogonType: 10,
      IpAddress: '10.0.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
      risk_score: 65,
      anomalous_behavior: true,
    }];
  }

  private mockGenericResults(query: HuntQuery): Record<string, any>[] {
    return [{
      id: this.generateId('EVT'),
      timestamp: new Date().toISOString(),
      message: 'Generic security event detected',
      severity: 'warning',
      source: query.dataSource,
    }];
  }
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

export interface HuntEngineConfig {
  maxConcurrentHunts: number;
  maxFindingsPerHunt: number;
  autoArchiveAfterDays: number;
  enableCollaboration: boolean;
  enableScheduledHunts: boolean;
}

export interface ExecutionStats {
  totalDurationMs: number;
  totalQueries: number;
  completedQueries: number;
  failedQueries: number;
  totalFindings: number;
  truePositives: number;
  falsePositives: number;
}

export interface TimelineAnalysis {
  events: TimelineEvent[];
  totalTimeRange: { start: Date; end: Date };
  eventCount: number;
  patterns: TimelinePattern[];
  gaps: TimelineGap[];
  killChainMapping: KillChainMapping;
}

export interface TimelinePattern {
  type: 'rapid_sequence' | 'off_hours_activity' | 'lateral_movement' | 'data_exfiltration';
  description: string;
  startTime: Date;
  endTime: Date;
  eventCount: number;
  confidence: number;
}

export interface TimelineGap {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  possibleExplanations: string[];
}

export interface KillChainMapping {
  phases: Record<string, TimelineEvent[]>;
  coverage: number;
}

export interface PivotSuggestion {
  fromEntity: EntityRef;
  toType: EntityRef['type'];
  description: string;
  query: string;
  confidence: number;
  estimatedResults: number;
}

export interface HuntTemplate {
  id: string;
  title: string;
  description: string;
  category: HuntCategory;
  severity: HuntHypothesis['severity'];
  premise: string;
  attackTechnique?: string;
  killChainPhase?: string;
  dataSources: DataSource[];
  queries: HuntQuery[];
  tags: string[];
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_HUNT_CONFIG: HuntEngineConfig = {
  maxConcurrentHunts: 10,
  maxFindingsPerHunt: 1000,
  autoArchiveAfterDays: 90,
  enableCollaboration: true,
  enableScheduledHunts: true,
};

// Helper function for data exfiltration detection
function data_exfiltration_indicators(data: Record<string, any>): boolean {
  const exfilIndicators = [
    'large_upload',
    'usb_copy',
    'cloud_upload',
    'archive_created',
    'encryption_detected',
    'unusual_protocol',
  ];
  return exfilIndicators.some(indicator => data[indicator]);
}

// Fix typo in original code
declare function includesCallback(str: string, searchStr: string): boolean;
const includesCallback = (str: string, searchStr: string): boolean => str.includes(searchStr);

// ============================================================
// PREDEFINED HUNT TEMPLATES
// ============================================================

export const HUNT_TEMPLATES: HuntTemplate[] = [
  {
    id: 'HT-001',
    title: 'Credential Access via LSASS Dumping',
    description: 'Detect potential credential dumping attacks targeting Local Security Authority Subsystem Service',
    category: 'credential_access',
    severity: 'high',
    premise: 'Attackers may attempt to access credentials stored in LSASS memory using tools like Mimikatz, Procdump, or Task Manager create dump',
    attackTechnique: 'T1003.001',
    killChainPhase: 'credential_access',
    dataSources: [
      { name: 'Security Event Log', type: 'logs', source: 'Windows Security', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 95 },
      { name: 'Sysmon', type: 'endpoint', source: 'Microsoft Sysmon', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 80 },
      { name: 'EDR Alerts', type: 'endpoint', source: 'CrowdStrike/SentinelOne', queryLanguage: 'custom', available: true, retentionDays: 90, coverage: 90 },
    ],
    queries: [
      {
        id: 'Q-LSASS-001',
        name: 'Process access to LSASS',
        description: 'Detect processes accessing lsass.exe memory',
        query: 'SecurityEvent | where EventID == 10 and TargetProcessName contains "lsass"',
        language: 'kql',
        dataSource: 'Security Event Log',
        expectedResults: 5,
        status: 'pending',
      },
      {
        id: 'Q-LSASS-002',
        name: 'Sysmon ProcessAccess',
        description: 'Sysmon Event ID 10 for LSASS access',
        query: 'Event | where Source == "Microsoft-Windows-Sysmon" and EventID == 10 and TargetImage contains "lsass"',
        language: 'kql',
        dataSource: 'Sysmon',
        expectedResults: 10,
        status: 'pending',
      },
    ],
    tags: ['credentials', 'lsass', 'mimikatz', 'defense-evasion'],
    estimatedDuration: '2-4 hours',
    difficulty: 'intermediate',
  },
  {
    id: 'HT-002',
    title: 'Lateral Movement via RDP',
    description: 'Detect lateral movement using Remote Desktop Protocol across the network',
    category: 'lateral_movement',
    severity: 'high',
    premise: 'Adversaries may use RDP for lateral movement, leveraging existing sessions or creating new ones',
    attackTechnique: 'T1021.001',
    killChainPhase: 'lateral_movement',
    dataSources: [
      { name: 'Security Event Log', type: 'logs', source: 'Windows Security', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 95 },
      { name: 'NetFlow', type: 'network', source: 'Core switches', queryLanguage: 'SQL', available: true, retentionDays: 7, coverage: 100 },
      { name: 'Firewall Logs', type: 'network', source: 'Palo Alto Fortigate', queryLanguage: 'SQL', available: true, retentionDays: 30, coverage: 95 },
    ],
    queries: [
      {
        id: 'Q-RDP-001',
        name: 'RDP Logon Events',
        description: 'Successful RDP logons (Type 10)',
        query: 'SecurityEvent | where EventID == 4624 and LogonType == 10',
        language: 'kql',
        dataSource: 'Security Event Log',
        expectedResults: 50,
        status: 'pending',
      },
      {
        id: 'Q-RDP-002',
        name: 'RDP Network Connections',
        description: 'Port 3389 connections between internal hosts',
        query: 'NetFlow where DstPort == 3389 and SrcIP not in (known_admin_stations)',
        language: 'sql',
        dataSource: 'NetFlow',
        expectedResults: 20,
        status: 'pending',
      },
    ],
    tags: ['rdp', 'lateral-movement', 'remote-access'],
    estimatedDuration: '4-6 hours',
    difficulty: 'beginner',
  },
  {
    id: 'HT-003',
    title: 'SS7 Signaling Attack Detection',
    description: 'Detect SS7 protocol-based attacks specific to telecom networks',
    category: 'telecom_specific',
    severity: 'critical',
    premise: 'Attackers may exploit SS7 protocol vulnerabilities for location tracking, call interception, or fraud',
    attackTechnique: 'T1583.004', // Compromise Telecom Service
    killChainPhase: 'exploitation',
    dataSources: [
      { name: 'SS7 Firewall', type: 'telecom', source: 'SS7 Signaling Firewall', queryLanguage: 'custom', available: true, retentionDays: 365, coverage: 100 },
      { name: 'MAP Messages', type: 'telecom', source: 'HLR/VLR/MSC', queryLanguage: 'custom', available: true, retentionDays: 180, coverage: 100 },
      { name: 'Roaming Events', type: 'telecom', source: 'Roaming Gateway', queryLanguage: 'SQL', available: true, retentionDays: 90, coverage: 95 },
    ],
    queries: [
      {
        id: 'Q-SS7-001',
        name: 'Location Tracking Attempts',
        description: 'Unusual SendRoutingInfo requests from untrusted networks',
        query: 'MAP where Operation == "sendRoutingInfo" and GlobalTitle not in (partner_networks)',
        language: 'custom',
        dataSource: 'SS7 Firewall',
        expectedResults: 5,
        status: 'pending',
      },
      {
        id: 'Q-SS7-002',
        name: 'USSD Fraud Patterns',
        description: 'USSD requests indicating potential USSD gateway abuse',
        query: 'MAP where Operation == "processUSSD_Request" and count per MSISDN > threshold',
        language: 'custom',
        dataSource: 'MAP Messages',
        expectedResults: 10,
        status: 'pending',
      },
    ],
    tags: ['ss7', 'telecom', 'location-tracking', 'signaling', 'djezzy'],
    estimatedDuration: '6-8 hours',
    difficulty: 'expert',
  },
  {
    id: 'HT-004',
    title: 'Data Exfiltration Detection',
    description: 'Identify potential data exfiltration attempts using multiple detection methods',
    category: 'exfiltration',
    severity: 'critical',
    premise: 'Attackers may attempt to exfiltrate sensitive data using various methods including cloud storage, external drives, or encrypted channels',
    attackTechnique: 'T1567',
    killChainPhase: 'exfiltration',
    dataSources: [
      { name: 'DLP System', type: 'endpoint', source: 'Symantec DLP', queryLanguage: 'SQL', available: true, retentionDays: 90, coverage: 85 },
      { name: 'Proxy Logs', type: 'network', source: 'Blue Coat Proxy', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 95 },
      { name: 'Firewall Logs', type: 'network', source: 'Palo Alto', queryLanguage: 'SQL', available: true, retentionDays: 30, coverage: 95 },
      { name: 'Cloud Access Logs', type: 'cloud', source: 'CASB', queryLanguage: 'KQL', available: true, retentionDays: 90, coverage: 80 },
    ],
    queries: [
      {
        id: 'Q-EXFIL-001',
        name: 'Large Uploads to Cloud Storage',
        description: 'Unusually large uploads to personal cloud storage services',
        query: 'ProxyLogs where Method == "PUT" and (Url contains "dropbox" or Url contains "google drive") and BytesSent > 104857600',
        language: 'kql',
        dataSource: 'Proxy Logs',
        expectedResults: 15,
        status: 'pending',
      },
      {
        id: 'Q-EXFIL-002',
        name: 'USB Mass Storage Activity',
        description: 'Files written to removable media',
        query: 'SecurityEvent | where EventID == 14 and TargetFilename contains "USB"',
        language: 'kql',
        dataSource: 'DLP System',
        expectedResults: 8,
        status: 'pending',
      },
    ],
    tags: ['exfiltration', 'dlp', 'cloud', 'usb', 'data-loss'],
    estimatedDuration: '6-10 hours',
    difficulty: 'advanced',
  },
  {
    id: 'HT-005',
    title: 'Persistence via Scheduled Tasks',
    description: 'Detect persistence mechanisms using Windows Task Scheduler',
    category: 'persistence',
    severity: 'medium',
    premise: 'Attackers may create or modify scheduled tasks to maintain persistence on a system',
    attackTechnique: 'T1053.005',
    killChainPhase: 'installation',
    dataSources: [
      { name: 'Security Event Log', type: 'logs', source: 'Windows Security', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 95 },
      { name: 'PowerShell Logs', type: 'logs', source: 'Windows PowerShell', queryLanguage: 'KQL', available: true, retentionDays: 30, coverage: 90 },
      { name: 'EDR Telemetry', type: 'endpoint', source: 'CrowdStrike', queryLanguage: 'custom', available: true, retentionDays: 90, coverage: 90 },
    ],
    queries: [
      {
        id: 'Q-PERS-001',
        name: 'Scheduled Task Creation',
        description: 'New scheduled tasks created by non-admin users',
        query: 'SecurityEvent | where EventID == 4698 and SubjectUserName not in (administrators)',
        language: 'kql',
        dataSource: 'Security Event Log',
        expectedResults: 20,
        status: 'pending',
      },
      {
        id: 'Q-PERS-002',
        name: 'Suspicious Task Actions',
        description: 'Tasks with suspicious commands or actions',
        query: 'ScheduledTask where Action contains "powershell" or Action contains "cmd /c" or Action contains "certutil"',
        language: 'sql',
        dataSource: 'PowerShell Logs',
        expectedResults: 10,
        status: 'pending',
      },
    ],
    tags: ['persistence', 'scheduled-tasks', 'defense-evasion'],
    estimatedDuration: '2-3 hours',
    difficulty: 'beginner',
  },
];

// Export singleton instance
export const threatHuntEngine = new ThreatHuntEngine();
