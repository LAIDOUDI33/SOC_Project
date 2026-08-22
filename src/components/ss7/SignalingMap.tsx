'use client';

/**
 * Signaling Map Component (Network Topology Visualizer)
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Interactive STP (Signaling Transfer Point) topology:
 * - Network element visualization
 * - Link status indicators
 * - Route set visualization
 * - Congestion hotspots
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Network, Server, Router, Wifi, AlertTriangle,
  Activity, CheckCircle2, XCircle, Clock,
  ArrowRightLeft, Zap, Signal, Globe,
  RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Info, Layers, Box, Database, Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// Types
interface NetworkElement {
  id: string;
  name: string;
  type: ElementType;
  pointCode: string;
  status: ElementStatus;
  location: Position;
  connections: string[]; // Connected element IDs
  metrics?: ElementMetrics;
}

type ElementType = 
  | 'stp'      // Signaling Transfer Point
  | 'msc'      // Mobile Switching Center
  | 'hlr'      // Home Location Register
  | 'vlr'      // Visitor Location Register
  | 'sgsn'     // Serving GPRS Support Node
  | 'ggsn'     // Gateway GPRS Support Node
  | 'gmsc'     // Gateway MSC
  | 'smsc'     // SMS Center
  | 'scp'      // Service Control Point
  | 'eip'      // Edge IP / SIGTRAN Gateway;

type ElementStatus = 'operational' | 'degraded' | 'congested' | 'failed' | 'maintenance';

interface Position {
  x: number;    // Percentage (0-100)
  y: number;    // Percentage (0-100)
}

interface ElementMetrics {
  messagesPerSecond: number;
  utilization: number;
  errorRate: number;
  activeLinks: number;
  totalLinks: number;
}

interface LinkConnection {
  id: string;
  sourceId: string;
  targetId: string;
  status: LinkStatus;
  load: number;        // 0-100%
  latencyMs: number;
  messageCount: number;
}

type LinkStatus = 'active' | 'congested' | 'failed' | 'standby' | 'blocked';

// Status colors
const ELEMENT_STATUS_CONFIG: Record<ElementStatus, { color: string; bgClass: string; icon: React.ReactNode }> = {
  operational: { color: '#22c55e', bgClass: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
  degraded: { color: '#eab308', bgClass: 'bg-yellow-500', icon: <Clock className="w-4 h-4" /> },
  congested: { color: '#f97316', bgClass: 'bg-orange-500', icon: <AlertTriangle className="w-4 h-4" /> },
  failed: { color: '#ef4444', bgClass: 'bg-red-500', icon: <XCircle className="w-4 h-4" /> },
  maintenance: { color: '#6b7280', bgClass: 'bg-gray-500', icon: <SettingsIcon className="w-4 h-4" /> },
};

const LINK_STATUS_CONFIG: Record<LinkStatus, { color: string; dashArray?: string }> = {
  active: { color: '#22c55e' },
  congested: { color: '#f97316' },
  failed: { color: '#ef4444', dashArray: '5,5' },
  standby: { color: '#6b7280', dashArray: '3,3' },
  blocked: { color: '#dc2626', dashArray: '8,4' },
};

const TYPE_ICONS: Record<ElementType, React.ReactNode> = {
  stp: <Router className="w-5 h-5" />,
  msc: <Server className="w-5 h-5" />,
  hlr: <Database className="w-5 h-5" />,
  vlr: <Database className="w-5 h-5" />,
  sgsn: <Wifi className="w-5 h-5" />,
  ggsn: <Globe className="w-5 h-5" />,
  gmsc: <Phone className="w-5 h-5" />,
  smsc: <Box className="w-5 h-5" />,
  scp: <Layers className="w-5 h-5" />,
  eip: <Zap className="w-5 h-5" />,
};

const TYPE_LABELS: Record<ElementType, string> = {
  stp: 'STP',
  msc: 'MSC',
  hlr: 'HLR',
  vlr: 'VLR',
  sgsn: 'SGSN',
  ggsn: 'GGSN',
  gmsc: 'GMSC',
  smsc: 'SMSC',
  scp: 'SCP',
  eip: 'EIP',
};

// Sample network topology for Djezzy
function generateDjezzyTopology(): { elements: NetworkElement[]; links: LinkConnection[] } {
  const elements: NetworkElement[] = [
    // Primary STP Pair (Algiers)
    { id: 'stp-pri', name: 'STP-Algiers-Pri', type: 'stp', pointCode: '1-001-001', status: 'operational', location: { x: 50, y: 15 }, connections: ['stp-sec', 'hlr-1', 'hlr-2', 'msc-alg', 'msc-oran'], metrics: { messagesPerSecond: 12500, utilization: 45, errorRate: 0.02, activeLinks: 12, totalLinks: 14 } },
    { id: 'stp-sec', name: 'STP-Algiers-Sec', type: 'stp', pointCode: '1-001-002', status: 'operational', location: { x: 65, y: 15 }, connections: ['stp-pri', 'vlr-1', 'sgsn-1'], metrics: { messagesPerSecond: 9800, utilization: 35, errorRate: 0.01, activeLinks: 10, totalLinks: 14 } },
    
    // HLR Pool
    { id: 'hlr-1', name: 'HLR-Algiers-1', type: 'hlr', pointCode: '3-003-001', status: 'operational', location: { x: 25, y: 30 }, connections: ['stp-pri', 'hlr-2'], metrics: { messagesPerSecond: 4500, utilization: 52, errorRate: 0.05, activeLinks: 8, totalLinks: 8 } },
    { id: 'hlr-2', name: 'HLR-Algiers-2', type: 'hlr', pointCode: '3-003-002', status: 'degraded', location: { x: 40, y: 30 }, connections: ['stp-pri', 'hlr-1'], metrics: { messagesPerSecond: 3200, utilization: 78, errorRate: 0.15, activeLinks: 7, totalLinks: 8 } },
    
    // MSCs
    { id: 'msc-alg', name: 'MSC-Algiers', type: 'msc', pointCode: '3-101-001', status: 'operational', location: { x: 20, y: 50 }, connections: ['stp-pri', 'vlr-1', 'gmsc-1'], metrics: { messagesPerSecond: 6700, utilization: 42, errorRate: 0.03, activeLinks: 10, totalLinks: 12 } },
    { id: 'msc-oran', name: 'MSC-Oran', type: 'msc', pointCode: '3-102-001', status: 'operational', location: { x: 80, y: 60 }, connections: ['stp-pri', 'vlr-2'], metrics: { messagesPerSecond: 4200, utilization: 38, errorRate: 0.04, activeLinks: 8, totalLinks: 10 } },
    { id: 'msc-const', name: 'MSC-Constantine', type: 'msc', pointCode: '3-103-001', status: 'congested', location: { x: 75, y: 80 }, connections: ['stp-sec', 'vlr-3'], metrics: { messagesPerSecond: 8900, utilization: 85, errorRate: 0.22, activeLinks: 9, totalLinks: 10 } },
    
    // VLRs
    { id: 'vlr-1', name: 'VLR-Algiers', type: 'vlr', pointCode: '3-201-001', status: 'operational', location: { x: 15, y: 65 }, connections: ['stp-sec', 'msc-alg'], metrics: { messagesPerSecond: 2800, utilization: 33, errorRate: 0.02, activeLinks: 6, totalLinks: 6 } },
    { id: 'vlr-2', name: 'VLR-Oran', type: 'vlr', pointCode: '3-202-001', status: 'operational', location: { x: 85, y: 45 }, connections: ['msc-oran'], metrics: { messagesPerSecond: 1900, utilization: 25, errorRate: 0.01, activeLinks: 5, totalLinks: 6 } },
    { id: 'vlr-3', name: 'VLR-Constantine', type: 'vlr', pointCode: '3-203-001', status: 'degraded', location: { x: 65, y: 90 }, connections: ['msc-const'], metrics: { messagesPerSecond: 3100, utilization: 68, errorRate: 0.18, activeLinks: 5, totalLinks: 6 } },
    
    // SGSN/GGSN
    { id: 'sgsn-1', name: 'SGSN-Central', type: 'sgsn', pointCode: '3-251-001', status: 'operational', location: { x: 50, y: 55 }, connections: ['stp-sec', 'ggsn-1'], metrics: { messagesPerSecond: 3400, utilization: 48, errorRate: 0.06, activeLinks: 7, totalLinks: 8 } },
    { id: 'ggsn-1', name: 'GGSN-Primary', type: 'ggsn', pointCode: '3-271-001', status: 'operational', location: { x: 50, y: 72 }, connections: ['sgsn-1'], metrics: { messagesPerSecond: 2100, utilization: 32, errorRate: 0.02, activeLinks: 4, totalLinks: 4 } },
    
    // GMSC/SMSC/SCP
    { id: 'gmsc-1', name: 'GMSC-Gateway', type: 'gmsc', pointCode: '3-271-001', status: 'operational', location: { x: 35, y: 68 }, connections: ['msc-alg'], metrics: { messagesPerSecond: 1800, utilization: 28, errorRate: 0.01, activeLinks: 4, totalLinks: 4 } },
    { id: 'smsc-1', name: 'SMSC-Djezzy', type: 'smsc', pointCode: '3-291-001', status: 'operational', location: { x: 85, y: 25 }, connections: ['stp-pri'], metrics: { messagesPerSecond: 1500, utilization: 22, errorRate: 0.01, activeLinks: 3, totalLinks: 4 } },
    { id: 'scp-1', name: 'SCP-CAMEL', type: 'scp', pointCode: '3-281-001', status: 'maintenance', location: { x: 10, y: 40 }, connections: [], metrics: { messagesPerSecond: 0, utilization: 0, errorRate: 0, activeLinks: 0, totalLinks: 4 } },
    
    // EIP/SIGTRAN Gateways
    { id: 'eip-1', name: 'EIP-West', type: 'eip', pointCode: '3-300-001', status: 'operational', location: { x: 30, y: 85 }, connections: [], metrics: { messagesPerSecond: 5200, utilization: 55, errorRate: 0.08, activeLinks: 6, totalLinks: 6 } },
    { id: 'eip-2', name: 'EIP-East', type: 'eip', pointCode: '3-300-002', status: 'operational', location: { x: 88, y: 78 }, connections: [], metrics: { messagesPerSecond: 4800, utilization: 48, errorRate: 0.05, activeLinks: 6, totalLinks: 6 } },
  ];

  // Generate links based on connections
  const links: LinkConnection[] = [];
  elements.forEach(el => {
    el.connections.forEach(targetId => {
      if (!links.find(l => (l.sourceId === el.id && l.targetId === targetId) || 
                          (l.sourceId === targetId && l.targetId === el.id))) {
        const target = elements.find(e => e.id === targetId);
        const isCongested = (el.status === 'congested' || target?.status === 'congested');
        
        links.push({
          id: `link-${el.id}-${targetId}`,
          sourceId: el.id,
          targetId,
          status: isCongested ? 'congested' : 'active',
          load: Math.floor(Math.random() * 40) + (isCongested ? 40 : 10),
          latencyMs: Math.floor(Math.random() * 10) + 1,
          messageCount: Math.floor(Math.random() * 5000) + 500,
        });
      }
    });
  });

  return { elements, links };
}

// Main Component
export default function SignalingMap() {
  const [topology, setTopology] = useState<{ elements: NetworkElement[]; links: LinkConnection[] }>({ elements: [], links: [] });
  const [selectedElement, setSelectedElement] = useState<NetworkElement | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkConnection | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    setTopology(generateDjezzyTopology());
  }, []);

  const filteredElements = topology.elements.filter(el => {
    if (filterType !== 'all' && el.type !== filterType) return false;
    if (filterStatus !== 'all' && el.status !== filterStatus) return false;
    return true;
  });

  // Calculate summary stats
  const statusCounts = topology.elements.reduce((acc, el) => {
    acc[el.status] = (acc[el.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalLinks = topology.links.length;
  const activeLinks = topology.links.filter(l => l.status === 'active').length;
  const congestedLinks = topology.links.filter(l => l.status === 'congested').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-cyan-400" />
            Signaling Network Topology
          </h2>
          <p className="text-gray-400 mt-1">Djezzy SS7 Network Infrastructure</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={showLabels ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowLabels(!showLabels)}
          >
            Labels
          </Button>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] bg-slate-800 border-slate-600">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stp">STP</SelectItem>
              <SelectItem value="msc">MSC</SelectItem>
              <SelectItem value="hlr">HLR</SelectItem>
              <SelectItem value="vlr">VLR</SelectItem>
              <SelectItem value="sgsn">SGSN</SelectItem>
              <SelectItem value="ggsn">GGSN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-slate-800 border-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="degraded">Degraded</SelectItem>
              <SelectItem value="congested">Congested</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => setTopology(generateDjezzyTopology())}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStatCard label="Elements" value={topology.elements.length.toString()} color="#3b82f6" />
        <MiniStatCard label="Operational" value={(statusCounts['operational'] || 0).toString()} color="#22c55e" />
        <MiniStatCard label="Degraded" value={(statusCounts['degraded'] || 0).toString()} color="#eab308" />
        <MiniStatCard label="Congested" value={(statusCounts['congested'] || 0).toString()} color="#f97316" />
        <MiniStatCard label="Active Links" value={`${activeLinks}/${totalLinks}`} color="#06b6d4" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Topology Visualization */}
        <Card className="lg:col-span-3 bg-slate-900/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="relative w-full h-[550px] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              {/* SVG-based topology rendering */}
              <svg width="100%" height="100%" viewBox="0 0 400 350" className="absolute inset-0">
                {/* Grid background */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Links */}
                {topology.links.map(link => {
                  const source = topology.elements.find(e => e.id === link.sourceId);
                  const target = topology.elements.find(e => e.id === link.targetId);
                  if (!source || !target) return null;
                  
                  const config = LINK_STATUS_CONFIG[link.status];
                  const isSelected = selectedLink?.id === link.id;
                  
                  return (
                    <g key={link.id} onClick={() => setSelectedLink(link)} style={{ cursor: 'pointer' }}>
                      <line
                        x1={source.location.x * 4}
                        y1={source.location.y * 3.5}
                        x2={target.location.x * 4}
                        y2={target.location.y * 3.5}
                        stroke={config.color}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray={config.dashArray}
                        opacity={isSelected ? 1 : 0.6}
                      />
                    </g>
                  );
                })}

                {/* Elements */}
                {filteredElements.map(element => {
                  const config = ELEMENT_STATUS_CONFIG[element.status];
                  const isSelected = selectedElement?.id === element.id;
                  
                  return (
                    <g key={element.id} onClick={() => setSelectedElement(element)} style={{ cursor: 'pointer' }}>
                      {/* Connection lines to this element are drawn above */}
                      
                      {/* Element circle */}
                      <circle
                        cx={element.location.x * 4}
                        cy={element.location.y * 3.5}
                        r={isSelected ? 18 : 14}
                        fill={config.color}
                        opacity={0.2}
                        stroke={config.color}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      
                      {/* Inner circle with icon area */}
                      <circle
                        cx={element.location.x * 4}
                        cy={element.location.y * 3.5}
                        r={isSelected ? 13 : 10}
                        fill="#0f172a"
                        stroke={config.color}
                        strokeWidth={1}
                      />
                      
                      {/* Label */}
                      {showLabels && (
                        <text
                          x={element.location.x * 4}
                          y={element.location.y * 3.5 + 26}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {element.name.replace('Djezzy-', '').replace('-', '\n')}
                        </text>
                      )}
                      
                      {/* PC code */}
                      {showLabels && (
                        <text
                          x={element.location.x * 4}
                          y={element.location.y * 3.5 + 36}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="7"
                          fontFamily="monospace"
                        >
                          {element.pointCode}
                        </text>
                      )}

                      {/* Status indicator dot */}
                      <circle
                        cx={element.location.x * 4 + 10}
                        cy={element.location.y * 3.5 - 10}
                        r={4}
                        fill={config.color}
                        stroke="#0f172a"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 rounded-lg p-3 border border-slate-700">
                <div className="text-xs text-gray-400 mb-2 font-medium">Legend</div>
                <div className="space-y-1">
                  {Object.entries(ELEMENT_STATUS_CONFIG).map(([status, cfg]) => (
                    <div key={status} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-gray-300 capitalize">{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scale indicator */}
              <div className="absolute top-3 right-3 bg-slate-900/90 rounded px-2 py-1 text-xs text-gray-400 border border-slate-700">
                Algeria National Network
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Panel */}
        <div className="space-y-4">
          {/* Selected Element Details */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Element Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{selectedElement.name}</span>
                    <Badge 
                      variant="outline"
                      className={`${ELEMENT_STATUS_CONFIG[selectedElement.status].bgClass} border-0`}
                    >
                      {selectedElement.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white">{TYPE_LABELS[selectedElement.type]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Point Code:</span>
                      <code className="text-blue-400">{selectedElement.pointCode}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connections:</span>
                      <span className="text-white">{selectedElement.connections.length}</span>
                    </div>
                  </div>

                  {selectedElement.metrics && (
                    <>
                      <div className="border-t border-slate-700 pt-2 mt-2">
                        <div className="text-xs text-gray-400 mb-2">Metrics</div>
                        
                        <div className="space-y-2">
                          <MetricBar 
                            label="MPS" 
                            value={selectedElement.metrics.messagesPerSecond} 
                            max={15000} 
                          />
                          <MetricBar 
                            label="Utilization" 
                            value={selectedElement.metrics.utilization} 
                            max={100} 
                            unit="%"
                          />
                          <MetricBar 
                            label="Error Rate" 
                            value={selectedElement.metrics.errorRate} 
                            max={1} 
                            unit="%"
                            invert
                          />
                          
                          <div className="flex justify-between text-xs mt-2">
                            <span className="text-gray-400">Links:</span>
                            <span className="text-green-400">{selectedElement.metrics.activeLinks}/{selectedElement.metrics.totalLinks}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Click an element to view details
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Link Details */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-green-400" />
                Link Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLink ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-white">{selectedLink.sourceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target:</span>
                    <span className="text-white">{selectedLink.targetId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <Badge variant="outline" className={
                      selectedLink.status === 'active' ? 'text-green-400 border-green-400' :
                      selectedLink.status === 'congested' ? 'text-orange-400 border-orange-400' :
                      'text-red-400 border-red-400'
                    }>
                      {selectedLink.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Load:</span>
                    <span className="text-white">{selectedLink.load}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Latency:</span>
                    <span className="text-white">{selectedLink.latencyMs}ms</span>
                  </div>
                  <Progress value={selectedLink.load} className="h-1 mt-2" />
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Click a link to view details
                </div>
              )}
            </CardContent>
          </Card>

          {/* Congestion Hotspots */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Congestion Hotspots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topology.elements
                  .filter(e => e.status === 'congested')
                  .map(el => (
                    <div 
                      key={el.id} 
                      className="flex items-center justify-between p-2 bg-slate-800/50 rounded cursor-pointer hover:bg-slate-800 transition-colors"
                      onClick={() => setSelectedElement(el)}
                    >
                      <span className="text-xs text-white truncate">{el.name}</span>
                      <span className="text-xs text-orange-400 font-mono">
                        {el.metrics?.utilization}%
                      </span>
                    </div>
                  ))
                }
                
                {topology.elements.filter(e => e.status === 'congested').length === 0 && (
                  <p className="text-xs text-green-400 text-center py-2">No congestion detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function MiniStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function MetricBar({ label, value, max, unit = '', invert = false }: { 
  label: string; 
  value: number; 
  max: number; 
  unit?: string;
  invert?: boolean;
}) {
  const percentage = (value / max) * 100;
  const color = invert ? 
    (percentage > 80 ? '#ef4444' : percentage > 50 ? '#eab308' : '#22c55e') :
    (percentage > 80 ? '#ef4444' : percentage > 50 ? '#eab308' : '#3b82f6');
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{value.toLocaleString()}{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
