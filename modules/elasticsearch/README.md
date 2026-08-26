# Elasticsearch Log Aggregation Pipeline Module

**Module 6 - National SOC Platform for Algeria (2026-2030)**

A comprehensive Elasticsearch integration module providing log aggregation, search, analytics, and cluster management capabilities for the National SOC Platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Index Patterns](#index-patterns)
- [ILM Policies](#ilm-policies)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

This module provides a complete Elasticsearch integration for the SOC platform, including:

- **Type-safe TypeScript definitions** covering all Elasticsearch APIs
- **Comprehensive client library** with retry logic and error handling
- **RESTful API routes** for logs, search, and cluster management
- **React hooks** for easy frontend integration
- **Full-featured dashboard component** with multiple views
- **Mock data support** for development and testing

## Architecture

```
modules/elasticsearch/
├── types/
│   └── elasticsearch.types.ts    # Complete TypeScript type definitions (~1800+ lines)
├── lib/
│   └── elasticsearch-client.ts     # Client library with all ES APIs (~1200+ lines)
├── api/
│   ├── logs/route.ts              # Logs CRUD & search endpoints
│   ├── search/route.ts            # Advanced search & saved searches
│   └── cluster/route.ts          # Cluster health & stats endpoints
├── hooks/
│   └── use-elasticsearch.ts       # React hooks for data fetching
├── components/
│   └── ESDashboard.tsx            # Main dashboard component
└── README.md                      # This documentation
```

### Data Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Data Sources   │────▶│  Elasticsearch   │◀────│   This Module   │
│                 │     │                  │     │                 │
│ • Wazuh SIEM    │     │  ┌────────────┐ │     │  ┌───────────┐  │
│ • Suricata IDS  │────▶│  │ Log Indices │ │     │  │ API Routes│  │
│ • MISP TI      │     │  ├────────────┤ │     │  ├───────────┤  │
│ • Syslog        │     │  │ Index Mgmt  │ │────▶│  │ Logs API  │  │
│ • Firewall      │     │  ├────────────┤ │     │  ├───────────┤  │
│ • Applications  │     │  │ Cluster     │ │     │  │ Search API│  │
└─────────────────┘     │  └────────────┘ │     │  ├───────────┤  │
                        │                  │     │  │Cluster API│  │
                        └──────────────────┘     │  └───────────┘  │
                                                  │  ┌───────────┐  │
                                                  │  │ React     │  │
                                                  │  │ Hooks     │  │
                                                  │  ├───────────┤  │
                                                  │  │Dashboard  │  │
                                                  │  └───────────┘  │
                                                  └─────────────────┘
```

## Features

### Type System
- ✅ Complete Elasticsearch Query DSL types
- ✅ ECS (Elastic Common Schema) compliant document types
- ✅ ILM policy and lifecycle types
- ✅ Snapshot/restore configuration types
- ✅ Dashboard and visualization config types
- ✅ All aggregation framework types

### Client Library
- ✅ Connection management with automatic node rotation
- ✅ Retry logic with exponential backoff
- ✅ Full CRUD operations for indices and documents
- ✅ Bulk operations with batching support
- ✅ Search API with query builder
- ✅ Aggregation framework support
- ✅ Cluster health monitoring
- ✅ ILM policy management
- ✅ Snapshot/restore operations
- ✅ SQL and EQL query support
- ✅ Security/audit trail APIs

### API Routes
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/es/logs` | GET/POST | Search, filter, and ingest logs |
| `/api/es/logs/aggregations` | GET | Get log analytics data |
| `/api/es/logs/bulk` | POST | Bulk ingest logs |
| `/api/es/logs/indices` | GET | List log indices |
| `/api/es/logs/stats` | GET | Index statistics |
| `/api/es/search` | POST | Execute search queries |
| `/api/es/search/saved` | GET/POST/DELETE | Manage saved searches |
| `/api/es/search/export` | GET/POST | Export search results |
| `/api/es/cluster/health` | GET | Cluster health status |
| `/api/es/cluster/nodes` | GET | Node information |
| `/api/es/cluster/stats` | GET | Cluster statistics |
| `/api/es/cluster/indices` | GET | Index list with sizes |

### React Hooks
| Hook | Description |
|------|-------------|
| `useLogs()` | Fetch and filter logs with pagination |
| `useRecentAlerts()` | Get recent high-priority alerts |
| `useHighSeverityAlerts()` | Critical/high severity only |
| `useLogsBySource()` | Filter by source (Wazuh, Suricata, etc.) |
| `useLogsByIP()` | Filter by IP address |
| `useClusterHealth()` | Monitor cluster status |
| `useClusterStats()` | Detailed cluster statistics |
| `useNodes()` | Node information list |
| `useSearchResults()` | Execute custom searches |
| `useSavedSearches()` | Manage saved searches |
| `useLogAggregations()` | Analytics/trends data |
| `useIndices()` | Index management data |
| `useESDashboard()` | Combined dashboard hook |

### Dashboard Component
The `ESDashboard` component provides five main views:

1. **Overview**: Cluster health, KPI cards, recent alerts, quick stats
2. **Logs Viewer**: Filterable table with detail panel, pagination
3. **Search**: Advanced query builder, saved searches, results view
4. **Indices**: Health status, size info, shard details, ILM phase
5. **Analytics**: Timeline charts, severity breakdown, top hosts/IPs

## Installation

### Prerequisites
- Next.js 16+ with App Router
- TypeScript 5+
- Elasticsearch 8.x (or compatible)

### Setup

1. **Copy module to your project:**
```bash
cp -r modules/elasticsearch /your-project/modules/elasticsearch
```

2. **Configure environment variables (optional):**
```env
ELASTICSEARCH_NODES=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

3. **Initialize client in your app:**
```typescript
// app/layout.tsx or similar
import { initializeESClient } from '@/modules/elasticsearch/lib/elasticsearch-client';

// Initialize on app startup
const esClient = await initializeESClient({
  nodes: [process.env.ELASTICSEARCH_NODES || 'http://localhost:9200'],
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  },
  maxRetries: 3,
  requestTimeout: 30000,
});
```

4. **Use the dashboard component:**
```tsx
import { ESDashboard } from '@/modules/elasticsearch/components/ESDashboard';

export default function Page() {
  return <ESDashboard defaultTab="overview" refreshInterval={15000} />;
}
```

## Configuration

### Client Configuration Options

```typescript
interface ESClientConfig {
  nodes: string[];              // Array of ES node URLs
  auth?: {
    username?: string;           // Basic auth
    password?: string;
    apiKeyId?: string;           // API key auth
    apiKey?: string;
    bearerToken?: string;         // Bearer token
  };
  connectionTimeout?: number;    // Default: 10000ms
  requestTimeout?: number;       // Default: 30000ms
  maxRetries?: number;            // Default: 3
  retryDelay?: number;            // Default: 500ms
  sslVerification?: boolean;      // Default: true
  compression?: boolean;         // Enable gzip
  maxContentLength?: number;     // Max request body size
  logging?: boolean;             // Request logging
}
```

### Example Configurations

#### Development Environment
```typescript
const devConfig = {
  nodes: ['http://localhost:9200'],
  logging: true,
  sslVerification: false
};
```

#### Production Cluster
```typescript
const prodConfig = {
  nodes: [
    'https://es-node1.soc.dz:9200',
    'https://es-node2.soc.dz:9200',
    'https://es-node3.soc.dz:9200'
  ],
  auth: {
    apiKeyId: process.env.ES_API_KEY_ID!,
    apiKey: process.env.ES_API_KEY!
  },
  connectionTimeout: 5000,
  requestTimeout: 60000,
  maxRetries: 5,
  compression: true,
  sslVerification: true,
  caCertPath: '/etc/ssl/certs/ca-bundle.crt'
};
```

## API Reference

### Logs API

#### GET /api/es/logs
Search logs with filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `time_range` | ESTimeRange | Time range preset |
| `time_start` | string | Custom start time (ISO 8601) |
| `time_end` | string | Custom end time (ISO 8601) |
| `severities` | string[] | Comma-separated severity levels (0-7) |
| `sources` | string[] | Comma-separated log sources |
| `hosts` | string[] | Filter by host names |
| `message_contains` | string | Text search in message |
| `src_ips` | string[] | Source IP addresses |
| `dest_ips` | string[] | Destination IP addresses |
| `page` | number | Page number (default: 1) |
| `page_size` | number | Results per page (default: 20) |
| `sort_by` | string | Sort field |
| `sort_order` | asc/desc | Sort direction |

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [...],
    "total": 1234,
    "page": 1,
    "page_size": 20,
    "total_pages": 62,
    "aggregations": {...},
    "query_time_ms": 12,
    "applied_filters": {...}
  }
}
```

#### POST /api/es/logs/bulk
Bulk ingest log documents.

**Request Body:**
```json
{
  "action": "bulk-ingest",
  "logs": [
    { "@timestamp": "...", "message": "...", ... },
    ...
  ],
  "index_pattern": "logs-*"
}
```

### Search API

#### POST /api/es/search
Execute Elasticsearch queries.

**Request Body:**
```json
{
  "index": "*",
  "query": {
    "bool": {
      "must": [
        { "range": { "@timestamp": { "gte": "now-24h" } } }
      ],
      "filter": [
        { "terms": { "event.severity": [7, 6] } }
      ]
    }
  },
  "aggs": {
    "by_source": {
      "terms": { "field": "event.module", "size": 10 }
    }
  },
  "size": 50,
  "sort": [{ "@timestamp": { "order": "desc" } }]
}
```

### Cluster API

#### GET /api/es/cluster/health
Get cluster health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "cluster_name": "soc-algeria-production",
    "status": "green",
    "number_of_nodes": 5,
    "number_of_data_nodes": 3,
    "active_shards": 90,
    "unassigned_shards": 0,
    "active_shards_percent_as_number": 100.0
  }
}
```

#### GET /api/es/cluster/nodes
Get node information and statistics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `node_id` | string | Specific node ID |
| `detailed` | boolean | Include stats |

## Index Patterns

### Wazuh Alerts
```
wazuh-alerts-{YYYY.MM.DD}
wazuh-archives-{YYYY.MM.DD}
```

Key fields:
- `rule.level` - Alert level (0-15)
- `rule.description` - Rule description
- `agent.name` - Agent hostname
- `srcip`, `dstip` - Source/destination IPs
- `syscheck.path` - File path (FIM events)

### Suricata Events
```
suricata-{YYYY.MM.DD}
```

Key fields:
- `alert.signature_id` - Signature ID
- `alert.signature` - Signature name
- `alert.severity` - Severity (1-7)
- `src_ip`, `dest_ip` - IPs
- `proto` - Protocol
- `tls.*` - TLS information
- `dns.*` - DNS information

### MISP Events
```
misp-events-{YYYY.MM.DD}
misp-objects-{YYYY.MM.DD}
```

Key fields:
- `Event.info` - Event description
- `Event.threat_level_id` - Threat level
- `Attribute.*` - IOC attributes
- `Object.*` - Object references

### Generic Logs
```
logs-{YYYY.MM.DD}
syslog-{YYYY.MM.DD}
audit-{YYYY.MM.DD}
firewall-{YYYY.MM.DD}
application-{YYYY.MM.DD}
```

All generic logs follow ECS (Elastic Common Schema):
- `@timestamp` - Event timestamp
- `event.*` - Event metadata
- `host.*` - Host information
- `source.*` / `destination.*` - Network endpoints
- `observer.*` - Collection agent info
- `threat.*` - Threat intelligence enrichment

## ILM Policies

### Recommended Policy: Logs Hot-Warm-Cold-Delete

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": { "max_age": "7d", "max_size": "50gb" },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "set_priority": { "priority": 50 },
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "set_priority": { "priority": 0 },
          "searchable_snapshot": { "snapshot_repository": "backup" }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### Recommended Policy: Alerts Extended Retention

```json
{
  "policy": {
    "phases": {
      "hot": { "min_age": "0ms", "actions": { "rollover": { "max_age": "30d" } } },
      "warm": { "min_age": "30d", "actions": { "shrink": { "number_of_shards": 1 } } },
      "cold": { "min_age": "180d", "actions": {} },
      "delete": { "min_age": "730d", "actions": { "delete": {} } }
    }
  }
}
```

## Ingest Pipelines

### Wazuh Pipeline Example

```json
PUT _ingest/pipeline/wazuh-pipeline
{
  "description": "Process Wazuh alerts",
  "processors": [
    {
      "grok": {
        "field": "message",
        "patterns": ["%{DATA:log_part}"]
      }
    },
    {
      "geoip": {
        "field": "srcip",
        "target_field": "source.geo",
        "properties": ["city_name", "country_iso_code", "location"]
      }
    },
    {
      "date": {
        "field": "@timestamp",
        "formats": ["ISO8601"]
      }
    },
    {
      "set": {
        "field": "event.module",
        "value": "wazuh"
      }
    }
  ]
}
```

### Suricata Pipeline Example

```json
PUT _ingest/pipeline/suricata-pipeline
{
  "description": "Process Suricata EVE JSON",
  "processors": [
    {
      "script": {
        "source": """
          if (ctx.event_type == 'alert') {
            ctx.event = ctx.event ?: [:];
            ctx.event.category = ['intrusion_detection'];
            ctx.event.kind = 'alert';
            ctx.event.severity = 8 - ctx.alert.severity;
          }
        """
      }
    },
    {
      "rename": {
        "field": "src_ip",
        "target_field": "source.ip"
      }
    },
    {
      "rename": {
        "field": "dest_ip",
        "target_field": "destination.ip"
      }
    }
  ]
}
```

## Security Considerations

### Authentication
- Always use TLS in production
- Prefer API keys over basic authentication
- Rotate credentials regularly
- Use minimal privilege accounts for applications

### Authorization
- Implement role-based access control (RBAC)
- Restrict sensitive index patterns
- Use field-level security for multi-tenant environments
- Audit all access to security-related indices

### Network Security
- Bind to internal interfaces only when possible
- Use VPN or private network for inter-cluster communication
- Configure firewall rules between tiers
- Enable IP filtering at proxy/load balancer level

### Data Protection
- Enable encryption at rest for sensitive indices
- Use searchable encryption for PII fields
- Implement data retention policies compliant with regulations
- Regular backup of cluster state and snapshots

### Monitoring & Auditing
- Enable audit logging (`xpack.security.audit.log_http_event_details`)
- Monitor for unusual query patterns
- Set up alerting on failed authentication attempts
- Track index and cluster-level changes

## Troubleshooting

### Connection Issues

**Problem:** `ConnectionError: Failed after N attempts`

Solutions:
1. Verify Elasticsearch is running: `curl http://localhost:9200/_cluster/health`
2. Check firewall rules between application and ES nodes
3. Verify SSL certificates are valid
4. Increase timeout values for slow networks

