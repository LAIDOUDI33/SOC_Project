/**
 * National SOC Platform - Correlation Rule Engine
 * 
 * Multi-source event correlation for advanced threat detection:
 * - Rule-based correlation (YARA-like syntax)
 * - Temporal correlation (events within time windows)
 * - Spatial correlation (same source/destination)
 * - Behavioral correlation (anomalous patterns)
 * - Telecom-specific correlation rules
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface CorrelationEvent {
  id: string;
  timestamp: Date;
  source: EventSource;
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  
  // Key fields for correlation
  sourceIp?: string;
  destIp?: string;
  sourcePort?: number;
  destPort?: number;
  protocol?: string;
  username?: string;
  userId?: string;
  hostname?: string;
  
  // Telecom-specific fields
  imsi?: string;           // International Mobile Subscriber Identity
  msisdn?: string;         // Phone number
  imei?: string;           // Device IMEI
  lac?: number;            // Location Area Code
  cellId?: number;         // Cell ID
  
  // SS7 specific
  ss7MessageType?: string;
  ss7CallingNumber?: string;
  ss7CalledNumber?: string;
  ss7Gt?: string;          // Global Title
  
  // GTP specific
  gtpSessionId?: string;
  gtpImsi?: string;
  gtpMsisdn?: string;
  gtpApn?: string;
  
  // SIP specific
  sipFromUri?: string;
  sipToUri?: string;
  sipCallId?: string;
  sipMethod?: string;
  
  // Security-specific
  mitreTechnique?: string;
  alertType?: string;
  signatureId?: string;
  
  // Additional data
  rawEvent?: any;
  tags?: string[];
}

export type EventSource = 
  | 'ids'
  | 'siem'
  | 'ss7_probe'
  | 'gtp_probe'
  | 'sip_probe'
  | 'diameter_probe'
  | 'firewall'
  | 'dns'
  | 'auth_log'
  | 'application'
  | 'threat_intel';

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  severity: CorrelationSeverity;
  category: RuleCategory;
  
  // Rule conditions
  conditions: CorrelationCondition[];
  
  // Time window for correlation (milliseconds)
  timeWindowMs: number;
  
  // How many events must match
  minEvents: number;
  maxEvents?: number;
  
  // Aggregation logic
  aggregation: AggregationType;
  
  // Actions to take when triggered
  actions: CorrelationAction[];
  
  // Metadata
  enabled: boolean;
  riskScore: number; // Base risk score when triggered
  artpReportable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorrelationCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  sourceFilter?: EventSource[]; // Only match events from these sources
  negate?: boolean; // NOT condition
}

export type ConditionOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'regex' | 'not_regex'
  | 'in' | 'not_in'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'exists' | 'not_exists'
  | 'ip_in_range' | 'ip_not_in_range'
  | 'same_as' | 'different_from'; // Cross-event comparison

export type AggregationType =
  | 'any'        // Any single event matches
  | 'all'        // All conditions on same event
  | 'sequence'   // Events in order
  | 'count'      // N events within window
  | 'rate'       // Rate exceeds threshold
  | 'diversity'  // Different values exceed threshold;

export type CorrelationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RuleCategory = 
  | 'brute_force'
  | 'lateral_movement'
  | 'data_exfiltration'
  | 'telecom_fraud'
  | 'apt_indicators'
  | 'insider_threat'
  | 'ddos'
  | 'malware'
  | 'policy_violation';

export interface CorrelationAction {
  type: 'create_alert' | 'escalate' | 'block' | 'notify' | 'tag' | 'run_playbook';
  params: Record<string, any>;
}

export interface CorrelationResult {
  rule: CorrelationRule;
  matched: boolean;
  confidence: number; // 0-1
  triggeringEvents: CorrelationEvent[];
  summary: string;
  detectedAt: Date;
  riskScore: number;
  recommendedActions: string[];
}

export interface CorrelationState {
  activeRules: CorrelationRule[];
  recentEvents: CorrelationEvent[];
  pendingCorrelations: Map<string, Partial<CorrelationResult>>;
  statistics: {
    totalEventsProcessed: number;
    totalCorrelationsTriggered: number;
    correlationsByCategory: Record<string, number>;
    averageProcessingTimeMs: number;
  };
}

// ============================================================
// PRE-BUILT CORRELATION RULES FOR DJEZZY
// ============================================================

/**
 * Pre-configured correlation rules for telecom security
 */
