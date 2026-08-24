/**
 * Djezzy National SOC Platform - Production Rate Limiting Middleware
 * 
 * Production-ready rate limiting middleware with:
 * - Singleton RateLimiter instance with sensible defaults
 * - Role-based and endpoint-specific rate limiting
 * - Graceful Redis unavailability handling (fail-open/fail-closed)
 * - Comprehensive header management for client-side visibility
 * - Concurrent connection tracking for streaming endpoints
 * 
 * ANRT Compliance:
 * - All rate limit data stored within Algeria (on-premise Redis)
 * - AES-256 encryption at rest for stored limit data
 * - Audit logging for all rate limit violations
 * 
 * @module lib/production/rate-limit-middleware
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiter,
  RateLimitResult,
  RateLimitOptions,
  RoleBasedLimits,
  EndpointConfig,
  RateLimiterConfig,
  DEFAULT_LIMITS,
  extractClientIP,
} from '@/lib/security/rate-limiter';
import { redisClient, getRedis, safeRedisCommand, initRedis } from '@/lib/cache/redis-client';
import { Redis } from 'ioredis';

// ============================================================================
// Types and Interfaces
// ============================================================================

/** User object structure expected by the middleware */
export interface RateLimitUser {
  /** Unique user identifier */
  id: string;
  /** User role for role-based limits */
  role?: 'analyst' | 'engineer' | 'admin' | 'serviceAccount' | 'unauthenticated';
  /** Additional user metadata */
  [key: string]: unknown;
}

/** Result of rate limit check */
export interface RateLimitCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Headers to include in response */
  headers: Record<string, string>;
  /** Error response if rate limited (429) */
  error?: Response;
  /** Detailed result from limiter */
  result?: RateLimitResult;
}

/** Configuration for fail behavior when Redis is unavailable */
export type FailBehavior = 'fail-open' | 'fail-closed';

/** Middleware configuration options */
export interface RateLimitMiddlewareConfig {
  /** Behavior when Redis is unavailable (default: fail-open) */
  failBehavior?: FailBehavior;
  /** Enable detailed logging */
  verboseLogging?: boolean;
  /** Custom error message for rate limited responses */
  errorMessage?: string;
  /** Custom endpoint configurations to merge with defaults */
  customEndpoints?: EndpointConfig[];
  /** Whether to track concurrent connections for streaming */
  enableConnectionTracking?: boolean;
}

// ============================================================================
// Constants and Default Configurations
// ============================================================================

/**
 * Endpoint-specific rate limit configurations
 * Matches requirements:
 * - /api/incidents: 100/min for analysts, 300/admin
 * - /api/threats: 80/min for analysts, 250/admin  
 * - /api/threat-hunting/*: 30/min for analysts, 100/admin
 * - /api/analytics: 20/min for all authenticated
 * - /api/stream/*: 10 concurrent connections per user
 */
const ENDPOINT_SPECIFIC_LIMITS: EndpointConfig[] = [
  // Incidents endpoint - high volume, critical operations
  {
    path: '/api/incidents',
    method: '*',
    limits: {
      analyst: {
        points: 100,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 300,
        errorMessage: 'Incident API rate limit exceeded. Please reduce request frequency.',
      },
      engineer: {
        points: 200,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 180,
      },
      admin: {
        points: 300,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 120,
      },
      serviceAccount: {
        points: 500,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 60,
      },
      unauthenticated: {
        points: 20,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 900,
      },
    } as RoleBasedLimits,
    overrideGlobal: true,
  },
  // Threats endpoint - intelligence data access
  {
    path: '/api/threats',
    method: '*',
    limits: {
      analyst: {
        points: 80,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 300,
        errorMessage: 'Threat intelligence API rate limit exceeded.',
      },
      engineer: {
        points: 150,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 180,
      },
      admin: {
        points: 250,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 120,
      },
      serviceAccount: {
        points: 400,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 60,
      },
      unauthenticated: {
        points: 15,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 900,
      },
    } as RoleBasedLimits,
    overrideGlobal: true,
  },
  // Threat hunting endpoints - resource intensive queries
  {
    path: '/api/threat-hunting',
    method: '*',
    limits: {
      analyst: {
        points: 30,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 600,
        errorMessage: 'Threat hunting rate limit exceeded. Queries are resource-intensive.',
      },
      engineer: {
        points: 60,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 300,
      },
      admin: {
        points: 100,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 180,
      },
      serviceAccount: {
        points: 200,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 120,
      },
      unauthenticated: {
        points: 5,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 1800,
      },
    } as RoleBasedLimits,
    overrideGlobal: true,
  },
  // Analytics endpoint - computational heavy
  {
    path: '/api/analytics',
    method: '*',
    limits: {
      analyst: {
        points: 20,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 600,
        errorMessage: 'Analytics API rate limit exceeded. Reports are computationally expensive.',
      },
      engineer: {
        points: 20,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 600,
      },
      admin: {
        points: 20,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 600,
      },
      serviceAccount: {
        points: 50,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 300,
      },
      unauthenticated: {
        points: 5,
        duration: 60,
        algorithm: 'sliding-window',
        blockDuration: 1800,
      },
    } as RoleBasedLimits,
    overrideGlobal: true,
  },
  // Streaming endpoints - concurrent connection limits
  {
    path: '/api/stream',
    method: '*',
    limits: {
      points: 10,
      duration: 60,
      algorithm: 'token-bucket',
      blockDuration: 60,
      errorMessage: 'Streaming connection limit reached. Maximum 10 concurrent connections per user.',
    },
    overrideGlobal: true,
  },
];

