/**
 * National SOC Platform - Cached Incidents API
 * Algeria 2026-2030 | High-Traffic Endpoint
 * 
 * This is an optimized version of /api/incidents with Redis caching.
 * Incidents are critical for SOC operations and accessed frequently.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { IncidentSeverity, IncidentStatus, IncidentType } from '@prisma/client'
import {
  withCache,
  cacheInvalidation,
  CACHE_TTL,
  KEY_PREFIXES,
  checkRateLimit,
  getRateLimitHeaders
} from '@/lib/cache'
import { rateLimiter } from '@/lib/rate-limiter'

// GET /api/incidents/cached - List all incidents with Redis caching
export async function GET(request: NextRequest) {
  // Rate limiting first
  const rateLimitResult = await checkRateLimit(request, {
    tier: rateLimiter.config.endpoints['GET /api/alerts'] || rateLimiter.config.authenticated
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
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const severity = searchParams.get('severity') as IncidentSeverity | null
  const status = searchParams.get('status') as IncidentStatus | null
  const type = searchParams.get('type') as IncidentType | null
  const assignedTo = searchParams.get('assignedTo')
  const search = searchParams.get('search')
  
  // Use caching middleware for GET requests
  return withCache(
    request,
    async () => {
      // Build where clause
      const where: Record<string, unknown> = { deletedAt: null }
      
      if (severity) where.severity = severity
      if (status) where.status = status
      if (type) where.type = type
      if (assignedTo) where.assigneeId = assignedTo
      
      // Text search across multiple fields
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { incidentId: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Execute queries in parallel
      const [incidents, total] = await Promise.all([
        db.incident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            creator: {
              select: { id: true, name: true }
            },
            alerts: {
              select: { id: true, severity: true, status: true, title: true },
              orderBy: { timestamp: 'desc' },
              take: 5
            },
            _count: {
              select: { alerts: true, tasks: true, notes: true }
            }
          }
        }),
        db.incident.count({ where })
      ])

      return {
        incidents,
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
      ttl: CACHE_TTL.INCIDENTS_ACTIVE,
      swr: true,
      swrTtl: CACHE_TTL.INCIDENTS_ACTIVE * 2,
      prefix: KEY_PREFIXES.INCIDENTS,
      includeQueryParams: ['page', 'limit', 'severity', 'status', 'type', 'assignedTo'],
      tags: ['incidents']
    }
  )
}

// POST /api/incidents/cached/invalidate - Invalidate incident caches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify admin key or session
    const isAdmin = request.headers.get('x-user-role') === 'admin'
    const validAdminKey = body.adminKey === process.env.ADMIN_API_KEY
    
    if (!isAdmin && !validAdminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    let deletedCount = 0
    
    if (body.incidentId) {
      // Invalidate specific incident cache
      deletedCount = await cacheInvalidation.incidentById(body.incidentId)
    } else if (body.invalidateAll) {
      // Invalidate all incident caches
      deletedCount = await cacheInvalidation.incidents()
    } else {
      return NextResponse.json(
        { error: 'Provide incidentId or set invalidateAll to true' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Invalidated ${deletedCount} cache entries`,
      deletedCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Incidents Cache API] Invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
