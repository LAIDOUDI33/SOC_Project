/**
 * Enhanced Visualization Components for National SOC Platform
 * 
 * This module provides advanced graphical components for real-time monitoring
 * dashboards with dark theme support and responsive design.
 * 
 * @module visualizations
 * 
 * @example
 * ```tsx
 * import {
 *   RealTimeMetricsGauge,
 *   LiveAlertsTicker,
 *   NetworkTopologyGraph,
 *   ThreatTimeline,
 *   GeoHeatmap,
 *   SystemResourcesMonitor,
 *   ThreatFeedWidget,
 *   IncidentCommandCenter,
 * } from '@/components/visualizations';
 * ```
 */

// Core Visualization Components
export { RealTimeMetricsGauge } from './RealTimeMetricsGauge';
export type {
  GaugeThreshold,
  RealTimeMetricsGaugeProps,
} from './RealTimeMetricsGauge';

export { LiveAlertsTicker } from './LiveAlertsTicker';
export type {
  AlertItem,
  AlertSeverity,
  LiveAlertsTickerProps,
} from './LiveAlertsTicker';
export { SEVERITY_CONFIG as ALERT_SEVERITY_CONFIG } from './LiveAlertsTicker';

export { NetworkTopologyGraph } from './NetworkTopologyGraph';
export type {
  NodeType,
  NodeStatus,
  NetworkNode,
  NetworkConnection,
  NetworkTopologyGraphProps,
} from './NetworkTopologyGraph';
export {
  NODE_TYPE_CONFIG,
  STATUS_COLORS as NODE_STATUS_COLORS,
  DJEZZY_NETWORK_TOPOLOGY,
} from './NetworkTopologyGraph';

export { ThreatTimeline } from './ThreatTimeline';
export type {
  ThreatEventType,
  EventSeverity,
  TimeZoom,
  TimelineEvent,
  ThreatTimelineProps,
} from './ThreatTimeline';
export {
  EVENT_TYPE_CONFIG as THREAT_EVENT_TYPE_CONFIG,
  SEVERITY_CONFIG as TIMELINE_SEVERITY_CONFIG,
  SAMPLE_THREAT_EVENTS,
} from './ThreatTimeline';

export { GeoHeatmap } from './GeoHeatmap';
export type {
  GeoRegion,
  ThreatType,
  GeoHeatmapProps,
} from './GeoHeatmap';
export {
  THREAT_TYPE_CONFIG as GEO_THREAT_TYPE_CONFIG,
  ALGERIA_REGION_DATA,
} from './GeoHeatmap';

export { SystemResourcesMonitor } from './SystemResourcesMonitor';
export type {
  MetricDataPoint,
  ResourceMetricConfig,
  SystemResourcesMonitorProps,
} from './SystemResourcesMonitor';

// Dashboard Widget Components
export { ThreatFeedWidget } from './ThreatFeedWidget';
export type {
  AttackVector,
  ThreatLevelScore,
  ActiveThreat,
  ThreatFeedWidgetProps,
} from './ThreatFeedWidget';
export {
  ATTACK_VECTOR_CONFIG,
  SAMPLE_THREAT_DATA,
} from './ThreatFeedWidget';

export { IncidentCommandCenter } from './IncidentCommandCenter';
export type {
  IncidentSeverity,
  IncidentStatus,
  IncidentPriority,
  Incident,
  KanbanColumn,
  IncidentCommandCenterProps,
} from './IncidentCommandCenter';
export {
  KANBAN_COLUMNS,
  SEVERITY_CONFIG as INCIDENT_SEVERITY_CONFIG,
  SAMPLE_INCIDENTS,
} from './IncidentCommandCenter';

// Default exports (for convenience)
export { default as RealTimeMetricsGaugeDefault } from './RealTimeMetricsGauge';
export { default as LiveAlertsTickerDefault } from './LiveAlertsTicker';
export { default as NetworkTopologyGraphDefault } from './NetworkTopologyGraph';
export { default as ThreatTimelineDefault } from './ThreatTimeline';
export { default as GeoHeatmapDefault } from './GeoHeatmap';
export { default as SystemResourcesMonitorDefault } from './SystemResourcesMonitor';
export { default as ThreatFeedWidgetDefault } from './ThreatFeedWidget';
export { default as IncidentCommandCenterDefault } from './IncidentCommandCenter';
