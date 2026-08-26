# 📦 MODULE 2: Wazuh SIEM/EDR Integration

## 🇩🇿 National SOC Production Platform - Complete Wazuh Integration

---

## ✅ **Module Status: COMPLETE**

This module provides comprehensive integration with **Wazuh SIEM/EDR** platform for security monitoring, alert management, and endpoint detection.

---

## 🏗️ **What's Included**

### **Core Components**

| Component | Type | Purpose |
|-----------|------|---------|
| **WazuhClient** | TypeScript Class | Complete API client for all Wazuh operations |
| **API Routes** | Next.js Routes | RESTful endpoints for frontend consumption |
| **React Hooks** | Custom Hooks | Data fetching and state management |
| **Dashboard** | React Component | Full monitoring dashboard UI |

### **Features Implemented**

#### 🔍 **Alert Management**
- ✅ Search alerts with advanced filtering
- ✅ Real-time alert streaming (SSE-like)
- ✅ Severity-based categorization
- ✅ MITRE ATT&CK mapping support
- ✅ Alert aggregation for analytics

#### 💻 **Agent Monitoring**
- ✅ List all agents with status
- ✅ Agent health tracking
- ✅ Active/disconnected/never-connected stats
- ✅ Agent key management
- ✅ Remote restart capability

#### 🛡️ **Security Compliance (SCA)**
- ✅ PCI-DSS compliance scoring
- ✅ GDPR compliance scoring
- ✅ HIPAA, NIST, TSC frameworks
- ✅ Per-agent compliance details
- ✅ Failed check remediation guidance

#### 📁 **File Integrity Monitoring (FIM)**
- ✅ File change detection (add/modify/delete)
- ✅ Hash comparison (MD5, SHA1, SHA256)
- ✅ Permission change tracking
- ✅ Suspicious file identification
- ✅ Cross-agent file event correlation

#### 🐛 **Vulnerability Detection**
- ✅ CVE vulnerability listing
- ✅ CVSS scoring
- ✅ Severity classification
- ✅ Package-level details
- ✅ Organization-wide summary

#### ⚡ **Active Response**
- ✅ Host isolation (network block)
- ✅ Host unisolation
- ✅ Agent restart commands
- ✅ Custom command execution

#### 🏥 **Health Monitoring**
- ✅ Manager daemon status
- ✅ Agent connectivity overview
- ✅ Alert volume statistics
- ✅ System health checks

---

## 📁 **File Structure**

```
modules/wazuh/
├── api/
│   ├── alerts/route.ts           # Alert search & actions
│   ├── agents/route.ts           # Agent listing & management
│   ├── health/route.ts           # Health check endpoint
│   ├── compliance/route.ts       # SCA compliance scores
│   ├── fim/route.ts              # File integrity events
│   └── vulnerabilities/route.ts  # Vulnerability data
├── components/
│   └── WazuhDashboard.tsx        # Full dashboard component
├── hooks/
│   └── use-wazuh.ts             # React hooks for data fetching
├── lib/
│   └── wazuh-client.ts          # Main API client class
├── types/
│   └── wazuh.types.ts           # TypeScript type definitions
└── README.md                     # This file
```

---

## 🎯 **Quick Start**

```typescript
// Import the client
import { getWazuhClient } from '@/modules/wazuh/lib/wazuh-client';

// Get singleton instance
const client = getWazuhClient();

// Fetch recent alerts
const alerts = await client.getRecentAlerts(24);

// Check system health
const health = await client.healthCheck();

// Isolate a compromised host
await client.isolateHost('agent-001');
```

---

## 📊 **Dashboard Preview**

The WazuhDashboard component provides:

- **Overview Tab**: Critical alerts + Recent FIM events
- **Alerts Tab**: Full alert feed with severity badges
- **Agents Tab**: Status breakdown with coverage rate
- **Compliance Tab**: PCI-DSS, GDPR, HIPAA scores
- **FIM Tab**: File changes with suspicious flagging

---

**Status**: ✅ **READY FOR PRODUCTION INTEGRATION**

**Next**: Proceed to **MODULE 3: TheHive SOAR Integration**
