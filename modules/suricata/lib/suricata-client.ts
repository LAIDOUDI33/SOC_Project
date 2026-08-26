/**
 * Suricata IDS/IPS Client Library
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive client for:
 * - Alert management and analysis
 * - Rule CRUD operations
 * - Statistics aggregation
 * - Sensor health monitoring
 * - Signature updates
 */

import {
  EveEvent,
  SuricataRule,
  SuricataStats,
  SuricataSensor,
  AlertFilter,
  RuleFilter,
  AlertResultSet,
  RuleResultSet,
  RuleUpdateOptions,
  RuleUpdateResult,
  SeverityLevel,
  RuleState,
  RuleAction,
  SignatureSource,
  AlertCategory,
  Protocol,
  TimeRange,
  AttackMapPoint,
  GeoLocation,
  BulkOperationResult,
  ApiResponse,
  PaginatedResponse,
  ExportJob,
  ExportFormat,
  ExportStatus,
  RuleValidationStatus,
  SensorStatus,
  SEVERITY_CONFIG,
  DEFAULT_PORTS
} from './suricata.types';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/** Base error for Suricata client */
export class SuricataError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: string[]
  ) {
    super(message);
    this.name = 'SuricataError';
  }
}

/** Authentication error */
export class SuricataAuthError extends SuricataError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'SuricataAuthError';
  }
}

