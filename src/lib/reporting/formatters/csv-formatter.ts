/**
 * CSV Formatter for Report Generation
 * Djezzy National SOC Platform
 * 
 * Converts report data to CSV format for spreadsheet compatibility
 */

import { ReportMetadata } from '../report-generator'

interface CSVOptions {
  delimiter: string
  includeHeaders: boolean
  includeBOM: boolean // Byte Order Mark for Excel compatibility
  nullValue: string
  dateFormat: string
}

const defaultOptions: CSVOptions = {
  delimiter: ',',
  includeHeaders: true,
  includeBOM: true,
  nullValue: '',
  dateFormat: 'YYYY-MM-DD HH:mm:ss'
}

export class CSVFormatter {
  /**
   * Format data as CSV
   */
  static async format(
    data: string | Record<string, unknown>[],
    metadata: ReportMetadata,
    options: Partial<CSVOptions> = {}
  ): Promise<Buffer> {
    const opts = { ...defaultOptions, ...options }

    try {
      let csvContent: string

      if (typeof data === 'string') {
        // If data is HTML, extract table data or convert to simple text
        csvContent = this.extractTableFromHTML(data)
      } else if (Array.isArray(data)) {
        // If data is an array of objects, convert to CSV
        csvContent = this.objectsToCSV(data, opts)
      } else if (typeof data === 'object' && data !== null) {
        // Single object - convert to single row
        csvContent = this.objectToCSVRow(data as Record<string, unknown>, opts)
      } else {
        throw new Error('Unsupported data type for CSV formatting')
      }

      // Add BOM for Excel UTF-8 support
      const bom = opts.includeBOM ? '\uFEFF' : ''
      
      return Buffer.from(bom + csvContent, 'utf-8')
    } catch (error) {
      console.error('CSV formatting failed:', error)
      throw new Error(`Failed to generate CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert array of objects to CSV
   */
  private static objectsToCSV(
    data: Record<string, unknown>[],
    options: CSVOptions
  ): string {
    if (data.length === 0) return ''

    // Get all unique keys as headers
    const headers = this.getUniqueKeys(data)
    
    let csv = ''
    
    // Add headers
    if (options.includeHeaders) {
      csv += headers.map(h => this.escapeCSVField(String(h), options.delimiter)).join(options.delimiter) + '\n'
    }

    // Add rows
    for (const obj of data) {
      csv += this.objectToCSVRow(obj, options, headers) + '\n'
    }

    return csv.trim()
  }

  /**
   * Convert single object to CSV row
   */
  private static objectToCSVRow(
    obj: Record<string, unknown>,
    options: CSVOptions,
    keys?: string[]
  ): string {
    const fields = keys || Object.keys(obj)
    
    return fields.map(key => {
      const value = obj[key]
      return this.escapeCSVField(this.formatValue(value, options), options.delimiter)
    }).join(options.delimiter)
  }

  /**
   * Get all unique keys from array of objects
   */
  private static getUniqueKeys(data: Record<string, unknown>[]): string[] {
    const keySet = new Set<string>()
    
    for (const obj of data) {
      for (const key of Object.keys(obj)) {
        keySet.add(key)
      }
    }
    
    return Array.from(keySet)
  }

  /**
   * Escape a field value for CSV
   */
  private static escapeCSVField(value: string, delimiter: string): string {
    // If the value contains the delimiter, quotes, or newlines, wrap it in quotes
    if (
      value.includes(delimiter) ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return '"' + value.replace(/"/g, '""') + '"'
    }
    
    return value
  }

  /**
   * Format a value for CSV output
   */
  private static formatValue(value: unknown, options: CSVOptions): string {
    if (value === null || value === undefined) {
      return options.nullValue
    }

    if (value instanceof Date) {
      return this.formatDate(value, options.dateFormat)
    }

    if (Array.isArray(value)) {
      return value.join('; ')
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return '[Object]'
      }
    }

    return String(value)
  }

  /**
   * Format date according to pattern
   */
  private static formatDate(date: Date, pattern: string): string {
    const replacements: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'DD': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'ss': String(date.getSeconds()).padStart(2, '0')
    }

    let result = pattern
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(key, value)
    }

    return result
  }

  /**
   * Extract table data from HTML content
   */
  private static extractTableFromHTML(html: string): string {
    // Simple HTML table parser
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    const tables: string[] = []
    let match

    while ((match = tableRegex.exec(html)) !== null) {
      tables.push(match[1])
    }

    if (tables.length === 0) {
      // No tables found, create a simple text representation
      return this.htmlToPlainText(html)
    }

    // Parse each table and combine
    const csvRows: string[] = []

    for (const tableHtml of tables) {
      // Extract header row
      const headerMatch = tableHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi)
      if (headerMatch) {
        csvRows.push(
          headerMatch.map(th => {
            const text = th.replace(/<[^>]+>/g, '').trim()
            return this.escapeCSVField(text, ',')
          }).join(',')
        )
      }

      // Extract data rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      let rowMatch

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        const cells: string[] = []
        let cellMatch

        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(
            this.escapeCSVField(cellMatch[1].replace(/<[^>]+>/g, '').trim(), ',')
          )
        }

        if (cells.length > 0) {
          csvRows.push(cells.join(','))
        }
      }

      // Add empty row between tables
      csvRows.push('')
    }

    return csvRows.join('\n').trim()
  }

  /**
   * Convert HTML to plain text (fallback)
   */
  private static htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim()
  }

  /**
   * Generate incident data CSV specifically
   */
  static async generateIncidentCSV(
    incidents: Array<{
      id: string
      title: string
      severity: string
      status: string
      createdAt: Date
      resolvedAt?: Date
      assignee?: string
      source?: string
    }>
  ): Promise<Buffer> {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'Created At', 'Resolved At', 'Assignee', 'Source']
    let csv = headers.join(',') + '\n'

    for (const incident of incidents) {
      const row = [
        incident.id,
        `"${(incident.title || '').replace(/"/g, '""')}"`,
        incident.severity,
        incident.status,
        incident.createdAt.toISOString(),
        incident.resolvedAt?.toISOString() || '',
        incident.assignee || '',
        incident.source || ''
      ]
      csv += row.join(',') + '\n'
    }

    return Buffer.from('\uFEFF' + csv, 'utf-8')
  }

  /**
   * Generate compliance matrix CSV
   */
  static async generateComplianceMatrixCSV(
    requirements: Array<{
      id: string
      category: string
      reference: string
      title: string
      status: string
      lastAssessment: Date
      nextReview: Date
      evidenceCount: number
    }>
  ): Promise<Buffer> {
    const headers = ['ID', 'Category', 'Reference', 'Title', 'Status', 'Last Assessment', 'Next Review', 'Evidence Count']
    let csv = headers.join(',') + '\n'

    for (const req of requirements) {
      const row = [
        req.id,
        req.category,
        req.reference,
        `"${req.title.replace(/"/g, '""')}"`,
        req.status,
        req.lastAssessment.toISOString(),
        req.nextReview.toISOString(),
        String(req.evidenceCount)
      ]
      csv += row.join(',') + '\n'
    }

    return Buffer.from('\uFEFF' + csv, 'utf-8')
  }
}

export default CSVFormatter
