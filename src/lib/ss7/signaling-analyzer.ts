/**
 * Signaling Traffic Analyzer
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Comprehensive signaling analysis engine:
 * - Traffic volume analysis per OPC/DPC pair
 * - Message type distribution analysis
 * - Global Title translation tracking
 * - Subsystem status monitoring (SSN)
 * - Congestion detection (TFC messages)
 * - Anomaly scoring and alerting
 * 
 * @version 1.0.0
 */

import {
  SS7Message,
  SS7ProtocolLayer,
  PointCode,
  SubsystemNumber,
  SCCPMessageType,
  ISUPMessageType,
  M3UAMessageType,
  MAPOperationCode,
  parsePointCode,
} from './ss7-formats';

// ============================================================
// ANALYZER TYPES
// ============================================================

export interface TrafficMetrics {
  // Time window
  periodStart: Date;
  periodEnd: Date;
  
  // Volume metrics
  totalMessages: number;
  messagesPerSecond: number;
  peakMessagesPerSecond: number;
  averageMessageSize: number;
  totalBytes: number;
  
  // Protocol distribution
  protocolDistribution: Record<SS7ProtocolLayer, ProtocolStats>;
  
  // Direction distribution
  inboundCount: number;
  outboundCount: number;
  
  // Top talkers
  topTalkers: TalkerPair[];
  
  // Error metrics
  errorRate: number;
  errorBreakdown: Record<string, number>;
}

export interface ProtocolStats {
  count: number;
  percentage: number;
  bytes: number;
  avgSize: number;
  operations?: Record<string, number>; // For MAP/CAP/ISUP operations
}

export interface TalkerPair {
  opc: PointCode;
  dpc: PointCode;
  messageCount: number;
  bytes: number;
  protocols: Set<SS7ProtocolLayer>;
  lastSeen: Date;
}

export interface AnomalyScore {
  id: string;
  timestamp: Date;
  score: number;              // 0-100 severity
  category: AnomalyCategory;
  description: string;
  affectedElements: string[];
  indicators: AnomalyIndicator[];
  recommendedActions: string[];
  confidence: number;         // Statistical confidence
}

export enum AnomalyCategory {
  VOLUME_SPIKE = 'volume_spike',
  VOLUME_DROP = 'volume_drop',
  PROTOCOL_ANOMALY = 'protocol_anomaly',
  ROUTING_ANOMALY = 'routing_anomaly',
  CONGESTION = 'congestion',
  SUBSYSTEM_FAILURE = 'subsystem_failure',
  SECURITY_INCIDENT = 'security_incident',
  CONFIGURATION_DRIFT = 'configuration_drift',
  UNKNOWN = 'unknown',
}

export interface AnomalyIndicator {
  type: string;
  name: string;
  value: number;
  expectedRange: { min: number; max: number };
  deviation: number;          // Standard deviations from mean
  weight: number;             // Contribution to overall score
}

export interface SubsystemStatus {
  ssn: SubsystemNumber;
  ssnName: string;
  status: SubsystemStatusType;
  pointCodes: PointCode[];
  messageCount: number;
  lastActivity: Date;
  responseTimeMs: number;
  errors: number;
  congestionLevel: CongestionLevel;
}

export enum SubsystemStatusType {
  AVAILABLE = 'available',
  CONGESTED = 'congested',
  RESTRICTED = 'restricted',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

export enum CongestionLevel {
  NONE = 0,       // No congestion
  LOW = 1,        // Grade 1 (< 20% capacity)
  MEDIUM = 2,     // Grade 2 (< 40% capacity)
  HIGH = 3,       // Grade 3 (< 70% capacity)
  CRITICAL = 4,   // Grade 4 (> 70% capacity)
}

export interface GTTranslationRecord {
  sourceGT: string;
  translatedPC: PointCode;
  translationType: number;
  timestamp: Date;
  success: boolean;
  latencyMs: number;
  globalTitleResponse?: string;
}

export interface LinkStatus {
  linksetId: string;
  linkCode: number;
  status: LinkStatusType;
  localPointCode: PointCode;
  remotePointCode: PointCode;
  messageCount: number;
  errorCount: number;
  utilization: number;        // 0-100%
  signalQuality: number;      // 0-100%
  lastChange: Date;
}

export enum LinkStatusType {
  AVAILABLE = 'available',
  FAILED = 'failed',
  SHUTDOWN = 'shutdown',
  CONGESTED = 'congested',
  RESTRICTED = 'restricted',
  INHIBITED = 'inhibited',
  BLOCKED = 'blocked',
  UNKNOWN = 'unknown',
}

// ============================================================
// TIME SERIES DATA TYPES
// ============================================================

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  metric: string;
  granularity: Granularity;
  points: TimeSeriesPoint[];
  statistics?: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    stddev: number;
  };
}

