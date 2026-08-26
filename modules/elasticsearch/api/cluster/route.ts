/**
 * Elasticsearch Cluster API Routes
 * National SOC Platform - Algeria 2026-2030
 * 
 * Endpoints:
 * GET /api/es/cluster/health - Cluster health status
 * GET /api/es/cluster/nodes - Node information
 * GET /api/es/cluster/stats - Cluster statistics
 * GET /api/es/cluster/indices - Index list with sizes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ESClusterHealth,
  ESClusterStats,
  ESNodeInfo,
  ESNodeStats,
  ESIndexInfo,
  ESIndexSummary,
  ClusterHealthStatus,
  NodeRole,
  DEFAULT_INDEX_PATTERNS,
  ESApiResponse
} from '../../types/elasticsearch.types';

// ============================================================================
// MOCK DATA FOR DEVELOPMENT
// ============================================================================

const mockClusterHealth: ESClusterHealth = {
  cluster_name: 'soc-algeria-production',
  status: ClusterHealthStatus.GREEN,
  timed_out: false,
  number_of_nodes: 5,
  number_of_data_nodes: 3,
  active_primary_shards: 45,
  active_shards: 90,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
  delayed_unassigned_shards: 0,
  number_of_pending_tasks: 0,
  number_of_in_flight_fetch: 0,
  task_max_waiting_in_queue_millis: 0,
  active_shards_percent_as_number: 100.0
};

const mockClusterStats: ESClusterStats = {
  _nodes: { total: 5, successful: 5, failed: 0 },
  cluster_name: 'soc-algeria-production',
  cluster_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  timestamp: Date.now(),
  status: ClusterHealthStatus.GREEN,
  indices: {
    count: 156,
    shards: { total: 90, primaries: 45, replication: 1 },
    docs: { count: 89234567, deleted: 345678 },
    store: { size_in_bytes: 463856468480, size: '432 GB' },
    fielddata: { memory_size_in_bytes: '2.3 GB', evictions: 1234 },
    indexing: {
      index_total: 234567890,
      index_time: '12h 34m',
      index_current: 15,
      index_failed: 2345,
      throttle_time: '23s'
    },
    merges: {
      current: 3,
      current_docs: 15000,
      current_size_in_bytes: '50mb',
      total: 5678,
      total_time: '8h 45m',
      total_docs: 567890000,
      total_size_in_bytes: '15gb',
      failed: 0
    },
    refresh: {
      total: 34567890,
      total_time_in_millis: 12345678,
      external_total: 1234567,
      external_total_time: '45m 23s',
      listeners: 0
    },
    flush: {
      total: 56789,
      periodic: 56700,
      total_time: '2h 15m'
    },
    get: {
      total: 987654321,
      time: '15h 30m',
      exists_total: 876543210,
      exists_time: '14h 20m',
      missing_total: 111111111,
      missing_time: '1h 10m',
      current: 0
    },
    search: {
      open_contexts: 25,
      query_total: 2345678901,
      query_time: '25h 40m',
      query_current: 18,
      fetch_total: 2234567890,
      fetch_time: '22h 15m',
      scroll_total: 12345,
      scroll_time: '1h 30m',
      point_in_time_total: 5678,
      point_in_time_time: '15m 45s'
    },
    segments: {
      count: 450,
      memory_in_bytes: '2.5gb',
      terms_memory_in_bytes: '1.2gb',
      stored_fields_memory_in_bytes: '400mb',
      term_vectors_memory_in_bytes: '100mb',
      norms_memory_in_bytes: '80mb',
      points_memory_in_bytes: '200mb',
      doc_values_memory_in_bytes: '1.5gb',
      index_writer_memory_in_bytes: '300mb',
      index_writer_max_memory_in_bytes: '512mb',
      version_map_memory_in_bytes: '150mb',
      fixed_bit_set_memory_in_bytes: '50mb',
      writable_index_writer_buffer_bytes: 50000000,
      max_unsafe_auto_id_timestamp: 1758768623456
    },
    completion: { size_in_bytes: '0b' },
    translog: {
      operations: 123456,
      size_in_bytes: '2.3gb',
      uncommitted_operations: 2345,
      uncommitted_size_in_bytes: '50mb',
      earliest_last_modified_age: 345
    },
    request_cache: {
      memory_size_in_bytes: '500mb',
      evictions: 56789,
      hit_count: 567890123,
      miss_count: 123456789
    },
    recovery: {
      current_as_source: 0,
      current_as_target: 0
    }
  },
  nodes: {
    count: {
      total: 5,
      coordinated_only: 0,
      data: 3,
      data_cold: 0,
      data_content: 0,
      data_frozen: 0,
      data_hot: 3,
      data_warm: 0,
      ingest: 2,
      master: 3,
      ml: 1,
      remote_cluster_client: 0,
      transform: 0
    },
    versions: ['8.11.0'],
    os: {
      available_processors: 64,
      allocated_processors: 64,
      names: [{ name: 'Linux', count: 5 }],
      pretty_names: [{ pretty_name: 'Ubuntu 22.04 LTS', count: 5 }],
      mem: {
        total_in_bytes: 274877906944, // 256GB
        free_in_bytes: 687194767336, // ~64GB free
        free_percent: 25,
        used_in_bytes: 206158430208, // ~192GB used
        used_percent: 75
      }
    },
    process: {
      cpu: { percent: 35 },
      open_file_descriptors: { min: 1024, max: 8192, avg: 4096 }
    },
    jvm: {
      versions: [{
        version: '21.0.1',
        vm_name: 'OpenJDK 64-Bit Server VM',
        vm_vendor: 'Eclipse Adoptium',
        bundled_jdk: true,
        using_bundled_jdk: true,
        count: 5
      }],
      mem: {
        heap_used_in_bytes: 107374182400, // 100GB used
        heap_max_in_bytes: 137438953472, // 128GB max
        heaps: [
          { used_in_bytes: 21474836480, max_in_bytes: 32212254720 }, // Node 1: 20G/30G
          { used_in_bytes: 21474836480, max_in_bytes: 32212254720 }, // Node 2: 20G/30G
          { used_in_bytes: 21474836480, max_in_bytes: 32212254720 }, // Node 3: 20G/30G
          { used_in_bytes: 21474836480, max_in_bytes: 21474836480 }, // Node 4: 20G/20G
          { used_in_bytes: 21474836480, max_in_bytes: 19293798144 }  // Node 5: 20G/18G
        ],
        non_heap_used_in_bytes: 5368709120,
        non_heap_max_in_bytes: 8589934592,
        direct_pool_max_in_bytes: 0,
        direct_pool_used_in_bytes: 0
      },
      threads: 850
    }
  }
};

const mockNodes: Record<string, ESNodeInfo> = {
  'node-master-01': {
    name: 'es-master-01.soc.dz',
    transport_address: '192.168.10.11:9300',
    host: '192.168.10.11',
    ip: '192.168.10.11',
    version: '8.11.0',
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'a123456b789c012def345ab678c901de23f456ab',
    build_date: '2026-06-15T12:00:00Z',
    build_snapshot: false,
    lucene_version: '9.11.0',
    minimum_wire_compatibility_version: '8.10.0',
    minimum_index_compatibility_version: '8.10.0',
    roles: [NodeRole.MASTER, NodeRole.DATA_HOT],
    attributes: {
      'data': 'hot',
      'zone': 'zone-a',
      'rack': 'rack-1'
    },
    jvm: {
      pid: 1,
      version: '21.0.1',
      vm_name: 'OpenJDK 64-Bit Server VM',
      vm_version: '21.0.1+12-LTS',
      vm_vendor: 'Eclipse Adoptium',
      start_time: Date.now() - 86400000 * 7,
      boot_classpath: [],
      classpath: [],
      gc_collectors: ['G1 Young Collection', 'G1 Old Generation'],
      memory_pools: [
        'CodeHeap 'non-nmethods'',
        'Metaspace',
        'CodeHeap 'profiled nmethods'',
        'Compressed Class Space',
        'G1 Eden Space',
        'G1 Survivor Space',
        'G1 Old Gen'
      ],
      mem: {
        heap_init_in_bytes: 26843545600,
        heap_max_in_bytes: 32212254720,
        non_heap_init_in_bytes: 7666535936,
        non_heap_max_in_bytes: 8589934592,
        direct_max_in_bytes: 0
      }
    },
    os: {
      refresh_interval_in_millis: 1000,
      name: 'Linux',
      pretty_name: 'Ubuntu 22.04 LTS',
      arch: 'amd64',
      version: '5.15.0-120-generic',
      available_processors: 16,
      allocated_processors: 16,
      cpu: {
        vendor: 'Intel',
        model: 'Xeon E5-2680 v4',
        frequency_mhz: 2400,
        cache_size_in_bytes: 35840000,
        total_cores: 16,
        total_sockets: 2,
        cores_per_socket: 8,
        threads_per_core: 1
      },
      mem: {
        total_in_bytes: 6871947673664, // 64GB
        free_in_bytes: 17179869184,     // ~16GB free
        free_percent: 25,
        used_in_bytes: 51539607552,     // ~48GB used
        used_percent: 75
      },
      swap: {
        total_in_bytes: 17179869184,   // 16GB swap
        free_in_bytes: 13743895347,    // ~13GB free
        used_in_bytes: 3435973837      // ~3GB used
      }
    },
    process: {
      refresh_interval_in_millis: 1000,
      id: 1,
      mlockall: false,
      cwd: '/usr/share/elasticsearch',
      file_descriptor: {
        permitted: 65536,
        soft_limit: 4096,
        hard_limit: 8192
      },
      cpu: {
        percent: 25,
        total_in_millis: 172800000,
        time_in_millis: 43200000
      },
      mem: {
        total_virtual_in_bytes: 37580963840
      }
    }
  },
  'node-data-01': {
    name: 'es-data-01.soc.dz',
    transport_address: '192.168.10.21:9300',
    host: '192.168.10.21',
    ip: '192.168.10.21',
    version: '8.11.0',
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'a123456b789c012def345ab678c901de23f456ab',
    build_date: '2026-06-15T12:00:00Z',
    build_snapshot: false,
    lucene_version: '9.11.0',
    minimum_wire_compatibility_version: '8.10.0',
    minimum_index_compatibility_version: '8.10.0',
    roles: [NodeRole.DATA_HOT, NodeRole.INGEST],
    attributes: {
      'data': 'hot',
      'zone': 'zone-a',
      'rack': 'rack-2'
    }
  },
  'node-data-02': {
    name: 'es-data-02.soc.dz',
    transport_address: '192.168.10.22:9300',
    host: '192.168.10.22',
    ip: '192.168.10.22',
    version: '8.11.0',
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'a123456b789c012def345ab678c901de23f456ab',
    build_date: '2026-06-15T12:00:00Z',
    build_snapshot: false,
    lucene_version: '9.11.0',
    minimum_wire_compatibility_version: '8.10.0',
    minimum_index_compatibility_version: '8.10.0',
    roles: [NodeRole.DATA_HOT, NodeRole.INGEST],
    attributes: {
      'data': 'hot',
      'zone': 'zone-b',
      'rack': 'rack-1'
    }
  },
  'node-coord-01': {
    name: 'es-coord-01.soc.dz',
    transport_address: '192.168.10.31:9300',
    host: '192.168.10.31',
    ip: '192.168.10.31',
    version: '8.11.0',
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'a123456b789c012def345ab678c901de23f456ab',
    build_date: '2026-06-15T12:00:00Z',
    build_snapshot: false,
    lucene_version: '9.11.0',
    minimum_wire_compatibility_version: '8.10.0',
    minimum_index_compatibility_version: '8.10.0',
    roles: [NodeRole.COORDINATING_ONLY, NodeRole.ML],
    attributes: {}
  }
};

const mockNodeStats: Record<string, ESNodeStats> = {
  'node-master-01': {
    timestamp: Date.now(),
    name: 'es-master-01.soc.dz',
    uuid: 'uuid-master-01',
    transport_address: '192.168.10.11:9300',
    host: '192.168.10.11',
    ip: '192.168.10.11',
    roles: [NodeRole.MASTER, NodeRole.DATA_HOT],
    indices: {
      docs: { count: 29744855, deleted: 115226 },
      store: { size_in_bytes: 154618849280 }, // ~144GB
      indexing: {
        index_total: 78152263,
        index_time: '4h 11m',
        index_current: 5,
        index_failed: 781,
        throttle_time: '8s'
      },
      merges: {
        current: 1,
        current_docs: 5000,
        current_size_in_bytes: '17mb',
        total: 1892,
        total_time: '2h 55m',
        total_docs: 189263333,
        total_size_in_bytes: '5gb',
        failed: 0
      },
      refresh: {
        total: 11522630,
        total_time_in_millis: 4115226,
        external_total: 411522,
        external_total_time: '15m 7s',
        listeners: 0
      },
      flush: {
        total: 18926,
        periodic: 18900,
        total_time: '45m 5s'
      },
      get: {
        total: 329218107,
        time: '5h 10m',
        exists_total: 291854320,
        exists_time: '4h 46m',
        missing_total: 37037787,
        missing_time: '23m 42s',
        current: 0
      },
      search: {
        open_contexts: 8,
        query_total: 781522633,
        query_time: '8h 33m',
        query_current: 6,
        fetch_total: 743346501,
        fetch_time: '7h 25m',
        scroll_total: 4115,
        scroll_time: '30m',
        point_in_time_total: 1892,
        point_in_time_time: '5m 15s'
      },
      segments: {
        count: 150,
        memory_in_bytes: '833mb',
        terms_memory_in_bytes: '400mb',
        stored_fields_memory_in_bytes: '133mb',
        term_vectors_memory_in_bytes: '33mb',
        norms_memory_in_bytes: '27mb',
        points_memory_in_bytes: '67mb',
        doc_values_memory_in_bytes: '500mb',
        index_writer_memory_in_bytes: '100mb',
        index_writer_max_memory_in_bytes: '170mb',
        version_map_memory_in_bytes: '50mb',
        fixed_bit_set_memory_in_bytes: '17mb',
        writable_index_writer_buffer_bytes: 16666666,
        max_unsafe_auto_id_timestamp: 1758768623456
      },
      translog: {
        operations: 41152,
        size_in_bytes: '767mb',
        uncommitted_operations: 781,
        uncommitted_size_in_bytes: '17mb',
        earliest_last_modified_age: 115
      },
      request_cache: {
        memory_size_in_bytes: '167mb',
        evictions: 18926,
        hit_count: 189263041,
        miss_count: 41152262
      },
      recovery: {
        current_as_source: 0,
        current_as_target: 0
      }
    },
    os: {
      cpu: {
        percent: 28,
        load_average: { '1m': 4.5, '5m': 4.2, '15m': 3.8 }
      },
      mem: {
        total_in_bytes: 6871947673664,
        free_in_bytes: 17179869184,
        free_percent: 25,
        used_in_bytes: 51539607552,
        used_percent: 75
      },
      swap: {
        total_in_bytes: 17179869184,
        free_in_bytes: 13743895347,
        used_in_bytes: 3435973837
      }
    },
    jvm: {
      mem: {
        heap_used_in_bytes: 21474836480,
        heap_used_percent: 66,
        heap_max_in_bytes: 32212254720,
        pools: {
          young: { used_in_bytes: 5368709120, max_in_bytes: 8589934592 },
          survivor: { used_in_bytes: 1342177280, max_in_bytes: 1073741824 },
          old: { used_in_bytes: 14763950080, max_in_bytes: 22548578304 }
        }
      },
      threads: 175,
      gc: {
        collectors: {
          old: { collection_count: 1892, collection_time_in_millis: 2345678 },
          young: { collection_count: 189260, collection_time_in_millis: 5678901 }
        }
      },
      uptime_in_millis: 604800000, // 7 days
    },
    process: {
      cpu: { percent: 22, total_in_millis: 14400000 },
      open_file_descriptors: 3500,
      mem: { total_virtual_in_bytes: 18790481920 } // ~17.5GB
    },
    fs: {
      total: { total_in_bytes: 2000000000000, free_in_bytes: 800000000000, available_in_bytes: 750000000000 }, // 2TB disk, 750GB free
      data: ['/usr/share/elasticsearch/data'],
      io_stats: {
        devices: [{
          device_name: 'nvme0n1',
          operations: 1234567,
          read_operations: 567890,
          write_operations: 666677,
          read_kilobytes: 56789012,
          write_kilobytes: 67890123,
          read_size_in_bytes: 56789012000,
          write_size_in_bytes: 67890123000
        }]
      },
      io_stats_device: {
        operations: 1234567,
        read_operations: 567890,
        write_operations: 666677,
        read_kilobytes: 56789012,
        write_kilobytes: 67890123,
        read_size_in_bytes: 56789012000,
        write_size_in_bytes: 67890123000
      }
    },
    script: {
      compilations: 1234,
      cache_evictions: 56,
      contexts: 12
    },
    ingestion: {
      pipelines: {
        'wazuh-pipeline': {
          processors: [
            { type: 'grok', stats: { failed: 0, skipped: 5, executed: 123456, time_in_nanos: 56789012345 } },
            { type: 'geoip', stats: { failed: 0, skipped: 10, executed: 123446, time_in_nanos: 23456789012 } },
            { type: 'date', stats: { failed: 0, skipped: 0, executed: 123456, time_in_nanos: 1234567890 } },
            { type: 'user_agent', stats: { failed: 0, skipped: 50000, executed: 73456, time_in_nanos: 3456789012 } },
            { type: 'set', stats: { failed: 0, skipped: 0, executed: 123456, time_in_nanos: 567890123 } }
          ],
          stats: {
            failed: 0,
            processed: 123456,
            time_in_millis: 87654,
            ingested_pipeline_count: 123456,
            ingested_total: 123456,
            ingested_failed: 0
          }
        },
        'suricata-pipeline': {
          processors: [
            { type: 'json', stats: { failed: 2, skipped: 0, executed: 234567, time_in_nanos: 67890123456 } },
            { type: 'script', stats: { failed: 0, skipped: 100, executed: 234467, time_in_nanos: 45678901234 } }
          ],
          stats: {
            failed: 2,
            processed: 234567,
            time_in_millis: 98765,
            ingested_pipeline_count: 234567,
            ingested_total: 234567,
            ingested_failed: 2
          }
        }
      }
    }
  }
};

const mockIndices: ESIndexSummary[] = [
  {
    name: 'wazuh-alerts-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-wazuh-001',
    primary_shards: 3,
    replica_shards: 1,
    document_count: 154230,
    deleted_documents: 1245,
    size: '2.3GB',
    size_bytes: 2469606195,
    primary_size: '1.7GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:15:32Z',
    ilm_phase: 'hot',
    templates_applied: ['wazuh-template']
  },
  {
    name: 'suricata-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-suricata-001',
    primary_shards: 5,
    replica_shards: 1,
    document_count: 892450,
    deleted_documents: 5678,
    size: '8.7GB',
    size_bytes: 9338793984,
    primary_size: '6.5GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:12:18Z',
    ilm_phase: 'hot',
    templates_applied: ['suricata-template']
  },
  {
    name: 'firewall-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-fw-001',
    primary_shards: 3,
    replica_shards: 1,
    document_count: 2345678,
    deleted_documents: 9876,
    size: '12.5GB',
    size_bytes: 13421772800,
    primary_size: '9.2GB',
    creation_date: '2026-07-25T00:00:00Z',
    ilm_phase: 'hot',
    templates_applied: ['firewall-template']
  },
  {
    name: 'syslog-2026.07.25',
    health: 'yellow' as any,
    status: 'open',
    uuid: 'uuid-syslog-001',
    primary_shards: 2,
    replica_shards: 1,
    document_count: 567890,
    deleted_documents: 3456,
    size: '4.2GB',
    size_bytes: 4509715660,
    primary_size: '3.1GB',
    creation_date: '2026-07-25T00:00:00Z',
    ilm_phase: 'hot',
    templates_applied: ['syslog-template']
  },
  {
    name: '.ds-metrics-internals-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-metrics-001',
    primary_shards: 1,
    replica_shards: 1,
    document_count: 86400,
    deleted_documents: 0,
    size: '450MB',
    size_bytes: 471859200,
    primary_size: '225MB',
    creation_date: '2026-07-25T00:00:00Z',
    ilm_phase: 'hot',
    templates_applied: ['metrics-template']
  }
];

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/es/cluster/*
 * Cluster monitoring endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathname = request.nextUrl.pathname;

    // Route to appropriate handler based on path
    if (pathname.includes('/health')) {
      return handleGetHealth(searchParams);
    }

    if (pathname.includes('/nodes')) {
      return handleGetNodes(searchParams);
    }

    if (pathname.includes('/stats')) {
      return handleGetStats(searchParams);
    }

    if (pathname.includes('/indices')) {
      return handleGetIndices(searchParams);
    }

    // Default: return cluster overview
    return handleGetOverview();

  } catch (error) {
    console.error('[ES Cluster API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/es/cluster/*
 * Cluster management operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    const pathname = request.nextUrl.pathname;

    switch (action) {
      case 'reroute':
        return handleReroute(params.commands);

      case 'allocate-empty':
        return handleAllocateEmpty(params.index, params.node, params.acceptDataLoss);

      case 'cancel-task':
        return handleCancelTask(params.taskId);

      case 'clear-cache':
        return handleClearCache(params.indices);

      case 'refresh':
        return handleRefresh(params.indices);

      case 'flush':
        return handleFlush(params.indices);

      case 'force-merge':
        return handleForceMerge(params.indices, params.maxNumSegments);

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[ES Cluster API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// SUB-HANDLER FUNCTIONS
// ============================================================================

/**
 * Handle GET /api/es/cluster/health
 */
