/**
 * National SOC Platform - Caching Middleware
 * Algeria 2026-2030 | High-Traffic API Caching
 * 
 * Provides middleware and higher-order functions for:
 * - Response caching with automatic invalidation
 * - Request deduplication
 * - Cache tagging for group invalidation
 * - API response caching for GET requests
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getRedisClient,
  cacheGetOrSet,
  cacheInvalidate,
  CACHE_TTL,
  KEY_PREFIXES,
  type CacheOptions,
  type CacheResult
} from '../redis'

// ===========================================
// Types
// ===========================================

export interface CacheMiddlewareConfig {
  /** TTL in seconds (use CACHE_TTL constants) */
  ttl: number
  /** Enable stale-while-revalidate */
  swr?: boolean
  /** SWR TTL (default: 2x ttl) */
  swrTtl?: number
  /** Key prefix override */
  prefix?: string
  /** Query parameters to include in cache key */
  includeQueryParams?: string[]
  /** Headers to include in cache key */
  includeHeaders?: string[]
  /** Condition function to determine if request should be cached */
  shouldCache?: (request: NextRequest) => boolean
  /** Custom key generator */
  keyGenerator?: (request: NextRequest) => string
  /** Tags for group invalidation */
  tags?: string[]
}

export interface CachedResponse<T = any> {
  data: T
  cachedAt: Date
  ttl: number
  source: 'cache' | 'database' | 'stale'
  etag?: string
}

export interface DeduplicationOptions {
  /** Window in ms to deduplicate identical requests */
  windowMs: number
  /** Maximum number of concurrent identical requests */
  maxConcurrent: number
  /** Key generator for deduplication */
  keyGenerator: (request: NextRequest) => string
}

// ===========================================
// Default Configurations
// ===========================================

const DEFAULT_CACHE_CONFIG: Partial<CacheMiddlewareConfig> = {
  swr: true,
  includeQueryParams: ['page', 'limit', 'sort'],
  shouldCache: (req) => req.method === 'GET'
}

// Pre-configured cache settings for different endpoint types
export const ENDPOINT_CACHE_CONFIGS: Record<string, CacheMiddlewareConfig> = {
  // Alert endpoints
  'GET /api/alerts': {
    ttl: CACHE_TTL.ALERTS_LIVE,
    swr: true,
    swrTtl: CACHE_TTL.ALERTS_LIVE * 2,
    prefix: KEY_PREFIXES.ALERTS,
    includeQueryParams: ['page', 'limit', 'severity', 'status', 'source']
  },
  
  'GET /api/alerts/stats': {
    ttl: CACHE_TTL.ALERTS_STATS,
    swr: true,
    swrTtl: CACHE_TTL.ALERTS_STATS * 3,
    prefix: KEY_PREFIXES.ALERTS
  },
  
  // Incident endpoints
  'GET /api/incidents': {
    ttl: CACHE_TTL.INCIDENTS_ACTIVE,
    swr: true,
    swrTtl: CACHE_TTL.INCIDENTS_ACTIVE * 2,
    prefix: KEY_PREFIXES.INCIDENTS,
    includeQueryParams: ['page', 'limit', 'status', 'severity']
  },
  
  'GET /api/incidents/sla': {
    ttl: CACHE_TTL.DASHBOARD_KPI,
    prefix: KEY_PREFIXES.INCIDENTS
  },
  
  // Threat intelligence endpoints
  'GET /api/threats': {
    ttl: CACHE_TTL.THREAT_INTEL,
    swr: true,
    swrTtl: CACHE_TTL.THREAT_INTEL * 4,
    prefix: KEY_PREFIXES.THREATS,
    includeQueryParams: ['type', 'severity', 'page', 'limit']
  },
  
  'GET /api/threats/iocs': {
    ttl: CACHE_TTL.THREAT_INTEL,
    prefix: KEY_PREFIXES.THREATS
  },
  
  // Asset endpoints
  'GET /api/assets': {
    ttl: CACHE_TTL.ASSET_LIST,
    swr: true,
    swrTtl: CACHE_TTL.ASSET_LIST * 5,
    prefix: KEY_PREFIXES.ASSETS,
    includeQueryParams: ['type', 'criticality', 'status']
  },
  
  // Dashboard endpoints
  'GET /api/dashboard/kpi': {
    ttl: CACHE_TTL.DASHBOARD_KPI,
    swr: true,
    swrTtl: CACHE_TTL.DASHBOARD_KPI * 2,
    prefix: KEY_PREFIXES.DASHBOARD
  },
  
  'GET /api/dashboard/timeline': {
    ttl: CACHE_TTL.DASHBOARD_KPI,
    prefix: KEY_PREFIXES.DASHBOARD,
    includeQueryParams: ['period', 'groupBy']
  },
  
  // Telecom-specific endpoints
  'GET /api/telecom/subscribers': {
    ttl: CACHE_TTL.TELECOM_SUBSCRIBERS,
    prefix: KEY_PREFIXES.TELECOM,
    includeQueryParams: ['msisdn', 'imsi']
  },
  
  'GET /api/telecom/protocols': {
    ttl: CACHE_TTL.PROTOCOL_STATS,
    swr: true,
    swrTtl: CACHE_TTL.PROTOCOL_STATS * 3,
    prefix: KEY_PREFIXES.TELECOM,
    includeQueryParams: ['protocol', 'timeRange']
  },
  
  // User/session endpoints
  'GET /api/users/me': {
    ttl: CACHE_TTL.USER_SESSION,
    prefix: KEY_PREFIXES.USERS
  }
}

