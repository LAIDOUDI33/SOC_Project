/**
 * National SOC Platform - Analytics Dashboard API
 * 
 * Provides pre-computed analytics for dashboards:
 * - Incident metrics and trends
 * - Threat landscape analysis
 * - Team performance
 * - System health indicators
 * 
 * @module api/analytics/dashboard
 * @version 1.0.0 (Production Ready)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { analyticsAggregator } from '@/lib/analytics/aggregator';

// GET /api/analytics/dashboard - Get complete dashboard data
export async function GET(request: NextRequest) {
  const requestId = `analytics_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  const startTime = Date.now();

  // Authentication required
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required',
      errorCode: 'UNAUTHORIZED',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' | '90d' || '7d';
    const refresh = searchParams.get('refresh') === 'true';

    // Force cache refresh if requested
    if (refresh) {
      analyticsAggregator.clearAllCaches();
    }

    // Get complete dashboard data
    const dashboardResult = await analyticsAggregator.getDashboardData();

    // Get incident metrics with specific time range if different from default
    let incidentMetrics = dashboardResult.data.incidents;
    if (timeRange !== '7d') {
      const incidentResult = await analyticsAggregator.getIncidentMetrics(timeRange);
      incidentMetrics = incidentResult.data;
    }

    const processingTimeMs = Date.now() - startTime;

    const response = NextResponse.json({
      success: true,
      data: {
        incidents: incidentMetrics,
        threats: dashboardResult.data.threats,
        team: dashboardResult.data.team,
        systemHealth: dashboardResult.data.systemHealth
      },
      meta: {
        requestId,
        processingTimeMs,
        computedAt: dashboardResult.computedAt,
        dataSource: dashboardResult.dataSource,
        timeRange,
        cacheTTL: dashboardResult.cacheTTL
      },
      timestamp: new Date().toISOString()
    });

    // Add performance headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Processing-Time', String(processingTimeMs));
    response.headers.set('X-Data-Source', dashboardResult.dataSource);

    return response;

  } catch (error) {
    console.error(`[ANALYTICS] Error (${requestId}):`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to compute analytics',
      errorCode: 'ANALYTICS_ERROR',
      requestId,
      details: process.env.NODE_ENV === 'development' ? {
        error: error instanceof Error ? error.message : 'Unknown error'
      } : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/analytics/dashboard - Refresh/clear caches
export async function POST(request: NextRequest) {
  const requestId = `analytics_refresh_${Date.now()}`;

  // Admin only
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required', requestId }, { status: 401 });
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(authResult.user.role)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Admin privileges required to clear caches',
      requestId 
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clearCache') {
      analyticsAggregator.clearAllCaches();
      
      return NextResponse.json({
        success: true,
        message: 'Analytics cache cleared',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getStats') {
      const stats = analyticsAggregator.getCacheStats();
      
      return NextResponse.json({
        success: true,
        data: stats,
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: clearCache or getStats',
      requestId,
      supportedActions: ['clearCache', 'getStats']
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      requestId
    }, { status: 500 });
  }
}
