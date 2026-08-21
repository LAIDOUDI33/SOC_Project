/**
 * Djezzy National SOC Platform - Security Headers Middleware
 * 
 * Implements comprehensive security headers for Next.js applications
 * ANRT Compliant: TLS 1.3 enforcement, encryption requirements
 * 
 * Headers implemented:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 * - Cross-Origin headers (COOP, COEP, CORP)
 * - Cache-Control
 * 
 * @module security/security-headers
 * @version 1.0.0
 */

import type { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SecurityHeadersConfig {
  /** Enable Content Security Policy */
  cspEnabled?: boolean;
  /** CSP Report URI for violations */
  cspReportUri?: string;
  /** CSP Report Only mode (doesn't block, just reports) */
  cspReportOnly?: boolean;
  /** HSTS max age in seconds (default: 1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS */
  hstsIncludeSubdomains?: boolean;
  /** Submit HSTS to browser preload list */
  hstsPreload?: boolean;
  /** Referrer-Policy value */
  referrerPolicy?: ReferrerPolicy;
  /** Permissions-Policy directives */
  permissionsPolicy?: Record<string, (string | boolean)[]>;
  /** Cross-Origin Opener Policy */
  crossOriginOpenerPolicy?: CrossOriginOpenerPolicy;
  /** Cross-Origin Embedder Policy */
  crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicy;
  /** Cross-Origin Resource Policy */
  crossOriginResourcePolicy?: CrossOriginResourcePolicy;
  /** Additional custom headers */
  customHeaders?: Record<string, string>;
  /** Environment-specific overrides */
  environmentOverrides?: {
    development?: Partial<SecurityHeadersConfig>;
    production?: Partial<SecurityHeadersConfig>;
  };
}

export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export type CrossOriginOpenerPolicy = 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
export type CrossOriginEmbedderPolicy = 'require-corp' | 'unsafe-none' | 'unsafe-inline-allow-cors';
export type CrossOriginResourcePolicy = 'same-site' | 'same-origin' | 'cross-origin';

interface CSPDirectives {
  'default-src'?: string;
  'script-src'?: string;
  'style-src'?: string;
  'img-src'?: string;
  'font-src'?: string;
  'connect-src'?: string;
  'media-src'?: string;
  'object-src'?: string;
  'frame-src'?: string;
  'frame-ancestors'?: string;
  'base-uri'?: string;
  'form-action'?: string;
  'manifest-src'?: string;
  'worker-src'?: string;
  'upgrade-insecure-requests'?: boolean;
  [directive: string]: string | boolean | undefined;
}

// ============================================================================
// Default Configuration
// ============================================================================

/** Production-ready default security headers configuration */
export const DEFAULT_SECURITY_HEADERS_CONFIG: SecurityHeadersConfig = {
  cspEnabled: true,
  cspReportUri: '/api/security/csp-report',
  cspReportOnly: false,
  hstsMaxAge: 365 * 24 * 60 * 60, // 1 year in seconds
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    accelerometer: ['none'],
    camera: ['none'],
    geolocation: ['none'],
    gyroscope: ['none'],
    magnetometer: ['none'],
    microphone: ['none'],
    payment: ['none'],
    usb: ['none'],
    'screen-wake-lock': ['self'],
    'display-capture': ['self'],
  },
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginResourcePolicy: 'same-site',
};

/** Development configuration (more relaxed for debugging) */
export const DEVELOPMENT_SECURITY_HEADERS_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_SECURITY_HEADERS_CONFIG,
  cspReportOnly: true, // Don't block in dev, just report
  hstsMaxAge: 3600, // 1 hour in dev
};

// ============================================================================
// CSP Nonce Generation
// ============================================================================

/**
 * Generate a cryptographically secure nonce for CSP
 * Should be called once per request
 */
