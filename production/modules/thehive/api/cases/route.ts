/**
 * 🇩🇿 National SOC - TheHive Cases API Route
 * GET /api/integrations/thehive/cases - List and search cases
 * POST /api/integrations/thehive/cases - Create new case
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheHiveClient } from '../../lib/thehive-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('TheHive Cases API Error:', error);
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const hiveError = error as { statusCode?: number; message?: string; code?: string; details?: any };
    
    return NextResponse.json(
      {
        success: false,
        error: 'TheHive API Error',
        message: hiveError.message || 'Unknown error',
        code: hiveError.code,
        details: hiveError.details,
      },
      { status: hiveError.statusCode || 500 }
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
// GET - Search/List Cases
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getTheHiveClient();
    const searchParams = request.nextUrl.searchParams;

    // Build search parameters
    const params: Record<string, any> = {};
    
    if (searchParams.get('query')) params.query = searchParams.get('query')!;
    if (searchParams.get('status')) params.status = searchParams.get('status')!;
    if (searchParams.get('severity')) params.severity = parseInt(searchParams.get('severity')!);
    if (searchParams.get('assignee')) params.assignee = searchParams.get('assignee')!;
    if (searchParams.get('range')) params.range = searchParams.get('range')!;
    if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sort')) params.sort = searchParams.get('sort')!;

    // Handle tags array parameter
    if (searchParams.get('tags')) {
      params.tags = searchParams.get('tags')!.split(',');
    }

    const result = await client.searchCases(params);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      meta: {
        offset: params.offset || 0,
        limit: params.limit || 20,
        query: params,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Create New Case
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getTheHiveClient();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check for automated creation from alert
    let newCase;
    if (body.fromAlert) {
      // Automated case from Wazuh alert
      newCase = await client.createCaseFromAlert(body.alert);
    } else {
      // Manual case creation
      newCase = await client.createCase({
        title: body.title,
        description: body.description,
        severity: body.severity,
        tags: body.tags,
        tlp: body.tlp,
        pap: body.pap,
        template: body.template,
        assignee: body.assignee,
        customFields: body.customFields,
      });
    }

    // Auto-create tasks if requested
    let tasks = [];
    if (body.createPlaybook !== false) {
      tasks = await client.createInvestigationPlaybook(newCase.id);
    }

    // Auto-extract observables if alert provided
    let observables = [];
    if (body.fromAlert && body.alert) {
      observables = await client.extractObservablesFromAlert(newCase.id, body.alert);
    }

    return NextResponse.json({
      success: true,
      data: {
        case: newCase,
        tasks,
        observables,
      },
      message: `Case ${newCase.id} created successfully`,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
