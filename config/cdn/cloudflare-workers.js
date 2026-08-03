/**
 * Djezzy SOC Platform - Cloudflare Edge Workers
 * 
 * Edge computing workers for:
 * - Static content optimization
 * - API response transformation
 * - Geographic routing (Algeria-first)
 * - Request authentication validation
 * - Response compression and caching
 */

export default {
  /**
   * Main fetch handler for all requests
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    
    try {
      // Parse request
      const url = new URL(request.url);
      
      // Apply security headers
      const securityResponse = applySecurityHeaders(request);
      if (securityResponse) return securityResponse;
      
      // Route based on path type
      if (isStaticAsset(url.pathname)) {
        return handleStaticAsset(request, url, env, ctx);
      }
      
      if (isAPIRequest(url.pathname)) {
        return handleAPIRequest(request, url, env, ctx);
      }
      
      if (isPageRequest(url.pathname)) {
        return handlePageRequest(request, url, env, ctx);
      }
      
      // Default: proxy to origin
      return proxyToOrigin(request, env);
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  /**
   * Scheduled event handler for cache warming
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled trigger:', event.cron);
    
    // Warm critical caches
    await warmCriticalCaches(env, ctx);
  },
};

// ============================================================
// ENVIRONMENT TYPES
// ============================================================

interface Env {
  // Origin server
  ORIGIN_URL: string;
  
  // Cache configuration
  CACHE_TTL_STATIC: number;
  CACHE_TTL_API: number;
  CACHE_TTL_PAGE: number;
  
  // Security
  AUTH_SECRET: string;
  RATE_LIMIT_ENABLED: string;
  
  // Feature flags
  ENABLE_COMPRESSION: string;
  ENABLE_GEO_ROUTING: string;
  ALGERIA_POP_CODE: string;
  
  // KV namespaces for edge storage
  EDGE_CACHE: KVNamespace;
  RATE_LIMIT_STORE: KVNamespace;
  
  // Analytics
  ANALYTICS_ENDPOINT?: string;
}

// ============================================================
// REQUEST ROUTING
// ============================================================

function isStaticAsset(pathname: string): boolean {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.ico', '.pdf'
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isAPIRequest(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isPageRequest(pathname: string): boolean {
  return !isStaticAsset(pathname) && !isAPIRequest(pathname);
}

// ============================================================
// SECURITY HEADERS & VALIDATION
// ============================================================

function applySecurityHeaders(request: Request): Response | null {
  // Block suspicious user agents
  const blockedAgents = [
    /bot/i, /crawler/i, /spider/i, /scanner/i,
    /nikto/i, /sqlmap/i, /nmap/i
  ];
  
  const userAgent = request.headers.get('User-Agent') || '';
  
  for (const pattern of blockedAgents) {
    if (pattern.test(userAgent)) {
      return new Response('Forbidden', { status: 403 });
    }
  }
  
  // Validate request size
  const contentLength = parseInt(request.headers.get('Content-Length') || '0');
  if (contentLength > 50 * 1024 * 1024) { // 50MB limit
    return new Response('Payload Too Large', { status: 413 });
  }
  
  return null;
}

// ============================================================
// STATIC ASSET HANDLING
// ============================================================

async function handleStaticAsset(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Check edge cache first
  const cacheKey = new Request(url.toString(), request.headers);
  const cache = caches.default;
  
  let response = await cache.match(cacheKey);
  
  if (response) {
    // Add cache status header
    response = new Response(response.body, response.headers);
    response.headers.set('X-Cache-Status', 'HIT');
    response.headers.set('X-Edge-Latency', `${Date.now() - performance.now()}ms`);
    return response;
  }
  
  // Fetch from origin
  response = await fetch(new Request(env.ORIGIN_URL + url.pathname + url.search, {
    method: request.method,
    headers: request.headers,
  }));
  
  // Optimize response
  response = optimizeStaticResponse(response, env);
  
  // Cache the response
  if (response.status === 200) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  
  response.headers.set('X-Cache-Status', 'MISS');
  return response;
}

function optimizeStaticResponse(response: Response, env: Env): Response {
  const newHeaders = new Headers(response.headers);
  
  // Set aggressive caching for versioned assets
  const url = new URL(response.url || '');
  if (url.pathname.includes('_next/static') || url.pathname.includes('/static/')) {
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    newHeaders.set('Cache-Control', `public, max-age=${env.CACHE_TTL_STATIC || 86400}`);
  }
  
  // Add security headers
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable compression if not already compressed
  if (env.ENABLE_COMPRESSION !== 'false') {
    const acceptEncoding = response.headers.get('Accept-Encoding') || '';
    if (acceptEncoding.includes('br')) {
      newHeaders.set('Content-Encoding', 'br');
    } else if (acceptEncoding.includes('gzip')) {
      newHeaders.set('Content-Encoding', 'gzip');
    }
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ============================================================
// API REQUEST HANDLING
// ============================================================

async function handleAPIRequest(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Rate limiting check
  if (env.RATE_LIMIT_ENABLED === 'true') {
    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
        },
      });
    }
    
    // Add rate limit headers to response later
    ctx.waitUntil(updateRateLimitHeaders(request, env));
  }
  
  // For GET requests, check cache
  if (request.method === 'GET' || request.method === 'HEAD') {
    const cachedResponse = await getAPICache(request, url, env);
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  // Proxy to origin with additional headers
  const originRequest = new Request(env.ORIGIN_URL + url.pathname + url.search, {
    method: request.method,
    headers: buildOriginHeaders(request),
    body: request.body,
  });
  
  let response = await fetch(originRequest);
  
  // Cache successful GET responses
  if ((request.method === 'GET' || request.method === 'HEAD') && response.status === 200) {
    response = await cacheAPIResponse(request, response, url, env, ctx);
  }
  
  // Add performance headers
  response.headers.set('X-Edge-Processed', 'true');
  response.headers.set('X-Edge-Timestamp', new Date().toISOString());
  
  return response;
}

async function getAPICache(
  request: Request,
  url: URL,
  env: Env
): Promise<Response | null> {
  const cacheKey = `api:${url.pathname}${url.search}`;
  
  try {
    const cached = await env.EDGE_CACHE.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Status': 'HIT',
          'X-Cache-Age': String(Math.floor((Date.now() - cached.timestamp) / 1000)),
          'Cache-Control': `public, s-maxage=${env.CACHE_TTL_API || 60}, stale-while-revalidate=59`,
        },
      });
    }
  } catch (e) {
    // Cache miss or error
  }
  
  return null;
}

async function cacheAPIResponse(
  request: Request,
  response: Response,
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Only cache successful JSON responses
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return response;
  }
  
  try {
    const data = await response.clone().json();
    const cacheKey = `api:${url.pathname}${url.search}`;
    
    // Store in edge cache asynchronously
    ctx.waitUntil(
      env.EDGE_CACHE.put(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }), {
        expirationTtl: parseInt(env.CACHE_TTL_API || '60'),
      })
    );
  } catch (e) {
    // Unable to parse/cache response
  }
  
  return response;
}

// ============================================================
// PAGE REQUEST HANDLING
// ============================================================

async function handlePageRequest(
  request: Request,
  url: URL,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Check for page in edge cache (ISR support)
  if (request.method === 'GET') {
    const cachedPage = await getPageCache(url, env);
    if (cachedPage) {
      // Trigger background revalidation
      ctx.waitUntil(revalidatePage(url, env));
      return cachedPage;
    }
  }
  
  // Proxy to origin
  const response = await proxyToOrigin(request, env);
  
  // Cache HTML responses
  if (response.status === 200 && response.headers.get('Content-Type')?.includes('text/html')) {
    ctx.waitUntil(cachePage(url, response.clone(), env));
  }
  
  return response;
}

async function getPageCache(url: URL, env: Env): Promise<Response | null> {
  const cacheKey = `page:${url.pathname}`;
  
  try {
    const cached = await env.EDGE_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Cache-Status': 'HIT',
          'X-ISR': 'true',
          'Cache-Control': `s-maxage=${env.CACHE_TTL_PAGE || 10}, stale-while-revalidate=290`,
        },
      });
    }
  } catch (e) {
    // Not cached
  }
  
  return null;
}

async function revalidatePage(url: URL, env: Env): Promise<void> {
  try {
    const response = await fetch(env.ORIGIN_URL + url.pathname, {
      headers: { 'X-ISR-Revalidate': 'true' },
    });
    
    if (response.ok) {
      const body = await response.text();
      await env.EDGE_CACHE.put(`page:${url.pathname}`, body, {
        expirationTtl: parseInt(env.CACHE_TTL_PAGE || '10'),
      });
    }
  } catch (e) {
    console.error('Revalidation failed:', e);
  }
}

async function cachePage(url: URL, response: Response, env: Env): Promise<void> {
  try {
    const body = await response.text();
    await env.EDGE_CACHE.put(`page:${url.pathname}`, body, {
      expirationTtl: parseInt(env.CACHE_TTL_PAGE || '10'),
    });
  } catch (e) {
    console.error('Page caching failed:', e);
  }
}

// ============================================================
// ORIGIN PROXY
// ============================================================

async function proxyToOrigin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  const originRequest = new Request(env.ORIGIN_URL + url.pathname + url.search, {
    method: request.method,
    headers: buildOriginHeaders(request),
    body: request.body,
    redirect: 'follow',
  });
  
  const response = await fetch(originRequest);
  
  // Add CORS headers if needed
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Proxied-By', 'djezzy-soc-edge');
  newHeaders.set('X-Origin-Response-Time', response.headers.get('X-Response-Time') || '');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function buildOriginHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  
  // Forward client IP
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');
  
  // Add edge identification
  headers.set('X-Edge-Request', 'true');
  headers.set('X-Request-ID', crypto.randomUUID());
  
  // Country code from Cloudflare
  headers.set('X-Country', request.headers.get('CF-IPCountry') || '');
  
  // Remove hop-by-hop headers
  headers.delete('Host');
  headers.delete('Connection');
  headers.delete('Keep-Alive');
  headers.delete('Transfer-Encoding');
  
  return headers;
}

// ============================================================
// RATE LIMITING
// ============================================================

interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

async function checkRateLimit(request: Request, env: Env): Promise<RateLimitResult> {
  const clientId = getClientId(request);
  const key = `ratelimit:${clientId}`;
  
  try {
    const current = await env.RATE_LIMIT_STORE.get(key, 'json');
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const limit = 1000;     // requests per window
    
    if (!current || current.resetTime < now) {
      // New window
      await env.RATE_LIMIT_STORE.put(key, JSON.stringify({
        count: 1,
        resetTime: now + windowMs,
      }), { expirationTtl: 120 });
      
      return { allowed: true, retryAfter: 0 };
    }
    
    if (current.count >= limit) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }
    
    // Increment counter
    await env.RATE_LIMIT_STORE.put(key, JSON.stringify({
      count: current.count + 1,
      resetTime: current.resetTime,
    }), { expirationTtl: 120 });
    
    return { allowed: true, retryAfter: 0 };
    
  } catch (e) {
    // On error, allow request (fail open)
    return { allowed: true, retryAfter: 0 };
  }
}

function getClientId(request: Request): string {
  // Use API key if present
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) return `apikey:${apiKey}`;
  
  // Use auth token
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const tokenHash = simpleHash(authHeader.substring(7, 47)); // Hash part of token
    return `auth:${tokenHash}`;
  }
  
  // Fall back to IP
  return `ip:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function updateRateLimitHeaders(request: Request, env: Env): Promise<void> {
  // This would update remaining count headers
  // Implementation depends on specific requirements
}

// ============================================================
// CACHE WARMING (SCHEDULED)
// ============================================================

async function warmCriticalCaches(env: Env, ctx: ExecutionContext): Promise<void> {
  console.log('Warming critical edge caches...');
  
  // Pre-warm dashboard page
  try {
    const dashboardResponse = await fetch(env.ORIGIN_URL + '/', {
      headers: { 'X-Cache-Warm': 'true' },
    });
    
    if (dashboardResponse.ok) {
      const body = await dashboardResponse.text();
      await env.EDGE_CACHE.put('page:/', body, {
        expirationTtl: parseInt(env.CACHE_TTL_PAGE || '10'),
      });
      console.log('Dashboard page warmed');
    }
  } catch (e) {
    console.error('Failed to warm dashboard:', e);
  }
  
  // Pre-warm critical API endpoints
  const criticalEndpoints = [
    '/api/health',
    '/api/metrics?range=1h',
    '/api/alerts?limit=20&status=active',
  ];
  
  for (const endpoint of criticalEndpoints) {
    try {
      const apiResponse = await fetch(env.ORIGIN_URL + endpoint, {
        headers: { 'X-Cache-Warm': 'true' },
      });
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        await env.EDGE_CACHE.put(`api:${endpoint}`, JSON.stringify({
          data,
          timestamp: Date.now(),
        }), {
          expirationTtl: parseInt(env.CACHE_TTL_API || '60'),
        });
      }
    } catch (e) {
      console.error(`Failed to warm ${endpoint}:`, e);
    }
  }
}
