/**
 * 🇩🇿 National SOC - Suricata Statistics/Dashboard API Route
 * GET /api/integrations/suricata/statistics - Dashboard summary
 */

import { NextResponse } from 'next/server';
import { getSuricataClient } from '../../lib/suricata-client';

// ────────────────────────────────────────────────────────
// GET - Dashboard Statistics
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getSuricataClient();
    const summary = await client.getDashboardSummary();

    return NextResponse.json({
      success: true,
      data: summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Suricata Statistics API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        health: { healthy: false, version: 'unknown', uptime: 0, running: false },
        alerts: { today: 0, criticalToday: 0, thisWeek: 0, topSignatures: [], topSrcIPs: [], topDstIPs: [], byProtocol: {}, byAction: {} },
        rules: { total: 0, enabled: 0, disabled: 0, lastUpdated: '' },
      },
      lastUpdated: new Date().toISOString(),
    });
  }
}
