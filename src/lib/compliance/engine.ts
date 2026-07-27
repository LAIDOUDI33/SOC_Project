/**
 * Compliance Engine Service
 * Core engine for compliance automation including:
 * - Assessment management and scoring
 * - Gap analysis and remediation tracking
 * - ARTP report generation
 * - ANSSI alignment scoring
 * - Metrics calculation
 * 
 * @version 1.0.0
 * @module compliance/engine
 */

import { db } from '@/lib/db';
import {
  ComplianceFramework,
  ComplianceControl,
  ComplianceAssessment,
  ControlAssessment,
  ComplianceEvidence,
  ArtpSubmission,
  GapFinding,
  ComplianceMetric,
  AnssiAlignment,
  AssessmentResult,
  ControlCriticality,
  AssessmentStatus,
  RiskRating,
  MappingStrength,
  AnssiImplementationStatus,
  MetricTrend,
  RemediationStatus,
  EvidenceReviewStatus
} from '@prisma/client';

import { ARTP_FRAMEWORK, ARTP_CONTROLS, ArtpControlDefinition } from './artp-framework';
import { ANSSI_ALIGNMENTS, AnssiAlignmentDefinition } from './anssi-framework';

// ============================================================
// Types
// ============================================================

export interface ComplianceScore {
  overall: number;           // 0-100 percentage
  compliant: number;         // Count
  partiallyCompliant: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  criticalGaps: number;      // Count of CRITICAL severity gaps
  weightedScore: number;     // Weighted by control criticality
}

export interface GapAnalysisResult {
  totalGaps: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  openRemediations: number;
  overdueRemediations: number;
  averageRemediationTime: number; // days
  findings: GapFinding[];
}

export interface ArtpReportData {
  submissionNumber: string;
  type: string;
  title: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalIncidents: number;
    incidentsReportedToArtp: number;
    fraudCases: number;
    fraudLossDZD: number;
    complianceScore: number;
    openFindings: number;
    criticalFindings: number;
  };
  incidentDetails: any[];
  fraudDetails: any[];
  complianceStatus: any;
  recommendations: string[];
}

// ============================================================
// Framework Initialization
// ============================================================

/**
 * Initialize ARTP framework in database if not exists
 */
export async function initializeArtpFramework(): Promise<ComplianceFramework> {
  const existing = await db.complianceFramework.findUnique({
    where: { name: ARTP_FRAMEWORK.name }
  });

  if (existing) {
    return existing;
  }

  const framework = await db.complianceFramework.create({
    data: {
      name: ARTP_FRAMEWORK.name,
      displayName: ARTP_FRAMEWORK.displayName,
      description: ARTP_FRAMEWORK.description,
      version: ARTP_FRAMEWORK.version,
      frameworkType: ARTP_FRAMEWORK.frameworkType,
      jurisdiction: ARTP_FRAMEWORK.jurisdiction,
      issuingBody: ARTP_FRAMEWORK.issuingBody,
      effectiveDate: ARTP_FRAMEWORK.effectiveDate,
      reviewFrequency: ARTP_FRAMEWORK.reviewFrequency,
      status: ARTP_FRAMEWORK.status,
      documentationUrl: ARTP_FRAMEWORK.documentationUrl,
      contactEmail: ARTP_FRAMEWORK.contactEmail,
      controlCategories: JSON.stringify(ARTP_FRAMEWORK.controlCategories),
      scoringMethodology: JSON.stringify(ARTP_FRAMEWORK.scoringMethodology)
    }
  });

  // Create controls
  for (const controlDef of ARTP_CONTROLS) {
    await db.complianceControl.create({
      data: {
        frameworkId: framework.id,
        controlId: controlDef.controlId,
        controlRef: controlDef.controlRef,
        name: controlDef.name,
        description: controlDef.description,
        category: controlDef.category,
        family: controlDef.family,
        criticality: controlDef.criticality,
        priority: controlDef.priority,
        requirements: controlDef.requirements,
        implementationGuidance: controlDef.implementationGuidance,
        evidenceRequirements: JSON.stringify(controlDef.evidenceRequirements),
        testingProcedures: controlDef.testingProcedures,
        mappedControls: JSON.stringify(controlDef.anssiMapping ? [controlDef.anssiMapping] : []),
        status: 'ACTIVE' as any,
        isApplicable: true
      }
    });
  }

  console.log(`[Compliance Engine] Initialized ARTP framework with ${ARTP_CONTROLS.length} controls`);
  return framework;
}

