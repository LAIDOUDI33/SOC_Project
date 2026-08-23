'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Clock,
  AlertTriangle,
  Shield,
  Target,
  User,
  Globe,
  Lock,
  Eye,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Filter,
  Download,
  Calendar,
  Sword,
  Bug,
  Wifi,
  Database,
  Mail,
  Search,
  XCircle,
  CheckCircle,
  Info,
  ExternalLink
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatCategory = 
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-control'
  | 'exfiltration'
  | 'impact';

export type ThreatActorType = 'apt' | 'cybercrime' | 'hacktivist' | 'insider' | 'unknown';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  severity: ThreatSeverity;
  category: ThreatCategory;
  actorType?: ThreatActorType;
  actorName?: string;
  mitreTechnique?: string;
  mitreTactic?: string;
  mitreId?: string;
  iocs?: string[];
  affectedAssets?: string[];
  status: 'active' | 'contained' | 'mitigated' | 'investigating';
  source?: string;
}

interface ThreatTimelineProps {
  /** Array of timeline events to display */
  events?: TimelineEvent[];
  /** Time range to display (in hours) */
  timeRangeHours?: number;
  /** Callback when an event is clicked */
  onEventClick?: (event: TimelineEvent) => void;
  /** Enable auto-scroll to latest event */
  autoScroll?: boolean;
  /** Show MITRE ATT&CK information */
  showMitreInfo?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

/** Severity configuration */
const SEVERITY_CONFIG: Record<ThreatSeverity, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: XCircle,
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: Info,
  },
  low: {
    label: 'Low',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: Shield,
  },
  info: {
    label: 'Info',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    icon: Eye,
  },
};

/** Category configuration with MITRE ATT&CK mapping */
const CATEGORY_CONFIG: Record<ThreatCategory, {
  label: string;
  tactic: string;
  icon: React.ElementType;
  color: string;
}> = {
  'initial-access': {
    label: 'Initial Access',
    tactic: 'Initial Access',
    icon: Globe,
    color: '#ef4444',
  },
  execution: {
    label: 'Execution',
    tactic: 'Execution',
    icon: Sword,
    color: '#f97316',
  },
  persistence: {
    label: 'Persistence',
    tactic: 'Persistence',
    icon: Lock,
    color: '#eab308',
  },
  'privilege-escalation': {
    label: 'Privilege Escalation',
    tactic: 'Privilege Escalation',
    icon: User,
    color: '#84cc16',
  },
  'defense-evasion': {
    label: 'Defense Evasion',
    tactic: 'Defense Evasion',
    icon: Eye,
    color: '#22c55e',
  },
  'credential-access': {
    label: 'Credential Access',
    tactic: 'Credential Access',
    icon: Bug,
    color: '#14b8a6',
  },
  discovery: {
    label: 'Discovery',
    tactic: 'Discovery',
    icon: Search,
    color: '#06b6d4',
  },
  'lateral-movement': {
    label: 'Lateral Movement',
    tactic: 'Lateral Movement',
    icon: Wifi,
    color: '#3b82f6',
  },
  collection: {
    label: 'Collection',
    tactic: 'Collection',
    icon: Database,
    color: '#6366f1',
  },
  'command-control': {
    label: 'Command & Control',
    tactic: 'Command and Control',
    icon: Wifi,
    color: '#a855f7',
  },
  exfiltration: {
    label: 'Exfiltration',
    tactic: 'Exfiltration',
    icon: Mail,
    color: '#d946ef',
  },
  impact: {
    label: 'Impact',
    tactic: 'Impact',
    icon: XCircle,
    color: '#ec4899',
  },
};

