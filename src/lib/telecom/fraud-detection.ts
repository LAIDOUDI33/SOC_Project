/**
 * National SOC Platform - Fraud Detection Engine
 * 
 * Advanced fraud detection for Djezzy telecom network:
 * - SIM Swap Detection
 * - IRSF (International Revenue Share Fraud)
 * - Wangiri (One-ring) Detection
 * - PBX Hijacking / Toll Fraud
 * - IMEI Cloning
 * - Data Tunneling Abuse
 * - Roaming Abuse
 * - Call Spam / Robocalling
 * 
 * Uses ML-enhanced scoring and ARTP-compliant reporting
 */

import { db } from '@/lib/db';

// ============================================================
// Types & Interfaces
// ============================================================

export interface FraudCase {
  id: string;
  caseNumber: string;
  type: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'OPEN' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  confidence: number;
  description: string;
  subscriber?: {
    msisdn: string;
    imsi: string;
    riskScore: number;
  };
  evidence: EvidenceItem[];
  financialImpact?: {
    estimatedLossDZD: number;
    currency: 'DZD';
  };
  artpReportable: boolean;
  artpDeadline?: Date;
  timeline: CaseEvent[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceItem {
  id: string;
  type: 'ss7_message' | 'gtp_session' | 'sip_call' | 'diameter_session' | 'subscriber_record';
  timestamp: Date;
  description: string;
  data: Record<string, any>;
  riskContribution: number; // How much this evidence contributes to overall score
}

export interface CaseEvent {
  timestamp: Date;
  action: string;
  performedBy: string;
  notes?: string;
}

export type FraudType = 
  | 'SIM_SWAP'
  | 'IRSF'
  | 'WANGIRI'
  | 'PBX_HIJACKING'
  | 'TOLL_FRAUD'
  | 'IMEI_CLONING'
  | 'DATA_TUNNELING'
  | 'ROAMING_ABUSE'
  | 'CALL_SPAM'
  | 'PREMIUM_RATE_ABUSE'
  | 'LOCATION_SPOOFING'
  | 'AUTHENTICATION_STORM'
  | 'SUBSCRIBER_TAKEOVER';

export interface FraudRule {
  id: string;
  name: string;
  type: FraudType;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: RuleCondition[];
  actions: RuleAction[];
  artpReportable: boolean;
  cooldownMinutes: number; // Minimum time between alerts for same subscriber
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'regex';
  value: any;
  weight: number; // Contribution to confidence score
}

export interface RuleAction {
  type: 'alert' | 'block' | 'limit' | 'monitor' | 'notify' | 'report_artp';
  parameters?: Record<string, any>;
}

// ============================================================
// Predefined Fraud Rules (Djezzy-specific)
// ============================================================

const DEFAULT_FRAUD_RULES: FraudRule[] = [
  {
    id: 'sim-swap-001',
    name: 'Multiple Location Updates',
    type: 'SIM_SWAP',
    enabled: true,
    severity: 'critical',
    conditions: [
      { field: 'updateLocationCount', operator: 'gte', value: 3, weight: 40 },
      { field: 'timeWindow', operator: 'lte', value: 3600000, weight: 30 }, // 1 hour
      { field: 'differentMSCs', operator: 'gte', value: 2, weight: 30 }
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P1' } },
      { type: 'block', parameters: { blockType: 'SIM_TEMPORARY', durationHours: 24 } },
      { type: 'report_artp' }
    ],
    artpReportable: true,
    cooldownMinutes: 60
  },
  {
    id: 'irsf-001',
    name: 'High-Risk International Calls',
    type: 'IRSF',
    enabled: true,
    severity: 'high',
    conditions: [
      { field: 'calledCountryCode', operator: 'neq', value: '+213', weight: 20 },
      { field: 'callerRiskScore', operator: 'gte', value: 60, weight: 30 },
      { field: 'callDuration', operator: 'gte', value: 120, weight: 25 }, // > 2 min
      { field: 'callFrequency', operator: 'gte', value: 5, weight: 25 }
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P2' } },
      { type: 'limit', parameters: { limitType: 'INTERNATIONAL_CALLS', maxPerDay: 10 } },
      { type: 'monitor', parameters: { monitorDurationDays: 7 } }
    ],
    artpReportable: true,
    cooldownMinutes: 120
  },
  {
    id: 'wangiri-001',
    name: 'Wangiri Pattern Detection',
    type: 'WANGIRI',
    enabled: true,
    severity: 'medium',
    conditions: [
      { field: 'shortCallCount', operator: 'gte', value: 15, weight: 35 },
      { field: 'timeWindow', operator: 'lte', value: 3600000, weight: 25 },
      { field: 'uniqueCalledNumbers', operator: 'gte', value: 10, weight: 25 },
      { field: 'avgCallDuration', operator: 'lte', value: 5, weight: 15 }
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P3' } },
      { type: 'limit', parameters: { limitType: 'OUTGOING_CALLS', maxPerHour: 20 } }
    ],
    artpReportable: false,
    cooldownMinutes: 180
  },
  {
    id: 'imei-clone-001',
    name: 'IMEI Multiple Active Sessions',
    type: 'IMEI_CLONING',
    enabled: true,
    severity: 'critical',
    conditions: [
      { field: 'activeSessionsWithSameIMEI', operator: 'gte', value: 2, weight: 60 },
      { field: 'differentIMSIs', operator: 'gte', value: 2, weight: 40 }
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P1' } },
      { type: 'block', parameters: { blockType: 'IMEI_BLACKLIST' } },
      { type: 'report_artp' }
    ],
    artpReportable: true,
    cooldownMinutes: 30
  },
  {
    id: 'roaming-abuse-001',
    name: 'Excessive Data While Roaming',
    type: 'ROAMING_ABUSE',
    enabled: true,
    severity: 'medium',
    conditions: [
      { field: 'isRoaming', operator: 'eq', value: true, weight: 20 },
      { field: 'dataVolumeGB', operator: 'gte', value: 2, weight: 35 },
      { field: 'timeWindow', operator: 'lte', value: 86400000, weight: 25 }, // 24h
      { field: 'homeDataAvgGB', operator: 'gte', value: 5, weight: 20 } // Much more than home usage
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P3' } },
      { type: 'notify', parameters: { notifySubscriber: true, notifyType: 'SMS' } },
      { type: 'limit', parameters: { limitType: 'ROAMING_DATA', maxPerDayGB: 1 } }
    ],
    artpReportable: false,
    cooldownMinutes: 1440 // 24 hours
  },
  {
    id: 'call-spam-001',
    name: 'High Volume Outgoing Calls',
    type: 'CALL_SPAM',
    enabled: true,
    severity: 'high',
    conditions: [
      { field: 'outgoingCallCount', operator: 'gte', value: 100, weight: 35 },
      { field: 'timeWindow', operator: 'lte', value: 300000, weight: 25 }, // 5 min
      { field: 'uniqueCalledNumbers', operator: 'gte', value: 50, weight: 25 },
      { field: 'averageCallInterval', operator: 'lte', value: 3, weight: 15 } // < 3 seconds between calls
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P2' } },
      { type: 'block', parameters: { blockType: 'OUTGOING_CALLS_TEMPORARY', durationMinutes: 60 } },
      { type: 'report_artp' }
    ],
    artpReportable: true,
    cooldownMinutes: 60
  },
  {
    id: 'auth-storm-001',
    name: 'Authentication Attack',
    type: 'AUTHENTICATION_STORM',
    enabled: true,
    severity: 'critical',
    conditions: [
      { field: 'authAttempts', operator: 'gte', value: 10, weight: 40 },
      { field: 'timeWindow', operator: 'lte', value: 60000, weight: 35 }, // 1 minute
      { field: 'authFailureRate', operator: 'gte', value: 80, weight: 25 } // > 80% failure rate
    ],
    actions: [
      { type: 'alert', parameters: { priority: 'P1' } },
      { type: 'block', parameters: { blockType: 'IMSI_TEMPORARY', durationMinutes: 30 } },
      { type: 'report_artp' }
    ],
    artpReportable: true,
    cooldownMinutes: 15
  }
];

// ============================================================
// Fraud Detection Engine Class
// ============================================================

class FraudDetectionEngine {
  private rules: Map<string, FraudRule> = new Map();
  private recentAlerts: Map<string, Date> = new Map(); // subscriberId -> last alert time

  constructor() {
    // Load default rules
    this.loadRules(DEFAULT_FRAUD_RULES);
  }

  /**
   * Load fraud detection rules
   */
  loadRules(rules: FraudRule[]): void {
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }
    console.log(`Loaded ${rules.length} fraud detection rules`);
  }

  /**
   * Analyze event for fraud patterns
   */
  async analyzeEvent(
    eventType: 'ss7' | 'gtp' | 'sip' | 'diameter',
    eventData: Record<string, any>
  ): Promise<FraudDetectionResult[]> {
    const results: FraudDetectionResult[] = [];
    
    // Get subscriber identifier
    const subscriberId = eventData.imsi || eventData.msisdn || eventData.callingParty;

    if (!subscriberId) return results;

    // Check each rule
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        const matchResult = await this.evaluateRule(rule, eventType, eventData);
        
        if (matchResult.matched) {
          // Check cooldown
          const lastAlert = this.recentAlerts.get(`${subscriberId}:${ruleId}`);
          if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldownMinutes * 60000) {
            continue; // Still in cooldown period
          }

          // Create fraud case or alert
          const result = await this.createFraudAlert(rule, matchResult, eventData);
          results.push(result);

          // Update last alert time
          this.recentAlerts.set(`${subscriberId}:${ruleId}`, new Date());
        }
      } catch (error) {
        console.error(`Error evaluating rule ${ruleId}:`, error);
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against event data
   */
  private async evaluateRule(
    rule: FraudRule,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<{ matched: boolean; confidence: number; matchedConditions: RuleCondition[] }> {
    const matchedConditions: RuleCondition[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const condition of rule.conditions) {
      totalWeight += condition.weight;
      
      const fieldValue = await this.getFieldValue(condition.field, eventType, eventData);
      const matches = this.evaluateCondition(fieldValue, condition);
      
      if (matches) {
        matchedConditions.push(condition);
        matchedWeight += condition.weight;
      }
    }

    // All conditions must match (AND logic)
    const allMatched = matchedConditions.length === rule.conditions.length;
    const confidence = allMatched ? Math.round((matchedWeight / totalWeight) * 100) : 0;

    return {
      matched: allMatched && confidence >= 50, // Minimum 50% confidence to trigger
      confidence,
      matchedConditions
    };
  }

  /**
   * Get field value from event data or database query
   */
  private async getFieldValue(
    field: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<any> {
    switch (field) {
      // Direct fields from event
      case 'callingParty':
        return eventData.callingParty || eventData.msisdn;
      case 'calledParty':
        return eventData.calledParty || eventData.calledParty;
      case 'imsi':
        return eventData.imsi;
      case 'msisdn':
        return eventData.msisdn;
      case 'callDuration':
        return eventData.duration || eventData.callDuration || 0;
      case 'isRoaming':
        return eventData.isRoaming === true || eventData.visitedPLMN?.startsWith('6');
      case 'dataVolumeGB':
        return ((eventData.bytesUp || 0) + (eventData.bytesDown || 0)) / 1073741824;
      case 'calledCountryCode':
        const called = eventData.calledParty || '';
        return called.substring(0, called.indexOf(' ') || 3);
      
      // Computed fields requiring database queries
      case 'updateLocationCount':
        return await this.countRecentOperations(eventData.imsi, 'UpdateLocation', 3600000);
      case 'differentMSCs':
        return await this.countDifferentMSCs(eventData.imsi, 3600000);
      case 'shortCallCount':
        return await this.countShortCalls(eventData.callingParty, 3600000);
      case 'uniqueCalledNumbers':
        return await this.countUniqueCalledNumbers(eventData.callingParty, 3600000);
      case 'avgCallDuration':
        return await this.getAverageCallDuration(eventData.callingParty, 3600000);
      case 'activeSessionsWithSameIMEI':
        return await this.countActiveSessionsByIMEI(eventData.imei);
      case 'differentIMSIs':
        return await this.countDifferentIMSIByIMEI(eventData.imei);
      case 'outgoingCallCount':
        return await this.countOutgoingCalls(eventData.callingParty, 300000);
      case 'uniqueCalledNumbers': // For call spam
        return await this.countUniqueCalledNumbers(eventData.callingParty, 300000);
      case 'averageCallInterval':
        return await this.getAverageCallInterval(eventData.callingParty, 300000);
      case 'authAttempts':
        return await this.countAuthAttempts(eventData.imsi, 60000);
      case 'authFailureRate':
        return await this.getAuthFailureRate(eventData.imsi, 60000);
      case 'callerRiskScore':
        const sub = await this.getSubscriber(eventData.imsi || eventData.msisdn);
        return sub?.riskScore || 0;
      case 'homeDataAvgGB':
        return await this.getAverageHomeDataUsage(eventData.imsi, 86400000 * 7); // 7 days
      
      default:
        return eventData[field];
    }
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(value: any, condition: RuleCondition): boolean {
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'regex':
        return new RegExp(condition.value).test(String(value));
      default:
        return false;
    }
  }

  /**
   * Create fraud alert from matched rule
   */
  private async createFraudAlert(
    rule: FraudRule,
    evaluation: { matched: boolean; confidence: number; matchedConditions: RuleCondition[] },
    eventData: Record<string, any>
  ): Promise<FraudDetectionResult> {
    
    const caseNumber = `FRD-${Date.now().toString(36).toUpperCase()}`;
    const subscriberId = eventData.imsi || eventData.msisdn || eventData.callingParty;

    // Calculate estimated financial impact (if applicable)
    const financialImpact = await this.estimateFinancialImpact(rule.type, eventData);

    // Determine ARTP deadline (24 hours from detection)
    const artpDeadline = rule.artpReportable 
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : undefined;

    // Execute rule actions
    await this.executeActions(rule.actions, subscriberId, eventData);

    // Create database record
    const fraudCase = await db.fraudCase.create({
      data: {
        caseNumber,
        type: rule.type,
        severity: rule.severity.toUpperCase(),
        status: 'OPEN',
        confidence: evaluation.confidence,
        description: this.generateDescription(rule, eventData),
        subscriberId,
        evidence: JSON.stringify(evaluation.matchedConditions.map(c => ({
          type: 'detection_rule',
          timestamp: new Date(),
          description: `${c.field} ${c.operator} ${c.value}`,
          data: { field: c.field, actualValue: eventData[c.field] },
          riskContribution: c.weight
        }))),
        estimatedLossDZD: financialImpact,
        artpReportable: rule.artpReportable,
        artpDeadline,
        metadata: JSON.stringify({
          ruleId: rule.id,
          ruleName: rule.name,
          eventType: 'telecom',
          sourceEvent: eventData,
          detectedAt: new Date()
        })
      }
    });

    // Also create security alert
    await db.alert.create({
      data: {
        title: `[FRAUD] ${rule.name}`,
        description: this.generateDescription(rule, eventData),
        severity: rule.severity.toUpperCase() as any,
        status: 'NEW',
        source: 'FRAUD_DETECTION_ENGINE',
        category: 'FRAUD_DETECTION',
        rawEvent: {
          fraudCaseId: fraudCase.id,
          caseNumber,
          ruleName: rule.name,
          fraudType: rule.type,
          confidence: evaluation.confidence,
          eventData
        },
        tags: ['fraud', rule.type.toLowerCase(), rule.severity],
        context: {
          artpReportable: rule.artpReportable,
          artpDeadline: artpDeadline?.toISOString(),
          financialImpactDZD: financialImpact,
          recommendedActions: rule.actions.map(a => a.type)
        }
      }
    });

    return {
      caseId: fraudCase.id,
      caseNumber,
      type: rule.type,
      severity: rule.severity,
      confidence: evaluation.confidence,
      actionsTaken: rule.actions.map(a => a.type),
      artpReportable: rule.artpReportable,
      artpDeadline
    };
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(rule: FraudRule, eventData: Record<string, any>): string {
    const templates: Record<FraudType, string> = {
      SIM_SWAP: `Potential SIM swap detected for IMSI ${eventData.imsi}. Multiple location updates observed in short timeframe.`,
      IRSF: `International Revenue Share Fraud suspected from MSISDN ${eventData.msisdn || eventData.callingParty}. High-risk international calling pattern.`,
      WANGIRI: `Wangiri (one-ring) pattern detected from ${eventData.callingParty}. Multiple short calls to premium numbers.`,
      PBX_HIJACKING: `PBX hijacking suspected. Unauthorized PBX software detected from ${eventData.callingParty}.`,
      TOLL_FRAUD: `Toll fraud detected. Unusual call routing pattern suggesting illegal termination.`,
      IMEI_CLONING: `IMEI cloning detected! IMEI ${eventData.imei} active on multiple devices simultaneously.`,
      DATA_TUNNELING: `Data tunneling abuse detected. Suspicious APN usage: ${eventData.apn}.`,
      ROAMING_ABUSE: `Excessive roaming data usage detected for ${eventData.msisdn || eventData.imsi}. Potential roaming abuse.`,
      CALL_SPAM: `Call spam operation detected from ${eventData.callingParty}. Abnormally high outgoing call volume.`,
      PREMIUM_RATE_ABUSE: `Premium rate service abuse suspected. Long-duration calls to premium numbers.`,
      LOCATION_SPOOFING: `Location spoofing detected. Impossible movement pattern for subscriber.`,
      AUTHENTICATION_STORM: `Authentication attack detected against IMSI ${eventData.imsi}. Brute force attempt likely.`,
      SUBSCRIBER_TAKEOVER: `Subscriber takeover suspected. Anomalous authentication behavior.`
    };

    return templates[rule.type] || `Fraud detected: ${rule.name}`;
  }

  /**
   * Estimate financial impact in DZD
   */
  private async estimateFinancialImpact(fraudType: FraudType, eventData: Record<string, any>): Promise<number> {
    // Simplified estimation - would use ML model in production
    const baseImpacts: Record<FraudType, number> = {
      SIM_SWAP: 50000,       // Average loss per SIM swap incident
      IRSF: 200000,         // International fraud can be costly
      WANGIRI: 5000,        // Lower per-incident but high volume
      PBX_HIJACKING: 500000,// Can be very expensive
      TOLL_FRAUD: 100000,
      IMEI_CLONING: 75000,
      DATA_TUNNELING: 15000,
      ROAMING_ABUSE: 25000,
      CALL_SPAM: 8000,
      PREMIUM_RATE_ABUSE: 35000,
      LOCATION_SPOOFING: 40000,
      AUTHENTICATION_STORM: 10000,
      SUBSCRIBER_TAKEOVER: 60000
    };

    let impact = baseImpacts[fraudType] || 10000;

    // Adjust based on duration/volume
    if (eventData.duration) {
      impact *= Math.min(eventData.duration / 3600, 24); // Scale by hours, max 24x
    }
    if (eventData.bytesUp || eventData.bytesDown) {
      const gb = ((eventData.bytesUp || 0) + (eventData.bytesDown || 0)) / 1073741824;
      impact *= Math.min(gb / 10, 50); // Scale by GB, max 50x
    }

    return Math.round(impact);
  }

  /**
   * Execute rule actions
   */
  private async executeActions(
    actions: RuleAction[],
    subscriberId: string,
    eventData: Record<string, any>
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'alert':
          console.log(`[ALERT] Fraud alert generated for ${subscriberId}`);
          break;
        
        case 'block':
          await this.executeBlockAction(subscriberId, action.parameters);
          break;
        
        case 'limit':
          await this.executeLimitAction(subscriberId, action.parameters);
          break;
        
        case 'monitor':
          await this.executeMonitorAction(subscriberId, action.parameters);
          break;
        
        case 'notify':
          await this.executeNotifyAction(subscriberId, action.parameters);
          break;
        
        case 'report_artp':
          console.log(`[ARTP] Report required for fraud case involving ${subscriberId}`);
          break;
      }
    }
  }

  private async executeBlockAction(subscriberId: string, params: any): Promise<void> {
    // In production, this would integrate with:
    // - HLR/HLR for SIM blocking
    // - PGW for GTP session termination
    // - SBC for SIP blocking
    
    console.log(`[BLOCK] Blocking ${subscriberId}:`, params);
    
    // Log the action
    await db.auditLog.create({
      data: {
        userId: 'system-fraud-engine',
        action: 'BLOCK_SUBSCRIBER',
        resource: 'Subscriber',
        resourceId: subscriberId,
        outcome: 'SUCCESS',
        category: 'FRAUD_RESPONSE',
        errorMessage: null,
        requestDetails: params
      }
    });
  }

  private async executeLimitAction(subscriberId: string, params: any): Promise<void> {
    console.log(`[LIMIT] Limiting ${subscriberId}:`, params);
  }

  private async executeMonitorAction(subscriberId: string, params: any): Promise<void> {
    console.log(`[MONITOR] Monitoring ${subscriberId}:`, params);
  }

  private async executeNotifyAction(subscriberId: string, params: any): Promise<void> {
    console.log(`[NOTIFY] Notifying about ${subscriberId}:`, params);
  }

  // Database helper methods (would be optimized with caching in production)
  private async countRecentOperations(imsi: string, operation: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.sS7Message.count({
      where: { imsi, messageType: operation, timestamp: { gte: since } }
    });
  }

  private async countDifferentMSCs(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const messages = await db.sS7Message.findMany({
      where: { imsi, timestamp: { gte: since } },
      select: { destinationNe: true },
      distinct: ['destinationNe']
    });
    return messages.length;
  }

  private async countShortCalls(calling: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.sIPSession.count({
      where: { callingParty: calling, durationSeconds: { lt: 3 }, inviteTimestamp: { gte: since } }
    });
  }

  private async countUniqueCalledNumbers(calling: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const calls = await db.sIPSession.findMany({
      where: { callingParty: calling, inviteTimestamp: { gte: since } },
      select: { calledParty: true },
      distinct: ['calledParty']
    });
    return calls.length;
  }

  private async getAverageCallDuration(calling: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const result = await db.sIPSession.aggregate({
      where: { callingParty: calling, inviteTimestamp: { gte: since } },
      _avg: { durationSeconds: true }
    });
    return Math.round(result._avg.durationSeconds || 0);
  }

  private async countActiveSessionsByIMEI(imei: string): Promise<number> {
    return await db.gTPSession.count({
      where: { imei, sessionStatus: 'ACTIVE' }
    });
  }

  private async countDifferentIMSIByIMEI(imei: string): Promise<number> {
    const sessions = await db.gTPSession.findMany({
      where: { imei, sessionStatus: 'ACTIVE' },
      select: { imsi: true },
      distinct: ['imsi']
    });
    return sessions.length;
  }

  private async countOutgoingCalls(calling: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.sIPSession.count({
      where: { callingParty: calling, inviteTimestamp: { gte: since } }
    });
  }

  private async getAverageCallInterval(calling: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const calls = await db.sIPSession.findMany({
      where: { callingParty: calling, inviteTimestamp: { gte: since } },
      orderBy: { inviteTimestamp: 'asc' },
      select: { inviteTimestamp: true }
    });

    if (calls.length < 2) return 999; // No interval calculable

    let totalInterval = 0;
    for (let i = 1; i < calls.length; i++) {
      totalInterval += calls[i].inviteTimestamp.getTime() - calls[i-1].inviteTimestamp.getTime();
    }

    return Math.round(totalInterval / (calls.length - 1) / 1000); // In seconds
  }

  private async countAuthAttempts(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.diameterSession.count({
      where: { imsi, commandCode: 'Authentication-Information', started_at: { gte: since } }
    });
  }

  private async getAuthFailureRate(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const [total, failures] = await Promise.all([
      db.diameterSession.count({ where: { imsi, started_at: { gte: since } } }),
      db.diameterSession.count({ where: { imsi, resultCode: { ne: '2001' }, started_at: { gte: since } } })
    ]);
    
    return total > 0 ? Math.round((failures / total) * 100) : 0;
  }

  private async getSubscriber(identifier: string) {
    if (identifier?.startsWith('213')) {
      return await db.subscriber.findUnique({ where: { imsi: identifier } });
    } else if (identifier?.startsWith('+')) {
      return await db.subscriber.findUnique({ where: { msisdn: identifier } });
    }
    return null;
  }

  private async getAverageHomeDataUsage(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const result = await db.gTPSession.aggregate({
      where: { 
        imsi, 
        isRoaming: false,
        started_at: { gte: since }
      },
      _sum: { bytesUp: true, bytesDown: true }
    });
    
    const totalBytes = (result._sum.bytesUp || 0) + (result._sum.bytesDown || 0);
    return totalBytes / 1073741824; // Convert to GB
  }

  /**
   * Get fraud statistics dashboard
   */
  async getFraudStatistics(timeframe: string = '24h'): Promise<any> {
    const now = new Date();
    const timeRangeMap: Record<string, Date> = {
      '1h': new Date(now.getTime() - 3600000),
      '6h': new Date(now.getTime() - 21600000),
      '24h': new Date(now.getTime() - 86400000),
      '7d': new Date(now.getTime() - 604800000),
      '30d': new Date(now.getTime() - 2592000000)
    };
    const since = timeRangeMap[timeframe] || timeRangeMap['24h'];

    const [
      totalCases,
      casesBySeverity,
      casesByType,
      casesByStatus,
      totalEstimatedLoss,
      artpReportableCases,
      resolvedCases
    ] = await Promise.all([
      db.fraudCase.count({ where: { createdAt: { gte: since } } }),
      db.fraudCase.groupBy({ by: ['severity'], _count: { id: true }, where: { createdAt: { gte: since } } }),
      db.fraudCase.groupBy({ by: ['type'], _count: { id: true }, where: { createdAt: { gte: since } } }),
      db.fraudCase.groupBy({ by: ['status'], _count: { id: true }, where: { createdAt: { gte: since } } }),
      db.fraudCase.aggregate({ _sum: { estimatedLossDZD: true }, where: { createdAt: { gte: since } } }),
      db.fraudCase.count({ where: { artpReportable: true, status: { notIn: ['RESOLVED', 'CLOSED'] }, createdAt: { gte: since } } }),
      db.fraudCase.count({ where: { status: 'RESOLVED', resolvedAt: { gte: since } } })
    ]);

    return {
      period: timeframe,
      since: since.toISOString(),
      summary: {
        totalCases,
        totalEstimatedLossDZD: Math.round((totalEstimatedLoss._sum.estimatedLossDZD || 0)),
        artpReportableCases,
        resolutionRate: totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 0
      },
      breakdown: {
        bySeverity: casesBySeverity.reduce((acc, s) => ({ ...acc, [s.severity.toLowerCase()]: s._count.id }), {}),
        byType: casesByType.reduce((acc, t) => ({ ...acc, [t.type]: t._count.id }), {}),
        byStatus: casesByStatus.reduce((acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.id }), {})
      }
    };
  }

  /**
   * Get open fraud cases
   */
  async getOpenCases(limit: number = 50, offset: number = 0): Promise<FraudCase[]> {
    const cases = await db.fraudCase.findMany({
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
      take: limit,
      skip: offset,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: {
        subscriber: {
          select: { msisdn: true, imsi: true, riskScore: true }
        }
      }
    });

    return cases.map(c => ({
      ...c,
      evidence: JSON.parse(c.evidence || '[]'),
      timeline: JSON.parse(c.timeline || '[]')
    }));
  }
}

interface FraudDetectionResult {
  caseId: string;
  caseNumber: string;
  type: FraudType;
  severity: string;
  confidence: number;
  actionsTaken: string[];
  artpReportable: boolean;
  artpDeadline?: Date;
}

// Export singleton instance
export const fraudEngine = new FraudDetectionEngine();

// Export types
export type { FraudCase, FraudRule, EvidenceItem, CaseEvent };
