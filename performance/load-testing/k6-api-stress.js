/**
 * Djezzy SOC Platform - API Endpoint Stress Testing
 * 
 * Purpose: Stress test all critical API endpoints to identify bottlenecks
 * Target: P95 <200ms response time, 10K RPS (Requests Per Second) capacity
 * Scale: Validates system behavior under extreme load conditions
 * 
 * @version 2.0.0
 * @author Djezzy SOC Performance Team
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ============================================================
// CUSTOM METRICS FOR API STRESS TESTING
// ============================================================

const apiLatency = new Trend('api_latency', true);
const apiP50Latency = new Trend('api_p50_latency');
const apiP95Latency = new Trend('api_p95_latency');
const apiP99Latency = new Trend('api_p99_latency');
const apiErrors = new Rate('api_errors');
const apiThroughput = new Counter('api_throughput');
const activeConnections = new Gauge('active_connections');
const requestsPerSecond = new Gauge('requests_per_second');
const endpointLatency = new Trend('endpoint_latency', true);

// Per-endpoint error tracking
const endpointErrors = {
  health: new Rate('errors_health'),
  metrics: new Rate('errors_metrics'),
  alerts: new Rate('errors_alerts'),
  incidents: new Rate('errors_incidents'),
  threats: new Rate('errors_threats'),
  events: new Rate('errors_events'),
  analytics: new Rate('errors_analytics'),
  dashboard: new Rate('errors_dashboard'),
  compliance: new Rate('errors_compliance'),
  system: new Rate('errors_system'),
};

// ============================================================
// API ENDPOINTS CONFIGURATION
// ============================================================

const API_ENDPOINTS = {
  // Health & Status Endpoints
  health: {
    path: '/api/health',
    method: 'GET',
    weight: 5,           // Higher weight = more frequent
    timeout: 5000,
    critical: true,
  },
  
  // Core Data Endpoints
  metrics: {
    path: '/api/metrics',
    method: 'GET',
    params: '?range=1h&granularity=5m&format=json',
    weight: 15,
    timeout: 10000,
    critical: true,
  },
  alerts: {
    path: '/api/alerts',
    method: 'GET',
    params: '?limit=50&status=active&sort=-created_at',
    weight: 20,
    timeout: 10000,
    critical: true,
  },
  incidents: {
    path: '/api/incidents',
    method: 'GET',
    params: '?status=open&limit=20&page=1',
    weight: 15,
    timeout: 10000,
    critical: true,
  },
  threats: {
    path: '/api/threats',
    method: 'GET',
    params: '?severity=high,critical&limit=25&age=7d',
    weight: 10,
    timeout: 10000,
    critical: false,
  },
  
  // Write Operations
  events_ingest: {
    path: '/api/v1/events',
    method: 'POST',
    weight: 25,          // Highest - this is our main throughput target
    timeout: 5000,
    critical: true,
  },
  
  // Analytics & Intelligence
  analytics: {
    path: '/api/analytics',
    method: 'GET',
    params: '?type=correlation&window=1h&limit=100',
    weight: 8,
    timeout: 15000,
    critical: false,
  },
  dashboard: {
    path: '/api/dashboard',
    method: 'GET',
    params: '?refresh=true&widgets=all',
    weight: 12,
    timeout: 10000,
    critical: true,
  },
  
  // Compliance & Governance
  compliance: {
    path: '/api/compliance',
    method: 'GET',
    params: '?framework=artp&summary=true',
    weight: 5,
    timeout: 10000,
    critical: false,
  },
  system: {
    path: '/api/system',
    method: 'GET',
    params: '?detailed=true&components=all',
    weight: 5,
    timeout: 10000,
    critical: true,
  },
};

// ============================================================
// TEST DATA GENERATORS
// ============================================================

const TEST_DATA = {
  security_event: (): object => ({
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 14)}`,
    timestamp: new Date().toISOString(),
    event_type: [
      'network.connection', 'security.alert', 'authentication.attempt',
      'malware.detection', 'intrusion.signature', 'dns.query',
      'http.request', 'file.access', 'process.execution'
    ][Math.floor(Math.random() * 9)],
    severity: ['info', 'low', 'medium', 'high', 'critical'][weightedRandom([0.4, 0.25, 0.2, 0.1, 0.05])],
    source: getSourceSystem(),
    source_ip: generateIP('external'),
    destination_ip: generateIP('internal'),
    destination_port: getRandomPort(),
    protocol: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'][Math.floor(Math.random() * 6)],
    raw_log: base64Encode(generateLogEntry()),
    custom_fields: {
      correlation_id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`,
      session_id: `sess-${Math.random().toString(36).substring(2, 16)}`,
      user_agent: getUserAgent(),
      geoip_country: 'DZ',
      geoip_city: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'][Math.floor(Math.random() * 5)],
    },
  }),
};

// ============================================================
// TEST CONFIGURATION - 10K RPS TARGET
// ============================================================

export const options = {
  // Performance thresholds for SOC platform requirements
  thresholds: {
    // Overall API performance targets
    http_req_duration: ['p(95)<200', 'p(99)<500', 'p(99.9)<1000'],
    http_req_failed: ['rate<0.001'],                    // <0.1% errors
    
    // Custom metrics thresholds
    api_latency: ['p(95)<200', 'p(99)<500'],
    api_errors: ['rate<0.001'],
    
    // Critical endpoint specific thresholds
    http_req_duration: [
      { threshold: 'p(95)<50', tags: { name: 'HealthCheck' } },
      { threshold: 'p(95)<150', tags: { name: 'MetricsAPI' } },
      { threshold: 'p(95)<200', tags: { name: 'AlertsAPI' } },
      { threshold: 'p(95)<180', tags: { name: 'IncidentsAPI' } },
      { threshold: 'p(95)<100', tags: { name: 'EventIngestion' } },
    ],
  },
  
  scenarios: {
    // Main stress test: Constant arrival rate targeting 10K RPS
    constant_load_10k_rps: {
      executor: 'constant-arrival-rate',
      rate: 10000,              // Target: 10,000 requests per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 2000,
      maxVUs: 5000,
      exec: 'testAPIEndpoints',
    },
    
    // Ramp-up stress test
    ramping_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 3000 },     // Initial load
        { duration: '3m', target: 6000 },     # Increasing
        { duration: '5m', target: 10000 },    # Target RPS
        { duration: '5m', target: 12000 },    # Beyond target
        { duration: '3m', target: 8000 },     # Sustained high
        { duration: '2m', target: 3000 },     # Ramp down
      ],
      preAllocatedVUs: 1500,
      maxVUs: 6000,
      exec: 'testAPIEndpoints',
    },
    
    // Spike test for burst handling
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '30s', target: 500 },       // Baseline
        { duration: '10s', target: 5000 },      // 10x spike
        { duration: '30s', target: 8000 },      // Peak spike
        { duration: '20s', target: 10000 },     // Maximum spike
        { duration: '30s', target: 5000 },      # Recovery
        { duration: '1m', target: 500 },        # Stabilize
        { duration: '30s', target: 0 },         # Cool down
      ],
      exec: 'testSpikeScenario',
    },
    
    // Sustained endurance test at 80% capacity
    endurance_8k_rps: {
      executor: 'constant-arrival-rate',
      rate: 8000,
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 2000,
      maxVUs: 4000,
      startTime: '28m',
      exec: 'testAPIEndpoints',
    },
  },
};

export default function () {
  testAPIEndpoints();
}

// ============================================================
// MAIN API STRESS TEST FUNCTION
// ============================================================

/**
 * General API Endpoint Testing
 * Tests all critical endpoints with weighted random selection
 * Simulates realistic traffic patterns across the SOC platform
 */
