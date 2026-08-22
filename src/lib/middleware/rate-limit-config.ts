/**
 * National SOC Platform - Rate Limit Route Configuration
 * 
 * Defines which rate limits apply to which API routes based on path patterns.
 * This file is used by the unified-rate-limit middleware to auto-detect
 * and apply the correct rate limiting configuration.
 * 
 * @module middleware/rate-limit-config
 * @version 1.0.0
 */

import type { RateLimitCategory } from './unified-rate-limit';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Route pattern configuration
 */
export interface RouteRateLimitConfig {
  /** Glob pattern or regex pattern for matching routes */
  pattern: string | RegExp;
  
  /** Rate limit category to apply */
  category: RateLimitCategory;
  
  /** Optional override description for logging */
  description?: string;
  
  /** HTTP methods to limit (empty = all methods) */
  methods?: string[];
}

/**
 * Complete route mapping configuration
 */
export interface RateLimitRouteMapping {
  /** All configured route patterns */
  routes: RouteRateLimitConfig[];
  
  /** Default category for unmatched routes */
  defaultCategory: RateLimitCategory;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Complete mapping of API routes to their rate limit configurations
 * Organized by functional area for maintainability
 */
export const RATE_LIMIT_ROUTES: RouteRateLimitConfig[] = [
  // =========================================================================
  // AUTHENTICATION ENDPOINTS (Strict - 5 req/15min)
  // Protect against brute force attacks on login, MFA, SSO
  // =========================================================================
  {
    pattern: '/api/auth',
    category: 'auth',
    description: 'Authentication endpoints - strict brute force protection'
  },
  {
    pattern: '/api/auth/login',
    category: 'auth',
    methods: ['POST'],
    description: 'Login endpoint - extra strict'
  },
  {
    pattern: '/api/auth/mfa',
    category: 'auth',
    methods: ['POST', 'PUT', 'DELETE'],
    description: 'MFA operations - strict protection'
  },
  {
    pattern: '/api/auth/saml',
    category: 'auth',
    description: 'SAML SSO endpoints'
  },
  {
    pattern: '/api/auth/ldap',
    category: 'auth',
    description: 'LDAP authentication endpoints'
  },

  // =========================================================================
  // DATA ENDPOINTS (Moderate - 100 req/min)
  // Core SOC data retrieval endpoints
  // =========================================================================
  {
    pattern: '/api/alerts',
    category: 'data',
    description: 'Alert management endpoints'
  },
  {
    pattern: '/api/incidents',
    category: 'data',
    description: 'Incident management endpoints'
  },
  {
    pattern: '/api/threats',
    category: 'data',
    description: 'Threat intelligence endpoints'
  },
  {
    pattern: '/api/cases',
    category: 'data',
    description: 'Case management endpoints'
  },
  {
    pattern: '/api/v1/events',
    category: 'data',
    description: 'Event ingestion endpoint'
  },

  // =========================================================================
  // EXPORT ENDPOINTS (Very Strict - 3 req/hour)
  // Prevent data exfiltration through bulk exports
  // =========================================================================
  {
    pattern: '/api/export',
    category: 'export',
    description: 'Data export endpoints - anti-exfiltration protection'
  },
  {
    pattern: '/api/export/csv',
    category: 'export',
    methods: ['GET', 'POST'],
    description: 'CSV export endpoint'
  },
  {
    pattern: '/api/export/pdf',
    category: 'export',
    methods: ['GET', 'POST'],
    description: 'PDF export endpoint'
  },
  {
    pattern: '/api/reports',
    category: 'export',
    methods: ['GET', 'POST'],
    description: 'Report generation endpoints'
  },

  // =========================================================================
  // STREAMING ENDPOINTS (Token Bucket - 5 concurrent)
  // SSE and real-time data streams
  // =========================================================================
  {
    pattern: '/api/stream',
    category: 'stream',
    description: 'SSE streaming endpoint'
  },
  {
    pattern: '/api/stream/alerts',
    category: 'stream',
    description: 'Alert stream endpoint'
  },
  {
    pattern: '/api/stream/events',
    category: 'stream',
    description: 'Event stream endpoint'
  },
  {
    pattern: '/api/stream/metrics',
    category: 'stream',
    description: 'Metrics stream endpoint'
  },

  // =========================================================================
  // GENERAL / SYSTEM ENDPOINTS (Standard - 200 req/min)
  // Health checks, dashboard, metrics, system info
  // =========================================================================
  {
    pattern: '/api/dashboard',
    category: 'general',
    description: 'Dashboard data endpoints'
  },
  {
    pattern: '/api/metrics',
    category: 'general',
    description: 'Metrics collection endpoints'
  },
  {
    pattern: '/api/system',
    category: 'general',
    description: 'System information endpoints'
  },
  {
    pattern: '/api/health',
    category: 'general',
    description: 'Health check endpoints'
  },
  {
    pattern: '/api/geomarketing',
    category: 'general',
    description: 'Geomarketing data endpoints'
  },

  // =========================================================================
  // TELECOM / SS7 ENDPOINTS (Moderate - 80 req/min)
  // SS7 monitoring, fraud detection, telecom operations
  // =========================================================================
  {
    pattern: '/api/ss7',
    category: 'telecom',
    description: 'SS7 protocol endpoints'
  },
  {
    pattern: '/api/ss7/traffic',
    category: 'telecom',
    description: 'SS7 traffic monitoring'
  },
  {
    pattern: '/api/ss7/fraud',
    category: 'telecom',
    description: 'Fraud detection endpoints'
  },
  {
    pattern: '/api/ss7/network',
    category: 'telecom',
    description: 'Network status endpoints'
  },
  {
    pattern: '/api/ss7/messages',
    category: 'telecom',
    description: 'Message inspection endpoints'
  },
  {
    pattern: '/api/telecom',
    category: 'telecom',
    description: 'General telecom endpoints'
  },
  {
    pattern: '/api/telecom/probes',
    category: 'telecom',
    description: 'Probe management endpoints'
  },

  // =========================================================================
  // BUSINESS / COMPLIANCE ENDPOINTS (Moderate - 60 req/min)
  // Compliance reporting, business intelligence
  // =========================================================================
  {
    pattern: '/api/compliance',
    category: 'business',
    description: 'Compliance management endpoints'
  },
  {
    pattern: '/api/compliance/anssi',
    category: 'business',
    description: 'ANSSI compliance endpoints'
  },
  {
    pattern: '/api/compliance/artp',
    category: 'business',
    description: 'ARTP compliance endpoints'
  },

  // =========================================================================
  // ANALYTICS / AI ENDPOINTS (Moderate - 50 req/min)
  // ML models, analytics, predictions (resource-intensive)
  // =========================================================================
  {
    pattern: '/api/analytics',
    category: 'analytics',
    description: 'Analytics computation endpoints'
  },
  {
    pattern: '/api/analytics/trends',
    category: 'analytics',
    description: 'Trend analysis endpoints'
  },
  {
    pattern: '/api/analytics/predictions',
    category: 'analytics',
    description: 'ML prediction endpoints'
  },
  {
    pattern: '/api/ai-automation',
    category: 'analytics',
    description: 'AI automation endpoints'
  },
  {
    pattern: '/api/ai-automation/train',
    category: 'analytics',
    methods: ['POST'],
    description: 'Model training endpoints'
  },

  // =========================================================================
  // AUTOMATION / PLAYBOOKS ENDPOINTS (Moderate - 40 req/min)
  // SOAR automation, playbook execution
  // =========================================================================
  {
    pattern: '/api/automation',
    category: 'automation',
    description: 'Automation control endpoints'
  },
  {
    pattern: '/api/automation/playbooks',
    category: 'automation',
    description: 'Playbook management endpoints'
  },
  {
    pattern: '/api/automation/workflows',
    category: 'automation',
    description: 'Workflow execution endpoints'
  },

  // =========================================================================
  // THREAT HUNTING ENDPOINTS (Moderate - 70 req/min)
  // Investigation tools, hunt sessions, IOC queries
  // =========================================================================
  {
    pattern: '/api/threat-hunting',
    category: 'threat-hunting',
    description: 'Threat hunting base endpoints'
  },
  {
    pattern: '/api/threat-hunting/sessions',
    category: 'threat-hunting',
    description: 'Hunt session management'
  },
  {
    pattern: '/api/threat-hunting/queries',
    category: 'threat-hunting',
    description: 'Hunt query execution'
  },
  {
    pattern: '/api/threat-hunting/iocs',
    category: 'threat-hunting',
    description: 'IOC lookup endpoints'
  }
];

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default rate limit category for routes that don't match any pattern
 */
export const DEFAULT_RATE_LIMIT_CATEGORY: RateLimitCategory = 'general';

// ============================================================================
// Pattern Matching Functions
// ============================================================================

/**
 * Check if a path matches a pattern
 * Supports both glob-like strings and RegExp
 */
function matchesPattern(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }
  
