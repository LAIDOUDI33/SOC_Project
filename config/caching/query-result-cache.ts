/**
 * Djezzy SOC Platform - Database Query Result Caching
 * 
 * Intelligent caching layer for database queries:
 * - Automatic cache key generation from query parameters
 * - Result set size limits for memory efficiency
 * - Query pattern detection for optimization hints
 * - Integration with Redis cluster for distributed caching
 */

import { initCacheRedis } from './api-response-caching';
import { CacheTags } from './api-response-caching';

// ============================================================
// TYPES
// ============================================================

interface QueryCacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Maximum result set size to cache (rows) */
  maxRows?: number;
  /** Tags for invalidation */
  tags?: string[];
  /** Compress large results */
  compress?: boolean;
  /** Skip caching null/empty results */
  skipEmpty?: boolean;
  /** Enable query result hashing for integrity */
  verifyHash?: boolean;
}

interface CachedQueryResult<T = unknown> {
  data: T;
  rowCount: number;
  queryHash: string;
  timestamp: number;
  executionTimeMs: number;
  schemaVersion?: string;
}

interface QueryPatternStats {
  queryPattern: string;
  hitCount: number;
  missCount: number;
  avgExecutionTime: number;
  lastExecuted: Date;
  suggestedTTL: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_OPTIONS: Required<QueryCacheOptions> = {
  ttl: 300,           // 5 minutes default
  maxRows: 10000,     // Don't cache results larger than 10K rows
  tags: [],
  compress: true,
  skipEmpty: false,
  verifyHash: true,
};

const QUERY_CACHE_PREFIX = 'soc:query:';
const QUERY_PATTERN_STATS = new Map<string, QueryPatternStats>();
const MAX_PATTERN_STATS = 1000;

// ============================================================
// CACHE KEY GENERATION FOR QUERIES
// ============================================================

/**
 * Generate a deterministic cache key from query parameters
 * 
 * @param table - Table name being queried
 * @param where - Where clause conditions (normalized)
 * @param options - Query options (select, orderBy, etc.)
 * @param pagination - Limit/offset for pagination
 */
export function generateQueryCacheKey(params: {
  table: string;
  where?: Record<string, unknown>;
  select?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: Record<string, boolean>;
}): string {
  const normalized = normalizeQueryParams(params);
  return `${QUERY_CACHE_PREFIX}${params.table}:${hashObject(normalized)}`;
}

/**
 * Normalize query parameters for consistent key generation
 */
function normalizeQueryParams(params: {
  table: string;
  where?: Record<string, unknown>;
  select?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  include?: Record<string, boolean>;
}): string {
  // Sort all keys for deterministic output
  const sorted = {
    t: params.table,
    w: params.where ? sortObjectKeys(params.where) : undefined,
    s: params.select?.sort(),
    o: params.orderBy?.map(o => `${o.field}:${o.direction}`).sort(),
    l: params.limit,
    off: params.offset,
    i: params.include ? sortObjectKeys(params.include) : undefined,
  };
  
  return JSON.stringify(sorted);
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {} as Record<string, unknown>);
}

/**
 * Simple hash function for objects
 */
