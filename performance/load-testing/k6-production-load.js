// ============================================================
// National SOC Platform - k6 Load Testing Suite
// Target: 10,000 Events Per Second (EPS) Production Load
// ============================================================
// Test Scenarios:
// 1. API Endpoint Stress Testing
// 2. SS7 Message Ingestion Throughput (Primary EPS target)
// 3. Alert Processing Pipeline
// 4. Concurrent User Dashboard Access
// 5. Database Query Performance
// 6. WebSocket/SSE Connection Stability
//
// Usage: k6 run k6-production-load.js
//        k6 run --vus 100 --duration 30m k6-production-load.js
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================
// Custom Metrics
// ============================================================

// Error rates by endpoint
const alertErrors = new Rate('alert_errors');
const incidentErrors = new Rate('incident_errors');
const ss7Errors = new Rate('ss7_errors');
const authErrors = new Rate('auth_errors');
const dashboardErrors = new Rate('dashboard_errors');

// Response time trends
const alertLatency = new Trend('alert_latency');
const incidentLatency = new Trend('incident_latency');
const ss7IngestionLatency = new Trend('ss7_ingestion_latency');
const dashboardLoadTime = new Trend('dashboard_load_time');

// Throughput counters
const ss7MessagesProcessed = new Counter('ss7_messages_processed');
const alertsGenerated = new Counter('alerts_generated');
const incidentsCreated = new Counter('incidents_created');

// Business metrics
const epsRate = new Trend('events_per_second');
const p95ResponseTime = new Trend('p95_response_time');
const errorRate = new Rate('overall_error_rate');

// ============================================================
// Configuration
// ============================================================

export const options = {
    // Main scenarios for different load types
    scenarios: {
        // Scenario 1: SS7 Ingestion Pipeline (Primary - 10k EPS target)
        ss7_ingestion: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 500 },    // Ramp up to 500 VUs
                { duration: '5m', target: 1000 },   // Ramp to 1000 VUs
                { duration: '10m', target: 2000 },  // Peak load (main test)
                { duration: '5m', target: 1500 },   // Sustained high load
                { duration: '3m', target: 500 },     // Ramp down
                { duration: '2m', target: 0 },       // Recovery
            ],
            exec: 'ss7IngestionTest',
            tags: { test_type: 'ingestion', target_eps: '10000' },
        },
        
        // Scenario 2: API Stress Testing
        api_stress: {
            executor: 'constant-arrival-rate',
            rate: 1000,           // 1000 requests per second
            timeUnit: '1s',      // Per second
            duration: '15m',
            preAllocatedVUs: 100,
            maxVUs: 500,
            exec: 'apiStressTest',
            tags: { test_type: 'stress' },
        },
        
        // Scenario 3: Concurrent Dashboard Users
        dashboard_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 50 },
                { duration: '2m', target: 200 },
                { duration: '5m', target: 500 },     // Target: 500 concurrent users
                { duration: '5m', target: 500 },     // Sustain
                { duration: '2m', target: 100 },
                { duration: '1m', target: 0 },
            ],
            exec: 'dashboardLoadTest',
            tags: { test_type: 'concurrent_users' },
        },
        
        // Scenario 4: Spike Test ( sudden traffic surge)
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '10s', target: 10 },
                { duration: '30s', target: 3000 },   // Rapid spike
                { duration: '1m', target: 3000 },    // Sustain spike
                { duration: '20s', target: 100 },    // Recovery
                { duration: '20s', target: 10 },
            ],
            exec: 'spikeTest',
            tags: { test_type: 'spike' },
        },
        
        // Scenario 5: Soak Test (Endurance)
        soak_test: {
            executor: 'constant-vus',
            vus: 200,
            duration: '1h',          // 1 hour endurance test
            exec: 'soakTest',
            tags: { test_type: 'endurance' },
        },
    },
    
    // Thresholds for pass/fail criteria
    thresholds: {
        // Overall thresholds
        http_req_duration: ['p(95)<500', 'p(99)<1000'],  // P95 < 500ms, P99 < 1s
        http_req_failed: ['rate<0.01'],                    // < 1% error rate
        
        // Specific metric thresholds
        alert_errors: ['rate<0.02'],
        incident_errors: ['rate<0.02'],
        ss7Errors: ['rate<0.05'],                          // Allow slightly higher for ingestion
        dashboardErrors: ['rate<0.01'],
        
        // Latency thresholds
        alert_latency: ['p(95)<300'],
        incidentLatency: ['p(95)<400'],
        ss7_ingestion_latency: ['p(95)<100'],              // Must be fast for ingestion
        dashboard_load_time: ['p(95)<2000'],               // Dashboards can be slower
        
        // EPS threshold (for ingestion scenario)
        events_per_second: ['value>9000'],                  // Must achieve >9k EPS
    },
    
    // No pauses between iterations in stress tests
    noConnectionReuse: true,
    discardResponseBodies: true,
};

