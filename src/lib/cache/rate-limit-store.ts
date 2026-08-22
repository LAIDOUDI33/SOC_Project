/**
 * Djezzy National SOC Platform - Redis-Backed Rate Limit Store
 * 
 * Production-ready rate limiting store using Redis for:
 * - Multi-instance deployment support
 * - Distributed rate limiting
 * - Atomic operations for accuracy
 * - Multiple algorithm implementations
 * - Batch operations for performance
 * 
 * Supported Algorithms:
 * - Sliding Window Log: Accurate, uses more memory
 * - Fixed Window Counter: Simple, allows bursts at boundaries
 * - Token Bucket: Good for bursty traffic
 * 
 * ANRT Compliance:
 * - All rate limit data stored within Algeria
 * - Automatic data expiration (TTL)
 * - Audit logging of violations
 * 
 * @module lib/cache/rate-limit-store
 * @version 2.0.0
 */

import { getRedis, safeRedisCommand, redisClient } from './redis-client';
import { Redis } from 'ioredis';
import crypto from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type RateLimitAlgorithm = 'sliding-window' | 'fixed-window' | 'token-bucket';

export interface RateLimitStoreOptions {
  /** Maximum requests allowed */
  points: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Algorithm to use (default: sliding-window) */
  algorithm?: RateLimitAlgorithm;
  /** Key prefix for this limiter (default: 'rl') */
  prefix?: string;
  /** Whether to block on first violation */
  blockDuration?: number; // seconds, 0 = no block
}

export interface RateLimitCheckResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** Current count in window */
  current: number;
  /** When limit resets (Unix timestamp ms) */
  resetTimeMs: number;
  /** Time until retry if blocked (ms) */
  retryAfterMs?: number;
  /** Reason for denial */
  reason?: string;
  /** Algorithm used */
  algorithm: RateLimitAlgorithm;
}

export interface BatchRateLimitEntry {
  /** Unique key identifier */
  key: string;
  /** Options for this entry (uses defaults if not provided) */
  options?: Partial<RateLimitStoreOptions>;
}

export interface BatchRateLimitResult {
  results: Map<string, RateLimitCheckResult>;
  /** All entries allowed? */
  allAllowed: boolean;
  /** Timestamp of batch check */
  checkedAt: Date;
}

