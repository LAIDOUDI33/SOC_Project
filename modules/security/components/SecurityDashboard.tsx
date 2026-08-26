/**
 * Security Dashboard Component
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Comprehensive security console providing:
 * - Overview: Security score, critical issues, compliance status
 * - Certificates: SSL/TLS certificate monitoring
 * - Audit Log: Security events timeline with filtering
 * - Compliance: CIS/NIST checklist with pass/fail status
 * - Access Control: Policies, firewall rules, IP lists
 * - Vulnerabilities: Scan results with severity ratings
 * - Hardening Guide: Recommendations based on findings
 * 
 * @module security/components
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useSecurityDashboard, useAuditLogs, useComplianceStatus } from '../hooks/use-security';
import type {
  AuditLogEntry,
  Vulnerability,
  FirewallRule,
  IPListEntry,
} from '../types/security.types';

// ============================================================================
// Types & Constants
// ============================================================================

type TabType = 'overview' | 'certificates' | 'audit' | 'compliance' | 'access' | 'vulnerabilities' | 'hardening';

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'certificates', label: 'Certificates', icon: '🔐' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
  { id: 'compliance', label: 'Compliance', icon: '✅' },
  { id: 'access', label: 'Access Control', icon: '🔒' },
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '⚠️' },
  { id: 'hardening', label: 'Hardening Guide', icon: '🛡️' },
];

/** Severity color mapping */
const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  info: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500' },
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

/**
 * SecurityDashboard - Main security console component
 */
export function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dashboard data using combined hook
  const {
    posture,
    certificateStatus,
    recentAlerts,
    complianceScore,
    vulnerabilityCount,
    criticalIssuesCount,
    loading,
    error,
    lastUpdated,
    healthStatus,
    refetch,
  } = useSecurityDashboard({
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  /** Handle manual refresh */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              Security Operations Center
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              National SOC Platform Algeria • Module 8: Security Hardening & SSL/TLS
            </p>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            <HealthBadge status={healthStatus} />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRefreshing
                  ? 'bg-gray-700 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <QuickStatsBar
          score={posture?.overallScore || 0}
          grade={posture?.grade || 'F'}
          alerts={recentAlerts}
          vulnerabilities={vulnerabilityCount}
          compliance={complianceScore}
          lastUpdate={lastUpdated}
        />
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-850 border-b border-gray-700 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-400 bg-gray-800'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab posture={posture!} certificateStatus={certificateStatus} />
        )}
        {activeTab === 'certificates' && <CertificatesTab />}
        {activeTab === 'audit' && <AuditLogTab />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'access' && <AccessControlTab />}
        {activeTab === 'vulnerabilities' && <VulnerabilitiesTab />}
        {activeTab === 'hardening' && <HardeningGuideTab posture={posture!} />}
      </main>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Loading spinner component */
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading Security Dashboard...</p>
      </div>
    </div>
  );
}

