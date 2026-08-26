/**
 * 🇩🇿 National SOC - Wazuh Alerts API Route
 * GET /api/integrations/wazuh/alerts - Search alerts
 * POST /api/integrations/wazuh/alerts - Execute actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Wazuh Alerts API Error:', error);
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const wazuhError = error as { statusCode?: number; message?: string; code?: string };
    return NextResponse.json(
      {
        success: false,
        error: 'Wazuh API Error',
        message: wazuhError.message || 'Unknown error',
        code: wazuhError.code,
      },
      { status: wazuhError.statusCode || 500 }
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
// GET - Search Alerts
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getWazuhClient();
    const searchParams = request.nextUrl.searchParams;

    // Build query parameters
    const params: Record<string, any> = {};
    
    if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sort')) params.sort = searchParams.get('sort')!;
    if (searchParams.get('search')) params.search = searchParams.get('search')!;
    if (searchParams.get('time_range')) params.time_range = searchParams.get('time_range')!;
    if (searchParams.get('from_date')) params.from_date = searchParams.get('from_date')!;
    if (searchParams.get('to_date')) params.to_date = searchParams.get('to_date')!;
    if (searchParams.get('severity')) params.severity = searchParams.get('severity')!;

    // Handle array parameters
    if (searchParams.get('rule_ids')) {
      params.rule_ids = searchParams.get('rule_ids')!.split(',').map(Number);
    }
    if (searchParams.get('groups')) {
      params.groups = searchParams.get('groups')!.split(',');
    }
    if (searchParams.get('agents')) {
      params.agents = searchParams.get('agents')!.split(',');
    }

    const result = await client.searchAlerts(params);

    return NextResponse.json({
      success: true,
      data: result.data,
      totalItems: result.totalItems,
      meta: {
        offset: params.offset || 0,
        limit: params.limit || 100,
        query: params,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Execute Alert Actions
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentIds, alertId, notes } = body;
    const client = getWazuhClient();

    switch (action) {
      case 'isolate_host':
        // Isolate host via active response
        for (const agentId of agentIds || []) {
          await client.isolateHost(agentId);
        }
        return NextResponse.json({
          success: true,
          message: `Isolated ${agentIds?.length || 0} host(s)`,
          timestamp: new Date().toISOString(),
        });

      case 'unisolate_host':
        // Remove isolation from host
        for (const agentId of agentIds || []) {
          await client.unisolateHost(agentId);
        }
        return NextResponse.json({
          success: true,
          message: `Removed isolation from ${agentIds?.length || 0} host(s)`,
          timestamp: new Date().toISOString(),
        });

      case 'restart_agent':
        // Restart agent to apply config changes
        for (const agentId of agentIds || []) {
          await client.restartAgent(agentId);
        }
        return NextResponse.json({
          success: true,
          message: `Restarted ${agentIds?.length || 0} agent(s)`,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleError(error);
  }
}
