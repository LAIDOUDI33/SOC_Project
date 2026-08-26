/**
 * Security Library - Core Security Utilities
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Comprehensive security utility library implementing:
 * - OWASP security headers generation
 * - TLS configuration validation
 * - CORS policy building
 * - Rate limiting (token bucket algorithm)
 * - Input sanitization (XSS prevention)
 * - SQL injection detection
 * - CSRF token management
 * - Password strength validation
 * - JWT token handling
 * - API key management
 * - IP reputation checking
 * - Security audit logging
 * - Encryption/decryption utilities
 * - Hashing utilities
 * - Certificate management helpers
 * 
 * @module security/lib
 * @version 1.0.0
 */

import {
  SecurityHeadersConfiguration,
  CSPConfiguration,
  HSTSConfiguration,
  PermissionsPolicyDirective,
  CORSPolicy,
  CORSDecision,
  CORSRequestContext,
  RateLimitRule,
  RateLimitState,
  RateLimitViolation,
  JWTPayload,
  JWTTokens,
  APIKey,
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
  ActorInfo,
  SourceInfo,
  TargetResource,
  AuditDetails,
  EncryptionResult,
  DecryptionResult,
  PasswordPolicy,
  PasswordStrengthResult,
  CrackTimeEstimate,
  PasswordFeedback,
  RequirementCheck,
  XSSDetectionResult,
  XSSPattern,
  SQLInjectionResult,
  SQLInjectionPattern,
  IPReputation,
  ThreatLevel,
  ThreatCategory,
  TLSConfiguration,
  SSLCheckResult,
  SSLVulnerability,
  SSLScanResult,
  ComplianceCheck,
  ComplianceFramework,
  ComplianceStatus,
  SecurityPosture,
  PostureItem,
  SecurityIssue,
  Recommendation,
} from '../types/security.types';

// ============================================================================
// Constants & Configuration Defaults
// ============================================================================

/** Default CSP directives for SOC platform */
const DEFAULT_CSP_DIRECTIVES = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  'img-src': "'self' data: blob: https:",
  'font-src': "'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  'connect-src': "'self' wss: https: http://localhost:*",
  'media-src': "'self'",
  'object-src': "'none'",
  'frame-src': "'self'",
  'frame-ancestors': "'self'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'upgrade-insecure-requests': true,
};

/** Default permissions policy for SOC platform */
const DEFAULT_PERMISSIONS_POLICY: PermissionsPolicyDirective = {
  accelerometer: ['none'],
  'ambient-light-sensor': ['none'],
  autoplay: ['self'],
  battery: ['none'],
  camera: ['none'],
  'clipboard-read': ['none'],
  'clipboard-write': ['self'],
  displaycapture: ['none'],
  'document-domain': ['none'],
  'encrypted-media': ['self'],
  fullscreen: ['self'],
  geolocation: ['none'],
  gyroscope: ['none'],
  hid: ['none'],
  magnetometer: ['none'],
  microphone: ['none'],
  midi: ['none'],
  payment: ['none'],
  'picture-in-picture': ['self'],
  'publickey-credentials-get': ['self'],
  'screen-wake-lock': ['none'],
  serial: ['none'],
  'usb': ['none'],
  'web-share': ['self'],
  'xr-spatial-tracking': ['none'],
};

/** Default password policy for SOC platform */
const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minSpecialChars: 1,
  maxConsecutiveSame: 3,
  maxRepeatedChars: 4,
  forbiddenPatterns: [],
  forbiddenWords: ['password', 'soc', 'algeria', 'admin', '123456'],
  historyCheck: 12,
  ageDays: 1,
  maxAgeDays: 90,
  breachCheck: true,
};

/** JWT configuration defaults */
const JWT_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
  issuer: 'national-soc-algeria.dz',
  audience: 'soc-platform',
  algorithm: 'HS256',
};

/** Token bucket rate limit defaults */
const RATE_LIMIT_DEFAULTS = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  burstLimit: 20,
  refillRate: 10, // tokens per second
};

// ============================================================================
// OWASP Security Headers Generator
// ============================================================================

/**
 * Generates OWASP-recommended security headers for HTTP responses
 * 
 * @param config - Optional custom header configuration
 * @returns Object containing all security headers as key-value pairs
 * 
 * @example
 * ```ts
 * const headers = generateSecurityHeaders();
 * // Returns: { 'content-security-policy': "...", 'strict-transport-security': "..." }
 * ```
 */
export function generateSecurityHeaders(
  config?: Partial<SecurityHeadersConfiguration>
): Record<string, string> {
  const cspConfig: CSPConfiguration = config?.contentSecurityPolicy ?? {
    enabled: true,
    reportOnly: false,
    directives: DEFAULT_CSP_DIRECTIVES,
  };

  const hstsConfig: HSTSConfiguration = config?.strictTransportSecurity ?? {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false,
    preloadSubmitted: false,
  };

  const permissionsPolicy = config?.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY;

  const headers: Record<string, string> = {};

  // Content-Security-Policy
  if (cspConfig.enabled) {
    const cspHeader = buildCSPHeader(cspConfig);
    headers[config?.contentSecurityPolicy?.reportOnly ? 
      'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'] = cspHeader;
  }

  // Strict-Transport-Security
  if (hstsConfig.enabled) {
    let hstsValue = `max-age=${hstsConfig.maxAge}`;
    if (hstsConfig.includeSubDomains) hstsValue += '; includeSubDomains';
    if (hstsConfig.preload) hstsValue += '; preload';
    headers['Strict-Transport-Security'] = hstsValue;
  }

  // X-Frame-Options
  headers['X-Frame-Options'] = config?.xFrameOptions || 'DENY';

  // X-Content-Type-Options
  headers['X-Content-Type-Options'] = config?.xContentTypeOptions || 'nosniff';

  // X-XSS-Protection (legacy but still useful)
  headers['X-XSS-Protection'] = config?.xXSSProtection || '0'; // Disable in favor of CSP

  // Referrer-Policy
  headers['Referrer-Policy'] = config?.referrerPolicy || 'strict-origin-when-cross-origin';

  // Permissions-Policy
  const permissionsHeader = buildPermissionsPolicyHeader(permissionsPolicy);
  if (permissionsHeader) {
    headers['Permissions-Policy'] = permissionsHeader;
  }

  // Cross-Origin Policies
  if (config?.crossOriginOpenerPolicy) {
    headers['Cross-Origin-Opener-Policy'] = config.crossOriginOpenerPolicy;
  }
  if (config?.crossOriginEmbedderPolicy) {
    headers['Cross-Origin-Embedder-Policy'] = config.crossOriginEmbedderPolicy;
  }
  if (config?.crossOriginResourcePolicy) {
    headers['Cross-Origin-Resource-Policy'] = config.crossOriginResourcePolicy;
  }

  // Cache control for sensitive pages
  headers['Cache-Control'] = config?.cacheControl || 'no-store, no-cache, must-revalidate, proxy-revalidate';
  headers['Pragma'] = config?.pragma || 'no-cache';
  headers['Expires'] = config?.expires || '0';

  // Custom headers
  if (config?.customHeaders) {
    for (const custom of config.customHeaders) {
      headers[custom.name] = custom.value;
    }
  }

  return headers;
}

/**
 * Builds Content-Security-Policy header value from configuration
 * 
 * @param config - CSP configuration object
 * @returns Formatted CSP header string
 */
function buildCSPHeader(config: CSPConfiguration): string {
  const parts: string[] = [];

  for (const [directive, value] of Object.entries(config.directives)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'boolean') {
      if (value) parts.push(directive);
    } else if (Array.isArray(value)) {
      parts.push(`${directive} ${value.join(' ')}`);
    } else if (value) {
      parts.push(`${directive} ${value}`);
    }
  }

  if (config.reportUri) {
    parts.push(`report-uri ${config.reportUri}`);
  }

  return parts.join('; ');
}

/**
 * Builds Permissions-Policy header value from configuration
 * 
 * @param policy - Permissions policy directives
 * @returns Formatted permissions policy string
 */
function buildPermissionsPolicyHeader(policy: PermissionsPolicyDirective): string {
  const parts: string[] = [];

  for (const [feature, allowlist] of Object.entries(policy)) {
    if (!allowlist || allowlist.length === 0) continue;
    parts.push(`${feature}=(${allowlist.join(', ')})`);
  }

  return parts.join(', ');
}

/**
 * Validates a set of security headers against OWASP recommendations
 * 
 * @param headers - Headers to validate
 * @returns Validation result with missing or misconfigured headers
 */
