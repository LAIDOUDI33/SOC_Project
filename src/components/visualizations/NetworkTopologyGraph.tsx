'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Server,
  Shield,
  Router,
  Smartphone,
  Database,
  Network,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Info,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Node type enumeration for network elements
 */
export type NodeType = 
  | 'hlr'      // Home Location Register
  | 'hss'      // Home Subscriber Server
  | 'stp'      // Signal Transfer Point
  | 'msc'      // Mobile Switching Center
  | 'mgw'      // Media Gateway
  | 'sgsn'     // Serving GPRS Support Node
  | 'ggsn'     // Gateway GPRS Support Node
  | 'pgw'      // PDN Gateway
  | 'mme'      // Mobility Management Entity
  | 'siem'     // Security Information & Event Management
  | 'edr'      // Event Data Recorder
  | 'firewall'
  | 'loadbalancer'
  | 'router'
  | 'endpoint';

/** Node health status */
export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'offline';

/** Status color mapping */
export const STATUS_COLORS: Record<NodeStatus, string> = {
  healthy: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  offline: '#6b7280',
};

/** Node type configuration with icons and labels */
export const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  icon: React.ElementType;
  color: string;
  category: string;
}> = {
  hlr: { label: 'HLR', icon: Database, color: '#8b5cf6', category: 'Core' },
  hss: { label: 'HSS', icon: Database, color: '#a855f7', category: 'Core' },
  stp: { label: 'STP', icon: Network, color: '#06b6d4', category: 'Signaling' },
  msc: { label: 'MSC', icon: Server, color: '#3b82f6', category: 'Switching' },
  mgw: { label: 'MGW', icon: Server, color: '#60a5fa', category: 'Switching' },
  sgsn: { label: 'SGSN', icon: Router, color: '#f59e0b', category: 'Packet' },
  ggsn: { label: 'GGSN', icon: Router, color: '#fbbf24', category: 'Packet' },
  pgw: { label: 'PGW', icon: Router, color: '#fcd34d', category: 'Packet' },
  mme: { label: 'MME', icon: Smartphone, color: '#10b981', category: 'LTE' },
  siem: { label: 'SIEM', icon: Shield, color: '#ef4444', category: 'Security' },
  edr: { label: 'EDR', icon: Activity, color: '#f97316', category: 'Monitoring' },
  firewall: { label: 'Firewall', icon: Shield, color: '#dc2626', category: 'Security' },
  loadbalancer: { label: 'LB', icon: Activity, color: '#0ea5e9', category: 'Infrastructure' },
  router: { label: 'Router', icon: Router, color: '#6366f1', category: 'Network' },
  endpoint: { label: 'Endpoint', icon: Smartphone, color: '#84cc16', category: 'Access' },
};

/** Network node interface */
export interface NetworkNode {
  id: string;
  type: NodeType;
  name: string;
  status: NodeStatus;
  /** Optional metrics to display */
  metrics?: {
    cpu?: number;
    memory?: number;
    connections?: number;
    throughput?: string;
  };
  /** Position (will be auto-calculated if not provided) */
  x?: number;
  y?: number;
}

/** Connection between nodes */
export interface NetworkConnection {
  id: string;
  sourceId: string;
  targetId: string;
  /** Connection type affects line style */
  type?: 'primary' | 'secondary' | 'signaling' | 'data';
  /** Bandwidth or traffic info */
  bandwidth?: string;
  /** Latency in ms */
  latency?: number;
}

