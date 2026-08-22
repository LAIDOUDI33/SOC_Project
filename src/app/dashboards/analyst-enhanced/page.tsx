'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Filter, Bell, Clock, User, Tag, AlertTriangle,
  CheckCircle, XCircle, ArrowRight, Eye, Edit, Trash2,
  Bookmark, MoreVertical, Send, Plus, ChevronDown,
  Keyboard, Zap, Shield, Target, FileText, MessageSquare,
  LayoutGrid, List, RefreshCw, Download, Archive,
  Play, Pause, SkipForward, RotateCcw, TrendingUp,
  BarChart3, PieChart, Activity
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import SmartFilter from '@/components/shared/SmartFilter'
import StatusIndicator from '@/components/shared/StatusIndicator'
import TimelineViewer from '@/components/shared/TimelineViewer'
import NotificationPanel from '@/components/shared/NotificationPanel'
import KeyboardShortcutsHelp from '@/components/shared/KeyboardShortcutsHelp'

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
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Import demo data
import { 
  recentAlerts as demoAlerts, 
  analystStats 
} from '@/lib/demo-data'

// ============================================================
// TYPES
// ============================================================

interface Alert {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'closed'
  source: string
  timestamp: Date
  assignee?: string
  description: string
  iocs?: string[]
  relatedAssets?: string[]
  isBookmarked: boolean
}

interface InvestigationEvent {
  id: string
  type: 'action' | 'note' | 'status-change' | 'evidence' | 'assignment'
  timestamp: Date
  user: string
  content: string
  metadata?: Record<string, unknown>
}

interface FilterState {
  severity: string[]
  status: string[]
  source: string[]
  dateRange: string
  searchQuery: string
}

// ============================================================
// DATA GENERATORS
// ============================================================

const generateAlerts = (): Alert[] => demoAlerts.slice(0, 15).map(alert => ({
  id: alert.id,
  title: alert.title,
  severity: alert.severity as Alert['severity'],
  status: alert.status === 'open' ? 'new' : 
         alert.status === 'acknowledged' ? 'acknowledged' :
         alert.status === 'investigating' ? 'investigating' :
         alert.status === 'resolved' ? 'resolved' : 'closed',
  source: alert.source,
  timestamp: new Date(alert.timestamp),
  assignee: alert.assignee,
  description: alert.description,
  iocs: [alert.sourceIp, alert.mitreTechnique].filter(Boolean) as string[],
  relatedAssets: [],
  isBookmarked: Math.random() > 0.8
}))

const generateTimeline = (): InvestigationEvent[] => [
  {
    id: 'evt-1',
    type: 'status-change',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    user: 'Analyst Ahmed',
    content: 'Alert acknowledged and assigned to investigation queue',
    metadata: { fromStatus: 'new', toStatus: 'acknowledged' }
  },
  {
    id: 'evt-2',
    type: 'action',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    user: 'Analyst Ahmed',
    content: 'Initiated IOC enrichment via MISP integration',
    metadata: { tool: 'MISP', queryCount: 3 }
  },
  {
    id: 'evt-3',
    type: 'note',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    user: 'Analyst Sarah',
    content: 'Cross-referencing with recent threat intel - possible APT activity pattern match',
    metadata: { tags: ['threat-intel', 'apt'] }
  },
  {
    id: 'evt-4',
    type: 'evidence',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'Analyst Ahmed',
    content: 'Captured PCAP of suspicious traffic for analysis',
    metadata: { evidenceType: 'pcap', size: '2.4MB' }
  },
  {
    id: 'evt-5',
    type: 'assignment',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    user: 'Team Lead Karim',
    content: 'Escalated to Tier 2 for deep analysis',
    metadata: { assignedTo: 'Tier2-Analyst-Mohammed' }
  }
]

// Generate alert trend data (last 24 hours by hour)
const generateAlertTrendData = () => {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(now - (24 - i) * 3600000)
    return {
      time: hour.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
      critical: Math.floor(Math.random() * 8),
      high: Math.floor(Math.random() * 15),
      medium: Math.floor(Math.random() * 25),
      low: Math.floor(Math.random() * 30)
    }
  })
}

