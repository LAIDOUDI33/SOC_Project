/**
 * Suricata Alerts API Routes
 * National SOC Platform - Algeria 2026-2030
 * 
 * Endpoints:
 * GET /api/suricata/alerts - Search and list alerts
 * GET /api/suricata/alerts/recent - Get recent alerts
 * GET /api/suricata/alerts/high-priority - Get critical/high alerts
 * GET /api/suricata/alerts/[id] - Get single alert detail
 * POST /api/suricata/alerts/false-positive - Mark as false positive
 * POST /api/suricata/alerts/bulk/false-positive - Bulk mark false positives
 * GET /api/suricata/alerts/by-ip/[ip] - Get alerts for IP address
 * GET /api/suricata/alerts/by-signature/[sid] - Get alerts by signature
 * GET /api/suricata/alerts/threat-intel - Get threat intel matched alerts
 * GET /api/suricata/alerts/attack-map - Get attack map data
 * GET /api/suricata/alerts/statistics - Alert statistics summary
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  EveEvent,
  AlertFilter,
  AlertResultSet,
  SeverityLevel,
  RuleAction,
  AlertCategory,
  Protocol,
  TimeRange,
  AlertAggregations,
  AttackMapPoint,
  SuricataStats,
  SEVERITY_CONFIG
} from '../../types/suricata.types';
import { getSuricataClient } from '../../lib/suricata-client';

// ============================================================================
// MOCK DATA FOR DEVELOPMENT (Replace with actual database queries)
// ============================================================================

const mockAlerts: EveEvent[] = [
  {
    timestamp: '2026-07-25T10:15:32.123Z',
    flow_id: 123456789,
    event_type: 'alert' as any,
    src_ip: '185.220.101.0',
    src_port: 443,
    dest_ip: '196.200.100.50',
    dest_port: 54321,
    proto: 'TCP',
    community_id: '1:abc123def456',
    alert: {
      action: 'alert' as any,
      gid: 1,
      signature_id: 2013028,
      rev: 3,
      signature: 'ET TROJAN C2 Beacon via Custom Header',
      category: 'Command and Control',
      severity: 1,
      metadata: {
        signature_severity: ['Critical'],
        attack_target: ['Any'],
        deployment: ['Datacenter'],
        created_at: ['2020/01/01']
      },
      classification: {
        category: AlertCategory.COMMAND_AND_CONTROL,
        confidence: 0.95,
        is_false_positive: false,
        risk_score: 92,
        indicators: [
          {
            type: 'known_c2_ip',
            value: '185.220.101.0',
            weight: 0.4,
            description: 'IP in known C2 infrastructure database'
          },
          {
            type: 'beacon_pattern',
            value: '60s_interval',
            weight: 0.35,
            description: 'Regular beacon interval detected'
          },
          {
            type: 'unusual_destination_port',
            value: '54321',
            weight: 0.25,
            description: 'Connection to non-standard port'
          }
        ]
      },
      mitre: {
        tactic: 'Command and Control',
        technique_id: 'T1071.001',
        technique_name: 'Application Layer Protocol: Web Protocols'
      }
    }
  },
  {
    timestamp: '2026-07-25T10:14:45.789Z',
    flow_id: 123456790,
    event_type: 'alert' as any,
    src_ip: '91.121.87.100',
    src_port: 23,
    dest_ip: '196.200.100.51',
    dest_port: 2323,
    proto: 'TCP',
    community_id: '1:def456abc789',
    alert: {
      action: 'drop' as any,
      gid: 1,
      signature_id: 2020051,
      rev: 2,
      signature: 'ET SCAN Brute Force Login Attempt',
      category: 'Attempted Administrator Privilege Gain',
      severity: 2,
      metadata: {
        signature_severity: ['Major'],
        attack_target: ['SSH Servers'],
        deployment: ['Perimeter']
      },
      classification: {
        category: AlertCategory.EXPLOIT,
        confidence: 0.88,
        is_false_positive: false,
        risk_score: 78,
        indicators: []
      }
    }
  },
  {
    timestamp: '2026-07-25T10:13:22.456Z',
    flow_id: 123456791,
    event_type: 'alert' as any,
    src_ip: '45.33.32.156',
    src_port: 53,
    dest_ip: '196.200.100.52',
    dest_port: 80,
    proto: 'UDP',
    community_id: '1:ghi789jkl012',
    alert: {
      action: 'alert' as any,
      gid: 1,
      signature_id: 2830125,
      rev: 1,
      signature: 'ET DNS Suspicious Query - DGA Domain',
      category: 'Potentially Bad Traffic',
      severity: 2,
      metadata: {
        signature_severity: ['Major']
      },
      dns_analysis: {
        is_dga: true,
        dga_score: 0.92,
        threat_category: 'DGA-based malware'
      }
    }
  },
  {
    timestamp: '2026-07-25T10:12:18.901Z',
    flow_id: 123456792,
    event_type: 'alert' as any,
    src_ip: '194.163.128.50',
    src_port: 4444,
    dest_ip: '196.200.100.53',
    dest_port: 4444,
    proto: 'TCP',
    community_id: '1:mno345pqr678',
    alert: {
      action: 'alert' as any,
      gid: 1,
      signature_id: 2020420,
      rev: 5,
      signature: 'ET TROJAN Metasploit Default Pattern Detected',
      category: 'A Network Trojan was detected',
      severity: 1,
      metadata: {
        signature_severity: ['Critical'],
        attack_target: ['Any']
      },
      classification: {
        category: AlertCategory.MALWARE,
        confidence: 0.98,
        is_false_positive: false,
        risk_score: 99,
        indicators: [
          {
            type: 'default_metasploit_port',
            value: '4444',
            weight: 0.7,
            description: 'Default Metasploit listener port'
          },
          {
            type: 'known_malware_pattern',
            value: 'metasploit_payload',
            weight: 0.3,
            description: 'Metasploit payload pattern identified'
          }
        ]
      }
    }
  },
  {
    timestamp: '2026-07-25T10:11:05.234Z',
    flow_id: 123456793,
    event_type: 'alert' as any,
    src_ip: '172.16.0.55',
    src_port: 49152,
    dest_ip: '8.8.8.8',
    dest_port: 53,
    proto: 'UDP',
    community_id: '1:stu901vwx234',
    alert: {
      action: 'pass' as any,
      gid: 1,
      signature_id: 2221024,
      rev: 1,
      signature: 'ET POLICY DNS Query to .onion Domain',
      category: 'Policy Violation',
      severity: 3,
      metadata: {
        signature_severity: ['Minor']
      },
      classification: {
        category: AlertCategory.POLICY_VIOLATION,
        confidence: 0.75,
        is_false_positive: true,
        false_positive_reason: 'Legitimate research activity',
        risk_score: 15,
        indicators: []
      }
    }
  }
];

const mockAttackMapData: AttackMapPoint[] = [
  {
    id: 'amp-001',
    location: {
      ip: '185.220.101.0',
      country: 'Germany',
      country_code: 'DE',
      city: 'Frankfurt',
      latitude: 50.1109,
      longitude: 8.6821,
      accuracy_radius: 20
    },
    timestamp: '2026-07-25T10:15:32.123Z',
    severity: SeverityLevel.CRITICAL,
    category: AlertCategory.COMMAND_AND_CONTROL,
    signature: 'ET TROJAN C2 Beacon via Custom Header',
    target_ip: '196.200.100.50',
    count: 47,
    is_targeted_attack: true
  },
  {
    id: 'amp-002',
    location: {
      ip: '91.121.87.100',
      country: 'France',
      country_code: 'FR',
      city: 'Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_radius: 15
    },
    timestamp: '2026-07-25T10:14:45.789Z',
    severity: SeverityLevel.HIGH,
    category: AlertCategory.EXPLOIT,
    signature: 'ET SCAN Brute Force Login Attempt',
    target_ip: '196.200.100.51',
    count: 1523,
    is_targeted_attack: true
  },
  {
    id: 'amp-003',
    location: {
      ip: '45.33.32.156',
      country: 'United States',
      country_code: 'US',
      city: 'Dallas',
      latitude: 32.7767,
      longitude: -96.7970,
      accuracy_radius: 25
    },
    timestamp: '2026-07-25T10:13:22.456Z',
    severity: SeverityLevel.HIGH,
    category: AlertCategory.RECONNAISSANCE,
    signature: 'ET DNS Suspicious Query - DGA Domain',
    target_ip: '196.200.100.52',
    count: 89,
    is_targeted_attack: false
  },
  {
    id: 'amp-004',
    location: {
      ip: '194.163.128.50',
      country: 'Russia',
      country_code: 'RU',
      city: 'Moscow',
      latitude: 55.7558,
      longitude: 37.6173,
      accuracy_radius: 30
    },
    timestamp: '2026-07-25T10:12:18.901Z',
    severity: SeverityLevel.CRITICAL,
    category: AlertCategory.MALWARE,
    signature: 'ET TROJAN Metasploit Default Pattern Detected',
    target_ip: '196.200.100.53',
    count: 12,
    is_targeted_attack: true
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply filters to alert list
 */