// ===========================================
// Request Deduplication
// ===========================================

class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()
  private requestCounts = new Map<string, number>()
  
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: DeduplicationOptions
  ): Promise<T> {
    const existing = this.pendingRequests.get(key)
    
    if (existing) {
      const currentCount = this.requestCounts.get(key) || 0
      
      if (currentCount < options.maxConcurrent) {
        // Join existing request
        this.requestCounts.set(key, currentCount + 1)
        console.log(`[Cache] Deduplicating request: ${key} (${currentCount + 1} callers)`)
        return existing
      }
    }
    
    // Create new request
    const promise = fetcher().finally(() => {
      setTimeout(() => {
        this.pendingRequests.delete(key)
        this.requestCounts.delete(key)
      }, options.windowMs)
    })
    
    this.pendingRequests.set(key, promise)
    this.requestCounts.set(key, 1)
    
    return promise
  }
  
  getStats(): { pendingRequests: number; totalDeduplicated: number } {
    let totalDeduplicated = 0
    for (const count of this.requestCounts.values()) {
      if (count > 1) totalDeduplicated += count - 1
    }
    
    return {
      pendingRequests: this.pendingRequests.size,
      totalDeduplicated
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator()

// ===========================================
// Cache Key Generation
// ===========================================

function generateCacheKey(request: NextRequest, config: CacheMiddlewareConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(request)
  }
  
  const url = new URL(request.url)
  const parts = [url.pathname]
  
  // Add specified query params
  if (config.includeQueryParams?.length) {
    const params: string[] = []
    for (const param of config.includeQueryParams) {
      const value = url.searchParams.get(param)
      if (value) params.push(`${param}=${value}`)
    }
    if (params.length) parts.push(params.join('&'))
  }
  
  // Add headers if specified
  if (config.includeHeaders?.length) {
    const headerValues: string[] = []
    for (const header of config.includeHeaders) {
      const value = request.headers.get(header)
      if (value) headerValues.push(`${header}=${value}`)
    }
    if (headerValues.length) parts.push(headerValues.join('&'))
  }
  
  return parts.join('?')
}

// ===========================================
// ETag Generation
// ===========================================

function generateETag(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  // Simple hash (in production, use crypto.createHash)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`
}

// ===========================================
// Main Middleware Function
// ===========================================

/**
 * Create a caching middleware for API routes
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withCache(request, () => {
 *     // Your data fetching logic
 *     return db.alert.findMany()
 *   }, {
 *     ttl: CACHE_TTL.ALERTS_LIVE,
 *     prefix: KEY_PREFIXES.ALERTS
 *   })
 * }
 * ```
 */
export async function withCache<T>(
  request: NextRequest,
  fetcher: () => Promise<T>,
  config: CacheMiddlewareConfig
): Promise<NextResponse> {
  const startTime = Date.now()
  
  // Check if request should be cached
  if (config.shouldCache && !config.shouldCache(request)) {
    const data = await fetcher()
    return NextResponse.json({ data })
  }
  
  // Generate cache key
  const cacheKey = generateCacheKey(request, config)
  
  try {
    const cacheOptions: CacheOptions = {
      ttl: config.ttl,
      swr: config.swr,
      swrTtl: config.swrTtl || config.ttl * 2,
      prefix: config.prefix,
      json: true
    }
    
    // Get from cache or set
    const result = await cacheGetOrSet<CachedResponse<T>>(
      cacheKey,
      async () => {
        const data = await fetcher()
        return {
          data,
          cachedAt: new Date(),
          ttl: config.ttl,
          source: 'database',
          etag: generateETag(data)
        }
      },
      cacheOptions
    )
    
    // Build response
    const responseData = result.data as CachedResponse<T>
    const responseTime = Date.now() - startTime
    
    const response = NextResponse.json({
      data: responseData.data,
      _meta: {
        cached: result.hit || result.stale,
        cacheSource: result.source,
        cachedAt: responseData.cachedAt,
        ttl: responseData.ttl,
        responseTime
      }
    })
    
    // Set cache headers
    if (result.hit || result.stale) {
      response.headers.set('X-Cache', result.stale ? 'STALE' : 'HIT')
      response.headers.set('X-Cache-Age', `${Math.floor((Date.now() - responseData.cachedAt.getTime()) / 1000)}s`)
      
      if (responseData.etag) {
        response.headers.set('ETag', responseData.etag)
      }
      
      // Set Cache-Control for client-side caching
      response.headers.set('Cache-Control', `public, max-age=${config.ttl}, stale-while-revalidate=${cacheOptions.swrTtl}`)
    } else {
      response.headers.set('X-Cache', 'MISS')
      response.headers.set('Cache-Control', `public, max-age=${config.ttl}, stale-while-revalidate=${cacheOptions.swrTtl}`)
    }
    
    // Handle If-None-Match for conditional requests
    const ifNoneMatch = request.headers.get('if-none-match')
    if (ifNoneMatch && responseData.etag && ifNoneMatch === responseData.etag) {
      return new NextResponse(null, { status: 304 })
    }
    
    return response
    
  } catch (error) {
    console.error('[Cache] Middleware error:', error)
    
    // On cache error, fall through to direct fetch
    const data = await fetcher()
    return NextResponse.json({
      data,
      _meta: {
        cached: false,
        error: 'cache_bypass',
        responseTime: Date.now() - startTime
      }
    }, {
      headers: { 'X-Cache', 'ERROR' }
    })
  }
}

// ===========================================
// Higher-Order Function for Route Handlers
// ===========================================

/**
 * Wrap a route handler with caching
 * 
 * @example
 * ```typescript
 * export const GET = withRouteCache({
 *   ttl: CACHE_TTL.ALERTS_LIVE,
 *   prefix: KEY_PREFIXES.ALERTS
 * })(async (request) => {
 *   const alerts = await db.alert.findMany()
 *   return successResponse(alerts)
 * })
 * ```
 */
export function withRouteCache(config: CacheMiddlewareConfig) {
  return function<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (request: NextRequest, ...args: any[]) => {
      // Only cache GET requests
      if (request.method !== 'GET') {
        return handler(request, ...args)
      }
      
      return withCache(
        request,
        () => handler(request, ...args).then(res => res.json()),
        config
      )
    }) as T
  }
}