// ============================================================
// Test Data Generation
// ============================================================

// Generate realistic SS7 message data
function generateSS7Message() {
    const messageTypes = [
        'SendRoutingInfoForSM',
        'ProvideRoamingNumber',
        'UpdateLocation',
        'CancelLocation',
        'InsertSubscriberData',
        'AnyTimeInterrogation'
    ];
    
    const protocolFamilies = ['MAP', 'CAP', 'ISUP', 'TCAP'];
    
    // Algerian phone number formats
    const generateMSISDN = () => `+213${randomIntBetween(550, 559)}${randomIntBetween(1000000, 9999999)}`;
    const generateIMSI = () => `21301${randomIntBetween(10000000, 99999999)}`;
    
    return {
        message_type: randomItem(messageTypes),
        protocol_family: randomItem(protocolFamilies),
        calling_number: generateMSISDN(),
        called_number: generateMSISDN(),
        imsi: generateIMSI(),
        msisdn: generateMSISDN(),
        timestamp: new Date().toISOString(),
        global_title: `60${randomIntBetween(1000000000, 9999999999)}`,
        originating_sccp_address: `DNS${randomString(8)}`,
        destination_sccp_address: `DNS${randomString(8)}`,
        isup_cic: randomIntBetween(1, 65535),
        cap_service_key: randomIntBetween(1, 255),
        map_op_code: randomIntBetween(1, 128),
        raw_hex: generateHexPayload(randomIntBetween(50, 500)),
        metadata: {
            source_node: `HLR${randomIntBetween(1, 10)}`,
            destination_node: `MSC${randomIntBetween(1, 20)}`,
            network_id: `DJEZZY-${randomIntBetween(1, 5)}`,
        }
    };
}

// Generate realistic alert data
function generateAlert() {
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    const sources = ['WAZUH', 'SURICATA', 'ZEEK', 'GRR', 'OPENVAS', 'MISP', 'THEHIVE'];
    const alertTypes = [
        'intrusion_detection',
        'malware_detected',
        'anomaly_detected',
        'policy_violation',
        'vulnerability_found',
        'threat_intel_match',
        'ss7_fraud_indicator',
        'data_exfiltration'
    ];
    
    return {
        title: `[Auto-Test] ${randomItem(alertTypes).replace(/_/g, ' ').toUpperCase()} ${randomIntBetween(1000, 9999)}`,
        description: `Automated load test alert generated at ${new Date().toISOString()}`,
        severity: weightedRandomItem(severities, [5, 15, 30, 35, 15]), // Weight towards lower severity
        source: randomItem(sources),
        alert_type: randomItem(alertTypes),
        status: 'NEW',
        ioc_type: randomItem(['ip', 'domain', 'hash', 'url', 'msisdn', 'imsi']),
        ioc_value: randomItem([generateIP(), generateDomain(), generateHash(), generateMSISDN()]),
        tenant_id: `tenant-${randomIntBetween(1, 10)}`,
        raw_data: { test: true, load_test: true, timestamp: Date.now() }
    };
}

// Generate incident data
function generateIncident() {
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const statuses = ['NEW', 'IN_PROGRESS', 'UNDER_REVIEW'];
    
    return {
        title: `[Load Test] Security Incident ${randomIntBetween(10000, 99999)}`,
        description: `Automated incident creation from load test`,
        severity: weightedRandomItem(severities, [10, 25, 40, 25]),
        status: randomItem(statuses),
        phase: 'DETECTION',
        attack_type: randomItem([
            'phishing',
            'malware',
            'ddos',
            'unauthorized_access',
            'data_breach',
            'ss7_fraud',
            'insider_threat'
        ]),
        affected_assets: [`asset-${randomIntBetween(1, 100)}`],
        assigned_to: `user-${randomIntBetween(1, 50)}`,
    };
}

// Helper functions
function randomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateHexPayload(length) {
    const hexChars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
    }
    return result;
}

function generateIP() {
    return `${randomIntBetween(1, 255)}.${randomIntBetween(0, 255)}.${randomIntBetween(0, 255)}.${randomIntBetween(1, 254)}`;
}

function generateDomain() {
    return `${randomString(randomIntBetween(5, 10))}.${randomItem(['com', 'net', 'org', 'dz'])}`;
}

function generateHash() {
    return randomString(32); // MD5-like
}

function generateMSISDN() {
    return `+213${randomIntBetween(550, 559)}${randomIntBetween(1000000, 9999999)}`;
}

