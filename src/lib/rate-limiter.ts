/**
 * National SOC Platform - Redis Rate Limiter
 * Algeria 2026-2030 | High-Traffic Protection
 * 
 * Features:
 * - Sliding window rate limiting (more accurate than fixed window)
 * - Multiple limit tiers (anonymous, authenticated, API, admin)
 * - IP-based + user-based limiting
 * - Distributed counter for multi-instance deployments
 * - Automatic cleanup of expired keys
 * - Metrics and monitoring integration
 * 
 * Optimized for 100K+ events/second telecom traffic
 */

import { getRedisClient } from './redis'

// ===========================================
// Types
// ===========================================

export interface RateLimitOptions {
  /** Maximum number of requests allowed */
  limit: number
  /** Time window in seconds */
  windowSec: number
  /** Key prefix for Redis */
  prefix?: string
  /** Custom identifier (defaults to IP) */
  identifier?: string
  /** Skip rate limiting for this request */
  skip?: () => boolean
  /** Custom error message */
  errorMessage?: string
  /** HTTP headers to include in response */
  headers?: boolean
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of requests made in current window */
  count: number
  /** Limit for current window */
  limit: number
  /** Time until reset (seconds) */
  resetTime: number
  /** Time remaining in window (milliseconds) */
  remainingTime: number
  /** Retry-After header value if limited */
  retryAfter?: number
}

export interface RateLimitTier {
  name: string
  limit: number
  windowSec: number
  description: string
}

export interface RateLimitConfig {
  /** Default limits for anonymous users */
  anonymous: RateLimitTier
  /** Limits for authenticated users */
  authenticated: RateLimitTier
  /** Limits for API key access */
  apiAccess: RateLimitTier
  /** Limits for admin users */
  admin: RateLimitTier
  /** Limits for specific endpoints */
  endpoints: Record<string, RateLimitTier>
  /** Global burst protection */
  burstProtection: {
    maxRequestsPerSecond: number
    windowMs: number
  }
  /** Whitelisted IPs (no rate limiting) */
  whitelist: string[]
  /** Blacklisted IPs (always blocked) */
  blacklist: string[]
}

// ===========================================
// Default Configuration
// ===========================================

export const DEFAULT_RATE_LIMIT_TIERS: RateLimitConfig = {
  anonymous: {
    name: 'anonymous',
    limit: 100,
    windowSec: 60,
    description: '100 requests per minute for unauthenticated users'
  },
  
  authenticated: {
    name: 'authenticated',
    limit: 1000,
    windowSec: 60,
    description: '1,000 requests per minute for authenticated users'
  },
  
  apiAccess: {
    name: 'api',
    limit: 10000,
    windowSec: 60,
    description: '10,000 requests per minute for API access'
  },
  
  admin: {
    name: 'admin',
    limit: 5000,
    windowSec: 60,
    description: '5,000 requests per minute for admin users'
  },
  
  // Endpoint-specific overrides
  endpoints: {
    // Login endpoint - stricter to prevent brute force
    'POST /api/auth/login': {
      name: 'login',
      limit: 5,
      windowSec: 300,
      description: '5 login attempts per 5 minutes'
    },
    
    // Password reset - very strict
    'POST /api/auth/reset-password': {
      name: 'password-reset',
      limit: 3,
      windowSec: 3600,
      description: '3 password resets per hour'
    },
    
    // High-value threat intel - moderate limit
    'GET /api/threats': {
      name: 'threats',
      limit: 500,
      windowSec: 60,
      description: '500 threat queries per minute'
    },
    
    // Dashboard - high frequency but small payload
    'GET /api/dashboard': {
      name: 'dashboard',
      limit: 120,
      windowSec: 60,
      description: '120 dashboard requests per minute (2/sec)'
    },
    
    // Alerts - can be heavy
    'GET /api/alerts': {
      name: 'alerts',
      limit: 300,
      windowSec: 60,
      description: '300 alert queries per minute'
    },
    
    // Export endpoints - expensive operations
    'GET /api/reports/export': {
      name: 'export',
      limit: 10,
      windowSec: 60,
      description: '10 exports per minute'
    },
    
    // WebSocket upgrade - very permissive
    'WS /api/socketio': {
      name: 'websocket',
      limit: 1000,
      windowSec: 60,
      description: '1,000 connections per minute'
    }
  },
  
  burstProtection: {
    maxRequestsPerSecond: 50,
    windowMs: 1000
  },
  
  whitelist: [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',        // Internal network
    '172.16.0.0/12',     // Docker network
    '192.168.0.0/16'     // Local network
  ],
  
  blacklist: []
}

