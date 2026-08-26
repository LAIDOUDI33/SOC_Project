/**
 * Grafana Data Sources API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Endpoints:
 * - GET /api/grafana/datasources - List datasources
 * - GET /api/grafana/datasources/[id] - Get datasource details
 * - POST /api/grafana/datasources - Test/create datasource
 * - PUT /api/grafana/datasources/[id] - Update datasource
 * - DELETE /api/grafana/datasources/[id] - Delete datasource
 * - POST /api/grafana/datasources/test - Test connection
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  DataSource,
  DataSourceTestResult,
  DataSourceHealthStatus,
  GrafanaAPIResponse,
  PrometheusDataSourceConfig,
  ElasticsearchDataSourceConfig,
  LokiDataSourceConfig,
} from '../../types/grafana.types';

// ============================================================
// Mock Data for Development
// ============================================================

/** Mock datasources for development/testing */
const mockDataSources: DataSource[] = [
  {
    id: 1,
    orgId: 1,
    uid: 'prometheus',
    name: 'Prometheus - SOC Metrics',
    type: 'prometheus',
    typeLogoUrl: 'public/app/plugins/datasource/prometheus/img/prometheus_icon.svg',
    access: 'proxy',
    url: 'http://prometheus:9090',
    user: '',
    database: '',
    basicAuth: false,
    isDefault: true,
    jsonData: {
      httpMethod: 'POST',
      queryTimeout: '30s',
      cancelOnNavigate: true,
      incrementalQuerying: false,
      cacheLevel: 'Medium',
      promType: 'Prometheus',
      manageAlerts: true,
      promqlEditor: true,
    } as PrometheusDataSourceConfig,
    secureJsonFields: { password: true },
    version: 3,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-02-14T10:00:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'Successfully connected to Prometheus',
      details: { version: '2.51.2', storage: 'tsdb' },
    },
  },
  {
    id: 2,
    orgId: 1,
    uid: 'elasticsearch',
    name: 'Elasticsearch - Security Logs',
    type: 'elasticsearch',
    typeLogoUrl: 'public/app/plugins/datasource/elasticsearch/img/elasticsearch.svg',
    access: 'proxy',
    url: 'http://elasticsearch:9200',
    user: 'grafana-reader',
    basicAuth: true,
    basicAuthUser: 'grafana-reader',
    basicAuthPassword: true,
    isDefault: false,
    jsonData: {
      index: '[wazuh-alerts-]YYYY.MM.DD',
      timeField: '@timestamp',
      esVersion: '8.12.0',
      dataFrameConfig: {
        maxConcurrentShardRequests: 5,
        sampleSize: 500,
        scrollDuration: '30s',
        treatFieldsAsNumeric: true,
        defaultBucketLimit: 200,
      },
      logMessageField: 'message.full',
      logLevelField: 'rule.level',
      maxConcurrentShardRequests: 5,
    } as ElasticsearchDataSourceConfig,
    secureJsonFields: { password: true, basicAuthPassword: true },
    version: 5,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-02-14T09:30:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'Data source connected and index pattern valid',
      details: { clusterName: 'soc-elasticsearch', nodes: 3, status: 'green' },
    },
  },
  {
    id: 3,
    orgId: 1,
    uid: 'loki',
    name: 'Loki - Log Aggregation',
    type: 'loki',
    typeLogoUrl: 'public/app/plugins/datasource/loki/img/loki_icon.svg',
    access: 'proxy',
    url: 'http://loki:3100',
    user: '',
    database: '',
    basicAuth: false,
    isDefault: false,
    jsonData: {
      maxLines: 1000,
      deriveFieldNames: true,
      queryTimeout: '60s',
      stepMode: 'min',
      step: 300,
    } as LokiDataSourceConfig,
    secureJsonFields: {},
    version: 2,
    created: '2026-01-05T08:00:00Z',
    updated: '2026-02-13T15:00:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'Loki data source working',
      details: { version: '3.1.1', totalStreams: 1247 },
    },
  },
  {
    id: 4,
    orgId: 1,
    uid: 'misp-api',
    name: 'MISP Threat Intelligence API',
    type: 'testdata',
    typeLogoUrl: 'public/app/plugins/datasource/testdata/img/logo.svg',
    access: 'proxy',
    url: 'https://misp.algeria-soc.dz',
    user: 'soc-analyst',
    basicAuth: false,
    isDefault: false,
    jsonData: {},
    secureJsonFields: { password: true },
    version: 1,
    created: '2026-01-10T10:00:00Z',
    updated: '2026-02-12T11:00:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'MISP API connection successful',
      details: { version: '2.4.180', lastSync: '2026-02-14T12:00:00Z' },
    },
  },
  {
    id: 5,
    orgId: 1,
    uid: 'thehive-api',
    name: 'TheHive SOAR API',
    type: 'testdata',
    typeLogoUrl: 'public/app/plugins/datasource/testdata/img/logo.svg',
    access: 'proxy',
    url: 'https://thehive.algeria-soc.dz',
    user: 'soc-responder',
    basicAuth: false,
    isDefault: false,
    jsonData: {},
    secureJsonFields: { password: true, apiKey: true },
    version: 1,
    created: '2026-01-10T10:30:00Z',
    updated: '2026-02-12T11:30:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'TheHive API connection successful',
      details: { version: '5.3.3', activeCases: 23 },
    },
  },
  {
    id: 6,
    orgId: 1,
    uid: 'suricata-evt',
    name: 'Suricata EVE JSON (File)',
    type: 'testdata',
    typeLogoUrl: 'public/app/plugins/datasource/testdata/img/logo.svg',
    access: 'server',
    url: '/var/log/suricata/eve.json',
    user: '',
    database: '',
    basicAuth: false,
    isDefault: false,
    jsonData: {},
    secureJsonFields: {},
    version: 2,
    created: '2026-01-05T12:00:00Z',
    updated: '2026-02-14T06:00:00Z',
    apiHealthStatus: 'OK' as DataSourceHealthStatus,
    lastTestResult: {
      success: true,
      message: 'Suricata EVE file accessible',
      details: { fileSize: '2.4GB', lastModified: '2026-02-14T12:34:56Z' },
    },
  },
  {
    id: 7,
    orgId: 1,
    uid: 'mysql-audit',
    name: 'MySQL - Audit Logs',
    type: 'mysql',
    typeLogoUrl: 'public/app/plugins/datasource/mysql/img/mysql_logo.svg',
    access: 'proxy',
    url: 'mysql-audit:3306',
    user: 'grafana-ro',
    database: 'audit_logs',
    basicAuth: false,
    isDefault: false,
    jsonData: {
      database: 'audit_logs',
      maxOpenConns: 10,
      maxIdleConns: 5,
      connMaxLifetime: 14400,
    },
    secureJsonFields: { password: true },
    version: 2,
    created: '2026-01-20T14:00:00Z',
    updated: '2026-02-10T16:00:00Z',
    apiHealthStatus: 'ERROR' as DataSourceHealthStatus,
    lastTestError: 'Connection refused. MySQL audit server may be down.',
    lastTestResult: {
      success: false,
      message: 'Failed to connect to MySQL server',
    },
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
  type?: string;
  name?: string;
  access?: string;
  limit?: number;
  page?: number;
} {
  const { searchParams } = new URL(request.url);
  
  return {
    type: searchParams.get('type') || undefined,
    name: searchParams.get('name') || undefined,
    access: searchParams.get('access') as DataSource['access'] | undefined,
    limit: parseInt(searchParams.get('limit') || '50', 10),
    page: parseInt(searchParams.get('page') || '1', 10),
  };
}

