/**
 * Elasticsearch Log Aggregation Pipeline Type Definitions
 * National SOC Platform - Algeria 2026-2030
 * 
 * Complete TypeScript types for:
 * - Index templates and mappings
 * - Document types (logs, metrics, alerts, events)
 * - Query DSL types (bool, match, term, range, aggregation)
 * - Search response types with hits, aggregations, suggestions
 * - Cluster health, node stats, index stats
 * - Ingest pipeline configurations
 * - ILM (Index Lifecycle Management) policies
 * - Snapshot/backup configurations
 * - Dashboard and visualization configs
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/** Index lifecycle phases */
export enum ILMLifecyclePhase {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  FROZEN = 'frozen',
  DELETE = 'delete'
}

/** Index health status */
export enum IndexHealthStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
  UNKNOWN = 'unknown'
}

/** Cluster health status */
export enum ClusterHealthStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red'
}

/** Document operation types for bulk API */
export enum BulkOperationType {
  INDEX = 'index',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

/** Log severity levels (syslog compatible) */
export enum LogSeverity {
  EMERGENCY = 0,
  ALERT = 1,
  CRITICAL = 2,
  ERROR = 3,
  WARNING = 4,
  NOTICE = 5,
  INFORMATIONAL = 6,
  DEBUG = 7
}

/** Log source categories */
export enum LogSource {
  WAZUH = 'wazuh',
  SURICATA = 'suricata',
  MISP = 'misp',
  THEHIVE = 'thehive',
  SYSTEM = 'system',
  APPLICATION = 'application',
  NETWORK = 'network',
  SECURITY = 'security',
  AUDIT = 'audit',
  FIREWALL = 'firewall',
  DNS = 'dns',
  PROXY = 'proxy',
  WEB = 'web',
  DATABASE = 'database',
  CUSTOM = 'custom'
}

/** Aggregation types supported by Elasticsearch */
export enum AggregationType {
  TERMS = 'terms',
  HISTOGRAM = 'histogram',
  DATE_HISTOGRAM = 'date_histogram',
  RANGE = 'range',
  DATE_RANGE = 'date_range',
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  STATS = 'stats',
  EXTENDED_STATS = 'extended_stats',
  VALUE_COUNT = 'value_count',
  CARDINALITY = 'cardinality',
  PERCENTILES = 'percentiles',
  TOP_HITS = 'top_hits',
  NESTED = 'nested',
  REVERSE_NESTED = 'reverse_nested',
  FILTER = 'filter',
  BUCKETS_PATH = 'buckets_path',
  CUMULATIVE_SUM = 'cumulative_sum',
  DERIVATIVE = 'derivative',
  MOVING_AVG = 'moving_avg',
  SERIAL_DIFF = 'serial_diff'
}

/** Sort order options */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/** Node roles in cluster */
export enum NodeRole {
  MASTER = 'master',
  DATA = 'data',
  DATA_HOT = 'data_hot',
  DATA_WARM = 'data_warm',
  DATA_COLD = 'data_cold',
  DATA_CONTENT = 'data_content',
  INGEST = 'ingest',
  COORDINATING_ONLY = 'coordinating_only',
  ML = 'ml',
  REMOTE_CLUSTER_CLIENT = 'remote_cluster_client',
  TRANSFORM = 'transform'
}

/** Snapshot states */
export enum SnapshotState {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  INCOMPATIBLE = 'INCOMPATIBLE'
}

/** Task states */
export enum TaskState {
  PENDING = 'pending',
  RUNNING = 'running'
}

/** Default index patterns for SOC platform */
export const DEFAULT_INDEX_PATTERNS = {
  WAZUH_ALERTS: 'wazuh-alerts-*',
  WAZUH_ARCHIVES: 'wazuh-archives-*',
  SURICATA_EVENTS: 'suricata-*',
  MISP_EVENTS: 'misp-events-*',
  MISP_OBJECTS: 'misp-objects-*',
  THEHIVE_CASES: 'thehive-cases-*',
  SYSLOG: 'syslog-*',
  AUDIT: 'audit-*',
  FIREWALL: 'firewall-*',
  GENERIC_LOGS: 'logs-*',
  METRICS: 'metrics-*',
  CUSTOM: 'custom-*'
} as const;

/** Default ILM policy configurations */
export const DEFAULT_ILM_POLICIES = {
  LOGS_HOT_RETENTION: '7d',
  LOGS_WARM_RETENTION: '30d',
  LOGS_COLD_RETENTION: '90d',
  LOGS_DELETE_AFTER: '180d',
  ALERTS_HOT_RETENTION: '30d',
  ALERTS_WARM_RETENTION: '90d',
  ALERTS_COLD_RETENTION: '365d',
  ALERTS_DELETE_AFTER: '730d',
  METRICS_HOT_RETENTION: '7d',
  METRICS_DELETE_AFTER: '15d'
} as const;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/** Elasticsearch client configuration */
export interface ESClientConfig {
  /** Array of node URLs */
  nodes: string[];
  /** Authentication credentials */
  auth?: ESAuthConfig;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay base in milliseconds */
  retryDelay?: number;
  /** Enable SSL/TLS verification */
  sslVerification?: boolean;
  /** CA certificate path */
  caCertPath?: string;
  /** Client certificate path */
  clientCertPath?: string;
  /** Client key path */
  clientKeyPath?: number;
  /** Enable request compression */
  compression?: boolean;
  /** Maximum content length in bytes */
  maxContentLength?: number;
  /** Number of concurrent connections per node */
  maxConnections?: number;
  /** Request/response logging enabled */
  logging?: boolean;
  /** Custom headers to include */
  headers?: Record<string, string>;
  /** Proxy configuration */
  proxy?: string;
  /** Application name for connection identification */
  appName?: string;
}

/** Authentication configuration */
export interface ESAuthConfig {
  /** Basic authentication username */
  username?: string;
  /** Basic authentication password */
  password?: string;
  /** API key ID */
  apiKeyId?: string;
  /** API key value */
  apiKey?: string;
  /** Bearer token */
  bearerToken?: string;
  /** Service account token */
  serviceAccountToken?: string;
}

/** Index template configuration */
export interface ESTemplateConfig {
  /** Template name */
  name: string;
  /** Index patterns this template applies to */
  indexPatterns: string[];
  /** Template priority (higher wins conflicts) */
  priority?: number;
  /** Version number for template management */
  version?: number;
  /** Composable template flag */
  composable?: boolean;
  /** Index settings */
  settings?: ESSettings;
  /** Field mappings */
  mappings?: ESMapping;
  /** Alias configuration */
  aliases?: Record<string, ESAliasConfig>;
}

/** Alias configuration */
export interface ESAliasConfig {
  /** Filter query for alias */
  filter?: ESQuery;
  /** Index routing value */
  routing?: string;
  /** Whether alias is hidden */
  isHidden?: boolean;
  /** Write index flag */
  isWriteIndex?: boolean;
}

/** Index settings */
export interface ESSettings {
  /** Number of primary shards */
  numberOfShards?: number;
  /** Number of replica shards */
  numberOfReplicas?: number;
  /** Refresh interval */
  refreshInterval?: string;
  /** Analysis configuration */
  analysis?: ESAnalysisSettings;
  /** ILM policy name */
  lifecycle?: {
    name: string;
    rolloverAlias?: string;
  };
  /** Source field configuration */
  source?: { enabled?: boolean; excludes?: string[] };
  /** Codec type */
  codec?: 'best_compression' | 'default';
  /** Auto-expand replicas */
  autoExpandReplicas?: string;
  /** Translog settings */
  translog?: {
    durability?: 'request' | 'async';
    syncInterval?: string;
    flushThresholdSize?: string;
  };
  /** Merge policy */
  merge?: {
    schedulerMaxThreadCount?: number;
    maxMergeAtOnce?: number;
    segmentsPerTier?: number;
    maxMergedSegment?: string;
  };
  /** Soft deletes setting */
  softDeletes?: { enabled?: boolean };
  /** Sorting mode */
  sort?: Record<string, string>;
}

/** Analysis settings for text processing */
export interface ESAnalysisSettings {
  /** Analyzer definitions */
  analyzer?: Record<string, ESAnalyzer>;
  /** Tokenizer definitions */
  tokenizer?: Record<string, ESTokenizer>;
  /** Token filter definitions */
  filter?: Record<string, ESTokenFilter>;
  /** Character filter definitions */
  char_filter?: Record<string, ESCharFilter>;
  /** Normalizer definitions */
  normalizer?: Record<string, ESNormalizer>;
}

/** Analyzer configuration */
export interface ESAnalyzer {
  type?: 'standard' | 'simple' | 'whitespace' | 'stop' | 'keyword' | 'pattern' 
       | 'language' | 'custom' | 'fingerprint';
  tokenizer?: string;
  filter?: string[];
  char_filter?: string[];
  stopwords?: string[] | '_english_' | '_none_';
  stopwords_path?: string;
  pattern?: string;
  lowercase?: boolean;
}

/** Tokenizer configuration */
export interface ESTokenizer {
  type?: 'standard' | 'keyword' | 'letter' | 'whitespace' | 'ngram' | 'edge_ngram'
       | 'path_hierarchy' | 'pattern' | 'uax_url_email' | 'classic' | 'thai';
  max_gram?: number;
  min_gram?: number;
  token_chars?: ('letter' | 'digit' | 'whitespace' | 'punctuation' | 'symbol')[];
  pattern?: string;
  group?: number;
  delimiter?: string;
  reverse?: boolean;
  skip_empty?: boolean;
}

/** Token filter configuration */
export interface ESTokenFilter {
  type?: 'ascii_folding' | 'lowercase' | 'uppercase' | 'stemmer' | 'stemmer_override'
       | 'stop' | 'word_delimiter' | 'synonym' | 'synonym_graph' | 'truncate' | 'unique'
       | 'length' | 'pattern_replace' | 'elision' | 'decimal_digit';
  language?: string;
  stopwords_path?: string;
  synonyms_path?: string;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  replacement?: string;
  generate_word_parts?: boolean;
  catenate_words?: boolean;
  catenate_numbers?: boolean;
  catenate_all?: boolean;
  split_on_case_change?: boolean;
  preserve_original?: boolean;
}

/** Character filter configuration */
export interface ESCharFilter {
  type?: 'html_strip' | 'mapping' | 'pattern_replace';
  mappings_path?: string;
  mappings?: string[];
  pattern?: string;
  replacement?: string;
}

/** Normalizer configuration */
export interface ESNormalizer {
  type?: 'custom';
  filter?: string[];
  char_filter?: string[];
}

// ============================================================================
// MAPPING TYPES
// ============================================================================

/** Root mapping object */
export interface ESMapping {
  dynamic?: boolean | 'true' | 'false' | 'strict' | 'runtime';
  dynamicTemplates?: ESDynamicTemplate[];
  dateDetection?: boolean;
  numericDetection?: boolean;
  properties?: Record<string, ESProperty>;
  runtime?: Record<string, ESRuntimeField>;
  _source?: { enabled?: boolean; excludes?: string[] };
  _size?: { enabled?: boolean };
  _field_names?: { enabled?: boolean };
  _doc_values?: { enabled?: boolean };
}

/** Dynamic template definition */
export interface ESDynamicTemplate {
  [key: string]: {
    match?: string;
    match_mapping_type?: string;
    unmatch?: string;
    path_match?: string;
    path_unmatch?: string;
    match_pattern?: 'regex' | 'simple';
    mapping: ESProperty;
  };
}

/** Property mapping */
export interface ESProperty {
  type?: 'text' | 'keyword' | 'long' | 'integer' | 'short' | 'byte' 
       | 'double' | 'float' | 'half_float' | 'scaled_float' | 'boolean' 
       | 'binary' | 'integer_range' | 'float_range' | 'long_range' 
       | 'double_range' | 'date_range' | 'ip_range' | 'object' | 'nested' 
       | 'geo_point' | 'geo_shape' | 'ip' | 'completion' | 'token_count' 
       | 'murmur3' | 'annotated-text' | 'flattened' | 'search_as_you_type' 
       | 'rank_feature' | 'rank_features' | 'dense_vector' | 'sparse_vector'
       | 'date' | 'alias' | 'join' | 'percolator' | 'wildcard' | 'constant_keyword';
  
  // Text-specific properties
  analyzer?: string;
  search_analyzer?: string;
  norms?: boolean;
  index?: boolean;
  index_options?: 'docs' | 'freqs' | 'positions' | 'offsets';
  similarity?: string;
  fielddata?: boolean;
  position_increment_gap?: number;
  
  // Keyword-specific properties
  ignore_above?: number;
  normalizer?: string;
  doc_values?: boolean;
  
  // Numeric properties
  coerce?: boolean;
  boost?: number;
  null_value?: any;
  scaling_factor?: number;
  
  // Date properties
  format?: string;
  
  // Range properties
  
  // Object/Nested properties
  dynamic?: boolean | 'strict' | true | false;
  enabled?: boolean;
  include_in_parent?: boolean;
  include_in_root?: boolean;
  properties?: Record<string, ESProperty>;
  
  // Geo-point properties
  ignore_malformed?: boolean;
  ignore_z_value?: boolean;
  
  // IP property
  
  // Completion property
  analyzer_completion?: string;
  preserve_separators?: boolean;
  preserve_position_increments?: boolean;
  max_input_length?: number;
  contexts?: Array<{
    name: string;
    type?: 'category' | 'geo';
    path?: string;
    precision?: string[];
  }>;
  
  // Join property
  relations?: Record<string, string[]>;
  
