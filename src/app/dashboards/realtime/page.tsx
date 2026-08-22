'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity, Wifi, WifiOff, RefreshCw, Bell, AlertTriangle,
  Shield, Server, Globe, Clock, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, Minus, Pulse,
  Radio, Network, Satellite, Phone, MapPin
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Import visualization components
import { RealTimeMetricsGauge } from '@/components/visualizations/RealTimeMetricsGauge'
import { LiveAlertsTicker, type AlertItem } from '@/components/visualizations/LiveAlertsTicker'
import { GeoHeatmap, type GeoRegion } from '@/components/visualizations/GeoHeatmap'

// Import chart components
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface MetricDataPoint {
  timestamp: string
  alerts: number
  incidents: number
  threats: number
  bandwidth: number
}

interface SystemHealth {
  component: string
  status: 'operational' | 'degraded' | 'down'
  latency: number
  uptime: number
}

interface LiveStats {
  totalAlerts: number
  criticalCount: number
  alertsPerMinute: number
  avgResponseTime: number
  activeAnalysts: number
  monitoredAssets: number
  threatFeedsActive: number
  incidentsOpen: number
}

// ============================================================
// MOCK DATA GENERATORS (Simulating Real-Time Data)
// ============================================================

const generateMetricHistory = (points: number = 60): MetricDataPoint[] => {
  const now = Date.now()
  return Array.from({ length: points }, (_, i) => ({
    timestamp: new Date(now - (points - i) * 60000).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    alerts: Math.floor(Math.random() * 50) + 20,
    incidents: Math.floor(Math.random() * 10) + 2,
    threats: Math.floor(Math.random() * 15) + 5,
    bandwidth: Math.floor(Math.random() * 1000) + 500
  }))
}

const generateSystemHealth = (): SystemHealth[] => [
  { component: 'SIEM Platform', status: 'operational', latency: 45, uptime: 99.97 },
  { component: 'SS7 Monitor', status: 'operational', latency: 23, uptime: 99.95 },
  { component: 'Threat Intel', status: 'degraded', latency: 156, uptime: 98.5 },
  { component: 'Network Sensors', status: 'operational', latency: 12, uptime: 99.99 },
  { component: 'Compliance Engine', status: 'operational', latency: 34, uptime: 99.9 },
  { component: 'AI Automation', status: 'operational', latency: 89, uptime: 99.8 }
]

const generateLiveAlerts = (): AlertItem[] => {
  const severities: Array<'critical' | 'high' | 'medium' | 'low' | 'info'> = 
    ['critical', 'high', 'medium', 'low', 'info']
  const sources = ['Wazuh', 'Snort', 'SS7 Probe', 'NetFlow', 'DPI', 'MISP', 'VirusTotal']
  const titles = [
    'Brute force attack detected on SSH port',
    'Suspicious SS7 signaling pattern identified',
    'Malware C2 communication detected',
    'Unauthorized access attempt on API gateway',
    'DDoS attack pattern emerging',
    'SIM swap fraud indicator triggered',
    'Data exfiltration attempt blocked',
    'Phishing campaign targeting executives',
    'Zero-day exploit signature matched',
    'Insider threat behavior anomaly',
    'Ransomware activity detected in segment B',
    'DNS tunneling activity identified'
  ]

  return Array.from({ length: 15 }, (_, i) => ({
    id: `alert-${Date.now()}-${i}`,
    title: titles[Math.floor(Math.random() * titles.length)],
    severity: severities[Math.floor(Math.random() * 3)], // Weight towards critical/high
    timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    source: sources[Math.floor(Math.random() * sources.length)]
  }))
}

const generateSeverityDistribution = () => [
  { name: 'Critical', value: Math.floor(Math.random() * 20) + 5, color: '#ef4444' },
  { name: 'High', value: Math.floor(Math.random() * 40) + 20, color: '#f97316' },
  { name: 'Medium', value: Math.floor(Math.random() * 60) + 40, color: '#eab308' },
  { name: 'Low', value: Math.floor(Math.random() * 80) + 60, color: '#3b82f6' },
  { name: 'Info', value: Math.floor(Math.random() * 100) + 80, color: '#6b7280' }
]

const generateSourceDistribution = () => [
  { name: 'Wazuh SIEM', value: Math.floor(Math.random() * 200) + 100 },
  { name: 'SS7 Probes', value: Math.floor(Math.random() * 150) + 50 },
  { name: 'Network IDS', value: Math.floor(Math.random() * 120) + 80 },
  { name: 'Endpoint EDR', value: Math.floor(Math.random() * 90) + 40 },
  { name: 'Threat Intel', value: Math.floor(Math.random() * 60) + 20 }
]

// Chart configurations
const metricsChartConfig: ChartConfig = {
  alerts: { label: 'Alerts/Min', color: '#06b6d4' },
  incidents: { label: 'Incidents', color: '#f87171' },
  threats: { label: 'Threats', color: '#a855f7' }
}