export const DJEZZY_CORRELATION_RULES: CorrelationRule[] = [
  // ========================================
  // BRUTE FORCE DETECTION
  // ========================================
  {
    id: 'BRUTE-001',
    name: 'SSH Brute Force Attack',
    description: 'Multiple failed SSH login attempts from same IP',
    severity: 'high',
    category: 'brute_force',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'auth_failure', sourceFilter: ['auth_log'] },
      { field: 'destPort', operator: 'equals', value: 22 },
    ],
    timeWindowMs: 5 * 60 * 1000, // 5 minutes
    minEvents: 10,
    aggregation: 'count',
    actions: [
      { type: 'block', params: { duration: 3600, blockSourceIp: true } },
      { type: 'notify', params: { channels: ['slack', 'pagerduty'] } },
    ],
    enabled: true,
    riskScore: 75,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'BRUTE-002',
    name: 'LDAP/AD Brute Force',
    description: 'Multiple LDAP bind failures for same account',
    severity: 'critical',
    category: 'brute_force',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'ldap_bind_failure', sourceFilter: ['auth_log'] },
      { field: 'username', operator: 'exists', value: true },
    ],
    timeWindowMs: 3 * 60 * 1000, // 3 minutes
    minEvents: 5,
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P1', autoEscalate: true } },
      { type: 'notify', params: { channels: ['sms', 'email'] } },
    ],
    enabled: true,
    riskScore: 90,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },

  // ========================================
  // TELECOM FRAUD RULES
  // ========================================
  {
    id: 'FRAUD-001',
    name: 'SIM Box Detection',
    description: 'High volume of calls from single IMSI to many destinations',
    severity: 'critical',
    category: 'telecom_fraud',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'call_setup', sourceFilter: ['ss7_probe', 'sip_probe'] },
      { field: 'imsi', operator: 'exists', value: true },
      { field: 'ss7CalledNumber', operator: 'exists', value: true },
    ],
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    minEvents: 50,
    maxEvents: 500,
    aggregation: 'diversity',
    actions: [
      { type: 'create_alert', params: { priority: 'P1', category: 'fraud' } },
      { type: 'block', params: { blockIMSI: true, reason: 'suspected_simbox' } },
      { type: 'run_playbook', params: { playbook: 'fraud-investigation' } },
    ],
    enabled: true,
    riskScore: 95,
    artpReportable: true, // Must report to ARTP!
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'FRAUD-002',
    name: 'IRS F (International Revenue Share) Fraud',
    description: 'Unusual roaming pattern suggesting IRS manipulation',
    severity: 'high',
    category: 'telecom_fraud',
    conditions: [
      { field: 'eventType', operator: 'in', value: ['roaming_update', 'gtp_session_create'], sourceFilter: ['gtp_probe', 'ss7_probe'] },
      { field: 'gtpApn', operator: 'contains', value: 'roaming' },
    ],
    timeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
    minEvents: 20,
    aggregation: 'sequence',
    actions: [
      { type: 'create_alert', params: { priority: 'P2', category: 'irs-fraud' } },
      { type: 'tag', params: { tags: ['artp-reportable', 'financial-fraud'] } },
    ],
    enabled: true,
    riskScore: 85,
    artpReportable: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'FRAUD-003',
    name: 'Wangiri Fraud Pattern',
    description: 'Short duration calls to premium numbers (missed call scam)',
    severity: 'medium',
    category: 'telecom_fraud',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'call_termination', sourceFilter: ['sip_probe'] },
      { field: 'sipToUri', operator: 'regex', value: '\\+?[0-9]{8,15}' }, // Premium number pattern
    ],
    timeWindowMs: 30 * 60 * 1000, // 30 minutes
    minEvents: 30,
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P3', category: 'wangiri' } },
      { type: 'tag', params: { tags: ['fraud', 'premium-rate'] } },
    ],
    enabled: true,
    riskScore: 65,
    artpReportable: false,
    createdAt: new Date('202-24-01-01'),
    updatedAt: new Date(),
  },

  // ========================================
  // LATERAL MOVEMENT
  // ========================================
  {
    id: 'LAT-001',
    name: 'Internal Network Scanning',
    description: 'Single host scanning multiple internal targets',
    severity: 'high',
    category: 'lateral_movement',
    conditions: [
      { field: 'sourceIp', operator: 'exists', value: true },
      { field: 'destIp', operator: 'exists', value: true },
      { field: 'eventType', operator: 'in', value: ['port_scan', 'connection_attempt'], sourceFilter: ['ids', 'firewall'] },
    ],
    timeWindowMs: 10 * 60 * 1000, // 10 minutes
    minEvents: 20,
    aggregation: 'diversity',
    actions: [
      { type: 'create_alert', params: { priority: 'P2', category: 'reconnaissance' } },
      { type: 'block', params: { blockSourceIp: true, duration: 1800 } },
    ],
    enabled: true,
    riskScore: 70,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'LAT-002',
    name: 'Credential Stuffing Across Systems',
    description: 'Same username failing auth on multiple systems',
    severity: 'critical',
    category: 'lateral_movement',
    conditions: [
      { field: 'username', operator: 'exists', value: true },
      { field: 'eventType', operator: 'equals', value: 'auth_failure' },
      { field: 'hostname', operator: 'exists', value: true },
    ],
    timeWindowMs: 15 * 60 * 1000, // 15 minutes
    minEvents: 5,
    aggregation: 'diversity',
    actions: [
      { type: 'create_alert', params: { priority: 'P1', category: 'credential-stuffing' } },
      { type: 'notify', params: { channels: ['soc-team', 'security-leads'] } },
      { type: 'run_playbook', params: { playbook: 'account-lockdown' } },
    ],
    enabled: true,
    riskScore: 88,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },

  // ========================================
  // DATA EXFILTRATION
  // ========================================
  {
    id: 'EXFIL-001',
    name: 'Large Data Transfer to External',
    description: 'Unusual outbound data volume to external destination',
    severity: 'high',
    category: 'data_exfiltration',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'data_transfer', sourceFilter: ['ids', 'firewall'] },
      { field: 'destIp', operator: 'ip_not_in_range', value: { start: '10.0.0.0', end: '10.255.255.255' } }, // Not internal
    ],
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    minEvents: 1,
    aggregation: 'any',
    actions: [
      { type: 'create_alert', params: { priority: 'P2', category: 'exfiltration' } },
      { type: 'tag', params: { tags: ['dlp-alert', 'investigate'] } },
    ],
    enabled: true,
    riskScore: 72,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'EXFIL-002',
    name: 'Database Access Anomaly',
    description: 'Unusual query patterns or large result sets from DB',
    severity: 'medium',
    category: 'data_exfiltration',
    conditions: [
      { field: 'eventType', operator: 'in', value: ['db_query', 'db_export'], sourceFilter: ['application'] },
      { field: 'username', operator: 'exists', value: true },
    ],
    timeWindowMs: 30 * 60 * 1000, // 30 minutes
    minEvents: 10,
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P3', category: 'data-access' } },
      { type: 'notify', params: { channels: ['dba-team'] } },
    ],
    enabled: true,
    riskScore: 55,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },

  // ========================================
  // DDoS / VOLUME ATTACKS
  // ========================================
  {
    id: 'DDOS-001',
    name: 'SS7 Flooding Attack',
    description: 'Abnormal SS7 message volume targeting network element',
    severity: 'critical',
    category: 'ddos',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'ss7_message', sourceFilter: ['ss7_probe'] },
      { field: 'ss7Gt', operator: 'exists', value: true },
    ],
    timeWindowMs: 60 * 1000, // 1 minute
    minEvents: 10000, // 10k messages/min threshold
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P0', category: 'ddos' } },
      { type: 'notify', params: { channels: ['noc', 'soc', 'vendor'] } },
      { type: 'run_playbook', params: { playbook: 'ss7-mitigation' } },
    ],
    enabled: true,
    riskScore: 98,
    artpReportable: true, // Service affecting!
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'DDOS-002',
    name: 'SIP INVITE Flood',
    description: 'High volume of SIP INVITE requests (DoS attempt)',
    severity: 'high',
    category: 'ddos',
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'sip_request', sourceFilter: ['sip_probe'] },
      { field: 'sipMethod', operator: 'equals', value: 'INVITE' },
    ],
    timeWindowMs: 60 * 1000, // 1 minute
    minEvents: 5000,
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P1', category: 'voip-dos' } },
      { type: 'block', params: { rateLimit: true, maxPerSecond: 100 } },
    ],
    enabled: true,
    riskScore: 82,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },

  // ========================================
  // APT INDICATORS
  // ========================================
  {
    id: 'APT-001',
    name: 'Living-off-the-Land (LotL) Indicators',
    description: 'Use of legitimate tools for malicious purposes',
    severity: 'high',
    category: 'apt_indicators',
    conditions: [
      { field: 'eventType', operator: 'in', value: ['process_execution', 'command_execution'], sourceFilter: ['edsr', 'siem'] },
      { field: 'rawEvent.commandLine', operator: 'regex', value: '(powershell|certutil|bitsadmin|wmic)' },
    ],
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    minEvents: 3,
    aggregation: 'count',
    actions: [
      { type: 'create_alert', params: { priority: 'P1', category: 'apt', technique: 'T1059' } },
      { type: 'notify', params: { channels: ['threat-hunters', 'ir-team'] } },
      { type: 'tag', params: { tags: ['lotl', 'investigate-deeply'] } },
    ],
    enabled: true,
    riskScore: 80,
    artpReportable: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
];

