# 📦 MODULE 5: Suricata IDS/IPS Integration

## 🇩🇿 National SOC Production Platform - Complete Suricata Integration

---

## ✅ **Module Status: COMPLETE**

This module provides comprehensive integration with **Suricata** network intrusion detection system for real-time threat monitoring.

---

## 🏗️ **What's Included**

### **Core Components**

| Component | Type | Purpose |
|-----------|------|---------|
| **SuricataClient** | TypeScript Class | Complete API client for IDS operations |
| **API Routes** | Next.js Routes | RESTful endpoints for alerts, rules, stats |
| **React Hooks** | Custom Hooks | Data fetching and state management |
| **Dashboard** | React Component | Full IDS monitoring UI |

### **Features Implemented**

#### 🔍 **Alert Management**
- ✅ Alert ingestion from EVE JSON format
- ✅ Real-time alert streaming support
- ✅ Severity-based filtering (low/medium/high/critical)
- ✅ Action-based categorization (allowed/blocked/dropped/rejected)
- ✅ Source/Destination IP tracking
- ✅ Protocol-specific alerts (HTTP, DNS, TLS)

#### 📋 **Rule Management**
- ✅ List all active detection rules
- ✅ Add new custom rules
- ✅ Enable/disable rules by SID
- ✅ Ruleset update from external sources
- ✅ Rule statistics and metadata

#### 📊 **Protocol Analysis**
- ✅ HTTP request/response analysis
- ✅ DNS query monitoring
- ✅ TLS/SSL connection inspection
- ✅ File extraction event handling
- ✅ Network flow correlation

#### 📈 **Monitoring & Statistics**
- ✅ Performance metrics (packets/sec, drops)
- ✅ Uptime monitoring
- ✅ Top signature/rule triggers
- ✅ IP address analytics (source/destination)
- ✅ Protocol distribution stats
- ✅ Action distribution (allowed vs blocked)

---

## 📁 **File Structure**

```
modules/suricata/
├── api/
│   ├── alerts/route.ts           # Alert search & retrieval
│   ├── rules/route.ts           # Rule management CRUD
│   ├── health/route.ts          # Connection health check
│   └── statistics/route.ts       # Dashboard data
├── components/
│   └── SuricataDashboard.tsx    # Full IDS monitoring UI
├── hooks/
│   └── use-suricata.ts          # React hooks for data
├── lib/
│   └── suricata-client.ts       # Main API client class
├── types/
│   └── suricata.types.ts        # TypeScript definitions
└── README.md                    # This file
```

---

## 🔌 **API Endpoints**

### **Alerts**

```
GET /api/integrations/suricata/alerts?hours=24&severity=high&limit=100
```

**Query Parameters:**
- `limit` - Results per page
- `offset` - Pagination offset
- `severity` - Filter by severity (low/medium/high)
- `action` - Filter by action (allowed/blocked/dropped)
- `src_ip` / `dst_ip` - IP filters
- `protocol` - Protocol filter (TCP/UDP/ICMP)
- `hours` - Time window in hours

### **Rules**

```
GET  /api/integrations/suricata/rules    # List all rules
POST /api/integrations/suricata/rules    # Add new rule { rule: "..." }
```

### **Health & Statistics**

```
GET /api/integrations/suricata/health      # System status
GET /api/integrations/suricata/statistics  # Dashboard summary
```

---

## 🎯 **Quick Start**

```typescript
import { getSuricataClient } from '@/modules/suricata/lib/suricata-client';

const suricata = getSuricataClient();

// Get recent alerts
const alerts = await suricata.getRecentAlerts(24);
console.log(`Found ${alerts.length} alerts today`);

// Check system health
const health = await suricata.healthCheck();
console.log(`Suricata v${health.version} running: ${health.running}`);

// Get dashboard summary
const summary = await suricata.getDashboardSummary();
console.log(`Critical alerts today: ${summary.alerts.criticalToday}`);
```

---

## 🔗 **Integration with Other Modules**

### **Suricata → TheHive (Case Creation)**

```typescript
// Auto-create cases from critical IDS alerts
const criticalAlerts = await suricata.getCriticalAlerts(10);

for (const alert of criticalAlerts) {
  if (alert.alert.severity === 'critical') {
    await hive.createCase({
      title: `[IDS] ${alert.alert.signature}`,
      description: `
Source: ${alert.src_ip}:${alert.src_port}
Dest: ${alert.dst_ip}:${alert.dst_port}
Signature: ${alert.alert.signature}
Action: ${alert.alert.action}
      `,
      severity: 1,
      tags: ['suricata', 'ids', alert.proto?.toLowerCase()],
    });
  }
}
```

### **Suricata ↔ MISP (IOC Enrichment)**

```typescript
// Check destination IPs against MISP
for (const alert of alerts) {
  if (alert.dst_ip) {
    const intel = await misp.checkIndicator(alert.dst_ip);
    
    if (intel.found) {
      // Enrich alert with threat intelligence
      alert.threatIntel = intel;
      
      // Report sighting to MISP
      await misp.reportSighting({
        value: alert.dst_ip,
        source: 'Suricata-SOC',
      });
    }
  }
}
```

---

## 🖥️ **Dashboard Features**

The `SuricataDashboard` component provides:

1. **Overview Tab**: Top signatures + Traffic analysis
2. **Alerts Tab**: Recent IDS alert feed
3. **Signatures Tab**: Most triggered rules ranking
4. **Traffic Analysis Tab**: Top source/destination IPs
5. **Rules Tab**: Rule management + statistics

**Key Metrics Displayed:**
- Alerts per day/week
- Critical alert count
- Active rules count
- Packets per second throughput
- Protocol distribution
- Action breakdown (allowed vs blocked)

---

**Status**: ✅ **READY FOR PRODUCTION INTEGRATION**

**Next**: Proceed to **MODULE 6: Elasticsearch Log Aggregation**
