/**
 * REMEDIATION HIGH-003: Health Endpoint Authentication Middleware
 * 
 * Provides optional API key authentication for /api/health endpoint
 * to prevent information disclosure to unauthenticated probes.
 * 
 * Configuration:
 * - HEALTH_AUTH_ENABLED=true (default: false for backward compatibility)
 * - HEALTH_AUTH_API_KEY=your-secure-api-key
 * - HEALTH_AUTH_RATE_LIMIT=10 (requests per minute per IP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Configuration
const HEALTH_AUTH_ENABLED = process.env.HEALTH_AUTH_ENABLED === 'true';
const HEALTH_AUTH_API_KEY = process.env.HEALTH_AUTH_API_KEY || '';
const HEALTH_AUTH_RATE_LIMIT = parseInt(process.env.HEALTH_AUTH_RATE_LIMIT || '10', 10);

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface HealthAuthResult {
  authorized: boolean;
  reason?: string;
  statusCode?: number;
}

/**
 * Validate health endpoint authentication
 */
export function validateHealthAuth(request: NextRequest): HealthAuthResult {
  // If auth is disabled, allow all requests
  if (!HEALTH_AUTH_ENABLED) {
    return { authorized: true };
  }
  
  // If no API key configured, deny (security fail-safe)
  if (!HEALTH_AUTH_API_KEY) {
    return {
      authorized: false,
      reason: 'Health authentication enabled but no API key configured',
      statusCode: 500,
    };
  }
  
  // Check 1: API Key in header (primary method)
  const apiKey = request.headers.get('x-health-api-key');
  if (apiKey && apiKey === HEALTH_AUTH_API_KEY) {
    return { authorized: true };
  }
  
  // Check 2: API Key as query parameter (for monitoring tools that can't set custom headers)
  const urlKey = request.nextUrl.searchParams.get('health_key');
  if (urlKey && urlKey === HEALTH_AUTH_API_KEY) {
    return { authorized: true };
  }
  
  // Check 3: Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === HEALTH_AUTH_API_KEY) {
      return { authorized: true };
    }
  }
  
  // All checks failed
  return {
    authorized: false,
    reason: 'Invalid or missing authentication credentials',
    statusCode: 401,
  };
}

/**
 * Rate limiting check for health endpoint
 */
export function checkHealthRateLimit(request: NextRequest): { allowed: boolean; remaining: number } {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] 
                 || request.headers.get('x-real-ip') 
                 || 'unknown';
  
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientIp);
  
  if (!entry || entry.resetTime < now) {
    // New window
    entry = { count: 0, resetTime: now + 60000 };
    rateLimitStore.set(clientIp, entry);
  }
  
  // Increment counter
  entry.count += 1;
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean
    cleanupRateLimitStore();
  }
  
  return {
    allowed: entry.count <= HEALTH_AUTH_RATE_LIMIT,
    remaining: Math.max(0, HEALTH_AUTH_RATE_LIMIT - entry.count),
  };
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Health authentication middleware for Next.js route handlers
 * Usage:
 *   import { healthAuthMiddleware } from '@/lib/auth/health-auth';
 *   
 *   export async function GET(request: NextRequest) {
 *     const authResult = healthAuthMiddleware(request);
 *     if (!authResult.authorized) {
 *       return NextResponse.json({ error: authResult.reason }, { status: authResult.statusCode });
 *     }
 *     // ... existing health check logic
 *   }
 */
export function healthAuthMiddleware(request: NextRequest): HealthAuthResult {
  // Always apply rate limiting first
  const rateLimitResult = checkHealthRateLimit(request);
  
  if (!rateLimitResult.allowed) {
    return {
      authorized: false,
      reason: 'Rate limit exceeded. Try again later.',
      statusCode: 429,
    };
  }
  
  // Then check authentication if enabled
  return validateHealthAuth(request);
}

/**
 * Generate secure API key for health endpoint configuration
 */
export function generateHealthApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let key = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < 32; i++) {
    key += chars[array[i] % chars.length];
  }
  
  return `hk_${key}`;
}

export default {
  validateHealthAuth,
  checkHealthRateLimit,
  healthAuthMiddleware,
  generateHealthApiKey,
};