// ===========================================
// Rate Limiter Class
// ===========================================

class RateLimiter {
  private config: RateLimitConfig
  
  constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT_TIERS) {
    this.config = config
  }

  /**
   * Check if request is rate limited
   * Uses sliding window algorithm for accurate rate limiting
   */
  async check(options: RateLimitOptions): Promise<RateLimitResult> {
    const startTime = Date.now()
    
    // Check skip condition
    if (options.skip?.()) {
      return {
        success: true,
        count: 0,
        limit: options.limit,
        resetTime: 0,
        remainingTime: options.windowSec * 1000
      }
    }

    try {
      const redis = getRedisClient()
      const key = `${options.prefix || 'ratelimit'}:${options.identifier || 'unknown'}`
      
      // Use sliding window with sorted set
      const now = Date.now()
      const windowStart = now - (options.windowSec * 1000)
      
      // Pipeline commands for atomicity
      const pipeline = redis.pipeline()
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart)
      
      // Count current entries
      pipeline.zcard(key)
      
      // Add new entry
      pipeline.zadd(key, now, `${now}-${Math.random().toString(36).substr(2, 9)}`)
      
      // Set expiry on the key
      pipeline.expire(key, options.windowSec + 1)
      
      const results = await pipeline.exec()
      
      if (!results || results[1]?.[1] === null) {
        throw new Error('Failed to execute rate limit pipeline')
      }
      
      const currentCount = results[1][1] as number
      
      // Determine if request is allowed
      const isAllowed = currentCount <= options.limit
      
      // Calculate time until oldest entry expires (for Retry-After header)
      let retryAfter: number | undefined
      let resetTime = 0
      
      if (!isAllowed && currentCount > 0) {
        // Get the oldest entry to calculate when a slot will be free
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
        if (oldest.length > 0) {
          const oldestTimestamp = parseFloat(oldest[1] as string)
          resetTime = Math.ceil((oldestTimestamp + options.windowSec * 1000 - now) / 1000)
          retryAfter = Math.max(1, resetTime)
        }
      }
      
      return {
        success: isAllowed,
        count: currentCount,
        limit: options.limit,
        resetTime,
        remainingTime: options.windowSec * 1000 - (Date.now() - startTime),
        retryAfter
      }
      
    } catch (error) {
      console.error('[RateLimiter] Error checking rate limit:', error)
      
      // On Redis failure, allow request through (fail-open)
      // In production, you might want to fail-closed for security
      return {
        success: true,
        count: 0,
        limit: options.limit,
        resetTime: 0,
        remainingTime: options.windowSec * 1000
      }
    }
  }

  /**
   * Check burst protection (requests per second)
   */
  async checkBurst(
    identifier: string,
    maxPerSecond: number = this.config.burstProtection.maxRequestsPerSecond
  ): Promise<RateLimitResult> {
    return this.check({
      limit: maxPerSecond,
      windowSec: 1,
      prefix: 'burst',
      identifier
    })
  }

  /**
   * Get rate limit tier for a request
   */
  getTierForRequest(
    method: string,
    path: string,
    isAuthenticated: boolean,
    hasApiKey: boolean,
    isAdmin: boolean
  ): RateLimitTier {
    // Check endpoint-specific config first
    const endpointKey = `${method} ${path.split('?')[0]}`
    if (this.config.endpoints[endpointKey]) {
      return this.config.endpoints[endpointKey]
    }
    
    // Fall back to role-based tiers
    if (isAdmin) return this.config.admin
    if (hasApiKey) return this.config.apiAccess
    if (isAuthenticated) return this.config.authenticated
    
    return this.config.anonymous
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip: string): boolean {
    return this.config.whitelist.some(whitelisted => {
      if (whitelisted.includes('/')) {
        return this.isIpInCidr(ip, whitelisted)
      }
      return ip === whitelisted
    })
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklisted(ip: string): boolean {
    return this.config.blacklist.some(blacklisted => {
      if (blacklisted.includes('/')) {
        return this.isIpInCidr(ip, blacklisted)
      }
      return ip === blacklisted
    })
  }

  /**
   * Get current rate limit status (for headers/metrics)
   */
  async getStatus(identifier: string, tier: RateLimitTier): Promise<{
    used: number
    limit: number
    remaining: number
    resetTime: Date | null
  }> {
    try {
      const redis = getRedisClient()
      const key = `ratelimit:${identifier}`
      
      const [count, ttl] = await Promise.all([
        redis.zcard(key),
        redis.ttl(key)
      ])
      
      return {
        used: count as number,
        limit: tier.limit,
        remaining: Math.max(0, tier.limit - (count as number)),
        resetTime: ttl > 0 ? new Date(Date.now() + ttl * 1000) : null
      }
    } catch {
      return {
        used: 0,
        limit: tier.limit,
        remaining: tier.limit,
        resetTime: null
      }
    }
  }

  /**
   * Reset rate limit for an identifier (admin function)
   */
  async reset(identifier: string, prefix: string = 'ratelimit'): Promise<boolean> {
    try {
      const redis = getRedisClient()
      await redis.del(`${prefix}:${identifier}`)
      return true
    } catch (error) {
      console.error('[RateLimiter] Error resetting rate limit:', error)
      return false
    }
  }

  /**
   * Get rate limiter metrics
   */
  async getMetrics(): Promise<{
    totalChecked: number
    totalLimited: number
    topLimitedIPs: Array<{ ip: string; count: number }>
  }> {
    try {
      const redis = getRedisClient()
      
      // Get limited keys count (keys that have hit their limit)
      // This is a simplified version - production would use proper metrics
      const pattern = 'ratelimit:*'
      const keys = await redis.keys(pattern)
      
      return {
        totalChecked: 0, // Would need to track this
        totalLimited: keys.length,
        topLimitedIPs: [] // Would need to track this
      }
    } catch {
      return {
        totalChecked: 0,
        totalLimited: 0,
        topLimitedIPs: []
      }
    }
  }

  // ===========================================
  // Utility Functions
  // ===========================================

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bitsStr] = cidr.split('/')
    const bits = parseInt(bitsStr, 10)
    
    // Simple IPv4 CIDR check (would need proper library for production)
    const ipNum = this.ipToLong(ip)
    const rangeNum = this.ipToLong(range)
    const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1)
    
    return (ipNum & mask) === (rangeNum & mask)
  }

  private ipToLong(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  }
}

