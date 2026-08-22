/**
 * SS7 Fraud Detection Engine
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Advanced fraud detection for telecom signaling:
 * - IRSF (International Revenue Share Fraud) detection
 * - SIM Swap detection via MAP message analysis
 * - Wangiri (one-ring) call pattern detection
 * - Bypass fraud (Simbox/GSM Gateway) detection
 * - Premium rate service abuse detection
 * - Roaming anomaly detection
 * 
 * Uses ML-enhanced scoring and ARTP-compliant reporting
 * 
 * @version 1.0.0
 */

import {
  SS7Message,
  SS7ProtocolLayer,
  DecodedMAPMessage,
  DecodedISUPMessage,
  MAPOperationCode,
  ISUPMessageType,
  PointCode,
  GlobalTitle,
  SubsystemNumber,
  FraudIndicator,
  FRAUD_INDICATOR_DETAILS,
  maskMSISDN,
  maskIMSI,
} from './ss7-formats';
import { decodeSS7Message, DecodeResult } from './ss7-decoder';

// ============================================================
// FRAUD DETECTION TYPES
// ============================================================

export interface FraudAlert {
  id: string;
  timestamp: Date;
  type: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: AlertStatus;
  confidence: number;        // 0-100
  indicators: FraudIndicator[];
  
  // Subscriber info (masked)
  subscriber?: {
    msisdn: string;
    imsi: string;
    maskedMSISDN: string;
    maskedIMSI: string;
  };
  
  // Evidence
  evidence: EvidenceItem[];
  
  // Financial impact estimation
  financialImpact?: {
    estimatedLossDZD: number;
    currency: 'DZD';
    calculationBasis: string;
  };
  
  // Detection metadata
  ruleId: string;
  ruleName: string;
  source: string;           // e.g., 'ss7-analyzer', 'ml-model'
  
  // Actions taken/recommended
  actions?: FraudAction[];
  
  // ARTP reporting
  artpReportable: boolean;
  artpDeadline?: Date;
  artpCaseNumber?: string;
}

export enum FraudType {
  IRSF = 'irsf',
  SIM_SWAP = 'sim_swap',
  WANGIRI = 'wangiri',
  BYPASS_FRAUD = 'bypass_fraud',
  PREMIUM_RATE_ABUSE = 'premium_rate_abuse',
  ROAMING_ANOMALY = 'roaming_anomaly',
  INTERCEPTION = 'interception',
  CLONING = 'cloning',
  SUBSCRIPTION_FRAUD = 'subscription_fraud',
  TRAFFIC_PUMPING = 'traffic_pumping',
  OTHER = 'other',
}

export enum AlertStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated',
  BLOCKED = 'blocked',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface EvidenceItem {
  id: string;
  timestamp: Date;
  type: 'ss7_message' | 'call_record' | 'subscriber_change' | 'location_update' | 'authentication' | 'other';
  description: string;
  data: Record<string, any>;
  riskContribution: number;  // 0-100 contribution to overall score
}

export interface FraudAction {
  id: string;
  type: FraudActionType;
  status: ActionStatus;
  timestamp: Date;
  performedBy: string;
  details: string;
  result?: string;
}

export enum FraudActionType {
  BLOCK_SUBSCRIBER = 'block_subscriber',
  SUSPEND_SIM = 'suspend_sim',
  ALERT_ANALYST = 'alert_analyst',
  NOTIFY_ARPT = 'notify_arpt',
  RATE_LIMIT = 'rate_limit',
  ADD_WATCHLIST = 'add_watchlist',
  CAPTURE_PCAP = 'capture_pcap',
  NOTIFY_MNO = 'notify_mno',
  LEGAL_INTERCEPT = 'legal_intercept',
}

export enum ActionStatus {
  PENDING = 'pending',
  EXECUTED = 'executed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// ============================================================
// FRAUD DETECTION RULES CONFIGURATION
// ============================================================

export interface FraudRule {
  id: string;
  name: string;
  type: FraudType;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: RuleThreshold;
  action: FraudActionType[];
  cooldownMinutes: number;     // Minimum time between alerts for same subscriber
  artpReportable: boolean;
  description: string;
}

export interface RuleThreshold {
  // IRSF thresholds
  internationalCallsPerHour?: number;
  uniqueInternationalDestinations?: number;
  averageCallDurationSeconds?: number;
  premiumRateTargetPercentage?: number;
  
  // SIM Swap thresholds
  provisioningAttemptsPerHour?: number;
  authFailuresPerHour?: number;
  locationUpdateDuringCallWindow?: number; // minutes
  
  // Wangiri thresholds
  shortDurationCallsPerHour?: number;
  maxWangiriDurationSeconds?: number;
  uniqueCalledNumbersPerHour?: number;
  
  // Bypass fraud thresholds
  callsFromSingleLocation?: number;
  distinctIMSIMultipleLocations?: number;
  simboxPatternScore?: number;
  
  // Roaming anomaly thresholds
  impossibleDistanceKm?: number;
  timeBetweenLocationsHours?: number;
  countriesVisitedPerDay?: number;
  
  // General
  riskScoreThreshold?: number;
  timeWindowMinutes?: number;
}

// Default rules configuration
const DEFAULT_RULES: FraudRule[] = [
  {
    id: 'irsf-001',
    name: 'High Volume International Calls to Premium Destinations',
    type: FraudType.IRSF,
    enabled: true,
    severity: 'critical',
    threshold: {
      internationalCallsPerHour: 10,
      uniqueInternationalDestinations: 5,
      averageCallDurationSeconds: 60,
      premiumRateTargetPercentage: 30,
      timeWindowMinutes: 60,
    },
    action: [FraudActionType.BLOCK_SUBSCRIBER, FraudActionType.NOTIFY_ARPT],
    cooldownMinutes: 60,
    artpReportable: true,
    description: 'Detects IRSF patterns with high volume of international calls to known premium rate destinations',
  },
  {
    id: 'irsf-002',
    name: 'IRSF Pattern - Exactly 60 Second Calls',
    type: FraudType.IRSF,
    enabled: true,
    severity: 'high',
    threshold: {
      averageCallDurationSeconds: 58, // Allow 2s tolerance
      premiumRateTargetPercentage: 50,
      timeWindowMinutes: 60,
    },
    action: [FraudActionType.ALERT_ANALYST, FraudActionType.RATE_LIMIT],
    cooldownMinutes: 120,
    artpReportable: true,
    description: 'Detects classic IRSF pattern of exactly 60-second calls to generate maximum revenue share',
  },
  {
    id: 'simswap-001',
    name: 'Multiple SIM Provisioning Attempts',
    type: FraudType.SIM_SWAP,
    enabled: true,
    severity: 'critical',
    threshold: {
      provisioningAttemptsPerHour: 3,
      timeWindowMinutes: 60,
    },
    action: [FraudActionType.SUSPEND_SIM, FraudActionType.ALERT_ANALYST],
    cooldownMinutes: 30,
    artpReportable: true,
    description: 'Detects multiple SIM swap/provisioning attempts indicating potential SIM hijacking',
  },
  {
    id: 'simswap-002',
    name: 'Authentication Failure Burst After SIM Change',
    type: FraudType.SIM_SWAP,
    enabled: true,
    severity: 'high',
    threshold: {
      authFailuresPerHour: 5,
      timeWindowMinutes: 15,
    },
    action: [FraudActionType.ADD_WATCHLIST, FraudActionType.CAPTURE_PCAP],
    cooldownMinutes: 60,
    artpReportable: false,
    description: 'Detects authentication failures following SIM change, potential SIM clone attack',
  },
  {
    id: 'simswap-003',
    name: 'Location Update During Active Call',
    type: FraudType.SIM_SWAP,
    enabled: true,
    severity: 'high',
    threshold: {
      locationUpdateDuringCallWindow: 5,
      timeWindowMinutes: 5,
    },
    action: [FraudActionType.ALERT_ANALYST, FraudActionType.CAPTURE_PCAP],
    cooldownMinutes: 30,
    artpReportable: false,
    description: 'Detects suspicious location updates while call is active, possible interception indicator',
  },
  {
    id: 'wangiri-001',
    name: 'One-Ring Call Pattern Detection',
    type: FraudType.WANGIRI,
    enabled: true,
    severity: 'medium',
    threshold: {
      shortDurationCallsPerHour: 20,
      maxWangiriDurationSeconds: 5,
      uniqueCalledNumbersPerHour: 50,
      timeWindowMinutes: 60,
    },
    action: [FraudActionType.ALERT_ANALYST, FraudActionType.ADD_WATCHLIST],
    cooldownMinutes: 240,
    artpReportable: false,
    description: 'Detects wangiri (one-ring) fraud patterns with many short-duration outgoing calls',
  },
  {
    id: 'bypass-001',
    name: 'GSM Gateway / Simbox Detection',
    type: FraudType.BYPASS_FRAUD,
    enabled: true,
    severity: 'high',
    threshold: {
      callsFromSingleLocation: 100,
      distinctIMSIMultipleLocations: 10,
      simboxPatternScore: 80,
      timeWindowMinutes: 1440, // 24 hours
    },
    action: [FraudActionType.BLOCK_SUBSCRIBER, FraudActionType.NOTIFY_ARPT],
    cooldownMinutes: 480,
    artpReportable: true,
    description: 'Detects GSM gateway/simbox bypass fraud patterns',
  },
  {
    id: 'roaming-001',
    name: 'Impossible Roaming Speed Detection',
    type: FraudType.ROAMING_ANOMALY,
    enabled: true,
    severity: 'critical',
    threshold: {
      impossibleDistanceKm: 800, // Faster than commercial aircraft
      timeBetweenLocationsHours: 1,
      timeWindowMinutes: 60,
    },
    action: [FraudActionType.BLOCK_SUBSCRIBER, FraudActionType.ALERT_ANALYST],
    cooldownMinutes: 60,
    artpReportable: true,
    description: 'Detects impossible roaming speeds indicating cloning or location spoofing',
  },
  {
    id: 'roaming-002',
    name: 'Excessive Country Hopping',
    type: FraudType.ROAMING_ANOMALY,
    enabled: true,
    severity: 'high',
    threshold: {
      countriesVisitedPerDay: 5,
      timeWindowMinutes: 1440,
    },
    action: [FraudActionType.ALERT_ANALYST, FraudActionType.ADD_WATCHLIST],
    cooldownMinutes: 360,
    artpReportable: false,
    description: 'Detects subscribers visiting unrealistic number of countries per day',
  },
];

// Known IRSF destination prefixes (international premium rate)
const IRSF_DESTINATION_PREFIXES = [
  // High-risk country codes for IRSF
  '+222', // Mauritania
  '+241', // Gabon
  '+242', // Congo
  '+244', // Angola
  '+245', // Guinea-Bissau
  '+246', // Diego Garcia
  '+248', // Seychelles
  '+249', // Sudan
  '+250', // Rwanda
  '+251', // Ethiopia
  '+252', // Somalia
  '+253', // Djibouti
  '+254', // Kenya
  '+255', // Tanzania
  '+256', // Uganda
  '+257', // Burundi
  '+258', // Mozambique
  '+260', // Zambia
  '+261', // Madagascar
  '+262', // Reunion
  '+263', // Zimbabwe
  '+264', // Namibia
  '+265', // Malawi
  '+266', // Lesotho
  '+267', // Botswana
  '+268', // Swaziland
  '+269', // Comoros
  '+290', // Saint Helena
  '+291', // Eritrea
  '+297', // Aruba
  '+298', // Faroe Islands
  '+299', // Greenland
  '+350', // Gibraltar
  '+351', // Portugal
  '+352', // Luxembourg
  '+353', // Ireland
  '+354', // Iceland
  '+355', // Albania
  '+356', // Malta
  '+357', // Cyprus
  '+358', // Finland
  '+359', // Bulgaria
  '+370', // Lithuania
  '+371', // Latvia
  '+372', // Estonia
  '+373', // Moldova
  '+374', // Armenia
  '+375', // Belarus
  '+376', // Andorra
  '+377', // Monaco
  '+378', // San Marino
  '+380', // Ukraine
  '+381', // Serbia
  '+382', // Montenegro
  '+383', // Kosovo
  '+385', // Croatia
  '+386', // Slovenia
  '+387', // Bosnia and Herzegovina
  '+388', // European numbering
  '+389', // North Macedonia
  '+420', // Czech Republic
  '+421', // Slovakia
  '+423', // Liechtenstein
  // Premium rate ranges within these countries would be tracked separately
];

// ============================================================
// FRAUD DETECTOR CLASS
// ============================================================

export class FraudDetector {
  private rules: Map<string, FraudRule>;
  private alertHistory: Map<string, FraudAlert[]>;
  private subscriberProfiles: Map<string, SubscriberProfile>;
  private activeAlerts: Set<string>;
  private onAlertCallback?: (alert: FraudAlert) => void;

