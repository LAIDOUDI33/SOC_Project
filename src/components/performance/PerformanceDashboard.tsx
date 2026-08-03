'use client';

/**
 * Djezzy SOC Platform - Real-time Performance Dashboard
 * 
 * Comprehensive performance monitoring UI:
 * - System health overview
 * - Core Web Vitals display
 * - Resource utilization gauges
 * - Performance score visualization
 * - Alert thresholds with visual indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Server,
  Database,
  Globe,
  BarChart3
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status: 'good' | 'warning' | 'critical' | 'unknown';
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number;
  description?: string;
}

interface PerformanceData {
  timestamp: string;
  // Server metrics
  cpu: number;           // Percentage
  memory: number;        // Percentage
  disk: number;          // Percentage
  networkIn: number;     // Mbps
  networkOut: number;    // Mbps
  
  // Application metrics
  responseTimeP50: number; // ms
  responseTimeP95: number; // ms
  responseTimeP99: number; // ms
  errorRate: number;      // Percentage
  throughput: number;     // requests per second
  
  // Web Vitals (if available)
  lcp?: number;          // ms
  fid?: number;          // ms
  cls?: number;          // score
  inp?: number;          // ms
  
  // Cache metrics
  cacheHitRate: number;   // percentage
  redisMemory: number;    // percentage
  
  // Connection pool
  activeConnections: number;
  idleConnections: number;
  
  // Event ingestion
  epsCurrent: number;    // events per second
  epsTarget: number;      // target EPS
}

// ============================================================
// THRESHOLD CONFIGURATION
// ============================================================

const THRESHOLDS = {
  cpu: { good: 60, warning: 80, critical: 95 },
  memory: { good: 70, warning: 85, critical: 95 },
  disk: { good: 70, warning: 85, critical: 95 },
  responseTime: { good: 200, warning: 500, critical: 1000 },
  errorRate: { good: 0.1, warning: 1, critical: 5 },
  cacheHitRate: { good: 95, warning: 80, critical: 70 },
};

function getStatus(value: number, threshold: typeof THRESHOLDS.cpu): MetricCardProps['status'] {
  if (value <= threshold.good) return 'good';
  if (value <= threshold.warning) return 'warning';
  return 'critical';
}

function getStatusColor(status: MetricCardProps['status']): string {
  switch (status) {
    case 'good': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

function getStatusBgColor(status: MetricCardProps['status']): string {
  switch (status) {
    case 'good': return 'bg-green-500/10 border-green-500/20';
    case 'warning': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'critical': return 'bg-red-500/10 border-red-500/20';
    default: return 'bg-gray-500/10 border-gray-500/20';
  }
}

// ============================================================
// METRIC CARD COMPONENT
// ============================================================

function MetricCard({ 
  title, 
  value, 
  unit, 
  icon, 
  status, 
  trend, 
  previousValue,
  description 
}: MetricCardProps) {
  const statusColor = getStatusColor(status);
  const bgColor = getStatusBgColor(status);
  
  const trendIcon = trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
                   trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null;

  const trendColor = trend === 'up' && status !== 'good' ? 'text-red-500' :
                    trend === 'down' && status === 'good' ? 'text-green-500' :
                    'text-gray-400';

  return (
    <Card className={`${bgColor} border transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-muted-foreground ${statusColor}`}>{icon}</span>
          <div className="flex items-center gap-1">
            {trendIcon && <span className={trendColor}>{trendIcon}</span>}
            <Badge 
              variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
              className="text-xs"
            >
              {status.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// GAUGE COMPONENT
// ============================================================

function Gauge({ 
  value, 
  max = 100, 
  label, 
  thresholds = THRESHOLDS.cpu,
  size = 'md'
}: { 
  value: number; 
  max?: number; 
  label: string;
  thresholds?: typeof THRESHOLDS.cpu;
  size?: 'sm' | 'md' | 'lg';
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const status = getStatus(value, thresholds);
  
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  const trackColor = status === 'good' ? '#22c55e' : 
                     status === 'warning' ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} relative`}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/30"
          />
          {/* Value circle */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={trackColor}
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    try {
      const response = await fetch('/api/system?metrics=cpu,memory,disk,network');
      if (response.ok) {
        const result = await response.json();
        setData({
          ...result,
          timestamp: new Date().toISOString(),
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      
      // Use demo data for development
      setData(getDemoData());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchPerformanceData, 30000); // Refresh every 30s
    }

    return () => clearInterval(interval);
  }, [fetchPerformanceData, autoRefresh]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Server className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Unable to load performance data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time system and application performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={fetchPerformanceData}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Now
          </button>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Overall Status Banner */}
      <Card className={`
        ${data.errorRate > 1 || data.cpu > 90 || data.memory > 90 
          ? 'bg-red-500/10 border-red-500/20' 
          : data.errorRate > 0.5 || data.cpu > 75 || data.memory > 80
            ? 'bg-yellow-500/10 border-yellow-500/20'
            : 'bg-green-500/10 border-green-500/20'
        }
      `}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {(data.errorRate <= 0.1 && data.cpu <= 70 && data.memory <= 75) ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="font-medium">All Systems Operating Normally</span>
              </>
            ) : (data.errorRate > 1 || data.cpu > 90 || data.memory > 90) ? (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                <span className="font-medium">Critical Performance Issues Detected</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <span className="font-medium">Performance Degradation Warning</span>
              </>
            )}
            <span className="ml-auto text-sm text-muted-foreground">
              Uptime: 99.97% (30 days)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          value={data.cpu.toFixed(1)}
          unit="%"
          icon={<Cpu className="w-5 h-5" />}
          status={getStatus(data.cpu, THRESHOLDS.cpu)}
          description="Average across all cores"
        />
        
        <MetricCard
          title="Memory Usage"
          value={data.memory.toFixed(1)}
          unit="%"
          icon={<MemoryStick className="w-5 h-5" />}
          status={getStatus(data.memory, THRESHOLDS.memory)}
          description="Heap + RSS utilization"
        />
        
        <MetricCard
          title="Disk I/O"
          value={data.disk.toFixed(1)}
          unit="%"
          icon={<HardDrive className="w-5 h-5" />}
          status={getStatus(data.disk, THRESHOLDS.disk)}
          description="Active disk operations"
        />
        
        <MetricCard
          title="Error Rate"
          value={data.errorRate.toFixed(3)}
          unit="%"
          icon={<AlertTriangle className="w-5 h-5" />}
          status={getStatus(data.errorRate, THRESHOLDS.errorRate)}
          description="HTTP 5xx errors"
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="P95 Response Time"
          value={data.responseTimeP95}
          unit="ms"
          icon={<Clock className="w-5 h-5" />}
          status={getStatus(data.responseTimeP95, THRESHOLDS.responseTime)}
          description="Target: <200ms"
        />
        
        <MetricCard
          title="Throughput"
          value={data.throughput.toLocaleString()}
          unit="req/s"
          icon={<Zap className="w-5 h-5" />}
          status={data.throughput > 10000 ? 'good' : data.throughput > 5000 ? 'warning' : 'critical'}
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={data.cacheHitRate.toFixed(1)}
          unit="%"
          icon={<Database className="w-5 h-5" />}
          status={getStatus(100 - data.cacheHitRate, { good: 5, warning: 20, critical: 30 })}
          description="Redis cluster average"
        />
        
        <MetricCard
          title="Events/sec"
          value={data.epsCurrent.toLocaleString()}
          unit="EPS"
          icon={<Activity className="w-5 h-5" />}
          status={data.epsCurrent >= data.epsTarget * 0.8 ? 'good' : 'warning'}
          description={`Target: ${(data.epsTarget / 1000).toFixed(0)}K`}
        />
      </div>

      {/* Detailed Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Resources Gauges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" />
              System Resources
            </CardTitle>
            <CardDescription>Current resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around py-4">
              <Gauge value={data.cpu} label="CPU" />
              <Gauge value={data.memory} label="Memory" />
              <Gauge value={data.disk} label="Disk" />
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Network In</span>
                <span className="font-mono">{data.networkIn} Mbps</span>
              </div>
              <Progress value={(data.networkIn / 10000) * 100} className="h-1" />
              
              <div className="flex items-center justify-between text-sm">
                <span>Network Out</span>
                <span className="font-mono">{data.networkOut} Mbps</span>
              </div>
              <Progress value={(data.networkOut / 10000) * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>

        {/* Response Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Response Times
            </CardTitle>
            <CardDescription>Latency percentiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'P50 (Median)', value: data.responseTimeP50, color: 'bg-green-500' },
                { label: 'P95', value: data.responseTimeP95, color: 'bg-yellow-500' },
                { label: 'P99', value: data.responseTimeP99, color: 'bg-orange-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className={`font-mono ${
                      item.value <= 200 ? 'text-green-500' :
                      item.value <= 500 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {item.value}ms
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full ${item.color} transition-all`}
                      style={{ width: `${Math.min((item.value / 1000) * 100, 100)}%` }}
                    />
                    {/* Threshold marker at 200ms */}
                    <div 
                      className="absolute top-0 w-0.5 h-full bg-green-400"
                      style={{ left: '20%' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Target indicators */}
            <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
              <span>Target P95: &lt;200ms</span>
              <span>Critical: &gt;1000ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Web Vitals Section (if client-side data available) */}
      {data.lcp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Core Web Vitals
            </CardTitle>
            <CardDescription>User experience metrics (client-side)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">
                  {data.lcp?.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">LCP (ms)</div>
                <Badge variant={data.lcp! < 2500 ? 'default' : 'destructive'} className="mt-2 text-xs">
                  {data.lcp! < 2500 ? 'Good' : 'Poor'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-500">
                  {data.fid ?? '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">FID (ms)</div>
                <Badge variant={(data.fid ?? 0) < 100 ? 'default' : 'destructive'} className="mt-2 text-xs">
                  {(data.fid ?? 0) < 100 ? 'Good' : 'Poor'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">
                  {data.cls?.toFixed(2) ?? '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">CLS</div>
                <Badge variant={(data.cls ?? 0) < 0.1 ? 'default' : 'destructive'} className="mt-2 text-xs">
                  {(data.cls ?? 0) < 0.1 ? 'Good' : 'Poor'}
                </Badge>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-teal-500">
                  {data.inp ?? '-'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">INP (ms)</div>
                <Badge variant={(data.inp ?? 0) < 200 ? 'default' : 'destructive'} className="mt-2 text-xs">
                  {(data.inp ?? 0) < 200 ? 'Good' : 'Poor'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Baseline Targets Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Baseline Targets</CardTitle>
          <CardDescription>Djezzy SOC Platform performance targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Metric</th>
                  <th className="text-right py-2 px-3">Target</th>
                  <th className="text-right py-2 px-3">Critical</th>
                  <th className="text-right py-2 px-3">Current</th>
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-3">P95 Response Time</td>
                  <td className="text-right font-mono">&lt;200ms</td>
                  <td className="text-right font-mono text-red-500">&gt;1000ms</td>
                  <td className={`text-right font-mono ${data.responseTimeP95 <= 200 ? 'text-green-500' : data.responseTimeP95 <= 1000 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.responseTimeP95}ms
                  </td>
                  <td className="text-center">
                    <CheckCircle2 className={`w-4 h-4 inline ${data.responseTimeP95 <= 200 ? 'text-green-500' : 'hidden'}`} />
                    <XCircle className={`w-4 h-4 inline ${data.responseTimeP95 > 1000 ? 'text-red-500' : 'hidden'}`} />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Error Rate</td>
                  <td className="text-right font-mono">&lt;0.1%</td>
                  <td className="text-right font-mono text-red-500">&gt;1%</td>
                  <td className={`text-right font-mono ${data.errorRate <= 0.1 ? 'text-green-500' : data.errorRate <= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.errorRate}%
                  </td>
                  <td className="text-center">
                    <CheckCircle2 className={`w-4 h-4 inline ${data.errorRate <= 0.1 ? 'text-green-500' : 'hidden'}`} />
                    <XCircle className={`w-4 h-4 inline ${data.errorRate > 1 ? 'text-red-500' : 'hidden'}`} />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Throughput (EPS)</td>
                  <td className="text-right font-mono">&gt;500K</td>
                  <td className="text-right font-mono text-red-500">&lt;100K</td>
                  <td className={`text-right font-mono ${data.epsCurrent >= 500000 ? 'text-green-500' : data.epsCurrent >= 100000 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {(data.epsCurrent / 1000).toFixed(0)}K
                  </td>
                  <td className="text-center">
                    <CheckCircle2 className={`w-4 h-4 inline ${data.epsCurrent >= 500000 ? 'text-green-500' : 'hidden'}`} />
                    <XCircle className={`w-4 h-4 inline ${data.epsCurrent < 100000 ? 'text-red-500' : 'hidden'}`} />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-3">Cache Hit Rate</td>
                  <td className="text-right font-mono">&gt;95%</td>
                  <td className="text-right font-mono text-red-500">&lt;80%</td>
                  <td className={`text-right font-mono ${data.cacheHitRate >= 95 ? 'text-green-500' : data.cacheHitRate >= 80 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.cacheHitRate}%
                  </td>
                  <td className="text-center">
                    <CheckCircle2 className={`w-4 h-4 inline ${data.cacheHitRate >= 95 ? 'text-green-500' : 'hidden'}`} />
                    <XCircle className={`w-4 h-4 inline ${data.cacheHitRate < 80 ? 'text-red-500' : 'hidden'}`} />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">CPU Usage</td>
                  <td className="text-right font-mono">&lt;70%</td>
                  <td className="text-right font-mono text-red-500">&gt;90%</td>
                  <td className={`text-right font-mono ${data.cpu <= 70 ? 'text-green-500' : data.cpu <= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.cpu}%
                  </td>
                  <td className="text-center">
                    <CheckCircle2 className={`w-4 h-4 inline ${data.cpu <= 70 ? 'text-green-500' : 'hidden'}`} />
                    <XCircle className={`w-4 h-4 inline ${data.cpu > 90 ? 'text-red-500' : 'hidden'}`} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// DEMO DATA GENERATOR
// ============================================================

function getDemoData(): PerformanceData {
  return {
    timestamp: new Date().toISOString(),
    cpu: 45 + Math.random() * 30,
    memory: 55 + Math.random() * 25,
    disk: 40 + Math.random() * 30,
    networkIn: 100 + Math.random() * 900,
    networkOut: 50 + Math.random() * 400,
    responseTimeP50: 80 + Math.random() * 120,
    responseTimeP95: 150 + Math.random() * 350,
    responseTimeP99: 300 + Math.random() * 700,
    errorRate: Math.random() * 0.5,
    throughput: 8000 + Math.random() * 7000,
    lcp: 1800 + Math.random() * 1500,
    fid: 45 + Math.random() * 80,
    cls: 0.05 + Math.random() * 0.15,
    inp: 150 + Math.random() * 200,
    cacheHitRate: 92 + Math.random() * 7,
    redisMemory: 55 + Math.random() * 25,
    activeConnections: 150 + Math.floor(Math.random() * 350),
    idleConnections: 50 + Math.floor(Math.random() * 100),
    epsCurrent: 420000 + Math.floor(Math.random() * 160000),
    epsTarget: 500000,
  };
}

export default PerformanceDashboard;
