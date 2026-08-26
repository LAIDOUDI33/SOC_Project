/**
 * 🇩🇿 National SOC - MISP Galaxies/Threat Actors API Route
 * GET /api/integrations/misp/galaxies - Threat actors and galaxy data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMISPClient } from '../../lib/misp-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('MISP Galaxies API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Get Galaxy Data
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getMISPClient();
    const searchParams = request.nextUrl.searchParams;
    
    const type = searchParams.get('type'); // e.g., 'threat-actor', 'mitre-attack'

    if (type === 'mitre-attack') {
      // Get MITRE ATT&CK data specifically
      const mitreData = await client.getMITREATTCK();
      
      return NextResponse.json({
        success: true,
        data: mitreData,
        type: 'mitre-attack',
      });
    }

    if (type === 'threat-actor' || type === undefined) {
      // Get threat actors (default)
      const [galaxies, clusters] = await Promise.all([
        client.getGalaxies(),
        type 
          ? client.getGalaxyClusters(type)
          : client.getGalaxyClusters('threat-actor'),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          galaxies,
          clusters: clusters.slice(0, 50), // Limit to prevent huge responses
          totalClusters: clusters.length,
        },
        type: type || 'threat-actor',
      });
    }

    // Generic galaxy cluster request
    const clusters = await client.getGalaxyClusters(type);

    return NextResponse.json({
      success: true,
      data: clusters,
      type,
      total: clusters.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
