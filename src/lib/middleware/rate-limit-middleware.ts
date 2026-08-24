/**
 * Global Rate Limiting Middleware
 * National SOC Platform - Security Layer
 * 
 * PRODUCTION-READY: Applies rate limiting to ALL /api/* routes
 * 
 * Features:
 * - Per-IP rate limiting with configurable windows
 * - Route-specific limits (auth endpoints stricter)
 * - Redis-backed for distributed deployments
 * - In-memory fallback for single-instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/middleware/rate-limit';

// Rate limit configurations by route pattern
const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  // Authentication endpoints - very strict
  '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 per 15 min
  '/api/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 },    // 3 per hour
  '/api/auth/password': { windowMs: 60 * 60 * 1000, maxRequests: 5 },   // 5 per hour
  '/api/auth/mfa': { windowMs: 60 * 60 * 1000, maxRequests: 10 },       // 10 per hour
  
  // Admin endpoints - strict but workable
  '/api/admin/': { windowMs: 60 * 1000, maxRequests: 50 },             // 50 per minute
  
  // Sensitive operations
  '/api/admin/users': { windowMs: 60 * 1000, maxRequests: 20 },
  '/api/admin/security': { windowMs: 60 * 1000, maxRequests: 30 },
  
  // General API endpoints - moderate limits
  '/api/incidents': { windowMs: 60 * 1000, maxRequests: 100 },
  '/api/alerts': { windowMs: 60 * 1000, maxRequests: 200 },
  '/api/threats': { windowMs: 60 * 1000, maxRequests: 100 },
  '/api/ss7/': { windowMs: 60 * 1000, maxRequests: 150 },
  '/api/telecom/': { windowMs: 60 * 1000, maxRequests: 150 },
  '/api/analytics': { windowMs: 60 * 1000, maxRequests: 30 },
  '/api/reports': { windowMs: 60 * 1000, maxRequests: 10 },
  '/api/export': { windowMs: 60 * 1000, maxRequests: 5 },
  
  // Streaming endpoints - high limits (long-lived connections)
  '/api/stream/': { windowMs: 60 * 1000, maxRequests: 10 },
  
  // Default limit for unmatched routes
  'default': { windowMs: 60 * 1000, maxRequests: 60 },
};

// Create rate limiter instances for each config
const limiters = new Map<string, RateLimiter>();

function getLimiter(key: string): RateLimiter {
  if (!limiters.has(key)) {
    const config = RATE_LIMITS[key] || RATE_LIMITS['default'];
    limiters.set(key, new RateLimiter({
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
    }));
  }
  return limiters.get(key)!;
}

// Find matching rate limit config for a path
function findRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } {
  // Check specific routes first (more specific = higher priority)
  const sortedKeys = Object.keys(RATE_LIMITS).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (pathname.startsWith(key)) {
      return RATE_LIMITS[key];
    }
  }
  
  return RATE_LIMITS['default'];
}

// Extract client IP from request
function getClientIP(request: NextRequest): string {
  // Check common proxy headers first
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return request.headers.get('x-vercel-forwarded-for') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown';
}

/**
 * Apply rate limiting to a request
 * Returns null if allowed, or a Response if rate limited
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const pathname = new URL(request.url).pathname;
  
  // Only rate limit API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  
  // Skip health checks and static assets
  if (pathname === '/api/health' || pathname.endsWith('.js') || pathname.endsWith('.css')) {
    return null;
  }
  
  const clientIP = getClientIP(request);
  const config = findRateLimitConfig(pathname);
  const limiter = getLimiter(pathname);
  
  // Check rate limit
  const result = await limiter.check(clientIP);
  
  if (!result.allowed) {
    // Return 429 Too Many Requests
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        errorCode: 'RATE_LIMITED',
        retryAfter: Math.ceil(result.retryAfterMs / 1000),
        message: `Rate limit exceeded. Try again in ${Math.ceil(result.retryAfterMs / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)),
        }
      }
    );
  }
  
  // Add rate limit headers to successful responses will be handled by response middleware
  return null;
}

/**
 * Middleware function for Next.js route handlers
 * Usage: export const GET = withRateLimit(async (request) => { ... });
 */
export function withRateLimit(handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]) => {
    const rateLimitedResponse = await applyRateLimit(request);
    
    if (rateLimitedResponse) {
      return rateLimitedResponse;
    }
    
    const response = await handler(request, ...args);
    
    // Add rate limit headers to response
    const pathname = new URL(request.url).pathname;
    const clientIP = getClientIP(request);
    const config = findRateLimitConfig(pathname);
    const limiter = getLimiter(pathname);
    const state = limiter.getState(clientIP);
    
    // Clone response to add headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    newResponse.headers.set('X-RateLimit-Limit', String(config.maxRequests));
    newResponse.headers.set('X-RateLimit-Remaining', String(Math.max(0, state.remaining)));
    newResponse.headers.set('X-RateLimit-Reset', String(state.resetTime));
    
    return newResponse;
  };
}

/**
 * Whitelist check - returns true if IP should bypass rate limiting
 */
export function isWhitelisted(ip: string): boolean {
  const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',')?.map(s => s.trim()) || [];
  
  // Always allow localhost in development
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost')) {
    return true;
  }
  
  return whitelist.includes(ip);
}