/** Filter datasources based on parameters */
function filterDatasources(params: ReturnType<typeof parseSearchParams>): {
  datasources: DataSource[];
  total: number;
} {
  let filtered = [...mockDataSources];
  
  if (params.type) {
    filtered = filtered.filter(ds => ds.type === params.type);
  }
  
  if (params.name) {
    const query = params.name.toLowerCase();
    filtered = filtered.filter(ds => ds.name.toLowerCase().includes(query));
  }
  
  if (params.access) {
    filtered = filtered.filter(ds => ds.access === params.access);
  }

  const total = filtered.length;
  const limit = params.limit || 50;
  const page = params.page || 1;
  const start = (page - 1) * limit;
  
  return {
    datasources: filtered.slice(start, start + limit),
    total,
  };
}

/** Simulate connection test based on datasource config */
function simulateConnectionTest(datasource: Partial<DataSource>): DataSourceTestResult {
  // Simulate different scenarios for testing
  const testScenarios: Record<string, () => DataSourceTestResult> = {
    // Known failing datasource
    'mysql-audit': () => ({
      success: false,
      message: 'Connection refused. Database server may be unavailable.',
      details: { error: 'ECONNREFUSED', host: 'mysql-audit:3306' },
    }),
    // Default success scenario
    default: () => ({
      success: true,
      message: `Successfully connected to ${datasource.name || 'data source'}`,
      details: {
        type: datasource.type,
        url: datasource.url,
        testedAt: new Date().toISOString(),
      },
    }),
  };

  const tester = testScenarios[datasource.uid as string] || testScenarios.default;
  return tester();
}