/** Default middleware configuration */
const DEFAULT_MIDDLEWARE_CONFIG: Required<RateLimitMiddlewareConfig> = {
  failBehavior: process.env.RATE_LIMIT_FAIL_BEHAVIOR === 'fail-closed' ? 'fail-closed' : 'fail-open',
  verboseLogging: process.env.RATE_LIMIT_VERBOSE === 'true',
  errorMessage: 'Rate limit exceeded. Please slow down your requests.',
  customEndpoints: [],
  enableConnectionTracking: true,
};

// ============================================================================
// Logging Utility
// ============================================================================

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const prefix = `[RateLimit][${timestamp}][${level}]`;
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, message, ...args);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, ...args);
      break;
    case LogLevel.DEBUG:
      if (DEFAULT_MIDDLEWARE_CONFIG.verboseLogging) {
        console.debug(prefix, message, ...args);
      }
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

// ============================================================================
// In-Memory Fallback Store (for Redis unavailability)
// ============================================================================

/**
 * In-memory rate limit store for fallback when Redis is unavailable.
 * Uses a simple sliding window implementation.
 */
class InMemoryRateLimitStore {
  private static instance: InMemoryRateLimitStore | null = null;
  private store: Map<string, { count: number; windowStart: number; resetTime: number }> = new Map();
  private connectionStore: Map<string, Set<string>> = new Map(); // Track concurrent connections

  private constructor() {}

  public static getInstance(): InMemoryRateLimitStore {
    if (!InMemoryRateLimitStore.instance) {
      InMemoryRateLimitStore.instance = new InMemoryRateLimitStore();
    }
    return InMemoryRateLimitStore.instance;
  }

  /**
   * Check and increment rate limit using in-memory sliding window
   */
  public check(
    key: string,
    options: RateLimitOptions
  ): RateLimitResult {
    const now = Date.now();
    const windowMs = options.duration * 1000;
    const windowStart = now - windowMs;

    // Get or create entry
    let entry = this.store.get(key);
    
    // Clean up expired entries
    if (entry && entry.windowStart < windowStart) {
      entry = undefined;
      this.store.delete(key);
    }

    if (!entry) {
      entry = {
        count: 0,
        windowStart: now,
        resetTime: now + windowMs,
      };
      this.store.set(key, entry);
    }

    // Check if allowed
    const allowed = entry.count < options.points;

    if (allowed) {
      entry.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, options.points - entry.count),
      resetTime: entry.resetTime,
      limit: options.points,
      current: entry.count,
      retryAfterMs: allowed ? undefined : entry.resetTime - now,
      reason: allowed ? undefined : 'In-memory rate limit exceeded (Redis unavailable)',
    };
  }

  /**
   * Add a concurrent connection
   */
  public addConnection(userId: string, connectionId: string): boolean {
    const connections = this.connectionStore.get(userId) || new Set();
    
    if (connections.size >= 10) {
      return false; // Max connections reached
    }
    
    connections.add(connectionId);
    this.connectionStore.set(userId, connections);
    return true;
  }

  /**
   * Remove a concurrent connection
   */
  public removeConnection(userId: string, connectionId: string): void {
    const connections = this.connectionStore.get(userId);
    if (connections) {
      connections.delete(connectionId);
      if (connections.size === 0) {
        this.connectionStore.delete(userId);
      }
    }
  }

  /**
   * Get current connection count for user
   */
  public getConnectionCount(userId: string): number {
    return this.connectionStore.get(userId)?.size || 0;
  }

  /**
   * Clean up old entries (call periodically)
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================================================
// Singleton RateLimiter Instance
// ============================================================================

/** Global RateLimiter instance (lazy initialized) */
let rateLimiterInstance: RateLimiter | null = null;
let inMemoryStore: InMemoryRateLimitStore | null = null;
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the singleton RateLimiter instance.
 * Call once at application startup.
 */
