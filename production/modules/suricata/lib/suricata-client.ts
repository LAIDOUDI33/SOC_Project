/**
 * 🇩🇿 National SOC - Suricata IDS/IPS Integration Client
 * Complete API client for Suricata network intrusion detection system
 * 
 * Features:
 * - Alert ingestion from EVE JSON logs
 * - Signature/rule management
 * - Network flow analysis
 * - Protocol-specific alerts (HTTP, DNS, TLS, etc.)
 * - File extraction events
 * - IDS health and performance monitoring
 */

import { SuricataConfig, SuricataAlert, SuricataRule, SuricataStats } from './types';

// ────────────────────────────────────────────────────────
// CONFIGURATION & CONSTANTS
// ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Partial<SuricataConfig> = {
  baseUrl: process.env.SURICATA_API_URL || 'http://localhost:8080',
  apiKey: process.env.SURICATA_API_KEY || '',
  timeout: 30000,
  retries: 3,
};

// EVE event types we care about
const EVE_EVENT_TYPES = {
  ALERT: 'alert',
  HTTP: 'http',
  DNS: 'dns',
  TLS: 'tls',
  FILEINFO: 'fileinfo',
  FLOW: 'flow',
  NETFLOW: 'netflow',
} as const;

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

export class SuricataError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SuricataError';
  }
}

// ────────────────────────────────────────────────────────
// MAIN CLIENT CLASS
// ────────────────────────────────────────────────────────

export class SuricataClient {
  private config: SuricataConfig;

  constructor(config?: Partial<SuricataConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as SuricataConfig;
  }

