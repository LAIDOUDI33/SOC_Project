/**
 * Djezzy SOC Platform - Memory Usage Optimization
 * 
 * Memory management utilities for long-running processes:
 * - Memory monitoring and alerts
 * - Cache size limits
 * - Garbage collection hints
 * - Memory leak detection
 * - Object pool for frequently created/destroyed objects
 */

// ============================================================
// TYPES
// ============================================================

interface MemoryConfig {
  /** Warning threshold (percentage of heap) */
  warningThreshold: number;
  /** Critical threshold (percentage of heap) */
  criticalThreshold: number;
  /** Maximum cache size in MB */
  maxCacheSizeMB: number;
  /** Enable automatic GC hints */
  autoGC: boolean;
  /** Memory check interval (ms) */
  checkIntervalMs: number;
  /** Enable memory leak detection */
  leakDetection: boolean;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapUsagePercent: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

interface MemoryStats {
  snapshots: MemorySnapshot[];
  peakHeapUsed: number;
  currentHeapUsed: number;
  averageHeapUsed: number;
  growthRate: number; // MB per minute
  isHealthy: boolean;
  warnings: string[];
}

interface ObjectPoolOptions<T> {
  /** Factory function to create new objects */
  create: () => T;
  /** Reset function to clean objects before reuse */
  reset?: (obj: T) => void;
  /** Maximum objects to keep in pool */
  maxSize: number;
  /** Initial pool size */
  initialSize?: number;
  /** Validate object before reuse */
  validate?: (obj: T) => boolean;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  warningThreshold: 70,    // Warn at 70% heap usage
  criticalThreshold: 85,   // Critical at 85%
  maxCacheSizeMB: 256,     // Max 256MB for caches
  autoGC: true,
  checkIntervalMs: 30000,  // Check every 30 seconds
  leakDetection: true,
};

// ============================================================
// MEMORY MONITOR CLASS
// ============================================================

export class MemoryManager {
  private config: MemoryConfig;
  private stats: MemoryStats = this.initializeStats();
  private monitorInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(stats: MemoryStats) => void> = [];
  private gcCount = 0;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    
    if (typeof process !== 'undefined') {
      this.startMonitoring();
    }
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    this.captureSnapshot();
    return { ...this.stats };
  }

  /**
   * Get current memory usage snapshot
   */
  getMemoryUsage(): NodeJS.MemoryUsage | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  /**
   * Request garbage collection if available
   */
  forceGC(): void {
    if (typeof global !== 'undefined' && (global as any).gc) {
      try {
        (global as any).gc();
        this.gcCount++;
        console.log(`[Memory] Forced GC (#${this.gcCount})`);
      } catch (error) {
        console.warn('[Memory] GC not available. Run with --expose-gc flag.');
      }
    } else {
      console.warn('[Memory] GC not exposed. Start Node.js with --expose-gc');
    }
  }