async function initializeRateLimiter(
  config?: Partial<RateLimitMiddlewareConfig>
): Promise<void> {
  if (isInitialized && rateLimiterInstance) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = doInitialize(config);
  await initializationPromise;
}

async function doInitialize(
  config?: Partial<RateLimitMiddlewareConfig>
): Promise<void> {
  try {
    log(LogLevel.INFO, 'Initializing production rate limiter...');

    // Initialize Redis connection
    await initRedis();

    // Check Redis availability
    const redis = await getRedis();
    
    if (redis) {
      log(LogLevel.INFO, '✅ Redis available, creating distributed rate limiter');
      
      // Merge custom endpoints with defaults
      const mergedEndpoints = [
        ...ENDPOINT_SPECIFIC_LIMITS,
        ...(config?.customEndpoints || []),
      ];

      // Create RateLimiter configuration
      const limiterConfig: RateLimiterConfig = {
        redisClient: redis as Redis,
        defaultLimits: DEFAULT_LIMITS.analyst,
        endpointConfigs: mergedEndpoints,
        roleBasedLimits: DEFAULT_LIMITS,
        ipBasedLimits: {
          enabled: true,
          maxRequestsPerIP: parseInt(process.env.MAX_REQUESTS_PER_IP || '1000', 10),
          windowSeconds: 60,
        },
        globalLimits: {
          enabled: true,
          maxRequestsTotal: parseInt(process.env.GLOBAL_MAX_REQUESTS || '10000', 10),
          windowSeconds: 60,
        },
        verboseLogging: config?.verboseLogging ?? DEFAULT_MIDDLEWARE_CONFIG.verboseLogging,
      };

      rateLimiterInstance = new RateLimiter(limiterConfig);
      log(LogLevel.INFO, '✅ Distributed rate limiter initialized successfully');
    } else {
      log(LogLevel.WARN, '⚠️ Redis unavailable, using in-memory fallback');
      inMemoryStore = InMemoryRateLimitStore.getInstance();
    }

    isInitialized = true;
  } catch (error) {
    log(LogLevel.ERROR, '❌ Failed to initialize rate limiter:', error);
    // Fall back to in-memory store
    inMemoryStore = InMemoryRateLimitStore.getInstance();
    isInitialized = true;
  }
}

/**
 * Get the singleton RateLimiter instance.
 * Initializes if necessary.
 */
function getRateLimiter(): RateLimiter | null {
  return rateLimiterInstance;
}

/**
 * Get the in-memory fallback store
 */
function getInMemoryStore(): InMemoryRateLimitStore {
  if (!inMemoryStore) {
    inMemoryStore = InMemoryRateLimitStore.getInstance();
  }
  return inMemoryStore;
}

// ============================================================================
// IP Extraction Utilities
// ============================================================================

/**
 * Extract client IP address from NextRequest
 * Handles various proxy configurations
 */