  // Common properties
  copy_to?: string | string[];
  fields?: Record<string, ESProperty>;
  store?: boolean;
  meta?: Record<string, any>;
}

/** Runtime field definition */
export interface ESRuntimeField {
  type?: 'boolean' | 'composite' | 'date' | 'double' | 'geo_point' | 'ip' 
       | 'keyword' | 'long' | 'lookup' | 'wildcard';
  script?: {
    source?: string;
    params?: Record<string, any>;
  };
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/** Base document interface */
export interface ESDocument {
  _id?: string;
  _index?: string;
  _type?: string;
  _version?: number;
  _seq_no?: number;
  _primary_term?: number;
  _score?: number;
  found?: boolean;
  _source?: any;
  fields?: Record<string, any>;
  highlight?: Record<string, string[]>;
  sort?: any[];
  matched_queries?: string[];
  inner_hits?: Record<string, ESHitsMetadata>;
  _explanation?: ESExplanation;
}

/** Log document structure (ECS compliant) */
export interface ESLogDocument extends ESDocument {
  _source: {
    // ECS Timestamp
    '@timestamp': string;
    
    // ECS Metadata
    ecs_version?: string;
    event?: {
      category?: string[];
      type?: string[];
      kind?: string;
      outcome?: string;
      severity?: number;
      severity_name?: string;
      risk_score?: number;
      risk_score_norm?: number;
      id?: string;
      code?: string;
      action?: string;
      dataset?: string;
      module?: string;
      reason?: string;
      created?: string;
      start?: string;
      end?: string;
      duration?: number;
      hash?: string;
      original?: string;
      url?: string;
      reference?: string;
    };
    
    // Log specific
    log?: {
      level?: string;
      logger?: string;
      origin?: {
        file?: {
          name?: string;
          line?: number;
        };
        function?: string;
      };
      sys?: {
        facility?: number;
        severity?: number;
        hostname?: string;
        identifier?: string;
        appname?: string;
        procid?: string;
        msgid?: string;
        version?: string;
        structured_data?: string;
      };
    };
    
    // Message
    message?: string;
    tags?: string[];
    
    // Source/Observer
    observer?: {
      name?: string;
      type?: string;
      hostname?: string;
      ip?: string;
      mac?: string;
      vendor?: string;
      version?: string;
      serial_number?: string;
      product?: string;
      ephemeral_id?: string;
    };
    
    // Host information
    host?: {
      name?: string;
      hostname?: string;
      id?: string;
      ip?: string | string[];
      mac?: string | string[];
      os?: {
        family?: string;
        name?: string;
        platform?: string;
        version?: string;
        kernel?: string;
        build?: string;
        full?: string;
      };
      architecture?: string;
      type?: string;
      domain?: string;
      geo?: {
        city_name?: string;
        country_iso_code?: string;
        location?: { lat: number; lon: number };
        region_iso_code?: string;
        region_name?: string;
        timezone?: string;
      };
      user?: {
        name?: string;
        id?: string;
        domain?: string;
        full_name?: string;
        group?: { name?: string; id?: string }[];
      };
    };
    
    // Network information
    source?: {
      ip?: string | string[];
      port?: number;
      mac?: string;
      domain?: string;
      address?: string;
      asn?: number;
      geo?: {
        city_name?: string;
        country_iso_code?: string;
        continent_name?: string;
        location?: { lat: number; lon: number };
        region_iso_code?: string;
        region_name?: string;
        timezone?: string;
      };
      organization?: { name?: string; id?: string };
      user?: {
        name?: string;
        id?: string;
        email?: string;
        domain?: string;
        group?: { name?: string; id?: string }[];
      };
    };
    
    destination?: {
      ip?: string | string[];
      port?: number;
      mac?: string;
      domain?: string;
      address?: string;
      asn?: number;
      geo?: {
        city_name?: string;
        country_iso_code?: string;
        continent_name?: string;
        location?: { lat: number; lon: number };
        region_iso_code?: string;
        region_name?: string;
        timezone?: string;
      };
      organization?: { name?: string; id?: string };
      user?: {
        name?: string;
        id?: string;
        email?: string;
        domain?: string;
        group?: { name?: string; id?: string }[];
      };
    };
    
    // Network details
    network?: {
      transport?: string;
      protocol?: string;
      name?: string;
      application?: string;
      direction?: string;
      community_id?: string;
      bytes?: number;
      packets?: number;
      type?: string;
      vlan?: { id?: number; name?: string };
      inner?: {
        vlan?: { id?: number; name?: string };
      };
    };
    
    // Process information
    process?: {
      name?: string;
      pid?: number;
      ppid?: number;
      executable?: string;
      args?: string[];
      command_line?: string;
      working_directory?: string;
      title?: string;
      thread?: { id?: number };
      entity_id?: string;
      hash?: {
        md5?: string;
        sha1?: string;
        sha256?: string;
        sha512?: string;
      };
    };
    
    // User information
    user?: {
      name?: string;
      id?: string;
      domain?: string;
      full_name?: string;
      email?: string;
      group?: { name?: string; id?: string }[];
      target?: {
        name?: string;
        id?: string;
        domain?: string;
        group?: { name?: string; id?: string }[];
      };
      effective?: {
        name?: string;
        id?: string;
        domain?: string;
        group?: { name?: string; id?: string }[];
      };
      changed?: {
        name?: string;
        id?: string;
        domain?: string;
        group?: { name?: string; id?: string }[];
      };
    };
    
    // File information
    file?: {
      name?: string;
      path?: string;
      extension?: string;
      type?: string;
      size?: number;
      owner?: string;
      group?: string;
      mode?: string;
      mtime?: string;
      ctime?: string;
      atime?: string;
      created?: string;
      hash?: {
        md5?: string;
        sha1?: string;
        sha256?: string;
        sha512?: string;
      };
      mime_type?: string;
      attributes?: string[];
      pe?: {
        original_file_name?: string;
        internal_name?: string;
        file_version?: string;
        product?: string;
        company?: string;
        description?: string;
        imphash?: string;
        compiled_timestamp?: string;
        architecture?: string;
      };
    };
    
    // HTTP information
    http?: {
      method?: string;
      version?: string;
      status_code?: number;
      request?: {
        method?: string;
        bytes?: string;
        referrer?: string;
        body?: { content?: string; bytes?: number };
      };
      response?: {
        status_code?: number;
        bytes?: string;
        body?: { content?: string; bytes?: number };
      };
      request_headers?: Record<string, string>;
      response_headers?: Record<string, string>;
    };
    
    // URL information
    url?: {
      original?: string;
      scheme?: string;
      domain?: string;
      port?: string;
      path?: string;
      query?: string;
      fragment?: string;
      username?: string;
      password?: string;
      full?: string;
      extension?: string;
      registered_domain?: string;
      top_level_domain?: string;
      subdomain?: string;
    };
    
    // DNS information
    dns?: {
      type?: string;
      question?: {
        name?: string;
        type?: string;
        class?: string;
      };
      answers?: Array<{
        data?: string;
        type?: string;
        class?: string;
        ttl?: number;
      };
      resolved_ip?: string | string[];
      response_code?: string;
      header_flags?: string[];
    };
    
    // TLS information
    tls?: {
      version?: string;
      version_protocol?: string;
      cipher?: string;
      server_name?: string;
      ja3?: { hash?: string; string?: string };
      ja3s?: { hash?: string; string?: string };
      client?: {
        ja3?: string;
        supported_ciphers?: string[];
        certificate_chain?: Array<{
          issuer?: string;
          subject?: string;
          not_after?: string;
          not_before?: string;
          serial_number?: string;
          fingerprint_sha1?: string;
          fingerprint_sha256?: string;
        }>;
      };
      server?: {
        ja3s?: string;
        certificate_chain?: Array<{
          issuer?: string;
          subject?: string;
          not_after?: string;
          not_before?: string;
          serial_number?: string;
          fingerprint_sha1?: string;
          fingerprint_sha256?: string;
        }>;
      };
    };
    
    // Threat intelligence
    threat?: {
      framework?: string;
      tactic?: { id?: string; name?: string; reference?: string };
      technique?: { id?: string; name?: string; reference?: string; subtechnique?: Array<{ id?: string; name?: string }> };
      group?: { id?: string; name?: string; reference?: string };
      software?: { id?: string; name?: string; reference?: string };
      indicator?: {
        file?: { hash?: { md5?: string; sha1?: string; sha256?: string; sha512?: string }; name?: string; size?: number; type?: string };
        email?: { address?: string };
        ip?: string | string[];
        domain?: string | string[];
        url?: string | string[];
        registry_key?: string;
        process?: { name?: string };
        confidence?: string;
        first_seen?: string;
        last_seen?: string;
        provider?: string;
        reference?: string;
        type?: string;
      };
    };
    
    // Cloud information
    cloud?: {
      provider?: string;
      account?: { id?: string; name?: string };
      region?: string;
      availability_zone?: string;
      instance?: { id?: string; name?: string };
      project?: { id?: string; name?: string };
      machine?: { type?: string };
    };
    
    // Related entities
    related?: {
      ip?: string | string[];
      host?: string | string[];
      user?: string | string[];
      hash?: string | string[];
      user_agent?: string;
      parents?: string[];
    };
    
    // Labels and custom fields
    labels?: Record<string, string>;
    agent?: {
      id?: string;
      name?: string;
      type?: string;
      version?: string;
      ephemeral_id?: string;
      hostname?: string;
    };
    
    // Container information
    container?: {
      id?: string;
      image?: { name?: string; tag?: string };
      name?: string;
      runtime?: string;
      labels?: Record<string, string>;
    };
    
    // Custom/SOC specific fields
    soc?: {
      alert_id?: string;
      case_id?: string;
      task_id?: string;
      analyst_notes?: string[];
      escalation_level?: number;
      sla_breach_risk?: string;
      correlation_group?: string;
      enrichment_data?: Record<string, any>;
    };
    
    // Raw log data
    raw_log?: string;
    
    // Additional metadata
    [key: string]: any;
  };
}

/** Alert document structure */
export interface ESAlertDocument extends ESDocument {
  _source: {
    '@timestamp': string;
    alert?: {
      signature?: string;
      signature_id?: string;
      category?: string;
      severity?: number;
      action?: string;
      gid?: number;
      rev?: number;
      metadata?: Record<string, any>;
      classification?: {
        category?: string;
        confidence?: number;
        risk_score?: number;
        indicators?: Array<{
          type: string;
          value: string;
          weight: number;
          description: string;
        }>;
        mitre?: {
          tactic?: string;
          technique_id?: string;
          technique_name?: string;
        };
      };
    };
    rule?: {
      level?: string;
      description?: string;
      falsepositives?: string | string[];
      groups?: string[];
      id?: string;
      references?: string[];
      taxonomy?: string;
      updated?: string;
    };
    src_ip?: string;
    src_port?: number;
    dest_ip?: string;
    dest_port?: number;
    proto?: string;
    [key: string]: any;
  };
}

/** Metric document structure */
export interface ESMetricDocument extends ESDocument {
  _source: {
    '@timestamp': string;
    metricset?: {
      name?: string;
      period?: number;
      interval?: string;
    };
    service?: {
      type?: string;
      name?: string;
      address?: string;
      state?: string;
      version?: string;
      ephemeral_id?: string;
    };
    system?: {
      cpu?: {
        cores?: number;
        normalized?: {
          pcts?: number[];
        };
        total?: {
          normalized?: { pcts?: number[] };
        };
      };
      memory?: {
        actual?: { used?: { pct?: number; bytes?: number }; free?: number; total?: number };
        swap?: { total?: number; free?: number; used?: { bytes?: number; pct?: number } };
      };
      filesystem?: {
        available?: number;
        device_name?: string;
        files?: number;
        free?: number;
        mount_point?: string;
        total?: number;
        used?: { bytes?: number; pct?: number };
      };
      load?: {
        '1'?: number;
        '5'?: number;
        '15'?: number;
        '1m'?: number;
        '5m'?: number;
        '15m'?: number;
        cores?: number;
        norm?: { '1'?: number; '5'?: number; '15'?: number };
      };
      process?: {
        cpu?: { total?: { pct?: number } };
        memory?: { rss?: { bytes?: number; pct?: number }; virtual?: number };
        pid?: number;
        command?: string;
        state?: string;
      };
      network?: {
        in?: { bytes?: number; dropped?: number; errors?: number; packets?: number };
        out?: { bytes?: number; dropped?: number; errors?: number; packets?: number };
      };
    };
    elasticsearch?: {
      cluster?: {
        id?: string;
        name?: string;
        state?: string;
        status?: string;
      };
      node?: {
        id?: string;
        name?: string;
        master?: string;
        attributes?: Record<string, string>;
        stats?: {
          indices?: {
            docs?: { count?: number; deleted?: number };
            store?: { size_in_bytes?: number };
            indexing?: { index_total?: number; index_time_ms?: number };
            searches?: { query_total?: number; query_time_ms?: number };
            merges?: { current?: number; total?: number };
          };
          jvm?: {
            mem?: { heap_used_percent?: number; heap_used_in_bytes?: number; heap_max_in_bytes?: number };
            gc?: { collectors?: { old?: { collection_count?: number; collection_time_in_millis?: number } } };
          };
          os?: { cpu?: { percent?: number }; load_average?: number[] };
          process?: { cpu?: { percent?: number }; open_file_descriptors?: number };
        };
      };
      indices?: {
        exists?: boolean;
        mapping?: boolean;
        primaries?: {
          docs?: { count?: number };
          store?: { size_in_bytes?: number };
        };
        total?: {
          docs?: { count?: number };
          store?: { size_in_bytes?: number };
        };
      };
    };
    [key: string]: any;
  };
}

/** Event document structure */
export interface ESEventDocument extends ESDocument {
  _source: {
    '@timestamp': string;
    event?: {
      id?: string;
      kind?: string;
      category?: string[];
      type?: string[];
      module?: string;
      outcome?: string;
      severity?: number;
      reason?: string;
      risk_score?: number;
      created?: string;
      start?: string;
      end?: string;
      duration?: number;
      dataset?: string;
      action?: string;
      original?: string;
      url?: string;
      code?: string;
      reference?: string;
    };
    [key: string]: any;
  };
}

// ============================================================================
// QUERY DSL TYPES
// ============================================================================

/** Base query interface */
export interface ESQuery {
  bool?: ESBoolQuery;
  match?: ESMatchQuery | Record<string, ESMatchQueryOptions>;
  match_phrase?: ESMatchPhraseQuery | Record<string, ESMatchPhraseQueryOptions>;
  match_phrase_prefix?: ESMatchPhrasePrefixQuery | Record<string, ESMatchPhrasePrefixQueryOptions>;
  multi_match?: ESMultiMatchQuery;
  term?: ESTermQuery | Record<string, any>;
  terms?: ESTermsQuery;
  range?: ESRangeQuery | Record<string, ESRangeQueryOptions>;
  exists?: ESExistsQuery;
  ids?: ESIdsQuery;
  prefix?: ESPrefixQuery | Record<string, ESPrefixQueryOptions>;
  wildcard?: ESWildcardQuery | Record<string, ESWildcardQueryOptions>;
  regexp?: ESRegexpQuery | Record<string, ESRegexpQueryOptions>;
  fuzzy?: ESFuzzyQuery | Record<string, ESFuzzyQueryOptions>;
  nested?: ESNestedQuery;
  has_child?: ESHasChildQuery;
  has_parent?: ESHasParentQuery;
  more_like_this?: ESMoreLikeThisQuery;
  script?: ESScriptQuery;
  percolate?: ESPercolateQuery;
  simple_query_string?: ESSimpleQueryStringQuery;
  query_string?: ESQueryStringQuery;
  combined_fields?: ESCombinedFieldsQuery;
  distance_feature?: ESDistanceFeatureQuery;
  [key: string]: any;
}

/** Bool query */
export interface ESBoolQuery {
  must?: ESQuery[];
  must_not?: ESQuery[];
  should?: ESQuery[];
  filter?: ESQuery[];
  minimum_should_match?: number | string;
  boost?: number;
  _name?: string;
}

/** Match query */
export interface ESMatchQuery {
  [field: string]: ESMatchQueryOptions;
}

export interface ESMatchQueryOptions {
  query?: string;
  operator?: 'or' | 'and';
  analyzer?: string;
  auto_generate_synonyms_phrase_query?: boolean;
  fuzziness?: string | number;
  max_expansions?: number;
  prefix_length?: number;
  minimum_should_match?: string | number;
  lenient?: boolean;
  zero_terms_query?: 'none' | 'all';
  boost?: number;
  _name?: string;
}

/** Match phrase query */
export interface ESMatchPhraseQuery {
  [field: string]: ESMatchPhraseQueryOptions;
}

export interface ESMatchPhraseQueryOptions {
  query?: string;
  analyzer?: string;
  zero_terms_query?: 'none' | 'all';
  slop?: number;
  boost?: number;
  _name?: string;
}

/** Match phrase prefix query */
export interface ESMatchPhrasePrefixQuery {
  [field: string]: ESMatchPhrasePrefixQueryOptions;
}

export interface ESMatchPhrasePrefixQueryOptions {
  query?: string;
  analyzer?: string;
  max_expansions?: number;
  slop?: number;
  zero_terms_query?: 'none' | 'all';
  boost?: number;
  _name?: string;
}

/** Multi-match query */
export interface ESMultiMatchQuery {
  query?: string;
  fields?: string[];
  type?: 'best_fields' | 'most_fields' | 'cross_fields' | 'phrase' | 'phrase_prefix' | 'bool_prefix';
  analyzer?: string;
  auto_generate_synonyms_phrase_query?: boolean;
  fuzziness?: string | number;
  max_expansions?: number;
  prefix_length?: number;
  minimum_should_match?: string | number;
  operator?: 'or' | 'and';
  lenient?: boolean;
  zero_terms_query?: 'none' | 'all';
  tie_breaker?: number;
  boost?: number;
  _name?: string;
}

/** Term query */
export interface ESTermQuery {
  [field: string]: any;
}

/** Terms query */
export interface ESTermsQuery {
  [field: string]: any[];
  boost?: number;
  _name?: string;
}

/** Range query */
export interface ESRangeQuery {
  [field: string]: ESRangeQueryOptions;
}

export interface ESRangeQueryOptions {
  gt?: number | string;
  gte?: number | string;
  lt?: number | string;
  lte?: number | string;
  format?: string;
  relation?: 'INTERSECTS' | 'CONTAINS' | 'WITHIN';
  time_zone?: string;
  boost?: number;
  _name?: string;
}

/** Exists query */
export interface ESExistsQuery {
  field: string;
  boost?: number;
  _name?: string;
}

/** IDs query */
export interface ESIdsQuery {
  values: string[];
  boost?: number;
  _name?: string;
}

/** Prefix query */
export interface ESPrefixQuery {
  [field: string]: ESPrefixQueryOptions;
}

export interface ESPrefixQueryOptions {
  value: string;
  rewrite?: string;
  case_insensitive?: boolean;
  boost?: number;
  _name?: string;
}

/** Wildcard query */
export interface ESWildcardQuery {
  [field: string]: ESWildcardQueryOptions;
}

export interface ESWildcardQueryOptions {
  value: string;
  case_insensitive?: boolean;
  rewrite?: string;
  boost?: number;
  _name?: string;
}

/** Regexp query */
export interface ESRegexpQuery {
  [field: string]: ESRegexpQueryOptions;
}

export interface ESRegexpQueryOptions {
  value: string;
  flags?: string;
  max_determinized_states?: number;
  rewrite?: string;
  case_insensitive?: boolean;
  boost?: number;
  _name?: string;
}

/** Fuzzy query */
export interface ESFuzzyQuery {
  [field: string]: ESFuzzyQueryOptions;
}

export interface ESFuzzyQueryOptions {
  value: string;
  fuzziness?: string | number;
  prefix_length?: number;
  max_expansions?: number;
  transpositions?: boolean;
  rewrite?: string;
  boost?: number;
  _name?: string;
}

/** Nested query */
export interface ESNestedQuery {
  path: string;
  query: ESQuery;
  score_mode?: 'avg' | 'total' | 'max' | 'none';
  ignore_unmapped?: boolean;
  boost?: number;
  _name?: string;
}

/** Has child query */
export interface ESHasChildQuery {
  type: string;
  query: ESQuery;
  score_mode?: 'avg' | 'min' | 'max' | 'sum' | 'none';
  min_children?: number;
  max_children?: number;
  ignore_unmapped?: boolean;
  boost?: number;
  _name?: string;
}

/** Has parent query */
export interface ESHasParentQuery {
  parent_type: string;
  query: ESQuery;
  score?: boolean;
  ignore_unmapped?: boolean;
  boost?: number;
  _name?: string;
}

/** More like this query */
export interface ESMoreLikeThisQuery {
  fields?: string[];
  like?: string | Array<{ _index?: string; _id?: string; doc?: any; like?: string }>;
  unlike?: string | Array<{ _index?: string; _id?: string; doc?: any; unlike?: string }>;
  min_term_freq?: number;
  max_query_terms?: number;
  min_doc_freq?: number;
  max_doc_freq?: number;
  min_word_length?: number;
  max_word_length?: number;
  stop_words?: string[];
  analyzer?: string;
  minimum_should_match?: string | number;
  boost_terms?: number;
  include?: boolean;
  boost?: number;
  _name?: string;
}

/** Script query */
export interface ESScriptQuery {
  script: {
    source?: string;
    id?: string;
    params?: Record<string, any>;
  };
  boost?: number;
  _name?: string;
}

/** Percolate query */
export interface ESPercolateQuery {
  field: string;
  document?: any;
  documents?: any[];
  index?: string;
  id?: string;
  routing?: string;
  preference?: string;
  versions?: number[];
  version?: number;
  boost?: number;
  _name?: string;
}

/** Simple query string query */
export interface ESSimpleQueryStringQuery {
  query: string;
  fields?: string[];
  default_operator?: 'or' | 'and';
  analyzer?: string;
  flags?: string;
  analyze_wildcard?: boolean;
  lenient?: boolean;
  minimum_should_match?: string | number;
  quote_field_suffix?: string;
  all_fields?: boolean;
  auto_generate_synonyms_phrase_query?: boolean;
  boost?: number;
  _name?: string;
}

/** Query string query */
export interface ESQueryStringQuery {
  query: string;
  default_field?: string;
  default_operator?: 'or' | 'and';
  analyzer?: string;
  allow_leading_wildcard?: boolean;
  enable_position_increments?: boolean;
  fuzzy_max_expansions?: number;
  fuzziness?: string | number;
  fuzzy_prefix_length?: number;
  fuzzy_transpositions?: boolean;
  phrase_slop?: number;
  analyze_wildcard?: boolean;
  max_determinized_states?: number;
  minimum_should_match?: string | number;
  lenient?: boolean;
  time_zone?: string;
  quote_field_suffix?: string;
  auto_generate_synonyms_phrase_query?: boolean;
  boost?: number;
  _name?: string;
}

/** Combined fields query */
export interface ESCombinedFieldsQuery {
  query: string;
  fields: string;
  operator?: 'or' | 'and';
  analyzer?: string;
  auto_generate_synonyms_phrase_query?: boolean;
  boost?: number;
  _name?: string;
}

/** Distance feature query */
export interface ESDistanceFeatureQuery {
  field: string;
  pivot: string;
  origin: string;
  boost?: number;
  _name?: string;
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/** Base aggregation interface */
export interface ESAggregation {
  [name: string]:
    | ESTermsAggregation
    | ESHistogramAggregation
    | ESDateHistogramAggregation
    | ESRangeAggregation
    | ESDateRangeAggregation
    | ESAvgAggregation
    | ESSumAggregation
    | ESMinAggregation
    | ESMaxAggregation
    | ESStatsAggregation
    | ESExtendedStatsAggregation
    | ESValueCountAggregation
    | ESCardinalityAggregation
    | ESPercentilesAggregation
    | ESTopHitsAggregation
    | ESNestedAggregation
    | ESReverseNestedAggregation
    | ESFilterAggregation
    | ESGlobalAggregation
    | ESMissingAggregation
    | ESAggChildrenAggregation
    | ESAggParentAggregation
    | ESAggSamplerAggregation
    | ESAggDiversifiedSamplerAggregation
    | ESAggMultiBucketSelectorAggregation
    | ESAggCumulativeSumAggregation
    | ESAggDerivativeAggregation
    | ESAggMovingFunctionAggregation
    | ESAggSerialDiffAggregation
    | ESAggBucketScriptAggregation
    | ESAggBucketSortAggregation
    | ESAggCompositeAggregation
    | ESAggGeoDistanceAggregation
    | ESAggGeohashGridAggregation
    | ESAggGeoTileGridAggregation
    | ESAggAdjacencyMatrixAggregation
    | ESAggSignificantTermsAggregation
    | ESAggSignificantTextAggregation
    | ESAggAutoDateHistogramAggregation
    | ESAggVariableWidthHistogramAggregation
    | ESAggRareTermsAggregation
    | ESAggMultiTermsAggregation
    | ESAggInferenceAggregation
    | ESAggMatrixStatsAggregation
    | ESAggTTestAggregation
    | ESAggMedianAbsoluteDeviationAggregation
    | ESAggRateAggregation
    | ESAggNormalizedDifferenceAggregation
    | ESAggTopMetricsAggregation
    | ESAggRandomSamplerAggregation
    | ESAggAnyMaxAggregation
    | ESAggLinearRegressionAggregation
    | ESAgg HoltWintersAggregation
    | ESAggMovingAvgAggregation
    | ESAggEwmaMovingAvgAggregation
    | ESAggSingleBucketAggregation
    | ESAggMultiMetricAggregation
    | ESAggPipelineAggregation;
}

/** Terms aggregation */
export interface ESTermsAggregation {
  terms: {
    field?: string;
    size?: number;
    show_term_doc_count_error?: boolean;
    order?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    min_doc_count?: number;
    shard_min_doc_count?: number;
    include?: string | RegExp | { partition?: number; num_partitions?: number };
    exclude?: string | RegExp | { partition?: number; num_partitions?: string };
    missing?: string | number | boolean;
    execution_hint?: 'map' | 'global_ordinals' | 'global_ordinals_hash' | 'global_ordinals_low_cardinality';
    collect_mode?: 'breadth_first' | 'depth_first';
  };
  aggs?: ESAggregation;
}

/** Histogram aggregation */
export interface ESHistogramAggregation {
  histogram: {
    field: string;
    interval: number;
    offset?: number;
    order?: Record<string, 'asc' | 'desc'>;
    min_doc_count?: number;
    extended_bounds?: { min?: number; max?: number };
    hard_bounds?: { min?: number; max?: number };
    missing?: number;
  };
  aggs?: ESAggregation;
}

/** Date histogram aggregation */
export interface ESDateHistogramAggregation {
  date_histogram: {
    field: string;
    calendar_interval?: string;
    fixed_interval?: string;
    min_doc_count?: number;
    extended_bounds?: { min?: string; max?: string };
    format?: string;
    time_zone?: string;
    offset?: string;
    order?: Record<string, 'asc' | 'desc'>;
    missing?: string;
    keyed?: boolean;
  };
  aggs?: ESAggregation;
}

/** Range aggregation */
export interface ESRangeAggregation {
  range: {
    field: string;
    ranges?: Array<{ from?: number; to?: number; key?: string }>;
    keyed?: boolean;
    missing?: number;
  };
  aggs?: ESAggregation;
}

/** Date range aggregation */
export interface ESDateRangeAggregation {
  date_range: {
    field: string;
    format?: string;
    ranges?: Array<{ from?: string; to?: string; key?: string }>;
    keyed?: boolean;
    time_zone?: string;
    missing?: string;
  };
  aggs?: ESAggregation;
}

/** Metric aggregations */
export interface ESAvgAggregation { avg: { field?: string; missing?: number | string; script?: ESScriptDef }; }
export interface ESSumAggregation { sum: { field?: string; missing?: number | string; script?: ESScriptDef }; }
export interface ESMinAggregation { min: { field?: string; missing?: number | string; script?: ESScriptDef }; }
export interface ESMaxAggregation { max: { field?: string; missing?: number | string; script?: ESScriptDef }; }
export interface ESValueCountAggregation { value_count: { field: string; missing?: number | string }; }
export interface ESCardinalityAggregation { cardinality: { field?: string; precision_threshold?: number; missing?: string; script?: ESScriptDef }; }

/** Stats aggregation */
export interface ESStatsAggregation {
  stats: { field?: string; missing?: number | string; script?: ESScriptDef };
}
export interface ESExtendedStatsAggregation {
  extended_stats: {
    field?: string;
    sigma?: number;
    missing?: number | string;
    script?: ESScriptDef;
  };
}

/** Percentiles aggregation */
export interface ESPercentilesAggregation {
  percentiles: {
    field?: string;
    percents?: number[];
    missing?: number | string;
    key?: boolean;
    script?: ESScriptDef;
  };
}

/** Top hits aggregation */
export interface ESTopHitsAggregation {
  top_hits: {
    from?: number;
    size?: number;
    sort?: Array<{ [field: string]: { order?: 'asc' | 'desc'; unmapped_type?: string } } | string>;
    _source?: boolean | string[];
    explain?: boolean;
    version?: boolean;
    seq_no_primary_term?: boolean;
    track_scores?: boolean;
    highlight?: { fields?: Record<string, { fragment_size?: number; number_of_fragments?: number }> };
    script_fields?: Record<string, { script: ESScriptDef }>;
    collapse?: { field?: string; inner_hits?: any; max_concurrent_group_searches?: number };
    docvalue_fields?: Array<{ field: string; format?: string }>;
    stored_fields?: string[];
    fields?: Array<{ field: string; format?: string }>;
    highlight_config?: any;
  };
}

/** Nested/Reverse nested aggregations */
export interface ESNestedAggregation { nested: { path: string }; aggs?: ESAggregation; }
export interface ESReverseNestedAggregation { reverse_nested: { path?: string }; aggs?: ESAggregation; }
export interface ESFilterAggregation { filter: ESQuery; aggs?: ESAggregation; }
export interface ESGlobalAggregation { global: {}; aggs?: ESAggregation; }
export interface ESMissingAggregation { missing: { field: string }; aggs?: ESAggregation; }
export interface ESAggChildrenAggregation { children: { type: string }; aggs?: ESAggregation; }
export interface ESAggParentAggregation { parent: { type: string }; aggs?: ESAggregation; }
export interface ESAggSamplerAggregation { sampler: { shard_size?: number }; aggs?: ESAggregation; }
export interface ESAggDiversifiedSamplerAggregation { diversified_sampler: { field?: string; max_docs_per_value?: number; shard_size?: number; execution_hint?: string }; aggs?: ESAggregation; }
export interface ESAggMultiBucketSelectorAggregation { buckets_path: string; gap_policy?: 'skip' | 'insert_zeros'; }
export interface ESAggCumulativeSumAggregation { cumulative_sum: { buckets_path: string; format?: string }; }
export interface ESAggDerivativeAggregation { derivative: { buckets_path: string; gap_policy?: 'skip' | 'insert_zeros'; unit?: string; format?: string }; }
export interface ESAggMovingFunctionAggregation { moving_fn: { buckets_path: string; window: number; script: ESScriptDef; shift?: number }; }
export interface ESAggSerialDiffAggregation { serial_diff: { buckets_path: string; lag?: number; gap_policy?: 'skip' | 'insert_zeros'; format?: string }; }
export interface ESAggBucketScriptAggregation { bucket_script: { buckets_path: Record<string, string>; script: ESScriptDef; gap_policy?: 'skip' | 'insert_zeros'; format?: string }; }
export interface ESAggBucketSortAggregation { bucket_sort: { sort?: Array<{ [field: string]: { order?: 'asc' | 'desc' } }>; from?: number; size?: number; gap_policy?: 'skip' | 'insert_zeros' }; }
export interface ESAggCompositeAggregation { composite: { sources: Array<{ [name: string]: { terms?: { field: string; missing_order?: 'first' | 'last' | 'custom'; missing_bucket?: boolean; order?: 'asc' | 'desc' }; histograms?: { field: string; interval: number; missing_order?: 'first' | 'last' | 'custom'; missing_bucket?: boolean; order?: 'asc' | 'desc' }; date_histogram?: { field: string; calendar_interval?: string; fixed_interval?: string; format?: string; time_zone?: string; missing_order?: 'first' | 'last' | 'custom'; missing_bucket?: boolean; order?: 'asc' | 'desc' } }>; size?: number; after?: Record<string, any> }; aggs?: ESAggregation; }
export interface ESAggGeoDistanceAggregation { geo_distance: { field: string; origin: string; ranges?: Array<{ from?: number; to?: number; key?: string }>; unit?: 'km' | 'mi' | 'm' | 'yd' | 'ft'; distance_type?: 'arc' | 'plane' }; aggs?: ESAggregation; }
export interface ESAggGeohashGridAggregation { geohash_grid: { field: string; precision?: number; size?: number; shard_size?: number }; aggs?: ESAggregation; }
export interface ESAggGeoTileGridAggregation { geotile_grid: { field: string; precision?: number; size?: number; shard_size?: number; bounds?: { top_left?: { lon: number; lat: number }; bottom_right?: { lon: number; lat: number } } }; aggs?: ESAggregation; }
export interface ESAggAdjacencyMatrixAggregation { adjacency_matrix: { separators: Array<{ from: string; to: string }>; filters?: Record<string, ESQuery> }; aggs?: ESAggregation; }
export interface ESAggSignificantTermsAggregation { significant_terms: { field?: string; size?: number; background_filter?: ESQuery; ...rest: any }; aggs?: ESAggregation; }
export interface ESAggSignificantTextAggregation { significant_text: { field: string; size?: number; ...rest: any }; aggs?: ESAggregation; }
export interface ESAggAutoDateHistogramAggregation { auto_date_histogram: { field: string; buckets?: number; minimum_interval?: string; format?: string; time_zone?: string; missing?: string; keyed?: boolean }; aggs?: ESAggregation; }
export interface ESAggVariableWidthHistogramAggregation { variable_width_histogram: { field: string; buckets?: number; initial_buffer?: number; shard_size?: number; missing?: number }; aggs?: ESAggregation; }
export interface ESAggRareTermsAggregation { rare_terms: { field: string; max_doc_count?: number; precision?: { after?: number; missing?: number; ...rest: any }; include?: string | RegExp; exclude?: string | RegExp; missing?: string | number | boolean }; aggs?: ESAggregation; }
export interface ESAggMultiTermsAggregation { multi_terms: { terms: Array<{ field: string; missing?: string | number | boolean; missing_order?: 'first' | 'last' | 'custom'; order?: 'asc' | 'desc' }>; size?: number; show_term_doc_count_error?: boolean; order?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>; min_doc_count?: number; shard_min_doc_count?: number }; aggs?: ESAggregation; }
export interface ESAggInferenceAggregation { inference: { model_id: string; buckets_path: string; ...rest: any }; aggs?: ESAggregation; }
export interface ESAggMatrixStatsAggregation { matrix_stats: { fields: string[]; missing?: Record<string, number | string | boolean> }; }
export interface ESAggTTestAggregation { t_test: { a: { field: string }; b: { field: string }; type?: 'homoscedastic' | 'heteroscedastic'; ...rest: any }; }
export interface ESAggMedianAbsoluteDeviationAggregation { median_absolute_deviation: { field: string; ...rest: any }; }
export interface ESAggRateAggregation { rate: { field: string; unit?: string; mode?: 'delta' | 'gap_only'; gaps?: 'insert_default' | 'insert_zeros' | 'keep_value'; }; }
export interface ESAggNormalizedDifferenceAggregation { normalized_difference: { buckets: [string, string]; format?: string }; }
export interface ESAggTopMetricsAggregation { top_metrics: { metrics: Array<{ field: string }>; sort?: Array<{ [field: string]: { order?: 'asc' | 'desc' } }>; size?: number }; }
export interface ESAggRandomSamplerAggregation { random_sampler: { probability: number; seed?: number }; aggs?: ESAggregation; }
export interface ESAggAnyMaxAggregation { any_value: { field: string; missing?: number | string | boolean }; }
export interface ESAggLinearRegressionAggregation { moving_linear_regression: { buckets_path: string; window: number; model?: 'simple' | 'weighted'; predict?: number; intercept?: number; gap_policy?: 'skip' | 'insert_zeros' }; }
export interface ESAggHoltWintersAggregation { holt_winters: { buckets_path: string; window: number; alpha?: number; beta?: number; gamma?: number; pad?: boolean; predict?: number; minimize?: boolean; gap_policy?: 'skip' | 'insert_zeros' }; }
export interface ESAggMovingAvgAggregation { moving_avg: { buckets_path: string; window?: number; model?: 'simple' | 'linear' | 'ewma' | 'holt' | 'holt_winters'; gap_policy?: 'skip' | 'insert_zeros'; settings?: Record<string, any>; predict?: number; minimize?: boolean; ...rest: any }; }
export interface ESAggEwmaMovingAvgAggregation { ewma: { buckets_path: string; alpha?: number; window?: number; gap_policy?: 'skip' | 'insert_zeros'; ...rest: any }; }

/** Pipeline aggregation base types */
export interface ESAggSingleBucketAggregation { doc_count: number; [key: string]: any; }
export interface ESAggMultiMetricAggregation { [key: string]: number; doc_count: number; }
export interface ESAggPipelineAggregation { value: number | null; value_as_string?: string; [key: string]: any; }

/** Script definition */
export interface ESScriptDef {
  source?: string;
  id?: string;
  params?: Record<string, any>;
}

// ============================================================================
// SEARCH RESPONSE TYPES
// ============================================================================

/** Search request */
export interface ESSearchRequest {
  _source?: boolean | string[];
  from?: number;
  size?: number;
  explain?: boolean;
  version?: boolean;
  seq_no_primary_term?: boolean;
  track_total_hits?: boolean | number;
  timeout?: string;
  terminate_after?: number;
  scroll?: string;
  search_type?: 'query_then_fetch' | 'dfs_query_then_fetch';
  preference?: string;
  request_cache?: boolean;
  batched_reduce_size?: number;
  max_concurrent_shard_requests?: number;
  pre_filter_shard_size?: number;
  rest_total_hits_as_int?: boolean;
  min_compatible_shard_node?: string;
  profile?: boolean;
  typed_keys?: boolean;
  stored_fields?: string[];
  script_fields?: Record<string, { script: ESScriptDef }>;
  docvalue_fields?: Array<{ field: string; format?: string }>;
  fields?: Array<{ field: string; format?: string }>;
  post_filter?: ESQuery;
  sort?: Array<{ [field: string]: { order?: 'asc' | 'desc'; unmapped_type?: string; missing?: '_first' | '_last'; mode?: 'avg' | 'min' | 'max' | 'sum'; numeric_type?: 'long' | 'double'; distance_type?: 'arc' | 'plane'; unit?: string; ignore_unmapped?: boolean } } | string>;
  highlight?: ESHighlightConfig;
  rescore?: Array<{
    window_size?: number;
    query_weight?: number;
    rescore_query_weight?: number;
    score_mode?: 'total' | 'multiply' | 'avg' | 'max' | 'min' | 'sum';
    query: {
      rescore_query: ESQuery;
      query_weight?: number;
      rescore_query_weight?: number;
      score_mode?: 'total' | 'multiply' | 'avg' | 'max' | 'min' | 'sum';
    };
  }>;
  collapse?: {
    field: string;
    inner_hits?: ESSearchRequest;
    max_concurrent_group_searches?: number;
    second?: {
      collapse: { field: string; inner_hits?: ESSearchRequest; max_concurrent_group_searches?: number };
      score_mode?: 'max' | 'none';
    };
  };
  suggest?: ESSuggestConfig;
  query?: ESQuery;
  aggs?: ESAggregation;
  runtime_mappings?: Record<string, ESRuntimeField>;
  slices?: { id?: { max?: number; min?: number }; max?: number; total?: number };
  point_in_time?: { id: string; keep_alive?: string };
  fields_metadata?: boolean;
  knn?: ESKnnSearch;
  rank?: ESRankConfig;
}

/** KNN search config */
export interface ESKnnSearch {
  field: string;
  query_vector?: number[];
  k?: number;
  num_candidates?: number;
  filter?: ESQuery;
  similarity?: number;
  boost?: float;
}

/** Rank config */
export interface ESRankConfig {
  rrf?: { window_size?: number; rank_constant?: number };
}

/** Highlight configuration */
export interface ESHighlightConfig {
  pre_tags?: string[];
  post_tags?: string[];
  fields?: Record<string, {
    pre_tags?: string[];
    post_tags?: string[];
    fragment_size?: number;
    number_of_fragments?: number;
    highlight_query?: ESQuery;
    no_match_size?: number;
    order?: 'score' | 'none';
    type?: 'unified' | 'plain' | 'fvh';
    fragmenter?: 'span' | 'simple' | 'boundary_scanner' | 'boundary_max_scan' | 'boundary_chars';
    boundary_chars?: string;
    boundary_max_scan?: number;
    boundary_scanner?: 'chars' | 'sentence' | 'word' | 'boundary_scanner_locale';
    boundary_scanner_locale?: string;
    encoder?: 'default' | 'html';
    require_field_match?: boolean;
    matched_fields?: string[];
    phrase_limit?: number;
    options?: {
      skip_if_last_matched?: boolean;
      skip_if_already_matched?: boolean;
      payload?: { term?: string };
      max_determinized_states?: number;
      fragment_offset?: number;
      max_fragment_length?: number;
      number_of_fragments?: number;
      boundary_max_scan?: number;
      boundary_chars?: string;
      boundary_scanner?: 'chars' | 'sentence' | 'word';
      boundary_scanner_locale?: string;
      highligter?: 'unified' | 'plain' | 'fvh';
      order?: 'score' | 'none';
      pre_tags?: string[];
      post_tags?: string[];
    };
  }>;
  use_boundary_scanner?: boolean;
  boundary_chars?: string;
  boundary_max_scan?: number;
  boundary_scanner?: 'chars' | 'sentence' | 'word' | 'boundary_scanner_locale';
  boundary_scanner_locale?: string;
  encoder?: 'default' | 'html';
  tags_schema?: 'styled' | 'default' | 'only_with_difference';
  require_field_match?: boolean;
  max_analyzed_offset?: number;
  max_fragment_length?: number;
  no_match_size?: number;
  type?: 'unified' | 'plain' | 'fvh';
  fragment_size?: number;
  number_of_fragments?: number;
  phrase_limit?: number;
  highlight_query?: ESQuery;
  order?: 'score' | 'none';
}

/** Suggest configuration */
export interface ESSuggestConfig {
  [name: string]: {
    text: string;
    term?: {
      field: string;
      size?: number;
      sort?: 'score' | 'frequency';
      suggest_mode?: 'missing' | 'popular' | 'always';
      min_word_length?: number;
      prefix_length?: number;
      max_edits?: number;
      max_inspections?: number;
      min_doc_freq?: number;
      max_term_freq?: number;
      string_distances?: 'internal' | 'damerau_levenshtein' | 'levenshtein' | 'jaro_winkler' | 'ngram';
      analyzer?: string;
      lowercase_terms?: boolean;
      pre_filter?: string;
      post_filter?: string;
      shard_size?: number;
    };
    phrase?: {
      field: string;
      size?: number;
      real_word_error_likelihood?: number;
      max_errors?: number;
      separator?: string;
      generator?: {
        field: string;
        suggest_mode?: 'missing' | 'popular' | 'always';
        min_word_length?: number;
        prefix_length?: number;
        max_edits?: number;
        max_inspections?: number;
        min_doc_freq?: number;
        max_term_freq?: number;
        string_distances?: 'internal' | 'damerau_levenshtein' | 'levenshtein' | 'jaro_winkler' | 'ngram';
        analyzer?: string;
        lowercase_terms?: boolean;
        pre_filter?: string;
        post_filter?: string;
        shard_size?: number;
      };
      candidates_generator?: 'popular' | 'correct';
      confidence?: number;
      collate?: {
        query: ESSourceFiltering;
        prune?: boolean;
        params?: Record<string, any>;
      };
      gram_size?: number;
      real_word_errorLikelihood?: number;
      token_limit?: number;
      direct_generator?: Array<{
        field: string;
        suggest_mode?: 'missing' | 'popular' | 'always';
        min_word_length?: number;
        prefix_length?: number;
        max_edits?: number;
        max_inspections?: number;
        min_doc_freq?: number;
        max_term_freq?: number;
        string_distances?: 'internal' | 'damerau_levenshtein' | 'levenshtein' | 'jaro_winkler' | 'ngram';
        analyzer?: string;
        lowercase_terms?: boolean;
        pre_filter?: string;
        post_filter?: string;
        shard_size?: number;
        size?: number;
        pre_filter?: string;
        post_filter?: string;
      }>;
      highlight?: { pre_tag?: string; post_tag?: string; num_matches?: number };
      smoothing?: string;
      force_unigrams?: boolean;
      token_limit?: number;
      shuffle?: boolean;
      fuzzy?: {
        fuzziness?: string | number;
        prefix_length?: number;
        max_expansions?: number;
        transpositions?: boolean;
        unicode_aware?: boolean;
      };
      separator?: string;
      size?: number;
      field?: string;
      max_corrections?: number;
      errors?: { position?: number; length?: number; offset?: number; start_offset?: number; no_pos_info?: boolean };
    };
    complete?: {
      field: string;
      analyzer?: string;
      size?: number;
      prefix?: string;
      fuzzy?: {
        fuzziness?: string | number;
        prefix_length?: number;
        max_expansions?: number;
        transpositions?: boolean;
        unicode_aware?: boolean;
        min_length?: number;
        skip_duplicates?: boolean;
      };
      delimiter?: string;
      skip_duplicates?: boolean;
      fuzzy_options?: {
        transpositions?: boolean;
        unicode_aware?: boolean;
        max_edits?: number;
        prefix_length?: number;
        min_fuzzy_length?: number;
        prefix_length?: number;
        min_length?: number;
        skip_duplicates?: boolean;
      };
    };
    context?: {
      category?: Array<{
        context?: string;
        boost?: number;
        prefix?: boolean;
        group?: boolean;
      }];
      geo?: Array<{
        location?: { lat: number; lon: number };
        precision?: string;
        neighbours?: string[];
        boost?: number;
        prefix?: boolean;
        group?: boolean;
      }];
    };
  };
}

/** Source filtering */
export interface ESSourceFiltering {
  includes?: string[];
  excludes?: string[];
}

/** Search response */
export interface ESSearchResponse<T = any> {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: ESHitsMetadata<T>;
  aggregations?: Record<string, any>;
  suggest?: Record<string, Array<{
    text: string;
    offset: number;
    length: number;
    options: Array<{
      text: string;
      score: number;
      freq?: number;
      highlighted?: string;
      collate_match?: boolean;
    }>;
  }>>;
  profile?: Record<string, any>;
  terminated_early?: boolean;
  pit_id?: string;
}

/** Hits metadata */
export interface ESHitsMetadata<T = any> {
  total: ESTotalHits;
  max_score: number | null;
  hits: Array<ESHit<T>>;
}

/** Total hits info */
export interface ESTotalHits {
  value: number;
  relation: 'eq' | 'gte';
}

/** Single hit */
export interface ESHit<T = any> {
  _index: string;
  _id: string;
  _score: number | null;
  _source: T;
  _version?: number;
  _seq_no?: number;
  _primary_term?: number;
  _explanation?: ESExplanation;
  fields?: Record<string, any>;
  highlight?: Record<string, string[]>;
  inner_hits?: Record<string, ESHitsMetadata<T>>;
  sort?: any[];
  matched_queries?: string[];
  ignored?: string[];
  shards_meta?: Record<string, any>;
}

/** Score explanation */
export interface ESExplanation {
  value: number;
  description: string;
  details?: ESExplanation[];
}

// ============================================================================
// CLUSTER HEALTH & STATS TYPES
// ============================================================================

/** Cluster health response */
export interface ESClusterHealth {
  cluster_name: string;
  status: ClusterHealthStatus;
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
  delayed_unassigned_shards: number;
  number_of_pending_tasks: number;
  number_of_in_flight_fetch: number;
  task_max_waiting_in_queue_millis: number;
  active_shards_percent_as_number: number;
}

/** Cluster statistics */
export interface ESClusterStats {
  _nodes: { total: number; successful: number; failed: number };
  cluster_name: string;
  cluster_uuid: string;
  timestamp: number;
  status: ClusterHealthStatus;
  indices: {
    count: number;
    shards: { total: number; primaries: number; replication: number };
    docs: { count: number; deleted: number };
    store: { size_in_bytes: number; size: string };
    fielddata: { memory_size_in_bytes: string; evictions: string };
    indexing: { index_total: number; index_time: string; index_current: number; index_failed: number; delete_total: number; delete_time: string; delete_current: number; noop_update_total: number; is_throttled: boolean; throttle_time: string };
    merges: { current: number; current_docs: number; current_size_in_bytes: string; total: number; total_time: string; total_docs: number; total_size_in_bytes: string; failed: number };
    refresh: { total: string; total_time_in_millis: number; external_total: number; external_total_time: string; listeners: number };
    flush: { total: number; periodic: number; total_time: string };
    get: { total: number; time: string; exists_total: number; exists_time: string; missing_total: number; missing_time: string; current: number };
    search: { open_contexts: number; query_total: number; query_time: string; query_current: number; fetch_total: number; fetch_time: string; scroll_total: number; scroll_time: string; suggest_total: number; suggest_time: string; point_in_time_total: number; point_in_time_time: string };
    segments: { count: number; memory_in_bytes: string; terms_memory_in_bytes: string; stored_fields_memory_in_bytes: string; term_vectors_memory_in_bytes: string; norms_memory_in_bytes: string; points_memory_in_bytes: string; doc_values_memory_in_bytes: string; index_writer_memory_in_bytes: string; index_writer_max_memory_in_bytes: string; version_map_memory_in_bytes: string; fixed_bit_set_memory_in_bytes: string; writable_index_writer_buffer_bytes: number; max_unsafe_auto_id_timestamp: number };
    completion: { size_in_bytes: string };
    translog: { operations: number; size_in_bytes: number; uncommitted_operations: number; uncommitted_size_in_bytes: number; earliest_last_modified_age: number };
    request_cache: { memory_size_in_bytes: string; evictions: number; hit_count: number; miss_count: number };
    recovery: { current_as_source: number; current_as_target: number };
  };
  nodes: {
    count: { total: number; coordinated_only: number; data: number; data_cold: number; data_content: number; data_frozen: number; data_hot: number; data_warm: number; ingest: number; master: number; ml: number; remote_cluster_client: number; transform: number };
    versions: string[];
    os: { available_processors: number; allocated_processors: number; names: Array<{ name: string; count: number }>; pretty_names: Array<{ pretty_name: string; count: number }>; mem: { total_in_bytes: number; free_in_bytes: number; free_percent: number; used_in_bytes: number; used_percent: number } };
    process: { cpu: { percent: number }; open_file_descriptors: { min: number; max: number; avg: number } };
    jvm: { versions: Array<{ version: string; vm_name: string; vm_vendor: string; bundled_jdk: boolean; using_bundled_jdk: boolean; count: number }]; mem: { heap_used_in_bytes: number; heap_max_in_bytes: number; heaps: Array<{ used_in_bytes: number; max_in_bytes: number }]; non_heap_used_in_bytes: number; non_heap_max_in_bytes: number; direct_pool_max_in_bytes: number; direct_pool_used_in_bytes: number }; threads: number };
  };
}

