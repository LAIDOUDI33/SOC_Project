/**
 * React Hooks for Logging Module
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides hooks for:
 * - useLogs() - Fetch and filter logs
 * - useAuditTrail() - Audit entry retrieval
 * - useLogSources() - Source management
 * - useLogStats() - Statistics and charts data
 * - useRetentionPolicies() - Policy management
 * - useLoggingDashboard() - Combined dashboard hook
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LogLevel,
  LogSource,
  LogEntry,
  AuditEntry,
  AuditAction,
  AuditActor,
  ActorType,
  AuditResource,
  ResourceType,
  AuditOutcome,
  RetentionPolicy,
  RetentionAction,
  StorageUsage,
  ShipperStatus,
  ShippingConfiguration,
  LogSearchFilters,
  PaginationParams,
  LogSearchResult,
  LogAggregations,
  LogStatistics,
  AuditSearchFilters as AuditFilters,
  AuditStatistics,
  ComplianceReport,
  BacklogInfo,
  Environment
} from '../types/logging.types';

// ============================================================================
// TYPES
// ============================================================================

/** Common hook return type with loading/error states */
interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Paginated result type */
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================

const API_BASE = '/api/logging';

/** Generic fetch wrapper with error handling */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string; meta?: Record<string, unknown> }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ============================================================================
// USELOGS HOOK
// ============================================================================

interface UseLogsOptions {
  /** Initial filters to apply */
  initialFilters?: Partial<LogSearchFilters>;
  /** Initial pagination settings */
  initialPagination?: Partial<PaginationParams>;
  /** Auto-refresh interval in ms (0 = disabled) */
  refreshInterval?: number;
  /** Whether to fetch on mount */
  enabled?: boolean;
}

