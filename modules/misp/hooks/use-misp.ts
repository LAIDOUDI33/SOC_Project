/**
 * MISP React Hooks
 * Algeria National SOC Platform 2026-2030
 * 
 * Custom hooks for consuming MISP threat intelligence data:
 * - Event data fetching and management
 * - IOC search and validation
 * - Galaxy/threat actor lookup
 * - Feed synchronization status
 * - YARA rule generation
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  MISPEvent,
  MISPAttribute,
  MISPGalaxy,
  GalaxyCluster,
  MISPFeed,
  MISPServer,
  MISPStatistics,
  TimelinePoint,
  YARARule,
  WarninglistHit,
} from '../types/misp.types';

// ============================================================
// Types for Hook Returns
// ============================================================

interface UseMISPDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseMISPEventsReturn extends UseMISPDataReturn<MISPEvent[]> {
  total: number;
  filters: {
    value?: string;
    type?: string;
    threatLevel?: number;
    published?: boolean;
  };
  setFilters: (filters: Partial<UseMISPEventsReturn['filters']>) => void;
}

interface UseMISPIOCsReturn extends UseMISPDataReturn<MISPAttribute[]> {
  total: number;
  warninglistHits: WarninglistHit[];
  validateIOCs: (values: string[]) => Promise<WarninglistHit[]>;
}

// ============================================================
// API Helper Functions
// ============================================================

async function fetchFromAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const searchParams = new URLSearchParams(params);
  const url = `/api/misp${endpoint}${params ? `?${searchParams.toString()}` : ''}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}

async function postToAPI<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/misp${endpoint}`, {
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
// Event Hooks
// ============================================================

/**
 * Hook for fetching and managing MISP events
 */
