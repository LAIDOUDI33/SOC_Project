/**
 * JSON Formatter for Report Generation
 * Djezzy National SOC Platform
 * 
 * Converts report data to machine-readable JSON format
 */

import { ReportMetadata } from '../report-generator'

interface JSONOptions {
  prettyPrint: boolean
  includeMetadata: boolean
  includeSchema: boolean
  dateFormat: string
}

const defaultOptions: JSONOptions = {
  prettyPrint: true,
  includeMetadata: true,
  includeSchema: false,
  dateFormat: 'ISO-8601'
}

export class JSONFormatter {
  /**
   * Format data as JSON
   */
  static async format(
    data: string | Record<string, unknown>,
    metadata: ReportMetadata,
    options: Partial<JSONOptions> = {}
  ): Promise<Buffer> {
    const opts = { ...defaultOptions, ...options }

    try {
      let jsonData: Record<string, unknown>

      if (typeof data === 'string') {
        // If data is HTML or string, try to extract structured data
        jsonData = this.extractStructuredData(data)
      } else if (typeof data === 'object' && data !== null) {
        jsonData = data as Record<string, unknown>
      } else {
        throw new Error('Unsupported data type for JSON formatting')
      }

      // Add metadata if requested
      if (opts.includeMetadata) {
        jsonData._metadata = {
          id: metadata.id,
          title: metadata.title,
          type: metadata.type,
          format: metadata.format,
          generatedAt: metadata.generatedAt.toISOString(),
          generatedBy: metadata.generatedBy,
          periodStart: metadata.periodStart.toISOString(),
          periodEnd: metadata.periodEnd.toISOString(),
          status: metadata.status,
          version: '1.0.0',
          schema: opts.includeSchema ? this.getSchema() : undefined
        }
      }

      const jsonString = JSON.stringify(jsonData, null, opts.prettyPrint ? 2 : 0)
      return Buffer.from(jsonString, 'utf-8')
    } catch (error) {
      console.error('JSON formatting failed:', error)
      throw new Error(`Failed to generate JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract structured data from HTML content
   */
  private static extractStructuredData(html: string): Record<string, unknown> {
    const data: Record<string, unknown> = {}

    try {
      // Extract tables
      const tables = this.extractTablesFromHTML(html)
      if (tables.length > 0) {
        data.tables = tables
      }

      // Extract KPI values
      const kpis = this.extractKPIsFromHTML(html)
      if (Object.keys(kpis).length > 0) {
        data.kpis = kpis
      }

      // Extract text content as fallback
      data.content = this.htmlToPlainText(html)

    } catch (error) {
      console.warn('Failed to extract structured data from HTML:', error)
      data.content = html
    }

    return data
  }

  /**
   * Extract tables from HTML
   */
  private static extractTablesFromHTML(html: string): Array<{
    headers: string[]
    rows: Array<Record<string, string>>
  }> {
    const tables: Array<{ headers: string[]; rows: Array<Record<string, string>> }> = []
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi

    let match
    while ((match = tableRegex.exec(html)) !== null) {
      const tableHtml = match[1]
      const headers: string[] = []
      const rows: Array<Record<string, string>> = []

      // Extract headers
      const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi
      let headerMatch
      while ((headerMatch = headerRegex.exec(tableHtml)) !== null) {
        headers.push(this.cleanText(headerMatch[1]))
      }

      // Extract rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const rowHtml = rowMatch[1]
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        const cells: string[] = []
        let cellMatch

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          cells.push(this.cleanText(cellMatch[1]))
        }

        // Create object with headers as keys
        const rowObj: Record<string, string> = {}
        cells.forEach((cell, index) => {
          const key = headers[index] || `column_${index}`
          rowObj[key] = cell
        })

        rows.push(rowObj)
      }

      if (headers.length > 0 || rows.length > 0) {
        tables.push({ headers, rows })
      }
    }

    return tables
  }

  /**
   * Extract KPI values from HTML
   */
  private static extractKPIsFromHTML(html: string): Record<string, string | number> {
    const kpis: Record<string, string | number> = {}

    // Look for common KPI patterns in HTML
    const patterns = [
      { regex: /Risk Score[:\s]*(\d+(?:\.\d+)?)/gi, key: 'riskScore' },
      { regex: /MTTR[:\s]*(\d+(?:\.\d+)?)/gi, key: 'mttr' },
      { regex: /Compliance[:\s]*(\d+(?:\.\d+)?)%?/gi, key: 'complianceScore' },
      { regex: /Coverage[:\s]*(\d+(?:\.\d+)?)%?/gi, key: 'assetCoverage' },
      { regex: /Total Incidents[:\s]*(\d+)/gi, key: 'totalIncidents' },
      { regex: /Critical[:\s]*(\d+)/gi, key: 'criticalIncidents' }
    ]

    for (const pattern of patterns) {
      const match = pattern.regex.exec(html)
      if (match) {
        const value = parseFloat(match[1])
        if (!isNaN(value)) {
          kpis[pattern.key] = value
        }
      }
    }

    return kpis
  }

  /**
   * Clean text extracted from HTML
   */
  private static cleanText(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  /**
   * Convert HTML to plain text
   */
  private static htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .this.cleanText()
  }

  /**
   * Get JSON Schema definition
   */
  private static getSchema(): object {
    return {
      name: "soc-report",
      version: "1.0.0",
      description: "Djezzy National SOC Platform Report Schema",
      type: "object",
      properties: {
        _metadata: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            type: { type: "string", enum: ["daily-operational", "weekly-executive", "monthly-compliance", "incident-monthly", "quarterly-board"] },
            format: { type: "string" },
            generatedAt: { type: "string", format: "date-time" },
            generatedBy: { type: "string" },
            periodStart: { type: "string", format: "date-time" },
            periodEnd: { type: "string", format: "date-time" },
            status: { type: "string" }
          }
        },
        kpis: {
          type: "object",
          properties: {
            riskScore: { type: "number" },
            mttr: { type: "number" },
            assetCoverage: { type: "number" },
            complianceScore: { type: "number" }
          }
        },
        incidents: {
          type: "object",
          properties: {
            total: { type: "integer" },
            critical: { type: "integer" },
            high: { type: "integer" },
            medium: { type: "integer" },
            low: { type: "integer" },
            resolved: { type: "integer" },
            open: { type: "integer" }
          }
        },
        alerts: {
          type: "object",
          properties: {
            total: { type: "integer" },
            bySeverity: { type: "object" },
            bySource: { type: "object" }
          }
        },
        compliance: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            requirementsCompliant: { type: "integer" },
            requirementsTotal: { type: "integer" },
            findingsOpen: { type: "integer" }
          }
        },
        telecom: {
          type: "object",
          properties: {
            ss7Events: { type: "integer" },
            diameterMessages: { type: "integer" },
            fraudAlerts: { type: "integer" },
            simSwapAttempts: { type: "integer" }
          }
        }
      }
    }
  }

  /**
   * Generate API response JSON
   */
  static async generateAPIResponse(options: {
    success: boolean
    data?: Record<string, unknown>
    error?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }): Promise<Buffer> {
    const response = {
      success: options.success,
      timestamp: new Date().toISOString(),
      data: options.data,
      error: options.error,
      pagination: options.pagination
    }

    return Buffer.from(JSON.stringify(response, null, 2), 'utf-8')
  }

  /**
   * Generate export package with multiple report types
   */
  static async generateExportPackage(
    reports: Map<string, Buffer>,
    metadata: ReportMetadata
  ): Promise<Buffer> {
    const packageData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      metadata: {
        id: metadata.id,
        title: metadata.title,
        type: metadata.type,
        generatedAt: metadata.generatedAt.toISOString()
      },
      files: Object.fromEntries(reports),
      manifest: Array.from(reports.keys()).map(key => ({
        filename: `${metadata.id}.${key}`,
        format: key,
        size: reports.get(key)?.length || 0
      }))
    }

    return Buffer.from(JSON.stringify(packageData, null, 2), 'utf-8')
  }
}

export default JSONFormatter