function extractIP(request: NextRequest): string {
  // Try the utility function first
  const ipFromUtil = extractClientIP(request as Request);
  if (ipFromUtil && ipFromUtil !== 'unknown') {
    return ipFromUtil;
  }

  // Additional checks specific to NextRequest
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const flyClientIp = request.headers.get('fly-client-ip');
  if (flyClientIp) {
    return flyClientIp.trim();
  }

  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  // Return unknown with hash for tracking
  return `unknown:${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Determine user role from user object
 */
function resolveUserRole(user?: RateLimitUser | any): keyof RoleBasedLimits {
  if (!user) {
    return 'unauthenticated';
  }

  const role = user.role;
  
  // Validate role
  const validRoles: (keyof RoleBasedLimits)[] = [
    'analyst',
    'engineer',
    'admin',
    'serviceAccount',
    'unauthenticated',
  ];

  if (validRoles.includes(role)) {
    return role;
  }

  // Default to analyst for authenticated users without explicit role
  if (user.id) {
    return 'analyst';
  }

  return 'unauthenticated';
}

/**
 * Determine user identity for rate limiting
 */
function resolveUserIdentity(user?: RateLimitUser | any): string | null {
  if (!user?.id) {
    return null;
  }
  return String(user.id);
}

/**
 * Match request path to endpoint configuration
 * Handles wildcard paths like /api/threat-hunting/*
 */
function matchEndpointPath(requestPath: string): string {
  // Normalize path
  const normalizedPath = requestPath.split('?')[0].toLowerCase();
  
  // Check for exact matches or prefix matches for wildcards
  const pathSegments = normalizedPath.split('/');
  
  // Check threat-hunting sub-paths
  if (normalizedPath.startsWith('/api/threat-hunting')) {
    return '/api/threat-hunting';
  }
  
  // Check stream sub-paths
  if (normalizedPath.startsWith('/api/stream')) {
    return '/api/stream';
  }
  
  // Return exact path
  return normalizedPath;
}

// ============================================================================
// Main Rate Limit Check Function
// ============================================================================

/**
 * Check rate limit for a request.
 * 
 * This is the main exported function that should be used in API routes
 * and middleware to check rate limits.
 * 
 * @param request - The NextRequest object
 * @param user - Optional user object with id and role
 * @returns RateLimitCheckResult with allowed status, headers, and optional error response
 * 
 * @example
 * ```typescript
 * import { checkRateLimit } from '@/lib/production/rate-limit-middleware';
 * import { NextRequest, NextResponse } from 'next/server';
 * 
 * export async function GET(request: NextRequest) {
 *   const user = await getCurrentUser(request);
 *   const rateLimitResult = await checkRateLimit(request, user);
 *   
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResult.error!;
 *   }
 *   
 *   // Process request...
 *   return NextResponse.json(data, {
 *     headers: rateLimitResult.headers,
 *   });
 * }
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  user?: RateLimitUser | any,
  config?: Partial<RateLimitMiddlewareConfig>
): Promise<RateLimitCheckResult> {
  // Ensure limiter is initialized
  if (!isInitialized) {
    await initializeRateLimiter(config);
  }

  const mergedConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config };
  const ipAddress = extractIP(request);
  const userIdentity = resolveUserIdentity(user);
  const role = resolveUserRole(user);
  const path = matchEndpointPath(request.nextUrl.pathname);
  const method = request.method;

  log(LogLevel.DEBUG, `Checking rate limit`, {
    path,
    method,
    ipAddress: ipAddress.replace(/\d+\.\d+\.(\d+)\.\d+/, '$1.*.*.*'), // Mask IP for privacy
    userIdentity: userIdentity || '(anonymous)',
    role,
  });

  try {
    // Try distributed rate limiter first
    const limiter = getRateLimiter();
    
    if (limiter) {
      return await checkWithDistributedLimiter(
        limiter,
        userIdentity,
        ipAddress,
        path,
        method,
        role,
        mergedConfig
      );
    }

    // Fall back to in-memory store
    return await checkWithInMemoryStore(
      userIdentity,
      ipAddress,
      path,
      role,
      mergedConfig
    );

  } catch (error) {
    log(LogLevel.ERROR, 'Rate limit check failed:', error);
    
    // Handle based on fail behavior
    if (mergedConfig.failBehavior === 'fail-closed') {
      // Deny all requests when rate limiting fails
      return createDeniedResponse(
        {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          limit: 0,
          current: 0,
          retryAfterMs: 60000,
          reason: 'Rate limiting service unavailable',
        },
        mergedConfig.errorMessage
      );
    }

    // Fail-open: allow request but log warning
    log(LogLevel.WARN, '⚠️ Rate limiter failed, allowing request (fail-open mode)');
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': 'N/A',
        'X-RateLimit-Remaining': 'N/A',
        'X-RateLimit-Reset': 'N/A',
        'X-RateLimit-Mode': 'fail-open',
      },
    };
  }
}

