'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Filter,
  Plus,
  MoreVertical,
  MessageSquare,
  ExternalLink,
  ArrowRight,
  GripVertical,
  XCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

/** Incident status for Kanban columns */
export type IncidentStatus = 'new' | 'investigating' | 'resolved' | 'closed';

/** Incident priority levels */
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

/** Single incident item */
export interface Incident {
  /** Unique identifier */
  id: string;
  /** Incident title/summary */
  title: string;
  /** Detailed description */
  description?: string;
  /** Severity level */
  severity: IncidentSeverity;
  /** Priority level */
  priority: IncidentPriority;
  /** Current status (determines column) */
  status: IncidentStatus;
  /** Assigned analyst name */
  assignee?: string;
  /** ISO timestamp when incident was created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt?: string;
  /** Related alert IDs */
  relatedAlerts?: string[];
  /** Tags/categories */
  tags?: string[];
  /** Source system */
  source?: string;
}

/** Column configuration for Kanban board */
export interface KanbanColumn {
  id: IncidentStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

/** Default Kanban columns */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'new',
    title: 'New',
    icon: AlertCircle,
    color: '#3b82f6',
    bgColor: 'bg-blue-950/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'investigating',
    title: 'Investigating',
    icon: Search,
    color: '#eab308',
    bgColor: 'bg-yellow-950/20',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 'resolved',
    title: 'Resolved',
    icon: CheckCircle2,
    color: '#22c55e',
    bgColor: 'bg-green-950/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'closed',
    title: 'Closed',
    icon: XCircle,
    color: '#6b7280',
    bgColor: 'bg-slate-800/50',
    borderColor: 'border-slate-600/30',
  },
];

/** Severity configuration */
export const SEVERITY_CONFIG: Record<IncidentSeverity, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  critical: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-900/30' },
  high: { label: 'High', color: '#f97316', bgColor: 'bg-orange-900/30' },
  medium: { label: 'Medium', color: '#eab308', bgColor: 'bg-yellow-900/30' },
  low: { label: 'Low', color: '#3b82f6', bgColor: 'bg-blue-900/30' },
};

/** Sample incidents data */
export const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'INC-2024-0847',
    title: 'SS7 Signaling Attack - Interception Attempt',
    description: 'Coordinated SS7 attack targeting HLR/HSS infrastructure. Multiple suspicious MAP messages detected.',
    severity: 'critical',
    priority: 'P1',
    status: 'investigating',
    assignee: 'A. Benali',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    relatedAlerts: ['alert-001', 'alert-002'],
    tags: ['ss7', 'signaling', 'core-network'],
    source: 'SIEM Correlation Engine',
  },
  {
    id: 'INC-2024-0846',
    title: 'DDoS Attack on Public API Gateway',
    description: 'Volumetric DDoS attack detected. Traffic spike of 400% above baseline.',
    severity: 'high',
    priority: 'P1',
    status: 'new',
    assignee: 'M. Khelifi',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    tags: ['ddos', 'api', 'network'],
    source: 'Network Monitor',
  },
  {
    id: 'INC-2024-0845',
    title: 'SIM Box Fraud Ring - Oran Region',
    description: 'Organized SIM box operation detected with international call termination.',
    severity: 'high',
    priority: 'P2',
    status: 'investigating',
    assignee: 'S. Hadj',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    tags: ['fraud', 'sim-box', 'oran'],
    source: 'Fraud Detection System',
  },
  {
    id: 'INC-2024-0844',
    title: 'Credential Stuffing Attack - VPN Portal',
    description: 'Brute force credential stuffing attempt against corporate VPN.',
    severity: 'medium',
    priority: 'P2',
    status: 'new',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    tags: ['credential', 'vpn', 'authentication'],
    source: 'EDR Collector',
  },
  {
    id: 'INC-2024-0843',
    title: 'Malware Detection - Finance Workstation',
    description: 'Trojan variant detected on finance department workstation. Isolated.',
    severity: 'high',
    priority: 'P1',
    status: 'resolved',
    assignee: 'K. Amrani',
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    tags: ['malware', 'endpoint', 'finance'],
    source: 'EDR Platform',
  },
  {
    id: 'INC-2024-0842',
    title: 'Phishing Campaign Targeting Executives',
    description: 'Spear-phishing emails detected targeting C-suite executives.',
    severity: 'medium',
    priority: 'P3',
    status: 'investigating',
    assignee: 'L. Mansouri',
    createdAt: new Date(Date.now() - 300 * 60000).toISOString(),
    tags: ['phishing', 'email', 'executive'],
    source: 'Email Security Gateway',
  },
  {
    id: 'INC-2024-0841',
    title: 'Unauthorized Access Attempt - Database Server',
    description: 'Failed SQL injection attempts blocked by WAF.',
    severity: 'medium',
    priority: 'P3',
    status: 'resolved',
    assignee: 'R. Boudiaf',
    createdAt: new Date(Date.now() - 420 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    tags: ['injection', 'database', 'web'],
    source: 'WAF Logs',
  },
  {
    id: 'INC-2024-0840',
    title: 'Certificate Expiration Warning',
    description: 'SSL certificate for customer portal expiring in 7 days.',
    severity: 'low',
    priority: 'P4',
    status: 'new',
    createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
    tags: ['certificate', 'ssl', 'infrastructure'],
    source: 'Cert Manager',
  },
  {
    id: 'INC-2024-0839',
    title: 'Data Exfiltration Attempt Blocked',
    description: 'DLP system blocked large file upload to personal cloud storage.',
    severity: 'high',
    priority: 'P2',
    status: 'closed',
    assignee: 'A. Benali',
    createdAt: new Date(Date.now() - 1440 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 720 * 60000).toISOString(),
    tags: ['dlp', 'data-loss', 'insider'],
    source: 'DLP System',
  },
  {
    id: 'INC-2024-0838',
    title: 'Network Anomaly - Unusual DNS Traffic',
    description: 'DNS tunneling activity detected from development subnet.',
    severity: 'low',
    priority: 'P4',
    status: 'closed',
    createdAt: new Date(Date.now() - 2880 * 60000).toISOString(),
    tags: ['dns', 'tunneling', 'network'],
    source: 'DNS Monitor',
  },
];

