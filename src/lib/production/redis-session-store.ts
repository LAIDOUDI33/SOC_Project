/**
 * Djezzy National SOC Platform - Redis-Backed Hunt Session State Manager
 * 
 * Production-ready session state store for threat hunting operations.
 * Replaces the in-memory Map used in threat-hunting/sessions/route.ts
 * 
 * Features:
 * - Redis-backed storage with automatic fallback to in-memory Map
 * - TTL-based automatic cleanup of stale sessions
 * - Connection health check and reconnection logic
 * - Distributed session sharing across multiple instances
 * - Graceful degradation when Redis unavailable (development mode)
 * 
 * ANRT Compliance:
 * - All session data stored within Algeria (on-premise Redis)
 * - Automatic cleanup prevents data accumulation
 * - Audit logging for session operations
 * 
 * @module lib/production/redis-session-store
 * @version 1.0.0
 */

import Redis from 'ioredis';
import { redisClient, getRedis, safeRedisCommand, RedisHealthStatus } from '@/lib/cache/redis-client';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Hunt Session State Interface
 * Matches the interface used in threat-hunting/sessions/route.ts
 */
export interface HuntSessionState {
  /** Unique session identifier */
  id: string;
  /** Current session status (DRAFT, RUNNING, PAUSED, COMPLETED, CANCELLED) */
  status: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Total results found so far */
  totalResults: number;
  /** Timestamp of last activity */
  lastActivity: Date;
  /** When the session was started */
  startTime?: Date;
  /** When the session was completed */
  completedAt?: Date;
}

/** Configuration options for the RedisSessionStore */
export interface RedisSessionStoreConfig {
  /** Redis key prefix for hunt sessions (default: 'hunt:session') */
  keyPrefix?: string;
  /** Default TTL in seconds for sessions (default: 1800 = 30 minutes) */
  defaultTTLSeconds?: number;
  /** Enable debug logging */
  enableDebugLogging?: boolean;
  /** Maximum number of sessions to keep in memory fallback */
  maxMemorySessions?: number;
  /** Cleanup interval in milliseconds (default: 300000 = 5 minutes) */
  cleanupIntervalMs?: number;
}

/** Health status of the session store */
export interface SessionStoreHealthStatus {
  /** Whether the store is operational */
  healthy: boolean;
  /** Storage mode being used */
  mode: 'redis' | 'memory' | 'degraded';
  /** Number of active sessions */
  sessionCount: number;
  /** Redis health status (if using Redis) */
  redisStatus?: RedisHealthStatus;
  /** Memory usage stats (if using memory fallback) */
  memoryStats?: {
    usedSlots: number;
    maxSlots: number;
    usagePercent: number;
  };
  /** Timestamp of health check */
  checkedAt: Date;
  /** Error message if unhealthy */
  error?: string;
}

// ============================================================================
// Constants and Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<RedisSessionStoreConfig, 'enableDebugLogging'>> = {
  keyPrefix: 'hunt:session',
  defaultTTLSeconds: 1800, // 30 minutes
  maxMemorySessions: 10000,
  cleanupIntervalMs: 300000, // 5 minutes
};

// ============================================================================
// Logger Utility
// ============================================================================

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const prefix = `[HuntSessionStore][${timestamp}][${level}]`;
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, message, ...args);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, ...args);
      break;
    case LogLevel.DEBUG:
      if (process.env.HUNT_SESSION_DEBUG === 'true') {
        console.debug(prefix, message, ...args);
      }
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Serialize a HuntSessionState to JSON string
 * Handles Date objects properly
 */
function serializeState(state: HuntSessionState): string {
  return JSON.stringify({
    ...state,
    lastActivity: state.lastActivity instanceof Date ? state.lastActivity.toISOString() : state.lastActivity,
    startTime: state.startTime instanceof Date ? state.startTime.toISOString() : state.startTime,
    completedAt: state.completedAt instanceof Date ? state.completedAt.toISOString() : state.completedAt,
  });
}

