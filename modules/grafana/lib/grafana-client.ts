/**
 * Grafana Monitoring Dashboard Integration - API Client
 * Algeria National SOC Platform 2026-2030
 * 
 * Complete REST API client for Grafana integration including:
 * - HTTP client with authentication (API key, basic auth)
 * - Dashboard CRUD operations (get, create, update, delete, import)
 * - Datasource management
 * - Alert rule management
 * - Organization/user administration
 * - Folder management
 * - Search functionality
 * - Tagging system
 * - Version control for dashboards
 * - Provisioning configuration helpers
 * - Error handling with specific error classes
 */

import type {
  GrafanaDashboard,
  DashboardSearchResult,
  DashboardFolder,
  DashboardSaveResponse,
  DashboardImportResponse,
  DataSource,
  DataSourceRef,
  DataSourceTestResult,
  AlertRule,
  AlertIncident,
  AlertHistoryEntry,
  AlertState,
  ContactPoint,
  MuteTiming,
  NotificationPolicyTree,
  GrafanaUser,
  GrafanaOrganization,
  GrafanaTeam,
  TeamMember,
  GrafanaPlugin,
  SavedAnnotation,
  AnnotationDefinition,
  TemplateVariable,
  DashboardSearchParams,
  AlertSearchParams,
  DatasourceSearchParams,
  GrafanaAPIResponse,
  BulkOperationResult,
  TimeRange,
  RefreshInterval,
  PanelType,
  TargetRefID,
} from '../types/grafana.types';

// ============================================================
// Configuration & Constants
// ============================================================

/** Grafana client configuration options */
export interface GrafanaClientConfig {
  /** Grafana instance URL (e.g., https://grafana.algeria-soc.dz) */
  url: string;
  /** API key for authentication (Service Account or User token) */
  apiKey?: string;
  /** Username for basic authentication */
  username?: string;
  /** Password for basic authentication */
  password?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Default organization ID (default: 1) */
  defaultOrgId?: number;
  /** Whether to verify SSL certificates */
  verifyCertificate?: boolean;
}

/** Default configuration values */
const DEFAULT_CONFIG: Required<Omit<GrafanaClientConfig, 'username' | 'password' | 'apiKey'>> = {
  url: '',
  timeout: 30000,
  debug: false,
  defaultOrgId: 1,
  verifyCertificate: true,
};

/** Grafana API version prefix */
const API_PREFIX = '/api';

// ============================================================
// Custom Error Classes
// ============================================================

/** Base Grafana API error */
export class GrafanaError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errorCode?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'GrafanaError';
  }
}

/** Authentication error */
export class GrafanaAuthError extends GrafanaError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode, 'AUTH_ERROR');
    this.name = 'GrafanaAuthError';
  }
}

/** Not found error */
export class GrafanaNotFoundError extends GrafanaError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      404,
      'NOT_FOUND'
    );
    this.name = 'GrafanaNotFoundError';
  }
}

/** Validation error */
export class GrafanaValidationError extends GrafanaError {
  constructor(
    message: string,
    public readonly validationErrors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, 'VALIDATION_ERROR', validationErrors);
    this.name = 'GrafanaValidationError';
  }
}

/** Rate limit error */
export class GrafanaRateLimitError extends GrafanaError {
  constructor(retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterSeconds || 60} seconds.`,
      429,
      'RATE_LIMITED',
      { retryAfter: retryAfterSeconds || 60 }
    );
    this.name = 'GrafanaRateLimitError';
  }
}

/** Connection error */
export class GrafanaConnectionError extends GrafanaError {
  constructor(originalError: Error) {
    super(`Failed to connect to Grafana: ${originalError.message}`, undefined, 'CONNECTION_ERROR', originalError);
    this.name = 'GrafanaConnectionError';
  }
}

/** Dashboard version conflict error */
export class GrafanaVersionConflictError extends GrafanaError {
  constructor(currentVersion: number, expectedVersion: number) {
    super(
      `Dashboard version conflict. Current: ${currentVersion}, Expected: ${expectedVersion}`,
      409,
      'VERSION_CONFLICT',
      { currentVersion, expectedVersion }
    );
    this.name = 'GrafanaVersionConflictError';
  }
}

// ============================================================
// HTTP Client
// ============================================================

/** HTTP response wrapper */
interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/** Request options interface */
interface RequestOptions {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  expectEmpty?: boolean;
}

/**
 * Core HTTP client for Grafana API communication
 */
class GrafanaHttpClient {
  private config: Required<GrafanaClientConfig> & { username?: string; password?: string; apiKey?: string };
  
  constructor(config: GrafanaClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate required configuration
    if (!this.config.url) {
      throw new GrafanaValidationError('Grafana URL is required');
    }
    
    // Ensure URL doesn't have trailing slash
    this.config.url = this.config.url.replace(/\/+$/, '');
  }

  /**
   * Build authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      // Basic auth would be handled differently in browser environment
      // For server-side or proxy scenarios
      const credentials = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    return headers;
  }

  /**
   * Execute HTTP request
   */
  async request<T>(options: RequestOptions): Promise<HttpResponse<T>> {
    const { method, path, body, params, headers: customHeaders, expectEmpty } = options;
    
    // Build URL
    let url = `${this.config.url}${API_PREFIX}${path}`;
    
    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      url += `?${searchParams.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.getAuthHeaders(),
      ...customHeaders,
    };

    // Log request in debug mode
    if (this.config.debug) {
      console.log(`[Grafana] ${method} ${url}`, body ? JSON.stringify(body) : '');
    }

    try {
      // Build fetch options
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(this.config.timeout),
      };

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      // Handle empty responses
      if (expectEmpty || response.status === 204) {
        return { data: undefined as T, status: response.status, headers: response.headers };
      }

