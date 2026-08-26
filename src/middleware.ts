/**
 * National SOC Platform - Security Middleware (No Authentication)
 * Algeria 2026-2030 | Security Headers & Rate Limiting Only
 * 
 * Next.js middleware for:
 * - Security headers injection
 * - Rate limiting (basic protection)
 * - No authentication required - Public access platform
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============= CONFIGURATION =============

// Rate limiting store (in-memory for demo; use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMITS = {
  default: 200,
  api: 2000
}

// ============= HELPER FUNCTIONS =============

function getRateLimitKey(request: NextRequest): string {
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown'
  
  const path = request.nextUrl.pathname
  
  // Different rate limits for different routes
  if (path.startsWith('/api')) return `api:${ip}`
  return `page:${ip}`
}

function checkRateLimit(key: string, limit: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: limit - 1, resetTime: now + RATE_LIMIT_WINDOW }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

// ============= MAIN MIDDLEWARE =============

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // ============= SECURITY HEADERS =============
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:"
  )

  // ============= HEALTH CHECK BYPASS =============
  if (pathname === '/health') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // ============= RATE LIMITING (Basic Protection) =============
  const rateLimitKey = getRateLimitKey(request)
  let rateLimitCategory = pathname.startsWith('/api') ? 'api' : 'default'

  const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS[rateLimitCategory])
  
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[rateLimitCategory]))
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)))

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
        }
      }
    )
  }

  // ============= NO AUTHENTICATION REQUIRED =============
  // Platform is publicly accessible without login
  // All routes are open - no redirects or auth checks

  return response
}

// ============= CONFIGURATION =============
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
}
