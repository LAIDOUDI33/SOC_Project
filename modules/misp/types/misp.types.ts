/**
 * MISP Threat Intelligence Platform - TypeScript Type Definitions
 * Algeria National SOC Platform 2026-2030
 * 
 * Complete type system for MISP events, attributes, objects, galaxies,
 * warninglists, and threat intelligence data structures.
 */

// ============================================================
// Core MISP Types
// ============================================================

/** MISP Event - Primary intelligence container */
export interface MISPEvent {
  id: string;
  uuid: string;
  orgc_id: string;
  orgc: MISPOrganization;
  owner_org: MISPOrganization;
  date: string;
  threat_level_id: number;
  info: string;
  published: boolean;
  lock_publishing: boolean;
  analysis: AnalysisStatus;
  distribution: DistributionLevel;
  extends_uuid?: string;
  event_creator_email: string;
  timestamp: string;
  publish_timestamp: string;
  sharing_group_id?: string;
  Attribute: MISPAttribute[];
  Object: MISPObject[];
  Tag: MISPTag[];
  Galaxy: MISPGalaxy[];
  Proposal?: MISPProposal[];
  ShadowAttribute?: MISPShadowAttribute[];
  _attributeCount?: number;
  _objectCount?: number;
  _correlationCount?: number;
  _warninglistCount?: number;
}

/** MISP Attribute - Individual IOC or observable */
export interface MISPAttribute {
  id: string;
  event_id: string;
  object_id?: string;
  object_relation?: string;
  category: AttributeCategory;
  type: AttributeType;
  value: string;
  to_ids: boolean;
  uuid: string;
  timestamp: string;
  distribution: DistributionLevel;
  comment: string;
  sharing_group_id?: string;
  deleted: boolean;
  disable_correlation: boolean;
  first_seen: string;
  last_seen: string;
  Tag: MISPTag[];
  Galaxy: MISPGalaxy[];
  ShadowAttribute?: MISPShadowAttribute[];
  /** Correlation data from other events/attributes */
  correlating_value?: CorrelationData[];
  /** Enrichment results from modules */
  enrichment?: EnrichmentResult[];
}

/** MISP Object - Structured grouping of attributes */
export interface MISPObject {
  id: string;
  name: string;
  uuid: string;
  meta-category: string;
  description: string;
  template_uuid: string;
  template_version: number;
  event_id: string;
  timestamp: string;
  distribution: DistributionLevel;
  comment: string;
  deleted: boolean;
  Attribute: MISPAttribute[];
  /** References to other objects in same event */
  ObjectReference?: ObjectReference[];
}

/** Reference between objects within an event */
export interface ObjectReference {
  id: string;
  uuid: string;
  object_id: string;
  event_id: string;
  source_object_id: string;
  source_object_uuid: string;
  referenced_id: string;
  referenced_uuid: string;
  relationship_type: string;
  comment: string;
  deleted: boolean;
}

/** Organization record */
export interface MISPOrganization {
  id: string;
  name: string;
  uuid: string;
  local: boolean;
}

/** Tag applied to events/attributes */
export interface MISPTag {
  id: string;
  name: string;
  colour: string;
  exportable: boolean;
  hidden: boolean;
  count?: number;
}

/** Galaxy container */
export interface MISPGalaxy {
  id: string;
  uuid: string;
  name: string;
  type: string;
  description: string;
  version: string;
  GalaxyCluster: GalaxyCluster[];
}

/** Individual cluster within a galaxy */
export interface GalaxyCluster {
  id: string;
  uuid: string;
  type: string;
  value: string;
  tag_name: string;
  description: string;
  source: string;
  authors: string[];
  meta: Record<string, unknown[]>;
  galaxy_id: string;
  icon: string;
}

/** Proposal for attribute modification */
export interface MISPProposal {
  id: string;
  uuid: string;
  event_id: string;
  attribute_id: string;
  email: string;
  old_attribute?: MISPAttribute;
  new_attribute?: MISPAttribute;
  timestamp: string;
  message: string;
  proposal_comment: string;
  discarded: boolean;
}

