/**
 * Suricata Statistics API Routes
 * National SOC Platform - Algeria 2026-2030
 * 
 * Endpoints:
 * GET /api/suricata/stats - Get comprehensive statistics
 * GET /api/suricata/stats/trends - Get alert trends over time
 * GET /api/suricata/stats/packets - Packet processing statistics
 * GET /api/suricata/stats/flows - Flow statistics
 * GET /api/suricata/stats/top-ips - Top source/destination IPs
 * GET /api/suricata/stats/top-signatures - Top triggered signatures
 * GET /api/suricata/stats/protocols - Protocol distribution
 * GET /api/suricata/stats/severity - Severity breakdown
 * GET /api/suricata/stats/categories - Category breakdown
 * GET /api/suricata/stats/sensors - Sensor status overview
 * GET /api/suricata/stats/performance - Performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SuricataStats,
  SignatureStats,
  IPStats,
  PortStats,
  StatsTimePoint,
  AlertTrend,
  SeverityLevel,
  AlertCategory,
  RuleAction,
  TimeRange,
  SensorStatus,
  SEVERITY_CONFIG
} from '../../types/suricata.types';

// ============================================================================
// MOCK STATISTICS DATA
// ============================================================================

const mockStats: SuricataStats = {
  timestamp: new Date().toISOString(),
  uptime_seconds: 864000, // 10 days
  packets_received: 1523456789,
  packets_dropped: 1234567,
  packets_ifdropped: 234567,
  packets_processed: 1522221222,
  bytes_received: 987654321012,
  bytes_dropped: 876543210,
  total_alerts: 456789,
  alerts_by_severity: {
    [SeverityLevel.CRITICAL]: 1234,
    [SeverityLevel.HIGH]: 5678,
    [SeverityLevel.MEDIUM]: 23456,
    [SeverityLevel.LOW]: 78901,
    [SeverityLevel.INFORMATIONAL]: 347520
  },
  alerts_by_category: {
    [AlertCategory.MALWARE]: 45678,
    [AlertCategory.EXPLOIT]: 34567,
    [AlertCategory.RECONNAISSANCE]: 67456,
    [AlertCategory.DENIAL_OF_SERVICE]: 12345,
    [AlertCategory.POLICY_VIOLATION]: 89123,
    [AlertCategory.ANOMALY]: 23456,
    [AlertCategory.PHISHING]: 15678,
    [AlertCategory.COMMAND_AND_CONTROL]: 23456,
    [AlertCategory.DATA_EXFILTRATION]: 3456,
    [AlertCategory.UNKNOWN]: 136574
  },
  alerts_by_action: {
    [RuleAction.ALERT]: 450000,
    [RuleAction.DROP]: 5000,
    [RuleAction.REJECT]: 1000,
    [RuleAction.PASS]: 789
  },
  top_signatures: [
    { signature_id: 2013028, signature: 'ET TROJAN C2 Beacon via Custom Header', count: 47, severity: SeverityLevel.CRITICAL, category: 'trojan-activity', trend: 'up', trend_percentage: 15.5 },
    { signature_id: 2020051, signature: 'ET SCAN Brute Force Login Attempt', count: 1523, severity: SeverityLevel.HIGH, category: 'attempted-admin', trend: 'stable', trend_percentage: 2.3 },
    { signature_id: 2830125, signature: 'ET DNS Suspicious Query - DGA Domain', count: 89, severity: SeverityLevel.HIGH, category: 'bad-unknown', trend: 'up', trend_percentage: 45.2 },
    { signature_id: 2020420, signature: 'ET TROJAN Metasploit Default Pattern Detected', count: 12, severity: SeverityLevel.CRITICAL, category: 'trojan-activity', trend: 'down', trend_percentage: -33.3 },
    { signature_id: 2221024, signature: 'ET POLICY DNS Query to .onion Domain', count: 234, severity: SeverityLevel.LOW, category: 'policy-violation', trend: 'stable', trend_percentage: 0 }
  ],
  top_source_ips: [
    { ip: '185.220.101.0', country: 'Germany', asn: 24940, as_org: 'Hetzner Online GmbH', is_internal: false, reputation_score: 20, alert_count: 12500, first_seen: '2026-07-01T00:00:00Z', last_seen: '2026-07-25T10:15:32Z', tags: ['tor-exit-node', 'hosting'] },
    { ip: '91.121.87.100', country: 'France', asn: 16276, as_org: 'OVH SAS', is_internal: false, reputation_score: 35, alert_count: 8900, first_seen: '2026-06-15T00:00:00Z', last_seen: '2026-07-25T10:14:45Z', tags: ['vps-provider'] },
    { ip: '45.33.32.156', country: 'United States', asn: 11492, as_org: 'Path Network', is_internal: false, reputation_score: 50, alert_count: 5600, first_seen: '2026-07-10T00:00:00Z', last_seen: '2026-07-25T10:13:22Z', tags: ['cloud-hosting'] },
    { ip: '194.163.128.50', country: 'Russia', asn: 204604, as_org: 'LLC Solar Services', is_internal: false, reputation_score: 15, alert_count: 3400, first_seen: '2026-05-20T00:00:00Z', last_seen: '2026-07-25T10:12:18Z', tags: ['suspicious-asn'] },
    { ip: '172.16.0.55', country: 'Algeria', asn: undefined, as_org: undefined, is_internal: true, reputation_score: 80, alert_count: 1200, first_seen: '2026-01-01T00:00:00Z', last_seen: '2026-07-25T10:11:05Z', tags: ['internal-workstation'] }
  ],
  top_destination_ips: [
    { ip: '196.200.100.50', country: 'Algeria', asn: 36947, as_org: 'Algerie Telecom', is_internal: true, reputation_score: 90, alert_count: 15000, first_seen: '2026-01-01T00:00:00Z', last_seen: '2026-07-25T10:15:32Z', tags: ['web-server'] },
    { ip: '196.200.100.51', country: 'Algeria', asn: 36947, as_org: 'Algerie Telecom', is_internal: true, reputation_score: 88, alert_count: 12000, first_seen: '2026-01-01T00:00:00Z', last_seen: '2026-07-25T10:14:45Z', tags: ['ssh-gateway'] },
    { ip: '196.200.100.52', country: 'Algeria', asn: 36947, as_org: 'Algerie Telecom', is_internal: true, reputation_score: 85, alert_count: 8000, first_seen: '2026-02-01T00:00:00Z', last_seen: '2026-07-25T10:13:22Z', tags: ['dns-server'] },
    { ip: '196.200.100.53', country: 'Algeria', asn: 36947, as_org: 'Algerie Telecom', is_internal: true, reputation_score: 87, alert_count: 6500, first_seen: '2026-03-01T00:00:00Z', last_seen: '2026-07-25T10:12:18Z', tags: ['database-server'] }
  ],
  top_ports: [
    { port: 443, protocol: 'TCP', service: 'HTTPS', alert_count: 250000, percentage: 54.7, top_signatures: [{ name: 'SSL/TLS Anomaly', count: 50000 }, { name: 'C2 via TLS', count: 30000 }] },
    { port: 80, protocol: 'TCP', service: 'HTTP', alert_count: 100000, percentage: 21.9, top_signatures: [{ name: 'Web Attack', count: 40000 }, { name: 'SQL Injection', count: 20000 }] },
    { port: 22, protocol: 'TCP', service: 'SSH', alert_count: 50000, percentage: 10.9, top_signatures: [{ name: 'Brute Force', count: 30000 }, { name: 'Scanner', count: 15000 }] },
    { port: 53, protocol: 'UDP', service: 'DNS', alert_count: 35000, percentage: 7.7, top_signatures: [{ name: 'DGA Detection', count: 20000 }, { name: 'DNS Tunneling', count: 10000 }] },
    { port: 4444, protocol: 'TCP', service: 'Metasploit', alert_count: 12000, percentage: 2.6, top_signatures: [{ name: 'Metasploit Pattern', count: 12000 }] }
  ],
  protocol_distribution: {
    TCP: 320000,
    UDP: 100000,
    ICMP: 20000,
    HTTP: 85000,
    DNS: 35000,
    TLS: 15000,
    SMB: 2000,
    SSH: 289
  },
  active_flows: 15432,
  total_flows: 9876543,
  avg_flow_duration_ms: 4500,
  memory_usage_bytes: 2147483648, // 2GB
  cpu_usage_percent: 45.5,
  capture_method: 'af-packet',
  capture_kernel_drops: 1234
};

const mockTrends: Record<string, StatsTimePoint[]> = {
  overall: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(Math.random() * 500) + 100
  })),
  critical: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(Math.random() * 20)
  })),
  high: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(Math.random() * 50) + 10
  })),
  medium: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(Math.random() * 200) + 50
  })),
  low: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(Math.random() * 400) + 100
  }))
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate time-series data based on range and interval
 */
