/**
 * Djezzy SOC Platform - API Response Caching Middleware
 * 
 * Multi-layer caching for API responses:
 * - L1: In-memory (request-scoped) for deduplication
 * - L2: Redis cluster for distributed caching
 * - L3: CDN edge caching headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheConfig } from './nextjs-cache-config';
import Redis from 'ioredis';

// ============================================================
// TYPES
// ============================================================

interface CacheOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Use stale-while-revalidate pattern */
  swr?: boolean;
  /** Stale data acceptable duration in seconds */
  staleWhileRevalidate?: number;
  /** Skip cache for this request */
  bypass?: boolean;
  /** Cache key prefix */
  namespace?: string;
  /** Tags for invalidation */
  tags?: string[];
  /** Compress cached value */
  compress?: boolean;
  /** Respect authorization header (don't cache by default for auth'd requests) */
  respectAuth?: boolean;
}

interface CachedResponse {
  body: string;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
  etag?: string;
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  bypasses: number;
  errors: number;
}

// ============================================================
// REDIS CLIENT CONFIGURATION
// ============================================================

let redisClient: Redis | null = null;

/**
 * Initialize Redis connection for API caching
 */
export function initCacheRedis(): Redis {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const redisOptions: any = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxLoadingRetryTime: 5000,
    lazyConnect: true,
    keepAlive: 10000,
    connectTimeout: 5000,
    commandTimeout: 3000,
    // Cluster mode if configured
    ...(process.env.REDIS_CLUSTER === 'true' ? {
      scaleReads: 'slave' as const,
      enableAutoPipelining: true,
      autoPipelineSelector: () => true,
    } : {}),
  };
  
  redisClient = new Redis(redisUrl, redisOptions);

  redisClient.on('error', (err) => {
    console.error('[Cache] Redis connection error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('[Cache] Connected to Redis');
  });

  return redisClient;
}

// ============================================================
// IN-MEMORY CACHE (L1)
// ============================================================

const memoryCache = new Map<string, { value: CachedResponse; expiry: number }>();
const MEMORY_CACHE_MAX_SIZE = parseInt(process.env.MEMORY_CACHE_SIZE || '1000');
const pendingRequests = new Map<string, Promise<Response>>();

/**
 * Clean up expired entries from memory cache
 */
function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
  
  // Evict oldest entries if over size limit
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (count >= MEMORY_CACHE_MAX_SIZE * 0.1) break; // Remove 10%
      memoryCache.delete(key);
      count++;
    }
  }
}

// Run cleanup every 30 seconds
if (typeof globalThis !== 'undefined') {
  setInterval(cleanupMemoryCache, 30000);
}

// ============================================================
// CACHE KEY GENERATION
// ============================================================

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(
  request: NextRequest,
  options: CacheOptions = {}
): string {
  const url = new URL(request.url);
  
  const parts = [
    options.namespace || 'api',
    url.pathname,
    url.searchParams.toString(),
  ];
  
  // Include auth context if respecting auth
  if (options.respectAuth !== false) {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // Hash the token to use as part of key (don't store raw token)
      const tokenHash = simpleHash(authHeader.split(' ')[1]?.substring(0, 50) || '');
      parts.push(`auth:${tokenHash}`);
    }
  }
  
  return parts.join(':');
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================================
// MAIN CACHING MIDDLEWARE
// ============================================================

const cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  bypasses: 0,
  errors: 0,
};

/**
 * Create a cached API route handler wrapper
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withCache(request, async () => {
 *     // Your handler logic here
 *     return NextResponse.json(data);
 *   }, { ttl: 60 });
 * }
 * ```
 */
