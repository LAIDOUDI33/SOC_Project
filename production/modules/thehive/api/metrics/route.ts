/**
 * 🇩🇿 National SOC - TheHive Metrics/Dashboard API Route
 * GET /api/integrations/thehive/metrics - Dashboard summary and statistics
 */

import { NextResponse } from 'next/server';
import { getTheHiveClient } from '../../lib/thehive-client';

// ────────────────────────────────────────────────────────
// GET - Dashboard Summary
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getTheHiveClient();

    // Fetch all metrics in parallel for performance
    const [
      openCases,
      inProgressCases,
      resolvedToday,
      criticalOpen,
      recentCases,
    ] = await Promise.all([
      client.searchCases({ status: 'Open', limit: 1 }).then(r => r.total).catch(() => 0),
      client.searchCases({ status: 'InProgress', limit: 1 }).then(r => r.total).catch(() => 0),
      client.searchCases({ status: 'Resolved', range: '-1d', limit: 50 }).then(r => r.data).catch(() => []),
      client.searchCases({ severity: 1, status: 'Open', limit: 10 }).then(r => r.data).catch(() => []),
      client.getRecentCases(10).catch(() => []),
    ]);

    const dashboardData = {
      summary: {
        openCases,
        inProgressCases,
        resolvedToday: resolvedToday.length,
        criticalOpen: criticalOpen.length,
        totalActive: openCases + inProgressCases,
      },
      
      urgentCases: criticalOpen, // Critical cases need attention
      
      recentActivity: recentCases.slice(0, 5).map(c => ({
        id: c.id,
        title: c.title,
        severity: c.severity,
        status: c.status,
        createdAt: c.createdAt,
        tags: c.tags?.slice(0, 3) || [],
      })),
      
      // Quick stats for charts
      severityDistribution: {
        critical: criticalOpen.length,
        high: await client.searchCases({ severity: 2, status: 'Open', limit: 1 })
          .then(r => r.total).catch(() => 0),
        medium: await client.searchCases({ severity: 3, status: 'Open', limit: 1 })
          .then(r => r.total).catch(() => 0),
        low: await client.searchCases({ severity: 4, status: 'Open', limit: 1 })
          .then(r => r.total).catch(() => 0),
      },
      
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('TheHive Metrics API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        summary: { openCases: 0, inProgressCases: 0, resolvedToday: 0, criticalOpen: 0 },
        urgentCases: [],
        recentActivity: [],
        severityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
        lastUpdated: new Date().toISOString(),
      },
    });
  }
}