function generateTimeSeries(
  timeRange: TimeRange,
  interval: 'hour' | 'day' | 'minute'
): StatsTimePoint[] {
  const now = new Date();
  const points: StatsTimePoint[] = [];
  
  let numPoints: number;
  let intervalMs: number;

  switch (timeRange) {
    case TimeRange.LAST_HOUR:
      numPoints = interval === 'minute' ? 60 : 1;
      intervalMs = interval === 'minute' ? 60000 : 3600000;
      break;
    case TimeRange.LAST_6_HOURS:
      numPoints = interval === 'hour' ? 6 : interval === 'minute' ? 360 : 6;
      intervalMs = interval === 'hour' ? 3600000 : interval === 'minute' ? 60000 : 3600000;
      break;
    case TimeRange.LAST_12_HOURS:
      numPoints = interval === 'hour' ? 12 : 720;
      intervalMs = interval === 'hour' ? 3600000 : 60000;
      break;
    case TimeRange.LAST_24_HOURS:
      numPoints = interval === 'hour' ? 24 : interval === 'minute' ? 1440 : 24;
      intervalMs = interval === 'hour' ? 3600000 : interval === 'minute' ? 60000 : 3600000;
      break;
    case TimeRange.LAST_7_DAYS:
      numPoints = interval === 'day' ? 7 : 168;
      intervalMs = interval === 'day' ? 86400000 : 3600000;
      break;
    case TimeRange.LAST_30_DAYS:
      numPoints = interval === 'day' ? 30 : 720;
      intervalMs = interval === 'day' ? 86400000 : 3600000;
      break;
    default:
      numPoints = 24;
      intervalMs = 3600000;
  }

  for (let i = numPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * intervalMs);
    points.push({
      timestamp: timestamp.toISOString(),
      value: Math.floor(Math.random() * 200) + 50,
      breakdown: {
        critical: Math.floor(Math.random() * 10),
        high: Math.floor(Math.random() * 30),
        medium: Math.floor(Math.random() * 80),
        low: Math.floor(Math.random() * 100)
      }
    });
  }

  return points;
}