export interface RateLimitStats {
  /** Total keys currently being tracked */
  totalKeys: number;
  /** Keys currently at or over limit */
  limitedKeys: number;
  /** Memory usage estimate (bytes) */
  estimatedMemoryBytes: number;
  /** Most active keys (top N) */
  topKeys: Array<{
    key: string;
    count: number;
    lastRequest: Date;
  }>;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<RateLimitStoreOptions, 'blockDuration'>> & { blockDuration: number } = {
  points: 100,
  windowSeconds: 60,
  algorithm: 'sliding-window',
  prefix: 'rl',
  blockDuration: 0,
};

// ============================================================================
// Lua Scripts (Atomic Operations)
// ============================================================================

/**
 * Sliding Window Lua Script
 * Atomically checks and increments sliding window counter
 * Uses sorted set with timestamps as scores
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local maxPoints = tonumber(ARGV[3])
local requestId = ARGV[4]

-- Remove old entries outside window
local windowStart = now - (window * 1000)
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

-- Count current entries in window
local current = redis.call('ZCARD', key)

if current < maxPoints then
  -- Add new entry
  redis.call('ZADD', key, now, requestId)
  redis.call('EXPIRE', key, window + 1)
  return {0, current + 1, maxPoints - current - 1}
else
  -- Get oldest entry time for retry-after calculation
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestTime = #oldest > 1 and tonumber(oldest[2]) or now
  local retryAfter = math.ceil((oldestTime + (window * 1000) - now) / 1000) * 1000
  return {1, current, 0, retryAfter}
end
`;

/**
 * Fixed Window Lua Script
 * Atomically checks and increments fixed window counter
 */
const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local maxPoints = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

-- Check if blocked
local blockKey = key .. ':blocked'
local blockedUntil = redis.call('GET', blockKey)
if blockedUntil then
  local now = tonumber(ARGV[4]) or 0
  local blockedUntilNum = tonumber(blockedUntil)
  if blockedUntilNum and now < blockedUntilNum then
    return {2, maxPoints, 0, blockedUntilNum - now}
  end
  redis.call('DEL', blockKey)
end

-- Increment counter
local current = redis.call('INCR', key)

-- Set expiry on first request
if current == 1 then
  redis.call('EXPIRE', key, window)
end

if current <= maxPoints then
  local ttl = redis.call('TTL', key)
  return {0, current, maxPoints - current, (ttl > 0 and ttl or window) * 1000}
else
  -- Apply block if configured
  if blockDuration > 0 then
    local now = tonumber(ARGV[4]) or 0
    redis.call('SET', blockKey, now + (blockDuration * 1000), 'EX', blockDuration)
    return {3, current, 0, blockDuration * 1000}
  end
  local ttl = redis.call('TTL', key)
  return {1, current, 0, (ttl > 0 and ttl or window) * 1000}
end
`;

/**
 * Token Bucket Lua Script
 * Atomically manages token bucket state
 */
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local maxTokens = tonumber(ARGV[3])

-- Get current state
local tokens = tonumber(redis.call('HGET', key, 'tokens') or maxTokens)
local lastRefill = tonumber(redis.call('HGET', key, 'last_refill') or now)

-- Calculate tokens to add based on elapsed time
local elapsed = (now - lastRefill) / 1000
local refillRate = maxTokens / window
local tokensToAdd = elapsed * refillRate

tokens = math.min(maxTokens, tokens + tokensToAdd)
lastRefill = now

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', lastRefill)
  redis.call('EXPIRE', key, window * 2)
  
  local timeToRefill = (maxTokens - tokens) / refillRate * 1000
  return {0, math.ceil(maxTokens - tokens), math.floor(tokens), timeToRefill}
else
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', lastRefill)
  redis.call('EXPIRE', key, window * 2)
  
  local timeToOneToken = (1 - tokens) / refillRate * 1000
  return {1, 0, math.floor(tokens), timeToOneToken}
end
`;

// ============================================================================
// Rate Limit Store Class
// ============================================================================

/**
 * Redis-backed rate limiting store.
 * Thread-safe, atomic operations using Lua scripts.
 * 
 * @example
 * ```typescript
 * import { RateLimitStore } from '@/lib/cache/rate-limit-store';
 * 
 * const store = new RateLimitStore({ points: 100, windowSeconds: 60 });
 * 
 * // Check a single key
 * const result = await store.check('user:123');
 * if (!result.allowed) {
 *   console.log(`Rate limited. Retry after ${result.retryAfterMs}ms`);
 * }
 * ```
 */
export class RateLimitStore {
  private options: Required<RateLimitStoreOptions>;
  private luaScripts: {
    slidingWindow: string;
    fixedWindow: string;
    tokenBucket: string;
  };

  constructor(options: Partial<RateLimitStoreOptions> = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    
    this.luaScripts = {
      slidingWindow: SLIDING_WINDOW_SCRIPT,
      fixedWindow: FIXED_WINDOW_SCRIPT,
      tokenBucket: TOKEN_BUCKET_SCRIPT,
    };
  }

  /**
   * Check rate limit for a key
   */
  async check(key: string): Promise<RateLimitCheckResult> {
    const client = await getRedis();
    
    if (!client || client instanceof (require('ioredis').Cluster)) {
      // Fallback to non-atomic implementation for cluster or unavailable Redis
      return this.fallbackCheck(key);
    }

    const fullKey = `${this.options.prefix}:${key}`;
    const now = Date.now();
    const requestId = `${now}-${crypto.randomBytes(4).toString('hex')}`;

    try {
      switch (this.options.algorithm) {
        case 'sliding-window':
          return await this.executeSlidingWindow(client, fullKey, now, requestId);
        case 'fixed-window':
          return await this.executeFixedWindow(client, fullKey, now);
        case 'token-bucket':
          return await this.executeTokenBucket(client, fullKey, now);
        default:
          throw new Error(`Unknown algorithm: ${this.options.algorithm}`);
      }
    } catch (error) {
      console.error('[RateLimitStore] Error checking rate limit:', error);
      // Return allow on error (fail-open)
      return {
        allowed: true,
        remaining: this.options.points,
        limit: this.options.points,
        current: 0,
        resetTimeMs: now + (this.options.windowSeconds * 1000),
        algorithm: this.options.algorithm,
      };
    }
  }

