'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Server,
  Wifi,
  Router,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Phone,
  Radio,
  Cloud,
  Lock,
  Network,
  Satellite,
  Zap,
  Info,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type NodeStatus = 'operational' | 'degraded' | 'down' | 'maintenance' | 'unknown';
export type NodeType = 
  | 'core-router' 
  | 'edge-router' 
  | 'switch' 
  | 'firewall' 
  | 'server' 
  | 'database'
  | 'siem'
  | 'ss7-node'
  | 'hlr'
  | 'probe'
  | 'cloud'
  | 'endpoint';

interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  position: { x: number; y: number }; // Percentage position (0-100)
  metrics?: {
    cpu?: number;
    memory?: number;
    latency?: number;
    throughput?: number;
    connections?: number;
  };
  details?: string;
  lastUpdate?: Date;
}

interface NetworkLink {
  id: string;
  source: string;
  target: string;
  bandwidth: string;
  status: NodeStatus;
  latency?: number;
  utilization?: number;
}

interface NetworkTopologyProps {
  /** Array of network nodes to display */
  nodes?: NetworkNode[];
  /** Array of links between nodes */
  links?: NetworkLink[];
  /** Callback when a node is clicked */
  onNodeClick?: (node: NetworkNode) => void;
  /** Callback when a link is clicked */
  onLinkClick?: (link: NetworkLink) => void;
  /** Enable real-time simulation mode */
  simulateRealTime?: boolean;
  /** Show node details panel */
  showDetailsPanel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

/** Node type configuration with icons and colors */
const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  icon: React.ElementType;
  color: string;
  size: number;
}> = {
  'core-router': { label: 'Core Router', icon: Router, color: '#3b82f6', size: 40 },
  'edge-router': { label: 'Edge Router', icon: Router, color: '#60a5fa', size: 32 },
  'switch': { label: 'Switch', icon: Network, color: '#8b5cf6', size: 28 },
  'firewall': { label: 'Firewall', icon: Shield, color: '#ef4444', size: 36 },
  'server': { label: 'Server', icon: Server, color: '#22c55e', size: 32 },
  'database': { label: 'Database', icon: Database, color: '#f97316', size: 34 },
  'siem': { label: 'SIEM', icon: Shield, color: '#06b6d4', size: 38 },
  'ss7-node': { label: 'SS7 Node', icon: Radio, color: '#a855f7', size: 34 },
  'hlr': { label: 'HLR', icon: Database, color: '#eab308', size: 30 },
  'probe': { label: 'Probe', icon: Satellite, color: '#14b8a6', size: 24 },
  'cloud': { label: 'Cloud', icon: Cloud, color: '#64748b', size: 44 },
  'endpoint': { label: 'Endpoint', icon: Zap, size: 20, color: '#94a3b8' },
};

/** Status configuration */
const STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  color: string;
  bgColor: string;
  pulseColor: string;
  icon: React.ElementType;
}> = {
  operational: {
    label: 'Operational',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    pulseColor: '#22c55e',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Degraded',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    pulseColor: '#eab308',
    icon: AlertTriangle,
  },
  down: {
    label: 'Down',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    pulseColor: '#ef4444',
    icon: XCircle,
  },
  maintenance: {
    label: 'Maintenance',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    pulseColor: '#3b82f6',
    icon: Activity,
  },
  unknown: {
    label: 'Unknown',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    pulseColor: '#64748b',
    icon: Info,
  },
};

// ============================================================
// SAMPLE DATA - Djezzy Telecom Infrastructure
// ============================================================

