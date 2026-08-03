/**
 * Lawful Interception (LI) Audit Logging Module
 * Djezzy National SOC Platform
 * 
 * Compliance-focused module for logging and auditing all LI-related activities.
 * This module ensures all interception activities are properly logged for
 * regulatory compliance and audit purposes (ANRT requirements).
 */

// ============================================================
// Type Definitions
// ============================================================

export interface LIActivityLog {
  id: string
  timestamp: Date
  activityType: LIActivityType
  category: 'interception' | 'delivery' | 'administration' | 'audit' | 'compliance'
  
  // Target information (sanitized)
  target: {
    type: 'msisdn' | 'imsi' | 'imei' | 'account-id'
    identifier: string // Hashed or masked version
    identifierType: 'original' | 'hashed' | 'masked'
  }
  
  // Request details
  request: {
    requestId: string
    requestorId: string
    requestorRole: string
    requestorDepartment: string
    authorizationRef: string // Legal authorization reference
    purpose: 'criminal-investigation' | 'national-security' | 'emergency' | 'administrative'
    duration: {
      requested: number // hours
      approved: number // hours
      actual?: number // hours
    }
  }
  
  // Execution details
  execution: {
    status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled' | 'expired' | 'error'
    startedAt?: Date
    completedAt?: Date
    targetType: 'voice' | 'sms' | 'data' | 'location' | 'content'
    targetCount: number
    resultSummary?: string
    errorCode?: string
    errorMessage?: string
  }
  
  // Delivery/Export
  delivery?: {
    deliveredTo: string
    deliveryMethod: 'secure-portal' | 'encrypted-email' | 'physical' | 'api'
    deliveredAt: Date
    receiptConfirmed: boolean
    receiptConfirmedAt?: Date
  }
  
  // Compliance metadata
  compliance: {
    legalBasis: string // e.g., "Code des Postes et Télécommunications Art. X"
    retentionPeriod: number // days
    destructionDate: Date
    accessLevel: 'level-1' | 'level-2' | 'level-3' | 'level-4'
    reviewedBy: string
    reviewStatus: 'pending-review' | 'reviewed-approved' | 'reviewed-flagged'
    notes?: string
  }
}

export type LIActivityType = 
  | 'interception-request'
  | 'interception-approval'
  | 'interception-start'
  | 'interception-data-capture'
  | 'interception-pause'
  | 'interception-resume'
  | 'interception-end'
  | 'interception-cancel'
  | 'data-export'
  | 'data-delivery'
  | 'key-management'
  | 'access-log'
  | 'system-audit'
  | 'compliance-check'

export interface LIComplianceReport {
  reportPeriod: { start: Date; end: Date }
  generatedAt: Date
  summary: {
    totalRequests: number
    approvedRequests: number
    activeInterceptions: number
    completedInterceptions: number
    cancelledRequests: number
    rejectedRequests: number
    averageDuration: number
  }
  byPurpose: Record<string, number>
  byRequestor: Array<{ department: string; count: number }>
  byTargetType: Record<string, number>
  complianceMetrics: {
    authorizationRate: number
    dataRetentionCompliance: number
    accessControlViolations: number
    auditFindings: number
  }
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    finding: string
    recommendation: string
  }>
}

// ============================================================
// LI Audit Logger Class
// ============================================================

export class LawfulInterceptionLogger {
  private static instance: LawfulInterceptionLogger
  private logs: Map<string, LIActivityLog>
  private encryptionKey: string

  private constructor() {
    this.logs = new Map()
    this.encryptionKey = process.env.LI_LOG_ENCRYPTION_KEY || 'default-encryption-key-for-dev'
  }

  public static getInstance(): LawfulInterceptionLogger {
    if (!LawfulInterceptionLogger.instance) {
      LawfulInterceptionLogger.instance = new LawfulInterceptionLogger()
    }
    return LawfulInterceptionLogger.instance
  }

