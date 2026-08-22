/**
 * Djezzy SOC Platform - Next.js Cache Configuration
 * 
 * ISR/SSR/Static optimization for enterprise SOC dashboard performance
 * Target: <2s initial load, <100ms subsequent navigations, 95%+ cache hit rate
 * Scale: 10K concurrent users, 500K EPS ingestion support
 * 
 * @version 2.0.0
 * @author Djezzy SOC Platform Team
 */

import { NextConfig } from 'next';
import type { NextFetchEvent } from 'next/server';

// ============================================================
// CACHE CONFIGURATION CONSTANTS
// ============================================================

export const CacheConfig = {
  // ============================================================
  // TIME-TO-LIVE VALUES (in seconds)
  // ============================================================
  TTL: {
    // Static assets - very long caching with content-based versioning
    STATIC_ASSETS: 365 * 24 * 60 * 60,        // 1 year (immutable with hash)
    FONTS: 365 * 24 * 60 * 60,                // 1 year (immutable)
    IMAGES: 30 * 24 * 60 * 60,               // 30 days (optimized + hashed)
    ICONS: 7 * 24 * 60 * 60,                  // 1 week
    
    // Page-level caching for different page types
    DASHBOARD_PAGE: 10,                       // 10 seconds - real-time security data
    ALERTS_PAGE: 5,                           // 5 seconds - critical alerts need freshness
    INCIDENTS_PAGE: 15,                       // 15 seconds - incident data
    THREATS_PAGE: 60,                         // 1 minute - threat intel
    HUNTING_PAGE: 30,                         // 30 seconds - threat hunting workspace
    REPORTS_PAGE: 300,                        // 5 minutes - generated reports
    COMPLIANCE_PAGE: 300,                     // 5 minutes - compliance status
    SETTINGS_PAGE: 86400,                     // 24 hours - user settings rarely change
    ANALYTICS_PAGE: 60,                       // 1 minute - analytics dashboards
    TELECOM_PAGE: 30,                         // 30 seconds - telecom monitoring
    
    // API response caching by endpoint type
    PUBLIC_API: 60,                           // 1 minute for public endpoints
    AUTHENTICATED_API: 0,                     // No server-side cache (dynamic per-user)
    METRICS_API: 15,                          // 15 seconds for metrics aggregation
    ALERTS_API: 5,                            // 5 seconds for alert data
    INCIDENTS_API: 15,                        // 15 seconds for incident data
    THREATS_API: 60,                          // 1 minute for threat intelligence
    REFERENCE_DATA: 3600,                     // 1 hour for lookup/reference data
    HEALTH_API: 10,                           // 10 seconds for health checks
    STREAMING_API: 0,                         // No caching for SSE/WebSocket endpoints
    
    // ============================================================
    // INCREMENTAL STATIC REGENERATION (ISR) CONFIGURATION
    // ============================================================
    ISR_REVALIDATION: {
      DASHBOARD: 10,                          // Revalidate every 10 seconds
      ALERTS: 5,                              // Revalidate every 5 seconds (critical path)
      ALERTS_DETAIL: 10,                      // Alert detail pages
      INCIDENTS: 15,                          // Revalidate every 15 seconds
      INCIDENTS_DETAIL: 30,                   // Incident detail pages
      THREATS: 60,                            // Revalidate every minute
      THREATS_DETAIL: 120,                    // Threat detail pages
      COMPLIANCE: 300,                         // Revalidate every 5 minutes
      KPI_REPORTS: 900,                       // Revalidate every 15 minutes
      HISTORICAL_DATA: 1800,                  // Revalidate every 30 minutes
      REFERENCE: 86400,                       // Revalidate daily
    },
    
    // ============================================================
    // STALE-WHILE-REVALIDATE (SWR) CONFIGURATION
    // Serve stale content while fetching fresh in background
    // ============================================================
    SWR: {
      DEFAULT: 60,                            // Serve stale for 1 minute while refreshing
      CRITICAL_DATA: 10,                      // 10 seconds for critical security data
      REALTIME_DATA: 5,                       // 5 seconds for real-time alerts/metrics
      NEAR_REALTIME: 15,                      // 15 seconds for near-real-time data
      REFERENCE_DATA: 300,                    // 5 minutes for reference data
      STATIC_CONTENT: 86400,                  // 24 hours for static content
    },
  },
  
  // ============================================================
  // CACHE CONTROL HEADERS
  // ============================================================
  HEADERS: {
    // Static immutable assets (hashed filenames)
    STATIC: 'public, max-age=31536000, immutable',
    
    // Static versioned assets with SWR fallback
    STATIC_VERSIONED: 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=604800',
    
    // Public API responses (cacheable at CDN edge)
    API_PUBLIC: 'public, s-maxage=60, stale-while-revalidate=59, stale-if-error=300',
    
    // Private/authenticated responses (no shared caching)
    API_PRIVATE: 'private, no-cache, no-store, must-revalidate',
    
    // Default ISR response headers
    ISR_DEFAULT: 's-maxage=10, stale-while-revalidate=299',
    
    // Real-time data (very short cache)
    ISR_REALTIME: 's-maxage=5, stale-while-revalidate=55',
    
    // CDN-only caching (bypass Next.js cache)
    CDN_ONLY: 'public, s-maxage=300, proxy-revalidate',
  },
  
  // Note: ROUTES configuration moved to end of file to avoid circular reference
};

