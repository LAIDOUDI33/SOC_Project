/**
 * Logging Dashboard Component
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Comprehensive logging console with tabs:
 * - Live Feed: Real-time log stream (auto-refresh)
 * - Search: Full-text search with filters (level, source, time, actor)
 * - Audit Trail: Immutable audit log with tamper detection
 * - Analytics: Log volume charts, error rates, top sources
 * - Compliance: GDPR/SOC2/ISO27001 report views
 * - Retention: Policy management, storage visualization
 * - Shipping: Shipper health, backlog status, configuration
 * - PII Scanner: Detect potential sensitive data exposure
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  LogLevel,
  LogSource,
  LogEntry,
  AuditEntry,
  AuditAction,
  AuditOutcome,
  RetentionPolicy,
  RetentionAction,
  LogTransportType,
  ComplianceFramework,
  PIIType,
  PIIRiskLevel,
  Environment
} from '../types/logging.types';

// ============================================================================
// UI COMPONENT IMPORTS
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

// Icons (using simple text representations for compatibility)
const Icons = {
  refresh: '↻',
  search: '🔍',
  filter: '⚙️',
  alert: '🚨',
  check: '✓',
  warning: '⚠️',
  error: '✗',
  info: 'ℹ️',
  shield: '🛡️',
  database: '💾',
  chart: '📊',
  clock: '🕐',
  user: '👤',
  settings: '⚙️',
  download: '⬇️',
  upload: '⬆️',
  eye: '👁️',
  lock: '🔒'
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LoggingDashboardProps {
  /** Default active tab */
  defaultTab?: string;
  /** Auto-refresh interval in ms for live feed */
  autoRefreshInterval?: number;
  /** Compact mode for embedding */
  compact?: boolean;
}

// ============================================================================
// LOG LEVEL CONFIGURATION
// ============================================================================

const LevelConfig: Record<LogLevel, { color: string; bg: string; icon: string; label: string }> = {
  [LogLevel.DEBUG]: { color: '#6B7280', bg: '#F3F4F6', icon: '🔍', label: 'DEBUG' },
  [LogLevel.INFO]: { color: '#3B82F6', bg: '#DBEAFE', icon: 'ℹ️', label: 'INFO' },
  [LogLevel.WARN]: { color: '#F59E0B', bg: '#FEF3C7', icon: '⚠️', label: 'WARN' },
  [LogLevel.ERROR]: { color: '#EF4444', bg: '#FEE2E2', icon: '❌', label: 'ERROR' },
  [LogLevel.CRITICAL]: { color: '#DC2626', bg: '#FECACA', icon: '🚨', label: 'CRITICAL' }
};

// ============================================================================
// SAMPLE DATA (for demonstration)
// ============================================================================

const sampleLogs: LogEntry[] = [
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    level: LogLevel.INFO,
    source: LogSource.AUTH_LOGIN,
    message: 'User admin_soc successfully authenticated via LDAP',
    data: { userId: 'user-001', method: 'LDAP', mfaVerified: true },
    hostname: 'soc-server-01',
    service: 'auth-service',
    environment: Environment.PRODUCTION,
    version: '2.1.0',
    correlationId: 'corr-a1b2c3d4',
    userId: 'user-001',
    tags: ['production']
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    level: LogLevel.WARN,
    source: LogSource.SECURITY_ALERT,
    message: 'Multiple failed login attempts detected from IP 91.121.87.102',
    data: { ip: '91.121.87.102', attempts: 15, windowMinutes: 5 },
    hostname: 'soc-server-01',
    service: 'security-service',
    environment: Environment.PRODUCTION,
    version: '2.1.0',
    clientIp: '91.121.87.102',
    tags: ['production', 'alert']
  },
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    level: LogLevel.ERROR,
    source: LogSource.SURICATA,
    message: 'Signature alert: ET TROJAN Possible Win.Trojan.GenericDKZ Connection',
    data: { signatureId: 2029841, severity: 1, srcIp: '192.168.1.100', dstIp: '185.141.63.78' },
    hostname: 'ids-sensor-02',
    service: 'suricata',
    environment: Environment.PRODUCTION,
    version: '7.0.0',
    tags: ['production', 'security']
  },
  {
    id: 'log-004',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    level: LogLevel.CRITICAL,
    source: LogSource.WAZUH,
    message: 'Integrity checksum changed for /etc/passwd',
    data: { agentId: '001', file: '/etc/passwd', action: 'modified' },
    hostname: 'agent-linux-001',
    service: 'wazuh',
    environment: Environment.PRODUCTION,
    version: '4.8.0',
    tags: ['production', 'critical', 'fim']
  }
];

