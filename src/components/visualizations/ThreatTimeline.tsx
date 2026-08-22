'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowDown,
  AlertCircle,
  Bug,
  Lock,
  UserX,
  Globe,
  Wifi,
  Database,
  ZoomIn,
  Calendar,
} from 'lucide-react';
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
 * Event types for timeline filtering
 */
export type ThreatEventType = 'alert' | 'incident' | 'action' | 'detection' | 'response';

/** Event severity levels */
export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Timeline zoom levels */
export type TimeZoom = '1h' | '6h' | '24h' | '7d' | '30d';

/** Configuration for event types */
export const EVENT_TYPE_CONFIG: Record<ThreatEventType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  alert: { label: 'Alert', icon: AlertTriangle, color: '#eab308', bgColor: 'bg-yellow-950/50' },
  incident: { label: 'Incident', icon: ShieldAlert, color: '#ef4444', bgColor: 'bg-red-950/50' },
  action: { label: 'Action', icon: ShieldCheck, color: '#22c55e', bgColor: 'bg-green-950/50' },
  detection: { label: 'Detection', icon: Bug, color: '#8b5cf6', bgColor: 'bg-purple-950/50' },
  response: { label: 'Response', icon: Lock, color: '#06b6d4', bgColor: 'bg-cyan-950/50' },
};

/** Severity configuration */
export const SEVERITY_CONFIG: Record<EventSeverity, {
  color: string;
  dotSize: number;
}> = {
  critical: { color: '#ef4444', dotSize: 12 },
  high: { color: '#f97316', dotSize: 10 },
  medium: { color: '#eab308', dotSize: 8 },
  low: { color: '#3b82f6', dotSize: 6 },
  info: { color: '#6b7280', dotSize: 5 },
};

/** Single timeline event */
export interface TimelineEvent {
  id: string;
  /** Event type for filtering and styling */
  type: ThreatEventType;
  /** Severity level */
  severity: EventSeverity;
  /** Event title */
  title: string;
  /** Detailed description (shown when expanded) */
  description?: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional end time for duration events */
  endTime?: string;
  /** Source system or category */
  source?: string;
  /** Related event IDs for connection lines */
  relatedEventIds?: string[];
  /** Additional metadata */
  metadata?: Record<string, string | number>;
  /** Click handler reference */
  href?: string;
}

/** Sample threat timeline data */
export const SAMPLE_THREAT_EVENTS: TimelineEvent[] = [
  {
    id: 'evt-1',
    type: 'detection',
    severity: 'high',
    title: 'SS7 Attack Pattern Detected',
    description: 'Unusual signaling traffic detected between MSC-West and unknown HLR. Potential SS7 interception attempt identified through anomaly detection.',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    source: 'SS7 Monitor',
    relatedEventIds: ['evt-2'],
    metadata: { protocol: 'MAP', messagesPerSec: '4500', deviation: '+340%' },
  },
  {
    id: 'evt-2',
    type: 'alert',
    severity: 'critical',
    title: 'Critical: SS7 Signaling Anomaly',
    description: 'Elevated to critical due to sustained abnormal traffic patterns. Potential targeted attack against Djezzy core network infrastructure.',
    timestamp: new Date(Date.now() - 38 * 60000).toISOString(),
    source: 'SIEM Correlation Engine',
    relatedEventIds: ['evt-3'],
    metadata: { ruleId: 'SS7-ANOMALY-001', confidence: '94%' },
  },
  {
    id: 'evt-3',
    type: 'incident',
    severity: 'critical',
    title: 'INC-2024-0847: SS7 Attack Investigation',
    description: 'Incident created and assigned to Tier-2 analyst team. Initial containment procedures initiated. STP-Algiers traffic being monitored.',
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
    source: 'SOAR Platform',
    relatedEventIds: ['evt-4', 'evt-5'],
    metadata: { assignee: 'A. Benali', priority: 'P1', status: 'Investigating' },
  },
  {
    id: 'evt-4',
    type: 'action',
    severity: 'high',
    title: 'Firewall Rules Updated',
    description: 'Temporary blocking rules applied to suspicious SS7 origin points. Traffic rerouted through monitoring gateway.',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    source: 'Firewall Manager',
    relatedEventIds: ['evt-5'],
    metadata: { rulesAdded: '12', affectedSystems: 'STP-Algiers, MSC-West' },
  },
  {
    id: 'evt-5',
    type: 'response',
    severity: 'medium',
    title: 'Automated Response Executed',
    description: 'SOAR playbook executed: traffic capture enabled, alerts escalated to on-call security team.',
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    source: 'SOAR Platform',
    metadata: { playbook: 'SS7-RESPONSE-v2', actionsTaken: '5' },
  },
  {
    id: 'evt-6',
    type: 'detection',
    severity: 'medium',
    title: 'Fraud Pattern: SIM Box Activity',
    description: 'Potential SIM box operation detected in Oran region. High call volume to international destinations from limited IMSI range.',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    source: 'Fraud Detection System',
    metadata: { region: 'Oran', suspectedLines: '23', destination: 'High-risk countries' },
  },
  {
    id: 'evt-7',
    type: 'alert',
    severity: 'high',
    title: 'Brute Force Attack on MME',
    description: 'Multiple failed authentication attempts detected on MME-Primary. Source IP range appears to be from known botnet.',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    source: 'EDR Collector',
    metadata: { attempts: '15000+', sourceIPs: '847', duration: '4min' },
  },
  {
    id: 'evt-8',
    type: 'action',
    severity: 'low',
    title: 'Rate Limiting Applied',
    description: 'Automatic rate limiting activated on MME authentication endpoints. Normal operations unaffected.',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    source: 'Load Balancer',
    metadata: { threshold: '100 req/s', currentRate: '45 req/s' },
  },
];

