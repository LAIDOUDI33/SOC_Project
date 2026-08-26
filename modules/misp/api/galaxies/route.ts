/**
 * MISP Galaxies API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - Galaxy listing and search
 * - Threat actor intelligence
 * - MITRE ATT&CK integration
 * - Malware family tracking
 * - Tool/utility identification
 * - Cluster search across all galaxies
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeMISPClient,
  getMISPClient,
} from '../../lib/misp-client';
import type {
  MISPGalaxy,
  GalaxyCluster,
  MISPAPIResponse,
} from '../../types/misp.types';

// Configuration from environment
const MISP_CONFIG = {
  url: process.env.MISP_URL || 'https://misp.algeria-soc.dz',
  apiKey: process.env.MISP_API_KEY || '',
};

/**
 * GET /api/misp/galaxies
 * Retrieve galaxy data
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

    switch (action) {
      case 'all': {
        // Get all available galaxies
        const galaxies = await client.getGalaxies();

        return NextResponse.json<MISPAPIResponse<MISPGalaxy[]>>({
          success: true,
          message: `Retrieved ${galaxies.length} galaxies`,
          data: galaxies,
        });
      }

      case 'single': {
        // Get specific galaxy by type
        const galaxyType = searchParams.get('type');
        if (!galaxyType) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Galaxy type is required', data: null },
            { status: 400 }
          );
        }

        const galaxy = await client.getGalaxy(galaxyType);

        return NextResponse.json<MISPAPIResponse<MISPGalaxy>>({
          success: true,
          message: `Retrieved galaxy: ${galaxy.name}`,
          data: galaxy,
        });
      }

      case 'threatActors': {
        // Get threat actors from MITRE ATT&CK
        const clusters = await client.getThreatActors();

        return NextResponse.json<MISPAPIResponse<GalaxyCluster[]>>({
          success: true,
          message: `Retrieved ${clusters.length} threat actors`,
          data: clusters,
        });
      }

      case 'mitreTactics': {
        // Get MITRE ATT&CK tactics
        const tactics = await client.getMITRETactics();

        return NextResponse.json<MISPAPIResponse<GalaxyCluster[]>>({
          success: true,
          message: `Retrieved ${tactics.length} MITRE tactics`,
          data: tactics,
        });
      }

      case 'malware': {
        // Get malware families
        const malware = await client.getMalwareFamilies();

        return NextResponse.json<MISPAPIResponse<GalaxyCluster[]>>({
          success: true,
          message: `Retrieved ${malware.length} malware families`,
          data: malware,
        });
      }

      case 'tools': {
        // Get tools/utilities
        const tools = await client.getTools();

        return NextResponse.json<MISPAPIResponse<GalaxyCluster[]>>({
          success: true,
          message: `Retrieved ${tools.length} tools`,
          data: tools,
        });
      }

      case 'search': {
        // Search clusters across all galaxies
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Search query is required', data: null },
            { status: 400 }
          );
        }

        const results = await client.searchClusters(query);

        return NextResponse.json<MISPAPIResponse<typeof results>>({
          success: true,
          message: `Found ${results.length} matching clusters`,
          data: results,
        });
      }

      default:
        // Default: return summary of key galaxies
        const [threatActors, malware, tools] = await Promise.all([
          client.getThreatActors().catch(() => []),
          client.getMalwareFamilies().catch(() => []),
          client.getTools().catch(() => []),
        ]);

        return NextResponse.json<MISPAPIResponse<{
          threatActorCount: number;
          malwareCount: number;
          toolCount: number;
          topThreatActors: Array<{ name: string; description: string }>;
        }>>({
          success: true,
          message: 'Galaxy summary retrieved',
          data: {
            threatActorCount: threatActors.length,
            malwareCount: malware.length,
            toolCount: tools.length,
            topThreatActors: threatActors.slice(0, 10).map(c => ({
              name: c.value,
              description: c.description?.substring(0, 200),
            })),
          },
        });
    }
  } catch (error) {
    console.error('[MISP Galaxies GET] Error:', error);

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
