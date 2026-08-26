# 📦 MODULE 4: MISP Threat Intelligence Platform Integration

## 🇩🇿 National SOC Production Platform - Complete MISP Integration

---

## ✅ **Module Status: COMPLETE**

This module provides comprehensive integration with **MISP (Malware Information Sharing Platform)** for threat intelligence management and IOC sharing.

---

## 🏗️ **What's Included**

### **Core Components**

| Component | Type | Purpose |
|-----------|------|---------|
| **MISPClient** | TypeScript Class | Complete API client for all operations |
| **API Routes** | Next.js Routes | RESTful endpoints for events, IOCs, indicators |
| **React Hooks** | Custom Hooks | Data fetching and state management |
| **Dashboard** | React Component | Full threat intelligence UI |

### **Features Implemented**

#### 📋 **Event Management**
- ✅ Create threat events with full metadata
- ✅ Search and filter events
- ✅ Publish to communities
- ✅ Threat level classification (1-4)
- ✅ Analysis status tracking (Initial → Ongoing → Completed)
- ✅ TLP distribution control

#### 🔍 **IOC/Attribute Management**
- ✅ Search indicators across all events
- ✅ Real-time indicator lookup with risk scoring
- ✅ Warning list integration (false positive detection)
- ✅ Batch IOC creation
- ✅ Automatic category guessing
- ✅ Type validation (IP, domain, hash, URL, etc.)

#### 👥 **Threat Actor Intelligence**
- ✅ Galaxy framework integration
- ✅ MITRE ATT&CK mapping
- ✅ Threat actor profiles
- ✅ APT group tracking (APT28, APT29, Lazarus, etc.)
- ✅ Galaxy cluster browsing

#### ⚠️ **Warning Lists**
- ✅ Check values against known false positives
- ✅ Multiple warning list support
- ✅ Context-aware recommendations

#### 📊 **YARA Rule Generation**
- ✅ Auto-generate YARA rules from IOCs
- ✅ Support for hashes, domains, IPs, URLs
- ✅ Proper rule formatting and metadata

#### 📈 **Analytics & Statistics**
- ✅ Event statistics dashboard
- ✅ IOC type distribution
- ✅ Top threat tags analysis
- ✅ Feed status monitoring

---

## 📁 **File Structure**

```
modules/misp/
├── api/
│   ├── events/route.ts           # Event CRUD & search
│   ├── indicators/route.ts       # IOC search, check, add
│   ├── health/route.ts          # Connection health check
│   ├── statistics/route.ts       # Dashboard statistics
│   └── galaxies/route.ts         # Threat actors & MITRE ATT&CK
├── components/
│   └── MISPDashboard.tsx         # Full TI platform UI
├── hooks/
│   └── use-misp.ts              # React hooks for data
├── lib/
│   └── misp-client.ts           # Main API client class
├── types/
│   └── misp.types.ts            # TypeScript definitions
└── README.md                    # This file
```

---

## 🔌 **API Endpoints**

### **Events**

```
GET  /api/integrations/misp/events?days=7&threat_level=1&limit=20
POST /api/integrations/misp/events { info, threat_level_id, tags, attributes }
```

### **Indicators/IOCs**

```
GET  /api/integrations/misp/indicators?value=1.2.3.4&type=ip-dst    # Single check
GET  /api/integrations/misp/indicators?type=ip-dst&limit=100     # Search
POST /api/integrations/misp/indicators { eventId, iocs: [...] }  # Add IOCs
```

**Indicator Check Response:**
```json
{
  "indicator": "185.220.101.xxx",
  "found": true,
  "isWarningList": false,
  "matches": [...],
  "matchCount": 5,
  "riskScore": 85,
  "recommendation": "HIGH RISK - Immediate investigation recommended."
}
```

### **Health & Statistics**

```
GET /api/integrations/misp/health        # Connection status
GET /api/integrations/misp/statistics    # Dashboard data
GET /api/integrations/misp/galaxies?type=threat-actor  # Threat actors
GET /api/integrations/misp/galaxies?type=mitre-attack   # MITRE ATT&CK
```

---

## 🎯 **Quick Start**

```typescript
import { getMISPClient } from '@/modules/misp/lib/misp-client';

const misp = getMISPClient();

// Check an indicator
const result = await misp.checkIndicator('185.220.101.xxx');
console.log(`Risk Score: ${result.riskScore}`);

// Create a new threat event
const event = await misp.createEvent({
  info: 'APT28 Campaign - Diplomatic Targets',
  threat_level_id: 1,
  tags: ['apt28', 'spearphish', 'diplomatic'],
});

// Add IOCs to event
await misp.batchAddIOCs(event.id, [
  { type: 'ip-dst', value: '185.220.101.xxx' },
  { type: 'domain', value: 'evil-example.com' },
  { type: 'sha256', value: 'abc123...' },
]);

// Generate YARA rule from IOCs
const yaraRule = await misp.generateYARARule({
  eventName: 'APT28_Campaign_2026',
  author: 'SOC Analyst',
  description: 'Auto-generated from event',
  ips: ['185.220.101.xxx'],
  domains: ['evil-example.com'],
});
console.log(yaraRule);
```

---

## 🔗 **Integration with Other Modules**

### **Wazuh → MISP (Alert Enrichment)**

```typescript
import { getWazuhClient } from './wazuh';
import { getMISPClient } from './misp';

const wazuh = getWazuhClient();
const misp = getMISPClient();

// Get critical alerts
const alerts = await wazuh.getCriticalAlerts(10);

for (const alert of alerts) {
  // Enrich with threat intel
  if (alert.srcip) {
    const intel = await misp.checkIndicator(alert.srcip);
    
    if (intel.found) {
      alert.threatIntel = intel;
      alert.enriched = true;
      
      // Report sighting to MISP
      await misp.reportSighting({
        value: alert.srcip,
        source: 'Wazuh-SOC',
      });
    }
  }
}
```

### **TheHive ↔ MISP (Case ↔ Event Sync)**

```typescript
import { getTheHiveClient } from './thehive';
import { getMISPClient } from './misp';

const hive = getTheHiveClient();
const misp = getMISPClient();

// Create linked case and event
const case_ = await hive.createCaseFromAlert(wazuhAlert);
const event = await misp.createEvent({
  info: case_.title,
  tags: case_.tags,
});

// Sync IOCs between platforms
const hiveIOCs = await hive.getObservables(case_.id);
for (const ioc of hiveIOCs) {
  await misp.addAttribute(event.id, {
    type: ioc.dataType,
    value: ioc.data,
  });
}
```

---

## 🖥️ **Dashboard Features**

The `MISPDashboard` component provides:

1. **Overview Tab**: Recent events + Top tags + IOC types
2. **Events Tab**: Full event browser with filters
3. **Threat Actors Tab**: Known adversary profiles
4. **IOC Types Tab**: Indicator distribution analytics
5. **Feeds Tab**: Feed status and configuration

**Special Features:**
- **Indicator Lookup Dialog**: Real-time IOC checking with risk scoring
- **New Event Dialog**: Quick event creation wizard
- **Risk Scoring**: 0-100 score based on matches and recency
- **Warning List Integration**: Automatic false positive detection

---

**Status**: ✅ **READY FOR PRODUCTION INTEGRATION**

**Next**: Proceed to **MODULE 5: Suricata IDS/IPS**