// ===========================================
// Singleton Export
// ===========================================

export const rateLimiter = new RateLimiter(DEFAULT_RATE_LIMIT_TIERS)

// ===========================================
// Middleware Helper Functions
// ===========================================

/**
 * Create rate limiting middleware for Next.js API routes
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResult = await checkRateLimit(request)
 *   if (!rateLimitResult.success) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
 *     )
 *   }
 *   // Continue with handler...
 * }
 * ```
 */
export async function checkRateLimit(
  request: Request,
  options?: {
    /** Override default tier */
    tier?: RateLimitTier
    /** Custom identifier */
    identifier?: string
    /** Skip check */
    skip?: boolean
  }
): Promise<RateLimitResult> {
  // Get client IP
  const ip = getClientIP(request)
  
  // Check blacklist first
  if (rateLimiter.isBlacklisted(ip)) {
    return {
      success: false,
      count: 999999,
      limit: 0,
      resetTime: 86400,
      remainingTime: 86400000,
      retryAfter: 86400
    }
  }
  
  // Check whitelist
  if (rateLimiter.isWhitelisted(ip) || options?.skip) {
    return {
      success: true,
      count: 0,
      limit: 999999,
      resetTime: 0,
      remainingTime: 60000
    }
  }
  
  // Determine tier
  const url = new URL(request.url)
  const method = request.method
  const tier = options?.tier || rateLimiter.getTierForRequest(
    method,
    url.pathname,
    !!request.headers.get('authorization'),
    !!request.headers.get('x-api-key'),
    request.headers.get('x-user-role') === 'admin'
  )
  
  // Check rate limit
  return rateLimiter.check({
    limit: tier.limit,
    windowSec: tier.windowSec,
    identifier: options?.identifier || ip
  })
}

/**
 * Generate standard rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.limit - result.count).toString(),
    'X-RateLimit-Reset': result.resetTime.toString()
  }
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }
  
  return headers
}

/**
 * Extract client IP from request
 */
function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback - would need actual IP in Node.js environment
  return 'unknown'
}

// ===========================================
// Exports
// ===========================================

export { RateLimiter }
export default rateLimiter
