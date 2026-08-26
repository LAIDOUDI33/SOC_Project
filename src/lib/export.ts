/**
 * National SOC Platform - Export Utilities
 * Algeria 2026-2030 | Data Export & Report Generation
 * 
 * Provides utilities for exporting SOC data in various formats:
 * - CSV for spreadsheet analysis
 * - JSON for API integration
 * - PDF for formal reports (using browser print or server-side)
 * - STIX 2.1 for threat intelligence sharing
 */

import { format, parseISO } from 'date-fns'

// ============= TYPES =============

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'stix'
  filename?: string
  includeHeaders?: boolean
  dateFormat?: string
  timezone?: string
  columns?: string[]
  filters?: Record<string, any>
}

export interface ExportData {
  headers: string[]
  rows: Array<Record<string, any>>
  metadata?: {
    generatedAt: Date
    generatedBy: string
    recordCount: number
    source: string
  }
}

// ============= CSV EXPORT =============

/**
 * Convert data to CSV format
 */
export function exportToCSV(data: ExportData, options: ExportOptions = {}): string {
  const { includeHeaders = true } = options
  
  // Filter columns if specified
  const headers = options.columns ?? data.headers
  const rows = options.columns 
    ? data.rows.map(row => 
        Object.fromEntries(
          Object.entries(row).filter(([key]) => headers.includes(key))
        )
      )
    : data.rows

  // Escape CSV values
  const escapeValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    const strValue = String(value)
    // Wrap in quotes if contains comma, quote, or newline
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`
    }
    return strValue
  }

  // Build CSV content
  const lines: string[] = []

  // Add metadata as comments
  if (data.metadata && includeHeaders) {
    lines.push(`# Generated: ${format(data.metadata.generatedAt, 'yyyy-MM-dd HH:mm:ss')}`)
    lines.push(`# By: ${data.metadata.generatedBy}`)
    lines.push(`# Records: ${data.metadata.recordCount}`)
    lines.push('')
  }

  // Add header row
  if (includeHeaders) {
    lines.push(headers.map(h => `"${h}"`).join(','))
  }

  // Add data rows
  for (const row of rows) {
    lines.push(headers.map(h => escapeValue(row[h])).join(','))
  }

  return lines.join('\n')
}

// ============= JSON EXPORT =============

/**
 * Convert data to formatted JSON
 */
export function exportToJSON(data: ExportData, options: ExportOptions = {}): string {
  const { columns } = options
  
  const exportData = {
    version: '1.0',
    type: 'soc-export',
    generatedAt: new Date().toISOString(),
    ...(data.metadata || {}),
    data: columns 
      ? data.rows.map(row => 
          Object.fromEntries(
            Object.entries(row).filter(([key]) => columns!.includes(key))
          )
        )
      : data.rows
  }

  return JSON.stringify(exportData, null, 2)
}

// ============= STIX 2.1 EXPORT =============

/**
 * Convert threat intelligence data to STIX 2.1 format
 */
export function exportToSTIX(data: ExportData): string {
  const stixObjects = data.rows.map((row, index) => ({
    type: 'indicator',
    id: `indicator--${row.id || index}`,
    created: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    modified: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    name: `${row.type}: ${row.value || row.title || 'Unknown'}`,
    description: row.description || '',
    pattern: generateSTIXPattern(row),
    pattern_type: 'stix',
    valid_from: row.firstSeen ? new Date(row.firstSeen).toISOString() : new Date().toISOString(),
    labels: [row.severity?.toLowerCase() || 'unknown'],
    confidence: Math.round((row.confidence || 0.7) * 100),
    external_references: row.sourceUrl ? [{ url: row.sourceUrl }] : [],
    object_marking_refs: ['marking-definition--f88d31f6-6ce0-4a5c-8b5a-3e0a7c3a3d1c'] // TLP:AMBER by default
  }))

  const stixBundle = {
    type: 'bundle',
    id: `bundle--${Date.now()}`,
    objects: [
      // Include marking definitions
      {
        type: 'marking-definition',
        spec_version: '2.1',
        id: 'marking-definition--f88d31f6-6ce0-4a5c-8b5a-3e0a7c3a3d1c',
        created: '2024-01-01T00:00:00.000Z',
        definition_type: 'statement',
        definition: { statement: 'TLP:AMBER' }
      },
      ...stixObjects
    ]
  }

  return JSON.stringify(stixBundle, null, 2)
}