/**
 * Calculate trend metrics
 */
function calculateTrendMetrics(points: StatsTimePoint[]): {
  total: number;
  average: number;
  peak: number;
  peak_timestamp: string;
  change_percentage: number;
  change_direction: 'up' | 'down' | 'stable';
} {
  if (points.length === 0) {
    return { total: 0, average: 0, peak: 0, peak_timestamp: '', change_percentage: 0, change_direction: 'stable' };
  }

  const values = points.map(p => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const average = Math.round(total / values.length);
  const peak = Math.max(...values);
  const peakIndex = values.indexOf(peak);

  // Calculate change (compare first half vs second half)
  const midPoint = Math.floor(values.length / 2);
  const firstHalfAvg = values.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
  const secondHalfAvg = values.slice(midPoint).reduce((a, b) => a + b, 0) / (values.length - midPoint);
  
  const changePercentage = firstHalfAvg > 0 
    ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
    : 0;

  let change_direction: 'up' | 'down' | 'stable';
  if (changePercentage > 10) {
    change_direction = 'up';
  } else if (changePercentage < -10) {
    change_direction = 'down';
  } else {
    change_direction = 'stable';
  }

  return {
    total,
    average,
    peak,
    peak_timestamp: points[peakIndex].timestamp,
    change_percentage: Math.round(changePercentage * 10) / 10,
    change_direction
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/suricata/stats
 * Main statistics endpoint - returns comprehensive stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const timeRange = (searchParams.get('time_range') as TimeRange) || TimeRange.LAST_24_HOURS;
    const interval = (searchParams.get('interval') as 'hour' | 'day' | 'minute') || 'hour';

    switch (type) {
      case 'overview':
        return handleOverviewStats(timeRange);

      case 'trends':
        return handleTrendsStats(timeRange, interval);

      case 'packets':
        return handlePacketStats();

      case 'flows':
        return handleFlowStats();

      case 'top-ips':
        return handleTopIPs(searchParams.get('limit'));

      case 'top-signatures':
        return handleTopSignatures(searchParams.get('limit'));

      case 'protocols':
        return handleProtocolDistribution();

      case 'severity':
        return handleSeverityBreakdown();

      case 'categories':
        return handleCategoryBreakdown();

      case 'sensors':
        return handleSensorStatus();

      case 'performance':
        return handlePerformanceStats();

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TYPE',
              message: `Unknown stats type: ${type}`,
              valid_types: ['overview', 'trends', 'packets', 'flows', 'top-ips', 'top-signatures', 'protocols', 'severity', 'categories', 'sensors', 'performance'],
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Suricata Stats API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// STATS HANDLERS
// ============================================================================

/**
 * Handle overview statistics request
 */
async function handleOverviewStats(timeRange: TimeRange): Promise<NextResponse> {
  // Generate current stats with some randomization for demo
  const currentStats: SuricataStats = {
    ...mockStats,
    timestamp: new Date().toISOString(),
    packets_received: mockStats.packets_received + Math.floor(Math.random() * 10000),
    alerts_by_severity: {
      [SeverityLevel.CRITICAL]: mockStats.alerts_by_severity[SeverityLevel.CRITICAL] + Math.floor(Math.random() * 10),
      [SeverityLevel.HIGH]: mockStats.alerts_by_severity[SeverityLevel.HIGH] + Math.floor(Math.random() * 50),
      [SeverityLevel.MEDIUM]: mockStats.alerts_by_severity[SeverityLevel.MEDIUM] + Math.floor(Math.random() * 200),
      [SeverityLevel.LOW]: mockStats.alerts_by_severity[SeverityLevel.LOW] + Math.floor(Math.random() * 500),
      [SeverityLevel.INFORMATIONAL]: mockStats.alerts_by_severity[SeverityLevel.INFORMATIONAL] + Math.floor(Math.random() * 1000)
    },
    cpu_usage_percent: 40 + Math.random() * 20,
    memory_usage_bytes: mockStats.memory_usage_bytes + Math.floor(Math.random() * 100000000)
  };

  // Calculate derived metrics
  const dropRate = (currentStats.packets_dropped / currentStats.packets_received * 100).toFixed(3);
  const pps = Math.round(currentStats.packets_received / currentStats.uptime_seconds);
  const bps = Math.round((currentStats.bytes_received * 8) / currentStats.uptime_seconds);

  return NextResponse.json({
    success: true,
    data: {
      ...currentStats,
      derived_metrics: {
        drop_rate_percent: parseFloat(dropRate),
        packets_per_second: pps,
        bits_per_second: bps,
        bits_per_second_formatted: formatBytes(bps) + '/s',
        alerts_per_minute: Math.round(Object.values(currentStats.alerts_by_severity).reduce((a, b) => a + b, 0) / (currentStats.uptime_seconds / 60)),
        average_flow_duration: `${currentStats.avg_flow_duration_ms}ms`,
        memory_usage_formatted: formatBytes(currentStats.memory_usage_bytes),
        uptime_formatted: formatUptime(currentStats.uptime_seconds)
      }
    },
    meta: {
      execution_time_ms: 5,
      generated_at: new Date().toISOString()
    }
  });
}

/**
 * Handle trends statistics request
 */
async function handleTrendsStats(
  timeRange: TimeRange,
  interval: 'hour' | 'day' | 'minute'
): Promise<NextResponse> {
  const overallPoints = generateTimeSeries(timeRange, interval);
  const overallMetrics = calculateTrendMetrics(overallPoints);

  // Generate per-severity trends
  const bySeverity: Record<SeverityLevel, StatsTimePoint[]> = {} as any;
  
  Object.values(SeverityLevel).forEach(severity => {
    bySeverity[severity] = generateTimeSeries(timeRange, interval).map(p => ({
      ...p,
      value: severity === SeverityLevel.CRITICAL 
        ? Math.floor(p.value * 0.05)
        : severity === SeverityLevel.HIGH
        ? Math.floor(p.value * 0.15)
        : severity === SeverityLevel.MEDIUM
        ? Math.floor(p.value * 0.30)
        : severity === SeverityLevel.LOW
        ? Math.floor(p.value * 0.50)
        : p.value
    }));
  });

  // Generate per-category trends
  const byCategory: Record<AlertCategory, StatsTimePoint[]> = {} as any;
  const categories = Object.values(AlertCategory).slice(0, 5); // Top 5 categories
  
  categories.forEach(category => {
    byCategory[category] = generateTimeSeries(timeRange, interval).map(p => ({
      ...p,
      value: Math.floor(p.value * (Math.random() * 0.5 + 0.1))
    }));
  });

  const result: AlertTrend = {
    period: timeRange,
    points: overallPoints,
    total: overallMetrics.total,
    average: overallMetrics.average,
    peak: overallMetrics.peak,
    peak_timestamp: overallMetrics.peak_timestamp,
    change_percentage: overallMetrics.change_percentage,
    change_direction: overallMetrics.change_direction
  };

  return NextResponse.json({
    success: true,
    data: {
      overall: result,
      by_severity: bySeverity,
      by_category: byCategory,
      summary: {
        total_alerts_24h: overallMetrics.total,
        average_per_hour: overallMetrics.average,
        peak_hour: overallMetrics.peak_timestamp,
        trend_direction: overallMetrics.change_direction,
        trend_percentage: overallMetrics.change_percentage
      }
    },
    meta: {
      execution_time_ms: 8,
      time_range: timeRange,
      interval
    }
  });
}

/**
 * Handle packet statistics request
 */
async function handlePacketStats(): Promise<NextResponse> {
  const stats = mockStats;
  const uptime = stats.uptime_seconds;

  return NextResponse.json({
    success: true,
    data: {
      received: {
        total: stats.packets_received,
        formatted: formatNumber(stats.packets_received),
        rate_per_second: Math.round(stats.packets_received / uptime),
        rate_formatted: `${formatNumber(Math.round(stats.packets_received / uptime))} pps`
      },
      dropped: {
        total: stats.packets_dropped,
        formatted: formatNumber(stats.packets_dropped),
        rate_per_second: Math.round(stats.packets_dropped / uptime),
        drop_rate_percent: ((stats.packets_dropped / stats.packets_received) * 100).toFixed(3)
      },
      interface_dropped: {
        total: stats.packets_ifdropped,
        formatted: formatNumber(stats.packets_ifdropped)
      },
      processed: {
        total: stats.packets_processed,
        formatted: formatNumber(stats.packets_processed),
        processing_rate: ((stats.packets_processed / stats.packets_received) * 100).toFixed(2) + '%'
      },
      bytes: {
        received_total: stats.bytes_received,
        received_formatted: formatBytes(stats.bytes_received),
        dropped_total: stats.bytes_dropped,
        dropped_formatted: formatBytes(stats.bytes_dropped),
        throughput_bps: Math.round((stats.bytes_received * 8) / uptime),
        throughput_formatted: formatBytes(Math.round((stats.bytes_received * 8) / uptime)) + '/s'
      },
      capture: {
        method: stats.capture_method,
        kernel_drops: stats.capture_kernel_drops
      }
    },
    meta: { execution_time_ms: 3 }
  });
}

/**
 * Handle flow statistics request
 */
async function handleFlowStats(): Promise<NextResponse> {
  const stats = mockStats;

  return NextResponse.json({
    success: true,
    data: {
      flows: {
        active: stats.active_flows,
        total: stats.total_flows,
        formatted: {
          active: formatNumber(stats.active_flows),
          total: formatNumber(stats.total_flows)
        }
      },
      duration: {
        average_ms: stats.avg_flow_duration_ms,
        average_formatted: `${stats.avg_flow_duration_ms}ms`
      },
      protocols: stats.protocol_distribution,
      top_protocols: Object.entries(stats.protocol_distribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([protocol, count]) => ({
          protocol,
          count,
          percentage: ((count / Object.values(stats.protocol_distribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1) + '%'
        }))
    },
    meta: { execution_time_ms: 2 }
  });
}

/**
 * Handle top IPs statistics request
 */
async function handleTopIPs(limitParam: string | null): Promise<NextResponse> {
  const limit = limitParam ? parseInt(limitParam) : 20;
  const stats = mockStats;

  return NextResponse.json({
    success: true,
    data: {
      sources: stats.top_source_ips.slice(0, limit),
      destinations: stats.top_destination_ips.slice(0, limit),
      summary: {
        unique_source_ips: stats.top_source_ips.length,
        unique_dest_ips: stats.top_destination_ips.length,
        internal_sources: stats.top_source_ips.filter(ip => ip.is_internal).length,
        external_sources: stats.top_source_ips.filter(ip => !ip.is_internal).length,
        countries_represented: [...new Set(stats.top_source_ips.map(ip => ip.country).filter(Boolean))].length
      }
    },
    meta: { execution_time_ms: 4 }
  });
}

/**
 * Handle top signatures statistics request
 */
async function handleTopSignatures(limitParam: string | null): Promise<NextResponse> {
  const limit = limitParam ? parseInt(limitParam) : 20;
  const stats = mockStats;

  return NextResponse.json({
    success: true,
    data: {
      signatures: stats.top_signatures.slice(0, limit),
      summary: {
        total_unique_signatures: stats.top_signatures.length,
        critical_count: stats.top_signatures.filter(s => s.severity === SeverityLevel.CRITICAL).length,
        increasing_trends: stats.top_signatures.filter(s => s.trend === 'up').length,
        decreasing_trends: stats.top_signatures.filter(s => s.trend === 'down').length
      }
    },
    meta: { execution_time_ms: 3 }
  });
}

/**
 * Handle protocol distribution request
 */
async function handleProtocolDistribution(): Promise<NextResponse> {
  const distribution = mockStats.protocol_distribution;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    data: {
      distribution: Object.entries(distribution)
        .map(([protocol, count]) => ({
          protocol,
          count,
          percentage: ((count / total) * 100).toFixed(2) + '%',
          formatted: formatNumber(count)
        }))
        .sort((a, b) => b.count - a.count),
      total,
      total_formatted: formatNumber(total)
    },
    meta: { execution_time_ms: 2 }
  });
}

/**
 * Handle severity breakdown request
 */
async function handleSeverityBreakdown(): Promise<NextResponse> {
  const bySeverity = mockStats.alerts_by_severity;
  const total = Object.values(bySeverity).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    data: {
      breakdown: Object.entries(bySeverity)
        .map(([severity, count]) => ({
          severity: severity as SeverityLevel,
          count,
          percentage: ((count / total) * 100).toFixed(2) + '%,
          color: SEVERITY_CONFIG[severity as SeverityLevel]?.color || '#6B7280',
          icon: SEVERITY_CONFIG[severity as SeverityLevel]?.icon || '⚪',
          score: SEVERITY_CONFIG[severity as SeverityLevel]?.score || 0,
          response_time: SEVERITY_CONFIG[severity as SeverityLevel]?.response_time || 'N/A',
          formatted: formatNumber(count)
        })),
      total,
      total_formatted: formatNumber(total)
    },
    meta: { execution_time_ms: 2 }
  });
}

/**
 * Handle category breakdown request
 */
async function handleCategoryBreakdown(): Promise<NextResponse> {
  const byCategory = mockStats.alerts_by_category;
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    data: {
      breakdown: Object.entries(byCategory)
        .map(([category, count]) => ({
          category: category as AlertCategory,
          count,
          percentage: ((count / total) * 100).toFixed(2) + '%,
          formatted: formatNumber(count)
        }))
        .sort((a, b) => b.count - a.count),
      total,
      total_formatted: formatNumber(total)
    },
    meta: { execution_time_ms: 2 }
  });
}