/**
 * Initialize ANSSI alignments in database
 */
export async function initializeAnssiAlignments(frameworkId: string): Promise<void> {
  const existingCount = await db.ansiAlignment.count();
  if (existingCount > 0) {
    console.log(`[Compliance Engine] ${existingCount} ANSSI alignments already exist`);
    return;
  }

  // Get all controls mapped by controlId for lookup
  const controls = await db.complianceControl.findMany({
    where: { frameworkId }
  });
  const controlMap = new Map(controls.map(c => [c.controlId, c.id]));

  let created = 0;
  for (const alignment of ANSSI_ALIGNMENTS) {
    // Find related ARTP control IDs
    const artpControlIds = alignment.artpMapping
      .map(ref => controlMap.get(ref))
      .filter(Boolean) as string[];

    // Use first mapped control as primary, or create without specific control
    const localControlId = artpControlIds[0];

    await db.ansiAlignment.create({
      data: {
        localControlId: localControlId || '',
        anssiReference: alignment.ansiReference,
        anssiDomain: alignment.ansiDomain,
        anssiCategory: alignment.ansiCategory,
        mappingStrength: (alignment.id.includes('FULL') ? MappingStrength.FULL :
                          alignment.id.includes('SUBSTANTIAL') ? MappingStrength.SUBSTANTIAL :
                          alignment.id.includes('PARTIAL') ? MappingStrength.PARTIAL :
                          MappingStrength.MINIMAL) as MappingStrength,
        implementationStatus: AnssiImplementationStatus.NOT_IMPLEMENTED,
        certRelevant: alignment.certRelevant,
        certLevel: alignment.certLevel
      }
    });
    created++;
  }

  console.log(`[Compliance Engine] Initialized ${created} ANSSI alignments`);
}

// ============================================================
// Assessment Management
// ============================================================

/**
 * Create a new compliance assessment
 */
export async function createAssessment(params: {
  frameworkId: string;
  assessmentType: any;
  scope?: any;
  assessedBy?: string;
  targetEndDate?: Date;
}): Promise<ComplianceAssessment> {
  const assessment = await db.complianceAssessment.create({
    data: {
      frameworkId: params.frameworkId,
      assessmentType: params.assessmentType,
      scope: params.scope,
      assessedBy: params.assessedBy,
      targetEndDate: params.targetEndDate,
      status: AssessmentStatus.IN_PROGRESS,
      startDate: new Date()
    },
    include: {
      framework: {
        include: { controls: true }
      }
    }
  });

  // Initialize control assessments for all applicable controls
  const controls = assessment.framework.controls.filter(c => c.isApplicable);
  
  await db.controlAssessment.createMany({
    data: controls.map(control => ({
      assessmentId: assessment.id,
      controlId: control.id,
      result: AssessmentResult.NOT_ASSESSED,
      confidenceLevel: 100.0
    }))
  });

  await db.complianceAssessment.update({
    where: { id: assessment.id },
    data: { totalControls: controls.length }
  });

  console.log(`[Compliance Engine] Created assessment ${assessment.id} with ${controls.length} controls`);
  return assessment;
}

/**
 * Update a single control assessment result
 */
export async function updateControlAssessment(params: {
  assessmentId: string;
  controlId: string;
  result: AssessmentResult;
  score?: number;
  findings?: string;
  evidenceCollected?: boolean;
  remediationRequired?: boolean;
  remediationPlan?: string;
  comments?: string;
}): Promise<ControlAssessment> {
  const update = await db.controlAssessment.update({
    where: {
      assessmentId_controlId: {
        assessmentId: params.assessmentId,
        controlId: params.controlId
      }
    },
    data: {
      result: params.result,
      score: params.score,
      findings: params.findings,
      evidenceCollected: params.evidenceCollected,
      remediationRequired: params.remediationRequired,
      remediationPlan: params.remediationPlan,
      comments: params.comments,
      assessedAt: new Date()
    }
  });

  // Recalculate assessment scores
  await recalculateAssessmentScores(params.assessmentId);

  return update;
}

