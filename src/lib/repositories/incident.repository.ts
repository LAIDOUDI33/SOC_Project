/**
 * National SOC Platform - Incident Repository
 * Algeria 2026-2030 | Incident Management
 * 
 * Handles incident lifecycle management:
 * - Creation from alerts or manual reporting
 * - Status tracking and SLA management
 * - Escalation chain management
 * - Telecom impact assessment (ARPT compliance)
 */

import { Prisma, db, PaginatedResult, PaginationParams } from '../db'
import { BaseRepository, BaseFilters } from './base.repository'
import { SOCError, ErrorCode } from '../errors'
import { 
  Incident, IncidentSeverity, IncidentStatus, IncidentType,
  ImpactLevel, TelecomImpact
} from '@prisma/client'

export interface IncidentFilters extends BaseFilters {
  severity?: IncidentSeverity | IncidentSeverity[]
  status?: IncidentStatus | IncidentStatus[]
  type?: IncidentType | IncidentType[]
  impactLevel?: ImpactLevel | ImpactLevel[]
  assignedTo?: string
  hasOpenTasks?: boolean
  isSlaBreached?: boolean
}

export interface IncidentCreateInput {
  title: string
  description: string
  type: IncidentType
  severity: IncidentSeverity
  impactLevel: ImpactLevel
  reportedBy: string
  sourceAlertIds?: string[]
  assets?: string[]
  telecomImpact?: Partial<TelecomImpact>
  evidence?: Array<{ type: string; description: string; filePath?: string }>
}

export interface IncidentTimelineEntry {
  action: string
  performedBy: string
  performedAt: Date
  details?: string
  metadata?: any
}

export class IncidentRepository extends BaseRepository<Incident> {
  constructor() {
    super('incident')
  }

  protected getSearchFields(): string[] {
    return ['title', 'description', 'incidentId', 'arptReference']
  }

  /**
   * Create a new incident with automatic ID generation and initialization
   */
  async createIncident(data: IncidentCreateInput): Promise<Incident> {
    try {
      // Generate unique incident ID (e.g., INC-2026-00123)
      const year = new Date().getFullYear()
      const count = await db.incident.count({
        where: {
          createdAt: { gte: new Date(year, 0, 1) }
        }
      })
      const incidentId = `INC-${year}-${String(count + 1).padStart(5, '0')}`

      // Generate ARPT reference for regulatory reporting
      const arptReference = `ARPT-${year}-${Date.now().toString(36).toUpperCase()}`

      return await db.incident.create({
        data: {
          incidentId,
          arptReference,
          title: data.title,
          description: data.description,
          type: data.type,
          severity: data.severity,
          impactLevel: data.impactLevel,
          reportedBy: data.reportedBy,
          telecomImpact: data.telecomImpact as any,
          timeline: [{
            action: 'INCIDENT_CREATED',
            performedBy: data.reportedBy,
            performedAt: new Date(),
            details: `Incident created: ${data.title}`
          }] as any,
          ...(data.assets?.length && {
            assets: { connect: data.assets.map(id => ({ id })) }
          }),
          ...(data.sourceAlertIds?.length && {
            alerts: { connect: data.sourceAlertIds.map(id => ({ id })) }
          })
        },
        include: {
          alerts: true,
          assets: true,
          tasks: true,
          assignee: true
        }
      })
    } catch (error) {
      throw this.handleError(error, 'createIncident')
    }
  }

  /**
   * Update incident status with timeline entry
   */
  async updateStatus(
    id: string,
    status: IncidentStatus,
    userId: string,
    reason?: string,
    metadata?: any
  ): Promise<Incident> {
    const incident = await this.findById(id)
    if (!incident) {
      throw new SOCError(ErrorCode.NOT_FOUND, 'Incident not found', { id })
    }

    const timelineEntry: IncidentTimelineEntry = {
      action: `STATUS_${status}`,
      performedBy: userId,
      performedAt: new Date(),
      details: reason ?? `Status changed to ${status}`,
      metadata
    }

    const updateData: any = {
      status,
      updatedBy: userId,
      timeline: { push: timelineEntry as any }
    }

    // Set timestamps based on status
    switch (status) {
      case 'DETECTED':
        updateData.detectedAt = new Date()
        break
      case 'TRIAGE':
        updateData.triageStartedAt = new Date()
        break
      case 'CONTAINMENT':
        updateData.containmentStartedAt = new Date()
        break
      case 'ERADICATION':
        updateData.eradicationStartedAt = new Date()
        break
      case 'RECOVERY':
        updateData.recoveryStartedAt = new Date()
        break
      case 'RESOLVED':
        updateData.resolvedAt = new Date()
        updateData.resolutionSummary = reason
        break
      case 'CLOSED':
        updateData.closedAt = new Date()
        break
      case 'ESCALATED':
        updateData.escalatedAt = new Date()
        break
    }

    return this.update(id, updateData, userId)
  }

  /**
   * Escalate incident to higher level
   */
  async escalate(
    id: string,
    escalationLevel: number,
    escalatedTo: string,
    escalatedBy: string,
    reason: string
  ): Promise<Incident> {
    const incident = await this.update(id, {
      escalationLevel,
      escalatedTo,
      escalatedAt: new Date(),
      status: 'ESCALATED',
      updatedBy: escalatedBy
    }, escalatedBy)

    // Add to timeline
    await db.incident.update({
      where: { id },
      data: {
        timeline: {
          push: {
            action: 'ESCALATED',
            performedBy: escalatedBy,
            performedAt: new Date(),
            details: `Escalated to level ${escalationLevel}: ${reason}`,
            metadata: { escalationLevel, escalatedTo }
          } as any
        }
      }
    })

    return incident
  }

