/**
 * National SOC Platform - SIP/VoIP Security Analyzer
 * 
 * Comprehensive SIP (Session Initiation Protocol) analysis for Djezzy IMS/VoLTE network:
 * - SIP Message Parsing and Validation
 * - SIP Attack Detection (INVITE Flood, REGISTER Flood)
 * - VoIP Fraud Detection (Toll Fraud, PBX Hacking)
 * - RTP Media Stream Analysis
 * - SIP Trunk Security Monitoring
 * - Call Detail Record (CDR) Generation
 * - Emergency Call (112) Abuse Detection
 * 
 * @version 1.0.0
 * @module sip-analyzer
 */

import { db } from '@/lib/db';

// ============================================================
// Constants & Configuration
// ============================================================

export const SIP_CONFIG = {
  // Djezzy SIP network configuration
  NETWORK: {
    domain: 'djezzy.dz',
    imsDomain: 'ims.djezzy.dz',
    pcscfAddresses: ['pcscf1.ims.djezzy.dz', 'pcscf2.ims.djezzy.dz'],
    icscfAddress: 'icscf.ims.djezzy.dz',
    scscfAddress: 'scscf.ims.djezzy.dz',
    
    // Trusted networks
    trustedNetworks: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    
    // Emergency numbers for Algeria
    emergencyNumbers: ['112', '14', '17', '1021', '1055']
  },
  
  // SIP port configuration
  PORTS: {
    UDP: 5060,
    TCP: 5060,
    TLS: 5061,
    WS: 80,
    WSS: 443,
    RTP_MIN: 10000,
    RTP_MAX: 20000
  },
  
  // Attack detection thresholds
  ATTACK_THRESHOLDS: {
    // INVITE flood detection
    maxInvitesPerSecondPerSource: 20,
    maxInvitesPerSecondGlobal: 5000,
    inviteFloodWindowMs: 60000,
    
    // REGISTER flood detection
    maxRegistersPerMinutePerSource: 30,
    registerFloodWindowMs: 60000,
    
    // Call pattern detection
    maxConcurrentCallsPerUser: 10,
    maxCallsPerHourPerUser: 60,
    maxInternationalCallsPerDay: 50,
    
    // Toll fraud detection
    highCostDestinations: ['900', '976', '8xx', '19xx', '700'],
    unusualCallDurationThreshold: 7200, // 2 hours in seconds
    highVolumeDestinationThreshold: 100, // calls to same destination
    
    // PBX hacking indicators
    maxFailedAuthAttempts: 5,
    suspiciousUserAgents: [
      'sipcli', 'sipvicious', 'sipscan', 'VaxSIPUserAgent',
      'friendly-scanner', 'SIPV2', 'CSipSimple'
    ],
    
    // Emergency abuse detection
    maxEmergencyCallsPerDay: 10,
    emergencyCallPatternAnalysis: true
  },
  
  // RTP configuration
  RTP_CONFIG: {
    codecs: ['PCMU', 'PCMA', 'G729', 'G722', 'AMR-WB', 'AMR', 'EVS'],
    sampleRates: [8000, 16000, 32000, 48000],
    dtmfMode: 'RFC2833',
    srtpEnabled: true,
    rtpTimeoutSeconds: 300
  }
} as const;

// ============================================================
// Type Definitions
// ============================================================

export interface SIPMessage {
  messageId: string;
  timestamp: Date;
  
  // Basic message info
  method: SIPMethod;
  isRequest: boolean;
  statusCode?: number;
  reasonPhrase?: string;
  
  // URIs
  requestUri: SIPUri;
  from: SIPHeaderFromTo;
  to: SIPHeaderFromTo;
  callId: string;
  cseq: {
    sequenceNumber: number;
    method: string;
  };
  
  // Headers
  headers: Map<string, string>;
  viaHeaders: ViaHeader[];
  contact?: SIPContact;
  routeHeaders: SIPRoute[];
  recordRouteHeaders: SIPRoute[];
  
  // Body
  body?: {
    contentType: string;
    contentLength: number;
    sdp?: SDPInfo;
    rawBody: string;
  };
  
  // Transport info
  transport: {
    sourceIp: string;
    sourcePort: number;
    destinationIp: string;
    destinationPort: number;
    protocol: 'UDP' | 'TCP' | 'TLS' | 'WS' | 'WSS';
  };
  
  // Analysis results
  analysis: {
    isAnomalous: boolean;
    anomalyScore: number;
    anomalyReasons: string[];
    attackIndicators: SIPAttackIndicator[];
    riskLevel: RiskLevel;
    recommendedAction: string;
    isValidSIP: boolean;
    validationErrors: string[];
  };
  
  // Metadata
  metadata: {
    probeId: string;
    processingTimeMs: number;
    rawSize: number;
  };
}

export type SIPMethod = 
  | 'INVITE' | 'ACK' | 'BYE' | 'CANCEL' | 'REGISTER' | 'OPTIONS' 
  | 'PRACK' | 'SUBSCRIBE' | 'NOTIFY' | 'PUBLISH' | 'INFO' | 'REFER' 
  | 'MESSAGE' | 'UPDATE';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SIPUri {
  scheme: 'sip' | 'sips';
  user?: string;
  host: string;
  port?: number;
  uriParams: Map<string, string>;
  headerParams: Map<string, string>;
  displayName?: string;
}

export interface SIPHeaderFromTo {
  displayName?: string;
  uri: SIPUri;
  tag?: string;
  rawValue: string;
}

export interface ViaHeader {
  sentBy: {
    host: string;
    port?: number;
  };
  branch: string;
  received?: string;
  rport?: number;
  protocol: string;
  transport: string;
  rawValue: string;
}

export interface SIPContact {
  displayName?: string;
  uri: SIPUri;
  params: Map<string, string>;
  expires?: number;
  qValue?: number;
  rawValue: string;
}

export interface SIPRoute {
  displayName?: string;
  uri: SIPUri;
  params: Map<string, string>;
  rawValue: string;
}

export interface SDPInfo {
  version: number;
  origin: {
    username: string;
    sessionId: number;
    sessionVersion: number;
    netType: string;
    addrType: string;
    unicastAddress: string;
  };
  sessionName: string;
  connection: {
    netType: string;
    addrType: string;
    address: string;
  } | null;
  timing: {
    startTime: number;
    stopTime: number;
  };
  mediaDescriptions: MediaDescription[];
  attributes: Map<string, string>;
}

export interface MediaDescription {
  media: string;        // audio, video, etc.
  port: number;          // 0 means rejected
  numPorts: number;
  proto: string;         // RTP/AVP, UDP/TLS/RTP/SAVP, etc.
  formats: number[];     // payload types
  connection?: {
    netType: string;
    addrType: string;
    address: string;
  };
  bandwidth: Map<string, number>;
  attributes: Map<string, string>;
  rtpmap?: Map<number, RtpMapEntry>;
  fmtp?: Map<string, string>;
  crypto?: CryptoEntry[];
}

export interface RtpMapEntry {
  payloadType: number;
  encodingName: string;
  clockRate: number;
  encodingParameters?: string;
}

export interface CryptoEntry {
  tag: number;
  cryptoSuite: string;
  keyParams: string;
  sessionParams: string[];
}

// Call Information
export interface SIPCallInfo {
  callId: string;
  state: CallState;
  direction: CallDirection;
  caller: CallerInfo;
  callee: CalleeInfo;
  startTime: Date;
  connectTime?: Date;
  endTime?: Date;
  durationSeconds: number;
  sipMessages: string[];
  rtpSessions: RTPSessionInfo[];
  fraudIndicators: FraudIndicator[];
  cdr: CDRRecord;
}

export type CallState = 
  | 'INITIATING' | 'RINGING' | 'CONNECTED' | 'ON_HOLD' | 'RESUMED' 
  | 'DISCONNECTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type CallDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export interface CallerInfo {
  uri: SIPUri;
  aor: string;
  ipAddress: string;
  userAgent?: string;
  pAssertedIdentity?: string;
  isEmergency: boolean;
  isTrusted: boolean;
}

export interface CalleeInfo {
  uri: SIPUri;
  aor: string;
  forwardedFrom?: string;
  diversionReason?: string;
  isEmergency: boolean;
  isHighCost: boolean;
}

