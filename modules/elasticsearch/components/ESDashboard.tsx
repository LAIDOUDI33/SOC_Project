/**
 * Elasticsearch Log Aggregation Pipeline Dashboard Component
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive dashboard with:
 * - Overview: Cluster health, document counts, storage usage
 * - Logs Viewer: Filterable log table with syntax highlighting
 * - Search: Advanced query builder with saved searches
 * - Indices: Index management with size/health indicators
 * - Analytics: Visualizations (timeline, severity breakdown, etc.)
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  ESLogDocument,
  ESClusterHealth,
  ESLogAnalytics,
  ESIndexSummary,
  LogSeverity,
  LogSource,
  SortOrder,
  ESTimeRange,
  ClusterHealthStatus
} from '../types/elasticsearch.types';
import {
  useESDashboard,
  useLogs,
  useClusterHealth,
  useLogAggregations,
  useIndices,
  useSearchResults,
  useSavedSearches,
  ESTimeRange,
  LogSeverity as LogSev
} from '../hooks/use-elasticsearch';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Loading spinner component */
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`}></div>
    </div>
  );
};

/** Error state component */
const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
      <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <p className="text-red-600 font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

/** Health status badge */
const HealthBadge: React.FC<{ status: ClusterHealthStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const config = {
    green: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    red: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' }
  };

  const c = config[status] || config.unknown;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${c.bg} ${c.text} ${sizeClass}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
      {status.toUpperCase()}
    </span>
  );
};

/** Severity badge */
const SeverityBadge: React.FC<{ severity: number }> = ({ severity }) => {
  const config = [
    { level: 0, label: 'EMERGENCY', color: 'bg-purple-100 text-purple-800' },
    { level: 1, label: 'ALERT', color: 'bg-red-100 text-red-800' },
    { level: 2, label: 'CRITICAL', color: 'bg-red-100 text-red-700' },
    { level: 3, label: 'ERROR', color: 'bg-orange-100 text-orange-800' },
    { level: 4, label: 'WARNING', color: 'bg-yellow-100 text-yellow-800' },
    { level: 5, label: 'NOTICE', color: 'bg-blue-100 text-blue-800' },
    { level: 6, label: 'INFO', color: 'bg-gray-100 text-gray-800' },
    { level: 7, label: 'DEBUG', color: 'bg-gray-100 text-gray-600' }
  ];

  const c = config[severity] || config[7];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
};

/** Stat card component */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' | 'stable' };
  subtitle?: string;
  color?: string;
}> = ({ title, value, icon, trend, subtitle, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color]} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <p className="text-white text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-white">
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            {trend.direction === 'up' && (
              <svg className="w-4 h-4 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
            {trend.direction === 'down' && (
              <svg className="w-4 h-4 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span className="text-white/80 text-xs">
              {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

/** Overview Tab Content */
const OverviewTab: React.FC<{
  clusterHealth: ESClusterHealth | null;
  recentLogs: ESLogDocument[];
  analytics: ESLogAnalytics | null;
  indicesSummary: any;
  loading: boolean;
}> = ({ clusterHealth, recentLogs, analytics, indicesSummary, loading }) => {
  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Cluster Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cluster Status"
          value={
            <HealthBadge status={clusterHealth?.status || 'unknown'} />
          }
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color={clusterHealth?.status === 'green' ? 'green' : clusterHealth?.status === 'yellow' ? 'yellow' : 'red'}
          subtitle={`${clusterHealth?.number_of_nodes || 0} nodes`}
        />

        <StatCard
          title="Total Documents"
          value={indicesSummary?.totalDocs?.toLocaleString() || '0'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          color="blue"
          subtitle={`${indicesSummary?.total || 0} indices`}
        />

        <StatCard
          title="Storage Used"
          value={indicesSummary?.totalSize || '0 B'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
          color="indigo"
        />

        <StatCard
          title "Events/Second"
          value={analytics?.avg_events_per_second?.toLocaleString() || '0'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          color="purple"
          subtitle={`Peak: ${analytics?.peak_events_per_second?.toLocaleString() || '0'}`}
        />
      </div>

      {/* Recent Critical Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Recent Critical Alerts</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No recent alerts</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log._id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <SeverityBadge severity={log._source?.event?.severity || 0} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(log._source?.message || '').substring(0, 150)}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{log._source?.host?.name}</span>
                      <span>{log._source?.source?.ip}</span>
                      <span>{new Date(log._source!['@timestamp']).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Log Sources Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics?.by_source || {}).slice(0, 6).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{source.replace('-', ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / (analytics?.by_source ? Object.values(analytics.by_source).reduce((a, b) => a + b, 0) : 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">{count.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Index Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Index Health Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-800">Healthy</span>
              </div>
              <span className="text-sm font-bold text-green-900">{indicesSummary?.healthDist?.green || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-yellow-800">Warnings</span>
              </div>
              <span className="text-sm font-bold text-yellow-900">{indicesSummary?.healthDist?.yellow || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-red-800">Issues</span>
              </div>
              <span className="text-sm font-bold text-red-900">{indicesSummary?.healthDist?.red || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Logs Viewer Tab Content */
const LogsViewerTab: React.FC = () => {
  const { logs, total, loading, error, setFilter, aggregations, currentPage, totalPages, setPage } = useLogs({
    time_range: ESTimeRange.LAST_24_HOURS,
    page_size: 20
  });

  const [selectedLog, setSelectedLog] = useState<ESLogDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(log =>
      log._source?.message?.toLowerCase().includes(term) ||
      log._source?.host?.name?.toLowerCase().includes(term) ||
      log._source?.source?.ip?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search in logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            onChange={(e) => setFilter({ time_range: e.target.value as ESTimeRange })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            defaultValue={ESTimeRange.LAST_24_HOURS}
          >
            <option value="">Time Range</option>
            <option value={ESTimeRange.LAST_15_MINUTES}>Last 15 minutes</option>
            <option value={ESTimeRange.LAST_30_MINUTES}>Last 30 minutes</option>
            <option value={ESTimeRange.LAST_HOUR}>Last hour</option>
            <option value={ESTimeRange.LAST_6_HOURS}>Last 6 hours</option>
            <option value={ESTimeRange.LAST_12_HOURS}>Last 12 hours</option>
            <option value={ESTimeRange.LAST_24_HOURS}>Last 24 hours</option>
            <option value={ESTimeRange.LAST_7_DAYS}>Last 7 days</option>
          </select>
          <select
            onChange={(e) => setFilter({ sources: [e.target.value as LogSource] })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            <option value={LogSource.WAZUH}>Wazuh</option>
            <option value={LogSource.SURICATA}>Suricata</option>
            <option value={LogSource.MISP}>MISP</option>
            <option value={LogSource.FIREWALL}>Firewall</option>
            <option value={LogSource.SYSTEM}>System</option>
            <option value={LogSource.AUDIT}>Audit</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => {}} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPs</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log._source!['@timestamp']).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SeverityBadge severity={log._source?.event?.severity || 0} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log._source?.event?.module || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log._source?.host?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                        {log._source?.message?.substring(0, 100) || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className="mr-2">→{log._source?.source?.ip}</span>
                        <span>→{log._source?.destination?.ip}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {filteredLogs.length} of {total.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Detail Panel */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedLog._source!['@timestamp']).toISOString()}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Index</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog._index}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Severity</label>
                  <div className="mt-1"><SeverityBadge severity={selectedLog._source?.event?.severity || 0} /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Source IP</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog._source?.source?.ip}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Destination IP</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog._source?.destination?.ip}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Host</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog._source?.host?.name}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Message</label>
                <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-800 overflow-auto max-h-48">
                  {selectedLog._source?.message}
                </pre>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Raw Log</label>
                <pre className="mt-1 p-3 bg-gray-900 rounded-lg text-sm text-green-400 overflow-auto max-h-48">
                  {JSON.stringify(selectedLog._source, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Search Tab Content */
const SearchTab: React.FC = () => {
  const { results, totalHits, executeSearch, isSearching } = useSearchResults();
  const { searches, saveSearch, deleteSearch } = useSavedSearches();
  const [queryText, setQueryText] = useState('');
  const [selectedIndexPattern, setSelectedIndexPattern] = useState('*');

  const handleSearch = async () => {
    await executeSearch({
      index: selectedIndexPattern,
      query: queryText ? { query_string: { query: queryText } } : { match_all: {} },
      size: 50,
      sort: [{ '@timestamp': { order: 'desc' } }]
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Builder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Advanced Search</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={selectedIndexPattern}
              onChange={(e) => setSelectedIndexPattern(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="*">All Indices</option>
              <option value="wazuh-alerts-*">Wazuh Alerts</option>
              <option value="suricata-*">Suricata Events</option>
              <option value="firewall-*">Firewall Logs</option>
              <option value="syslog-*">Syslog</option>
              <option value="audit-*">Audit Logs</option>
            </select>
            <input
              type="text"
              placeholder="Enter Lucene query or search terms..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSearching && <LoadingSpinner size="sm" />}
              Search
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {['severity:>=6', '_exists_:threat.indicator', 'event.category:authentication', 'source.ip:*'].map((filter) => (
              <button
                key={filter}
                onClick={() => setQueryText(prev => prev ? `${prev} AND ${filter}` : filter)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Searches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Saved Searches</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {searches?.map((search) => (
            <div key={search.id} className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                 onClick={() => {
                   setQueryText(JSON.stringify(search.query));
                   setSelectedIndexPattern(search.indexPattern);
                 }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{search.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{search.description}</p>
                </div>
                <span className="text-xs text-gray-400">{search.hits} hits</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {results && results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Search Results</h3>
            <span className="text-sm text-gray-500">{totalHits.toLocaleString()} hits</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
            {results.map((result, idx) => (
              <div key={idx} className="px-6 py-3 hover:bg-gray-50">
                <p className="text-sm text-gray-900">{result.message || JSON.stringify(result).substring(0, 200)}</p>
                <p className="text-xs text-gray-500 mt-1">{result['@timestamp']}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Indices Tab Content */
const IndicesTab: React.FC = () => {
  const { indices, totalCount, totalDocuments, totalSizeBytes, healthDistribution, refreshIndices, loading } = useIndices();

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Indices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Documents</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalDocuments?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Size</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatBytes(totalSizeBytes)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Health Status</p>
          <div className="flex items-center gap-2 mt-2">
            <HealthBadge status="green" size="sm" />
            <span className="text-sm font-medium">{healthDistribution.green}</span>
            <HealthBadge status="yellow" size="sm" />
            <span className="text-sm font-medium">{healthDistribution.yellow}</span>
            <HealthBadge status="red" size="sm" />
            <span className="text-sm font-medium">{healthDistribution.red}</span>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={refreshIndices}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Indices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Index Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Docs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shards</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ILM Phase</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {indices.map((idx) => (
                <tr key={idx.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{idx.name}</td>
                  <td className="px-4 py-3"><HealthBadge status={idx.health} size="sm" /></td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{idx.document_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{idx.size}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">
                    {idx.primary_shards}/{idx.replica_shards}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{idx.ilm_phase || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/** Analytics Tab Content */
const AnalyticsTab: React.FC = () => {
  const { timelineData, severityBreakdown, sourceBreakdown, topHosts, topIPs, uniqueIPs, uniqueHosts, avgEventsPerSecond, timeRange, setTimeRange, loading } = useLogAggregations();

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex flex-wrap gap-2">
            {[ESTimeRange.LAST_HOUR, ESTimeRange.LAST_6_HOURS, ESTimeRange.LAST_12_HOURS, ESTimeRange.LAST_24_HOURS, ESTimeRange.LAST_7_DAYS].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range.replace('now-', '').replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg Events/Sec</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{avgEventsPerSecond.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Unique IPs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueIPs.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Unique Hosts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueHosts}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Timeline Points</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{timelineData.length}</p>
        </div>
      </div>

      {/* Charts Placeholder Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Events Timeline</h3>
          <div className="h-64 flex items-end gap-1">
            {timelineData.slice(-20).map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                style={{ height: `${Math.max(5, (point.count / Math.max(...timelineData.map(p => p.count))) * 100)}%` }}
                title={`${point.timestamp}: ${point.count} events`}
              ></div>
            ))}
          </div>
        </div>

        {/* Severity Breakdown Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Severity Distribution</h3>
          <div className="space-y-3">
            {Object.entries(severityBreakdown).sort(([,a], [,b]) => Number(b) - Number(a)).slice(0, 6).map(([severity, count]) => {
              const colors: Record<string, string> = {
                '0': 'bg-purple-500', '1': 'bg-red-500', '2': 'bg-red-400',
                '3': 'bg-orange-500', '4': 'bg-yellow-500', '5': 'bg-blue-500'
              };
              const labels: Record<string, string> = {
                '0': 'Emergency', '1': 'Alert', '2': 'Critical',
                '3': 'Error', '4': 'Warning', '5': 'Notice'
              };
              const total = Object.values(severityBreakdown).reduce((a, b) => Number(a) + Number(b), 0);

              return (
                <div key={severity} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-600">{labels[severity] || severity}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${colors[severity] || 'bg-gray-500'}`}
                      style={{ width: `${(Number(count) / total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="w-16 text-sm font-medium text-gray-900 text-right">{Number(count).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Hosts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Hosts by Event Count</h3>
          <div className="space-y-2">
            {topHosts.slice(0, 10).map((host, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {i + 1}
                  </span>
                  <span className="text-sm font-mono text-gray-900">{host.host}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{host.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top IPs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top IPs</h3>
          <div className="space-y-2">
            {topIPs.slice(0, 10).map((ip, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ip.direction === 'src' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  <span className="text-sm font-mono text-gray-900">{ip.ip}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{ip.direction.toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{ip.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface ESDashboardProps {
  /** Initial tab to show */
  defaultTab?: 'overview' | 'logs' | 'search' | 'indices' | 'analytics';
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Show header section */
  showHeader?: boolean;
  /** Custom class name */
  className?: string;
}

type TabId = 'overview' | 'logs' | 'search' | 'indices' | 'analytics';

/**
 * Main Elasticsearch Dashboard Component
 * 
 * @example
 * ```tsx
 * <ESDashboard defaultTab="overview" refreshInterval={15000} />
 * ```
 */
export const ESDashboard: React.FC<ESDashboardProps> = ({
  defaultTab = 'overview',
  refreshInterval = 30000,
  showHeader = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Get dashboard data using combined hook
  const {
    clusterHealth,
    recentLogs,
    highPriorityAlerts,
    analytics,
    loading,
    error,
    refetchAll,
    setRefreshInterval
  } = useESDashboard({
    refreshInterval,
    enableGeoMap: false,
    enableTrends: true
  });

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1 1v12a1 1 0 001 1h16a1 1 0 001-1V6a1 1 0 01-1-1H4z M4 3h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      )
    },
    {
      id: 'logs',
      label: 'Logs Viewer',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'indices',
      label: 'Indices',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            clusterHealth={clusterHealth}
            recentLogs={recentLogs}
            analytics={analytics}
            indicesSummary={undefined}
            loading={loading}
          />
        );
      case 'logs':
        return <LogsViewerTab />;
      case 'search':
        return <SearchTab />;
      case 'indices':
        return <IndicesTab />;
      case 'analytics':
        return <AnalyticsTab />;
      default:
        return <OverviewTab clusterHealth={null} recentLogs={[]} analytics={null} indicesSummary={undefined} loading={false} />;
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {showHeader && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Elasticsearch Dashboard</h1>
                  <p className="text-sm text-gray-500">Log Aggregation Pipeline - National SOC Platform</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {clusterHealth && (
                  <div className="flex items-center gap-2">
                    <HealthBadge status={clusterHealth.status} />
                    <span className="text-sm text-gray-500">
                      {clusterHealth.number_of_nodes} nodes • {clusterHealth.active_shards} shards
                    </span>
                  </div>
                )}

                <button
                  onClick={refetchAll}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh all data"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-t border-gray-200">
            <nav className="-mb-px flex space-x-8 px-4 sm:px-6 lg:px-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <ErrorState message={error} onRetry={refetchAll} />
        ) : (
          renderTabContent()
        )}
      </main>
    </div>
  );
};

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

export default ESDashboard;
