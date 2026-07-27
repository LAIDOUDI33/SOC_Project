/**
 * National SOC Platform - Analytics API Endpoints
 * 
 * RESTful API for analytics features:
 * - Anomaly detection
 * - Time series analysis
 * - Threat scoring
 * - Correlation results
 * - Report generation triggers
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, requireAuth, requireAnalyst } from '@/lib/auth/middleware';

// Import analytics modules (lazy loading for performance)
const getAnomalyDetection = () => import('@/lib/analytics/ml/anomaly-detection');
const getTimeSeriesAnalysis = () => import('@/lib/analytics/time-series/analysis');
const getThreatScoring = () => import('@/lib/analytics/scoring/threat-scoring');
const getCorrelationEngine = () => import('@/lib/analytics/correlation/engine');

// ============================================================
// TYPES
// ============================================================

interface DataPointInput {
  timestamp: string; // ISO date string
  value: number;
  metadata?: Record<string, any>;
}

interface AnomalyDetectionRequest {
  data: DataPointInput[];
  config?: {
    sensitivity?: 'low' | 'medium' | 'high' | 'aggressive';
    enableTrendAnalysis?: boolean;
    enableSeasonalDetection?: boolean;
  };
}

interface ThreatScoreRequest {
  alertType: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  mitreTechniques?: string[];
  assetType?: 'critical' | 'high' | 'medium' | 'low';
  exposure?: 'internet-facing' | 'dmz' | 'internal-restricted' | 'isolated';
  controls?: 'none' | 'partial' | 'moderate' | 'strong' | 'optimized';
  threatIntel?: 'unknown' | 'low' | 'medium' | 'high' | 'confirmed';
  requiresARTPReporting?: boolean;
  affectsRevenue?: boolean;
  affectsCustomers?: boolean;
  involvesPII?: boolean;
  involvesBilling?: boolean;
  isZeroDay?: boolean;
  hasActiveExploit?: boolean;
}

interface CorrelationEventInput {
  timestamp: string;
  source: string;
  eventType: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  sourceIp?: string;
  destIp?: string;
  username?: string;
  hostname?: string;
  imsi?: string;
  msisdn?: string;
  [key: string]: any;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  // Authentication check for most endpoints
  const authResult = await withAuth(requireAnalyst)(request);
  
  switch (action) {
    case 'health':
      return handleAnalyticsHealth();
    
    case 'stats':
      return handleAnalyticsStats();
    
    case 'rules':
      return listCorrelationRules();
    
    case 'metrics':
      return getAvailableMetrics();
    
    default:
      if (authResult.response) return authResult.response;
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: health, stats, rules, metrics' },
        { status: 400 }
      );
  }
}

export async function POST(request: NextRequest) {
  // Authenticate all POST requests
  const authResult = await withAuth(requireAnalyst)(request);
  if (authResult.response) return authResult.response;

  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'detect-anomalies':
        return handleAnomalyDetection(body);
      
      case 'time-series-analysis':
        return handleTimeSeriesAnalysis(body);
      
      case 'threat-score':
        return handleThreatScoring(body);
      
      case 'correlate-events':
        return handleCorrelation(body);
      
      case 'batch-score':
        return handleBatchThreatScoring(body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// ANOMALY DETECTION HANDLER
// ============================================================

async function handleAnomalyDetection(body: AnomalyDetectionRequest): Promise<NextResponse> {
  if (!body.data || !Array.isArray(body.data) || body.data.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Need at least 10 data points for anomaly detection' },
      { status: 400 }
    );
  }

  try {
    const anomalyModule = await getAnomalyDetection();
    const { detectAnomalies, DJEZZY_ANALYTICS_DEFAULTS } = anomalyModule;

    // Convert input to internal format
    const dataPoints: any[] = body.data.map(d => ({
      timestamp: new Date(d.timestamp),
      value: d.value,
      metadata: d.metadata,
    }));

    // Build config with overrides
    const config = {
      ...DJEZZY_ANALYTICS_DEFAULTS,
      ...(body.config || {}),
    };

    // Run detection
    const result = detectAnomalies(dataPoints as any, config as any);

    return NextResponse.json({
      success: true,
      anomalies: result.anomalies,
      summary: result.summary,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Detection failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// TIME SERIES ANALYSIS HANDLER
// ============================================================

async function handleTimeSeriesAnalysis(body: any): Promise<NextResponse> {
  if (!body.data || !Array.isArray(body.data) || body.data.length < 5) {
    return NextResponse.json(
      { success: false, error: 'Need at least 5 data points for analysis' },
      { status: 400 }
    );
  }

  try {
    const {
      aggregateTimeSeries,
      calculateMovingAverage,
      analyzeTrend,
      detectSeasonality,
      buildBaseline,
      holtWintersForecast,
    } = await getTimeSeriesAnalysis();

    const metric = body.metric || 'unknown';
    const source = body.source || 'unknown';
    const granularity = body.granularity || '1h';

    // Convert timestamps
    const timeSeriesData = {
      metric,
      source,
      granularity,
      points: body.data.map((d: any) => ({
        timestamp: new Date(d.timestamp),
        value: d.value,
        count: d.count,
      })),
    };

    const results: any = {};

    // Aggregation (if requested)
    if (body.aggregateTo) {
      results.aggregation = aggregateTimeSeries(
        timeSeriesData.points,
        body.aggregateTo,
        body.aggregationMethod || 'avg'
      );
    }

    // Moving average
    if (body.movingAverage !== undefined) {
      results.movingAverage = calculateMovingAverage(
        timeSeriesData.points,
        body.movingAverage.windowSize || 5,
        body.movingAverage.type || 'simple',
        body.movingAverage.alpha
      );
    }

    // Trend analysis
    if (body.analyzeTrend !== false) {
      results.trend = analyzeTrend(timeSeriesData.points);
    }

    // Seasonality detection
    if (body.detectSeasonality !== false && timeSeriesData.points.length >= 48) {
      results.seasonality = detectSeasonality(timeSeriesData.points);
    }

    // Baseline building
    if (body.buildBaseline && timeSeriesData.points.length >= 168) { // At least 1 week
      results.baseline = buildBaseline(timeSeriesData);
    }

    // Forecasting
    if (body.forecast && body.forecast.horizon) {
      results.forecast = holtWintersForecast(
        timeSeriesData.points,
        body.forecast.params,
        body.forecast.horizon,
        body.forecast.seasonalityType || 'additive'
      );
    }

    return NextResponse.json({
      success: true,
      metric,
      source,
      results,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Time series analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// THREAT SCORING HANDLER
// ============================================================

async function handleThreatScoring(body: ThreatScoreRequest): Promise<NextResponse> {
  try {
    const { calculateThreatScore } = await getThreatScoring();

    const score = calculateThreatScore(body);

    return NextResponse.json({
      success: true,
      score,
      scoredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Threat scoring error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Scoring failed' },
      { status: 500 }
    );
  }
}

async function handleBatchThreatScoring(body: { alerts: ThreatScoreRequest[] }): Promise<NextResponse> {
  if (!body.alerts || !Array.isArray(body.alerts)) {
    return NextResponse.json(
      { success: false, error: 'alerts array is required' },
      { status: 400 }
    );
  }

  try {
    const { prioritizeAlerts } = await getThreatScoring();

    const prioritized = prioritizeAlerts(body.alerts as any);

    return NextResponse.json({
      success: true,
      totalAlerts: prioritized.length,
      criticalCount: prioritized.filter(a => a.score.level === 'critical').length,
      highCount: prioritized.filter(a => a.score.level === 'high').length,
      mediumCount: prioritized.filter(a => a.score.level === 'medium').length,
      lowCount: prioritized.filter(a => a.score.level === 'low').length,
      prioritizedAlerts: prioritized.slice(0, 50), // Return top 50
      scoredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Batch scoring error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Batch scoring failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// CORRELATION HANDLER
// ============================================================

async function handleCorrelation(body: { events: CorrelationEventInput[] }): Promise<NextResponse> {
  if (!body.events || !Array.isArray(body.events)) {
    return NextResponse.json(
      { success: false, error: 'events array is required' },
      { status: 400 }
    );
  }

  try {
    const { CorrelationEngine, DJEZZY_CORRELATION_RULES } = await getCorrelationEngine();

    // Initialize engine with Djezzy rules
    const engine = new CorrelationEngine(DJEZZY_CORRELATION_RULES as any);

    // Convert events
    const events = body.events.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));

    // Process batch
    const correlations = engine.processBatch(events as any);
    const stats = engine.getStatistics();

    // Filter only matched correlations
    const triggeredCorrelations = correlations.filter(c => c.matched);

    return NextResponse.json({
      success: true,
      totalEventsProcessed: events.length,
      correlationsTriggered: triggeredCorrelations.length,
      correlations: triggeredCorrelations,
      statistics: stats,
      correlatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Correlation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Correlation failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// UTILITY ENDPOINTS
// ============================================================

async function handleAnalyticsHealth(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    status: 'operational',
    components: {
      anomalyDetection: 'available',
      timeSeriesAnalysis: 'available',
      threatScoring: 'available',
      correlationEngine: 'available',
      reportGeneration: 'available',
    },
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
}

async function handleAnalyticsStats(): Promise<NextResponse> {
  try {
    // Get some basic stats from database
    const [alertCount, incidentCount, userCount] = await Promise.all([
      db.alert.count(),
      db.incident.count(),
      db.user.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        totalAlerts: alertCount,
        totalIncidents: incidentCount,
        activeUsers: userCount,
        analyticsVersion: '2.0.0',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function listCorrelationRules(): Promise<NextResponse> {
  try {
    const { DJEZZY_CORRELATION_RULES } = await getCorrelationEngine();

    return NextResponse.json({
      success: true,
      rules: DJEZZY_CORRELATION_RULES.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        severity: r.severity,
        category: r.category,
        enabled: r.enabled,
        riskScore: r.riskScore,
        artpReportable: r.artpReportable,
      })),
      totalRules: DJEZZY_CORRELATION_RULES.length,
      enabledRules: DJEZZY_CORRELATION_RULES.filter(r => r.enabled).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function getAvailableMetrics(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    metrics: [
      // Security metrics
      { id: 'alerts_per_hour', name: 'Alerts per Hour', category: 'security', unit: 'count' },
      { id: 'incidents_by_severity', name: 'Incidents by Severity', category: 'security', unit: 'count' },
      { id: 'mttt', name: 'Mean Time To Triage', category: 'security', unit: 'minutes' },
      { id: 'mttr', name: 'Mean Time To Resolve', category: 'security', unit: 'hours' },
      
      // Telecom metrics
      { id: 'ss7_message_rate', name: 'SS7 Message Rate', category: 'telecom', unit: 'msg/sec' },
      { id: 'gtp_sessions_active', name: 'Active GTP Sessions', category: 'telecom', unit: 'count' },
      { id: 'sip_calls_per_min', name: 'SIP Calls per Minute', category: 'telecom', unit: 'calls' },
      { id: 'diameter_ccr_rate', name: 'Diameter CCR Rate', category: 'telecom', unit: 'req/sec' },
      
      // Performance metrics
      { id: 'api_response_time_p95', name: 'API Response Time P95', category: 'performance', unit: 'ms' },
      { id: 'cpu_usage', name: 'CPU Usage', category: 'performance', unit: '%' },
      { id: 'memory_usage', name: 'Memory Usage', category: 'performance', unit: '%' },
      { id: 'disk_io', name: 'Disk I/O', category: 'performance', unit: 'MB/s' },
      
      // Business metrics
      { id: 'subscribers_online', name: 'Online Subscribers', category: 'business', unit: 'count' },
      { id: 'data_traffic_gb', name: 'Data Traffic', category: 'business', unit: 'GB' },
      { id: 'revenue_estimated', name: 'Estimated Revenue', category: 'business', unit: 'DZD' },
    ],
    categories: ['security', 'telecom', 'performance', 'business'],
  });
}