interface UseLogsReturn extends HookResult<PaginatedResult<LogEntry>> {
  /** Current filters */
  filters: LogSearchFilters;
  /** Update filters and refetch */
  setFilters: (filters: Partial<LogSearchFilters>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Current pagination state */
  pagination: PaginationParams;
  /** Change page */
  setPage: (page: number) => void;
  /** Change page size */
  setPageSize: (size: number) => void;
  /** Aggregations for current filter results */
  aggregations: LogAggregations | null;
  /** Export current results */
  exportLogs: (format: 'json' | 'csv') => Promise<void>;
}

/**
 * Hook for fetching and filtering log entries
 * 
 * @example
 * ```tsx
 * const { data, loading, filters, setFilters, aggregations } = useLogs({
 *   initialFilters: { levels: [LogLevel.ERROR] },
 *   refreshInterval: 30000 // Auto-refresh every 30s
 * });
 * ```
 */
export function useLogs(options: UseLogsOptions = {}): UseLogsReturn {
  const {
    initialFilters = {},
    initialPagination = {},
    refreshInterval = 0,
    enabled = true
  } = options;

  const [data, setData] = useState<PaginatedResult<LogEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<LogSearchFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 50,
    sortBy: 'timestamp',
    sortOrder: 'desc',
    ...initialPagination
  });
  const [aggregations, setAggregations] = useState<LogAggregations | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    
    // Build query params from filters
    if (filters.query) params.set('query', filters.query);
    if (filters.levels?.length) params.set('levels', filters.levels.join(','));
    if (filters.sources?.length) params.set('sources', sources.join(','));
    if (filters.startTime) params.set('startTime', filters.startTime);
    if (filters.endTime) params.set('endTime', filters.endTime);
    if (filters.correlationId) params.set('correlationId', filters.correlationId);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.clientIp) params.set('clientIp', filters.clientIp);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    
    // Add pagination
    params.set('page', pagination.page.toString());
    params.set('pageSize', pagination.pageSize.toString());
    params.set('sortBy', pagination.sortBy || 'timestamp');
    params.set('sortOrder', pagination.sortOrder || 'desc');

    const result = await fetchAPI<LogSearchResult>(`/logs?${params.toString()}`);

    if (result.success && result.data) {
      setData({
        items: result.data.entries,
        total: result.data.totalCount,
        page: result.data.pagination.page,
        pageSize: result.data.pagination.pageSize,
        totalPages: result.data.pagination.totalPages,
        hasNextPage: result.data.pagination.hasNextPage,
        hasPrevPage: result.data.pagination.hasPrevPage
      });
      setAggregations(result.data.aggregations || null);
    } else {
      setError(result.error || 'Failed to fetch logs');
    }

    setLoading(false);
  }, [filters, pagination, enabled]);

  // Set filters helper
  const setFilters = useCallback((newFilters: Partial<LogSearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Pagination helpers
  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination(prev => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  // Export logs
  const exportLogs = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams();
    params.set('export', format);
    if (filters.query) params.set('query', filters.query);
    if (filters.levels?.length) params.set('levels', filters.levels.join(','));
    if (filters.sources?.length) params.set('sources', filters.sources.join(','));
    
    window.open(`${API_BASE}/logs?${params.toString()}`, '_blank');
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    filters,
    setFilters,
    clearFilters,
    pagination,
    setPage,
    setPageSize,
    aggregations,
    exportLogs
  };
}

// ============================================================================
// USEAUDITTRAIL HOOK
// ============================================================================

interface UseAuditTrailOptions {
  /** Initial filters */
  initialFilters?: Partial<AuditFilters>;
  /** View mode: 'list' | 'actor' | 'resource' | 'timeline' */
  mode?: 'list' | 'actor' | 'resource' | 'timeline';
  /** Specific actor ID for actor/timeline modes */
  actorId?: string;
  /** Specific resource ID for resource mode */
  resourceId?: string;
  /** Auto-refresh interval */
  refreshInterval?: number;
}

interface UseAuditTrailReturn extends HookResult<PaginatedResult<AuditEntry>> {
  /** Current filters */
  filters: AuditFilters;
  /** Update filters */
  setFilters: (filters: Partial<AuditFilters>) => void;
  /** Actor activity summary (when mode='actor') */
  actorActivity: {
    totalActivities: number;
    successes: number;
    failures: number;
    successRate: number;
    byAction: Record<string, number>;
  } | null;
  /** Resource history (when mode='resource') */
  resourceHistory: {
    activities: AuditEntry[];
    actorsInvolved: string[];
    actionTypes: string[];
  } | null;
  /** Timeline data (when mode='timeline') */
  timeline: Array<{
    date: string;
    eventCount: number;
    events: AuditEntry[];
  }> | null;
  /** Record a new audit event */
  recordEvent: (event: {
    action: AuditAction;
    actor: AuditActor;
    resource: AuditResource;
    outcome: AuditOutcome;
    description: string;
    context?: Record<string, unknown>;
    failureReason?: string;
  }) => Promise<AuditEntry | null>;
}

/**
 * Hook for audit trail operations
 */
export function useAuditTrail(options: UseAuditTrailOptions = {}): UseAuditTrailReturn {
  const {
    initialFilters = {},
    mode = 'list',
    actorId,
    resourceId,
    refreshInterval = 0
  } = options;

  const [data, setData] = useState<PaginatedResult<AuditEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AuditFilters>(initialFilters);
  const [actorActivity, setActorActivity] = useState<UseAuditTrailReturn['actorActivity']>(null);
  const [resourceHistory, setResourceHistory] = useState<UseAuditTrailReturn['resourceHistory']>(null);
  const [timeline, setTimeline] = useState<UseAuditTrailReturn['timeline']>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    let endpoint = '/audit';
    const params = new URLSearchParams();

    switch (mode) {
      case 'actor':
        if (!actorId) {
          setError('actorId is required for actor mode');
          setLoading(false);
          return;
        }
        params.set('action', 'actors');
        params.set('actorId', actorId);
        break;

      case 'resource':
        if (!resourceId) {
          setError('resourceId is required for resource mode');
          setLoading(false);
          return;
        }
        params.set('action', 'resources');
        params.set('resourceId', resourceId);
        break;

      case 'timeline':
        if (!actorId) {
          setError('actorId is required for timeline mode');
          setLoading(false);
          return;
        }
        params.set('action', 'timeline');
        params.set('actorId', actorId);
        break;

      default:
        params.set('action', 'trail');
        break;
    }

    // Apply filters
    if (filters.actions?.length) params.set('actions', filters.actions.join(','));
    if (filters.actorTypes?.length) params.set('actorTypes', filters.actorTypes.join(','));
    if (filters.resourceTypes?.length) params.set('resourceTypes', filters.resourceTypes.join(','));
    if (filters.outcomes?.length) params.set('outcomes', filters.outcomes.join(','));
    if (filters.query) params.set('query', filters.query);
    if (filters.startTime) params.set('startTime', filters.startTime);
    if (filters.endTime) params.set('endTime', filters.endTime);
    if (filters.minRiskScore !== undefined) params.set('minRiskScore', filters.minRiskScore.toString());

    const result = await fetchAPI<any>(`${endpoint}?${params.toString()}`);

    if (result.success && result.data) {
      switch (mode) {
        case 'actor':
          setActorActivity({
            totalActivities: result.data.totalActivities,
            successes: result.data.successes,
            failures: result.data.failures,
            successRate: result.data.successRate,
            byAction: result.data.byAction
          });
          setData({
            items: result.data.recentEntries || [],
            total: result.data.totalActivities,
            page: 1,
            pageSize: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          });
          break;

        case 'resource':
          setResourceHistory({
            activities: result.data.activities,
            actorsInvolved: result.data.actorsInvolved,
            actionTypes: result.data.actionTypes
          });
          setData({
            items: result.data.activities || [],
            total: result.data.totalActivities,
            page: 1,
            pageSize: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          });
          break;

        case 'timeline':
          setTimeline(result.data.timeline);
          const allEvents = result.data.timeline?.flatMap((t: any) => t.events) || [];
          setData({
            items: allEvents,
            total: result.data.totalEvents,
            page: 1,
            pageSize: 100,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          });
          break;

        default:
          setData({
            items: result.data,
            total: result.meta?.total || 0,
            page: result.meta?.pagination?.page || 1,
            pageSize: result.meta?.pagination?.pageSize || 50,
            totalPages: result.meta?.pagination?.totalPages || 1,
            hasNextPage: result.meta?.pagination?.hasNextPage || false,
            hasPrevPage: result.meta?.pagination?.hasPrevPage || false
          });
      }
    } else {
      setError(result.error || 'Failed to fetch audit data');
    }

    setLoading(false);
  }, [mode, actorId, resourceId, filters]);

  const setFilters = useCallback((newFilters: Partial<AuditFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Record new audit event
  const recordEvent = async (event: {
    action: AuditAction;
    actor: AuditActor;
    resource: AuditResource;
    outcome: AuditOutcome;
    description: string;
    context?: Record<string, unknown>;
    failureReason?: string;
  }): Promise<AuditEntry | null> => {
    const result = await fetchAPI<AuditEntry>('/audit', {
      method: 'POST',
      body: JSON.stringify({ ...event, action: 'record' })
    });

    if (result.success && result.data) {
      fetchData(); // Refresh list
      return result.data;
    }

    setError(result.error || 'Failed to record event');
    return null;
  };

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    filters,
    setFilters,
    actorActivity,
    resourceHistory,
    timeline,
    recordEvent
  };
}