/** Generate sample Djezzy network topology data */
export const generateDjezzyTopology = (): { nodes: NetworkNode[]; links: NetworkLink[] } => {
  const nodes: NetworkNode[] = [
    // Core Infrastructure
    {
      id: 'core-1',
      name: 'Core Router Algiers',
      type: 'core-router',
      status: 'operational',
      position: { x: 50, y: 45 },
      metrics: { cpu: 45, memory: 62, latency: 2, throughput: 9800, connections: 1247 },
      details: 'Primary backbone router - handles inter-wilaya traffic',
      lastUpdate: new Date(),
    },
    {
      id: 'core-2',
      name: 'Core Router Oran',
      type: 'core-router',
      status: 'operational',
      position: { x: 22, y: 58 },
      metrics: { cpu: 38, memory: 55, latency: 3, throughput: 7200, connections: 892 },
      details: 'Western region core router',
      lastUpdate: new Date(),
    },
    {
      id: 'core-3',
      name: 'Core Router Constantine',
      type: 'core-router',
      status: 'degraded',
      position: { x: 72, y: 35 },
      metrics: { cpu: 78, memory: 82, latency: 15, throughput: 4500, connections: 654 },
      details: 'Eastern region core router - elevated CPU detected',
      lastUpdate: new Date(),
    },

    // SS7 / Signaling
    {
      id: 'ss7-1',
      name: 'SS7 STP Primary',
      type: 'ss7-node',
      status: 'operational',
      position: { x: 45, y: 55 },
      metrics: { cpu: 32, memory: 48, latency: 5, connections: 234 },
      details: 'Primary Signal Transfer Point for SS7 network',
      lastUpdate: new Date(),
    },
    {
      id: 'ss7-2',
      name: 'SS7 STP Secondary',
      type: 'ss7-node',
      status: 'operational',
      position: { x: 55, y: 35 },
      metrics: { cpu: 28, memory: 42, latency: 4, connections: 198 },
      details: 'Secondary/backup Signal Transfer Point',
      lastUpdate: new Date(),
    },
    {
      id: 'hlr-1',
      name: 'HLR Primary',
      type: 'hlr',
      status: 'operational',
      position: { x: 40, y: 40 },
      metrics: { cpu: 52, memory: 68, latency: 8, connections: 156 },
      details: 'Home Location Register - subscriber database',
      lastUpdate: new Date(),
    },

    // Security Infrastructure
    {
      id: 'siem-1',
      name: 'Wazuh SIEM Cluster',
      type: 'siem',
      status: 'operational',
      position: { x: 60, y: 60 },
      metrics: { cpu: 42, memory: 74, latency: 12, connections: 89 },
      details: 'Central SIEM platform - security event correlation',
      lastUpdate: new Date(),
    },
    {
      id: 'fw-1',
      name: 'Perimeter Firewall',
      type: 'firewall',
      status: 'operational',
      position: { x: 50, y: 15 },
      metrics: { cpu: 25, memory: 45, latency: 1, throughput: 8500, connections: 567 },
      details: 'Internet edge firewall - Palo Alto PA-5260',
      lastUpdate: new Date(),
    },
    {
      id: 'fw-2',
      name: 'Internal Firewall',
      type: 'firewall',
      status: 'operational',
      position: { x: 35, y: 70 },
      metrics: { cpu: 18, memory: 35, latency: 1, throughput: 5200, connections: 423 },
      details: 'Internal segmentation firewall',
      lastUpdate: new Date(),
    },

    // Data Center
    {
      id: 'db-1',
      name: 'Primary DB Cluster',
      type: 'database',
      status: 'operational',
      position: { x: 30, y: 50 },
      metrics: { cpu: 58, memory: 78, latency: 3, connections: 234 },
      details: 'PostgreSQL cluster - CDRs, billing, subscriber data',
      lastUpdate: new Date(),
    },
    {
      id: 'srv-1',
      name: 'App Server Farm',
      type: 'server',
      status: 'operational',
      position: { x: 65, y: 48 },
      metrics: { cpu: 48, memory: 65, latency: 5, connections: 567 },
      details: 'Kubernetes cluster - microservices platform',
      lastUpdate: new Date(),
    },

    // Edge / Regional
    {
      id: 'edge-1',
      name: 'Edge Router Annaba',
      type: 'edge-router',
      status: 'operational',
      position: { x: 82, y: 52 },
      metrics: { cpu: 28, memory: 42, latency: 4, throughput: 2800, connections: 234 },
      details: 'Annaba regional edge router',
      lastUpdate: new Date(),
    },
    {
      id: 'edge-2',
      name: 'Edge Router Tlemcen',
      type: 'edge-router',
      status: 'maintenance',
      position: { x: 10, y: 48 },
      metrics: { cpu: 0, memory: 0, latency: 0, throughput: 0, connections: 0 },
      details: 'Scheduled maintenance window',
      lastUpdate: new Date(),
    },

    // Probes & Sensors
    {
      id: 'probe-1',
      name: 'IDS Sensor DC1',
      type: 'probe',
      status: 'operational',
      position: { x: 42, y: 58 },
      metrics: { cpu: 15, memory: 28, latency: 2 },
      details: 'Suricata IDS sensor - data center 1',
      lastUpdate: new Date(),
    },
    {
      id: 'probe-2',
      name: 'NetFlow Collector',
      type: 'probe',
      status: 'operational',
      position: { x: 58, y: 42 },
      metrics: { cpu: 22, memory: 38, latency: 3 },
      details: 'nProbe NetFlow collector',
      lastUpdate: new Date(),
    },

    // Cloud Connectivity
    {
      id: 'cloud-1',
      name: 'Azure ExpressRoute',
      type: 'cloud',
      status: 'operational',
      position: { x: 85, y: 20 },
      metrics: { latency: 18, throughput: 10000, connections: 45 },
      details: 'Microsoft Azure hybrid connectivity',
      lastUpdate: new Date(),
    },
    {
      id: 'cloud-2',
      name: 'AWS Direct Connect',
      type: 'cloud',
      status: 'degraded',
      position: { x: 15, y: 20 },
      metrics: { latency: 45, throughput: 3500, connections: 23 },
      details: 'AWS backup link - elevated latency',
      lastUpdate: new Date(),
    },
  ];

  const links: NetworkLink[] = [
    // Core to Core
    { id: 'l1', source: 'core-1', target: 'core-2', bandwidth: '10 Gbps', status: 'operational', latency: 3, utilization: 45 },
    { id: 'l2', source: 'core-1', target: 'core-3', bandwidth: '10 Gbps', status: 'degraded', latency: 12, utilization: 78 },
    { id: 'l3', source: 'core-2', target: 'core-3', bandwidth: '10 Gbps', status: 'operational', latency: 8, utilization: 32 },

    // Core to SS7
    { id: 'l4', source: 'core-1', target: 'ss7-1', bandwidth: '1 Gbps', status: 'operational', latency: 2, utilization: 25 },
    { id: 'l5', source: 'core-1', target: 'ss7-2', bandwidth: '1 Gbps', status: 'operational', latency: 2, utilization: 22 },
    { id: 'l6', source: 'ss7-1', target: 'hlr-1', bandwidth: '100 Mbps', status: 'operational', latency: 1, utilization: 35 },

    // Core to Security
    { id: 'l7', source: 'fw-1', target: 'core-1', bandwidth: '10 Gbps', status: 'operational', latency: 1, utilization: 55 },
    { id: 'l8', source: 'fw-2', target: 'core-1', bandwidth: '10 Gbps', status: 'operational', latency: 1, utilization: 42 },
    { id: 'l9', source: 'siem-1', target: 'core-1', bandwidth: '1 Gbps', status: 'operational', latency: 3, utilization: 28 },

    // Core to Data Center
    { id: 'l10', source: 'db-1', target: 'core-1', bandwidth: '10 Gbps', status: 'operational', latency: 2, utilization: 48 },
    { id: 'l11', source: 'srv-1', target: 'core-1', bandwidth: '10 Gbps', status: 'operational', latency: 2, utilization: 52 },

    // Core to Edge
    { id: 'l12', source: 'core-2', target: 'edge-2', bandwidth: '1 Gbps', status: 'down', latency: 0, utilization: 0 },
    { id: 'l13', source: 'core-3', target: 'edge-1', bandwidth: '1 Gbps', status: 'operational', latency: 4, utilization: 38 },

    // Probe connections
    { id: 'l14', source: 'probe-1', target: 'core-1', bandwidth: '100 Mbps', status: 'operational', latency: 1, utilization: 15 },
    { id: 'l15', source: 'probe-2', target: 'core-1', bandwidth: '100 Mbps', status: 'operational', latency: 1, utilization: 18 },

    // Cloud connections
    { id: 'l16', source: 'fw-1', target: 'cloud-1', bandwidth: '10 Gbps', status: 'operational', latency: 18, utilization: 35 },
    { id: 'l17', source: 'fw-1', target: 'cloud-2', bandwidth: '5 Gbps', status: 'degraded', latency: 45, utilization: 72 },
  ];

  return { nodes, links };
};

