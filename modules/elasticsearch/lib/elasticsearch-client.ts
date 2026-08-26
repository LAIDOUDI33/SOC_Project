/**
 * Elasticsearch Client Library
 * National SOC Platform - Algeria 2026-2030
 * 
 * Comprehensive client for:
 * - Connection management with retry logic
 * - Index CRUD operations (create, delete, update settings)
 * - Document CRUD (index, get, update, delete, bulk)
 * - Search API with full query builder
 * - Aggregation framework support
 * - Cluster health monitoring APIs
 * - Index template management
 * - ILM policy management
 * - Snapshot/restore operations
 * - Bulk indexing helpers for logs
 */

import {
  ESClientConfig,
  ESAuthConfig,
  ESDocument,
  ESLogDocument,
  ESAlertDocument,
  ESMetricDocument,
  ESSearchRequest,
  ESSearchResponse,
  ESQuery,
  ESAggregation,
  ESClusterHealth,
  ESClusterStats,
  ESNodeInfo,
  ESNodeStats,
  ESIndexInfo,
  ESIndexStats,
  ESTemplateConfig,
  ESIngestPipeline,
  ESLifecyclePolicy,
  ESLifecycleExplain,
  ESSnapshotRepository,
  ESSnapshotInfo,
  ESRestoreConfig,
  ESTask,
  ESBulkOperationItem,
  ESBulkResponse,
  ESBulkResponseItem,
  ESPITContext,
  ESScrollContext,
  ESReindexTask,
  ESUpdateByQueryTask,
  ESDeleteByQueryTask,
  ESCatIndicesRow,
  ESCatShardsRow,
  ESCatNodesRow,
  ESIndexTemplateListItem,
  ESComponentTemplateListItem,
  ESIndexAliasListItem,
  ESMappingFieldType,
  ESDataStream,
  ESRollupJob,
  ESTransform,
  ESWatcher,
  ESMLJob,
  ESGraphExplore,
  ESSQLResult,
  ESEQLResult,
  ESConnectionTestResult,
  LogSeverity,
  LogSource,
  SortOrder,
  NodeRole,
  SnapshotState,
  DEFAULT_INDEX_PATTERNS,
  DEFAULT_ILM_POLICIES
} from '../types/elasticsearch.types';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/** Base error for Elasticsearch client */
export class ElasticsearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: string[],
    public elasticsearchError?: any
  ) {
    super(message);
    this.name = 'ElasticsearchError';
  }
}

/** Connection error */
export class ConnectionError extends ElasticsearchError {
  constructor(message: string, originalError?: Error) {
    super(message, 'CONNECTION_ERROR', undefined, [originalError?.message || 'Unknown connection error']);
    this.name = 'ConnectionError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/** Authentication error */
export class AuthError extends ElasticsearchError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/** Timeout error */
export class TimeoutError extends ElasticsearchError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408
    );
    this.name = 'TimeoutError';
  }
}

/** Index not found error */
export class IndexNotFoundError extends ElasticsearchError {
  constructor(indexName: string) {
    super(`Index '${indexName}' not found`, 'INDEX_NOT_FOUND', 404);
    this.name = 'IndexNotFoundError';
  }
}

/** Document not found error */
export class DocumentNotFoundError extends ElasticsearchError {
  constructor(index: string, id: string) {
    super(`Document with id '${id}' in index '${index}' not found`, 'DOCUMENT_NOT_FOUND', 404);
    this.name = 'DocumentNotFoundError';
  }
}

/** Query syntax error */
export class QuerySyntaxError extends ElasticsearchError {
  constructor(message: string, details?: string[]) {
    super(message, 'QUERY_SYNTAX_ERROR', 400, details);
    this.name = 'QuerySyntaxError';
  }
}

/** Bulk operation error */
export class BulkOperationError extends ElasticsearchError {
  constructor(
    message: string,
    public failedItems: ESBulkResponseItem[]
  ) {
    super(message, 'BULK_OPERATION_ERROR', undefined, failedItems.map(item => 
      item.index?._id || item.create?._id || item.update?._id || item.delete?._id || 'unknown'
    ));
    this.name = 'BulkOperationError';
  }
}

