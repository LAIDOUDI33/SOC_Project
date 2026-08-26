/**
 * Grafana Monitoring Dashboard Integration - TypeScript Type Definitions
 * Algeria National SOC Platform 2026-2030
 * 
 * Complete type system for:
 * - Dashboard and panel configurations
 * - Data sources (Prometheus, Elasticsearch, MySQL, etc.)
 * - Query types and responses
 * - Alert rule definitions
 * - Annotation types
 * - User/team/organization models
 * - Folder structures
 * - Plugin types
 * - Variable/template types
 * - Datasource query results
 * - Time range configurations
 */

// ============================================================
// Core Dashboard Types
// ============================================================

/** Grafana dashboard unique identifier */
export type DashboardUID = string;

/** Grafana dashboard internal ID */
export type DashboardID = number;

/** Dashboard metadata */
export interface DashboardMeta {
  /** Can the current user edit this dashboard */
  canEdit: boolean;
  /** Can the current user save this dashboard */
  canSave: boolean;
  /** Can the current user make this dashboard a star (favorite) */
  canStar: boolean;
  /** Is this dashboard starred by the current user */
  isStarred: boolean;
  /** Number of users who have starred this dashboard */
  stars: number;
  /** Slug derived from title for URL */
  slug: string;
  /** Dashboard URL path */
  url: string;
  /** Dashboard folder UID if in a folder */
  folderUid?: string;
  /** Folder title if in a folder */
  folderTitle?: string;
  /** Folder URL if in a folder */
  folderUrl?: string;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  updated: string;
  /** User who created the dashboard */
  createdBy: string;
  /** User who last updated the dashboard */
  updatedBy: string;
  /** Version number of the dashboard */
  version: number;
  /** Whether to check for new versions */
  hasAcl: boolean;
  /** Public dashboard enabled */
  publicDashboardEnabled?: boolean;
  /** Public dashboard URL */
  publicDashboardUrl?: string;
}

/** Grafana panel position and size */
export interface GridPos {
  /** Horizontal position (0-indexed) */
  x: number;
  /** Vertical position (0-indexed) */
  y: number;
  /** Width in grid units */
  w: number;
  /** Height in grid units */
  h: number;
  /** Minimum width (optional) */
  minW?: number;
  /** Minimum height (optional) */
  minH?: number;
  /** Maximum width (optional) */
  maxW?: number;
  /** Maximum height (optional) */
  maxH?: number;
}

/** Panel repeat configuration */
export interface PanelRepeatConfig {
  /** Variable to repeat by */
  variableName: string;
  /** Direction of repetition */
  direction: 'horizontal' | 'vertical';
  /** Maximum repetitions */
  maxPerRow?: number;
}

/** Panel options base */
export interface PanelOptions {
  /** Display panel title */
  showTitle?: boolean;
  /** Display legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'bottom' | 'right' | 'hidden';
  /** Legend display mode */
  legendDisplayMode?: 'list' | 'table' | 'hidden';
  /** Tooltip display mode */
  tooltipMode?: 'single' | 'multi' | 'none';
  /** Thresholds display */
  thresholdsStyle?: 'line' | 'area' | 'dashed' | 'none';
  /** Color scheme */
  colorScheme?: string;
  /** Graph orientation */
  orient?: 'auto' | 'vertical' | 'horizontal';
  /** Text alignment (for stat panels) */
  align?: 'auto' | 'left' | 'center' | 'right';
  /** Reduce value calculation */
  reduceOptions?: ReduceOptions;
  /** Sparkline settings */
  sparkline?: SparklineOptions;
  /** No value state text */
  noValue?: string;
}

/** Value reduction options */
export interface ReduceOptions {
  /** Values to include */
  values: boolean;
  /** Fields to calculate on */
  calcs: Array<'lastNotNull' | 'mean' | 'max' | 'min' | 'sum' | 'count' | 'firstNotNull'>;
  /** Current row only */
  current?: boolean;
}

/** Sparkline visualization options */
export interface SparklineOptions {
  /** Enable sparkline */
  enabled: boolean;
  /** Line fill opacity */
  fillOpacity?: number;
  /** Show data points */
  showDataPoints?: boolean;
  /** Line width */
  lineWidth?: number;
  /** Y-axis minimum */
  yAxisMin?: number;
  /** Y-axis maximum */
  yAxisMax?: number;
}

/** Threshold step definition */
export interface ThresholdStep {
  /** Value at which threshold activates */
  value: number;
  /** Color for values above this threshold */
  color: string;
  /** Threshold state */
  state: 'green' | 'yellow' | 'red';
}

/** Threshold configuration */
export interface Thresholds {
  /** Mode: absolute or percentage */
  mode: 'absolute' | 'percentage';
  /** Threshold steps */
  steps: ThresholdStep[];
}

/** Field override rule */
export interface FieldOverrideRule {
  /** Matcher properties */
  matcher: {
    id: string;
    options: Record<string, unknown>;
  };
  /** Properties to override */
  properties: Array<{
    id: string;
    value: unknown;
  }>;
}

/** Data transformation */
export interface DataTransformation {
  /** Transformation ID */
  id: string;
  /** Transformation options */
  options: Record<string, unknown>;
}

/** Query target ref */
export type TargetRefID = string;

/** Standard Grafana panel */
export interface GrafanaPanel {
  /** Panel identifier (unique within dashboard) */
  id: number;
  /** Panel type (graph, table, stat, logs, etc.) */
  type: PanelType;
  /** Panel title */
  title: string;
  /** Grid position */
  gridPos: GridPos;
  /** Panel options (type-specific) */
  options: Record<string, unknown> & Partial<PanelOptions>;
  /** Data targets/queries */
  targets: DataSourceQuery[];
  /** Field overrides */
  fieldConfig?: {
    defaults: Record<string, unknown>;
    overrides: FieldOverrideRule[];
  };
  /** Transformations */
  transformations?: DataTransformation[];
  /** Thresholds */
  thresholds?: Thresholds;
  /** Repeat configuration */
  repeat?: string;
  repeatDirection?: 'horizontal' | 'vertical';
  /** Panel description */
  description?: string;
  /** Whether panel is transparent */
  transparent?: boolean;
  /** Links associated with panel */
  links?: PanelLink[];
  /** Datasource UID (overrides per-target) */
  datasource?: DataSourceRef;
  /** Panel plugin version */
  pluginVersion?: string;
  /** Time from relative to dashboard time */
  timeFrom?: string;
  /** Time shift relative to dashboard time */
  timeShift?: string;
  /** Hide time info */
  hideTimeOverride?: boolean;
  /** Maximum number of data points */
  maxDataPoints?: number;
  /** Interval between data points */
  interval?: string;
  /** Cache timeout */
  cacheTimeout?: string;
}

