/**
 * National SOC Platform - Asset Repository
 * Algeria 2026-2030 | Telecom Infrastructure Asset Management
 * 
 * Handles telecom-specific asset management:
 * - Core network elements (HLR, MSC, SGSN, GGSN)
 * - Radio Access Network (BTS, NodeB, eNodeB, gNodeB)
 * - IT infrastructure (servers, firewalls, routers)
 - Subscriber-facing systems (VAS, billing)
 * - ARPT asset registry compliance
 */

import { Prisma, db, PaginatedResult, PaginationParams } from '../db'
import { BaseRepository, BaseFilters } from './base.repository'
import { SOCError, ErrorCode } from '../errors'
import { 
  Asset, AssetType, AssetStatus, AssetCriticality,
  NetworkZone, TelecomAssetType
} from '@prisma/client'

export interface AssetFilters extends BaseFilters {
  type?: AssetType | AssetType[]
  status?: AssetStatus | AssetStatus[]
  criticality?: AssetCriticality | AssetCriticality[]
  zone?: NetworkZone | NetworkZone[]
  telecomType?: TelecomAssetType | TelecomAssetType[]
  operatorId?: string
  hasAlerts?: boolean
  isVulnerable?: boolean
}

export interface AssetCreateInput {
  name: string
  type: AssetType
  criticality: AssetCriticality
  ipAddress?: string
  macAddress?: string
  hostname?: string
  zone: NetworkZone
  location?: string
  operatorId?: string
  telecomType?: TelecomAssetType
  config?: any
  tags?: string[]
  createdBy: string
}

export class AssetRepository extends BaseRepository<Asset> {
  constructor() {
    super('asset')
  }

  protected getSearchFields(): string[] {
    return ['name', 'ipAddress', 'hostname', 'assetTag', 'serialNumber', 'location']
  }

  /**
   * Create new asset with validation
   */
  async createAsset(data: AssetCreateInput): Promise<Asset> {
    // Validate IP address uniqueness if provided
    if (data.ipAddress) {
      const existing = await this.findByIpAddress(data.ipAddress)
      if (existing) {
        throw new SOCError(
          ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
          'Asset with this IP address already exists',
          { ipAddress: data.ipAddress }
        )
      }
    }

    return this.create({
      ...data,
      config: data.config as any,
      tags: data.tags as any
    }, data.createdBy)
  }

  /**
   * Find asset by IP address
   */
  async findByIpAddress(ipAddress: string): Promise<Asset | null> {
    try {
      return await db.asset.findFirst({
        where: { ipAddress, deletedAt: null },
        include: { alerts: true, vulnerabilities: true }
      })
    } catch (error) {
      throw this.handleError(error, 'findByIpAddress')
    }
  }

  /**
   * Get assets by type (telecom or IT)
   */
  async findByType(type: AssetType): Promise<Asset[]> {
    return db.asset.findMany({
      where: { type, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get assets by telecom operator
   */
  async findByOperator(operatorId: string): Promise<Asset[]> {
    return db.asset.findMany({
      where: { operatorId, deletedAt: null },
      include: {
        alerts: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { alerts: true, vulnerabilities: true } }
      }
    })
  }

  /**
   * Get critical assets requiring monitoring
   */
  async getCriticalAssets(): Promise<Asset[]> {
    return db.asset.findMany({
      where: {
        criticality: { in: ['CRITICAL', 'HIGH'] },
        isActive: true,
        deletedAt: null
      },
      include: {
        alerts: {
          where: { status: 'NEW', orderBy: { severity: 'desc' }, take: 5 }
        },
        _count: { select: { alerts: true, vulnerabilities: true } }
      },
      orderBy: [{ criticality: 'desc' }, { name: 'asc' }]
    })
  }

  /**
   * Get vulnerable assets with open CVEs
   */
  async getVulnerableAssets(): Promise<Array<Asset & { vulnerabilityCount: number; maxSeverity: string }>> {
    const assets = await db.asset.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        vulnerabilities: {
          some: {
            status: 'OPEN',
            deletedAt: null
          }
        }
      },
      include: {
        vulnerabilities: {
          where: { status: 'OPEN', deletedAt: null }
        }
      }
    })

    return assets.map(asset => ({
      ...asset,
      vulnerabilityCount: asset.vulnerabilities.length,
      maxSeverity: asset.vulnerabilities.reduce((max, v) => {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        const current = severityOrder[v.severity as keyof typeof severityOrder] || 0
        const previous = severityOrder[max as keyof typeof severityOrder] || 0
        return current > previous ? v.severity : max
      }, 'LOW')
    })).sort((a, b) => b.vulnerabilityCount - a.vulnerabilityCount)
  }

