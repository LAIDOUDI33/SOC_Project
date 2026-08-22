/**
 * National SOC Platform - Real-time Stream API
 * 
 * Primary SSE endpoint for live dashboard updates.
 * Supports multiple channels for different data types:
 * - alerts: New alerts, status changes, escalations
 * - incidents: Incident lifecycle updates
 * - metrics: KPI changes, threshold breaches
 * - health: System component status changes
 * - threats: New IOCs, threat indicator updates
 * - telecom: SS7/GTP/SIP anomalies
 * 
 * Usage: GET /api/stream?channels=alerts,metrics,health
 */

import { NextRequest } from 'next/server';
import { createSSEConnection } from '@/lib/sse/utils';
import { db } from '@/lib/db';

// Configuration for each channel
const CHANNEL_CONFIG = {
  alerts: {
    pollInterval: 2000, // 2 seconds
    description: 'Real-time alert updates'
  },
  incidents: {
    pollInterval: 5000, // 5 seconds
    description: 'Incident status changes'
  },
  metrics: {
    pollInterval: 10000, // 10 seconds
    description: 'KPI and metric updates'
  },
  health: {
    pollInterval: 15000, // 15 seconds
    description: 'System health monitoring'
  },
  threats: {
    pollInterval: 30000, // 30 seconds
    description: 'Threat intelligence updates'
  },
  telecom: {
    pollInterval: 5000, // 5 seconds
    description: 'Telecom security events'
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const channelsParam = searchParams.get('channels') || 'all';
  
  // Parse and validate channels
  const requestedChannels = channelsParam.split(',').map(c => c.trim()).filter(Boolean);
  const validChannels = requestedChannels.filter(c => c === 'all' || CHANNEL_CONFIG[c as keyof typeof CHANNEL_CONFIG]);
  
  if (validChannels.length === 0) {
    return Response.json(
      { error: 'No valid channels specified', available: Object.keys(CHANNEL_CONFIG) },
      { status: 400 }
    );
  }

  // Create SSE connection with channels
  const { response, sessionId } = createSSEConnection(validChannels);

  // Start data polling for each channel with cleanup on disconnect
  const connectionIntervals = new Map<string, NodeJS.Timeout>();
  
  for (const channel of validChannels) {
    if (channel === 'all') {
      // Start all channels for this connection
      for (const ch of Object.keys(CHANNEL_CONFIG)) {
        const interval = startChannelPollingForConnection(ch);
        connectionIntervals.set(ch, interval);
      }
      break;
    } else {
      const interval = startChannelPollingForConnection(channel);
      connectionIntervals.set(channel, interval);
    }
  }

  // CRITICAL FIX: Clean up intervals when client disconnects to prevent memory leak
  // The AbortController signal fires when the client disconnects
  if (request.signal) {
    request.signal.addEventListener('abort', () => {
      console.log(`[SSE] Client disconnected, cleaning up ${connectionIntervals.size} polling intervals`);
      for (const [channel, interval] of connectionIntervals) {
        clearInterval(interval);
      }
      connectionIntervals.clear();
    }, { once: true });
  }

  return response;
}

// Track active intervals per connection for proper cleanup
// Format: Map<sessionId, Map<channelName, interval>>
const connectionsIntervals = new Map<string, Map<string, NodeJS.Timeout>>();

/**
 * Start polling for a specific channel (returns interval for cleanup)
 */
function startChannelPollingForConnection(channel: string): NodeJS.Timeout {
  const config = CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG];
  if (!config) {
    throw new Error(`Invalid channel: ${channel}`);
  }

  const interval = setInterval(async () => {
    try {
      await pushChannelUpdate(channel);
    } catch (error) {
      console.error(`Error in ${channel} stream:`, error);
    }
  }, config.pollInterval);

  return interval;
}

/**
 * @deprecated Use startChannelPollingForConnection instead for proper cleanup
 * Start polling for a specific channel (global - no cleanup)
 */
function startChannelPolling(channel: string): void {
  console.warn('[SSE DEPRECATED] startChannelPolling called without connection tracking');
  // This is kept for backward compatibility but should not be used
  const interval = startChannelPollingForConnection(channel);
  
  // Store in a global map (will leak - migrate away from this)
  if (!connectionsIntervals.has('global')) {
    connectionsIntervals.set('global', new Map());
  }
  connectionsIntervals.get('global')!.set(channel, interval);
}