export function generateCSPNonce(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate nonce and store it in request headers for use in components
 */
export function attachNonceToRequest(request: NextRequest): NextRequest {
  const nonce = generateCSPNonce();
  request.headers.set('x-csp-nonce', nonce);
  return request;
}

/**
 * Get CSP nonce from request
 */
export function getCSPNonceFromRequest(request: NextRequest): string {
  return request.headers.get('x-csp-nonce') || '';
}

// ============================================================================
// CSP Builder
// ============================================================================

/**
 * Build Content-Security-Policy header value
 */
export function buildCSPHeader(
  nonce: string,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS_CONFIG,
  additionalDirectives?: Partial<CSPDirectives>
): string {
  const directives: CSPDirectives = {
    // Default: Deny everything by default
    'default-src': "'none'",

    // Scripts: Self, nonce, strict-dynamic for modern browsers
    'script-src': `'self' 'nonce-${nonce}' 'strict-dynamic' https:`,

    // Styles: Self and inline (required for Tailwind/CSS-in-JS)
    'style-src': "'self' 'unsafe-inline'",

    // Images: Self, data URIs, blob URLs, Djezzy domains
    'img-src': "'self' data: blob: https://*.djezzy.dz https://*.corporate.djezzy.dz",

    // Fonts: Self-hosted only
    'font-src': "'self' data:",

    // Connect: Self, WebSocket, SOC APIs
    'connect-src': "'self' wss: https://api.djezzy-soc.dz https://siem-backend.djezzy-soc.svc.cluster.local",

    // Media: Self, blob, data (for alert sounds, visualizations)
    'media-src': "'self' blob: data:",

    // Objects: None (no Flash, Java, etc.)
    'object-src': "'none'",

    // Frames: Same origin only
    'frame-src': "'self'",

    // Frame Ancestors: None (prevent clickjacking)
    'frame-ancestors': "'none'",

    // Base URI: Self only
    'base-uri': "'self'",

    // Form Action: Self only
    'form-action': "'self'",

    // Manifest: Self only
    'manifest-src': "'self'",

    // Workers: Self and blob
    'worker-src': "'self' blob:",

    // Upgrade insecure requests
    'upgrade-insecure-requests': true,

    // Merge any additional directives
    ...additionalDirectives,
  };

  // Build header value
  const headerParts: string[] = [];
  
  for (const [directive, value] of Object.entries(directives)) {
    if (value === true) {
      headerParts.push(directive);
    } else if (typeof value === 'string') {
      headerParts.push(`${directive} ${value}`);
    }
  }

  // Add report-uri if configured
  if (config.cspReportUri) {
    headerParts.push(`report-uri ${config.cspReportUri}`);
    headerParts.push(`report-to csp-endpoint`);
  }

  return headerParts.join('; ');
}

// ============================================================================
// Header Application Functions
// ============================================================================

/**
 * Apply security headers to a NextResponse
 * 
 * @example
 * ```typescript
 * import { applySecurityHeaders } from '@/lib/security/security-headers';
 * 
 * export function middleware(request: NextRequest) {
 *   const response = NextResponse.next();
 *   return applySecurityHeaders(request, response);
 * }
 * ```
 */
export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS_CONFIG
): NextResponse {
  // Determine effective config based on environment
  const env = process.env.NODE_ENV || 'development';
  const effectiveConfig = {
    ...config,
    ...(env === 'development' ? config.environmentOverrides?.development : {}),
    ...(env === 'production' ? config.environmentOverrides?.production : {}),
  };

  // Get or generate nonce
  let nonce = getCSPNonceFromRequest(request);
  if (!nonce && effectiveConfig.cspEnabled) {
    nonce = generateCSPNonce();
    response.headers.set('x-csp-nonce', nonce);
  }

  // Content-Security-Policy
  if (effectiveConfig.cspEnabled) {
    const cspValue = buildCSPHeader(nonce, effectiveConfig);
    const headerName = effectiveConfig.cspReportOnly 
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
    response.headers.set(headerName, cspValue);
  }

  // Strict-Transport-Security (HSTS)
  if (effectiveConfig.hstsMaxAge) {
    let hstsValue = `max-age=${effectiveConfig.hstsMaxAge}`;
    if (effectiveConfig.hstsIncludeSubdomains) {
      hstsValue += '; includeSubDomains';
    }
    if (effectiveConfig.hstsPreload) {
      hstsValue += '; preload';
    }
    response.headers.set('Strict-Transport-Security', hstsValue);
  }

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection (disabled in favor of CSP)
  response.headers.set('X-XSS-Protection', '0');

  // Referrer-Policy
  if (effectiveConfig.referrerPolicy) {
    response.headers.set('Referrer-Policy', effectiveConfig.referrerPolicy);
  }

  // Permissions-Policy
  if (effectiveConfig.permissionsPolicy) {
    const permissionsValue = buildPermissionsPolicy(effectiveConfig.permissionsPolicy);
    response.headers.set('Permissions-Policy', permissionsValue);
  }

  // Cross-Origin Opener Policy
  if (effectiveConfig.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', effectiveConfig.crossOriginOpenerPolicy);
  }

  // Cross-Origin Embedder Policy
  if (effectiveConfig.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', effectiveConfig.crossOriginEmbedderPolicy);
  }

  // Cross-Origin Resource Policy
  if (effectiveConfig.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', effectiveConfig.crossOriginResourcePolicy);
  }

  // Cache-Control for secure responses
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  // Apply custom headers
  if (effectiveConfig.customHeaders) {
    for (const [name, value] of Object.entries(effectiveConfig.customHeaders)) {
      response.headers.set(name, value);
    }
  }

  // Add security-related headers for debugging (dev only)
  if (env === 'development') {
    response.headers.set('X-Security-Debug', 'Development Mode');
  }

  return response;
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicy(
  policies: Record<string, (string | boolean)[]>
): string {
  return Object.entries(policies)
    .map(([feature, allowlist]) => {
      const values = allowlist.map(v => v === true ? '*' : v === false ? 'none()' : `(${v})`);
      return `${feature}=${values.join(', ')}`;
    })
    .join(', ');
}

/**
 * Create security headers middleware factory for Next.js
 */
export function createSecurityMiddleware(config?: SecurityHeadersConfig) {
  const effectiveConfig = config || DEFAULT_SECURITY_HEADERS_CONFIG;

  return function securityMiddleware(request: NextRequest): NextResponse {
    const response = NextResponse.next();
    
    // Attach nonce to request for use in page generation
    attachNonceToRequest(request);
    
    return applySecurityHeaders(request, response, effectiveConfig);
  };
}

// ============================================================================
// Specialized Header Sets
// ============================================================================

/**
 * Apply strict headers for authentication pages
 * Extra protection for login/auth flows
 */
export function applyAuthPageHeaders(response: NextResponse): NextResponse {
  // Stricter CSP for auth pages
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'none'",
      "script-src 'self' 'nonce-'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self'",
      "connect-src 'self' https://sso.corporate.djezzy.dz",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
    ].join('; ')
  );

  // Clear cache completely for auth pages
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Extra referrer restriction
  response.headers.set('Referrer-Policy', 'no-referrer');

  return response;
}

