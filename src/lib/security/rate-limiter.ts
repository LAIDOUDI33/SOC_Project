/**
 * Djezzy National SOC Platform - Distributed Rate Limiter
 * 
 * Redis-backed rate limiting with support for:
 * - Sliding window algorithm
 * - Fixed window algorithm
 * - Token bucket algorithm
 * - Role-based limits
 * - IP-based limits
 * - Endpoint-specific limits
 * 
 * ANRT Compliance:
 * - All rate limit data stored within Algeria
 * - AES-256 encryption at rest
 * - TLS 1.3 for Redis connections
 * 
 * @module security/rate-limiter
 * @version 1.0.0
 */

import { Redis } from 'ioredis';
import crypto from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RateLimitOptions {
  /** Maximum requests allowed within window */
  points: number;
  /** Window duration in seconds */
  duration: number;
  /** Algorithm to use */
  algorithm?: 'sliding-window' | 'fixed-window' | 'token-bucket';
  /** Specific key prefix for this limiter */
  prefix?: string;
  /** Whether to block immediately on first violation */
  blockDuration?: number; // seconds
  /** Custom error message */
  errorMessage?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the limit resets (Unix timestamp in ms) */
  resetTime: number;
  /** Total limit for this window */
  limit: number;
  /** Current request count in window */
  current: number;
  /** Time until retry after (ms), if blocked */
  retryAfterMs?: number;
  /** Reason for blocking (if blocked) */
  reason?: string;
}

export interface RoleBasedLimits {
  analyst: RateLimitOptions;
  engineer: RateLimitOptions;
  admin: RateLimitOptions;
  serviceAccount: RateLimitOptions;
  unauthenticated: RateLimitOptions;
}

export interface EndpointConfig {
  path: string;
  method: string;
  limits: RateLimitOptions | RoleBasedLimits;
  /** Override global settings */
  overrideGlobal?: boolean;
}