export interface ThreatTimelineProps {
  /** Events to display on the timeline */
  events?: TimelineEvent[];
  /** Callback when an event is clicked */
  onEventClick?: (event: TimelineEvent) => void;
  /** Additional CSS classes */
  className?: string;
  /** Default zoom level (default: '24h') */
  defaultZoom?: TimeZoom;
  /** Show filter controls (default: true) */
  showFilters?: boolean;
  /** Maximum height of the timeline container (default: 600) */
  maxHeight?: number;
  /** Auto-scroll to latest event on update (default: true) */
  autoScrollLatest?: boolean;
}

/**
 * ThreatTimeline - Interactive timeline visualization for threat events
 * 
 * Features:
 * - Vertical timeline with zoom controls (1h, 6h, 24h, 7d, 30d)
 * - Color-coded event dots by severity
 * - Expandable event cards with full details
 * - Filter by event type (alert, incident, action, etc.)
 * - Connection lines between related events
 * - Animated appearance for new events
 * - Scroll-to-latest button
 * 
 * @example
 * ```tsx
 * <ThreatTimeline
 *   events={threatEvents}
 *   onEventClick={(event) => showEventDetails(event)}
 *   defaultZoom="24h"
 * />
 * ```
 */
export function ThreatTimeline({
  events = SAMPLE_THREAT_EVENTS,
  onEventClick,
  className,
  defaultZoom = '24h',
  showFilters = true,
  maxHeight = 600,
  autoScrollLatest = true,
}: ThreatTimelineProps) {
  // State management
  const [zoomLevel, setZoomLevel] = useState<TimeZoom>(defaultZoom);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<Set<ThreatEventType>>(
    new Set(Object.keys(EVENT_TYPE_CONFIG) as ThreatEventType[])
  );
  const [scrollToLatestTrigger, setScrollToLatestTrigger] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Sort events by timestamp (newest first for display)
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events]);

  // Filter events based on selected types
  const filteredEvents = useMemo(() => {
    if (filterTypes.size === 0) return sortedEvents;
    return sortedEvents.filter((event) => filterTypes.has(event.type));
  }, [sortedEvents, filterTypes]);

  // Calculate time window based on zoom level
  const timeWindow = useMemo(() => {
    const now = new Date();
    let startTime: Date;
    
    switch (zoomLevel) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return { start: startTime, end: now };
  }, [zoomLevel]);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  // Format absolute time
  const formatAbsoluteTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Toggle event expansion
  const toggleExpand = useCallback(
    (eventId: string) => {
      setExpandedEvents((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) {
          next.delete(eventId);
        } else {
          next.add(eventId);
        }
        return next;
      });
    },
    []
  );

  // Handle filter toggle
  const toggleFilter = useCallback((type: ThreatEventType) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Scroll to latest event
  const handleScrollToLatest = useCallback(() => {
    setScrollToLatestTrigger((prev) => prev + 1);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScrollLatest && scrollToLatestTrigger > 0 && timelineRef.current) {
      timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [scrollToLatestTrigger, autoScrollLatest]);

  // Check if event is recent (for animation)
  const isRecentEvent = useCallback(
    (timestamp: string) => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return new Date(timestamp).getTime() > fiveMinutesAgo;
    },
    []
  );

  // Render event connection line
  const renderConnectionLine = (event: TimelineEvent, index: number) => {
    if (!event.relatedEventIds || index >= filteredEvents.length - 1) return null;

    const hasRelatedBelow = filteredEvents.some(
      (e, i) => i > index && event.relatedEventIds?.includes(e.id)
    );
    
    if (!hasRelatedBelow) return null;

    return (
      <div className="absolute left-[19px] top-full w-0.5 h-6 bg-gradient-to-b from-slate-600 to-transparent z-0" />
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-slate-900/90 backdrop-blur-sm border-slate-700/50 overflow-hidden',
        className
      )}
    >
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">Threat Timeline</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredEvents.length} events
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Control */}
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as TimeZoom)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Scroll to latest */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScrollToLatest}
            className="h-8 text-xs text-slate-400 hover:text-slate-200"
          >
            <ArrowDown className="w-3 h-3 mr-1" />
            Latest
          </Button>
        </div>
      </div>

      {/* Type Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-800/30">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
          {(Object.entries(EVENT_TYPE_CONFIG) as [ThreatEventType, typeof EVENT_TYPE_CONFIG[ThreatEventType]][]).map(
            ([type, config]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  'border transition-colors',
                  filterTypes.has(type)
                    ? `${config.bgColor} ${config.color.replace('#', 'text-')} border-current opacity-100`
                    : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
                )}
                style={
                  filterTypes.has(type)
                    ? { borderColor: config.color, color: config.color }
                    : undefined
                }
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </button>
            )
          )}
        </div>
      )}

      {/* Timeline Container */}
      <div
        ref={timelineRef}
        className="relative overflow-y-auto p-4"
        style={{ maxHeight }}
      >
        {filteredEvents.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No events match the current filters</p>
            <button
              onClick={() => setFilterTypes(new Set(Object.keys(EVENT_TYPE_CONFIG) as ThreatEventType[]))}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Timeline events */
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-700 via-slate-700 to-transparent" />

            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
                const config = EVENT_TYPE_CONFIG[event.type];
                const severityConfig = SEVERITY_CONFIG[event.severity];
                const IconComponent = config.icon;
                const isExpanded = expandedEvents.has(event.id);
                const isRecent = isRecentEvent(event.timestamp);

                return (
                  <div
                    key={event.id}
                    className={cn(
                      'relative pl-12 group',
                      isRecent && 'animate-fade-in'
                    )}
                  >
                    {/* Connection line to related events */}
                    {renderConnectionLine(event, index)}

                    {/* Timeline node */}
                    <div className="absolute left-2.5 top-2 z-10">
                      <div
                        className={cn(
                          'rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110',
                          isExpanded && 'scale-110'
                        )}
                        style={{
                          width: severityConfig.dotSize + 8,
                          height: severityConfig.dotSize + 8,
                          backgroundColor: `${severityConfig.color}20`,
                          borderColor: severityConfig.color,
                        }}
                      >
                        <IconComponent
                          className="w-3 h-3"
                          style={{ color: severityConfig.color }}
                        />
                      </div>
                    </div>

                    {/* Event Card */}
                    <div
                      className={cn(
                        'bg-slate-800/50 rounded-lg border transition-all cursor-pointer hover:bg-slate-800/80',
                        isExpanded ? 'border-slate-600 shadow-lg' : 'border-slate-700/50 hover:border-slate-600'
                      )}
                      style={{ borderLeftColor: severityConfig.color, borderLeftWidth: 3 }}
                      onClick={() => toggleExpand(event.id)}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between p-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider"
                              style={{
                                color: config.color,
                                borderColor: config.color,
                              }}
                            >
                              {config.label}
                            </Badge>
                            <span className="text-[11px] text-slate-500">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-slate-200 truncate">
                            {event.title}
                          </h4>
                          {event.source && (
                            <p className="text-xs text-slate-500 mt-0.5">{event.source}</p>
                          )}
                        </div>

                        <button className="p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 animate-slide-down">
                          {event.description && (
                            <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          {/* Metadata grid */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={key} className="bg-slate-900/50 rounded px-2 py-1.5">
                                  <p className="text-[10px] uppercase text-slate-500 tracking-wider">
                                    {key}
                                  </p>
                                  <p className="text-xs font-medium text-slate-300 mt-0.5">
                                    {String(value)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Timestamp details */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatAbsoluteTime(event.timestamp)}
                            </span>
                            {onEventClick && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <ZoomIn className="w-3 h-3" />
                                View Details
                              </button>
                            )}
                          </div>

                          {/* Related events indicator */}
                          {event.relatedEventIds && event.relatedEventIds.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <Globe className="w-3 h-3" />
                              Connected to {event.relatedEventIds.length} related event(s)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Embedded animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Named export for barrel file
export default ThreatTimeline;
