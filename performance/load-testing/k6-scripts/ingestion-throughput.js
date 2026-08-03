/**
 * Djezzy SOC Platform - Event Ingestion Throughput Test
 * 
 * Purpose: Measure and validate 500K+ EPS (Events Per Second) capacity
 * Tests: Kafka producer throughput, event normalization, storage pipeline
 * 
 * @version 1.0.0
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Throughput Metrics
const eventsIngested = new Counter('events_ingested');
const ingestionLatency = new Trend('ingestion_latency');
const batchProcessingTime = new Trend('batch_processing_time');
const ingestionErrors = new Rate('ingestion_errors');
const throughputRate = new Rate('throughput_target');

// Configuration
const CONFIG = {
  batchSize: parseInt(__ENV.BATCH_SIZE || '100'),
  targetEPS: parseInt(__ENV.TARGET_EPS || '500000'),
  testDuration: __ENV.DURATION || '10m',
  endpoint: '/api/v1/events/batch',
};

export const options = {
  scenarios: {
    // Main throughput test - constant rate to measure sustained EPS
    throughput_test: {
      executor: 'constant-arrival-rate',
      rate: Math.ceil(CONFIG.targetEPS / CONFIG.batchSize), // Batches per second
      timeUnit: '1s',
      duration: CONFIG.testDuration,
      preAllocatedVUs: Math.min(5000, CONFIG.targetEPS / 10),
      maxVUs: 10000,
      exec: 'measureThroughput',
    },
    
    // Burst test - can system handle sudden spikes?
    burst_test: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 100 },       // Baseline
        { duration: '15s', target: 10000 },     // 100x spike
        { duration: '30s', target: 20000 },     # Peak burst
        { duration: '15s', target: 5000 },      # Sustain high
        { duration: '60s', target: 100 },       # Recovery
      ],
      preAllocatedVUs: 2000,
      maxVUs: 8000,
      exec: 'testBurstThroughput',
    },
    
    // Endurance test - sustained maximum throughput
    endurance_test: {
      executor: 'constant-arrival-rate',
      rate: Math.ceil(CONFIG.targetEPS * 0.8 / CONFIG.batchSize), // 80% of target
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 3000,
      maxVUs: 6000,
      exec: 'testEndurance',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<100'],   // Sub-100ms for ingestion
    http_req_failed: ['rate<0.0001'],                // <0.01% errors for critical path
    ingestion_errors: ['rate<0.001'],
    ingestion_latency: ['p(95)<50'],
  },
};

export default function () {
  measureThroughput();
}

/**
 * Primary Throughput Measurement Test
 * Sends batches of security events at a constant rate
 */
