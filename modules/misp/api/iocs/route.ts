/**
 * MISP IOCs (Indicators of Compromise) API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - IOC search and filtering
 * - IOC validation against warninglists
 * - Bulk IOC operations
 * - IOC export in various formats
 * - Sightings management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeMISPClient,
  getMISPClient,
  MISPError,
} from '../../lib/misp-client';
import type {
  MISPAttribute,
  MISPAPIResponse,
  WarninglistHit,
  MISPBulkOperationResult,
} from '../../types/misp.types';

// Configuration from environment
const MISP_CONFIG = {
  url: process.env.MISP_URL || 'https://misp.algeria-soc.dz',
  apiKey: process.env.MISP_API_KEY || '',
};

/**
 * GET /api/misp/iocs
 * Search and retrieve IOCs
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
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    switch (action) {
      case 'search': {
        // Search IOCs with filters
        const result = await client.searchAttributes({
          value: searchParams.get('value') || undefined,
          type: (searchParams.get('type') as any) || undefined,
          category: searchParams.get('category') || undefined,
          tag: searchParams.get('tag') ? [searchParams.get('tag')!] : undefined,
          event_id: searchParams.get('eventId') || undefined,
          to_ids: true,  // Only IOCs
          includeContext: true,
          includeCorrelations: true,
          enforceWarninglist: searchParams.get('enforceWarninglist') === 'true',
          limit,
        });

        return NextResponse.json<MISPAPIResponse<{
          iocs: MISPAttribute[];
          total: number;
        }>>({
          success: true,
          message: `Found ${result.response.Attribute?.length || 0} IOCs`,
          data: {
            iocs: result.response.Attribute || [],
            total: result.response.Attribute?.length || 0,
          },
        });
      }

      case 'byType': {
        // Get IOCs by specific type
        const type = searchParams.get('type');
        if (!type) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Type is required', data: null },
            { status: 400 }
          );
        }

        const iocs = await client.getIOCs({
          type: type as any,
          published_only: searchParams.get('publishedOnly') === 'true',
          limit,
        });

        return NextResponse.json<MISPAPIResponse<MISPAttribute[]>>({
          success: true,
          message: `Found ${iocs.length} IOCs of type ${type}`,
          data: iocs,
        });
      }

      case 'byEvent': {
        // Get IOCs for a specific event
        const eventId = searchParams.get('eventId');
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event ID is required', data: null },
            { status: 400 }
          );
        }

        const iocs = await client.getIOCs({ event_id: eventId, limit });

        return NextResponse.json<MISPAPIResponse<MISPAttribute[]>>({
          success: true,
          message: `Found ${iocs.length} IOCs for event ${eventId}`,
          data: iocs,
        });
      }

      case 'validate': {
        // Validate values against warninglists
        const valuesParam = searchParams.get('values');
        if (!valuesParam) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Values parameter is required', data: null },
            { status: 400 }
          );
        }

        const values = valuesParam.split(',');
        const hits = await client.validateAgainstWarninglists(values);

        return NextResponse.json<MISPAPIResponse<{
          validated: number;
          hits: WarninglistHit[];
          clean: string[];
        }>>({
          success: true,
          message: `Validated ${values.length} values. Found ${hits.length} warninglist matches.`,
          data: {
            validated: values.length,
            hits,
            clean: values.filter(v => !hits.some(h => h.value === v)),
          },
        });
      }

      case 'sightings': {
        // Get sightings for an attribute
        const attributeId = searchParams.get('attributeId');
        if (!attributeId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Attribute ID is required', data: null },
            { status: 400 }
          );
        }

        const sightings = await client.getSightings(attributeId);

        return NextResponse.json<MISPAPIResponse<typeof sightings>>({
          success: true,
          message: `Found ${sightings.length} sightings`,
          data: sightings,
        });
      }

      case 'trending': {
        // Get trending/popular IOCs from statistics
        const stats = await client.getStatistics(searchParams.get('timeRange') || '30d');

        return NextResponse.json<MISPAPIResponse<typeof stats.threats.trending_iocs>>({
          success: true,
          message: `Retrieved trending IOCs`,
          data: stats.threats.trending_iocs,
        });
      }

      default: {
        // Default: get all IOCs with pagination
        const iocs = await client.getIOCs({ limit });

        return NextResponse.json<MISPAPIResponse<MISPAttribute[]>>({
          success: true,
          message: `Retrieved ${iocs.length} IOCs`,
          data: iocs,
        });
      }
    }
  } catch (error) {
    console.error('[MISP IOCs GET] Error:', error);

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
 * POST /api/misp/iocs
 * Create or manage IOCs
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
      case 'add': {
        // Add single IOC to event
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event ID is required', data: null },
            { status: 400 }
          );
        }

        const attribute = await client.addAttribute(eventId, {
          type: body.type,
          value: body.value,
          category: body.category,
          to_ids: body.toIds !== false,
          comment: body.comment,
          distribution: body.distribution,
          tags: body.tags,
          disable_correlation: body.disableCorrelation,
        });

        return NextResponse.json<MISPAPIResponse<MISPAttribute>>({
          success: true,
          message: `IOC added: ${attribute.id}`,
          data: attribute,
        });
      }

      case 'batchAdd': {
        // Add multiple IOCs at once
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Event ID is required', data: null },
            { status: 400 }
          );
        }

        const result = await client.addAttributesBatch(
          eventId,
          body.iocs || []
        );

        return NextResponse.json<MISPAPIResponse<MISPBulkOperationResult>>({
          success: result.success,
          message: `Processed ${result.processed} IOCs (${result.failed} failed)`,
          data: result,
        });
      }

      case 'update': {
        // Update existing IOC
        const attributeId = body.attributeId;
        if (!attributeId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Attribute ID is required', data: null },
            { status: 400 }
          );
        }

        const attribute = await client.updateAttribute(attributeId, body.updates || {});

        return NextResponse.json<MISPAPIResponse<MISPAttribute>>({
          success: true,
          message: `IOC updated: ${attributeId}`,
          data: attribute,
        });
      }

      case 'delete': {
        // Delete IOC
        const attributeId = body.attributeId;
        if (!attributeId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Attribute ID is required', data: null },
            { status: 400 }
          );
        }

        await client.deleteAttribute(attributeId);

        return NextResponse.json<MISPAPIResponse<null>>({
          success: true,
          message: `IOC deleted: ${attributeId}`,
          data: null,
        });
      }

      case 'reportSighting': {
        // Report sighting for an IOC
        const sighting = await client.reportSighting({
          attribute_id: body.attributeId,
          value: body.value,
          event_id: body.eventId,
          type: body.type || '0' as any,
          source: body.source || 'Algeria SOC Platform',
        });

        return NextResponse.json<MISPAPIResponse<typeof sighting>>({
          success: true,
          message: 'Sighting reported successfully',
          data: sighting,
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
    console.error('[MISP IOCs POST] Error:', error);

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
