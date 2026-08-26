/**
 * National SOC Platform - Cache Helpers
 * Algeria 2026-2030 | Common Caching Patterns
 * 
 * Pre-built caching functions for:
 * - Alert data caching
 * - Incident data caching
 * - Dashboard KPIs
 * - Telecom protocol statistics
 * - Session management
 */

import { db } from '../db'
import { alertRepository } from '../repositories/alert.repository'
import { incidentRepository } from '../repositories/incident.repository'
import {
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheGetOrSet,
  CACHE_TTL,
  KEY_PREFIXES,
  type CacheOptions,
  type CacheResult
} from '../redis'

// ===========================================
// Alert Caching Functions
// ===========================================

export interface AlertListParams {
  page?: number
  limit?: number
  severity?: string
  status?: string
  source?: string
}

/**
 * Get cached alerts list or fetch from database
 */
export async function getCachedAlerts(params: AlertListParams = {}): Promise<CacheResult> {
  const key = `list:${JSON.stringify(params)}`
  
  return cacheGetOrSet(
    key,
    async () => {
      const [alerts, total] = await Promise.all([
        db.alert.findMany({
          where: buildAlertWhereClause(params),
          orderBy: { timestamp: 'desc' },
          skip: ((params.page || 1) - 1) * (params.limit || 50),
          take: Math.min(params.limit || 50, 100),
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          }
        }),
        db.alert.count({ where: buildAlertWhereClause(params) })
      ])
      
      return {
        alerts,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 50,
          total,
          totalPages: Math.ceil(total / (params.limit || 50))
        }
      }
    },
    {
      ttl: CACHE_TTL.ALERTS_LIVE,
      swr: true,
      swrTtl: CACHE_TTL.ALERTS_LIVE * 2,
      prefix: KEY_PREFIXES.ALERTS
    }
  )
}

/**
 * Get cached alert statistics for dashboard
 */
export async function getCachedAlertStats(timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'): Promise<CacheResult> {
  const now = new Date()
  const startDate = getStartDateFromRange(now, timeRange)
  const key = `stats:${timeRange}`
  
  return cacheGetOrSet(
    key,
    () => alertRepository.getAggregation({
      startDate,
      endDate: now,
      groupBy: timeRange === '7d' || timeRange === '30d' ? 'day' : 'hour'
    }),
    {
      ttl: CACHE_TTL.ALERTS_STATS,
      swr: true,
      swrTtl: CACHE_TTL.ALERTS_STATS * 3,
      prefix: KEY_PREFIXES.ALERTS
    }
  )
}

/**
 * Get alerts needing attention (SLA breach risk)
 */
export async function getCachedAlertsNeedingAttention(): Promise<CacheResult> {
  return cacheGetOrSet(
    'needing-attention',
    () => alertRepository.getAlertsNeedingAttention(),
    {
      ttl: CACHE_TTL.ALERTS_LIVE,
      prefix: KEY_PREFIXES.ALERTS
    }
  )
}

/**
 * Invalidate alert caches after mutations
 */
export async function invalidateAlertCaches(alertId?: string): Promise<void> {
  const redis = getRedisClient()
  
  if (alertId) {
    await redis.delete([`alerts:${alertId}`, 'alerts:list:*'], KEY_PREFIXES.ALERTS)
  } else {
    // Invalidate all alert-related caches
    await redis.clearPattern(`${KEY_PREFIXES.ALERTS}:*`)
  }
  
  // Also invalidate dashboard since it shows alert counts
  await redis.clearPattern(`${KEY_PREFIXES.DASHBOARD}:kpi*`)
}

// ===========================================
// Incident Caching Functions
// ===========================================

export interface IncidentListParams {
  page?: number
  limit?: number
  status?: string
  severity?: string
  type?: string
}

/**
 * Get cached incidents list
 */