// ============================================================
// ROUTE-SPECIFIC CACHE CONFIGURATIONS (defined after CacheConfig)
// ============================================================

export const RouteCacheConfig = {
  // Main dashboard routes
  '/': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.DASHBOARD,
    swr: CacheConfig.TTL.SWR.REALTIME_DATA,
    description: 'Main SOC Dashboard',
  },
  '/dashboard': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.DASHBOARD,
    swr: CacheConfig.TTL.SWR.REALTIME_DATA,
    description: 'Dashboard Home',
  },
  
  // Security operations routes
  '/alerts': {
    cache: 'SSR',                           // Always fresh - critical security data
    headers: CacheConfig.HEADERS.API_PRIVATE,
    description: 'Active Alerts Feed',
  },
  '/alerts/[id]': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.ALERTS_DETAIL,
    description: 'Alert Detail View',
  },
  '/incidents': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.INCIDENTS,
    swr: CacheConfig.TTL.SWR.NEAR_REALTIME,
    description: 'Incident Management',
  },
  '/incidents/[id]': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.INCIDENTS_DETAIL,
    description: 'Incident Detail View',
  },
  '/threat-hunting': {
    cache: 'SSR',                           // Interactive hunting workspace
    headers: CacheConfig.HEADERS.API_PRIVATE,
    description: 'Threat Hunting Workspace',
  },
  
  // Intelligence routes
  '/threats': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.THREATS,
    description: 'Threat Intelligence Feed',
  },
  '/threats/[id]': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.THREATS_DETAIL,
    description: 'Threat Detail View',
  },
  
  // Analytics & Reporting
  '/dashboards/analytics': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.DASHBOARD,
    description: 'Analytics Dashboard',
  },
  '/reports': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.KPI_REPORTS,
    description: 'Reports Library',
  },
  
  // Compliance
  '/dashboards/compliance': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.COMPLIANCE,
    description: 'Compliance Dashboard',
  },
  
  // Telecom-specific
  '/dashboards/telecom': {
    cache: 'ISR',
    revalidate: CacheConfig.TTL.ISR_REVALIDATION.DASHBOARD,
    description: 'Telecom Monitoring Dashboard',
  },
  
  // Settings (user-specific, but rarely changes)
  '/settings': {
    cache: 'SSR',                           // User-specific settings
    headers: CacheConfig.HEADERS.API_PRIVATE,
    description: 'User Settings',
  },
  
  // Authentication (never cached)
  '/auth/login': {
    cache: 'NO_STORE',
    headers: 'private, no-cache, no-store, must-revalidate, max-age=0',
    description: 'Login Page',
  },
  
  // ============================================================
  // API ROUTE CACHING
  // ============================================================
  '/api/health': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.HEALTH_API,
    description: 'Health Check Endpoint',
  },
  '/api/metrics': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.METRICS_API,
    swr: CacheConfig.TTL.SWR.CRITICAL_DATA,
    description: 'Metrics Aggregation API',
  },
  '/api/alerts': {
    cache: 'NONE',                          // Real-time alerts, no caching
    description: 'Alerts API',
  },
  '/api/incidents': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.INCIDENTS_API,
    description: 'Incidents API',
  },
  '/api/threats': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.THREATS_API,
    description: 'Threat Intelligence API',
  },
  '/api/dashboard': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.METRICS_API,
    description: 'Dashboard Data API',
  },
  '/api/compliance': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.COMPLIANCE_PAGE,
    description: 'Compliance Status API',
  },
  '/api/system': {
    cache: 'EDGE',
    ttl: CacheConfig.TTL.HEALTH_API,
    description: 'System Status API',
  },
  '/api/stream/*': {
    cache: 'NONE',                          // Streaming endpoints never cached
    description: 'SSE/Streaming Endpoints',
  },
  '/api/v1/events': {
    cache: 'NONE',                          // Ingestion endpoint, write-heavy
    description: 'Event Ingestion API',
  },
  '/api/auth/*': {
    cache: 'NONE',                          // Auth endpoints never cached
    description: 'Authentication APIs',
  },
};

