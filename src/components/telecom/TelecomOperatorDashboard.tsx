/**
 * National SOC Platform - Telecom Operator Dashboard
 * Algeria 2026-2030 | Mobile Operator Security Monitoring
 * 
 * Real-time dashboard for telecom security operations:
 * - Protocol-specific alert monitoring
 * - Subscriber privacy tracking
 * - ARPT compliance status
 * - Network element health
 * - Roaming security
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Shield, Smartphone, Radio, Globe, AlertTriangle, 
  Users, Activity, MapPin, Clock, TrendingUp,
  Server, Database, Lock, FileText, Bell, Settings,
  Phone, Wifi, Signal, Network, Eye, Download
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap
} from 'recharts'
import { format, subHours, subDays } from 'date-fns'

// ============= TYPES =============

interface TelecomMetrics {
  // Signaling Security
  ss7Alerts: number
  gtpAttacks: number
  diameterAnomalies: number
  
  // Subscriber Protection
  subscribersMonitored: number
  privacyViolations: number
  dataAccessRequests: number
  
  // Fraud Prevention
  fraudAttempts: number
  irsdCases: number
  simSwapAttempts: number
  
  // Roaming Security
  roamingSessions: number
  roamingAnomalies: number
  suspiciousPartners: string[]
  
  // Network Health
  networkElements: {
    healthy: number
    degraded: number
    down: number
  }
  
  // Compliance
  arptReportsDue: number
  arptReportsSubmitted: number
  dataRetentionStatus: 'compliant' | 'warning' | 'non-compliant'
}

// ============= MOCK DATA =============

const generateTimeSeriesData = (hours: number = 24) => {
  const data = []
  const now = new Date()
  
  for (let i = hours; i >= 0; i--) {
    const time = subHours(now, i)
    data.push({
      time: format(time, 'HH:mm'),
      ss7Alerts: Math.floor(Math.random() * 50) + 10,
      gtpEvents: Math.floor(Math.random() * 200) + 100,
      diameterAuths: Math.floor(Math.random() * 500) + 300,
      anomalies: Math.floor(Math.random() * 20)
    })
  }
  
  return data
}

const protocolDistribution = [
  { name: 'GTPv1', value: 35, color: '#3b82f6' },
  { name: 'GTPv2', value: 28, color: '#8b5cf6' },
  { name: 'SS7/MAP', value: 18, color: '#ef4444' },
  { name: 'Diameter', value: 15, color: '#f97316' },
  { name: 'RADIUS', value: 4, color: '#22c55e' }
]

const threatCategories = [
  { name: 'Location Tracking', count: 45, severity: 'critical' },
  { name: 'SMS Interception', count: 23, severity: 'critical' },
  { name: 'Tunnel Hijacking', count: 12, severity: 'high' },
  { name: 'SIM Swap Fraud', count: 34, severity: 'high' },
  { name: 'IRSF Fraud', count: 8, severity: 'medium' },
  { name: 'Signaling Storm', count: 3, severity: 'critical' }
]

const roamingData = [
  { country: 'France', sessions: 12500, anomalies: 45 },
  { country: 'Tunisia', sessions: 8900, anomalies: 12 },
  { country: 'Morocco', sessions: 7600, anomalies: 28 },
  { country: 'Spain', sessions: 5200, anomalies: 15 },
  { country: 'Italy', sessions: 4800, anomalies: 8 },
  { country: 'Turkey', sessions: 3200, anomalies: 22 },
  { country: 'Egypt', sessions: 2800, anomalies: 18 },
  { country: 'Germany', sessions: 2100, anomalies: 5 }
]

const networkElements = [
  { type: 'HLR', total: 2, healthy: 2, degraded: 0, down: 0 },
  { type: 'MSC/VLR', total: 8, healthy: 7, degraded: 1, down: 0 },
  { type: 'SGSN', total: 6, healthy: 5, degraded: 1, down: 0 },
  { type: 'GGSN/PGW', total: 4, healthy: 4, degraded: 0, down: 0 },
  { type: 'HSS', total: 3, healthy: 3, degraded: 0, down: 0 },
  { type: 'STP', total: 4, healthy: 4, degraded: 0, down: 0 },
  { type: 'eNodeB', total: 3500, healthy: 3420, degraded: 65, down: 15 },
  { type: 'gNodeB', total: 850, healthy: 830, degraded: 15, down: 5 }
]

// ============= COMPONENTS =============

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  trend = 'neutral',
  subtitle
}: { 
  title: string
  value: string | number
  change?: number
  icon: any
  color: string
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}) {
  const colors = {
    red: 'from-red-500/20 to-red-500/5 text-red-400 border-red-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400 border-yellow-500/30',
    green: 'from-green-500/20 to-green-500/5 text-green-400 border-green-500/30',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30'
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color as keyof typeof colors]} border rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${color === 'red' ? 'bg-red-500/20' : color === 'orange' ? 'bg-orange-500/20' : color === 'green' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3 text-red-400" />
          ) : trend === 'down' ? (
            <TrendingUp className="w-3 h-3 text-green-400 rotate-180" />
          ) : null}
          <span className={trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-slate-400'}>
            {change > 0 ? '+' : ''}{change}% from last hour
          </span>
        </div>
      )}
    </div>
  )
}

function ProtocolTrafficChart() {
  const data = generateTimeSeriesData(24)
  
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="ss7Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gtpGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLineProps={{ stroke: '#374151' }} />
        <YAxis stroke="#6b7280" fontSize={11} tickLineProps={{ stroke: '#374151' }} />
        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
        <Legend />
        <Area type="monotone" dataKey="ss7Alerts" stroke="#ef4444" fill="url(#ss7Gradient)" name="SS7 Alerts" strokeWidth={2} />
        <Area type="monotone" dataKey="gtpEvents" stroke="#3b82f6" fill="url(#gtpGradient)" name="GTP Events" strokeWidth={2} />
        <Line type="monotone" dataKey="anomalies" stroke="#f97316" dot={false} name="Anomalies" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function ThreatRadarChart() {
  const threatData = [
    { subject: 'SS7 Attacks', A: 85, fullMark: 100 },
    { subject: 'GTP Abuse', A: 72, fullMark: 100 },
    { subject: 'Fraud', A: 65, fullMark: 100 },
    { subject: 'Privacy', A: 78, fullMark: 100 },
    { subject: 'Roaming', A: 55, fullMark: 100 },
    { subject: 'DoS', A: 40, fullMark: 100 }
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={threatData}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="subject" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <PolarRadiusAxis stroke="#374151" fontSize={9} />
        <Tooltip />
        <Radar name="Risk Level" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function RoamingBarChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={roamingData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" stroke="#6b7280" fontSize={11} />
        <YAxis dataKey="country" type="category" stroke="#6b7280" fontSize={11} width={70} />
        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
        <Legend />
        <Bar dataKey="sessions" name="Roaming Sessions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        <Bar dataKey="anomalies" name="Security Anomalies" fill="#ef4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function NetworkElementTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-3 px-4 text-slate-400 font-medium">Element</th>
            <th className="text-center py-3 px-4 text-slate-400 font-medium">Total</th>
            <th className="text-center py-3 px-4 text-green-400 font-medium">Healthy</th>
            <th className="text-center py-3 px-4 text-yellow-400 font-medium">Degraded</th>
            <th className="text-center py-3 px-4 text-red-400 font-medium">Down</th>
            <th className="text-center py-3 px-4 text-slate-400 font-medium">Health %</th>
          </tr>
        </thead>
        <tbody>
          {networkElements.map((element) => {
            const healthPercent = Math.round((element.healthy / element.total) * 100)
            return (
              <tr key={element.type} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-3 px-4 font-medium text-white">{element.type}</td>
                <td className="py-3 px-4 text-center text-slate-300">{element.total.toLocaleString()}</td>
                <td className="py-3 px-4 text-center text-green-400">{element.healthy.toLocaleString()}</td>
                <td className="py-3 px-4 text-center text-yellow-400">{element.degraded}</td>
                <td className="py-3 px-4 text-center text-red-400">{element.down}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    healthPercent >= 99 ? 'bg-green-500/20 text-green-400' :
                    healthPercent >= 95 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {healthPercent}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============= MAIN DASHBOARD COMPONENT =============

export function TelecomOperatorDashboard() {
  const [selectedOperator, setSelectedOperator] = useState('mobilis')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [activeTab, setActiveTab] = useState('overview')

  // Mock metrics - would come from API
  const metrics: TelecomMetrics = useMemo(() => ({
    ss7Alerts: 47,
    gtpAttacks: 12,
    diameterAnomalies: 89,
    subscribersMonitored: 28475632,
    privacyViolations: 3,
    dataAccessRequests: 156,
    fraudAttempts: 234,
    irsdCases: 8,
    simSwapAttempts: 45,
    roamingSessions: 45678,
    roamingAnomalies: 153,
    suspiciousPartners: ['Unknown-Operator-X'],
    networkElements: {
      healthy: 4271,
      degraded: 82,
      down: 20
    },
    arptReportsDue: 1,
    arptReportsSubmitted: 11,
    dataRetentionStatus: 'compliant'
  }), [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Smartphone className="w-7 h-7 text-cyan-400" />
            Telecom Security Operations Center
          </h2>
          <p className="text-slate-400 mt-1">
            Mobile Operator Security Monitoring & ARPT Compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Operator Selector */}
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="mobilis">Mobilis</option>
            <option value="djezzy">Djezzy</option>
            <option value="ooredoo">Ooredoo</option>
          </select>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Actions */}
          <button className="p-2 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors">
            <Download className="w-5 h-5 text-slate-400" />
          </button>
          
          <button className="p-2 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors relative">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              3
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row 1 - Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SS7 Security Alerts"
          value={metrics.ss7Alerts}
          change={12}
          icon={Radio}
          color="red"
          trend="up"
          subtitle="Critical signaling threats"
        />
        
        <MetricCard
          title="GTP Attack Attempts"
          value={metrics.gtpAttacks}
          change={-5}
          icon={Shield}
          color="orange"
          trend="down"
          subtitle="Tunnel hijacking & abuse"
        />
        
        <MetricCard
          title="Fraud Attempts Blocked"
          value={metrics.fraudAttempts}
          change={8}
          icon={Lock}
          color="purple"
          trend="up"
          subtitle="IRSF, SIM swap, bypass"
        />
        
        <MetricCard
          title="Active Roaming Sessions"
          value={metrics.roamingSessions.toLocaleString()}
          icon={Globe}
          color="blue"
          subtitle={`${metrics.roamingAnomalies} anomalies`}
        />
      </div>

      {/* KPI Cards Row 2 - Privacy & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Subscribers Protected"
          value={(metrics.subscribersMonitored / 1000000).toFixed(1) + 'M'}
          icon={Users}
          color="green"
          subtitle="Under security monitoring"
        />

        <MetricCard
          title="Privacy Violations"
          value={metrics.privacyViolations}
          change={-2}
          icon={Eye}
          color="yellow"
          trend="down"
          subtitle="Data access violations"
        />

        <MetricCard
          title="ARPT Reports Status"
          value={`${metrics.arptReportsSubmitted}/${metrics.arptReportsSubmitted + metrics.arptReportsDue}`}
          icon={FileText}
          color={metrics.arptReportsDue > 0 ? 'orange' : 'green'}
          subtitle={metrics.arptReportsDue > 0 ? `${metrics.arptReportsDue} pending` : 'All submitted'}
        />

        <MetricCard
          title="Network Health"
          value={`${Math.round((metrics.networkElements.healthy / (metrics.networkElements.healthy + metrics.networkElements.degraded + metrics.networkElements.down)) * 100)}%`}
          icon={Server}
          color={metrics.networkElements.down > 0 ? 'red' : metrics.networkElements.degraded > 0 ? 'yellow' : 'green'}
          subtitle={`${metrics.networkElements.down} elements down`}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {['overview', 'protocols', 'threats', 'network', 'roaming', 'compliance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors relative ${
              activeTab === tab ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.replace('_', ' ')}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Protocol Traffic Analysis
            </h3>
            <ProtocolTrafficChart />
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Threat Risk Assessment
            </h3>
            <ThreatRadarChart />
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Active Threat Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {threatCategories.map((threat) => (
                <div key={threat.name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{threat.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{threat.count} incidents this period</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    threat.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    threat.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {threat.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Protocols Tab */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Protocol Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={protocolDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {protocolDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Legend verticalAlign="middle" align="right" iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Protocol-Specific Alerts</h3>
            <div className="space-y-4">
              {[
                { protocol: 'SS7/MAP', alerts: 47, critical: 12, description: 'Location tracking, SMS interception attempts' },
                { protocol: 'GTPv2', alerts: 34, critical: 8, description: 'Tunnel hijacking, bearer theft attempts' },
                { protocol: 'Diameter', alerts: 89, critical: 3, description: 'Authentication failures, roaming anomalies' },
                { protocol: 'SIP/VoLTE', alerts: 15, critical: 2, description: 'Call manipulation, registration attacks' }
              ].map((item) => (
                <div key={item.protocol} className="p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{item.protocol}</span>
                    <span className="text-sm text-slate-400">{item.alerts} alerts</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{item.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">{item.critical} critical</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <div 
                        className="bg-red-500 h-full rounded-full" 
                        style={{ width: `${(item.critical / item.alerts) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network Elements Tab */}
      {activeTab === 'network' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Network Element Health Status
          </h3>
          <NetworkElementTable />
        </div>
      )}

      {/* Roaming Tab */}
      {activeTab === 'roaming' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            International Roaming Security Monitor
          </h3>
          <RoamingBarChart />
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h4 className="font-semibold text-white mb-2">ARPT Reporting</h4>
              <div className="text-3xl font-bold text-green-400 mb-2">92%</div>
              <p className="text-sm text-slate-400">On-time submission rate</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Monthly reports</span>
                  <span className="text-white">11/12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Incident notifications</span>
                  <span className="text-white">8/8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Breach reports</span>
                  <span className="text-green-400">0 overdue</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h4 className="font-semibold text-white mb-2">Data Retention</h4>
              <div className="text-3xl font-bold text-green-400 mb-2">Compliant</div>
              <p className="text-sm text-slate-400">7-year retention policy</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Alerts retained</span>
                  <span className="text-white">6y 8m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Incidents retained</span>
                  <span className="text-white">6y 8m</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Audit logs</span>
                  <span className="text-white">6y 8m</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h4 className="font-semibold text-white mb-2">Subscriber Privacy</h4>
              <div className="text-3xl font-bold text-green-400 mb-2">Protected</div>
              <p className="text-sm text-slate-400">Maximum privacy level</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Data accesses today</span>
                  <span className="text-white">156</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Violations this month</span>
                  <span className="text-green-400">3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Consent rate</span>
                  <span className="text-white">98.5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent ARPT Submissions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent ARPT Submissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400">Reference</th>
                    <th className="text-left py-3 px-4 text-slate-400">Type</th>
                    <th className="text-left py-3 px-4 text-slate-400">Period</th>
                    <th className="text-left py-3 px-4 text-slate-400">Submitted</th>
                    <th className="text-left py-3 px-4 text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ref: 'ARPT-603-2026072401', type: 'Monthly Security', period: 'Jun 2026', date: '2026-07-01', status: 'accepted' },
                    { ref: 'ARPT-NOTIF-603-2026072203', type: 'Incident Notification', period: 'Jul 22, 2026', date: '2026-07-22', status: 'acknowledged' },
                    { ref: 'ARPT-603-2026071502', type: 'Fraud Report', period: 'Jul 15, 2026', date: '2026-07-16', status: 'under_review' }
                  ].map((submission) => (
                    <tr key={submission.ref} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-cyan-400 text-xs">{submission.ref}</td>
                      <td className="py-3 px-4 text-white">{submission.type}</td>
                      <td className="py-3 px-4 text-slate-300">{submission.period}</td>
                      <td className="py-3 px-4 text-slate-300">{submission.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          submission.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          submission.status === 'acknowledged' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {submission.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TelecomOperatorDashboard
