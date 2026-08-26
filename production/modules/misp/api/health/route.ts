/**
 * 🇩🇿 National SOC - MISP Health Check API Route
 * GET /api/integrations/misp/health - System health and connection status
 */

import { NextResponse } from 'next/server';
import { getMISPClient } from '../../lib/misp-client';

// ────────────────────────────────────────────────────────
// GET - Health Check
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getMISPClient();
    const health = await client.healthCheck();

    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MISP Health Check Error:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        healthy: false,
        version: 'unknown',
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