/**
 * Handle sensor status request
 */
async function handleSensorStatus(): Promise<NextResponse> {
  const sensors = [
    {
      id: 'sensor-algiers-01',
      name: 'Algiers Primary',
      hostname: 'suricata-algier.soc.dz',
      version: '7.0.3',
      status: SensorStatus.ONLINE,
      uptime_seconds: 864000,
      cpu_usage: 42.5,
      memory_usage: 65,
      interfaces: [
        { name: 'eth0', description: 'WAN Link', is_capture_interface: true, speed_mbps: 10000 },
        { name: 'eth1', description: 'Internal Network', is_capture_interface: true, speed_mbps: 1000 }
      ],
      total_rules: 45678,
      enabled_rules: 42345,
      last_rule_update: '2026-07-24T22:00:00Z',
      health_checks: [
        { check_name: 'capture_process', status: 'pass', message: 'Running normally' },
        { check_name: 'rule_load', status: 'pass', message: 'All rules loaded successfully' },
        { check_name: 'disk_space', status: 'warn', message: 'Disk usage at 78%' },
        { check_name: 'memory_usage', status: 'pass', message: 'Memory within limits' }
      ]
    },
    {
      id: 'sensor-oran-01',
      name: 'Oran Regional',
      hostname: 'suricata-oran.soc.dz',
      version: '7.0.3',
      status: SensorStatus.ONLINE,
      uptime_seconds: 432000,
      cpu_usage: 38.2,
      memory_usage: 58,
      interfaces: [
        { name: 'eth0', description: 'WAN Link', is_capture_interface: true, speed_mbps: 10000 }
      ],
      total_rules: 45678,
      enabled_rules: 42345,
      last_rule_update: '2026-07-24T22:00:00Z',
      health_checks: [
        { check_name: 'capture_process', status: 'pass', message: 'Running normally' },
        { check_name: 'rule_load', status: 'pass', message: 'All rules loaded successfully' },
        { check_name: 'disk_space', status: 'pass', message: 'Disk usage at 45%' },
        { check_name: 'memory_usage', status: 'pass', message: 'Memory within limits' }
      ]
    },
    {
      id: 'sensor-constantine-01',
      name: 'Constantine Regional',
      hostname: 'suricata-constantine.soc.dz',
      version: '7.0.2',
      status: SensorStatus.DEGRADED,
      uptime_seconds: 7200,
      cpu_usage: 85.7,
      memory_usage: 89,
      interfaces: [
        { name: 'eth0', description: 'WAN Link', is_capture_interface: true, speed_mbps: 1000 }
      ],
      total_rules: 45000,
      enabled_rules: 42000,
      last_rule_update: '2026-07-24T18:00:00Z',
      health_checks: [
        { check_name: 'capture_process', status: 'pass', message: 'Running normally' },
        { check_name: 'rule_load', status: 'warn', message: 'Some rules failed to load' },
        { check_name: 'disk_space', status: 'fail', message: 'Disk usage at 95%' },
        { check_name: 'memory_usage', status: 'fail', message: 'Memory above threshold (89%)' }
      ]
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      sensors,
      summary: {
        total_sensors: sensors.length,
        online: sensors.filter(s => s.status === SensorStatus.ONLINE).length,
        degraded: sensors.filter(s => s.status === SensorStatus.DEGRADED).length,
        offline: sensors.filter(s => s.status === SensorStatus.OFFLINE).length,
        average_cpu: Math.round(sensors.reduce((sum, s) => sum + s.cpu_usage, 0) / sensors.length * 10) / 10,
        average_memory: Math.round(sensors.reduce((sum, s) => sum + s.memory_usage, 0) / sensors.length)
      }
    },
    meta: { execution_time_ms: 5 }
  });
}

