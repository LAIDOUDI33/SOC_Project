/**
 * National SOC Platform - API Rate Limiting Middleware
 * 
 * In-memory rate limiting for API routes (for production, use Redis-backed version)
 * Protects against:
 * - Brute force attacks
 * - DoS attacks
 * - API abuse
 * 
 * @module middleware/rate-limit
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Message to show when limited */
  message?: string;
}

// ============================================================================
// In-Memory Store (for development/single-instance)
// ============================================================================

/**
 * In-memory store for rate limiting
 * NOTE: For production multi-instance deployments, use Redis-backed store instead
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

// ============================================================================
// Predefined Configurations
// ============================================================================

export const RATE_LIMIT_CONFIGS = {
  // Strict limits for authentication endpoints (prevent brute force)
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // Moderate limits for general API
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded. Please slow down.'
  },
  
  // Strict limits for sensitive operations
  sensitive: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please wait before retrying.'
  },
  
  // Generous limits for data export
  export: {
    limit: 3,
    windowMs: 3600 * 1000, // 1 hour
    message: 'Export limit reached. Please try again later.'
  }
} as const;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Extract client identifier from request
 * Uses X-Forwarded-For header when behind proxy, falls back to IP
 */
function extractClientId(request: NextRequest): string {
  // Check for forwarded IP (when behind reverse proxy)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback - use a combination of headers to identify client
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `unknown:${userAgent.substring(0, 50)}`;
}

/**
 * Check rate limit for a given key
 */
function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // If no existing entry or window has reset
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  // Increment counter
  entry.count++;
  
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime
  };
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a rate limiting middleware for API routes
 * 
 * @example
 * ```typescript
 * // In an API route
 * import { createRateLimiter } from '@/lib/middleware/rate-limit';
 * 
 * const rateLimit = createRateLimiter(RATE_LIMIT_CONFIGS.auth);
 * 
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit(request);
 *   if (!rateLimitResult.success) {
 *     return NextResponse.json(
 *       { error: 'Too many attempts' },
 *       { status: 429, headers: rateLimitResult.headers }
 *     );
 *   }
 *   // Handle request...
 * }
 * ```
 */
export function createRateLimiter(config: RateLimitConfig = RATE_LIMIT_CONFIGS.api) {
  return function rateLimit(request: NextRequest): {
    success: boolean;
    response?: NextResponse;
    headers: Record<string, string>;
  } {
    const clientId = extractClientId(request);
    
    // Create unique key with path to allow per-endpoint limiting
    const path = new URL(request.url).pathname;
    const key = `ratelimit:${clientId}:${path}`;
    
    const result = checkRateLimit(key, config);
    
    const headers = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetTime),
      ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {})
    };
    
    if (!result.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
          errorCode: 'RATE_LIMITED',
          retryAfter: result.retryAfter
        }, 
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': String(result.retryAfter || 60)
          }
        }
      );
      
      return { success: false, response, headers };
    }
    
    return { success: true, headers };
  };
}

// ============================================================================
// Specific Limiters
// ============================================================================

/** Rate limiter for authentication endpoints */
export const authRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.auth);

/** Rate limiter for general API endpoints */
export const apiRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.api);

/** Rate limiter for sensitive operations */
export const sensitiveRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.sensitive);

/** Rate limiter for export operations */
export const exportRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.export);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset rate limit for a specific key (for testing/admin)
 */
export function resetRateLimit(request: NextRequest): void {
  const clientId = extractClientId(request);
  const path = new URL(request.url).pathname;
  const key = `ratelimit:${clientId}:${path}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(request: NextRequest): {
  limit: number;
  remaining: number;
  resetTime: number;
} | null {
  const clientId = extractClientId(request);
  const path = new URL(request.url).pathname;
  const key = `ratelimit:${clientId}:${path}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || Date.now() > entry.resetTime) {
    return null;
  }
  
  return {
    limit: RATE_LIMIT_CONFIGS.api.limit,
    remaining: Math.max(0, RATE_LIMIT_CONFIGS.api.limit - entry.count),
    resetTime: entry.resetTime
  };
}

export default {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  sensitiveRateLimiter,
  exportRateLimiter,
  resetRateLimit,
  getRateLimitStatus,
  RATE_LIMIT_CONFIGS
};
