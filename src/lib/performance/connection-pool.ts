/**
 * Djezzy SOC Platform - Database Connection Pool Manager
 * 
 * Optimized connection pooling for high-concurrency database access:
 * - Automatic pool sizing based on load
 * - Health checks and connection validation
 * - Connection timeout and retry logic
 * - Metrics collection for monitoring
 */

import { PrismaClient } from '@prisma/client';

// ============================================================
// TYPES
// ============================================================

interface PoolConfig {
  /** Maximum connections in pool */
  maxConnections: number;
  /** Minimum connections to keep alive */
  minConnections: number;
  /** Connection acquisition timeout (ms) */
  acquireTimeoutMs: number;
  /** Idle connection timeout before removal (ms) */
  idleTimeoutMs: number;
  /** Max lifetime of a connection (ms) */
  maxLifetimeMs: number;
  /** Health check interval (ms) */
  healthCheckIntervalMs: number;
  /** Enable connection retry on failure */
  retryOnFailure: boolean;
  /** Max retry attempts */
  maxRetries: number;
  /** Retry delay (ms) */
  retryDelayMs: number;
}

interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  totalCreated: number;
  totalDestroyed: number;
  waitCount: number;
  averageWaitTimeMs: number;
  lastError: Error | null;
  lastHealthCheck: Date | null;
  isHealthy: boolean;
}

interface ConnectionWrapper<T> {
  id: string;
  connection: T;
  createdAt: Date;
  lastUsedAt: Date;
  isHealthy: boolean;
  inUse: boolean;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_POOL_CONFIG: PoolConfig = {
  // For PostgreSQL with pgbouncer, we can have more connections
  // Formula: (CPU cores * 2) + effective_spindle_count
  maxConnections: 20,
  minConnections: 5,
  
  // Timeouts
  acquireTimeoutMs: 5000,      // 5 seconds to get a connection
  idleTimeoutMs: 300000,      // Remove idle after 5 minutes
  maxLifetimeMs: 3600000,      // Recreate connections after 1 hour
  
  // Health checking
  healthCheckIntervalMs: 30000, // Check every 30 seconds
  
  // Retry configuration
  retryOnFailure: true,
  maxRetries: 3,
  retryDelayMs: 200,
};

// ============================================================
// CONNECTION POOL CLASS
// ============================================================

export class ConnectionPoolManager<T = PrismaClient> {
  private config: PoolConfig;
  private pool: Map<string, ConnectionWrapper<T>> = new Map();
  private availableConnections: string[] = [];
  private stats: PoolStats = this.initializeStats();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private createConnectionFn: () => Promise<T>;
  private destroyConnectionFn?: (conn: T) => Promise<void>;
  private healthCheckFn?: (conn: T) => Promise<boolean>;

  constructor(
    createConnection: () => Promise<T>,
    options: Partial<PoolConfig> = {},
    destroyConnection?: (conn: T) => Promise<void>,
    healthCheck?: (conn: T) => Promise<boolean>
  ) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...options };
    this.createConnectionFn = createConnection;
    this.destroyConnectionFn = destroyConnection;
    this.healthCheckFn = healthCheck;

    // Start health check interval
    this.startHealthChecks();

    // Pre-warm with minimum connections
    this.warmPool();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(options?: { timeout?: number }): Promise<T> {
    const startTime = Date.now();
    const timeout = options?.timeout || this.config.acquireTimeoutMs;

    // Try to get an available connection
    let wrapper = this.getAvailableConnection();

    if (!wrapper) {
      // No available connection, try to create new one
      if (this.pool.size < this.config.maxConnections) {
        try {
          wrapper = await this.createNewConnection();
        } catch (error) {
          // Failed to create, wait for available
          console.warn('[ConnectionPool] Failed to create new connection:', error);
        }
      }

      if (!wrapper) {
        // Wait for a connection to become available
        wrapper = await this.waitForConnection(timeout);
      }
    }

    if (!wrapper) {
      throw new Error(`Connection acquisition timed out after ${timeout}ms`);
    }

    wrapper.inUse = true;
    wrapper.lastUsedAt = new Date();
    
    this.stats.activeConnections++;
    
    const waitTime = Date.now() - startTime;
    this.updateWaitStats(waitTime);

    return wrapper.connection;
  }

  /**
   * Release a connection back to the pool
   */
  async release(connection: T): Promise<void> {
    let wrapper: ConnectionWrapper<T> | undefined;

    for (const [id, w] of this.pool.entries()) {
      if (w.connection === connection) {
        wrapper = w;
        break;
      }
    }

    if (!wrapper) {
      console.warn('[ConnectionPool] Attempted to release unknown connection');
      return;
    }

    wrapper.inUse = false;
    wrapper.lastUsedAt = new Date();
    this.stats.activeConnections--;

    // Check if connection should be destroyed (max lifetime)
    const age = Date.now() - wrapper.createdAt.getTime();
    if (age > this.config.maxLifetimeMs) {
      await this.destroyConnection(wrapper.id);
    }
  }

