'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, Activity, Radio, Shield, Zap, Eye, Globe,
  Network, Clock, TrendingUp, AlertTriangle, Users, Server,
  ArrowRight, Star, Sparkles, Target, Lock, Database,
  Wifi, Satellite, MapPin, PieChart, LineChart
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================================
// DASHBOARD CARDS CONFIGURATION
// ============================================================

interface DashboardCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  bgColor: string
  borderColor: string
  features: string[]
  status: 'live' | 'enhanced' | 'new' | 'stable'
  category: 'monitoring' | 'analysis' | 'telecom' | 'compliance' | 'executive'
}

const dashboards: DashboardCard[] = [
  // Real-Time Monitoring
  {
    id: 'realtime',
    title: 'Real-Time Monitoring Center',
    description: 'Live security operations view with streaming metrics, alert tickers, and system health gauges',
    icon: Radio,
    href: '/dashboards/realtime',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    features: ['Live SSE Stream', 'Metrics Gauges', 'Alert Ticker', 'Geo Heatmap', 'Auto-refresh'],
    status: 'new',
    category: 'monitoring'
  },
  
  // Enhanced Analyst Workspace
  {
    id: 'analyst-enhanced',
    title: 'Enhanced Analyst Workspace',
    description: 'Advanced analyst interface with integrated charts, trend analysis, and smart filtering',
    icon: Zap,
    href: '/dashboards/analyst-enhanced',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    features: ['Alert Trends Chart', 'Severity Distribution', 'Source Analysis', 'Quick Stats', 'Keyboard Shortcuts'],
    status: 'new',
    category: 'analysis'
  },
  
  // Executive Dashboard
  {
    id: 'executive',
    title: 'Executive Dashboard',
    description: 'Strategic overview with KPIs, risk heat maps, SLA tracking, and business intelligence',
    icon: BarChart3,
    href: '/dashboards/executive',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    features: ['KPI Cards', 'Risk Heat Map', 'SLA Tracking', 'Trend Charts', 'Radar Analysis'],
    status: 'enhanced',
    category: 'executive'
  },
  
  // Telecom / SS7 Monitoring
  {
    id: 'telecom',
    title: 'Telecom Security Center',
    description: 'SS7/Diameter signaling monitoring, fraud detection, and telecom infrastructure security',
    icon: Phone,
    href: '/dashboards/telecom',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    features: ['SS7 Traffic Monitor', 'Fraud Detection', 'Signaling Map', 'Network Topology', 'Probe Status'],
    status: 'enhanced',
    category: 'telecom'
  },
  
  // Threat Hunting
  {
    id: 'threat-hunting',
    title: 'Threat Hunting Workspace',
    description: 'Proactive threat detection with MITRE ATT&CK framework integration and IOC analysis',
    icon: Target,
    href: '/dashboards/threat-hunting',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    features: ['Threat Timeline', 'MITRE Mapping', 'IOC Pivot', 'Hunt Sessions', 'YARA Rules'],
    status: 'live',
    category: 'analysis'
  },
  
  // Compliance / ARTP
  {
    id: 'compliance',
    title: 'Compliance & ARTP Dashboard',
    description: 'Regulatory compliance monitoring for Algerian telecommunications authority requirements',
    icon: Shield,
    href: '/dashboards/compliance',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    features: ['ARTP Requirements', 'Audit Trail', 'Policy Compliance', 'Reporting', 'Evidence Mgmt'],
    status: 'stable',
    category: 'compliance'
  },

  // Original Analyst Workspace
  {
    id: 'analyst',
    title: 'Analyst Workspace (Classic)',
    description: 'Standard SOC analyst interface with alert management and investigation tools',
    icon: Activity,
    href: '/dashboards/analyst',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    features: ['Alert Queue', 'Context Panel', 'Timeline', 'Bulk Actions', 'Smart Filters'],
    status: 'stable',
    category: 'analysis'
  }
]

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================

