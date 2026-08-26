/**
 * National SOC Platform - Threat Hunting API Routes
 * 
 * RESTful API endpoints for threat hunting operations:
 * - Hunt management (CRUD)
 * - Hypothesis operations
 * - Session collaboration
 * - Finding management
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { threatHuntEngine, HuntHypothesis, HuntSession, HuntFinding, HUNT_TEMPLATES } from '@/lib/threat-hunting/hunt-engine';

// GET /api/threat-hunting/hunts - List all hunts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');

    switch (action) {
      case 'active':
        const activeHunts = threatHuntEngine.getActiveHunts();
        return NextResponse.json({ success: true, data: activeHunts });

      case 'completed':
        const limit = parseInt(searchParams.get('limit') || '10');
        const completedHunts = threatHuntEngine.getCompletedHunts(limit);
        return NextResponse.json({ success: true, data: completedHunts });

      case 'templates':
        return NextResponse.json({ success: true, data: HUNT_TEMPLATES });

      case 'findings': {
        const huntId = searchParams.get('huntId');
        if (!huntId) {
          return NextResponse.json(
            { success: false, error: 'huntId parameter required' },
            { status: 400 }
          );
        }
        const findings = threatHuntEngine.getFindingsForHunt(huntId);
        return NextResponse.json({ success: true, data: findings });
      }

      default:
        // Return hunts filtered by status if provided
        let hunts = threatHuntEngine.getActiveHunts();
        if (status) {
          hunts = hunts.filter(h => h.status === status);
        }
        return NextResponse.json({ 
          success: true, 
          data: hunts,
          count: hunts.length,
        });
    }

  } catch (error) {
    console.error('[ThreatHunting API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/threat-hunting/hunts - Create new hunt or session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'create_hypothesis': {
        const hypothesis = await threatHuntEngine.createHypothesis({
          title: body.title,
          description: body.description,
          category: body.category,
          severity: body.severity || 'medium',
          premise: body.premise,
          attackTechnique: body.attackTechnique,
          killChainPhase: body.killChainPhase,
          dataSources: body.dataSources || [],
          queries: body.queries || [],
          confidence: 0,
          createdBy: body.createdBy || 'analyst',
          tags: body.tags || [],
        });
        return NextResponse.json({ success: true, data: hypothesis });
      }

      case 'create_session': {
        const session = await threatHuntEngine.createSession({
          name: body.name,
          description: body.description,
          ownerId: body.ownerId,
          ownerName: body.ownerName,
          isRecurring: body.isRecurring,
          recurrenceSchedule: body.recurrenceSchedule,
        });
        return NextResponse.json({ success: true, data: session });
      }

      case 'create_from_template': {
        const hypothesis = await threatHuntEngine.createFromTemplate(
          body.templateId,
          {
            createdBy: body.createdBy || 'analyst',
            ...body.customizations,
          }
        );
        return NextResponse.json({ success: true, data: hypothesis });
      }

      case 'execute_hunt': {
        const { hypothesisId, executedBy } = body;
        if (!hypothesisId) {
          return NextResponse.json(
            { success: false, error: 'hypothesisId required' },
            { status: 400 }
          );
        }
        const result = await threatHuntEngine.executeHunt(
          hypothesisId,
          executedBy || 'system'
        );
        return NextResponse.json({ success: true, data: result });
      }

      case 'approve_hypothesis': {
        const { hypothesisId, approvedBy } = body;
        const hypothesis = await threatHuntEngine.approveHypothesis(
          hypothesisId,
          approvedBy
        );
        return NextResponse.json({ success: true, data: hypothesis });
      }

      case 'send_message': {
        const { sessionId, authorId, authorName, content, type, mentions } = body;
        const message = await threatHuntEngine.sendChatMessage(
          sessionId,
          authorId,
          authorName,
          content,
          type || 'text',
          mentions || []
        );
        return NextResponse.json({ success: true, data: message });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[ThreatHunting API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
