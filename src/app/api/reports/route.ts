/**
 * National SOC Platform - Reports API Endpoint
 * 
 * RESTful API for report management:
 * - List available reports
 * - Generate new reports
 * - Download existing reports
 * - Report scheduling
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportGenerator } from '@/lib/reporting/report-generator'
import { reportScheduler } from '@/lib/reporting/scheduler'
import type { ReportType, OutputFormat, ReportConfig, ReportData } from '@/lib/reporting/report-generator'

// ============================================================
// TYPES
// ============================================================

interface GenerateReportRequest {
  type: ReportType
  format: OutputFormat
  periodStart: string // ISO date string
  periodEnd: string // ISO date string
  includeCharts?: boolean
  includeRawData?: boolean
  language?: 'en' | 'fr' | 'ar'
}

interface ListReportsQuery {
  type?: string
  format?: string
  limit?: string
  offset?: string
}

// ============================================================
// GET Handler - List Reports & Schedules
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    switch (action) {
      case 'list-types':
        return handleListReportTypes()
      
      case 'list-schedules':
        return handleListSchedules()
      
      case 'schedule-history':
        return handleScheduleHistory(searchParams)
      
      default:
        return handleListAvailableReports()
    }
  } catch (error: any) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST Handler - Generate Reports & Manage Schedules
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'generate':
        return handleGenerateReport(body)
      
      case 'create-schedule':
        return handleCreateSchedule(body)
      
      case 'trigger-schedule':
        return handleTriggerSchedule(body)
      
      case 'toggle-schedule':
        return handleToggleSchedule(body)
      
      case 'delete-schedule':
        return handleDeleteSchedule(body)
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// HANDLER FUNCTIONS
// ============================================================

async function handleListAvailableReports(): Promise<NextResponse> {
  const reportTypes = reportGenerator.getAvailableReportTypes()
  const schedules = reportScheduler.getSchedules()

  return NextResponse.json({
    success: true,
    data: {
      reportTypes,
      activeSchedules: schedules.filter(s => s.enabled).length,
      totalSchedules: schedules.length,
      generatedAt: new Date().toISOString()
    }
  })
}

async function handleListReportTypes(): Promise<NextResponse> {
  const reportTypes = reportGenerator.getAvailableReportTypes()

  return NextResponse.json({
    success: true,
    reportTypes,
    total: reportTypes.length
  })
}

async function handleListSchedules(): Promise<NextResponse> {
  const schedules = reportScheduler.getSchedules()

  return NextResponse.json({
    success: true,
    schedules: schedules.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      format: s.format,
      enabled: s.enabled,
      cronExpression: s.cronExpression,
      lastRunAt: s.lastRunAt?.toISOString(),
      nextRunAt: s.nextRunAt?.toISOString(),
      lastStatus: s.lastStatus,
      runCount: s.runCount,
      createdAt: s.createdAt.toISOString()
    })),
    total: schedules.length
  })
}

async function handleScheduleHistory(searchParams: URLSearchParams): Promise<NextResponse> {
  const scheduleId = searchParams.get('scheduleId')
  
  if (!scheduleId) {
    return NextResponse.json(
      { success: false, error: 'scheduleId parameter is required' },
      { status: 400 }
    )
  }

  const limit = parseInt(searchParams.get('limit') || '50')
  const history = reportScheduler.getRunHistory(scheduleId, limit)

  return NextResponse.json({
    success: true,
    scheduleId,
    history: history.map(run => ({
      ...run,
      executedAt: run.executedAt.toISOString()
    })),
    total: history.length
  })
}

async function handleGenerateReport(body: GenerateReportRequest): Promise<NextResponse> {
  // Validate required fields
  if (!body.type || !body.format || !body.periodStart || !body.periodEnd) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required fields: type, format, periodStart, periodEnd' 
      },
      { status: 400 }
    )
  }

  // Validate report type
  const validTypes: ReportType[] = [
    'daily-operational', 'weekly-executive', 'monthly-compliance',
    'incident-monthly', 'quarterly-board'
  ]
  if (!validTypes.includes(body.type)) {
    return NextResponse.json(
      { success: false, error: `Invalid report type. Valid types: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate format
  const validFormats: OutputFormat[] = ['pdf', 'csv', 'html', 'json']
  if (!validFormats.includes(body.format)) {
    return NextResponse.json(
      { success: false, error: `Invalid format. Valid formats: ${validFormats.join(', ')}` },
      { status: 400 }
    )
  }

  // Build config
  const config: ReportConfig = {
    type: body.type,
    format: body.format,
    periodStart: new Date(body.periodStart),
    periodEnd: new Date(body.periodEnd),
    includeCharts: body.includeCharts ?? true,
    includeRawData: body.includeRawData ?? false,
    language: body.language ?? 'en',
    branding: {
      organizationName: 'Djezzy National SOC',
      reportTitle: undefined
    }
  }

  // Generate mock data (in production, fetch from actual sources)
  const mockData: ReportData = generateMockReportData(body.type)

  // Generate the report
  const result = await reportGenerator.generateReport(mockData, config)

  return NextResponse.json({
    success: true,
    report: {
      id: result.metadata.id,
      title: result.metadata.title,
      type: result.metadata.type,
      format: result.metadata.format,
      status: result.metadata.status,
      fileSize: result.metadata.fileSize,
      generatedAt: result.metadata.generatedAt.toISOString(),
      downloadUrl: result.metadata.downloadUrl
    },
    message: 'Report generated successfully'
  })
}

async function handleCreateSchedule(body: any): Promise<NextResponse> {
  if (!body.name || !body.type || !body.format || !body.cronExpression) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: name, type, format, cronExpression' },
      { status: 400 }
    )
  }

  const schedule = reportScheduler.createSchedule({
    name: body.name,
    type: body.type,
    format: body.format,
    cronExpression: body.cronExpression,
    enabled: body.enabled ?? true,
    config: {
      includeCharts: body.config?.includeCharts ?? true,
      includeRawData: body.config?.includeRawData ?? false,
      language: body.config?.language ?? 'en',
      branding: body.config?.branding
    },
    distribution: body.distribution
  })

  return NextResponse.json({
    success: true,
    schedule: {
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      format: schedule.format,
      enabled: schedule.enabled,
      createdAt: schedule.createdAt.toISOString()
    },
    message: 'Schedule created successfully'
  })
}

async function handleTriggerSchedule(body: any): Promise<NextResponse> {
  if (!body.scheduleId) {
    return NextResponse.json(
      { success: false, error: 'scheduleId is required' },
      { status: 400 }
    )
  }

  const run = await reportScheduler.triggerSchedule(body.scheduleId)

  return NextResponse.json({
    success: true,
    run: {
      scheduleId: run.scheduleId,
      executedAt: run.executedAt.toISOString(),
      status: run.status,
      duration: run.duration,
      reportId: run.reportId
    },
    message: 'Schedule triggered successfully'
  })
}

async function handleToggleSchedule(body: any): Promise<NextResponse> {
  if (!body.scheduleId) {
    return NextResponse.json(
      { success: false, error: 'scheduleId is required' },
      { status: 400 }
    )
  }

  const updated = reportScheduler.toggleSchedule(body.scheduleId)

  if (!updated) {
    return NextResponse.json(
      { success: false, error: 'Schedule not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    schedule: {
      id: updated.id,
      enabled: updated.enabled
    },
    message: `Schedule ${updated.enabled ? 'enabled' : 'disabled'}`
  })
}

async function handleDeleteSchedule(body: any): Promise<NextResponse> {
  if (!body.scheduleId) {
    return NextResponse.json(
      { success: false, error: 'scheduleId is required' },
      { status: 400 }
    )
  }

  const deleted = reportScheduler.deleteSchedule(body.scheduleId)

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: 'Schedule not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Schedule deleted successfully'
  })
}

// ============================================================
// MOCK DATA GENERATOR (Replace with actual data fetching in production)
// ============================================================

function generateMockReportData(type: ReportType): ReportData {
  const baseData: ReportData = {
    kpis: {
      riskScore: Math.floor(Math.random() * 30) + 40,
      mttr: Math.floor(Math.random() * 100) / 10 + 1,
      assetCoverage: Math.floor(Math.random() * 10) + 90,
      complianceScore: Math.floor(Math.random() * 20) + 75
    },
    incidents: {
      total: Math.floor(Math.random() * 50) + 10,
      critical: Math.floor(Math.random() * 5),
      high: Math.floor(Math.random() * 10),
      medium: Math.floor(Math.random() * 20),
      low: Math.floor(Math.random() * 30),
      resolved: Math.floor(Math.random() * 40) + 5,
      open: Math.floor(Math.random() * 15),
      mttr: Math.floor(Math.random() * 200) / 10 + 1
    },
    alerts: {
      total: Math.floor(Math.random() * 500) + 200,
      bySeverity: {
        critical: Math.floor(Math.random() * 20),
        high: Math.floor(Math.random() * 50),
        medium: Math.floor(Math.random() * 100),
        low: Math.floor(Math.random() * 200)
      },
      bySource: {
        siem: Math.floor(Math.random() * 150),
        edr: Math.floor(Math.random() * 80),
        network: Math.floor(Math.random() * 120),
        telecom: Math.floor(Math.random() * 40),
        'threat-intel': Math.floor(Math.random() * 30)
      },
      trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 50
      }))
    },
    threatIntel: {
      iocsCount: Math.floor(Math.random() * 500) + 200,
      campaignsTracked: Math.floor(Math.random() * 20) + 5,
      feedsActive: Math.floor(Math.random() * 10) + 50,
      newIndicators: Math.floor(Math.random() * 50) + 10
    },
    compliance: {
      overallScore: Math.floor(Math.random() * 15) + 82,
      requirementsCompliant: Math.floor(Math.random() * 5) + 18,
      requirementsTotal: 25,
      findingsOpen: Math.floor(Math.random() * 8),
      deadlinesAtRisk: Math.floor(Math.random() * 3)
    },
    telecom: {
      ss7Events: Math.floor(Math.random() * 50000) + 10000,
      diameterMessages: Math.floor(Math.random() * 30000) + 5000,
      fraudAlerts: Math.floor(Math.random() * 20) + 5,
      simSwapAttempts: Math.floor(Math.random() * 100) + 20,
      roamingPartners: 58
    }
  }

  // Customize based on report type
  switch (type) {
    case 'daily-operational':
      return baseData
    
    case 'weekly-executive':
      return {
        ...baseData,
        kpis: { ...baseData.kpis!, riskScore: baseData.kpis!.riskScore - 2 }
      }
    
    case 'monthly-compliance':
      return {
        ...baseData,
        compliance: {
          ...baseData.compliance!,
          overallScore: baseData.compliance!.overallScore + 3,
          findingsOpen: baseData.compliance!.findingsOpen + 2
        }
      }
    
    default:
      return baseData
  }
}