const sampleAuditEntries: AuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: AuditAction.LOGIN,
    actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', username: 'admin_soc', roles: ['admin'] },
    resource: { type: ResourceType.USER, id: 'user-001', name: 'admin_soc' },
    outcome: AuditOutcome.SUCCESS,
    description: 'Administrator login from SOC workstation',
    riskScore: 25,
    entryHash: 'sha256:abc123...',
    retentionUntil: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000).toISOString(),
    complianceTags: ['SOC2.AC.1', 'NIST.AC-2', 'ALGERIAN.Art12']
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: AuditAction.INCIDENT_CREATE,
    actor: { id: 'analyst-001', type: ActorType.USER, displayName: 'ahmed_benali', username: 'ahmed_benali', roles: ['analyst'] },
    resource: { type: ResourceType.INCIDENT, id: 'INC-2026-0042', name: 'Suspicious DNS Tunneling Activity' },
    outcome: AuditOutcome.SUCCESS,
    description: 'Created incident for detected DNS tunneling to known C2 infrastructure',
    riskScore: 50,
    entryHash: 'sha256:def456...',
    retentionUntil: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000).toISOString(),
    complianceTags: ['ISO.A.16.1', 'NIST.IR-4', 'ALGERIAN.Art8']
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    action: AuditAction.CONFIG_CHANGE,
    actor: { id: 'user-001', type: ActorType.USER, displayName: 'admin_soc', roles: ['admin'] },
    resource: { type: ResourceType.CONFIGURATION, id: 'config-syslog-01', name: 'Syslog Server Configuration' },
    outcome: AuditOutcome.SUCCESS,
    description: 'Updated syslog forwarding endpoint to new SIEM collector',
    previousState: { endpoint: 'old-siem.dz:514' },
    newState: { endpoint: 'new-siem.dz:514' },
    changedFields: ['endpoint'],
    riskScore: 80,
    entryHash: 'sha256:ghi789...',
    retentionUntil: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000).toISOString(),
    complianceTags: ['SOC2.CM.1', 'ISO.A.12.4']
  }
];

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

/**
 * Comprehensive Logging Dashboard Component
 */