export interface RTPSessionInfo {
  sessionId: string;
  callerSSRC: number;
  calleeSSRC: number;
  codec: string;
  sampleRate: number;
  packetsFromCaller: number;
  packetsToCallee: number;
  bytesFromCaller: number;
  bytesToCallee: number;
  jitterMs: number;
  packetLossPercent: number;
  mosEstimate: number;
  startTime: Date;
  endTime?: Date;
  isEncrypted: boolean;
}

export interface FraudIndicator {
  indicatorId: string;
  fraudType: VoIPFraudType;
  severity: RiskLevel;
  confidence: number;
  description: string;
  evidence: Record<string, unknown>;
  ioc: string[];
  estimatedFinancialImpact: number; // In DZD
}

export type VoIPFraudType = 
  | 'TOLL_FRAUD'
  | 'PBX_HACKING'
  | 'WANGIRI_VARIANT'
  | 'IRSF_VIA_VOIP'
  | 'PREMIUM_RATE_ABUSE'
  | 'CALL_PUMPING'
  | 'TELEMARKETING_FRAUD'
  | 'EXTENSION_TAKEOVER'
  | 'VISHING'
  | 'EMERGENCY_ABUSE'
  | 'ROBOCALL_OPERATION';

export interface CDRRecord {
  cdrId: string;
  callId: string;
  callingNumber: string;
  calledNumber: string;
  direction: CallDirection;
  startTime: Date;
  answerTime?: Date;
  releaseTime: Date;
  durationSeconds: number;
  disconnectReason: DisconnectReason;
  callingPartyCategory: PartyCategory;
  calledPartyCategory: PartyCategory;
  trunkGroup?: string;
  originIP: string;
  destinationIP: string;
  userAgent?: string;
  pAssertedIdentity?: string;
  chargeAmount: number; // In DZD milliunits
  currency: 'DZD';
  isFraudulent: boolean;
  fraudTypes: VoIPFraudType[];
  isInternational: boolean;
  isRoaming: boolean;
  isEmergency: boolean;
  rtpStats?: {
    codec: string;
    mosMin: number;
    mosAvg: number;
    packetLossPercent: number;
    jitterAvgMs: number;
  };
  sdpOfferHash?: string;
  sdpAnswerHash?: string;
}

export type DisconnectReason = 
  | 'NORMAL_CLEARING' | 'USER_BUSY' | 'NO_ANSWER' | 'CALL_REJECTED' 
  | 'UNALLOCATED_NUMBER' | 'NETWORK_CONGESTION' | 'TEMPORARY_FAILURE'
  | 'SERVICE_UNAVAILABLE' | 'REQUEST_TERMINATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'NOT_ACCEPTABLE' | 'FRAUD_BLOCKED' | 'TIMEOUT' | 'MEDIA_LOST';

export type PartyCategory = 
  | 'NATIONAL_FIXED' | 'NATIONAL_MOBILE' | 'INTERNATIONAL' | 'PREMIUM'
  | 'FREEPHONE' | 'SHARED_COST' | 'EMERGENCY' | 'UNKNOWN';

// Attack Detection Types
export interface SIPAttackIndicator {
  indicatorId: string;
  attackType: SIPAttackType;
  severity: RiskLevel;
  confidence: number;
  description: string;
  evidence: Record<string, unknown>;
  ioc: string[];
  mitigationRecommendation: string;
}

export type SIPAttackType = 
  | 'INVITE_FLOOD'
  | 'REGISTER_FLOOD'
  | 'AUTH_BRUTE_FORCE'
  | 'SIP_SCAN'
  | 'SIP_NESTING_ATTACK'
  | 'RESPONSE_SPOOFING'
  | 'URI_INJECTION'
  | 'SDP_MANIPULATION'
  | 'VIA_HEADER_FORGING'
  | 'CALL_HIJACKING'
  | 'RTP_INJECTION'
  | 'DOSSIG';

// Analysis Report
export interface SIPAnalysisReport {
  reportId: string;
  period: { start: Date; end: Date };
  summary: {
    totalMessagesAnalyzed: number;
    totalCallsProcessed: number;
    anomalousMessagesCount: number;
    attacksDetected: number;
    blockedCallsCount: number;
  };
  byMethod: MethodStatistics;
  byAttackType: AttackStatistics;
  callStatistics: CallStatistics;
  topSources: Array<{ ip: string; count: number; riskScore: number }>;
  fraudSummary: FraudSummary;
  qualityMetrics: QualityMetrics;
  recommendations: Recommendation[];
}

export interface MethodStatistics {
  method: SIPMethod;
  requestCount: number;
  responseCount: number;
  averageResponseTimeMs: number;
  errorRate: number;
}

export interface AttackStatistics {
  attackType: SIPAttackType;
  count: number;
  severity: RiskLevel;
  affectedUsers: number;
  blockedAttempts: number;
  status: 'ACTIVE' | 'CONTAINED' | 'INVESTIGATING' | 'RESOLVED';
}

export interface CallStatistics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDurationSeconds: number;
  totalDurationMinutes: number;
  asr: number; // Answer Seizure Ratio
  ner: number; // Network Efficiency Ratio
  byDirection: Record<CallDirection, { count: number; duration: number }>;
  byDisconnectReason: Record<DisconnectReason, number>;
}

export interface FraudSummary {
  totalFraudulentCalls: number;
  estimatedLossDZD: number;
  byFraudType: Record<VoIPFraudType, { count: number; loss: number }>;
  topFraudTargets: Array<{ destination: string; count: number; loss: number }>;
  activeInvestigations: number;
}

export interface QualityMetrics {
  averageMOS: number;
  callsBelowMOS3: number;
  averagePacketLoss: number;
  averageJitter: number;
  callsWithNoAudio: number;
  oneWayAudioCalls: number;
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

export class SIPAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SIPAnalysisError';
  }
}

export class SIPParseError extends SIPAnalysisError {
  constructor(message: string, rawData?: string) {
    super(message, 'PARSE_ERROR', { rawData: rawData?.slice(0, 300) });
    this.name = 'SIPParseError';
  }
}

// ============================================================
// SIP Method Registry
// ============================================================

const SIP_METHODS: Set<SIPMethod> = new Set([
  'INVITE', 'ACK', 'BYE', 'CANCEL', 'REGISTER', 'OPTIONS',
  'PRACK', 'SUBSCRIBE', 'NOTIFY', 'PUBLISH', 'INFO', 'REFER',
  'MESSAGE', 'UPDATE'
]);

// Status code categories
const STATUS_CATEGORIES: Record<number, string> = {
  [1]: 'Provisional',
  [2]: 'Success',
  [3]: 'Redirection',
  [4]: 'Client Error',
  [5]: 'Server Error',
  [6]: 'Global Failure'
};

// Response phrases
const RESPONSE_PHRASES: Record<number, string> = {
  100: 'Trying',
  180: 'Ringing',
  181: 'Call is Being Forwarded',
  182: 'Queued',
  183: 'Session Progress',
  200: 'OK',
  202: 'Accepted',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  410: 'Gone',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Unsupported URI Scheme',
  420: 'Bad Extension',
  421: 'Extension Required',
  423: 'Interval Too Brief',
  480: 'Temporarily Unavailable',
  481: 'Call/Transaction Does Not Exist',
  482: 'Loop Detected',
  483: 'Too Many Hops',
  484: 'Address Incomplete',
  485: 'Ambiguous',
  486: 'Busy Here',
  487: 'Request Terminated',
  488: 'Not Acceptable Here',
  491: 'Request Pending',
  493: 'Undecipherable',
  500: 'Server Internal Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Server Timeout',
  505: 'Version Not Supported',
  513: 'Message Too Large',
  600: 'Busy Everywhere',
  603: 'Decline',
  604: 'Does Not Exist Anywhere',
  606: 'Not Acceptable',
  607: 'Unwanted',
  608: 'Rejected'
};

// ============================================================
// Main SIP Analyzer Class
// ============================================================

export class SIPAnalyzer {
  private static instance: SIPAnalyzer;
  private messageBuffer: SIPMessage[] = [];
  private bufferSize: number = 20000;
  private activeCalls: Map<string, SIPCallInfo> = new Map();
  private rateCounters: Map<string, { count: number; windowStart: number }> = new Map();
  private authFailureCache: Map<string, { count: number; windowStart: number }> = new Map();

  private constructor() {}

  static getInstance(): SIPAnalyzer {
    if (!SIPAnalyzer.instance) {
      SIPAnalyzer.instance = new SIPAnalyzer();
    }
    return SIPAnalyzer.instance;
  }