const bandwidthChartConfig: ChartConfig = {
  bandwidth: { label: 'Mbps', color: '#22c55e' }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// Connection Status Banner
function ConnectionStatusBanner({ 
  connected, 
  lastUpdate,
  onReconnect 
}: { 
  connected: boolean
  lastUpdate: Date | null
  onReconnect: () => void 
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
      connected 
        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
        : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {connected && (
            <span className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </div>
        <span className="text-sm font-medium">
          {connected ? 'Connected to Live Stream' : 'Disconnected'}
        </span>
        <Badge variant="outline" className={`text-xs ${connected ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4">
        {lastUpdate && (
          <span className="text-xs opacity-75">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        {!connected && (
          <Button size="sm" variant="outline" onClick={onReconnect} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>
    </div>
  )
}

// Live Stats Cards Grid
function LiveStatsCards({ stats }: { stats: LiveStats }) {
  const cards = [
    { 
      label: 'Total Alerts', 
      value: stats.totalAlerts, 
      icon: Bell, 
      change: Math.floor(Math.random() * 20) - 5,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    { 
      label: 'Critical Alerts', 
      value: stats.criticalCount, 
      icon: AlertTriangle, 
      change: Math.floor(Math.random() * 5),
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    { 
      label: 'Alerts/Min', 
      value: stats.alertsPerMinute, 
      icon: TrendingUp, 
      change: Math.floor(Math.random() * 10) - 3,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    { 
      label: 'Avg Response', 
      value: `${stats.avgResponseTime}s`, 
      icon: Clock, 
      change: -(Math.floor(Math.random() * 3)),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      inverse: true
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <div className={`flex items-center gap-1 mt-2 text-xs ${
                  (card.change > 0 && !card.inverse) || (card.change < 0 && card.inverse)
                    ? 'text-green-400' 
                    : card.change === 0 
                      ? 'text-slate-400'
                      : 'text-red-400'
                }`}>
                  {card.change > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : card.change < 0 ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{Math.abs(card.change)}% from last hour</span>
                </div>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Metrics Gauges Row
function MetricsGaugesRow() {
  const [cpuUsage, setCpuUsage] = useState(65)
  const [memoryUsage, setMemoryUsage] = useState(72)
  const [networkLoad, setNetworkLoad] = useState(45)
  const [diskIOPS, setDiskIOPS] = useState(82)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 10)))
      setMemoryUsage(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 5)))
      setNetworkLoad(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 15)))
      setDiskIOPS(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 8)))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 flex flex-col items-center">
          <RealTimeMetricsGauge
            value={cpuUsage}
            label="CPU Usage"
            unit="%"
            size={140}
            strokeWidth={10}
          />
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 flex flex-col items-center">
          <RealTimeMetricsGauge
            value={memoryUsage}
            label="Memory"
            unit="%"
            size={140}
            strokeWidth={10}
          />
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 flex flex-col items-center">
          <RealTimeMetricsGauge
            value={networkLoad}
            label="Network"
            unit="%"
            size={140}
            strokeWidth={10}
          />
        </CardContent>
      </Card>
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 flex flex-col items-center">
          <RealTimeMetricsGauge
            value={diskIOPS}
            label="Disk I/O"
            unit="%"
            size={140}
            strokeWidth={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Live Metrics Chart
function LiveMetricsChart({ data }: { data: MetricDataPoint[] }) {
  const [viewMode, setViewMode] = useState<'line' | 'area'>('area')

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Live Security Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="bg-slate-800 h-8">
                <TabsTrigger value="area" className="h-6 px-2 text-xs">Area</TabsTrigger>
                <TabsTrigger value="line" className="h-6 px-2 text-xs">Line</TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs animate-pulse">
              LIVE
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={metricsChartConfig} className="h-[300px] w-full">
          {viewMode === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={9}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="alerts"
                stroke="#06b6d4"
                fill="#06b6d420"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="incidents"
                stroke="#f87171"
                fill="#f8717120"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="threats"
                stroke="#a855f7"
                fill="#a855f720"
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={9}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="alerts"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="incidents"
                stroke="#f87171"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="threats"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Severity Distribution Pie Chart
function SeverityPieChart() {
  const [data, setData] = useState(generateSeverityDistribution())

  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateSeverityDistribution())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-400" />
          Alert Severity Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[250px] w-full">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                      <p className="font-medium text-white">{data.name}</p>
                      <p className="text-sm text-slate-400">{data.value} alerts</p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ChartContainer>
        <div className="flex justify-center gap-4 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-400">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Source Distribution Bar Chart
function SourceBarChart() {
  const [data, setData] = useState(generateSourceDistribution())

  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateSourceDistribution())
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-400" />
          Alerts by Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[250px] w-full">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={100}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                      <p className="font-medium text-white">{payload[0].payload.name}</p>
                      <p className="text-sm text-slate-400">{payload[0].value} alerts</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// System Health Status Grid
function SystemHealthGrid({ systems }: { systems: SystemHealth[] }) {
  const getStatusColor = (status: SystemHealth['status']) => {
    switch (status) {
      case 'operational': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'degraded': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'down': return 'text-red-400 bg-red-500/10 border-red-500/30'
    }
  }

  const getStatusBadge = (status: SystemHealth['status']) => {
    switch (status) {
      case 'operational': return { label: 'Operational', variant: 'default' as const }
      case 'degraded': return { label: 'Degraded', variant: 'warning' as const }
      case 'down': return { label: 'Down', variant: 'destructive' as const }
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Server className="h-5 w-5 text-emerald-400" />
          System Health Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systems.map((system, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(system.status)}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  system.status === 'operational' ? 'bg-green-500' :
                  system.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium text-white text-sm">{system.component}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Latency</p>
                  <p className="text-sm font-mono text-white">{system.latency}ms</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Uptime</p>
                  <p className="text-sm font-mono text-white">{system.uptime}%</p>
                </div>
                <Badge 
                  variant={
                    system.status === 'operational' ? 'default' :
                    system.status === 'degraded' ? 'outline' : 'destructive'
                  }
                  className="text-xs"
                >
                  {getStatusBadge(system.status).label}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAIN REAL-TIME DASHBOARD COMPONENT
// ============================================================

export default function RealTimeMonitoringDashboard() {
  // State management
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [metricData, setMetricData] = useState<MetricDataPoint[]>(generateMetricHistory())
  const [liveAlerts, setLiveAlerts] = useState<AlertItem[]>(generateLiveAlerts())
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>(generateSystemHealth())
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalAlerts: 1247,
    criticalCount: 23,
    alertsPerMinute: 12,
    avgResponseTime: 45,
    activeAnalysts: 24,
    monitoredAssets: 1247,
    threatFeedsActive: 58,
    incidentsOpen: 18
  })

  // Simulate real-time data updates
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setMetricData(prev => {
        const newData = [...prev.slice(1), {
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          alerts: Math.floor(Math.random() * 50) + 20,
          incidents: Math.floor(Math.random() * 10) + 2,
          threats: Math.floor(Math.random() * 15) + 5,
          bandwidth: Math.floor(Math.random() * 1000) + 500
        }]
        return newData
      })
      setLastUpdate(new Date())
    }, 3000)

    const alertsInterval = setInterval(() => {
      const newAlert: AlertItem = {
        id: `alert-${Date.now()}`,
        title: [
          'New intrusion attempt detected',
          'Anomalous traffic pattern flagged',
          'Security policy violation triggered',
          'Malware signature match found'
        ][Math.floor(Math.random() * 4)],
        severity: ['critical', 'high', 'medium'][Math.floor(Math.random() * 3)] as AlertItem['severity'],
        timestamp: new Date().toISOString(),
        source: ['Wazuh', 'Snort', 'SS7 Probe'][Math.floor(Math.random() * 3)]
      }
      setLiveAlerts(prev => [newAlert, ...prev.slice(0, 14)])
      setLiveStats(prev => ({
        ...prev,
        totalAlerts: prev.totalAlerts + 1,
        criticalCount: prev.criticalCount + (newAlert.severity === 'critical' ? 1 : 0)
      }))
    }, 8000)

    const statsInterval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        alertsPerMinute: Math.floor(Math.random() * 20) + 5,
        avgResponseTime: Math.max(10, prev.avgResponseTime + Math.floor(Math.random() * 10) - 5)
      }))
    }, 5000)

    return () => {
      clearInterval(metricsInterval)
      clearInterval(alertsInterval)
      clearInterval(statsInterval)
    }
  }, [])

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    setIsConnected(false)
    setTimeout(() => setIsConnected(true), 1500)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Radio className="h-7 w-7 text-green-400 animate-pulse" />
                Real-Time Monitoring Center
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Djezzy National SOC - Live Security Operations View
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select defaultValue="auto">
                <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Refresh</SelectItem>
                  <SelectItem value="5s">Every 5s</SelectItem>
                  <SelectItem value="30s">Every 30s</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Connection Status */}
        <ConnectionStatusBanner
          connected={isConnected}
          lastUpdate={lastUpdate}
          onReconnect={handleReconnect}
        />

        {/* Live Stats Cards */}
        <LiveStatsCards stats={liveStats} />

        {/* Metrics Gauges */}
        <MetricsGaugesRow />

        {/* Live Alerts Ticker */}
        <LiveAlertsTicker
          alerts={liveAlerts}
          maxVisible={8}
          scrollSpeed={40}
          headerText="🔴 LIVE SECURITY ALERTS"
          onAlertClick={(alert) => console.log('Alert clicked:', alert)}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Metrics Chart */}
          <LiveMetricsChart data={metricData} />

          {/* Severity Distribution */}
          <SeverityPieChart />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Source Distribution */}
          <div className="lg:col-span-1">
            <SourceBarChart />
          </div>

          {/* System Health */}
          <div className="lg:col-span-2">
            <SystemHealthGrid systems={systemHealth} />
          </div>
        </div>

        {/* Geographic Threat Map */}
        <GeoHeatmap
          showLegend={true}
          showTooltips={true}
          animate={true}
          onRegionClick={(region) => console.log('Region clicked:', region)}
        />
      </main>
    </div>
  )
}