      // Parse response
      const data = await response.json();

      // Handle errors
      if (!response.ok) {
        return this.handleError(response, data);
      }

      return { data, status: response.status, headers: response.headers };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GrafanaError('Request timeout', undefined, 'TIMEOUT_ERROR');
      }
      
      if (error instanceof TypeError) {
        throw new GrafanaConnectionError(error);
      }
      
      throw error;
    }
  }

  /**
   * Handle API error responses
   */
  private handleError<T>(response: Response, data: unknown): never {
    switch (response.status) {
      case 401:
      case 403:
        throw new GrafanaAuthError(
          (data as { message?: string })?.message || 'Authentication failed',
          response.status
        );
        
      case 404:
        throw new GrafanaNotFoundError('Resource');
        
      case 409:
        throw new GrafanaVersionConflictError(
          (data as { version?: number })?.version || 0,
          0
        );
        
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new GrafanaRateLimitError(retryAfter);
        
      case 400:
        throw new GrafanaValidationError(
          (data as { message?: string })?.message || 'Validation failed',
          (data as { errors?: Array<{ field: string; message: string }> })?.errors
        );
        
      default:
        throw new GrafanaError(
          (data as { message?: string })?.message || `Request failed with status ${response.status}`,
          response.status,
          undefined,
          data
        );
    }
  }

  /**
   * GET request helper
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', path, params });
  }

  /**
   * POST request helper
   */
  async post<T>(path: string, body?: Record<string, unknown>, expectEmpty?: boolean): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, expectEmpty });
  }

  /**
   * PUT request helper
   */
  async put<T>(path: string, body?: Record<string, unknown>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body });
  }

  /**
   * PATCH request helper
   */
  async patch<T>(path: string, body?: Record<string, unknown>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PATCH', path, body });
  }

  /**
   * DELETE request helper
   */
  async delete<T>(path: string): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, expectEmpty: true });
  }

  /**
   * Get base URL for iframe embedding
   */
  getBaseUrl(): string {
    return this.config.url;
  }

  /**
   * Get configured organization ID
   */
  getDefaultOrgId(): number {
    return this.config.defaultOrgId;
  }
}

// ============================================================
// Main Grafana Client Class
// ============================================================

/**
 * Complete Grafana API client for dashboard management and monitoring
 * 
 * @example
 * ```typescript
 * const client = await initializeGrafanaClient({
 *   url: 'https://grafana.algeria-soc.dz',
 *   apiKey: 'your-api-key',
 * });
 * 
 * const dashboards = await client.searchDashboards({ query: 'SOC' });
 * ```
 */
export class GrafanaClient {
  private http: GrafanaHttpClient;

  constructor(httpClient: GrafanaHttpClient) {
    this.http = httpClient;
  }

  // ============================================================
  // Health Check
  // ============================================================

  /**
   * Check Grafana server health
   * @returns Health check result
   */
  async healthCheck(): Promise<{
    commit: string;
    database: string;
    version: string;
  }> {
    const response = await this.http.get<{ commit: string; database: string; version: string }>('/health');
    return response.data;
  }

  /**
   * Get basic frontend settings (for connectivity test)
   */
  async getFrontendSettings(): Promise<{ allowedDomains: string[] }> {
    const response = await this.http.get<{ allowedDomains: string[] }>('/frontend/settings');
    return response.data;
  }

  // ============================================================
  // Dashboard Operations
  // ============================================================

  /**
   * Search for dashboards
   * @param params Search parameters
   * @returns Array of matching dashboards
   */
  async searchDashboards(params?: DashboardSearchParams): Promise<DashboardSearchResult[]> {
    const searchParams: Record<string, string> = {};

    if (params?.query) searchParams.query = params.query;
    if (params?.tag) searchParams.tag = params.tag.join(',');
    if (params?.type) searchParams.type = params.type;
    if (params?.folderIds) searchParams.folderIds = params.folderIds.join(',');
    if (params?.limit) searchParams.limit = params.limit.toString();
    if (params?.page) searchParams.page = params.page.toString();
    if (params?.sort) searchParams.sort = params.sort;
    if (params?.starred) searchParams.starred = 'true';

    const response = await this.http.get<DashboardSearchResult[]>('/search', searchParams);
    return response.data;
  }

  /**
   * Get dashboard by UID
   * @param uid Dashboard unique identifier
   * @returns Full dashboard object
   */
  async getDashboard(uid: string): Promise<GrafanaDashboard> {
    const response = await this.http.get<{ dashboard: GrafanaDashboard; meta: GrafanaDashboard['meta'] }>(
      `/dashboards/uid/${uid}`
    );
    return {
      ...response.data.dashboard,
      meta: response.data.meta,
    };
  }

  /**
   * Get dashboard by slug (legacy)
   * @param slug Dashboard slug
   * @returns Full dashboard object
   */
  async getDashboardBySlug(slug: string): Promise<GrafanaDashboard> {
    const response = await this.http.get<{ dashboard: GrafanaDashboard; meta: GrafanaDashboard['meta'] }>(
      `/dashboards/db/${slug}`
    );
    return {
      ...response.data.dashboard,
      meta: response.data.meta,
    };
  }

  /**
   * Create a new dashboard
   * @param dashboard Dashboard object to create
   * @param folderUid Optional folder UID to place dashboard in
   * @param overwrite Overwrite existing dashboard with same title
   * @returns Save response with ID and slug
   */
  async createDashboard(
    dashboard: Omit<GrafanaDashboard, 'uid' | 'id'>,
    options?: {
      folderUid?: string;
      overwrite?: boolean;
      message?: string;
    }
  ): Promise<DashboardSaveResponse> {
    const payload = {
      dashboard: {
        ...dashboard,
        id: null,
        uid: undefined,
      },
      folderUid: options?.folderUid,
      overwrite: options?.overwrite ?? false,
      message: options?.message,
    };

    const response = await this.http.post<DashboardSaveResponse>('/dashboards/db', payload);
    return response.data;
  }