export interface RateLimiterConfig {
  redisClient: Redis;
  defaultLimits: RateLimitOptions;
  endpointConfigs: EndpointConfig[];
  roleBasedLimits?: RoleBasedLimits;
  ipBasedLimits?: {
    enabled: boolean;
    maxRequestsPerIP: number;
    windowSeconds: number;
  };
  globalLimits?: {
    enabled: boolean;
    maxRequestsTotal: number;
    windowSeconds: number;
  };
  /** Enable detailed logging */
  verboseLogging?: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

/** Default rate limits for different user types */
export const DEFAULT_LIMITS: RoleBasedLimits = {
  analyst: {
    points: 100,
    duration: 60, // 100 requests per minute
    algorithm: 'sliding-window',
    blockDuration: 300, // 5 minute block on violation
  },
  engineer: {
    points: 300,
    duration: 60,
    algorithm: 'sliding-window',
    blockDuration: 180,
  },
  admin: {
    points: 500,
    duration: 60,
    algorithm: 'sliding-window',
    blockDuration: 120,
  },
  serviceAccount: {
    points: 1000,
    duration: 60,
    algorithm: 'sliding-window',
    blockDuration: 60,
  },
  unauthenticated: {
    points: 20,
    duration: 60,
    algorithm: 'sliding-window',
    blockDuration: 900, // 15 min block for unauthenticated users
  },
};

/** Authentication endpoint limits (stricter) */
export const AUTH_ENDPOINT_LIMITS: Record<string, RateLimitOptions> = {
  '/api/auth/login': {
    points: 5,
    duration: 900, // 5 attempts per 15 minutes
    algorithm: 'fixed-window',
    blockDuration: 1800, // 30 min block
    errorMessage: 'Too many login attempts. Please try again later.',
  },
  '/api/auth/mfa/verify': {
    points: 5,
    duration: 300, // 5 attempts per 5 minutes
    algorithm: 'fixed-window',
    blockDuration: 900,
  },
  '/api/auth/password/reset': {
    points: 3,
    duration: 3600, // 3 attempts per hour
    algorithm: 'fixed-window',
    blockDuration: 3600,
  },
  '/api/auth/token/refresh': {
    points: 100,
    duration: 3600,
    algorithm: 'sliding-window',
  },
};

/** SIEM endpoint limits */
export const SIEM_ENDPOINT_LIMITS: Record<string, RateLimitOptions> = {
  '/api/siem/search': {
    points: 30,
    duration: 60,
    algorithm: 'sliding-window',
  },
  '/api/siem/export': {
    points: 5,
    duration: 3600,
    algorithm: 'fixed-window',
  },
  '/api/siem/stream': {
    points: 5, // Concurrent connection limit handled separately
    duration: 60,
    algorithm: 'token-bucket',
  },
};

// ============================================================================
// RateLimiter Class
// ============================================================================

/**
 * Distributed Rate Limiter using Redis
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter({
 *   redisClient: redis,
 *   defaultLimits: DEFAULT_LIMITS.analyst,
 *   endpointConfigs: [],
 * });
 * 
 * // In middleware
 * const result = await limiter.check(userId, ipAddress, '/api/alerts', 'GET', 'analyst');
 * if (!result.allowed) {
 *   return response.status(429).json({ error: 'Rate limited', retryAfter: result.retryAfterMs });
 * }
 * ```
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private redis: Redis;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.redis = config.redisClient;
  }

  /**
   * Main method to check if a request should be rate limited
   */
  async check(
    userIdentity: string | null,
    ipAddress: string,
    path: string,
    method: string,
    role: string = 'unauthenticated'
  ): Promise<RateLimitResult> {
    const results: RateLimitResult[] = [];

    // 1. Check IP-based limits (if enabled)
    if (this.config.ipBasedLimits?.enabled) {
      results.push(await this.checkIP(ipAddress));
    }

    // 2. Check global limits (if enabled)
    if (this.config.globalLimits?.enabled) {
      results.push(await this.checkGlobal());
    }

    // 3. Get endpoint-specific or default limits
    const limits = this.getLimitsForEndpoint(path, method, role);
    
    // 4. Check user-based limits
    if (userIdentity) {
      results.push(await this.checkUser(userIdentity, limits));
    } else {
      results.push(await this.checkAnonymous(ipAddress, limits));
    }

    // Return most restrictive result
    return this.mostRestrictiveResult(results);
  }

  /**
   * Check rate limit for a specific key with given options
   */
  async checkKey(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    switch (options.algorithm || 'sliding-window') {
      case 'sliding-window':
        return this.slidingWindowCheck(key, options);
      case 'fixed-window':
        return this.fixedWindowCheck(key, options);
      case 'token-bucket':
        return this.tokenBucketCheck(key, options);
      default:
        return this.slidingWindowCheck(key, options);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    await this.redis.del(fullKey);
    return true;
  }

  /**
   * Get current usage stats without incrementing
   */
  async getUsage(key: string, options: RateLimitOptions): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
  }> {
    const fullKey = this.buildKey(key);
    
    switch (options.algorithm || 'sliding-window') {
      case 'sliding-window': {
        const now = Date.now();
        const windowStart = now - (options.duration * 1000);
        
        const members = await this.redis.zrangebyscore(fullKey, windowStart, Infinity);
        const current = members.length;
        
        return {
          current,
          remaining: Math.max(0, options.points - current),
          resetTime: now + (options.duration * 1000),
        };
      }
      
      case 'fixed-window': {
        const ttl = await this.redis.ttl(fullKey);
        const current = parseInt(await this.redis.get(fullKey) || '0', 10);
        
        return {
          current,
          remaining: Math.max(0, options.points - current),
          resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : 0,
        };
      }
      
      case 'token-bucket': {
        const pipeline = this.redis.pipeline();
        pipeline.hget(fullKey, 'tokens');
        pipeline.hget(fullKey, 'last_refill');
        const results = await pipeline.exec();
        
        const tokens = parseFloat(results?.[0]?.[1] as string || options.points.toString());
        const current = Math.max(0, options.points - Math.floor(tokens));
        
        return {
          current,
          remaining: Math.floor(tokens),
          resetTime: Date.now() + (options.duration * 1000),
        };
      }
      
      default:
        throw new Error(`Unknown algorithm: ${(options.algorithm as string)}`);
    }
  }

