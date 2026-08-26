/**
 * Shipping API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides endpoints for log shipping configuration and management:
 * - GET /api/logging/shipping/status - Shipper status
 * - GET /api/logging/shipping/configurations - Source configs
 * - PUT /api/logging/shipping/configuration - Update config
 * - POST /api/logging/shipping/test - Test shipper
 * - GET /api/logging/shipping/backlog - Unsent logs queue
 * - POST /api/logging/shipping/flush - Force send backlog
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  LogTransportType,
  TransportConfig,
  TransportStatus,
  ShipperStatus,
  BacklogInfo,
  ShippingConfiguration,
  ShippingStats,
  LogSource,
  LogLevel,
  getTimestamp,
  generateId
} from '../../types/logging.types';

// ============================================================================
// IN-MEMORY SHIPPING STATE (for development/demo)
// ============================================================================

/** Sample shipping configurations */
const shippingConfigurations: ShippingConfiguration[] = [
  {
    id: 'ship-config-001',
    name: 'Production Elasticsearch',
    sources: Object.values(LogSource),
    minLevel: LogLevel.INFO,
    transports: [
      {
        type: LogTransportType.ELASTICSEARCH,
        enabled: true,
        minLevel: LogLevel.DEBUG,
        bufferSize: 100,
        flushIntervalMs: 5000,
        retry: { maxRetries: 3, initialDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          nodes: ['https://elasticsearch.soc.dz:9200'],
          indexPattern: 'soc-logs-{date}',
          auth: { username: 'soc-logger', password: '***' },
          timeout: 30000,
          sniffOnStart: true,
          tls: { rejectUnauthorized: true }
        }
      },
      {
        type: LogTransportType.FILE,
        enabled: true,
        minLevel: LogLevel.DEBUG,
        bufferSize: 50,
        flushIntervalMs: 10000,
        retry: { maxRetries: 2, initialDelayMs: 500, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          logDirectory: '/var/log/soc-platform',
          filenamePattern: 'soc-{date}.log',
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxFiles: 30,
          compress: true,
          encoding: 'utf8'
        }
      }
    ],
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: getTimestamp(),
    stats: {
      totalShipped: 1547823,
      totalFailed: 234,
      backlogSize: 47,
      lastShippedAt: getTimestamp(),
      avgLatencyMs: 23,
      bytesShipped: 2.4 * 1024 * 1024 * 1024 // 2.4 GB
    }
  },
  {
    id: 'ship-config-002',
    name: 'Security Events to SIEM',
    sources: [LogSource.SECURITY, LogSource.SECURITY_ALERT, LogSource.SECURITY_INCIDENT, LogSource.WAZUH, LogSource.SURICATA],
    minLevel: LogLevel.INFO,
    transports: [
      {
        type: LogTransportType.HTTP,
        enabled: true,
        minLevel: LogLevel.INFO,
        bufferSize: 25,
        flushIntervalMs: 2000,
        retry: { maxRetries: 5, initialDelayMs: 500, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          endpoint: 'https://siem-collector.soc.dz/api/v1/logs',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '***masked***'
          },
          timeout: 15000
        }
      }
    ],
    active: true,
    createdAt: '2026-01-15T10:30:00Z',
    updatedAt: getTimestamp(),
    stats: {
      totalShipped: 892341,
      totalFailed: 89,
      backlogSize: 12,
      lastShippedAt: getTimestamp(),
      avgLatencyMs: 45,
      bytesShipped: 890 * 1024 * 1024 // 890 MB
    }
  },
  {
    id: 'ship-config-003',
    name: 'Audit Trail Archive',
    sources: [LogSource.AUDIT],
    minLevel: LogLevel.INFO,
    transports: [
      {
        type: LogTransportType.ELASTICSEARCH,
        enabled: true,
        minLevel: LogLevel.INFO,
        bufferSize: 200,
        flushIntervalMs: 30000,
        retry: { maxRetries: 5, initialDelayMs: 2000, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          nodes: ['https://archive-elasticsearch.soc.dz:9200'],
          indexPattern: 'audit-trail-{date}',
          auth: { apiKey: '***masked***' },
          timeout: 60000,
          sniffOnStart: false
        }
      }
    ],
    active: true,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: getTimestamp(),
    stats: {
      totalShipped: 45678,
      totalFailed: 2,
      backlogSize: 5,
      lastShippedAt: getTimestamp(),
      avgLatencyMs: 156,
      bytesShipped: 45 * 1024 * 1024 // 45 MB
    }
  }
];

