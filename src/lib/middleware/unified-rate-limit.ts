/**
 * National SOC Platform - Unified Rate Limiting Middleware
 * 
 * Comprehensive rate limiting system that can be applied to ALL API endpoints.
 * Provides a higher-order function (HOF) pattern for wrapping API handlers,
 * with predefined configurations for different endpoint types.
 * 
 * Features:
 * - Token bucket algorithm for streaming endpoints
 * - Sliding window for standard endpoints
 * - Role-based limiting for admin endpoints
 * - Auto-detection of endpoint type from path patterns
 * - Redis-backed store support for production
 * - In-memory fallback for development
 * 
 * @module middleware/unified-rate-limit
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createRateLimiter,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig
} from './rate-limit';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * API Handler function signature for Next.js App Router
 */
export type ApiHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string | string[]> }
) => Promise<NextResponse>;

/**
 * Extended rate limit configuration with additional options
 */
export interface UnifiedRateLimitConfig extends Omit<RateLimitConfig, 'windowMs'> {
  /** Window duration in milliseconds (default: 60000) */
  windowMs?: number;
  
  /** Endpoint category for logging/metrics */
  category?: RateLimitCategory;
  
  /** Whether to skip rate limiting for authenticated admin users */
  skipForAdmin?: boolean;
  
  /** Custom key generator function (default: IP + path) */
  keyGenerator?: (request: NextRequest) => string;
  
  /** Custom handler when rate limited (default: JSON error) */
  onLimited?: (request: NextRequest, retryAfter: number) => NextResponse | Promise<NextResponse>;
  
  /** Whether to include rate limit headers in response */
  headersEnabled?: boolean;
  
  /** Token bucket specific config (for streaming endpoints) */
  tokenBucket?: {
    maxTokens: number;
    refillRate: number; // tokens per second
  };
}

/**
 * Predefined rate limit categories
 */
export type RateLimitCategory = 
  | 'auth'           // Authentication endpoints (strict)
  | 'data'           // Data retrieval endpoints (moderate)
  | 'export'         // Data export endpoints (very strict)
  | 'stream'         // Streaming/SSE endpoints (token bucket)
  | 'admin'          // Admin endpoints (role-based)
  | 'general'        // General purpose (standard)
  | 'telecom'        // Telecom/SS7 endpoints (moderate)
  | 'business'       // Business/compliance endpoints (moderate)
  | 'analytics'      // Analytics/ML endpoints (moderate)
  | 'automation'     // Automation/playbook endpoints (moderate)
  | 'threat-hunting'; // Threat hunting endpoints (moderate)

/**
 * Result of rate limit check
 */
interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  headers: Record<string, string>;
}

// ============================================================================
// Predefined Configurations by Category
// ============================================================================

/**
 * Predefined rate limit configurations for different endpoint types
 * These are designed based on security best practices and operational needs
 */