/** Shadow attribute (proposed addition) */
export interface MISPShadowAttribute {
  id: string;
  uuid: string;
  event_id: string;
  old_id?: string;
  category: AttributeCategory;
  type: AttributeType;
  value: string;
  to_ids: boolean;
  comment: string;
  timestamp: string;
  email: string;
  organization: string;
  proposal_to_delete: boolean;
  deleted: boolean;
}

// ============================================================
// Enumerations & Constants
// ============================================================

/** Analysis status levels */
export enum AnalysisStatus {
  INITIAL = '0',
  ONGOING = '1',
  COMPLETED = '2'
}

/** Distribution levels for sharing */
export enum DistributionLevel {
  YOUR_ORG_ONLY = '0',
  THIS_COMMUNITY = '1',
  CONNECTED_COMMUNITIES = '2',
  ALL_COMMUNITIES = '3',
  SHARING_GROUP = '4',
  INHERIT_EVENT = '5'
}

/** Threat level IDs (1=high, 3=low, 4=undefined) */
export const THREAT_LEVELS: Record<number, { label: string; color: string; severity: 'critical' | 'high' | 'medium' | 'low' | 'info' }> = {
  1: { label: 'High', color: '#ff0000', severity: 'critical' },
  2: { label: 'Medium', color: '#ffa500', severity: 'high' },
  3: { label: 'Low', color: '#00ff00', severity: 'medium' },
  4: { label: 'Undefined', color: '#808080', severity: 'low' }
};

/** Attribute categories */
export type AttributeCategory =
  | 'Internal reference'
  | 'Targeting data'
  | 'Attack pattern'
  | 'Antivirus detection'
  | 'Payload delivery'
  | 'Artifacts dropped'
  | 'Attribution'
  | 'External analysis'
  | 'Financial fraud'
  | 'Network activity'
  | 'Payload installation'
  | 'Persistence mechanism'
  | 'Person'
  | 'Social network'
  | 'Other';

/** Comprehensive attribute types for IOCs */
export type AttributeType =
  // Network indicators
  | 'ip-src' | 'ip-dst' | 'ip-src|port' | 'ip-dst|port'
  | 'domain' | 'domain|ip' | 'hostname' | 'url'
  | 'as' | 'snort' | 'bro' | 'zeek' | 'suricata'
  | 'pattern-in-traffic' | 'pattern-in-memory'
  // File indicators
  | 'md5' | 'sha1' | 'sha256' | 'filename' | 'filename|md5'
  | 'filename|sha1' | 'filename|sha256' | 'file-type'
  | 'size-in-bytes' | 'malware-sample' | 'attachment'
  // Email indicators
  | 'email-src' | 'email-dst' | 'email-subject' | 'email-reply-to'
  | 'email-header' | 'email-attachment' | 'email-body'
  // Other
  | 'comment' | 'text' | 'link' | 'other' | 'hex'
  | 'yara' | 'sigma' | 'pcre' | 'regkey' | 'regkey|value'
  | 'vulnerability' | 'weakness' | 'x509-fingerprint-sha1'
  | 'x509-fingerprint-md5' | 'x509-fingerprint-sha256'
  | 'mobile-application-id' | 'chrome-extension-id'
  | 'mutex' | 'named-pipe' | 'user-agent'
  | 'http-method' | 'header-field' | 'cookie-name'
  | 'target-user' | 'target-email' | 'target-machine'
  | 'target-location' | 'target-external'
  | 'campaign-name' | 'threat-actor' | 'targeting-string'
  | 'identity-card-number' | 'passport-number'
  | 'bank-account-no' | 'aba-rtn' | 'bin'
  | 'cc-number' | 'iban' | 'prtn' | 'phone-number'
  | 'cryptocurrency-wallet' | 'cve' | 'ebcdic-name'
  | 'gene' | 'github-username' | 'instagram-username'
  | 'jabber-id' | 'twitter-handle' | 'telegram-username';

// ============================================================
// Search & Filtering Types
// ============================================================

