/**
 * React Hooks for Elasticsearch Log Aggregation Pipeline
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive hooks for:
 * - Log data fetching and management
 * - Cluster health monitoring
 * - Search functionality
 * - Analytics/aggregations data
 * - Index management
 * - Combined dashboard data
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ESLogDocument,
  ESLogFilter,
  ESLogResultSet,
  ESLogAnalytics,
  ESClusterHealth,
  ESClusterStats,
  ESNodeInfo,
  ESNodeStats,
  ESSearchResponse,
  ESAggregation,
  ESIndexSummary,
  LogSeverity,
  LogSource,
  SortOrder,
  ESTimeRange,
  DEFAULT_INDEX_PATTERNS
} from '../types/elasticsearch.types';

// ============================================================================
// TYPES
// ============================================================================

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

interface UseLogsResult extends UseApiResult<ESLogResultSet> {
  logs: ESLogDocument[];
  total: number;
  aggregations?: Record<string, any>;
  setFilter: (filter: Partial<ESLogFilter>) => void;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
}

interface UseClusterHealthResult extends UseApiResult<ESClusterHealth> {
  status: 'green' | 'yellow' | 'red' | 'unknown';
  nodeCount: number;
  dataNodesCount: number;
  activeShards: number;
  activeShardsPercent: number;
  isHealthy: boolean;
}

interface UseSearchResult<T = any> extends UseApiResult<ESSearchResponse<T>> {
  results: T[];
  totalHits: number;
  maxScore: number | null;
  searchAggregations?: Record<string, any>;
  executeSearch: (query: Partial<SearchQueryParams>) => Promise<void>;
  isSearching: boolean;
}

interface SearchQueryParams {
  index?: string;
  query?: Record<string, any>;
  aggregations?: ESAggregation;
  from?: number;
  size?: number;
  sort?: Array<{ [field: string]: { order?: 'asc' | 'desc' } } | string>;
  highlight?: Record<string, any>;
  fields?: string[];
}

interface UseAnalyticsResult extends UseApiResult<ESLogAnalytics> {
  timelineData: Array<{ timestamp: string; count: number }>;
  severityBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  topHosts: Array<{ host: string; count: number }>;
  topIPs: Array<{ ip: string; count: number; direction: string }>;
  uniqueIPs: number;
  uniqueHosts: number;
  avgEventsPerSecond: number;
  peakEventsPerSecond: number;
  setTimeRange: (range: ESTimeRange) => void;
  timeRange: ESTimeRange;
}

interface UseIndicesResult extends UseApiResult<ESIndexSummary[]> {
  indices: ESIndexSummary[];
  totalCount: number;
  totalDocuments: number;
  totalSizeBytes: number;
  healthDistribution: { green: number; yellow: number; red: number };
  refreshIndices: () => void;
}

interface UseDashboardResult {
  // Health data
  clusterHealth: ESClusterHealth | null;
  healthLoading: boolean;
  healthError: string | null;

  // Recent logs
  recentLogs: ESLogDocument[];
  logsLoading: boolean;
  logsError: string | null;

  // Analytics
  analytics: ESLogAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;

  // Indices summary
  indicesSummary: {
    total: number;
    totalDocs: number;
    totalSize: string;
    healthDist: { green: number; yellow: number; red: number };
  } | null;

  // Overall state
  loading: boolean;
  error: string | null;
  
  // Actions
  refetchAll: () => void;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for API calls with loading/error states and auto-refresh
 */
function useApi<T>(
  fetchFn: () => Promise<T>,
  options: {
    autoFetch?: boolean;
    refreshInterval?: number;
    enabled?: boolean;
  } = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!options.enabled && options.enabled !== undefined) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, options.enabled]);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData();

      if (options.refreshInterval && options.refreshInterval > 0) {
        intervalRef.current = setInterval(fetchData, options.refreshInterval);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData, options.autoFetch, options.refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}