/** Node information */
export interface ESNodeInfo {
  name: string;
  transport_address: string;
  host: string;
  ip: string;
  version: string;
  build_flavor: string;
  build_type: string;
  build_hash: string;
  build_date: string;
  build_snapshot: boolean;
  lucene_version: string;
  minimum_wire_compatibility_version: string;
  minimum_index_compatibility_version: number;
  roles: NodeRole[];
  attributes: Record<string, string>;
  settings: Record<string, any>;
  jvm?: {
    pid: number;
    version: string;
    vm_name: string;
    vm_version: string;
    vm_vendor: string;
    start_time: number;
    boot_classpath: string[];
    classpath: string[];
    gc_collectors: string[];
    memory_pools: string[];
    mem: {
      heap_init_in_bytes: number;
      heap_max_in_bytes: number;
      non_heap_init_in_bytes: number;
      non_heap_max_in_bytes: number;
      direct_max_in_bytes: number;
    };
  };
  os?: {
    refresh_interval_in_millis: number;
    name: string;
    pretty_name: string;
    arch: string;
    version: string;
    available_processors: number;
    allocated_processors: number;
    cpu: {
      vendor: string;
      model: string;
      frequency_mhz: number;
      cache_size_in_bytes: number;
      total_cores: number;
      total_sockets: number;
      cores_per_socket: number;
      threads_per_core: number;
      cache?: {
        level: number;
        size_in_bytes: number;
        sets: number;
        ways: number;
      }[];
    };
    mem: {
      total_in_bytes: number;
      free_in_bytes: number;
      free_percent: number;
      used_in_bytes: number;
      used_percent: number;
    };
    swap: {
      total_in_bytes: number;
      free_in_bytes: number;
      used_in_bytes: number;
    };
  };
  process?: {
    refresh_interval_in_millis: number;
    id: number;
    mlockall: boolean;
    cwd: string;
    file_descriptor: { permitted: number; soft_limit: number; hard_limit: number };
    cpu: {
      percent: number;
      total_in_millis: number;
      time_in_millis: number;
    };
    mem: {
      total_virtual_in_bytes: number;
    };
  };
}