/**
 * Recalculate overall assessment scores from control assessments
 */
async function recalculateAssessmentScores(assessmentId: string): Promise<void> {
  const controlAssessments = await db.controlAssessment.findMany({
    where: { assessmentId },
    include: { control: true }
  });

  let compliantCount = 0;
  let partialCount = 0;
  let nonCompliantCount = 0;
  let naCount = 0;
  let notAssessedCount = 0;
  let weightedSum = 0;
  let totalWeight = 0;

  const criticalityWeights = {
    [ControlCriticality.CRITICAL]: 5,
    [ControlCriticality.HIGH]: 4,
    [ControlCriticality.MEDIUM]: 3,
    [ControlCriticality.LOW]: 2
  };

  for (const ca of controlAssessments) {
    const weight = criticalityWeights[ca.control.criticality] || 3;
    totalWeight += weight;

    switch (ca.result) {
      case AssessmentResult.COMPLIANT:
        compliantCount++;
        weightedSum += weight * 100;
        break;
      case AssessmentResult.PARTIALLY_COMPLIANT:
        partialCount++;
        weightedSum += weight * (ca.score || 50);
        break;
      case AssessmentResult.NON_COMPLIANT:
        nonCompliantCount++;
        weightedSum += weight * 0;
        break;
      case AssessmentResult.NOT_APPLICABLE:
        naCount++;
        totalWeight -= weight; // Exclude from weighting
        break;
      default:
        notAssessedCount++;
        break;
    }
  }

  const overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  await db.complianceAssessment.update({
    where: { id: assessmentId },
    data: {
      overallScore,
      compliantCount,
      partialCount,
      nonCompliantCount,
      notApplicableCount: naCount,
      notAssessedCount: notAssessedCount
    }
  });
}

/**
 * Complete an assessment with final calculations
 */
export async function completeAssessment(
  assessmentId: string,
  executiveSummary?: string,
  recommendations?: string[]
): Promise<ComplianceAssessment> {
  // Final score calculation
  await recalculateAssessmentScores(assessmentId);

  // Generate gap findings from non-compliant controls
  await generateGapFindings(assessmentId);

  const assessment = await db.complianceAssessment.update({
    where: { id: assessmentId },
    data: {
      status: AssessmentStatus.COMPLETED,
      completedAt: new Date(),
      executiveSummary,
      recommendations: JSON.stringify(recommendations || [])
    }
  });

  console.log(`[Compliance Engine] Completed assessment ${assessmentId} with score ${assessment.overallScore}%`);
  return assessment;
}

// ============================================================
// Scoring Functions
// ============================================================

/**
 * Calculate comprehensive compliance score for a framework
 */
export async function calculateFrameworkComplianceScore(
  frameworkId: string
): Promise<ComplianceScore> {
  const latestAssessment = await db.complianceAssessment.findFirst({
    where: {
      frameworkId,
      status: AssessmentStatus.COMPLETED
    },
    orderBy: { completedAt: 'desc' },
    include: {
      controlAssessments: {
        include: { control: true }
      }
    }
  });

  if (!latestAssessment) {
    return {
      overall: 0,
      compliant: 0,
      partiallyCompliant: 0,
      nonCompliant: 0,
      notAssessed: 0,
      notApplicable: 0,
      criticalGaps: 0,
      weightedScore: 0
    };
  }

  return calculateAssessmentScore(latestAssessment.id);
}

/**
 * Calculate score for a specific assessment
 */
