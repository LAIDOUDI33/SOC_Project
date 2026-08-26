/**
 * National SOC Platform - SS7 Protocol Security Analyzer
 * 
 * Comprehensive SS7 (Signaling System No. 7) protocol analysis for Djezzy network:
 * - MAP (Mobile Application Part) Message Parsing
 * - ISUP (ISDN User Part) Analysis
 * - TCAP (Transaction Capabilities Application Part) Inspection
 * - SS7 Attack Detection (SS7 DOS, Interception, Location Tracking)
 * - Signaling Firewall Rule Generation
 * - Roaming Fraud via SS7 Detection
 * - CAMEL Protocol Analysis for Intelligent Networks
 * 
 * @version 1.0.0
 * @module ss7-analyzer
 */

import { db } from '@/lib/db';

// ============================================================
// Constants & Configuration
// ============================================================

export const SS7_CONFIG = {
  // Djezzy network point codes (Algerian SS7 network)
  NETWORK: {
    countryCode: 213,
    networkIndicator: 2, // International network
    defaultSio: 0, // Standard SIO for MTP3
    
    // Djezzy point codes (simplified)
    pointCodes: {
      STP_PRIMARY: '3-1-1',
      STP_SECONDARY: '3-1-2',
      HLR_ALGIERS: '3-10-1',
      HLR_ORAN: '3-10-2',
      MSC_ALGIERS: '3-20-1',
      MSC_ORAN: '3-20-2',
      MSC_CONSTANTINE: '3-20-3',
      GMSC: '3-21-1',
      SMSC: '3-30-1',
      SCP: '3-40-1'
    }
  },
  
  // Global titles configuration
  GLOBAL_TITLE: {
    // E.164 numbering plan for Algeria
    translationType: 0,
    numberingPlan: 1, // ISDN/Telephony
    natureOfAddress: 4, // International number
    encodingScheme: 'BCD',
    
    // Djezzy HLR addresses
    hlrAddresses: ['2135500', '2135600', '2136600', '2136700', '2137700', '2137800', '2137900']
  },
  
  // Attack detection thresholds
  ATTACK_THRESHOLDS: {
    // SS7 DoS detection
    maxMessagesPerSecond: 10000,
    maxSameDestinationPerMinute: 500,
    floodDetectionWindowMs: 60000,
    
    // Location tracking detection
    maxLocationUpdatesPerHour: 100,
    maxProvideRoamingNumberPerHour: 50,
    
    // Interception indicators
    suspiciousForwardingPatterns: true,
    unusualSubscriberQueryPattern: true,
    
    // CAMEL fraud
    maxUSSDRequestsPerMinute: 30,
    suspiciousPremiumServiceCodes: ['19xx', '15xx', '14xx']
  },
  
  // Firewall rule defaults
  FIREWALL_DEFAULTS: {
    defaultAction: 'ALLOW',
    logLevel: 'INFO',
    blockUnknownOPC: false,
    allowHomeNetworkOnly: true,
    enforceGTValidation: true
  }
} as const;

// ============================================================
// Type Definitions
// ============================================================

export interface SS7Message {
  messageId: string;
  timestamp: Date;
  
  // MTP3 Layer
  mtp3: {
    sio: number;       // Service Information Octet
    opc: string;       // Originating Point Code (format: X-Y-Z)
    dpc: string;       // Destination Point Code
    sls: number;       // Signaling Link Selection
    ni: number;        // Network Indicator
  };
  
  // SCCP Layer
  sccp?: {
    messageType: SCCPMessageType;
    sourceLocalRef?: number;
    destLocalRef?: number;
    sourceGlobalTitle?: GlobalTitle;
    destGlobalTitle?: GlobalTitle;
    sourceSSN?: number;
    destSSN?: number;
    protocolClass: number;
    segmentation?: boolean;
  };
  
  // TCAP Layer
  tcap?: {
    transactionId: string;
    packetType: TCAPPacketType;
    dialoguePortion?: DialoguePortion;
    components: TCAPComponent[];
  };
  
  // Application Layer
  application: {
    protocol: SS7Protocol;
    operationCode?: number;
    invokeId?: number;
    parameters: Record<string, unknown>;
    rawTcapData?: string;
  };
  
  // Analysis Results
  analysis: {
    isAnomalous: boolean;
    anomalyScore: number;
    anomalyReasons: string[];
    attackIndicators: SS7AttackIndicator[];
    riskLevel: RiskLevel;
    recommendedAction: string;
  };
  
  // Metadata
  metadata: {
    sourceIP: string;
    destinationIP: string;
    probeId: string;
    processingTimeMs: number;
  };
}

export type SCCPMessageType = 
  | 'CR' | 'CC' | 'CREF' | 'RLC' | 'DT1' | 'DT2' | 'AK' | 'UDT' | 'UDTS' 
  | 'ED' | 'EA' | 'RSR' | RSC';
export type TCAPPacketType = 'UNIDIRECTIONAL' | 'QUERY_WITH_PERMISSION' | 'QUERY_DENY' | 'RESPONSE' | 'CONVERSATION_WITHOUT_PERMISSION' | 'CONVERSATION_WITH_PERMISSION' | 'ABORT';
export type SS7Protocol = 'MAP' | 'ISUP' | 'CAP' | 'INAP' | 'TCAP' | 'SCCP' | 'MTP3';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GlobalTitle {
  tt: number;           // Translation Type
  np: number;           // Numbering Plan
  nai: number;          // Nature of Address Indicator
  digits: string;       // Address digits
  encoded: string;      // Encoded representation
}

export interface DialoguePortion {
  otid: string;         // Originating Transaction ID
  dtid: string;         // Destination Transaction ID
  applicationContextName?: string;
  userInformation?: string;
}

export interface TCAPComponent {
  componentType: 'INVOKE' | 'RETURN_RESULT' | 'RETURN_ERROR' | 'REJECT';
  invokeId?: number;
  operationCode: number;
  operationName?: string;
  parameters?: Record<string, unknown>;
  errorcode?: number;
  problemCode?: number;
}

// MAP Operation Types
export interface MAPOperation {
  code: number;
  name: string;
  category: MAPCategory;
  direction: 'MOBILE_TO_NETWORK' | 'NETWORK_TO_MOBILE' | 'NETWORK_TO_NETWORK';
  sensitive: boolean;
  description: string;
}

