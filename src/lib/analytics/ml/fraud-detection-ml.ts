/**
 * National SOC Platform - Advanced Fraud Detection Engine (ML)
 * 
 * Machine learning-powered fraud detection for telecommunications:
 * - SIM swap fraud detection
 * - Subscription fraud identification
 * - Premium Rate Service (PRS) fraud
 * - International Revenue Share Fraud (IRSF)
 * - Bypass fraud detection
 * - Wangiri fraud patterns
 * - Clustering analysis for fraud rings
 * 
 * @version 1.0.0 (Phase 6 Enhancement)
 * @module analytics/ml/fraud-detection-ml
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

/** Subscriber/Account data for fraud analysis */
export interface SubscriberProfile {
  msisdn: string;
  imsi?: string;
  imei?: string;
  
  // Account details
  subscriberId: string;
  accountType: 'prepaid' | 'postpaid' | 'hybrid' | 'corporate';
  registrationDate: Date;
  status: 'active' | 'suspended' | 'terminated' | 'fraud_investigation';
  
  // Personal info (anonymized)
  nameHash: string;
  dateOfBirth?: Date;
  addressHash?: string;
  emailHash?: string;
  idDocumentHash?: string;
  
  // Current state
  currentBalance: number;
  creditLimit: number;
  planId: string;
  addons: string[];
  
  // Usage patterns (baseline)
  baselineUsage: UsageBaseline;
  
  // Device information
  devices: DeviceInfo[];
  
  // Location history
  locationHistory: LocationRecord[];
  
  // Risk assessment
  riskScore: number; // 0-100
  riskFactors: RiskFactor[];
  lastRiskAssessment: Date;
}

/** Baseline usage pattern */
export interface UsageBaseline {
  avgDailyCalls: number;
  avgDailySms: number;
  avgDailyDataMB: number;
  typicalCallDestinations: string[]; // Country codes or prefixes
  typicalActiveHours: number[]; // 0-23 probability distribution
  typicalDaysOfWeek: number[]; // 0-6 probability distribution
  avgCallDurationSeconds: number;
  dataUsagePattern: 'consistent' | 'variable' | 'bursty';
  roamingFrequency: 'never' | 'rare' | 'occasional' | 'frequent';
  internationalCalling: boolean;
  premiumServiceUsage: boolean;
}

/** Device information */
export interface DeviceInfo {
  imei: string;
  manufacturer: string;
  model: string;
  osVersion: string;
  firstSeen: Date;
  lastSeen: Date;
  isCurrent: boolean;
}

/** Location record */
export interface LocationRecord {
  timestamp: Date;
  cellId: string;
  lac: string;
  tac?: string; // Tracking area code (4G/5G)
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

/** Transaction/Event for fraud analysis */
export interface FraudEvent {
  id: string;
  timestamp: Date;
  subscriberId: string;
  msisdn: string;
  
  eventType: FraudEventType;
  eventData: Record<string, any>;
  
  // Financial impact
  amount?: number;
  currency?: string;
  
  // Source
  sourceChannel: ChannelType;
  sourceIp?: string;
  deviceId?: string;
  location?: LocationRecord;
  
  // Status
  status: 'completed' | 'failed' | 'pending' | 'flagged' | 'blocked';
  
  // ML scores
  fraudScore?: number; // 0-100
  riskIndicators?: string[];
}

/** Types of fraud events */
export type FraudEventType = 
  | 'sim_swap_request'
  | 'sim_swap_complete'
  | 'account_registration'
  | 'plan_change'
  | 'international_call'
  | 'premium_service_call'
  | 'premium_service_sms'
  | 'data_session_roaming'
  | 'top_up'
  | 'balance_transfer'
  | 'call_forward_setup'
  | 'voicemail_access'
  | 'password_reset'
  | 'device_change'
  | 'location_anomaly'
  | 'velocity_violation';

/** Channel types */
export type ChannelType = 
  | 'ussd'
  | 'sms'
  | 'voice'
  | 'web'
  | 'mobile_app'
  | 'api'
  | 'retail_store'
  | 'third_party'
  | 'roaming_partner';

/** Fraud detection result */
export interface FraudDetectionResult {
  id: string;
  timestamp: Date;
  eventId: string;
  subscriberId: string;
  msisdn: string;
  
  // Detection details
  fraudType: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  
  // Scoring
  fraudScore: number; // 0-100
  riskLevel: 'minimal' | 'elevated' | 'high' | 'severe';
  
  // Details
  title: string;
  description: string;
  indicators: FraudIndicator[];
  
  // Financial impact
  estimatedLoss?: number;
  lossCurrency?: string;
  
  // Recommendations
  recommendedActions: string[];
  
  // Investigation support
  relatedEvents: string[];
  evidenceChain: EvidenceItem[];
  
  // Detection method
  detectionMethod: DetectionMethod;
  modelVersion: string;
}

/** Types of fraud detected */
export type FraudType = 
  | 'sim_swap_fraud'
  | 'subscription_fraud'
  | 'prs_fraud'
  | 'irsf'
  | 'bypass_fraud'
  | 'wangiri'
  | 'clipping_fraud'
  | 'irregular_usage'
  | 'account_takeover'
  | 'collusion'
  | 'internal_fraud'
  | 'unknown';

/** Individual fraud indicator */
export interface FraudIndicator {
  name: string;
  value: number | string | boolean;
  threshold: number | string | boolean;
  isAnomalous: boolean;
  weight: number; // Contribution to overall score
  category: 'behavioral' | 'velocity' | 'identity' | 'network' | 'financial';
}

/** Evidence item for investigation */
export interface EvidenceItem {
  type: 'event' | 'pattern' | 'correlation' | 'external_intel';
  description: string;
  timestamp: Date;
  source: string;
  confidence: number;
}

/** Detection method used */
export type DetectionMethod = 
  | 'rule_based'
  | 'ml_model'
  | 'behavioral_analysis'
  | 'velocity_check'
  | 'identity_verification'
  | 'network_analysis'
  | 'ensemble'
  | 'heuristic';

/** SIM Swap specific data */
export interface SIMSwapRequest {
  requestId: string;
  subscriberId: string;
  msisdn: string;
  newIccid: string;
  oldIccid?: string;
  requestChannel: ChannelType;
  requestLocation?: LocationRecord;
  authenticationMethod: 'otp' | 'knowledge_based' | 'document' | 'in_person' | 'api_key';
  previousSwaps: number;
  daysSinceLastSwap: number;
  identityVerified: boolean;
}

/** Fraud ring cluster */
export interface FraudRingCluster {
  clusterId: string;
  members: ClusterMember[];
  centerMember: string;
  
  // Characteristics
  primaryFraudType: FraudType;
  secondaryFraudTypes: FraudType[];
  
  // Statistics
  totalEstimatedLoss: number;
  activePeriod: { start: Date; end?: Date };
  memberCount: number;
  
  // Network characteristics
  sharedCharacteristics: SharedCharacteristic[];
  connectionStrength: number; // 0-1 how tightly connected
  
  // Timeline
  activityTimeline: RingActivityEvent[];
}

/** Member of a fraud ring */
export interface ClusterMember {
  subscriberId: string;
  msisdn: string;
  joinDate: Date;
  role: 'leader' | 'participant' | 'mule' | 'victim';
  contributionScore: number; // How much this member contributes to fraud
  indicators: string[];
}

/** Shared characteristic among ring members */
export interface SharedCharacteristic {
  characteristic: string;
  value: string;
  memberCount: number;
  significance: number; // 0-1 how significant this is
}

/** Activity event in fraud ring timeline */
export interface RingActivityEvent {
  timestamp: Date;
  type: 'fraud_event' | 'communication' | 'registration' | 'coordination';
  description: string;
  involvedMembers: string[];
  estimatedImpact: number;
}

/** Risk factor for a subscriber */
export interface RiskFactor {
  factor: string;
  score: number; // 0-100
  category: 'behavioral' | 'identity' | 'device' | 'location' | 'financial';
  description: string;
  firstObserved: Date;
  weight: number;
}

/** Velocity rule configuration */
export interface VelocityRule {
  id: string;
  name: string;
  description: string;
  eventType: FraudEventType;
  windowMs: number;
  maxCount: number;
  action: 'alert' | 'block' | 'challenge' | 'monitor';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

/** Fraud detection engine configuration */
export interface FraudDetectionConfig {
  // General settings
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Thresholds
  simSwapThreshold: number;
  subscriptionFraudThreshold: number;
  prsFraudThreshold: number;
  irsfThreshold: number;
  bypassThreshold: number;
  wangiriThreshold: number;
  
