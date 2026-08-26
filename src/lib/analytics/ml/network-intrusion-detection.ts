/**
 * National SOC Platform - Network Intrusion Detection System (NIDS)
 * 
 * Advanced network intrusion detection for telecommunications:
 * - Protocol-specific anomaly detection (SS7, GTP, SIP, Diameter)
 * - DDoS attack pattern recognition
 * - Port scan detection algorithms
 * - DNS tunneling detection
 * - Command & Control (C2) beaconing detection
 * - Lateral movement pattern identification
 * - Telecom-specific attack signatures
 * 
 * @version 1.0.0 (Phase 6 Enhancement)
 * @module analytics/ml/network-intrusion-detection
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

/** Network flow/packet data */
export interface NetworkFlow {
  id: string;
  timestamp: Date;
  
  // Endpoint information
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  
  // Protocol information
  protocol: NetworkProtocol;
  transportProtocol: 'tcp' | 'udp' | 'sctp' | 'unknown';
  
  // Traffic characteristics
  packetsIn: number;
  packetsOut: number;
  bytesIn: number;
  bytesOut: number;
  durationMs: number;
  
  // Flags and state
  tcpFlags?: TCPFlags;
  flowState: FlowState;
  
  // Application layer info
  application?: string;
  payloadSample?: string;
  
  // Telecom-specific fields
  telecomData?: TelecomProtocolData;
  
  // Classification
  classification?: FlowClassification;
  
  // Metadata
  sourceLocation?: GeoLocation;
  destLocation?: GeoLocation;
  deviceId?: string;
  subscriberId?: string;
}

/** Supported network protocols */
export type NetworkProtocol = 
  | 'ip'
  | 'tcp'
  | 'udp'
  | 'icmp'
  | 'http'
  | 'https'
  | 'dns'
  | 'ssh'
  | 'ftp'
  | 'smtp'
  | 'ss7'
  | 'diameter'
  | 'gtp'
  | 'sip'
  | 'rtp'
  | 'unknown';

/** TCP flags */
export interface TCPFlags {
  syn: boolean;
  ack: boolean;
  fin: boolean;
  rst: boolean;
  psh: boolean;
  urg: boolean;
  ece: boolean;
  cwr: boolean;
}

/** Flow states */
export type FlowState = 
  | 'established'
  | 'syn_sent'
  | 'syn_received'
  | 'fin_wait'
  | 'close_wait'
  | 'closing'
  | 'last_ack'
  | 'time_wait'
  | 'closed'
  | 'reset'
  | 'unknown';

/** Flow classification result */
export interface FlowClassification {
  category: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  threatType?: ThreatType;
  confidence: number; // 0-1
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  iocMatches: IOCMatch[];
}

/** Types of threats detected */
export type ThreatType = 
  | 'ddos_volumetric'
  | 'ddos_protocol'
  | 'ddos_application'
  | 'port_scan'
  | 'vertical_scan'
  | 'horizontal_scan'
  | 'dns_tunneling'
  | 'c2_beaconing'
  | 'data_exfiltration'
  | 'lateral_movement'
  | 'brute_force'
  | 'credential_theft'
  | 'malware_c2'
  | 'ss7_tracking'
  | 'ss7_interception'
  | 'ss7_fraud'
  | 'gtp_tunnel_abuse'
  | 'roaming_fraud'
  | 'sip_fraud'
  | 'dos_attack'
  | 'reconnaissance'
  | 'unknown';

/** IOC match in a flow */
export interface IOCMatch {
  iocType: string;
  iocValue: string;
  matchField: string;
  confidence: number;
}

/** Geographic location */
export interface GeoLocation {
  country: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  asn?: number;
  isp?: string;
}

/** Telecom protocol data */
export interface TelecomProtocolData {
  protocol: 'ss7' | 'diameter' | 'gtp' | 'sip';
  
  // SS7 specific
  ss7Data?: SS7MessageData;
  
  // Diameter specific
  diameterData?: DiameterMessageData;
  
  // GTP specific
  gtpData?: GTPSessionData;
  
  // SIP specific
  sipData?: SIPCallData;
}

/** SS7 message data */
export interface SS7MessageData {
  messageType: string;
  opc: number; // Originating point code
  dpc: number; // Destination point code
  globalTitle?: string;
  sccpLayer: boolean;
  tcapLayer: boolean;
  mapOperation?: string;
  capOperation?: string;
  isupMessageType?: string;
  subscriberNumber?: string;
  imsi?: string;
  imei?: string;
  msisdn?: string;
  locationInfo?: string;
}

/** Diameter message data */
export interface DiameterMessageData {
  commandCode: number;
  applicationId: number;
  sessionId: string;
  originHost: string;
  originRealm: string;
  destinationHost?: string;
  destinationRealm?: string;
  authApplicationId?: number;
  userName?: string;
  publicIdentity?: string;
  serverName?: string;
  resultCode?: number;
  errorMessage?: string;
}

/** GTP session data */
export interface GTPSessionData {
  messageType: number;
  teid: number; // Tunnel endpoint identifier
  imsi?: string;
  msisdn?: string;
  apn: string;
  ratType: 'UTRAN' | 'GERAN' | 'EUTRAN' | 'WLAN' | 'VIRTUAL' | 'unknown';
  plmnId: string;
  tai: string;
  eci: string;
  version: 1 | 2;
  isUplink: boolean;
  qosProfile?: QoSProfile;
}

/** Quality of Service profile */
export interface QoSProfile {
  qci: number; // QoS class identifier
  mbrUp: number; // Maximum bit rate uplink (kbps)
  mbrDown: number; // Maximum bit rate downlink (kbps)
  gbrUp: number; // Guaranteed bit rate uplink
  gbrDown: number; // Guaranteed bit rate downlink
}

/** SIP call data */
export interface SIPCallData {
  method: 'INVITE' | 'ACK' | 'BYE' | 'CANCEL' | 'OPTIONS' | 'REGISTER' | 'PRACK' | 'SUBSCRIBE' | 'NOTIFY' | 'INFO' | 'MESSAGE' | 'UPDATE' | 'REFER';
  callId: string;
  fromUri: string;
  toUri: string;
  fromUser: string;
  toUser: string;
  fromDomain: string;
  toDomain: string;
  sipStatus?: number;
  userAgent?: string;
  contentType?: string;
  sdpOffered?: boolean;
  rtpPorts?: { audio: number; video?: number };
  viaHeaders?: string[];
  routeHeaders?: string[];
}

/** NIDS Detection Result */
export interface NIDSDetectionResult {
  id: string;
  timestamp: Date;
  flowId: string;
  
  // Detection details
  threatType: ThreatType;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  
  // Description
  title: string;
  description: string;
  
  // Indicators
  indicators: DetectionIndicator[];
  
  // MITRE ATT&CK mapping
  mitreTechnique?: string;
  mitreTactic?: string;
  
  // Recommended actions
  recommendedActions: string[];
  
  // Related detections
  relatedDetections?: string[];
  
  // Source of detection
  detectionMethod: DetectionMethod;
  ruleId?: string;
  signatureId?: string;
}

/** Individual detection indicator */
export interface DetectionIndicator {
  name: string;
  value: number | string | boolean;
  threshold: number | string | boolean;
  isAnomalous: boolean;
  weight: number; // Contribution to overall score
}

/** Detection method used */
export type DetectionMethod = 
  | 'signature_based'
  | 'anomaly_based'
  | 'behavioral'
  | 'protocol_analysis'
  | 'ml_model'
  | 'heuristic'
  | 'statistical';

/** DDoS Attack Details */
export interface DDoSDetails {
  attackType: 'volumetric' | 'protocol' | 'application';
  vector: string;
  targetIp: string;
  targetPort?: number;
  peakPps: number; // Packets per second
  peakBps: number; // Bits per second
  peakCps: number; // Connections per second
  durationSeconds: number;
  sourceCount: number; // Number of unique sources
  amplificationFactor?: number;
  reflectedTraffic?: boolean;
}

/** Port Scan Details */
export interface PortScanDetails {
  scanType: 'tcp_syn' | 'tcp_connect' | 'udp' | 'fin' | 'xmas' | 'null' | 'ack';
  scannerIp: string;
  targetIp: string;
  scannedPorts: number[];
  portCount: number;
  scanDurationMs: number;
  rate: number; // Ports per second
  isDistributed: boolean;
  participatingIps?: string[];
}

/** C2 Beaconing Details */
export interface C2BeaconDetails {
  beaconType: 'periodic' | 'jittered' | 'event_driven';
  c2Server: string;
  c2Port: number;
  infectedHost: string;
  intervalSeconds: number;
  jitter: number; // Variance as percentage
  dataSize: number; // Average bytes per beacon
  dataPattern: 'encrypted' | 'encoded' | 'plaintext';
  channel: 'http' | 'dns' | 'https' | 'tcp' | 'udp' | 'icmp';
  totalBeacons: number;
  firstSeen: Date;
  lastSeen: Date;
}

