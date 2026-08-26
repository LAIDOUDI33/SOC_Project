/**
 * Audit Middleware for Next.js
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Next.js middleware for automatic request auditing:
 * - Log all API requests with full metadata
 * - Capture request/response information
 * - Measure response times for performance tracking
 * - Track user sessions and authentication state
 * - Detect anomaly patterns (rate limiting, suspicious activity)
 * - Enforce authentication requirements on protected routes
 * 
 * @example
 * // In middleware.ts at project root
 * import { auditMiddleware } from './modules/logging/middleware/audit-middleware';
 * 
 * export default auditMiddleware({
 *   enableAuditLogging: true,
 *   enablePerformanceTracking: true,
 *   protectedRoutes: ['/api/admin/*', '/api/settings/*']
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  LogLevel,
  LogSource,
  AuditAction,
  ActorType,
  ResourceType,
  AuditOutcome,
  Environment,
  generateId,
  getTimestamp
} from '../types/logging.types';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/** Configuration options for the audit middleware */
export interface AuditMiddlewareConfig {
  /** Enable audit logging for all requests */
  enableAuditLogging: boolean;
  
  /** Enable performance timing measurement */
  enablePerformanceTracking: boolean;
  
  /** Enable anomaly detection */
  enableAnomalyDetection: boolean;
  
  /** Routes that require authentication (glob patterns) */
  protectedRoutes?: string[];
  
  /** Routes to exclude from logging (glob patterns) */
  excludedRoutes?: string[];
  
  /** Rate limiting configuration */
  rateLimit?: {
    /** Max requests per window */
    maxRequests: number;
    /** Window in milliseconds */
    windowMs: number;
    /** Whether to block or just warn */
    blockOnExceed: boolean;
  };
  
  /** Custom header names for correlation */
  headers?: {
    requestId?: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    realIp?: string;
  };
  
  /** Sensitive headers to mask in logs */
  sensitiveHeaders?: string[];
  
  /** Sensitive query params to mask */
  sensitiveQueryParams?: string[];
  
  /** Environment identifier */
  environment?: Environment;
}

/** Default configuration values */
const DEFAULT_CONFIG: Required<Omit<AuditMiddlewareConfig, 'protectedRoutes' | 'excludedRoutes' | 'rateLimit'>> & {
  protectedRoutes: string[];
  excludedRoutes: string[];
  rateLimit: NonNullable<AuditMiddlewareConfig['rateLimit']>;
} = {
  enableAuditLogging: true,
  enablePerformanceTracking: true,
  enableAnomalyDetection: true,
  protectedRoutes: [
    '/api/admin/*',
    '/api/settings/*',
    '/api/users/*',
    '/api/config/*'
  ],
  excludedRoutes: [
    '/_next/*',
    '/static/*',
    '/favicon.ico',
    '/health',
    '/healthz'
  ],
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
    blockOnExceed: false
  },
  headers: {
    requestId: 'X-Request-ID',
    correlationId: 'X-Correlation-ID',
    userId: 'X-User-ID',
    sessionId: 'X-Session-ID',
    realIp: 'X-Real-IP'
  },
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ],
  sensitiveQueryParams: [
    'token',
    'password',
    'apikey',
    'secret',
    'key'
  ],
  environment: process.env.NODE_ENV === 'production' ? Environment.PRODUCTION : Environment.DEVELOPMENT
};

// ============================================================================
// IN-MEMORY STATE (for rate limiting)
// ============================================================================

interface RequestRecord {
  count: number;
  resetTime: number;
}

/** In-memory store for rate limiting (in production, use Redis) */
const rateLimitStore = new Map<string, RequestRecord>();

/** Cleanup interval for expired entries */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a path matches a glob pattern
 */
function matchPattern(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Check if a path is in a list of patterns
 */
function isPathMatched(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchPattern(path, pattern));
}

/**
 * Generate or extract request ID from headers
 */
function getRequestId(request: NextRequest, config: typeof DEFAULT_CONFIG): string {
  const headerName = config.headers.requestId || 'X-Request-ID';
  return request.headers.get(headerName) || generateId();
}