  // Convert glob-like pattern to regex
  // Supports: *, **, exact match, prefix match with *
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except * and ?
    .replace(/\*\*/g, '{{DOUBLESTAR}}')      // Temp replace **
    .replace(/\*/g, '[^/]*')                  // * = single segment
    .replace('{{DOUBLESTAR}}', '.*');         // ** = multi segment
  
  return new RegExp(`^${regexStr}`).test(path);
}

/**
 * Get the rate limit category for a given request path
 * 
 * @param pathname - The URL pathname (e.g., '/api/alerts')
 * @param method - Optional HTTP method for method-specific rules
 * @returns The applicable rate limit category
 * 
 * @example
 * ```typescript
 * import { getRateLimitForPath } from '@/lib/middleware/rate-limit-config';
 * 
 * const category = getRateLimitForPath('/api/auth/login', 'POST');
 * // Returns: 'auth'
 * ```
 */
export function getRateLimitForPath(
  pathname: string,
  method?: string
): { category: RateLimitCategory; config?: RouteRateLimitConfig } {
  // Normalize path
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  
  // Find first matching pattern (order matters - more specific first)
  for (const route of RATE_LIMIT_ROUTES) {
    if (!matchesPattern(normalizedPath, route.pattern)) {
      continue;
    }
    
    // Check method restriction if specified
    if (route.methods && route.methods.length > 0 && method) {
      const upperMethod = method.toUpperCase();
      if (!route.methods.some(m => m.toUpperCase() === upperMethod)) {
        continue; // Method doesn't match, try next rule
      }
    }
    
    return { category: route.category, config: route };
  }
  
  // Return default for unmatched paths
  return { category: DEFAULT_RATE_LIMIT_CATEGORY };
}