export async function calculateAssessmentScore(
  assessmentId: string
): Promise<ComplianceScore> {
  const controlAssessments = await db.controlAssessment.findMany({
    where: { assessmentId },
    include: { control: true }
  });

  let compliant = 0, partial = 0, nonCompliant = 0, na = 0, notAssessed = 0;
  let criticalGaps = 0;
  let weightedSum = 0, totalWeight = 0;

  const weights = {
    [ControlCriticality.CRITICAL]: 5,
    [ControlCriticality.HIGH]: 4,
    [ControlCriticality.MEDIUM]: 3,
    [ControlCriticality.LOW]: 2
  };

  for (const ca of controlAssessments) {
    const w = weights[ca.control.criticality] || 3;
    totalWeight += w;

    switch (ca.result) {
      case AssessmentResult.COMPLIANT:
        compliant++;
        weightedSum += w * 100;
        break;
      case AssessmentResult.PARTIALLY_COMPLIANT:
        partial++;
        weightedSum += w * (ca.score || 50);
        break;
      case AssessmentResult.NON_COMPLIANT:
        nonCompliant++;
        if (ca.control.criticality === ControlCriticality.CRITICAL) {
          criticalGaps++;
        }
        break;
      case AssessmentResult.NOT_APPLICABLE:
        na++;
        totalWeight -= w;
        break;
      default:
        notAssessed++;
        break;
    }
  }

  return {
    overall: totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0,
    compliant,
    partiallyCompliant: partial,
    nonCompliant,
    notAssessed,
    notApplicable: na,
    criticalGaps,
    weightedScore: totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0
  };
}

// ============================================================
// Gap Analysis
// ============================================================

/**
 * Generate gap findings from assessment results
 */
async function generateGapFindings(assessmentId: string): Promise<void> {
  const nonCompliantControls = await db.controlAssessment.findMany({
    where: {
      assessmentId,
      result: { in: [AssessmentResult.NON_COMPLIANT, AssessmentResult.PARTIALLY_COMPLIANT] }
    },
    include: { control: true }
  });

  for (const ca of nonCompliantControls) {
    // Check if gap finding already exists for this control
    const existing = await db.gapFinding.findFirst({
      where: {
        assessmentId,
        controlId: ca.controlId
      }
    });

    if (!existing) {
      await db.gapFinding.create({
        data: {
          assessmentId,
          controlId: ca.controlId,
          title: `Gap: ${ca.control.name}`,
          description: ca.findings || `Control ${ca.control.controlId} is assessed as ${ca.result}`,
          gapType: 'CONTROL_GAP',
          severity: mapCriticalityToGapSeverity(ca.control.criticality),
          remediationStatus: RemediationStatus.OPEN,
          ownerId: ca.owner || undefined,
          dueDate: ca.targetDate
        }
      });
    }
  }
}

function mapCriticalityToGapSeverity(criticality: ControlCriticality): any {
  switch (criticality) {
    case ControlCriticality.CRITICAL: return 'CRITICAL';
    case ControlCriticality.HIGH: return 'HIGH';
    case ControlCriticality.MEDIUM: return 'MEDIUM';
    case ControlCriticality.LOW: return 'LOW';
    default: return 'INFORMATIONAL';
  }
}

/**
 * Get comprehensive gap analysis for an organization
 */
