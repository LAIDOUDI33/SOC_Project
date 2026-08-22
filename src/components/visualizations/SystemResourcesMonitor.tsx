'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RealTimeMetricsGauge } from './RealTimeMetricsGauge';

/**
 * Data point structure for time-series metrics
 */
export interface MetricDataPoint {
  /** Timestamp label */
  time: string;
  /** CPU usage percentage */
  cpu?: number;
  /** Memory usage percentage */
  memory?: number;
  /** Disk read MB/s */
  diskRead?: number;
  /** Disk write MB/s */
  diskWrite?: number;
  /** Network in Mbps */
  networkIn?: number;
  /** Network out Mbps */
  networkOut?: number;
}

/** Resource metric configuration */
export interface ResourceMetricConfig {
  /** Display label */
  label: string;
  /** Current value */
  value: number;
  /** Maximum value (for percentage calculation) */
  max: number;
  /** Unit suffix */
  unit: string;
  /** Warning threshold */
  warningThreshold: number;
  /** Critical threshold */
  criticalThreshold: number;
  /** Historical data points */
  history: MetricDataPoint[];
}

/** Generate sample data for demonstration */
function generateSampleData(points: number = 60): MetricDataPoint[] {
  const now = new Date();
  const data: MetricDataPoint[] = [];
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 2000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: Math.min(100, Math.max(10, 45 + Math.random() * 30 + Math.sin(i / 10) * 15)),
      memory: Math.min(100, Math.max(30, 60 + Math.random() * 15 + Math.cos(i / 8) * 10)),
      diskRead: Math.round(Math.random() * 150 + 20),
      diskWrite: Math.round(Math.random() * 80 + 10),
      networkIn: Math.round(Math.random() * 500 + 50),
      networkOut: Math.round(Math.random() * 300 + 30),
    });
  }
  
  return data;
}

/** Calculate trend direction based on recent data */
function calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
  if (data.length < 5) return 'stable';
  
  const recent = data.slice(-5);
  const older = data.slice(-10, -5);
  
  if (!older.length) return 'stable';
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

/** Get trend icon component */
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-red-400" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-green-400" />;
    default:
      return <Minus className="w-4 h-4 text-slate-400" />;
  }
}