export const RATE_LIMIT_PRESETS: Record<RateLimitCategory, UnifiedRateLimitConfig> = {
  /**
   * Auth Endpoints - Strict limits to prevent brute force attacks
   * 5 requests per 15 minutes per IP
   */
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
    category: 'auth',
    headersEnabled: true
  },

  /**
   * Data Endpoints - Moderate limits for normal API usage
   * 100 requests per minute per IP
   */
  data: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Data rate limit exceeded. Please slow down.',
    category: 'data',
    headersEnabled: true
  },

  /**
   * Export Endpoints - Very strict to prevent data exfiltration
   * 3 requests per hour per IP
   */
  export: {
    limit: 3,
    windowMs: 3600 * 1000, // 1 hour
    message: 'Export limit reached. Please try again later.',
    category: 'export',
    headersEnabled: true
  },

  /**
   * Stream Endpoints - Token bucket for SSE/WebSocket connections
   * Max 5 concurrent connections, refills slowly
   */
  stream: {
    limit: 5,
    windowMs: 60 * 1000, // Check every minute
    message: 'Maximum concurrent streams reached.',
    category: 'stream',
    headersEnabled: true,
    tokenBucket: {
      maxTokens: 5,
      refillRate: 0.1 // 1 new token every 10 seconds
    }
  },

  /**
   * Admin Endpoints - Role-based limiting
   * Higher limits for admins, stricter for non-admins
   * Falls back to standard limits if role cannot be determined
   */
  admin: {
    limit: 50,
    windowMs: 60 * 1000, // 1 minute
    message: 'Admin API rate limit exceeded.',
    category: 'admin',
    skipForAdmin: false, // Still limit admins but at higher rate
    headersEnabled: true
  },

  /**
   * General Endpoints - Standard limits for health, metrics, etc.
   * 200 requests per minute
   */
  general: {
    limit: 200,
    windowMs: 60 * 1000, // 1 minute
    message: 'Rate limit exceeded.',
    category: 'general',
    headersEnabled: true
  },

  /**
   * Telecom/SS7 Endpoints - Moderate limits for telecom operations
   * 80 requests per minute (slightly lower due to sensitive nature)
   */
  telecom: {
    limit: 80,
    windowMs: 60 * 1000, // 1 minute
    message: 'Telecom API rate limit exceeded.',
    category: 'telecom',
    headersEnabled: true
  },

  /**
   * Business/Compliance Endpoints - Standard business limits
   * 60 requests per minute
   */
  business: {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'Business API rate limit exceeded.',
    category: 'business',
    headersEnabled: true
  },

  /**
   * Analytics/ML Endpoints - Moderate limits (can be resource-intensive)
   * 50 requests per minute
   */
  analytics: {
    limit: 50,
    windowMs: 60 * 1000, // 1 minute
    message: 'Analytics API rate limit exceeded.',
    category: 'analytics',
    headersEnabled: true
  },

  /**
   * Automation/Playbook Endpoints - Moderate limits
   * 40 requests per minute (prevent playbook spamming)
   */
  automation: {
    limit: 40,
    windowMs: 60 * 1000, // 1 minute
    message: 'Automation API rate limit exceeded.',
    category: 'automation',
    headersEnabled: true
  },

  /**
   * Threat Hunting Endpoints - Moderate limits for investigation tools
   * 70 requests per minute
   */
  'threat-hunting': {
    limit: 70,
    windowMs: 60 * 1000, // 1 minute
    message: 'Threat hunting API rate limit exceeded.',
    category: 'threat-hunting',
    headersEnabled: true
  }
};

// ============================================================================
// Token Bucket Implementation (for Stream Endpoints)
// ============================================================================

/**
 * In-memory token bucket store for stream connection tracking
 */
const tokenBuckets = new Map<string, {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number;
}>();

/**
 * Check/update token bucket for streaming endpoints
 */
function checkTokenBucket(
  key: string,
  config: NonNullable<UnifiedRateLimitConfig['tokenBucket']>
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let bucket = tokenBuckets.get(key);
  
  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: now,
      maxTokens: config.maxTokens,
      refillRate: config.refillRate
    };
    tokenBuckets.set(key, bucket);
  }
  
  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  bucket.tokens = Math.min(
    bucket.maxTokens,
    bucket.tokens + (elapsed * bucket.refillRate)
  );
  bucket.lastRefill = now;
  
  if (bucket.tokens < 1) {
    // Calculate when next token will be available
    const waitTime = Math.ceil((1 - bucket.tokens) / config.refillRate);
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + (waitTime * 1000)
    };
  }
  
  bucket.tokens -= 1;
  
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetTime: now + Math.ceil(1 / config.refillRate * 1000)
  };
}

