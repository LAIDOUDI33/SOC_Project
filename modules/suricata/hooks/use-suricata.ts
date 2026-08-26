/**
 * React Hooks for Suricata IDS/IPS
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive hooks for:
 * - Alert data fetching and management
 * - Rule querying and manipulation
 * - Statistics and analytics
 * - Real-time updates
 * - Sensor monitoring
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  EveEvent,
  SuricataRule,
  SuricataStats,
  AlertFilter,
  RuleFilter,
  AlertResultSet,
  RuleResultSet,
  SeverityLevel,
  RuleState,
  RuleAction,
  SignatureSource,
  TimeRange,
  AttackMapPoint,
  IPStats,
  SignatureStats,
  PortStats,
  SuricataSensor,
  SensorStatus,
  AlertAggregations,
  SEVERITY_CONFIG
} from '../types/suricata.types';

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

interface UseAlertsResult extends UseApiResult<AlertResultSet> {
  alerts: EveEvent[];
  total: number;
  aggregations: AlertAggregations | null;
  setFilter: (filter: Partial<AlertFilter>) => void;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
}

interface UseRulesResult extends UseApiResult<RuleResultSet> {
  rules: SuricataRule[];
  total: number;
  setFilter: (filter: Partial<RuleFilter>) => void;
  toggleRule: (sid: number, state: RuleState) => Promise<void>;
  validateRule: (ruleText: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
}

interface UseStatsResult extends UseApiResult<SuricataStats> {
  packetStats: {
    pps: number;
    bps: number;
    dropRate: number;
    totalPackets: number;
  } | null;
  refreshInterval: number;
  setRefreshInterval: (ms: number) => void;
}

interface UseTrendsResult {
  points: Array<{ timestamp: string; value: number }>;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  trendDirection: 'up' | 'down' | 'stable';
  changePercentage: number;
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
// ALERT HOOKS
// ============================================================================

/**
 * Hook for fetching and managing IDS alerts
 * 
 * @example
 * ```tsx
 * const { alerts, loading, error, setFilter, aggregations } = useSuricataAlerts({
 *   time_range: TimeRange.LAST_24_HOURS,
 *   severities: [SeverityLevel.CRITICAL, SeverityLevel.HIGH]
 * });
 * ```
 */