### Memory Issues

**Problem:** `CircuitBreakingException: [data] too much data [collections] would exceed`

Solutions:
1. Increase circuit breaker limits:
   ```json
   PUT _cluster/settings
   {
     "persistent": {
       "breaker.fielddata.limit": "40%"
     }
   }
   ```
2. Reduce fielddata usage by disabling it on text fields
3. Add more nodes or increase heap size

### Indexing Bottlenecks

**Problem:** High indexing latency or rejected bulk requests

Solutions:
1. Increase refresh interval for write-heavy indices:
   ```json
   PUT /logs-*/_settings
   { "index.refresh_interval": "30s" }
   ```
2. Optimize bulk size (5-15MB per request)
3. Add dedicated ingest nodes
4. Review and optimize ingest pipelines

### Search Performance

**Problem:** Slow search queries

Solutions:
1. Use `filter` context instead of `must` for exact matches
2. Limit wildcard and regexp queries
3. Optimize mappings (disable norms/text scoring where not needed)
4. Use index sorting for time-based queries
5. Consider search_after instead of deep pagination

### Shard Issues

**Problem:** Unassigned shards or cluster health yellow/red

Solutions:
1. Check allocation explanation:
   ```
   GET _cluster/allocation/explain
   ```
2. Manually reroute shards if needed
3. Verify disk space thresholds
4. Check for node failures