  /**
   * Subscribe to memory stats updates
   */
  onStatsUpdate(listener: (stats: MemoryStats) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * Check if memory is healthy
   */
  isHealthy(): boolean {
    const usage = this.getMemoryUsage();
    if (!usage) return true;

    const percentUsed = (usage.heapUsed / usage.heapTotal) * 100;
    return percentUsed < this.config.criticalThreshold;
  }

  /**
   * Destroy monitor
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners = [];
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private initializeStats(): MemoryStats {
    return {
      snapshots: [],
      peakHeapUsed: 0,
      currentHeapUsed: 0,
      averageHeapUsed: 0,
      growthRate: 0,
      isHealthy: true,
      warnings: [],
    };
  }

  private startMonitoring(): void {
    // Capture initial snapshot
    this.captureSnapshot();

    // Set up interval monitoring
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.checkIntervalMs);

    // Don't prevent process exit
    if (this.monitorInterval.unref) {
      this.monitorInterval.unref();
    }
  }

  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private captureSnapshot(): MemorySnapshot {
    const usage = this.getMemoryUsage();
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: usage?.heapUsed ?? 0,
      heapTotal: usage?.heapTotal ?? 0,
      heapUsagePercent: usage ? (usage.heapUsed / usage.heapTotal) * 100 : 0,
      rss: usage?.rss ?? 0,
      external: usage?.external ?? 0,
      arrayBuffers: usage?.arrayBuffers ?? 0,
    };

    // Update stats
    this.stats.currentHeapUsed = snapshot.heapUsed;
    
    if (snapshot.heapUsed > this.stats.peakHeapUsed) {
      this.stats.peakHeapUsed = snapshot.heapUsed;
    }

    // Keep limited history (last 60 snapshots)
    this.stats.snapshots.push(snapshot);
    if (this.stats.snapshots.length > 60) {
      this.stats.snapshots.shift();
    }

    // Calculate average
    const sum = this.stats.snapshots.reduce((acc, s) => acc + s.heapUsed, 0);
    this.stats.averageHeapUsed = sum / this.stats.snapshots.length;

    // Calculate growth rate (compare first and last)
    if (this.stats.snapshots.length >= 2) {
      const first = this.stats.snapshots[0];
      const last = this.stats.snapshots[this.stats.snapshots.length - 1];
      const timeDiffMin = (last.timestamp - first.timestamp) / 60000;
      const memDiffMB = (last.heapUsed - first.heapUsed) / (1024 * 1024);
      
      this.stats.growthRate = timeDiffMin > 0 ? memDiffMB / timeDiffMin : 0;
    }

    return snapshot;
  }

  private checkMemory(): void {
    const snapshot = this.captureSnapshot();
    this.stats.warnings = [];

    // Check thresholds
    if (snapshot.heapUsagePercent > this.config.criticalThreshold) {
      this.stats.isHealthy = false;
      this.stats.warnings.push(
        `CRITICAL: Heap usage at ${snapshot.heapUsagePercent.toFixed(1)}%`
      );
      
      // Force GC on critical
      if (this.config.autoGC) {
        this.forceGC();
      }
    } else if (snapshot.heapUsagePercent > this.config.warningThreshold) {
      this.stats.warnings.push(
        `WARNING: Heap usage at ${snapshot.heapUsagePercent.toFixed(1)}%`
      );
      
      // Suggest GC on warning
      if (this.config.autoGC && snapshot.heapUsagePercent > 80) {
        this.forceGC();
      }
    } else {
      this.stats.isHealthy = true;
    }

    // Check for potential memory leaks
    if (this.config.leakDetection && this.detectPotentialLeak()) {
      this.stats.warnings.push(
        'WARNING: Potential memory leak detected (consistent growth)'
      );
    }

    // Notify listeners
    if (this.listeners.length > 0) {
      const statsCopy = { ...this.stats };
      this.listeners.forEach(listener => {
        try {
          listener(statsCopy);
        } catch (e) {
          console.error('[Memory] Listener error:', e);
        }
      });
    }
  }

  private detectPotentialLeak(): boolean {
    if (this.stats.snapshots.length < 10) return false;

    // Check consistent growth over last few snapshots
    const recentSnapshots = this.stats.snapshots.slice(-10);
    let growingCount = 0;

    for (let i = 1; i < recentSnapshots.length; i++) {
      if (recentSnapshots[i].heapUsed > recentSnapshots[i - 1].heapUsed) {
        growingCount++;
      }
    }

    // If growing consistently with significant increase
    const growthRatio = growingCount / (recentSnapshots.length - 1);
    const totalGrowth = 
      recentSnapshots[recentSnapshots.length - 1].heapUsed -
      recentSnapshots[0].heapUsed;
    
    const significantGrowth = totalGrowth > 50 * 1024 * 1024; // >50MB

    return growthRatio > 0.8 && significantGrowth;
  }
}

// ============================================================
// OBJECT POOL FOR FREQUENTLY USED OBJECTS
// ============================================================

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private validateFn?: (obj: T) => boolean;
  private maxSize: number;
  private stats = { created: 0, reused: 0, destroyed: 0 };

  constructor(options: ObjectPoolOptions<T>) {
    this.createFn = options.create;
    this.resetFn = options.reset;
    this.validateFn = options.validate;
    this.maxSize = options.maxSize;

    // Pre-populate pool
    if (options.initialSize) {
      for (let i = 0; i < Math.min(options.initialSize, options.maxSize); i++) {
        this.pool.push(this.createFn());
        this.stats.created++;
      }
    }
  }

  /**
   * Acquire an object from the pool or create new one
   */
  acquire(): T {
    while (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      
      // Validate if validator provided
      if (this.validateFn) {
        try {
          if (!this.validateFn(obj)) {
            continue; // Skip invalid object
          }
        } catch {
          continue;
        }
      }

      this.stats.reused++;
      return obj;
    }

    // Create new object
    this.stats.created++;
    return this.createFn();
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      // Pool full, discard object
      this.stats.destroyed++;
      return;
    }

    // Reset object state if reset function provided
    if (this.resetFn) {
      try {
        this.resetFn(obj);
      } catch (error) {
        console.warn('[ObjectPool] Reset error:', error);
        this.stats.destroyed++;
        return;
      }
    }

    this.pool.push(obj);
  }

