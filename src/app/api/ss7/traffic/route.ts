/**
 * SS7 Traffic Analytics API
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Endpoints:
 * GET /api/ss7/traffic - Traffic statistics
 * GET /api/ss7/traffic/top-talkers - Top OPC/DPC pairs
 * GET /api/ss7/traffic/timeseries - Time series data
 * POST /api/ss7/traffic/query - Custom query
 * 
 * Returns realistic Djezzy telecom data from demo library
 */

import { NextRequest, NextResponse } from 'next/server';
// Import demo data for realistic Djezzy telecom data
import { ss7TrafficData } from '@/lib/demo-data';

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

async function handleTrafficStats(searchParams: URLSearchParams) {
  const period = searchParams.get('period') || '1h';
  
  // Return data from demo library with additional metadata
  const stats = {
    periodStart: new Date(Date.now() - 3600000).toISOString(),
    periodEnd: new Date().toISOString(),
    totalMessages: ss7TrafficData.messagesPerSecond * 3600, // Approximate hourly total
    messagesPerSecond: ss7TrafficData.messagesPerSecond,
    peakMessagesPerSecond: ss7TrafficData.peakMessagesPerSecond,
    averageMessageSize: 120,
    totalBytes: ss7TrafficData.messagesPerSecond * 3600 * 120,
    protocolDistribution: Object.fromEntries(
      Object.entries(ss7TrafficData.protocolDistribution).map(([k, v]) => [
        k, 
        { count: Math.round(v / 100 * ss7TrafficData.messagesPerSecond * 3600), percentage: v }
      ])
    ),
    inboundCount: Math.round(ss7TrafficData.messagesPerSecond * 1800),
    outboundCount: Math.round(ss7TrafficData.messagesPerSecond * 1800),
    errorRate: "0.02",
    topTalkers: ss7TrafficData.topTalkers.slice(0, 10),
    fraudAlerts: ss7TrafficData.fraudAlerts,
  };
  
  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
}

async function handleTopTalkers(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '20');
  
  return NextResponse.json({
    success: true,
    data: {
      talkers: ss7TrafficData.topTalkers.slice(0, limit),
      total: ss7TrafficData.topTalkers.length,
      requestedLimit: limit,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleTimeSeries(searchParams: URLSearchParams) {
  const metric = searchParams.get('metric') || 'mps';
  const points = parseInt(searchParams.get('points') || '288');
  
  // Return time series data from demo library
  const data = ss7TrafficData.timeSeriesData.slice(-points);
  
  // Calculate statistics
  const values = data.map(d => d.value);
  values.sort((a, b) => a - b);
  
  return NextResponse.json({
    success: true,
    data: {
      metric,
      points: data,
      statistics: {
        min: values[0] || 0,
        max: values[values.length - 1] || 0,
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length) || 0,
        p50: values[Math.floor(values.length * 0.5)] || 0,
        p95: values[Math.floor(values.length * 0.95)] || 0,
        p99: values[Math.floor(values.length * 0.99)] || 0,
      },
    },
    timestamp: new Date().toISOString(),
  });
}

// POST handler for custom queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.query || body.filters) {
      // Simulate custom query processing using demo data
      const results = {
        queryId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        executionTime: Math.floor(Math.random() * 100) + 10,
        resultCount: Math.min(body.limit || 20, ss7TrafficData.topTalkers.length),
        results: ss7TrafficData.topTalkers.slice(0, body.limit || 20).map((talker, i) => ({
          id: `msg_${i}`,
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          protocol: talker.protocol,
          opc: talker.opc,
          dpc: talker.dpc,
          mps: talker.mps,
          totalMessages: talker.totalMessages,
        })),
      };
      
      return NextResponse.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
      });
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
