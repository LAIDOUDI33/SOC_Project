/**
 * 🇩🇿 National SOC - Suricata Health Check API Route
 * GET /api/integrations/suricata/health - System health status
 */

import { NextResponse } from 'next/server';
import { getSuricataClient } from '../../lib/suricata-client';

// ────────────────────────────────────────────────────────
// GET - Health Check
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getSuricataClient();
    const health = await client.healthCheck();

    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Suricata Health Check Error:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        healthy: false,
        version: 'unknown',
        uptime: 0,
        running: false,
        capture_stats: null,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