/** Validation error */
export class ValidationError extends ElasticsearchError {
  constructor(field: string, message: string) {
    super(`Validation error on field '${field}': ${message}`, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/** Rate limit error */
export class RateLimitError extends ElasticsearchError {
  constructor(retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded. Retry after ${retryAfterSeconds || 60} seconds`,
      'RATE_LIMIT_ERROR',
      429
    );
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }

  retryAfterSeconds?: number;
}

/** Cluster health error */
export class ClusterHealthError extends ElasticsearchError {
  constructor(status: string, message?: string) {
    super(
      `Cluster health is ${status}: ${message || 'Cluster is not healthy'}`,
      'CLUSTER_HEALTH_ERROR',
      503
    );
    this.name = 'ClusterHealthError';
    this.clusterStatus = status;
  }

  clusterStatus: string;
}

// ============================================================================
// CLIENT CLASS
// ============================================================================

/** Default configuration values */
const DEFAULT_CONFIG: Required<Omit<ESClientConfig, 'nodes' | 'auth' | 'caCertPath' | 'clientCertPath' | 'clientKeyPath' | 'proxy' | 'appName'>> = {
  connectionTimeout: 10000,
  requestTimeout: 30000,
  maxRetries: 3,
  retryDelay: 500,
  sslVerification: true,
  compression: false,
  maxContentLength: 104857600,
  maxConnections: 10,
  logging: false,
  headers: {}
};

/**
 * Main Elasticsearch Client Class
 * Provides comprehensive access to all Elasticsearch APIs
 */
class ElasticsearchClientClass {
  private config: ESClientConfig & typeof DEFAULT_CONFIG;
  private currentNodeIndex: number = 0;
  private isInitialized: boolean = false;

  /** Private constructor - use initializeESClient() instead */
  private constructor(config: ESClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the client with configuration
   */
  static async create(config: ESClientConfig): Promise<ElasticsearchClientClass> {
    const client = new ElasticsearchClientClass(config);
    
    // Validate configuration
    if (!config.nodes || config.nodes.length === 0) {
      throw new ValidationError('nodes', 'At least one node URL is required');
    }

    // Test connection if configured to do so
    try {
      await client.testConnection();
      client.isInitialized = true;
    } catch (error) {
      console.warn('[Elasticsearch] Initial connection test failed:', error instanceof Error ? error.message : error);
      // Don't throw - allow initialization even if first node is down
      // The client will try other nodes on subsequent requests
      client.isInitialized = true;
    }

    return client;
  }

  /**
   * Check if client is initialized and ready
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Get current active node URL with rotation
   */
  private getCurrentNode(): string {
    const node = this.config.nodes[this.currentNodeIndex];
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.config.nodes.length;
    return node.replace(/\/$/, '');
  }

  /**
   * Build authentication headers
   */
  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const auth = this.config.auth;

    if (auth) {
      if (auth.username && auth.password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
      } else if (auth.apiKeyId && auth.apiKey) {
        headers['Authorization'] = `ApiKey ${Buffer.from(`${auth.apiKeyId}:${auth.apiKey}`).toString('base64')}`;
      } else if (auth.bearerToken) {
        headers['Authorization'] = `Bearer ${auth.bearerToken}`;
      } else if (auth.serviceAccountToken) {
        headers['Authorization'] = `Bearer ${auth.serviceAccountToken}`;
      }
    }

    return headers;
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    path: string,
    options: RequestInit = {},
    retries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const nodeUrl = this.getCurrentNode();
        const url = `${nodeUrl}${path.startsWith('/') ? '' : '/'}${path}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...this.buildAuthHeaders(),
            ...this.config.headers,
            ...(options.headers as Record<string, string>)
          }
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          
          switch (response.status) {
            case 401:
              throw new AuthError(errorBody.error?.reason || 'Authentication failed');
            case 404:
              throw new IndexNotFoundError(path.split('/')[1]);
            case 400:
              throw new QuerySyntaxError(
                errorBody.error?.reason || 'Bad request',
                errorBody.error?.root_cause?.map((c: any) => c.reason)
              );
            case 429:
              const retryAfter = parseInt(response.headers.get('retry-after') || '60');
              throw new RateLimitError(retryAfter);
            case 503:
              throw new ClusterHealthError(
                errorBody.status || 'unknown',
                errorBody.error?.reason
              );
            default:
              throw new ElasticsearchError(
                errorBody.error?.reason || `HTTP ${response.status}: ${response.statusText}`,
                'HTTP_ERROR',
                response.status,
                errorBody.error?.root_cause?.map((c: any) => c.reason),
                errorBody.error
              );
          }
        }

        return await response.json() as T;

      } catch (error) {
        lastError = error as Error;

        // Don't retry certain errors
        if (
          error instanceof AuthError ||
          error instanceof ValidationError ||
          error instanceof QuerySyntaxError ||
          error instanceof DocumentNotFoundError ||
          (error instanceof Error && error.name === 'AbortError' && attempt >= retries)
        ) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ConnectionError(
      `Failed after ${retries + 1} attempts`,
      lastError ?? undefined
    );
  }

  /**
   * Test connection to Elasticsearch cluster
   */
  async testConnection(): Promise<ESConnectionTestResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeRequest<{
        name: string;
        cluster_name: string;
        cluster_uuid: string;
        version: { number: string; build_flavor: string; build_type: string; build_hash: string; build_date: string; build_snapshot: boolean; lucene_version: string; minimum_wire_compatibility_version: string; minimum_index_compatibility_version: string; tagline: string };
      }>('/', { method: 'GET' });

      return {
        connected: true,
        version: result.version?.number,
        cluster_name: result.cluster_name,
        cluster_uuid: result.cluster_uuid,
        latency_ms: Date.now() - startTime,
        node_count: 1 // Will be updated by cluster info call
      };

    } catch (error) {
      return {
        connected: false,
        latency_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // INDEX OPERATIONS
  // ============================================================================

  /**
   * Create an index with optional settings and mappings
   */
  async createIndex(
    indexName: string,
    settings?: Record<string, any>,
    mappings?: Record<string, any>
  ): Promise<{ acknowledged: boolean; indexAcknowledged: boolean; shardsAcknowledged: boolean }> {
    const body: Record<string, any> = {};
    if (settings) body.settings = settings;
    if (mappings) body.mappings = mappings;

    return this.executeRequest(`/${indexName}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${indexName}`, { method: 'DELETE' });
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      await this.executeRequest(`/${indexName}`, { method: 'HEAD' });
      return true;
    } catch (error) {
      if (error instanceof IndexNotFoundError) return false;
      throw error;
    }
  }

  /**
   * Get index information
   */
  async getIndex(indexName: string): Promise<ESIndexInfo[]> {
    return this.executeRequest(`/_cat/indices/${indexName}?format=json`);
  }

  /**
   * Update index settings
   */
  async updateSettings(
    indexName: string,
    settings: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${indexName}/_settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  /**
   * Get index settings
   */
  async getSettings(indexName: string): Promise<Record<string, any>> {
    return this.executeRequest(`/${indexName}/_settings`);
  }

  /**
   * Get index mappings
   */
  async getMappings(indexName: string): Promise<Record<string, any>> {
    return this.executeRequest(`/${indexName}/_mapping`);
  }

  /**
   * Put mapping on existing index
   */
  async putMapping(
    indexName: string,
    mapping: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${indexName}/_mapping`, {
      method: 'PUT',
      body: JSON.stringify(mapping)
    });
  }

  /**
   * Open a closed index
   */
  async openIndex(indexName: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${indexName}/_open`, { method: 'POST' });
  }

  /**
   * Close an index
   */
  async closeIndex(indexName: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${indexName}/_close`, { method: 'POST' });
  }

  /**
   * Refresh an index
   */
  async refreshIndex(indexName: string): Promise<{
    _shards: { total: number; successful: number; failed: number };
  }> {
    return this.executeRequest(`/${indexName}/_refresh`, { method: 'POST' });
  }

  /**
   * Force merge an index
   */
  async forceMerge(
    indexName: string,
    maxNumSegments?: number
  ): Promise<{ _shards: { total: number; successful: number; failed: number } }> {
    const params = maxNumSegments ? `?max_num_segments=${maxNumSegments}` : '';
    return this.executeRequest(`/${indexName}/_forcemerge${params}`, { method: 'POST' });
  }

  /**
   * Clear cache for indices
   */
  async clearCache(indexName: string): Promise<{ _shards: { total: number; successful: number; failed: number } }> {
    return this.executeRequest(`/${indexName}/_cache/clear`, { method: 'POST' });
  }

  /**
   * Flush an index
   */
  async flushIndex(indexName: string): Promise<{ _shards: { total: number; successful: number; failed: number } }> {
    return this.executeRequest(`/${indexName}/_flush`, { method: 'POST' });
  }

  /**
   * Rollover an alias/index
   */
  async rollover(
    alias: string,
    conditions?: Record<string, any>
  ): Promise<{
    rolled_over: boolean;
    old_index: string;
    new_index: string;
    dry_run: boolean;
    conditions: Record<string, any>;
    acknowledged: boolean;
    shards_acknowledged: boolean;
  }> {
    const body = conditions ? { conditions } : {};
    return this.executeRequest(`/${alias}/_rollover`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Clone an index
   */
  async cloneIndex(
    sourceIndex: string,
    targetIndex: string,
    settings?: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${sourceIndex}/_clone/${targetIndex}`, {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
  }

  /**
   * Shrink an index
   */
  async shrinkIndex(
    sourceIndex: string,
    targetIndex: string,
    settings?: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${sourceIndex}/_shrink/${targetIndex}`, {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
  }

  /**
   * Split an index
   */
  async splitIndex(
    sourceIndex: string,
    targetIndex: string,
    settings?: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${sourceIndex}/_split/${targetIndex}`, {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
  }

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  /**
   * Index a document
   */
  async indexDocument<T = any>(
    index: string,
    document: T,
    id?: string,
    options?: {
      routing?: string;
      refresh?: 'true' | 'false' | 'wait_for';
      op_type?: 'create' | 'index';
      if_seq_no?: number;
      if_primary_term?: number;
      pipeline?: string;
      timeout?: string;
      version?: number;
      version_type?: 'internal' | 'external' | 'external_gte' | 'force';
    }
  ): Promise<{
    _index: string;
    _id: string;
    _version: number;
    result: 'created' | 'updated';
    _shards: { total: number; successful: number; failed: number };
    _seq_no: number;
    _primary_term: number;
    forced_refresh: boolean;
  }> {
    let path = `/${index}`;
    if (id) path += `/${encodeURIComponent(id)}`;
    
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
    }
    if (params.toString()) path += `?${params.toString()}`;

    return this.executeRequest(path, {
      method: options?.op_type === 'create' && !id ? 'POST' : 'PUT',
      body: JSON.stringify(document)
    });
  }

  /**
   * Get a document by ID
   */
  async getDocument<T = any>(
    index: string,
    id: string,
    options?: {
      stored_fields?: string[];
      preference?: string;
      realtime?: boolean;
      refresh?: boolean;
      routing?: string;
      _source?: boolean | string[];
      _source_excludes?: string[];
      version?: number;
      version_type?: 'internal' | 'external' | 'external_gte' | 'force';
    }
  ): Promise<ESDocument & { _source: T }> {
    let path = `/${index}/_doc/${encodeURIComponent(id)}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    const result = await this.executeRequest<any>(path);
    
    if (!result.found) {
      throw new DocumentNotFoundError(index, id);
    }

    return result;
  }

  /**
   * Check if a document exists
   */
  async documentExists(index: string, id: string): Promise<boolean> {
    try {
      await this.executeRequest(`/${index}/_doc/${encodeURIComponent(id)}`, { method: 'HEAD' });
      return true;
    } catch (error) {
      if (error instanceof DocumentNotFoundError) return false;
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    index: string,
    id: string,
    updates: Partial<any>,
    options?: {
      if_seq_no?: number;
      if_primary_term?: number;
      lang?: string;
      refresh?: 'true' | 'false' | 'wait_for';
      retry_on_conflict?: number;
      routing?: string;
      _source?: boolean | string[];
      _source_excludes?: string[];
      timeout?: string;
      wait_for_active_shards?: string;
      version?: number;
      version_type?: 'internal' | 'external' | 'external_gte' | 'force';
      scripted_upsert?: boolean;
      upsert?: any;
    }
  ): Promise<{
    _index: string;
    _id: string;
    _version: number;
    result: 'updated' | 'noop';
    _shards: { total: number; successful: number; failed: number };
    _seq_no: number;
    _primary_term: number;
    forced_refresh: boolean;
    _source?: any;
    get?: { _seq_no: number; _primary_term: number; found: boolean; _source: any };
  }> {
    let path = `/${index}/_update/${encodeURIComponent(id)}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).filter(([key]) => key !== 'upsert').forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    const body: Record<string, any> = { doc: updates };
    if (options?.upsert) body.upsert = options.upsert;
    if (options?.scripted_upsert) body.scripted_upsert = true;

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    index: string,
    id: string,
    options?: {
      if_seq_no?: number;
      if_primary_term?: number;
      refresh?: 'true' | 'false' | 'wait_for';
      routing?: string;
      timeout?: string;
      version?: number;
      version_type?: 'internal' | 'external' | 'external_gte' | 'force';
      wait_for_active_shards?: string;
    }
  ): Promise<{
    _index: string;
    _id: string;
    _version: number;
    result: 'deleted' | 'not_found';
    _shards: { total: number; successful: number; failed: number };
    _seq_no: number;
    _primary_term: number;
    forced_refresh: boolean;
    _shards_failure?: Array<{ shard_id: string; index: string; node_id: string; reason: string; primary: boolean }>
  }> {
    let path = `/${index}/_doc/${encodeURIComponent(id)}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, { method: 'DELETE' });
  }

  /**
   * Delete by query
   */
  async deleteByQuery(
    index: string,
    query: ESQuery,
    options?: {
      analyzer?: string;
      analyze_wildcard?: boolean;
      default_operator?: 'or' | 'and';
      df?: string;
      from?: number;
      ignore_unavailable?: boolean;
      conflicts?: 'abort' | 'proceed';
      allow_no_indices?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
      lenient?: boolean;
      preference?: string;
      q?: string;
      routing?: string;
      scroll?: string;
      search_timeout?: string;
      max_docs?: number;
      sort?: string[];
      _source?: boolean | string[];
      _source_excludes?: string[];
      terminate_after?: number;
      stats?: string[];
      version?: boolean;
      request_cache?: boolean;
      refresh?: boolean;
      timeout?: string;
      scroll_size?: number;
      wait_for_active_shards?: string;
      wait_for_completion?: boolean;
      requests_per_second?: number;
      slices?: number | 'auto';
    }
  ): Promise<ESDeleteByQueryTask | { took: number; deleted: number; version_conflicts: number; noops: number; batches: number; version_conflicts: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }>; timed_out: boolean; total: number; deleted: number; batches: number; version_conflicts: number; noops: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }> }> {
    let path = `/${index}/_delete_by_query`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  /**
   * Update by query
   */
  async updateByQuery(
    index: string,
    scriptOrUpdates: { script?: { source: string; params?: Record<string, any>; lang?: string }; doc?: Record<string, any> },
    query: ESQuery,
    options?: {
      analyzer?: string;
      analyze_wildcard?: boolean;
      default_operator?: 'or' | 'and';
      df?: string;
      from?: number;
      ignore_unavailable?: boolean;
      conflicts?: 'abort' | 'proceed';
      allow_no_indices?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
      lenient?: boolean;
      preference?: string;
      q?: string;
      routing?: string;
      scroll?: string;
      search_timeout?: string;
      max_docs?: number;
      sort?: string[];
      _source?: boolean | string[];
      _source_excludes?: string[];
      terminate_after?: number;
      stats?: string[];
      version?: boolean;
      request_cache?: boolean;
      refresh?: boolean;
      timeout?: string;
      scroll_size?: number;
      wait_for_active_shards?: string;
      wait_for_completion?: boolean;
      requests_per_second?: number;
      slices?: number | 'auto';
      pipeline?: string;
    }
  ): Promise<ESUpdateByQueryTask | { took: number; updated: number; version_conflicts: number; created: number; deleted: number; batches: number; version_conflicts: number; noops: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }>; timed_out: boolean; total: number; updated: number; created: number; deleted: number; batches: number; version_conflicts: number; noops: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }> }> {
    let path = `/${index}/_update_by_query`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify({ ...scriptOrUpdates, query })
    });
  }

  /**
   * Multi-get documents
   */
  async mget<T = any>(
    docs: Array<{ _index: string; _id: string; _source?: boolean | string[] }>,
    options?: {
      preference?: string;
      realtime?: boolean;
      refresh?: boolean;
      routing?: string;
      stored_fields?: string[];
      _source?: boolean | string[];
      _source_excludes?: string[];
    }
  ): Promise<{
    docs: Array<(ESDocument & { _source: T }) | { found: false; _index: string; _id: string }>;
  }> {
    let path = '/_mget';
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify({ docs })
    });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Execute bulk operations
   */
  async bulk(
    operations: ESBulkOperationItem[],
    options?: {
      refresh?: 'true' | 'false' | 'wait_for';
      routing?: string;
      timeout?: string;
      wait_for_active_shards?: string;
      require_alias?: boolean;
      pipeline?: string;
      _source?: boolean | string[];
      _source_excludes?: string[];
    }
  ): Promise<ESBulkResponse> {
    let path = '/_bulk';
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    // Build NDJSON body
    const lines: string[] = [];
    for (const op of operations) {
      if (op.index) lines.push(JSON.stringify({ index: op.index }));
      if (op.create) lines.push(JSON.stringify({ create: op.create }));
      if (op.update) {
        const { _source, upsert, scripted_upsert, script, ...updateMeta } = op.update;
        lines.push(JSON.stringify({ update: updateMeta }));
        lines.push(JSON.stringify({
          doc: op.update.doc,
          ...(op.update.doc ? {} : {}),
          ...(upsert ? { upsert } : {}),
          ...(scripted_upsert ? { scripted_upsert } : {}),
          ...(script ? { script } : {})
        }));
        continue;
      }
      if (op.delete) lines.push(JSON.stringify({ delete: op.delete }));
      
      // Add document data for index/create/update operations
      if (op.index || op.create) {
        lines.push('{}'); // Placeholder - actual data should be passed separately
      }
    }

    return this.executeRequest(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: lines.join('\n') + '\n'
    });
  }

  /**
   * Bulk index documents
   */
  async bulkIndex<T = any>(
    index: string,
    documents: T[],
    options?: {
      ids?: string[];
      refresh?: 'true' | 'false' | 'wait_for';
      routing?: string;
      pipeline?: string;
      batchSize?: number;
    }
  ): Promise<ESBulkResponse> {
    const batchSize = options?.batchSize || 500;
    const results: ESBulkResponseItem[] = [];
    let totalTook = 0;
    let hasErrors = false;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchIds = options?.ids?.slice(i, i + batchSize);
      
      const lines: string[] = [];
      batch.forEach((doc, idx) => {
        const meta: Record<string, any> = { _index: index };
        if (batchIds?.[idx]) meta._id = batchIds[idx];
        lines.push(JSON.stringify({ index: meta }));
        lines.push(JSON.stringify(doc));
      });

      const result = await this.executeRequest<ESBulkResponse>(`/_bulk${
        options?.refresh ? `?refresh=${options.refresh}` : ''
      }`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body: lines.join('\n') + '\n'
      });

      results.push(...result.items);
      totalTook += result.took;
      if (result.errors) hasErrors = true;
    }

    return {
      took: totalTook,
      errors: hasErrors,
      items: results
    };
  }

  /**
   * Reindex from one index to another
   */
  async reindex(
    source: { index: string; query?: ESQuery; remote?: { host: string; username?: string; password?: string; socket_timeout?: string; connect_timeout?: string } },
    dest: { index: string; version_type?: 'internal' | 'external' | 'external_gte'; op_type?: 'create' | 'create_or_update' },
    options?: {
      conflicts?: 'abort' | 'proceed';
      max_docs?: number;
      refresh?: boolean;
      timeout?: string;
      wait_for_active_shards?: string;
      wait_for_completion?: boolean;
      requests_per_second?: number;
      slices?: number | 'auto';
      scroll?: string;
      size?: number;
      script?: { source: string; lang?: string; params?: Record<string, any> };
      process?: Record<string, { name: string; config: Record<string, any> }>;
    }
  ): Promise<ESReindexTask | { took: number; created: number; updated: number; deleted: number; batches: number; version_conflicts: number; noops: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }>; timed_out: boolean; total: number; created: number; updated: number; deleted: number; batches: number; version_conflicts: number; noops: number; retries: { bulk: number; search: number }; throttled_millis: number; throttled_until_millis: number; failures: Array<{ index: string; type: string; id: string; cause: { type: string; reason: string } }> }> {
    let path = '/_reindex';
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify({
        source,
        dest,
        ...(options?.conflicts ? { conflicts: options.conflicts } : {}),
        ...(options?.max_docs ? { max_docs: options.max_docs } : {}),
        ...(options?.script ? { script: options.script } : {}),
        ...(options?.process ? { process: options.process } : {})
      })
    });
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  /**
   * Execute a search query
   */
  async search<T = any>(
    index: string | string[],
    searchRequest: Partial<ESSearchRequest>
  ): Promise<ESSearchResponse<T>> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest<ESSearchResponse<T>>(`/${indexStr}/_search`, {
      method: 'POST' as any,
      body: JSON.stringify(searchRequest)
    });
  }

  /**
   * Search using URI-style parameters
   */
  async uriSearch<T = any>(
    index: string | string[],
    params: {
      q?: string;
      df?: string;
      analyzer?: string;
      analyze_wildcard?: boolean;
      default_operator?: 'or' | 'and';
      lenient?: boolean;
      explain?: boolean;
      source?: string | string[];
      stored_fields?: string[];
      fields?: string[];
      sort?: string;
      track_scores?: boolean;
      timeout?: string;
      terminate_after?: number;
      from?: number;
      size?: number;
      search_type?: 'query_then_fetch' | 'dfs_query_then_fetch';
      scroll?: string;
      version?: boolean;
      seq_no_primary_term?: boolean;
      request_cache?: boolean;
      batched_reduce_size?: number;
      max_concurrent_shard_requests?: number;
      pre_filter_shard_size?: number;
      rest_total_hits_as_int?: boolean;
      min_compatible_shard_node?: string;
      typed_keys?: boolean;
      profile?: boolean;
      filter_path?: string;
      pretty?: boolean;
      human?: boolean;
      error_trace?: boolean;
      format?: string;
      include_named_queries_score?: boolean;
      [key: string]: any;
    }
  ): Promise<ESSearchResponse<T>> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    const queryString = Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${encodeURIComponent(Array.isArray(value) ? value.join(',') : String(value))}`)
      .join('&');

    return this.executeRequest<ESSearchResponse<T>>(`/${indexStr}/_search?${queryString}`);
  }

