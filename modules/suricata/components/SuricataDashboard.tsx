/**
 * Suricata IDS/IPS Dashboard Component
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive dashboard with:
 * - Overview with KPIs and summary statistics
 * - Alert management with filtering and analysis
 * - Rule management interface
 * - Attack map visualization
 * - Real-time monitoring
 * - Sensor health status
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  EveEvent,
  SuricataRule,
  SuricataStats,
  SeverityLevel,
  RuleState,
  RuleAction,
  SignatureSource,
  TimeRange,
  AlertCategory,
  IPStats,
  SignatureStats,
  SuricataSensor,
  SensorStatus,
  SEVERITY_CONFIG
} from '../types/suricata.types';
import {
  useSuricataDashboard,
  useSuricataAlerts,
  useSuricataRules,
  useAlertTrends,
  useAttackMapData
} from '../hooks/use-suricata';

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
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="text-red-500 text-lg mb-2">⚠️ Error</div>
    <p className="text-red-700 text-sm">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

/** Stat card component */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: { direction: 'up' | 'down'; value: number };
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'blue', trend, subtitle }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {icon && <span className="text-3xl opacity-80">{icon}</span>}
    </div>
    {trend && (
      <div className={`mt-3 flex items-center text-xs ${
        trend.direction === 'up' ? 'text-red-500' : 'text-green-500'
      }`}>
        <span>{trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
        <span className="ml-1 text-gray-400">vs last period</span>
      </div>
    )}
  </div>
);

/** Badge component */
interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({ text, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`${variants[variant]} ${sizes[size]} rounded-full font-medium inline-flex items-center`}>
      {text}
    </span>
  );
};

