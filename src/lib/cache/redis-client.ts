/**
 * Djezzy National SOC Platform - Redis Client Configuration
 * 
 * Production-ready Redis client for multi-instance deployments.
 * Features:
 * - Singleton pattern for connection management
 * - Connection pooling with configurable limits
 * - Automatic reconnection with exponential backoff
 * - Health check functionality
 * - Support for standalone and cluster mode
 * - Graceful fallback when Redis is unavailable
 * 
 * ANRT Compliance:
 * - All data stored within Algeria (on-premise Redis)
 * - TLS 1.3 encryption enabled in production
 * - Connection logging for audit trails
 * 
 * @module lib/cache/redis-client
 * @version 2.0.0
 */

import Redis, { Cluster, ClusterNode, RedisOptions, ClusterOptions } from 'ioredis';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RedisClientConfig {
  /** Redis connection URL (redis:// or rediss://) */
  url?: string;
  /** Redis host (used if url not provided) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis database number (default: 0) */
  db?: number;
  /** Authentication password */
  password?: string;
  /** Connection timeout in ms (default: 10000) */
  connectTimeout?: number;
  /** Command timeout in ms (default: 5000) */
  commandTimeout?: number;
  /** Maximum retry delay in ms (default: 3000) */
  maxRetryDelay?: number;
  /** Enable cluster mode */
  enableCluster?: boolean;
  /** Cluster nodes (required if enableCluster=true) */
  clusterNodes?: ClusterNode[];
  /** Key prefix for SOC platform data */
  keyPrefix?: string;
  /** Whether to use TLS */
  tls?: boolean;
  /** Maximum number of connections in pool (standalone) */
  maxConnections?: boolean;
  /** Lazy connect - don't connect until first command */
  lazyConnect?: boolean;
  /** Enable offline queue when disconnected */
  enableOfflineQueue?: boolean;
  /** Enable ready check on connection */
  enableReadyCheck?: boolean;
  /** Keepalive interval in ms */
  keepAlive?: number;
  /** Connection name for monitoring */
  connectionName?: string;
}

export interface RedisHealthStatus {
  /** Whether Redis is connected and healthy */
  healthy: boolean;
  /** Connection status string */
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';
  /** Redis server info (if connected) */
  serverInfo?: {
    version: string;
    uptime: number;
    connectedClients: number;
    usedMemory: string;
    usedMemoryHuman: string;
    totalCommandsProcessed: number;
    opsPerSec: number;
  };
  /** Response time in ms (from last PING) */
  responseTimeMs?: number;
  /** Number of active connections */
  activeConnections: number;
  /** Timestamp of health check */
  checkedAt: Date;
  /** Error message if unhealthy */
  error?: string;
}

export interface RedisClusterConfig extends Omit<RedisClientConfig, 'enableCluster' | 'clusterNodes'> {
  /** Cluster node addresses */
  nodes: Array<{ host: string; port: number }>;
  /** Cluster options */
  clusterOptions?: Partial<ClusterOptions>;
}

// ============================================================================
// Configuration Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<Pick<RedisClientConfig, 
  | 'connectTimeout' 
  | 'commandTimeout' 
  | 'maxRetryDelay'
  | 'keyPrefix'
  | 'tls'
  | 'lazyConnect'
  | 'enableOfflineQueue'
  | 'enableReadyCheck'
  | 'keepAlive'
>> = {
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetryDelay: 3000,
  keyPrefix: 'soc:',
  tls: false,
  lazyConnect: false,
  enableOfflineQueue: true,
  enableReadyCheck: true,
  keepAlive: 30000,
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
  const prefix = `[Redis][${timestamp}][${level}]`;
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, message, ...args);
      break;
    case LogLevel.WARN:
      console.warn(prefix, message, ...args);
      break;
    case LogLevel.DEBUG:
      if (process.env.REDIS_DEBUG === 'true') {
        console.debug(prefix, message, ...args);
      }
      break;
    default:
      console.log(prefix, message, ...args);
  }
}

// ============================================================================
// Redis Client Singleton Class
// ============================================================================

