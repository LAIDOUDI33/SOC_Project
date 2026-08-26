/**
 * Grafana React Hooks
 * Algeria National SOC Platform 2026-2030
 * 
 * Custom hooks for consuming Grafana monitoring data:
 * - Dashboard fetching and management
 * - Alert rule monitoring
 * - Data source management
 * - System statistics
 * - Embedded dashboard rendering
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GrafanaDashboard,
  DashboardSearchResult,
  AlertRule,
  AlertIncident,
  AlertHistoryEntry,
  AlertState,
  DataSource,
  SOCOverviewStats,
  SOCKpiMetric,
  TimelineEvent,
  EmbeddedDashboardConfig,
  PanelType,
  GrafanaAPIResponse,
} from '../types/grafana.types';

// ============================================================
// Types for Hook Returns
// ============================================================

/** Standard hook return type */
interface UseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Dashboard hook return type */
interface UseDashboardsReturn extends UseDataReturn<DashboardSearchResult[]> {
  total: number;
  filters: {
    query?: string;
    tag?: string[];
    starred?: boolean;
    type?: string;
  };
  setFilters: (filters: Partial<UseDashboardsReturn['filters']>) => void;
}

/** Alerts hook return type */
interface UseAlertRulesReturn extends UseDataReturn<AlertRule[]> {
  total: number;
  summary: {
    ok: number;
    alerting: number;
    paused: number;
    critical: number;
    high: number;
    warning: number;
  };
  pauseAlert: (uid: string) => Promise<void>;
  resumeAlert: (uid: string) => Promise<void>;
  togglePause: (uid: string) => Promise<void>;
}

/** Datasources hook return type */
interface UseDataSourcesReturn extends UseDataReturn<DataSource[]> {
  healthyCount: number;
  unhealthyCount: number;
  testConnection: (id: number) => Promise<{ success: boolean; message: string }>;
}

/** Stats hook return type */
interface UseGrafanaStatsReturn extends UseDataReturn<SOCOverviewStats> {
  kpis: SOCKpiMetric[];
  timelineEvents: TimelineEvent[];
  refreshInterval: number;
  setInterval: (ms: number) => void;
}

/** Embedded dashboard hook return type */
interface UseDashboardViewReturn {
  config: EmbeddedDashboardConfig;
  embedUrl: string;
  iframeHtml: string;
  isLoading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<EmbeddedDashboardConfig>) => void;
  refresh: () => void;
}

// ============================================================
// API Helper Functions
// ============================================================

/**
 * Fetch data from API with error handling
 */
