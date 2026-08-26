/**
 * 🇩🇿 National SOC - Suricata IDS/IPS Dashboard
 * Network intrusion detection system monitoring UI
 */

'use client';

import React, { useState } from 'react';
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
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Lock,
  Eye,
  RefreshCw,
  Network,
  FileWarning,
  Server,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
} from 'lucide-react';

// Types
interface SuricataDashboardProps {
  className?: string;
}

// Mock data for development
const mockData = {
  health: {
    healthy: true,
    version: '7.0.3',
    uptime: 864000, // 10 days in seconds
    running: true,
    capture_stats: {
      kernel_packets: 45678901,
      kernel_drops: 1234,
      bytes: 56789012345,
      packets: 45677667,
      avg_bytes_per_packet: 1243,
      max_bytes_per_packet: 65535,
    },
  },
  alerts: {
    today: 1234,
    criticalToday: 67,
    thisWeek: 8921,
    topSignatures: [
      { signature: 'ET TROJAN Possible EK RIG Kit', count: 234 },
      { signature: 'ET MALWARE Possible Win.Trojan.Generic-6', count: 189 },
      { signature: 'ET POLICY Outbound to .onion Darknet', count: 156 },
      { signature: 'SURICATA HTTP suspicious long header', count: 134 },
      { signature: 'ET INFO DCE/RPC Mgmt API Connection', count: 98 },
    ],
    topSrcIPs: [
      { ip: '192.168.1.100', count: 456 },
      { ip: '10.0.0.55', count: 234 },
      { ip: '172.16.0.22', count: 189 },
      { ip: '192.168.2.50', count: 156 },
      { ip: '10.20.30.40', count: 134 },
    ],
    topDstIPs: [
      { ip: '185.220.101.xxx', count: 567 },
      { ip: '45.33.32.xxx', count: 345 },
      { ip: '91.121.87.xxx', count: 234 },
      { ip: '198.51.100.xxx', count: 189 },
      { ip: '203.0.113.xxx', count: 167 },
    ],
    byProtocol: { TCP: 5432, UDP: 2341, ICMP: 567, HTTP: 1890, DNS: 876, TLS: 654 },
    byAction: { allowed: 8921, blocked: 234, dropped: 156, rejected: 34 },
  },
  rules: {
    total: 45678,
    enabled: 44123,
    disabled: 1555,
    lastUpdated: new Date().toISOString(),
  },
};

// ────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const config = {
    allowed: { label: 'Allowed', variant: 'secondary' as const, icon: Eye },
    blocked: { label: 'Blocked', variant: 'destructive' as const, icon: Ban },
    dropped: { label: 'Dropped', variant: 'destructive' as const, className: 'bg-red-700 text-white' },
    rejected: { label: 'Rejected', variant: 'outline' as const, className: 'border-orange-500 text-orange-600' },
  };
  
  const { ...props } = config[action as keyof typeof config] || config.allowed;
  return <Badge {...props} variant={props.variant}>{config[action as keyof typeof config].label}</Badge>;
}