  /**
   * Update an existing dashboard
   * @param uid Dashboard UID
   * @param dashboard Updated dashboard object
   * @param options Update options
   * @returns Save response
   */
  async updateDashboard(
    uid: string,
    dashboard: Partial<GrafanaDashboard>,
    options?: {
      folderUid?: string;
      message?: string;
      overwrite?: boolean;
    }
  ): Promise<DashboardSaveResponse> {
    const existing = await this.getDashboard(uid);
    
    const payload = {
      dashboard: {
        ...existing,
        ...dashboard,
        id: existing.id || null,
        uid,
        version: existing.version,
      },
      folderUid: options?.folderUid,
      overwrite: options?.overwrite ?? true,
      message: options?.message || 'Updated via API',
    };

    const response = await this.http.post<DashboardSaveResponse>('/dashboards/db', payload);
    return response.data;
  }

  /**
   * Delete a dashboard by UID
   * @param uid Dashboard UID
   * @returns Success confirmation
   */
  async deleteDashboard(uid: string): Promise<{ title: string; message: string }> {
    const response = await this.http.delete<{ title: string; message: string }>(`/dashboards/uid/${uid}`);
    return response.data;
  }

  /**
   * Import a dashboard from JSON
   * @param dashboardJson Dashboard JSON content
   * @param options Import options
   * @returns Import result
   */
  async importDashboard(
    dashboardJson: Record<string, unknown>,
    options?: {
      folderUid?: string;
      overwrite?: boolean;
      inputs?: Array<{ name: string; type: string; pluginId: string; value: string }>;
      dashboardUid?: string;
      dashboardTitle?: string;
    }
  ): Promise<DashboardImportResponse> {
    const payload = {
      dashboard: dashboardJson,
      folderUid: options?.folderUid,
      overwrite: options?.overwrite ?? false,
      inputs: options?.inputs || [],
      options: {
        uid: options?.dashboardUid,
        title: options?.dashboardTitle,
      },
    };

    const response = await this.http.post<DashboardImportResponse>('/dashboards/import', payload);
    return response.data;
  }

  /**
   * Get dashboard tags
   * @returns Array of all tags used across dashboards
   */
  async getTags(): Promise<Array<{ term: string; count: number }>> {
    const response = await this.http.get<Array<{ term: string; count: number }>>('/tags');
    return response.data;
  }

  /**
   * Star/unstar a dashboard
   * @param uid Dashboard UID
   * @param starred Star state
   */
  async setStarred(uid: string, starred: boolean): Promise<void> {
    if (starred) {
      await this.http.post(`/user/stars/dashboard/${uid}`, {}, true);
    } else {
      await this.http.delete(`/user/stars/dashboard/${uid}`);
    }
  }

  // ============================================================
  // Folder Operations
  // ============================================================

  /**
   * Get all folders
   * @returns Array of folders
   */
  async getFolders(): Promise<DashboardFolder[]> {
    const response = await this.http.get<DashboardFolder[]>('/folders');
    return response.data;
  }

  /**
   * Get a specific folder by UID
   * @param uid Folder UID
   * @returns Folder details
   */
  async getFolder(uid: string): Promise<DashboardFolder> {
    const response = await this.http.get<DashboardFolder>(`/folders/${uid}`);
    return response.data;
  }

  /**
   * Create a new folder
   * @param title Folder title
   * @param parentUid Optional parent folder UID
   * @returns Created folder
   */
  async createFolder(title: string, parentUid?: string): Promise<DashboardFolder> {
    const response = await this.http.post<DashboardFolder>('/folders', {
      title,
      parentUid,
    });
    return response.data;
  }

  /**
   * Update a folder
   * @param uid Folder UID
   * @param title New title
   * @param version Expected version for optimistic locking
   * @returns Updated folder
   */
  async updateFolder(uid: string, title: string, version?: number): Promise<DashboardFolder> {
    const response = await this.http.put<DashboardFolder>(`/folders/${uid}`, {
      title,
      version,
      override: !version,
    });
    return response.data;
  }

