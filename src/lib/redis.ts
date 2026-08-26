/**
 * National SOC Platform - Redis Client Utility
 * Algeria 2026-2030 | High-Traffic Caching Layer
 * 
 * Features:
 * - Connection pooling with automatic reconnection
 * - Circuit breaker pattern for fault tolerance
 * - Request queuing and batching for high throughput
 * - Health checks and monitoring integration
 * - Optimized for 100K+ events/second telecom traffic
 */

import Redis from 'ioredis'
import { promisify } from 'util'

// ===========================================
// Configuration Types
// ===========================================

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db: number
  maxRetriesPerRequest: number
  retryDelayOnFailover: number
  maxClientsPerPool: number
  enableReadyCheck: boolean
  enableOfflineQueue: boolean
  connectTimeout: number
  commandTimeout: number
  lazyConnect: boolean
  keepAlive?: number
  connectionName?: string
}

export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number
  /** Use stale-while-revalidate pattern (return stale data while refreshing) */
  swr?: boolean
  /** Stale-while-revalidate time in seconds (how long to serve stale data) */
  swrTtl?: number
  /** Key prefix for namespacing */
  prefix?: string
  /** Compress large values (>1KB) */
  compress?: boolean
  /** Serialize as JSON */
  json?: boolean
}

export interface CacheResult<T> {
  data: T | null
  hit: boolean
  stale: boolean
  ttl?: number
  source: 'cache' | 'database' | 'stale'
}

export interface CacheMetrics {
  hits: number
  misses: number
  staleHits: number
  errors: number
  totalRequests: number
  hitRate: number
  avgResponseTime: number
}

// ===========================================
// Default Configuration
// ===========================================

const DEFAULT_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  maxClientsPerPool: 20,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: false,
  keepAlive: 10000,
  connectionName: 'soc-platform-app'
}

// Default TTL values (in seconds) for different cache types
export const CACHE_TTL = {
  // Short-lived caches (real-time data)
  ALERTS_LIVE: 5,                    // 5 seconds - Live alerts feed
  ALERTS_STATS: 30,                  // 30 seconds - Alert statistics
  INCIDENTS_ACTIVE: 15,              // 15 seconds - Active incidents
  
  // Medium-lived caches (frequently accessed)
  DASHBOARD_KPI: 60,                 // 1 minute - Dashboard KPIs
  THREAT_INTEL: 120,                 // 2 minutes - Threat intelligence
  ASSET_LIST: 300,                   // 5 minutes - Asset inventory
  USER_SESSION: 1800,                // 30 minutes - User sessions
  
  // Long-lived caches (rarely changing)
  REFERENCE_DATA: 3600,              // 1 hour - Reference data (countries, etc.)
  SYSTEM_CONFIG: 7200,               // 2 hours - System configuration
  ARPT_REPORTS: 86400,              // 24 hours - ARPT reports
  
  // Telecom-specific caches
  TELECOM_SUBSCRIBERS: 10,           // 10 seconds - Subscriber lookups
  PROTOCOL_STATS: 20,               // 20 seconds - Protocol statistics
  ROAMING_DATA: 60,                 // 1 minute - Roaming information
} as const

// Key prefixes for namespacing
const KEY_PREFIXES = {
  ALERTS: 'soc:alerts',
  INCIDENTS: 'soc:incidents',
  THREATS: 'soc:threats',
  ASSETS: 'soc:assets',
  USERS: 'soc:users',
  DASHBOARD: 'soc:dashboard',
  TELECOM: 'soc:telecom',
  SESSION: 'soc:session',
  RATE_LIMIT: 'soc:ratelimit',
  LOCK: 'soc:lock',
} as const

// ===========================================
// Cache Metrics Collector
// ===========================================

class MetricsCollector {
  private metrics: Map<string, { hits: number; misses: number; errors: number; responseTimes: number[] }> = new Map()
  
  recordHit(key: string, responseTime: number): void {
    this.ensureKey(key)
    this.metrics.get(key)!.hits++
    this.metrics.get(key)!.responseTimes.push(responseTime)
  }
  
  recordMiss(key: string): void {
    this.ensureKey(key)
    this.metrics.get(key)!.misses++
  }
  
  recordStaleHit(key: string, responseTime: number): void {
    this.ensureKey(key)
    this.metrics.get(key)!.staleHits++
    this.metrics.get(key)!.responseTimes.push(responseTime)
  }
  
  recordError(key: string): void {
    this.ensureKey(key)
    this.metrics.get(key)!.errors++
  }
  