/**
 * Check rate limit using distributed Redis-backed limiter
 */
async function checkWithDistributedLimiter(
  limiter: RateLimiter,
  userIdentity: string | null,
  ipAddress: string,
  path: string,
  method: string,
  role: keyof RoleBasedLimits,
  config: Required<RateLimitMiddlewareConfig>
): Promise<RateLimitCheckResult> {
  // Special handling for streaming endpoints (concurrent connections)
  if (path === '/api/stream' && config.enableConnectionTracking) {
    return await checkStreamingConnection(
      limiter,
      userIdentity,
      ipAddress,
      role,
      config
    );
  }

  // Standard rate limit check
  const result = await limiter.check(userIdentity, ipAddress, path, method, role);

  if (!result.allowed) {
    log(LogLevel.WARN, `🚫 Rate limit exceeded`, {
      path,
      userIdentity: userIdentity || ipAddress,
      reason: result.reason,
      retryAfter: result.retryAfterMs,
    });
    return createDeniedResponse(result, config.errorMessage);
  }

  return {
    allowed: true,
    headers: buildRateLimitHeaders(result),
    result,
  };
}

/**
 * Check streaming connection limits (concurrent connections)
 */
async function checkStreamingConnection(
  limiter: RateLimiter,
  userIdentity: string | null,
  ipAddress: string,
  role: keyof RoleBasedLimits,
  config: Required<RateLimitMiddlewareConfig>
): Promise<RateLimitCheckResult> {
  const redis = await getRedis();
  const connectionKey = `stream:conn:${userIdentity || ipAddress}`;
  const maxConnections = role === 'admin' ? 20 : role === 'serviceAccount' ? 15 : 10;

  if (redis) {
    try {
      // Use Redis to track concurrent connections
      const currentConnections = await redis.scard(connectionKey);
      
      if (currentConnections >= maxConnections) {
        const result: RateLimitResult = {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          limit: maxConnections,
          current: currentConnections,
          retryAfterMs: 60000,
          reason: `Maximum concurrent streaming connections (${maxConnections}) reached`,
        };
        
        return createDeniedResponse(
          result,
          'Maximum concurrent streaming connections reached. Please close existing connections.'
        );
      }

      return {
        allowed: true,
        headers: {
          'X-RateLimit-Limit': String(maxConnections),
          'X-RateLimit-Remaining': String(maxConnections - currentConnections - 1),
          'X-RateLimit-Reset': String(Date.now() + 60000),
          'X-RateLimit-Connection-Current': String(currentConnections),
          'X-RateLimit-Policy': `concurrent;max=${maxConnections}`,
        },
      };
    } catch {
      // Redis command failed, fall through to standard check
    }
  }

  // Fallback to standard rate limit check
  const result = await limiter.check(userIdentity, ipAddress, '/api/stream', 'GET', role);
  
  if (!result.allowed) {
    return createDeniedResponse(result, config.errorMessage);
  }

  return {
    allowed: true,
    headers: buildRateLimitHeaders(result),
    result,
  };
}

/**
 * Check rate limit using in-memory fallback store
 */
async function checkWithInMemoryStore(
  userIdentity: string | null,
  ipAddress: string,
  path: string,
  role: keyof RoleBasedLimits,
  config: Required<RateLimitMiddlewareConfig>
): Promise<RateLimitCheckResult> {
  const store = getInMemoryStore();
  const key = `${userIdentity || 'anon'}:${path}:${role}`;
  
  // Get appropriate limits based on path and role
  const options = getOptionsForEndpoint(path, role);
  const result = store.check(key, options);

  if (!result.allowed) {
    log(LogLevel.WARN, `🚫 Rate limit exceeded (in-memory)`, {
      path,
      userIdentity: userIdentity || ipAddress,
    });
    return createDeniedResponse(result, config.errorMessage);
  }

  return {
    allowed: true,
    headers: {
      ...buildRateLimitHeaders(result),
      'X-RateLimit-Mode': 'in-memory-fallback',
    },
    result,
  };
}

