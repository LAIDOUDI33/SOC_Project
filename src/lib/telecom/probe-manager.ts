/**
 * National SOC Platform - Telecom Probe Integration
 * 
 * Connects to Djezzy network probes for real-time data:
 * - SS7 Firewall/SIGTRAN Gateway (SS7 messages)
 * - GTP Probe (Gn/Gp interface monitoring)
 * - SIP Probe (IMS/VoLTE call monitoring)
 * - Diameter Probe (Cx/Dx/Rx interfaces)
 * 
 * Supported protocols: SS7/MAP/CAP, GTPv1/v2, SIP, Diameter
 */

import { db } from '@/lib/db';

// ============================================================
// Types & Interfaces
// ============================================================

export interface ProbeConfig {
  id: string;
  name: string;
  type: 'ss7' | 'gtp' | 'sip' | 'diameter';
  host: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'tls' | 'dtls';
  enabled: boolean;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
  filters?: {
    messageTypes?: string[];
    callingParties?: string[];
    calledParties?: string[];
    imsis?: string[];
  };
  rateLimit?: number; // Messages per second
}

export interface ParsedMessage {
  id: string;
  probeId: string;
  timestamp: Date;
  rawMessage: Buffer | string;
  parsedData: Record<string, any>;
  riskScore: number;
  alerts: string[];
  metadata: {
    sourceIP: string;
    destinationIP: string;
    protocol: string;
    processingTime: number;
  };
}

export interface FraudIndicator {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: Record<string, any>;
  recommendedAction: string;
  artpReportable: boolean; // Must report to ARTP within 24h
}

export interface TelecomMetrics {
  ss7: {
    messagesPerSecond: number;
    blockedMessages: number;
    topAttackTypes: Array<{ type: string; count: number }>;
    subscriberRiskScores: { high: number; medium: number; low: number };
  };
  gtp: {
    activeSessions: number;
    dataVolumeGB: number;
    roamingSessions: number;
    anomalyCount: number;
  };
  sip: {
    activeCalls: number;
    fraudSuspectedCalls: number;
    averageCallDuration: number;
    topFraudTypes: Array<{ type: string; count: number }>;
  };
  diameter: {
    activeSessions: number;
    authenticationFailures: number;
    locationUpdates: number;
  };
}

// ============================================================
// Probe Connection Manager
// ============================================================

class ProbeConnectionManager {
  private connections: Map<string, ProbeConnection> = new Map();
  private messageBuffer: ParsedMessage[] = [];
  private bufferFlushInterval: NodeJS.Timer;
  private isProcessing = false;

  constructor() {
    // Flush buffer every 5 seconds or when it reaches 1000 messages
    this.bufferFlushInterval = setInterval(() => this.flushMessageBuffer(), 5000);
  }

  /**
   * Connect to a probe and start receiving messages
   */
  async connect(config: ProbeConfig): Promise<void> {
    if (!config.enabled) {
      console.log(`Probe ${config.id} (${config.type}) is disabled`);
      return;
    }

    console.log(`Connecting to ${config.type} probe: ${config.host}:${config.port}`);

    let connection: ProbeConnection;

    switch (config.type) {
      case 'ss7':
        connection = new SS7ProbeConnection(config);
        break;
      case 'gtp':
        connection = new GTPProbeConnection(config);
        break;
      case 'sip':
        connection = new SIPProbeConnection(config);
        break;
      case 'diameter':
        connection = new DiameterProbeConnection(config);
        break;
      default:
        throw new Error(`Unknown probe type: ${config.type}`);
    }

    await connection.connect();
    
    // Set up message handler
    connection.onMessage(async (message) => {
      await this.handleMessage(message);
    });

    this.connections.set(config.id, connection);
    console.log(`Connected to probe: ${config.name}`);
  }