/**
 * @deprecated Use connection-specific polling instead
 * Start all channel polls globally
 */
function startAllChannels(): void {
  console.warn('[SDE DEPRECATED] startAllChannels called without connection tracking');
  for (const channel of Object.keys(CHANNEL_CONFIG)) {
    startChannelPolling(channel);
  }
}

/**
 * Clean up all intervals for a specific connection
 */
function cleanupConnection(sessionId: string): void {
  const connectionData = connectionsIntervals.get(sessionId);
  if (connectionData) {
    for (const [channel, interval] of connectionData) {
      clearInterval(interval);
    }
    connectionData.clear();
    connectionsIntervals.delete(sessionId);
  }
}

/**
 * Get count of active connections (for monitoring)
 */
export function getActiveConnectionsCount(): number {
  return connectionsIntervals.size;
}

/**
 * Push update for a specific channel type
 */
async function pushChannelUpdate(channel: string): Promise<void> {
  const { broadcastEvent } = require('@/lib/sse/utils');
  
  switch (channel) {
    case 'alerts':
      await pushAlertUpdates(broadcastEvent);
      break;
    case 'incidents':
      await pushIncidentUpdates(broadcastEvent);
      break;
    case 'metrics':
      await pushMetricsUpdate(broadcastEvent);
      break;
    case 'health':
      await pushHealthUpdate(broadcastEvent);
      break;
    case 'threats':
      await pushThreatUpdate(broadcastEvent);
      break;
    case 'telecom':
      await pushTelecomUpdate(broadcastEvent);
      break;
  }
}

// ===== CHANNEL UPDATE FUNCTIONS =====

let lastAlertId: string | null = null;
let lastAlertCount = 0;

async function pushAlertUpdates(broadcastEvent: Function): Promise<void> {
  // Get latest alerts
  const [latestAlert, totalCount, activeCounts] = await Promise.all([
    db.alert.findFirst({
      orderBy: { firstSeen: 'desc' },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        source: true,
        firstSeen: true
      }
    }),
    db.alert.count(),
    db.alert.count({
      where: {
        status: { notIn: ['RESOLVED', 'FALSE_POSITIVE', 'SUPPRESSED'] }
      }
    })
  ]);

  // Check for new alert
  if (latestAlert && latestAlert.id !== lastAlertId) {
    broadcastEvent('alerts', {
      event: 'alert:new',
      data: {
        ...latestAlert,
        severity: latestAlert.severity.toLowerCase(),
        status: latestAlert.status.toLowerCase()
      },
      id: latestAlert.id
    });
    lastAlertId = latestAlert.id;
  }

  // Check for count changes
  if (totalCount !== lastAlertCount && lastAlertCount > 0) {
    broadcastEvent('alerts', {
      event: 'alert:counts',
      data: {
        total: totalCount,
        active: activeCounts,
        timestamp: new Date().toISOString()
      }
    });
  }
  lastAlertCount = totalCount;
}

let lastIncidentStates = new Map<string, string>();

async function pushIncidentUpdates(broadcastEvent: Function): Promise<void> {
  const activeIncidents = await db.incident.findMany({
    where: {
      status: { notIn: ['RESOLVED', 'CLOSED'] }
    },
    select: {
      id: true,
      tatcCode: true,
      title: true,
      severity: true,
      status: true,
      phase: true,
      updatedAt: true
    },
    take: 20,
    orderBy: { updatedAt: 'desc' }
  });

  for (const incident of activeIncidents) {
    const prevState = lastIncidentStates.get(incident.id);
    const currentState = `${incident.status}:${incident.phase}`;
    
    if (prevState && prevState !== currentState) {
      broadcastEvent('incidents', {
        event: 'incident:updated',
        data: {
          ...incident,
          severity: incident.severity.toLowerCase(),
          status: incident.status.toLowerCase(),
          phase: incident.phase.toLowerCase(),
          previousState: prevState
        },
        id: incident.id
      });
    }
    lastIncidentStates.set(incident.id, currentState);
  }

  // Check for new incidents
  if (lastIncidentStates.size !== activeIncidents.length) {
    broadcastEvent('incidents', {
      event: 'incident:counts',
      data: {
        active: activeIncidents.length,
        timestamp: new Date().toISOString()
      }
    });
  }
}