/**
 * Deserialize a JSON string to HuntSessionState
 * Converts ISO date strings back to Date objects
 */
function deserializeState(data: string | null): HuntSessionState | null {
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    
    return {
      id: parsed.id as string,
      status: parsed.status as string,
      progress: parsed.progress as number,
      totalResults: parsed.totalResults as number,
      lastActivity: new Date(parsed.lastActivity as string),
      startTime: parsed.startTime ? new Date(parsed.startTime as string) : undefined,
      completedAt: parsed.completedAt ? new Date(parsed.completedAt as string) : undefined,
    };
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to deserialize session state:', error);
    return null;
  }
}

/**
 * Build Redis key for a session
 */
function buildKey(prefix: string, sessionId: string): string {
  return `${prefix}:${sessionId}`;
}

// ============================================================================
// RedisSessionStore Class
// ============================================================================

/**
 * Redis-backed session state manager for threat hunting operations.
 * 
 * This class provides a drop-in replacement for the in-memory Map used
 * in threat-hunting/sessions/route.ts with the following benefits:
 * 
 * - **Production**: Sessions persist across server restarts and are shared
 *   across multiple instances in a cluster deployment.
 * - **Development**: Falls back gracefully to in-memory storage when Redis
 *   is not available.
 * - **Automatic Cleanup**: TTL-based expiration ensures stale sessions
 *   are automatically removed.
 * 
 * @example
 * ```typescript
 * import { huntSessionStore, RedisSessionStore } from '@/lib/production/redis-session-store';
 * 
 * // Using singleton instance
 * await huntSessionStore.set('session-123', { id: 'session-123', status: 'RUNNING', ... });
 * const state = await huntSessionStore.get('session-123');
 * 
 * // Or create custom instance
 * const store = new RedisSessionStore({ defaultTTLSeconds: 3600 });
 * ```
 */
export class RedisSessionStore {
  private config: Required<RedisSessionStoreConfig>;
  private memoryFallback: Map<string, HuntSessionState> = new Map();
  private useRedis: boolean = false;
  private redisInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private isHealthy: boolean = true;
  private lastError: string | null = null;

  constructor(config?: RedisSessionStoreConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      enableDebugLogging: config?.enableDebugLogging ?? process.env.HUNT_SESSION_DEBUG === 'true',
    };

    // Check if Redis URL is configured
    this.useRedis = !!process.env.REDIS_URL;
    
    // Initialize Redis connection if available
    if (this.useRedis) {
      this.initializeRedis().catch(error => {
        log(LogLevel.WARN, 'Redis initialization failed, using memory fallback:', error.message);
        this.useRedis = false;
        this.lastError = error.message;
      });
    }

    // Start cleanup interval
    this.startCleanupInterval();

    log(LogLevel.INFO, `HuntSessionStore initialized (mode: ${this.useRedis ? 'redis' : 'memory'})`);
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Store or update a session's state
   * 
   * @param sessionId - Unique session identifier
   * @param state - Complete session state object
   * @param ttlSeconds - Optional custom TTL (overrides default)
   */
  async set(sessionId: string, state: HuntSessionState, ttlSeconds?: number): Promise<void> {
    try {
      if (this.useRedis && this.redisInitialized) {
        await this.setInRedis(sessionId, state, ttlSeconds);
      } else {
        this.setInMemory(sessionId, state);
      }
      
      log(LogLevel.DEBUG, `Session ${sessionId} stored (${state.status}, progress: ${state.progress}%)`);
    } catch (error) {
      // Fallback to memory on Redis error
      if (this.useRedis) {
        log(LogLevel.WARN, `Redis set failed for ${sessionId}, falling back to memory:`, error);
        this.setInMemory(sessionId, state);
      } else {
        throw error;
      }
    }
  }

