'use client';

/**
 * SS7 Traffic Monitor Component
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Real-time SS7 traffic visualization:
 * - Live message rate counter (messages/sec)
 * - Protocol distribution pie chart (MAP/CAP/ISUP/SCCP)
 * - Top talkers table (OPC/DPC pairs)
 * - Geographic traffic map (Algeria wilayas)
 * - Alert threshold indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, Radio, Globe, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, Zap, Server,
  Network, Signal, BarChart3, PieChart as PieChartIcon,
  MapPin, RefreshCw, Download, Filter, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Types
interface TrafficData {
  timestamp: string;
  mps: number;
  bytes: number;
  mapCount: number;
  capCount: number;
  isupCount: number;
  sccpCount: number;
}

interface TalkerPair {
  opc: string;
  dpc: string;
  count: number;
  bytes: number;
  protocols: string[];
}

interface WilayaTraffic {
  name: string;
  code: number;
  messages: number;
  subscribers: number;
  riskScore: number;
}

// Protocol colors for charts
const PROTOCOL_COLORS = {
  MAP: '#3b82f6',
  CAP: '#ef4444',
  ISUP: '#06b6d4',
  SCCP: '#f59e0b',
  TCAP: '#10b981',
  M3UA: '#8b5cf6',
  SCTP: '#f97316',
};

const chartConfig = {
  mps: { label: 'Messages/sec', color: '#3b82f6' },
  bytes: { label: 'Bytes', color: '#10b981' },
  mapCount: { label: 'MAP', color: PROTOCOL_COLORS.MAP },
  capCount: { label: 'CAP', color: PROTOCOL_COLORS.CAP },
  isupCount: { label: 'ISUP', color: PROTOCOL_COLORS.ISUP },
  sccpCount: { label: 'SCCP', color: PROTOCOL_COLORS.SCCP },
} satisfies ChartConfig;

// Sample data generators
function generateTimeSeriesData(points: number = 60): TrafficData[] {
  const data: TrafficData[] = [];
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    const baseMPS = 2500 + Math.sin(i / 10) * 500;
    const noise = (Math.random() - 0.5) * 400;
    
    data.push({
      timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      mps: Math.round(Math.max(100, baseMPS + noise)),
      bytes: Math.round((baseMPS + noise) * 150),
      mapCount: Math.round((baseMPS + noise) * 0.45),
      capCount: Math.round((baseMPS + noise) * 0.15),
      isupCount: Math.round((baseMPS + noise) * 0.25),
      sccpCount: Math.round((baseMPS + noise) * 0.10),
    });
  }
  
  return data;
}

function generateTopTalkers(): TalkerPair[] {
  return [
    { opc: '3-001-001', dpc: '3-042-001', count: 15420, bytes: 2340000, protocols: ['MAP'] },
    { opc: '3-065-001', dpc: '3-001-001', count: 12350, bytes: 1890000, protocols: ['MAP', 'CAP'] },
    { opc: '3-101-001', dpc: '3-002-001', count: 9870, bytes: 1520000, protocols: ['ISUP'] },
    { opc: '3-002-001', dpc: '3-065-001', count: 8540, bytes: 1310000, protocols: ['ISUP', 'CAP'] },
    { opc: '3-042-001', dpc: '3-101-001', count: 7620, bytes: 1170000, protocols: ['MAP'] },
    { opc: '3-003-001', dpc: '3-042-001', count: 6540, bytes: 990000, protocols: ['MAP'] },
    { opc: '3-065-002', dpc: '3-003-001', count: 5890, bytes: 890000, protocols: ['SCCP', 'TCAP'] },
    { opc: '3-102-001', dpc: '3-065-001', count: 4720, bytes: 720000, protocols: ['ISUP'] },
    { opc: '3-001-002', dpc: '3-042-002', count: 3980, bytes: 610000, protocols: ['MAP'] },
    { opc: '3-042-002', dpc: '3-101-002', count: 3150, bytes: 480000, protocols: ['CAP'] },
  ];
}

function generateWilayaTraffic(): WilayaTraffic[] {
  return [
    { name: 'Algiers', code: 16, messages: 45230, subscribers: 1250000, riskScore: 12 },
    { name: 'Oran', code: 31, messages: 28740, subscribers: 720000, riskScore: 18 },
    { name: 'Constantine', code: 25, messages: 22450, subscribers: 650000, riskScore: 15 },
    { name: 'Batna', code: 5, messages: 15670, subscribers: 420000, riskScore: 22 },
    { name: 'Biskra', code: 7, messages: 12340, subscribers: 380000, riskScore: 28 },
    { name: 'Tlemcen', code: 13, messages: 11890, subscribers: 350000, riskScore: 14 },
    { name: 'Sétif', code: 28, messages: 11230, subscribers: 340000, riskScore: 19 },
    { name: 'Béjaïa', code: 6, messages: 10560, subscribers: 310000, riskScore: 16 },
    { name: 'Annaba', code: 23, messages: 9870, subscribers: 290000, riskScore: 11 },
    { name: 'Blida', code: 9, messages: 9430, subscribers: 280000, riskScore: 21 },
    { name: 'Tizi Ouzou', code: 15, messages: 8920, subscribers: 265000, riskScore: 17 },
    { name: 'Djelfa', code: 44, messages: 7890, subscribers: 240000, riskScore: 25 },
  ];
}

// Main component
export default function SS7TrafficMonitor() {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [currentMPS, setCurrentMPS] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1h');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Initialize data
  useEffect(() => {
    setTrafficData(generateTimeSeriesData(60));
    setIsLoading(false);
  }, []);

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setTrafficData(prev => {
        const newData = [...prev.slice(1)];
        const lastEntry = prev[prev.length - 1];
        const baseMPS = lastEntry.mps;
        const variation = (Math.random() - 0.5) * 200;
        
        const newMPS = Math.max(100, baseMPS + variation);
        setCurrentMPS(newMPS);
        
        newData.push({
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          mps: Math.round(newMPS),
          bytes: Math.round(newMPS * 150),
          mapCount: Math.round(newMPS * 0.45),
          capCount: Math.round(newMPS * 0.15),
          isupCount: Math.round(newMPS * 0.25),
          sccpCount: Math.round(newMPS * 0.10),
        });
        
        return newData;
      });
      
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setTrafficData(generateTimeSeriesData(60));
      setLastUpdate(new Date());
      setIsLoading(false);
    }, 500);
  }, []);

  const topTalkers = generateTopTalkers();
  const wilayaTraffic = generateWilayaTraffic();
  
  // Calculate protocol distribution
  const latestData = trafficData[trafficData.length - 1];
  const protocolDistribution = latestData ? [
    { name: 'MAP', value: latestData.mapCount, color: PROTOCOL_COLORS.MAP },
    { name: 'ISUP', value: latestData.isupCount, color: PROTOCOL_COLORS.ISUP },
    { name: 'CAP', value: latestData.capCount, color: PROTOCOL_COLORS.CAP },
    { name: 'SCCP', value: latestData.sccpCount, color: PROTOCOL_COLORS.SCCP },
  ] : [];

  // Calculate totals
  const totalMessages = trafficData.reduce((sum, d) => sum + d.mps, 0);
  const avgMPS = trafficData.length > 0 ? totalMessages / trafficData.length : 0;
  const peakMPS = trafficData.reduce((max, d) => Math.max(max, d.mps), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-blue-400" />
            SS7 Traffic Monitor
          </h2>
          <p className="text-gray-400 mt-1">Real-time signaling traffic analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-400 border-green-400 animate-pulse">
            LIVE
          </Badge>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[100px] bg-slate-800 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 min</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="6h">6 hours</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-900/30 border-green-600' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Rate"
          value={`${currentMPS.toLocaleString()}`}
          unit="msg/s"
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          trend={currentMPS > avgMPS ? 'up' : currentMPS < avgMPS * 0.8 ? 'down' : 'stable'}
          trendValue={`${((currentMPS / avgMPS - 1) * 100).toFixed(1)}%`}
        />
        
        <MetricCard
          title="Peak Rate"
          value={`${peakMPS.toLocaleString()}`}
          unit="msg/s"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          trend="stable"
          trendValue={`Avg: ${avgMPS.toFixed(0)}/s`}
        />
        
        <MetricCard
          title="Total Messages"
          value={(totalMessages * 60).toLocaleString()}
          unit="last hr"
          icon={<BarChart3 className="w-5 h-5 text-green-400" />}
          trend="stable"
        />
        
        <MetricCard
          title="Active Routes"
          value={topTalkers.length.toString()}
          unit="OPC/DPC pairs"
          icon={<Network className="w-5 h-5 text-purple-400" />}
          trend="stable"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Time Series */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Message Rate Over Time
            </CardTitle>
            <CardDescription>Messages per second (last 60 minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  domain={['dataMin - 100', 'dataMax + 100']}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="mps"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Protocol Distribution */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-purple-400" />
              Protocol Distribution
            </CardTitle>
            <CardDescription>Current message mix</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={protocolDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {protocolDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-gray-300">{value}</span>}
                />
              </PieChart>
            </ChartContainer>
            
            {/* Protocol breakdown list */}
            <div className="mt-4 space-y-2">
              {protocolDistribution.map((proto) => (
                <div key={proto.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: proto.color }}
                    />
                    <span className="text-gray-300">{proto.name}</span>
                  </div>
                  <span className="text-white font-mono">{proto.value.toLocaleString()}/s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Top Talkers & Wilaya Traffic */}
      <Tabs defaultValue="talkers" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="talkers" className="data-[state=active]:bg-slate-600">
            <Server className="w-4 h-4 mr-2" />
            Top Talkers
          </TabsTrigger>
          <TabsTrigger value="geographic" className="data-[state=active]:bg-slate-600">
            <MapPin className="w-4 h-4 mr-2" />
            Geographic View
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Threshold Alerts
          </TabsTrigger>
        </TabsList>

        {/* Top Talkers Tab */}
        <TabsContent value="talkers" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Top Signaling Pairs (OPC → DPC)</CardTitle>
              <CardDescription>Highest volume routes by message count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Origin PC</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Dest PC</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Messages</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Volume</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Protocols</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTalkers.map((talker, idx) => (
                      <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-white font-medium">#{idx + 1}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-blue-400 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                            {talker.opc}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-green-400 font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                            {talker.dpc}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white font-mono">{talker.count.toLocaleString()}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-gray-400 font-mono text-xs">
                            {(talker.bytes / 1048576).toFixed(1)} MB
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {talker.protocols.map(p => (
                              <Badge 
                                key={p} 
                                variant="outline" 
                                className="text-xs border-slate-600"
                                style={{ borderColor: PROTOCOL_COLORS[p as keyof typeof PROTOCOL_COLORS] || '#666' }}
                              >
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-400" />
                Traffic by Wilaya (Algeria)
              </CardTitle>
              <CardDescription>Geographic distribution of signaling activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wilayaTraffic.map((wilaya) => (
                  <div 
                    key={wilaya.code}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-semibold">{wilaya.name}</h4>
                        <p className="text-gray-500 text-xs">Code: {wilaya.code.toString().padStart(2, '0')}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          wilaya.riskScore > 25 ? 'border-red-500 text-red-400' :
                          wilaya.riskScore > 18 ? 'border-yellow-500 text-yellow-400' :
                          'border-green-500 text-green-400'
                        }
                      >
                        Risk: {wilaya.riskScore}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Messages:</span>
                        <span className="text-white font-mono">{wilaya.messages.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subscribers:</span>
                        <span className="text-white font-mono">{(wilaya.subscribers / 1000).toFixed(0)}K</span>
                      </div>
                      <Progress 
                        value={Math.min(100, (wilaya.messages / 50000) * 100)} 
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threshold Alerts Tab */}
        <TabsContent value="alerts" className="mt-4">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Traffic Threshold Status
              </CardTitle>
              <CardDescription>Real-time alert thresholds and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    name: 'Message Rate Threshold',
                    current: currentMPS,
                    warning: 3500,
                    critical: 4500,
                    unit: 'msg/s'
                  },
                  { 
                    name: 'Error Rate',
                    current: 0.12,
                    warning: 1.0,
                    critical: 5.0,
                    unit: '%'
                  },
                  { 
                    name: 'Link Utilization',
                    current: 42,
                    warning: 70,
                    critical: 90,
                    unit: '%'
                  },
                  { 
                    name: 'Queue Depth',
                    current: 1250,
                    warning: 5000,
                    critical: 10000,
                    unit: 'msgs'
                  },
                  { 
                    name: 'Response Time (avg)',
                    current: 12,
                    warning: 50,
                    critical: 100,
                    unit: 'ms'
                  },
                ].map((threshold, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{threshold.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">
                          {typeof threshold.current === 'number' ? threshold.current.toFixed(threshold.unit === '%' ? 2 : 0) : threshold.current}
                        </span>
                        <span className="text-gray-500 text-sm">{threshold.unit}</span>
                        <Badge 
                          variant="outline"
                          className={
                            threshold.current >= threshold.critical ? 'border-red-500 text-red-400 bg-red-950/20' :
                            threshold.current >= threshold.warning ? 'border-yellow-500 text-yellow-400 bg-yellow-950/20' :
                            'border-green-500 text-green-400'
                          }
                        >
                          {threshold.current >= threshold.critical ? 'CRITICAL' :
                           threshold.current >= threshold.warning ? 'WARNING' : 'NORMAL'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Visual indicator bar */}
                    <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full rounded-full transition-all duration-500 ${
                          threshold.current >= threshold.critical ? 'bg-red-500' :
                          threshold.current >= threshold.warning ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (threshold.current / threshold.critical) * 100)}%` }}
                      />
                      
                      {/* Warning marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
                        style={{ left: `${(threshold.warning / threshold.critical) * 100}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0</span>
                      <span className="text-yellow-500">Warning ({threshold.warning})</span>
                      <span className="text-red-500">Critical ({threshold.critical})</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        <span>Data source: SS7 Collector Service</span>
      </div>
    </div>
  );
}

// Metric Card Sub-component
function MetricCard({ 
  title, 
  value, 
  unit, 
  icon, 
  trend, 
  trendValue 
}: { 
  title: string; 
  value: string; 
  unit?: string; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'stable'; 
  trendValue?: string;
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          {icon}
          {trend && (
            <div className={`flex items-center text-xs ${
              trend === 'up' ? 'text-red-400' :
              trend === 'down' ? 'text-green-400' :
              'text-gray-400'
            }`}>
              {trend === 'up' && <ArrowUpRight className="w-3 h-3 mr-1" />}
              {trend === 'down' && <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trendValue}
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <p className="text-gray-400 text-sm">{title}{unit && <span className="ml-1 text-gray-500">({unit})</span>}</p>
      </CardContent>
    </Card>
  );
}