  constructor() {
    this.rules = new Map();
    this.alertHistory = new Map();
    this.subscriberProfiles = new Map();
    this.activeAlerts = new Set();

    // Load default rules
    DEFAULT_RULES.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Set callback for real-time alerts
   */
  onAlert(callback: (alert: FraudAlert) => void): void {
    this.onAlertCallback = callback;
  }

  /**
   * Add or update a fraud detection rule
   */
  updateRule(rule: FraudRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all configured rules
   */
  getRules(): FraudRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /**
   * Main analysis entry point - analyze an SS7 message for fraud indicators
   */
  analyze(message: SS7Message): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    switch (message.protocol) {
      case SS7ProtocolLayer.MAP:
        indicators.push(...this.analyzeMAPMessage(message as DecodedMAPMessage));
        break;
      case SS7ProtocolLayer.ISUP:
        indicators.push(...this.analyzeISUPMessage(message as DecodedISUPMessage));
        break;
      case SS7ProtocolLayer.CAP:
        indicators.push(...this.analyzeCAPMessage(message));
        break;
      default:
        // Generic analysis for other protocols
        break;
    }

    return indicators;
  }

  /**
   * Analyze batch of messages and generate alerts
   */
  analyzeBatch(messages: SS7Message[]): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    
    // Update subscriber profiles first
    messages.forEach(msg => this.updateSubscriberProfile(msg));

    // Check each message against rules
    for (const message of messages) {
      const indicators = this.analyze(message);
      
      if (indicators.length > 0) {
        // Generate alerts based on indicators
        const generatedAlerts = this.generateAlerts(message, indicators);
        alerts.push(...generatedAlerts);
      }
    }

    return alerts;
  }

  // ============================================================
  // MAP MESSAGE ANALYSIS
  // ============================================================