/** DNS Tunneling Details */
export interface DNSTunnelDetails {
  tunnelDomain: string;
  clientIp: string;
  tunnelServerIp?: string;
  queryCount: number;
  avgQueryLength: number;
  maxQueryLength: number;
  uniqueSubdomains: number;
  dataVolumeBytes: number;
  durationMinutes: number;
  encodingType: 'base64' | 'hex' | 'binary' | 'txt' | 'unknown';
  entropyScore: number; // High entropy indicates encoded data
}

/** Lateral Movement Details */
export interface LateralMovementDetails {
  sourceHost: string;
  destHost: string;
  movementTechnique: string;
  protocol: string;
  port: number;
  timestamp: Date;
  credentialsUsed?: string;
  toolsObserved?: string[];
  dataAccessed?: string[];
  pivotHosts?: string[];
}

/** NIDS Configuration */
export interface NIDSConfig {
  // General settings
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Detection thresholds
  ddosThresholds: DDoSThresholds;
  portScanThresholds: PortScanThresholds;
  c2Thresholds: C2Thresholds;
  dnsTunnelThresholds: DNSTunnelThresholds;
  lateralMovementThresholds: LateralMovementThresholds;
  
  // Protocol-specific detection
  enableSS7Detection: boolean;
  enableGTPDetection: boolean;
  enableSIPDetection: boolean;
  enableDiameterDetection: boolean;
  
  // ML model settings
  useMLModels: boolean;
  mlConfidenceThreshold: number;
  
  // Alert settings
  alertSuppressionWindowMs: number;
  maxAlertsPerSecond: number;
}

/** DDoS detection thresholds */
export interface DDoSThresholds {
  ppsThreshold: number; // Packets per second
  bpsThreshold: number; // Bits per second
  cpsThreshold: number; // Connections per second
  burstDurationSeconds: number;
  sourceIpCountThreshold: number;
  amplificationThreshold: number;
}

/** Port scan thresholds */
export interface PortScanThresholds {
  minUniquePorts: number;
  timeWindowMs: number;
  maxScanRate: number; // Ports per second
  distributedThreshold: number; // Min IPs for distributed scan
}

/** C2 detection thresholds */
export interface C2Thresholds {
  minBeaconCount: number;
  maxIntervalVariance: number; // Percentage
  minDataConsistency: number; // Pattern consistency score
  minDurationMinutes: number;
  maxJitter: number; // Percentage
}

/** DNS tunneling thresholds */
export interface DNSTunnelThresholds {
  minAvgQueryLength: number;
  minUniqueSubdomains: number;
  minEntropyScore: number;
  minQueryRatePerMinute: number;
  maxNormalSubdomainLength: number;
}

/** Lateral movement thresholds */
export interface LateralMovementThresholds {
  unusualProtocolWeight: number;
  unusualPortWeight: number;
  afterHoursAccessWeight: number;
  volumeAnomalyWeight: number;
  credentialReuseWeight: number;
  timeWindowMs: number;
}

// ============================================================
// DEFAULT CONFIGURATIONS FOR DJEZZY SOC
// ============================================================

/** Default NIDS configuration for Djezzy */
export const DEFAULT_NIDS_CONFIG: NIDSConfig = {
  enabled: true,
  logLevel: 'info',
  
  ddosThresholds: {
    ppsThreshold: 100000, // 100K pps
    bpsThreshold: 1000000000, // 1 Gbps
    cpsThreshold: 5000, // 5K connections/sec
    burstDurationSeconds: 10,
    sourceIpCountThreshold: 100,
    amplificationThreshold: 5, // 5x amplification
  },
  
  portScanThresholds: {
    minUniquePorts: 20,
    timeWindowMs: 60000, // 60 seconds
    maxScanRate: 100, // ports/second
    distributedThreshold: 5, // 5+ IPs for distributed
  },
  
  c2Thresholds: {
    minBeaconCount: 10,
    maxIntervalVariance: 30, // 30% variance allowed
    minDataConsistency: 0.8,
    minDurationMinutes: 30,
    maxJitter: 50, // 50% jitter threshold
  },
  
  dnsTunnelThresholds: {
    minAvgQueryLength: 40,
    minUniqueSubdomains: 50,
    minEntropyScore: 4.0,
    minQueryRatePerMinute: 10,
    maxNormalSubdomainLength: 25,
  },
  
  lateralMovementThresholds: {
    unusualProtocolWeight: 0.25,
    unusualPortWeight: 0.25,
    afterHoursAccessWeight: 0.15,
    volumeAnomalyWeight: 0.2,
    credentialReuseWeight: 0.15,
    timeWindowMs: 3600000, // 1 hour window
  },
  
  enableSS7Detection: true,
  enableGTPDetection: true,
  enableSIPDetection: true,
  enableDiameterDetection: true,
  
  useMLModels: true,
  mlConfidenceThreshold: 0.7,
  
  alertSuppressionWindowMs: 5000,
  maxAlertsPerSecond: 100,
};

// ============================================================
// MAIN NIDS ENGINE CLASS
// ============================================================

/**
 * Network Intrusion Detection System Engine
 * Main orchestrator for all detection modules
 */
export class NIDSEngine {
  private config: NIDSConfig;
  private ddosDetector: DDoSDetector;
  private portScanDetector: PortScanDetector;
  private c2Detector: C2BeaconDetector;
  private dnsTunnelDetector: DNSTunnelDetector;
  private lateralMovementDetector: LateralMovementDetector;
  private ss7Detector: SS7AttackDetector;
  private gtpDetector: GTPAbuseDetector;
  private sipDetector: SIPFraudDetector;
  private diameterDetector: DiameterAttackDetector;

  // State tracking
  private recentFlows: Map<string, NetworkFlow> = new Map();
  private recentDetections: NIDSDetectionResult[] = [];
  private suppressionCache: Map<string, Date> = new Map();

  constructor(config: NIDSConfig = DEFAULT_NIDS_CONFIG) {
    this.config = config;

    // Initialize detectors
    this.ddosDetector = new DDoSDetector(config.ddosThresholds);
    this.portScanDetector = new PortScanDetector(config.portScanThresholds);
    this.c2Detector = new C2BeaconDetector(config.c2Thresholds);
    this.dnsTunnelDetector = DNSTunnelDetector.getInstance(config.dnsTunnelThresholds);
    this.lateralMovementDetector = new LateralMovementDetector(config.lateralMovementThresholds);
    
    if (config.enableSS7Detection) {
      this.ss7Detector = new SS7AttackDetector();
    }
    if (config.enableGTPDetection) {
      this.gtpDetector = new GTPAbuseDetector();
    }
    if (config.enableSIPDetection) {
      this.sipDetector = new SIPFraudDetector();
    }
    if (config.enableDiameterDetection) {
      this.diameterDetector = new DiameterAttackDetector();
    }
  }

  /**
   * Process a single network flow through all detectors
   */
  processFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    if (!this.config.enabled) return [];

    // Store flow for correlation
    this.recentFlows.set(flow.id, flow);

    // Clean old flows (keep last 10K)
    if (this.recentFlows.size > 10000) {
      const keys = Array.from(this.recentFlows.keys()).slice(0, 5000);
      keys.forEach(k => this.recentFlows.delete(k));
    }

    const detections: NIDSDetectionResult[] = [];

    // Run through each detector
    try {
      // DDoS detection
      const ddosResults = this.ddosDetector.analyzeFlow(flow);
      detections.push(...ddosResults);

      // Port scan detection
      const scanResults = this.portScanDetector.analyzeFlow(flow);
      detections.push(...scanResults);

      // C2 beaconing detection
      const c2Results = this.c2Detector.analyzeFlow(flow);
      detections.push(...c2Results);

      // DNS tunneling detection
      if (flow.protocol === 'dns') {
        const dnsResults = this.dnsTunnelDetector.analyzeFlow(flow);
        detections.push(...dnsResults);
      }

      // Lateral movement detection
      const lmResults = this.lateralMovementDetector.analyzeFlow(flow);
      detections.push(...lmResults);

      // Telecom-specific detection
      if (flow.telecomData) {
        switch (flow.telecomData.protocol) {
          case 'ss7':
            if (this.ss7Detector) {
              detections.push(...this.ss7Detector.analyzeMessage(flow));
            }
            break;
          case 'gtp':
            if (this.gtpDetector) {
              detections.push(...this.gtpDetector.analyzeSession(flow));
            }
            break;
          case 'sip':
            if (this.sipDetector) {
              detections.push(...this.sipDetector.analyzeCall(flow));
            }
            break;
          case 'diameter':
            if (this.diameterDetector) {
              detections.push(...this.diameterDetector.analyzeMessage(flow));
            }
            break;
        }
      }
    } catch (error) {
      console.error('NIDS processing error:', error);
    }

