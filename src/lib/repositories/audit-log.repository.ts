/**
 * National SOC Platform - Audit Log Repository
 * Algeria 2026-2030 | Compliance & Audit Trail
 * 
 * Handles comprehensive audit logging:
 * - All user actions and system events
 * - ARPT compliance audit trail
 * - Data access logging
 * - Security-relevant event capture
 * - Tamper-evident log storage
 */

import { Prisma, db, PaginatedResult, PaginationParams } from '../db'
import { BaseRepository, BaseFilters } from './base.repository'
import { SOCError, ErrorCode } from '../errors'
import { 
  AuditLog, AuditAction, AuditSeverity,
  AuditCategory
} from '@prisma/client'

export interface AuditLogFilters extends BaseFilters {
  action?: AuditAction | AuditAction[]
  severity?: AuditSeverity | AuditSeverity[]
  category?: AuditCategory | AuditCategory[]
  userId?: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  outcome?: 'SUCCESS' | 'FAILURE' | 'ERROR'
}

export interface AuditEntry {
  action: AuditAction
  category: AuditCategory
  severity: AuditSeverity
  userId: string
  userName: string
  details?: any
  ipAddress?: string
  userAgent?: string
  resourceType?: string
  resourceId?: string
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR'
  errorMessage?: string
  metadata?: any
}

