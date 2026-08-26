/**
 * National SOC Platform - Cache Management API
 * Algeria 2026-2030 | Admin Endpoint
 * 
 * Provides administrative endpoints for cache management:
 * - View cache statistics and metrics
 * - Invalidate caches by category
 * - Warm up specific cache entries
 * - Monitor cache health
 * 
 * Requires admin authentication for all operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, cacheMetrics } from '@/lib/redis'
import { cacheWarmer } from '@/lib/cache/middleware'
import {
  invalidateCache,
  cacheInvalidation,
  ENDPOINT_CACHE_CONFIGS,
  CACHE_TTL,
  KEY_PREFIXES
} from '@/lib/cache'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter'

// ===========================================
// Authentication Helper
// ===========================================

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; error?: string }> {
  // Check for admin API key in header
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey === process.env.ADMIN_API_KEY) {
    return { authorized: true }
  }
  
  // Check for admin role (from session/auth token)
  const userRole = request.headers.get('x-user-role')
  if (userRole === 'admin') {
    return { authorized: true }
  }
  
  // Check body for admin key (for POST requests)
  return { authorized: false, error: 'Admin authentication required' }
}

// ===========================================
// GET /api/cache/status - Cache Status & Statistics
// ===========================================

export async function GET(request: NextRequest) {
  // Rate limiting (stricter for admin endpoints)
  const rateLimitResult = await checkRateLimit(request, {
    tier: { name: 'cache-admin', limit: 60, windowSec: 60, description: '' }
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'overview'

  try {
    switch (type) {
      case 'overview':
        return await getCacheOverview()
      
      case 'metrics':
        return await getCacheMetrics()
      
      case 'warmup':
        return await getWarmUpStatus()
      
      case 'config':
        return await getCacheConfig()
      
      case 'health':
        return await getCacheHealth()
      
      default:
        return NextResponse.json(
          { error: `Invalid type: ${type}. Use: overview, metrics, warmup, config, health` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Cache Management API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch cache status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ===========================================
// POST /api/cache/invalidate - Cache Invalidation
// ===========================================

export async function POST(request: NextRequest) {
  // Verify admin access
  const auth = await verifyAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { category, pattern, keys } = body

    let deletedCount = 0
    let message = ''

    if (category) {
      // Pre-configured category invalidation
      switch (category) {
        case 'alerts':
          deletedCount = await cacheInvalidation.alerts()
          message = 'Alert caches invalidated'
          break
        
        case 'incidents':
          deletedCount = await cacheInvalidation.incidents()
          message = 'Incident caches invalidated'
          break
        
        case 'threats':
          deletedCount = await cacheInvalidation.threats()
          message = 'Threat intelligence caches invalidated'
          break
        
        case 'dashboard':
          deletedCount = await cacheInvalidation.dashboard()
          message = 'Dashboard caches invalidated'
          break
        
        case 'telecom':
          deletedCount = await cacheInvalidation.telecom()
          message = 'Telecom caches invalidated'
          break
        
        case 'all':
          // Invalidate everything
          const results = await Promise.all([
            cacheInvalidation.alerts(),
            cacheInvalidation.incidents(),
            cacheInvalidation.threats(),
            cacheInvalidation.dashboard(),
            cacheInvalidation.telecom()
          ])
          deletedCount = results.reduce((sum, count) => sum + count, 0)
          message = 'All caches invalidated'
          break
        
        default:
          return NextResponse.json(
            { error: `Unknown category: ${category}` },
            { status: 400 }
          )
      }
    } else if (pattern) {
      // Custom pattern invalidation
      deletedCount = await invalidateCache({
        pattern,
        publishEvent: true
      })
      message = `Pattern "${pattern}" invalidated`
    } else if (keys && Array.isArray(keys)) {
      // Specific key invalidation
      deletedCount = await invalidateCache({ keys, publishEvent: true })
      message = `${keys.length} key(s) invalidated`
    } else {
      return NextResponse.json(
        { error: 'Provide category, pattern, or keys to invalidate' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message,
      deletedCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Cache Management API] Invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}

// ===========================================
// PUT /api/cache/warmup - Trigger Cache Warm-up
// ===========================================

export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { jobId } = body

    if (jobId) {
      // Run specific warm-up job
      const success = await cacheWarmer.runJob(jobId)
      
      if (!success) {
        return NextResponse.json(
          { error: `Warm-up job not found: ${jobId}` },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Warm-up job triggered: ${jobId}`,
        jobId,
        timestamp: new Date().toISOString()
      })
    } else {
      // Restart all warm-up jobs
      cacheWarmer.stop()
      setTimeout(() => {
        cacheWarmer.start().catch(console.error)
      }, 100)

      return NextResponse.json({
        success: true,
        message: 'All warm-up jobs restarted',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[Cache Management API] Warm-up error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger warm-up' },
      { status: 500 }
    )
  }
}

// ===========================================
// Handler Functions
// ===========================================

async function getCacheOverview(): Promise<NextResponse> {
  const redis = getRedisClient()
  
  try {
    // Get Redis info
    const info = await redis.info()
    const dbSize = await redis.dbsize()
    
    // Parse memory usage from INFO
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
    const memoryHuman = memoryMatch ? memoryMatch[1] : 'unknown'
    
    // Get cache hit/miss metrics
    const metrics = cacheMetrics.getMetrics()

    return NextResponse.json({
      status: 'connected',
      redis: {
        version: info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown',
        uptime: info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1] || '0',
        connectedClients: info.match(/connected_clients:([^\r\n]+)/)?.[1] || '0',
        memoryUsage: memoryHuman,
        totalKeys: dbSize,
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hits + metrics.misses > 0 
          ? ((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}

async function getCacheMetrics(): Promise<NextResponse> {
  const metrics = cacheMetrics.getMetrics()
  
  return NextResponse.json({
    metrics: {
      ...metrics,
      hitRate: metrics.hits + metrics.misses > 0 
        ? (metrics.hits / (metrics.hits + metrics.misses)) * 100 
        : 0
    },
    period: {
      start: metrics.resetTime,
      end: new Date()
    }
  })
}

async function getWarmUpStatus(): Promise<NextResponse> {
  const jobs = cacheWarmer.getStatus()
  
  return NextResponse.json({
    warmUpJobs: jobs,
    totalJobs: jobs.length,
    running: jobs.filter(j => j.lastRun !== null).length
  })
}

async function getCacheConfig(): Promise<NextResponse> {
  return NextResponse.json({
    ttl: CACHE_TTL,
    prefixes: KEY_PREFIXES,
    endpointConfigs: Object.keys(ENDPOINT_CACHE_CONFIGS).map(key => ({
      endpoint: key,
      ...ENDPOINT_CACHE_CONFIGS[key]
    }))
  })
}

async function getCacheHealth(): Promise<NextResponse> {
  try {
    const redis = getRedisClient()
    const health = await redis.healthCheck()
    
    return NextResponse.json({
      ...health,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString()
    }, { status: 503 })
  }
}
