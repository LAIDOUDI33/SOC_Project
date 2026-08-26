/**
 * 🇩🇿 National SOC - TheHive Tasks API Route
 * GET /api/integrations/thehive/tasks/:caseId - Get case tasks
 * POST /api/integrations/thehive/tasks/:caseId - Add task to case
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTheHiveClient } from '../../../lib/thehive-client';

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

function handleError(error: unknown): NextResponse {
  console.error('TheHive Tasks API Error:', error);
  
  return NextResponse.json(
    {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

// ────────────────────────────────────────────────────────
// GET - List Tasks for Case
// ────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const client = getTheHiveClient();
    const tasks = await client.getTasks(params.caseId);

    return NextResponse.json({
      success: true,
      data: tasks,
      total: tasks.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

// ────────────────────────────────────────────────────────
// POST - Add Task to Case
// ────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const body = await request.json();
    const client = getTheHiveClient();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'Task title is required' },
        { status: 400 }
      );
    }

    const task = await client.addTask(params.caseId, {
      title: body.title,
      description: body.description,
      status: body.status || 'Waiting',
      assignee: body.assignee,
      flag: body.flag || false,
    });

    return NextResponse.json({
      success: true,
      data: task,
      message: `Task ${task.id} added to case ${params.caseId}`,
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