  // ────────────────────────────────────────────────────
  // HTTP HELPERS
  // ────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      ...(options.headers as Record<string, string>),
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

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new SuricataError(
            errorBody.message || errorBody.error || `HTTP ${response.status}`,
            response.status,
            errorBody.code,
            errorBody
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (error instanceof SuricataError && !error.statusCode?.toString().startsWith('5')) {
          throw error;
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
  // ALERT MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Get alerts with filtering
   */
  async getAlerts(params?: {
    offset?: number;
    limit?: number;
    severity?: string; // low, medium, high, critical
    action?: string; // allowed, blocked, dropped
    signature_id?: number;
    src_ip?: string;
    dst_ip?: string;
    protocol?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{ alerts: SuricataAlert[]; total: number }> {
    const searchParams = new URLSearchParams();
    
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.signature_id) searchParams.set('signature_id', params.signature_id.toString());
    if (params?.src_ip) searchParams.set('src_ip', params.src_ip);
    if (params?.dst_ip) searchParams.set('dst_ip', params.dst_ip);
    if (params?.protocol) searchParams.set('protocol', params.protocol);
    if (params?.from_date) searchParams.set('from', params.from_date);
    if (params?.to_date) searchParams.set('to', params.to_date);

    // This would typically query EVE JSON or an Elasticsearch index
    // For now, returning mock structure that matches real data
    const response = await this.request<any>(
      `/alerts?${searchParams.toString()}`
    );

    return response || { alerts: [], total: 0 };
  }

  /**
   * Get recent alerts (last N hours)
   */
  async getRecentAlerts(hours: number = 24, limit: number = 100): Promise<SuricataAlert[]> {
    const result = await this.getAlerts({
      limit,
      to_date: new Date().toISOString(),
      from_date: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    });
    return result.alerts;
  }

  /**
   * Get critical/high severity alerts
   */
  async getCriticalAlerts(limit: number = 50): Promise<SuricataAlert[]> {
    const result = await this.getAlerts({
      severity: 'high', // or 'critical' depending on config
      limit,
    });
    return result.alerts;
  }

  /**
   * Parse EVE JSON alert format into normalized structure
   */
  parseEVEAlert(eveEvent: any): SuricataAlert {
    return {
      id: eveEvent.event_id || `${eveEvent.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: eveEvent.timestamp,
      alert: {
        action: eveEvent.alert?.action || 'allowed',
        gid: eveEvent.alert?.gid || 1,
        signature_id: eveEvent.alert?.signature_id || 0,
        rev: eveEvent.alert?.rev || 1,
        signature: eveEvent.alert?.signature || 'Unknown signature',
        category: eveEvent.alert?.category || '',
        severity: this.mapSeverity(eveEvent.alert?.severity),
        metadata: eveEvent.alert?.metadata || {},
      },
      src_ip: eveEvent.src_ip || eveEvent.srcip,
      src_port: eveEvent.src_port || eveEvent.srcport,
      dst_ip: eveEvent.dst_ip || eveEvent.dest_ip || eveEvent.dstip,
      dst_port: eveEvent.dst_port || eveEvent.dest_port || eveEvent.dstport,
      proto: eveEvent.proto || eveEvent.protocol,
      packet_info: eveEvent.packet || '',
      community_id: eveEvent.community_id || '',
      pcap_cnt: eveEvent.pcap_cnt || 0,
      vlan: eveEvent.vlan?.[0],
      flow_id: eveEvent.flow_id,
      // Protocol-specific data
      http: eveEvent.http,
      dns: eveEvent.dns,
      tls: eveEvent.tls,
      files: eveEvent.files || [],
      payload: eveEvent.payload ? Buffer.from(eveEvent.payload, 'base64') : undefined,
    };
  }

  // ────────────────────────────────────────────────────
  // RULE MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Get all active rules
   */
  async getRules(): Promise<SuricataRule[]> {
    const response = await this.request<any>('/rules');
    return response?.rules || [];
  }

  /**
   * Get rule by SID (signature ID)
   */
  async getRuleBySID(sid: number): Promise<SuricataRule | null> {
    const rules = await this.getRules();
    return rules.find(r => r.sid === sid) || null;
  }

  /**
   * Add new rule
   */
  async addRule(rule: string): Promise<SuricataRule> {
    const response = await this.request<{ rule: SuricataRule }>('/rules', {
      method: 'POST',
      body: JSON.stringify({ rule }),
    });
    return response.rule;
  }

  /**
   * Delete rule by SID
   */
  async deleteRule(sid: number): Promise<void> {
    await this.request(`/rules/${sid}`, { method: 'DELETE' });
  }

  /**
   * Enable/disable rule
   */
  async toggleRule(sid: number, enabled: boolean): Promise<void> {
    await this.request(`/rules/${sid}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }

  /**
   * Update ruleset from external source
   */
  async updateRuleset(): Promise<{
    added: number;
    removed: number;
    updated: number;
    errors: string[];
  }> {
    const response = await this.request<any>('/rules/update', {
      method: 'POST',
    });
    return response || { added: 0, removed: 0, updated: 0, errors: [] };
  }

  // ────────────────────────────────────────────────────
  // PROTOCOL-SPECIFIC ANALYSIS
  // ────────────────────────────────────────────────────

  /**
   * Get HTTP-related alerts
   */
  async getHTTPAlerts(hours: number = 24): Promise<SuricataAlert[]> {
    const alerts = await this.getRecentAlerts(hours, 500);
    return alerts.filter(a => a.http || a.proto === 'TCP');
  }

  /**
   * Get DNS-related alerts
   */
  async getDNSAlerts(hours: number = 24): Promise<SuricataAlert[]> {
    const alerts = await this.getRecentAlerts(hours, 500);
    return alerts.filter(a => a.dns || a.alert.signature.toLowerCase().includes('dns'));
  }

  /**
   * Get TLS/SSL-related alerts
   */
  async getTLSAlerts(hours: number = 24): Promise<SuricataAlert[]> {
    const alerts = await this.getRecentAlerts(hours, 500);
    return alerts.filter(a => a.tls || a.alert.signature.toLowerCase().includes('tls'));
  }

  /**
   * Get file extraction events
   */
  async getFileEvents(hours: number = 24): Promise<Array<{
    alert: SuricataAlert;
    files: Array<{
      filename: string;
      size: number;
      md5: string;
      sha256: string;
      type: string;
    }>;
  }>> {
    const alerts = await this.getRecentAlerts(hours, 200);
    return alerts
      .filter(a => a.files && a.files.length > 0)
      .map(a => ({
        alert: a,
        files: a.files.map(f => ({
          filename: f.filename || f.name || 'unknown',
          size: f.size || f.length || 0,
          md5: f.md5 || '',
          sha256: f.sha256 || '',
          type: f.magic || f.type || f.contenttype || 'unknown',
        })),
      }));
  }

  // ────────────────────────────────────────────────────
  // STATISTICS & MONITORING
  // ────────────────────────────────────────────────────

  /**
   * Get Suricata performance statistics
   */
  async getStats(): Promise<SuricataStats> {
    const response = await this.request<any>('/stats');
    return response || this.getDefaultStats();
  }

  /**
   * Get IDS health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    version: string;
    uptime: number;
    running: boolean;
    capture_stats: any;
    error?: string;
  }> {
    try {
      const [stats, version] = await Promise.all([
        this.getStats().catch(() => null),
        this.request<any>('/version').catch(() => ({ version: 'unknown' })),
      ]);

      const isHealthy = stats !== null && 
        stats.capture?.kernel_packets > 0 &&
        stats.detect?.alert_count >= 0;

      return {
        healthy: isHealth,
        version: version.version || 'unknown',
        uptime: stats?.uptime || 0,
        running: true,
        capture_stats: stats?.capture,
      };
    } catch (error) {
      return {
        healthy: false,
        version: 'unknown',
        uptime: 0,
        running: false,
        capture_stats: null,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<{
    health: Awaited<ReturnType<typeof this.healthCheck>>;
    alerts: {
      today: number;
      criticalToday: number;
      thisWeek: number;
      topSignatures: Array<{ signature: string; count: number }>;
      topSrcIPs: Array<{ ip: string; count: number }>;
      topDstIPs: Array<{ ip: string; count: number }>;
      byProtocol: Record<string, number>;
      byAction: Record<string, number>;
    };
    rules: {
      total: number;
      enabled: number;
      disabled: number;
      lastUpdated: string;
    };
  }> {
    const [health, recentAlerts, rules] = await Promise.all([
      this.healthCheck(),
      this.getRecentAlerts(168, 1000).catch(() => []), // Last 7 days
      this.getRules().catch(() => []),
    ]);

    // Calculate statistics from alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alertsToday = recentAlerts.filter(a => 
      new Date(a.timestamp) >= today
    ).length;

    const criticalToday = recentAlerts.filter(a => 
      new Date(a.timestamp) >= today && 
      (a.alert.severity === 'high' || a.alert.severity === 'critical')
    ).length;

    // Top signatures
    const sigCounts: Record<string, number> = {};
    recentAlerts.forEach(a => {
      sigCounts[a.alert.signature] = (sigCounts[a.alert.signature] || 0) + 1;
    });
    const topSignatures = Object.entries(sigCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([signature, count]) => ({ signature, count }));

    // Top source IPs
    const srcIpCounts: Record<string, number> = {};
    recentAlerts.forEach(a => {
      if (a.src_ip) {
        srcIpCounts[a.src_ip] = (srcIpCounts[a.src_ip] || 0) + 1;
      }
    });
    const topSrcIPs = Object.entries(srcIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Top destination IPs
    const dstIpCounts: Record<string, number> = {};
    recentAlerts.forEach(a => {
      if (a.dst_ip) {
        dstIpCounts[a.dst_ip] = (dstIpCounts[a.dst_ip] || 0) + 1;
      }
    });
    const topDstIPs = Object.entries(dstIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // By protocol
    const byProtocol: Record<string, number> = {};
    recentAlerts.forEach(a => {
      const proto = a.proto || 'unknown';
      byProtocol[proto] = (byProtocol[proto] || 0) + 1;
    });

    // By action
    const byAction: Record<string, number> = {};
    recentAlerts.forEach(a => {
      const action = a.alert.action || 'unknown';
      byAction[action] = (byAction[action] || 0) + 1;
    });

    return {
      health,
      alerts: {
        today: alertsToday,
        criticalToday,
        thisWeek: recentAlerts.length,
        topSignatures,
        topSrcIPs,
        topDstIPs,
        byProtocol,
        byAction,
      },
      rules: {
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        disabled: rules.filter(r => !r.enabled).length,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  // ────────────────────────────────────────────────────
  // UTILITY METHODS
  // ────────────────────────────────────────────────────

  private mapSeverity(severity: number | undefined): string {
    if (severity === undefined) return 'medium';
    if (severity >= 3) return 'critical';
    if (severity >= 2) return 'high';
    if (severity >= 1) return 'medium';
    return 'low';
  }

  private getDefaultStats(): SuricataStats {
    return {
      uptime: 0,
      capture: {
        kernel_packets: 0,
        kernel_drops: 0,
        bytes: 0,
        packets: 0,
        avg_bytes_per_packet: 0,
        max_bytes_per_packet: 0,
      },
      detect: {
        alert_count: 0,
        engine_time: {
          max: 0,
          avg: 0,
        },
      },
      app_layer: {
        http: { sessions: 0 },
        dns: { queries: 0 },
        tls: { sessions: 0 },
      },
    };
  }
}

// ────────────────────────────────────────────────────────
// EXPORT SINGLETON INSTANCE
// ────────────────────────────────────────────────────────

let suricataClientInstance: SuricataClient | null = null;

/**
 * Get or create Suricata client singleton
 */
export function getSuricataClient(config?: Partial<SuricataConfig>): SuricataClient {
  if (!suricataClientInstance) {
    suricataClientInstance = new SuricataClient(config);
  }
  return suricataClientInstance;
}

/**
 * Reset client instance
 */
export function resetSuricataClient(): void {
  suricataClientInstance = null;
}

// Default export
export default SuricataClient;