function weightedRandomItem(items, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
        if (random < weights[i]) {
            return items[i];
        }
        random -= weights[i];
    }
    return items[items.length - 1];
}

// ============================================================
// Authentication Helper
// ============================================================

function getAuthToken() {
    // Try to get token from environment or use test credentials
    const credentials = __ENV.AUTH_CREDENTIALS || '{"email":"loadtest@soc.local","password":"LoadTest2026!"}';
    
    const loginRes = http.post(`${__ENV.TARGET_URL || 'http://localhost:3000'}/api/auth/login`, credentials, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'auth_login' },
    });
    
    if (loginRes.status === 200) {
        const body = loginRes.json();
        return body.token || body.access_token || '';
    }
    return __ENV.AUTH_TOKEN || '';
}

// ============================================================
// TEST SCENARIOS
// ============================================================

// Scenario 1: SS7 Message Ingestion (Target: 10k EPS)
export function ss7IngestionTest() {
    const url = `${__ENV.TARGET_URL || 'http://localhost:3000'}/api/ss7/messages`;
    const authToken = getAuthToken();
    
    const payload = JSON.stringify(generateSS7Message());
    
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        tags: { name: 'ss7_ingestion' },
    };
    
    const start = new Date().getTime();
    const res = http.post(url, payload, params);
    const end = new Date().getTime();
    
    const latency = end - start;
    ss7IngestionLatency.add(latency);
    ss7MessagesProcessed.add(1);
    epsRate.add(1);
    
    const passed = check(res, {
        'SS7 ingestion status is success': (r) => r.status === 201 || r.status === 200,
        'SS7 ingestion response time < 100ms': (r) => latency < 100,
        'SS7 ingestion response valid': (r) => r.json() && r.json().id !== undefined,
    });
    
    ss7Errors.add(!passed);
    errorRate.add(!passed);
    
    if (!passed) {
        console.log(`SS7 Ingestion Failed: status=${res.status}, latency=${latency}ms`);
    }
}

// Scenario 2: API Stress Testing
export function apiStressTest() {
    const url = `${__ENV.TARGET_URL || 'http://localhost:3000'}`;
    const authToken = getAuthToken();
    
    const endpoints = [
        { path: '/api/alerts', method: 'GET', metric: alertLatency, errors: alertErrors },
        { path: '/api/incidents', method: 'GET', metric: incidentLatency, errors: incidentErrors },
        { path: '/api/threats', method: 'GET', metric: null, errors: null },
        { path: '/api/metrics', method: 'GET', metric: null, errors: null },
        { path: '/api/health', method: 'GET', metric: null, errors: null },
    ];
    
    const endpoint = randomItem(endpoints);
    
    const params = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        tags: { name: `stress_${endpoint.path.replace('/', '_')}` },
    };
    
    const start = new Date().getTime();
    let res;
    
    switch (endpoint.method) {
        case 'POST':
            res = http.post(`${url}${endpoint.path}`, JSON.stringify(generateAlert()), params);
            alertsGenerated.add(res.status === 201 ? 1 : 0);
            break;
        default:
            res = http.get(`${url}${endpoint.path}${endpoint.path.includes('?') ? '&' : '?'}limit=20`, params);
    }
    
    const end = new Date().getTime();
    const latency = end - start;
    
    if (endpoint.metric) {
        endpoint.metric.add(latency);
    }
    p95ResponseTime.add(latency);
    
    const passed = check(res, {
        'API stress status OK': (r) => r.status >= 200 && r.status < 500,
        'API stress response < 500ms': (r) => latency < 500,
    });
    
    if (endpoint.errors) {
        endpoint.errors.add(!passed);
    }
    errorRate.add(!passed);
}

// Scenario 3: Concurrent Dashboard Users
export function dashboardLoadTest() {
    const url = `${__ENV.TARGET_URL || 'http://localhost:3000'}`;
    const authToken = getAuthToken();
    
    const dashboards = [
        '/api/dashboard',
        '/api/alerts?status=NEW&limit=50',
        '/api/incidents?status!=CLOSED&limit=50',
        '/api/metrics?range=24h',
        '/api/analytics/trends?days=7',
        '/api/telecom/stats?hours=1',
        '/api/compliance/status',
    ];
    
    const params = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
        },
        tags: { name: 'dashboard_load' },
    };
    
    // Simulate user browsing multiple pages
    const pagesToVisit = randomIntBetween(2, 4);
    
    for (let i = 0; i < pagesToVisit; i++) {
        const pageUrl = url + randomItem(dashboards);
        
        const start = new Date().getTime();
        const res = http.get(pageUrl, params);
        const end = new Date().getTime();
        
        const loadTime = end - start;
        dashboardLoadTime.add(loadTime);
        
        const passed = check(res, {
            'Dashboard loaded successfully': (r) => r.status === 200,
            'Dashboard load time acceptable': (r) => loadTime < 3000, // 3s for dashboards
            'Dashboard has content': (r) => r.json() !== null && Object.keys(r.json()).length > 0,
        });
        
        dashboardErrors.add(!passed);
        errorRate.add(!passed);
        
        // Simulate think time between page views
        sleep(randomIntBetween(1, 5)); // 1-5 seconds think time
    }
}

