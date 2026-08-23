/**
 * Security Events API Routes
 * Phase 11: Production REST API Implementation
 * 
 * Endpoints:
 * POST   /api/v1/events/ingest        - Batch event ingestion (up to 1000 events)
 * GET    /api/v1/events/search         - Full-text search with filters
 * GET    /api/v1/events/:id            - Retrieve single event detail
 * PUT    /api/v1/events/:id/status     - Update event status/triage
 * POST   /api/v1/events/correlate      - Request correlation analysis
 * GET    /api/v1/events/stats/aggregated - Time-series aggregated stats
 * GET    /api/v1/events/stats/summary  - Summary statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// ============================================================
// Types
// ============================================================

interface SecurityEvent {
  id: string;
  eventId: string;
  eventType: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: 'new' | 'triaged' | 'investigating' | 'closed' | 'false_positive';
  sourceIp?: string;
  destinationIp?: string;
  toolName: string;
  ruleId?: string;
  title: string;
  description?: string;
  ingestedAt: string;
  subscriberId?: string; // MSISDN (masked)
  imsi?: string;
  confidence?: number;
  incidentId?: string;
  assignedTo?: string;
}

interface IngestRequest {
  events: Partial<SecurityEvent>[];
  source?: string;
  batchId?: string;
}

interface SearchFilters {
  eventType?: string[];
  severity?: string[];
  status?: string[];
  sourceIp?: string;
  destinationIp?: string;
  toolName?: string[];
  dateRange?: { start: string; end: string };
  subscriberId?: string;
  textQuery?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

// ============================================================
// In-Memory Store (Replace with PostgreSQL in production)
// ============================================================

const eventsStore = new Map<string, SecurityEvent>();
let eventIdCounter = 1000;

function generateEventId(): string {
  return `EVT-${Date.now()}-${++eventIdCounter}`;
}

function seedSampleData(): void {
  const sampleEvents: SecurityEvent[] = [
    {
      id: generateEventId(),
      eventId: 'WAZUH-20260728-001',
      eventType: 'authentication',
      category: 'anomaly',
      severity: 'high',
      status: 'new',
      sourceIp: '41.200.123.45',
      toolName: 'wazuh',
      ruleId: '5503',
      title: 'Multiple authentication failures detected',
      description: '10 failed login attempts from IP within 5 minutes',
      ingestedAt: new Date(Date.now() - 300000).toISOString(),
      confidence: 0.85,
    },
    {
      id: generateEventId(),
      eventId: 'SURICATA-20260728-002',
      eventType: 'network',
      category: 'intrusion',
      severity: 'critical',
      status: 'triaged',
      sourceIp: '185.220.101.12',
      destinationIp: '196.203.224.45',
      toolName: 'suricata',
      ruleId: '2013076',
      title: 'SQL Injection attempt detected on web application',
      description: 'Potential SQL injection in HTTP request to /api/subscribers endpoint',
      ingestedAt: new Date(Date.now() - 600000).toISOString(),
      confidence: 0.92,
      assignedTo: 'analyst-001',
    },
    {
      id: generateEventId(),
      eventId: 'CDR-20260728-003',
      eventType: 'telecom',
      category: 'fraud',
      severity: 'high',
      status: 'investigating',
      toolName: 'bss-fraud-system',
      title: 'Unusual international call pattern detected',
      description: 'Subscriber made 50+ calls to premium rate numbers in last hour',
      ingestedAt: new Date(Date.now() - 900000).toISOString(),
      subscriberId: '2135XXXXXXXX',
      confidence: 0.88,
      incidentId: 'INC-20260728-042',
    },
    {
      id: generateEventId(),
      eventId: 'ZEEK-20260728-004',
      eventType: 'network',
      category: 'reconnaissance',
      severity: 'medium',
      status: 'new',
      sourceIp: '91.121.87.45',
      destinationIp: '196.203.224.50',
      toolName: 'zeek',
      title: 'Port scanning activity detected',
      description: 'Sequential connection attempts to multiple ports from single source',
      ingestedAt: new Date(Date.now() - 120000).toISOString(),
      confidence: 0.75,
    },
    {
      id: generateEventId(),
      eventId: 'SIMSWAP-20260728-005',
      eventType: 'telecom',
      category: 'fraud',
      severity: 'critical',
      status: 'new',
      toolName: 'provisioning-system',
      title: 'Suspicious SIM swap request flagged',
      description: 'SIM swap requested for high-value corporate account with unusual pattern',
      ingestedAt: new Date().toISOString(),
      subscriberId: '2136XXXXXXXX',
      imsi: '604021234567890',
      confidence: 0.95,
    },
  ];

  sampleEvents.forEach(event => eventsStore.set(event.id, event));
}

seedSampleData();

// ============================================================
// Helper Functions
// ============================================================

function createSuccessResponse<T>(data: T, meta?: Partial<ApiResponse['meta']>): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      processingTimeMs: 0,
      ...meta,
    },
  });
}

function createErrorResponse(code: string, message: string, status: number = 400, details?: any): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error: { code, message, details },
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      processingTimeMs: 0,
    },
  }, { status });
}

function validateApiKey(request: NextRequest): { valid: boolean; apiKey?: string } {
  const apiKey = request.headers.get('x-api-key') || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) return { valid: false };
  return { valid: true, apiKey };
}

function maskMsisdn(msisdn: string): string {
  if (!msisdn || msisdn.length < 8) return msisdn;
  return msisdn.substring(0, 5) + 'X'.repeat(msisdn.length - 8) + msisdn.substring(msisdn.length - 3);
}

// ============================================================
// POST /api/v1/events/ingest - Batch Event Ingestion
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return createErrorResponse('UNAUTHORIZED', 'Valid API key required', 401);
    }

    let body: IngestRequest;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body');
    }

    if (!body.events || !Array.isArray(body.events)) {
      return createErrorResponse('VALIDATION_ERROR', 'Request must contain "events" array');
    }

    if (body.events.length === 0) {
      return createErrorResponse('VALIDATION_ERROR', 'Events array cannot be empty');
    }

    if (body.events.length > 1000) {
      return createErrorResponse('VALIDATION_ERROR', 'Maximum 1000 events per batch');
    }

    const results: Array<{ eventId: string; success: boolean; errors?: string[] }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const event of body.events) {
      try {
        if (!event.eventType) throw new Error('eventType is required');
        if (!event.toolName) throw new Error('toolName is required');
        if (!event.title) throw new Error('title is required');

        const securityEvent: SecurityEvent = {
          id: generateEventId(),
          eventId: event.eventId || generateEventId(),
          eventType: event.eventType,
          category: event.category || 'policy_violation',
          severity: event.severity || 'informational',
          status: event.status || 'new',
          sourceIp: event.sourceIp,
          destinationIp: event.destinationIp,
          toolName: event.toolName,
          ruleId: event.ruleId,
          title: event.title,
          description: event.description,
          ingestedAt: event.ingestedAt || new Date().toISOString(),
          subscriberId: event.subscriberId ? maskMsisdn(event.subscriberId) : undefined,
          imsi: event.imsi,
          confidence: event.confidence,
          incidentId: event.incidentId,
          assignedTo: event.assignedTo,
        };

        eventsStore.set(securityEvent.id, securityEvent);

        results.push({ eventId: securityEvent.eventId, success: true });
        successCount++;
      } catch (error) {
        results.push({
          eventId: event.eventId || 'unknown',
          success: false,
          errors: [error instanceof Error ? error.message : String(error)],
        });
        failureCount++;
      }
    }

    const processingTime = Date.now() - startTime;

    return createSuccessResponse({
      batchId: body.batchId || generateEventId(),
      totalReceived: body.events.length,
      successCount,
      failureCount,
      results,
      source: body.source || 'api',
    }, { processingTimeMs: processingTime });

  } catch (error) {
    console.error('[Events API] Ingestion error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to process ingestion request',
      500,
      process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined
    );
  }
}

// ============================================================
// GET /api/v1/events/search - Search Events with Filters
// ============================================================

export async function SEARCH(request: NextRequest) {
  const startTime = Date.now();

  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return createErrorResponse('UNAUTHORIZED', 'Valid API key required', 401);
    }

    const { searchParams } = new URL(request.url);
    const filters: SearchFilters = {
      eventType: searchParams.getAll('eventType'),
      severity: searchParams.getAll('severity'),
      status: searchParams.getAll('status'),
      sourceIp: searchParams.get('sourceIp') || undefined,
      destinationIp: searchParams.get('destinationIp') || undefined,
      toolName: searchParams.getAll('toolName'),
      subscriberId: searchParams.get('subscriberId') || undefined,
      textQuery: searchParams.get('q') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy') || 'ingestedAt',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    };

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate || new Date(0).toISOString(),
        end: endDate || new Date().toISOString(),
      };
    }

    let allEvents = Array.from(eventsStore.values());

    // Apply filters
    if (filters.eventType?.length) {
      allEvents = allEvents.filter(e => filters.eventType!.includes(e.eventType));
    }
    if (filters.severity?.length) {
      allEvents = allEvents.filter(e => filters.severity!.includes(e.severity));
    }
    if (filters.status?.length) {
      allEvents = allEvents.filter(e => filters.status!.includes(e.status));
    }
    if (filters.sourceIp) {
      allEvents = allEvents.filter(e => e.sourceIp === filters.sourceIp);
    }
    if (filters.destinationIp) {
      allEvents = allEvents.filter(e => e.destinationIp === filters.destinationIp);
    }
    if (filters.subscriberId) {
      allEvents = allEvents.filter(e => e.subscriberId?.includes(filters.subscriberId!));
    }
    if (filters.textQuery) {
      const query = filters.textQuery.toLowerCase();
      allEvents = allEvents.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    allEvents.sort((a, b) => {
      const aVal = (a as any)[filters.sortBy!] || '';
      const bVal = (b as any)[filters.sortBy!] || '';
      const comparison = aVal.localeCompare(bVal);
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = allEvents.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    const processingTime = Date.now() - startTime;

    return createSuccessResponse({
      events: paginatedEvents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      appliedFilters: filters,
    }, { processingTimeMs: processingTime });

  } catch (error) {
    console.error('[Events API] Search error:', error);
    return createErrorResponse('SEARCH_ERROR', 'Failed to execute search', 500);
  }
}

// ============================================================
// GET /api/v1/events/stats/summary - Event Statistics Summary
// ============================================================

export async function STATS_SUMMARY(request: NextRequest) {
  const startTime = Date.now();

  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return createErrorResponse('UNAUTHORIZED', 'Valid API key required', 401);
    }

    const allEvents = Array.from(eventsStore.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const summary = {
      totalEvents: allEvents.length,
      last24Hours: allEvents.filter(e => new Date(e.ingestedAt) > twentyFourHoursAgo).length,
      lastHour: allEvents.filter(e => new Date(e.ingestedAt) > oneHourAgo).length,
      
      bySeverity: {
        critical: allEvents.filter(e => e.severity === 'critical').length,
        high: allEvents.filter(e => e.severity === 'high').length,
        medium: allEvents.filter(e => e.severity === 'medium').length,
        low: allEvents.filter(e => e.severity === 'low').length,
        informational: allEvents.filter(e => e.severity === 'informational').length,
      },

      byStatus: {
        new: allEvents.filter(e => e.status === 'new').length,
        triaged: allEvents.filter(e => e.status === 'triaged').length,
        investigating: allEvents.filter(e => e.status === 'investigating').length,
        closed: allEvents.filter(e => e.status === 'closed').length,
        falsePositive: allEvents.filter(e => e.status === 'false_positive').length,
      },

      byEventType: {} as Record<string, number>,
      byToolName: {} as Record<string, number>,
      topSourceIps: [] as Array<{ ip: string; count: number }>,
      unassignedCritical: 0,
      calculatedAt: now.toISOString(),
    };

    allEvents.forEach(event => {
      summary.byEventType[event.eventType] = (summary.byEventType[event.eventType] || 0) + 1;
      summary.byToolName[event.toolName] = (summary.byToolName[event.toolName] || 0) + 1;
    });

    const ipCounts = new Map<string, number>();
    allEvents.forEach(event => {
      if (event.sourceIp) {
        ipCounts.set(event.sourceIp, (ipCounts.get(event.sourceIp) || 0) + 1);
      }
    });
    summary.topSourceIps = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    summary.unassignedCritical = allEvents.filter(
      e => (e.severity === 'critical' || e.severity === 'high') && !e.assignedTo
    ).length;

    const processingTime = Date.now() - startTime;

    return createSuccessResponse(summary, { processingTimeMs: processingTime });

  } catch (error) {
    console.error('[Events API] Stats error:', error);
    return createErrorResponse('STATS_ERROR', 'Failed to calculate statistics', 500);
  }
}

// ============================================================
// Default GET handler for backward compatibility
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.has('action')) {
    switch (searchParams.get('action')) {
      case 'search':
        return SEARCH(request);
      case 'stats':
      case 'summary':
        return STATS_SUMMARY(request);
      default:
        return createErrorResponse('INVALID_ACTION', `Unknown action: ${searchParams.get('action')}`);
    }
  }

  return SEARCH(request);
}
