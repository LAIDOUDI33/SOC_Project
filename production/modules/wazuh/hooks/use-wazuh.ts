/**
 * 🇩🇿 National SOC - Wazuh Integration React Hooks
 * Custom hooks for consuming Wazuh API data in React components
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  WazuhAlert,
  WazuhAgent,
  WazuhSummary,
  FIMEvent,
  Vulnerability,
} from '../types/wazuh.types';

// ────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────

interface UseWazuhDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // milliseconds, 0 = no auto-refresh
}

interface UseWazuhDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// ────────────────────────────────────────────────────────
// HELPER: Generic Data Fetching Hook
// ────────────────────────────────────────────────────────

function useWazuhData<T>(
  fetchFn: () => Promise<T>,
  options?: UseWazuhDataOptions
): UseWazuhDataResult<T> {
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

interface AlertSearchParams {
  offset?: number;
  limit?: number;
  sort?: string;
  search?: string;
  time_range?: string;
  severity?: string;
  groups?: string[];
}

export function useWazuhAlerts(
  params?: AlertSearchParams,
  options?: UseWazuhDataOptions
): UseWazuhDataResult<{ alerts: WazuhAlert[]; totalItems: number }> {
  const fetchAlerts = useCallback(async () => {
    const searchParams = new URLSearchParams();
    
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.time_range) searchParams.set('time_range', params.time_range);
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.groups) searchParams.set('groups', params.groups.join(','));

    const response = await fetch(`/api/integrations/wazuh/alerts?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    
    return response.json();
  }, [params]);

  return useWazuhData(fetchAlerts, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Critical Alerts (High frequency refresh)
// ────────────────────────────────────────────────────────

export function useCriticalAlerts(
  limit: number = 50,
  refreshInterval: number = 10000 // 10 seconds default
): UseWazhuDataResult<WazuhAlert[]> {
  return useWazuhAlerts(
    { limit, severity: '>=10', sort: '-timestamp' },
    { autoFetch: true, refreshInterval }
  );
}

// ────────────────────────────────────────────────────────
// HOOK: Agents
// ────────────────────────────────────────────────────────

interface AgentSearchParams {
  status?: 'active' | 'disconnected' | 'never_connected' | 'all';
  limit?: number;
  search?: string;
}

export function useWazuhAgents(
  params?: AgentSearchParams,
  options?: UseWazuhDataOptions
): UseWazuhDataResult<{ agents: WazuhAgent[]; totalItems: number }> {
  const fetchAgents = useCallback(async () => {
    const searchParams = new URLSearchParams();
    
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const response = await fetch(`/api/integrations/wazuh/agents?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    
    return response.json();
  }, [params]);

  return useWazuhData(fetchAgents, options);
}

// ────────────────────────────────────────────────────────
// HOOK: Agents Summary
// ────────────────────────────────────────────────────────

export function useAgentsSummary(
  refreshInterval: number = 30000 // 30 seconds default
): UseWazuhDataResult<{
  active: number;
  disconnected: number;
  never_connected: number;
  total: number;
}> {
  const fetchSummary = useCallback(async () => {
    const response = await fetch('/api/integrations/wazuh/agents?limit=1');
    if (!response.ok) throw new Error('Failed to fetch agent summary');
    
    const json = await response.json();
    return json.data; // This would need adjustment based on actual API structure
  }, []);

  return useWazuhData(fetchSummary, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Health Status
// ────────────────────────────────────────────────────────

export function useWazuhHealth(
  refreshInterval: number = 60000 // 1 minute default
): UseWazuhDataResult<{
  healthy: boolean;
  manager: { status: string; version: string };
  agents: { active: number; total: number; disconnected: number };
  alerts: { last_24h: number; critical: number };
}> {
  const fetchHealth = useCallback(async () => {
    const response = await fetch('/api/integrations/wazuh/health');
    if (!response.ok) throw new Error('Failed to fetch health status');
    
    const json = await response.json();
    return json.data;
  }, []);

  return useWazuhData(fetchHealth, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Compliance Score
// ────────────────────────────────────────────────────────

export function useComplianceScore(
  refreshInterval: number = 300000 // 5 minutes default
): UseWazuhDataResult<{
  pci_dss: number;
  gdpr: number;
  hipaa: number;
  nist: number;
  tsc: number;
}> {
  const fetchCompliance = useCallback(async () => {
    const response = await fetch('/api/integrations/wazuh/compliance');
    if (!response.ok) throw new Error('Failed to fetch compliance score');
    
    const json = await response.json();
    return json.data.scores;
  }, []);

  return useWazuhData(fetchCompliance, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: FIM Events (File Changes)
// ────────────────────────────────────────────────────────

export function useFIMEvents(
  hours: number = 24,
  eventType?: 'added' | 'modified' | 'deleted',
  refreshInterval: number = 15000 // 15 seconds for real-time feel
): UseWazuhDataResult<FIMEvent[]> {
  const fetchEvents = useCallback(async () => {
    const searchParams = new URLSearchParams();
    searchParams.set('hours', hours.toString());
    if (eventType) searchParams.set('type', eventType);

    const response = await fetch(`/api/integrations/wazuh/fim?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch FIM events');
    
    const json = await response.json();
    return json.data;
  }, [hours, eventType]);

  return useWazuhData(fetchEvents, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Vulnerabilities
// ────────────────────────────────────────────────────────

export function useVulnerabilities(
  agentId?: string,
  severity?: 'low' | 'medium' | 'high' | 'critical',
  refreshInterval: number = 120000 // 2 minutes
): UseWazuhDataResult<Vulnerability[] | {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affected_agents: number;
}> {
  const fetchVulns = useCallback(async () => {
    const searchParams = new URLSearchParams();
    if (agentId) searchParams.set('agent_id', agentId);
    if (severity) searchParams.set('severity', severity);

    const response = await fetch(`/api/integrations/wazuh/vulnerabilities?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch vulnerabilities');
    
    const json = await response.json();
    return json.data;
  }, [agentId, severity]);

  return useWazuhData(fetchVulns, { autoFetch: true, refreshInterval });
}

// ────────────────────────────────────────────────────────
// HOOK: Dashboard Summary (Combined)
// ────────────────────────────────────────────────────────

export interface WazuhDashboardSummary {
  health: Awaited<ReturnType<typeof useWazuhHealth>['data']>;
  agents: Awaited<ReturnType<typeof useAgentsSummary>['data']>;
  recentAlerts: WazuhAlert[];
  criticalCount: number;
  compliance: Awaited<ReturnType<typeof useComplianceScore>['data']>;
  fileChanges: FIMEvent[];
  vulnerabilitySummary: Awaited<ReturnType<typeof useVulnerabilities>['data']>;
}

export function useWazuhDashboard(): {
  summary: WazuhDashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const health = useWazuhHealth(60000);
  const agents = useAgentsSummary(30000);
  const recentAlerts = useWazuhAlerts({ limit: 10, sort: '-timestamp' }, { refreshInterval: 10000 });
  const compliance = useComplianceScore(300000);
  const fileChanges = useFIMEvents(24, undefined, 30000);
  const vulns = useVulnerabilities(undefined, undefined, 120000);

  const loading = health.loading || agents.loading || recentAlerts.loading || 
                  compliance.loading || fileChanges.loading || vulns.loading;

  const error = health.error || agents.error || recentAlerts.error ||
                compliance.error || fileChanges.error || vulns.error;

  const summary: WazuhDashboardSummary | null = 
    health.data && agents.data ? {
      health: health.data,
      agents: agents.data,
      recentAlerts: recentAlerts.data?.alerts || [],
      criticalCount: recentAlerts.data?.alerts?.filter(a => (a.rule?.level || 0) >= 10).length || 0,
      compliance: compliance.data,
      fileChanges: fileChanges.data || [],
      vulnerabilitySummary: vulns.data,
    } : null;

  const refetch = useCallback(() => {
    health.refetch();
    agents.refetch();
    recentAlerts.refetch();
    compliance.refetch();
    fileChanges.refetch();
    vulns.refetch();
  }, [health.refetch, agents.refetch, recentAlerts.refetch, 
      compliance.refetch, fileChanges.refetch, vulns.refetch]);

  return { summary, loading, error, refetch };
}