export function testAPIEndpoints() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const token = getAuthToken();
  
  // Select endpoint based on weights
  const endpoint = selectWeightedEndpoint();
  const config = API_ENDPOINTS[endpoint];
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': generateRequestId(),
    'X-SOC-Client-Version': '2.0.0',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
  };
  
  let url = `${baseUrl}${config.path}${config.params || ''}`;
  let body: string | undefined;
  
  // Prepare request based on method
  if (config.method === 'POST') {
    body = JSON.stringify(TEST_DATA.security_event());
    headers['X-Event-Source'] = 'stress-test';
    headers['X-Batch-Size'] = '1';
  }
  
  const startTime = Date.now();
  
  // Execute request with timeout
  const res = http.request(config.method, url, body ? { headers, body } : { headers }, {
    tags: { name: getEndpointTag(endpoint) },
    timeout: `${config.timeout}ms`,
    discardResponseBodies: config.method === 'POST',
  });
  
  const latency = Date.now() - startTime;
  
  // Record metrics
  apiLatency.add(latency, { endpoint });
  apiThroughput.add(1);
  activeConnections.add(1);
  endpointLatency.add(latency, { endpoint });
  
  // Track per-endpoint errors
  if (endpointErrors[endpoint]) {
    if (!(res.status >= 200 && res.status < 400)) {
      endpointErrors[endpoint].add(1);
    }
  }
  
  // Validate response
  const success = check(res, {
    [`${endpoint} status OK`]: (r) => r.status >= 200 && r.status < 500,
    [`${endpoint} latency <200ms (P95)`]: () => latency < 200,
    [`${endpoint} not timed out`]: () => latency < config.timeout,
    [`${endpoint} not server error`]: (r) => ![502, 503, 504].includes(r.status),
  });
  
  if (!success && res.status >= 500) {
    console.error(`[API ERROR] ${config.method} ${url} -> ${res.status} (${latency}ms)`);
  }
  
  // Minimal think time for stress test
  sleep(Math.random() * 0.05); // 0-50ms
  
  activeConnections.add(-1);
}