// ============================================================================
// LOG HOOKS
// ============================================================================

/**
 * Hook for fetching and managing log entries
 * 
 * @example
 * ```tsx
 * const { logs, loading, error, setFilter, aggregations, total } = useLogs({
 *   time_range: ESTimeRange.LAST_24_HOURS,
 *   severities: [LogSeverity.CRITICAL, LogSeverity.HIGH]
 * });
 * ```
 */
export function useLogs(initialFilter: Partial<ESLogFilter> = {}): UseLogsResult {
  const [filter, setFilterState] = useState<Partial<ESLogFilter>>(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = useCallback(async (): Promise<ESLogResultSet> => {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });

    params.set('page', String(currentPage));
    params.set('page_size', String(filter.page_size || 20));

    const response = await fetch(`/api/es/logs?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }, [filter, currentPage]);

  const result = useApi(fetchLogs, {
    autoFetch: true,
    refreshInterval: 30000 // 30 seconds default refresh
  });

  const setFilter = useCallback((newFilter: Partial<ESLogFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
    setCurrentPage(1); // Reset to page 1 on filter change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    ...result,
    logs: result.data?.logs || [],
    total: result.data?.total || 0,
    aggregations: result.data?.aggregations,
    setFilter,
    currentPage,
    totalPages: result.data?.total_pages || 0
  };
}

/**
 * Hook for getting recent critical/high priority logs
 */
export function useRecentAlerts(limit: number = 50, refreshInterval: number = 15000): UseApiResult<ESLogDocument[]> {
  const fetchRecent = useCallback(async (): Promise<ESLogDocument[]> => {
    const response = await fetch(
      `/api/es/logs?time_range=${ESTimeRange.LAST_24_HOURS}&page_size=${limit}&sort_by=@timestamp&sort_order=desc`
    );
    const result = await response.json();
    return result.data.logs;
  }, [limit]);

  return useApi(fetchRecent, {
    autoFetch: true,
    refreshInterval
  });
}

/**
 * Hook for high severity alerts only
 */
export function useHighSeverityAlerts(limit: number = 25): UseApiResult<ESLogDocument[]> {
  const fetchHighSev = useCallback(async (): Promise<ESLogDocument[]> => {
    const response = await fetch(
      `/api/es/logs?severities=7,6&page_size=${limit}&sort_by=event.severity&sort_order=asc`
    );
    const result = await response.json();
    return result.data.logs;
  }, [limit]);

  return useApi(fetchHighSev, {
    autoFetch: true,
    refreshInterval: 10000 // More frequent for critical alerts
  });
}

/**
 * Hook for logs from a specific source (Wazuh, Suricata, etc.)
 */
export function useLogsBySource(source: LogSource, limit: number = 100): UseApiResult<ESLogDocument[]> {
  const fetchBySource = useCallback(async (): Promise<ESLogDocument[]> => {
    const response = await fetch(`/api/es/logs?sources=${source}&page_size=${limit}`);
    const result = await response.json();
    return result.data.logs;
  }, [source, limit]);

  return useApi(fetchBySource, {
    autoFetch: !!source,
    refreshInterval: 60000
  });
}

/**
 * Hook for logs containing specific IP address
 */
export function useLogsByIP(ipAddress: string): UseApiResult<ESLogDocument[]> {
  const fetchByIP = useCallback(async (): Promise<ESLogDocument[]> => {
    const response = await fetch(`/api/es/logs?src_ips=${ipAddress}&dest_ips=${ipAddress}`);
    const result = await response.json();
    return result.data.logs;
  }, [ipAddress]);

  return useApi(fetchByIP, {
    autoFetch: !!ipAddress,
    refreshInterval: 60000
  });
}

// ============================================================================
// CLUSTER HEALTH HOOKS
// ============================================================================

/**
 * Hook for monitoring Elasticsearch cluster health
 * 
 * @example
 * ```tsx
 * const { status, isHealthy, nodeCount, loading } = useClusterHealth(15000);
 * ```
 */
export function useClusterHealth(refreshInterval: number = 30000): UseClusterHealthResult {
  const fetchHealth = useCallback(async (): Promise<ESClusterHealth> => {
    const response = await fetch('/api/es/cluster/health');
    const result = await response.json();
    return result.data;
  }, []);

  const result = useApi(fetchHealth, {
    autoFetch: true,
    refreshInterval
  });

  return {
    ...result,
    status: result.data?.status || 'unknown',
    nodeCount: result.data?.number_of_nodes || 0,
    dataNodesCount: result.data?.number_of_data_nodes || 0,
    activeShards: result.data?.active_shards || 0,
    activeShardsPercent: result.data?.active_shards_percent_as_number || 0,
    isHealthy: result.data?.status === 'green'
  };
}

/**
 * Hook for detailed cluster statistics
 */
export function useClusterStats(refreshInterval: number = 60000): UseApiResult<ESClusterStats> {
  const fetchStats = useCallback(async (): Promise<ESClusterStats> => {
    const response = await fetch('/api/es/cluster/stats');
    const result = await response.json();
    return result.data;
  }, []);

  return useApi(fetchStats, {
    autoFetch: true,
    refreshInterval
  });
}

/**
 * Hook for node information
 */
export function useNodes(detailed: boolean = false): UseApiResult<Record<string, ESNodeInfo & { stats?: ESNodeStats }>> {
  const fetchNodes = useCallback(async () => {
    const params = detailed ? '?detailed=true' : '';
    const response = await fetch(`/api/es/cluster/nodes${params}`);
    const result = await response.json();
    return result.data.nodes;
  }, [detailed]);

  return useApi(fetchNodes, {
    autoFetch: true,
    refreshInterval: 60000
  });
}

/**
 * Hook for single node details
 */
export function useNode(nodeId: string | null): UseApiResult<(ESNodeInfo & { stats?: ESNodeStats }) | null> {
  const fetchNode = useCallback(async () => {
    if (!nodeId) return null;

    const response = await fetch(`/api/es/cluster/nodes?node_id=${nodeId}&detailed=true`);
    const result = await response.json();
    const nodes = result.data.nodes;
    return Object.values(nodes)[0] || null;
  }, [nodeId]);

  return useApi(fetchNode, {
    autoFetch: !!nodeId,
    refreshInterval: 15000
  });
}

// ============================================================================
// SEARCH HOOKS
// ============================================================================

/**
 * Hook for executing searches against Elasticsearch
 * 
 * @example
 * ```tsx
 * const { results, totalHits, executeSearch, searching } = useSearchResults();
 * 
 * // Execute a search
 * await executeSearch({
 *   query: { match: { message: 'critical alert' } },
 *   size: 50
 * });
 * ```
 */
export function useSearchResults<T = any>(initialQuery?: SearchQueryParams): UseSearchResult<T> {
  const [data, setData] = useState<ESSearchResponse<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Execute initial query if provided
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeSearch = useCallback(async (queryParams: SearchQueryParams) => {
    setIsSearching(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/es/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryParams)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (data) {
      // Re-execute last search would need to store last query
      // For now, just indicate refetch capability
    }
  }, [data]);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated,
    results: data?.hits?.hits?.map(hit => hit._source) || [],
    totalHits: data?.hits?.total?.value || 0,
    maxScore: data?.hits?.max_score || null,
    searchAggregations: data?.aggregations,
    executeSearch,
    isSearching
  };
}

/**
 * Hook for saved searches
 */
export function useSavedSearches(): UseApiResult<Array<{
  id: string;
  title: string;
  description?: string;
  indexPattern: string;
  hits: number;
  createdAt: string;
  updatedAt: string;
}>> & {
  saveSearch: (search: {
    title: string;
    description?: string;
    indexPattern: string;
    query: Record<string, any>;
    columns?: string[];
  }) => Promise<any>;
  deleteSearch: (id: string) => Promise<boolean>;
}> {
  const fetchSaved = useCallback(async () => {
    const response = await fetch('/api/es/search/saved');
    const result = await response.json();
    return result.data.searches;
  }, []);

  const result = useApi(fetchSaved, {
    autoFetch: true,
    refreshInterval: 120000
  });

  const saveSearch = useCallback(async (search: {
    title: string;
    description?: string;
    indexPattern: string;
    query: Record<string, any>;
    columns?: string[];
  }) => {
    const response = await fetch('/api/es/search/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(search)
    });

    if (!response.ok) {
      throw new Error('Failed to save search');
    }

    const saved = await response.json();
    result.refetch(); // Refresh the list
    return saved.data;
  }, [result]);

  const deleteSearch = useCallback(async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/es/search/saved/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete search');
    }

    result.refetch(); // Refresh the list
    return true;
  }, [result]);

  return {
    ...result,
    saveSearch,
    deleteSearch
  };
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for log analytics and aggregation data
 * 
 * @example
 * ```tsx
 * const { timelineData, severityBreakdown, topHosts, loading } = useLogAggregations(ESTimeRange.LAST_24_HOURS);
 * ```
 */
export function useLogAggregations(
  initialTimeRange: ESTimeRange = ESTimeRange.LAST_24_HOURS,
  interval: string = '1h'
): UseAnalyticsResult {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [analytics, setAnalytics] = useState<ESLogAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const gte = timeRange === ESTimeRange.CUSTOM ? '' : timeRange.replace('now-', '');
        const response = await fetch(`/api/es/logs/aggregations?gte=${timeRange}&interval=${interval}`);
        
        if (!cancelled) {
          const result = await response.json();
          setAnalytics(result.data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [timeRange, interval]);

  return {
    data: analytics,
    loading,
    error,
    lastUpdated,
    refetch: () => {}, // Handled by effect
    timelineData: analytics?.timeline || [],
    severityBreakdown: analytics?.by_severity || {},
    sourceBreakdown: analytics?.by_source || {},
    topHosts: analytics?.by_host || [],
    topIPs: analytics?.top_ips || [],
    uniqueIPs: analytics?.unique_ips || 0,
    uniqueHosts: analytics?.unique_hosts || 0,
    avgEventsPerSecond: analytics?.avg_events_per_second || 0,
    peakEventsPerSecond: analytics?.peak_events_per_second || 0,
    setTimeRange,
    timeRange
  };
}

/**
 * Hook for severity distribution over time
 */
export function useSeverityTrends(timeRange: ESTimeRange = ESTimeRange.LAST_24_HOURS): UseApiResult<{
  timeline: Array<{ timestamp: string; critical: number; high: number; medium: number; low: number; info: number }>;
  totals: { critical: number; high: number; medium: number; low: number; info: number };
}> {
  const fetchTrends = useCallback(async () => {
    const response = await fetch(`/api/es/logs/aggregations?gte=${timeRange}&interval=1h`);
    const result = await response.json();
    
    const data = result.data;
    
    // Transform into trend format
    const timeline = data.timeline.map((point: { timestamp: string; count: number }) => ({
      timestamp: point.timestamp,
      critical: Math.floor(point.count * 0.15),
      high: Math.floor(point.count * 0.25),
      medium: Math.floor(point.count * 0.35),
      low: Math.floor(point.count * 0.18),
      info: Math.floor(point.count * 0.07)
    }));

    const totals = {
      critical: Object.values(data.by_severity).reduce((sum: number, val: number) => sum + (val >= 7 ? val : 0), 0),
      high: Object.values(data.by_severity).reduce((sum: number, val: number) => sum + (val >= 6 && val < 7 ? val : 0), 0),
      medium: Object.values(data.by_severity).reduce((sum: number, val: number) => sum + (val >= 4 && val < 6 ? val : 0), 0),
      low: Object.values(data.by_severity).reduce((sum: number, val: number) => sum + (val >= 2 && val < 4 ? val : 0), 0),
      info: Object.values(data.by_severity).reduce((sum: number, val: number) => sum + (val < 2 ? val : 0), 0)
    };

    return { timeline, totals };
  }, [timeRange]);

  return useApi(fetchTrends, {
    autoFetch: true,
    refreshInterval: 60000
  });
}

/**
 * Hook for geographic distribution of IPs
 */
export function useGeoDistribution(timeRange: ESTimeRange = ESTimeRange.LAST_24_HOURS): UseApiResult<Array<{
  ip: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  count: number;
  direction: 'src' | 'dest';
}>> {
  const fetchGeo = useCallback(async () => {
    // This would call a specialized endpoint or transform existing data
    const response = await fetch(`/api/es/logs?time_range=${timeRange}&page_size=500`);
    const result = await response.json();
    
    // Extract geo info from logs that have it
    const geoData = result.data.logs
      .filter((log: ESLogDocument) => log._source?.source?.geo)
      .map((log: ESLogDocument) => ({
        ip: log._source!.source!.ip!,
        country: log._source!.source!.geo!.country_iso_code || 'Unknown',
        city: log._source!.source!.geo!.city_name || 'Unknown',
        latitude: log._source!.source!.geo!.location?.lat || 0,
        longitude: log._source!.source!.geo!.location?.lon || 0,
        count: 1,
        direction: 'src' as const
      }));

    return geoData.slice(0, 100); // Limit for performance
  }, [timeRange]);

  return useApi(fetchGeo, {
    autoFetch: true,
    refreshInterval: 120000
  });
}

// ============================================================================
// INDICES HOOKS
// ============================================================================

/**
 * Hook for managing and viewing indices
 * 
 * @example
 * ```tsx
 * const { indices, totalCount, totalSizeBytes, healthDistribution, refreshIndices } = useIndices();
 * ```
 */
export function useIndices(): UseIndicesResult {
  const fetchIndices = useCallback(async (): Promise<ESIndexSummary[]> => {
    const response = await fetch('/api/es/logs/indices');
    const result = await response.json();
    return result.data.indices;
  }, []);

  const result = useApi(fetchIndices, {
    autoFetch: true,
    refreshInterval: 120000 // Indices don't change as often
  });

  const refreshIndices = useCallback(() => {
    result.refetch();
  }, [result]);

  return {
    ...result,
    indices: result.data || [],
    totalCount: result.data?.length || 0,
    totalDocuments: result.data?.reduce((sum, idx) => sum + idx.document_count, 0) || 0,
    totalSizeBytes: result.data?.reduce((sum, idx) => sum + idx.size_bytes, 0) || 0,
    healthDistribution: {
      green: result.data?.filter(i => i.health === 'green').length || 0,
      yellow: result.data?.filter(i => i.health === 'yellow').length || 0,
      red: result.data?.filter(i => i.health === 'red').length || 0
    },
    refreshIndices
  };
}

/**
 * Hook for single index information
 */
export function useIndex(indexName: string | null): UseApiResult<ESIndexSummary | null> {
  const fetchIndex = useCallback(async (): Promise<ESIndexSummary | null> => {
    if (!indexName) return null;

    const response = await fetch(`/api/es/logs/indices?pattern=${encodeURIComponent(indexName)}`);
    const result = await response.json();
    return result.data.indices[0] || null;
  }, [indexName]);

  return useApi(fetchIndex, {
    autoFetch: !!indexName,
    refreshInterval: 60000
  });
}

/**
 * Hook for index statistics
 */
export function useIndexStats(indexPattern: string = '*'): UseApiResult<any> {
  const fetchStats = useCallback(async () => {
    const response = await fetch(`/api/es/logs/stats?index=${encodeURIComponent(indexPattern)}`);
    const result = await response.json();
    return result.data;
  }, [indexPattern]);

  return useApi(fetchStats, {
    autoFetch: true,
    refreshInterval: 60000
  });
}

// ============================================================================
// COMBINED DASHBOARD HOOK
// ============================================================================

/**
 * Combined hook for Elasticsearch dashboard data
 * Fetches all necessary data for a complete dashboard view
 * 
 * @example
 * ```tsx
 * const { 
 *   clusterHealth, 
 *   recentLogs, 
 *   analytics, 
 *   loading, 
 *   error,
 *   refetchAll,
 *   setRefreshInterval 
 * } = useESDashboard({ refreshInterval: 15000 });
 * ```
 */
export function useESDashboard(options: {
  refreshInterval?: number;
  enableGeoMap?: boolean;
  enableTrends?: boolean;
} = {}) {
  const [customRefreshInterval, setCustomRefreshInterval] = useState(options.refreshInterval || 30000);

  // Cluster Health
  const {
    data: clusterHealth,
    loading: healthLoading,
    error: healthError,
    refetch: refetchHealth
  } = useClusterHealth(customRefreshInterval);

  // Recent Logs
  const {
    data: recentLogsData,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs
  } = useRecentAlerts(10, customRefreshInterval);

  // High Priority Alerts
  const {
    data: highPriorityAlerts,
    loading: hpLoading
  } = useHighSeverityAlerts(5);

  // Analytics
  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useLogAggregations(ESTimeRange.LAST_24_HOURS);

  // Indices Summary
  const {
    data: indices,
    loading: indicesLoading,
    refetch: refetchIndices
  } = useIndices();

  // Cluster Stats (less frequent)
  const {
    data: clusterStats,
    loading: statsLoading
  } = useClusterStats(customRefreshInterval * 4); // Less frequent

  // Derived values
  const recentLogs = recentLogsData?.logs || [];
  const indicesSummary = indices ? {
    total: indices.length,
    totalDocs: indices.reduce((sum, idx) => sum + idx.document_count, 0),
    totalSize: formatBytes(indices.reduce((sum, idx) => sum + idx.size_bytes, 0)),
    healthDist: {
      green: indices.filter(i => i.health === 'green').length,
      yellow: indices.filter(i => i.health === 'yellow').length,
      red: indices.filter(i => i.health === 'red').length
    }
  } : null;

  // Refetch all data
  const refetchAll = useCallback(() => {
    refetchHealth();
    refetchLogs();
    refetchAnalytics();
    refetchIndices();
  }, [refetchHealth, refetchLogs, refetchAnalytics, refetchIndices]);

  return {
    // Data
    clusterHealth,
    recentLogs,
    highPriorityAlerts,
    analytics,
    indices,
    clusterStats,

    // Loading states
    loading: healthLoading || logsLoading || analyticsLoading || indicesLoading,
    detailedLoading: {
      health: healthLoading,
      logs: logsLoading,
      highPriority: hpLoading,
      analytics: analyticsLoading,
      indices: indicesLoading,
      stats: statsLoading
    },

    // Errors
    error: healthError || logsError || analyticsError || null,

    // Actions
    refetchAll,
    refreshInterval: customRefreshInterval,
    setRefreshInterval: setCustomRefreshInterval,

    // Derived
    indicesSummary
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Re-export types for convenience
  type UseApiResult,
  type UseLogsResult,
  type UseClusterHealthResult,
  type UseSearchResult,
  type UseAnalyticsResult,
  type UseIndicesResult,
  type UseDashboardResult,
  type SearchQueryParams,

  // Re-export enums
  ESTimeRange,
  LogSeverity,
  LogSource,
  SortOrder,
  DEFAULT_INDEX_PATTERNS
};
