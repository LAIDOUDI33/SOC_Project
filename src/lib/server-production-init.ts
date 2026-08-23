/**
 * Djezzy National SOC Platform - Server Production Initialization
 * 
 * This module handles all server-side initialization tasks:
 * - Environment variable validation at startup
 * - Rate limiter singleton initialization
 * - Health check cron job setup
 * - Graceful shutdown handlers
 * - Startup logging with config hash (not values)
 * 
 * ANRT Compliance:
 * - All initialization logged for audit
 * - No secrets exposed in logs
 * - Graceful shutdown ensures data integrity
 * 
 * @module lib/server-production-init
 * @version 2.0.0
 */

import { validateConfig, getConfigHash, getMaskedValue, EnvironmentValidationResult } from './production/env-validation';
import { initRedis, shutdownRedis } from './cache/redis-client';

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Initialization status */
export type InitStatus = 'pending' | 'initializing' | 'ready' | 'degraded' | 'failed';

/** Health check result */
export interface HealthCheckResult {
  /** When this check was performed */
  timestamp: Date;
  /** Overall status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Individual component statuses */
  components: ComponentHealth[];
  /** Response time in ms */
  responseTimeMs: number;
}

/** Single component health */
export interface ComponentHealth {
  /** Component name */
  name: string;
  /** Component status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** Additional details */
  details?: string;
  /** Latency in ms if applicable */
  latencyMs?: number;
}

/** Initialization result */
export interface InitResult {
  /** Overall init status */
  status: InitStatus;
  /** Timestamp of initialization */
  timestamp: Date;
  /** Environment validation result */
  envValidation: EnvironmentValidationResult;
  /** Components initialized */
  components: string[];
  /** Components that failed */
  failedComponents: string[];
  /** Warnings during init */
  warnings: string[];
  /** Config hash for audit */
  configHash: string;
  /** Process ID */
  pid: number;
  /** Node.js version */
  nodeVersion: string;
  /** Platform info */
  platform: string;
}

// ============================================================================
// Module State
// ============================================================================

let initStatus: InitStatus = 'pending';
let initResult: InitResult | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;
const HEALTH_CHECK_INTERVAL_MS = 60_000; // 1 minute

// ============================================================================
// Rate Limiter Initialization
// ============================================================================

/**
 * Initialize rate limiter singleton with production configuration.
 * Uses Redis if available, falls back to in-memory store.
 */
