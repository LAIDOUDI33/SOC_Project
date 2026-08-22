/**
 * National SOC Platform - Centralized API Configuration
 * 
 * Single source of truth for all API endpoints and configuration.
 * Prevents hardcoded URLs scattered throughout components.
 */

// ============================================================
// API ENDPOINTS
// ============================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: '/api/auth',
  AUTH_SAML: '/api/auth/saml',
  AUTH_LDAP: '/api/auth/ldap',
  AUTH_MFA: '/api/auth/mfa',
  
  // Core SOC
  DASHBOARD: '/api/dashboard',
  ALERTS: '/api/alerts',
  INCIDENTS: '/api/incidents',
  THREATS: '/api/threats',
  CASES: '/api/cases',
  
  // Analytics & Metrics
  METRICS: '/api/metrics',
  ANALYTICS: '/api/analytics',
  ANALYTICS_TRENDS: '/api/analytics/trends',
  
  // Real-time
  STREAM: '/api/stream',
  STREAM_ALERTS: '/api/stream/alerts',
  
  // Telecom / SS7
  TELECOM: '/api/telecom',
  TELECOM_PROBES: '/api/telecom/probes',
  SS7_TRAFFIC: '/api/ss7/traffic',
  SS7_MESSAGES: '/api/ss7/messages',
  SS7_NETWORK: '/api/ss7/network',
  SS7_FRAUD: '/api/ss7/fraud',
  
  // Threat Hunting
  THREAT_HUNTING_SESSIONS: '/api/threat-hunting/sessions',
  
  // Compliance
  COMPLIANCE: '/api/compliance',
  
  // Reports & Export
  REPORTS: '/api/reports',
  EXPORT_CSV: '/api/export/csv',
  
  // System
  HEALTH: '/api/health',
  SYSTEM: '/api/system',
  
  // AI & Automation
  AI_AUTOMATION: '/api/ai-automation',
  AUTOMATION_PLAYBOOKS: '/api/automation/playbooks',
  
  // Geomarketing
  GEOMARKETING: '/api/geomarketing',
  
  // Events (v1 API)
  V1_EVENTS: '/api/v1/events',
} as const;

// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================

export const API_CONFIG = {
  // Request timeout in milliseconds
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
  
  // Pagination defaults
  PAGINATION: {
    defaultLimit: 20,
    maxLimit: 100,
    offset: 0,
  },
  
  // Cache durations (in seconds)
  CACHE: {
    metrics: 30,        // 30 seconds for real-time metrics
    dashboard: 60,      // 1 minute for dashboard data
    staticData: 300,    // 5 minutes for reference data
  },
} as const;

// ============================================================
// HTTP STATUS CODES
// ============================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 503,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================
// ERROR CODES
// ============================================================

export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  MFA_REQUIRED: 'MFA_REQUIRED',
  MFA_INVALID: 'MFA_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build URL with query parameters
 */
export function buildUrl(base: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return base;
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  return buildUrl(endpoint, params);
}

/**
 * Check if response is successful
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if error is client error (4xx)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if error is server error (5xx)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

// Export default configuration
export default {
  ENDPOINTS: API_ENDPOINTS,
  CONFIG: API_CONFIG,
  STATUS: HTTP_STATUS,
  ERRORS: ERROR_CODES,
};