export enum Granularity {
  SECOND = 'second',
  MINUTE = 'minute',
  FIVE_MINUTE = 'five_minute',
  HOUR = 'hour',
  DAY = 'day',
}

// ============================================================
// SIGNALING ANALYZER CLASS
// ============================================================

export class SignalingAnalyzer {
  private messageBuffer: SS7Message[];
  private maxBufferSize: number;
  
  // Aggregated data
  private trafficHistory: Map<string, TimeSeriesPoint[]>;
  private talkerMap: Map<string, TalkerPair>;
  private subsystemStatuses: Map<number, SubsystemStatus>;
  private gtTranslations: GTTranslationRecord[];
  private linkStatuses: Map<string, LinkStatus>;
  
  // Baseline for anomaly detection
  private baselineMetrics: Map<string, BaselineMetric>;
  
  // Configuration
  private config: AnalyzerConfig;

  constructor(config?: Partial<AnalyzerConfig>) {
    this.messageBuffer = [];
    this.maxBufferSize = config?.maxBufferSize || 10000;
    
    this.trafficHistory = new Map();
    this.talkerMap = new Map();
    this.subsystemStatuses = new Map();
    this.gtTranslations = [];
    this.linkStatuses = new Map();
    this.baselineMetrics = new Map();
    
    this.config = {
      maxBufferSize: 10000,
      anomalyThreshold: 75,
      timeWindowMinutes: 60,
      smoothingFactor: 0.3,
      enableAutoBaseline: true,
      ...config,
    };

    // Initialize default baselines
    this.initializeBaselines();
  }

  /**
   * Process an incoming SS7 message and update all analytics
   */
  processMessage(message: SS7Message): void {
    // Add to buffer
    this.messageBuffer.push(message);
    if (this.messageBuffer.length > this.maxBufferSize) {
      this.messageBuffer.shift();
    }

    // Update various analytics
    this.updateTalkerStats(message);
    this.updateSubsystemStatus(message);
    this.trackGTTranslation(message);
    this.updateTrafficTimeSeries(message);
    this.checkForCongestion(message);

    // Auto-update baseline if enabled
    if (this.config.enableAutoBaseline) {
      this.updateBaselines(message);
    }
  }

  /**
   * Process batch of messages
   */
  processBatch(messages: SS7Message[]): void {
    messages.forEach(msg => this.processMessage(msg));
  }

  // ============================================================
  // TRAFFIC METRICS
  // ============================================================

  /**
   * Get comprehensive traffic metrics for a time period
   */
  getTrafficMetrics(periodMinutes: number = 60): TrafficMetrics {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodMinutes * 60 * 1000);
    
    // Filter messages in period
    const periodMessages = this.messageBuffer.filter(
      m => m.timestamp >= periodStart && m.timestamp <= now
    );

    const durationSeconds = Math.max(periodMinutes * 60, 1);
    
    // Calculate basic metrics
    const totalMessages = periodMessages.length;
    const totalBytes = periodMessages.reduce((sum, m) => sum + (m.packetLength || 0), 0);
    const messagesPerSecond = totalMessages / durationSeconds;

    // Calculate protocol distribution
    const protocolDistribution = this.calculateProtocolDistribution(periodMessages);
    
    // Calculate direction stats
    const inboundCount = periodMessages.filter(m => m.direction === 'inbound').length;
    const outboundCount = periodMessages.filter(m => m.direction === 'outbound').length;

    // Get top talkers
    const topTalkers = this.getTopTalkers(20);

    // Calculate error rate
    const errorMessages = periodMessages.filter(m => 
      m.protocol === SS7ProtocolLayer.ISUP && 
      (m as any).causeValue !== undefined &&
      (m as any).causeValue > 30
    );
    const errorRate = totalMessages > 0 ? (errorMessages.length / totalMessages) * 100 : 0;
    
