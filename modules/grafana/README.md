# Grafana Monitoring Dashboard Integration

**Module 7 - Algeria National SOC Platform (2026-2030)**

## Overview

This module provides comprehensive Grafana integration for the National SOC Platform, enabling real-time monitoring, alerting, and visualization of security operations data. It serves as the central monitoring hub connecting all security tools in the SOC ecosystem.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GRAFANA MODULE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐    ┌─────────────────┐    ┌──────────────────────────┐  │
│  │   Frontend    │    │   API Routes    │    │     Grafana Client       │  │
│  │   React UI    │◄──►│  (Next.js)      │◄──►│   (TypeScript SDK)       │  │
│  └───────────────┘    └─────────────────┘    └──────────────────────────┘  │
│         │                     │                        │                   │
│         ▼                     ▼                        ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Grafana Server                                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │Dashboard │ │ Alerts   │ │Data Srcs │ │ Users    │ │Folders   │  │   │
│  │  │   API    │ │   API    │ │   API    │ │   API    │ │   API    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│            │  Prometheus  │ │Elasticsearch │ │    Loki      │              │
│            │   Metrics    │ │   Logs       │ │   Logs       │              │
│            └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
modules/grafana/
├── api/
│   ├── dashboards/
│   │   └── route.ts          # Dashboard CRUD endpoints
│   ├── alerts/
│   │   └── route.ts          # Alert rule management endpoints
│   └── datasources/
│       └── route.ts          # Data source management endpoints
├── components/
│   └── GrafanaDashboard.tsx  # Main dashboard component with tabs
├── dashboards/                # Pre-built SOC dashboard configurations
│   ├── soc-overview.json      # Main SOC KPI dashboard
│   ├── security-events.json   # Wazuh/Suricata alert trends
│   ├── network-traffic.json   # Suricata packet analysis
│   ├── threat-intelligence.json # MISP IOC statistics
│   ├── system-health.json     # Infrastructure monitoring
│   └── incident-response.json # TheHive case metrics
├── hooks/
│   └── use-grafana.ts        # Custom React hooks for Grafana data
├── lib/
│   └── grafana-client.ts     # Complete API client library
├── types/
│   └── grafana.types.ts      # TypeScript type definitions
└── README.md                 # This documentation
```

## Features

### 1. Dashboard Management
- **List/Search**: Query dashboards with filters (tags, type, starred)
- **Create/Update/Delete**: Full CRUD operations on dashboards
- **Import**: Import dashboards from JSON with overwrite support
- **Version Control**: Track dashboard versions and changes

### 2. Alert Rule Management
- **Alert Lifecycle**: Create, update, pause, and delete alert rules
- **State Monitoring**: Real-time alert state tracking (ok/alerting/pending/no_data)
- **History**: Alert incident history and resolution tracking
- **Severity Levels**: Critical, high, warning, info classification

### 3. Data Source Integration
- **Multi-source Support**: Prometheus, Elasticsearch, Loki, MySQL, etc.
- **Health Monitoring**: Connection status and health checks
- **Testing**: Validate datasource connections before saving
- **Configuration**: Complete datasource configuration management

### 4. Pre-built SOC Dashboards

| Dashboard | Purpose | Data Sources |
|-----------|---------|--------------|
| **SOC Overview** | Main KPIs and system health | Prometheus |
| **Security Events** | Wazuh/Suricata alert analysis | Prometheus, Elasticsearch |
| **Network Traffic** | Suricata IDS/IPS monitoring | Prometheus, Elasticsearch |
| **Threat Intelligence** | MISP IOC statistics | Prometheus, Elasticsearch |
| **System Health** | Infrastructure metrics | Node Exporter |
| **Incident Response** | TheHive case management | Prometheus, Elasticsearch |

### 5. React Components & Hooks

#### Available Hooks:
- `useDashboards()` - Fetch and filter dashboards
- `useAlertRules()` - Monitor alert rules with state summary
- `useDataSources()` - Manage datasources with health status
- `useGrafanaStats()` - System-wide statistics
- `useGrafanaDashboard()` - Combined monitoring hook
- `useDashboardView()` - Embedded iframe view management

#### Component Features:
- Tabbed interface: Overview, Dashboards, Alerts, Data Sources, Pre-built
- Search and filtering capabilities
- Real-time data refresh
- Responsive design for SOC operations center
- Embedded dashboard viewing via iframe

## Installation & Configuration

### Prerequisites
- Node.js 18+ 
- Next.js 16+ (App Router)
- Grafana 10+ instance
- Access to SOC tools APIs (Wazuh, Suricata, MISP, TheHive)

### Environment Variables

```env
# Grafana Connection
GRAFANA_URL=https://grafana.algeria-soc.dz
GRAFANA_API_KEY=your-api-key-here
# Or use Basic Auth
GRAFANA_USERNAME=admin
GRAFANA_PASSWORD=secure-password

# Optional Settings
GRAFANA_TIMEOUT=30000
GRAFANA_ORG_ID=1
GRAFANA_DEFAULT_FOLDER=soc-dashboards
```

### Quick Start

1. **Install Dependencies**
```bash
cd modules/grafana
npm install
```

2. **Configure Client**
```typescript
import { initializeGrafanaClient } from './lib/grafana-client';

// Initialize with environment config
initializeGrafanaClient({
  url: process.env.GRAFANA_URL,
  apiKey: process.env.GRAFANA_API_KEY,
  timeout: 30000,
});
```

3. **Use in Components**
```tsx
import { GrafanaDashboard } from './components/GrafanaDashboard';

