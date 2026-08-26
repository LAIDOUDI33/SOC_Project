/**
 * National SOC Platform - Event Producers
 * Algeria 2026-2030 | High-Throughput Event Publishing
 * 
 * Provides typed event producers for:
 * - Alert lifecycle events
 * - Incident workflow events  
 * - Threat intelligence events
 * - Telecom protocol events
 * - System and audit events
 */

import { getQueueClient, EventType, QueueMessage, PublishOptions } from './client'
import { db } from '../db'

// ===========================================
// Alert Event Producers
// ===========================================

export interface AlertEventData {
  alertId: string
  severity: string
  status: string
  title: string
  source: string
  timestamp: Date
  assigneeId?: string
  incidentId?: string
  metadata?: Record<string, any>
}

export const alertEvents = {
  /**
   * Publish alert created event
   */
  async created(alertData: AlertEventData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ALERT_CREATED, alertData, {
      priority: getSeverityPriority(alertData.severity),
      routingKey: 'alert.created'
    })
  },

  /**
   * Publish alert updated event
   */
  async updated(alertData: Partial<AlertEventData> & { alertId: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ALERT_UPDATED, alertData, {
      routingKey: 'alert.updated'
    })
  },

  /**
   * Publish alert acknowledged event
   */
  async acknowledged(alertData: AlertEventData & { acknowledgedBy: string; acknowledgedAt: Date }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ALERT_ACKNOWLEDGED, alertData, {
      priority: 5,
      routingKey: 'alert.acknowledged'
    })
  },

  /**
   * Publish alert escalated event (high priority)
   */
  async escalated(alertData: AlertEventData & {
    escalatedTo: string
    escalatedBy: string
    reason: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ALERT_ESCALATED, alertData, {
      priority: 8,
      ttl: 300000, // 5 minutes TTL for escalations
      routingKey: 'alert.escalated'
    })
  },

  /**
   * Publish alert closed event
   */
  async closed(alertData: AlertEventData & { closedBy: string; resolution?: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ALERT_CLOSED, alertData, {
      routingKey: 'alert.closed'
    })
  },

  /**
   * Bulk publish multiple alerts (optimized)
   */
  async bulkCreated(alerts: AlertEventData[]): Promise<number> {
    const queue = getQueueClient()
    
    // Use transaction-like publishing
    let publishedCount = 0
    for (const alert of alerts) {
      try {
        await queue.publish(EventType.ALERT_BULK_CREATED, alert, {
          priority: getSeverityPriority(alert.severity),
          persistent: true
        })
        publishedCount++
      } catch (error) {
        console.error('[AlertEvents] Failed to publish bulk alert:', error)
      }
    }
    
    return publishedCount
  }
}

// ===========================================
// Incident Event Producers
// ===========================================

export interface IncidentEventData {
  incidentId: string
  title: string
  severity: string
  status: string
  type: string
  assigneeId?: string
  creatorId: string
  slaDeadline?: Date
  metadata?: Record<string, any>
}

export const incidentEvents = {
  /**
   * Publish incident created event
   */
  async created(incidentData: IncidentEventData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_CREATED, incidentData, {
      priority: getIncidentPriority(incidentData.severity),
      routingKey: 'incident.created'
    })
  },

  /**
   * Publish incident updated event
   */
  async updated(incidentData: Partial<IncidentEventData> & { incidentId: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_UPDATED, incidentData, {
      routingKey: 'incident.updated'
    })
  },

  /**
   * Publish status change event
   */
  async statusChanged(incidentData: IncidentEventData & {
    previousStatus: string
    changedBy: string
    reason?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_STATUS_CHANGED, incidentData, {
      priority: 6,
      routingKey: 'incident.status_changed'
    })
  },

  /**
   * Publish assignment event
   */
  async assigned(incidentData: IncidentEventData & {
    assignedBy: string
    previousAssignee?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_ASSIGNED, incidentData, {
      routingKey: 'incident.assigned'
    })
  },

  /**
   * Publish escalation event (critical priority)
   */
  async escalated(incidentData: IncidentEventData & {
    escalatedFrom: string
    escalatedTo: string
    escalatedBy: string
    reason: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_ESCALATED, incidentData, {
      priority: 9,
      ttl: 600000, // 10 minutes TTL
      routingKey: 'incident.escalated'
    })
  },

  /**
   * Publish resolution event
   */
  async resolved(incidentData: IncidentEventData & {
    resolvedBy: string
    resolution: string
    resolutionTimeMs: number
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_RESOLVED, incidentData, {
      routingKey: 'incident.resolved'
    })
  },

  /**
   * Publish closure event
   */
  async closed(incidentData: IncidentEventData & {
    closedBy: string
    closureReason: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_CLOSED, incidentData, {
      routingKey: 'incident.closed'
    })
  },

  /**
   * Publish SLA breach event (highest priority)
   */
  async slaBreach(incidentData: IncidentEventData & {
    breachedSlaType: string
    breachTime: Date
    originalDeadline: Date
    notifyUsers: string[]
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.INCIDENT_SLA_BREACH, incidentData, {
      priority: 10, // Maximum priority
      ttl: 120000, // 2 minutes TTL - needs immediate attention
      routingKey: 'incident.sla_breach'
    })
  }
}

