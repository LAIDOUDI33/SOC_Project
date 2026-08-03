/**
 * Automated Reporting System - Cron-based Report Scheduler
 * Djezzy National SOC Platform
 * 
 * This module handles scheduling of automated report generation
 * based on configurable cron expressions.
 */

import { ReportGenerator, ReportConfig, ReportType, OutputFormat } from './report-generator'
import { distributeReport } from './distribution'

// ============================================================
// Type Definitions
// ============================================================

export interface ScheduleConfig {
  id: string
  name: string
  type: ReportType
  format: OutputFormat
  cronExpression: string
  enabled: boolean
  
  // Configuration
  config: Partial<Omit<ReportConfig, 'type' | 'format'>>
  
  // Distribution
  distribution: {
    email?: {
      recipients: string[]
      subject?: string
      includeBody: boolean
    }
    slack?: {
      webhookUrl?: string
      channel: string
    }
  }
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastRunAt?: Date
  nextRunAt?: Date
  lastStatus?: 'success' | 'failed' | 'skipped'
  runCount: number
}

export interface ScheduledRun {
  scheduleId: string
  executedAt: Date
  status: 'success' | 'failed' | 'skipped'
  reportId?: string
  duration?: number
  error?: string
}

// ============================================================
// In-Memory Store (Replace with database in production)
// ============================================================

class ScheduleStore {
  private schedules: Map<string, ScheduleConfig>
  private runHistory: Map<string, ScheduledRun[]>

  constructor() {
    this.schedules = new Map()
    this.runHistory = new Map()
    
    // Initialize with default schedules
    this.initializeDefaultSchedules()
  }

