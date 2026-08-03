'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield, TrendingUp, Clock, Target, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Minus,
  Download, Calendar, Filter, RefreshCw, Eye,
  BarChart3, PieChart, Activity, Gauge, FileText,
  ChevronRight, Zap, Users, Server, Globe
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import StatusIndicator from '@/components/shared/StatusIndicator'
import MetricTrend from '@/components/shared/MetricTrend'
import DrillDownCard from '@/components/shared/DrillDownCard'
import DataExporter from '@/components/shared/DataExporter'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'

// Types for Executive Dashboard
interface KPIData {
  title: string
  value: string | number
  change: number
  changeLabel: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  icon: React.ReactNode
}

interface RiskHeatMapData {
  businessUnit: string
  riskScore: number
  trend: 'up' | 'down' | 'stable'
  category: string
}

interface SLAData {
  name: string
  target: number
  actual: number
  status: 'met' | 'breached' | 'at-risk'
}

interface TrendDataPoint {
  date: string
  alerts: number
  incidents: number
  resolved: number
  riskScore: number
}

// Mock data generators
const generateKPIs = (): KPIData[] => [
  {
    title: 'Overall Risk Score',
    value: 42,
    change: -5.2,
    changeLabel: 'vs last month',
    status: 'good',
    icon: <Shield className="h-5 w-5" />
  },
  {
    title: 'Mean Time to Respond (MTTR)',
    value: '2.4h',
    change: -12.5,
    changeLabel: 'improvement',
    status: 'good',
    icon: <Clock className="h-5 w-5" />
  },
  {
    title: 'Asset Coverage',
    value: '94.7%',
    change: 2.1,
    changeLabel: 'new assets',
    status: 'excellent',
    icon: <Target className="h-5 w-5" />
  },
  {
    title: 'Compliance Score',
    value: '87.3%',
    change: 4.8,
    changeLabel: 'vs ANRT requirements',
    status: 'good',
    icon: <CheckCircle className="h-5 w-5" />
  }
]

const generateRiskHeatMap = (): RiskHeatMapData[] => [
  { businessUnit: 'Core Network', riskScore: 78, trend: 'up', category: 'Infrastructure' },
  { businessUnit: 'IT Systems', riskScore: 45, trend: 'down', category: 'Technology' },
  { businessUnit: 'Customer Services', riskScore: 32, trend: 'stable', category: 'Operations' },
  { businessUnit: 'Billing Systems', riskScore: 56, trend: 'up', category: 'Financial' },
  { businessUnit: 'Mobile Network', riskScore: 62, trend: 'stable', category: 'Infrastructure' },
  { businessUnit: 'Data Centers', riskScore: 28, trend: 'down', category: 'Infrastructure' },
  { businessUnit: 'Partner Integrations', riskScore: 71, trend: 'up', category: 'External' },
  { businessUnit: 'Development', riskScore: 39, trend: 'stable', category: 'Technology' }
]

const generateSLAData = (): SLAData[] => [
  { name: 'Critical Incident Response', target: 15, actual: 12, status: 'met' },
  { name: 'High Severity Detection', target: 95, actual: 97.2, status: 'met' },
  { name: 'Threat Intel Dissemination', target: 30, actual: 28, status: 'met' },
  { name: 'Vulnerability Remediation', target: 72, actual: 68, status: 'at-risk' },
  { name: 'Report Generation', target: 24, actual: 22, status: 'met' }
]

const generateTrendData = (days: number): TrendDataPoint[] => {
  const data: TrendDataPoint[] = []
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      alerts: Math.floor(Math.random() * 100) + 50,
      incidents: Math.floor(Math.random() * 20) + 5,
      resolved: Math.floor(Math.random() * 80) + 40,
      riskScore: Math.floor(Math.random() * 20) + 35
    })
  }
  return data
}

