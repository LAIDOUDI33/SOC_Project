/**
 * MISP Threat Intelligence Platform - API Client
 * Algeria National SOC Platform 2026-2030
 * 
 * Complete REST API client for MISP integration including:
 * - Event management (CRUD, search, publish)
 * - Attribute/IOC management
 * - Object handling
 * - Galaxy/Threat Actor lookup
 * - Feed synchronization
 * - YARA rule generation
 * - Warninglist validation
 * - Correlation analysis
 * - Sightings tracking
 * - Decaying models
 */

import {
  MISPEvent,
  MISPAttribute,
  MISPObject,
  MISPTag,
  MISPGalaxy,
  Warninglist,
  MISPFeed,
  MISPServer,
  YARARule,
  MISPSighting,
  DecayingModel,
  MISPStatistics,
  TimelinePoint,
  CorrelationData,
  EnrichmentResult,
  MISPEventSearchParams,
  MISPEventSearchResponse,
  MISPAttributeSearchResponse,
  OverCorrelationBreak,
  MISPAPIResponse,
  MISPBulkOperationResult,
  MISPExportResult,
  AnalysisStatus,
  DistributionLevel,
  AttributeType,
} from '../types/misp.types';

// ============================================================
// Configuration & Constants
// ============================================================

export interface MISPClientConfig {
  /** MISP instance URL (e.g., https://misp.algeria-soc.dz) */
  url: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Whether to verify SSL certificates */
  verifyCertificate?: boolean;
  /** Default organization context */
  defaultOrg?: string;
}

/** Default configuration values */
const DEFAULT_CONFIG: Required<Pick<MISPClientConfig, 'timeout' | 'debug' | 'verifyCertificate'>> = {
  timeout: 30000,
  debug: false,
  verifyCertificate: true,
};

// ============================================================
// Error Types
// ============================================================

export class MISPError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MISPError';
  }
}

export class MISPRateLimitError extends MISPError {
  constructor(message: string, public retryAfter: number) {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'MISPRateLimitError';
  }
}

export class MISPAuthenticationError extends MISPError {
  constructor() {
    super('Invalid MISP API key or authentication failed', 401, 'AUTH_FAILED');
    this.name = 'MISPAuthenticationError';
  }
}

// ============================================================
// Main Client Class
// ============================================================

class MISPClientInstance {
  private config: Required<MISPClientConfig> & Pick<MISPClientConfig, 'url' | 'apiKey' | 'defaultOrg'>;
  private authHeader: string;

  constructor(config: MISPClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.authHeader = this.config.apiKey;
    
    if (this.config.debug) {
      console.log(`[MISP] Initialized client for ${this.config.url}`);
    }
  }