  /**
   * Get asset inventory summary for dashboard
   */
  async getInventorySummary() {
    const [
      totalAssets,
      byType,
      byCriticality,
      byStatus,
      byZone,
      byOperator,
      withActiveAlerts,
      withVulnerabilities
    ] = await Promise.all([
      db.asset.count({ where: { deletedAt: null } }),
      
      db.asset.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.asset.groupBy({
        by: ['criticality'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.asset.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.asset.groupBy({
        by: ['zone'],
        where: { deletedAt: null },
        _count: true
      }),
      
      db.asset.groupBy({
        by: ['operatorId'],
        where: { operatorId: { not: null }, deletedAt: null },
        _count: true
      }),
      
      db.asset.count({
        where: {
          alerts: { some: { status: 'NEW', deletedAt: null } },
          deletedAt: null
        }
      }),
      
      db.asset.count({
        where: {
          vulnerabilities: { some: { status: 'OPEN', deletedAt: null } },
          deletedAt: null
        }
      })
    ])

    return {
      summary: {
        totalAssets,
        withActiveAlerts,
        withVulnerabilities
      },
      breakdowns: {
        byType: Object.fromEntries(byType.map(t => [t.type, t._count])),
        byCriticality: Object.fromEntries(byCriticality.map(c => [c.criticality, c._count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
        byZone: Object.fromEntries(byZone.map(z => [z.zone, z._count])),
        byOperator: Object.fromEntries(byOperator.map(o => [o.operatorId!, o._count]))
      }
    }
  }

  /**
   * Update asset status
   */
  async updateStatus(id: string, status: AssetStatus, reason?: string): Promise<Asset> {
    return this.update(id, {
      status,
      ...(reason && { notes: reason })
    })
  }

  /**
   * Record asset scan/discovery
   */
  async recordScan(
    id: string,
    scanData: {
      lastScannedAt: Date
      lastScannedBy: string
      osDetected?: string
      portsOpen?: number
      servicesRunning?: string[]
    }
  ): Promise<Asset> {
    return this.update(id, {
      lastScannedAt: scanData.lastScannedAt,
      lastScannedBy: scanData.lastScannedBy,
      ...(scanData.osDetected && { osDetected: scanData.osDetected }),
      ...(scanData.portsOpen !== undefined && { portsOpen: scanData.portsOpen }),
      ...(scanData.servicesRunning && { servicesRunning: scanData.servicesRunning as any })
    })
  }

  /**
   * Get assets by network zone
   */
  async getByZone(zone: NetworkZone): Promise<Asset[]> {
    return db.asset.findMany({
      where: { zone, isActive: true, deletedAt: null },
      orderBy: { criticality: 'desc' }
    })
  }

  /**
   * Search assets across all fields
   */
  async searchAssets(query: string, limit: number = 20): Promise<Asset[]> {
    return db.asset.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { ipAddress: { contains: query } },
          { hostname: { contains: query, mode: 'insensitive' } },
          { assetTag: { contains: query, mode: 'insensitive' } },
          { serialNumber: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } }
        ],
        deletedAt: null
      },
      take: limit,
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Bulk import assets from discovery tools
   */
  async bulkImport(assets: Array<Omit<AssetCreateInput, 'createdBy'>>, createdBy: string) {
    let created = 0
    let updated = 0
    let errors = 0

    for (const asset of assets) {
      try {
        // Check if asset exists by IP or hostname
        const existing = asset.ipAddress 
          ? await this.findByIpAddress(asset.ipAddress)
          : null

        if (existing) {
          await this.update(existing.id, { ...asset, updatedBy: createdBy })
          updated++
        } else {
          await this.createAsset({ ...asset, createdBy })
          created++
        }
      } catch (error) {
        console.error('Asset import error:', error)
        errors++
      }
    }

    return { created, updated, errors }
  }
}

// Export singleton instance
export const assetRepository = new AssetRepository()

export default AssetRepository