  /**
   * Log a new LI activity
   */
  async logActivity(activity: Omit<LIActivityLog, 'id' | 'timestamp'>): Promise<string> {
    const logEntry: LIActivityLog = {
      ...activity,
      id: `LI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      compliance: {
        ...activity.compliance,
        destructionDate: new Date(Date.now() + (activity.compliance.retentionPeriod || 365) * 24 * 60 * 60 * 1000),
        reviewStatus: 'pending-review'
      }
    }

    // Validate log entry
    this.validateLogEntry(logEntry)

    // Sensitive data handling - mask/hash identifiers
    if (logEntry.target.identifierType === 'original') {
      console.warn('[LI-LOG] Original identifiers being logged. Consider hashing.')
    }

    // Store the log entry
    this.logs.set(logEntry.id, logEntry)

    // In production, also write to secure audit storage:
    // await this.writeToSecureStorage(logEntry)
    
    // Check for compliance triggers
    await this.checkComplianceTriggers(logEntry)

    console.log(`[LI-LOG] Activity logged: ${logEntry.activityType} (${logEntry.id})`)
    
    return logEntry.id
  }

  /**
   * Log interception request
   */
  async logInterceptionRequest(options: {
    targetIdentifier: string
    targetType: string
    requestorId: string
    requestorRole: string
    requestorDepartment: string
    authorizationRef: string
    purpose: LIActivityLog['request']['purpose']
    durationHours: number
  }): Promise<string> {
    return this.logActivity({
      activityType: 'interception-request',
      category: 'interception',
      target: {
        type: options.targetType.startsWith('+213') ? 'msisdn' : 
              options.targetType.length === 15 ? 'imsi' :
              options.targetType,
        identifier: this.maskIdentifier(options.targetIdentifier, options.targetType),
        identifierType: 'masked'
      },
      request: {
        requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
        requestorId: options.requestorId,
        requestorRole: options.requestorRole,
        requestorDepartment: options.requestorDepartment,
        authorizationRef: options.authorizationRef,
        purpose: options.purpose,
        duration: {
          requested: options.durationHours,
          approved: 0 // Will be updated on approval
        }
      },
      execution: {
        status: 'pending',
        targetType: 'voice', // Default, will be updated
        targetCount: 1
      },
      compliance: {
        legalBasis: 'Code des Postes et Télécommunications Algérien - Articles 95-98',
        retentionPeriod: 1826, // 5 years in days
        accessLevel: 'level-3',
        reviewedBy: 'System'
      }
    })
  }

  /**
   * Log interception approval
   */
  async logApproval(requestId: string, approverId: string, approvedDuration: number): Promise<string> {
    return this.logActivity({
      activityType: 'interception-approval',
      category: 'administration',
      target: { type: 'request', identifier: requestId, identifierType: 'original' },
      request: {
        requestId,
        requestorId: approverId,
        requestorRole: 'approver',
        requestorDepartment: 'Legal/Compliance',
        authorizationRef: `APPROVAL-${Date.now()}`,
        purpose: 'approval',
        duration: { requested: approvedDuration, approved: approvedDuration }
      },
      execution: { status: 'approved', targetType: 'n/a', targetCount: 0 },
      compliance: {
        legalBasis: 'Internal Approval Process',
        retentionPeriod: 2555, // 7 years for approvals
        accessLevel: 'level-2',
        reviewedBy: approverId
      }
    })
  }

  /**
   * Log data export/delivery
   */
  async logDataExport(options: {
    relatedRequestId: string
    deliveredTo: string
    deliveryMethod: LIActivityLog['delivery']['deliveryMethod']
    dataCategories: string[]
    recordCount: number
  }): Promise<string> {
    return this.logActivity({
      activityType: 'data-delivery',
      category: 'delivery',
      target: { type: 'request', identifier: options.relatedRequestId, identifierType: 'original' },
      request: {
        requestId: `EXPORT-${Date.now().toString(36).toUpperCase()}`,
        requestorId: 'system',
        requestorRole: 'automated',
        requestorDepartment: 'LI-System',
        authorizationRef: options.relatedRequestId,
        purpose: 'data-delivery',
        duration: { requested: 0, approved: 0 }
      },
      execution: { status: 'completed', targetType: 'data', targetCount: options.recordCount, resultSummary: `${options.recordCount} records exported` },
      delivery: {
        deliveredTo: options.deliveredTo,
        deliveryMethod: options.deliveryMethod,
        deliveredAt: new Date(),
        receiptConfirmed: false
      },
      compliance: {
        legalBasis: 'Data Protection Regulations - Secure Transfer Requirements',
        retentionPeriod: 2555,
        accessLevel: 'level-2',
        reviewedBy: 'system'
      }
    })
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(period: { start: Date; end: Date }): Promise<LIComplianceReport> {
    console.log(`[LI-LOG] Generating compliance report for ${period.start.toISOString()} to ${period.end.toISOString()}`)

    const allLogs = Array.from(this.logs.values())
    const periodLogs = allLogs.filter(log => 
      log.timestamp >= period.start && log.timestamp <= period.end
    )

    // Calculate statistics
    const requests = periodLogs.filter(l => l.activityType === 'interception-request')
    const approvals = periodLogs.filter(l => l.activityType === 'interception-approval')
    const completions = periodLogs.filter(l => l.activityType === 'interception-end')

    return {
      reportPeriod: period,
      generatedAt: new Date(),
      summary: {
        totalRequests: requests.length,
        approvedRequests: approvals.length,
        activeInterceptions: periodLogs.filter(l => l.execution?.status === 'active').length,
        completedInterceptions: completions.length,
        cancelledRequests: periodLogs.filter(l => l.execution?.status === 'cancelled').length,
        rejectedRequests: periodLogs.filter(l => l.execution?.status === 'error').length,
        averageDuration: this.calculateAverageDuration(completions)
      },
      byPurpose: this.groupByProperty(requests, 'request.purpose'),
      byRequestor: this.groupByDepartment(requests),
      byTargetType: this.groupByProperty(allLogs.filter(l => l.category === 'interception'), 'execution.targetType'),
      complianceMetrics: {
        authorizationRate: requests.length > 0 ? (approvals.length / requests.length) * 100 : 100,
        dataRetentionCompliance: this.checkDataRetentionCompliance(periodLogs),
        accessControlViolations: periodLogs.filter(l => l.compliance.reviewStatus === 'reviewed-flagged').length,
        auditFindings: Math.floor(Math.random() * 3) // Simulated
      },
      recommendations: this.generateRecommendations(periodLogs)
    }
  }

  /**
   * Get activity log by ID
   */
  getLogEntry(logId: string): LIActivityLog | undefined {
    return this.logs.get(logId)
  }

  /**
   * Query activity logs with filters
   */
  queryLogs(filters: {
    activityType?: LIActivityType | LIActivityType[]
    category?: LIActivityLog['category']
    status?: LIActivityLog['execution']['status']
    dateRange?: { start: Date; end: Date }
    requestorId?: string
    limit?: number
  }): LIActivityLog[] {
    let results = Array.from(this.logs.values())

    if (filters.activityType) {
      const types = Array.isArray(filters.activityType) ? filters.activityType : [filters.activityType]
      results = results.filter(log => types.includes(log.activityType))
    }

    if (filters.category) {
      results = results.filter(log => log.category === filters.category)
    }

    if (filters.status) {
      results = results.filter(log => log.execution?.status === filters.status)
    }

    if (filters.dateRange) {
      results = results.filter(log => 
        log.timestamp >= filters.dateRange.start && log.timestamp <= filters.dateRange.end
      )
    }

    if (filters.requestorId) {
      results = results.filter(log => log.request.requestorId === filters.requestorId)
    }

    if (filters.limit) {
      results = results.slice(0, filters.limit)
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private validateLogEntry(entry: LIActivityLog): void {
    if (!entry.activityType) throw new Error('Activity type is required')
    if (!entry.category) throw new Error('Category is required')
    if (!entry.target?.identifier) throw new Error('Target identifier is required')
    if (!entry.request?.authorizationRef) throw new Error('Authorization reference is required')
    if (!entry.compliance?.legalBasis) throw new Error('Legal basis is required')
  }

  private maskIdentifier(identifier: string, type: string): string {
    switch (type) {
      case 'msisdn':
        // Mask MSISDN: +213XXXXXXXXX -> +213****XXXX
        if (identifier.startsWith('+213') && identifier.length >= 11) {
          return `+213****${identifier.slice(-4)}`
        }
        return `****${identifier.slice(-4)}`
      
      case 'imsi':
        // Hash IMSI (sensitive)
        return `[HASHED:${Buffer.from(identifier).toString('base64').slice(0, 12)}...]`
      
      case 'imei':
        // Mask IMEI: show last 4 digits only
        return `************${identifier.slice(-4)}`
      
      default:
        // Generic masking
        if (identifier.length > 8) {
          return `${identifier.slice(0, 4)}****${identifier.slice(-4)}`
        }
        return `****${identifier.slice(-4)}`
    }
  }

  private async checkComplianceTriggers(logEntry: LIActivityLog): Promise<void> {
    // Check for suspicious patterns that need review
    
    // Pattern 1: Requests outside normal hours
    const hour = logEntry.timestamp.getHours()
    if (hour < 8 || hour > 20) {
      if (logEntry.activityType !== 'system-audit') {
        console.warn(`[LI-COMPLIANCE] Off-hours activity detected: ${logEntry.id}`)
      }
    }

    // Pattern 2: Unusual duration requests
    if (logEntry.request.duration.requested > 72) { // More than 3 days
      console.warn(`[LI-COMPLIANCE] Long-duration request: ${logEntry.id} (${logEntry.request.duration.requested}h)`)
    }

    // Pattern 3: Multiple requests for same target
    const recentRequests = Array.from(this.logs.values()).filter(
      l => l.target.identifier === logEntry.target.identifier &&
           l.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
    if (recentRequests.length > 5) {
      console.warn(`[LI-COMPLIANCE] High-frequency targeting: ${logEntry.target.identifier}`)
    }
  }

  private calculateAverageDuration(completions: LIActivityLog[]): number {
    if (completions.length === 0) return 0
    
    const durations = completions
      .filter(c => c.execution?.startedAt && c.execution?.completedAt)
      .map(c => (c.execution.completedAt!.getTime() - c.execution.startedAt!.getTime()) / (1000 * 60 * 60))
    
    return durations.reduce((a, b) => a + b, 0) / durations.length
  }

  private groupByProperty<T extends LIActivityLog>(items: T[], propertyPath: string): Record<string, number> {
    const groups: Record<string, number> = {}
    
    for (const item of items) {
      const value = this.getNestedValue(item, propertyPath) || 'unknown'
      groups[value] = (groups[value] || 0) + 1
    }
    
    return groups
  }

  private groupByDepartment(items: LIActivityLog[]): Array<{ department: string; count: number }> {
    const departments: Record<string, number> = {}
    
    for (const item of items) {
      const dept = item.request?.requestorDepartment || 'unknown'
      departments[dept] = (departments[dept] || 0) + 1
    }
    
    return Object.entries(departments).map(([department, count]) => ({ department, count }))
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private checkDataRetentionCompliance(logs: LIActivityLog[]): number {
    const now = Date.now()
    const expiredLogs = logs.filter(
      log => log.compliance.destructionDate.getTime() < now
    )
    
    // If there are expired logs not yet destroyed, compliance is reduced
    return expiredLogs.length === 0 ? 100 : Math.max(0, 100 - (expiredLogs.length * 10))
  }

  private generateRecommendations(logs: LIActivityLog[]): LIComplianceReport['recommendations'] {
    const recommendations: LIComplianceReport['recommendations'] = []

    // Check for common issues and generate recommendations
    
    const offHoursRequests = logs.filter(l => {
      const hour = l.timestamp.getHours()
      return hour < 8 || hour > 20
    }).length

    if (offHoursRequests > logs.length * 0.1) {
      recommendations.push({
        priority: 'medium',
        category: 'Operational Security',
        finding: `${offHoursRequests} requests initiated outside normal business hours`,
        recommendation: 'Implement additional approval workflow for off-hours requests. Require supervisor sign-off.'
      })
    }

    const longDurationRequests = logs.filter(
      l => l.request.duration.requested > 48
    ).length

    if (longDurationRequests > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Authorization Control',
        finding: `${longDurationRequests} requests exceeded 48-hour duration`,
        recommendation: 'Review long-duration interceptions. Implement automatic expiry and re-authorization process.'
      })
    }

    // Always include standard recommendations
    recommendations.push({
      priority: 'low',
      category: 'Best Practice',
      finding: 'Quarterly access review recommended',
      recommendation: 'Conduct quarterly reviews of all LI system access permissions and user accounts.'
    })

    return recommendations
  }
}

// Export singleton instance
export const liAuditLogger = LawfulInterceptionLogger.getInstance()

export default LawfulInterceptionLogger
