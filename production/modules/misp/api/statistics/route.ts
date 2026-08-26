/**
 * 🇩🇿 National SOC - MISP Statistics/Dashboard API Route
 * GET /api/integrations/misp/statistics - Dashboard summary and statistics
 */

import { NextResponse } from 'next/server';
import { getMISPClient } from '../../lib/misp-client';

// ────────────────────────────────────────────────────────
// GET - Dashboard Statistics
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getMISPClient();

    // Fetch all dashboard data in parallel
    const [stats, recentEvents, threats, feeds] = await Promise.all([
      client.getStatistics().catch(() => ({
        totalEvents: 0,
        totalAttributes: 0,
        totalIOCs: 0,
        eventsToday: 0,
        eventsThisWeek: 0,
        topTags: [],
        topTypes: [],
      })),
      client.getRecentEvents(7, 5).catch(() => []),
      client.getThreatActors().catch(() => []),
      client.getFeeds().catch(() => []),
    ]);

    const health = await client.healthCheck();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentEvents: recentEvents.map(e => ({
          id: e.id,
          info: e.info,
          date: e.date,
          threat_level_id: e.threat_level_id,
          analysis: e.analysis,
          attribute_count: e.Attribute?.length || 0,
          tags: e.Tag?.map(t => (typeof t === 'string' ? t : t.name)) || [],
        })),
        activeThreatActors: threats.slice(0, 10).map(t => ({
          name: t.name,
          description: t.description?.substring(0, 200),
        })),
        feedStatus: {
          enabled: feeds.filter(f => f.enabled).length,
          total: feeds.length,
        },
        health,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MISP Statistics API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        stats: { totalEvents: 0, totalAttributes: 0, totalIOCs: 0, eventsToday: 0, eventsThisWeek: 0, topTags: [], topTypes: [] },
        recentEvents: [],
        activeThreatActors: [],
        feedStatus: { enabled: 0, total: 0 },
        health: { healthy: false, version: 'unknown' },
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