/**
 * Spike Scenario Test
 * Focuses on critical paths during traffic spikes
 * Simulates incident response scenario where all analysts check alerts
 */
export function testSpikeScenario() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const token = getAuthToken();
  
  // During spikes, users focus on alerts and metrics
  const criticalPaths = [
    { path: '/api/alerts?limit=50&status=active', tag: 'AlertsSpike' },
    { path: '/api/alerts?severity=critical&status=active', tag: 'CriticalAlertsSpike' },
    { path: '/api/dashboard/summary', tag: 'DashboardSpike' },
    { path: '/api/metrics?range=1h&granularity=1m', tag: 'RealtimeMetricsSpike' },
    { path: '/api/incidents?status=open&priority=critical', tag: 'CriticalIncidentsSpike' },
    { path: '/api/threats?severity=critical&age=1h', tag: 'ActiveThreatsSpike' },
    { path: '/api/v1/events', tag: 'IngestionSpike', method: 'POST' },
  ];
  
  const selected = criticalPaths[Math.floor(Math.random() * criticalPaths.length)];
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Spike-Test': 'true',
  };
  
  let res;
  if (selected.method === 'POST') {
    res = http.post(`${baseUrl}${selected.path}`, JSON.stringify(TEST_DATA.security_event()), {
      headers,
      tags: { name: selected.tag },
      timeout: '5s',
      discardResponseBodies: true,
    });
  } else {
    res = http.get(`${baseUrl}${selected.path}`, {
      headers,
      tags: { name: selected.tag },
      timeout: '10s',
    });
  }
  
  check(res, {
    'Spike handled gracefully': (r) => 
      [200, 202, 206, 429].includes(r.status), // 429 acceptable under spike
    'No server crash': (r) => ![502, 503, 504].includes(r.status),
    'Response received': (r) => r.status !== 0,
  });
  
  // Very minimal think time during spike
  sleep(0.01);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Select an endpoint based on configured weights
 */
function selectWeightedEndpoint(): string {
  const endpoints = Object.entries(API_ENDPOINTS);
  const totalWeight = endpoints.reduce((sum, [, config]) => sum + config.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [name, config] of endpoints) {
    random -= config.weight;
    if (random <= 0) return name;
  }
  
  return endpoints[0][0];
}

/**
 * Get display tag name for endpoint
 */