// ============================================================
// COMPONENTS
// ============================================================

/**
 * NetworkTopology - Interactive network infrastructure visualization
 *
 * Features:
 * - SVG-based rendering of network nodes and links
 * - Real-time status updates with animations
 * - Interactive nodes with detailed tooltips
 * - Click-to-select functionality
 * - Auto-layout or manual positioning
 * - Status filtering
 * - Responsive design
 *
 * @example
 * ```tsx
 * <NetworkTopology
 *   simulateRealTime={true}
 *   onNodeClick={(node) => console.log('Selected:', node)}
 * />
 * ```
 */
export function NetworkTopology({
  nodes: initialNodes,
  links: initialLinks,
  onNodeClick,
  onLinkClick,
  simulateRealTime = true,
  showDetailsPanel = true,
  className,
}: NetworkTopologyProps) {
  // State management
  const [nodes, setNodes] = useState<NetworkNode[]>(
    initialNodes || generateDjezzyTopology().nodes
  );
  const [links] = useState<NetworkLink[]>(
    initialLinks || generateDjezzyTopology().links
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter nodes by status
  const filteredNodes = useMemo(() => {
    if (statusFilter === 'all') return nodes;
    return nodes.filter((node) => node.status === statusFilter);
  }, [nodes, statusFilter]);

  // Get selected/hovered node objects
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );
  const hoveredNode = useMemo(
    () => nodes.find((n) => n.id === hoveredNodeId) || null,
    [nodes, hoveredNodeId]
  );

  // Simulate real-time metric changes
  useEffect(() => {
    if (!simulateRealTime) return;

    const interval = setInterval(() => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          metrics: node.metrics
            ? {
                ...node.metrics,
                cpu: Math.min(100, Math.max(0, node.metrics.cpu! + (Math.random() - 0.5) * 5)),
                memory: Math.min(100, Math.max(0, node.metrics.memory! + (Math.random() - 0.5) * 3)),
                latency: Math.max(0, node.metrics.latency! + (Math.random() - 0.5) * 2),
              }
            : undefined,
          lastUpdate: new Date(),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [simulateRealTime]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
      onNodeClick?.(node);
    },
    [selectedNodeId, onNodeClick]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = nodes.length;
    const operational = nodes.filter((n) => n.status === 'operational').length;
    const degraded = nodes.filter((n) => n.status === 'degraded').length;
    const down = nodes.filter((n) => n.status === 'down').length;
    const maintenance = nodes.filter((n) => n.status === 'maintenance').length;

    return { total, operational, degraded, down, maintenance };
  }, [nodes]);

  return (
    <TooltipProvider delayDuration={150}>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-5 w-5 text-blue-400" />
              Network Topology - Djezzy Infrastructure
            </CardTitle>

            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 bg-slate-800 border-slate-600 text-xs">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nodes</SelectItem>
                  <SelectItem value="operational">
                    Operational ({stats.operational})
                  </SelectItem>
                  <SelectItem value="degraded">Degraded ({stats.degraded})</SelectItem>
                  <SelectItem value="down">Down ({stats.down})</SelectItem>
                  <SelectItem value="maintenance">
                    Maintenance ({stats.maintenance})
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={() =>
                  setNodes(generateDjezzyTopology().nodes)
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() =>
                  setStatusFilter(statusFilter === status ? 'all' : status)
                }
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors',
                  statusFilter === status
                    ? 'ring-2 ring-offset-2 ring-offset-slate-900'
                    : 'opacity-70 hover:opacity-100'
                )}
                style={{
                  backgroundColor: `${config.pulseColor}20`,
                  borderColor: config.pulseColor,
                  ...(statusFilter === status && { '--tw-ring-color': config.pulseColor }),
                }}
              >
                <config.icon className="h-3 w-3" style={{ color: config.color }} />
                <span style={{ color: config.color }}>{config.label}</span>
                <span className="text-slate-300 ml-1">
                  (
                  {status === 'operational'
                    ? stats.operational
                    : status === 'degraded'
                    ? stats.degraded
                    : status === 'down'
                    ? stats.down
                    : stats.maintenance}
                  )
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 relative">
          {/* SVG Topology Canvas */}
          <div
            className={cn(
              'relative bg-slate-950/50 overflow-hidden',
              isFullscreen ? 'h-[700px]' : 'h-[500px]'
            )}
          >
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Gradient background */}
                <linearGradient id="topology-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Glow filter for active elements */}
                <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrow marker for directed links */}
                <marker
                  id="arrowhead"
                  markerWidth="3"
                  markerHeight="3"
                  refX="3"
                  refY="1.5"
                  orient="auto"
                >
                  <polygon points="0 0, 3 1.5, 0 3" fill="#475569" />
                </marker>
              </defs>

              {/* Background */}
              <rect width="100" height="100" fill="url(#topology-bg)" />

              {/* Grid pattern (subtle) */}
              <g stroke="#1e293b" strokeWidth={0.05} opacity={0.5}>
                {Array.from({ length: 10 }, (_, i) => (
                  <g key={`grid-${i}`}>
                    <line x1={i * 10} y1="0" x2={i * 10} y2="100" />
                    <line x1="0" y1={i * 10} x2="100" y2={i * 10} />
                  </g>
                ))}
              </g>

              {/* Links */}
              <g className="links">
                {links.map((link) => {
                  const sourceNode = nodes.find((n) => n.id === link.source);
                  const targetNode = nodes.find((n) => n.id === link.target);

                  if (!sourceNode || !targetNode) return null;
                  if (
                    statusFilter !== 'all' &&
                    sourceNode.status !== statusFilter &&
                    targetNode.status !== statusFilter
                  )
                    return null;

                  const isSelected =
                    selectedNodeId === link.source ||
                    selectedNodeId === link.target;

                  const getLinkStyle = () => {
                    switch (link.status) {
                      case 'operational':
                        return { stroke: '#22c55e', strokeWidth: 0.3 };
                      case 'degraded':
                        return { stroke: '#eab308', strokeWidth: 0.4 };
                      case 'down':
                        return { stroke: '#ef4444', strokeWidth: 0.2, strokeDasharray: '1,1' };
                      default:
                        return { stroke: '#475569', strokeWidth: 0.2 };
                    }
                  };

                  const style = getLinkStyle();

                  return (
                    <g key={link.id}>
                      {/* Link line */}
                      <line
                        x1={sourceNode.position.x}
                        y1={sourceNode.position.y}
                        x2={targetNode.position.x}
                        y2={targetNode.position.y}
                        {...style}
                        opacity={isSelected ? 1 : 0.6}
                        className="cursor-pointer transition-opacity hover:opacity-100"
                        onClick={() => onLinkClick?.(link)}
                      />

                      {/* Utilization indicator (if available) */}
                      {link.utilization && link.utilization > 70 && (
                        <circle
                          cx={
                            (sourceNode.position.x + targetNode.position.x) / 2
                          }
                          cy={
                            (sourceNode.position.y + targetNode.position.y) / 2
                          }
                          r={0.8}
                          fill="#ef4444"
                          opacity={0.8}
                        >
                          <animate
                            attributeName="opacity"
                            values="0.8;0.4;0.8"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Nodes */}
              <g className="nodes">
                {filteredNodes.map((node) => {
                  const config = NODE_TYPE_CONFIG[node.type];
                  const statusConfig = STATUS_CONFIG[node.status];
                  const IconComponent = config.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Selection/Hover glow */}
                      {(isSelected || isHovered) && (
                        <circle
                          cx={node.position.x}
                          cy={node.position.y}
                          r={config.size / 10 + 4}
                          fill={config.color}
                          opacity={isHovered ? 0.15 : 0.25}
                        >
                          {isSelected && (
                            <animate
                              attributeName="r"
                              values={`${config.size / 10 + 4};${config.size / 10 + 6};${config.size / 10 + 4}`}
                              dur="2s"
                              repeatCount="indefinite"
                            />
                          )}
                        </circle>
                      )}

                      {/* Status indicator ring */}
                      <circle
                        cx={node.position.x}
                        cy={node.position.y}
                        r={config.size / 10 + 2}
                        fill="none"
                        stroke={statusConfig.pulseColor}
                        strokeWidth={0.4}
                        opacity={0.5}
                      />

                      {/* Main node circle */}
                      <circle
                        cx={node.position.x}
                        cy={node.position.y}
                        r={config.size / 10}
                        fill={`${config.color}20`}
                        stroke={config.color}
                        strokeWidth={0.5}
                        filter={isSelected ? 'url(#node-glow)' : undefined}
                      />

                      {/* Pulse animation for non-operational nodes */}
                      {node.status !== 'operational' && (
                        <circle
                          cx={node.position.x}
                          cy={node.position.y}
                          r={config.size / 10}
                          fill="none"
                          stroke={statusConfig.pulseColor}
                          strokeWidth={0.3}
                          opacity={0.6}
                        >
                          <animate
                            attributeName="r"
                            values={`${config.size / 10};${config.size / 10 + 3};${config.size / 10}`}
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.6;0;0.6"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Node icon (rendered as foreignObject for React components) */}
                      <foreignObject
                        x={node.position.x - config.size / 20}
                        y={node.position.y - config.size / 20}
                        width={config.size / 10}
                        height={config.size / 10}
                      >
                        <div className="flex items-center justify-center h-full">
                          <IconComponent
                            className="h-3 w-3"
                            style={{ color: config.color }}
                          />
                        </div>
                      </foreignObject>

                      {/* Node label */}
                      <text
                        x={node.position.x}
                        y={node.position.y + config.size / 10 + 3}
                        textAnchor="middle"
                        className="text-[3px] font-medium fill-slate-300 pointer-events-none select-none"
                      >
                        {node.name.length > 15
                          ? node.name.substring(0, 14) + '...'
                          : node.name}
                      </text>

                      {/* Status badge */}
                      <circle
                        cx={node.position.x + config.size / 10 - 1}
                        cy={node.position.y - config.size / 10 + 1}
                        r={1}
                        fill={statusConfig.pulseColor}
                        stroke="#0f172a"
                        strokeWidth={0.3}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredNode && !selectedNode && (
              <div
                className="absolute z-20 bg-slate-900/98 rounded-lg border border-slate-700 shadow-xl p-3 min-w-[200px] pointer-events-none"
                style={{
                  left: `${hoveredNode.position.x}%`,
                  top: `${hoveredNode.position.y}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-white">
                    {hoveredNode.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      color: STATUS_CONFIG[hoveredNode.status].color,
                      borderColor: STATUS_CONFIG[hoveredNode.status].pulseColor,
                    }}
                  >
                    {STATUS_CONFIG[hoveredNode.status].label}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 mb-2">{hoveredNode.details}</p>

                {hoveredNode.metrics && (
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {hoveredNode.metrics.cpu !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">CPU:</span>
                        <span className="text-white font-mono">
                          {Math.round(hoveredNode.metrics.cpu)}%
                        </span>
                      </div>
                    )}
                    {hoveredNode.metrics.memory !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Memory:</span>
                        <span className="text-white font-mono">
                          {Math.round(hoveredNode.metrics.memory)}%
                        </span>
                      </div>
                    )}
                    {hoveredNode.metrics.latency !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Latency:</span>
                        <span className="text-white font-mono">
                          {hoveredNode.metrics.latency.toFixed(1)}ms
                        </span>
                      </div>
                    )}
                    {hoveredNode.metrics.connections !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Connections:</span>
                        <span className="text-white font-mono">
                          {hoveredNode.metrics.connections}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Node Details Panel */}
            {showDetailsPanel && selectedNode && (
              <div className="absolute top-4 right-4 w-72 bg-slate-900/98 rounded-xl border border-slate-700 shadow-2xl z-30 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    {React.createElement(NODE_TYPE_CONFIG[selectedNode.type].icon, {
                      className: 'h-4 w-4',
                      style: { color: NODE_TYPE_CONFIG[selectedNode.type].color },
                    })}
                    <span className="font-semibold text-sm text-slate-200">
                      {selectedNode.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500"
                    onClick={() => setSelectedNodeId(null)}
                  >
                    ×
                  </Button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Status & Type */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{
                        color: STATUS_CONFIG[selectedNode.status].color,
                        borderColor: STATUS_CONFIG[selectedNode.status].pulseColor,
                      }}
                    >
                      {STATUS_CONFIG[selectedNode.status].label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {NODE_TYPE_CONFIG[selectedNode.type].label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {selectedNode.details && (
                    <p className="text-xs text-slate-400">{selectedNode.details}</p>
                  )}

                  {/* Metrics */}
                  {selectedNode.metrics && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white">Live Metrics</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedNode.metrics).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="bg-slate-800/50 rounded-lg p-2 text-center"
                            >
                              <p className="text-lg font-bold text-white font-mono">
                                {typeof value === 'number'
                                  ? Number.isInteger(value)
                                    ? value
                                    : value.toFixed(1)
                                  : value}
                                {key === 'cpu' || key === 'memory'
                                  ? '%'
                                  : key === 'latency'
                                  ? 'ms'
                                  : key === 'throughput'
                                  ? ' Mbps'
                                  : ''}
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                {key}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-xs"
                    >
                      <Activity className="h-3 w-3 mr-2" />
                      View Detailed Metrics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-xs"
                    >
                      <Phone className="h-3 w-3 mr-2" />
                      Run Diagnostics
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Named export for barrel file
export default NetworkTopology;