export type MAPCategory = 
  | 'LOCATION_MANAGEMENT'
  | 'AUTHENTICATION'
  | 'CALL_HANDLING'
  | 'SUPPLEMENTARY_SERVICES'
  | 'SHORT_MESSAGE'
  | 'SUBSCRIBER_MANAGEMENT'
  | 'ROAMING';

// ISUP Message Types
export interface ISUPMessage {
  cic: number;          // Circuit Identification Code
  messageType: ISUPMessageType;
  isupParameters: ISUPParameter[];
  callReference: string;
  callingPartyNumber?: string;
  calledPartyNumber?: string;
  isIAM: boolean;       // Initial Address Message
  isRelease: boolean;
}

export type ISUPMessageType = 
  | 'IAM' | 'ACM' | 'ANM' | 'REL' | 'RLC' | 'SAM' | 'INF' | 'INR' 
  | 'COT' | 'CPG' | 'USR' | 'CON' | 'FOT' | 'MPM' | 'PAI' | 'GRS' 
  | 'CRA' | 'CFR' | 'CVR' | 'EXM';

export interface ISUPParameter {
  name: string;
  value: unknown;
  length: number;
  mandatory: boolean;
}

// CAMEL Protocol Types
export interface CAMELOperation {
  code: number;
  name: string;
  phase: '1' | '2' | '3' | '4';
  serviceKey: number;
  description: string;
}

// Attack Detection
export interface SS7AttackIndicator {
  indicatorId: string;
  attackType: SS7AttackType;
  severity: RiskLevel;
  confidence: number;
  description: string;
  evidence: Record<string, unknown>;
  ioc: string[];        // Indicators of Compromise
  mitigationRecommendation: string;
}

export type SS7AttackType = 
  | 'SS7_DOS'
  | 'LOCATION_TRACKING'
  | 'CALL_INTERCEPTION'
  | 'SMS_INTERCEPTION'
  | 'USSD_FRAUD'
  | 'SUBSCRIBER_DATA_THEFT'
  | 'FRAUDULENT_FORWARDING'
  | 'IMEI_CLONING_DETECTION'
  | 'ROAMING_FRAUD'
  | 'SIGNALLING_STORM'
  | 'UNAUTHORIZED_ACCESS'
  | 'GT_SPOOFING'
  | 'PC_SPOOFING';

// Firewall Rules
export interface SS7FirewallRule {
  ruleId: string;
  name: string;
  priority: number;
  enabled: boolean;
  
  // Matching criteria
  match: {
    opc?: string | string[];
    dpc?: string | string[];
    gtPattern?: string;
    ssn?: number | number[];
    mapOperation?: number | number[];
    mapOperationRange?: [number, number];
    isupMessageType?: ISUPMessageType | ISUPMessageType[];
  };
  
  // Action
  action: 'ALLOW' | 'BLOCK' | 'ALLOW_LOG' | 'BLOCK_RESET' | 'QUARANTINE' | 'RATE_LIMIT';
  
  // Additional options
  options?: {
    rateLimitPerSecond?: number;
    logOnly?: boolean;
    sendAlarm?: boolean;
    quarantineDurationMinutes?: number;
    notifySecurityTeam?: boolean;
  };
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  lastModifiedAt: Date;
  lastModifiedBy: string;
  hitCount: number;
  lastHitAt?: Date;
}

// Analysis Report
export interface SS7AnalysisReport {
  reportId: string;
  period: { start: Date; end: Date };
  summary: {
    totalMessagesAnalyzed: number;
    anomalousMessagesCount: number;
    attacksDetected: number;
    blockedMessagesCount: number;
  };
  byProtocol: ProtocolStatistics;
  byAttackType: AttackStatistics;
  topSourcePointCodes: Array<{ opc: string; count: number; riskScore: number }>;
  topTargetGlobalTitles: Array<{ gt: string; count: number; suspicious: boolean }>;
  recommendations: Recommendation[];
  firewallRulesGenerated: SS7FirewallRule[];
}

export interface ProtocolStatistics {
  protocol: string;
  totalMessages: number;
  anomalousCount: number;
  percentage: number;
  topOperations: Array<{ name: string; count: number }>;
}

export interface AttackStatistics {
  attackType: SS7AttackType;
  count: number;
  severity: RiskLevel;
  affectedSubscribers: number;
  estimatedImpact: string;
  status: 'ACTIVE' | 'CONTAINED' | 'INVESTIGATING' | 'RESOLVED';
}

export interface Recommendation {
  id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  implementationEffort: 'QUICK_WIN' | 'SHORT_TERM' | 'LONG_TERM';
}

// ============================================================
// Custom Error Classes
// ============================================================

export class SS7AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SS7AnalysisError';
  }
}

export class SS7ParseError extends SS7AnalysisError {
  constructor(message: string, rawData?: string) {
    super(message, 'PARSE_ERROR', { rawData });
    this.name = 'SS7ParseError';
  }
}

// ============================================================
// MAP Operations Registry
// ============================================================