/**
 * Handle performance statistics request
 */
async function handlePerformanceStats(): Promise<NextResponse> {
  const stats = mockStats;

  return NextResponse.json({
    success: true,
    data: {
      cpu: {
        usage_percent: stats.cpu_usage_percent,
        cores: 8,
        load_average: [2.5, 2.3, 2.1]
      },
      memory: {
        usage_bytes: stats.memory_usage_bytes,
        usage_formatted: formatBytes(stats.memory_usage_bytes),
        total_bytes: 4294967296, // 4GB
        total_formatted: '4 GB',
        percentage: ((stats.memory_usage_bytes / 4294967296) * 100).toFixed(1) + '%'
      },
      capture: {
        method: stats.capture_method,
        threads: 4,
        kernel_drops: stats.capture_kernel_drops,
        drop_rate: ((stats.capture_kernel_drops / stats.packets_received) * 100).toFixed(4) + '%'
      },
      rule_processing: {
        total_rules_loaded: 45678,
        enabled_rules: 42345,
        disabled_rules: 3333,
        custom_rules: 150,
        avg_match_time_ns: 245
      },
      throughput: {
        packets_per_second: Math.round(stats.packets_received / stats.uptime_seconds),
        megabits_per_second: Math.round(((stats.bytes_received * 8) / stats.uptime_seconds) / 1000000),
        alerts_per_second: Math.round(stats.total_alerts / stats.uptime_seconds)
      }
    },
    meta: { execution_time_ms: 3 }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format uptime in human-readable form
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.join(', ');
}
