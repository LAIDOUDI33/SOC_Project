/**
 * National SOC Platform - Threat Intelligence Repository
 * Algeria 2026-2030 | IOC & Threat Data Management
 * 
 * Handles threat intelligence operations:
 * - IOC (Indicators of Compromise) management
 * - Threat actor tracking
 * - TTP (Tactics, Techniques, Procedures) mapping
 * - MISP integration data
 * - Threat feed aggregation
 */

import { Prisma, db, PaginatedResult, PaginationParams } from '../db'
import { BaseRepository, BaseFilters } from './base.repository'
import { SOCError, ErrorCode } from '../errors'
import { 
  ThreatIntel, IocType, ThreatLevel, TtpCategory,
  ThreatActor, IntelSource
} from '@prisma/client'

export interface ThreatIntelFilters extends BaseFilters {
  iocType?: IocType | IocType[]
  threatLevel?: ThreatLevel | ThreatLevel[]
  source?: IntelSource | IntelSource[]
  threatActorId?: string
  ttpCategory?: TtpCategory | TtpCategory[]
  isActive?: boolean
  isVerified?: boolean
  tags?: string[]
}

export interface IocMatchResult {
  ioc: ThreatIntel
  matchedField: string
  matchedValue: string
  confidence: number
}

export class ThreatIntelRepository extends BaseRepository<ThreatIntel> {
  constructor() {
    super('threatIntel')
  }

  protected getSearchFields(): string[] {
    return ['value', 'description', 'tags', 'context']
  }

  /**
   * Create new IOC entry
   */
  async createIoc(data: {
    type: IocType
    value: string
    description?: string
    threatLevel: ThreatLevel
    source: IntelSource
    sourceUrl?: string
    threatActor?: string
    ttps?: TtpCategory[]
    tags?: string[]
    context?: any
    expiresAt?: Date
    createdBy: string
  }): Promise<ThreatIntel> {
    // Check for duplicates
    const existing = await this.findByValue(data.type, data.value)
    if (existing) {
      // Update existing instead of creating duplicate
      return this.update(existing.id, {
        lastSeen: new Date(),
        ...data.context && { context: data.context }
      })
    }

    return this.create({
      type: data.type,
      value: data.value.toLowerCase().trim(),
      description: data.description,
      threatLevel: data.threatLevel,
      source: data.source,
      sourceUrl: data.sourceUrl,
      threatActorName: data.threatActor,
      ttps: data.ttps as any,
      tags: data.tags as any,
      context: data.context as any,
      expiresAt: data.expiresAt,
      createdBy: data.createdBy
    }, data.createdBy)
  }

  /**
   * Find IOC by type and value
   */
  async findByValue(type: IocType, value: string): Promise<ThreatIntel | null> {
    try {
      return await db.threatIntel.findFirst({
        where: {
          type,
          value: value.toLowerCase().trim(),
          deletedAt: null
        }
      })
    } catch (error) {
      throw this.handleError(error, 'findByValue')
    }
  }

