/**
 * 🇩🇿 National SOC - MISP Indicators/IOCs API Route
 * GET /api/integrations/misp/indicators - Search IOCs and check indicators
 * POST /api/integrations/misp/indicators - Add new IOCs to event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMISPClient } from '../../lib/misp-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('MISP Indicators API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - Search/Check Indicators
// ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const client = getMISPClient();
    const searchParams = request.nextUrl.searchParams;

    // Check single indicator mode
    if (searchParams.get('value')) {
      const value = searchParams.get('value')!;
      
      // Check warning list first
      let isWarningList = false;
      try {
        const warningResult = await client.checkWarningList(value);
        isWarningList = warningResult.filter(w => w).length > 0;
      } catch (e) {
        // Warning list check failed, continue with search
      }

      // Search for indicator
      const result = await client.searchAttributes({
        value,
        to_ids: true,
        enforceWarninglist: true,
        limit: 20,
        type: searchParams.get('type') || undefined,
      });

      const attributes = result.Attribute || [];
      
      // Calculate risk score based on matches
      let riskScore = 0;
      if (attributes.length > 0) {
        riskScore = Math.min(100, attributes.length * 20); // Base score
        // Boost for recent sightings
        const recentAttrs = attributes.filter(a => 
          a.timestamp && new Date(a.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        riskScore += recentAttrs.length * 10;
      }
      if (isWarningList) {
        riskScore = Math.max(0, riskScore - 50); // Reduce score for warning list items
      }

      return NextResponse.json({
        success: true,
        data: {
          indicator: value,
          found: attributes.length > 0,
          isWarningList,
          matches: attributes,
          matchCount: attributes.length,
          relatedEvents: [...new Set(attributes.map(a => a.event_id))].length,
          context: isWarningList 
            ? 'In warning list (likely false positive)' 
            : attributes.length > 0 
              ? `Found in ${attributes.length} attribute(s)` 
              : 'Not known malicious',
          riskScore: Math.min(100, riskScore),
          recommendation: generateRecommendation(riskScore, isWarningList),
        },
      });
    }

    // Search multiple indicators mode
    const params: Record<string, any> = {};
    
    if (searchParams.get('type')) params.type = searchParams.get('type')!;
    if (searchParams.get('category')) params.category = searchParams.get('category')!;
    if (searchParams.get('eventid')) params.eventid = searchParams.get('eventid')!;
    if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('tags')) params.tags = searchParams.get('tags')!.split(',');

    const result = await client.searchAttributes(params);

    return NextResponse.json({
      success: true,
      data: result.Attribute || [],
      total: (result.Attribute || []).length,
      meta: { query: params },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Add IOC(s) to Event
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getMISPClient();

    // Validate required fields
    if (!body.eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    if (body.iocs && Array.isArray(body.iocs)) {
      // Batch add IOCs
      const results = await client.batchAddIOCs(body.eventId, body.iocs);

      return NextResponse.json({
        success: true,
        data: results,
        totalAdded: results.length,
        message: `Added ${results.length} IOCs to event ${body.eventId}`,
      }, { status: 201 });
    } else if (body.type && body.value) {
      // Single IOC add
      const attribute = await client.addAttribute(body.eventId, {
        type: body.type,
        value: body.value,
        category: body.category,
        comment: body.comment,
        to_ids: body.to_ids !== false,
      });

      return NextResponse.json({
        success: true,
        data: attribute,
        message: `IOC added to event ${body.eventId}`,
      }, { status: 201 });
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide iocs array or type+value for single IOC' },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// HELPER: Generate recommendation based on risk score
// ────────────────────────────────────────────────────────

function generateRecommendation(riskScore: number, isWarningList: boolean): string {
  if (isWarningList && riskScore < 30) {
    return 'Likely benign - appears in warning lists. Verify context before action.';
  }
  
  if (riskScore >= 80) {
    return 'HIGH RISK - Immediate investigation and containment recommended.';
  } else if (riskScore >= 60) {
    return 'ELEVATED RISK - Prioritize investigation and monitor closely.';
  } else if (riskScore >= 40) {
    return 'MODERATE RISK - Include in threat hunting queries.';
  } else if (riskScore >= 20) {
    return 'LOW RISK - Log for awareness and correlation.';
  }
  
  return 'NO THREAT - No known malicious associations found.';
}
