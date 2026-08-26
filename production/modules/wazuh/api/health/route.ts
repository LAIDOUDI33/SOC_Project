/**
 * 🇩🇿 National SOC - Wazuh Health Check API Route
 * GET /api/integrations/wazuh/health - System health status
 */

import { NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// GET - Health Check
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getWazuhClient();
    const health = await client.healthCheck();

    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Wazuh Health Check Error:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        healthy: false,
        manager: { status: 'unreachable', version: 'unknown' },
        agents: { active: 0, total: 0, disconnected: 0 },
        alerts: { last_24h: 0, critical: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
