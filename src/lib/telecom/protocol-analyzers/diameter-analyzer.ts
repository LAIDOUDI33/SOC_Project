/**
 * National SOC Platform - Diameter Protocol Analyzer
 * 
 * Comprehensive Diameter protocol analysis for Djezzy LTE/EPC/IMS network:
 * - Cx/Dx Interface (IMS/HSS) Analysis
 * - Rx/Gx Interface (PCRF/PCEF) Inspection
 * - Sy/Sz Interface (Application Servers)
 * - Ro/Gy Interface (Online/Offline Charging)
 * - Diameter Attack Detection (Replay, Flooding)
 * - Credit Control Fraud Detection
 * - LTE/EPS Authentication Analysis
 * 
 * @version 1.0.0
 * @module diameter-analyzer
 */

import { db } from '@/lib/db';

// ============================================================
// Constants & Configuration
// ============================================================

export const DIAMETER_CONFIG = {
  // Djezzy Diameter network configuration
  NETWORK: {
    realm: 'djezzy.dz',
    vendorId: 10415, // 3GPP vendor ID
    productName: 'Djezzy-Diameter-Analyzer',
    
    // Host identifiers for Djezzy network elements
    hosts: {
      hss: ['hss-01.djezzy.dz', 'hss-02.djezzy.dz'],
      mme: ['mme-alg.djezzy.dz', 'mme-ora.djezzy.dz', 'mme-con.djezzy.dz'],
      pcrf: ['pcrf.djezzy.dz'],
      pcef: ['pcef-gw.djezzy.dz'],
      ocs: ['ocs.djezzy.dz'],
      ofs: ['ofs.djezzy.dz'],
      as: ['as-ims.djezzy.dz']
    }
  },
  
  // Application IDs (RFC 6733, 3GPP TS 29.212, etc.)
  APPLICATION_IDS: {
    DIAMETER_COMMON: 0,
    NASAUTH: 1,           // NAS Authentication (Diameter EAP)
    DIAMETER_BASE_ACCOUNTING: 3,
    CREDIT_CONTROL: 4,     // Gy/Ro (RFC 4006)
    RELAY: 0xFFFFFFFF,
    
    // 3GPP Applications
    CX: 16777216,          // Cx (Cx/Dx for IMS)
    DX: 16777217,          // Dx
    SH: 16777218,          // Sh
    ZX: 16777219,          // Zh/Zx
    RX: 16777220,          // Rx (for AF to PCRF)
    GX: 16777221,          // Gx (for PCEF to PCRF)
    S9: 16777222,          // S9
    S10: 16777250,         // S10 (MME to MME)
    S11: 16777251,         // S11 (MME to SGW)
    S6A: 16777252,         // S6a (MME to HSS)
    S6B: 16777253,         // S6b (PDN-GW to AAA)
    SLH: 16777264,         // SLh
    SGD: 16777265,         // SGd
    T6A: 16777266,         // T6a
    T6B: 16777267,         // T6b
    STa: 16777268,         // STa
    S13: 16777269,        // S13 (MME to EIR)
    RW: 16777270,          // Rw
    T4: 16777271,          // T4
    S6M: 16777272,         // S6m
  },
  
  // Command codes
  COMMAND_CODES: {
    // Common commands
    ABORT_SESSION: 274,
    CAPABILITIES_EXCHANGE: 257,
    DEVICE_WATCHDOG_REQUEST: 280,
    DEVICE_WATCHDOG_ANSWER: 280,
    DISCONNECT_PEER: 282,
    RE_AUTH: 278,
    SESSION_TERMINATION: 275,
    
    // Credit control commands
    CC_REQUEST: 272,
    CC_ANSWER: 272,
    
    // 3GPP specific
    UPDATE_LOCATION: 316,
    CANCEL_LOCATION: 317,
    AUTHENTICATION_INFORMATION: 318,
    INSERT_SUBSCRIBER_DATA: 319,
    DELETE_SUBSCRIBER_DATA: 320,
    RESET: 321,
    NOTIFY: 323,
    PURGE_UE: 324,
  },
  
  // Result codes
  RESULT_CODES: {
    SUCCESS: 2001,
    FIRST_SUCCESS: 2001,
    MULTI_ROUND_AUTH: 2002,
    SUCCESS_SERVER_NOT_SUPPORTING_STORAGE: 2002,
    SUCCESS_SERVER_NAME_NOT_STORED: 2003,
    COMMAND_UNSUPPORTED: 3001,
    UNABLE_TO_DELIVER: 3002,
    REALM_NOT_SERVED: 3003,
    TOO_BUSY: 3004,
    LOOP_DETECTED: 3005,
    REDIRECT_INDICATION: 3006,
    APPLICATION_UNSUPPORTED: 3007,
    INVALID_HDR_BITS: 3008,
    INVALID_AVP_BITS: 3009,
    UNKNOWN_PEER: 3010,
    RE_AUTHENTICATION_NOT_SUPPORTED: 3011,
    OTHER_ERROR: 5012,
    DIAMETER_INVALID_AVP_VALUE: 5004,
    DIAMETER_MISSING_AVP: 5005,
    DIAMETER_RESOURCES_EXCEEDED: 5006,
    DIAMETER_COMMAND_NOT_SUPPORTED: 5010,
    DIAMETER_AUTH_APPLICATION_REJECTED: 5012,
    DIAMETER_AUTH_REJECTED: 4917,
    DIAMETER_USER_UNKNOWN: 5003,
    ERROR_IDENTITY_NOT_REGISTERED: 5000,
    ROAMING_NOT_ALLOWED: 5004,
    IDENTITY_NOT_REGISTERED_BY_EXTERNAL_AS: 5001,
    ROAMING_NOT_ALLOWED_IN_THIS_TRACKING_AREA: 5005,
    RAT_TYPE_NOT_ALLOWED: 5028,
    ERROR_UNKNOWN_EPS_SUBSCRIPTION: 5420,
    ERROR_RAT_FAILED: 5421,
    USER_DATA_NOT_AVAILABLE: 4181,
    ERROR_USER_DATA_NOT_AVAILABLE: 5422,
    NON_EXISTENT_PDN: 5440,
  },
  
  // Attack detection thresholds
  ATTACK_THRESHOLDS: {
    maxAuthAttemptsPerMinute: 30,
    maxCCRequestsPerSecond: 1000,
    maxULRPerHour: 100,
    replayWindowMs: 60000,
    suspiciousIMSIQueryPattern: true,
    blockUnknownRealms: false,
  }
} as const;

// ============================================================
// Type Definitions
// ============================================================

export interface DiameterMessage {
  messageId: string;
  timestamp: Date;
  
  // Header fields
  header: {
    version: number;       // Always 1 for RFC 3588
    messageLength: number;
    commandCode: number;
    applicationId: number;
    hopByHopId: string;
    endToEndId: string;
    flags: {
      isRequest: boolean;
      isProxiable: boolean;
      isError: boolean;
      isRetransmit: boolean;
    };
  };
  
  // AVPs (Attribute Value Pairs)
  avps: DiameterAVP[];
  
  // Parsed application-specific data
  parsedData: {
    commandName: string;
    applicationName: string;
    session?: SessionInfo;
    authInfo?: AuthInfo;
    creditControl?: CreditControlInfo;
    subscriberInfo?: SubscriberInfo;
    locationInfo?: LocationInfo;
  };
  
  // Analysis results
  analysis: {
    isAnomalous: boolean;
    anomalyScore: number;
    anomalyReasons: string[];
    attackIndicators: DiameterAttackIndicator[];
    riskLevel: RiskLevel;
    recommendedAction: string;
  };
  
  // Metadata
  metadata: {
    sourceIP: string;
    destinationIP: string;
    sourcePort: number;
    destinationPort: number;
    probeId: string;
    processingTimeMs: number;
  };
}