function generateSTIXPattern(row: Record<string, any>): string {
  const patterns: string[] = []
  
  if (row.value) {
    switch (row.type?.toLowerCase()) {
      case 'ipv4':
      case 'ip':
        patterns.push(`[ipv4-addr:value = '${row.value}']`)
        break
      case 'domain':
        patterns.push(`[domain-name:value = '${row.value}']`)
        break
      case 'url':
        patterns.push(`[url:value = '${row.value}']`)
        break
      case 'hash':
      case 'md5':
        patterns.push(`[file:md5 = '${row.value}']`)
        break
      case 'sha256':
        patterns.push(`[file:sha256 = '${row.value}']`)
        break
      case 'email':
        patterns.push(`[email-addr:value = '${row.value}']`)
        break
      default:
        patterns.push(`[ioc:value = '${row.value}']`)
    }
  }

  return patterns.join(' OR ')
}

// ============= FILE DOWNLOAD HELPERS =============

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate default filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss')
  return `${prefix}_${timestamp}.${extension}`
}

// ============= EXPORT WRAPPER =============

/**
 * Main export function that handles all formats
 */
export function exportData(data: ExportData, options: ExportOptions): void {
  const format = options.format
  const filename = options.filename || generateFilename('soc_export', format)

  let content: string
  let mimeType: string

  switch (format) {
    case 'csv':
      content = exportToCSV(data, options)
      mimeType = 'text/csv'
      break
    case 'json':
      content = exportToJSON(data, options)
      mimeType = 'application/json'
      break
    case 'stix':
      content = exportToSTIX(data)
      mimeType = 'application/stix+json'
      break
    case 'pdf':
      // PDF generation would require a library like jsPDF or server-side rendering
      console.warn('PDF export requires server-side rendering')
      content = JSON.stringify(data, null, 2) // Fallback to JSON
      mimeType = 'application/json'
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  downloadFile(content, filename, mimeType)
}

// ============= SPECIALIZED EXPORTS =============

/**
 * Export alerts data
 */
export function exportAlerts(alerts: any[], format: 'csv' | 'json' | 'stix' = 'csv'): void {
  const data: ExportData = {
    headers: ['id', 'title', 'severity', 'status', 'source', 'sourceIp', 'destinationIp', 'createdAt', 'resolvedAt'],
    rows: alerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      source: alert.source,
      sourceIp: alert.sourceIp,
      destinationIp: alert.destinationIp,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt
    })),
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'current-user',
      recordCount: alerts.length,
      source: 'alerts'
    }
  }

  exportData(data, { format })
}

/**
 * Export incidents data
 */
export function exportIncidents(incidents: any[], format: 'csv' | 'json' = 'csv'): void {
  const data: ExportData = {
    headers: ['incidentId', 'title', 'type', 'severity', 'status', 'detectedAt', 'resolvedAt', 'assignedTo'],
    rows: incidents.map(incident => ({
      incidentId: incident.incidentId,
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      detectedAt: incident.detectedAt,
      resolvedAt: incident.resolvedAt,
      assignedTo: incident.assignee?.name
    })),
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'current-user',
      recordCount: incidents.length,
      source: 'incidents'
    }
  }

  exportData(data, { format })
}

/**
 * Export threat intelligence IOCs
 */
export function exportIOCs(iocs: any[], format: 'csv' | 'json' | 'stix' = 'stix'): void {
  const data: ExportData = {
    headers: ['id', 'type', 'value', 'threatLevel', 'source', 'firstSeen', 'lastSeen', 'isActive'],
    rows: iocs.map(ioc => ({
      id: ioc.id,
      type: ioc.type,
      value: ioc.value,
      threatLevel: ioc.threatLevel,
      source: ioc.source,
      firstSeen: ioc.firstSeen,
      lastSeen: ioc.lastSeen,
      isActive: ioc.isActive
    })),
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'current-user',
      recordCount: iocs.length,
      source: 'threat-intel'
    }
  }

  exportData(data, { format })
}