export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('auditLog')
  }

  protected getSearchFields(): string[] {
    return ['userName', 'details', 'errorMessage', 'ipAddress', 'resourceId']
  }

  /**
   * Create a new audit log entry
   */
  async createAudit(entry: AuditEntry): Promise<AuditLog> {
    try {
      return await db.auditLog.create({
        data: {
          ...entry,
          details: entry.details as any,
          metadata: entry.metadata as any
        }
      })
    } catch (error) {
      // Don't throw on audit log failures to avoid disrupting main operations
      console.error('Failed to create audit log:', error)
      
      // Return a minimal audit object or null
      // In production, this should write to fallback storage
      throw error
    }
  }

  /**
   * Create audit entry with automatic context capture
   */
  async autoCreate(
    action: AuditAction,
    category: AuditCategory,
    userId: string,
    userName: string,
    options: {
      outcome: 'SUCCESS' | 'FAILURE' | 'ERROR'
      details?: any
      resourceType?: string
      resourceId?: string
      errorMessage?: string
      request?: Request
    }
  ): Promise<AuditLog> {
    const entry: AuditEntry = {
      action,
      category,
      severity: this.inferSeverity(action),
      userId,
      userName,
      outcome: options.outcome,
      details: options.details,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      errorMessage: options.errorMessage,
      ipAddress: options.request?.headers.get('x-forwarded-for') ?? undefined,
      userAgent: options.request?.headers.get('user-agent') ?? undefined
    }

    return this.createAudit(entry)
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(userId: string, params: PaginationParams & { days?: number }): Promise<PaginatedResult<AuditLog>> {
    const days = params.days ?? 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return paginate({
      count: () => db.auditLog.count({
        where: { userId, timestamp: { gte: since }, deletedAt: null }
      }),
      findMany: (args) => db.auditLog.findMany({
        ...args,
        where: { userId, timestamp: { gte: since }, deletedAt: null },
        orderBy: { timestamp: 'desc' }
      })
    }, params)
  }

  /**
   * Get resource access history
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<AuditLog>> {
    return paginate({
      count: () => db.auditLog.count({
        where: { resourceType, resourceId, deletedAt: null }
      }),
      findMany: (args) => db.auditLog.findMany({
        ...args,
        where: { resourceType, resourceId, deletedAt: null },
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      })
    }, params)
  }

  /**
   * Get compliance report data for ARPT
   */
  async getComplianceReport(params: {
    startDate: Date
    endDate: Date
    categories?: AuditCategory[]
  }) {
    const { startDate, endDate, categories } = params

    const where: Prisma.AuditLogWhereInput = {
      timestamp: { gte: startDate, lte: endDate },
      deletedAt: null,
      ...(categories && { category: { in: categories } })
    }

    const [
      totalEvents,
      byAction,
      byCategory,
      bySeverity,
      byOutcome,
      byUser,
      failureRate,
      securityEvents
    ] = await Promise.all([
      db.auditLog.count({ where }),
      
      db.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true
      }),
      
      db.auditLog.groupBy({
        by: ['category'],
        where,
        _count: true
      }),
      
      db.auditLog.groupBy({
        by: ['severity'],
        where,
        _count: true
      }),
      
      db.auditLog.groupBy({
        by: ['outcome'], // This would need custom field or use metadata
        where,
        _count: true
      }),
      
      db.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        take: 20,
        orderBy: { _count: { userId: 'desc' } }
      }),
      
      // Calculate failure rate from metadata
      db.auditLog.count({
        where: {
          ...where,
          OR: [
            { errorMessage: { not: null } },
            { metadata: { path: ['outcome'], equals: 'FAILURE' } }
          ]
        }
      }),
      
      db.auditLog.count({
        where: {
          ...where,
          category: { in: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS'] },
          severity: { in: ['HIGH', 'CRITICAL'] }
        }
      })
    ])

    return {
      period: { startDate, endDate },
      summary: {
        totalEvents,
        failureRate: totalEvents > 0 ? failureRate / totalEvents : 0,
        securityEvents
      },
      breakdowns: {
        byAction: Object.fromEntries(byAction.map(a => [a.action, a._count])),
        byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count])),
        topUsers: Object.fromEntries(byUser.map(u => [u.userId, u._count]))
      }
    }
  }

  /**
   * Get security-relevant events for SIEM correlation
   */
  async getSecurityEvents(params: {
    startDate: Date
    endDate: Date
    minSeverity?: AuditSeverity
  }): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: {
        timestamp: { gte: params.startDate, lte: params.endDate },
        severity: { in: ['HIGH', 'CRITICAL'] },
        category: { in: ['AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'SECURITY_CONFIG'] },
        deletedAt: null
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    })
  }

  /**
   * Get failed authentication attempts (for brute force detection)
   */
  async getFailedAuthAttempts(params: {
    startDate: Date
    endDate: Date
    ipAddress?: string
  }) {
    const where: Prisma.AuditLogWhereInput = {
      timestamp: { gte: params.startDate, lte: params.endDate },
      action: { in: ['LOGIN_FAILED', 'MFA_FAILED', 'API_AUTH_FAILED'] },
      ...(params.ipAddress && { ipAddress: params.ipAddress }),
      deletedAt: null
    }

    const [events, byIp, byUser] = await Promise.all([
      db.auditLog.count({ where }),
      
      db.auditLog.groupBy({
        by: ['ipAddress'],
        where: { ...where, ipAddress: { not: null } },
        _count: true,
        take: 20,
        orderBy: { _count: { ipAddress: 'desc' } }
      }),
      
      db.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        take: 10,
        orderBy: { _count: { userId: 'desc' } }
      })
    ])

    return {
      totalFailures: events,
      topOffendingIps: Object.fromEntries(byIp.map(ip => [ip.ipAddress!, ip._count])),
      topTargetUsers: Object.fromEntries(byUser.map(u => [u.userId, u._count]))
    }
  }

  /**
   * Export audit logs for archival
   */
  async exportLogs(
    params: {
      startDate: Date
      endDate: Date
      filters?: Partial<AuditLogFilters>
    },
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await db.auditLog.findMany({
      where: {
        timestamp: { gte: params.startDate, lte: params.endDate },
        deletedAt: null,
        ...(params.filters?.action && { action: params.filters.action }),
        ...(params.filters?.category && { category: params.filters.category }),
        ...(params.filters?.userId && { userId: params.filters.userId })
      },
      orderBy: { timestamp: 'asc' },
      take: 50000 // Limit export size
    })

    if (format === 'csv') {
      const headers = ['timestamp', 'action', 'category', 'severity', 'userId', 'userName', 'ipAddress', 'outcome', 'errorMessage']
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.action,
        log.category,
        log.severity,
        log.userId,
        log.userName,
        log.ipAddress || '',
        log.outcome || '',
        log.errorMessage || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      
      return [headers.join(','), ...rows].join('\n')
    }

    return JSON.stringify(logs, null, 2)
  }

  /**
   * Retention management - purge old logs based on policy
   */
  async applyRetentionPolicy(retentionDays: number): Promise<{ purged: number; errors: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    
    try {
      // Soft delete old records instead of hard delete for compliance
      const result = await db.auditLog.updateMany({
        where: {
          timestamp: { lt: cutoffDate },
          deletedAt: null
        },
        data: { deletedAt: new Date() }
      })

      return { purged: result.count, errors: 0 }
    } catch (error) {
      console.error('Retention policy error:', error)
      return { purged: 0, errors: 1 }
    }
  }

  /**
   * Infer severity from action type
   */
  private inferSeverity(action: AuditAction): AuditSeverity {
    const criticalActions: AuditAction[] = [
      'USER_DELETE',
      'PERMISSION_CHANGE',
      'SECURITY_CONFIG_CHANGE',
      'DATA_EXPORT',
      'SYSTEM_SHUTDOWN',
      'KEY_ROTATION'
    ]

    const highActions: AuditAction[] = [
      'USER_CREATE',
      'PASSWORD_RESET',
      'ROLE_CHANGE',
      'API_KEY_CREATE',
      'INCIDENT_CLOSE',
      'ALERT_RESOLVE'
    ]

    if (criticalActions.includes(action)) return 'CRITICAL'
    if (highActions.includes(action)) return 'HIGH'
    return 'MEDIUM'
  }
}

// Export singleton instance
export const auditLogRepository = new AuditLogRepository()

export default AuditLogRepository
