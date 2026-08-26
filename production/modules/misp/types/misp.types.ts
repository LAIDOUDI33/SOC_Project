/**
 * 🇩🇿 National SOC - MISP Integration Types
 * TypeScript type definitions for MISP Threat Intelligence Platform
 */

// ────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────

export interface MISPConfig {
  /** MISP API base URL */
  baseUrl: string;
  /** API key (from user profile) */
  apiKey: string;
  /** Request timeout in milliseconds (MISP can be slow) */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
}

// ────────────────────────────────────────────────────────
// EVENT TYPES
// ────────────────────────────────────────────────────────

export interface MISPEvent {
  /** Unique event identifier */
  id: string;
  
  /** UUID for the event */
  uuid: string;
  
  /** Event info/title */
  info: string;
  
  /** Owner organization ID */
  org_id: string;
  
  /** Owner organization name */
  Orgc?: { id: string; name: string; uuid: string };
  
  /** Creator organization */
  Org?: { id: string; name: string; uuid: string };
  
  /** Distribution level: 0-4 */
  distribution: number;
  
  /** Threat level: 1=High, 2=Medium, 3=Low, 4=Undefined */
  threat_level_id: number;
  
  /** Analysis status: 0=Initial, 1=Ongoing, 2=Completed */
  analysis: number;
  
  /** Event date (YYYY-MM-DD) */
  date: string;
  
  /** Publication timestamp */
  published: boolean;
  
  /** When event was published */
  publish_timestamp?: string;
  
  /** Creation timestamp */
  timestamp: string;
  
  /** Last update timestamp */
  last_change?: string;
  
  /** Tags associated with event */
  Tag?: Array<{ id: string; name: string; colour: string }>;
  
  /** Attributes/IOCs in this event */
  Attribute?: MISPAttribute[];
  
  /** Objects in this event */
  Object?: MISPObject[];
  
  /** Related events */
  RelatedEvent?: Array<{
    Event: Pick<MISPEvent, 'id' | 'info' | 'Orgc'>;
    relationship_type: string;
  }>;
  
  /** Galaxy data attached to event */
  Galaxy?: Array<GalaxyReference>;
  
  /** Number of attributes */
  attribute_count?: number;
  
  /** Number of correlations */
  correlation_count?: number;
  
  /** Extended event info */
  extends_uuid?: string;
  
  /** Protection class (TLP) */
  protection_class?: string;
}

// ────────────────────────────────────────────────────────
// ATTRIBUTE / IOC TYPES
// ────────────────────────────────────────────────────────

export interface MISPAttribute {
  /** Unique attribute identifier */
  id: string;
  
  /** UUID */
  uuid: string;
  
  /** Event ID this belongs to */
  event_id: string;
  
  /** Attribute type (ip-dst, domain, md5, etc.) */
  type: string;
  
  /** Attribute value */
  value: string;
  
  /** Category classification */
  category: string;
  
  /** To IDS flag (is this an IOC?) */
  to_ids: boolean;
  
  /** Distribution level */
  distribution: number;
  
  /** Comment/description */
  comment: string;
  
  /** Timestamp of creation */
  timestamp: string;
  
  /** Tags on this attribute */
  Tag?: Array<{ id: string; name: string; colour: string }>;
  
  /** Correlated events/attributes */
  ShadowAttribute?: any[];
  
  /** Data from object */
  data?: string; // Base64 encoded for malware samples
  
  /** Related attributes/objects */
  Object?: { id: string; name: string; meta-category: string };
  
  /** Correlation count */
  correlation_count?: number;
  
  /** First seen timestamp */
  first_seen?: string;
  
  /** Last seen timestamp */
  last_seen?: string;
}

// ────────────────────────────────────────────────────────
// OBJECT TYPES
// ────────────────────────────────────────────────────────

export interface MISPObject {
  /** Unique object identifier */
  id: string;
  
  /** UUID */
  uuid: string;
  
  /** Name/template used */
  name: string;
  
  /** Meta category */
  meta_category: string;
  
  /** Description */
  description?: string;
  
  /** Template UUID */
  template_uuid?: string;
  
  /** Template version */
  template_version?: number;
  
  /** Attributes within this object */
  Attribute?: MISPAttribute[];
  
  /** References to other objects */
  ObjectReference?: Array<{
    object_uuid: string;
    referenced_uuid: string;
    relationship_type: string;
  }>;
  
  /** Distribution */
  distribution: number;
  
  /** Comment */
  comment?: string;
}