### Common Error Codes

| HTTP Code | Error | Solution |
|-----------|-------|----------|
| 400 | `invalid_index_name_exception` | Verify index name pattern |
| 401 | `security_authentication_failed` | Check credentials |
| 403 | `index_forbidden_exception` | Verify RBAC permissions |
| 404 | `index_not_found_exception` | Create index or check alias |
| 429 | `es_rejected_execution_exception` | Reduce request rate or increase queue |
| 503 | `master_not_discovered_exception` | Check master node availability |

## Development Notes

### Using Mock Data

All API routes include comprehensive mock data for standalone development. To test without an Elasticsearch instance:

1. Start your Next.js development server
2. Navigate to any API endpoint directly
3. The mock responses will be returned automatically

To disable mock data and connect to real Elasticsearch, modify the API routes to call the actual client library functions.

### Running Tests

```bash
# Run TypeScript compilation check
npx tsc --noEmit modules/elasticsearch/**/*.ts

# Run linting
npx eslint modules/elasticsearch/

# Build the project
npm run build
```

## Contributing

When contributing to this module:

1. Follow existing code style and patterns
2. Add JSDoc comments to all new functions
3. Update this README for new features
4. Include mock data for any new API endpoints
5. Ensure TypeScript strict mode compliance

## License

This module is part of the National SOC Platform for Algeria (2026-2030) project and follows the same open-source license terms.

---

**Module Version:** 1.0.0  
**Last Updated:** July 2026  
**Compatible with:** Elasticsearch 8.x, Next.js 16+, React 18+
