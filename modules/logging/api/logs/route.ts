/**
 * Logs API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides endpoints for centralized log management:
 * - GET /api/logging/logs - Search and retrieve logs
 * - GET /api/logging/logs/sources - Available log sources
 * - GET /api/logging/logs/levels - Log level distribution
 * - GET /api/logging/logs/stats - Log statistics
 * - POST /api/logging/logs/query - Advanced query execution
 * - GET /api/logging/logs/export - Export logs (JSON, CSV)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  LogLevel,
  LogLevelConfig,
  LogSource,
  LogSourceConfig,
  LogEntry,
  LogSearchFilters,
  PaginationParams,
  LogSearchResult,
  LogAggregations,
  TimeBucket,
  PaginationInfo,
  ExportFormat,
  Environment,
  generateId,
  getTimestamp
} from '../../types/logging.types';

// ============================================================================
// IN-MEMORY LOG STORE (for development/demo)
// ============================================================================

/** Sample log entries for demonstration */
const sampleLogEntries: LogEntry[] = generateSampleLogs();

function generateSampleLogs(): LogEntry[] {
  const now = new Date();
  const entries: LogEntry[] = [];
  
  const samples = [
    { level: LogLevel.INFO, source: LogSource.AUTH_LOGIN, message: 'User admin_soc successfully authenticated', hoursAgo: 0.1, data: { userId: 'user-001', method: 'LDAP', mfaVerified: true }, userId: 'user-001' },
    { level: LogLevel.INFO, source: LogSource.API_REQUEST, message: 'GET /api/alerts - Request received', hoursAgo: 0.15, data: { method: 'GET', path: '/api/alerts', statusCode: 200, durationMs: 45 }, requestId: 'req-001' },
    { level: LogLevel.WARN, source: LogSource.SECURITY_ALERT, message: 'Multiple failed login attempts detected from IP 91.121.87.102', hoursAgo: 0.5, data: { ip: '91.121.87.102', attempts: 15, windowMinutes: 5 }, clientIp: '91.121.87.102' },
    { level: LogLevel.ERROR, source: LogSource.SURICATA, message: 'Signature alert: ET TROJAN Possible Win.Trojan.GenericDKZ Connection', hoursAgo: 0.8, data: { signatureId: 2029841, severity: 1, srcIp: '192.168.1.100', dstIp: '185.141.63.78', dstPort: 443 } },
    { level: LogLevel.CRITICAL, source: LogSource.WAZUH, message: 'Integrity checksum changed for /etc/passwd', hoursAgo: 1.2, data: { agentId: '001', file: '/etc/passwd', action: 'modified', oldHash: 'abc123...', newHash: 'def456...' } },
    { level: LogLevel.INFO, source: LogSource.MISP, message: 'Threat intelligence query executed for IOC domain', hoursAgo: 1.5, data: { queryType: 'domain', value: 'malicious-domain.dz', resultsCount: 5 } },
    { level: LogLevel.INFO, source: LogSource.THEHIVE, message: 'Case INC-2026-0042 updated by analyst ahmed_benali', hoursAgo: 2, data: { caseId: 'INC-2026-0042', action: 'status_change', newStatus: 'In_Progress', analyst: 'ahmed_benali' } },
    { level: LogLevel.WARN, source: LogSource.SYSTEM_HEALTH, message: 'Elasticsearch cluster health status: YELLOW', hoursAgo: 2.5, data: { cluster: 'soc-prod', status: 'YELLOW', reason: 'Unassigned shards: 3', nodes: 5 } },
    { level: LogLevel.ERROR, source: LogSource.DATABASE, message: 'Connection pool exhausted - waiting for available connection', hoursAgo: 3, data: { poolSize: 20, activeConnections: 20, waitingThreads: 5, timeoutMs: 30000 } },
    { level: LogLevel.INFO, source: LogSource.AUTH_LOGOUT, message: User fatima_zerhouni logged out successfully, hoursAgo: 3.5, data: { userId: 'user-002', sessionDuration: 28400 }, userId: 'user-002' },
    { level: LogLevel.DEBUG, source: LogSource.APPLICATION, message: 'Scheduled job "log-retention-check" started execution', hoursAgo: 4, data: { jobId: 'job-045', schedule: '0 2 * * *' } },
    { level: LogLevel.INFO, source: LogSource.NETWORK_IDS, message: 'Suricata captured potential DNS tunneling activity', hoursAgo: 4.5, data: { srcIp: '10.0.0.55', queryDomain: 'exfil-data.evil.com', entropyScore: 7.8 } },
    { level: LogLevel.WARN, source: LogSource.API_ERROR, message: 'Rate limit exceeded for API key wazuh-integration-v2', hoursAgo: 5, data: { apiKey: 'wazuh-integration-v2', limit: 1000, currentUsage: 1050, window: '1h' } },
    { level: LogLevel.INFO, source: LogSource.AUDIT_CREATE, message: 'New user account created: amine_bouazza', hoursAgo: 6, data: { targetUserId: 'user-045', createdBy: 'admin_soc', role: 'analyst' } },
    { level: LogLevel.ERROR, source: LogSource.SYSTEM_CONFIG, message: 'Failed to apply configuration change to syslog forwarder', hoursAgo: 8, data: { configId: 'syslog-01', error: 'Connection refused to remote-syslog.dz:514', retryCount: 3 } },
    { level: LogLevel.CRITICAL, source: LogSource.SECURITY_INCIDENT, message: 'NEW INCIDENT CREATED: APT Campaign Detected - Initial Access via Phishing', hoursAgo: 12, data: { incidentId: 'INC-2026-0050', severity: 'critical', ttps: ['T1566', 'T1204'], iocs: 23 } },
    { level: LogLevel.INFO, source: LogSource.GRAFANA, message: 'Dashboard "SOC Operations Overview" accessed by karim_haddad', hoursAgo: 15, data: { dashboardId: 'dash-ops-01', viewer: 'karim_haddad', department: 'management' } },
    { level: LogLevel.DEBUG, source: LogSource.SCHEDULED_JOB, message: 'Report generation completed: Daily Security Summary', hoursAgo: 18, data: { reportId: 'report-daily-' + now.toISOString().split('T')[0], recordsProcessed: 15420, durationMs: 125000 } },
    { level: LogLevel.WARN, source: LogSource.ELASTICSEARCH, message: 'Index soc-logs-2026.01.15 approaching storage threshold (85%)', hoursAgo: 24, data: { index: 'soc-logs-2026.01.15', sizeGB: 850, thresholdGB: 1000, docCount: 45000000 } },
    { level: LogLevel.INFO, source: LogSource.AUTH_MFA, message: 'MFA verification successful for user yacine_kaci using TOTP', hoursAgo: 36, data: { userId: 'user-030', mfaMethod: 'TOTP', deviceTrusted: false }, userId: 'user-030' },
    { level: LogLevel.ERROR, source: LogSource.NETWORK_FIREWALL, message: 'Firewall rule application failed on edge-router-01', hoursAgo: 48, data: { ruleId: 'fw-block-234', action: 'BLOCK', destination: 'edge-router-01', error: 'Timeout waiting for ACK' } }
  ];

  for (const sample of samples) {
    const timestamp = new Date(now.getTime() - sample.hoursAgo * 60 * 60 * 1000).toISOString();
    
    entries.push({
      id: generateId(),
      timestamp,
      level: sample.level,
      source: sample.source,
      message: sample.message,
      data: sample.data as Record<string, unknown>,
      hostname: 'soc-server-01',
      service: 'soc-platform',
      environment: Environment.PRODUCTION,
      version: '2.1.0',
      correlationId: `corr-${generateId().slice(0, 8)}`,
      spanId: `span-${generateId().slice(0, 8)}`,
      ...(sample.userId && { userId: sample.userId }),
      ...(sample.clientIp && { clientIp: sample.clientIp }),
      ...(sample.requestId && { requestId: sample.requestId }),
      tags: ['production', 'algeria-soc']
    });
  }

  // Sort by timestamp descending
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse query parameters from request URL
 */
function parseQueryParams(requestUrl: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const url = new URL(requestUrl);
  
  for (const [key, value] of url.searchParams.entries()) {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

/**
 * Build search filters from query parameters
 */
function buildFiltersFromQuery(params: Record<string, string | string[]>): LogSearchFilters {
  const filters: LogSearchFilters = {};
  
  if (params.query) {
    filters.query = params.query as string;
  }
  
  if (params.levels) {
    const levels = Array.isArray(params.levels) ? params.levels : [params.levels];
    filters.levels = levels.filter(l => Object.values(LogLevel).includes(l as LogLevel)) as LogLevel[];
  }
  
  if (params.sources) {
    const sources = Array.isArray(params.sources) ? params.sources : [params.sources];
    filters.sources = sources.filter(s => Object.values(LogSource).includes(s as LogSource)) as LogSource[];
  }
  
  if (params.startTime) {
    filters.startTime = params.startTime as string;
  }
  
  if (params.endTime) {
    filters.endTime = params.endTime as string;
  }
  
  if (params.correlationId) {
    filters.correlationId = params.correlationId as string;
  }
  
  if (params.userId) {
    filters.userId = params.userId as string;
  }
  
  if (params.clientIp) {
    filters.clientIp = params.clientIp as string;
  }
  
  if (params.tags) {
    const tags = Array.isArray(params.tags) ? params.tags : [params.tags];
    filters.tags = tags as string[];
  }
  
  if (params.hasErrors === 'true') {
    filters.hasErrors = true;
  }
  
  return filters;
}

/**
 * Build pagination parameters from query parameters
 */
function buildPaginationFromQuery(params: Record<string, string | string[]>): PaginationParams {
  return {
    page: parseInt(params.page as string) || 1,
    pageSize: Math.min(parseInt(params.pageSize as string) || 50, 500),
    sortBy: (params.sortBy as keyof LogEntry) || 'timestamp',
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc'
  };
}

/**
 * Search logs based on filters
 */
function searchLogs(filters?: LogSearchFilters, pagination?: PaginationParams): LogSearchResult {
  let results = [...sampleLogEntries];
  
  // Apply text search
  if (filters?.query) {
    const query = filters.query.toLowerCase();
    results = results.filter(entry =>
      entry.message.toLowerCase().includes(query) ||
      JSON.stringify(entry.data)?.toLowerCase().includes(query)
    );
  }
  
  // Filter by levels
  if (filters?.levels?.length) {
    results = results.filter(entry => filters.levels!.includes(entry.level));
  }
  
  // Filter by sources
  if (filters?.sources?.length) {
    results = results.filter(entry => filters.sources!.includes(entry.source));
  }
  
  // Filter by time range
  if (filters?.startTime) {
    results = results.filter(entry => entry.timestamp >= filters.startTime!);
  }
  if (filters?.endTime) {
    results = results.filter(entry => entry.timestamp <= filters.endTime!);
  }
  
  // Filter by correlation ID
  if (filters?.correlationId) {
    results = results.filter(entry => entry.correlationId === filters.correlationId);
  }
  
  // Filter by user ID
  if (filters?.userId) {
    results = results.filter(entry => entry.userId === filters.userId);
  }
  
  // Filter by client IP
  if (filters?.clientIp) {
    results = results.filter(entry => entry.clientIp === filters.clientIp);
  }
  
  // Filter by tags
  if (filters?.tags?.length) {
    results = results.filter(entry =>
      entry.tags?.some(tag => filters.tags!.includes(tag))
    );
  }
  
  // Sort results
  const sortBy = pagination?.sortBy || 'timestamp';
  const sortOrder = pagination?.sortOrder || 'desc';
  results.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });
  
  const totalCount = results.length;
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 50;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIdx = (page - 1) * pageSize;
  const paginatedResults = results.slice(startIdx, startIdx + pageSize);
  
  // Build aggregations
  const aggregations = buildAggregations(results);
  
  return {
    entries: paginatedResults,
    totalCount,
    pagination: {
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    aggregations,
    tookMs: Math.floor(Math.random() * 50) + 10 // Simulated query time
  };
}

/**
 * Build aggregation results from filtered logs
 */
function buildAggregations(entries: LogEntry[]): LogAggregations {
  // Count by level
  const byLevel = {} as Record<LogLevel, number>;
  for (const level of Object.values(LogLevel)) {
    byLevel[level] = 0;
  }
  for (const entry of entries) {
    byLevel[entry.level]++;
  }
  
  // Count by source
  const bySource: Record<string, number> = {};
  for (const entry of entries) {
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
  }
  
  // Count by service
  const byService: Record<string, number> = {};
  for (const entry of entries) {
    byService[entry.service] = (byService[entry.service] || 0) + 1;
  }
  
  // Histogram over time (hourly buckets for last 24h)
  const overTime: TimeBucket[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const bucketStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const bucketEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
    const count = entries.filter(e => {
      const t = new Date(e.timestamp);
      return t >= bucketStart && t < bucketEnd;
    }).length;
    
    overTime.push({
      timestamp: bucketStart.toISOString(),
      count
    });
  }
  
  return {
    byLevel,
    bySource,
    byService,
    overTime
  };
}

/**
 * Convert logs to CSV format
 */
function convertToCSV(entries: LogEntry[]): string {
  const headers = [
    'id', 'timestamp', 'level', 'source', 'message', 'hostname',
    'service', 'environment', 'correlationId', 'userId', 'clientIp'
  ];
  
  const rows = entries.map(entry =>
    headers.map(header => {
      const value = entry[header as keyof LogEntry];
      if (value === undefined || value === null) return '';
      const strValue = String(value);
      // Escape CSV special characters
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET /api/logging/logs
 * 
 * Search and retrieve log entries with filtering and pagination
 * 
 * Query Parameters:
 * - query: Text search query
 * - levels: Comma-separated list of log levels
 * - sources: Comma-separated list of sources
 * - startTime: ISO timestamp for range start
 * - endTime: ISO timestamp for range end
 * - correlationId: Filter by correlation ID
 * - userId: Filter by user ID
 * - clientIp: Filter by client IP
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50, max: 500)
 * - sortBy: Field to sort by (default: timestamp)
 * - sortOrder: Sort direction (asc/desc, default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const params = parseQueryParams(request.url);
    const filters = buildFiltersFromQuery(params);
    const pagination = buildPaginationFromQuery(params);
    
    // Check if this is an export request
    if (params.export) {
      const format = params.export as ExportFormat;
      const result = searchLogs(filters, { ...pagination, pageSize: 10000 });
      
      if (format === ExportFormat.CSV) {
        const csv = convertToCSV(result.entries);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="logs-export-${getTimestamp().split('T')[0]}.csv"`
          }
        });
      }
      
      // Default to JSON export
      return NextResponse.json({
        format: 'json',
        exportedAt: getTimestamp(),
        totalEntries: result.totalCount,
        entries: result.entries
      });
    }
    
    // Check if requesting stats
    if (params.action === 'stats') {
      return handleGetStats();
    }
    
    // Check if requesting sources
    if (params.action === 'sources') {
      return handleGetSources();
    }
    
    // Check if requesting levels distribution
    if (params.action === 'levels') {
      return handleGetLevelsDistribution(filters);
    }
    
    // Default: search logs
    const result = searchLogs(filters, pagination);
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        queriedAt: getTimestamp(),
        filters,
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    console.error('[LogsAPI] Error handling GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logging/logs/query
 * 
 * Execute advanced queries with complex filter conditions
 * 
 * Body:
 * - filters: Complete filter object
 * - pagination: Pagination settings
 * - fields: Fields to include in response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { filters, pagination, fields } = body as {
      filters?: LogSearchFilters;
      pagination?: PaginationParams;
      fields?: string[];
    };
    
    const result = searchLogs(filters, pagination);
    
    // Apply field selection if specified
    let entries = result.entries;
    if (fields && fields.length > 0) {
      entries = entries.map(entry => {
        const selected: Partial<LogEntry> = {};
        for (const field of fields) {
          if (field in entry) {
            (selected as Record<string, unknown>)[field] = entry[field as keyof LogEntry];
          }
        }
        return selected as LogEntry;
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        entries
      },
      meta: {
        queriedAt: getTimestamp()
      }
    });
    
  } catch (error) {
    console.error('[LogsAPI] Error handling POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// ============================================================================
// SPECIALIZED HANDLERS
// ============================================================================

/**
 * Handle GET /api/logging/logs?action=stats
 */
function handleGetStats(): NextResponse {
  const allLogs = sampleLogEntries;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const stats = {
    overview: {
      totalLogs: allLogs.length,
      logsLast24Hours: allLogs.filter(e => e.timestamp >= last24h.toISOString()).length,
      logsLast7Days: allLogs.filter(e => e.timestamp >= last7d.toISOString()).length,
      logsPerSecond: Math.round(allLogs.length / (24 * 60 * 60) * 100) / 100
    },
    byLevel: {} as Record<LogLevel, number>,
    bySource: {} as Record<string, number>,
    errorRate: 0,
    criticalCount: 0,
    uniqueCorrelations: new Set(allLogs.map(e => e.correlationId).filter(Boolean)).size,
    uniqueUsers: new Set(allLogs.map(e => e.userId).filter(Boolean)).size,
    topErrors: [] as Array<{ message: string; count: number }>
  };
  
  // Calculate by level
  for (const entry of allLogs) {
    stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
  }
  
  // Calculate by source
  for (const entry of allLogs) {
    stats.bySource[entry.source] = (stats.bySource[entry.source] || 0) + 1;
  }
  
  // Calculate error rate
  const errors = allLogs.filter(e => 
    e.level === LogLevel.ERROR || e.level === LogLevel.CRITICAL
  ).length;
  stats.errorRate = Math.round((errors / allLogs.length) * 10000) / 100;
  stats.criticalCount = allLogs.filter(e => e.level === LogLevel.CRITICAL).length;
  
  // Top errors
  const errorMessages = new Map<string, number>();
  for (const entry of allLogs.filter(e => 
    e.level === LogLevel.ERROR || e.level === LogLevel.CRITICAL
  )) {
    errorMessages.set(entry.message, (errorMessages.get(entry.message) || 0) + 1);
  }
  stats.topErrors = Array.from(errorMessages.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return NextResponse.json({ success: true, data: stats });
}

/**
 * Handle GET /api/logging/logs?action=sources
 */
function handleGetSources(): NextResponse {
  const sources = Object.values(LogSource).map(source => ({
    source,
    config: LogSourceConfig[source],
    logCount: sampleLogEntries.filter(e => e.source === source).length,
    lastLogAt: sampleLogEntries
      .filter(e => e.source === source)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp
  }));
  
  return NextResponse.json({ success: true, data: sources });
}

/**
 * Handle GET /api/logging/logs?action=levels
 */
function handleGetLevelsDistribution(filters?: LogSearchFilters): NextResponse {
  let entries = sampleLogEntries;
  
  if (filters) {
    // Re-apply basic filters
    if (filters.sources?.length) {
      entries = entries.filter(e => filters.sources!.includes(e.source));
    }
    if (filters.startTime) {
      entries = entries.filter(e => e.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
      entries = entries.filter(e => e.timestamp <= filters.endTime!);
    }
  }
  
  const distribution = Object.values(LogLevel).map(level => ({
    level,
    config: LogLevelConfig[level],
    count: entries.filter(e => e.level === level).count,
    percentage: Math.round((entries.filter(e => e.level === level).count / entries.length) * 10000) / 100
  }));
  
  return NextResponse.json({ success: true, data: distribution });
}