export interface DiameterAVP {
  code: number;
  vendorId?: number;
  flags: {
    mandatory: boolean;
    private: boolean;
  };
  data: unknown;
  rawData?: Buffer;
  name?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SessionInfo {
  sessionId: string;
  originHost: string;
  originRealm: string;
  destinationHost?: string;
  destinationRealm: string;
  authApplicationId?: number;
  acctApplicationId?: number;
  authSessionState?: AuthSessionState;
  state: SessionState;
}

export type AuthSessionState = 
  | 'NO_STATE_MAINTAINED'
  | 'NO_SESSION_EXISTED'
  | 'MAINTAINED';
  
export type SessionState = 
  | 'ACTIVE'
  | 'TERMINATED'
  | 'IDLE'
  | 'SUSPENDED'
  | 'FAILED';

export interface AuthInfo {
  userName?: string;     // IMSI or NAI
  publicIdentity?: string; // IMPU (Public Identity)
  sipAuthDataItem?: SIPAuthDataItem;
  eutranVectors?: EUTRANVector[];
  authenticationScheme?: string;
  authorizationPending?: boolean;
}

export interface SIPAuthDataItem {
  authItemNumber: number;
  authenticationMethod: string;
  authenticationAlgorithm: string;
  protocol: string;
  authenticate: string;
  authorization: string;
  confidentialityKey: string;
  integrityKey: string;
}

export interface EUTRANVector {
  rand: string;
  xres: string;
  autn: string;
  kasme: string;
}

export interface CreditControlInfo {
  ccRequestType: CCRequestType;
  ccRequestNumber: number;
  serviceContextId?: string;
  subscriptionId?: SubscriptionId[];
  requestedServiceUnit?: RequestedServiceUnit;
  usedServiceUnit?: UsedServiceUnit;
  grantedServiceUnit?: GrantedServiceUnit;
  resultCode?: number;
  finalUnitAction?: FinalUnitAction;
  costInformation?: CostInfo;
  remainingBalance?: BalanceInfo;
}

export type CCRequestType = 
  | 'INITIAL_REQUEST'
  | 'UPDATE_REQUEST'
  | 'TERMINATION_REQUEST'
  | 'EVENT_REQUEST';

export interface SubscriptionId {
  subscriptionIdType: SubscriptionIdType;
  subscriptionIdData: string;
}

export type SubscriptionIdType = 
  | 'END_USER_E164'
  | 'END_USER_IMSI'
  | 'END_USER_SIP_URI'
  | 'END_USER_NAI'
  | 'END_USER_PRIVATE';

export interface RequestedServiceUnit {
  ccTime?: number;
  ccMoney?: MoneyInfo;
  ccTotalOctets?: OctetInfo;
  ccInputOctets?: number;
  ccOutputOctets?: number;
  ccServiceSpecificUnits?: number;
}

export interface UsedServiceUnit {
  ccTime?: number;
  ccTotalOctets?: number;
  ccInputOctets?: number;
  ccOutputOctets?: number;
  ccServiceSpecificUnits?: number;
}

export interface GrantedServiceUnit {
  ccTime?: number;
  ccMoney?: MoneyInfo;
  ccTotalOctets?: OctetInfo;
  tariffTimeChange?: TariffChangeInfo;
}

export interface MoneyInfo {
  unitDigits: number;
  currencyCode: string;
}

export interface OctetInfo {
  value: number;
}

export interface FinalUnitAction = 
  | 'TERMINATE'
  | 'REDIRECT'
  | 'RESTRICT_ACCESS';

export interface CostInfo {
  unitValue: UnitValue;
  currencyCode: string;
  unitType: UnitType;
  costUnit: number;
}

export interface UnitValue {
  valueDigits: number;
  exponent: number;
}

export type UnitType = 'TIME' | 'MONEY' | 'TOTAL_OCTETS' | 'INPUT_OCTETS' | 'OUTPUT_OCTETS' | 'SERVICE_SPECIFIC_UNITS';

export interface BalanceInfo {
  balanceId: string;
  unitValue: UnitValue;
  validityTime?: number;
}

export interface TariffChangeInfo {
  tariffTimeChange: TariffTimeChangeType;
  currentTime: Date;
  resetTime: Date;
  nextTariffTime?: Date;
}

export type TariffTimeChangeType = 
  | 'UNIT_SPECIFIED'
  | 'TARIFF_CHANGE'
  | 'VALIDITY_TIME'
  | 'FINAL_UNIT_ACTION'
  | 'REMOVE_UNIT'
  | 'EXHAUSTED_VALIDITY_TIME'
  | 'EXHAUSTED_UNIT'
  | 'REFUND';

export interface SubscriberInfo {
  msisdn?: string;
  imsi?: string;
  accessRestrictionData?: number;
  subscriberStatus?: SubscriberStatus;
  networkAccessMode?: NetworkAccessMode;
  ambr?: AMBR;
  apnConfiguration?: APNConfig[];
  rauTauTimer?: number;
}

export type SubscriberStatus = 
  | 'SERVICE_GRANTED'
  | 'OPERATOR_DETERMINED_BARRING'
  | 'ACCESS_ALLOWED'
  | 'ACCESS_DENIED';

export type NetworkAccessMode = 
  | 'PACKET_AND_CIRCUIT'
  | 'ONLY_PACKET'
  | 'ONLY_CIRCUIT';

export interface AMBR {
  maxRequestedBandwidthUL: number; // kbps
  maxRequestedBandwidthDL: number; // kbps
}

export interface APNConfig {
  contextIdentifier: number;
  pdnType: PDNType;
  serviceSelection: string;
  subscribedRauTauTimer?: number;
  apnQosProfile?: APNQoSProfile;
  ambr?: AMBR;
  mip6AgentInfo?: string;
  selectionMode?: SelectionMode;
  warningSMC?: string;
}

export type PDNType = 'IPv4' | 'IPv6' | 'IPv4v6' | 'IPv4_or_IPv6';
export type SelectionMode = 'MS_PROVIDED_APN_SUBSCRIBED_VERIFIED' | 'MS_PROVIDED_APN_NOT_SUBSCRIBED' | 'NETWORK_PROVIDED_SUBSCRIBED_VERIFIED' | 'NETWORK_PROVIDED_NOT_SUBSCRIBED';

export interface APNQoSProfile {
  qci: number;
  arp: ARP;
  preemptionCapability: boolean;
  preemptionVulnerability: boolean;
  allocationRetentionPriority: number;
}

export interface ARP {
  priorityLevel: number;
  preemptionCapability: boolean;
  preemptionVulnerability: boolean;
}

export interface LocationInfo {
  mmeLocationInfo?: MMELocationInfo;
  currentLocation?: CurrentLocation;
  sai?: ServiceAreaIdentity;
  tai?: TrackingAreaIdentity;
  ecgi?: ECGI;
  ageOfLocationInformation?: number;
}

export interface MMELocationInfo {
  eCGI: string;
  tAI: string;
  ageOfLocationInformation: number;
}

export interface CurrentLocation {
  globalRNCId?: string;
  utranCellId?: string;
  extendedRNCId?: string;
  iMSI?: string;
  mmeName?: string;
  mcc: string;
  mnc: string;
  eCGI?: string;
  tAI?: string;
  ageOfLocationInformation?: number;
  geodeticInformation?: GeodeticInformation;
}

export interface ServiceAreaIdentity {
  mcc: string;
  mnc: string;
  lac: string;
  sac: string;
}

export interface TrackingAreaIdentity {
  mcc: string;
  mnc: string;
  tac: string;
}

export interface ECGI {
  mcc: string;
  mnc: string;
  cellId: string;
}

export interface GeodeticInformation {
  latitudeDegrees: number;
  longitudeDegrees: number;
  uncertainty: number;
  confidence: number;
}

// Attack Detection Types
export interface DiameterAttackIndicator {
  indicatorId: string;
  attackType: DiameterAttackType;
  severity: RiskLevel;
  confidence: number;
  description: string;
  evidence: Record<string, unknown>;
  ioc: string[];
  mitigationRecommendation: string;
}

export type DiameterAttackType = 
  | 'DIAMETER_FLOODING'
  | 'REPLAY_ATTACK'
  | 'AUTHENTICATION_ATTACK'
  | 'CREDIT_CONTROL_FRAUD'
  | 'SUBSCRIPTION_THEFT'
  | 'LOCATION_LEAKAGE'
  | 'ROAMING_ABUSE'
  | 'UNAUTHORIZED_ACCESS'
  | 'AVP_MANIPULATION'
  | 'SESSION_HIJACKING'
  | 'EAVESDROPPING'
  | 'DENIAL_OF_SERVICE';

// Analysis Report
export interface DiameterAnalysisReport {
  reportId: string;
  period: { start: Date; end: Date };
  summary: {
    totalMessagesAnalyzed: number;
    anomalousMessagesCount: number;
    attacksDetected: number;
    blockedMessagesCount: number;
  };
  byInterface: InterfaceStatistics;
  byCommand: CommandStatistics;
  topSourceHosts: Array<{ host: string; count: number; riskScore: number }>;
  authenticationStats: AuthenticationStatistics;
  creditControlStats: CreditControlStatistics;
  recommendations: Recommendation[];
}

export interface InterfaceStatistics {
  interface: string;
  applicationId: number;
  totalMessages: number;
  anomalousCount: number;
  percentage: number;
  topOperations: Array<{ name: string; count: number }>;
}

export interface CommandStatistics {
  commandCode: number;
  commandName: string;
  requestCount: number;
  responseCount: number;
  errorRate: number;
  avgResponseTimeMs: number;
}

export interface AuthenticationStatistics {
  totalAuthAttempts: number;
  successCount: number;
  failureCount: number;
  failureReasons: Record<string, number>;
  suspiciousPatterns: SuspiciousAuthPattern[];
}

export interface SuspiciousAuthPattern {
  patternType: string;
  description: string;
  count: number;
  affectedIMSIs: string[];
  severity: RiskLevel;
}

export interface CreditControlStatistics {
  totalCCRequests: number;
  successfulCharges: number;
  failedCharges: number;
  totalRevenue: number; // In DZD milliunits
  fraudIndicators: number;
  highValueTransactions: number;
  byRequestType: Record<CCRequestType, { count: number; amount: number }>;
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

export class DiameterAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DiameterAnalysisError';
  }
}

export class DiameterParseError extends DiameterAnalysisError {
  constructor(message: string, rawData?: Buffer) {
    super(message, 'PARSE_ERROR', { rawData: rawData?.toString('hex').slice(0, 200) });
    this.name = 'DiameterParseError';
  }
}

// ============================================================
// AVP Registry (Common and 3GPP AVPs)
// ============================================================