/** Threat actor configuration */
const ACTOR_CONFIG: Record<ThreatActorType, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  apt: {
    label: 'APT Group',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  cybercrime: {
    label: 'Cybercriminal',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  hacktivist: {
    label: 'Hacktivist',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  insider: {
    label: 'Insider Threat',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  unknown: {
    label: 'Unknown',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
};

/** Status configuration */
const STATUS_CONFIG: Record<TimelineEvent['status'], {
  label: string;
  color: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
}> = {
  active: { label: 'Active', color: 'text-red-400', variant: 'destructive' as const },
  contained: { label: 'Contained', color: 'text-yellow-400', variant: 'outline' as const },
  mitigated: { label: 'Mitigated', color: 'text-green-400', variant: 'default' as const },
  investigating: { label: 'Investigating', color: 'text-blue-400', variant: 'secondary' as const },
};

// ============================================================
// SAMPLE DATA - Realistic Attack Campaign
// ============================================================

/** Generate sample threat timeline data simulating APT campaign */
export const generateSampleTimeline = (): TimelineEvent[] => {
  const now = new Date();

  return [
    // Phase 1: Initial Access
    {
      id: 'evt-1',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24h ago
      title: 'Spear Phishing Email Detected',
      description:
        'Targeted phishing email sent to finance department impersonating CEO. Malicious attachment detected.',
      severity: 'high',
      category: 'initial-access',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Spearphishing Attachment',
      mitreTactic: 'Initial Access',
      mitreId: 'T1566.001',
      iocs: ['sha256:a3f2b8c1d4e5f6...', 'sender@malicious-domain.dz'],
      affectedAssets: ['mail-server-01'],
      status: 'mitigated',
      source: 'Proofpoint Email Security',
    },
    {
      id: 'evt-2',
      timestamp: new Date(now.getTime() - 23 * 60 * 60 * 1000),
      title: 'Malicious Document Execution',
      description:
        'Macro-enabled Excel document executed on workstation FIN-0142. C2 callback initiated.',
      severity: 'critical',
      category: 'execution',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Malicious File',
      mitreTactic: 'Execution',
      mitreId: 'T1204.002',
      iocs: ['192.168.100.47', 'fin-0142.djezzy.dz'],
      affectedAssets: ['FIN-0142'],
      status: 'contained',
      source: 'CrowdStrike EDR',
    },

    // Phase 2: Persistence & Defense Evasion
    {
      id: 'evt-3',
      timestamp: new Date(now.getTime() - 22.5 * 60 * 60 * 1000),
      title: 'Scheduled Task Created for Persistence',
      description:
        'Adversary created scheduled task running every 30 minutes for persistence mechanism.',
      severity: 'high',
      category: 'persistence',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Scheduled Task/Job',
      mitreTactic: 'Persistence',
      mitreId: 'T1053.005',
      iocs: ['taskname: "Windows Update Service"'],
      affectedAssets: ['FIN-0142'],
      status: 'contained',
      source: 'CrowdStrike EDR',
    },
    {
      id: 'evt-4',
      timestamp: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      title: 'Defense Evasion via DLL Sideloading',
      description:
        'Legitimate signed executable loaded malicious DLL from temp directory.',
      severity: 'high',
      category: 'defense-evasion',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'DLL Side-Loading',
      mitreTactic: 'Defense Evasion',
      mitreId: 'T1574.002',
      iocs: ['C:\\Temp\\winhttp.dll'],
      affectedAssets: ['FIN-0142'],
      status: 'contained',
      source: 'SentinelOne',
    },

    // Phase 3: Credential Access & Discovery
    {
      id: 'evt-5',
      timestamp: new Date(now.getTime() - 21 * 60 * 60 * 1000),
      title: 'LSASS Memory Dump Attempted',
      description:
        'Suspicious process attempted to access LSASS process memory for credential harvesting.',
      severity: 'critical',
      category: 'credential-access',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'OS Credential Dumping',
      mitreTactic: 'Credential Access',
      mitreId: 'T1003.001',
      iocs: ['PID: 4892', 'procdump64.exe'],
      affectedAssets: ['FIN-0142', 'dc-01'],
      status: 'investigating',
      source: 'Windows Event Log',
    },
    {
      id: 'evt-6',
      timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      title: 'Network Discovery Commands Executed',
      description:
        'Adversary ran net view and nltest commands to enumerate domain trusts and network shares.',
      severity: 'medium',
      category: 'discovery',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Network Share Discovery',
      mitreTactic: 'Discovery',
      mitreId: 'T1135',
      iocs: ['net view /domain', 'nltest /domain_trusts'],
      affectedAssets: ['FIN-0142'],
      status: 'contained',
      source: 'CrowdStrike EDR',
    },

    // Phase 4: Lateral Movement
    {
      id: 'evt-7',
      timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      title: 'Lateral Movement via RDP',
      description:
        'RDP connection from compromised workstation to HR server detected using stolen credentials.',
      severity: 'critical',
      category: 'lateral-movement',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Remote Services: RDP',
      mitreTactic: 'Lateral Movement',
      mitreId: 'T1021.001',
      iocs: ['hr-server-03.djezzy.dz', 'user: svc_backup'],
      affectedAssets: ['FIN-0142', 'HR-SERVER-03'],
      status: 'active',
      source: 'Windows Security Log',
    },
    {
      id: 'evt-8',
      timestamp: new Date(now.getTime() - 17 * 60 * 60 * 1000),
      title: 'PSExec Execution on Domain Controller',
      description:
        'PSExec tool used to execute commands remotely on domain controller - potential domain takeover attempt.',
      severity: 'critical',
      category: 'lateral-movement',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Remote Services: SMB/Windows Admin Shares',
      mitreTactic: 'Lateral Movement',
      mitreId: 'T1021.002',
      iocs: ['dc-01.djezzy.dz', 'psexec.exe -s cmd.exe'],
      affectedAssets: ['HR-SERVER-03', 'DC-01'],
      status: 'active',
      source: 'CrowdStrike EDR',
    },

    // Phase 5: Collection & Exfiltration
    {
      id: 'evt-9',
      timestamp: new Date(now.getTime() - 15 * 60 * 60 * 1000),
      title: 'Large Data Archive Created',
      description:
        '7-zip used to compress sensitive files including customer database backup (2.3GB).',
      severity: 'critical',
      category: 'collection',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Data from Local System',
      mitreTactic: 'Collection',
      mitreId: 'T1005',
      iocs: ['C:\\Temp\\backup.7z', 'SHA256: b8c3d2e1...'],
      affectedAssets: ['DC-01'],
      status: 'active',
      source: 'EDR File Audit',
    },
    {
      id: 'evt-10',
      timestamp: new Date(now.getTime() - 14 * 60 * 60 * 1000),
      title: 'Data Exfiltration to External IP',
      description:
        'Large outbound data transfer (2.4GB) to known malicious IP address associated with APT28 infrastructure.',
      severity: 'critical',
      category: 'exfiltration',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Exfiltration Over Alternative Protocol',
      mitreTactic: 'Exfiltration',
      mitreId: 'T1048.003',
      iocs: ['91.121.87.44', 'dns: c2.evil-dz.com'],
      affectedAssets: ['DC-01', 'FW-EDGE-01'],
      status: 'active',
      source: 'NetFlow Analyzer',
    },

    // Phase 6: Impact (Ransomware Deployment)
    {
      id: 'evt-11',
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      title: 'Ransomware Payload Deployed',
      description:
        'WannaCry variant ransomware deployed across domain. Encryption of files in progress.',
      severity: 'critical',
      category: 'impact',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Data Encrypted for Impact',
      mitreTactic: 'Impact',
      mitreId: 'T1486',
      iocs: ['wcry.exe', 'RSA-2048 encryption'],
      affectedAssets: ['DC-01', 'FILE-SERVER-01', 'FILE-SERVER-02', 'HR-SERVER-03'],
      status: 'active',
      source: 'Ransomware Detection Module',
    },
    {
      id: 'evt-12',
      timestamp: new Date(now.getTime() - 11.5 * 60 * 60 * 1000),
      title: 'Ransom Note Dropped',
      description:
        'Ransom note dropped on all affected systems demanding payment in Bitcoin within 48 hours.',
      severity: 'critical',
      category: 'impact',
      actorType: 'apt',
      actorName: 'APT28 (Fancy Bear)',
      mitreTechnique: 'Inhibit System Recovery',
      mitreTactic: 'Impact',
      mitreId: 'T1490',
      iocs: ['!READ_ME!.txt', 'BTC wallet: bc1q...'],
      affectedAssets: ['All encrypted endpoints'],
      status: 'active',
      source: 'File Integrity Monitor',
    },

    // Response Actions
    {
      id: 'evt-13',
      timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      title: 'Incident Declared - IR Team Activated',
      description:
        'Major incident declared. CSIRT team activated. Executive notification sent.',
      severity: 'high',
      category: 'impact',
      actorType: 'unknown',
      mitreTechnique: 'Incident Response',
      iocs: ['INC-2024-0847'],
      affectedAssets: ['SOC-Platform'],
      status: 'mitigated',
      source: 'Incident Management System',
    },
    {
      id: 'evt-14',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      title: 'Network Isolation Implemented',
      description:
        'Affected segments isolated. Containment successful - no further lateral movement detected.',
      severity: 'medium',
      category: 'impact',
      actorType: 'unknown',
      iocs: ['VLAN-10 isolated', 'ACLs updated on core switches'],
      affectedAssets: ['CORE-SW-01', 'FW-EDGE-01'],
      status: 'mitigated',
      source: 'Network Operations Center',
    },
    {
      id: 'evt-15',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      title: 'Recovery Operations Initiated',
      description:
        'System restoration from clean backups begun. Estimated recovery time: 12 hours.',
      severity: 'low',
      category: 'impact',
      actorType: 'unknown',
      iocs: ['Backup set: 2024-08-20-full'],
      affectedAssets: ['BACKUP-SERVER-01'],
      status: 'mitigated',
      source: 'IT Operations',
    },
  ];
};

// ============================================================
// COMPONENTS
// ============================================================

/**
 * ThreatTimeline - Interactive threat intelligence timeline visualization
 *
 * Features:
 * - Chronological display of security events
 * - MITRE ATT&CK framework integration
 * - Severity-based color coding
 * - Threat actor attribution
 * - IOC extraction and display
 * - Filtering by category/severity/status
 * - Zoom controls for time range adjustment
 *
 * @example
 * ```tsx
 * <ThreatTimeline
 *   showMitreInfo={true}
 *   onEventClick={(event) => showEventDetails(event)}
 * />
 * ```
 */
export function ThreatTimeline({
  initialEvents,
  timeRangeHours = 24,
  onEventClick,
  autoScroll = false,
  showMitreInfo = true,
  className,
}: ThreatTimelineProps) {
  // State management
  const [events] = useState<TimelineEvent[]>(
    initialEvents || generateSampleTimeline()
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (severityFilter !== 'all' && event.severity !== severityFilter)
        return false;
      if (categoryFilter !== 'all' && event.category !== categoryFilter)
        return false;
      if (statusFilter !== 'all' && event.status !== statusFilter)
        return false;
      return true;
    });
  }, [events, severityFilter, categoryFilter, statusFilter]);

  // Get selected event
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = events.length;
    const bySeverity = Object.keys(SEVERITY_CONFIG).reduce(
      (acc, key) => ({
        ...acc,
        [key]: events.filter((e) => e.severity === key).length,
      }),
      {} as Record<string, number>
    );
    const byStatus = Object.keys(STATUS_CONFIG).reduce(
      (acc, key) => ({
        ...acc,
        [key]: events.filter((e) => e.status === key).length,
      }),
      {} as Record<string, number>
    );

    return { total, bySeverity, byStatus };
  }, [events]);

  // Handle event click
  const handleEventClick = useCallback(
    (event: TimelineEvent) => {
      setSelectedEventId(event.id === selectedEventId ? null : event.id);
      onEventClick?.(event);
    },
    [selectedEventId, onEventClick]
  );

  // Format time relative to now
  const formatTimeAgo = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Format absolute time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-purple-400" />
              Threat Intelligence Timeline
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Time Range */}
              <Badge variant="outline" className="border-slate-600 text-xs">
                Last {timeRangeHours} hours
              </Badge>

              {/* Zoom Controls */}
              <div className="flex bg-slate-800 rounded p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="px-2 text-xs text-slate-400 min-w-[40px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white"
                  onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8 bg-slate-800 border-slate-600 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} ({stats.bySeverity[key] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] h-8 bg-slate-800 border-slate-600 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 bg-slate-800 border-slate-600 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} ({stats.byStatus[key] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex h-[600px]">
            {/* Timeline View */}
            <ScrollArea className="flex-1 p-4">
              <div className="relative space-y-1">
                {/* Timeline axis */}
                <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-slate-700 pr-2 flex flex-col justify-between py-4 text-[10px] text-slate-500">
                  {Array.from({ length: Math.min(10, timeRangeHours) }, (_, i) => (
                    <span key={i}>{i * (timeRangeHours / 10)}h ago</span>
                  ))}
                </div>

                {/* Events */}
                <div className="ml-20 space-y-2">
                  {filteredEvents.map((event, index) => {
                    const severityConfig = SEVERITY_CONFIG[event.severity];
                    const categoryConfig = CATEGORY_CONFIG[event.category];
                    const statusConfig = STATUS_CONFIG[event.status];
                    const isSelected = selectedEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'relative flex gap-4 p-3 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600'
                        )}
                        onClick={() => handleEventClick(event)}
                      >
                        {/* Timeline connector */}
                        <div className="absolute left-[-26px] top-1/2 w-4 h-0.5 bg-slate-700" />

                        {/* Status dot */}
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full mt-1 flex-shrink-0 ring-2 ring-offset-slate-900 ring-offset-2',
                            event.status === 'active'
                              ? 'bg-red-500 ring-red-500/30 animate-pulse'
                              : event.status === 'investigating'
                              ? 'bg-blue-500 ring-blue-500/30'
                              : event.status === 'contained'
                              ? 'bg-yellow-500 ring-yellow-500/30'
                              : 'bg-green-500 ring-green-500/30'
                          )}
                        />

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <severityConfig.icon
                                className={cn('h-4 w-4 flex-shrink-0', severityConfig.color)}
                              />
                              <h3 className="font-medium text-sm text-white truncate">
                                {event.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge
                                variant={statusConfig.variant}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {statusConfig.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  severityConfig.bgColor,
                                  severityConfig.color,
                                  `border-current`
                                )}
                              >
                                {severityConfig.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                            {event.description}
                          </p>

                          {/* Metadata Row */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(event.timestamp)} ({formatTime(event.timestamp)})
                            </span>

                            {showMitreInfo && event.mitreId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 cursor-help text-purple-400 hover:text-purple-300">
                                    <Target className="h-3 w-3" />
                                    {event.mitreId}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <div className="text-xs max-w-[250px]">
                                    <p className="font-semibold text-white mb-1">
                                      {event.mitreTechnique}
                                    </p>
                                    <p className="text-slate-300">
                                      Tactic: {event.mitreTactic}
                                    </p>
                                    {event.actorName && (
                                      <p className="text-orange-400 mt-1">
                                        Actor: {event.actorName}
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {event.actorType && (
                              <span
                                className={cn(
                                  'flex items-center gap-1',
                                  ACTOR_CONFIG[event.actorType]?.color
                                )}
                              >
                                <User className="h-3 w-3" />
                                {ACTOR_CONFIG[event.actorType]?.label}
                              </span>
                            )}

                            <span
                              className="flex items-center gap-1"
                              style={{ color: categoryConfig.color }}
                            >
                              <categoryConfig.icon className="h-3 w-3" />
                              {categoryConfig.label}
                            </span>

                            {event.source && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {event.source}
                              </span>
                            )}
                          </div>

                          {/* IOCs Preview */}
                          {event.iocs && event.iocs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {event.iocs.slice(0, 3).map((ioc, i) => (
                                <code
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono"
                                >
                                  {ioc.length > 25 ? ioc.substring(0, 24) + '...' : ioc}
                                </code>
                              ))}
                              {event.iocs.length > 3 && (
                                <span className="text-[10px] text-slate-500">
                                  +{event.iocs.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredEvents.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No events match your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Selected Event Details Panel */}
            {selectedEvent && (
              <div className="w-80 border-l border-slate-700 bg-slate-900/50 overflow-y-auto">
                <div className="p-4 space-y-4 sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {React.createElement(
                        SEVERITY_CONFIG[selectedEvent.severity].icon,
                        {
                          className: cn(
                            'h-5 w-5',
                            SEVERITY_CONFIG[selectedEvent.severity].color
                          ),
                        }
                      )}
                      <h3 className="font-semibold text-white text-sm">
                        {selectedEvent.title}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-500"
                      onClick={() => setSelectedEventId(null)}
                    >
                      ×
                    </Button>
                  </div>

                  {/* Status & Severity Badges */}
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_CONFIG[selectedEvent.status].variant}>
                      {STATUS_CONFIG[selectedEvent.status].label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        SEVERITY_CONFIG[selectedEvent.severity].bgColor,
                        SEVERITY_CONFIG[selectedEvent.severity].color,
                        'border-current'
                      )}
                    >
                      {SEVERITY_CONFIG[selectedEvent.severity].label}
                    </Badge>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-slate-300">
                      {selectedEvent.description}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-1">
                      Timestamp
                    </h4>
                    <p className="text-sm text-white font-mono">
                      {selectedEvent.timestamp.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTimeAgo(selectedEvent.timestamp)}
                    </p>
                  </div>

                  {/* MITRE ATT&CK Info */}
                  {showMitreInfo && selectedEvent.mitreId && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3 text-purple-400" />
                        MITRE ATT&CK Mapping
                      </h4>
                      <div className="space-y-2 bg-slate-800/50 rounded-lg p-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Technique ID</span>
                          <span className="text-purple-400 font-mono font-medium">
                            {selectedEvent.mitreId}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Technique</span>
                          <span className="text-white">
                            {selectedEvent.mitreTechnique}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Tactic</span>
                          <span className="text-white">
                            {selectedEvent.mitreTactic}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View in MITRE ATT&CK Matrix
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Threat Actor */}
                  {selectedEvent.actorName && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-1">
                        Threat Actor
                      </h4>
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium',
                          ACTOR_CONFIG[selectedEvent.actorType || 'unknown']?.bgColor,
                          ACTOR_CONFIG[selectedEvent.actorType || 'unknown']?.color
                        )}
                      >
                        <User className="h-3 w-3" />
                        {selectedEvent.actorName}
                      </div>
                    </div>
                  )}

                  {/* IOCs */}
                  {selectedEvent.iocs && selectedEvent.iocs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                        <Shield className="h-3 w-3 text-cyan-400" />
                        Indicators of Compromise
                      </h4>
                      <div className="space-y-1">
                        {selectedEvent.iocs.map((ioc, index) => (
                          <code
                            key={index}
                            className="block text-xs px-2 py-1.5 rounded bg-slate-800 text-cyan-400 font-mono break-all"
                          >
                            {ioc}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Affected Assets */}
                  {selectedEvent.affectedAssets &&
                    selectedEvent.affectedAssets.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 mb-2">
                          Affected Assets
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedEvent.affectedAssets.map((asset, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs border-slate-600 text-slate-300"
                            >
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Source */}
                  {selectedEvent.source && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-1">
                        Source
                      </h4>
                      <p className="text-sm text-slate-300">
                        {selectedEvent.source}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <Separator className="bg-slate-700" />
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-xs"
                    >
                      <Search className="h-3 w-3 mr-2" />
                      Pivot Investigation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-xs"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Export IOCs
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
export default ThreatTimeline;