// ============================================================
// NEXT.JS CONFIGURATION WITH PERFORMANCE OPTIMIZATIONS
// ============================================================

const nextConfig: NextConfig = {
  // Enable React strict mode for development warnings
  reactStrictMode: true,
  
  // Output optimization for Docker deployment
  output: 'standalone',
  
  // Image optimization configuration for SOC dashboards
  images: {
    // Modern formats for better compression
    formats: ['image/avif', 'image/webp'],
    
    // Responsive device sizes for SOC dashboard layouts
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 2560],
    
    // Image sizes for responsive srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    
    // Cache optimized images for 24h
    minimumCacheTTL: 86400,
    
    // Allowed remote image sources (CDN domains)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.djezzy.dz',
      },
      {
        protocol: 'https',
        hostname: 'static.djezzy.dz',
      },
      {
        protocol: 'https',
        hostname: 'images.djezzy.dz',
      },
    ],
    
    // Security settings
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Experimental features for maximum performance
  experimental: {
    // Optimize package imports for tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-*',
      'recharts',
      'date-fns',
      'clsx',
      'tailwind-merge',
      '@tanstack/react-query',
      'zustand',
    ],
    
    // Server components external packages
    serverComponentsExternalPackages: [
      '@prisma/client',
      '@elastic/elasticsearch',
      'ioredis',
      'kafkajs',
    ],
    
    // Server actions optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Headers configuration for multi-layer caching
  async headers() {
    return [
      // ============================================================
      // STATIC ASSETS - Aggressive caching with immutability
      // ============================================================
      {
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: CacheConfig.HEADERS.STATIC },
          { key: 'CDN-Cache-Control', value: CacheConfig.HEADERS.STATIC },
        ],
      },
      
      // Fonts - should be immutable
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: CacheConfig.HEADERS.STATIC },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      
      // Next.js optimized images
      {
        source: '/_next/image(:.*)',
        headers: [
          { key: 'Cache-Control', value: CacheConfig.HEADERS.STATIC_VERSIONED },
          { key: 'CDN-Cache-Control', value: CacheConfig.HEADERS.STATIC_VERSIONED },
        ],
      },
      
      // Static chunks (JS/CSS with hashes)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: CacheConfig.HEADERS.STATIC },
        ],
      },
      
      // ============================================================
      // SECURITY HEADERS - All responses
      // ============================================================
      {
        source: '/(.*)',
        headers: [
          // DNS prefetching
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          
          // HSTS - Strict transport security
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          
          // XSS Protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          
          // Clickjacking protection
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          
          // MIME type sniffing prevention
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          
          // Permissions policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          
          // Content Security Policy hints
          { key: 'Content-Security-Policy', value: "upgrade-insecure-requests" },
        ],
      },
      
      // ============================================================
      // API HEADERS - CORS and caching
      // ============================================================
      {
        source: '/api/(.*)',
        headers: [
          // CORS configuration
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || 'https://soc.djezzy.dz' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Request-ID, X-SOC-Token, X-Batch-Size' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          
          // No caching for private API responses
          { key: 'Cache-Control', value: 'private, no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      
      // Public API endpoints (cacheable)
      {
        source: '/api/public/(.*)',
        headers: [
          { key: 'Cache-Control', value: CacheConfig.HEADERS.API_PUBLIC },
          { key: 'CDN-Cache-Control', value: CacheConfig.HEADERS.API_PUBLIC },
          { key: 'Vercel-CDN-Cache-Control', value: CacheConfig.HEADERS.API_PUBLIC },
        ],
      },
      
      // Health check endpoint (short cache)
      {
        source: '/api/health',
        headers: [
          { key: 'Cache-Control', value: `public, s-maxage=${CacheConfig.TTL.HEALTH_API}, stale-while-revalidate=${CacheConfig.TTL.HEALTH_API}` },
        ],
      },
    ];
  },
  
  // Redirect configuration
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/dashboard', destination: '/', permanent: false },
    ];
  },
  
  // Webpack configuration for optimal bundle performance
  webpack: (config, { isServer }) => {
    // ============================================================
    // BUNDLE OPTIMIZATION
    // ============================================================
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxSize: 244000, // ~244KB per chunk for caching
        cacheGroups: {
          // React core - stable, rarely changes
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 50,
            enforce: true,
          },
          
          // Next.js framework
          next: {
            test: /[\\/]node_modules[\\/](next)[\\/]/,
            name: 'next',
            chunks: 'all',
            priority: 45,
            enforce: true,
          },
          
          // UI libraries (Radix, Lucide, etc.)
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|recharts)[\\/]/,
            name: 'ui-vendor',
            chunks: 'all',
            priority: 40,
          },
          
          // Other vendor code
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
            minChunks: 2,
          },
          
          // Common shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
      
      // Runtime chunk for long-term caching
      runtimeChunk: 'single',
    };
    
    // ============================================================
    // RESOLVE ALIASES
    // ============================================================
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        '@': '/src',
        '@components': '/src/components',
        '@lib': '/src/lib',
        '@hooks': '/src/hooks',
        '@utils': '/src/lib/utils',
        '@config': '/config',
        '@types': '/src/types',
      },
      // Optimize resolution
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    };
    
    // ============================================================
    // BUNDLE SIZE OPTIMIZATIONS
    // ============================================================
    if (!isServer) {
      // Replace heavy libraries with lighter alternatives
      config.resolve.alias = {
        ...config.resolve.alias,
        moment$: 'dayjs',           // moment -> dayjs (much smaller)
      };
    }
    
    // Ignore locale files for smaller bundles
    // Note: IgnorePlugin is configured via next.config.js plugins array if needed
    
    // Source maps in production for debugging
    config.devtool = 'hidden-source-map';
    
    return config;
  },
  
  // Disable X-Powered-By header for security
  poweredByHeader: false,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