/** Sample Djezzy Telecom Network Topology Data */
export const DJEZZY_NETWORK_TOPOLOGY: {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
} = {
  nodes: [
    // Core HLR/HSS Nodes (2)
    { id: 'hlr-1', type: 'hlr', name: 'HLR-Primary', status: 'healthy', metrics: { cpu: 45, memory: 62, connections: 1250 } },
    { id: 'hlr-2', type: 'hss', name: 'HSS-Backup', status: 'healthy', metrics: { cpu: 38, memory: 58, connections: 980 } },
    
    // STP Signaling (3)
    { id: 'stp-1', type: 'stp', name: 'STP-Algiers', status: 'healthy', metrics: { cpu: 52, memory: 71, connections: 4500 } },
    { id: 'stp-2', type: 'stp', name: 'STP-Oran', status: 'warning', metrics: { cpu: 78, memory: 82, connections: 4200 } },
    { id: 'stp-3', type: 'stp', name: 'STP-Constantine', status: 'healthy', metrics: { cpu: 41, memory: 65, connections: 3800 } },
    
    // MSC/MGW Switching (4)
    { id: 'msc-1', type: 'msc', name: 'MSC-West', status: 'healthy', metrics: { cpu: 35, memory: 55, connections: 8900 } },
    { id: 'msc-2', type: 'msc', name: 'MSC-East', status: 'healthy', metrics: { cpu: 42, memory: 60, connections: 9200 } },
    { id: 'mgw-1', type: 'mgw', name: 'MGW-Media-1', status: 'healthy', metrics: { cpu: 28, memory: 45, throughput: '2.4 Gbps' } },
    { id: 'mgw-2', type: 'mgw', name: 'MGW-Media-2', status: 'warning', metrics: { cpu: 72, memory: 78, throughput: '2.1 Gbps' } },
    
    // SGSN/GGSN/PGW Packet Core (3)
    { id: 'sgsn-1', type: 'sgsn', name: 'SGSN-1', status: 'healthy', metrics: { cpu: 48, memory: 68, connections: 15000 } },
    { id: 'ggsn-1', type: 'ggsn', name: 'GGSN-1', status: 'healthy', metrics: { cpu: 39, memory: 62, connections: 12000 } },
    { id: 'pgw-1', type: 'pgw', name: 'PGW-LTE', status: 'critical', metrics: { cpu: 92, memory: 94, connections: 18000 } },
    
    // MME LTE (2)
    { id: 'mme-1', type: 'mme', name: 'MME-Primary', status: 'healthy', metrics: { cpu: 44, memory: 59, connections: 8500 } },
    { id: 'mme-2', type: 'mme', name: 'MME-Secondary', status: 'healthy', metrics: { cpu: 40, memory: 56, connections: 7200 } },
    
    // Security & Monitoring
    { id: 'siem-1', type: 'siem', name: 'SIEM-SOC', status: 'healthy', metrics: { cpu: 55, memory: 73, connections: 450 } },
    { id: 'edr-1', type: 'edr', name: 'EDR-Collector', status: 'healthy', metrics: { cpu: 32, memory: 48, throughput: '850 Mbps' } },
    
    // Infrastructure
    { id: 'fw-1', type: 'firewall', name: 'FW-Perimeter', status: 'healthy', metrics: { cpu: 25, memory: 38, throughput: '10 Gbps' } },
    { id: 'lb-1', type: 'loadbalancer', name: 'LB-Internal', status: 'healthy', metrics: { cpu: 18, memory: 28, connections: 25000 } },
  ],
  connections: [
    // HLR/HSS to STPs
    { id: 'c1', sourceId: 'hlr-1', targetId: 'stp-1', type: 'signaling', bandwidth: '10 Gbps', latency: 2 },
    { id: 'c2', sourceId: 'hlr-1', targetId: 'stp-2', type: 'signaling', bandwidth: '10 Gbps', latency: 3 },
    { id: 'c3', sourceId: 'hlr-2', targetId: 'stp-3', type: 'signaling', bandwidth: '10 Gbps', latency: 2 },
    
    // STP interconnections
    { id: 'c4', sourceId: 'stp-1', targetId: 'stp-2', type: 'signaling', bandwidth: '40 Gbps', latency: 1 },
    { id: 'c5', sourceId: 'stp-2', targetId: 'stp-3', type: 'signaling', bandwidth: '40 Gbps', latency: 2 },
    
    // STP to MSCs
    { id: 'c6', sourceId: 'stp-1', targetId: 'msc-1', type: 'signaling', bandwidth: '10 Gbps', latency: 1 },
    { id: 'c7', sourceId: 'stp-2', targetId: 'msc-2', type: 'signaling', bandwidth: '10 Gbps', latency: 2 },
    
    // MSC to MGW
    { id: 'c8', sourceId: 'msc-1', targetId: 'mgw-1', type: 'data', bandwidth: '20 Gbps', latency: 1 },
    { id: 'c9', sourceId: 'msc-2', targetId: 'mgw-2', type: 'data', bandwidth: '20 Gbps', latency: 1 },
    
    // Packet core interconnections
    { id: 'c10', sourceId: 'sgsn-1', targetId: 'ggsn-1', type: 'data', bandwidth: '40 Gbps', latency: 2 },
    { id: 'c11', sourceId: 'ggsn-1', targetId: 'pgw-1', type: 'data', bandwidth: '40 Gbps', latency: 1 },
    
    // MME connections
    { id: 'c12', sourceId: 'mme-1', targetId: 'sgsn-1', type: 'signaling', bandwidth: '10 Gbps', latency: 1 },
    { id: 'c13', sourceId: 'mme-2', targetId: 'pgw-1', type: 'signaling', bandwidth: '10 Gbps', latency: 2 },
    
    // Security infrastructure
    { id: 'c14', sourceId: 'fw-1', targetId: 'lb-1', type: 'primary', bandwidth: '40 Gbps', latency: 0 },
    { id: 'c15', sourceId: 'lb-1', targetId: 'siem-1', type: 'data', bandwidth: '10 Gbps', latency: 1 },
    { id: 'c16', sourceId: 'siem-1', targetId: 'edr-1', type: 'data', bandwidth: '5 Gbps', latency: 1 },
    
    // Cross-domain connections
    { id: 'c17', sourceId: 'fw-1', targetId: 'stp-1', type: 'primary', bandwidth: '10 Gbps', latency: 2 },
    { id: 'c18', sourceId: 'lb-1', targetId: 'mme-1', type: 'data', bandwidth: '20 Gbps', latency: 1 },
  ],
};