/** Node statistics */
export interface ESNodeStats {
  timestamp: number;
  name: string;
  uuid: string;
  transport_address: string;
  host: string;
  ip: string;
  roles: NodeRole[];
  indices?: {
    docs: { count: number; deleted: number };
    store: { size_in_bytes: number };
    indexing: { index_total: number; index_time: string; index_current: number; index_failed: number; throttle_time: string };
    merges: { current: number; current_docs: number; current_size_in_bytes: string; total: number; total_time: string; total_docs: number; total_size_in_bytes: string; failed: number };
    refresh: { total: number; total_time_in_millis: number; external_total: number; external_total_time: string; listeners: number };
    flush: { total: number; periodic: number; total_time: string };
    get: { total: number; time: string; exists_total: number; exists_time: string; missing_total: number; missing_time: string; current: number };
    search: { open_contexts: number; query_total: number; query_time: string; query_current: number; fetch_total: number; fetch_time: string; scroll_total: number; scroll_time: string; point_in_time_total: number; point_in_time_time: string };
    segments: { count: number; memory_in_bytes: string; terms_memory_in_bytes: string; stored_fields_memory_in_bytes: string; term_vectors_memory_in_bytes: string; norms_memory_in_bytes: string; points_memory_in_bytes: string; doc_values_memory_in_bytes: string; index_writer_memory_in_bytes: string; index_writer_max_memory_in_bytes: string; version_map_memory_in_bytes: string; fixed_bit_set_memory_in_bytes: string; writable_index_writer_buffer_bytes: number; max_unsafe_auto_id_timestamp: number };
    completion: { size_in_bytes: string };
    translog: { operations: number; size_in_bytes: number; uncommitted_operations: number; uncommitted_size_in_bytes: number; earliest_last_modified_age: number };
    request_cache: { memory_size_in_bytes: string; evictions: number; hit_count: number; miss_count: number };
    recovery: { current_as_source: number; current_as_target: number };
  };
  os?: {
    cpu: { percent: number; load_average: Record<string, number> };
    mem: { total_in_bytes: number; free_in_bytes: number; free_percent: number; used_in_bytes: number; used_percent: number };
    swap: { total_in_bytes: number; free_in_bytes: number; used_in_bytes: number };
  };
  jvm?: {
    mem: { heap_used_in_bytes: number; heap_used_percent: number; heap_max_in_bytes: number; non_heap_used_in_bytes: number; pools: { young: { used_in_bytes: number; max_in_bytes: number }; survivor: { used_in_bytes: number; max_in_bytes: number }; old: { used_in_bytes: number; max_in_bytes: number } } };
    threads: number;
    gc: { collectors: { old: { collection_count: number; collection_time_in_millis: number }; young: { collection_count: number; collection_time_in_millis: number } } };
    uptime_in_millis: number;
  };
  process?: {
    cpu: { percent: number; total_in_millis: number };
    open_file_descriptors: number;
    mem: { total_virtual_in_bytes: number };
  };
  fs: {
    total: { total_in_bytes: number; free_in_bytes: string; available_in_bytes: string };
    data: string[];
    io_stats: { devices: Array<{ device_name: string; operations: number; read_operations: number; write_operations: number; read_kilobytes: number; write_kilobytes: number; read_size_in_bytes: number; write_size_in_bytes: number }> };
  };
  script: {
    compilations: number;
    cache_evictions: number;
    contexts: number;
  };
  ingestion: {
    pipelines: Record<string, {
      processors: Array<{ type: string; stats: { failed: number; skipped: number; executed: number; time_in_nanos: number } }>;
      stats: { failed: number; processed: number; time_in_millis: number; ingested_pipeline_count: number; ingested_total: number; ingested_failed: number };
    }>;
  };
}