  /**
   * Search with template
   */
  async searchTemplate<T = any>(
    index: string | string[],
    template: {
      id?: string;
      file?: string;
      params?: Record<string, any>;
      source?: string;
    }
  ): Promise<ESSearchResponse<T>> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest<ESSearchResponse<T>>(`/${indexStr}/_search/template`, {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  /**
   * Multi-search
   */
  async msearch<T = any>(
    searches: Array<{
      header?: { index: string | string[]; search_type?: string; preference?: string; routing?: string };
      body: Partial<ESSearchRequest>;
    }>
  ): Promise<{
    responses: ESSearchResponse<T>[];
    took: number;
  }> {
    const lines: string[] = [];
    searches.forEach(search => {
      if (search.header) lines.push(JSON.stringify(search.header));
      lines.push(JSON.stringify(search.body));
    });

    return this.executeRequest('/_msearch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: lines.join('\n') + '\n'
    });
  }

  /**
   * Search across multiple indices with field capabilities
   */
  async fieldCaps(
    index: string | string[],
    fields?: string[]
  ): Promise<Record<string, { type: string; searchable: boolean; aggregatable: boolean; indices: string[] }>> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    const params = fields ? `?fields=${fields.join(',')}` : '';
    return this.executeRequest(`/${indexStr}/_field_caps${params}`);
  }

