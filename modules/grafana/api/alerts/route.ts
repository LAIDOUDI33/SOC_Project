/**
 * Grafana Alerts API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Endpoints:
 * - GET /api/grafana/alerts - List alert rules
 * - POST /api/grafana/alerts - Create alert rule
 * - PUT /api/grafana/alerts/[id] - Update alert rule
 * - DELETE /api/grafana/alerts/[id] - Delete alert rule
 * - GET /api/grafana/alerts/history - Alert history/incidents
 * - POST /api/grafana/alerts/pause - Pause/resume alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  AlertRule,
  AlertIncident,
  AlertHistoryEntry,
  AlertState,
  GrafanaAPIResponse,
} from '../../types/grafana.types';

// ============================================================
// Mock Data for Development
// ============================================================

/** Mock alert rules for development/testing */
const mockAlertRules: AlertRule[] = [
  {
    id: 1,
    uid: 'alert-high-events-rate',
    orgId: 1,
    folderId: 0,
    folderUid: 'soc-dashboards',
    title: 'High Security Events Rate',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'prometheus', uid: 'prometheus' },
        queryType: '',
        model: { refId: 'A', expr: 'sum(rate(wazuh_events_total[5m]))', intervalMs: 30000, maxDataPoints: 43200 },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'last', params: [] },
            evaluator: { type: 'gt', params: [1000] },
          },
        ],
      },
    ],
    ruleGroup: 'SOC Critical Alerts',
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '5m',
    annotations: {
      summary: 'Security events rate is above threshold ({{ $value }} events/min)',
      description: 'The security events rate has exceeded 1000 events per minute for more than 5 minutes.\n\n**Dashboard:** [SOC Overview](/d/soc-overview)\n\n**Action Required:** Investigate potential security incident.',
    },
    labels: { severity: 'critical', team: 'soc-tier1' },
    isPaused: false,
    currentState: 'ok',
    stateSince: '2026-02-14T10:30:00Z',
    stateChangesCount: 12,
    intervalSeconds: 60,
    notifications: [
      { uid: 'slack-soc-alerts', resolvedMessage: false, groupWait: '30s', groupInterval: '5m' },
      { uid: 'email-oncall', resolvedMessage: true, groupWait: '5m', groupInterval: '15m' },
    ],
    created: '2026-01-15T08:00:00Z',
    updated: '2026-02-14T08:00:00Z',
    version: 3,
    health: 'ok',
    lastEvaluation: '2026-02-14T12:34:56Z',
    nextEvaluation: '2026-02-14T12:35:56Z',
  },
  {
    id: 2,
    uid: 'alert-critical-wazuh-alerts',
    orgId: 1,
    folderId: 0,
    folderUid: 'soc-dashboards',
    title: 'Critical Wazuh Alerts Detected',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'prometheus', uid: 'prometheus' },
        queryType: '',
        model: { refId: 'A', expr: 'wazuh_alerts{level="critical"}', intervalMs: 60000, maxDataPoints: 43200 },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'count', params: [] },
            evaluator: { type: 'gt', params: [0] },
          },
        ],
      },
    ],
    ruleGroup: 'SOC Critical Alerts',
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '1m',
    annotations: {
      summary: '{{ $value }} critical Wazuh alerts detected',
      description: 'Critical level alerts have been detected by Wazuh SIEM.\n\n**Immediate investigation required.**\n\n[View in Wazuh](/wazuh)',
    },
    labels: { severity: 'critical', source: 'wazuh', team: 'soc-tier2' },
    isPaused: false,
    currentState: 'alerting',
    stateSince: '2026-02-14T11:45:00Z',
    stateChangesCount: 28,
    intervalSeconds: 60,
    notifications: [
      { uid: 'slack-critical', resolvedMessage: false, groupWait: '10s', groupInterval: '1m' },
      { uid: 'pagerduty-soc', resolvedMessage: true, groupWait: '30s', groupInterval: '5m' },
    ],
    created: '2026-01-15T08:00:00Z',
    updated: '2026-02-13T16:20:00Z',
    version: 7,
    health: 'ok',
    lastEvaluation: '2026-02-14T12:34:50Z',
    nextEvaluation: '2026-02-14T12:35:50Z',
  },
  {
    id: 3,
    uid: 'alert-suricata-intrusion',
    orgId: 1,
    folderId: 0,
    folderUid: 'soc-dashboards',
    title: 'Suricata Intrusion Detection Alert',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'prometheus', uid: 'prometheus' },
        queryType: '',
        model: { refId: 'A', expr: 'suricata_alerts{action="blocked"}', intervalMs: 30000, maxDataPoints: 43200 },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'count', params: [] },
            evaluator: { type: 'gt', params: [10] },
          },
        ],
      },
    ],
    ruleGroup: 'Network Security Alerts',
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '3m',
    annotations: {
      summary: 'Multiple intrusion attempts blocked ({{ $value }} in 3min)',
      description: 'Suricata has blocked multiple intrusion attempts within a short time window.\n\n**Possible attack pattern detected.**\n\n[View Suricata Dashboard](/d/suricata-ids)',
    },
    labels: { severity: 'high', source: 'suricata', category: 'network' },
    isPaused: false,
    currentState: 'ok',
    stateSince: '2026-02-14T09:15:00Z',
    stateChangesCount: 8,
    intervalSeconds: 30,
    notifications: [
      { uid: 'slack-network', resolvedMessage: false, groupWait: '30s', groupInterval: '5m' },
    ],
    created: '2026-01-20T10:00:00Z',
    updated: '2026-02-14T07:30:00Z',
    version: 4,
    health: 'ok',
    lastEvaluation: '2026-02-14T12:34:55Z',
    nextEvaluation: '2026-02-14T12:35:25Z',
  },
  {
    id: 4,
    uid: 'alert-misp-ioc-match',
    orgId: 1,
    folderId: 0,
    folderUid: 'soc-dashboards',
    title: 'MISP IOC Match Detected',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'elasticsearch', uid: 'elasticsearch' },
        queryType: '',
        model: { refId: 'A', index: 'wazuh-alerts-*', query: { bool: { must: [{ match: { "rule.misp_matched": true } }] } } },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'count', params: [] },
            evaluator: { type: 'gt', params: [0] },
          },
        ],
      },
    ],
    ruleGroup: 'Threat Intelligence Alerts',
    noDataState: 'NoData',
    execErrState: 'Ok',
    for: '0s',
    annotations: {
      summary: 'Threat intelligence IOC match found',
      description: 'An indicator of compromise from MISP has been matched in recent logs.\n\n**Review immediately for potential breach.**\n\n[View MISP Event](/misp)',
    },
    labels: { severity: 'critical', source: 'misp', category: 'threat-intel' },
    isPaused: false,
    currentState: 'ok',
    stateSince: '2026-02-13T18:22:00Z',
    stateChangesCount: 5,
    intervalSeconds: 120,
    notifications: [
      { uid: 'slack-threat-intel', resolvedMessage: false, groupWait: '10s', groupInterval: '1m' },
      { uid: 'email-analysts', resolvedMessage: true, groupWait: '5m', groupInterval: '30m' },
    ],
    created: '2026-02-01T14:00:00Z',
    updated: '2026-02-14T06:00:00Z',
    version: 2,
    health: 'ok',
    lastEvaluation: '2026-02-14T12:33:00Z',
    nextEvaluation: '2026-02-14T12:35:00Z',
  },
  {
    id: 5,
    uid: 'alert-system-memory-high',
    orgId: 1,
    folderId: 0,
    folderUid: 'system-monitoring',
    title: 'System Memory Usage High',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'prometheus', uid: 'prometheus' },
        queryType: '',
        model: { refId: 'A', expr: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100', intervalMs: 15000, maxDataPoints: 43200 },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'avg', params: [] },
            evaluator: { type: 'gt', params: [90] },
          },
        ],
      },
    ],
    ruleGroup: 'Infrastructure Alerts',
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '10m',
    annotations: {
      summary: 'Memory usage on {{ $labels.instance }} is {{ $value }}%',
      description: 'System memory usage has been above 90% for more than 10 minutes.\n\n**Potential memory leak or resource exhaustion.**\n\nInstance: {{ $labels.instance }}',
    },
    labels: { severity: 'warning', category: 'infrastructure' },
    isPaused: true,
    currentState: 'paused',
    stateSince: '2026-02-10T20:00:00Z',
    stateChangesCount: 3,
    intervalSeconds: 60,
    notifications: [
      { uid: 'email-ops', resolvedMessage: true, groupWait: '15m', groupInterval: '1h' },
    ],
    created: '2026-01-10T09:00:00Z',
    updated: '2026-02-10T20:05:00Z',
    version: 5,
    health: 'nodata',
    lastEvaluation: '2026-02-10T20:04:59Z',
    nextEvaluation: null as unknown as string,
  },
  {
    id: 6,
    uid: 'alert-thehive-new-case',
    orgId: 1,
    folderId: 0,
    folderUid: 'soc-dashboards',
    title: 'New TheHive Case Created',
    condition: 'B',
    data: [
      {
        refId: 'A',
        datasource: { type: 'prometheus', uid: 'prometheus' },
        queryType: '',
        model: { refId: 'A', expr: 'thehive_cases_created_total', intervalMs: 60000, maxDataPoints: 1440 },
      },
      {
        refId: 'B',
        operator: { type: 'and' },
        conditions: [
          {
            type: 'query',
            query: { params: ['A'] },
            reducer: { type: 'increase', params: ['5m'] },
            evaluator: { type: 'gt', params: [0] },
          },
        ],
      },
    ],
    ruleGroup: 'Incident Response Alerts',
    noDataState: 'NoData',
    execErrState: 'Ok',
    for: '0s',
    annotations: {
      summary: '{{ $value }} new case(s) created in TheHive',
      description: 'New incident case(s) have been created in TheHive SOAR platform.\n\n[View Cases](/thehive)',
    },
    labels: { severity: 'info', source: 'thehive', category: 'incident-response' },
    isPaused: false,
    currentState: 'ok',
    stateSince: '2026-02-14T11:00:00Z',
    stateChangesCount: 45,
    intervalSeconds: 60,
    notifications: [
      { uid: 'slack-incidents', resolvedMessage: false, groupWait: '1m', groupInterval: '10m' },
    ],
    created: '2026-01-15T08:00:00Z',
    updated: '2026-02-14T08:00:00Z',
    version: 2,
    health: 'ok',
    lastEvaluation: '2026-02-14T12:34:58Z',
    nextEvaluation: '2026-02-14T12:35:58Z',
  },
];

