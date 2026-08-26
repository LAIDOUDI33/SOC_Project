/**
 * 🇩🇿 National SOC - Wazuh SIEM Integration Client
 * Complete API client for Wazuh security monitoring platform
 * 
 * Features:
 * - Alert ingestion and management
 * - Agent monitoring
 * - Security event queries
 * - Compliance checking (PCI-DSS, GDPR, etc.)
 * - FIM (File Integrity Monitoring) events
 * - Vulnerability detection alerts
 * - Real-time alert streaming via WebSocket
 */

import { WazuhConfig, WazuhAlert, WazuhAgent, WazuhSummary } from './types';

// ────────────────────────────────────────────────────────
// CONFIGURATION & CONSTANTS
// ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Partial<WazuhConfig> = {
  baseUrl: process.env.WAZUH_API_URL || 'https://localhost:55000',
  username: process.env.WAZUH_API_USERNAME || 'wazuh',
  password: process.env.WAZUH_API_PASSWORD || 'wazuh',
  timeout: 30000,
  retries: 3,
};

// API endpoints
const ENDPOINTS = {
  // Authentication
  AUTH: '/security/user/authenticate',
  
  // Agents
  AGENTS: '/agents',
  AGENT_BY_ID: '/agents/{agent_id}',
  AGENT_KEY: '/agents/{agent_id}/key',
  AGENT_RESTART: '/agents/{agent_id}/restart',
  
  // Alerts/Events
  ALERTS: '/alerts',
  ALERTS_SUMMARY: '/alerts/summary',
  ALERTS_AGGS: '/alerts/aggs',
  
  // Syscollector (System Information)
  SYS_COLLECTOR: '/syscollector/{agent_id}',
  
  // Security Configuration Assessment (SCA)
  SCA: '/sca/{agent_id}',
  SCA_CHECKS: '/sca/{agent_id}/checks/{check_id}',
  
  // File Integrity Monitoring (FIM)
  FIM: '/fim/{agent_id}',
  
  // Vulnerability Detection
  VULNERABILITIES: '/vulnerability/{agent_id}',
  
  // Active Response
  ACTIVE_RESPONSE: '/active-response',
  
  // Manager Info
  MANAGER_INFO: '/manager/info',
  MANAGER_STATUS: '/manager/status',
  
  // Cluster (if applicable)
  CLUSTER_STATUS: '/cluster/status',
  CLUSTER_NODES: '/cluster/nodes',
  
  // Rules & Decoders
  RULES: '/rules',
  RULES_BY_ID: '/rules/{rule_id}',
  DECODERS: '/decoders',
} as const;

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

export class WazuhError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WazuhError';
  }
}

export class WazuhAuthError extends WazuhError {
  constructor(message: string) {
    super(message, 401, 'AUTH_FAILED');
    this.name = 'WazuhAuthError';
  }
}

export class WazuhRateLimitError extends WazuhError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMITED');
    this.name = 'WazuhRateLimitError';
  }
}

// ────────────────────────────────────────────────────────
// MAIN CLIENT CLASS
// ────────────────────────────────────────────────────────

export class WazuhClient {
  private config: WazuhConfig;
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private requestQueue: Array<() => Promise<any> = [];
  private isRefreshing = false;

  constructor(config?: Partial<WazuhConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as WazuhConfig;
  }

  // ────────────────────────────────────────────────────
  // AUTHENTICATION
  // ────────────────────────────────────────────────────