// ===========================================
// Threat Intelligence Event Producers
// ===========================================

export interface ThreatIndicatorData {
  indicatorId: string
  type: string
  value: string
  tlpLevel: string
  source: string
  confidence: number
  isActive: boolean
}

export interface IOCData {
  iocId: string
  type: string
  value: string
  threatType: string
  source: string
  lastSeen?: Date
}

export const threatEvents = {
  /**
   * Publish new threat indicator event
   */
  async indicatorCreated(indicator: ThreatIndicatorData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.THREAT_INDICATOR_CREATED, indicator, {
      routingKey: 'threat.indicator_created'
    })
  },

  /**
   * Publish threat indicator update event
   */
  async indicatorUpdated(indicator: Partial<ThreatIndicatorData> & { indicatorId: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.THREAT_INDICATOR_UPDATED, indicator, {
      routingKey: 'threat.indicator_updated'
    })
  },

  /**
   * Publish indicator activation/reactivation
   */
  async indicatorActivated(indicator: ThreatIndicatorData & { activatedBy: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.THREAT_INDICATOR_ACTIVATED, indicator, {
      priority: 6,
      routingKey: 'threat.indicator_activated'
    })
  },

  /**
   * Publish new IOC event
   */
  async iocAdded(ioc: IOCData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.IOC_ADDED, ioc, {
      routingKey: 'threat.ioc_added'
    })
  },

  /**
   * Publish IOC revocation event
   */
  async iocRevoked(ioc: IOCData & { revokedBy: string; reason: string }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.IOC_REVOKED, ioc, {
      priority: 7,
      routingKey: 'threat.ioc_revoked'
    })
  },

  /**
   * Publish threat feed received event
   */
  async feedReceived(feedData: {
    feedName: string
    source: string
    indicatorsCount: number
    processingStartedAt: Date
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.THREAT_FEED_RECEIVED, feedData, {
      routingKey: 'threat.feed_received'
    })
  }
}

// ===========================================
// Telecom Protocol Event Producers
// ===========================================

export interface GTPSessionData {
  imsi: string
  msisdn: string
  apn: string
  cellId: string
  lac: string
  sgsnAddress: string
  ggsnAddress: string
  qosProfile: string
  chargingId: string
  ratType: string
}

export interface SS7CallData {
  callingParty: string
  calledParty: string
  imsi?: string
  location?: string
  callType: string
  isupCic?: string
  gsmMapOperation?: string
}

export interface DiameterRequestData {
  sessionId: string
  commandCode: string
  originHost: string
  originRealm: string
  destinationHost?: string
  destinationRealm: string
  applicationId: number
  avps: Record<string, any>
}

export interface RadiusAuthData {
  username: string
  nasIpAddress: string
  nasPort: number
  nasIdentifier: string
  callingStationId?: string
  calledStationId?: string
  authResult: 'ACCEPT' | 'REJECT' | 'CHALLENGE'
  reason?: string
}

export interface SIPRegistrationData {
  uri: string
  contact: string
  userAgent: string
  expires: number
  fromHeader: string
  toHeader: string
  callId: string
}