// ============================================================
// API Handlers
// ============================================================

/**
 * GET /api/grafana/datasources
 * List all datasources with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle special actions
    if (action === 'types') {
      return getDatasourceTypes();
    }

    if (action === 'summary') {
      return getDatasourceSummary();
    }

    // Default: list datasources
    const params = parseSearchParams(request);
    const { datasources, total } = filterDatasources(params);

    // Calculate summary stats
    const summary = {
      total: mockDataSources.length,
      healthy: mockDataSources.filter(ds => ds.apiHealthStatus === 'OK').length,
      unhealthy: mockDataSources.filter(ds => ds.apiHealthStatus !== 'OK').length,
      byType: mockDataSources.reduce((acc, ds) => {
        acc[ds.type] = (acc[ds.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byAccess: mockDataSources.reduce((acc, ds) => {
        acc[ds.access] = (acc[ds.access] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return createApiResponse({
      items: datasources,
      total,
      page: params.page || 1,
      pageSize: params.limit || 50,
      totalPages: Math.ceil(total / (params.limit || 50)),
      summary,
    });
  } catch (error) {
    console.error('Error fetching datasources:', error);
    return createApiResponse(
      { error: 'Failed to fetch datasources' } as unknown as never,
      500,
      'Internal server error'
    );
  }
}

/**
 * POST /api/grafana/datasources
 * Create or test a datasource
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ...datasourceData } = body;

    if (action === 'test') {
      return handleTestConnection(datasourceData);
    }

    // Create new datasource
    const newDatasource: DataSource = {
      id: mockDataSources.length + 1,
      orgId: 1,
      uid: datasourceData.uid || `ds-${Date.now()}`,
      name: datasourceData.name || 'New Datasource',
      type: datasourceData.type || 'testdata',
      typeLogoUrl: getDatasourceLogoUrl(datasourceData.type || 'testdata'),
      access: datasourceData.access || 'proxy',
      url: datasourceData.url || '',
      user: datasourceData.user || '',
      database: datasourceData.database || '',
      basicAuth: datasourceData.basicAuth || false,
      basicAuthUser: datasourceData.basicAuthUser || '',
      basicAuthPassword: !!datasourceData.password,
      isDefault: datasourceData.isDefault || false,
      jsonData: datasourceData.jsonData || {},
      secureJsonFields: {
        password: !!datasourceData.password,
        ...(datasourceData.basicAuth && { basicAuthPassword: true }),
      },
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      apiHealthStatus: 'UNKNOWN' as DataSourceHealthStatus,
    };

    // Run initial test
    newDatasource.lastTestResult = simulateConnectionTest(newDatasource);

    mockDataSources.push(newDatasource);

    return createApiResponse(newDatasource, 201, 'Datasource created successfully');
  } catch (error) {
    console.error('Error creating datasource:', error);
    return createApiResponse(
      { error: 'Failed to create datasource' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Get available datasource types
 */
