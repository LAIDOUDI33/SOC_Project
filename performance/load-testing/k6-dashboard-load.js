/**
 * Djezzy SOC Platform - Dashboard Load Testing Script
 * 
 * Purpose: Test dashboard page load performance under various conditions
 * Target: <2s P95 load time for 1000+ concurrent users
 * Scale: Supports up to 10,000 VUs for stress testing
 * 
 * @version 2.0.0
 * @author Djezzy SOC Performance Team
 * @license Proprietary
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ============================================================
// CUSTOM METRICS FOR DASHBOARD PERFORMANCE
// ============================================================

export const dashboardLoadTime = new Trend('dashboard_load_time', true);
export const dashboardTTFB = new Trend('dashboard_time_to_first_byte', true);
export const dashboardRenderTime = new Trend('dashboard_render_time', true);
const dashboardErrorRate = new Rate('dashboard_errors');
const dashboardRequests = new Counter('dashboard_requests');
const activeDashboardUsers = new Gauge('active_dashboard_users');
const apiLatencyByEndpoint = new Trend('api_latency_by_endpoint', true);

// ============================================================
// TEST CONFIGURATION - 1000 USER SIMULATION
// ============================================================

export const options = {
  // Extended thresholds for SOC platform requirements
  thresholds: {
    // Dashboard page load requirements
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],    // P95 <2s, P99 <5s
    http_req_waiting: ['p(95)<1500'],                     // TTFB P95 <1.5s
    http_req_failed: ['rate<0.001'],                       // <0.1% error rate
    
    // Custom dashboard metrics
    dashboard_load_time: ['p(95)<2000', 'p(99)<4000'],
    dashboard_errors: ['rate<0.001'],
    
    // API endpoint metrics (called during dashboard load)
    http_req_duration: [
      { threshold: 'p(95)<200', tags: { name: 'MetricsAPI' } },     // Metrics <200ms
      { threshold: 'p(95)<300', tags: { name: 'AlertsAPI' } },       // Alerts <300ms
      { threshold: 'p(95)<250', tags: { name: 'IncidentsAPI' } },    // Incidents <250ms
      { threshold: 'p(95)<200', tags: { name: 'ThreatsAPI' } },      // Threats <200ms
      { threshold: 'p(95)<150', tags: { name: 'SystemHealthAPI' } }, // Health <150ms
    ],
  },
  
  // Scenario configuration for 1000 user simulation
  scenarios: {
    // Primary scenario: Gradual ramp-up to 1000 users
    dashboard_load_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Warm-up phase - 10 users
        { duration: '30s', target: 10 },
        // Initial ramp - 100 users
        { duration: '1m', target: 100 },
        // Growth phase - 500 users
        { duration: '2m', target: 500 },
        // Target load - 1000 users
        { duration: '5m', target: 1000 },
        // Sustained load at target
        { duration: '10m', target: 1000 },
        // Optional stress beyond target
        { duration: '3m', target: 1500 },
        // Ramp down
        { duration: '2m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'loadDashboard',
    },
    
    // Secondary scenario: Constant 1000 users for stability testing
    sustained_1000_users: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '15m',
      exec: 'loadDashboardWithThinkTime',
      startTime: '18m',  // Start after ramp-up completes
    },
    
    // Spike test scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '35m',
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 5000 },   // 5x spike
        { duration: '2m', target: 5000 },    # Hold at spike
        { duration: '1m', target: 1000 },    # Recovery
        { duration: '1m', target: 0 },
      ],
      exec: 'stressDashboard',
    },
  },
  
  // WebSocket configuration for real-time features
  ws: {
    // Enable if testing SSE/WebSocket connections
  },
};

// Default function
export default function () {
  loadDashboard();
}

// ============================================================
// MAIN DASHBOARD LOAD TEST FUNCTION
// ============================================================

/**
 * Main Dashboard Load Test
 * Simulates a complete dashboard page load with all widgets and API calls
 * Models realistic user behavior including think time
 */
