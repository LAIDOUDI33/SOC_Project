/**
 * 🇩🇿 National SOC - Suricata Rules API Route
 * GET /api/integrations/suricata/rules - Get IDS rules
 * POST /api/integrations/suricata/rules - Add new rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuricataClient } from '../../lib/suricata-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('Suricata Rules API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - List Rules
// ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = getSuricataClient();
    const rules = await client.getRules();

    return NextResponse.json({
      success: true,
      data: rules,
      total: rules.length,
      summary: {
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        disabled: rules.filter(r => !r.enabled).length,
        byAction: {
          alert: rules.filter(r => r.action === 'alert').length,
          drop: rules.filter(r => r.action === 'drop').length,
          reject: rules.filter(r => r.action === 'reject').length,
          pass: rules.filter(r => r.action === 'pass').length,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Add New Rule
// ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = getSuricataClient();

    if (!body.rule) {
      return NextResponse.json(
        { success: false, error: 'Rule text is required' },
        { status: 400 }
      );
    }

    const rule = await client.addRule(body.rule);

    return NextResponse.json({
      success: true,
      data: rule,
      message: `Rule ${rule.sid} added successfully`,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