  // ============================================================================
  // Private Methods - Algorithm Implementations
  // ============================================================================

  /**
   * Sliding Window Log Algorithm
   * More accurate than fixed window, uses more memory
   */
  private async slidingWindowCheck(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const fullKey = this.buildKey(key);
    const now = Date.now();
    const windowStart = now - (options.duration * 1000);

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(fullKey, 0, windowStart);

    // Count current entries
    pipeline.zcard(fullKey);

    // Add current request
    pipeline.zadd(fullKey, now.toString(), `${now}-${crypto.randomBytes(4).toString('hex')}`);

    // Set expiry
    pipeline.expire(fullKey, options.duration + 1);

    const results = await pipeline.exec();
    
    if (!results || results[1]?.[1] === null) {
      throw new Error('Failed to execute sliding window check');
    }

    const currentCount = results[1][1] as number;
    const allowed = currentCount <= options.points;

    // If over limit, remove the added entry
    if (!allowed) {
      await this.redis.zremrangebyscore(fullKey, now, now);
    }

    // Calculate when oldest entry will expire (approximate reset time)
    const oldestEntry = await this.redis.zrange(fullKey, 0, 0, 'WITHSCORES');
    let resetTime = now + (options.duration * 1000);
    if (oldestEntry && oldestEntry.length >= 2) {
      resetTime = parseInt(oldestEntry[1] as string, 10) + (options.duration * 1000);
    }

    const result: RateLimitResult = {
      allowed,
      remaining: Math.max(0, options.points - (allowed ? currentCount : currentCount - 1)),
      resetTime,
      limit: options.points,
      current: allowed ? currentCount : currentCount - 1,
    };

    if (!allowed) {
      result.retryAfterMs = resetTime - now;
      result.reason = 'Sliding window limit exceeded';
      
      // Apply block duration if configured
      if (options.blockDuration) {
        await this.applyBlock(key, options.blockDuration);
      }
    }

    return result;
  }