async function fetchFromAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams(params);
  const url = `/api/grafana${endpoint}${params ? `?${searchParams.toString()}` : ''}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

/**
 * Post data to API with error handling
 */
async function postToAPI<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/grafana${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

// ============================================================
// Dashboard Hooks
// ============================================================

/**
 * Hook for fetching and managing Grafana dashboards
 * @param initialLimit Initial page size
 * @returns Dashboard list with filtering capabilities
 * 
 * @example
 * ```tsx
 * const { data, loading, filters, setFilters, refetch } = useDashboards(20);
 * ```
 */
export function useDashboards(initialLimit: number = 50): UseDashboardsReturn {
  const [data, setData] = useState<DashboardSearchResult[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [filters, setFiltersState] = useState<UseDashboardsReturn['filters']>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        limit: initialLimit.toString(),
      };

      if (filters.query) params.query = filters.query;
      if (filters.tag?.length) params.tag = filters.tag.join(',');
      if (filters.starred !== undefined) params.starred = filters.starred.toString();
      if (filters.type) params.type = filters.type;

      const result = await fetchFromAPI<{
        items: DashboardSearchResult[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>('/dashboards', params);

      setData(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboards');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [initialLimit, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  return {
    data,
    loading,
    error,
    total,
    filters,
    setFilters,
    refetch: fetchData,
  };
}

/**
 * Hook for getting a single dashboard by UID
 * @param uid Dashboard UID to fetch
 * @returns Full dashboard object
 */
export function useDashboard(uid: string | null): UseDataReturn<GrafanaDashboard> {
  const [data, setData] = useState<GrafanaDashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!uid) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dashboard = await fetchFromAPI<GrafanaDashboard>(`/dashboards/${uid}`);
      setData(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================
// Alert Rule Hooks
// ============================================================

/**
 * Hook for monitoring alert rules
 * @returns Alert rules with management functions
 * 
 * @example
 * ```tsx
 * const { data, summary, pauseAlert, resumeAlert, togglePause } = useAlertRules();
 * ```
 */
export function useAlertRules(): UseAlertRulesReturn {
  const [data, setData] = useState<AlertRule[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFromAPI<{
        items: AlertRule[];
        total: number;
        summary: {
          byState: Record<string, number>;
          bySeverity: Record<string, number>;
        };
      }>('/alerts');

      setData(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds for real-time alert status
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Calculate summary from data
  const summary = useMemo(() => {
    if (!data) {
      return { ok: 0, alerting: 0, paused: 0, critical: 0, high: 0, warning: 0 };
    }

    return {
      ok: data.filter(a => a.currentState === 'ok').length,
      alerting: data.filter(a => a.currentState === 'alerting').length,
      paused: data.filter(a => a.isPaused).length,
      critical: data.filter(a => a.labels.severity === 'critical').length,
      high: data.filter(a => a.labels.severity === 'high').length,
      warning: data.filter(a => a.labels.severity === 'warning').length,
    };
  }, [data]);

  /**
   * Pause an alert rule
   */
  const pauseAlert = useCallback(async (uid: string): Promise<void> => {
    try {
      await postToAPI('/alerts', { action: 'pause', uid, paused: true });
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to pause alert:', err);
      throw err;
    }
  }, [fetchData]);

  /**
   * Resume a paused alert rule
   */
  const resumeAlert = useCallback(async (uid: string): Promise<void> => {
    try {
      await postToAPI('/alerts', { action: 'pause', uid, paused: false });
      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to resume alert:', err);
      throw err;
    }
  }, [fetchData]);

  /**
   * Toggle pause state of an alert rule
   */
  const togglePause = useCallback(async (uid: string): Promise<void> => {
    const alert = data?.find(a => a.uid === uid);
    if (alert?.isPaused) {
      await resumeAlert(uid);
    } else {
      await pauseAlert(uid);
    }
  }, [data, pauseAlert, resumeAlert]);

  return {
    data,
    loading,
    error,
    total,
    summary,
    pauseAlert,
    resumeAlert,
    togglePause,
    refetch: fetchData,
  };
}

/**
 * Hook for getting active alert incidents
 * @returns Active incidents list
 */
export function useAlertIncidents(state?: AlertState): UseDataReturn<AlertIncident[]> {
  const [data, setData] = useState<AlertIncident[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { action: 'incidents' };
      if (state) params.state = state;

      const result = await fetchFromAPI<{ items: AlertIncident[]; total: number }>('/alerts', params);
      setData(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    fetchData();

    // Auto-refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for alert history
 * @param limit Number of history entries to fetch
 * @returns Alert history entries
 */
export function useAlertHistory(limit: number = 50): UseDataReturn<AlertHistoryEntry[]> {
  const [data, setData] = useState<AlertHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFromAPI<{ items: AlertHistoryEntry[]; total: number }>('/alerts', {
        action: 'history',
        limit: limit.toString(),
      });
      setData(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert history');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================
// Data Source Hooks
// ============================================================

/**
 * Hook for managing datasources
 * @returns Datasources with connection testing
 * 
 * @example
 * ```tsx
 * const { data, healthyCount, testConnection } = useDataSources();
 * ```
 */
export function useDataSources(): UseDataSourcesReturn {
  const [data, setData] = useState<DataSource[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFromAPI<{
        items: DataSource[];
        total: number;
        summary: {
          healthy: number;
          unhealthy: number;
        };
      }>('/datasources');

      setData(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch datasources');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const healthyCount = useMemo(
    () => data?.filter(ds => ds.apiHealthStatus === 'OK').length || 0,
    [data]
  );

  const unhealthyCount = useMemo(
    () => data?.filter(ds => ds.apiHealthStatus !== 'OK').length || 0,
    [data]
  );

  /**
   * Test connection to a datasource
   */
  const testConnection = useCallback(async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await postToAPI<{ success: boolean; message: string; datasourceName: string }>(
        '/datasources',
        { action: 'test', id }
      );
      
      // Refresh datasource list after test
      await fetchData();
      
      return {
        success: result.success,
        message: result.message || (result.success ? 'Connection successful' : 'Connection failed'),
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      };
    }
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    healthyCount,
    unhealthyCount,
    testConnection,
    refetch: fetchData,
  };
}

// ============================================================
// Statistics & Overview Hooks
// ============================================================

/**
 * Hook for comprehensive SOC statistics from Grafana
 * @returns System overview stats with KPIs and timeline
 * 
 * @example
 * ```tsx
 * const { data, kpis, timelineEvents, refreshInterval, setInterval } = useGrafanaStats();
 * ```
 */
export function useGrafanaStats(initialRefreshInterval: number = 60000): UseGrafanaStatsReturn {
  const [data, setData] = useState<SOCOverviewStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshIntervalState] = useState<number>(initialRefreshInterval);

  // Mock KPIs that would come from actual dashboards
  const mockKpis: SOCKpiMetric[] = [
    {
      id: 'events-today',
      name: 'Security Events Today',
      description: 'Total security events detected in the last 24 hours',
      currentValue: 45892,
      previousValue: 42341,
      unit: 'events',
      trend: 'up',
      trendPercent: 8.4,
      status: 'warning',
      sourceSystem: 'wazuh',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'active-incidents',
      name: 'Active Incidents',
      description: 'Currently open incident cases in TheHive',
      currentValue: 23,
      previousValue: 18,
      unit: 'cases',
      trend: 'up',
      trendPercent: 27.8,
      status: 'warning',
      sourceSystem: 'thehive',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'critical-alerts',
      name: 'Critical Alerts',
      description: 'Currently firing critical severity alerts',
      currentValue: 3,
      previousValue: 1,
      unit: 'alerts',
      trend: 'up',
      trendPercent: 200,
      status: 'critical',
      sourceSystem: 'grafana',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'ioc-count',
      name: 'Threat IOCs',
      description: 'Indicators of compromise in MISP database',
      currentValue: 128456,
      previousValue: 125890,
      unit: 'IOCs',
      trend: 'up',
      trendPercent: 2.0,
      status: 'good',
      sourceSystem: 'misp',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'endpoints-monitored',
      name: 'Monitored Endpoints',
      description: 'Wazuh agents reporting in',
      currentValue: 1847,
      previousValue: 1839,
      unit: 'agents',
      trend: 'up',
      trendPercent: 0.4,
      status: 'good',
      sourceSystem: 'wazuh',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'network-sensors',
      name: 'Network Sensors Online',
      description: 'Suricata IDS sensors active',
      currentValue: 24,
      previousValue: 24,
      unit: 'sensors',
      trend: 'stable',
      trendPercent: 0,
      status: 'good',
      sourceSystem: 'suricata',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'health-score',
      name: 'SOC Health Score',
      description: 'Overall system health assessment',
      currentValue: 87,
      previousValue: 91,
      unit: '%',
      trend: 'down',
      trendPercent: -4.4,
      status: 'warning',
      sourceSystem: 'combined',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'avg-response-time',
      name: 'Avg Response Time',
      description: 'Average time to first response on incidents',
      currentValue: 23,
      previousValue: 28,
      unit: 'min',
      trend: 'down',
      trendPercent: -17.9,
      status: 'good',
      sourceSystem: 'thehive',
      lastUpdated: new Date().toISOString(),
    },
  ];

  // Mock timeline events
  const mockTimelineEvents: TimelineEvent[] = [
    {
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      type: 'alert',
      title: 'Critical Wazuh Alert Detected',
      description: 'Multiple critical level alerts from endpoint SRV-PROD-12',
      severity: 'critical',
      source: 'wazuh',
      sourceId: 'alert-48291',
      url: '/wazuh/alert/48291',
    },
    {
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      type: 'incident',
      title: 'New Incident Case Created',
      description: 'Case #2026-02-14-001 created for phishing campaign analysis',
      severity: 'high',
      source: 'thehive',
      sourceId: 'case-2026-02-14-001',
      url: '/thehive/case/2026-02-14-001',
    },
    {
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: 'threat',
      title: 'MISP IOC Match Found',
      description: 'Matched malicious IP 185.220.101.34 in network logs',
      severity: 'critical',
      source: 'misp',
      sourceId: 'event-89234',
      url: '/misp/event/89234',
    },
    {
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      type: 'alert',
      title: 'Suricata Blocked Intrusion Attempt',
      description: 'SQL injection attempt blocked at perimeter firewall',
      severity: 'high',
      source: 'suricata',
      sourceId: 'eve-1234567',
      url: '/suricata/alert/1234567',
    },
    {
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      type: 'system',
      title: 'Automated Report Generated',
      description: 'Daily security posture report generated successfully',
      severity: 'info',
      source: 'grafana',
      sourceId: 'report-daily-2026-02-14',
    },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, this would aggregate data from multiple endpoints
      // For now, we'll simulate with combined mock data
      const [alertsResult, dashboardsResult] = await Promise.all([
        fetchFromAPI<{ currentlyAlerting: number; activeRules: number; pausedRules: number }>(
          '/alerts?action=summary'
        ).catch(() => null),
        fetchFromAPI<{ total: number }>(
          '/dashboards?limit=1'
        ).catch(() => null),
      ]);

      const stats: SOCOverviewStats = {
        eventsToday: mockKpis[0].currentValue as number,
        eventsChangePercent: mockKpis[0].trendPercent as number,
        activeIncidents: mockKpis[1].currentValue as number,
        criticalAlerts: alertsResult?.currentlyAlerting ?? mockKpis[2].currentValue as number,
        iocCount: mockKpis[3].currentValue as number,
        monitoredEndpoints: mockKpis[4].currentValue as number,
        onlineSensors: mockKpis[5].currentValue as number,
        healthScore: mockKpis[6].currentValue as number,
        avgResponseTime: mockKpis[7].currentValue as number,
        uptime: 99.97,
        dataProcessed: 245.8,
        alertsBySeverity: {
          critical: 3,
          high: 12,
          warning: 47,
          info: 156,
        },
        eventsByCategory: {
          malware: 12453,
          intrusion: 3892,
          policy: 18934,
          anomaly: 10513,
        },
        topThreatActors: [
          { name: 'APT29', count: 234 },
          { name: 'Lazarus Group', count: 156 },
          { name: 'FIN7', count: 98 },
          { name: 'Unknown', count: 1245 },
        ],
        recentActivity: mockTimelineEvents,
      };

      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up auto-refresh based on configured interval
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const setInterval = useCallback((ms: number) => {
    setRefreshIntervalState(ms);
  }, []);

  return {
    data,
    loading,
    error,
    kpis: mockKpis,
    timelineEvents: mockTimelineEvents,
    refreshInterval,
    setInterval,
    refetch: fetchData,
  };
}

// ============================================================
// Embedded Dashboard Hook
// ============================================================

/**
 * Hook for rendering embedded Grafana dashboards
 * @param config Initial embedding configuration
 * @returns Embedding utilities
 * 
 * @example
 * ```tsx
 * const { embedUrl, iframeHtml, updateConfig } = useDashboardView({
 *   dashboardUid: 'soc-overview',
 *   theme: 'dark',
 * });
 * 
 * <div dangerouslySetInnerHTML={{ __html: iframeHtml }} />
 * ```
 */
export function useDashboardView(config: EmbeddedDashboardConfig): UseDashboardViewReturn {
  const [currentConfig, setCurrentConfig] = useState<EmbeddedDashboardConfig>(config);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get Grafana base URL from environment or default
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3000';

  /**
   * Generate embedded URL based on configuration
   */
  const generateEmbedUrl = useCallback((cfg: EmbeddedDashboardConfig): string => {
    const params = new URLSearchParams();

    // Theme
    if (cfg.theme && cfg.theme !== 'current') {
      params.set('theme', cfg.theme);
    }

    // Panel selection
    if (cfg.panelId) {
      params.set('viewPanel', cfg.panelId.toString());
    }

    // Time range
    if (cfg.initialTime) {
      params.set('from', cfg.initialTime.from);
      params.set('to', cfg.initialTime.to);
    }

    // Variables
    if (cfg.initialVariables) {
      Object.entries(cfg.initialVariables).forEach(([key, value]) => {
        params.set(`var-${key}`, value);
      });
    }

    // Display options
    if (cfg.autoRefresh) {
      params.set('refresh', cfg.autoRefresh);
    }

    // Kiosk mode (hide unnecessary UI)
    if (!cfg.showToolbar) {
      params.set('kiosk', 'tv');
    }
    if (cfg.showTimePicker !== undefined) {
      params.set('showTimePicker', String(cfg.showTimePicker));
    }
    if (cfg.showHeader !== undefined) {
      params.set('showHeader', String(cfg.showHeader));
    }

    const queryString = params.toString();
    return `${grafanaUrl}/d/${cfg.dashboardUid}${queryString ? `?${queryString}` : ''}`;
  }, [grafanaUrl]);

  /**
   * Generate iframe HTML
   */
  const generateIframeHtml = useCallback((url: string, width?: number, height?: number): string => {
    const style = [
      'border: none',
      'border-radius: 8px',
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '700px',
      'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)',
    ].join('; ');

    return `<iframe src="${url}" style="${style}" allow="fullscreen" loading="lazy"></iframe>`;
  }, []);

  const embedUrl = useMemo(() => generateEmbedUrl(currentConfig), [currentConfig, generateEmbedUrl]);
  
  const iframeHtml = useMemo(
    () => generateIframeHtml(embedUrl, currentConfig.width, currentConfig.height),
    [embedUrl, currentConfig.width, currentConfig.height, generateIframeHtml]
  );

  /**
   * Update embedding configuration
   */
  const updateConfig = useCallback((updates: Partial<EmbeddedDashboardConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
    setIsLoading(true); // Trigger reload animation
    
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  /**
   * Force refresh of embedded content
   */
  const refresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Initialize
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate iframe load check
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentConfig.dashboardUid]);

  return {
    config: currentConfig,
    embedUrl,
    iframeHtml,
    isLoading,
    error,
    updateConfig,
    refresh,
  };
}

// ============================================================
// Combined Monitoring Hook
// ============================================================

/**
 * Comprehensive hook combining all Grafana monitoring features
 * Ideal for main SOC dashboard view
 * @returns Complete monitoring state
 * 
 * @example
 * ```tsx
 * const { stats, dashboards, alerts, datasources, isReady, refreshAll } = useGrafanaDashboard();
 * 
 * if (!isReady) return <LoadingSpinner />;
 * 
 * return (
 *   <Dashboard>
 *     <KPICards kpis={stats.kpis} />
 *     <AlertSummary {...alerts} />
 *     <DashboardGrid dashboards={dashboards} />
 *   </Dashboard>
 * );
 * ```
 */
export function useGrafanaDashboard() {
  const stats = useGrafanaStats();
  const dashboards = useDashboards(10);
  const alerts = useAlertRules();
  const datasources = useDataSources();
  const incidents = useAlertIncidents('alerting');

  /** Check if all data is loaded */
  const isReady = useMemo(
    () => !stats.loading && !dashboards.loading && !alerts.loading && !datasources.loading,
    [stats.loading, dashboards.loading, alerts.loading, datasources.loading]
  );

  /** Has any errors */
  const hasErrors = useMemo(
    () => !!(stats.error || dashboards.error || alerts.error || datasources.error),
    [stats.error, dashboards.error, alerts.error, datasources.error]
  );

  /** Refresh all data sources */
  const refreshAll = useCallback(() => {
    stats.refetch();
    dashboards.refetch();
    alerts.refetch();
    datasources.refetch();
    incidents.refetch();
  }, [stats, dashboards, alerts, datasources, incidents]);

  /** Overall system health status */
  const systemStatus = useMemo<'healthy' | 'degraded' | 'critical'>(() => {
    if (alerts.summary.alerting > 5 || alerts.summary.critical > 2) return 'critical';
    if (alerts.summary.alerting > 0 || datasources.unhealthyCount > 0) return 'degraded';
    return 'healthy';
  }, [alerts.summary, datasources.unhealthyCount]);

  return {
    // Individual hooks
    stats,
    dashboards,
    alerts,
    datasources,
    incidents,

    // Computed values
    isReady,
    hasErrors,
    systemStatus,
    refreshAll,
  };
}
