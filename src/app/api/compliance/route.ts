/**
 * Compliance API Routes
 * National SOC Platform - Phase 6: Compliance Automation
 * 
 * Endpoints:
 * GET /api/compliance - Dashboard overview
 * GET /api/compliance/frameworks - List frameworks
 * POST /api/compliance/frameworks/initialize - Initialize ARTP framework
 * GET /api/compliance/assessments - List assessments
 * POST /api/compliance/assessments - Create assessment
 * GET /api/compliance/assessments/:id - Get assessment details
 * PUT /api/compliance/assessments/:id - Update assessment
 * POST /api/compliance/assessments/:id/complete - Complete assessment
 * GET /api/compliance/gap-analysis - Get gap analysis
 * GET /api/compliance/metrics - Get dashboard metrics
 * GET /api/compliance/artp/submissions - List ARTP submissions
 * POST /api/compliance/artp/submissions - Create ARTP submission
 * GET /api/compliance/artp/submissions/:id - Get submission details
 * POST /api/compliance/artp/submissions/:id/populate - Populate report data
 * POST /api/compliance/artp/submissions/:id/submit - Submit to ARTP
 * GET /api/compliance/evidence - List evidence
 * POST /api/compliance/evidence - Add evidence
 * PUT /api/compliance/evidence/:id/validate - Validate evidence
 * GET /api/compliance/anssi/score - Get ANSSI alignment score
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeComplianceEngine,
  createAssessment,
  updateControlAssessment,
  completeAssessment,
  calculateFrameworkComplianceScore,
  calculateAssessmentScore,
  getGapAnalysis,
  generateArtpReport,
  populateArtpReport,
  submitArtpReport,
  addEvidence,
  validateEvidence,
  updateComplianceMetrics,
  getDashboardMetrics,
  calculateAnssiAlignmentScore,
  getArtpControlCount,
  getArtpCategories
} from '@/lib/compliance';
import { db } from '@/lib/db';

// ============================================================
// GET /api/compliance - Main dashboard endpoint
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'dashboard':
        return await getDashboardData();
      
      case 'frameworks':
        return await getFrameworks();
      
      case 'assessments':
        return await getAssessments(searchParams);
      
      case 'gap-analysis':
        return await handleGapAnalysis(searchParams);
      
      case 'metrics':
        return await handleMetrics();
      
      case 'artp-submissions':
        return await getArtpSubmissions();
      
      case 'evidence':
        return await getEvidence(searchParams);
      
      case 'anssi-score':
        return await handleAnssiScore();
      
      default:
        return await getDashboardData();
    }
  } catch (error) {
    console.error('[Compliance API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/compliance - Create operations
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'initialize':
        return await handleInitialize();
      
      case 'create-assessment':
        return await handleCreateAssessment(data);
      
      case 'update-control':
        return await handleUpdateControlAssessment(data);
      
      case 'complete-assessment':
        return await handleCompleteAssessment(data);
      
      case 'create-artp-submission':
        return await handleCreateArtpSubmission(data);
      
      case 'populate-report':
        return await handlePopulateReport(data);
      
      case 'submit-report':
        return await handleSubmitReport(data);
      
      case 'add-evidence':
        return await handleAddEvidence(data);
      
      case 'validate-evidence':
        return await handleValidateEvidence(data);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Compliance API] POST Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================
// Handler Functions
// ============================================================

async function getDashboardData() {
  const [
    metrics,
    latestAssessment,
    pendingSubmissions,
    openGaps,
    anssiScore
  ] = await Promise.all([
    getDashboardMetrics(),
    db.complianceAssessment.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { framework: true }
    }),
    db.artpSubmission.count({
      where: { status: { in: ['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL'] } }
    }),
    db.gapFinding.count({
      where: { remediationStatus: { notIn: ['CLOSED', 'ACCEPTED_RISK'] } }
    }),
    calculateAnssiAlignmentScore()
  ]);

  // Refresh metrics
  await updateComplianceMetrics();

  return NextResponse.json({
    success: true,
    data: {
      metrics,
      latestAssessment,
      pendingSubmissions,
      openGaps,
      anssiAlignment: anssiScore,
      summary: {
        totalControls: getArtpControlCount(),
        categories: getArtpCategories(),
        lastUpdated: new Date().toISOString()
      }
    }
  });
}

async function getFrameworks() {
  const frameworks = await db.complianceFramework.findMany({
    include: {
      _count: { select: { controls: true, assessments: true } }
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ success: true, data: frameworks });
}

async function handleInitialize() {
  const result = await initializeComplianceEngine();
  
  return NextResponse.json({
    success: true,
    message: 'Compliance engine initialized successfully',
    data: {
      frameworkId: result.framework.id,
      frameworkName: result.framework.displayName,
      controlsLoaded: result.controlsCount
    }
  });
}

async function getAssessments(searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const where: any = {};
  if (status) where.status = status;

  const assessments = await db.complianceAssessment.findMany({
    where,
    include: {
      framework: true,
      assessedByUser: { select: { id: true, name: true, email: true } },
      _count: { select: { controlAssessments: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return NextResponse.json({ success: true, data: assessments });
}

async function handleCreateAssessment(data: any) {
  const assessment = await createAssessment({
    frameworkId: data.frameworkId,
    assessmentType: data.assessmentType || 'PERIODIC',
    scope: data.scope,
    assessedBy: data.assessedBy,
    targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined
  });

  return NextResponse.json({
    success: true,
    message: 'Assessment created',
    data: assessment
  });
}

async function handleUpdateControlAssessment(data: any) {
  const updated = await updateControlAssessment({
    assessmentId: data.assessmentId,
    controlId: data.controlId,
    result: data.result,
    score: data.score,
    findings: data.findings,
    evidenceCollected: data.evidenceCollected,
    remediationRequired: data.remediationRequired,
    remediationPlan: data.remediationPlan,
    comments: data.comments
  });

  return NextResponse.json({
    success: true,
    message: 'Control assessment updated',
    data: updated
  });
}

async function handleCompleteAssessment(data: any) {
  const assessment = await completeAssessment(
    data.assessmentId,
    data.executiveSummary,
    data.recommendations
  );

  return NextResponse.json({
    success: true,
    message: 'Assessment completed',
    data: assessment
  });
}

async function handleGapAnalysis(searchParams: URLSearchParams) {
  const frameworkId = searchParams.get('frameworkId');
  const analysis = await getGapAnalysis(frameworkId || undefined);

  return NextResponse.json({ success: true, data: analysis });
}

async function handleMetrics() {
  await updateComplianceMetrics();
  const metrics = await getDashboardMetrics();

  return NextResponse.json({ success: true, data: metrics });
}

// ============================================================
// ARTP Submission Handlers
// ============================================================

async function getArtpSubmissions() {
  const submissions = await db.artpSubmission.findMany({
    include: {
      incident: { select: { id: true, title: true } },
      fraudCase: { select: { id: true, caseNumber: true, type: true } },
      assessment: { select: { id: true, overallScore: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json({ success: true, data: submissions });
}

async function handleCreateArtpSubmission(data: any) {
  const submission = await generateArtpReport({
    submissionType: data.submissionType,
    incidentId: data.incidentId,
    fraudCaseId: data.fraudCaseId,
    assessmentId: data.assessmentId,
    preparedBy: data.preparedBy,
    priority: data.priority
  });

  return NextResponse.json({
    success: true,
    message: 'ARTP submission created',
    data: submission
  });
}

async function handlePopulateReport(data: any) {
  const submission = await populateArtpReport(data.submissionId);

  return NextResponse.json({
    success: true,
    message: 'Report populated with data',
    data: submission
  });
}

async function handleSubmitReport(data: any) {
  const submission = await submitArtpReport(data.submissionId, data.submittedBy);

  return NextResponse.json({
    success: true,
    message: 'Report submitted to ARTP',
    data: submission
  });
}

// ============================================================
// Evidence Handlers
// ============================================================

async function getEvidence(searchParams: URLSearchParams) {
  const controlId = searchParams.get('controlId');
  const assessmentId = searchParams.get('assessmentId');
  const reviewStatus = searchParams.get('reviewStatus');

  const where: any = {};
  if (controlId) where.controlId = controlId;
  if (assessmentId) where.assessmentId = assessmentId;
  if (reviewStatus) where.reviewStatus = reviewStatus;

  const evidence = await db.complianceEvidence.findMany({
    where,
    include: {
      control: { select: { controlId: true, name: true, category: true } }
    },
    orderBy: { collectedAt: 'desc' },
    take: 100
  });

  return NextResponse.json({ success: true, data: evidence });
}

async function handleAddEvidence(data: any) {
  const evidence = await addEvidence({
    controlId: data.controlId,
    assessmentId: data.assessmentId,
    title: data.title,
    description: data.description,
    type: data.type,
    classification: data.classification,
    filePath: data.filePath,
    fileName: data.fileName,
    fileHash: data.fileHash,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    collectedBy: data.collectedBy,
    sourceSystem: data.sourceSystem,
    automatedCollection: data.automatedCollection
  });

  return NextResponse.json({
    success: true,
    message: 'Evidence added',
    data: evidence
  });
}

async function handleValidateEvidence(data: any) {
  const evidence = await validateEvidence(
    data.evidenceId,
    data.reviewedBy,
    data.isValid,
    data.comments
  );

  return NextResponse.json({
    success: true,
    message: `Evidence ${data.isValid ? 'validated' : 'invalidated'}`,
    data: evidence
  });
}

async function handleAnssiScore() {
  const score = await calculateAnssiAlignmentScore();

  return NextResponse.json({ success: true, data: score });
}