export interface IncidentCommandCenterProps {
  /** Incidents to display */
  incidents?: Incident[];
  /** Callback when incident is clicked */
  onIncidentClick?: (incident: Incident) => void;
  /** Callback when incident is moved to new status (drag and drop) */
  onStatusChange?: (incidentId: string, newStatus: IncidentStatus) => void;
  /** Additional CSS classes */
  className?: boolean;
  /** Show filter controls (default: true) */
  showFilters?: boolean;
  /** Compact mode for smaller display (default: false) */
  compact?: boolean;
}

/**
 * IncidentCommandCenter - Kanban-style incident management visualization
 * 
 * Features:
 * - Four-column Kanban board (New → Investigating → Resolved → Closed)
 * - Visual drag-and-drop status changes
 * - Incident cards with severity, assignee, age, summary
 * - Filter by severity/priority
 * - Count per column header
 * - Quick actions on each card
 * - Responsive layout
 * 
 * @example
 * ```tsx
 * <IncidentCommandCenter
 *   incidents={incidentsData}
 *   onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
 *   onStatusChange={(id, status) => updateIncidentStatus(id, status)}
 * />
 * ```
 */
export function IncidentCommandCenter({
  incidents = SAMPLE_INCIDENTS,
  onIncidentClick,
  onStatusChange,
  className,
  showFilters = true,
  compact = false,
}: IncidentCommandCenterProps) {
  // State management
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [draggedIncident, setDraggedIncident] = useState<Incident | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<IncidentStatus | null>(null);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  // Filter incidents based on selected filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (filterSeverity !== 'all' && incident.severity !== filterSeverity) return false;
      if (filterPriority !== 'all' && incident.priority !== filterPriority) return false;
      return true;
    });
  }, [incidents, filterSeverity, filterPriority]);

  // Group incidents by status for Kanban columns
  const incidentsByStatus = useMemo(() => {
    const grouped: Record<IncidentStatus, Incident[]> = {
      new: [],
      investigating: [],
      resolved: [],
      closed: [],
    };
    
    filteredIncidents.forEach((incident) => {
      grouped[incident.status].push(incident);
    });
    
    // Sort within each column: by priority first, then by creation date
    Object.keys(grouped).forEach((status) => {
      grouped[status as IncidentStatus].sort((a, b) => {
        // Sort by priority (P1 first)
        const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Then by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
    
    return grouped;
  }, [filteredIncidents]);

  // Calculate time ago
  const getTimeAgo = useCallback((timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, incident: Incident) => {
    setDraggedIncident(incident);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', incident.id);
  }, []);

  // Handle drag over column
  const handleDragOver = useCallback((e: React.DragEvent, status: IncidentStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  // Handle drop on column
  const handleDrop = useCallback(
    (status: IncidentStatus) => {
      if (draggedIncident && draggedIncident.status !== status) {
        onStatusChange?.(draggedIncident.id, status);
      }
      setDraggedIncident(null);
      setDragOverColumn(null);
    },
    [draggedIncident, onStatusChange]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  // Render single incident card
  const renderIncidentCard = (incident: Incident) => {
    const severityConfig = SEVERITY_CONFIG[incident.severity];
    const isExpanded = expandedIncident === incident.id;
    const ColumnIcon = KANBAN_COLUMNS.find((col) => col.id === incident.status)?.icon || AlertCircle;

    return (
      <div
        key={incident.id}
        draggable
        onDragStart={(e) => handleDragStart(e, incident)}
        onClick={() => setExpandedIncident(isExpanded ? null : incident.id)}
        className={cn(
          'group bg-slate-800/80 rounded-lg border p-3 cursor-grab active:cursor-grabbing',
          'transition-all duration-200 hover:bg-slate-800 hover:border-slate-600',
          'hover:shadow-lg hover:shadow-black/20',
          isExpanded && 'ring-2 ring-blue-500/50 border-blue-500/50'
        )}
        style={{ borderTopColor: severityConfig.color, borderTopWidth: 3 }}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Drag handle */}
          <GripVertical className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 h-4 font-mono', severityConfig.bgColor)}
                style={{ color: severityConfig.color, borderColor: severityConfig.color + '40' }}
              >
                {incident.id}
              </Badge>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 h-4 font-bold')}
                style={{
                  color: severityConfig.color,
                  backgroundColor: severityConfig.color + '20',
                  borderColor: severityConfig.color + '40',
                }}
              >
                {incident.priority}
              </Badge>
            </div>
            
            <h4 className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight">
              {incident.title}
            </h4>
          </div>

          {/* Quick actions */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIncidentClick?.(incident);
            }}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {incident.assignee && (
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{incident.assignee}</span>
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {getTimeAgo(incident.createdAt)}
          </span>
        </div>

        {/* Tags */}
        {incident.tags && incident.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {incident.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
              >
                {tag}
              </span>
            ))}
            {incident.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-slate-500">
                +{incident.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-2 animate-slide-down">
            {incident.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{incident.description}</p>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created: new Date(incident.createdAt).toLocaleString()
              </span>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncidentClick?.(incident);
                }}
              >
                View Details
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate total counts
  const totalCounts = useMemo(() => {
    const counts = { total: incidents.length };
    KANBAN_COLUMNS.forEach((col) => {
      counts[col.id as keyof typeof counts] = incidentsByStatus[col.id].length;
    });
    return counts;
  }, [incidents, incidentsByStatus]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className={cn('pb-3', !compact && 'border-b border-slate-800')}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className={cn('flex items-center gap-2', compact ? 'text-sm' : 'text-base')}>
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            Incident Command Center
          </CardTitle>
          
          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totalCounts.total} Total
            </Badge>
            <Badge variant="outline" className="text-red-400 border-red-500/30 text-xs">
              {incidentsByStatus.new.length} New
            </Badge>
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">
              {incidentsByStatus.investigating.length} Active
            </Badge>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Filter className="w-4 h-4 text-slate-500" />
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
                <SelectItem value="P3">P3</SelectItem>
                <SelectItem value="P4">P4</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-slate-500 ml-auto"
              onClick={() => {
                setFilterSeverity('all');
                setFilterPriority('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </CardHeader>

      {/* Kanban Board */}
      <CardContent className={cn(compact ? 'p-2' : 'p-4')}>
        <div className={cn(
          'grid gap-4',
          compact ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        )}>
          {KANBAN_COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const columnIncidents = incidentsByStatus[column.id];
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={cn(
                  'rounded-lg border transition-colors min-h-[200px]',
                  column.bgColor,
                  column.borderColor,
                  isDragOver && 'ring-2 ring-blue-500/50 bg-blue-950/10'
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={() => handleDrop(column.id)}
                onDragLeave={handleDragLeave}
              >
                {/* Column Header */}
                <div className={cn(
                  'flex items-center justify-between p-3 border-b',
                  column.borderColor
                )}>
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="w-4 h-4" style={{ color: column.color }} />
                    <span className="text-sm font-semibold text-slate-200">
                      {column.title}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs min-w-[24px] justify-center',
                      columnIncidents.length > 0 ? '' : 'opacity-50'
                    )}
                    style={{ backgroundColor: column.color + '20', color: column.color }}
                  >
                    {columnIncidents.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <div className={cn('p-2 space-y-2 overflow-y-auto', compact ? 'max-h-[250px]' : 'max-h-[400px]')}>
                  {columnIncidents.length > 0 ? (
                    columnIncidents.map(renderIncidentCard)
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">No incidents</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Embedded styles */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 200px;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.2s ease-out forwards;
        }
        
        /* Custom scrollbar for columns */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </Card>
  );
}

// Named export for barrel file
export default IncidentCommandCenter;