    // Filter by suppression and store results
    const filteredDetections = this.filterAndStoreDetections(detections);
    return filteredDetections;
  }

  /**
   * Process multiple flows in batch
   */
  processBatch(flows: NetworkFlow[]): NIDSDetectionResult[] {
    const allDetections: NIDSDetectionResult[] = [];

    for (const flow of flows) {
      const detections = this.processFlow(flow);
      allDetections.push(...detections);
    }

    return allDetections;
  }

  /**
   * Apply alert suppression and store detections
   */
  private filterAndStoreDetections(detections: NIDSDetectionResult[]): NIDSDetectionResult[] {
    const now = new Date();
    const filtered: NIDSDetectionResult[] = [];
    let alertsThisSecond = 0;

    for (const detection of detections) {
      // Check suppression cache
      const suppressKey = `${detection.threatType}-${detection.flowId}`;
      const lastAlert = this.suppressionCache.get(suppressKey);
      
      if (lastAlert && (now.getTime() - lastAlert.getTime()) < this.config.alertSuppressionWindowMs) {
        continue;
      }

      // Check rate limiting
      if (alertsThisSecond >= this.config.maxAlertsPerSecond) {
        break;
      }

      filtered.push(detection);
      this.suppressionCache.set(suppressKey, now);
      alertsThisSecond++;
    }

    // Store detections
    this.recentDetections.push(...filtered);
    
    // Keep only last 10K detections
    if (this.recentDetections.length > 10000) {
      this.recentDetections = this.recentDetections.slice(-5000);
    }

    return filtered;
  }

  /**
   * Get recent detections
   */
  getRecentDetections(limit: number = 100): NIDSDetectionResult[] {
    return this.recentDetections.slice(-limit);
  }

  /**
   * Get detection statistics
   */
  getStatistics(): NIDSStatistics {
    const stats: Record<ThreatType, number> = {} as any;
    const severityStats: Record<string, number> = {};
    const methodStats: Record<DetectionMethod, number> = {} as any;

    for (const det of this.recentDetections) {
      stats[det.threatType] = (stats[det.threatType] || 0) + 1;
      severityStats[det.severity] = (severityStats[det.severity] || 0) + 1;
      methodStats[det.detectionMethod] = (methodStats[det.detectionMethod] || 0) + 1;
    }

    return {
      totalDetections: this.recentDetections.length,
      flowsProcessed: this.recentFlows.size,
      byThreatType: stats,
      bySeverity: severityStats,
      byDetectionMethod: methodStats,
      timestamp: new Date(),
    };
  }

  /** Update configuration */
  updateConfig(newConfig: Partial<NIDSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /** Get current config */
  getConfig(): NIDSConfig {
    return { ...this.config };
  }
}

/** NIDS Statistics output */
interface NIDSStatistics {
  totalDetections: number;
  flowsProcessed: number;
  byThreatType: Partial<Record<ThreatType, number>>;
  bySeverity: Record<string, number>;
  byDetectionMethod: Partial<Record<DetectionMethod, number>>;
  timestamp: Date;
}

// ============================================================
// DDOS DETECTION MODULE
// ============================================================

/**
 * DDoS Attack Detector
 * Detects volumetric, protocol, and application layer DDoS attacks
 */
export class DDoSDetector {
  private config: DDoSThresholds;
  private trafficHistory: TrafficSample[] = [];
  private activeAttacks: Map<string, DDoSDetails> = new Map();

  constructor(config: DDoSThresholds) {
    this.config = config;
  }

  /**
   * Analyze a flow for DDoS indicators
   */
  analyzeFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const now = new Date();

    // Record traffic sample
    this.recordTrafficSample(flow);

    // Check volumetric DDoS
    const volumetricCheck = this.checkVolumetricDDoS(flow);
    if (volumetricCheck) {
      results.push(volumetricCheck);
    }

    // Check protocol DDoS
    const protocolCheck = this.checkProtocolDDoS(flow);
    if (protocolCheck) {
      results.push(protocolCheck);
    }

    // Check for SYN flood
    const synFloodCheck = this.checkSYNFlood(flow);
    if (synFloodCheck) {
      results.push(synFloodCheck);
    }

    // Check for amplification attacks
    const ampCheck = this.checkAmplificationAttack(flow);
    if (ampCheck) {
      results.push(ampCheck);
    }