  /**
   * Initialize default report schedules
   */
  private initializeDefaultSchedules(): void {
    const defaultSchedules: ScheduleConfig[] = [
      {
        id: 'sched-daily-ops',
        name: 'Daily Operations Report',
        type: 'daily-operational',
        format: 'pdf',
        cronExpression: '0 6 * * *', // Daily at 6 AM
        enabled: true,
        config: {
          includeCharts: true,
          includeRawData: false,
          language: 'en',
          branding: {
            organizationName: 'Djezzy National SOC',
            reportTitle: 'Daily Security Operations Report'
          }
        },
        distribution: {
          email: {
            recipients: ['soc-team@djezzy.dz', 'security-leads@djezzy.dz'],
            subject: '📊 SOC Daily Operations Report',
            includeBody: true
          },
          slack: {
            channel: '#soc-daily-reports'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      },
      {
        id: 'sched-weekly-exec',
        name: 'Weekly Executive Summary',
        type: 'weekly-executive',
        format: 'pdf',
        cronExpression: '0 8 * * 1', // Mondays at 8 AM
        enabled: true,
        config: {
          includeCharts: true,
          includeRawData: false,
          language: 'en',
          branding: {
            organizationName: 'Djezzy National SOC',
            reportTitle: 'Weekly Executive Security Summary'
          }
        },
        distribution: {
          email: {
            recipients: ['ciso@djezzy.dz', 'cto@djezzy.dz', 'executive-team@djezzy.dz'],
            subject: '📈 Weekly Executive Security Summary',
            includeBody: false
          },
          slack: {
            channel: '#leadership-updates'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      },
      {
        id: 'sched-monthly-compliance',
        name: 'Monthly Compliance Report',
        type: 'monthly-compliance',
        format: 'pdf',
        cronExpression: '0 7 1 * *', // 1st of each month at 7 AM
        enabled: true,
        config: {
          includeCharts: true,
          includeRawData: true,
          language: 'en',
          branding: {
            organizationName: 'Djezzy National SOC',
            reportTitle: 'Monthly ANRT Compliance Report'
          }
        },
        distribution: {
          email: {
            recipients: ['compliance-team@djezzy.dz', 'dpo@djezzy.dz', 'legal@djezzy.dz'],
            subject: '📋 Monthly ANRT Compliance Report',
            includeBody: true
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      },
      {
        id: 'sched-monthly-incidents',
        name: 'Monthly Incident Statistics',
        type: 'incident-monthly',
        format: 'csv',
        cronExpression: '30 7 1 * *', // 1st of each month at 7:30 AM
        enabled: true,
        config: {
          includeCharts: false,
          includeRawData: true,
          language: 'en',
          branding: {
            organizationName: 'Djezzy National SOC'
          }
        },
        distribution: {
          email: {
            recipients: ['soc-managers@djezzy.dz'],
            subject: '📊 Monthly Incident Statistics Data',
            includeBody: false
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      },
      {
        id: 'sched-quarterly-board',
        name: 'Quarterly Board Presentation',
        type: 'quarterly-board',
        format: 'pdf',
        cronExpression: '0 9 1 1,4,7,10 *', // Quarter start at 9 AM
        enabled: true,
        config: {
          includeCharts: true,
          includeRawData: false,
          language: 'en',
          branding: {
            organizationName: 'Djezzy National SOC',
            reportTitle: 'Quarterly Security Review'
          }
        },
        distribution: {
          email: {
            recipients: ['board@djezzy.dz', 'ciso@djezzy.dz', 'ceo@djezzy.dz'],
            subject: '🏢 Quarterly Security Review for Board',
            includeBody: false
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      }
    ]

    defaultSchedules.forEach(schedule => {
      this.schedules.set(schedule.id, schedule)
      this.runHistory.set(schedule.id, [])
    })
  }

  // Public Methods

  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values())
  }

  getSchedule(id: string): ScheduleConfig | undefined {
    return this.schedules.get(id)
  }

  createSchedule(schedule: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): ScheduleConfig {
    const newSchedule: ScheduleConfig = {
      ...schedule,
      id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0
    }
    
    this.schedules.set(newSchedule.id, newSchedule)
    this.runHistory.set(newSchedule.id, [])
    
    return newSchedule
  }

  updateSchedule(id: string, updates: Partial<ScheduleConfig>): ScheduleConfig | null {
    const existing = this.schedules.get(id)
    if (!existing) return null
    
    const updated = { ...existing, ...updates, updatedAt: new Date() }
    this.schedules.set(id, updated)
    
    return updated
  }

  deleteSchedule(id: string): boolean {
    this.runHistory.delete(id)
    return this.schedules.delete(id)
  }

  toggleSchedule(id: string): ScheduleConfig | null {
    const schedule = this.schedules.get(id)
    if (!schedule) return null
    
    return this.updateSchedule(id, { enabled: !schedule.enabled })
  }

  getRunHistory(scheduleId: string, limit = 50): ScheduledRun[] {
    const history = this.runHistory.get(scheduleId) || []
    return history.slice(0, limit)
  }

  addRunRecord(scheduleId: string, run: ScheduledRun): void {
    const history = this.runHistory.get(scheduleId) || []
    history.unshift(run)
    
    // Keep only last 100 runs per schedule
    if (history.length > 100) {
      history.pop()
    }
    
    this.runHistory.set(scheduleId, history)
  }
}

// ============================================================
// Cron Parser & Scheduler
// ============================================================

/**
 * Simple cron expression parser and scheduler
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 */
class CronParser {
  /**
   * Parse a cron expression and check if it matches a given date
   */
  static matches(cronExpression: string, date: Date = new Date()): boolean {
    const fields = cronExpression.trim().split(/\s+/)
    
    if (fields.length !== 5 && fields.length !== 6) {
      console.error('Invalid cron expression:', cronExpression)
      return false
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
    
    return (
      this.matchesField(minute, date.getMinutes()) &&
      this.matchesField(hour, date.getHours()) &&
      this.matchesField(dayOfMonth, date.getDate()) &&
      this.matchesField(month, date.getMonth() + 1) &&
      this.matchesField(dayOfWeek, date.getDay())
    )
  }

  private static matchesField(field: string, value: number): boolean {
    if (field === '*') return true
    
    // Handle ranges (e.g., 1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number)
      return value >= start && value <= end
    }
    
    // Handle lists (e.g., 1,3,5)
    if (field.includes(',')) {
      const values = field.split(',').map(Number)
      return values.includes(value)
    }
    
    // Handle steps (e.g., */15)
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2))
      return value % step === 0
    }
    
    // Exact match
    return parseInt(field) === value
  }

  /**
   * Calculate next run time for a cron expression
   */
  static getNextRun(cronExpression: string, from: Date = new Date()): Date {
    const next = new Date(from)
    
    // Simple implementation: check every minute for the next hour
    // In production, use a proper cron library like node-cron
    for (let i = 0; i < 60 * 24 * 365; i++) {
      next.setMinutes(next.getMinutes() + 1)
      
      if (this.matches(cronExpression, next)) {
        return next
      }
    }
    
    throw new Error('Could not calculate next run time')
  }
}

// ============================================================
// Main Report Scheduler Class
// ============================================================

export class ReportScheduler {
  private static instance: ReportScheduler
  private store: ScheduleStore
  private timer: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private generator: ReportGenerator

  private constructor() {
    this.store = new ScheduleStore()
    this.generator = ReportGenerator.getInstance()
  }

  public static getInstance(): ReportScheduler {
    if (!ReportScheduler.instance) {
      ReportScheduler.instance = new ReportScheduler()
    }
    return ReportScheduler.instance
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running')
      return
    }

    this.isRunning = true
    console.log('Report Scheduler started')

    // Check every minute for due schedules
    this.timer = setInterval(() => this.checkAndExecuteSchedules(), 60000)

    // Also check immediately on start
    this.checkAndExecuteSchedules()
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isRunning = false
    console.log('Report Scheduler stopped')
  }

  /**
   * Manually trigger a scheduled report
   */
  async triggerSchedule(scheduleId: string): Promise<ScheduledRun> {
    const schedule = this.store.getSchedule(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    return this.executeSchedule(schedule)
  }

  /**
   * Get all schedules
   */
  getSchedules(): ScheduleConfig[] {
    return this.store.getAllSchedules()
  }

  /**
   * Get single schedule
   */
  getSchedule(id: string): ScheduleConfig | undefined {
    return this.store.getSchedule(id)
  }

  /**
   * Create new schedule
   */
  createSchedule(data: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): ScheduleConfig {
    return this.store.createSchedule(data)
  }

  /**
   * Update schedule
   */
  updateSchedule(id: string, updates: Partial<ScheduleConfig>): ScheduleConfig | null {
    return this.store.updateSchedule(id, updates)
  }

  /**
   * Delete schedule
   */
  deleteSchedule(id: string): boolean {
    return this.store.deleteSchedule(id)
  }

  /**
   * Toggle schedule enabled/disabled
   */
  toggleSchedule(id: string): ScheduleConfig | null {
    return this.store.toggleSchedule(id)
  }

  /**
   * Get run history for a schedule
   */
  getRunHistory(scheduleId: string, limit?: number): ScheduledRun[] {
    return this.store.getRunHistory(scheduleId, limit)
  }

  // ============================================================
  // Private Methods
  // ============================================================

  /**
   * Check all schedules and execute those that are due
   */
  private async checkAndExecuteSchedules(): Promise<void> {
    const now = new Date()
    const schedules = this.store.getAllSchedules()

    for (const schedule of schedules) {
      if (!schedule.enabled) continue

      try {
        if (CronParser.matches(schedule.cronExpression, now)) {
          console.log(`Executing schedule: ${schedule.name}`)
          await this.executeSchedule(schedule)
        }
      } catch (error) {
        console.error(`Error checking schedule ${schedule.id}:`, error)
      }
    }
  }

  /**
   * Execute a single schedule
   */
  private async executeSchedule(schedule: ScheduleConfig): Promise<ScheduledRun> {
    const startTime = Date.now()
    let run: ScheduledRun = {
      scheduleId: schedule.id,
      executedAt: new Date(),
      status: 'success'
    }

    try {
      // Calculate period based on report type
      const periodEnd = new Date()
      const periodStart = this.calculatePeriodStart(schedule.type, periodEnd)

      // Build full config
      const config: ReportConfig = {
        type: schedule.type,
        format: schedule.format,
        periodStart,
        periodEnd,
        includeCharts: schedule.config.includeCharts ?? true,
        includeRawData: schedule.config.includeRawData ?? false,
        language: schedule.config.language ?? 'en',
        branding: schedule.config.branding ?? {
          organizationName: 'Djezzy National SOC'
        }
      }

      // Gather data (in production, fetch from actual data sources)
      const data = await this.gatherReportData(schedule.type, periodStart, periodEnd)

      // Generate report
      const result = await this.generator.generateReport(data, config)
      
      run.reportId = result.metadata.id
      run.duration = Date.now() - startTime

      // Distribute report if configured
      await this.distributeResult(schedule, result.buffer, result.metadata)

      // Update schedule metadata
      this.store.updateSchedule(schedule.id, {
        lastRunAt: new Date(),
        nextRunAt: CronParser.getNextRun(schedule.cronExpression),
        lastStatus: 'success',
        runCount: schedule.runCount + 1
      })

    } catch (error) {
      run.status = 'failed'
      run.error = error instanceof Error ? error.message : 'Unknown error'
      run.duration = Date.now() - startTime

      console.error(`Schedule execution failed: ${schedule.name}`, error)

      this.store.updateSchedule(schedule.id, {
        lastRunAt: new Date(),
        lastStatus: 'failed'
      })
    }

    // Record run history
    this.store.addRunRecord(schedule.id, run)

    return run
  }

  /**
   * Calculate period start date based on report type
   */
  private calculatePeriodStart(type: ReportType, endDate: Date): Date {
    const start = new Date(endDate)

    switch (type) {
      case 'daily-operational':
        start.setDate(start.getDate() - 1)
        break
      case 'weekly-executive':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly-compliance':
      case 'incident-monthly':
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarterly-board':
        start.setMonth(start.getMonth() - 3)
        break
    }

    return start
  }

  /**
   * Gather report data from various sources
   * In production, this would query actual databases and APIs
   */
  private async gatherReportData(type: ReportType, start: Date, end: Date): Promise<any> {
    // Mock data generation - replace with actual API calls
    return {
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
        }
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
  }

  /**
   * Distribute generated report via configured channels
   */
  private async distributeResult(
    schedule: ScheduleConfig,
    buffer: Buffer,
    metadata: any
  ): Promise<void> {
    if (!schedule.distribution) return

    await distributeReport({
      buffer,
      metadata,
      email: schedule.distribution.email,
      slack: schedule.distribution.slack
    })
  }
}

// Export singleton instance
export const reportScheduler = ReportScheduler.getInstance()

export default ReportScheduler