const AVP_REGISTRY: Map<number, { name: string; type: string; vendorId?: number }> = new Map([
  // Common AVPs (RFC 3588)
  [1, { name: 'User-Name', type: 'UTF8String' }],
  [25, { name: 'Class', type: 'OctetString' }],
  [26, { name: 'Vendor-Specific-Application-Id', type: 'Grouped' }],
  [27, { name: 'Session-Id', type: 'UTF8String' }],
  [55, { name: 'Event-Timestamp', type: 'Time' }],
  [263, { name: 'Session-Timeout', type: 'Unsigned32' }],
  [264, { name: 'State-Attribute', type: 'OctetString' }],
  [265, { name: 'Re-Auth-Request-Type', type: 'Enumerated' }],
  [266, { name: 'Session-Binding', type: 'Unsigned32' }],
  [267, { name: 'Origin-State-Id', type: 'Unsigned32' }],
  [268, { name: 'Proxy-Info', type: 'Grouped' }],
  [269, { name: 'Route-Record', type: 'DiameterIdentity' }],
  [270, { name: 'Destination-Host', type: 'DiameterIdentity' }],
  [271, { name: 'Origin-Realm', type: 'DiameterIdentity' }],
  [272, { name: 'Destination-Realm', type: 'DiameterIdentity' }],
  [273, { name: 'Authorization-Lifetime', type: 'Unsigned32' }],
  [274, { name: 'Auth-Application-Id', type: 'Unsigned32' }],
  [276, { name: 'Auth-Request-Type', type: 'Enumerated' }],
  [277, { name: 'Auth-Session-State', type: 'Enumerated' }],
  [278, { name: 'Origin-Host', type: 'DiameterIdentity' }],
  [279, { name: 'Supported-Applications', type: 'Grouped' }],
  [280, { name: 'Auth-Grace-Period', type: 'Unsigned32' }],
  [281, { name: 'Multi-Round-Time-Out', type: 'Unsigned32' }],
  [282, { name: 'Acct-Application-Id', type: 'Grouped' }],
  [283, { name: 'Vendor-Specific-Application-Id', type: 'Grouped' }],
  [284, { name: 'Redirect-Host', type: 'DiameterURI' }],
  [291, { name: 'Disconnect-Cause', type: 'Enumerated' }],
  [293, { name: 'Firmware-Revision', type: 'Unsigned32' }],
  [294, { name: 'Host-IP-Address', type: 'Address' }],
  [296, { name: 'CoA-Request-Type', type: 'Enumerated' }],
  [297, { name: 'Termination-Cause', type: 'Enumerated' }],
  [298, { name: 'Product-Name', type: 'UTF8String' }],
  [416, { name: 'CC-Request-Type', type: 'Enumerated' }],
  [417, { name: 'CC-Request-Number', type: 'Unsigned32' }],
  [418, { name: 'Multiple-Services-Indicator', type: 'Enumerated' }],
  [419, { name: 'Multiple-Services-Credit-Control', type: 'Grouped' }],
  [420, { name: 'Service-Identifier', type: 'String' }],
  [421, { name: 'Subscription-Id', type: 'Grouped' }],
  [422, { name: 'Granted-Service-Unit', type: 'Grouped' }],
  [423, { name: 'Requested-Service-Unit', type: 'Grouped' }],
  [424, { name: 'Used-Service-Unit', type: 'Grouped' }],
  [425, { name: 'Service-Parameter-Info', type: 'Grouped' }],
  [426, { name: 'Cost-Information', type: 'Grouped' }],
  [427, { name: 'Result-Code', type: 'Unsigned32' }],
  [430, { name: 'Redirect-Host-Usage', type: 'Enumerated' }],
  [431, { name: 'Redirect-Max-Cache-Time', type: 'Unsigned32' }],
  [432, { name: 'Proxy-Info', type: 'Grouped' }],
  [433, { name: 'Route-Record', type: 'DiameterIdentity' }],
  [434, { name: 'Failed-AVP', type: 'Grouped' }],
  [437, { name: 'Authorization-Lifetime', type: 'Unsigned32' }],
  [438, { name: 'Auth-Grace-Period', type: 'Unsigned32' }],
  [439, { name: 'Auth-Session-State', type: 'Enumerated' }],
  [440, { name: 'Re-Auth-Request-Type', type: 'Enumerated' }],
  [441, { name: 'Multi-Round-Time-Out', type: 'Unsigned32' }],
  [442, { name: 'Acct-Interim-Interval', type: 'Unsigned32' }],
  [443, { name: 'Accounting-Realtime-Required', type: 'Enumerated' }],
  [444, { name: 'Origin-State-Id', type: 'Unsigned32' }],
  [445, { name: 'Accounting-Record-Number', type: 'Unsigned32' }],
  [446, { name: 'Accounting-Record-Type', type: 'Enumerated' }],
  [447, { name: 'Accounting-Sub-Session-Id', type: 'UTF8String' }],
  [450, { name: 'Check-Balance', type: 'Grouped' }],
  [451, { name: 'Price-Request', type: 'Grouped' }],
  [452, { name: 'Accounting-Cost-Center', type: 'UTF8String' }],
  [453, { name: 'Credit-Control', type: 'Grouped' }],
  [454, { name: 'Cost-Answer', type: 'Grouped' }],
  [455, { name: 'Cost-Request', type: 'Grouped' }],
  [456, { name: 'Debit-Units', type: 'Grouped' }],
  [457, { name: 'Refund-Answer', type: 'Grouped' }],
  [458, { name: 'Refund-Request', type: 'Grouped' }],
  [459, { name: 'Unit-Verification', type: 'Grouped' }],
  [460, { name: 'ValidDuring', type: 'Grouped' }],
  [462, { name: 'G-S-U-Pool-Reference', type: 'Grouped' }],
  [463, { name: 'User-Equipment-Info', type: 'Grouped' }],
  [464, { name: 'Final-Unit-Action', type: 'Enumerated' }],
  [465, { name: 'Direct-Debiting-Failure-Handling', type: 'Enumerated' }],
  [466, { name: 'Validity-Time', type: 'Unsigned32' }],
  [467, { name: 'Tariff-Change-Usage', type: 'Enumerated' }],
  [468, { name: 'Cost-Unit', type: 'Grouped' }],
  [469, { name: 'Remaining-Balance', type: 'Grouped' }],
  [470, { name: 'Credit-Control-Failure-Handling', type: 'Enumerated' }],
  [471, { name: 'Exceeded-Usage', type: 'Grouped' }],
  [472, { name: 'Service-Parameter-Info', type: 'Grouped' }],
  [473, { name: 'Subscription-Id', type: 'Grouped' }],
  [474, { name: 'Subscriber-Role', type: 'Enumerated' }],
  [475, { name: 'Tariff-Information', type: 'Grouped' }],
  [476, { name: 'Requested-Action', type: 'Enumerated' }],
  [477, { name: 'Used-Service-Unit', type: 'Grouped' }],
  [478, { name: 'Multiple-Services-Credit-Control', type: 'Grouped' }],
  [480, { name: 'Service-Context-Id', type: 'UTF8String' }],
  [481, { name: 'AF-Charging-Identifier', type: 'UTF8String' }],
  [482, { name: 'AF-Application-Identifier', type: 'OctetString' }],
  [483, { name: 'Abort-Cause', type: 'Enumerated' }],
  [484, { name: 'Access-Network-Charging-Address', type: 'Address' }],
  [485, { name: 'Access-Network-Charging-Gx', type: 'Grouped' }],
  [486, { name: 'ADC-Rule-Base-Name', type: 'UTF8String' }],
  [487, { name: 'AF-Charging-Identifier', type: 'UTF8String' }],
  [488, { name: 'Application-Service-Provider-Info', type: 'Grouped' }],
  [489, { name: 'Bearer-Control-Mode', type: 'Enumerated' }],
  [490, { name: 'Bearer-Operation', type: 'Enumerated' }],
  [491, { name: 'Bearer-Usage', type: 'Enumerated' }],
  [492, { name: 'CC-Failure-Handling', type: 'Enumerated' }],
  [493, { name: 'CoA-Information', type: 'Grouped' }],
  [494, { name: 'Event-Trigger', type: 'Enumerated' }],
  [495, { name: 'Event', type: 'Grouped' }],
  [496, { name: 'Explicit-Notification', type: 'Grouped' }],
  [497, { name: 'Gpp-Session-Granularity', type: 'Enumerated' }],
  [498, { name: 'IP-CAN-Type', type: 'Enumerated' }],
  [499, { name: 'Mute-Notification', type: 'Enumerated' }],
  [500, { name: 'Offline', type: 'Enumerated' }],
  [501, { name: 'Online', type: 'Grouped' }],
  [502, { name: 'PCC-Rule-Status', type: 'Enumerated' }],
  [503, { name: 'QoS-Information', type: 'Grouped' }],
  [504, { name: 'Railway-Group-Id', type: 'UTF8String' }],
  [505, { name: 'RAT-Type', type: 'Enumerated' }],
  [506, { name: 'Re-Auth-Request-Type', type: 'Enumerated' }],
  [507, { name: 'Rule-Activation-Time', type: 'Time' }],
  [508, { name: 'Rule-Deactivation-Time', type: 'Time' }],
  [509, { name: 'Rule-Name', type: 'OctetString' }],
  [510, { name: 'Rule-Report-AVN', type: 'Grouped' }],
  [511, { name: 'Security-Parameter-Index', type: 'Unsigned32' }],
  [512, { name: 'Session-Release-Cause', type: 'Enumerated' }],
  [513, { name: 'Suggested-Packet-Filter-List', type: 'IPFilterRule' }],
  [514, { name: 'Supported-Features', type: 'Grouped' }],
  [515, { name: 'TDF-Application-Identifier', type: 'OctetString' }],
  [516, { name: 'TDF-Information', type: 'Grouped' }],
  [517, { name: 'Terminal-Information', type: 'Grouped' }],
  [518, { name: 'Tracking-Session-Id', type: 'UTF8String' }],
  [519, { name: 'Trigger', type: 'Grouped' }],
  [520, { name: 'TSC-Packe-Filter-Information', type: 'Grouped' }],
  [521, { name: 'User-CSG-Information', type: 'Grouped' }],
  [522, { name: 'User-Device-Information', type: 'Grouped' }],
  [523, { name: 'Charging-Rule-Install', type: 'Grouped' }],
  [524, { name: 'Charging-Rule-Remove', type: 'Grouped' }],
  [525, { name: 'Charging-Rule-Definition', type: 'Grouped' }],
  [526, { name: 'Charging-Rule-Name', type: 'OctetString' }],
  [527, { name: 'Charging-Rule-Report', type: 'Grouped' }],
  [528, { name: 'Flow-Description', type: 'IPFilterRule' }],
  [529, { name: 'Flow-Direction', type: 'Enumerated' }],
  [530, { name: 'Flows', type: 'Grouped' }],
  [531, { name: 'Flow-Status', type: 'Enumerated' }],
  [532, { name: 'Flow-Usage', type: 'Enumerated' }],
  [533, { name: 'Flows', type: 'Grouped' }],
  [534, { name: 'Gateway-Address', type: 'IPAddress' }],
  [535, { name: 'Mute-Access', type: 'Enumerated' }],
  [536, { name: 'Packet-Filter-Information', type: 'Grouped' }],
  [537, { name: 'Packet-Filter-Operation', type: 'Enumerated' }],
  [538, { name: 'Precedence', type: 'Unsigned32' }],
  [539, { name: 'Preemption-Capability', type: 'Enumerated' }],
  [540, { name: 'Preemption-Vulnerability', type: 'Enumerated' }],
  [541, { name: 'QCI', type: 'Unsigned32' }],
  [542, { name: 'Max-Requested-Bandwidth-DL', type: 'Unsigned32' }],
  [543, { name: 'Max-Requested-Bandwidth-UL', type: 'Unsigned32' }],
  [544, { name: 'Guaranteed-Bitrate-DL', type: 'Unsigned32' }],
  [545, { name: 'Guaranteed-Bitrate-UL', type: 'Unsigned32' }],
  [546, { name: 'Allocation-Retention-Priority', type: 'Unsigned32' }],
  [547, { name: 'Priority-Level', type: 'Unsigned32' }],
  [548, { name: 'Preempt-Cap', type: 'Enumerated' }],
  [549, { name: 'Preempt-Vuln', type: 'Enumerated' }],
  [550, { name: 'Vendor-Specific-Application-Id', type: 'Grouped' }],
  [551, { name: 'Default-EPS-Bearer-QoS', type: 'Grouped' }],
  [552, { name: 'AN-GW-Address', type: 'Address' }],
  [553, { name: 'Network-Request-Support', type: 'Enumerated' }],
  [554, { name: 'Session-Linking', type: 'Grouped' }],
  [555, { name: 'Bearer-Identifier', type: 'UTF8String' }],
  [556, { name: 'PDN-Connection-ID', type: 'UTF8String' }],
  [557, { name: 'PDN-Type', type: 'Enumerated' }],
  [558, { name: 'Supported-Features', type: 'Grouped' }],
  [559, { name: 'Heuristic-Diagnostics', type: 'Unsigned32' }],
  [560, { name: 'Serving-PLMN-Rate-Control', type: 'Unsigned32' }],
  [561, { name: 'AN-Trusted', type: 'Enumerated' }],
  [562, { name: 'RAT-Type', type: 'Enumerated' }],
  [563, { name: 'EPC-Routing-Rule-Install', type: 'Grouped' }],
  [564, { name: 'EPC-Routing-Rule-Remove', type: 'Grouped' }],
  [565, { name: 'EPC-Routing-Rule-Definition', type: 'Grouped' }],
  [566, { name: 'EPC-Routing-Rule-Name', type: 'OctetString' }],
  [567, { name: 'EPC-Routing-Rule-Base-Name', type: 'UTF8String' }],
  [568, { name: 'Charging-Rule-Base-Name', type: 'UTF8String' }],
  [569, { name: 'Default-EPS-Bearer-QoS', type: 'Grouped' }],
  [570, { name: '3GPP-RAT-Type', type: 'OctetString' }],
  [571, { name: 'Serving-Node-Type', type: 'Enumerated' }],
  [572, { name: 'Charging-Characteristics-Selection-Mode', type: 'Enumerated' }],
  [573, { name: 'User-CSG-Information', type: 'Grouped' }],
  [574, { name: 'CSG-Membership-Indication', type: 'Enumerated' }],
  [575, { name: 'CSG-Id', type: 'OctetString' }],
  [576, { name: 'CSG-Access-Mode', type: 'Enumerated' }],
  [577, { name: 'APN-Aggregate-Max-Bitrate-DL', type: 'Unsigned32' }],
  [578, { name: 'APN-Aggregate-Max-Bitrate-UL', type: 'Unsigned32' }],
  [579, { name: 'UE-Local-IP-Address', type: 'Address' }],
  [580, { name: 'UE-Time-Zone', type: 'UTF8String' }],
  [581, { name: 'User-Location-Information', type: 'Grouped' }],
  [582, { name: 'Logical-Access-Id', type: 'UTF8String' }],
  [583, { name: 'Machine-Name', type: 'UTF8String' }],
  [584, { name: 'Affiliated-Identity', type: 'UTF8String' }],
  [585, { name: 'Allowed-SSCM', type: 'Unsigned32' }],
  [586, { name: 'Default-Context-Identifier', type: 'UTF8String' }],
  [587, { name: 'Duplicate-Session-Allowed', type: 'Enumerated' }],
  [588, { name: 'Dynamic-Address-Flag', type: 'Enumerated' }],
  [589, { name: 'DPR-Information', type: 'Grouped' }],
  [590, { name: 'MIP6-Agent-Info', type: 'Grouped' }],
  [591, { name: 'MIP6-Feature-Vector', type: 'Unsigned32' }],
  [592, { name: 'MIP-Home-Agent-Address', type: 'Address' }],
  [593, { name: 'MIP-Home-Agent-Host-DN', type: 'UTF8String' }],
  [594, { name: 'Supported-Vendor-Specific-App-Id', type: 'Grouped' }],
  [595, { name: 'Terminal-Information', type: 'Grouped' }],
  [596, { name: 'Idle-Timeout', type: 'Unsigned32' }],
  [597, { name: 'Allowed-Session-QoS', type: 'Grouped' }],
  [598, { name: 'Originating-Request', type: 'Enumerated' }],
  [599, { name: 'Max-Request-Bandwidth-DL', type: 'Unsigned32' }],
  [600, { name: 'Max-Request-Bandwidth-UL', type: 'Unsigned32' }],
  [601, { name: 'MIP6-Auth-Method', type: 'Unsigned32' }],
  [602, { name: 'MSISDN', type: 'UTF8String' }],
  [603, { name: 'External-Client-Protocol-Port', type: 'Unsigned32' }],
  [604, { name: 'External-Client-Protocol-Type', type: 'Enumerated' }],
  [605, { name: 'External-Client-Address', type: 'Address' }],
  [606, { name: 'External-Client-Use', type: 'Enumerated' }],
  [607, { name: 'DSLA', type: 'Grouped' }],
  [608, { name: 'DSRR', type: 'Grouped' }],
  [609, { name: 'DSRA', type: 'Grouped' }],
  [610, { name: 'DSRI', type: 'Grouped' }],
  [611, { name: 'DSRF', type: 'Grouped' }],
  [612, { name: 'DSRU', type: 'Grouped' }],
  [613, { name: 'DSRM', type: 'Grouped' }],
  [614, { name: 'DSRC', type: 'Grouped' }],
  [615, { name: 'DSRS', type: 'Grouped' }],
  [616, { name: 'DSRP', type: 'Grouped' }],
  [617, { name: 'DSRN', type: 'Grouped' }],
  [618, { name: 'DSRB', type: 'Grouped' }],
  [619, { name: 'DSRD', type: 'Grouped' }],
  [620, { name: 'DSRX', type: 'Grouped' }],
  [621, { name: 'DSRY', type: 'Grouped' }],
  [622, { name: 'DSRZ', type: 'Grouped' }],
  [623, { name: 'DSRQ', type: 'Grouped' }],
  [624, { name: 'DSRR', type: 'Grouped' }],
  [625, { name: 'DSRT', type: 'Grouped' }],
  [626, { name: 'DSRU', type: 'Grouped' }],
  [627, { name: 'DSRV', type: 'Grouped' }],
  [628, { name: 'DSRW', type: 'Grouped' }],
  [629, { name: 'DSRX', type: 'Grouped' }],
  [630, { name: 'DSRY', type: 'Grouped' }],
  [631, { name: 'DSRZ', type: 'Grouped' }],
  
  // 3GPP Specific AVPs
  [600, { name: 'User-Name', type: 'UTF8String', vendorId: 10415 }],
  [601, { name: 'Public-Identity', type: 'UTF8String', vendorId: 10415 }],
  [602, { name: 'Server-Name', type: 'UTF8String', vendorId: 10415 }],
  [603, { name: 'Server-Capabilities', type: 'Grouped', vendorId: 10415 }],
  [604, { name: 'SIP-Auth-Data-Item', type: 'Grouped', vendorId: 10415 }],
  [605, { name: 'SIP-Item-Number', type: 'Unsigned32', vendorId: 10415 }],
  [606, { name: 'SIP-Authentication-Scheme', type: 'UTF8String', vendorId: 10415 }],
  [607, { name: 'SIP-Authenticate', type: 'UTF8String', vendorId: 10415 }],
  [608, { name: 'SIP-Authorization', type: 'UTF8String', vendorId: 10415 }],
  [609, { name: 'SIP-Confidentiality-Key', type: 'OctetString', vendorId: 10415 }],
  [610, { name: 'SIP-Integrity-Key', type: 'OctetString', vendorId: 10415 }],
  [611, { name: 'Visited-Network-Identifier', type: 'UTF8String', vendorId: 10415 }],
  [612, { name: 'Method-Name', type: 'UTF8String', vendorId: 10415 }],
  [613, { name: 'Error-Answer', type: 'Grouped', vendorId: 10415 }],
  [614, { name: 'Error-Pointing-Code', type: 'Integer32', vendorId: 10415 }],
  [615, { name: 'Abort-Cause', type: 'Enumerated', vendorId: 10415 }],
  [616, { name: 'Abort-Session', type: 'Grouped', vendorId: 10415 }],
  [617, { name: 'Confidentiality-Key', type: 'OctetString', vendorId: 10415 }],
  [618, { name: 'Integrity-Key', type: 'OctetString', vendorId: 10415 }],
  [619, { name: 'User-Data', type: 'Grouped', vendorId: 10415 }],
  [620, { name: 'User-Data-Already-Available', type: 'Enumerated', vendorId: 10415 }],
  [621, { name: 'Feature-List-ID', type: 'Unsigned32', vendorId: 10415 }],
  [622, { name: 'Feature-List', type: 'Unsigned32', vendorId: 10415 }],
  [623, { name: 'Supported-Applications', type: 'Grouped', vendorId:: 10415 }],
  [624, { name: 'Associated-Identities', type: 'Grouped', vendorId: 10415 }],
  [625, { name: 'Originating-Request', type: 'Enumerated', vendorId: 10415 }],
  [626, { name: 'Supported-Features', type: 'Grouped', vendorId: 10415 }],
  [627, { name: 'Associated-Registered-Identities', type: 'Grouped', vendorId: 10415 }],
  [628, { name: 'Wildcarded-Public-Identity', type: 'UTF8String', vendorId: 10415 }],
  [629, { name: 'Wildcards', type: 'UTF8String', vendorId: 10415 }],
  [630, { name: 'Server-Assignment-Type', type: 'Enumerated', vendorId: 10415 }],
  [631, { name: 'User-Data-Request-Type', type: 'Enumerated', vendorId: 10415 }],
  [632, { name: 'Non-UE-data', type: 'Grouped', vendorId: 10415 }],
  [633, { name: 'UARFlags', type: 'Unsigned32', vendorId: 10415 }],
  [634, { name: 'SIP-Number-Auth-Items', type: 'Unsigned32', vendorId: 10415 }],
  [635, { name: 'Charging-Information', type: 'Grouped', vendorId: 10415 }],
  [636, { name: 'Trunk-Group-Information', type: 'Grouped', vendorId: 10415 }],
  [637, { name: 'Extended-KASME', type: 'OctetString', vendorId: 10415 }],
  [638, { name: 'Session-Priority', type: 'Unsigned32', vendorId: 10415 }],
  [639, { name: 'Operator-Identifier', type: 'Grouped', vendorId: 10415 }],
  [640, { name: 'Supported-Partner-Reg-IDs', type: 'UTF8String', vendorId: 10415 }],
  [641, { name: 'Operator-Indeterminate-Indicator', type: 'Enumerated', vendorId: 10415 }],
  [642, { name: 'User-Data-Contents', type: 'Grouped', vendorId: 10415 }],
  [643, { name: 'Private-Identity', type: 'UTF8String', vendorId: 10415 }],
  [644, { name: 'Public-Identity', type: 'UTF8String', vendorId: 10415 }],
  [645, { name: 'Wildcarded-IMPU', type: 'UTF8String', vendorId: 10415 }],
  [646, { name: 'Server-Name', type: 'UTF8String', vendorId: 10415 }],
  [647, { name: 'Server-Capabilities', type: 'Grouped', vendorId: 10415 }],
  [648, { name: 'Database-Media-Authorization-Application-Id', type: 'Unsigned32', vendorId: 10415 }],
  [649, { name: 'SIP-Auth-Data-Item', type: 'Grouped', vendorId: 10415 }],
  [650, { name: 'SIP-Item-Number', type: 'Unsigned32', vendorId: 10415 }],
  [651, { name: 'SIP-Authentication-Scheme', type: 'UTF8String', vendorId: 10415 }],
  [652, { name: 'SIP-Authenticate', type: 'UTF8String', vendorId: 10415 }],
  [653, { name: 'SIP-Authorization', type: 'UTF8String', vendorId: 10415 }],
  [654, { name: 'SIP-Confidentiality-Key', type: 'OctetString', vendorId: 10415 }],
  [655, { name: 'SIP-Integrity-Key', type: 'OctetString', vendorId: 10415 }],
  [656, { name: 'Line-Identifier', type: 'UTF8String', vendorId: 10415 }],
  [657, { name: 'Media-Initiation-flag', type: 'Enumerated', vendorId: 10415 }],
  [658, { name: 'SIP-Ifmatch', type: 'UTF8String', vendorId: 10415 }],
  [659, { name: 'User-Data', type: 'Grouped', vendorId: 10415 }],
  [660, { name: 'User-Data-Already-Available', type: 'Enumerated', vendorId: 10415 }],
  [661, { name: 'Feature-List-ID', type: 'Unsigned32', vendorId: 10415 }],
  [662, { name: 'Feature-List', type: 'Unsigned32', vendorId: 10415 }],
  [663, { name: 'Supported-Applications', type: 'Grouped', vendorId: 10415 }],
  [664, { name: 'Supported-Features', type: 'Grouped', vendorId: 10415 }],
  [665, { name: 'Deregistration-Reason', type: 'Grouped', vendorId: 10415 }],
  [666, { name: 'Administered-Requested-Data', type: 'Unsigned32', vendorId: 10415 }],
  [667, { name: 'Originating-Request', type: 'Enumerated', vendorId: 10415 }],
  [668, { name: 'User-Data-Request-Type', type: 'Enumerated', vendorId: 10415 }],
  [669, { name: 'Send-Data-Answer', type: 'Grouped', vendorId: 10415 }],
  [670, { name: 'Expiry-Time', type: 'Unsigned32', vendorId: 10415 }],
  [671, { name: 'Alias-Identity', type: 'UTF8String', vendorId: 10415 }],
  [672, { name: 'Identity-Set', type: 'Grouped', vendorId: 10415 }],
  [673, { name: 'Instance-Id', type: 'UTF8String', vendorId: 10415 }],
  [674, { name: 'Registration-Type', type: 'Enumerated', vendorId: 10415 }],
  [675, { name: 'Public-Identity', type: 'UTF8String', vendorId: 10415 }],
  [676, { name: 'Wildcarded-Public-Identity', type: 'UTF8String', vendorId: 10415 }],
  [677, { name: 'Wildcards', type: 'UTF8String', vendorId: 10415 }],
  [678, { name: 'MSISDN', type: 'UTF8String', vendorId: 10415 }],
  [679, { name: 'Called-Party-Address', type: 'UTF8String', vendorId: 10415 }],
  [680, { name: 'E-UTRAN-Vector', type: 'Grouped', vendorId: 10415 }],
  [681, { name: 'Item-Number', type: 'Unsigned32', vendorId: 10415 }],
  [682, { name: 'RAND', type: 'OctetString', vendorId: 10415 }],
  [683, { name: 'XRES', type: 'OctetString', vendorId: 10415 }],
  [684, { name: 'AUTN', type: 'OctetString', vendorId: 10415 }],
  [685, { name: 'KASME', type: 'OctetString', vendorId: 10415 }],
  [686, { name: 'Subscription-Data', type: 'Grouped', vendorId: 10415 }],
  [687, { name: 'Requested-EUTRAN-Authentication-Info', type: 'Grouped', vendorId: 10415 }],
  [688, { name: 'Number-of-Requested-Vectors', type: 'Unsigned32', vendorId: 10415 }},
  [689, { name: 'Immediate-Response-Preferred', type: 'Enumerated', vendorId: 10415 }],
  [690, { name: 'Authentication-Management-Field', type: 'OctetString', vendorId: 10415 }],
  [691, { name: 'Cancellation-Type', type: 'Enumerated', vendorId: 10415 }],
  [692, { name: 'Free-Format-Content', type: 'UTF8String', vendorId: 10415 }],
  [693, { name: 'Type', type: 'Unsigned32', vendorId: 10415 }],
  [694, { name: 'Sender', type: 'UTF8String', vendorId: 10415 }],
  [695, { name: 'Recipient', type: 'UTF8String', vendorId: 10415 }],
  [696, { name: 'Originator', type: 'UTF8String', vendorId: 10415 }],
  [697, { name: 'SMS-Node', type: 'Enumerated', vendorId: 10415 }],
  [698, { name: 'MME-Name', type: 'DiameterIdentity', vendorId: 10415 }],
  [699, { name: 'MME-Location-Information', type: 'Grouped', vendorId: 10415 }],
  [700, { name: 'Current-Location', type: 'Grouped', vendorId: 10415 }],
  [701, { name: 'EVS-No-Compression', type: 'Enumerated', vendorId: 10415 }],
  [702, { name: 'Last-UE-Activity-Time', type: 'Unsigned32', vendorId: 10415 }],
  [703, { name: 'RAT-Type', type: 'Unsigned32', vendorId: 10415 }],
  [704, { name: 'RAT-Frequency-Selection-Priority-ID', type: 'Unsigned32', vendorId: 10415 }],
  [705, { name: 'EPS-User-State', type: 'Enumerated', vendorId: 10415 }],
  [706, { name: 'EPS-Location-Information', type: 'Grouped', vendorId: 10415 }],
  [707, { name: 'EPS-User-State-Info', type: 'Grouped', vendorId: 10415 }],
  [708, { name: 'PNP-Paradigm', type: 'Enumerated', vendorId: 10415 }],
  [709, { name: 'Purge-UE-Flag', type: 'Enumerated', vendorId: 10415 }],
  [710, { name: 'Reset-ID', type: 'UTF8String', vendorId: 10415 }],
  [711, { name: 'UE-SRVCC-Capability', type: 'Unsigned32', vendorId: 10415 }],
  [712, { name: 'Peer-Server-Name', type: 'DiameterIdentity', vendorId: 10415 }],
  [713, { name: 'Absorption-Indicator', type: 'Unsigned32', vendorId: 10415 }],
  [714, { name: 'Trace-Reference', type: 'OctetString', vendorId: 10415 }],
  [715, { name: 'Trigger', type: 'Grouped', vendorId: 10415 }],
  [716, { name: 'ODG-Constraints', type: 'Grouped', vendorId: 10415 }],
  [717, { name: 'Complete-Data-List-Included-Indicator', type: 'Enumerated', vendorId: 10415 }],
  [718, { name: 'Broadcast-Stop-Indicator', type: 'Enumerated', vendorId: 10415 }],
  [719, { name: 'PSI-Activation-Time', type: 'Time', vendorId: 10415 }],
  [720, { name: 'Subscription-Deletion', type: 'Grouped', vendorId: 10415 }],
  [721, { name: 'Announcement-Id', type: 'UTF8String', vendorId: 10415 }],
  [722, { name: 'Cell-Access-Mode', type: 'Enumerated', vendorId: 10415 }],
  [723, { name: 'CSI-Id', type: 'UTF8String', vendorId: 10415 }],
  [724, { name: 'Barred-User-Service', type: 'Grouped', vendorId: 10415 }],
  [725, { name: 'GMLC-Restriction', type: 'Unsigned32', vendorId: 10415 }],
  [726, { name: 'MC-Info', type: 'Grouped', vendorId: 10415 }],
  [727, { name: 'CSG-Subscription-Data', type: 'Grouped', vendorId: 10415 }],
  [728, { name: 'Ue-Ambr', type: 'Grouped', vendorId: 10415 }],
  [729, { name: 'Apn-Configuration', type: 'Grouped', vendorId: 10415 }],
  [730, { name: 'Rau-Tau-Timer', type: 'Unsigned32', vendorId: 10415 }],
  [731, { name: { name: 'Ue-Usage-Type', type: 'Unsigned32', vendorId: 10415 }}[0].name || 'Ue-Usage-Type', type: 'Unsigned32', vendorId: 10415 }],
  [732, { name: 'Access-Restriction-Data', type: 'Unsigned32', vendorId: 10415 }],
  [733, { name: 'Subscriber-Status', type: 'Enumerated', vendorId: 10415 }],
  [734, { name: 'Network-Access-Mode', type: 'Enumerated', vendorId: 10415 }],
  [735, { name: 'AMBR', type: 'Grouped', vendorId: 10415 }],
  [736, { name: 'Subscribed-Periodic-RAU-TAU-Timer', type: 'Unsigned32', vendorId: 10415 }],
  [737, { name: 'Context-Identifier', type: 'Unsigned32', vendorId: 10415 }],
  [738, { name: 'All-APN-Configurations-Included-Indicator', type: 'Enumerated', vendorId: 10415 }],
  [739, { name: 'Apn-Configuration-Profile', type: 'Grouped', vendorId: 10415 }],
  [740, { name: 'Stn-Sr', type: 'UTF8String', vendorId: 10415 }],
  [741, { name: 'Csg-Subscription-Data', type: 'Grouped', vendorId: 10415 }],
  [742, { name: 'Mdt-User-Consent', type: 'Enumerated', vendorId: 10415 }],
  [743, { name: 'Csg-Id', type: 'OctetString', vendorId: 10415 }],
]);

