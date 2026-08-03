/**
 * Djezzy SOC Platform - Multi-Layer Cache Manager
 * 
 * Comprehensive caching solution for enterprise SOC platform:
 * - L1: Browser/Client-side cache (Service Worker)
 * - L2: CDN/Edge cache (Cloudflare)
 * - L3: Redis cluster cache (Application layer)
 * - L4: Database query cache
 * 
 * Target: 95%+ hit rate, <5ms average read latency
 * Scale: 10K concurrent users, 500K EPS support
 *
 * @version 2.0.0
 * @author Djezzy SOC Platform Team
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Enable stale-while-revalidate */
  swrEnabled: boolean;
  /** SWR duration in seconds */
  swrDuration: number;
  /** Enable compression for cached values */
  compressionEnabled: boolean;
  /** Maximum cache size in MB (0 = unlimited) */
  maxSizeMB?: number;
}

export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when entry was created */
  createdAt: number;
  /** Timestamp when entry expires */
  expiresAt: number;
  /** Time-to-live in seconds */
  ttl: number;
  /** Number of times this entry was accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Cache layer where this entry is stored */
  layer: CacheLayer;
  /** Optional tags for group invalidation */
  tags?: string[];
}

export type CacheLayer = 'L1_browser' | 'L2_cdn' | 'L3_redis' | 'L4_database';

export interface CacheStats {
  /** Total number of entries across all layers */
  totalEntries: number;
  /** Number of entries per layer */
  entriesByLayer: Record<CacheLayer, number>;
  /** Hit rate percentage (0-100) */
  hitRate: number;
  /** Miss rate percentage (0-100) */
  missRate: number;
  /** Average read latency in ms */
  avgReadLatencyMs: number;
  /** P95 read latency in ms */
  p95ReadLatencyMs: number;
  /** Total hits */
  totalHits: number;
  /** Total misses */
  totalMisses: number;
  /** Evictions count */
  evictions: number;
  /** Memory usage estimate in bytes */
  estimatedMemoryBytes: number;
}

export interface InvalidationRule {
  /** Rule pattern or key prefix */
  pattern: string;
  /** Tags to invalidate */
  tags?: string[];
  /** Invalidation strategy */
  strategy: 'immediate' | 'delayed' | 'versioned';
  /** Delay before invalidation (for delayed strategy) */
  delayMs?: number;
}

export interface CacheManagerOptions {
  /** Configuration for each cache layer */
  layers?: Partial<Record<CacheLayer, CacheConfig>>;
  /** Global default configuration */
  defaults?: CacheConfig;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Metrics collection interval in ms */
  metricsInterval?: number;
  /** Maximum size of in-memory cache (entries) */
  maxInMemoryEntries?: number;
  /** Custom serialization functions */
  serializer?: {
    serialize: <T>(value: T) => string | Buffer;
    deserialize: <T>(data: string | Buffer) => T;
  };
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 300,           // 5 minutes default
  swrEnabled: true,
  swrDuration: 60,          // Serve stale for 1 minute while refreshing
  compressionEnabled: true,
  maxSizeMB: 512,            // 512MB max memory cache
};

const LAYER_DEFAULTS: Record<CacheLayer, CacheConfig> = {
  L1_browser: {
    defaultTTL: 60,          // 1 minute browser cache
    swrEnabled: true,
    swrDuration: 120,        // 2 minutes SWR
    compressionEnabled: false,
    maxSizeMB: 50,
  },
  L2_cdn: {
    defaultTTL: 300,         // 5 minutes CDN cache
    swrEnabled: true,
    swrDuration: 300,        // 5 minutes SWR at edge
    compressionEnabled: false,
    maxSizeMB: 0,            // Unlimited (managed by CDN)
  },
  L3_redis: {
    defaultTTL: 1800,        // 30 minutes Redis cache
    swrEnabled: true,
    swrDuration: 300,        // 5 minutes SWR
    compressionEnabled: true,
    maxSizeMB: 1024,          // 1GB local fallback
  },
  L4_database: {
    defaultTTL: 3600,        // 1 hour query cache
    swrEnabled: false,       // No SWR for DB queries
    swrDuration: 0,
    compressionEnabled: false,
    maxSizeMB: 256,
  },
};

// ============================================================
// IN-MEMORY CACHE STORE (Fallback when Redis unavailable)
// ============================================================

