# 🛡️ Suricata IDS/IPS Integration Module

**National SOC Platform - Algeria 2026-2030**

Comprehensive Intrusion Detection and Prevention System (IDS/IPS) integration using **Suricata** - an open-source, high-performance network threat detection engine.

---

## 📋 Module Overview

This module provides complete integration with **Suricata 7.x** for:
- **Real-time network intrusion detection** (IDS mode)
- **Intrusion prevention** (IPS/Drop mode)
- **EVE JSON log parsing and analysis**
- **Rule management and customization**
- **Threat intelligence correlation**
- **Attack visualization and mapping**
- **Sensor health monitoring**

### Key Features

| Feature | Description |
|---------|-------------|
| **Alert Management** | Real-time alert ingestion, filtering, classification |
| **Rule Engine** | Custom rule creation, validation, testing, deployment |
| **EVE JSON Parser** | Complete Suricata output format support |
| **Statistics Dashboard** | KPIs, trends, top-N analysis |
| **Attack Map** | Geolocation-based attack visualization |
| **Sensor Monitoring** | Multi-sensor health and performance tracking |
| **Integration APIs** | MISP, TheHive, Wazuh connectors |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SURICATA IDS/IPS MODULE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Frontend   │    │   API Layer │    │      Backend Services   │ │
│  │  Dashboard   │───▶│  Routes     │───▶│                         │ │
│  │  Components  │    │  /alerts    │    │  ┌──────────────────┐  │ │
│  └─────────────┘    │  /rules      │    │  │  Suricata Client  │  │ │
│                     │  /stats      │    │  │  (API Wrapper)    │  │ │
│  ┌─────────────┐    └─────────────┘    │  └──────────────────┘  │ │
│  │ React Hooks │                           │                         │
│  │ useSuricata* │                        │  ┌──────────────────┐  │ │
│  └─────────────┘                        │  │ EVE JSON Parser   │  │ │
│                                         │  └──────────────────┘  │ │
│  ┌─────────────┐                        │                         │
│  │ Type System  │                        │  ┌──────────────────┐  │ │
│  │ TypeScript  │                        │  │ Rule Validator    │  │ │
│  │ Definitions │                        │  └──────────────────┘  │ │
│  └─────────────┘                        │                         │
│                                         └─────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        EXTERNAL INTEGRATIONS                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │   MISP   │  │ TheHive  │  │ Wazuh    │  │ Elasticsearch     │   │
│  │ Threat   │  │ SOAR     │  │ SIEM     │  │ Log Aggregation   │   │
│  │ Intel    │  │ Cases    │  │ EDR      │  │ Analytics          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Module Structure

```
modules/suricata/
├── types/
│   └── suricata.types.ts        # TypeScript type definitions (~900 lines)
├── lib/
│   └── suricata-client.ts       # API client library (~1200 lines)
├── api/
│   ├── alerts/route.ts          # Alert management endpoints
│   ├── rules/route.ts           # Rule CRUD endpoints
│   └── stats/route.ts           # Statistics & analytics endpoints
├── hooks/
│   └── use-suricata.ts          # React hooks for data fetching
├── components/
│   └── SuricataDashboard.tsx    # Main dashboard UI component
└── README.md                    # This documentation
```

### File Descriptions

#### `types/suricata.types.ts`
Complete TypeScript type system covering:
- **EVE JSON format**: All event types (alert, HTTP, DNS, TLS, files, flows)
- **Rule types**: Definition, validation, sources, states
- **Statistics types**: Metrics, aggregations, time-series data
- **Sensor types**: Health checks, interfaces, performance metrics
- **Filter/Query types**: Alert filters, rule filters, pagination
- **Integration types**: MISP, TheHive, Wazuh connectors

#### `lib/suricata-client.ts`
Comprehensive API client providing:
- **Error hierarchy**: `SuricataError`, `AuthError`, `RateLimitError`, etc.
- **Singleton pattern**: `initializeSuricataClient()` / `getSuricataClient()`
- **Caching layer**: Configurable TTL-based response caching
- **40+ methods**: Full coverage of alert, rule, statistics operations
- **Utility functions**: Severity calculation, EVE JSON parsing, service detection

