/**
 * Grafana Monitoring Dashboard Component
 * Algeria National SOC Platform 2026-2030
 * 
 * Comprehensive dashboard with:
 * - Overview: System health, active alerts count, datasource status
 * - Dashboards: Grid/list view of available dashboards with search
 * - Alerts: Alert rules table with pause/toggle actions
 * - Data Sources: Status overview with connection testing
 * - Embedded View: Iframe-based dashboard embedding
 * - SOC Pre-built: Showcase pre-configured SOC dashboards
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  useGrafanaDashboard,
  useDashboards,
  useAlertRules,
  useDataSources,
  useDashboardView,
} from '../hooks/use-grafana';
import type {
  DashboardSearchResult,
  AlertRule,
  DataSource,
  SOCKpiMetric,
  TimelineEvent,
  PanelType,
  AlertState,
} from '../types/grafana.types';

// ============================================================
// Sub-Components
// ============================================================

/** Loading spinner component */
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; message?: string }> = ({ 
  size = 'md', 
  message = 'Loading...' 
}) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`}></div>
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  );
};

/** Error state component */
const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-red-500">
    <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <p className="font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Retry
      </button>
    )}
  </div>
);

/** Status badge component */
const StatusBadge: React.FC<{ status: string; variant?: 'default' | 'dot' }> = ({ status, variant = 'default' }) => {
  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'ok':
      case 'healthy':
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'alerting':
      case 'critical':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
      case 'unknown':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getDotColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'ok':
      case 'healthy':
      case 'good':
        return 'bg-green-500';
      case 'alerting':
      case 'critical':
      case 'error':
        return 'bg-red-500';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-500';
      case 'paused':
      case 'unknown':
        return 'bg-gray-400';
      default:
        return 'bg-blue-500';
    }
  };

  if (variant === 'dot') {
    return (
      <span className={`inline-flex items-center gap-1.5`}>
        <span className={`w-2 h-2 rounded-full ${getDotColor(status)}`}></span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
          {status}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

/** Severity badge */
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white',
    none: 'bg-gray-300 text-gray-700',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${colors[severity] || colors.none}`}>
      {severity}
    </span>
  );
};