/** Severity indicator component */
const SeverityIndicator: React.FC<{ severity: SeverityLevel; showLabel?: boolean }> = ({ 
  severity, 
  showLabel = true 
}) => {
  const config = SEVERITY_CONFIG[severity];
  
  return (
    <span className="inline-flex items-center gap-1">
      <span 
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {showLabel && (
        <span className="text-sm capitalize" style={{ color: config.color }}>
          {severity.replace('_', ' ')}
        </span>
      )}
    </span>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

/** Overview Tab Component */
const OverviewTab: React.FC<{
  stats: SuricataStats;
  recentAlerts: EveEvent[];
  highPriorityAlerts: EveEvent[];
  topIPs: IPStats[];
  sensors: SuricataSensor[];
}> = ({ stats, recentAlerts, highPriorityAlerts, topIPs, sensors }) => {
  const totalAlerts = Object.values(stats.alerts_by_severity).reduce((a, b) => a + b, 0);
  const criticalAlerts = stats.alerts_by_severity[SeverityLevel.CRITICAL] || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Alerts (24h)"
          value={totalAlerts.toLocaleString()}
          icon="🚨"
          color="red"
          trend={{ direction: 'up', value: 12.5 }}
          subtitle="Last 24 hours"
        />
        <StatCard
          title="Critical Alerts"
          value={criticalAlerts.toLocaleString()}
          icon="🔴"
          color="red"
          trend={{ direction: 'down', value: 5.2 }}
          subtitle="Requires immediate attention"
        />
        <StatCard
          title="Packets Processed"
          value={(stats.packets_received / 1000000).toFixed(2) + 'M'}
          icon="📦"
          color="blue"
          trend={{ direction: 'up', value: 3.1 }}
          subtitle={`${(stats.derived_metrics?.packets_per_second || 0).toLocaleString()} pps`}
        />
        <StatCard
          title="Active Sensors"
          value={`${sensors.filter(s => s.status === SensorStatus.ONLINE).length}/${sensors.length}`}
          icon="📡"
          color="green"
          subtitle="All systems operational"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Packet Processing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Packet Processing
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Drop Rate</span>
              <span className="font-mono text-sm">{stats.derived_metrics?.drop_rate_percent?.toFixed(4)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(parseFloat(stats.derived_metrics?.drop_rate_percent || '0') * 10, 100)}%`,
                  backgroundColor: parseFloat(stats.derived_metrics?.drop_rate_percent || '0') > 0.1 ? '#EF4444' : '#10B981'
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-gray-600">Throughput</span>
              <span className="font-mono text-sm">{stats.derived_metrics?.bits_per_second_formatted}</span>
            </div>
          </div>
        </div>

        {/* Top Attacking Countries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🌍</span> Top Source Countries
          </h3>
          <div className="space-y-2">
            {topIPs.slice(0, 5).map((ip, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5">{idx + 1}.</span>
                  <span>{ip.country || 'Unknown'}</span>
                </div>
                <Badge text={`${ip.alert_count} alerts`} variant="info" />
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>💚</span> Sensor Status
          </h3>
          <div className="space-y-3">
            {sensors.map(sensor => (
              <div key={sensor.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    sensor.status === SensorStatus.ONLINE ? 'bg-green-500' :
                    sensor.status === SensorStatus.DEGRADED ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-700">{sensor.name}</span>
                </div>
                <Badge 
                  text={sensor.status} 
                  variant={
                    sensor.status === SensorStatus.ONLINE ? 'success' :
                    sensor.status === SensorStatus.DEGRADED ? 'warning' : 'danger'
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Critical Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>⚠️</span> High Priority Alerts
          </h3>
          <button className="text-blue-600 text-sm hover:text-blue-700 transition-colors">
            View All →
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Signature</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {highPriorityAlerts.slice(0, 5).map((alert, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityIndicator 
                      severity={
                        Object.entries(SEVERITY_CONFIG).find(([_, c]) => 
                          c.score === (5 - (alert.alert?.severity || 5))
                        )?.[0] as SeverityLevel || SeverityLevel.LOW
                      } 
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">
                    {alert.alert?.signature || 'N/A'}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">
                    {alert.src_ip}:{alert.src_port}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">
                    {alert.dest_ip}:{alert.dest_port}
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      text={alert.alert?.action || 'unknown'} 
                      variant={alert.alert?.action === 'drop' ? 'danger' : 'info'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {highPriorityAlerts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No high priority alerts at this time ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Alerts Tab Component */
const AlertsTab: React.FC = () => {
  const [filter, setFilter] = useState<Partial<{
    severities: SeverityLevel[];
    search: string;
    timeRange: TimeRange;
  }>>({});

  const { alerts, total, aggregations, loading, error, setFilter: applyFilter, currentPage, totalPages, setPage } = 
    useSuricataAlerts({
      time_range: filter.timeRange || TimeRange.LAST_24_HOURS,
      severities: filter.severities
    });

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search by signature, IP, or SID..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Severity:</span>
            {Object.values(SeverityLevel).map(sev => (
              <button
                key={sev}
                onClick={() => {
                  const current = filter.severities || [];
                  const newSev = current.includes(sev)
                    ? current.filter(s => s !== sev)
                    : [...current, sev];
                  applyFilter({ severities: newSev });
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter.severities?.includes(sev)
                    ? 'ring-2 ring-offset-1'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${SEVERITY_CONFIG[sev].color}20`,
                  color: SEVERITY_CONFIG[sev].color,
                  borderColor: filter.severities?.includes(sev) ? SEVERITY_CONFIG[sev].color : 'transparent'
                }}
              >
                {SEVERITY_CONFIG[sev].icon} {sev.split('_')[0]}
              </button>
            ))}
          </div>

          {/* Time Range */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            value={filter.timeRange || TimeRange.LAST_24_HOURS}
            onChange={(e) => setFilter(prev => ({ ...prev, timeRange: e.target.value as TimeRange }))}
          >
            <option value={TimeRange.LAST_HOUR}>Last Hour</option>
            <option value={TimeRange.LAST_6_HOURS}>Last 6 Hours</option>
            <option value={TimeRange.LAST_12_HOURS}>Last 12 Hours</option>
            <option value={TimeRange.LAST_24_HOURS}>Last 24 Hours</option>
            <option value={TimeRange.LAST_7_DAYS}>Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Aggregations Summary */}
      {aggregations && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(aggregations.by_severity).map(([sev, count]) => (
            <div 
              key={sev}
              className="bg-white rounded-lg p-3 border border-gray-100 text-center cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => {
                const current = filter.severities || [];
                applyFilter({ 
                  severities: current.includes(sev as SeverityLevel)
                    ? current.filter(s => s !== sev)
                    : [...current, sev as SeverityLevel]
                });
              }}
            >
              <div className="text-lg font-bold" style={{ color: SEVERITY_CONFIG[sev as SeverityLevel]?.color }}>
                {count}
              </div>
              <div className="text-xs text-gray-500 capitalize">{sev.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Signature</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">SID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Source → Target</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proto</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx} className="border-b hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityIndicator 
                          severity={
                            Object.entries(SEVERITY_CONFIG).find(([_, c]) => 
                              c.score === (5 - (alert.alert?.severity || 5))
                            )?.[0] as SeverityLevel || SeverityLevel.LOW
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate" title={alert.alert?.signature}>
                        {alert.alert?.signature || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">
                        {alert.alert?.signature_id || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        <div>{alert.src_ip}:{alert.src_port}</div>
                        <div className="text-gray-400">→</div>
                        <div>{alert.dest_ip}:{alert.dest_port}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={alert.proto} variant="default" />
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          text={alert.alert?.action || '-'} 
                          variant={
                            alert.alert?.action === 'drop' ? 'danger' :
                            alert.alert?.action === 'reject' ? 'warning' :
                            alert.alert?.action === 'pass' ? 'success' : 'info'
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-700 text-xs" title="View Details">
                            👁️
                          </button>
                          <button className="text-orange-600 hover:text-orange-700 text-xs" title="Mark False Positive">
                            ⚠️
                          </button>
                          <button className="text-purple-600 hover:text-purple-700 text-xs" title="Create Case">
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {alerts.length} of {total.toLocaleString()} alerts
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** Rules Tab Component */
const RulesTab: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const { rules, total, loading, validateRule, setFilter, refetch } = useSuricataRules({
    state: RuleState.ENABLED
  });

  const handleValidate = async () => {
    if (!newRuleText.trim()) return;
    
    const result = await validateRule(newRuleText);
    setValidationResult(result);
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onChange={(e) => setFilter({ state: e.target.value as RuleState })}
            >
              <option value="">All States</option>
              <option value={RuleState.ENABLED}>Enabled</option>
              <option value={RuleState.DISABLED}>Disabled</option>
              <option value={RuleState.TESTING}>Testing</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              onChange={(e) => setFilter({ source: e.target.value as SignatureSource })}
            >
              <option value="">All Sources</option>
              <option value={SignatureSource.ETOPEN}>ET Open</option>
              <option value={SignatureSource.ETPRO}>ET Pro</option>
              <option value={SignatureSource.CUSTOM}>Custom</option>
            </select>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span> Add Custom Rule
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Hits</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">FP Count</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Hit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-600">{rule.sid}</td>
                    <td className="px-4 py-3">
                      <Badge 
                        text={rule.action} 
                        variant={
                          rule.action === RuleAction.DROP ? 'danger' :
                          rule.action === RuleAction.REJECT ? 'warning' :
                          rule.action === RuleAction.PASS ? 'success' : 'info'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-md truncate" title={rule.message}>
                      {rule.message}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        text={rule.source} 
                        variant={rule.source === SignatureSource.CUSTOM ? 'info' : 'default'}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{rule.hit_count.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-orange-600">{rule.false_positive_count}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {rule.last_hit ? new Date(rule.last_hit).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        text={rule.state}
                        variant={
                          rule.state === RuleState.ENABLED ? 'success' :
                          rule.state === RuleState.DISABLED ? 'danger' : 'warning'
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          className="text-green-600 hover:text-green-700 text-xs"
                          title={rule.state === RuleState.ENABLED ? 'Disable' : 'Enable'}
                        >
                          {rule.state === RuleState.ENABLED ? '⏸️' : '▶️'}
                        </button>
                        <button className="text-blue-600 hover:text-blue-700 text-xs" title="Edit">
                          ✏️
                        </button>
                        <button className="text-purple-600 hover:text-purple-700 text-xs" title="View Raw">
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Create Custom Rule</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Definition
                </label>
                <textarea
                  value={newRuleText}
                  onChange={(e) => {
                    setNewRuleText(e.target.value);
                    setValidationResult(null);
                  }}
                  placeholder="alert tcp any any -> any any (msg:&quot;My Custom Rule&quot;; sid:2000001; rev:1;)"
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Validation Results */}
              {validationResult && (
                <div className={`rounded-lg p-4 ${
                  validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className={`font-medium ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {validationResult.valid ? '✅ Rule is valid' : '❌ Validation failed'}
                  </div>
                  
                  {validationResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validationResult.errors.map((err, i) => (
                        <li key={i} className="text-red-600 text-sm">• {err}</li>
                      ))}
                    </ul>
                  )}
                  
                  {validationResult.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validationResult.warnings.map((warn, i) => (
                        <li key={i} className="text-yellow-600 text-sm">⚠️ {warn}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleValidate}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Validate
              </button>
              <button
                disabled={!validationResult?.valid}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Attack Map Tab Component (Simplified - would integrate with map library) */
const AttackMapTab: React.FC = () => {
  const { data: attackMap, loading } = useAttackMapData(TimeRange.LAST_24_HOURS);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🗺️</span> Global Attack Map
        </h3>
        
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="relative h-[500px] bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg overflow-hidden">
            {/* Simplified attack visualization - In production, use Leaflet/Mapbox */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🌍</div>
                <p className="text-xl font-semibold mb-2">Attack Visualization</p>
                <p className="text-blue-200 text-sm">
                  {attackMap?.length || 0} attack sources detected in last 24 hours
                </p>
                
                {/* Simulated attack points */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {attackMap?.slice(0, 8).map(point => (
                    <div key={point.id} className="bg-black/30 rounded-lg p-3 backdrop-blur">
                      <div className="text-2xl mb-1">
                        {point.severity === SeverityLevel.CRITICAL ? '🔴' :
                         point.severity === SeverityLevel.HIGH ? '🟠' : '🟡'}
                      </div>
                      <div className="text-xs text-blue-200 truncate">{point.location.country}</div>
                      <div className="text-xs text-blue-300">{point.count} attacks</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attack Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-medium text-gray-700 mb-3">By Category</h4>
          <div className="space-y-2">
            {[
              { cat: 'C2 Communication', count: 47, pct: 35 },
              { cat: 'Brute Force', count: 32, pct: 24 },
              { cat: 'Scanning', count: 28, pct: 21 },
              { cat: 'Malware', count: 18, pct: 13 },
              { cat: 'Other', count: 10, pct: 7 }
            ].map(item => (
              <div key={item.cat} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28 truncate">{item.cat}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.pct}%` }}></div>
                </div>
                <span className="text-xs text-gray-500 w-8">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-medium text-gray-700 mb-3">Top Targeted Ports</h4>
          <div className="space-y-2">
            {[
              { port: 443, service: 'HTTPS', count: 12500 },
              { port: 80, service: 'HTTP', count: 5200 },
              { port: 22, service: 'SSH', count: 3100 },
              { port: 53, service: 'DNS', count: 1800 },
              { port: 4444, service: 'MSF', count: 450 }
            ].map(item => (
              <div key={item.port} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-blue-600">{item.port}</span>
                  <span className="text-gray-500">({item.service})</span>
                </div>
                <span className="text-gray-600">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="font-medium text-gray-700 mb-3">Threat Intelligence</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">IOC Matches</span>
              <Badge text="234 matches" variant="danger" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MITRE Mapped</span>
              <Badge text="89%" variant="info" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Known Bad IPs</span>
              <Badge text="156 unique" variant="warning" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tor Exit Nodes</span>
              <Badge text="12 nodes" variant="default" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Sensors Tab Component */
const SensorsTab: React.FC<{
  sensors: SuricataSensor[];
}> = ({ sensors }) => (
  <div className="space-y-4">
    {sensors.map(sensor => (
      <div key={sensor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-800 text-lg">{sensor.name}</h3>
              <Badge 
                text={sensor.status}
                variant={
                  sensor.status === SensorStatus.ONLINE ? 'success' :
                  sensor.status === SensorStatus.DEGRADED ? 'warning' : 'danger'
                }
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{sensor.hostname} • v{sensor.version}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Uptime: {(sensor.uptime_seconds / 3600).toFixed(1)} hours</div>
            <div>Last update: {new Date(sensor.last_rule_update).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">CPU Usage</div>
            <div className="text-lg font-semibold text-gray-800">{sensor.cpu_usage}%</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full ${sensor.cpu_usage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${sensor.cpu_usage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Memory Usage</div>
            <div className="text-lg font-semibold text-gray-800">{sensor.memory_usage}%</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full ${sensor.memory_usage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${sensor.memory_usage}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Rules Loaded</div>
            <div className="text-lg font-semibold text-gray-800">
              {sensor.enabled_rules.toLocaleString()} / {sensor.total_rules.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Interfaces</div>
            <div className="text-sm text-gray-800 mt-1">
              {sensor.interfaces.map(iface => iface.name).join(', ')}
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Health Checks</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sensor.health_checks.map(check => (
              <div 
                key={check.check_name}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  check.status === 'pass' ? 'bg-green-50' :
                  check.status === 'warn' ? 'bg-yellow-50' : 'bg-red-50'
                }`}
              >
                <span className={`text-lg ${
                  check.status === 'pass' ? '✅' :
                  check.status === 'warn' ? '⚠️' : '❌'
                }`}></span>
                <div>
                  <div className="text-xs font-medium text-gray-700 capitalize">
                    {check.check_name.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-500">{check.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface SuricataDashboardProps {
  /** Initial time range for data display */
  defaultTimeRange?: TimeRange;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Show attack map tab */
  enableAttackMap?: boolean;
  /** Custom class name */
  className?: string;
}

export const SuricataDashboard: React.FC<SuricataDashboardProps> = ({
  defaultTimeRange = TimeRange.LAST_24_HOURS,
  autoRefresh = true,
  refreshInterval = 30000,
  enableAttackMap = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
    { id: 'rules', label: 'Rules', icon: '📜' },
    ...(enableAttackMap ? [{ id: 'attack-map', label: 'Attack Map', icon: '🗺️' }] : []),
    { id: 'sensors', label: 'Sensors', icon: '📡' })
  ];

  // Fetch all dashboard data
  const {
    stats,
    recentAlerts,
    highPriorityAlerts,
    topIPs,
    sensors,
    loading,
    error,
    refetchAll
  } = useSuricataDashboard({
    refreshInterval: autoRefresh ? refreshInterval : undefined,
    enableAttackMap
  });

  if (error) {
    return (
      <div className={className}>
        <ErrorState message={error} onRetry={refetchAll} />
      </div>
    );
  }

  return (
    <div className={`suricata-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              Suricata IDS/IPS
            </h1>
            <p className="text-gray-500 mt-1">
              Intrusion Detection & Prevention System • National SOC Platform
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Last Updated Indicator */}
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={refetchAll}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span>🔄</span> Refresh
            </button>
            
            {/* Export Button */}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <span>📥</span> Export
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm transition-all relative ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {loading && !stats ? (
          <LoadingSpinner size="lg" />
        ) : (
          <>
            {activeTab === 'overview' && stats && (
              <OverviewTab
                stats={stats}
                recentAlerts={recentAlerts || []}
                highPriorityAlerts={highPriorityAlerts || []}
                topIPs={topIPs || []}
                sensors={sensors || []}
              />
            )}

            {activeTab === 'alerts' && <AlertsTab />}

            {activeTab === 'rules' && <RulesTab />}

            {activeTab === 'attack-map' && enableAttackMap && <AttackMapTab />}

            {activeTab === 'sensors' && sensors && <SensorsTab sensors={sensors} />}
          </>
        )}
      </div>
    </div>
  );
};

// Default export
export default SuricataDashboard;