/** Rate limit error */
export class SuricataRateLimitError extends SuricataError {
  constructor(retryAfterSeconds: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterSeconds} seconds`,
      'RATE_LIMITED',
      429
    );
    this.name = 'SuricataRateLimitError';
    this.retryAfter = retryAfterSeconds;
  }
  
  retryAfter: number;
}

/** Connection error */
export class SuricataConnectionError extends SuricataError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'SuricataConnectionError';
  }
}

/** Validation error */
export class SuricataValidationError extends SuricataError {
  constructor(message: string, details?: string[]) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'SuricataValidationError';
  }
}

/** Rule compilation error */
export class RuleCompilationError extends SuricataError {
  constructor(ruleId: string, errors: string[]) {
    super(
      `Rule ${ruleId} failed to compile: ${errors.join(', ')}`,
      'RULE_COMPILATION_ERROR',
      422,
      errors
    );
    this.name = 'RuleCompilationError';
    this.ruleId = ruleId;
    this.errors = errors;
  }
  
  ruleId: string;
  errors: string[];
}

// ============================================================================
// CONFIGURATION & CLIENT CLASS
// ============================================================================

/** Suricata client configuration */
export interface SuricataClientConfig {
  /** Base URL for Suricata REST API (e.g., http://suricata:8080) */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Default sensor ID for queries */
  defaultSensorId?: string;
  /** Enable response caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds (default: 5000) */
  cacheTtl?: number;
}

/** Cached response entry */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Main Suricata IDS/IPS Client Class
 * 
 * Provides comprehensive interface to Suricata engine including:
 * - Alert querying and analysis
 * - Rule management
 * - Statistics retrieval
 * - Sensor monitoring
 * - Integration with threat intelligence
 */
export class SuricataClient {
  private config: Required<SuricataClientConfig>;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: SuricataClientConfig) {
    this.config = {
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      debug: config.debug ?? false,
      enableCache: config.enableCache ?? true,
      cacheTtl: config.cacheTtl ?? 5000,
      ...config
    };
    
    if (this.config.debug) {
      console.log('[SuricataClient] Initialized with config:', {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        cacheEnabled: this.config.enableCache
      });
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.config.baseUrl}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Get cached data or fetch fresh
   */
  private async getCached<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
    if (!this.config.enableCache) {
      return fetcher();
    }

    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      if (this.config.debug) {
        console.log(`[SuricataClient] Cache hit: ${cacheKey}`);
      }
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + this.config.cacheTtl
    });

    // Clean up old entries periodically
    if (this.requestCount % 100 === 0) {
      this.cleanCache();
    }

    return data;
  }

  /**
   * Remove expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    if (this.config.debug) {
      console.log('[SuricataClient] Cache cleared');
    }
  }

  /**
   * Execute HTTP request with error handling and retries
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { skipCache?: boolean; headers?: Record<string, string> }
  ): Promise<T> {
    const url = this.buildUrl(path);
    const cacheKey = `${method}:${url}:${JSON.stringify(body)}`;

    // Check rate limiting
    this.enforceRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        ...(options?.headers || {})
      };

      if (this.config.debug) {
        console.log(`[SuricataClient] ${method} ${url}`, body ? { body } : '');
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.requestCount++;
      this.lastRequestTime = Date.now();

      // Handle specific status codes
      if (response.status === 401) {
        throw new SuricataAuthError('Invalid or missing API key');
      }

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new SuricataRateLimitError(retryAfter);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new SuricataError(
          errorBody.message || `HTTP ${response.status}: ${response.statusText}`,
          `HTTP_${response.status}`,
          response.status,
          errorBody.details
        );
      }

      const data = await response.json();
      
      if (options?.skipCache) {
        return data;
      }
      
      return this.getCached(cacheKey, () => Promise.resolve(data));

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SuricataError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SuricataConnectionError(`Request timed out after ${this.config.timeout}ms`);
      }

      throw new SuricataConnectionError(
        error instanceof Error ? error.message : 'Unknown connection error'
      );
    }
  }

  /**
   * Enforce rate limiting between requests
   */
  private enforceRateLimit(): void {
    const minInterval = 100; // Minimum 100ms between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval && this.lastRequestTime > 0) {
      const waitTime = minInterval - timeSinceLastRequest;
      if (this.config.debug) {
        console.log(`[SuricataClient] Rate limit: waiting ${waitTime}ms`);
      }
    }
  }

  // ============================================================================
  // HEALTH & STATUS
  // ============================================================================

  /**
   * Check Suricata service health
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime_seconds: number;
    sensors_online: number;
    sensors_total: number;
  }> {
    return this.request('GET', '/health');
  }

  /**
   * Get Suricata version information
   */
  async getVersion(): Promise<{
    version: string;
    git_hash: string;
    build_info: string;
    features: string[];
  }> {
    return this.request('GET', '/version');
  }

  /**
   * Get all registered sensors
   */
  async getSensors(): Promise<SuricataSensor[]> {
    return this.request('GET', '/sensors');
  }

  /**
   * Get specific sensor by ID
   */
  async getSensor(sensorId: string): Promise<SuricataSensor> {
    return this.request('GET', `/sensors/${sensorId}`);
  }

  /**
   * Get sensor health status
   */
  async getSensorHealth(sensorId?: string): Promise<{
    sensor_id: string;
    status: SensorStatus;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
    last_check: string;
  }> {
    const id = sensorId || this.config.defaultSensorId || 'default';
    return this.request('GET', `/sensors/${id}/health`);
  }

  // ============================================================================
  // ALERT OPERATIONS
  // ============================================================================

  /**
   * Search alerts with filtering and pagination
   */
  async searchAlerts(filter: AlertFilter = {}): Promise<AlertResultSet> {
    const params = this.filterToParams(filter);
    return this.request('GET', '/alerts', undefined, { skipCache: true });
  }

  /**
   * Get single alert by ID
   */
  async getAlert(alertId: string): Promise<EveEvent> {
    return this.request('GET', `/alerts/${alertId}`);
  }

  /**
   * Get recent alerts (last N hours)
   */
  async getRecentAlerts(hours: number = 24, limit: number = 100): Promise<EveEvent[]> {
    const filter: AlertFilter = {
      time_range: TimeRange.LAST_24_HOURS,
      page_size: limit
    };
    const result = await this.searchAlerts(filter);
    return result.alerts;
  }

  /**
   * Get alerts by signature SID
   */
  async getAlertsBySignature(signatureId: number, limit: number = 50): Promise<EveEvent[]> {
    const filter: AlertFilter = {
      signature_id: signatureId,
      page_size: limit
    };
    const result = await this.searchAlerts(filter);
    return result.alerts;
  }

  /**
   * Get alerts for a specific IP address (source or destination)
   */
  async getAlertsByIP(ipAddress: string, limit: number = 100): Promise<EveEvent[]> {
    const result = await this.searchAlerts({
      src_ip: ipAddress,
      dest_ip: ipAddress,
      page_size: limit
    });
    return result.alerts;
  }

  /**
   * Get critical/high severity alerts
   */
  async getHighPriorityAlerts(limit: number = 50): Promise<EveEvent[]> {
    const result = await this.searchAlerts({
      severities: [SeverityLevel.CRITICAL, SeverityLevel.HIGH],
      page_size: limit,
      sort_by: 'severity' as any,
      sort_order: 'desc'
    });
    return result.alerts;
  }

  /**
   * Get alerts grouped by category
   */
  async getAlertsByCategory(category: AlertCategory, limit: number = 50): Promise<EveEvent[]> {
    const result = await this.searchAlerts({
      categories: [category],
      page_size: limit
    });
    return result.alerts;
  }

  /**
   * Get alerts with threat intelligence matches
   */
  async getThreatIntelMatchedAlerts(limit: number = 50): Promise<EveEvent[]> {
    const result = await this.searchAlerts({
      has_threat_intel_match: true,
      page_size: limit
    });
    return result.alerts;
  }

  /**
   * Mark alert as false positive
   */
  async markFalsePositive(alertId: string, reason: string): Promise<void> {
    await this.request('POST', `/alerts/${alertId}/false-positive`, {
      reason,
      marked_at: new Date().toISOString(),
      marked_by: 'soc-analyst' // TODO: Get from auth context
    });
  }

  /**
   * Bulk mark alerts as false positives
   */
  async bulkMarkFalsePositive(alertIds: string[], reason: string): Promise<BulkOperationResult> {
    return this.request('POST', '/alerts/bulk/false-positive', {
      alert_ids: alertIds,
      reason,
      marked_at: new Date().toISOString()
    });
  }

  /**
   * Get attack map data for visualization
   */
  async getAttackMapData(timeRange: TimeRange = TimeRange.LAST_24_HOURS): Promise<AttackMapPoint[]> {
    return this.request('GET', '/analytics/attack-map', { time_range: timeRange });
  }

  /**
   * Get geolocation for IP addresses
   */
  async getGeoLocation(ips: string[]): Promise<Map<string, GeoLocation>> {
    const result = await this.request('POST', '/geo/lookup', { ips });
    return new Map(result.map((loc: GeoLocation) => [loc.ip, loc]));
  }

  // ============================================================================
  // RULE OPERATIONS
  // ============================================================================

  /**
   * Get all rules with optional filtering
   */
  async searchRules(filter: RuleFilter = {}): Promise<RuleResultSet> {
    return this.request('GET', '/rules', filter as Record<string, unknown>);
  }

  /**
   * Get single rule by SID
   */
  async getRule(sid: number): Promise<SuricataRule> {
    return this.request('GET', `/rules/${sid}`);
  }

  /**
   * Create custom rule
   */
  async createRule(ruleData: Omit<SuricataRule, 'id' | 'created_at' | 'updated_at' | 'hit_count' | 'false_positive_count'>): Promise<SuricataRule> {
    // Validate rule syntax before creation
    const validation = await this.validateRule(ruleData.raw);
    if (validation.status !== RuleValidationStatus.VALID) {
      throw new RuleCompilationError('new-rule', validation.errors || ['Validation failed']);
    }

    return this.request('POST', '/rules', {
      ...ruleData,
      source: SignatureSource.CUSTOM,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Update existing rule
   */
  async updateRule(sid: number, updates: Partial<SuricataRule>): Promise<SuricataRule> {
    // If raw rule changed, re-validate
    if (updates.raw) {
      const validation = await this.validateRule(updates.raw);
      if (validation.status !== RuleValidationStatus.VALID) {
        throw new RuleCompilationError(String(sid), validation.errors || ['Validation failed']);
      }
    }

    return this.request('PUT', `/rules/${sid}`, {
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Delete custom rule
   */
  async deleteRule(sid: number): Promise<void> {
    return this.request('DELETE', `/rules/${sid}`);
  }

  /**
   * Enable rule
   */
  async enableRule(sid: number, sensorIds?: string[]): Promise<void> {
    await this.request('POST', `/rules/${sid}/enable`, {
      sensor_ids: sensorIds,
      enabled_at: new Date().toISOString()
    });
  }

  /**
   * Disable rule
   */
  async disableRule(sid: number, reason?: string, sensorIds?: string[]): Promise<void> {
    await this.request('POST', `/rules/${sid}/disable`, {
      reason,
      sensor_ids: sensorIds,
      disabled_at: new Date().toISOString()
    });
  }

  /**
   * Bulk enable/disable rules
   */
  async bulkToggleRules(sids: number[], state: RuleState, reason?: string): Promise<BulkOperationResult> {
    return this.request('POST', '/rules/bulk/toggle', {
      sids,
      state,
      reason,
      toggled_at: new Date().toISOString()
    });
  }

  /**
   * Validate rule syntax
   */
  async validateRule(ruleText: string): Promise<{
    status: RuleValidationStatus;
    errors?: string[];
    warnings?: string[];
    parsed?: Partial<SuricataRule>;
  }> {
    return this.request('POST', '/rules/validate', { rule: ruleText });
  }

  /**
   * Test rule against sample traffic
   */
  async testRule(ruleText: string, pcapSample?: string): Promise<{
    matched: boolean;
    match_count: number;
    sample_alerts: Partial<EveEvent>[];
    performance_impact: {
      cpu_overhead_percent: number;
      memory_bytes: number;
    };
  }> {
    return this.request('POST', '/rules/test', {
      rule: ruleText,
      pcap_sample: pcapSample
    });
  }

  /**
   * Update rules from external sources
   */
  async updateRules(options: RuleUpdateOptions): Promise<RuleUpdateResult> {
    return this.request('POST', '/rules/update', options);
  }

  /**
   * Get Emerging Threats Open ruleset status
   */
  async getETOpenStatus(): Promise<{
    installed_version: string;
    latest_version: string;
    rule_count: number;
    last_update: string;
    update_available: boolean;
  }> {
    return this.request('GET', '/rules/sources/etopen/status');
  }

  /**
   * Get Emerging Threats Pro ruleset status (requires Oinkcode)
   */
  async getETProStatus(oinkcode: string): Promise<{
    installed_version: string;
    latest_version: string;
    rule_count: number;
    last_update: string;
    subscription_valid: boolean;
    expiry_date: string;
  }> {
    return this.request('GET', '/rules/sources/etpro/status', { oinkcode });
  }

  /**
   * Import rules from file
   */
  async importRules(fileContent: string, source: SignatureSource = SignatureSource.CUSTOM): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ line_number: number; error: string }>;
  }> {
    return this.request('POST', '/rules/import', {
      content: fileContent,
      source
    });
  }

  /**
   * Export rules
   */
  async exportRules(filter?: RuleFilter, format: ExportFormat = ExportFormat.SURICATA_RULES): Promise<string> {
    const response = await this.request('GET', '/rules/export', {
      ...filter,
      format
    }, { skipCache: true });
    return typeof response === 'string' ? response : JSON.stringify(response, null, 2);
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive statistics
   */
  async getStatistics(timeRange: TimeRange = TimeRange.LAST_24_HOURS): Promise<SuricataStats> {
    return this.request('GET', '/statistics', { time_range: timeRange });
  }

  /**
   * Get alert trends over time
   */
  async getAlertTrends(
    timeRange: TimeRange = TimeRange.LAST_7_DAYS,
    interval: 'hour' | 'day' = 'hour'
  ): Promise<{
    overall: Array<{ timestamp: string; count: number }>;
    by_severity: Record<SeverityLevel, Array<{ timestamp: string; count: number }>>;
    by_category: Record<AlertCategory, Array<{ timestamp: string; count: number }>>;
  }> {
    return this.request('GET', '/statistics/trends', {
      time_range: timeRange,
      interval
    });
  }

  /**
   * Get top attacking IPs
   */
  async topSourceIPs(limit: number = 20, timeRange?: TimeRange): Promise<Array<{
    ip: string;
    count: number;
    country?: string;
    asn?: number;
    reputation_score: number;
  }>> {
    const stats = await this.getStatistics(timeRange);
    return stats.top_source_ips.slice(0, limit);
  }

  /**
   * Get most targeted IPs/services
   */
  async topDestinationIPs(limit: number = 20, timeRange?: TimeRange): Promise<Array<{
    ip: string;
    count: number;
    services: Array<{ port: number; protocol: string; count: number }>;
  }>> {
    const stats = await this.getStatistics(timeRange);
    return stats.top_destination_ips.slice(0, limit);
  }

  /**
   * Get protocol distribution
   */
  async getProtocolDistribution(timeRange?: TimeRange): Promise<Record<string, number>> {
    const stats = await this.getStatistics(timeRange);
    return stats.protocol_distribution;
  }

  /**
   * Get top triggered signatures
   */
  async topSignatures(limit: number = 20, timeRange?: TimeRange): Promise<Array<{
    sid: number;
    signature: string;
    count: number;
    severity: SeverityLevel;
    category: string;
  }>> {
    const stats = await this.getStatistics(timeRange);
    return stats.top_signatures.slice(0, limit);
  }

  /**
   * Get packet processing statistics
   */
  async getPacketStats(): Promise<{
    packets_received: number;
    packets_dropped: number;
    packets_processed: number;
    drop_rate: number;
    bytes_received: number;
    bytes_processed: number;
    pps: number; // packets per second
    bps: number; // bits per second
  }> {
    const stats = await this.getStatistics();
    const uptime = stats.uptime_seconds || 1;
    return {
      packets_received: stats.packets_received,
      packets_dropped: stats.packets_dropped,
      packets_processed: stats.packets_processed,
      drop_rate: stats.packets_received > 0 
        ? (stats.packets_dropped / stats.packets_received) * 100 
        : 0,
      bytes_received: stats.bytes_received,
      bytes_processed: stats.bytes_received, // Approximation
      pps: Math.round(stats.packets_received / uptime),
      bps: Math.round((stats.bytes_received * 8) / uptime)
    };
  }

  /**
   * Get flow statistics
   */
  async getFlowStats(): Promise<{
    active_flows: number;
    total_flows: number;
    avg_duration_ms: number;
    protocols: Record<string, number>;
  }> {
    const stats = await this.getStatistics();
    return {
      active_flows: stats.active_flows,
      total_flows: stats.total_flows,
      avg_duration_ms: stats.avg_flow_duration_ms,
      protocols: stats.protocol_distribution
    };
  }

  // ============================================================================
  // EXPORT OPERATIONS
  // ============================================================================

  /**
   * Create export job
   */
  async createExportJob(
    type: 'alerts' | 'rules',
    format: ExportFormat,
    filters?: AlertFilter | RuleFilter
  ): Promise<ExportJob> {
    return this.request('POST', '/exports', {
      type,
      format,
      filters,
      created_by: 'soc-analyst' // TODO: From auth context
    });
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ExportJob> {
    return this.request('GET', `/exports/${jobId}`);
  }

  /**
   * Download exported file
   */
  async downloadExport(jobId: string): Promise<Blob> {
    const response = await fetch(`${this.config.baseUrl}/exports/${jobId}/download`, {
      headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
    });

    if (!response.ok) {
      throw new SuricataError('Failed to download export', 'DOWNLOAD_ERROR', response.status);
    }

    return response.blob();
  }

  // ============================================================================
  // INTEGRATION HELPERS
  // ============================================================================

  /**
   * Format alert for MISP event creation
   */
  formatAlertForMISP(alert: EveEvent): {
    title: string;
    description: string;
    attributes: Array<{ type: string; value: string; category: string }>;
    tags: string[];
  } {
    if (!alert.alert) {
      throw new Error('Event is not an alert type');
    }

    const { alert: alertData } = alert;
    
    return {
      title: `[SURICATA] ${alertData.signature}`,
      description: `Suricata IDS alert: ${alertData.signature}\n` +
        `Category: ${alertData.category}\n` +
        `Severity: ${alertData.severity}\n` +
        `Source: ${alert.src_ip}:${alert.src_port}\n` +
        `Destination: ${alert.dest_ip}:${alert.dest_port}\n` +
        `Timestamp: ${alert.timestamp}`,
      attributes: [
        { type: 'ip-src', value: alert.src_ip, category: 'Network activity' },
        { type: 'ip-dst', value: alert.dest_ip, category: 'Network activity' },
        { type: 'domain', value: alert.http?.hostname || '', category: 'Network activity' },
        { type: 'text', value: alertData.signature, category: 'Payload delivery' },
        { type: 'text', value: alertData.signature_id.toString(), category: 'External analysis' },
        { type: 'port', value: alert.src_port.toString(), category: 'Network activity' },
        { type: 'port', value: alert.dest_port.toString(), category: 'Network activity' }
      ].filter(attr => attr.value),
      tags: [
        `suricata:${alertData.signature_id}`,
        `severity:${alertData.severity}`,
        `category:${alertData.category.toLowerCase().replace(/\s+/g, '_')}`,
        ...Object.keys(alertData.metadata || {}).map(k => `metadata:${k}`)
      ]
    };
  }

  /**
   * Format alert for TheHive case creation
   */
  formatAlertForTheHive(alert: EveEvent): {
    title: string;
    description: string;
    severity: number;
    tags: string[];
    observables: Array<{ dataType: string; data: string; message: string }>;
    tlp: number;
  } {
    if (!alert.alert) {
      throw new Error('Event is not an alert type');
    }

    const { alert: alertData } = alert;
    const severityMap: Record<number, number> = {
      1: 1, // Critical -> High
      2: 2, // High -> Medium-High
      3: 2, // Medium -> Medium
      4: 3, // Low -> Low
      5: 4  // Informational -> Info
    };

    return {
      title: `[IDS] ${alertData.signature}`,
      description: `**Signature:** ${alertData.signature}\n` +
        `**SID:** ${alertData.signature_id}\n` +
        `**Category:** ${alertData.category}\n` +
        `**Severity:** ${alertData.severity}/5\n\n` +
        `**Source:** ${alert.src_ip}:${alert.src_port}\n` +
        `**Destination:** ${alert.dest_ip}:${alert.dest_port}\n` +
        `**Protocol:** ${alert.proto}\n` +
        `**Timestamp:** ${alert.timestamp}`,
      severity: severityMap[alertData.severity] || 2,
      tags: ['suricata', 'ids', `sid:${alertData.signature_id}`, alertData.category.toLowerCase()],
      observables: [
        { dataType: 'ip', data: alert.src_ip, message: 'Source IP' },
        { dataType: 'ip', data: alert.dest_ip, message: 'Destination IP' },
        { dataType: 'port', data: alert.src_port.toString(), message: 'Source Port' },
        { dataType: 'port', data: alert.dest_port.toString(), message: 'Destination Port' }
      ],
      tlp: 2 // Amber by default
    };
  }

  /**
   * Generate summary report for dashboard
   */
  async generateSummaryReport(): Promise<{
    total_alerts: number;
    critical_alerts: number;
    unique_signatures: number;
    unique_source_ips: number;
    unique_dest_ips: number;
    top_attack_countries: Array<{ country: string; count: number }>;
    packet_stats: Awaited<ReturnType<SuricataClient['getPacketStats']>>;
    sensor_status: Array<{ id: string; name: string; status: SensorStatus }>;
    last_rule_update: string;
  }> {
    const [stats, sensors, packetStats] = await Promise.all([
      this.getStatistics(),
      this.getSensors(),
      this.getPacketStats()
    ]);

    // Aggregate countries from top source IPs
    const countryCounts: Record<string, number> = {};
    stats.top_source_ips.forEach(ip => {
      if (ip.country) {
        countryCounts[ip.country] = (countryCounts[ip.country] || 0) + ip.alert_count;
      }
    });

    return {
      total_alerts: Object.values(stats.alerts_by_severity).reduce((a, b) => a + b, 0),
      critical_alerts: stats.alerts_by_severity[SeverityLevel.CRITICAL] || 0,
      unique_signatures: stats.top_signatures.length,
      unique_source_ips: stats.top_source_ips.length,
      unique_dest_ips: stats.top_destination_ips.length,
      top_attack_countries: Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([country, count]) => ({ country, count })),
      packet_stats: packetStats,
      sensor_status: sensors.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status
      })),
      last_rule_update: sensors[0]?.last_rule_update || 'Unknown'
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert filter object to query parameters
   */
  private filterToParams(filter: AlertFilter): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (filter.time_range) params.time_range = filter.time_range;
    if (filter.time_start) params.time_start = filter.time_start;
    if (filter.time_end) params.time_end = filter.time_end;
    if (filter.severities?.length) params.severities = filter.severities;
    if (filter.min_severity) params.min_severity = filter.min_severity;
    if (filter.categories?.length) params.categories = filter.categories;
    if (filter.src_ip) params.src_ip = filter.src_ip;
    if (filter.src_cidr) params.src_cidr = filter.src_cidr;
    if (filter.dest_ip) params.dest_ip = filter.dest_ip;
    if (filter.dest_cidr) params.dest_cidr = filter.dest_cidr;
    if (filter.src_port) params.src_port = filter.src_port;
    if (filter.dest_port) params.dest_port = filter.dest_port;
    if (filter.protocol) params.protocol = filter.protocol;
    if (filter.signature_id) params.signature_id = filter.signature_id;
    if (filter.signature_pattern) params.signature_pattern = filter.signature_pattern;
    if (filter.category_pattern) params.category_pattern = filter.category_pattern;
    if (filter.actions?.length) params.actions = filter.actions;
    if (filter.sensor_id) params.sensor_id = filter.sensor_id;
    if (filter.sensor_ids?.length) params.sensor_ids = filter.sensor_ids;
    if (filter.has_threat_intel_match !== undefined) params.has_threat_intel_match = filter.has_threat_intel_match;
    if (filter.has_mitre_mapping !== undefined) params.has_mitre_mapping = filter.has_mitre_mapping;
    if (filter.is_false_positive !== undefined) params.is_false_positive = filter.is_false_positive;
    if (filter.is_classified !== undefined) params.is_classified = filter.is_classified;
    if (filter.page) params.page = filter.page;
    if (filter.page_size) params.page_size = filter.page_size;
    if (filter.sort_by) params.sort_by = filter.sort_by;
    if (filter.sort_order) params.sort_order = filter.sort_order;

    return params;
  }

  /**
   * Determine severity level from numeric score
   */
  static getSeverityFromScore(score: number): SeverityLevel {
    if (score >= 4) return SeverityLevel.CRITICAL;
    if (score >= 3) return SeverityLevel.HIGH;
    if (score >= 2) return SeverityLevel.MEDIUM;
    if (score >= 1) return SeverityLevel.LOW;
    return SeverityLevel.INFORMATIONAL;
  }

  /**
   * Get severity color for UI display
   */
  static getSeverityColor(severity: SeverityLevel): string {
    return SEVERITY_CONFIG[severity]?.color || '#6B7280';
  }

  /**
   * Get known port service name
   */
  static getServiceName(port: number, protocol: string): string {
    const protoUpper = protocol.toUpperCase();
    const knownPorts: Record<string, string> = {
      '22': 'SSH',
      '23': 'Telnet',
      '25': 'SMTP',
      '53': 'DNS',
      '67': 'DHCP',
      '68': 'DHCP',
      '80': 'HTTP',
      '110': 'POP3',
      '143': 'IMAP',
      '443': 'HTTPS',
      '993': 'IMAPS',
      '995': 'POP3S',
      '1433': 'MSSQL',
      '1521': 'Oracle',
      '3306': 'MySQL',
      '3389': 'RDP',
      '5432': 'PostgreSQL',
      '5672': 'RabbitMQ',
      '6379': 'Redis',
      '8080': 'HTTP-Alt',
      '8443': 'HTTPS-Alt',
      '27017': 'MongoDB'
    };
    return knownPorts[port.toString()] || `${protoUpper}/${port}`;
  }

  /**
   * Parse EVE JSON log line
   */
  static parseEVEJson(line: string): EveEvent | null {
    try {
      const event = JSON.parse(line) as EveEvent;
      
      // Basic validation
      if (!event.timestamp || !event.event_type) {
        return null;
      }

      return event;
    } catch {
      return null;
    }
  }

  /**
   * Parse multiple EVE JSON lines
   */
  static parseEVEJsonBatch(content: string): EveEvent[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => SuricataClient.parseEVEJson(line))
      .filter((event): event is EveEvent => event !== null);
  }
}

// ============================================================================
// SINGLETON INSTANCE MANAGEMENT
// ============================================================================

let suricataClientInstance: SuricataClient | null = null;

/**
 * Initialize the Suricata client singleton
 */
export function initializeSuricataClient(config: SuricataClientConfig): SuricataClient {
  suricataClientInstance = new SuricataClient(config);
  return suricataClientInstance;
}

/**
 * Get the initialized Suricata client instance
 * @throws Error if client not initialized
 */
export function getSuricataClient(): SuricataClient {
  if (!suricataClientInstance) {
    throw new Error(
      'Suricata client not initialized. Call initializeSuricataClient() first.'
    );
  }
  return suricataClientInstance;
}

/**
 * Check if Suricata client is initialized
 */
export function isSuricataClientInitialized(): boolean {
  return suricataClientInstance !== null;
}

// Export types
export type {
  SuricataClientConfig,
  CacheEntry
};
