/**
 * National SOC Platform - Cached Threat Intelligence API
 * Algeria 2026-2030 | High-Traffic Endpoint
 * 
 * This is an optimized version of /api/threats with Redis caching.
 * Threat intelligence data is relatively stable and perfect for caching.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ThreatType, IndicatorType, TLPLevel } from '@prisma/client'
import {
  withCache,
  cacheInvalidation,
  CACHE_TTL,
  KEY_PREFIXES,
  checkRateLimit,
  getRateLimitHeaders
} from '@/lib/cache'
import { rateLimiter } from '@/lib/rate-limiter'

// GET /api/threats/cached - List threat indicators with Redis caching
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkRateLimit(request, {
    tier: rateLimiter.config.endpoints['GET /api/threats'] || rateLimiter.config.authenticated
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  const { searchParams } = new URL(request.url)
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const type = searchParams.get('type') as ThreatType | null
  const indicatorType = searchParams.get('indicatorType') as IndicatorType | null
  const tlp = searchParams.get('tlp') as TLPLevel | null
  const isActive = searchParams.get('isActive')
  const search = searchParams.get('search')
  const iocOnly = searchParams.get('iocOnly') === 'true'
  
  // Use caching middleware
  return withCache(
    request,
    async () => {
      // Build where clause
      const where: Record<string, unknown> = {}
      
      if (type) where.type = type
      if (indicatorType) where.indicatorType = indicatorType
      if (tlp) where.tlp = tlp
      if (isActive !== null) where.isActive = isActive === 'true'
      
      // Text search
      if (search) {
        where.OR = [
          { value: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]
      }

      // Query appropriate table based on IOC flag
      let data: any[]
      let total: number
      
      if (iocOnly) {
        // Query IOCs table
        [data, total] = await Promise.all([
          db.iOC.findMany({
            where,
            orderBy: { lastSeen: 'desc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          db.iOC.count({ where })
        ])
        
        return {
          iocs: data,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          _cached: false
        }
      }
      
      // Query indicators table
      [data, total] = await Promise.all([
        db.indicator.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            creator: {
              select: { id: true, name: true }
            },
            _count: {
              select: { incidents: true, alerts: true }
            }
          }
        }),
        db.indicator.count({ where })
      ])

      return {
        indicators: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        _cached: false
      }
    },
    {
      ttl: CACHE_TTL.THREAT_INTEL,
      swr: true,
      swrTtl: CACHE_TTL.THREAT_INTEL * 4, // Threat intel changes slowly
      prefix: KEY_PREFIXES.THREATS,
      includeQueryParams: ['page', 'limit', 'type', 'indicatorType', 'tlp', 'isActive', 'iocOnly'],
      tags: ['threats']
    }
  )
}

// GET /api/threats/cached/stats - Threat statistics (heavily cached)
export async function GET_STATS(request: NextRequest) {
  return withCache(
    request,
    async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const [
        totalIndicators,
        activeIndicators,
        newToday,
        newThisWeek,
        byType,
        byTlp,
        topTags
      ] = await Promise.all([
        db.indicator.count(),
        db.indicator.count({ where: { isActive: true } }),
        db.indicator.count({ where: { createdAt: { gte: todayStart } } }),
        db.indicator.count({ where: { createdAt: { gte: weekAgo } } }),
        db.indicator.groupBy({
          by: ['type'],
          _count: true,
          orderBy: { _count: { type: 'desc' } },
          take: 10
        }),
        db.indicator.groupBy({
          by: ['tlp'],
          _count: true
        }),
        // Get most common tags (would need raw query for proper implementation)
        Promise.resolve([])
      ])

      return {
        summary: {
          totalIndicators,
          activeIndicators,
          newToday,
          newThisWeek
        },
        breakdown: {
          byType: Object.fromEntries(byType.map(t => [t.type, t._count])),
          byTlp: Object.fromEntries(byTlp.map(t => [t.tlp || 'unknown', t._count])),
          topTags
        },
        _cached: false
      }
    },
    {
      ttl: CACHE_TTL.THREAT_INTEL * 2, // Stats can be cached longer
      prefix: `${KEY_PREFIXES.THREATS}:stats`
    }
  )
}

// POST /api/threats/cached/invalidate - Invalidate threat caches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const isAdmin = request.headers.get('x-user-role') === 'admin'
    const validAdminKey = body.adminKey === process.env.ADMIN_API_KEY
    
    if (!isAdmin && !validAdminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let deletedCount = 0
    
    if (body.indicatorId) {
      deletedCount = await cacheInvalidation.threats()
      // Would need more granular invalidation in production
    } else {
      deletedCount = await cacheInvalidation.threats()
    }
    
    return NextResponse.json({
      success: true,
      message: `Invalidated ${deletedCount} threat cache entries`,
      deletedCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Threats Cache API] Invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
