/**
 * Automated Reporting System - Core Report Generation Engine
 * Djezzy National SOC Platform
 * 
 * This module provides the core functionality for generating various types of
 * security operations reports with support for multiple output formats.
 */

import { DailyOperationalTemplate } from './templates/daily-operational'
import { WeeklyExecutiveTemplate } from './templates/weekly-executive'
import { MonthlyComplianceTemplate } from './templates/monthly-compliance'
import { IncidentMonthlyTemplate } from './templates/incident-monthly'
import { QuarterlyBoardTemplate } from './templates/quarterly-board'
import { PDFFormatter } from './formatters/pdf-formatter'
import { CSVFormatter } from './formatters/csv-formatter'
import { HTMLFormatter } from './formatters/html-formatter'
import { JSONFormatter } from './formatters/json-formatter'

// ============================================================
// Type Definitions
// ============================================================

export type ReportType = 
  | 'daily-operational'
  | 'weekly-executive'
  | 'monthly-compliance'
  | 'incident-monthly'
  | 'quarterly-board'

export type OutputFormat = 'pdf' | 'csv' | 'html' | 'json'

export interface ReportMetadata {
  id: string
  title: string
  type: ReportType
  format: OutputFormat
  generatedAt: Date
  generatedBy: string
  periodStart: Date
  periodEnd: Date
  status: 'generating' | 'completed' | 'failed'
  fileSize?: number
  downloadUrl?: string
}

export interface ReportData {
  // Executive Summary Data
  kpis?: {
    riskScore: number
    mttr: number
    assetCoverage: number
    complianceScore: number
  }
  
  // Incident Data
  incidents?: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    resolved: number
    open: number
    mttr: number
  }
  
  // Alert Data
  alerts?: {
    total: number
    bySeverity: Record<string, number>
    bySource: Record<string, number>
    trend: Array<{ date: string; count: number }>
  }
  
  // Threat Intelligence Data
  threatIntel?: {
    iocsCount: number
    campaignsTracked: number
    feedsActive: number
    newIndicators: number
  }
  
  // Compliance Data
  compliance?: {
    overallScore: number
    requirementsCompliant: number
    requirementsTotal: number
    findingsOpen: number
    deadlinesAtRisk: number
  }
  
  // Telecom Security Data
  telecom?: {
    ss7Events: number
    diameterMessages: number
    fraudAlerts: number
    simSwapAttempts: number
    roamingPartners: number
  }
}

export interface ReportConfig {
  type: ReportType
  format: OutputFormat
  periodStart: Date
  periodEnd: Date
  includeCharts: boolean
  includeRawData: boolean
  language: 'en' | 'fr' | 'ar'
  branding: {
    logoUrl?: string
    organizationName: string
    reportTitle?: string
  }
}

// ============================================================
// Template Registry
// ============================================================

const templateRegistry: Record<ReportType, (data: ReportData, config: ReportConfig) => string> = {
  'daily-operational': DailyOperationalTemplate,
  'weekly-executive': WeeklyExecutiveTemplate,
  'monthly-compliance': MonthlyComplianceTemplate,
  'incident-monthly': IncidentMonthlyTemplate,
  'quarterly-board': QuarterlyBoardTemplate
}

// ============================================================
// Formatter Registry
// ============================================================

const formatterRegistry: Record<OutputFormat, (content: string, metadata: ReportMetadata) => Promise<Buffer>> = {
  pdf: PDFFormatter.format,
  csv: CSVFormatter.format,
  html: HTMLFormatter.format,
  json: JSONFormatter.format
}

// ============================================================
// Report Generator Class
// ============================================================

export class ReportGenerator {
  private static instance: ReportGenerator
  private cache: Map<string, { data: Buffer; metadata: ReportMetadata; createdAt: Date }>
  private maxCacheSize: number

  private constructor() {
    this.cache = new Map()
    this.maxCacheSize = 100
  }

