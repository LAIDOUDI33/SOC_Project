'use client'

import React, { useState, useMemo } from 'react'
import {
  Shield, Globe, AlertTriangle, Bug, Lock, Search, Filter,
  Download, RefreshCw, ExternalLink, Clock, TrendingUp,
  Eye, Ban, CheckCircle, XCircle, ArrowRight, Info,
  Database, FileText, MapPin, Calendar, BarChart3,
  Radar, Target, Zap, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Threat Intelligence Types
interface IOC {
  id: string
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'pattern'
  value: string
  threatType: 'malware' | 'phishing' | 'c2' | 'apt' | 'vulnerability' | 'fraud'
  confidence: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'expired' | 'false_positive' | 'under_review'
  source: string
  firstSeen: Date
  lastSeen: Date
  description?: string
  tags?: string[]
  relatedIncidents?: number
  ttps?: string[]
}

interface ThreatActor {
  id: string
  name: string
  alias: string[]
  country: string
  motivation: 'espionage' | 'financial' | 'destruction' | 'hacktivism'
  sophistication: 'advanced' | 'intermediate' | 'novice'
  active: boolean
  targetSectors: string[]
  knownTools: string[]
  description: string
}

interface Campaign {
  id: string
  name: string
  threatActor: string
  status: 'active' | 'dormant' | 'disrupted'
  startDate: Date
  targetRegion: string
  vectors: string[]
  iocCount: number
  description: string
}

// Sample Data
const sampleIOCs: IOC[] = [
  {
    id: 'ioc-001', type: 'ip', value: '185.220.101.45',
    threatType: 'c2', confidence: 95, severity: 'critical', status: 'active',
    source: 'Internal + MISP', firstSeen: new Date('2024-08-20'), lastSeen: new Date('2024-08-24'),
    description: 'Known APT-29 C2 server, active beaconing detected',
    tags: ['apt-29', 'c2', 'russia', 'cozy-bear'],
    relatedIncidents: 3, ttps: ['T1071.001', 'T1001.003']
  },
  {
    id: 'ioc-002', type: 'domain', value: 'evil-c2[.]ru',
    threatType: 'c2', confidence: 98, severity: 'critical', status: 'active',
    source: 'ThreatIntel Feed', firstSeen: new Date('2024-08-18'), lastSeen: new Date('2024-08-24'),
    description: 'Command and control domain used in recent phishing campaign',
    tags: ['c2', 'phishing', 'dga'],
    relatedIncidents: 5, ttps: ['T1568.002']
  },
  {
    id: 'ioc-003', type: 'hash', value: 'a1b2c3d4e5f6...',
    threatType: 'malware', confidence: 92, severity: 'high', status: 'active',
    source: 'VirusTotal + Internal', firstSeen: new Date('2024-08-22'), lastSeen: new Date('2024-08-23'),
    description: 'LockBit 3.0 ransomware variant, file encryptor payload',
    tags: ['ransomware', 'lockbit', 'encryptor'],
    relatedIncidents: 2, ttps: ['T1486']
  },
  {
    id: 'ioc-004', type: 'email', value: 'ceo-fraud@secure-update[.]com',
    threatType: 'phishing', confidence: 88, severity: 'high', status: 'active',
    source: 'Email Gateway', firstSeen: new Date('2024-08-24'), lastSeen: new Date('2024-08-24'),
    description: 'BEC sender address targeting executive team',
    tags: ['bec', 'phishing', 'executive-targeting', 'vendor-impersonation'],
    relatedIncidents: 1, ttps: ['T1566.001']
  },
  {
    id: 'ioc-005', type: 'url', value: 'hxxp://update[.]microsoft-secure[.]com/login',
    threatType: 'phishing', confidence: 85, severity: 'high', status: 'active',
    source: 'URL Scanner', firstSeen: new Date('2024-08-23'), lastSeen: new Date('2024-08-24'),
    description: 'Credential harvesting page impersonating Microsoft',
    tags: ['credential-theft', 'phishing', 'microsoft-impersonation'],
    relatedIncidents: 1, ttps: ['T1111.002', 'T1566.001']
  },
  {
    id: 'ioc-006', type: 'ip', value: '45.33.32.156',
    threatType: 'apt', confidence: 78, severity: 'medium', status: 'under_review',
    source: 'Anonymous Tip', firstSeen: new Date('2024-08-24'), lastSeen: new Date('2024-08-24'),
    description: 'Suspicious IP observed scanning for Exchange vulnerabilities',
    tags: ['scanning', 'exchange', 'potential-apt'],
    relatedIncidents: 0, ttps: ['T1595.002']
  }
]

const sampleThreatActors: ThreatActor[] = [
  {
    id: 'ta-001', name: 'APT-29 (Cozy Bear)', alias: ['Cozy Bear', 'The Dukes'],
    country: 'Russia', motivation: 'espionage', sophistication: 'advanced', active: true,
    targetSectors: ['Government', 'Defense', 'Think Tanks', 'Energy'],
    knownTools: ['CozyDropper', 'WellMess', 'MiniDuke'],
    description: 'Russian state-sponsored group targeting Western governments and organizations for strategic intelligence collection.'
  },
  {
    id: 'ta-002', name: 'LockBit Ransomware Gang', alias: ['LockBit', 'LockBit Black'],
    country: 'Russia/CIS', motivation: 'financial', sophistication: 'advanced', active: true,
    targetSectors: ['Healthcare', 'Finance', 'Manufacturing', 'Critical Infrastructure'],
    knownTools: ['LockBit 3.0', 'StealBit', 'DarkReader'],
    description: 'Ransomware-as-a-service operation deploying LockBit ransomware variants against high-value targets globally.'
  }
]

const sampleCampaigns: Campaign[] = [
  {
    id: 'camp-001', name: 'Operation Phishing Storm', threatActor: 'APT-29',
    status: 'active', startDate: new Date('2024-08-15'), targetRegion: 'North Africa (Algeria, Tunisia)',
    vectors: ['Phishing', 'Watering Hole', 'Supply Chain'], iocCount: 47,
    description: 'Multi-vector campaign targeting government and energy sectors with BEC and credential theft objectives.'
  },
  {
    id: 'camp-002', name: 'RansomWave Q3 2024', threatActor: 'LockBit',
    status: 'active', startDate: new Date('2024-07-01'), targetRegion: 'Global',
    vectors: ['Ransomware', 'Initial Access Brokers', 'Double Extortion'], iocCount: 234,
    description: 'Large-scale ransomware campaign leveraging initial access brokers and double-extortion tactics.'
  }
]

const iocTypeConfig = {
  ip: { icon: Globe, color: '#EF4444', label: 'IP Address' },
  domain: { icon: Globe, color: '#F59E0B', label: 'Domain' },
  url: { icon: ExternalLink, color: '#8B5CF6', label: 'URL' },
  hash: { icon: Database, color: '#10B981', label: 'File Hash' },
  email: { icon: FileText, color: '#06B6D4', label: 'Email' },
  pattern: { icon: Bug, color: '#F97316', label: 'Pattern' },
}

const severityConfig = {
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critical' },
  high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Medium' },
  low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Low' },
}

export function ThreatIntelligenceCenter() {
  const [selectedTab, setSelectedTab] = useState<'iocs' | 'actors' | 'campaigns'>('iocs')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIOCs, setSelectedIOCs] = useState<Set<string>>(new Set())

  // Filter IOCs
  const filteredIOCs = useMemo(() => {
    return sampleIOCs.filter(ioc => {
      const matchesType = filterType === 'all' || ioc.type === filterType
      const matchesSeverity = filterSeverity === 'all' || ioc.severity === filterSeverity
      const matchesSearch = !searchQuery || 
        ioc.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ioc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ioc.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesType && matchesSeverity && matchesSearch
    })
  }, [filterType, filterSeverity, searchQuery])

  // Statistics
  const stats = useMemo(() => ({
    totalIOCs: sampleIOCs.length,
    criticalCount: sampleIOCs.filter(i => i.severity === 'critical').length,
    activeCampaigns: sampleCampaigns.filter(c => c.status === 'active').length,
    trackedActors: sampleThreatActors.length,
    todayNew: 12,
    falsePositives: 3,
  }), [])

  const toggleIOCSelection = (id: string) => {
    setSelectedIOCs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <TooltipProvider>
      <Card className="bg-slate-900 border-slate-700 h-full">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-emerald-500" />
                Threat Intelligence Command Center
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">IOC management, threat actor tracking, campaign analysis</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync Feeds
              </Button>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Download className="h-4 w-4 mr-1" />
                Export STIX
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-6 gap-3 mt-4">
            {[
              { label: 'Total IOCs', value: stats.totalIOCs, icon: Database, color: 'text-blue-400' },
              { label: 'Critical', value: stats.criticalCount, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Active Campaigns', value: stats.activeCampaigns, icon: Radar, color: 'text-orange-400' },
              { label: 'Tracked Actors', value: stats.trackedActors, icon: Bug, color: 'text-purple-400' },
              { label: 'Today New', value: stats.todayNew, icon: TrendingUp, color: 'text-green-400' },
              { label: 'False Positives', value: stats.falsePositives, icon: XCircle, color: 'text-yellow-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800 rounded-lg p-2 text-center">
                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 px-4">
            {[
              { id: 'iocs', label: 'Indicators of Compromise', icon: Lock, count: stats.totalIOCs },
              { id: 'actors', label: 'Threat Actors', icon: Bug, count: stats.trackedActors },
              { id: 'campaigns', label: 'Campaigns', icon: Radar, count: stats.activeCampaigns },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 ml-1">{tab.count}</Badge>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {selectedTab === 'iocs' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search IOCs..."
                      className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px] bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(iocTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="all">All Severity</SelectItem>
                      {Object.entries(severityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedIOCs.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Block ({selectedIOCs.size})
                      </Button>
                      <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                        <Download className="h-4 w-4 mr-1" />
                        Export Selected
                      </Button>
                    </div>
                  )}
                </div>

                {/* IOC Table */}
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-800">
                      <TableRow>
                        <TableHead className="w-10 text-slate-400">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIOCs(new Set(filteredIOCs.map(i => i.id)))
                              } else {
                                setSelectedIOCs(new Set())
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-slate-400">Type</TableHead>
                        <TableHead className="text-slate-400">Value</TableHead>
                        <TableHead className="text-slate-400">Threat Type</TableHead>
                        <TableHead className="text-slate-400">Confidence</TableHead>
                        <TableHead className="text-slate-400">Severity</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Source</TableHead>
                        <TableHead className="text-slate-400">Last Seen</TableHead>
                        <TableHead className="text-right text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIOCs.map((ioc) => {
                        const typeConfig = iocTypeConfig[ioc.type]
                        const sevConfig = severityConfig[ioc.severity]
                        const Icon = typeConfig.icon
                        
                        return (
                          <TableRow key={ioc.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedIOCs.has(ioc.id)}
                                onChange={() => toggleIOCSelection(ioc.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 p-1.5 rounded-md bg-slate-800 inline-flex" style={{ backgroundColor: `${typeConfig.color}15` }}>
                                    <Icon className="h-4 w-4" style={{ color: typeConfig.color }} />
                                    <span className="text-xs text-slate-300">{typeConfig.label}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{typeConfig.label}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-sm text-white max-w-[180px] truncate block cursor-pointer hover:text-emerald-400">
                                    {ioc.value}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="font-mono text-xs break-all">{ioc.value}</p>
                                  {ioc.description && <p className="mt-2 text-xs text-slate-300">{ioc.description}</p>}
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 capitalize">
                                {ioc.threatType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={ioc.confidence} className="w-16 h-1.5" />
                                <span className={`text-xs font-medium ${
                                  ioc.confidence >= 90 ? 'text-green-400' :
                                  ioc.confidence >= 70 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {ioc.confidence}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={sevConfig.color}>
                                {sevConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={
                                ioc.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                ioc.status === 'under_review' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-slate-700 text-slate-300 border-slate-600'
                              }>
                                {ioc.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-400 max-w-[120px] truncate">{ioc.source}</TableCell>
                            <TableCell className="text-xs text-slate-400">
                              {ioc.lastSeen.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-400">
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Block IOC</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-400">
                                      <Search className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Pivot to Investigation</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {selectedTab === 'actors' && (
              <div className="grid gap-4 md:grid-cols-2">
                {sampleThreatActors.map((actor) => (
                  <Card key={actor.id} className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${actor.active ? 'bg-red-500/20' : 'bg-slate-700'}`}>
                            <Bug className={`h-5 w-5 ${actor.active ? 'text-red-400' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base text-white">{actor.name}</CardTitle>
                            <p className="text-xs text-slate-400 mt-0.5">{actor.alias.join(', ')}</p>
                          </div>
                        </div>
                        <Badge variant={actor.active ? 'default' : 'secondary'} className={
                          actor.active ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-700 text-slate-400'
                        }>
                          {actor.active ? 'Active' : 'Dormant'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-300">{actor.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Country</p>
                          <p className="text-white flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{actor.country}
                          </p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Motivation</p>
                          <p className="text-white capitalize mt-0.5">{actor.motivation}</p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Sophistication</p>
                          <p className="text-white capitalize mt-0.5">{actor.sophistication}</p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Target Sectors</p>
                          <p className="text-white mt-0.5">{actor.targetSectors.length} sectors</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-2">Known Tools</p>
                        <div className="flex flex-wrap gap-1">
                          {actor.knownTools.map((tool) => (
                            <Badge key={tool} variant="secondary" className="bg-slate-900 text-slate-300 border-slate-600 text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-slate-700" />

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 bg-slate-900 border-slate-600 hover:bg-slate-800 text-white text-xs">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Full Profile
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-slate-900 border-slate-600 hover:bg-slate-800 text-white text-xs">
                          <Activity className="h-3.5 w-3.5 mr-1" />
                          Track Activity
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedTab === 'campaigns' && (
              <div className="space-y-4">
                {sampleCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-orange-500/20">
                            <Radar className="h-5 w-5 text-orange-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-white">{campaign.name}</CardTitle>
                            <p className="text-xs text-slate-400 mt-0.5">By {campaign.threatActor}</p>
                          </div>
                        </div>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                          {campaign.status.toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-300">{campaign.description}</p>
                      
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Started</p>
                          <p className="text-white flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />{campaign.startDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Target Region</p>
                          <p className="text-white flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{campaign.targetRegion}
                          </p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">Vectors</p>
                          <p className="text-white mt-0.5">{campaign.vectors.length} types</p>
                        </div>
                        <div className="bg-slate-900 rounded p-2">
                          <p className="text-slate-400">IOCs</p>
                          <p className="text-orange-400 font-medium mt-0.5">{campaign.iocCount}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-2">Attack Vectors</p>
                        <div className="flex flex-wrap gap-1">
                          {campaign.vectors.map((vector) => (
                            <Badge key={vector} variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/30 text-xs">
                              <Zap className="h-3 w-3 mr-1" />{vector}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs">
                          <Target className="h-3.5 w-3.5 mr-1" />
                          Analyze Campaign
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-slate-900 border-slate-600 hover:bg-slate-800 text-white text-xs">
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />
                          View All IOCs
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
