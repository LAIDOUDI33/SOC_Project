/**
 * Djezzy SOC Platform - API Endpoint Stress Testing
 * 
 * Purpose: Stress test all critical API endpoints to identify bottlenecks
 * Target: P95 <200ms, Error rate <0.1%, 500K+ EPS capacity
 * 
 * @version 1.0.0
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom Metrics
const apiLatency = new Trend('api_latency');
const apiErrors = new Rate('api_errors');
const apiThroughput = new Counter('api_throughput');
const activeConnections = new Gauge('active_connections');

// API Endpoints Configuration
const API_ENDPOINTS = {
  health: '/api/health',
  metrics: '/api/metrics',
  alerts: '/api/alerts',
  incidents: '/api/incidents',
  threats: '/api/threats',
  events_ingest: '/api/v1/events',
  analytics: '/api/analytics',
  dashboard: '/api/dashboard',
  compliance: '/api/compliance',
  system: '/api/system',
};

// Test Data Templates
const TEST_DATA = {
  security_event: {
    timestamp: new Date().toISOString(),
    source_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    destination_ip: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    event_type: ['intrusion', 'malware', 'phishing', 'ddos', 'unauthorized_access'][Math.floor(Math.random() * 5)],
    severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
    source: ['firewall', 'ids', 'siem', 'edr', 'nta'][Math.floor(Math.random() * 5)],
    raw_log: base64Encode(generateLogEntry()),
  },
};

export const options = {
  scenarios: {
    // High-frequency event ingestion test
    ingestion_stress: {
      executor: 'constant-arrival-rate',
      rate: 50000, // 50K requests per second target
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 1000,
      maxVUs: 5000,
      exec: 'testIngestion',
    },
    
    // API endpoint stress
    api_stress: {
      executor: 'constant-vus',
      vus: 2000,
      duration: '10m',
      exec: 'testAPIEndpoints',
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '1m', target: 100 },     // Baseline
        { duration: '30s', target: 5000 },    // Spike up
        { duration: '2m', target: 5000 },     # Hold at peak
        { duration: '30s', target: 100 },     # Recovery
        { duration: '1m', target: 100 },      # Stabilize
      ],
      exec: 'testSpikeScenario',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],  // Strict API latency
    http_req_failed: ['rate<0.001'],
    api_latency: ['p(95)<200'],
    api_errors: ['rate<0.001'],
  },
};

export default function () {
  testAPIEndpoints();
}

/**
 * Event Ingestion Stress Test
 * Tests the platform's ability to handle high-volume event ingestion
 */
export function testIngestion() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  const payload = JSON.stringify({
    ...TEST_DATA.security_event,
    id: generateEventId(),
    timestamp: new Date().toISOString(),
  });
  
  const startTime = Date.now();
  
  const res = http.post(`${baseUrl}${API_ENDPOINTS.events_ingest}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Source': 'load-test',
      'X-Batch-Size': '1',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    tags: { name: 'EventIngestion' },
    discardResponseBodies: true,
  });
  
  const latency = Date.now() - startTime;
  apiLatency.add(latency);
  apiThroughput.add(1);
  activeConnections.add(__VU || 1);
  
  check(res, {
    'Ingestion accepted (202)': (r) => r.status === 202 || r.status === 200,
    'Ingestion latency <50ms': () => latency < 50,
    'Not server error': (r) => r.status < 500,
  });
}

/**
 * General API Endpoint Testing
 * Tests all critical endpoints with realistic load patterns
 */
export function testAPIEndpoints() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': generateRequestId(),
  };
  
  // Select random endpoint for this iteration
  const endpoints = Object.entries(API_ENDPOINTS);
  const [name, path] = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const isWriteEndpoint = name === 'events_ingest';
  const method = isWriteEndpoint ? 'POST' : 'GET';
  
  let url = `${baseUrl}${path}`;
  let body = undefined;
  
  if (isWriteEndpoint) {
    body = JSON.stringify(TEST_DATA.security_event);
  } else {
    // Add query params for GET requests
    url += getQueryParams(name);
  }
  
  const startTime = Date.now();
  const res = http.request(method, url, body ? { headers, body } : { headers });
  const latency = Date.now() - startTime;
  
  apiLatency.add(latency, { endpoint: name });
  apiThroughput.add(1);
  
  const success = check(res, {
    [`${name} status OK`]: (r) => r.status >= 200 && r.status < 500,
    [`${name} latency acceptable`]: () => latency < 1000,
  });
  
  if (!success) {
    apiErrors.add(1, { endpoint: name });
  }
  
  sleep(Math.random() * 0.5 + 0.1); // 100-600ms think time
}

/**
 * Spike Scenario Test
 * Simulates sudden traffic spikes that might occur during security incidents
 */
export function testSpikeScenario() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // During spikes, users frequently check alerts and dashboard
  const criticalPaths = [
    '/api/alerts?limit=50&status=active',
    '/api/dashboard/summary',
    '/api/metrics?range=1h',
    '/api/incidents?status=open&priority=high',
    '/api/threats?severity=critical',
  ];
  
  const path = criticalPaths[Math.floor(Math.random() * criticalPaths.length)];
  
  const res = http.get(`${baseUrl}${path}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Cache-Control': 'no-cache',
    },
    tags: { name: 'SpikeTest' },
  });
  
  check(res, {
    'Spike handled': (r) => r.status === 200 || r.status === 429, // 429 is acceptable under spike
    'Not crashed': (r) => r.status !== 503 && r.status !== 502,
  });
}

// Utility Functions

function generateEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
}

function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateLogEntry() {
  const templates = [
    `[${new Date().toISOString()}] SECURITY ALERT: Suspicious activity detected from external IP`,
    `[${new Date().toISOString()}] IDS Signature Match: ET TROJAN Generic detected`,
    `[${new Date().toISOString()}] Firewall DENY: Connection attempt on blocked port`,
    `[${new Date().toISOString()}] Authentication FAILURE: Multiple failed login attempts`,
    `[${new Date().toISOString()}] DDoS Detection: High request rate from single source`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function base64Encode(str) {
  return Buffer.from(str).toString('base64');
}

function getQueryParams(endpoint) {
  const params = {
    alerts: '?limit=20&status=active&sort=-created_at',
    incidents: '?status=open&limit=15&page=1',
    threats: '?severity=high,critical&limit=25',
    metrics: '?range=6h&granularity=5m',
    analytics: '?type=correlation&window=1h',
    dashboard: '?refresh=true',
    compliance: '?framework=artp',
    system: '?detailed=true',
    health: '?deep=true',
  };
  return params[endpoint] || '';
}

let authToken = null;

function getAuthToken() {
  if (!authToken) {
    try {
      const res = http.post(`${__ENV.BASE_URL || 'http://localhost:3000'}/api/auth`, JSON.stringify({
        username: 'perf-test-user',
        password: 'perf-test-token-2024',
      }), { headers: { 'Content-Type': 'application/json' } });
      
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        authToken = data.token || data.access_token;
      }
    } catch (e) {
      authToken = 'test-auth-token';
    }
  }
  return authToken;
}

export function setup() {
  console.log('=== Djezzy SOC API Stress Test ===');
  console.log(`Testing against: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`Start Time: ${new Date().toISOString()}`);
  return { testStart: Date.now() };
}

export function teardown(data) {
  const elapsed = ((Date.now() - data.testStart) / 1000).toFixed(0);
  console.log(`\n=== Test Summary ===`);
  console.log(`Total Duration: ${elapsed}s`);
  console.log(`Total Requests: ${apiThroughput.values.length > 0 ? 'See report' : 'N/A'}`);
}