    return results;
  }

  /**
   * Record traffic sample for baseline
   */
  private recordTrafficSample(flow: NetworkFlow): void {
    this.trafficHistory.push({
      timestamp: flow.timestamp,
      destIp: flow.destIp,
      destPort: flow.destPort,
      packets: flow.packetsIn + flow.packetsOut,
      bytes: flow.bytesIn + flow.bytesOut,
      sourceIp: flow.sourceIp,
    });

    // Keep last hour of samples
    const cutoff = Date.now() - 3600000;
    this.trafficHistory = this.trafficHistory.filter(s => s.timestamp.getTime() > cutoff);
  }

  /**
   * Check for volumetric DDoS
   */
  private checkVolumetricDDoS(flow: NetworkFlow): NIDSDetectionResult | null {
    // Aggregate traffic to destination
    const recentSamples = this.trafficHistory.filter(
      s => s.destIp === flow.destIp && 
           s.timestamp.getTime() > Date.now() - this.config.burstDurationSeconds * 1000
    );

    if (recentSamples.length === 0) return null;

    const totalPackets = recentSamples.reduce((sum, s) => sum + s.packets, 0);
    const totalBytes = recentSamples.reduce((sum, s) => sum + s.bytes, 0);
    const uniqueSources = new Set(recentSamples.map(s => s.sourceIp)).size;
    const pps = totalPackets / this.config.burstDurationSeconds;
    const bps = (totalBytes * 8) / this.config.burstDurationSeconds;

    if (pps > this.config.ppsThreshold || bps > this.config.bpsThreshold) {
      return {
        id: `ddos-vol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'ddos_volumetric',
        severity: pps > this.config.ppsThreshold * 10 ? 'critical' : 'high',
        confidence: Math.min(100, (pps / this.config.ppsThreshold) * 50),
        title: `Volumetric DDoS Attack Detected`,
        description: `High traffic volume detected targeting ${flow.destIp}: ${this.formatBps(bps)}, ${pps} pps from ${uniqueSources} sources`,
        indicators: [
          { name: 'packets_per_second', value: pps, threshold: this.config.ppsThreshold, isAnomalous: true, weight: 0.4 },
          { name: 'bits_per_second', value: bps, threshold: this.config.bpsThreshold, isAnomalous: true, weight: 0.4 },
          { name: 'unique_sources', value: uniqueSources, threshold: this.config.sourceIpCountThreshold, isAnomalous: true, weight: 0.2 },
        ],
        mitreTechnique: 'T1498',
        mitreTactic: 'Impact',
        recommendedActions: [
          'Activate DDoS mitigation service',
          'Consider blackholing or sinkholing traffic',
          'Contact upstream ISP for assistance',
          'Verify legitimate traffic patterns',
        ],
        detectionMethod: 'anomaly_based',
      };
    }

    return null;
  }

  /**
   * Check for protocol-based DDoS
   */
  private checkProtocolDDoS(flow: NetworkFlow): NIDSDetectionResult | null {
    // Check for protocol abuse patterns
    const protocolIndicators: Array<{ check: () => boolean; description: string }> = [
      {
        check: () => flow.protocol === 'icmp' && flow.packetsIn > 1000,
        description: 'ICMP flood detected',
      },
      {
        check: () => flow.tcpFlags?.syn && !flow.tcpFlags?.ack && flow.packetsIn > 500,
        description: 'SYN flood pattern observed',
      },
      {
        check: () => flow.protocol === 'dns' && flow.bytesOut > flow.bytesIn * 5,
        description: 'DNS amplification potential',
      },
      {
        check: () => flow.protocol === 'ntp' || flow.protocol === 'snmp',
        description: 'Potential NTP/SNMP amplification',
      },
    ];

    for (const indicator of protocolIndicators) {
      if (indicator.check()) {
        return {
          id: `ddos-proto-${Date.now()}`,
          timestamp: new Date(),
          flowId: flow.id,
          threatType: 'ddos_protocol',
          severity: 'high',
          confidence: 75,
          title: 'Protocol-Based DDoS Attack',
          description: indicator.description,
          indicators: [
            { name: 'protocol', value: flow.protocol, threshold: 'normal', isAnomalous: true, weight: 1 },
          ],
          mitreTechnique: 'T1498',
          mitreTactic: 'Impact',
          recommendedActions: [
            'Implement protocol-specific rate limiting',
            'Deploy protocol anomaly detection rules',
            'Consider filtering suspicious protocol traffic',
          ],
          detectionMethod: 'heuristic',
        };
      }
    }

    return null;
  }

  /**
   * Check for SYN flood specifically
   */
  private checkSYNFlood(flow: NetworkFlow): NIDSDetectionResult | null {
    if (!flow.tcpFlags?.syn || flow.tcpFlags.ack) return null;

    // Count recent SYN packets without ACK from same source
    const synPackets = this.trafficHistory.filter(
      s => s.sourceIp === flow.sourceIp &&
           s.timestamp.getTime() > Date.now() - 10000 // Last 10 seconds
    ).length;

    if (synPackets > 100) {
      return {
        id: `synflood-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'ddos_protocol',
        severity: 'high',
        confidence: Math.min(95, 50 + synPackets),
        title: 'SYN Flood Attack Detected',
        description: `SYN flood from ${flow.sourceIp}: ${synPackets} SYN packets in 10 seconds`,
        indicators: [
          { name: 'syn_rate', value: synPackets, threshold: 100, isAnomalous: true, weight: 1 },
        ],
        mitreTechnique: 'T1499',
        mitreTactic: 'Impact',
        recommendedActions: [
          'Enable SYN cookies on affected servers',
          'Increase backlog queue',
          'Deploy SYN proxy or firewall',
          'Consider rate limiting per source IP',
        ],
        detectionMethod: 'signature_based',
      };
    }

    return null;
  }

  /**
   * Check for amplification attacks
   */
  private checkAmplificationAttack(flow: NetworkFlow): NIDSDetectionResult | null {
    // Amplification: small request -> large response
    const ratio = flow.bytesOut / (flow.bytesIn || 1);

    if (ratio > this.config.amplificationThreshold && flow.bytesOut > 10000) {
      const ampVectors: Record<string, string> = {
        'dns': 'DNS Amplification (port 53)',
        'ntp': 'NTP Amplification (port 123)',
        'snmp': 'SNMP Amplification (port 161)',
        'ssdp': 'SSDP Amplification (port 1900)',
        'ldap': 'LDAP Amplification (port 389)',
      };

      return {
        id: `amplification-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'ddos_volumetric',
        severity: 'high',
        confidence: Math.min(90, ratio * 10),
        title: 'Amplification Attack Detected',
        description: `${ampVectors[flow.protocol] || 'Unknown'} with ${ratio.toFixed(1)}x amplification factor`,
        indicators: [
          { name: 'amplification_factor', value: ratio, threshold: this.config.amplificationThreshold, isAnomalous: true, weight: 0.6 },
          { name: 'response_bytes', value: flow.bytesOut, threshold: 10000, isAnomalous: true, weight: 0.4 },
        ],
        mitreTechnique: 'T1498',
        mitreTactic: 'Impact',
        recommendedActions: [
          'Block or rate-limit amplifiable protocols at edge',
          'Implement BCP38 (source address validation)',
          'Disable recursion on public DNS servers',
        ],
        detectionMethod: 'heuristic',
      };
    }

    return null;
  }

  /** Format bits per second for display */
  private formatBps(bps: number): string {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(2)} Kbps`;
    return `${bps.toFixed(0)} bps`;
  }

  /** Get active DDoS attacks */
  getActiveAttacks(): DDoSDetails[] {
    return Array.from(this.activeAttacks.values());
  }
}

/** Traffic sample for history */
interface TrafficSample {
  timestamp: Date;
  destIp: string;
  destPort: number;
  packets: number;
  bytes: number;
  sourceIp: string;
}

// ============================================================
// PORT SCAN DETECTION MODULE
// ============================================================

/**
 * Port Scan Detector
 * Detects various types of port scanning activity
 */
export class PortScanDetector {
  private config: PortScanThresholds;
  private scanTracker: Map<string, ScanTracker> = new Map();

  constructor(config: PortScanThresholds) {
    this.config = config;
  }

  /**
   * Analyze a flow for port scanning indicators
   */
  analyzeFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const trackerKey = `${flow.sourceIp}->${flow.destIp}`;

    // Get or create tracker
    let tracker = this.scanTracker.get(trackerKey);
    if (!tracker) {
      tracker = {
        sourceIp: flow.sourceIp,
        targetIp: flow.destIp,
        scannedPorts: [],
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
        connectionAttempts: 0,
      };
      this.scanTracker.set(trackerKey, tracker);
    }

    // Track connection attempts
    if (flow.flowState === 'syn_sent' || flow.flowState === 'reset') {
      tracker.connectionAttempts++;
      if (!tracker.scannedPorts.includes(flow.destPort)) {
        tracker.scannedPorts.push(flow.destPort);
      }
      tracker.lastSeen = flow.timestamp;
    }

    // Check if scan criteria met
    const scanDuration = tracker.lastSeen.getTime() - tracker.firstSeen.getTime();
    const scanRate = tracker.connectionAttempts / (scanDuration / 1000); // connections per second

    if (
      tracker.scannedPorts.length >= this.config.minUniquePorts &&
      scanDuration <= this.config.timeWindowMs &&
      scanRate <= this.config.maxScanRate * 10 // Allow some variance
    ) {
      // Determine scan type
      const scanType = this.determineScanType(flow);
      
      results.push({
        id: `portscan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'port_scan',
        severity: tracker.scannedPorts.length > 100 ? 'high' : 'medium',
        confidence: Math.min(95, 50 + tracker.scannedPorts.length),
        title: `${scanType.replace('_', ' ').toUpperCase()} Port Scan Detected`,
        description: `Port scan from ${flow.sourceIp} targeting ${flow.destIp}: ${tracker.scannedPorts.length} ports scanned in ${scanDuration}ms`,
        indicators: [
          { name: 'ports_scanned', value: tracker.scannedPorts.length, threshold: this.config.minUniquePorts, isAnomalous: true, weight: 0.4 },
          { name: 'scan_duration_ms', value: scanDuration, threshold: this.config.timeWindowMs, isAnomalous: false, weight: 0.2 },
          { name: 'connection_attempts', value: tracker.connectionAttempts, threshold: this.config.minUniquePorts, isAnomalous: true, weight: 0.3 },
          { name: 'scan_type', value: scanType, threshold: 'none', isAnomalous: true, weight: 0.1 },
        ],
        mitreTechnique: 'T1046',
        mitreTactic: 'Reconnaissance',
        recommendedActions: [
          'Block scanning IP at firewall',
          'Add to threat intelligence blocklist',
          'Investigate if internal host was compromised',
          'Review exposed services on target host',
        ],
        detectionMethod: 'behavioral',
      });
    }

    // Clean old trackers
    this.cleanOldTrackers();

    return results;
  }

  /**
   * Determine type of port scan based on flags
   */
  private determineScanType(flow: NetworkFlow): string {
    if (!flow.tcpFlags) return 'tcp_connect';

    if (flow.tcpFlags.syn && !flow.tcpFlags.ack) return 'tcp_syn';
    if (flow.tcpFlags.fin && !flow.tcpFlags.syn && !flow.tcpFlags.ack) return 'fin';
    if (flow.tcpFlags.fin && flow.tcpFlags.psh && flow.tcpFlags.urg) return 'xmas';
    if (!flow.tcpFlags.syn && !flow.tcpFlags.fin && !flow.tcpFlags.ack && !flow.tcpFlags.rst) return 'null';
    if (flow.tcpFlags.ack) return 'ack';
    
    return 'tcp_connect';
  }

  /**
   * Clean old scan trackers
   */
  private cleanOldTrackers(): void {
    const cutoff = Date.now() - this.config.timeWindowMs * 3;
    for (const [key, tracker] of this.scanTracker) {
      if (tracker.lastSeen.getTime() < cutoff) {
        this.scanTracker.delete(key);
      }
    }
  }

  /** Get active scan trackers */
  getActiveScans(): ScanTracker[] {
    return Array.from(this.scanTracker.values());
  }
}

/** Scan tracker state */
interface ScanTracker {
  sourceIp: string;
  targetIp: string;
  scannedPorts: number[];
  firstSeen: Date;
  lastSeen: Date;
  connectionAttempts: number;
}

// ============================================================
// C2 BEACONING DETECTION MODULE
// ============================================================

/**
 * Command & Control Beaconing Detector
 * Detects periodic communication patterns indicative of C2
 */
export class C2BeaconDetector {
  private config: C2Thresholds;
  private connectionTrackers: Map<string, ConnectionTracker> = new Map();

  constructor(config: C2Thresholds) {
    this.config = config;
  }

  /**
   * Analyze a flow for C2 beaconing patterns
   */
  analyzeFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    
    // Only analyze outbound connections to external hosts
    if (!this.isExternalIp(flow.destIp)) return results;

    const trackerKey = `${flow.sourceIp}->${flow.destIp}:${flow.destPort}`;
    
    // Get or create tracker
    let tracker = this.connectionTrackers.get(trackerKey);
    if (!tracker) {
      tracker = {
        sourceIp: flow.sourceIp,
        destIp: flow.destIp,
        destPort: flow.destPort,
        connections: [],
        totalBytes: 0,
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
      };
      this.connectionTrackers.set(trackerKey, tracker);
    }

    // Record connection
    tracker.connections.push({
      timestamp: flow.timestamp,
      bytesIn: flow.bytesIn,
      bytesOut: flow.bytesOut,
      duration: flow.durationMs,
    });
    tracker.totalBytes += flow.bytesIn + flow.bytesOut;
    tracker.lastSeen = flow.timestamp;

    // Check for beaconing pattern after minimum connections
    if (tracker.connections.length >= this.config.minBeaconCount) {
      const beaconAnalysis = this.analyzeBeaconPattern(tracker);
      
      if (beaconAnalysis.isBeacon) {
        results.push({
          id: `c2-beacon-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(),
          flowId: flow.id,
          threatType: 'c2_beaconing',
          severity: 'high',
          confidence: beaconAnalysis.confidence,
          title: 'C2 Beaconing Activity Detected',
          description: `Potential command & control beaconing from ${flow.sourceIp} to ${flow.destIp}:${flow.destPort}. ${beaconAnalysis.description}`,
          indicators: beaconAnalysis.indicators,
          mitreTechnique: 'T1071',
          mitreTactic: 'Command and Control',
          recommendedActions: [
            'Isolate suspected compromised host',
            'Block C2 server IP/domain',
            'Perform forensic analysis on endpoint',
            'Check for malware persistence mechanisms',
            'Review network logs for data exfiltration',
          ],
          detectionMethod: 'behavioral',
        });
      }
    }

    // Clean old trackers
    this.cleanOldTrackers();

    return results;
  }

  /**
   * Analyze connection pattern for beaconing behavior
   */
  private analyzeBeaconPattern(tracker: ConnectionTracker): {
    isBeacon: boolean;
    confidence: number;
    description: string;
    indicators: DetectionIndicator[];
  } {
    const conns = tracker.connections;
    const indicators: DetectionIndicator[] = [];

    // Calculate intervals between connections
    const intervals: number[] = [];
    for (let i = 1; i < conns.length; i++) {
      intervals.push(conns[i].timestamp.getTime() - conns[i - 1].timestamp.getTime());
    }

    if (intervals.length < this.config.minBeaconCount - 1) {
      return { isBeacon: false, confidence: 0, description: 'Insufficient data', indicators: [] };
    }

    // Calculate statistics
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - meanInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / meanInterval; // Coefficient of variation (lower = more regular)

    // Calculate data consistency
    const sizes = conns.map(c => c.bytesIn + c.bytesOut);
    const meanSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const sizeVariance = sizes.reduce((sum, s) => sum + Math.pow(s - meanSize, 2), 0) / sizes.length;
    const sizeCV = Math.sqrt(sizeVariance) / meanSize;

    // Scoring
    let beaconScore = 0;
    let reasons: string[] = [];

    // Regular intervals (low CV indicates periodic behavior)
    if (cv < 0.3) {
      beaconScore += 35;
      reasons.push('Highly regular intervals');
      indicators.push({ name: 'interval_cv', value: cv, threshold: 0.3, isAnomalous: true, weight: 0.25 });
    } else if (cv < 0.5) {
      beaconScore += 20;
      reasons.push('Moderately regular intervals');
      indicators.push({ name: 'interval_cv', value: cv, threshold: 0.5, isAnomalous: true, weight: 0.15 });
    }

    // Consistent data sizes
    if (sizeCV < 0.4) {
      beaconScore += 25;
      reasons.push('Consistent data transfer sizes');
      indicators.push({ name: 'size_consistency', value: sizeCV, threshold: 0.4, isAnomalous: true, weight: 0.2 });
    }

    // Duration analysis
    const durations = conns.map(c => c.duration).filter(d => d > 0);
    if (durations.length > 0) {
      const meanDur = durations.reduce((a, b) => a + b, 0) / durations.length;
      if (meanDur < 5000) { // Short connections typical of beacons
        beaconScore += 15;
        reasons.push('Short connection durations');
        indicators.push({ name: 'avg_duration_ms', value: meanDur, threshold: 5000, isAnomalous: true, weight: 0.15 });
      }
    }

    // Time-based analysis (after hours activity)
    const afterHoursCount = conns.filter(c => {
      const hour = c.timestamp.getHours();
      return hour < 6 || hour > 22;
    }).length;
    
    if (afterHoursCount > conns.length * 0.5) {
      beaconScore += 10;
      reasons.push('Predominantly after-hours activity');
      indicators.push({ name: 'after_hours_ratio', value: afterHoursCount / conns.length, threshold: 0.5, isAnomalous: true, weight: 0.1 });
    }

    // Determine if beaconing
    const isBeacon = beaconScore > 50 && conns.length >= this.config.minBeaconCount;
    const confidence = Math.min(95, beaconScore);

    return {
      isBeacon,
      confidence,
      description: reasons.join('; ') || 'Suspicious communication pattern',
      indicators,
    };
  }

  /**
   * Check if IP is external (not private/RFC1918)
   */
  private isExternalIp(ip: string): boolean {
    return !ip.startsWith('10.') &&
           !ip.startsWith('192.168.') &&
           !/^172\.(1[6-9]|2\d|3[01])\./.test(ip) &&
           ip !== '127.0.0.1' &&
           ip !== '::1';
  }

  /**
   * Clean old trackers
   */
  private cleanOldTrackers(): void {
    const cutoff = Date.now() - 86400000; // 24 hours
    for (const [key, tracker] of this.connectionTrackers) {
      if (tracker.lastSeen.getTime() < cutoff) {
        this.connectionTrackers.delete(key);
      }
    }
  }

  /** Get active C2 suspects */
  getActiveSuspects(): C2BeaconDetails[] {
    const results: C2BeaconDetails[] = [];
    
    for (const [_, tracker] of this.connectionTrackers) {
      if (tracker.connections.length >= this.config.minBeaconCount) {
        const analysis = this.analyzeBeaconPattern(tracker);
        if (analysis.isBeacon) {
          const intervals: number[] = [];
          for (let i = 1; i < tracker.connections.length; i++) {
            intervals.push(tracker.connections[i].timestamp.getTime() - tracker.connections[i-1].timestamp.getTime());
          }
          
          results.push({
            beaconType: 'periodic',
            c2Server: tracker.destIp,
            c2Port: tracker.destPort,
            infectedHost: tracker.sourceIp,
            intervalSeconds: (intervals.reduce((a,b) => a+b, 0) / intervals.length) / 1000,
            jitter: 0,
            dataSize: tracker.totalBytes / tracker.connections.length,
            dataPattern: 'unknown',
            channel: 'tcp',
            totalBeacons: tracker.connections.length,
            firstSeen: tracker.firstSeen,
            lastSeen: tracker.lastSeen,
          });
        }
      }
    }
    
    return results;
  }
}