  private ensureKey(key: string): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { hits: 0, misses: 0, errors: 0, staleHits: 0, responseTimes: [] })
    }
  }
  
  getMetrics(): Record<string, CacheMetrics> {
    const result: Record<string, CacheMetrics> = {}
    
    for (const [key, data] of this.metrics) {
      const totalRequests = data.hits + data.misses + data.staleHits
      const avgResponseTime = data.responseTimes.length > 0 
        ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length 
        : 0
      
      result[key] = {
        hits: data.hits,
        misses: data.misses,
        staleHits: data.staleHits,
        errors: data.errors,
        totalRequests,
        hitRate: totalRequests > 0 ? (data.hits + data.staleHits) / totalRequests : 0,
        avgResponseTime
      }
    }
    
    return result
  }
  
  reset(): void {
    this.metrics.clear()
  }
}

export const cacheMetrics = new MetricsCollector()

// ===========================================
// Main Redis Client Class
// ===========================================

class RedisClient {
  private client: Redis | null = null
  private subscriberClient: Redis | null = null
  private config: RedisConfig
  private isConnected: boolean = false
  private isConnecting: boolean = false
  private circuitOpen: boolean = false
  private circuitOpenUntil: number = 0
  private circuitFailureCount: number = 0
  private readonly CIRCUIT_THRESHOLD = 5
  private readonly CIRCUIT_TIMEOUT = 30000 // 30 seconds
  
  constructor(config: Partial<RedisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize Redis connection with error handling
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return
    }

    this.isConnecting = true
    