/** Supported panel types */
export type PanelType =
  // Visualization panels
  | 'timeseries'
  | 'stat'
  | 'gauge'
  | 'bargauge'
  | 'barchart'
  | 'heatmap'
  | 'piechart'
  | 'state-timeline'
  | 'status-history'
  | 'xychart'
  | 'histogram'
  | 'candlestick'
  | 'scatter'
  | 'node-graph'
  | 'flame-graph'
  | 'trace-viewer'
  // Table & log panels
  | 'table'
  | 'logs'
  | 'annotation-list'
  | 'data-links'
  // Geo & map panels
  | 'geomap'
  | 'worldmap'
  // Canvas & custom
  | 'canvas'
  | 'text'
  | 'news'
  | 'dashboard-list'
  // Enterprise panels
  | 'alertgroup'
  | 'alert-list';

/** Panel link configuration */
export interface PanelLink {
  /** Link title */
  title: string;
  /** Link URL or dashboard reference */
  url?: string;
  /** Dashboard UID for internal link */
  dashUid?: string;
  /** Dashboard tab name */
  dashTab?: string;
  /** Open in new tab */
  asDropdown?: boolean;
  /** Include variables in URL */
  keepTime?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Target blank */
  targetBlank?: boolean;
}

/** Complete Grafana dashboard model */
export interface GrafanaDashboard {
  /** Dashboard schema version */
  schemaVersion: number;
  /** Dashboard type */
  type: 'dashdb' | 'direct';
  /** Dashboard UID */
  uid: DashboardUID;
  /** Dashboard title */
  title: string;
  /** Dashboard tags */
  tags: string[];
  /** Dashboard timezone */
  timezone: 'browser' | 'utc' | string;
  /** Refresh interval */
  refresh: RefreshInterval | false;
  /** Time range */
  time: TimeRange;
  /** Time picker configuration */
  timepicker: TimePickerConfig;
  /** Graph tooltip behavior */
  graphTooltip: GraphTooltipMode;
  /** Annotation definitions */
  annotations: AnnotationDefinition[];
  /** Template variables */
  templating: TemplatingConfig;
  /** All panels */
  panels: GrafanaPanel[];
  /** Dashboard metadata */
  meta?: DashboardMeta;
  /** Live refresh settings */
  liveNow?: boolean;
  /** Shared crosshair */
  sharedCrosshair?: boolean;
  /** Editable flag */
  editable?: boolean;
  /** Folders structure */
  folders?: DashboardFolder[];
  /** Links */
  links?: DashboardLink[];
  /** Description */
  description?: string;
  /** Version */
  version?: number;
}

/** Dashboard list/search result item */
export interface DashboardSearchResult {
  /** Dashboard ID */
  id: number;
  /** Dashboard UID */
  uid: DashboardUID;
  /** Dashboard title */
  title: string;
  /** Dashboard URL */
  url: string;
  /** Dashboard type */
  type: 'dash-db' | 'dash-folder' | 'dash-public';
  /** Tags */
  tags: string[];
  /** Is starred */
  isStarred: boolean;
  /** Folder information */
  folderId: number;
  folderUid: string;
  folderTitle: string;
  folderUrl: string;
  /** Sort info */
  sortMeta?: string;
  sortValue?: number;
  sortName?: string;
}

/** Dashboard folder */
export interface DashboardFolder {
  /** Folder ID */
  id: number;
  /** Folder UID */
  uid: string;
  /** Folder title */
  title: string;
  /** Folder URL */
  url: string;
  /** Has ACL */
  hasAcl: boolean;
  /** Can save */
  canSave: boolean;
  /** Can edit */
  canEdit: boolean;
  /** Can admin */
  canAdmin: boolean;
  /** Created by */
  created: string;
  /** Updated by */
  updated: string;
  /** Created timestamp */
  createdBy: string;
  /** Updated by */
  updatedBy: string;
  /** Version */
  version: number;
}

/** Dashboard link */
export interface DashboardLink {
  /** Link type */
  type: 'link' | 'dashboards';
  /** Display as dropdown */
  asDropdown: boolean;
  /** Icon class */
  iconClass: string;
  /** Include time range */
  includeVars: boolean;
  /** Keep time */
  keepTime: boolean;
  /** Tags filter */
  tags: string[];
  /** Target blanks */
  targetBlank: boolean;
  /** Title */
  title: string;
  /** Tooltip */
  tooltip: string;
  /** URL */
  url: string;
  /** Dashboard UID */
  dashUid?: string;
  /** Dashboard URI */
  dashboard?: string;
  /** Panel ID */
  panelId?: number;
}

// ============================================================
// Data Source Types
// ============================================================

/** Data source type identifiers */
export enum DataSourceType {
  PROMETHEUS = 'prometheus',
  ELASTICSEARCH = 'elasticsearch',
  MYSQL = 'mysql',
  POSTGRESQL = 'postgres',
  GRAFANA_POSTGRES = 'grafana-postgresql-datasource',
  INFLUXDB = 'influxdb',
  GRAPHITE = 'graphite',
  LOKI = 'loki',
  TEMPOSTACK = 'tempo',
  JAEGGER = 'jaeger',
  AZURE_MONITOR = 'azuremonitor',
  CLOUDWATCH = 'cloudwatch',
  STACKDRIVER = 'stackdriver',
  DATADOG = 'datadog',
  DYNAMODB = 'dynamodb',
  OPENTSDB = 'opentsdb',
  MYSQL_LEGACY = 'grafana-mysql-datasource',
  MSSQL = 'mssql',
  ORACLE = 'oracle',
  TESTDATA = 'testdata',
  MIXED = 'mixed',
  ALERTMANAGER = 'alertmanager',
}

/** Data source reference (minimal) */
export interface DataSourceRef {
  /** Data source type */
  type: DataSourceType | string;
  /** Data source UID */
  uid: string;
}