/** Mock alert incidents */
const mockIncidents: AlertIncident[] = [
  {
    id: 1001,
    alertRuleUID: 'alert-critical-wazuh-alerts',
    ruleName: 'Critical Wazuh Alerts Detected',
    orgId: 1,
    startedAt: '2026-02-14T11:45:00Z',
    endedAt: undefined,
    stateDuringIncident: 'alerting',
    currentState: 'alerting',
    labels: { severity: 'critical', source: 'wazuh' },
    annotations: {},
    severity: 'critical',
  },
  {
    id: 1002,
    alertRuleUID: 'alert-suricata-intrusion',
    ruleName: 'Suricata Intrusion Detection Alert',
    orgId: 1,
    startedAt: '2026-02-14T03:22:00Z',
    endedAt: '2026-02-14T04:15:00Z',
    stateDuringIncident: 'alerting',
    currentState: 'ok',
    labels: { severity: 'high', source: 'suricata' },
    annotations: {},
    severity: 'high',
  },
  {
    id: 1003,
    alertRuleUID: 'alert-misp-ioc-match',
    ruleName: 'MISP IOC Match Detected',
    orgId: 1,
    startedAt: '2026-02-13T18:22:00Z',
    endedAt: '2026-02-13T19:45:00Z',
    stateDuringIncident: 'alerting',
    currentState: 'ok',
    labels: { severity: 'critical', source: 'misp' },
    annotations: {},
    severity: 'critical',
  },
];