function hashObject(obj: string): string {
  let hash = 0;
  for (let i = 0; i < obj.length; i++) {
    const char = obj.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Extract query pattern for statistics (without values)
 */
function extractQueryPattern(table: string, where?: Record<string, unknown>): string {
  if (!where) return `${table}:all`;
  
  const keys = Object.keys(where).sort().join(',');
  return `${table}:${keys}`;
}

// ============================================================
// MAIN QUERY CACHE FUNCTION
// ============================================================

/**
 * Execute a cached database query
 * 
 * @example
 * ```typescript
 * const alerts = await cachedQuery(
 *   () => prisma.alert.findMany({ where: { status: 'active' }, take: 50 }),
 *   'alerts',
 *   { where: { status: 'active' }, take: 50 },
 *   { ttl: 60, tags: [CacheTags.ALERTS] }
 * );
 * ```
 */
export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  params: {
    table: string;
    where?: Record<string, unknown>;
    select?: string[];
    limit?: number;
  },
  options: QueryCacheOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = generateQueryCacheKey(params);
  const pattern = extractQueryPattern(params.table, params.where);

  try {
    // Try to get from cache
    const cached = await getCachedResult<T>(cacheKey);
    
    if (cached) {
      updatePatternStats(pattern, true, 0);
      return cached.data;
    }

    // Cache miss - execute query
    const startTime = Date.now();
    const result = await queryFn();
    const executionTime = Date.now() - startTime;

    // Update pattern stats
    updatePatternStats(pattern, false, executionTime);

    // Determine if we should cache this result
    const shouldCache = shouldCacheResult(result, opts);
    
    if (shouldCache) {
      await cacheResult(cacheKey, result as unknown[], executionTime, opts);
    }

    return result;

  } catch (error) {
    console.error('[QueryCache] Error executing cached query:', error);
    
    // On error, still execute original function
    return queryFn();
  }
}

// ============================================================
// CACHE OPERATIONS
// ============================================================

async function getCachedResult<T>(cacheKey: string): Promise<CachedQueryResult<T> | null> {
  try {
    const redis = initCacheRedis();
    const raw = await redis.get(cacheKey);
    
    if (!raw) return null;
    
    const parsed: CachedQueryResult<T> = JSON.parse(raw);
    
    // Verify integrity if enabled
    if (parsed.queryHash && parsed.data) {
      const currentHash = hashObject(JSON.stringify(parsed.data));
      if (currentHash !== parsed.queryHash) {
        console.warn('[QueryCache] Hash mismatch, ignoring cached result');
        return null;
      }
    }
    
    return parsed;
  } catch (error) {
    console.warn('[QueryCache] Get error:', error);
    return null;
  }
}

async function cacheResult<T>(
  cacheKey: string,
  data: T[],
  executionTime: number,
  options: Required<QueryCacheOptions>
): Promise<void> {
  try {
    const redis = initCacheRedis();
    
    const cachedResult: CachedQueryResult<T[]> = {
      data,
      rowCount: Array.isArray(data) ? data.length : 1,
      queryHash: options.verifyHash ? hashObject(JSON.stringify(data)) : '',
      timestamp: Date.now(),
      executionTimeMs: executionTime,
    };
    
    const serialized = JSON.stringify(cachedResult);
    
    // Use compression for large results
    if (options.compress && serialized.length > 10240) {
      // In production, use proper compression like gzip/zstd
      // For now, just store as-is with a flag
      await redis.setex(
        cacheKey + ':compressed',
        options.ttl,
        serialized
      );
    } else {
      await redis.setex(cacheKey, options.ttl, serialized);
    }

    // Add tag associations
    if (options.tags.length > 0) {
      const pipeline = redis.pipeline();
      for (const tag of options.tags) {
        pipeline.sadd(`soc:tag:${tag}`, cacheKey);
      }
      await pipeline.exec();
    }

  } catch (error) {
    console.warn('[QueryCache] Set error:', error);
  }
}

function shouldCacheResult<T>(result: T, options: Required<QueryCacheOptions>): boolean {
  // Skip empty results if configured
  if (options.skipEmpty) {
    if (Array.isArray(result) && result.length === 0) return false;
    if (result === null || result === undefined) return false;
  }

  // Check row count limit
  if (Array.isArray(result) && result.length > options.maxRows) {
    console.warn(`[QueryCache] Result too large to cache (${result.length} rows)`);
    return false;
  }

  return true;
}

// ============================================================
// PATTERN STATISTICS & OPTIMIZATION HINTS
// ============================================================

function updatePatternStats(
  pattern: string,
  isHit: boolean,
  executionTime: number
): void {
  let stats = QUERY_PATTERN_STATS.get(pattern);
  
  if (!stats) {
    // Evict oldest entry if at capacity
    if (QUERY_PATTERN_STATS.size >= MAX_PATTERN_STATS) {
      const firstKey = QUERY_PATTERN_STATS.keys().next().value;
      QUERY_PATTERN_STATS.delete(firstKey);
    }
    
    stats = {
      queryPattern: pattern,
      hitCount: 0,
      missCount: 0,
      avgExecutionTime: 0,
      lastExecuted: new Date(),
      suggestedTTL: 300,
    };
    
    QUERY_PATTERN_STATS.set(pattern, stats);
  }

  if (isHit) {
    stats.hitCount++;
  } else {
    stats.missCount++;
    
    // Update average execution time
    if (executionTime > 0) {
      const totalOps = stats.hitCount + stats.missCount;
      stats.avgExecutionTime = (
        (stats.avgExecutionTime * (totalOps - 1) + executionTime) / totalOps
      );
      
      // Suggest TTL based on execution time
      if (stats.avgExecutionTime > 1000) {
        stats.suggestedTTL = 600; // Slow queries get longer TTL
      } else if (stats.avgExecutionTime > 500) {
        stats.suggestedTTL = 300;
      } else if (stats.avgExecutionTime > 100) {
        stats.suggestedTTL = 120;
      } else {
        stats.suggestedTTL = 60; // Fast queries can have shorter TTL
      }
    }
  }
  
  stats.lastExecuted = new Date();
}

/**
 * Get query performance statistics
 */
export function getQueryStats(): QueryPatternStats[] {
  return Array.from(QUERY_PATTERN_STATS.values())
    .sort((a, b) => (b.hitCount + b.missCount) - (a.hitCount + a.missCount))
    .slice(0, 50); // Top 50 patterns
}

/**
 * Get queries that would benefit most from caching
 */
export function getCacheOptimizationCandidates(): QueryPatternStats[] {
  return Array.from(QUERY_PATTERN_STATS.values())
    .filter(s => s.missCount > 10 && s.avgExecutionTime > 100)
    .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
    .slice(0, 20);
}

// ============================================================
// INVALIDATION HELPERS
// ============================================================

/**
 * Invalidate cached results for a specific table
 */
export async function invalidateTableCache(table: string): Promise<number> {
  try {
    const redis = initCacheRedis();
    
    // Find all keys matching this table
    const keys = [];
    const stream = redis.scanStream({
      match: `${QUERY_CACHE_PREFIX}${table}:*`,
      count: 100,
    });
    
    for await (const key of stream) {
      keys.push(key);
    }
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return keys.length;
  } catch (error) {
    console.error('[QueryCache] Invalidation error:', error);
    return 0;
  }
}

/**
 * Pre-warm cache for common queries
 */
export async function prewarmCache(
  queries: Array<{
    key: string;
    fn: () => Promise<unknown>;
    options?: QueryCacheOptions;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Execute in parallel batches
  const batchSize = 10;
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(async ({ key, fn, options }) => {
        const result = await fn();
        await cacheResult(key, result as unknown[], 0, {
          ...DEFAULT_OPTIONS,
          ...options,
        });
      })
    );

    results.forEach(r => {
      if (r.status === 'fulfilled') success++;
      else failed++;
    });

    // Small delay between batches
    if (i + batchSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { success, failed };
}

// Export types and utilities
export type { QueryCacheOptions, CachedQueryResult, QueryPatternStats };