export async function getCachedIncidents(params: IncidentListParams = {}): Promise<CacheResult> {
  const key = `list:${JSON.stringify(params)}`
  
  return cacheGetOrSet(
    key,
    async () => {
      const where: Record<string, unknown> = {}
      
      if (params.status) where.status = params.status
      if (params.severity) where.severity = params.severity
      if (params.type) where.type = params.type
      
      const [incidents, total] = await Promise.all([
        db.incident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: ((params.page || 1) - 1) * (params.limit || 20),
          take: Math.min(params.limit || 20, 50),
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            alerts: { select: { id: true, severity: true, title: true }, take: 5 }
          }
        }),
        db.incident.count({ where })
      ])
      
      return {
        incidents,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total,
          totalPages: Math.ceil(total / (params.limit || 20))
        }
      }
    },
    {
      ttl: CACHE_TTL.INCIDENTS_ACTIVE,
      swr: true,
      swrTtl: CACHE_TTL.INCIDENTS_ACTIVE * 2,
      prefix: KEY_PREFIXES.INCIDENTS
    }
  )
}

/**
 * Get cached SLA breach incidents
 */
export async function getCachedSlaBreaches(): Promise<CacheResult> {
  return cacheGetOrSet(
    'sla-breaches',
    () => incidentRepository.getSlaBreachedIncidents(),
    {
      ttl: CACHE_TTL.DASHBOARD_KPI,
      prefix: KEY_PREFIXES.INCIDENTS
    }
  )
}

/**
 * Invalidate incident caches
 */
export async function invalidateIncidentCaches(incidentId?: string): Promise<void> {
  const redis = getRedisClient()
  
  if (incidentId) {
    await redis.delete([`incidents:${incidentId}`, 'incidents:list:*'], KEY_PREFIXES.INCIDENTS)
  } else {
    await redis.clearPattern(`${KEY_PREFIXES.INCIDENTS}:*`)
  }
  
  await redis.clearPattern(`${KEY_PREFIXES.DASHBOARD}:*`)
}

// ===========================================
// Dashboard & KPI Caching
// ===========================================

interface DashboardKPIs {
  totalAlerts: number
  criticalAlerts: number
  openIncidents: number
  slaBreaches: number
  activeThreats: number
  subscribersMonitored: number
  uptime: number
  lastUpdated: Date
}

/**
 * Get cached dashboard KPIs (most frequently accessed endpoint)
 */
export async function getCachedDashboardKPIs(): Promise<CacheResult<DashboardKPIs>> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return cacheGetOrSet<DashboardKPIs>(
    'main-kpi',
    async () => {
      const [
        totalAlerts,
        criticalAlerts,
        openIncidents,
        activeThreats,
        subscribersMonitored
      ] = await Promise.all([
        db.alert.count({ 
          where: { timestamp: { gte: todayStart }, deletedAt: null } 
        }),
        db.alert.count({ 
          where: { 
            severity: 'CRITICAL', 
            status: { in: ['NEW', 'ACKNOWLEDGED'] },
            deletedAt: null 
          } 
        }),
        db.incident.count({ 
          where: { 
            status: { notIn: ['RESOLVED', 'CLOSED'] },
            deletedAt: null 
          } 
        }),
        db.indicator.count({ where: { isActive: true } }),
        // Mock subscriber count (would come from telecom systems)
        Promise.resolve(45000000 + Math.floor(Math.random() * 1000000))
      ])
      
      // Calculate SLA breaches
      const slaBreaches = await incidentRepository.getSlaBreachedIncidents()
      
      return {
        totalAlerts,
        criticalAlerts,
        openIncidents,
        slaBreaches: slaBreaches.length,
        activeThreats,
        subscribersMonitored,
        uptime: 99.95 + Math.random() * 0.04, // Mock uptime
        lastUpdated: new Date()
      }
    },
    {
      ttl: CACHE_TTL.DASHBOARD_KPI,
      swr: true,
      swrTtl: CACHE_TTL.DASHBOARD_KPI * 2,
      prefix: KEY_PREFIXES.DASHBOARD
    }
  )
}

/**
 * Get cached timeline data for charts
 */