/** Error state component */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md p-8 bg-gray-800 rounded-xl border border-red-500/30">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/** Health status badge */
function HealthBadge({ status }: { status: string }) {
  const config = {
    healthy: { color: 'bg-green-500', label: 'Healthy', icon: '✅' },
    warning: { color: 'bg-yellow-500', label: 'Warning', icon: '⚠️' },
    critical: { color: 'bg-red-500', label: 'Critical', icon: '🔴' },
    unknown: { color: 'bg-gray-500', label: 'Unknown', icon: '❓' },
  };

  const { color, label, icon } = config[status as keyof typeof config] || config.unknown;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${color}/20`}>
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

/** Quick stats bar in header */
function QuickStatsBar({
  score,
  grade,
  alerts,
  vulnerabilities,
  compliance,
  lastUpdate,
}: {
  score: number;
  grade: string;
  alerts: number;
  vulnerabilities: number;
  compliance: number;
  lastUpdate: Date;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
      <StatCard
        title="Security Score"
        value={`${score}/100`}
        subtitle={`Grade: ${grade}`}
        color={score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'}
      />
      <StatCard
        title="Active Alerts"
        value={String(alerts)}
        subtitle="Requires attention"
        color={alerts > 0 ? 'red' : 'green'}
      />
      <StatCard
        title="Vulnerabilities"
        value={String(vulnerabilities)}
        subtitle="Open findings"
        color={vulnerabilities > 0 ? 'orange' : 'green'}
      />
      <StatCard
        title="Compliance"
        value={`${compliance}%`
        subtitle="CIS/NIST aligned"
        color={compliance >= 80 ? 'green' : compliance >= 60 ? 'yellow' : 'red'}
      />
      <StatCard
        title="Last Updated"
        value={formatTimeAgo(lastUpdate)}
        subtitle="Auto-refresh enabled"
        color="blue"
      />
    </div>
  );
}

/** Individual stat card */
function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'orange';
}) {
  const colors = {
    green: 'from-green-900/40 to-green-800/20 border-green-500/30',
    yellow: 'from-yellow-900/40 to-yellow-800/20 border-yellow-500/30',
    red: 'from-red-900/40 to-red-800/20 border-red-500/30',
    blue: 'from-blue-900/40 to-blue-800/20 border-blue-500/30',
    orange: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-3`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  posture,
  certificateStatus,
}: {
  posture: NonNullable<ReturnType<typeof useSecurityDashboard>['posture']>;
  certificateStatus: any;
}) {
  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Security Posture Assessment</h2>
          <span className={`text-4xl font-bold ${
            posture.grade === 'A' || posture.grade === 'B' ? 'text-green-400' :
            posture.grade === 'C' || posture.grade === 'D' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            Grade: {posture.grade}
          </span>
        </div>

        {/* Score Ring */}
        <div className="flex items-center gap-12">
          <ScoreRing score={posture.overallScore} size={180} />
          
          <div className="flex-1 space-y-4">
            {posture.categories.map((category, idx) => (
              <CategoryBar key={idx} category={category} />
            ))}
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {posture.criticalIssues.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            🚨 Critical Issues ({posture.criticalIssues.length})
          </h3>
          <div className="space-y-3">
            {posture.criticalIssues.slice(0, 5).map((issue) => (
              <div key={issue.id} className="bg-gray-800/50 rounded-lg p-4 flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{issue.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{issue.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                  SEVERITY_COLORS[issue.severity]?.bg || ''
                } ${SEVERITY_COLORS[issue.severity]?.text || ''}`}>
                  {issue.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          💡 Recommendations
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posture.recommendations.slice(0, 6).map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      </div>

      {/* Certificate Status Summary */}
      {certificateStatus && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🔐 Certificate Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-750 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{certificateStatus.summary?.valid || 0}</p>
              <p className="text-sm text-gray-400">Valid</p>
            </div>
            <div className="bg-gray-750 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{certificateStatus.summary?.expiringSoon || 0}</p>
              <p className="text-sm text-gray-400">Expiring Soon</p>
            </div>
            <div className="bg-gray-750 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{certificateStatus.summary?.expired || 0}</p>
              <p className="text-sm text-gray-400">Expired</p>
            </div>
            <div className="bg-gray-750 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{certificateStatus.totalCertificates || 0}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Score ring visualization */
function ScoreRing({ score, size }: { score: number; size: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-sm text-gray-400">out of 100</span>
      </div>
    </div>
  );
}

/** Category progress bar */
function CategoryBar({
  category,
}: {
  category: NonNullable<ReturnType<typeof useSecurityDashboard>['posture']>['categories'][number];
}) {
  const statusColor =
    category.status === 'healthy' ? 'bg-green-500' :
    category.status === 'warning' ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-4">
      <span className="w-32 text-sm text-gray-300 truncate capitalize">
        {category.name.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${statusColor} transition-all duration-500`}
          style={{ width: `${category.score}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-medium">{Math.round(category.score)}%</span>
    </div>
  );
}

/** Recommendation card */
function RecommendationCard({
  recommendation,
}: {
  recommendation: NonNullable<ReturnType<typeof useSecurityDashboard>['posture']>['recommendations'][number];
}) {
  const priorityColors = {
    immediate: 'border-l-red-500',
    short_term: 'border-l-yellow-500',
    long_term: 'border-l-blue-500',
  };

  return (
    <div className={`bg-gray-750 border-l-4 ${priorityColors[recommendation.priority]} rounded-r-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${
          recommendation.priority === 'immediate' ? 'bg-red-900/50 text-red-300' :
          recommendation.priority === 'short_term' ? 'bg-yellow-900/50 text-yellow-300' :
          'bg-blue-900/50 text-blue-300'
        }`}>
          {recommendation.priority.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-500">{recommendation.category}</span>
      </div>
      <h4 className="font-medium text-sm">{recommendation.title}</h4>
      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{recommendation.description}</p>
    </div>
  );
}

// ============================================================================
// Certificates Tab
// ============================================================================

function CertificatesTab() {
  const [filter, setFilter] = useState<string>('all');

  // Mock data for certificates
  const mockCertificates = [
    {
      id: 'cert_001',
      commonName: '*.soc.algeria.dz',
      issuer: 'DigiCert Global G2 CA',
      status: 'valid',
      validTo: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      daysUntilExpiry: 180,
      type: 'WILDCARD',
    },
    {
      id: 'cert_002',
      commonName: 'internal-ca.soc.local',
      issuer: 'Self-Signed',
      status: 'valid',
      validTo: new Date(Date.now() + 1460 * 24 * 60 * 60 * 1000),
      daysUntilExpiry: 1460,
      type: 'INTERNAL_CA',
    },
    {
      id: 'cert_003',
      commonName: 'legacy-system.soc.algeria.dz',
      issuer: 'Legacy Internal CA',
      status: 'expiring_soon',
      validTo: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      daysUntilExpiry: 14,
      type: 'RSA',
    },
  ];

  const filteredCerts = filter === 'all'
    ? mockCertificates
    : mockCertificates.filter(c => c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">SSL/TLS Certificates</h2>
        <div className="flex gap-2">
          {['all', 'valid', 'expiring_soon', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredCerts.map((cert) => (
          <CertificateCard key={cert.id} certificate={cert as any} />
        ))}
      </div>

      {/* Actions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="font-semibold mb-4">Certificate Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            📝 Generate CSR
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
            📥 Install Certificate
          </button>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium">
            🔍 Run SSL Scan
          </button>
          <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-medium">
            ⚙️ TLS Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

/** Certificate card component */
function CertificateCard({ certificate }: { certificate: any }) {
  const statusColors = {
    valid: { bg: 'bg-green-900/30', border: 'border-green-500/50', text: 'text-green-400' },
    expiring_soon: { bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', text: 'text-yellow-400' },
    expired: { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-400' },
  };

  const colors = statusColors[certificate.status] || statusColors.valid;

  return (
    <div className={`bg-gray-800 border rounded-xl p-6 ${colors.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{certificate.commonName}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors.bg} ${colors.text}`}>
              {certificate.status.replace(/_/g, ' ')}
            </span>
            <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
              {certificate.type}
            </span>
          </div>
          <p className="text-sm text-gray-400">Issued by: {certificate.issuer}</p>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Expires</p>
              <p className="text-gray-200">{certificate.validTo.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Days Remaining</p>
              <p className={`font-medium ${certificate.daysUntilExpiry <= 30 ? 'text-red-400' : 'text-gray-200'}`}>
                {certificate.daysUntilExpiry}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Serial</p>
              <p className="text-gray-200 font-mono text-xs">{certificate.serialNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Algorithm</p>
              <p className="text-gray-200">{certificate.keySpec?.algorithm || 'N/A'}-{certificate.keySpec?.keySize || ''}</p>
            </div>
          </div>
        </div>
        
        {/* Expiry Progress */}
        <div className="ml-6 text-center">
          <div className={`w-16 h-16 rounded-full border-4 ${colors.border} flex items-center justify-center`}>
            <span className={`text-lg font-bold ${colors.text}`}>{certificate.daysUntilExpiry}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">days left</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Audit Log Tab
// ============================================================================

function AuditLogTab() {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    severity: '',
  });

  // Mock audit log data
  const mockLogs: AuditLogEntry[] = [
    {
      id: 'audit_001',
      timestamp: new Date(),
      category: 'authentication',
      severity: 'informational',
      outcome: 'success',
      actor: { type: 'user', id: 'user_001', username: 'admin', ipAddress: '10.0.1.100', mfaVerified: true },
      action: 'login',
      resource: { type: 'users' },
      details: {},
      source: { application: 'soc-platform', component: 'auth-service', environment: 'production', hostname: 'app-server-01', requestId: 'req_001' },
      correlationId: 'corr_abc123',
      retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      tags: ['authentication'],
      metadata: {},
    },
    {
      id: 'audit_002',
      timestamp: new Date(Date.now() - 3600000),
      category: 'security_event',
      severity: 'critical',
      outcome: 'success',
      actor: { type: 'system', id: 'ids_sensor_01', ipAddress: '10.0.0.25' },
      action: 'intrusion_detected',
      resource: { type: 'network' },
      details: {},
      source: { application: 'suricata-ids', component: 'detection-engine', environment: 'production', hostname: 'ids-sensor-01', requestId: 'evt_001' },
      correlationId: 'corr_def456',
      retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      tags: ['ids', 'critical'],
      metadata: {},
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 w-64"
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="authentication">Authentication</option>
            <option value="authorization">Authorization</option>
            <option value="security_event">Security Event</option>
            <option value="configuration_change">Configuration Change</option>
          </select>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-750">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {mockLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {log.timestamp.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-xs">
                    {log.category.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{log.action.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-sm">
                  {(log.actor as any).username || (log.actor as any).id}
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-400">
                  {log.actor.ipAddress}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                    SEVERITY_COLORS[log.severity]?.bg || ''
                  } ${SEVERITY_COLORS[log.severity]?.text || ''}`}>
                    {log.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`${
                    log.outcome === 'success' ? 'text-green-400' :
                    log.outcome === 'failure' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {log.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Compliance Tab
// ============================================================================

function ComplianceTab() {
  const [framework, setFramework] = useState('CIS_Controls_v8');
  
  const { data: complianceData, runCheck, loading } = useComplianceStatus(framework);

  const frameworks = [
    { id: 'CIS_Controls_v8', name: 'CIS Controls v8' },
    { id: 'NIST_SP_800_53', name: 'NIST SP 800-53' },
    { id: 'ISO_27001', name: 'ISO 27001' },
    { id: 'PCI_DSS', name: 'PCI DSS' },
  ];

  return (
    <div className="space-y-6">
      {/* Framework Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {frameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setFramework(fw.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                framework === fw.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {fw.name}
            </button>
          ))}
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳ Running...' : '▶️ Run Check'}
        </button>
      </div>

      {/* Score Overview */}
      {complianceData && (
        <>
          <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-xl p-8 border border-gray-700">
            <div className="flex items-center gap-8">
              <ScoreRing score={complianceData.score} size={150} />
              <div>
                <h2 className="text-2xl font-bold">{framework.replace(/_/g, ' ')}</h2>
                <p className="text-gray-400 mt-1">Last assessed: {new Date(complianceData.assessmentDate).toLocaleDateString()}</p>
                <div className="mt-4 grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{complianceData.summary.passed}</p>
                    <p className="text-sm text-gray-400">Passed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{complianceData.summary.failed}</p>
                    <p className="text-sm text-gray-400">Failed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{complianceData.summary.partial}</p>
                    <p className="text-sm text-gray-400">Partial</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checks List */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="font-semibold">Control Checks</h3>
            </div>
            <div className="divide-y divide-gray-700">
              {complianceData.checks.map((check) => (
                <div key={check.id} className="px-6 py-4 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          check.status === 'pass' ? 'bg-green-500 text-white' :
                          check.status === 'fail' ? 'bg-red-500 text-white' :
                          'bg-yellow-500 text-black'
                        }`}>
                          {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '~'}
                        </span>
                        <span className="font-mono text-sm text-gray-400">{check.controlId}</span>
                        <span className="font-medium">{check.controlTitle}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2 ml-9">{check.description}</p>
                      {check.recommendations.length > 0 && (
                        <ul className="mt-2 ml-9 space-y-1">
                          {check.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-xs text-blue-400 flex items-center gap-1">
                              → {rec}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ml-4 ${
                      SEVERITY_COLORS[check.severity]?.bg || ''
                    } ${SEVERITY_COLORS[check.severity]?.text || ''}`}>
                      {check.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Access Control Tab
// ============================================================================

function AccessControlTab() {
  const [section, setSection] = useState<'policies' | 'firewall' | 'ip-lists'>('firewall');

  // Mock firewall rules
  const mockFirewallRules: FirewallRule[] = [
    {
      id: 'fw_001',
      name: 'Allow HTTPS from Internet',
      description: 'Allow incoming HTTPS traffic',
      enabled: true,
      priority: 10,
      action: 'allow',
      direction: 'inbound',
      source: { type: 'any', value: '*' },
      destination: { type: 'cidr', value: '10.0.1.0/24' },
      protocol: 'tcp',
      portRange: { start: 443, end: 443 },
      logging: true,
      createdAt: new Date(),
      createdBy: 'admin',
      updatedAt: new Date(),
      updatedBy: 'admin',
      metadata: {},
    },
    {
      id: 'fw_002',
      name: 'Block Malicious Range',
      description: 'Block known malicious IP range',
      enabled: true,
      priority: 5,
      action: 'deny',
      direction: 'inbound',
      source: { type: 'cidr', value: '45.33.32.0/24' },
      destination: { type: 'any', value: '*' },
      protocol: 'any',
      logging: true,
      createdAt: new Date(),
      createdBy: 'admin',
      updatedAt: new Date(),
      updatedBy: 'admin',
      metadata: {},
    },
  ];

  // Mock IP lists
  const mockBlacklist: IPListEntry[] = [
    {
      id: 'bl_001',
      listType: 'blacklist',
      address: '45.33.32.156',
      label: 'Known Scanner',
      description: 'Automated scanner detected',
      addedBy: 'ids_sensor',
      addedAt: new Date(),
      permanent: false,
      reason: 'Port scanning detected',
      threatLevel: 'malicious',
      tags: ['scanner'],
      metadata: {},
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'firewall', label: 'Firewall Rules', icon: '🔥' },
          { id: 'policies', label: 'Access Policies', icon: '📜' },
          { id: 'ip-lists', label: 'IP Lists', icon: '🌐' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id as typeof section)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Firewall Rules Section */}
      {section === 'firewall' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Firewall Rules</h3>
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
              + Add Rule
            </button>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Protocol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Port</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {mockFirewallRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm font-mono">{rule.priority}</td>
                    <td className="px-4 py-3 text-sm font-medium">{rule.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                        rule.action === 'allow' ? 'bg-green-900/50 text-green-300' :
                        rule.action === 'deny' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {rule.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{rule.direction}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{rule.source.value}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">{rule.destination.value}</td>
                    <td className="px-4 py-3 text-sm uppercase">{rule.protocol}</td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {rule.portRange?.start === rule.portRange?.end
                        ? rule.portRange?.start
                        : `${rule.portRange?.start}-${rule.portRange?.end}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`w-2 h-2 rounded-full inline-block ${rule.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IP Lists Section */}
      {section === 'ip-lists' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blacklist */}
          <div className="bg-gray-800 rounded-xl border border-red-500/30 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-red-400">🚫 Blacklist</h3>
              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
                + Add IP
              </button>
            </div>
            <div className="space-y-3">
              {mockBlacklist.map((entry) => (
                <div key={entry.id} className="bg-gray-750 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-medium">{entry.address}</p>
                      <p className="text-sm text-gray-400">{entry.label}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      entry.threatLevel === 'malicious' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {entry.threatLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{entry.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Whitelist */}
          <div className="bg-gray-800 rounded-xl border border-green-500/30 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-green-400">✅ Whitelist</h3>
              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">
                + Add IP
              </button>
            </div>
            <div className="text-center text-gray-500 py-8">
              <p>No whitelist entries configured</p>
              <p className="text-sm mt-1">Add trusted IPs to bypass certain restrictions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Vulnerabilities Tab
// ============================================================================

function VulnerabilitiesTab() {
  // Mock vulnerabilities
  const mockVulnerabilities: Vulnerability[] = [
    {
      id: 'VULN-001',
      scanId: 'scan_weekly_2024',
      title: 'Outdated OpenSSL Version Detected',
      description: 'Server running OpenSSL with known vulnerabilities',
      severity: 'high',
      cveId: 'CVE-2024-XXXXX',
      owaspCategory: 'A06_2021-Vulnerable_Outdated_Components',
      status: 'open',
      discoveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      target: { host: 'api.soc.algeria.dz', service: 'HTTPS', component: 'OpenSSL' },
      remediation: { difficulty: 'moderate', effort: 'medium', priority: 'short_term', steps: [], estimatedHours: 2 },
      references: [],
      tags: ['openssl', 'tls'],
      assignedTo: 'security-team@soc.algeria.dz',
      comments: [],
      metadata: {},
    },
    {
      id: 'VULN-002',
      scanId: 'scan_weekly_2024',
      title: 'Missing Security Headers on Legacy Endpoint',
      description: 'Endpoint missing required security headers',
      severity: 'medium',
      owaspCategory: 'A05_2021-Security_Misconfiguration',
      status: 'in_progress',
      discoveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      target: { host: 'soc.algeria.dz', url: '/legacy/api/v1/data', component: 'Legacy API Gateway' },
      remediation: { difficulty: 'easy', effort: 'low', priority: 'short_term', steps: [], estimatedHours: 0.5 },
      references: [],
      tags: ['headers'],
      comments: [],
      metadata: {},
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Critical" count={0} color="red" />
        <SummaryCard label="High" count={1} color="orange" />
        <SummaryCard label="Medium" count={1} color="yellow" />
        <SummaryCard label="Low" count={0} color="blue" />
        <SummaryCard label="Info" count={0} color="gray" />
      </div>

      {/* Vulnerability List */}
      <div className="space-y-4">
        {mockVulnerabilities.map((vuln) => (
          <VulnerabilityCard key={vuln.id} vulnerability={vuln} />
        ))}
      </div>

      {/* Actions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Security Scanning</h3>
            <p className="text-sm text-gray-400">Run automated vulnerability assessments</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
              🔍 Quick Scan
            </button>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium">
              🔬 Full Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Summary card for vulnerability counts */
function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    red: 'from-red-900/40 to-red-800/20 border-red-500/30',
    orange: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
    yellow: 'from-yellow-900/40 to-yellow-800/20 border-yellow-500/30',
    blue: 'from-blue-900/40 to-blue-800/20 border-blue-500/30',
    gray: 'from-gray-900/40 to-gray-800/20 border-gray-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

/** Vulnerability detail card */
function VulnerabilityCard({ vulnerability }: { vulnerability: Vulnerability }) {
  const severityColors = {
    critical: 'border-red-500 bg-red-900/10',
    high: 'border-orange-500 bg-orange-900/10',
    medium: 'border-yellow-500 bg-yellow-900/10',
    low: 'border-blue-500 bg-blue-900/10',
    info: 'border-gray-500 bg-gray-900/10',
  };

  return (
    <div className={`bg-gray-800 border rounded-xl p-6 ${severityColors[vulnerability.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{vulnerability.title}</h3>
            {vulnerability.cveId && (
              <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-300 text-xs font-mono">
                {vulnerability.cveId}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-3">{vulnerability.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Target</p>
              <p className="text-gray-200">{vulnerability.target.host}</p>
            </div>
            <div>
              <p className="text-gray-500">Component</p>
              <p className="text-gray-200">{vulnerability.target.component}</p>
            </div>
            <div>
              <p className="text-gray-500">Discovered</p>
              <p className="text-gray-200">{vulnerability.discoveredAt.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Assigned To</p>
              <p className="text-gray-200">{vulnerability.assignedTo || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        <div className="ml-6 space-y-2">
          <span className={`px-3 py-1 rounded-lg text-sm font-medium uppercase ${
            SEVERITY_COLORS[vulnerability.severity]?.bg || ''
          } ${SEVERITY_COLORS[vulnerability.severity]?.text || ''}`}>
            {vulnerability.severity}
          </span>
          <div className="text-right">
            <span className={`px-2 py-1 rounded text-xs ${
              vulnerability.status === 'open' ? 'bg-red-900/50 text-red-300' :
              vulnerability.status === 'in_progress' ? 'bg-yellow-900/50 text-yellow-300' :
              'bg-gray-700 text-gray-300'
            }`}>
              {vulnerability.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Remediation Info */}
      {vulnerability.remediation.steps.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
            🔧 View Remediation Steps ({vulnerability.remediation.estimatedHours}h estimated)
          </summary>
          <ol className="mt-3 ml-6 space-y-2 list-decimal">
            {vulnerability.remediation.steps.map((step, i) => (
              <li key={i} className="text-sm text-gray-300">
                <span className="font-medium">{step.title}</span> - {step.description}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

// ============================================================================
// Hardening Guide Tab
// ============================================================================

function HardeningGuideTab({ posture }: { posture: NonNullable<ReturnType<typeof useSecurityDashboard>['posture']> }) {
  const hardeningItems = [
    {
      category: 'Network Security',
      items: [
        { title: 'Disable unused ports and services', priority: 'High', status: 'Implemented' },
        { title: 'Implement network segmentation', priority: 'Critical', status: 'In Progress' },
        { title: 'Configure IDS/IPS rules', priority: 'High', status: 'Implemented' },
        { title: 'Enable DDoS protection', priority: 'Medium', status: 'Planned' },
      ],
    },
    {
      category: 'TLS Configuration',
      items: [
        { title: 'Use TLS 1.2+ only', priority: 'Critical', status: 'Implemented' },
        { title: 'Enable HSTS with preload', priority: 'High', status: 'Implemented' },
        { title: 'Configure strong cipher suites', priority: 'High', status: 'Implemented' },
        { title: 'Implement certificate transparency', priority: 'Medium', status: 'In Progress' },
      ],
    },
    {
      category: 'Application Security',
      items: [
        { title: 'Implement CSP headers', priority: 'Critical', status: 'Implemented' },
        { title: 'Enable rate limiting', priority: 'High', status: 'Implemented' },
        { title: 'Configure CORS policies', priority: 'Medium', status: 'Implemented' },
        { title: 'Implement input validation', priority: 'Critical', status: 'In Progress' },
      ],
    },
    {
      category: 'Authentication & Authorization',
      items: [
        { title: 'Enforce MFA for all users', priority: 'Critical', status: 'Implemented' },
        { title: 'Implement password policies', priority: 'High', status: 'Implemented' },
        { title: 'Configure session timeouts', priority: 'Medium', status: 'Implemented' },
        { title: 'Set up RBAC properly', priority: 'High', status: 'In Progress' },
      ],
    },
    {
      category: 'Logging & Monitoring',
      items: [
        { title: 'Centralize security logs', priority: 'High', status: 'Implemented' },
        { title: 'Enable audit logging', priority: 'Critical', status: 'Implemented' },
        { title: 'Configure log integrity checks', priority: 'Medium', status: 'Planned' },
        { title: 'Set up alerting rules', priority: 'High', status: 'In Progress' },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Implemented': return 'text-green-400 bg-green-900/30';
      case 'In Progress': return 'text-yellow-400 bg-yellow-900/30';
      case 'Planned': return 'text-blue-400 bg-blue-900/30';
      default: return 'text-gray-400 bg-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-400';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-2">🛡️ Security Hardening Guide</h2>
        <p className="text-gray-400">
          Follow this guide to strengthen your SOC platform security posture.
          Items are aligned with CIS Benchmarks and NIST Cybersecurity Framework.
        </p>
      </div>

      {hardeningItems.map((category) => (
        <div key={category.category} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
            <h3 className="font-semibold text-lg">{category.category}</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {category.items.map((item, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.status === 'Implemented' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {item.status === 'Implemented' ? '✓' : item.status === 'In Progress' ? '→' : '○'}
                  </span>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className={`text-sm ${getPriorityColor(item.priority)}`}>Priority: {item.priority}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Resources */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="font-semibold mb-4">📚 Additional Resources</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <a href="#" className="block p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
            <p className="font-medium">CIS Controls v8 Implementation Guide</p>
            <p className="text-sm text-gray-400">Detailed implementation steps for each control</p>
          </a>
          <a href="#" className="block p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
            <p className="font-medium">NIST Cybersecurity Framework Mapping</p>
            <p className="text-sm text-gray-400">Map your controls to NIST CSF categories</p>
          </a>
          <a href="#" className="block p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
            <p className="font-medium">OWASP Testing Guide v4</p>
            <p className="text-sm text-gray-400">Web application security testing procedures</p>
          </a>
          <a href="#" className="block p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors">
            <p className="font-medium">Incident Response Playbooks</p>
            <p class="text-sm text-gray-400">Step-by-step response procedures</p>
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Format time ago for display */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Export main component
export default SecurityDashboard;