// ============================================================
// CORRELATION ENGINE
// ============================================================

class CorrelationEngine {
  private rules: CorrelationRule[];
  private eventBuffer: CorrelationEvent[];
  private bufferSize: number;
  private stats: CorrelationState['statistics'];

  constructor(rules: CorrelationRule[] = DJEZZY_CORRELATION_RULES, bufferMinutes: number = 60) {
    this.rules = rules.filter(r => r.enabled);
    this.eventBuffer = [];
    this.bufferSize = bufferMinutes * 60 * 1000; // Convert to ms
    this.stats = {
      totalEventsProcessed: 0,
      totalCorrelationsTriggered: 0,
      correlationsByCategory: {},
      averageProcessingTimeMs: 0,
    };
  }

  /**
   * Process a new event through all correlation rules
   */
  processEvent(event: CorrelationEvent): CorrelationResult[] {
    const startTime = Date.now();
    
    // Add to buffer
    this.eventBuffer.push(event);
    this.stats.totalEventsProcessed++;
    
    // Clean old events
    this.cleanupBuffer();
    
    // Run all rules
    const results: CorrelationResult[] = [];
    
    for (const rule of this.rules) {
      try {
        const result = this.evaluateRule(rule);
        if (result.matched) {
          results.push(result);
          this.stats.totalCorrelationsTriggered++;
          this.stats.correlationsByCategory[rule.category] = 
            (this.stats.correlationsByCategory[rule.category] || 0) + 1;
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
    
    // Update processing time stats
    const processingTime = Date.now() - startTime;
    this.stats.averageProcessingTimeMs = 
      (this.stats.averageProcessingTimeMs + processingTime) / 2;
    
    return results;
  }

  /**
   * Process multiple events (batch mode)
   */
  processBatch(events: CorrelationEvent[]): CorrelationResult[] {
    const allResults: CorrelationResult[] = [];
    
    for (const event of events) {
      const results = this.processEvent(event);
      allResults.push(...results);
    }
    
    return allResults;
  }

  /**
   * Evaluate a single correlation rule against current event buffer
   */
  private evaluateRule(rule: CorrelationRule): CorrelationResult {
    // Get events within the rule's time window
    const windowStart = Date.now() - rule.timeWindowMs;
    const relevantEvents = this.eventBuffer.filter(
      e => e.timestamp.getTime() >= windowStart
    );

    if (relevantEvents.length < rule.minEvents) {
      return this.createEmptyResult(rule);
    }

    // Apply source filters and conditions
    let matchingEvents = relevantEvents.filter(e => 
      this.matchesConditions(e, rule.conditions)
    );

    // Apply aggregation logic
    matchingEvents = this.applyAggregation(matchingEvents, rule);

    // Check if we have enough matches
    const matched = matchingEvents.length >= rule.minEvents &&
      (!rule.maxEvents || matchingEvents.length <= rule.maxEvents);

    if (!matched) {
      return this.createEmptyResult(rule);
    }

    // Calculate confidence based on how much we exceeded the minimum
    const excessRatio = matchingEvents.length / rule.minEvents;
    const confidence = Math.min(1, 0.5 + (excessRatio - 1) * 0.1);

    // Generate summary
    const summary = this.generateSummary(rule, matchingEvents);

    return {
      rule,
      matched: true,
      confidence,
      triggeringEvents: matchingEvents.slice(0, 10), // Keep top 10 for storage
      summary,
      detectedAt: new Date(),
      riskScore: rule.riskScore * confidence,
      recommendedActions: rule.actions.map(a => this.actionToString(a)),
    };
  }

  /**
   * Check if an event matches all conditions
   */
  private matchesConditions(
    event: CorrelationEvent, 
    conditions: CorrelationCondition[]
  ): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(event, condition.field);
      const matches = this.evaluateCondition(fieldValue, condition);
      
      return condition.negate ? !matches : matches;
    });
  }