export function LoggingDashboard({
  defaultTab = 'live',
  autoRefreshInterval = 5000,
  compact = false
}: LoggingDashboardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filtered logs based on current filters
  const filteredLogs = useMemo(() => {
    return sampleLogs.filter(log => {
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
        return false;
      }
      if (selectedSource !== 'all' && log.source !== selectedSource) {
        return false;
      }
      return true;
    });
  }, [searchQuery, selectedLevel, selectedSource]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className={`logging-dashboard ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="dashboard-header flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🛡️ Centralized Logging & Audit Console
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            National SOC Platform • Real-time monitoring and compliance tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ● System Healthy
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {Icons.refresh} Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto flex-wrap">
          <TabsTrigger value="live">Live Feed</TabsTrigger>
          <TabsTrigger value="search">{Icons.search} Search</TabsTrigger>
          <TabsTrigger value="audit">{Icons.shield} Audit</TabsTrigger>
          <TabsTrigger value="analytics">{Icons.chart} Analytics</TabsTrigger>
          <TabsTrigger value="compliance">{Icons.lock} Compliance</TabsTrigger>
          <TabsTrigger value="retention">{Icons.database} Retention</TabsTrigger>
          <TabsTrigger value="shipping">{Icons.upload} Shipping</TabsTrigger>
          <TabsTrigger value="pii">{Icons.eye} PII Scanner</TabsTrigger>
        </TabsList>

        {/* LIVE FEED TAB */}
        <TabsContent value="live" className="mt-4">
          <LiveFeedTab
            logs={filteredLogs}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            autoRefreshInterval={autoRefreshInterval}
          />
        </TabsContent>

        {/* SEARCH TAB */}
        <TabsContent value="search" className="mt-4">
          <SearchTab
            logs={sampleLogs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
          />
        </TabsContent>

        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit" className="mt-4">
          <AuditTrailTab entries={sampleAuditEntries} />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance" className="mt-4">
          <ComplianceTab />
        </TabsContent>

        {/* RETENTION TAB */}
        <TabsContent value="retention" className="mt-4">
          <RetentionTab />
        </TabsContent>

        {/* SHIPPING TAB */}
        <TabsContent value="shipping" className="mt-4">
          <ShippingTab />
        </TabsContent>

        {/* PII SCANNER TAB */}
        <TabsContent value="pii" className="mt-4">
          <PIIScannerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// LIVE FEED TAB COMPONENT
// ============================================================================

interface LiveFeedTabProps {
  logs: LogEntry[];
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefreshInterval: number;
}

function LiveFeedTab({ logs, onRefresh, isRefreshing, autoRefreshInterval }: LiveFeedTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              📡 Live Log Stream
              <Badge variant="secondary" className="animate-pulse">
                AUTO-REFRESH ({autoRefreshInterval / 1000}s)
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time log stream from all SOC platform components
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            {Icons.refresh} {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] rounded-md border p-4 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No log entries match current filters
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogEntryRow key={log.id} entry={log} showDetails />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SEARCH TAB COMPONENT
// ============================================================================

interface SearchTabProps {
  logs: LogEntry[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLevel: string;
  setSelectedLevel: (l: string) => void;
  selectedSource: string;
  setSelectedSource: (s: string) => void;
}

function SearchTab({
  logs,
  searchQuery,
  setSearchQuery,
  selectedLevel,
  setSelectedLevel,
  selectedSource,
  setSelectedSource
}: SearchTabProps) {
  return (
    <div className="space-y-4">
      {/* Search Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{Icons.search} Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Text Search</Label>
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {Object.values(LogLevel).map(level => (
                    <SelectItem key={level} value={level}>
                      {LevelConfig[level].icon} {LevelConfig[level].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value={LogSource.SECURITY}>Security</SelectItem>
                  <SelectItem value={LogSource.AUTH}>Authentication</SelectItem>
                  <SelectItem value={LogSource.API}>API</SelectItem>
                  <SelectItem value={LogSource.WAZUH}>Wazuh</SelectItem>
                  <SelectItem value={LogSource.SURICATA}>Suricata</SelectItem>
                  <SelectItem value={LogSource.MISP}>MISP</SelectItem>
                  <SelectItem value={LogSource.SYSTEM}>System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="default">
                  {Icons.search} Search
                </Button>
                <Button size="sm" variant="outline">
                  Reset
                </Button>
                <Button size="sm" variant="outline">
                  {Icons.download} Export
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Results ({logs.length})</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">Page 1 of 1</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[80px]">Level</TableHead>
                <TableHead className="w-[140px]">Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    No results found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: LevelConfig[log.level].bg,
                          color: LevelConfig[log.level].color
                        }}
                      >
                        {LevelConfig[log.level].icon} {log.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.source}</TableCell>
                    <TableCell className="max-w-md truncate">{log.message}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {Icons.eye}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Log Entry Details</DialogTitle>
                            <DialogDescription>
                              Full details for log entry {log.id}
                            </DialogDescription>
                          </DialogHeader>
                          <LogDetailPanel entry={log} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// AUDIT TRAIL TAB COMPONENT
// ============================================================================

interface AuditTrailTabProps {
  entries: AuditEntry[];
}

function AuditTrailTab({ entries }: AuditTrailTabProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{entries.length}</div>
            <p className="text-sm text-gray-500">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {entries.filter(e => e.outcome === AuditOutcome.SUCCESS).length}
            </div>
            <p className="text-sm text-gray-500">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {entries.filter(e => e.outcome === AuditOutcome.FAILURE || e.outcome === AuditOutcome.DENIED).length}
            </div>
            <p className="text-sm text-gray-500">Failed/Denied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(entries.reduce((sum, e) => sum + (e.riskScore || 0), 0) / entries.length)}
            </div>
            <p className="text-sm text-gray-500">Avg Risk Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Chain Integrity Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-800">Audit Chain Integrity Verified</p>
              <p className="text-sm text-green-600">
                All {entries.length} entries have valid SHA-256 hash chain linkage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{Icons.shield} Immutable Audit Trail</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                {Icons.download} Export
              </Button>
              <Button size="sm" variant="outline">
                Verify Integrity
              </Button>
            </div>
          </div>
          <CardDescription>
            Tamper-evident audit records with cryptographic hash chaining
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.action.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{getActorIcon(entry.actor.type)}</span>
                      <span className="text-sm">{entry.actor.displayName || entry.actor.id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[150px] truncate">
                    {entry.resource.name || `${entry.resource.type}:${entry.resource.id}`}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={entry.outcome === AuditOutcome.SUCCESS ? 'default' : 'destructive'}
                    >
                      {entry.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RiskScoreBadge score={entry.riskScore || 0} />
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-sm">
                    {entry.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ANALYTICS TAB COMPONENT
// ============================================================================

function AnalyticsTab() {
  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-2xl font-bold">15,482</div>
                <p className="text-sm text-gray-500">Total Logs (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-2xl font-bold text-yellow-600">234</div>
                <p className="text-sm text-gray-500">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <div className="text-2xl font-bold text-red-600">45</div>
                <p className="text-sm text-gray-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <div>
                <div className="text-2xl font-bold text-red-800">3</div>
                <p className="text-sm text-gray-500">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Log Volume by Level */}
        <Card>
          <CardHeader>
            <CardTitle>Log Volume by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { level: LogLevel.INFO, count: 12500, percent: 80.7 },
                { level: LogLevel.WARN, count: 2340, percent: 15.1 },
                { level: LogLevel.ERROR, count: 420, percent: 2.7 },
                { level: LogLevel.DEBUG, count: 180, percent: 1.2 },
                { level: LogLevel.CRITICAL, count: 42, percent: 0.3 }
              ].map(({ level, count, percent }) => (
                <div key={level} className="flex items-center gap-3">
                  <Badge
                    style={{
                      backgroundColor: LevelConfig[level].bg,
                      color: LevelConfig[level].color,
                      width: 90,
                      justifyContent: 'center'
                    }}
                  >
                    {level}
                  </Badge>
                  <Progress value={percent} className="flex-1" />
                  <span className="text-sm font-mono w-20 text-right">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Top Log Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { source: 'Wazuh SIEM', count: 5200, icon: '🦅' },
                { source: 'Suricata IDS', count: 3100, icon: '🐉' },
                { source: 'Authentication', count: 2400, icon: '🔐' },
                { source: 'API Gateway', count: 2100, icon: '🔌' },
                { source: 'Application', count: 1500, icon: '📱' },
                { source: 'MISP Threat Intel', count: 782, icon: '🦋' }
              ].map(({ source, count, icon }) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-sm">{source}</span>
                  </div>
                  <span className="font-mono text-sm">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Error Rate Trend (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end gap-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const height = Math.random() * 100;
              const isError = height > 70;
              return (
                <div
                  key={i}
                  className={`flex-1 min-h-[4px] rounded-t ${isError ? 'bg-red-400' : 'bg-blue-300'}`}
                  style={{ height: `${height}%` }}
                  title={`${i}:00 - ${Math.round(height)}%`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>24h ago</span>
            <span>12h ago</span>
            <span>Now</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPLIANCE TAB COMPONENT
// ============================================================================

function ComplianceTab() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>(ComplianceFramework.SOC2);

  const frameworks = [
    { id: ComplianceFramework.SOC2, name: 'SOC 2 Type II', icon: '🏢', overall: 94.5 },
    { id: ComplianceFramework.GDPR, name: 'GDPR (EU)', icon: '🇪🇺', overall: 92.0 },
    { id: ComplianceFramework.ISO27001, name: 'ISO 27001', icon: '📋', overall: 89.5 },
    { id: ComplianceFramework.NIST, name: 'NIST Cybersecurity Framework', icon: '🛡️', overall: 91.0 },
    { id: ComplianceFramework.ALGERIAN_CYBERSECURITY_LAW, name: 'Algerian Cyber Law', icon: '🇩🇿', overall: 96.0 }
  ];

  const requirements = [
    { id: 'SOC2.AC.1', title: 'Access Control Program', status: 'compliant', completeness: 95 },
    { id: 'SOC2.CM.1', title: 'Change Management', status: 'partial', completeness: 88 },
    { id: 'SOC2.SO.1', title: 'System Operations', status: 'compliant', completeness: 92 },
    { id: 'SOC2.RM.1', title: 'Risk Mitigation', status: 'partial', completeness: 78 },
    { id: 'SOC2.LM.1', title: 'Logging & Monitoring', status: 'compliant', completeness: 98 }
  ];

  return (
    <div className="space-y-4">
      {/* Framework Selection */}
      <div className="flex gap-2 flex-wrap">
        {frameworks.map(fw => (
          <Button
            key={fw.id}
            variant={selectedFramework === fw.id ? 'default' : 'outline'}
            onClick={() => setSelectedFramework(fw.id)}
            className="flex items-center gap-2"
          >
            <span>{fw.icon}</span>
            <span>{fw.name}</span>
            <Badge variant="secondary" className="ml-1">{fw.overall}%</Badge>
          </Button>
        ))}
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Overall Compliance: {frameworks.find(f => f.id === selectedFramework)?.overall}%
              </h3>
              <p className="text-gray-500">
                Based on audit trail analysis of the last 30 days
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600">
                {frameworks.find(f => f.id === selectedFramework)?.overall}%
              </div>
              <p className="text-sm text-gray-500">Compliant</p>
            </div>
          </div>
          <Progress value={frameworks.find(f => f.id === selectedFramework)?.overall} className="mt-4 h-3" />
        </CardContent>
      </Card>

      {/* Requirements Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Requirement Status</CardTitle>
          <CardDescription>Detailed compliance per requirement</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requirement</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completeness</TableHead>
                <TableHead>Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell>{req.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        req.status === 'compliant' ? 'default' :
                        req.status === 'partial' ? 'secondary' : 'destructive'
                      }
                    >
                      {req.status === 'compliant' ? '✅ Compliant' :
                       req.status === 'partial' ? '⚠️ Partial' : '❌ Gap'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={req.completeness} className="w-24" />
                      <span className="text-sm">{req.completeness}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {Math.floor(Math.random() * 500 + 100)} entries
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span><strong>Risk Mitigation (RM.1):</strong> Implement automated response playbooks for high-risk events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-600">•</span>
              <span><strong>Change Management (CM.1):</strong> Add rollback documentation requirement to change process</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// RETENTION TAB COMPONENT
// ============================================================================

function RetentionTab() {
  const policies = [
    {
      id: 'policy-001',
      name: 'Security Events - 7 Year',
      sources: ['Security', 'Wazuh', 'Suricata'],
      retentionDays: 2555,
      action: 'Archive',
      enabled: true,
      processed: 1250000,
      spaceFreed: '250 GB'
    },
    {
      id: 'policy-002',
      name: 'Audit Trail - 7 Year',
      sources: ['Audit'],
      retentionDays: 2555,
      action: 'Cold Storage',
      enabled: true,
      processed: 890000,
      spaceFreed: '45 GB'
    },
    {
      id: 'policy-003',
      name: 'Auth Logs - 3 Year',
      sources: ['Auth', 'Login', 'MFA'],
      retentionDays: 1095,
      action: 'Compress',
      enabled: true,
      processed: 2500000,
      spaceFreed: '120 GB'
    },
    {
      id: 'policy-004',
      name: 'App/API Logs - 90 Day',
      sources: ['API', 'Application'],
      retentionDays: 90,
      action: 'Delete',
      enabled: true,
      processed: 15000000,
      spaceFreed: '500 GB'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">3.24 TB</div>
            <p className="text-sm text-gray-500">Total Storage Used</p>
            <Progress value={32.5} className="mt-2" />
            <p className="text-xs text-gray-400 mt-1">32.5% of 10 TB quota</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">4.2M</div>
            <p className="text-sm text-gray-500">Entries Expiring Soon (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">865 GB</div>
            <p className="text-sm text-gray-500">Space Freed by Policies</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Retention Policies</CardTitle>
            <Button size="sm">+ Create Policy</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Space Freed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map(policy => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {policy.sources.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatRetention(policy.retentionDays)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{policy.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.enabled ? 'default' : 'outline'}>
                      {policy.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {(policy.processed / 1000000).toFixed(1)}M
                  </TableCell>
                  <TableCell className="font-mono text-xs">{policy.spaceFreed}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">⋮</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline">
          🔄 Apply All Policies Now
        </Button>
        <Button variant="outline">
          👁️ Preview Changes
        </Button>
        <Button variant="outline">
          📊 Storage Forecast
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// SHIPPING TAB COMPONENT
// ============================================================================

function ShippingTab() {
  return (
    <div className="space-y-4">
      {/* Shipper Status */}
      <Card className="border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <h3 className="font-semibold text-green-800">Shipper Status: Healthy</h3>
                <p className="text-sm text-green-600">All transports operational • Uptime: 99.97%</p>
              </div>
            </div>
            <div className="text-right">
              <Button size="sm" variant="outline">Test Connection</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transport Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Elasticsearch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipped</span>
                <span className="font-mono">1,547,823</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Latency</span>
                <span className="font-mono">23ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Backlog</span>
                <span className="font-mono">47</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">File Transport</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Written</span>
                <span className="font-mono">1,470,432</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Files Rotated</span>
                <span className="font-mono">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Disk Usage</span>
                <span className="font-mono">85 GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">HTTP (SIEM)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Forwarded</span>
                <span className="font-mono">892,341</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Latency</span>
                <span className="font-mono">45ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failures</span>
                <span className="font-mono text-red-600">89</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shipping Configurations</CardTitle>
            <Button size="sm">+ New Configuration</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Production Elasticsearch', sources: 'All', transports: 'ES + File', active: true },
              { name: 'Security Events → SIEM', sources: 'Security Only', transports: 'HTTP', active: true },
              { name: 'Audit Trail Archive', sources: 'Audit Only', transports: 'ES Cold', active: true }
            ].map((config, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant={config.active ? 'default' : 'outline'}>
                    {config.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div>
                    <p className="font-medium">{config.name}</p>
                    <p className="text-sm text-gray-500">Sources: {config.sources} • Transports: {config.transports}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backlog Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Backlog Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current backlog: <strong>64 entries</strong> (oldest: 45s)</p>
              <p className="text-xs text-gray-400">Estimated clear time: ~2 minutes at current rate</p>
            </div>
            <Button>Force Flush All</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PII SCANNER TAB COMPONENT
// ============================================================================

function PIIScannerTab() {
  const sampleFindings = [
    { type: 'Email Address', field: 'data.userEmail', rawValue: 'admin@soc.dz', masked: 'a***n@soc.dz', risk: 'Medium', confidence: 0.95 },
    { type: 'IP Address', field: 'clientIp', rawValue: '192.168.1.100', masked: '192.168.1.***', risk: 'Low', confidence: 0.99 },
    { type: 'Password', field: 'data.password', rawValue: '[REDACTED]', masked: '[REDACTED]', risk: 'Critical', confidence: 0.97 }
  ];

  return (
    <div className="space-y-4">
      {/* Scan Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔍</span>
              <div>
                <h3 className="font-semibold">PII Detection Status</h3>
                <p className="text-sm text-gray-500">
                  Automatic scanning enabled • Last scan: 2 minutes ago
                </p>
              </div>
            </div>
            <Button>Run Full Scan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-bold text-yellow-600">23</div>
            <p className="text-sm text-gray-500">Items Detected Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-bold text-red-600">3</div>
            <p className="text-sm text-gray-500">Critical Risk Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-bold text-green-600">156</div>
            <p className="text-sm text-gray-500">Successfully Masked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-bold">99.2%</div>
            <p className="text-sm text-gray-500">Detection Accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent PII Findings</CardTitle>
          <CardDescription>Potentially sensitive data detected in recent logs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Original Value</TableHead>
                <TableHead>Masked Value</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleFindings.map((finding, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="outline">{finding.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{finding.field}</TableCell>
                  <TableCell className="font-mono text-xs text-red-600 line-through">{finding.rawValue}</TableCell>
                  <TableCell className="font-mono text-xs text-green-600">{finding.masked}</TableCell>
                  <TableCell>
                    <RiskBadge level={finding.risk as any} />
                  </TableCell>
                  <TableCell>{(finding.confidence * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Review</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detection Rules */}
      <Card>
        <CardHeader>
          <CardTitle>PII Detection Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { type: 'Email Addresses', pattern: 'Regex', action: 'Mask', enabled: true },
              { type: 'Phone Numbers', pattern: 'Regex (DZ)', action: 'Mask', enabled: true },
              { type: 'Credit Cards', pattern: 'Luhn Check', action: 'Redact', enabled: true },
              { type: 'Passwords', pattern: 'Key Match', action: 'Redact', enabled: true },
              { type: 'API Keys', pattern: 'Pattern Match', action: 'Redact', enabled: true },
              { type: 'JWT Tokens', pattern: 'Structure', action: 'Redact', enabled: true },
              { type: 'IP Addresses', pattern: 'IPv4/IPv6', action: 'Partial Mask', enabled: true },
              { type: 'IBAN (Algeria)', pattern: 'DZ Format', action: 'Mask', enabled: true },
              { type: 'National ID', pattern: 'Numeric', action: 'Hash', enabled: false }
            ].map((rule, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={rule.enabled} readOnly />
                  <div>
                    <p className="text-sm font-medium">{rule.type}</p>
                    <p className="text-xs text-gray-500">{rule.pattern} → {rule.action}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">⋮</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/** Single log entry row component */
function LogEntryRow({ entry, showDetails = false }: { entry: LogEntry; showDetails?: boolean }) {
  const config = LevelConfig[entry.level];
  
  return (
    <div
      className="p-2 rounded border-l-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      style={{ borderLeftColor: config.color }}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs opacity-60 whitespace-nowrap">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
        <Badge
          variant="outline"
          className="shrink-0 text-xs"
          style={{ backgroundColor: config.bg, color: config.color }}
        >
          {config.icon} {entry.level.toUpperCase()}
        </Badge>
        <span className="text-xs text-gray-500 shrink-0">[{entry.source}]</span>
        <span className="text-sm flex-1 break-all">{entry.message}</span>
      </div>
      
      {showDetails && entry.data && Object.keys(entry.data).length > 0 && (
        <pre className="mt-2 ml-16 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/** Detailed log entry panel for dialog */
function LogDetailPanel({ entry }: { entry: LogEntry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label className="text-gray-500">ID</Label>
          <p className="font-mono text-xs">{entry.id}</p>
        </div>
        <div>
          <Label className="text-gray-500">Timestamp</Label>
          <p>{new Date(entry.timestamp).toLocaleString()}</p>
        </div>
        <div>
          <Label className="text-gray-500">Level</Label>
          <Badge style={{ backgroundColor: LevelConfig[entry.level].bg, color: LevelConfig[entry.level].color }}>
            {entry.level.toUpperCase()}
          </Badge>
        </div>
        <div>
          <Label className="text-gray-500">Source</Label>
          <p className="font-mono">{entry.source}</p>
        </div>
        <div>
          <Label className="text-gray-500">Service</Label>
          <p>{entry.service}</p>
        </div>
        <div>
          <Label className="text-gray-500">Environment</Label>
          <p>{entry.environment}</p>
        </div>
        {entry.correlationId && (
          <div>
            <Label className="text-gray-500">Correlation ID</Label>
            <p className="font-mono text-xs">{entry.correlationId}</p>
          </div>
        )}
        {entry.userId && (
          <div>
            <Label className="text-gray-500">User ID</Label>
            <p className="font-mono text-xs">{entry.userId}</p>
          </div>
        )}
        {entry.clientIp && (
          <div>
            <Label className="text-gray-500">Client IP</Label>
            <p className="font-mono">{entry.clientIp}</p>
          </div>
        )}
      </div>
      
      <Separator />
      
      <div>
        <Label className="text-gray-500">Message</Label>
        <p className="mt-1">{entry.message}</p>
      </div>
      
      {entry.data && (
        <div>
          <Label className="text-gray-500">Data</Label>
          <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
            {JSON.stringify(entry.data, null, 2)}
          </pre>
        </div>
      )}
      
      {entry.error && (
        <div>
          <Label className="text-gray-500">Error</Label>
          <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm">
            <p><strong>{entry.error.name}</strong>: {entry.error.message}</p>
            {entry.error.stackTrace && (
              <pre className="mt-2 text-xs overflow-x-auto">{entry.error.stackTrace}</pre>
            )}
          </div>
        </div>
      )}
      
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex gap-1">
          {entry.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Actor type icon helper */
function getActorIcon(type: ActorType): string {
  switch (type) {
    case ActorType.USER: return '👤';
    case ActorType.SERVICE: return '⚙️';
    case ActorType.SYSTEM: return '🖥️';
    case ActorType.API_KEY: return '🔑';
    case ActorType.EXTERNAL: return '🌐';
    default: return '❓';
  }
}

/** Risk score badge */
function RiskScoreBadge({ score }: { score: number }) {
  let color = 'bg-green-100 text-green-800';
  if (score >= 70) color = 'bg-red-100 text-red-800';
  else if (score >= 40) color = 'bg-yellow-100 text-yellow-800';
  else if (score >= 20) color = 'bg-orange-100 text-orange-800';
  
  return (
    <Badge variant="outline" className={color}>
      {score}/100
    </Badge>
  );
}

/** Risk level badge */
function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-blue-100 text-blue-800',
    None: 'bg-gray-100 text-gray-800'
  };
  
  return (
    <Badge variant="outline" className={colors[level] || colors.None}>
      {level}
    </Badge>
  );
}

/** Format retention days to human readable */
function formatRetention(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 Year' : `${years} Years`;
  }
  if (days >= 30) {
    return `${Math.floor(days / 30)} Months`;
  }
  return `${days} Days`;
}

export default LoggingDashboard;