// ===========================================
// Cache Invalidation Helpers
// ===========================================

/**
 * Invalidate cache by tags or patterns
 */
export async function invalidateCache(options: {
  /** Specific keys to invalidate */
  keys?: string[]
  /** Pattern to match (e.g., 'soc:alerts:*') */
  pattern?: string
  /** Prefix to use */
  prefix?: string
  /** Publish invalidation event */
  publishEvent?: boolean
}): Promise<number> {
  const redis = getRedisClient()
  let deleted = 0
  
  if (options.keys?.length) {
    deleted += await cacheInvalidate(options.keys, options.prefix)
  }
  
  if (options.pattern) {
    deleted += await redis.clearPattern(options.pattern)
  }
  
  // Publish invalidation event for other instances
  if (options.publishEvent) {
    await redis.publish('cache:invalidation', {
      pattern: options.pattern,
      keys: options.keys,
      timestamp: new Date().toISOString(),
      deleted
    })
  }
  
  return deleted
}

/**
 * Pre-configured invalidation functions for common scenarios
 */
export const cacheInvalidation = {
  /** Invalidate all alert caches */
  async alerts(): Promise<number> {
    return invalidateCache({
      pattern: `${KEY_PREFIXES.ALERTS}:*`,
      publishEvent: true
    })
  },
  
  /** Invalidate specific alert caches */
  async alertById(alertId: string): Promise<number> {
    return invalidateCache({
      keys: [`alerts:${alertId}`, `alerts:list:*`],
      prefix: KEY_PREFIXES.ALERTS,
      publishEvent: true
    })
  },
  
  /** Invalidate all incident caches */
  async incidents(): Promise<number> {
    return invalidateCache({
      pattern: `${KEY_PREFIXES.INCIDENTS}:*`,
      publishEvent: true
    })
  },
  
  /** Invalidate all threat intel caches */
  async threats(): Promise<number> {
    return invalidateCache({
      pattern: `${KEY_PREFIXES.THREATS}:*`,
      publishEvent: true
    })
  },
  
  /** Invalidate dashboard caches */
  async dashboard(): Promise<number> {
    return invalidateCache({
      pattern: `${KEY_PREFIXES.DASHBOARD}:*`,
      publishEvent: true
    })
  },
  
  /** Invalidate all telecom caches */
  async telecom(): Promise<number> {
    return invalidateCache({
      pattern: `${KEY_PREFIXES.TELECOM}:*`,
      publishEvent: true
    })
  },
  
  /** Invalidate user session caches */
  async userSessions(userId: string): Promise<number> {
    return invalidateCache({
      keys: [`user:${userId}`, `session:${userId}`],
      prefix: KEY_PREFIXES.USERS,
      publishEvent: true
    })
  }
}