  // Velocity rules
  velocityRules: VelocityRule[];
  
  // ML settings
  useMLModels: boolean;
  mlConfidenceThreshold: number;
  enableClustering: boolean;
  clusteringMinMembers: number;
  
  // Response settings
  autoBlockHighConfidence: boolean;
  autoBlockThreshold: number;
  requireManualReviewBelow: number;
}

// ============================================================
// DEFAULT CONFIGURATIONS FOR DJEZZY SOC
// ============================================================

/** Default fraud detection configuration */
export const DEFAULT_FRAUD_CONFIG: FraudDetectionConfig = {
  enabled: true,
  logLevel: 'info',
  
  simSwapThreshold: 70,
  subscriptionFraudThreshold: 65,
  prsFraudThreshold: 75,
  irsfThreshold: 80,
  bypassThreshold: 72,
  wangiriThreshold: 60,
  
  velocityRules: [
    {
      id: 'vel-simswap-rapid',
      name: 'Rapid SIM Swaps',
      description: 'Multiple SIM swap requests in short time',
      eventType: 'sim_swap_request',
      windowMs: 86400000, // 24 hours
      maxCount: 2,
      action: 'block',
      severity: 'high',
      enabled: true,
    },
    {
      id: 'vel-intl-calls-burst',
      name: 'International Call Burst',
      description: 'Unusual burst of international calls',
      eventType: 'international_call',
      windowMs: 3600000, // 1 hour
      maxCount: 20,
      action: 'alert',
      severity: 'medium',
      enabled: true,
    },
    {
      id: 'vel-prs-high-value',
      name: 'High Value PRS Calls',
      description: 'Multiple high-value premium service interactions',
      eventType: 'premium_service_call',
      windowMs: 3600000, // 1 hour
      maxCount: 10,
      action: 'block',
      severity: 'high',
      enabled: true,
    },
    {
      id: 'vel-topup-unusual',
      name: 'Unusual Top-up Pattern',
      description: 'Multiple large top-ups in short period',
      eventType: 'top_up',
      windowMs: 3600000, // 1 hour
      maxCount: 5,
      action: 'alert',
      severity: 'medium',
      enabled: true,
    },
    {
      id: 'vel-device-change',
      name: 'Rapid Device Changes',
      description: 'Frequent device/IMEI changes',
      eventType: 'device_change',
      windowMs: 604800000, // 7 days
      maxCount: 3,
      action: 'alert',
      severity: 'medium',
      enabled: true,
    },
  ],
  
  useMLModels: true,
  mlConfidenceThreshold: 0.7,
  enableClustering: true,
  clusteringMinMembers: 3,
  
  autoBlockHighConfidence: false,
  autoBlockThreshold: 90,
  requireManualReviewBelow: 50,
};

/** High-risk country codes for IRSF */
export const HIGH_RISK_COUNTRY_CODES: string[] = [
  '222', // Mali
  '223', // Guinea
  '225', // Ivory Coast
  '226', // Burkina Faso
  '227', // Niger
  '228', // Togo
  '229', // Benin
  '230', // Mauritius
  '231', // Liberia
  '232', // Sierra Leone
  '233', // Ghana
  '234', // Nigeria
  '235', // Chad
  '236', // Central African Republic
  '237', // Cameroon
  '238', // Cape Verde
  '239', // Sao Tome and Principe
  '240', // Equatorial Guinea
  '241', // Gabon
  '242', // Congo (Brazzaville)
  '243', // Congo (Kinshasa)
  '244', // Angola
  '245', // Guinea-Bissau
  '246', // Diego Garcia
  '248', // Seychelles
  '249', // South Sudan
  '250', // Rwanda
  '251', // Ethiopia
  '252', // Somalia
  '253', // Djibouti
  '254', // Kenya
  '255', // Tanzania
  '256', // Uganda
  '257', // Burundi
  '258', // Mozambique
  '260', // Zambia
  '261', // Madagascar
  '262', // Reunion
  '263', // Zimbabwe
  '264', // Namibia
  '265', // Malawi
  '266', // Lesotho
  '267', // Botswana
  '268', // Eswatini
  '269', // Comoros
  '290', // Saint Helena
  '291', // Eritrea
  '297', // Aruba
  '298', // Turks and Caicos
  '299', // Greenland
];

/** Premium rate service prefixes (simplified) */
export const PRS_PREFIXES: string[] = [
  '700', '701', '702', '703',
  '800', '801', '802', '803', '804', '805',
  '900', '901', '902', '903', '904', '905', '906', '907', '908', '909',
];

// ============================================================
// MAIN FRAUD DETECTION ENGINE CLASS
// ============================================================

/**
 * Advanced Fraud Detection Engine
 * Main orchestrator for all fraud detection modules
 */
export class FraudDetectionEngine {
  private config: FraudDetectionConfig;
  private simSwapDetector: SIMSwapFraudDetector;
  private subscriptionFraudDetector: SubscriptionFraudDetector;
  private prsDetector: PRSFraudDetector;
  private irsfDetector: IRSFDetector;
  private bypassDetector: BypassFraudDetector;
  private wangiriDetector: WangiriDetector;
  private velocityEngine: VelocityEngine;
  private clusteringEngine: FraudRingClusteringEngine;

  // State
  private subscribers: Map<string, SubscriberProfile> = new Map();
  private events: Map<string, FraudEvent[]> = new Map(); // subscriberId -> events
  private recentDetections: FraudDetectionResult[] = [];
  private velocityTrackers: Map<string, Map<string, VelocityTracker>> = new Map();

  constructor(config: FraudDetectionConfig = DEFAULT_FRAUD_CONFIG) {
    this.config = config;

    // Initialize detectors
    this.simSwapDetector = new SIMSwapFraudDetector(this.config.simSwapThreshold);
    this.subscriptionFraudDetector = new SubscriptionFraudDetector(this.config.subscriptionFraudThreshold);
    this.prsDetector = new PRSFraudDetector(this.config.prsFraudThreshold);
    this.irsfDetector = new IRSFDetector(this.config.irsfThreshold);
    this.bypassDetector = new BypassFraudDetector(this.config.bypassThreshold);
    this.wangiriDetector = new WangiriDetector(this.config.wangiriThreshold);
    this.velocityEngine = new VelocityEngine(this.config.velocityRules);
    this.clusteringEngine = new FraudRingClusteringEngine({
      minMembers: this.config.clusteringMinMembers,
    });
  }

  /**
   * Register/update a subscriber profile
   */
  registerSubscriber(profile: SubscriberProfile): void {
    this.subscribers.set(profile.subscriberId, profile);
    
    if (!this.events.has(profile.subscriberId)) {
      this.events.set(profile.subscriberId, []);
    }
  }