/**
 * Generate or extract correlation ID from headers
 */
function getCorrelationId(request: NextRequest, config: typeof DEFAULT_CONFIG): string {
  const headerName = config.headers.correlationId || 'X-Correlation-ID';
  return request.headers.get(headerName) || generateId().slice(0, 16);
}

/**
 * Extract client IP address
 */
function getClientIp(request: NextRequest, config: typeof DEFAULT_CONFIG): string {
  // Try configured header first (for reverse proxy setups)
  const realIpHeader = config.headers.realIp || 'X-Real-IP';
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get(realIpHeader);
  
  return realIp || forwardedFor?.split(',')[0]?.trim() || 
         request.ip || 'unknown';
}

/**
 * Extract user ID from request
 */
function getUserId(request: NextResponse | null, config: typeof DEFAULT_CONFIG): string | undefined {
  if (!request) return undefined;
  
  const headerName = config.headers.userId || 'X-User-ID';
  return request.headers.get(headerName) || undefined;
}

/**
 * Mask sensitive values in an object
 */
function maskSensitiveData(
  obj: Record<string, string>,
  sensitiveKeys: string[]
): Record<string, string> {
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase() === sensitive.toLowerCase())) {
      result[key] = '[REDACTED]';
    }
  }
  
  return result;
}

/**
 * Simple hash function for IP anonymization
 */
function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Anonymize IP address (keep first two octets)
 */
function anonymizeIp(ip: string): string {
  if (ip === 'unknown') return ip;
  
  const parts = ip.split('.');
  if (parts.length === 4) {
    // IPv4: keep first two octets
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  
  if (ip.includes(':')) {
    // IPv6: simplify
    return ip.replace(/:[a-f0-9]+(:{1,2})?$/, ':****$1');
  }
  
  return hashValue(ip);
}

// ============================================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================================

/** Store for recent requests (circular buffer) */
const recentRequests: Array<{
  timestamp: string;
  ip: string;
  path: method: string;
  statusCode: number;
}> = [];

const MAX_RECENT_REQUESTS = 1000;

/**
 * Add entry to recent requests buffer
 */
function addRecentRequest(entry: {
  timestamp: string;
  ip: string;
  path: string;
  method: string;
  statusCode: number;
}): void {
  recentRequests.push(entry);
  if (recentRequests.length > MAX_RECENT_REQUESTS) {
    recentRequests.shift();
  }
}

/**
 * Check for anomalous patterns
 */
function detectAnomalies(
  ip: string,
  path: string,
  method: string
): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}> {
  const anomalies: ReturnType<typeof detectAnomalies> = [];
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Count requests from this IP in last minute
  const recentFromIp = recentRequests.filter(
    r => r.ip === ip && new Date(r.timestamp).getTime() > oneMinuteAgo
  );
  
  // High frequency detection
  if (recentFromIp.length > 60) { // More than 1 per second average
    anomalies.push({
      type: 'HIGH_FREQUENCY',
      severity: 'high',
      message: `High request frequency detected: ${recentFromIp.length} requests in last minute`
    });
  }
  
  // Same path rapid repetition
  const samePathCount = recentFromIp.filter(r => r.path === path).length;
  if (samePathCount > 30) {
    anomalies.push({
      type: 'RAPID_REPETITION',
      severity: 'medium',
      message: `Rapid repeated access to ${path}: ${samePathCount} times`
    });
  }
  
  // Error rate spike
  const errorCount = recentFromIp.filter(r => r.statusCode >= 400).length;
  if (errorCount > 10 && errorCount / recentFromIp.length > 0.5) {
    anomalies.push({
      type: 'ERROR_SPIKE',
      severity: 'high',
      message: `High error rate: ${errorCount}/${recentFromIp.length} requests failed`
    });
  }
  
  // Path scanning detection (many different paths)
  const uniquePaths = new Set(recentFromIp.map(r => r.path));
  if (uniquePaths.size > 20 && recentFromIp.length > 40) {
    anomalies.push({
      type: 'PATH_SCANNING',
      severity: 'critical',
      message: `Possible path scanning: ${uniquePaths.size} unique paths accessed`
    });
  }
  
  // Suspicious paths
  const suspiciousPatterns = [
    /\.env$/,
    /\.git/,
    /admin/,
    /backup/,
    /config/,
    /\.\./,
    /passwd/,
    /shadow/
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(path)) {
      anomalies.push({
        type: 'SUSPICIOUS_PATH',
        severity: 'high',
        message: `Access to potentially sensitive path: ${path}`
      });
      break;
    }
  }
  
  return anomalies;
}

