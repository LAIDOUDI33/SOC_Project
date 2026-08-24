// ============================================================
// National SOC Platform - 10k EPS Target Validation Script
// Focused test for SS7 message ingestion throughput
// ============================================================
//
// This script is specifically designed to validate the platform's
// ability to handle 10,000 events per second (EPS) sustained.
//
// Usage:
//   k6 run --vus 2000 k6-10k-eps-target.js
//   k6 run --vus 2000 --duration 30m k6-10k-eps-target.js
//
// Success Criteria:
// - Sustain >9,000 EPS for 30 minutes
// - P95 latency < 100ms
// - Error rate < 1%
// - No memory leaks or degradation over time
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ============================================================
// Custom Metrics for 10k EPS Validation
// ============================================================

const epsThroughput = new Trend('eps_throughput');           // Actual EPS achieved
const ingestionLatency = new Trend('ingestion_latency_ms'); // Ingestion response time
const ingestionErrors = new Rate('ingestion_error_rate');    // Error percentage
const totalMessagesProcessed = new Counter('total_messages'); // Running total

// Time-based metrics for degradation detection
const minuteByMinuteEPS = new Trend('eps_by_minute');         // Track EPS per minute

let lastMinuteMessages = 0;
let currentMinuteStart = Date.now();

// ============================================================
// Configuration for 10k EPS Target
// ============================================================

export const options = {
    scenarios: {
        // Primary scenario: Validate 10k EPS capability
        eps_validation: {
            executor: 'constant-vus',
            vus: 2000,                    // 2000 concurrent users
            duration: '30m',              // 30 minutes sustained load
            exec: 'ingestSS7Message',
        },
        
        // Ramp-up variant: Gradually increase to find max capacity
        capacity_test: {
            executor: 'ramping-vus',
            startVUs: 100,
            stages: [
                { duration: '5m', target: 500 },     // Warm up
                { duration: '5m', target: 1000 },    // Half capacity
                { duration: '10m', target: 2000 },   // Target capacity
                { duration: '5m', target: 2500 },    // Push beyond target
                { duration: '5m', target: 3000 },    # Stress point
            ],
            exec: 'ingestSS7Message',
        },
        
        // Burst test: Handle sudden traffic spikes
        burst_test: {
            executor: 'per-vu-iterations',
            vus: 3000,
            iterations: 100,
            maxDuration: '5m',
            exec: 'burstIngest',
        },
    },
    
    thresholds: {
        // Critical thresholds for 10k EPS validation
        'ingestion_error_rate': [
            { threshold: 'rate < 0.01', abortOnFail: true, delayAbortEval: '1m' }, // Abort if >1% errors
        ],
        'ingestion_latency_ms': [
            { threshold: 'p(95) < 100', abortOnFail: true, delayAbortEval: '2m' },  // Abort if P95 >100ms
            { threshold: 'p(99) < 200', abortOnFail: false },
        ],
        'eps_throughput': [
            { threshold: 'value > 9000', abortOnFail: false },                       // Warn if below 9k
        ],
        'http_req_duration': ['p(99)<500'],                                          // Overall latency check
        'http_req_failed': ['rate<0.05'],                                            // Allow some errors during bursts
    },
    
    discardResponseBodies: true,
    noConnectionReuse: true,
};

// ============================================================
// Test Data Generation (Optimized for Speed)
// ============================================================

// Pre-generate data pools for performance
const MSISDN_POOL = Array.from({ length: 10000 }, (_, i) => 
    `+213${randomIntBetween(550, 559)}${String(randomIntBetween(1000000, 9999999)).padStart(7, '0')}`
);

const IMSI_POOL = Array.from({ length: 10000 }, (_, i) =>
    `21301${String(randomIntBetween(10000000, 99999999)).padStart(8, '0')}`
);

const MESSAGE_TYPES = ['SendRoutingInfoForSM', 'ProvideRoamingNumber', 'UpdateLocation', 
                        'CancelLocation', 'InsertSubscriberData', 'AnyTimeInterrogation'];
const PROTOCOL_FAMILIES = ['MAP', 'CAP', 'ISUP', 'TCAP'];

// Fast message generator (minimizes object creation overhead)
function generateFastSS7Message(index) {
    const timestamp = new Date().toISOString();
    
    return JSON.stringify({
        mt: MESSAGE_TYPES[index % MESSAGE_TYPES.length],
        pf: PROTOCOL_FAMILIES[index % PROTOCOL_FAMILIES.length],
        cn: MSISDN_POOL[index % MSISDN_POOL.length],
        dn: MSISDN_POOL[(index + 1000) % MSISDN_POOL.length],
        im: IMSI_POOL[index % IMSI_POOL.length],
        ms: MSISDN_POOL[(index + 5000) % MSISDN_POOL.length],
        ts: timestamp,
        gt: `60${String(randomIntBetween(1000000000, 9999999999))}`,
        h: generateHex(64 + (index % 200)),
    });
}