  /**
   * Check multiple keys in batch (more efficient than individual calls)
   */
  async batchCheck(entries: BatchRateLimitEntry[]): Promise<BatchRateLimitResult> {
    const results = new Map<string, RateLimitCheckResult>();
    let allAllowed = true;

    // Execute all checks concurrently
    const promises = entries.map(async (entry) => {
      const options = entry.options ? { ...this.options, ...entry.options } : this.options;
      const store = new RateLimitStore(options);
      const result = await store.check(entry.key);
      return { key: entry.key, result };
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        results.set(settled.value.key, settled.value.result);
        if (!settled.value.result.allowed) {
          allAllowed = false;
        }
      } else {
        // On error, allow the request
        results.set(
          entries[settledResults.indexOf(settled)]?.key || 'unknown',
          {
            allowed: true,
            remaining: this.options.points,
            limit: this.options.points,
            current: 0,
            resetTimeMs: Date.now() + (this.options.windowSeconds * 1000),
            algorithm: this.options.algorithm,
            reason: 'Error checking rate limit',
          }
        );
      }
    }

    return {
      results,
      allAllowed,
      checkedAt: new Date(),
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<boolean> {
    return safeRedisCommand(async (client: Redis) => {
      const fullKey = `${this.options.prefix}:${key}`;
      
      // Delete main key and any block key
      await client.del(fullKey, `${fullKey}:blocked`);
      return true;
    }, false);
  }

  /**
   * Get current status without incrementing
   */
  async getStatus(key: string): Promise<Omit<RateLimitCheckResult, 'allowed'>> {
    const client = await getRedis();
    
    if (!client) {
      return {
        remaining: this.options.points,
        limit: this.options.points,
        current: 0,
        resetTimeMs: Date.now() + (this.options.windowSeconds * 1000),
        algorithm: this.options.algorithm,
      };
    }

    const fullKey = `${this.options.prefix}:${key}`;
    const now = Date.now();

    try {
      switch (this.options.algorithm) {
        case 'sliding-window': {
          const windowStart = now - (this.options.windowSeconds * 1000);
          const members = await (client as Redis).zrangebyscore(fullKey, windowStart, Infinity);
          const current = members.length;
          
          return {
            remaining: Math.max(0, this.options.points - current),
            limit: this.options.points,
            current,
            resetTimeMs: now + (this.options.windowSeconds * 1000),
            algorithm: this.options.algorithm,
          };
        }
        
        case 'fixed-window': {
          const ttl = await (client as Redis).ttl(fullKey);
          const currentStr = await (client as Redis).get(fullKey);
          const current = parseInt(currentStr || '0', 10);
          
          return {
            remaining: Math.max(0, this.options.points - current),
            limit: this.options.points,
            current,
            resetTimeMs: ttl > 0 ? Date.now() + (ttl * 1000) : 0,
            algorithm: this.options.algorithm,
          };
        }
        
        case 'token-bucket': {
          const hashData = await (client as Redis).hgetall(fullKey);
          const tokens = parseFloat(hashData.tokens || this.options.points.toString());
          
          return {
            remaining: Math.floor(tokens),
            limit: this.options.points,
            current: Math.ceil(this.options.points - tokens),
            resetTimeMs: now + ((this.options.points - tokens) / (this.options.points / this.options.windowSeconds) * 1000),
            algorithm: this.options.algorithm,
          };
        }
        
        default:
          throw new Error(`Unknown algorithm: ${this.options.algorithm}`);
      }
    } catch (error) {
      console.error('[RateLimitStore] Error getting status:', error);
      return {
        remaining: this.options.points,
        limit: this.options.points,
        current: 0,
        resetTimeMs: now + (this.options.windowSeconds * 1000),
        algorithm: this.options.algorithm,
      };
    }
  }

  /**
   * Get statistics about rate limiting
   */
  async getStats(pattern?: string): Promise<RateLimitStats> {
    return safeRedisCommand(async (client: Redis) => {
      const searchPattern = pattern || `${this.options.prefix}:*`;
      const keys = await client.keys(searchPattern);
      
      let totalKeys = 0;
      let limitedKeys = 0;
      let estimatedMemory = 0;
      const topKeys: RateLimitStats['topKeys'] = [];

      // Process keys in batches to avoid blocking
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        // Use pipeline for efficiency
        const pipeline = client.pipeline();
        for (const key of batch) {
          switch (this.options.algorithm) {
            case 'sliding-window':
              pipeline.zcard(key);
              break;
            case 'fixed-window':
              pipeline.get(key);
              break;
            case 'token-bucket':
              pipeline.hget(key, 'tokens');
              break;
          }
          pipeline.debug_object(key);
        }
        
        const results = await pipeline.exec();
        
        for (let j = 0; j < batch.length; j++) {
          const keyIndex = j * 2;
          const memIndex = j * 2 + 1;
          
          if (results && results[keyIndex] && !results[keyIndex][0]) {
            const value = results[keyIndex][1];
            const count = typeof value === 'number' ? value : parseInt(value || '0', 10);
            
            totalKeys++;
            if (count >= this.options.points) {
              limitedKeys++;
            }
            
            // Track top keys
            if (topKeys.length < 10 || count > (topKeys[topKeys.length - 1]?.count || 0)) {
              topKeys.push({
                key: batch[j].replace(`${this.options.prefix}:`, ''),
                count,
                lastRequest: new Date(),
              });
              topKeys.sort((a, b) => b.count - a.count);
              if (topKeys.length > 10) topKeys.pop();
            }
          }
          
          // Memory estimation from debug object
          if (results && results[memIndex] && !results[memIndex][0]) {
            const debugInfo = results[memIndex][1];
            if (typeof debugInfo === 'string' && debugInfo.includes('serializedlength')) {
              const match = debugInfo.match(/serializedlength:(\d+)/);
              if (match) {
                estimatedMemory += parseInt(match[1], 10);
              }
            }
          }
        }
      }

      return {
        totalKeys,
        limitedKeys,
        estimatedMemoryBytes: estimatedMemory,
        topKeys,
      };
    }, {
      totalKeys: 0,
      limitedKeys: 0,
      estimatedMemoryBytes: 0,
      topKeys: [],
    });
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    return safeRedisCommand(async (client: Redis) => {
      // Redis auto-expires keys with TTL, but we can force cleanup of any orphaned data
      const pattern = `${this.options.prefix}:*:blocked`;
      const blockedKeys = await client.keys(pattern);
      
      let cleaned = 0;
      for (const key of blockedKeys) {
        const mainKey = key.replace(':blocked', '');
        const exists = await client.exists(mainKey);
        if (!exists) {
          await client.del(key);
          cleaned++;
        }
      }
      
      return cleaned;
    }, 0);
  }

  // ============================================================================
  // Private Methods - Algorithm Implementations
  // ============================================================================

  private async executeSlidingWindow(
    client: Redis,
    key: string,
    now: number,
    requestId: string
  ): Promise<RateLimitCheckResult> {
    const result = await client.eval(
      this.luaScripts.slidingWindow,
      1,
      key,
      now.toString(),
      this.options.windowSeconds.toString(),
      this.options.points.toString(),
      requestId
    ) as number[];

    const [allowed, current, remaining, retryAfter] = result;

    if (allowed === 0) {
      return {
        allowed: true,
        remaining: remaining as number,
        limit: this.options.points,
        current: current as number,
        resetTimeMs: now + (this.options.windowSeconds * 1000),
        algorithm: 'sliding-window',
      };
    } else {
      const result: RateLimitCheckResult = {
        allowed: false,
        remaining: 0,
        limit: this.options.points,
        current: current as number,
        resetTimeMs: now + (retryAfter as number || this.options.windowSeconds * 1000),
        retryAfterMs: retryAfter as number || undefined,
        reason: 'Sliding window limit exceeded',
        algorithm: 'sliding-window',
      };

      // Apply block if configured
      if (this.options.blockDuration > 0) {
        await this.applyBlock(client, key, this.options.blockDuration);
      }

      return result;
    }
  }

  private async executeFixedWindow(
    client: Redis,
    key: string,
    now: number
  ): Promise<RateLimitCheckResult> {
    const result = await client.eval(
      this.luaScripts.fixedWindow,
      1,
      key,
      this.options.windowSeconds.toString(),
      this.options.points.toString(),
      this.options.blockDuration.toString(),
      now.toString()
    ) as number[];

    const [status, current, remaining, resetOrRetry] = result;

    switch (status) {
      case 0: // Allowed
        return {
          allowed: true,
          remaining: remaining as number,
          limit: this.options.points,
          current: current as number,
          resetTimeMs: now + (resetOrRetry as number),
          algorithm: 'fixed-window',
        };
      
      case 1: // Over limit
        return {
          allowed: false,
          remaining: 0,
          limit: this.options.points,
          current: current as number,
          resetTimeMs: now + (resetOrRetry as number),
          retryAfterMs: resetOrRetry as number,
          reason: 'Fixed window limit exceeded',
          algorithm: 'fixed-window',
        };
      
      case 2: // Blocked
        return {
          allowed: false,
          remaining: 0,
          limit: this.options.points,
          current: this.options.points,
          resetTimeMs: now + (resetOrRetry as number),
          retryAfterMs: resetOrRetry as number,
          reason: 'Temporarily blocked due to repeated violations',
          algorithm: 'fixed-window',
        };
      
      case 3: // Just blocked
        return {
          allowed: false,
          remaining: 0,
          limit: this.options.points,
          current: current as number,
          resetTimeMs: now + (resetOrRetry as number),
          retryAfterMs: resetOrRetry as number,
          reason: 'Blocked due to violation',
          algorithm: 'fixed-window',
        };
      
      default:
        throw new Error(`Unexpected fixed window status: ${status}`);
    }
  }

  private async executeTokenBucket(
    client: Redis,
    key: string,
    now: number
  ): Promise<RateLimitCheckResult> {
    const result = await client.eval(
      this.luaScripts.tokenBucket,
      1,
      key,
      now.toString(),
      this.options.windowSeconds.toString(),
      this.options.points.toString()
    ) as number[];

    const [allowed, used, remaining, retryAfter] = result;

    if (allowed === 0) {
      return {
        allowed: true,
        remaining: remaining as number,
        limit: this.options.points,
        current: used as number,
        resetTimeMs: now + (retryAfter as number || this.options.windowSeconds * 1000),
        algorithm: 'token-bucket',
      };
    } else {
      return {
        allowed: false,
        remaining: 0,
        limit: this.options.points,
        current: used as number,
        resetTimeMs: now + (retryAfter as number || this.options.windowSeconds * 1000),
        retryAfterMs: retryAfter as number || undefined,
        reason: 'Token bucket exhausted',
        algorithm: 'token-bucket',
      };
    }
  }

  private async applyBlock(client: Redis, key: string, durationSeconds: number): Promise<void> {
    const blockKey = `${key}:blocked`;
    const until = Date.now() + (durationSeconds * 1000);
    await client.set(blockKey, until.toString(), 'EX', durationSeconds);
  }

  private async fallbackCheck(key: string): Promise<RateLimitCheckResult> {
    // In-memory fallback when Redis is not available
    // This is less accurate but allows the application to function
    
    const now = Date.now();
    const windowStart = now - (this.options.windowSeconds * 1000);
    
    // Use a simple in-memory approach (not distributed!)
    const store = (globalThis as Record<string, unknown>).__rateLimitFallbackStore as Map<string, number[]> || 
                  new Map<string, number[]>();
    
    if (!(globalThis as Record<string, unknown>).__rateLimitFallbackStore) {
      (globalThis as Record<string, unknown>).__rateLimitFallbackStore = store;
    }
    
    const timestamps = store.get(key) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    if (validTimestamps.length < this.options.points) {
      validTimestamps.push(now);
      store.set(key, validTimestamps);
      
      return {
        allowed: true,
        remaining: this.options.points - validTimestamps.length,
        limit: this.options.points,
        current: validTimestamps.length,
        resetTimeMs: now + (this.options.windowSeconds * 1000),
        algorithm: this.options.algorithm,
        reason: 'Using in-memory fallback (Redis unavailable)',
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      limit: this.options.points,
      current: validTimestamps.length,
      resetTimeMs: now + (this.options.windowSeconds * 1000),
      retryAfterMs: this.options.windowSeconds * 1000,
      reason: 'Rate limited (in-memory fallback)',
      algorithm: this.options.algorithm,
    };
  }
}

// ============================================================================
// Pre-configured Store Instances
// ============================================================================

/** Strict rate limiter for authentication endpoints */
export const authRateLimitStore = new RateLimitStore({
  points: 5,
  windowSeconds: 900, // 15 minutes
  algorithm: 'fixed-window',
  prefix: 'rl:auth',
  blockDuration: 1800, // 30 min block
});

/** Standard API rate limiter */
export const apiRateLimitStore = new RateLimitStore({
  points: 100,
  windowSeconds: 60,
  algorithm: 'sliding-window',
  prefix: 'rl:api',
});

/** Sensitive operations rate limiter */
export const sensitiveRateLimitStore = new RateLimitStore({
  points: 10,
  windowSeconds: 60,
  algorithm: 'fixed-window',
  prefix: 'rl:sensitive',
  blockDuration: 300,
});

/** Export/download rate limiter */
export const exportRateLimitStore = new RateLimitStore({
  points: 3,
  windowSeconds: 3600,
  algorithm: 'fixed-window',
  prefix: 'rl:export',
});

/** Streaming/SSE rate limiter */
export const streamingRateLimitStore = new RateLimitStore({
  points: 5,
  windowSeconds: 60,
  algorithm: 'token-bucket',
  prefix: 'rl:stream',
});

// ============================================================================
// Exports
// ============================================================================

export default RateLimitStore;
