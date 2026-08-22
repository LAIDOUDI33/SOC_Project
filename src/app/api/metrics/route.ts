/**
 * National SOC Platform - Dashboard Metrics API
 * 
 * Returns comprehensive dashboard metrics and KPIs
 * for the Djezzy SOC platform
 */

import { NextRequest, NextResponse } from 'next/server';
// Import demo data
import { 
  executiveKPIs, 
  systemComponents, 
  recentAlerts,
  recentIncidents,
  ss7TrafficData,
  anrtComplianceData,
  huntSessions,
  threatIntelFeeds,
  analystStats,
  getDashboardSummary
} from '@/lib/demo-data';

// GET /api/metrics - Fetch all dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    // Build response based on category
    let response: Record<string, any> = {
      success: true,
      timestamp: new Date().toISOString(),
    };

    if (category === 'all' || category === 'kpis') {
      response.kpis = executiveKPIs;
    }

    if (category === 'all' || category === 'systems') {
      response.systems = systemComponents;
    }

    if (category === 'all' || category === 'alerts') {
      response.alerts = {
        total: recentAlerts.length,
        bySeverity: {
          critical: recentAlerts.filter(a => a.severity === 'critical').length,
          high: recentAlerts.filter(a => a.severity === 'high').length,
          medium: recentAlerts.filter(a => a.severity === 'medium').length,
          low: recentAlerts.filter(a => a.severity === 'low').length,
        },
        byStatus: {
          open: recentAlerts.filter(a => a.status === 'open').length,
          investigating: recentAlerts.filter(a => a.status === 'investigating').length,
          acknowledged: recentAlerts.filter(a => a.status === 'acknowledged').length,
          resolved: recentAlerts.filter(a => a.status === 'resolved').length,
        },
        recent: recentAlerts.slice(0, 10)
      };
    }

    if (category === 'all' || category === 'incidents') {
      response.incidents = {
        total: recentIncidents.length,
        active: recentIncidents.filter(i => i.status === 'open' || i.status === 'contained').length,
        bySeverity: {
          critical: recentIncidents.filter(i => i.severity === 'critical').length,
          high: recentIncidents.filter(i => i.severity === 'high').length,
          medium: recentIncidents.filter(i => i.severity === 'medium').length,
          low: recentIncidents.filter(i => i.severity === 'low').length,
        },
        recent: recentIncidents
      };
    }

    if (category === 'all' || category === 'telecom') {
      response.telecom = ss7TrafficData;
    }

    if (category === 'all' || category === 'compliance') {
      response.compliance = anrtComplianceData;
    }

    if (category === 'all' || category === 'threat-hunting') {
      response.threatHunting = {
        sessions: huntSessions,
        activeCount: huntSessions.filter(h => h.status === 'active').length
      };
    }

    if (category === 'all' || category === 'intel') {
      response.threatIntel = threatIntelFeeds;
    }

    if (category === 'all' || category === 'operations') {
      response.operations = analystStats;
    }

    // Always include summary
    response.summary = getDashboardSummary();

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