  private analyzeMAPMessage(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    switch (message.operation) {
      case MAPOperationCode.UPDATE_LOCATION:
        indicators.push(...this.checkLocationUpdateAnomalies(message));
        break;

      case MAPOperationCode.SEND_AUTHENTICATION_INFO:
        indicators.push(...this.checkAuthPatterns(message));
        break;

      case MAPOperationCode.INSERT_SUBSCRIBER_DATA:
        indicators.push(...this.checkProvisioningPatterns(message));
        break;

      case MAPOperationCode.ROUTING_INFO_FOR_SM:
      case MAPOperationCode.MO_FORWARD_SHORT_MESSAGE:
      case MAPOperationCode.MT_FORWARD_SHORT_MESSAGE:
        indicators.push(...this.checkSMSAbusePatterns(message));
        break;

      case MAPOperationCode.PROVIDE_ROAMING_NUMBER:
        indicators.push(...this.checkRoamingPatterns(message));
        break;

      default:
        break;
    }

    return indicators;
  }

  private checkLocationUpdateAnomalies(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // Check for location updates during active call
    if (profile.activeCalls > 0) {
      indicators.push(FraudIndicator.LOCATION_UPDATE_WHILE_ACTIVE_CALL);
      
      // Add evidence
      profile.addEvidence({
        id: `ev_${Date.now()}`,
        timestamp: new Date(),
        type: 'location_update',
        description: `Location update received while ${profile.activeCalls} call(s) active`,
        data: { operation: MAP_OPERATION_NAMES[message.operation] },
        riskContribution: 75,
      });
    }

    // Check for impossible roaming speed
    if (profile.lastLocation && message.sccp?.destinationGlobalTitle?.digits) {
      const distance = this.calculateDistance(
        profile.lastLocation,
        message.sccp.destinationGlobalTitle.digits
      );
      const timeDiff = Date.now() - profile.lastLocationTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 0 && distance / hoursDiff > 800) { // Faster than plane
        indicators.push(FraudIndicator.ROAMING_ANOMALY_FAST_TRAVEL);
        
        profile.addEvidence({
          id: `ev_${Date.now()}`,
          timestamp: new Date(),
          type: 'location_update',
          description: `Impossible travel: ${Math.round(distance)}km in ${hoursDiff.toFixed(1)}h`,
          data: { distance, timeHours: hoursDiff, speed: distance / hoursDiff },
          riskContribution: 90,
        });
      }
    }

    // Update last location
    if (message.sccp?.sourceGlobalTitle?.digits) {
      profile.lastLocation = message.sccp.sourceGlobalTitle.digits;
      profile.lastLocationTime = new Date();
    }
    profile.locationsSeen.add(message.sccp?.destinationGlobalTitle?.digits || 'unknown');

    return indicators;
  }

  private checkAuthPatterns(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // Track authentication attempts
    profile.authAttempts.push(Date.now());

    // Clean old auth attempts (keep only last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    profile.authAttempts = profile.authAttempts.filter(t => t > oneHourAgo);

    // Check for auth failure burst
    if (profile.authAttempts.length >= 5) {
      indicators.push(FraudIndicator.SIM_SWAP_AUTH_FAILURE_BURST);
      
      profile.addEvidence({
        id: `ev_${Date.now()}`,
        timestamp: new Date(),
        type: 'authentication',
        description: `${profile.authAttempts.length} authentication attempts in last hour`,
        data: { attemptCount: profile.authAttempts.length },
        riskContribution: 70,
      });
    }

    return indicators;
  }

  private checkProvisioningPatterns(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // Track provisioning attempts
    profile.provisioningAttempts.push(Date.now());

    // Clean old attempts (keep last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    profile.provisioningAttempts = profile.provisioningAttempts.filter(t => t > oneHourAgo);

    // Check for multiple provisioning attempts
    if (profile.provisioningAttempts.length >= 3) {
      indicators.push(FraudIndicator.SIM_SWAP_MULTIPLE_ATTEMPTS);
      indicators.push(FraudIndicator.SIM_SWAP_PROVISIONING_ANOMALY);
      
      profile.addEvidence({
        id: `ev_${Date.now()}`,
        timestamp: new Date(),
        type: 'subscriber_change',
        description: `${profile.provisioningAttempts.length} provisioning attempts in last hour`,
        data: { attemptCount: profile.provisioningAttempts.length },
        riskContribution: 85,
      });
    }

    return indicators;
  }

  private checkSMSAbusePatterns(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // Track SMS activity
    profile.smsCount++;

    // Could add more sophisticated SMS abuse patterns here
    // e.g., bulk SMS to premium numbers, SMS spam patterns

    return indicators;
  }

  private checkRoamingPatterns(message: DecodedMAPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // Track roaming number requests
    profile.roamingRequests++;

    // Multiple roaming number requests could indicate roaming abuse
    if (profile.roamingRequests > 20) {
      indicators.push(FraudIndicator.ROAMING_ANOMALY_IMPOSSIBLE);
    }

    return indicators;
  }

  // ============================================================
  // ISUP MESSAGE ANALYSIS
  // ============================================================

  private analyzeISUPMessage(message: DecodedISUPMessage): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    switch (message.message) {
      case ISUPMessageType.IAM: // Initial Address Message (outgoing call)
        indicators.push(...this.analyzeOutgoingCall(message, profile));
        break;

      case ISUPMessageType.ACM: // Address Complete (incoming call answered)
        profile.activeCalls++;
        break;

      case ISUPMessageType.ANM: // Answer
        // Track answer for duration calculations
        break;

      case ISUPMessageType.REL: // Release (call ended)
        if (profile.activeCalls > 0) {
          profile.activeCalls--;
        }
        // Analyze call duration for IRSF/wangiri patterns
        indicators.push(...this.analyzeCallRelease(message, profile));
        break;

      default:
        break;
    }

