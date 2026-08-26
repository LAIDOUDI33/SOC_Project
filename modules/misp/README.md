# MISP Threat Intelligence Platform Module

**Algeria National SOC Platform 2026-2030**

## 📋 Overview

This module provides complete integration with **MISP (Malware Information Sharing Platform)**, the open-source threat intelligence platform used by governments, military, and financial organizations worldwide for:

- **IOC Management** - Collect, validate, and share Indicators of Compromise
- **Threat Actor Tracking** - Monitor APT groups via MITRE ATT&CK integration
- **Malware Analysis** - Correlate samples across organizations
- **Feed Aggregation** - Pull from 100+ community threat feeds
- **YARA Rule Generation** - Auto-generate detection rules from intelligence

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                              │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │ MISPDashboard │ │ React Hooks  │ │   API Routes           │  │
│  │  .tsx        │ │ use-misp.ts  │ │ /api/misp/*            │  │
│  └──────────────┘ └──────────────┘ └───────────┬────────────┘  │
└────────────────────────────────────────────────┼───────────────┘
                                                 │
┌────────────────────────────────────────────────▼───────────────┐
│                    MISP API Client                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ misp-client.ts                                          │   │
│  │ • Authentication & Session Management                   │   │
│  │ • Event CRUD Operations                                 │   │
│  │ • Attribute/IOC Management                             │   │
│  │ • Galaxy/Cluster Lookup                                │   │
│  │ • Feed Synchronization                                 │   │
│  │ • YARA Rule Generation                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              MISP Server (Docker)                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ MISP App │  │ MariaDB  │  │  Redis   │                     │
│  │ :8082    │  │ :3307    │  │ :6380    │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Module Structure

```
modules/misp/
├── types/
│   └── misp.types.ts          # TypeScript type definitions
├── lib/
│   └── misp-client.ts         # Complete MISP REST API client
├── api/
│   ├── events/route.ts        # Event management endpoints
│   ├── iocs/route.ts          # IOC search & validation
│   ├── galaxies/route.ts      # Threat actor/galaxy data
│   ├── feeds/route.ts         # Feed sync management
│   └── yara/route.ts          # YARA rule generation
├── hooks/
│   └── use-misp.ts            # React hooks for data fetching
├── components/
│   └── MISPDashboard.tsx      # Full threat intelligence UI
└── README.md                  # This file
```

## 🔧 Configuration

### Environment Variables

```bash
# MISP Connection
MISP_URL=https://misp.algeria-soc.dz
MISP_API_KEY=your-misp-api-key-here

# MISP Database (for Docker)
MISP_MYSQL_HOST=soc-misp-db
MISP_MYSQL_PORT=3306
MISP_MYSQL_USER=misp
MISP_MYSQL_PASSWORD=secure-password-here
MISP_MYSQL_ROOT_PASSWORD=root-password-here
MISP_MYSQL_DB=misp

# MISP Administration
MISP_ADMIN_EMAIL=admin@algeria-soc.dz
MISP_ADMIN_PASSPHRASE=secure-admin-password
MISP_BASEURL=https://misp.algeria-soc.dz

# MISP Redis Cache
MISP_REDIS_HOST=soc-misp-redis
MISP_REDIS_PORT=6379
MISP_REDIS_PASSWORD=redis-password

# Ports
MISP_PORT=8082
MISP_SSL_PORT=8443
MISP_MYSQL_PORT=3307
```

### Docker Compose Services

The module adds three services to the stack:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `misp` | `misp/misp:latest` | 8082/8443 | Main MISP application |
| `misp-db` | `mariadb:10.11` | 3307 | MISP database |
| `misp-redis` | `redis:7-alpine` | Internal | MISP cache |

## 🚀 Quick Start

### 1. Deploy MISP Stack

```bash
cd production/docker

# Copy environment template
cp .env.example .env
# Edit .env with your MISP credentials

# Start MISP services
docker compose up -d misp misp-db misp-redis

# Check status
docker compose ps
```

### 2. Initialize MISP

After first deployment, access MISP at `https://your-server:8082` and:
1. Login with admin credentials from `.env`
2. Create synchronization keys in **Event Actions > List Auth Keys**
3. Configure warninglists in **Administration > Warninglists**
4. Set up initial feeds

### 3. Connect Application

```typescript
// In your application initialization
import { initializeMISPClient } from '@/modules/misp/lib/misp-client';

initializeMISPClient({
  url: process.env.MISP_URL!,
  apiKey: process.env.MISP_API_KEY!,
  debug: process.env.NODE_ENV === 'development',
});
```

## 📡 API Endpoints

### Events (`/api/misp/events`)

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | List recent events (default: last 7 days) |
| GET | action=search | Search events with filters |
| GET | action=recent | Get events from last N days |
| GET | action=statistics | Get dashboard statistics |
| GET | action=timeline | Get event timeline data |
| GET | action=single | Get single event by ID/UUID |
| POST | action=create | Create new event |
| POST | action=fromAlert | Convert security alert to event |
| POST | action=publish | Publish event to sharing partners |
| POST | action=update | Update event metadata |
| POST | action=delete | Delete event |
| POST | action=addTag | Attach tag to event |
| POST | action=removeTag | Remove tag from event |

**Search Parameters:**
- `value` - Search in event info/attributes
- `type` - Filter by attribute type
- `category` - Filter by attribute category
- `tag` - Filter by tag name
- `threatLevel` - Filter by threat level (1-4)
- `published` - Filter by published status
- `analysis` - Filter by analysis status (0-2)
- `last` - Time window (e.g., "7d", "30d")

### IOCs (`/api/misp/iocs`)

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | List all IOCs (to_ids=true) |
| GET | action=search | Search IOCs with filters |
| GET | action=byType | Get IOCs of specific type |
| GET | action=byEvent | Get IOCs for specific event |
| GET | action=validate | Validate values against warninglists |
| GET | action=sightings | Get sightings for attribute |
| GET | action=trending | Get trending/popular IOCs |
| POST | action=add | Add IOC to event |
| POST | action=batchAdd | Add multiple IOCs at once |
| POST | action=update | Update existing IOC |
| POST | action=delete | Delete IOC |
| POST | action=reportSighting | Report IOC sighting |

**Supported IOC Types:**
- Network: `ip-src`, `ip-dst`, `domain`, `url`, `hostname`, `as`
- File: `md5`, `sha1`, `sha256`, `filename`, `malware-sample`
- Email: `email-src`, `email-dst`, `email-subject`
- Other: `mutex`, `regkey`, `yara`, `sigma`, `vulnerability`

### Galaxies (`/api/misp/galaxies`)

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | Galaxy summary (counts + top actors) |
| GET | action=all | List all available galaxies |
| GET | action=single | Get specific galaxy by type |
| GET | action=threatActors | MITRE ATT&CK intrusion sets |
| GET | action=mitreTactics | MITRE ATT&CK tactics |
| GET | action=malware | Malware families galaxy |
| GET | action=tools | Tools/utilities galaxy |
| GET | action=search | Search clusters across galaxies |

**Galaxy Types:**
- `mitre-intrusion-set` - Threat actors/APT groups
- `mitre-attack-pattern` - ATT&CK techniques/tactics
- `mitre-malware` - Malware families
- `mitre-tool` - Attacker tools
- `threat-actor` - Generic threat actors
- `ransomware` - Ransomware tracking
- `csirt` - CSIRT taxonomies

### Feeds (`/api/misp/feeds`)

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | Feed summary |
| GET | action=list | List all configured feeds |
| GET | action=preview | Preview feed content before import |
| GET | action=servers | List sync servers |
| GET | action=status | Feed/sync status overview |
| POST | action=fetch | Fetch/update single feed |
| POST | action=cacheAll | Cache all enabled feeds |
| POST | action=import | Import events from feed |
| POST | action=pull | Pull from remote server |
| POST | action=push | Push to remote server |

### YARA Rules (`/api/misp/yara`)

| Method | Action | Description |
|--------|--------|-------------|
| GET | action=generate | Generate YARA rule from event |
| GET | action=export | Download ruleset as .yar file |
| POST | action=batchGenerate | Generate rules for multiple events |
| POST | action=customize | Generate with custom options |

**Generation Options:**
- `includeHashes` - Include MD5/SHA1/SHA256 strings
- `includeStrings` - Include domain/hostname strings
- `includeIPs` - Include IP address patterns
- `includeDomains` - Include URL regex patterns
- `maxSize` - Maximum rule size limit

## 🎨 UI Components

### MISPDashboard

The main dashboard component with 6 tabs:

1. **Overview** - Key metrics, threat distribution, top actors, trending IOCs
2. **Events** - Event list with search, detail panel, actions
3. **IOCs** - IOC table with filtering, validation, export
4. **Galaxies** - Threat actor browser, MITRE ATT&CK viewer
5. **Feeds** - Feed management, sync status, import controls
6. **YARA** - Rule generator with options, output viewer

### Usage Example

```tsx
import MISPDashboard from '@/modules/misp/components/MISPDashboard';

// In your page or layout
export default function ThreatIntelPage() {
  return <MISPDashboard />;
}
```

## 🔌 React Hooks

### Data Fetching Hooks

```tsx
import {
  useMISPStatistics,
  useRecentMISPEvents,
  useMISPIOCs,
  useThreatActors,
  useMITRETactics,
  useMISPFeeds,
  useYARARules,
  useMISPHealth,
} from '@/modules/misp/hooks/use-misp';

function MyComponent() {
  // Dashboard statistics (auto-refreshes every 5 min)
  const { data: stats, loading } = useMISPStatistics('30d');

  // Recent events
  const { data: events, refetch } = useRecentMISPEvents(7);

  // IOC search with validation
  const { data: iocs, validateIOCs } = useMISPIOCs();

  // Threat actors from MITRE ATT&CK
  const { data: actors } = useThreatActors();

  // Health check (auto-refreshes every minute)
  const { data: health } = useMISPHealth();
}
```

### Hook Reference

| Hook | Return Type | Auto-Refresh | Description |
|------|------------|--------------|-------------|
| `useMISPStatistics()` | `MISPStatistics` | 5 min | Dashboard metrics |
| `useRecentMISPEvents(days)` | `MISPEvent[]` | Manual | Last N days of events |
| `useMISPEvent(eventId)` | `MISPEvent` | Manual | Single event detail |
| `useMIPTimeline(days)` | `TimelinePoint[]` | Manual | Event timeline data |
| `useMISPIOCs()` | `MISPAttribute[]` | Manual | IOC search & validation |
| `useTrendingIOCs()` | `IOC[]` | Manual | Popular indicators |
| `useThreatActors()` | `GalaxyCluster[]` | Manual | APT group listing |
| `useMITRETactics()` | `GalaxyCluster[]` | Manual | ATT&CK tactics |
| `useGalaxies()` | Summary object | Manual | Galaxy overview |
| `useMISPFeeds()` | `MISPFeed[]` | Manual | Feed configuration |
| `useSyncServers()` | `MISPServer[]` | Manual | Sync servers |
| `useYARARules(eventId)` | `YARARule` | Manual | Generated rule |
| `useMISPHealth()` | Health object | 1 min | Server health |

## 🔒 Security Considerations

### API Key Management

1. Use environment variables only - never hardcode keys
2. Rotate keys quarterly via MISP admin interface
3. Create separate keys for read/write operations
4. Audit key usage in MISP logs

### Network Security

- MISP runs on internal network (`soc-backend`)
- External access through Nginx reverse proxy only
- SSL/TLS termination at Nginx layer
- Rate limiting configured in Nginx

### Data Validation

- All IOCs validated against warninglists before action
- Input sanitization on all user inputs
- CORS restricted to platform domains
- CSRF protection on state-changing operations

### Recommended Warninglists

Enable these critical warninglists:
- `list-of-ip-addresses.csv` - Common infrastructure IPs
- `list-of-domain-names.csv` - Popular domains (Google, CDN)
- `list-of-file-hash-md5-sha1.csv` - Known benign files
- `list-of-url.csv` - Common URLs

## 🔄 Integration Examples

### Wazuh → MISP Alert Conversion

```typescript
import { getMISPClient } from '@/modules/misp/lib/misp-client';

async function convertWazuhAlertToMISP(alert: WazuhAlert) {
  const client = getMISPClient();

  return await client.createEventFromAlert({
    title: alert.rule?.description || 'Security Alert',
    description: alert.full_log || '',
    severity: alert.rule?.level > 10 ? 'high' : 'medium',
    source: 'Wazuh SIEM',
    iocs: [
      // Extract IOCs from alert data
      ...(alert.srcip ? [{ type: 'ip-src', value: alert.srcip, category: 'Network activity' }] : []),
      ...(alert.data?.ssl?.['certificate.subject'] ? [{ type: 'hostname', value: alert.data.ssl['certificate.subject'], category: 'Network activity' }] : []),
    ],
    tags: ['wazuh', 'auto-imported'],
  });
}
```

### TheHive → MISP Case Sync

```typescript
import { getMISPClient } from '@/modules/misp/lib/misp-client';

async function syncCaseToMISP(thehiveCase: TheHiveCase) {
  const client = getMISPClient();

  // Create event from case
  const event = await client.createEvent({
    info: `[TheHive] ${thehiveCase.title}`,
    threat_level_id: thehiveCase.severity === 'critical' ? 1 :
                      thehiveCase.severity === 'high' ? 2 : 3,
    analysis: '1', // Ongoing
    tags: [`thehive-case:${thehiveCase.id}`],
  });

  // Add observables as IOCs
  if (thehiveCase.observables) {
    await client.addAttributesBatch(event.id,
      thehiveCase.observables.map(obs => ({
        type: obs.dataType as AttributeType,
        value: obs.data,
        category: 'External analysis',
        to_ids: true,
      }))
    );
  }

  return event;
}
```

### Automated Feed Sync Job

```typescript
// Can be run as cron job every 6 hours
async function syncAllFeeds() {
  const client = getMISPClient();

  console.log('Starting feed synchronization...');

  // Cache all enabled feeds
  const cacheResult = await client.cacheFeeds();
  console.log(`Cached: ${cacheResult.cached}/${cacheResult.total}`);

  // Import from high-priority feeds
  const priorityFeeds = ['circl-osint', 'malware-bazaar', 'threatfox'];
  for (const feedName of priorityFeeds) {
    try {
      const feeds = await client.getFeeds();
      const feed = feeds.find(f => f.name.includes(feedName));
      if (feed) {
        await client.importFeedEvents(feed.id);
        console.log(`Imported from: ${feed.name}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${feedName}:`, error);
    }
  }

  console.log('Feed synchronization complete.');
}
```

## 📊 Monitoring & Metrics

### Key Performance Indicators

Track these KPIs for threat intel effectiveness:

| Metric | Target | Source |
|--------|--------|--------|
| Event processing time | < 500ms | API logs |
| Feed sync success rate | > 95% | Feed status |
| IOC false positive rate | < 5% | Sightings |
| Alert-to-event conversion | > 80% | Automation stats |
| YARA rule coverage | > 70% known malware | Detection rate |

### Logging

The client outputs debug logs when enabled:

```typescript
initializeMISPClient({
  url: process.env.MISP_URL!,
  apiKey: process.env.MISP_API_KEY!,
  debug: true,  // Enable verbose logging
});
```

## 🛠️ Troubleshooting

### Common Issues

**Connection Timeout**
```
Error: Request timed out after 30000ms
```
- Check MISP server is running: `docker compose ps misp`
- Verify network connectivity between containers
- Increase timeout for large queries

**Authentication Failed**
```
MISPAuthenticationError: Invalid MISP API key
```
- Verify API key in `.env` matches MISP admin panel
- Check key hasn't expired or been revoked
- Ensure proper URL format (no trailing slash)

**Rate Limiting**
```
MISPRateLimitError: Rate limited. Retry after 60s
```
- Implement exponential backoff in client code
- Reduce query frequency
- Contact MISP admin about rate limits

**Warninglist Validation Blocking All IOCs**
- Review enabled warninglists
- Some may be too broad for your environment
- Customize warninglist configurations

### Debug Commands

```bash
# Check MISP container status
docker compose logs --tail=50 misp

# Test MISP connectivity
curl -k -H "Authorization: YOUR_KEY" https://localhost:8082/servers/getVersion

# Database connectivity
docker compose exec misp-db mysqladmin ping -u misp -p

# Redis cache status
docker compose exec misp-redis redis-cli INFO stats
```

## 📚 Additional Resources

- [MISP Official Documentation](https://www.misp-project.org/documentation/)
- [MISP REST API Reference](https://www.misp-project.org/openapi/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [YARA Documentation](https://yara.readthedocs.io/)
- [First Response CIRCL Feeds](https://www.circl.lu/doc/misp/feed-osints/)

## 🤝 Contributing

When extending this module:

1. Follow existing TypeScript patterns
2. Add comprehensive JSDoc comments
3. Update type definitions for new fields
4. Test with mock data before live MISP
5. Handle errors gracefully with fallbacks

---

**Module Version:** 1.0.0  
**Last Updated:** 2026  
**Maintainer:** Algeria National SOC Team