  /**
   * Execute a function with pooled object (auto-release)
   */
  async execute<R>(fn: (obj: T) => Promise<R>): Promise<R> {
    const obj = this.acquire();
    
    try {
      return await fn(obj);
    } finally {
      this.release(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      utilizationRate: this.stats.created > 0 
        ? this.stats.reused / this.stats.created 
        : 0,
    };
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * Get current pool size
   */
  get size(): number {
    return this.pool.length;
  }
}

// ============================================================
// CACHE SIZE MANAGER
// ============================================================

class CacheSizeManager {
  private maxSizeBytes: number;
  private currentSizeBytes = 0;
  private entries: Map<string, { size: number; lastAccess: number }> = new Map();

  constructor(maxSizeMB: number) {
    this.maxSizeBytes = maxSizeMB * 1024 * 1024;
  }

  /**
   * Register a cached item's size
   */
  register(key: string, sizeBytes: number): boolean {
    // Check if adding would exceed limit
    if (this.currentSizeBytes + sizeBytes > this.maxSizeBytes) {
      // Try to evict old items
      this.evict(sizeBytes);
      
      // Still over limit?
      if (this.currentSizeBytes + sizeBytes > this.maxSizeBytes) {
        return false;
      }
    }

    // Remove existing entry if present
    if (this.entries.has(key)) {
      const existing = this.entries.get(key)!;
      this.currentSizeBytes -= existing.size;
    }

    this.entries.set(key, { size: sizeBytes, lastAccess: Date.now() });
    this.currentSizeBytes += sizeBytes;

    return true;
  }

  /**
   * Unregister a cached item
   */
  unregister(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      this.currentSizeBytes -= entry.size;
      this.entries.delete(key);
    }
  }

  /**
   * Update access time (for LRU eviction)
   */
  touch(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      entry.lastAccess = Date.now();
    }
  }

  /**
   * Get current cache size info
   */
  getSizeInfo(): { usedBytes: number; maxBytes: number; entryCount: number } {
    return {
      usedBytes: this.currentSizeBytes,
      maxBytes: this.maxSizeBytes,
      entryCount: this.entries.size,
    };
  }

  /**
   * Evict oldest items to free space
   */
  private evict(neededBytes: number): void {
    // Sort by last access time
    const sorted = Array.from(this.entries.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    let freed = 0;
    for (const [key, entry] of sorted) {
      if (freed >= neededBytes) break;
      
      this.currentSizeBytes -= entry.size;
      this.entries.delete(key);
      freed += entry.size;
    }
  }
}

// ============================================================
// SINGLETON EXPORTS
// ============================================================

let memoryManagerInstance: MemoryManager | null = null;
let cacheSizeManager: CacheSizeManager | null = null;

/**
 * Get global memory manager instance
 */
export function getMemoryManager(config?: Partial<MemoryConfig>): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager(config);
  }
  return memoryManagerInstance;
}

/**
 * Get cache size manager instance
 */
export function getCacheSizeManager(maxSizeMB: number = 256): CacheSizeManager {
  if (!cacheSizeManager) {
    cacheSizeManager = new CacheSizeManager(maxSizeMB);
  }
  return cacheSizeManager;
}

// Export types
export type { MemoryConfig, MemoryStats, MemorySnapshot, ObjectPoolOptions };
