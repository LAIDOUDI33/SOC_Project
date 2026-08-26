/**
 * 🇩🇿 National SOC - Suricata Integration React Hooks
 * Custom hooks for consuming Suricata API data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  SuricataAlert,
  SuricataRule,
  SuricataDashboardSummary,
} from '../types/suricata.types';

// ────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────

interface UseSuricataDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseSuricataDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// ────────────────────────────────────────────────────────
// HELPER: Generic Data Fetching Hook
// ────────────────────────────────────────────────────────

function useSuricataData<T>(
  fetchFn: () => Promise<T>,
  options?: UseSuricataDataOptions
): UseSuricataDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options?.autoFetch !== false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchData();
    }

    if (options?.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.autoFetch, options?.refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
}

// ────────────────────────────────────────────────────────
// HOOK: Alerts
// ────────────────────────────────────────────────────────

export function useSuricataAlerts(
  params?: {
    severity?: string;
    hours?: number;
    limit?: number;
    protocol?: string;
  },
  options?: UseSuricataDataOptions
): UseSuricataDataResult<{ alerts: SuricataAlert[]; total: number }> {
  const fetchAlerts = useCallback(async () => {
    const searchParams = new URLSearchParams();
    
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.protocol) searchParams.set('protocol', params.protocol);
    if (params?.hours) searchParams.set('hours', params.hours.toString());

    const response = await fetch(`/api/integrations/suricata/alerts?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    
    return response.json();
  }, [params]);

  return useSuricataData(fetchAlerts, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Recent Alerts
// ────────────────────────────────────────────────────────

export function useRecentSuricataAlerts(
  hours: number = 24,
  limit: number = 100,
  refreshInterval: number = 15000 // 15 seconds default for IDS
): UseSuricataDataResult<SuricataAlert[]> {
  const result = useSuricataAlerts({ hours, limit }, { autoFetch: true, refreshInterval });

  return {
    ...result,
    data: result.data ? result.data.alerts : null,
  };
}

// ────────────────────────────────────────────────────────
// HOOK: Critical Alerts
// ────────────────────────────────────────────────────────

export function useCriticalSuricataAlerts(
  limit: number = 50,
  refreshInterval: number = 10000 // 10 seconds for critical
): UseSuricataDataResult<SuricataAlert[]> {
  return useSuricataAlerts(
    { severity: 'high', limit },
    { autoFetch: true, refreshInterval }
  );
}

// ────────────────────────────────────────────────────────
// HOOK: Dashboard Summary
// ────────────────────────────────────────────────────────

export function useSuricataDashboard(
  refreshInterval: number = 30000 // 30 seconds default
): UseSuricataDataResult<SuricataDashboardSummary> {
  const fetchDashboard = useCallback(async () => {
    const response = await fetch('/api/integrations/suricata/statistics');
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useSuricataData(fetchDashboard, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Rules
// ────────────────────────────────────────────────────────

export function useSuricataRules(options?: UseSuricataDataOptions): UseSuricataDataResult<SuricataRule[]> {
  const fetchRules = useCallback(async () => {
    const response = await fetch('/api/integrations/suricata/rules');
    if (!response.ok) throw new Error('Failed to fetch rules');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useSuricataData(fetchRules, options);
}