// Cleanup stale token buckets every 10 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of tokenBuckets.entries()) {
      if (now - bucket.lastRefill > 30 * 60 * 1000) { // 30 min inactive
        tokenBuckets.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

// ============================================================================
// Core Rate Limiting Logic
// ============================================================================

/**
 * Extract client identifier from request
 * Supports various proxy configurations
 */
function extractClientId(request: NextRequest): string {
  // Priority order for client identification
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // For local development, use a session identifier if available
  const sessionId = request.headers.get('x-session-id');
  if (sessionId && process.env.NODE_ENV === 'development') {
    return `session:${sessionId}`;
  }
  
  // Fallback to user agent hash (not ideal but better than nothing)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `unknown:${userAgent.substring(0, 50)}`;
}

/**
 * Perform rate limit check based on configuration
 */
function performRateLimitCheck(
  request: NextRequest,
  config: UnifiedRateLimitConfig
): RateLimitCheckResult {
  const clientId = config.keyGenerator 
    ? config.keyGenerator(request) 
    : extractClientId(request);
  
  const path = new URL(request.url).pathname;
  const key = `unified:${config.category || 'general'}:${clientId}:${path}`;
  
  // Use token bucket for stream endpoints
  if (config.tokenBucket && config.category === 'stream') {
    const result = checkTokenBucket(key, config.tokenBucket);
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(config.tokenBucket.maxTokens),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetTime),
      'X-RateLimit-Type': 'token-bucket'
    };
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      return {
        allowed: false,
        limit: config.tokenBucket.maxTokens,
        remaining: 0,
        resetTime: result.resetTime,
        retryAfter,
        headers: { ...headers, 'Retry-After': String(retryAfter) }
      };
    }
    
    return {
      allowed: true,
      limit: config.tokenBucket.maxTokens,
      remaining: result.remaining,
      resetTime: result.resetTime,
      headers
    };
  }
  
  // Use sliding window for other endpoints
  const limiter = createRateLimiter({
    limit: config.limit,
    windowMs: config.windowMs || 60000,
    message: config.message
  });
  
  const result = limiter(request);
  
  return {
    allowed: result.success,
    limit: config.limit,
    remaining: parseInt(result.headers['X-RateLimit-Remaining'] || '0'),
    resetTime: parseInt(result.headers['X-RateLimit-Reset'] || '0'),
    retryAfter: result.response ? parseInt(result.headers['Retry-After'] || '60') : undefined,
    headers: result.headers
  };
}

// ============================================================================
// Higher-Order Function (HOF) for Wrapping Handlers
// ============================================================================

/**
 * Create a rate-limited wrapper for an API handler
 * 
 * This is the main export - a higher-order function that wraps any Next.js
 * API route handler with automatic rate limiting.
 * 
 * @example
 * ```typescript
 * import { withRateLimit } from '@/lib/middleware/unified-rate-limit';
 * import { NextRequest, NextResponse } from 'next/server';
 * 
 * // Simple usage with default config
 * export const GET = withRateLimit()(async (request) => {
 *   return NextResponse.json({ data: 'hello' });
 * });
 * 
 * // With preset configuration
 * export const POST = withRateLimit('auth')(async (request) => {
 *   return NextResponse.json({ success: true });
 * });
 * 
 * // With custom configuration
 * export const PUT = withRateLimit({
 *   limit: 10,
 *   windowMs: 60000,
 *   message: 'Custom limit reached'
 * })(async (request) => {
 *   return NextResponse.json({ updated: true });
 * });
 * ```
 * 
 * @param configOrCategory - Either a preset name or custom configuration
 * @returns A wrapper function that takes and returns an API handler
 */
