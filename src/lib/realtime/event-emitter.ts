/**
 * National SOC Platform - Real-time Event Emitter Integration
 * 
 * Provides helper functions for API routes to emit real-time events
 * when data changes. This bridges the gap between REST API operations
 * and SSE streaming.
 * 
 * Usage in API routes:
 * ```typescript
 * import { emitIncidentCreated, emitThreatIOCAdded } from '@/lib/realtime/event-emitter';
 * 
 * // After creating an incident:
 * await emitIncidentCreated(newIncident, request.user.userId);
 * 
 * // After adding an IOC:
 * await emitThreatIOCAdded(newIOC, request.user.userId);
 * ```
 * 
 * @module lib/realtime/event-emitter
 * @version 1.0.0
 */

import { sseManager } from './sse-manager';

// ============================================================
// INCIDENT EVENT EMITTERS
// ============================================================

/**
 * Emit event when a new incident is created
 */
export async function emitIncidentCreated(
  incidentData: {
    id: string;
    tatcCode?: string;
    title: string;
    severity: string;
    status: string;
    subscribersAffected?: number;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitIncidentUpdate({
    ...incidentData,
    action: 'created',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'created');
  
  console.log(`[SSE-EMIT] Incident created: ${incidentData.id} (${incidentData.tatcCode})`);
}

/**
 * Emit event when an incident is updated
 */
export async function emitIncidentUpdated(
  incidentData: {
    id: string;
    tatcCode?: string;
    title: string;
    severity: string;
    status: string;
    phase?: string;
    changedFields?: string[];
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitIncidentUpdate({
    ...incidentData,
    action: 'updated',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'updated');
  
  console.log(`[SSE-EMIT] Incident updated: ${incidentData.id}`);
}

/**
 * Emit event when incident status changes
 */
export async function emitIncidentStatusChanged(
  incidentData: {
    id: string;
    tatcCode?: string;
    title: string;
    previousStatus: string;
    newStatus: string;
    reason?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitIncidentUpdate({
    ...incidentData,
    action: 'status_changed',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'status_changed');
  
  console.log(`[SSE-EMIT] Incident ${incidentData.id} status: ${incidentData.previousStatus} → ${incidentData.newStatus}`);
}

/**
 * Emit event when a comment/update is added to an incident
 */
export async function emitIncidentCommentAdded(
  incidentData: {
    id: string;
    tatcCode?: string;
    commentId: string;
    author: string;
    contentPreview: string;
    isInternal: boolean;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitIncidentUpdate({
    ...incidentData,
    action: 'comment_added',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'comment');
  
  console.log(`[SSE-EMIT] Comment added to incident: ${incidentData.id}`);
}

/**
 * Emit event when an alert is linked to an incident
 */
export async function emitAlertLinkedToIncident(
  incidentData: {
    id: string;
    tatcCode?: string;
    alertId: string;
    alertTitle: string;
    alertSeverity: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitIncidentUpdate({
    ...incidentData,
    action: 'alert_linked',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'alert_linked');
  
  console.log(`[SSE-EMIT] Alert ${incidentData.alertId} linked to incident ${incidentData.id}`);
}

// ============================================================
// THREAT/IOC EVENT EMITTERS
// ============================================================

/**
 * Emit event when a new threat indicator is added
 */
export async function emitThreatIndicatorAdded(
  indicatorData: {
    id: string;
    type: string;
    value: string;
    threatLevel?: string;
    source?: string;
    confidence?: number;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitThreatUpdate({
    ...indicatorData,
    action: 'indicator_added',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'indicator_added');
  
  console.log(`[SSE-EMIT] Threat indicator added: ${indicatorData.type}:${indicatorData.value}`);
}

/**
 * Emit event when a new IOC is added
 */
export async function emitThreatIOCAdded(
  iocData: {
    id: string;
    type: string;
    value: string;
    campaignId?: string;
    tlpLevel?: string;
    validity?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitThreatUpdate({
    ...iocData,
    action: 'ioc_created',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'ioc_created');
  
  console.log(`[SSE-EMIT] IOC added: ${iocData.type}:${iocData.value}`);
}

/**
 * Emit event when an IOC validation status changes
 */
export async function emitIOCValidated(
  iocData: {
    id: string;
    type: string;
    value: string;
    previousValidity: string;
    newValidity: string;
    validatedBy?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitThreatUpdate({
    ...iocData,
    action: 'validated',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'validated');
  
  console.log(`[SSE-EMIT] IOC validated: ${iocData.id} - ${iocData.previousValidity} → ${iocData.newValidity}`);
}

/**
 * Emit event when threat level changes
 */
export async function emitThreatLevelChanged(
  threatData: {
    id: string;
    type: string;
    previousLevel: string;
    newLevel: string;
    reason?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitThreatUpdate({
    ...threatData,
    action: 'level_changed',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'level_changed');
  
  console.log(`[SSE-EMIT] Threat level changed: ${threatData.id} - ${threatData.previousLevel} → ${threatData.newLevel}`);
}

// ============================================================
// HUNT SESSION EVENT EMITTERS
// ============================================================

/**
 * Emit event when a hunt session is created
 */
export async function emitHuntSessionCreated(
  sessionData: {
    id: string;
    name: string;
    analystId: string;
    analystName?: string;
    queryType?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitHuntUpdate({
    ...sessionData,
    action: 'session_created',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'session_created');
  
  console.log(`[SSE-EMIT] Hunt session created: ${sessionData.id}`);
}

/**
 * Emit event when hunt session is updated
 */
export async function emitHuntSessionUpdated(
  sessionData: {
    id: string;
    name: string;
    status: string;
    resultsCount?: number;
    duration?: number;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitHuntUpdate({
    ...sessionData,
    action: 'updated',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'updated');
}

/**
 * Emit event when a hunting finding is discovered
 */
export async function emitHuntFindingDiscovered(
  findingData: {
    sessionId: string;
    sessionName: string;
    findingId: string;
    title: string;
    severity: string;
    iocType?: string;
    iocValue?: string;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitHuntUpdate({
    ...findingData,
    action: 'finding',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'finding');
  
  console.log(`[SSE-EMIT] Hunt finding discovered: ${findingData.findingId} in session ${findingData.sessionId}`);
}

/**
 * Emit event for hunt progress updates (batch processing)
 */
export async function emitHuntProgressUpdate(
  progressData: {
    sessionId: string;
    stage: string;
    progress: number; // 0-100
    totalItems: number;
    processedItems: number;
    estimatedRemaining?: number;
  },
  triggeredBy?: string
): Promise<void> {
  sseManager.emitHuntUpdate({
    ...progressData,
    action: 'progress',
    timestamp: new Date().toISOString(),
    triggeredBy
  }, 'progress');
}

// ============================================================
// SYSTEM NOTIFICATION EMITTERS
// ============================================================

/**
 * Emit a system notification to all subscribers
 */
export async function emitSystemNotification(
  notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    source?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<void> {
  sseManager.broadcast({
    event: 'system:notification',
    data: {
      ...notification,
      timestamp: new Date().toISOString()
    },
    targetChannels: ['notifications', '*']
  });
  
  console.log(`[SSE-EMIT] System notification: [${notification.type?.toUpperCase()}] ${notification.title}`);
}

/**
 * Emit alert burst warning (multiple high-severity alerts in short time)
 */
export async function emitAlertBurstWarning(
  burstData: {
    count: number;
    timeframeSeconds: number;
    averageSeverity: string;
    affectedSources: string[];
  }
): Promise<void> {
  sseManager.broadcast({
    event: 'system:alert_burst',
    data: {
      ...burstData,
      timestamp: new Date().toISOString(),
      recommendation: 'Consider escalating to incident if pattern continues'
    },
    targetChannels: ['alerts', 'incidents', '*']
  });
  
  console.warn(`[SSE-EMIT] Alert burst detected: ${burstData.count} alerts in ${burstData.timeframeSeconds}s`);
}

// ============================================================
// EXPORT ALL
// ============================================================

export default {
  // Incident events
  emitIncidentCreated,
  emitIncidentUpdated,
  emitIncidentStatusChanged,
  emitIncidentCommentAdded,
  emitAlertLinkedToIncident,
  
  // Threat events
  emitThreatIndicatorAdded,
  emitThreatIOCAdded,
  emitIOCValidated,
  emitThreatLevelChanged,
  
  // Hunt events
  emitHuntSessionCreated,
  emitHuntSessionUpdated,
  emitHuntFindingDiscovered,
  emitHuntProgressUpdate,
  
  // System events
  emitSystemNotification,
  emitAlertBurstWarning
};