  /**
   * Match IOCs against provided data (for alert correlation)
   */
  async matchIocs(data: {
    ipAddresses?: string[]
    domains?: string[]
    urls?: string[]
    hashes?: string[]
    emails?: string[]
  }): Promise<IocMatchResult[]> {
    const matches: IocMatchResult[] = []

    // Match IP addresses
    if (data.ipAddresses?.length) {
      const ipMatches = await db.threatIntel.findMany({
        where: {
          type: { in: ['IPV4', 'IPV6'] },
          value: { in: data.ipAddresses.map(ip => ip.toLowerCase()) },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          deletedAt: null
        }
      })

      for (const ip of data.ipAddresses) {
        const match = ipMatches.find(m => m.value === ip.toLowerCase())
        if (match) {
          matches.push({
            ioc: match,
            matchedField: 'ipAddress',
            matchedValue: ip,
            confidence: match.confidence ?? 0.8
          })
        }
      }
    }

    // Match domains
    if (data.domains?.length) {
      const domainMatches = await db.threatIntel.findMany({
        where: {
          type: 'DOMAIN',
          value: { in: data.domains.map(d => d.toLowerCase()) },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          deletedAt: null
        }
      })

      for (const domain of data.domains) {
        const match = domainMatches.find(m => m.value === domain.toLowerCase())
        if (match) {
          matches.push({
            ioc: match,
            matchedField: 'domain',
            matchedValue: domain,
            confidence: match.confidence ?? 0.85
          })
        }
      }
    }

    // Match hashes
    if (data.hashes?.length) {
      const hashMatches = await db.threatIntel.findMany({
        where: {
          type: { in: ['MD5', 'SHA1', 'SHA256'] },
          value: { in: data.hashes.map(h => h.toLowerCase()) },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          deletedAt: null
        }
      })

      for (const hash of data.hashes) {
        const match = hashMatches.find(m => m.value === hash.toLowerCase())
        if (match) {
          matches.push({
            ioc: match,
            matchedField: 'hash',
            matchedValue: hash,
            confidence: match.confidence ?? 0.95
          })
        }
      }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence)

    return matches
  }

  /**
   * Bulk import IOCs from threat feeds
   */
  async bulkImportIocs(
    iocs: Array<{
      type: IocType
      value: string
      threatLevel: ThreatLevel
      source: IntelSource
      description?: string
    }>,
    importOptions?: {
      skipDuplicates?: boolean
      updateExisting?: boolean
      defaultExpiresInDays?: number
    }
  ): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    const batchSize = 50

    for (let i = 0; i < iocs.length; i += batchSize) {
      const batch = iocs.slice(i, i + batchSize)

      await db.$transaction(async (tx) => {
        for (const ioc of batch) {
          try {
            const existing = await tx.threatIntel.findFirst({
              where: {
                type: ioc.type,
                value: ioc.value.toLowerCase().trim()
              }
            })

            if (existing) {
              if (importOptions?.skipDuplicates) {
                skipped++
              } else if (importOptions?.updateExisting) {
                await tx.threatIntel.update({
                  where: { id: existing.id },
                  data: {
                    lastSeen: new Date(),
                    ...(ioc.threatLevel && { threatLevel: ioc.threatLevel }),
                    ...(ioc.description && { description: ioc.description })
                  }
                })
                updated++
              } else {
                skipped++
              }
            } else {
              await tx.threatIntel.create({
                data: {
                  type: ioc.type,
                  value: ioc.value.toLowerCase().trim(),
                  threatLevel: ioc.threatLevel,
                  source: ioc.source,
                  description: ioc.description,
                  isActive: true,
                  expiresAt: importOptions?.defaultExpiresInDays
                    ? new Date(Date.now() + importOptions.defaultExpiresInDays * 24 * 60 * 60 * 1000)
                    : undefined
                }
              })
              created++
            }
          } catch (error) {
            console.error('Bulk import error:', error)
            errors++
          }
        }
      })
    }