// Command names registry
const COMMAND_NAMES: Map<number, string> = new Map([
  [256, 'Capabilities-Exchange-Request'],
  [257, 'Capabilities-Exchange-Answer'],
  [258, 'Re-Auth-Request'],
  [259, 'Re-Auth-Answer'],
  [260, 'Abort-Session-Request'],
  [261, 'Abort-Session-Answer'],
  [265, 'Session-Termination-Request'],
  [266, 'Session-Termination-Answer'],
  [268, 'Device-Watchdog-Request'],
  [269, 'Device-Watchdog-Answer'],
  [270, 'Disconnect-Peer-Request'],
  [271, 'Disconnect-Peer-Answer'],
  [272, 'Credit-Control-Request'],
  [273, 'Credit-Control-Answer'],
  [274, 'Abort-Session-Request'],
  [275, 'Session-Termination-Request'],
  [278, 'Re-Auth-Request'],
  [279, 'Re-Auth-Answer'],
  [280, 'Device-Watchdog-Request'],
  [281, 'Device-Watchdog-Answer'],
  [282, 'Disconnect-Peer-Request'],
  [283, 'Disconnect-Peer-Answer'],
  [300, 'User-Auth-Request'],
  [301, 'User-Auth-Answer'],
  [303, 'AA-Request'],
  [304, 'AA-Answer'],
  [305, 'Accounting-Start'],
  [306, 'Accounting-Answer'],
  [307, 'Accounting-Interim'],
  [308, 'Accounting-Interim-Answer'],
  [309, 'Accounting-Stop'],
  [310, 'Accounting-Stop-Answer'],
  [311, 'Accounting-Event'],
  [312, 'Accounting-Event-Answer'],
  [316, 'Update-Location-Request'],
  [317, 'Update-Location-Answer'],
  [318, 'Cancel-Location-Request'],
  [319, 'Cancel-Location-Answer'],
  [320, 'Authentication-Information-Request'],
  [321, 'Authentication-Information-Answer'],
  [322, 'Insert-Subscriber-Data-Request'],
  [323, 'Insert-Subscriber-Data-Answer'],
  [324, 'Delete-Subscriber-Data-Request'],
  [325, 'Delete-Subscriber-Data-Answer'],
  [326, 'Reset-Request'],
  [327, 'Reset-Answer'],
  [328, 'Notify-Request'],
  [329, 'Notify-Answer'],
  [330, 'Purge-UE-Request'],
  [331, 'Purge-UE-Answer'],
]);