// ============================================================
// SERVER-SIDE CACHE HELPERS
// ============================================================

/**
 * Generate complete cache control headers based on route configuration
 */
export function getCacheHeaders(route: string): Record<string, string> {
  const routeConfig = RouteCacheConfig[route as keyof typeof RouteCacheConfig];
  
  if (!routeConfig) {
    return { 'Cache-Control': CacheConfig.HEADERS.API_PRIVATE };
  }
  
  // Explicitly set headers
  if ('headers' in routeConfig && routeConfig.headers) {
    const headers: Record<string, string> = { 'Cache-Control': routeConfig.headers };
    
    // Add CDN headers for cacheable routes
    if (routeConfig.cache === 'ISR' || routeConfig.cache === 'EDGE') {
      headers['CDN-Cache-Control'] = getCDNCacheControl(routeConfig);
      headers['Vercel-CDN-Cache-Control'] = getCDNCacheControl(routeConfig);
    }
    
    return headers;
  }
  
  // ISR routes
  if (routeConfig.cache === 'ISR' && 'revalidate' in routeConfig) {
    const revalidate = (routeConfig as any).revalidate || CacheConfig.TTL.ISR_REVALIDATION.DASHBOARD;
    const swr = 'swr' in routeConfig ? (routeConfig as any).swr : CacheConfig.TTL.SWR.DEFAULT;
    
    return {
      'Cache-Control': `s-maxage=${revalidate}, stale-while-revalidate=${swr}`,
      'CDN-Cache-Control': `public, s-maxage=${revalidate}, stale-while-revalidate=${swr}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${revalidate}, stale-while-revalidate=${swr}`,
    };
  }
  
  // EDGE cache routes
  if (routeConfig.cache === 'EDGE' && 'ttl' in routeConfig) {
    const ttl = (routeConfig as any).ttl || 60;
    return {
      'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      'CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
    };
  }
  
  // Default: no caching
  return { 'Cache-Control': CacheConfig.HEADERS.API_PRIVATE };
}

/**
 * Get CDN-specific cache control header
 */
function getCDNCacheControl(routeConfig: any): string {
  const ttl = routeConfig.revalidate || routeConfig.ttl || 60;
  const swr = routeConfig.swr || CacheConfig.TTL.SWR.DEFAULT;
  return `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`;
}