function getDatasourceTypes(): NextResponse {
  const types = [
    { id: 'prometheus', name: 'Prometheus', logo: '/plugins/datasource/prometheus/img/prometheus_icon.svg', description: 'Open-source monitoring system with dimensional data model' },
    { id: 'elasticsearch', name: 'Elasticsearch', logo: '/plugins/datasource/elasticsearch/img/elasticsearch.svg', description: 'Distributed search and analytics engine' },
    { id: 'loki', name: 'Loki', logo: '/plugins/datasource/loki/img/loki_icon.svg', description: 'Log aggregation system inspired by Prometheus' },
    { id: 'influxdb', name: 'InfluxDB', logo: '/plugins/datasource/influxdb/img/influxdb.png', description: 'Time series database built for IoT' },
    { id: 'graphite', name: 'Graphite', logo: '/plugins/datasource/graphite/img/graphite_logo.png', description: 'Enterprise-ready monitoring tool' },
    { id: 'mysql', name: 'MySQL', logo: '/plugins/datasource/mysql/img/mysql_logo.svg', description: 'World\'s most popular open source database' },
    { id: 'postgres', name: 'PostgreSQL', logo: '/plugins/datasource/postgres/img/postgresql_logo.svg', description: 'Advanced open source relational database' },
    { id: 'mssql', name: 'SQL Server', logo: '/plugins/datasource/mssql/img/mssql.svg', description: 'Microsoft SQL Server database' },
    { id: 'cloudwatch', name: 'CloudWatch', logo: '/plugins/datasource/cloudwatch/img/aws_cloudwatch_logo.svg', description: 'AWS monitoring service' },
    { id: 'datadog', name: 'Datadog', logo: '/plugins/datasource/datadog/img/datadog_logo.svg', description: 'Cloud monitoring and security platform' },
    { id: 'testdata', name: 'Test Data', logo: '/plugins/datasource/testdata/img/logo.svg', description: 'Built-in test data source for demos' },
  ];

  return createApiResponse(types);
}

/**
 * Get datasource summary statistics
 */
function getDatasourceSummary(): NextResponse {
  const now = new Date();

  return createApiResponse({
    total: mockDataSources.length,
    healthy: mockDataSources.filter(ds => ds.apiHealthStatus === 'OK').length,
    unhealthy: mockDataSources.filter(ds => ds.apiHealthStatus === 'ERROR').length,
    unknown: mockDataSources.filter(ds => ds.apiHealthStatus === 'UNKNOWN').length,
    default: mockDataSources.find(ds => ds.isDefault)?.name || null,
    distribution: {
      prometheus: mockDataSources.filter(ds => ds.type === 'prometheus').length,
      elasticsearch: mockDataSources.filter(ds => ds.type === 'elasticsearch').length,
      loki: mockDataSources.filter(ds => ds.type === 'loki').length,
      sql: mockDataSources.filter(ds => ['mysql', 'postgres', 'mssql'].includes(ds.type)).length,
      other: mockDataSources.filter(ds => !['prometheus', 'elasticsearch', 'loki', 'mysql', 'postgres', 'mssql'].includes(ds.type)).length,
    },
    lastTested: mockDataSources.reduce(
      (latest, ds) => {
        const dsUpdated = new Date(ds.updated);
        return dsUpdated > latest ? dsUpdated : latest;
      },
      new Date(0)
    ).toISOString(),
  });
}

/**
 * Handle connection testing
 */
function handleTestConnection(data: Record<string, unknown>): NextResponse {
  if (!data.type && !data.uid && !data.url) {
    return createApiResponse(null, 400, 'At least one of type, uid, or url must be provided');
  }

  // If testing existing datasource
  if (data.uid) {
    const existing = mockDataSources.find(ds => ds.uid === data.uid);
    
    if (!existing) {
      return createApiResponse(null, 404, 'Datasource not found');
    }

    const result = simulateConnectionTest(existing);
    
    // Update datasource with test result
    existing.lastTestResult = result;
    existing.apiHealthStatus = result.success ? 'OK' : 'ERROR';
    existing.updated = new Date().toISOString();
    if (!result.success) {
      existing.lastTestError = result.message;
    }

    return createApiResponse({
      ...result,
      datasourceUid: existing.uid,
      datasourceName: existing.name,
    });
  }

  // Test new/unconfigured datasource
  const result = simulateConnectionTest(data);

  return createApiResponse(result);
}