// Chart configuration for recharts
const trendChartConfig: ChartConfig = {
  alerts: { label: 'Alerts', color: '#06b6d4' },
  incidents: { label: 'Incidents', color: '#f87171' },
  resolved: { label: 'Resolved', color: '#4ade80' },
  riskScore: { label: 'Risk Score', color: '#fbbf24' }
}

const areaChartConfig: ChartConfig = {
  alerts: { label: 'Security Alerts', color: '#06b6d4' },
}

// Executive Summary Component
function ExecutiveSummary() {
  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Executive Summary
          </CardTitle>
          <Badge variant="outline" className="border-green-500 text-green-400">
            Auto-generated
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            <span className="font-semibold text-white">Overall Security Posture:</span> The Djezzy National SOC 
            demonstrates <span className="text-green-400 font-medium">strong security performance</span> this 
            reporting period with a 5.2% improvement in overall risk score.
          </p>
          <p>
            <span className="font-semibold text-white">Key Achievements:</span> Successfully detected and 
            mitigated <span className="text-blue-400">147 threat campaigns</span> targeting Algerian 
            telecommunications infrastructure. Zero critical security breaches reported.
          </p>
          <p>
            <span className="font-semibold text-white">Areas of Focus:</span> Enhanced monitoring of 
            SS7/Diameter signaling protocols recommended. Partner integration security requires 
            immediate attention with elevated risk scores.
          </p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              View Full Analysis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// KPI Cards Grid
function KPICards({ kpis }: { kpis: KPIData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <DrillDownCard key={index} title={kpi.title}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-3xl font-bold text-white mb-1">{kpi.value}</div>
              <MetricTrend 
                value={kpi.change}
                showArrow={true}
                label={kpi.changeLabel}
                inverseColors={kpi.title.includes('MTTR') || kpi.title.includes('Risk')}
              />
            </div>
            <StatusIndicator status={kpi.status} size="lg" />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{kpi.title}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </DrillDownCard>
      ))}
    </div>
  )
}

