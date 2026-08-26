/**
 * 🇩🇿 National SOC - TheHive Integration React Hooks
 * Custom hooks for consuming TheHive API data in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Case,
  Task,
  Observable,
  CaseMetrics,
} from '../types/thehive.types';

// ────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────

interface UseTheHiveDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseTheHiveDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// ────────────────────────────────────────────────────────
// HELPER: Generic Data Fetching Hook
// ────────────────────────────────────────────────────────

function useTheHiveData<T>(
  fetchFn: () => Promise<T>,
  options?: UseTheHiveDataOptions
): UseTheHiveDataResult<T> {
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
// HOOK: Cases
// ────────────────────────────────────────────────────────

interface CaseSearchParams {
  status?: string;
  severity?: number;
  assignee?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sort?: string;
  range?: string;
}

export function useTheHiveCases(
  params?: CaseSearchParams,
  options?: UseTheHiveDataOptions
): UseTheHiveDataResult<{ cases: Case[]; total: number }> {
  const fetchCases = useCallback(async () => {
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.set('status', params.status);
    if (params?.severity) searchParams.set('severity', params.severity.toString());
    if (params?.assignee) searchParams.set('assignee', params.assignee);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.range) searchParams.set('range', params.range);
    if (params?.tags) searchParams.set('tags', params.tags.join(','));

    const response = await fetch(`/api/integrations/thehive/cases?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch cases');
    
    return response.json();
  }, [params]);

  return useTheHiveData(fetchCases, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Open Cases (High frequency)
// ────────────────────────────────────────────────────────

export function useOpenCases(
  limit: number = 20,
  refreshInterval: number = 30000 // 30 seconds
): UseTheHiveDataResult<Case[]> {
  const result = useTheHiveCases(
    { status: 'Open', limit, sort: '-createdAt' },
    { autoFetch: true, refreshInterval }
  );

  // Transform to just the array
  return {
    ...result,
    data: result.data ? result.data.cases : null,
  };
}

// ────────────────────────────────────────────────────────
// HOOK: Critical/Urgent Cases
// ────────────────────────────────────────────────────────

export function useUrgentCases(
  limit: number = 10,
  refreshInterval: number = 15000 // 15 seconds for urgent cases
): UseTheHiveDataResult<Case[]> {
  const result = useTheHiveCases(
    { severity: 1, limit, sort: '-createdAt' },
    { autoFetch: true, refreshInterval }
  );

  return {
    ...result,
    data: result.data ? result.data.cases : null,
  };
}

// ────────────────────────────────────────────────────────
// HOOK: Tasks for Case
// ────────────────────────────────────────────────────────

export function useCaseTasks(
  caseId: string,
  options?: UseTheHiveDataOptions
): UseTheHiveDataResult<Task[]> {
  const fetchTasks = useCallback(async () => {
    const response = await fetch(`/api/integrations/thehive/tasks/${caseId}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    
    const json = await response.json();
    return json.data;
  }, [caseId]);

  return useTheHiveData(fetchTasks, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Observables for Case
// ────────────────────────────────────────────────────────

export function useCaseObservables(
  caseId: string,
  options?: UseTheHiveDataOptions
): UseTheHiveDataResult<{
  observables: Observable[];
  summary: Record<string, number>;
}> {
  const fetchObservables = useCallback(async () => {
    const response = await fetch(`/api/integrations/thehive/observables/${caseId}`);
    if (!response.ok) throw new Error('Failed to fetch observables');
    
    return response.json();
  }, [caseId]);

  return useTheHiveData(fetchObservables, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Dashboard Metrics
// ────────────────────────────────────────────────────────

export function useTheHiveMetrics(
  refreshInterval: number = 60000 // 1 minute default
): UseTheHiveDataResult<{
  summary: {
    openCases: number;
    inProgressCases: number;
    resolvedToday: number;
    criticalOpen: number;
    totalActive: number;
  };
  urgentCases: Case[];
  recentActivity: Array<{
    id: string;
    title: string;
    severity: number;
    status: string;
    createdAt: string;
    tags: string[];
  }>;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastUpdated: string;
}> {
  const fetchMetrics = useCallback(async () => {
    const response = await fetch('/api/integrations/thehive/metrics');
    if (!response.ok) throw new Error('Failed to fetch metrics');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useTheHiveData(fetchMetrics, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Create Case (Mutation)
// ────────────────────────────────────────────────────────

export function useCreateCase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCase = useCallback(async (caseData: {
    title: string;
    description?: string;
    severity?: number;
    tags?: string[];
    tlp?: number;
    pap?: number;
    template?: string;
    assignee?: string;
    createPlaybook?: boolean;
    fromAlert?: boolean;
    alert?: any;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/thehive/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create case');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCase, loading, error };
}