/** Full data source configuration */
export interface DataSource {
  /** Database ID */
  id: number;
  /** Organization ID */
  orgId: number;
  /** Unique identifier */
  uid: string;
  /** Display name */
  name: string;
  /** Data source type */
  type: DataSourceType | string;
  /** Type logo URL */
  typeLogoUrl: string;
  /** Access mode */
  access: 'proxy' | 'direct' | 'server';
  /** Default URL */
  url: string;
  /** Password (encrypted) */
  password?: string;
  /** Username */
  user?: string;
  /** Database name */
  database?: string;
  /** Basic auth enabled */
  basicAuth?: boolean;
  /** Basic auth user */
  basicAuthUser?: string;
  /** Basic auth password */
  basicAuthPassword?: boolean;
  /** JSON data (type-specific config) */
  jsonData: Record<string, unknown>;
  /** Secure JSON fields mask */
  secureJsonFields: Record<string, boolean>;
  /** Read-only flag */
  isDefault: boolean;
  /** Version */
  version: number;
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
  /** API health status */
  apiHealthStatus?: DataSourceHealthStatus;
  /** Last test error */
  lastTestError?: string;
  /** Last test result */
  lastTestResult?: DataSourceTestResult;
}

/** Data source health status */
export type DataSourceHealthStatus = 'OK' | 'ERROR' | 'UNKNOWN';

/** Data source test result */
export interface DataSourceTestResult {
  /** Test success */
  success: boolean;
  /** Error message */
  message?: string;
  /** Response details */
  details?: Record<string, unknown>;
}

/** Prometheus-specific data source config */
export interface PrometheusDataSourceConfig {
  /** HTTP method */
  httpMethod: 'GET' | 'POST' | 'POST_for_large_queries';
  /** Query timeout */
  queryTimeout: string;
  /** Cancel queries on navigation */
  cancelOnNavigate: boolean;
  /** Cache TTL */
  cacheLevel: 'Low' | 'Medium' | 'High' | 'None';
  /** Incremental query support */
  incrementalQuerying: boolean;
  /** Disable recording rules */
  disableRecordingRules: boolean;
  /** Exemplar tracking */
  exemplarTraceIdDestinations?: Array<{ name: string; datasourceUid: string }>;
  /** API version */
  promType: 'Prometheus' | 'Cortex' | 'Mimir' | 'Thanos' | 'VictoriaMetrics';
  /** Custom query parameters */
  customQueryParameters?: string;
  /** Manage alerts via UI */
  manageAlerts?: boolean;
  /** PromQL editor */
  promqlEditor?: boolean;
}

/** Elasticsearch-specific data source config */
export interface ElasticsearchDataSourceConfig {
  /** Index pattern */
  index: string;
  /** Time field */
  timeField: string;
  /** Message field */
  messageField?: string;
  /** Version */
  esVersion: string;
  /** Data frame config */
  dataFrameConfig?: {
    /** Max concurrent shard requests */
    maxConcurrentShardRequests: number;
    /** Sample size */
    sampleSize: number;
    /** Scroll duration */
    scrollDuration: string;
    /** Treat fields as numeric */
    treatFieldsAsNumeric: boolean;
    /** Default bucket limit */
    defaultBucketLimit: number;
  };
  /** Log message field */
  logMessageField?: string;
  /** Log level field */
  logLevelField?: string;
  /** Doc key */
  docKey?: string;
  /** Interval */
  interval?: string;
  /** Changed field */
  changedField?: string;
  /** Avoid prefix */
  avoidPrefix?: boolean;
  /** Max concurrent shard requests */
  maxConcurrentShardRequests?: number;
}

/** MySQL/PostgreSQL data source config */
export interface SQLDataSourceConfig {
  /** Database name */
  database: string;
  /** Max open connections */
  maxOpenConns?: number;
  /** Max idle connections */
  maxIdleConns?: number;
  /** Connection max lifetime */
  connMaxLifetime?: number;
  /** TLS config */
  tlsConfig?: {
    /** Enable TLS */
    enableTls: boolean;
    /** Skip TLS verification */
    skipTlsVerify: boolean;
    /** CA certificate */
    caCert?: string;
    /** Client certificate */
    clientCert?: string;
    /** Client key */
    clientKey?: string;
    /** Server name */
    serverName?: string;
  };
  /** PostgreSQL specific */
  postgresVersion?: number;
  /** TimescaleDB mode */
  timescaledb?: boolean;
}

/** Loki data source config */
export interface LokiDataSourceConfig {
  /** Maximum lines */
  maxLines: number;
  /** Derive field names */
  deriveFieldNames: boolean;
  /** Query timeout */
  queryTimeout: string;
  /** Step mode */
  stepMode: 'min' | 'custom';
  /** Step value */
  step?: number;
  /** Custom query parameters */
  customQueryParameters?: string;
}

// ============================================================
// Query Types
// ============================================================

/** Base data source query */
export interface DataSourceQuery {
  /** Reference ID (A, B, C...) */
  refId: TargetRefID;
  /** Hide query from legend */
  hide?: boolean;
  /** Query type (for some datasources) */
  queryType?: string;
  /** Datasource reference */
  datasource?: DataSourceRef;
  /** Raw query expression */
  expr?: string;
  /** Raw SQL query */
  rawSql?: string;
  /** Query format */
  format?: string;
  /** Instant query */
  instant?: boolean;
  /** Range query */
  range?: boolean;
  /** Legend formatter */
  legendFormat?: string;
  /** Interval factor */
  intervalFactor?: number;
  /** Interval */
  interval?: string;
  /** Exemplar */
  exemplar?: boolean;
  /** Request ID */
  requestId?: string;
  /** UTC offset */
  utcOffsetSec?: number;
  /** Editor mode */
  editorMode?: 'code' | 'builder';
  /** Query options */
  options?: Record<string, unknown>;
  /** Additional query parameters */
  [key: string]: unknown;
}

/** Prometheus query */
export interface PrometheusQuery extends DataSourceQuery {
  /** PromQL expression */
  expr: string;
  /** Instant query flag */
  instant?: boolean;
  /** Range flag */
  range?: boolean;
  /** Legend format */
  legendFormat?: string;
  /** Interval */
  interval?: string;
  /** Exemplar flag */
  exemplar?: boolean;
  /** Request ID */
  requestId?: string;
  /** UTC offset */
  utcOffsetSec?: number;
  /** Query type */
  queryType?: string;
}