async function pushMetricsUpdate(broadcastEvent: Function): Promise<void> {
  const [alertMetrics, incidentMetrics] = await Promise.all([
    // Alert KPIs
    Promise.all([
      db.alert.count({ 
        where: { firstSeen: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
      }),
      db.alert.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: { 
          firstSeen: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          status: { notIn: ['RESOLVED', 'FALSE_POSITIVE'] }
        }
      })
    ]),
    
    // Incident KPIs
    Promise.all([
      db.incident.count({
        where: { status: { notIn: ['RESOLVED', 'CLOSED'] } }
      }),
      db.incident.count({
        where: { slaBreach: true, detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
    ])
  ]);

  const bySeverity = alertMetrics[1].reduce((acc: any, s: any) => ({
    ...acc,
    [s.severity.toLowerCase()]: s._count.id
  }), {});

  broadcastEvent('metrics', {
    event: 'metrics:update',
    data: {
      timestamp: new Date().toISOString(),
      alerts: {
        lastHour: alertMetrics[0],
        bySeverity
      },
      incidents: {
        open: incidentMetrics[0],
        slaBreaches: incidentMetrics[1]
      }
    }
  });
}

let lastHealthStatus: Record<string, string> = {};

async function pushHealthUpdate(broadcastEvent: Function): Promise<void> {
  let dbHealthy = true;
  let dbLatency = 0;
  
  const startTime = Date.now();
  
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbHealthy = false;
  }

  const components = [
    { name: 'Database', status: dbHealthy ? 'operational' : 'down', latency: dbLatency },
    { name: 'API Server', status: 'operational', latency: Math.round(Math.random() * 10 + 5) },
    { name: 'Prisma ORM', status: 'operational', latency: dbLatency }
  ];

  // Check for status changes
  for (const comp of components) {
    const prevStatus = lastHealthStatus[comp.name];
    if (prevStatus && prevStatus !== comp.status) {
      broadcastEvent('health', {
        event: 'health:component_change',
        data: {
          ...comp,
          previousStatus: prevStatus,
          timestamp: new Date().toISOString()
        }
      });
    }
    lastHealthStatus[comp.name] = comp.status;
  }

  // Regular health pulse
  broadcastEvent('health', {
    event: 'health:pulse',
    data: {
      overall: {
        status: dbHealthy ? 'healthy' : 'degraded',
        score: dbHealthy ? 98 : 65,
        responseTime: Date.now() - startTime
      },
      components,
      timestamp: new Date().toISOString()
    }
  });
}

let lastIndicatorCount = 0;

async function pushThreatUpdate(broadcastEvent: Function): Promise<void> {
  const [indicatorCount, campaignCount] = await Promise.all([
    db.threatIndicator.count({ where: { isActive: true } }),
    db.campaign.count({ where: { isActive: true, status: 'ACTIVE' } })
  ]);

  if (lastIndicatorCount > 0 && indicatorCount !== lastIndicatorCount) {
    broadcastEvent('threats', {
      event: 'threats:update',
      data: {
        activeIndicators: indicatorCount,
        activeCampaigns: campaignCount,
        change: indicatorCount - lastIndicatorCount,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  lastIndicatorCount = indicatorCount;
}

async function pushTelecomUpdate(broadcastEvent: Function): Promise<void> {
  const [ss7Anomalies, gtpAnomalies, suspiciousCalls] = await Promise.all([
    db.sS7Message.count({
      where: {
        anomalyScore: { gt: 70 },
        timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 min
      }
    }),
    db.gTPSession.count({
      where: {
        anomalyScore: { gt: 70 },
        sessionStatus: 'ACTIVE'
      }
    }),
    db.sIPSession.count({
      where: {
        disconnectTimestamp: null,
        OR: [
          { fraudIndicators: { not: null } },
          { anomalyScore: { gt: 70 } }
        ]
      }
    })
  ]);

  // Only send if there are anomalies
  if (ss7Anomalies > 0 || gtpAnomalies > 0 || suspiciousCalls > 0) {
    broadcastEvent('telecom', {
      event: 'telecom:anomaly',
      data: {
        ss7: { highRiskLast5m: ss7Anomalies },
        gtp: { highRiskSessions: gtpAnomalies },
        sip: { suspiciousCalls },
        timestamp: new Date().toISOString()
      }
    });
  }
}