/** Custom tooltip formatter for charts */
const CustomTooltip = ({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  unit?: string;
}) => {
  if (!active || !payload) return null;
  
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-medium text-slate-100">
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

export interface SystemResourcesMonitorProps {
  /** Initial metric data (optional - will generate sample data if not provided) */
  initialData?: MetricDataPoint[];
  /** Update interval in milliseconds (default: 2000) */
  updateInterval?: number;
  /** Number of data points to display (default: 60) */
  dataPoints?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Additional CSS classes */
  className?: boolean;
  /** Show active connections gauge (default: true) */
  showConnectionsGauge?: boolean;
}

/**
 * SystemResourcesMonitor - Real-time system resource monitoring dashboard
 * 
 * Features:
 * - CPU usage line chart with trend indicator
 * - Memory usage bar chart
 * - Disk I/O throughput visualization
 * - Network traffic in/out area chart
 * - Active connections gauge
 * - All charts update in real-time with smooth transitions
 * - Responsive grid layout (2x3 on desktop, 1 column mobile)
 * 
 * @example
 * ```tsx
 * <SystemResourcesMonitor
 *   updateInterval={2000}
 *   autoRefresh={true}
 * />
 * ```
 */
export function SystemResourcesMonitor({
  initialData,
  updateInterval = 2000,
  dataPoints = 60,
  autoRefresh = true,
  showConnectionsGauge = true,
  className,
}: SystemResourcesMonitorProps) {
  // State management
  const [metricData, setMetricData] = useState<MetricDataPoint[]>(
    initialData || generateSampleData(dataPoints)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeConnections, setActiveConnections] = useState(1247);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Calculate current metrics from latest data point
  const currentMetrics = useMemo(() => {
    const latest = metricData[metricData.length - 1];
    if (!latest) {
      return { cpu: 0, memory: 0, diskRead: 0, diskWrite: 0, networkIn: 0, networkOut: 0 };
    }
    return latest;
  }, [metricData]);

  // Calculate trends
  const trends = useMemo(() => ({
    cpu: calculateTrend(metricData.map((d) => d.cpu || 0)),
    memory: calculateTrend(metricData.map((d) => d.memory || 0)),
    networkIn: calculateTrend(metricData.map((d) => d.networkIn || 0)),
  }), [metricData]);

  // Simulate real-time data updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setIsRefreshing(true);
      
      setMetricData((prev) => {
        const now = new Date();
        const newPoint: MetricDataPoint = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          // Generate realistic-looking data with some randomness and patterns
          cpu: Math.min(100, Math.max(5, (currentMetrics.cpu || 50) + (Math.random() - 0.5) * 10)),
          memory: Math.min(100, Math.max(25, (currentMetrics.memory || 65) + (Math.random() - 0.5) * 5)),
          diskRead: Math.round(Math.max(0, (currentMetrics.diskRead || 85) + (Math.random() - 0.5) * 40)),
          diskWrite: Math.round(Math.max(0, (currentMetrics.diskWrite || 45) + (Math.random() - 0.5) * 20)),
          networkIn: Math.round(Math.max(0, (currentMetrics.networkIn || 275) + (Math.random() - 0.5) * 100)),
          networkOut: Math.round(Math.max(0, (currentMetrics.networkOut || 165) + (Math.random() - 0.5) * 60)),
        };
        
        // Keep only the last N data points
        const updated = [...prev.slice(-(dataPoints - 1)), newPoint];
        return updated;
      });
      
      // Update connections count with realistic variation
      setActiveConnections((prev) => 
        Math.round(Math.max(800, prev + (Math.random() - 0.48) * 50))
      );
      
      setLastUpdate(new Date());
      
      setTimeout(() => setIsRefreshing(false), 200);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, updateInterval, dataPoints, currentMetrics]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setMetricData(generateSampleData(dataPoints));
    setTimeout(() => setIsRefreshing(false), 500);
  }, [dataPoints]);

  // Determine status color based on thresholds
  const getStatusColor = useCallback(
    (value: number, warn: number, crit: number): string => {
      if (value >= crit) return '#ef4444';
      if (value >= warn) return '#eab308';
      return '#22c55e';
    },
    []
  );

  // Chart colors (dark theme optimized)
  const CHART_COLORS = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    grid: '#1e293b',
    text: '#64748b',
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className={cn('w-5 h-5 text-blue-400', isRefreshing && 'animate-spin')} />
              System Resources Monitor
            </CardTitle>
            
            <div className="flex items-center gap-3">
              {/* Last update timestamp */}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  isRefreshing ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                )} />
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
              
              {/* Manual refresh button */}
              <button
                onClick={handleManualRefresh}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                )}
                title="Refresh data"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* CPU Usage Line Chart */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">CPU Usage</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendIcon trend={trends.cpu} />
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getStatusColor(currentMetrics.cpu || 0, 70, 90) }}
                >
                  {(currentMetrics.cpu || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={metricData}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.5} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  interval="preserveStartEnd"
                  tickFormatter={(val) => val.split(':')[2]}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  width={30}
                />
                <RechartsTooltip content={<CustomTooltip unit="%" />} />
                <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#cpuGradient)"
                  animationDuration={300}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS.primary }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Memory Usage Bar Chart */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-300">Memory Usage</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendIcon trend={trends.memory} />
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ color: getStatusColor(currentMetrics.memory || 0, 75, 90) }}
                >
                  {(currentMetrics.memory || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={metricData.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.5} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  width={30}
                />
                <RechartsTooltip content={<CustomTooltip unit="%" />} />
                <ReferenceLine y={75} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                <Bar
                  dataKey="memory"
                  fill={CHART_COLORS.secondary}
                  radius={[2, 2, 0, 0]}
                  animationDuration={300}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Active Connections Gauge */}
        {showConnectionsGauge && (
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-300">Active Connections</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">
                  LIVE
                </Badge>
              </div>
              
              <div className="flex items-center justify-center py-2">
                <RealTimeMetricsGauge
                  value={activeConnections}
                  min={0}
                  max={2000}
                  label="Connections"
                  unit=""
                  size={130}
                  thresholds={[
                    { min: 0, max: 70, color: '#22c55e', label: 'Normal' },
                    { min: 70, max: 85, color: '#eab308', label: 'High' },
                    { min: 85, max: 100, color: '#ef4444', label: 'Critical' },
                  ]}
                  animate={true}
                  showPulse={false}
                  strokeWidth={8}
                />
              </div>
              
              <div className="mt-2 text-center">
                <p className="text-xs text-slate-500">
                  Max capacity: 2,000 | Utilization: {((activeConnections / 2000) * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disk I/O Throughput */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-300">Disk I/O</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan-400">
                  R: {(currentMetrics.diskRead || 0).toFixed(0)} MB/s
                </span>
                <span className="text-orange-400">
                  W: {(currentMetrics.diskWrite || 0).toFixed(0)} MB/s
                </span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={metricData}>
                <defs>
                  <linearGradient id="diskReadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="diskWriteGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.5} />
                <YAxis
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  width={35}
                />
                <RechartsTooltip content={<CustomTooltip unit=" MB/s" />} />
                <Area
                  type="monotone"
                  dataKey="diskRead"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#diskReadGradient)"
                  animationDuration={300}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="diskWrite"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#diskWriteGradient)"
                  animationDuration={300}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Network Traffic In/Out */}
        <Card className="overflow-hidden lg:col-span-2 xl:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">Network Traffic</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded" />
                  <span className="text-emerald-400">
                    In: {(currentMetrics.networkIn || 0).toFixed(0)} Mbps
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-pink-500 rounded" />
                  <span className="text-pink-400">
                    Out: {(currentMetrics.networkOut || 0).toFixed(0)} Mbps
                  </span>
                </div>
                <TrendIcon trend={trends.networkIn} />
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={metricData}>
                <defs>
                  <linearGradient id="netInGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="netOutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.5} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  interval="preserveStartEnd"
                  tickFormatter={(val) => val.split(':')[1] + ':' + val.split(':')[2]}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: CHART_COLORS.text }}
                  width={40}
                />
                <RechartsTooltip content={<CustomTooltip unit=" Mbps" />} />
                <Line
                  type="monotone"
                  dataKey="networkIn"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#netInGradient)"
                  animationDuration={300}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="networkOut"
                  stroke="#ec4899"
                  strokeWidth={2}
                  fill="url(#netOutGradient)"
                  animationDuration={300}
                  dot={false}
                  activeDot={{ r: 4, fill: '#ec4899' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner for high resource usage */}
      {(currentMetrics.cpu > 85 || currentMetrics.memory > 88) && (
        <div className="flex items-center gap-3 p-3 bg-yellow-950/30 border border-yellow-700/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">High Resource Usage Detected</p>
            <p className="text-xs text-yellow-500/70 mt-0.5">
              {currentMetrics.cpu > 85 && `CPU at ${currentMetrics.cpu.toFixed(1)}% • `}
              {currentMetrics.memory > 88 && `Memory at ${currentMetrics.memory.toFixed(1)}%`}
              Consider scaling resources or investigating processes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export for barrel file
export default SystemResourcesMonitor;
