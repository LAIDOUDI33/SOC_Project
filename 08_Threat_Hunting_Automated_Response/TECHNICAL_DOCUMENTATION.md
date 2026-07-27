# Phase 8: Technical Implementation Documentation

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Djezzy SOC Platform - Phase 8                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Threat        │  │   Automated     │  │    SOAR         │            │
│  │   Hunting       │◄─►│   Response      │◄─►│    Case Mgmt    │            │
│  │   Engine        │  │   Engine        │  │                 │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
│           │                    │                     │                     │
│           v                    v                     v                     │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                    Core Integration Layer                         │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │     │
│  │  │ Query Engine│  │ Action Bus  │  │ Evidence    │              │     │
│  │  │             │  │             │  │ Collector   │              │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                    │                                       │
│                                    v                                       │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │                    Data Layer                                     │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │     │
│  │  │ SIEM Logs│ │ Network  │ │ Telecom  │ │ Threat   │            │     │
│  │  │          │ │ Flows    │ │ Protocols│ │ Intel    │            │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Module Specifications

### 1. Threat Hunting Engine

#### Data Structures

```typescript
interface HuntSession {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  hunterId: string;
  queries: HuntQuery[];
  findings: HuntFinding[];
  extractedIOCs: Indicator[];
  timelineEvents: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface HuntQuery {
  id: string;
  sessionId: string;
  name: string;
  queryType: 'SQL' | 'LUCENE' | 'SIGMA' | 'YARA' | 'CUSTOM';
  queryString: string;
  dataSource: string;
  results: QueryResult;
  executionTime: number;
  resultCount: number;
  executedAt: Date;
}

interface HuntFinding {
  id: string;
  sessionId: string;
  queryId: string;
  title: string;
  description: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  rawEvidence: object;
  status: 'NEW' | 'INVESTIGATING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'ESCALATED';
  assignedTo?: string;
  relatedAlerts: string[];
  relatedIncidents: string[];
}
```

#### Key Functions

```typescript
class ThreatHuntingEngine {
  // Create new hunting session
  async createSession(params: CreateSessionParams): Promise<HuntSession>;
  
  // Execute hunting query across data sources
  async executeQuery(sessionId: string, query: HuntQueryInput): Promise<QueryResult>;
  
  // Extract IOCs from query results
  async extractIOCs(sessionId: string, results: QueryResult[]): Promise<Indicator[]>;
  
  // Generate timeline from findings
  async generateTimeline(sessionId: string): Promise<TimelineEvent[]>;
  
  // Get hypothesis templates for Djezzy environment
  async getHypotheses(category?: string): Promise<HypothesisTemplate[]>;
  
  // Save hunting session progress
  async saveProgress(sessionId: string): Promise<void>;
}
```

### 2. Automated Response Engine

#### Playbook Structure

```typescript
interface Playbook {
  id: string;
  name: string;
  description: string;
  version: number;
  category: 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'INVESTIGATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggers: TriggerCondition[];
  steps: PlaybookStep[];
  approvalRequired: boolean;
  estimatedRuntime: number; // minutes
  successRate: number; // percentage
  lastRunAt?: Date;
}

interface PlaybookStep {
  id: string;
  order: number;
  name: string;
  actionType: ActionType;
  actionConfig: object;
  condition?: string; // JavaScript expression for conditional execution
  timeout: number; // seconds
  onFailure: 'ABORT' | 'CONTINUE' | 'SKIP';
  expectedResult?: object;
}

type ActionType = 
  | 'BLOCK_IP'
  | 'ISOLATE_ENDPOINT'
  | 'DISABLE_ACCOUNT'
  | 'QUARANTINE_EMAIL'
  | 'SNAPSHOT_DISK'
  | 'COLLECT_EVIDENCE'
  | 'SEND_NOTIFICATION'
  | 'CREATE_CASE'
  | 'ENRICH_INDICATOR'
  | 'RUN_SCRIPT'
  | 'API_CALL'
  | 'CUSTOM';
```

#### Execution Engine

```typescript
class AutomationEngine {
  // Execute playbook
  async executePlaybook(playbookId: string, context: ExecutionContext): Promise<ExecutionResult>;
  
  // Evaluate trigger conditions
  async evaluateTriggers(event: SecurityEvent): Promise<Playbook[]>;
  
  // Run individual action
  async executeAction(action: PlaybookStep, context: ExecutionContext): Promise<ActionResult>;
  
  // Handle approvals
  async requestApproval(executionId: string): Promise<void>;
  async approveExecution(executionId: string, approverId: string): Promise<void>;
  
  // Track execution history
  async getExecutionHistory(filters?: ExecutionFilters): Promise<ExecutionRecord[]>;
}
```

### 3. SOAR Case Management

#### Case Lifecycle

```typescript
enum CaseStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  WAITING_EXTERNAL = 'WAITING_EXTERNAL',
  CLOSED_RESOLVED = 'CLOSED_RESOLVED',
  CLOSED_FALSE_POSITIVE = 'CLOSED_FALSE_POSITIVE',
  CLOSED_DUPLICATE = 'CLOSED_DUPLICATE'
}

enum CasePriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  caseType: string;
  assigneeId: string;
  reporterId: string;
  alerts: Alert[];
  incidents: Incident[];
  tasks: CaseTask[];
  evidence: Evidence[];
  notes: CaseNote[];
  timeline: CaseEvent[];
  slaDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  resolution?: string;
}
```