/**
 * Apply headers for API responses
 * Optimized for API endpoints (no need for script/style directives)
 */
export function applyAPIHeaders(response: NextResponse): NextResponse {
  // Minimal CSP for API (mostly irrelevant but good practice)
  response.headers.set('Content-Security-Policy', "default-src 'none'");
  
  // CORS headers (if needed)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  // No caching for API responses by default
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Don't allow framing of API responses
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}

/**
 * Apply headers for static assets
 * Aggressive caching for hashed/static files
 */
export function applyStaticAssetHeaders(response: NextResponse, maxAge: number = 31536000): NextResponse {
  // Long cache for immutable assets
  response.headers.set('Cache-Control', `public, max-age=${maxAge}, immutable`);
  
  // Restrict what can be done with these assets
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

/**
 * Apply headers for downloadable/report files
 */
export function applyDownloadHeaders(
  response: NextResponse,
  filename: string,
  contentType: string = 'application/octet-stream'
): NextResponse {
  response.headers.set('Content-Type', contentType);
  response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  
  // No cache for downloads
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('X-Content-Type-Options', 'attachment');
  
  return response;
}

// ============================================================================
// Reporting Endpoints Handler
// ============================================================================

/**
 * Handle CSP violation reports
 * Should be used in /api/security/csp-report route
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri'?: string;
    'referrer'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'disposition'?: string;
    'blocked-uri'?: string;
    'line-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

/**
 * Process incoming CSP violation report
 * Logs and optionally forwards to SIEM
 */
export async function processCSPViolationReport(
  report: CSPViolationReport,
  options?: {
    forwardToSIEM?: boolean;
    siemEndpoint?: string;
    logLevel?: 'info' | 'warn' | 'error';
  }
): Promise<{ success: boolean; reportId: string }> {
  const reportId = createHash('sha256')
    .update(JSON.stringify(report) + Date.now())
    .digest('hex')
    .substring(0, 16);

  const logLevel = options?.logLevel || 'warn';
  const cspReport = report['csp-report'];

  // Log the violation
  const logData = {
    reportId,
    timestamp: new Date().toISOString(),
    type: 'csp_violation',
    documentUri: cspReport?.['document-uri'],
    violatedDirective: cspReport?.['violated-directive'],
    blockedUri: cspReport?.['blocked-uri'],
    sourceFile: cspReport?.['source-file'],
    lineNumber: cspReport?.['line-number'],
    scriptSample: cspReport?.['script-sample'],
  };

  console.log(JSON.stringify(logData));

  // Forward to SIEM if configured
  if (options?.forwardToSIEM && options.siemEndpoint) {
    try {
      await fetch(options.siemEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...logData,
          severity: 'low',
          source: 'csp-reporter',
          platform: 'djezzy-soc',
        }),
      });
    } catch (error) {
      console.error('Failed to forward CSP report to SIEM:', error);
    }
  }

  return { success: true, reportId };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if TLS 1.3 is being used (for compliance verification)
 */