export function measureThroughput() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Generate batch of events
  const events = generateEventBatch(CONFIG.batchSize);
  const payload = JSON.stringify({
    batch_id: generateBatchId(),
    source: 'performance-test',
    compression: 'none',
    schema_version: '2.0',
    events: events,
    metadata: {
      test_run_id: __ENV.TEST_RUN_ID || `run-${Date.now()}`,
      sent_at: new Date().toISOString(),
    },
  });
  
  const startTime = Date.now();
  
  const res = http.post(`${baseUrl}${CONFIG.endpoint}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-Size': String(CONFIG.batchSize),
      'X-Ingestion-Token': getIngestionToken(),
      'Accept-Encoding': 'gzip',
    },
    tags: { name: 'IngestionBatch' },
    discardResponseBodies: true,
    timeout: '10s',
  });
  
  const latency = Date.now() - startTime;
  
  // Record metrics
  eventsIngested.add(CONFIG.batchSize);
  ingestionLatency.add(latency);
  batchProcessingTime.add(latency);
  
  // Validate response
  const success = check(res, {
    'Batch accepted (202/200)': (r) => r.status === 202 || r.status === 200,
    'Response <100ms': () => latency < 100,
    'Not server error': (r) => r.status < 500,
    'Not rate limited': (r) => r.status !== 429,
  });
  
  if (!success) {
    ingestionErrors.add(1);
    
    if (res.status === 429) {
      // Back off on rate limiting
      sleep(0.1);
    }
  }
}

/**
 * Burst Throughput Test
 * Tests how the system handles sudden traffic spikes
 */
export function testBurstThroughput() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Smaller batches during burst for more granular control
  const burstSize = Math.max(10, Math.floor(CONFIG.batchSize / 5));
  const events = generateEventBatch(burstSize);
  
  const res = http.post(`${baseUrl}${CONFIG.endpoint}`, JSON.stringify({
    batch_id: generateBatchId(),
    source: 'burst-test',
    events: events,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Priority': 'high',
      'X-Ingestion-Token': getIngestionToken(),
    },
    timeout: '5s',
    discardResponseBodies: true,
  });
  
  eventsIngested.add(burstSize);
  check(res, {
    'Burst handled': (r) => [200, 202, 429].includes(r.status),
    'Not crashed': (r) => ![502, 503, 504].includes(r.status),
  });
}

/**
 * Endurance Throughput Test
 * Validates sustained performance over extended periods
 */
export function testEndurance() {
  measureThroughput();
  
  // Periodic health check during endurance test
  if (__ITER % 1000 === 0) {
    checkHealthEndpoint();
  }
}

// Event Generation Functions

function generateEventBatch(size) {
  const events = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < size; i++) {
    events.push(generateSecurityEvent(baseTime - (i * 10))); // Staggered timestamps
  }
  
  return events;
}

function generateSecurityEvent(timestamp) {
  const eventTypes = [
    'network.connection',
    'security.alert',
    'authentication.attempt',
    'malware.detection',
    'intrusion.signature',
    'dns.query',
    'http.request',
    'file.access',
    'process.execution',
    'registry.change',
  ];
  
  const severities = ['info', 'low', 'medium', 'high', 'critical'];
  const severityWeights = [0.4, 0.25, 0.2, 0.1, 0.05]; // Most events are low severity
  
  let random = Math.random();
  let severityIndex = 0;
  let cumulative = 0;
  for (let i = 0; i < severityWeights.length; i++) {
    cumulative += severityWeights[i];
    if (random <= cumulative) {
      severityIndex = i;
      break;
    }
  }
  
  return {
    id: `evt-${timestamp}-${Math.random().toString(36).substr(2, 8)}`,
    timestamp: new Date(timestamp).toISOString(),
    event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    severity: severities[severityIndex],
    source: getSourceSystem(),
    source_ip: generateIP('external'),
    destination_ip: generateIP('internal'),
    destination_port: getRandomPort(),
    protocol: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'][Math.floor(Math.random() * 6)],
    raw_data: generateRawLog(eventTypes[Math.floor(Math.random() * eventTypes.length)]),
    custom_fields: {
      correlation_id: generateCorrelationId(),
      session_id: generateSessionId(),
      user_agent: getUserAgent(),
      geoip_country: 'DZ', // Algeria as primary location
      geoip_city: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'][Math.floor(Math.random() * 5)],
    },
  };
}

function getSourceSystem() {
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
  let cumulative = 0;
  for (const source of sources) {
    cumulative += source.weight;
    if (rand <= cumulative) return source.type;
  }
  return 'unknown';
}

function generateIP(type) {
  if (type === 'external') {
    // Generate realistic external IPs (various ranges)
    const ranges = [
      [41, 255], [102, 255], [196, 255], // Algeria IP ranges
      [8, 8], [172, 217], [157, 240],    // Cloud providers
      [185, 200], [45, 150],             // European ranges
    ];
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  } else {
    // Internal Djezzy network (10.x.x.x)
    return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
}

function getRandomPort() {
  const commonPorts = [80, 443, 22, 21, 25, 53, 3306, 5432, 8080, 8443];
  return Math.random() > 0.7 ? commonPorts[Math.floor(Math.random() * commonPorts.length)] : Math.floor(Math.random() * 65535) + 1;
}

function generateRawLog(eventType) {
  const templates = {
    'network.connection': `<134>${new Date().toISOString()} %fw1% Accept: ${generateIP('external')}:${getRandomPort()} -> ${generateIP('internal')}:${getRandomPort()} tcp`,
    'security.alert': `[ALERT] [${new Date().toISOString()}] [Priority: 3] {${generateIP('external')}} -> ${generateIP('internal')} [Signature: SID12345 - Potential SQL Injection]`,
    'authentication.attempt': `${new Date().toISOString()} sshd[12345]: Failed password for invalid user ${['admin', 'root', 'test', 'oracle'][Math.floor(Math.random() * 4)]} from ${generateIP('external')} port ${getRandomPort()} ssh2`,
    'malware.detection': `AV_ALERT|${new Date().toISOString()}|${generateIP('external')}|Trojan.GenericKD.12345678|${['quarantine', 'blocked', 'detected'][Math.floor(Math.random() * 3)]}|sig_v2.0`,
    'intrusion.signature`: `ET TROJAN Win32/Emotet C2 Activity ${new Date().toISOString()} [Classification: Trojan Activity] [Priority: 1] {TCP} ${generateIP('external')}:${getRandomPort()} -> ${generateIP('internal')}:${getRandomPort()}`,
    'dns.query': `${new Date().toISOString()} dns-query ${Math.floor(Math.random() * 99999)} ${['malware.example.com', 'c2.evil.net', 'phishing-site.org'][Math.floor(Math.random() * 3)]} A`,
    'http.request': `${generateIP('external')} - - [${new Date().toUTCString()}] "GET /${['admin', 'login', 'api', 'wp-login'][Math.floor(Math.random() * 4)]} HTTP/1.1" ${[200, 404, 500, 301][Math.floor(Math.random() * 4)]} ${Math.floor(Math.random() * 5000) + 100}`,
    default: `${new Date().toISOString()} | ${getSourceSystem()} | ${eventTypes[Math.floor(Math.random() * 10)]} | severity=${severities[Math.floor(Math.random() * 5)]}`,
  };
  
  return templates[eventType] || templates.default;
}