function getEndpointTag(endpoint: string): string {
  const tags: Record<string, string> = {
    health: 'HealthCheck',
    metrics: 'MetricsAPI',
    alerts: 'AlertsAPI',
    incidents: 'IncidentsAPI',
    threats: 'ThreatsAPI',
    events_ingest: 'EventIngestion',
    analytics: 'AnalyticsAPI',
    dashboard: 'DashboardAPI',
    compliance: 'ComplianceAPI',
    system: 'SystemHealthAPI',
  };
  return tags[endpoint] || 'UnknownAPI';
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `stress-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Weighted random index selection
 */
function weightedRandom(weights: number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * Get source system for test data generation
 */
function getSourceSystem(): string {
  const sources = [
    { type: 'firewall', weight: 0.25 },
    { type: 'ids', weight: 0.20 },
    { type: 'siem', weight: 0.15 },
    { type: 'edr', weight: 0.15 },
    { type: 'nta', weight: 0.10 },
    { type: 'log_manager', weight: 0.08 },
    { type: 'threat_feed', weight: 0.04 },
    { type: 'custom_probe', weight: 0.03 },
  ];
  
  let rand = Math.random();
  for (const source of sources) {
    rand -= source.weight;
    if (rand <= 0) return source.type;
  }
  return 'unknown';
}

/**
 * Generate IP address (external or internal)
 */
function generateIP(type: 'external' | 'internal'): string {
  if (type === 'external') {
    const ranges = [
      [41, 255], [102, 255], [196, 255],   // Algeria IP ranges
      [8, 8], [172, 217], [157, 240],       // Cloud providers
      [185, 200], [45, 150],                // European ranges
    ];
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
  return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Get random port number
 */
function getRandomPort(): number {
  const commonPorts = [80, 443, 22, 21, 25, 53, 3306, 5432, 8080, 8443, 27017, 9200];
  return Math.random() > 0.7 
    ? commonPorts[Math.floor(Math.random() * commonPorts.length)]
    : Math.floor(Math.random() * 65535) + 1;
}

/**
 * Generate log entry template
 */
function generateLogEntry(): string {
  const templates = [
    `[${new Date().toISOString()}] SECURITY ALERT: Suspicious activity detected from external IP ${generateIP('external')}`,
    `[${new Date().toISOString()}] IDS Signature Match: ET TROJAN Generic Activity Detected - Severity: High`,
    `[${new Date().toISOString()}] Firewall DENY: Connection attempt on blocked port ${getRandomPort()} from ${generateIP('external')}`,
    `[${new Date().toISOString()}] Authentication FAILURE: Multiple failed login attempts for user admin`,
    `[${new Date().toISOString()}] DDoS Detection: High request rate (${Math.floor(Math.random() * 10000)} req/s) from single source`,
    `[${new Date().toISOString()}] Malware Detection: Trojan.GenericKD.${Math.floor(Math.random() * 999999)} detected on endpoint`,
    `[${new Date().toISOString()}] DNS Query: Suspicious domain lookup - ${['malware.evil.net', 'c2.badactor.com', 'phishing.scam.org'][Math.floor(Math.random() * 3)]}`,
    `[${new Date().toISOString()}] EDR Alert: Process injection detected - PID ${Math.floor(Math.random() * 65534) + 1}`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Base64 encode a string
 */
function base64Encode(str: string): string {
  try {
    return Buffer.from(str).toString('base64');
  } catch {
    return '';
  }
}

/**
 * Get random user agent
 */
function getUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/605.1.15',
    'python-requests/2.31.0',
    'curl/8.4.0',
    'Go-http-client/2.0',
    '',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// ============================================================
// AUTHENTICATION
// ============================================================

let authToken: string | null = null;

function getAuthToken(): string {
  if (authToken) return authToken;
  
  try {
    const authUrl = (__ENV.BASE_URL || 'http://localhost:3000') + '/api/auth';
    const res = http.post(authUrl, JSON.stringify({
      username: __ENV.TEST_USER || 'perf-test-user',
      password: __ENV.TEST_PASS || 'perf-test-token-2024',
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'AuthRequest' },
    });
    
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      authToken = data.token || data.access_token || data.id_token;
    }
  } catch (e) {
    // Silent fail - will use fallback
  }
  
  return authToken || 'stress-test-auth-token';
}

// ============================================================
// SETUP AND TEARDOWN
// ============================================================

export function setup() {
  console.log('\n' + '='.repeat(70));
  console.log('  DJEZZY SOC PLATFORM - API STRESS TEST');
  console.log('  Version 2.0.0 | Target: 10K RPS | P95 <200ms');
  console.log('='.repeat(70));
  console.log(`  Start Time: ${new Date().toISOString()}`);
  console.log(`  Target URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`  Target RPS: 10,000 requests/second`);
  console.log(`  Max VUs: 6,000`);
  console.log('-'.repeat(70) + '\n');
  
  return {
    startTime: Date.now(),
    testId: `api-stress-${Date.now()}`,
    targetRPS: 10000,
  };
}

export function teardown(data: any) {
  const elapsed = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(70));
  console.log('  API STRESS TEST COMPLETE');
  console.log('-'.repeat(70));
  console.log(`  Duration: ${elapsed} minutes`);
  console.log(`  Target RPS: ${data.targetRPS.toLocaleString()}`);
  console.log(`  End Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70) + '\n');
}