export function useSuricataAlerts(initialFilter: Partial<AlertFilter> = {}): UseAlertsResult {
  const [filter, setFilterState] = useState<Partial<AlertFilter>>(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAlerts = useCallback(async (): Promise<AlertResultSet> => {
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

    const response = await fetch(`/api/suricata/alerts?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }, [filter, currentPage]);

  const result = useApi(fetchAlerts, {
    autoFetch: true,
    refreshInterval: 30000 // 30 seconds
  });

  const setFilter = useCallback((newFilter: Partial<AlertFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
    setCurrentPage(1); // Reset to page 1 on filter change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    ...result,
    alerts: result.data?.alerts || [],
    total: result.data?.total || 0,
    aggregations: result.data?.aggregations || null,
    setFilter,
    currentPage,
    totalPages: result.data?.total_pages || 0,
    setPage
  };
}

/**
 * Hook for getting recent alerts
 */
export function useRecentAlerts(limit: number = 50, refreshInterval: number = 15000): UseApiResult<EveEvent[]> {
  const fetchRecent = useCallback(async (): Promise<EveEvent[]> => {
    const response = await fetch(`/api/suricata/alerts?time_range=${TimeRange.LAST_24_HOURS}&page_size=${limit}&sort_by=timestamp&sort_order=desc`);
    const result = await response.json();
    return result.data.alerts;
  }, [limit]);

  return useApi(fetchRecent, {
    autoFetch: true,
    refreshInterval
  });
}

/**
 * Hook for high-priority alerts (Critical + High)
 */
export function useHighPriorityAlerts(limit: number = 25): UseApiResult<EveEvent[]> {
  const fetchHighPriority = useCallback(async (): Promise<EveEvent[]> => {
    const response = await fetch(
      `/api/suricata/alerts?severities=${SeverityLevel.CRITICAL},${SeverityLevel.HIGH}&page_size=${limit}&sort_by=severity&sort_order=asc`
    );
    const result = await response.json();
    return result.data.alerts;
  }, [limit]);

  return useApi(fetchHighPriority, {
    autoFetch: true,
    refreshInterval: 10000 // More frequent refresh for critical alerts
  });
}

/**
 * Hook for alerts related to a specific IP
 */
export function useAlertsByIP(ipAddress: string): UseApiResult<EveEvent[]> {
  const fetchByIP = useCallback(async (): Promise<EveEvent[]> => {
    const response = await fetch(`/api/suricata/alerts/src_ip=${ipAddress}&dest_ip=${ipAddress}`);
    const result = await response.json();
    return result.data.alerts;
  }, [ipAddress]);

  return useApi(fetchByIP, {
    autoFetch: !!ipAddress,
    refreshInterval: 60000
  });
}

/**
 * Hook for attack map data
 */
export function useAttackMapData(timeRange: TimeRange = TimeRange.LAST_24_HOURS): UseApiResult<AttackMapPoint[]> {
  const fetchAttackMap = useCallback(async (): Promise<AttackMapPoint[]> => {
    const response = await fetch(`/api/suricata/alerts/attack-map?time_range=${timeRange}`);
    const result = await response.json();
    return result.data;
  }, [timeRange]);

  return useApi(fetchAttackMap, {
    autoFetch: true,
    refreshInterval: 60000 // Update attack map every minute
  });
}

// ============================================================================
// RULE HOOKS
// ============================================================================

/**
 * Hook for managing Suricata rules
 * 
 * @example
 * ```tsx
 * const { rules, loading, toggleRule, validateRule } = useSuricataRules({
 *   state: RuleState.ENABLED,
 *   source: SignatureSource.ETOPEN
 * });
 * ```
 */
export function useSuricataRules(initialFilter: Partial<RuleFilter> = {}): UseRulesResult {
  const [filter, setFilterState] = useState<Partial<RuleFilter>>(initialFilter);

  const fetchRules = useCallback(async (): Promise<RuleResultSet> => {
    const params = new URLSearchParams();
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });

    const response = await fetch(`/api/suricata/rules?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rules: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }, [filter]);

  const result = useApi(fetchRules, {
    autoFetch: true,
    refreshInterval: 60000 // Rules don't change as often
  });

  const setFilter = useCallback((newFilter: Partial<RuleFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  const toggleRule = useCallback(async (sid: number, state: RuleState) => {
    const response = await fetch('/api/suricata/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: state === RuleState.ENABLED ? 'enable' : 'disable',
        sid: sid
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle rule ${sid}`);
    }

    // Refetch rules after toggle
    result.refetch();
  }, [result]);

  const validateRule = useCallback(async (ruleText: string) => {
    const response = await fetch('/api/suricata/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'validate',
        rule: ruleText
      })
    });

    const result = await response.json();
    return {
      valid: result.success,
      errors: result.data?.errors || [],
      warnings: result.data?.warnings || []
    };
  }, []);

  return {
    ...result,
    rules: result.data?.rules || [],
    total: result.data?.total || 0,
    setFilter,
    toggleRule,
    validateRule
  };
}

/**
 * Hook for getting a single rule by SID
 */
export function useRule(sid: number | null): UseApiResult<SuricataRule | null> {
  const fetchRule = useCallback(async (): Promise<SuricataRule | null> => {
    if (!sid) return null;

    const response = await fetch(`/api/suricata/rules/${sid}`);
    if (response.status === 404) return null;
    
    const result = await response.json();
    return result.data;
  }, [sid]);

  return useApi(fetchRule, {
    autoFetch: true,
    enabled: !!sid
  });
}

// ============================================================================
// STATISTICS HOOKS
// ============================================================================

/**
 * Hook for comprehensive Suricata statistics
 * 
 * @example
 * ```tsx
 * const { data: stats, loading, packetStats, setRefreshInterval } = useSuricataStats(15000);
 * ```
 */
export function useSuricataStats(refreshInterval: number = 30000): UseStatsResult {
  const [customRefreshInterval, setCustomRefreshInterval] = useState(refreshInterval);

  const fetchStats = useCallback(async (): Promise<SuricataStats> => {
    const response = await fetch('/api/suricata/stats?type=overview');
    const result = await response.json();
    return result.data;
  }, []);

  const result = useApi(fetchStats, {
    autoFetch: true,
    refreshInterval: customRefreshInterval
  });

  const packetStats = result.data ? {
    pps: result.data.derived_metrics?.packets_per_second || 0,
    bps: result.data.derived_metrics?.bits_per_second || 0,
    dropRate: result.data.derived_metrics?.drop_rate_percent || 0,
    totalPackets: result.data.packets_received || 0
  } : null;

  return {
    ...result,
    packetStats,
    refreshInterval: customRefreshInterval,
    setRefreshInterval: setCustomRefreshInterval
  };
}

/**
 * Hook for alert trends over time
 */
export function useAlertTrends(
  initialTimeRange: TimeRange = TimeRange.LAST_24_HOURS
): UseTrendsResult {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [points, setPoints] = useState<Array<{ timestamp: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendDirection, setTrendDirection] = useState<'up' | 'down' | 'stable'>('stable');
  const [changePercentage, setChangePercentage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchTrends = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/suricata/stats?type=trends&time_range=${timeRange}&interval=hour`
        );
        const result = await response.json();

        if (!cancelled) {
          setPoints(result.data.overall.points || []);
          setTrendDirection(result.data.overall.change_direction || 'stable');
          setChangePercentage(result.data.overall.change_percentage || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trends');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTrends();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  return {
    points,
    loading,
    error,
    timeRange,
    setTimeRange,
    trendDirection,
    changePercentage
  };
}

/**
 * Hook for top attacking IPs
 */
export function useTopSourceIPs(limit: number = 20): UseApiResult<IPStats[]> {
  const fetchTopIPs = useCallback(async (): Promise<IPStats[]> => {
    const response = await fetch(`/api/suricata/stats?type=top-ips&limit=${limit}`);
    const result = await response.json();
    return result.data.sources;
  }, [limit]);

  return useApi(fetchTopIPs, {
    autoFetch: true,
    refreshInterval: 120000
  });
}

/**
 * Hook for top triggered signatures
 */
export function useTopSignatures(limit: number = 20): UseApiResult<SignatureStats[]> {
  const fetchTopSignatures = useCallback(async (): Promise<SignatureStats[]> => {
    const response = await fetch(`/api/suricata/stats?type=top-signatures&limit=${limit}`);
    const result = await response.json();
    return result.data.signatures;
  }, [limit]);

  return useApi(fetchTopSignatures, {
    autoFetch: true,
    refreshInterval: 120000
  });
}

/**
 * Hook for protocol distribution
 */
export function useProtocolDistribution(): UseApiResult<Array<{
  protocol: string;
  count: number;
  percentage: string;
}>> {
  const fetchProtocols = useCallback(async () => {
    const response = await fetch('/api/suricata/stats?type=protocols');
    const result = await response.json();
    return result.data.distribution;
  }, []);

  return useApi(fetchProtocols, {
    autoFetch: true,
    refreshInterval: 300000 // 5 minutes - doesn't change often
  });
}

/**
 * Hook for severity breakdown
 */
export function useSeverityBreakdown(): UseApiResult<Array<{
  severity: SeverityLevel;
  count: number;
  percentage: string;
  color: string;
  icon: string;
}>> {
  const fetchSeverity = useCallback(async () => {
    const response = await fetch('/api/suricata/stats?type=severity');
    const result = await response.json();
    return result.data.breakdown;
  }, []);

  return useApi(fetchSeverity, {
    autoFetch: true,
    refreshInterval: 30000
  });
}

// ============================================================================
// SENSOR HOOKS
// ============================================================================

/**
 * Hook for sensor status and health
 */
export function useSensors(): UseApiResult<SuricataSensor[]> {
  const fetchSensors = useCallback(async (): Promise<SuricataSensor[]> => {
    const response = await fetch('/api/suricata/stats?type=sensors');
    const result = await response.json();
    return result.data.sensors;
  }, []);

  return useApi(fetchSensors, {
    autoFetch: true,
    refreshInterval: 30000
  });
}

/**
 * Hook for single sensor details
 */
export function useSensor(sensorId: string | null): UseApiResult<SuricataSensor | null> {
  const fetchSensor = useCallback(async (): Promise<SuricataSensor | null> => {
    if (!sensorId) return null;

    const response = await fetch('/api/suricata/stats?type=sensors');
    const result = await response.json();
    return result.data.sensors.find((s: SuricataSensor) => s.id === sensorId) || null;
  }, [sensorId]);

  return useApi(fetchSensor, {
    autoFetch: true,
    enabled: !!sensorId,
    refreshInterval: 15000
  });
}

/**
 * Hook for sensor health summary
 */
export function useSensorHealthSummary(): UseApiResult<{
  online: number;
  degraded: number;
  offline: number;
  total: number;
}> {
  const fetchHealth = useCallback(async () => {
    const response = await fetch('/api/suricata/stats?type=sensors');
    const result = await response.json();
    return result.data.summary;
  }, []);

  return useApi(fetchHealth, {
    autoFetch: true,
    refreshInterval: 30000
  });
}

// ============================================================================
// PERFORMANCE HOOKS
// ============================================================================

/**
 * Hook for performance metrics
 */
export function usePerformanceMetrics(): UseApiResult<{
  cpu: { usage_percent: number; cores: number };
  memory: { usage_bytes: number; usage_formatted: string; percentage: string };
  throughput: { packets_per_second: number; megabits_per_second: number };
}> {
  const fetchPerformance = useCallback(async () => {
    const response = await fetch('/api/suricata/stats?type=performance');
    const result = await response.json();
    return result.data;
  }, []);

  return useApi(fetchPerformance, {
    autoFetch: true,
    refreshInterval: 10000 // Performance changes frequently
  });
}

/**
 * Hook for packet processing statistics
 */
export function usePacketStats(): UseApiResult<{
  received: { total: number; rate_per_second: number };
  dropped: { total: number; drop_rate_percent: string };
  processed: { total: number };
}> {
  const fetchPacketStats = useCallback(async () => {
    const response = await fetch('/api/suricata/stats?type=packets');
    const result = await response.json();
    return result.data;
  }, []);

  return useApi(fetchPacketStats, {
    autoFetch: true,
    refreshInterval: 5000 // Packets update very frequently
  });
}

// ============================================================================
// COMBINED DASHBOARD HOOK
// ============================================================================

/**
 * Combined hook for Suricata dashboard data
 * Fetches all necessary data for a complete dashboard view
 * 
 * @example
 * ```tsx
 * const { stats, recentAlerts, topIPs, sensors, loading, error } = useSuricataDashboard();
 * ```
 */
export function useSuricataDashboard(options: {
  refreshInterval?: number;
  enableAttackMap?: boolean;
} = {}) {
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useSuricataStats(options.refreshInterval || 30000);

  const {
    data: recentAlerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts
  } = useRecentAlerts(10, options.refreshInterval || 15000);

  const {
    data: highPriorityAlerts,
    loading: hpLoading
  } = useHighPriorityAlerts(5);

  const {
    data: topIPs,
    loading: ipsLoading
  } = useTopSourceIPs(10);

  const {
    data: topSignatures,
    loading: sigsLoading
  } = useTopSignatures(10);

  const {
    data: sensors,
    loading: sensorsLoading
  } = useSensors();

  const {
    data: attackMap,
    loading: mapLoading
  } = useAttackMapData(
    options.enableAttackMap ? TimeRange.LAST_24_HOURS : TimeRange.LAST_HOUR
  );

  const {
    data: severityBreakdown,
    loading: sevLoading
  } = useSeverityBreakdown();

  const {
    data: protocolDist,
    loading: protoLoading
  } = useProtocolDistribution();

  const refetchAll = useCallback(() => {
    refetchStats();
    refetchAlerts();
  }, [refetchStats, refetchAlerts]);

  return {
    // Data
    stats,
    recentAlerts,
    highPriorityAlerts,
    topIPs,
    topSignatures,
    sensors,
    attackMap,
    severityBreakdown,
    protocolDist,

    // Loading states
    loading: statsLoading || alertsLoading || ipsLoading || sensorsLoading,
    detailedLoading: {
      stats: statsLoading,
      alerts: alertsLoading,
      highPriority: hpLoading,
      topIPs: ipsLoading,
      topSignatures: sigsLoading,
      sensors: sensorsLoading,
      attackMap: mapLoading,
      severity: sevLoading,
      protocols: protoLoading
    },

    // Errors
    error: statsError || alertsError || null,

    // Actions
    refetchAll
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  SEVERITY_CONFIG,
  // Re-export types for convenience
  type UseApiResult,
  type UseAlertsResult,
  type UseRulesResult,
  type UseStatsResult,
  type UseTrendsResult
};