/**
 * Get datasource logo URL by type
 */
function getDatasourceLogoUrl(type: string): string {
  const logos: Record<string, string> = {
    prometheus: 'public/app/plugins/datasource/prometheus/img/prometheus_icon.svg',
    elasticsearch: 'public/app/plugins/datasource/elasticsearch/img/elasticsearch.svg',
    loki: 'public/app/plugins/datasource/loki/img/loki_icon.svg',
    influxdb: 'public/app/plugins/datasource/influxdb/img/influxdb.png',
    graphite: 'public/app/plugins/datasource/graphite/img/graphite_logo.png',
    mysql: 'public/app/plugins/datasource/mysql/img/mysql_logo.svg',
    postgres: 'public/app/plugins/datasource/postgres/img/postgresql_logo.svg',
    mssql: 'public/app/plugins/datasource/mssql/img/mssql.svg',
    cloudwatch: 'public/app/plugins/datasource/cloudwatch/img/aws_cloudwatch_logo.svg',
    datadog: 'public/app/plugins/datasource/datadog/img/datadog_logo.svg',
    testdata: 'public/app/plugins/datasource/testdata/img/logo.svg',
  };

  return logos[type] || 'public/build/img/default_datasource_logo.svg';
}

/**
 * Handle individual datasource operations by ID
 */
export async function datasourceByID(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const id = params.id;

  switch (request.method) {
    case 'GET':
      return getDatasourceByID(id);
    case 'PUT':
      return updateDatasource(id, request);
    case 'DELETE':
      return deleteDatasource(id);
    default:
      return createApiResponse(null, 405, 'Method not allowed');
  }
}

/**
 * Get single datasource by ID
 */
async function getDatasourceByID(id: string): Promise<NextResponse> {
  const datasource = mockDataSources.find(ds => ds.id === parseInt(id, 10));

  if (!datasource) {
    return createApiResponse(null, 404, 'Datasource not found');
  }

  return createApiResponse(datasource);
}

/**
 * Update datasource by ID
 */
async function updateDatasource(id: string, request: NextRequest): Promise<NextResponse> {
  const dsIndex = mockDataSources.findIndex(ds => ds.id === parseInt(id, 10));

  if (dsIndex === -1) {
    return createApiResponse(null, 404, 'Datasource not found');
  }

  try {
    const updates = await request.json();

    mockDataSources[dsIndex] = {
      ...mockDataSources[dsIndex],
      ...(updates.name && { name: updates.name }),
      ...(updates.url && { url: updates.url }),
      ...(updates.user !== undefined && { user: updates.user }),
      ...(updates.database !== undefined && { database: updates.database }),
      ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
      ...(updates.jsonData && { jsonData: { ...mockDataSources[dsIndex].jsonData, ...updates.jsonData } }),
      ...(updates.basicAuth !== undefined && { basicAuth: updates.basicAuth }),
      updated: new Date().toISOString(),
      version: mockDataSources[dsIndex].version + 1,
    };

    return createApiResponse(mockDataSources[dsIndex]);
  } catch (error) {
    return createApiResponse(
      { error: 'Invalid request body' } as unknown as never,
      400,
      'Invalid request body'
    );
  }
}

/**
 * Delete datasource by ID
 */
async function deleteDatasource(id: string): Promise<NextResponse> {
  const dsIndex = mockDataSources.findIndex(ds => ds.id === parseInt(id, 10));

  if (dsIndex === -1) {
    return createApiResponse(null, 404, 'Datasource not found');
  }

  const deleted = mockDataSources.splice(dsIndex, 1)[0];

  return createApiResponse({
    message: 'Datasource deleted successfully',
    deleted: deleted,
  });
}

// Export handlers for dynamic routes
export { datasourceByID as GET, datasourceByID as PUT, datasourceByID as DELETE };
