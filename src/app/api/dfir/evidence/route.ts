/**
 * National SOC Platform - Digital Evidence Management API
 * 
 * REST API for evidence management operations including:
 * - Evidence registration and upload
 * - Chain of custody tracking
 * - Integrity verification
 * - Evidence export with custody reports
 * - Legal hold management
 * 
 * @version 1.0.0
 * @api /api/dfir/evidence
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getEvidenceEngine,
  type EvidenceItem,
  type EvidenceType,
  type EvidenceStatus,
  type CustodyAction,
  type LegalHoldRecord,
  type CollectionWorkflow
} from '@/lib/dfir/evidence-management';

// GET /api/dfir/evidence - List or get evidence items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('id');
    const caseId = searchParams.get('caseId');
    const incidentId = searchParams.get('incidentId');
    const type = searchParams.get('type') as EvidenceType | null;
    const status = searchParams.get('status') as EvidenceStatus | null;
    const classification = searchParams.get('classification');
    const collectedBy = searchParams.get('collectedBy');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    // Specific action handlers
    const action = searchParams.get('action');

    const engine = getEvidenceEngine();

    // Get specific evidence item
    if (evidenceId) {
      const evidence = engine.getEvidence(evidenceId);
      if (!evidence) {
        return NextResponse.json(
          { success: false, error: 'Evidence not found' },
          { status: 404 }
        );
      }

      // Check for specific sub-actions
      if (action === 'verify') {
        const verification = engine.verifyIntegrity(evidenceId);
        return NextResponse.json({
          success: true,
          data: verification,
          message: verification.valid ? 'Evidence integrity verified' : 'Integrity verification failed'
        });
      }

      if (action === 'custody_report') {
        const report = engine.getCustodyReport(evidenceId);
        return NextResponse.json({
          success: true,
          data: report
        });
      }

      if (action === 'export') {
        const exportData = engine.exportWithCustody(evidenceId);
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="evidence-${evidenceId}-export.json"`
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: evidence
      });
    }

    // List evidence with filters
    const evidenceList = engine.listEvidence({
      caseId: caseId || undefined,
      incidentId: incidentId || undefined,
      type: type || undefined,
      status: status || undefined,
      classification: classification as EvidenceItem['classification'] | undefined,
      collectedBy: collectedBy || undefined,
      tag: tag || undefined,
      search: search || undefined
    });

    // Get statistics
    const stats = engine.getStatistics();

    return NextResponse.json({
      success: true,
      data: evidenceList,
      total: evidenceList.length,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}

// POST /api/dfir/evidence - Create evidence or perform actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const engine = getEvidenceEngine();

    switch (action) {
      case 'create': {
        // Register new evidence
        const { 
          caseId, incidentId, name, description, type, 
          collectedBy, collectedByName, collectionMethod,
          sourceSystem, sourceLocation, classification,
          containsPII, containsCredentials, fileName, mimeType
        } = params;

        if (!caseId || !name || !type || !collectedBy || !collectedByName || !collectionMethod) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: caseId, name, type, collectedBy, collectedByName, collectionMethod' },
            { status: 400 }
          );
        }

        // In production, would handle actual file upload here
        // For now, create without file data
        const evidence = await engine.createEvidence({
          caseId,
          incidentId,
          name,
          description: description || '',
          type: type as EvidenceType,
          collectedBy,
          collectedByName,
          collectionMethod,
          sourceSystem,
          sourceLocation,
          classification: classification as EvidenceItem['classification'],
          containsPII: containsPII || false,
          containsCredentials: containsCredentials || false,
          fileName,
          mimeType
        });

        return NextResponse.json({
          success: true,
          data: evidence,
          message: 'Evidence registered successfully'
        }, { status: 201 });
      }

      case 'update_custody': {
        // Update chain of custody
        const { evidenceId, action: custodyAction, performedBy, performedByName, options } = params;

        if (!evidenceId || !custodyAction || !performedBy || !performedByName) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: evidenceId, action, performedBy, performedByName' },
            { status: 400 }
          );
        }

        const custodyEntry = await engine.updateCustody(
          evidenceId,
          custodyAction as CustodyAction,
          performedBy,
          performedByName,
          options
        );

        return NextResponse.json({
          success: true,
          data: custodyEntry,
          message: 'Chain of custody updated'
        });
      }

      case 'verify_integrity': {
        // Verify evidence integrity
        const { evidenceId } = params;

        if (!evidenceId) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: evidenceId' },
            { status: 400 }
          );
        }

        const result = engine.verifyIntegrity(evidenceId);

        return NextResponse.json({
          success: true,
          data: result,
          message: result.valid ? 'Integrity verified' : 'Integrity check failed'
        });
      }

      case 'link_evidence': {
        // Link two evidence items together
        const { evidenceId1, evidenceId2 } = params;

        if (!evidenceId1 || !evidenceId2) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: evidenceId1, evidenceId2' },
            { status: 400 }
          );
        }

        engine.linkEvidence(evidenceId1, evidenceId2);

        return NextResponse.json({
          success: true,
          message: 'Evidence items linked successfully'
        });
      }

      case 'set_legal_hold': {
        // Set legal hold on a case
        const { caseId, reason, requestedBy, scope, affectedSystems, expiryDate } = params;

        if (!caseId || !reason || !requestedBy || !scope) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: caseId, reason, requestedBy, scope' },
            { status: 400 }
          );
        }

        const hold = await engine.setLegalHold({
          caseId,
          reason,
          requestedBy,
          scope,
          affectedSystems: affectedSystems || [],
          expiryDate: expiryDate ? new Date(expiryDate) : undefined
        });

        return NextResponse.json({
          success: true,
          data: hold,
          message: 'Legal hold set successfully'
        }, { status: 201 });
      }

      case 'approve_legal_hold': {
        // Approve a pending legal hold
        const { holdId, approvedBy } = params;

        if (!holdId || !approvedBy) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: holdId, approvedBy' },
            { status: 400 }
          );
        }

        const hold = engine.approveLegalHold(holdId, approvedBy);

        return NextResponse.json({
          success: true,
          data: hold,
          message: 'Legal hold approved and activated'
        });
      }

      case 'get_collection_workflow': {
        // Get collection workflow for evidence type
        const { evidenceType } = params;

        if (!evidenceType) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: evidenceType' },
            { status: 400 }
          );
        }

        const workflow = engine.getCollectionWorkflow(evidenceType as EvidenceType);

        if (!workflow) {
          return NextResponse.json(
            { success: false, error: 'No workflow found for this evidence type' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: workflow
        });
      }

      case 'list_workflows': {
        // List all collection workflows
        const workflows = engine.getAllCollectionWorkflows();
        
        return NextResponse.json({
          success: true,
          data: workflows,
          total: workflows.length
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in evidence API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/dfir/evidence - Update evidence (alternative method)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidenceId, updates } = body;

    if (!evidenceId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: evidenceId, updates' },
        { status: 400 }
      );
    }

    // For now, custody updates are handled via POST
    // This endpoint can be used for other metadata updates
    
    return NextResponse.json(
      { success: false, error: 'Use POST method with update_custody action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update evidence' },
      { status: 500 }
    );
  }
}
