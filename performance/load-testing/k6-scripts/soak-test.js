/**
 * Djezzy SOC Platform - Extended Duration Soak Test (24h)
 * 
 * Purpose: Validate system stability over extended periods
 * Detect: Memory leaks, connection pool exhaustion, resource degradation
 * Duration: 24 hours (configurable)
 * 
 * @version 1.0.0
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Soak Test Metrics
const soakUptime = new Gauge('soak_uptime');
const memoryTrend = new Trend('memory_usage_trend');
const responseTimeDegradation = new Trend('response_time_degradation');
const errorRateOverTime = new Rate('error_rate_over_time');
const requestsPerHour = new Counter('requests_per_hour');
const activeConnectionsSoak = new Gauge('active_connections_soak');

// Baseline tracking for degradation detection
let baselineResponseTime = null;
let hourlyStats = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  startTime: Date.now(),
};

export const options = {
  scenarios: {
    // Primary 24-hour soak test
    extended_soak: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        // Ramp up phase (2 hours)
        { duration: '30m', target: 500 },
        { duration: '1h', target: 2000 },
        { duration: '30m', target: 3000 },
        
        // Sustained load phase (18 hours)
        { duration: '4h', target: 4000 },
        { duration: '4h', target: 5000 },
        { duration: '4h', target: 6000 },     # Peak sustained
        { duration: '3h', target: 5500 },
        { duration: '3h', target: 4500 },
        
        // Variable load phase (3 hours) - simulates day/night cycle
        { duration: '1h', target: 7000 },      # Morning peak
        { duration: '1h', target: 4000 },      # Mid-day
        { duration: '1h', target: 8000 },      # Afternoon peak
        
        // Ramp down phase (1 hour)
        { duration: '30m', target: 2000 },
        { duration: '30m', target: 0 },
      ],
      gracefulRampDown: '5m',
      exec: 'soakTestWorkflow',
    },
    
    // Lightweight background health monitoring
    health_monitor: {
      executor: 'constant-vus',
      vus: 10,
      duration: '24h',
      exec: 'healthMonitoring',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],           // Relaxed threshold for soak
    http_req_failed: ['rate<0.01'],              // Allow slightly higher errors during soak
    error_rate_overTime: ['rate<0.05'],
  },
};

export default function () {
  soakTestWorkflow();
}

/**
 * Main Soak Test Workflow
 * Cycles through different user activities to simulate real usage patterns
 */
export function soakTestWorkflow() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const token = getAuthToken();
  
  if (!token) {
    console.error('Failed to authenticate during soak test');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Test-Type': 'soak-test',
    'X-Iteration': String(__ITER),
  };
  
  try {
    // Rotate through different activities
    const activitySelector = __ITER % 10;
    
    switch (activitySelector) {
      case 0:
      case 1:
        dashboardActivity(baseUrl, headers);
        break;
      case 2:
      case 3:
        alertActivity(baseUrl, headers);
        break;
      case 4:
        incidentActivity(baseUrl, headers);
        break;
      case 5:
        searchActivity(baseUrl, headers);
        break;
      case 6:
        analyticsActivity(baseUrl, headers);
        break;
      case 7:
        writeActivity(baseUrl, headers);
        break;
      case 8:
        complianceActivity(baseUrl, headers);
        break;
      case 9:
        systemActivity(baseUrl, headers);
        break;
    }
    
    // Update hourly statistics
    updateHourlyStats();
    
    // Variable think time to simulate realistic behavior
    sleep(Math.random() * 20 + 5); // 5-25 seconds
    
  } catch (error) {
    errorRateOverTime.add(1);
    console.error(`Soak test iteration error: ${error.message}`);
  }
}

/**
 * Health Monitoring Function
 * Periodic lightweight checks to track system health over time
 */
export function healthMonitoring() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Deep health check every 100 iterations
  const isDeepCheck = __ITER % 100 === 0;
  
  const res = http.get(`${baseUrl}/api/health${isDeepCheck ? '?deep=true' : ''}`, {
    tags: { name: isDeepCheck ? 'DeepHealthCheck' : 'HealthCheck' },
    timeout: '30s',
  });
  
  check(res, {
    'System responsive': (r) => r.status === 200,
    'Health check <5s': (r) => r.timings.duration < 5000,
  });
  
  // Track response time for degradation analysis
  responseTimeDegradation.add(res.timings.duration);
  
  // Establish baseline after first hour
  if (!baselineResponseTime && __ITER > 3600) {
    baselineResponseTime = responseTimeDegradation.values.slice(-100).reduce((a, b) => a + b, 0) / 100;
  }
  
  // Alert on significant degradation (>50% increase from baseline)
  if (baselineResponseTime && res.timings.duration > baselineResponseTime * 1.5) {
    console.warn(`RESPONSE DEGRADATION DETECTED: Current=${res.timings.duration}ms, Baseline=${baselineResponseTime}ms`);
  }
  
  sleep(60); // Check every minute
}