// ============================================================================
// USELOGSOURCES HOOK
// ============================================================================

interface LogSourceInfo {
  source: LogSource;
  config: {
    category: string;
    displayName: string;
    icon: string;
    color: string;
  };
  logCount: number;
  lastLogAt: string | null;
}

interface UseLogSourcesReturn extends HookResult<LogSourceInfo[]> {
  /** Get source by ID */
  getSource: (source: LogSource) => LogSourceInfo | undefined;
  /** Sources grouped by category */
  groupedByCategory: Record<string, LogSourceInfo[]>;
}

/**
 * Hook for managing log sources
 */
export function useLogSources(): UseLogSourcesReturn {
  const [data, setData] = useState<LogSourceInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    
    const result = await fetchAPI<LogSourceInfo[]>('/logs?action=sources');

    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || 'Failed to fetch sources');
    }

    setLoading(false);
  }, []);

  const getSource = useCallback((source: LogSource): LogSourceInfo | undefined => {
    return data?.find(s => s.source === source);
  }, [data]);

  const groupedByCategory = useMemo(() => {
    if (!data) return {};
    
    return data.reduce((acc, source) => {
      const cat = source.config.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(source);
      return acc;
    }, {} as Record<string, LogSourceInfo[]>);
  }, [data]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return {
    data,
    loading,
    error,
    refetch: fetchSources,
    getSource,
    groupedByCategory
  };
}

// ============================================================================
// USELOGSTATS HOOK
// ============================================================================

interface UseLogStatsReturn extends HookResult<LogStatistics> {
  /** Quick stats for dashboard cards */
  quickStats: {
    totalLogs: number;
    errorsLast24h: number;
    criticalCount: number;
    logsPerSecond: number;
    errorRate: number;
    uniqueUsers: number;
  } | null;
}