/** Simulated current shipper status */
function getCurrentShipperStatus(): ShipperStatus {
  return {
    status: 'healthy', // Would be calculated from actual transport health
    transports: [
      {
        type: LogTransportType.ELASTICSEARCH,
        connected: true,
        healthy: true,
        lastSuccessAt: getTimestamp(),
        entriesProcessed: shippingConfigurations[0].stats.totalShipped,
        entriesFailed: shippingConfigurations[0].stats.totalFailed
      },
      {
        type: LogTransportType.FILE,
        connected: true,
        healthy: true,
        lastSuccessAt: getTimestamp(),
        entriesProcessed: Math.floor(shippingConfigurations[0].stats.totalShipped * 0.95),
        entriesFailed: 0
      },
      {
        type: LogTransportType.HTTP,
        connected: true,
        healthy: true,
        lastSuccessAt: getTimestamp(),
        entriesProcessed: shippingConfigurations[1].stats.totalShipped,
        entriesFailed: shippingConfigurations[1].stats.totalFailed
      }
    ],
    backlog: {
      totalEntries: shippingConfigurations.reduce((sum, c) => sum + c.stats.backlogSize, 0),
      oldestEntryAgeMs: 45000, // 45 seconds
      estimatedClearTimeMs: 120000, // 2 minutes at current rate
      bySource: {
        [LogSource.SECURITY]: 15,
        [LogSource.API]: 12,
        [LogSource.APPLICATION]: 10,
        [LogSource.AUTH]: 7,
        [LogSource.SYSTEM]: 3
      } as Record<LogSource, number>
    },
    uptimePercent: 99.97,
    lastCheckAt: getTimestamp()
  };
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET /api/logging/shipping
 * 
 * Main endpoint for shipping management.
 * Query Parameters:
 * - action: One of: status, configurations, backlog, test-result
 * - configId: Specific configuration ID (for single config queries)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const configId = searchParams.get('configId');
    
    switch (action) {
      case 'status':
        return handleGetStatus();
      
      case 'configurations':
        if (configId) {
          return handleGetSingleConfig(configId);
        }
        return handleGetAllConfigs();
      
      case 'backlog':
        return handleGetBacklog();
      
      case 'test-result':
        const testId = searchParams.get('testId');
        if (!testId) {
          return NextResponse.json(
            { success: false, error: 'testId parameter is required' },
            { status: 400 }
          );
        }
        return handleGetTestResult(testId);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('[ShippingAPI] Error handling GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/logging/shipping/configuration
 * 
 * Update a shipping configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, updates } = body;
    
    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'configId is required' },
        { status: 400 }
      );
    }
    
    const configIndex = shippingConfigurations.findIndex(c => c.id === configId);
    if (configIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    // Apply updates (in production, would validate and save)
    const updatedConfig = {
      ...shippingConfigurations[configId],
      ...updates,
      id: configId, // Prevent ID change
      updatedAt: getTimestamp()
    };
    
    shippingConfigurations[configIndex] = updatedConfig;
    
    // Log the configuration change
    try {
      const { recordAudit } = await import('../../lib/audit-trail');
      await recordAudit({
        action: 'CONFIG_CHANGE' as any,
        actor: { id: 'system-api', type: 'service' as any, displayName: 'Shipping API' },
        resource: { type: 'configuration' as any, id: configId, name: updatedConfig.name },
        outcome: 'success' as any,
        description: `Updated shipping configuration: ${updatedConfig.name}`
      });
    } catch {
      // Audit logging is best-effort
    }
    
    return NextResponse.json({
      success: true,
      data: updatedConfig,
      meta: { updatedAt: getTimestamp() }
    });
    
  } catch (error) {
    console.error('[ShippingAPI] Error handling PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * POST /api/logging/shipping
 * 
 * Perform actions on shipping system:
 * - test: Test a shipper connection
 * - flush: Force flush all backlogs
 * - create: Create new configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'test':
        return handleTestShipper(body);
      
      case 'flush':
        return handleFlushBacklog(body);
      
      case 'create':
        return handleCreateConfig(body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('[ShippingAPI] Error handling POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// ============================================================================
// HANDLER IMPLEMENTATIONS
// ============================================================================

/**
 * Handle GET /api/logging/shipping?action=status
 */
function handleGetStatus(): NextResponse {
  const status = getCurrentShipperStatus();
  
  // Calculate aggregate statistics
  const totalStats = shippingConfigurations.reduce(
    (acc, config) => ({
      totalShipped: acc.totalShipped + config.stats.totalShipped,
      totalFailed: acc.totalFailed + config.stats.totalFailed,
      bytesShipped: acc.bytesShipped + config.stats.bytesShipped
    }),
    { totalShipped: 0, totalFailed: 0, bytesShipped: 0 }
  );
  
  return NextResponse.json({
    success: true,
    data: {
      ...status,
      summary: {
        activeConfigurations: shippingConfigurations.filter(c => c.active).length,
        totalConfigurations: shippingConfigurations.length,
        ...totalStats,
        overallSuccessRate: totalStats.totalShipped > 0
          ? ((totalStats.totalShipped / (totalStats.totalShipped + totalStats.totalFailed)) * 100).toFixed(2)
          : '100.00'
      }
    },
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle GET /api/logging/shipping?action=configurations
 */
function handleGetAllConfigs(): NextResponse {
  // Return configs without sensitive data
  const safeConfigs = shippingConfigurations.map(config => ({
    ...config,
    transports: config.transports.map(transport => ({
      ...transport,
      options: sanitizeTransportOptions(transport.options)
    }))
  }));
  
  return NextResponse.json({
    success: true,
    data: safeConfigs,
    meta: { queriedAt: getTimestamp(), count: safeConfigs.length }
  });
}

/**
 * Handle GET /api/logging/shipping?configId=xxx&action=configurations
 */
function handleGetSingleConfig(configId: string): NextResponse {
  const config = shippingConfigurations.find(c => c.id === configId);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: 'Configuration not found' },
      { status: 404 }
    );
  }
  
  // Return config without sensitive data
  const safeConfig = {
    ...config,
    transports: config.transports.map(transport => ({
      ...transport,
      options: sanitizeTransportOptions(transport.options)
    }))
  };
  
  return NextResponse.json({
    success: true,
    data: safeConfig,
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle GET /api/logging/shipping?action=backlog
 */
function handleGetBacklog(): NextResponse {
  const status = getCurrentShipperStatus();
  
  // Get detailed backlog by configuration
  const backlogByConfig = shippingConfigurations.map(config => ({
    configId: config.id,
    configName: config.name,
    backlogSize: config.stats.backlogSize,
    oldestEntryEstimate: config.stats.backlogSize > 0 ? getTimestamp() : null,
    transports: config.transports.map(t => ({
      type: t.type,
      enabled: t.enabled,
      estimatedBacklog: Math.floor(config.stats.backlogSize / config.transports.length)
    }))
  }));
  
  return NextResponse.json({
    success: true,
    data: {
      total: status.backlog,
      byConfiguration: backlogByConfig,
      recommendations: generateBacklogRecommendations(status.backlog.totalEntries)
    },
    meta: { queriedAt: getTimestamp() }
  });
}

/**
 * Handle GET /api/logging/shipping?action=test-result&testId=xxx
 */
function handleGetTestResult(testId: string): NextResponse {
  // In production, would look up actual test result
  // For demo, simulate a recent test result
  
  const testResults: Record<string, object> = {
    'test-recent': {
      testId: 'test-recent',
      status: 'success',
      testedAt: getTimestamp(),
      transportType: LogTransportType.ELASTICSEARCH,
      target: 'elasticsearch.soc.dz:9200',
      latencyMs: 23,
      message: 'Connection successful. Cluster health: GREEN.',
      details: {
        clusterName: 'soc-production',
        version: '8.11.0',
        nodeCount: 5,
        indexCount: 156
      }
    },
    'test-failed': {
      testId: 'test-failed',
      status: 'failure',
      testedAt: new Date(Date.now() - 3600000).toISOString(),
      transportType: LogTransportType.HTTP,
      target: 'siem-collector.soc.dz',
      latencyMs: null,
      message: 'Connection failed: ECONNREFUSED',
      details: {
        errorCode: 'ECONNREFUSED',
        address: 'siem-collector.soc.dz',
        port: 443
      }
    }
  };
  
  const result = testResults[testId];
  
  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Test result not found or expired' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ success: true, data: result });
}

/**
 * Handle POST /api/logging/shipping with action=test
 */
async function handleTestShipper(body: Record<string, unknown>): Promise<NextResponse> {
  const { configId, transportType, options } = body;
  
  const testId = generateId().slice(0, 8);
  
  // Simulate testing (in production, would actually attempt connection)
  const isSuccess = Math.random() > 0.1; // 90% success rate for demo
  
  // Simulate delay for realistic response
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
  
  const result = {
    testId,
    status: isSuccess ? 'success' : 'failure',
    testedAt: getTimestamp(),
    transportType: transportType || LogTransportType.ELASTICSEARCH,
    target: (options as Record<string, unknown>)?.nodes?.[0] || 
            (options as Record<string, unknown>)?.endpoint || 'unknown',
    latencyMs: isSuccess ? Math.round(10 + Math.random() * 50) : null,
    message: isSuccess 
      ? 'Connection successful. Transport ready.'
      : 'Connection failed: Connection timed out',
    details: isSuccess ? {
      responseCode: 200,
      serverVersion: '8.11.0'
    } : {
      errorCode: 'ETIMEDOUT',
      suggestion: 'Verify network connectivity and firewall rules'
    }
  };
  
  return NextResponse.json({
    success: true,
    data: result,
    meta: { testCompletedAt: getTimestamp() }
  });
}

/**
 * Handle POST /api/logging/shipping with action=flush
 */
async function handleFlushBacklog(body: Record<string, unknown>): Promise<NextResponse> {
  const { configId, force } = body;
  
  let flushedCount = 0;
  let errors: string[] = [];
  
  if (configId) {
    // Flush specific configuration
    const config = shippingConfigurations.find(c => c.id === configId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    flushedCount = config.stats.backlogSize;
    config.stats.backlogSize = 0;
    config.stats.lastShippedAt = getTimestamp();
  } else {
    // Flush all configurations
    for (const config of shippingConfigurations) {
      if (config.active || force) {
        flushedCount += config.stats.backlogSize;
        config.stats.backlogSize = 0;
        config.stats.lastShippedAt = getTimestamp();
      }
    }
  }
  
  // Simulate flush operation time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return NextResponse.json({
    success: true,
    data: {
      flushedCount,
      message: `${flushedCount} log entries flushed successfully`,
      timestamp: getTimestamp()
    },
    meta: { flushedAt: getTimestamp() }
  });
}

/**
 * Handle POST /api/logging/shipping with action=create
 */
function handleCreateConfig(body: Record<string, unknown>): NextResponse {
  const { name, sources, minLevel, transports } = body;
  
  if (!name || !transports) {
    return NextResponse.json(
      { success: false, error: 'name and transports are required' },
      { status: 400 }
    );
  }
  
  const newConfig: ShippingConfiguration = {
    id: generateId(),
    name: name as string,
    sources: (sources as LogSource[]) || Object.values(LogSource),
    minLevel: (minLevel as LogLevel) || LogLevel.INFO,
    transports: transports as TransportConfig[],
    active: true,
    createdAt: getTimestamp(),
    updatedAt: getTimestamp(),
    stats: {
      totalShipped: 0,
      totalFailed: 0,
      backlogSize: 0,
      avgLatencyMs: 0,
      bytesShipped: 0
    }
  };
  
  shippingConfigurations.push(newConfig);
  
  return NextResponse.json({
    success: true,
    data: newConfig,
    meta: { createdAt: getTimestamp() }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Remove sensitive information from transport options
 */
function sanitizeTransportOptions(options: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...options };
  
  // Mask sensitive fields
  if (sanitized.password) sanitized.password = '***';
  if ((sanitized.auth as Record<string, unknown>)?.password) {
    (sanitized.auth as Record<string, unknown>).password = '***';
  }
  if ((sanitized.auth as Record<string, unknown>)?.apiKey) {
    (sanitized.auth as Record<string, unknown>).apiKey = '***';
  }
  if ((sanitized.auth as Record<string, unknown>)?.bearerToken) {
    (sanitized.auth as Record<string, unknown>).bearerToken = '***';
  }
  if ((sanitized.headers as Record<string, unknown>)?.['X-API-Key']) {
    (sanitized.headers as Record<string, unknown>)['X-API-Key'] = '***';
  }
  if ((sanitized.credentials as Record<string, unknown>)?.secretAccessKey) {
    (sanitized.credentials as Record<string, unknown>).secretAccessKey = '***';
  }
  
  return sanitized;
}

/**
 * Generate recommendations based on backlog state
 */
function generateBacklogRecommendations(totalBacklog: number): string[] {
  const recommendations: string[] = [];
  
  if (totalBacklog > 1000) {
    recommendations.push('CRITICAL: Backlog size exceeds 1000 entries. Immediate investigation required.');
    recommendations.push('Consider increasing transport buffer size or reducing flush interval.');
  } else if (totalBacklog > 100) {
    recommendations.push('WARNING: Backlog growing. Monitor closely.');
    recommendations.push('Review transport health and network connectivity.');
  } else if (totalBacklog > 10) {
    recommendations.push('INFO: Normal backlog levels detected.');
  } else {
    recommendations.push('OK: Backlog within acceptable limits.');
  }
  
  return recommendations;
}
