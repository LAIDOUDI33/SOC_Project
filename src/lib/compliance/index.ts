/**
 * Compliance Automation Module
 * National SOC Platform - Phase 6
 * 
 * Exports for compliance automation functionality:
 * - ARTP Framework (Algerian Telecom Regulatory)
 * - ANSSI Alignment (French Cybersecurity Standards)
 * - Compliance Engine (Scoring, Assessments, Reports)
 * 
 * @version 1.0.0
 * @module compliance
 */

// Framework definitions
export { ARTP_FRAMEWORK, ARTP_CONTROLS, getArtpControlById, getArtpControlsByCategory, getArtpControlCount, getArtpCategories } from './artp-framework';
export type { ArtpControlDefinition } from './artp-framework';

export { ANSSI_FRAMEWORK, ANSSI_ALIGNMENTS, getAnssiAlignmentById, getAnssiAlignmentsByDomain, getAnssiAlignmentCount, getArtpControlsForAnssiAlignment } from './anssi-framework';
export type { AnssiAlignmentDefinition } from './anssi-framework';

// Engine functions
export {
  initializeComplianceEngine,
  initializeArtpFramework,
  initializeAnssiAlignments,
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
  calculateAnssiAlignmentScore
} from './engine';

export type {
  ComplianceScore,
  GapAnalysisResult,
  ArtpReportData
} from './engine';