/** Connection tracker for C2 detection */
interface ConnectionTracker {
  sourceIp: string;
  destIp: string;
  destPort: number;
  connections: Array<{
    timestamp: Date;
    bytesIn: number;
    bytesOut: number;
    duration: number;
  }>;
  totalBytes: number;
  firstSeen: Date;
  lastSeen: Date;
}

// ============================================================
// DNS TUNNELING DETECTION MODULE
// ============================================================

/**
 * DNS Tunneling Detector (Singleton)
 * Detects data exfiltration via DNS queries
 */
export class DNSTunnelDetector {
  private static instance: DNSTunnelDetector;
  private config: DNSTunnelThresholds;
  private domainTrackers: Map<string, DomainTracker> = new Map();

  private constructor(config: DNSTunnelThresholds) {
    this.config = config;
  }

  static getInstance(config: DNSTunnelThresholds): DNSTunnelDetector {
    if (!DNSTunnelDetector.instance) {
      DNSTunnelDetector.instance = new DNSTunnelDetector(config);
    }
    return DNSTunnelDetector.instance;
  }

  /**
   * Analyze a DNS flow for tunneling indicators
   */
  analyzeFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    
    if (flow.protocol !== 'dns') return results;

    // Extract domain from payload or metadata
    const domain = this.extractDomain(flow);
    if (!domain) return results;

    // Get or create tracker
    const clientKey = `${flow.sourceIp}-${domain}`;
    let tracker = this.domainTrackers.get(clientKey);
    if (!tracker) {
      tracker = {
        domain,
        clientIp: flow.sourceIp,
        queries: [],
        subdomains: new Set(),
        totalBytes: 0,
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
      };
      this.domainTrackers.set(clientKey, tracker);
    }

    // Extract subdomain and record query
    const subdomain = this.extractSubdomain(domain, flow.payloadSample);
    if (subdomain) {
      tracker.subdomains.add(subdomain);
    }
    tracker.queries.push({
      timestamp: flow.timestamp,
      queryLength: flow.payloadSample?.length ?? 0,
      bytes: flow.bytesIn + flow.bytesOut,
    });
    tracker.totalBytes += flow.bytesIn + flow.bytesOut;
    tracker.lastSeen = flow.timestamp;