/** Index information */
export interface ESIndexInfo {
  health: IndexHealthStatus;
  status: 'open' | 'close';
  index: string;
  uuid: string;
  pri: number;
  rep: number;
  'docs.count': number;
  'docs.deleted': number;
  'store.size': string;
  'pri.store.size': string;
  completion?: { percentage: number; phase: string; shards: Array<{ shard: number; primary: boolean; state: string; stage: string; node: string; relocating_node?: string; recovery_source?: string; unassigned_reason?: { reason: string; decision?: string; excluded?: string; allocation_status?: string } }[]> };
}

/** Index statistics */
export interface ESIndexStats {
  shards: { total: number; primaries: number; replication: number };
  docs: { count: number; deleted: number };
  store: { size_in_bytes: number; size: string };
  indexing: { index_total: number; index_time: string; index_current: number; index_failed: number; throttle_time: string };
  merges: { current: number; current_docs: number; current_size_in_bytes: string; total: number; total_time: string; total_docs: number; total_size_in_bytes: string; failed: number };
  refresh: { total: number; total_time_in_millis: number; external_total: number; external_total_time: string; listeners: number };
  flush: { total: number; periodic: number; total_time: string };
  get: { total: number; time: string; exists_total: number; exists_time: string; missing_total: number; missing_time: string; current: number };
  search: { open_contexts: number; query_total: number; query_time: string; query_current: number; fetch_total: number; fetch_time: string; scroll_total: number; scroll_time: string; point_in_time_total: number; point_in_time_time: string };
  segments: { count: number; memory_in_bytes: string; terms_memory_in_bytes: string; stored_fields_memory_in_bytes: string; term_vectors_memory_in_bytes: string; norms_memory_in_bytes: string; points_memory_in_bytes: string; doc_values_memory_in_bytes: string; index_writer_memory_in_bytes: string; index_writer_max_memory_in_bytes: string; version_map_memory_in_bytes: string; fixed_bit_set_memory_in_bytes: string; writable_index_writer_buffer_bytes: number; max_unsafe_auto_id_timestamp: number };
  completion: { size_in_bytes: string };
  translog: { operations: number; size_in_bytes: number; uncommitted_operations: number; uncommitted_size_in_bytes: number; earliest_last_modified_age: number };
  request_cache: { memory_size_in_bytes: string; evictions: number; hit_count: number; miss_count: number };
  recovery: { current_as_source: number; current_as_target: number };
  primaries: {
    docs: { count: number; deleted: number };
    store: { size_in_bytes: number; size: string };
    indexing: { index_total: number; index_time: string; index_current: number; index_failed: number; throttle_time: string };
    merges: { current: number; current_docs: number; current_size_in_bytes: string; total: number; total_time: string; total_docs: number; total_size_in_bytes: string; failed: number };
    refresh: { total: number; total_time_in_millis: number; external_total: number; external_total_time: string; listeners: number };
    flush: { total: number; periodic: number; total_time: string };
    get: { total: number; time: string; exists_total: number; exists_time: string; missing_total: number; missing_time: string; current: number };
    search: { open_contexts: number; query_total: number; query_time: string; query_current: number; fetch_total: number; fetch_time: string; scroll_total: number; scroll_time: string; point_in_time_total: number; point_in_time_time: string };
    segments: { count: number; memory_in_bytes: string; terms_memory_in_bytes: string; stored_fields_memory_in_bytes: string; term_vectors_memory_in_bytes: string; norms_memory_in_bytes: string; points_memory_in_bytes: string; doc_values_memory_in_bytes: string; index_writer_memory_in_bytes: string; index_writer_max_memory_in_bytes: string; version_map_memory_in_bytes: string; fixed_bit_set_memory_in_bytes: string; writable_index_writer_buffer_bytes: number; max_unsafe_auto_id_timestamp: number };
    completion: { size_in_bytes: string };
    translog: { operations: number; size_in_bytes: number; uncommitted_operations: number; uncommitted_size_in_bytes: number; earliest_last_modified_age: number };
    request_cache: { memory_size_in_bytes: string; evictions: number; hit_count: number; miss_count: number };
    recovery: { current_as_source: number; current_as_target: number };
  };
}

