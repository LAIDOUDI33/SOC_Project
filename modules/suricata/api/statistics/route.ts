/**
 * Suricata Statistics API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - Detailed performance metrics
 * - Protocol breakdowns
 * - Alert statistics by various dimensions
 * - Flow analysis data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeSuricataClient,
  getSuricataClient,
} from '../../lib/suricata-client';
import type {
  SuricataAPIResponse,
  SuricataStats,
  SuricataDashboardSummary,
} from '../../types/suricata.types';

// Configuration from environment
const SURICATA_CONFIG = {
  host: process.env.SURICATA_HOST || 'localhost',
  apiPort: parseInt(process.env.SURICATA_API_PORT || '6379', 10),
  apiKey: process.env.SURICATA_API_KEY || '',
};

/**
 * GET /api/suricata/statistics
 * Get detailed statistics and analytics
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
      case 'performance': {
        // Performance metrics only
        const stats = await client.getStats();

        const performanceData = {
          uptime: stats.uptime,
          packets: stats.packets,
          bytes: stats.bytes,
          drop_rate: stats.packets.total > 0 
            ? Math.round((stats.packets.dropped / stats.packets.total) * 10000) / 100 
            : 0,
          pps: Math.floor(stats.packets.total / (stats.uptime || 1)),
          bps: Math.floor(stats.bytes.total / (stats.uptime || 1)),
          memory: stats.memory,
          threads: stats.threads,
        };

        return NextResponse.json<SuricataAPIResponse<typeof performanceData>>({
          success: true,
          message: 'Performance metrics retrieved',
          data: performanceData,
        });
      }

      case 'protocols': {
        // Protocol breakdown
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<{
          protocols: typeof stats.protocols;
          app_layer: typeof stats.app_layer;
        }>>({
          success: true,
          message: 'Protocol statistics retrieved',
          data: {
            protocols: stats.protocols,
            app_layer: stats.app_layer,
          },
        });
      }

      case 'flows': {
        // Flow statistics
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<typeof stats.flows>>({
          success: true,
          message: 'Flow statistics retrieved',
          data: stats.flows,
        });
      }

      case 'detection': {
        // Detection engine statistics
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<typeof stats.detection>>({
          success: true,
          message: 'Detection statistics retrieved',
          data: stats.detection,
        });
      }

      case 'files': {
        // File handling statistics
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<typeof stats.files>>({
          success: true,
          message: 'File statistics retrieved',
          data: stats.files,
        });
      }

      case 'full': {
        // Complete statistics dump
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<SuricataStats>>({
          success: true,
          message: 'Full statistics retrieved',
          data: stats,
        });
      }

      default:
        // Default: return summary with all key metrics
        const summary = await client.getDashboardSummary(searchParams.get('timeRange') || '24h');
        const stats = await client.getStats();

        return NextResponse.json<SuricataAPIResponse<{
          summary: SuricataDashboardSummary;
          detailed: Pick<SuricataStats, 'packets' | 'bytes' | 'protocols' | 'memory' | 'threads'>;
        }>>({
          success: true,
          message: 'Statistics overview retrieved',
          data: {
            summary,
            detailed: {
              packets: stats.packets,
              bytes: stats.bytes,
              protocols: stats.protocols,
              memory: stats.memory,
              threads: stats.threads,
            },
          },
        });
    }
  } catch (error) {
    console.error('[Suricata Statistics GET] Error:', error);

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