/**
 * Hook for log statistics and chart data
 */
export function useLogStats(refreshInterval = 0): UseLogStatsReturn {
  const [data, setData] = useState<LogStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    
    const result = await fetchAPI<any>('/logs?action=stats');

    if (result.success && result.data) {
      const stats: LogStatistics = {
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        totalLogs: result.data.overview.totalLogs,
        logsPerSecond: result.data.overview.logsPerSecond,
        byLevel: result.data.byLevel,
        bySource: result.data.bySource,
        errorRate: result.data.overview.errorRate,
        criticalCount: result.data.overview.criticalCount,
        piiExposureCount: 0,
        hourlyTrend: generateHourlyTrend(),
        topErrors: result.data.topErrors || [],
        activeAlerts: 0,
        shippingBacklog: 0,
        storageUsedBytes: 0,
        storageQuotaBytes: 5 * 1024 * 1024 * 1024 * 1024,
        storageUsagePercent: 32.5
      };
      
      setData(stats);
    } else {
      setError(result.error || 'Failed to fetch stats');
    }

    setLoading(false);
  }, []);

  const quickStats = useMemo(() => {
    if (!data) return null;

    return {
      totalLogs: data.totalLogs,
      errorsLast24h: Object.entries(data.byLevel)
        .filter(([level]) => level === LogLevel.ERROR || level === LogLevel.CRITICAL)
        .reduce((sum, [, count]) => sum + count, 0),
      criticalCount: data.criticalCount,
      logsPerSecond: Math.round(data.logsPerSecond * 100) / 100,
      errorRate: Math.round(data.errorRate * 100) / 100,
      uniqueUsers: 15 // Would come from actual data
    };
  }, [data]);

  useEffect(() => {
    fetchStats();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
    quickStats
  };
}

// ============================================================================
// USERETENTIONPOLICIES HOOK
// ============================================================================

interface UseRetentionPoliciesReturn extends HookResult<RetentionPolicy[]> {
  /** Storage usage by source */
  storageUsage: StorageUsage[] | null;
  /** Create new policy */
  createPolicy: (policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'stats'>) => Promise<RetentionPolicy | null>;
  /** Delete policy */
  deletePolicy: (policyId: string) => Promise<boolean>;
  /** Apply retention rules */
  applyRetention: (policyId?: string) => Promise<{
    totalAffected: number;
    totalActioned: number;
  } | null>;
}

/**
 * Hook for retention policy management
 */
export function useRetentionPolicies(): UseRetentionPoliciesReturn {
  const [policies, setPolicies] = useState<RetentionPolicy[] | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const [policiesResult, storageResult] = await Promise.all([
      fetchAPI<RetentionPolicy[]>('/retention?action=policies'),
      fetchAPI<{ bySource: StorageUsage[] }>('/retention?action=storage')
    ]);

    if (policiesResult.success && policiesResult.data) {
      setPolicies(policiesResult.data);
    } else {
      setError(policiesResult.error || 'Failed to fetch policies');
    }

    if (storageResult.success && storageResult.data) {
      setStorageUsage(storageResult.data.bySource);
    }

    setLoading(false);
  }, []);

  const createPolicy = async (
    policyData: Omit<RetentionPolicy, 'id' | 'createdAt' | 'stats'>
  ): Promise<RetentionPolicy | null> => {
    const result = await fetchAPI<RetentionPolicy>('/retention', {
      method: 'POST',
      body: JSON.stringify({ ...policyData, action: 'create-policy' })
    });

    if (result.success && result.data) {
      fetchData(); // Refresh
      return result.data;
    }

    setError(result.error || 'Failed to create policy');
    return null;
  };

  const deletePolicy = async (policyId: string): Promise<boolean> => {
    const result = await fetchAPI(`/retention/policy/${policyId}`, {
      method: 'DELETE'
    });

    if (result.success) {
      fetchData(); // Refresh
      return true;
    }

    setError(result.error || 'Failed to delete policy');
    return false;
  };

  const applyRetention = async (policyId?: string) => {
    const result = await fetchAPI('/retention', {
      method: 'POST',
      body: JSON.stringify({ action: 'apply', policyId })
    });

    if (result.success && result.data) {
      fetchData(); // Refresh
      return {
        totalAffected: result.data.totalAffectedEntries,
        totalActioned: result.data.totalActionedEntries
      };
    }

    setError(result.error || 'Failed to apply retention');
    return null;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: policies,
    loading,
    error,
    refetch: fetchData,
    storageUsage,
    createPolicy,
    deletePolicy,
    applyRetention
  };
}