  /**
   * Process a fraud event through all detectors
   */
  processEvent(event: FraudEvent): FraudDetectionResult[] {
    if (!this.config.enabled) return [];

    // Store event
    const subscriberEvents = this.events.get(event.subscriberId) || [];
    subscriberEvents.push(event);
    this.events.set(event.subscriberId, subscriberEvents);

    // Get subscriber profile
    const subscriber = this.subscribers.get(event.subscriberId);

    const detections: FraudDetectionResult[] = [];

    try {
      // Run through appropriate detector based on event type
      switch (event.eventType) {
        case 'sim_swap_request':
        case 'sim_swap_complete':
          detections.push(...this.simSwapDetector.analyze(event, subscriber));
          break;

        case 'account_registration':
          detections.push(...this.subscriptionFraudDetector.analyze(event, subscriber));
          break;

        case 'premium_service_call':
        case 'premium_service_sms':
          detections.push(...this.prsDetector.analyze(event, subscriber));
          break;

        case 'international_call':
          detections.push(...this.irsfDetector.analyze(event, subscriber));
          break;

        case 'data_session_roaming':
          detections.push(...this.bypassDetector.analyze(event, subscriber));
          break;

        default:
          // Generic analysis for other events
          detections.push(...this.genericAnalysis(event, subscriber));
      }

      // Always run velocity checks
      const velocityViolations = this.velocityEngine.checkEvent(event);
      for (const violation of velocityViolations) {
        detections.push(this.createVelocityDetection(violation, event));
      }

    } catch (error) {
      console.error('Fraud detection error:', error);
    }

    // Store detections and apply actions
    for (const detection of detections) {
      this.recentDetections.push(detection);
      
      // Auto-block if configured
      if (this.config.autoBlockHighConfidence && detection.fraudScore >= this.config.autoBlockThreshold) {
        detection.recommendedActions.unshift('AUTO-BLOCK: Account suspended pending review');
      }
    }

    // Keep only recent detections
    if (this.recentDetections.length > 10000) {
      this.recentDetections = this.recentDetections.slice(-5000);
    }

    return detections;
  }