// Risk Heat Map Component
function RiskHeatMap({ data }: { data: RiskHeatMapData[] }) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-500/20 border-red-500/50 text-red-400'
    if (score >= 50) return 'bg-orange-500/20 border-orange-500/50 text-orange-400'
    if (score >= 30) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
    return 'bg-green-500/20 border-green-500/50 text-green-400'
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5 text-orange-400" />
            Risk Heat Map by Business Unit
          </CardTitle>
          <Select defaultValue="30d">
            <SelectTrigger className="w-[120px] h-8 bg-slate-800 border-slate-600 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getRiskColor(item.riskScore)}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{item.businessUnit}</span>
                <Badge variant="outline" className="text-xs border-current opacity-70">
                  {item.category}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.riskScore >= 70 ? 'bg-red-500' : 
                      item.riskScore >= 50 ? 'bg-orange-500' :
                      item.riskScore >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${item.riskScore}%` }}
                  />
                </div>
                <span className="font-bold w-10 text-right">{item.riskScore}</span>
                {item.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                ) : item.trend === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-green-400" />
                ) : (
                  <Minus className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// SLA Compliance Gauges
function SLAGauges({ slaData }: { slaData: SLAData[] }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-400" />
          SLA Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {slaData.map((sla, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{sla.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{sla.actual}% / {sla.target}%</span>
                  <StatusIndicator 
                    status={
                      sla.status === 'met' ? 'excellent' : 
                      sla.status === 'at-risk' ? 'warning' : 'critical'
                    } 
                    size="sm"
                  />
                </div>
              </div>
              <Progress 
                value={(sla.actual / sla.target) * 100} 
                className="h-2 bg-slate-700"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced Trend Chart using Recharts
function TrendChart({ period, data }: { period: number; data: TrendDataPoint[] }) {
  const [viewMode, setViewMode] = useState<'line' | 'bar' | 'area'>('line')

  const displayData = data.slice(-Math.min(period, data.length))

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Security Trends ({period} Days)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="bg-slate-800 h-8">
                <TabsTrigger value="line" className="h-6 px-2 text-xs">Line</TabsTrigger>
                <TabsTrigger value="bar" className="h-6 px-2 text-xs">Bar</TabsTrigger>
                <TabsTrigger value="area" className="h-6 px-2 text-xs">Area</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
          {viewMode === 'line' && (
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <LegendWrapper />
              <Line 
                type="monotone" 
                dataKey="alerts" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke="#f87171" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="resolved" 
                stroke="#4ade80" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          )}
          {viewMode === 'bar' && (
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <LegendWrapper />
              <Bar dataKey="alerts" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="incidents" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
          {viewMode === 'area' && (
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <LegendWrapper />
              <Area 
                type="monotone" 
                dataKey="alerts" 
                stroke="#06b6d4" 
                fill="#06b6d440"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="riskScore" 
                stroke="#fbbf24" 
                fill="#fbbf2440"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Legend wrapper component
function LegendWrapper() {
  return (
    <ChartLegend content={<ChartLegendContent />} />
  )
}

// Risk Distribution Radar Chart
function RiskRadarChart() {
  const radarData = [
    { metric: 'Network', score: 78 },
    { metric: 'Endpoint', score: 45 },
    { metric: 'Cloud', score: 62 },
    { metric: 'Identity', score: 35 },
    { metric: 'Data', score: 55 },
    { metric: 'Application', score: 48 }
  ]

  const radarConfig: ChartConfig = {
    score: { label: 'Risk Level', color: '#f87171' }
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5 text-pink-400" />
          Risk Distribution Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={radarConfig} className="h-[250px] w-full">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Radar
              name="Risk Score"
              dataKey="score"
              stroke="#f87171"
              fill="#f8717140"
              strokeWidth={2}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Main Executive Dashboard Component
export default function ExecutiveDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [riskData, setRiskData] = useState<RiskHeatMapData[]>([])
  const [slaData, setSlaData] = useState<SLAData[]>([])
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    setIsLoading(true)
    setTimeout(() => {
      setKpis(generateKPIs())
      setRiskData(generateRiskHeatMap())
      setSlaData(generateSLAData())
      setTrendData(generateTrendData(parseInt(selectedPeriod)))
      setIsLoading(false)
    }, 500)
  }, [selectedPeriod])

  const handleExport = async (format: string) => {
    console.log(`Exporting executive dashboard as ${format}`)
    // Will connect to export API
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400">Loading Executive Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-blue-400" />
                Executive Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Djezzy National SOC - Strategic Overview &amp; KPIs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <DataExporter onExport={handleExport} formats={['pdf', 'csv', 'json']} />
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
        {/* Executive Summary */}
        <ExecutiveSummary />

        {/* KPI Cards */}
        <KPICards kpis={kpis} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Heat Map */}
          <RiskHeatMap data={riskData} />

          {/* SLA Gauges */}
          <SLAGauges slaData={slaData} />
        </div>

        {/* Trend Chart Full Width */}
        <TrendChart period={parseInt(selectedPeriod)} data={trendData} />

        {/* Risk Radar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskRadarChart />
          
          {/* Quick Stats Panel */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Platform Health Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Users className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-400">Active Analysts</span>
                  </div>
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="text-xs text-green-400 mt-1">+3 from last week</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Server className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-xs text-slate-400">Monitored Assets</span>
                  </div>
                  <p className="text-2xl font-bold text-white">1,247</p>
                  <p className="text-xs text-cyan-400 mt-1">+12 new this week</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Zap className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-xs text-slate-400">Platform Uptime</span>
                  </div>
                  <p className="text-2xl font-bold text-white">99.97%</p>
                  <p className="text-xs text-green-400 mt-1">Above SLA target</p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <Globe className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-xs text-slate-400">Threat Feeds Active</span>
                  </div>
                  <p className="text-2xl font-bold text-white">58</p>
                  <p className="text-xs text-slate-400 mt-1">All feeds operational</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