// ============================================================================
// USELOGGINGDASHBOARD HOOK
// ============================================================================

interface DashboardData {
  logs: LogStatistics | null;
  audit: AuditStatistics | null;
  shipperStatus: ShipperStatus | null;
  complianceReports: {
    SOC2: ComplianceReport | null;
    GDPR: ComplianceReport | null;
    ISO27001: ComplianceReport | null;
  };
}

interface UseLoggingDashboardReturn {
  /** Combined dashboard data */
  dashboardData: DashboardData;
  /** Overall loading state */
  loading: boolean;
  /** Any errors */
  errors: string[];
  /** Refresh all data */
  refreshAll: () => Promise<void>;
  /** Individual data refreshers */
  refreshLogs: () => Promise<void>;
  refreshAudit: () => Promise<void>;
  refreshShipper: () => Promise<void>;
  refreshCompliance: (framework: 'SOC2' | 'GDPR' | 'ISO27001') => Promise<void>;
}

/**
 * Combined hook that provides all data needed for the logging dashboard
 * Optimized to minimize API calls
 */
export function useLoggingDashboard(autoRefresh = 60000): UseLoggingDashboardReturn {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    logs: null,
    audit: null,
    shipperStatus: null,
    complianceReports: {
      SOC2: null,
      GDPR: null,
      ISO27001: null
    }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const refreshLogs = async () => {
    const result = await fetchAPI<any>('/logs?action=stats');
    if (result.success && result.data) {
      setDashboardData(prev => ({
        ...prev,
        logs: {
          period: { start: '', end: '' },
          totalLogs: result.data.overview.totalLogs,
          logsPerSecond: result.data.overview.logsPerSecond,
          byLevel: result.data.byLevel,
          bySource: result.data.bySource,
          errorRate: result.data.overview.errorRate,
          criticalCount: result.data.overview.criticalCount,
          piiExposureCount: 0,
          hourlyTrend: generateHourlyTrend(),
          topErrors: result.data.topErrors,
          activeAlerts: 0,
          shippingBacklog: 0,
          storageUsedBytes: 0,
          storageQuotaBytes: 0,
          storageUsagePercent: 0
        }
      }));
    }
  };

  const refreshAudit = async () => {
    const result = await fetchAPI<any>('/audit?action=stats');
    if (result.success && result.data) {
      setDashboardData(prev => ({
        ...prev,
        audit: result.data
      }));
    }
  };

  const refreshShipper = async () => {
    const result = await fetchAPI<ShipperStatus>('/shipping?action=status');
    if (result.success && result.data) {
      setDashboardData(prev => ({
        ...prev,
        shipperStatus: result.data
      }));
    }
  };

  const refreshCompliance = async (framework: 'SOC2' | 'GDPR' | 'ISO27001') => {
    const result = await fetchAPI<ComplianceReport>(
      `/audit?action=compliance-report&framework=${framework}`
    );
    if (result.success && result.data) {
      setDashboardData(prev => ({
        ...prev,
        complianceReports: {
          ...prev.complianceReports,
          [framework]: result.data
        }
      }));
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setErrors([]);

    const results = await Promise.allSettled([
      refreshLogs(),
      refreshAudit(),
      refreshShipper()
    ]);

    const newErrors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['Logs', 'Audit', 'Shipper'];
        newErrors.push(`${names[index]}: ${result.reason}`);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh > 0) {
      const interval = setInterval(refreshAll, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return {
    dashboardData,
    loading,
    errors,
    refreshAll,
    refreshLogs,
    refreshAudit,
    refreshShipper,
    refreshCompliance
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Generate sample hourly trend data */
function generateHourlyTrend(): Array<{
  hour: string;
  total: number;
  errors: number;
  warnings: number;
  critical: number;
}> {
  const now = new Date();
  const trend = [];

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    trend.push({
      hour: hour.toISOString(),
      total: Math.floor(500 + Math.random() * 2000),
      errors: Math.floor(Math.random() * 50),
      warnings: Math.floor(50 + Math.random() * 150),
      critical: Math.floor(Math.random() * 5)
    });
  }

  return trend;
}