export interface NetworkTopologyGraphProps {
  /** Network nodes to display */
  nodes?: NetworkNode[];
  /** Connections between nodes */
  connections?: NetworkConnection[];
  /** Callback when a node is clicked */
  onNodeClick?: (node: NetworkNode) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show legend (default: true) */
  showLegend?: boolean;
  /** Enable zoom and pan (default: true) */
  enableZoomPan?: boolean;
  /** Width of the graph container (default: 100%) */
  width?: number | string;
  /** Height of the graph container (default: 500) */
  height?: number;
}

/**
 * NetworkTopologyGraph - Interactive network topology visualization
 * 
 * Features:
 * - Displays telecom network nodes (servers, firewalls, routers, etc.)
 * - Animated connection lines with data flow indication
 * - Status indicators on each node
 * - Click-to-inspect node details popup
 * - Zoom and pan support
 * - Auto-layout algorithm for positioning
 * - SVG rendering for crisp display
 * - Djezzy telecom sample data included
 * 
 * @example
 * ```tsx
 * <NetworkTopologyGraph
 *   nodes={networkData.nodes}
 *   connections={networkData.connections}
 *   onNodeClick={(node) => console.log('Selected:', node)}
 * />
 * ```
 */
export function NetworkTopologyGraph({
  nodes = DJEZZY_NETWORK_TOPOLOGY.nodes,
  connections = DJEZZY_NETWORK_TOPOLOGY.connections,
  onNodeClick,
  className,
  showLegend = true,
  enableZoomPan = true,
  width = '100%',
  height = 500,
}: NetworkTopologyGraphProps) {
  // State management
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Auto-layout algorithm using force-directed positioning
   * Groups nodes by category and positions them in clusters
   */
  const layoutNodes = useMemo(() => {
    const padding = 80;
    const graphWidth = typeof width === 'number' ? width : 900;
    const graphHeight = height;
    
    // Define cluster centers based on node categories
    const clusterCenters: Record<string, { x: number; y: number }> = {
      'Core': { x: graphWidth * 0.15, y: graphHeight * 0.25 },
      'Signaling': { x: graphWidth * 0.4, y: graphHeight * 0.2 },
      'Switching': { x: graphWidth * 0.65, y: graphHeight * 0.25 },
      'Packet': { x: graphWidth * 0.85, y: graphHeight * 0.25 },
      'LTE': { x: graphWidth * 0.85, y: graphHeight * 0.55 },
      'Security': { x: graphWidth * 0.15, y: graphHeight * 0.7 },
      'Monitoring': { x: graphWidth * 0.4, y: graphHeight * 0.75 },
      'Infrastructure': { x: graphWidth * 0.5, y: graphHeight * 0.5 },
      'Network': { x: graphWidth * 0.65, y: graphHeight * 0.7 },
      'Access': { x: graphWidth * 0.85, y: graphHeight * 0.85 },
    };

    // Group nodes by category
    const categoryGroups: Record<string, NetworkNode[]> = {};
    nodes.forEach((node) => {
      const config = NODE_TYPE_CONFIG[node.type];
      const category = config?.category || 'Other';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(node);
    });

    // Position nodes within their clusters
    const positionedNodes: (NetworkNode & { x: number; y: number })[] = [];
    
    Object.entries(categoryGroups).forEach(([category, groupNodes]) => {
      const center = clusterCenters[category] || { x: graphWidth / 2, y: graphHeight / 2 };
      const clusterRadius = Math.min(80, 150 / Math.sqrt(groupNodes.length));
      
      groupNodes.forEach((node, index) => {
        // Arrange in circle around cluster center
        const angle = (2 * Math.PI * index) / groupNodes.length - Math.PI / 2;
        const offsetX = index === 0 ? 0 : Math.cos(angle) * clusterRadius;
        const offsetY = index === 0 ? 0 : Math.sin(angle) * clusterRadius;
        
        positionedNodes.push({
          ...node,
          x: Math.max(padding, Math.min(graphWidth - padding, center.x + offsetX)),
          y: Math.max(padding, Math.min(graphHeight - padding, center.y + offsetY)),
        });
      });
    });

    return positionedNodes;
  }, [nodes, width, height]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      setSelectedNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.2, 3)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.2, 0.5)), []);
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enableZoomPan) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [enableZoomPan, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !enableZoomPan) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, enableZoomPan, dragStart]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Get status icon component
  const getStatusIcon = (status: NodeStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-3 h-3" style={{ color: STATUS_COLORS.healthy }} />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3" style={{ color: STATUS_COLORS.warning }} />;
      case 'critical':
        return <XCircle className="w-3 h-3" style={{ color: STATUS_COLORS.critical }} />;
      case 'offline':
        return <XCircle className="w-3 h-3" style={{ color: STATUS_COLORS.offline }} />;
    }
  };

  // Get connection line style
  const getConnectionStyle = (type: NetworkConnection['type']) => {
    switch (type) {
      case 'primary':
        return { stroke: '#3b82f6', strokeWidth: 3, strokeDasharray: 'none' };
      case 'signaling':
        return { stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '8 4' };
      case 'data':
        return { stroke: '#06b6d4', strokeWidth: 2, strokeDasharray: 'none' };
      default:
        return { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' };
    }
  };

  // Count nodes by status for summary
  const statusCounts = useMemo(() => {
    const counts: Record<NodeStatus, number> = { healthy: 0, warning: 0, critical: 0, offline: 0 };
    nodes.forEach((node) => counts[node.status]++);
    return counts;
  }, [nodes]);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="w-5 h-5 text-blue-400" />
              Network Topology - Djezzy Telecom Infrastructure
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Status summary badges */}
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {statusCounts.healthy}
              </Badge>
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {statusCounts.warning}
              </Badge>
              <Badge variant="outline" className="text-red-400 border-red-500/30">
                <XCircle className="w-3 h-3 mr-1" />
                {statusCounts.critical}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 relative">
          {/* Controls overlay */}
          {enableZoomPan && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-slate-900/90 rounded-lg p-1 border border-slate-700">
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                aria-label="Reset view"
              >
                <Maximize2 className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className={cn(
              'bg-slate-950/50 cursor-grab',
              isDragging && 'cursor-grabbing'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Transform group for zoom/pan */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Definitions */}
              <defs>
                {/* Animated dash pattern for data flow */}
                <pattern id={`grid-${Math.random()}`} width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                
                {/* Glow filter for nodes */}
                <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker for directed edges */}
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                </marker>
              </defs>

              {/* Grid background */}
              <rect width="100%" height="100%" fill={`url(#grid-${Math.random().toString().slice(2)})`} />

              {/* Connection lines */}
              {connections.map((conn) => {
                const source = layoutNodes.find((n) => n.id === conn.sourceId);
                const target = layoutNodes.find((n) => n.id === conn.targetId);
                if (!source || !target) return null;

                const style = getConnectionStyle(conn.type);
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;

                return (
                  <g key={conn.id}>
                    {/* Main connection line */}
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      {...style}
                      opacity={0.7}
                    />
                    
                    {/* Animated pulse along connection */}
                    {(conn.type === 'data' || conn.type === 'signaling') && (
                      <circle r="3" fill={style.stroke} opacity={0.8}>
                        <animateMotion
                          dur={`${2 + Math.random() * 2}s`}
                          repeatCount="indefinite"
                          path={`M${source.x},${source.y} L${target.x},${target.y}`}
                        />
                      </circle>
                    )}

                    {/* Bandwidth label */}
                    {conn.bandwidth && (
                      <text
                        x={midX}
                        y={midY - 8}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-500 font-mono"
                      >
                        {conn.bandwidth}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {layoutNodes.map((node) => {
                const config = NODE_TYPE_CONFIG[node.type];
                const IconComponent = config?.icon || Server;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g key={node.id}>
                    {/* Outer glow ring for critical/warning nodes */}
                    {(node.status === 'critical' || node.status === 'warning') && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={32}
                        fill="none"
                        stroke={STATUS_COLORS[node.status]}
                        strokeWidth={1}
                        opacity={0.3}
                      >
                        <animate
                          attributeName="r"
                          values="32;38;32"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.3;0.1;0.3"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* Node container */}
                    <g
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer"
                      style={{ filter: isSelected ? 'url(#node-glow)' : undefined }}
                    >
                      {/* Node background circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={28}
                        fill="#0f172a"
                        stroke={config?.color || '#64748b'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all duration-200 hover:brightness-125"
                      />

                      {/* Status indicator dot */}
                      <circle
                        cx={node.x + 20}
                        cy={node.y - 20}
                        r={6}
                        fill={STATUS_COLORS[node.status]}
                        stroke="#0f172a"
                        strokeWidth={2}
                      />

                      {/* Node icon */}
                      <foreignObject
                        x={node.x - 14}
                        y={node.y - 14}
                        width={28}
                        height={28}
                      >
                        <div className="flex items-center justify-center w-full h-full">
                          <IconComponent
                            className="w-5 h-5"
                            style={{ color: config?.color || '#94a3b8' }}
                          />
                        </div>
                      </foreignObject>
                    </g>

                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + 45}
                      textAnchor="middle"
                      className="text-[11px] fill-slate-300 font-medium"
                    >
                      {node.name}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 58}
                      textAnchor="middle"
                      className="text-[9px] fill-slate-500 uppercase tracking-wider"
                    >
                      {config?.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-3 left-3 bg-slate-900/95 rounded-lg p-3 border border-slate-700 z-10">
              <p className="text-xs font-semibold text-slate-300 mb-2">Node Types</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(NODE_TYPE_CONFIG).slice(0, 8).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-[10px] text-slate-400">{config.label}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs font-semibold text-slate-300 mt-3 mb-1.5">Connection Types</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-blue-500" />
                  <span className="text-[10px] text-slate-400">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-purple-500" style={{ backgroundImage: 'linear-gradient(to right, #8b5cf6 50%, transparent 50%)', backgroundSize: '8px' }} />
                  <span className="text-[10px] text-slate-400">Signaling</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-cyan-500" />
                  <span className="text-[10px] text-slate-400">Data</span>
                </div>
              </div>
            </div>
          )}

          {/* Node Details Popup */}
          {selectedNode && (
            <div className="absolute top-3 left-3 w-72 bg-slate-900/98 rounded-xl border border-slate-700 shadow-2xl z-30 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = NODE_TYPE_CONFIG[selectedNode.type]?.icon || Server;
                    return (
                      <IconComponent
                        className="w-5 h-5"
                        style={{ color: NODE_TYPE_CONFIG[selectedNode.type]?.color }}
                      />
                    );
                  })()}
                  <div>
                    <p className="font-semibold text-slate-200">{selectedNode.name}</p>
                    <p className="text-xs text-slate-500">{NODE_TYPE_CONFIG[selectedNode.type]?.label}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              <div className="p-4 space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      selectedNode.status === 'healthy'
                        ? 'border-green-500/50 text-green-400'
                        : selectedNode.status === 'warning'
                        ? 'border-yellow-500/50 text-yellow-400'
                        : selectedNode.status === 'critical'
                        ? 'border-red-500/50 text-red-400'
                        : 'border-gray-500/50 text-gray-400'
                    }
                  >
                    {getStatusIcon(selectedNode.status)}
                    {selectedNode.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Metrics */}
                {selectedNode.metrics && (
                  <>
                    {selectedNode.metrics.cpu !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">CPU</span>
                        <span className={cn(
                          'text-sm font-medium',
                          selectedNode.metrics.cpu > 80 ? 'text-red-400' :
                          selectedNode.metrics.cpu > 60 ? 'text-yellow-400' : 'text-green-400'
                        )}>
                          {selectedNode.metrics.cpu}%
                        </span>
                      </div>
                    )}
                    {selectedNode.metrics.memory !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Memory</span>
                        <span className={cn(
                          'text-sm font-medium',
                          selectedNode.metrics.memory > 80 ? 'text-red-400' :
                          selectedNode.metrics.memory > 60 ? 'text-yellow-400' : 'text-green-400'
                        )}>
                          {selectedNode.metrics.memory}%
                        </span>
                      </div>
                    )}
                    {selectedNode.metrics.connections !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Connections</span>
                        <span className="text-sm font-medium text-slate-300">
                          {selectedNode.metrics.connections.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedNode.metrics.throughput && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Throughput</span>
                        <span className="text-sm font-medium text-cyan-400">
                          {selectedNode.metrics.throughput}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <button
                  onClick={() => {
                    onNodeClick?.(selectedNode);
                    setSelectedNode(null);
                  }}
                  className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Named export for barrel file
export default NetworkTopologyGraph;