// ────────────────────────────────────────────────────────
// GALAXY / THREAT ACTOR TYPES
// ────────────────────────────────────────────────────────

export interface MISPGalaxy {
  /** Galaxy identifier */
  id: string;
  
  /** Galaxy name */
  name: string;
  
  /** Galaxy type (e.g., 'mitre-attack', 'threat-actor') */
  type: string;
  
  /** Namespace */
  namespace: string;
  
  /** Description */
  description: string;
  
  /** Icon name */
  icon: string;
  
  /** UUID */
  uuid: string;
}

export interface GalaxyCluster {
  /** Cluster identifier */
  id: string;
  
  /** Cluster value (e.g., actor name) */
  value: string;
  
  /** Full description */
  description: string;
  
  /** Type */
  type: string;
  
  /** Galaxy ID */
  galaxy_id: string;
  
  /** Tag name format */
  tag_name: string;
  
  /** Synonyms */
  synonyms?: string[];
  
  /** Source */
  source?: string;
  
  /** Authors */
  authors?: string[];
  
  /** UUID */
  uuid: string;
}

export interface GalaxyReference {
  /** Reference ID */
  id: string;
  
  /** Galaxy cluster reference */
  GalaxyCluster: {
    id: string;
    type: string;
    value: string;
    tag_name: string;
    icon: string;
    name: string;
    description: string;
  };
  
  /** Local tag ID */
  local_tag_id?: string;
}

// ────────────────────────────────────────────────────────
// WARNING LIST TYPES
// ────────────────────────────────────────────────────────

export interface WarningList {
  /** List name */
  name: string;
  
  /** Version */
  version: string;
  
  /** Entry count */
  count: number;
  
  /** Description */
  description: string;
  
  /** List entries/values */
  list: string[];
  
  /** Warninglist type */
  type?: string;
  
  /** Valid from date */
  valid_from?: string;
  
  /** Valid until date */
  valid_until?: string;
}

// ────────────────────────────────────────────────────────
// SIGHTING TYPES
// ────────────────────────────────────────────────────────

export interface MISPSighting {
  /** Sighting ID */
  id: string;
  
  /** Attribute UUID */
  attribute_uuid?: string;
  
  /** Event ID */
  event_id?: string;
  
  /** Organization that reported sighting */
  Org?: { id: string; name: string };
  
  /** Source system */
  source: string;
  
  /** Sighting type: 0=Sighting, 1=False Positive, 2=Expiration */
  type: number;
  
  /** Date of sighting */
  date_sighting: number;
  
  /** Timestamp */
  timestamp: number;
}

// ────────────────────────────────────────────────────────
// FEED TYPES
// ────────────────────────────────────────────────────────

export interface MISPFeed {
  /** Feed ID */
  id: string;
  
  /** Feed name */
  name: string;
  
  /** Provider URL */
  provider_url: string;
  
  /** Input format */
  input_format: string;
  
  /** Is feed enabled? */
  enabled: boolean;
  
  /** Distribution */
  distribution: number;
  
  /** Last fetch time */
  last_fetched_time?: string;
}

// ────────────────────────────────────────────────────────
// STATISTICS & DASHBOARD TYPES
// ────────────────────────────────────────────────────────

export interface MISPStatistics {
  totalEvents: number;
  totalAttributes: number;
  totalIOCs: number;
  eventsToday: number;
  eventsThisWeek: number;
  topTags: Array<{ tag: string; count: number }>;
  topTypes: Array<{ type: string; count: number }>;
}

export interface MISPDashboardSummary {
  stats: MISPStatistics;
  recentEvents: MISPEvent[];
  activeThreatActors: Array<{ name: string; eventCount: number }>;
  feedStatus: { enabled: number; total: number };
  health: {
    healthy: boolean;
    version: string;
    user?: string;
  };
}

// ────────────────────────────────────────────────────────
// YARA RULE TYPE
// ────────────────────────────────────────────────────────

export interface YARARule {
  ruleName: string;
  author: string;
  date: string;
  description: string;
  strings: Array<{ name: string; value: string; modifiers?: string[] }>;
  condition: string;
  rawRule: string;
}

// ────────────────────────────────────────────────────────
// INDICATOR CHECK RESULT
// ────────────────────────────────────────────────────────

export interface IndicatorCheckResult {
  indicator: string;
  found: boolean;
  isWarningList: boolean;
  matches: MISPAttribute[];
  relatedEvents: number;
  context: string;
  riskScore: number; // 0-100
  recommendation: string;
}
