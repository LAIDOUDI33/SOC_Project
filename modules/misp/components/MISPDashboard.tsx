/**
 * MISP Threat Intelligence Dashboard
 * Algeria National SOC Platform 2026-2030
 * 
 * Complete threat intelligence interface with:
 * - Overview with key metrics and KPIs
 * - Event management (create, search, publish)
 * - IOC search, validation, and export
 * - Galaxy/threat actor intelligence browser
 * - Feed synchronization status
 * - YARA rule generation
 * - Timeline visualization
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  useMISPStatistics,
  useRecentMISPEvents,
  useMISPIOCs,
  useThreatActors,
  useMITRETactics,
  useTrendingIOCs,
  useMISPFeeds,
  useYARARules,
  useMISPHealth,
} from '../hooks/use-misp';
import type {
  MISPEvent,
  MISPAttribute,
  MISPStatistics,
  GalaxyCluster,
  YARARule,
} from '../types/misp.types';
import { THREAT_LEVELS } from '../types/misp.types';

// ============================================================
// Tab Types
// ============================================================

type MISPTab = 'overview' | 'events' | 'iocs' | 'galaxies' | 'feeds' | 'yara';

// ============================================================
// Utility Components
// ============================================================

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
  color?: string;
  trend?: { value: number; direction: 'up' | 'down' };
}

function StatCard({ title, value, subtitle, icon, color = '#3b82f6', trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-xs ${trend.direction === 'up' ? 'text-red-500' : 'text-green-500'}`}>
              <span>{trend.direction === 'up' ? '↑' : '↓'} {trend.value}%</span>
              <span className="ml-1 text-gray-400">vs last period</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

function Badge({ label, color = '#6b7280', size = 'sm' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`${sizeClasses} rounded-full font-medium`}
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {label}
    </span>
  );
}

// ============================================================
// Loading & Error States
// ============================================================

function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-red-600">
      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================
// Overview Tab Component
// ============================================================

interface OverviewTabProps {
  stats: MISPStatistics;
  health: { healthy: boolean; version: string };
}

function OverviewTab({ stats, health }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Health Status */}
      {!health.healthy && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800">MISP Connection Issue</p>
            <p className="text-sm text-yellow-700">Unable to connect to MISP server. Some data may be stale.</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={stats.events.total}
          subtitle={`${stats.events.published} published`}
          icon="📊"
          color="#3b82f6"
        />
        <StatCard
          title="Active IOCs"
          value={stats.attributes.with_ids}
          subtitle={`of ${stats.attributes.total} total attributes`}
          icon="🎯"
          color="#ef4444"
        />
        <StatCard
          title="Threat Actors Tracked"
          value={stats.threats.top_actors.length}
          subtitle="from MITRE ATT&CK"
          icon="👤"
          color="#f59e0b"
        />
        <StatCard
          title="Active Feeds"
          value={stats.feeds.active}
          subtitle="configured sources"
          icon="📡"
          color="#10b981"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Level Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Threat Level Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats.events.by_threat_level).map(([level, count]) => {
              const levelNum = parseInt(level);
              const config = THREAT_LEVELS[levelNum];
              if (!config) return null;

              const percentage = stats.events.total > 0
                ? Math.round((count / stats.events.total) * 100)
                : 0;

              return (
                <div key={level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{config.label}</span>
                    <span className="text-gray-500">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analysis Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Analysis Status</h3>
          <div className="space-y-3">
            {[
              { key: '0', label: 'Initial', color: '#9ca3af', count: stats.events.by_analysis_status['0'] || 0 },
              { key: '1', label: 'Ongoing', color: '#f59e0b', count: stats.events.by_analysis_status['1'] || 0 },
              { key: '2', label: 'Completed', color: '#10b981', count: stats.events.by_analysis_status['2'] || 0 },
            ].map(({ key, label, color, count }) => {
              const percentage = stats.events.total > 0
                ? Math.round((count / stats.events.total) * 100)
                : 0;

              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg">{count}</span>
                    <span className="text-gray-400 ml-2 text-sm">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Threat Actors */}
      {stats.threats.top_actors.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Threat Actors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.threats.top_actors.slice(0, 9).map((actor, idx) => (
              <div
                key={actor.name}
                className="flex items-center p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <span className="text-2xl font-bold text-red-300 w-8">{idx + 1}</span>
                <div className="ml-3">
                  <p className="font-medium text-red-900">{actor.name}</p>
                  <p className="text-xs text-red-600">{actor.count} events</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending IOCs */}
      {stats.threats.trending_iocs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Trending Indicators of Compromise</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Occurrences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.threats.trending_iocs.slice(0, 10).map((ioc, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge label={ioc.type} color="#ef4444" />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{ioc.value}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-bold">{ioc.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Events Tab Component
// ============================================================

interface EventsTabProps {
  events: MISPEvent[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function EventsTab({ events, loading, error, refetch }: EventsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<MISPEvent | null>(null);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!searchTerm) return events;

    const term = searchTerm.toLowerCase();
    return events.filter(
      event =>
        event.info.toLowerCase().includes(term) ||
        event.id.includes(term) ||
        event.Tag?.some(t => t.name.toLowerCase().includes(term))
    );
  }, [events, searchTerm]);

  if (loading) return <LoadingSpinner message="Loading events..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search events by name, ID, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
          <span className="mr-2">+</span> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events found matching your search.
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedEvent?.id === event.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        label={THREAT_LEVELS[event.threat_level_id]?.label || 'Unknown'}
                        color={THREAT_LEVELS[event.threat_level_id]?.color}
                      />
                      {event.published ? (
                        <Badge label="Published" color="#10b981" />
                      ) : (
                        <Badge label="Draft" color="#9ca3af" />
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 line-clamp-1">{event.info}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Event #{event.id} • {event.date} • {event.orgc?.name || 'Unknown Org'}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {(event.Attribute || []).length} attrs
                    </p>
                    <p className="text-xs text-gray-400">
                      {(event.Tag || []).length} tags
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {event.Tag && event.Tag.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {event.Tag.slice(0, 5).map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: tag.colour + '20',
                          color: tag.colour,
                        }}
                      >
                        {tag.name.replace(/misp-galaxy:[^=]+="/g, '').replace(/"/g, '')}
                      </span>
                    ))}
                    {event.Tag.length > 5 && (
                      <span className="text-xs text-gray-400">+{event.Tag.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Event Detail Panel */}
        <div className="lg:col-span-1">
          {selectedEvent ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
              <h3 className="font-semibold text-lg mb-3">{selectedEvent.info}</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span className="font-mono">{selectedEvent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">UUID:</span>
                  <span className="font-mono text-xs">{selectedEvent.uuid.substring(0, 18)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span>{selectedEvent.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Creator Org:</span>
                  <span>{selectedEvent.orgc?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Threat Level:</span>
                  <Badge
                    label={THREAT_LEVELS[selectedEvent.threat_level_id]?.label}
                    color={THREAT_LEVELS[selectedEvent.threat_level_id]?.color}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Analysis:</span>
                  <span>{
                    selectedEvent.analysis === '0' ? 'Initial' :
                    selectedEvent.analysis === '1' ? 'Ongoing' : 'Completed'
                  }</span>
                </div>
              </div>

              {/* Attributes Preview */}
              {(selectedEvent.Attribute || []).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Attributes ({selectedEvent.Attribute.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {selectedEvent.Attribute.slice(0, 10).map((attr) => (
                      <div key={attr.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                        <span className="font-mono truncate max-w-[150px]" title={attr.value}>{attr.value}</span>
                        <Badge label={attr.type} size="sm" />
                      </div>
                    ))}
                    {selectedEvent.Attribute.length > 10 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{selectedEvent.Attribute.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t space-y-2">
                {!selectedEvent.published && (
                  <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Publish Event
                  </button>
                )}
                <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  View Full Details
                </button>
                <button className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  Export (STIX/JSON/XML)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-8 text-center sticky top-4">
              <p className="text-gray-500">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IOCs Tab Component
// ============================================================

interface IOCsTabProps {
  iocs: MISPAttribute[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  validateIOCs: (values: string[]) => Promise<any[]>;
}

function IOCsTab({ iocs, loading, error, refetch, validateIOCs }: IOCsTabProps) {
  const [filterType, setFilterType] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');
  const [validationResults, setValidationResults] = useState<string[]>([]);

  const filteredIOCs = useMemo(() => {
    if (!iocs) return [];
    return iocs.filter(ioc => {
      if (filterType && ioc.type !== filterType) return false;
      if (searchValue && !ioc.value.toLowerCase().includes(searchValue.toLowerCase())) return false;
      return true;
    });
  }, [iocs, filterType, searchValue]);

  // Get unique types for filter dropdown
  const iocTypes = useMemo(() => {
    if (!iocs) return [];
    const types = [...new Set(iocs.map(ioc => ioc.type))];
    return types.sort();
  }, [iocs]);

  const handleValidateSelected = async () => {
    const values = filteredIOCs.slice(0, 20).map(ioc => ioc.value);
    const hits = await validateIOCs(values);
    setValidationResults(hits.map((h: any) => `${h.value}: ${h.warninglist_name}`));
  };

  if (loading) return <LoadingSpinner message="Loading IOCs..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search IOC values..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">All Types</option>
          {iocTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button
          onClick={handleValidateSelected}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          Validate Against Warninglists
        </button>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          Export Selected
        </button>
      </div>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-medium text-orange-800 mb-2">Warninglist Matches</h4>
          <ul className="text-sm text-orange-700 space-y-1">
            {validationResults.map((result, idx) => (
              <li key={idx}>• {result}</li>
            ))}
          </ul>
        </div>
      )}

      {/* IOC Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIOCs.slice(0, 50).map((ioc, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge label={ioc.type} color="#dc2626" />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm max-w-[300px] truncate" title={ioc.value}>
                    {ioc.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ioc.category}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 hover:underline cursor-pointer">
                    #{ioc.event_id}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600" title="View correlations">
                        🔗
                      </button>
                      <button className="p-1 text-gray-400 hover:text-green-600" title="Copy to clipboard">
                        📋
                      </button>
                      <button className="p-1 text-gray-400 hover:text-purple-600" title="Generate YARA rule">
                        ⚙️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {Math.min(filteredIOCs.length, 50)} of {filteredIOCs.length} IOCs
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Galaxies Tab Component
// ============================================================

interface GalaxiesTabProps {
  threatActors: GalaxyCluster[] | null;
  mitreTactics: GalaxyCluster[] | null;
  loading: boolean;
  error: string | null;
}

function GalaxiesTab({ threatActors, mitreTactics, loading, error }: GalaxiesTabProps) {
  const [activeSection, setActiveSection] = useState<'actors' | 'tactics'>('actors');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) return <LoadingSpinner message="Loading galaxy data..." />;
  if (error) return <ErrorState message={error} />;

  const currentData = activeSection === 'actors' ? threatActors : mitreTactics;
  const filteredData = currentData?.filter(item =>
    item.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('actors')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'actors'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          👤 Threat Actors ({threatActors?.length || 0})
        </button>
        <button
          onClick={() => setActiveSection('tactics')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === 'tactics'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🎯 MITRE Tactics ({mitreTactics?.length || 0})
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={`Search ${activeSection === 'actors' ? 'threat actors' : 'MITRE tactics'}...`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredData.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
              activeSection === 'actors'
                ? 'bg-red-50 border-red-100 hover:border-red-300'
                : 'bg-blue-50 border-blue-100 hover:border-blue-300'
            }`}
          >
            <h4 className="font-semibold text-gray-900 mb-2">{item.value}</h4>
            
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {item.description}
              </p>
            )}

            {/* Meta Information */}
            {item.meta && Object.keys(item.meta).length > 0 && (
              <div className="space-y-1">
                {Object.entries(item.meta).slice(0, 3).map(([key, values]) => (
                  Array.isArray(values) && values.length > 0 && (
                    <div key={key} className="text-xs">
                      <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="ml-1 text-gray-700">
                        {(values as string[]).slice(0, 3).join(', ')}
                        {(values as string[]).length > 3 && ` +${(values as string[]).length - 3}`}
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Tags */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                {item.tag_name}
              </code>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No {activeSection === 'actors' ? 'threat actors' : 'tactics'} found matching your search.
        </div>
      )}
    </div>
  );
}

// ============================================================
// Feeds Tab Component
// ============================================================

interface FeedsTabProps {
  feeds: any[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function FeedsTab({ feeds, loading, error, refetch }: FeedsTabProps) {
  if (loading) return <LoadingSpinner message="Loading feeds..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Feeds"
          value={feeds?.length || 0}
          icon="📡"
          color="#3b82f6"
        />
        <StatCard
          title="Enabled"
          value={feeds?.filter(f => f.enabled).length || 0}
          icon="✅"
          color="#10b981"
        />
        <StatCard
          title "Disabled"
          value={feeds?.filter(f => !f.enabled).length || 0}
          icon="❌"
          color="#ef4444"
        />
        <StatCard
          title="With Errors"
          value={feeds?.filter(f => f.errors > 0).length || 0}
          icon="⚠️"
          color="#f59e0b"
        />
      </div>

      {/* Feed List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Fetched</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeds?.map((feed, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      feed.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feed.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{feed.name}</td>
                  <td className="px-4 py-3 text-gray-600">{feed.provider}</td>
                  <td className="px-4 py-3">
                    <Badge label={feed.source_format} color="#6366f1" size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {feed.last_fetched_time || 'Never'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Fetch now"
                      >
                        🔄
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Preview"
                      >
                        👁️
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-purple-600"
                        title="Import events"
                      >
                        📥
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Cache All Enabled Feeds
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Add New Feed
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Configure Sync Servers
        </button>
      </div>
    </div>
  );
}

// ============================================================
// YARA Rules Tab Component
// ============================================================

interface YARATabProps {
  eventId: string | null;
  rule: YARARule | null;
  loading: boolean;
  generateRule: () => void;
}

function YARATab({ eventId, rule, loading, generateRule }: YARATabProps) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [options, setOptions] = useState({
    includeHashes: true,
    includeStrings: true,
    includeDomains: true,
  });

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">YARA Rule Generator</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event ID or UUID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter event ID..."
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={generateRule}
                disabled={!selectedEventId || loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include in Rule
            </label>
            <div className="space-y-2">
              {[
                { key: 'includeHashes', label: 'Hash-based indicators (MD5/SHA1/SHA256)' },
                { key: 'includeStrings', label: 'Domain/hostname strings' },
                { key: 'includeDomains', label: 'URL patterns as regex' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(options as any)[key]}
                    onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Rule Output */}
      {rule && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{rule.name}</h4>
            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(rule.source)}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Copy to Clipboard
              </button>
              <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                Download .yar file
              </button>
            </div>
          </div>
          <pre className="p-4 bg-gray-900 text-green-400 overflow-x-auto text-sm font-mono leading-relaxed">
            {rule.source}
          </pre>
        </div>
      )}

      {/* Batch Generation Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Batch Generation</h4>
        <p className="text-sm text-blue-700 mb-3">
          Generate a complete ruleset from multiple events at once. The output can be directly used with YARA-compatible tools.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          Generate Ruleset from Multiple Events
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard Component
// ============================================================

export default function MISPDashboard() {
  const [activeTab, setActiveTab] = useState<MISPTab>('overview');

  // Data hooks
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useMISPStatistics();
  const { data: events, loading: eventsLoading, error: eventsError, refetch: refetchEvents } = useRecentMISPEvents(30);
  const { data: iocs, loading: iocsLoading, error: iocsError, refetch: refetchIOCs, validateIOCs } = useMISPIOCs();
  const { data: threatActors, loading: actorsLoading, error: actorsError } = useThreatActors();
  const { data: mitreTactics, loading: tacticsLoading, error: tacticsError } = useMITRETactics();
  const { data: feeds, loading: feedsLoading, error: feedsError, refetch: refetchFeeds } = useMISPFeeds();
  const { data: health } = useMISPHealth();
  const { data: yaraRule, loading: yaraLoading, refetch: generateRule } = useYARARules(null);

  // Tab configuration
  const tabs: { id: MISPTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'events', label: 'Events', icon: '📋' },
    { id: 'iocs', label: 'IOCs', icon: '🎯' },
    { id: 'galaxies', label: 'Galaxies', icon: '🌌' },
    { id: 'feeds', label: 'Feeds', icon: '📡' },
    { id: 'yara', label: 'YARA', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <span className="mr-3">🛡️</span>
                MISP Threat Intelligence
              </h1>
              <p className="text-red-100 mt-1">Algeria National SOC Platform</p>
            </div>
            <div className="flex items-center gap-4">
              {health && (
                <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  health.healthy ? 'bg-green-500/20 text-green-100' : 'bg-yellow-500/20 text-yellow-100'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${health.healthy ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {health.healthy ? 'Connected' : 'Issues Detected'}
                </div>
              )}
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
                ⚙️ Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          stats ? (
            <OverviewTab stats={stats} health={health || { healthy: false, version: 'unknown' }} />
          ) : (
            <LoadingSpinner message="Loading statistics..." />
          )
        )}

        {activeTab === 'events' && (
          <EventsTab
            events={events}
            loading={eventsLoading}
            error={eventsError}
            refetch={refetchEvents}
          />
        )}

        {activeTab === 'iocs' && (
          <IOCsTab
            iocs={iocs}
            loading={iocsLoading}
            error={iocsError}
            refetch={refetchIOCs}
            validateIOCs={validateIOCs}
          />
        )}

        {activeTab === 'galaxies' && (
          <GalaxiesTab
            threatActors={threatActors}
            mitreTactics={mitreTactics}
            loading={actorsLoading || tacticsLoading}
            error={actorsError || tacticsError}
          />
        )}

        {activeTab === 'feeds' && (
          <FeedsTab
            feeds={feeds}
            loading={feedsLoading}
            error={feedsError}
            refetch={refetchFeeds}
          />
        )}

        {activeTab === 'yara' && (
          <YARATab
            eventId={null}
            rule={yaraRule}
            loading={yaraLoading}
            generateRule={generateRule}
          />
        )}
      </main>
    </div>
  );
}
