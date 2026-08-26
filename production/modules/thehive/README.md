# 📦 MODULE 3: TheHive SOAR/Case Management Integration

## 🇩🇿 National SOC Production Platform - Complete TheHive Integration

---

## ✅ **Module Status: COMPLETE**

This module provides comprehensive integration with **TheHive SOAR** platform for incident response, case management, and security orchestration.

---

## 🏗️ **What's Included**

### **Core Components**

| Component | Type | Purpose |
|-----------|------|---------|
| **TheHiveClient** | TypeScript Class | Complete API client for all operations |
| **API Routes** | Next.js Routes | RESTful endpoints for case/task/observable management |
| **React Hooks** | Custom Hooks | Data fetching and state management |
| **Dashboard** | React Component | Full case management UI |

### **Features Implemented**

#### 📋 **Case Management**
- ✅ Create cases manually or from alerts
- ✅ Search and filter cases
- ✅ Update case status and details
- ✅ Resolve/close cases
- ✅ Merge duplicate cases
- ✅ Severity and TLP/PAP classification

#### ✅ **Task Management**
- ✅ Create tasks for investigations
- ✅ Standard investigation playbook
- ✅ Task status tracking (Waiting → InProgress → Completed)
- ✅ Task assignment to analysts
- ✅ Task ordering and grouping

#### 🔍 **Observable/IOC Management**
- ✅ Add observables (IPs, domains, hashes, URLs, emails)
- ✅ Automatic IOC extraction from alerts
- ✅ IOC sighting tracking
- ✅ Batch observable creation
- ✅ Data type categorization

#### 🤖 **Automation**
- ✅ Automated case creation from Wazuh alerts
- ✅ Auto-generate investigation playbook tasks
- ✅ Auto-extract IOCs from alert data
- ✅ Bulk case creation

#### 📊 **Analytics & Metrics**
- ✅ Case statistics dashboard
- ✅ Severity distribution charts
- ✅ Cases over time trends
- ✅ Resolution time metrics
- ✅ Open/closed case counts

---

## 📁 **File Structure**

```
modules/thehive/
├── api/
│   ├── cases/route.ts           # Case CRUD operations
│   ├── tasks/route.ts           # Task management
│   ├── observables/route.ts     # Observable/IOC management
│   └── metrics/route.ts         # Dashboard metrics
├── components/
│   └── TheHiveDashboard.tsx     # Full dashboard component
├── hooks/
│   └── use-thehive.ts          # React hooks for data fetching
├── lib/
│   └── thehive-client.ts       # Main API client class
├── types/
│   └── thehive.types.ts        # TypeScript type definitions
└── README.md                    # This file
```

---

## 🔌 **API Endpoints**

### **Cases**

```
GET  /api/integrations/thehive/cases?status=Open&severity=1&limit=20
POST /api/integrations/thehive/cases { title, description, severity, ... }
```

**Create Case from Alert:**
```json
POST /api/integrations/thehive/cases
{
  "fromAlert": true,
  "alert": { /* Wazuh alert object */ },
  "createPlaybook": true
}
```

### **Tasks**

```
GET  /api/integrations/thehive/tasks/:caseId
POST /api/integrations/thehive/tasks/:caseId { title, description, assignee }
```

### **Observables**

```
GET  /api/integrations/thehive/observables/:caseId
POST /api/integrations/thehive/observables/:caseId { dataType, data, tags }
```

**Batch Add:**
```json
POST /api/integrations/thehive/observables/:caseId
{
  "observables": [
    { "dataType": "ip", "data": "1.2.3.4" },
    { "dataType": "domain", "data": "evil.com" }
  ]
}
```

### **Metrics/Dashboard**

```
GET /api/integrations/thehive/metrics
```

---

## 🎯 **Quick Start**

```typescript
import { getTheHiveClient } from '@/modules/thehive/lib/thehive-client';

const hive = getTheHiveClient();

// Create a new case
const newCase = await hive.createCase({
  title: 'Security Incident - Phishing Attack',
  description: 'Multiple users reported phishing emails...',
  severity: 2,
  tags: ['phishing', 'email', 'user-report'],
});

// Add investigation playbook
const tasks = await hive.createInvestigationPlaybook(newCase.id);

// Extract IOCs from alert
const observables = await hive.extractObservablesFromAlert(newCase.id, wazuhAlert);
```

---

## 🔄 **Integration with Wazuh**

Automated incident response workflow:

```typescript
import { getWazuhClient } from './wazuh';
import { getTheHiveClient } from './thehive';

const wazuh = getWazuhClient();
const hive = getTheHiveClient();

// Get critical alerts
const criticalAlerts = await wazuh.getCriticalAlerts(10);

// Auto-create cases with playbook and IOCs
for (const alert of criticalAlerts) {
  const result = await hive.automateCaseCreation(alert);
  
  console.log(`Created case ${result.case.id} with:`);
  console.log(`  - ${result.tasks.length} tasks`);
  console.log(`  - ${result.observables.length} IOCs`);
}
```

---

## 📊 **Dashboard Features**

The `TheHiveDashboard` component provides:

1. **Overview Tab**: Urgent cases + Recent activity
2. **All Cases Tab**: Searchable case list with filters
3. **Tasks Tab**: Investigation task management
4. **IOCs Tab**: Indicators of compromise viewer
5. **Analytics Tab**: Severity distribution + Trends

---

**Status**: ✅ **READY FOR PRODUCTION INTEGRATION**

**Next**: Proceed to **MODULE 4: MISP Threat Intelligence**
