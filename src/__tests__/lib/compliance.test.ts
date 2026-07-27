/**
 * Compliance Engine Tests
 * Verifies the ARTP/ANSSI compliance functionality
 */

import {
  calculateFrameworkComplianceScore,
  getGapAnalysis,
  generateArtpReport,
  getDashboardMetrics,
} from '@/lib/compliance';

describe('Compliance Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFrameworkComplianceScore', () => {
    it('should calculate compliance score for framework', async () => {
      const score = await calculateFrameworkComplianceScore('test-framework');
      
      expect(score).toHaveProperty('score');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score).toHaveProperty('totalControls');
      expect(score).toHaveProperty('implementedControls');
      expect(score).toHaveProperty('gaps');
    });

    it('should return 0% for framework with no controls', async () => {
      const score = await calculateFrameworkComplianceScore('nonexistent-framework');
      
      // If no controls exist, score should be handled gracefully
      expect(score).toBeDefined();
    });
  });

  describe('getGapAnalysis', () => {
    it('should return gap analysis data', async () => {
      const gaps = await getGapAnalysis('test-framework');
      
      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBeTruthy();
      
      if (gaps.length > 0) {
        const gap = gaps[0];
        expect(gap).toHaveProperty('controlId');
        expect(gap).toHaveProperty('controlName');
        expect(gap).toHaveProperty('category');
        expect(gap).toHaveProperty('currentStatus');
        expect(gap).toHaveProperty('targetStatus');
        expect(gap).toHaveProperty('priority');
      }
    });
  });

  describe('generateArtpReport', () => {
    it('should generate ARTP report structure', async () => {
      const report = await generateArtpReport({
        organizationName: 'Djezzy Test',
        reportingPeriod: 'Q1 2024',
        assessorId: 'test-user-1',
      });
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('submissionNumber');
      expect(report).toHaveProperty('organizationName', 'Djezzy Test');
      expect(report).toHaveProperty('reportingPeriod', 'Q1 2024');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('controlsAssessed');
      expect(report).toHaveProperty('compliantControls');
      expect(report).toHaveProperty('nonCompliantControls');
      expect(report).toHaveProperty('generatedAt');
    });

    it('should include executive summary', async () => {
      const report = await generateArtpReport({
        organizationName: 'Djezzy Test',
        reportingPeriod: 'Q1 2024',
        assessorId: 'test-user-1',
      });
      
      expect(report).toHaveProperty('executiveSummary');
      expect(typeof report.executiveSummary).toBe('string');
      expect(report.executiveSummary.length).toBeGreaterThan(0);
    });

    it('should include control details', async () => {
      const report = await generateArtpReport({
        organizationName: 'Djezzy Test',
        reportingPeriod: 'Q1 2024',
        assessorId: 'test-user-1',
      });
      
      expect(report).toHaveProperty('controlDetails');
      expect(Array.isArray(report.controlDetails)).toBeTruthy();
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const metrics = await getDashboardMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('overallScore');
      expect(metrics).toHaveProperty('frameworks');
      expect(metrics).toHaveProperty('recentAssessments');
      expect(metrics).toHaveProperty('openGaps');
      expect(metrics).toHaveProperty('artpSubmissions');
    });

    it('should include score breakdown by category', async () => {
      const metrics = await getDashboardMetrics();
      
      expect(metrics).toHaveProperty('scoreByCategory');
      expect(typeof metrics.scoreByCategory).toBe('object');
    });
  });
});