export function validateSecurityHeaders(
  headers: Record<string, string>
): { valid: boolean; issues: Array<{ header: string; severity: string; message: string }> } {
  const issues: Array<{ header: string; severity: string; message: string }> = [];
  
  const requiredHeaders = [
    { name: 'Content-Security-Policy', severity: 'high' },
    { name: 'Strict-Transport-Security', severity: 'critical' },
    { name: 'X-Content-Type-Options', severity: 'high' },
    { name: 'X-Frame-Options', severity: 'medium' },
    { name: 'Referrer-Policy', severity: 'low' },
    { name: 'Permissions-Policy', severity: 'medium' },
  ];

  for (const required of requiredHeaders) {
    if (!headers[required.name]) {
      issues.push({
        header: required.name,
        severity: required.severity,
        message: `Missing required security header: ${required.name}`,
      });
    }
  }

  // Validate HSTS configuration
  if (headers['Strict-Transport-Security']) {
    const hstsMatch = headers['Strict-Transport-Security'].match(/max-age=(\d+)/);
    if (hstsMatch && parseInt(hstsMatch[1]) < 15768000) {
      issues.push({
        header: 'Strict-Transport-Security',
        severity: 'medium',
        message: 'HSTS max-age should be at least 6 months (15768000 seconds)',
      });
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
  };
}

// ============================================================================
// TLS Configuration Validator
// ============================================================================

/**
 * Validates TLS configuration against modern security best practices
 * 
 * @param config - TLS configuration to validate
 * @returns Validation result with any issues found
 */
export function validateTLSConfiguration(
  config: TLSConfiguration
): { valid: boolean; score: number; results: SSLCheckResult[]; vulnerabilities: SSLVulnerability[] } {
  const results: SSLCheckResult[] = [];
  const vulnerabilities: SSLVulnerability[] = [];

  // Check minimum TLS version
  if (config.minVersion === 'TLSv1.0' || config.minVersion === 'TLSv1.1') {
    results.push({
      category: 'protocol',
      name: 'Minimum TLS Version',
      status: 'fail',
      severity: 'critical',
      description: `Insecure minimum TLS version: ${config.minVersion}`,
      remediation: 'Set minimum TLS version to TLSv1.2 or higher',
    });
    vulnerabilities.push({
      name: 'Deprecated Protocol Support',
      severity: 'critical',
      cvssScore: 7.5,
      description: 'Server accepts connections using deprecated TLS versions',
      affectedVersions: ['TLSv1.0', 'TLSv1.1'],
      fixAvailable: true,
      recommendedAction: 'Disable TLSv1.0 and TLSv1.1 support',
    });
  } else if (config.minVersion === 'TLSv1.2') {
    results.push({
      category: 'protocol',
      name: 'Minimum TLS Version',
      status: 'warning',
      severity: 'medium',
      description: 'TLSv1.2 is acceptable but TLSv1.3 is recommended',
      remediation: 'Consider upgrading to TLSv1.3 only for better security',
    });
  } else {
    results.push({
      category: 'protocol',
      name: 'Minimum TLS Version',
      status: 'pass',
      severity: 'info',
      description: `Modern minimum TLS version: ${config.minVersion}`,
    });
  }

  // Check cipher suites
  const weakCiphers = [
    /DES/, /RC4/, /3DES/, /MD5/, /NULL/, /EXPORT/, /anon/,
    /ECDHE-RSA-AES128-SHA/, /ECDHE-RSA-AES256-SHA/,
  ];

  for (const cipher of config.cipherSuites) {
    for (const pattern of weakCiphers) {
      if (pattern.test(cipher)) {
        results.push({
          category: 'cipher',
          name: 'Weak Cipher Suite',
          status: 'fail',
          severity: 'high',
          description: `Weak cipher suite detected: ${cipher}`,
          remediation: `Remove ${cipher} from allowed ciphers`,
        });
      }
    }
  }

  // Check DH parameter size
  if (config.dhParamSize && config.dhParamSize < 2048) {
    results.push({
      category: 'configuration',
      name: 'DH Parameter Size',
      status: 'fail',
      severity: 'high',
      description: `DH parameters too small: ${config.dhParamSize} bits`,
      remediation: 'Use DH parameters of at least 2048 bits (recommended: 4096)',
    });
  } else if (config.dhParamSize >= 2048) {
    results.push({
      category: 'configuration',
      name: 'DH Parameter Size',
      status: 'pass',
      severity: 'info',
      description: `Adequate DH parameter size: ${config.dhParamSize} bits`,
    });
  }

  // Check session tickets
  if (config.sessionTicketsEnabled) {
    results.push({
      category: 'configuration',
      name: 'Session Tickets',
      status: 'warning',
      severity: 'low',
      description: 'Session tickets enabled may impact forward secrecy',
      remediation: 'Consider disabling session tickets for perfect forward secrecy',
    });
  }

  // Check OCSP stapling
  if (config.ocspStapling) {
    results.push({
      category: 'certificate',
      name: 'OCSP Stapling',
      status: 'pass',
      severity: 'info',
      description: 'OCSP stapling is enabled',
    });
  } else {
    results.push({
      category: 'certificate',
      name: 'OCSP Stapling',
      status: 'fail',
      severity: 'medium',
      description: 'OCSP stapling is not enabled',
      remediation: 'Enable OCSP stapling for faster certificate validation',
    });
  }

  // Check HSTS
  if (config.hstsEnabled) {
    if (config.hstsMaxAge >= 15768000) {
      results.push({
        category: 'configuration',
        name: 'HSTS Configuration',
        status: 'pass',
        severity: 'info',
        description: 'HSTS properly configured with adequate max-age',
      });
    } else {
      results.push({
        category: 'configuration',
        name: 'HSTS Configuration',
        status: 'warning',
        severity: 'medium',
        description: 'HSTS max-age should be at least 6 months',
        remediation: 'Increase HSTS max-age to 15768000 (6 months)',
      });
    }
  } else {
    results.push({
      category: 'configuration',
      name: 'HSTS Configuration',
      status: 'fail',
      severity: 'high',
      description: 'HSTS is not enabled',
      remediation: 'Enable HSTS to prevent protocol downgrade attacks',
    });
  }

  // Calculate overall score
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const totalCritical = results.filter(r => r.severity === 'critical').length;
  const score = Math.max(0, Math.min(100, ((passCount / results.length) * 100) - (totalCritical * 20) - (failCount * 10)));

  return {
    valid: failCount === 0 && totalCritical === 0,
    score: Math.round(score),
    results,
    vulnerabilities,
  };
}

/**
 * Generates recommended TLS configuration for production SOC platform
 * 
 * @param options - Configuration options
 * @returns Recommended TLS configuration
 */
export function getRecommendedTLSConfig(
  options?: { enableClientAuth?: boolean; hstsPreload?: boolean }
): TLSConfiguration {
  return {
    enabled: true,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    cipherSuites: [
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'DHE-RSA-AES256-GCM-SHA384',
      'DHE-RSA-AES128-GCM-SHA256',
    ],
    preferredCipherSuites: [
      'ECDHE+AESGCM',
      'DHE+AESGCM',
      'ECDHE+CHACHA20',
    ],
    sessionTimeout: 300,
    sessionTicketsEnabled: false,
    sessionTicketKeyRotationHours: 24,
    ocspStapling: true,
    ocspStaplingVerify: true,
    certificateTransparency: true,
    staplingResponderTimeout: 5000,
    staplingResponderTTL: 86400,
    dhParamSize: 4096,
    ecdhCurve: 'secp384r1',
    serverNameIndication: true,
    clientAuthentication: options?.enableClientAuth ?? false,
    clientCACertificates: [],
    hstsEnabled: true,
    hstsMaxAge: 365 * 24 * 60 * 60, // 1 year
    hstsIncludeSubdomains: true,
    hstsPreload: options?.hstsPreload ?? false,
    updatedAt: new Date(),
  };
}

// ============================================================================
// CORS Policy Builder
// ============================================================================

/**
 * Creates a new CORS policy configuration
 * 
 * @param options - CORS policy options
 * @returns Configured CORS policy
 */
export function createCORSPolicy(
  options?: Partial<CORSPolicy>
): CORSPolicy {
  return {
    id: options?.id || generateId('cors'),
    name: options?.name || 'Default CORS Policy',
    description: options?.description,
    enabled: options?.enabled !== undefined ? options.enabled : true,
    origins: options?.origins || [/^https:\/\/.*\.soc\.algeria\.dz$/],
    allowMethods: options?.allowMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: options?.allowHeaders || [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Accept',
      'Origin',
    ],
    exposeHeaders: options?.exposeHeaders || ['X-Request-Id', 'X-RateLimit-Remaining'],
    credentials: options?.credentials !== undefined ? options.credentials : false,
    maxAge: options?.maxAge || 86400, // 24 hours
    preflightContinue: options?.preflightContinue || false,
    optionsSuccessStatus: options?.optionsSuccessStatus || 204,
    preflightCache: {
      enabled: true,
      maxAge: 86400,
      varyByOrigin: true,
      cacheSize: 1000,
    },
    ...options,
  };
}

/**
 * Evaluates a request against CORS policy and returns decision
 * 
 * @param policy - CORS policy to evaluate
 * @param context - Request context information
 * @returns CORS decision with headers and status
 */
export function evaluateCORSPolicy(
  policy: CORSPolicy,
  context: CORSRequestContext
): CORSDecision {
  if (!policy.enabled) {
    return {
      allowed: true,
      statusCode: 200,
      headers: {},
      reason: 'CORS policy disabled, allowing all origins',
    };
  }

  // Check origin matching
  const originAllowed = isOriginAllowed(policy.origins, context.origin);

  if (!originAllowed) {
    return {
      allowed: false,
      statusCode: 403,
      headers: {},
      reason: `Origin ${context.origin} not allowed by CORS policy`,
    };
  }

  // Build response headers
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': context.origin,
    'Access-Control-Allow-Methods': policy.allowMethods.join(', '),
    'Access-Control-Allow-Headers': policy.allowHeaders.join(', '),
  };

  if (policy.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  if (policy.exposeHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = policy.exposeHeaders.join(', ');
  }

  // Handle preflight requests
  if (context.isPreflight) {
    headers['Access-Control-Max-Age'] = String(policy.maxAge);
    
    return {
      allowed: true,
      statusCode: policy.optionsSuccessStatus,
      headers,
      reason: 'Preflight request approved',
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    headers,
    reason: 'Request approved by CORS policy',
  };
}

/**
 * Checks if an origin matches any pattern in the allowed list
 * 
 * @param patterns - List of origin patterns (strings or regex)
 * @param origin - Origin to check
 * @returns Whether origin is allowed
 */
function isOriginAllowed(
  patterns: Array<string | RegExp>,
  origin: string
): boolean {
  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      if (pattern.test(origin)) return true;
    } else if (pattern === '*' || pattern === origin) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Rate Limiter Implementation (Token Bucket Algorithm)
// ============================================================================

/** In-memory store for rate limit states */
const rateLimitStore = new Map<string, {
  tokens: number;
  lastRefill: Date;
  lastRequestTime: Date;
}>();

/**
 * Creates a new rate limit rule configuration
 * 
 * @param options - Rule options
 * @returns Configured rate limit rule
 */
export function createRateLimitRule(
  options?: Partial<RateLimitRule>
): RateLimitRule {
  return {
    id: options?.id || generateId('rl'),
    name: options?.name || 'Default Rate Limit',
    enabled: options?.enabled !== undefined ? options.enabled : true,
    algorithm: options?.algorithm || 'token-bucket',
    windowMs: options?.windowMs || RATE_LIMIT_DEFAULTS.windowMs,
    maxRequests: options?.maxRequests || RATE_LIMIT_DEFAULTS.maxRequests,
    burstLimit: options?.burstLimit || RATE_LIMIT_DEFAULTS.burstLimit,
    refillRate: options?.refillRate || RATE_LIMIT_DEFAULTS.refillRate,
    keyGenerator: options?.keyGenerator || '{{ip}}:{{path}}',
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    skipFailedRequests: options?.skipFailedRequests || false,
    whitelist: options?.whitelist || [],
    blacklist: options?.blacklist || [],
    responseHeaders: options?.responseHeaders || {
      enabled: true,
      remainingHeader: 'X-RateLimit-Remaining',
      resetHeader: 'X-RateLimit-Reset',
      totalHeader: 'X-RateLimit-Limit',
      retryAfterHeader: 'Retry-After',
    },
    errorMessage: options?.errorMessage || 'Too many requests, please try again later.',
    statusCode: options?.statusCode || 429,
    metadata: options?.metadata || {},
  };
}

/**
 * Checks if a request should be rate limited using token bucket algorithm
 * 
 * @param rule - Rate limit rule to apply
 * @param key - Unique identifier for the client
 * @param ip - Client IP address
 * @param path - Request path
 * @returns Rate limit state and violation info if limited
 */
export function checkRateLimit(
  rule: RateLimitRule,
  key: string,
  ip: string,
  path: string
): { state: RateLimitState; violation?: RateLimitViolation } {
  if (!rule.enabled) {
    return {
      state: {
        key,
        remaining: rule.maxRequests,
        total: rule.maxRequests,
        resetTime: new Date(Date.now() + rule.windowMs),
        limited: false,
      },
    };
  }

  // Check blacklist
  if (rule.blacklist && isIPInList(ip, rule.blacklist)) {
    return {
      state: {
        key,
        remaining: 0,
        total: rule.maxRequests,
        resetTime: new Date(Date.now() + rule.windowMs),
        limited: true,
        retryAfter: Math.ceil(rule.windowMs / 1000),
      },
      violation: createViolation(rule, key, ip, path, rule.maxRequests, 'reject'),
    };
  }

  // Check whitelist
  if (rule.whitelist && isIPInList(ip, rule.whitelist)) {
    return {
      state: {
        key,
        remaining: rule.maxRequests,
        total: rule.maxRequests,
        resetTime: new Date(Date.now() + rule.windowMs),
        limited: false,
      },
    };
  }

  // Get or create bucket state
  const now = new Date();
  let bucket = rateLimitStore.get(key);

  if (!bucket) {
    bucket = {
      tokens: rule.burstLimit || rule.maxRequests,
      lastRefill: now,
      lastRequestTime: now,
    };
    rateLimitStore.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsedMs = now.getTime() - bucket.lastRefill.getTime();
  const tokensToAdd = Math.floor((elapsedMs / 1000) * (rule.refillRate || 10));
  
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(rule.burstLimit || rule.maxRequests, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  // Check if request can be processed
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    bucket.lastRequestTime = now;

    const state: RateLimitState = {
      key,
      remaining: bucket.tokens,
      total: rule.burstLimit || rule.maxRequests,
      resetTime: new Date(now.getTime() + rule.windowMs),
      limited: false,
    };

    return { state };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil(1000 / (rule.refillRate || 10)); // Time until next token
  
  return {
    state: {
      key,
      remaining: 0,
      total: rule.burstLimit || rule.maxRequests,
      resetTime: new Date(now.getTime() + retryAfter * 1000),
      limited: true,
      retryAfter,
    },
    violation: createViolation(rule, key, ip, path, rule.maxRequests, 'reject'),
  };
}

/**
 * Creates a rate limit violation record
 */
function createViolation(
  rule: RateLimitRule,
  key: string,
  ip: string,
  path: string,
  currentCount: number,
  actionTaken: RateLimitViolation['actionTaken']
): RateLimitViolation {
  return {
    ruleId: rule.id,
    key,
    ip,
    path,
    method: 'GET', // Would be passed in real implementation
    timestamp: new Date(),
    currentCount,
    limit: rule.maxRequests,
    actionTaken,
  };
}

/**
 * Checks if an IP address matches any pattern in a list
 * Supports CIDR notation and wildcards
 */
function isIPInList(ip: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern.includes('/')) {
      // CIDR notation check
      if (isIPInCIDR(ip, pattern)) return true;
    } else if (pattern.includes('*')) {
      // Wildcard pattern
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(ip)) return true;
    } else if (pattern === ip) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an IP is within a CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr);
  
  // Simple implementation for IPv4
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1);
  
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Converts IPv4 address to number
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * Clears expired entries from rate limit store
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now - bucket.lastRefill.getTime() > 3600000) { // 1 hour
      rateLimitStore.delete(key);
    }
  }
}