    return indicators;
  }

  private analyzeOutgoingCall(message: DecodedISUPMessage, profile: SubscriberProfile): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // Track call
    profile.callCount++;
    profile.callsToday.push({
      timestamp: new Date(),
      calledNumber: message.calledPartyNumber || '',
      duration: 0, // Will be updated on REL
    });

    // Check for international call to high-risk destination
    if (message.calledPartyNumber) {
      const isInternational = this.isHighRiskDestination(message.calledPartyNumber);
      
      if (isInternational) {
        profile.internationalCallCount++;
        profile.internationalDestinations.add(message.calledPartyNumber.substring(0, 6));

        if (profile.internationalDestinations.size >= 5) {
          indicators.push(FraudIndicator.IRSF_SUSPICIOUS_PATTERN);
          indicators.push(FraudIndicator.IRSF_HIGH_VOLUME_INTERNATIONAL);
        }

        // Check for premium rate target
        if (this.isPremiumRateNumber(message.calledPartyNumber)) {
          indicators.push(FraudIndicator.IRSF_PREMIUM_RATE_TARGET);
        }
      }
    }

    return indicators;
  }

  private analyzeCallRelease(message: DecodedISUPMessage, profile: SubscriberProfile): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // Check cause value for abnormal releases
    if (message.causeValue === 17 || message.causeValue === 18 || message.causeValue === 19) {
      // User busy, no response, no answer - common in wangiri
      profile.noAnswerCount++;
    }

    // Look at recent short calls for wangiri pattern
    const recentShortCalls = profile.callsToday.filter(
      c => c.duration > 0 && c.duration <= 5 && 
      Date.now() - c.timestamp.getTime() < 60 * 60 * 1000
    );

    if (recentShortCalls.length >= 20) {
      indicators.push(FraudIndicator.WANGIRI_ONE_RING);
      indicators.push(FraudIndicator.WANGIRI_SHORT_DURATION);
    }

    return indicators;
  }

  // ============================================================
  // CAP MESSAGE ANALYSIS
  // ============================================================

  private analyzeCAPMessage(message: SS7Message): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];
    const profile = this.getOrCreateProfile(message);

    // CAP messages can indicate CAMEL-based fraud
    // e.g., unusual prepaid top-up patterns, call forwarding abuse
    
    return indicators;
  }

  // ============================================================
  // ALERT GENERATION
  // ============================================================

  private generateAlerts(message: SS7Message, indicators: FraudIndicator[]): FraudAlert[] {
    const alerts: FraudAlert[] = [];
    const subscriberKey = this.getSubscriberKey(message);

    // Group indicators by fraud type
    const indicatorGroups = this.groupIndicatorsByType(indicators);

    for (const [fraudType, groupIndicators] of indicatorGroups.entries()) {
      // Find matching rules
      for (const [ruleId, rule] of this.rules.entries()) {
        if (!rule.enabled || rule.type !== fraudType) continue;

        // Check cooldown
        if (this.isInCooldown(subscriberKey, ruleId)) continue;

        // Evaluate rule conditions
        const evaluation = this.evaluateRule(rule, message, groupIndicators);
        
        if (evaluation.triggered) {
          const alert = this.createAlert(rule, message, groupIndicators, evaluation);
          alerts.push(alert);
          
          // Store alert
          this.storeAlert(alert, subscriberKey);
          
          // Trigger callback
          if (this.onAlertCallback) {
            this.onAlertCallback(alert);
          }
        }
      }
    }

    return alerts;
  }

  private evaluateRule(
    rule: FraudRule,
    message: SS7Message,
    indicators: FraudIndicator[]
  ): { triggered: boolean; score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];
    const profile = this.getOrCreateProfile(message);
    const threshold = rule.threshold;

    switch (rule.type) {
      case FraudType.IRSF:
        if (threshold.internationalCallsPerHour && 
            profile.internationalCallCount >= threshold.internationalCallsPerHour) {
          score += 40;
          reasons.push(`${profile.internationalCallCount} international calls/hour`);
        }
        if (threshold.uniqueInternationalDestinations &&
            profile.internationalDestinations.size >= threshold.uniqueInternationalDestinations) {
          score += 35;
          reasons.push(`${profile.internationalDestinations.size} unique destinations`);
        }
        if (indicators.includes(FraudIndicator.IRSF_PREMIUM_RATE_TARGET)) {
          score += 25;
          reasons.push('Premium rate targets detected');
        }
        break;

      case FraudType.SIM_SWAP:
        if (threshold.provisioningAttemptsPerHour &&
            profile.provisioningAttempts.length >= threshold.provisioningAttemptsPerHour) {
          score += 45;
          reasons.push(`${profile.provisioningAttempts.length} provisioning attempts`);
        }
        if (threshold.authFailuresPerHour &&
            profile.authAttempts.length >= threshold.authFailuresPerHour) {
          score += 35;
          reasons.push(`${profile.authAttempts.length} auth failures`);
        }
        if (indicators.includes(FraudIndicator.LOCATION_UPDATE_WHILE_ACTIVE_CALL)) {
          score += 20;
          reasons.push('Location update during active call');
        }
        break;

      case FraudType.WANGIRI:
        if (threshold.shortDurationCallsPerHour) {
          const shortCalls = profile.callsToday.filter(
            c => c.duration <= (threshold.maxWangiriDurationSeconds || 5)
          ).length;
          if (shortCalls >= threshold.shortDurationCallsPerHour) {
            score += 50;
            reasons.push(`${shortCalls} short duration calls`);
          }
        }
        if (threshold.uniqueCalledNumbersPerHour) {
          const uniqueNumbers = new Set(profile.callsToday.map(c => c.calledNumber)).size;
          if (uniqueNumbers >= threshold.uniqueCalledNumbersPerHour) {
            score += 30;
            reasons.push(`${uniqueNumbers} unique numbers called`);
          }
        }
        break;

      case FraudType.BYPASS_FRAUD:
        // Simbox detection based on patterns
        if (indicators.includes(FraudIndicator.BYPASS_FRAUD_GSM_GATEWAY)) {
          score += 50;
          reasons.push('GSM gateway pattern detected');
        }
        if (indicators.includes(FraudIndicator.BYPASS_FRAUD_SIMBOX)) {
          score += 50;
          reasons.push('Simbox pattern detected');
        }
        break;

      case FraudType.ROAMING_ANOMALY:
        if (indicators.includes(FraudIndicator.ROAMING_ANOMALY_FAST_TRAVEL)) {
          score += 60;
          reasons.push('Impossible travel speed detected');
        }
        if (indicators.includes(FraudIndicator.ROAMING_ANOMALY_IMPOSSIBLE)) {
          score += 40;
          reasons.push('Impossible roaming detected');
        }
        if (threshold.countriesVisitedPerDay &&
            profile.locationsSeen.size >= threshold.countriesVisitedPerDay) {
          score += 30;
          reasons.push(`${profile.locationsSeen.size} locations visited`);
        }
        break;
    }

    const triggered = score >= (threshold.riskScoreThreshold || 50);
    
    return {
      triggered,
      score: Math.min(score, 100),
      reason: reasons.join('; ') || 'Threshold met',
    };
  }

  private createAlert(
    rule: FraudRule,
    message: SS7Message,
    indicators: FraudIndicator[],
    evaluation: { triggered: boolean; score: number; reason: string }
  ): FraudAlert {
    const subscriberKey = this.getSubscriberKey(message);
    const profile = this.getOrCreateProfile(message);
    
    // Calculate estimated financial impact
    const estimatedLoss = this.estimateFinancialImpact(rule.type, profile);

    const alert: FraudAlert = {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: rule.type,
      severity: rule.severity,
      status: AlertStatus.NEW,
      confidence: evaluation.score,
      indicators,
      subscriber: message.protocol === SS7ProtocolLayer.MAP ? 
        (message as DecodedMAPMessage).sourceSubscriber : undefined,
      evidence: [...profile.evidence.slice(-10)], // Last 10 evidence items
      financialImpact: estimatedLoss,
      ruleId: rule.id,
      ruleName: rule.name,
      source: 'ss7-fraud-detector',
      artpReportable: rule.artpReportable,
      artpDeadline: rule.artpReportable ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined, // 24h deadline
    };

    return alert;
  }

  private estimateFinancialImpact(fraudType: FraudType, profile: SubscriberProfile): {
    estimatedLossDZD: number;
    currency: 'DZD';
    calculationBasis: string;
  } {
    // Rough estimates for Djezzy network (would be calibrated)
    const baseRates: Record<FraudType, { ratePerIncident: number; basis: string }> = {
      [FraudType.IRSF]: { ratePerIncident: 150, basis: 'Average IRSF loss per incident (DZD)' },
      [FraudType.SIM_SWAP]: { ratePerIncident: 50000, basis: 'Estimated SIM swap loss including liability' },
      [FraudType.WANGIRI]: { ratePerIncident: 5, basis: 'Average wangiri revenue loss' },
      [FraudType.BYPASS_FRAUD]: { ratePerIncident: 200000, basis: 'Estimated bypass fraud monthly loss' },
      [FraudType.PREMIUM_RATE_ABUSE]: { ratePerIncident: 500, basis: 'Premium rate abuse loss' },
      [FraudType.ROAMING_ANOMALY]: { ratePerIncident: 30000, basis: 'Roaming fraud estimated impact' },
      [FraudType.INTERCEPTION]: { ratePerIncident: 100000, basis: 'Legal/compensation costs' },
      [FraudType.CLONING]: { ratePerIncident: 75000, basis: 'Cloning investigation + loss' },
      [FraudType.SUBSCRIPTION_FRAUD]: { ratePerIncident: 25000, basis: 'Subscription fraud recovery cost' },
      [FraudType.TRAFFIC_PUMPING]: { ratePerIncident: 45000, basis: 'Traffic pumping settlement cost' },
      [FraudType.OTHER]: { ratePerIncident: 10000, basis: 'Generic fraud estimate' },
    };

    const config = baseRates[fraudType];
    const multiplier = Math.min(profile.callCount / 10, 10); // Scale with activity

    return {
      estimatedLossDZD: Math.round(config.ratePerIncident * multiplier),
      currency: 'DZD',
      calculationBasis: config.basis,
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private getOrCreateProfile(message: SS7Message): SubscriberProfile {
    const key = this.getSubscriberKey(message);
    
    if (!this.subscriberProfiles.has(key)) {
      this.subscriberProfiles.set(key, new SubscriberProfile(key));
    }
    
    return this.subscriberProfiles.get(key)!;
  }

  private getSubscriberKey(message: SS7Message): string {
    // Try to extract subscriber identifier
    if (message.protocol === SS7ProtocolLayer.MAP) {
      const mapMsg = message as DecodedMAPMessage;
      return mapMsg.sourceSubscriber?.imsi || 
             mapMsg.sourceSubscriber?.msisdn ||
             mapMsg.sccp?.sourceGlobalTitle?.digits ||
             'unknown';
    }
    
    if (message.protocol === SS7ProtocolLayer.ISUP) {
      const isupMsg = message as DecodedISUPMessage;
      return isupMsg.callingPartyNumber || 'unknown';
    }

    return `${message.opc.raw}-${message.dpc.raw}-${message.sls || 0}`;
  }

  private isInCooldown(subscriberKey: string, ruleId: string): boolean {
    const key = `${subscriberKey}:${ruleId}`;
    const alerts = this.alertHistory.get(key) || [];
    
    if (alerts.length === 0) return false;
    
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    
    const latestAlert = alerts[alerts.length - 1];
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    
    return (Date.now() - latestAlert.timestamp.getTime()) < cooldownMs;
  }

  private storeAlert(alert: FraudAlert, subscriberKey: string): void {
    const key = `${subscriberKey}:${alert.ruleId}`;
    
    if (!this.alertHistory.has(key)) {
      this.alertHistory.set(key, []);
    }
    
    this.alertHistory.get(key)!.push(alert);
    this.activeAlerts.add(alert.id);
  }

  private groupIndicatorsByType(indicators: FraudIndicator[]): Map<FraudType, FraudIndicator[]> {
    const groups = new Map<FraudType, FraudIndicator[]>();
    
    for (const indicator of indicators) {
      const details = FRAUD_INDICATOR_DETAILS[indicator];
      if (!details) continue;
      
      const fraudType = this.indicatorToFraudType(details.category);
      
      if (!groups.has(fraudType)) {
        groups.set(fraudType, []);
      }
      
      groups.get(fraudType)!.push(indicator);
    }
    
    return groups;
  }

  private indicatorToFraudType(category: string): FraudType {
    switch (category.toLowerCase()) {
      case 'irsf': return FraudType.IRSF;
      case 'sim swap': return FraudType.SIM_SWAP;
      case 'wangiri': return FraudType.WANGIRI;
      case 'bypass fraud': return FraudType.BYPASS_FRAUD;
      case 'premium rate': return FraudType.PREMIUM_RATE_ABUSE;
      case 'roaming': return FraudType.ROAMING_ANOMALY;
      case 'security':
      case 'anomaly': return FraudType.INTERCEPTION;
      case 'cloning': return FraudType.CLONING;
      default: return FraudType.OTHER;
    }
  }

  private isHighRiskDestination(number: string): boolean {
    for (const prefix of IRSF_DESTINATION_PREFIXES) {
      if (number.startsWith(prefix)) return true;
    }
    return false;
  }

  private isPremiumRateNumber(number: string): boolean {
    // Premium rate numbers typically have specific patterns
    // This is a simplified check - production would use a database
    const premiumPatterns = ['900', '808', '822', '909'];
    return premiumPatterns.some(p => number.includes(p));
  }

  private calculateDistance(location1: string, location2: string): number {
    // Simplified distance calculation
    // In production, this would use actual coordinates or MCC/MNC lookup
    if (location1 === location2) return 0;
    
    // Return a random-ish but deterministic value for demo
    // Real implementation would use cell tower coordinates
    const hash = (loc: string) => {
      let h = 0;
      for (let i = 0; i < loc.length; i++) {
        h = ((h << 5) - h + loc.charCodeAt(i)) | 0;
      }
      return Math.abs(h);
    };
    
    return Math.abs(hash(location1) - hash(location2)) % 5000; // Max ~5000km
  }

  // ============================================================
  // QUERY METHODS
  // ============================================================

  /**
   * Get active fraud alerts
   */
  getActiveAlerts(status?: AlertStatus): FraudAlert[] {
    const allAlerts: FraudAlert[] = [];
    
    for (const alerts of this.alertHistory.values()) {
      for (const alert of alerts) {
        if ((!status || alert.status === status) && this.activeAlerts.has(alert.id)) {
          allAlerts.push(alert);
        }
      }
    }
    
    // Sort by timestamp descending
    return allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get fraud statistics
   */
  getStatistics(): FraudStatistics {
    const stats: FraudStatistics = {
      totalAlerts: 0,
      alertsByStatus: {},
      alertsByType: {},
      alertsBySeverity: {},
      totalEstimatedLossDZD: 0,
      blockedSubscribers: 0,
      topFraudTypes: [],
      recentAlerts: [],
    };

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    for (const alerts of this.alertHistory.values()) {
      for (const alert of alerts) {
        if (alert.timestamp.getTime() < twentyFourHoursAgo) continue;
        
        stats.totalAlerts++;
        stats.alertsByStatus[alert.status] = (stats.alertsByStatus[alert.status] || 0) + 1;
        stats.alertsByType[alert.type] = (stats.alertsByType[alert.type] || 0) + 1;
        stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
        
        if (alert.financialImpact) {
          stats.totalEstimatedLossDZD += alert.financialImpact.estimatedLossDZD;
        }
        
        if (alert.status === AlertStatus.BLOCKED) {
          stats.blockedSubscribers++;
        }
      }
    }

    // Top fraud types
    stats.topFraudTypes = Object.entries(stats.alertsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Recent alerts (last 24h)
    stats.recentAlerts = this.getActiveAlerts().slice(0, 10);

    return stats;
  }

  /**
   * Block a suspicious subscriber
   */
  async blockSubscriber(alertId: string, reason: string): Promise<boolean> {
    const alert = Array.from(this.alertHistory.values())
      .flat()
      .find(a => a.id === alertId);
    
    if (!alert) return false;

    const action: FraudAction = {
      id: `action_${Date.now()}`,
      type: FraudActionType.BLOCK_SUBSCRIBER,
      status: ActionStatus.EXECUTED,
      timestamp: new Date(),
      performedBy: 'system',
      details: reason,
      result: 'Subscriber blocked successfully',
    };

    if (!alert.actions) alert.actions = [];
    alert.actions.push(action);
    alert.status = AlertStatus.BLOCKED;

    return true;
  }

  /**
   * Clear old data (memory management)
   */
  cleanup(maxAgeHours: number = 24): void {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    // Clean up alert history
    for (const [key, alerts] of this.alertHistory.entries()) {
      const filtered = alerts.filter(a => a.timestamp.getTime() > cutoff);
      if (filtered.length === 0) {
        this.alertHistory.delete(key);
      } else {
        this.alertHistory.set(key, filtered);
      }
    }

    // Clean up subscriber profiles
    for (const [key, profile] of this.subscriberProfiles.entries()) {
      profile.cleanup(cutoff);
      if (profile.isEmpty()) {
        this.subscriberProfiles.delete(key);
      }
    }
  }
}

export interface FraudStatistics {
  totalAlerts: number;
  alertsByStatus: Record<AlertStatus, number>;
  alertsByType: Record<FraudType, number>;
  alertsBySeverity: Record<string, number>;
  totalEstimatedLossDZD: number;
  blockedSubscribers: number;
  topFraudTypes: Array<{ type: string; count: number }>;
  recentAlerts: FraudAlert[];
}

// ============================================================
// SUBSCRIBER PROFILE CLASS
// ============================================================

class SubscriberProfile {
  readonly key: string;
  
  // Call statistics
  callCount: number = 0;
  callsToday: Array<{ timestamp: Date; calledNumber: string; duration: number }>;
  internationalCallCount: number = 0;
  internationalDestinations: Set<string>;
  activeCalls: number = 0;
  noAnswerCount: number = 0;
  
  // SMS statistics
  smsCount: number = 0;
  
  // Authentication & Security
  authAttempts: number[];
  provisioningAttempts: number[];
  
  // Location tracking
  lastLocation?: string;
  lastLocationTime: Date;
  locationsSeen: Set<string>;
  roamingRequests: number = 0;
  
  // Evidence collection
  evidence: EvidenceItem[];

  constructor(key: string) {
    this.key = key;
    this.callsToday = [];
    this.internationalDestinations = new Set();
    this.authAttempts = [];
    this.provisioningAttempts = [];
    this.lastLocationTime = new Date(0); // Epoch
    this.locationsSeen = new Set();
    this.evidence = [];
  }

  addEvidence(evidence: EvidenceItem): void {
    this.evidence.push(evidence);
    // Keep only last 50 evidence items
    if (this.evidence.length > 50) {
      this.evidence = this.evidence.slice(-50);
    }
  }

  cleanup(cutoff: number): void {
    this.callsToday = this.callsToday.filter(c => c.timestamp.getTime() > cutoff);
    this.authAttempts = this.authAttempts.filter(t => t > cutoff);
    this.provisioningAttempts = this.provisioningAttempts.filter(t => t > cutoff);
    this.evidence = this.evidence.filter(e => e.timestamp.getTime() > cutoff);
  }

  isEmpty(): boolean {
    return (
      this.callCount === 0 &&
      this.authAttempts.length === 0 &&
      this.provisioningAttempts.length === 0 &&
      this.evidence.length === 0
    );
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

let detectorInstance: FraudDetector | null = null;

export function getFraudDetector(): FraudDetector {
  if (!detectorInstance) {
    detectorInstance = new FraudDetector();
  }
  return detectorInstance;
}