  /**
   * Disconnect from a probe
   */
  async disconnect(probeId: string): Promise<void> {
    const connection = this.connections.get(probeId);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(probeId);
      console.log(`Disconnected from probe: ${probeId}`);
    }
  }

  /**
   * Handle incoming message from any probe
   */
  private async handleMessage(message: ParsedMessage): Promise<void> {
    try {
      // Parse and enrich the message
      const enrichedMessage = await this.enrichMessage(message);
      
      // Check for fraud indicators
      const fraudIndicators = await this.detectFraud(enrichedMessage);
      
      if (fraudIndicators.length > 0) {
        enrichedMessage.alerts = fraudIndicators.map(f => f.type);
        
        // Create alerts for high-severity fraud
        for (const indicator of fraudIndicators) {
          if (indicator.severity === 'high' || indicator.severity === 'critical') {
            await this.createFraudAlert(indicator, enrichedMessage);
          }
        }
      }

      // Add to buffer for batch processing
      this.messageBuffer.push(enrichedMessage);

      // Flush if buffer is full
      if (this.messageBuffer.length >= 1000) {
        await this.flushMessageBuffer();
      }

    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Enrich message with additional context
   */
  private async enrichMessage(message: ParsedMessage): Promise<ParsedMessage> {
    const { parsedData } = message;

    // Look up subscriber info if IMSI/MSISDN present
    if (parsedData.imsi || parsedData.msisdn) {
      const subscriber = await db.subscriber.findFirst({
        where: {
          OR: [
            { imsi: parsedData.imsi },
            { msisdn: parsedData.msisdn }
          ]
        }
      });

      if (subscriber) {
        parsedData.subscriberInfo = {
          riskScore: subscriber.riskScore,
          status: subscriber.subscriberStatus,
          isRoaming: subscriber.isRoaming,
          homeRegion: subscriber.region,
        };

        // Update risk score based on this activity
        await this.updateSubscriberRisk(subscriber.id, message);
      }
    }

    return message;
  }

  /**
   * Detect fraud patterns in message
   */
  private async detectFraud(message: ParsedMessage): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];
    const { parsedData, probeId } = message;

    switch (probeId.split('-')[0]) {
      case 'ss7':
        indicators.push(...await this.detectSS7Fraud(parsedData));
        break;
      case 'gtp':
        indicators.push(...await this.detectGTPFraud(parsedData));
        break;
      case 'sip':
        indicators.push(...await this.detectSIPFraud(parsedData));
        break;
      case 'diameter':
        indicators.push(...await this.detectDiameterFraud(parsedData));
        break;
    }

    return indicators;
  }

  /**
   * SS7-specific fraud detection
   */
  private async detectSS7Fraud(data: Record<string, any>): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    // SIM Swap Detection
    if (data.operationCode === 'UpdateLocation' && data.imsi) {
      const recentUpdates = await this.countRecentOperations(data.imsi, 'UpdateLocation', 3600000); // 1 hour
      if (recentUpdates > 3) {
        indicators.push({
          id: `sim-swap-${Date.now()}`,
          type: 'SIM_SWAP_SUSPECTED',
          severity: 'critical',
          confidence: Math.min(recentUpdates * 20, 100),
          description: `Multiple location updates for IMSI ${data.imsi} in last hour`,
          evidence: { imsi: data.imsi, updateCount: recentUpdates },
          recommendedAction: 'BLOCK_SIM_AND_INVESTIGATE',
          artpReportable: true
        });
      }
    }

    // IRSF (International Revenue Share Fraud) Detection
    if (data.calledParty?.startsWith('+') && !data.calledParty?.startsWith('+213')) {
      // International call from potentially compromised subscriber
      const subscriber = await this.getSubscriberByIMSI(data.imsi);
      if (subscriber && subscriber.riskScore > 60) {
        indicators.push({
          id: `irsf-${Date.now()}`,
          type: 'IRSF_SUSPECTED',
          severity: 'high',
          confidence: subscriber.riskScore,
          description: `High-risk subscriber making international calls`,
          evidence: {
            imsi: data.imsi,
            calledParty: data.calledParty,
            callerRiskScore: subscriber.riskScore
          },
          recommendedAction: 'MONITOR_AND_LIMIT',
          artpReportable: true
        });
      }
    }

    // Wangiri Detection (short repeated calls)
    if (data.callDuration < 3 && data.calledParty) {
      const recentShortCalls = await this.countShortCalls(data.callingParty, data.calledParty, 3600000);
      if (recentShortCalls > 20) {
        indicators.push({
          id: `wangiri-${Date.now()}`,
          type: 'WANGIRI_PATTERN',
          severity: 'medium',
          confidence: Math.min(recentShortCalls * 4, 100),
          description: `Wangiri pattern detected: ${recentShortCalls} short calls to same number`,
          evidence: {
            callingParty: data.callingParty,
            calledParty: data.calledParty,
            shortCallCount: recentShortCalls
          },
          recommendedAction: 'INVESTIGATE_AND_BLOCK',
          artpReportable: false
        });
      }
    }

    return indicators;
  }

  /**
   * GTP-specific fraud detection
   */
  private async detectGTPFraud(data: Record<string, any>): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    // Data Tunneling Detection (unusual APN usage)
    if (data.apn && !data.apn.includes('djezzy') && !data.apn.includes('internet')) {
      indicators.push({
        id: `tunnel-${Date.now()}`,
        type: 'DATA_TUNNELING_SUSPECTED',
        severity: 'high',
        confidence: 75,
        description: `Suspicious APN usage: ${data.apn}`,
        evidence: {
          imsi: data.imsi,
          apn: data.apn,
          ipAddress: data.ipAddress
        },
        recommendedAction: 'INVESTIGATE_APN_ACCESS',
        artpReportable: false
      });
    }

    // Roaming Abuse Detection
    if (data.isRoaming && data.bytesUp > 1073741824) { // > 1GB while roaming
      indicators.push({
        id: `roaming-abuse-${Date.now()}`,
        type: 'ROAMING_DATA_ABUSE',
        severity: 'medium',
        confidence: 80,
        description: `High data volume while roaming: ${(data.bytesUp / 1073741824).toFixed(2)} GB`,
        evidence: {
          imsi: data.imsi,
          bytesUp: data.bytesUp,
          visitedNetwork: data.visitedPLMN
        },
        recommendedAction: 'NOTIFY_SUBSCRIBER_AND_MONITOR',
        artpReportable: false
      });
    }

    // IMEI Cloning Detection
    if (data.imei) {
      const sessionsWithIMEI = await this.countActiveSessionsByIMEI(data.imei);
      if (sessionsWithIMEI > 1) {
        indicators.push({
          id: `imei-clone-${Date.now()}`,
          type: 'IMEI_CLONING_DETECTED',
          severity: 'critical',
          confidence: 95,
          description: `Same IMEI active on multiple sessions: ${data.imei}`,
          evidence: {
            imei: data.imei,
            sessionCount: sessionsWithIMEI,
            imsi: data.imsi
          },
          recommendedAction: 'IMMEDIATE_BLOCK_AND_INVESTIGATE',
          artpReportable: true
        });
      }
    }

    return indicators;
  }

  /**
   * SIP-specific fraud detection
   */
  private async detectSIPFraud(data: Record<string, any>): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    // PBX Hijacking Detection
    if (data.userAgent?.toLowerCase().includes('asterisk') || 
        data.userAgent?.toLowerCase().includes('freepbx')) {
      // Check if this is expected behavior for the subscriber
      const subscriber = await this.getSubscriberByMSISDN(data.callingParty);
      if (subscriber && !subscriber.metadata?.pbxAllowed) {
        indicators.push({
          id: `pbx-hijack-${Date.now()}`,
          type: 'PBX_HIJACKING_SUSPECTED',
          severity: 'high',
          confidence: 70,
          description: `PBX software detected from unexpected source`,
          evidence: {
            callingParty: data.callingParty,
            userAgent: data.userAgent,
            subscriberType: subscriber.profileData?.type
          },
          recommendedAction: 'VERIFY_WITH_SUBSCRIBER',
          artpReportable: false
        });
      }
    }

    // Call Duration Anomaly (very long calls - potential premium rate abuse)
    if (data.duration > 7200) { // > 2 hours
      indicators.push({
        id: `long-call-${Date.now()}`,
        type: 'PREMIUM_RATE_ABUSE_SUSPECTED',
        severity: 'medium',
        confidence: 60,
        description: `Unusually long call duration: ${Math.floor(data.duration / 3600)}h ${Math.floor((data.duration % 3600) / 60)}m`,
        evidence: {
          callingParty: data.callingParty,
          calledParty: data.calledParty,
          duration: data.duration
        },
        recommendedAction: 'REVIEW_CALL_RECORDING',
        artpReportable: false
      });
    }

    // Call Spam Detection (high call volume in short time)
    const recentCalls = await this.countRecentCallsFromNumber(data.callingParty, 300000); // 5 minutes
    if (recentCalls > 50) {
      indicators.push({
        id: `call-spam-${Date.now()}`,
        type: 'CALL_SPAM_DETECTED',
        severity: 'high',
        confidence: Math.min(recentCalls, 100),
        description: `Abnormally high call volume: ${recentCalls} calls in 5 minutes`,
        evidence: {
          callingParty: data.callingParty,
          callCount: recentCalls
        },
        recommendedAction: 'RATE_LIMIT_OR_BLOCK',
        artpReportable: true
      });
    }

    return indicators;
  }

  /**
   * Diameter-specific fraud detection
   */
  private async detectDiameterFraud(data: Record<string, any>): Promise<FraudIndicator[]> {
    const indicators: FraudIndicator[] = [];

    // Authentication Storm Detection
    if (data.commandCode === 'Authentication-Information') {
      const authAttempts = await this.countRecentAuthAttempts(data.imsi, 60000); // 1 minute
      if (authAttempts > 10) {
        indicators.push({
          id: `auth-storm-${Date.now()}`,
          type: 'AUTHENTICATION_STORM',
          severity: 'critical',
          confidence: Math.min(authAttempts * 8, 100),
          description: `Excessive authentication attempts for IMSI: ${authAttempts} in 1 minute`,
          evidence: {
            imsi: data.imsi,
            attemptCount: authAttempts
          },
          recommendedAction: 'BLOCK_IMSI_TEMPORARILY',
          artpReportable: true
        });
      }
    }

    // Location Update Storm (possible tracking avoidance)
    if (data.commandCode === 'Update-Location') {
      const locationUpdates = await this.countLocationUpdates(data.imsi, 600000); // 10 minutes
      if (locationUpdates > 20) {
        indicators.push({
          id: `location-storm-${Date.now()}`,
          type: 'LOCATION_UPDATE_ABUSE',
          severity: 'medium',
          confidence: Math.min(locationUpdates * 4, 100),
          description: `Excessive location updates: ${locationUpdates} in 10 minutes`,
          evidence: {
            imsi: data.imsi,
            updateCount: locationUpdates
          },
          recommendedAction: 'MONITOR_FOR_TRACKING_AVOIDANCE',
          artpReportable: false
        });
      }
    }

    return indicators;
  }

  /**
   * Create security alert from fraud indicator
   */
  private async createFraudAlert(indicator: FraudIndicator, message: ParsedMessage): Promise<void> {
    try {
      await db.alert.create({
        data: {
          title: `[FRAUD] ${indicator.type.replace(/_/g, ' ')}`,
          description: indicator.description,
          severity: indicator.severity.toUpperCase() as any,
          status: 'NEW',
          source: `TELECOM_${message.probeId.split('-')[0].toUpperCase()}_PROBE`,
          category: 'FRAUD_DETECTION',
          rawEvent: {
            ...indicator.evidence,
            messageId: message.id,
            probeId: message.probeId,
            timestamp: message.timestamp,
            confidence: indicator.confidence
          },
          mitreTechniques: ['T1589'], // Steal or Forge Authentication Information
          tags: ['fraud', 'telecom', indicator.type.toLowerCase(), indicator.severity],
          context: {
            recommendedAction: indicator.recommendedAction,
            artpReportable: indicator.artpReportable,
            confidence: indicator.confidence
          }
        }
      });

      // If ARTP reportable, create incident
      if (indicator.artpReportable) {
        await this.createARTPIncident(indicator, message);
      }

    } catch (error) {
      console.error('Failed to create fraud alert:', error);
    }
  }

  /**
   * Create ARTP-reportable incident
   */
  private async createARTPIncident(indicator: FraudIndicator, message: ParsedMessage): Promise<void> {
    // Check if similar incident already exists
    const existingIncident = await db.incident.findFirst({
      where: {
        title: { contains: indicator.type },
        status: { notIn: ['RESOLVED', 'CLOSED'] }
      }
    });

    if (!existingIncident) {
      await db.incident.create({
        data: {
          tatcCode: `TATC-${Date.now().toString(36).toUpperCase()}`,
          title: `[ARTP] ${indicator.type.replace(/_/g, ' ')}`,
          description: indicator.description,
          severity: indicator.severity.toUpperCase() as any,
          phase: 'DETECTION',
          source: 'AUTOMATED_FRAUD_DETECTION',
          impactAssessment: `Potential financial loss and regulatory non-compliance. Confidence: ${indicator.confidence}%`,
          affectedAssets: [message.probeId],
          artifacts: {
            fraudIndicator: indicator,
            sourceMessage: message.parsedData,
            evidence: indicator.evidence
          },
          tags: ['artp', 'fraud', 'telecom', 'regulatory']
        }
      });
    }
  }

  /**
   * Flush message buffer to database
   */
  private async flushMessageBuffer(): Promise<void> {
    if (this.isProcessing || this.messageBuffer.length === 0) return;

    this.isProcessing = true;
    const messagesToProcess = [...this.messageBuffer];
    this.messageBuffer = [];

    try {
      // Batch insert into appropriate tables based on probe type
      for (const message of messagesToProcess) {
        const probeType = message.probeId.split('-')[0];

        switch (probeType) {
          case 'ss7':
            await this.insertSS7Message(message);
            break;
          case 'gtp':
            await this.insertGTPSession(message);
            break;
          case 'sip':
            await this.insertSIPSession(message);
            break;
          case 'diameter':
            await this.insertDiameterSession(message);
            break;
        }
      }

      console.log(`Processed ${messagesToProcess.length} messages`);

    } catch (error) {
      console.error('Error flushing message buffer:', error);
      // Re-add failed messages back to buffer
      this.messageBuffer.unshift(...messagesToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Insert SS7 message into database
   */
  private async insertSS7Message(message: ParsedMessage): Promise<void> {
    const { parsedData, metadata } = message;
    
    await db.sS7Message.create({
      data: {
        messageType: parsedData.messageType || 'UNKNOWN',
        callingParty: parsedData.callingParty,
        calledParty: parsedData.calledParty,
        gttAddress: parsedData.gttAddress,
        imsi: parsedData.imsi,
        msisdn: parsedData.msisdn,
        isBlocked: message.alerts.length > 0,
        blockReason: message.alerts.join(', ') || null,
        anomalyScore: message.riskScore,
        rawMessage: Buffer.isBuffer(message.rawMessage) ? message.rawMessage : Buffer.from(message.rawMessage),
        parsedFields: parsedData,
        sourceNe: metadata.sourceIP,
        destinationNe: metadata.destinationIP,
        timestamp: message.timestamp
      }
    });
  }

  /**
   * Insert/update GTP session
   */
  private async insertGTPSession(message: ParsedMessage): Promise<void> {
    const { parsedData } = message;
    
    // Update existing session or create new one
    await db.gTPSession.upsert({
      where: { sessionId: parsedData.sessionId },
      update: {
        bytesUp: parsedData.bytesUp || 0,
        bytesDown: parsedData.bytesDown || 0,
        durationSeconds: parsedData.duration || 0,
        anomalyScore: message.riskScore,
        updatedAt: new Date()
      },
      create: {
        sessionId: parsedData.sessionId,
        imsi: parsedData.imsi,
        msisdn: parsedData.msisdn,
        imei: parsedData.imei,
        apn: parsedData.apn,
        sgsnAddress: parsedData.sgsnAddress,
        ggsnAddress: parsedData.ggsnAddress,
        ip_address: parsedData.ipAddress,
        sessionStatus: parsedData.sessionStatus || 'ACTIVE',
        bytes_up: parsedData.bytesUp || 0,
        bytes_down: parsedData.bytesDown || 0,
        duration_seconds: parsedData.duration || 0,
        anomaly_score: message.riskScore,
        rat_type: parsedData.ratType,
        location_info: parsedData.locationInfo,
        started_at: message.timestamp
      }
    });
  }

  /**
   * Insert SIP session
   */
  private async insertSIPSession(message: ParsedMessage): Promise<void> {
    const { parsedData } = message;
    
    await db.sIPSession.create({
      data: {
        callId: parsedData.callId,
        callingParty: parsedData.callingParty,
        calledParty: parsedData.calledParty,
        sipMethod: parsedData.sipMethod,
        sipStatus: parsedData.sipStatus,
        inviteTimestamp: parsedData.inviteTimestamp || message.timestamp,
        connectTimestamp: parsedData.connectTimestamp,
        disconnectTimestamp: parsedData.disconnectTimestamp,
        durationSeconds: parsedData.duration || 0,
        sipServer: metadata.sourceIP,
        userAgent: parsedData.userAgent,
        isFraudSuspected: message.alerts.length > 0,
        fraudType: message.alerts[0] || null,
        rawSip: typeof message.rawMessage === 'string' ? message.rawMessage : message.rawMessage.toString(),
        signalingData: parsedData,
        mediaData: parsedData.mediaData
      }
    });
  }

  /**
   * Insert Diameter session
   */
  private async insertDiameterSession(message: ParsedMessage): Promise<void> {
    const { parsedData } = message;
    
    await db.diameterSession.create({
      data: {
        sessionId: parsedData.sessionId,
        commandCode: parsedData.commandCode,
        applicationId: parsedData.applicationId,
        originHost: parsedData.originHost,
        originRealm: parsedData.originRealm,
        destinationHost: parsedData.destinationHost,
        destinationRealm: parsedData.destinationRealm,
        imsi: parsedData.imsi,
        msisdn: parsedData.msisdn,
        sessionStatus: parsedData.sessionStatus || 'ACTIVE',
        resultCode: parsedData.resultCode,
        avps: parsedData.avps,
        started_at: message.timestamp,
        ended_at: parsedData.endTime
      }
    });
  }

  // Helper methods for fraud detection queries
  private async countRecentOperations(imsi: string, operation: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    const result = await db.sS7Message.count({
      where: {
        imsi,
        messageType: operation,
        timestamp: { gte: since }
      }
    });
    return result;
  }

  private async countShortCalls(calling: string, called: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.sIPSession.count({
      where: {
        callingParty: calling,
        calledParty: called,
        durationSeconds: { lt: 3 },
        inviteTimestamp: { gte: since }
      }
    });
  }

  private async countActiveSessionsByIMEI(imei: string): Promise<number> {
    return await db.gTPSession.count({
      where: {
        imei,
        sessionStatus: 'ACTIVE'
      }
    });
  }

  private async countRecentAuthAttempts(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.diameterSession.count({
      where: {
        imsi,
        commandCode: 'Authentication-Information',
        started_at: { gte: since }
      }
    });
  }

  private async countLocationUpdates(imsi: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.diameterSession.count({
      where: {
        imsi,
        commandCode: 'Update-Location',
        started_at: { gte: since }
      }
    });
  }

  private async countRecentCallsFromNumber(caller: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return await db.sIPSession.count({
      where: {
        callingParty: caller,
        inviteTimestamp: { gte: since }
      }
    });
  }

  private async getSubscriberByIMSI(imsi: string) {
    return await db.subscriber.findUnique({ where: { imsi } });
  }

  private async getSubscriberByMSISDN(msisdn: string) {
    return await db.subscriber.findUnique({ where: { msisdn } });
  }

  private async updateSubscriberRisk(subscriberId: string, message: ParsedMessage): Promise<void> {
    // Simple risk calculation - can be enhanced with ML model
    const riskIncrease = message.riskScore > 70 ? 5 : message.riskScore > 50 ? 2 : 0;
    
    if (riskIncrease > 0) {
      await db.subscriber.update({
        where: { id: subscriberId },
        data: {
          riskScore: { increment: riskIncrease },
          lastSeen: new Date()
        }
      });
    }
  }

  /**
   * Get aggregated telecom metrics
   */
  async getMetrics(): Promise<TelecomMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const [
      ss7Metrics,
      gtpMetrics,
      sipMetrics,
      diameterMetrics
    ] = await Promise.all([
      // SS7 metrics
      Promise.all([
        db.sS7Message.count({ where: { timestamp: { gte: oneHourAgo } } }),
        db.sS7Message.count({ where: { timestamp: { gte: oneHourAgo }, isBlocked: true } }),
        db.subscriber.count({ where: { riskScore: { gt: 70 }, subscriberStatus: 'ACTIVE' } }),
        db.subscriber.count({ where: { riskScore: { gte: 40, lte: 70 }, subscriberStatus: 'ACTIVE' } })
      ]),
      
      // GTP metrics
      Promise.all([
        db.gTPSession.count({ where: { sessionStatus: 'ACTIVE' } }),
        db.gTPSession.aggregate({ _sum: { bytesUp: true, bytesDown: true } }),
        db.gTPSession.count({ where: { sessionStatus: 'ACTIVE', isRoaming: true } }),
        db.gTPSession.count({ where: { anomalyScore: { gt: 70 }, sessionStatus: 'ACTIVE' } })
      ]),
      
      // SIP metrics
      Promise.all([
        db.sIPSession.count({ where: { disconnectTimestamp: null } }),
        db.sIPSession.count({ where: { isFraudSuspected: true, disconnectTimestamp: { gte: oneHourAgo } } }),
        db.sIPSession.aggregate({ _avg: { durationSeconds: true } })
      ]),
      
      // Diameter metrics
      Promise.all([
        db.diameterSession.count({ where: { sessionStatus: 'ACTIVE' } }),
        db.diameterSession.count({ where: { resultCode: { ne: '2001' }, started_at: { gte: oneHourAgo } } }),
        db.diameterSession.count({ where: { commandCode: 'Update-Location', started_at: { gte: oneHourAgo } } })
      ])
    ]);

    return {
      ss7: {
        messagesPerSecond: Math.round(ss7Metrics[0] / 3600),
        blockedMessages: ss7Metrics[1],
        topAttackTypes: [], // Would need aggregation query
        subscriberRiskScores: {
          high: ss7Metrics[2],
          medium: ss7Metrics[3],
          low: 0 // Calculate
        }
      },
      gtp: {
        activeSessions: gtpMetrics[0],
        dataVolumeGB: Number(((gtpMetrics[1]._sum.bytesUp || 0) + (gtpMetrics[1]._sum.bytesDown || 0)) / 1073741824).toFixed(2),
        roamingSessions: gtpMetrics[2],
        anomalyCount: gtpMetrics[3]
      },
      sip: {
        activeCalls: sipMetrics[0],
        fraudSuspectedCalls: sipMetrics[1],
        averageCallDuration: Math.round(sipMetrics[2]._avg.durationSeconds || 0),
        topFraudTypes: []
      },
      diameter: {
        activeSessions: diameterMetrics[0],
        authenticationFailures: diameterMetrics[1],
        locationUpdates: diameterMetrics[2]
      }
    };
  }

  /**
   * Get all connected probes status
   */
  getConnectionStatus(): Array<{ id: string; name: string; type: string; status: string; messagesProcessed: number }> {
    return Array.from(this.connections.entries()).map(([id, conn]) => ({
      id,
      name: conn.config.name,
      type: conn.config.type,
      status: conn.isConnected ? 'connected' : 'disconnected',
      messagesProcessed: conn.messagesProcessed
    }));
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    clearInterval(this.bufferFlushInterval);
    
    // Flush remaining messages
    await this.flushMessageBuffer();
    
    // Disconnect all probes
    for (const [id] of this.connections) {
      await this.disconnect(id);
    }
  }
}

// ============================================================
// Base Probe Connection Class
// ============================================================

abstract class ProbeConnection {
  config: ProbeConfig;
  isConnected = false;
  messagesProcessed = 0;
  private messageHandlers: ((message: ParsedMessage) => void)[] = [];

  constructor(config: ProbeConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  onMessage(handler: (message: ParsedMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  protected emitMessage(message: ParsedMessage): void {
    this.messagesProcessed++;
    this.messageHandlers.forEach(handler => handler(message));
  }
}

// ============================================================
// SS7 Probe Connection Implementation
// ============================================================

class SS7ProbeConnection extends ProbeConnection {
  private socket?: any;
  private parser?: any;

  async connect(): Promise<void> {
    // In production, this would connect to actual SS7 firewall/SIGTRAN gateway
    // For now, we simulate the connection
    console.log(`SS7 Probe connecting to ${this.config.host}:${this.config.port}`);
    this.isConnected = true;
    
    // Start message listener (would be real socket connection in production)
    this.startListening();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    if (this.socket) {
      this.socket.close();
    }
  }

  private startListening(): void {
    // Simulate receiving SS7 messages
    // In production, this would parse ASN.1 encoded MTP3/SCCP/TCAP/MAP messages
    
    setInterval(async () => {
      if (!this.isConnected) return;

      // Generate simulated SS7 message for testing
      const simulatedMessage: ParsedMessage = {
        id: `ss7-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        probeId: this.config.id,
        timestamp: new Date(),
        rawMessage: Buffer.alloc(0), // Would be actual raw SS7 message
        parsedData: {
          messageType: ['SendRoutingInfoForSM', 'UpdateLocation', 'ProvideRoamingNumber'][Math.floor(Math.random() * 3)],
          callingParty: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          calledParty: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          imsi: `21301${Math.floor(Math.random() * 90000000000 + 10000000000)}`,
          globalTitle: 'DJEZZY-SS7-GT',
          sccpCalling: 'HLR-DJEZZY',
          sccpCalled: 'MSC-DJEZZY'
        },
        riskScore: Math.floor(Math.random() * 100),
        alerts: [],
        metadata: {
          sourceIP: this.config.host,
          destinationIP: 'soc-platform',
          protocol: 'M3UA/SCTP',
          processingTime: Math.floor(Math.random() * 10) + 1
        }
      };

      this.emitMessage(simulatedMessage);
    }, 5000); // Every 5 seconds for demo
  }
}

// ============================================================
// GTP Probe Connection Implementation
// ============================================================

class GTPProbeConnection extends ProbeConnection {
  private socket?: any;

  async connect(): Promise<void> {
    console.log(`GTP Probe connecting to ${this.config.host}:${this.config.port}`);
    this.isConnected = true;
    this.startListening();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  private startListening(): void {
    setInterval(async () => {
      if (!this.isConnected) return;

      const simulatedMessage: ParsedMessage = {
        id: `gtp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        probeId: this.config.id,
        timestamp: new Date(),
        rawMessage: '',
        parsedData: {
          sessionId: `gtp-session-${Date.now()}`,
          imsi: `21301${Math.floor(Math.random() * 90000000000 + 10000000000)}`,
          msisdn: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          imei: `35${Math.floor(Math.random() * 90000000000000 + 10000000000000)}`,
          apn: ['internet.djezzy.dz', 'mms.djezzy.dz', 'iot.djezzy.dz'][Math.floor(Math.random() * 3)],
          sgsnAddress: `10.${Math.floor(Math.random() * 255)}.1.1`,
          ggsnAddress: `10.200.${Math.floor(Math.random() * 255)}.1`,
          ipAddress: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          sessionStatus: 'ACTIVE',
          bytesUp: Math.floor(Math.random() * 1073741824), // Up to 1GB
          bytesDown: Math.floor(Math.random() * 5368709120), // Up to 5GB
          ratType: ['UTRAN', 'EUTRAN', 'NR'][Math.floor(Math.random() * 3)],
          isRoaming: Math.random() > 0.8,
          visitedPLMN: Math.random() > 0.8 ? '60302' : undefined // Algeria Mobile roaming
        },
        riskScore: Math.floor(Math.random() * 30), // Lower baseline for GTP
        alerts: [],
        metadata: {
          sourceIP: this.config.host,
          destinationIP: 'soc-platform',
          protocol: 'GTPv2-C',
          processingTime: Math.floor(Math.random() * 5) + 1
        }
      };

      this.emitMessage(simulatedMessage);
    }, 8000);
  }
}

// ============================================================
// SIP Probe Connection Implementation
// ============================================================

class SIPProbeConnection extends ProbeConnection {
  private socket?: any;

  async connect(): Promise<void> {
    console.log(`SIP Probe connecting to ${this.config.host}:${this.config.port}`);
    this.isConnected = true;
    this.startListening();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  private startListening(): void {
    setInterval(async () => {
      if (!this.isConnected) return;

      const callDuration = Math.floor(Math.random() * 7200); // 0-2 hours
      const simulatedMessage: ParsedMessage = {
        id: `sip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        probeId: this.config.id,
        timestamp: new Date(),
        rawMessage: '',
        parsedData: {
          callId: `${Date.now()}@djezzy.dz`,
          callingParty: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          calledParty: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          sipMethod: ['INVITE', 'BYE', 'REGISTER', 'OPTIONS'][Math.floor(Math.random() * 4)],
          sipStatus: Math.random() > 0.1 ? '200 OK' : '404 Not Found',
          inviteTimestamp: new Date(Date.now() - callDuration * 1000),
          connectTimestamp: new Date(Date.now() - callDuration * 1000 + 5000),
          disconnectTimestamp: callDuration > 10 ? new Date() : null,
          duration: callDuration,
          sipServer: `ims-core-${Math.floor(Math.random() * 3) + 1}.djezzy.dz`,
          userAgent: ['Zoiper', 'Linphone', 'MicroSIP', 'Asterisk PBX'][Math.floor(Math.random() * 4)]
        },
        riskScore: Math.floor(Math.random() * 50),
        alerts: [],
        metadata: {
          sourceIP: this.config.host,
          destinationIP: 'soc-platform',
          protocol: 'SIP/2.0/TLS',
          processingTime: Math.floor(Math.random() * 3) + 1
        }
      };

      this.emitMessage(simulatedMessage);
    }, 12000);
  }
}

// ============================================================
// Diameter Probe Connection Implementation
// ============================================================

class DiameterProbeConnection extends ProbeConnection {
  private socket?: any;

  async connect(): Promise<void> {
    console.log(`Diameter Probe connecting to ${this.config.host}:${this.config.port}`);
    this.isConnected = true;
    this.startListening();
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  private startListening(): void {
    setInterval(async () => {
      if (!this.isConnected) return;

      const commands = [
        'Authentication-Information',
        'Update-Location',
        'Cancel-Location',
        'Insert-Subscriber-Data',
        'Delete-Subscriber-Data',
        'Purge-UE',
        'Reset',
        'Notify'
      ];

      const simulatedMessage: ParsedMessage = {
        id: `diameter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        probeId: this.config.id,
        timestamp: new Date(),
        rawMessage: '',
        parsedData: {
          sessionId: `diameter-sess-${Date.now()}`,
          commandCode: commands[Math.floor(Math.random() * commands.length)],
          applicationId: [16777216, 16777250, 16777251][Math.floor(Math.random() * 3)], // Cx/Dx/Sh
          originHost: `hss-${Math.floor(Math.random() * 3) + 1}.djezzy.dz`,
          originRealm: 'djezzy.dz',
          destinationHost: `mme-${Math.floor(Math.random() * 5) + 1}.djezzy.dz`,
          destinationRealm: 'djezzy.dz',
          imsi: `21301${Math.floor(Math.random() * 90000000000 + 10000000000)}`,
          msisdn: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
          sessionStatus: 'ACTIVE',
          resultCode: Math.random() > 0.05 ? '2001' : '5001', // DIAMETER_SUCCESS or DIAMETER_UNABLE_TO_COMPLY
          avps: {
            'User-Name': `21301${Math.floor(Math.random() * 90000000000 + 10000000000)}`,
            'Public-Identity': `sip:+213${Math.floor(Math.random() * 900000000 + 500000000)}@djezzy.dz`,
            'Visited-PLMN-Id': Math.random() > 0.7 ? '60302' : '60301',
            'RAT-Type': Math.floor(Math.random() * 6)
          }
        },
        riskScore: Math.floor(Math.random() * 25),
        alerts: [],
        metadata: {
          sourceIP: this.config.host,
          destinationIP: 'soc-platform',
          protocol: 'Diameter/TCP',
          processingTime: Math.floor(Math.random() * 4) + 1
        }
      };

      this.emitMessage(simulatedMessage);
    }, 15000);
  }
}

// Export singleton instance
export const probeManager = new ProbeConnectionManager();

// Export types
export type { ProbeConfig, ParsedMessage, FraudIndicator, TelecomMetrics };
