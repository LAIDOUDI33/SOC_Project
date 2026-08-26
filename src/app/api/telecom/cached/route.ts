/**
 * National SOC Platform - Cached Telecom Protocol Statistics API
 * Algeria 2026-2030 | High-Traffic Endpoint
 * 
 * This is an optimized version of /api/telecom with Redis caching.
 * Telecom protocol statistics are accessed very frequently for monitoring.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withCache,
  cacheInvalidation,
  CACHE_TTL,
  KEY_PREFIXES,
  checkRateLimit,
  getRateLimitHeaders
} from '@/lib/cache'
import { rateLimiter } from '@/lib/rate-limiter'

// GET /api/telecom/cached/protocols - Protocol statistics with Redis caching
export async function GET_PROTOCOLS(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkRateLimit(request, {
    tier: rateLimiter.config.authenticated
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const protocol = searchParams.get('protocol')
  const timeRange = searchParams.get('timeRange') || '1h'
  
  // Use caching middleware
  return withCache(
    request,
    async () => {
      // In production, this would aggregate from:
      // - GTP parser (GTP-U, GTP-C)
      // - SS7/SIGTRAN analyzer (ISUP, MAP, TCAP)
      // - Diameter stack (Cx, Dx, Rx, Gx)
      // - RADIUS server (Authentication, Accounting)
      // - SIP proxy (Registration, INVITE)
      
      const protocols = protocol ? [protocol] : ['GTP', 'SS7', 'Diameter', 'RADIUS', 'SIP']
      
      const stats = protocols.map(p => ({
        protocol: p,
        messagesPerSecond: generateRealisticRate(p),
        errorsPerSecond: Math.floor(Math.random() * 100) + 1,
        avgLatencyMs: Math.floor(Math.random() * 50) + 5,
        p99LatencyMs: Math.floor(Math.random() * 200) + 50,
        activeSessions: getSessionCount(p),
        bytesPerSecond: Math.floor(Math.random() * 10000000) + 1000000,
        
        // Protocol-specific metrics
        ...(p === 'GTP' && {
          createSessions: Math.floor(Math.random() * 1000),
          deleteSessions: Math.floor(Math.random() * 990),
          updateMessages: Math.floor(Math.random() * 50000)
        }),
        ...(p === 'SS7' && {
          isupCalls: Math.floor(Math.random() * 50000),
          mapLookups: Math.floor(Math.random() * 10000),
          sriSuccessRate: 95 + Math.random() * 4.9
        }),
        ...(p === 'Diameter' && {
          cxDiameterRequests: Math.floor(Math.random() * 5000),
          gxDiameterRequests: Math.floor(Math.random() * 3000),
          rxDiameterRequests: Math.floor(Math.random() * 2000)
        }),
        ...(p === 'RADIUS' && {
          authRequests: Math.floor(Math.random() * 20000),
          accountingStarts: Math.floor(Math.random() * 15000),
          authSuccessRate: 98 + Math.random() * 1.9
        }),
        ...(p === 'SIP' && {
          registrations: Math.floor(Math.random() * 5000),
          inviteAttempts: Math.floor(Math.random() * 30000),
          callSetupTimeMs: Math.floor(Math.random() * 500) + 100
        })
      }))
      
      // Calculate totals
      const totals = {
        totalMessagesPerSecond: stats.reduce((sum, s) => sum + s.messagesPerSecond, 0),
        totalErrorsPerSecond: stats.reduce((sum, s) => sum + s.errorsPerSecond, 0),
        totalBytesPerSecond: stats.reduce((sum, s) => sum + s.bytesPerSecond, 0),
        overallErrorRate: 0
      }
      totals.overallErrorRate = totals.totalErrorsPerSecond / totals.totalMessagesPerSecond * 100

      return {
        protocols: stats,
        totals,
        timeRange,
        generatedAt: new Date(),
        _cached: false
      }
    },
    {
      ttl: CACHE_TTL.PROTOCOL_STATS,
      swr: true,
      swrTtl: CACHE_TTL.PROTOCOL_STATS * 3,
      prefix: KEY_PREFIXES.TELECOM,
      includeQueryParams: ['protocol', 'timeRange'],
      tags: ['telecom', 'protocols']
    }
  )
}

// GET /api/telecom/cached/subscribers - Subscriber lookup with caching
export async function GET_SUBSCRIBER(request: NextRequest) {
  const rateLimitResult = await checkRateLimit(request)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const { searchParams } = new URL(request.url)
  const msisdn = searchParams.get('msisdn')
  const imsi = searchParams.get('imsi')
  
  if (!msisdn && !imsi) {
    return NextResponse.json(
      { error: 'MSISDN or IMSI parameter required' },
      { status: 400 }
    )
  }

  const identifier = msisdn || imsi || 'unknown'
  
  return withCache(
    request,
    async () => {
      // In production, this queries HLR/HSS via telecom APIs
      const operators = ['mobilis', 'djezzy', 'ooredoo']
      const randomOperator = operators[Math.floor(Math.random() * operators.length)]
      
      return {
        msisdn: msisdn || `213${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}`,
        imsi: imsi || `21301${Math.floor(Math.random() * 10000000000)}`,
        operator: randomOperator,
        status: Math.random() > 0.05 ? 'active' : 
                 Math.random() > 0.5 ? 'roaming' : 'inactive',
        lastLocation: [
          'Algiers', 'Oran', 'Constantine', 'Batna', 'Sétif',
          'Annaba', 'Blida', 'Béjaïa', 'Tlemcen', Béchar'
        ][Math.floor(Math.random() * 10)],
        pdpContextActive: Math.random() > 0.3,
        imei: `35${Math.floor(Math.random() * 1000000000000000).toString().padStart(14, '0')}`,
        lastRegistration: new Date(Date.now() - Math.random() * 86400000),
        roamingPartner: Math.random() > 0.7 ? 
          ['Orange France', 'Telecom Italia', 'Vodafone UK', 'Deutsche Telekom']
            [Math.floor(Math.random() * 4)] : null,
        _cached: false
      }
    },
    {
      ttl: CACHE_TTL.TELECOM_SUBSCRIBERS,
      prefix: KEY_PREFIXES.TELECOM,
      tags: ['telecom', 'subscriber']
    }
  )
}

// GET /api/telecom/cached/network - Network overview statistics
export async function GET_NETWORK(request: NextRequest) {
  return withCache(
    request,
    async () => {
      // Aggregate network statistics for all three operators
      const operators = ['mobilis', 'djezzy', 'ooredoo']
      
      const networkStats = operators.map(op => ({
        operator: op,
        subscribers: {
          mobilis: 21000000 + Math.floor(Math.random() * 500000),
          djezzy: 16000000 + Math.floor(Math.random() * 400000),
          ooredoo: 9000000 + Math.floor(Math.random() * 300000)
        }[op],
        btsSites: Math.floor(Math.random() * 15000) + 8000,
        coreNodes: Math.floor(Math.random() * 50) + 20,
        dataTrafficGbps: Math.floor(Math.random() * 100) + 20,
        voiceErlangs: Math.floor(Math.random() * 500000) + 100000,
        dropRate: Math.random() * 2,
        setupSuccessRate: 97 + Math.random() * 2.9
      }))
      
      return {
        operators: networkStats,
        national: {
          totalSubscribers: networkStats.reduce((s, o) => s + o.subscribers, 0),
          totalBtsSites: networkStats.reduce((s, o) => s + o.btsSites, 0),
          averageDropRate: networkStats.reduce((s, o) => s + o.dropRate, 0) / 3,
          nationalRoamingActive: true
        },
        _cached: false
      }
    },
    {
      ttl: CACHE_TTL.PROTOCOL_STATS,
      swr: true,
      swrTtl: CACHE_TTL.PROTOCOL_STATS * 5,
      prefix: `${KEY_PREFIXES.TELECOM}:network`
    }
  )
}

// POST /api/telecom/cached/invalidate - Invalidate telecom caches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const isAdmin = request.headers.get('x-user-role') === 'admin'
    const validAdminKey = body.adminKey === process.env.ADMIN_API_KEY
    
    if (!isAdmin && !validAdminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const deletedCount = await cacheInvalidation.telecom()
    
    return NextResponse.json({
      success: true,
      message: `Invalidated ${deletedCount} telecom cache entries`,
      deletedCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Telecom Cache API] Invalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}

// Route handler that dispatches to sub-handlers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'protocols'
  
  switch (type) {
    case 'protocols':
      return GET_PROTOCOLS(request)
    case 'subscriber':
      return GET_SUBSCRIBER(request)
    case 'network':
      return GET_NETWORK(request)
    default:
      return NextResponse.json(
        { error: 'Invalid type. Use: protocols, subscriber, or network' },
        { status: 400 }
      )
  }
}

export async function POST(request: NextRequest) {
  return POST(request)
}

// ===========================================
// Helper Functions
// ===========================================

function generateRealisticRate(protocol: string): number {
  switch (protocol) {
    case 'GTP':   return Math.floor(Math.random() * 80000) + 20000  // 20K-100K msg/s
    case 'SS7':   return Math.floor(Math.random() * 30000) + 5000   // 5K-35K msg/s
    case 'Diameter': return Math.floor(Math.random() * 20000) + 3000 // 3K-23K msg/s
    case 'RADIUS': return Math.floor(Math.random() * 25000) + 5000  // 5K-30K msg/s
    case 'SIP':   return Math.floor(Math.random() * 15000) + 2000   // 2K-17K msg/s
    default:      return Math.floor(Math.random() * 10000) + 1000
  }
}

function getSessionCount(protocol: string): number {
  switch (protocol) {
    case 'GTP':   return Math.floor(Math.random() * 200000) + 100000  // PDP contexts
    case 'SIP':   return Math.floor(Math.random() * 50000) + 10000    // Active calls
    case 'Diameter': return Math.floor(Math.random() * 5000) + 1000   // Active sessions
    default:      return Math.floor(Math.random() * 1000)
  }
}
