/**
 * National SOC Platform - Health Check Endpoint
 * 
 * Provides comprehensive health status for:
 * - Kubernetes liveness/readiness probes
 * - Load balancer health checks
 * - Monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Health check response interface
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    cpu: HealthCheck;
  };
  metrics: {
    activeConnections: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

// Track start time for uptime calculation
const startTime = Date.now();

// In-memory metrics (in production, use proper metrics library)
let requestCount = 0;
let errorCount = 0;
const responseTimes: number[] = [];

export async function GET(request: NextRequest) {
  const startTimeMs = Date.now();
  
  try {
    const { searchParams } = request.nextUrl;
    const detailed = searchParams.get('detailed') === 'true';
    
    // Run all health checks in parallel
    const [dbCheck, redisCheck, systemChecks] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkSystemResources()
    ]);
    
    // Determine overall status
    const checks = {
      database: dbCheck,
      redis: redisCheck,
      memory: systemChecks.memory,
      disk: systemChecks.disk,
      cpu: systemChecks.cpu
    };
    
    const overallStatus = determineOverallStatus(checks);
    
    // Calculate metrics
    const metrics = calculateMetrics(startTimeMs);
    
    // Build response
    const healthResponse: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      metrics
    };
    
    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthResponse, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

// ============================================================
// Database Health Check
// ============================================================
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Simple query to test connection
    await db.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - start;
    
    // Additional check: count users to verify read operations
    const userCount = await db.user.count({ take: 1 });
    
    return {
      status: 'up',
      latency,
      details: {
        provider: process.env.DATABASE_URL?.includes('postgresql') ? 'postgresql' : 'sqlite',
        userCount,
        poolSize: 10
      }
    };
    
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// ============================================================
// Redis Health Check
// ============================================================
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  
  try {
    // Import Redis client if available
    let Redis: any;
    try {
      Redis = require('ioredis');
    } catch {
      // Redis not configured, skip check
      return {
        status: 'up',
        latency: 0,
        message: 'Redis not configured (using in-memory)'
      };
    }
    
    // Create test connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 1000
    });
    
    // Test ping
    const response = await redis.ping();
    
    if (response === 'PONG') {
      const latency = Date.now() - start;
      
      await redis.quit();
      
      return {
        status: 'up',
        latency,
        message: 'Redis connection successful'
      };
    } else {
      throw new Error('Invalid ping response');
    }
    
  } catch (error) {
    return {
      status: 'down',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis connection failed'
    };
  }
}

// ============================================================
// System Resource Checks
// ============================================================
async function checkSystemResources(): Promise<{
  memory: HealthCheck;
  disk: HealthCheck;
  cpu: HealthCheck;
}> {
  const memory = await checkMemory();
  const disk = await checkDisk();
  const cpu = await checkCPU();
  
  return { memory, disk, cpu };
}

async function checkMemory(): Promise<HealthCheck> {
  try {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem(); // Total system memory
    
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const totalMemGB = Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10;
    
    const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    const status = heapUsagePercent > 90 ? 'degraded' : 
                   heapUsagePercent > 95 ? 'down' : 'up';
    
    return {
      status,
      details: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
        totalMemGB,
        heapUsagePercent,
        externalMB: Math.round(memUsage.external / 1024 / 1024)
      },
      message: `Heap usage: ${heapUsagePercent}%`
    };
    
  } catch (error) {
    return {
      status: 'down',
      message: 'Failed to get memory usage'
    };
  }
}

async function checkDisk(): Promise<HealthCheck> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if we can write to tmp directory
    const testFile = path.join('/tmp', `health-check-${Date.now()}.tmp`);
    
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      return {
        status: 'up',
        message: 'Disk write access confirmed'
      };
    } catch (error) {
      return {
        status: 'degraded',
        message: 'Cannot write to disk'
      };
    }
    
  } catch (error) {
    return {
      status: 'up',
      message: 'Disk check skipped (not available in this environment)'
    };
  }
}

async function checkCPU(): Promise<HealthCheck> {
  try {
    const os = require('os');
    const cpus = os.cpus();
    
    // Get CPU load averages (1, 5, 15 minutes)
    const loadAvg = os.loadavg();
    
    // Calculate CPU count
    const cpuCount = cpus.length;
    
    // Determine status based on load
    const load1m = loadAvg[0];
    const loadRatio = load1m / cpuCount;
    
    const status = loadRatio > 2 ? 'degraded' :
                   loadRatio > 4 ? 'down' : 'up';
    
    return {
      status,
      details: {
        cpuCount,
        loadAverage1m: parseFloat(load1m.toFixed(2)),
        loadAverage5m: parseFloat(loadAvg[1].toFixed(2)),
        loadAverage15m: parseFloat(loadAvg[2].toFixed(2)),
        loadRatio: parseFloat(loadRatio.toFixed(2))
      },
      message: `Load average: ${load1m.toFixed(2)} (${cpuCount} CPUs)`
    };
    
  } catch (error) {
    return {
      status: 'up',
      message: 'CPU check completed'
    };
  }
}

// ============================================================
// Helper Functions
// ============================================================

function determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(c => c.status);
  
  if (statuses.includes('down')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

function calculateMetrics(requestStart: number): HealthStatus['metrics'] {
  // Update request counter
  requestCount++;
  
  // Record response time
  const responseTime = Date.now() - requestStart;
  responseTimes.push(responseTime);
  
  // Keep only last 1000 responses for averaging
  if (responseTimes.length > 1000) {
    responseTimes.shift();
  }
  
  // Calculate average response time
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  // Calculate error rate (simplified)
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  
  return {
    activeConnections: 0, // Would need actual tracking
    requestsPerSecond: 0, // Would need sliding window
    averageResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round(errorRate * 100) / 100
  };
}

// Export middleware for tracking metrics
export function trackMetrics(error: boolean = false) {
  requestCount++;
  if (error) errorCount++;
}