    return { created, updated, skipped, errors }
  }

  /**
   * Get threat statistics for dashboard
   */
  async getThreatStats(params: {
    startDate: Date
    endDate: Date
  }) {
    const { startDate, endDate } = params

    const [
      totalIocs,
      activeIocs,
      byType,
      byLevel,
      bySource,
      byTtp,
      topThreatActors,
      newlyCreated,
      expiringSoon
    ] = await Promise.all([
      db.threatIntel.count({ where: { deletedAt: null } }),
      
      db.threatIntel.count({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          deletedAt: null
        }
      }),
      
      db.threatIntel.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.threatIntel.groupBy({
        by: ['threatLevel'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.threatIntel.groupBy({
        by: ['source'],
        where: { deletedAt: null },
        _count: true
      }),
      
      // Would need JSONB query for TTPs
      
      db.threatIntel.groupBy({
        by: ['threatActorName'],
        where: { 
          threatActorName: { not: null },
          deletedAt: null 
        },
        _count: true,
        orderBy: { _count: { threatActorName: 'desc' } },
        take: 10
      }),
      
      db.threatIntel.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null
        }
      }),
      
      db.threatIntel.count({
        where: {
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          },
          isActive: true,
          deletedAt: null
        }
      })
    ])

    return {
      summary: {
        totalIocs,
        activeIocs,
        newlyCreatedThisPeriod: newlyCreated,
        expiringSoon
      },
      breakdowns: {
        byType: Object.fromEntries(byType.map(t => [t.type, t._count])),
        byLevel: Object.fromEntries(byLevel.map(l => [l.threatLevel, l._count])),
        bySource: Object.fromEntries(bySource.map(s => [s.source, s._count])),
        topThreatActors: Object.fromEntries(
          topThreatActors.map(t => [t.threatActorName!, t._count])
        )
      }
    }
  }

  /**
   * Get IOCs by threat actor
   */
  async getByThreatActor(threatActorName: string): Promise<ThreatIntel[]> {
    return db.threatIntel.findMany({
      where: {
        threatActorName: { contains: threatActorName, mode: 'insensitive' },
        isActive: true,
        deletedAt: null
      },
      orderBy: { lastSeen: 'desc' }
    })
  }

  /**
   * Update IOC confidence score
   */
  async updateConfidence(id: string, confidence: number): Promise<ThreatIntel> {
    if (confidence < 0 || confidence > 1) {
      throw new SOCError(ErrorCode.VALIDATION_ERROR, 'Confidence must be between 0 and 1')
    }
    
    return this.update(id, { confidence })
  }

  /**
   * Mark IOC as inactive/false positive
   */
  async deactivateIoc(id: string, reason: string): Promise<ThreatIntel> {
    return this.update(id, {
      isActive: false,
      falsePositive: true,
      falsePositiveReason: reason
    })
  }

  /**
   * Export IOCs in various formats
   */
  async exportIocs(filters?: Partial<ThreatIntelFilters>, format: 'json' | 'csv' | 'stix' = 'json'): Promise<string> {
    const iocs = await db.threatIntel.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(filters?.iocType && { type: Array.isArray(filters.iocType) ? { in: filters.iocType } : filters.iocType }),
        ...(filters?.threatLevel && { threatLevel: Array.isArray(filters.threatLevel) ? { in: filters.threatLevel } : filters.threatLevel })
      },
      take: 10000 // Limit export size
    })

    switch (format) {
      case 'csv':
        return this.formatAsCsv(iocs)
      case 'stix':
        return this.formatAsStix(iocs)
      default:
        return JSON.stringify(iocs, null, 2)
    }
  }

  private formatAsCsv(iocs: ThreatIntel[]): string {
    const headers = ['type', 'value', 'description', 'threatLevel', 'source', 'firstSeen', 'lastSeen']
    const rows = iocs.map(ioc => 
      [ioc.type, ioc.value, ioc.description || '', ioc.threatLevel, ioc.source, ioc.firstSeen.toISOString(), ioc.lastSeen.toISOString()]
        .map(field => `"${String(field).replace(/"/g, '""')}"`)
        .join(',')
    )
    return [headers.join(','), ...rows].join('\n')
  }

  private formatAsStix(iocs: ThreatIntel[]): string {
    // Simplified STIX 2.1 format
    const stixObjects = iocs.map(ioc => ({
      type: 'indicator',
      id: `indicator--${ioc.id}`,
      created: ioc.createdAt,
      modified: ioc.updatedAt,
      name: `${ioc.type}: ${ioc.value}`,
      pattern: `[ioc:value = '${ioc.value}']`,
      valid_from: ioc.firstSeen,
      labels: [ioc.threatLevel]
    }))
    
    return JSON.stringify({ objects: stixObjects }, null, 2)
  }
}

// Export singleton instance
export const threatIntelRepository = new ThreatIntelRepository()

export default ThreatIntelRepository