// Scenario 4: Spike Test
export function spikeTest() {
    // Mix of read and write operations during spike
    const operations = [
        () => {
            // Quick health check
            const res = http.get(`${__ENV.TARGET_URL || 'http://localhost:3000'}/api/health`, {
                tags: { name: 'spike_health' },
            });
            check(res, { 'Health check during spike': (r) => r.status === 200 });
        },
        () => {
            // Alert creation
            const authToken = getAuthToken();
            const res = http.post(
                `${__ENV.TARGET_URL || 'http://localhost:3000'}/api/alerts`,
                JSON.stringify(generateAlert()),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    tags: { name: 'spike_alert_create' },
                }
            );
            alertsGenerated.add(res.status === 201 ? 1 : 0);
            check(res, { 'Alert created during spike': (r) => r.status === 201 || r.status === 429 });
        },
        () => {
            // Metric query
            const authToken = getAuthToken();
            const res = http.get(`${__ENV.TARGET_URL || 'http://localhost:3000'}/api/metrics`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
                tags: { name: 'spike_metrics' },
            });
            check(res, { 'Metrics query during spike': (r) => r.status === 200 });
        },
    ];
    
    randomItem(operations)();
}

// Scenario 5: Soak Test (Endurance)
export function soakTest() {
    const url = `${__ENV.TARGET_URL || 'http://localhost:3000'}`;
    const authToken = getAuthToken();
    
    // Normal user simulation over extended period
    const actions = [
        // Read operations (70%)
        { type: 'GET', path: '/api/health', weight: 20 },
        { type: 'GET', path: '/api/alerts?limit=10', weight: 20 },
        { type: 'GET', path: '/api/incidents?limit=10', weight: 15 },
        { type: 'GET', path: '/api/metrics', weight: 15 },
        
        // Write operations (30%)
        { type: 'POST', path: '/api/alerts', data: generateAlert, weight: 15 },
        { type: 'POST', path: '/api/incidents', data: generateIncident, weight: 10 },
        { type: 'POST', path: '/api/ss7/messages', data: generateSS7Message, weight: 5 },
    ];
    
    // Select action based on weights
    const action = weightedRandomAction(actions);
    
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        tags: { name: 'soak_test' },
    };
    
    let res;
    const startTime = new Date().getTime();
    
    if (action.type === 'GET') {
        res = http.get(`${url}${action.path}`, params);
    } else {
        res = http.post(`${url}${action.path}`, JSON.stringify(action.data()), params);
    }
    
    const endTime = new Date().getTime();
    p95ResponseTime.add(endTime - startTime);
    
    check(res, {
        'Soak test request successful': (r) => r.status >= 200 && r.status < 500 || r.status === 429,
    });
    
    errorRate.add(res.status >= 500);
    
    // Realistic think time
    sleep(randomIntBetween(2, 10));
}

function weightedRandomAction(actions) {
    const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const action of actions) {
        if (random < action.weight) {
            return action;
        }
        random -= action.weight;
    }
    return actions[actions.length - 1];
}

// ============================================================
// Setup & Teardown
// ============================================================

export function setup() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     National SOC Platform - Load Test Suite      ║');
    console.log('║     Target: 10,000 Events Per Second (EPS)       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\nStarting load test at: ${new Date().toISOString()}`);
    console.log(`Target URL: ${__ENV.TARGET_URL || 'http://localhost:3000'}`);
    
    // Pre-warm authentication
    try {
        const token = getAuthToken();
        if (token) {
            console.log('✓ Authentication successful');
        } else {
            console.warn('⚠ Authentication failed - using unauthenticated mode');
        }
    } catch (e) {
        console.warn(`⚠ Auth setup warning: ${e.message}`);
    }
}

export function teardown(data) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('Load Test Complete');
    console.log('══════════════════════════════════════════════════\n');
    
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('\nKey Metrics:');
    console.log(`  - Total SS7 Messages Processed: ${ss7MessagesProcessed.value}`);
    console.log(`  - Total Alerts Generated: ${alertsGenerated.value}`);
    console.log(`  - Total Incidents Created: ${incidentsCreated.value}`);
    console.log(`  - Average Response Time (P95): Check k6 summary output`);
    console.log(`  - Error Rate: Check k6 summary output`);
}