/** Mock alert history */
const mockHistory: AlertHistoryEntry[] = [
  {
    id: 5001,
    timestamp: '2026-02-14T11:45:23Z',
    previousState: 'ok',
    newState: 'alerting',
    ruleId: 2,
    ruleUID: 'alert-critical-wazuh-alerts',
    ruleName: 'Critical Wazuh Alerts Detected',
    ruleGroup: 'SOC Critical Alerts',
    folderId: 0,
    orgId: 1,
    info: 'Alert Rule State Changed',
    durationSeconds: 0,
    labels: { severity: 'critical' },
    annotations: {},
    data: { evaluatedAt: '2026-02-14T11:45:23Z', values: [5] },
    version: 1,
  },
  {
    id: 5002,
    timestamp: '2026-02-14T09:15:00Z',
    previousState: 'alerting',
    newState: 'ok',
    ruleId: 3,
    ruleUID: 'alert-suricata-intrusion',
    ruleName: 'Suricata Intrusion Detection Alert',
    ruleGroup: 'Network Security Alerts',
    folderId: 0,
    orgId: 1,
    info: 'Alert Rule State Changed',
    durationSeconds: 3600,
    labels: { severity: 'high' },
    annotations: {},
    data: { evaluatedAt: '2026-02-14T09:15:00Z', values: [0] },
    version: 1,
  },
  {
    id: 5003,
    timestamp: '2026-02-14T08:22:33Z',
    previousState: 'ok',
    newState: 'alerting',
    ruleId: 3,
    ruleUID: 'alert-suricata-intrusion',
    ruleName: 'Suricata Intrusion Detection Alert',
    ruleGroup: 'Network Security Alerts',
    folderId: 0,
    orgId: 1,
    info: 'Alert Rule State Changed',
    durationSeconds: 0,
    labels: { severity: 'high' },
    annotations: {},
    data: { evaluatedAt: '2026-02-14T08:22:33Z', values: [15] },
    version: 1,
  },
  {
    id: 5004,
    timestamp: '2026-02-13T19:45:12Z',
    previousState: 'alerting',
    newState: 'ok',
    ruleId: 4,
    ruleUID: 'alert-misp-ioc-match',
    ruleName: 'MISP IOC Match Detected',
    ruleGroup: 'Threat Intelligence Alerts',
    folderId: 0,
    orgId: 1,
    info: 'Alert Rule State Changed',
    durationSeconds: 4692,
    labels: { severity: 'critical' },
    annotations: {},
    data: { evaluatedAt: '2026-02-13T19:45:12Z', values: [0] },
    version: 1,
  },
  {
    id: 5005,
    timestamp: '2026-02-13T18:22:45Z',
    previousState: 'ok',
    newState: 'alerting',
    ruleId: 4,
    ruleUID: 'alert-misp-ioc-match',
    ruleName: 'MISP IOC Match Detected',
    ruleGroup: 'Threat Intelligence Alerts',
    folderId: 0,
    orgId: 1,
    info: 'Alert Rule State Changed',
    durationSeconds: 0,
    labels: { severity: 'critical' },
    annotations: {},
    data: { evaluatedAt: '2026-02-13T18:22:45Z', values: [3] },
    version: 1,
  },
];

