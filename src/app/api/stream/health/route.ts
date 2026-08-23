/**
 * National SOC Platform - SSE Stream Health & Statistics Endpoint
 * 
 * Provides monitoring data for real-time streaming infrastructure:
 * - Active connection counts
 * - Channel subscription statistics
 * - Message throughput metrics
 * - System health indicators
 * 
 * @module api/stream/health
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { sseManager } from '@/lib/realtime/sse-manager';
import { getConnectionStats } from '@/lib/sse/utils';

// GET /api/stream/health - SSE system health and statistics
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate request (optional for basic stats, required for detailed)
  const authResult = await authenticateRequest(request);
  const isDetailed = authResult.success && authResult.user?.role === 'ADMIN';

  try {
    // Get stats from both SSE systems
    const sseManagerStats = sseManager.getStats();
    const legacyStats = getConnectionStats();

    // System health checks
    const healthChecks = {
      connectionManager: {
        status: 'healthy',
        activeConnections: sseManagerStats.activeConnections,
        maxConnections: 1000,
        utilization: Math.round((sseManagerStats.activeConnections / 1000) * 100)
      },
      messageQueue: {
        status: 'healthy',
        messagesSent: sseManagerStats.messagesSent,
        messagesDropped: sseManagerStats.messagesDropped,
        dropRate: sseManagerStats.messagesSent > 0 
          ? parseFloat(((sseManagerStats.messagesDropped / (sseManagerStats.messagesSent + sseManagerStats.messagesDropped)) * 100).toFixed(2))
          : 0
      },
      legacySystem: {
        status: 'operational',
        activeConnections: legacyStats.total,
        channels: legacyStats.byChannel
      }
    };

    // Determine overall health
    const overallHealth = 
      healthChecks.connectionManager.utilization < 90 &&
      healthChecks.messageQueue.dropRate < 1
        ? 'healthy'
        : healthChecks.connectionManager.utilization >= 95
          ? 'critical'
          : 'degraded';

    const response = {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      
      // Summary for all users
      summary: {
        totalActiveConnections: sseManagerStats.activeConnections + legacyStats.total,
        availableChannels: ['incidents', 'threats', 'hunt_sessions', 'alerts', 'notifications', '*'],
        supportedEvents: [
          'incident:created', 'incident:updated', 'incident:status_changed',
          'threat:indicator_added', 'threat:ioc_created', 'threat:ioc_validated',
          'hunt:session_created', 'hunt:finding_discovered',
          'alert:new', 'alert:urgent'
        ]
      },

      // Health checks
      health: healthChecks,

      // Detailed stats (admin only)
      ...(isDetailed && {
        detailed: {
          connectionsByChannel: sseManagerStats.connectionsByChannel,
          performanceMetrics: {
            avgMessagesPerSecond: Math.round(sseManagerStats.messagesSent / 3600), // Rough estimate
            peakConnections: sseManagerStats.totalConnections,
            uptime: process.uptime()
          },
          configuration: {
            heartbeatIntervalMs: 30000,
            connectionTimeoutMs: 300000,
            maxConnectionsPerUser: 10,
            maxTotalConnections: 1000
          }
        }
      })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[SSE-HEALTH] Error gathering stats:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Failed to gather SSE health information',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/stream/health - Broadcast test event (admin only)
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  if (authResult.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { event, channel, message } = body;

    if (!event || !channel) {
      return NextResponse.json({
        success: false,
        error: 'Missing event or channel'
      }, { status: 400 });
    }

    // Broadcast test event
    sseManager.broadcast({
      event: `test:${event}`,
      data: {
        type: 'test_event',
        message: message || 'SSE connectivity test',
        timestamp: new Date().toISOString(),
        triggeredBy: authResult.user.userId
      },
      targetChannels: [channel]
    });

    console.log(`[SSE-HEALTH] Test event broadcast: ${event} to ${channel}`);

    return NextResponse.json({
      success: true,
      message: `Test event "${event}" broadcast to "${channel}" subscribers`,
      timestamp: new Date().toISOString(),
      recipients: sseManager.getActiveConnectionCount()
    });

  } catch (error) {
    console.error('[SSE-HEALTH] Error broadcasting test:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to broadcast test event'
    }, { status: 500 });
  }
}
