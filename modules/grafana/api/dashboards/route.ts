/**
 * Grafana Dashboards API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Endpoints:
 * - GET /api/grafana/dashboards - List dashboards with search/filter
 * - GET /api/grafana/dashboards/[uid] - Get dashboard by UID
 * - POST /api/grafana/dashboards - Create new dashboard
 * - PUT /api/grafana/dashboards/[uid] - Update dashboard
 * - DELETE /api/grafana/dashboards/[uid] - Delete dashboard
 * - POST /api/grafana/dashboards/import - Import from JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  GrafanaDashboard,
  DashboardSearchResult,
  DashboardSaveResponse,
  DashboardImportResponse,
  GrafanaAPIResponse,
} from '../../types/grafana.types';

// ============================================================
// Mock Data for Development
// ============================================================

/** Mock dashboards for development/testing */
const mockDashboards: DashboardSearchResult[] = [
  {
    id: 1,
    uid: 'soc-overview',
    title: 'SOC Overview',
    url: '/d/soc-overview/soc-overview',
    type: 'dash-db',
    tags: ['soc', 'overview', 'security'],
    isStarred: true,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
  {
    id: 2,
    uid: 'wazuh-events',
    title: 'Wazuh Security Events',
    url: '/d/wazuh-events/wazuh-security-events',
    type: 'dash-db',
    tags: ['wazuh', 'siem', 'events'],
    isStarred: true,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
  {
    id: 3,
    uid: 'suricata-ids',
    title: 'Suricata IDS/IPS Monitor',
    url: '/d/suricata-ids/suricata-ids-ips-monitor',
    type: 'dash-db',
    tags: ['suricata', 'ids', 'network'],
    isStarred: false,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
  {
    id: 4,
    uid: 'misp-threat-intel',
    title: 'MISP Threat Intelligence',
    url: '/d/misp-threat-intel/misp-threat-intelligence',
    type: 'dash-db',
    tags: ['misp', 'threat', 'intelligence'],
    isStarred: true,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
  {
    id: 5,
    uid: 'thehive-incidents',
    title: 'TheHive Incident Response',
    url: '/d/thehive-incidents/thehive-incident-response',
    type: 'dash-db',
    tags: ['thehive', 'soar', 'incidents'],
    isStarred: false,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
  {
    id: 6,
    uid: 'network-traffic',
    title: 'Network Traffic Analysis',
    url: '/d/network-traffic/network-traffic-analysis',
    type: 'dash-db',
    tags: ['network', 'traffic', 'analysis'],
    isStarred: false,
    folderId: 0,
    folderUid: '',
    folderTitle: 'Network Monitoring',
    folderUrl: '',
  },
  {
    id: 7,
    uid: 'system-health',
    title: 'Infrastructure Health',
    url: '/d/system-health/infrastructure-health',
    type: 'dash-db',
    tags: ['infrastructure', 'health', 'monitoring'],
    isStarred: true,
    folderId: 0,
    folderUid: '',
    folderTitle: 'System Monitoring',
    folderUrl: '',
  },
  {
    id: 8,
    uid: 'threat-hunting',
    title: 'Threat Hunting Workspace',
    url: '/d/threat-hunting/threat-hunting-workspace',
    type: 'dash-db',
    tags: ['hunting', 'analysis', 'forensics'],
    isStarred: false,
    folderId: 0,
    folderUid: '',
    folderTitle: 'SOC Dashboards',
    folderUrl: '',
  },
];

/** Mock full dashboard data */
const mockFullDashboard: GrafanaDashboard = {
  schemaVersion: 39,
  type: 'dashdb',
  uid: 'soc-overview',
  title: 'SOC Overview',
  tags: ['soc', 'overview', 'security'],
  timezone: 'browser',
  refresh: '30s',
  time: { from: 'now-6h', to: 'now' },
  timepicker: {
    hidden: false,
    refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
    time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d'],
  },
  graphTooltip: 'crosshairs',
  annotations: [],
  templating: { list: [] },
  panels: [
    {
      id: 1,
      type: 'stat',
      title: 'Security Events (24h)',
      gridPos: { x: 0, y: 0, w: 4, h: 4 },
      options: {
        colorMode: 'value',
        graphMode: 'area',
        reduceOptions: { values: false, calcs: ['lastNotNull'], current: true },
        noValue: 'No data',
        text: {},
      },
      targets: [{ refId: 'A', expr: 'sum(rate(wazuh_events_total[5m]))', datasource: { type: 'prometheus', uid: 'prometheus' } }],
      fieldConfig: { defaults: {}, overrides: [] },
    },
    {
      id: 2,
      type: 'stat',
      title: 'Active Incidents',
      gridPos: { x: 4, y: 0, w: 4, h: 4 },
      options: {
        colorMode: 'background',
        graphMode: 'none',
        reduceOptions: { values: false, calcs: ['lastNotNull'], current: true },
        thresholds: {
          mode: 'absolute',
          steps: [
            { value: null, color: 'green' },
            { value: 3, color: 'yellow' },
            { value: 10, color: 'red' },
          ],
        },
      },
      targets: [{ refId: 'A', expr: 'thehive_cases{status="Open"}', datasource: { type: 'prometheus', uid: 'prometheus' } }],
      fieldConfig: { defaults: {}, overrides: [] },
    },
    {
      id: 3,
      type: 'stat',
      title: 'Critical Alerts',
      gridPos: { x: 8, y: 0, w: 4, h: 4 },
      options: {
        colorMode: 'threshold',
        graphMode: 'area',
        reduceOptions: { values: false, calcs: ['lastNotNull'], current: true },
        thresholds: {
          mode: 'absolute',
          steps: [
            { value: null, color: 'green' },
            { value: 1, color: 'yellow' },
            { value: 5, color: 'red' },
          ],
        },
      },
      targets: [{ refId: 'A', expr: 'grafana_alerts_state{state="alerting", severity="critical"}', datasource: { type: 'prometheus', uid: 'prometheus' } }],
      fieldConfig: { defaults: {}, overrides: [] },
    },
    {
      id: 4,
      type: 'timeseries',
      title: 'Events Timeline',
      gridPos: { x: 0, y: 4, w: 16, h: 8 },
      options: {
        legend: { displayMode: 'table', placement: 'right', calcs: ['mean', 'max'] },
        tooltip: { mode: 'multi' },
      },
      targets: [
        { refId: 'A', expr: 'sum by (level) (rate(wazuh_events_total[5m]))', legendFormat: '{{level}}', datasource: { type: 'prometheus', uid: 'prometheus' } },
      ],
      fieldConfig: { defaults: {}, overrides: [] },
    },
  ],
  meta: {
    canEdit: true,
    canSave: true,
    canStar: true,
    isStarred: true,
    stars: 42,
    slug: 'soc-overview',
    url: '/d/soc-overview/soc-overview',
    folderTitle: 'SOC Dashboards',
    created: '2026-01-01T00:00:00Z',
    updated: '2026-02-14T12:34:56Z',
    createdBy: 'admin@algeria-soc.dz',
    updatedBy: 'analyst@algeria-soc.dz',
    version: 15,
    hasAcl: false,
  },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create standardized API response
 */
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

/**
 * Parse search parameters from request URL
 */
function parseSearchParams(request: NextRequest): {
  query?: string;
  tag?: string[];
  type?: string;
  starred?: boolean;
  limit?: number;
  page?: number;
  sort?: string;
} {
  const { searchParams } = new URL(request.url);
  
  return {
    query: searchParams.get('query') || undefined,
    tag: searchParams.get('tag')?.split(',').filter(Boolean),
    type: searchParams.get('type') as DashboardSearchResult['type'] | undefined,
    starred: searchParams.get('starred') === 'true',
    limit: parseInt(searchParams.get('limit') || '50', 10),
    page: parseInt(searchParams.get('page') || '1', 10),
    sort: searchParams.get('sort') || undefined,
  };
}

/**
 * Filter mock dashboards based on search params
 */
function filterDashboards(params: ReturnType<typeof parseSearchParams>): {
  dashboards: DashboardSearchResult[];
  total: number;
} {
  let filtered = [...mockDashboards];
  
  // Filter by query
  if (params.query) {
    const query = params.query.toLowerCase();
    filtered = filtered.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.tags.some(t => t.toLowerCase().includes(query))
    );
  }
  
  // Filter by tag
  if (params.tag?.length) {
    filtered = filtered.filter(d =>
      params.tag!.some(tag => d.tags.includes(tag))
    );
  }
  
  // Filter by type
  if (params.type) {
    filtered = filtered.filter(d => d.type === params.type);
  }
  
  // Filter by starred
  if (params.starred) {
    filtered = filtered.filter(d => d.isStarred);
  }
  
  // Sort
  if (params.sort) {
    switch (params.sort) {
      case 'sortAlphaAsc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'sortAlphaDesc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }
  }
  
  const total = filtered.length;
  
  // Paginate
  const limit = params.limit || 50;
  const page = params.page || 1;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  
  return { dashboards: paginated, total };
}

// ============================================================
// API Handlers
// ============================================================

/**
 * GET /api/grafana/dashboards
 * List all dashboards with optional filtering and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const params = parseSearchParams(request);
    const { dashboards, total } = filterDashboards(params);
    
    return createApiResponse({
      items: dashboards,
      total,
      page: params.page || 1,
      pageSize: params.limit || 50,
      totalPages: Math.ceil(total / (params.limit || 50)),
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return createApiResponse(
      { error: 'Failed to fetch dashboards' } as unknown as never,
      500,
      'Internal server error'
    );
  }
}

/**
 * POST /api/grafana/dashboards
 * Create a new dashboard or import one
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ...dashboardData } = body;

    if (action === 'import') {
      // Import dashboard from JSON
      return handleImportDashboard(dashboardData);
    }

    // Create new dashboard
    const newDashboard: DashboardSearchResult = {
      id: mockDashboards.length + 1,
      uid: `dashboard-${Date.now()}`,
      title: dashboardData.title || 'Untitled Dashboard',
      url: `/d/dashboard-${Date.now()}/${(dashboardData.title || 'untitled').toLowerCase().replace(/\s+/g, '-')}`,
      type: 'dash-db',
      tags: dashboardData.tags || [],
      isStarred: false,
      folderId: dashboardData.folderId || 0,
      folderUid: dashboardData.folderUid || '',
      folderTitle: dashboardData.folderTitle || 'General',
      folderUrl: '',
    };

    mockDashboards.push(newDashboard);

    return createApiResponse<DashboardSaveResponse>({
      id: newDashboard.id,
      slug: newDashboard.url.split('/').pop() || '',
      status: 'success',
      version: 1,
      message: 'Dashboard created successfully',
    }, 201, 'Dashboard created successfully');
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return createApiResponse(
      { error: 'Failed to create dashboard' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Handle dashboard import
 */
async function handleImportDashboard(data: Record<string, unknown>): Promise<NextResponse> {
  const dashboardJson = data.dashboard as Record<string, unknown>;
  
  if (!dashboardJson) {
    return createApiResponse(
      { error: 'Dashboard JSON is required' } as unknown as never,
      400,
      'Missing dashboard data'
    );
  }

  // Validate required fields
  if (!dashboardJson.title) {
    return createApiResponse(
      { error: 'Dashboard must have a title' } as unknown as never,
      400,
      'Missing dashboard title'
    );
  }

  // Check if dashboard with same title exists
  const existingIndex = mockDashboards.findIndex(
    d => d.title.toLowerCase() === String(dashboardJson.title).toLowerCase()
  );

  const overwrite = data.overwrite === true;
  
  if (existingIndex !== -1 && !overwrite) {
    return createApiResponse<DashboardImportResponse>({
      imported: false,
      importStatus: 'pre-existing',
      importMessage: 'A dashboard with this name already exists',
      importedUrl: '',
      importedSlug: '',
      overwritten: false,
    }, 409, 'Dashboard already exists');
  }

  // Import the dashboard
  const importedDashboard: DashboardSearchResult = {
    id: existingIndex !== -1 ? mockDashboards[existingIndex].id : mockDashboards.length + 1,
    uid: (dashboardJson.uid as string) || `imported-${Date.now()}`,
    title: dashboardJson.title as string,
    url: `/d/${(dashboardJson.uid as string) || `imported-${Date.now()}`}/${String(dashboardJson.title).toLowerCase().replace(/\s+/g, '-')}`,
    type: 'dash-db',
    tags: (dashboardJson.tags as string[]) || [],
    isStarred: false,
    folderId: (data.folderUid as number) || 0,
    folderUid: (data.folderUid as string) || '',
    folderTitle: 'Imported',
    folderUrl: '',
  };

  if (existingIndex !== -1) {
    mockDashboards[existingIndex] = importedDashboard;
  } else {
    mockDashboards.push(importedDashboard);
  }

  return createApiResponse<DashboardImportResponse>({
    imported: true,
    importStatus: 'success',
    importMessage: overwrite ? 'Dashboard overwritten successfully' : 'Dashboard imported successfully',
    importedUrl: importedDashboard.url,
    importedSlug: importedDashboard.url.split('/').pop() || '',
    overwritten: overwrite,
  }, 201, 'Dashboard imported successfully');
}

/**
 * Handle individual dashboard operations by UID
 */
export async function dashboardByUID(
  request: NextRequest,
  { params }: { params: { uid: string } }
): Promise<NextResponse> {
  const uid = params.uid;

  switch (request.method) {
    case 'GET':
      return getDashboardByUID(uid);
    case 'PUT':
      return updateDashboard(uid, request);
    case 'DELETE':
      return deleteDashboard(uid);
    default:
      return createApiResponse(null, 405, 'Method not allowed');
  }
}

/**
 * Get single dashboard by UID
 */
async function getDashboardByUID(uid: string): Promise<NextResponse> {
  const dashboard = mockDashboards.find(d => d.uid === uid);

  if (!dashboard) {
    return createApiResponse(null, 404, 'Dashboard not found');
  }

  // Return full dashboard with panels
  const fullDashboard = uid === 'soc-overview' 
    ? mockFullDashboard 
    : { ...mockFullDashboard, uid, title: dashboard.title };

  return createApiResponse(fullDashboard);
}

/**
 * Update dashboard by UID
 */
async function updateDashboard(uid: string, request: NextRequest): Promise<NextResponse> {
  const index = mockDashboards.findIndex(d => d.uid === uid);

  if (index === -1) {
    return createApiResponse(null, 404, 'Dashboard not found');
  }

  try {
    const updates = await request.json();

    // Apply updates
    mockDashboards[index] = {
      ...mockDashboards[index],
      ...(updates.title && { title: updates.title }),
      ...(updates.tags && { tags: updates.tags }),
    };

    return createApiResponse<DashboardSaveResponse>({
      id: mockDashboards[index].id,
      slug: mockDashboards[index].url.split('/').pop() || '',
      status: 'success',
      version: (mockFullDashboard.version || 1) + 1,
      message: 'Dashboard updated successfully',
    });
  } catch (error) {
    return createApiResponse(
      { error: 'Invalid request body' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Delete dashboard by UID
 */
async function deleteDashboard(uid: string): Promise<NextResponse> {
  const index = mockDashboards.findIndex(d => d.uid === uid);

  if (index === -1) {
    return createApiResponse(null, 404, 'Dashboard not found');
  }

  const deleted = mockDashboards.splice(index, 1)[0];

  return createApiResponse({
    title: deleted.title,
    message: 'Dashboard deleted successfully',
  });
}

// Export handlers for dynamic routes
export { dashboardByUID as GET, dashboardByUID as PUT, dashboardByUID as DELETE };