/** Elasticsearch query */
export interface ElasticsearchQuery extends DataSourceQuery {
  /** Query type */
  query: string;
  /** Index pattern override */
  indexOverride?: string;
  /** Alias pattern */
  alias?: string;
  /** Metrics */
  metrics: Array<{
    id: string;
    type: 'count' | 'avg' | 'sum' | 'min' | 'max' | 'value_count' | 'cardinality' | 'percentiles' | 'derivative' | 'cumulative_sum' | 'moving_avg' | 'rate';
    settings?: Record<string, unknown>;
  }>;
  /** Bucket aggregations */
  bucketAggs: Array<{
    id: string;
    type: 'date_histogram' | 'filters' | 'terms' | 'histogram' | 'range' | 'geohash_grid';
    settings: Record<string, unknown>;
  }>;
  /** Time field */
  timeField?: string;
  /** Change detection fields */
  changeDetectionFields?: string[];
}

/** Loki query */
export interface LokiQuery extends DataSourceQuery {
  /** LogQL expression */
  expr: string;
  /** Query type */
  queryType?: 'range' | 'instant';
  /** Maximum lines */
  maxLines?: number;
  /** Stream rate limit */
  streamRateLimitMs?: number;
}

/** SQL query */
export interface SQLQuery extends DataSourceQuery {
  /** SQL statement */
  rawSql: string;
  /** SQL dialect */
  sqlLanguage?: string;
  /** Columns formatting */
  columns?: Array<{ text: string; type: string }>;
}