export const telecomEvents = {
  // GTP Events
  async gtpSessionCreated(session: GTPSessionData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.GTP_SESSION_CREATED, session, {
      priority: 3, // Normal priority for session creation
      routingKey: 'telecom.gtp.session_created',
      ttl: 86400000 // 24 hours TTL
    })
  },

  async gtpSessionDeleted(session: GTPSessionData & {
    deletionCause: string
    durationSeconds: number
    bytesUp: number
    bytesDown: number
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.GTP_SESSION_DELETED, session, {
      routingKey: 'telecom.gtp.session_deleted'
    })
  },

  // SS7 Events
  async ss7CallInitiated(call: SS7CallData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SS7_CALL_INITIATED, call, {
      priority: 4,
      routingKey: 'telecom.ss7.call_initiated'
    })
  },

  async ss7CallTerminated(call: SS7CallData & {
    durationSeconds: number
    releaseCause: string
    isSuccessful: boolean
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SS7_CALL_TERMINATED, call, {
      routingKey: 'telecom.ss7.call_terminated'
    })
  },

  // Diameter Events
  async diameterRequest(request: DiameterRequestData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.DIAMETER_REQUEST, request, {
      priority: 4,
      routingKey: `telecom.diameter.${request.commandCode.toLowerCase()}`
    })
  },

  // RADIUS Events
  async radiusAuth(auth: RadiusAuthData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.RADIUS_AUTH, auth, {
      priority: auth.authResult === 'REJECT' ? 6 : 3,
      routingKey: 'telecom.radius.auth'
    })
  },

  // SIP Events
  async sipRegistration(registration: SIPRegistrationData): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SIP_REGISTRATION, registration, {
      routingKey: 'telecom.sip.registration'
    })
  },

  async sipCallSetup(call: {
    fromUri: string
    toUri: string
    callId: string
    inviteData: Record<string, any>
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SIP_CALL_SETUP, call, {
      priority: 4,
      routingKey: 'telecom.sip.call_setup'
    })
  },

  /**
   * Batch publish telecom events (high-throughput optimized)
   */
  async batchPublish(events: Array<{
    type: EventType
    data: any
    options?: PublishOptions
  }>): Promise<{ success: number; failed: number }> {
    const queue = getQueueClient()
    let success = 0
    let failed = 0

    for (const event of events) {
      try {
        await queue.publish(event.type, event.data, event.options || {})
        success++
      } catch (error) {
        failed++
        if (failed < 10) { // Only log first 10 errors
          console.error('[TelecomEvents] Failed to publish:', error)
        }
      }
    }

    return { success, failed }
  }
}

// ===========================================
// System & Audit Event Producers
// ===========================================

export const systemEvents = {
  /**
   * Publish health check event
   */
  async healthCheck(data: {
    component: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency?: number
    details?: Record<string, any>
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SYSTEM_HEALTH_CHECK, data, {
      routingKey: 'system.health_check'
    })
  },

  /**
   * Publish system metrics event
   */
  async metrics(data: {
    cpu: number
    memory: number
    disk: number
    requestsPerSecond: number
    activeConnections: number
    timestamp: Date
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.SYSTEM_METRICS, data, {
      ttl: 60000, // 1 minute TTL for metrics
      routingKey: 'system.metrics'
    })
  },

  /**
   * Publish user action for audit logging
   */
  async userAction(data: {
    userId: string
    action: string
    resource: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
    details?: Record<string, any>
  }): Promise<void> {
    const queue = getQueueClient()
    await Promise.all([
      queue.publish(EventType.USER_ACTION, data, {
        routingKey: 'user.action'
      }),
      queue.publish(EventType.AUDIT_LOG, data, {
        persistent: true, // Audit logs must never be lost
        routingKey: 'audit.log'
      })
    ])
  },

  /**
   * Publish notification sent event
   */
  async notificationSent(data: {
    recipientId: string
    channel: 'email' | 'sms' | 'webhook' | 'push' | 'slack'
    subject: string
    template?: string
    success: boolean
    error?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.NOTIFICATION_SENT, data, {
      routingKey: 'notification.sent'
    })
  },

  /**
   * Publish cache invalidation event
   */
  async cacheInvalidation(data: {
    pattern: string
    keys?: string[]
    invalidatedBy: string
    reason?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.CACHE_INVALIDATION, data, {
      exchange: 'soc.cache.invalidations', // Fanout exchange
      routingKey: ''
    })
  },

  /**
   * Publish report generation event
   */
  async reportGenerated(data: {
    reportId: string
    type: string
    format: 'pdf' | 'csv' | 'json'
    generatedBy: string
    parameters: Record<string, any>
    fileSize?: number
    downloadUrl?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.REPORT_GENERATED, data, {
      routingKey: 'reports'
    })
  },

  /**
   * Publish ARPT compliance report event
   */
  async arptReport(data: {
    reportType: string
    periodStart: Date
    periodEnd: Date
    recordsIncluded: number
    submittedBy: string
    submissionUrl?: string
  }): Promise<void> {
    const queue = getQueueClient()
    await queue.publish(EventType.ARPT_REPORT, data, {
      priority: 8,
      persistent: true, // Compliance reports must be preserved
      routingKey: 'arpt.report'
    })
  }
}

// ===========================================
// Utility Functions
// ===========================================

function getSeverityPriority(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 9
    case 'HIGH': return 7
    case 'MEDIUM': return 5
    case 'LOW': return 3
    default: return 1
  }
}

function getIncidentPriority(severity: string): number {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 10
    case 'HIGH': return 8
    case 'MEDIUM': return 6
    case 'LOW': return 4
    default: return 2
  }
}