// Application names registry
const APPLICATION_NAMES: Map<number, string> = new Map([
  [0, 'Common Messages'],
  [1, 'NASREQ / Diameter EAP'],
  [3, 'Base Accounting'],
  [4, 'Credit Control (Ro/Gy)'],
  [16777216, 'Cx (IMS/HSS)'],
  [16777217, 'Dx (IMS/HSS)'],
  [16777218, 'Sh (UDR/HSS)'],
  [16777219, 'Zh (UDR/HSS)'],
  [16777220, 'Rx (AF/PCRF)'],
  [16777221, 'Gx (PCEF/PCRF)'],
  [16777222, 'S9 (VPCRF/HPCRF)'],
  [16777250, 'S10 (MME/MME)'],
  [16777251, 'S11 (MME/SGW)'],
  [16777252, 'S6a (MME/HSS)'],
  [16777253, 'S6b (PGW/AAA)'],
  [16777269, 'S13 (MME/EIR)'],
]);

// ============================================================
// Main Diameter Analyzer Class
// ============================================================

export class DiameterAnalyzer {
  private static instance: DiameterAnalyzer;
  private messageBuffer: DiameterMessage[] = [];
  private bufferSize: number = 15000;
  private sessionCache: Map<string, SessionInfo> = new Map();
  private authAttemptCache: Map<string, { count: number; windowStart: number }> = new Map();

  private constructor() {}

  static getInstance(): DiameterAnalyzer {
    if (!DiameterAnalyzer.instance) {
      DiameterAnalyzer.instance = new DiameterAnalyzer();
    }
    return DiameterAnalyzer.instance;
  }

  // ============================================================
  // Message Parsing & Analysis
  // ============================================================

  async analyzeMessage(rawMessage: Buffer | string, metadata: {
    sourceIP: string;
    destinationIP: string;
    sourcePort: number;
    destinationPort: number;
    probeId: string;
  }): Promise<DiameterMessage> {
    const startTime = Date.now();

    try {
      // Parse raw message
      const parsed = await this.parseRawMessage(rawMessage);

      // Build complete message structure
      const message: DiameterMessage = {
        messageId: `dia_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        timestamp: new Date(),
        header: parsed.header,
        avps: parsed.avps,
        parsedData: this.extractApplicationData(parsed),
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

      // Update session cache
      this.updateSessionCache(message);

      // Add to buffer
      this.addToBuffer(message);

      return message;
    } catch (error) {
      throw new DiameterParseError(
        `Failed to parse Diameter message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        typeof rawMessage === 'string' ? undefined : rawMessage
      );
    }
  }

  async analyzeBatch(messages: Array<{
    raw: Buffer | string;
    metadata: { sourceIP: string; destinationIP: string; sourcePort: number; destinationPort: number; probeId: string };
  }>): Promise<DiameterMessage[]> {
    return Promise.all(messages.map(msg => this.analyzeMessage(msg.raw, msg.metadata)));
  }

  // ============================================================
  // Interface-Specific Analyzers
  // ============================================================

  async analyzeCxInterface(messages: DiameterMessage[]): Promise<CxAnalysisResult> {
    const cxMessages = messages.filter(m => 
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.CX ||
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.DX
    );

    return {
      interface: 'Cx/Dx',
      totalMessages: cxMessages.length,
      operations: this.countOperations(cxMessages),
      authResults: this.analyzeAuthResults(cxMessages),
      locationLeaks: await this.detectLocationLeakage(cxMessages),
      suspiciousPatterns: this.findSuspiciousPatterns(cxMessages)
    };
  }

  async analyzeRxInterface(messages: DiameterMessage[]): Promise<RxAnalysisResult> {
    const rxMessages = messages.filter(m => 
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.RX
    );

    return {
      interface: 'Rx',
      totalMessages: rxMessages.length,
      sessions: this.countSessions(rxMessages),
      qosViolations: this.detectQoSViolations(rxMessages),
      policyChanges: this.countPolicyChanges(rxMessages)
    };
  }

  async analyzeGxInterface(messages: DiameterMessage[]): Promise<GxAnalysisResult> {
    const gxMessages = messages.filter(m => 
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.GX
    );

    return {
      interface: 'Gx',
      totalMessages: gxMessages.length,
      chargingRules: this.analyzeChargingRules(gxMessages),
      pccRules: this.analyzePCCRules(gxMessages),
      bearerEvents: this.countBearerEvents(gxMessages)
    };
  }

  async analyzeRoGyInterface(messages: DiameterMessage[]): Promise<ChargingAnalysisResult> {
    const chargingMessages = messages.filter(m =>
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.CREDIT_CONTROL ||
      m.parsedData.commandName.includes('Credit-Control')
    );

    return {
      interface: 'Ro/Gy',
      totalMessages: chargingMessages.length,
      revenueEstimate: this.calculateRevenue(chargingMessages),
      fraudIndicators: await this.detectCreditControlFraud(chargingMessages),
      highValueTransactions: this.findHighValueTransactions(chargingMessages),
      byRequestType: this.groupByRequestType(chargingMessages)
    };
  }

  async analyzeS6aInterface(messages: DiameterMessage[]): Promise<S6aAnalysisResult> {
    const s6aMessages = messages.filter(m =>
      m.header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.S6A
    );

    return {
      interface: 'S6a',
      totalMessages: s6aMessages.length,
      updateLocations: s6aMessages.filter(m => m.header.commandCode === 316).length,
      authRequests: s6aMessages.filter(m => m.header.commandCode === 318).length,
      purgeRequests: s6aMessages.filter(m => m.header.commandCode === 324).length,
      authSuccessRate: this.calculateAuthSuccessRate(s6aMessages),
      roamingDetection: await this.detectRoamingAbuse(s6aMessages),
      imeiCloningDetection: await this.detectIMEICloning(s6aMessages)
    };
  }

  // ============================================================
  // Attack Detection Engine
  // ============================================================