/** Search parameters for events */
export interface MISPEventSearchParams {
  limit?: number;
  page?: number;
  value?: string;
  type?: AttributeType;
  category?: AttributeCategory;
  tag?: string[];
  tags?: string;  // Comma-separated
  from?: string;
  to?: string;
  last?: string;  // Time window (e.g., "1d", "7d", "30d")
  eventid?: string;
  threat_level_id?: number;
  distribution?: DistributionLevel;
  analysis?: AnalysisStatus;
  org?: string;
  published?: boolean;
  date_from?: string;
  date_to?: string;
  timestamp?: string;
  publish_timestamp?: string;
  searchall?: number;
  metadata?: boolean;
  include_context?: boolean;
  include_correlations?: boolean;
  includeWarnings?: boolean;
  decaying?: boolean;
  exclude_local_tags?: boolean;
  enforceWarninglist?: boolean;
  returnFormat?: string;
}

/** Search return format */
export interface MISPEventSearchResponse {
  response: {
    MISPEvent: MISPEvent[];
    __include_context?: boolean;
    __overall_attributes_count?: number;
    __attributes_count_per_event?: Record<string, number>;
  };
}

/** Attribute search response */
export interface MISPAttributeSearchResponse {
  response: {
    Attribute: MISPAttribute[];
    __overall_attributes_count?: number;
  };
}

// ============================================================
// Warninglist Types
// ============================================================

/** Warninglist entry */
export interface Warninglist {
  id: string;
  name: string;
  type: 'string' | 'substring' | 'regex' | 'cidr';
  version: string;
  description: string;
  matching_attributes: AttributeType[];
  list: string[];
  valid_from?: string;
  valid_to?: string;
  enabled: boolean;
  count_entries: number;
}

/** Warninglist hit during validation */
export interface WarninglistHit {
  value: string;
  warninglist_id: string;
  warninglist_name: string;
  matching_attribute: AttributeType;
  type: 'string' | 'substring' | 'regex' | 'cidr';
}

// ============================================================
// Feed & Synchronization Types
// ============================================================

/** Feed configuration */
export interface MISPFeed {
  id: string;
  name: string;
  provider: string;
  url: string;
  source_format: 'misp' | 'freetext';
  headers: string;
  input_source: 'local' | 'remote';
  publishtime: boolean;
  override_ids: boolean;
  settings: string;
  enabled: boolean;
  delta_merge: boolean;
  event_id: string;
  last_fetched_time: string;
  priority: number;
  cached_elements: number;
  coverage: string;
  errors: number;
  FeedCache: FeedCacheItem[];
}

/** Cached feed item */
export interface FeedCacheItem {
  id: string;
  feed_id: string;
  url_params: string;
  event_id: string;
  has_manifest: number;
  mtime: number;
  size: string;
}

/** Server synchronization config */
export interface MISPServer {
  id: string;
  url: string;
  name: string;
  authkey: string;
  org: MISPOrganization;
  push: boolean;
  pull: boolean;
  push_sightings: boolean;
  pull_rules: string;
  push_rules: string;
  submitted_cert: string;
  submitted_client_valid: string;
  internal: boolean;
  self_signed: boolean;
  organization: string;
  remote_org: MISPOrganization;
  all_visible: boolean;
  priority: number;
  lastpulledid: number;
  lastpushedid: number;
  lastfetched: string;
  lastpushed: string;
  cert_valid: string;
}

// ============================================================
// YARA Rule Types
// ============================================================

/** Generated YARA rule */
export interface YARARule {
  name: string;
  condition: string;
  strings: YARAString[];
  meta: YARAMeta;
  scopes: string[];
  source: string;  // Full rule text
}

/** YARA string definition */
export interface YARAString {
  name: string;
  value: string;
  type: 'text' | 'hex' | 'regex';
  modifiers?: string[];
  nocase?: boolean;
  wide?: boolean;
  fullword?: boolean;
  ascii?: boolean;
}