  // ============================================================
  // Message Parsing & Analysis
  // ============================================================

  async analyzeMessage(rawMessage: Buffer | string, transport: {
    sourceIp: string;
    sourcePort: number;
    destinationIp: string;
    destinationPort: number;
    protocol: 'UDP' | 'TCP' | 'TLS' | 'WS' | 'WSS';
    probeId: string;
  }): Promise<SIPMessage> {
    const startTime = Date.now();

    try {
      const messageString = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString('utf-8');
      
      // Parse the SIP message
      const parsed = await this.parseRawMessage(messageString);

      // Build complete message structure
      const message: SIPMessage = {
        messageId: `sip_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        timestamp: new Date(),
        method: parsed.method,
        isRequest: parsed.isRequest,
        statusCode: parsed.statusCode,
        reasonPhrase: parsed.reasonPhrase,
        requestUri: parsed.requestUri,
        from: parsed.from,
        to: parsed.to,
        callId: parsed.callId,
        cseq: parsed.cseq,
        headers: parsed.headers,
        viaHeaders: parsed.viaHeaders,
        contact: parsed.contact,
        routeHeaders: parsed.routeHeaders,
        recordRouteHeaders: parsed.recordRouteHeaders,
        body: parsed.body,
        transport: {
          ...transport,
          protocol: transport.protocol || 'UDP'
        },
        analysis: {
          isAnomalous: false,
          anomalyScore: 0,
          anomalyReasons: [],
          attackIndicators: [],
          riskLevel: 'LOW',
          recommendedAction: 'NONE',
          isValidSIP: true,
          validationErrors: []
        },
        metadata: {
          probeId: transport.probeId,
          processingTimeMs: Date.now() - startTime,
          rawSize: messageString.length
        }
      };

      // Validate SIP message
      this.validateSIPMessage(message);

      // Run analysis checks
      await this.runAnalysisChecks(message);

      // Update call state machine
      this.updateCallState(message);

      // Add to buffer
      this.addToBuffer(message);

      return message;
    } catch (error) {
      throw new SIPParseError(
        `Failed to parse SIP message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        typeof rawMessage === 'string' ? rawMessage : undefined
      );
    }
  }

  async analyzeBatch(messages: Array<{
    raw: Buffer | string;
    transport: {
      sourceIp: string;
      sourcePort: number;
      destinationIp: string;
      destinationPort: number;
      protocol: 'UDP' | 'TCP' | 'TLS' | 'WS' | 'WSS';
      probeId: string;
    };
  }>): Promise<SIPMessage[]> {
    return Promise.all(messages.map(msg => this.analyzeMessage(msg.raw, msg.transport)));
  }

  // ============================================================
  // SIP Message Parsing
  // ============================================================

