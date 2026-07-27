/**
 * National SOC Platform - Telecom Probe Management API
 * 
 * REST endpoints for:
 * - Managing probe connections
 * - Viewing real-time telecom metrics
 * - Fraud detection alerts
 * - Network element monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { probeManager, type ProbeConfig, type TelecomMetrics } from '@/lib/telecom/probe-manager';
import { db } from '@/lib/db';

// ============================================================
# GET /api/telecom/probes - List all probes and their status
# ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        return await getProbeStatus();
      
      case 'metrics':
        return await getTelecomMetrics();
      
      case 'fraud':
        return await getFraudAlerts(searchParams);
      
      case 'subscribers':
        return await getHighRiskSubscribers(searchParams);
      
      case 'network-elements':
        return await getNetworkElements();
      
      default:
        return await getDashboardData();
    }

  } catch (error) {
    console.error('Telecom API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch telecom data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================
# POST /api/telecom/probes - Manage probe connections
# ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'connect':
        return await connectProbe(data);
      
      case 'disconnect':
        return await disconnectProbe(data);
      
      case 'configure':
        return await configureProbes(data.probes);
      
      case 'test-connection':
        return await testConnection(data);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Telecom API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================
# Handler Functions
# ============================================================

async function getProbeStatus(): Promise<NextResponse> {
  const connections = probeManager.getConnectionStatus();
  
  // Get additional stats from database
  const [totalSS7Messages, activeGTPSessions, activeSIPCalls, activeDiameterSessions] = await Promise.all([
    db.sS7Message.count({ where: { timestamp: { gte: new Date(Date.now() - 3600000) } } }),
    db.gTPSession.count({ where: { sessionStatus: 'ACTIVE' } }),
    db.sIPSession.count({ where: { disconnectTimestamp: null } }),
    db.diameterSession.count({ where: { sessionStatus: 'ACTIVE' } })
  ]);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    probes: connections,
    summary: {
      totalProbes: connections.length,
      connectedProbes: connections.filter(p => p.status === 'connected').length,
      messagesLastHour: totalSS7Messages,
      activeGTPSessions,
      activeSIPCalls,
      activeDiameterSessions
    }
  });
}

async function getTelecomMetrics(): Promise<NextResponse> {
  const metrics = await probeManager.getMetrics();

  // Add historical trends
  const now = new Date();
  const timeRanges = [
    { label: '1h', start: new Date(now.getTime() - 3600000) },
    { label: '6h', start: new Date(now.getTime() - 21600000) },
    { label: '24h', start: new Date(now.getTime() - 86400000) },
    { label: '7d', start: new Date(now.getTime() - 604800000) }
  ];

  const trends = await Promise.all(timeRanges.map(async ({ label, start }) => ({
    period: label,
    ss7: {
      total: await db.sS7Message.count({ where: { timestamp: { gte: start } } }),
      blocked: await db.sS7Message.count({ where: { timestamp: { gte: start }, isBlocked: true } })
    },
    gtp: {
      sessionsCreated: await db.gTPSession.count({ where: { started_at: { gte: start } } }),
      anomalies: await db.gTPSession.count({ where: { anomalyScore: { gt: 70 }, started_at: { gte: start } } })
    },
    sip: {
      calls: await db.sIPSession.count({ where: { inviteTimestamp: { gte: start } } }),
      fraudSuspected: await db.sIPSession.count({ where: { isFraudSuspected: true, inviteTimestamp: { gte: start } } })
    }
  })));

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    current: metrics,
    trends
  });
}

async function getFraudAlerts(searchParams: URLSearchParams): Promise<NextResponse> {
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const severity = searchParams.get('severity');
  const type = searchParams.get('type');
  const timeframe = searchParams.get('timeframe') || '24h';

  // Calculate time range
  const timeRangeMap: Record<string, Date> = {
    '1h': new Date(Date.now() - 3600000),
    '6h': new Date(Date.now() - 21600000),
    '24h': new Date(Date.now() - 86400000),
    '7d': new Date(Date.now() - 604800000),
    '30d': new Date(Date.now() - 2592000000)
  };
  const since = timeRangeMap[timeframe] || timeRangeMap['24h'];

  // Build query filters
  const where: any = {
    firstSeen: { gte: since },
    OR: [
      { source: { startsWith: 'TELECOM_' } },
      { category: 'FRAUD_DETECTION' }
    ]
  };

  if (severity && severity !== 'all') {
    where.severity = severity.toUpperCase();
  }

  if (type && type !== 'all') {
    where.title = { contains: type.replace(/_/g, ' ') };
  }

  const [alerts, totalCount] = await Promise.all([
    db.alert.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { firstSeen: 'desc' },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        source: true,
        firstSeen: true,
        rawEvent: true,
        tags: true
      }
    }),
    db.alert.count({ where })
  ]);

  // Group by fraud type for summary
  const fraudSummary = await db.alert.groupBy({
    by: ['source'],
    where: {
      firstSeen: { gte: since },
      source: { startsWith: 'TELECOM_' }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  return NextResponse.json({
    success: true,
    alerts,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    },
    summary: {
      totalFraudAlerts: totalCount,
      byType: fraudSummary.map(f => ({
        type: f.source.replace('TELECOM_', ''),
        count: f._count.id
      }))
    }
  });
}

async function getHighRiskSubscribers(searchParams: URLSearchParams): Promise<NextResponse> {
  const limit = parseInt(searchParams.get('limit') || '20');
  const minRiskScore = parseInt(searchParams.get('minRiskScore') || '70');

  const subscribers = await db.subscriber.findMany({
    where: {
      subscriberStatus: 'ACTIVE',
      riskScore: { gte: minRiskScore }
    },
    take: limit,
    orderBy: { riskScore: 'desc' },
    select: {
      id: true,
      msisdn: true,
      imsi: true,
      riskScore: true,
      subscriberStatus: true,
      isRoaming: true,
      region: true,
      lastSeen: true,
      firstSeen: true,
      _count: {
        select: {
          // Count recent suspicious activities
          ss7AsSender: {
            where: {
              msisdn: { not: null },
              isBlocked: true,
              timestamp: { gte: new Date(Date.now() - 86400000) }
            }
          }
        }
      }
    }
  });

  // Calculate risk distribution
  const riskDistribution = await db.subscriber.groupBy({
    by: [],
    _count: true,
    _avg: { riskScore: true },
    where: { subscriberStatus: 'ACTIVE' }
  });

  const highRiskCount = await db.subscriber.count({
    where: { subscriberStatus: 'ACTIVE', riskScore: { gte: 80 } }
  });
  const mediumRiskCount = await db.subscriber.count({
    where: { subscriberStatus: 'ACTIVE', riskScore: { gte: 50, lt: 80 } }
  });
  const lowRiskCount = await db.subscriber.count({
    where: { subscriberStatus: 'ACTIVE', riskScore: { lt: 50 } }
  });

  return NextResponse.json({
    success: true,
    subscribers,
    statistics: {
      totalActive: highRiskCount + mediumRiskCount + lowRiskCount,
      highRisk: highRiskCount,
      mediumRisk: mediumRiskCount,
      lowRisk: lowRiskCount,
      averageRiskScore: Math.round(riskDistribution._avg.riskScore || 0)
    }
  });
}

async function getNetworkElements(): Promise<NextResponse> {
  const elements = await db.networkElement.findMany({
    select: {
      id: true,
      name: true,
      elementType: true,
      ipAddress: true,
      vendor: true,
      softwareVersion: true,
      status: true,
      location: true,
      region: true,
      lastSeen: true,
      metadata: true
    },
    orderBy: { name: 'asc' }
  });

  // Status summary
  const statusSummary = await db.networkElement.groupBy({
    by: ['status'],
    _count: { id: true }
  });

  // Type summary
  const typeSummary = await db.networkElement.groupBy({
    by: ['elementType'],
    _count: { id: true }
  });

  return NextResponse.json({
    success: true,
    elements,
    summary: {
      total: elements.length,
      byStatus: statusSummary.reduce((acc, s) => ({ ...acc, [s.status.toLowerCase()]: s._count.id }), {}),
      byType: typeSummary.reduce((acc, t) => ({ ...acc, [t.elementType]: t._count.id }), {})
    }
  });
}

async function getDashboardData(): Promise<NextResponse> {
  // Aggregate all telecom dashboard data in one call
  const [
    probeStatus,
    metrics,
    recentFraudAlerts,
    topRiskSubscribers,
    networkElements,
    systemHealth
  ] = await Promise.all([
    getProbeStatus(),
    getTelecomMetrics(),
    db.alert.findMany({
      where: {
        firstSeen: { gte: new Date(Date.now() - 3600000) },
        source: { startsWith: 'TELECOM_' }
      },
      take: 10,
      orderBy: { firstSeen: 'desc' },
      select: { id: true, title: true, severity: true, firstSeen: true }
    }).then(res => res instanceof NextResponse ? res.json() : res),
    db.subscriber.findMany({
      where: { subscriberStatus: 'ACTIVE', riskScore: { gte: 70 } },
      take: 5,
      orderBy: { riskScore: 'desc' },
      select: { msisdn: true, riskScore: true, isRoaming: true, lastSeen: true }
    }),
    getNetworkElements(),
    db.systemHealth.findFirst({ orderBy: { createdAt: 'desc' } }) || { overall: { status: 'healthy', score: 98 } }
  ]);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    dashboard: {
      probes: probeStatus instanceof NextResponse ? await probeStatus.json() : probeStatus,
      metrics: metrics instanceof NextResponse ? await metrics.json() : metrics,
      recentFraudAlerts,
      topRiskSubscribers,
      networkElements: networkElements instanceof NextResponse ? await networkElements.json() : networkElements,
      systemHealth
    }
  });
}

async function connectProbe(data: any): Promise<NextResponse> {
  const config: ProbeConfig = {
    id: data.id || `probe-${Date.now()}`,
    name: data.name || 'Unnamed Probe',
    type: data.type,
    host: data.host,
    port: data.port,
    protocol: data.protocol || 'tcp',
    enabled: true,
    credentials: data.credentials,
    filters: data.filters,
    rateLimit: data.rateLimit
  };

  try {
    await probeManager.connect(config);
    
    // Save probe configuration to database
    await db.networkElement.upsert({
      where: { id: config.id },
      update: {
        name: config.name,
        elementType: `${config.type}-probe`.toUpperCase(),
        ipAddress: config.host,
        status: 'OPERATIONAL',
        lastSeen: new Date(),
        metadata: config as any
      },
      create: {
        id: config.id,
        name: config.name,
        elementType: `${config.type}-probe`.toUpperCase(),
        ipAddress: config.host,
        vendor: 'SOC-PROBE',
        status: 'OPERATIONAL',
        location: 'Djezzy Network',
        region: 'National',
        lastSeen: new Date(),
        metadata: config as any
      }
    });

    return NextResponse.json({
      success: true,
      message: `Connected to ${config.type} probe: ${config.name}`,
      probeId: config.id
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to connect to probe: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

async function disconnectProbe(data: any): Promise<NextResponse> {
  const { probeId } = data;
  
  if (!probeId) {
    return NextResponse.json(
      { success: false, error: 'probeId is required' },
      { status: 400 }
    );
  }

  try {
    await probeManager.disconnect(probeId);

    // Update network element status
    await db.networkElement.update({
      where: { id: probeId },
      data: { status: 'MAINTENANCE' }
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected from probe: ${probeId}`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

async function configureProbes(probes: ProbeConfig[]): Promise<NextResponse> {
  const results = [];

  for (const probe of probes) {
    try {
      if (probe.enabled !== false) {
        await probeManager.connect(probe);
        results.push({ id: probe.id, status: 'connected', success: true });
      } else {
        await probeManager.disconnect(probe.id);
        results.push({ id: probe.id, status: 'disconnected', success: true });
      }
    } catch (error) {
      results.push({
        id: probe.id,
        status: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  
  return NextResponse.json({
    success: successCount === probes.length,
    message: `Configured ${successCount}/${probes.length} probes`,
    results
  });
}

async function testConnection(data: any): Promise<NextResponse> {
  const { host, port, type, timeout = 5000 } = data;

  if (!host || !port) {
    return NextResponse.json(
      { success: false, error: 'host and port are required' },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  
  try {
    // Simple TCP connection test
    const net = require('net');
    
    const socket = new net.Socket();
    
    const result = await new Promise<{ success: boolean; latency: number; message: string }>((resolve) => {
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        const latency = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, latency, message: 'Connection successful' });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, latency: timeout, message: 'Connection timed out' });
      });
      
      socket.on('error', (err: Error) => {
        resolve({ 
          success: false, 
          latency: Date.now() - startTime, 
          message: err.message || 'Connection failed' 
        });
      });
      
      socket.connect(port, host);
    });

    return NextResponse.json({
      success: result.success,
      testResult: {
        host,
        port,
        type: type || 'unknown',
        ...result,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
