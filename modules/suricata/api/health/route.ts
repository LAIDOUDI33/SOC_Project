/**
 * Suricata Health & Statistics API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - Health check and status
 * - Performance statistics
 * - Dashboard summary
 * - Timeline data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeSuricataClient,
  getSuricataClient,
} from '../../lib/suricata-client';
import type {
  SuricataStats,
  SuricataDashboardSummary,
  SuricataTimelinePoint,
  SuricataAPIResponse,
} from '../../types/suricata.types';

// Configuration from environment
const SURICATA_CONFIG = {
  host: process.env.SURICATA_HOST || 'localhost',
  apiPort: parseInt(process.env.SURICATA_API_PORT || '6379', 10),
  apiKey: process.env.SURICATA_API_KEY || '',
};

/**
 * GET /api/suricata/health
 * Check Suricata health and get basic stats
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize client if needed
    try {
      getSuricataClient();
    } catch {
      initializeSuricataClient(SURICATA_CONFIG);
    }

    const client = getSuricataClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'health': {
        // Full health check
        const health = await client.healthCheck();

        return NextResponse.json<SuricataAPIResponse<typeof health>>({
          success: health.healthy,
          message: health.healthy ? 'Suricata is healthy' : 'Suricata has issues',
          data: health,
        });
      }

      case 'version': {
        // Get version info
        const version = await client.getVersion();

        return NextResponse.json<SuricataAPIResponse<{ version: string; config: any }>>({
          success: true,
          message: `Suricata ${version}`,
          data: { version, config: await client.getConfig() },
        });
      }

      case 'stats': {
        // Get comprehensive statistics
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<SuricataStats>>({
          success: true,
          message: 'Statistics retrieved successfully',
          data: stats,
        });
      }

      case 'summary': {
        // Get dashboard summary
        const timeRange = searchParams.get('timeRange') || '24h';
        const summary = await client.getDashboardSummary(timeRange);

        return NextResponse.json<SuricataAPIResponse<SuricataDashboardSummary>>({
          success: true,
          message: `Dashboard summary for ${timeRange}`,
          data: summary,
        });
      }

      case 'timeline': {
        // Get timeline data for charts
        const hours = parseInt(searchParams.get('hours') || '24', 10);
        const intervalMinutes = parseInt(searchParams.get('interval') || '60', 10);
        const timeline = await client.timeline(hours, intervalMinutes);

        return NextResponse.json<SuricataAPIResponse<SuricataTimelinePoint[]>>({
          success: true,
          message: `Timeline data: ${timeline.length} points`,
          data: timeline,
        });
      }

      default:
        // Default: return health check
        const health = await client.healthCheck();

        return NextResponse.json<SuricataAPIResponse<typeof health>>({
          success: health.healthy,
          message: health.healthy ? 'Suricata is running' : 'Suricata is not responding',
          data: health,
        });
    }
  } catch (error) {
    console.error('[Suricata Health GET] Error:', error);

    return NextResponse.json<SuricataAPIResponse<null>>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null,
        errors: [(error instanceof Error ? error.message : 'Unknown error')],
      },
      { status: 500 }
    );
  }
}