  /**
   * Get singleton instance of ReportGenerator
   */
  public static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator()
    }
    return ReportGenerator.instance
  }

  /**
   * Generate a complete report
   */
  async generateReport(
    data: ReportData,
    config: ReportConfig
  ): Promise<{ buffer: Buffer; metadata: ReportMetadata }> {
    const metadata: ReportMetadata = {
      id: `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: this.getReportTitle(config.type),
      type: config.type,
      format: config.format,
      generatedAt: new Date(),
      generatedBy: 'system',
      periodStart: config.periodStart,
      periodEnd: config.periodEnd,
      status: 'generating'
    }

    try {
      // 1. Get the appropriate template
      const templateFn = templateRegistry[config.type]
      if (!templateFn) {
        throw new Error(`Unknown report type: ${config.type}`)
      }

      // 2. Generate content using template
      const content = templateFn(data, config)

      // 3. Format the content using the specified formatter
      const formatterFn = formatterRegistry[config.format]
      if (!formatterFn) {
        throw new Error(`Unknown format: ${config.format}`)
      }

      // 4. Format and return
      const buffer = await formatterFn(content, metadata)

      // Update metadata
      metadata.status = 'completed'
      metadata.fileSize = buffer.length
      metadata.downloadUrl = `/api/reports/${metadata.id}/download`

      // Cache the result
      this.cacheResult(metadata.id, buffer, metadata)

      return { buffer, metadata }
    } catch (error) {
      metadata.status = 'failed'
      console.error('Report generation failed:', error)
      throw error
    }
  }

  /**
   * Generate report in multiple formats simultaneously
   */
  async generateMultiFormat(
    data: ReportData,
    baseConfig: Omit<ReportConfig, 'format'>
  ): Promise<Map<OutputFormat, { buffer: Buffer; metadata: ReportMetadata }>> {
    const results = new Map<OutputFormat, { buffer: Buffer; metadata: ReportMetadata }>()
    
    const formats: OutputFormat[] = ['pdf', 'csv', 'html', 'json']
    
    await Promise.all(
      formats.map(async (format) => {
        try {
          const result = await this.generateReport(data, { ...baseConfig, format })
          results.set(format, result)
        } catch (error) {
          console.error(`Failed to generate ${format} format:`, error)
        }
      })
    )

    return results
  }

  /**
   * Get cached report
   */
  getCachedReport(reportId: string): { data: Buffer; metadata: ReportMetadata } | null {
    const cached = this.cache.get(reportId)
    if (!cached) return null
    
    // Check if cache is still valid (24 hours)
    const age = Date.now() - cached.createdAt.getTime()
    if (age > 24 * 60 * 60 * 1000) {
      this.cache.delete(reportId)
      return null
    }

    return cached
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now()
    for (const [id, entry] of this.cache.entries()) {
      const age = now - entry.createdAt.getTime()
      if (age > 24 * 60 * 60 * 1000) {
        this.cache.delete(id)
      }
    }
  }

  /**
   * Get available report types
   */
  getAvailableReportTypes(): Array<{ id: ReportType; name: string; description: string; frequency: string }> {
    return [
      {
        id: 'daily-operational',
        name: 'Daily Operations Report',
        description: 'Summary of daily SOC activities, alerts handled, and incidents',
        frequency: 'Daily at 06:00'
      },
      {
        id: 'weekly-executive',
        name: 'Weekly Executive Summary',
        description: 'High-level security posture summary for leadership',
        frequency: 'Mondays at 08:00'
      },
      {
        id: 'monthly-compliance',
        name: 'Monthly Compliance Report',
        description: 'ANRT regulatory compliance status and evidence tracking',
        frequency: '1st of each month'
      },
      {
        id: 'incident-monthly',
        name: 'Monthly Incident Statistics',
        description: 'Detailed incident metrics, trends, and analysis',
        frequency: '1st of each month'
      },
      {
        id: 'quarterly-board',
        name: 'Quarterly Board Presentation',
        description: 'Strategic security overview for board meetings',
        frequency: 'Quarter start'
      }
    ]
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private getReportTitle(type: ReportType): string {
    const titles: Record<ReportType, string> = {
      'daily-operational': 'SOC Daily Operational Report',
      'weekly-executive': 'Weekly Executive Security Summary',
      'monthly-compliance': 'Monthly ANRT Compliance Report',
      'incident-monthly': 'Monthly Incident Statistics Report',
      'quarterly-board': 'Quarterly Security Review Presentation'
    }
    return titles[type]
  }

  private cacheResult(
    id: string,
    data: Buffer,
    metadata: ReportMetadata
  ): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(id, { data, metadata, createdAt: new Date() })
  }
}

// Export singleton instance
export const reportGenerator = ReportGenerator.getInstance()

// Default export
export default ReportGenerator