/** Generic query result */
export interface QueryResult<T = unknown> {
  /** Reference ID matching query */
  refId: TargetRefID;
  /** Result frames */
  data: DataFrame[];
  /** Error if any */
  error?: QueryError;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/** Data frame (column-oriented) */
export interface DataFrame {
  /** Frame name */
  name?: string;
  /** Frame labels */
  labels?: Record<string, string>;
  /** Columns */
  fields: Field[];
  /** Metadata */
  meta?: Record<string, unknown>;
  /** Total rows */
  length: number;
}

/** Field in a data frame */
export interface Field {
  /** Field name */
  name: string;
  /** Field type */
  type: FieldType;
  /** Field config */
  config?: FieldConfig;
  /** Values array */
  values: unknown[];
  /** Labels */
  labels?: Record<string, string>;
}

/** Field types */
export type FieldType =
  | 'time'
  | 'number'
  | 'string'
  | 'boolean'
  | 'enum'
  | 'traceid'
  | 'spanid'
  | 'other'
  | 'uint64'
  | 'numeric';

/** Field configuration */
export interface FieldConfig {
  /** Display name */
  displayName?: string;
  /** Unit */
  unit?: string;
  /** Decimals */
  decimals?: number;
  /** Min value */
  min?: number;
  /** Max value */
  max?: number;
  /** Mappings */
  mappings?: ValueMapping[];
  /** Thresholds */
  thresholds?: Thresholds;
  /** No value */
  noValue?: string;
  /** Color mode */
  color?: FieldColorConfig;
  /** Custom */
  custom?: Record<string, unknown>;
}

/** Value mapping */
export interface ValueMapping {
  /** Mapping type */
  type: 'value' | 'range' | 'regex' | 'special' | 'hide';
  /** Options based on type */
  options: Record<string, unknown>;
  /** Result value */
  result: ValueMappingResult;
}

/** Value mapping result */
export interface ValueMappingResult {
  /** Text */
  text: string;
  /** Color */
  color?: string;
  /** Icon */
  icon?: string;
  /** Index */
  index?: number;
}

/** Field color configuration */
export interface FieldColorConfig {
  /** Mode */
  mode: 'thresholds' | 'palette-classic' | 'palette-spectral' | 'continuous-GrYlRd' | 'continuous-RdYlGr' | 'continuous-blues' | 'continuous-reds' | 'continuous-greens' | 'fixed' | 'series-name' | 'dark-plus' | 'light-plus' | 'thresholds-by-value';
  /** Fixed color */
  fixedColor?: string;
  /** Card color */
  cardColor?: string;
  /** Color scheme */
  colorScheme?: string;
  /** Gradient mode */
  gradientMode?: 'none' | 'opacity' | 'hue' | 'scheme';
  /** Reverse colors */
  reverse?: boolean;
  /** Steps */
  steps?: number;
  /** Min/max */
  min?: number;
  max?: number;
  /** Thresholds */
  thresholds?: { value: number; color: string }[];
}

/** Query error */
export interface QueryError {
  /** Error message */
  message: string;
  /** Error code */
  code?: number;
  /** Error data */
  data?: unknown;
  /** Ref IDs that failed */
  refIds?: string[];
}

// ============================================================
// Alert Rule Types
// ============================================================

/** Alert rule state */
export type AlertState = 
  | 'normal'
  | 'pending'
  | 'alerting'
  | 'no_data'
  | 'error'
  | 'ok'
  | 'paused'
  | 'unknown';

/** Alert rule execution mode */
export type ExecutionMode = 'Scheduled' | 'EvaluationGroup' | 'Alerting' | 'Recovery';

/** Alert evaluation condition */
export interface AlertCondition {
  /** Condition type */
  type: 'query' | 'reduce' | 'math' | 'threshold';
  /** Query reference */
  query?: {
    params: string[];
  };
  /** Reducer */
  reducer?: {
    type: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'last' | 'median' | 'diff' | 'percent_diff' | 'count_non_null' | 'step' | 'range';
    params: string[];
  };
  /** Evaluator */
  evaluator?: {
    type: 'gt' | 'lt' | 'within_range' | 'outside_range' | 'no_value' | 'is_above' | 'is_below';
    params: number[] | string[];
  };
  /** Operator */
  operator?: {
    type: 'and' | 'or';
  };
  /** Conditions (nested) */
  conditions?: AlertCondition[];
}

/** Alert notification channel */
export interface AlertNotificationChannel {
  /** Channel UID */
  uid: string;
  /** Resolved flag */
  resolvedMessage?: boolean;
  /** Group wait */
  groupWait?: string;
  /** Group interval */
  groupInterval?: string;
  /** Repeat interval */
  repeatInterval?: string;
  /** Frequency */
  frequency?: string;
  /** Mute timings */
  muteTimings?: string[];
  /** Group by */
  groupBy?: string[];
  /** Policy */
  policy?: string[];
}

/** Alert rule definition */
export interface AlertRule {
  /** Rule ID */
  id: number;
  /** Rule UID */
  uid: string;
  /** Organization ID */
  orgId: number;
  /** Folder ID */
  folderId: number;
  /** Folder UID */
  folderUid: string;
  /** Rule name */
  title: string;
  /** Condition */
  condition: string;
  /** Data queries */
  data: Array<Record<string, unknown>>;
  /** Rule group */
  ruleGroup: string;
  /** No data state */
  noDataState: 'NoData' | 'Alerting' | 'Ok';
  /** Exec error state */
  execErrState: 'Alerting' | 'Ok';
  /** For duration */
  for: string;
  /** Annotations */
  annotations: Record<string, string>;
  /** Labels */
  labels: Record<string, string>;
  /** Is paused */
  isPaused: boolean;
  /** Current state */
  currentState: AlertState;
  /** State since timestamp */
  stateSince: string;
  /** State changes count */
  stateChangesCount: number;
  /** Evaluation frequency */
  intervalSeconds: number;
  /** Notification settings */
  notifications: AlertNotificationChannel[];
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
  /** Version */
  version: number;
  /** Health */
  health: 'ok' | 'error' | 'nodata' | 'unknown';
  /** Last evaluation */
  lastEvaluation?: string;
  /** Next evaluation */
  nextEvaluation?: string;
  /** Evaluation data */
  evalData?: AlertEvalData;
}

/** Alert evaluation data */
export interface AlertEvalData {
  /** Evaluation count */
  evaluationCount: number;
  /** Current state */
  currentState: AlertState;
  /** Pending count */
  pendingCount: number;
  /** Alerting count */
  alertingCount: number;
  /** Ok count */
  okCount: number;
  /** No data count */
  noDataCount: number;
  /** Error count */
  errorCount: number;
  /** Last evaluation duration */
  lastEvaluationDuration?: number;
}

/** Alert incident */
export interface AlertIncident {
  /** Incident ID */
  id: number;
  /** Alert rule ID */
  alertRuleUID: string;
  /** Alert rule name */
  ruleName: string;
  /** Organization ID */
  orgId: number;
  /** Start time */
  startedAt: string;
  /** End time (if resolved) */
  endedAt?: string;
  /** State during incident */
  stateDuringIncident: AlertState;
  /** Resolved by */
  resolvedBy?: string;
  /** Current state */
  currentState: AlertState;
  /** Labels */
  labels: Record<string, string>;
  /** Annotations */
  annotations: Record<string, string;
  /** Assignment */
  assignedTo?: string;
  /** Creator */
  creator?: string;
  /** Severity */
  severity?: AlertSeverity;
}

/** Alert severity levels */
export type AlertSeverity = 'critical' | 'high' | 'warning' | 'info' | 'none';

/** Alert history entry */
export interface AlertHistoryEntry {
  /** Entry ID */
  id: number;
  /** Timestamp */
  timestamp: string;
  /** Previous state */
  previousState: AlertState;
  /** New state */
  newState: AlertState;
  /** Rule ID */
  ruleId: number;
  /** Rule UID */
  ruleUID: string;
  /** Rule name */
  ruleName: string;
  /** Rule group */
  ruleGroup: string;
  /** Folder ID */
  folderId: number;
  /** Organization ID */
  orgId: number;
  /** Info */
  info: string;
  /** Duration seconds */
  durationSeconds: number;
  /** Labels */
  labels: Record<string, string>;
  /** Annotations */
  annotations: Record<string, string>;
  /** Data */
  data: Record<string, unknown>;
  /** Version */
  version: number;
}

/** Contact point / notification channel */
export interface ContactPoint {
  /** Channel ID */
  id: number;
  /** Channel UID */
  uid: string;
  /** Organization ID */
  orgId: number;
  /** Channel name */
  name: string;
  /** Settings */
  settings: Record<string, unknown>;
  /** Disable resolve message */
  disableResolveMessage?: boolean;
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
}

/** Mute timing */
export interface MuteTiming {
  /** Timing ID */
  id: number;
  /** Timing UID */
  uid: string;
  /** Name */
  name: string;
  /** Time intervals */
  timeIntervals: TimeInterval[];
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
}

/** Time interval for muting */
export interface TimeInterval {
  /** Start time */
  start_time: string;
  /** End time */
  end_time: string;
  /** Weekdays */
  weekdays: string[];
  /** Months */
  months: number[];
  /** Days of year */
  days_of_year: string[];
  /** Days of month */
  days_of_month: number[];
  /** Years */
  years: number[];
  /** Location */
  location: string;
}

/** Notification policy tree */
export interface NotificationPolicyTree {
  /** Default contact point */
  defaultContactPointUID: string;
  /** Routes */
  routes: PolicyRoute[];
  /** Parent route */
  parent?: PolicyRoute;
}

/** Policy route */
export interface PolicyRoute {
  /** Route receiver */
  receiver: string;
  /** Route object matchers */
  objectMatchers: ObjectMatcher[];
  /** Child routes */
  routes?: PolicyRoute[];
  /** Continue on match */
  continue: boolean;
  /** Mute time intervals */
  muteTimeIntervals: string[];
  /** Group by */
  groupBy: string[];
  /** Group wait */
  groupWait: string;
  /** Group interval */
  groupInterval: string;
  /** Repeat interval */
  repeatInterval: string;
  /** Route ID */
  id: string;
}

/** Object matcher for routing */
export interface ObjectMatcher {
  /** Matcher type */
  type: '=' | '!=' | '=~' | '!~';
  /** Label name */
  name: string;
  /** Label value */
  value: string;
}

// ============================================================
// Annotation Types
// ============================================================

/** Annotation definition in dashboard */
export interface AnnotationDefinition {
  /** Definition name */
  name: string;
  /** Enable annotation */
  enable: boolean;
  /** Datasource */
  datasource?: DataSourceRef | null;
  /** Show in dashboard */
  showIn: number;
  /** Hide in dashboard */
  hideIn: number;
  /** Icon color */
  iconColor: string;
  /** Line color */
  lineColor?: string;
  /** Query type */
  queryType?: string;
  /** Expression */
  expr?: string;
  /** Step */
  step?: string;
  /** Tag keys */
  tagKeys?: string;
  /** Title template */
  titleTemplate?: string;
  /** Text template */
  textTemplate?: string;
  /** Snapshot endpoint */
  snapshotEndpoint?: string;
  /** Tooltip style */
  tooltipStyle?: 'default' | 'multiline';
  /** Target */
  target?: DataSourceQuery;
  /** Built-in type */
  builtIn?: number;
  /** Type */
  type?: 'dashboard' | 'annotation' | 'tags';
  /** Tags */
  tags?: string[];
  /** Text */
  text?: string;
  /** Editable */
  editable?: boolean;
  /** Filter by dashboard */
  filterByDashboardIds?: number[];
}

/** Saved annotation */
export interface SavedAnnotation {
  /** Annotation ID */
  id: number;
  /** Alert ID */
  alertId?: number;
  /** Dashboard ID */
  dashboardId: number;
  /** Dashboard UID */
  dashboardUID: number;
  /** Panel ID */
  panelId?: number;
  /** User ID */
  userId: number;
  /** Username */
  username: string;
  /** Email */
  email: string;
  /** Text */
  text: string;
  /** Epoch millisecond */
  epoch: number;
  /** Region ID */
  regionId: number;
  /** Time */
  time: number;
  /** Time end (for range annotations) */
  timeEnd?: number;
  /** New state */
  newState: string;
  /** Previous state */
  prevState: string;
  /** Category */
  category: string;
  /** Tags */
  tags: string[];
  /** Data */
  data: Record<string, unknown>;
  /** Edited by */
  editedBy?: string;
  /** Updated */
  updated: number;
  /** Alert alertId */
  alertAlertId?: number;
  /** Alert name */
  alertName?: string;
  /** Alert state */
  alertState?: string;
  /** Alert URL */
  alertUrl?: string;
  /** Is region */
  isRegion: boolean;
  /** Source */
  source: 'alert' | 'annotation' | 'manual';
}

// ============================================================
// Template/Variable Types
// ============================================================

/** Template variable types */
export type VariableType =
  | 'query'
  | 'interval'
  | 'custom'
  | 'constant'
  | 'datasource'
  | 'adhoc'
  | 'textbox'
  | 'system';

/** Variable refresh options */
export type VariableRefresh =
  | 'on_dashboard_load'
  | 'on_time_range_changed'
  | 'never';

/** Variable hide options */
export type VariableHide = 0 | 1 | 2; // 0=show, 1=label, 2=hide

/** Variable selection options */
export type VariableIncludeAll = boolean;

/** Multi-value option */
export type VariableMultiValue = boolean;

/** Base template variable */
export interface TemplateVariable {
  /** Variable name */
  name: string;
  /** Variable type */
  type: VariableType;
  /** Display label */
  label?: string;
  /** Hide option */
  hide: VariableHide;
  /** Current value(s) */
  current: VariableValue | VariableValue[];
  /** Options */
  options: VariableOption[];
  /** Query parameters */
  query: string;
  /** Regex filter */
  regex?: string;
  /** Sort order */
  sort: number;
  /** Tag values query */
  tagValuesQuery?: string;
  /** Tags query */
  tagsQuery?: string;
  /** Tags */
  tags?: string[];
  /** Use tags */
  useTags?: boolean;
  /** Tag prefix */
  tagPrefix?: string;
  /** Multi-value allowed */
  multi: VariableMultiValue;
  /** Include all option */
  includeAll: VariableIncludeAll;
  /** All value text */
  allValue?: string;
  /** Datasource */
  datasource?: DataSourceRef | null;
  /** Refresh trigger */
  refresh: VariableRefresh;
  /** Plugin ID */
  pluginId?: string;
  /** Plugin type */
  pluginType?: string;
  /** Skip URL sync */
  skipUrlSync?: boolean;
  /** Definition (for custom vars) */
  definition?: string;
  /** Current text value */
  currentText?: string;
  /** Root section */
  root?: TemplateSection;
}

/** Variable option */
export interface VariableOption {
  /** Option text */
  text: string;
  /** Option value */
  value: string;
  /** Selected flag */
  selected: boolean;
}

/** Variable value (can be string or number) */
export type VariableValue = string | number;

/** Template section */
export interface TemplateSection {
  /** Section type */
  type: string;
  /** Section title */
  title: string;
  /** Collapse option */
  collapsed: boolean;
  /** Grid position */
  gridPos: GridPos;
  /** Variables */
  variables: TemplateVariable[];
  /** Sub-sections */
  sections?: TemplateSection[];
}

/** Complete templating configuration */
export interface TemplatingConfig {
  /** List of template variables */
  list: TemplateVariable[];
}

// ============================================================
// Time Range Types
// ============================================================

/** Time range configuration */
export interface TimeRange {
  /** From time (relative or absolute) */
  from: string;
  /** To time (relative or absolute) */
  to: string;
  /** Raw from */
  raw?: TimeRangeRaw;
  /** Raw to */
  raw?: TimeRangeRaw;
}

/** Raw time range value */
export interface TimeRangeRaw {
  /** From value */
  from: string;
  /** To value */
  to: string;
}

/** Time picker configuration */
export interface TimePickerConfig {
  /** Hidden flag */
  hidden: boolean;
  /** Refresh intervals available */
  refresh_intervals: string[];
  /** Time options */
  time_options: string[];
  /** Now delay */
  nowDelay?: string;
  /** Now button */
  nowButton?: boolean;
  /** Collapse */
  collapse?: boolean;
}

/** Refresh interval options */
export type RefreshInterval =
  | ''
  | '5s'
  | '10s'
  | '30s'
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '1d';

/** Graph tooltip modes */
export type GraphTooltipMode =
  | 'single'
  | 'multi'
  | 'crosshairs'
  | 'single_crosshair'
  | 'multi_crosshair';

// ============================================================
// User & Organization Types
// ============================================================

/** Grafana user role */
export type UserRole = 
  | 'Viewer'
  | 'Editor'
  | 'Admin'
  | 'SuperAdmin'
  | 'None';

/** Grafana user */
export interface GrafanaUser {
  /** User ID */
  id: number;
  /** User email */
  email: string;
  /** Login name */
  login: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Is Grafana admin */
  isGrafanaAdmin: boolean;
  /** Is disabled */
  isDisabled: boolean;
  /** Is external user */
  isExternal: boolean;
  /** Auth module */
  authModule: string;
  /** Auth ID */
  authId: string;
  /** Organization ID */
  orgId: number;
  /** Organization role */
  orgRole: UserRole;
  /** Organizations */
  organizations: UserOrganization[];
  /** Last seen at */
  lastSeenAt: string;
  /** Last seen at age (human readable) */
  lastSeenAtAge: string;
  /** Created at */
  createdAt: string;
  /** Updated at */
  updatedAt: string;
  /** Theme */
  theme: string;
  /** Language */
  language: string;
  /** Help flags */
  helpFlags1: number;
  /** Timezone */
  timezone: string;
  /** Starred dashboards */
  starredDashboards: DashboardSearchResult[];
  /** Has edit permission in folders */
  hasEditPermissionInFolders: boolean;
}

/** User's organization membership */
export interface UserOrganization {
  /** Organization ID */
  orgId: number;
  /** Organization name */
  name: string;
  /** Role in organization */
  role: UserRole;
  /** Is current organization */
  current: boolean;
}

/** Grafana organization */
export interface GrafanaOrganization {
  /** Organization ID */
  id: number;
  /** Organization name */
  name: string;
  /** Address */
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zipCode?: string;
    state?: string;
    country?: string;
  };
  /** Created at */
  createdAt: string;
  /** Updated at */
  updatedAt: string;
}

