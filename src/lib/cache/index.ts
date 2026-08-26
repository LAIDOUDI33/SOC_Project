/**
 * National SOC Platform - Cache Module
 * Algeria 2026-2030 | Exports
 * 
 * Main entry point for all caching functionality.
 */

// Core Redis client
export {
  getRedisClient,
  RedisClient,
  cacheGet,
  cacheSet,
  cacheGetOrSet,
  cacheInvalidate,
  CACHE_TTL,
  KEY_PREFIXES,
  type RedisConfig,
  type CacheOptions,
  type CacheResult,
  type CacheMetrics
} from './redis'

// Middleware and higher-order functions
export {
  withCache,
  withRouteCache,
  invalidateCache,
  cacheInvalidation,
  cacheWarmer,
  requestDeduplicator,
  generateCacheKey,
  generateETag,
  ENDPOINT_CACHE_CONFIGS,
  DEFAULT_CACHE_CONFIG,
  type CacheMiddlewareConfig,
  type CachedResponse,
  type DeduplicationOptions
} from './cache/middleware'

// Pre-built helpers for common patterns
export {
  // Alert caching
  getCachedAlerts,
  getCachedAlertStats,
  getCachedAlertsNeedingAttention,
  invalidateAlertCaches,
  
  // Incident caching
  getCachedIncidents,
  getCachedSlaBreaches,
  invalidateIncidentCaches,
  
  // Dashboard & KPIs
  getCachedDashboardKPIs,
  getCachedTimelineData,
  invalidateDashboardCaches,
  
  // Threat intelligence
  getCachedThreatIndicators,
  getCachedIOCs,
  invalidateThreatCaches,
  
  // Telecom-specific
  getCachedSubscriber,
  getCachedProtocolStats,
  invalidateTelecomCaches,
  
  // Reference data
  getCachedReferenceData,
  
  // Batch operations
  batchInvalidate
} from './cache/helpers'

// Rate limiting with Redis
export {
  rateLimiter,
  checkRateLimit,
  getRateLimitHeaders,
  DEFAULT_RATE_LIMIT_TIERS,
  RateLimiter,
  type RateLimitOptions,
  type RateLimitResult,
  type RateLimitTier,
  type RateLimitConfig
} from '../rate-limiter'
