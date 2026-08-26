/**
 * 🇩🇿 National SOC - Wazuh Compliance (SCA) API Route
 * GET /api/integrations/wazuh/compliance - Security compliance status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWazuhClient } from '../../lib/wazuh-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Wazuh Compliance API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Compliance Score & Results
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getWazuhClient();
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agent_id');

    if (agentId) {
      // Get SCA results for specific agent
      const results = await client.getSCAResults(agentId);
      
      return NextResponse.json({
        success: true,
        data: results,
        meta: { agentId, type: 'agent_specific' },
      });
    } else {
      // Get overall compliance score across all agents
      const [complianceScore, agentsSummary] = await Promise.all([
        client.getComplianceScore(),
        client.getAgentsSummary(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          scores: complianceScore,
          agents: agentsSummary,
          lastUpdated: new Date().toISOString(),
        },
        meta: { type: 'organization_wide' },
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