// ============================================================================
// Input Sanitizer (XSS Prevention)
// ============================================================================

/** XSS attack patterns to detect */
const XSS_PATTERNS: Array<{ type: XSSPattern['type']; pattern: RegExp }> = [
  { type: 'script_tag', pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi },
  { type: 'script_tag', pattern: /<script[^>]*>/gi },
  { type: 'event_handler', pattern: /\bon\w+\s*=\s*["'][^"']*["']/gi },
  { type: 'event_handler', pattern: /\bon\w+\s*=\s*\S+/gi },
  { type: 'javascript_uri', pattern: /javascript:/gi },
  { type: 'expression', pattern: /expression\s*\(/gi },
  { type: 'dom_based', pattern: /document\.(cookie|write|domain|URL)/gi },
  { type: 'other', pattern: /vbscript:/gi },
  { type: 'other', pattern: /data:\s*text\/html/gi },
];

/** HTML entity mapping for encoding */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;',
};

/**
 * Sanitizes input to prevent XSS attacks
 * 
 * @param input - Raw user input
 * @param options - Sanitization options
 * @returns Sanitized output and detection result
 */
export function sanitizeInput(
  input: string,
  options?: { encodeHTML?: boolean; removeScripts?: boolean; maxLength?: number }
): XSSDetectionResult {
  if (!input || typeof input !== 'string') {
    return {
      clean: true,
      detectedPatterns: [],
      sanitizedInput: input || '',
      riskLevel: 'none',
    };
  }

  let sanitized = input;
  const detectedPatterns: XSSPattern[] = [];

  // Detect XSS patterns
  for (const { type, pattern } of XSS_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(input)) !== null) {
      detectedPatterns.push({
        type,
        pattern: match[0],
        position: match.index,
        context: getContext(input, match.index, 50),
      });
    }
  }

  // Remove script tags if requested
  if (options?.removeScripts !== false) {
    sanitized = sanitized.replace(/<script[\s\S]*?>/gi, '');
    sanitized = sanitized.replace(/<\/script>/gi, '');
    sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/expression\s*\(/gi, '');
  }

  // Encode HTML entities if requested
  if (options?.encodeHTML !== false) {
    sanitized = sanitized.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
  }

  // Truncate if needed
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Determine risk level
  const criticalPatterns = detectedPatterns.filter(p => p.type === 'script_tag');
  const highRiskPatterns = detectedPatterns.filter(p => p.type === 'event_handler' || p.type === 'javascript_uri');

  let riskLevel: XSSDetectionResult['riskLevel'] = 'none';
  if (criticalPatterns.length > 0) {
    riskLevel = 'critical';
  } else if (highRiskPatterns.length > 0) {
    riskLevel = 'high';
  } else if (detectedPatterns.length > 2) {
    riskLevel = 'medium';
  } else if (detectedPatterns.length > 0) {
    riskLevel = 'low';
  }

  return {
    clean: detectedPatterns.length === 0,
    detectedPatterns,
    sanitizedInput: sanitized,
    riskLevel,
  };
}

