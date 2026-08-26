/**
 * 🇩🇿 National SOC - Suricata Alerts API Route
 * GET /api/integrations/suricata/alerts - Get IDS alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuricataClient } from '../../lib/suricata-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Suricata Alerts API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Get Alerts
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getSuricataClient();
    const searchParams = request.nextUrl.searchParams;

    // Build query parameters
    const params: Record<string, any> = {};
    
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);
    if (searchParams.get('severity')) params.severity = searchParams.get('severity')!;
    if (searchParams.get('action')) params.action = searchParams.get('action')!;
    if (searchParams.get('src_ip')) params.src_ip = searchParams.get('src_ip')!;
    if (searchParams.get('dst_ip')) params.dst_ip = searchParams.get('dst_ip')!;
    if (searchParams.get('protocol')) params.protocol = searchParams.get('protocol')!;

    // Handle time range
    if (searchParams.get('hours')) {
      const hours = parseInt(searchParams.get('hours')!);
      const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      params.from_date = fromDate.toISOString();
      params.to_date = new Date().toISOString();
    }

    const result = await client.getAlerts(params);

    return NextResponse.json({
      success: true,
      data: result.alerts,
      total: result.total,
      meta: {
        limit: params.limit || 100,
        offset: params.offset || 0,
        filters: params,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
