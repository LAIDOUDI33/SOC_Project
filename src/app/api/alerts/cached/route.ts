/**
 * National SOC Platform - Cached Alerts API
 * Algeria 2026-2030 | High-Traffic Endpoint
 * 
 * This is an optimized version of /api/alerts with Redis caching.
 * For 100K+ events/second, caching reduces database load by ~95%.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AlertSeverity, AlertStatus } from '@prisma/client'
import { 
  withCache,
  cacheInvalidation,
  CACHE_TTL,
  KEY_PREFIXES
} from '@/lib/cache'

// GET /api/alerts/cached - List all alerts with Redis caching
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const severity = searchParams.get('severity') as AlertSeverity | null
  const status = searchParams.get('status') as AlertStatus | null
  const source = searchParams.get('source')
  const assignedTo = searchParams.get('assignedTo')
  
  // Use caching middleware for GET requests
  return withCache(
    request,
    async () => {
      // Build where clause
      const where: Record<string, unknown> = { deletedAt: null }
      
      if (severity) where.severity = severity
      if (status) where.status = status
      if (source) where.source = { contains: source }
      if (assignedTo) where.assignedToId = assignedTo

      // Execute queries in parallel
      const [alerts, total] = await Promise.all([
        db.alert.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            },
            incident: {
              select: { id: true, incidentId: true, title: true, status: true }
            }
          }
        }),
        db.alert.count({ where })
      ])

      return {
        alerts,
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
      ttl: CACHE_TTL.ALERTS_LIVE,
      swr: true,
      swrTtl: CACHE_TTL.ALERTS_LIVE * 2,
      prefix: KEY_PREFIXES.ALERTS,
      includeQueryParams: ['page', 'limit', 'severity', 'status', 'source', 'assignedTo'],
      tags: ['alerts']
    }
  )
}