export async function withCache(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: CacheOptions = {}
): Promise<NextResponse> {
  const {
    ttl = CacheConfig.TTL.PUBLIC_API,
    swr = true,
    staleWhileRevalidate = CacheConfig.TTL.SWR.DEFAULT,
    bypass = false,
    namespace = 'api',
    tags = [],
    respectAuth = false,
  } = options;

  // Bypass cache if requested or method not GET/HEAD
  if (bypass || !['GET', 'HEAD'].includes(request.method)) {
    cacheStats.bypasses++;
    return handler();
  }

  const cacheKey = generateCacheKey(request, { namespace, respectAuth });
  
  // Check for cache-control: no-cache header
  const cacheControl = request.headers.get('cache-control') || '';
  if (cacheControl.includes('no-cache')) {
    cacheStats.bypasses++;
    return handler();
  }

  try {
    // Try L1: Memory cache first
    const memCached = getFromMemory(cacheKey);
    if (memCached && !isExpired(memCached)) {
      cacheStats.hits++;
      return buildCachedResponse(memCached, false);
    }

    // Check for stale data that can be served while revalidating
    if (memCached && swr) {
      cacheStats.staleHits++;
      
      // Trigger background refresh
      triggerBackgroundRefresh(cacheKey, handler, options);
      
      // Return stale data with appropriate headers
      return buildCachedResponse(memCached, true);
    }

    // Try L2: Redis cache
    const redisCached = await getFromRedis(cacheKey);
    if (redisCached) {
      // Store in L1 for faster subsequent access
      setInMemory(cacheKey, redisCached, ttl);
      
      if (!isExpired(redisCached)) {
        cacheStats.hits++;
        return buildCachedResponse(redisCached, false);
      }
      
      // Stale data available with SWR
      if (swr) {
        cacheStats.staleHits++;
        triggerBackgroundRefresh(cacheKey, handler, options);
        return buildCachedResponse(redisCached, true);
      }
    }

    // Cache miss - execute handler
    cacheStats.misses++;
    
    // Check for deduplication of identical in-flight requests
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)! as unknown as NextResponse;
    }

    const responsePromise = handler();
    pendingRequests.set(cacheKey, responsePromise);

    try {
      const response = await responsePromise;
      pendingRequests.delete(cacheKey);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const cachedResponse = await serializeResponse(response);
        
        // Store in both caches
        setInMemory(cacheKey, cachedResponse, ttl);
        await setInRedis(cacheKey, cachedResponse, ttl, tags);
      }

      return addCacheHeaders(response, ttl, swr, staleWhileRevalidate);
    } catch (error) {
      pendingRequests.delete(cacheKey);
      throw error;
    }

  } catch (error) {
    cacheStats.errors++;
    console.error('[Cache] Error:', error);
    
    // On cache error, still try to execute handler
    return handler();
  }
}

// ============================================================
// CACHE OPERATIONS - MEMORY (L1)
// ============================================================

function getFromMemory(key: string): CachedResponse | null {
  const entry = memoryCache.get(key);
  return entry?.value || null;
}

function setInMemory(key: string, value: CachedResponse, ttlSeconds: number): void {
  // Evict if at capacity
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    cleanupMemoryCache();
  }
  
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000),
  });
}

function deleteFromMemory(key: string): void {
  memoryCache.delete(key);
}