export async function getCachedTimelineData(
  period: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
  groupBy: 'hour' | 'day' | 'week' = 'hour'
): Promise<CacheResult> {
  const now = new Date()
  const startDate = getStartDateFromRange(now, period)
  const key = `timeline:${period}:${groupBy}`
  
  return cacheGetOrSet(
    key,
    async () => {
      const results = await db.$queryRaw<Array<{ timestamp: Date; count: number; severity: string }>>`
        SELECT 
          date_trunc(${groupBy}, "timestamp") as timestamp,
          COUNT(*) as count,
          COALESCE(severity, 'unknown') as severity
        FROM "alerts"
        WHERE "timestamp" >= ${startDate} 
          AND "timestamp" <= ${now}
          AND "deleted_at" IS NULL
        GROUP BY date_trunc(${groupBy}, "timestamp"), severity
        ORDER BY timestamp ASC
      `
      
      return results
    },
    {
      ttl: CACHE_TTL.DASHBOARD_KPI,
      prefix: KEY_PREFIXES.DASHBOARD
    }
  )
}

/**
 * Invalidate all dashboard caches
 */
export async function invalidateDashboardCaches(): Promise<void> {
  const redis = getRedisClient()
  await redis.clearPattern(`${KEY_PREFIXES.DASHBOARD}:*`)
}

// ===========================================
// Threat Intelligence Caching
// ===========================================

/**
 * Get cached threat indicators
 */
export async function getCachedThreatIndicators(params: {
  type?: string
  isActive?: boolean
  limit?: number
} = {}): Promise<CacheResult> {
  const key = `indicators:${JSON.stringify(params)}`
  
  return cacheGetOrSet(
    key,
    () => db.indicator.findMany({
      where: {
        ...(params.type && { type: params.type }),
        ...(params.isActive !== undefined && { isActive: params.isActive })
      },
      take: params.limit || 100,
      orderBy: { createdAt: 'desc' }
    }),
    {
      ttl: CACHE_TTL.THREAT_INTEL,
      swr: true,
      swrTtl: CACHE_TTL.THREAT_INTEL * 4,
      prefix: KEY_PREFIXES.THREATS
    }
  )
}

/**
 * Get cached IOCs (Indicators of Compromise)
 */
export async function getCachedIOCs(): Promise<CacheResult> {
  return cacheGetOrSet(
    'iocs-list',
    () => db.iOC.findMany({
      where: { isActive: true },
      take: 500,
      orderBy: { lastSeen: 'desc' }
    }),
    {
      ttl: CACHE_TTL.THREAT_INTEL,
      prefix: KEY_PREFIXES.THREATS
    }
  )
}

/**
 * Invalidate threat intel caches
 */
export async function invalidateThreatCaches(): Promise<void> {
  const redis = getRedisClient()
  await redis.clearPattern(`${KEY_PREFIXES.THREATS}:*`)
}

// ===========================================
// Telecom-Specific Caching
// ===========================================

interface SubscriberInfo {
  msisdn: string
  imsi?: string
  operator: string
  status: 'active' | 'inactive' | 'suspended' | 'roaming'
  lastLocation?: string
  pdpContextActive: boolean
}

/**
 * Get cached subscriber information (high-frequency lookups)
 */
export async function getCachedSubscriber(msisdn: string): Promise<CacheResult<SubscriberInfo | null>> {
  return cacheGetOrSet<SubscriberInfo | null>(
    `subscriber:${msisdn}`,
    async () => {
      // In production, this would query HLR/HSS
      // For now, return mock data
      const operators = ['mobilis', 'djezzy', 'ooredoo']
      const randomOperator = operators[Math.floor(Math.random() * operators.length)]
      
      return {
        msisdn,
        imsi: `21301${Math.floor(Math.random() * 10000000000)}`,
        operator: randomOperator,
        status: Math.random() > 0.05 ? 'active' : 'roaming',
        lastLocation: ['Algiers', 'Oran', 'Constantine', 'Batna'][Math.floor(Math.random() * 4)],
        pdpContextActive: Math.random() > 0.3
      }
    },
    {
      ttl: CACHE_TTL.TELECOM_SUBSCRIBERS,
      prefix: KEY_PREFIXES.TELECOM
    }
  )
}

/**
 * Get cached protocol statistics
 */