  /**
   * Delete a folder
   * @param uid Folder UID
   * @returns Success message
   */
  async deleteFolder(uid: string): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/folders/${uid}`);
    return response.data;
  }

  /**
   * Get dashboards in a folder
   * @param folderUid Folder UID
   * @returns Array of dashboards in the folder
   */
  async getFolderDashboards(folderUid: string): Promise<DashboardSearchResult[]> {
    const response = await this.http.get<DashboardSearchResult[]>('/search', {
      folderIds: folderUid,
    });
    return response.data;
  }

  // ============================================================
  // Data Source Operations
  // ============================================================

  /**
   * Get all datasources
   * @returns Array of datasources
   */
  async getDataSources(params?: DatasourceSearchParams): Promise<DataSource[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.type) queryParams.type = params.type;
    if (params?.name) queryParams.name = params.name;

    const response = await this.http.get<DataSource[]>('/datasources', queryParams);
    
    if (params?.access) {
      return response.data.filter(ds => ds.access === params.access);
    }
    
    return response.data;
  }

  /**
   * Get a datasource by ID
   * @param id Datasource ID
   * @returns Datasource details
   */
  async getDataSourceById(id: number): Promise<DataSource> {
    const response = await this.http.get<DataSource>(`/datasources/${id}`);
    return response.data;
  }

  /**
   * Get a datasource by UID
   * @param uid Datasource UID
   * @returns Datasource details
   */
  async getDataSourceByUid(uid: string): Promise<DataSource> {
    const response = await this.http.get<DataSource>(`/datasources/uid/${uid}`);
    return response.data;
  }

  /**
   * Get a datasource by name
   * @param name Datasource name
   * @returns Datasource details
   */
  async getDataSourceByName(name: string): Promise<DataSource> {
    const response = await this.http.get<DataSource>(`/datasources/name/${encodeURIComponent(name)}`);
    return response.data;
  }

  /**
   * Create a new datasource
   * @param datasource Datasource configuration
   * @returns Created datasource
   */
  async createDataSource(datasource: Omit<DataSource, 'id' | 'created' | 'updated' | 'version' | 'apiHealthStatus' | 'lastTestError' | 'lastTestResult'>): Promise<DataSource> {
    const response = await this.http.post<DataSource>('/datasources', datasource);
    return response.data;
  }

  /**
   * Update a datasource
   * @param id Datasource ID
   * @param datasource Updated configuration
   * @returns Updated datasource
   */
  async updateDataSource(id: number, datasource: Partial<DataSource>): Promise<DataSource> {
    const response = await this.http.put<DataSource>(`/datasources/${id}`, datasource);
    return response.data;
  }

  /**
   * Delete a datasource
   * @param id Datasource ID
   * @returns Success message
   */
  async deleteDataSource(id: number): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/datasources/${id}`);
    return response.data;
  }

  /**
   * Test a datasource connection
   * @param id Datasource ID
   * @returns Test result
   */
  async testDataSourceById(id: number): Promise<DataSourceTestResult> {
    const response = await this.http.post<DataSourceTestResult>(`/datasources/${id}/health`);
    return response.data;
  }

  /**
   * Test datasource connection without saving
   * @param datasource Datasource configuration to test
   * @returns Test result
   */
  async testDataSource(datasource: Partial<DataSource>): Promise<DataSourceTestResult> {
    const response = await this.http.post<DataSourceTestResult>('/datasources/test', datasource);
    return response.data;
  }

  /**
   * Get datasource proxy URL for direct queries
   * @param uid Datasource UID
   * @returns Proxy URL template
   */
  getDatasourceProxyUrl(uid: string): string {
    return `${this.http.getBaseUrl()}${API_PREFIX}/datasources/proxy/${uid}`;
  }

  // ============================================================
  // Alert Rule Operations
  // ============================================================

  /**
   * Get alert rules
   * @param params Search parameters
   * @returns Array of alert rules
   */
  async getAlertRules(params?: AlertSearchParams): Promise<AlertRule[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.dashboardUID) queryParams.dashboardUID = params.dashboardUID;
    if (params?.panelId) queryParams.panelId = params.panelId.toString();
    if (params?.folderId) queryParams.folderId = params.folderId.toString();
    if (params?.query) queryParams.query = params.query;
    if (params?.state) queryParams.state = params.state;
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.page) queryParams.page = params.page.toString();

    const response = await this.http.get<AlertRule[]>('/alertrules', queryParams);
    return response.data;
  }

  /**
   * Get a single alert rule
   * @param uid Alert rule UID
   * @returns Alert rule details
   */
  async getAlertRule(uid: string): Promise<AlertRule> {
    const response = await this.http.get<AlertRule>(`/alertrules/${uid}`);
    return response.data;
  }

  /**
   * Create a new alert rule
   * @param rule Alert rule definition
   * @returns Created alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'uid' | 'created' | 'updated' | 'version' | 'currentState' | 'stateSince' | 'stateChangesCount' | 'health'>): Promise<AlertRule> {
    const response = await this.http.post<AlertRule>('/alertrules', rule);
    return response.data;
  }

  /**
   * Update an alert rule
   * @param uid Alert rule UID
   * @param rule Updated rule definition
   * @returns Updated alert rule
   */
  async updateAlertRule(uid: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    const response = await this.http.put<AlertRule>(`/alertrules/${uid}`, rule);
    return response.data;
  }

  /**
   * Delete an alert rule
   * @param uid Alert rule UID
   * @returns Success message
   */
  async deleteAlertRule(uid: string): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/alertrules/${uid}`);
    return response.data;
  }

  /**
   * Pause/resume an alert rule
   * @param uid Alert rule UID
   * @param paused Pause state
   * @returns Updated alert rule
   */
  async setAlertRulePaused(uid: string, paused: boolean): Promise<AlertRule> {
    const response = await this.http.patch<AlertRule>(`/alertrules/${uid}/pause`, {
      paused,
    });
    return response.data;
  }

  /**
   * Batch pause/resume alert rules
   * @param ruleUids Array of rule UIDs
   * @param paused Pause state
   * @returns Operation result
   */
  async batchSetAlertRulesPaused(ruleUids: string[], paused: boolean): Promise<BulkOperationResult> {
    const results: BulkOperationResult = {
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const uid of ruleUids) {
      try {
        await this.setAlertRulePaused(uid, paused);
        results.successCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          item: uid,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Get alert incidents
   * @param params Filter parameters
   * @returns Array of incidents
   */
  async getAlertIncidents(params?: {
    alertRuleUID?: string;
    state?: AlertState;
    limit?: number;
    page?: number;
  }): Promise<AlertIncident[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.alertRuleUID) queryParams.alertRuleUID = params.alertRuleUID;
    if (params?.state) queryParams.state = params.state;
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.page) queryParams.page = params.page.toString();

    const response = await this.http.get<AlertIncident[]>('/incidents', queryParams);
    return response.data;
  }

  /**
   * Get alert history
   * @param params Filter parameters
   * @returns History entries
   */
  async getAlertHistory(params?: {
    dashboardUID?: string;
    panelId?: number;
    userId?: number;
    states?: AlertState[];
    limit?: number;
    page?: number;
    from?: string;
    to?: string;
  }): Promise<AlertHistoryEntry[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.dashboardUID) queryParams.dashboardUID = params.dashboardUID;
    if (params?.panelId) queryParams.panelId = params.panelId.toString();
    if (params?.userId) queryParams.userId = params.userId.toString();
    if (params?.states) queryParams.states = params.states.join(',');
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    const response = await this.http.get<AlertHistoryEntry[]>('/annotations/graphite', queryParams);
    return response.data;
  }

  // ============================================================
  // Notification Channel Operations
  // ============================================================

  /**
   * Get contact points (notification channels)
   * @returns Array of contact points
   */
  async getContactPoints(): Promise<ContactPoint[]> {
    const response = await this.http.get<ContactPoint[]>('/contact-points');
    return response.data;
  }

  /**
   * Create a contact point
   * @param contactPoint Contact point configuration
   * @returns Created contact point
   */
  async createContactPoint(contactPoint: Omit<ContactPoint, 'id' | 'uid' | 'created' | 'updated'>): Promise<ContactPoint> {
    const response = await this.http.post<ContactPoint>('/contact-points', contactPoint);
    return response.data;
  }

  /**
   * Update a contact point
   * @param uid Contact point UID
   * @param contactPoint Updated configuration
   * @returns Updated contact point
   */
  async updateContactPoint(uid: string, contactPoint: Partial<ContactPoint>): Promise<ContactPoint> {
    const response = await this.http.put<ContactPoint>(`/contact-points/${uid}`, contactPoint);
    return response.data;
  }

  /**
   * Delete a contact point
   * @param uid Contact point UID
   * @returns Success message
   */
  async deleteContactPoint(uid: string): Promise<void> {
    await this.http.delete(`/contact-points/${uid}`);
  }

  /**
   * Test a notification channel
   * @param uid Contact point UID
   * @param options Test options
   * @returns Test result
   */
  async testContactPoint(uid: string, options?: {
    alertRuleUID?: string;
    alertRuleTitle?: string;
    state?: AlertState;
    labels?: Record<string, string>;
  }): Promise<{ success: boolean; message: string }> {
    const response = await this.http.post<{ success: boolean; message: string }>(
      `/contact-points/${uid}/test`,
      options as Record<string, unknown>
    );
    return response.data;
  }

  // ============================================================
  // Mute Timing Operations
  // ============================================================

  /**
   * Get mute timings
   * @returns Array of mute timings
   */
  async getMuteTimings(): Promise<MuteTiming[]> {
    const response = await this.http.get<MuteTiming[]>('/mute-timings');
    return response.data;
  }

  /**
   * Create a mute timing
   * @param muteTiming Mute timing configuration
   * @returns Created mute timing
   */
  async createMuteTiming(muteTiming: Omit<MuteTiming, 'id' | 'uid' | 'created' | 'updated'>): Promise<MuteTiming> {
    const response = await this.http.post<MuteTiming>('/mute-timings', muteTiming);
    return response.data;
  }

  /**
   * Update a mute timing
   * @param uid Mute timing UID
   * @param muteTiming Updated configuration
   * @returns Updated mute timing
   */
  async updateMuteTiming(uid: string, muteTiming: Partial<MuteTiming>): Promise<MuteTiming> {
    const response = await this.http.put<MuteTiming>(`/mute-timings/${uid}`, muteTiming);
    return response.data;
  }

  /**
   * Delete a mute timing
   * @param uid Mute timing UID
   * @returns Success message
   */
  async deleteMuteTiming(uid: string): Promise<void> {
    await this.http.delete(`/mute-timings/${uid}`);
  }

  // ============================================================
  // Notification Policy Operations
  // ============================================================

  /**
   * Get notification policy tree
   * @returns Policy tree
   */
  async getNotificationPolicyTree(): Promise<NotificationPolicyTree> {
    const response = await this.http.get<NotificationPolicyTreeTree>('/routetree');
    return response.data;
  }

  /** Type alias for policy tree response */
  interface NotificationPolicyTreeTree extends NotificationPolicyTree {}

  /**
   * Update notification policy tree
   * @param tree New policy tree
   * @returns Updated policy tree
   */
  async updateNotificationPolicyTree(tree: NotificationPolicyTree): Promise<NotificationPolicyTree> {
    const response = await this.http.put<NotificationPolicyTree>('/routetree', tree);
    return response.data;
  }

  // ============================================================
  // Organization Operations
  // ============================================================

  /**
   * Get current user's organizations
   * @returns Array of organizations
   */
  async getOrganizations(): Promise<GrafanaOrganization[]> {
    const response = await this.http.get<GrafanaOrganization[]>('/user/orgs');
    return response.data;
  }

  /**
   * Switch to another organization
   * @param orgId Organization ID
   * @returns Success message
   */
  async switchOrganization(orgId: number): Promise<{ message: string }> {
    const response = await this.http.post<{ message: string }>(`/user/orgs/${orgId}`, {}, true);
    return response.data;
  }

  /**
   * Get organization users (admin only)
   * @param orgId Organization ID
   * @param page Page number
   * @param perPage Items per page
   * @returns Users array with pagination info
   */
  async getOrgUsers(orgId: number, page: number = 1, perPage: number = 50): Promise<{
    totalCount: number;
    page: number;
    perPage: number;
    users: Array<{
      orgId: number;
      userId: number;
      email: string;
      name: string;
      login: string;
      role: string;
      avatarUrl: string;
      lastSeenAt: string;
      lastSeenAtAge: string;
    }>;
  }> {
    const response = await this.http.get<typeof this.getOrgUsers extends (...args: any[]) => infer R ? R : never>(
      `/orgs/${orgId}/users`,
      { page: page.toString(), perpage: perPage.toString() }
    );
    return response.data;
  }

  /**
   * Add user to organization
   * @param orgId Organization ID
   * @param userIdOrEmail User ID or email
   * @param role Role to assign
   * @returns Added user info
   */
  async addOrgUser(
    orgId: number,
    userIdOrEmail: number | string,
    role: 'Viewer' | 'Editor' | 'Admin'
  ): Promise<{ message: string }> {
    const body: Record<string, unknown> = { role };
    if (typeof userIdOrEmail === 'number') {
      body.userId = userIdOrEmail;
    } else {
      body.email = userIdOrEmail;
    }

    const response = await this.http.post<{ message: string }>(`/orgs/${orgId}/users`, body);
    return response.data;
  }

  /**
   * Remove user from organization
   * @param orgId Organization ID
   * @param userId User ID
   * @returns Success message
   */
  async removeOrgUser(orgId: number, userId: number): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/orgs/${orgId}/users/${userId}`);
    return response.data;
  }

  /**
   * Update user role in organization
   * @param orgId Organization ID
   * @param userId User ID
   * @param role New role
   * @returns Success message
   */
  async updateOrgUserRole(
    orgId: number,
    userId: number,
    role: 'Viewer' | 'Editor' | 'Admin'
  ): Promise<{ message: string }> {
    const response = await this.http.patch<{ message: string }>(
      `/orgs/${orgId}/users/${userId}`,
      { role }
    );
    return response.data;
  }

  // ============================================================
  // Team Operations
  // ============================================================

  /**
   * Get teams in current organization
   * @returns Array of teams
   */
  async getTeams(): Promise<GrafanaTeam[]> {
    const response = await this.http.get<GrafanaTeam[]>('/teams');
    return response.data;
  }

  /**
   * Search teams
   * @param query Search query
   * @param page Page number
   * @param perpage Items per page
   * @returns Teams with pagination
   */
  async searchTeams(query?: string, page?: number, perpage?: number): Promise<{
    totalCount: number;
    teams: GrafanaTeam[];
    page: number;
    perPage: number;
  }> {
    const params: Record<string, string> = {};
    if (query) params.query = query;
    if (page) params.page = page.toString();
    if (perpage) params.perpage = perpage.toString();

    const response = await this.http.get<typeof this.searchTeams extends (...args: any[]) => infer R ? R : never>(
      '/teams/search',
      params
    );
    return response.data;
  }

  /**
   * Get team by ID
   * @param teamId Team ID
   * @returns Team details
   */
  async getTeam(teamId: number): Promise<GrafanaTeam> {
    const response = await this.http.get<GrafanaTeam>(`/teams/${teamId}`);
    return response.data;
  }

  /**
   * Create a new team
   * @param name Team name
   * @param email Team email
   * @returns Created team
   */
  async createTeam(name: string, email?: string): Promise<GrafanaTeam> {
    const response = await this.http.post<GrafanaTeam>('/teams', { name, email });
    return response.data;
  }

  /**
   * Update a team
   * @param teamId Team ID
   * @param name New name
   * @param email New email
   * @returns Updated team
   */
  async updateTeam(teamId: number, name: string, email?: string): Promise<GrafanaTeam> {
    const response = await this.http.put<GrafanaTeam>(`/teams/${teamId}`, { name, email });
    return response.data;
  }

  /**
   * Delete a team
   * @param teamId Team ID
   * @returns Success message
   */
  async deleteTeam(teamId: number): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/teams/${teamId}`);
    return response.data;
  }

  /**
   * Get team members
   * @param teamId Team ID
   * @returns Array of team members
   */
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    const response = await this.http.get<TeamMember[]>(`/teams/${teamId}/members`);
    return response.data;
  }

  /**
   * Add member to team
   * @param teamId Team ID
   * @param userId User ID
   * @returns Success message
   */
  async addTeamMember(teamId: number, userId: number): Promise<{ message: string }> {
    const response = await this.http.post<{ message: string }>(`/teams/${teamId}/members`, { userId });
    return response.data;
  }

  /**
   * Remove member from team
   * @param teamId Team ID
   * @param userId User ID
   * @returns Success message
   */
  async removeTeamMember(teamId: number, userId: number): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/teams/${teamId}/members/${userId}`);
    return response.data;
  }

  // ============================================================
  // User Operations
  // ============================================================

  /**
   * Get current authenticated user
   * @returns User information
   */
  async getCurrentUser(): Promise<GrafanaUser> {
    const response = await this.http.get<GrafanaUser>('/user');
    return response.data;
  }

  /**
   * Look up user by login/email
   * @param query Login or email
   * @returns User information
   */
  async lookupUser(query: string): Promise<GrafanaUser> {
    const response = await this.http.get<GrafanaUser>(`/users/lookup?loginOrEmail=${encodeURIComponent(query)}`);
    return response.data;
  }

  /**
   * Get users (admin only)
   * @param page Page number
   * @param perPage Items per page
   * @returns Users with pagination
   */
  async getUsers(page: number = 1, perPage: number = 100): Promise<{
    totalCount: number;
    users: Array<{
      id: number;
      email: string;
      name: string;
      login: string;
      orgId: number;
      isAdmin: boolean;
      isDisabled: boolean;
    }>;
    page: number;
    perPage: number;
  }> {
    const response = await this.http.get<typeof this.getUsers extends (...args: any[]) => infer R ? R : never>(
      '/users',
      { page: page.toString(), perpage: perPage.toString() }
    );
    return response.data;
  }

  // ============================================================
  // Plugin Operations
  // ============================================================

  /**
   * Get installed plugins
   * @param includePlugins Include core plugins
   * @param requestedPlugins Filter by plugin IDs
   * @returns Array of plugins
   */
  async getPlugins(includePlugins?: boolean, requestedPlugins?: string[]): Promise<GrafanaPlugin[]> {
    const params: Record<string, string> = {};
    if (includePlugins) params.builtin = 'true';
    if (requestedPlugins?.length) params.pluginIds = requestedPlugins.join(',');

    const response = await this.http.get<GrafanaPlugin[]>('/plugins', params);
    return response.data;
  }

  /**
   * Get plugin settings
   * @param pluginId Plugin ID
   * @returns Plugin configuration
   */
  async getPluginSettings(pluginId: string): Promise<GrafanaPlugin> {
    const response = await this.http.get<GrafanaPlugin>(`/plugins/${pluginId}/settings`);
    return response.data;
  }

  /**
   * Update plugin settings
   * @param pluginId Plugin ID
   * @param settings Plugin settings to update
   * @returns Updated plugin
   */
  async updatePluginSettings(pluginId: string, settings: {
    jsonData?: Record<string, unknown>;
    secureJsonData?: Record<string, string>;
    enabled?: boolean;
    pinned?: boolean;
  }): Promise<GrafanaPlugin> {
    const response = await this.http.put<GrafanaPlugin>(`/plugins/${pluginId}/settings`, settings);
    return response.data;
  }

  // ============================================================
  // Annotation Operations
  // ============================================================

  /**
   * Get annotations
   * @param from Start time (epoch ms)
   * @param to End time (epoch ms)
   * @param alertId Filter by alert ID
   * @param dashboardId Filter by dashboard ID
   * @param panelId Filter by panel ID
   * @param userId Filter by user ID
   * @param limit Max results
   * @param warning Filter by warning flag
   * @returns Annotations
   */
  async getAnnotations(params: {
    from: string;
    to: string;
    alertId?: number;
    dashboardId?: number;
    panelId?: number;
    userId?: number;
    limit?: number;
    warning?: boolean;
    type?: 'annotation' | 'alert';
  }): Promise<SavedAnnotation[]> {
    const queryParams: Record<string, string> = {
      from: params.from,
      to: params.to,
    };
    
    if (params.alertId) queryParams.alertId = params.alertId.toString();
    if (params.dashboardId) queryParams.dashboardId = params.dashboardId.toString();
    if (params.panelId) queryParams.panelId = params.panelId.toString();
    if (params.userId) queryParams.userId = params.userId.toString();
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.warning) queryParams.warning = 'true';
    if (params.type) queryParams.type = params.type;

    const response = await this.http.get<SavedAnnotation[]>('/annotations', queryParams);
    return response.data;
  }

  /**
   * Create a new annotation
   * @param annotation Annotation to create
   * @returns Created annotation
   */
  async createAnnotation(annotation: {
    dashboardId?: number;
    panelId?: number;
    time: number;
    timeEnd?: number;
    text: string;
    tags?: string[];
    isRegion?: boolean;
  }): Promise<SavedAnnotation> {
    const response = await this.http.post<SavedAnnotation>('/annotations', annotation);
    return response.data;
  }

  /**
   * Update an annotation
   * @param id Annotation ID
   * @param updates Fields to update
   * @returns Updated annotation
   */
  async updateAnnotation(id: number, updates: {
    text?: string;
    tags?: string[];
    timeEnd?: number;
  }): Promise<SavedAnnotation> {
    const response = await this.http.patch<SavedAnnotation>(`/annotations/${id}`, updates);
    return response.data;
  }

  /**
   * Delete an annotation
   * @param id Annotation ID
   * @returns Success message
   */
  async deleteAnnotation(id: number): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/annotations/${id}`);
    return response.data;
  }

  // ============================================================
  // Snapshot Operations
  // ============================================================

  /**
   * Create a snapshot from a dashboard
   * @param dashboard Dashboard to snapshot
   * @param expires Expiration in seconds (default: 10 days)
   * @param name Snapshot name
   * @param key Snapshot key (for private snapshots)
   * @param external Make external/public
   * @returns Snapshot result with delete key
   */
  async createSnapshot(dashboard: GrafanaDashboard, options?: {
    expires?: number;
    name?: string;
    key?: string;
    external?: boolean;
  }): Promise<{
    deleteKey: string;
    key: string;
    url: string;
    revision: number;
    success: boolean;
    slug: string;
  }> {
    const payload = {
      dashboard,
      expires: options?.expires || 864000,
      name: options?.name,
      key: options?.key,
      external: options?.external ?? false,
    };

    const response = await this.http.post<typeof this.createSnapshot extends (...args: any[]) => infer R ? R : never>(
      '/snapshots',
      payload
    );
    return response.data;
  }

  /**
   * Get a snapshot by key
   * @param key Snapshot key
   * @returns Snapshot data
   */
  async getSnapshot(key: string): Promise<{
    dashboard: GrafanaDashboard;
    meta: {
      created: string;
      expires: string;
      deleted: boolean;
    };
  }> {
    const response = await this.http.get<typeof this.getSnapshot extends (...args: any[]) => infer R ? R : never>(
      `/snapshots/${key}`
    );
    return response.data;
  }

  /**
   * Delete a snapshot
   * @param deleteKey Delete key (required for deletion)
   * @returns Success message
   */
  async deleteSnapshot(deleteKey: string): Promise<{ message: string }> {
    const response = await this.http.delete<{ message: string }>(`/snapshots-delete/${deleteKey}`);
    return response.data;
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Generate embedded dashboard URL
   * @param config Embedding configuration
   * @returns Embedded URL
   */
  generateEmbeddedUrl(config: {
    dashboardUid: string;
    panelId?: number;
    initialTime?: TimeRange;
    initialVariables?: Record<string, string>;
    theme?: 'light' | 'dark' | 'current';
    width?: number;
    height?: number;
    autoRefresh?: RefreshInterval;
    showToolbar?: boolean;
    showTimePicker?: boolean;
    showHeader?: boolean;
  }): string {
    const baseUrl = this.http.getBaseUrl();
    const params = new URLSearchParams();

    // Set theme
    if (config.theme && config.theme !== 'current') {
      params.set('theme', config.theme);
    }

    // Set panel if specified
    if (config.panelId) {
      params.set('viewPanel', config.panelId.toString());
    }

    // Set time range
    if (config.initialTime) {
      params.set('from', config.initialTime.from);
      params.set('to', config.initialTime.to);
    }

    // Set variables
    if (config.initialVariables) {
      Object.entries(config.initialVariables).forEach(([key, value]) => {
        params.set(`var-${key}`, value);
      });
    }

    // Set refresh interval
    if (config.autoRefresh) {
      params.set('refresh', config.autoRefresh);
    }

    // Set display options
    if (config.showToolbar !== undefined) {
      params.set('kiosk', config.showToolbar ? '' : 'tv');
    }
    if (config.showTimePicker !== undefined) {
      params.set('showTimePicker', String(config.showTimePicker));
    }
    if (config.showHeader !== undefined) {
      params.set('showHeader', String(config.showHeader));
    }

    const queryString = params.toString();
    return `${baseUrl}/d/${config.dashboardUid}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Generate iframe HTML for embedding
   * @param config Embedding configuration
   * @returns HTML string for iframe
   */
  generateIframeHtml(config: Parameters<this.generateEmbeddedUrl>[0] & {
    className?: string;
    style?: Record<string, string>;
  }): string {
    const src = this.generateEmbeddedUrl(config);
    const style = config.style || {
      border: 'none',
      width: config.width ? `${config.width}px` : '100%',
      height: config.height ? `${config.height}px` : '600px',
    };

    const styleString = Object.entries(style)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');

    return `<iframe src="${src}" class="${config.className || ''}" style="${styleString}" allow="fullscreen"></iframe>`;
  }

  /**
   * Export dashboard to JSON file download
   * @param dashboard Dashboard to export
   * @param filename Filename for download
   */
  exportDashboard(dashboard: GrafanaDashboard, filename?: string): void {
    const json = JSON.stringify(dashboard, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${dashboard.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Validate dashboard JSON structure
   * @param json Dashboard JSON to validate
   * @returns Validation result with errors if any
   */
  validateDashboard(json: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!json.title) {
      errors.push('Dashboard must have a title');
    }

    if (!json.panels || !Array.isArray(json.panels)) {
      errors.push('Dashboard must have panels array');
    } else if ((json.panels as unknown[]).length === 0) {
      warnings.push('Dashboard has no panels');
    }

    // Check schema version
    if (json.schemaVersion && typeof json.schemaVersion === 'number' && json.schemaVersion < 30) {
      warnings.push(`Schema version ${json.schemaVersion} may be outdated. Consider updating.`);
    }

    // Check panels structure
    if (Array.isArray(json.panels)) {
      json.panels.forEach((panel: unknown, index: number) => {
        const p = panel as Record<string, unknown>;
        if (!p.id) {
          errors.push(`Panel at index ${index} missing required "id" field`);
        }
        if (!p.type) {
          errors.push(`Panel at index ${index} missing required "type" field`);
        }
        if (!p.gridPos) {
          warnings.push(`Panel "${p.title || index}" has no grid position defined`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// ============================================================
// Singleton Pattern
// ============================================================

/** Global client instance */
let grafanaClientInstance: GrafanaClient | null = null;

/**
 * Initialize the Grafana client singleton
 * @param config Client configuration
 * @returns Initialized client instance
 * 
 * @example
 * ```typescript
 * await initializeGrafanaClient({
 *   url: process.env.GRAFANA_URL!,
 *   apiKey: process.env.GRAFANA_API_KEY!,
 * });
 * 
 * const client = getGrafanaClient();
 * ```
 */
export function initializeGrafanaClient(config: GrafanaClientConfig): GrafanaClient {
  const httpClient = new GrafanaHttpClient(config);
  grafanaClientInstance = new GrafanaClient(httpClient);
  return grafanaClientInstance;
}

/**
 * Get the initialized Grafana client instance
 * @throws Error if client not initialized
 * @returns Grafana client instance
 */
export function getGrafanaClient(): GrafanaClient {
  if (!grafanaClientInstance) {
    throw new GrafanaError('Grafana client not initialized. Call initializeGrafanaClient() first.');
  }
  return grafanaClientInstance;
}

/**
 * Check if Grafana client is initialized
 * @returns True if initialized
 */
export function isGrafanaClientInitialized(): boolean {
  return grafanaClientInstance !== null;
}

/**
 * Reset the Grafana client instance (useful for testing)
 */
export function resetGrafanaClient(): void {
  grafanaClientInstance = null;
}

// ============================================================
// Export All Types
// ============================================================

// Re-export types for convenience
export type {
  GrafanaDashboard,
  DashboardSearchResult,
  DashboardFolder,
  DashboardSaveResponse,
  DashboardImportResponse,
  DataSource,
  DataSourceRef,
  DataSourceTestResult,
  AlertRule,
  AlertIncident,
  AlertHistoryEntry,
  AlertState,
  ContactPoint,
  MuteTiming,
  NotificationPolicyTree,
  GrafanaUser,
  GrafanaOrganization,
  GrafanaTeam,
  TeamMember,
  GrafanaPlugin,
  SavedAnnotation,
  AnnotationDefinition,
  TemplateVariable,
  DashboardSearchParams,
  AlertSearchParams,
  DatasourceSearchParams,
  GrafanaAPIResponse,
  BulkOperationResult,
  TimeRange,
  RefreshInterval,
  PanelType,
  TargetRefID,
};

export {
  GrafanaError,
  GrafanaAuthError,
  GrafanaNotFoundError,
  GrafanaValidationError,
  GrafanaRateLimitError,
  GrafanaConnectionError,
  GrafanaVersionConflictError,
};