/**
 * Gets surrounding context around a position in text
 */
function getContext(text: string, position: number, length: number): string {
  const start = Math.max(0, position - length / 2);
  const end = Math.min(text.length, position + length / 2);
  return `...${text.substring(start, end)}...`;
}

/**
 * Encodes a string for safe use in HTML contexts
 * 
 * @param str - String to encode
 * @returns HTML-encoded string
 */
export function encodeHTMLEntities(str: string): string {
  return str.replace(/[&<>"'`]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decodes HTML entities back to original characters
 * 
 * @param str - String with HTML entities
 * @returns Decoded string
 */
export function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#96;/g, '`')
    .replace(/&#x3D;/g, '=');
}

// ============================================================================
// SQL Injection Detector
// ============================================================================

/** SQL injection attack patterns */
const SQL_INJECTION_PATTERNS: Array<{ type: SQLInjectionPattern['type']; pattern: RegExp; risk: 'high' | 'medium' | 'low' }> = [
  { type: 'union_based', pattern: /(\bunion\b\s+(all\s+)?\bselect\b)/gi, risk: 'high' },
  { type: 'union_based', pattern: /(\bselect\b.+\bfrom\b)/gi, risk: 'medium' },
  { type: 'boolean_based', pattern: /(\bor\b\s+\d+\s*=\s*\d+)/gi, risk: 'high' },
  { type: 'boolean_based', pattern: /(\band\b\s+\d+\s*=\s*\d+)/gi, risk: 'medium' },
  { type: 'time_based', pattern: /(\bsleep\s*\(|\bbenchmark\s*\()/gi, risk: 'high' },
  { type: 'error_based', pattern: /(\bextractvalue\b|\bupdatexml\b)/gi, risk: 'high' },
  { type: 'error_based', pattern: /(\bconcat\s*\([^)]*\)\s*,?\s*(\d+))/gi, risk: 'medium' },
  { type: 'stacked_queries', pattern: /;\s*(\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b)/gi, risk: 'high' },
  { type: 'stacked_queries', pattern: /;\s*(--|#|\/\*)/gi, risk: 'high' },
  { type: 'other', pattern: /('\s*(or|and)\s*')/gi, risk: 'medium' },
  { type: 'other', pattern: /(\/\*.*\*\/)/gi, risk: 'low' },
  { type: 'other', pattern: /(--\s*$)/gm, risk: 'low' },
  { type: 'other', pattern: /('\s*;\s*--)/gi, risk: 'high' },
];

/**
 * Detects potential SQL injection attempts in input
 * 
 * @param input - User input to analyze
 * @returns Detection result with found patterns and suggestions
 */
export function detectSQLInjection(input: string): SQLInjectionResult {
  if (!input || typeof input !== 'string') {
    return {
      safe: true,
      detectedPatterns: [],
      riskLevel: 'none',
      suggestions: [],
    };
  }

  const detectedPatterns: SQLInjectionPattern[] = [];
  const suggestions: Set<string> = new Set();

  for (const { type, pattern, risk } of SQL_INJECTION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(input)) !== null) {
      detectedPatterns.push({
        type,
        pattern: match[0],
        position: match.index,
        context: getContext(input, match.index, 50),
      });

      // Add specific suggestion based on pattern type
      switch (type) {
        case 'union_based':
          suggestions.add('Use parameterized queries or prepared statements');
          break;
        case 'time_based':
          suggestions.add('Implement query timeout limits');
          suggestions.add('Use parameterized queries');
          break;
        case 'error_based':
          suggestions.add('Disable detailed error messages in production');
          break;
        case 'stacked_queries':
          suggestions.add('Use ORM that prevents multiple statement execution');
          break;
        default:
          suggestions.add('Validate and sanitize all user inputs');
      }
    }
  }

  // Determine overall risk level
  const highRiskCount = detectedPatterns.filter(p => p.risk === 'high').length;
  let riskLevel: SQLInjectionResult['riskLevel'] = 'none';
  
  if (highRiskCount >= 2) {
    riskLevel = 'critical';
  } else if (highRiskCount > 0) {
    riskLevel = 'high';
  } else if (detectedPatterns.length > 3) {
    riskLevel = 'medium';
  } else if (detectedPatterns.length > 0) {
    riskLevel = 'low';
  }

  return {
    safe: detectedPatterns.length === 0,
    detectedPatterns,
    riskLevel,
    suggestions: Array.from(suggestions),
  };
}

/**
 * Escapes special characters for safe SQL usage
 * Note: This is a fallback - always prefer parameterized queries!
 * 
 * @param str - String to escape
 * @returns Escaped string
 */
export function escapeSQLString(str: string): string {
  return str
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

// ============================================================================
// CSRF Token Manager
// ============================================================================

/** In-memory CSRF token storage */
const csrfTokens = new Map<string, { token: string; expiresAt: Date; used: boolean }>();

/** Default CSRF token expiry time (2 hours) */
const CSRF_TOKEN_EXPIRY_MS = 2 * 60 * 60 * 1000;

/**
 * Generates a new CSRF token
 * 
 * @param sessionId - Session ID to bind token to
 * @param expiresInMs - Optional custom expiry time
 * @returns Generated CSRF token
 */
export function generateCSRFToken(sessionId: string, expiresInMs?: string | number): string {
  const token = generateRandomToken(32);
  const expiry = new Date(Date.now() + (parseInt(String(expiresInMs)) || CSRF_TOKEN_EXPIRY_MS));
  
  csrfTokens.set(token, {
    token,
    expiresAt: expiry,
    used: false,
  });

  return token;
}

/**
 * Validates a CSRF token
 * 
 * @param token - Token to validate
 * @param sessionId - Session ID it should be bound to
 * @returns Whether token is valid
 */
export function validateCSRFToken(token: string, _sessionId?: string): boolean {
  const stored = csrfTokens.get(token);
  
  if (!stored) {
    return false;
  }

  if (stored.used || stored.expiresAt < new Date()) {
    csrfTokens.delete(token);
    return false;
  }

  // Mark as used (one-time use token)
  stored.used = true;
  
  return true;
}

/**
 * Invalidates a CSRF token immediately
 * 
 * @param token - Token to invalidate
 */
export function invalidateCSRFToken(token: string): void {
  csrfTokens.delete(token);
}

/**
 * Cleans up expired CSRF tokens from memory
 */
export function cleanupCSRFTokenStore(): void {
  const now = new Date();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expiresAt < now) {
      csrfTokens.delete(token);
    }
  }
}

/**
 * Generates CSRF token hidden field HTML for forms
 * 
 * @param token - CSRF token value
 * @returns HTML hidden input element
 */
export function getCSRFTokenField(token: string): string {
  return `<input type="hidden" name="_csrf" value="${encodeHTMLEntities(token)}" />`;
}

// ============================================================================
// Password Strength Validator
// ============================================================================

/**
 * Analyzes password strength against configurable policy
 * 
 * @param password - Password to analyze
 * @param policy - Password policy to enforce (uses default if not provided)
 * @returns Detailed strength analysis result
 */
export function analyzePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordStrengthResult {
  const requirementsMet: RequirementCheck[] = [];
  const feedback: PasswordFeedback[] = [];

  // Length checks
  requirementsMet.push({
    requirement: 'minimum_length',
    met: password.length >= policy.minLength,
    description: `Minimum ${policy.minLength} characters`,
  });

  requirementsMet.push({
    requirement: 'maximum_length',
    met: password.length <= policy.maxLength,
    description: `Maximum ${policy.maxLength} characters`,
  });

  // Character class checks
  if (policy.requireUppercase) {
    const hasUppercase = /[A-Z]/.test(password);
    requirementsMet.push({
      requirement: 'uppercase',
      met: hasUppercase,
      description: 'Contains uppercase letter',
    });
    if (!hasUppercase) {
      feedback.push({ type: 'warning', message: 'Add uppercase letters' });
    }
  }

  if (policy.requireLowercase) {
    const hasLowercase = /[a-z]/.test(password);
    requirementsMet.push({
      requirement: 'lowercase',
      met: hasLowercase,
      description: 'Contains lowercase letter',
    });
    if (!hasLowercase) {
      feedback.push({ type: 'warning', message: 'Add lowercase letters' });
    }
  }

  if (policy.requireNumbers) {
    const hasNumbers = /[0-9]/.test(password);
    requirementsMet.push({
      requirement: 'numbers',
      met: hasNumbers,
      description: 'Contains numbers',
    });
    if (!hasNumbers) {
      feedback.push({ type: 'warning', message: 'Add numbers' });
    }
  }

  if (policy.requireSpecialChars) {
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const specialCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    requirementsMet.push({
      requirement: 'special_chars',
      met: hasSpecial && specialCount >= policy.minSpecialChars,
      description: `Contains ${policy.minSpecialChars} or more special characters`,
    });
    if (!hasSpecial) {
      feedback.push({ type: 'warning', message: 'Add special characters' });
    }
  }

  // Consecutive character check
  const consecutiveRegex = /(.)\1{2,}/g;
  const consecutiveMatches = password.match(consecutiveRegex) || [];
  requirementsMet.push({
    requirement: 'no_consecutive',
    met: consecutiveMatches.every(m => m.length <= policy.maxConsecutiveSame),
    description: `No more than ${policy.maxConsecutiveSame} consecutive identical characters`,
  });

  // Repeated character check
  requirementsMet.push({
    requirement: 'no_repeated',
    met: !hasRepeatedChars(password, policy.maxRepeatedChars),
    description: `No more than ${policy.maxRepeatedChars} repeated characters`,
  });

  // Forbidden words/patterns check
  const lowerPassword = password.toLowerCase();
  const hasForbiddenWord = policy.forbiddenWords.some(word =>
    lowerPassword.includes(word.toLowerCase())
  );
  requirementsMet.push({
    requirement: 'no_forbidden_words',
    met: !hasForbiddenWord,
    description: 'Does not contain common words',
  });
  if (hasForbiddenWord) {
    feedback.push({ type: 'warning', message: 'Avoid common words or patterns' });
  }

  // Calculate entropy-based score
  const charsetSize = calculateCharsetSize(password);
  const entropy = password.length * Math.log2(charsetSize);
  const baseScore = Math.min(100, (entropy / 4) * 10); // Scale to 0-100

  // Adjust score based on requirements
  const failedRequirements = requirementsMet.filter(r => !r.met).length;
  const adjustedScore = Math.max(0, baseScore - (failedRequirements * 10));

  // Determine strength level
  let strength: PasswordStrengthResult['strength'];
  if (adjustedScore < 20) strength = 'very_weak';
  else if (adjustedScore < 40) strength = 'weak';
  else if (adjustedScore < 60) strength = 'fair';
  else if (adjustedScore < 80) strength = 'strong';
  else strength = 'very strong';

  // Estimate crack time
  const crackTime = estimateCrackTime(entropy);

  // Add suggestions based on analysis
  if (password.length < 14) {
    feedback.push({ type: 'suggestion', message: 'Use longer passwords (14+ characters)' });
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    feedback.push({ type: 'suggestion', message: 'Mix uppercase and lowercase' });
  }
  if (!/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
    feedback.push({ type: 'suggestion', message: 'Include numbers and symbols' });
  }

  return {
    score: Math.round(adjustedScore),
    strength,
    crackTimeEstimate: crackTime,
    feedback,
    meetsRequirements: requirementsMet.every(r => r.met),
    requirementsMet,
  };
}

/**
 * Calculates the effective character set size for entropy calculation
 */
function calculateCharsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) size += 32;
  if (/[\x00-\x1f\x7f-\xff]/.test(password)) size += 32;
  return Math.max(size, 1); // At least 1 to avoid log(0)
}

/**
 * Checks if password has too many repeated characters
 */
function hasRepeatedChars(password: string, maxAllowed: number): boolean {
  const charCounts: Record<string, number> = {};
  for (const char of password) {
    charCounts[char] = (charCounts[char] || 0) + 1;
    if (charCounts[char] > maxAllowed) return true;
  }
  return false;
}

/**
 * Estimates time to crack password based on entropy
 */
function estimateCrackTime(entropyBits: number): CrackTimeEstimate {
  // Assumptions about cracking speeds (very rough estimates)
  const guessesPerSecond = {
    onlineThrottled: 1000, // 1K guesses/sec with rate limiting
    onlineUnthrottled: 1e9, // 1B guesses/sec without limiting
    offlineSlowHash: 1e4, // 10K guesses/sec (bcrypt/scrypt)
    offlineFastHash: 1e10, // 10B guesses/sec (MD5/SHA)
  };

  const combinations = Math.pow(2, entropyBits);

  const formatTime = (seconds: number): string => {
    if (seconds < 1) return 'instant';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
    return 'centuries';
  };

  return {
    onlineThrottled: formatTime(combinations / guessesPerSecond.onlineThrottled),
    onlineUnthrottled: formatTime(combinations / guessesPerSecond.onlineUnthrottled),
    offlineSlowHash: formatTime(combinations / guessesPerSecond.offlineSlowHash),
    offlineFastHash: formatTime(combinations / guessesPerSecond.offlineFastHash),
    entropy: Math.round(entropyBits * 100) / 100,
  };
}

// ============================================================================
// JWT Token Handler
// ============================================================================

/**
 * Encodes a payload into a URL-safe Base64 string
 */
function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 string
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString();
}

/**
 * Creates HMAC-SHA256 signature
 */
async function hmacSha256(data: string, secret: string): Promise<string> {
  const crypto = await import('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('base64url');
}

/**
 * Signs a JWT access token
 * 
 * @param payload - Token payload data
 * @param secret - Signing secret
 * @param expiresIn - Expiry time in seconds (optional)
 * @returns Signed JWT token string
 */
export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = JWT_CONFIG.accessTokenExpiry
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = base64UrlEncode(JSON.stringify({
    alg: JWT_CONFIG.algorithm,
    typ: 'JWT',
  }));

  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = await hmacSha256(`${header}.${encodedPayload}`, secret);

  return `${header}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a JWT token
 * 
 * @param token - JWT token to verify
 * @param secret - Verification secret
 * @returns Decoded payload or null if invalid
 */
export async function verifyJWT<T = JWTPayload>(
  token: string,
  secret: string
): Promise<T | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = await hmacSha256(`${header}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as T;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if ((payload as unknown as JWTPayload).exp && (payload as unknown as JWTPayload).exp < now) {
      return null; // Token expired
    }

    // Check not-before if present
    if ((payload as unknown as JWTPayload).nbf && (payload as unknown as JWTPayload).nbf > now) {
      return null; // Token not yet valid
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates both access and refresh tokens
 * 
 * @param payload - Common payload data
 * @param accessTokenSecret - Secret for access token
 * @param refreshTokenSecret - Secret for refresh token
 * @returns Token pair object
 */
export async function generateTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  accessTokenSecret: string,
  refreshTokenSecret: string
): Promise<JWTTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    signJWT(payload, accessTokenSecret, JWT_CONFIG.accessTokenExpiry),
    signJWT(payload, refreshTokenSecret, JWT_CONFIG.refreshTokenExpiry),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    tokenType: 'Bearer',
  };
}

/**
 * Refreshes an access token using a valid refresh token
 * 
 * @param refreshToken - Valid refresh token
 * @param accessTokenSecret - Secret for new access token
 * @param refreshTokenSecret - Secret to verify refresh token
 * @returns New token pair or null if refresh failed
 */
export async function refreshAccessToken(
  refreshToken: string,
  accessTokenSecret: string,
  refreshTokenSecret: string
): Promise<JWTTokens | null> {
  const payload = await verifyJWT<JWTPayload>(refreshToken, refreshTokenSecret);
  
  if (!payload) return null;

  return generateTokenPair(payload, accessTokenSecret, refreshTokenSecret);
}

// ============================================================================
// API Key Generator and Validator
// ============================================================================

/**
 * Generates a new API key with prefix for identification
 * 
 * @param prefix - Key prefix (e.g., 'soc_', 'api_')
 * @param length - Random portion length (default: 32)
 * @returns Generated API key
 */
export function generateAPIKey(prefix: string = 'sk_soc_', length: number = 32): string {
  const randomPart = generateRandomToken(length);
  return `${prefix}${randomPart}`;
}

/**
 * Hashes an API key for secure storage
 * Uses SHA-256 for deterministic hashing (suitable for lookup)
 * 
 * @param apiKey - Plain API key
 * @returns Hashed key for storage
 */
export async function hashAPIKey(apiKey: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validates an API key against its hash
 * 
 * @param apiKey - Plain API key to validate
 * @param hashedKey - Stored hash to compare against
 * @returns Whether the key matches
 */
export async function validateAPIKey(apiKey: string, hashedKey: string): Promise<boolean> {
  const computedHash = await hashAPIKey(apiKey);
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(computedHash, hashedKey);
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const crypto = await import('crypto');
  
  if (a.length !== b.length) return false;
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Extracts the displayable prefix from an API key
 * 
 * @param apiKey - Full API key
 * @param visibleChars - Number of characters to show after prefix
 * @returns Masked API key for display
 */
export function maskAPIKey(apiKey: string, visibleChars: number = 8): string {
  if (apiKey.length <= visibleChars + 4) return '****';
  return `${apiKey.substring(0, visibleChars)}${'*'.repeat(Math.min(8, apiKey.length - visibleChars))}`;
}

// ============================================================================
// IP Reputation Checker Interface
// ============================================================================

/** Mock IP reputation database for demonstration */
const MOCK_IP_REPUTATIONS: Record<string, Partial<IPReputation>> = {
  '192.168.1.1': { threatLevel: 'benign', score: 0, country: 'DZ' },
  '10.0.0.1': { threatLevel: 'benign', score: 0, country: 'DZ' },
  '45.33.32.156': { threatLevel: 'malicious', score: 95, category: ['scanner'], country: 'US' },
  '185.220.101.0': { threatLevel: 'malicious', score: 88, category: ['tor_exit_node'], country: 'DE' },
  '91.121.87.102': { threatLevel: 'suspicious', score: 55, category: ['spam'], country: 'FR' },
};

/**
 * Checks the reputation of an IP address
 * In production, this would integrate with services like:
 * - AbuseIPDB
 * - VirusTotal
 * - AlienVault OTX
 * - MaxMind
 * 
 * @param ipAddress - IP address to check
 * @returns IP reputation data
 */
export async function checkIPReputation(ipAddress: string): Promise<IPReputation> {
  // Simulate API call delay
  await delay(50);

  // Return mock data or default benign response
  const cached = MOCK_IP_REPUTATIONS[ipAddress];
  
  if (cached) {
    return {
      ip: ipAddress,
      score: cached.score || 0,
      confidence: cached.confidence || 85,
      threatLevel: cached.threatLevel || 'benign',
      category: cached.category as ThreatCategory[] || [],
      firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastSeen: new Date(),
      sources: [{
        name: 'Internal Database',
        score: cached.score || 0,
        lastReported: new Date(),
        reports: 1,
      }],
      isTorExitNode: cached.category?.includes('tor_exit_node') || false,
      isVPN: false,
      isProxy: false,
      isHosting: false,
      country: cached.country || 'Unknown',
      asn: 0,
      asName: 'Unknown',
      isp: 'Unknown',
      organization: 'Unknown',
      lastUpdated: new Date(),
    };
  }

  // Default response for unknown IPs
  return {
    ip: ipAddress,
    score: 5,
    confidence: 30,
    threatLevel: 'benign',
    category: [],
    firstSeen: new Date(),
    lastSeen: new Date(),
    sources: [],
    isTorExitNode: false,
    isVPN: false,
    isProxy: false,
    isHosting: false,
    country: 'Unknown',
    asn: 0,
    asName: 'Unknown',
    isp: 'Unknown',
    organization: 'Unknown',
    lastUpdated: new Date(),
  };
}

/**
 * Determines if an IP should be blocked based on reputation
 * 
 * @param reputation - IP reputation data
 * @param threshold - Block threshold (default: 70)
 * @returns Whether IP should be blocked
 */
export function shouldBlockIP(reputation: IPReputation, threshold: number = 70): boolean {
  return (
    reputation.score >= threshold ||
    reputation.threatLevel === 'critical' ||
    reputation.threatLevel === 'malicious'
  );
}

/**
 * Classifies an IP's threat level based on score
 * 
 * @param score - Reputation score (0-100)
 * @returns Threat level classification
 */
export function classifyThreatLevel(score: number): ThreatLevel {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'malicious';
  if (score >= 45) return 'suspicious';
  return 'benign';
}

// ============================================================================
// Security Audit Logger
// ============================================================================

/** In-memory audit log storage (would be database in production) */
const auditLogStorage: AuditLogEntry[] = [];

/**
 * Records a security audit event
 * 
 * @param entry - Audit log entry to record
 * @returns Recorded entry with generated ID and timestamp
 */
export function recordAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'correlationId' | 'retentionUntil'>): AuditLogEntry {
  const fullEntry: AuditLogEntry = {
    ...entry,
    id: generateId('audit'),
    timestamp: new Date(),
    correlationId: generateId('corr'),
    retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year retention
  };

  auditLogStorage.unshift(fullEntry); // Add to beginning (newest first)

  // Keep only last 10000 entries in memory
  if (auditLogStorage.length > 10000) {
    auditLogStorage.pop();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT][${entry.category}] ${entry.action} by ${entry.actor.id}`);
  }

  return fullEntry;
}

/**
 * Queries audit logs with filtering and pagination
 * 
 * @param filters - Query filters
 * @returns Paginated audit log results
 */
export function queryAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}): { entries: AuditLogEntry[]; totalCount: number; totalPages: number } {
  let filtered = [...auditLogStorage];

  // Apply filters
  if (filters?.startDate) {
    filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
  }
  if (filters?.categories?.length) {
    filtered = filtered.filter(e => filters.categories!.includes(e.category));
  }
  if (filters?.severities?.length) {
    filtered = filtered.filter(e => filters.severities!.includes(e.severity));
  }
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.action.toLowerCase().includes(query) ||
      e.actor.id.toLowerCase().includes(query) ||
      JSON.stringify(e.details).toLowerCase().includes(query)
    );
  }

  const totalCount = filtered.length;
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;

  return {
    entries: filtered.slice(startIndex, startIndex + pageSize),
    totalCount,
    totalPages,
  };
}

/**
 * Creates a standard actor info object for audit logging
 * 
 * @param params - Actor parameters
 * @returns Actor info object
 */
export function createActorInfo(params: {
  id: string;
  username?: string;
  displayName?: string;
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  authMethod?: AuthMethodForAudit;
  mfaVerified?: boolean;
}): ActorInfo {
  return {
    type: 'user',
    ...params,
    authenticationMethod: params.authMethod,
    mfaVerified: params.mfaVerified || false,
  };
}

/** Type alias for auth method in audit context */
type AuthMethodForAudit = 'password' | 'mfa_totp' | 'mfa_fido2' | 'saml' | 'oidc' | 'ldap' | 'certificate' | 'api_key' | 'jwt_bearer';

/**
 * Creates a standard source info object for audit logging
 */
export function createSourceInfo(params?: {
  component?: string;
  requestId?: string;
  traceId?: string;
}): SourceInfo {
  return {
    application: 'soc-platform',
    component: params?.component || 'security-module',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'unknown',
    region: process.env.AWS_REGION || process.env.AZURE_REGION,
    requestId: params?.requestId || generateId('req'),
    traceId: params?.traceId,
  };
}

/**
 * Convenience method to log authentication events
 */
export function logAuthEvent(params: {
  userId: string;
  username: string;
  ipAddress: string;
  userAgent?: string;
  action: 'login' | 'logout' | 'login_failed' | 'password_change' | 'mfa_enabled' | 'mfa_disabled';
  outcome: AuditOutcome;
  details?: Partial<AuditDetails>;
}): AuditLogEntry {
  return recordAuditEvent({
    category: 'authentication',
    severity: params.outcome === 'failure' ? 'high' : 'informational',
    outcome: params.outcome,
    actor: createActorInfo({
      id: params.userId,
      username: params.username,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }),
    action: params.action,
    resource: { type: 'users', id: params.userId },
    details: params.details as AuditDetails,
    source: createSourceInfo(),
    tags: ['authentication'],
  });
}

/**
 * Convenience method to log authorization events
 */
export function logAuthorizationEvent(params: {
  userId: string;
  username: string;
  resource: ResourceType;
  resourceId?: string;
  action: string;
  allowed: boolean;
  ipAddress: string;
  reason?: string;
}): AuditLogEntry {
  return recordAuditEvent({
    category: 'authorization',
    severity: params.allowed ? 'low' : 'medium',
    outcome: params.allowed ? 'success' : 'denied',
    actor: createActorInfo({
      id: params.userId,
      username: params.username,
      ipAddress: params.ipAddress,
    }),
    action: params.action,
    resource: { type: params.resource, id: params.resourceId },
    details: {
      additionalData: { allowed: params.allowed, reason: params.reason },
    },
    source: createSourceInfo(),
    tags: ['authorization'],
  });
}

// ============================================================================
// Encryption Utilities (AES-256-GCM, RSA-OAEP)
// ============================================================================

/**
 * Encrypts data using AES-256-GCM
 * 
 * @param plaintext - Data to encrypt
 * @param key - 32-byte encryption key (hex encoded)
 * @returns Encryption result with ciphertext, IV, and auth tag
 */
export async function encryptAES256GCM(
  plaintext: string,
  key: string
): Promise<EncryptionResult> {
  const crypto = await import('crypto');
  
  const iv = crypto.randomBytes(16); // 96-bit IV for GCM
  const keyBuffer = Buffer.from(key, 'hex');
  
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId: key.substring(0, 16), // First 16 chars as identifier
    algorithm: 'AES-256-GCM',
    encryptedAt: new Date(),
  };
}

/**
 * Decrypts AES-256-GCM encrypted data
 * 
 * @param encryptedData - Encryption result object
 * @param key - 32-byte decryption key (hex encoded)
 * @returns Decrypted plaintext
 */
export async function decryptAES256GCM(
  encryptedData: EncryptionResult,
  key: string
): Promise<DecryptionResult> {
  const crypto = await import('crypto');
  
  const keyBuffer = Buffer.from(key, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedData.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return {
    plaintext: decrypted,
    keyId: encryptedData.keyId,
    decryptedAt: new Date(),
  };
}

/**
 * Generates a random encryption key for AES-256-GCM
 * 
 * @returns Hex-encoded 32-byte key
 */
export async function generateEncryptionKey(): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypts data using RSA-OAEP with SHA-256
 * 
 * @param plaintext - Data to encrypt
 * @param publicKeyPEM - PEM-encoded public key
 * @returns Base64-encoded ciphertext
 */
export async function encryptRSAOAEP(
  plaintext: string,
  publicKeyPEM: string
): Promise<string> {
  const crypto = await import('crypto');
  
  const buffer = Buffer.from(plaintext, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPEM,
      padding: crypto.constants.RSA_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );

  return encrypted.toString('base64');
}

/**
 * Decrypts RSA-OAEP encrypted data
 * 
 * @param ciphertext - Base64-encoded ciphertext
 * @param privateKeyPEM - PEM-encoded private key
 * @returns Decrypted plaintext
 */
export async function decryptRSAOAEP(
  ciphertext: string,
  privateKeyPEM: string
): Promise<string> {
  const crypto = await import('crypto');
  
  const buffer = Buffer.from(ciphertext, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKeyPEM,
      padding: crypto.constants.RSA_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );

  return decrypted.toString('utf8');
}

/**
 * Generates an RSA key pair for asymmetric encryption
 * 
 * @param modulusLength - Key size in bits (2048 or 4096)
 * @returns Object with public and private keys in PEM format
 */
export async function generateRSAKeyPair(modulusLength: number = 2048): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const crypto = await import('crypto');
  
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      },
      (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      }
    );
  });
}

// ============================================================================
// Hash Utilities (bcrypt-style, Argon2 simulation, SHA-256)
// ============================================================================

/**
 * Hashes a password using PBKDF2 (bcrypt-like for Node.js compatibility)
 * For production, consider using argon2 via native bindings
 * 
 * @param password - Plain password to hash
 * @param salt - Optional salt (generated if not provided)
 * @param iterations - Number of iterations (default: 600000 per OWASP 2023)
 * @returns Hashed password with salt
 */
export async function hashPassword(
  password: string,
  salt?: string,
  iterations: number = 600000
): Promise<string> {
  const crypto = await import('crypto');
  
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32);
  
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      saltBuffer,
      iterations,
      64,
      'sha512',
      (err, derivedKey) => {
        if (err) reject(err);
        else {
          // Format: $pbkdf2-sha512$iterations$salt$hash
          resolve(
            `$pbkdf2-sha512$${iterations}$${saltBuffer.toString('hex')}$${derivedKey.toString('hex')}`
          );
        }
      }
    );
  });
}

/**
 * Verifies a password against a hash
 * 
 * @param password - Plain password to verify
 * @param hash - Stored password hash
 * @returns Whether password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split('$');
    if (parts[1] !== 'pbkdf2-sha512') {
      throw new Error('Unsupported hash format');
    }

    const iterations = parseInt(parts[2]);
    const salt = parts[3];
    const computedHash = await hashPassword(password, salt, iterations);

    // Use timing-safe comparison
    const crypto = await import('crypto');
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'utf8'),
      Buffer.from(hash, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Computes SHA-256 hash of data
 * 
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export async function sha256(data: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes SHA-512 hash of data
 * 
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export async function sha512(data: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Computes HMAC-SHA256 keyed hash
 * 
 * @param data - Data to authenticate
 * @param key - Secret key
 * @returns Hex-encoded HMAC
 */
export async function hmacSHA256(data: string, key: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Generates a cryptographically secure random token
 * 
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateRandomToken(bytes: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(bytes).toString('hex');
}

// ============================================================================
// Certificate Management Helpers
// ============================================================================

/**
 * Parses a PEM certificate and extracts basic info
 * 
 * @param pemCertificate - PEM-encoded certificate
 * @returns Basic certificate information
 */
export function parseCertificate(pemCertificate: string): {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
} | null {
  try {
    const crypto = require('crypto');
    const cert = new crypto.X509Certificate(pemCertificate);
    
    return {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: new Date(cert.validFrom),
      validTo: new Date(cert.validTo),
      fingerprint: cert.fingerprint256,
    };
  } catch {
    return null;
  }
}

/**
 * Calculates days until certificate expiry
 * 
 * @param expiryDate - Certificate expiry date
 * @returns Days until expiry (negative if expired)
 */
export function daysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determines certificate status based on dates
 * 
 * @param validFrom - Certificate start date
 * @param validTo - Certificate end date
 * @returns Certificate status
 */
export function getCertificateStatus(validFrom: Date, validTo: Date): 'valid' | 'expired' | 'not_yet_valid' | 'expiring_soon' {
  const now = new Date();
  const days = daysUntilExpiry(validTo);

  if (now < validFrom) return 'not_yet_valid';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

/**
 * Generates a self-signed certificate for development/testing
 * DO NOT USE IN PRODUCTION
 * 
 * @param options - Certificate options
 * @returns PEM-encoded certificate and private key
 */
export async function generateSelfSignedCert(options?: {
  commonName?: string;
  days?: number;
  keySize?: number;
}): Promise<{ certificate: string; privateKey: string }> {
  const crypto = require('crypto');
  
  const { certificate, private: privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: options?.keySize || 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Create self-signed certificate
  const certAttrs = [{
    commonName: options?.commonName || 'localhost',
    countryName: 'DZ',
    organizationName: 'National SOC Algeria',
  }];

  const cert = crypto.createCertificateSigningRequest(certAttrs);
  // This is simplified - in reality you'd sign this properly

  return {
    certificate: certificate, // Placeholder - would need proper signing
    privateKey,
  };
}

// ============================================================================
// Security Posture Assessment
// ============================================================================

/**
 * Calculates overall security posture score
 * 
 * @param items - Individual posture check items
 * @returns Overall posture assessment
 */
export function calculateSecurityPosture(items: PostureItem[]): SecurityPosture {
  const passCount = items.filter(i => i.status === 'pass').length;
  const failCount = items.filter(i => i.status === 'fail').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const criticalFails = items.filter(i => i.status === 'fail' && i.severity === 'critical').length;
  
  const totalItems = items.length;
  const rawScore = (passCount / totalItems) * 100;
  
  // Apply penalties
  const penalty = (criticalFails * 25) + (failCount * 10) + (warningCount * 3);
  const score = Math.max(0, Math.min(100, Math.round(rawScore - penalty)));
  
  let grade: SecurityPosture['grade'];
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  // Generate critical issues
  const criticalIssues: SecurityIssue[] = items
    .filter(i => i.status === 'fail' && (i.severity === 'critical' || i.severity === 'high'))
    .map(item => ({
      id: generateId('issue'),
      title: item.description,
      severity: item.severity === 'critical' ? 'critical' : 'high',
      category: item.name,
      description: item.description,
      affectedSystems: [],
      discoveredAt: item.lastChecked,
      status: 'open' as const,
    }));

  // Generate recommendations
  const recommendations: Recommendation[] = items
    .filter(i => i.status !== 'pass')
    .slice(0, 10)
    .map(item => ({
      id: generateId('rec'),
      priority: item.severity === 'critical' ? 'immediate' : item.severity === 'high' ? 'short_term' : 'long_term',
      category: item.name,
      title: `Fix: ${item.name}`,
      description: item.description,
      impact: item.severity === 'critical' ? 'high' : item.severity === 'high' ? 'medium' : 'low',
      effort: 'moderate',
      references: [],
    }));

  return {
    overallScore: score,
    grade,
    lastAssessed: new Date(),
    categories: groupByCategory(items),
    trends: [], // Would come from historical data
    criticalIssues,
    recommendations,
  };
}

/**
 * Groups posture items by category
 */
function groupByCategory(items: PostureItem[]): SecurityPosture['categories'] {
  const groups = new Map<string, PostureItem[]>();
  
  for (const item of items) {
    const category = item.name.split('_')[0]; // Simple grouping logic
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(item);
  }

  return Array.from(groups.entries()).map(([name, items]) => {
    const passCount = items.filter(i => i.status === 'pass').length;
    const score = (passCount / items.length) * 100;
    
    return {
      name,
      score: Math.round(score),
      weight: items.length,
      status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
      items,
    };
  });
}

/**
 * Runs a comprehensive security hardening checklist
 * Based on CIS Benchmarks and NIST guidelines
 * 
 * @param config - Current system configuration
 * @returns Array of posture check items
 */
export function runSecurityHardeningCheck(config?: {
  tlsVersion?: string;
  hstsEnabled?: boolean;
  cspEnabled?: boolean;
  corsConfigured?: boolean;
  rateLimitingEnabled?: boolean;
  mfaRequired?: boolean;
  auditLoggingEnabled?: boolean;
  encryptionEnabled?: boolean;
  passwordPolicyEnforced?: boolean;
  firewallEnabled?: boolean;
  intrusionDetection?: boolean;
  backupEncrypted?: boolean;
  accessLogging?: boolean;
  errorHandlingSecure?: boolean;
  sessionManagementSecure?: boolean;
}): PostureItem[] {
  const cfg = config || {};

  return [
    {
      name: 'tls_version',
      status: cfg.tlsVersion && !['TLSv1.0', 'TLSv1.1'].includes(cfg.tlsVersion) ? 'pass' : 'fail',
      severity: 'critical',
      description: 'TLS version must be 1.2 or higher',
      lastChecked: new Date(),
    },
    {
      name: 'hsts_enabled',
      status: cfg.hstsEnabled ? 'pass' : 'fail',
      severity: 'high',
      description: 'HTTP Strict Transport Security must be enabled',
      lastChecked: new Date(),
    },
    {
      name: 'csp_enabled',
      status: cfg.cspEnabled ? 'pass' : 'fail',
      severity: 'high',
      description: 'Content Security Policy must be configured',
      lastChecked: new Date(),
    },
    {
      name: 'cors_configured',
      status: cfg.corsConfigured ? 'pass' : 'warning',
      severity: 'medium',
      description: 'CORS policies should be explicitly configured',
      lastChecked: new Date(),
    },
    {
      name: 'rate_limiting',
      status: cfg.rateLimitingEnabled ? 'pass' : 'fail',
      severity: 'high',
      description: 'Rate limiting must be implemented on all endpoints',
      lastChecked: new Date(),
    },
    {
      name: 'mfa_required',
      status: cfg.mfaRequired ? 'pass' : 'fail',
      severity: 'critical',
      description: 'Multi-factor authentication must be required',
      lastChecked: new Date(),
    },
    {
      name: 'audit_logging',
      status: cfg.auditLoggingEnabled ? 'pass' : 'fail',
      severity: 'high',
      description: 'Comprehensive audit logging must be enabled',
      lastChecked: new Date(),
    },
    {
      name: 'encryption_at_rest',
      status: cfg.encryptionEnabled ? 'pass' : 'fail',
      severity: 'critical',
      description: 'Encryption at rest must be enabled for sensitive data',
      lastChecked: new Date(),
    },
    {
      name: 'password_policy',
      status: cfg.passwordPolicyEnforced ? 'pass' : 'warning',
      severity: 'medium',
      description: 'Strong password policy should be enforced',
      lastChecked: new Date(),
    },
    {
      name: 'firewall_active',
      status: cfg.firewallEnabled ? 'pass' : 'fail',
      severity: 'high',
      description: 'Firewall rules must be configured and active',
      lastChecked: new Date(),
    },
    {
      name: 'intrusion_detection',
      status: cfg.intrusionDetection ? 'pass' : 'warning',
      severity: 'medium',
      description: 'Intrusion detection system should be active',
      lastChecked: new Date(),
    },
    {
      name: 'backup_encryption',
      status: cfg.backupEncrypted ? 'pass' : 'fail',
      severity: 'high',
      description: 'Backups must be encrypted',
      lastChecked: new Date(),
    },
    {
      name: 'access_logging',
      status: cfg.accessLogging ? 'pass' : 'warning',
      severity: 'low',
      description: 'Access logging should be enabled for accountability',
      lastChecked: new Date(),
    },
    {
      name: 'secure_error_handling',
      status: cfg.errorHandlingSecure ? 'pass' : 'fail',
      severity: 'medium',
      description: 'Error messages must not leak sensitive information',
      lastChecked: new Date(),
    },
    {
      name: 'session_management',
      status: cfg.sessionManagementSecure ? 'pass' : 'fail',
      severity: 'high',
      description: 'Session management must follow security best practices',
      lastChecked: new Date(),
    },
  ];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID with optional prefix
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Masks sensitive values for logging
 * 
 * @param value - Value to mask
 * @param visibleChars - Characters to show at start/end
 * @returns Masked value
 */
export function maskSensitiveValue(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars * 2) return '*'.repeat(value.length);
  return `${value.substring(0, visibleChars)}${'*'.repeat(Math.min(8, value.length - visibleChars * 2))}${value.substring(value.length - visibleChars)}`;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates IP address format (IPv4 or IPv6)
 */
export function isValidIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validates URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates compliance check mock data for demonstration
 */
export function generateMockComplianceChecks(framework: ComplianceFramework): ComplianceCheck[] {
  const controls = getControlsForFramework(framework);
  
  return controls.map((control, index) => ({
    id: `${framework}_${index + 1}`,
    framework,
    controlId: control.id,
    controlTitle: control.title,
    description: control.description,
    severity: index % 5 === 0 ? 'critical' : index % 3 === 0 ? 'major' : 'minor',
    status: Math.random() > 0.2 ? 'pass' : Math.random() > 0.5 ? 'fail' : 'partial',
    findings: [],
    recommendations: control.recommendations || [],
    references: control.references || [],
    testedAt: new Date(),
    testedBy: 'automated-scan',
    notes: '',
    metadata: {},
  }));
}

/** Framework control definitions */
function getControlsForFramework(framework: ComplianceFramework): Array<{
  id: string;
  title: string;
  description: string;
  recommendations?: string[];
  references?: string[];
}> {
  switch (framework) {
    case 'CIS_Controls_v8':
      return CIS_CONTROLS_V8;
    case 'NIST_SP_800_53':
      return NIST_800_53_CONTROLS;
    case 'ISO_27001':
      return ISO_27001_CONTROLS;
    default:
      return GENERIC_CONTROLS;
  }
}

/** Sample CIS Controls v8 */
const CIS_CONTROLS_V8 = [
  { id: 'CIS-01', title: 'Inventory and Control of Enterprise Assets', description: 'Actively manage all enterprise assets', recommendations: ['Implement asset discovery tools'], references: ['https://www.cisecurity.org/controls'] },
  { id: 'CIS-02', title: 'Inventory and Control of Software Assets', description: 'Maintain accurate software inventory', recommendations: ['Use automated inventory scanning'], references: [] },
  { id: 'CIS-03', title: 'Data Protection', description: 'Develop processes for data protection', recommendations: ['Classify data sensitivity levels'], references: [] },
  { id: 'CIS-04', title: 'Secure Configuration', description: 'Establish secure configurations', recommendations: ['Use hardened baseline configs'], references: [] },
  { id: 'CIS-05', title: 'Account Management', description: 'Use processes for account management', recommendations: ['Implement automated provisioning'], references: [] },
  { id: 'CIS-06', title: 'Access Control', description: 'Control access to assets', recommendations: ['Apply principle of least privilege'], references: [] },
  { id: 'CIS-07', title: 'Continuous Vulnerability Management', description: 'Manage vulnerabilities continuously', recommendations: ['Run regular vulnerability scans'], references: [] },
  { id: 'CIS-08', title: 'Audit Log Management', description: 'Collect and analyze audit logs', recommendations: ['Centralize log collection'], references: [] },
  { id: 'CIS-09', title: 'Email and Web Browser Protections', description: 'Improve protections', recommendations: ['Configure email filtering'], references: [] },
  { id: 'CIS-10', title: 'Malware Defenses', description: 'Protect against malware', recommendations: ['Deploy endpoint protection'], references: [] },
];

/** Sample NIST SP 800-53 controls */
const NIST_800_53_CONTROLS = [
  { id: 'AC-1', title: 'Access Control Policy', description: 'Develop access control policy', recommendations: ['Document access control procedures'], references: ['https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final'] },
  { id: 'AC-2', title: 'Account Management', description: 'Manage system accounts', recommendations: ['Automate account lifecycle'], references: [] },
  { id: 'AC-3', title: 'Access Enforcement', description: 'Enforce authorized access', recommendations: ['Implement RBAC'], references: [] },
  { id: 'AU-1', title: 'Audit Policy', description: 'Develop audit policy', recommendations: ['Define audit requirements'], references: [] },
  { id: 'AU-2', title: 'Auditable Events', description: 'Define auditable events', recommendations: ['Identify critical events'], references: [] },
  { id: 'SC-8', title: 'Transmission Confidentiality', description: 'Protect transmission confidentiality', recommendations: ['Use TLS 1.2+'], references: [] },
  { id: 'SC-12', title: 'Cryptographic Key Establishment', description: 'Establish cryptographic keys', recommendations: ['Use FIPS-approved algorithms'], references: [] },
  { id: 'SC-23', title: 'Session Authenticity', description: 'Protect session authenticity', recommendations: ['Use secure session management'], references: [] },
];

/** Sample ISO 27001 controls */
const ISO_27001_CONTROLS = [
  { id: 'A.5.1', title: 'Information Security Policies', description: 'Manage information security policies', recommendations: ['Review policies annually'], references: ['https://www.iso.org/standard/27001'] },
  { id: 'A.5.2', title: 'Information Security Roles', description: 'Define security roles', recommendations: ['Document responsibilities'], references: [] },
  { id: 'A.6.1', title: 'Screening', description: 'Screen personnel', recommendations: ['Background checks for staff'], references: [] },
  { id: 'A.8.1', title: 'Assets Inventory', description: 'Maintain asset inventory', recommendations: ['Asset tagging system'], references: [] },
  { id: 'A.9.1', title: 'Access Control Policy', description: 'Control access to information', recommendations: ['Access review process'], references: [] },
  { id: 'A.9.2', title: 'User Access Provisioning', description: 'Manage user access', recommendations: ['Joiner/mover/leaver process'], references: [] },
  { id: 'A.9.4', title: 'System Login', description: 'Control system access', recommendations: ['Strong authentication'], references: [] },
  { id: 'A.10.1', title: 'Cryptographic Controls', description: 'Use cryptography appropriately', recommendations: ['Encryption standards'], references: [] },
  { id: 'A.12.1', title: 'Operations Procedures', description: 'Document operations procedures', recommendations: ['Change management'], references: [] },
  { id: 'A.12.4', title: 'Logging', description: 'Record events and evidence', recommendations: ['Centralized logging'], references: [] },
];

/** Generic controls for other frameworks */
const GENERIC_CONTROLS = [
  { id: 'GEN-01', title: 'Security Governance', description: 'Establish security governance', recommendations: ['Security steering committee'], references: [] },
  { id: 'GEN-02', title: 'Risk Assessment', description: 'Conduct risk assessments', recommendations: ['Annual risk reviews'], references: [] },
  { id: 'GEN-03', title: 'Incident Response', description: 'Prepare incident response', recommendations: ['IR playbooks'], references: [] },
  { id: 'GEN-04', title: 'Business Continuity', description: 'Ensure business continuity', recommendations: ['BCP testing'], references: [] },
  { id: 'GEN-05', title: 'Security Awareness', description: 'Train personnel', recommendations: ['Security training program'], references: [] },
];

// Export everything for external use
export {
  DEFAULT_CSP_DIRECTIVES,
  DEFAULT_PERMISSIONS_POLICY,
  DEFAULT_PASSWORD_POLICY,
  JWT_CONFIG,
  RATE_LIMIT_DEFAULTS,
};