// Generate severity distribution for donut chart
const generateSeverityData = () => [
  { name: 'Critical', value: Math.floor(Math.random() * 20) + 10, color: '#ef4444' },
  { name: 'High', value: Math.floor(Math.random() * 40) + 30, color: '#f97316' },
  { name: 'Medium', value: Math.floor(Math.random() * 60) + 50, color: '#eab308' },
  { name: 'Low', value: Math.floor(Math.random() * 80) + 70, color: '#3b82f6' },
  { name: 'Info', value: Math.floor(Math.random() * 100) + 90, color: '#6b7280' }
]

// Generate source distribution
const generateSourceData = () => [
  { name: 'Wazuh SIEM', value: Math.floor(Math.random() * 200) + 150 },
  { name: 'SS7 Monitor', value: Math.floor(Math.random() * 100) + 80 },
  { name: 'Network IDS', value: Math.floor(Math.random() * 120) + 90 },
  { name: 'Endpoint EDR', value: Math.floor(Math.random() * 80) + 60 },
  { name: 'Threat Intel', value: Math.floor(Math.random() * 50) + 30 },
  { name: 'DPI Engine', value: Math.floor(Math.random() * 60) + 40 }
]

// Chart configs
const trendChartConfig: ChartConfig = {
  critical: { label: 'Critical', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#3b82f6' }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SeverityBadge({ severity }: { severity: Alert['severity'] }) {
  const styles = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    info: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  return (
    <Badge variant="outline" className={`text-xs ${styles[severity]}`}>
      {severity.toUpperCase()}
    </Badge>
  )
}

function StatusBadge({ status }: { status: Alert['status'] }) {
  const styles = {
    new: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    acknowledged: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    investigating: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <Badge variant="outline" className={`text-xs ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// NEW: Alert Trend Chart Component
function AlertTrendChart({ data }: { data: ReturnType<typeof generateAlertTrendData> }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            Alert Volume (24h)
          </CardTitle>
          <Select defaultValue="24h">
            <SelectTrigger className="w-[100px] h-7 bg-slate-800 border-slate-600 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="12h">Last 12h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-[180px] w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              interval={4}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} />
            <Area type="monotone" dataKey="high" stroke="#f97316" fill="#f9731620" strokeWidth={1.5} />
            <Area type="monotone" dataKey="medium" stroke="#eab308" fill="#eab30820" strokeWidth={1.5} />
            <Area type="monotone" dataKey="low" stroke="#3b82f6" fill="#3b82f620" strokeWidth={1.5} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// NEW: Severity Distribution Donut
function SeverityDistribution({ data }: { data: ReturnType<typeof generateSeverityData> }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <PieChart className="h-4 w-4 text-purple-400" />
          Severity Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={{}} className="h-[140px] w-[140px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                        <span className="text-white">{payload[0].payload.name}: </span>
                        <span className="text-slate-300">{payload[0].value}</span>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ChartContainer>
          <div className="flex-1 space-y-2">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// NEW: Source Distribution Horizontal Bar
function SourceDistribution({ data }: { data: ReturnType<typeof generateSourceData> }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          Alerts by Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[180px] w-full">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              width={85}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  return (
                    <div className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                      <span className="text-white">{payload[0].payload.name}: </span>
                      <span className="text-slate-300">{payload[0].value} alerts</span>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Quick Stats Cards
function AnalystQuickStats({ alerts }: { alerts: Alert[] }) {
  const stats = [
    {
      label: 'Total Alerts',
      value: alerts.length,
      icon: Bell,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    {
      label: 'Critical',
      value: alerts.filter(a => a.severity === 'critical').length,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      label: 'Pending',
      value: alerts.filter(a => a.status === 'new').length,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'In Progress',
      value: alerts.filter(a => a.status === 'investigating').length,
      icon: Play,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-slate-400">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Alert Item Component (unchanged from original)
function AlertItem({ 
  alert, 
  isSelected, 
  onSelect, 
  onClick,
  onBookmark,
  onQuickAction 
}: { 
  alert: Alert
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onClick: () => void
  onBookmark: () => void
  onQuickAction: (action: string) => void 
}) {
  return (
    <div 
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:bg-slate-800/50 ${
        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
            <span className="text-xs text-slate-500 font-mono">{alert.id}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onBookmark(); }}
              className="ml-auto"
            >
              <Bookmark 
                className={`h-4 w-4 ${alert.isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}`}
              />
            </button>
          </div>
          
          <h3 className="font-medium text-white truncate mb-1">{alert.title}</h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">{alert.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alert.source}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(alert.timestamp)}
            </span>
            {alert.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {alert.assignee}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 mt-3 pt-3 border-t border-slate-700">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs text-slate-400 hover:text-blue-400"
          onClick={(e) => { e.stopPropagation(); onQuickAction('acknowledge'); }}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Ack
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs text-slate-400 hover:text-orange-400"
          onClick={(e) => { e.stopPropagation(); onQuickAction('escalate'); }}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          Escalate
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 text-xs text-slate-400 hover:text-green-400"
          onClick={(e) => { e.stopPropagation(); onQuickAction('close'); }}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Close
        </Button>
      </div>
    </div>
  )
}

// Alert Context Panel (unchanged from original)
function AlertContextPanel({ alert }: { alert: Alert | null }) {
  if (!alert) {
    return (
      <Card className="bg-slate-900 border-slate-700 h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center text-slate-500">
            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select an alert to view details</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900 border-slate-700 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Alert Details</CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <ScrollArea className="h-[calc(100%-80px)]">
        <CardContent className="space-y-6">
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{alert.title}</h2>
            <p className="text-sm text-slate-400">{alert.description}</p>
          </div>

          <Separator className="bg-slate-700" />

          {/* IOCs */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-400" />
              Indicators of Compromise (IOCs)
            </h3>
            <div className="space-y-2">
              {alert.iocs?.map((ioc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700">
                  <code className="text-sm text-cyan-400 font-mono">{ioc}</code>
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-slate-400">
                    Pivot
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Related Assets */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Related Assets
            </h3>
            <div className="flex flex-wrap gap-2">
              {alert.relatedAssets?.map((asset, index) => (
                <Badge key={index} variant="outline" className="border-slate-600 text-slate-300">
                  {asset}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Investigation Timeline */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              Investigation Timeline
            </h3>
            <TimelineViewer events={generateTimeline()} compact />
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-slate-600 text-slate-300 text-sm">
                <Play className="h-4 w-4 mr-2" />
                Run Playbook
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Create Case
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 text-sm">
                <Send className="h-4 w-4 mr-2" />
                Escalate
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 text-sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  )
}

// Utility function
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Keyboard shortcuts configuration
const keyboardShortcuts = [
  { key: 'a', description: 'Acknowledge selected alert', action: () => {} },
  { key: 'e', description: 'Escalate selected alert', action: () => {} },
  { key: 'c', description: 'Close selected alert', action: () => {} },
  { key: 'b', description: 'Toggle bookmark', action: () => {} },
  { key: '↑↓', description: 'Navigate alerts', action: () => {} },
  { key: '/', description: 'Focus search', action: () => {} },
  { key: 'f', description: 'Open filters', action: () => {} },
  { key: 'r', description: 'Refresh data', action: () => {} },
  { key: '?', description: 'Show this help', action: () => {} }
]

// ============================================================
// MAIN ENHANCED ANALYST WORKSPACE COMPONENT
// ============================================================

export default function EnhancedAnalystWorkspace() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([])
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Chart data states
  const [trendData, setTrendData] = useState(generateAlertTrendData())
  const [severityData, setSeverityData] = useState(generateSeverityData())
  const [sourceData, setSourceData] = useState(generateSourceData())

  // Initialize data
  useEffect(() => {
    setIsLoading(true)
    const data = generateAlerts()
    setAlerts(data)
    setFilteredAlerts(data)
    
    // Simulate real-time chart updates
    const chartInterval = setInterval(() => {
      setTrendData(generateAlertTrendData())
      setSeverityData(generateSeverityData())
      setSourceData(generateSourceData())
    }, 10000)
    
    setTimeout(() => setIsLoading(false), 300)
    return () => clearInterval(chartInterval)
  }, [])

  // Handle filter changes
  const handleFilterChange = useCallback((filters: Partial<FilterState>) => {
    let filtered = [...alerts]

    if (filters.severity?.length) {
      filtered = filtered.filter(a => filters.severity!.includes(a.severity))
    }

    if (filters.status?.length) {
      filtered = filtered.filter(a => filters.status!.includes(a.status))
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
      )
    }

    setFilteredAlerts(filtered)
  }, [alerts])

  // Handle quick actions
  const handleQuickAction = (alertId: string, action: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        switch (action) {
          case 'acknowledge':
            return { ...alert, status: 'acknowledged' as const }
          case 'escalate':
            return { ...alert, status: 'investigating' as const }
          case 'close':
            return { ...alert, status: 'closed' as const }
          default:
            return alert
        }
      }
      return alert
    }))
  }

  // Toggle bookmark
  const toggleBookmark = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, isBookmarked: !alert.isBookmarked } : alert
    ))
  }

  // Bulk actions
  const handleBulkAction = (action: string) => {
    selectedAlerts.forEach(id => {
      handleQuickAction(id, action)
    })
    setSelectedAlerts(new Set())
  }

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        document.getElementById('alert-search')?.focus()
        return
      }

      if (selectedAlertId) {
        if (e.key === 'a') handleQuickAction(selectedAlertId, 'acknowledge')
        if (e.key === 'e') handleQuickAction(selectedAlertId, 'escalate')
        if (e.key === 'c') handleQuickAction(selectedAlertId, 'close')
        if (e.key === 'b') toggleBookmark(selectedAlertId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAlertId])

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400">Loading Analyst Workspace...</p>
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
                <Zap className="h-7 w-7 text-yellow-400" />
                Enhanced Analyst Workspace
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Unified Security Operations Center with Real-Time Analytics
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  className={viewMode === 'list' ? 'bg-slate-700' : 'text-slate-400'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  className={viewMode === 'grid' ? 'bg-slate-700' : 'text-slate-400'}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="relative border-slate-600 text-slate-300"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                  3
                </span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="border-slate-600 text-slate-300"
                onClick={() => setShowShortcuts(true)}
              >
                <Keyboard className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                size="icon" 
                className="border-slate-600 text-slate-300"
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
        {/* NEW: Analytics Dashboard Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert Trend Chart */}
          <div className="lg:col-span-2">
            <AlertTrendChart data={trendData} />
          </div>
          
          {/* Severity & Source Side by Side */}
          <div className="space-y-6">
            <SeverityDistribution data={severityData} />
            <SourceDistribution data={sourceData} />
          </div>
        </div>

        {/* Quick Stats */}
        <AnalystQuickStats alerts={alerts} />

        {/* Main Workspace: Alerts List + Context Panel */}
        <div className="flex h-[500px] border border-slate-800 rounded-lg overflow-hidden">
          {/* Alerts Panel */}
          <div className="w-[480px] flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/50">
            {/* Filters and Search */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <SmartFilter 
                onFilterChange={handleFilterChange}
                placeholder="Search alerts..."
                showSeverityFilter
                showStatusFilter
                showSourceFilter
              />

              {/* Bulk Actions */}
              {selectedAlerts.size > 0 && (
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <span className="text-sm text-blue-400">
                    {selectedAlerts.size} selected
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400" onClick={() => handleBulkAction('acknowledge')}>
                      Ack All
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-400" onClick={() => handleBulkAction('escalate')}>
                      Escalate All
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => setSelectedAlerts(new Set())}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No alerts match your filters</p>
                  </div>
                ) : (
                  filteredAlerts.map(alert => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      isSelected={selectedAlerts.has(alert.id)}
                      onSelect={(selected) => {
                        setSelectedAlerts(prev => {
                          const next = new Set(prev)
                          if (selected) next.add(alert.id)
                          else next.delete(alert.id)
                          return next
                        })
                      }}
                      onClick={() => setSelectedAlertId(alert.id)}
                      onBookmark={() => toggleBookmark(alert.id)}
                      onQuickAction={(action) => handleQuickAction(alert.id, action)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Footer Stats */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Showing {filteredAlerts.length} of {alerts.length} alerts</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {alerts.filter(a => a.severity === 'critical').length} Critical
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    {alerts.filter(a => a.severity === 'high').length} High
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Context Panel */}
          <div className="flex-1 overflow-hidden bg-slate-900/30">
            <AlertContextPanel alert={selectedAlert} />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showShortcuts && (
        <KeyboardShortcutsHelp 
          shortcuts={keyboardShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      )}

      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  )
}