function generateCorrelationId() {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
}

function generateSessionId() {
  return `sess-${Math.random().toString(36).substr(2, 16)}`;
}

function generateBatchId() {
  return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
}

function getUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'python-requests/2.28.0',
    'curl/7.88.1',
    'Go-http-client/2.0',
    '',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

let ingestionToken = null;

function getIngestionToken() {
  if (!ingestionToken && __ENV.INGESTION_TOKEN) {
    ingestionToken = __ENV.INGESTION_TOKEN;
  }
  return ingestionToken || 'perf-test-ingestion-token';
}

function checkHealthEndpoint() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const res = http.get(`${baseUrl}/api/health`, {
    tags: { name: 'HealthCheck' },
    timeout: '5s',
  });
  
  check(res, {
    'System healthy during endurance': (r) => r.status === 200,
  });
}

export function setup() {
  console.log('\n========================================');
  console.log('  Djezzy SOC Ingestion Throughput Test');
  console.log('========================================');
  console.log(`Target EPS: ${CONFIG.targetEPS.toLocaleString()}`);
  console.log(`Batch Size: ${CONFIG.batchSize}`);
  console.log(`Required Rate: ${Math.ceil(CONFIG.targetEPS / CONFIG.batchSize)} batches/sec`);
  console.log(`Duration: ${CONFIG.testDuration}`);
  console.log(`Start Time: ${new Date().toISOString()}`);
  console.log('----------------------------------------\n');
  
  return {
    targetEPS: CONFIG.targetEPS,
    startTime: Date.now(),
  };
}

export function teardown(data) {
  const elapsed = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  const totalEvents = data.targetEPS * parseFloat(elapsed) * 60;
  
  console.log('\n========================================');
  console.log('  Throughput Test Complete');
  console.log('================================--------');
  console.log(`Duration: ${elapsed} minutes`);
  console.log(`Target Events Processed: ~${totalEvents.toLocaleString()}`);
  console.log(`End Time: ${new Date().toISOString()}`);
  console.log('========================================\n');
}