/** Team */
export interface GrafanaTeam {
  /** Team ID */
  id: number;
  /** Organization ID */
  orgId: string;
  /** Team name */
  name: string;
  /** Email */
  email: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Member count */
  memberCount: number;
  /** Access control */
  accessControl: {
    /** Can add members */
    addMember: boolean;
    /** Can delete team */
    deleteTeam: boolean;
  };
}

/** Team member */
export interface TeamMember {
  /** Member ID */
  memberId: number;
  /** Auth ID */
  authId: string;
  /** User ID */
  userId: number;
  /** Email */
  email: string;
  /** Login */
  login: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Labels */
  labels: string[];
  /** Role in team */
  teamRole: 'Viewer' | 'Editor' | 'Admin';
  /** Permission level */
  permission: number;
  /** External user */
  isExternal: boolean;
}

// ============================================================
// Plugin Types
// ============================================================

/** Plugin type */
export type PluginType = 
  | 'app'
  | 'panel'
  | 'datasource'
  | 'app-internal'
  | 'renderer'
  | 'extension';

/** Plugin state */
export type PluginState = 
  | 'installed'
  | 'uninstalled'
  | 'decommissioned'
  | 'core';

/** Grafana plugin */
export interface GrafanaPlugin {
  /** Plugin ID */
  id: string;
  /** Plugin type */
  type: PluginType;
  /** Plugin name */
  name: string;
  /** Plugin info */
  info: PluginInfo;
  /** Plugin dependencies */
  dependencies: PluginDependency[];
  /** Latest version */
  latestVersion?: string;
  /** Has update */
  hasUpdate: boolean;
  /** Is installed */
  isInstalled: boolean;
  /** Is core */
  isCore: boolean;
  /** Is deprecated */
  isDeprecated: boolean;
  /** Is enterprise */
  isEnterprise: boolean;
  /** Is managed */
  isManaged: boolean;
  /** Is enabled */
  isEnabled: boolean;
  /** Requires signing */
  requiresSigning: boolean;
  /** Signature */
  signature?: PluginSignature;
  /** Signature type */
  signatureType?: string;
  /** Has signature */
  hasSignature: boolean;
  /** Signature org */
  signatureOrg?: string;
  /** Grace period */
  gracePeriod: boolean;
  /** Update URL */
  updateURL?: string;
  /** JSON data */
  jsonData: Record<string, unknown>;
  /** Secure JSON fields */
  secureJsonFields: Record<string, boolean>;
  /** Module */
  module: string;
  /** State */
  state: PluginState;
  /** Created date */
  created: string;
  /** Updated date */
  updated: string;
}