  /**
   * Retrieve a session's state by ID
   * 
   * @param sessionId - Unique session identifier
   * @returns Session state or null if not found
   */
  async get(sessionId: string): Promise<HuntSessionState | null> {
    try {
      if (this.useRedis && this.redisInitialized) {
        return await this.getFromRedis(sessionId);
      } else {
        return this.getFromMemory(sessionId);
      }
    } catch (error) {
      // Fallback to memory on Redis error
      if (this.useRedis) {
        log(LogLevel.WARN, `Redis get failed for ${sessionId}, falling back to memory:`, error);
        return this.getFromMemory(sessionId);
      }
      throw error;
    }
  }

  /**
   * Delete a session by ID
   * 
   * @param sessionId - Unique session identifier
   */
  async delete(sessionId: string): Promise<void> {
    try {
      if (this.useRedis && this.redisInitialized) {
        await this.deleteFromRedis(sessionId);
      }
      
      // Always remove from memory fallback too
      this.deleteFromMemory(sessionId);
      
      log(LogLevel.DEBUG, `Session ${sessionId} deleted`);
    } catch (error) {
      // Still try to clean up memory
      this.deleteFromMemory(sessionId);
      log(LogLevel.WARN, `Redis delete failed for ${sessionId}:`, error);
    }
  }