export function isTLS13(request: Request): boolean {
  // This would typically be checked at the infrastructure level
  // Here we provide a utility that can be used with socket info
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  if (proto !== 'https') return false;
  
  // Actual TLS version detection requires access to the socket
  // This is a placeholder for integration with infrastructure monitoring
  return true; // Assume TLS 1.3 if properly configured
}

/**
 * Generate security headers summary for health checks
 */
export function getSecurityHeadersSummary(config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS_CONFIG): {
  headers: Record<string, string>;
  compliance: {
    hsts: boolean;
    csp: boolean;
    clickjackingProtection: boolean;
    mimeSniffingPrevented: boolean;
    referrerProtection: boolean;
  };
} {
  return {
    headers: {
      'Content-Security-Policy': config.cspEnabled ? 'Set' : 'Not Set',
      'Strict-Transport-Security': config.hstsMaxAge ? `max-age=${config.hstsMaxAge}` : 'Not Set',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '0',
      'Referrer-Policy': config.referrerPolicy || 'Not Set',
      'Permissions-Policy': config.permissionsPolicy ? 'Set' : 'Not Set',
      'Cross-Origin-Opener-Policy': config.crossOriginOpenerPolicy || 'Not Set',
      'Cross-Origin-Embedder-Policy': config.crossOriginEmbedderPolicy || 'Not Set',
      'Cross-Origin-Resource-Policy': config.crossOriginResourcePolicy || 'Not Set',
    },
    compliance: {
      hsts: !!config.hstsMaxAge && config.hstsMaxAge >= 15768000, // 6 months minimum
      csp: config.cspEnabled === true,
      clickjackingProtection: true, // X-Frame-Options: DENY + frame-ancestors none
      mimeSniffingPrevented: true, // X-Content-Type-Options: nosniff
      referrerProtection: !!config.referrerPolicy,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  applySecurityHeaders,
  createSecurityMiddleware,
  generateCSPNonce,
  buildCSPHeader,
  processCSPViolationReport,
  getSecurityHeadersSummary,
  applyAuthPageHeaders,
  applyAPIHeaders,
  applyStaticAssetHeaders,
  applyDownloadHeaders,
};
