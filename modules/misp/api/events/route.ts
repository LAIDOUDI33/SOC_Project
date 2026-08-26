/**
 * MISP Events API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - Event listing with filtering
 * - Event creation from alerts
 * - Event search
 * - Event publishing
 * - Statistics aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeMISPClient,
  getMISPClient,
  MISPError,
  MISPAuthenticationError,
} from '../../lib/misp-client';
import type {
  MISPEvent,
  MISPAPIResponse,
  MISPStatistics,
} from '../../types/misp.types';

// Configuration from environment
const MISP_CONFIG = {
  url: process.env.MISP_URL || 'https://misp.algeria-soc.dz',
  apiKey: process.env.MISP_API_KEY || '',
};

/**
 * GET /api/misp/events
 * List or search events
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const timeRange = searchParams.get('timeRange') || '30d';

    switch (action) {
      case 'search': {
        // Search events with filters
        const events = await client.searchEvents({
          value: searchParams.get('value') || undefined,
          type: (searchParams.get('type') as any) || undefined,
          category: searchParams.get('category') || undefined,
          tag: searchParams.get('tag') ? [searchParams.get('tag')!] : undefined,
          threat_level_id: searchParams.get('threatLevel')
            ? parseInt(searchParams.get('threatLevel')!, 10)
            : undefined,
          published: searchParams.get('published')
            ? searchParams.get('published') === 'true'
            : undefined,
          analysis: (searchParams.get('analysis') as any) || undefined,
          last: searchParams.get('last') || timeRange,
          limit,
          page,
          include_correlations: true,
        });

        return NextResponse.json<MISPAPIResponse<{
          events: MISPEvent[];
          total: number;
        }>>({
          success: true,
          message: `Found ${events.response.MISPEvent?.length || 0} events`,
          data: {
            events: events.response.MISPEvent || [],
            total: events.response.MISPEvent?.length || 0,
          },
          pagination: {
            page,
            limit,
            total: events.response.MISPEvent?.length || 0,
            totalPages: Math.ceil(
              ((events.response.MISPEvent?.length || 0) / limit)
            ),
          },
        });
      }

      case 'recent': {
        // Get recent events
        const days = parseInt(searchParams.get('days') || '7', 10);
        const events = await client.getRecentEvents(days, limit);

        return NextResponse.json<MISPAPIResponse<MISPEvent[]>>({
          success: true,
          message: `Retrieved ${events.length} recent events`,
          data: events,
        });
      }

      case 'statistics': {
        // Get dashboard statistics
        const stats = await client.getStatistics(timeRange);

        return NextResponse.json<MISPAPIResponse<MISPStatistics>>({
          success: true,
          message: 'Statistics retrieved successfully',
          data: stats,
        });
      }

      case 'timeline': {
        // Get event timeline data
        const days = parseInt(searchParams.get('days') || '30', 10);
        const timeline = await client.timeline(days);

        return NextResponse.json<MISPAPIResponse<typeof timeline>>({
          success: true,
          message: `Timeline data for ${days} days`,
          data: timeline,
        });
      }

      case 'single': {
        // Get single event by ID/UUID
        const eventId = searchParams.get('eventId');
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            {
              success: false,
              message: 'Event ID is required',
              data: null,
              errors: ['Missing eventId parameter'],
            },
            { status: 400 }
          );
        }

        const event = await client.getEvent(eventId, {
          includeAttributes: true,
          includeObjects: true,
          includeCorrelations: true,
        });

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: 'Event retrieved successfully',
          data: event,
        });
      }

      default: {
        // Default: list recent events
        const events = await client.getRecentEvents(7, limit);

        return NextResponse.json<MISPAPIResponse<MISPEvent[]>>({
          success: true,
          message: `Retrieved ${events.length} events`,
          data: events,
        });
      }
    }
  } catch (error) {
    console.error('[MISP Events API] Error:', error);

    if (error instanceof MISPAuthenticationError) {
      return NextResponse.json<MISPAPIResponse<null>>(
        {
          success: false,
          message: 'Authentication failed. Check MISP API key.',
          data: null,
          errors: ['AUTH_FAILED'],
        },
        { status: 401 }
      );
    }

    if (error instanceof MISPError && error.statusCode === 429) {
      return NextResponse.json<MISPAPIResponse<null>>(
        {
          success: false,
          message: 'Rate limited. Please retry later.',
          data: null,
          errors: ['RATE_LIMITED'],
        },
        { status: 429 }
      );
    }

    return NextResponse.json<MISPAPIResponse<null>>(
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

/**
 * POST /api/misp/events
 * Create new event or perform actions
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
      case 'create': {
        // Create new event
        const event = await client.createEvent({
          info: body.info || 'Untitled Event',
          threat_level_id: body.threatLevel || 4,
          analysis: body.analysis || '0' as any,
          distribution: body.distribution || '0' as any,
          date: body.date,
          tags: body.tags,
        });

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: `Event created: ${event.id}`,
          data: event,
        });
      }

      case 'fromAlert': {
        // Create event from security alert
        const event = await client.createEventFromAlert({
          title: body.title || 'Security Alert',
          description: body.description || '',
          severity: body.severity || 'medium',
          source: body.source || 'unknown',
          iocs: body.iocs || [],
          tags: body.tags,
          references: body.references,
        });

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: `Event created from alert: ${event.id}`,
          data: event,
        });
      }

      case 'publish': {
        // Publish an event
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            {
              success: false,
              message: 'Event ID is required',
              data: null,
              errors: ['Missing eventId'],
            },
            { status: 400 }
          );
        }

        const event = await client.publishEvent(eventId, body.alert !== false);

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: `Event ${event.id} published`,
          data: event,
        });
      }

      case 'update': {
        // Update event
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            {
              success: false,
              message: 'Event ID is required',
              data: null,
              errors: ['Missing eventId'],
            },
            { status: 400 }
          );
        }

        const event = await client.updateEvent(eventId, body.updates || {});

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: `Event ${event.id} updated`,
          data: event,
        });
      }

      case 'delete': {
        // Delete event
        const eventId = body.eventId;
        if (!eventId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            {
              success: false,
              message: 'Event ID is required',
              data: null,
              errors: ['Missing eventId'],
            },
            { status: 400 }
          );
        }

        await client.deleteEvent(eventId);

        return NextResponse.json<MISPAPIResponse<null>>({
          success: true,
          message: `Event ${eventId} deleted`,
          data: null,
        });
      }

      case 'addTag':
      case 'removeTag': {
        // Tag management
        const eventId = body.eventId;
        const tagName = body.tag;
        if (!eventId || !tagName) {
          return NextResponse.json<MISPAPIResponse<null>>(
            {
              success: false,
              message: 'Event ID and tag name are required',
              data: null,
              errors: ['Missing eventId or tag'],
            },
            { status: 400 }
          );
        }

        const event =
          action === 'addTag'
            ? await client.attachTagToEvent(eventId, tagName)
            : await client.removeTagFromEvent(eventId, tagName);

        return NextResponse.json<MISPAPIResponse<MISPEvent>>({
          success: true,
          message: `Tag ${action === 'addTag' ? 'attached to' : 'removed from'} event`,
          data: event,
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
    console.error('[MISP Events POST] Error:', error);

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