function generateHex(length) {
    const chars = '0123456789ABCDEF';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

// ============================================================
// Authentication (Cached)
// ============================================================

let cachedAuthToken = '';

function getOrRefreshToken() {
    if (!cachedAuthToken && __ENV.AUTH_TOKEN) {
        cachedAuthToken = __ENV.AUTH_TOKEN;
    }
    
    if (!cachedAuthToken) {
        try {
            const res = http.post(`${__ENV.TARGET_URL || 'http://localhost:3000'}/api/auth/login`, 
                JSON.stringify({ email: 'loadtest@soc.local', password: 'LoadTest2026!' }), {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'token_refresh' },
                });
            
            if (res.status === 200) {
                cachedAuthToken = res.json()?.token || '';
            }
        } catch (e) {
            // Continue without auth if it fails
        }
    }
    
    return cachedAuthToken;
}

// ============================================================
// Main Test Function: High-Speed Ingestion
// ============================================================

export function ingestSS7Message() {
    const url = `${__ENV.TARGET_URL || 'http://localhost:3000'}/api/ss7/messages`;
    const token = getOrRefreshToken();
    
    // Generate message using VU index for variety
    const payload = generateFastSS7Message(__VU);
    
    const startTime = Date.now();
    
    const res = http.post(url, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Load-Test': 'true',
        },
        tags: { name: 'ss7_ingest_10k' },
        timeout: '10s', // Timeout after 10 seconds
    });
    
    const latency = Date.now() - startTime;
    
    // Record metrics
    ingestionLatency.add(latency);
    totalMessagesProcessed.add(1);
    epsThroughput.add(1);
    
    // Track messages this minute for EPS calculation
    lastMinuteMessages++;
    
    // Check if we've completed a minute
    const now = Date.now();
    if (now - currentMinuteStart >= 60000) {
        minuteByMinuteEPS.add(lastMinuteMessages * (60000 / (now - currentMinuteStart)));
        lastMinuteMessages = 0;
        currentMinuteStart = now;
    }
    
    // Validation checks
    const success = check(res, {
        'status_accepted': r => r.status === 201 || r.status === 202 || r.status === 200,
        'latency_acceptable': r => latency < 200, // Allow up to 200ms during high load
        'not_rate_limited': r => r.status !== 429,
        'not_server_error': r => r.status < 500,
    });
    
    ingestionErrors.add(!success);
    
    // Log failures periodically (every 1000th iteration to reduce noise)
    if (!success && (__ITER % 1000 === 0)) {
        console.log(`[${__ITER}] Failed: status=${res.status}, latency=${latency}ms`);
    }
}

// Burst test variant
export function burstIngest() {
    // More aggressive for burst testing
    ingestSS7Message();
    
    // Add minimal think time only in burst mode
    sleep(0.01); // 10ms between requests in burst mode
}

// ============================================================
// Setup & Teardown with Detailed Reporting
// ============================================================

export function setup() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       NATIONAL SOC PLATFORM - 10K EPS VALIDATION SUITE       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Target:      10,000 Events Per Second (Sustained)           ║
║  Duration:    30 minutes                                      ║
║  Concurrency: 2,000 Virtual Users                             ║
║  Endpoint:   /api/ss7/messages                               ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  SUCCESS CRITERIA:                                           ║
║  ✓ Sustained EPS > 9,000                                    ║
║  ✓ P95 Latency < 100ms                                      ║
║  ✓ Error Rate < 1%                                          ║
║  ✓ No degradation over time                                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Starting at: ${new Date().toISOString()}
Target URL: ${__ENV.TARGET_URL || 'http://localhost:3000'}
`);
    
    // Pre-authenticate
    getOrRefreshToken();
    
    return { startTime: Date.now() };
}

export function teardown(data) {
    const durationMinutes = (Date.now() - data.startTime) / 60000;
    const totalMsgs = totalMessagesProcessed.value;
    const actualEPS = totalMsgs / (durationMinutes * 60);
    
    console.log(`

═══════════════════════════════════════════════════════════════
                    LOAD TEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════════

Duration:          ${durationMinutes.toFixed(2)} minutes
Total Messages:    ${totalMsgs.toLocaleString()}
Target EPS:        10,000
Achieved EPS:      ${actualEPS.toFixed(2)}
Target Achievement: ${(actualEPS / 10000 * 100).toFixed(1)}%

Metrics:
  - Total Messages Processed: ${totalMsgs.toLocaleString()}
  - Average Throughput: ${actualEPS.toFixed(2)} EPS
  - P95 Latency: Check summary above
  - Error Rate: Check summary above

Status: ${actualEPS >= 9000 ? '✅ PASSED - Target Achieved!' : '❌ FAILED - Below Target'}

═══════════════════════════════════════════════════════════════
`);
}