#### `api/alerts/route.ts`
RESTful endpoints for alert management:
```
GET  /api/suricata/alerts              - Search/filter alerts
GET  /api/suricata/alerts/recent       - Recent alerts
GET  /api/suricata/alerts/high-priority - Critical/high severity
POST /api/suricata/alerts              - Bulk operations (FP marking, notes)
```

#### `api/rules/route.ts`
Complete rule management API:
```
GET    /api/suricata/rules             - List/search rules
GET    /api/suricata/rules/[sid]       - Get specific rule
POST   /api/suricata/rules             - Create/validate/test rules
PUT    /api/suricata/rules/[sid]       - Update rule
DELETE /api/suricata/rules/[sid]       - Delete custom rule
POST   /api/suricata/rules/update      - Update from ET/external sources
```

#### `api/stats/route.ts`
Analytics and monitoring endpoints:
```
GET /api/suricata/stats?type=overview         - Comprehensive statistics
GET /api/suricata/stats?type=trends           - Time-series trends
GET /api/suricata/stats?type=top-ips          - Top attacking IPs
GET /api/suricata/stats?type=top-signatures   - Top triggered signatures
GET /api/suricata/stats?type=sensors          - Sensor health status
GET /api/suricata/stats?type=performance      - Performance metrics
```

#### `hooks/use-suricata.ts`
React hooks for frontend integration:

| Hook | Purpose | Auto-refresh |
|------|---------|--------------|
| `useSuricataAlerts()` | Alert list with filtering | 30s |
| `useRecentAlerts()` | Latest N alerts | 15s |
| `useHighPriorityAlerts()` | Critical + High only | 10s |
| `useSuricataRules()` | Rule management | 60s |
| `useSuricataStats()` | Overview statistics | 30s |
| `useAlertTrends()` | Time-series data | Manual |
| `useTopSourceIPs()` | Attacker IPs | 2min |
| `useSensors()` | Sensor status | 30s |
| `useSuricataDashboard()` | Combined dashboard hook | Configurable |

#### `components/SuricataDashboard.tsx`
Full-featured dashboard component with tabs:
1. **Overview**: KPI cards, packet stats, sensor health, recent critical alerts
2. **Alerts**: Filterable table with severity controls, pagination
3. **Rules**: Rule table, create modal with validation, enable/disable
4. **Attack Map**: Global visualization (integrates with map libraries)
5. **Sensors**: Per-sensor details, health checks, resource usage

---

## 🔧 Configuration

### Environment Variables

```bash
# Suricata Configuration
SURICATA_INTERFACE=eth0                    # Capture interface
SURICATA_MODE=ids                          # ids or ips (drop/reject)

# API Configuration (for client)
NEXT_PUBLIC_SURICATA_API_URL=http://suricata:8080
NEXT_PUBLIC_SURICATA_API_KEY=your-api-key-here

# Optional: Emerging Threats Pro
ETPRO_OINKCODE=your-oinkcode               # For ET Pro subscription
```

### Docker Service

The Suricata service is defined in `production/docker/docker-compose.yml`:

```yaml
suricata:
  image: jasonish/suricata:latest
  container_name: soc-suricata
  cap_add:
    - NET_ADMIN
    - NET_RAW
  network_mode: host  # Required for packet capture
  volumes:
    - ./suricata/suricata.yaml:/etc/suricata/suricata.yaml:ro
    - ./suricata/rules:/var/lib/suricata/rules:ro
  command: >
    --af-packet
    -i eth0
    --set eve-log.filename=/var/log/suricata/eve.json
    --set eve-log.types=alert,http,dns,tls,files
```

### Suricata YAML Configuration

Key settings in `suricata.yaml`:

```yaml
# Address groups for rule matching
vars:
  address-groups:
    HOME_NET: "[196.200.0.0/16,172.16.0.0/12,10.0.0.0/8]"
    EXTERNAL_NET: "!$HOME_NET"

# EVE JSON output configuration
outputs:
  - eve-log:
      enabled: yes
      filename: eve.json
      types:
        - alert:
            enabled: yes
            payload: yes
            packet: yes
        - http:
            enabled: yes
            extended: yes
        - dns:
            enabled: yes
            queries: yes
        - tls:
            enabled: yes
            session-resumption: yes
        - files:
            enabled: yes
            force-hash: [md5, sha1, sha256]

# Statistics interval
stats:
  enabled: yes
  interval: 30
  decoders: yes
```

---

## 🚀 Quick Start

### 1. Initialize the Client

```typescript
// lib/suricata.ts
import { initializeSuricataClient } from '@/modules/suricata/lib/suricata-client';

export const suricataClient = initializeSuricataClient({
  baseUrl: process.env.NEXT_PUBLIC_SURICATA_API_URL || 'http://localhost:8080',
  apiKey: process.env.SURICATA_API_KEY,
  timeout: 30000,
  maxRetries: 3,
  debug: process.env.NODE_ENV === 'development',
  enableCache: true,
  cacheTtl: 5000
});
```

### 2. Use in a Page Component

```tsx
'use client';

import { SuricataDashboard } from '@/modules/suricata/components/SuricataDashboard';

export default function IDSDashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <SuricataDashboard 
        defaultTimeRange="last_24_hours"
        autoRefresh={true}
        refreshInterval={30000}
        enableAttackMap={true}
      />
    </div>
  );
}
```

### 3. Use Individual Hooks

```tsx
import { 
  useSuricataAlerts,
  useHighPriorityAlerts,
  useSuricataStats,
  useSensors 
} from '@/modules/suricata/hooks/use-suricata';

function SOCOverview() {
  const { data: stats } = useSuricataStats(15000);
  const { alerts: criticalAlerts } = useHighPriorityAlerts(5);
  const { sensors } = useSensors();

  return (
    <div>
      {/* Render your components */}
    </div>
  );
}
```

---

## 📊 API Reference

### Alerts API

#### GET `/api/suricata/alerts`

Query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_range` | string | last_24_hours | Time window |
| `severities` | string[] | - | Filter by severity |
| `src_ip` | string | - | Source IP filter |
| `dest_ip` | string | - | Destination IP filter |
| `protocol` | string | - | TCP/UDP/ICMP/etc |
| `signature_id` | number | - | Specific SID |
| `page` | number | 1 | Page number |
| `page_size` | number | 20 | Items per page |
| `sort_by` | string | timestamp | Sort field |
| `sort_order` | string | desc | asc/desc |

Response example:
```json
{
  "success": true,
  "data": {
    "alerts": [...],
    "total": 456789,
    "page": 1,
    "page_size": 20,
    "total_pages": 22840,
    "aggregations": {
      "by_severity": { "critical": 1234, "high": 5678, ... },
      "by_category": { "malware": 45678, ... },
      "by_protocol": { "TCP": 320000, ... }
    }
  }
}
```

### Rules API

#### POST `/api/suricata/rules` (Create)

Request body:
```json
{
  "action": "create",
  "rule": {
    "raw": "alert tcp $HOME_NET any -> $EXTERNAL_NET 443 (msg:\"Suspicious HTTPS\"; content:\"malware\"; sid:2000001; rev:1;)",
    "action": "alert",
    "protocol": "tcp",
    "message": "Suspicious HTTPS",
    "class_type": "trojan-activity"
  },
  "user_id": "analyst-01"
}
```

#### POST `/api/suricata/rules` (Validate)

Request body:
```json
{
  "action": "validate",
  "rule": "alert tcp any any -> any any (msg:\"Test\"; sid:2000002; rev:1;)"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "valid",
    "errors": [],
    "warnings": ["SID 2000002 is in custom range (>1000000)"]
  }
}
```

### Statistics API

#### GET `/api/suricata/stats?type=overview`

Response includes:
- Packet processing metrics (received, dropped, processed)
- Alert counts by severity/category/action
- Top signatures with trend data
- Top source/destination IPs with geolocation
- Protocol distribution
- Flow statistics
- Derived metrics (PPS, BPS, drop rate %)

---

## 🔒 Security Considerations

### Rule Validation

All custom rules are validated before deployment:
- Syntax checking (action, protocol, options structure)
- SID range validation (custom rules > 1000000)
- Required option verification (sid, rev, msg)
- Parentheses balance check
- Semicolon separator validation

### Rate Limiting

The client enforces minimum 100ms between requests to prevent overwhelming the Suricata daemon.

### Network Security

- Suricata runs with minimal capabilities (`NET_ADMIN`, `NET_RAW`)
- Container uses `network_mode: host` for capture (required)
- Rules directory mounted read-only
- Separate logging volume for audit trail

### False Positive Management

Built-in workflows for:
- Single/bulk false positive marking
- Reason tracking for FP decisions
- Automatic suppression rule generation suggestion
- FP statistics per rule

---

## 🔗 Integrations

### MISP Threat Intelligence

```typescript
const mispEvent = suricataClient.formatAlertForMISP(alert);
// Returns: { title, description, attributes[], tags[] }