/** Plugin info */
export interface PluginInfo {
  /** Author */
  author: {
    name: string;
    url?: string;
  };
  /** Description */
  description: string;
  /** Links */
  links: Array<{ name: string; url: string }>;
  /** Screenshots */
  screenshots: Array<{ name: string; path: string }>;
  /** Logo */
  logos: Record<string, string>;
  /** Build info */
  build: {
    time: string;
    repo: string;
    branch: string;
    hash: string;
    version: string;
  };
  /** License */
  license: string;
  /** Keywords */
  keywords: string[];
  /** Version */
  version: string;
  /** Grafana version requirement */
  grafanaVersion: string;
  /** Minimum Grafana version */
  minGrafanaVersion?: string;
  /** Subtitle */
  subtitle?: string;
}

/** Plugin dependency */
export interface PluginDependency {
  /** Dependency ID */
  id: string;
  /** Dependency type */
  type: PluginType;
  /** Required version */
  version: string;
}

/** Plugin signature */
export interface PluginSignature {
  /** Signed */
  signed: boolean;
  /** Signer */
  signer: string;
  /** Allowed to sign */
  allowedToSign: boolean;
  /** Grace period date */
  gracePeriodDate?: string;
}

// ============================================================
// Search & Filtering Types
// ============================================================

/** Dashboard search parameters */
export interface DashboardSearchParams {
  /** Search query string */
  query?: string;
  /** Tag filter */
  tag?: string[];
  /** Type filter */
  type?: 'dash-db' | 'dash-folder' | 'dash-public';
  /** Folder filter */
  folderIds?: number[];
  /** Limit results */
  limit?: number;
  /** Page number */
  page?: number;
  /** Sort field */
  sort?: 'title' | 'sortAlphaAsc' | 'sortAlphaDesc' | 'sortNatAsc' | 'sortNatDesc' | 'sortSizeAsc' | 'sortSizeDesc' | 'sortChangedAsc' | 'sortChangedDesc';
  /** Starred only */
  starred?: boolean;
}

/** Alert search parameters */
export interface AlertSearchParams {
  /** Dashboard UID filter */
  dashboardUID?: string;
  /** Panel ID filter */
  panelId?: number;
  /** Folder ID filter */
  folderId?: number;
  /** Query filter */
  query?: string;
  /** State filter */
  state?: AlertState;
  /** Limit */
  limit?: number;
  /** Page */
  page?: number;
}

/** Datasource search parameters */
export interface DatasourceSearchParams {
  /** Datasource type filter */
  type?: string;
  /** Name filter */
  name?: string;
  /** Access filter */
  access?: 'proxy' | 'direct' | 'server';
  /** Only show accessible */
  accessibleOnly?: boolean;
}