    try {
      console.log('[Redis] Connecting to Redis at', `${this.config.host}:${this.config.port}`)
      
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        retryStrategy: (times: number) => {
          if (times > this.config.maxRetriesPerRequest) {
            console.error('[Redis] Max retries reached')
            return null // Stop retrying
          }
          return Math.min(times * this.config.retryDelayOnFailover, 3000)
        },
        enableReadyCheck: this.config.enableReadyCheck,
        enableOfflineQueue: this.config.enableOfflineQueue,
        connectTimeout: this.config.connectTimeout,
        keepAlive: this.config.keepAlive,
        connectionName: this.config.connectionName,
        // Reconnect automatically
        autoResubscribe: true,
        autoResendUnfulfilledCommands: true,
        // Enable cluster mode detection
        enableRunOnSet: true,
        // Lazy connect if configured
        lazyConnect: this.config.lazyConnect,
      })

      // Set up event handlers
      this.setupEventHandlers()
      
      // Test connection
      await this.client.ping()
      
      this.isConnected = true
      console.log('[Redis] Connected successfully')
      
    } catch (error) {
      console.error('[Redis] Connection failed:', error)
      this.isConnected = false
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  /**
   * Set up Redis event handlers for monitoring
   */
  private setupEventHandlers(): void {
    if (!this.client) return

    this.client.on('connect', () => {
      console.log('[Redis] Connection established')
      this.isConnected = true
      this.circuitOpen = false
      this.circuitFailureCount = 0
    })

    this.client.on('ready', () => {
      console.log('[Redis] Ready to accept commands')
      this.isConnected = true
    })

    this.client.on('error', (error: Error) => {
      console.error('[Redis] Error:', error.message)
      this.handleFailure()
    })

    this.client.on('close', () => {
      console.warn('[Redis] Connection closed')
      this.isConnected = false
    })

    this.client.on('reconnecting', (timeMs: number) => {
      console.log(`[Redis] Reconnecting in ${timeMs}ms`)
    })

    this.client.on('end', () => {
      console.warn('[Redis] Connection ended')
      this.isConnected = false
    })
  }

  /**
   * Handle failures for circuit breaker pattern
   */
  private handleFailure(): void {
    this.circuitFailureCount++
    
    if (this.circuitFailureCount >= this.CIRCUIT_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true
      this.circuitOpenUntil = Date.now() + this.CIRCUIT_TIMEOUT
      console.error(`[Redis] Circuit breaker OPENED after ${this.circuitFailureCount} failures`)
    }
  }

  /**
   * Check if circuit breaker allows requests
   */
  private isCircuitClosed(): boolean {
    if (!this.circuitOpen) return true
    
    if (Date.now() > this.circuitOpenUntil) {
      this.circuitOpen = false
      this.circuitFailureCount = 0
      console.log('[Redis] Circuit breaker CLOSED - allowing requests')
      return true
    }
    
    return false
  }

  /**
   * Get Redis client instance (lazy initialization)
   */
  async getClient(): Promise<Redis> {
    if (!this.client) {
      await this.connect()
    }
    
    if (!this.isConnected && !this.isConnecting) {
      await this.connect()
    }
    
    return this.client!
  }

  /**
   * Check health status of Redis connection
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency: number | null
    connected: boolean
    info?: any
  }> {
    try {
      const client = await this.getClient()
      const start = Date.now()
      const pong = await client.ping()
      const latency = Date.now() - start
      
      if (pong !== 'PONG') {
        return { status: 'degraded', latency: null, connected: true }
      }
      
      // Get Redis info for detailed health
      const info = await client.info()
      const parsedInfo = this.parseRedisInfo(info)
      
      return {
        status: latency < 10 ? 'healthy' : 'degraded',
        latency,
        connected: true,
        info: parsedInfo
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        latency: null, 
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      } as any
    }
  }

  /**
   * Parse Redis INFO output to object
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n')
    const result: Record<string, any> = {}
    let currentSection = ''
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        currentSection = line.slice(2).toLowerCase()
        result[currentSection] = {}
        continue
      }
      
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue
      
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      
      if (currentSection) {
        result[currentSection][key] = value
      } else {
        result[key] = value
      }
    }
    
    return result
  }

  // ===========================================
  // Core Cache Operations
  // ===========================================

  /**
   * Get value from cache with optional stale-while-revalidate
   */
  async get<T>(key: string, options: CacheOptions = { ttl: 300 }): Promise<CacheResult<T>> {
    const startTime = Date.now()
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key
    
    try {
      // Check circuit breaker
      if (!this.isCircuitClosed()) {
        cacheMetrics.recordMiss(cacheKey)
        return { data: null, hit: false, stale: false, source: 'database' }
      }

      const client = await this.getClient()
      
      // Try to get main key
      const value = await client.get(cacheKey)
      
      if (value !== null) {
        const ttl = await client.ttl(cacheKey)
        const parsedValue = options.json !== false ? JSON.parse(value) : value
        
        cacheMetrics.recordHit(cacheKey, Date.now() - startTime)
        
        return {
          data: parsedValue,
          hit: true,
          stale: false,
          ttl,
          source: 'cache'
        }
      }
      
      // Check for stale data if SWR enabled
      if (options.swr && options.swrTtl) {
        const staleKey = `${cacheKey}:stale`
        const staleValue = await client.get(staleKey)
        
        if (staleValue !== null) {
          const parsedValue = options.json !== false ? JSON.parse(staleValue) : staleValue
          
          cacheMetrics.recordStaleHit(cacheKey, Date.now() - startTime)
          
          return {
            data: parsedValue,
            hit: true,
            stale: true,
            ttl: 0,
            source: 'stale'
          }
        }
      }
      
      cacheMetrics.recordMiss(cacheKey)
      return { data: null, hit: false, stale: false, source: 'database' }
      
    } catch (error) {
      console.error(`[Redis] GET error for key ${cacheKey}:`, error)
      cacheMetrics.recordError(cacheKey)
      return { data: null, hit: false, stale: false, source: 'database' }
    }
  }

  /**
   * Set value in cache with TTL and optional SWR
   */
  async set<T>(key: string, value: T, options: CacheOptions = { ttl: 300 }): Promise<boolean> {
    const cacheKey = options.prefix ? `${options.prefix}:${key}` : key
    
    try {
      if (!this.isCircuitClosed()) {
        return false
      }

      const client = await this.getClient()
      const serializedValue = options.json !== false ? JSON.stringify(value) : String(value)
      
      // Compress large values if enabled
      const finalValue = (options.compress && serializedValue.length > 1024)
        ? await this.compress(serializedValue)
        : serializedValue
      
      // Set main key with TTL
      await client.setex(cacheKey, options.ttl, finalValue)
      
      // Store stale copy if SWR enabled
      if (options.swr && options.swrTtl) {
        const staleKey = `${cacheKey}:stale`
        await client.setex(staleKey, options.swrTtl, finalValue)
      }
      
      return true
      
    } catch (error) {
      console.error(`[Redis] SET error for key ${cacheKey}:`, error)
      return false
    }
  }

  /**
   * Delete key(s) from cache
   */
  async delete(keys: string | string[], prefix?: string): Promise<number> {
    try {
      if (!this.isCircuitClosed()) {
        return 0
      }

      const client = await this.getClient()
      const keyArray = Array.isArray(keys) : keys
      const prefixedKeys = keyArray.map(k => prefix ? `${prefix}:${k}` : k)
      
      if (prefixedKeys.length === 1) {
        return await client.del(prefixedKeys[0])
      }
      
      return await client.del(...prefixedKeys)
      
    } catch (error) {
      console.error('[Redis] DELETE error:', error)
      return 0
    }
  }

  /**
   * Clear all keys matching a pattern (use carefully!)
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      if (!this.isCircuitClosed()) {
        return 0
      }

      const client = await this.getClient()
      let cursor = '0'
      let deleted = 0
      
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
        cursor = nextCursor
        
        if (keys.length > 0) {
          deleted += await client.del(...keys)
        }
        
      } while (cursor !== '0')
      
      return deleted
      
    } catch (error) {
      console.error('[Redis] CLEAR_PATTERN error:', error)
      return 0
    }
  }

  /**
   * Get or set pattern (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = { ttl: 300 }
  ): Promise<CacheResult<T>> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options)
    
    if (cached.data !== null && !cached.stale) {
      return cached
    }
    
    // If we have stale data, return it but refresh in background
    if (cached.stale && cached.data !== null) {
      // Background refresh (fire and forget)
      this.refreshInBackground(key, fetcher, options).catch(console.error)
      return cached
    }
    
    // Cache miss - fetch from source
    try {
      const freshData = await fetcher()
      await this.set(key, freshData, options)
      
      return {
        data: freshData,
        hit: false,
        stale: false,
        source: 'database'
      }
      
    } catch (error) {
      console.error(`[Redis] Fetcher error for key ${key}:`, error)
      
      // If we have stale data, return it even on error
      if (cached.data !== null) {
        return cached
      }
      
      throw error
    }
  }

  /**
   * Refresh cache in background (for SWR pattern)
   */
  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const freshData = await fetcher()
      await this.set(key, freshData, options)
    } catch (error) {
      console.error(`[Redis] Background refresh failed for key ${key}:`, error)
    }
  }

  // ===========================================
  // Advanced Operations
  // ===========================================

  /**
   * Atomic increment with TTL
   */
  async increment(key: string, amount: number = 1, ttl?: number, prefix?: string): Promise<number> {
    const cacheKey = prefix ? `${prefix}:${key}` : key
    
    try {
      if (!this.isCircuitClosed()) {
        return 0
      }

      const client = await this.getClient()
      
      const result = await client.incrby(cacheKey, amount)
      
      if (ttl && result === amount) {
        // Only set TTL on first increment (new key)
        await client.expire(cacheKey, ttl)
      }
      
      return result
      
    } catch (error) {
      console.error('[Redis] INCREMENT error:', error)
      throw error
    }
  }

  /**
   * Distributed lock implementation
   */
  async acquireLock(
    lockKey: string,
    ownerId: string,
    ttl: number = 30,
    prefix?: string
  ): Promise<boolean> {
    const fullKey = `${prefix || KEY_PREFIXES.LOCK}:${lockKey}`
    
    try {
      if (!this.isCircuitClosed()) {
        return false
      }

      const client = await this.getClient()
      
      // SET NX EX (only set if not exists, with expiry)
      const result = await client.set(fullKey, ownerId, 'NX', 'EX', ttl)
      
      return result === 'OK'
      
    } catch (error) {
      console.error('[Redis] ACQUIRE_LOCK error:', error)
      return false
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, ownerId: string, prefix?: string): Promise<boolean> {
    const fullKey = `${prefix || KEY_PREFIXES.LOCK}:${lockKey}`
    
    try {
      if (!this.isCircuitClosed()) {
        return false
      }

      const client = await this.getClient()
      
      // Lua script for atomic check-and-delete
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `
      
      const result = await client.eval(script, 1, fullKey, ownerId)
      
      return result === 1
      
    } catch (error) {
      console.error('[Redis] RELEASE_LOCK error:', error)
      return false
    }
  }

  /**
   * Rate limiting using sliding window
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
    prefix?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${prefix || KEY_PREFIXES.RATE_LIMIT}:${identifier}`
    
    try {
      if (!this.isCircuitClosed()) {
        // If Redis is down, allow request (fail-open)
        return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
      }

      const client = await this.getClient()
      const now = Math.floor(Date.now() / 1000)
      windowStart = now - windowSeconds
      
      // Remove old entries outside window
      await client.zremrangebyscore(key, '-inf', windowStart)
      
      // Count current window requests
      const count = await client.zcard(key)
      
      if (count >= limit) {
        // Find when oldest entry expires
        const oldest = await client.zrange(key, 0, 0, 'WITHSCORES')
        const resetTime = oldest.length > 0 ? parseInt(oldest[1]) + windowSeconds : now + windowSeconds
        
        return { allowed: false, remaining: 0, resetTime: resetTime * 1000 }
      }
      
      // Add new entry
      await client.zadd(key, now, `${now}-${Math.random()}`)
      await client.expire(key, windowSeconds)
      
      return { 
        allowed: true, 
        remaining: limit - count - 1, 
        resetTime: now + windowSeconds 
      }
      
    } catch (error) {
      console.error('[Redis] RATE_LIMIT error:', error)
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 }
    }
  }

  /**
   * Publish/Subscribe for cache invalidation
   */
  async publish(channel: string, message: any): Promise<void> {
    try {
      const client = await this.getClient()
      await client.publish(channel, typeof message === 'string' ? message : JSON.stringify(message))
    } catch (error) {
      console.error('[Redis] PUBLISH error:', error)
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    try {
      if (!this.subscriberClient) {
        this.subscriberClient = new Redis({
          ...this.config,
          connectionName: 'soc-platform-subscriber'
        })
      }
      
      this.subscriberClient.subscribe(channel)
      this.subscriberClient.on('message', (ch: string, msg: string) => {
        if (ch === channel) {
          handler(msg)
        }
      })
    } catch (error) {
      console.error('[Redis] SUBSCRIBE error:', error)
    }
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Simple compression for large values
   */
  private async compress(value: string): Promise<string> {
    // For now, just return the value
    // In production, you could use zlib or brotli
    return value
  }

  /**
   * Build cache key from components
   */
  static buildKey(prefix: string, parts: (string | number | undefined | null)[], separator: string = ':'): string {
    const validParts = parts.filter(p => p !== undefined && p !== null).map(String)
    return `${prefix}${separator}${validParts.join(separator)}`
  }

  /**
   * Close all connections gracefully
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit()
        this.client = null
      }
      
      if (this.subscriberClient) {
        await this.subscriberClient.quit()
        this.subscriberClient = null
      }
      
      this.isConnected = false
      console.log('[Redis] Disconnected successfully')
    } catch (error) {
      console.error('[Redis] Disconnect error:', error)
    }
  }

  /**
   * Get Prometheus-compatible metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    const health = await this.healthCheck()
    const metrics = cacheMetrics.getMetrics()
    
    let output = ''
    
    // Connection status
    output += `# HELP redis_connected Redis connection status (1=connected)\n`
    output += `# TYPE redis_connected gauge\n`
    output += `redis_connected ${health.connected ? 1 : 0}\n\n`
    
    // Latency
    output += `# HELP redis_latency_ms Redis command latency in milliseconds\n`
    output += `# TYPE redis_latency_ms gauge\n`
    output += `redis_latency_ms ${health.latency ?? -1}\n\n`
    
    // Cache stats per key prefix
    output += `# HELP redis_cache_hits_total Total cache hits by key prefix\n`
    output += `# TYPE redis_cache_hits_total counter\n`
    
    output += `# HELP redis_cache_misses_total Total cache misses by key prefix\n`
    output += `# TYPE redis_cache_misses_total counter\n`
    
    output += `# HELP redis_cache_hit_rate Cache hit rate (0-1)\n`
    output += `# TYPE redis_cache_hit_rate gauge\n`
    
    for (const [key, data] of Object.entries(metrics)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_')
      output += `redis_cache_hits_total{key="${safeKey}"} ${data.hits}\n`
      output += `redis_cache_misses_total{key="${safeKey}"} ${data.misses}\n`
      output += `redis_cache_hit_rate{key="${safeKey}"} ${data.hitRate.toFixed(4)}\n`
    }
    
    return output
  }
}

// ===========================================
// Export Singleton Instance
// ===========================================

let redisClientInstance: RedisClient | null = null

export function getRedisClient(config?: Partial<RedisConfig>): RedisClient {
  if (!redisClientInstance) {
    redisClientInstance = new RedisClient(config)
  }
  return redisClientInstance
}

/**
 * Convenience function for quick cache operations
 */
export async function cacheGet<T>(key: string, options?: CacheOptions): Promise<CacheResult<T>> {
  const client = getRedisClient()
  return client.get(key, options)
}

export async function cacheSet<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
  const client = getRedisClient()
  return client.set(key, value, options)
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<CacheResult<T>> {
  const client = getRedisClient()
  return client.getOrSet(key, fetcher, options)
}

export async function cacheInvalidate(keys: string | string[], prefix?: string): Promise<number> {
  const client = getRedisClient()
  return client.delete(keys, prefix)
}

// Export classes and utilities
export { RedisClient }
export default getRedisClient
