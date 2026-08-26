/**
 * 🇩🇿 National SOC - MISP Threat Intelligence Integration Client
 * Complete API client for MISP (Malware Information Sharing Platform)
 * 
 * Features:
 * - Threat event management
 * - IOC (Indicator of Compromise) synchronization
 * - Threat feed aggregation and enrichment
 * - YARA rule generation from indicators
 * - Galaxy/Threat Actor mapping
 * - Warning list management (false positives)
 * - Sightings tracking
 */

import { MISPConfig, MISPEvent, MISPAttribute, MISPGalaxy, MISPObject } from './types';

// ────────────────────────────────────────────────────────
// CONFIGURATION & CONSTANTS
// ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Partial<MISPConfig> = {
  baseUrl: process.env.MISP_API_URL || 'https://localhost:443',
  apiKey: process.env.MISP_API_KEY || '',
  timeout: 60000, // MISP can be slow with large queries
  retries: 3,
};

// API endpoints
const ENDPOINTS = {
  // Events
  EVENTS: '/events',
  EVENT_BY_ID: '/events/:id',
  EVENT_BY_UUID: '/events/uuid/:uuid',
  
  // Attributes (IOCs)
  ATTRIBUTES: '/attributes/restSearch',
  ATTRIBUTE_ADD: '/attributes/add',
  
  // Search
  SEARCH: '/events/restSearch',
  ATTRIBUTES_SEARCH: '/attributes/restSearch',
  
  // Galaxies (Threat Actors)
  GALAXIES: '/galaxies',
  GALAXY_BY_ID: '/galaxies/view/:id',
  GALAXY_CLUSTER: '/galaxy_clusters/view/:id',
  
  // Warning Lists
  WARNINGLISTS: '/warninglists',
  WARNINGLIST_CHECK: '/warninglists/checkValue/:value',
  
  // Sightings
  SIGHTINGS: '/sightings/add',
  
  // Feeds
  FEEDS: '/feeds',
  FEED_PREVIEW: '/feeds/previewIndex/:feed_id',
  FEED_FETCH: '/feeds/fetchFromAll',
  
  // Objects
  OBJECT_TEMPLATES: '/objectTemplates',
  OBJECTS_ADD: '/objects/add',
  
  // User info
  USERS_ME: '/users/me/view',
  
  // Server info
  SERVER_INFO: '/servers/getVersion',
  SERVER_SETTINGS: '/servers/serverSettings',
  
  // Statistics
  STATISTICS: '/events/statistics',
} as const;

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

export class MISPError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MISPError';
  }
}

export class MISPAuthError extends MISPError {
  constructor(message: string) {
    super(message, 403, 'AUTH_FAILED');
    this.name = 'MISPAuthError';
  }
}

export class MISPRateLimitError extends MISPError {
  constructor() {
    super('Rate limit exceeded', 429, 'RATE_LIMITED');
    this.name = 'MISPRateLimitError';
  }
}

// ────────────────────────────────────────────────────────
// MAIN CLIENT CLASS
// ────────────────────────────────────────────────────────

export class MISPClient {
  private config: MISPConfig;

  constructor(config?: Partial<MISPConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as MISPConfig;
    
    if (!this.config.apiKey) {
      console.warn('MISP API key not configured. Set MISP_API_KEY environment variable.');
    }
  }