  /**
   * Fixed Window Counter Algorithm
   * Simpler but can allow bursts at window boundaries
   */
  private async fixedWindowCheck(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const fullKey = this.buildKey(key);
    const now = Date.now();

    // Check if currently blocked
    const blockKey = `block:${fullKey}`;
    const blockedUntil = await this.redis.get(blockKey);
    if (blockedUntil) {
      const blockedUntilTime = parseInt(blockedUntil, 10);
      if (now < blockedUntilTime) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: blockedUntilTime,
          limit: options.points,
          current: options.points,
          retryAfterMs: blockedUntilTime - now,
          reason: 'Temporarily blocked due to repeated violations',
        };
      }
      // Block expired, remove it
      await this.redis.del(blockKey);
    }

    // Multi-command for atomicity
    const results = await this.redis
      .multi()
      .incr(fullKey)
      .ttl(fullKey)
      .exec();

    if (!results) {
      throw new Error('Failed to execute fixed window check');
    }

    const currentCount = results[0][1] as number;
    
    // Set expiry on first request in window
    if (currentCount === 1) {
      await this.redis.expire(fullKey, options.duration);
    }

    const ttl = (results[1][1] as number) || options.duration;
    const allowed = currentCount <= options.points;

    const result: RateLimitResult = {
      allowed,
      remaining: Math.max(0, options.points - (allowed ? currentCount : currentCount)),
      resetTime: now + (ttl * 1000),
      limit: options.points,
      current: currentCount,
    };

    if (!allowed) {
      result.retryAfterMs = ttl * 1000;
      result.reason = 'Fixed window limit exceeded';
      
      // Decrement since we're rejecting
      await this.redis.decr(fullKey);
      
      // Apply block if configured
      if (options.blockDuration) {
        await this.applyBlock(key, options.blockDuration);
      }
    }

    return result;
  }

  /**
   * Token Bucket Algorithm
   * Good for bursty traffic with sustained rate control
   */
  private async tokenBucketCheck(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const fullKey = this.buildKey(key);
    const now = Date.now();

    // Get current state
    const currentState = await this.redis.hgetall(fullKey);
    
    let tokens = options.points;
    let lastRefill = now;

    if (Object.keys(currentState).length > 0) {
      tokens = parseFloat(currentState.tokens || options.points.toString());
      lastRefill = parseFloat(currentState.last_refill || now.toString());
    }

    // Calculate tokens to add based on elapsed time
    const elapsed = (now - lastRefill) / 1000; // seconds
    const refillRate = options.points / options.duration; // tokens per second
    const tokensToAdd = elapsed * refillRate;
    
    tokens = Math.min(options.points, tokens + tokensToAdd);
    lastRefill = now;

    // Check if we have enough tokens
    const tokensNeeded = 1;
    const allowed = tokens >= tokensNeeded;

    if (allowed) {
      tokens -= tokensNeeded;
    }

    // Update state
    await this.redis
      .multi()
      .hset(fullKey, 'tokens', tokens.toString(), 'last_refill', lastRefill.toString())
      .expire(fullKey, options.duration * 2)
      .exec();

    const result: RateLimitResult = {
      allowed,
      remaining: Math.floor(tokens),
      resetTime: now + ((options.points - tokens) / refillRate * 1000),
      limit: options.points,
      current: Math.ceil(options.points - tokens),
    };

    if (!allowed) {
      result.retryAfterMs = (tokensNeeded - tokens) / refillRate * 1000;
      result.reason = 'Token bucket exhausted';
    }

    return result;
  }

  // ============================================================================
  // Private Methods - Limit Resolution
  // ============================================================================

  /**
   * Get appropriate limits for an endpoint based on configuration
   */
  private getLimitsForEndpoint(path: string, method: string, role: string): RateLimitOptions {
    // Check for exact endpoint match
    const endpointConfig = this.config.endpointConfigs.find(
      ec => ec.path.toLowerCase() === path.toLowerCase() && ec.method.toUpperCase() === method.toUpperCase()
    );

    if (endpointConfig) {
      // Check if it's role-based
      if ('analyst' in endpointConfig.limits) {
        const roleLimits = endpointConfig.limits as RoleBasedLimits;
        return roleLimits[role as keyof RoleBasedLimits] || this.config.defaultLimits;
      }
      return endpointConfig.limits as RateLimitOptions;
    }

    // Check auth endpoints
    if (AUTH_ENDPOINT_LIMITS[path]) {
      return AUTH_ENDPOINT_LIMITS[path];
    }

    // Check SIEM endpoints
    if (SIEM_ENDPOINT_LIMITS[path]) {
      return SIEM_ENDPOINT_LIMITS[path];
    }

    // Check role-based defaults
    if (this.config.roleBasedLimits) {
      const roleLimit = this.config.roleBasedLimits[role as keyof RoleBasedLimits];
      if (roleLimit) {
        return roleLimit;
      }
    }

    return this.config.defaultLimits;
  }

  /**
   * Check IP-based rate limit
   */
  private async checkIP(ipAddress: string): Promise<RateLimitResult> {
    if (!this.config.ipBasedLimits) {
      return { allowed: true, remaining: Infinity, resetTime: 0, limit: 0, current: 0 };
    }

    const { maxRequestsPerIP, windowSeconds } = this.config.ipBasedLimits;
    return this.checkKey(`ip:${ipAddress}`, {
      points: maxRequestsPerIP,
      duration: windowSeconds,
      algorithm: 'sliding-window',
    });
  }

  /**
   * Check global rate limit
   */
  private async checkGlobal(): Promise<RateLimitResult> {
    if (!this.config.globalLimits) {
      return { allowed: true, remaining: Infinity, resetTime: 0, limit: 0, current: 0 };
    }

    const { maxRequestsTotal, windowSeconds } = this.config.globalLimits;
    return this.checkKey('global', {
      points: maxRequestsTotal,
      duration: windowSeconds,
      algorithm: 'sliding-window',
    });
  }

  /**
   * Check authenticated user rate limit
   */
  private async checkUser(
    userIdentity: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    return this.checkKey(`user:${userIdentity}`, options);
  }

  /**
   * Check anonymous (unauthenticated) rate limit using IP
   */
  private async checkAnonymous(
    ipAddress: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    return this.checkKey(`anon:${ipAddress}`, options);
  }

  /**
   * Apply temporary block to a key
   */
  private async applyBlock(key: string, durationSeconds: number): Promise<void> {
    const blockKey = `block:${this.buildKey(key)}`;
    const until = Date.now() + (durationSeconds * 1000);
    await this.redis.set(blockKey, until.toString(), 'EX', durationSeconds);
  }

  /**
   * Build full Redis key with prefix
   */
  private buildKey(key: string): string {
    const prefix = this.config.defaultLimits.prefix || 'ratelimit:soc';
    return `${prefix}:${key}`;
  }

  /**
   * Find most restrictive result from multiple checks
   */
  private mostRestrictiveResult(results: RateLimitResult[]): RateLimitResult {
    // If any result denies access, find the one with longest wait time
    const deniedResults = results.filter(r => !r.allowed);
    if (deniedResults.length > 0) {
      return deniedResults.reduce((most, current) => 
        (current.retryAfterMs || 0) > (most.retryAfterMs || 0) ? current : most
      );
    }

    // All allowed - return lowest remaining count
    return results.reduce((most, current) =>
      current.remaining < most.remaining ? current : most
    );
  }
}