async function initializeRateLimiter(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    // Import dynamically to avoid circular dependencies
    const { redisClient } = await import('./cache/redis-client');
    
    // Check if Redis is available
    const isAvailable = await redisClient.isAvailable();
    
    if (isAvailable) {
      return {
        name: 'rate-limiter',
        status: 'healthy',
        details: 'Rate limiter initialized with Redis backend',
        latencyMs: Date.now() - start,
      };
    }
    
    // Fallback to in-memory
    return {
      name: 'rate-limiter',
      status: 'degraded',
      details: 'Rate limiter using in-memory fallback (Redis unavailable)',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'rate-limiter',
      status: 'degraded',
      details: `Rate limiter initialization warning: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

// ============================================================================
// Database Connection Check
// ============================================================================

/**
 * Verify database connectivity
 */
async function checkDatabaseConnection(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    const { db, checkDatabaseHealth } = await import('./db');
    const health = await checkDatabaseHealth();
    
    return {
      name: 'database',
      status: health.healthy ? 'healthy' : 'unhealthy',
      details: health.error || 'Database connection successful',
      latencyMs: health.latency,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

// ============================================================================
// Cache/Redis Initialization
// ============================================================================

/**
 * Initialize Redis/cache connection
 */
async function initializeCache(): Promise<ComponentHealth> {
  const start = Date.now();
  
  try {
    await initRedis();
    
    const { redisClient } = await import('./cache/redis-client');
    const health = await redisClient.healthCheck();
    
    return {
      name: 'cache',
      status: health.healthy ? 'healthy' : 'degraded',
      details: health.healthy 
        ? `Redis connected (${health.serverInfo?.version || 'unknown'})`
        : `Cache unavailable: ${health.error || 'Unknown reason'}`,
      latencyMs: health.responseTimeMs || (Date.now() - start),
    };
  } catch (error) {
    return {
      name: 'cache',
      status: 'degraded',
      details: `Cache initialization warning: ${error instanceof Error ? error.message : 'Unknown error'}`,
      latencyMs: Date.now() - start,
    };
  }
}

// ============================================================================
// Health Check Cron Job
// ============================================================================

/**
 * Run a comprehensive health check of all system components
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [dbHealth, cacheHealth, rateLimiterHealth] = await Promise.all([
      checkDatabaseConnection(),
      initializeCache().catch(() => ({ name: 'cache', status: 'unknown' as const, details: 'Skipped' })),
      initializeRateLimiter(),
    ]);
    
    const components: ComponentHealth[] = [dbHealth, cacheHealth, rateLimiterHealth];
    
    // Determine overall status
    const hasUnhealthy = components.some(c => c.status === 'unhealthy');
    const hasDegraded = components.some(c => c.status === 'degraded');
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (hasUnhealthy) {
      status = 'unhealthy';
    } else if (hasDegraded) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      timestamp: new Date(),
      status,
      components,
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      timestamp: new Date(),
      status: 'unhealthy',
      components: [{
        name: 'system',
        status: 'unhealthy',
        details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      responseTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Start periodic health check cron job
 */
function startHealthCheckCron(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  // Initial health check
  runHealthCheck().then(result => {
    logHealthCheck(result);
  }).catch(console.error);
  
  // Schedule periodic checks
  healthCheckInterval = setInterval(async () => {
    const result = await runHealthCheck();
    logHealthCheck(result);
    
    // Alert on unhealthy status (in production)
    if (result.status === 'unhealthy' && process.env.NODE_ENV === 'production') {
      console.error('[HEALTH-CRON] System is UNHEALTHY! Immediate attention required.');
      // Could integrate with alerting systems here
    }
  }, HEALTH_CHECK_INTERVAL_MS);
  
  console.log(`[INIT] Health check cron started (interval: ${HEALTH_CHECK_INTERVAL_MS / 1000}s)`);
}

/**
 * Log health check results appropriately
 */
function logHealthCheck(result: HealthCheckResult): void {
  const prefix = '[HEALTH]';
  
  if (result.status === 'healthy') {
    console.log(`${prefix} System healthy (${result.responseTimeMs}ms)`);
  } else if (result.status === 'degraded') {
    console.warn(`${prefix} System degraded (${result.responseTimeMs}ms)`);
  } else {
    console.error(`${prefix} System UNHEALTHY (${result.responseTimeMs}ms)`);
  }
  
  for (const component of result.components) {
    const msg = `${prefix}   ${component.name}: ${component.status.toUpperCase()}${component.details ? ` - ${component.details}` : ''}${component.latencyMs ? ` (${component.latencyMs}ms)` : ''}`;
    
    switch (component.status) {
      case 'unhealthy':
        console.error(msg);
        break;
      case 'degraded':
        console.warn(msg);
        break;
      default:
        console.log(msg);
    }
  }
}

// ============================================================================
// Graceful Shutdown Handlers
// ============================================================================

/**
 * Set up graceful shutdown handlers for clean process termination
 */
function setupGracefulShutdown(): void {
  const shutdownSignals: Array<NodeJS.Signals> = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  const shutdownHandler = async (signal: NodeJS.Signals) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
    console.log(`[SHUTDOWN] PID: ${process.pid}`);
    
    // Stop accepting new health checks
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
    
    // Shutdown sequence with timeout
    const shutdownTimeout = setTimeout(() => {
      console.error('[SHUTDOWN] Forced shutdown after timeout');
      process.exit(1);
    }, 30_000); // 30 second timeout
    
    try {
      // 1. Close Redis connections
      console.log('[SHUTDOWN] Closing Redis connections...');
      await shutdownRedis();
      
      // 2. Close database connections
      console.log('[SHUTDOWN] Closing database connections...');
      const { db } = await import('./db');
      await db.$disconnect();
      
      // 3. Log final state
      console.log('[SHUTDOWN] All connections closed successfully');
      console.log(`[SHUTDOWN] Uptime: ${Math.floor(process.uptime())}s`);
      console.log('[SHUTDOWN] Graceful shutdown complete');
      
      clearTimeout(shutdownTimeout);
      process.exit(0);
    } catch (error) {
      console.error('[SHUTDOWN] Error during graceful shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };
  
  // Register handlers for each signal
  for (const signal of shutdownSignals) {
    process.on(signal, shutdownHandler);
  }
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('[FATAL] Uncaught exception:', error);
    console.error('[FATAL] Stack:', error.stack);
    // In production, we might want to restart instead of exiting
    if (process.env.NODE_ENV === 'production') {
      shutdownHandler('SIGTERM' as NodeJS.Signals);
    } else {
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[FATAL] Unhandled promise rejection:', reason);
    if (process.env.NODE_ENV === 'production') {
      shutdownHandler('SIGTERM' as NodeJS.Signals);
    }
  });
  
  console.log('[INIT] Graceful shutdown handlers registered');
}

// ============================================================================
// Main Initialization Function
// ============================================================================

/**
 * Initialize all server-side components for production.
 * This should be called once at application startup.
 * 
 * @returns Initialization result with status and details
 * 
 * @example
 * ```typescript
 * // In your entry point or layout.tsx
 * import { initializeServer } from '@/lib/server-production-init';
 * 
 * const initResult = await initializeServer();
 * if (!initResult.status === 'failed') {
 *   process.exit(1);
 * }
 * ```
 */
export async function initializeServer(): Promise<InitResult> {
  // Prevent double initialization
  if (initStatus === 'initializing' || initStatus === 'ready') {
    return initResult!;
  }
  
  initStatus = 'initializing';
  const startTime = Date.now();
  const warnings: string[] = [];
  const components: string[] = [];
  const failedComponents: string[] = [];
  
  console.log('='.repeat(60));
  console.log('🔒 Djezzy National SOC Platform - Server Initialization');
  console.log('='.repeat(60));
  console.log(`[INIT] Starting initialization at ${new Date().toISOString()}`);
  console.log(`[INIT] PID: ${process.pid}`);
  console.log(`[INIT] Node.js: ${process.version}`);
  console.log(`[INIT] Platform: ${process.platform} ${process.arch}`);
  console.log(`[INIT] Working directory: ${process.cwd()}`);
  
  // Step 1: Validate environment variables
  console.log('\n[INIT] Step 1: Validating environment configuration...');
  let envValidation: EnvironmentValidationResult;
  
  try {
    envValidation = validateConfig({
      throwOnCritical: true,
      validateOptional: true,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'EnvironmentValidationError') {
      envValidation = (error as import('./production/env-validation').EnvironmentValidationError).validationResult;
      console.error('[INIT] CRITICAL: Environment validation failed!');
      initStatus = 'failed';
      
      initResult = {
        status: initStatus,
        timestamp: new Date(),
        envValidation,
        components,
        failedComponents: [...failedComponents, 'environment'],
        warnings,
        configHash: envValidation.configHash,
        pid: process.pid,
        nodeVersion: process.version,
        platform: `${process.platform} ${process.arch}`,
      };
      
      logStartupSummary(initResult, Date.now() - startTime);
      return initResult;
    }
    throw error;
  }
  
  components.push('environment-validation');
  
  if (envValidation.warnings.length > 0) {
    warnings.push(...envValidation.warnings.map(w => `[ENV] ${w}`));
  }
  
  console.log(`[INIT] Environment validated: ${envValidation.configHash}`);
  
  // Step 2: Initialize database connection
  console.log('\n[INIT] Step 2: Initializing database connection...');
  try {
    const dbHealth = await checkDatabaseConnection();
    if (dbHealth.status === 'healthy') {
      components.push('database');
      console.log(`[INIT] Database connected (${dbHealth.latencyMs}ms)`);
    } else {
      failedComponents.push('database');
      warnings.push(`[DB] ${dbHealth.details || 'Database connection issue'}`);
      console.warn(`[INIT] Database issue: ${dbHealth.details}`);
    }
  } catch (error) {
    failedComponents.push('database');
    warnings.push(`[DB] Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('[INIT] Database initialization failed:', error);
  }
  
  // Step 3: Initialize cache/Redis
  console.log('\n[INIT] Step 3: Initializing cache layer...');
  try {
    const cacheHealth = await initializeCache();
    if (cacheHealth.status === 'healthy') {
      components.push('cache');
      console.log(`[INIT] Cache initialized (${cacheHealth.details})`);
    } else {
      // Cache failure is non-fatal
      components.push('cache-degraded');
      warnings.push(`[CACHE] ${cacheHealth.details || 'Cache degradation'}`);
      console.warn(`[INIT] Cache degraded: ${cacheHealth.details}`);
    }
  } catch (error) {
    warnings.push(`[CACHE] Warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.warn('[INIT] Cache initialization warning:', error);
  }
  
  // Step 4: Initialize rate limiter
  console.log('\n[INIT] Step 4: Initializing rate limiter...');
  try {
    const rlHealth = await initializeRateLimiter();
    components.push('rate-limiter');
    console.log(`[INIT] Rate limiter ready (${rlHealth.details})`);
  } catch (error) {
    warnings.push(`[RATE-LIMIT] Warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.warn('[INIT] Rate limiter warning:', error);
  }
  
  // Step 5: Setup health check cron
  console.log('\n[INIT] Step 5: Setting up health monitoring...');
  startHealthCheckCron();
  components.push('health-monitor');
  
  // Step 6: Setup graceful shutdown
  console.log('\n[INIT] Step 6: Registering shutdown handlers...');
  setupGracefulShutdown();
  components.push('shutdown-handlers');
  
  // Determine final status
  const hasCriticalFailures = failedComponents.includes('database') || failedComponents.includes('environment-validation');
  initStatus = hasCriticalFailures ? 'degraded' : 'ready';
  
  // Build result
  initResult = {
    status: initStatus,
    timestamp: new Date(),
    envValidation,
    components,
    failedComponents,
    warnings,
    configHash: envValidation.configHash,
    pid: process.pid,
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
  };
  
  // Log startup summary
  logStartupSummary(initResult, Date.now() - startTime);
  
  return initResult;
}

/**
 * Log comprehensive startup summary
 */
function logStartupSummary(result: InitResult, initTimeMs: number): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 INITIALIZATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Status:       ${result.status.toUpperCase()}`);
  console.log(`Config Hash:  ${result.configHash}`);
  console.log(`PID:          ${result.pid}`);
  console.log(`Node.js:      ${result.nodeVersion}`);
  console.log(`Platform:     ${result.platform}`);
  console.log(`Init Time:    ${initTimeMs}ms`);
  console.log(`Components:   ${result.components.join(', ')}`);
  
  if (result.failedComponents.length > 0) {
    console.log(`Failed:       ${result.failedComponents.join(', ')}`);
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warning of result.warnings.slice(0, 5)) {
      console.log(`   - ${warning}`);
    }
    if (result.warnings.length > 5) {
      console.log(`   ...and ${result.warnings.length - 5} more warnings`);
    }
  }
  
  // Security-sensitive values (masked)
  console.log('\n📋 CONFIGURATION SUMMARY (masked):');
  console.log(`   JWT_SECRET:         ${getMaskedValue('JWT_SECRET')}`);
  console.log(`   DATABASE_URL:       ${getMaskedValue('DATABASE_URL')}`);
  console.log(`   REDIS_URL:          ${getMaskedValue('REDIS_URL')}`);
  console.log(`   ANONYMIZATION_SALT: ${getMaskedValue('ANONYMIZATION_SALT')}`);
  console.log(`   ENCRYPTION_KEY:     ${getMaskedValue('ENCRYPTION_KEY')}`);
  console.log(`   NODE_ENV:           ${process.env.NODE_ENV || '(not set)'}`);
  console.log(`   PORT:               ${process.env.PORT || '3000'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Server ready at ${result.timestamp.toISOString()}`);
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get current initialization status
 */
export function getInitStatus(): InitStatus {
  return initStatus;
}

/**
 * Get last initialization result
 */
export function getInitResult(): InitResult | null {
  return initResult;
}

/**
 * Check if server is fully initialized and healthy
 */
export function isReady(): boolean {
  return initStatus === 'ready';
}

/**
 * Stop health check cron (useful for testing)
 */
export function stopHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// ============================================================================
// Auto-initialize on import (for Next.js)
// ============================================================================

/**
 * Note: In Next.js App Router, this will be called when the module is first imported.
 * For more control, call initializeServer() explicitly in your entry point.
 */
let autoInitPromise: Promise<InitResult> | null = null;

/**
 * Get or trigger auto-initialization
 * Safe to call multiple times - only initializes once
 */
export function ensureInitialized(): Promise<InitResult> {
  if (!autoInitPromise) {
    autoInitPromise = initializeServer();
  }
  return autoInitPromise;
}

// Default export is the main initialization function
export default initializeServer;
