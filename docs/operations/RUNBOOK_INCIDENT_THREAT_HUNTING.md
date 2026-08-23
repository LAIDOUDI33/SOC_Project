# National SOC Platform - Operational Runbooks

**Version:** 1.0.0 (Production Ready)  
**Last Updated:** 2026-08-23  
**Classification:** INTERNAL - OPERATIONS

---

## Table of Contents

1. [Incident Response Runbook](#incident-response-runbook)
2. [Threat Hunting Runbook](#threat-hunting-runbook)
3. [System Health Runbook](#system-health-runbook)
4. [Database Maintenance Runbook](#database-maintenance-runbook)
5. [Security Incident Procedures](#security-incident-procedures)

---

## 1. Incident Response Runbook

### 1.1 New Incident Creation

#### Prerequisites
- User must have `ANALYST` role or higher
- Valid authentication token required

#### API Endpoint
```
POST /api/incidents
Content-Type: application/json
Authorization: Bearer <token>
```

#### Request Body Schema
```json
{
  "action": "create",
  "title": "String (3-500 chars, required)",
  "description": "String (max 10000 chars)",
  "type": "SECURITY|FRAUD|DATA_BREACH|DDOS|MALWARE|PHISHING|TELECOM_FRAUD|...",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "priority": 1-5 (1=P1=Critical),
  "affectedAssets": ["Array of strings"],
  "affectedServices": ["Array of strings"],
  "confidenceScore": 0-100,
  "impactScore": 0-10,
  "subscribersAffected": Integer (telecom-specific),
  "tags": ["Array of strings"]
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Incident created successfully",
  "data": {
    "id": "uuid",
    "tatcCode": "TATC-2026-A1B2C3D4E5F6",
    "title": "...",
    "status": "open",
    "phase": "detection"
  },
  "meta": {
    "requestId": "req_...",
    "processingTimeMs": 150
  }
}
```

#### Error Responses
| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | UNAUTHORIZED | Missing/invalid auth |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |

---

### 1.2 Incident Status Transitions

#### Valid State Machine

```
OPEN → IN_PROGRESS → CONTAINED → ERADICATED → RECOVERING → RESOLVED → CLOSED
                         ↓              ↓
                      (can go to RESOLVED directly from IN_PROGRESS if appropriate)
                      
OPEN → CANCELLED (with admin approval)
ANY → POST_MORTEM (after RESOLVED)
```

#### Transition Rules
| From | To | Allowed | Auto-Actions |
|------|----|---------|--------------|
| OPEN | IN_PROGRESS | ✅ | Set assigned analyst |
| OPEN | CANCELLED | ✅ (Admin only) | Record reason |
| IN_PROGRESS | CONTAINED | ✅ | Set containmentTarget |
| IN_PROGRESS | RESOLVED | ⚠️ Only for false positives | Set resolvedAt |
| CONTAINED | ERADICATED | ✅ | Update eradication steps |
| ERADICATED | RECOVERING | ✅ | Start recovery procedures |
| RECOVERING | RESOLVED | ✅ | **Auto-set resolvedAt** |
| RESOLVED | CLOSED | ✅ | Archive incident |
| RESOLVED | POST_MORTEM | ✅ | Schedule post-mortem |

#### API Usage
```bash
# Update status
curl -X POST /api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "update",
    "id": "<incident-id>",
    "status": "IN_PROGRESS",
    "phase": "ANALYSIS"
  }'
```

---

### 1.3 Adding Updates/Comments

#### When to Add Updates
- **Status changes**: Always add update explaining why
- **Key findings**: Document important discoveries
- **External communications**: Log calls/emails with stakeholders
- **Timeline events**: Record significant moments

#### Best Practices
```json
{
  "action": "addUpdate",
  "id": "<incident-id>",
  "message": "Clear, specific description of what happened",
  "authorId": "<user-id>",
  "isInternal": false,  // Set true for sensitive info
  "status": "IN_PROGRESS",  // Optional: include if changing status
  "phase": "CONTAINMENT"   // Optional: include if changing phase
}
```

#### Comment Guidelines
✅ **Good Comments:**
- "Identified phishing email targeting finance department. Malicious attachment: 'invoice_98271.zip'"
- "Contained by blocking sender domain at mail gateway. Awaiting user verification."
- "Conference call with CISO scheduled for 14:00 to discuss public disclosure."

❌ **Bad Comments:**
- "Working on it"
- "Checked the thing"
- "Update"

---

### 1.4 SLA Monitoring

#### Telecom SLA Targets (20M Subscribers)

| Severity | Initial Response | Containment | Resolution | Escalation |
|----------|------------------|-------------|------------|------------|
| P1/Critical | 15 minutes | 1 hour | 4 hours | After 10 min |
| P2/High | 30 minutes | 4 hours | 8 hours | After 20 min |
| P3/Medium | 2 hours | 8 hours | 24 hours | After 1 hour |
| P4/Low | 4 hours | 24 hours | 72 hours | After 4 hours |

#### Checking SLA Status
```bash
# Get incidents approaching SLA breach
GET /api/incidents?slaBreach=true&status=OPEN&severity=CRITICAL&limit=10
```

#### Automated Actions (When Implemented)
- ⚠️ **10 min before breach**: Notify incident commander
- 🚨 **At breach time**: Escalate to manager + Slack alert
- 📊 **Post-breach**: Generate report for review

---

## 2. Threat Hunting Runbook

### 2.1 Creating a Hunt Session

#### Hypothesis Development Framework
A good hypothesis should be:
1. **Specific**: Not "find bad stuff" but "detect SIM swap attacks via SS7"
2. **Testable**: Can be proven/disproven with available data
3. **Time-bound**: Has a clear investigation window
4. **Actionable**: Will lead to concrete IOCs or detections

#### Hypothesis Templates
```
"We suspect [threat actor] is [activity] using [technique] 
targeting [asset/group] because [reasoning]. 
Evidence would look like [indicators]."

Examples:
- "We suspect APT28 is conducting reconnaissance on our DNS infrastructure 
   using Nmap scans because of recent vulnerability disclosures. 
   Evidence would look like unusual port scan patterns from external IPs."

- "We believe fraudsters are using SIM swap attacks to intercept 2FA codes 
   for banking customers because of recent fraud reports. 
   Evidence would look like multiple SIM changes followed by banking logins."
```

#### Creating Session
```bash
POST /api/threat-hunting/sessions
{
  "name": "SIM Swap Fraud Investigation - Q3 2026",
  "hypothesis": "Fraudsters are exploiting SS7 vulnerabilities to perform 
                 unauthorized SIM swaps, targeting high-value banking customers. 
                 We expect to see: rapid SIM changes, subsequent banking app 
                 installations, and large transfers within 24h of SIM change.",
  "hunterId": "<analyst-id>",
  "hunterName": "Analyst Name",
  "tags": ["sim-swap", "fraud", "ss7", "banking", "subscriber-security"],
  "queryConfig": {
    "queryLanguage": "KQL",
    "dataSource": "SIEM",
    "timeRange": {
      "start": "2026-07-01T00:00:00Z",
      "end": "2026-08-23T23:59:59Z"
    }
  }
}
```

---

### 2.2 Hunt Session Lifecycle

```
DRAFT ──→ RUNNING ──→ PAUSED ──→ COMPLETED
  │          │                    │
  │          ↓                    ↓
  │     (executing         (finalizing
  │      queries)           findings)
  │          │                    
  │          ↓                    
  │     CANCELLED              
  ↓                            
(never started)
```

#### State Transitions
| Current | Next | Trigger |
|---------|------|---------|
| DRAFT | RUNNING | Analyst starts investigation |
| DRAFT | CANCELLED | Investigation cancelled |
| RUNNING | PAUSED | Analyst pauses (timeout or manual) |
| RUNNING | COMPLETED | All findings documented |
| PAUSED | RUNNING | Analyst resumes |
| PAUSED | CANCELLED | Abandoned |
| PAUSED | COMPLETED | Sufficient findings gathered |

---

### 2.3 Managing Findings

#### Finding Classification

| Status | Definition | Action Required |
|--------|------------|-----------------|
| NEW | Discovered, not yet reviewed | Assign for triage |
| INVESTIGATING | Under active analysis | Continue research |
| CONFIRMED_TRUE_POSITIVE | Verified malicious | Create incident/IOC |
| CONFIRMED_FALSE_POSITIVE | Benign activity | Document and close |
| ESCALATED | Requires immediate action | Alert IR team |

#### Creating a Finding
```json
{
  "sessionId": "<session-id>",
  "title": "Suspicious SIM Change Pattern Detected",
  "description": "Subscriber MSISDN +21355XXXXXXX had 3 SIM changes in 24 hours, 
                followed by installation of 2 banking apps and login to 
                mobile banking within 2 hours of last SIM change.",
  "severity": "HIGH",
  "confidence": 85,
  "evidence": [
    {
      "type": "LOG_ENTRY",
      "content": "SIM_CHANGE event at 2026-08-22T14:30:00Z for subscriber ...",
      "source": "HLR",
      "timestamp": "2026-08-22T14:30:00Z"
    },
    {
      "type": "NETWORK_FLOW",
      "content": "HTTPS connection to bank.example.com from subscriber device...",
      "source": "GTP/CGNAT logs"
    }
  ],
  "extractedIOCs": [
    { "type": "MSISDN", "value": "+21355XXXXXXX", "context": "Target subscriber" },
    { "type": "IPV4", "value": "198.51.100.23", "context": "Proxy IP used after SIM change" },
    { "type": "DOMAIN", "value": "fake-bank-login.com", "context": "Phishing domain in SMS" }
  ],
  "tactics": ["Initial Access", "Credential Access"],
  "techniques": ["T1566.002 (Phishing: SMS)", "T1578 (Modify System Cloud Content)"],
  "recommendations": [
    "Block MSISDN temporarily pending investigation",
    "Alert fraud team for pattern analysis",
    "Check for other subscribers with similar patterns"
  ],
  "status": "NEW"
}
```

---

### 2.4 IOC Extraction & Management

#### Extracted IOC Workflow
```
Hunt Finding → Extract IOCs → Validate → Enrich → Add to TIP
     ↓              ↓            ↓         ↓          ↓
  Raw evidence  Auto-extract  Check format  Whois/DNS  MISP/OpenCTI
```

#### IOC Quality Criteria
| Criterion | Good IOC | Bad IOC |
|-----------|----------|---------|
| Specificity | Unique identifier | Generic (e.g., google.com) |
| Freshness | Recently observed | Years old with no new sightings |
| Context | Clear attack relevance | Unknown origin |
| Validation | Confirmed malicious | Unverified |

#### Bulk Import Best Practices
```bash
# Import IOCs in batches (max 1000 per request)
POST /api/threats
{
  "action": "bulkImport",
  "iocs": [...],
  "source": "Threat Hunt - SIM Swap Investigation",
  "importOptions": {
    "skipDuplicates": true,
    "updateExisting": true,
    "validateValues": true
  },
  "tags": ["sim-swap", "q3-2026", "validated"]
}
```

---

## 3. System Health Runbook

### 3.1 Health Check Endpoint

#### Monitoring URL
```
GET /api/incidents/health
```

#### Expected Response Structure
```json
{
  "status": "healthy",  // healthy | degraded | unhealthy
  "version": "2.0.0",
  "uptime": 86400,
  "modules": {
    "incidentManagement": {
      "status": "operational",
      "latency": 45,
      "features": {
        "create": true,
        "read": true,
        "validation": true,
        "auditLogging": true,
        "caching": true,
        "batchProcessing": true
      }
    },
    "threatHunting": {
      "status": "operational",
      "latency": 52,
      "features": {...}
    }
  },
  "system": {
    "database": {
      "status": "connected",
      "latency": 12,
      "connectionPool": {"active": 5, "idle": 15, "max": 20}
    },
    "memory": {"usedMB": 128, "totalMB": 512, "usagePercent": 25},
    "cache": {"status": "connected", "hitRate": 89.5}
  },
  "metrics": {
    "requestsLastHour": 15420,
    "averageResponseTime": 48,
    "errorRate": 0.12
  }
}
```

#### Health Status Actions

| Status | Meaning | Action |
|--------|---------|--------|
| **healthy** | All systems normal | No action needed |
| **degraded** | Some features impaired | Investigate, prepare escalation |
| **unhealthy** | Critical issues | Immediate response, page on-call |

---

### 3.2 Common Issues & Resolutions

#### Issue: Database Latency > 100ms

**Symptoms:**
- Health check shows `database.status: "slow"`
- API responses > 500ms
- Timeouts on complex queries

**Diagnosis:**
```sql
-- Check connection pool usage
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE datname = current_database() 
GROUP BY state;

-- Check slow queries
SELECT query, calls, mean_time, rows 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Resolution:**
1. Increase `pool_size` in PgBouncer config
2. Add database indexes for slow queries
3. Consider read replicas for read-heavy operations
4. Review long-running transactions

---

#### Issue: Cache Hit Rate < 70%

**Symptoms:**
- High database load despite caching layer
- Inconsistent response times

**Diagnosis:**
```bash
# Check cache stats
GET /api/analytics/dashboard (admin)
POST /api/analytics/dashboard {"action": "getStats"}
```

**Resolution:**
1. Verify Redis connectivity
2. Increase cache TTLs for stable data
3. Add cache warming for known hot queries
4. Check cache key generation consistency

---

#### Issue: High Error Rate (> 1%)

**Symptoms:**
- Health check shows elevated errorRate
- User complaints about errors

**Common Causes:**
1. **Validation errors**: Clients sending invalid data
   - Check error logs for VALIDATION_ERROR codes
   - Update API documentation
   
2. **Authentication failures**: Token expiry issues
   - Check JWT configuration
   - Verify token refresh flow

3. **Database constraints**: Unique violations
   - Check for race conditions
   - Add proper error handling

---

## 4. Database Maintenance Runbook

### 4.1 Running Migrations

#### Pre-Migration Checklist
- [ ] Backup database (`pg_dump`)
- [ ] Notify users of maintenance window
- [ ] Test migration on staging
- [ ] Prepare rollback plan

#### Running Hunt Sessions Migration
```bash
# Execute migration
psql -U $DB_USER -d $DB_NAME -f scripts/migrate-hunt-sessions.sql

# Verify tables created
\dt hunt_*

# Check indexes created
\di+ idx_hunt_*

# Test basic queries
SELECT count(*) FROM hunt_sessions;
SELECT count(*) FROM hunt_results;
```

#### Post-Migration Verification
```bash
# Test API endpoints
curl -X POST $API_URL/api/threat-hunting/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test","hypothesis":"Test hypothesis","hunterId":"test"}'

# Expected: 201 Created (not 503 Service Unavailable)
```

---

### 4.2 Routine Maintenance Tasks

#### Daily
- [ ] Check health endpoint (automate with cron)
- [ ] Review error rates
- [ ] Verify backup completion

#### Weekly
- [ ] Analyze slow query logs
- [ ] Review table sizes/growth
- [ ] Update statistics: `ANALYZE;`
- [ ] Check index usage

#### Monthly
- [ ] Archive old incidents (configurable retention)
- [ ] Clean up expired cache entries
- [ ] Review audit log storage
- [ ] Capacity planning review

---

## 5. Security Incident Procedures

### 5.1 Suspected Compromise

If you suspect the SOC platform itself is compromised:

1. **IMMEDIATE (0-15 minutes)**
   - Do NOT shut down systems (preserves evidence)
   - Enable additional logging
   - Isolate affected systems if possible
   - Page security team lead

2. **SHORT-TERM (15-60 minutes)**
   - Collect forensic snapshots
   - Review recent access logs
   - Check for unauthorized accounts/changes
   - Document timeline of suspicious activity

3. **INVESTIGATION (1-24 hours)**
   - Determine scope of compromise
   - Identify attack vector
   - Assess data exposure
   - Begin containment procedures

4. **RECOVERY (24-72 hours)**
   - Patch vulnerabilities found
   - Reset all credentials
   - Restore from clean backups if needed
   - Implement additional monitoring

---

### 5.2 Data Breach Response

If subscriber/customer data may have been exposed:

1. **Assessment (0-4 hours)**
   - What data types were exposed?
   - How many records affected?
   - What is the timeframe?
   - Is encryption in place?

2. **Notification Chain**
   - Internal: CISO → Legal → PR → Executive Team
   - External: ANRT (within 72 hours per Algerian law)
   - Affected individuals (as required by law)

3. **Documentation**
   - Preserve all logs
   - Timeline of discovery and response
   - Actions taken
   - Lessons learned

---

## Appendix A: Quick Reference Cards

### Incident API Quick Reference
```
CREATE:  POST /api/incidents  {action:"create", title, severity...}
LIST:    GET  /api/incidents?status=OPEN&severity=CRITICAL&limit=50
GET:     GET  /api/incidents/<id>?details=true
UPDATE:  POST /api/incidents  {action:"update", id, status...}
COMMENT: POST /api/incidents  {action:"addUpdate", id, message...}
LINK:    POST /api/incidents  {action:"linkAlert", id, alertId...}
DELETE:  DELETE /api/incidents?id=<id>  (Admin only)
```

### Threat API Quick Reference
```
LIST:       GET  /api/threats?type=IPV4&threatLevel=CRITICAL
ADD IND:    POST /api/threats  {action:"addIndicator", type, value...}
ADD IOC:    POST /api/threats  {action:"addIOC", type, value...}
VALIDATE:   POST /api/threats  {action:"validateIOC", type, value}
BULK IMPORT:POST /api/threats  {action:"bulkImport", iocs:[...]}
UPDATE:     PUT  /api/threats  {id, type, updates...}
DELETE:     DELETE /api/threats?id=<id>&type=indicator|ioc
```

### Hunt Session API Quick Reference
```
LIST:   GET  /api/threat-hunting/sessions?status=RUNNING
CREATE: POST /api/threat-hunting/sessions  {name, hypothesis, hunterId...}
UPDATE: PUT  /api/threat-hunting/sessions  {id, status, progress...}
DELETE: DELETE /api/threat-hunting/sessions?id=<id>
```

---

## Appendix B: Contact Escalation

| Role | Responsibility | Contact Method |
|------|---------------|-----------------|
| **On-Call Analyst** | First response | PagerDuty / OpsGenie |
| **Incident Commander** | Major incidents | Phone + Slack |
| **SOC Manager** | Escalation decisions | Phone + Email |
| **CISO** | Security breaches | Phone (24/7) |
| **ANRT Liaison** | Regulatory matters | Email (business hours) |

---

**Document Owner:** SOC Operations Team  
**Review Frequency:** Monthly  
**Next Review:** 2026-09-23  

*This runbook should be updated whenever procedures change or new scenarios are encountered.*
