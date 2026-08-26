/**
 * 🇩🇿 National SOC - MISP Integration React Hooks
 * Custom hooks for consuming MISP API data in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  MISPEvent,
  MISPAttribute,
  MISPDashboardSummary,
} from '../types/misp.types';

// ────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────

interface UseMISPDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseMISPDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// ────────────────────────────────────────────────────────
// HELPER: Generic Data Fetching Hook
// ────────────────────────────────────────────────────────

function useMISPData<T>(
  fetchFn: () => Promise<T>,
  options?: UseMISPDataOptions
): UseMISPDataResult<T> {
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
// HOOK: Events
// ────────────────────────────────────────────────────────

export function useMISPEvents(
  params?: {
    query?: string;
    threat_level?: number;
    days?: number;
    limit?: number;
    tags?: string[];
  },
  options?: UseMISPDataOptions
): UseMISPDataResult<MISPEvent[]> {
  const fetchEvents = useCallback(async () => {
    const searchParams = new URLSearchParams();
    
    if (params?.query) searchParams.set('query', params.query);
    if (params?.threat_level) searchParams.set('threat_level', params.threat_level.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.days) searchParams.set('days', params.days.toString());
    if (params?.tags) searchParams.set('tags', params.tags.join(','));

    const response = await fetch(`/api/integrations/misp/events?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    
    const json = await response.json();
    return json.data;
  }, [params]);

  return useMISPData(fetchEvents, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Recent Events
// ────────────────────────────────────────────────────────

export function useRecentMISPEvents(
  days: number = 7,
  limit: number = 20,
  refreshInterval: number = 120000 // 2 minutes default
): UseMISPDataResult<MISPEvent[]> {
  return useMISPEvents({ days, limit }, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Indicator Check
// ────────────────────────────────────────────────────────

export function useIndicatorCheck(
  value: string | null,
  type?: string
): UseMISPDataResult<{
  indicator: string;
  found: boolean;
  isWarningList: boolean;
  matches: MISPAttribute[];
  matchCount: number;
  riskScore: number;
  recommendation: string;
}> {
  const checkIndicator = useCallback(async () => {
    if (!value) throw new Error('No indicator value provided');
    
    const searchParams = new URLSearchParams();
    searchParams.set('value', value);
    if (type) searchParams.set('type', type);

    const response = await fetch(`/api/integrations/misp/indicators?${searchParams}`);
    if (!response.ok) throw new Error('Failed to check indicator');
    
    const json = await response.json();
    return json.data;
  }, [value, type]);

  return useMISPData(checkIndicator, {
    autoFetch: !!value,
    refreshInterval: 0, // Don't auto-refresh checks
  });
}

// ────────────────────────────────────────────────────────
// HOOK: Dashboard Summary
// ────────────────────────────────────────────────────────

export function useMISPDashboard(
  refreshInterval: number = 300000 // 5 minutes default
): UseMISPDataResult<MISPDashboardSummary> {
  const fetchDashboard = useCallback(async () => {
    const response = await fetch('/api/integrations/misp/statistics');
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useMISPData(fetchDashboard, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Threat Actors
// ────────────────────────────────────────────────────────

export function useThreatActors(
  limit: number = 20,
  refreshInterval: number = 600000 // 10 minutes
): UseMISPDataResult<Array<{
  name: string;
  description: string;
}>> {
  const fetchActors = useCallback(async () => {
    const response = await fetch(`/api/integrations/misp/galaxies?type=threat-actor`);
    if (!response.ok) throw new Error('Failed to fetch threat actors');
    
    const json = await response.json();
    return json.data.clusters.slice(0, limit).map((c: any) => ({
      name: c.value,
      description: c.description,
    }));
  }, [limit]);

  return useMISPData(fetchActors, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: MITRE ATT&CK Data
// ────────────────────────────────────────────────────────

export function useMITREATTCK(): UseMISPDataResult<{
  tactics: Array<{ id: string; name: string; description: string }>;
  techniques: Array<{ id: string; name: string; tactic: string }>;
}> {
  const fetchMITRE = useCallback(async () => {
    const response = await fetch('/api/integrations/misp/galaxies?type=mitre-attack');
    if (!response.ok) throw new Error('Failed to fetch MITRE ATT&CK data');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useMISPData(fetchMITRE, { autoFetch: true }); // No refresh needed usually
}

// ────────────────────────────────────────────────────────
// HOOK: Create Event (Mutation)
// ────────────────────────────────────────────────────────

export function useCreateEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(async (eventData: {
    info: string;
    threat_level_id?: number;
    tags?: string[];
    attributes?: Array<{
      type: string;
      value: string;
      comment?: string;
    }>;
    publish?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/misp/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createEvent, loading, error };
}
