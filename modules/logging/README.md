# Module 10: Centralized Logging & Audit System

**National SOC Platform for Algeria (2026-2030)**

> **This is the FINAL MODULE** that ties all SOC platform components together with complete audit trail and compliance capabilities.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [File Structure](#file-structure)
5. [Quick Start](#quick-start)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Compliance Mapping](#compliance-mapping)
9. [PII Handling](#pii-handling)
10. [Retention Policies](#retention-policies)
11. [Performance Considerations](#performance-considerations)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **Centralized Logging & Audit System** provides a comprehensive, production-ready solution for:

- **Structured Logging**: JSON-formatted logs from all platform components
- **Immutable Audit Trail**: Cryptographically chained audit records
- **Real-time Monitoring**: Live log streaming with auto-refresh
- **Compliance Reporting**: Built-in support for SOC2, GDPR, ISO27001, NIST, and Algerian Cybersecurity Law
- **PII Protection**: Automatic detection and masking of sensitive data
- **Log Shipping**: Multi-transport shipping to Elasticsearch, files, HTTP endpoints
- **Lifecycle Management**: Automated retention policies and archival

### Key Benefits

| Feature | Benefit |
|---------|---------|
| **Centralized Collection** | Single source of truth for all platform events |
| **Tamper-Evident Audit** | SHA-256 hash chain ensures record integrity |
| **Compliance Ready** | Pre-built reports for major frameworks |
| **PII Detection** | Automatic sensitive data protection |
| **High Performance** | Batch processing, async shipping, efficient queries |

---

## 🏗️ Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES (Modules 1-9)                          │
├─────────┬─────────┬──────────┬──────────┬──────────┬──────────────────────┤
│ Wazuh   │Suricata│  MISP    │ TheHive  │ Platform │    Custom Services    │
│ SIEM    │ IDS/IPS │ Threat   │ Case     │ API/Apps │                      │
│         │         │ Intel    │ Mgmt     │          │                      │
└────┬────┴────┬────┴─────┬────┴─────┬────┴─────┬────┴──────────────────────┘
     │         │          │          │         │
     ▼         ▼          ▼          ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOGGING MODULE (Module 10)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │   Logger    │  │  Audit Trail │  │      PII Scanner               │  │
│  │  Library    │  │   System     │  │   (Detection & Masking)        │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────────┬──────────────────┘  │
│         │                │                       │                      │
│         ▼                ▼                       ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    SHIPPING LAYER                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│  │  │ Console  │  │   File   │  │    ES    │  │   HTTP   │           │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                          STORAGE BACKEND                                   │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │     Elasticsearch Cluster       │  │      File Archive / S3         │ │
│  │  (Hot/Warm/Cold Tiers)          │  │      (Long-term Retention)     │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                           CONSUMERS                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │   Grafana   │  │   Dashboard  │  │    Compliance Reports           │  │
│  │ Dashboards  │  │ Component    │  │    (SOC2/GDPR/ISO/NIST)        │  │
│  └─────────────┘  └──────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Log Entry Lifecycle

```
1. EVENT OCCURS
   ↓
2. LOGGER.capture() - Structured log entry created
   ↓
3. PII SCAN - Sensitive data detected/masked
   ↓
4. TRANSPORT BUFFER - Entry queued for shipping
   ↓
5. BATCH FLUSH - Entries sent to configured transports
   ↓
6. STORAGE - Persisted in Elasticsearch/files
   ↓
7. INDEXING - Made searchable
   ↓
8. RETENTION POLICY - Lifecycle management begins
   ↓
9. ARCHIVAL/DELETION - Based on retention rules
```

---

## ✨ Features

### 1. Structured Logging (`lib/logger.ts`)

- **JSON Output**: All logs in consistent structured format
- **Multiple Transports**: Console, File, Elasticsearch, HTTP
- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Correlation IDs**: Distributed tracing support
- **Child Loggers**: Context propagation
- **Performance Timing**: Built-in instrumentation
- **Batch Processing**: Efficient bulk operations
- **Local Fallback**: Graceful degradation

```typescript
import { initializeLogger, getLogger } from '@/modules/logging/lib/logger';

// Initialize at app startup
await initializeLogger({
  service: 'my-soc-service',
  environment: 'production',
  transports: [consoleConfig, elasticsearchConfig]
});

// Use anywhere
const logger = getLogger();
logger.info('User logged in', { userId: '123' }, LogSource.AUTH_LOGIN);

// Child logger for request context
const reqLogger = logger.child({ requestId: 'abc-123' });
reqLogger.info('Processing request');
```

### 2. Immutable Audit Trail (`lib/audit-trail.ts`)

- **Hash Chaining**: SHA-256 chain prevents tampering
- **Actor Tracking**: User, Service, System identification
- **Action Classification**: CRUD, Auth, Admin, Data Access
- **Risk Scoring**: Automatic risk assessment per action
- **Compliance Tags**: Auto-tagging for framework mapping
- **Export Formats**: SOC2, GDPR, ISO27001, NIST, Algerian Law

```typescript
import { initializeAuditTrail, getAuditTrail } from '@/modules/logging/lib/audit-trail';

const audit = await initializeAuditTrail();

await audit.record({
  action: AuditAction.LOGIN,
  actor: { id: 'user-001', type: ActorType.USER, displayName: 'Admin' },
  resource: { type: ResourceType.USER, id: 'user-001', name: 'Admin User' },
  outcome: AuditOutcome.SUCCESS,
  description: 'User logged in successfully'
});
```

### 3. Log Shipping (`api/shipping/route.ts`)

- **Multi-Transport Support**: Ship to multiple destinations
- **Buffer Management**: Configurable batch sizes
- **Retry Logic**: Exponential backoff on failure
- **Health Monitoring**: Transport status tracking
- **Backlog Management**: Queue monitoring and force flush

### 4. Retention Management (`api/retention/route.ts`)

- **Policy-Based Rules**: Define retention by source/level
- **Multiple Actions**: Delete, Archive, Compress, Anonymize, Cold Move
- **Scheduling**: Cron-based policy execution
- **Storage Visualization**: Usage tracking and forecasting
- **Preview Mode**: Test before applying changes

### 5. PII Detection & Masking

**Supported PII Types:**
- Email addresses
- Phone numbers (Algerian format supported)
- National ID / Passport numbers
- Credit cards (with Luhn validation)
- IBAN (Algerian format: DZ...)
- IP addresses (IPv4/IPv6)
- Passwords, API keys, JWT tokens
- Session IDs
- Health information
- Financial accounts

**Actions Available:**
- `MASK`: Partial masking (e.g., a***n@domain.com)
- `REDACT`: Full replacement with [REDACTED]
- `HASH`: One-way hash for privacy
- `ENCRYPT`: Reversible encryption
- `ALERT`: Generate security alert

### 6. Compliance Reports

Built-in support for generating reports that satisfy requirements of:

| Framework | Key Requirements Covered |
|-----------|--------------------------|
| **SOC 2 Type II** | CC6.1-Access Control, CM.2-Change Management, LM.1-Logging |
| **GDPR** | Art.5-Principles, Art.25-PbD, Art.30-Records, Art.32-Security |
| **ISO 27001** | A.12.4-Logging, A.13.1-Network Controls, A.16.1-Incident Mgmt |
| **NIST CSF** | AC-2/Audit, AU-2/3/6/9/12-Logging, SC-7/8-Protection |
| **Algerian Law** | Art.8-Incident Reporting, Art.10-Retention, Art.12-Access Control |

---

## 📁 File Structure

```
modules/logging/
├── types/
│   └── logging.types.ts          # ~800 lines - Complete type definitions
├── lib/
│   ├── logger.ts                 # ~900 lines - Core logging library
│   └── audit-trail.ts            # ~700 lines - Audit trail system
├── api/
│   ├── logs/
│   │   └── route.ts              # Logs search/export endpoints
│   ├── audit/
│   │   └── route.ts              # Audit trail/compliance endpoints
│   ├── shipping/
│   │   └── route.ts              # Shipping configuration/status
│   └── retention/
│       └── route.ts              # Retention policies/storage
├── hooks/
│   └── use-logging.ts            # React hooks for dashboard
├── components/
│   └── LoggingDashboard.tsx      # Full dashboard component
├── middleware/
│   └── audit-middleware.ts       # Next.js audit middleware
└── README.md                     # This documentation
```

**Total: ~4,500+ lines of production code**

---

## 🚀 Quick Start

### 1. Installation

The module is part of the SOC platform. Ensure dependencies are installed:

```bash
cd /home/z/my-project
npm install
```

### 2. Basic Logger Setup

```typescript
// src/app/layout.tsx or initialization file
import { initializeLogger } from '@/modules/logging/lib/logger';
import { LogLevel, LogTransportType, Environment } from '@/modules/logging/types';

export async function initLogging() {
  await initializeLogger({
    service: 'soc-platform',
    environment: process.env.NODE_ENV === 'production' 
      ? Environment.PRODUCTION 
      : Environment.DEVELOPMENT,
    version: '2.1.0',
    minLevel: LogLevel.INFO,
    
    piiDetection: {
      enabled: true,
      detectTypes: ['password', 'api_key', 'jwt_token', 'credit_card'],
      defaultActions: {
        password: 'reduct',
        api_key: 'reduct',
        jwt_token: 'reduct'
      }
    },
    
    transports: [
      {
        type: LogTransportType.CONSOLE,
        enabled: true,
        minLevel: LogLevel.DEBUG,
        bufferSize: 1,
        flushIntervalMs: 0,
        retry: { maxRetries: 3, initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          colors: true,
          format: 'pretty',
          timestamps: true,
          target: 'stdout'
        }
      },
      {
        type: LogTransportType.ELASTICSEARCH,
        enabled: true,
        minLevel: LogLevel.INFO,
        bufferSize: 100,
        flushIntervalMs: 5000,
        retry: { maxRetries: 5, initialDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: true },
        options: {
          nodes: [process.env.ES_URL || 'http://localhost:9200'],
          indexPattern: 'soc-logs-{date}',
          auth: {
            username: process.env.ES_USER || 'elastic',
            password: process.env.ES_PASS || ''
          },
          timeout: 30000,
          sniffOnStart: true
        }
      }
    ]
  });
}
```

### 3. Using in Components

```tsx
'use client';

import { LoggingDashboard } from '@/modules/logging/components/LoggingDashboard';

export default function LoggingPage() {
  return (
    <div className="container mx-auto p-4">
      <LoggingDashboard 
        defaultTab="live"
        autoRefreshInterval={5000}
      />
    </div>
  );
}
```

### 4. Using Hooks

```tsx
import { useLogs, useAuditTrail, useLogStats } from '@/modules/logging/hooks/use-logging';

function MyComponent() {
  // Fetch logs with filters
  const { data: logs, loading, setFilters } = useLogs({
    initialFilters: { levels: [LogLevel.ERROR] },
    refreshInterval: 30000
  });
  
  // Get statistics
  const { quickStats } = useLogStats();
  
  // Audit trail access
  const { data: auditEntries, recordEvent } = useAuditTrail({
    mode: 'list'
  });
  
  return (
    // Render your UI
  );
}
```

---

## 📡 API Reference

### Logs API (`/api/logging/logs`)

#### GET - Search Logs

```
GET /api/logging/logs?query=error&levels=ERROR,CRITICAL&sources=security&page=1&pageSize=50
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Full-text search |
| `levels` | string | Comma-separated log levels |
| `sources` | string | Comma-separated sources |
| `startTime` | string | ISO timestamp start |
| `endTime` | string | ISO timestamp end |
| `correlationId` | string | Filter by correlation ID |
| `userId` | string | Filter by user ID |
| `clientIp` | string | Filter by client IP |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (max: 500) |
| `export` | string | Export format: json, csv |
| `action` | string | Special: stats, sources, levels |

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [...],
    "totalCount": 1500,
    "pagination": { "page": 1, "totalPages": 30, ... },
    "aggregations": { "byLevel": {...}, "bySource": {...} }
  }
}
```

#### POST - Advanced Query

```json
POST /api/logging/logs
{
  "action": "query",
  "filters": {
    "levels": ["ERROR", "CRITICAL"],
    "sources": ["security", "wazuh"],
    "hasErrors": true
  },
  "pagination": { "page": 1, "pageSize": 100 },
  "fields": ["id", "timestamp", "level", "message", "source"]
}
```

### Audit API (`/api/logging/audit`)

#### GET - Retrieve Audit Trail

```
GET /api/logging/audit?action=trail&actions=LOGIN,CONFIG_CHANGE&actorTypes=USER
```

**Actions:**
- `trail` - Paginated audit entries
- `actors` - Activity by actor (requires `actorId`)
- `resources` - Activity on resource (requires `resourceId`)
- `timeline` - User activity timeline (requires `actorId`)
- `compliance-report` - Generate compliance report
- `stats` - Overall statistics
- `integrity` - Verify hash chain integrity

#### POST - Record Event

```json
POST /api/logging/audit
{
  "action": "record",
  "action_type": "LOGIN",
  "actor": {
    "id": "user-001",
    "type": "USER",
    "displayName": "Admin User",
    "username": "admin",
    "roles": ["administrator"]
  },
  "resource": {
    "type": "USER",
    "id": "user-001",
    "name": "Admin User"
  },
  "outcome": "SUCCESS",
  "description": "User logged in successfully via LDAP"
}
```

### Shipping API (`/api/logging/shipping`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/shipping` | GET | Get shipper status/configurations/backlog |
| `/shipping/configuration` | PUT | Update configuration |
| `/shipping` | POST | Test connection, flush backlog, create config |

### Retention API (`/api/logging/retention`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/retention` | GET | Get policies/storage/summary |
| `/retention/policy/[id]` | PUT | Update policy |
| `/retention/policy/[id]` | DELETE | Delete policy |
| `/retention` | POST | Create policy, apply rules, preview |

---

## 🔗 Integration Guide

### Wazuh Integration (Module 2)

Forward Wazuh alerts to central log store:

```typescript
// In your Wazuh integration module
import { getLogger } from '@/modules/logging/lib/logger';
import { LogSource, LogLevel } from '@/modules/logging/types';

const logger = getLogger();

function forwardWazuhAlert(alert: any) {
  const level = alert.rule?.level >= 10 ? LogLevel.CRITICAL :
               alert.rule?.level >= 7 ? LogLevel.ERROR :
               alert.rule?.level >= 5 ? LogLevel.WARN :
               LogLevel.INFO;
  
  logger.log(level, alert.rule?.description || 'Wazuh Alert', {
    agentId: alert.agent?.id,
    agentName: alert.agent?.name,
    ruleId: alert.rule?.id,
    ruleLevel: alert.rule?.level,
    fullLog: alert.fulllog,
    ...alert.data
  }, LogSource.WAZUH);
}
```

### Suricata Integration (Module 5)

Forward EVE JSON logs:

```typescript
function forwardSuricataEve(eve: any) {
  const level = eve.alert?.severity === 1 ? LogLevel.CRITICAL :
               eve.alert?.severity <= 2 ? LogLevel.ERROR :
               eve.event_type === 'alert' ? LogLevel.WARN :
               LogLevel.INFO;
  
  logger.log(level, `[${eve.event_type}] ${eve.alert?.signature || 'Suricata Event'}`, {
    event_type: eve.event_type,
    src_ip: eve.src_ip,
    src_port: eve.src_port,
    dest_ip: eve.dest_ip,
    dest_port: eve.dest_port,
    proto: eve.proto,
    alert: eve.alert
  }, LogSource.SURICATA);
}
```

### MISP Integration (Module 4)

Log threat intelligence actions:

```typescript
function logMispAction(action: string, eventData: any) {
  const audit = getAuditTrail();
  
  audit.recordSuccess(
    action === 'search' ? AuditAction.THREAT_INTEL_QUERY :
    action === 'view' ? AuditAction.DATA_ACCESS :
    AuditAction.IOC_LOOKUP,
    { id: 'misp-service', type: ActorType.SERVICE, displayName: 'MISP Integration' },
    { type: ResourceType.THREAT_INTELLIGENCE, id: eventData.id || 'unknown', name: eventData.Event?.info || 'MISP Event' },
    `MISP ${action}: ${eventData.Event?.info || 'Unknown event'}`
  );
}
```

### TheHive Integration (Module 3)

Track case activities:

```typescript
async function logTheHiveCaseUpdate(caseData: any, analyst: string) {
  await recordAudit({
    action: caseData.status === 'Open' ? AuditAction.CASE_CREATED :
             caseData.status === 'Closed' ? AuditAction.CASE_CLOSED :
             AuditAction.CASE_UPDATED,
    actor: { id: analyst, type: ActorType.USER, displayName: analyst },
    resource: { type: ResourceType.CASE, id: caseData.id, name: caseData.title || caseData.name },
    outcome: AuditOutcome.SUCCESS,
    description: `Case ${caseData.id}: ${caseData.title || caseData.name} - Status: ${caseData.status}`
  });
}
```

---

## 📊 Compliance Mapping

### SOC 2 Type II Requirements

| Trust Criteria | How This Module Satisfies It |
|---------------|------------------------------|
| **CC6.1 - Logical Access** | All authentication events logged (login, logout, MFA, token ops) |
| **CM.2 - Change Management** | Configuration changes tracked with previous/new state |
| **SO.1 - System Operations** | Startup/shutdown/health check events captured |
| **RM.1 - Risk Mitigation** | Security alerts and incident responses logged |
| **LM.1 - Logging/Monitoring** | Complete structured logging with integrity checks |

### GDPR Articles

| Article | Implementation |
|---------|----------------|
| **Art. 5 - Principles** | Purpose limitation through source categorization |
| **Art. 25 - PbD** | PII detection and masking built-in |
| **Art. 30 - Records** | Comprehensive audit trail of all processing |
| **Art. 32 - Security** | Security events, breach attempts logged |
| **Art. 33 - Breach Notification** | Critical events flagged for review |

### Algerian Cybersecurity Law (2020)

| Article | Coverage |
|---------|----------|
| **Article 8** - Incident reporting | All security incidents logged with full context |
| **Article 10** - Log retention | 7-year retention for security events |
| **Article 12** - Access control | Authentication and authorization fully audited |
| **Article 15** - Data protection | PII handling procedures implemented |

---

## 🔒 PII Handling Procedures

### Detection Configuration

```typescript
const piiConfig = {
  enabled: true,
  detectTypes: [
    'email_address',
    'phone_number',
    'national_id',
    'credit_card',
    'password',
    'api_key',
    'jwt_token',
    'ip_address'
  ],
  defaultActions: {
    password: 'REDACT',
    api_key: 'REDACT',
    jwt_token: 'REDACT',
    credit_card: 'MASK',
    email_address: 'MASK',
    ip_address: 'MASK'
  },
  minConfidence: 0.7,
  scanFields: ['message', 'data', 'queryString', 'body'],
  excludeFields: ['hash', 'entryHash']
};
```

### Masking Examples

| Original | Action | Result |
|----------|--------|--------|
| `user@example.com` | MASK | `u***r@example.com` |
| `0555123456` | MASK | `******3456` |
| `DZ0012345678901234567890` | MASK | `DZ00***************90` |
| `password=Secret123!` | REDACT | `password=[REDACTED] |
| `192.168.1.100` | MASK | `192.168.1.***` |

### Response to PII Detection

When high-risk PII is detected:

1. **Automatic masking** applied to log entry
2. **Warning log** generated at WARN level
3. **Optional alert** sent to security team (configurable)
4. **Entry tagged** with `piiDetected` metadata for filtering

---

## 📦 Retention Policy Recommendations

### Default Policy Suggestions

| Category | Retention Period | Rationale |
|----------|------------------|-----------|
| **Security Events** | 7 years | Algerian Law Art.10, forensic needs |
| **Audit Trail** | 7 years | Immutable compliance requirement |
| **Authentication** | 3 years | Account compromise investigation |
| **API/Application** | 90 days | Debugging, operational needs |
| **Error Logs** | 1 year | Trend analysis, capacity planning |
| **Debug Logs** | 14 days | Development troubleshooting only |

### Sample Policy Creation

```typescript
// POST /api/logging/retention
{
  "action": "create-policy",
  "name": "Security Events - 7 Year Retention",
  "description": "Per Algerian Cybersecurity Law requirements",
  "sources": ["security", "wazuh", "suricata", "security_alert", "security_incident"],
  "retentionPeriodDays": 2555,
  "action": "ARCHIVE",
  "archiveDestination": "s3://soc-archive/compliance/security/",
  "schedule": "0 2 * * 0",
  "priority": 100
}
```

---

## ⚡ Performance Considerations

### At Scale (100K+ EPS - Events Per Second)

1. **Transport Buffering**
   - Set `bufferSize: 500-1000` for Elasticsearch
   - Use `flushIntervalMs: 5000-10000` (5-10 seconds)
   
2. **Index Strategy**
   - Use time-based indices: `soc-logs-{date}`
   - Implement hot/warm/cold tiers
   - Consider rollover after 50GB or 7 days

3. **Query Optimization**
   - Always include time range filters
   - Use index patterns efficiently
   - Cache frequent aggregations

4. **Resource Allocation**
   ```
   For 100K EPS:
   - Elasticsearch: 15+ data nodes, 32GB RAM each
   - Storage: 2TB/day raw → 500GB/day compressed
   - Network: 1Gbps+ dedicated log network
   ```

### Memory Management

- In-memory buffer limits: Configure max memory per transport
- Backlog monitoring: Alert when backlog > 10,000 entries
- Graceful degradation: Local file fallback when ES unavailable

### Monitoring Metrics

Key metrics to monitor:
- **Shipping latency** (p50, p95, p99)
- **Backlog size** trend over time
- **Error rate** by transport
- **Indexing rate** (docs/sec)
- **Storage growth** rate

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Logs not appearing in Elasticsearch

**Symptoms:** No errors, but logs missing from Kibana

**Checklist:**
- [ ] Verify ES connection: `GET /api/logging/shipping?action=status`
- [ ] Check index pattern matches: Default is `soc-logs-*`
- [ ] Time filter: Check if looking at correct time range
- [ ] Refresh interval: Try manual refresh
- [ ] Index exists: `_cat/indices/soc-logs-*`

#### 2. High memory usage

**Symptoms:** OOM warnings, slow response times

**Solutions:**
- Reduce `bufferSize` in transport config
- Increase `flushIntervalMs`
- Enable compression for file transport
- Review PII scanning overhead (disable if not needed)

#### 3. Audit chain integrity failure

**Symptoms:** `verifyChainIntegrity()` returns `valid: false`

**Causes:**
- Manual database modification
- Clock skew between nodes
- Concurrent writes without proper locking

**Resolution:**
- Identify break point from `brokenChainAt`
- Assess impact scope
- Document reason for investigation
- Consider re-indexing if widespread

#### 4. Rate limiting blocking legitimate traffic

**Symptoms:** 429 responses, users complaining

**Adjustments:**
```typescript
rateLimit: {
  maxRequests: 2000,  // Increase limit
  windowMs: 60000,
  blockOnExcess: false  // Warn only, don't block
}
```

### Debug Mode

Enable verbose logging:

```typescript
await initializeLogger({
  // ... other config
  transports: [{
    type: LogTransportType.CONSOLE,
    options: {
      format: 'pretty',
      colors: true,
      target: 'stdout'
    }
  }],
  minLevel: LogLevel.DEBUG  // Show everything
});
```

### Health Check Endpoint

```
GET /api/logging/logs?action=stats
GET /api/logging/shipping?action=status
GET /api/logging/audit?action=integrity
GET /api/logging/retention?action=summary
```

---

## 📈 Roadmap

### Planned Enhancements

- [ ] **Real-time Streaming**: WebSocket-based live log feed
- [ ] **ML Anomaly Detection**: Pattern-based anomaly identification
- [ ] **Log Enrichment**: GeoIP, WHOIS, threat intel lookup
- [ ] **Cross-Cluster Replication**: Multi-datacenter support
- [ ] **Custom Dashboard Builder**: Drag-and-drop visualization
- [ ] **Alert Rule Engine**: Complex alert conditions
- [ ] **Log Parsing Pipeline**: Grok-style pattern matching

---

## 📝 License

This module is part of the National SOC Platform for Algeria (2026-2030).
Released under open-source license for government use.

---

## 🤝 Contributing

This is Module 10 of 10 in the complete SOC platform. For contributions:
- Follow existing code style (TypeScript strict mode)
- Add JSDoc comments to all public functions
- Include unit tests for new functionality
- Update this README for API changes

---

**Module 10 Complete ✓**

*Final module of the National SOC Platform implementation.*