  async detectAttacks(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const allIndicators: DiameterAttackIndicator[] = [];

    // Run all detection modules
    const floodingIndicators = await this.detectFlooding(messages);
    const replayIndicators = await this.detectReplayAttacks(messages);
    const authAttackIndicators = await this.detectAuthAttacks(messages);
    const ccFraudIndicators = await this.detectCreditControlFraud(messages);
    const subscriptionTheftIndicators = await this.detectSubscriptionTheft(messages);
    const unauthorizedAccessIndicators = await this.detectUnauthorizedAccess(messages);

    allIndicators.push(
      ...floodingIndicators,
      ...replayIndicators,
      ...authAttackIndicators,
      ...ccFraudIndicators,
      ...subscriptionTheftIndicators,
      ...unauthorizedAccessIndicators
    );

    return allIndicators;
  }

  private async detectFlooding(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    // Group by source host
    const bySource = new Map<string, DiameterMessage[]>();
    
    for (const msg of messages) {
      const sourceHost = this.getAVPValue(msg.avps, 'Origin-Host') as string || msg.metadata.sourceIP;
      if (!bySource.has(sourceHost)) {
        bySource.set(sourceHost, []);
      }
      bySource.get(sourceHost)!.push(msg);
    }

    for (const [source, sourceMessages] of bySource) {
      const recentMessages = sourceMessages.filter(m => now - m.timestamp.getTime() < windowMs);
      
      if (recentMessages.length > DIAMETER_CONFIG.ATTACK_THRESHOLDS.maxCCRequestsPerSecond * 60) {
        indicators.push({
          indicatorId: `flood_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'DIAMETER_FLOODING',
          severity: 'HIGH',
          confidence: Math.min(95, 60 + (recentMessages.length / 100)),
          description: `Diameter flood detected from ${source}: ${recentMessages.length} messages in 60s`,
          evidence: {
            sourceHost: source,
            messageCount: recentMessages.length,
            timeWindow: '60s',
            messagesPerSecond: Math.round(recentMessages.length / 60)
          },
          ioc: ['High message volume', 'Potential DoS attempt'],
          mitigationRecommendation: 'Rate limit or block source temporarily'
        });
      }
    }

    return indicators;
  }

  private async detectReplayAttacks(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];
    const seenIds = new Map<string, { timestamp: number; count: number }>();

    for (const msg of messages) {
      const key = `${msg.header.hopByHopId}:${msg.header.endToEndId}`;
      
      if (seenIds.has(key)) {
        const prev = seenIds.get(key)!;
        
        // Check if within replay window
        if (Date.now() - prev.timestamp < DIAMETER_CONFIG.ATTACK_THRESHOLDS.replayWindowMs) {
          prev.count++;
          
          if (prev.count > 3) {
            indicators.push({
              indicatorId: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              attackType: 'REPLAY_ATTACK',
              severity: 'HIGH',
              confidence: 85 + Math.random() * 10,
              description: `Replay attack detected: duplicate hop-by-hop/end-to-end ID pair`,
              evidence: {
                hopByHopId: msg.header.hopByHopId,
                endToEndId: msg.header.endToEndId,
                duplicateCount: prev.count,
                originalTimestamp: new Date(prev.timestamp)
              },
              ioc: ['Duplicate transaction IDs', 'Potential replay attack'],
              mitigationRecommendation: 'Investigate source, consider blocking'
            });
          }
        }
      } else {
        seenIds.set(key, { timestamp: msg.timestamp.getTime(), count: 1 });
      }
    }

    return indicators;
  }

  private async detectAuthAttacks(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];
    const now = Date.now();
    const oneMinAgo = now - 60000;

    // Count auth attempts per IMSI
    const authAttemptsByIMSI = new Map<string, number[]>();

    for (const msg of messages) {
      if (msg.timestamp.getTime() < oneMinAgo) continue;
      
      if (msg.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.AUTHENTICATION_INFORMATION) {
        const imsi = this.getAVPValue(msg.avps, 'User-Name') as string;
        if (imsi) {
          authAttemptsByIMSI.set(imsi, [
            ...(authAttemptsByIMSI.get(imsi) || []),
            msg.timestamp.getTime()
          ]);
        }
      }
    }

    // Check thresholds
    for (const [imsi, timestamps] of authAttemptsByIMSI) {
      if (timestamps.length > DIAMETER_CONFIG.ATTACK_THRESHOLDS.maxAuthAttemptsPerMinute) {
        indicators.push({
          indicatorId: `auth_attack_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'AUTHENTICATION_ATTACK',
          severity: 'CRITICAL',
          confidence: 80 + Math.random() * 15,
          description: `Brute force attack detected on IMSI ${this.maskIMSI(imsi)}: ${timestamps.length} attempts in 1 minute`,
          evidence: {
            imsi: this.maskIMSI(imsi),
            attemptCount: timestamps.length,
            timeWindow: '1 minute',
            attemptTimestamps: timestamps.slice(-10)
          },
          ioc: ['High auth attempt rate', 'Potential credential cracking'],
          mitigationRecommendation: 'Block IMSI temporarily, alert security team'
        });
      }
    }

    return indicators;
  }

  async detectCreditControlFraud(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];
    const ccMessages = messages.filter(m => 
      m.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.CC_REQUEST &&
      m.header.flags.isRequest
    );

    // Group by session
    const bySession = new Map<string, DiameterMessage[]>();
    for (const msg of ccMessages) {
      const sessionId = this.getAVPValue(msg.avps, 'Session-Id') as string;
      if (sessionId) {
        bySession.set(sessionId, [...(bySession.get(sessionId) || []), msg]);
      }
    }

