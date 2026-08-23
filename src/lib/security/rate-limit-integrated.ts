/**
 * Rate Limiting Integration Middleware
 * Apply to sensitive endpoints to prevent brute force and abuse
 */
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis'; // or ioredis

// Rate limit configurations for different endpoint types
const rateLimits = {
  // Auth endpoints - strict (prevent brute force)
  auth: {
    window: '15m',       // 15 minutes
    maxRequests: 10,     // Max 10 attempts per window
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // API endpoints - moderate
  api: {
    window: '1m',
    maxRequests: 100,    // 100 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  },
  
  // Sensitive operations (password reset, etc.)
  sensitive: {
    window: '1h',
    maxRequests: 3,
    message: 'Too many sensitive operations. Contact support if needed.'
  },
  
  // Search/export endpoints
  resourceIntensive: {
    window: '1h',
    maxRequests: 20,
    message: 'Resource-intensive operation limit reached.'
  }
};

// In-memory fallback for development (no Redis required)
class MemoryStore {
  private requests: Map<string, number[]> = new Map();
  
  async get(key: string): Promise<number[]> {
    return this.requests.get(key) || [];
  }
  
  async set(key: string, value: number[], ttlSeconds?: number): Promise<void> {
    this.requests.set(key, value);
    if (ttlSeconds) {
      setTimeout(() => this.requests.delete(key), ttlSeconds * 1000);
    }
  }
  
  async delete(key: string): Promise<void> {
    this.requests.delete(key);
  }
}

const store = process.env.REDIS_URL 
  ? new Redis({ url: process.env.REDIS_URL })
  : new MemoryStore();

// Create ratelimiter instance
const ratelimit = new Ratelimit({
  redis: typeof store === 'object' && 'get' in store ? store : null as any,
  limiter: Ratelimit.slidingWindow(rateLimits.api.maxRequests, rateLimits.api.window),
});

export async function checkRateLimit(
  request: NextRequest,
  type: keyof typeof rateLimits = 'api'
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const config = rateLimits[type];
  const identifier = this.getClientIdentifier(request);
  
  // Simple in-memory rate limiting (for when Redis is not available)
  const result = await ratelimit.limit(identifier);
  
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset
  };
}

function getClientIdentifier(request: NextRequest): string {
  // Use API key if present, otherwise IP
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) return `api:${apiKey}`;
  
  // Get real IP (considering proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  return forwardedFor?.split(',')[0].trim() || 
         realIp || 
         'unknown:' + crypto.randomUUID();
}

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  type: keyof typeof rateLimits = 'api'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { success, remaining } = await checkRateLimit(request, type);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: rateLimits[type].message,
          errorCode: 'RATE_LIMITED'
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': String(remaining)
          }
        }
      );
    }
    
    const response = await handler(request);
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    
    return response;
  };
}

// Specific wrappers for common use cases
export const withAuthRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>) => 
  withRateLimit(handler, 'auth');

export const withSensitiveRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>) => 
  withRateLimit(handler, 'sensitive');