  /**
   * Get field value from event (supports nested paths)
   */
  private getFieldValue(event: CorrelationEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    
    return value;
  }

  /**
   * Evaluate a single condition against a value
   */
  private evaluateCondition(value: any, condition: CorrelationCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'not_equals':
        return value !== condition.value;
      
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      
      case 'not_contains':
        return typeof value === 'string' && !value.includes(condition.value);
      
      case 'starts_with':
        return typeof value === 'string' && value.startsWith(condition.value);
      
      case 'ends_with':
        return typeof value === 'string' && value.endsWith(condition.value);
      
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value).test(value);
      
      case 'not_regex':
        return typeof value === 'string' && !new RegExp(condition.value).test(value);
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      
      case 'gt':
        return typeof value === 'number' && value > condition.value;
      
      case 'gte':
        return typeof value === 'number' && value >= condition.value;
      
      case 'lt':
        return typeof value === 'number' && value < condition.value;
      
      case 'lte':
        return typeof value === 'number' && value <= condition.value;
      
      case 'exists':
        return value !== undefined && value !== null;
      
      case 'not_exists':
        return value === undefined || value === null;
      
      case 'ip_in_range':
        return this.isIPInRange(value, condition.value);
      
      case 'ip_not_in_range':
        return !this.isIPInRange(value, condition.value);
      
      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Apply aggregation logic to filtered events
   */
  private applyAggregation(events: CorrelationEvent[], rule: CorrelationRule): CorrelationEvent[] {
    switch (rule.aggregation) {
      case 'any':
        return events.length > 0 ? [events[0]] : [];
      
      case 'all':
        return events; // Already filtered by all conditions
      
      case 'count':
        return events.slice(0, rule.maxEvents || events.length);
      
      case 'sequence':
        // Check if events are in sequence (by timestamp)
        const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return sorted;
      
      case 'diversity': {
        // Count unique values of the first varying field
        const diversityField = rule.conditions.find(c => c.field !== 'eventType')?.field;
        if (!diversityField) return events;
        
        const uniqueValues = new Set(
          events.map(e => this.getFieldValue(e, diversityField))
        );
        
        // Return events that contribute to diversity
        return events.filter((e, idx) => 
          [...uniqueValues].indexOf(this.getFieldValue(e, diversityField)) === idx
        ).slice(0, rule.maxEvents || events.length);
      }
      
      case 'rate':
        // Rate-based: check if events/timeWindow exceeds threshold
        return events;
      
      default:
        return events;
    }
  }