/** YARA metadata */
export interface YARAMeta {
  author?: string;
  description?: string;
  date?: string;
  version?: string;
  misp_event_id?: string;
  misp_event_uuid?: string;
  misp_attribute_id?: string;
  misp_attribute_uuid?: string;
  references?: string[];
  [key: string]: string | string[] | undefined;
}

// ============================================================
// Correlation & Enrichment Types
// ============================================================

/** Correlation result */
export interface CorrelationData {
  event_id: string;
  event_info: string;
  event_org: string;
  event_date: string;
  attribute_id: string;
  attribute_value: string;
  attribute_type: AttributeType;
  correlation_count: number;
}

/** Enrichment service result */
export interface EnrichmentResult {
  service: string;
  status: 'success' | 'failed' | 'pending';
  values: Record<string, unknown>[];
  timestamp: string;
  polling: boolean;
}

/** OverCorrelation break */
export interface OverCorrelationBreak {
  id: string;
  value: string;
  type: AttributeType;
  count: number;
  creator_user: string;
  creator_org: string;
  timestamp: string;
}

// ============================================================
// Statistics & Metrics Types
// ============================================================

/** Dashboard statistics */
export interface MISPStatistics {
  events: {
    total: number;
    published: number;
    unpublished: number;
    today: number;
    this_week: number;
    this_month: number;
    by_threat_level: Record<number, number>;
    by_analysis_status: Record<AnalysisStatus, number>;
  };
  attributes: {
    total: number;
    with_ids: number;  // IOCs
    unique_types: Record<string, number>;
    unique_categories: Record<string, number>;
  };
  correlations: {
    total: number;
    events_with_correlations: number;
    avg_correlations_per_event: number;
  };
  organizations: {
    local: number;
    external: number;
    contributing: number;
  };
  feeds: {
    active: number;
    total_events_imported: number;
    last_fetch_times: Record<string, string>;
  };
  threats: {
    top_actors: Array<{ name: string; count: number }>;
    top_mitres: Array<{ tactic: string; count: number }>;
    trending_iocs: Array<{ type: string; value: string; count: number }>;
  };
}

/** Timeline data point */
export interface TimelinePoint {
  date: string;
  events: number;
  attributes: number;
  published: number;
}

/** Geographic threat distribution */
export interface GeoThreatData {
  country_code: string;
  country_name: string;
  event_count: number;
  ioc_count: number;
  threat_actors: string[];
  top_categories: Array<{ category: string; count: number }>;
}

// ============================================================
// Sightings Types
// ============================================================

/** IOC sighting report */
export interface MISPSighting {
  id: string;
  uuid: string;
  attribute_id: string;
  event_id: string;
  org_id: string;
  date_sighting: string;
  source: string;
  type: '0' | '1' | '2';  // 0=sighting, 1=false-positive, 2=expiration
  positive: boolean;
  Sightingdb?: SightingDB[];
}

/** External sighting database */
export interface SightingDB {
  id: string;
  name: string;
  timestamp: string;
  source: string;
  events: number;
  attributes: number;
}

// ============================================================
// Decaying Model Types
// ============================================================

/** Decay model configuration */
export interface DecayingModel {
  id: string;
  name: string;
  description: string;
  formula: string;
  parameters: Record<string, number>;
  threshold: number;
  default_base_score: number;
  Genesis: DecayingModelGenesis;
  DecayingModelMapping: DecayingModelMapping[];
}

/** Model creation info */
export interface DecayingModelGenesis {
  uuid: string;
  model_id: string;
  user_id: string;
  timestamp: string;
}

/** Type mapping for decay model */
export interface DecayingModelMapping {
  id: string;
  attribute_type: AttributeType;
  model_id: string;
  base_score: number;
  model_enabled: boolean;
}

// ============================================================
// API Response Wrappers
// ============================================================

/** Standard API response wrapper */
export interface MISPAPIResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: string[];
}

/** Bulk operation result */
export interface MISPBulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors: Array<{ item: string; reason: string }>;
}

/** Export result */
export interface MISPExportResult {
  success: boolean;
  format: string;
  filename: string;
  size: number;
  content: string | Buffer;
  event_count: number;
  attribute_count: number;
}