### 4. Detection Rules Engine

#### Rule Formats Supported

```typescript
// Sigma Rule Format (simplified)
interface SigmaRule {
  title: string;
  id: string;
  status: 'stable' | 'test' | 'experimental';
  description: string;
  author: string;
  date: string;
  level: 'informational' | 'low' | 'medium' | 'high' | 'critical';
  logsource: LogSource;
  detection: Detection;
  falsepositives: string[];
}

// YARA Rule Format (simplified)
interface YaraRule {
  name: string;
  meta: RuleMeta;
  strings: YaraString[];
  condition: string;
}
```

## Database Schema Additions

### New Tables for Phase 8

```sql
-- Threat Hunting Sessions
CREATE TABLE hunt_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  hunter_id TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Hunt Queries
CREATE TABLE hunt_queries (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES hunt_sessions(id),
  name TEXT NOT NULL,
  query_type TEXT NOT NULL,
  query_string TEXT NOT NULL,
  data_source TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  execution_time INTEGER DEFAULT 0,
  executed_at TIMESTAMP
);

-- Hunt Findings
CREATE TABLE hunt_findings (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES hunt_sessions(id),
  query_id TEXT REFERENCES hunt_queries(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'MEDIUM',
  confidence REAL DEFAULT 0.0,
  raw_evidence JSONB,
  status TEXT DEFAULT 'NEW',
  assigned_to TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automation Playbooks
CREATE TABLE playbooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'HIGH',
  triggers JSONB NOT NULL,
  steps JSONB NOT NULL,
  approval_required BOOLEAN DEFAULT FALSE,
  estimated_runtime INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playbook Executions
CREATE TABLE playbook_executions (
  id TEXT PRIMARY KEY,
  playbook_id TEXT REFERENCES playbooks(id),
  triggered_by TEXT,
  triggered_event_id TEXT,
  status TEXT DEFAULT 'PENDING',
  context JSONB,
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMP,
  result JSONB,
  error_message TEXT
);

-- SOAR Cases
CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'NEW',
  priority INTEGER DEFAULT 3,
  case_type TEXT NOT NULL,
  assignee_id TEXT REFERENCES users(id),
  reporter_id TEXT REFERENCES users(id),
  sla_deadline TIMESTAMP,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);

-- Case Tasks
CREATE TABLE case_tasks (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT REFERENCES users(id),
  status TEXT DEFAULT 'TODO',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case Evidence
CREATE TABLE case_evidence (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id),
  type TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  hash_value TEXT,
  collected_by TEXT REFERENCES users(id),
  preserved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Detection Rules
CREATE TABLE detection_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- SIGMA, YARA, CUSTOM
  content TEXT NOT NULL,
  category TEXT,
  severity TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'ACTIVE',
  author TEXT,
  version INTEGER DEFAULT 1,
  last_tested_at TIMESTAMP,
  hit_count INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,
  true_positive_count INTEGER DEFAULT 0,
  avg_execution_time INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Implementation Details

### Threat Hunting API Routes

```typescript
// POST /api/threat-hunting/sessions
export async function POST(request: Request) {
  const body = await request.json();
  const session = await threatHuntingEngine.createSession({
    name: body.name,
    description: body.description,
    hypothesis: body.hypothesis,
    hunterId: body.hunterId,
    tags: body.tags
  });
  return Response.json(session);
}

// POST /api/threat-hunting/queries
export async function POST(request: Request) {
  const body = await request.json();
  const result = await threatHuntingEngine.executeQuery(
    body.sessionId,
    {
      name: body.name,
      queryType: body.queryType,
      queryString: body.queryString,
      dataSource: body.dataSource
    }
  );
  return Response.json(result);
}
```

### Automation API Routes

```typescript
// POST /api/automation/playbooks/:id/run
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const execution = await automationEngine.executePlaybook(params.id, {
    triggeredBy: body.userId,
    eventId: body.eventId,
    variables: body.variables
  });
  return Response.json(execution);
}
```

## Integration with Existing Phases

### Phase 5 Analytics Integration
- Use analytics queries in threat hunting
- Feed hunting findings back to analytics models
- Correlate hunting results with anomaly detection

### Phase 6 Compliance Integration
- Auto-generate compliance evidence from hunts
- Map hunting activities to control requirements
- Document investigation for audit purposes

### Phase 7 ML Integration
- ML-powered hypothesis suggestions
- Anomaly detection in hunting patterns
- Predictive IOC scoring

## Testing Strategy

### Unit Tests
- Each module tested independently
- Mock external dependencies
- Cover edge cases and error scenarios

### Integration Tests
- Test API endpoints end-to-end
- Verify database operations
- Test integration between modules

### Performance Tests
- Query execution time limits
- Concurrent session handling
- Action execution performance

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Seed data updated
- [ ] Environment variables configured
- [ ] API routes registered
- [ ] Dashboard components deployed
- [ ] Monitoring dashboards created
- [ ] Documentation published
- [ ] Analyst training completed

---

*Phase 8 Technical Documentation - Djezzy National SOC Platform*
*Version 1.0.0 - July 2026*