// ============================================================
// Provisioning Types
// ============================================================

/** Dashboard provisioning configuration */
export interface DashboardProvisioning {
  /** Provider name */
  name: string;
  /** Disable deletion */
  disableDeletion: boolean;
  /** Allow UI updates */
  allowUiUpdates: boolean;
  /** Folder */
  folder: string;
  /** Type */
  type: string;
  /** Options */
  options: {
    /** Path to dashboard files */
    path: string;
    /** Folders from files structure */
    foldersFromFilesStructure: boolean;
  };
  /** Update interval seconds */
  updateIntervalSeconds?: number;
}

/** Datasource provisioning configuration */
export interface DatasourceProvisioning {
  /** Provider name */
  name: string;
  /** Disable deletion */
  disableDeletion: boolean;
  /** Update interval seconds */
  updateIntervalSeconds?: number;
  /** Datasources */
  datasources: DataSource[];
}

/** Alert rule provisioning configuration */
export interface AlertProvisioning {
  /** Provider name */
  name: string;
  /** Disable deletion */
  disableDeletion: boolean;
  /** Folder */
  folder: string;
  /** Rules file */
  file: string;
}

// ============================================================
// API Response Types
// ============================================================

/** Standard API response wrapper */
export interface GrafanaAPIResponse<T> {
  /** Success flag */
  success: boolean;
  /** Message */
  message: string;
  /** Response data */
  data: T;
  /** Pagination info */
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  /** Errors */
  errors?: Array<{ field: string; message: string }>;
}

/** Dashboard save response */
export interface DashboardSaveResponse {
  /** Dashboard ID */
  id: number;
  /** Dashboard slug */
  slug: string;
  /** Status */
  status: string;
  /** Version */
  version: number;
  /** Message */
  message: string;
}

/** Dashboard import response */
export interface DashboardImportResponse {
  /** Import result */
  imported: boolean;
  /** Import status */
  importStatus: string;
  /** Import message */
  importMessage: string;
  /** Imported URL */
  importedUrl: string;
  /** Imported slug */
  importedSlug: string;
  /** Existing revision */
  existingRevision?: number;
  /** New revision */
  newRevision?: number;
  /** Overwritten flag */
  overwritten: boolean;
}

/** Bulk operation result */
export interface BulkOperationResult {
  /** Success count */
  successCount: number;
  /** Failed count */
  failedCount: number;
  /** Errors */
  errors: Array<{ item: string; reason: string }>;
}

// ============================================================
// SOC-Specific Types
// ============================================================

/** SOC KPI metric */
export interface SOCKpiMetric {
  /** Metric ID */
  id: string;
  /** Metric name */
  name: string;
  /** Description */
  description: string;
  /** Current value */
  currentValue: number;
  /** Previous value */
  previousValue?: number;
  /** Unit */
  unit: string;
  /** Trend direction */
  trend: 'up' | 'down' | 'stable';
  /** Trend percentage */
  trendPercent?: number;
  /** Status */
  status: 'good' | 'warning' | 'critical';
  /** Source system */
  sourceSystem: SOCDashboardSource;
  /** Last updated */
  lastUpdated: string;
}

/** SOC dashboard source systems */
export type SOCDashboardSource =
  | 'wazuh'
  | 'suricata'
  | 'misp'
  | 'thehive'
  | 'elasticsearch'
  | 'prometheus'
  | 'grafana'
  | 'combined';

/** SOC overview statistics */
export interface SOCOverviewStats {
  /** Total security events today */
  eventsToday: number;
  /** Events compared to yesterday */
  eventsChangePercent: number;
  /** Active incidents */
  activeIncidents: number;
  /** Critical alerts */
  criticalAlerts: number;
  /** Threat intelligence IOCs */
  iocCount: number;
  /** Monitored endpoints */
  monitoredEndpoints: number;
  /** Network sensors online */
  onlineSensors: number;
  /** System health score */
  healthScore: number;
  /** Average response time (minutes) */
  avgResponseTime: number;
  /** Uptime percentage */
  uptime: number;
  /** Data processed (GB) */
  dataProcessed: number;
  /** Alerts by severity */
  alertsBySeverity: Record<string, number>;
  /** Events by category */
  eventsByCategory: Record<string, number>;
  /** Top threat actors */
  topThreatActors: Array<{ name: string; count: number }>;
  /** Recent activity timeline */
  recentActivity: TimelineEvent[];
}

/** Timeline event for SOC dashboard */
export interface TimelineEvent {
  /** Event timestamp */
  timestamp: string;
  /** Event type */
  type: 'alert' | 'incident' | 'ioc' | 'system' | 'threat';
  /** Event title */
  title: string;
  /** Event description */
  description: string;
  /** Severity */
  severity: AlertSeverity;
  /** Source */
  source: SOCDashboardSource;
  /** Source ID */
  sourceId: string;
  /** URL for more details */
  url?: string;
}

/** Embedded dashboard configuration */
export interface EmbeddedDashboardConfig {
  /** Dashboard UID */
  dashboardUid: string;
  /** Panel ID (for single panel embedding) */
  panelId?: number;
  /** Initial time range */
  initialTime?: TimeRange;
  /** Initial variables */
  initialVariables?: Record<string, string>;
  /** Theme */
  theme?: 'light' | 'dark' | 'current';
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Auto-refresh */
  autoRefresh?: RefreshInterval;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Show time picker */
  showTimePicker?: boolean;
  /** Show header */
  showHeader?: boolean;
}

// ============================================================
// Mock Data Types
// ============================================================

/** Mock dashboard for development */
export interface MockDashboard extends Omit<GrafanaDashboard, 'panels'> {
  /** Simplified panels for mock */
  panels: MockPanel[];
}

/** Mock panel with simplified structure */
export interface MockPanel {
  id: number;
  type: PanelType;
  title: string;
  gridPos: GridPos;
  /** Mock data for preview */
  mockData?: MockDataPoint[];
  /** Target value (for stat panels) */
  targetValue?: number;
  /** Previous value */
  previousValue?: number;
  /** Unit */
  unit?: string;
  /** Trend */
  trend?: 'up' | 'down' | 'stable';
  /** Status indicator */
  status?: 'good' | 'warning' | 'critical';
}

/** Mock data point */
export interface MockDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}