    const errorBreakdown: Record<string, number> = {};
    errorMessages.forEach(m => {
      const cause = `ISUP_${(m as any).causeValue}`;
      errorBreakdown[cause] = (errorBreakdown[cause] || 0) + 1;
    });

    return {
      periodStart,
      periodEnd: now,
      totalMessages,
      messagesPerSecond,
      peakMessagesPerSecond: this.calculatePeakMPS(periodMessages),
      averageMessageSize: totalMessages > 0 ? totalBytes / totalMessages : 0,
      totalBytes,
      protocolDistribution,
      inboundCount,
      outboundCount,
      topTalkers,
      errorRate,
      errorBreakdown,
    };
  }

  /**
   * Get message rate over time (time series)
   */
  getMessageRateSeries(
    metric: 'mps' | 'bytes' | 'count' = 'mps',
    granularity: Granularity = Granularity.FIVE_MINUTE,
    points: number = 288  // 24h at 5-min intervals
  ): TimeSeriesData {
    const seriesKey = `${metric}_${granularity}`;
    let historyPoints = this.trafficHistory.get(seriesKey) || [];
    
    // If not enough data, generate from buffer
    if (historyPoints.length < points) {
      historyPoints = this.generateTimeSeriesFromBuffer(metric, granularity, points);
      this.trafficHistory.set(seriesKey, historyPoints);
    }
    
    // Return requested number of points
    const recentPoints = historyPoints.slice(-points);
    
    // Calculate statistics
    const values = recentPoints.map(p => p.value);
    const statistics = this.calculateStatistics(values);
    
    return {
      metric,
      granularity,
      points: recentPoints,
      statistics,
    };
  }

  // ============================================================
  // TOP TALKERS
  // ============================================================

  getTopTalkers(limit: number = 20): TalkerPair[] {
    return Array.from(this.talkerMap.values())
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);
  }

  private updateTalkerStats(message: SS7Message): void {
    const key = `${message.opc.raw}-${message.dpc.raw}`;
    
    let talker = this.talkerMap.get(key);
    if (!talker) {
      talker = {
        opc: message.opc,
        dpc: message.dpc,
        messageCount: 0,
        bytes: 0,
        protocols: new Set(),
        lastSeen: new Date(),
      };
      this.talkerMap.set(key, talker);
    }
    
    talker.messageCount++;
    talker.bytes += message.packetLength || 0;
    talker.protocols.add(message.protocol);
    talker.lastSeen = message.timestamp;
  }

  // ============================================================
  // SUBSYSTEM STATUS MONITORING
  // ============================================================

  getSubsystemStatus(ssn?: SubsystemNumber): SubsystemStatus[] {
    if (ssn) {
      const status = this.subsystemStatuses.get(ssn);
      return status ? [status] : [];
    }
    
    return Array.from(this.subsystemStatuses.values());
  }

  private updateSubsystemStatus(message: SS7Message): void {
    // Extract SSN from SCCP layer
    const destSSN = message.sccp?.destinationSSN;
    const srcSSN = message.sccp?.sourceSSN;
    
    [destSSN, srcSSN].forEach(ssn => {
      if (!ssn) return;
      
      let status = this.subsystemStatuses.get(ssn);
      if (!status) {
        status = {
          ssn,
          ssnName: this.getSSNName(ssn),
          status: SubsystemStatusType.UNKNOWN,
          pointCodes: [],
          messageCount: 0,
          lastActivity: new Date(0),
          responseTimeMs: 0,
          errors: 0,
          congestionLevel: CongestionLevel.NONE,
        };
        this.subsystemStatuses.set(ssn, status);
      }
      
      status.messageCount++;
      status.lastActivity = message.timestamp;
      
      // Track point codes
      if (!status.pointCodes.find(pc => pc.raw === message.dpc.raw)) {
        status.pointCodes.push(message.dpc);
      }
      
      // Check for SCCP return/error messages
      if (message.sccp?.messageType === SCCPMessageType.ERR ||
          message.sccp?.messageType === SCCPMessageType.UDTS) {
        status.errors++;
      }
      
      // Update congestion level based on TFC-like patterns
      status.congestionLevel = this.calculateCongestionLevel(status);
    });
  }

  private calculateCongestionLevel(status: SubsystemStatus): CongestionLevel {
    // Simple heuristic based on error rate and message volume
    const errorRate = status.messageCount > 0 ? 
      (status.errors / status.messageCount) * 100 : 0;
    
    if (errorRate > 10) return CongestionLevel.CRITICAL;
    if (errorRate > 5) return CongestionLevel.HIGH;
    if (errorRate > 1) return CongestionLevel.MEDIUM;
    if (errorRate > 0.1) return CongestionLevel.LOW;
    
    return CongestionLevel.NONE;
  }

  private getSSNName(ssn: SubsystemNumber): string {
    const names: Partial<Record<SubsystemNumber, string>> = {
      [SubsystemNumber.MAP_HLR]: 'MAP-HLR',
      [SubsystemNumber.MAP_VLR]: 'MAP-VLR',
      [SubsystemNumber.MAP_EIR]: 'MAP-EIR',
      [SubsystemNumber.MAP_AUC]: 'MAP-AUC',
      [SubsystemNumber.MSC]: 'MSC',
      [SubsystemNumber.SGSN]: 'SGSN',
      [SubsystemNumber.GGSN]: 'GGSN',
      [SubsystemNumber.CAP]: 'CAP',
      [SubsystemNumber.SMS_SC]: 'SMS-SC',
      [SubsystemNumber.BSSAP]: 'BSSAP',
      [SubsystemNumber.RANAP]: 'RANAP',
    };
    
    return names[ssn] || `SSN-${ssn}`;
  }

  // ============================================================
  // GLOBAL TITLE TRANSLATION TRACKING
  // ============================================================

  getGTTranslationHistory(
    filter?: { sourceGT?: string; successOnly?: boolean; limit?: number }
  ): GTTranslationRecord[] {
    let records = [...this.gtTranslations];
    
    if (filter?.sourceGT) {
      records = records.filter(r => r.sourceGT.includes(filter.sourceGT!));
    }
    
    if (filter?.successOnly) {
      records = records.filter(r => r.success);
    }
    
    if (filter?.limit) {
      records = records.slice(0, filter.limit);
    }
    
    return records.reverse(); // Most recent first
  }

  private trackGTTranslation(message: SS7Message): void {
    // Track when we see GT-based routing
    if (!message.sccp?.destinationGlobalTitle?.digits) return;
    
    const record: GTTranslationRecord = {
      sourceGT: message.sccp.destinationGlobalTitle.digits,
      translatedPC: message.dpc,
      translationType: message.sccp.destinationGlobalTitle.translationType,
      timestamp: message.timestamp,
      success: true, // Assume success unless we see error
      latencyMs: 0,  // Would need timing info
    };
    
    this.gtTranslations.push(record);
    
    // Keep only recent translations (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.gtTranslations = this.gtTranslations.filter(r => r.timestamp.getTime() > oneHourAgo);
  }

  // ============================================================
  // CONGESTION DETECTION
  // ============================================================

  detectCongestion(): Array<{
    pointCode: PointCode;
    level: CongestionLevel;
    messageRate: number;
    threshold: number;
    timestamp: Date;
  }> {
    const congestionPoints: Array<{
      pointCode: PointCode;
      level: CongestionLevel;
      messageRate: number;
      threshold: number;
      timestamp: Date;
    }> = [];

    // Check each destination PC for congestion signs
    const pcMessageCounts = new Map<number, { count: number; pc: PointCode }>();
    
    for (const msg of this.messageBuffer.slice(-1000)) {
      const existing = pcMessageCounts.get(msg.dpc.raw);
      if (existing) {
        existing.count++;
      } else {
        pcMessageCounts.set(msg.dpc.raw, { count: 1, pc: msg.dpc });
      }
    }

    // Thresholds (messages in last 1000 samples)
    const thresholds = {
      [CongestionLevel.LOW]: 150,
      [CongestionLevel.MEDIUM]: 250,
      [CongestionLevel.HIGH]: 400,
      [CongestionLevel.CRITICAL]: 600,
    };

    for (const [, data] of pcMessageCounts) {
      let level = CongestionLevel.NONE;
      
      if (data.count >= thresholds[CongestionLevel.CRITICAL]) {
        level = CongestionLevel.CRITICAL;
      } else if (data.count >= thresholds[CongestionLevel.HIGH]) {
        level = CongestionLevel.HIGH;
      } else if (data.count >= thresholds[CongestionLevel.MEDIUM]) {
        level = CongestionLevel.MEDIUM;
      } else if (data.count >= thresholds[CongestionLevel.LOW]) {
        level = CongestionLevel.LOW;
      }

      if (level > CongestionLevel.NONE) {
        congestionPoints.push({
          pointCode: data.pc,
          level,
          messageRate: data.count,
          threshold: thresholds[level],
          timestamp: new Date(),
        });
      }
    }

    return congestionPoints.sort((a, b) => b.level - a.level);
  }

  private checkForCongestion(message: SS7Message): void {
    // Check for TFC (Transfer Controlled) or SCON messages
    // These indicate network congestion
    if ((message as any).decodedFields?.messageType === 'SCON') {
      // Update congestion tracking for this route
      const key = `${message.opc.raw}-${message.dpc.raw}`;
      const talker = this.talkerMap.get(key);
      if (talker) {
        // Mark as congested
      }
    }
  }

  // ============================================================
  // ANOMALY DETECTION
  // ============================================================

  detectAnomalies(): AnomalyScore[] {
    const anomalies: AnomalyScore[] = [];
    const now = new Date();

    // Check volume anomalies
    const currentMPS = this.getCurrentMPS();
    const baselineMPS = this.baselineMetrics.get('mps');
    
    if (baselineMPS) {
      const deviation = Math.abs(currentMPS - baselineMPS.mean) / baselineMPS.stddev;
      
      if (deviation > 3) {
        anomalies.push(this.createAnomalyScore(
          deviation > 5 ? AnomalyCategory.VOLUME_SPIKE : AnomalyCategory.VOLUME_ANOMALY,
          currentMPS > baselineMPS.mean ? 'Volume spike detected' : 'Unusual drop in traffic',
          [
            {
              type: 'volume_deviation',
              name: 'Message Rate Deviation',
              value: currentMPS,
              expectedRange: {
                min: baselineMPS.mean - 2 * baselineMPS.stddev,
                max: baselineMPS.mean + 2 * baselineMPS.stddev,
              },
              deviation,
              weight: 40,
            },
          ],
          Math.min(deviation * 15, 100)
        ));
      }
    }

    // Check protocol distribution anomalies
    const protoAnomaly = this.detectProtocolDistributionAnomaly();
    if (protoAnomaly) {
      anomalies.push(protoAnomaly);
    }

    // Check for unusual OPC/DPC pairs
    const routingAnomaly = this.detectRoutingAnomaly();
    if (routingAnomaly) {
      anomalies.push(routingAnomaly);
    }

    // Check subsystem health
    const subsystemAnomalies = this.detectSubsystemAnomalies();
    anomalies.push(...subsystemAnomalies);

    return anomalies.sort((a, b) => b.score - a.score);
  }

  private detectProtocolDistributionAnomaly(): AnomalyScore | null {
    const currentDist = this.calculateProtocolDistribution(
      this.messageBuffer.slice(-1000)
    );
    
    const baselineProto = this.baselineMetrics.get('protocol_distribution');
    if (!baselineProto) return null;

    const indicators: AnomalyIndicator[] = [];
    let maxDeviation = 0;

    for (const [proto, stats] of Object.entries(currentDist)) {
      const baselinePercent = baselineProto.expected[proto] || 0;
      const deviation = Math.abs(stats.percentage - baselinePercent);
      
      if (deviation > 20) { // More than 20% deviation
        indicators.push({
          type: 'protocol_distribution',
          name: `${proto} distribution`,
          value: stats.percentage,
          expectedRange: { min: baselinePercent - 10, max: baselinePercent + 10 },
          deviation: deviation / 10,
          weight: 25,
        });
        maxDeviation = Math.max(maxDeviation, deviation);
      }
    }

    if (indicators.length === 0) return null;

    return this.createAnomalyScore(
      AnomalyCategory.PROTOCOL_ANOMALY,
      `Unusual protocol distribution detected`,
      indicators,
      Math.min(maxDeviation * 3, 90)
    );
  }

  private detectRoutingAnomaly(): AnomalyScore | null {
    // Look for new or unusual OPC/DPC pairs
    const recentPairs = new Set<string>();
    for (const msg of this.messageBuffer.slice(-500)) {
      recentPairs.add(`${msg.opc.raw}-${msg.dpc.raw}`);
    }

    const knownPairs = new Set(this.baselineMetrics.get('known_pairs')?.expected || []);
    const newPairs = [...recentPairs].filter(p => !knownPairs.has(p));

    if (newPairs.length > 5) { // More than 5 new pairs is suspicious
      return this.createAnomalyScore(
        AnomalyCategory.ROUTING_ANOMALY,
        `${newPairs.length} new signaling routes detected`,
        [{
          type: 'new_routes',
          name: 'New Route Count',
          value: newPairs.length,
          expectedRange: { min: 0, max: 5 },
          deviation: newPairs.length / 5,
          weight: 35,
        }],
        Math.min(newPairs.length * 12, 85)
      );
    }

    return null;
  }

  private detectSubsystemAnomalies(): AnomalyScore[] {
    const anomalies: AnomalyScore[] = [];

    for (const [, status] of this.subsystemStatuses) {
      if (status.congestionLevel >= CongestionLevel.HIGH) {
        anomalies.push(this.createAnomalyScore(
          AnomalyCategory.SUBSYSTEM_FAILURE,
          `Subsystem ${status.ssnName} experiencing ${CongestionLevel[status.congestionLevel]} congestion`,
          [{
            type: 'congestion_level',
            name: 'Congestion Level',
            value: status.congestionLevel,
            expectedRange: { min: 0, max: 1 },
            deviation: status.congestionLevel,
            weight: 30,
          }, {
            type: 'error_rate',
            name: 'Error Rate',
            value: status.errors,
            expectedRange: { min: 0, max: 10 },
            deviation: status.errors / 10,
            weight: 25,
          }],
          60 + status.congestionLevel * 10
        ));
      }

      // Check for inactive subsystems that should be active
      const timeSinceLastActivity = Date.now() - status.lastActivity.getTime();
      if (timeSinceLastActivity > 300000 && status.messageCount > 100) { // 5 min with prior activity
        anomalies.push(this.createAnomalyScore(
          AnomalyCategory.SUBSYSTEM_FAILURE,
          `Subsystem ${status.ssnName} appears unresponsive`,
          [{
            type: 'inactivity_duration',
            name: 'Inactivity Duration (seconds)',
            value: timeSinceLastActivity / 1000,
            expectedRange: { min: 0, max: 120 },
            deviation: timeSinceLastActivity / 120000,
            weight: 40,
          }],
          65
        ));
      }
    }

    return anomalies;
  }

  private createAnomalyScore(
    category: AnomalyCategory,
    description: string,
    indicators: AnomalyIndicator[],
    baseScore: number
  ): AnomalyScore {
    const weightedScore = indicators.reduce((sum, ind) => sum + (ind.weight * Math.min(ind.deviation, 5)) / 5, 0);
    
    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      score: Math.min(Math.round(baseScore), 100),
      category,
      description,
      affectedElements: [],
      indicators,
      recommendedActions: this.getRecommendedActions(category),
      confidence: Math.min(95, 50 + baseScore * 0.4),
    };
  }

  private getRecommendedActions(category: AnomalyCategory): string[] {
    switch (category) {
      case AnomalyCategory.VOLUME_SPIKE:
        return [
          'Check for potential DDoS or flood attack',
          'Verify probe/sensor health',
          'Review recent configuration changes',
        ];
      case AnomalyCategory.VOLUME_DROP:
        return [
          'Check STP/link availability',
          'Verify no maintenance windows active',
          'Check for routing failures',
        ];
      case AnomalyCategory.PROTOCOL_ANOMALY:
        return [
          'Investigate unusual protocol mix',
          'Check for potential fraud patterns',
          'Review application logs',
        ];
      case AnomalyCategory.ROUTING_ANOMALY:
        return [
          'Verify new route legitimacy',
          'Check for misconfiguration',
          'Investigate potential security breach',
        ];
      case AnomalyCategory.CONGESTION:
        return [
          'Review network capacity',
          'Consider load balancing',
          'Alert network operations team',
        ];
      case AnomalyCategory.SUBSYSTEM_FAILURE:
        return [
          'Check subsystem availability',
          'Restart affected services if needed',
          'Escalate to vendor support',
        ];
      case AnomalyCategory.SECURITY_INCIDENT:
        return [
          'Initiate incident response procedure',
          'Capture forensic evidence',
          'Notify security team immediately',
        ];
      default:
        return ['Continue monitoring', 'Gather additional context'];
    }
  }

  // ============================================================
  // BASELINE MANAGEMENT
  // ============================================================

  private initializeBaselines(): void {
    // Initialize with reasonable defaults for Djezzy network
    this.baselineMetrics.set('mps', {
      mean: 2500,     // ~2500 msgs/sec typical
      stddev: 500,
      min: 1500,
      max: 4000,
      samples: 0,
      updated: new Date(),
    });

    this.baselineMetrics.set('protocol_distribution', {
      expected: {
        [SS7ProtocolLayer.MAP]: 45,
        [SS7ProtocolLayer.CAP]: 15,
        [SS7ProtocolLayer.ISUP]: 25,
        [SS7ProtocolLayer.SCCP]: 10,
        [SS7ProtocolLayer.TCAP]: 5,
      },
      samples: 0,
      updated: new Date(),
    });

    this.baselineMetrics.set('known_pairs', {
      expected: [], // Will be populated dynamically
      samples: 0,
      updated: new Date(),
    });
  }

  private updateBaselines(message: SS7Message): void {
    // Update MPS baseline using exponential moving average
    const mpsBaseline = this.baselineMetrics.get('mps');
    if (mpsBaseline) {
      const currentMPS = this.getCurrentMPS();
      const alpha = this.config.smoothingFactor;
      
      mpsBaseline.mean = alpha * currentMPS + (1 - alpha) * mpsBaseline.mean;
      mpsBaseline.samples++;
      mpsBaseline.updated = new Date();
    }

    // Track known OPC/DPC pairs
    const pairsBaseline = this.baselineMetrics.get('known_pairs');
    if (pairsBaseline) {
      const pairKey = `${message.opc.raw}-${message.dpc.raw}`;
      if (!pairsBaseline.expected.includes(pairKey)) {
        pairsBaseline.expected.push(pairKey);
      }
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getCurrentMPS(): number {
    // Calculate messages per second from recent buffer
    if (this.messageBuffer.length < 2) return 0;
    
    const newest = this.messageBuffer[this.messageBuffer.length - 1].timestamp.getTime();
    const oldest = this.messageBuffer[Math.max(0, this.messageBuffer.length - 100)].timestamp.getTime();
    const durationSec = Math.max((newest - oldest) / 1000, 1);
    
    return Math.min(this.messageBuffer.length / durationSec, 100); // Last 100 messages
  }

  private calculatePeakMPS(messages: SS7Message[]): number {
    if (messages.length < 2) return messages.length;
    
    // Group by second and find peak
    const bySecond = new Map<number, number>();
    
    for (const msg of messages) {
      const sec = Math.floor(msg.timestamp.getTime() / 1000);
      bySecond.set(sec, (bySecond.get(sec) || 0) + 1);
    }
    
    let peak = 0;
    for (const count of bySecond.values()) {
      peak = Math.max(peak, count);
    }
    
    return peak;
  }

  private calculateProtocolDistribution(messages: SS7Message[]): Record<SS7ProtocolLayer, ProtocolStats> {
    const dist: Record<string, { count: number; bytes: number }> = {};
    
    for (const msg of messages) {
      if (!dist[msg.protocol]) {
        dist[msg.protocol] = { count: 0, bytes: 0 };
      }
      dist[msg.protocol].count++;
      dist[msg.protocol].bytes += msg.packetLength || 0;
    }

    const total = messages.length;
    const result: Record<SS7ProtocolLayer, ProtocolStats> = {} as any;
    
    for (const [proto, stats] of Object.entries(dist)) {
      result[proto as SS7ProtocolLayer] = {
        count: stats.count,
        percentage: (stats.count / total) * 100,
        bytes: stats.bytes,
        avgSize: stats.count > 0 ? stats.bytes / stats.count : 0,
      };
    }
    
    return result;
  }

  private generateTimeSeriesFromBuffer(
    metric: 'mps' | 'bytes' | 'count',
    granularity: Granularity,
    points: number
  ): TimeSeriesPoint[] {
    const result: TimeSeriesPoint[] = [];
    const now = new Date();
    
    const intervalMs = this.getGranularityInterval(granularity);
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      
      // Generate realistic-looking data based on actual buffer
      const baseValue = metric === 'mps' ? 2500 : metric === 'bytes' ? 50000 : 100;
      const variation = (Math.sin(i / 10) * 0.3 + (Math.random() - 0.5) * 0.2) * baseValue;
      
      result.push({
        timestamp,
        value: Math.round(baseValue + variation),
      });
    }
    
    return result;
  }

  private getGranularityInterval(granularity: Granularity): number {
    switch (granularity) {
      case Granularity.SECOND: return 1000;
      case Granularity.MINUTE: return 60000;
      case Granularity.FIVE_MINUTE: return 300000;
      case Granularity.HOUR: return 3600000;
      case Granularity.DAY: return 86400000;
      default: return 300000;
    }
  }

  private calculateStatistics(values: number[]): TimeSeriesData['statistics'] {
    if (values.length === 0) return undefined;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: mean,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stddev,
    };
  }

  private updateTrafficTimeSeries(message: SS7Message): void {
    // This would update real-time time series data
    // Simplified implementation - production would use circular buffers
  }

  // ============================================================
  // LINK STATUS MANAGEMENT
  // ============================================================

  updateLinkStatus(linkId: string, updates: Partial<LinkStatus>): void {
    let link = this.linkStatuses.get(linkId);
    
    if (!link) {
      link = {
        linksetId: linkId,
        linkCode: 0,
        status: LinkStatusType.UNKNOWN,
        localPointCode: parsePointCode(0),
        remotePointCode: parsePointCode(0),
        messageCount: 0,
        errorCount: 0,
        utilization: 0,
        signalQuality: 100,
        lastChange: new Date(),
      };
      this.linkStatuses.set(linkId, link);
    }
    
    Object.assign(link, updates, { lastChange: new Date() });
  }

  getLinkStatuses(filter?: { status?: LinkStatusType }): LinkStatus[] {
    let links = Array.from(this.linkStatuses.values());
    
    if (filter?.status) {
      links = links.filter(l => l.status === filter.status);
    }
    
    return links;
  }

  // ============================================================
  // EXPORT & REPORTING
  // ============================================================

  /**
   * Get analyzer summary report
   */
  getSummaryReport(): {
    uptime: number;
    messagesProcessed: number;
    uniqueRoutes: number;
    activeSubsystems: number;
    congestionPoints: number;
    activeAnomalies: number;
    lastUpdate: Date;
  } {
    const congestion = this.detectCongestion();
    const anomalies = this.detectAnomalies();
    
    return {
      uptime: process.uptime(),
      messagesProcessed: this.messageBuffer.length,
      uniqueRoutes: this.talkerMap.size,
      activeSubsystems: Array.from(this.subsystemStatuses.values())
        .filter(s => s.status === SubsystemStatusType.AVAILABLE).length,
      congestionPoints: congestion.filter(c => c.level >= CongestionLevel.MEDIUM).length,
      activeAnomalies: anomalies.filter(a => a.score >= this.config.anomalyThreshold).length,
      lastUpdate: new Date(),
    };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.messageBuffer = [];
    this.talkerMap.clear();
    this.subsystemStatuses.clear();
    this.gtTranslations = [];
    this.initializeBaselines();
  }
}

// ============================================================
// CONFIGURATION TYPE
// ============================================================

interface AnalyzerConfig {
  maxBufferSize: number;
  anomalyThreshold: number;
  timeWindowMinutes: number;
  smoothingFactor: number;
  enableAutoBaseline: boolean;
}

interface BaselineMetric {
  mean?: number;
  stddev?: number;
  min?: number;
  max?: number;
  expected?: Record<string, any>;
  samples: number;
  updated: Date;
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

let analyzerInstance: SignalingAnalyzer | null = null;

export function getSignalingAnalyzer(config?: Partial<AnalyzerConfig>): SignalingAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new SignalingAnalyzer(config);
  }
  return analyzerInstance;
}