/**
 * Get all routes in a specific category
 * Useful for documentation and testing
 */
export function getRoutesByCategory(category: RateLimitCategory): RouteRateLimitConfig[] {
  return RATE_LIMIT_ROUTES.filter(route => route.category === category);
}

/**
 * Validate that a path has rate limiting configured
 * Returns warnings for unconfigured paths
 */
export function validatePathCoverage(paths: string[]): {
  covered: string[];
  uncovered: string[];
  warnings: string[];
} {
  const covered: string[] = [];
  const uncovered: string[] = [];
  const warnings: string[] = [];
  
  for (const path of paths) {
    const { config } = getRateLimitForPath(path);
    if (config) {
      covered.push(path);
    } else {
      uncovered.push(path);
      warnings.push(`No explicit rate limit configured for: ${path} (using default)`);
    }
  }
  
  return { covered, uncovered, warnings };
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Get summary statistics about rate limit configuration
 * Useful for admin dashboards and documentation
 */
export function getRateLimitSummary(): {
  totalRoutes: number;
  categories: Record<RateLimitCategory, number>;
  categoryDetails: Record<RateLimitCategory, {
    count: number;
    routes: string[];
    presetName: string;
  }>;
} {
  const categories: Record<string, number> = {};
  const categoryDetails: Record<RateLimitCategory, {
    count: number;
    routes: string[];
    presetName: string;
  }> = {} as Record<RateLimitCategory, {
    count: number;
    routes: string[];
    presetName: string;
  }>;
  
  for (const route of RATE_LIMIT_ROUTES) {
    categories[route.category] = (categories[route.category] || 0) + 1;
    
    if (!categoryDetails[route.category]) {
      categoryDetails[route.category] = {
        count: 0,
        routes: [],
        presetName: route.category
      };
    }
    categoryDetails[route.category].count++;
    const pattern = typeof route.pattern === 'string' ? route.pattern : route.pattern.toString();
    categoryDetails[route.category].routes.push(pattern);
  }
  
  return {
    totalRoutes: RATE_LIMIT_ROUTES.length,
    categories: categories as Record<RateLimitCategory, number>,
    categoryDetails
  };
}

// ============================================================================
// Export Configuration Object
// ============================================================================

/**
 * Complete rate limit route mapping configuration
 */
export const rateLimitMapping: RateLimitRouteMapping = {
  routes: RATE_LIMIT_ROUTES,
  defaultCategory: DEFAULT_RATE_LIMIT_CATEGORY
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  RATE_LIMIT_ROUTES,
  DEFAULT_RATE_LIMIT_CATEGORY,
  getRateLimitForPath,
  getRoutesByCategory,
  validatePathCoverage,
  getRateLimitSummary,
  rateLimitMapping
};