  /**
   * Assign incident to analyst/responder
   */
  async assignTo(
    id: string,
    assigneeId: string,
    assignedBy: string
  ): Promise<Incident> {
    return this.update(id, {
      assignedTo: assigneeId,
      status: 'TRIAGE',
      updatedBy: assignedBy
    }, assignedBy)
  }

  /**
   * Add task to incident
   */
  async addTask(
    incidentId: string,
    task: {
      title: string
      description?: string
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      assignedTo?: string
      dueDate?: Date
    },
    createdBy: string
  ) {
    return db.task.create({
      data: {
        ...task,
        incidentId,
        createdBy,
        status: 'TODO'
      }
    })
  }

  /**
   * Get incidents with SLA breach risk
   */
  async getSlaBreachedIncidents(): Promise<Incident[]> {
    const now = new Date()
    
    // SLA thresholds by severity (in hours)
    const slaThresholds: Record<IncidentSeverity, number> = {
      CRITICAL: 4,
      HIGH: 8,
      MEDIUM: 24,
      LOW: 72
    }

    const breachedIncidents: Incident[] = []

    for (const [severity, threshold] of Object.entries(slaThresholds)) {
      const thresholdDate = new Date(now.getTime() - threshold * 60 * 60 * 1000)
      
      const incidents = await db.incident.findMany({
        where: {
          severity: severity as IncidentSeverity,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          detectedAt: { lte: thresholdDate },
          deletedAt: null
        },
        include: {
          assignee: true,
          tasks: true
        },
        orderBy: { detectedAt: 'asc' }
      })

      breachedIncidents.push(...incidents)
    }

    return breachedIncidents
  }

  /**
   * Generate ARPT regulatory report data
   */
  async generateArptReport(params: {
    startDate: Date
    endDate: Date
    types?: IncidentType[]
  }) {
    const { startDate, endDate, types } = params
    
    const where: Prisma.IncidentWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      deletedAt: null,
      ...(types && { type: { in: types } })
    }

    const [
      totalIncidents,
      bySeverity,
      byStatus,
      byType,
      resolvedCount,
      avgResolutionHours,
      telecomImpacts,
      arptReports
    ] = await Promise.all([
      db.incident.count({ where }),
      
      db.incident.groupBy({
        by: ['severity'],
        where,
        _count: true
      }),
      
      db.incident.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      
      db.incident.groupBy({
        by: ['type'],
        where,
        _count: true
      }),
      
      db.incident.count({ 
        where: { ...where, status: 'RESOLVED' } 
      }),
      
      // Average resolution time would need custom SQL
      
      db.incident.findMany({
        where: { ...where, telecomImpact: { not: null } },
        select: { telecomImpact: true }
      }),
      
      db.incident.findMany({
        where: { ...where, arptReported: true },
        select: { arptReference: true, reportedAtArpt: true, closedAt: true }
      })
    ])

    return {
      period: { startDate, endDate },
      summary: {
        totalIncidents,
        resolvedCount,
        resolutionRate: totalIncidents > 0 ? resolvedCount / totalIncidents : 0,
        avgResolutionHours: avgResolutionHours ?? 0
      },
      breakdowns: {
        bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
        byType: Object.fromEntries(byTypes.map(t => [t.type, t._count]))
      },
      telecomImpact: {
        subscribersAffected: telecomImpacts.reduce((sum, i) => 
          sum + (i.telecomImpact as any)?.subscribersAffected ?? 0, 0),
        servicesAffected: [...new Set(telecomImpacts.flatMap(i => 
          (i.telecomImpact as any)?.servicesAffected ?? []))]
      },
      arptCompliance: {
        totalReportable: totalIncidents,
        reportedToArpt: arptReports.length,
        pendingReport: totalIncidents - arptReports.length
      }
    }
  }

  /**
   * Add evidence to incident
   */
  async addEvidence(
    incidentId: string,
    evidence: {
      type: string
      description: string
      filePath?: string
      hash?: string
      collectedBy: string
    }
  ) {
    return db.incident.update({
      where: { id: incidentId },
      data: {
        evidence: {
          push: {
            ...evidence,
            collectedAt: new Date()
          } as any
        }
      }
    })
  }

  /**
   * Close incident with post-incident review
   */
  async closeIncident(
    id: string,
    userId: string,
    data: {
      resolutionSummary: string
      lessonsLearned?: string
      recommendations?: string
      rootCauseAnalysis?: string
      followUpActions?: string[]
    }
  ): Promise<Incident> {
    const incident = await this.updateStatus(id, 'CLOSED', userId, data.resolutionSummary, {
      lessonsLearned: data.lessonsLearned,
      recommendations: data.recommendations,
      rootCauseAnalysis: data.rootCauseAnalysis,
      followUpActions: data.followUpActions
    })

    // Mark as reported to ARPT if required
    if (['DATA_BREACH', 'SERVICE_DISRUPTION', 'FRAUD'].includes(incident.type)) {
      await this.update(id, { arptReported: true, reportedAtArpt: new Date() })
    }

    return incident
  }
}

// Export singleton instance
export const incidentRepository = new IncidentRepository()

export default IncidentRepository
