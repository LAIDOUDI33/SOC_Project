/**
 * Djezzy SOC Platform - Concurrent Users Simulation Test
 * 
 * Purpose: Validate system stability with 10,000+ concurrent users
 * Simulates realistic user behavior patterns (analysts, operators, admins)
 * 
 * @version 1.0.0
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// User Behavior Metrics
const activeUsers = new Gauge('active_users');
const sessionDuration = new Trend('session_duration');
const pageViews = new Counter('page_views');
const userActions = new Counter('user_actions');
const userErrors = new Rate('user_errors');
const thinkTime = new Trend('think_time');

// User Personas Configuration
const USER_PERSONAS = {
  soc_analyst: {
    weight: 0.40,  // 40% of users
    actions: ['view_alerts', 'investigate_event', 'search_logs', 'run_query', 'view_dashboard'],
    thinkTime: { min: 5, max: 30 },
    sessionDuration: { min: 1800, max: 7200 }, // 30min - 2h sessions
  },
  soc_operator: {
    weight: 0.30,  // 30% of users
    actions: ['monitor_dashboard', 'acknowledge_alerts', 'update_incident', 'check_compliance'],
    thinkTime: { min: 10, max: 60 },
    sessionDuration: { min: 3600, max: 14400 }, // 1-4h sessions
  },
  threat_hunter: {
    weight: 0.15,  // 15% of users
    actions: ['advanced_search', 'pivot_investigation', 'create_hunt', 'analyze_threat'],
    thinkTime: { min: 15, max: 120 },
    sessionDuration: { min: 2400, max: 10800 }, // 40min - 3h sessions
  },
  manager: {
    weight: 0.10,  // 10% of users
    actions: ['view_reports', 'check_kpis', 'review_incidents', 'audit_logs'],
    thinkTime: { min: 20, max: 90 },
    sessionDuration: { min: 600, max: 3600 }, // 10min - 1h sessions
  },
  admin: {
    weight: 0.05,  // 5% of users
    actions: ['manage_users', 'configure_system', 'view_audit', 'check_health'],
    thinkTime: { min: 30, max: 180 },
    sessionDuration: { min: 300, max: 1800 }, // 5-30min sessions
  },
};

// Page/Endpoint Mapping
const PAGE_ENDPOINTS = {
  dashboard: '/',
  alerts: '/api/alerts',
  incidents: '/api/incidents',
  threats: '/api/threats',
  analytics: '/api/analytics',
  compliance: '/api/compliance',
  search: '/api/v1/events/search',
  reports: '/api/reports',
  settings: '/api/system',
  audit: '/api/audit/logs',
};

export const options = {
  scenarios: {
    // Main concurrent user simulation
    concurrent_users: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '2m', target: 500 },       // Initial ramp-up
        { duration: '3m', target: 2000 },      # Scale up
        { duration: '5m', target: 5000 },      # Half capacity
        { duration: '8m', target: 8000 },      # Near target
        { duration: '10m', target: 10000 },    # Target concurrency
        { duration: '15m', target: 10000 },    # Sustained load
        { duration: '5m', target: 5000 },      # Ramp down phase 1
        { duration: '3m', target: 1000 },      # Ramp down phase 2
        { duration: '2m', target: 0 },         # Cool down
      ],
      gracefulRampDown: '60s',
      exec: 'simulateUserSession',
    },
    
    // Steady state test at maximum capacity
    steady_state: {
      executor: 'constant-vus',
      vus: 10000,
      duration: '30m',
      exec: 'steadyStateSession',
    },
    
    // Mixed workload test (different user types)
    mixed_workload: {
      executor: 'shared-arrivals',
      maxVUs: 12000,
      timeUnit: '1s',
      rate: [
        { duration: '3m', targetRate: 500 },     // Warm-up
        { duration: '7m', targetRate: 2000 },    # Ramp up
        { duration: '15m', targetRate: 4000 },   # Operating level
        { duration: '5m', targetRate: 6000 },    # Peak
        { duration: '10m', targetRate: 3000 },   # Normal high
        { duration: '5m', targetRate: 500 },     # Cool down
      ],
      preAllocatedVUs: 2000,
      exec: 'mixedWorkloadSession',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],           // <1.5s for user-facing operations
    http_req_failed: ['rate<0.005'],             // <0.5% errors for UX
    user_errors: ['rate<0.01'],
  },
};

export default function () {
  simulateUserSession();
}

/**
 * Simulate a complete user session based on persona
 */
