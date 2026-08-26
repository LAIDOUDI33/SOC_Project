/**
 * National SOC Platform - DFIR Incident Response API
 * 
 * REST API for incident response operations including:
 * - Incident creation and management
 * - Playbook execution
 * - Task management
 * - Evidence linking
 * - Timeline generation
 * - Incident closure with lessons learned
 * 
 * @version 1.0.0
 * @api /api/dfir/incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getIREngine,
  type IncidentRecord,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentCategory,
  type Playbook,
  type LessonsLearned
} from '@/lib/dfir/incident-response-playbooks';

// GET /api/dfir/incidents - List or get incidents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('id');
    const status = searchParams.get('status') as IncidentStatus | null;
    const severity = searchParams.get('severity') as IncidentSeverity | null;
    const category = searchParams.get('category') as IncidentCategory | null;
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');

    // Specific action handlers
    const action = searchParams.get('action');

    const engine = getIREngine();

    // Get specific incident
    if (incidentId) {
      const incident = engine.getIncident(incidentId);
      if (!incident) {
        return NextResponse.json(
          { success: false, error: 'Incident not found' },
          { status: 404 }
        );
      }

      // Handle sub-actions
      if (action === 'timeline') {
        const timeline = engine.generateTimeline(incidentId);
        return NextResponse.json({
          success: true,
          data: timeline
        });
      }

      if (action === 'playbook') {
        if (!incident.playbookId) {
          return NextResponse.json(
            { success: false, error: 'No playbook associated with this incident' },
            { status: 404 }
          );
        }
        const playbook = engine.getPlaybook(incident.playbookId);
        return NextResponse.json({
          success: true,
          data: {
            ...playbook,
            currentPhase: incident.currentPhaseId,
            taskExecutions: incident.taskExecutions
          }
        });
      }

      // Return full incident details
      return NextResponse.json({
        success: true,
        data: incident
      });
    }

    // Handle special actions without ID
    if (action === 'statistics') {
      const stats = engine.getStatistics();
      return NextResponse.json({
        success: true,
        data: stats
      });
    }

    if (action === 'playbooks') {
      const category = searchParams.get('category') as IncidentCategory | undefined;
      const playbooks = engine.getPlaybooks(category);
      return NextResponse.json({
        success: true,
        data: playbooks,
        total: playbooks.length
      });
    }

    // List incidents with filters
    const incidents = engine.listIncidents({
      status: status || undefined,
      severity: severity || undefined,
      category: category || undefined,
      assigneeId: assigneeId || undefined,
      search: search || undefined
    });

    // Get overall statistics
    const stats = engine.getStatistics();

    return NextResponse.json({
      success: true,
      data: incidents,
      total: incidents.length,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

// POST /api/dfir/incidents - Create incident or perform actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const engine = getIREngine();

    switch (action) {
      case 'create': {
        // Create new incident
        const {
          title, description, severity, category,
          reportedBy, reporterName, affectedSystems,
          dataClassification, playbookId
        } = params;

        if (!title || !description || !severity || !category || !reportedBy || !reporterName) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Missing required fields: title, description, severity, category, reportedBy, reporterName' 
            },
            { status: 400 }
          );
        }

        const incident = await engine.createIncident({
          title,
          description,
          severity: severity as IncidentSeverity,
          category: category as IncidentCategory,
          reportedBy,
          reporterName,
          affectedSystems: affectedSystems || [],
          dataClassification: dataClassification as IncidentRecord['dataClassification'],
          playbookId
        });

        return NextResponse.json({
          success: true,
          data: incident,
          message: 'Incident created successfully'
        }, { status: 201 });
      }

      case 'update_status': {
        // Update incident status
        const { incidentId, status, userId } = params;

        if (!incidentId || !status || !userId) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: incidentId, status, userId' },
            { status: 400 }
          );
        }

        const updatedIncident = await engine.updateStatus(
          incidentId,
          status as IncidentStatus,
          userId
        );

        return NextResponse.json({
          success: true,
          data: updatedIncident,
          message: `Incident status updated to ${status}`
        });
      }

      case 'execute_task': {
        // Execute a playbook task
        const { incidentId, taskId, executorId, executorName, options } = params;

        if (!incidentId || !taskId || !executorId || !executorName) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: incidentId, taskId, executorId, executorName' },
            { status: 400 }
          );
        }

        const result = await engine.executeTask(
          incidentId,
          taskId,
          executorId,
          executorName,
          options
        );

        return NextResponse.json({
          success: true,
          data: result,
          message: `Task "${result.taskName}" completed successfully`
        });
      }

      case 'link_evidence': {
        // Link evidence to incident
        const { incidentId, evidenceId } = params;

        if (!incidentId || !evidenceId) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: incidentId, evidenceId' },
            { status: 400 }
          );
        }

        engine.linkEvidence(incidentId, evidenceId);

        return NextResponse.json({
          success: true,
          message: 'Evidence linked to incident successfully'
        });
      }

      case 'close_incident': {
        // Close incident with lessons learned
        const { incidentId, closerId, lessonsLearned } = params;

        if (!incidentId || !closerId) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: incidentId, closerId' },
            { status: 400 }
          );
        }

        const closedIncident = await engine.closeIncident(
          incidentId,
          closerId,
          lessonsLearned ? lessonsLearned as Partial<LessonsLearned> : undefined
        );

        return NextResponse.json({
          success: true,
          data: closedIncident,
          message: `Incident closed${closedIncident.slaMet ? ' (SLA met)' : ' (SLA breached)'}`
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in incidents API:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/dfir/incidents - Update incident (alternative method)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { incidentId, updates, userId } = body;

    if (!incidentId || !updates || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: incidentId, updates, userId' },
        { status: 400 }
      );
    }

    // For status updates, use the dedicated action
    if (updates.status) {
      const engine = getIREngine();
      const updatedIncident = await engine.updateStatus(
        incidentId,
        updates.status as IncidentStatus,
        userId
      );

      return NextResponse.json({
        success: true,
        data: updatedIncident,
        message: 'Incident updated successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Use POST method for incident updates' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating incident:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update incident' },
      { status: 500 }
    );
  }
}
