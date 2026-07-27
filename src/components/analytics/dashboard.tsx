/**
 * National SOC Platform - Analytics Dashboard Components
 * 
 * Comprehensive dashboard for security and telecom analytics:
 * - Anomaly detection visualization
 * - Time series charts
 * - Threat scoring display
 * - Correlation timeline
 * - Key metrics cards
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Crosshair,
  Download,
  Filter,
  LineChart,
  RefreshCw,
  Shield,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Clock,
  Users,
  Database,
  Radio,
  Phone,
  Globe,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Info,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: 'default' | 'success' | 'warning' | 'danger';
}

interface AnomalyDataPoint {
  timestamp: string;
  value: number;
  isAnomalous?: boolean;
  anomalyScore?: number;
}

interface ThreatAlert {
  id: string;
  title: string;
  score: number;
  level: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  type: string;
  time: string;
  source: string;
}

interface CorrelationEvent {
  id: string;
  ruleName: string;
  severity: string;
  category: string;
  eventCount: number;
  time: string;
  summary: string;
}

// ============================================================
// METRIC CARD COMPONENT
// ============================================================

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  trend = 'stable',
  color = 'default' 
}: MetricCardProps) {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  const bgColors = {
    default: 'bg-muted',
    success: 'bg-green-50 dark:bg-green-950',
    warning: 'bg-yellow-50 dark:bg-yellow-950',
    danger: 'bg-red-50 dark:bg-red-950',
  };

  return (
    <Card className={`${bgColors[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
                <span className={change > 0 ? 'text-red-500' : 'text-green-500'}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${bgColors[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// ANOMALY DETECTION CHART COMPONENT
// ============================================================

export function AnomalyChart({ data }: { data: AnomalyDataPoint[] }) {
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  
  const filteredData = showAnomaliesOnly 
    ? data.filter(d => d.isAnomalous)
    : data;

  const anomalyCount = data.filter(d => d.isAnomalous).length;
  const maxScore = Math.max(...data.map(d => d.anomalyScore || 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Anomaly Detection
            </CardTitle>
            <CardDescription>Statistical analysis of metric patterns</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={anomalyCount > 0 ? "destructive" : "secondary"}>
              {anomalyCount} anomalies detected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
            >
              <Filter className="mr-1 h-3 w-3" />
              {showAnomaliesOnly ? 'Show All' : 'Anomalies Only'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Simplified chart representation */}
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-end justify-around px-4 pb-8">
            {filteredData.slice(-30).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-2 rounded-t transition-all ${
                    point.isAnomalous 
                      ? 'bg-red-500 h-full' 
                      : 'bg-primary/20 hover:bg-primary/40'
                  }`}
                  style={{ height: `${(point.value / (maxScore || 100)) * 100}%` }}
                />
                {point.isAnomalous && (
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Baseline line */}
          <div className="absolute left-0 right-0 border-t border-dashed border-yellow-400/50" 
               style={{ bottom: '40%' }} />
          <span className="absolute right-0 text-[10px] text-yellow-600" style={{ bottom: '42%' }}>
            baseline
          </span>
        </div>

        {/* Anomaly details */}
        {anomalyCount > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Recent Anomalies:</p>
            {data.filter(d => d.isAnomalous).slice(-3).map((anomaly, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                <span className="font-mono">{anomaly.timestamp}</span>
                <Badge variant="destructive">Score: {(anomaly.anomalyScore || 0).toFixed(0)}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// THREAT SCORING DISPLAY COMPONENT
// ============================================================

export function ThreatScoringPanel({ alerts }: { alerts: ThreatAlert[] }) {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const levelColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    informational: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const levelIcons = {
    critical: <AlertOctagon className="h-4 w-4" />,
    high: <AlertTriangle className="h-4 w-4" />,
    medium: <Info className="h-4 w-4" />,
    low: <Info className="h-4 w-4" />,
    informational: <Info className="h-4 w-4" />,
  };

  const filteredAlerts = selectedLevel === 'all' 
    ? alerts 
    : alerts.filter(a => a.level === selectedLevel);

  const counts = {
    all: alerts.length,
    critical: alerts.filter(a => a.level === 'critical').length,
    high: alerts.filter(a => a.level === 'high').length,
    medium: alerts.filter(a => a.level === 'medium').length,
    low: alerts.filter(a => a.level === 'low').length,
    informational: alerts.filter(a => a.level === 'informational').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Threat Scoring
            </CardTitle>
            <CardDescription>Prioritized alerts by risk score</CardDescription>
          </div>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({counts.all})</SelectItem>
              <SelectItem value="critical">Critical ({counts.critical})</SelectItem>
              <SelectItem value="high">High ({counts.high})</SelectItem>
              <SelectItem value="medium">Medium ({counts.medium})</SelectItem>
              <SelectItem value="low">Low ({counts.low})</SelectItem>
              <SelectItem value="informational">Info ({counts.informational})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredAlerts.slice(0, 10).map((alert) => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-lg border ${levelColors[alert.level]} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {levelIcons[alert.level]}
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      {alert.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {alert.time}
                    </span>
                    <span>{alert.source}</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold">{alert.score}</div>
                  <Progress 
                    value={alert.score} 
                    className={`w-16 h-1.5 mt-1 ${
                      alert.score >= 85 ? '[&>*]:bg-red-500' :
                      alert.score >= 70 ? '[&>*]:bg-orange-500' :
                      alert.score >= 45 ? '[&>*]:bg-yellow-500' : '[&>*]:bg-blue-500'
                    }`} 
                  />
                </div>
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No threats at this severity level</p>
            </div>
          )}
        </div>

        {/* Score distribution */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-sm font-medium mb-3">Score Distribution:</p>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(counts).filter(([key]) => key !== 'all').map(([level, count]) => (
              <div key={level} className="text-center p-2 rounded bg-muted">
                <div className="text-lg font-bold capitalize text-xs">{level.slice(0, 4)}</div>
                <div className="text-xl font-bold">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// CORRELATION TIMELINE COMPONENT
// ============================================================

export function CorrelationTimeline({ events }: { events: CorrelationEvent[] }) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const categoryIcons: Record<string, React.ReactNode> = {
    brute_force: <Lock className="h-4 w-4" />,
    lateral_movement: <Users className="h-4 w-4" />,
    data_exfiltration: <Database className="h-4 w-4" />,
    telecom_fraud: <Phone className="h-4 w-4" />,
    apt_indicators: <Zap className="h-4 w-4" />,
    ddos: <Globe className="h-4 w-4" />,
    malware: <Crosshair className="h-4 w-4" />,
  };

  const severityColors: Record<string, string> = {
    critical: 'border-l-red-500 bg-red-50/50',
    high: 'border-l-orange-500 bg-orange-50/50',
    medium: 'border-l-yellow-500 bg-yellow-50/50',
    low: 'border-l-blue-500 bg-blue-50/50',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Event Correlations
        </CardTitle>
        <CardDescription>Multi-source event correlation results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div 
              key={event.id}
              className={`border-l-4 rounded-r-lg p-3 cursor-pointer transition-all hover:shadow-sm ${severityColors[event.severity] || ''}`}
              onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {categoryIcons[event.category] || <Eye className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{event.ruleName}</span>
                      <Badge variant="outline" className="text-xs">
                        {event.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant={event.severity === 'critical' || event.severity === 'high' ? 'destructive' : 'secondary'}>
                        {event.eventCount} events
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.summary}</p>
                    
                    {expandedEvent === event.id && (
                      <div className="mt-3 pt-3 border-t text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Detected:</span>
                          <span>{event.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Severity:</span>
                          <span className="capitalize font-medium">{event.severity}</span>
                        </div>
                        <div className="pt-2">
                          <Button size="sm" variant="outline" className="w-full">
                            Investigate Correlation
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <ChevronIcon expanded={expandedEvent === event.id} />
                </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No correlated events detected</p>
              <p className="text-xs mt-1">Correlation rules are actively monitoring</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

// ============================================================
// ANALYTICS DASHBOARD (MAIN COMPONENT)
// ============================================================

interface AnalyticsDashboardProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AnalyticsDashboard({ onRefresh, isRefreshing = false }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');

  // Mock data for demonstration
  const mockMetrics = [
    { title: 'Active Alerts', value: 147, change: 12.5, icon: <AlertTriangle />, trend: 'up', color: 'warning' as const },
    { title: 'Threat Score Avg', value: 42.3, change: -5.2, icon: <Shield />, trend: 'down', color: 'success' as const },
    { title: 'Anomalies Detected', value: 23, change: 0, icon: <Brain />, trend: 'stable', color: 'default' as const },
    { title: 'Correlations', value: 8, change: 3, icon: <Target />, trend: 'up', color: 'danger' as const },
  ];

  const mockAnomalies: AnomalyDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
    timestamp: new Date(Date.now() - (49 - i) * 3600000).toISOString(),
    value: Math.random() * 80 + 20 + (Math.random() > 0.92 ? Math.random() * 100 : 0),
    isAnomalous: Math.random() > 0.92,
    anomalyScore: Math.random() > 0.92 ? Math.floor(Math.random() * 40) + 60 : undefined,
  }));

  const mockThreats: ThreatAlert[] = [
    { id: '1', title: 'SS7 Signaling Flood', score: 95, level: 'critical', type: 'ddos', time: '2 min ago', source: 'ss7_probe' },
    { id: '2', title: 'SIM Box Detection', score: 88, level: 'critical', type: 'fraud', time: '15 min ago', source: 'gtp_probe' },
    { id: '3', title: 'SSH Brute Force', score: 72, level: 'high', type: 'brute_force', time: '32 min ago', source: 'auth_log' },
    { id: '4', title: 'Unusual Data Transfer', score: 58, level: 'medium', type: 'exfiltration', time: '1 hr ago', source: 'firewall' },
    { id: '5', title: 'Multiple Auth Failures', score: 45, level: 'medium', type: 'credential', time: '2 hrs ago', source: 'ldap' },
  ];

  const mockCorrelations: CorrelationEvent[] = [
    { id: '1', ruleName: 'SS7 Flooding Attack', severity: 'critical', category: 'ddos', eventCount: 12453, time: 'Just now', summary: 'Abnormal SS7 message volume targeting HLR' },
    { id: '2', ruleName: 'SIM Box Detection', severity: 'critical', category: 'telecom_fraud', eventCount: 234, time: '15 min ago', summary: 'High volume calls from IMSI to premium numbers' },
    { id: '3', ruleName: 'Internal Network Scanning', severity: 'high', category: 'lateral_movement', eventCount: 89, time: '32 min ago', summary: 'Single host scanning multiple internal targets' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Engine
          </h2>
          <p className="text-muted-foreground">ML-powered threat detection & analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockMetrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnomalyChart data={mockAnomalies} />
            <ThreatScoringPanel alerts={mockThreats} />
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Detection Methods Active</p>
                    <p className="text-xl font-bold">5 / 6</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <LineChart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Baseline Accuracy</p>
                    <p className="text-xl font-bold">94.2%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ML Model Version</p>
                    <p className="text-xl font-bold">v2.0.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-6">
          <AnomalyChart data={mockAnomalies} />
        </TabsContent>

        <TabsContent value="threats" className="mt-6">
          <ThreatScoringPanel alerts={mockThreats} />
        </TabsContent>

        <TabsContent value="correlations" className="mt-6">
          <CorrelationTimeline events={mockCorrelations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export all components
export { MetricCard, AnomalyChart, ThreatScoringPanel, CorrelationTimeline };
export default AnalyticsDashboard;