  /**
   * Authenticate with Wazuh API and get JWT token
   */
  async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}${ENDPOINTS.AUTH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        throw new WazuhAuthError('Authentication failed');
      }

      const data = await response.json();
      this.token = data.data.token;
      // Token typically expires in 900 seconds (15 min)
      this.tokenExpiry = Date.now() + (data.data.expire_time || 900) * 1000;
      
      return this.token;
    } catch (error) {
      if (error instanceof WazuhError) throw error;
      throw new WazuhError(`Authentication error: ${error.message}`);
    }
  }

  /**
   * Get valid token, refresh if needed
   */
  private async getToken(): Promise<string> {
    if (!this.token || !this.tokenExpiry || Date.now() > this.tokenExpiry - 60000) {
      await this.authenticate();
    }
    return this.token!;
  }

  // ────────────────────────────────────────────────────
  // HTTP HELPERS
  // ────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.retries || 3); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
          throw new WazuhRateLimitError(retryAfter);
        }

        // Handle unauthorized (token expired)
        if (response.status === 401 && attempt === 1) {
          this.token = null;
          return this.request(endpoint, options); // Retry with new token
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new WazuhError(
            errorBody.message || `HTTP ${response.status}`,
            response.status,
            errorBody.code,
            errorBody
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (error instanceof WazuhRateLimitError) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        if (attempt < (this.config.retries || 3)) {
          await new Promise(resolve => 
            setTimeout(resolve, 1000 * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  // ────────────────────────────────────────────────────
  // AGENTS MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * List all agents with pagination
   */
  async listAgents(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    search?: string;
    select?: string[];
    status?: 'active' | 'disconnected' | 'never_connected' | 'all';
  }): Promise<{ data: WazuhAgent[]; totalItems: number }> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.select) queryParams.set('select', params.select.join(','));
    if (params?.status) queryParams.set('status', params.status);

    const queryStr = queryParams.toString();
    const response = await this.request<{ data: WazuhAgent[]; totalItems: number }>(
      `${ENDPOINTS.AGENTS}${queryStr ? `?${queryStr}` : ''}`
    );

    return response;
  }

  /**
   * Get agent by ID or name
   */
  async getAgent(agentId: string): Promise<WazuhAgent> {
    const response = await this.request<{ data: WazuhAgent }>(
      ENDPOINTS.AGENT_BY_ID.replace('{agent_id}', agentId)
    );
    return response.data;
  }

  /**
   * Get agent key for deployment
   */
  async getAgentKey(agentId: string): Promise<string> {
    const response = await this.request<{ data: string }>(
      ENDPOINTS.AGENT_KEY.replace('{agent_id}', agentId)
    );
    return response.data;
  }

  /**
   * Restart agent
   */
  async restartAgent(agentId: string): Promise<void> {
    await this.request(
      ENDPOINTS.AGENT_RESTART.replace('{agent_id}', agentId),
      { method: 'PUT' }
    );
  }

  /**
   * Get agents summary statistics
   */
  async getAgentsSummary(): Promise<{
    active: number;
    disconnected: number;
    never_connected: number;
    total: number;
  }> {
    const response = await this.request<{
      data: {
        active: number;
        disconnected: number;
        never_connected: number;
        total: number;
      };
    }>(`${ENDPOINTS.AGENTS}/summary`);
    
    return response.data;
  }

  // ────────────────────────────────────────────────────
  // ALERTS & EVENTS
  // ────────────────────────────────────────────────────

  /**
   * Search alerts with advanced filtering
   */
  async searchAlerts(params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    search?: string;
    select?: string[];
    rule_ids?: number[];
    groups?: string[];
    agents?: string[];
    severity?: number | string;
    time_range?: string; // e.g., "24h", "7d", "30d"
    from_date?: string;
    to_date?: string;
  }): Promise<{ data: WazuhAlert[]; totalItems: number }> {
    const queryParams = new URLSearchParams();
    
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.select) queryParams.set('select', params.select.join(','));
    if (params?.time_range) queryParams.set('time_range', params.time_range);
    if (params?.from_date) queryParams.set('from', params.from_date);
    if (params?.to_date) queryParams.set('to', params.to_date);

    // Filter parameters
    if (params?.rule_ids) {
      params.rule_ids.forEach(id => queryParams.append('rule.id', id.toString()));
    }
    if (params?.groups) {
      params.groups.forEach(group => queryParams.append('rule.group', group));
    }
    if (params?.agents) {
      params.agents.forEach(agent => queryParams.append('agent.name', agent));
    }
    if (params?.severity !== undefined) {
      queryParams.set('rule.level', params.severity.toString());
    }

    const queryStr = queryParams.toString();
    const response = await this.request<{ data: WazuhAlert[]; totalItems: number }>(
      `${ENDPOINTS.ALERTS}${queryStr ? `?${queryStr}` : ''}`
    );

    return response;
  }

  /**
   * Get recent alerts (last N hours)
   */
  async getRecentAlerts(hours: number = 24, limit: number = 100): Promise<WazuhAlert[]> {
    const result = await this.searchAlerts({
      time_range: `${hours}h`,
      limit,
      sort: '-timestamp',
    });
    return result.data;
  }

  /**
   * Get critical/high severity alerts
   */
  async getCriticalAlerts(limit: number = 50): Promise<WazuhAlert[]> {
    const result = await this.searchAlerts({
      severity: '>=10',
      limit,
      sort: '-timestamp,rule.level',
    });
    return result.data;
  }

  /**
   * Get alerts summary (grouped by severity/rule)
   */
  async getAlertsSummary(timeRange: string = '24h'): Promise<WazuhSummary> {
    const response = await this.request<{ data: WazuhSummary }>(
      `${ENDPOINTS.ALERTS_SUMMARY}?time_range=${timeRange}`
    );
    return response.data;
  }

  /**
   * Get alert aggregations (for charts/analytics)
   */
  async getAlertAggregations(params: {
    field: string;           // Field to aggregate on (e.g., 'rule.level')
    interval?: string;       // Time interval ('1h', '1d', etc.)
    time_range?: string;
    size?: number;           // Number of buckets
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.set('field', params.field);
    if (params.interval) queryParams.set('interval', params.interval);
    if (params.time_range) queryParams.set('time_range', params.time_range);
    if (params.size) queryParams.set('size', params.size.toString());

    const response = await this.request<any>(
      `${ENDPOINTS.ALERTS_AGGS}?${queryParams.toString()}`
    );
    return response.data;
  }

  // ────────────────────────────────────────────────────
  // SECURITY COMPLIANCE (SCA)
  // ────────────────────────────────────────────────────

  /**
   * Get SCA (Security Configuration Assessment) results for agent
   */
  async getSCAResults(agentId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      ENDPOINTS.SCA.replace('{agent_id}', agentId)
    );
    return response.data;
  }

  /**
   * Get SCA check details
   */
  async getSCACheck(agentId: string, checkId: string): Promise<any> {
    const response = await this.request<{ data: any }>(
      ENDPOINTS.SCA_CHECKS
        .replace('{agent_id}', agentId)
        .replace('{check_id}', checkId)
    );
    return response.data;
  }

  /**
   * Get compliance score across all agents
   */
  async getComplianceScore(): Promise<{
    pci_dss: number;
    gdpr: number;
    hipaa: number;
    nist: number;
    tsc: number;
  }> {
    const agents = await this.listAgents({ limit: 500 });
    let totalScores = { pci_dss: 0, gdpr: 0, hipaa: 0, nist: 0, tsc: 0 };
    let count = 0;

    for (const agent of agents.data.slice(0, 50)) { // Limit to avoid timeout
      try {
        const scaResults = await this.getSCAResults(agent.id);
        scaResults.forEach((result: any) => {
          if (result.compliance) {
            Object.keys(totalScores).forEach(key => {
              if (result.compliance[key] !== undefined) {
                totalScores[key] += result.compliance[key];
              }
            });
          }
        });
        count++;
      } catch (error) {
        console.error(`Failed to get SCA for agent ${agent.id}:`, error);
      }
    }

    return {
      pci_dss: count > 0 ? Math.round(totalScores.pci_dss / count) : 0,
      gdpr: count > 0 ? Math.round(totalScores.gdpr / count) : 0,
      hipaa: count > 0 ? Math.round(totalScores.hipaa / count) : 0,
      nist: count > 0 ? Math.round(totalScores.nist / count) : 0,
      tsc: count > 0 ? Math.round(totalScores.tsc / count) : 0,
    };
  }

  // ────────────────────────────────────────────────────
  // FILE INTEGRITY MONITORING (FIM)
  // ────────────────────────────────────────────────────

  /**
   * Get FIM events for an agent
   */
  async getFIMEvents(agentId: string, params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    type?: 'added' | 'modified' | 'deleted';
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.type) queryParams.set('type', params.type);

    const response = await this.request<{ data: any[] }>(
      `${ENDPOINTS.FIM.replace('{agent_id}', agentId)}?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get recent file changes across all agents
   */
  async getRecentFileChanges(hours: number = 24): Promise<any[]> {
    const agents = await this.listAgents({ status: 'active', limit: 50 });
    const changes: any[] = [];

    for (const agent of agents.data.slice(0, 20)) {
      try {
        const events = await this.getFIMEvents(agent.id, {
          limit: 10,
          sort: '-timestamp',
        });
        events.forEach(event => {
          const eventTime = new Date(event.timestamp);
          const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
          if (eventTime > hoursAgo) {
            changes.push({ ...event, agentName: agent.name });
          }
        });
      } catch (error) {
        // Agent may not have FIM enabled
      }
    }

    return changes.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 100);
  }

  // ────────────────────────────────────────────────────
  // VULNERABILITY DETECTION
  // ────────────────────────────────────────────────────

  /**
   * Get vulnerabilities for a specific agent
   */
  async getVulnerabilities(agentId: string, params?: {
    offset?: number;
    limit?: number;
    sort?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.severity) queryParams.set('severity', params.severity);

    const response = await this.request<{ data: any[] }>(
      `${ENDPOINTS.VULNERABILITIES.replace('{agent_id}', agentId)}?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get vulnerability summary across all agents
   */
  async getVulnerabilitySummary(): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    affected_agents: number;
  }> {
    const agents = await this.listAgents({ status: 'active', limit: 200 });
    let summary = { total: 0, critical: 0, high: 0, medium: 0, low: 0, affected_agents: 0 };

    for (const agent of agents.data.slice(0, 50)) {
      try {
        const vulns = await this.getVulnerabilities(agent.id, { limit: 1 });
        if (vulns.length > 0) {
          summary.affected_agents++;
          // Note: Full count would require paginated requests
        }
      } catch (error) {
        // Agent may not have vulnerability detection
      }
    }

    return summary;
  }

  // ────────────────────────────────────────────────────
  // SYSTEM INFORMATION (Syscollector)
  // ────────────────────────────────────────────────────

  /**
   * Get system information for an agent
   */
  async getSystemInfo(agentId: string): Promise<any> {
    const response = await this.request<{ data: any }>(
      ENDPOINTS.SYS_COLLECTOR.replace('{agent_id}', agentId)
    );
    return response.data;
  }

  /**
   * Get installed packages for an agent
   */
  async getInstalledPackages(agentId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      `${ENDPOINTS.SYS_COLLECTOR.replace('{agent_id}', agentId)}/packages`
    );
    return response.data;
  }

  /**
   * Get network interfaces for an agent
   */
  async getNetworkInterfaces(agentId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(
      `${ENDPOINTS.SYS_COLLECTOR.replace('{agent_id}', agentId)}/netiface`
    );
    return response.data;
  }

  // ────────────────────────────────────────────────────
  // MANAGER INFORMATION
  // ────────────────────────────────────────────────────

  /**
   * Get Wazuh manager information
   */
  async getManagerInfo(): Promise<{
    version: string;
    compilation_date: string;
    type: string;
    md5: string;
    max_agents: number;
    openssl_support: boolean;
    tz_name: string;
    tz_offset: string;
  }> {
    const response = await this.request<{ data: any }>(ENDPOINTS.MANAGER_INFO);
    return response.data;
  }

  /**
   * Get manager status (daemons, modules)
   */
  async getManagerStatus(): Promise<Array<{
    name: string;
    status: string;
  }>> {
    const response = await this.request<{ data: Array<{ name: string; status: string }> }>(
      ENDPOINTS.MANAGER_STATUS
    );
    return response.data;
  }

  /**
   * Check overall system health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    manager: { status: string; version: string };
    agents: { active: number; total: number; disconnected: number };
    alerts: { last_24h: number; critical: number };
  }> {
    const [managerInfo, agentsSummary, alertsSummary, recentAlerts] = await Promise.all([
      this.getManagerInfo().catch(() => ({ status: 'unreachable', version: 'unknown' })),
      this.getAgentsSummary().catch(() => ({ active: 0, total: 0, disconnected: 0, never_connected: 0 })),
      this.getAlertsSummary().catch(() => ({ total: 0, signature: 0, totalFired: 0 })),
      this.getRecentAlerts(24, 1).catch(() => []),
    ]);

    const managerStatus = await this.getManagerStatus().catch(() => []);
    const isHealthy = managerStatus.every(d => d.status === 'running' || d.status === 'configured');

    return {
      healthy: isHealthy,
      manager: {
        status: isHealthy ? 'healthy' : 'degraded',
        version: managerInfo.version,
      },
      agents: agentsSummary,
      alerts: {
        last_24h: alertsSummary.totalFired || 0,
        critical: recentAlerts.filter(a => (a.rule?.level || 0) >= 10).length,
      },
    };
  }

  // ────────────────────────────────────────────────────
  // ACTIVE RESPONSE
  // ────────────────────────────────────────────────────

  /**
   * Execute active response command on agent
   */
  async executeActiveResponse(params: {
    agentId: string;
    command: string;
    arguments?: Record<string, any>;
    custom?: boolean;
  }): Promise<any> {
    const response = await this.request<{ data: any }>(ENDPOINTS.ACTIVE_RESPONSE, {
      method: 'PUT',
      body: JSON.stringify({
        agent_id: params.agentId,
        command: params.command,
        arguments: params.arguments,
        custom: params.custom || false,
      }),
    });
    return response.data;
  }

  /**
   * Isolate host from network (firewall block)
   */
  async isolateHost(agentId: string): Promise<void> {
    await this.executeActiveResponse({
      agentId,
      command: 'host-isolate',
    });
  }

  /**
   * Remove isolation from host
   */
  async unisolateHost(agentId: string): Promise<void> {
    await this.executeActiveResponse({
      agentId,
      command: 'host-unisolate',
    });
  }

  // ────────────────────────────────────────────────────
  // REAL-TIME STREAMING (WebSocket Bridge)
  // ────────────────────────────────────────────────────

  /**
   * Create SSE-like stream for real-time alerts
   * Returns an async generator that yields new alerts
   */
  async *alertStream(intervalMs: number = 5000): AsyncGenerator<WazuhAlert[]> {
    let lastTimestamp = new Date().toISOString();

    while (true) {
      try {
        const alerts = await this.searchAlerts({
          from_date: lastTimestamp,
          limit: 100,
          sort: 'timestamp',
        });

        if (alerts.data.length > 0) {
          lastTimestamp = alerts.data[alerts.data.length - 1].timestamp || lastTimestamp;
          yield alerts.data;
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Alert stream error:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Back off on error
      }
    }
  }
}

// ────────────────────────────────────────────────────────
// EXPORT SINGLETON INSTANCE
// ────────────────────────────────────────────────────────

let wazuhClientInstance: WazuhClient | null = null;

/**
 * Get or create Wazuh client singleton
 */
export function getWazuhClient(config?: Partial<WazuhConfig>): WazuhClient {
  if (!wazuhClientInstance) {
    wazuhClientInstance = new WazuhClient(config);
  }
  return wazuhClientInstance;
}

/**
 * Reset client instance (useful for testing or config changes)
 */
export function resetWazuhClient(): void {
  wazuhClientInstance = null;
}

// Default export
export default WazuhClient;