/**
 * Check if a route should use ISR caching
 */
export function shouldUseISR(route: string): boolean {
  const routeConfig = RouteCacheConfig[route as keyof typeof RouteCacheConfig];
  return routeConfig?.cache === 'ISR';
}

/**
 * Check if a route should be served from edge cache
 */
export function shouldUseEdgeCache(route: string): boolean {
  const routeConfig = RouteCacheConfig[route as keyof typeof RouteCacheConfig];
  return routeConfig?.cache === 'EDGE';
}

/**
 * Get revalidation time for a route
 */
export function getRevalidationTime(route: string): number | false {
  const routeConfig = RouteCacheConfig[route as keyof typeof RouteCacheConfig];
  return (routeConfig as any)?.revalidate ?? false;
}

/**
 * Get TTL for a specific route
 */
export function getRouteTTL(route: string): number {
  const routeConfig = RouteCacheConfig[route as keyof typeof RouteCacheConfig];
  return (routeConfig as any)?.revalidate || (routeConfig as any)?.ttl || 0;
}

// ============================================================
// CLIENT-SIDE CACHE UTILITIES
// ============================================================

/**
 * Service Worker cache strategy constants
 */
export const SW_CACHE_STRATEGIES = {
  CACHE_NAMES: {
    STATIC: 'djezzy-soc-static-v2',
    DYNAMIC: 'djezzy-soc-dynamic-v2',
    API: 'djezzy-soc-api-v2',
    IMAGES: 'djezzy-soc-images-v2',
    FONTS: 'djezzy-soc-fonts-v2',
  },
  
  STRATEGIES: {
    // Cache first, network fallback for static assets
    CACHE_FIRST: 'cache-first',
    
    // Network first, cache fallback for dynamic data
    NETWORK_FIRST: 'network-first',
    
    // Stale while revalidate for near-real-time data
    STALE_WHILE_REVALIDATE: 'swr',
    
    // Network only for sensitive operations
    NETWORK_ONLY: 'network-only',
    
    // Cache only for offline-first content
    CACHE_ONLY: 'cache-only',
  },
};

/**
 * Determine cache strategy for a request URL
 * Used by Service Worker for client-side caching decisions
 */
export function getCacheStrategy(url: string): string {
  // Static assets - cache first
  if (url.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
    return SW_CACHE_STRATEGIES.STRATEGIES.CACHE_FIRST;
  }
  
  // Images - cache first
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/)) {
    return SW_CACHE_STRATEGIES.STRATEGIES.CACHE_FIRST;
  }
  
  // Metrics and dashboard data - stale while revalidate
  if (
    url.startsWith('/api/metrics') ||
    url.startsWith('/api/dashboard') ||
    url.startsWith('/api/kpi')
  ) {
    return SW_CACHE_STRATEGIES.STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Alerts - short SWR for near-realtime
  if (url.startsWith('/api/alerts')) {
    return SW_CACHE_STRATEGIES.STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Authentication - never cache
  if (url.startsWith('/api/auth') || url.includes('/login')) {
    return SW_CACHE_STRATEGIES.STRATEGIES.NETWORK_ONLY;
  }
  
  // Event ingestion - network only
  if (url.includes('/events') && !url.includes('stream')) {
    return SW_CACHE_STRATEGIES.STRATEGIES.NETWORK_ONLY;
  }
  
  // Other API endpoints - network first with cache fallback
  if (url.startsWith('/api/')) {
    return SW_CACHE_STRATEGIES.STRATEGIES.NETWORK_FIRST;
  }
  
  // Pages - network first
  return SW_CACHE_STRATEGIES.STRATEGIES.NETWORK_FIRST;
}

/**
 * Get appropriate cache name for a URL
 */
export function getCacheName(url: string): string {
  if (url.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
    return SW_CACHE_STRATEGIES.CACHE_NAMES.STATIC;
  }
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/)) {
    return SW_CACHE_STRATEGIES.CACHE_NAMES.IMAGES;
  }
  if (url.match(/fonts/i)) {
    return SW_CACHE_STRATEGIES.CACHE_NAMES.FONTS;
  }
  if (url.startsWith('/api/')) {
    return SW_CACHE_STRATEGIES.CACHE_NAMES.API;
  }
  return SW_CACHE_STRATEGIES.CACHE_NAMES.DYNAMIC;
}