export function loadDashboard() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  dashboardRequests.add(1);
  activeDashboardUsers.add(1);
  
  const startTime = Date.now();
  let ttfb = 0;
  
  try {
    // Main dashboard page request with full headers
    const dashboardRes = http.get(`${baseUrl}/`, {
      tags: { name: 'DashboardPage' },
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'User-Agent': getRandomUserAgent(),
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    
    // Calculate TTFB (Time to First Byte)
    ttfb = dashboardRes.timings.waiting;
    const loadTime = Date.now() - startTime;
    
    // Record custom metrics
    dashboardLoadTime.add(loadTime);
    dashboardTTFB.add(ttfb);
    dashboardRenderTime.add(loadTime - ttfb);
    
    // Validate response
    const success = check(dashboardRes, {
      'Dashboard status is 200': (r) => r.status === 200,
      'Dashboard loaded within 2s (P95)': () => loadTime < 2000,
      'TTFB within 1s': () => ttfb < 1000,
      'Dashboard has content': (r) => r.body.length > 1000,
      'Response has correct content-type': (r) => 
        r.headers['Content-Type']?.includes('text/html'),
      'Not rate limited': (r) => r.status !== 429,
      'No server error': (r) => ![500, 502, 503, 504].includes(r.status),
    });
    
    if (!success) {
      dashboardErrorRate.add(1);
    }
    
    // Simulate browser behavior - load dependent resources
    if (dashboardRes.status === 200) {
      loadStaticResources(baseUrl);
      
      // Simulate API calls that dashboard makes on load
      loadDashboardAPIs(baseUrl);
    }
    
    // Think time between requests (simulating user reading dashboard)
    sleep(Math.random() * 3 + 2); // 2-5 seconds realistic think time
    
  } catch (error) {
    dashboardErrorRate.add(1);
    console.error(`[DASHBOARD LOAD ERROR] ${error.message}`);
  }
  
  activeDashboardUsers.add(-1);
}

/**
 * Dashboard load with consistent think time pattern
 * For sustained load testing scenario
 */
export function loadDashboardWithThinkTime() {
  loadDashboard();
  // Additional think time for sustained scenario
  sleep(Math.random() * 5 + 5); // 5-10 seconds between page loads
}

/**
 * Stress test variant - minimal think time, aggressive loading
 */
export function stressDashboard() {
  const baseUrl = __ENV.STRESS_URL || __ENV.BASE_URL || 'http://localhost:3000';
  
  const res = http.get(`${baseUrl}/`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Cache-Control': 'no-cache',
      'X-Stress-Test': 'true',
      'User-Agent': 'Djezzy-SOC-StressTest/2.0',
    },
    tags: { name: 'StressDashboard' },
  });
  
  check(res, {
    'Stress test response OK': (r) => r.status < 500,
    'Stress not timeout': (r) => r.timings.waiting < 30000,
    'Stress not rate limited': (r) => r.status !== 429,
  });
  
  // Minimal think time for stress
  sleep(Math.random() * 0.5 + 0.1); // 100-600ms
}

// ============================================================
// STATIC RESOURCE LOADING SIMULATION
// ============================================================

/**
 * Simulate loading static resources (JS, CSS, images)
 * These are typically loaded in parallel by the browser
 */
function loadStaticResources(baseUrl: string) {
  const staticResources = [
    { path: '/_next/static/css/main.css', type: 'style' },
    { path: '/_next/static/chunks/main.js', type: 'script' },
    { path: '/_next/static/chunks/webpack.js', type: 'script' },
    { path: '/_next/static/fonts/inter.woff2', type: 'font' },
    { path: '/logo.svg', type: 'image' },
  ];
  
  // Sample a few resources to simulate (not all every time)
  const sampleSize = Math.min(3, staticResources.length);
  const sampled = shuffleArray([...staticResources]).slice(0, sampleSize);
  
  const requests = sampled.map(resource => ({
    method: 'GET',
    url: `${baseUrl}${resource.path}`,
    params: { 
      tags: { name: `Static${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}` }
    },
  }));
  
  const responses = http.batch(requests.map(req => ({
    ...req,
    headers: {
      'Accept': getAcceptHeader(resource.type),
    },
  })));
  
  responses.forEach((res, idx) => {
    check(res, {
      [`Static resource ${sampled[idx].type} loaded`]: (r) => 
        r.status === 200 || r.status === 304, // 304 is cached
    });
  });
}

// ============================================================
// DASHBOARD API ENDPOINT LOADING
// ============================================================

/**
 * Load Dashboard API Endpoints
 * Tests all API calls made during dashboard initialization
 * These are typically fired in parallel on page load
 */
