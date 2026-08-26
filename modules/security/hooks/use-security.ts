/**
 * Security Module React Hooks
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Custom React hooks for accessing security module functionality:
 * - useSecurityStatus: Overall security posture monitoring
 * - useSSLCertificates: Certificate management
 * - useAuditLogs: Security event log access
 * - useComplianceStatus: Compliance checking
 * - useAccessPolicies: Access control management
 * - useSecurityDashboard: Combined dashboard hook
 * 
 * @module security/hooks
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  SecurityPosture,
  Certificate,
  AuditLogEntry,
  ComplianceReport,
  Vulnerability,
  FirewallRule,
  IPListEntry,
  AccessPolicy as AccessPolicyType,
  SSLScanResult,
  TLSConfiguration,
  SecurityHeadersConfiguration,
} from '../types/security.types';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Common hook return type */
interface HookReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Paginated data type */
interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Filter options */
interface FilterOptions {
  search?: string;
  status?: string;
  severity?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// API Helper Functions
// ============================================================================

const API_BASE = '/api/security';

/** Generic fetch wrapper with error handling */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown API error');
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// useSecurityStatus Hook
// ============================================================================

/**
 * Hook for fetching and managing overall security posture status.
 * Provides real-time security score, critical issues, and recommendations.
 * 
 * @param options - Configuration options
 * @returns Security posture data with loading/error states
 * 
 * @example
 * ```tsx
 * const { data, loading, error } = useSecurityStatus({ refreshInterval: 30000 });
 * 
 * if (data) {
 *   console.log('Security Score:', data.overallScore);
 *   console.log('Grade:', data.grade);
 * }
 * ```
 */
export function useSecurityStatus(options?: {
  refreshInterval?: number;
  autoRefresh?: boolean;
}): HookReturn<SecurityPosture> {
  const [data, setData] = useState<SecurityPosture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<SecurityPosture>('/audit?action=posture');

    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || 'Failed to fetch security status');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    if (options?.autoRefresh && options.refreshInterval) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.autoRefresh, options?.refreshInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// useSSLCertificates Hook
// ============================================================================

/**
 * Hook for managing SSL/TLS certificates.
 * Supports listing, filtering, and certificate status monitoring.
 * 
 * @param options - Filter and pagination options
 * @returns Certificate data with CRUD operations
 * 
 * @example
 * ```tsx
 * const { data, loading, refetch } = useSSLCertificates({ status: 'expiring_soon' });
 * ```
 */
export function useSSLCertificates(options?: FilterOptions & {
  type?: string;
}): HookReturn<PaginatedData<Certificate>> & {
  status: { total: number; valid: number; expiringSoon: number; expired: number } | null;
  generateCSR: (data: { commonName: string; organization: string; country: string }) => Promise<any>;
  installCertificate: (certData: { certificate: string; privateKey: string }) => Promise<boolean>;
} {
  const [data, setData] = useState<PaginatedData<Certificate> | null>(null);
  const [status, setStatus] = useState<{
    total: number; valid: number; expiringSoon: number; expired: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch certificates list
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.type) params.set('type', options.type);
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize || 10));

    const result = await apiFetch<{ certificates: Certificate[]; pagination: any }>(
      `/ssl?action=certificates&${params.toString()}`
    );

    if (result.success && result.data) {
      setData({
        items: result.data.certificates,
        totalCount: result.data.pagination.totalCount,
        page: result.data.pagination.page,
        pageSize: result.data.pagination.pageSize,
        totalPages: result.data.pagination.totalPages,
      });
    } else {
      setError(result.error || 'Failed to fetch certificates');
    }

    // Fetch status summary
    const statusResult = await apiFetch<any>('/ssl?action=status');
    if (statusResult.success && statusResult.data) {
      setStatus(statusResult.data.summary);
    }

    setLoading(false);
  }, [options?.status, options?.type, options?.page, options?.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Generate a new CSR */
  const generateCSR = useCallback(async (csrData: {
    commonName: string;
    organization: string;
    country: string;
  }) => {
    const result = await apiFetch('/ssl?action=generate-csr', {
      method: 'POST',
      body: JSON.stringify(csrData),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate CSR');
    }

    return result.data;
  }, []);

  /** Install a new certificate */
  const installCertificate = useCallback(async (certData: {
    certificate: string;
    privateKey: string;
    chainCertificates?: string[];
  }): Promise<boolean> => {
    const result = await apiFetch('/ssl?action=install', {
      method: 'POST',
      body: JSON.stringify(certData),
    });

    if (result.success) {
      await fetchData(); // Refresh list
      return true;
    }

    throw new Error(result.error || 'Failed to install certificate');
  }, [fetchData]);

  return {
    data,
    status,
    loading,
    error,
    refetch: fetchData,
    generateCSR,
    installCertificate,
  };
}

// ============================================================================
// useAuditLogs Hook
// ============================================================================

/**
 * Hook for accessing and filtering security audit logs.
 * Provides real-time log streaming and advanced filtering capabilities.
 * 
 * @param options - Filter options for logs
 * @returns Audit log data with filtering support
 * 
 * @example
 * ```tsx
 * const { data, loading } = useAuditLogs({
 *   category: 'authentication',
 *   severity: 'critical',
 *   startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 * });
 * ```
 */
export function useAuditLogs(
  options?: FilterOptions & {
    category?: string;
    severity?: string;
    outcome?: string;
  }
): HookReturn<PaginatedData<AuditLogEntry>> & {
  statistics: Record<string, any> | null;
  recordEvent: (event: Partial<AuditLogEntry>) => Promise<AuditLogEntry>;
} {
  const [data, setData] = useState<PaginatedData<AuditLogEntry> | null>(null);
  const [statistics, setStatistics] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('action', 'logs');

    if (options?.category) params.set('category', options.category);
    if (options?.severity) params.set('severity', options.severity);
    if ((options as any)?.outcome) params.set('outcome', (options as any).outcome);
    if (options?.search) params.set('search', options.search);
    if (options?.startDate) params.set('startDate', options.startDate.toISOString());
    if (options?.endDate) params.set('endDate', options.endDate.toISOString());
    if (options?.page) params.set('page', String(options.page || 1));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize || 50));

    const result = await apiFetch<{
      logs: AuditLogEntry[];
      pagination: any;
      statistics: any;
    }>(`/audit?${params.toString()}`);

    if (result.success && result.data) {
      setData({
        items: result.data.logs,
        totalCount: result.data.pagination.totalCount,
        page: result.data.pagination.page,
        pageSize: result.data.pagination.pageSize,
        totalPages: result.data.pagination.totalPages,
      });
      setStatistics(result.data.statistics);
    } else {
      setError(result.error || 'Failed to fetch audit logs');
    }

    setLoading(false);
  }, [
    options?.category,
    options?.severity,
    options?.search,
    options?.page,
    options?.pageSize,
    options?.startDate,
    options?.endDate,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Record a new audit event */
  const recordEvent = useCallback(async (
    event: Partial<AuditLogEntry>
  ): Promise<AuditLogEntry> => {
    const result = await apiFetch<AuditLogEntry>('/audit?action=log', {
      method: 'POST',
      body: JSON.stringify(event),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to record audit event');
    }

    await fetchData(); // Refresh logs
    return result.data!;
  }, [fetchData]);

  return {
    data,
    statistics,
    loading,
    error,
    refetch: fetchData,
    recordEvent,
  };
}

// ============================================================================
// useComplianceStatus Hook
// ============================================================================

/**
 * Hook for compliance status monitoring across multiple frameworks.
 * Supports CIS Controls, NIST SP 800-53, ISO 27001, and more.
 * 
 * @param framework - Compliance framework to check
 * @returns Compliance report data
 * 
 * @example
 * ```tsx
 * const { data, loading } = useComplianceStatus('CIS_Controls_v8');
 * 
 * if (data) {
 *   console.log('Compliance Score:', data.score);
 *   console.log('Passed:', data.summary.passed);
 * }
 * ```
 */
export function useComplianceStatus(
  framework: string = 'CIS_Controls_v8'
): HookReturn<ComplianceReport> & {
  runCheck: () => Promise<void>;
  supportedFrameworks: string[];
} {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supportedFrameworks = useMemo(() => [
    'CIS_Controls_v8',
    'CIS_Benchmark_Linux',
    'CIS_Benchmark_Docker',
    'NIST_SP_800_53',
    'NIST_Cybersecurity_Framework',
    'ISO_27001',
    'ISO_27002',
    'PCI_DSS',
    'SOC2',
    'HIPAA',
    'GDPR',
    'ANSSI',
  ], []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<ComplianceReport>(
      `/audit?action=compliance&framework=${framework}`
    );

    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || 'Failed to fetch compliance status');
    }

    setLoading(false);
  }, [framework]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Trigger a fresh compliance check */
  const runCheck = useCallback(async () => {
    setLoading(true);

    const result = await apiFetch<any>('/audit?action=compliance/run', {
      method: 'POST',
    });

    if (result.success) {
      // Re-fetch after check completes
      await fetchData();
    } else {
      setError(result.error || 'Failed to run compliance check');
      setLoading(false);
    }
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    runCheck,
    supportedFrameworks,
  };
}