export async function getCachedProtocolStats(protocol?: string): Promise<CacheResult> {
  const key = protocol ? `protocol-stats:${protocol}` : 'protocol-stats:all'
  
  return cacheGetOrSet(
    key,
    async () => {
      // In production, this would aggregate from protocol parsers
      const protocols = protocol ? [protocol] : ['GTP', 'SS7', 'Diameter', 'RADIUS', 'SIP']
      
      return protocols.map(p => ({
        protocol: p,
        messagesPerSecond: Math.floor(Math.random() * 50000) + 1000,
        errorsPerSecond: Math.floor(Math.random() * 100),
        avgLatencyMs: Math.floor(Math.random() * 50) + 5,
        activeSessions: p === 'GTP' ? Math.floor(Math.random() * 100000) + 50000 :
                     p === 'SIP' ? Math.floor(Math.random() * 50000) + 10000 :
                     Math.floor(Math.random() * 1000)
      }))
    },
    {
      ttl: CACHE_TTL.PROTOCOL_STATS,
      swr: true,
      swrTtl: CACHE_TTL.PROTOCOL_STATS * 3,
      prefix: KEY_PREFIXES.TELECOM
    }
  )
}

/**
 * Invalidate telecom caches
 */
export async function invalidateTelecomCaches(): Promise<void> {
  const redis = getRedisClient()
  await redis.clearPattern(`${KEY_PREFIXES.TELECOM}:*`)
}

// ===========================================
// Reference Data Caching (rarely changes)
// ===========================================

/**
 * Get cached reference data (countries, threat types, etc.)
 */
export async function getCachedReferenceData(type: string): Promise<CacheResult> {
  return cacheGetOrSet(
    `reference:${type}`,
    async () => {
      switch (type) {
        case 'countries':
          return [
            { code: 'DZ', name: 'Algeria', dialCode: '+213' },
            { code: 'FR', name: 'France', dialCode: '+33' },
            { code: 'TN', name: 'Tunisia', dialCode: '+216' },
            { code: 'MA', name: 'Morocco', dialCode: '+212' },
            // ... more countries
          ]
        
        case 'threat-categories':
          return [
            'MALWARE',
            'PHISHING',
            'DDOS',
            'INTRUSION',
            'DATA_BREACH',
            'FRAUD',
            'POLICY_VIOLATION'
          ]
        
        case 'alert-sources':
          return [
            'WAZUH',
            'SURICATA',
            'MISP',
            'THEHIVE',
            'STIX/TAXII',
            'MANUAL'
          ]
        
        default:
          return []
      }
    },
    {
      ttl: CACHE_TTL.REFERENCE_DATA,
      prefix: 'soc:reference'
    }
  )
}

// ===========================================
// Utility Functions
// ===========================================

function buildAlertWhereClause(params: AlertListParams): Record<string, unknown> {
  const where: Record<string, unknown> = { deletedAt: null }
  
  if (params.severity) where.severity = params.severity
  if (params.status) where.status = params.status
  if (params.source) where.source = { contains: params.source }
  
  return where
}

function getStartDateFromRange(now: Date, range: string): Date {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  
  return new Date(now.getTime() - (ranges[range] || ranges['24h']))
}

// ===========================================
// Batch Invalidation Helper
// ===========================================

/**
 * Invalidate multiple cache categories at once
 */
export async function batchInvalidate(options: {
  alerts?: boolean
  incidents?: boolean
  threats?: boolean
  dashboard?: boolean
  telecom?: boolean
}): Promise<{ [key: string]: number }> {
  const results: { [key: string]: number } = {}
  
  const operations: Array<[string, () => Promise<void>]> = []
  
  if (options.alerts) operations.push(['alerts', () => invalidateAlertCaches()])
  if (options.incidents) operations.push(['incidents', () => invalidateIncidentCaches()])
  if (options.threats) operations.push(['threats', () => invalidateThreatCaches()])
  if (options.dashboard) operations.push(['dashboard', () => invalidateDashboardCaches()])
  if (options.telecom) operations.push(['telecom', () => invalidateTelecomCaches()])
  
  for (const [name, fn] of operations) {
    try {
      await fn()
      results[name] = 1
    } catch (error) {
      console.error(`[Cache] Failed to invalidate ${name}:`, error)
      results[name] = 0
    }
  }
  
  return results
}