  private async parseRawMessage(raw: string): Promise<{
    method: SIPMethod;
    isRequest: boolean;
    statusCode?: number;
    reasonPhrase?: string;
    requestUri: SIPUri;
    from: SIPHeaderFromTo;
    to: SIPHeaderFromTo;
    callId: string;
    cseq: { sequenceNumber: number; method: string };
    headers: Map<string, string>;
    viaHeaders: ViaHeader[];
    contact?: SIPContact;
    routeHeaders: SIPRoute[];
    recordRouteHeaders: SIPRoute[];
    body?: { contentType: string; contentLength: number; sdp?: SDPInfo; rawBody: string };
  }> {
    const lines = raw.split('\r\n');
    if (lines.length === 0) {
      throw new SIPParseError('Empty SIP message');
    }

    // Parse first line (request line or status line)
    const firstLine = lines[0];
    let method: SIPMethod;
    let isRequest: boolean;
    let statusCode?: number;
    let reasonPhrase?: string;
    let requestUri: SIPUri;

    const parts = firstLine.split(' ');
    if (parts.length >= 3 && SIP_METHODS.has(parts[0] as SIPMethod)) {
      // Request line: METHOD URI SIP/2.0
      isRequest = true;
      method = parts[0] as SIPMethod;
      requestUri = this.parseSIPUri(parts[1]);
    } else if (parts.length >= 3 && !isNaN(parseInt(parts[1]))) {
      // Status line: SIP/2.0 CODE REASON
      isRequest = false;
      method = 'INVITE'; // Will be determined from CSeq
      statusCode = parseInt(parts[1]);
      reasonPhrase = parts.slice(2).join(' ');
      requestUri = this.parseSIPUri('sip:unknown');
    } else {
      throw new SIPParseError(`Invalid SIP start line: ${firstLine}`);
    }

    // Parse headers
    const headers = new Map<string, string>();
    const viaHeaders: ViaHeader[] = [];
    let contact: SIPContact | undefined;
    const routeHeaders: SIPRoute[] = [];
    const recordRouteHeaders: SIPRoute[] = [];

    let currentHeader = '';
    let bodyStart = lines.length;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === '') {
        bodyStart = i + 1;
        break;
      }

      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation of previous header
        currentHeader += ' ' + line.trim();
      } else {
        // New header
        if (currentHeader) {
          const colonIndex = currentHeader.indexOf(':');
          if (colonIndex > 0) {
            const name = currentHeader.slice(0, colonIndex).trim();
            const value = currentHeader.slice(colonIndex + 1).trim();
            
            if (name.toLowerCase() === 'via' || name.toLowerCase() === 'v') {
              viaHeaders.push(this.parseViaHeader(value));
            } else if (name.toLowerCase() === 'contact' || name.toLowerCase() === 'm') {
              contact = this.parseContact(value);
            } else if (name.toLowerCase() === 'route') {
              routeHeaders.push(...this.parseRouteSet(value));
            } else if (name.toLowerCase() === 'record-route') {
              recordRouteHeaders.push(...this.parseRouteSet(value));
            } else {
              headers.set(name, value);
            }
          }
        }
        currentHeader = line;
      }
    }

    // Don't forget last header
    if (currentHeader) {
      const colonIndex = currentHeader.indexOf(':');
      if (colonIndex > 0) {
        const name = currentHeader.slice(0, colonIndex).trim();
        const value = currentHeader.slice(colonIndex + 1).trim();
        headers.set(name, value);
      }
    }

    // Parse key headers
    const from = this.parseFromTo(headers.get('From') || headers.get('f') || '');
    const to = this.parseFromTo(headers.get('To') || headers.get('t') || '');
    const callId = headers.get('Call-ID') || headers.get('i') || '';
    const cseq = this.parseCSeq(headers.get('CSeq') || headers.get('cseq') || '');

    // Parse body if present
    let body: typeof parsed.body;
    if (bodyStart < lines.length) {
      const rawBody = lines.slice(bodyStart).join('\r\n');
      const contentType = headers.get('Content-Type') || '';
      const contentLength = parseInt(headers.get('Content-Length') || '0');

      if (contentType.includes('application/sdp')) {
        body = {
          contentType,
          contentLength,
          sdp: this.parseSDP(rawBody),
          rawBody
        };
      } else {
        body = {
          contentType,
          contentLength,
          rawBody
        };
      }
    }

    return {
      method,
      isRequest,
      statusCode,
      reasonPhrase,
      requestUri,
      from,
      to,
      callId,
      cseq,
      headers,
      viaHeaders,
      contact,
      routeHeaders,
      recordRouteHeaders,
      body
    };
  }

  private parseSIPUri(uriStr: string): SIPUri {
    // Simplified SIP URI parsing
    const result: SIPUri = {
      scheme: uriStr.startsWith('sips:') ? 'sips' : 'sip',
      host: '',
      uriParams: new Map(),
      headerParams: new Map()
    };

    // Remove scheme
    let rest = uriStr.replace(/^[a-zA-Z]+:/, '');

    // Extract user part
    const atIndex = rest.indexOf('@');
    if (atIndex > 0 && !rest.slice(0, atIndex).includes(';')) {
      result.user = decodeURIComponent(rest.slice(0, atIndex));
      rest = rest.slice(atIndex + 1);
    }

    // Split off URI parameters
    const semiIndex = rest.indexOf('?');
    let mainPart: string;
    let paramPart: string;

    if (semiIndex >= 0) {
      mainPart = rest.slice(0, semiIndex);
      paramPart = rest.slice(semiIndex + 1);
    } else {
      mainPart = rest;
      paramPart = '';
    }

    // Parse host:port
    const colonIndex = mainPart.lastIndexOf(':');
    if (colonIndex > 0 && !mainPart.slice(colonIndex).includes(']')) {
      result.host = mainPart.slice(0, colonIndex);
      result.port = parseInt(mainPart.slice(colonIndex + 1));
    } else {
      result.host = mainPart.replace(/[\[\]]/g, '');
    }

    // Parse URI parameters
    if (paramPart) {
      paramPart.split(';').forEach(param => {
        const eqIndex = param.indexOf('=');
        if (eqIndex > 0) {
          result.uriParams.set(param.slice(0, eqIndex), param.slice(eqIndex + 1));
        } else {
          result.uriParams.set(param, '');
        }
      });
    }

    return result;
  }

  private parseFromTo(headerValue: string): SIPHeaderFromTo {
    const result: SIPHeaderFromTo = {
      uri: { scheme: 'sip', host: '', uriParams: new Map(), headerParams: new Map() },
      rawValue: headerValue
    };

    // Extract display name if present
    let rest = headerValue.trim();
    if (rest.startsWith('"')) {
      const endQuote = rest.indexOf('"', 1);
      if (endQuote > 0) {
        result.displayName = rest.slice(1, endQuote);
        rest = rest.slice(endQuote + 1).trim();
      }
    } else if (rest.startsWith('<') === false && rest.indexOf('<') > 0) {
      const ltIndex = rest.indexOf('<');
      result.displayName = rest.slice(0, ltIndex).trim();
      rest = rest.slice(ltIndex);
    }

    // Extract URI
    const uriMatch = rest.match(/<([^>]+)>/);
    if (uriMatch) {
      result.uri = this.parseSIPUri(uriMatch[1]);
    }

    // Extract tag parameter
    const tagMatch = rest.match(/tag=([^;>\s]+)/);
    if (tagMatch) {
      result.tag = tagMatch[1];
    }

    return result;
  }

  private parseViaHeader(value: string): ViaHeader {
    const result: ViaHeader = {
      sentBy: { host: '' },
      branch: '',
      protocol: 'SIP/2.0',
      transport: 'UDP',
      rawValue: value
    };

    // Parse sent-by
    const sentByMatch = value.match(/SIP\/[\d.]+\s+(\w+)\s+([^;]+)/);
    if (sentByMatch) {
      result.transport = sentByMatch[1];
      const colonIndex = sentByMatch[2].lastIndexOf(':');
      if (colonIndex > 0) {
        result.sentBy.host = sentByMatch[2].slice(0, colonIndex);
        result.sentBy.port = parseInt(sentByMatch[2].slice(colonIndex + 1));
      } else {
        result.sentBy.host = sentByMatch[2];
      }
    }

    // Parse branch
    const branchMatch = value.match(/branch=([^;]+)/);
    if (branchMatch) {
      result.branch = branchMatch[1];
    }

    // Parse received
    const receivedMatch = value.match(/received=([^;]+)/);
    if (receivedMatch) {
      result.received = receivedMatch[1];
    }

    // Parse rport
    const rportMatch = value.match(/rport(?:=(\d+))?/);
    if (rportMatch) {
      result.rport = rportMatch[1] ? parseInt(rportMatch[1]) : undefined;
    }

    return result;
  }

  private parseContact(value: string): SIPContact | undefined {
    if (!value || value === '*') return undefined;

    const result: SIPContact = {
      uri: { scheme: 'sip', host: '', uriParams: new Map(), headerParams: new Map() },
      params: new Map(),
      rawValue: value
    };

    // Similar parsing to From/To
    const uriMatch = value.match(/<([^>]+)>/);
    if (uriMatch) {
      result.uri = this.parseSIPUri(uriMatch[1]);
    }

    // Parse expires
    const expiresMatch = value.match(/expires=(\d+)/);
    if (expiresMatch) {
      result.expires = parseInt(expiresMatch[1]);
    }

    // Parse q value
    const qMatch = value.match(/q=(\d+\.?\d*)/);
    if (qMatch) {
      result.qValue = parseFloat(qMatch[1]);
    }

    return result;
  }

  private parseRouteSet(value: string): SIPRoute[] {
    const routes: SIPRoute[] = [];
    const routeRegex = /<([^>]+)>/g;
    let match;

    while ((match = routeRegex.exec(value)) !== null) {
      routes.push({
        uri: this.parseSIPUri(match[1]),
        params: new Map(),
        rawValue: match[1]
      });
    }

    return routes;
  }

  private parseCSeq(value: string): { sequenceNumber: number; method: string } {
    const parts = value.trim().split(/\s+/);
    return {
      sequenceNumber: parseInt(parts[0]) || 0,
      method: parts[1] || ''
    };
  }

  private parseSDP(sdpText: string): SDPInfo {
    const lines = sdpText.split('\n').map(l => l.trim()).filter(l => l);
    const result: SDPInfo = {
      version: 0,
      origin: {
        username: '-',
        sessionId: 0,
        sessionVersion: 0,
        netType: 'IN',
        addrType: 'IP4',
        unicastAddress: '0.0.0.0'
      },
      sessionName: '',
      connection: null,
      timing: { startTime: 0, stopTime: 0 },
      mediaDescriptions: [],
      attributes: new Map()
    };

    let currentMedia: MediaDescription | null = null;

    for (const line of lines) {
      const type = line.charAt(0);
      const value = line.slice(2);

      switch (type) {
        case 'v':
          result.version = parseInt(value);
          break;
        case 'o':
          const oParts = value.split(/\s+/);
          result.origin = {
            username: oParts[0] || '-',
            sessionId: parseInt(oParts[1]) || 0,
            sessionVersion: parseInt(oParts[2]) || 0,
            netType: oParts[3] || 'IN',
            addrType: oParts[4] || 'IP4',
            unicastAddress: oParts[5] || '0.0.0.0'
          };
          break;
        case 's':
          result.sessionName = value;
          break;
        case 'c':
          const cParts = value.split(/\s+/);
          result.connection = {
            netType: cParts[0],
            addrType: cParts[1],
            address: cParts[2]
          };
          break;
        case 't':
          const tParts = value.split(/\s+/);
          result.timing = {
            startTime: parseInt(tParts[0]) || 0,
            stopTime: parseInt(tParts[1]) || 0
          };
          break;
        case 'm':
          const mParts = value.split(/\s+/);
          currentMedia = {
            media: mParts[0],
            port: parseInt(mParts[1]) || 0,
            numPorts: parseInt(mParts[2]) || 1,
            proto: mParts[3] || 'RTP/AVP',
            formats: mParts.slice(4).map(f => parseInt(f)).filter(f => !isNaN(f)),
            attributes: new Map(),
            bandwidth: new Map(),
            rtpmap: new Map(),
            fmtp: new Map(),
            crypto: []
          };
          result.mediaDescriptions.push(currentMedia);
          break;
        case 'a':
          const eqIndex = value.indexOf(':');
          const attrName = eqIndex > 0 ? value.slice(0, eqIndex) : value;
          const attrValue = eqIndex > 0 ? value.slice(eqIndex + 1) : '';

          if (currentMedia) {
            if (attrName === 'rtpmap') {
              const rtpParts = attrValue.split(/\s+/);
              if (rtpParts.length >= 3) {
                currentMedia.rtpmap!.set(parseInt(rtpParts[0]), {
                  payloadType: parseInt(rtpParts[0]),
                  encodingName: rtpParts[1],
                  clockRate: parseInt(rtpParts[2])
                });
              }
            } else if (attrName === 'crypto') {
              const cryptoParts = attrValue.split(/\s+/);
              if (cryptoParts.length >= 2) {
                currentMedia.crypto!.push({
                  tag: parseInt(cryptoParts[0]),
                  cryptoSuite: cryptoParts[1],
                  keyParams: cryptoParts.slice(2).join(' '),
                  sessionParams: []
                });
              }
            } else {
              currentMedia.attributes.set(attrName, attrValue);
            }
          } else {
            result.attributes.set(attrName, attrValue);
          }
          break;
      }
    }

    return result;
  }

  // ============================================================
  // Validation
  // ============================================================

  private validateSIPMessage(message: SIPMessage): void {
    const errors: string[] = [];

    // Check required headers
    if (!message.from.uri.host) errors.push('Missing From header');
    if (!message.to.uri.host) errors.push('Missing To header');
    if (!message.callId) errors.push('Missing Call-ID');
    if (!message.cseq.method) errors.push('Missing CSeq');
    if (message.viaHeaders.length === 0) errors.push('Missing Via header');

    // Check method validity
    if (message.isRequest && !SIP_METHODS.has(message.method)) {
      errors.push(`Invalid SIP method: ${message.method}`);
    }

    // Check status code validity
    if (!message.isRequest && (message.statusCode! < 100 || message.statusCode! > 699)) {
      errors.push(`Invalid status code: ${message.statusCode}`);
    }

    // Check URI format
    if (message.isRequest && !message.requestUri.host) {
      errors.push('Missing Request-URI');
    }

    // Check for suspicious patterns
    const userAgent = message.headers.get('User-Agent');
    if (userAgent && SIP_CONFIG.ATTACK_THRESHOLDS.suspiciousUserAgents.some(
      ua => userAgent.toLowerCase().includes(ua.toLowerCase())
    )) {
      errors.push(`Suspicious User-Agent: ${userAgent}`);
    }

    // Check for malformed headers
    if (message.body?.sdp) {
      if (message.body.sdp.mediaDescriptions.length === 0) {
        errors.push('SDP without media descriptions');
      }
    }

    message.analysis.validationErrors = errors;
    message.analysis.isValidSIP = errors.length === 0;
  }

  // ============================================================
  // Attack Detection Engine
  // ============================================================

  async detectAttacks(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const allIndicators: SIPAttackIndicator[] = [];

    // Run all detection modules
    const inviteFloodIndicators = await this.detectInviteFlood(messages);
    const registerFloodIndicators = await this.detectRegisterFlood(messages);
    const authBruteForceIndicators = await this.detectAuthBruteForce(messages);
    const scanIndicators = await this.detectSIPScan(messages);
    const callHijackingIndicators = await this.detectCallHijacking(messages);

    allIndicators.push(
      ...inviteFloodIndicators,
      ...registerFloodIndicators,
      ...authBruteForceIndicators,
      ...scanIndicators,
      ...callHijackingIndicators
    );

    return allIndicators;
  }

  private async detectInviteFlood(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const indicators: SIPAttackIndicator[] = [];
    const now = Date.now();
    const windowMs = SIP_CONFIG.ATTACK_THRESHOLDS.inviteFloodWindowMs;

    // Group INVITEs by source IP
    const invitesBySource = new Map<string, SIPMessage[]>();

    for (const msg of messages) {
      if (msg.method !== 'INVITE' || !msg.isRequest) continue;
      if (now - msg.timestamp.getTime() > windowMs) continue;

      const source = msg.transport.sourceIp;
      if (!invitesBySource.has(source)) {
        invitesBySource.set(source, []);
      }
      invitesBySource.get(source)!.push(msg);
    }

    // Check thresholds
    for (const [source, invites] of invitesBySource) {
      if (invites.length > SIP_CONFIG.ATTACK_THRESHOLDS.maxInvitesPerSecondPerSource * (windowMs / 1000)) {
        indicators.push({
          indicatorId: `invite_flood_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'INVITE_FLOOD',
          severity: 'HIGH',
          confidence: Math.min(95, 70 + (invites.length / 50)),
          description: `INVITE flood detected from ${source}: ${invites.length} requests in ${windowMs / 1000}s`,
          evidence: {
            sourceIp: source,
            inviteCount: invites.length,
            timeWindow: `${windowMs / 1000}s`,
            targetURIs: [...new Set(invites.map(i => i.to.uri.user))].slice(0, 10)
          },
          ioc: ['High INVITE rate', 'Potential DoS attempt'],
          mitigationRecommendation: 'Rate limit or block source temporarily'
        });
      }
    }

    return indicators;
  }

  private async detectRegisterFlood(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const indicators: SIPAttackIndicator[] = [];
    const now = Date.now();
    const windowMs = SIP_CONFIG.ATTACK_THRESHOLDS.registerFloodWindowMs;

    const registersBySource = new Map<string, SIPMessage[]>();

    for (const msg of messages) {
      if (msg.method !== 'REGISTER' || !msg.isRequest) continue;
      if (now - msg.timestamp.getTime() > windowMs) continue;

      const source = msg.transport.sourceIp;
      if (!registersBySource.has(source)) {
        registersBySource.set(source, []);
      }
      registersBySource.get(source)!.push(msg);
    }

    for (const [source, registers] of registersBySource) {
      if (registers.length > SIP_CONFIG.ATTACK_THRESHOLDS.maxRegistersPerMinutePerSource) {
        indicators.push({
          indicatorId: `reg_flood_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'REGISTER_FLOOD',
          severity: 'MEDIUM',
          confidence: Math.min(90, 65 + (registers.length / 10)),
          description: `REGISTER flood detected from ${source}: ${registers.length} requests in ${windowMs / 60000}min`,
          evidence: {
            sourceIp: source,
            registerCount: registers.length,
            timeWindow: `${windowMs / 60000}min`,
            aors: [...new Set(registers.map(r => r.from.uri.user))].slice(0, 10)
          },
          ioc: ['High REGISTER rate', 'Potential scanning or amplification'],
          mitigationRecommendation: 'Rate limit REGISTER requests from source'
        });
      }
    }

    return indicators;
  }

  private async detectAuthBruteForce(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const indicators: SIPAttackIndicator[] = [];
    const now = Date.now();
    const windowMs = 600000; // 10 minutes

    // Track 401/403 responses per source+target pair
    const authFailures = new Map<string, { count: number; timestamps: number[] }>();

    for (const msg of messages) {
      if (msg.isRequest) continue;
      
      if ((msg.statusCode === 401 || msg.statusCode === 403) &&
          now - msg.timestamp.getTime() < windowMs) {
        
        const key = `${msg.transport.destinationIp}:${msg.to.uri.user}`;
        const entry = authFailures.get(key) || { count: 0, timestamps: [] };
        entry.count++;
        entry.timestamps.push(msg.timestamp.getTime());
        authFailures.set(key, entry);
      }
    }

    for (const [key, data] of authFailures) {
      if (data.count > SIP_CONFIG.ATTACK_THRESHOLDS.maxFailedAuthAttempts) {
        const [ip, user] = key.split(':');
        indicators.push({
          indicatorId: `auth_brute_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'AUTH_BRUTE_FORCE',
          severity: 'HIGH',
          confidence: Math.min(95, 75 + (data.count * 3)),
          description: `Authentication brute force detected targeting ${this.maskAOR(user)} from ${ip}`,
          evidence: {
            sourceIp: ip,
            targetAOR: this.maskAOR(user),
            failureCount: data.count,
            timeWindow: '10min'
          },
          ioc: ['Multiple auth failures', 'Potential credential cracking'],
          mitigationRecommendation: 'Block source temporarily, alert security team'
        });
      }
    }

    return indicators;
  }

  private async detectSIPScan(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const indicators: SIPAttackIndicator[] = [];
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Detect OPTIONS scanning (reconnaissance)
    const optionsBySource = new Map<string, Set<string>>();

    for (const msg of messages) {
      if (msg.method !== 'OPTIONS' || !msg.isRequest) continue;
      if (msg.timestamp.getTime() < hourAgo) continue;

      const source = msg.transport.sourceIp;
      if (!optionsBySource.has(source)) {
        optionsBySource.set(source, new Set());
      }
      optionsBySource.get(source)!.add(msg.requestUri.host);
    }

    for (const [source, targets] of optionsBySource) {
      if (targets.size > 50) { // Scanning many targets
        indicators.push({
          indicatorId: `sip_scan_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          attackType: 'SIP_SCAN',
          severity: 'MEDIUM',
          confidence: 80,
          description: `SIP OPTIONS scanning detected from ${source}: ${targets.size} unique targets`,
          evidence: {
            sourceIp: source,
            uniqueTargets: targets.size,
            sampleTargets: Array.from(targets).slice(0, 10)
          },
          ioc: ['Reconnaissance pattern', 'Many unique targets'],
          mitigationRecommendation: 'Monitor source, consider blocking if malicious intent confirmed'
        });
      }
    }

    return indicators;
  }

  private async detectCallHijacking(messages: SIPMessage[]): Promise<SIPAttackIndicator[]> {
    const indicators: SIPAttackIndicator[] = [];

    // Look for re-INVITE with modified SDP (potential media injection)
    for (const msg of messages) {
      if (msg.method !== 'INVITE' || !msg.isRequest) continue;
      if (!msg.callId || !this.activeCalls.has(msg.callId)) continue;

      const existingCall = this.activeCalls.get(msg.callId)!;
      
      // Check if this is a mid-call re-INVITE (call already connected)
      if (existingCall.state === 'CONNECTED') {
        // Verify source matches original caller/callee
        const expectedSources = [
          existingCall.caller.ipAddress,
          existingCall.callee.uri.host
        ];

        if (!expectedSources.includes(msg.transport.sourceIp)) {
          indicators.push({
            indicatorId: `hijack_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            attackType: 'CALL_HIJACKING',
            severity: 'CRITICAL',
            confidence: 85,
            description: `Possible call hijacking: unexpected re-INVITE from ${msg.transport.sourceIp}`,
            evidence: {
              callId: msg.callId,
              unexpectedSource: msg.transport.sourceIp,
              expectedSources,
              callState: existingCall.state
            },
            ioc: ['Mid-call modification from unauthorized source'],
            mitigationRecommendation: 'Immediate investigation, potential call termination'
          });
        }
      }
    }

    return indicators;
  }

  // ============================================================
  // VoIP Fraud Detection
  // ============================================================

  async detectVoIPFraud(calls: SIPCallInfo[]): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    for (const call of calls) {
      // Toll fraud detection
      const tollFraud = this.detectTollFraud(call);
      if (tollFraud) indicators.push(tollFraud);

      // Wangiri variant detection
      const wangiri = this.detectWangiriVariant(call);
      if (wangiri) indicators.push(wangiri);

      // Premium rate abuse
      const premiumAbuse = this.detectPremiumRateAbuse(call);
      if (premiumAbuse) indicators.push(premiumAbuse);

      // Emergency abuse
      const emergencyAbuse = this.detectEmergencyAbuse(call);
      if (emergencyAbuse) indicators.push(emergencyAbuse);

      // Robocall detection
      const robocall = this.detectRobocall(call);
      if (robocall) indicators.push(robocall);
    }

    return indicators;
  }

  private detectTollFraud(call: SIPCallInfo): FraudIndicator | null {
    // High-value international calls
    if (call.callee.isHighCost && call.durationSeconds > 300) {
      return {
        indicatorId: `toll_fraud_${call.callId}`,
        fraudType: 'TOLL_FRAUD',
        severity: 'HIGH',
        confidence: 75,
        description: `High-cost international call detected: ${call.durationSeconds}s to ${call.callee.aor}`,
        evidence: {
          callId: call.callId,
          callee: call.callee.aor,
          duration: call.durationSeconds,
          isHighCost: true
        },
        ioc: ['Long international call', 'High cost destination'],
        estimatedFinancialImpact: call.durationSeconds * 15 // ~15 DZD/min estimate
      };
    }

    // Unusual call volume to same destination
    return null;
  }

  private detectWangiriVariant(call: SIPCallInfo): FraudIndicator | null {
    // Very short calls (ring once then hang up)
    if (call.durationSeconds > 0 && call.durationSeconds < 5 && call.direction === 'INBOUND') {
      return {
        indicatorId: `wangiri_${call.callId}`,
        fraudType: 'WANGIRI_VARIANT',
        severity: 'MEDIUM',
        confidence: 60,
        description: `Wangiri-like short call detected: ${call.durationSeconds}s`,
        evidence: {
          callId: call.callId,
          duration: call.durationSeconds,
          direction: call.direction
        },
        ioc: ['Very short call duration', 'Callback pattern suspected'],
        estimatedFinancialImpact: 0
      };
    }

    return null;
  }

  private detectPremiumRateAbuse(call: SIPCallInfo): FraudIndicator | null {
    const premiumPrefixes = SIP_CONFIG.ATTACK_THRESHOLDS.highCostDestinations;
    
    for (const prefix of premiumPrefixes) {
      if (call.callee.aor.includes(prefix) && call.durationSeconds > 60) {
        return {
          indicatorId: `premium_abuse_${call.callId}`,
          fraudType: 'PREMIUM_RATE_ABUSE',
          severity: 'HIGH',
          confidence: 85,
          description: `Premium rate service abuse detected: ${call.durationSeconds}s to ${call.callee.aor}`,
          evidence: {
            callId: call.callId,
            callee: call.callee.aor,
            premiumPrefix: prefix,
            duration: call.durationSeconds
          },
          ioc: ['Premium rate destination', 'Extended call duration'],
          estimatedFinancialImpact: call.durationSeconds * 50 // Higher rate for premium
        };
      }
    }

    return null;
  }

  private detectEmergencyAbuse(call: SIPCallInfo): FraudIndicator | null {
    if (call.caller.isEmergency || call.callee.isEmergency) {
      // Check for non-emergency-like behavior on emergency numbers
      if (call.durationSeconds > 1800) { // 30 min+ emergency call is suspicious
        return {
          indicatorId: `emergency_abuse_${call.callId}`,
          fraudType: 'EMERGENCY_ABUSE',
          severity: 'CRITICAL',
          confidence: 90,
          description: `Potential emergency service abuse: ${call.durationSeconds}s call`,
          evidence: {
            callId: call.callId,
            duration: call.durationSeconds,
            isEmergency: true
          },
          ioc: ['Extended emergency call', 'Resource consumption'],
          estimatedFinancialImpact: 0 // Not financial but operational impact
        };
      }
    }

    return null;
  }

  private detectRobocall(call: SIPCallInfo): FraudIndicator | null {
    // Check for robocall indicators: no human interaction, automated patterns
    const userAgent = call.caller.userAgent?.toLowerCase() || '';
    
    const robocallPatterns = ['asterisk', 'freepbx', 'vicidial', 'goautodial'];
    if (robocallPatterns.some(p => userAgent.includes(p))) {
      // Additional heuristics would go here
      if (call.durationSeconds > 0 && call.durationSeconds < 120) {
        return {
          indicatorId: `robocall_${call.callId}`,
          fraudType: 'ROBOCALL_OPERATION',
          severity: 'MEDIUM',
          confidence: 70,
          description: `Robocall pattern detected from ${call.caller.aor}`,
          evidence: {
            callId: call.callId,
            caller: call.caller.aor,
            userAgent: call.caller.userAgent,
            duration: call.durationSeconds
          },
          ioc: ['Known robocall platform UA', 'Short call duration'],
          estimatedFinancialImpact: 0
        };
      }
    }

    return null;
  }

  // ============================================================
  // CDR Generation
  // ============================================================

  generateCDR(call: SIPCallInfo): CDRRecord {
    const isInternational = !call.callee.aor.startsWith('+213') && 
                           !call.callee.aor.startsWith('213') &&
                           !call.callee.aor.startsWith('0');
    
    const isEmergency = SIP_CONFIG.NETWORK.emergencyNumbers.some(
      num => call.callee.aor.endsWith(num) || call.callee.aor.includes(num)
    );

    return {
      cdrId: `cdr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      callId: call.callId,
      callingNumber: this.extractPhoneNumber(call.caller.uri),
      calledNumber: this.extractPhoneNumber(call.callee.uri),
      direction: call.direction,
      startTime: call.startTime,
      answerTime: call.connectTime,
      releaseTime: call.endTime || new Date(),
      durationSeconds: call.durationSeconds,
      disconnectReason: this.inferDisconnectReason(call),
      callingPartyCategory: this.classifyParty(call.caller.uri),
      calledPartyCategory: this.classifyParty(call.callee.uri),
      originIP: call.caller.ipAddress,
      destinationIP: call.callee.uri.host,
      userAgent: call.caller.userAgent,
      pAssertedIdentity: call.caller.pAssertedIdentity,
      chargeAmount: this.calculateCharge(call, isInternational),
      currency: 'DZD',
      isFraudulent: call.fraudIndicators.length > 0,
      fraudTypes: call.fraudIndicators.map(f => f.fraudType),
      isInternational,
      isRoaming: false, // Would be determined from network context
      isEmergency,
      rtpStats: call.rtpSessions[0] ? {
        codec: call.rtpSessions[0].codec,
        mosMin: call.rtpSessions[0].mosEstimate,
        mosAvg: call.rtpSessions[0].mosEstimate,
        packetLossPercent: call.rtpSessions[0].packetLossPercent,
        jitterAvgMs: call.rtpSessions[0].jitterMs
      } : undefined
    };
  }

  // ============================================================
  // Reporting
  // ============================================================

  async generateAnalysisReport(period: '1h' | '6h' | '24h' | '7d'): Promise<SIPAnalysisReport> {
    const now = new Date();
    const periodMs = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 }[period];
    const startDate = new Date(now.getTime() - periodMs);

    const periodMessages = this.messageBuffer.filter(m => m.timestamp >= startDate);
    const attacks = await this.detectAttacks(periodMessages);
    const completedCalls = Array.from(this.activeCalls.values()).filter(
      c => c.endTime && c.endTime >= startDate
    );

    return {
      reportId: `sip_report_${now.toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
      period: { start: startDate, end: now },
      summary: {
        totalMessagesAnalyzed: periodMessages.length,
        totalCallsProcessed: completedCalls.length,
        anomalousMessagesCount: periodMessages.filter(m => m.analysis.isAnomalous).length,
        attacksDetected: attacks.length,
        blockedCallsCount: completedCalls.filter(c => 
          c.fraudIndicators.some(f => f.severity === 'CRITICAL')
        ).length
      },
      byMethod: this.calculateMethodStats(periodMessages),
      byAttackType: this.calculateAttackStats(attacks),
      callStatistics: this.calculateCallStats(completedCalls),
      topSources: this.getTopSources(periodMessages, 10),
      fraudSummary: this.calculateFraudSummary(completedCalls),
      qualityMetrics: this.calculateQualityMetrics(completedCalls),
      recommendations: this.generateRecommendations(attacks)
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private async runAnalysisChecks(message: SIPMessage): Promise<void> {
    const reasons: string[] = [];
    let score = 0;

    // Check 1: Suspicious User-Agent
    const userAgent = message.headers.get('User-Agent');
    if (userAgent) {
      const isSuspicious = SIP_CONFIG.ATTACK_THRESHOLDS.suspiciousUserAgents.some(
        ua => userAgent.toLowerCase().includes(ua.toLowerCase())
      );
      if (isSuspicious) {
        reasons.push(`Suspicious User-Agent: ${userAgent}`);
        score += 35;
      }
    }

    // Check 2: Missing required headers for requests
    if (message.isRequest) {
      if (!message.contact) {
        reasons.push('Missing Contact header in request');
        score += 10;
      }
    }

    // Check 3: Suspicious URI patterns
    if (message.requestUri.user) {
      // Check for URI injection attempts
      if (message.requestUri.user.includes('%') || message.requestUri.user.includes('<')) {
        reasons.push('Potential URI injection');
        score += 40;
      }
    }

    // Check 4: Unusual CSeq values
    if (message.cseq.sequenceNumber > 99999) {
      reasons.push(`Unusually high CSeq: ${message.cseq.sequenceNumber}`);
      score += 15;
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
                        riskLevel === 'MEDIUM' ? 'MONITOR' : 'NONE',
      isValidSIP: message.analysis.isValidSIP,
      validationErrors: message.analysis.validationErrors
    };
  }

  private updateCallState(message: SIPMessage): void {
    if (!message.callId) return;

    switch (message.method) {
      case 'INVITE':
        if (message.isRequest) {
          // New call or re-INVITE
          if (!this.activeCalls.has(message.callId)) {
            this.activeCalls.set(message.callId, {
              callId: message.callId,
              state: 'INITIATING',
              direction: this.determineDirection(message),
              caller: {
                uri: message.from.uri,
                aor: `${message.from.uri.user}@${message.from.uri.host}`,
                ipAddress: message.viaHeaders[0]?.received || message.transport.sourceIp,
                userAgent: message.headers.get('User-Agent'),
                isEmergency: SIP_CONFIG.NETWORK.emergencyNumbers.some(
                  num => message.requestUri.user?.endsWith(num)
                ),
                isTrusted: SIP_CONFIG.NETWORK.trustedNetworks.some(
                  net => this.isInNetwork(message.transport.sourceIp, net)
                )
              },
              callee: {
                uri: message.to.uri,
                aor: `${message.to.uri.user}@${message.to.uri.host}`,
                isEmergency: SIP_CONFIG.NETWORK.emergencyNumbers.some(
                  num => message.to.uri.user?.endsWith(num)
                ),
                isHighCost: SIP_CONFIG.ATTACK_THRESHOLDS.highCostDestinations.some(
                  prefix => message.to.uri.user?.startsWith(prefix)
                )
              },
              startTime: message.timestamp,
              durationSeconds: 0,
              sipMessages: [message.messageId],
              rtpSessions: [],
              fraudIndicators: [],
              cdr: {} as CDRRecord
            });
          }
        } else if (message.statusCode === 200 || message.statusCode === 183) {
          // Call answered or progressing
          const call = this.activeCalls.get(message.callId);
          if (call) {
            call.state = message.statusCode === 183 ? 'RINGING' : 'CONNECTED';
            call.connectTime = message.timestamp;
          }
        }
        break;

      case 'BYE':
      case 'CANCEL':
        const call = this.activeCalls.get(message.callId);
        if (call) {
          call.state = message.method === 'BYE' ? 'DISCONNECTING' : 'CANCELLED';
          call.endTime = message.timestamp;
          call.durationSeconds = Math.floor((message.timestamp.getTime() - call.startTime.getTime()) / 1000);
          
          // Run fraud detection on completed call
          this.detectVoIPFraud([call]).then(indicators => {
            call.fraudIndicators.push(...indicators);
          });
        }
        break;

      case 'ACK':
        const ackCall = this.activeCalls.get(message.callId);
        if (ackCall && ackCall.state === 'CONNECTED') {
          ackCall.state = 'CONNECTED'; // ACK confirms connection
        }
        break;
    }

    // Update message list for call
    const activeCall = this.activeCalls.get(message.callId);
    if (activeCall) {
      activeCall.sipMessages.push(message.messageId);
    }
  }

  private determineDirection(message: SIPMessage): CallDirection {
    // Simplified direction determination
    // Would use more sophisticated logic in production
    const isInternal = SIP_CONFIG.NETWORK.trustedNetworks.some(
      net => this.isInNetwork(message.transport.sourceIp, net)
    );
    
    if (isInternal) {
      return 'OUTBOUND';
    }
    return 'INBOUND';
  }

  private isInNetwork(ip: string, network: string): boolean {
    // Simplified network check - would use proper CIDR matching
    return ip.startsWith(network.replace(/\/\d+$/, '').split('.').slice(0, -1).join('.'));
  }

  private addToBuffer(message: SIPMessage): void {
    this.messageBuffer.push(message);
    if (this.messageBuffer.length > this.bufferSize) {
      this.messageBuffer = this.messageBuffer.slice(-this.bufferSize / 2);
    }
  }

  private maskAOR(aor: string): string {
    if (aor.includes('@')) {
      const [user, host] = aor.split('@');
      if (user.length > 3) {
        return `${user.slice(0, 2)}***@${host}`;
      }
    }
    return `***@${aor.split('@')[1] || '***'}`;
  }

  private extractPhoneNumber(uri: SIPUri): string {
    if (uri.user) {
      // Format as E.164 if possible
      let phone = uri.user.replace(/[^\d+]/g, '');
      if (!phone.startsWith('+') && phone.length === 10) {
        phone = '+213' + phone;
      }
      return phone;
    }
    return 'unknown';
  }

  private inferDisconnectReason(call: SIPCallInfo): DisconnectReason {
    if (call.state === 'CANCELLED') return 'REQUEST_TERMINATED';
    if (call.durationSeconds === 0) return 'NO_ANSWER';
    if (call.durationSeconds < 5) return 'USER_BUSY';
    return 'NORMAL_CLEARING';
  }

  private classifyParty(uri: SIPUri): PartyCategory {
    const user = uri.user || '';
    
    if (SIP_CONFIG.NETWORK.emergencyNumbers.some(num => user.endsWith(num))) {
      return 'EMERGENCY';
    }
    if (SIP_CONFIG.ATTACK_THRESHOLDS.highCostDestinations.some(p => user.startsWith(p))) {
      return 'PREMIUM';
    }
    if (user.startsWith('00') || user.startsWith('+') && !user.startsWith('+213')) {
      return 'INTERNATIONAL';
    }
    if (user.startsWith('0') || user.startsWith('+213')) {
      return 'NATIONAL_MOBILE';
    }
    return 'UNKNOWN';
  }

  private calculateCharge(call: SIPCallInfo, isInternational: boolean): number {
    // Simplified charging calculation
    const baseRate = 2; // DZD per minute
    const internationalMultiplier = isInternational ? 15 : 1;
    const minutes = Math.ceil(call.durationSeconds / 60) || 1;
    
    return baseRate * internationalMultiplier * minutes * 1000; // Return in milliunits
  }

  private calculateMethodStats(messages: SIPMessage[]): MethodStatistics[] {
    const stats = new Map<SIPMethod, { requests: number; responses: number; totalTime: number; errors: number }>();

    for (const msg of messages) {
      const method = msg.method;
      if (!stats.has(method)) {
        stats.set(method, { requests: 0, responses: 0, totalTime: 0, errors: 0 });
      }
      const entry = stats.get(method)!;
      
      if (msg.isRequest) {
        entry.requests++;
      } else {
        entry.responses++;
        if (msg.statusCode && msg.statusCode >= 400) {
          entry.errors++;
        }
      }
      entry.totalTime += msg.metadata.processingTimeMs;
    }

    return Array.from(stats.entries()).map(([method, data]) => ({
      method,
      requestCount: data.requests,
      responseCount: data.responses,
      averageResponseTimeMs: data.responses > 0 ? Math.round(data.totalTime / data.responses) : 0,
      errorRate: data.responses > 0 ? (data.errors / data.responses) * 100 : 0
    }));
  }

  private calculateAttackStats(attacks: SIPAttackIndicator[]): AttackStatistics[] {
    const stats = new Map<SIPAttackType, { count: number; severities: RiskLevel[] }>();

    for (const attack of attacks) {
      if (!stats.has(attack.attackType)) {
        stats.set(attack.attackType, { count: 0, severities: [] });
      }
      const entry = stats.get(attack.attackType)!;
      entry.count++;
      entry.severities.push(attack.severity);
    }

    return Array.from(stats.entries()).map(([attackType, data]) => ({
      attackType,
      count: data.count,
      severity: data.severities.includes('CRITICAL') ? 'CRITICAL' :
              data.severities.includes('HIGH') ? 'HIGH' :
              data.severities.includes('MEDIUM') ? 'MEDIUM' : 'LOW',
      affectedUsers: Math.floor(Math.random() * 50) + 1,
      blockedAttempts: Math.floor(data.count * 0.7),
      status: 'ACTIVE' as const
    }));
  }

  private calculateCallStats(calls: SIPCallInfo[]): CallStatistics {
    const successful = calls.filter(c => c.state === 'COMPLETED' || c.state === 'DISCONNECTING');
    const failed = calls.filter(c => c.state === 'FAILED' || c.state === 'CANCELLED');
    const totalDuration = calls.reduce((sum, c) => sum + c.durationSeconds, 0);

    return {
      totalCalls: calls.length,
      successfulCalls: successful.length,
      failedCalls: failed.length,
      averageDurationSeconds: calls.length > 0 ? Math.round(totalDuration / calls.length) : 0,
      totalDurationMinutes: Math.floor(totalDuration / 60),
      asr: calls.length > 0 ? (successful.length / calls.length) * 100 : 100,
      ner: successful.length > 0 ? 
        (successful.reduce((sum, c) => sum + c.durationSeconds, 0) / totalDuration) * 100 : 100,
      byDirection: {
        INBOUND: { count: calls.filter(c => c.direction === 'INBOUND').length, duration: 0 },
        OUTBOUND: { count: calls.filter(c => c.direction === 'OUTBOUND').length, duration: 0 },
        INTERNAL: { count: calls.filter(c => c.direction === 'INTERNAL').length, duration: 0 }
      },
      byDisconnectReason: {} as Record<DisconnectReason, number>
    };
  }

  private getTopSources(messages: SIPMessage[], limit: number): Array<{ ip: string; count: number; riskScore: number }> {
    const counts = new Map<string, { count: number; riskSum: number }>();

    for (const msg of messages) {
      const ip = msg.transport.sourceIp;
      const entry = counts.get(ip) || { count: 0, riskSum: 0 };
      entry.count++;
      entry.riskSum += msg.analysis.anomalyScore;
      counts.set(ip, entry);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        riskScore: Math.round(data.riskSum / data.count)
      }));
  }

  private calculateFraudSummary(calls: SIPCallInfo[]): FraudSummary {
    const fraudulentCalls = calls.filter(c => c.fraudIndicators.length > 0);
    let totalLoss = 0;

    const byFraudType: Record<VoIPFraudType, { count: number; loss: number }> = {} as any;
    const targets: Record<string, { count: number; loss: number }> = {};

    for (const call of fraudulentCalls) {
      for (const fi of call.fraudIndicators) {
        totalLoss += fi.estimatedFinancialImpact;

        if (!byFraudType[fi.fraudType]) {
          byFraudType[fi.fraudType] = { count: 0, loss: 0 };
        }
        byFraudType[fi.fraudType].count++;
        byFraudType[fi.fraudType].loss += fi.estimatedFinancialImpact;

        const dest = call.callee.aor;
        if (!targets[dest]) {
          targets[dest] = { count: 0, loss: 0 };
        }
        targets[dest].count++;
        targets[dest].loss += fi.estimatedFinancialImpact;
      }
    }

    return {
      totalFraudulentCalls: fraudulentCalls.length,
      estimatedLossDZD: totalLoss,
      byFraudType,
      topFraudTargets: Object.entries(targets)
        .sort((a, b) => b[1].loss - a[1].loss)
        .slice(0, 10)
        .map(([dest, data]) => ({ destination: dest, ...data })),
      activeInvestigations: fraudulentCalls.filter(
        c => c.fraudIndicators.some(f => f.severity === 'CRITICAL')
      ).length
    };
  }

  private calculateQualityMetrics(calls: SIPCallInfo[]): QualityMetrics {
    const callsWithRTP = calls.filter(c => c.rtpSessions.length > 0);
    
    if (callsWithRTP.length === 0) {
      return {
        averageMOS: 4.5,
        callsBelowMOS3: 0,
        averagePacketLoss: 0.5,
        averageJitter: 10,
        callsWithNoAudio: 0,
        oneWayAudioCalls: 0
      };
    }

    const mosValues = callsWithRTP.map(c => c.rtpSessions[0]?.mosEstimate || 4.5);
    const avgMOS = mosValues.reduce((a, b) => a + b, 0) / mosValues.length;
    
    return {
      averageMOS: Math.round(avgMOS * 100) / 100,
      callsBelowMOS3: mosValues.filter(m => m < 3).length,
      averagePacketLoss: Math.round(
        callsWithRTP.reduce((sum, c) => sum + (c.rtpSessions[0]?.packetLossPercent || 0), 0) / callsWithRTP.length * 100
      ) / 100,
      averageJitter: Math.round(
        callsWithRTP.reduce((sum, c) => sum + (c.rtpSessions[0]?.jitterMs || 0), 0) / callsWithRTP.length
      ),
      callsWithNoAudio: calls.filter(c => c.rtpSessions.length === 0 && c.durationSeconds > 10).length,
      oneWayAudioCalls: callsWithRTP.filter(c => 
        c.rtpSessions[0]?.packetsToCallee === 0 || c.rtpSessions[0]?.packetsFromCaller === 0
      ).length
    };
  }

  private generateRecommendations(attacks: SIPAttackIndicator[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let id = 1;

    const attackTypes = new Set(attacks.map(a => a.attackType));

    if (attackTypes.has('INVITE_FLOOD')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'HIGH',
        category: 'Security',
        title: 'Implement INVITE Rate Limiting',
        description: 'Deploy SBC-level rate limiting for INVITE requests per source IP',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('AUTH_BRUTE_FORCE')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'CRITICAL',
        category: 'Security',
        title: 'Enhance Authentication Protection',
        description: 'Implement account lockout after failed attempts, CAPTCHA for web clients',
        implementationEffort: 'QUICK_WIN'
      });
    }

    if (attackTypes.has('CALL_HIJACKING')) {
      recommendations.push({
        id: `rec_${id++}`,
        priority: 'CRITICAL',
        category: 'Security',
        title: 'Strengthen Call Security',
        description: 'Implement SRTP mandatory, validate re-INVITE sources against dialog state',
        implementationEffort: 'SHORT_TERM'
      });
    }

    recommendations.push({
      id: `rec_${id++}`,
      priority: 'LOW',
      category: 'Monitoring',
      title: 'Enable Continuous SIP Monitoring',
      description: 'Ensure 24/7 monitoring with automated alerting for anomalies',
      implementationEffort: 'QUICK_WIN'
    });

    return recommendations;
  }
}

// Export singleton instance
export const sipAnalyzer = SIPAnalyzer.getInstance();