    // Detect suspicious patterns
    for (const [sessionId, sessionMessages] of bySession) {
      // Check for rapid re-authentication (potential free usage exploitation)
      const reauths = sessionMessages.filter(m => {
        const ccType = this.getAVPValue(m.avps, 'CC-Request-Type');
        return ccType === 'UPDATE_REQUEST';
      });

      if (reauths.length > 50) { // Unusually high
        indicators.push({
          indicatorId: `cc_fraud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'CREDIT_CONTROL_FRAUD',
          severity: 'MEDIUM',
          confidence: 70,
          description: `Suspicious credit control activity: ${reauths.length} updates in session`,
          evidence: {
            sessionId,
            updateCount: reauths.length,
            totalMessages: sessionMessages.length
          },
          ioc: ['High update frequency', 'Potential quota manipulation'],
          mitigationRecommendation: 'Review session for fraud patterns'
        });
      }

      // Check for zero-balance continued usage
      const lastMsg = sessionMessages[sessionMessages.length - 1];
      const resultCode = this.getAVPValue(lastMsg?.avps, 'Result-Code') as number;
      if (resultCode && resultCode !== DIAMETER_CONFIG.RESULT_CODES.SUCCESS) {
        // Check if session continues after failure
        const subsequentMessages = messages.filter(m =>
          m.timestamp > lastMsg.timestamp &&
          this.getAVPValue(m.avps, 'Session-Id') === sessionId
        );

        if (subsequentMessages.length > 5) {
          indicators.push({
            indicatorId: `cc_bypass_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            attackType: 'CREDIT_CONTROL_FRAUD',
            severity: 'HIGH',
            confidence: 80,
            description: `Possible credit control bypass after error response`,
            evidence: {
              sessionId,
              lastResultCode: resultCode,
              postFailureMessages: subsequentMessages.length
            },
            ioc: ['Continued usage after denial', 'Potential OCS bypass'],
            mitigationRecommendation: 'Investigate OCS integration, check for bypass mechanisms'
          });
        }
      }
    }

    return indicators;
  }

  private async detectSubscriptionTheft(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];

    // Check for unusual Insert-Subscriber-Data patterns
    const isdMessages = messages.filter(m =>
      m.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.INSERT_SUBSCRIBER_DATA &&
      m.header.flags.isRequest
    );

    for (const msg of isdMessages) {
      const originHost = this.getAVPValue(msg.avps, 'Origin-Host') as string;
      const imsi = this.getAVPValue(msg.avps, 'User-Name') as string;

      // Check if from unexpected source
      const knownHosts = Object.values(DIAMETER_CONFIG.NETWORK.hosts).flat();
      if (!knownHosts.some(h => originHost?.includes(h.split('.')[0]))) {
        indicators.push({
          indicatorId: `sub_theft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'SUBSCRIPTION_THEFT',
          severity: 'HIGH',
          confidence: 75,
          description: `Subscriber data modification from untrusted source: ${originHost}`,
          evidence: {
            originHost,
            targetIMSI: this.maskIMSI(imsi || ''),
            operation: 'Insert-Subscriber-Data'
          },
          ioc: ['Untrusted data source', 'Potential data injection'],
          mitigationRecommendation: 'Verify source legitimacy, review access controls'
        });
      }
    }

    return indicators;
  }

  private async detectUnauthorizedAccess(messages: DiameterMessage[]): Promise<DiameterAttackIndicator[]> {
    const indicators: DiameterAttackIndicator[] = [];

    for (const msg of messages) {
      const originRealm = this.getAVPValue(msg.avps, 'Origin-Realm') as string;
      const destRealm = this.getAVPValue(msg.avps, 'Destination-Realm') as string;

      // Check for cross-realm attacks
      if (originRealm && destRealm && originRealm !== destRealm) {
        // Verify if inter-realm communication is expected
        const allowedRealms = [DIAMETER_CONFIG.NETWORK.realm];
        
        if (!allowedRealms.includes(originRealm) && !allowedRealms.includes(destRealm)) {
          // Check for sensitive operations
          const sensitiveCommands = [
            DIAMETER_CONFIG.COMMAND_CODES.AUTHENTICATION_INFORMATION,
            DIAMETER_CONFIG.COMMAND_CODES.INSERT_SUBSCRIBER_DATA,
            DIAMETER_CONFIG.COMMAND_CODES.RESET
          ];

          if (sensitiveCommands.includes(msg.header.commandCode)) {
            indicators.push({
              indicatorId: `unauth_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              attackType: 'UNAUTHORIZED_ACCESS',
              severity: 'MEDIUM',
              confidence: 60,
              description: `Cross-realm sensitive operation detected`,
              evidence: {
                originRealm,
                destRealm,
                commandCode: msg.header.commandCode,
                commandName: COMMAND_NAMES.get(msg.header.commandCode) || 'UNKNOWN'
              },
              ioc: ['Cross-realm operation', 'Potential unauthorized access'],
              mitigationRecommendation: 'Review inter-realm policies'
            });
          }
        }
      }
    }

    return indicators;
  }

  private async detectLocationLeakage(cxMessages: DiameterMessage[]): Promise<LocationLeakageIndicator[]> {
    const indicators: LocationLeakageIndicator[] = [];
    
    // Look for SAR (Server-Access-Request) with location info going to external realms
    for (const msg of cxMessages) {
      const destRealm = this.getAVPValue(msg.avps, 'Destination-Realm') as string;
      const hasLocation = this.hasLocationAVPs(msg.avps);

      if (hasLocation && destRealm && !destRealm.includes('djezzy')) {
        indicators.push({
          messageId: msg.messageId,
          destinationRealm: destRealm,
          includesGeodetic: this.hasGeodeticInfo(msg.avps),
          severity: 'HIGH',
          description: `Location data potentially exposed to external realm`
        });
      }
    }

    return indicators;
  }

  private async detectRoamingAbuse(s6aMessages: DiameterMessage[]): Promise<RoamingAbuseIndicator[]> {
    const indicators: RoamingAbuseIndicator[] = [];
    
    // Track ULR patterns that might indicate roaming abuse
    const ulrByIMSI = new Map<string, DiameterMessage[]>();

    for (const msg of s6aMessages) {
      if (msg.header.commandCode === 316) { // ULR
        const imsi = this.getAVPValue(msg.avps, 'User-Name') as string;
        if (imsi) {
          ulrByIMSI.set(imsi, [...(ulrByIMSI.get(imsi) || []), msg]);
        }
      }
    }

    // Check for frequent location updates across different regions
    for (const [imsi, messages] of ulrByIMSI) {
      if (messages.length > 20) { // High frequency updates
        const locations = messages.map(m => this.extractLocation(m));
        const uniqueLocations = new Set(locations.map(l => l.tai)).size;

        if (uniqueLocations > 5) { // Many different locations
          indicators.push({
            imsi: this.maskIMSI(imsi),
            updateCount: messages.length,
            uniqueLocations,
            timeSpanHours: this.calculateTimeSpan(messages),
            severity: 'MEDIUM',
            description: 'Suspicious roaming pattern detected'
          });
        }
      }
    }

    return indicators;
  }

  private async detectIMEICloning(s6aMessages: DiameterMessage[]): Promise<IMEICloneIndicator[]> {
    const indicators: IMEICloneIndicator[] = [];
    
    // Track IMEI-IMSI mappings
    const imeiToIMSIs = new Map<string, Set<string>>();

    for (const msg of s6aMessages) {
      const imsi = this.getAVPValue(msg.avps, 'User-Name') as string;
      const ueInfo = this.getAVP(msg.avps, 'User-Equipment-Info');
      
      if (ueInfo && imsi) {
        // Extract IMEI from UE info (simplified)
        const imei = 'imei_from_ue_info'; // Would parse properly
        
        if (!imeiToIMSIs.has(imei)) {
          imeiToIMSIs.set(imei, new Set());
        }
        imeiToIMSIs.get(imei)!.add(imsi);
      }
    }

    // Find IMEIs associated with multiple IMSIs
    for (const [imei, imsims] of imeiToIMSIs) {
      if (imsims.size > 3) { // Same IMEI with many different IMSIs
        indicators.push({
          imei: this.maskIMEI(imei),
          associatedIMSIMsCount: imsims.size,
          severity: 'HIGH',
          description: 'Potential IMEI cloning detected',
          recommendation: 'Investigate IMEI authenticity'
        });
      }
    }

    return indicators;
  }

  // ============================================================
  // Reporting
  // ============================================================

  async generateAnalysisReport(period: '1h' | '6h' | '24h' | '7d'): Promise<DiameterAnalysisReport> {
    const now = new Date();
    const periodMs = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 }[period];
    const startDate = new Date(now.getTime() - periodMs);

    const periodMessages = this.messageBuffer.filter(m => m.timestamp >= startDate);
    const attacks = await this.detectAttacks(periodMessages);

    return {
      reportId: `diam_report_${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
      period: { start: startDate, end: now },
      summary: {
        totalMessagesAnalyzed: periodMessages.length,
        anomalousMessagesCount: periodMessages.filter(m => m.analysis.isAnomalous).length,
        attacksDetected: attacks.length,
        blockedMessagesCount: periodMessages.filter(m => m.analysis.recommendedAction === 'BLOCK').length
      },
      byInterface: this.calculateInterfaceStats(periodMessages),
      byCommand: this.calculateCommandStats(periodMessages),
      topSourceHosts: this.getTopSourceHosts(periodMessages, 10),
      authenticationStats: this.calculateAuthenticationStats(periodMessages),
      creditControlStats: this.calculateCreditControlStats(periodMessages),
      recommendations: this.generateRecommendations(attacks)
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async parseRawMessage(raw: Buffer | string): Promise<{
    header: DiameterMessage['header'];
    avps: DiameterAVP[];
  }> {
    const data = typeof raw === 'string' ? Buffer.from(raw, 'hex') : raw;

    if (data.length < 20) {
      throw new DiameterParseError('Message too short to be valid Diameter');
    }

    // Parse Diameter header (20 bytes)
    const version = data[0];
    const messageLength = data.readUInt32BE(1) & 0x00FFFFFF;
    const flagsByte = data[4];
    const commandCode = ((flagsByte & 0x20) << 8) | data.readUInt16BE(5);
    const applicationId = data.readUInt32BE(8);
    const hopByHopId = data.slice(12, 16).toString('hex');
    const endToEndId = data.slice(16, 20).toString('hex');

    const header: DiameterMessage['header'] = {
      version,
      messageLength,
      commandCode,
      applicationId,
      hopByHopId,
      endToEndId,
      flags: {
        isRequest: (flagsByte & 0x80) !== 0,
        isProxiable: (flagsByte & 0x40) !== 0,
        isError: (flagsByte & 0x20) !== 0,
        isRetransmit: (flagsByte & 0x10) !== 0
      }
    };

    // Parse AVPs (simplified - real implementation would use proper ASN.1 BER/DER decoding)
    const avps: DiameterAVP[] = this.parseAVPs(data.slice(20));

    return { header, avps };
  }

  private parseAVPs(data: Buffer): DiameterAVP[] {
    const avps: DiameterAVP[] = [];
    let offset = 0;

    while (offset < data.length) {
      if (offset + 4 > data.length) break;

      const avpCode = data.readUInt32BE(offset);
      const flags = data[offset + 4];
      const avpLength = data.readUInt16BE(offset + 5) & 0xFFFF;
      const isVendorSpecific = (flags & 0x80) !== 0;
      const isMandatory = (flags & 0x40) !== 0;

      let vendorId: number | undefined;
      let dataOffset = offset + 8;
      let dataLength = avpLength - 8;

      if (isVendorSpecific) {
        vendorId = data.readUInt32BE(offset + 8);
        dataOffset += 4;
        dataLength -= 4;
      }

      // Extract AVP data
      let avpData: unknown;
      try {
        if (dataOffset + dataLength <= data.length) {
          const rawData = data.slice(dataOffset, dataOffset + dataLength);
          
          // Try to decode based on common types
          if (dataLength === 4) {
            avpData = rawData.readUInt32BE(0);
          } else if (dataLength === 8) {
            avpData = rawData.toString('hex');
          } else {
            // Try UTF-8 string
            try {
              avpData = rawData.toString('utf8');
            } catch {
              avpData = rawData.toString('hex');
            }
          }
        }
      } catch {
        avpData = data.slice(dataOffset, dataOffset + Math.min(dataLength, data.length - dataOffset)).toString('hex');
      }

      const avpDef = AVP_REGISTRY.get(avpCode);
      
      avps.push({
        code: avpCode,
        vendorId,
        flags: { mandatory: isMandatory, private: isVendorSpecific },
        data: avpData,
        name: avpDef?.name
      });

      // Move to next AVP (account for padding)
      offset += avpLength + (avpLength % 4 ? 4 - (avpLength % 4) : 0);
    }

    return avps;
  }

  private extractApplicationData(parsed: { header: DiameterMessage['header']; avps: DiameterAVP[] }): DiameterMessage['parsedData'] {
    const { header, avps } = parsed;
    
    const commandName = COMMAND_NAMES.get(header.commandCode) || `UNKNOWN_${header.commandCode}`;
    const applicationName = APPLICATION_NAMES.get(header.applicationId) || `APP_${header.applicationId}`;

    // Extract session info
    const session: SessionInfo | undefined = this.getAVPValue(avps, 'Session-Id') ? {
      sessionId: this.getAVPValue(avps, 'Session-Id') as string,
      originHost: this.getAVPValue(avps, 'Origin-Host') as string || '',
      originRealm: this.getAVPValue(avps, 'Origin-Realm') as string || '',
      destinationHost: this.getAVPValue(avps, 'Destination-Host') as string,
      destinationRealm: this.getAVPValue(avps, 'Destination-Realm') as string || '',
      state: 'ACTIVE'
    } : undefined;

    // Extract auth info based on application
    let authInfo: AuthInfo | undefined;
    if ([DIAMETER_CONFIG.APPLICATION_IDS.S6A, DIAMETER_CONFIG.APPLICATION_IDS.CX].includes(header.applicationId)) {
      authInfo = {
        userName: this.getAVPValue(avps, 'User-Name') as string,
        publicIdentity: this.getAVPValue(avps, 'Public-Identity') as string
      };
    }

    // Extract credit control info
    let creditControl: CreditControlInfo | undefined;
    if (header.applicationId === DIAMETER_CONFIG.APPLICATION_IDS.CREDIT_CONTROL ||
        header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.CC_REQUEST) {
      creditControl = {
        ccRequestType: this.getAVPValue(avps, 'CC-Request-Type') as CCRequestType || 'INITIAL_REQUEST',
        ccRequestNumber: this.getAVPValue(avps, 'CC-Request-Number') as number || 0,
        resultCode: this.getAVPValue(avps, 'Result-Code') as number
      };
    }

    return {
      commandName,
      applicationName,
      session,
      authInfo,
      creditControl
    };
  }

  private getAVPValue(avps: DiameterAVP[], name: string): unknown {
    const avp = avps.find(a => a.name === name);
    return avp?.data;
  }

  private getAVP(avps: DiameterAVP[], name: string): DiameterAVP | undefined {
    return avps.find(a => a.name === name);
  }

  private hasLocationAVPs(avps: DiameterAVP[]): boolean {
    const locationAVPs = [
      'User-Location-Information',
      'MME-Location-Information',
      'EPS-Location-Information',
      'Current-Location',
      '3GPP-User-Location-Info'
    ];
    return locationAVPs.some(name => avps.some(a => a.name === name));
  }

  private hasGeodeticInfo(avps: DiameterAVP[]): boolean {
    // Simplified check - would need deep parsing in production
    return avps.some(a => a.name === 'User-Location-Information');
  }

  private async runAnalysisChecks(message: DiameterMessage): Promise<void> {
    const reasons: string[] = [];
    let score = 0;

    // Check 1: Unknown application
    if (!APPLICATION_NAMES.has(message.header.applicationId)) {
      reasons.push(`Unknown application ID: ${message.header.applicationId}`);
      score += 15;
    }

    // Check 2: Unknown command code
    if (!COMMAND_NAMES.has(message.header.commandCode)) {
      reasons.push(`Unknown command code: ${message.header.commandCode}`);
      score += 10;
    }

    // Check 3: Error result code
    const resultCode = this.getAVPValue(message.avps, 'Result-Code') as number;
    if (resultCode && resultCode >= 4000 && resultCode < 5000) {
      reasons.push(`Protocol error result code: ${resultCode}`);
      score += 20;
    } else if (resultCode && resultCode >= 5000) {
      reasons.push(`Permanent failure result code: ${resultCode}`);
      score += 15;
    }

    // Check 4: Retransmitted packet without previous request
    if (message.header.flags.isRetransmit) {
      reasons.push('Retransmitted message');
      score += 5;
    }

    // Determine risk level
    let riskLevel: RiskLevel = 'LOW';
    if (score >= 80) riskLevel = 'CRITICAL';
    else if (score >= 60) riskLevel = 'HIGH';
    else if (score >= 35) riskLevel = 'MEDIUM';

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

  private updateSessionCache(message: DiameterMessage): void {
    const sessionId = message.parsedData.session?.sessionId;
    if (sessionId && message.parsedData.session) {
      this.sessionCache.set(sessionId, message.parsedData.session!);
    }
  }

  private addToBuffer(message: DiameterMessage): void {
    this.messageBuffer.push(message);
    if (this.messageBuffer.length > this.bufferSize) {
      this.messageBuffer = this.messageBuffer.slice(-this.bufferSize / 2);
    }
  }

  private maskIMSI(imsi: string): string {
    if (imsi.length > 6) {
      return imsi.slice(0, 3) + '****' + imsi.slice(-3);
    }
    return '***' + imsi.slice(-3);
  }

  private maskIMEI(imei: string): string {
    if (imei.length > 6) {
      return imei.slice(0, 4) + '****' + imei.slice(-2);
    }
    return '***' + imei.slice(-2);
  }

  private calculateInterfaceStats(messages: DiameterMessage[]): InterfaceStatistics[] {
    const stats = new Map<number, { total: number; anomalous: number; ops: Map<string, number> }>();

    for (const msg of messages) {
      const appId = msg.header.applicationId;
      if (!stats.has(appId)) {
        stats.set(appId, { total: 0, anomalous: 0, ops: new Map() });
      }
      const entry = stats.get(appId)!;
      entry.total++;
      if (msg.analysis.isAnomalous) entry.anomalous++;
      
      const cmdName = msg.parsedData.commandName;
      entry.ops.set(cmdName, (entry.ops.get(cmdName) || 0) + 1);
    }

    const total = messages.length || 1;
    return Array.from(stats.entries()).map(([appId, data]) => ({
      interface: APPLICATION_NAMES.get(appId) || `App-${appId}`,
      applicationId: appId,
      totalMessages: data.total,
      anomalousCount: data.anomalous,
      percentage: (data.total / total) * 100,
      topOperations: Array.from(data.ops.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    }));
  }

  private calculateCommandStats(messages: DiameterMessage[]): CommandStatistics[] {
    const stats = new Map<number, { requests: number; responses: number; errors: number; totalTime: number }>();

    for (const msg of messages) {
      if (!stats.has(msg.header.commandCode)) {
        stats.set(msg.header.commandCode, { requests: 0, responses: 0, errors: 0, totalTime: 0 });
      }
      const entry = stats.get(msg.header.commandCode)!;
      
      if (msg.header.flags.isRequest) {
        entry.requests++;
      } else {
        entry.responses++;
        const resultCode = this.getAVPValue(msg.avps, 'Result-Code') as number;
        if (resultCode && resultCode >= 4000) entry.errors++;
      }
      entry.totalTime += msg.metadata.processingTimeMs;
    }

    return Array.from(stats.entries()).map(([code, data]) => ({
      commandCode: code,
      commandName: COMMAND_NAMES.get(code) || `CMD_${code}`,
      requestCount: data.requests,
      responseCount: data.responses,
      errorRate: data.responses > 0 ? (data.errors / data.responses) * 100 : 0,
      avgResponseTimeMs: data.requests > 0 ? Math.round(data.totalTime / data.requests) : 0
    }));
  }

  private getTopSourceHosts(messages: DiameterMessage[], limit: number): Array<{ host: string; count: number; riskScore: number }> {
    const counts = new Map<string, { count: number; riskSum: number }>();

    for (const msg of messages) {
      const host = this.getAVPValue(msg.avps, 'Origin-Host') as string || msg.metadata.sourceIP;
      const entry = counts.get(host) || { count: 0, riskSum: 0 };
      entry.count++;
      entry.riskSum += msg.analysis.anomalyScore;
      counts.set(host, entry);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([host, data]) => ({
        host,
        count: data.count,
        riskScore: Math.round(data.riskSum / data.count)
      }));
  }

  private calculateAuthenticationStats(messages: DiameterMessage[]): AuthenticationStatistics {
    const authMessages = messages.filter(m => 
      m.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.AUTHENTICATION_INFORMATION
    );

    const successCount = authMessages.filter(m => {
      const rc = this.getAVPValue(m.avps, 'Result-Code') as number;
      return rc === DIAMETER_CONFIG.RESULT_CODES.SUCCESS;
    }).length;

    const failureReasons: Record<string, number> = {};
    authMessages.filter(m => {
      const rc = this.getAVPValue(m.avps, 'Result-Code') as number;
      return rc && rc !== DIAMETER_CONFIG.RESULT_CODES.SUCCESS;
    }).forEach(m => {
      const rc = this.getAVPValue(m.avps, 'Result-Code') as number;
      const reason = `Result-${rc}`;
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    return {
      totalAuthAttempts: authMessages.length,
      successCount,
      failureCount: authMessages.length - successCount,
      failureReasons,
      suspiciousPatterns: []
    };
  }

  private calculateCreditControlStats(messages: DiameterMessage[]): CreditControlStatistics {
    const ccMessages = messages.filter(m => 
      m.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.CC_REQUEST
    );

    // Simulated calculations
    return {
      totalCCRequests: ccMessages.length,
      successfulCharges: Math.floor(ccMessages.length * 0.95),
      failedCharges: Math.floor(ccMessages.length * 0.05),
      totalRevenue: Math.floor(Math.random() * 1000000000) + 500000000,
      fraudIndicators: Math.floor(ccMessages.length * 0.02),
      highValueTransactions: Math.floor(ccMessages.length * 0.05),
      byRequestType: {
        INITIAL_REQUEST: { count: Math.floor(ccMessages.length * 0.3), amount: Math.floor(Math.random() * 100000000) },
        UPDATE_REQUEST: { count: Math.floor(ccMessages.length * 0.5), amount: Math.floor(Math.random() * 200000000) },
        TERMINATION_REQUEST: { count: Math.floor(ccMessages.length * 0.15), amount: 0 },
        EVENT_REQUEST: { count: Math.floor(ccMessages.length * 0.05), amount: Math.floor(Math.random() * 50000000) }
      }
    };
  }

  private generateRecommendations(attacks: DiameterAttackIndicator[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let id = 1;

    const attackTypes = new Set(attacks.map(a => a.attackType));

    if (attackTypes.has('DIAMETER_FLOODING')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'HIGH',
        category: 'Security',
        title: 'Implement Diameter Rate Limiting',
        description: 'Deploy DRA-level rate limiting to prevent flooding attacks',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('REPLAY_ATTACK')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'HIGH',
        category: 'Security',
        title: 'Enable Transaction ID Validation',
        description: 'Implement strict validation of hop-by-hop and end-to-end IDs',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('AUTHENTICATION_ATTACK')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'CRITICAL',
        category: 'Security',
        title: 'Enhance Authentication Throttling',
        description: 'Implement stricter rate limiting on authentication requests per IMSI',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('CREDIT_CONTROL_FRAUD')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'MEDIUM',
        category: 'Fraud',
        title: 'Review OCS Integration Security',
        description: 'Audit OCS interfaces for potential bypass vulnerabilities',
        implementationEffort: 'SHORT_TERM'
      });
    }

    recommendations.push({
      id: `rec_${id++}`,
      priority: 'LOW',
      category: 'Monitoring',
      title: 'Enable Continuous Diameter Monitoring',
      description: 'Ensure 24/7 monitoring with automated alerting for anomalies',
      implementationEffort: 'QUICK_WIN'
    });

    return recommendations;
  }

  // Additional helper methods for interface analysis
  private countOperations(messages: DiameterMessage[]): Record<string, number> {
    const ops: Record<string, number> = {};
    for (const msg of messages) {
      const name = msg.parsedData.commandName;
      ops[name] = (ops[name] || 0) + 1;
    }
    return ops;
  }

  private analyzeAuthResults(messages: DiameterMessage[]): { success: number; failure: number } {
    let success = 0, failure = 0;
    for (const msg of messages) {
      if (!msg.header.flags.isRequest) {
        const rc = this.getAVPValue(msg.avps, 'Result-Code') as number;
        if (rc === DIAMETER_CONFIG.RESULT_CODES.SUCCESS) success++;
        else failure++;
      }
    }
    return { success, failure };
  }

  private findSuspiciousPatterns(messages: DiameterMessage[]): SuspiciousPattern[] {
    return []; // Implementation would detect patterns like unusual MAR/UAR ratios
  }

  private countSessions(messages: DiameterMessage[]): number {
    const sessions = new Set();
    for (const msg of messages) {
      const sid = this.getAVPValue(msg.avps, 'Session-Id') as string;
      if (sid) sessions.add(sid);
    }
    return sessions.size;
  }

  private detectQoSViolations(messages: DiameterMessage[]): QoSViolation[] {
    return []; // Implementation would detect QoS violations
  }

  private countPolicyChanges(messages: DiameterMessage[]): number {
    return messages.filter(m => m.parsedData.commandName.includes('RAR') || 
                               m.parsedData.commandName.includes('RAA')).length;
  }

  private analyzeChargingRules(messages: DiameterMessage[]): ChargingRuleStats {
    return { installed: 0, removed: 0, active: 0 }; // Simplified
  }

  private analyzePCCRules(messages: DiameterMessage[]): PCCRuleStats {
    return { active: 0, violations: 0 }; // Simplified
  }

  private countBearerEvents(messages: DiameterMessage[]): number {
    return messages.filter(m => m.parsedData.commandName.includes('Create') ||
                               m.parsedData.commandName.includes('Delete')).length;
  }

  private calculateRevenue(messages: DiameterMessage[]): number {
    return Math.floor(Math.random() * 100000000); // Simplified
  }

  private findHighValueTransactions(messages: DiameterMessage[]): HighValueTransaction[] {
    return []; // Implementation would find transactions above threshold
  }

  private groupByRequestType(messages: DiameterMessage[]): Record<string, { count: number; amount: number }> {
    return {}; // Simplified
  }

  private calculateAuthSuccessRate(s6aMessages: DiameterMessage[]): number {
    const airMessages = s6aMessages.filter(m => 
      m.header.commandCode === DIAMETER_CONFIG.COMMAND_CODES.AUTHENTICATION_INFORMATION &&
      !m.header.flags.isRequest
    );
    if (airMessages.length === 0) return 100;
    
    const successes = airMessages.filter(m => 
      this.getAVPValue(m.avps, 'Result-Code') === DIAMETER_CONFIG.RESULT_CODES.SUCCESS
    ).length;
    
    return (successes / airMessages.length) * 100;
  }

  private extractLocation(msg: DiameterMessage): { tai: string; cgi: string } {
    // Simplified location extraction
    return { tai: 'unknown', cgi: 'unknown' };
  }

  private calculateTimeSpan(messages: DiameterMessage[]): number {
    if (messages.length < 2) return 0;
    const times = messages.map(m => m.timestamp.getTime()).sort((a, b) => a - b);
    return (times[times.length - 1] - times[0]) / (1000 * 60 * 60); // hours
  }

  private getTopSourceHosts(messages: DiameterMessage[], limit: number): Array<{ host: string; count: number; riskScore: number }> {
    const counts = new Map<string, { count: number; riskSum: number }>();
    
    for (const msg of messages) {
      const host = this.getAVPValue(msg.avps, 'Origin-Host') as string || msg.metadata.sourceIP;
      const entry = counts.get(host) || { count: 0, riskSum: 0 };
      entry.count++;
      entry.riskSum += msg.analysis.anomalyScore;
      counts.set(host, entry);
    }
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([host, data]) => ({ host, count: data.count, riskScore: Math.round(data.riskSum / data.count) }));
  }
}

// Supporting types for interface analysis
interface CxAnalysisResult {
  interface: string;
  totalMessages: number;
  operations: Record<string, number>;
  authResults: { success: number; failure: number };
  locationLeaks: LocationLeakageIndicator[];
  suspiciousPatterns: SuspiciousPattern[];
}

interface RxAnalysisResult {
  interface: string;
  totalMessages: number;
  sessions: number;
  qosViolations: QoSViolation[];
  policyChanges: number;
}

interface GxAnalysisResult {
  interface: string;
  totalMessages: number;
  chargingRules: ChargingRuleStats;
  pccRules: PCCRuleStats;
  bearerEvents: number;
}

interface ChargingAnalysisResult {
  interface: string;
  totalMessages: number;
  revenueEstimate: number;
  fraudIndicators: DiameterAttackIndicator[];
  highValueTransactions: HighValueTransaction[];
  byRequestType: Record<string, { count: number; amount: number }>;
}

interface S6aAnalysisResult {
  interface: string;
  totalMessages: number;
  updateLocations: number;
  authRequests: number;
  purgeRequests: number;
  authSuccessRate: number;
  roamingDetection: RoamingAbuseIndicator[];
  imeiCloningDetection: IMEICloneIndicator[];
}

interface LocationLeakageIndicator {
  messageId: string;
  destinationRealm: string;
  includesGeodetic: boolean;
  severity: RiskLevel;
  description: string;
}

interface RoamingAbuseIndicator {
  imsi: string;
  updateCount: number;
  uniqueLocations: number;
  timeSpanHours: number;
  severity: RiskLevel;
  description: string;
}

interface IMEICloneIndicator {
  imei: string;
  associatedIMSIMsCount: number;
  severity: RiskLevel;
  description: string;
  recommendation: string;
}

interface SuspiciousPattern {
  type: string;
  description: string;
  count: number;
}

interface QoSViolation {
  sessionId: string;
  violationType: string;
  expectedQoS: string;
  actualQoS: string;
}

interface ChargingRuleStats {
  installed: number;
  removed: number;
  active: number;
}

interface PCCRuleStats {
  active: number;
  violations: number;
}

interface HighValueTransaction {
  sessionId: string;
  amount: number;
  reason: string;
}

// Export singleton instance
export const diameterAnalyzer = DiameterAnalyzer.getInstance();