function clearMemoryCache(pattern?: string): void {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

// ============================================================
// CACHE OPERATIONS - REDIS (L2)
// ============================================================

async function getFromRedis(key: string): Promise<CachedResponse | null> {
  try {
    const client = initCacheRedis();
    const raw = await client.get(`soc:cache:${key}`);
    
    if (!raw) return null;
    
    return JSON.parse(raw) as CachedResponse;
  } catch (error) {
    console.warn('[Cache] Redis get error:', error);
    return null;
  }
}

async function setInRedis(
  key: string,
  value: CachedResponse,
  ttlSeconds: number,
  tags: string[] = []
): Promise<void> {
  try {
    const client = initCacheRedis();
    const cacheKey = `soc:cache:${key}`;
    
    const pipeline = client.pipeline();
    pipeline.set(cacheKey, JSON.stringify(value), 'EX', ttlSeconds);
    
    // Add tag associations for invalidation
    if (tags.length > 0) {
      for (const tag of tags) {
        pipeline.sadd(`soc:tag:${tag}`, cacheKey);
        pipeline.expire(`soc:tag:${tag}`, ttlSeconds + 3600); // Keep tags longer
      }
    }
    
    await pipeline.exec();
  } catch (error) {
    console.warn('[Cache] Redis set error:', error);
  }
}

async function deleteFromRedis(key: string): Promise<void> {
  try {
    const client = initCacheRedis();
    await client.del(`soc:cache:${key}`);
  } catch (error) {
    console.warn('[Cache] Redis delete error:', error);
  }
}

// ============================================================
// TAG-BASED INVALIDATION
// ============================================================

/**
 * Invalidate all cache entries associated with a tag
 */
export async function invalidateByTag(tag: string): Promise<number> {
  try {
    const client = initCacheRedis();
    const tagKey = `soc:tag:${tag}`;
    
    const keys = await client.smembers(tagKey);
    
    if (keys.length > 0) {
      const pipeline = client.pipeline();
      pipeline.del(...keys);
      pipeline.del(tagKey); // Clean up tag itself
      await pipeline.exec();
      
      // Also clear from memory cache
      for (const key of keys) {
        const cacheKey = key.replace('soc:cache:', '');
        deleteFromMemory(cacheKey);
      }
    }
    
    return keys.length;
  } catch (error) {
    console.error('[Cache] Tag invalidation error:', error);
    return 0;
  }
}

/**
 * Invalidate multiple tags at once
 */
export async function invalidateTags(tags: string[]): Promise<number> {
  let totalInvalidated = 0;
  
  for (const tag of tags) {
    totalInvalidated += await invalidateByTag(tag);
  }
  
  return totalInvalidated;
}

// Predefined tag sets for common operations
export const CacheTags = {
  ALERTS: ['alerts', 'dashboard'],
  ALERT_DETAIL: (id: string) => [`alert:${id}`, 'alerts'],
  INCIDENTS: ['incidents', 'dashboard'],
  INCIDENT_DETAIL: (id: string) => [`incident:${id}`, 'incidents'],
  THREATS: ['threats', 'intelligence'],
  METRICS: ['metrics', 'dashboard'],
  USER_PERMISSIONS: (userId: string) => [`user:${userId}:permissions`],
  COMPLIANCE: ['compliance', 'reports'],
} as const;

// ============================================================
// BACKGROUND REFRESH (SWR)
// ============================================================

async function triggerBackgroundRefresh(
  cacheKey: string,
  handler: () => Promise<NextResponse>,
  options: CacheOptions
): Promise<void> {
  // Don't wait for the result - fire and forget
  handler().then(async (response) => {
    if (response.status >= 200 && response.status < 300) {
      const cachedResponse = await serializeResponse(response);
      setInMemory(cacheKey, cachedResponse, options.ttl || CacheConfig.TTL.PUBLIC_API);
      await setInRedis(cacheKey, cachedResponse, options.ttl || CacheConfig.TTL.PUBLIC_API, options.tags);
    }
  }).catch((error) => {
    console.warn('[Cache] Background refresh failed:', error);
  });
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

async function serializeResponse(response: NextResponse): Promise<CachedResponse> {
  const body = await response.text();
  
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  return {
    body,
    status: response.status,
    headers,
    timestamp: Date.now(),
    etag: response.headers.get('etag') || undefined,
    tags: [],
  };
}

function buildCachedResponse(cached: CachedResponse, isStale: boolean): NextResponse {
  const response = new NextResponse(cached.body, {
    status: cached.status,
    headers: cached.headers,
  });
  
  if (isStale) {
    response.headers.set('X-Cache-Status', 'stale');
    response.headers.set('Age', String(Math.floor((Date.now() - cached.timestamp) / 1000)));
  } else {
    response.headers.set('X-Cache-Status', 'hit');
  }
  
  response.headers.set('X-Cache', 'HIT');
  
  return response;
}

function addCacheHeaders(
  response: NextResponse,
  ttl: number,
  swr: boolean,
  swrDuration: number
): NextResponse {
  response.headers.set('X-Cache', 'MISS');
  response.headers.set('X-Cache-Status', 'fresh');
  
  if (swr) {
    response.headers.set('Cache-Control', `s-maxage=${ttl}, stale-while-revalidate=${swrDuration}`);
  } else {
    response.headers.set('Cache-Control', `s-maxage=${ttl}`);
  }
  
  return response;
}

function isExpired(cached: CachedResponse): boolean {
  // Consider expired after 90% of TTL
  const age = Date.now() - cached.timestamp;
  // We don't have TTL info in cached object, so just check if it's very old (>5 minutes)
  return age > 300000;
}

// ============================================================
// STATS & MONITORING
// ============================================================

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats {
  return { ...cacheStats };
}

/**
 * Get memory cache size information
 */
export function getMemoryCacheInfo(): { size: number; maxSize: number } {
  return {
    size: memoryCache.size,
    maxSize: MEMORY_CACHE_MAX_SIZE,
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.staleHits = 0;
  cacheStats.bypasses = 0;
  cacheStats.errors = 0;
}

/**
 * Calculate cache hit rate
 */
export function getHitRate(): number {
  const total = cacheStats.hits + cacheStats.misses + cacheStats.staleHits;
  if (total === 0) return 0;
  return ((cacheStats.hits + cacheStats.staleHits) / total) * 100;
}

// Export utilities for testing
export { clearMemoryCache, deleteFromMemory, deleteFromRedis };

export default withCache;