export function simulateUserSession() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const sessionStart = Date.now();
  
  // Assign persona to this VU
  const persona = assignPersona(__VU);
  
  try {
    // Authenticate user
    const token = authenticateUser(persona);
    if (!token) {
      userErrors.add(1);
      return;
    }
    
    activeUsers.add(__VU || 0);
    
    // Simulate session workflow
    let sessionActive = true;
    let actionCount = 0;
    const maxActions = Math.floor(randomInRange(
      persona.sessionDuration.min,
      persona.sessionDuration.max
    ) / randomInRange(persona.thinkTime.min, persona.thinkTime.max));
    
    while (sessionActive && actionCount < maxActions) {
      // Select action based on persona
      const action = selectAction(persona);
      
      // Execute action
      executeAction(baseUrl, token, action, persona);
      
      actionCount++;
      userActions.add(1);
      
      // Think time between actions
      const think = randomInRange(persona.thinkTime.min, persona.thinkTime.max);
      thinkTime.add(think);
      
      // Check if session should end (simulates user leaving)
      if (Math.random() < 0.02) { // 2% chance per action to leave
        sessionActive = false;
      }
      
      sleep(think);
    }
    
    // Record session metrics
    const sessionLength = (Date.now() - sessionStart) / 1000;
    sessionDuration.add(sessionLength);
    
  } catch (error) {
    userErrors.add(1);
    console.error(`Session error for VU ${__VU}: ${error.message}`);
  }
}

/**
 * Steady State Session - Consistent behavior pattern
 */
export function steadyStateSession() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const persona = assignPersona(__VU % 5); // Distribute personas evenly
  const token = authenticateUser(persona);
  
  if (!token) return;
  
  // Standard workflow cycle
  const workflow = getWorkflowForPersona(persona);
  
  for (const step of workflow) {
    executeAction(baseUrl, token, step.action, persona);
    sleep(step.thinkTime);
  }
}

/**
 * Mixed Workload Session - Variable intensity
 */
export function mixedWorkloadSession() {
  simulateUserSession();
}

// Action Execution Functions

function executeAction(baseUrl, token, action, persona) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-User-Persona': persona.name,
    'X-Request-ID': generateRequestId(),
  };
  
  switch (action) {
    case 'view_dashboard':
      viewDashboard(baseUrl, headers);
      break;
    case 'view_alerts':
      viewAlerts(baseUrl, headers);
      break;
    case 'investigate_event':
      investigateEvent(baseUrl, headers);
      break;
    case 'search_logs':
      searchLogs(baseUrl, headers);
      break;
    case 'acknowledge_alerts':
      acknowledgeAlert(baseUrl, headers);
      break;
    case 'update_incident':
      updateIncident(baseUrl, headers);
      break;
    case 'advanced_search':
      advancedSearch(baseUrl, headers);
      break;
    case 'view_reports':
      viewReports(baseUrl, headers);
      break;
    case 'manage_users':
      manageUsers(baseUrl, headers);
      break;
    default:
      genericPageView(baseUrl, headers, action);
  }
  
  pageViews.add(1);
}

function viewDashboard(baseUrl, headers) {
  const res = http.get(`${baseUrl}/`, { headers, tags: { name: 'Dashboard' } });
  check(res, { 'Dashboard loaded': (r) => r.status === 200 });
}

function viewAlerts(baseUrl, headers) {
  const params = '?limit=50&status=active&sort=-severity,-created_at';
  const res = http.get(`${baseUrl}${PAGE_ENDPOINTS.alerts}${params}`, {
    headers,
    tags: { name: 'ViewAlerts' },
  });
  check(res, { 'Alerts loaded': (r) => r.status === 200 });
}

function investigateEvent(baseUrl, headers) {
  // Get an event ID first
  const listRes = http.get(`${baseUrl}${PAGE_ENDPOINTS.alerts}?limit=5`, {
    headers,
    tags: { name: 'GetEventList' },
  });
  
  if (listRes.status === 200 && listRes.json().data?.length > 0) {
    const eventId = listRes.json().data[0].id;
    const res = http.get(`${baseUrl}/api/alerts/${eventId}?include=context,related,ioc`, {
      headers,
      tags: { name: 'InvestigateEvent' },
    });
    check(res, { 'Event details loaded': (r) => r.status === 200 });
  }
}

function searchLogs(baseUrl, headers) {
  const query = encodeURIComponent('severity:high OR severity:critical -status:false_positive');
  const res = http.get(`${baseUrl}${PAGE_ENDPOINTS.search}?q=${query}&limit=25`, {
    headers,
    tags: { name: 'SearchLogs' },
  });
  check(res, { 'Search completed': (r) => r.status === 200 });
}

function acknowledgeAlert(baseUrl, headers) {
  // Get alert and acknowledge it
  const listRes = http.get(`${baseUrl}${PAGE_ENDPOINTS.alerts}?status=new&limit=1`, {
    headers,
    tags: { name: 'GetUnackedAlert' },
  });
  
  if (listRes.status === 200 && listRes.json().data?.length > 0) {
    const alertId = listRes.json().data[0].id;
    const res = http.patch(`${baseUrl}/api/alerts/${alertId}`, JSON.stringify({
      status: 'acknowledged',
      acknowledged_by: `user-${__VU}`,
      acknowledged_at: new Date().toISOString(),
      notes: 'Acknowledged during operations',
    }), { headers, tags: { name: 'AcknowledgeAlert' } });
    check(res, { 'Alert acknowledged': (r) => [200, 204].includes(r.status) });
  }
}

