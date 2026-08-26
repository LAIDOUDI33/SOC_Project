/**
 * 🇩🇿 National SOC - Wazuh Dashboard Component
 * Real-time security monitoring dashboard with Wazuh integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Server,
  FileWarning,
  Bug,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  Lock,
  Unlock,
} from 'lucide-react';

// Types
interface WazuhDashboardProps {
  className?: string;
}

// Mock data for development (replace with real API calls)
const mockData = {
  health: {
    healthy: true,
    manager: { status: 'healthy', version: '4.8.0' },
    agents: { active: 145, total: 152, disconnected: 5, never_connected: 2 },
    alerts: { last_24h: 12847, critical: 23 },
  },
  recentAlerts: [
    { id: '1', timestamp: '2026-07-25T10:30:00Z', rule: { level: 14, description: 'SQL Injection Attempt', groups: ['web', 'attack'] }, agent: { name: 'WEB-SERVER-01' }, srcip: '192.168.1.100' },
    { id: '2', timestamp: '2026-07-25T10:29:45Z', rule: { level: 12, description: 'Multiple Authentication Failures', groups: ['authentication', 'security_event'] }, agent: { name: 'DC-MAIN-01' }, srcip: '10.0.0.55' },
    { id: '3', timestamp: '2026-07-25T10:29:30Z', rule: { level: 10, description: 'Malware Detection - Eicar Test File', groups: ['antivirus', 'malware'] }, agent: { name: 'WORKSTATION-42' } },
    { id: '4', timestamp: '2026-07-25T10:29:15Z', rule: { level: 7, description: 'SSH Login Success', groups: ['authentication'] }, agent: { name: 'LINUX-SERVER-03' }, user: 'admin' },
    { id: '5', timestamp: '2026-07-25T10:29:00Z', rule: { level: 5, description: 'File Modified - Critical Config', groups: ['syscheck', 'fim'] }, agent: { name: 'FIREWALL-01' }, file: '/etc/firewall/rules.conf' },
  ],
  compliance: {
    pci_dss: 94,
    gdpr: 88,
    hipaa: 91,
    nist: 96,
    tsc: 89,
    overall: 92,
  },
  fileChanges: [
    { path: '/etc/passwd', event: 'modified', agent: 'SERVER-01', timestamp: '2026-07-25T10:28:00Z' },
    { path: '/var/www/html/index.php', event: 'added', agent: 'WEB-02', timestamp: '2026-07-25T10:27:00Z' },
    { path: '/tmp/backdoor.sh', event: 'added', agent: 'WEB-01', timestamp: '2026-07-25T10:26:00Z' },
    { path: '/etc/cron.d/malicious', event: 'added', agent: 'DB-SERVER', timestamp: '2026-07-25T10:25:00Z' },
  ],
  vulnerabilities: {
    total: 47,
    critical: 3,
    high: 12,
    medium: 22,
    low: 10,
    affected_agents: 18,
  },
};

// ────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────

function HealthStatusBadge({ healthy }: { healthy: boolean }) {
  return (
    <Badge variant={healthy ? 'default' : 'destructive'} className="flex items-center gap-1">
      {healthy ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {healthy ? 'Healthy' : 'Issues Detected'}
    </Badge>
  );
}

function SeverityBadge({ level }: { level: number }) {
  if (level >= 13) return <Badge variant="destructive">Critical</Badge>;
  if (level >= 10) return <Badge className="bg-red-500">High</Badge>;
  if (level >= 7) return <Badge className="bg-orange-500">Medium</Badge>;
  if (level >= 4) return <Badge className="bg-yellow-500">Low</Badge>;
  return <Badge variant="secondary">Info</Badge>;
}

function ComplianceScoreCard({ title, score }: { title: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{title}</span>
        <span className={`text-lg font-bold ${getColor(score)}`}>{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );
}

// ────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────

export function WazuhDashboard({ className }: WazuhDashboardProps) {
  const [data, setData] = useState(mockData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Simulate data refresh (replace with real API calls)
  const handleRefresh = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setData(mockData); // Replace with actual fetch
    setLastRefresh(new Date());
    setLoading(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(handleRefresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={className} space-y-6}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            Wazuh Security Monitoring
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            SIEM/EDR Integration • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HealthStatusBadge healthy={data.health.healthy} />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-3xl font-bold text-green-600">
                  {loading ? <Skeleton className="h-8 w-16" /> : data.health.agents.active}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {data.health.agents.total} total
                </p>
              </div>
              <Server className="w-10 h-10 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alerts (24h)</p>
                <p className="text-3xl font-bold text-blue-600">
                  {loading ? <Skeleton className="h-8 w-20" /> : data.health.alerts.last_24h.toLocaleString()}
                </p>
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {data.health.alerts.critical} critical
                </p>
              </div>
              <Activity className="w-10 h-10 text-blue-100 bg-blue-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vulnerabilities</p>
                <p className="text-3xl font-bold text-orange-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : data.vulnerabilities.total}
                </p>
                <p className="text-xs text-red-500">
                  {data.vulnerabilities.critical} critical
                </p>
              </div>
              <Bug className="w-10 h-10 text-orange-100 bg-orange-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                <p className="text-3xl font-bold text-purple-600">
                  {loading ? <Skeleton className="h-8 w-12" /> : `${data.compliance.overall}%`}
                </p>
                <p className="text-xs text-muted-foreground">
                  PCI-DSS: {data.compliance.pci_dss}%
                </p>
              </div>
              <Shield className="w-10 h-10 text-purple-100 bg-purple-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="fim">FIM Events</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Recent Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentAlerts.slice(0, 5).map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="text-xs">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <SeverityBadge level={alert.rule.level} />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {alert.rule.description}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {alert.agent.name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent File Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-yellow-500" />
                  Recent File Changes (FIM)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {data.fileChanges.map((change, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {change.event === 'added' ? (
                            <Badge variant="default" className="bg-blue-500">Added</Badge>
                          ) : change.event === 'deleted' ? (
                            <Badge variant="destructive">Deleted</Badge>
                          ) : (
                            <Badge className="bg-yellow-500">Modified</Badge>
                          )}
                          <span className="font-mono text-sm truncate max-w-[250px]">
                            {change.path}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {change.agent}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Real-time alert feed from all monitored endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Rule Description</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(alert.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge level={alert.rule.level} />
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <div className="truncate text-sm" title={alert.rule.description}>
                            {alert.rule.description}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {alert.rule.groups?.slice(0, 2).map(group => (
                              <Badge key={group} variant="outline" className="text-xs px-1 py-0">
                                {group}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{alert.agent.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {alert.srcip || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Investigate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Wifi className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold text-green-600">{data.health.agents.active}</p>
                <p className="text-sm text-muted-foreground">Active Agents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <WifiOff className="w-8 h-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-600">{data.health.agents.disconnected}</p>
                <p className="text-sm text-muted-foreground">Disconnected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Server className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                <p className="text-2xl font-bold text-gray-600">{data.health.agents.never_connected}</p>
                <p className="text-sm text-muted-foreground">Never Connected</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Agent Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Coverage Rate</span>
                  <span className="font-medium">
                    {Math.round((data.health.agents.active / data.health.agents.total) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(data.health.agents.active / data.health.agents.total) * 100} 
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Security Compliance Scores</CardTitle>
              <CardDescription>Based on Security Configuration Assessment (SCA)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ComplianceScoreCard title="PCI-DSS" score={data.compliance.pci_dss} />
                <ComplianceScoreCard title="GDPR" score={data.compliance.gdpr} />
                <ComplianceScoreCard title="HIPAA" score={data.compliance.hipaa} />
                <ComplianceScoreCard title="NIST" score={data.compliance.nist} />
                <ComplianceScoreCard title="TSC" score={data.compliance.tsc} />
                <ComplianceScoreCard title="Overall" score={data.compliance.overall} />
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Recommendations
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Review GDPR compliance gaps in data handling procedures</li>
                  <li>• Update TSC controls to meet latest requirements</li>
                  <li>• Schedule remediation for failed SCA checks</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIM Tab */}
        <TabsContent value="fim">
          <Card>
            <CardHeader>
              <CardTitle>File Integrity Monitoring Events</CardTitle>
              <CardDescription>Detect unauthorized file modifications across all agents</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>File Path</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.fileChanges.map((change, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(change.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {change.event === 'added' ? (
                            <Badge variant="default" className="bg-blue-500">Added</Badge>
                          ) : change.event === 'deleted' ? (
                            <Badge variant="destructive">Deleted</Badge>
                          ) : (
                            <Badge className="bg-yellow-500">Modified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-[300px]">
                          {change.path}
                        </TableCell>
                        <TableCell>{change.agent}</TableCell>
                        <TableCell>
                          {change.path.includes('/tmp/') || change.path.includes('backdoor') ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Suspicious
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export sub-components for reuse
export { SeverityBadge, HealthStatusBadge, ComplianceScoreCard };