    // Check for tunneling after sufficient data
    if (tracker.queries.length >= 10) {
      const tunnelAnalysis = this.analyzeTunneling(tracker);
      
      if (tunnelAnalysis.isTunneling) {
        results.push({
          id: `dns-tunnel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(),
          flowId: flow.id,
          threatType: 'dns_tunneling',
          severity: 'high',
          confidence: tunnelAnalysis.confidence,
          title: 'DNS Tunneling Activity Detected',
          description: `Potential DNS tunneling from ${flow.sourceIp} to domain ${domain}. ${tunnelAnalysis.reasons.join('; ')}`,
          indicators: tunnelAnalysis.indicators,
          mitreTechnique: 'T1048',
          mitreTactic: 'Exfiltration',
          recommendedActions: [
            'Block suspicious domain at DNS resolver',
            'Isolate affected host for investigation',
            'Enable DNS logging and monitoring',
            'Consider implementing DNSSEC',
            'Review endpoint for malware',
          ],
          detectionMethod: 'ml_model',
        });
      }
    }

    return results;
  }

  /**
   * Extract base domain from flow
   */
  private extractDomain(flow: NetworkFlow): string | null {
    // Try to extract from various sources
    if (flow.destIp) {
      // Could do reverse lookup, but for now just note we need it
    }
    
    if (flow.payloadSample) {
      // Try to extract domain from DNS query
      const domainMatch = flow.payloadSample.match(/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}$/);
      if (domainMatch) {
        return domainMatch[0].toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Extract subdomain from query
   */
  private extractSubdomain(baseDomain: string, query?: string): string | null {
    if (!query) return null;
    
    const lowerQuery = query.toLowerCase();
    const lowerBase = baseDomain.toLowerCase();
    
    if (lowerQuery.endsWith(lowerBase) && lowerQuery.length > lowerBase.length) {
      return lowerQuery.substring(0, lowerQuery.length - lowerBase.length - 1);
    }
    
    return null;
  }

  /**
   * Analyze domain for tunneling behavior
   */
  private analyzeTunneling(tracker: DomainTracker): {
    isTunneling: boolean;
    confidence: number;
    reasons: string[];
    indicators: DetectionIndicator[];
  } {
    const indicators: DetectionIndicator[] = [];
    const reasons: string[] = [];
    let tunnelScore = 0;

    // Average query length
    const avgLength = tracker.queries.reduce((sum, q) => sum + q.queryLength, 0) / tracker.queries.length;
    if (avgLength > this.config.minAvgQueryLength) {
      tunnelScore += 25;
      reasons.push(`Long average query length (${avgLength.toFixed(1)} chars)`);
      indicators.push({ name: 'avg_query_length', value: avgLength, threshold: this.config.minAvgQueryLength, isAnomalous: true, weight: 0.25 });
    }

    // Unique subdomain count
    const uniqueSubdomains = tracker.subdomains.size;
    if (uniqueSubdomains > this.config.minUniqueSubdomains) {
      tunnelScore += 25;
      reasons.push(`Many unique subdomains (${uniqueSubdomains})`);
      indicators.push({ name: 'unique_subdomains', value: uniqueSubdomains, threshold: this.config.minUniqueSubdomains, isAnomalous: true, weight: 0.25 });
    }

    // Entropy calculation (high entropy = likely encoded data)
    const allQueries = tracker.queries.map(q => q.queryLength.toString()).join('');
    const entropy = this.calculateEntropy(allQueries);
    if (entropy > this.config.minEntropyScore) {
      tunnelScore += 25;
      reasons.push(`High entropy in queries (${entropy.toFixed(2)})`);
      indicators.push({ name: 'entropy_score', value: entropy, threshold: this.config.minEntropyScore, isAnomalous: true, weight: 0.25 });
    }

    // Query rate
    const durationMin = (tracker.lastSeen.getTime() - tracker.firstSeen.getTime()) / 60000;
    const queryRate = tracker.queries.length / (durationMin || 1);
    if (queryRate > this.config.minQueryRatePerMinute) {
      tunnelScore += 15;
      reasons.push(`High query rate (${queryRate.toFixed(1)}/min)`);
      indicators.push({ name: 'query_rate_per_min', value: queryRate, threshold: this.config.minQueryRatePerMinute, isAnomalous: true, width: 0.15 });
    }

    // Data volume
    if (tracker.totalBytes > 1024 * 1024) { // > 1MB via DNS is suspicious
      tunnelScore += 10;
      reasons.push(`Large data volume via DNS (${(tracker.totalBytes / 1024).toFixed(1)} KB)`);
    }

    const isTunneling = tunnelScore > 50;
    const confidence = Math.min(95, tunnelScore);

    return { isTunneling, confidence, reasons, indicators };
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /** Get active tunneling suspects */
  getActiveSuspects(): DNSTunnelDetails[] {
    const results: DNSTunnelDetails[] = [];
    
    for (const [_, tracker] of this.domainTrackers) {
      if (tracker.queries.length >= 10) {
        const analysis = this.analyzeTunneling(tracker);
        if (analysis.isTunneling) {
          results.push({
            tunnelDomain: tracker.domain,
            clientIp: tracker.clientIp,
            queryCount: tracker.queries.length,
            avgQueryLength: tracker.queries.reduce((sum, q) => sum + q.queryLength, 0) / tracker.queries.length,
            maxQueryLength: Math.max(...tracker.queries.map(q => q.queryLength)),
            uniqueSubdomains: tracker.subdomains.size,
            dataVolumeBytes: tracker.totalBytes,
            durationMinutes: (tracker.lastSeen.getTime() - tracker.firstSeen.getTime()) / 60000,
            encodingType: 'unknown',
            entropyScore: this.calculateEntropy(Array.from(tracker.subdomains).join('')),
          });
        }
      }
    }
    
    return results;
  }
}

/** Domain tracker for DNS tunneling detection */
interface DomainTracker {
  domain: string;
  clientIp: string;
  queries: Array<{ timestamp: Date; queryLength: number; bytes: number }>;
  subdomains: Set<string>;
  totalBytes: number;
  firstSeen: Date;
  lastSeen: Date;
}

// ============================================================
// LATERAL MOVEMENT DETECTION MODULE
// ============================================================

/**
 * Lateral Movement Detector
 * Identifies suspicious east-west traffic patterns
 */
export class LateralMovementDetector {
  private config: LateralMovementThresholds;
  private hostProfiles: Map<string, HostProfile> = new Map();

  constructor(config: LateralMovementThresholds) {
    this.config = config;
  }

  /**
   * Analyze a flow for lateral movement indicators
   */
  analyzeFlow(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    
    // Focus on internal-to-internal traffic
    if (!this.isInternalIp(flow.sourceIp) || !this.isInternalIp(flow.destIp)) {
      return results;
    }

    // Skip if same host talking to itself
    if (flow.sourceIp === flow.destIp) return results;

    // Update host profiles
    this.updateHostProfile(flow.sourceIp, flow);
    this.updateHostProfile(flow.destIp, flow);

    // Score the connection
    const score = this.scoreConnection(flow);
    
    if (score > 70) {
      results.push({
        id: `lateral-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'lateral_movement',
        severity: score > 85 ? 'high' : 'medium',
        confidence: score,
        title: 'Lateral Movement Activity Detected',
        description: `Suspicious lateral movement from ${flow.sourceIp} to ${flow.destIp}:${flow.destPort}/${flow.protocol}`,
        indicators: this.getConnectionIndicators(flow),
        mitreTechnique: 'T1021',
        mitreTactic: 'Lateral Movement',
        recommendedActions: [
          'Investigate both source and destination hosts',
          'Check for compromised credentials',
          'Review authentication logs',
          'Segment network to limit lateral movement',
          'Enable enhanced logging on affected hosts',
        ],
        detectionMethod: 'behavioral',
      });
    }

    return results;
  }

  /**
   * Update profile for a host
   */
  private updateHostProfile(hostIp: string, flow: NetworkFlow): void {
    let profile = this.hostProfiles.get(hostIp);
    if (!profile) {
      profile = {
        ip: hostIp,
        connections: new Map(),
        protocols: new Map(),
        ports: new Set(),
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
        totalConnections: 0,
      };
      this.hostProfiles.set(hostIp, profile);
    }

    const destKey = `${flow.destIp}:${flow.destPort}`;
    profile.connections.set(destKey, (profile.connections.get(destKey) || 0) + 1);
    profile.protocols.set(flow.protocol, (profile.protocols.get(flow.protocol) || 0) + 1);
    profile.ports.add(flow.destPort);
    profile.totalConnections++;
    profile.lastSeen = flow.timestamp;
  }

  /**
   * Score a connection for lateral movement likelihood
   */
  private scoreConnection(flow: NetworkFlow): number {
    let score = 0;
    const srcProfile = this.hostProfiles.get(flow.sourceIp);
    const dstProfile = this.hostProfiles.get(flow.destIp);

    // Unusual protocol
    const commonProtocols = ['tcp', 'udp', 'http', 'https', 'dns'];
    if (!commonProtocols.includes(flow.protocol)) {
      score += 25 * this.config.unusualProtocolWeight * 100;
    }

    // Unusual port
    const commonPorts = [22, 80, 443, 445, 3389, 8080, 8443];
    if (!commonPorts.includes(flow.destPort)) {
      score += 20 * this.config.unusualPortWeight * 100;
    }

    // After-hours access
    const hour = flow.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      score += 15 * this.config.afterHoursAccessWeight * 100;
    }

    // Volume anomaly (large transfer)
    const totalBytes = flow.bytesIn + flow.bytesOut;
    if (totalBytes > 10 * 1024 * 1024) { // > 10MB
      score += 20 * this.config.volumeAnomalyWeight * 100;
    }