// ============================================================================
// Middleware Factory Functions
// ============================================================================

/**
 * Create Express/Next.js compatible rate limiting middleware
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (
    req: Request & { user?: { id?: string; role?: string }; ip?: string },
    res: Response & { json?: (body: unknown) => void; status?: (code: number) => typeof res },
    next: () => void
  ) => {
    const userIdentity = req.user?.id || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const path = new URL(req.url).pathname;
    const method = req.method;
    const role = req.user?.role || 'unauthenticated';

    const result = await limiter.check(userIdentity, ipAddress, path, method, role);

    // Add rate limit headers
    if (res.headers) {
      res.headers.set('X-RateLimit-Limit', result.limit.toString());
      res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      res.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    }

    if (!result.allowed) {
      const status = 429;
      const body = {
        error: 'Too Many Requests',
        message: result.errorMessage || 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil((result.retryAfterMs || 0) / 1000),
        documentation: 'https://security.djezzy.dz/rate-limits',
      };

      if (result.retryAfterMs) {
        res.headers?.set('Retry-After', Math.ceil(result.retryAfterMs / 1000).toString());
      }

      if (res.status && res.json) {
        res.status(status).json(body);
        return;
      }
      
      // For Next.js route handlers
      return new Response(JSON.stringify(body), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.retryAfterMs || 0) / 1000).toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      });
    }

    next();
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a consistent hash for rate limit keys
 */
export function hashKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Extract client IP from request headers
 */
export function extractClientIP(req: Request): string {
  // Check common proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  // Fallback - would need actual socket access in Node.js
  return 'unknown';
}

/**
 * Parse Retry-After header value to milliseconds
 */
export function parseRetryAfter(retryAfter: string | number | null): number | null {
  if (retryAfter === null) return null;
  
  if (typeof retryAfter === 'number') {
    return retryAfter * 1000;
  }

  // Try parsing as date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return date.getTime() - Date.now();
  }

  // Try parsing as seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  return null;
}

// ============================================================================
// Exports
// ============================================================================

export default RateLimiter;