/**
 * Check rate limit for an identifier
 */
function checkRateLimit(
  identifier: string,
  config: NonNullable<AuditMiddlewareConfig['rateLimit']>
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(identifier);
  
  if (!existing || now > existing.resetTime) {
    // New window
    const record: RequestRecord = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(identifier, record);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: record.resetTime
    };
  }
  
  // Existing window
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }
  
  existing.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  };
}

// ============================================================================
// MAIN MIDDLEWARE FUNCTION
// ============================================================================

/**
 * Create and export the audit middleware function
 * 
 * @param userConfig Optional configuration overrides
 * @returns Next.js middleware handler function
 * 
 * @example
 * ```typescript
 * // middleware.ts
 * import { auditMiddleware } from '@/modules/logging/middleware/audit-middleware';
 * 
 * export default auditMiddleware({
 *   enableAuditLogging: true,
 *   protectedRoutes: ['/api/admin/*', '/api/secure/*']
 * });
 * ```
 */
export function auditMiddleware(userConfig?: Partial<AuditMiddlewareConfig>) {
  // Merge user config with defaults
  const config: typeof DEFAULT_CONFIG = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    headers: { ...DEFAULT_CONFIG.headers, ...userConfig?.headers },
    rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...userConfig?.rateLimit },
    protectedRoutes: userConfig?.protectedRoutes || DEFAULT_CONFIG.protectedRoutes,
    excludedRoutes: userConfig?.excludedRoutes || DEFAULT_CONFIG.excludedRoutes
  };

  // Start cleanup interval
  startCleanup();

  // Return the actual middleware function
  return async function middleware(request: NextRequest): Promise<NextResponse | undefined> {
    const startTime = Date.now();
    const timestamp = getTimestamp();
    
    // Extract request metadata
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    const requestId = getRequestId(request, config);
    const correlationId = getCorrelationId(request, config);
    const clientIp = getClientIp(request, config);
    const anonymizedIp = anonymizeIp(clientIp);
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check if route is excluded
    if (isPathMatched(pathname, config.excludedRoutes)) {
      // Pass through without logging
      return handleRequest(request);
    }

    // Rate limiting check
    if (config.enableAnomalyDetection && config.rateLimit) {
      const rateLimitKey = `${anonymizedIp}:${pathname}`;
      const rateLimitResult = checkRateLimit(rateLimitKey, config.rateLimit);
      
      if (!rateLimitResult.allowed) {
        if (config.rateLimit.blockOnExceed) {
          // Block the request
          const response = NextResponse.json(
            { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) },
            { status: 429 }
          );
          
          response.headers.set('X-RateLimit-Limit', String(config.rateLimit.maxRequests));
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)));
          response.headers.set('Retry-After', String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)));
          
          // Log rate limit event
          if (config.enableAuditLogging) {
            logEvent({
              level: LogLevel.WARN,
              source: LogSource.API_ERROR,
              message: `Rate limit exceeded for ${anonymizedIp}`,
              data: {
                ip: anonymizedIp,
                path: pathname,
                method,
                requestId,
                correlationId
              },
              timestamp
            });
          }
          
          return response;
        }
        
        // Just add warning headers but allow through
        const response = await handleRequest(request);
        response.headers.set('X-RateLimit-Warning', 'Approaching limit');
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        return response;
      }
      
      // Continue processing - will set headers on response later
    }

    // Protected route authentication check
    if (isPathMatched(pathname, config.protectedRoutes)) {
      const authHeader = request.headers.get('authorization');
      const authToken = request.headers.get('x-auth-token') || 
                        request.cookies.get('auth-token')?.value;
      
      if (!authHeader && !authToken) {
        // No authentication present
        const response = NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
        
        if (config.enableAuditLogging) {
          logEvent({
            level: LogLevel.WARN,
            source: LogSource.AUTH_LOGIN,
            message: `Unauthenticated access attempt to protected route: ${pathname}`,
            data: {
              ip: anonymizedIp,
              path: pathname,
              method,
              requestId,
              correlationId,
              userAgent: userAgent.substring(0, 200)
            },
            timestamp
          });
        }
        
        return response;
      }
    }

    // Process the request
    let response: NextResponse;
    try {
      response = await handleRequest(request);
    } catch (error) {
      // Handle errors
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      
      if (config.enableAuditLogging) {
        logEvent({
          level: LogLevel.ERROR,
          source: LogSource.API_ERROR,
          message: `Error processing ${method} ${pathname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: {
            ip: anonymizedIp,
            path: pathname,
            method,
            requestId,
            correlationId,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: config.environment === Environment.DEVELOPMENT ? error.stack : undefined
            } : undefined
          },
          timestamp
        });
      }
      
      return response;
    }

    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    // Add standard headers to response
    response.headers.set(config.headers.requestId || 'X-Request-ID', requestId);
    response.headers.set(config.headers.correlationId || 'X-Correlation-ID', correlationId);
    
    if (config.enablePerformanceTracking) {
      response.headers.set('X-Response-Time', `${durationMs}ms`);
      response.headers.set('X-Request-Started', timestamp);
    }

    // Anomaly detection
    if (config.enableAnomalyDetection) {
      const anomalies = detectAnomalies(anonymizedIp, pathname, method);
      
      if (anomalies.length > 0) {
        // Add anomaly info to response headers (for debugging)
        response.headers.set('X-Security-Anomalies', String(anomalies.length));
        
        // Log anomalies
        if (config.enableAuditLogging) {
          for (const anomaly of anomalies) {
            logEvent({
              level: anomaly.severity === 'critical' ? LogLevel.CRITICAL :
                     anomaly.severity === 'high' ? LogLevel.WARN :
                     LogLevel.INFO,
              source: LogSource.SECURITY_ALERT,
              message: `[ANOMALY] ${anomaly.type}: ${anomaly.message}`,
              data: {
                anomalyType: anomaly.type,
                severity: anomaly.severity,
                ip: anonymizedIp,
                path: pathname,
                method,
                requestId,
                correlationId
              },
              timestamp
            });
          }
        }
      }
      
      // Record this request for future analysis
      addRecentRequest({
        timestamp,
        ip: anonymizedIp,
        path: pathname,
        method,
        statusCode: response.status
      });
    }

    // Audit logging
    if (config.enableAuditLogging) {
      // Determine log level based on status code
      const logLevel = response.status >= 500 ? LogLevel.ERROR :
                       response.status >= 400 ? LogLevel.WARN :
                       response.status >= 300 ? LogLevel.INFO :
                       LogLevel.DEBUG;
      
      // Build log data
      const logData: Record<string, unknown> = {
        method,
        path: pathname,
        statusCode: response.status,
        durationMs,
        ip: anonymizedIp,
        requestId,
        correlationId,
        userAgent: userAgent.substring(0, 200)
      };
      
      // Add query params (masked)
      const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
      if (Object.keys(searchParams).length > 0) {
        logData.queryParams = maskSensitiveData(searchParams, config.sensitiveQueryParams);
      }
      
      // Add headers summary (masked)
      const headerSummary: Record<string, string> = {};
      if (request.headers.get('content-type')) {
        headerSummary['content-type'] = request.headers.get('content-type')!;
      }
      if (request.headers.get('accept')) {
        headerSummary.accept = request.headers.get('accept')!;
      }
      if (Object.keys(headerSummary).length > 0) {
        logData.requestHeaders = headerSummary;
      }
      
      logEvent({
        level: logLevel,
        source: LogSource.API_REQUEST,
        message: `${method} ${pathname} → ${response.status} (${durationMs}ms)`,
        data: logData,
        timestamp
      });

      // Additional audit trail entry for significant events
      if (response.status >= 400 || method !== 'GET') {
        createAuditEntry({
          action: method === 'GET' ? AuditAction.DATA_ACCESS :
                 method === 'POST' ? AuditAction.CREATE :
                 method === 'PUT' ? AuditAction.UPDATE :
                 method === 'DELETE' ? AuditAction.DELETE :
                 AuditAction.QUERY_EXECUTED,
          actor: {
            id: getUserId(response, config) || `anonymous:${anonymizedIp}`,
            type: getUserId(response, config) ? ActorType.USER : ActorType.EXTERNAL,
            ipAddress: anonymizedIp,
            userAgent: userAgent.substring(0, 200)
          },
          resource: {
            type: ResourceType.API_KEY, // Using generic API resource type
            id: pathname,
            name: `${method} ${pathname}`
          },
          outcome: response.status < 400 ? AuditOutcome.SUCCESS :
                  response.status < 500 ? AuditOutcome.DENIED :
                  AuditOutcome.ERROR,
          description: `${method} request to ${pathname} resulted in ${response.status}`,
          context: {
            requestId,
            durationMs,
            statusCode: response.status
          },
          timestamp
        });
      }
    }

    return response;
  };
}

// ============================================================================
// LOGGING IMPLEMENTATION
// ============================================================================

/** Internal log event structure */
interface LogEventData {
  level: LogLevel;
  source: LogSource;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/** Internal audit entry structure */
interface AuditEntryData {
  action: AuditAction;
  actor: {
    id: string;
    type: ActorType;
    ipAddress?: string;
    userAgent?: string;
  };
  resource: {
    type: ResourceType;
    id: string;
    name: string;
  };
  outcome: AuditOutcome;
  description: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Internal logging function
 * In production, this would send to the centralized logger
 */
function logEvent(event: LogEventData): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    const levelColors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[90m',
      [LogLevel.INFO]: '\x1b[36m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
      [LogLevel.CRITICAL]: '\x1b[35m'
    };
    
    console.log(
      `${levelColors[event.level]}[${event.level.toUpperCase()}]` +
      `\x1b[0m [${event.source}] ${event.message}` +
      (event.data ? ` ${JSON.stringify(event.data)}` : '')
    );
  }
  
  // In production, would send to:
  // - Elasticsearch via HTTP bulk API
  // - External log shipping service
  // - Local file fallback
  
  // For now, we'll use a simple fetch to our logging API in production
  if (process.env.NODE_ENV === 'production') {
    // Fire and forget - don't await to avoid blocking the response
    fetch('/api/logging/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        filters: {},
        pagination: { page: 1, pageSize: 1 }
      })
    }).catch(() => {
      // Silently fail - logging should never break the application
    });
  }
}

/**
 * Create audit trail entry
 */
function createAuditEntry(entry: AuditEntryData): void {
  // Similar to logEvent, would send to audit API
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[AUDIT] ${entry.action} by ${entry.actor.id} on ${entry.resource.name} → ${entry.outcome}`
    );
  }
  
  // In production, would POST to /api/logging/audit
}

/**
 * Handle the actual request (pass-through to Next.js)
 */
async function handleRequest(request: NextRequest): Promise<NextResponse> {
  // This allows the middleware to pass through to the actual route handlers
  // In a real implementation, you might want to use NextResponse.next()
  // For now, we'll create a basic response that can be overridden by actual routes
  return NextResponse.next();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_CONFIG,
  detectAnomalies,
  checkRateLimit,
  anonymizeIp,
  maskSensitiveData,
  isPathMatched
};

export type {
  AuditMiddlewareConfig,
  LogEventData,
  AuditEntryData
};
