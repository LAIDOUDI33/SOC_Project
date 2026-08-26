/**
 * 🇩🇿 National SOC - TheHive Observables API Route
 * GET /api/integrations/thehive/observables/:caseId - Get case observables
 * POST /api/integrations/thehive/observables/:caseId - Add observable to case
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheHiveClient } from '../../../lib/thehive-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('TheHive Observables API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - List Observables for Case
// ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const client = getTheHiveClient();
    const observables = await client.getObservables(params.caseId);

    return NextResponse.json({
      success: true,
      data: observables,
      total: observables.length,
      
      // Group by type for easier consumption
      summary: observables.reduce((acc, obs) => {
        acc[obs.dataType] = (acc[obs.dataType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Add Observable to Case
// ────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const body = await request.json();
    const client = getTheHiveClient();

    // Validate required fields
    if (!body.dataType || !body.data) {
      return NextResponse.json(
        { success: false, error: 'dataType and data are required' },
        { status: 400 }
      );
    }

    // Support batch observable creation
    if (Array.isArray(body.observables)) {
      const createdObservables = [];
      for (const obs of body.observables) {
        try {
          const created = await client.addObservable(params.caseId, {
            dataType: obs.dataType,
            data: obs.data,
            message: obs.message,
            tags: obs.tags,
            tlp: obs.tlp,
            ioc: obs.ioc ?? true,
          });
          createdObservables.push(created);
        } catch (error) {
          console.error(`Failed to add observable ${obs.data}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        data: createdObservables,
        total: createdObservables.length,
        message: `Added ${createdObservables.length} observables to case ${params.caseId}`,
      }, { status: 201 });
    }

    // Single observable creation
    const observable = await client.addObservable(params.caseId, {
      dataType: body.dataType,
      data: body.data,
      message: body.message || '',
      tags: body.tags || [],
      tlp: body.tlp ?? 2,
      ioc: body.ioc ?? true,
      sighted: body.sighted ?? false,
    });

    return NextResponse.json({
      success: true,
      data: observable,
      message: `Observable ${observable.id} added to case ${params.caseId}`,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