// ============================================================================
// INGEST PIPELINE TYPES
// ============================================================================

/** Ingest pipeline configuration */
export interface ESIngestPipeline {
  description?: string;
  version?: number;
  deprecated?: boolean;
  on_failure?: ESProcessor[];
  processors: ESProcessor[];
}

/** Processor types */
export interface ESProcessor {
  set?: {
    field: string;
    value: any;
    override?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  script?: {
    source?: string;
    id?: string;
    params?: Record<string, any>;
    lang?: string;
    if?: string;
    on_failure?: ESProcessor[];
    ignore_failure?: boolean;
    tag?: string;
  };
  remove?: {
    field: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  drop?: {
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  rename?: {
    field: string;
    target_field: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  convert?: {
    field: string;
    target_field?: string;
    type: 'string' | 'long' | 'double' | 'float' | 'boolean' | 'ip' | 'auto';
    mode?: 'overwrite' | 'merge';
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
    default_value?: any;
  };
  grok?: {
    field: string;
    patterns?: string[];
    pattern_definitions?: Record<string, string>;
    trace_match?: boolean;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
    overwrite?: string[];
    pattern?: string;
  };
  dissect?: {
    field: string;
    pattern: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
    append_separator?: string;
    overwrite?: string[];
  };
  date?: {
    field: string;
    target_field?: string;
    formats?: string[];
    timezone?: string;
    locale?: string;
    output_format?: string;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  geoip?: {
    field: string;
    target_field?: string;
    database_file?: string;
    properties?: string[];
    first_only?: boolean;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  user_agent?: {
    field: string;
    target_field?: string;
    regex_file?: string;
    properties?: string[];
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  cidr?: {
    field: string;
    target_field?: string;
    cidr: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  uri_parts?: {
    field: string;
    target_field?: string;
    keep_original?: boolean;
    remove_if_empty?: boolean;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  urldecode?: {
    field: string;
    target_field?: string;
    charset?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  bytes?: {
    field: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  kv?: {
    field: string;
    field_split?: string;
    value_split?: string;
    target_field?: string;
    include_keys?: string[];
    exclude_keys?: string[];
    prefix?: string;
    strip_brackets?: boolean;
    trim_key?: string;
    trim_value?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
    strip?: boolean;
    recursive?: boolean;
    verbose?: boolean;
  };
  csv?: {
    field: string;
    target_fields?: string[];
    separator?: string;
    quote?: string;
    trim?: boolean;
    empty_value?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  json?: {
    field: string;
    target_field?: string;
    add_to_root?: boolean;
    visible?: boolean;
    on_failure?: ESProcessor[];
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  foreach?: {
    field: string;
    processor: ESProcessor;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  join?: {
    field: string;
    separator?: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  split?: {
    field: string;
    separator?: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    preserve_trailing?: boolean;
    tag?: string;
  };
  uppercase?: {
    field: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  lowercase?: {
    field: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  trim?: {
    field: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  fail?: {
    message?: string;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  append?: {
    field: string;
    value: any;
    allow_duplicate?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  community_id?: {
    target_field?: string;
    source_ip?: string;
    destination_ip?: string;
    iana_number?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  dns?: {
    field: string;
    target_field?: string;
    type?: string;
    fail_dns?: boolean;
    max_calls_per_second?: number;
    nameservers?: string[];
    dns_timeout_seconds?: number;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  enrich?: {
    policy_name: string;
    field: string;
    target_field?: string;
    max_matches?: number;
    override_enabled?: boolean;
    shape_relation?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  pipeline?: {
    name: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  dot_expander?: {
    field: string;
    target_field?: string;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  fingerprint?: {
    field: string;
    target_field?: string;
    method?: string;
    salt?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  html_strip?: {
    field: string;
    target_field?: string;
    ignore_missing?: boolean;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  inference?: {
    model_id: string;
    input_output?: string;
    target_field?: string;
    field_map?: Record<string, string>;
    if?: string;
    ignore_failure?: boolean;
    tag?: string;
  };
  [key: string]: any;
}

// ============================================================================
// ILM POLICY TYPES
// ============================================================================

/** ILM Policy configuration */
export interface ESLifecyclePolicy {
  policy: {
    phases: {
      hot?: {
        min_age?: string;
        actions: {
          rollover?: {
            max_age?: string;
            max_docs?: number;
            max_size?: string;
            max_primary_shard_size?: string;
          };
          set_priority?: { priority: number };
          readonly?: {};
          allocate?: { number_of_replicas?: number; require?: Record<string, string>; include?: Record<string, string>; exclude?: Record<string, string> };
          shrink?: { number_of_shards?: number; max_primary_shard_size?: string };
          forcemerge?: { max_num_segments?: number };
          freeze?: {};
          downsample?: { fixed_interval?: string };
          searchable_snapshot?: { snapshot_repository: string; force_merge_index?: boolean };
          delete?: { delete_searchable_snapshot?: boolean };
          rollback?: {};
          read_only?: {};
          unfollow?: {};
        };
      };
      warm?: {
        min_age?: string;
        actions: {
          set_priority?: { priority: number };
          readonly?: {};
          allocate?: { number_of_replicas?: number; require?: Record<string, string>; include?: Record<string, string>; exclude?: Record<string, string> };
          shrink?: { number_of_shards?: number; max_primary_shard_size?: string };
          forcemerge?: { max_num_segments?: number };
          freeze?: {};
          downsample?: { fixed_interval?: string };
          searchable_snapshot?: { snapshot_repository: string; force_merge_index?: boolean };
          delete?: { delete_searchable_snapshot?: boolean };
          rollback?: {};
          read_only?: {};
          unfollow?: {};
        };
      };
      cold?: {
        min_age?: string;
        actions: {
          set_priority?: { priority: number };
          readonly?: {};
          allocate?: { number_of_replicas?: number; require?: Record<string, string>; include?: Record<string, string>; exclude?: Record<string, string> };
          shrink?: { number_of_shards?: number; max_primary_shard_size?: string };
          forcemerge?: { max_num_segments?: number };
          freeze?: {};
          downsample?: { fixed_interval?: string };
          searchable_snapshot?: { snapshot_repository: string; force_merge_index?: boolean };
          delete?: { delete_searchable_snapshot?: boolean };
          rollback?: {};
          read_only?: {};
          unfollow?: {};
        };
      };
      frozen?: {
        min_age?: string;
        actions: {
          set_priority?: { priority: number };
          readonly?: {};
          allocate?: { number_of_replicas?: number; require?: Record<string, string>; include?: Record<string, string>; exclude?: Record<string, string> };
          shrink?: { number_of_shards?: number; max_primary_shard_size?: string };
          forcemerge?: { max_num_segments?: number };
          freeze?: {};
          downsample?: { fixed_interval?: string };
          searchable_snapshot?: { snapshot_repository: string; force_merge_index?: boolean };
          delete?: { delete_searchable_snapshot?: boolean };
          rollback?: {};
          read_only?: {};
          unfollow?: {};
        };
      };
      delete?: {
        min_age?: string;
        actions: {
          delete?: { delete_searchable_snapshot?: boolean };
          wait_for_snapshot?: { policy: string };
        };
      };
    };
    _meta?: Record<string, any>;
  };
}

/** ILM Explain result */
export interface ESLifecycleExplain {
  indices: Record<string, {
    index: string;
    managed: boolean;
    policy: string;
    index_creation_date_millis: number;
    time_since_index_creation: string;
    age: string;
    phase: string;
    phase_time_millis: number;
    action: string;
    action_time_millis: number;
    step: string;
    step_time_millis: number;
    failed?: boolean;
    step_info?: string;
    modification_date_millis: number;
    modified_date_in_millis: number;
    lifecycle_date_millis: number;
    policy_time_millis: number;
    version: number;
    action_time: string;
    phase_execution_time: string;
    retryable?: boolean;
    retry_count?: number;
    failed_step?: string;
    is_auto_retryable_error?: boolean;
    step_info_details?: string;
  }>;
}

// ============================================================================
// SNAPSHOT/RESTORE TYPES
// ============================================================================

/** Snapshot repository configuration */
export interface ESSnapshotRepository {
  type: 'fs' | 'url' | 's3' | 'hdfs' | 'azure' | 'gcs' | 'cos';
  settings: {
    location?: string;
    compress?: boolean;
    chunk_size?: string;
    max_restore_bytes_per_sec?: string;
    max_snapshot_bytes_per_sec?: string;
    readonly?: boolean;
    // S3 specific
    bucket?: string;
    region?: string;
    base_path?: string;
    access_key?: string;
    secret_key?: string;
    endpoint?: string;
    protocol?: string;
    server_side_encryption?: boolean;
    buffer_size?: string;
    canned_acl?: string;
    storage_class?: string;
    max_retries?: number;
    use_throttle_retries?: boolean;
    // GCS specific
    bucket_gcs?: string;
    client?: string;
    base_path_gcs?: string;
    access_key_gcs?: string;
    secret_key_gcs?: string;
    endpoint_gcs?: string;
    application_name?: string;
    // Azure specific
    container?: string;
    base_path_azure?: string;
    storage_account?: string;
    azure_storage_access_key?: string;
    endpoint_suffix?: string;
    // HDFS specific
    uri?: string;
    path?: string;
    load_defaults?: boolean;
    conf_location?: string;
    conf?: Record<string, string>;
    security_token?: string;
    compress_hdfs?: boolean;
    // COS specific
    bucket_cos?: string;
    region_cos?: string;
    endpoint_cos?: string;
    access_key_cos?: string;
    secret_key_cos?: string;
    compress_cos?: boolean;
    location_property?: string;
    // URL specific
    url?: string;
    http_headers?: Record<string, string>;
  };
}

/** Snapshot information */
export interface ESSnapshotInfo {
  snapshot: string;
  uuid: string;
  repository: string;
  state: SnapshotState;
  include_global_state: boolean;
  start_time: string;
  start_time_in_millis: number;
  end_time: string;
  end_time_in_millis: number;
  duration_in_millis: number;
  failures: Array<{ index: string; shard_id: number; reason: string }>;
  shards: { total: number; failed: number; successful: number };
  feature_states: string[];
  version: string;
  version_id: number;
}

/** Restore configuration */
export interface ESRestoreConfig {
  indices?: string;
  ignore_unavailable?: boolean;
  include_global_state?: boolean;
  rename_pattern?: string;
  rename_replacement?: string;
  include_aliases?: boolean;
  partial?: boolean;
  index_settings?: Record<string, any>;
  ignore_index_settings?: string[];
  index_settings_overrides?: Record<string, any>;
}

// ============================================================================
// TASK MANAGEMENT TYPES
// ============================================================================

/** Task information */
export interface ESTask {
  completed: boolean;
  task_node: string;
  id: string;
  type: string;
  action: string;
  description: string;
  start_time_in_millis: number;
  running_time_in_nanos: number;
  running_time_in_millis: number;
  cancellable: boolean;
  cancelled: boolean;
  headers: Record<string, string>;
  children: ESTask[];
}

/** Cancel tasks response */
export interface ESTasksCancelResponse {
  node_failures: Array<{ node_id: string; reason: string }>;
  nodes: Record<string, {
    tasks: Record<string, { cancelled: boolean; reason?: string }>;
    node_id: string;
    name: string;
    transport_address: string;
    host: string;
    ip: string;
    roles: string[];
    attributes: Record<string, string>;
  }>;
}

// ============================================================================
// DASHBOARD/VISUALIZATION TYPES
// ============================================================================

/** Dashboard configuration */
export interface ESDashboardConfig {
  id: string;
  name: string;
  description?: string;
  panels: ESDashboardPanel[];
  layout: ESDashboardLayout;
  refreshInterval?: number;
  timeRange?: {
    from: string;
    to: string;
    mode?: 'quick' | 'relative' | 'absolute';
  };
  filters?: ESFilterConfig[];
  options?: Record<string, any>;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** Dashboard panel */
export interface ESDashboardPanel {
  id: string;
  type: 'metric' | 'table' | 'line' | 'bar' | 'pie' | 'donut' | 'area' 
       | 'heatmap' | 'gauge' | 'markdown' | 'logs' | 'map' | 'tag-cloud'
       | 'treemap' | 'sankey' | 'vega' | 'input-control' | 'saved-search';
  title: string;
  gridPos: { x: number; y: number; w: number; h: number };
  config?: Record<string, any>;
  dataSource?: {
    type: 'elasticsearch' | 'prometheus' | 'tsvb';
    indexPattern?: string;
    query?: ESQuery;
    aggregations?: ESAggregation;
    timeField?: string;
    bucketSize?: string;
    metrics?: Array<{ type: string; field?: string; id?: string }>;
  };
  options?: Record<string, any>;
  panelIndex?: number;
  version?: string;
  embeddableConfig?: Record<string, any>;
  explicitInputs?: Record<string, any>;
  panelRefName?: string;
  type?: string;
}

/** Dashboard layout */
export interface ESDashboardLayout {
  columns: number;
  rows?: number;
  gutterSize?: number;
  responsive?: boolean;
}

/** Filter configuration */
export interface ESFilterConfig {
  id: string;
  label: string;
  type: 'query' | 'field' | 'time' | 'custom';
  field?: string;
  operator?: string;
  value?: any;
  query?: ESQuery;
  pinned?: boolean;
  disabled?: boolean;
  editable?: boolean;
}

/** Saved search configuration */
export interface ESSavedSearch {
  id: string;
  title: string;
  description?: string;
  indexPattern: string;
  columns: string[];
  sort: Array<{ [field: string]: 'asc' | 'desc' } | string>;
  query: ESQuery;
  filters?: ESFilterConfig[];
  kibanaSavedObjectMeta?: { searchSourceJSON: string };
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  isHidden?: boolean;
  hits?: number;
  columnsLabelMap?: Record<string, string>;
}

/** Visualization configuration */
export interface ESVisualization {
  id: string;
  type: string;
  title: string;
  description?: string;
  visState: string;
  uiStateJSON: string;
  description?: string;
  savedSearchId?: string;
  version?: number;
  kibanaSavedObjectMeta?: { searchSourceJSON: string };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// BULK OPERATION TYPES
// ============================================================================

/** Bulk operation item */
export interface ESBulkOperationItem {
  index?: {
    _index: string;
    _id?: string;
    _type?: string;
    routing?: string;
    if_seq_no?: number;
    if_primary_term?: number;
  };
  create?: {
    _index: string;
    _id?: string;
    _type?: string;
    routing?: string;
  };
  update?: {
    _index: string;
    _id: string;
    _type?: string;
    routing?: string;
    if_seq_no?: number;
    if_primary_term?: number;
    retry_on_conflict?: number;
    _source?: boolean | string[];
    scripted_upsert?: boolean;
    upsert?: any;
    script?: {
      source?: string;
      id?: string;
      params?: Record<string, any>;
      lang?: string;
    };
  };
  delete?: {
    _index: string;
    _id: string;
    _type?: string;
    routing?: string;
    if_seq_no?: number;
    if_primary_term?: number;
  };
}

/** Bulk response item */
export interface ESBulkResponseItem {
  index?: {
    _index: string;
    _id: string;
    _version?: number;
    result: 'created' | 'updated' | 'deleted' | 'noop';
    _shards: { total: number; successful: number; failed: number };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid: string;
      shard: string;
      caused_by?: { type: string; reason: string };
    };
  };
  create?: {
    _index: string;
    _id: string;
    _version?: number;
    result: 'created' | 'updated';
    _shards: { total: number; successful: number; failed: number };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid: string;
      shard: string;
      caused_by?: { type: string; reason: string };
    };
  };
  update?: {
    _index: string;
    _id: string;
    _version?: number;
    result: 'updated' | 'noop';
    _shards: { total: number; successful: number; failed: number };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    get?: {
      _seq_no?: number;
      _primary_term?: number;
      found: boolean;
      _source: any;
    };
    error?: {
      type: string;
      reason: string;
      index_uuid: string;
      shard: string;
      caused_by?: { type: string; reason: string };
    };
  };
  delete?: {
    _index: string;
    _id: string;
    _version?: number;
    result: 'deleted' | 'not_found';
    _shards: { total: number; successful: number; failed: number };
    _seq_no?: number;
    _primary_term?: number;
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid: string;
      shard: string;
      caused_by?: { type: string; reason: string };
    };
  };
}

/** Bulk response */
export interface ESBulkResponse {
  took: number;
  errors: boolean;
  items: ESBulkResponseItem[];
}

// ============================================================================
// LOG FILTER & RESULT TYPES
// ============================================================================

/** Log search filter */
export interface ESLogFilter {
  /** Time range preset */
  time_range?: ESTimeRange;
  /** Custom start time */
  time_start?: string;
  /** Custom end time */
  time_end?: string;
  /** Index pattern(s) to search */
  index_patterns?: string[];
  /** Query string (Lucene syntax) */
  query_string?: string;
  /** Structured query */
  query?: ESQuery;
  /** Severity levels to include */
  severities?: LogSeverity[];
  /** Log sources to include */
  sources?: LogSource[];
  /** Host filter */
  hosts?: string[];
  /** Source IP filter */
  src_ips?: string[];
  /** Destination IP filter */
  dest_ips?: string[];
  /** Event categories */
  event_categories?: string[];
  /** Event types */
  event_types?: string[];
  /** Message text search */
  message_contains?: string;
  /** Tags filter */
  tags?: string[];
  /** Page number */
  page?: number;
  /** Page size */
  page_size?: number;
  /** Sort field */
  sort_by?: string;
  /** Sort order */
  sort_order?: SortOrder;
  /** Include highlights */
  highlight?: boolean;
  /** Fields to return */
  fields?: string[];
  /** Aggregations to compute */
  aggregations?: ESAggregation;
}

/** Time range presets */
export enum ESTimeRange {
  LAST_15_MINUTES = 'now-15m',
  LAST_30_MINUTES = 'now-30m',
  LAST_HOUR = 'now-1h',
  LAST_2_HOURS = 'now-2h',
  LAST_6_HOURS = 'now-6h',
  LAST_12_HOURS = 'now-12h',
  LAST_24_HOURS = 'now-24h',
  LAST_48_HOURS = 'now-48h',
  LAST_7_DAYS = 'now-7d',
  LAST_30_DAYS = 'now-30d',
  LAST_90_DAYS = 'now-90d',
  LAST_YEAR = 'now-1y',
  TODAY = 'now/d',
  YESTERDAY = 'now-1d/d',
  THIS_WEEK = 'now/w',
  THIS_MONTH = 'now/M',
  THIS_YEAR = 'now/y',
  CUSTOM = 'custom'
}

/** Log search result set */
export interface ESLogResultSet {
  logs: ESLogDocument[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  aggregations?: Record<string, any>;
  query_time_ms: number;
  applied_filters: ESLogFilter;
  scroll_id?: string;
}

/** Log analytics/aggregation results */
export interface ESLogAnalytics {
  timeline: Array<{ timestamp: string; count: number }>;
  by_severity: Record<LogSeverity | string, number>;
  by_source: Record<LogSource | string, number>;
  by_host: Array<{ host: string; count: number }>;
  by_event_category: Array<{ category: string; count: number }>;
  top_ips: Array<{ ip: string; count: number; direction: 'src' | 'dest' }>;
  unique_ips: number;
  unique_hosts: number;
  avg_events_per_second: number;
  peak_events_per_second: number;
  time_range: { start: string; end: string };
}

/** Index summary for listing */
export interface ESIndexSummary {
  name: string;
  health: IndexHealthStatus;
  status: 'open' | 'close';
  uuid: string;
  primary_shards: number;
  replica_shards: number;
  document_count: number;
  deleted_documents: number;
  size: string;
  size_bytes: number;
  primary_size: string;
  creation_date?: string;
  last_modified?: string;
  ilm_phase?: string;
  templates_applied?: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Standard API response wrapper */
export interface ESApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
    elasticsearch_error?: {
      type: string;
      reason: string;
      root_cause?: Array<{ type: string; reason: string }>;
      status: number;
    };
  };
  meta?: {
    execution_time_ms: number;
    cached: boolean;
    es_took_ms?: number;
    es_timed_out?: boolean;
    es_shards?: {
      total: number;
      successful: number;
      skipped: number;
      failed: number;
    };
  };
}

/** Paginated response */
export interface ESPaginatedResponse<T = any> extends ESApiResponse<T> {
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/** Export job configuration */
export interface ESExportJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  format: 'csv' | 'json' | 'xml' | 'ndjson';
  filename?: string;
  records_exported?: number;
  total_records?: number;
  progress?: number;
  download_url?: string;
  expires_at?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

/** Connection test result */
export interface ESConnectionTestResult {
  connected: boolean;
  version?: string;
  cluster_name?: string;
  cluster_uuid?: string;
  latency_ms?: number;
  node_count?: number;
  error?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Point-in-time (PIT) context */
export interface ESPITContext {
  id: string;
  creation_time: string;
  keep_alive: string;
  expiration_time: string;
}

/** Scroll context */
export interface ESScrollContext {
  scroll_id: string;
  expires_at: string;
}

/** Reindex task */
export interface ESReindexTask {
  task_id: string;
  status: {
    created: number;
    updated: number;
    deleted: number;
    batches: number;
    version_conflicts: number;
    noops: number;
    retries: { bulk: number; search: number };
    throttled_millis: number;
    requests_per_second: number;
    throttled_until_millis: number;
    total: number;
  };
  created: number;
  updated: number;
  deleted: number;
  batches: number;
  version_conflicts: number;
  noops: number;
  retries: { bulk: number; search: number };
  throttled_millis: number;
  requests_per_second: number;
  throttled_until_millis: number;
  total: number;
}

/** Update by query task */
export interface ESUpdateByQueryTask {
  task_id: string;
  status: {
    total: number;
    updated: number;
    created: number;
    deleted: number;
    batches: number;
    version_conflicts: number;
    noops: number;
    retries: { bulk: number; search: number };
    throttled_millis: number;
    requests_per_second: number;
    throttled_until_millis: number;
  };
  total: number;
  updated: number;
  created: number;
  deleted: number;
  batches: number;
  version_conflicts: number;
  noops: number;
  retries: { bulk: number; search: number };
  throttled_millis: number;
  requests_per_second: number;
  throttled_until_millis: number;
}

/** Delete by query task */
export interface ESDeleteByQueryTask {
  task_id: string;
  status: {
    total: number;
    deleted: number;
    batches: number;
    version_conflicts: number;
    noops: number;
    retries: { bulk: number; search: number };
    throttled_millis: number;
    requests_per_second: number;
    throttled_until_millis: number;
  };
  total: number;
  deleted: number;
  batches: number;
  version_conflicts: number;
  noops: number;
  retries: { bulk: number; search: number };
  throttled_millis: number;
  requests_per_second: number;
  throttled_until_millis: number;
}

/** Cat indices row */
export interface ESCatIndicesRow {
  health: string;
  status: string;
  index: string;
  uuid: string;
  pri: string;
  rep: string;
  'docs.count': string;
  'docs.deleted': string;
  'store.size': string;
  'pri.store.size': string;
  completion?: string;
  'completion.time'?: string;
}

/** Cat shards row */
export interface ESCatShardsRow {
  index: string;
  shard: string;
  prirep: string;
  state: string;
  docs: string;
  store: string;
  ip: string;
  node: string;
}

/** Cat nodes row */
export interface ESCatNodesRow {
  ip: string;
  port: string;
  heap_percent: string;
  heap_current: string;
  ram_percent: string;
  ram_current: string;
  cpu: string;
  load_1m: string;
  load_5m: string;
  load_15m: string;
  node_role: string;
  master: string;
  name: string;
  disk_usage_disk_space?: string;
  completion?: string;
}

/** Index template list item */
export interface ESIndexTemplateListItem {
  name: string;
  index_template: {
    name: string;
    index_patterns: string[];
    composed_of: string[];
    priority: number;
    version: number;
    _meta?: Record<string, any>;
  };
}

/** Component template list item */
export interface ESComponentTemplateListItem {
  name: string;
  component_template: {
    name: string;
    template: {
      settings?: Record<string, any>;
      mappings?: ESMapping;
      aliases?: Record<string, ESAliasConfig>;
    };
    version: number;
    _meta?: Record<string, any>;
  };
}

/** Index alias list item */
export interface ESIndexAliasListItem {
  alias: string;
  index: string;
  filter?: ESQuery;
  routing?: string;
  is_write_index?: boolean;
  hidden?: boolean;
}

/** Mapping field type info */
export interface ESMappingFieldType {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
  fields?: ESMappingFieldType[];
  subFields?: ESMappingFieldType[];
  meta?: Record<string, any>;
  index?: boolean;
  doc_values?: boolean;
  script?: string;
  keyword?: string;
  normalize?: string;
  index_options?: string;
  norms?: boolean;
  default?: string;
}

/** Data stream information */
export interface ESDataStream {
  name: string;
  timestamp_field: { name: string };
  indices: Array<{ index_name: string; index_uuid: string; prefer_ilm: boolean; ilm_policy?: string }>;
  generation: number;
  _meta?: Record<string, any>;
  status: string;
  template: string;
  ilm_policy: string;
  hidden: boolean;
  system: boolean;
  replicated: boolean;
  cross_cluster_replicated: boolean;
}

/** Rollup job configuration */
export interface ESRollupJob {
  id: string;
  config: {
    id: string;
    index_pattern: string;
    rollup_index: string;
    cron: string;
    rollup_fields: Array<{ field: string; metrics: string[] }>;
    group_by: {
      date_histogram?: { field: string; fixed_interval: string; timezone: string };
      histogram?: { field: string; interval: number };
      terms?: { fields: string[] };
    };
    timeout?: number;
    page_size?: number;
    delay?: string;
  };
  status: {
    job_state: string;
    current_position: { millisecond: number };
    up_to_date: boolean;
  };
  stats: { pages_processed: number; documents_processed: number; rollups_indexed: number; triggers_triggered: number; processing_time_ms: number; processing_total_time_ms: number; job_duration: string; processing_failures: number; search_failures: number; index_failures: number; index_time_in_ms: number; search_time_in_ms: number; search_total: number; search_forward_total: number; search_time_per_batch_sum_ms: number; search_current: number; index_total: number; index_current: number; index_time_per_batch_sum_ms: number; triggered_count: number };
  headers: Record<string, string>;
}

/** Transform configuration */
export interface ESTransform {
  id: string;
  transform_id: string;
  seq_no: number;
  primary_term: number;
  transform: {
    id: string;
    version: number;
    create_time: number;
    update_time: number;
    dest: { index: string; pipeline?: string };
    source: { index: string[]; query: ESQuery; size: number };
    frequency?: string;
    sync?: { time: { field: string; delay: string } };
    description?: string;
    retention_policy?: { time: { field: string; max_age: string } };
    settings?: Record<string, any>;
    sync_config?: { _source?: string[]; fields?: Record<string, string> };
    pivot?: { group_by: Record<string, { terms?: { field: string }; max?: { field: string }; min?: { field: string }; date_histogram?: { field: string; fixed_interval: string; calendar_interval?: string; timezone?: string } }; aggregations?: Record<string, any> };
    latest?: { unique_key: string[]; sort: string };
  };
  stats: {
    pages_processed: number;
    documents_processed: number;
    documents_deleted: number;
    trigger_count: number;
    documents_indexed: number;
    documents_indexed_cumulative: number;
    processing_time_ms: number;
    processing_total_time_ms: number;
    index_time_ms: number;
    index_total: number;
    index_failures: number;
    search_time_ms: number;
    search_total: number;
    search_failures: number;
    exp_avg_processing_time_ms: number;
    exp_avg_index_time_ms: number;
    exp_avg_search_time_ms: number;
    checkpoint: number;
    checkpoint_progress: { checkpoints_pending: number; changes_last_detected: number };
    transforms_progress: { documents_remaining: number };
    checkpointing_info: { last_checkpoint: number; changes_behind: number };
  };
  headers: Record<string, string>;
}

/** Watcher configuration */
export interface ESWatcher {
  watch_id: string;
  status: {
    state: { active: boolean; timestamp: string; version: number };
    version: number;
    actions: Record<string, { acknowledgement: { timestamp: string; state: string; acknowledged?: boolean } }>;
    execution_state: string;
    headers: Record<string, string>;
  };
  watch: {
    trigger: { schedule: { interval?: string; cron?: string } };
    input: { search?: { request: { indices: string[]; body: ESSearchRequest } }; chain?: { inputs: Array<{ first?: { search?: { request: { indices: string[]; body: ESSearchRequest } } }>; chain: string[] } };
    condition: { compare: { ctx: { payload: { hits: { total: { value: string; relation: string } } } } } } | { always?: {} } | { array_compare: { ctx: { payload: { hits: { hits: Array<{ _source: any }> } } } } } | { script: { source: string; params?: Record<string, any> } } | { never?: {} };
    actions: Record<string, { condition?: { compare: any } | { always?: {} } | { never?: {} } | { script: { source: string; params?: Record<string, any> } }; transform?: { script?: { source: string; params?: Record<string, any> } | search?: { request: { indices: string[]; body: ESSearchRequest } } | chain?: { inputs: any[]; chain: string[] } }; throttle_period?: string; webhook?: { scheme: string; host: string; port: number; path: string; method: string; params?: Record<string, string>; headers?: Record<string, string>; auth?: { basic?: { username: string; password: string } }; body?: string; connection_timeout?: string; read_timeout?: string }; email?: { to: string; subject: string; body: { text?: string; html?: string }; attachments?: { array: Array<{ url: string; parsing?: string }> }; bcc?: string; cc?: string; reply_to?: string; priorities?: string; from?: string; profile?: string; account?: string }; index?: { index: string; doc_id?: string; execution_time_field?: string }; slack?: { channel?: string; message?: string; attach?: boolean; color?: string; webhook_url?: string; to?: string[]; cc?: string[]; bcc?: string[]; proxy?: { host?: string; port?: number } }; pagerduty?: { account?: string; service?: string; description?: string; event_type?: string; incident_key?: string; severity?: string; args?: Record<string, string>; attachment?: { image_url?: string; author?: string; text?: string; html?: string; footer?: string; color?: string; fields?: Array<{ title: string; value: string; short?: boolean }> } }; jira?: { method?: string; subtask?: string; comment?: string; fields?: { project?: { key?: string }; summary?: string; description?: string; issue_type?: string; priority?: string; labels?: string[]; components?: string[]; assignee?: string; reporter?: string; due_date?: string; parent?: string; fix_versions?: string[]; watchers?: string[]; customfield_10000?: string; customfield_10001?: string; customfield_10002?: string; customfield_10003?: string; customfield_10004?: string; customfield_10005?: string; customfield_10006?: string; customfield_10007?: string; customfield_10008?: string; customfield_10009?: string; customfield_10010?: string; customfield_10011?: string; customfield_10012?: string; customfield_10013?: string; customfield_10014?: string; customfield_10015?: string; customfield_10016?: string; customfield_10017?: string; customfield_10018?: string; customfield_10019?: string; customfield_10020?: string }; proxy?: { host?: string; port?: number } }; logging?: { text?: string; level?: string; category?: string }; hipchat?: { room?: string; message?: string; notify?: boolean; color?: string; from?: string; to?: string; proxy?: { host?: string; port?: number } }; opsgenie?: { apiKey?: string; message?: string; description?: string; subject?: string; responders?: Array<{ id?: string; username?: string; name?: string; type?: string }>; tags?: string[]; entity?: string; note?: string; priority?: string; alias?: string; source?: string; proxy?: { host?: string; port?: number } }; servicenow?: { action?: string; table?: string; fields?: Record<string, string>; proxy?: { host?: string; port?: number } }; teams?: { channel?: string; message?: string; color?: string; summary?: string; proxy?: { host?: string; port?: number } }; webhook?: { scheme?: string; host?: string; port?: number; path?: string; method?: string; params?: Record<string, string>; headers?: Record<string, string>; body?: string; auth?: { basic?: { username?: string; password?: string } }; connection_timeout?: string; read_timeout?: string; proxy?: { host?: string; port?: number } } }>;
    metadata?: Record<string, any>;
    transform_template?: string;
    throttle_period_in_millis?: number;
    metadata_template?: string;
  };
}

/** Machine learning job */
export interface ESMLJob {
  job_id: string;
  job_type: string;
  job_version: string;
  create_time: number;
  finished_time: number;
  model_size_stats: { model_bytes: number; peak_model_bytes: number; log_time: number; peak_model_bytes_exceeded: boolean; allocation_status: string };
  model_size_stats_bytes: number;
  finished_time_epoch_millis: number;
  create_time_epoch_millis: number;
  analysis_config: {
    bucket_span: string;
    detectors: Array<{ function: string; field_name?: string; over_field_name?: string; partition_field_name?: string; by_field_name?: string; exclude_frequent?: string; detector_description: string; detector_index: number; custom_rules?: Array<{ actions: string[]; conditions: Array<{ applies_to: string; operator: string; value: string }> }>; influencer_field_name?: string; analysis_features?: string[] }>;
    influencers: string[];
    lateness: string;
    multivariate_by_fields: boolean;
    categorization_field_name?: string;
    categorization_filters?: string[];
    summary_count_field_name?: string;
    delimiter?: string;
    rare?: string;
    geographic_fields?: string[];
    results_index_template?: string;
    permit_null_input?: boolean;
  };
  analysis_limits: { model_memory_limit: string; categorization_examples_limit: number };
  data_description: { time_field: string; time_format: string };
  datafeed_config: { datafeed_id: string; indices: string[]; query: ESQuery; query_delay?: string; scroll_size?: number; chunking_config?: { mode: string; time_span?: string } };
  custom_settings?: Record<string, any>;
  counts: { input_record_count: number; input_bytes: number; invalid_date_count: number; missing_field_count: number; created_record_count: number; input_field_count: number; processed_record_count: number; out_of_order_timestamp_count: number; empty_bucket_count: number; sparse_bucket_count: number; latest_record_timestamp: number; latest_bucket_timestamp: number; input_bytes_per_hour?: number; input_records_per_hour?: number; average_bucket_processing_time_ms?: number; exponential_double_decay_score?: number };
  modeling_memory: number;
  data_counts: { job_id: string; processed_record_count: number; processed_field_count: number; input_bytes: number; input_record_count: number; missing_field_count: number; invalid_date_count: number; out_of_order_timestamp_count: number; empty_bucket_count: number; sparse_bucket_count: number; latest_record_timestamp: number; latest_bucket_timestamp: number; last_data_time: number; bucket_count: number; earliest_record_timestamp: number };
  data_description: { time_field: string; time_format: string };
  groups: string[];
  created_by: string;
  allow_lazy_open: boolean;
  results_index_name: string;
  results_retention_days: number;
  deleted: boolean;
  model_snapshot_id: string;
  model_snapshot?: {
    job_id: string;
    snapshot_id: string;
    snapshot_doc_num: number;
    snapshot_upgrade_seq_no: number;
    min_version: string;
    timestamp: number;
    result: {
      model_size_stats: { model_bytes: number; log_time: number; peak_model_bytes: number; peak_model_bytes_exceeded: boolean; allocation_status: string };
      quantiles: Array<{ probability: number; quantile: number }>;
      tree_structure: Array<{ root_children_count: number; leaf_node_count: number; depth: number; threshold: number; left_child?: number; right_child?: number; split_field?: string; split_field_number: number; split_value: number; num_leaves?: number; leaf_node_assignment?: Record<string, number> }>;
      timing_stats: { elapsed_time: number; iteration_count: number };
      categories_definition: Record<string, { regex: string; examples: string[]; size: number }>;
      influencer_field_stats: Record<string, { median_absolute_deviation: number; time_spent: number; count: number; distinct_count: number; is_categorical: boolean; geographic_type: string; granularity: string; beta: number; mean: number; variance: number; skewness: number; kurtosis: number; geographic_coordinates: Array<{ centroid: { lat: number; lon: number } }> }>;
      partition_field_stats: Record<string, { median_absolute_deviation: number; time_spent: number; count: number; distinct_count: number; is_categorical: boolean; geographic_type: string; granularity: string; beta: number; mean: number; variance: number; skewness: number; kurtosis: number; geographic_coordinates: Array<{ centroid: { lat: number; lon: number } }> }>;
      detector_index_stats: Record<string, { detector_type: string; field_name: string; partition_field_name: string; over_field_name: number; by_field_name: number; median_absolute_deviation: number; time_spent: number; count: number; distinct_count: number; is_categorical: boolean; geographic_type: string; granularity: string; beta: number; mean: number; variance: number; skewness: number; kurtosis: number; geographic_coordinates: Array<{ centroid: { lat: number; lon: number } }> }>;
    };
    description: string;
  };
  model_snapshot_score: number;
  forecaster_config?: { forecast_id: string; forecast_create_time: number; forecast_expire_time: number };
  revision: number;
  headers: Record<string, string>;
}

/** Graph explore configuration */
export interface ESGraphExplore {
  vertices: Array<{ field: string; term: string; weight: number; _type: string; _id: string; _index: string; _score: number; _ignored?: string[] }>;
  connections: Array<{ source: { field: string; term: string; weight: number; _type: string; _id: string; _index: string; _score: number; _ignored?: string[] }; target: { field: string; term: string; weight: number; _type: string; _id: string; _index: string; _score: number; _ignored?: string[] }; type: string; weight: number; doc_count: number; doc_type: string; _type: string; _id: string; _index: string; _score: number; _ignored?: string[] }>;
}

/** SQL query result */
export interface ESSQLResult {
  columns: Array<{ name: string; type: string; alias?: string }>;
  rows: Array<any[]>;
  cursor: string;
  size: number;
  took: number;
  timed_out: boolean;
}

/** EQL search result */
export interface ESEQLResult {
  hits: { total: { value: number; relation: string }; max_score: number | null; hits: Array<{ _index: string; _id: string; _version?: number; _seq_no?: number; _primary_term?: number; _score: number | null; _source: any; fields?: Record<string, any>; highlight?: Record<string, string[]>; inner_hits?: Record<string, any>; sort?: any[]; matched_queries?: string[]; sequences: Array<{ index: string; _id: string; _primary_term?: number; _seq_no?: number; _score: number | null; sort?: any[]; _shard: string; _node: string; highlight?: Record<string, string[]>; keys?: string[]; joins?: Array<{ position: number; relation: string; index: string; _id: string; _primary_term?: number; _seq_no?: number; _score: number | null; sort?: any[]; _shard: string; _node: string; highlight?: Record<string, string[]>; keys?: string[] }> }>; _ignored?: string[] }> };
  events: { total: { value: number; relation: string }; max_score: number | null; hits: Array<{ _index: string; _id: string; _version?: number; _seq_no?: number; _primary_term?: number; _score: number | null; _source: any; fields?: Record<string, any>; highlight?: Record<string, string[]>; inner_hits?: Record<string, any>; sort?: any[]; matched_queries?: string[]; _ignored?: string[] }> };
  took: number;
  timed_out: boolean;
}

/** Security audit trail entry */
export interface ESSecurityAuditEntry {
  @timestamp: string;
  layer: string;
  event_type: string;
  category: string;
  outcome: string;
  actor: { name: string; realm: string; run_as?: string; ip?: string };
  origin: { type: string; address: string; transport: string };
  url: { path: string; query: string };
  request_id: string;
  trace_id: string;
  rule: { uuid: string; name: string; category: string; tags?: string[]; actions?: string[] };
  message: string;
  node_name: string;
  node_id: string;
  cluster_name: string;
}