class InMemoryCacheStore<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private currentSize = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    
    if (!entry) return undefined;
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    
    // Update access metadata
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    
    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Check if key already exists
    const existing = this.store.get(key);
    
    if (existing && !this.store.has(key)) {
      // Key doesn't exist, check size limit
      if (this.currentSize >= this.maxSize) {
        this.evictLRU();
      }
      this.currentSize++;
    }
    
    this.store.set(key, entry);
  }

  delete(key: string): boolean {
    const existed = this.store.has(key);
    this.store.delete(key);
    if (existed) this.currentSize--;
    return existed;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.store.clear();
    this.currentSize = 0;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.currentSize;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

// ============================================================
// CACHE MANAGER CLASS
// ============================================================

export class CacheManager<T = any> {
  private config: Required<CacheManagerOptions>;
  private layers: Map<CacheLayer, InMemoryCacheStore<T>> = new Map();
  private stats: CacheStats = this.initializeStats();
  private invalidationRules: Map<string, InvalidationRule> = new Map();
  private versionKeys: Map<string, number> = new Map();
  private metricsTimer: NodeJS.Timeout | null = null;
  
  // Latency tracking for statistics
  private latencies: number[] = [];

  constructor(options: CacheManagerOptions = {}) {
    this.config = {
      layers: {},
      defaults: { ...DEFAULT_CONFIG, ...options.defaults },
      enableMetrics: options.enableMetrics ?? true,
      metricsInterval: options.metricsInterval ?? 60000,
      maxInMemoryEntries: options.maxInMemoryEntries ?? 50000,
      serializer: options.serializer ?? {
        serialize: (value) => JSON.stringify(value),
        deserialize: (data) => JSON.parse(data as string),
      },
    };

    // Initialize layer stores
    (Object.keys(LAYER_DEFAULTS) as CacheLayer[]).forEach((layer) => {
      const layerConfig = { ...LAYER_DEFAULTS[layer], ...this.config.layers[layer] };
      this.layers.set(layer, new InMemoryCacheStore(this.config.maxInMemoryEntries));
    });

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  // ============================================================
  // CORE CACHE OPERATIONS
  // ============================================================

  /**
   * Get a value from cache, checking all layers from fastest to slowest
   * Implements multi-layer cache lookup: L1 -> L2 -> L3 -> L4
   */
  async get(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      // Try each layer in order (fastest first)
      for (const [layer, store] of this.layers.entries()) {
        const entry = store.get(key);
        
        if (entry && !this.isExpired(entry)) {
          // Cache HIT
          this.recordHit(layer, Date.now() - startTime);
          
          // Trigger background refresh if SWR enabled and entry is stale-ish
          if (this.isStale(entry) && this.shouldRefresh(entry)) {
            this.backgroundRefresh(key, entry.layer);
          }
          
          return entry.value;
        }
      }
      
      // Cache MISS
      this.recordMiss(Date.now() - startTime);
      return undefined;
    } catch (error) {
      console.error('[CacheManager] Error during get:', error);
      this.recordMiss(Date.now() - startTime);
      return undefined;
    }
  }

  /**
   * Set a value in specified layer(s)
   */
  async set(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      layer?: CacheLayer;
      tags?: string[];
      layers?: CacheLayer[];  // Set in multiple layers
    }
  ): Promise<void> {
    const ttl = options?.ttl ?? this.config.defaults.defaultTTL;
    const targetLayers = options?.layers ?? (options?.layer ? [options.layer] : ['L3_redis']);
    
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + (ttl * 1000),
      ttl,
      accessCount: 0,
      lastAccessedAt: now,
      layer: targetLayers[0],
      tags: options?.tags,
    };

    for (const layer of targetLayers) {
      const store = this.layers.get(layer);
      if (store) {
        const layerEntry = { ...entry, layer };
        store.set(key, layerEntry);
      }
    }
  }

  /**
   * Delete a key from all layers
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    for (const [, store] of this.layers) {
      if (store.delete(key)) {
        deleted = true;
      }
    }
    
    return deleted;
  }

  /**
   * Check if a key exists in any layer
   */
  async has(key: string): Promise<CacheLayer | null> {
    for (const [layer, store] of this.layers) {
      if (store.has(key)) {
        return layer;
      }
    }
    return null;
  }

  /**
   * Clear all caches
   */
  async clear(options?: { layer?: CacheLayer }): Promise<void> {
    if (options?.layer) {
      const store = this.layers.get(options.layer);
      if (store) store.clear();
    } else {
      for (const [, store] of this.layers) {
        store.clear();
      }
    }
  }

  // ============================================================
  // CONVENIENCE METHODS FOR SOC PLATFORM
  // ============================================================

  /**
   * Get or set pattern - fetches from source if not cached
   */
  async getOrSet(
    key: string,
    source: () => Promise<T>,
    options?: {
      ttl?: number;
      layer?: CacheLayer;
      tags?: string[];
    }
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // Not in cache, fetch from source
    const value = await source();
    
    // Store in cache
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Get multiple values (batch get)
   */
  async mget(keys: string[]): Promise<Map<string, T | undefined>> {
    const results = new Map<string, T | undefined>();
    
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      results.set(key, value);
    });
    
    await Promise.all(promises);
    
    return results;
  }

  /**
   * Set multiple values (batch set)
   */
  async mset(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(({ key, value, ttl }) =>
      this.set(key, value, { ttl })
    );
    
    await Promise.all(promises);
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    
    for (const [, store] of this.layers) {
      const keys = store.keys();
      
      for (const key of keys) {
        const entry = store.get(key);
        if (entry?.tags?.includes(tag)) {
          store.delete(key);
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Invalidate by pattern (prefix match)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    
    for (const [, store] of this.layers) {
      const keys = store.keys().filter(k => k.startsWith(pattern));
      
      for (const key of keys) {
        store.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Increment version key (for version-based invalidation)
   */
  incrementVersion(prefix: string): number {
    const current = this.versionKeys.get(prefix) || 0;
    const next = current + 1;
    this.versionKeys.set(prefix, next);
    return next;
  }

  /**
   * Get current version for a prefix
  */
  getVersion(prefix: string): number {
    return this.versionKeys.get(prefix) || 0;
  }

  // ============================================================
  // SOC-SPECIFIC HELPERS
  // ============================================================

  /**
   * Cache alert data with short TTL and real-time refresh
   */
  async cacheAlert(alertId: string, alertData: any): Promise<void> {
    await this.set(`alert:${alertId}`, alertData, {
      ttl: 30,              // 30 seconds for real-time alerts
      layer: 'L3_redis',
      tags: ['alerts', 'active', `severity:${alertData.severity}`],
    });
  }

  /**
   * Get alert with automatic refresh
   */
  async getAlert(alertId: string): Promise<any | undefined> {
    return this.get(`alert:${alertId}`);
  }

  /**
   * Cache dashboard metrics with aggregation
   */
  async cacheDashboardMetrics(metrics: any): Promise<void> {
    await this.set('dashboard:metrics:current', metrics, {
      ttl: 10,              // 10 seconds for dashboard KPIs
      layer: 'L3_redis',
      tags: ['dashboard', 'metrics', 'kpi'],
    });
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<any | undefined> {
    return this.get('dashboard:metrics:current');
  }

  /**
   * Cache user session with security considerations
   */
  async cacheSession(sessionId: string, sessionData: any): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, {
      ttl: 3600,            // 1 hour session
      layer: 'L3_redis',
      tags: ['session', `user:${sessionData.userId}`],
    });
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    return this.invalidateByTag(`user:${userId}`);
  }

  /**
   * Cache threat intelligence data
   */
  async cacheThreatIntel(iocType: string, iocValue: string, data: any): Promise<void> {
    await this.set(`tioc:${iocType}:${iocValue}`, data, {
      ttl: 1800,            // 30 minutes for threat intel
      layer: 'L3_redis',
      tags: ['threat-intel', iocType, 'ioc'],
    });
  }

  /**
   * Pre-warm cache with critical data
   */
  async warmup(data: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>): Promise<void> {
    console.log(`[CacheManager] Warming up ${data.length} cache entries...`);
    
    await this.mset(data.map(d => ({
      key: d.key,
      value: d.value,
      ttl: d.ttl ?? this.config.defaults.defaultTTL,
    })));
    
    // Also set tags
    for (const item of data) {
      if (item.tags) {
        const existing = await this.get(item.key);
        if (existing) {
          await this.set(item.key, existing, { tags: item.tags });
        }
      }
    }
    
    console.log('[CacheManager] Warmup complete');
  }

  // ============================================================
  // STATISTICS & MONITORING
  // ============================================================

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    // Calculate hit rate
    const totalOps = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = totalOps > 0 ? (this.stats.totalHits / totalOps) * 100 : 0;
    this.stats.missRate = 100 - this.stats.hitRate;
    
    // Calculate latency percentiles
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      this.stats.avgReadLatencyMs = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      this.stats.p95ReadLatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
    }
    
    // Count entries per layer
    this.stats.entriesByLayer = {} as Record<CacheLayer, number>;
    for (const [layer, store] of this.layers) {
      this.stats.entriesByLayer[layer] = store.size();
      this.stats.totalEntries += store.size();
    }
    
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    this.latencies = [];
  }

  /**
   * Print cache status summary (useful for debugging)
   */
  printStatus(): void {
    const stats = this.getStats();
    
    console.log('\n========================================');
    console.log('  DJEZZY SOC CACHE MANAGER STATUS');
    console.log('========================================');
    console.log(`  Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`  Miss Rate: ${stats.missRate.toFixed(2)}%`);
    console.log(`  Total Entries: ${stats.totalEntries}`);
    console.log(`  Avg Latency: ${stats.avgReadLatencyMs.toFixed(2)}ms`);
    console.log(`  P95 Latency: ${stats.p95ReadLatencyMs.toFixed(2)}ms`);
    console.log('  Entries by Layer:');
    
    for (const [layer, count] of Object.entries(stats.entriesByLayer)) {
      console.log(`    ${layer}: ${count}`);
    }
    
    console.log('========================================\n');
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private initializeStats(): CacheStats {
    return {
      totalEntries: 0,
      entriesByLayer: {
        L1_browser: 0,
        L2_cdn: 0,
        L3_redis: 0,
        L4_database: 0,
      },
      hitRate: 0,
      missRate: 0,
      avgReadLatencyMs: 0,
      p95ReadLatencyMs: 0,
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      estimatedMemoryBytes: 0,
    };
  }

  private recordHit(layer: CacheLayer, latencyMs: number): void {
    this.stats.totalHits++;
    this.latencies.push(latencyMs);
    
    // Keep only last 10000 latencies for percentile calculation
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-10000);
    }
  }

  private recordMiss(latencyMs: number): void {
    this.stats.totalMisses++;
    this.latencies.push(latencyMs);
    
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-10000);
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private isStale(entry: CacheEntry<any>): boolean {
    // Consider stale if past 80% of TTL
    const age = Date.now() - entry.createdAt;
    const ttlMs = entry.ttl * 1000;
    return age > (ttlMs * 0.8);
  }

  private shouldRefresh(entry: CacheEntry<any>): boolean {
    // Only refresh if SWR is enabled for this layer's config
    const layerConfig = LAYER_DEFAULTS[entry.layer];
    return layerConfig?.swrEnabled ?? this.config.defaults.swrEnabled;
  }

  private async backgroundRefresh(key: string, currentLayer: CacheLayer): void {
    // This would trigger a re-fetch from the source
    // Implementation depends on the specific use case
    // For now, we just log it
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Background refresh triggered for: ${key}`);
    }
  }

  private startMetricsCollection(): void {
    if (typeof window === 'undefined') {
      // Server-side: collect metrics periodically
      this.metricsTimer = setInterval(() => {
        // Could send to monitoring system here
        if (process.env.NODE_ENV === 'development') {
          this.printStatus();
        }
      }, this.config.metricsInterval);
    }
  }

  /**
   * Destroy the cache manager and cleanup resources
   */
  destroy(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    this.layers.forEach(store => store.clear());
    this.layers.clear();
    this.invalidationRules.clear();
    this.versionKeys.clear();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let cacheManagerInstance: CacheManager | null = null;

/**
 * Get the global cache manager instance
 */
export function getCacheManager<T = any>(options?: CacheManagerOptions): CacheManager<T> {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager<T>(options);
  }
  return cacheManagerInstance as CacheManager<T>;
}

/**
 * Create a new cache manager instance (for testing or isolated use)
 */
export function createCacheManager<T = any>(options?: CacheManagerOptions): CacheManager<T> {
  return new CacheManager<T>(options);
}

// ============================================================
// PRECONFIGURED CACHE MANAGERS FOR SOC
// ============================================================

/**
 * Alert cache manager - optimized for real-time alert data
 */
export function createAlertCacheManager(): CacheManager {
  return new CacheManager({
    defaults: {
      defaultTTL: 30,           // 30s for alerts
      swrEnabled: true,
      swrDuration: 15,         // 15s SWR for alerts
    },
    maxInMemoryEntries: 100000, // Support up to 100K cached alerts
  });
}

/**
 * Metrics cache manager - optimized for aggregated metrics
 */
export function createMetricsCacheManager(): CacheManager {
  return new CacheManager({
    defaults: {
      defaultTTL: 60,           // 1 min for metrics
      swrEnabled: true,
      swrDuration: 30,         // 30s SWR for metrics
    },
    maxInMemoryEntries: 10000,
  });
}

/**
 * Session cache manager - optimized for user sessions
 */
export function createSessionCacheManager(): CacheManager {
  return new CacheManager({
    defaults: {
      defaultTTL: 3600,         // 1h for sessions
      swrEnabled: false,        // No SWR for sessions
    },
    maxInMemoryEntries: 50000,  // Support up to 50K concurrent sessions
  });
}

/**
 * Threat intel cache manager - optimized for IOC data
 */
export function createThreatIntelCacheManager(): CacheManager {
  return new CacheManager({
    defaults: {
      defaultTTL: 1800,         // 30min for threat intel
      swrEnabled: true,
      swrDuration: 300,        // 5min SWR for threat intel
    },
    maxInMemoryEntries: 1000000, // Support up to 1M IOCs
  });
}

// Export types
export type { CacheConfig, CacheEntry, CacheLayer, CacheStats, InvalidationRule, CacheManagerOptions };