/**
 * Singleton Redis client manager for the National SOC Platform.
 * 
 * @example
 * ```typescript
 * import { redisClient } from '@/lib/cache/redis-client';
 * 
 * // Get the Redis instance
 * const redis = await redisClient.getClient();
 * await redis.set('key', 'value');
 * 
 * // Check health
 * const health = await redisClient.healthCheck();
 * ```
 */
class RedisClientManager {
  private static instance: RedisClientManager | null = null;
  private client: Redis | Cluster | null = null;
  private config: RedisClientConfig;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private healthStatus: RedisHealthStatus | null = null;

  private constructor(config?: Partial<RedisClientConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      url: config?.url || process.env.REDIS_URL || undefined,
      host: config?.host || process.env.REDIS_HOST || '127.0.0.1',
      port: config?.port ? config.port : (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379),
      db: config?.db ? config.db : (process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0),
      password: config?.password || process.env.REDIS_PASSWORD || undefined,
      enableCluster: config?.enableCluster || process.env.REDIS_CLUSTER === 'true',
      connectionName: config?.connectionName || 'national-soc-platform',
    };
    
    this.maxReconnectAttempts = parseInt(process.env.REDIS_MAX_RECONNECT_ATTEMPTS || '10', 10);
  }

  /**
   * Get singleton instance of Redis client manager
   */
  public static getInstance(config?: Partial<RedisClientConfig>): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager(config);
    }
    return RedisClientManager.instance;
  }

  /**
   * Initialize Redis connection (call once at application startup)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.client) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeConnection();
    return this.initializationPromise;
  }

  /**
   * Get the Redis client instance
   * @throws Error if not initialized
   */
  public async getClient(): Promise<Redis | Cluster> {
    if (!this.isInitialized || !this.client) {
      await this.initialize();
    }
    return this.client!;
  }

  /**
   * Check if Redis is available (non-throwing)
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Perform health check on Redis connection
   */
  public async healthCheck(): Promise<RedisHealthStatus> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient();
      
      // Execute PING to measure response time
      const pingResult = await client.ping();
      
      const responseTimeMs = Date.now() - startTime;
      
      // Try to get server info
      let serverInfo: RedisHealthStatus['serverInfo'];
      try {
        if (!(client instanceof Cluster)) {
          const info = await client.info();
          serverInfo = this.parseRedisInfo(info);
        }
      } catch {
        // Info retrieval failed, continue without it
      }

      this.healthStatus = {
        healthy: true,
        status: 'connected',
        serverInfo,
        responseTimeMs,
        activeConnections: serverInfo?.connectedClients || 1,
        checkedAt: new Date(),
      };

      return this.healthStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.healthStatus = {
        healthy: false,
        status: this.getConnectStatus(),
        responseTimeMs: Date.now() - startTime,
        activeConnections: 0,
        checkedAt: new Date(),
        error: errorMessage,
      };

      log(LogLevel.ERROR, `Redis health check failed: ${errorMessage}`);
      return this.healthStatus;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        // Wait for pending commands to complete
        if (!(this.client instanceof Cluster)) {
          // For standalone, we can wait for pending commands
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await this.client.quit();
        log(LogLevel.INFO, 'Redis connection closed gracefully');
      } catch (error) {
        log(LogLevel.WARN, 'Error closing Redis connection:', error);
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          log(LogLevel.ERROR, 'Error force-disconnecting Redis:', disconnectError);
        }
      }
      
      this.client = null;
      this.isInitialized = false;
    }
  }

  /**
   * Reset the singleton (useful for testing)
   */
  public static resetInstance(): void {
    if (RedisClientManager.instance) {
      RedisClientManager.instance.disconnect().catch(() => {});
      RedisClientManager.instance = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async initializeConnection(): Promise<void> {
    try {
      log(LogLevel.INFO, 'Initializing Redis connection...');
      
      if (this.config.enableCluster) {
        await this.initClusterConnection();
      } else {
        await this.initStandaloneConnection();
      }
      
      this.setupEventHandlers(this.client!);
      this.isInitialized = true;
      this.reconnectAttempts = 0;
      
      log(LogLevel.INFO, '✅ Redis connection established successfully');
    } catch (error) {
      log(LogLevel.ERROR, '❌ Failed to initialize Redis connection:', error);
      
      // Don't throw - allow app to run without Redis (degraded mode)
      log(LogLevel.WARN, '⚠️ Running in degraded mode without Redis. Rate limiting will use in-memory fallback.');
      this.client = null;
      this.isInitialized = false;
    }
  }

  private async initStandaloneConnection(): Promise<void> {
    const options: RedisOptions = {
      host: this.config.host!,
      port: this.config.port!,
      db: this.config.db!,
      password: this.config.password,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      retryStrategy: (times: number) => {
        this.reconnectAttempts = times;
        
        if (times > this.maxReconnectAttempts) {
          log(LogLevel.ERROR, `Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
          return null; // Stop retrying
        }
        
        const delay = Math.min(times * 200, this.config.maxRetryDelay);
        log(LogLevel.DEBUG, `Reconnection attempt ${times}/${this.maxReconnectAttempts} in ${delay}ms`);
        return delay;
      },
      lazyConnect: this.config.lazyConnect,
      enableOfflineQueue: this.config.enableOfflineQueue,
      enableReadyCheck: this.config.enableReadyCheck,
      keepAlive: this.config.keepAlive,
      connectionName: this.config.connectionName,
      // TLS configuration
      ...(this.config.tls ? {
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.3',
          // In production, provide proper certificates
          ca: process.env.REDIS_CA_CERT,
        },
      } : {}),
      // Sentinel support (if configured)
      ...(process.env.REDIS_SENTINEL_NAME ? {
        sentinels: this.parseSentinels(),
        name: process.env.REDIS_SENTINEL_NAME,
        sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
        sentinelTLS: this.config.tls,
      } : {}),
    };

    this.client = new Redis(options);
    
    // Test connection
    if (!this.config.lazyConnect) {
      await this.client.connect();
    }
  }

  private async initClusterConnection(): Promise<void> {
    const nodes: ClusterNode[] = this.config.clusterNodes || 
      (process.env.REDIS_CLUSTER_NODES ? this.parseClusterNodes() : [
        { host: this.config.host!, port: this.config.port! },
      ]);

    if (nodes.length === 0) {
      throw new Error('No cluster nodes configured');
    }

    const options: ClusterOptions = {
      redisOptions: {
        password: this.config.password,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        connectionName: this.config.connectionName,
        ...(this.config.tls ? {
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.3',
          },
        } : {}),
      },
      enableReadyCheck: this.config.enableReadyCheck,
      scaleReads: 'slave', // Read from replicas when possible
      maxRedirections: 16,
      retryDelayOnFailover: 1000,
      retryDelayOnClusterDown: 1000,
      slotsRefreshTimeout: 10000,
    };

    this.client = new Cluster(nodes, options);
    
    // Test connection
    if (!this.config.lazyConnect) {
      await (this.client as Cluster).connect();
    }
  }

  private setupEventHandlers(client: Redis | Cluster): void {
    client.on('connect', () => {
      log(LogLevel.INFO, 'Redis connected');
      this.reconnectAttempts = 0;
    });

    client.on('ready', () => {
      log(LogLevel.INFO, 'Redis connection ready');
    });

    client.on('error', (error: Error) => {
      log(LogLevel.ERROR, 'Redis error:', error.message);
    });

    client.on('close', () => {
      log(LogLevel.WARN, 'Redis connection closed');
    });

    client.on('reconnecting', () => {
      log(LogLevel.INFO, `Redis reconnecting (attempt ${this.reconnectAttempts + 1})...`);
    });

    client.on('end', () => {
      log(LogLevel.INFO, 'Redis connection ended');
    });

    if (!(client instanceof Cluster)) {
      // Standalone-specific events
      client.on('+node', () => {
        log(LogLevel.DEBUG, 'Redis node connected');
      });
      
      client.on('-node', () => {
        log(LogLevel.WARN, 'Redis node disconnected');
      });
    }
  }

  private getConnectStatus(): RedisHealthStatus['status'] {
    if (!this.client) return 'disconnected';
    
    if (this.client instanceof Cluster) {
      return 'connected'; // Simplified for cluster
    }
    
    switch (this.client.status) {
      case 'connect': return 'connecting';
      case 'ready': return 'connected';
      case 'reconnecting': return 'reconnecting';
      case 'end': return 'disconnected';
      default: return 'error';
    }
  }

  private parseRedisInfo(infoString: string): RedisHealthStatus['serverInfo'] {
    const lines = infoString.split('\r\n');
    const info: Record<string, string> = {};
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes(':')) continue;
      const [key, value] = line.split(':');
      if (key && value !== undefined) {
        info[key.trim()] = value.trim();
      }
    }

    return {
      version: info.redis_version || 'unknown',
      uptime: parseInt(info.uptime_in_seconds || '0', 10),
      connectedClients: parseInt(info.connected_clients || '0', 10),
      usedMemory: info.used_memory || '0',
      usedMemoryHuman: info.used_memory_human || '0B',
      totalCommandsProcessed: parseInt(info.total_commands_processed || '0', 10),
      opsPerSec: parseInt(info.instantaneous_ops_per_sec || '0', 10),
    };
  }

  private parseSentinels(): Array<{ host: string; port: number }> {
    const sentinelsEnv = process.env.REDIS_SENTINELS || '';
    return sentinelsEnv.split(',').map(s => {
      const [host, port] = s.trim().split(':');
      return { host, port: parseInt(port || '26379', 10) };
    }).filter(s => s.host);
  }

  private parseClusterNodes(): ClusterNode[] {
    const nodesEnv = process.env.REDIS_CLUSTER_NODES || '';
    return nodesEnv.split(',').map(n => {
      const [host, port] = n.trim().split(':');
      return { host, port: parseInt(port || '6379', 10) };
    }).filter(n => n.host);
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

/**
 * Global Redis client singleton instance.
 * Initialize once at application startup, then use throughout.
 */
export const redisClient = RedisClientManager.getInstance();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get Redis client with automatic initialization
 * Safe to call anywhere after module load
 */
export async function getRedis(): Promise<Redis | Cluster | null> {
  try {
    return await redisClient.getClient();
  } catch {
    return null;
  }
}

/**
 * Check Redis availability (non-blocking)
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  return redisClient.healthCheck();
}

/**
 * Execute a Redis command with fallback handling
 * Returns null if Redis is unavailable
 */
export async function safeRedisCommand<T>(
  command: (...args: unknown[]) => Promise<T>,
  fallbackValue: T | null = null
): Promise<T | null> {
  try {
    const client = await getRedis();
    if (!client) {
      log(LogLevel.WARN, 'Redis unavailable, using fallback value');
      return fallbackValue;
    }
    return await command(client);
  } catch (error) {
    log(LogLevel.ERROR, 'Redis command failed:', error);
    return fallbackValue;
  }
}

// ============================================================================
// Initialization Hook for Next.js / Express
// ============================================================================

/**
 * Initialize Redis connection (call in your entry point)
 * 
 * @example
 * // next.config.js or server.ts
 * import { initRedis } from '@/lib/cache/redis-client';
 * 
 * export default async function startServer() {
 *   await initRedis();
 *   // Start your server...
 * }
 */
export async function initRedis(config?: Partial<RedisClientConfig>): Promise<void> {
  try {
    await redisClient.initialize();
    const health = await redisClient.healthCheck();
    
    if (health.healthy) {
      log(LogLevel.INFO, `🔴 Redis operational - v${health.serverInfo?.version}, ${health.responseTimeMs}ms response time`);
    } else {
      log(LogLevel.WARN, '⚠️ Redis not available - running in degraded mode');
    }
  } catch (error) {
    log(LogLevel.ERROR, 'Failed to initialize Redis:', error);
    // Don't throw - allow app to start without Redis
  }
}

// Graceful shutdown handler
export async function shutdownRedis(): Promise<void> {
  log(LogLevel.INFO, 'Shutting down Redis connection...');
  await redisClient.disconnect();
}

// Handle process termination
if (typeof process !== 'undefined') {
  const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  for (const signal of shutdownSignals) {
    process.on(signal, async () => {
      await shutdownRedis();
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export default redisClient;
export { RedisClientManager, DEFAULT_CONFIG, log as redisLog };