export function useMISPEvents(initialLimit: number = 50): UseMISPEventsReturn {
  const [data, setData] = useState<MISPEvent[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [filters, setFiltersState] = useState<UseMISPEventsReturn['filters']>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        action: 'search',
        limit: initialLimit.toString(),
      };

      if (filters.value) params.value = filters.value;
      if (filters.type) params.type = filters.type;
      if (filters.threatLevel) params.threatLevel = filters.threatLevel.toString();
      if (filters.published !== undefined) params.published = filters.published.toString();

      const result = await fetchFromAPI<{ events: MISPEvent[]; total: number }>('/events', params);
      setData(result.events);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
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
 * Hook for getting recent MISP events
 */
export function useRecentMISPEvents(days: number = 7): UseMISPDataReturn<MISPEvent[]> {
  const [data, setData] = useState<MISPEvent[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const events = await fetchFromAPI<MISPEvent[]>('/events', {
        action: 'recent',
        days: days.toString(),
      });
      setData(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recent events');
    } finally {
      setLoading(false);
    }
  }, [days]);

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

/**
 * Hook for single event detail
 */
export function useMISPEvent(eventId: string | null): UseMISPDataReturn<MISPEvent> {
  const [data, setData] = useState<MISPEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(!!eventId);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!eventId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const event = await fetchFromAPI<MISPEvent>('/events', {
        action: 'single',
        eventId,
      });
      setData(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

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
// Statistics & Analytics Hooks
// ============================================================

/**
 * Hook for MISP dashboard statistics
 */
export function useMISPStatistics(timeRange: string = '30d'): UseMISPDataReturn<MISPStatistics> {
  const [data, setData] = useState<MISPStatistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await fetchFromAPI<MISPStatistics>('/events', {
        action: 'statistics',
        timeRange,
      });
      setData(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
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
 * Hook for event timeline data
 */
export function useMIPTimeline(days: number = 30): UseMISPDataReturn<TimelinePoint[]> {
  const [data, setData] = useState<TimelinePoint[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const timeline = await fetchFromAPI<TimelinePoint[]>('/events', {
        action: 'timeline',
        days: days.toString(),
      });
      setData(timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
    } finally {
      setLoading(false);
    }
  }, [days]);

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
// IOC Hooks
// ============================================================

/**
 * Hook for searching and managing IOCs
 */
export function useMISPIOCs(): UseMISPIOCsReturn {
  const [data, setData] = useState<MISPAttribute[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [warninglistHits, setWarninglistHits] = useState<WarninglistHit[]>([]);

  const fetchData = useCallback(async (searchValue?: string, searchType?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        action: 'search',
        limit: '100',
      };

      if (searchValue) params.value = searchValue;
      if (searchType) params.type = searchType;

      const result = await fetchFromAPI<{ iocs: MISPAttribute[]; total: number }>('/iocs', params);
      setData(result.iocs);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch IOCs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateIOCs = useCallback(async (values: string[]): Promise<WarninglistHit[]> => {
    try {
      const hits = await fetchFromAPI<{ hits: WarninglistHit[]; clean: string[] }>('/iocs', {
        action: 'validate',
        values: values.join(','),
      });
      setWarninglistHits(hits.hits);
      return hits.hits;
    } catch (err) {
      console.error('IOC validation failed:', err);
      return [];
    }
  }, []);

  return {
    data,
    loading,
    error,
    total,
    warninglistHits,
    validateIOCs,
    refetch: () => fetchData(),
  };
}

/**
 * Hook for trending IOCs
 */
export function useTrendingIOCs(): UseMISPDataReturn<Array<{ type: string; value: string; count: number }>> {
  const [data, setData] = useState<Array<{ type: string; value: string; count: number }> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const trending = await fetchFromAPI<Array<{ type: string; value: string; count: number }>>('/iocs', {
        action: 'trending',
      });
      setData(trending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending IOCs');
    } finally {
      setLoading(false);
    }
  }, []);

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
// Galaxy & Threat Actor Hooks
// ============================================================

/**
 * Hook for threat actors from MITRE ATT&CK galaxy
 */
export function useThreatActors(): UseMISPDataReturn<GalaxyCluster[]> {
  const [data, setData] = useState<GalaxyCluster[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const actors = await fetchFromAPI<GalaxyCluster[]>('/galaxies', {
        action: 'threatActors',
      });
      setData(actors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch threat actors');
    } finally {
      setLoading(false);
    }
  }, []);

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

/**
 * Hook for MITRE ATT&CK tactics
 */
export function useMITRETactics(): UseMISPDataReturn<GalaxyCluster[]> {
  const [data, setData] = useState<GalaxyCluster[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const tactics = await fetchFromAPI<GalaxyCluster[]>('/galaxies', {
        action: 'mitreTactics',
      });
      setData(tactics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MITRE tactics');
    } finally {
      setLoading(false);
    }
  }, []);

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

/**
 * Hook for all galaxies summary
 */
export function useGalaxies(): UseMISPDataReturn<{
  threatActorCount: number;
  malwareCount: number;
  toolCount: number;
  topThreatActors: Array<{ name: string; description: string }>;
}> {
  const [data, setData] = useState<ReturnType<typeof useState>['0']>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = await fetchFromAPI<NonNullable<typeof data>>('/galaxies');
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch galaxies');
    } finally {
      setLoading(false);
    }
  }, []);

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
// Feed & Sync Hooks
// ============================================================

/**
 * Hook for feed information and status
 */
export function useMISPFeeds(): UseMISPDataReturn<MISPFeed[]> {
  const [data, setData] = useState<MISPFeed[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const feeds = await fetchFromAPI<MISPFeed[]>('/feeds', {
        action: 'list',
      });
      setData(feeds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feeds');
    } finally {
      setLoading(false);
    }
  }, []);

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

/**
 * Hook for sync server configuration
 */
export function useSyncServers(): UseMISPDataReturn<MISPServer[]> {
  const [data, setData] = useState<MISPServer[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const servers = await fetchFromAPI<MISPServer[]>('/feeds', {
        action: 'servers',
      });
      setData(servers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync servers');
    } finally {
      setLoading(false);
    }
  }, []);

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
// YARA Rule Hooks
// ============================================================

/**
 * Hook for generating YARA rules from events
 */
export function useYARARules(eventId: string | null): UseMISPDataReturn<YARARule> {
  const [data, setData] = useState<YARARule | null>(null);
  const [loading, setLoading] = useState<boolean>(false);  // Don't load by default
  const [error, setError] = useState<string | null>(null);

  const generateRule = useCallback(async (options?: {
    includeHashes?: boolean;
    includeDomains?: boolean;
  }) => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {
        action: 'generate',
        eventId,
      };

      if (options?.includeHashes === false) params.includeHashes = 'false';
      if (options?.includeDomains === false) params.includeDomains = 'false';

      const rule = await fetchFromAPI<YARARule>('/yara', params);
      setData(rule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate YARA rule');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  return {
    data,
    loading,
    error,
    refetch: () => generateRule(),
  };
}

// ============================================================
// Health Check Hook
// ============================================================

/**
 * Hook for checking MISP server health
 */
export function useMISPHealth(): UseMISPDataReturn<{
  healthy: boolean;
  version: string;
  maintenance_mode: boolean;
}> {
  const [data, setData] = useState<ReturnType<typeof useState>['0']>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // This would call a dedicated health endpoint or use getVersion
      // For now, we'll simulate with a stats call that tests connectivity
      const stats = await fetchFromAPI<MISPStatistics>('/events', {
        action: 'statistics',
        timeRange: '1d',
      });

      setData({
        healthy: true,
        version: 'connected',
        maintenance_mode: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
      setData({
        healthy: false,
        version: 'unknown',
        maintenance_mode: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Check health every minute
    const interval = setInterval(checkHealth, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    data,
    loading,
    error,
    refetch: checkHealth,
  };
}