/**
 * Get rate limit options for an endpoint and role (for in-memory fallback)
 */
function getOptionsForEndpoint(path: string, role: keyof RoleBasedLimits): RateLimitOptions {
  // Find matching endpoint configuration
  const endpointConfig = ENDPOINT_SPECIFIC_LIMITS.find(ec => {
    if (ec.path === path) return true;
    // Handle prefix matching
    if (path.startsWith(ec.path + '/') || path.startsWith(ec.path)) return true;
    return false;
  });

  if (endpointConfig && 'analyst' in endpointConfig.limits) {
    const roleLimits = endpointConfig.limits as RoleBasedLimits;
    return roleLimits[role] || DEFAULT_LIMITS[role];
  }

  if (endpointConfig && !('analyst' in endpointConfig.limits)) {
    return endpointConfig.limits as RateLimitOptions;
  }

  return DEFAULT_LIMITS[role] || DEFAULT_LIMITS.analyst;
}

// ============================================================================
// Response Building Utilities
// ============================================================================

/**
 * Build rate limit headers from result
 */
function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(result.resetTime),
    ...(result.retryAfterMs ? {
      'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
    } : {}),
  };
}

/**
 * Create a denied (rate limited) response
 */
function createDeniedResponse(
  result: RateLimitResult,
  errorMessage: string
): RateLimitCheckResult {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(result.resetTime),
    'Content-Type': 'application/json',
  };

  if (result.retryAfterMs) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  const body = {
    error: 'Too Many Requests',
    message: errorMessage,
    statusCode: 429,
    retryAfter: result.retryAfterMs ? Math.ceil(result.retryAfterMs / 1000) : undefined,
    reason: result.reason,
    documentation: 'https://security.djezzy.dz/rate-limits',
    timestamp: new Date().toISOString(),
  };

  const errorResponse = new Response(JSON.stringify(body), {
    status: 429,
    statusText: 'Too Many Requests',
    headers,
  });

  return {
    allowed: false,
    headers,
    error: errorResponse,
    result,
  };
}

// ============================================================================
// Helper Functions for Response Headers
// ============================================================================

/**
 * Add rate limit headers to a NextResponse.
 * 
 * Use this function to add rate limit information to successful responses.
 * 
 * @param response - The NextResponse to modify
 * @param headers - The rate limit headers from checkRateLimit
 * @returns The modified NextResponse
 * 
 * @example
 * ```typescript
 * const rateLimitResult = await checkRateLimit(request, user);
 * if (!rateLimitResult.allowed) {
 *   return rateLimitResult.error!;
 * }
 * 
 * return addRateLimitHeaders(
 *   NextResponse.json(data),
 *   rateLimitResult.headers
 * );
 * ```
 */
export function addRateLimitHeaders<T extends NextResponse>(
  response: T,
  headers: Record<string, string>
): T {
  for (const [key, value] of Object.entries(headers)) {
    // Skip content-type as it's already set on the response
    if (key.toLowerCase() !== 'content-type') {
      response.headers.set(key, value);
    }
  }
  return response;
}

/**
 * Create a rate limited response with proper headers.
 * Useful for manual rate limit handling outside of checkRateLimit.
 */
export function createRateLimitedResponse(options: {
  retryAfterSeconds?: number;
  message?: string;
  limit?: number;
  remaining?: number;
  resetTime?: number;
}): Response {
  const {
    retryAfterSeconds = 60,
    message = 'Rate limit exceeded. Please slow down your requests.',
    limit = 0,
    remaining = 0,
    resetTime = Date.now() + 60000,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetTime),
    'Retry-After': String(retryAfterSeconds),
  };

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message,
      statusCode: 429,
      retryAfter: retryAfterSeconds,
      documentation: 'https://security.djezzy.dz/rate-limits',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 429,
      statusText: 'Too Many Requests',
      headers,
    }
  );
}

// ============================================================================
// Streaming Connection Tracking
// ============================================================================

/**
 * Register a new streaming connection for rate limiting.
 * Call this when a streaming connection is established.
 */