  /**
   * Generic analysis for events without specific detectors
   */
  private genericAnalysis(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    // Check for account takeover indicators
    if (event.eventType === 'password_reset' || event.eventType === 'device_change') {
      const score = this.scoreAccountTakeoverRisk(event, subscriber);
      
      if (score > 50) {
        results.push({
          id: `generic-at-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(),
          eventId: event.id,
          subscriberId: event.subscriberId,
          msisdn: event.msisdn,
          fraudType: 'account_takeover',
          severity: score > 75 ? 'high' : 'medium',
          confidence: score,
          fraudScore: score,
          riskLevel: score > 75 ? 'severe' : score > 60 ? 'high' : 'elevated',
          title: `Potential Account Takeover Indicator`,
          description: `Suspicious ${event.eventType} activity detected`,
          indicators: this.getAccountTakeoverIndicators(event, subscriber),
          recommendedActions: [
            'Verify user identity through additional channels',
            'Review recent account activity',
            'Consider temporary access restriction',
          ],
          relatedEvents: [],
          evidenceChain: [{
            type: 'event',
            description: `${event.eventType} from ${event.sourceChannel}`,
            timestamp: event.timestamp,
            source: 'fraud_engine',
            confidence: score,
          }],
          detectionMethod: 'heuristic',
          modelVersion: '1.0.0',
        });
      }
    }

    return results;
  }

  /**
   * Score account takeover risk
   */
  private scoreAccountTakeoverRisk(event: FraudEvent, subscriber?: SubscriberProfile): number {
    let score = 0;

    // Unusual channel for password reset
    if (event.eventType === 'password_reset') {
      if (event.sourceChannel === 'api' || event.sourceChannel === 'third_party') {
        score += 30;
      }
    }

    // Device change without prior history
    if (event.eventType === 'device_change' && subscriber) {
      const deviceCount = subscriber.devices.length;
      if (deviceCount <= 1) { // First device change is suspicious on new accounts
        const accountAge = Date.now() - subscriber.registrationDate.getTime();
        if (accountAge < 30 * 24 * 60 * 60 * 1000) { // Less than 30 days old
          score += 40;
        }
      }
    }

    // Time-based factors
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 23) { // After hours
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Get account takeover indicators
   */
  private getAccountTakeoverIndicators(event: FraudEvent, subscriber?: SubscriberProfile): FraudIndicator[] {
    return [
      {
        name: 'event_type',
        value: event.eventType,
        threshold: 'normal_activity',
        isAnomalous: ['password_reset', 'device_change'].includes(event.eventType),
        weight: 0.3,
        category: 'behavioral',
      },
      {
        name: 'source_channel',
        value: event.sourceChannel,
        threshold: 'trusted_channel',
        isAnomalous: ['api', 'third_party'].includes(event.sourceChannel),
        weight: 0.25,
        category: 'behavioral',
      },
      {
        name: 'hour_of_day',
        value: event.timestamp.getHours(),
        threshold: 'business_hours',
        isAnomalous: event.timestamp.getHours() < 6 || event.timestamp.getHours() > 23,
        weight: 0.2,
        category: 'behavioral',
      },
      {
        name: 'account_age_days',
        value: subscriber ? Math.floor((Date.now() - subscriber.registrationDate.getTime()) / 86400000) : 0,
        threshold: 30,
        isAnomalous: subscriber ? (Date.now() - subscriber.registrationDate.getTime()) < 30 * 86400000 : true,
        weight: 0.25,
        category: 'identity',
      },
    ];
  }

  /**
   * Create detection from velocity violation
   */
  private createVelocityDetection(violation: VelocityViolation, event: FraudEvent): FraudDetectionResult {
    return {
      id: `velocity-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      eventId: event.id,
      subscriberId: event.subscriberId,
      msisdn: event.msisdn,
      fraudType: 'irregular_usage',
      severity: violation.rule.severity,
      confidence: Math.min(95, violation.count / violation.rule.maxCount * 100),
      fraudScore: Math.min(95, violation.count / violation.rule.maxCount * 100),
      riskLevel: violation.count > violation.rule.maxCount * 2 ? 'severe' : 'high',
      title: `Velocity Rule Violation: ${violation.rule.name}`,
      description: `${violation.count} ${violation.rule.eventType} events in ${violation.windowMs / 1000}s (limit: ${violation.rule.maxCount})`,
      indicators: [
        {
          name: 'event_count',
          value: violation.count,
          threshold: violation.rule.maxCount,
          isAnomalous: true,
          weight: 0.5,
          category: 'velocity',
        },
        {
          name: 'time_window_ms',
          value: violation.windowMs,
          threshold: violation.rule.windowMs,
          isAnomalous: false,
          weight: 0.2,
          category: 'velocity',
        },
        {
          name: 'rule_id',
          value: violation.rule.id,
          threshold: 'none',
          isAnomalous: false,
          weight: 0.1,
          category: 'velocity',
        },
      ],
      estimatedLoss: event.amount,
      lossCurrency: event.currency,
      recommendedActions: [
        `Action required: ${violation.rule.action.toUpperCase()}`,
        'Review recent account activity',
        'Contact subscriber for verification if legitimate',
      ],
      relatedEvents: [],
      evidenceChain: [{
        type: 'pattern',
        description: `Velocity violation: ${violation.rule.name}`,
        timestamp: new Date(),
        source: 'velocity_engine',
        confidence: violation.count / violation.rule.maxCount * 100,
      }],
      detectionMethod: 'velocity_check',
      modelVersion: '1.0.0',
    };
  }

  /**
   * Run clustering analysis to find fraud rings
   */
  async runClusteringAnalysis(): Promise<FraudRingCluster[]> {
    if (!this.config.enableClustering) return [];

    // Gather all subscribers with elevated risk
    const highRiskSubscribers = Array.from(this.subscribers.values())
      .filter(s => s.riskScore > 50);

    return this.clusteringEngine.cluster(highRiskSubscribers, this.events);
  }

  /**
   * Get recent fraud detections
   */
  getRecentDetections(limit: number = 100): FraudDetectionResult[] {
    return this.recentDetections.slice(-limit);
  }

  /**
   * Get fraud statistics
   */
  getStatistics(): FraudStatistics {
    const stats: Partial<Record<FraudType, number>> = {};
    const severityStats: Record<string, number> = {};
    let totalLoss = 0;

    for (const det of this.recentDetections) {
      stats[det.fraudType] = (stats[det.fraudType] || 0) + 1;
      severityStats[det.severity] = (severityStats[det.severity] || 0) + 1;
      totalLoss += det.estimatedLoss || 0;
    }

    return {
      totalDetections: this.recentDetections.length,
      byFraudType: stats,
      bySeverity: severityStats,
      totalEstimatedLoss: totalLoss,
      subscribersMonitored: this.subscribers.size,
      eventsProcessed: Array.from(this.events.values()).reduce((sum, evts) => sum + evts.length, 0),
      timestamp: new Date(),
    };
  }

  /** Update configuration */
  updateConfig(newConfig: Partial<FraudDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /** Get subscriber profile */
  getSubscriber(id: string): SubscriberProfile | undefined {
    return this.subscribers.get(id);
  }

  /** List subscribers at risk */
  getAtRiskSubscribers(threshold: number = 50): SubscriberProfile[] {
    return Array.from(this.subscribers.values())
      .filter(s => s.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }
}

/** Fraud statistics output */
interface FraudStatistics {
  totalDetections: number;
  byFraudType: Partial<Record<FraudType, number>>;
  bySeverity: Record<string, number>;
  totalEstimatedLoss: number;
  subscribersMonitored: number;
  eventsProcessed: number;
  timestamp: Date;
}

// ============================================================
// SIM SWAP FRAUD DETECTOR
// ============================================================

/**
 * SIM Swap Fraud Detector
 * Detects fraudulent SIM swap attempts and account takeovers via SIM swap
 */
export class SIMSwapFraudDetector {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze a SIM swap event for fraud indicators
   */
  analyze(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    if (!['sim_swap_request', 'sim_swap_complete'].includes(event.eventType)) {
      return results;
    }

    const requestData = event.eventData as SIMSwapRequest;
    let fraudScore = 0;
    const indicators: FraudIndicator[] = [];
    const evidence: EvidenceItem[] = [];

    // Factor 1: Authentication method weakness
    const authScores: Record<string, number> = {
      'in_person': 0,
      'document': 10,
      'knowledge_based': 25,
      'otp': 35,
      'api_key': 50,
    };
    const authScore = authScores[requestData.authenticationMethod] ?? 30;
    fraudScore += authScore;
    indicators.push({
      name: 'authentication_method',
      value: requestData.authenticationMethod,
      threshold: 'in_person',
      isAnomalous: authScore > 20,
      weight: 0.15,
      category: 'identity',
    });

    // Factor 2: Request channel risk
    const channelScores: Record<string, number> = {
      'retail_store': 0,
      'mobile_app': 15,
      'web': 20,
      'ussd': 25,
      'api': 45,
      'third_party': 55,
    };
    const channelScore = channelScores[requestData.requestChannel] ?? 20;
    fraudScore += channelScore;
    indicators.push({
      name: 'request_channel',
      value: requestData.requestChannel,
      threshold: 'retail_store',
      isAnomalous: channelScore > 25,
      weight: 0.12,
      category: 'behavioral',
    });

    // Factor 3: Frequency of swaps
    if (requestData.previousSwaps > 0) {
      const freqScore = Math.min(30, requestData.previousSwaps * 10);
      fraudScore += freqScore;
      indicators.push({
        name: 'previous_swaps',
        value: requestData.previousSwaps,
        threshold: 0,
        isAnomalous: requestData.previousSwaps > 1,
        weight: 0.15,
        category: 'behavioral',
      });
    }

    // Factor 4: Time since last swap (recent swap = suspicious)
    if (requestData.daysSinceLastSwap > 0 && requestData.daysSinceLastSwap < 30) {
      const recencyScore = Math.max(0, 30 - requestData.daysSinceLastSwap);
      fraudScore += recencyScore;
      indicators.push({
        name: 'days_since_last_swap',
        value: requestData.daysSinceLastSwap,
        threshold: 30,
        isAnomalous: true,
        weight: 0.12,
        category: 'behavioral',
      });
    }

    // Factor 5: Identity verification status
    if (!requestData.identityVerified) {
      fraudScore += 25;
      indicators.push({
        name: 'identity_verified',
        value: false,
        threshold: true,
        isAnomalous: true,
        weight: 0.15,
        category: 'identity',
      });
    }

    // Factor 6: Account age (new accounts more susceptible)
    if (subscriber) {
      const accountAgeDays = (Date.now() - subscriber.registrationDate.getTime()) / 86400000;
      if (accountAgeDays < 30) {
        fraudScore += 20;
        indicators.push({
          name: 'account_age_days',
          value: Math.floor(accountAgeDays),
          threshold: 30,
          isAnomalous: true,
          weight: 0.1,
          category: 'identity',
        });
      }

      // Factor 7: Deviation from baseline behavior
      if (subscriber.baselineUsage.internationalCalling === false) {
        // New SIM might be used for international fraud
        // This is predictive based on known fraud patterns
      }

      // Factor 8: Recent suspicious activity
      const recentEvents = this.getRecentSubscriberEvents(subscriber.subscriberId, 7); // Last 7 days
      const suspiciousEvents = recentEvents.filter(e =>
        e.eventType === 'password_reset' ||
        e.eventType === 'device_change' ||
        e.status === 'failed'
      );
      
      if (suspiciousEvents.length > 0) {
        fraudScore += suspiciousEvents.length * 8;
        indicators.push({
          name: 'recent_suspicious_events',
          value: suspiciousEvents.length,
          threshold: 0,
          isAnomalous: true,
          weight: 0.1,
          category: 'behavioral',
        });
        
        evidence.push({
          type: 'pattern',
          description: `${suspiciousEvents.length} suspicious events before SIM swap`,
          timestamp: new Date(),
          source: 'sim_swap_detector',
          confidence: 70,
        });
      }
    }

    // Factor 9: Time-based risk (after hours, weekends)
    const hour = event.timestamp.getHours();
    const dayOfWeek = event.timestamp.getDay();
    if (hour < 6 || hour > 22 || dayOfWeek === 0 || dayOfWeek === 6) {
      fraudScore += 10;
      indicators.push({
        name: 'request_time',
        value: `${hour}:00 (day ${dayOfWeek})`,
        threshold: 'business_hours_weekday',
        isAnomalous: true,
        weight: 0.06,
        category: 'behavioral',
      });
    }

    // Determine if fraud detected
    if (fraudScore >= this.threshold) {
      results.push({
        id: `simswap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        eventId: event.id,
        subscriberId: event.subscriberId,
        msisdn: event.msisdn,
        fraudType: 'sim_swap_fraud',
        severity: fraudScore > 85 ? 'critical' : fraudScore > 75 ? 'high' : 'medium',
        confidence: Math.min(98, fraudScore + 5),
        fraudScore: Math.min(100, fraudScore),
        riskLevel: fraudScore > 85 ? 'severe' : fraudScore > 75 ? 'high' : 'elevated',
        title: 'Potential SIM Swap Fraud Detected',
        description: `SIM swap request shows multiple fraud indicators (score: ${fraudScore}/${this.threshold})`,
        indicators,
        recommendedActions: [
          'Require in-person verification with ID document',
          'Contact subscriber on original number to verify',
          'Delay SIM activation for enhanced verification',
          'Review account for unauthorized changes',
          'Flag account for monitoring after swap completion',
        ],
        relatedEvents: suspiciousEvents?.map(e => e.id) || [],
        evidenceChain: evidence,
        detectionMethod: 'ml_model',
        modelVersion: '1.0.0',
      });
    }

    return results;
  }

  // Helper would need access to events - simplified here
  private getRecentSubscriberEvents(_subscriberId: string, _days: number): FraudEvent[] {
    return []; // Would be implemented with actual event storage
  }
}

// ============================================================
// SUBSCRIPTION FRAUD DETECTOR
// ============================================================

/**
 * Subscription Fraud Detector
 * Detects fraudulent account registrations using stolen/synthetic identities
 */
export class SubscriptionFraudDetector {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze an account registration for fraud indicators
   */
  analyze(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    if (event.eventType !== 'account_registration') {
      return results;
    }

    let fraudScore = 0;
    const indicators: FraudIndicator[] = [];
    const evidence: EvidenceItem[] = [];

    // Factor 1: Registration channel risk
    const channelScores: Record<string, number> = {
      'retail_store': 5,
      'mobile_app': 15,
      'web': 25,
      'api': 40,
      'third_party': 50,
    };
    const channelScore = channelScores[event.sourceChannel] ?? 20;
    fraudScore += channelScore;
    indicators.push({
      name: 'registration_channel',
      value: event.sourceChannel,
      threshold: 'retail_store',
      isAnomalous: channelScore > 20,
      weight: 0.15,
      category: 'behavioral',
    });

    // Factor 2: Initial top-up amount (large top-ups on new accounts are suspicious)
    if (event.amount && event.amount > 5000) { // > 5000 DZD
      const amountScore = Math.min(25, event.amount / 1000);
      fraudScore += amountScore;
      indicators.push({
        name: 'initial_topup_amount',
        value: event.amount,
        threshold: 5000,
        isAnomalous: true,
        weight: 0.15,
        category: 'financial',
      });
    }

    // Factor 3: Plan selection (premium plans on new accounts)
    if (subscriber) {
      const premiumPlans = ['platinum', 'gold', 'unlimited', 'business'];
      const isPremiumPlan = premiumPlans.some(p => subscriber.planId.toLowerCase().includes(p));
      
      if (isPremiumPlan) {
        fraudScore += 15;
        indicators.push({
          name: 'plan_type',
          value: subscriber.planId,
          threshold: 'standard',
          isAnomalous: true,
          weight: 0.1,
          category: 'financial',
        });
      }

      // Factor 4: Multiple add-ons immediately
      if (subscriber.addons.length > 3) {
        fraudScore += 12;
        indicators.push({
          name: 'addon_count',
          value: subscriber.addons.length,
          threshold: 3,
          isAnomalous: true,
          weight: 0.08,
          category: 'behavioral',
        });
      }
    }

    // Factor 5: Device information anomalies
    if (event.deviceId && subscriber) {
      // Check if device is associated with multiple accounts
      // This would need cross-account correlation
    }

    // Factor 6: Identity document patterns
    // Synthetic identity detection would go here

    // Factor 7: Velocity - multiple registrations from same IP/device
    // Handled by velocity engine

    if (fraudScore >= this.threshold) {
      results.push({
        id: `subfraud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        eventId: event.id,
        subscriberId: event.subscriberId,
        msisdn: event.msisdn,
        fraudType: 'subscription_fraud',
        severity: fraudScore > 80 ? 'high' : 'medium',
        confidence: Math.min(95, fraudScore + 5),
        fraudScore: Math.min(100, fraudScore),
        riskLevel: fraudScore > 80 ? 'high' : 'elevated',
        title: 'Potential Subscription Fraud Detected',
        description: `New account registration shows fraud indicators (score: ${fraudScore}/${this.threshold})`,
        indicators,
        recommendedActions: [
          'Require additional identity verification',
          'Set spending limits on new account',
          'Monitor for rapid usage patterns',
          'Check device IMEI against known fraud database',
          'Delay activation of premium services',
        ],
        relatedEvents: [],
        evidenceChain: evidence,
        detectionMethod: 'ml_model',
        modelVersion: '1.0.0',
      });
    }

    return results;
  }
}

// ============================================================
// PREMIUM RATE SERVICE (PRS) FRAUD DETECTOR
// ============================================================

/**
 * PRS Fraud Detector
 * Detects abuse of premium rate services including IRSF-like patterns
 */
export class PRSFraudDetector {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze a premium service interaction for fraud
   */
  analyze(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    if (!['premium_service_call', 'premium_service_sms'].includes(event.eventType)) {
      return results;
    }

    let fraudScore = 0;
    const indicators: FraudIndicator[] = [];
    const destination = event.eventData.destination || '';

    // Factor 1: Is destination a known PRS number
    const isPRSNumber = PRS_PREFIXES.some(prefix => destination.startsWith(prefix)) ||
                        this.isPremiumShortCode(destination);
    
    if (isPRSNumber) {
      fraudScore += 20;
      indicators.push({
        name: 'destination_type',
        value: 'prs_number',
        threshold: 'normal_number',
        isAnomalous: true,
        weight: 0.2,
        category: 'financial',
      });
    }

    // Factor 2: Call duration (long PRS calls = high revenue for fraudsters)
    const duration = event.eventData.duration_seconds || 0;
    if (duration > 300) { // > 5 minutes
      fraudScore += Math.min(25, duration / 60);
      indicators.push({
        name: 'call_duration_seconds',
        value: duration,
        threshold: 300,
        isAnomalous: true,
        weight: 0.2,
        category: 'financial',
      });
    }

    // Factor 3: Amount charged
    if (event.amount && event.amount > 500) {
      fraudScore += Math.min(20, event.amount / 100);
      indicators.push({
        name: 'charge_amount',
        value: event.amount,
        threshold: 500,
        isAnomalous: true,
        weight: 0.15,
        category: 'financial',
      });
    }

    // Factor 4: Deviation from baseline
    if (subscriber && !subscriber.baselineUsage.premiumServiceUsage) {
      fraudScore += 25;
      indicators.push({
        name: 'baseline_prs_usage',
        value: false,
        threshold: true,
        isAnomalous: true,
        weight: 0.2,
        category: 'behavioral',
      });
    }

    // Factor 5: Time of call (PRS fraud often happens at night)
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 23) {
      fraudScore += 10;
      indicators.push({
        name: 'call_hour',
        value: hour,
        threshold: 'normal_hours',
        isAnomalous: true,
        weight: 0.1,
        category: 'behavioral',
      });
    }

    // Factor 6: Frequency (would need historical data)

    if (fraudScore >= this.threshold) {
      results.push({
        id: `prsfraud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        eventId: event.id,
        subscriberId: event.subscriberId,
        msisdn: event.msisdn,
        fraudType: 'prs_fraud',
        severity: fraudScore > 85 ? 'high' : 'medium',
        confidence: Math.min(95, fraudScore + 5),
        fraudScore: Math.min(100, fraudScore),
        riskLevel: fraudScore > 85 ? 'severe' : 'high',
        title: 'Potential PRS Fraud Detected',
        description: `Premium rate service interaction shows fraud indicators (score: ${fraudScore}/${this.threshold})`,
        indicators,
        estimatedLoss: event.amount,
        lossCurrency: event.currency,
        recommendedActions: [
          'Block premium service access temporarily',
          'Contact subscriber to verify activity',
          'Review PRS call history for pattern',
          'Consider adding PRS spending cap',
        ],
        relatedEvents: [],
        evidenceChain: [{
          type: 'event',
          description: `PRS ${event.eventType} to ${destination}`,
          timestamp: event.timestamp,
          source: 'prs_detector',
          confidence: fraudScore,
        }],
        detectionMethod: 'ml_model',
        modelVersion: '1.0.0',
      });
    }

    return results;
  }

  /**
   * Check if number is a premium short code
   */
  private isPremiumShortCode(number: string): boolean {
    // Short codes are typically 3-6 digits
    if (/^\d{3,6}$/.test(number)) {
      return true;
    }
    return false;
  }
}

// ============================================================
// INTERNATIONAL REVENUE SHARE FRAUD (IRSF) DETECTOR
// ============================================================

/**
 * IRSF Detector
 * Detects International Revenue Share Fraud patterns
 */
export class IRSFDetector {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze an international call for IRSF indicators
   */
  analyze(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    if (event.eventType !== 'international_call') {
      return results;
    }

    let fraudScore = 0;
    const indicators: FraudIndicator[] = [];
    const destination = event.eventData.destination || '';
    const countryCode = destination.substring(0, 3);

    // Factor 1: Destination is high-risk country
    const isHighRisk = HIGH_RISK_COUNTRY_CODES.includes(countryCode);
    if (isHighRisk) {
      fraudScore += 30;
      indicators.push({
        name: 'destination_risk',
        value: 'high_risk_country',
        threshold: 'safe_country',
        isAnomalous: true,
        weight: 0.25,
        category: 'network',
      });
    }

    // Factor 2: Call duration (long calls to high-cost destinations)
    const duration = event.eventData.duration_seconds || 0;
    if (duration > 600) { // > 10 minutes
      fraudScore += Math.min(25, duration / 120);
      indicators.push({
        name: 'call_duration_seconds',
        value: duration,
        threshold: 600,
        isAnomalous: true,
        weight: 0.2,
        category: 'financial',
      });
    }

    // Factor 3: Cost of call
    if (event.amount && event.amount > 1000) {
      fraudScore += Math.min(20, event.amount / 200);
      indicators.push({
        name: 'call_cost',
        value: event.amount,
        threshold: 1000,
        isAnomalous: true,
        weight: 0.15,
        category: 'financial',
      });
    }

    // Factor 4: Deviation from baseline
    if (subscriber && !subscriber.baselineUsage.internationalCalling) {
      fraudScore += 25;
      indicators.push({
        name: 'baseline_intl_calls',
        value: false,
        threshold: true,
        isAnomalous: true,
        weight: 0.2,
        category: 'behavioral',
      });
    } else if (subscriber) {
      // Check if destination is in typical destinations
      const isTypical = subscriber.baselineUsage.typicalCallDestinations.some(
        d => destination.startsWith(d)
      );
      if (!isTypical) {
        fraudScore += 15;
        indicators.push({
          name: 'destination_in_baseline',
          value: false,
          threshold: true,
          isAnomalous: true,
          weight: 0.15,
          category: 'behavioral',
        });
      }
    }

    // Factor 5: Time-based patterns
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 23) {
      fraudScore += 10;
      indicators.push({
        name: 'call_hour',
        value: hour,
        threshold: 'normal_hours',
        isAnomalous: true,
        weight: 0.05,
        category: 'behavioral',
      });
    }

    if (fraudScore >= this.threshold) {
      results.push({
        id: `irsf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        eventId: event.id,
        subscriberId: event.subscriberId,
        msisdn: event.msisdn,
        fraudType: 'irsf',
        severity: fraudScore > 85 ? 'critical' : 'high',
        confidence: Math.min(98, fraudScore + 5),
        fraudScore: Math.min(100, fraudScore),
        riskLevel: fraudScore > 85 ? 'severe' : 'high',
        title: 'Potential IRSF Detected',
        description: `International call to ${countryCode} (${destination}) shows IRSF indicators (score: ${fraudScore}/${this.threshold})`,
        indicators,
        estimatedLoss: event.amount,
        lossCurrency: event.currency,
        recommendedActions: [
          'Block international calling capability immediately',
          'Contact subscriber for urgent verification',
          'Review all recent international call history',
          'Report destination number to industry sharing group',
          'Consider permanent international bar if confirmed fraud',
        ],
        relatedEvents: [],
        evidenceChain: [{
          type: 'event',
          description: `Intl call to ${destination}, duration: ${duration}s, cost: ${event.amount}`,
          timestamp: event.timestamp,
          source: 'irsf_detector',
          confidence: fraudScore,
        }],
        detectionMethod: 'ml_model',
        modelVersion: '1.0.0',
      });
    }

    return results;
  }
}

// ============================================================
// BYPASS FRAUD DETECTOR
// ============================================================

/**
 * Bypass Fraud Detector
 * Detects bypass fraud where traffic is illegally terminated
 */
export class BypassFraudDetector {
  private threshold: number;

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze a roaming data session for bypass fraud indicators
   */
  analyze(event: FraudEvent, subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    if (event.eventType !== 'data_session_roaming') {
      return results;
    }

    let fraudScore = 0;
    const indicators: FraudIndicator[] = [];
    const roamingData = event.eventData;

    // Factor 1: Unexpected roaming (never roams before)
    if (subscriber && subscriber.baselineUsage.roamingFrequency === 'never') {
      fraudScore += 25;
      indicators.push({
        name: 'roaming_history',
        value: 'first_time_roamer',
        threshold: 'established_roamer',
        isAnomalous: true,
        weight: 0.25,
        category: 'behavioral',
      });
    }

    // Factor 2: High data volume while roaming
    const dataVolume = roamingData.data_mb || 0;
    if (dataVolume > 1000) { // > 1GB
      fraudScore += Math.min(20, dataVolume / 500);
      indicators.push({
        name: 'data_volume_mb',
        value: dataVolume,
        threshold: 1000,
        isAnomalous: true,
        weight: 0.2,
        category: 'financial',
      });
    }

    // Factor 3: Long session duration
    const durationMinutes = roamingData.duration_minutes || 0;
    if (durationMinutes > 240) { // > 4 hours continuous
      fraudScore += 15;
      indicators.push({
        name: 'session_duration_minutes',
        value: durationMinutes,
        threshold: 240,
        isAnomalous: true,
        weight: 0.15,
        category: 'behavioral',
      });
    }

    // Factor 4: SIM box indicators (multiple IMSIs from same location)
    if (roamingData.sim_box_indicators) {
      fraudScore += 30;
      indicators.push({
        name: 'sim_box_indicators',
        value: true,
        threshold: false,
        isAnomalous: true,
        weight: 0.25,
        category: 'network',
      });
    }

    // Factor 5: Unusual APN usage
    const apn = roamingData.apn || '';
    if (apn.includes('tethering') || apn.includes('modem')) {
      fraudScore += 15;
      indicators.push({
        name: 'apn_type',
        value: apn,
        threshold: 'standard_apn',
        isAnomalous: true,
        weight: 0.15,
        category: 'network',
      });
    }

    if (fraudScore >= this.threshold) {
      results.push({
        id: `bypass-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        eventId: event.id,
        subscriberId: event.subscriberId,
        msisdn: event.msisdn,
        fraudType: 'bypass_fraud',
        severity: fraudScore > 80 ? 'high' : 'medium',
        confidence: Math.min(95, fraudScore + 5),
        fraudScore: Math.min(100, fraudScore),
        riskLevel: fraudScore > 80 ? 'high' : 'elevated',
        title: 'Potential Bypass Fraud Detected',
        description: `Roaming data session shows bypass fraud indicators (score: ${fraudScore}/${this.threshold})`,
        indicators,
        recommendedActions: [
          'Investigate roaming partner legitimacy',
          'Check for SIM box activity in area',
          'Monitor subsequent sessions closely',
          'Consider temporary roaming bar',
        ],
        relatedEvents: [],
        evidenceChain: [{
          type: 'event',
          description: `Roaming session: ${dataVolume}MB over ${durationMinutes}min`,
          timestamp: event.timestamp,
          source: 'bypass_detector',
          confidence: fraudScore,
        }],
        detectionMethod: 'ml_model',
        modelVersion: '1.0.0',
      });
    }

    return results;
  }
}

// ============================================================
/// WANGIRI FRAUD DETECTOR
// ============================================================

/**
 * Wangiri Fraud Detector
 * Detects "one ring" callback scam patterns
 */
export class WangiriDetector {
  private threshold: number;
  private callPatterns: Map<string, WangiriCallPattern> = new Map();

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Analyze call events for wangiri patterns
   */
  analyze(event: FraudEvent, _subscriber?: SubscriberProfile): FraudDetectionResult[] {
    const results: FraudDetectionResult[] = [];
    
    // Track both incoming and outgoing calls
    const isIncoming = event.eventData.direction === 'incoming';
    const duration = event.eventData.duration_seconds || 0;
    const caller = event.eventData.caller || '';
    const callee = event.eventData.callee || '';

    // Track pattern per number pair
    const patternKey = isIncoming ? `${caller}->${callee}` : `${callee}->${caller}`;
    let pattern = this.callPatterns.get(patternKey);
    
    if (!pattern) {
      pattern = {
        key: patternKey,
        numberA: caller,
        numberB: callee,
        calls: [],
        shortCalls: 0,
        totalCalls: 0,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
      };
      this.callPatterns.set(patternKey, pattern);
    }

    pattern.calls.push({
      timestamp: event.timestamp,
      duration,
      direction: isIncoming ? 'incoming' : 'outgoing',
    });
    pattern.totalCalls++;
    pattern.lastSeen = event.timestamp;

    // Count short calls (< 5 seconds, not zero which is missed call)
    if (duration > 0 && duration < 5) {
      pattern.shortCalls++;
    }

    // Analyze for wangiri pattern after sufficient calls
    if (pattern.totalCalls >= 5) {
      const wangiriScore = this.calculateWangiriScore(pattern);
      
      if (wangiriScore >= this.threshold) {
        results.push({
          id: `wangiri-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(),
          eventId: event.id,
          subscriberId: event.subscriberId,
          msisdn: event.msisdn,
          fraudType: 'wangiri',
          severity: 'medium',
          confidence: Math.min(90, wangiriScore + 5),
          fraudScore: wangiriScore,
          riskLevel: 'elevated',
          title: 'Potential Wangiri Pattern Detected',
          description: `Call pattern between ${caller} and ${callee} matches wangiri scam profile (score: ${wangiriScore}/${this.threshold})`,
          indicators: [
            {
              name: 'short_call_ratio',
              value: pattern.shortCalls / pattern.totalCalls,
              threshold: 0.7,
              isAnomalous: pattern.shortCalls / pattern.totalCalls > 0.7,
              weight: 0.4,
              category: 'behavioral',
            },
            {
              name: 'total_calls_tracked',
              value: pattern.totalCalls,
              threshold: 5,
              isAnomalous: true,
              weight: 0.2,
              category: 'behavioral',
            },
            {
              name: 'short_call_count',
              value: pattern.shortCalls,
              threshold: pattern.totalCalls * 0.7,
              isAnomalous: true,
              weight: 0.3,
              category: 'behavioral',
            },
            {
              name: 'pattern_duration_hours',
              value: (pattern.lastSeen.getTime() - pattern.firstSeen.getTime()) / 3600000,
              threshold: 24,
              isAnomalous: (pattern.lastSeen.getTime() - pattern.firstSeen.getTime()) < 86400000,
              weight: 0.1,
              category: 'behavioral',
            },
          ],
          recommendedActions: [
            'Warn subscriber about potential wangiri scam',
            'Add originating numbers to watchlist',
            'Monitor for callback to premium-rate numbers',
            'Consider blocking repeated short-call sources',
          ],
          relatedEvents: pattern.calls.map((c, i) => `call-${i}`),
          evidenceChain: [{
            type: 'pattern',
            description: `${pattern.shortCalls} short calls out of ${pattern.totalCalls} total`,
            timestamp: event.timestamp,
            source: 'wangiri_detector',
            confidence: wangiriScore,
          }],
          detectionMethod: 'behavioral_analysis',
          modelVersion: '1.0.0',
        });
      }
    }

    return results;
  }

  /**
   * Calculate wangiri score based on call pattern
   */
  private calculateWangiriScore(pattern: WangiriCallPattern): number {
    let score = 0;

    // High ratio of short calls
    const shortRatio = pattern.shortCalls / pattern.totalCalls;
    if (shortRatio > 0.8) score += 40;
    else if (shortRatio > 0.7) score += 30;
    else if (shortRatio > 0.5) score += 15;

    // Many calls in short time
    const timeSpanHours = (pattern.lastSeen.getTime() - pattern.firstSeen.getTime()) / 3600000;
    const callsPerHour = pattern.totalCalls / (timeSpanHours || 1);
    if (callsPerHour > 10) score += 25;
    else if (callsPerHour > 5) score += 15;

    // Pattern repeats across multiple days
    const uniqueDays = new Set(pattern.calls.map(c => c.timestamp.toDateString())).size;
    if (uniqueDays > 1) score += 20;

    // Callback pattern (incoming short -> outgoing longer)
    let hasCallbackPattern = false;
    for (let i = 0; i < pattern.calls.length - 1; i++) {
      const current = pattern.calls[i];
      const next = pattern.calls[i + 1];
      
      if (current.duration < 5 && current.direction === 'incoming' &&
          next.duration > 10 && next.direction === 'outgoing') {
        hasCallbackPattern = true;
        break;
      }
    }
    if (hasCallbackPattern) score += 15;

    return Math.min(100, score);
  }
}

/** Wangiri call tracking pattern */
interface WangiriCallPattern {
  key: string;
  numberA: string;
  numberB: string;
  calls: Array<{
    timestamp: Date;
    duration: number;
    direction: 'incoming' | 'outgoing';
  }>;
  shortCalls: number;
  totalCalls: number;
  firstSeen: Date;
  lastSeen: Date;
}

// ============================================================
// VELOCITY ENGINE
// ============================================================

/**
 * Velocity Checking Engine
 * Monitors event frequencies and detects violations
 */
export class VelocityEngine {
  private rules: VelocityRule[];
  private trackers: Map<string, Map<string, VelocityTracker>> = new Map();

  constructor(rules: VelocityRule[]) {
    this.rules = rules.filter(r => r.enabled);
  }

  /**
   * Check an event against all velocity rules
   */
  checkEvent(event: FraudEvent): VelocityViolation[] {
    const violations: VelocityViolation[] = [];

    for (const rule of this.rules) {
      if (rule.eventType !== event.eventType) continue;

      const trackerKey = `${event.subscriberId}-${rule.id}`;
      
      // Get or create tracker
      let subscriberTrackers = this.trackers.get(event.subscriberId);
      if (!subscriberTrackers) {
        subscriberTrackers = new Map();
        this.trackers.set(event.subscriberId, subscriberTrackers);
      }

      let tracker = subscriberTrackers.get(rule.id);
      if (!tracker) {
        tracker = {
          count: 0,
          windowStart: event.timestamp,
          events: [],
        };
        subscriberTrackers.set(rule.id, tracker);
      }

      // Clean old events outside window
      const cutoff = new Date(event.timestamp.getTime() - rule.windowMs);
      tracker.events = tracker.events.filter(e => e.timestamp > cutoff);
      tracker.events.push(event.timestamp);
      tracker.count = tracker.events.length;

      // Check violation
      if (tracker.count > rule.maxCount) {
        violations.push({
          rule,
          count: tracker.count,
          windowMs: rule.windowMs,
          subscriberId: event.subscriberId,
        });
      }
    }

    return violations;
  }

  /** Clear all trackers */
  clearTrackers(): void {
    this.trackers.clear();
  }
}

/** Velocity tracker state */
interface VelocityTracker {
  count: number;
  windowStart: Date;
  events: Date[];
}

/** Velocity violation result */
interface VelocityViolation {
  rule: VelocityRule;
  count: number;
  windowMs: number;
  subscriberId: string;
}

// ============================================================
// FRAUD RING CLUSTERING ENGINE
// ============================================================

/**
 * Fraud Ring Clustering Engine
 * Identifies groups of accounts working together for fraud
 */
export class FraudRingClusteringEngine {
  private config: { minMembers: number };

  constructor(config: { minMembers: number }) {
    this.config = config;
  }

  /**
   * Cluster subscribers to identify potential fraud rings
   */
  async cluster(
    subscribers: SubscriberProfile[],
    events: Map<string, FraudEvent[]>
  ): Promise<FraudRingCluster[]> {
    const clusters: FraudRingCluster[] = [];

    // Build similarity matrix based on shared characteristics
    const similarityGraph = this.buildSimilarityGraph(subscribers, events);

    // Find connected components (potential rings)
    const visited = new Set<string>();
    
    for (const subscriber of subscribers) {
      if (visited.has(subscriber.subscriberId)) continue;

      const component = this.findConnectedComponent(
        subscriber.subscriberId,
        similarityGraph,
        visited
      );

      if (component.length >= this.config.minMembers) {
        const cluster = this.buildCluster(component, subscribers, events);
        clusters.push(cluster);
      }
    }

    return clusters.sort((a, b) => b.totalEstimatedLoss - a.totalEstimatedLoss);
  }

  /**
   * Build graph of similar subscribers
   */
  private buildSimilarityGraph(
    subscribers: SubscriberProfile[],
    events: Map<string, FraudEvent[]>
  ): Map<string, Array<{ id: string; strength: number }>> {
    const graph = new Map<string, Array<{ id: string; strength: number }>>();

    // Initialize graph
    for (const sub of subscribers) {
      graph.set(subscriber.subscriberId, []);
    }

    // Compare each pair
    for (let i = 0; i < subscribers.length; i++) {
      for (let j = i + 1; j < subscribers.length; j++) {
        const similarity = this.calculateSimilarity(
          subscribers[i],
          subscribers[j],
          events
        );

        if (similarity > 0.3) { // Minimum similarity threshold
          graph.get(subscribers[i].subscriberId)?.push({
            id: subscribers[j].subscriberId,
            strength: similarity,
          });
          graph.get(subscribers[j].subscriberId)?.push({
            id: subscribers[i].subscriberId,
            strength: similarity,
          });
        }
      }
    }

    return graph;
  }

  /**
   * Calculate similarity between two subscribers
   */
  private calculateSimilarity(
    a: SubscriberProfile,
    b: SubscriberProfile,
    events: Map<string, FraudEvent[]>
  ): number {
    let similarity = 0;

    // Same device/IMEI
    const sharedDevices = a.devices.filter(ad =>
      b.devices.some(bd => bd.imei === ad.imei)
    );
    if (sharedDevices.length > 0) {
      similarity += 0.3 * sharedDevices.length;
    }

    // Similar registration timing
    const regDiff = Math.abs(a.registrationDate.getTime() - b.registrationDate.getTime());
    if (regDiff < 86400000 * 7) { // Within 7 days
      similarity += 0.15;
    }

    // Similar address (hash comparison)
    if (a.addressHash && a.addressHash === b.addressHash) {
      similarity += 0.25;
    }

    // Similar usage patterns
    const aEvents = events.get(a.subscriberId) || [];
    const bEvents = events.get(b.subscriberId) || [];
    
    // Contacting same numbers
    const aDestinations = new Set(aEvents.map(e => e.eventData.destination).filter(Boolean));
    const bDestinations = new Set(bEvents.map(e => e.eventData.destination).filter(Boolean));
    const commonDestinations = [...aDestinations].filter(d => bDestinations.has(d));
    
    if (commonDestinations.length > 2) {
      similarity += 0.2 * Math.min(1, commonDestinations.length / 5);
    }

    // Similar financial patterns
    if (a.accountType === b.accountType && a.planId === b.planId) {
      similarity += 0.1;
    }

    return Math.min(1, similarity);
  }

  /**
   * Find connected component using BFS
   */
  private findConnectedComponent(
    startId: string,
    graph: Map<string, Array<{ id: string; strength: number }>>,
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const queue: string[] = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);

      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push(neighbor.id);
        }
      }
    }