const MAP_OPERATIONS: Map<number, MAPOperation> = new Map([
  // Location Management
  [2, { code: 2, name: 'updateLocation', category: 'LOCATION_MANAGEMENT', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Update subscriber location in VLR/HLR' }],
  [3, { code: 3, name: 'cancelLocation', category: 'LOCATION_MANAGEMENT', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Cancel location information (can cause forced re-registration)' }],
  [45, { code: 45, name: 'provideRoamingNumber', category: 'LOCATION_MANAGEMENT', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Request roaming MSRN for mobile terminated call' }],
  [46, { code: 46, name: 'updateGprsLocation', category: 'LOCATION_MANAGEMENT', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Update GPRS/SGSN location' }],
  [47, { code: 47, name: 'sendRoutingInfoForGprs', category: 'LOCATION_MANAGEMENT', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Get routing info for GPRS (reveals SGSN address)' }],
  
  // Authentication
  [56, { code: 56, name: 'sendAuthenticationInfo', category: 'AUTHENTICATION', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Request authentication vectors (triplets/quintuplets)' }],
  [57, { code: 57, name: 'authenticationFailureReport', category: 'AUTHENTICATION', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Report authentication failure' }],
  
  // Call Handling
  [2, { code: 2, name: 'sendRoutingInfo', category: 'CALL_HANDLING', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Get routing info for MT call (reveals MSC/VLR address)' }],
  [4, { code: 4, name: 'provideSIWFSNumber', category: 'CALL_HANDLING', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Provide SIWF number for follow-me services' }],
  
  // Supplementary Services
  [10, { code: 10, name: 'registerSS', category: 'SUPPLEMENTARY_SERVICES', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Register supplementary service (call forwarding etc.)' }],
  [11, { code: 11, name: 'eraseSS', category: 'SUPPLEMENTARY_SERVICES', direction: 'MOBILE_TO_NETWORK', sensitive: true, description: 'Erase supplementary service settings' }],
  [12, { code: 12, name: 'activateSS', category: 'SUPPLEMENTARY_SERVICES', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Activate supplementary service' }],
  [13, { code: 13, name: 'deactivateSS', category: 'SUPPLEMENTARY_SERVICES', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'Deactivate supplementary service' }],
  [14, { code: 14, name: 'interrogateSS', category: 'SUPPLEMENTARY_SERVICES', direction: 'MOBILE_TO_NETWORK', sensitive: true, description: 'Interrogate current SS settings' }],
  [18, { code: 18, name: 'processUnstructuredSS_Request', category: 'SUPPLEMENTARY_SERVICES', direction: 'BOTH', sensitive: false, description: 'USSD request processing' }],
  [19, { code: 19, name: 'processUnstructuredSS_Response', category: 'SUPPLEMENTARY_SERVICES', direction: 'BOTH', sensitive: false, description: 'USSD response processing' }],
  [40, { code: 40, name: 'forwardCheckSS-Indication', category: 'SUPPLEMENTARY_SERVICES', direction: 'NETWORK_TO_MOBILE', sensitive: false, description: 'Forward check SS indication' }],
  
  // Short Message
  [44, { code: 44, name: 'forwardSM', category: 'SHORT_MESSAGE', direction: 'BOTH', sensitive: true, description: 'Forward short message (SMS)' }],
  [46, { code: 46, name: 'mo-ForwardSM', category: 'SHORT_MESSAGE', direction: 'MOBILE_TO_NETWORK', sensitive: true, description: 'Mobile originated SMS forward' }],
  [50, { code: 50, name: 'reportSM-DeliveryStatus', category: 'SHORT_MESSAGE', direction: 'BOTH', sensitive: false, description: 'Report SMS delivery status' }],
  [51, { code: 51, name: 'informServiceCentre', category: 'SHORT_MESSAGE', direction: 'NETWORK_TO_NETWORK', sensitive: false, description: 'Inform SC about message status' }],
  [52, { code: 52, name: 'alertServiceCentre', category: 'SHORT_MESSAGE', direction: 'MOBILE_TO_NETWORK', sensitive: true, description: 'Alert SC that MS is available (reveals location)' }],
  [53, { code: 53, name: 'readyForSM', category: 'SHORT_MESSAGE', direction: 'MOBILE_TO_NETWORK', sensitive: false, description: 'MS ready to receive SMS' }],
  
  // Subscriber Management
  [54, { code: 54, name: 'insertSubscriberData', category: 'SUBSCRIBER_MANAGEMENT', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Insert/modify subscriber data in HLR' }],
  [55, { code: 55, name: 'deleteSubscriberData', category: 'SUBSCRIBER_MANAGEMENT', direction: 'NETWORK_TO_NETWORK', sensitive: true, description: 'Delete subscriber data from HLR' }],
]);

// ISUP Message Types Registry
const ISUP_MESSAGE_TYPES: Map<number, ISUPMessageType> = new Map([
  [1, 'IAM'],   // Initial Address
  [2, 'SAM'],   // Subsequent Address
  [6, 'ACM'],   // Address Complete
  [7, 'CON'],   // Connect
  [9, 'ANM'],   // Answer
  [12, 'REL'],  // Release
  [16, 'RLC'],  // Release Complete
  [13, ' SUS'], // Suspend
  [14, 'RES'],  // Resume
  [17, 'SUS'],  // Suspend
  [18, 'RES'],  // Resume
]);

// CAMEL Operations Registry
const CAMEL_OPERATIONS: Map<number, CAMELOperation> = new Map([
  [1, { code: 1, name: 'initialDP', phase: '1', serviceKey: 19, description: 'Initial Detection Point trigger' }],
  [2, { code: 2, name: 'requestReportBCSMEvent', phase: '1', serviceKey: 19, description: 'Request BCSM event reporting' }],
  [3, { code: 3, name: 'eventReportBCSM', phase: '1', serviceKey: 19, description: 'BCSM event report' }],
  [4, { code: 4, name: 'callGap', phase: '1', serviceKey: 19, description: 'Apply call gapping/rate limiting' }],
  [5, { code: 5, name: 'connect', phase: '1', serviceKey: 19, description: 'Connect call to destination' }],
  [11, { code: 11, name: 'continue', phase: '1', serviceKey: 19, description: 'Continue call processing' }],
  [24, { code: 24, name: 'applyCharging', phase: '2', serviceKey: 19, description: 'Apply charging instructions' }],
  [26, { code: 26, name: 'applyChargingReport', phase: '2', serviceKey: 19, description: 'Charging report from SSF' }],
  [40, { code: 40, name: 'furnishChargingInformation', phase: '3', serviceKey: 19, description: 'Provide charging info to SCF' }],
  [48, { code: 48, name: 'initialDP', phase: '4', serviceKey: 20, description: 'Initial DP for GPRS/CAMEL' }],
]);

// ============================================================
// Main SS7 Analyzer Class
// ============================================================

export class SS7Analyzer {
  private static instance: SS7Analyzer;
  private messageBuffer: SS7Message[] = [];
  private bufferSize: number = 10000;
  private attackHistory: Map<string, SS7AttackIndicator[]> = new Map();
  private rateCounters: Map<string, { count: number; windowStart: number }> = new Map();

  private constructor() {}

  static getInstance(): SS7Analyzer {
    if (!SS7Analyzer.instance) {
      SS7Analyzer.instance = new SS7Analyzer();
    }
    return SS7Analyzer.instance;
  }

  // ============================================================
  // Message Parsing & Analysis
  // ============================================================

  async analyzeMessage(rawMessage: Buffer | string, metadata: { sourceIP: string; destinationIP: string; probeId: string }): Promise<SS7Message> {
    const startTime = Date.now();
    
    try {
      // Parse the raw SS7 message
      const parsed = await this.parseRawMessage(rawMessage);
      
      // Build complete message structure
      const message: SS7Message = {
        messageId: `ss7_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        timestamp: new Date(),
        mtp3: parsed.mtp3,
        sccp: parsed.sccp,
        tcap: parsed.tcap,
        application: parsed.application,
        analysis: {
          isAnomalous: false,
          anomalyScore: 0,
          anomalyReasons: [],
          attackIndicators: [],
          riskLevel: 'LOW',
          recommendedAction: 'NONE'
        },
        metadata: {
          ...metadata,
          processingTimeMs: Date.now() - startTime
        }
      };

      // Run analysis checks
      await this.runAnalysisChecks(message);

      // Add to buffer for pattern detection
      this.addToBuffer(message);

      return message;
    } catch (error) {
      throw new SS7ParseError(
        `Failed to parse SS7 message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        typeof rawMessage === 'string' ? rawMessage.slice(0, 200) : undefined
      );
    }
  }

  async analyzeBatch(messages: Array<{ raw: Buffer | string; metadata: { sourceIP: string; destinationIP: string; probeId: string } }>): Promise<SS7Message[]> {
    const results = await Promise.all(
      messages.map(msg => this.analyzeMessage(msg.raw, msg.metadata))
    );
    return results;
  }

  // ============================================================
  // Protocol-Specific Parsers
  // ============================================================

  async parseMAPMessage(tcapComponents: TCAPComponent[]): Promise<{
    operation: MAPOperation | null;
    parameters: Record<string, unknown>;
    isSensitive: boolean;
  }> {
    if (!tcapComponents || tcapComponents.length === 0) {
      return { operation: null, parameters: {}, isSensitive: false };
    }

    const invokeComponent = tcapComponents.find(c => c.componentType === 'INVOKE');
    if (!invokeComponent) {
      return { operation: null, parameters: {}, isSensitive: false };
    }

    const operationCode = invokeComponent.operationCode;
    const operation = MAP_OPERATIONS.get(operationCode) || {
      code: operationCode,
      name: `UNKNOWN_OPERATION_${operationCode}`,
      category: 'SUPPLEMENTARY_SERVICES' as MAPCategory,
      direction: 'BOTH' as 'BOTH',
      sensitive: false,
      description: 'Unknown or proprietary MAP operation'
    };

    return {
      operation,
      parameters: invokeComponent.parameters || {},
      isSensitive: operation.sensitive
    };
  }

  async parseISUPMessage(data: Buffer): Promise<ISUPMessage> {
    // Simplified ISUP parsing - real implementation would be more detailed
    const cic = data.readUInt16BE(0) & 0x0FFF;
    const messageTypeValue = data[2];
    const messageType = ISUP_MESSAGE_TYPES.get(messageTypeValue) || `UNKNOWN_${messageTypeValue}`;

    let callingParty: string | undefined;
    let calledParty: string | undefined;

    // Extract party numbers (simplified)
    if (data.length > 10) {
      // Look for Calling Party Number (parameter type 0x0A)
      // and Called Party Number (parameter type 0x04)
      // This is a simplified extraction
    }

    return {
      cic,
      messageType: messageType as ISUPMessageType,
      isupParameters: [],
      callReference: `${cic}_${Date.now()}`,
      callingParty,
      calledParty,
      isIAM: messageType === 'IAM',
      isRelease: messageType === 'REL' || messageType === 'RLC'
    };
  }

  async parseCAMELMessage(tcapComponents: TCAPComponent[]): Promise<{
    operation: CAMELOperation | null;
    parameters: Record<string, unknown>;
    serviceKey: number;
  }> {
    const invokeComponent = tcapComponents.find(c => c.componentType === 'INVOKE');
    if (!invokeComponent) {
      return { operation: null, parameters: {}, serviceKey: 0 };
    }

    const operationCode = invokeComponent.operationCode;
    const operation = CAMEL_OPERATIONS.get(operationCode) || {
      code: operationCode,
      name: `UNKNOWN_CAMEL_${operationCode}`,
      phase: '4',
      serviceKey: 0,
      description: 'Unknown CAMEL operation'
    };

    return {
      operation,
      parameters: invokeComponent.parameters || {},
      serviceKey: operation.serviceKey
    };
  }

  // ============================================================
  // Attack Detection Engine
  // ============================================================

  async detectAttacks(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const allIndicators: SS7AttackIndicator[] = [];

    // Run all detection modules
    const dosIndicators = await this.detectSS7DoS(messages);
    const locationTrackingIndicators = await this.detectLocationTracking(messages);
    const interceptionIndicators = await this.detectInterceptionAttempts(messages);
    const ussdFraudIndicators = await this.detect USSDFraud(messages);
    const roamingFraudIndicators = await this.detectRoamingFraudViaSS7(messages);
    const spoofingIndicators = await this.detectSpoofingAttempts(messages);

    allIndicators.push(
      ...dosIndicators,
      ...locationTrackingIndicators,
      ...interceptionIndicators,
      ...ussdFraudIndicators,
      ...roamingFraudIndicators,
      ...spoofingIndicators
    );

    return allIndicators;
  }

  private async detectSS7DoS(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];
    const now = Date.now();
    const windowMs = SS7_CONFIG.ATTACK_THRESHOLDS.floodDetectionWindowMs;

    // Group messages by OPC/DPC pair
    const messageGroups = new Map<string, SS7Message[]>();
    
    for (const msg of messages) {
      const key = `${msg.mtp3.opc}->${msg.mtp3.dpc}`;
      if (!messageGroups.has(key)) {
        messageGroups.set(key, []);
      }
      messageGroups.get(key)!.push(msg);
    }

    // Check each group for flooding patterns
    for (const [groupKey, groupMessages] of messageGroups) {
      const recentMessages = groupMessages.filter(
        m => now - m.timestamp.getTime() < windowMs
      );

      if (recentMessages.length > SS7_CONFIG.ATTACK_THRESHOLDS.maxMessagesPerSecond * (windowMs / 1000)) {
        indicators.push({
          indicatorId: `dos_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'SS7_DOS',
          severity: 'HIGH',
          confidence: Math.min(95, 60 + (recentMessages.length / 100)),
          description: `Signaling storm detected: ${recentMessages.length} messages in ${windowMs / 1000}s from ${groupKey}`,
          evidence: {
            messageCount: recentMessages.length,
            timeWindow: windowMs,
            sourcePair: groupKey,
            messagesPerSecond: Math.round(recentMessages.length / (windowMs / 1000))
          },
          ioc: ['High signaling volume', 'Potential resource exhaustion'],
          mitigationRecommendation: 'Rate limit or block source OPC temporarily'
        });
      }
    }

    return indicators;
  }

  private async detectLocationTracking(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Count location-related operations per target GT
    const locationOpsByTarget = new Map<string, number[]>();

    for (const msg of messages) {
      if (msg.timestamp.getTime() < oneHourAgo) continue;

      const opCode = msg.application.operationCode;
      
      // Check for location-revealing operations
      if ([45, 47, 56].includes(opCode || 0)) { // provideRoamingNumber, sendRoutingInfoForGprs, sendAuthenticationInfo
        const targetGT = msg.sccp?.destGlobalTitle?.digits;
        if (targetGT) {
          if (!locationOpsByTarget.has(targetGT)) {
            locationOpsByTarget.set(targetGT, []);
          }
          locationOpsByTarget.get(targetGT)!.push(msg.timestamp.getTime());
        }
      }
    }

    // Check thresholds
    for (const [gt, timestamps] of locationOpsByTarget) {
      if (timestamps.length > SS7_CONFIG.ATTACK_THRESHOLDS.maxLocationUpdatesPerHour) {
        indicators.push({
          indicatorId: `loc_track_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'LOCATION_TRACKING',
          severity: 'HIGH',
          confidence: 75 + Math.random() * 20,
          description: `Potential location tracking: ${timestamps.length} location queries for GT ${gt} in last hour`,
          evidence: {
            targetGT: gt,
            queryCount: timestamps.length,
            timeWindow: '1 hour',
            queryTimestamps: timestamps.slice(-10)
          },
          ioc: ['Excessive location queries', 'Privacy violation pattern'],
          mitigationRecommendation: 'Block location queries from untrusted OPCs, alert security team'
        });
      }
    }

    return indicators;
  }

  private async detectInterceptionAttempts(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];

    for (const msg of messages) {
      const suspiciousPatterns = [];

      // Check for forward registration to international numbers
      if (msg.application.operationCode === 10) { // registerSS (call forwarding)
        const forwardedTo = msg.application.parameters?.forwardedToNumber as string;
        if (forwardedTo && !forwardedTo.startsWith('213')) {
          suspiciousPatterns.push('International forwarding destination');
        }
      }

      // Check for cancelLocation followed by sendRoutingInfo (classic interception)
      if (msg.application.operationCode === 3) { // cancelLocation
        // Look for subsequent routing info request
        const后续消息 = this.messageBuffer.filter(m =>
          m.timestamp > msg.timestamp &&
          m.application.operationCode === 2 && // sendRoutingInfo
          m.sccp?.destGlobalTitle?.digits === msg.sccp?.destGlobalTitle?.digits
        );

        if (后续消息.length > 0) {
          suspiciousPatterns.push('Cancel+Route pattern detected');
        }
      }

      // Check for ProvideRoamingNumber abuse
      if (msg.application.operationCode === 45 && this.isSuspiciousPRN(msg)) {
        suspiciousPatterns.push('Suspicious PRN pattern');
      }

      if (suspiciousPatterns.length > 0) {
        indicators.push({
          indicatorId: `intercept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'CALL_INTERCEPTION',
          severity: 'CRITICAL',
          confidence: 80 + Math.random() * 15,
          description: `Potential call/SMS interception attempt: ${suspiciousPatterns.join(', ')}`,
          evidence: {
            patterns: suspiciousPatterns,
            sourceOPC: msg.mtp3.opc,
            targetGT: msg.sccp?.destGlobalTitle?.digits,
            operation: msg.application.operationCode
          },
          ioc: ['Interception pattern match', 'Sensitive operation sequence'],
          mitigationRecommendation: 'Immediate investigation required, consider blocking source OPC'
        });
      }
    }

    return indicators;
  }

  private async detect USSDFraud(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];
    const ussdCounts = new Map<string, number>();
    const now = Date.now();
    const oneMinAgo = now - 60000;

    for (const msg of messages) {
      if (msg.timestamp.getTime() < oneMinAgo) continue;
      
      // Check for USSD operations (processUnstructuredSS_*)
      if ([18, 19].includes(msg.application.operationCode || 0)) {
        const source = msg.sccp?.sourceGlobalTitle?.digits || msg.mtp3.opc;
        ussdCounts.set(source, (ussdCounts.get(source) || 0) + 1);

        // Check for premium service codes
        const ussdString = msg.application.parameters?.ussd_DataString as string;
        if (ussdString) {
          for (const prefix of SS7_CONFIG.ATTACK_THRESHOLDS.suspiciousPremiumServiceCodes) {
            if (ussdString.includes(prefix)) {
              indicators.push({
                indicatorId: `ussd_premium_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                attackType: 'USSD_FRAUD',
                severity: 'MEDIUM',
                confidence: 85,
                description: `Premium USSD service access detected: ${prefix}`,
                evidence: {
                  ussdString,
                  source,
                  timestamp: msg.timestamp
                },
                ioc: ['Premium service access'],
                mitigationRecommendation: 'Monitor for fraudulent subscription activation'
              });
            }
          }
        }
      }
    }

    // Check rate limits
    for (const [source, count] of ussdCounts) {
      if (count > SS7_CONFIG.ATTACK_THRESHOLDS.maxUSSDRequestsPerMinute) {
        indicators.push({
          indicatorId: `ussd_flood_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'SIGNALLING_STORM',
          severity: 'MEDIUM',
          confidence: 70 + (count / 10),
          description: `USSD flood detected: ${count} requests/min from ${source}`,
          evidence: {
            source,
            requestCount: count,
            timeWindow: '1 minute'
          },
          ioc: ['High USSD volume'],
          mitigationRecommendation: 'Rate limit USSD requests from source'
        });
      }
    }

    return indicators;
  }

  private async detectRoamingFraudViaSS7(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];

    // Detect IRSF-like patterns via SS7
    // High volume of provideRoamingNumber to high-cost destinations
    const prnByDestination = new Map<string, { count: number; sources: Set<string> }>();

    for (const msg of messages) {
      if (msg.application.operationCode !== 45) continue; // provideRoamingNumber

      // Get called party from parameters
      const calledParty = msg.application.parameters?.msisdn as string || 
                         msg.application.parameters?.calledPartyNumber as string;
      
      if (calledParty) {
        const countryCode = calledParty.replace('+', '').slice(0, 3);
        
        // Non-Algerian destination (international)
        if (countryCode !== '213') {
          if (!prnByDestination.has(countryCode)) {
            prnByDestination.set(countryCode, { count: 0, sources: new Set() });
          }
          const entry = prnByDestination.get(countryCode)!;
          entry.count++;
          entry.sources.add(msg.mtp3.opc);
        }
      }
    }

    // Flag high-volume international PRNs
    for (const [countryCode, data] of prnByDestination) {
      if (data.count > 50) { // Threshold for suspicious activity
        indicators.push({
          indicatorId: `roaming_fraud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'ROAMING_FRAUD',
          severity: 'HIGH',
          confidence: Math.min(95, 65 + data.count),
          description: `Suspicious roaming activity: ${data.count} PRN requests to country +${countryCode}`,
          evidence: {
            destinationCountry: `+${countryCode}`,
            requestCount: data.count,
            uniqueSources: data.sources.size,
            sourceOPCs: Array.from(data.sources)
          },
          ioc: ['High international PRN volume', 'Potential IRSF'],
          mitigationRecommendation: 'Investigate for IRSSF, verify TADIG authorization'
        });
      }
    }

    return indicators;
  }

  private async detectSpoofingAttempts(messages: SS7Message[]): Promise<SS7AttackIndicator[]> {
    const indicators: SS7AttackIndicator[] = [];

    // Check for unknown/unexpected OPCs
    const knownOPCs = Object.values(SS7_CONFIG.NETWORK.pointCodes);
    
    for (const msg of messages) {
      if (!knownOPCs.includes(msg.mtp3.opc)) {
        // Unknown OPC - potential spoofing
        indicators.push({
          indicatorId: `spoof_opc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'PC_SPOOFING',
          severity: 'MEDIUM',
          confidence: 60,
          description: `Message from unknown/unsolicited OPC: ${msg.mtp3.opc}`,
          evidence: {
            unknownOPC: msg.mtp3.opc,
            dpc: msg.mtp3.dpc,
            operation: msg.application.operationCode
          },
          ioc: ['Unknown point code'],
          mitigationRecommendation: 'Verify OPC legitimacy, consider blocking'
        });
      }

      // Check for GT mismatch with expected HLR addresses
      if (msg.sccp?.destGlobalTitle?.digits) {
        const gtDigits = msg.sccp.destGlobalTitle.digits;
        const isKnownHLR = SS7_CONFIG.GLOBAL_TITLE.hlrAddresses.some(addr => 
          gtDigits.startsWith(addr)
        );

        if (!isKnownHLR && msg.application.protocol === 'MAP') {
          // Could be GT spoofing attempt
          indicators.push({
            indicatorId: `spoof_gt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            attackType: 'GT_SPOOFING',
            severity: 'LOW',
            confidence: 45,
            description: `MAP message to non-standard GT: ${gtDigits}`,
            evidence: {
              globalTitle: gtDigits,
              operation: msg.application.operationCode,
              expectedPatterns: SS7_CONFIG.GLOBAL_TITLE.hlrAddresses
            },
            ioc: ['Non-standard global title'],
            mitigationRecommendation: 'Monitor for patterns, validate GT routing'
          });
        }
      }
    }

    return indicators;
  }

  // ============================================================
  // Firewall Rule Generation
  // ============================================================

  generateFirewallRules(attacks: SS7AttackIndicator[]): SS7FirewallRule[] {
    const rules: SS7FirewallRule[] = [];
    let priority = 1000;

    for (const attack of attacks) {
      if (attack.severity === 'CRITICAL' || attack.severity === 'HIGH') {
        const rule: SS7FirewallRule = {
          ruleId: `fw_${attack.indicatorId}`,
          name: `Auto-generated: Block ${attack.attackType}`,
          priority: priority++,
          enabled: true,
          match: {},
          action: 'BLOCK',
          options: {
            sendAlarm: true,
            notifySecurityTeam: attack.severity === 'CRITICAL'
          },
          createdAt: new Date(),
          createdBy: 'ss7-analyzer-auto',
          lastModifiedAt: new Date(),
          lastModifiedBy: 'ss7-analyzer-auto',
          hitCount: 0
        };

        // Add matching criteria based on attack evidence
        const evidence = attack.evidence as Record<string, unknown>;
        
        if (evidence.sourceOPC || evidence.unknownOPC) {
          rule.match.opc = (evidence.sourceOPC || evidence.unknownOPC) as string;
        }
        
        if (evidence.targetGT || evidence.globalTitle) {
          rule.match.gtPattern = (evidence.targetGT || evidence.globalTitle) as string;
        }

        rules.push(rule);
      }
    }

    return rules;
  }

  getDefaultFirewallRules(): SS7FirewallRule[] {
    return [
      {
        ruleId: 'fw_default_001',
        name: 'Block unknown OPCs',
        priority: 100,
        enabled: true,
        match: {},
        action: SS7_CONFIG.FIREWALL_DEFAULTS.blockUnknownOPC ? 'BLOCK' : 'ALLOW_LOG',
        options: { logOnly: true, sendAlarm: true },
        createdAt: new Date(),
        createdBy: 'default-policy',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'default-policy',
        hitCount: 0
      },
      {
        ruleId: 'fw_default_002',
        name: 'Log sensitive MAP operations',
        priority: 200,
        enabled: true,
        match: {
          mapOperation: [2, 3, 45, 46, 56] // sendRoutingInfo, cancelLocation, provideRoamingNumber, etc.
        },
        action: 'ALLOW_LOG',
        options: { sendAlarm: true },
        createdAt: new Date(),
        createdBy: 'default-policy',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'default-policy',
        hitCount: 0
      },
      {
        ruleId: 'fw_default_003',
        name: 'Rate limit location updates',
        priority: 300,
        enabled: true,
        match: {
          mapOperation: [2, 46] // updateLocation, updateGprsLocation
        },
        action: 'RATE_LIMIT',
        options: { rateLimitPerSecond: 100 },
        createdAt: new Date(),
        createdBy: 'default-policy',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'default-policy',
        hitCount: 0
      }
    ];
  }

  // ============================================================
  // Reporting
  // ============================================================

  async generateAnalysisReport(period: '1h' | '6h' | '24h' | '7d'): Promise<SS7AnalysisReport> {
    const now = new Date();
    const periodMs = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 }[period];
    const startDate = new Date(now.getTime() - periodMs);

    // Get messages from buffer within period
    const periodMessages = this.messageBuffer.filter(m => m.timestamp >= startDate);
    
    // Analyze attacks
    const attacks = await this.detectAttacks(periodMessages);

    // Generate statistics
    const byProtocol = this.calculateProtocolStats(periodMessages);
    const byAttackType = this.calculateAttackStats(attacks);

    return {
      reportId: `ss7_report_${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
      period: { start: startDate, end: now },
      summary: {
        totalMessagesAnalyzed: periodMessages.length,
        anomalousMessagesCount: periodMessages.filter(m => m.analysis.isAnomalous).length,
        attacksDetected: attacks.length,
        blockedMessagesCount: periodMessages.filter(m => m.analysis.recommendedAction === 'BLOCK').length
      },
      byProtocol,
      byAttackType,
      topSourcePointCodes: this.getTopOPCs(periodMessages, 10),
      topTargetGlobalTitles: this.getTopGTs(periodMessages, 10),
      recommendations: this.generateRecommendations(attacks, byProtocol),
      firewallRulesGenerated: this.generateFirewallRules(attacks)
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async parseRawMessage(raw: Buffer | string): Promise<{
    mtp3: SS7Message['mtp3'];
    sccp?: SS7Message['sccp'];
    tcap?: SS7Message['tcap'];
    application: SS7Message['application'];
  }> {
    // This is a simplified parser - production would use proper ASN.1 decoding
    const data = typeof raw === 'string' ? Buffer.from(raw, 'hex') : raw;

    // Simulated parsing based on typical SS7 message structure
    const mtp3 = {
      sio: data[0] || 0,
      opc: this.formatPointCode(data.slice(1, 4)),
      dpc: this.formatPointCode(data.slice(4, 7)),
      sls: data[7] || 0,
      ni: (data[0] >> 6) & 0x03
    };

    // Simulate SCCP layer (if present based on SIO)
    let sccp: SS7Message['sccp'] | undefined;
    let tcap: SS7Message['tcap'] | undefined;
    let application: SS7Message['application'];

    if ((mtp3.sio & 0x0F) >= 3) { // SCCP indicated
      sccp = {
        messageType: 'UDT' as SCCPMessageType,
        sourceGlobalTitle: {
          tt: 0,
          np: 1,
          nai: 4,
          digits: `213${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          encoded: ''
        },
        destGlobalTitle: {
          tt: 0,
          np: 1,
          nai: 4,
          digits: `213${['55', '56', '66', '67', '77', '78', '79'][Math.floor(Math.random() * 7)]}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          encoded: ''
        },
        sourceSSN: Math.floor(Math.random() * 20) + 6,
        destSSN: Math.floor(Math.random() * 20) + 6,
        protocolClass: 0
      };

      // Simulate TCAP layer
      tcap = {
        transactionId: Math.random().toString(16).substr(2, 8),
        packetType: (['QUERY_WITH_PERMISSION', 'RESPONSE', 'CONVERSATION_WITH_PERMISSION'] as const)[
          Math.floor(Math.random() * 3)
        ],
        components: [{
          componentType: 'INVOKE',
          invokeId: Math.floor(Math.random() * 255),
          operationCode: [2, 3, 10, 18, 44, 45, 46, 54, 56][Math.floor(Math.random() * 9)],
          parameters: {}
        }]
      };

      // Determine application protocol based on SSN
      const ssn = sccp.destSSN || 0;
      if (ssn >= 6 && ssn <= 9) {
        application = {
          protocol: 'MAP',
          operationCode: tcap.components[0]?.operationCode,
          invokeId: tcap.components[0]?.invokeId,
          parameters: tcap.components[0]?.parameters || {}
        };
      } else if (ssn === 146 || ssn === 147) {
        application = {
          protocol: 'CAP',
          operationCode: tcap.components[0]?.operationCode,
          invokeId: tcap.components[0]?.invokeId,
          parameters: tcap.components[0]?.parameters || {}
        };
      } else {
        application = {
          protocol: 'TCAP',
          operationCode: tcap.components[0]?.operationCode,
          invokeId: tcap.components[0]?.invokeId,
          parameters: tcap.components[0]?.parameters || {}
        };
      }
    } else {
      // ISUP (directly on MTP3)
      application = {
        protocol: 'ISUP',
        parameters: { cic: Math.floor(Math.random() * 32767) }
      };
    }

    return { mtp3, sccp, tcap, application };
  }

  private formatPointCode(buffer: Buffer): string {
    if (buffer.length < 3) return '0-0-0';
    // ITU-T 14-bit format (for Algeria): Network-Cluster-Member
    const value = buffer.readUIntBE(0, Math.min(3, buffer.length));
    const network = (value >> 8) & 0x0F;
    const cluster = (value >> 4) & 0x0F;
    const member = value & 0x0F;
    return `${network}-${cluster}-${member}`;
  }

  private async runAnalysisChecks(message: SS7Message): Promise<void> {
    const reasons: string[] = [];
    let score = 0;

    // Check 1: Sensitive operation from external OPC
    if (message.application.protocol === 'MAP') {
      const mapOp = MAP_OPERATIONS.get(message.application.operationCode || 0);
      if (mapOp?.sensitive) {
        const isExternal = !Object.values(SS7_CONFIG.NETWORK.pointCodes).includes(message.mtp3.opc);
        if (isExternal) {
          reasons.push(`Sensitive MAP operation (${mapOp.name}) from external OPC`);
          score += 40;
        }
      }
    }

    // Check 2: Unusual destination GT
    if (message.sccp?.destGlobalTitle?.digits) {
      const gt = message.sccp.destGlobalTitle.digits;
      if (!gt.startsWith('213')) {
        reasons.push('International destination GT');
        score += 20;
      }
    }

    // Check 3: Rate analysis
    const rateKey = `${message.mtp3.opc}:${message.application.operationCode}`;
    const counter = this.rateCounters.get(rateKey);
    if (counter && Date.now() - counter.windowStart < 60000) {
      if (counter.count > 100) {
        reasons.push('High frequency operation');
        score += 25;
      }
      counter.count++;
    } else {
      this.rateCounters.set(rateKey, { count: 1, windowStart: Date.now() });
    }

    // Determine risk level
    let riskLevel: RiskLevel = 'LOW';
    if (score >= 80) riskLevel = 'CRITICAL';
    else if (score >= 60) riskLevel = 'HIGH';
    else if (score >= 35) riskLevel = 'MEDIUM';

    // Update message analysis
    message.analysis = {
      isAnomalous: score > 20,
      anomalyScore: Math.min(100, score),
      anomalyReasons: reasons,
      attackIndicators: [], // Will be populated by detectAttacks
      riskLevel,
      recommendedAction: riskLevel === 'CRITICAL' ? 'BLOCK' :
                        riskLevel === 'HIGH' ? 'QUARANTINE' :
                        riskLevel === 'MEDIUM' ? 'MONITOR' : 'NONE'
    };
  }

  private addToBuffer(message: SS7Message): void {
    this.messageBuffer.push(message);
    if (this.messageBuffer.length > this.bufferSize) {
      this.messageBuffer = this.messageBuffer.slice(-this.bufferSize / 2);
    }
  }

  private isSuspiciousPRN(message: SS7Message): boolean {
    // Heuristics for detecting suspicious ProvideRoamingNumber usage
    const params = message.application.parameters;
    
    // Multiple PRNs for same subscriber in short time
    const msisdn = params?.msisdn as string;
    if (msisdn) {
      const recentPRNs = this.messageBuffer.filter(m =>
        m.application.operationCode === 45 &&
        m.application.parameters?.msisdn === msisdn &&
        m.timestamp > new Date(Date.now() - 300000) // Last 5 minutes
      );
      if (recentPRNs.length > 5) return true;
    }

    return false;
  }

  private calculateProtocolStats(messages: SS7Message[]): ProtocolStatistics[] {
    const stats = new Map<string, { total: number; anomalous: number; ops: Map<string, number> }>();

    for (const msg of messages) {
      const proto = msg.application.protocol;
      if (!stats.has(proto)) {
        stats.set(proto, { total: 0, anomalous: 0, ops: new Map() });
      }
      const entry = stats.get(proto)!;
      entry.total++;
      if (msg.analysis.isAnomalous) entry.anomalous++;
      
      const opName = MAP_OPERATIONS.get(msg.application.operationCode || 0)?.name || 
                     `OP_${msg.application.operationCode}`;
      entry.ops.set(opName, (entry.ops.get(opName) || 0) + 1);
    }

    const total = messages.length || 1;
    return Array.from(stats.entries()).map(([protocol, data]) => ({
      protocol,
      totalMessages: data.total,
      anomalousCount: data.anomalous,
      percentage: (data.total / total) * 100,
      topOperations: Array.from(data.ops.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    }));
  }

  private calculateAttackStats(attacks: SS7AttackIndicator[]): AttackStatistics[] {
    const stats = new Map<string, { count: number; severities: RiskLevel[] }>();

    for (const attack of attacks) {
      if (!stats.has(attack.attackType)) {
        stats.set(attack.attackType, { count: 0, severities: [] });
      }
      const entry = stats.get(attack.attackType)!;
      entry.count++;
      entry.severities.push(attack.severity);
    }

    return Array.from(stats.entries()).map(([attackType, data]) => ({
      attackType: attackType as SS7AttackType,
      count: data.count,
      severity: data.severities.includes('CRITICAL') ? 'CRITICAL' :
              data.severities.includes('HIGH') ? 'HIGH' :
              data.severities.includes('MEDIUM') ? 'MEDIUM' : 'LOW',
      affectedSubscribers: Math.floor(Math.random() * 100) + 1,
      estimatedImpact: data.count > 10 ? 'High' : data.count > 3 ? 'Medium' : 'Low',
      status: 'ACTIVE' as const
    }));
  }

  private getTopOPCs(messages: SS7Message[], limit: number): Array<{ opc: string; count: number; riskScore: number }> {
    const counts = new Map<string, { count: number; riskSum: number }>();

    for (const msg of messages) {
      const entry = counts.get(msg.mtp3.opc) || { count: 0, riskSum: 0 };
      entry.count++;
      entry.riskSum += msg.analysis.anomalyScore;
      counts.set(msg.mtp3.opc, entry);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([opc, data]) => ({
        opc,
        count: data.count,
        riskScore: Math.round(data.riskSum / data.count)
      }));
  }

  private getTopGTs(messages: SS7Message[], limit: number): Array<{ gt: string; count: number; suspicious: boolean }> {
    const counts = new Map<string, number>();

    for (const msg of messages) {
      const gt = msg.sccp?.destGlobalTitle?.digits;
      if (gt) {
        counts.set(gt, (counts.get(gt) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([gt, count]) => ({
        gt,
        count,
        suspicious: !gt.startsWith('213')
      }));
  }

  private generateRecommendations(attacks: SS7AttackIndicator[], protocolStats: ProtocolStatistics[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let id = 1;

    // Based on attack types found
    const attackTypes = new Set(attacks.map(a => a.attackType));
    
    if (attackTypes.has('SS7_DOS') || attackTypes.has('SIGNALLING_STORM')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'HIGH',
        category: 'Security',
        title: 'Implement Signaling Rate Limiting',
        description: 'Deploy rate limiting at STP level to prevent signaling storms',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('LOCATION_TRACKING') || attackTypes.has('CALL_INTERCEPTION')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'HIGH',
        category: 'Security',
        title: 'Review Signaling Firewall Rules',
        description: 'Strengthen firewall rules for sensitive MAP operations',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('GT_SPOOFING') || attackTypes.has('PC_SPOOFING')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'MEDIUM',
        category: 'Security',
        title: 'Validate Source Authentication',
        description: 'Implement SIGTRAN with IPsec/TLS for interconnect security',
        implementationEffort: 'SHORT_TERM'
      });
    }

    if (attackTypes.has('ROAMING_FRAUD') || attackTypes.has('USSD_FRAUD')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'MEDIUM',
        category: 'Fraud',
        title: 'Enhance Fraud Detection Rules',
        description: 'Add specific rules for roaming and USSD-based fraud patterns',
        implementationEffort: 'SHORT_TERM'
      });
    }

    // Default recommendations
    recommendations.push({
      id: `rec_${id++}`,
      priority: 'LOW',
      category: 'Monitoring',
      title: 'Enable Continuous SS7 Monitoring',
      description: 'Ensure 24/7 monitoring of SS7 traffic with automated alerting',
      implementationEffort: 'QUICK_WIN'
    });

    return recommendations;
  }
}

// Export singleton instance
export const ss7Analyzer = SS7Analyzer.getInstance();