    // New connection (first time seeing this pair)
    if (srcProfile) {
      const destKey = `${flow.destIp}:${flow.destPort}`;
      const prevConnections = srcProfile.connections.get(destKey) || 0;
      if (prevConnections <= 1) {
        score += 15 * this.config.credentialReuseWeight * 100;
      }
    }

    // Admin protocols to non-admin hosts
    const adminProtocols = ['rdp', 'winrm', 'wmi', 'ssh'];
    if (adminProtocols.includes(flow.application?.toLowerCase() || '')) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Generate indicators for the connection
   */
  private getConnectionIndicators(flow: NetworkFlow): DetectionIndicator[] {
    return [
      { name: 'protocol', value: flow.protocol, threshold: 'common', isAnomalous: !['tcp', 'udp', 'http', 'https'].includes(flow.protocol), weight: 0.2 },
      { name: 'destination_port', value: flow.destPort, threshold: 'common', isAnomalous: ![22, 80, 443, 445, 3389].includes(flow.destPort), weight: 0.2 },
      { name: 'hour_of_day', value: flow.timestamp.getHours(), threshold: 'business_hours', isAnomalous: flow.timestamp.getHours() < 6 || flow.timestamp.getHours() > 22, weight: 0.15 },
      { name: 'total_bytes', value: flow.bytesIn + flow.bytesOut, threshold: 10485760, isAnomalous: (flow.bytesIn + flow.bytesOut) > 10485760, weight: 0.2 },
      { name: 'application', value: flow.application || 'unknown', threshold: 'known', isAnomalous: !flow.application, weight: 0.15 },
    ];
  }

  /**
   * Check if IP is internal
   */
  private isInternalIp(ip: string): boolean {
    return ip.startsWith('10.') ||
           ip.startsWith('192.168.') ||
           /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  }

  /** Get host profiles */
  getHostProfiles(): HostProfile[] {
    return Array.from(this.hostProfiles.values());
  }
}

/** Host profile for lateral movement detection */
interface HostProfile {
  ip: string;
  connections: Map<string, number>;
  protocols: Map<string, number>;
  ports: Set<number>;
  firstSeen: Date;
  lastSeen: Date;
  totalConnections: number;
}

// ============================================================
// TELECOM-SPECIFIC ATTACK DETECTORS
// ============================================================

/**
 * SS7 Attack Detector
 * Detects signaling system 7 attacks specific to telecom
 */
export class SS7AttackDetector {
  private knownAttackPatterns: SS7AttackPattern[] = [
    {
      name: 'Subscriber Tracking',
      mapOperations: ['sendRoutingInfo', 'provideSubscriberInfo'],
      riskLevel: 'high',
      indicators: ['unusual_global_title', 'foreign_opc', 'multiple_queries_same_target'],
    },
    {
      name: 'SMS Interception',
      mapOperations: ['forwardShortMessage', 'mt-forwardShortMessage'],
      riskLevel: 'critical',
      indicators: ['sms_divert_unauthorized', 'unusual_forwarding_setup'],
    },
    {
      name: 'Location Tracking',
      mapOperations: ['provideSubscriberLocation', 'anyTimeInterrogation'],
      riskLevel: 'high',
      indicators: ['location_query_burst', 'cross_border_location_request'],
    },
    {
      name: 'IMSI Catcher Detection',
      isupPatterns: ['IAM_with_unusual_params'],
      riskLevel: 'critical',
      indicators: ['fake_base_station', 'identity_request_burst'],
    },
  ];