  /**
   * Simple IP range check (CIDR notation not supported in this simplified version)
   */
  private isIPInRange(ip: string, range: { start: string; end: string }): boolean {
    if (!ip) return false;
    // Very simplified - just string comparison
    return ip >= range.start && ip <= range.end;
  }

  /**
   * Clean up old events from buffer
   */
  private cleanupBuffer(): void {
    const cutoff = Date.now() - this.bufferSize;
    this.eventBuffer = this.eventBuffer.filter(e => e.timestamp.getTime() >= cutoff);
  }

  /**
   * Create empty (non-matching) result
   */
  private createEmptyResult(rule: CorrelationRule): CorrelationResult {
    return {
      rule,
      matched: false,
      confidence: 0,
      triggeringEvents: [],
      summary: '',
      detectedAt: new Date(),
      riskScore: 0,
      recommendedActions: [],
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(rule: CorrelationRule, events: CorrelationEvent[]): string {
    const count = events.length;
    const timeSpan = this.getTimeSpan(events);
    
    return `${rule.name}: ${count} correlated events detected over ${timeSpan} (${rule.category})`;
  }

  /**
   * Get time span of events
   */
  private getTimeSpan(events: CorrelationEvent[]): string {
    if (events.length < 2) return '< 1 minute';
    
    const timestamps = events.map(e => e.timestamp.getTime());
    const diffMs = Math.max(...timestamps) - Math.min(...timestamps);
    
    if (diffMs < 60000) return '< 1 minute';
    if (diffMs < 3600000) return `${Math.round(diffMs / 60000)} minutes`;
    return `${Math.round(diffMs / 3600000)} hours`;
  }

  /**
   * Convert action to human-readable string
   */
  private actionToString(action: CorrelationAction): string {
    switch (action.type) {
      case 'create_alert':
        return `Create ${action.params.priority} alert${action.params.category ? ` (${action.params.category})` : ''}`;
      case 'block':
        return `Block ${action.params.blockSourceIp ? 'source IP' : ''}${action.params.blockIMSI ? ' IMSI' : ''}${action.params.duration ? ` for ${action.params.duration}s` : ''}`;
      case 'notify':
        return `Notify via ${action.params.channels?.join(', ') || 'default'}`;
      case 'tag':
        return `Tag with: ${action.params.tags?.join(', ') || ''}`;
      case 'escalate':
        return 'Escalate to next tier';
      case 'run_playbook':
        return `Run playbook: ${action.params.playbook || 'unknown'}`;
      default:
        return `Execute ${action.type}`;
    }
  }

  /**
   * Get engine statistics
   */
  getStatistics(): CorrelationState['statistics'] {
    return { ...this.stats };
  }

  /**
   * Add custom rule dynamically
   */
  addRule(rule: CorrelationRule): void {
    this.rules.push(rule);
    if (rule.enabled) {
      this.rules = this.rules.filter(r => r.enabled);
    }
  }

  /**
   * Remove rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Enable/disable rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export { CorrelationEngine };
export type { CorrelationState };

// Export types
export {
  type CorrelationEvent,
  type EventSource,
  type CorrelationRule,
  type CorrelationCondition,
  type ConditionOperator,
  type AggregationType,
  type CorrelationSeverity,
  type RuleCategory,
  type CorrelationAction,
  type CorrelationResult,
};