// ============================================================
// Helper Functions
// ============================================================

/** Create standardized API response */
function createApiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse<GrafanaAPIResponse<T>> {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      message: message || (status >= 200 && status < 300 ? 'Success' : 'Error'),
      data,
    },
    { status }
  );
}

/** Parse search parameters */
function parseSearchParams(request: NextRequest): {
  state?: AlertState;
  limit?: number;
  page?: number;
  query?: string;
} {
  const { searchParams } = new URL(request.url);
  
  return {
    state: searchParams.get('state') as AlertState | undefined,
    limit: parseInt(searchParams.get('limit') || '50', 10),
    page: parseInt(searchParams.get('page') || '1', 10),
    query: searchParams.get('query') || undefined,
  };
}

/** Filter alerts based on parameters */
function filterAlerts(params: ReturnType<typeof parseSearchParams>): {
  alerts: AlertRule[];
  total: number;
} {
  let filtered = [...mockAlertRules];
  
  if (params.state) {
    filtered = filtered.filter(a => 
      a.currentState === params.state ||
      (params.state === 'paused' && a.isPaused)
    );
  }
  
  if (params.query) {
    const query = params.query.toLowerCase();
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.ruleGroup.toLowerCase().includes(query) ||
      Object.values(a.labels).some(l => String(l).toLowerCase().includes(query))
    );
  }
  
  const total = filtered.length;
  const limit = params.limit || 50;
  const page = params.page || 1;
  const start = (page - 1) * limit;
  
  return {
    alerts: filtered.slice(start, start + limit),
    total,
  };
}

// ============================================================
// API Handlers
// ============================================================

