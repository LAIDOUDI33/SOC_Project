/**
 * National SOC Platform - CSV Export API Endpoint
 * 
 * RESTful API for bulk data export in CSV format:
 * - Alert data export
 * - Incident data export
 * - Compliance data export
 * - Telecom events export
 * - Custom query results export
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// TYPES
// ============================================================

interface ExportRequest {
  dataType: 'alerts' | 'incidents' | 'compliance' | 'telecom' | 'threat-intel' | 'custom'
  filters?: Record<string, any>
  dateRange?: { start: string; end: string }
  columns?: string[]
  format?: 'csv' | 'excel'
  includeHeaders?: boolean
  delimiter?: string
}

interface ExportResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  recordCount?: number
  fileSize?: number
  generatedAt?: string
  error?: string
}

// ============================================================
// GET Handler - Export Data (with query params)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dataType = searchParams.get('type')
    
    if (!dataType) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: type' },
        { status: 400 }
      )
    }

    // Validate data type
    const validTypes = ['alerts', 'incidents', 'compliance', 'telecom', 'threat-intel', 'custom']
    if (!validTypes.includes(dataType)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse optional parameters
    const format = searchParams.get('format') || 'csv'
    const limit = parseInt(searchParams.get('limit') || '10000')
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const columns = searchParams.get('columns')?.split(',').filter(Boolean)

    return handleExport({
      dataType: dataType as ExportRequest['dataType'],
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      columns,
      format: format as 'csv' | 'excel',
      includeHeaders: searchParams.get('headers') !== 'false',
      delimiter: searchParams.get('delimiter') || ','
    }, limit)
  } catch (error: any) {
    console.error('CSV Export API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST Handler - Export with full configuration
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.dataType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: dataType' },
        { status: 400 }
      )
    }

    const limit = body.limit || 10000
    
    return handleExport({
      dataType: body.dataType,
      filters: body.filters,
      dateRange: body.dateRange,
      columns: body.columns,
      format: body.format || 'csv',
      includeHeaders: body.includeHeaders !== false,
      delimiter: body.delimiter || ','
    }, limit)
  } catch (error: any) {
    console.error('CSV Export API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// MAIN EXPORT HANDLER
// ============================================================

async function handleExport(config: ExportRequest, limit: number): Promise<NextResponse> {
  // Generate mock data based on type
  let data: Record<string, any>[]
  let defaultColumns: string[]
  let filename: string

  switch (config.dataType) {
    case 'alerts':
      ({ data, defaultColumns } = generateAlertData(limit))
      filename = `djezzy-soc-alerts-${getTimestamp()}.csv`
      break
    
    case 'incidents':
      ({ data, defaultColumns } = generateIncidentData(limit))
      filename = `djezzy-soc-incidents-${getTimestamp()}.csv`
      break
    
    case 'compliance':
      ({ data, defaultColumns } = generateComplianceData())
      filename = `djezzy-soc-compliance-${getTimestamp()}.csv`
      break
    
    case 'telecom':
      ({ data, defaultColumns } = generateTelecomData(limit))
      filename = `djezzy-soc-telecom-events-${getTimestamp()}.csv`
      break
    
    case 'threat-intel':
      ({ data, defaultColumns } = generateThreatIntelData(limit))
      filename = `djezzy-soc-threat-intel-${getTimestamp()}.csv`
      break
    
    default:
      ({ data, defaultColumns } = generateCustomData(limit))
      filename = `djezzy-soc-export-${getTimestamp()}.csv`
  }

  // Apply column selection
  const columns = config.columns && config.columns.length > 0 
    ? config.columns.filter(col => defaultColumns.includes(col))
    : defaultColumns

  // Generate CSV content
  const csvContent = generateCSV(data, columns, config.includeHeaders ?? true, config.delimiter ?? ',')

  // Calculate file size
  const buffer = Buffer.from(csvContent, 'utf-8')
  const fileSize = buffer.length

  // Return as downloadable response
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileSize.toString(),
      'Cache-Control': 'no-cache'
    }
  })
}

// ============================================================
// DATA GENERATORS (Mock data for demonstration)
// ============================================================

function generateAlertData(limit: number): { data: Record<string, any>[]; defaultColumns: string[] } {
  const severities = ['critical', 'high', 'medium', 'low', 'info']
  const sources = ['SIEM/Wazuh', 'EDR/GRR', 'Network/Suricata', 'Telecom Probe', 'Threat Intel']
  const statuses = ['new', 'acknowledged', 'investigating', 'resolved', 'closed']

  const data = Array.from({ length: Math.min(limit, 5000) }, (_, i) => ({
    id: `ALT-${String(100000 + i).padStart(6, '0')}`,
    timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    severity: severities[Math.floor(Math.random() * severities.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    category: ['Malware', 'Intrusion', 'Policy Violation', 'Anomaly', 'Fraud'][Math.floor(Math.random() * 5)],
    title: [
      'Suspicious PowerShell execution detected',
      'Potential brute force attack detected',
      'Unusual network connection to known C2',
      'Multiple authentication failures detected',
      'SS7 signaling anomaly detected',
      'Potential SIM swap fraud pattern',
      'DLP alert: Large data transfer detected',
      'Vulnerability scan activity detected'
    ][Math.floor(Math.random() * 8)],
    description: 'Detailed alert description would appear here...',
    source_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    dest_ip: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    hostname: `SRV-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}-${Math.floor(Math.random() * 99) + 1}.djezzy.dz`,
    user: Math.random() > 0.3 ? `user${Math.floor(Math.random() * 500)}@djezzy.dz` : null,
    mitre_technique: ['T1059', 'T1110', 'T1071', 'T1566', 'T1486'][Math.floor(Math.random() * 5)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assigned_to: Math.random() > 0.4 ? `analyst-${['ahmed', 'fatima', 'omar', 'leila', 'karim'][Math.floor(Math.random() * 5)]}` : null,
    risk_score: Math.floor(Math.random() * 100),
    confidence: Math.floor(Math.random() * 40) + 60,
    created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
  }))

  const defaultColumns = [
    'id', 'timestamp', 'severity', 'source', 'category', 'title',
    'source_ip', 'dest_ip', 'hostname', 'user', 'mitre_technique',
    'status', 'assigned_to', 'risk_score', 'confidence'
  ]

  return { data, defaultColumns }
}

function generateIncidentData(limit: number): { data: Record<string, any>[]; defaultColumns: string[] } {
  const severities = ['critical', 'high', 'medium', 'low']
  const statuses = ['open', 'in-progress', 'resolved', 'closed']

  const data = Array.from({ length: Math.min(limit, 1000) }, (_, i) => {
    const severity = severities[Math.floor(Math.random() * severities.length)]
    const createdDate = new Date(Date.now() - Math.random() * 90 * 86400000)
    const resolvedDate = Math.random() > 0.3 
      ? new Date(createdDate.getTime() + Math.random() * 14 * 86400000)
      : null

    return {
      id: `INC-${String(200000 + i).padStart(6, '0')}`,
      title: [
        'Ransomware infection on workstation',
        'Data exfiltration attempt detected',
        'Unauthorized access to customer database',
        'DDoS attack against public services',
        'Phishing campaign targeting employees',
        'SS7 vulnerability exploitation attempt',
        'Insider threat investigation',
        'Supply chain compromise indicator'
      ][Math.floor(Math.random() * 8)],
      severity,
      status: resolvedDate ? (Math.random() > 0.2 ? 'resolved' : 'closed') : (Math.random() > 0.5 ? 'in-progress' : 'open'),
      description: 'Full incident description and timeline...',
      assigned_to: `analyst-${['ahmed', 'fatima', 'omar', 'leila', 'karim'][Math.floor(Math.random() * 5)]}`,
      created_at: createdDate.toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: resolvedDate?.toISOString(),
      mttr_hours: resolvedDate ? Math.round((resolvedDate.getTime() - createdDate.getTime()) / 3600000) : null,
      affected_assets: Math.floor(Math.random() * 50) + 1,
      root_cause: [
        'Phishing email clicked',
        'Unpatched vulnerability exploited',
        'Misconfigured firewall rule',
        'Compromised credentials',
        'Zero-day exploit used',
        'Insider action'
      ][Math.floor(Math.random() * 6)],
      impact: ['Critical service disruption', 'Data breach', 'Financial loss', 'Reputation damage'][Math.floor(Math.random() * 4)],
      anrt_reportable: severity === 'critical' || (severity === 'high' && Math.random() > 0.5)
    }
  })

  const defaultColumns = [
    'id', 'title', 'severity', 'status', 'assigned_to',
    'created_at', 'updated_at', 'resolved_at', 'mttr_hours',
    'affected_assets', 'root_cause', 'impact', 'anrt_reportable'
  ]

  return { data, defaultColumns }
}

function generateComplianceData(): { data: Record<string, any>[]; defaultColumns: string[] } {
  const requirements = [
    { id: 'ANRT-001', name: 'Security Incident Response Plan', category: 'Incident Management' },
    { id: 'ANRT-002', name: 'User Access Management', category: 'Access Control' },
    { id: 'ANRT-003', name: 'Personal Data Encryption', category: 'Data Protection' },
    { id: 'ANRT-004', name: 'Network Segmentation', category: 'Network Security' },
    { id: 'ANRT-005', name: 'Security Event Logging', category: 'Logging & Monitoring' },
    { id: 'ANRT-006', name: 'Disaster Recovery Testing', category: 'Business Continuity' },
    { id: 'ANRT-007', name: 'Data Retention Policy', category: 'Data Protection' },
    { id: 'ANRT-008', name: 'Privileged Access Management', category: 'Access Control' },
    { id: 'ANRT-009', name: 'Penetration Testing Program', category: 'Security Assessment' },
    { id: 'ANRT-010', name: 'Vendor Risk Management', category: 'Third Party' },
    { id: 'ANRT-011', name: 'Security Awareness Training', category: 'Human Factors' },
    { id: 'ANRT-012', name: 'Backup & Recovery Procedures', category: 'Business Continuity' }
  ]

  const statuses = ['compliant', 'partial', 'non-compliant', 'not-assessed']
  const owners = ['SOC Manager', 'IAM Team Lead', 'Security Architect', 'DPO', 'BCP Manager', 'CISO']

  const data = requirements.map(req => ({
    requirement_id: req.id,
    requirement_name: req.name,
    category: req.category,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    control_owner: owners[Math.floor(Math.random() * owners.length)],
    last_assessment_date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().split('T')[0],
    next_review_date: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString().split('T')[0],
    evidence_count: Math.floor(Math.random() * 15),
    risk_level: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    compliance_score: Math.floor(Math.random() * 40) + 60,
    findings_open: Math.floor(Math.random() * 3),
    remediation_plan: Math.random() > 0.3 ? 'Yes' : 'No',
    notes: ''
  }))

  const defaultColumns = [
    'requirement_id', 'requirement_name', 'category', 'status',
    'control_owner', 'last_assessment_date', 'next_review_date',
    'evidence_count', 'risk_level', 'compliance_score',
    'findings_open', 'remediation_plan'
  ]

  return { data, defaultColumns }
}

function generateTelecomData(limit: number): { data: Record<string, any>[]; defaultColumns: string[] } {
  const eventTypes = [
    'sendAuthInfo', 'provideRoamingNumber', 'updateLocation',
    'cancelLocation', 'insertSubscriberData', 'CCR', 'CCA',
    'DWR', 'DWA', 'SIP_INVITE', 'SIP_REGISTER'
  ]
  const statuses = ['normal', 'suspicious', 'malicious']
  const wilayas = [
    'Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna',
    'Sétif', 'Tizi Ouzou', 'Béjaïa', 'Tlemcen', 'Chlef', 'Skikda'
  ]

  const data = Array.from({ length: Math.min(limit, 10000) }, (_, i) => ({
    event_id: `TEL-${String(300000 + i).padStart(6, '0')}`,
    timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    protocol: ['SS7', 'Diameter', 'SIP'][Math.floor(Math.random() * 3)],
    source_node: `STP-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
    destination_node: `HLR-${Math.floor(Math.random() * 10) + 1}`,
    imsi: `21301${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    msisdn: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
    origin_location: wilayas[Math.floor(Math.random() * wilayas.length)],
    destination_location: wilayas[Math.floor(Math.random() * wilayas.length)],
    roaming_partner: Math.random() > 0.5 ? ['Orange FR', 'Vodafone UK', 'Telefonica ES', 'TIM IT'][Math.floor(Math.random() * 4)] : null,
    risk_score: Math.floor(Math.random() * 100),
    status: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'suspicious' : 'malicious') : 'normal',
    alert_generated: Math.random() > 0.9,
    analyst_reviewed: Math.random() > 0.7
  }))

  const defaultColumns = [
    'event_id', 'timestamp', 'event_type', 'protocol',
    'source_node', 'destination_node', 'imsi', 'msisdn',
    'origin_location', 'destination_location', 'roaming_partner',
    'risk_score', 'status', 'alert_generated', 'analyst_reviewed'
  ]

  return { data, defaultColumns }
}

function generateThreatIntelData(limit: number): { data: Record<string, any>[]; defaultColumns: string[] } {
  const iocTypes = ['ip', 'domain', 'url', 'hash_md5', 'hash_sha256', 'email']
  const threats = ['APT', 'Ransomware', 'Phishing', 'Botnet', 'Malware', 'Fraud']
  const confidenceLevels = ['low', 'medium', 'high', 'critical']

  const data = Array.from({ length: Math.min(limit, 5000) }, (_, i) => ({
    ioc_id: `IOC-${String(400000 + i).padStart(6, '0')}`,
    ioc_type: iocTypes[Math.floor(Math.random() * iocTypes.length)],
    value: (() => {
      switch (iocTypes[Math.floor(Math.random() * iocTypes.length)]) {
        case 'ip': return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        case 'domain': return `malicious-${Math.random().toString(36).substr(2, 8)}.com`
        case 'url': return `http://evil-${Math.random().toString(36).substr(2, 6)}.com/path`
        case 'hash_md5': return Math.random().toString(16).substr(2, 32)
        case 'hash_sha256': return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')
        case 'email': return `attacker${Math.floor(Math.random() * 1000)}@evil.com`
        default: return 'unknown'
      }
    })(),
    threat_category: threats[Math.floor(Math.random() * threats.length)],
    threat_actor: Math.random() > 0.5 ? [`APT-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 30) + 1}`, 'Unknown', 'Script Kiddie', 'Organized Crime'][Math.floor(Math.random() * 4)] : null,
    confidence: confidenceLevels[Math.floor(Math.random() * confidenceLevels.length)],
    first_seen: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().split('T')[0],
    last_seen: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split('T')[0],
    source_feed: ['MISP', 'OpenCTI', 'AlienVault OTX', 'VirusTotal', 'Internal'][Math.floor(Math.random() * 5)],
    tags: ['banking', 'telecom', 'algeria', 'africa', 'mobile'].slice(0, Math.floor(Math.random() * 4) + 1).join(', '),
    tlp_level: ['WHITE', 'GREEN', 'AMBER', 'RED'][Math.floor(Math.random() * 4)],
    active: Math.random() > 0.3,
    related_alerts: Math.floor(Math.random() * 20),
    false_positive_rate: (Math.random() * 10).toFixed(1)
  }))

  const defaultColumns = [
    'ioc_id', 'ioc_type', 'value', 'threat_category', 'threat_actor',
    'confidence', 'first_seen', 'last_seen', 'source_feed',
    'tags', 'tlp_level', 'active', 'related_alerts', 'false_positive_rate'
  ]

  return { data, defaultColumns }
}

function generateCustomData(limit: number): { data: Record<string, any>[]; defaultColumns: string[] } {
  // Generic custom data structure
  const data = Array.from({ length: Math.min(limit, 1000) }, (_, i) => ({
    id: `REC-${String(i + 1).padStart(6, '0')}`,
    timestamp: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    field_1: `Value ${i + 1}`,
    field_2: Math.floor(Math.random() * 1000),
    field_3: ['Option A', 'Option B', 'Option C'][Math.floor(Math.random() * 3)],
    field_4: (Math.random() * 100).toFixed(2),
    field_5: Math.random() > 0.5 ? 'Yes' : 'No'
  }))

  const defaultColumns = ['id', 'timestamp', 'field_1', 'field_2', 'field_3', 'field_4', 'field_5']

  return { data, defaultColumns }
}

// ============================================================
// CSV GENERATION UTILITIES
// ============================================================

function generateCSV(
  data: Record<string, any>[],
  columns: string[],
  includeHeaders: boolean,
  delimiter: string
): string {
  const lines: string[] = []

  // Add BOM for Excel compatibility with UTF-8
  lines.push('\uFEFF')

  // Add header row
  if (includeHeaders) {
    lines.push(columns.map(col => escapeCSVField(col, delimiter)).join(delimiter))
  }

  // Add data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return escapeCSVField(String(value), delimiter)
    })
    lines.push(values.join(delimiter))
  }

  return lines.join('\n')
}

function escapeCSVField(value: string, delimiter: string): string {
  // Escape fields that contain delimiter, quotes, or newlines
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function getTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace(/[-:T]/g, '').split('.')[0]
}