  /**
   * Check if a session exists
   * 
   * @param sessionId - Unique session identifier
   * @returns True if session exists
   */
  async has(sessionId: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redisInitialized) {
        return await this.hasInRedis(sessionId);
      } else {
        return this.hasInMemory(sessionId);
      }
    } catch (error) {
      if (this.useRedis) {
        log(LogLevel.WARN, `Redis has check failed for ${sessionId}, falling back to memory:`, error);
        return this.hasInMemory(sessionId);
      }
      throw error;
    }
  }

  /**
   * Get all active sessions
   * 
   * @returns Map of session IDs to their states
   */
  async getAll(): Promise<Map<string, HuntSessionState>> {
    try {
      if (this.useRedis && this.redisInitialized) {
        return await this.getAllFromRedis();
      } else {
        return new Map(this.memoryFallback);
      }
    } catch (error) {
      if (this.useRedis) {
        log(LogLevel.WARN, 'Redis getAll failed, falling back to memory:', error);
        return new Map(this.memoryFallback);
      }
      throw error;
    }
  }

  /**
   * Clean up stale sessions that have exceeded the timeout
   * 
   * @param timeoutMs - Timeout in milliseconds (sessions inactive longer than this will be cleaned)
   * @returns Number of sessions cleaned up
   */
  async cleanupStale(timeoutMs: number): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    try {
      if (this.useRedis && this.redisInitialized) {
        cleanedCount = await this.cleanupStaleFromRedis(timeoutMs, now);
      }
      
      // Always clean up memory fallback
      const memoryCleaned = this.cleanupStaleFromMemory(timeoutMs, now);
      cleanedCount += memoryCleaned;
      
      if (cleanedCount > 0) {
        log(LogLevel.INFO, `Cleaned up ${cleanedCount} stale sessions`);
      }
      
      return cleanedCount;
    } catch (error) {
      log(LogLevel.ERROR, 'Error during cleanup:', error);
      // Try memory cleanup at least
      return this.cleanupStaleFromMemory(timeoutMs, now);
    }
  }

  /**
   * Get the count of active sessions
   * 
   * @returns Number of active sessions
   */
  async getCount(): Promise<number> {
    try {
      if (this.useRedis && this.redisInitialized) {
        return await this.getCountFromRedis();
      } else {
        return this.memoryFallback.size;
      }
    } catch (error) {
      if (this.useRedis) {
        log(LogLevel.WARN, 'Redis getCount failed, returning memory count:', error);
        return this.memoryFallback.size;
      }
      throw error;
    }
  }

  /**
   * Perform health check on the session store
   * 
   * @returns Health status information
   */
  async healthCheck(): Promise<SessionStoreHealthStatus> {
    const now = new Date();
    
    try {
      if (this.useRedis && this.redisInitialized) {
        const redisStatus = await redisClient.healthCheck();
        
        const sessionCount = await this.getCount();
        
        this.isHealthy = redisStatus.healthy;
        this.lastError = redisStatus.error || null;
        
        return {
          healthy: redisStatus.healthy,
          mode: redisStatus.healthy ? 'redis' : 'degraded',
          sessionCount,
          redisStatus,
          checkedAt: now,
          error: redisStatus.error,
        };
      } else {
        // Memory-only mode
        return {
          healthy: true,
          mode: 'memory',
          sessionCount: this.memoryFallback.size,
          memoryStats: {
            usedSlots: this.memoryFallback.size,
            maxSlots: this.config.maxMemorySessions,
            usagePercent: Math.round((this.memoryFallback.size / this.config.maxMemorySessions) * 10000) / 100,
          },
          checkedAt: now,
        };
      }
    } catch (error) {
      this.isHealthy = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      
      return {
        healthy: false,
        mode: this.useRedis ? 'degraded' : 'memory',
        sessionCount: this.memoryFallback.size,
        memoryStats: {
          usedSlots: this.memoryFallback.size,
          maxSlots: this.config.maxMemorySessions,
          usagePercent: Math.round((this.memoryFallback.size / this.config.maxMemorySessions) * 10000) / 100,
        },
        checkedAt: now,
        error: this.lastError,
      };
    }
  }

  /**
   * Get current storage mode
   * 
   * @returns 'redis', 'memory', or 'degraded'
   */
  getMode(): 'redis' | 'memory' | 'degraded' {
    if (!this.useRedis) return 'memory';
    if (!this.isHealthy || !this.redisInitialized) return 'degraded';
    return 'redis';
  }

  /**
   * Force reconnection to Redis
   * Useful after connection loss
   */
  async reconnect(): Promise<boolean> {
    if (!process.env.REDIS_URL) {
      log(LogLevel.WARN, 'Cannot reconnect: REDIS_URL not configured');
      return false;
    }

    try {
      log(LogLevel.INFO, 'Attempting Redis reconnection...');
      this.redisInitialized = false;
      await this.initializeRedis();
      return this.redisInitialized;
    } catch (error) {
      log(LogLevel.ERROR, 'Redis reconnection failed:', error);
      return false;
    }
  }

  /**
   * Gracefully shutdown the session store
   * Stops cleanup timers and releases resources
   */
  async shutdown(): Promise<void> {
    log(LogLevel.INFO, 'Shutting down HuntSessionStore...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.memoryFallback.clear();
    log(LogLevel.INFO, 'HuntSessionStore shutdown complete');
  }

  // ==========================================================================
  // Redis Implementation Methods
  // ==========================================================================

  private async initializeRedis(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitializeRedis();
    return this.initializationPromise;
  }

  private async doInitializeRedis(): Promise<void> {
    try {
      log(LogLevel.INFO, 'Initializing Redis connection for HuntSessionStore...');
      
      // Use existing Redis client manager
      await redisClient.initialize();
      
      // Test connection
      const client = await getRedis();
      if (!client) {
        throw new Error('Failed to get Redis client');
      }
      
      await client.ping();
      
      this.redisInitialized = true;
      this.isHealthy = true;
      this.lastError = null;
      
      log(LogLevel.INFO, '✅ Redis connection established for HuntSessionStore');
    } catch (error) {
      this.redisInitialized = false;
      this.isHealthy = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      
      log(LogLevel.ERROR, '❌ Failed to initialize Redis for HuntSessionStore:', error);
      throw error;
    }
  }

  private async setInRedis(sessionId: string, state: HuntSessionState, ttlSeconds?: number): Promise<void> {
    await safeRedisCommand(async (client: Redis) => {
      const key = buildKey(this.config.keyPrefix, sessionId);
      const serialized = serializeState(state);
      const ttl = ttlSeconds ?? this.config.defaultTTLSeconds;
      
      await client.setex(key, ttl, serialized);
    });
  }

  private async getFromRedis(sessionId: string): Promise<HuntSessionState | null> {
    return safeRedisCommand(async (client: Redis) => {
      const key = buildKey(this.config.keyPrefix, sessionId);
      const data = await client.get(key);
      return deserializeState(data);
    }, null);
  }

  private async deleteFromRedis(sessionId: string): Promise<void> {
    await safeRedisCommand(async (client: Redis) => {
      const key = buildKey(this.config.keyPrefix, sessionId);
      await client.del(key);
    });
  }

  private async hasInRedis(sessionId: string): Promise<boolean> {
    return safeRedisCommand(async (client: Redis) => {
      const key = buildKey(this.config.keyPrefix, sessionId);
      const exists = await client.exists(key);
      return exists === 1;
    }, false);
  }

  private async getAllFromRedis(): Promise<Map<string, HuntSessionState>> {
    return safeRedisCommand(async (client: Redis) => {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await client.keys(pattern);
      
      const result = new Map<string, HuntSessionState>();
      
      if (keys.length === 0) return result;
      
      // Process in batches using pipeline
      const batchSize = 50;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const pipeline = client.pipeline();
        
        for (const key of batch) {
          pipeline.get(key);
        }
        
        const results = await pipeline.exec();
        
        for (let j = 0; j < batch.length; j++) {
          if (results?.[j] && !results[j][0]) {
            // Extract session ID from key
            const sessionId = batch[j].replace(`${this.config.keyPrefix}:`, '');
            const state = deserializeState(results[j][1] as string);
            
            if (state) {
              result.set(sessionId, state);
            }
          }
        }
      }
      
      return result;
    }, new Map());
  }

  private async cleanupStaleFromRedis(timeoutMs: number, now: number): Promise<number> {
    return safeRedisCommand(async (client: Redis) => {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      let cleanedCount = 0;
      const keysToDelete: string[] = [];
      
      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const pipeline = client.pipeline();
        
        for (const key of batch) {
          pipeline.get(key);
        }
        
        const results = await pipeline.exec();
        
        for (let j = 0; j < batch.length; j++) {
          if (results?.[j] && !results[j][0]) {
            const state = deserializeState(results[j][1] as string);
            
            if (state) {
              const lastActivityTime = state.lastActivity.getTime();
              if (now - lastActivityTime > timeoutMs) {
                keysToDelete.push(batch[j]);
              }
            } else {
              // Malformed data, delete it
              keysToDelete.push(batch[j]);
            }
          }
        }
      }
      
      // Delete stale keys
      if (keysToDelete.length > 0) {
        await client.del(...keysToDelete);
        cleanedCount = keysToDelete.length;
      }
      
      return cleanedCount;
    }, 0);
  }

  private async getCountFromRedis(): Promise<number> {
    return safeRedisCommand(async (client: Redis) => {
      const pattern = `${this.config.keyPrefix}:*`;
      const keys = await client.keys(pattern);
      return keys.length;
    }, 0);
  }

  // ==========================================================================
  // Memory Fallback Implementation Methods
  // ==========================================================================

  private setInMemory(sessionId: string, state: HuntSessionState): void {
    // Enforce maximum size limit
    if (this.memoryFallback.size >= this.config.maxMemorySessions && !this.memoryFallback.has(sessionId)) {
      // Remove oldest entry
      const oldestKey = this.memoryFallback.keys().next().value;
      if (oldestKey) {
        this.memoryFallback.delete(oldestKey);
        log(LogLevel.DEBUG, `Evicted oldest session ${oldestKey} due to size limit`);
      }
    }
    
    this.memoryFallback.set(sessionId, state);
  }

  private getFromMemory(sessionId: string): HuntSessionState | null {
    return this.memoryFallback.get(sessionId) ?? null;
  }

  private deleteFromMemory(sessionId: string): void {
    this.memoryFallback.delete(sessionId);
  }

  private hasInMemory(sessionId: string): boolean {
    return this.memoryFallback.has(sessionId);
  }

  private cleanupStaleFromMemory(timeoutMs: number, now: number): number {
    let cleanedCount = 0;
    
    for (const [sessionId, state] of this.memoryFallback.entries()) {
      const lastActivityTime = state.lastActivity.getTime();
      if (now - lastActivityTime > timeoutMs) {
        this.memoryFallback.delete(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  // ==========================================================================
  // Cleanup Interval Management
  // ==========================================================================

  private startCleanupInterval(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Run cleanup at configured interval
    this.cleanupTimer = setInterval(async () => {
      try {
        // Clean up sessions that have been inactive for 2x the default TTL
        const staleTimeout = this.config.defaultTTLSeconds * 2 * 1000;
        await this.cleanupStale(staleTimeout);
      } catch (error) {
        log(LogLevel.ERROR, 'Scheduled cleanup failed:', error);
      }
    }, this.config.cleanupIntervalMs);
    
    // Don't prevent Node.js from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
    
    log(LogLevel.DEBUG, `Cleanup interval started (${this.config.cleanupIntervalMs}ms)`);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global singleton instance of the RedisSessionStore.
 * 
 * Use this instance throughout your application for consistent
 * session state management. The store automatically detects
 * whether Redis is available and falls back to in-memory
 * storage when needed.
 * 
 * @example
 * ```typescript
 * import { huntSessionStore } from '@/lib/production/redis-session-store';
 * 
 * // Store session state
 * await huntSessionStore.set('session-123', {
 *   id: 'session-123',
 *   status: 'RUNNING',
 *   progress: 45,
 *   totalResults: 120,
 *   lastActivity: new Date(),
 *   startTime: new Date(),
 * });
 * 
 * // Retrieve session state
 * const state = await huntSessionStore.get('session-123');
 * 
 * // Check health
 * const health = await huntSessionStore.healthCheck();
 * console.log(`Mode: ${health.mode}, Sessions: ${health.sessionCount}`);
 * ```
 */
export const huntSessionStore = new RedisSessionStore({
  keyPrefix: 'hunt:session',
  defaultTTLSeconds: parseInt(process.env.HUNT_SESSION_TTL_SECONDS || '1800', 10),
  enableDebugLogging: process.env.HUNT_SESSION_DEBUG === 'true',
});

// ============================================================================
// Convenience Functions (for easy migration from Map)
// ============================================================================

/**
 * Set a session state (convenience wrapper)
 */
export async function setHuntSession(sessionId: string, state: HuntSessionState): Promise<void> {
  await huntSessionStore.set(sessionId, state);
}

/**
 * Get a session state (convenience wrapper)
 */
export async function getHuntSession(sessionId: string): Promise<HuntSessionState | null> {
  return huntSessionStore.get(sessionId);
}

/**
 * Delete a session (convenience wrapper)
 */
export async function deleteHuntSession(sessionId: string): Promise<void> {
  await huntSessionStore.delete(sessionId);
}

/**
 * Check if session exists (convenience wrapper)
 */
export async function hasHuntSession(sessionId: string): Promise<boolean> {
  return huntSessionStore.has(sessionId);
}

/**
 * Get all sessions (convenience wrapper)
 */
export async function getAllHuntSessions(): Promise<Map<string, HuntSessionState>> {
  return huntSessionStore.getAll();
}

/**
 * Clean up stale sessions (convenience wrapper)
 */
export async function cleanupStaleHuntSessions(timeoutMs: number): Promise<number> {
  return huntSessionStore.cleanupStale(timeoutMs);
}

/**
 * Get session count (convenience wrapper)
 */
export async function getHuntSessionCount(): Promise<number> {
  return huntSessionStore.getCount();
}

/**
 * Check session store health (convenience wrapper)
 */
export async function checkHuntSessionHealth(): Promise<SessionStoreHealthStatus> {
  return huntSessionStore.healthCheck();
}

// ============================================================================
// Exports
// ============================================================================

export default RedisSessionStore;
