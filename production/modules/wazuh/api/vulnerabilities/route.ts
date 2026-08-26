/**
 * 🇩🇿 National SOC - Wazuh Vulnerabilities API Route
 * GET /api/integrations/wazuh/vulnerabilities - Vulnerability detection data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Wazuh Vulnerabilities API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Vulnerability Data
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getWazuhClient();
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | undefined;

    if (agentId) {
      // Get vulnerabilities for specific agent
      const params: Record<string, any> = {};
      if (searchParams.get('offset')) params.offset = parseInt(searchParams.get('offset')!);
      if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
      if (severity) params.severity = severity;

      const vulns = await client.getVulnerabilities(agentId, params);

      return NextResponse.json({
        success: true,
        data: vulns,
        meta: { agentId, type: 'agent_specific' },
      });
    } else {
      // Get vulnerability summary across all agents
      const [summary, agentsSummary] = await Promise.all([
        client.getVulnerabilitySummary(),
        client.getAgentsSummary(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          totalAgents: agentsSummary.total,
          activeAgents: agentsSummary.active,
          lastUpdated: new Date().toISOString(),
        },
        meta: { type: 'organization_wide' },
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