/**
 * GET /api/grafana/alerts
 * List all alert rules with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle different actions
    if (action === 'history') {
      return getAlertHistory(request);
    }

    if (action === 'incidents') {
      return getAlertIncidents(request);
    }

    if (action === 'summary') {
      return getAlertSummary();
    }

    // Default: list alert rules
    const params = parseSearchParams(request);
    const { alerts, total } = filterAlerts(params);

    // Calculate summary stats
    const summary = {
      total: mockAlertRules.length,
      byState: {
        ok: mockAlertRules.filter(a => a.currentState === 'ok').length,
        alerting: mockAlertRules.filter(a => a.currentState === 'alerting').length,
        paused: mockAlertRules.filter(a => a.isPaused).length,
        nodata: mockAlertRules.filter(a => a.health === 'nodata').length,
        error: mockAlertRules.filter(a => a.health === 'error').length,
      },
      bySeverity: {
        critical: mockAlertRules.filter(a => a.labels.severity === 'critical').length,
        high: mockAlertRules.filter(a => a.labels.severity === 'high').length,
        warning: mockAlertRules.filter(a => a.labels.severity === 'warning').length,
        info: mockAlertRules.filter(a => a.labels.severity === 'info').length,
      },
    };

    return createApiResponse({
      items: alerts,
      total,
      page: params.page || 1,
      pageSize: params.limit || 50,
      totalPages: Math.ceil(total / (params.limit || 50)),
      summary,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return createApiResponse(
      { error: 'Failed to fetch alerts' } as unknown as never,
      500,
      'Internal server error'
    );
  }
}

/**
 * POST /api/grafana/alerts
 * Create new alert rule or batch operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ...alertData } = body;

    if (action === 'pause') {
      return handlePauseResume(alertData);
    }

    if (action === 'batch-pause') {
      return handleBatchPauseResume(alertData);
    }

    // Create new alert rule
    const newAlert: AlertRule = {
      id: mockAlertRules.length + 1,
      uid: `alert-${Date.now()}`,
      orgId: 1,
      folderId: body.folderId || 0,
      folderUid: body.folderUid || 'default',
      title: body.title || 'Untitled Alert',
      condition: body.condition || 'B',
      data: body.data || [],
      ruleGroup: body.ruleGroup || 'Default',
      noDataState: body.noDataState || 'NoData',
      execErrState: body.execErrState || 'Alerting',
      for: body.for || '5m',
      annotations: body.annotations || {},
      labels: body.labels || {},
      isPaused: body.isPaused ?? false,
      currentState: 'normal',
      stateSince: new Date().toISOString(),
      stateChangesCount: 0,
      intervalSeconds: body.intervalSeconds || 60,
      notifications: body.notifications || [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: 1,
      health: 'ok',
    };

    mockAlertRules.push(newAlert);

    return createApiResponse(newAlert, 201, 'Alert rule created successfully');
  } catch (error) {
    console.error('Error creating alert:', error);
    return createApiResponse(
      { error: 'Failed to create alert rule' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Get alert history entries
 */
async function getAlertHistory(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const start = (page - 1) * limit;
  const paginatedHistory = mockHistory.slice(start, start + limit);

  return createApiResponse({
    items: paginatedHistory,
    total: mockHistory.length,
    page,
    pageSize: limit,
    totalPages: Math.ceil(mockHistory.length / limit),
  });
}

/**
 * Get active alert incidents
 */
async function getAlertIncidents(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') as AlertState | undefined;

  let incidents = [...mockIncidents];
  
  if (state) {
    incidents = incidents.filter(i => i.stateDuringIncident === state);
  }

  return createApiResponse({
    items: incidents,
    total: incidents.length,
  });
}

/**
 * Get alert summary statistics
 */
function getAlertSummary(): NextResponse {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return createApiResponse({
    totalRules: mockAlertRules.length,
    activeRules: mockAlertRules.filter(a => !a.isPaused).length,
    pausedRules: mockAlertRules.filter(a => a.isPaused).length,
    currentlyAlerting: mockAlertRules.filter(a => a.currentState === 'alerting').length,
    healthyRules: mockAlertRules.filter(a => a.health === 'ok').length,
    unhealthyRules: mockAlertRules.filter(a => a.health !== 'ok').length,
    states: {
      ok: mockAlertRules.filter(a => a.currentState === 'ok').length,
      alerting: mockAlertRules.filter(a => a.currentState === 'alerting').length,
      pending: mockAlertRules.filter(a => a.currentState === 'pending').length,
      paused: mockAlertRules.filter(a => a.isPaused).length,
    },
    severities: {
      critical: mockAlertRules.filter(a => a.labels.severity === 'critical'),
      high: mockAlertRules.filter(a => a.labels.severity === 'high'),
      warning: mockAlertRules.filter(a => a.labels.severity === 'warning'),
      info: mockAlertRules.filter(a => a.labels.severity === 'info'),
    },
    activeIncidents: mockIncidents.filter(i => !i.endedAt),
    incidentsLast24h: mockIncidents.filter(
      i => new Date(i.startedAt) > twentyFourHoursAgo
    ).length,
    stateChangesLastHour: mockHistory.filter(
      h => new Date(h.timestamp) > oneHourAgo
    ).length,
  });
}