function SeverityIndicator({ severity }: { severity: string }) {
  if (severity === 'critical') return <div className="w-3 h-3 rounded-full bg-red-500" />;
  if (severity === 'high') return <div className="w-3 h-3 rounded-full bg-orange-500" />;
  if (severity === 'medium') return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
  return <div className="w-3 h-3 rounded-full bg-blue-500" />;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────

export function SuricataDashboard({ className }: SuricataDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className={className} space-y-6}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            Suricata IDS/IPS
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Network Intrusion Detection System • Real-time Threat Monitoring
          </p>
        </div>
        <Button variant="outline" className="gap-1">
          <RefreshCw className="w-4 h-4" />
          Update Ruleset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alerts Today</p>
                <p className="text-3xl font-bold text-blue-600">{mockData.alerts.today.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{mockData.alerts.criticalToday} critical</p>
              </div>
              <Activity className="w-10 h-10 text-blue-100 bg-blue-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-3xl font-bold text-purple-600">{mockData.alerts.thisWeek.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-100 bg-purple-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-3xl font-bold text-green-600">{mockData.rules.enabled.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">of {mockData.rules.total.toLocaleString()} total</p>
              </div>
              <Shield className="w-10 h-10 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Packets/Sec</p>
                <p className="text-3xl font-bold text-orange-600">
                  {(mockData.health.capture_stats.packets / mockData.health.uptime).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <Network className="w-10 h-10 text-orange-100 bg-orange-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IDS Status</p>
                <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Running
                </p>
                <p className="text-xs text-muted-foreground">v{mockData.health.version}</p>
              </div>
              <Server className="w-10 h-10 text-green-100 bg-green-500 rounded-full p-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Signatures */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Top Alert Signatures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {mockData.alerts.topSignatures.map((sig, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors">
                        <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                        <span className="flex-1 text-sm truncate font-mono">{sig.signature}</span>
                        <Badge variant="outline" className="ml-auto">{sig.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Traffic Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Traffic Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* By Action */}
                <div>
                  <h4 className="text-sm font-medium mb-2">By Action</h4>
                  <div className="space-y-2">
                    {Object.entries(mockData.alerts.byAction).map(([action, count]) => (
                      <div key={action} className="flex items-center gap-2">
                        <ActionBadge action={action} />
                        <Progress 
                          value={(count / Object.values(mockData.alerts.byAction).reduce((a, b) => a + b)) * 100} 
                          className="flex-1 h-2"
                        />
                        <span className="text-sm font-medium w-12 text-right">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Protocol */}
                <div>
                  <h4 className="text-sm font-medium mb-2">By Protocol</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(mockData.alerts.byProtocol).map(([proto, count]) => (
                      <div key={proto} className="p-2 border rounded text-center">
                        <p className="font-bold text-lg">{count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{proto}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Recent IDS Alerts</CardTitle>
              <CardDescription>Network intrusion detection alerts from Suricata</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Proto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(15)].map((_, idx) => {
                      const time = new Date(Date.now() - idx * 300000); // Every 5 min
                      const signatures = ['ET TROJAN Possible EK', 'SURICATA HTTP suspicious', 'ET POLICY Outbound'];
                      const actions = ['allowed', 'blocked', 'dropped'];
                      const protocols = ['TCP', 'UDP', 'ICMP'];
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {time.toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <SeverityIndicator severity={['critical', 'high', 'medium'][idx % 3]} />
                          </TableCell>
                          <TableCell>
                            <ActionBadge action={actions[idx % actions.length]} />
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <span className="truncate block text-xs font-mono">
                              {signatures[idx % signatures.length]}...
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {['192.168.1.100', '10.0.0.55'][idx % 2]}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {['185.220.101.x', '91.121.87.x'][idx % 2]}
                          </TableCell>
                          <TableCell className="text-xs">
                            {protocols[idx % protocols.length]}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures">
          <Card>
            <CardHeader>
              <CardTitle>Top Alert Signatures</CardTitle>
              <CardDescription>Most frequently triggered detection rules</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>% of Total</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.alerts.topSignatures.map((sig, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[400px]">
                        {sig.signature}
                      </TableCell>
                      <TableCell className="font-medium">{sig.count}</TableCell>
                      <TableCell>
                        {((sig.count / mockData.alerts.thisWeek) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {idx % 3 === 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        ) : idx % 3 === 1 ? (
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Analysis Tab */}
        <TabsContent value="traffic">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Source IPs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Source IPs</CardTitle>
                <CardDescription>Highest alert-generating internal hosts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.alerts.topSrcIPs.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded border">
                      <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                      <span className="font-mono text-sm flex-1">{item.ip}</span>
                      <Progress 
                        value={(item.count / mockData.alerts.topSrcIPs[0].count) * 100}
                        className="w-24 h-2"
                      />
                      <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Destination IPs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Destination IPs</CardTitle>
                <CardDescription>Suspicious external destinations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.alerts.topDstIPs.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded border border-red-200 bg-red-50">
                      <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                      <span className="font-mono text-sm flex-1 text-red-800">{item.ip}</span>
                      <Progress 
                        value={(item.count / mockData.alerts.topDstIPs[0].count) * 100}
                        className="w-24 h-2 [&>div]:bg-red-500"
                      />
                      <span className="text-sm font-medium w-12 text-right text-red-700">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Rule Management</CardTitle>
              <CardDescription>Suricata detection rules configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-green-600">{mockData.rules.enabled.toLocaleString()}</p>
                    <p className="text-sm text-green-700">Enabled Rules</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="pt-4 text-center">
                    <XCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-600">{mockData.rules.disabled.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Disabled Rules</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4 text-center">
                    <Lock className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{mockData.rules.total.toLocaleString()}</p>
                    <p className="text-sm text-blue-700">Total Rules</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Ruleset Information</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Last updated: {new Date(mockData.rules.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                  <Button>Update Ruleset</Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Rule Categories</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-accent rounded text-center">
                      <p className="font-bold">12,450</p>
                      <p className="text-muted-foreground">Emerging Threats</p>
                    </div>
                    <div className="p-2 bg-accent rounded text-center">
                      <p className="font-bold">8,923</p>
                      <p className="text-muted-foreground">Malware</p>
                    </div>
                    <div className="p-2 bg-accent rounded text-center">
                      <p className="font-bold">5,678</p>
                      <p className="text-muted-foreground">Policy</p>
                    </div>
                    <div className="p-2 bg-accent rounded text-center">
                      <p className="font-bold">18,627</p>
                      <p className="text-muted-foreground">Info</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SuricataDashboard;
