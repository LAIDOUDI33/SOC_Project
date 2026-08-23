/**
 * National SOC Platform - Advanced Analytics API
 * 
 * Provides aggregated analytics for dashboards and reports:
 * - Incident KPIs (MTTR, SLA, severity distribution)
 * - Threat intelligence metrics
 * - Time-series trend data
 * - Full dashboard aggregation
 * 
 * Endpoints:
 * - GET /api/analytics - Full dashboard data
 * - GET /api/analytics/incidents - Incident KPIs only
 * - GET /api/analytics/threats - Threat KPIs only
 * - GET /api/analytics/trends?type=incidents|alerts|threats - Trend data
 * 
 * @module api/analytics
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import {
  getDashboardAnalytics,
  calculateIncidentKPIs,
  calculateThreatKPIs,
  getIncidentTrends,
  getAlertTrends,
  getThreatTrends,
  TimeRanges
} from '@/lib/analytics/aggregator';

// GET /api/analytics - Main analytics endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate request
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }

  const requestId = `analytics_${Date.now()}`;
  const { searchParams } = new URL(request.url);

  try {
    // Parse query parameters
    const type = searchParams.get('type') || 'dashboard';
    const range = searchParams.get('range') || '24h';
    const interval = searchParams.get('interval') as 'hour' | 'day' | 'week' || 'day';

    // Determine time range
    let timeRange;
    switch (range) {
      case '1h':
        timeRange = TimeRanges.lastHour();
        break;
      case '7d':
        timeRange = TimeRanges.last7Days();
        break;
      case '30d':
        timeRange = TimeRanges.last30Days();
        break;
      case '24h':
      default:
        timeRange = TimeRanges.last24Hours();
    }

    let data;

    switch (type) {
      case 'incidents':
        data = await calculateIncidentKPIs(timeRange);
        break;

      case 'threats':
        data = await calculateThreatKPIs(timeRange);
        break;

      case 'trends':
        const trendType = searchParams.get('trendType') || 'incidents';
        
        switch (trendType) {
          case 'alerts':
            data = await getAlertTrends(timeRange, interval);
            break;
          case 'threats':
            data = await getThreatTrends(timeRange, interval as 'day' | 'week');
            break;
          case 'incidents':
          default:
            data = await getIncidentTrends(timeRange, interval);
        }
        break;

      case 'dashboard':
      default:
        data = await getDashboardAnalytics(timeRange);
    }

    console.log(`[ANALYTICS] ${type} query completed`, {
      requestId,
      userId: authResult.user.userId,
      range,
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      requestId,
      type,
      range: timeRange.label,
      calculatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      data
    });

  } catch (error) {
    console.error(`[ANALYTICS] Error processing request:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Analytics processing failed';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      requestId
    }, { status: 500 });
  }
}

// POST /api/analytics - Custom analytics query (advanced)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // Check for analyst or admin role
  if (!['ANALYST', 'ADMIN', 'MANAGER'].includes(authResult.user.role)) {
    return NextResponse.json({
      success: false,
      error: 'Insufficient permissions. Analyst role or higher required.'
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { startDate, endDate, metrics, groupBy, filters } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'startDate and endDate are required'
      }, { status: 400 });
    }

    const customRange = TimeRanges.custom(
      new Date(startDate),
      new Date(endDate),
      'Custom Range'
    );

    // Execute requested metrics in parallel
    const results: Record<string, any> = {};
    
    if (!metrics || metrics.includes('incidents')) {
      results.incidents = await calculateIncidentKPIs(customRange);
    }
    
    if (!metrics || metrics.includes('threats')) {
      results.threats = await calculateThreatKPIs(customRange);
    }
    
    if (!metrics || metrics.includes('incidentTrends')) {
      results.incidentTrends = await getIncidentTrends(
        customRange, 
        (groupBy === 'week' ? 'week' : 'day')
      );
    }
    
    if (!metrics || metrics.includes('alertTrends')) {
      results.alertTrends = await getAlertTrends(
        customRange,
        (groupBy === 'hour' ? 'hour' : 'day')
      );
    }

    console.log(`[ANALYTICS] Custom query completed`, {
      userId: authResult.user.userId,
      dateRange: `${startDate} to ${endDate}`,
      metrics: metrics || 'all',
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      customQuery: true,
      dateRange: { start: startDate, end: endDate },
      metrics: metrics || ['all'],
      calculatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      data: results
    });

  } catch (error) {
    console.error(`[ANALYTICS] Error in custom query:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process custom analytics query'
    }, { status: 500 });
  }
}
