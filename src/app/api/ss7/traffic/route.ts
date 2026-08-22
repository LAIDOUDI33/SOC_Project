/**
 * SS7 Traffic Analytics API
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Endpoints:
 * GET /api/ss7/traffic - Traffic statistics
 * GET /api/ss7/traffic/top-talkers - Top OPC/DPC pairs
 * GET /api/ss7/traffic/timeseries - Time series data
 * POST /api/ss7/traffic/query - Custom query
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSignalingAnalyzer } from '@/lib/ss7/signaling-analyzer';

// Generate sample traffic data for demo purposes
function generateTrafficStats(period: string) {
  const periodMinutes = period === '1h' ? 60 : period === '6h' ? 360 : period === '24h' ? 1440 : 60;
  
  return {
    periodStart: new Date(Date.now() - periodMinutes * 60000).toISOString(),
    periodEnd: new Date().toISOString(),
    totalMessages: Math.floor(Math.random() * 500000) + 100000,
    messagesPerSecond: Math.floor(Math.random() * 2000) + 1500,
    peakMessagesPerSecond: Math.floor(Math.random() * 3000) + 2500,
    averageMessageSize: Math.floor(Math.random() * 50) + 80,
    totalBytes: Math.floor(Math.random() * 50000000) + 10000000,
    protocolDistribution: {
      MAP: { count: Math.floor(Math.random() * 200000) + 80000, percentage: 45.2 },
      ISUP: { count: Math.floor(Math.random() * 120000) + 50000, percentage: 25.8 },
      CAP: { count: Math.floor(Math.random() * 70000) + 25000, percentage: 14.5 },
      SCCP: { count: Math.floor(Math.random() * 50000) + 18000, percentage: 10.2 },
      TCAP: { count: Math.floor(Math.random() * 25000) + 8000, percentage: 4.3 },
    },
    inboundCount: Math.floor(Math.random() * 150000) + 60000,
    outboundCount: Math.floor(Math.random() * 150000) + 60000,
    errorRate: (Math.random() * 2).toFixed(3),
    topTalkers: generateTopTalkers(20),
  };
}

function generateTopTalkers(limit: number) {
  const talkers = [];
  const opcPrefixes = ['3-001', '3-065', '3-101', '3-102', '3-103', '3-042', '3-003'];
  const dpcPrefixes = ['3-001', '3-065', '3-101', '3-102', '3-042', '3-003', '3-201'];
  const protocols = [['MAP'], ['ISUP'], ['MAP', 'CAP'], ['SCCP', 'TCAP'], ['CAP']];
  
  for (let i = 0; i < limit; i++) {
    talkers.push({
      opc: `${opcPrefixes[i % opcPrefixes.length]}-${String(i % 10 + 1).padStart(3, '0')}`,
      dpc: `${dpcPrefixes[i % dpcPrefixes.length]}-${String((i + 3) % 10 + 1).padStart(3, '0')}`,
      messageCount: Math.floor(Math.random() * 20000) + 1000,
      bytes: Math.floor(Math.random() * 3000000) + 100000,
      protocols: protocols[i % protocols.length],
      lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });
  }
  
  return talkers.sort((a, b) => b.messageCount - a.messageCount);
}

function generateTimeSeriesData(metric: string, granularity: string, points: number) {
  const intervalMs = granularity === '5m' ? 300000 : 
                     granularity === '1h' ? 3600000 : 
                     granularity === '1m' ? 60000 : 300000;
  
  const data = [];
  let baseValue = metric === 'mps' ? 2500 : metric === 'bytes' ? 400000 : 100;
  
  for (let i = points; i >= 0; i--) {
    const timestamp = new Date(Date.now() - i * intervalMs);
    const variation = (Math.sin(i / 20) * 0.2 + (Math.random() - 0.5) * 0.15) * baseValue;
    
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(Math.max(baseValue * 0.5, baseValue + variation)),
    });
  }
  
  // Calculate statistics
  const values = data.map(d => d.value);
  values.sort((a, b) => a - b);
  
  return {
    metric,
    granularity,
    points: data,
    statistics: {
      min: values[0],
      max: values[values.length - 1],
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      stddev: Math.round(Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - values.reduce((a, b) => a + b, 0) / values.length, 2), 0) / values.length
      )),
    },
  };
}

// GET handler for traffic stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'top-talkers':
        return handleTopTalkers(searchParams);
        
      case 'timeseries':
        return handleTimeSeries(searchParams);
        
      default:
        return handleTrafficStats(searchParams);
    }
  } catch (error) {
    console.error('SS7 Traffic API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler for custom queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle custom query (GraphQL-like)
    if (body.query || body.filters) {
      return handleCustomQuery(body);
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    console.error('SS7 Traffic POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleTrafficStats(searchParams: URLSearchParams) {
  const period = searchParams.get('period') || '1h';
  const protocol = searchParams.get('protocol');
  
  const stats = generateTrafficStats(period);
  
  // Filter by protocol if specified
  if (protocol && protocol !== 'all') {
    const protoUpper = protocol.toUpperCase();
    if (stats.protocolDistribution[protoUpper as keyof typeof stats.protocolDistribution]) {
      stats.totalMessages = stats.protocolDistribution[protoUpper as keyof typeof stats.protocolDistribution].count;
    }
  }
  
  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
}

async function handleTopTalkers(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '20');
  const protocol = searchParams.get('protocol');
  
  let talkers = generateTopTalkers(limit);
  
  if (protocol && protocol !== 'all') {
    talkers = talkers.filter(t => 
      t.protocols.map(p => p.toLowerCase()).includes(protocol.toLowerCase())
    );
  }
  
  return NextResponse.json({
    success: true,
    data: {
      talkers,
      total: talkers.length,
      requestedLimit: limit,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleTimeSeries(searchParams: URLSearchParams) {
  const metric = searchParams.get('metric') || 'mps';
  const granularity = searchParams.get('granularity') || '5m';
  const points = parseInt(searchParams.get('points') || '288');
  
  const data = generateTimeSeriesData(metric, granularity, points);
  
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

async function handleCustomQuery(body: any) {
  const { filters, fields, groupBy, orderBy, limit } = body;
  
  // Simulate custom query processing
  const results = {
    queryId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    executionTime: Math.floor(Math.random() * 100) + 10,
    resultCount: Math.floor(Math.random() * 100) + 10,
    results: Array.from({ length: Math.min(limit || 20, 20) }, (_, i) => ({
      id: `msg_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      protocol: ['MAP', 'ISUP', 'CAP', 'SCCP'][Math.floor(Math.random() * 4)],
      opc: `3-${String(Math.floor(Math.random() * 255)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
      dpc: `3-${String(Math.floor(Math.random() * 255)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`,
      size: Math.floor(Math.random() * 200) + 40,
    })),
  };
  
  return NextResponse.json({
    success: true,
    data: results,
    timestamp: new Date().toISOString(),
  });
}
