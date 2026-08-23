/**
 * National SOC Platform - Real-time Alerts Stream
 * 
 * Dedicated SSE endpoint for alert-specific real-time updates:
 * - New alert notifications with full details
 * - Severity-based filtering
 * - Status change tracking
 * - Threshold breach alerts
 * 
 * Usage: GET /api/stream/alerts?severity=critical,high&sources=SIEM,EDR
 */

import { NextRequest } from 'next/server';
import { createSSEConnection, sendEvent, broadcastEvent } from '@/lib/sse/utils';
import { db } from '@/lib/db';
import { AlertSeverity, AlertStatus } from '@prisma/client';

// Track state for change detection
const alertState = {
  lastAlertId: null as string | null,
  lastCount: 0,
  lastBySeverity: {} as Record<string, number>,
  subscribers: new Set<ReadableStreamDefaultController>()
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const severityFilter = searchParams.get('severity')?.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const sourceFilter = searchParams.get('source')?.split(',').map(s => s.trim());
  const minSeverity = searchParams.get('minSeverity')?.toUpperCase();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      sendEvent(controller, {
        event: 'connected',
        data: {
          type: 'alerts-stream',
          filters: { severityFilter, sourceFilter, minSeverity },
          timestamp: new Date().toISOString()
        }
      });

      // Push current alert counts
      pushCurrentAlerts(controller, severityFilter, sourceFilter, minSeverity);

      // Add to subscribers
      alertState.subscribers.add(controller);

      // Start polling for this connection
      const pollInterval = setInterval(() => {
        try {
          pollForAlertChanges(controller, severityFilter, sourceFilter, minSeverity);
        } catch (error) {
          console.error('Error polling alerts:', error);
          clearInterval(pollInterval);
          alertState.subscribers.delete(controller);
        }
      }, 1500); // Poll every 1.5 seconds for near-real-time

      // Cleanup on disconnect
      return () => {
        clearInterval(pollInterval);
        alertState.subscribers.delete(controller);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function pushCurrentAlerts(
  controller: ReadableStreamDefaultController,
  severityFilter?: string[],
  sourceFilter?: string[],
  minSeverity?: string
): Promise<void> {
  const where: any = {};
  
  if (severityFilter?.length) {
    where.severity = { in: severityFilter };
  }
  
  if (sourceFilter?.length) {
    where.source = { in: sourceFilter };
  }

  if (minSeverity) {
    // Use Prisma's ordinal comparison
    const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const minIndex = severityOrder.indexOf(minSeverity);
    if (minIndex >= 0) {
      where.severity = { in: severityOrder.slice(minIndex) };
    }
  }

  const [totalCount, activeCount, bySeverity, recentAlerts] = await Promise.all([
    db.alert.count({ where }),
    db.alert.count({
      where: {
        ...where,
        status: { notIn: [AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE, AlertStatus.SUPPRESSED] }
      }
    }),
    db.alert.groupBy({
      by: ['severity'],
      _count: { id: true },
      where
    }),
    db.alert.findMany({
      where,
      take: 5,
      orderBy: { firstSeen: 'desc' },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        source: true,
        firstSeen: true
      }
    })
  ]);

  sendEvent(controller, {
    event: 'alerts:snapshot',
    data: {
      total: totalCount,
      active: activeCount,
      bySeverity: bySeverity.reduce((acc, s) => ({
        ...acc,
        [s.severity.toLowerCase()]: s._count.id
      }), {}),
      recent: recentAlerts.map(a => ({
        ...a,
        severity: a.severity.toLowerCase(),
        status: a.status.toLowerCase()
      })),
      timestamp: new Date().toISOString()
    }
  });
}

async function pollForAlertChanges(
  controller: ReadableStreamDefaultController,
  severityFilter?: string[],
  sourceFilter?: string[],
  minSeverity?: string
): Promise<void> {
  const where: any = {};
  
  if (severityFilter?.length) where.severity = { in: severityFilter };
  if (sourceFilter?.length) where.source = { in: sourceFilter };
  if (minSeverity) {
    const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const minIndex = severityOrder.indexOf(minSeverity);
    if (minIndex >= 0) where.severity = { in: severityOrder.slice(minIndex) };
  }

  // Check for new alerts
  const latestAlert = await db.alert.findFirst({
    where,
    orderBy: { firstSeen: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      source: true,
      sourceIp: true,
      destIp: true,
      firstSeen: true,
      incidentId: true,
      mitreTechniques: true
    }
  });

  if (latestAlert && latestAlert.id !== alertState.lastAlertId) {
    sendEvent(controller, {
      event: 'alert:new',
      data: {
        ...latestAlert,
        severity: latestAlert.severity.toLowerCase(),
        status: latestAlert.status.toLowerCase(),
        mitreTechniques: latestAlert.mitreTechniques ? JSON.parse(latestAlert.mitreTechniques) : null
      },
      id: latestAlert.id
    });

    // Also broadcast to all stream clients
    broadcastEvent('alerts', {
      event: 'alert:new',
      data: {
        ...latestAlert,
        severity: latestAlert.severity.toLowerCase(),
        status: latestAlert.status.toLowerCase()
      },
      id: latestAlert.id
    });

    alertState.lastAlertId = latestAlert.id;

    // Check if it's critical/high priority
    const highSeverities: AlertSeverity[] = [AlertSeverity.CRITICAL, AlertSeverity.HIGH];
    if (highSeverities.includes(latestAlert.severity)) {
      sendEvent(controller, {
        event: 'alert:urgent',
        data: {
          ...latestAlert,
          severity: latestAlert.severity.toLowerCase(),
          urgency: latestAlert.severity === AlertSeverity.CRITICAL ? 'critical' : 'high'
        },
        id: `urgent_${latestAlert.id}`
      });
    }
  }

  // Check count changes
  const currentCount = await db.alert.count({ where });
  if (currentCount !== alertState.lastCount && alertState.lastCount > 0) {
    sendEvent(controller, {
      event: 'alert:count_change',
      data: {
        previous: alertState.lastCount,
        current: currentCount,
        delta: currentCount - alertState.lastCount,
        timestamp: new Date().toISOString()
      }
    });
  }
  alertState.lastCount = currentCount;

  // Send heartbeat
  sendEvent(controller, {
    event: 'heartbeat',
    data: {
      timestamp: new Date().toISOString(),
      subscribers: alertState.subscribers.size
    }
  });
}

// Export function to manually trigger alert push (for use by other API routes)
export async function triggerAlertPush(alertId: string): Promise<void> {
  const alert = await db.alert.findUnique({
    where: { id: alertId },
    include: { incident: { select: { id: true, title: true } } }
  });

  if (alert) {
    broadcastEvent('alerts', {
      event: 'alert:updated',
      data: {
        ...alert,
        severity: alert.severity.toLowerCase(),
        status: alert.status.toLowerCase()
      },
      id: alert.id
    });
  }
}