  /**
   * Analyze an SS7 message for attack patterns
   */
  analyzeMessage(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const ss7Data = flow.telecomData?.ss7Data;
    
    if (!ss7Data) return results;

    // Check against known attack patterns
    for (const pattern of this.knownAttackPatterns) {
      if (pattern.mapOperations?.includes(ss7Data.mapOperation || '')) {
        const riskIndicators = this.evaluateSS7Indicators(ss7Data, pattern.indicators);
        
        if (riskIndicators.length > 0) {
          results.push({
            id: `ss7-${pattern.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            timestamp: new Date(),
            flowId: flow.id,
            threatType: pattern.name.includes('Tracking') ? 'ss7_tracking' :
                       pattern.name.includes('Interception') ? 'ss7_interception' : 'ss7_fraud',
            severity: pattern.riskLevel as any,
            confidence: Math.min(95, 50 + riskIndicators.length * 15),
            title: `SS7 Attack: ${pattern.name}`,
            description: `Potential SS7 ${pattern.name} attack detected from OPC ${ss7Data.opc} to DPC ${ss7Data.dpc}`,
            indicators: riskIndicators,
            mitreTechnique: 'TELECOM-T1',
            mitreTactic: 'Collection',
            recommendedActions: [
              'Verify SS7 firewall rules',
              'Check for unauthorized MAP operations',
              'Review roaming partner agreements',
              'Notify affected subscriber if applicable',
              'Escalate to security team',
            ],
            detectionMethod: 'protocol_analysis',
          });
        }
      }
    }

    // Additional checks
    results.push(...this.checkSS7Anomalies(flow, ss7Data));

    return results;
  }

  /**
   * Evaluate SS7-specific indicators
   */
  private evaluateSS7Indicators(data: SS7MessageData, indicators: string[]): DetectionIndicator[] {
    const found: DetectionIndicator[] = [];

    for (const indicator of indicators) {
      switch (indicator) {
        case 'unusual_global_title':
          if (data.globalTitle && this.isUnusualGT(data.globalTitle)) {
            found.push({ name: indicator, value: data.globalTitle, threshold: 'normal_gt', isAnomalous: true, weight: 0.3 });
          }
          break;
        case 'foreign_opc':
          if (this.isForeignOPC(data.opc)) {
            found.push({ name: indicator, value: data.opc, threshold: 'domestic', isAnomalous: true, weight: 0.3 });
          }
          break;
        case 'multiple_queries_same_target':
          // Would need historical data
          break;
        case 'sms_divert_unauthorized':
          // Would need subscriber consent database
          break;
        case 'unusual_forwarding_setup':
          found.push({ name: indicator, value: true, threshold: false, isAnomalous: true, weight: 0.4 });
          break;
        case 'location_query_burst':
          found.push({ name: indicator, value: data.mapOperation, threshold: 'normal', isAnomalous: true, weight: 0.3 });
          break;
        case 'cross_border_location_request':
          if (this.isForeignOPC(data.opc)) {
            found.push({ name: indicator, value: data.opc, threshold: 'domestic', isAnomalous: true, weight: 0.4 });
          }
          break;
        case 'fake_base_station':
          found.push({ name: indicator, value: data.isupMessageType, threshold: 'normal', isAnomalous: true, weight: 0.5 });
          break;
        case 'identity_request_burst':
          found.push({ name: indicator, value: data.imsi ? 'present' : 'absent', threshold: 'absent', isAnomalous: !!data.imsi, weight: 0.4 });
          break;
      }
    }

    return found;
  }

  /**
   * Additional SS7 anomaly checks
   */
  private checkSS7Anomalies(flow: NetworkFlow, data: SS7MessageData): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];

    // Check for unusual message rates (would need aggregation)
    // Check for unauthorized SCCP Called Party Address manipulation
    // Check for abnormal ISUP parameters

    return results;
  }

  private isUnusualGT(gt: string): boolean {
    // Simplified check - would need GT routing table
    return gt.length > 15 || gt.match(/[^0-9A-F]/i) !== null;
  }

  private isForeignOPC(opc: number): boolean {
    // Simplified - would need national/international OPC ranges
    return opc > 10000; // Arbitrary threshold
  }
}

/** SS7 attack pattern definition */
interface SS7AttackPattern {
  name: string;
  mapOperations?: string[];
  isupPatterns?: string[];
  riskLevel: string;
  indicators: string[];
}

/**
 * GTP Abuse Detector
 * Detects GTP tunnel abuse and roaming fraud
 */
export class GTPAbuseDetector {
  private sessionTrackers: Map<string, GTPSessionTracker> = new Map();

  /**
   * Analyze a GTP session for abuse patterns
   */
  analyzeSession(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const gtpData = flow.telecomData?.gtpData;
    
    if (!gtpData) return results;

    // Track session
    const trackerKey = gtpData.imsi || gtpData.teid.toString();
    let tracker = this.sessionTrackers.get(trackerKey);
    if (!tracker) {
      tracker = {
        imsi: gtpData.imsi,
        teid: gtpData.teid,
        sessions: [],
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
        totalBytes: 0,
      };
      this.sessionTrackers.set(trackerKey, tracker);
    }

    tracker.sessions.push({
      timestamp: flow.timestamp,
      apn: gtpData.apn,
      bytesIn: flow.bytesIn,
      bytesOut: flow.bytesOut,
      ratType: gtpData.ratType,
      plmnId: gtpData.plmnId,
    });
    tracker.totalBytes += flow.bytesIn + flow.bytesOut;
    tracker.lastSeen = flow.timestamp;

    // Check for anomalies
    results.push(...this.checkGTPAnomalies(gtpData, tracker, flow));

    return results;
  }

  /**
   * Check for GTP anomalies
   */
  private checkGTPAnomalies(data: GTPSessionData, tracker: GTPSessionTracker, flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];

    // Roaming anomaly - unexpected PLMN
    const expectedPLMNs = ['DZD']; // Algeria MCC/MNC
    if (!expectedPLMNs.some(plmn => data.plmnId.startsWith(plmn))) {
      results.push({
        id: `gtp-roaming-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'roaming_fraud',
        severity: 'medium',
        confidence: 70,
        title: 'Unexpected Roaming Activity',
        description: `Subscriber IMSI ${data.imsi?.substring(0, 6)}*** detected in PLMN ${data.plmnId}`,
        indicators: [
          { name: 'plmn_id', value: data.plmnId, threshold: 'domestic', isAnomalous: true, weight: 0.5 },
          { name: 'rat_type', value: data.ratType, threshold: 'expected', isAnomalous: false, weight: 0.3 },
        ],
        mitreTechnique: 'TELECOM-T2',
        mitreTactic: 'Initial Access',
        recommendedActions: [
          'Verify roaming agreement with PLMN',
          'Check for SIM cloning indicators',
          'Monitor subscriber for fraud patterns',
        ],
        detectionMethod: 'protocol_analysis',
      });
    }

    // High bandwidth usage
    if (tracker.totalBytes > 1073741824) { // > 1GB
      results.push({
        id: `gtp-abuse-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'gtp_tunnel_abuse',
        severity: 'medium',
        confidence: 65,
        title: 'High Bandwidth GTP Usage',
        description: `High data usage detected for session TEID ${data.teid}: ${(tracker.totalBytes / 1073741824).toFixed(2)} GB`,
        indicators: [
          { name: 'total_bytes', value: tracker.totalBytes, threshold: 1073741824, isAnomalous: true, weight: 0.6 },
          { name: 'session_count', value: tracker.sessions.length, threshold: 50, isAnomalous: tracker.sessions.length > 50, weight: 0.4 },
        ],
        recommendedActions: [
          'Verify APN usage policy compliance',
          'Check for tethering/P2P usage',
          'Monitor for data exfiltration',
        ],
        detectionMethod: 'anomaly_based',
      });
    }

    return results;
  }
}

/** GTP session tracker */
interface GTPSessionTracker {
  imsi?: string;
  teid: number;
  sessions: Array<{
    timestamp: Date;
    apn: string;
    bytesIn: number;
    bytesOut: number;
    ratType: string;
    plmnId: string;
  }>;
  firstSeen: Date;
  lastSeen: Date;
  totalBytes: number;
}

/**
 * SIP Fraud Detector
 * Detects SIP-based fraud attacks
 */
export class SIPFraudDetector {
  private callTrackers: Map<string, SIPCallTracker> = new Map();

  /**
   * Analyze a SIP call for fraud patterns
   */
  analyzeCall(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const sipData = flow.telecomData?.sipData;
    
    if (!sipData) return results;

    // Track calls
    const trackerKey = sipData.callId || `${sipData.fromUser}@${sipData.toUser}`;
    let tracker = this.callTrackers.get(trackerKey);
    if (!tracker) {
      tracker = {
        callId: sipData.callId,
        fromUser: sipData.fromUser,
        toUser: sipData.toUser,
        events: [],
        firstSeen: flow.timestamp,
        lastSeen: flow.timestamp,
      };
      this.callTrackers.set(trackerKey, tracker);
    }

    tracker.events.push({
      timestamp: flow.timestamp,
      method: sipData.method,
      status: sipData.sipStatus,
    });
    tracker.lastSeen = flow.timestamp;

    // Check for fraud patterns
    results.push(...this.checkSIPFraud(sipData, tracker, flow));

    return results;
  }

  /**
   * Check for SIP fraud patterns
   */
  private checkSIPFraud(data: SIPCallData, tracker: SIPCallTracker, flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];

    // International Revenue Share Fraud (IRSF) - high-cost destinations
    const highCostDestinations = this.getHighCostDestinations();
    if (highCostDestinations.some(d => data.toDomain.includes(d))) {
      results.push({
        id: `sip-irsf-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'sip_fraud',
        severity: 'high',
        confidence: 80,
        title: 'Potential IRSF Activity',
        description: `Call to potentially high-cost destination: ${data.toDomain}`,
        indicators: [
          { name: 'destination', value: data.toDomain, threshold: 'safe_list', isAnomalous: true, weight: 0.6 },
          { name: 'call_duration', value: flow.durationMs, threshold: 60000, isAnomalous: flow.durationMs > 60000, weight: 0.4 },
        ],
        mitreTechnique: 'TELECOM-T5',
        mitreTactic: 'Impact',
        recommendedActions: [
          'Verify caller authorization for international calls',
          'Monitor for repeated calls to same destination',
          'Consider blocking high-risk destinations',
        ],
        detectionMethod: 'signature_based',
      });
    }

    // Wangiri fraud pattern (short calls, many different numbers)
    if (data.method === 'BYE' && flow.durationMs < 10000 && flow.durationMs > 0) {
      results.push({
        id: `sip-wangiri-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'sip_fraud',
        severity: 'low',
        confidence: 55,
        title: 'Potential Wangiri Pattern',
        description: `Very short call from ${data.fromUser} to ${data.toUser}: ${flow.durationMs}ms`,
        indicators: [
          { name: 'call_duration_ms', value: flow.durationMs, threshold: 10000, isAnomalous: true, weight: 0.7 },
          { name: 'call_method', value: data.method, threshold: 'normal', isAnomalous: true, weight: 0.3 },
        ],
        recommendedActions: [
          'Monitor calling patterns for this originator',
          'Check for callback scam indicators',
        ],
        detectionMethod: 'heuristic',
      });
    }

    return results;
  }

  /**
   * Get list of high-cost destinations (simplified)
   */
  private getHighCostDestinations(): string[] {
    return [
      'cub', 'cod', 'som', 'sle', 'caf', // Example premium-rate country codes
    ];
  }
}

/** SIP call tracker */
interface SIPCallTracker {
  callId: string;
  fromUser: string;
  toUser: string;
  events: Array<{ timestamp: Date; method: string; status?: number }>;
  firstSeen: Date;
  lastSeen: Date;
}

/**
 * Diameter Attack Detector
 * Detects Diameter protocol attacks
 */
export class DiameterAttackDetector {
  /**
   * Analyze a Diameter message for attack patterns
   */
  analyzeMessage(flow: NetworkFlow): NIDSDetectionResult[] {
    const results: NIDSDetectionResult[] = [];
    const diameterData = flow.telecomData?.diameterData;
    
    if (!diameterData) return results;

    // Check for error responses indicating potential attack
    if (diameterData.resultCode && diameterData.resultCode >= 4000) {
      results.push({
        id: `diameter-error-${Date.now()}`,
        timestamp: new Date(),
        flowId: flow.id,
        threatType: 'dos_attack',
        severity: diameterData.resultCode >= 5000 ? 'high' : 'medium',
        confidence: 70,
        title: 'Diameter Error Response Detected',
        description: `Diameter command ${diameterData.commandCode} returned error code ${diameterData.resultCode}: ${diameterData.errorMessage || 'Unknown error'}`,
        indicators: [
          { name: 'result_code', value: diameterData.resultCode, threshold: 3999, isAnomalous: true, weight: 0.6 },
          { name: 'command_code', value: diameterData.commandCode, threshold: 'normal', isAnomalous: false, weight: 0.2 },
          { name: 'session_id', value: diameterData.sessionId, threshold: 'valid', isAnomalous: false, weight: 0.2 },
        ],
        mitreTechnique: 'TELECOM-T4',
        mitreTactic: 'Impact',
        recommendedActions: [
          'Investigate cause of Diameter errors',
          'Check for malformed requests',
          'Monitor for DoS patterns',
        ],
        detectionMethod: 'protocol_analysis',
      });
    }

    // Check for authentication anomalies
    if (diameterData.commandCode === 265 || diameterData.commandCode === 280) { // DEA/DRA
      // Authentication commands - check for brute force patterns
      // Would need historical aggregation
    }

    return results;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_NIDS_CONFIG,
};

export type {
  NetworkFlow,
  NetworkProtocol,
  TCPFlags,
  FlowState,
  FlowClassification,
  ThreatType,
  IOCMatch,
  GeoLocation,
  TelecomProtocolData,
  SS7MessageData,
  DiameterMessageData,
  GTPSessionData,
  QoSProfile,
  SIPCallData,
  NIDSDetectionResult,
  DetectionIndicator,
  DetectionMethod,
  DDoSDetails,
  PortScanDetails,
  C2BeaconDetails,
  DNSTunnelDetails,
  LateralMovementDetails,
  NIDSConfig,
  DDoSThresholds,
  PortScanThresholds,
  C2Thresholds,
  DNSTunnelThresholds,
  LateralMovementThresholds,
};