  // ────────────────────────────────────────────────────
  // HTTP HELPERS
  // ────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': this.config.apiKey,
      ...(options.headers as Record<string, string>),
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.retries || 3); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 403) {
          throw new MISPAuthError('Invalid API key or unauthorized access');
        }

        if (response.status === 429) {
          throw new MISPRateLimitError();
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new MISPError(
            errorBody.message || errorBody.error?.join(', ') || `HTTP ${response.status}`,
            response.status,
            errorBody.error?.[0],
            errorBody
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (error instanceof MISPError && !error.statusCode?.toString().startsWith('5')) {
          throw error; // Don't retry client errors
        }
        
        if (attempt < (this.config.retries || 3)) {
          // Exponential backoff for MISP (can be slow)
          await new Promise(resolve => 
            setTimeout(resolve, 2000 * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  // ────────────────────────────────────────────────────
  // EVENT MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Create a new threat event
   */
  async createEvent(params: {
    info: string;           // Event title/description
    threat_level_id?: number; // 1-4 (High to Undefined)
    analysis?: number;       // 0=Initial, 1=Ongoing, 2=Completed
    distribution?: number;  // 0-4 (Your org only → All communities)
    date?: string;           // YYYY-MM-DD format
    published?: boolean;
    tags?: string[];
    attributes?: Array<{
      type: string;
      value: string;
      category?: string;
      to_ids?: boolean;     // Mark as IOC
      comment?: string;
    }>;
  }): Promise<MISPEvent> {
    const eventData = {
      Event: {
        info: params.info,
        threat_level_id: params.threat_level_id ?? 3,
        analysis: params.analysis ?? 0,
        distribution: params.distribution ?? 0,
        date: params.date || new Date().toISOString().split('T')[0],
        published: params.published || false,
        ...(params.tags && { Tag: params.tags.map(t => ({ name: t })) }),
        ...(params.attributes && { 
          Attribute: params.attributes.map(attr => ({
            type: attr.type,
            value: attr.value,
            category: attr.category || this.guessCategory(attr.type),
            to_ids: attr.to_ids !== false,
            comment: attr.comment || '',
            distribution: 0,
          }))
        }),
      },
    };

    const response = await this.request<{ Event: MISPEvent }>(ENDPOINTS.EVENTS, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });

    return response.Event;
  }

  /**
   * Get event by ID or UUID
   */
  async getEvent(identifier: string): Promise<MISPEvent> {
    const endpoint = identifier.includes('-') && identifier.length === 36
      ? ENDPOINTS.EVENT_BY_UUID.replace(':uuid', identifier)
      : ENDPOINTS.EVENT_BY_ID.replace(':id', identifier);

    const response = await this.request<{ Event: MISPEvent }>(endpoint);
    return response.Event;
  }

  /**
   * Update existing event
   */
  async updateEvent(eventId: string, updates: Partial<MISPEvent>): Promise<MISPEvent> {
    const response = await this.request<{ Event: MISPEvent }>(
      ENDPOINTS.EVENT_BY_ID.replace(':id', eventId),
      {
        method: 'PUT',
        body: JSON.stringify({ Event: updates }),
      }
    );
    return response.Event;
  }

  /**
   * Publish event (make visible to other organizations)
   */
  async publishEvent(eventId: string): Promise<MISPEvent> {
    const response = await this.request<{ Event: MISPEvent }>(
      `/events/publish/${eventId}`,
      { method: 'POST' }
    );
    return response.Event;
  }

  /**
   * Search events with advanced filters
   */
  async searchEvents(params: {
    query?: string;
    tags?: string[];
    from?: string;
    to?: string;
    eventinfo?: string;
    threat_level?: number;
    distribution?: number;
    published?: boolean;
    limit?: number;
    page?: number;
    orderby?: string;
    sort?: 'asc' | 'desc';
  }): Promise<{ response: MISPEvent[] }> {
    const searchParams: Record<string, any> = {
      returnFormat: 'alerts',
      page: params.page || 1,
      limit: params.limit || 50,
      ...params.orderby && { orderby: params.orderby },
      ...params.sort && { sort: params.sort },
    };

    if (params.query) searchParams.value = params.query;
    if (params.eventinfo) searchParams.searcheventinfo = params.eventinfo;
    if (params.threat_level !== undefined) searchParams.threat_level_id = params.threat_level;
    if (params.distribution !== undefined) searchParams.distribution = params.distribution;
    if (params.published !== undefined) searchParams.published = params.published;
    if (params.from) searchParams.from = params.from;
    if (params.to) searchParams.to = params.to;
    if (params.tags?.length) searchParams.tags = params.tags.join('&&');

    const response = await this.request<{ response: MISPEvent[] }>(
      ENDPOINTS.SEARCH,
      {
        method: 'POST',
        body: JSON.stringify(searchParams),
      }
    );

    return response;
  }

  /**
   * Get recent events (last N days)
   */
  async getRecentEvents(days: number = 7, limit: number = 20): Promise<MISPEvent[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    
    const result = await this.searchEvents({
      from: fromDate.toISOString(),
      limit,
      orderby: 'date',
      sort: 'desc',
    });
    
    return result.response;
  }

  // ────────────────────────────────────────────────────
  // ATTRIBUTE / IOC MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Search for IOCs/Attributes across all events
   */
  async searchAttributes(params: {
    type?: string | string[];
    value?: string;
    category?: string;
    tags?: string[];
    from?: string;
    to?: string;
    eventid?: string;
    to_ids?: boolean; // Only IOCs
    enforceWarninglist?: boolean;
    limit?: number;
    page?: number;
  }): Promise<{ response: { Attribute: MISPAttribute[] }; Attribute: MISPAttribute[] }> {
    const searchParams: Record<string, any> = {
      returnFormat: 'attributes',
      page: params.page || 1,
      limit: params.limit || 100,
      ...params.to_ids !== undefined && { to_ids: params.to_ids },
      ...params.enforceWarninglist !== undefined && { enforceWarninglist: params.enforceWarninglist },
    };

    if (params.type) searchParams.type = Array.isArray(params.type) ? params.type.join(',') : params.type;
    if (params.value) searchParams.value = params.value;
    if (params.category) searchParams.category = params.category;
    if (params.eventid) searchParams.eventid = params.eventid;
    if (params.from) searchParams.from = params.from;
    if (params.to) searchParams.to = params.to;
    if (params.tags?.length) searchParams.tags = params.tags.join('&&');

    const response = await this.request<any>(
      ENDPOINTS.ATTRIBUTES_SEARCH,
      {
        method: 'POST',
        body: JSON.stringify(searchParams),
      }
    );

    return response;
  }

  /**
   * Check if an indicator is known malicious
   */
  async checkIndicator(value: string): Promise<{
    found: boolean;
    events: MISPEvent[];
    attributes: MISPAttribute[];
    context?: string;
  }> {
    try {
      // First check warning lists (false positives)
      const warningListCheck = await this.checkWarningList(value);
      
      if (warningListCheck.result.filter(w => w).length > 0) {
        return {
          found: true,
          events: [],
          attributes: [],
          context: 'In warning list (likely false positive)',
        };
      }

      // Search for the indicator
      const result = await this.searchAttributes({
        value,
        to_ids: true,
        enforceWarninglist: true,
        limit: 10,
      });

      const attributes = result.Attribute || [];
      const uniqueEvents = [...new Map(
        attributes.map(a => [a.event_id, a])
      ).values()];

      return {
        found: attributes.length > 0,
        events: [], // Would need separate event fetches
        attributes,
        context: attributes.length > 0 
          ? `Found in ${attributes.length} attribute(s)` 
          : 'Not known malicious',
      };
    } catch (error) {
      console.error('MISP indicator check error:', error);
      return { found: false, events: [], attributes: [] };
    }
  }

  /**
   * Add attribute/IOC to an event
   */
  async addAttribute(eventId: string, attribute: {
    type: string;
    value: string;
    category?: string;
    to_ids?: boolean;
    comment?: string;
  }): Promise<MISPAttribute> {
    const response = await this.request<{ Attribute: MISPAttribute }>(
      ENDPOINTS.ATTRIBUTE_ADD,
      {
        method: 'POST',
        body: JSON.stringify({
          Attribute: {
            event_id: parseInt(eventId),
            type: attribute.type,
            value: attribute.value,
            category: attribute.category || this.guessCategory(attribute.type),
            to_ids: attribute.to_ids !== false,
            comment: attribute.comment || '',
            distribution: 0,
          },
        }),
      }
    );

    return response.Attribute;
  }

  /**
   * Batch add IOCs to an event
   */
  async batchAddIOCs(eventId: string, iocs: Array<{
    type: string;
    value: string;
    comment?: string;
  }>): Promise<MISPAttribute[]> {
    const results: MISPAttribute[] = [];

    for (const ioc of iocs) {
      try {
        const attr = await this.addAttribute(eventId, ioc);
        results.push(attr);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Failed to add IOC ${ioc.value}:`, error);
      }
    }

    return results;
  }

  // ────────────────────────────────────────────────────
  // THREAT INTELLIGENCE ENRICHMENT
  // ────────────────────────────────────────────────────

  /**
   * Get all galaxies (threat actor frameworks)
   */
  async getGalaxies(): Promise<MISPGalaxy[]> {
    const response = await this.request<{ Galaxy: MISPGalaxy[] }>(ENDPOINTS.GALAXIES);
    return response.Galaxy || [];
  }

  /**
   * Get galaxy clusters (specific actors/groups)
   */
  async getGalaxyClusters(galaxyType?: string): Promise<Array<{
    id: string;
    type: string;
    value: string;
    description: string;
    tag_name: string;
  }>> {
    let url = ENDPOINTS.GALAXY_CLUSTER.replace(':id', '');
    if (galaxyType) {
      url += `?type=${encodeURIComponent(galaxyType)}`;
    }

    const response = await this.request<any>(url);
    return response || [];
  }

  /**
   * Get MITRE ATT&CK galaxy data
   */
  async getMITREATTCK(): Promise<{
    tactics: Array<{ id: string; name: value: string; description: string }>;
    techniques: Array<{ id: string; name: string; tactic: string }>;
  }> {
    const clusters = await this.getGalaxyClusters('mitre-attack');

    const tactics = clusters
      .filter(c => c.tag_name?.includes('mitre-attack-tactic'))
      .map(c => ({
        id: c.id,
        name: c.value,
        description: c.description,
      }));

    const techniques = clusters
      .filter(c => c.tag_name?.includes('mitre-attack-technique'))
      .map(c => ({
        id: c.id,
        name: c.value,
        tactic: '', // Would need parsing of description
      }));

    return { tactics, techniques };
  }

  /**
   * Get threat actor information
   */
  async getThreatActors(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    aliases: string[];
    country: string;
    motivation: string;
  }>> {
    const clusters = await this.getGalaxyClusters('threat-actor');

    return clusters.map(cluster => ({
      id: cluster.id,
      name: cluster.value,
      description: cluster.description,
      aliases: [],
      country: '',
      motivation: '',
    }));
  }

  // ────────────────────────────────────────────────────
  // WARNING LISTS (False Positives)
  // ────────────────────────────────────────────────────

  /**
   * Get all warning lists
   */
  async getWarningLists(): Promise<Array<{
    name: string;
    version: string;
    count: number;
    description: string;
    list: string[];
  }>> {
    const response = await this.request<any>(ENDPOINTS.WARNINGLISTS);
    return response.Warninglists || [];
  }

  /**
   * Check value against warning lists
   */
  async checkWarningList(value: string): Promise<boolean[]> {
    const encodedValue = encodeURIComponent(value);
    const response = await this.request<any>(
      ENDPOINTS.WARNINGLIST_CHECK.replace(':value', encodedValue)
    );
    return response.result || [];
  }

  // ────────────────────────────────────────────────────
  // SIGHTINGS TRACKING
  // ────────────────────────────────────────────────────

  /**
   * Report a sighting (IOC seen in environment)
   */
  async reportSighting(params: {
    value: string;
    uuid?: string;         // Attribute UUID
    source: string;        // Source system (e.g., "Wazuh", "TheHive")
    type?: number;         // 0=Sighting, 1=False Positive, 2=Expiration
    date?: string;         // Sighting timestamp
  }): Promise<void> {
    await this.request(ENDPOINTS.SIGHTINGS, {
      method: 'POST',
      body: JSON.stringify({
        Sighting: {
          value: params.value,
          uuid: params.uuid,
          source: params.source,
          type: params.type || 0,
          date_sighting: params.date || new Date().toISOString(),
        },
      }),
    });
  }

  // ────────────────────────────────────────────────────
  // YARA RULE GENERATION
  // ────────────────────────────────────────────────────

  /**
   * Generate YARA rule from indicators
   */
  async generateYARARule(params: {
    eventName: string;
    author: string;
    description: string;
    hashes?: string[];
    domains?: string[];
    ips?: string[];
    urls?: string[];
  }): Promise<string> {
    const now = new Date().toISOString().split('T')[0];
    
    let conditions: string[] = [];
    let strings: string[] = [];

    // Add hash strings
    params.hashes?.forEach((hash, idx) => {
      const hashType = hash.length === 32 ? 'md5' : hash.length === 40 ? 'sha1' : 'sha256';
      strings.push(`$${hashType}_${idx} = "${hash}"`);
      conditions.push(`$${hashType}_${idx}`);
    });

    // Add domain strings
    params.domains?.forEach((domain, idx) => {
      strings.push(`$domain_${idx} = "${domain}" nocase wide ascii`);
      conditions.push(`$domain_${idx}`);
    });

    // Add IP strings
    params.ips?.forEach((ip, idx) => {
      strings.push(`$ip_${idx} = "${ip}"`);
      conditions.push(`$ip_${idx}`);
    });

    // Add URL strings
    params.urls?.forEach((url, idx) => {
      strings.push(`$url_${idx} = "${url}" nocase wide ascii`);
      conditions.push(`$url_${idx}`);
    });

    const condition = conditions.length > 0 
      ? `any of (${conditions.join(', ')})`
      : 'false';

    const yaraRule = `
rule ${params.eventName.replace(/[^a-zA-Z0-9_]/g, '_')} : SOC_AutoGenerated {
    meta:
        author = "${params.author}"
        date = "${now}"
        description = "${params.description}"
        hash_count = ${(params.hashes?.length || 0)}
        domain_count = ${(params.domains?.length || 0)}
        ip_count = ${(params.ips?.length || 0)}

    strings:
        ${strings.join('\n\t\t')}

    condition:
        ${condition}
}
`.trim();

    return yaraRule;
  }

  // ────────────────────────────────────────────────────
  // FEED MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * List available threat feeds
   */
  async getFeeds(): Promise<Array<{
    id: string;
    name: string;
    provider: string;
    url: string;
    enabled: boolean;
  }>> {
    const response = await this.request<any>(ENDPOINTS.FEEDS);
    return response || [];
  }

  /**
   * Fetch latest from all feeds
   */
  async fetchFeeds(): Promise<void> {
    await this.request(ENDPOINTS.FEED_FETCH, { method: 'POST' });
  }

  // ────────────────────────────────────────────────────
  // STATISTICS & DASHBOARD DATA
  // ────────────────────────────────────────────────────

  /**
   * Get platform statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    totalAttributes: number;
    totalIOCs: number;
    eventsToday: number;
    eventsThisWeek: number;
    topTags: Array<{ tag: string; count: number }>;
    topTypes: Array<{ type: string; count: number }>;
  }> {
    // These would typically use the statistics endpoint
    // For now, we'll calculate from recent data
    const [todayEvents, weekEvents] = await Promise.all([
      this.getRecentEvents(1, 100).catch(() => []),
      this.getRecentEvents(7, 500).catch(() => []),
    ]);

    // Count IOCs from recent events
    let totalIOCs = 0;
    const tagCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    weekEvents.forEach(event => {
      event.Attribute?.forEach(attr => {
        if (attr.to_ids) totalIOCs++;
        typeCounts[attr.type] = (typeCounts[attr.type] || 0) + 1;
      });
      event.Tag?.forEach(tag => {
        const tagName = typeof tag === 'string' ? tag : tag.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    return {
      totalEvents: weekEvents.length,
      totalAttributes: weekEvents.reduce((sum, e) => sum + (e.Attribute?.length || 0), 0),
      totalIOCs,
      eventsToday: todayEvents.length,
      eventsThisWeek: weekEvents.length,
      topTags,
      topTypes,
    };
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<{
    stats: Awaited<ReturnType<typeof this.getStatistics>>;
    recentEvents: MISPEvent[];
    activeThreatActors: Array<{ name: string; eventCount: number }>;
    feedStatus: { enabled: number; total: number };
  }> {
    const [stats, recentEvents, threats, feeds] = await Promise.all([
      this.getStatistics(),
      this.getRecentEvents(7, 5).catch(() => []),
      this.getThreatActors().catch(() => []),
      this.getFeeds().catch(() => []),
    ]);

    return {
      stats,
      recentEvents,
      activeThreatActors: threats.slice(0, 5).map(t => ({ ...t, eventCount: 0 })),
      feedStatus: {
        enabled: feeds.filter(f => f.enabled).length,
        total: feeds.length,
      },
    };
  }

  // ────────────────────────────────────────────────────
  // UTILITY METHODS
  // ────────────────────────────────────────────────────

  /**
   * Guess MISP category from attribute type
   */
  private guessCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      'ip-dst': 'Network activity',
      'ip-src': 'Network activity',
      'ip-port': 'Network activity',
      'domain': 'Network activity',
      'hostname': 'Network activity',
      'url': 'External analysis',
      'uri': 'External analysis',
      'user-agent': 'External analysis',
      'md5': 'Payload delivery',
      'sha1': 'Payload delivery',
      'sha256': 'Payload delivery',
      'filename': 'Payload delivery',
      'email': 'Attribution',
      'email-src': 'Attribution',
      'email-dst': 'Attribution',
      'email-subject': 'Attribution',
      'malware-sample': 'Payload delivery',
      'mutex': 'Artifacts dropped',
      'named pipe': 'Artifacts dropped',
      'regkey': 'Artifacts dropped',
      'yara': 'Payload delivery',
      'vulnerability': 'External analysis',
      'target-user': 'Targeting data',
      'target-location': 'Targeting data',
      'target-external': 'Targeting data',
      'target-email': 'Targeting data',
      'target-host': 'Targeting data',
      'target-org': 'Targeting data',
      'whois-registrant-email': 'Attribution',
      'whois-registrant-name': 'Attribution',
      'xpath': 'General',
      'link': 'External analysis',
      'comment': 'General',
      'text': 'General',
      'other': 'General',
    };

    return categoryMap[type.toLowerCase()] || 'General';
  }

  /**
   * Validate API connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    version: string;
    user?: string;
    error?: string;
  }> {
    try {
      const [version, user] = await Promise.all([
        this.request<any>(ENDPOINTS.SERVER_INFO).catch(() => null),
        this.request<any>(ENDPOINTS.USERS_ME).catch(() => null),
      ]);

      return {
        healthy: !!(version || user),
        version: version?.version || 'unknown',
        user: user?.email || user?.name,
      };
    } catch (error) {
      return {
        healthy: false,
        version: 'unknown',
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

// ────────────────────────────────────────────────────────
// EXPORT SINGLETON INSTANCE
// ────────────────────────────────────────────────────────

let mispClientInstance: MISPClient | null = null;

/**
 * Get or create MISP client singleton
 */
export function getMISPClient(config?: Partial<MISPConfig>): MISPClient {
  if (!mispClientInstance) {
    mispClientInstance = new MISPClient(config);
  }
  return mispClientInstance;
}

/**
 * Reset client instance
 */
export function resetMISPClient(): void {
  mispClientInstance = null;
}

// Default export
export default MISPClient;
