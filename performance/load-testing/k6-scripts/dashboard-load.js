/**
 * Djezzy SOC Platform - Dashboard Load Testing Script
 * 
 * Purpose: Test dashboard page load performance under various conditions
 * Target: <2s P95 load time for 10,000+ concurrent users
 * 
 * @version 1.0.0
 * @author Djezzy SOC Performance Team
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom Metrics for Dashboard Performance
export const dashboardLoadTime = new Trend('dashboard_load_time', true);
const dashboardErrorRate = new Rate('dashboard_errors');
const dashboardRequests = new Counter('dashboard_requests');

// Test Configuration
export const options = {
  scenarios: {
    // Gradual ramp-up to simulate real user behavior
    dashboard_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },    // Warm-up phase
        { duration: '1m', target: 500 },      // Ramp up
        { duration: '2m', target: 1000 },     // Sustained load
        { duration: '2m', target: 2500 },     # High load
        { duration: '2m', target: 5000 },     # Peak load
        { duration: '2m', target: 7500 },     # Near capacity
        { duration: '5m', target: 10000 },    # Target concurrency
        { duration: '2m', target: 5000 },     # Ramp down
        { duration: '1m', target: 0 },        # Cool down
      ],
      gracefulRampDown: '30s',
      exec: 'loadDashboard',
    },
    // Stress test scenario
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 50 },       // Initial rate
        { duration: '3m', target: 200 },      # Increased rate
        { duration: '5m', target: 500 },      # High rate
        { duration: '2m', target: 1000 },     # Stress point
      ],
      preAllocatedVUs: 500,
      maxVUs: 2000,
      exec: 'stressDashboard',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],         // P95 < 2s for dashboard
    http_req_failed: ['rate<0.001'],           // <0.1% error rate
    dashboard_load_time: ['p(95)<2000'],
    dashboard_errors: ['rate<0.001'],
  },
};

// Default function (fallback)
export default function () {
  loadDashboard();
}

/**
 * Main Dashboard Load Test
 * Simulates a complete dashboard page load with all widgets
 */
export function loadDashboard() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  dashboardRequests.add(1);
  const startTime = Date.now();
  
  try {
    // Main dashboard page request
    const dashboardRes = http.get(`${baseUrl}/`, {
      tags: { name: 'DashboardPage' },
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Djezzy-SOC-LoadTest/1.0',
      },
    });
    
    const loadTime = Date.now() - startTime;
    dashboardLoadTime.add(loadTime);
    
    check(dashboardRes, {
      'Dashboard status is 200': (r) => r.status === 200,
      'Dashboard loaded within 2s': () => loadTime < 2000,
      'Dashboard contains content': (r) => r.html().find('main').length > 0,
      'Performance metrics present': (r) => r.html().find('[data-metric]').length >= 4,
    });
    
    if (dashboardRes.status !== 200) {
      dashboardErrorRate.add(1);
    }
    
    // Simulate API calls that dashboard makes on load
    loadDashboardAPIs(baseUrl);
    
    // Think time between requests (simulating user reading)
    sleep(Math.random() * 3 + 2); // 2-5 seconds
    
  } catch (error) {
    dashboardErrorRate.add(1);
    console.error(`Dashboard load error: ${error.message}`);
  }
}

/**
 * Load Dashboard API Endpoints
 * Tests all API calls made during dashboard initialization
 */
function loadDashboardAPIs(baseUrl) {
  const authToken = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'X-SOC-Request-ID': generateRequestId(),
  };
  
  // Parallel API requests simulation
  const requests = {
    metrics: {
      method: 'GET',
      url: `${baseUrl}/api/metrics`,
      params: { tags: { name: 'MetricsAPI' } },
    },
    alerts_summary: {
      method: 'GET',
      url: `${baseUrl}/api/alerts?limit=20&status=active`,
      params: { tags: { name: 'AlertsSummary' } },
    },
    incidents: {
      method: 'GET',
      url: `${baseUrl}/api/incidents?status=open&limit=10`,
      params: { tags: { name: 'IncidentsAPI' } },
    },
    threats: {
      method: 'GET',
      url: `${baseUrl}/api/threats?severity=high&limit=15`,
      params: { tags: { name: 'ThreatsAPI' } },
    },
    system_health: {
      method: 'GET',
      url: `${baseUrl}/api/system`,
      params: { tags: { name: 'SystemHealthAPI' } },
    },
    compliance_status: {
      method: 'GET',
      url: `${baseUrl}/api/compliance`,
      params: { tags: { name: 'ComplianceAPI' } },
    },
  };
  
  // Batch request
  const responses = http.batch(
    Object.entries(requests).map(([key, req]) => ({
      ...req,
      headers,
    }))
  );
  
  // Validate responses
  responses.forEach((res, idx) => {
    const apiName = Object.keys(requests)[idx];
    check(res, {
      [`${apiName} status 200`]: (r) => r.status === 200,
      [`${apiName} response time <500ms`]: (r) => r.timings.duration < 500,
      [`${apiName} has valid JSON`]: (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });
  });
}

/**
 * Stress Test Function
 * Pushes dashboard beyond normal operating parameters
 */
export function stressDashboard() {
  const baseUrl = __ENV.STRESS_URL || __ENV.BASE_URL || 'http://localhost:3000';
  
  // Aggressive dashboard loading with minimal think time
  const res = http.get(`${baseUrl}/`, {
    headers: {
      'Accept': 'application/json',
      'X-Stress-Test': 'true',
    },
  });
  
  check(res, {
    'Stress test response OK': (r) => r.status < 500,
    'Not timeout': (r) => r.timings.waiting < 30000,
  });
  
  sleep(0.1); // Minimal think time for stress
}

// Helper Functions

let cachedToken = null;
let tokenExpiry = 0;

function getAuthToken() {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  // Authenticate
  const loginRes = http.post(`${__ENV.BASE_URL || 'http://localhost:3000'}/api/auth`, JSON.stringify({
    username: __ENV.TEST_USER || 'loadtest-user',
    password: __ENV.TEST_PASS || 'loadtest-pass-2024!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const data = JSON.parse(loginRes.body);
    cachedToken = data.token || data.access_token;
    tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  }
  
  return cachedToken || 'test-token';
}

function generateRequestId() {
  return `loadtest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Setup and Teardown
export function setup() {
  console.log('=== Djezzy SOC Dashboard Load Test Starting ===');
  console.log(`Target URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`Start Time: ${new Date().toISOString()}`);
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`=== Test Completed in ${duration} minutes ===`);
}