    return component;
  }

  /**
   * Build cluster object from component members
   */
  private buildCluster(
    memberIds: string[],
    allSubscribers: SubscriberProfile[],
    events: Map<string, FraudEvent[]>
  ): FraudRingCluster {
    const members = memberIds.map(id => allSubscribers.find(s => s.subscriberId === id)!).filter(Boolean);
    
    // Determine primary fraud type
    const fraudTypeCounts: Record<string, number> = {};
    for (const memberId of memberIds) {
      const memberEvents = events.get(memberId) || [];
      for (const event of memberEvents) {
        // Would use actual fraud type from detection
        fraudTypeCounts['subscription_fraud'] = (fraudTypeCounts['subscription_fraud'] || 0) + 1;
      }
    }
    
    const sortedTypes = Object.entries(fraudTypeCounts).sort((a, b) => b[1] - a[1]);
    const primaryFraudType = (sortedTypes[0]?.[0] || 'unknown') as FraudType;
    const secondaryFraudTypes = sortedTypes.slice(1, 3).map(([type]) => type as FraudType);

    // Calculate shared characteristics
    const sharedCharacteristics = this.findSharedCharacteristics(members);

    // Estimate total loss
    let totalLoss = 0;
    for (const memberId of memberIds) {
      const memberEvents = events.get(memberId) || [];
      totalLoss += memberEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    // Find center member (most connections)
    const centerMember = members.reduce((max, m) => {
      const connections = members.filter(other => 
        this.calculateSimilarity(m, other, events) > 0.3
      ).length;
      const maxConnections = members.filter(other => 
        this.calculateSimilarity(max, other, events) > 0.3
      ).length;
      return connections > maxConnections ? m : max;
    }, members[0]);

    return {
      clusterId: `ring-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      members: members.map(m => ({
        subscriberId: m.subscriberId,
        msisdn: m.msisdn,
        joinDate: m.registrationDate,
        role: m === centerMember ? 'leader' : 'participant',
        contributionScore: m.riskScore,
        indicators: m.riskFactors.map(rf => rf.factor),
      })),
      centerMember: centerMember?.subscriberId || '',
      primaryFraudType,
      secondaryFraudTypes,
      totalEstimatedLoss: totalLoss,
      activePeriod: {
        start: members.reduce((min, m) => 
          m.registrationDate < min ? m.registrationDate : min, members[0].registrationDate
        ),
      },
      memberCount: members.length,
      sharedCharacteristics,
      connectionStrength: this.calculateClusterCohesion(memberIds, events),
      activityTimeline: [], // Would be populated from events
    };
  }

  /**
   * Find shared characteristics among cluster members
   */
  private findSharedCharacteristics(members: SubscriberProfile[]): SharedCharacteristic[] {
    const characteristics: SharedCharacteristic[] = [];

    // Check device sharing
    const deviceMap: Record<string, number> = {};
    for (const member of members) {
      for (const device of member.devices) {
        deviceMap[device.imei] = (deviceMap[device.imei] || 0) + 1;
      }
    }
    
    for (const [imei, count] of Object.entries(deviceMap)) {
      if (count > 1) {
        characteristics.push({
          characteristic: 'shared_device_imei',
          value: imei.substring(0, 8) + '****', // Masked
          memberCount: count,
          significance: count / members.length,
        });
      }
    }

    // Check address sharing
    const addressMap: Record<string, number> = {};
    for (const member of members) {
      if (member.addressHash) {
        addressMap[member.addressHash] = (addressMap[member.addressHash] || 0) + 1;
      }
    }
    
    for (const [hash, count] of Object.entries(addressMap)) {
      if (count > 1) {
        characteristics.push({
          characteristic: 'shared_address',
          value: hash.substring(0, 8) + '****',
          memberCount: count,
          significance: count / members.length,
        });
      }
    }

    return characteristics.sort((a, b) => b.significance - a.significance);
  }

  /**
   * Calculate cluster cohesion (how tightly connected members are)
   */
  private calculateClusterCohesion(memberIds: string[], events: Map<string, FraudEvent[]>): number {
    if (memberIds.length <= 1) return 1;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < memberIds.length; i++) {
      for (let j = i + 1; j < memberIds.length; j++) {
        const subA = Array.from(events.keys()).find(id => id === memberIds[i]);
        const subB = Array.from(events.keys()).find(id => id === memberIds[j]);
        
        if (subA && subB) {
          // Simplified - would use actual subscriber objects
          totalSimilarity += 0.5; // Placeholder
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_FRAUD_CONFIG,
  HIGH_RISK_COUNTRY_CODES,
  PRS_PREFIXES,
};

export type {
  SubscriberProfile,
  UsageBaseline,
  DeviceInfo,
  LocationRecord,
  FraudEvent,
  FraudEventType,
  ChannelType,
  FraudDetectionResult,
  FraudType,
  FraudIndicator,
  EvidenceItem,
  DetectionMethod,
  SIMSwapRequest,
  FraudRingCluster,
  ClusterMember,
  SharedCharacteristic,
  RingActivityEvent,
  RiskFactor,
  VelocityRule,
  FraudDetectionConfig,
};