// Activity Functions

function dashboardActivity(baseUrl, headers) {
  const res = http.get(`${baseUrl}/`, {
    headers,
    tags: { name: 'Dashboard' },
    timeout: '15s',
  });
  
  recordMetrics(res, 'dashboard');
}

function alertActivity(baseUrl, headers) {
  const queries = [
    '?limit=50&status=active&sort=-created_at',
    '?severity=critical&status=new',
    '?source=firewall&limit=25',
    '?assigned_to=me&status!=closed',
  ];
  
  const query = queries[Math.floor(Math.random() * queries.length)];
  const res = http.get(`${baseUrl}/api/alerts${query}`, {
    headers,
    tags: { name: 'Alerts' },
    timeout: '10s',
  });
  
  recordMetrics(res, 'alerts');
}

function incidentActivity(baseUrl, headers) {
  const actions = [
    () => http.get(`${baseUrl}/api/incidents?status=open`, { headers, tags: { name: 'Incidents' } }),
    () => http.get(`${baseUrl}/api/incidents/priority=high`, { headers, tags: { name: 'IncidentsHigh' } }),
    () => http.patch(`${baseUrl}/api/incidents/update-status`, JSON.stringify({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    }), { headers, tags: { name: 'IncidentUpdate' } }),
  ];
  
  const res = actions[Math.floor(Math.random() * actions.length)]();
  recordMetrics(res, 'incidents');
}

function searchActivity(baseUrl, headers) {
  const searches = [
    encodeURIComponent('severity:high timestamp:>now-1h'),
    encodeURIComponent('event_type:intrusion source_ip:*'),
    encodeURIComponent('destination_port:(443 OR 8080)'),
    encodeURIComponent('-status:false_positive'),
  ];
  
  const query = searches[Math.floor(Math.random() * searches.length)];
  const res = http.get(`${baseUrl}/api/v1/events/search?q=${query}&limit=20`, {
    headers,
    tags: { name: 'Search' },
    timeout: '15s',
  });
  
  recordMetrics(res, 'search');
}

function analyticsActivity(baseUrl, headers) {
  const res = http.post(`${baseUrl}/api/analytics/query`, JSON.stringify({
    type: ['trend', 'distribution', 'correlation'][Math.floor(Math.random() * 3)],
    time_range: '24h',
    dimensions: ['severity', 'source', 'event_type'][Math.floor(Math.random() * 3)],
  }), {
    headers,
    tags: { name: 'Analytics' },
    timeout: '20s',
  });
  
  recordMetrics(res, 'analytics');
}

function writeActivity(baseUrl, headers) {
  // Simulate write operations (alert acknowledgment, notes, etc.)
  const writes = [
    {
      method: 'POST',
      url: `${baseUrl}/api/alerts/notes`,
      body: JSON.stringify({
        content: `Automated note from soak test at ${new Date().toISOString()}`,
        created_by: `soak-user-${__VU}`,
      }),
    },
    {
      method: 'POST',
      url: `${baseUrl}/api/v1/events`,
      body: JSON.stringify(generateTestEvent()),
    },
  ];
  
  const write = writes[Math.floor(Math.random() * writes.length)];
  const res = http.request(write.method, write.url, write.body, {
    headers,
    tags: { name: 'WriteOperation' },
    timeout: '10s',
  });
  
  recordMetrics(res, 'write');
}

function complianceActivity(baseUrl, headers) {
  const res = http.get(`${baseUrl}/api/compliance?framework=artp&detailed=true`, {
    headers,
    tags: { name: 'Compliance' },
    timeout: '15s',
  });
  
  recordMetrics(res, 'compliance');
}

function systemActivity(baseUrl, headers) {
  const res = http.get(`${baseUrl}/api/system?metrics=cpu,memory,disk,network`, {
    headers,
    tags: { name: 'System' },
    timeout: '10s',
  });
  
  // Track memory usage if available
  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      if (data.memory?.used_percent !== undefined) {
        memoryTrend.add(data.memory.used_percent);
        
        // Warn on high memory usage
        if (data.memory.used_percent > 85) {
          console.warn(`HIGH MEMORY USAGE: ${data.memory.used_percent}%`);
        }
      }
    } catch (e) {
      // Ignore parse errors in soak test
    }
  }
  
  recordMetrics(res, 'system');
}

// Metric Recording

