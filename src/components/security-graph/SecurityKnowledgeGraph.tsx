'use client'

import React, { useState, useMemo } from 'react'
import {
  Network, User, Server, Globe, Shield, AlertTriangle,
  Search, Filter, ZoomIn, ZoomOut, Maximize2, Download,
  ChevronRight, Lock, Database, Cpu, FileText, Bug,
  ArrowRight, CircleDot, MousePointerClick, Info
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Entity types for the security graph
interface GraphEntity {
  id: string
  type: 'user' | 'device' | 'ip' | 'domain' | 'file' | 'vulnerability' | 'incident' | 'threat_actor' | 'ioc' | 'process'
  name: string
  riskScore: number
  status: 'active' | 'contained' | 'investigating' | 'critical' | 'normal'
  properties?: Record<string, string | number>
}

interface GraphRelation {
  source: string
  target: string
  type: 'connected_to' | 'communicated_with' | 'authenticated_as' | 'exploited_by' | 'indicates' | 'part_of' | 'accessed'
  strength: number
  timestamp?: Date
}

// Sample data representing a real investigation scenario
const sampleEntities: GraphEntity[] = [
  // Users
  { id: 'u1', type: 'user', name: 'maria.chen@finance', riskScore: 94, status: 'critical', properties: { department: 'Finance', role: 'Analyst', location: 'HQ-Algiers' }},
  { id: 'u2', type: 'user', name: 'ahmed.benali@eng', riskScore: 78, status: 'active', properties: { department: 'Engineering', role: 'Senior Dev', location: 'Remote' }},
  { id: 'u3', type: 'user', name: 'admin.it@ops', riskScore: 45, status: 'normal', properties: { department: 'IT Ops', role: 'Administrator', location: 'DataCenter' }},
  
  // Devices/Endpoints
  { id: 'd1', type: 'device', name: 'WORKSTATION-0147', riskScore: 88, status: 'critical', properties: { os: 'Windows 11', ip: '192.168.1.147', owner: 'maria.chen@finance' }},
  { id: 'd2', type: 'device', name: 'LAPTOP-DEV-089', riskScore: 72, status: 'active', properties: { os: 'Ubuntu 22.04', ip: '10.0.0.89', owner: 'ahmed.benali@eng' }},
  { id: 'd3', type: 'device', name: 'FILESERVER-PROD-02', riskScore: 65, status: 'investigating', properties: { os: 'Windows Server 2022', ip: '10.0.0.50', role: 'File Storage' }},
  
  // IPs and Domains
  { id: 'ip1', type: 'ip', name: '185.220.101.45', riskScore: 95, status: 'active', properties: { country: 'Russia', asn: 'AS9009', reputation: 'Malicious' }},
  { id: 'ip2', type: 'ip', name: '45.33.32.156', riskScore: 82, status: 'active', properties: { country: 'Netherlands', asn: 'AS60404', reputation: 'Suspicious' }},
  { id: 'dom1', type: 'domain', name: 'evil-c2[.]ru', riskScore: 98, status: 'active', properties: { category: 'C2', firstSeen: '2024-08-20' }},
  { id: 'dom2', type: 'domain', name: 'phish-supply[.]com', riskScore: 91, status: 'active', properties: { category: 'Phishing', firstSeen: '2024-08-22' }},
  
  // Files and Processes
  { id: 'f1', type: 'file', name: 'mimikatz.exe', riskScore: 99, status: 'critical', properties: { hash: 'a1b2c3...', type: 'Credential Theft', size: '1.2MB' }},
  { id: 'f2', type: 'file', name: 'data_export.zip', riskScore: 85, status: 'active', properties: { hash: 'd4e5f6...', type: 'Archive', size: '4.2GB' }},
  { id: 'p1', type: 'process', name: 'powershell.exe (encoded)', riskScore: 92, status: 'critical', properties: { pid: '4892', parent: 'explorer.exe', cmdLine: '-enc XYZ...' }},
  
  // Threat Actors and IOCs
  { id: 'ta1', type: 'threat_actor', name: 'APT-29 (Cozy Bear)', riskScore: 97, status: 'active', properties: { country: 'Russia', motivation: 'Espionage', sophistication: 'Advanced' }},
  { id: 'ioc1', type: 'ioc', name: 'IOC-TA-2024-0847', riskScore: 90, status: 'active', properties: { type: 'Campaign', iocType: 'Composite' }},
  
  // Vulnerabilities
  { id: 'vuln1', type: 'vulnerability', name: 'CVE-2024-21412', riskScore: 75, status: 'active', properties: { cvss: '9.8', cveType: 'RCE', product: 'Exchange Server' }},
  
  // Incident
  { id: 'inc1', type: 'incident', name: 'INC-2024-4521', riskScore: 88, status: 'critical', properties: { severity: 'Critical', status: 'Containment', type: 'Data Exfiltration' }},
]

const sampleRelations: GraphRelation[] = [
  // User connections
  { source: 'u1', target: 'd1', type: 'authenticated_as', strength: 95 },
  { source: 'u2', target: 'd2', type: 'authenticated_as', strength: 90 },
  { source: 'u3', target: 'd3', type: 'authenticated_as', strength: 85 },
  
  // Device communications
  { source: 'd1', target: 'ip1', type: 'communicated_with', strength: 92 },
  { source: 'd1', target: 'dom1', type: 'connected_to', strength: 88 },
  { source: 'd2', target: 'ip2', type: 'communicated_with', strength: 75 },
  { source: 'd2', target: 'd3', type: 'accessed', strength: 80 },
  
  // Malicious activity
  { source: 'd1', target: 'p1', type: 'part_of', strength: 95 },
  { source: 'p1', target: 'f1', type: 'part_of', strength: 98 },
  { source: 'd1', target: 'f2', type: 'part_of', strength: 85 },
  { source: 'd3', target: 'f2', type: 'accessed', strength: 78 },
  
  // Threat actor connections
  { source: 'ta1', target: 'dom1', type: 'indicates', strength: 94 },
  { source: 'ta1', target: 'ip1', type: 'exploited_by', strength: 90 },
  { source: 'ta1', target: 'ioc1', type: 'part_of', strength: 99 },
  { source: 'ioc1', target: 'dom2', type: 'indicates', strength: 87 },
  
  // Incident correlation
  { source: 'inc1', target: 'u1', type: 'part_of', strength: 95 },
  { source: 'inc1', target: 'd1', type: 'part_of', strength: 92 },
  { source: 'inc1', target: 'f2', type: 'part_of', strength: 88 },
  { source: 'inc1', target: 'ta1', type: 'indicates', strength: 75 },
  
  // Vulnerability exploitation
  { source: 'vuln1', target: 'd3', type: 'exploited_by', strength: 70 },
]

const entityConfig = {
  user: { icon: User, color: '#3B82F6', label: 'User' },
  device: { icon: Cpu, color: '#8B5CF6', label: 'Device' },
  ip: { icon: Globe, color: '#EF4444', label: 'IP Address' },
  domain: { icon: Globe, color: '#F59E0B', label: 'Domain' },
  file: { icon: FileText, color: '#10B981', label: 'File' },
  vulnerability: { icon: Shield, color: '#F97316', label: 'Vulnerability' },
  incident: { icon: AlertTriangle, color: '#DC2626', label: 'Incident' },
  threat_actor: { icon: Bug, color: '#EC4899', label: 'Threat Actor' },
  ioc: { icon: Lock, color: '#6366F1', label: 'IOC' },
  process: { icon: Cpu, color: '#14B8A6', label: 'Process' },
}

const relationConfig = {
  connected_to: { color: '#6B7280', dashArray: '' },
  communicated_with: { color: '#EF4444', dashArray: '5,5' },
  authenticated_as: { color: '#3B82F6', dashArray: '' },
  exploited_by: { color: '#DC2626', dashArray: '3,3' },
  indicates: { color: '#F59E0B', dashArray: '8,4' },
  part_of: { color: '#10B981', dashArray: '' },
  accessed: { color: '#8B5CF6', dashArray: '' },
}

export function SecurityKnowledgeGraph() {
  const [selectedEntity, setSelectedEntity] = useState<GraphEntity | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showRelations, setShowRelations] = useState(true)

  // Filter entities based on search and type filter
  const filteredEntities = useMemo(() => {
    return sampleEntities.filter(entity => {
      const matchesType = filterType === 'all' || entity.type === filterType
      const matchesSearch = !searchQuery || 
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.values(entity.properties || {}).some(v => 
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        )
      return matchesType && matchesSearch
    })
  }, [filterType, searchQuery])

  // Get related entities for selected node
  const relatedEntities = useMemo(() => {
    if (!selectedEntity) return []
    return sampleRelations
      .filter(r => r.source === selectedEntity.id || r.target === selectedEntity.id)
      .map(r => {
        const relatedId = r.source === selectedEntity.id ? r.target : r.source
        return sampleEntities.find(e => e.id === relatedId)
      })
      .filter(Boolean) as GraphEntity[]
  }, [selectedEntity])

  // Calculate graph statistics
  const stats = useMemo(() => ({
    totalNodes: sampleEntities.length,
    totalEdges: sampleRelations.length,
    criticalCount: sampleEntities.filter(e => e.status === 'critical').length,
    highRiskCount: sampleEntities.filter(e => e.riskScore >= 80).length,
    uniqueTypes: new Set(sampleEntities.map(e => e.type)).size,
  }), [])

  const getEntityIcon = (type: GraphEntity['type']) => {
    const config = entityConfig[type]
    const Icon = config?.icon || CircleDot
    return <Icon className="h-4 w-4" />
  }

  const getEntityColor = (type: GraphEntity['type']) => {
    return entityConfig[type]?.color || '#6B7280'
  }

  const getStatusColor = (status: GraphEntity['status']) => {
    switch (status) {
      case 'critical': return 'bg-red-500'
      case 'active': return 'bg-yellow-500'
      case 'investigating': return 'bg-blue-500'
      case 'contained': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <TooltipProvider>
      <Card className="bg-slate-900 border-slate-700 h-full">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Network className="h-5 w-5 text-emerald-500" />
                Security Knowledge Graph
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">Real-time entity relationship mapping</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-600">
                {stats.totalNodes} nodes • {stats.totalEdges} edges
              </Badge>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-700 space-y-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entities..."
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(entityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRelations(!showRelations)}
                className={`bg-slate-800 border-slate-600 ${showRelations ? 'text-emerald-400' : 'text-slate-400'}`}
              >
                <Filter className="h-4 w-4 mr-1" />
                Relations
              </Button>

              <div className="flex items-center gap-1 bg-slate-800 rounded-md px-2 py-1 border border-slate-600">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                  className="text-slate-400 hover:text-white h-7 w-7 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-400 min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                  className="text-slate-400 hover:text-white h-7 w-7 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(entityConfig).slice(0, 6).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-slate-400">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex h-[calc(100vh-380px)]">
            {/* Graph Visualization Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-950 p-4">
              {/* Simplified Graph Representation */}
              <div 
                className="relative w-full h-full"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
              >
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
                }} />

                {/* Entity Nodes - Positioned in a meaningful layout */}
                <div className="relative w-full h-full">
                  {/* Central cluster - Critical entities */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 space-y-8">
                    {/* Row 1: Threat Actor & IOCs */}
                    <div className="flex justify-center gap-24">
                      {sampleEntities.filter(e => ['threat_actor', 'ioc'].includes(e.type)).map((entity) => (
                        <Tooltip key={entity.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedEntity(entity)}
                              className={`relative group p-3 rounded-xl transition-all ${
                                selectedEntity?.id === entity.id
                                  ? 'ring-2 ring-emerald-500 scale-110'
                                  : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: `${getEntityColor(entity.type)}20` }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: getEntityColor(entity.type), color: 'white' }}
                                >
                                  {getEntityIcon(entity.type)}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium text-white max-w-[120px] truncate">{entity.name}</p>
                                  <p className="text-xs text-slate-400">{entityConfig[entity.type].label}</p>
                                </div>
                              </div>
                              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(entity.status)} animate-pulse`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-slate-800 border-slate-600">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{entity.name}</p>
                              <p className="text-xs text-emerald-400">Risk Score: {entity.riskScore}/100</p>
                              <p className="text-xs text-slate-300">Status: {entity.status}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Row 2: Domains & IPs */}
                    <div className="flex justify-center gap-16">
                      {sampleEntities.filter(e => ['domain', 'ip'].includes(e.type)).slice(0, 4).map((entity) => (
                        <Tooltip key={entity.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedEntity(entity)}
                              className={`relative group p-2 rounded-lg transition-all ${
                                selectedEntity?.id === entity.id
                                  ? 'ring-2 ring-emerald-500 scale-110'
                                  : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: `${getEntityColor(entity.type)}20` }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="p-1.5 rounded-md"
                                  style={{ backgroundColor: getEntityColor(entity.type), color: 'white' }}
                                >
                                  {getEntityIcon(entity.type)}
                                </div>
                                <span className="text-xs font-medium text-white max-w-[80px] truncate">{entity.name}</span>
                              </div>
                              <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${getStatusColor(entity.status)}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-slate-800 border-slate-600">
                            <p className="font-medium text-white">{entity.name}</p>
                            <p className="text-xs text-red-400">Risk: {entity.riskScore}/100</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Row 3: Devices & Users (Main actors) */}
                    <div className="flex justify-center gap-12">
                      {sampleEntities.filter(e => ['user', 'device'].includes(e.type)).slice(0, 6).map((entity) => (
                        <Tooltip key={entity.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedEntity(entity)}
                              className={`relative group p-3 rounded-xl transition-all ${
                                selectedEntity?.id === entity.id
                                  ? 'ring-2 ring-emerald-500 scale-110'
                                  : 'hover:scale-105'
                              } ${entity.status === 'critical' ? 'ring-1 ring-red-500/50' : ''}`}
                              style={{ backgroundColor: `${getEntityColor(entity.type)}15` }}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <div
                                  className="p-2.5 rounded-xl"
                                  style={{ 
                                    backgroundColor: `${getEntityColor(entity.type)}`,
                                    color: 'white',
                                    boxShadow: entity.status === 'critical' ? `0 0 20px ${getEntityColor(entity.type)}50` : 'none'
                                  }}
                                >
                                  {getEntityIcon(entity.type)}
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-medium text-white max-w-[80px] truncate">{entity.name.split('@')[0]}</p>
                                  <p className="text-xs text-red-400 font-bold">{entity.riskScore}</p>
                                </div>
                              </div>
                              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(entity.status)} ${entity.status === 'critical' ? 'animate-pulse' : ''}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-slate-800 border-slate-600">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{entity.name}</p>
                              <p className="text-xs text-emerald-400">Risk: {entity.riskScore}/100 • {entity.status}</p>
                              {entity.properties && (
                                <p className="text-xs text-slate-300">{String(entity.properties.department || entity.properties.os || '')}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Row 4: Files, Processes, Vulnerabilities, Incident */}
                    <div className="flex justify-center gap-8 flex-wrap">
                      {sampleEntities.filter(e => ['file', 'process', 'vulnerability', 'incident'].includes(e.type)).map((entity) => (
                        <Tooltip key={entity.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setSelectedEntity(entity)}
                              className={`relative group p-2 rounded-lg transition-all ${
                                selectedEntity?.id === entity.id
                                  ? 'ring-2 ring-emerald-500 scale-110'
                                  : 'hover:scale-105'
                              } ${entity.type === 'incident' ? 'ring-1 ring-red-500/70 animate-pulse' : ''}`}
                              style={{ backgroundColor: `${getEntityColor(entity.type)}20` }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="p-1.5 rounded-md"
                                  style={{ backgroundColor: getEntityColor(entity.type), color: 'white' }}
                                >
                                  {getEntityIcon(entity.type)}
                                </div>
                                <span className="text-xs font-medium text-white max-w-[100px] truncate">{entity.name}</span>
                              </div>
                              <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${getStatusColor(entity.status)}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-slate-800 border-slate-600">
                            <div className="space-y-1">
                              <p className="font-medium text-white">{entity.name}</p>
                              <p className="text-xs text-red-400">Risk: {entity.riskScore}/100</p>
                              {entity.properties && (
                                <p className="text-xs text-slate-300">{Object.entries(entity.properties).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' | ')}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Connection Lines (Visual representation) */}
                  {showRelations && (
                    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
                      {sampleRelations.slice(0, 12).map((relation, idx) => {
                        const source = sampleEntities.find(e => e.id === relation.source)
                        const target = sampleEntities.find(e => e.id === relation.target)
                        if (!source || !target) return null
                        
                        const config = relationConfig[relation.type]
                        
                        return (
                          <line
                            key={idx}
                            x1="50%"
                            y1="50%"
                            x2="50%"
                            y2="50%"
                            stroke={config?.color || '#6B7280'}
                            strokeWidth={Math.max(1, relation.strength / 30)}
                            strokeDasharray={config?.dashArray || ''}
                            opacity={0.4 + (relation.strength / 200)}
                          />
                        )
                      })}
                    </svg>
                  )}
                </div>
              </div>

              {/* Quick Stats Overlay */}
              <div className="absolute top-4 left-4 space-y-2">
                <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Graph Statistics</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Nodes:</span>
                      <span className="text-white font-medium">{stats.totalNodes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Connections:</span>
                      <span className="text-white font-medium">{stats.totalEdges}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Critical:</span>
                      <span className="text-red-400 font-medium">{stats.criticalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">High Risk:</span>
                      <span className="text-yellow-400 font-medium">{stats.highRiskCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Panel */}
            <div className={`w-80 border-l border-slate-700 bg-slate-900 overflow-y-auto transition-all duration-300 ${selectedEntity ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
              {selectedEntity ? (
                <div className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: `${getEntityColor(selectedEntity.type)}20` }}
                      >
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: getEntityColor(selectedEntity.type), color: 'white' }}
                        >
                          {getEntityIcon(selectedEntity.type)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{selectedEntity.name}</h3>
                        <p className="text-sm text-slate-400">{entityConfig[selectedEntity.type].label}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEntity(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </Button>
                  </div>

                  {/* Status & Risk */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      <Badge className={`${getStatusColor(selectedEntity.status)} text-white border-0`}>
                        {selectedEntity.status}
                      </Badge>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Risk Score</p>
                      <p className={`text-lg font-bold ${
                        selectedEntity.riskScore >= 80 ? 'text-red-400' :
                        selectedEntity.riskScore >= 60 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {selectedEntity.riskScore}/100
                      </p>
                    </div>
                  </div>

                  {/* Properties */}
                  {selectedEntity.properties && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white flex items-center gap-2">
                        <Info className="h-4 w-4 text-slate-400" />
                        Properties
                      </h4>
                      <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
                        {Object.entries(selectedEntity.properties).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-2 px-3">
                            <span className="text-sm text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-sm text-white font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Entities */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                      <Network className="h-4 w-4 text-slate-400" />
                      Related Entities ({relatedEntities.length})
                    </h4>
                    <div className="space-y-2">
                      {relatedEntities.slice(0, 5).map((entity) => (
                        <button
                          key={entity.id}
                          onClick={() => setSelectedEntity(entity)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors"
                        >
                          <div
                            className="p-1 rounded"
                            style={{ backgroundColor: getEntityColor(entity.type), color: 'white' }}
                          >
                            {getEntityIcon(entity.type)}
                          </div>
                          <span className="text-sm text-white truncate flex-1 text-left">{entity.name}</span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4 border-t border-slate-700">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                      <MousePointerClick className="h-4 w-4 mr-2" />
                      Investigate Entity
                    </Button>
                    <Button variant="outline" className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                      <Search className="h-4 w-4 mr-2" />
                      Find Connected Paths
                    </Button>
                    <Button variant="outline" className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Pivot to Investigation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-sm">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select an entity to view details</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
