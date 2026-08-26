/**
 * 🇩🇿 National SOC - MISP Events API Route
 * GET /api/integrations/misp/events - Search and list events
 * POST /api/integrations/misp/events - Create new event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMISPClient } from '../../lib/misp-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('MISP Events API Error:', error);
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const mispError = error as { statusCode?: number; message?: string; code?: string };
    
    return NextResponse.json(
      {
        success: false,
        error: 'MISP API Error',
        message: mispError.message || 'Unknown error',
        code: mispError.code,
      },
      { status: mispError.statusCode || 500 }
    );
  }
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Search/List Events
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getMISPClient();
    const searchParams = request.nextUrl.searchParams;

    // Build search parameters
    const params: Record<string, any> = {};
    
    if (searchParams.get('query')) params.query = searchParams.get('query')!;
    if (searchParams.get('eventinfo')) params.eventinfo = searchParams.get('eventinfo')!;
    if (searchParams.get('threat_level')) params.threat_level = parseInt(searchParams.get('threat_level')!);
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('page')) params.page = parseInt(searchParams.get('page')!);
    if (searchParams.get('from')) params.from = searchParams.get('from')!;
    if (searchParams.get('to')) params.to = searchParams.get('to')!;
    if (searchParams.get('sort')) params.sort = searchParams.get('sort');
    if (searchParams.get('orderby')) params.orderby = searchParams.get('orderby');

    // Handle tags array parameter
    if (searchParams.get('tags')) {
      params.tags = searchParams.get('tags')!.split(',');
    }

    // Handle days parameter for quick date range
    if (searchParams.get('days')) {
      const days = parseInt(searchParams.get('days')!);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      params.from = fromDate.toISOString();
    }

    const result = await client.searchEvents(params);

    return NextResponse.json({
      success: true,
      data: result.response,
      total: result.response.length,
      meta: {
        limit: params.limit || 50,
        page: params.page || 1,
        query: params,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Create New Event
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getMISPClient();

    // Validate required fields
    if (!body.info) {
      return NextResponse.json(
        { success: false, error: 'Event info/title is required' },
        { status: 400 }
      );
    }

    // Create event with optional IOCs
    const newEvent = await client.createEvent({
      info: body.info,
      threat_level_id: body.threat_level_id,
      analysis: body.analysis,
      distribution: body.distribution,
      date: body.date,
      tags: body.tags,
      attributes: body.attributes,
    });

    // Auto-publish if requested
    if (body.publish) {
      await client.publishEvent(newEvent.id);
    }

    return NextResponse.json({
      success: true,
      data: newEvent,
      message: `Event ${newEvent.id} created successfully`,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