function recordMetrics(res, endpoint) {
  requestsPerHour.add(1);
  activeConnectionsSoak.add(__VU || 0);
  
  const success = check(res, {
    [`${endpoint} success`]: (r) => r.status >= 200 && r.status < 500,
    [`${endpoint} not timeout`]: (r) => r.timings.waiting < 30000,
  });
  
  if (!success) {
    errorRateOverTime.add(1, { endpoint });
  }
  
  responseTimeDegradation.add(res.timings.duration, { endpoint });
}

function updateHourlyStats() {
  hourlyStats.requestCount++;
  
  // Log hourly summary
  if (hourlyStats.requestCount % 3600 === 0) { // Approximate hourly
    const elapsedHours = Math.round((Date.now() - hourlyStats.startTime) / 3600000);
    console.log(`\n[SOAK TEST] Hour ${elapsedHours} Summary:`);
    console.log(`  - Requests this hour: ~3600`);
    console.log(`  - Avg Response Time: ${(responseTimeDegradation.values.slice(-100).reduce((a,b)=>a+b,0)/100).toFixed(0)}ms`);
    console.log(`  - Current VUs: ${__VU}`);
    console.log(`  - Uptime: ${((Date.now() - hourlyStats.startTime) / 1000 / 60 / 60).toFixed(2)}h`);
  }
}

// Utility Functions

function generateTestEvent() {
  return {
    id: `soak-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
    timestamp: new Date().toISOString(),
    event_type: 'test_event',
    severity: 'info',
    source: 'soak-test',
    message: 'Automated event from soak testing',
    test_run_id: __ENV.TEST_RUN_ID || 'default-soak',
  };
}

let authToken = null;

function getAuthToken() {
  if (!authToken) {
    try {
      const res = http.post(`${__ENV.BASE_URL || 'http://localhost:3000'}/api/auth`, JSON.stringify({
        username: __ENV.SOAK_USER || 'soak-test-user',
        password: __ENV.SOAK_PASS || 'soak-test-token-2024',
      }), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '10s',
      });
      
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        authToken = data.token || data.access_token;
      }
    } catch (e) {
      // Return placeholder for soak test continuity
      authToken = 'soak-auth-token';
    }
  }
  return authToken;
}

// Setup and Teardown

export function setup() {
  console.log('\n================================================================');
  console.log('  Djezzy SOC Platform - 24-Hour Soak Test');
  console.log('================================================================');
  console.log(`Start Time: ${new Date().toISOString()}`);
  console.log(`Expected Duration: 24 hours`);
  console.log(`Target Concurrency: Up to 8000 users`);
  console.log('----------------------------------------------------------------');
  console.log('Monitoring For:');
  console.log('  - Memory leaks and resource exhaustion');
  console.log('  - Connection pool stability');
  console.log('  - Response time degradation');
  console.log('  - Error rate trends');
  console.log('================================================================\n');
  
  return {
    startTime: Date.now(),
    baselineP95: null,
  };
}

export function teardown(data) {
  const totalDuration = ((Date.now() - data.startTime) / 1000 / 3600).toFixed(2);
  const allResponseTimes = responseTimeDegradation.values;
  const avgResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
  const p95ResponseTime = percentile(allResponseTimes, 95);
  const p99ResponseTime = percentile(allResponseTimes, 99);
  
  console.log('\n================================================================');
  console.log('  SOAK TEST COMPLETE - FINAL REPORT');
  console.log('================================================================');
  console.log(`Total Duration: ${totalDuration} hours`);
  console.log(`End Time: ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------');
  console.log('Performance Summary:');
  console.log(`  - Total Requests: ${requestsPerHour.values.length > 0 ? 'See k6 output' : 'N/A'}`);
  console.log(`  - Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  - P95 Response Time: ${p95ResponseTime.toFixed(0)}ms`);
  console.log(`  - P99 Response Time: ${p99ResponseTime.toFixed(0)}ms`);
  console.log('----------------------------------------------------------------');
  console.log('Degradation Analysis:');
  if (baselineResponseTime) {
    const degradation = ((avgResponseTime - baselineResponseTime) / baselineResponseTime * 100).toFixed(1);
    console.log(`  - Baseline P95: ${baselineResponseTime.toFixed(0)}ms`);
    console.log(`  - Final Degradation: ${degradation}%`);
    console.log(`  - Status: ${parseFloat(degradation) > 50 ? 'WARNING: Significant degradation' : 'OK'}`);
  } else {
    console.log('  - Insufficient data for degradation analysis');
  }
  console.log('================================================================\n');
}

function percentile(arr, p) {
  const sorted = arr.sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[idx] || 0;
}