async function handleGetHealth(searchParams: URLSearchParams): Promise<NextResponse> {
  const index = searchParams.get('index');
  const level = searchParams.get('level') || 'cluster';
  const waitForStatus = searchParams.get('wait_for_status');
  const timeout = searchParams.get('timeout');

  // Simulate waiting for status if requested
  if (waitForStatus && waitForStatus !== mockClusterHealth.status) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  let healthData = { ...mockClusterHealth };

  // Add level-specific details
  if (level === 'indices') {
    healthData = {
      ...healthData,
      indices: Object.fromEntries(
        mockIndices.map(idx => [
          idx.name,
          {
            status: idx.health,
            number_of_shards: idx.primary_shards + idx.replica_shards,
            number_of_replicas: idx.replica_shards,
            active_primary_shards: idx.primary_shards,
            active_shards: idx.primary_shards + idx.replica_shards,
            initializing_shards: 0,
            unassigned_shards: 0,
            docs: { count: idx.document_count, deleted: idx.deleted_documents },
            store: { size_in_bytes: idx.size_bytes, size: idx.size }
          }
        ])
      )
    };
  }

  return NextResponse.json({
    success: true,
    data: healthData,
    meta: {
      execution_time_ms: 5,
      cached: false
    }
  });
}

/**
 * Handle GET /api/es/cluster/nodes
 */
