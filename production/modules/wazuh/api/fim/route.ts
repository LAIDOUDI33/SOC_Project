/**
 * 🇩🇿 National SOC - Wazuh FIM (File Integrity Monitoring) API Route
 * GET /api/integrations/wazuh/fim - File change events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Wazuh FIM API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - File Integrity Events
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getWazuhClient();
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');
    const hours = parseInt(searchParams.get('hours') || '24');
    const eventType = searchParams.get('type') as 'added' | 'modified' | 'deleted' | undefined;

    if (agentId) {
      // Get FIM events for specific agent
      const params: Record<string, any> = {};
      if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);
      if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
      if (eventType) params.type = eventType;

      const events = await client.getFIMEvents(agentId, params);

      return NextResponse.json({
        success: true,
        data: events,
        meta: { agentId, type: 'agent_specific' },
      });
    } else {
      // Get recent file changes across all agents
      const changes = await client.getRecentFileChanges(hours);

      // Filter by event type if specified
      const filteredChanges = eventType 
        ? changes.filter(c => c.event === eventType)
        : changes;

      return NextResponse.json({
        success: true,
        data: filteredChanges,
        totalItems: filteredChanges.length,
        meta: { type: 'all_agents', hours },
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