  // ============================================================
  // HTTP Helpers
  // ============================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.url.replace(/\/$/, '')}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw new MISPRateLimitError(
          `Rate limited. Retry after ${retryAfter}s`,
          retryAfter
        );
      }

      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        throw new MISPAuthenticationError();
      }

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw new MISPError(
          data.message || data.error?.message || `Request failed with status ${response.status}`,
          response.status,
          data.error?.code,
          data.error
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof MISPError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MISPError(`Request timed out after ${this.config.timeout}ms`, 408, 'TIMEOUT');
      }
      
      throw new MISPError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        'NETWORK_ERROR'
      );
    }
  }

  private log(method: string, message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[MISP] [${method}] ${message}`, data ?? '');
    }
  }

  // ============================================================
  // Authentication & User Info
  // ============================================================

  /**
   * Verify API key and get current user info
   */
  async authenticate(): Promise<{
    id: string;
    email: string;
    org_id: string;
    org_name: string;
    role: string;
  }> {
    this.log('authenticate', 'Verifying API credentials');
    
    const response = await this.request<{ 
      response: Array<{
        User: { id: string; email: string; org_id: string; Role: { name: string } };
        Organisation: { id: string; name: string };
      }>;
    }>('/users/me');

    const user = response.response[0];
    return {
      id: user.User.id,
      email: user.User.email,
      org_id: user.User.org_id,
      org_name: user.Organisation.name,
      role: user.User.Role.name,
    };
  }

  /**
   * Get API version information
   */
  async getVersion(): Promise<string> {
    const response = await this.request<{ 
      response: Array<{ version: string; }>;
    }>('/servers/getVersion');
    return response.response[0]?.version || 'unknown';
  }

  /**
   * Check server health and status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    version: string;
    db_version: string;
    timezone: string;
    maintenance_mode: boolean;
  }> {
    try {
      const response = await this.request<{
        response: Array<{
          version: string;
          db_version: string;
          timezone: string;
          maintenance_mode: boolean;
        }>;
      }>('/servers/getInfo');
      
      const info = response.response[0];
      return {
        healthy: true,
        version: info.version,
        db_version: info.db_version,
        timezone: info.timezone,
        maintenance_mode: info.maintenance_mode,
      };
    } catch (error) {
      return {
        healthy: false,
        version: 'unknown',
        db_version: 'unknown',
        timezone: 'UTC',
        maintenance_mode: false,
      };
    }
  }

  // ============================================================
  // Event Management
  // ============================================================

  /**
   * Create a new MISP event
   */
  async createEvent(params: {
    info: string;
    threat_level_id?: number;
    analysis?: AnalysisStatus;
    distribution?: DistributionLevel;
    date?: string;  // YYYY-MM-DD format
    tags?: string[];
  }): Promise<MISPEvent> {
    this.log('createEvent', `Creating event: ${params.info}`);

    const payload: Record<string, unknown> = {
      info: params.info,
      threat_level_id: params.threat_level_id || 4,
      analysis: params.analysis || AnalysisStatus.INITIAL,
      distribution: params.distribution || DistributionLevel.YOUR_ORG_ONLY,
    };

    if (params.date) payload.date = params.date;
    if (params.tags) payload.Tag = params.tags.map(name => ({ name }));

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.response[0].Event;
  }

  /**
   * Get event by ID or UUID
   */
  async getEvent(eventId: string, options?: {
    includeAttributes?: boolean;
    includeObjects?: boolean;
    includeCorrelations?: boolean;
    includeNotes?: boolean;
    includeRelations?: boolean;
  }): Promise<MISPEvent> {
    this.log('getEvent', `Fetching event: ${eventId}`);

    let query = '';
    if (options) {
      const params: string[] = [];
      if (options.includeAttributes !== undefined) params.push(`includeAttribute=${Number(options.includeAttributes)}`);
      if (options.includeObjects !== undefined) params.push(`includeObject=${Number(options.includeObjects)}`);
      if (options.includeCorrelations) params.push('includeEventCorrelations=1');
      if (options.includeNotes) params.push('includeEventReports=1');
      if (options.includeRelations) params.push('includeRelationships=1');
      query = params.length > 0 ? `?${params.join('&')}` : '';
    }

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/events/${eventId}${query}`);

    return response.response[0].Event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<{
    info: string;
    published: boolean;
    threat_level_id: number;
    analysis: AnalysisStatus;
    distribution: DistributionLevel;
    date: string;
  }>): Promise<MISPEvent> {
    this.log('updateEvent', `Updating event: ${eventId}`);

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return response.response[0].Event;
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    this.log('deleteEvent', `Deleting event: ${eventId}`);

    await this.request<{ message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    });

    return true;
  }

  /**
   * Publish an event (make visible to sharing partners)
   */
  async publishEvent(eventId: string, alert: boolean = true): Promise<MISPEvent> {
    this.log('publishEvent', `Publishing event: ${eventId}`);

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/events/publish/${eventId}${alert ? '' : '/0'}`, {
      method: 'POST',
    });

    return response.response[0].Event;
  }

  /**
   * Search events with comprehensive filtering
   */
  async searchEvents(params: MISPEventSearchParams): Promise<MISPEventSearchResponse> {
    this.log('searchEvents', `Searching events`, params);

    // Build search payload based on MISP REST API format
    const searchPayload: Record<string, unknown> = {};

    if (params.value) searchPayload.value = params.value;
    if (params.type) searchPayload.type = params.type;
    if (params.category) searchPayload.category = params.category;
    if (params.tag?.length) searchPayload.tags = params.tag.join('&&');
    if (params.from) searchPayload.from = params.from;
    if (params.to) searchPayload.to = params.to;
    if (params.last) searchPayload.last = params.last;
    if (params.eventid) searchPayload.eventid = params.eventid;
    if (params.threat_level_id) searchPayload.threat_level_id = params.threat_level_id;
    if (params.distribution) searchPayload.distribution = params.distribution;
    if (params.analysis) searchPayload.analysis = params.analysis;
    if (params.org) searchPayload.org = params.org;
    if (params.published !== undefined) searchPayload.published = params.published;
    if (params.date_from) searchPayload.datefrom = params.date_from;
    if (params.date_to) searchPayload.dateto = params.date_to;
    if (params.searchall !== undefined) searchPayload.searchall = params.searchall;
    if (params.metadata) searchPayload.metadata = params.metadata;
    if (params.include_context) searchPayload.includeContext = true;
    if (params.include_correlations) searchPayload.includeEventCorrelations = 1;
    if (params.includeWarnings) searchPayload.includeWarninglistHits = true;
    if (params.decaying) searchPayload.decaying = true;
    if (params.exclude_local_tags) searchPayload.excludeLocalTags = true;
    if (params.enforceWarninglist) searchPayload.enforceWarninglist = true;
    if (params.returnFormat) searchPayload.returnFormat = params.returnFormat;

    // Pagination
    if (params.limit) searchPayload.limit = params.limit;
    if (params.page) searchPayload.page = params.page;

    const response = await this.request<MISPEventSearchResponse>(
      '/events/restSearch',
      {
        method: 'POST',
        body: JSON.stringify(searchPayload),
      }
    );

    return response;
  }

  /**
   * Get recent events (last N days)
   */
  async getRecentEvents(days: number = 7, limit: number = 50): Promise<MISPEvent[]> {
    this.log('getRecentEvents', `Getting last ${days} days of events`);

    const result = await this.searchEvents({
      last: `${days}d`,
      limit,
      include_correlations: true,
    });

    return result.response.MISPEvent || [];
  }

  /**
   * Get events by tag
   */
  async getEventsByTag(tagName: string, limit: number = 50): Promise<MISPEvent[]> {
    const result = await this.searchEvents({
      tag: [tagName],
      limit,
    });
    return result.response.MISPEvent || [];
  }

  // ============================================================
  // Attribute / IOC Management
  // ============================================================

  /**
   * Add attribute to an event
   */
  async addAttribute(eventId: string, attribute: {
    type: AttributeType;
    value: string | string[];
    category?: string;
    to_ids?: boolean;
    comment?: string;
    distribution?: DistributionLevel;
    tags?: string[];
    disable_correlation?: boolean;
  }): Promise<MISPAttribute> {
    this.log('addAttribute', `Adding ${attribute.type} to event ${eventId}`);

    const payload: Record<string, unknown> = {
      type: attribute.type,
      value: attribute.value,
      category: attribute.category,
      to_ids: attribute.to_ids !== false,
    };

    if (attribute.comment) payload.comment = attribute.comment;
    if (attribute.distribution) payload.distribution = attribute.distribution;
    if (attribute.tags) payload.Tag = attribute.tags.map(name => ({ name }));
    if (attribute.disable_correlation) payload.disable_correlation = true;

    const response = await this.request<{
      response: Array<{ Attribute: MISPAttribute }>;
    }>(`/attributes/add/${eventId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.response[0].Attribute;
  }

  /**
   * Add multiple attributes in batch
   */
  async addAttributesBatch(
    eventId: string,
    attributes: Array<{
      type: AttributeType;
      value: string;
      category?: string;
      to_ids?: boolean;
      comment?: string;
    }>
  ): Promise<MISPBulkOperationResult> {
    this.log('addAttributesBatch', `Adding ${attributes.length} attributes to event ${eventId}`);

    const results: MISPAttribute[] = [];
    const errors: Array<{ item: string; reason: string }> = [];

    for (const attr of attributes) {
      try {
        const result = await this.addAttribute(eventId, attr);
        results.push(result);
      } catch (error) {
        errors.push({
          item: attr.value,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length,
      failed: errors.length,
      skipped: 0,
      errors,
    };
  }

  /**
   * Update an existing attribute
   */
  async updateAttribute(attributeId: string, updates: Partial<{
    value: string;
    comment: string;
    to_ids: boolean;
    disable_correlation: boolean;
    distribution: DistributionLevel;
  }>): Promise<MISPAttribute> {
    this.log('updateAttribute', `Updating attribute: ${attributeId}`);

    const response = await this.request<{
      response: Array<{ Attribute: MISPAttribute }>;
    }>(`/attributes/edit/${attributeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return response.response[0].Attribute;
  }

  /**
   * Delete an attribute
   */
  async deleteAttribute(attributeId: string): Promise<boolean> {
    this.log('deleteAttribute', `Deleting attribute: ${attributeId}`);
    
    await this.request<{ message: string }>(`/attributes/delete/${attributeId}`, {
      method: 'DELETE',
    });

    return true;
  }

  /**
   * Search attributes across all events
   */
  async searchAttributes(params: {
    value?: string;
    type?: AttributeType;
    category?: string;
    tag?: string[];
    event_id?: string;
    from?: string;
    to?: string;
    to_ids?: boolean;
    includeContext?: boolean;
    includeCorrelations?: boolean;
    enforceWarninglist?: boolean;
    limit?: number;
    page?: number;
  }): Promise<MISPAttributeSearchResponse> {
    this.log('searchAttributes', 'Searching attributes', params);

    const searchPayload: Record<string, unknown> = {};
    
    if (params.value) searchPayload.value = params.value;
    if (params.type) searchPayload.type = params.type;
    if (params.category) searchPayload.category = params.category;
    if (params.tag?.length) searchPayload.tags = params.tag.join('&&');
    if (params.event_id) searchPayload.event_id = params.event_id;
    if (params.from) searchPayload.from = params.from;
    if (params.to) searchPayload.to = params.to;
    if (params.to_ids !== undefined) searchPayload.to_ids = params.to_ids;
    if (params.includeContext) searchPayload.includeContext = true;
    if (params.includeCorrelations) searchPayload.includeEventCorrelations = 1;
    if (params.enforceWarninglist) searchPayload.enforceWarninglist = true;
    if (params.limit) searchPayload.limit = params.limit;
    if (params.page) searchPayload.page = params.page;

    const response = await this.request<MISPAttributeSearchResponse>(
      '/attributes/restSearch',
      {
        method: 'POST',
        body: JSON.stringify(searchPayload),
      }
    );

    return response;
  }

  /**
   * Get IOCs (to_ids=true attributes)
   */
  async getIOCs(options?: {
    type?: AttributeType;
    event_id?: string;
    published_only?: boolean;
    limit?: number;
  }): Promise<MISPAttribute[]> {
    const result = await this.searchAttributes({
      to_ids: true,
      ...options,
    });
    return result.response.Attribute || [];
  }

  /**
   * Validate IOCs against warninglists
   */
  async validateAgainstWarninglists(values: string[]): Promise<WarninglistHit[]> {
    this.log('validateAgainstWarninglists', `Validating ${values.length} values`);

    const hits: WarninglistHit[] = [];

    for (const value of values) {
      try {
        const response = await this.request<{
          response: Array<{ hits: WarninglistHit[] }>;
        }>(`/warninglists/checkValue/${encodeURIComponent(value)}`);
        
        if (response.response[0]?.hits?.length > 0) {
          hits.push(...response.response[0].hits);
        }
      } catch (error) {
        // Continue validation even if one fails
        this.log('validateAgainstWarninglists', `Failed to validate: ${value}`, error);
      }
    }

    return hits;
  }

  // ============================================================
  // Object Management
  // ============================================================

  /**
   * Add object template to event
   */
  async addObject(eventId: string, objectData: {
    template_id: number;
    name?: string;
    meta_category?: string;
    description?: string;
    attributes: Array<{
      object_relation: string;
      type: AttributeType;
      value: string;
      to_ids?: boolean;
      comment?: string;
    }>;
    comment?: string;
  }): Promise<MISPObject> {
    this.log('addObject', `Adding ${objectData.name || 'object'} to event ${eventId}`);

    const payload: Record<string, unknown> = {
      template_id: objectData.template_id,
      Attribute: objectData.attributes,
    };

    if (objectData.name) payload.name = objectData.name;
    if (objectData.meta_category) payload.meta_category = objectData.meta_category;
    if (objectData.description) payload.description = objectData.description;
    if (objectData.comment) payload.comment = objectData.comment;

    const response = await this.request<{
      response: Array<{ Object: MISPObject }>;
    }>(`/objects/add/${eventId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.response[0].Object;
  }

  /**
   * Get available object templates
   */
  async getObjectTemplates(): Promise<Array<{
    id: string;
    name: string;
    uuid: string;
    meta-category: string;
    description: string;
    version: string;
    requirements: Record<string, AttributeType[]>;
  }>> {
    const response = await this.request<{
      response: Array<{
        ObjectTemplate: {
          id: string;
          name: string;
          uuid: string;
          meta_category: string;
          description: string;
          version: string;
          requirements: Record<string, AttributeType[]>;
        };
      }>;
    }>('/objectTemplates');

    return response.response.map(r => r.ObjectTemplate);
  }

  // ============================================================
  // Tag Management
  // ============================================================

  /**
   * Attach tag to event
   */
  async attachTagToEvent(eventId: string, tagName: string): Promise<MISPEvent> {
    this.log('attachTagToEvent', `Attaching ${tagName} to event ${eventId}`);

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/events/addTag`, {
      method: 'POST',
      body: JSON.stringify({
        uuid: eventId,
        tag: tagName,
      }),
    });

    return response.response[0].Event;
  }

  /**
   * Remove tag from event
   */
  async removeTagFromEvent(eventId: string, tagName: string): Promise<MISPEvent> {
    this.log('removeTagFromEvent', `Removing ${tagName} from event ${eventId}`);

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/events/removeTag`, {
      method: 'POST',
      body: JSON.stringify({
        uuid: eventId,
        tag: tagName,
      }),
    });

    return response.response[0].Event;
  }

  /**
   * Search tags
   async searchTags(query?: string): Promise<MISPTag[]> {
    let url = '/tags';
    if (query) url += `/search/${query}`;

    const response = await this.request<{
      response: Array<{ Tag: MISPTag }>;
    }>(url);

    return response.response.map(r => r.Tag);
  }
   */

  // ============================================================
  // Galaxy & Threat Actor Intelligence
  // ============================================================

  /**
   * Get all available galaxies
   */
  async getGalaxies(): Promise<MISPGalaxy[]> {
    this.log('getGalaxies', 'Fetching all galaxies');

    const response = await this.request<{
      response: Array<Array<{ Galaxy: MISPGalaxy }>>;
    }>('/galaxies');

    return response.response.flatMap(group => group.map(g => g.Galaxy));
  }

  /**
   * Get specific galaxy by name/type
   */
  async getGalaxy(galaxyType: string): Promise<MISPGalaxy> {
    this.log('getGalaxy', `Fetching galaxy: ${galaxyType}`);

    const response = await this.request<{
      response: Array<{ Galaxy: MISPGalaxy }>;
    }>(`/galaxies/view/${galaxyType}/1`);

    return response.response[0].Galaxy;
  }

  /**
   * Get threat actor clusters from MITRE ATT&CK galaxy
   */
  async getThreatActors(): Promise<GalaxyCluster[]> {
    this.log('getThreatActors', 'Fetching threat actors');

    const galaxy = await this.getGalaxy('mitre-intrusion-set');
    return galaxy.GalaxyCluster || [];
  }

  /**
   * Get MITRE ATT&CK tactics
   */
  async getMITRETactics(): Promise<GalaxyCluster[]> {
    const galaxy = await this.getGalaxy('mitre-attack-pattern');
    return galaxy.GalaxyCluster || [];
  }

  /**
   * Get malware families from galaxy
   */
  async getMalwareFamilies(): Promise<GalaxyCluster[]> {
    const galaxy = await this.getGalaxy('mitre-malware');
    return galaxy.GalaxyCluster || [];
  }

  /**
   * Get tools/utilities from galaxy
   */
  async getTools(): Promise<GalaxyCluster[]> {
    const galaxy = await this.getGalaxy('mitre-tool');
    return galaxy.GalaxyCluster || [];
  }

  /**
   * Search clusters across all galaxies
   */
  async searchClusters(query: string): Promise<Array<{
    cluster: GalaxyCluster;
    galaxy: string;
  }>> {
    this.log('searchClusters', `Searching: ${query}`);

    const galaxies = await this.getGalaxies();
    const results: Array<{ cluster: GalaxyCluster; galaxy: string }> = [];

    for (const galaxy of galaxies) {
      const matches = (galaxy.GalaxyCluster || []).filter(
        c =>
          c.value.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      );

      for (const match of matches) {
        results.push({ cluster: match, galaxy: galaxy.name });
      }
    }

    return results;
  }

  // ============================================================
  // Feed Management
  // ============================================================

  /**
   * Get all configured feeds
   */
  async getFeeds(): Promise<MISPFeed[]> {
    this.log('getFeeds', 'Fetching feeds');

    const response = await this.request<{
      response: Array<{ Feed: MISPFeed }>;
    }>('/feeds');

    return response.response.map(f => f.Feed);
  }

  /**
   * Fetch/update a specific feed
   */
  async fetchFeed(feedId: string): Promise<{ success: boolean; imported: number }> {
    this.log('fetchFeed', `Fetching feed: ${feedId}`);

    const response = await this.request<{
      response: Array<{ name: string; result: string }>;
    }>(`/feeds/fetchFromAll`, {
      method: 'POST',
    });

    return {
      success: true,
      imported: 0, // MISP doesn't return exact count in this call
    };
  }

  /**
   * Cache all enabled feeds
   */
  async cacheFeeds(): Promise<{ total: number; cached: number; failed: number }> {
    this.log('cacheFeeds', 'Caching all feeds');

    const response = await this.request<{
      response: Array<{ name: string; result: string; ids: string[] }>;
    }>(`/feeds/cacheFeeds/all`, {
      method: 'GET',
    });

    return {
      total: response.response.length,
      cached: response.response.filter(r => r.result === 'success').length,
      failed: response.response.filter(r => r.result !== 'success').length,
    };
  }

  /**
   * Import feed events into local instance
   */
  async importFeedEvents(feedId: string, options?: {
    eventIds?: string[];
    toIds?: boolean;
    merge?: boolean;
  }): Promise<MISPBulkOperationResult> {
    this.log('importFeedEvents', `Importing from feed: ${feedId}`);

    const response = await this.request<{
      response: Array<{ success: boolean; result: string }>;
    }>(`/feeds/importFeeds/${feedId}`, {
      method: 'POST',
      body: JSON.stringify({
        eventIds: options?.eventIds,
        toIds: options?.toIds !== false,
        merge: options?.merge !== false,
      }),
    });

    return {
      success: true,
      processed: response.response.length,
      failed: 0,
      skipped: 0,
      errors: [],
    };
  }

  /**
   * Preview feed content before importing
   */
  async previewFeed(feedId: string, limit: number = 10): Promise<MISPEvent[]> {
    this.log('previewFeed', `Previewing feed: ${feedId}, limit: ${limit}`);

    const response = await this.request<{
      response: Array<{ Event: MISPEvent }>;
    }>(`/feeds/previewIndex/${feedId}/${limit}`);

    return response.response.map(r => r.Event);
  }

  // ============================================================
  // Server Synchronization
  // ============================================================

  /**
   * Get configured sync servers
   */
  async getServers(): Promise<MISPServer[]> {
    this.log('getServers', 'Fetching sync servers');

    const response = await this.request<{
      response: Array<{ Server: MISPServer }>;
    }>(`/servers/index/Pagination/1/0/sort:id/desc`);

    return response.response.map(s => s.Server);
  }

  /**
   * Pull events from remote server
   */
  async pullFromServer(serverId: string, options?: {
    eventIds?: string[];
    technique?: 'full' | 'incremental';
  }): Promise<{ pulled: number; failures: number }> {
    this.log('pullFromServer', `Pulling from server: ${serverId}`);

    const response = await this.request<{
      response: Array<{ result: string; message: string }>;
    }>(`/servers/pull/${serverId}/${options?.technique || 'full'}`, {
      method: 'POST',
    });

    return {
      pulled: 1,
      failures: 0,
    };
  }

  /**
   * Push events to remote server
   */
  async pushToServer(serverId: string): Promise<{ pushed: number; failures: number }> {
    this.log('pushToServer', `Pushing to server: ${serverId}`);

    const response = await this.request<{
      response: Array<{ result: string; message: string }>;
    }>(`/servers/push/${serverId}`, {
      method: 'POST',
    });

    return {
      pushed: 1,
      failures: 0,
    };
  }

  // ============================================================
  // YARA Rule Generation
  // ============================================================

  /**
   * Generate YARA rule from event attributes
   */
  async generateYARAFromEvent(eventId: string, options?: {
    includeHashes?: boolean;
    includeStrings?: boolean;
    includeIPs?: boolean;
    includeDomains?: boolean;
    maxSize?: number;
  }): Promise<YARARule> {
    this.log('generateYARAFromEvent', `Generating YARA for event: ${eventId}`);

    const event = await this.getEvent(eventId);

    // Filter IOCs based on options
    const iocs = event.Attribute.filter(a => a.to_ids);
    
    const strings: YARAString[] = [];
    const meta: YARAMeta = {
      description: event.info,
      date: event.date,
      misp_event_id: event.id,
      misp_event_uuid: event.uuid,
      author: event.orgc?.name || 'Algeria SOC',
    };

    // Extract hash-based strings
    if (options?.includeHashes !== false) {
      for (const attr of iocs.filter(a => ['md5', 'sha1', 'sha256'].includes(a.type))) {
        strings.push({
          name: `$hash_${attr.type}`,
          value: attr.value,
          type: 'text',
          fullword: true,
          ascii: true,
        });
      }
    }

    // Extract domain/hostname strings
    if (options?.includeDomains !== false) {
      for (const attr of iocs.filter(a => ['domain', 'hostname'].includes(a.type))) {
        strings.push({
          name: `$domain_${strings.filter(s => s.name.startsWith('$domain')).length}`,
          value: attr.value,
          type: 'text',
          nocase: true,
          fullword: true,
          ascii: true,
        });
      }
    }

    // Extract URL patterns
    for (const attr of iocs.filter(a => a.type === 'url')) {
      strings.push({
        name: `$url_${strings.filter(s => s.name.startsWith('$url')).length}`,
        value: attr.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        type: 'regex',
        nocase: true,
        ascii: true,
      });
    }

    // Build condition
    const hashNames = strings.filter(s => s.name.startsWith('$hash')).map(s => s.name).join(' or ');
    const domainNames = strings.filter(s => s.name.startsWith('$domain')).map(s => s.name).join(' or ');
    const urlNames = strings.filter(s => s.name.startsWith('$url')).map(s => s.name).join(' or ');

    const conditions: string[] = [];
    if (hashNames) conditions.push(`any of (${hashNames})`);
    if (domainNames) conditions.push(`any of (${domainNames})`);
    if (urlNames) conditions.push(`any of (${urlNames})`);

    const condition = conditions.join(' or ') || 'false';

    // Generate rule name
    const safeName = event.info
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .substring(0, 50)
      .replace(/_+$/, '');

    const rule: YARARule = {
      name: `misp_${safeName}_${event.id}`,
      condition,
      strings,
      meta,
      scopes: ['file'],
      source: this.formatYARARule(rule),
    };

    return rule;
  }

  /**
   * Format YARA rule as text
   */
  private formatYARARule(rule: YARARule): string {
    const lines: string[] = [
      `rule ${rule.name} {`,
      '    meta:',
    ];

    // Meta section
    for (const [key, value] of Object.entries(rule.meta)) {
      if (Array.isArray(value)) {
        lines.push(`        ${key} = "${value.join(', ')}"`);
      } else if (value) {
        lines.push(`        ${key} = "${value}"`);
      }
    }

    // Strings section
    lines.push('    strings:');
    for (const str of rule.strings) {
      let modifiers = '';
      if (str.nocase) modifiers += ' nocase';
      if (str.wide) modifiers += ' wide';
      if (str.fullword) modifiers += ' fullword';
      if (str.ascii) modifiers += ' ascii';

      switch (str.type) {
        case 'text':
          lines.push(`        ${str.name} = "${str.value}"${modifiers}`);
          break;
        case 'hex':
          lines.push(`        ${str.name} = { ${str.value} }${modifiers}`);
          break;
        case 'regex':
          lines.push(`        ${str.name} = /${str.value}/${modifiers}`);
          break;
      }
    }

    // Condition
    lines.push(`    condition:`);
    lines.push(`        ${rule.condition}`);
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Export YARA ruleset from multiple events
   */
  async exportYARARuleset(eventIds: string[]): Promise<string> {
    this.log('exportYARARuleset', `Exporting ${eventIds.length} rules`);

    const rules: string[] = [
      '// ===========================================',
      `// MISP YARA Ruleset - Generated ${new Date().toISOString()}`,
      `// Source: Algeria National SOC Platform`,
      `// Events: ${eventIds.length}`,
      '// ===========================================',
      '',
    ];

    for (const eventId of eventIds) {
      try {
        const rule = await this.generateYARAFromEvent(eventId);
        rules.push(rule.source);
        rules.push('');
      } catch (error) {
        this.log('exportYARARuleset', `Failed to generate rule for event ${eventId}`, error);
      }
    }

    return rules.join('\n');
  }

  // ============================================================
  // Sightings
  // ============================================================

  /**
   * Report sighting for an IOC
   */
  async reportSighting(params: {
    attribute_id?: string;
    value?: string;
    event_id?: string;
    type?: '0' | '1' | '2';  // sighting, false-positive, expiration
    source?: string;
  }): Promise<MISPSighting> {
    this.log('reportSighting', 'Reporting sighting');

    const response = await this.request<{
      response: Array<{ Sighting: MISPSighting }>;
    }>(`/sightings/add`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return response.response[0].Sighting;
  }

  /**
   * Get sightings for an attribute
   */
  async getSightings(attributeId: string): Promise<MISPSighting[]> {
    const response = await this.request<{
      response: Array<{ Sighting: MISPSighting[] }>;
    }>(`/sightings/index/attribute:${attributeId}`);

    return response.response.flatMap(r => r.Sighting);
  }

  // ============================================================
  // Statistics & Analytics
  // ============================================================

  /**
   * Get dashboard statistics
   */
  async getStatistics(timeRange: string = '30d'): Promise<MISPStatistics> {
    this.log('getStatistics', `Getting stats for ${timeRange}`);

    const [recentEvents, recentAttrs] = await Promise.all([
      this.searchEvents({ last: timeRange, limit: 1000 }),
      this.searchAttributes({ to_ids: true, limit: 5000 }),
    ]);

    const events = recentEvents.response.MISPEvent || [];
    const attributes = recentAttrs.response.Attribute || [];

    // Calculate statistics
    const stats: MISPStatistics = {
      events: {
        total: events.length,
        published: events.filter(e => e.published).length,
        unpublished: events.filter(e => !e.published).length,
        today: events.filter(e => e.date === new Date().toISOString().split('T')[0]).length,
        this_week: events.filter(e => {
          const d = new Date(e.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return d >= weekAgo;
        }).length,
        this_month: events.filter(e => {
          const d = new Date(e.date);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return d >= monthAgo;
        }).length,
        by_threat_level: {},
        by_analysis_status: {
          [AnalysisStatus.INITIAL]: 0,
          [AnalysisStatus.ONGOING]: 0,
          [AnalysisStatus.COMPLETED]: 0,
        },
      },
      attributes: {
        total: attributes.length,
        with_ids: attributes.filter(a => a.to_ids).length,
        unique_types: {},
        unique_categories: {},
      },
      correlations: {
        total: 0,
        events_with_correlations: 0,
        avg_correlations_per_event: 0,
      },
      organizations: {
        local: 0,
        external: 0,
        contributing: 0,
      },
      feeds: {
        active: 0,
        total_events_imported: 0,
        last_fetch_times: {},
      },
      threats: {
        top_actors: [],
        top_mitres: [],
        trending_iocs: [],
      },
    };

    // Aggregate event statistics
    for (const event of events) {
      // By threat level
      const tl = event.threat_level_id;
      stats.events.by_threat_level[tl] = (stats.events.by_threat_level[tl] || 0) + 1;

      // By analysis status
      stats.events.by_analysis_status[event.analysis] =
        (stats.events.by_analysis_status[event.analysis] || 0) + 1;

      // Track organizations
      if (event.owner_org?.local) {
        stats.organizations.local++;
      } else {
        stats.organizations.external++;
      }

      // Extract threat actor tags
      for (const tag of event.Tag || []) {
        if (tag.name.startsWith('misp-galaxy:intrusion-set="')) {
          const actor = tag.name.match(/intrusion-set="([^"]+)"/)?.[1];
          if (actor) {
            const existing = stats.threats.top_actors.find(t => t.name === actor);
            if (existing) {
              existing.count++;
            } else {
              stats.threats.top_actors.push({ name: actor, count: 1 });
            }
          }
        }
      }
    }

    // Aggregate attribute statistics
    for (const attr of attributes) {
      stats.attributes.unique_types[attr.type] =
        (stats.attributes.unique_types[attr.type] || 0) + 1;
      stats.attributes.unique_categories[attr.category] =
        (stats.attributes.unique_categories[attr.category] || 0) + 1;
    }

    // Sort threats
    stats.threats.top_actors.sort((a, b) => b.count - a.count);
    stats.threats.top_actors = stats.threats.top_actors.slice(0, 10);

    // Top trending IOCs (most common values)
    const iocCounts: Record<string, { type: string; count: number }> = {};
    for (const attr of attributes) {
      const key = `${attr.type}:${attr.value}`;
      if (!iocCounts[key]) {
        iocCounts[key] = { type: attr.type, count: 0 };
      }
      iocCounts[key].count++;
    }
    stats.threats.trending_iocs = Object.entries(iocCounts)
      .map(([key, val]) => ({ type: val.type, value: key.split(':')[1], count: val.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return stats;
  }

  /**
   * Get event timeline data
   */
  async getTimeline(days: number = 30): Promise<TimelinePoint[]> {
    this.log('timeline', `Getting timeline for ${days} days`);

    const events = await this.searchEvents({ last: `${days}d`, limit: 5000 });
    const eventList = events.response.MISPEvent || [];

    // Group by date
    const dailyData: Record<string, { events: number; attributes: number; published: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { events: 0, attributes: 0, published: 0 };
    }

    for (const event of eventList) {
      const dateStr = event.date;
      if (dailyData[dateStr]) {
        dailyData[dateStr].events++;
        dailyData[dateStr].attributes += (event.Attribute || []).length;
        if (event.published) {
          dailyData[dateStr].published++;
        }
      }
    }

    return Object.entries(dailyData)
      .map(([date, counts]) => ({
        date,
        ...counts,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ============================================================
  // Export Functions
  // ============================================================

  /**
   * Export event in various formats
   */
  async exportEvent(eventId: string, format: 'json' | 'xml' | 'stix' | 'stix2' | 'text' | 'csv' | 'yara'): Promise<MISPExportResult> {
    this.log('exportEvent', `Exporting event ${eventId} as ${format}`);

    const endpointMap: Record<string, string> = {
      json: `/events/view/${eventId}`,
      xml: `/events/xml/download/${eventId}`,
      stix: `/events/stix/download/${eventId}`,
      stix2: `/events/stix2/download/${eventId}`,
      text: `/events/text/download/${eventId}`,
      csv: `/events/csv/download/${eventId}`,
    };

    let content: string;

    if (format === 'yara') {
      const rule = await this.generateYARAFromEvent(eventId);
      content = rule.source;
    } else {
      const response = await fetch(`${this.config.url}${endpointMap[format]}`, {
        headers: { Authorization: this.authHeader },
      });
      content = await response.text();
    }

    return {
      success: true,
      format,
      filename: `misp_event_${eventId}.${format}`,
      size: content.length,
      content,
      event_count: 1,
      attribute_count: 0,
    };
  }

  /**
   * Bulk export multiple events
   */
  async bulkExport(eventIds: string[], format: 'json' | 'stix' | 'stix2' | 'csv'): Promise<MISPExportResult> {
    this.log('bulkExport', `Exporting ${eventIds.length} events as ${format}`);

    const contents: string[] = [];
    let totalAttributes = 0;

    for (const eventId of eventIds) {
      const result = await this.exportEvent(eventId, format);
      contents.push(result.content as string);
      totalAttributes += result.attribute_count;
    }

    return {
      success: true,
      format,
      filename: `misp_export_${Date.now()}.${format}`,
      size: contents.join('\n').length,
      content: contents.join('\n'),
      event_count: eventIds.length,
      attribute_count: totalAttributes,
    };
  }

  // ============================================================
  // Warninglist Management
  // ============================================================

  /**
   * Get all warninglists
   */
  async getWarninglists(): Promise<Warninglist[]> {
    this.log('getWarninglists', 'Fetching warninglists');

    const response = await this.request<{
      response: Array<{ Warninglist: Warninglist }>;
    }>('/warninglists');

    return response.response.map(w => w.Warninglist);
  }

  /**
   * Toggle warninglist enabled state
   */
  async toggleWarninglist(warninglistId: string, enabled: boolean): Promise<boolean> {
    this.log('toggleWarninglist', `${enabled ? 'Enabling' : 'Disabling'} warninglist ${warninglistId}`);

    await this.request(`/warninglists/toggleEnable/${warninglistId}/${Number(enabled)}`, {
      method: 'POST',
    });

    return true;
  }

  // ============================================================
  // Decaying Models
  // ============================================================

  /**
   * Get configured decaying models
   */
  async getDecayingModels(): Promise<DecayingModel[]> {
    const response = await this.request<{
      response: Array<{ DecayingModel: DecayingModel }>;
    }>('decayingModel/DecayingModel/getRows');

    return response.response.map(m => m.DecayingModel);
  }

  /**
   * Calculate decayed score for an attribute
   */
  async calculateDecayedScore(
    modelId: string,
    attribute: { type: AttributeType; value: string }
  ): Promise<{ score: number; decayed: boolean }> {
    const response = await this.request<{
      response: Array<{ score: number; decayed: boolean }>;
    }>('decayingModel/DecayingModel/computeScores', {
      method: 'POST',
      body: JSON.stringify({
        model_id: modelId,
        attributes: [attribute],
      }),
    });

    return response.response[0];
  }

  // ============================================================
  // Utility Functions
  // ============================================================

  /**
   * Create alert-to-event conversion
   * Convert security alert into structured MISP event
   */
  async createEventFromAlert(alert: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    source: string;
    iocs: Array<{
      type: AttributeType;
      value: string;
      category: string;
    }>;
    tags?: string[];
    references?: string[];
  }): Promise<MISPEvent> {
    this.log('createEventFromAlert', `Creating event from alert: ${alert.title}`);

    // Map severity to threat level
    const severityToThreatLevel: Record<string, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    const event = await this.createEvent({
      info: `[ALERT] ${alert.title}`,
      threat_level_id: severityToThreatLevel[alert.severity] || 4,
      analysis: AnalysisStatus.ONGOING,
      distribution: DistributionLevel.CONNECTED_COMMUNITIES,
      tags: alert.tags || [],
    });

    // Add IOCs as attributes
    if (alert.iocs.length > 0) {
      await this.addAttributesBatch(event.id, alert.iocs.map(ioc => ({
        type: ioc.type,
        value: ioc.value,
        category: ioc.category,
        to_ids: true,
        comment: `Source: ${alert.source}`,
      })));
    }

    // Add description as comment attribute
    if (alert.description) {
      await this.addAttribute(event.id, {
        type: 'comment',
        value: alert.description.substring(0, 255),
        to_ids: false,
      });
    }

    return event;
  }

  /**
   * Find correlated events for given IOCs
   */
  async findCorrelatedEvents(iocs: Array<{ type: AttributeType; value: string }>): Promise<Map<string, MISPEvent[]>> {
    this.log('findCorrelatedEvents', `Finding correlations for ${iocs.length} IOCs`);

    const correlations = new Map<string, MISPEvent[]>();

    for (const ioc of iocs) {
      try {
        const result = await this.searchAttributes({
          value: ioc.value,
          type: ioc.type,
          includeCorrelations: true,
          limit: 50,
        });

        const events: MISPEvent[] = [];
        for (const attr of result.response.Attribute || []) {
          if (attr.correlating_value) {
            for (const corr of attr.correlating_value) {
              // We'd need to fetch full events here, but for now just track IDs
              events.push({ id: corr.event_id, info: corr.event_info } as MISPEvent);
            }
          }
        }

        correlations.set(`${ioc.type}:${ioc.value}`, events);
      } catch (error) {
        this.log('findCorrelatedEvents', `Failed to correlate ${ioc.type}:${ioc.value}`, error);
        correlations.set(`${ioc.type}:${ioc.value}`, []);
      }
    }

    return correlations;
  }
}

// ============================================================
// Singleton Instance
// ============================================================

let mispClientInstance: MISPClientInstance | null = null;

/**
 * Initialize MISP client singleton
 */
export function initializeMISPClient(config: MISPClientConfig): MISPClientInstance {
  mispClientInstance = new MISPClientInstance(config);
  return mispClientInstance;
}

/**
 * Get MISP client instance (must call initialize first)
 */
export function getMISPClient(): MISPClientInstance {
  if (!mispClientInstance) {
    throw new MISPError('MISP client not initialized. Call initializeMISPClient first.');
  }
  return mispClientInstance;
}

/**
 * Create isolated MISP client (for multi-instance support)
 */
export function createMISPClient(config: MISPClientConfig): MISPClientInstance {
  return new MISPClientInstance(config);
}

// Export types
export type {
  MISPClientConfig,
};