/** KPI Card Component */
const KPICard: React.FC<{
  metric: SOCKpiMetric;
  onClick?: () => void;
}> = ({ metric, onClick }) => {
  const getTrendIcon = () => {
    if (metric.trend === 'up') {
      return metric.status === 'good' ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (metric.trend === 'down') {
      return metric.status === 'good' ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    );
  };

  const getCardBorder = () => {
    switch (metric.status) {
      case 'critical': return 'border-l-4 border-l-red-500';
      case 'warning': return 'border-l-4 border-l-yellow-500';
      case 'good': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-blue-500';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer ${getCardBorder()}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{metric.name}</p>
        {getTrendIcon()}
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{metric.currentValue.toLocaleString()}</span>
        <span className="text-sm text-gray-500">{metric.unit}</span>
      </div>

      {metric.trendPercent !== undefined && (
        <p className={`text-xs mt-1 ${
          (metric.trend === 'up' && metric.status !== 'good') || (metric.trend === 'down' && metric.status === 'good')
            ? 'text-green-600'
            : 'text-red-600'
        }`}>
          {metric.trend === 'stable' ? 'No change' : `${metric.trend > 0 ? '+' : ''}${metric.trendPercent}%`}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2">Source: {metric.sourceSystem}</p>
    </div>
  );
};

// ============================================================
// Tab Content Components
// ============================================================

/** Overview Tab Content */
const OverviewTabContent: React.FC<{
  kpis: SOCKpiMetric[];
  timelineEvents: TimelineEvent[];
  systemStatus: 'healthy' | 'degraded' | 'critical';
}> = ({ kpis, timelineEvents, systemStatus }) => {
  const [showAllKpis, setShowAllKpis] = useState(false);
  const displayedKpis = showAllKpis ? kpis : kpis.slice(0, 6);

  const getStatusBanner = () => {
    switch (systemStatus) {
      case 'critical':
        return (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-800">System Status: Critical</h3>
              <p className="text-sm text-red-600">Multiple critical alerts are firing. Immediate attention required.</p>
            </div>
          </div>
        );
      case 'degraded':
        return (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">System Status: Degraded</h3>
              <p className="text-sm text-yellow-600">Some components require attention. Monitor closely.</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">System Status: Healthy</h3>
              <p className="text-sm text-green-600">All systems operating normally.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {getStatusBanner()}

      {/* KPI Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Key Performance Indicators</h2>
          <button
            onClick={() => setShowAllKpis(!showAllKpis)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAllKpis ? 'Show Less' : `Show All (${kpis.length})`}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedKpis.map(kpi => (
            <KPICard key={kpi.id} metric={kpi} />
          ))}
        </div>
      </section>

      {/* Recent Activity Timeline */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {timelineEvents.map((event, index) => (
              <li key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'high' ? 'bg-orange-500' :
                    event.severity === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                      <SeverityBadge severity={event.severity} />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      <span className="uppercase px-1.5 py-0.5 bg-gray-100 rounded">{event.source}</span>
                      <span className="uppercase px-1.5 py-0.5 bg-gray-100 rounded">{event.type}</span>
                    </div>
                  </div>

                  {event.url && (
                    <a
                      href={event.url}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

/** Dashboards Tab Content */
const DashboardsTabContent: React.FC<{
  dashboards: DashboardSearchResult[] | null;
  loading: boolean;
  error: string | null;
  total: number;
  onOpenDashboard?: (uid: string) => void;
}> = ({ dashboards, loading, error, total, onOpenDashboard }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    if (!dashboards) return [];
    const tags = new Set<string>();
    dashboards.forEach(d => d.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [dashboards]);

  // Filter dashboards
  const filteredDashboards = useMemo(() => {
    if (!dashboards) return [];
    
    return dashboards.filter(d => {
      const matchesSearch = !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesTag = !selectedTag || d.tags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [dashboards, searchQuery, selectedTag]);

  if (loading) return <LoadingSpinner message="Loading dashboards..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          <span className="text-sm text-gray-500">{filteredDashboards.length} of {total} dashboards</span>
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              !selectedTag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Tags
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Dashboard Grid/List */}
      {filteredDashboards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No dashboards found matching your criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map(dashboard => (
            <div
              key={dashboard.uid}
              onClick={() => onOpenDashboard?.(dashboard.uid)}
              className="bg-white rounded-lg shadow hover:shadow-md transition-all cursor-pointer p-4 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                    {dashboard.title.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {dashboard.title}
                    </h3>
                    <p className="text-xs text-gray-500">{dashboard.folderTitle}</p>
                  </div>
                </div>
                
                {dashboard.isStarred && (
                  <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {dashboard.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag}
                  </span>
                ))}
                {dashboard.tags.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    +{dashboard.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDashboards.map(dashboard => (
                <tr key={dashboard.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{dashboard.title}</span>
                      {dashboard.isStarred && (
                        <svg className="w-4 h-4 ml-2 text-yellow-400 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dashboard.folderTitle}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {dashboard.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onOpenDashboard?.(dashboard.uid)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/** Alerts Tab Content */
const AlertsTabContent: React.FC<{
  alerts: AlertRule[] | null;
  loading: boolean;
  error: string | null;
  summary: UseAlertRulesReturn['summary'];
  onPause: (uid: string) => Promise<void>;
  onResume: (uid: string) => Promise<void>;
  onTogglePause: (uid: string) => Promise<void>;
}> = ({ alerts, loading, error, summary, onPause, onResume, onTogglePause }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<AlertState | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    
    return alerts.filter(a => {
      const matchesSearch = !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.ruleGroup.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesState = stateFilter === 'all' || a.currentState === stateFilter || (stateFilter === 'paused' && a.isPaused);
      const matchesSeverity = severityFilter === 'all' || a.labels.severity === severityFilter;
      
      return matchesSearch && matchesState && matchesSeverity;
    });
  }, [alerts, searchQuery, stateFilter, severityFilter]);

  /** Handle toggle action */
  const handleToggle = async (uid: string) => {
    setActionInProgress(uid);
    try {
      await onTogglePause(uid);
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading alert rules..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.ok}</p>
          <p className="text-sm text-gray-500">OK</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{summary.alerting}</p>
          <p className="text-sm text-gray-500">Alerting</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{summary.paused}</p>
          <p className="text-sm text-gray-500">Paused</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
          <p className="text-sm text-gray-500">Critical</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{summary.high}</p>
          <p className="text-sm text-gray-500">High</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{summary.warning}</p>
          <p className="text-sm text-gray-500">Warning</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as AlertState | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All States</option>
          <option value="ok">OK</option>
          <option value="alerting">Alerting</option>
          <option value="paused">Paused</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alert Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State Since</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAlerts.map(alert => (
              <tr key={alert.uid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={alert.isPaused ? 'Paused' : alert.currentState} variant="dot" />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{alert.annotations.summary?.substring(0, 80)}...</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <SeverityBadge severity={alert.labels.severity || 'none'} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.ruleGroup}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(alert.stateSince).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => handleToggle(alert.uid)}
                    disabled={actionInProgress === alert.uid}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      alert.isPaused
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    } disabled:opacity-50`}
                  >
                    {actionInProgress === alert.uid ? '...' : alert.isPaused ? 'Resume' : 'Pause'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No alerts match your filters
          </div>
        )}
      </div>
    </div>
  );
};

/** Data Sources Tab Content */
const DataSourcesTabContent: React.FC<{
  datasources: DataSource[] | null;
  loading: boolean;
  error: string | null;
  healthyCount: number;
  unhealthyCount: number;
  onTestConnection: (id: number) => Promise<{ success: boolean; message: string }>;
}> = ({ datasources, loading, error, healthyCount, unhealthyCount, onTestConnection }) => {
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({});

  /** Handle test connection */
  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await onTestConnection(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: err instanceof Error ? err.message : 'Test failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading data sources..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4">
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold">{healthyCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Healthy</p>
            <p className="text-xs text-gray-500">Connections OK</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 font-bold">{unhealthyCount}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Issues</p>
            <p className="text-xs text-gray-500">Needs attention</p>
          </div>
        </div>
      </div>

      {/* Datasource Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {datasources?.map(ds => (
          <div key={ds.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                  ds.type === 'prometheus' ? 'bg-orange-500' :
                  ds.type === 'elasticsearch' ? 'bg-yellow-600' :
                  ds.type === 'loki' ? 'bg-orange-600' :
                  ds.type === 'mysql' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}>
                  {ds.type.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{ds.name}</h3>
                  <p className="text-sm text-gray-500">{ds.type} • {ds.access}</p>
                </div>
              </div>
              
              <StatusBadge status={ds.apiHealthStatus || 'UNKNOWN'} variant="dot" />
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 truncate">{ds.url}</p>
              {ds.lastTestResult && (
                <p className={`text-xs mt-1 ${ds.lastTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {ds.lastTestResult.message}
                </p>
              )}
              {testResults[ds.id] && (
                <p className={`text-xs mt-1 ${testResults[ds.id].success ? 'text-green-600' : 'text-red-600'}`}>
                  Test: {testResults[ds.id].message}
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">Updated: {new Date(ds.updated).toLocaleString()}</span>
              <button
                onClick={() => handleTest(ds.id)}
                disabled={testingId === ds.id}
                className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
              >
                {testingId === ds.id ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {ds.isDefault && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Default</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Embedded View Tab Content */
const EmbeddedViewTabContent: React.FC<{
  dashboardUid: string;
  onDashboardChange: (uid: string) => void;
}> = ({ dashboardUid, onDashboardChange }) => {
  const { embedUrl, isLoading, updateConfig, refresh } = useDashboardView({
    dashboardUid,
    theme: 'dark',
    showToolbar: true,
    showTimePicker: true,
    showHeader: false,
  });

  const availableDashboards = [
    { uid: 'soc-overview', name: 'SOC Overview' },
    { uid: 'wazuh-events', name: 'Wazuh Security Events' },
    { uid: 'suricata-ids', name: 'Suricata IDS/IPS' },
    { uid: 'misp-threat-intel', name: 'MISP Threat Intel' },
    { uid: 'thehive-incidents', name: 'TheHive Incidents' },
    { uid: 'network-traffic', name: 'Network Traffic' },
    { uid: 'system-health', name: 'Infrastructure Health' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Dashboard:</label>
          <select
            value={dashboardUid}
            onChange={(e) => onDashboardChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {availableDashboards.map(d => (
              <option key={d.uid} value={d.uid}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateConfig({ theme: 'dark' })}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Dark
          </button>
          <button
            onClick={() => updateConfig({ theme: 'light' })}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Light
          </button>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 ml-2"
          >
            Open in New Tab
          </a>
        </div>
      </div>

      {/* Embedded iframe container */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative" style={{ minHeight: '700px' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
            <LoadingSpinner size="lg" message="Loading dashboard..." />
          </div>
        )}
        
        <iframe
          src={embedUrl}
          className="w-full border-0"
          style={{ height: '700px' }}
          title="Embedded Grafana Dashboard"
          allow="fullscreen"
          loading="lazy"
        />
      </div>
    </div>
  );
};

// ============================================================
// Pre-built SOC Dashboards Showcase
// ============================================================

interface SOCDashboardConfig {
  uid: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tags: string[];
  panels: number;
  variables: string[];
  previewImage?: string;
}

const PREBUILT_DASHBOARDS: SOCDashboardConfig[] = [
  {
    uid: 'soc-overview',
    name: 'SOC Overview',
    description: 'Comprehensive security operations center overview with KPIs from all integrated systems including Wazuh, Suricata, MISP, and TheHive.',
    icon: '📊',
    category: 'Overview',
    tags: ['soc', 'overview', 'kpi'],
    panels: 12,
    variables: ['timeRange', 'severity'],
  },
  {
    uid: 'security-events',
    name: 'Security Events Analysis',
    description: 'Detailed analysis of security events from Wazuh SIEM with trends, severity breakdown, and top sources/targets.',
    icon: '🔔',
    category: 'SIEM',
    tags: ['wazuh', 'events', 'siem'],
    panels: 16,
    variables: ['timeRange', 'level', 'ruleGroup'],
  },
  {
    uid: 'network-traffic',
    name: 'Network Traffic Monitor',
    description: 'Real-time network traffic analysis from Suricata IDS/IPS with protocol distribution, threat detection, and bandwidth metrics.',
    icon: '🌐',
    category: 'Network',
    tags: ['suricata', 'network', 'ids'],
    panels: 14,
    variables: ['timeRange', 'protocol', 'action'],
  },
  {
    uid: 'threat-intelligence',
    name: 'Threat Intelligence Center',
    description: 'MISP IOC statistics, threat actor tracking, and correlation analysis for proactive threat hunting.',
    icon: '🎯',
    category: 'Threat Intel',
    tags: ['misp', 'ioc', 'threat'],
    panels: 10,
    variables: ['timeRange', 'threatLevel', 'eventType'],
  },
  {
    uid: 'incident-response',
    name: 'Incident Response Metrics',
    description: 'TheHive case management metrics including MTTR, case severity distribution, and analyst workload.',
    icon: '🚨',
    category: 'SOAR',
    tags: ['thehive', 'incidents', 'soar'],
    panels: 12,
    variables: ['timeRange', 'status', 'severity'],
  },
  {
    uid: 'infrastructure-health',
    name: 'Infrastructure Health',
    description: 'System infrastructure monitoring covering CPU, memory, disk, network, and service health across all SOC servers.',
    icon: '💻',
    category: 'Infrastructure',
    tags: ['health', 'monitoring', 'infra'],
    panels: 18,
    variables: ['timeRange', 'host', 'service'],
  },
  {
    uid: 'compliance-dashboard',
    name: 'Compliance & Audit',
    description: 'Security compliance monitoring aligned with ISO 27001, NIST, and Algerian cybersecurity regulations.',
    icon: '✅',
    category: 'Compliance',
    tags: ['compliance', 'audit', 'regulation'],
    panels: 8,
    variables: ['timeRange', 'framework', 'control'],
  },
  {
    uid: 'threat-hunting',
    name: 'Threat Hunting Workspace',
    description: 'Interactive workspace for threat hunters with query builder, IOC lookup, and timeline analysis tools.',
    icon: '🔍',
    category: 'Analysis',
    tags: ['hunting', 'analysis', 'forensics'],
    panels: 6,
    variables: ['timeRange', 'query', 'scope'],
  },
];

/** Pre-built Dashboards Tab Content */
const PrebuiltDashboardsTabContent: React.FC<{
  onSelectDashboard: (uid: string) => void;
}> = ({ onSelectDashboard }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(PREBUILT_DASHBOARDS.map(d => d.category)))];

  const filteredDashboards = selectedCategory === 'all'
    ? PREBUILT_DASHBOARDS
    : PREBUILT_DASHBOARDS.filter(d => d.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Pre-built SOC Dashboards</h2>
        <p className="opacity-90">
          Ready-to-use dashboard configurations designed specifically for Security Operations Centers.
          Each dashboard is optimized for monitoring specific aspects of your security infrastructure.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredDashboards.map(dashboard => (
          <div
            key={dashboard.uid}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {/* Preview Header */}
            <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
              <span className="text-6xl">{dashboard.icon}</span>
              
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                  {dashboard.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{dashboard.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{dashboard.description}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  {dashboard.panels} panels
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {dashboard.variables.length} variables
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {dashboard.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onSelectDashboard(dashboard.uid)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Dashboard
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Import JSON
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Main Grafana Dashboard Component
// ============================================================

type TabId = 'overview' | 'dashboards' | 'alerts' | 'datasources' | 'embedded' | 'prebuilt';

interface GrafanaDashboardProps {
  /** Initial tab to display */
  initialTab?: TabId;
  /** Custom class name */
  className?: string;
  /** Whether to show header */
  showHeader?: boolean;
}

/**
 * Main Grafana Monitoring Dashboard Component
 * 
 * @example
 * ```tsx
 * <GrafanaDashboard initialTab="overview" />
 * ```
 */
export const GrafanaDashboard: React.FC<GrafanaDashboardProps> = ({
  initialTab = 'overview',
  className = '',
  showHeader = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [embeddedDashboardUid, setEmbeddedDashboardUid] = useState<string>('soc-overview');

  // Combined hook for all data
  const {
    stats,
    dashboards,
    alerts,
    datasources,
    isReady,
    hasErrors,
    systemStatus,
    refreshAll,
  } = useGrafanaDashboard();

  /** Tab definitions */
  const tabs: Array<{ id: TabId; label: string; icon: JSX.Element; badge?: number }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      badge: alerts.summary.alerting,
    },
    {
      id: 'datasources',
      label: 'Data Sources',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      badge: datasources.unhealthyCount > 0 ? datasources.unhealthyCount : undefined,
    },
    {
      id: 'embedded',
      label: 'Live View',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'prebuilt',
      label: 'SOC Templates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
  ];

  /** Render active tab content */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTabContent
            kpis={stats.kpis}
            timelineEvents={stats.timelineEvents}
            systemStatus={systemStatus}
          />
        );

      case 'dashboards':
        return (
          <DashboardsTabContent
            dashboards={dashboards.data}
            loading={dashboards.loading}
            error={dashboards.error}
            total={dashboards.total}
            onOpenDashboard={(uid) => {
              setEmbeddedDashboardUid(uid);
              setActiveTab('embedded');
            }}
          />
        );

      case 'alerts':
        return (
          <AlertsTabContent
            alerts={alerts.data}
            loading={alerts.loading}
            error={alerts.error}
            summary={alerts.summary}
            onPause={alerts.pauseAlert}
            onResume={alerts.resumeAlert}
            onTogglePause={alerts.togglePause}
          />
        );

      case 'datasources':
        return (
          <DataSourcesTabContent
            datasources={datasources.data}
            loading={datasources.loading}
            error={datasources.error}
            healthyCount={datasources.healthyCount}
            unhealthyCount={datasources.unhealthyCount}
            onTestConnection={datasources.testConnection}
          />
        );

      case 'embedded':
        return (
          <EmbeddedViewTabContent
            dashboardUid={embeddedDashboardUid}
            onDashboardChange={setEmbeddedDashboardUid}
          />
        );

      case 'prebuilt':
        return (
          <PrebuiltDashboardsTabContent
            onSelectDashboard={(uid) => {
              setEmbeddedDashboardUid(uid);
              setActiveTab('embedded');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Grafana Monitoring</h1>
                  <p className="text-sm text-gray-500">Algeria National SOC Platform</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* System Status Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  systemStatus === 'healthy' ? 'bg-green-100 text-green-800' :
                  systemStatus === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    systemStatus === 'healthy' ? 'bg-green-500' :
                    systemStatus === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></span>
                  {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={refreshAll}
                  disabled={!isReady}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                  title="Refresh all data"
                >
                  <svg className={`w-5 h-5 ${!isReady ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isReady && !hasErrors ? (
          <LoadingSpinner size="lg" message="Loading monitoring data..." />
        ) : (
          renderTabContent()
        )}
      </main>
    </div>
  );
};

export default GrafanaDashboard;

// Export sub-components for standalone use
export {
  OverviewTabContent,
  DashboardsTabContent,
  AlertsTabContent,
  DataSourcesTabContent,
  EmbeddedViewTabContent,
  PrebuiltDashboardsTabContent,
  KPICard,
  StatusBadge,
  SeverityBadge,
};