function updateIncident(baseUrl, headers) {
  const res = http.patch(`${baseUrl}${PAGE_ENDPOINTS.incidents}/active`, JSON.stringify({
    updated_at: new Date().toISOString(),
    notes: 'Status update from operator',
  }), { headers, tags: { name: 'UpdateIncident' } });
  check(res, { 'Incident updated': (r) => [200, 204, 404].includes(r.status) });
}

function advancedSearch(baseUrl, headers) {
  const complexQuery = {
    filters: [
      { field: 'timestamp', operator: 'gte', value: new Date(Date.now() - 3600000).toISOString() },
      { field: 'severity', operator: 'in', value: ['high', 'critical'] },
      { field: 'source_ip', operator: 'exists', value: true },
    ],
    aggregation: {
      by: ['event_type', 'source'],
      metric: 'count',
      sort: '-count',
      limit: 20,
    },
  };
  
  const res = http.post(`${baseUrl}${PAGE_ENDPOINTS.search}/advanced`, JSON.stringify(complexQuery), {
    headers,
    tags: { name: 'AdvancedSearch' },
  });
  check(res, { 'Advanced search completed': (r) => r.status === 200 });
}

function viewReports(baseUrl, headers) {
  const res = http.get(`${baseUrl}${PAGE_ENDPOINTS.reports}?type=kpi&period=24h`, {
    headers,
    tags: { name: 'ViewReports' },
  });
  check(res, { 'Reports loaded': (r) => r.status === 200 });
}

function manageUsers(baseUrl, headers) {
  const res = http.get(`${baseUrl}/api/users?limit=50&role=all`, {
    headers,
    tags: { name: 'ManageUsers' },
  });
  check(res, { 'Users list loaded': (r) => r.status === 200 });
}

function genericPageView(baseUrl, headers, action) {
  const endpoint = PAGE_ENDPOINTS[action] || '/';
  const res = http.get(`${baseUrl}${endpoint}`, {
    headers,
    tags: { name: action },
  });
  check(res, { [`${action} loaded`]: (r) => r.status === 200 });
}

// Helper Functions

function assignPersona(vuId) {
  // Deterministic persona assignment based on VU number
  let rand = ((vuId || 0) * 17 + 31) % 100; // Simple hash
  let cumulative = 0;
  
  for (const [name, persona] of Object.entries(USER_PERSONAS)) {
    cumulative += persona.weight * 100;
    if (rand < cumulative) {
      return { ...persona, name };
    }
  }
  
  return { ...USER_PERSONAS.soc_analyst, name: 'soc_analyst' };
}

function selectAction(persona) {
  return persona.actions[Math.floor(Math.random() * persona.actions.length)];
}

function getWorkflowForPersona(persona) {
  const workflows = {
    soc_analyst: [
      { action: 'view_dashboard', thinkTime: 5 },
      { action: 'view_alerts', thinkTime: 8 },
      { action: 'investigate_event', thinkTime: 15 },
      { action: 'search_logs', thinkTime: 12 },
      { action: 'view_dashboard', thinkTime: 10 },
    ],
    soc_operator: [
      { action: 'view_dashboard', thinkTime: 15 },
      { action: 'acknowledge_alerts', thinkTime: 8 },
      { action: 'update_incident', thinkTime: 10 },
      { action: 'view_alerts', thinkTime: 12 },
    ],
    threat_hunter: [
      { action: 'advanced_search', thinkTime: 20 },
      { action: 'investigate_event', thinkTime: 30 },
      { action: 'search_logs', thinkTime: 25 },
      { action: 'advanced_search', thinkTime: 18 },
    ],
    manager: [
      { action: 'view_reports', thinkTime: 20 },
      { action: 'view_dashboard', thinkTime: 15 },
      { action: 'view_reports', thinkTime: 25 },
    ],
    admin: [
      { action: 'manage_users', thinkTime: 30 },
      { action: 'genericPageView', thinkTime: 20 },
    ],
  };
  
  return workflows[persona.name] || workflows.soc_analyst;
}

function authenticateUser(persona) {
  // Use cached tokens in real implementation
  return `test-token-${persona.name}-${__VU}`;
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Setup and Teardown

export function setup() {
  console.log('\n==============================================');
  console.log('  Djezzy SOC Concurrent Users Test');
  console.log('==============================================');
  console.log(`Target Concurrency: 10,000+ users`);
  console.log(`User Distribution:`);
  Object.entries(USER_PERSONAS).forEach(([name, p]) => {
    console.log(`  - ${(p.weight * 100).toFixed(0)}% ${name.replace('_', ' ')}`);
  });
  console.log(`Start Time: ${new Date().toISOString()}`);
  console.log('----------------------------------------------\n');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const elapsed = Math.round((Date.now() - data.startTime) / 1000 / 60);
  console.log('\n==============================================');
  console.log('  Concurrent Users Test Complete');
  console.log('----------------------------------------------');
  console.log(`Total Duration: ${elapsed} minutes`);
  console.log(`Page Views: See report`);
  console.log(`End Time: ${new Date().toISOString()}`);
  console.log('==============================================\n');
}