// Attributes include:
// - ip-src, ip-dst (source/destination IPs)
// - domain (from HTTP hostname)
// - text (signature name, SID)
// - port (source/destination ports)
```

### TheHive Case Creation

```typescript
const hiveCase = suricataClient.formatAlertForTheHive(alert);
// Returns: { title, description, severity, tags, observables[], tlp }

// Observables include IP addresses and ports
// Severity mapped from Suricata score (1-5 → 1-4)
```

### Wazuh Forwarding

Alerts can be forwarded to Wazuh with configurable severity mapping:

```typescript
const wazuhConfig = {
  forward_alerts: true,
  alert_level_mapping: {
    [SeverityLevel.CRITICAL]: 15,  // Maximum
    [SeverityLevel.HIGH]: 12,
    [SeverityLevel.MEDIUM]: 8,
    [SeverityLevel.LOW]: 5,
    [SeverityLevel.INFORMATIONAL]: 3
  }
};
```

---

## 📈 Monitoring & Troubleshooting

### Health Checks

Monitor these endpoints:
- `/health` - Overall service health
- `/version` - Suricata version info
- `/sensors/{id}/health` - Per-sensor diagnostics

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No alerts captured | Wrong interface | Check `SURICATA_INTERFACE` env var |
| High drop rate > 1% | Insufficient resources | Increase CPU/memory limits |
| Rules not loading | Syntax error | Check logs, validate rules via API |
| Memory exhaustion | Too many flows | Adjust flow memcap in config |

### Log Locations

```
/var/log/suricata/
├── eve.json           # All events (JSON format)
├── fast.log           # Simple alert log
├── stats.log          # Statistics dump
└── suricata.log       # Daemon logs
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run Suricata module tests
npm test -- modules/suricata

# Run with coverage
npm test -- --coverage modules/suricata
```

### Rule Testing

Use the built-in test endpoint:

```typescript
const result = await suricataClient.testRule(
  'alert tcp any any -> any 4444 (content:"|00 00 00 00|"; depth:4; sid:2000010; rev:1;)',
  samplePcapBuffer
);

console.log(result.matched);        // boolean
console.log(result.match_count);     // number
console.log(result.performance_impact); // { cpu_overhead_percent, memory_bytes }
```

---

## 📚 Additional Resources

- **Suricata Documentation**: https://docs.suricata.io/
- **Emerging Threats Rules**: https://rules.emergingthreats.net/
- **EVE JSON Format**: https://suricata.readthedocs.io/en/suricata-7.0.3/output/eve/json-format.html
- **MITRE ATT&CK Mapping**: https://attack.mitre.org/

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-25 | Initial release - Core IDS/IPS functionality |

---

## 👥 Contributing

When contributing to this module:
1. Follow existing TypeScript patterns
2. Maintain backward compatibility with types
3. Update this documentation for new features
4. Add tests for new hooks/components
5. Validate all rule changes before committing

---

**Module Status**: ✅ Production Ready  
**Last Updated**: 2026-07-25  
**Maintainer**: National SOC Platform Team