async function handleGetNodes(searchParams: URLSearchParams): Promise<NextResponse> {
  const nodeId = searchParams.get('node_id');
  const metrics = searchParams.get('metrics');
  const detailed = searchParams.get('detailed') === 'true';

  let nodesData: Record<string, any>;

  if (nodeId) {
    // Return specific node
    const nodeInfo = mockNodes[nodeId];
    const nodeStats = mockNodeStats[nodeId];

    if (!nodeInfo) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Node '${nodeId}' not found`,
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    nodesData = {
      [nodeId]: detailed ? {
        ...nodeInfo,
        ...(nodeStats ? { stats: nodeStats } : {})
      } : nodeInfo
    };
  } else {
    // Return all nodes with optional stats
    nodesData = Object.fromEntries(
      Object.entries(mockNodes).map(([id, info]) => [
        id,
        detailed ? {
          ...info,
          ...(mockNodeStats[id] ? { stats: mockNodeStats[id] } : {})
        } : info
      ])
    );
  }

  // Calculate summary statistics
  const nodeArray = Object.values(nodesData);
  const summary = {
    total_nodes: nodeArray.length,
    master_nodes: nodeArray.filter((n: any) => n.roles?.includes('master')).length,
    data_nodes: nodeArray.filter((n: any) => n.roles?.includes('data')).length,
    ingest_nodes: nodeArray.filter((n: any) => n.roles?.includes('ingest')).length,
    coord_nodes: nodeArray.filter((n: any) => n.roles?.includes('coordinating_only')).length,
    average_cpu_usage: 32,
    average_heap_usage: 68,
    total_disk_space: { used: '1.2TB', total: '8TB', percent: 15 },
    uptime_distribution: nodeArray.map((n: any) => ({
      name: n.name,
      uptime_days: Math.floor(Math.random() * 365)
    }))
  };

  return NextResponse.json({
    success: true,
    data: {
      nodes: nodesData,
      summary
    },
    meta: {
      execution_time_ms: 15,
      cached: false
    }
  });
}

/**
 * Handle GET /api/es/cluster/stats
 */
async function handleGetStats(searchParams: URLSearchParams): Promise<NextResponse> {
  const nodeId = searchParams.get('node_id');
  
  // In a real implementation, this would filter by node if specified
  const stats = { ...mockClusterStats };

  // Add computed/derived metrics
  const derivedMetrics = {
    indexing_rate_per_second: Math.round(stats.indices.indexing.index_total / 86400),
    search_rate_per_second: Math.round(stats.indices.search.query_total / 86400),
    avg_document_size_bytes: Math.round(
      stats.indices.store.size_in_bytes / stats.indices.docs.count
    ),
    documents_per_gb: Math.round(
      stats.indices.docs.count / (stats.indices.store.size_in_bytes / 1073741824)
    ),
    shard_utilization: {
      primary: `${stats.indices.shards.primaries} / ${stats.indices.shards.primaries} (100%)`,
      replica: `${stats.indices.shards.total - stats.indices.shards.primaries} / ${stats.indices.shards.total - stats.indices.shards.primaries} (100%)`
    },
    memory_efficiency: {
      heap_usage_percent: Math.round(
        (stats.nodes.jvm.mem.heap_used_in_bytes / stats.nodes.jvm.mem.heap_max_in_bytes) * 100
      ),
      field_data_evictions_rate_per_hour: Math.round(
        stats.indices.fielddata.evictions / 24
      )
    },
    time_series: {
      last_24h: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        index_rate: Math.floor(Math.random() * 10000 + 5000),
        search_rate: Math.floor(Math.random() * 50000 + 25000),
        docs_count: stats.indices.docs.count + i * 1000
      })),
      last_7d: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
        total_docs: stats.indices.docs.count + i * 100000,
        storage_gb: Math.round((stats.indices.store.size_in_bytes / 1073741824) + i * 5)
      }))
    }
  };

  return NextResponse.json({
    success: true,
    data: {
      ...stats,
      derived_metrics: derivedMetrics
    },
    meta: {
      execution_time_ms: 25,
      cached: false
    }
  });
}

/**
 * Handle GET /api/es/cluster/indices
 */
async function handleGetIndices(searchParams: URLSearchParams): Promise<NextResponse> {
  const pattern = searchParams.get('pattern') || '*';
  const health = searchParams.get('health');
  const sortBy = searchParams.get('sort_by') || 'size';
  const sortOrder = searchParams.get('sort_order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '20');

  let filteredIndices = [...mockIndices];

  // Apply filters
  if (health) {
    filteredIndices = filteredIndices.filter(idx => idx.health === health);
  }

  // Sort
  filteredIndices.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'size':
        comparison = a.size_bytes - b.size_bytes;
        break;
      case 'docs':
        comparison = a.document_count - b.document_count;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'health':
        const healthOrder = { green: 0, yellow: 1, red: 2 };
        comparison = (healthOrder[a.health as keyof typeof healthOrder] || 3) - 
                   (healthOrder[b.health as keyof typeof healthOrder] || 3);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Paginate
  const total = filteredIndices.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedIndices = filteredIndices.slice(startIndex, startIndex + pageSize);

  // Calculate totals
  const totals = {
    total_indices: mockIndices.length,
    total_primary_shards: mockIndices.reduce((sum, idx) => sum + idx.primary_shards, 0),
    total_replica_shards: mockIndices.reduce((sum, idx) => sum + idx.replica_shards, 0),
    total_documents: mockIndices.reduce((sum, idx) => sum + idx.document_count, 0),
    total_size_bytes: mockIndices.reduce((sum, idx) => sum + idx.size_bytes, 0),
    total_deleted_docs: mockIndices.reduce((sum, idx) => sum + idx.deleted_documents, 0),
    health_distribution: {
      green: mockIndices.filter(i => i.health === 'green').length,
      yellow: mockIndices.filter(i => i.health === 'yellow').length,
      red: mockIndices.filter(i => i.health === 'red').length
    },
    ilm_distribution: {
      hot: mockIndices.filter(i => i.ilm_phase === 'hot').length,
      warm: mockIndices.filter(i => i.ilm_phase === 'warm').length,
      cold: mockIndices.filter(i => i.ilm_phase === 'cold').length,
      unmanaged: mockIndices.filter(i => !i.ilm_phase).length
    }
  };

  return NextResponse.json({
    success: true,
    data: {
      indices: paginatedIndices,
      totals,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    },
    meta: {
      execution_time_ms: 12,
      cached: false
    }
  });
}

/**
 * Handle cluster overview (default endpoint)
 */
async function handleGetOverview(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      health: mockClusterHealth,
      quick_stats: {
        total_indices: mockIndices.length,
        total_documents: mockClusterStats.indices.docs.count,
        total_storage: mockClusterStats.indices.store.size,
        nodes: {
          total: mockClusterHealth.number_of_nodes,
          data: mockClusterHealth.number_of_data_nodes,
          master_eligible: 3
        },
        recent_activity: {
          indexing_rate_last_1h: 125000,
          search_rate_last_1h: 890000,
          alerts_last_24h: 1523,
          critical_alerts_last_24h: 87
        },
        top_indices_by_size: mockIndices
          .sort((a, b) => b.size_bytes - a.size_bytes)
          .slice(0, 5)
          .map(idx => ({
            name: idx.name,
            size: idx.size,
            docs: idx.document_count,
            health: idx.health
          })),
        top_indices_by_alerts: mockIndices
          .filter(idx => idx.name.includes('alert') || idx.name.includes('suricata'))
          .sort((a, b) => b.document_count - a.document_count)
          .slice(0, 5)
          .map(idx => ({
            name: idx.name,
            alerts: idx.document_count,
            health: idx.health
          }))
      }
    },
    meta: {
      execution_time_ms: 18,
      cached: false
    }
  });
}

/**
 * Handle reroute operation
 */
async function handleReroute(commands: any[]): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      state: {},
      acknowledgments: commands.map((cmd, i) => ({
        command_index: i,
        acknowledged: true
      }))
    },
    meta: {
      execution_time_ms: 50,
      cached: false
    }
  });
}

/**
 * Handle allocate empty
 */
async function handleAllocateEmpty(index: string, node: string, acceptDataLoss: boolean): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      acknowledged: true,
      message: `Shard for index ${index} allocated to ${node}`,
      accept_data_loss: acceptDataLoss
    },
    meta: {
      execution_time_ms: 100,
      cached: false
    }
  });
}

/**
 * Handle cancel task
 */
async function handleCancelTask(taskId: string): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      node_failures: [],
      nodes: {
        'node-master-01': {
          tasks: {
            [taskId]: {
              cancelled: true,
              reason: 'Cancelled by user request'
            }
          },
          node_id: 'node-master-01',
          name: 'es-master-01.soc.dz',
          transport_address: '192.168.10.11:9300',
          host: '192.168.10.11',
          ip: '192.168.10.11',
          roles: ['master', 'data_hot'],
          attributes: {}
        }
      }
    },
    meta: {
      execution_time_ms: 25,
      cached: false
    }
  });
}

/**
 * Handle clear cache
 */
async function handleClearCache(indices?: string): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      _shards: {
        total: indices ? 10 : 90,
        successful: indices ? 10 : 90,
        failed: 0
      }
    },
    meta: {
      execution_time_ms: 30,
      cached: false
    }
  });
}

/**
 * Handle refresh
 */
async function handleRefresh(indices?: string): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      _shards: {
        total: indices ? 10 : 90,
        successful: indices ? 10 : 90,
        failed: 0
      }
    },
    meta: {
      execution_time_ms: 45,
      cached: false
    }
  });
}

/**
 * Handle flush
 */
async function handleFlush(indices?: string): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      _shards: {
        total: indices ? 10 : 90,
        successful: indices ? 10 : 90,
        failed: 0
      }
    },
    meta: {
      execution_time_ms: 60,
      cached: false
    }
  });
}

/**
 * Handle force merge
 */
async function handleForceMerge(indices?: string, maxNumSegments?: number): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      _shards: {
        total: indices ? 10 : 90,
        successful: indices ? 10 : 90,
        failed: 0
      }
    },
    meta: {
      execution_time_ms: 5000,
      cached: false,
      note: 'Force merge is an I/O intensive operation'
    }
  });
}