// ============================================================================
// useAccessPolicies Hook
// ============================================================================

/**
 * Hook for managing access control policies, firewall rules, and IP lists.
 * Provides comprehensive RBAC management interface.
 * 
 * @param section - Section to manage (policies, firewall, ip-lists)
 * @returns Access control data with CRUD operations
 * 
 * @example
 * ```tsx
 * const { policies, createPolicy, deletePolicy } = useAccessPolicies('policies');
 * 
 * // Create new policy
 * await createPolicy({ name: 'New Policy', effect: 'allow' });
 * ```
 */
export function useAccessPolicies(section: 'policies' | 'firewall' | 'ip-blocklist' | 'ip-whitelist' | 'roles' = 'policies') {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    let action: string;
    switch (section) {
      case 'firewall':
        action = 'firewall-rules';
        break;
      case 'ip-blocklist':
        action = 'ip-blocklist';
        break;
      case 'ip-whitelist':
        action = 'ip-whitelist';
        break;
      case 'roles':
        action = 'roles';
        break;
      default:
        action = 'policies';
    }

    const result = await apiFetch(`/access?action=${action}`);

    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error || `Failed to fetch ${section}`);
    }

    setLoading(false);
  }, [section]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Create a new entry */
  const create = useCallback(async (entryData: any) => {
    let action: string;
    switch (section) {
      case 'firewall':
        action = 'firewall-rules';
        break;
      case 'ip-blocklist':
        action = 'ip-blocklist';
        break;
      case 'ip-whitelist':
        action = 'ip-whitelist';
        break;
      default:
        action = 'policies';
    }

    const result = await apiFetch(`/access?action=${action}`, {
      method: 'POST',
      body: JSON.stringify(entryData),
    });

    if (!result.success) {
      throw new Error(result.error || `Failed to create ${section.slice(0, -1)}`);
    }

    await fetchData();
    return result.data;
  }, [section, fetchData]);

  /** Update an existing entry */
  const update = useCallback(async (id: string, updates: any) => {
    const result = await apiFetch(`/access?action=${section}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    });

    if (!result.success) {
      throw new Error(result.error || `Failed to update ${section.slice(0, -1)}`);
    }

    await fetchData();
    return result.data;
  }, [section, fetchData]);

  /** Delete an entry */
  const remove = useCallback(async (id: string) => {
    const result = await apiFetch(`/access?action=${section}&id=${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      throw new Error(result.error || `Failed to delete ${section.slice(0, -1)}`);
    }

    await fetchData();
    return result.data;
  }, [section, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    create,
    update,
    delete: remove,
  };
}

// ============================================================================
// useVulnerabilities Hook
// ============================================================================

/**
 * Hook for vulnerability management and tracking.
 * Provides vulnerability scanning results and remediation tracking.
 * 
 * @param options - Filter options
 * @returns Vulnerability data with status tracking
 */
export function useVulnerabilities(options?: FilterOptions & {
  severity?: string;
  status?: string;
}) {
  const [data, setData] = useState<PaginatedData<Vulnerability> | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (options?.severity) params.set('severity', options.severity);
    if ((options as any)?.status) params.set('status', (options as any).status);
    if (options?.page) params.set('page', String(options.page || 1));
    if (options?.pageSize) params.set('pageSize', String(options.pageSize || 20));

    const result = await apiFetch<{
      vulnerabilities: Vulnerability[];
      summary: any;
      pagination: any;
    }>(`/audit?action=vulnerabilities&${params.toString()}`);

    if (result.success && result.data) {
      setData({
        items: result.data.vulnerabilities,
        totalCount: result.data.pagination.totalCount,
        page: result.data.pagination.page,
        pageSize: result.data.pagination.pageSize,
        totalPages: result.data.pagination.totalPages,
      });
      setSummary(result.data.summary);
    } else {
      setError(result.error || 'Failed to fetch vulnerabilities');
    }

    setLoading(false);
  }, [options?.severity, (options as any)?.status, options?.page, options?.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Trigger a new security scan */
  const triggerScan = useCallback(async (scanType: string = 'full') => {
    const result = await apiFetch('/audit?action=scan', {
      method: 'POST',
      body: JSON.stringify({ scanType }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to trigger scan');
    }

    return result.data;
  }, []);

  return {
    data,
    summary,
    loading,
    error,
    refetch: fetchData,
    triggerScan,
  };
}

// ============================================================================
// useSSLConfig Hook
// ============================================================================

/**
 * Hook for TLS configuration management.
 * Allows viewing and updating TLS settings.
 */
export function useSSLConfig() {
  const [config, setConfig] = useState<TLSConfiguration | null>(null);
  const [scanResult, setScanResult] = useState<SSLScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<TLSConfiguration>('/ssl?action=config');

    if (result.success && result.data) {
      setConfig(result.data);
    } else {
      setError(result.error || 'Failed to fetch TLS config');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  /** Update TLS configuration */
  const updateConfig = useCallback(async (updates: Partial<TLSConfiguration>) => {
    const result = await apiFetch<TLSConfiguration>('/ssl', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (result.success && result.data) {
      setConfig(result.data);
      return result.data;
    }

    throw new Error(result.error || 'Failed to update TLS config');
  }, []);

  /** Run SSL/TLS scan */
  const runScan = useCallback(async (host?: string, port?: number) => {
    const params = new URLSearchParams({ action: 'scan' });
    if (host) params.set('host', host);
    if (port) params.set('host', String(port));

    const result = await apiFetch<SSLScanResult>(`/ssl?${params.toString()}`);

    if (result.success && result.data) {
      setScanResult(result.data);
      return result.data;
    }

    throw new Error(result.error || 'Failed to run SSL scan');
  }, []);

  return {
    config,
    scanResult,
    loading,
    error,
    refetch: fetchConfig,
    updateConfig,
    runScan,
  };
}

// ============================================================================
// useSecurityHeaders Hook
// ============================================================================

/**
 * Hook for security headers configuration and validation.
 */
export function useSecurityHeaders() {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [config, setConfig] = useState<SecurityHeadersConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeaders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<{
      headers: Record<string, string>;
      configuration: SecurityHeadersConfiguration;
    }>('/headers');

    if (result.success && result.data) {
      setHeaders(result.data.headers);
      setConfig(result.data.configuration);
    } else {
      setError(result.error || 'Failed to fetch security headers');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHeaders();
  }, [fetchHeaders]);

  /** Validate external headers */
  const validateHeaders = useCallback(async (headersToValidate: Record<string, string>) => {
    const result = await apiFetch('/headers', {
      method: 'POST',
      body: JSON.stringify({ headers: headersToValidate }),
    });

    return result;
  }, []);

  return {
    headers,
    config,
    loading,
    error,
    refetch: fetchHeaders,
    validateHeaders,
  };
}

// ============================================================================
// useSecurityDashboard Hook (Combined)
// ============================================================================

/**
 * Combined hook that aggregates all security module data for the main dashboard.
 * Optimized for single dashboard view with minimal API calls.
 * 
 * @param options - Dashboard configuration options
 * @returns Complete security dashboard data
 * 
 * @example
 * ```tsx
 * const { posture, certificates, recentAlerts, compliance, loading } = useSecurityDashboard();
 * 
 * if (!loading) {
 *   return <SecurityDashboard data={...} />;
 * }
 * ```
 */
export function useSecurityDashboard(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [posture, setPosture] = useState<SecurityPosture | null>(null);
  const [certificateStatus, setCertificateStatus] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<number>(0);
  const [complianceScore, setComplianceScore] = useState<number>(0);
  const [vulnerabilityCount, setVulnerabilityCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Parallel fetch all required data
      const [postureResult, certResult, vulnResult, complianceResult] = await Promise.all([
        apiFetch<SecurityPosture>('/audit?action=posture'),
        apiFetch<any>('/ssl?action=status'),
        apiFetch<any>('/audit?action=vulnerabilities'),
        apiFetch<any>('/audit?action=compliance'),
      ]);

      if (postureResult.success && postureResult.data) {
        setPosture(postureResult.data);
      }

      if (certResult.success && certResult.data) {
        setCertificateStatus(certResult.data);
        setRecentAlerts(certResult.data.alerts?.length || 0);
      }

      if (vulnResult.success && vulnResult.data) {
        setVulnerabilityCount(vulnResult.data.summary?.totalTargets || 0);
      }

      if (complianceResult.success && complianceResult.data) {
        setComplianceScore(complianceResult.data.score || 0);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();

    if (options?.autoRefresh && options.refreshInterval) {
      const interval = setInterval(fetchAllData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAllData, options?.autoRefresh, options?.refreshInterval]);

  /** Computed health status */
  const healthStatus = useMemo(() => {
    if (!posture) return 'unknown';

    if (posture.overallScore >= 90) return 'healthy';
    if (posture.overallScore >= 70) return 'warning';
    return 'critical';
  }, [posture]);

  /** Critical issues count */
  const criticalIssuesCount = useMemo(() => {
    return posture?.criticalIssues?.length || 0;
  }, [posture]);

  return {
    // Data
    posture,
    certificateStatus,
    recentAlerts,
    complianceScore,
    vulnerabilityCount,
    criticalIssuesCount,

    // State
    loading,
    error,
    lastUpdated,
    healthStatus,

    // Actions
    refetch: fetchAllData,
  };
}

// Export all hooks
export {
  useSecurityStatus,
  useSSLCertificates,
  useAuditLogs,
  useComplianceStatus,
  useAccessPolicies,
  useVulnerabilities,
  useSSLConfig,
  useSecurityHeaders,
  useSecurityDashboard,
};

// Default export for convenience
export default {
  useSecurityStatus,
  useSSLCertificates,
  useAuditLogs,
  useComplianceStatus,
  useAccessPolicies,
  useVulnerabilities,
  useSSLConfig,
  useSecurityHeaders,
  useSecurityDashboard,
};