function StatusBadge({ status }: { status: DashboardCard['status'] }) {
  const config = {
    new: { label: 'NEW', className: 'bg-green-500/20 text-green-400 border-green-500/50 animate-pulse' },
    enhanced: { label: 'ENHANCED', className: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    live: { label: 'LIVE', className: 'bg-red-500/20 text-red-400 border-red-500/50' },
    stable: { label: 'STABLE', className: 'bg-slate-500/20 text-slate-400 border-slate-500/50' }
  }

  const { label, className } = config[status]

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${className}`}>
      {label}
    </Badge>
  )
}

// ============================================================
// CATEGORY FILTER
// ============================================================

const categories = [
  { id: 'all', label: 'All Dashboards', icon: BarChart3 },
  { id: 'monitoring', label: 'Monitoring', icon: Eye },
  { id: 'analysis', label: 'Analysis', icon: Search },
  { id: 'telecom', label: 'Telecom', icon: Phone },
  { id: 'executive', label: 'Executive', icon: TrendingUp },
  { id: 'compliance', label: 'Compliance', icon: Shield }
]

function CategoryIcon({ categoryId }: { categoryId: string }) {
  switch (categoryId) {
    case 'monitoring': return <Eye className="h-4 w-4" />
    case 'analysis': return <Zap className="h-4 w-4" />
    case 'telecom': return <Phone className="h-4 w-4" />
    case 'executive': return <TrendingUp className="h-4 w-4" />
    case 'compliance': return <Shield className="h-4 w-4" />
    default: return <BarChart3 className="h-4 w-4" />
  }
}

// Need to import Search icon - using a placeholder
function Search(props: any) {
  return <Eye {...props} /> // Temporary workaround
}

// ============================================================
// STATS SUMMARY
// ============================================================

function StatsSummary() {
  const stats = [
    { label: 'Total Dashboards', value: '7', icon: LayoutGrid, color: 'text-blue-400' },
    { label: 'New Features', value: '3', icon: Sparkles, color: 'text-green-400' },
    { label: 'Visualizations', value: '15+', icon: PieChart, color: 'text-purple-400' },
    { label: 'Real-Time Feeds', value: '5', icon: Radio, color: 'text-red-400' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-')}/20`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Temporary component for LayoutGrid
function LayoutGrid(props: any) {
  return <BarChart3 {...props} />
}

// ============================================================
// MAIN DASHBOARD HUB COMPONENT
// ============================================================

export default function DashboardHub() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter dashboards by category and search query
  const filteredDashboards = dashboards.filter(dashboard => {
    const matchesCategory = selectedCategory === 'all' || dashboard.category === selectedCategory
    const matchesSearch = !searchQuery || 
      dashboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dashboard.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-yellow-400" />
                National SOC Dashboard Hub
              </h1>
              <p className="text-slate-400 mt-2">
                Djezzy Security Operations Center — Comprehensive Visualization Suite
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-green-500/50 text-green-400 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                All Systems Operational
              </Badge>
              <Button 
                variant="outline" 
                className="border-slate-600 text-slate-300"
                onClick={() => window.location.reload()}
              >
                Refresh All
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <StatsSummary />

          {/* Category Filters & Search */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Category Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <CategoryIcon categoryId={category.id} />
                  {category.label}
                </button>
              ))}
            </div>

            {/* Search (optional - can be added later) */}
            <div className="ml-auto text-sm text-slate-500">
              Showing {filteredDashboards.length} of {dashboards.length} dashboards
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Dashboard Grid */}
      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDashboards.map((dashboard) => (
            <Link key={dashboard.id} href={dashboard.href}>
              <Card className={`
                h-full bg-slate-900 border-slate-700 
                hover:border-slate-600 transition-all duration-300
                hover:shadow-lg hover:shadow-blue-500/5
                hover:-translate-y-1 cursor-pointer group
              `}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${dashboard.bgColor} ${dashboard.borderColor} border`}>
                      <dashboard.icon className={`h-6 w-6 ${dashboard.color}`} />
                    </div>
                    <StatusBadge status={dashboard.status} />
                  </div>
                  
                  <CardTitle className="text-white text-lg mt-4 group-hover:text-blue-300 transition-colors">
                    {dashboard.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-2 line-clamp-2">
                    {dashboard.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Features List */}
                  <div className="space-y-2 mb-4">
                    {dashboard.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className={`w-1 h-1 rounded-full ${
                          index === 0 ? 'bg-green-400' :
                          index === 1 ? 'bg-blue-400' :
                          index === 2 ? 'bg-purple-400' : 'bg-yellow-400'
                        }`} />
                        {feature}
                      </div>
                    ))}
                    {dashboard.features.length > 4 && (
                      <div className="text-xs text-slate-500">
                        +{dashboard.features.length - 4} more features
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button 
                    variant="outline" 
                    className={`w-full ${dashboard.borderColor} ${dashboard.color} border hover:bg-slate-800`}
                  >
                    Open Dashboard
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredDashboards.length === 0 && (
          <div className="text-center py-16">
            <BarChart3 className="h-16 w-16 mx-auto text-slate-700 mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">No dashboards found</h3>
            <p className="text-slate-500">Try adjusting your filters or search query</p>
            <Button 
              variant="outline" 
              className="mt-4 border-slate-600 text-slate-300"
              onClick={() => {
                setSelectedCategory('all')
                setSearchQuery('')
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visualization Components Showcase */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-400" />
                Available Visualizations
              </CardTitle>
              <CardDescription className="text-slate-400">
                Reusable components used across all dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'RealTimeMetricsGauge', desc: 'Animated SVG gauges' },
                  { name: 'LiveAlertsTicker', desc: 'Scrolling alerts feed' },
                  { name: 'GeoHeatmap', desc: 'Algeria threat map' },
                  { name: 'NetworkTopologyGraph', desc: 'Infrastructure diagram' },
                  { name: 'ThreatTimeline', desc: 'MITRE ATT&CK timeline' },
                  { name: 'SystemResourcesMonitor', desc: 'Server health panel' },
                  { name: 'IncidentCommandCenter', desc: 'IR management UI' },
                  { name: 'ThreatFeedWidget', desc: 'Intel aggregation' }
                ].map((viz, index) => (
                  <div key={index} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-sm font-medium text-white">{viz.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{viz.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links & Info */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LineChart className="h-5 w-5 text-cyan-400" />
                Integration Points
              </CardTitle>
              <CardDescription className="text-slate-400">
                Data sources and external integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Wazuh SIEM', status: 'Connected', icon: Shield },
                  { name: 'SS7 Probes', status: 'Active', icon: Radio },
                  { name: 'MISP Threat Intel', status: 'Synced', icon: Database },
                  { name: 'Elasticsearch Logs', status: 'Streaming', icon: Server },
                  { name: 'TheHive Cases', status: 'Linked', icon: Target },
                  { name: 'Prometheus Metrics', status: 'Scraping', icon: Activity }
                ].map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <integration.icon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{integration.name}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] border-green-500/50 text-green-400"
                    >
                      {integration.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6 px-6">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <span>National SOC Platform v2.0</span>
            <span>•</span>
            <span>Djezzy Algeria</span>
            <span>•</span>
            <span>Build: {new Date().toISOString().split('T')[0]}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Next.js + Recharts + shadcn/ui</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