function loadDashboardAPIs(baseUrl: string) {
  const authToken = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'X-SOC-Request-ID': generateRequestId(),
    'X-SOC-Client-Version': '2.0.0',
    'Accept': 'application/json',
  };
  
  // Define all dashboard API endpoints
  const apiEndpoints = {
    // Primary metrics - critical for initial render
    metrics_summary: {
      method: 'GET',
      url: `${baseUrl}/api/metrics?range=24h&granularity=1h`,
      tags: { name: 'MetricsAPI' },
    },
    
    // Active alerts feed
    alerts_active: {
      method: 'GET',
      url: `${baseUrl}/api/alerts?limit=20&status=active&sort=-severity,-created_at`,
      tags: { name: 'AlertsAPI' },
    },
    
    // Open incidents
    incidents_open: {
      method: 'GET',
      url: `${baseUrl}/api/incidents?status=open&limit=10&priority=high,critical`,
      tags: { name: 'IncidentsAPI' },
    },
    
    // Threat intelligence summary
    threats_summary: {
      method: 'GET',
      url: `${baseUrl}/api/threats?severity=high,critical&limit=15&age=7d`,
      tags: { name: 'ThreatsAPI' },
    },
    
    // System health status
    system_health: {
      method: 'GET',
      url: `${baseUrl}/api/system?detailed=false`,
      tags: { name: 'SystemHealthAPI' },
    },
    
    // Compliance overview
    compliance_status: {
      method: 'GET',
      url: `${baseUrl}/api/compliance?framework=artp&summary=true`,
      tags: { name: 'ComplianceAPI' },
    },
    
    // Real-time event stream endpoint (SSE)
    events_stream: {
      method: 'GET',
      url: `${baseUrl}/api/stream/alerts`,
      tags: { name: 'EventsStreamAPI' },
    },
  };
  
  // Convert to batch requests
  const batchRequests = Object.entries(apiEndpoints).map(([key, config]) => ({
    method: config.method,
    url: config.url,
    params: config.params || { tags: {} },
    headers,
  }));
  
  // Execute batch request (simulates parallel browser requests)
  const responses = http.batch(batchRequests);
  
  // Validate each response
  responses.forEach((res, idx) => {
    const apiName = Object.keys(apiEndpoints)[idx];
    const latency = res.timings.duration;
    
    apiLatencyByEndpoint.add(latency, { endpoint: apiName });
    
    check(res, {
      [`${apiName} returns 200`]: (r) => r.status === 200,
      [`${apiName} response <500ms`]: () => latency < 500,
      [`${apiName} valid JSON`]: (r) => isValidJSON(r.body),
      [`${apiName} has data`]: (r) => {
        try {
          const data = JSON.parse(r.body);
          return data !== null && data !== undefined;
        } catch {
          return true; // Don't fail on parse error if status is 200
        }
      },
    });
  });
}

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get or refresh authentication token
 * Implements token caching to reduce auth overhead during tests
 */
function getAuthToken(): string {
  // Return cached token if still valid (with buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  
  try {
    const authUrl = (__ENV.BASE_URL || 'http://localhost:3000') + '/api/auth';
    const loginPayload = JSON.stringify({
      username: __ENV.TEST_USER || 'loadtest-user',
      password: __ENV.TEST_PASS || 'loadtest-pass-2024!',
      grant_type: 'password',
      scope: 'dashboard.read metrics.read alerts.read incidents.read',
    });
    
    const loginRes = http.post(authUrl, loginPayload, {
      headers: { 
        'Content-Type': 'application/json',
        'X-SOC-Auth-Purpose': 'performance-test',
      },
      tags: { name: 'Authentication' },
    });
    
    if (loginRes.status === 200) {
      const data = JSON.parse(loginRes.body);
      cachedToken = data.access_token || data.token || data.id_token;
      const expiresIn = data.expires_in || 3600;
      tokenExpiry = Date.now() + (expiresIn * 1000);
      
      return cachedToken;
    }
    
    // If auth fails, use test token for unauthenticated testing
    console.warn('[AUTH] Login failed, using test token');
    return __ENV.AUTH_TOKEN || 'test-dashboard-token';
    
  } catch (error) {
    console.error(`[AUTH ERROR] ${error}`);
    return 'fallback-test-token';
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `dash-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get random user agent from realistic browser list
 */
function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Get Accept header based on resource type
 */
function getAcceptHeader(type: string): string {
  const acceptHeaders: Record<string, string> = {
    style: 'text/css,*/*;q=0.1',
    script: 'application/javascript,*/*;q=0.1',
    font: 'font/woff2,q=1.0,font/woff,q=0.9,*/*;q=0.8',
    image: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  };
  return acceptHeaders[type] || '*/*';
}

/**
 * Check if string is valid JSON
 */
function isValidJSON(str: string): boolean {
  if (!str || str.length === 0) return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ============================================================
// SETUP AND TEARDOWN
// ============================================================

export function setup() {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(60));
  console.log('  DJEZZY SOC PLATFORM - DASHBOARD LOAD TEST');
  console.log('  Version 2.0.0 | Performance Validation Suite');
  console.log('='.repeat(60));
  console.log(`  Start Time: ${timestamp}`);
  console.log(`  Target URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`  Target Users: 1000 (configurable via stages)`);
  console.log(`  Test Mode: ${__ENV.TEST_MODE || 'standard'}`);
  console.log('-'.repeat(60) + '\n');
  
  return {
    startTime: Date.now(),
    testId: `dash-load-${Date.now()}`,
    config: {
      baseUrl: __ENV.BASE_URL,
      maxUsers: 1000,
    },
  };
}

export function teardown(data: any) {
  const durationMs = Date.now() - data.startTime;
  const durationMin = (durationMs / 1000 / 60).toFixed(2);
  const durationSec = (durationMs / 1000).toFixed(0);
  
  console.log('\n' + '='.repeat(60));
  console.log('  DASHBOARD LOAD TEST COMPLETE');
  console.log('-'.repeat(60));
  console.log(`  Total Duration: ${durationMin} minutes (${durationSec}s)`);
  console.log(`  End Time: ${new Date().toISOString()}`);
  console.log(`  Test ID: ${data.testId}`);
  console.log('='.repeat(60) + '\n');
  
  // Summary statistics would be output by k6 automatically
}