// ===========================================
// Cache Warmer
// ===========================================

interface WarmUpJob {
  id: string
  key: string
  fetcher: () => Promise<any>
  options: CacheOptions
  intervalMs: number
  lastRun: Date | null
  running: boolean
}

class CacheWarmer {
  private jobs = new Map<string, WarmUpJob>()
  private timers = new Map<string, NodeJS.Timeout>()
  
  /**
   * Register a warm-up job
   */
  register(job: Omit<WarmUpJob, 'lastRun' | 'running'>): void {
    this.jobs.set(job.id, {
      ...job,
      lastRun: null,
      running: false
    })
  }
  
  /**
   * Start all warm-up jobs
   */
  async start(): Promise<void> {
    console.log(`[Cache] Starting ${this.jobs.size} warm-up jobs`)
    
    for (const [id, job] of this.jobs) {
      this.scheduleJob(id, job)
    }
  }
  
  /**
   * Stop all warm-up jobs
   */
  stop(): void {
    for (const [id, timer] of this.timers) {
      clearInterval(timer)
      this.timers.delete(id)
    }
    console.log('[Cache] All warm-up jobs stopped')
  }
  
  private scheduleJob(id: string, job: WarmUpJob): void {
    const timer = setInterval(async () => {
      if (job.running) return
      
      job.running = true
      try {
        const redis = getRedisClient()
        await redis.set(job.key, await job.fetcher(), job.options)
        job.lastRun = new Date()
        console.log(`[Cache] Warmed up: ${job.key}`)
      } catch (error) {
        console.error(`[Cache] Warm-up failed for ${job.key}:`, error)
      } finally {
        job.running = false
      }
    }, job.intervalMs)
    
    this.timers.set(id, timer)
  }
  
  /**
   * Manually trigger a warm-up job
   */
  async runJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id)
    if (!job) return false
    
    try {
      const redis = getRedisClient()
      await redis.set(job.key, await job.fetcher(), job.options)
      job.lastRun = new Date()
      return true
    } catch (error) {
      console.error(`[Cache] Manual warm-up failed for ${job.key}:`, error)
      return false
    }
  }
  
  getStatus(): Array<{ id: string; key: string; lastRun: Date | null; intervalMs: number }> {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      key: job.key,
      lastRun: job.lastRun,
      intervalMs: job.intervalMs
    }))
  }
}

export const cacheWarmer = new CacheWarmer()

// ===========================================
// Exports
// ===========================================

export {
  generateCacheKey,
  generateETag,
  DEFAULT_CACHE_CONFIG,
  ENDPOINT_CACHE_CONFIGS
}
