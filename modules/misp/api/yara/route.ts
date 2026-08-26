/**
 * MISP YARA Rules API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - YARA rule generation from events
 * - Bulk ruleset export
 * - Rule customization options
 * - Download formatted rules
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeMISPClient,
  getMISPClient,
} from '../../lib/misp-client';
import type {
  YARARule,
  MISPAPIResponse,
} from '../../types/misp.types';

// Configuration from environment
const MISP_CONFIG = {
  url: process.env.MISP_URL || 'https://misp.algeria-soc.dz',
  apiKey: process.env.MISP_API_KEY || '',
};

/**
 * GET /api/misp/yara
 * Generate or retrieve YARA rules
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize client if needed
    try {
      getMISPClient();
    } catch {
      initializeMISPClient(MISP_CONFIG);
    }

    const client = getMISPClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'generate': {
        // Generate YARA rule from single event
        const eventId = searchParams.get('eventId');
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event ID is required', data: null },
            { status: 400 }
          );
        }

        const options = {
          includeHashes: searchParams.get('includeHashes') !== 'false',
          includeStrings: searchParams.get('includeStrings') !== 'false',
          includeIPs: searchParams.get('includeIPs') === 'true',
          includeDomains: searchParams.get('includeDomains') !== 'false',
        };

        const rule = await client.generateYARAFromEvent(eventId, options);

        return NextResponse.json<MISPAPIResponse<YARARule>>({
          success: true,
          message: `YARA rule generated for event ${eventId}`,
          data: rule,
        });
      }

      case 'export': {
        // Export multiple rules as a ruleset
        const eventIdsParam = searchParams.get('eventIds');
        if (!eventIdsParam) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event IDs are required', data: null },
            { status: 400 }
          );
        }

        const eventIds = eventIdsParam.split(',');
        const ruleset = await client.exportYARARuleset(eventIds);

        // Return as downloadable text file
        return new NextResponse(ruleset, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="misp_ruleset_${Date.now()}.yar"`,
          },
        });
      }

      default:
        return NextResponse.json<MISPAPIResponse<null>>(
          {
            success: false,
            message: `Unknown action: ${action}`,
            data: null,
            errors: [`Invalid action: ${action}`],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MISP YARA GET] Error:', error);

    return NextResponse.json<MISPAPIResponse<null>>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
        errors: [(error instanceof Error ? error.message : 'Unknown error')],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/misp/yara
 * Batch operations on YARA rules
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize client if needed
    try {
      getMISPClient();
    } catch {
      initializeMISPClient(MISP_CONFIG);
    }

    const client = getMISPClient();
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'batchGenerate': {
        // Generate rules for multiple events
        const eventIds: string[] = body.eventIds || [];
        const ruleset = await client.exportYARARuleset(eventIds);

        return NextResponse.json<MISPAPIResponse<{
          ruleCount: number;
          ruleset: string;
          downloadUrl: string;
        }>>({
          success: true,
          message: `Generated ${eventIds.length} YARA rules`,
          data: {
            ruleCount: eventIds.length,
            ruleset,
            downloadUrl: `/api/misp/yara?action=export&eventIds=${eventIds.join(',')}`,
          },
        });
      }

      case 'customize': {
        // Generate with custom options
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event ID is required', data: null },
            { status: 400 }
          );
        }

        const rule = await client.generateYARAFromEvent(eventId, {
          includeHashes: body.includeHashes !== false,
          includeStrings: body.includeStrings !== false,
          includeIPs: body.includeIPs === true,
          includeDomains: body.includeDomains !== false,
          maxSize: body.maxSize,
        });

        return NextResponse.json<MISPAPIResponse<YARARule>>({
          success: true,
          message: 'Customized YARA rule generated',
          data: rule,
        });
      }

      default:
        return NextResponse.json<MISPAPIResponse<null>>(
          {
            success: false,
            message: `Unknown action: ${action}`,
            data: null,
            errors: [`Invalid action: ${action}`],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MISP YARA POST] Error:', error);

    return NextResponse.json<MISPAPIResponse<null>>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
        errors: [(error instanceof Error ? error.message : 'Unknown error')],
      },
      { status: 500 }
    );
  }
}
