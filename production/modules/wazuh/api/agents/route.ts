/**
 * 🇩🇿 National SOC - Wazuh Agents API Route
 * GET /api/integrations/wazuh/agents - List and manage agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Wazuh Agents API Error:', error);
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const wazuhError = error as { statusCode?: number; message?: string; code?: string };
    return NextResponse.json(
      { success: false, error: wazuhError.message || 'Unknown error', code: wazuhError.code },
      { status: wazuhError.statusCode || 500 }
    );
  }
  
  return NextResponse.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - List Agents
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
    if (searchParams.get('status')) params.status = searchParams.get('status')!;

    const result = await client.listAgents(params);

    return NextResponse.json({
      success: true,
      data: result.data,
      totalItems: result.totalItems,
      meta: {
        offset: params.offset || 0,
        limit: params.limit || 100,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