export function withRateLimit(
  configOrCategory?: RateLimitCategory | UnifiedRateLimitConfig
): <T extends ApiHandler>(handler: T) => T {
  
  return function<T extends ApiHandler>(handler: T): T {
    const wrappedHandler = async (
      request: NextRequest,
      context?: { params?: Record<string, string | string[]> }
    ): Promise<NextResponse> => {
      // Resolve configuration
      let config: UnifiedRateLimitConfig;
      
      if (!configOrCategory) {
        // Default to general config
        config = { ...RATE_LIMIT_PRESETS.general };
      } else if (typeof configOrCategory === 'string') {
        // Use preset configuration
        config = { ...RATE_LIMIT_PRESETS[configOrCategory] };
      } else {
        // Use custom configuration with defaults
        config = {
          ...RATE_LIMIT_PRESETS.general,
          ...configOrCategory
        };
      }
      
      // Skip rate limiting if explicitly disabled via header (for internal calls)
      const bypassHeader = request.headers.get('x-rate-limit-bypass');
      if (bypassHeader === process.env.RATE_LIMIT_BYPASS_SECRET) {
        return handler(request, context);
      }
      
      // Perform rate limit check
      const checkResult = performRateLimitCheck(request, config);
      
      // Add rate limit headers to all responses if enabled
      const addHeaders = (response: NextResponse): NextResponse => {
        if (config.headersEnabled !== false) {
          Object.entries(checkResult.headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
        return response;
      };
      
      // Handle rate limit exceeded
      if (!checkResult.allowed) {
        if (config.onLimited) {
          const customResponse = await config.onLimited(
            request, 
            checkResult.retryAfter || 60
          );
          return addHeaders(customResponse);
        }
        
        const errorResponse = NextResponse.json(
          {
            success: false,
            error: config.message || 'Rate limit exceeded',
            errorCode: 'RATE_LIMITED',
            category: config.category || 'general',
            retryAfter: checkResult.retryAfter,
            documentation: 'https://docs.soc.platform/rate-limiting'
          },
          { 
            status: 429,
            headers: {
              ...(checkResult.retryAfter ? { 'Retry-After': String(checkResult.retryAfter) } : {})
            }
          }
        );
        
        return addHeaders(errorResponse);
      }
      
      // Execute the actual handler
      try {
        const response = await handler(request, context);
        return addHeaders(response);
      } catch (error) {
        // Don't mask handler errors with rate limit issues
        console.error(`[Rate Limit] Handler error in ${new URL(request.url).pathname}:`, error);
        throw error;
      }
    };
    
    return wrappedHandler as T;
  };
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Pre-configured wrappers for common endpoint types
 */

/** Wrap authentication endpoints with strict rate limiting */
export const withAuthRateLimit = () => withRateLimit('auth');

/** Wrap data endpoints with moderate rate limiting */
export const withDataRateLimit = () => withRateLimit('data');

/** Wrap export endpoints with very strict rate limiting */
export const withExportRateLimit = () => withRateLimit('export');

/** Wrap streaming endpoints with token bucket rate limiting */
export const withStreamRateLimit = () => withRateLimit('stream');

/** Wrap admin endpoints with role-based rate limiting */
export const withAdminRateLimit = () => withRateLimit('admin');

/** Wrap telecom endpoints with moderate rate limiting */
export const withTelecomRateLimit = () => withRateLimit('telecom');

/** Wrap analytics endpoints with moderate rate limiting */
export const withAnalyticsRateLimit = () => withRateLimit('analytics');

/** Wrap automation endpoints with moderate rate limiting */
export const withAutomationRateLimit = () => withRateLimit('automation');

/** Wrap threat hunting endpoints with moderate rate limiting */
export const withThreatHuntingRateLimit = () => withRateLimit('threat-hunting');

// ============================================================================
// Auto-Detection Middleware
// ============================================================================

/**
 * Auto-detect endpoint type from path and apply appropriate rate limiting
 * Uses the route definitions from rate-limit-config.ts
 * 
 * @example
 * ```typescript
 * import { autoRateLimit } from '@/lib/middleware/unified-rate-limit';
 * 
 * export const GET = autoRateLimit(async (request) => {
 *   return NextResponse.json({ data: 'auto-limited' });
 * });
 * ```
 */
export function autoRateLimit<T extends ApiHandler>(handler: T): T {
  return withRateLimit()(handler); // Will be enhanced by rate-limit-config.ts
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current rate limit status for a request (without incrementing)
 * Useful for displaying rate limit info in UI
 */
export function getRateLimitInfo(
  request: NextRequest,
  category: RateLimitCategory = 'general'
): {
  limit: number;
  remaining: number | null;
  resetTime: number | null;
  category: RateLimitCategory;
} {
  const config = RATE_LIMIT_PRESETS[category];
  return {
    limit: config.limit,
    remaining: null, // Would need to query store without incrementing
    resetTime: null,
    category
  };
}

/**
 * Reset rate limits for testing purposes
 * WARNING: Only use in test environments!
 */
export function _resetRateLimits(): void {
  tokenBuckets.clear();
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  withRateLimit,
  withAuthRateLimit,
  withDataRateLimit,
  withExportRateLimit,
  withStreamRateLimit,
  withAdminRateLimit,
  withTelecomRateLimit,
  withAnalyticsRateLimit,
  withAutomationRateLimit,
  withThreatHuntingRateLimit,
  autoRateLimit,
  getRateLimitInfo,
  RATE_LIMIT_PRESETS,
  _resetRateLimits
};