  /**
   * Count documents matching a query
   */
  async count(
    index: string | string[],
    query?: ESQuery
  ): Promise<{ count: number; _shards: { total: number; successful: number; skipped: number; failed: number } }> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest(`/${indexStr}/_count`, {
      method: 'POST',
      body: JSON.stringify(query || {})
    });
  }

  /**
   * Validate a query
   */
  async validateQuery(
    index: string | string[],
    query: ESQuery,
    options?: {
      explain?: boolean;
      rewrite?: boolean;
      all_shards?: boolean;
      verbose?: boolean;
      q?: string;
      analyzer?: string;
      analyze_wildcard?: boolean;
      default_operator?: 'or' | 'and';
      df?: string;
      lenient?: boolean;
    }
  ): Promise<{
    valid: boolean;
    _shards: { total: number; successful: number; skipped: number; failed: number };
    detailed?: boolean;
    error?: string;
    explanations?: Array<{ index: string; valid: boolean; error?: string; explanation?: string }];
  }> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    let path = `/${indexStr}/_validate/query`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  /**
   * Explain why a document matches or doesn't match a query
   */
  async explain(
    index: string,
    id: string,
    query: ESQuery,
    options?: {
      analyze_wildcard?: boolean;
      analyzer?: string;
      default_operator?: 'or' | 'and';
      df?: string;
      lenient?: boolean;
      lowercase_expanded_terms?: boolean;
      rewrite?: boolean;
      store_fields?: string[];
      routing?: string;
      _source?: boolean | string[];
      _source_excludes?: string[];
    }
  ): Promise<{
    _index: string;
    _id: string;
    matched: boolean;
    explanation: { value: number; description: string; details: Array<{ value: number; description: string; details: any[] }> };
    _source?: any;
    _version?: number;
    _explanation?: { value: number; description: string; details: any[] };
    fields?: Record<string, any>;
  }> {
    const indexStr = index;
    let path = `/${indexStr}/_explain/${encodeURIComponent(id)}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  /**
   * Profile a query execution
   */
  async profile(
    index: string | string[],
    searchRequest: Partial<ESSearchRequest>
  ): Promise<ESSearchResponse & { profile: Record<string, any> }> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest(`/${indexStr}/_search`, {
      method: 'POST',
      body: JSON.stringify({ ...searchRequest, profile: true })
    });
  }

  // ============================================================================
  // SCROLL API
  // ============================================================================

  /**
   * Initiate a scroll search
   */
  async scrollSearch<T = any>(
    index: string | string[],
    query: ESQuery,
    scrollTimeout: string = '5m',
    size: number = 1000
  ): Promise<{ _scroll_id: string; hits: ESSearchResponse<T>['hits'] }> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest(`/${indexStr}/_search?scroll=${scrollTimeout}&size=${size}`, {
      method: 'POST',
      body: JSON.stringify(query)
    });
  }

  /**
   * Continue scrolling
   */
  async scroll<T = any>(
    scrollId: string,
    scrollTimeout: string = '5m'
  ): Promise<{ _scroll_id: string; hits: ESSearchResponse<T>['hits'] }> {
    return this.executeRequest('/_search/scroll', {
      method: 'POST',
      body: JSON.stringify({ scroll_id: scrollId, scroll: scrollTimeout })
    });
  }

  /**
   * Clear scroll context
   */
  async clearScroll(scrollIds: string[]): Promise<{ num_freed: number; succeeded: boolean; num_failed: number; failures: Array<{ scroll_id: string; reason: string }> }> {
    return this.executeRequest('/_search/scroll', {
      method: 'DELETE',
      body: JSON.stringify({ scroll_id: scrollIds })
    });
  }

  // ============================================================================
  // POINT IN TIME (PIT) API
  // ============================================================================

  /**
   * Create point-in-time context
   */
  async openPit(
    index: string | string[],
    keepAlive: string = '5m',
    preferences?: string
  ): Promise<ESPITContext> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    const params = new URLSearchParams({ keep_alive: keepAlive });
    if (preferences) params.set('preference', preferences);

    return this.executeRequest(`/${indexStr}/_pit?${params.toString()}`, {
      method: 'POST'
    });
  }

  /**
   * Delete point-in-time context
   */
  async closePit(pitIds: string[]): Promise<{ succeeded: number; num_freed: number; num_failed: number; failures: Array<{ pit_id: string; reason: string }> }> {
    return this.executeRequest('/_pit', {
      method: 'DELETE',
      body: JSON.stringify({ id: pitIds })
    });
  }

  // ============================================================================
  // CLUSTER HEALTH & STATS
  // ============================================================================

  /**
   * Get cluster health status
   */
  async getClusterHealth(
    index?: string,
    options?: {
      level?: 'cluster' | 'indices' | 'shards';
      local?: boolean;
      master_timeout?: string;
      timeout?: string;
      wait_for_status?: 'green' | 'yellow' | 'red';
      wait_for_no_relocating_shards?: boolean;
      wait_for_no_initializing_shards?: boolean;
      wait_for_active_shards?: string;
      wait_for_nodes?: string;
      wait_for_events?: 'immediate' | 'urgent' | 'high' | 'normal' | 'low' | 'languid';
    }
  ): Promise<ESClusterHealth> {
    let path = '/_cluster/health';
    if (index) path += `/${index}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Get cluster statistics
   */
  async getClusterStats(
    nodeId?: string,
    options?: {
      timeout?: string;
    }
  ): Promise<ESClusterStats> {
    let path = '/_cluster/stats';
    if (nodeId) path += `/nodes/${nodeId}`;
    
    if (options?.timeout) {
      path += `?timeout=${options.timeout}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Get cluster state
   */
  async getClusterState(
    metrics?: string | string[],
    indices?: string | string[],
    options?: {
      local?: boolean;
      master_timeout?: string;
      timeout?: string;
      flat_settings?: boolean;
      ignore_unavailable?: boolean;
      allow_no_indices?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
    }
  ): Promise<{
    cluster_name: string;
    cluster_uuid: string;
    version: number;
    state_uuid: string;
    master_node: string;
    nodes: Record<string, any>;
    [metric: string]: any;
  }> {
    const metricStr = Array.isArray(metrics) ? metrics.join(',') : metrics || '_all';
    let path = `/_cluster/state/${metricStr}`;
    
    if (indices) {
      const indexStr = Array.isArray(indices) ? indices.join(',') : indices;
      path += `/${indexStr}`;
    }
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Get pending cluster tasks
   */
  async getPendingTasks(): Promise<{
    tasks: Array<{
      insert_order: number;
      priority: string;
      source: string;
      time_in_queue_millis: number;
      time_in_queue: string;
    }>;
  }> {
    return this.executeRequest('/_cluster/pending_tasks');
  }

  /**
   * Reroute allocations manually
   */
  async reroute(commands: Array<{
    move?: { index: string; shard: number; from_node: string; to_node: string };
    allocate_replica?: { index: string; shard: string; node: string };
    allocate_stale_primary?: { index: string; shard: string; node: string; accept_data_loss: boolean };
    cancel?: { index: string; shard: string; node: string };
  }>): Promise<{
    state: Record<string, any>;
    acknowledgments: Record<string, any>;
  }> {
    return this.executeRequest('/_cluster/reroute', {
      method: 'POST',
      body: JSON.stringify({ commands })
    });
  }

  // ============================================================================
  // NODES API
  // ============================================================================

  /**
   * Get node information
   */
  async getNodeInfo(
    nodeId?: string | string[],
    metrics?: string | string[]
  ): Promise<Record<string, ESNodeInfo>> {
    const nodeStr = Array.isArray(nodeId) ? nodeId.join(',') : nodeId || '_all';
    const metricStr = Array.isArray(metrics) ? metrics.join(',') : metrics || '';
    return this.executeRequest(`/_nodes/${nodeStr}${metricStr ? '/' + metricStr : ''}`);
  }

  /**
   * Get node statistics
   */
  async getNodeStats(
    nodeId?: string | string[],
    metrics?: string | string[],
    indexMetrics?: string | string[]
  ): Promise<Record<string, ESNodeStats>> {
    const nodeStr = Array.isArray(nodeId) ? nodeId.join(',') : nodeId || '_all';
    const metricStr = Array.isArray(metrics) ? metrics.join(',') : metrics || '';
    const indexMetricStr = Array.isArray(indexMetrics) ? indexMetrics.join(',') : '';
    
    let path = `/_nodes/${nodeStr}/stats`;
    if (metricStr) path += `/${metricStr}`;
    if (indexMetricStr) path += `/${indexMetricStr}`;

    return this.executeRequest(path);
  }

  /**
   * Hot threads on nodes
   */
  async hotThreads(
    nodeId?: string | string[],
    options?: {
      interval?: string;
      snapshots?: number;
      threads?: number;
      ignore_idle_threads?: boolean;
      type?: 'cpu' | 'wait' | 'block';
      timeout?: string;
    }
  ): Promise<Record<string, {
    host_name: string;
    ip: string;
    name: string;
    hot_threads: string;
    duration_micros: number;
    shutdown: boolean;
  }>> {
    const nodeStr = Array.isArray(nodeId) ? nodeId.join(',') : nodeId || '_hot_threads';
    let path = `/_nodes/${nodeStr}/hot_threads`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Reload secure settings
   */
  async reloadSecureSettings(
    secrets?: string[]
  ): Promise<{ node_ids: string[]; node_names: string[]; cluster_name: string; secrets: Record<string, { reloaded: boolean }> }> {
    return this.executeRequest('/_nodes/reload_secure_settings', {
      method: 'POST',
      body: JSON.stringify(secrets ? { secrets } : {})
    });
  }

  // ============================================================================
  // CAT APIS
  // ============================================================================

  /**
   * Cat indices
   */
  async catIndices(
    index?: string,
    options?: {
      format?: string;
      h?: string[];
      bytes?: 'b' | 'k' | 'm' | 'g' | 'p';
      local?: boolean;
      master_timeout?: string;
      s?: string[];
      v?: boolean;
      health?: string;
      pri?: boolean;
      include_unloaded_segments?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
      sorted_by?: string;
      order?: 'asc' | 'desc';
      from?: string;
      size?: string;
    }
  ): Promise<ESCatIndicesRow[]> {
    let path = '/_cat/indices';
    if (index) path += `/${index}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    } else {
      path += '?format=json';
    }

    return this.executeRequest(path);
  }

  /**
   * Cat shards
   */
  async catShards(
    index?: string,
    options?: {
      format?: string;
      h?: string[];
      local?: boolean;
      master_timeout?: string;
      s?: string[];
      v?: boolean;
      time?: string;
      index?: string;
      completion_time_field?: string;
      level?: 'cluster' | 'indices' | 'shards';
      state?: string;
      active_only?: boolean;
      detailed?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
    }
  ): Promise<ESCatShardsRow[]> {
    let path = '/_cat/shards';
    if (index) path += `/${index}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    } else {
      path += '?format=json';
    }

    return this.executeRequest(path);
  }

  /**
   * Cat nodes
   */
  async catNodes(
    options?: {
      format?: string;
      h?: string[];
      full_id?: boolean;
      local?: boolean;
      master_timeout?: string;
      s?: string[];
      v?: boolean;
      timeout?: string;
    }
  ): Promise<ESCatNodesRow[]> {
    let path = '/_cat/nodes';
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    } else {
      path += '?format=json';
    }

    return this.executeRequest(path);
  }

  /**
   * Cat aliases
   */
  async catAliases(
    name?: string,
    options?: {
      format?: string;
      h?: string[];
      local?: boolean;
      master_timeout?: string;
      s?: string[];
      v?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
      time?: string;
    }
  ): Promise<Array<{
    alias: string;
    index: string;
    filter: string;
    routing: string;
    is_write_index: string;
    hidden: string;
    index_routing: string;
    search_routing: string;
  }>> {
    let path = '/_cat/aliases';
    if (name) path += `/${name}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    } else {
      path += '?format=json';
    }

    return this.executeRequest(path);
  }

  /**
   * Cat templates
   */
  async catTemplates(
    name?: string,
    options?: {
      format?: string;
      h?: string[];
      local?: boolean;
      master_timeout?: string;
      s?: string[];
      v?: boolean;
      show_system_templates?: boolean;
    }
  ): Promise<Array<{
    name: string;
    index_patterns: string;
    order: number;
    version: string;
    composed_of: string;
    priority: string;
    template_type: string;
  }>> {
    let path = '/_cat/templates';
    if (name) path += `/${name}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    } else {
      path += '?format=json';
    }

    return this.executeRequest(path);
  }

  // ============================================================================
  // INDEX TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * Create or update index template
   */
  async putIndexTemplate(
    name: string,
    template: {
      index_patterns: string[];
      template: {
        settings?: Record<string, any>;
        mappings?: Record<string, any>;
        aliases?: Record<string, any>;
      };
      priority?: number;
      version?: number;
      _meta?: Record<string, any>;
      composed_of?: string[];
      data_stream?: object;
      deprecated?: boolean;
      allow_auto_create?: boolean;
    }
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_index_template/${name}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    });
  }

  /**
   * Get index template
   */
  async getIndexTemplate(name?: string): Promise<{
    index_templates: ESIndexTemplateListItem[];
  }> {
    const path = name ? `/_index_template/${name}` : '/_index_template';
    return this.executeRequest(path);
  }

  /**
   * Delete index template
   */
  async deleteIndexTemplate(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_index_template/${name}`, { method: 'DELETE' });
  }

  /**
   * Create component template
   */
  async putComponentTemplate(
    name: string,
    template: {
      template: {
        settings?: Record<string, any>;
        mappings?: Record<string, any>;
        aliases?: Record<string, any>;
      };
      version?: number;
      _meta?: Record<string, any>;
      deprecated?: boolean;
    }
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_component_template/${name}`, {
      method: 'PUT',
      body: JSON.stringify(template)
    });
  }

  /**
   * Get component templates
   */
  async getComponentTemplate(name?: string): Promise<{
    component_templates: ESComponentTemplateListItem[];
  }> {
    const path = name ? `/_component_template/${name}` : '/_component_template';
    return this.executeRequest(path);
  }

  /**
   * Delete component template
   */
  async deleteComponentTemplate(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_component_template/${name}`, { method: 'DELETE' });
  }

  /**
   * Create legacy template
   */
  async putTemplate(
    name: string,
    patterns: string | string[],
    settings?: Record<string, any>,
    mappings?: Record<string, any>,
    order?: number,
    version?: number,
    aliases?: Record<string, any>
  ): Promise<{ acknowledged: boolean }> {
    const body: Record<string, any> = {
      patterns: Array.isArray(patterns) ? patterns : [patterns],
      order,
      version,
      aliases
    };
    if (settings) body.settings = settings;
    if (mappings) body.mappings = mappings;

    return this.executeRequest(`/_template/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  // ============================================================================
  // ALIAS MANAGEMENT
  // ============================================================================

  /**
   * Add/remove aliases
   */
  async updateAliases(actions: Array<{
    add?: { index: string; alias: string; filter?: ESQuery; routing?: string; is_write_index?: boolean };
    remove?: { index: string; alias: string };
  }>): Promise<{ acknowledged: boolean }> {
    return this.executeRequest('/_aliases', {
      method: 'POST',
      body: JSON.stringify({ actions })
    });
  }

  /**
   * Get aliases
   */
  async getAliases(alias?: string | string[], index?: string): Promise<Record<string, ESIndexAliasListItem[]>> {
    let path = '/_aliases';
    if (alias) {
      const aliasStr = Array.isArray(alias) ? alias.join(',') : alias;
      path = `/_alias/${aliasStr}`;
    }
    if (index) {
      path = `/${index}/_aliases`;
    }
    return this.executeRequest(path);
  }

  // ============================================================================
  // INGEST PIPELINE MANAGEMENT
  // ============================================================================

  /**
   * Create or update ingest pipeline
   */
  async putPipeline(
    id: string,
    pipeline: ESIngestPipeline
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_ingest/pipeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pipeline)
    });
  }

  /**
   * Get ingest pipeline
   */
  async getPipeline(id?: string): Promise<Record<string, ESIngestPipeline>> {
    const path = id ? `/_ingest/pipeline/${id}` : '/_ingest/pipeline';
    return this.executeRequest(path);
  }

  /**
   * Delete ingest pipeline
   */
  async deletePipeline(id: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_ingest/pipeline/${id}`, { method: 'DELETE' });
  }

  /**
   * Simulate ingest pipeline
   */
  async simulatePipeline(
    id: string,
    docs: Array<{ _index?: string; _id?: string; _source: Record<string, any> }>,
    verbose?: boolean
  ): Promise<{
    docs: Array<{
      doc?: { _index: string; _id: string; _version: number; _source: Record<string, any> };
      processor_results: Array<{
        tag: string;
        processor_type: string;
        status: boolean;
        doc?: { _index: string; _id: string; _version: number; _source: Record<string, any> };
        error?: string;
      }>;
    }>;
  }> {
    return this.executeRequest(`/_ingest/pipeline/${id}/_simulate`, {
      method: 'POST',
      body: JSON.stringify({ docs, verbose })
    });
  }

  /**
   * Process document through ingest pipeline without indexing
   */
  async processDocument(
    id: string,
    document: Record<string, any>,
    pipelineId?: string
  ): Promise<{
    docs: Array<{
      doc: { _index: string; _id: string; _version: number; _source: Record<string, any> };
      processor_results: Array<{
        tag: string;
        processor_type: string;
        status: boolean;
        doc?: { _index: string; _id: string; _version: number; _source: Record<string, any> };
        error?: string;
      }>;
    }>;
  }> {
    const body: Record<string, any> = { docs: [{ _source: document }] };
    if (pipelineId) body.pipeline_id = pipelineId;

    return this.executeRequest('/_ingest/pipeline/_simulate', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // ============================================================================
  // ILM POLICY MANAGEMENT
  // ============================================================================

  /**
   * Create or update ILM policy
   */
  async putLifecyclePolicy(
    name: string,
    policy: ESLifecyclePolicy
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_ilm/policy/${name}`, {
      method: 'PUT',
      body: JSON.stringify(policy)
    });
  }

  /**
   * Get ILM policy
   */
  async getLifecyclePolicy(name?: string): Promise<Record<string, ESLifecyclePolicy>> {
    const path = name ? `/_ilm/policy/${name}` : '/_ilm/policy';
    return this.executeRequest(path);
  }

  /**
   * Delete ILM policy
   */
  async deleteLifecyclePolicy(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_ilm/policy/${name}`, { method: 'DELETE' });
  }

  /**
   * Explain ILM status for indices
   */
  async explainLifecycle(index?: string): Promise<ESLifecycleExplain> {
    const path = index ? `/${index}/_ilm/explain` : '/_ilm/explain';
    return this.executeRequest(path);
  }

  /**
   * Move index to ILM step
   */
  async moveIndexToStep(
    index: string,
    step: { current_phase: string; current_action: string; current_step: string }
  ): Promise<{ acknowledged: boolean; moved_to_abandoned: boolean }> {
    return this.executeRequest(`/${index}/_ilm/move`, {
      method: 'POST',
      body: JSON.stringify(step)
    });
  }

  /**
   * Retry ILM for index
   */
  async retryLifecycle(index: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${index}/_ilm/retry`, { method: 'POST' });
  }

  /**
   * Remove index from ILM management
   */
  async removeFromLifecycle(index: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/${index}/_ilm/remove`, { method: 'POST' });
  }

  /**
   * Get ILM status
   */
  async getLifecycleStatus(): Promise<{
    operation_mode: string;
  }> {
    return this.executeRequest('/_ilm/status');
  }

  /**
   * Start ILM
   */
  async startLifecycle(): Promise<{ operation_mode: string }> {
    return this.executeRequest('/_ilm/start', { method: 'POST' });
  }

  /**
   * Stop ILM
   */
  async stopLifecycle(): Promise<{ operation_mode: string }> {
    return this.executeRequest('/_ilm/stop', { method: 'POST' });
  }

  // ============================================================================
  // SNAPSHOT/RESTORE OPERATIONS
  // ============================================================================

  /**
   * Register snapshot repository
   */
  async putRepository(
    name: string,
    repository: ESSnapshotRepository
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_snapshot/${name}`, {
      method: 'PUT',
      body: JSON.stringify(repository)
    });
  }

  /**
   * Get snapshot repository
   */
  async getRepository(name?: string): Promise<Record<string, ESSnapshotRepository & { type: string }>> {
    const path = name ? `/_snapshot/${name}` : '/_snapshot';
    return this.executeRequest(path);
  }

  /**
   * Verify snapshot repository
   */
  async verifyRepository(name: string): Promise<{
    nodes: Record<string, { name: string; repository: string }>;
  }> {
    return this.executeRequest(`/_snapshot/${name}/_verify`, { method: 'POST' });
  }

  /**
   * Cleanup snapshot repository
   */
  async cleanupRepository(name: string): Promise<{
    result: string;
    deleted_bytes: number;
    deleted_blobs: number;
  }> {
    return this.executeRequest(`/_snapshot/${name}/_cleanup`, { method: 'POST' });
  }

  /**
   * Delete snapshot repository
   */
  async deleteRepository(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_snapshot/${name}`, { method: 'DELETE' });
  }

  /**
   * Create snapshot
   */
  async createSnapshot(
    repository: string,
    snapshot: string,
    options?: {
      indices?: string | string[];
      ignore_unavailable?: boolean;
      include_global_state?: boolean;
      partial?: boolean;
      metadata?: Record<string, any>;
      feature_states?: string[];
      wait_for_completion?: boolean;
      master_timeout?: string;
      timeout?: string;
      feature_snapshot_name?: string;
    }
  ): Promise<ESSnapshotInfo | { accepted: boolean; snapshot: string }> {
    let path = `/_snapshot/${repository}/${snapshot}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, {
      method: 'PUT',
      body: JSON.stringify(options || {})
    });
  }

  /**
   * Get snapshot
   */
  async getSnapshot(
    repository: string,
    snapshot?: string | string[],
    options?: {
      ignore_unavailable?: boolean;
      master_timeout?: string;
      verbose?: boolean;
      index_details?: boolean;
      include_repository?: boolean;
      sort?: string;
      size?: string;
      order?: 'asc' | 'desc';
      from?: string;
      sls?: string;
      after?: string;
    }
  ): Promise<ESSnapshotInfo[] | ESSnapshotInfo> {
    const snapStr = Array.isArray(snapshot) ? snapshot.join(',') : snapshot || '_all';
    let path = `/_snapshot/${repository}/${snapStr}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(
    repository: string,
    snapshot: string
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_snapshot/${repository}/${snapshot}`, { method: 'DELETE' });
  }

  /**
   * Restore snapshot
   */
  async restoreSnapshot(
    repository: string,
    snapshot: string,
    config?: ESRestoreConfig
  ): Promise<{ accepted: boolean; snapshot: string }> {
    return this.executeRequest(`/_snapshot/${repository}/${snapshot}/_restore`, {
      method: 'POST',
      body: JSON.stringify(config || {})
    });
  }

  /**
   * Get snapshot status
   */
  async getSnapshotStatus(
    repository?: string,
    snapshot?: string | string[],
    options?: {
      ignore_unavailable?: boolean;
      master_timeout?: string;
    }
  ): Promise<Array<{
    snapshot: string;
    repository: string;
    state: SnapshotState;
    indices: Array<{
      shard: string;
      index: string;
      stage: string;
      stats: { start_time_in_millis: number; total_time_in_millis: number };
    }>;
  }>> {
    let path = '/_snapshot/_status';
    if (repository) path = `/_snapshot/${repository}/_status`;
    if (snapshot) {
      const snapStr = Array.isArray(snapshot) ? snapshot.join(',') : snapshot;
      path += `/${snapStr}`;
    }
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  /**
   * Get tasks
   */
  async getTasks(
    taskId?: string,
    options?: {
      detailed?: boolean;
      group_by?: 'parents' | 'nodes' | 'none';
      actions?: string | string[];
      nodes?: string | string[];
      wait_for_completion?: boolean;
      timeout?: string;
    }
  ): Promise<{
    nodes: Record<string, { name: string; transport_address: string; host: string; ip: string; roles: string[]; attributes: Record<string, string>; tasks: Record<string, ESTask> }>;
  }> {
    let path = '/_tasks';
    if (taskId) path += `/${taskId}`;
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path);
  }

  /**
   * Cancel tasks
   */
  async cancelTasks(
    taskIds?: string | string[],
    options?: {
      actions?: string | string[];
      nodes?: string | string[];
      parent_task_id?: string;
      group_by?: 'parents' | 'nodes' | 'none';
      wait_for_completion?: boolean;
      timeout?: string;
    }
  ): Promise<{
    node_failures: Array<{ node_id: string; reason: string }>;
    nodes: Record<string, { tasks: Record<string, { cancelled: boolean; reason?: string }>; node_id: string; name: string; transport_address: string; host: string; ip: string; roles: string[]; attributes: Record<string, string> }>;
  }> {
    let path = '/_tasks/_cancel';
    
    if (taskIds) {
      const idStr = Array.isArray(taskIds) ? taskIds.join(',') : taskIds;
      path = `/_tasks/${idStr}/_cancel`;
    }
    
    if (options) {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
      if (params.toString()) path += `?${params.toString()}`;
    }

    return this.executeRequest(path, { method: 'POST' });
  }

  // ============================================================================
  // DATA STREAMS
  // ============================================================================

  /**
   * Create data stream
   */
  async createDataStream(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_data_stream/${name}`, { method: 'PUT' });
  }

  /**
   * Get data streams
   */
  async getDataStreams(name?: string | string[]): Promise<{ data_streams: ESDataStream[] }> {
    const nameStr = Array.isArray(name) ? name.join(',') : name || '*';
    return this.executeRequest(`/_data_stream/${nameStr}`);
  }

  /**
   * Delete data stream
   */
  async deleteDataStream(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_data_stream/${name}`, { method: 'DELETE' });
  }

  /**
   * Promote data stream
   */
  async promoteDataStream(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_data_stream/${name}/_promote`, { method: 'POST' });
  }

  /**
   * Modify data stream's backing indices cross-cluster replication
   */
  async modifyDataStreamCrossClusterReplication(
    name: string,
    actions: Array<{ add_from?: string; remove_from?: string }>
  ): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_data_stream/${name}/_modify_ccr`, {
      method: 'POST',
      body: JSON.stringify({ actions })
    });
  }

  /**
   * Reset data stream's job history
   */
  async resetDataStreamJobHistory(name: string): Promise<{ acknowledged: boolean }> {
    return this.executeRequest(`/_data_stream/${name}/_reset_job_history`, { method: 'POST' });
  }

  // ============================================================================
  // DML (DATA MANIPULATION LANGUAGE) - SQL
  // ============================================================================

  /**
   * SQL query
   */
  async sqlQuery(
    query: string,
    options?: {
      format?: string;
      cursor?: string;
      fetch_size?: number;
      filter?: Record<string, any>;
      time_zone?: string;
      field_multi_value_leniency?: boolean;
      index_using_fallback?: boolean;
      keep_on_completion?: boolean;
      wait_for_completion_timeout?: string;
      request_timeout?: string;
    }
  ): Promise<ESSQLResult> {
    const body: Record<string, any> = { query };
    if (options) Object.assign(body, options);
    
    return this.executeRequest('/_sql', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * SQL translate
   */
  async sqlTranslate(
    query: string,
    options?: {
      fetch_size?: number;
      filter?: Record<string, any>;
      time_zone?: string;
    }
  ): Promise<{ size: number; _source: Partial<ESSearchRequest>; track_total_hits: number | boolean; timeout: number }> {
    const body: Record<string, any> = { query };
    if (options) Object.assign(body, options);
    
    return this.executeRequest('/_sql/translate', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * EQL search
   */
  async eqlSearch(
    index: string | string[],
    query: string,
    options?: {
      tiebreaker_field?: string;
      timestamp_field?: string;
      event_category_field?: string;
      size?: number;
      filter?: ESQuery;
      fetch_size?: number;
      keep_on_completion?: boolean;
      wait_for_completion_timeout?: string;
      request_timeout?: string;
    }
  ): Promise<ESEQLResult> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    const body: Record<string, any> = { query };
    if (options) Object.assign(body, options);
    
    return this.executeRequest(`/${indexStr}/_eql/search`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // ============================================================================
  // SECURITY APIS
  // ============================================================================

  /**
   * Authenticate user
   */
  async authenticate(): Promise<{
    username: string;
    roles: string[];
    full_name: string;
    email: string;
    metadata: Record<string, any>;
    enabled: boolean;
    authentication_realm: { name: string; type: string };
    lookup_realm: { name: string; type: string };
    api_key?: boolean;
    token?: { name: string; type: string };
  }> {
    return this.executeRequest('/_security/_authenticate');
  }

  /**
   * Has privileges check
   */
  async hasPrivileges(
    privileges: {
      cluster?: Array<{ privilege: string; index?: string[] }>;
      indices?: Array<{ names: string[]; privileges: string[]; query?: ESQuery }>;
    }
  ): Promise<{
    username: string;
    has_all_requested: boolean;
    cluster: Record<string, { has: boolean }>;
    index: Record<string, Record<string, { has: boolean }>>;
  }> {
    return this.executeRequest('/_security/user/_has_privileges', {
      method: 'POST',
      body: JSON.stringify(privileges)
    });
  }

  // ============================================================================
  // MACHINE LEARNING APIS
  // ============================================================================

  /**
   * Get ML jobs
   */
  async getMLJobs(jobId?: string): Promise<{ count: number; jobs: ESMLJob[] }> {
    const path = jobId ? `/_ml/anomaly_detectors/${jobId}` : '/_ml/anomaly_detectors';
    return this.executeRequest(path);
  }

  /**
   * Get ML datafeeds
   */
  async getDatafeeds(datafeedId?: string): Promise<{ count: number; datafeeds: any[] }> {
    const path = datafeedId ? `/_ml/datafeeds/${datafeedId}` : '/_ml/datafeeds';
    return this.executeRequest(path);
  }

  // ============================================================================
  // GRAPH EXPLORE API
  // ============================================================================

  /**
   * Graph explore
   */
  async graphExplore(
    index: string | string[],
    options: {
      vertices: Array<{ field: string; include?: string[]; exclude?: string[]; min_doc_count?: number; size?: number; sampling?: { shard_size?: number } }>;
      connections: Array<{ vertices?: Array<{ field: string; include?: string[]; exclude?: string[]; min_doc_count?: number; size?: number }>; min_doc_count?: number; sampling?: { shard_size?: number } }>;
      controls?: { use_significance?: boolean; sample_size?: number; sample_diversity?: { field: string; max_docs_per_value?: number } };
      params?: Record<string, any>;
      timeout?: string;
      ignore_unavailable?: boolean;
      allow_no_indices?: boolean;
      expand_wildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
      index_filter?: ESQuery;
    }
  ): Promise<ESGraphExplore> {
    const indexStr = Array.isArray(index) ? index.join(',') : index;
    return this.executeRequest(`/${indexStr}/_graph/explore`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  // ============================================================================
  // LOG-SPECIFIC HELPERS
  // ============================================================================

  /**
   * Ingest log documents with automatic timestamp and ECS compliance
   */
  async ingestLogs(
    indexPattern: string,
    logs: Array<Partial<ESLogDocument['_source']>>,
    options?: {
      pipeline?: string;
      refresh?: 'true' | 'false' | 'wait_for';
      batchSize?: number;
    }
  ): Promise<ESBulkResponse> {
    const now = new Date().toISOString();
    const processedLogs = logs.map(log => ({
      '@timestamp': log['@timestamp'] || now,
      ...log
    }));

    return this.bulkIndex(indexPattern, processedLogs, options);
  }

  /**
   * Search logs with common filters
   */
  async searchLogs(
    indexPattern: string,
    filters?: {
      query_string?: string;
      query?: ESQuery;
      timeRange?: { gte?: string; lte?: string };
      severity?: LogSeverity[];
      sources?: LogSource[];
      hosts?: string[];
      eventCategories?: string[];
      tags?: string[];
      messageContains?: string;
      srcIps?: string[];
      destIps?: string[];
    },
    pagination?: {
      from?: number;
      size?: number;
      sortBy?: string;
      sortOrder?: SortOrder;
    },
    aggregations?: ESAggregation
  ): Promise<ESSearchResponse<ESLogDocument>> {
    const mustQueries: ESQuery[] = [];
    const filterQueries: ESQuery[] = [];

    // Time range filter
    if (filters?.timeRange) {
      filterQueries.push({
        range: {
          '@timestamp': filters.timeRange
        }
      });
    }

    // Severity filter
    if (filters?.severity?.length) {
      filterQueries.push({
        terms: {
          'event.severity': filters.severity
        }
      });
    }

    // Source filter
    if (filters?.sources?.length) {
      filterQueries.push({
        terms: {
          'event.module': filters.sources
        }
      });
    }

    // Host filter
    if (filters?.hosts?.length) {
      filterQueries.push({
        terms: {
          'host.name': filters.hosts
        }
      });
    }

    // Event category filter
    if (filters?.eventCategories?.length) {
      filterQueries.push({
        terms: {
          'event.category': filters.eventCategories
        }
      });
    }

    // Tags filter
    if (filters?.tags?.length) {
      filterQueries.push({
        terms: {
          tags: filters.tags
        }
      });
    }

    // Message contains
    if (filters?.messageContains) {
      mustQueries.push({
        match: {
          message: {
            query: filters.messageContains,
            operator: 'and'
          }
        }
      });
    }

    // Source IPs
    if (filters?.srcIps?.length) {
      filterQueries.push({
        terms: {
          'source.ip': filters.srcIps
        }
      });
    }

    // Destination IPs
    if (filters?.destIps?.length) {
      filterQueries.push({
        terms: {
          'destination.ip': filters.destIps
        }
      });
    }

    // Build final query
    const boolQuery: ESBoolQuery = {};
    if (mustQueries.length > 0) boolQuery.must = mustQueries;
    if (filterQueries.length > 0) boolQuery.filter = filterQueries;

    const query: ESQuery = filters?.query || filters?.query_string
      ? { bool: { must: [filters.query || { query_string: { query: filters.query_string! } }, ...boolQuery ] } }
      : Object.keys(boolQuery).length > 0 ? { bool: boolQuery } : { match_all: {} };

    // Build search request
    const searchRequest: Partial<ESSearchRequest> = {
      query,
      from: pagination?.from || 0,
      size: pagination?.size || 20,
      sort: [{
        '@timestamp': { order: pagination?.sortOrder || SortOrder.DESC }
      }],
      highlight: {
        fields: {
          message: { fragment_size: 150, number_of_fragments: 3 },
          'event.original': { fragment_size: 150, number_of_fragments: 3 }
        }
      }
    };

    if (aggregations) {
      searchRequest.aggs = aggregations;
    }

    return this.search<ESLogDocument>(indexPattern, searchRequest);
  }

  /**
   * Get log analytics/aggregations
   */
  async getLogAnalytics(
    indexPattern: string,
    timeRange: { gte: string; lte: string },
    interval: string = '1h'
  ): Promise<{
    timeline: Array<{ key_as_string: string; key: number; doc_count: number }>;
    by_severity: Array<{ key: string; doc_count: number }>;
    by_source: Array<{ key: string; doc_count: number }>;
    by_host: Array<{ key: string; doc_count: number }>;
    top_src_ips: Array<{ key: string; doc_count: number }>;
    top_dest_ips: Array<{ key: string; doc_count: number }>;
    unique_ips: number;
    unique_hosts: number;
    total_logs: number;
  }> {
    const searchRequest: Partial<ESSearchRequest> = {
      size: 0,
      query: {
        range: { '@timestamp': timeRange }
      },
      aggs: {
        timeline: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: interval,
            min_doc_count: 1
          }
        },
        by_severity: {
          terms: { field: 'event.severity', size: 10 }
        },
        by_source: {
          terms: { field: 'event.module', size: 20 }
        },
        by_host: {
          terms: { field: 'host.name', size: 20 }
        },
        top_src_ips: {
          terms: { field: 'source.ip', size: 10 }
        },
        top_dest_ips: {
          terms: { field: 'destination.ip', size: 10 }
        },
        unique_ips: {
          cardinality: { field: 'source.ip' }
        },
        unique_hosts: {
          cardinality: { field: 'host.name' }
        }
      }
    };

    const result = await this.search(indexPattern, searchRequest);
    const aggs = result.aggregations || {};

    return {
      timeline: aggs.timeline?.buckets || [],
      by_severity: aggs.by_severity?.buckets || [],
      by_source: aggs.by_source?.buckets || [],
      by_host: aggs.by_host?.buckets || [],
      top_src_ips: aggs.top_src_ips?.buckets || [],
      top_dest_ips: aggs.top_dest_ips?.buckets || [],
      unique_ips: aggs.unique_ips?.value || 0,
      unique_hosts: aggs.unique_hosts?.value || 0,
      total_logs: result.hits.total.value
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Escape special characters in Lucene query string
   */
  static escapeQueryString(query: string): string {
    const specialChars = ['\\', '+', '-', '=', '&&', '||', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '/', ' '];
    let escaped = query;
    specialChars.forEach(char => {
      escaped = escaped.replace(new RegExp('\\' + char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '\\' + char);
    });
    return escaped;
  }

  /**
   * Parse index pattern to extract date math
   */
  static parseIndexPattern(pattern: string): {
    base: string;
    dateMath?: string;
    isDateMath: boolean;
  } {
    const match = pattern.match(/^(.+?)(<[>\dwmMyy]+>)$/);
    if (match) {
      return {
        base: match[1],
        dateMath: match[2],
        isDateMath: true
      };
    }
    return { base: pattern, isDateMath: false };
  }

  /**
   * Format bytes to human readable string
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Global client instance */
let clientInstance: ElasticsearchClientClass | null = null;

/**
 * Initialize the Elasticsearch client singleton
 * @param config Client configuration
 * @returns Initialized client instance
 */
export async function initializeESClient(config: ESClientConfig): Promise<ElasticsearchClientClass> {
  clientInstance = await ElasticsearchClientClass.create(config);
  return clientInstance;
}

/**
 * Get the initialized Elasticsearch client instance
 * @throws Error if client not initialized
 */
export function getESClient(): ElasticsearchClientClass {
  if (!clientInstance) {
    throw new ElasticsearchError(
      'Elasticsearch client not initialized. Call initializeESClient() first.',
      'CLIENT_NOT_INITIALIZED'
    );
  }
  return clientInstance;
}

/**
 * Check if client is initialized
 */
export function isESClientInitialized(): boolean {
  return clientInstance !== null;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetESClient(): void {
  clientInstance = null;
}

// Export types for convenience
export {
  ElasticsearchClientClass as ElasticsearchClient,
  DEFAULT_INDEX_PATTERNS,
  DEFAULT_ILM_POLICIES
};