export async function registerStreamConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `stream:conn:${userId}`;
      const current = await redis.scard(key);
      
      if (current >= 10) {
        return false;
      }
      
      await redis.sadd(key, connectionId);
      await redis.expire(key, 3600); // 1 hour expiry
      return true;
    }

    // Fallback to in-memory
    return getInMemoryStore().addConnection(userId, connectionId);
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to register stream connection:', error);
    return getInMemoryStore().addConnection(userId, connectionId);
  }
}

/**
 * Unregister a streaming connection when it closes.
 * Always call this to clean up resources.
 */
export async function unregisterStreamConnection(
  userId: string,
  connectionId: string
): Promise<void> {
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `stream:conn:${userId}`;
      await redis.srem(key, connectionId);
      return;
    }

    // Fallback to in-memory
    getInMemoryStore().removeConnection(userId, connectionId);
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to unregister stream connection:', error);
    getInMemoryStore().removeConnection(userId, connectionId);
  }
}

/**
 * Get current stream connection count for a user.
 */
export async function getStreamConnectionCount(userId: string): Promise<number> {
  try {
    const redis = await getRedis();
    if (redis) {
      const key = `stream:conn:${userId}`;
      return await redis.scard(key);
    }

    return getInMemoryStore().getConnectionCount(userId);
  } catch {
    return getInMemoryStore().getConnectionCount(userId);
  }
}

// ============================================================================
// Higher-Order Function for Route Handlers
// ============================================================================

/**
 * Wrap a route handler with automatic rate limiting.
 * 
 * @example
 * ```typescript
 * export const GET = withRateLimit(async (request) => {
 *   return NextResponse.json(data);
 * });
 * 
 * // With custom config
 * export const POST = withRateLimit(
 *   async (request) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { failBehavior: 'fail-closed' }
 * );
 * ```
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T, ...args: any[]) => Promise<NextResponse>,
  config?: Partial<RateLimitMiddlewareConfig> & { getUser?: (req: T) => Promise<any> }
): (request: T, ...args: any[]) => Promise<NextResponse> {
  return async (request: T, ...args: any[]): Promise<NextResponse> => {
    // Get user if getUser function provided
    let user: any = undefined;
    if (config?.getUser) {
      try {
        user = await config.getUser(request);
      } catch {
        // Continue without user
      }
    }

    // Check rate limit
    const result = await checkRateLimit(request, user, config);

    if (!result.allowed && result.error) {
      return result.error as NextResponse;
    }

    // Execute handler
    const response = await handler(request, ...args);

    // Add rate limit headers to response
    return addRateLimitHeaders(response, result.headers);
  };
}

// ============================================================================
// Initialization and Cleanup
// ============================================================================

/**
 * Initialize the rate limiting middleware.
 * Call this once at application startup (e.g., in layout.tsx or middleware.ts).
 * 
 * @example
 * ```typescript
 * // In your root layout or middleware
 * import { initRateLimitMiddleware } from '@/lib/production/rate-limit-middleware';
 * 
 * initRateLimitMiddleware({
 *   failBehavior: 'fail-open',
 *   verboseLogging: process.env.NODE_ENV === 'development',
 * }).catch(console.error);
 * ```
 */
export async function initRateLimitMiddleware(
  config?: Partial<RateLimitMiddlewareConfig>
): Promise<void> {
  await initializeRateLimiter(config);

  // Periodic cleanup for in-memory store
  if (typeof globalThis.setInterval !== 'undefined') {
    setInterval(() => {
      getInMemoryStore().cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  log(LogLevel.INFO, '✅ Rate limiting middleware initialized');
}

/**
 * Reset the rate limiter (useful for testing)
 */
export function resetRateLimiter(): void {
  rateLimiterInstance = null;
  inMemoryStore = null;
  isInitialized = false;
  initializationPromise = null;
}

// ============================================================================
// Exports
// ============================================================================

export {
  getRateLimiter,
  getInMemoryStore,
  extractIP,
  resolveUserRole,
  resolveUserIdentity,
  matchEndpointPath,
};

export type {
  RateLimitUser,
  FailBehavior,
  RateLimitMiddlewareConfig,
};

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test') {
  initRateLimitMiddleware().catch((error) => {
    log(LogLevel.ERROR, 'Auto-initialization of rate limiter failed:', error);
  });
}