export default function SOCMonitoringPage() {
  return <GrafanaDashboard />;
}
```

## API Reference

### Dashboards API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grafana/dashboards` | List all dashboards |
| GET | `/api/grafana/dashboards/[uid]` | Get dashboard by UID |
| POST | `/api/grafana/dashboards` | Create new dashboard |
| PUT | `/api/grafana/dashboards/[uid]` | Update dashboard |
| DELETE | `/api/grafana/dashboards/[uid]` | Delete dashboard |
| POST | `/api/grafana/dashboards/import` | Import from JSON |

**Query Parameters (GET /dashboards):**
- `query` - Search string (matches title/tags)
- `tag` - Filter by tag (comma-separated)
- `type` - Filter by type (dash-db/dash-folder)
- `starred` - Show only starred (true/false)
- `limit` - Results per page (default: 50)
- `page` - Page number (default: 1)
- `sort` - Sort order (sortAlphaAsc/sortAlphaDesc)

### Alerts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grafana/alerts` | List alert rules |
| GET | `/api/grafana/alerts/history` | Get alert history |
| POST | `/api/grafana/alerts` | Create alert rule |
| PUT | `/api/grafana/alerts/[id]` | Update alert rule |
| DELETE | `/api/grafana/alerts/[id]` | Delete alert rule |
| POST | `/api/grafana/alerts/pause` | Pause/resume alerts |

### Data Sources API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grafana/datasources` | List datasources |
| GET | `/api/grafana/datasources/types` | Get available types |
| GET | `/api/grafana/datasources/summary` | Get statistics |
| GET | `/api/grafana/datasources/[id]` | Get datasource details |
| POST | `/api/grafana/datasources` | Create/test datasource |
| PUT | `/api/grafana/datasources/[id]` | Update datasource |
| DELETE | `/api/grafana/datasources/[id]` | Delete datasource |

## Provisioning Guide

### Automated Dashboard Deployment

The pre-built dashboards can be provisioned automatically using Grafana's provisioning system:

1. **Copy Dashboard JSON Files**
```bash
cp dashboards/*.json /etc/grafana/provisioning/dashboards/
```

2. **Create Provisioning Config** (`/etc/grafana/provisioning/dashboards/dashboard.yml`)
```yaml
apiVersion: 1
providers:
  - name: 'Algeria SOC'
    orgId: 1
    folder: 'SOC Dashboards'
    folderUid: soc-dashboards
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

3. **Restart Grafana**
```bash
sudo systemctl restart grafana-server
```

### Datasource Provisioning

Create `/etc/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1
datasources:
  - name: 'Prometheus - SOC Metrics'
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      httpMethod: POST
      manageAlerts: true
  
  - name: 'Elasticsearch - Security Logs'
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: '[wazuh-alerts-]YYYY.MM.DD'
    jsonData:
      timeField: '@timestamp'
      esVersion: '8.12.0'
  
  - name: 'Loki - Log Aggregation'
    type: loki
    access: proxy
    url: http://loki:3100
```

## Integration Points

### With Module 6 (Elasticsearch Log Aggregation)
- Security events dashboard queries Elasticsearch indices
- Alert correlation using log patterns
- Real-time log streaming via Loki integration

### With Wazuh SIEM
- Event ingestion through custom exporters
- Alert level mapping (critical/high/medium/low)
- Rule group categorization

### With Suricata IDS/IPS
- EVE JSON log parsing
- Geolocation visualization
- Protocol distribution analysis

### With MISP Threat Intelligence
- IOC synchronization
- Threat actor galaxy mapping
- Correlation statistics

### With TheHive SOAR
- Case lifecycle tracking
- Analyst workload distribution
- Resolution time metrics

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: ECONNREFUSED to Grafana server
```
**Solution**: Verify Grafana is running and URL is correct.

#### 2. Authentication Failed
```
Error: 401 Unauthorized
```
**Solution**: Check API key validity or credentials.

#### 3. Dashboard Import Fails
```
Error: Missing required field: title
```
**Solution**: Ensure JSON has valid schemaVersion and title.

#### 4. Datasource Test Fails
```
Error: Unable to connect to data source
```
**Solution**: Verify datasource URL and network connectivity.

### Debug Mode

Enable verbose logging:
```typescript
initializeGrafanaClient({
  url: process.env.GRAFANA_URL,
  apiKey: process.env.GRAFANA_API_KEY,
  debug: true, // Enable request/response logging
});
```

### Health Check Endpoint

Monitor Grafana connection health:
```bash
curl -X GET http://localhost:3000/api/grafana/datasources?action=summary
```

Expected response:
```json
{
  "success": true,
  "data": {
    "total": 7,
    "healthy": 6,
    "unhealthy": 1,
    "default": "Prometheus - SOC Metrics"
  }
}
```

## Development

### Running Tests
```bash
npm run test
```

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Mock Data Mode

For development without a live Grafana instance, all API routes include comprehensive mock data that simulates a real SOC environment with realistic security events, alerts, and infrastructure metrics.

## Security Considerations

1. **API Key Storage**: Never commit API keys to version control
2. **Role-Based Access**: Implement proper RBAC for dashboard access
3. **CORS Configuration**: Configure allowed origins for embedding
4. **Audit Logging**: Enable Grafana audit logging for compliance
5. **HTTPS Only**: Always use TLS in production

## License

This module is part of the Algeria National SOC Platform (2026-2030) open source initiative.

## Contributing

When adding new features:
1. Follow existing code patterns
2. Add TypeScript types for new structures
3. Include mock data for development
4. Update this README with changes
5. Test with both mock and live Grafana instances

---

**Module Maintainer**: Algeria National Cybersecurity Team  
**Last Updated**: February 2026  
**Version**: 1.0.0