function applyFilters(alerts: EveEvent[], filter: Partial<AlertFilter>): EveEvent[] {
  let filtered = [...alerts];

  // Time range filtering (mock implementation)
  if (filter.time_range) {
    const now = new Date();
    let startTime: Date;
    
    switch (filter.time_range) {
      case TimeRange.LAST_HOUR:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case TimeRange.LAST_6_HOURS:
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case TimeRange.LAST_12_HOURS:
        startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case TimeRange.LAST_24_HOURS:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TimeRange.LAST_7_DAYS:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TimeRange.LAST_30_DAYS:
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    filtered = filtered.filter(a => new Date(a.timestamp) >= startTime);
  }

  // Severity filter
  if (filter.severities?.length) {
    filtered = filtered.filter(a => 
      a.alert && filter.severities!.includes(
        Object.entries(SEVERITY_CONFIG).find(([_, config]) => 
          config.score === (5 - a.alert!.severity)
        )?.[0] as SeverityLevel || SeverityLevel.INFORMATIONAL
      )
    );
  }

  // Category filter
  if (filter.categories?.length) {
    filtered = filtered.filter(a =>
      a.alert?.classification && filter.categories!.includes(a.alert.classification.category)
    );
  }

  // Source IP filter
  if (filter.src_ip) {
    filtered = filtered.filter(a => a.src_ip === filter.src_ip);
  }

  // Destination IP filter
  if (filter.dest_ip) {
    filtered = filtered.filter(a => a.dest_ip === filter.dest_ip);
  }

  // Port filters
  if (filter.src_port) {
    filtered = filtered.filter(a => a.src_port === filter.src_port);
  }

  if (filter.dest_port) {
    filtered = filtered.filter(a => a.dest_port === filter.dest_port);
  }

  // Protocol filter
  if (filter.protocol) {
    filtered = filtered.filter(a => a.proto.toUpperCase() === filter.protocol);
  }

  // Signature ID filter
  if (filter.signature_id) {
    filtered = filtered.filter(a => a.alert?.signature_id === filter.signature_id);
  }

  // Action filter
  if (filter.actions?.length) {
    filtered = filtered.filter(a => 
      a.alert && filter.actions!.includes(a.alert.action)
    );
  }

  // False positive filter
  if (filter.is_false_positive !== undefined) {
    filtered = filtered.filter(a =>
      a.alert?.classification?.is_false_positive === filter.is_false_positive
    );
  }

  // Threat intel match filter
  if (filter.has_threat_intel_match !== undefined) {
    filtered = filtered.filter(a => {
      if (!filter.has_threat_intel_match) return true;
      return a.alert?.threat_intel?.matched === true;
    });
  }

  return filtered;
}

/**
 * Sort alerts
 */
function sortAlerts(
  alerts: EveEvent[], 
  sortBy: string = 'timestamp', 
  sortOrder: 'asc' | 'desc' = 'desc'
): EveEvent[] {
  return [...alerts].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'timestamp':
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case 'severity':
        comparison = (a.alert?.severity || 5) - (b.alert?.severity || 5);
        break;
      case 'src_ip':
        comparison = a.src_ip.localeCompare(b.src_ip);
        break;
      case 'dest_ip':
        comparison = a.dest_ip.localeCompare(b.dest_ip);
        break;
      case 'signature':
        comparison = (a.alert?.signature || '').localeCompare(b.alert?.signature || '');
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Calculate aggregations from alerts
 */
function calculateAggregations(alerts: EveEvent[]): AlertAggregations {
  const aggregations: AlertAggregations = {
    by_severity: {} as Record<SeverityLevel, number>,
    by_category: {} as Record<AlertCategory, number>,
    by_protocol: {},
    by_sensor: {},
    by_hour: {},
    by_action: {} as Record<RuleAction, number>
  };

  // Initialize counters
  Object.values(SeverityLevel).forEach(s => {
    aggregations.by_severity[s] = 0;
  });
  Object.values(AlertCategory).forEach(c => {
    aggregations.by_category[c] = 0;
  });
  Object.values(RuleAction).forEach(a => {
    aggregations.by_action[a] = 0;
  });

  alerts.forEach(alert => {
    // Severity aggregation
    if (alert.alert) {
      const severity = Object.entries(SEVERITY_CONFIG).find(([_, config]) =>
        config.score === (5 - alert.alert!.severity)
      )?.[0] as SeverityLevel || SeverityLevel.INFORMATIONAL;
      
      aggregations.by_severity[severity] = 
        (aggregations.by_severity[severity] || 0) + 1;

      // Category aggregation
      if (alert.alert.classification) {
        aggregations.by_category[alert.alert.classification.category] =
          (aggregations.by_category[alert.alert.classification.category] || 0) + 1;
      }

      // Action aggregation
      aggregations.by_action[alert.alert.action] =
        (aggregations.by_action[alert.alert.action] || 0) + 1;
    }

    // Protocol aggregation
    aggregations.by_protocol[alert.proto] =
      (aggregations.by_protocol[alert.proto] || 0) + 1;

    // Hour aggregation
    const hour = new Date(alert.timestamp).getHours().toString().padStart(2, '0');
    aggregations.by_hour[hour] = (aggregations.by_hour[hour] || 0) + 1;

    // Sensor aggregation (mock)
    aggregations.by_sensor['sensor-algiers-01'] =
      (aggregations.by_sensor['sensor-algiers-01'] || 0) + 1;
  });

  return aggregations;
}

/**
 * Paginate results
 */
function paginate<T>(items: T[], page: number = 1, pageSize: number = 20): {
  items: T[];
  total: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const items_ = items.slice(startIndex, startIndex + pageSize);

  return {
    items: items_,
    total,
    totalPages
  };
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/suricata/alerts
 * Search and list alerts with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filter: AlertFilter = {
      time_range: searchParams.get('time_range') as TimeRange || TimeRange.LAST_24_HOURS,
      time_start: searchParams.get('time_start') || undefined,
      time_end: searchParams.get('time_end') || undefined,
      severities: searchParams.get('severities')?.split(',') as SeverityLevel[] | undefined,
      categories: searchParams.get('categories')?.split(',') as AlertCategory[] | undefined,
      src_ip: searchParams.get('src_ip') || undefined,
      dest_ip: searchParams.get('dest_ip') || undefined,
      src_port: searchParams.get('src_port') ? parseInt(searchParams.get('src_posert')!) : undefined,
      dest_port: searchParams.get('dest_port') ? parseInt(searchParams.get('dest_port')!) : undefined,
      protocol: searchParams.get('protocol') as Protocol | undefined,
      signature_id: searchParams.get('signature_id') ? parseInt(searchParams.get('signature_id')!) : undefined,
      signature_pattern: searchParams.get('signature_pattern') || undefined,
      actions: searchParams.get('actions')?.split(',') as RuleAction[] | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 20,
      sort_by: searchParams.get('sort_by') as any || 'timestamp',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      is_false_positive: searchParams.get('is_false_positive') === 'true' ? true :
                          searchParams.get('is_false_positive') === 'false' ? false : undefined,
      has_threat_intel_match: searchParams.get('has_threat_intel_match') === 'true' ? true :
                               searchParams.get('has_threat_intel_match') === 'false' ? false : undefined
    };

    // Apply filters
    let filteredAlerts = applyFilters(mockAlerts, filter);

    // Sort
    filteredAlerts = sortAlerts(filteredAlerts, filter.sort_by, filter.sort_order);

    // Paginate
    const paginatedResult = paginate(filteredAlerts, filter.page, filter.page_size);

    // Calculate aggregations
    const aggregations = calculateAggregations(mockAlerts);

    const result: AlertResultSet = {
      alerts: paginatedResult.items,
      total: paginatedResult.total,
      page: filter.page,
      page_size: filter.page_size,
      total_pages: paginatedResult.totalPages,
      aggregations,
      query_time_ms: 2, // Mock timing
      applied_filters: filter
    };

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: 2,
        cached: false
      }
    });

  } catch (error) {
    console.error('[Suricata Alerts API] Error:', error);
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

/**
 * POST /api/suricata/alerts
 * Create alert annotation or perform bulk operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'mark-false-positive':
        // Handle false positive marking
        return NextResponse.json({
          success: true,
          data: {
            alert_id: params.alert_id,
            marked: true,
            reason: params.reason,
            marked_at: new Date().toISOString(),
            marked_by: params.user_id || 'system'
          }
        });

      case 'bulk-mark-false-positive':
        // Handle bulk false positive marking
        return NextResponse.json({
          success: true,
          data: {
            succeeded: params.alert_ids.length,
            failed: 0,
            errors: [],
            operation_id: `op-${Date.now()}`
          }
        });

      case 'add-note':
        // Add analyst note to alert
        return NextResponse.json({
          success: true,
          data: {
            alert_id: params.alert_id,
            note_id: `note-${Date.now()}`,
            content: params.content,
            created_at: new Date().toISOString(),
            created_by: params.user_id || 'analyst'
          }
        });

      case 'assign':
        // Assign alert to analyst
        return NextResponse.json({
          success: true,
          data: {
            alert_id: params.alert_id,
            assigned_to: params.analyst_id,
            assigned_at: new Date().toISOString(),
            assigned_by: params.user_id || 'system'
          }
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Suricata Alerts API] POST Error:', error);
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
