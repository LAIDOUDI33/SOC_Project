'use client'

import React, { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Activity, AlertTriangle, 
  Shield, Clock, BarChart3, Download, RefreshCw
} from 'lucide-react'
import { format, subDays } from 'date-fns'

// ============= TYPES =============
interface TimeSeriesData {
  timestamp: string
  alerts: number
  incidents: number
  threatsBlocked: number
  eps: number
}

interface SeverityData {
  name: string
  value: number
  color: string
}

interface SourceData {
  name: string
  alerts: number
  resolved: number
}

// ============= MOCK DATA =============
function generateTimeSeriesData(days: number = 30): TimeSeriesData[] {
  const data: TimeSeriesData[] = []
  const now = new Date()
  
  for (let i = days; i >= 0; i--) {
    const date = subDays(now, i)
    data.push({
      timestamp: format(date, 'MMM dd'),
      alerts: Math.floor(Math.random() * 100) + 50,
      incidents: Math.floor(Math.random() * 10) + 1,
      threatsBlocked: Math.floor(Math.random() * 500) + 200,
      eps: Math.floor(Math.random() * 200000) + 500000
    })
  }
  return data
}

const severityData: SeverityData[] = [
  { name: 'Critical', value: 12, color: '#ef4444' },
  { name: 'High', value: 45, color: '#f97316' },
  { name: 'Medium', value: 128, color: '#eab308' },
  { name: 'Low', value: 234, color: '#22c55e' },
  { name: 'Info', value: 567, color: '#6b7280' }
]

const sourceData: SourceData[] = [
  { name: 'Wazuh', alerts: 1247, resolved: 1198 },
  { name: 'Suricata', alerts: 3421, resolved: 3389 },
  { name: 'MISP', alerts: 156, resolved: 150 },
  { name: 'TheHive', alerts: 89, resolved: 85 }
]

const threatTrendData = [
  { month: 'Sep', apt28: 45, apt29: 38, lazarus: 22, lockbit: 67 },
  { month: 'Oct', apt28: 52, apt29: 42, lazarus: 28, lockbit: 89 },
  { month: 'Nov', apt28: 38, apt29: 55, lazarus: 19, lockbit: 78 },
  { month: 'Dec', apt28: 61, apt29: 48, lazarus: 31, lockbit: 95 },
  { month: 'Jan', apt28: 48, apt29: 62, lazarus: 25, lockbit: 82 }
]

const mttrData = [
  { week: 'W1', mttr: 4.2, target: 2.0 },
  { week: 'W2', mttr: 3.8, target: 2.0 },
  { week: 'W3', mttr: 2.9, target: 2.0 },
  { week: 'W4', mttr: 2.4, target: 2.0 },
  { week: 'W5', mttr: 1.9, target: 2.0 }
]

// ============= CUSTOM TOOLTIP =============
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-white font-medium ml-auto">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ============= CHART COMPONENTS =============
function AlertsTrendChart({ data }: { data: TimeSeriesData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="timestamp" stroke="#6b7280" fontSize={12} tickLineProps={{ stroke: '#374151' }} />
        <YAxis stroke="#6b7280" fontSize={12} tickLineProps={{ stroke: '#374151' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area type="monotone" dataKey="alerts" stroke="#ef4444" fill="url(#alertGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function SeverityPieChart({ data }: { data: SeverityData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function SourceBarChart({ data }: { data: SourceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" stroke="#6b7280" fontSize={12} />
        <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} width={80} tickLineProps={{ stroke: '#374151' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="alerts" name="Total Alerts" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        <Bar dataKey="resolved" name="Resolved" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ThreatActorRadarChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={threatTrendData}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="month" stroke="#6b7280" fontSize={12} tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <PolarRadiusAxis stroke="#374151" fontSize={10} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Radar name="APT28" dataKey="apt28" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
        <Radar name="APT29" dataKey="apt29" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
        <Radar name="Lazarus" dataKey="lazarus" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
        <Radar name="LockBit" dataKey="lockbit" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function MTTRLineChart({ data }: { data: typeof mttrData }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="mttr" name="Actual MTTR (hrs)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
        <Line type="monotone" dataKey="target" name="Target (2h)" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#22c55e' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ============= KPI CARD COMPONENT =============
function KPICard({ title, value, change, icon, color }: { title: string; value: string; change: number; icon: React.ReactNode; color: 'red' | 'orange' | 'green' | 'blue' }) {
  const isPositive = change > 0
  const colors = {
    red: 'from-red-500/20 to-red-500/5 text-red-400',
    orange: 'from-orange-500/20 to-orange-500/5 text-orange-400',
    green: 'from-green-500/20 to-green-500/5 text-green-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400'
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border border-slate-700 rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color === 'red' ? 'bg-red-500/20' : color === 'orange' ? 'bg-orange-500/20' : color === 'green' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm">
        {isPositive ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-green-400" />}
        <span className={isPositive ? 'text-red-400' : 'text-green-400'}>
          {Math.abs(change)}% {isPositive ? 'increase' : 'decrease'} from last period
        </span>
      </div>
    </div>
  )
}

// ============= MAIN COMPONENT =============
export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'performance'>('overview')
  
  const timeSeriesData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return generateTimeSeriesData(days)
  }, [timeRange])

  const kpis = useMemo(() => {
    const totalAlerts = timeSeriesData.reduce((sum, d) => sum + d.alerts, 0)
    const totalIncidents = timeSeriesData.reduce((sum, d) => sum + d.incidents, 0)
    const avgEPS = Math.round(timeSeriesData.reduce((sum, d) => sum + d.eps, 0) / timeSeriesData.length)
    
    return { totalAlerts, totalIncidents, avgEPS, avgMTTR: 1.9, alertChange: -12.5, incidentChange: -8.3, epsChange: 5.2 }
  }, [timeSeriesData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-slate-400 mt-1">Security metrics and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="p-2 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
          <button className="p-2 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
            <Download className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Alerts" value={kpis.totalAlerts.toLocaleString()} change={kpis.alertChange} icon={<AlertTriangle className="w-6 h-6" />} color="red" />
        <KPICard title="Open Incidents" value={kpis.totalIncidents.toLocaleString()} change={kpis.incidentChange} icon={<Shield className="w-6 h-6" />} color="orange" />
        <KPICard title="Avg EPS" value={`${(kpis.avgEPS / 1000).toFixed(0)}K`} change={kpis.epsChange} icon={<Activity className="w-6 h-6" />} color="blue" />
        <KPICard title="Avg MTTR" value={`${kpis.avgMTTR}h`} change={-22.5} icon={<Clock className="w-6 h-6" />} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {(['overview', 'threats', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Alert Volume Trend
            </h3>
            <AlertsTrendChart data={timeSeriesData} />
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Severity Distribution
            </h3>
            <SeverityPieChart data={severityData} />
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Alerts by Source
            </h3>
            <SourceBarChart data={sourceData} />
          </div>
        </div>
      )}

      {/* Threats Tab */}
      {activeTab === 'threats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Threat Actor Activity (5 Months)
            </h3>
            <ThreatActorRadarChart />
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-400" />
              MTTR Trend (Weekly)
            </h3>
            <MTTRLineChart data={mttrData} />
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard
