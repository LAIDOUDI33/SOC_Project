/**
 * Suricata IDS/IPS Type Definitions
 * National SOC Platform - Algeria 2026-2030
 * 
 * Complete TypeScript types for:
 * - EVE JSON log format (Suricata's unified output)
 * - Alert classification and severity
 * - Rule management
 * - Signature metadata
 * - Statistics and metrics
 * - Network flow data
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/** Alert severity levels based on priority and impact */
export enum SeverityLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFORMATIONAL = 'informational'
}

/** Alert classification categories */
export enum AlertCategory {
  MALWARE = 'malware',
  EXPLOIT = 'exploit',
  RECONNAISSANCE = 'reconnaissance',
  DENIAL_OF_SERVICE = 'denial_of_service',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALY = 'anomaly',
  PHISHING = 'phishing',
  COMMAND_AND_CONTROL = 'command_and_control',
  DATA_EXFILTRATION = 'data_exfiltration',
  UNKNOWN = 'unknown'
}

/** Attack vectors for MITRE ATT&CK mapping */
export enum AttackVector {
  NETWORK = 'network',
  ADJACENT = 'adjacent',
  LOCAL = 'local',
  PHYSICAL = 'physical'
}

/** Protocol types */
export enum Protocol {
  TCP = 'TCP',
  UDP = 'UDP',
  ICMP = 'ICMP',
  HTTP = 'HTTP',
  DNS = 'DNS',
  TLS = 'TLS',
  SMB = 'SMB',
  DHCP = 'DHCP',
  SSH = 'SSH',
  FTP = 'FTP',
  SMTP = 'SMTP',
  UNKNOWN = 'UNKNOWN'
}

/** Rule actions */
export enum RuleAction {
  ALERT = 'alert',
  DROP = 'drop',
  REJECT = 'reject',
  PASS = 'pass'
}

/** Rule states */
export enum RuleState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TESTING = 'testing'
}

/** EVE JSON event types */
export enum EveEventType {
  ALERT = 'alert',
  HTTP = 'http',
  DNS = 'dns',
  TLS = 'tls',
  FILES = 'files',
  FLOW = 'flow',
  NETFLOW = 'netflow',
  ANomalY = 'anomaly',
  EXTRACTED = 'extracted',
  SMTP = 'smtp',
  FTP = 'ftp',
  SSH = 'ssh',
  DHCP = 'dhcp',
  SIP = 'sip',
  MQTT = 'mqtt'
}

/** Signature sources */
export enum SignatureSource {
  ETOPEN = 'etopen',
  ETPRO = 'etpro',
  TALOS = 'talos',
  CUSTOM = 'custom',
  COMMUNITY = 'community'
}

/** Severity configuration mapping */
export const SEVERITY_CONFIG: Record<SeverityLevel, {
  color: string;
  icon: string;
  score: number;
  responseTime: string;
}> = {
  [SeverityLevel.CRITICAL]: {
    color: '#DC2626',
    icon: '🔴',
    score: 100,
    responseTime: '< 15 minutes'
  },
  [SeverityLevel.HIGH]: {
    color: '#EA580C',
    icon: '🟠',
    score: 75,
    responseTime: '< 1 hour'
  },
  [SeverityLevel.MEDIUM]: {
    color: '#D97706',
    icon: '🟡',
    score: 50,
    responseTime: '< 4 hours'
  },
  [SeverityLevel.LOW]: {
    color: '#059669',
    icon: '🟢',
    score: 25,
    responseTime: '< 24 hours'
  },
  [SeverityLevel.INFORMATIONAL]: {
    color: '#6B7280',
    icon: '⚪',
    score: 10,
    responseTime: 'Best effort'
  }
};

/** Default port mappings */
export const DEFAULT_PORTS: Record<string, number> = {
  HTTP: 80,
  HTTPS: 443,
  SSH: 22,
  FTP: 20,
  FTP_DATA: 21,
  SMTP: 25,
  DNS: 53,
  DHCP: 67,
  SNMP: 161,
  LDAP: 389,
  HTTPS_ALT: 8443,
  MYSQL: 3306,
  REDIS: 6379,
  MONGODB: 27017,
  RDP: 3389
};

// ============================================================================
// CORE TYPES - EVE JSON FORMAT
// ============================================================================

/** Base EVE JSON event structure */
export interface EveEvent {
  timestamp: string;
  flow_id: number;
  pcap_cnt?: number;
  event_type: EveEventType;
  src_ip: string;
  src_port: number;
  dest_ip: string;
  dest_port: number;
  proto: string;
  community_id?: string;
  tx_id?: number;
  in_iface?: string;
  vlan?: number[];
  /** Type-specific payload */
  alert?: EveAlert;
  http?: EveHTTP;
  dns?: EveDNS;
  tls?: EveTLS;
  files?: EveFile[];
  flow?: EveFlow;
  smtp?: EveSMTP;
  ftp?: EveFTP;
  ssh?: EveSSH;
  dhcp?: EveDHCP;
}

/** EVE Alert structure */
export interface EveAlert {
  action: RuleAction;
  gid: number;
  signature_id: number;
  rev: number;
  signature: string;
  category: string;
  severity: number;
  metadata?: Record<string, string[]>;
  class_id?: string;
  priority?: number;
  /** Extended fields */
  signature_revision?: string;
  rule?: RawRuleInfo;
  /** Enrichment data */
  threat_intel?: ThreatIntelMatch;
  mitre?: MITREMapping;
  /** Analysis results */
  classification?: AlertClassification;
  /** Context */
  source?: AlertSource;
  /** Correlation */
  related_alerts?: RelatedAlertSummary[];
}

/** Raw rule information from signature */
export interface RawRuleInfo {
  sid: number;
  rev: number;
  action: RuleAction;
  msg: string;
  options: RuleOption[];
  raw: string;
  source: SignatureSource;
  last_modified: string;
}

/** Rule option (content, pcre, etc.) */
export interface RuleOption {
  type: string;
  value: string;
  negated?: boolean;
}

/** Threat intelligence match */
export interface ThreatIntelMatch {
  matched: boolean;
  source: string;
  confidence: number;
  context: string;
  first_seen?: string;
  last_seen?: string;
  tags?: string[];
}

/** MITRE ATT&CK mapping */
export interface MITREMapping {
  tactic?: string;
  technique_id?: string;
  technique_name?: string;
  sub_techniques?: string[];
  software?: string[];
  groups?: string[];
}

/** Alert classification result */
export interface AlertClassification {
  category: AlertCategory;
  confidence: number;
  is_false_positive: boolean;
  false_positive_reason?: string;
  risk_score: number;
  indicators: ClassificationIndicator[];
}

/** Classification indicator */
export interface ClassificationIndicator {
  type: string;
  value: string;
  weight: number;
  description: string;
}

/** Alert source information */
export interface AlertSource {
  sensor_id: string;
  sensor_name: string;
  interface: string;
  capture_file?: string;
  packet_number?: number;
}

/** Related alerts summary */
export interface RelatedAlertSummary {
  alert_id: string;
  timestamp: string;
  signature: string;
  src_ip: string;
  dest_ip: string;
  similarity: number;
}

// ============================================================================
// HTTP EVENT TYPES
// ============================================================================

/** EVE HTTP event */
export interface EveHTTP {
  hostname: string;
  url: string;
  http_method: string;
  http_user_agent: string;
  http_content_type: string;
  http_referer?: string;
  request_body_len: number;
  response_body_len: number;
  status_code: number;
  protocol: string;
  redirect?: string;
  length?: number;
  http_version?: string;
  /** Extended analysis */
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
  /** Security findings */
  sql_injection_detected?: boolean;
  xss_detected?: boolean;
  path_traversal_detected?: boolean;
  command_injection_detected?: boolean;
}

// ============================================================================
// DNS EVENT TYPES
// ============================================================================

/** EVE DNS event */
export interface EveDNS {
  type: 'query' | 'answer';
  rrtype: string;
  rrname: string;
  rdata?: string | string[];
  ttl?: number;
  /** Extended fields */
  tx_id?: number;
  rcode?: string;
  authoritative?: boolean;
  /** Analysis */
  is_dga?: boolean;
  dga_score?: number;
  is_tunneling?: boolean;
  threat_category?: string;
}

// ============================================================================
// TLS EVENT TYPES
// ============================================================================

/** EVE TLS event */
export interface EveTLS {
  version: string;
  cipher: string;
  ja3?: string;
  ja3s?: string;
  certificate?: TLSCertificate[];
  sni?: string;
  resumed: boolean;
  fingerprint?: string;
  not_before?: string;
  not_after?: string;
}

/** TLS Certificate info */
export interface TLSCertificate {
  subject: string;
  issuer: string;
  serial: string;
  fingerprint: string;
  fingerprint_md5?: string;
  validity_from: string;
  validity_to: string;
  /** Analysis */
  is_self_signed: boolean;
  is_expired: boolean;
  is_revoked?: boolean;
  issuer_match: boolean;
}

// ============================================================================
// FILE EVENT TYPES
// ============================================================================

/** EVE File event */
export interface EveFile {
  filename: string;
  name?: string;
  magic: string;
  md5: string;
  sha1: string;
  sha256: string;
  size: number;
  stored: boolean;
  stored_filename?: string;
  /** File type details */
  type?: string;
  encoding?: string;
  /** Malware analysis */
  malware_scan_result?: MalwareScanResult;
  yara_matches?: YARAMatch[];
}

/** Malware scan result */
export interface MalwareScanResult {
  scanned: boolean;
  malicious: boolean;
  engine_name: string;
  detection_name?: string;
  scan_time: string;
}

/** YARA match on file */
export interface YARAMatch {
  rule_name: string;
  rule_namespace: string;
  meta: Record<string, string>;
  strings: YARAStringMatch[];
}

/** YARA string match */
export interface YARAStringMatch {
  identifier: string;
  offset: number;
  data: string;
}

// ============================================================================
// FLOW EVENT TYPES
// ============================================================================

/** EVE Flow event */
export interface EveFlow {
  app_proto: string;
  /** Traffic statistics */
  pkts_toserver: number;
  pkts_toclient: number;
  bytes_toserver: number;
  bytes_toclient: number;
  /** Timing */
  start: string;
  /** State */
  state: string;
  /** TCP specific */
  tcp_flags?: TCPFlags;
  /** Analysis */
  is_long_connection?: boolean;
  is_data_transfer?: boolean;
  bytes_per_second?: number;
  duration_seconds?: number;
}

/** TCP flags */
export interface TCPFlags {
  syn: boolean;
  ack: boolean;
  psh: boolean;
  fin: boolean;
  rst: boolean;
  urg: boolean;
  ece: boolean;
  cwr: boolean;
  raw: number;
}

// ============================================================================
// OTHER PROTOCOL EVENTS
// ============================================================================

/** EVE SMTP event */
export interface EveSMTP {
  mail_from: string;
  rcpt_to: string[];
  subject?: string;
  attachment_filenames?: string[];
  /** Analysis */
  has_executable_attachment?: boolean;
  spam_score?: number;
  phishing_indicators?: PhishingIndicator[];
}

/** Phishing indicator */
export interface PhishingIndicator {
  type: string;
  description: string;
  confidence: number;
}

/** EVE FTP event */
export interface EveFTP {
  command: string;
  command_data?: string?
  completion_code?: string;
  reply?: string;
  file?: FTPFileInfo;
}

/** FTP file info */
export interface FTPFileInfo {
  filename: string;
  size: number;
  type: string;
}

/** EVE SSH event */
export interface EveSSH {
  client: SSHClientInfo;
  server: SSHServerInfo;
  version: string;
}

/** SSH client/server info */
export interface SSHClientInfo {
  proto_version: string;
  software_version: string;
  algorithms: SSHAlgorithms;
}

export interface SSHServerInfo {
  proto_version: string;
  software_version: string;
  algorithms: SSHAlgorithms;
}

/** SSH algorithms */
export interface SSHAlgorithms {
  kex?: string[];
  host_key?: string[];
  encryption?: string[];
  mac?: string[];
  compression?: string[];
}

/** EVE DHCP event */
export interface EveDHCP {
  type: 'request' | 'reply' | 'ack' | 'offer';
  id: string;
  ip: string;
  mac: string;
  hostname?: string;
  assigned_ip?: string;
  lease_time?: number;
  dhcp_server?: string;
}

// ============================================================================
// RULE MANAGEMENT TYPES
// ============================================================================

/** Suricata rule definition */
export interface SuricataRule {
  id: string;
  sid: number;
  action: RuleAction;
  protocol: string;
  source: RuleAddressSpec;
  source_port: RulePortSpec;
  direction: string;
  destination: RuleAddressSpec;
  destination_port: RulePortSpec;
  options: RuleOption[];
  raw: string;
  state: RuleState;
  /** Metadata */
  message: string;
  class_type?: string;
  priority?: number;
  metadata: Record<string, string[]>;
  reference?: string[];
  /** Source tracking */
  source: SignatureSource;
  created_at: string;
  updated_at: string;
  last_modified_by?: string;
  revision_history: RuleRevision[];
  /** Performance & stats */
  hit_count: number;
  last_hit?: string;
  false_positive_count: number;
  enabled_sensors: string[];
  /** Validation */
  validation_status: RuleValidationStatus;
  validation_errors?: string[];
}

/** Rule address specification */
export interface RuleAddressSpec {
  type: 'any' | 'ip' | 'cidr' | 'group' | 'variable';
  value: string;
  negated?: boolean;
}

/** Rule port specification */
export interface RulePortSpec {
  type: 'any' | 'single' | 'range' | 'group' | 'variable';
  value: string;
  negated?: boolean;
}

/** Rule validation status */
export enum RuleValidationStatus {
  VALID = 'valid',
  INVALID_SYNTAX = 'invalid_syntax',
  INVALID_OPTION = 'invalid_option',
  DEPRECATED = 'deprecated',
  CONFLICTING = 'conflicting',
  UNTESTED = 'untested'
}

/** Rule revision history entry */
export interface RuleRevision {
  version: number;
  changed_at: string;
  changed_by: string;
  change_description: string;
  diff?: string;
}

/** Rule set information */
export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: SuricataRule[];
  total_rules: number;
  enabled_rules: number;
  disabled_rules: number;
  custom_rules: number;
  last_updated: string;
  version: string;
  /** Sources */
  sources: RuleSourceInfo[];
}

/** Rule source information */
export interface RuleSourceInfo {
  name: string;
  url?: string;
  type: SignatureSource;
  rule_count: number;
  last_sync: string;
  sync_status: RuleSyncStatus;
}

/** Rule sync status */
export enum RuleSyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  OUTDATED = 'outdated'
}

/** Rule update options */
export interface RuleUpdateOptions {
  source: SignatureSource;
  force_update?: boolean;
  test_mode?: boolean;
  backup_existing?: boolean;
  notify_on_complete?: boolean;
  include_etpro?: boolean;
  etpro_oinkcode?: string;
}

/** Rule update result */
export interface RuleUpdateResult {
  success: boolean;
  source: SignatureSource;
  previous_version?: string;
  new_version?: string;
  rules_added: number;
  rules_updated: number;
  rules_removed: number;
  errors: string[];
  warnings: string[];
  timestamp: string;
  duration_ms: number;
}

// ============================================================================
// STATISTICS & METRICS TYPES
// ============================================================================

/** Suricata statistics snapshot */
export interface SuricataStats {
  timestamp: string;
  uptime_seconds: number;
  /** Packet processing */
  packets_received: number;
  packets_dropped: number;
  packets_ifdropped: number;
  packets_processed: number;
  /** Bytes processed */
  bytes_received: number;
  bytes_dropped: number;
  /** Alert statistics */
  total_alerts: number;
  alerts_by_severity: Record<SeverityLevel, number>;
  alerts_by_category: Record<AlertCategory, number>;
  alerts_by_action: Record<RuleAction, number>;
  /** Top signatures */
  top_signatures: SignatureStats[];
  /** Network stats */
  top_source_ips: IPStats[];
  top_destination_ips: IPStats[];
  top_ports: PortStats[];
  /** Protocol distribution */
  protocol_distribution: Record<string, number>;
  /** Flow statistics */
  active_flows: number;
  total_flows: number;
  avg_flow_duration_ms: number;
  /** Memory usage */
  memory_usage_bytes: number;
  cpu_usage_percent: number;
  /** Capture method */
  capture_method: string;
  capture_kernel_drops: number;
}

/** Signature statistics */
export interface SignatureStats {
  signature_id: number;
  signature: string;
  count: number;
  severity: SeverityLevel;
  category: string;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

/** IP address statistics */
export interface IPStats {
  ip: string;
  country?: string;
  asn?: number;
  as_org?: string;
  is_internal: boolean;
  reputation_score?: number;
  alert_count: number;
  first_seen: string;
  last_seen: string;
  tags?: string[];
}

/** Port statistics */
export interface PortStats {
  port: number;
  protocol: string;
  service?: string;
  alert_count: number;
  percentage: number;
  top_signatures: { name: string; count: number }[];
}

/** Time-series data point */
export interface StatsTimePoint {
  timestamp: string;
  value: number;
  breakdown?: Record<string, number>;
}

/** Alert trends over time */
export interface AlertTrend {
  period: string;
  points: StatsTimePoint[];
  total: number;
  average: number;
  peak: number;
  peak_timestamp: string;
  change_percentage: number;
  change_direction: 'up' | 'down' | 'stable';
}

/** Geolocation data for attack map */
export interface GeoLocation {
  ip: string;
  country: string;
  country_code: string;
  city?: string;
  region?: string;
  latitude: number;
  longitude: number;
  accuracy_radius: number;
}

/** Attack map data point */
export interface AttackMapPoint {
  id: string;
  location: GeoLocation;
  timestamp: string;
  severity: SeverityLevel;
  category: AlertCategory;
  signature: string;
  target_ip: string;
  count: number;
  is_targeted_attack: boolean;
}

// ============================================================================
// SENSOR/ENGINE TYPES
// ============================================================================

/** Suricata engine/sensor information */
export interface SuricataSensor {
  id: string;
  name: string;
  hostname: string;
  /** Engine info */
  version: string;
  build_info: string;
  git_hash?: string;
  /** Status */
  status: SensorStatus;
  uptime_seconds: number;
  started_at: string;
  /** Configuration */
  interfaces: SensorInterface[];
  run_modes: RunMode[];
  /** Performance */
  cpu_usage: number;
  memory_usage: number;
  max_memory_usage: number;
  /** Capture stats */
  capture_method: string;
  capture_threads: number;
  /** Rule status */
  total_rules: number;
  enabled_rules: number;
  last_rule_update: string;
  /** Health checks */
  health_checks: HealthCheckResult[];
}

/** Sensor status */
export enum SensorStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

/** Sensor network interface config */
export interface SensorInterface {
  name: string;
  description: string;
  is_promiscuous: boolean;
  is_capture_interface: boolean;
  bpf_filter?: string;
  speed_mbps?: number;
  mtu?: number;
}

/** Run mode */
export interface RunMode {
  mode: string;
  workers: number;
  checksum_validation: string;
}

/** Health check result */
export interface HealthCheckResult {
  check_name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  timestamp: string;
  value?: number;
  threshold?: number;
}

// ============================================================================
// DASHBOARD & UI TYPES
// ============================================================================

/** Dashboard configuration */
export interface SuricataDashboardConfig {
  refresh_interval_ms: number;
  auto_refresh: boolean;
  default_time_range: TimeRange;
  display_options: DisplayOptions;
  widgets: WidgetConfig[];
}

/** Time range options */
export enum TimeRange {
  LAST_HOUR = 'last_hour',
  LAST_6_HOURS = 'last_6_hours',
  LAST_12_HOURS = 'last_12_hours',
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  CUSTOM = 'custom'
}

/** Display options */
export interface DisplayOptions {
  show_geomap: boolean;
  show_timeline: boolean;
  show_top_lists: boolean;
  show_protocol_breakdown: boolean;
  max_chart_points: number;
  items_per_page: number;
  enable_sound_alerts: boolean;
  severity_threshold: SeverityLevel;
}

/** Widget configuration */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: Record<string, unknown>;
  enabled: boolean;
}

/** Widget types */
export enum WidgetType {
  ALERT_COUNT = 'alert_count',
  SEVERITY_DISTRIBUTION = 'severity_distribution',
  ATTACK_MAP = 'attack_map',
  TIMELINE_CHART = 'timeline_chart',
  TOP_SIGNATURES = 'top_signatures',
  TOP_IPS = 'top_ips',
  PROTOCOL_BREAKDOWN = 'protocol_breakdown',
  SENSOR_STATUS = 'sensor_status',
  THREAT_FEED = 'threat_feed',
  RULE_STATUS = 'rule_status'
}

/** Widget position */
export interface WidgetPosition {
  x: number;
  y: number;
}

/** Widget size */
export interface WidgetSize {
  width: number;
  height: number;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

/** Alert filter criteria */
export interface AlertFilter {
  /** Time range */
  time_range?: TimeRange;
  time_start?: string;
  time_end?: string;
  /** Severity filter */
  severities?: SeverityLevel[];
  min_severity?: SeverityLevel;
  /** Category filter */
  categories?: AlertCategory[];
  /** Network filters */
  src_ip?: string;
  src_cidr?: string;
  dest_ip?: string;
  dest_cidr?: string;
  src_port?: number;
  dest_port?: number;
  protocol?: Protocol;
  /** Signature filters */
  signature_id?: number;
  signature_pattern?: string;
  category_pattern?: string;
  /** Action filter */
  actions?: RuleAction[];
  /** Sensor filter */
  sensor_id?: string;
  sensor_ids?: string[];
  /** Threat intel */
  has_threat_intel_match?: boolean;
  has_mitre_mapping?: boolean;
  /** Classification */
  is_false_positive?: boolean;
  is_classified?: boolean;
  /** Pagination */
  page?: number;
  page_size?: number;
  sort_by?: AlertSortField;
  sort_order?: 'asc' | 'desc';
}

/** Sortable fields */
export enum AlertSortField {
  TIMESTAMP = 'timestamp',
  SEVERITY = 'severity',
  SRC_IP = 'src_ip',
  DEST_IP = 'dest_ip',
  SIGNATURE = 'signature',
  COUNT = 'count'
}

/** Filtered alert result set */
export interface AlertResultSet {
  alerts: EveEvent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  /** Aggregations */
  aggregations: AlertAggregations;
  /** Execution time */
  query_time_ms: number;
  /** Applied filters summary */
  applied_filters: Partial<AlertFilter>;
}

/** Alert aggregations */
export interface AlertAggregations {
  by_severity: Record<SeverityLevel, number>;
  by_category: Record<AlertCategory, number>;
  by_protocol: Record<string, number>;
  by_sensor: Record<string, number>;
  by_hour: Record<string, number>;
  by_action: Record<RuleAction, number>;
}

/** Rule filter criteria */
export interface RuleFilter {
  state?: RuleState;
  action?: RuleAction;
  source?: SignatureSource;
  category_pattern?: string;
  signature_pattern?: string;
  sid_range?: { min: number; max: number };
  has_hits?: boolean;
  is_custom?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: RuleSortField;
  sort_order?: 'asc' | 'desc';
}

/** Rule sortable fields */
export enum RuleSortField {
  SID = 'sid',
  HIT_COUNT = 'hit_count',
  UPDATED_AT = 'updated_at',
  SEVERITY = 'severity',
  NAME = 'name'
}

/** Filtered rule result set */
export interface RuleResultSet {
  rules: SuricataRule[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  query_time_ms: number;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/** Integration with other SOC components */
export interface SuricataIntegration {
  misp?: MISPIntegrationConfig;
  wazuh?: WazuhIntegrationConfig;
  thehive?: TheHiveIntegrationConfig;
  elasticsearch?: ElasticsearchConfig;
}

/** MISP integration config */
export interface MISPIntegrationConfig {
  enabled: boolean;
  auto_create_events: boolean;
  ioc_export_enabled: boolean;
  event_template_id?: string;
  sync_interval_minutes: number;
  last_sync?: string;
}

/** Wazuh integration config */
export interface WazuhIntegrationConfig {
  enabled: boolean;
  forward_alerts: boolean;
  alert_level_mapping: Record<SeverityLevel, number>;
  custom_decoder_path?: string;
  custom_rule_path?: string;
}

/** TheHive integration config */
export interface TheHiveIntegrationConfig {
  enabled: boolean;
  auto_create_cases: boolean;
  case_severity_mapping: Record<SeverityLevel, string>;
  case_template_id?: string;
  observable_types: string[];
}

/** Elasticsearch config */
export interface ElasticsearchConfig {
  enabled: boolean;
  index_prefix: string;
  batch_size: number;
  flush_interval_seconds: number;
  retention_days: number;
  index_templates?: string[];
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/** Export format options */
export enum ExportFormat {
  PCAP = 'pcap',
  JSON = 'json',
  CSV = 'csv',
  STIX = 'stix',
  SURICATA_RULES = 'suricata_rules'
}

/** Export job */
export interface ExportJob {
  id: string;
  user_id: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  file_url?: string;
  file_size?: byte_count: number;
  record_count: number;
  filters: AlertFilter | RuleFilter;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

/** Export status */
export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

/** API error */
export interface ApiError {
  code: string;
  message: string;
  details?: string[];
  timestamp: string;
}

/** Response metadata */
export interface ResponseMeta {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  execution_time_ms: number;
  cached: boolean;
  rate_limit_remaining?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/** Bulk operation result */
export interface BulkOperationResult {
  succeeded: number;
  failed: number;
  errors: Array<{ item: string; error: string }>;
  operation_id: string;
}