/**
 * Handle pause/resume single alert
 */
function handlePauseResume(data: Record<string, unknown>): NextResponse {
  const { uid, paused } = data;

  if (!uid || typeof paused !== 'boolean') {
    return createApiResponse(null, 400, 'uid and paused fields are required');
  }

  const alertIndex = mockAlertRules.findIndex(a => a.uid === uid);
  
  if (alertIndex === -1) {
    return createApiResponse(null, 404, 'Alert rule not found');
  }

  mockAlertRules[alertIndex].isPaused = paused;
  mockAlertRules[alertIndex].currentState = paused ? 'paused' : 'ok';
  mockAlertRules[alertIndex].updated = new Date().toISOString();

  return createApiResponse({
    ...mockAlertRules[alertIndex],
    message: `Alert ${paused ? 'paused' : 'resumed'} successfully`,
  });
}

/**
 * Handle batch pause/resume
 */
function handleBatchPauseResume(data: Record<string, unknown>): NextResponse {
  const { uids, paused } = data;

  if (!Array.isArray(uids) || typeof paused !== 'boolean') {
    return createApiResponse(null, 400, 'uids array and paused boolean are required');
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ item: string; reason: string }> = [];

  uids.forEach((uid: unknown) => {
    const alertIndex = mockAlertRules.findIndex(a => a.uid === uid);
    
    if (alertIndex === -1) {
      failedCount++;
      errors.push({ item: String(uid), reason: 'Alert not found' });
      return;
    }

    mockAlertRules[alertIndex].isPaused = paused;
    mockAlertRules[alertIndex].currentState = paused ? 'paused' : 'ok';
    mockAlertRules[alertIndex].updated = new Date().toISOString();
    successCount++;
  });

  return createApiResponse({
    successCount,
    failedCount,
    errors,
    message: `${successCount} alerts ${paused ? 'paused' : 'resumed'}, ${failedCount} failed`,
  });
}

/**
 * Handle individual alert operations by ID
 */
export async function alertByID(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const id = params.id;

  switch (request.method) {
    case 'GET':
      return getAlertByID(id);
    case 'PUT':
      return updateAlert(id, request);
    case 'DELETE':
      return deleteAlert(id);
    default:
      return createApiResponse(null, 405, 'Method not allowed');
  }
}

/**
 * Get single alert by ID
 */
async function getAlertByID(id: string): Promise<NextResponse> {
  const alert = mockAlertRules.find(a => a.id === parseInt(id, 10));

  if (!alert) {
    return createApiResponse(null, 404, 'Alert rule not found');
  }

  return createApiResponse(alert);
}

/**
 * Update alert by ID
 */
async function updateAlert(id: string, request: NextRequest): Promise<NextResponse> {
  const alertIndex = mockAlertRules.findIndex(a => a.id === parseInt(id, 10));

  if (alertIndex === -1) {
    return createApiResponse(null, 404, 'Alert rule not found');
  }

  try {
    const updates = await request.json();

    mockAlertRules[alertIndex] = {
      ...mockAlertRules[alertIndex],
      ...(updates.title && { title: updates.title }),
      ...(updates.annotations && { annotations: updates.annotations }),
      ...(updates.labels && { labels: updates.labels }),
      ...(updates.isPaused !== undefined && { isPaused: updates.isPaused }),
      ...(updates.condition && { condition: updates.condition }),
      ...(updates.data && { data: updates.data }),
      ...(updates.for && { for: updates.for }),
      ...(updates.noDataState && { noDataState: updates.noDataState }),
      ...(updates.execErrState && { execErrState: updates.execErrState }),
      ...(updates.notifications && { notifications: updates.notifications }),
      updated: new Date().toISOString(),
      version: mockAlertRules[alertIndex].version + 1,
    };

    return createApiResponse(mockAlertRules[alertIndex]);
  } catch (error) {
    return createApiResponse(
      { error: 'Invalid request body' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Delete alert by ID
 */
async function deleteAlert(id: string): Promise<NextResponse> {
  const alertIndex = mockAlertRules.findIndex(a => a.id === parseInt(id, 10));

  if (alertIndex === -1) {
    return createApiResponse(null, 404, 'Alert rule not found');
  }

  const deleted = mockAlertRules.splice(alertIndex, 1)[0];

  return createApiResponse({
    message: 'Alert rule deleted successfully',
    deleted: deleted,
  });
}

// Export handlers for dynamic routes
export { alertByID as GET, alertByID as PUT, alertByID as DELETE };