  /**
   * Execute a function with an automatically managed connection
   */
  async execute<R>(
    fn: (connection: T) => Promise<R>,
    options?: { retries?: number; timeout?: number }
  ): Promise<R> {
    const maxRetries = options?.retries ?? (this.config.retryOnFailure ? this.config.maxRetries : 0);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let connection: T;
      
      try {
        connection = await this.acquire(options);
        const result = await fn(connection);
        await this.release(connection);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Execution failed');
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Get pool size information
   */
  getSize(): { total: number; active: number; idle: number } {
    let active = 0;
    let idle = 0;

    for (const wrapper of this.pool.values()) {
      if (wrapper.inUse) active++;
      else idle++;
    }

    return { total: this.pool.size, active, idle };
  }

  /**
   * Drain all connections (for graceful shutdown)
   */
  async drain(): Promise<void> {
    this.stopHealthChecks();

    const destroyPromises: Promise<void>[] = [];
    
    for (const [id] of this.pool.entries()) {
      destroyPromises.push(this.destroyConnection(id));
    }

    await Promise.allSettled(destroyPromises);
    this.pool.clear();
    this.availableConnections = [];
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private initializeStats(): PoolStats {
    return {
      activeConnections: 0,
      idleConnections: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      waitCount: 0,
      averageWaitTimeMs: 0,
      lastError: null,
      lastHealthCheck: null,
      isHealthy: true,
    };
  }

  private async warmPool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        await this.createNewConnection();
      } catch (error) {
        console.error('[ConnectionPool] Failed to warm pool:', error);
        break;
      }
    }
  }

  private getAvailableConnection(): ConnectionWrapper<T> | undefined {
    while (this.availableConnections.length > 0) {
      const id = this.availableConnections.shift()!;
      const wrapper = this.pool.get(id);

      if (wrapper && !wrapper.inUse && wrapper.isHealthy) {
        // Check if idle too long
        const idleTime = Date.now() - wrapper.lastUsedAt.getTime();
        if (idleTime > this.config.idleTimeoutMs) {
          this.destroyConnection(id);
          continue;
        }

        return wrapper;
      }
    }

    return undefined;
  }

  private async createNewConnection(): Promise<ConnectionWrapper<T>> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection = await this.createConnectionFn();
    
    const wrapper: ConnectionWrapper<T> = {
      id,
      connection,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isHealthy: true,
      inUse: false,
    };

    this.pool.set(id, wrapper);
    this.stats.totalCreated++;
    this.stats.idleConnections++;

    return wrapper;
  }

  private async destroyConnection(id: string): Promise<void> {
    const wrapper = this.pool.get(id);
    
    if (wrapper) {
      if (this.destroyConnectionFn && !wrapper.inUse) {
        try {
          await this.destroyConnectionFn(wrapper.connection);
        } catch (error) {
          console.error('[ConnectionPool] Error destroying connection:', error);
        }
      }

      this.pool.delete(id);
      
      // Remove from available list
      const idx = this.availableConnections.indexOf(id);
      if (idx > -1) {
        this.availableConnections.splice(idx, 1);
      }

      this.stats.totalDestroyed++;
      this.stats.idleConnections--;
    }
  }

  private async waitForConnection(timeout: number): Promise<ConnectionWrapper<T> | undefined> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const wrapper = this.getAvailableConnection();
      if (wrapper) return wrapper;

      // Small delay to prevent busy waiting
      await this.delay(50);
      this.stats.waitCount++;
    }

    return undefined;
  }

  private startHealthChecks(): void {
    if (typeof window !== 'undefined') return; // Not needed in browser

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    this.stats.lastHealthCheck = new Date();
    let allHealthy = true;

    if (this.healthCheckFn) {
      for (const [id, wrapper] of this.pool.entries()) {
        try {
          wrapper.isHealthy = await this.healthCheckFn(wrapper.connection);
          
          if (!wrapper.isHealthy) {
            allHealthy = false;
            console.warn(`[ConnectionPool] Unhealthy connection detected: ${id}`);
            
            // Schedule replacement if not in use
            if (!wrapper.inUse) {
              this.destroyConnection(id);
              try {
                await this.createNewConnection();
              } catch (e) {
                console.error('[ConnectionPool] Failed to replace unhealthy connection');
              }
            }
          }
        } catch (error) {
          wrapper.isHealthy = false;
          allHealthy = false;
        }
      }
    }

    this.stats.isHealthy = allHealthy;
  }

  private updateWaitStats(waitTime: number): void {
    this.stats.waitCount++;
    
    // Running average
    const alpha = 0.1; // Smoothing factor
    this.stats.averageWaitTimeMs = 
      this.stats.averageWaitTimeMs * (1 - alpha) + waitTime * alpha;
  }

  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Authentication errors, permission errors, etc.
      const nonRetryablePatterns = [
        /authentication/i,
        /authorization/i,
        /permission denied/i,
        /invalid/i,
        /not found/i,
      ];
      
      return nonRetryablePatterns.some(p => p.test(error.message));
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// PRISMA POOL SINGLETON
// ============================================================

let prismaPool: ConnectionPoolManager<PrismaClient> | null = null;

/**
 * Get or create the Prisma client connection pool
 */
export function getPrismaPool(
  options?: Partial<PoolConfig>
): ConnectionPoolManager<PrismaClient> {
  if (!prismaPool) {
    prismaPool = new ConnectionPoolManager<PrismaClient>(
      () => import('@/lib/db').then(({ db }) => db),
      options,
      // Prisma doesn't need explicit destroy - just disconnect
      async (prisma) => {
        await prisma.$disconnect();
      },
      // Health check - run simple query
      async (prisma) => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return true;
        } catch {
          return false;
        }
      }
    );
  }

  return prismaPool;
}

/**
 * Execute a Prisma query with automatic connection management
 */
export async function withPrisma<R>(
  fn: (prisma: PrismaClient) => Promise<R>,
  options?: { retries?: number }
): Promise<R> {
  const pool = getPrismaPool();
  return pool.execute(fn, options);
}

// Export types
export type { PoolConfig, PoolStats, ConnectionWrapper };