export async function getGapAnalysis(frameworkId?: string): Promise<GapAnalysisResult> {
  const where: any = {};
  if (frameworkId) {
    where.assessment = { frameworkId };
  }

  const findings = await db.gapFinding.findMany({
    where,
    include: {
      assessment: true,
      control: true
    },
    orderBy: { severity: 'asc' }
  });

  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  let openRemediations = 0;
  let overdueRemediations = 0;
  let totalRemediationDays = 0;
  let resolvedWithDate = 0;

  for (const finding of findings) {
    // By severity
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;

    // By category
    if (finding.control) {
      const cat = finding.control.category;
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    // By type
    byType[finding.gapType] = (byType[finding.gapType] || 0) + 1;

    // Remediation status
    if (finding.remediationStatus !== RemediationStatus.CLOSED &&
        finding.remediationStatus !== RemediationStatus.ACCEPTED_RISK) {
      openRemediations++;

      if (finding.dueDate && new Date(finding.dueDate) < new Date()) {
        overdueRemediations++;
      }
    }

    // Average remediation time
    if (finding.resolvedAt && finding.createdAt) {
      const days = Math.abs(new Date(finding.resolvedAt).getTime() - new Date(finding.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalRemediationDays += days;
      resolvedWithDate++;
    }
  }

  return {
    totalGaps: findings.length,
    bySeverity,
    byCategory,
    byType,
    openRemediations,
    overdueRemediations,
    averageRemediationTime: resolvedWithDate > 0 ? Math.round(totalRemediationDays / resolvedWithDate) : 0,
    findings
  };
}

// ============================================================
// ARTP Report Generation
// ============================================================

/**
 * Generate ARTP regulatory submission report
 */
export async function generateArtpReport(params: {
  submissionType: any;
  incidentId?: string;
  fraudCaseId?: string;
  assessmentId?: string;
  preparedBy: string;
  priority?: any;
}): Promise<ArtpSubmission> {
  const submissionNumber = generateArtpSubmissionNumber(params.submissionType);
  
  // Calculate deadline based on priority/type
  const deadline = calculateArtpDeadline(params.priority);

  const submission = await db.artpSubmission.create({
    data: {
      submissionNumber,
      submissionType: params.submissionType,
      title: generateArtpTitle(params.submissionType),
      status: 'DRAFT',
      incidentId: params.incidentId,
      fraudCaseId: params.fraudCaseId,
      assessmentId: params.assessmentId,
      preparedBy: params.preparedBy,
      priority: params.priority || 'STANDARD',
      deadline
    }
  });

  console.log(`[Compliance Engine] Created ARTP submission ${submissionNumber}`);
  return submission;
}

/**
 * Populate ARTP report with actual data
 */
export async function populateArtpReport(submissionId: string): Promise<ArtpSubmission> {
  const submission = await db.artpSubmission.findUniqueOrThrow({
    where: { id: submissionId }
  });

  const reportData: ArtpReportData = {
    submissionNumber: submission.submissionNumber,
    type: submission.submissionType,
    title: submission.title,
    generatedAt: new Date(),
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    periodEnd: new Date(),
    summary: {
      totalIncidents: 0,
      incidentsReportedToArtp: 0,
      fraudCases: 0,
      fraudLossDZD: 0,
      complianceScore: 0,
      openFindings: 0,
      criticalFindings: 0
    },
    incidentDetails: [],
    fraudDetails: [],
    complianceStatus: {},
    recommendations: []
  };

  // Gather incident data if linked
  if (submission.incidentId) {
    const incident = await db.incident.findUnique({
      where: { id: submission.incidentId },
      include: { alerts: true, updates: true }
    });
    
    if (incident) {
      reportData.summary.totalIncidents = 1;
      reportData.incidentDetails.push({
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        detectedAt: incident.detectedAt,
        description: incident.description
      });
    }
  }

  // Gather fraud data if linked
  if (submission.fraudCaseId) {
    const fraudCase = await db.fraudCase.findUnique({
      where: { id: submission.fraudCaseId }
    });
    
    if (fraudCase) {
      reportData.summary.fraudCases = 1;
      reportData.summary.fraudLossDZD = fraudCase.estimatedLossDZD || 0;
      reportData.fraudDetails.push({
        caseNumber: fraudCase.caseNumber,
        type: fraudCase.type,
        severity: fraudCase.severity,
        status: fraudCase.status,
        estimatedLossDZD: fraudCase.estimatedLossDZD
      });
    }
  }

  // Gather compliance data if linked or for quarterly reports
  if (submission.assessmentId || submission.submissionType === 'QUARTERLY_REPORT') {
    const latestAssessment = submission.assessmentId
      ? await db.complianceAssessment.findUnique({ where: { id: submission.assessmentId } })
      : await db.complianceAssessment.findFirst({
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' }
        });

    if (latestAssessment) {
      reportData.summary.complianceScore = latestAssessment.overallScore || 0;
      
      const gaps = await db.gapFinding.count({
        where: {
          assessmentId: latestAssessment.id,
          remediationStatus: { notIn: ['CLOSED', 'ACCEPTED_RISK'] }
        }
      });
      
      const criticalGaps = await db.gapFinding.count({
        where: {
          assessmentId: latestAssessment.id,
          severity: 'CRITICAL',
          remediationStatus: { notIn: ['CLOSED', 'ACCEPTED_RISK'] }
        }
      });

      reportData.summary.openFindings = gaps;
      reportData.summary.criticalFindings = criticalGaps;
    }
  }

  // Generate recommendations based on gaps
  reportData.recommendations = await generateRecommendations();

  // Update submission with report data
  const updated = await db.artpSubmission.update({
    where: { id: submissionId },
    data: {
      detailedReport: JSON.stringify(reportData),
      summary: generateExecutiveSummary(reportData)
    }
  });

  return updated;
}

/**
 * Submit ARTP report to authority (mark as submitted)
 */
export async function submitArtpReport(
  submissionId: string,
  submittedBy: string
): Promise<ArtpSubmission> {
  return await db.artpSubmission.update({
    where: { id: submissionId },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date()
    }
  });
}

// Helper functions for ARTP reporting
function generateArtpSubmissionNumber(type: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const typeCode = type.substring(0, 3).toUpperCase();
  return `ARTP-${year}${month}-${typeCode}-${seq}`;
}

function generateArtpTitle(type: string): string {
  const titles: Record<string, string> = {
    'INCIDENT_REPORT': 'Security Incident Report',
    'FRAUD_REPORT': 'Fraud Case Report',
    'BREACH_NOTIFICATION': 'Personal Data Breach Notification',
    'QUARTERLY_REPORT': 'Quarterly Security Status Report',
    'ANNUAL_CERTIFICATION': 'Annual Security Certification',
    'AD_HOC_REQUEST': 'Response to ARTP Inquiry',
    'SELF_ASSESSMENT': 'Security Self-Assessment Declaration'
  };
  return titles[type] || 'Regulatory Submission';
}

function calculateArtpDeadline(priority?: any): Date {
  const now = new Date();
  switch (priority) {
    case 'URGENT':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case 'HIGH':
      return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }
}

function generateExecutiveSummary(data: ArtpReportData): string {
  return `
# Djezzy Security Report - ${data.submissionNumber}

## Executive Summary

**Reporting Period:** ${data.periodStart.toDateString()} - ${data.periodEnd.toDateString()}
**Report Generated:** ${data.generatedAt.toISOString()}
**Report Type:** ${data.type}

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Security Incidents | ${data.summary.totalIncidents} |
| Incidents Reported to ARTP | ${data.summary.incidentsReportedToArtp} |
| Fraud Cases | ${data.summary.fraudCases} |
| Estimated Fraud Loss | ${data.summary.fraudLossDZD.toLocaleString()} DZD |
| Overall Compliance Score | ${data.summary.complianceScore}% |
| Open Compliance Findings | ${data.summary.openFindings} |
| Critical Findings Requiring Action | ${data.summary.criticalFindings} |

### Key Recommendations

${data.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---
*This report was auto-generated by Djezzy National SOC Platform*
*Classification: OFFICIAL - For ARTP Submission*
`.trim();
}

async function generateRecommendations(): Promise<string[]> {
  const openGaps = await db.gapFinding.findMany({
    where: {
      remediationStatus: { in: ['OPEN', 'IN_PROGRESS'] },
      severity: { in: ['CRITICAL', 'HIGH'] }
    },
    take: 10,
    orderBy: { severity: 'asc' }
  });

  const recommendations: string[] = [];

  if (openGaps.some(g => g.severity === 'CRITICAL')) {
    recommendations.push('IMMEDIATE: Address critical security gaps - allocate emergency resources');
  }

  if (openGaps.some(g => g.severity === 'HIGH')) {
    recommendations.push('SHORT-TERM: Develop remediation plan for high-severity findings within 30 days');
  }

  const categoryCounts: Record<string, number> = {};
  for (const gap of openGaps) {
    if (gap.control) {
      const cat = gap.control.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    recommendations.push(`FOCUS AREA: ${topCategory[0]} has highest concentration of gaps (${topCategory[1]} items)`);
  }

  recommendations.push('Continue regular security awareness training for all personnel');
  recommendations.push('Maintain 24/7 SOC monitoring and incident response readiness');

  return recommendations;
}

// ============================================================
// Evidence Management
// ============================================================

/**
 * Add evidence to a control
 */
export async function addEvidence(params: {
  controlId: string;
  assessmentId?: string;
  title: string;
  description?: string;
  type: any;
  classification?: any;
  filePath?: string;
  fileName?: string;
  fileHash?: string;
  fileSize?: number;
  mimeType?: string;
  collectedBy: string;
  sourceSystem?: string;
  automatedCollection?: boolean;
}): Promise<ComplianceEvidence> {
  return await db.complianceEvidence.create({
    data: {
      controlId: params.controlId,
      assessmentId: params.assessmentId,
      title: params.title,
      description: params.description,
      type: params.type,
      classification: params.classification || 'INTERNAL',
      filePath: params.filePath,
      fileName: params.fileName,
      fileHash: params.fileHash,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      collectedBy: params.collectedBy,
      sourceSystem: params.sourceSystem,
      automatedCollection: params.automatedCollection || false,
      reviewStatus: EvidenceReviewStatus.PENDING
    }
  });
}

/**
 * Validate evidence for compliance use
 */
export async function validateEvidence(
  evidenceId: string,
  reviewedBy: string,
  isValid: boolean,
  comments?: string
): Promise<ComplianceEvidence> {
  return await db.complianceEvidence.update({
    where: { id: evidenceId },
    data: {
      reviewStatus: isValid ? EvidenceReviewStatus.VALIDATED : EvidenceReviewStatus.INVALIDATED,
      reviewedBy,
      reviewedAt: new Date(),
      reviewComments: comments
    }
  });
}

// ============================================================
// Metrics & Dashboard Data
// ============================================================

/**
 * Calculate and store compliance metrics for dashboard
 */
export async function updateComplianceMetrics(frameworkId?: string): Promise<void> {
  // Overall compliance score
  const latestAssessment = await db.complianceAssessment.findFirst({
    where: frameworkId ? { frameworkId, status: 'COMPLETED' } : { status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' }
  });

  const currentScore = latestAssessment?.overallScore || 0;

  await upsertMetric({
    metricName: 'overall_compliance_score',
    metricCategory: 'OVERALL_COMPLIANCE',
    frameworkId,
    currentValue: currentScore,
    previousValue: undefined, // Will be set by upsert logic
    targetValue: 80, // Target 80% compliance
    unit: '%',
    trend: currentScore >= 80 ? MetricTrend.IMPROVING : 
           currentScore >= 60 ? MetricTrend.STABLE : MetricTrend.DECLINING,
    calculationMethod: 'Weighted average of control assessments',
    dataSource: 'Compliance Assessment Engine'
  });

  // ARTP submissions status
  const pendingSubmissions = await db.artpSubmission.count({
    where: {
      status: { in: ['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL'] },
      deadline: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    }
  });

  await upsertMetric({
    metricName: 'pending_artp_submissions',
    metricCategory: 'ARTP_SUBMISSIONS',
    frameworkId,
    currentValue: pendingSubmissions,
    targetValue: 0,
    unit: 'count',
    trend: pendingSubmissions > 5 ? MetricTrend.DECLINING : MetricTrend.STABLE,
    calculationMethod: 'Count of submissions due within 7 days',
    dataSource: 'ARTP Submissions table'
  });

  // Open gap findings
  const openGaps = await db.gapFinding.count({
    where: {
      remediationStatus: { notIn: ['CLOSED', 'ACCEPTED_RISK'] }
    }
  });

  await upsertMetric({
    metricName: 'open_gap_findings',
    metricCategory: 'REMEDIATION_PROGRESS',
    frameworkId,
    currentValue: openGaps,
    targetValue: 10,
    unit: 'count',
    trend: openGaps > 20 ? MetricTrend.DECLINING : MetricTrend.STABLE,
    calculationMethod: 'Count of non-closed gap findings',
    dataSource: 'Gap Findings table'
  });
}

async function upsertMetric(params: {
  metricName: string;
  metricCategory: any;
  frameworkId?: string;
  currentValue: number;
  previousValue?: number;
  targetValue?: number;
  unit?: string;
    trend?: any;
  calculationMethod?: string;
  dataSource?: string;
}): Promise<void> {
  const existing = await db.complianceMetric.findUnique({
    where: { metricName: params.metricName }
  });

  if (existing) {
    await db.complianceMetric.update({
      where: { metricName: params.metricName },
      data: {
        currentValue: params.currentValue,
        previousValue: existing.currentValue,
        targetValue: params.targetValue,
        unit: params.unit,
        trend: params.trend,
        lastCalculatedAt: new Date()
      }
    });
  } else {
    await db.complianceMetric.create({
      data: {
        metricName: params.metricName,
        metricCategory: params.metricCategory,
        frameworkId: params.frameworkId,
        currentValue: params.currentValue,
        targetValue: params.targetValue,
        unit: params.unit,
        trend: params.trend,
        calculationMethod: params.calculationMethod,
        dataSource: params.dataSource,
        lastCalculatedAt: new Date()
      }
    });
  }
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics(): Promise<any[]> {
  return await db.complianceMetric.findMany({
    orderBy: { metricCategory: 'asc' }
  });
}

// ============================================================
// ANSSI Alignment Scoring
// ============================================================

/**
 * Calculate ANSSI alignment maturity score
 */
export async function calculateAnssiAlignmentScore(): Promise<{
  overallAlignment: number;
  byDomain: Record<string, { total: number; implemented: number; partial: number; score: number }>;
  certificationReadiness: any;
}> {
  const alignments = await db.ansiAlignment.findMany();

  const byDomain: Record<string, any> = {};
  let totalImplemented = 0;
  let totalFullAlignment = 0;

  for (const alignment of alignments) {
    const domain = alignment.ansiDomain;
    if (!byDomain[domain]) {
      byDomain[domain] = { total: 0, implemented: 0, partial: 0, score: 0 };
    }

    byDomain[domain].total++;

    switch (alignment.implementationStatus) {
      case AnssiImplementationStatus.IMPLEMENTED:
        byDomain[domain].implemented++;
        totalImplemented++;
        if (alignment.mappingStrength === MappingStrength.FULL ||
            alignment.mappingStrength === MappingStrength.SUBSTANTIAL) {
          totalFullAlignment++;
        }
        break;
      case AnssiImplementationStatus.PARTIALLY_IMPLEMENTED:
        byDomain[domain].partial++;
        totalImplemented += 0.5;
        break;
    }
  }

  // Calculate per-domain scores
  for (const domain of Object.keys(byDomain)) {
    const d = byDomain[domain];
    d.score = d.total > 0 ? Math.round(((d.implemented + d.partial * 0.5) / d.total) * 100) : 0;
  }

  const overallAlignment = alignments.length > 0 
    ? Math.round((totalImplemented / alignments.length) * 100) 
    : 0;

  // Determine certification readiness
  const certRelevant = alignments.filter(a => a.certRelevant);
  const certImplemented = certRelevant.filter(a => 
    a.implementationStatus === AnssiImplementationStatus.IMPLEMENTED
  );
  const certificationReadiness = {
    basic: certImplemented.filter(a => a.certLevel === 'BASIC').length >= 
           certRelevant.filter(a => a.certLevel === 'BASIC').length,
    standard: certImplemented.filter(a => a.certLevel === 'STANDARD').length >= 
               certRelevant.filter(a => a.certLevel === 'STANDARD').length,
    advanced: certImplemented.filter(a => a.certLevel === 'ADVANCED').length >= 
               certRelevant.filter(a => a.certLevel === 'ADVANCED').length
  };

  return {
    overallAlignment,
    byDomain,
    certificationReadiness
  };
}

// Export initialization function
export async function initializeComplianceEngine(): Promise<{ framework: ComplianceFramework; controlsCount: number }> {
  const framework = await initializeArtpFramework();
  await initializeAnssiAlignments(framework.id);
  await updateComplianceMetrics(framework.id);
  
  const controlsCount = await db.complianceControl.count({
    where: { frameworkId: framework.id }
  });

  return { framework, controlsCount };
}
