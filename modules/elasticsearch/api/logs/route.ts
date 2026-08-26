/**
 * Elasticsearch Logs API Routes
 * National SOC Platform - Algeria 2026-2030
 * 
 * Endpoints:
 * GET /api/es/logs - Search logs with filtering
 * GET /api/es/logs/aggregations - Get log analytics
 * POST /api/es/logs/bulk - Bulk ingest logs
 * GET /api/es/logs/indices - List log indices
 * GET /api/es/logs/stats - Index statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ESLogDocument,
  ESLogFilter,
  ESLogResultSet,
  ESLogAnalytics,
  LogSeverity,
  LogSource,
  SortOrder,
  ESTimeRange,
  ESIndexSummary,
  ESIndexStats,
  DEFAULT_INDEX_PATTERNS,
  ESAggregation,
  ESBulkResponse,
  ESApiResponse
} from '../../types/elasticsearch.types';

// ============================================================================
// MOCK DATA FOR DEVELOPMENT (Replace with actual Elasticsearch queries)
// ============================================================================

const mockLogs: ESLogDocument[] = [
  {
    _id: 'log-001',
    _index: 'wazuh-alerts-2026.07.25',
    _score: 1.0,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:15:32.123Z',
      event: {
        category: ['intrusion_detection'],
        type: ['alert'],
        kind: 'alert',
        outcome: 'success',
        severity: 7,
        severity_name: 'critical',
        risk_score: 95,
        dataset: 'wazuh.alerts',
        module: 'wazuh'
      },
      log: {
        level: 'error',
        logger: 'wazuh-analysisd',
        origin: {
          file: { name: 'analysisd.c', line: 1250 }
        }
      },
      message: '[Alert level 15] - Potential C2 communication detected to IP 185.220.101.0 on port 443 using TLS beacon pattern (60s interval)',
      tags: ['c2', 'beacon', 'tls', 'critical'],
      observer: {
        name: 'wazuh-manager-algiers',
        type: 'security',
        hostname: 'soc-wazuh-01.dz',
        ip: '192.168.100.10',
        version: '4.8.2',
        product: 'Wazuh SIEM'
      },
      host: {
        name: 'srv-web-prod-01',
        hostname: 'srv-web-prod-01.soc.dz',
        id: 'host-001',
        ip: ['196.200.100.50'],
        os: {
          family: 'linux',
          name: 'Ubuntu',
          version: '22.04 LTS',
          kernel: '5.15.0-91-generic'
        },
        architecture: 'x86_64'
      },
      source: {
        ip: '185.220.101.0',
        port: 443,
        geo: {
          city_name: 'Frankfurt',
          country_iso_code: 'DE',
          location: { lat: 50.1109, lon: 8.6821 }
        }
      },
      destination: {
        ip: '196.200.100.50',
        port: 54321
      },
      network: {
        transport: 'tcp',
        protocol: 'https',
        direction: 'outbound'
      },
      threat: {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0011', name: 'Command and Control' },
        technique: { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' },
        indicator: {
          ip: '185.220.101.0',
          confidence: 'high',
          provider: 'MISP',
          type: 'known_c2_ip'
        }
      },
      soc: {
        alert_id: 'alert-001',
        correlation_group: 'cg-c2-beacon-july25',
        enrichment_data: {
          first_seen: '2026-07-20T08:30:00Z',
          last_seen: '2026-07-25T10:15:32Z',
          connection_count: 47,
          unique_ports: [443, 80, 8080]
        }
      },
      raw_log: '{"timestamp":"2026-07-25T10:15:32","rule":{"level":15,"description":"Potential C2 communication detected"},"srcip":"185.220.101.0","dstport":54321}'
    }
  },
  {
    _id: 'log-002',
    _index: 'suricata-2026.07.25',
    _score: 0.95,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:14:45.789Z',
      event: {
        category: ['intrusion_detection'],
        type: ['alert'],
        kind: 'alert',
        outcome: 'blocked',
        severity: 6,
        severity_name: 'high',
        risk_score: 82,
        dataset: 'suricata.events',
        module: 'suricata'
      },
      log: {
        level: 'warning',
        logger: 'suricata-alert'
      },
      message: '[SURICATA] ET SCAN Brute Force Login Attempt from 91.121.87.100 to SSH (2323)',
      tags: ['brute-force', 'ssh', 'scan', 'high'],
      observer: {
        name: 'suricata-sensor-edge-01',
        type: 'ids',
        hostname: 'soc-suricata-01.dz',
        ip: '192.168.100.20',
        version: '7.0.4',
        product: 'Suricata IDS'
      },
      host: {
        name: 'srv-bastion-01',
        hostname: 'srv-bastion-01.soc.dz',
        ip: ['196.200.100.51']
      },
      source: {
        ip: '91.121.87.100',
        port: 23,
        geo: {
          city_name: 'Paris',
          country_iso_code: 'FR',
          location: { lat: 48.8566, lon: 2.3522 }
        }
      },
      destination: {
        ip: '196.200.100.51',
        port: 2323
      },
      network: {
        transport: 'tcp',
        protocol: 'ssh',
        direction: 'inbound'
      },
      threat: {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0006', name: 'Credential Access' },
        technique: { id: 'T1110.001', name: 'Brute Force: Password Guessing' }
      },
      raw_log: '{"alert":{"signature_id":2020051,"category":"Attempted Administrator Privilege Gain"}}'
    }
  },
  {
    _id: 'log-003',
    _index: 'wazuh-alerts-2026.07.25',
    _score: 0.88,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:13:22.456Z',
      event: {
        category: ['network'],
        type: ['connection'],
        kind: 'event',
        severity: 4,
        severity_name: 'warning',
        risk_score: 65,
        dataset: 'wazuh.alerts',
        module: 'wazuh'
      },
      log: {
        level: 'notice',
        logger: 'wazuh-analysisd'
      },
      message: '[DNS] Suspicious DGA domain query detected: xqwerasdf1234.malware-c2.net',
      tags: ['dns', 'dga', 'malware', 'suspicious'],
      observer: {
        name: 'wazuh-manager-algiers',
        product: 'Wazuh SIEM'
      },
      host: {
        name: 'srv-dns-01',
        ip: ['196.200.100.52']
      },
      source: {
        ip: '45.33.32.156',
        port: 53,
        geo: {
          city_name: 'Dallas',
          country_iso_code: 'US',
          location: { lat: 32.7767, lon: -96.7970 }
        }
      },
      dns: {
        type: 'query',
        question: { name: 'xqwerasdf1234.malware-c2.net', type: 'A' }
      },
      network: {
        transport: 'udp',
        protocol: 'dns'
      },
      raw_log: '{"type":"DNS","query":"xqwerasdf1234.malware-c2.net"}'
    }
  },
  {
    _id: 'log-004',
    _index: 'suricata-2026.07.25',
    _score: 0.99,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:12:18.901Z',
      event: {
        category: ['malware'],
        type: ['alert'],
        kind: 'alert',
        outcome: 'alerted',
        severity: 7,
        severity_name: 'critical',
        risk_score: 99,
        dataset: 'suricata.events',
        module: 'suricata'
      },
      log: {
        level: 'critical',
        logger: 'suricata-alert'
      },
      message: '[CRITICAL] ET TROJAN Metasploit Default Pattern Detected on port 4444 from 194.163.128.50',
      tags: ['metasploit', 'malware', 'trojan', 'critical', 'exploit'],
      observer: {
        name: 'suricata-sensor-dmz-01',
        product: 'Suricata IDS'
      },
      host: {
        name: 'srv-web-dev-01',
        ip: ['196.200.100.53']
      },
      source: {
        ip: '194.163.128.50',
        port: 4444,
        geo: {
          city_name: 'Moscow',
          country_iso_code: 'RU',
          location: { lat: 55.7558, lon: 37.6173 }
        }
      },
      destination: {
        ip: '196.200.100.53',
        port: 4444
      },
      network: {
        transport: 'tcp',
        direction: 'inbound'
      },
      threat: {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0002', name: 'Execution' },
        technique: { id: 'T1059.007', name: 'JavaScript Execution' }
      },
      raw_log: '{"signature":"ET TROJAN Metasploit Default Pattern Detected"}'
    }
  },
  {
    _id: 'log-005',
    _index: 'syslog-2026.07.25',
    _score: 0.55,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:11:05.234Z',
      event: {
        category: ['configuration'],
        type: ['change'],
        kind: 'event',
        severity: 2,
        severity_name: 'info',
        risk_score: 15,
        dataset: 'system.syslog',
        module: 'system'
      },
      log: {
        level: 'informational',
        logger: 'sudo',
        sys: {
          facility: 10,
          severity: 6,
          hostname: 'srv-admin-01',
          appname: 'sudo',
          procid: '28471'
        }
      },
      message: 'user analyst1 executed sudo /usr/bin/systemctl restart nginx',
      tags: ['sudo', 'admin-action', 'info'],
      observer: {
        name: 'syslog-collector-01',
        type: 'collector'
      },
      host: {
        name: 'srv-admin-01',
        ip: ['192.168.1.50']
      },
      user: {
        name: 'analyst1',
        id: 'uid=1001'
      },
      process: {
        name: 'sudo',
        pid: 28471,
        command_line: 'sudo /usr/bin/systemctl restart nginx'
      },
      raw_log: '<134>Jul 25 10:11:05 srv-admin-01 sudo: analyst1 : TTY=pts/0 ; PWD=/home/analyst1 ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx'
    }
  },
  {
    _id: 'log-006',
    _index: 'firewall-2026.07.25',
    _score: 0.72,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:09:42.567Z',
      event: {
        category: ['network'],
        type: ['connection'],
        kind: 'event',
        outcome: 'denied',
        severity: 3,
        severity_name: 'notice',
        risk_score: 35,
        dataset: 'firewall.events',
        module: 'paloalto'
      },
      log: {
        level: 'warning',
        logger: 'pan Threat Prevention'
      },
      message: '[FIREWALL DENY] Blocked outbound connection to 103.21.244.0/24 - Category: Malicious Domain',
      tags: ['firewall', 'deny', 'blocked', 'malicious'],
      observer: {
        name: 'fw-perimeter-01',
        type: 'firewall',
        version: '11.1.0',
        product: 'Palo Alto Networks NGFW'
      },
      source: {
        ip: '196.200.100.60',
        port: 49152
      },
      destination: {
        ip: '103.21.244.72',
        port: 443
      },
      network: {
        transport: 'tcp',
        protocol: 'https',
        direction: 'outbound'
      },
      url: {
        original: 'https://malicious-domain.xyz/payload.exe',
        domain: 'malicious-domain.xyz'
      },
      raw_log: '1,2026/07/25 10:09:42,103.21.244.72,443,196.200.100.60,49152,tcp,deny,web-browsing,malicious-domain,any,trust,2026/07/25 10:09:42,1,2345,1,0,0,0x0,general,allowed,0,103.21.244.0,103.21.244.255,0,0,0,0,,paloalto-firewall'
    }
  },
  {
    _id: 'log-007',
    _index: 'misp-events-2026.07.25',
    _score: 0.85,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:08:15.333Z',
      event: {
        category: ['threat-intelligence'],
        type: ['indicator'],
        kind: 'enrichment',
        severity: 5,
        severity_name: 'medium',
        risk_score: 70,
        dataset: 'misp.events',
        module: 'misp'
      },
      log: {
        level: 'notice',
        logger: 'misp-sync'
      },
      message: '[MISP] New IOC published: SHA256 hash a1b2c3d4e5f6... associated with APT29 campaign',
      tags: ['ioc', 'misp', 'apt29', 'threat-intel'],
      observer: {
        name: 'misp-server-01',
        type: 'ti-platform',
        product: 'MISP'
      },
      threat: {
        framework: 'MITRE ATT&CK',
        group: { id: 'G0016', name: 'APT29' },
        indicator: {
          file: { sha256: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2' },
          type: 'malware-hash',
          provider: 'MISP',
          first_seen: '2026-07-25T10:08:00Z'
        }
      },
      raw_log: '{"Event":{"id":"1234","uuid":"550e8400-e29b-41d4-a716-446655440000","threat_level_id":"2","published":true}}'
    }
  },
  {
    _id: 'log-008',
    _index: 'audit-2026.07.25',
    _score: 0.62,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:06:33.888Z',
      event: {
        category: ['authentication'],
        type: ['start'],
        kind: 'event',
        outcome: 'failure',
        severity: 4,
        severity_name: 'warning',
        risk_score: 55,
        dataset: 'audit.auth',
        module: 'audit'
      },
      log: {
        level: 'warning',
        logger: 'sshd'
      },
      message: '[AUTH FAILURE] Failed login attempt for user admin from 198.51.100.23 - Invalid password (attempt 5/10)',
      tags: ['auth-failure', 'ssh', 'brute-force', 'warning'],
      observer: {
        name: 'audit-collector-01',
        type: 'audit'
      },
      host: {
        name: 'srv-bastion-01',
        ip: ['196.200.100.51']
      },
      source: {
        ip: '198.51.100.23',
        port: 54321,
        geo: {
          city_name: 'Unknown',
          country_iso_code: 'US'
        }
      },
      user: {
        name: 'admin'
      },
      process: {
        name: 'sshd',
        pid: 15234
      },
      raw_log: 'Jul 25 10:06:33 srv-bastion-01 sshd[15234]: Failed password for admin from 198.51.100.23 port 54321 ssh2'
    }
  },
  {
    _id: 'log-009',
    _index: 'application-2026.07.25',
    _score: 0.48,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:04:18.222Z',
      event: {
        category: ['web'],
        type: ['access'],
        kind: 'event',
        outcome: 'success',
        severity: 1,
        severity_name: 'debug',
        risk_score: 5,
        dataset: 'nginx.access',
        module: 'nginx'
      },
      log: {
        level: 'debug',
        logger: 'nginx'
      },
      message: 'GET /api/v2/users HTTP/1.1" 200 1234 "Mozilla/5.0..." 0.045',
      tags: ['http', 'api', 'access-log'],
      http: {
        method: 'GET',
        status_code: 200,
        request: { bytes: '512' },
        response: { bytes: '1234' }
      },
      url: {
        original: '/api/v2/users?limit=50&page=1',
        path: '/api/v2/users'
      },
      source: {
        ip: '172.16.0.100',
        port: 49152
      },
      destination: {
        ip: '196.200.100.70',
        port: 443
      },
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      raw_log: '172.16.0.100 - - [25/Jul/2026:10:04:18 +0100] "GET /api/v2/users HTTP/1.1" 200 1234 "https://dashboard.soc.dz/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"'
    }
  },
  {
    _id: 'log-010',
    _index: 'thehive-alerts-2026.07.25',
    _score: 0.92,
    found: true,
    _source: {
      '@timestamp': '2026-07-25T10:02:45.111Z',
      event: {
        category: ['case-management'],
        type: ['creation'],
        kind: 'alert',
        severity: 6,
        severity_name: 'high',
        risk_score: 88,
        dataset: 'thehive.cases',
        module: 'thehive'
      },
      log: {
        level: 'error',
        logger: 'thehive-case-worker'
      },
      message: '[THEHIVE] Case #CASE-2026-0725-001 created: Critical phishing campaign targeting Algerian government entities',
      tags: ['case', 'phishing', 'government', 'high-priority'],
      observer: {
        name: 'thehive-server-01',
        type: 'soar',
        product: 'TheHive'
      },
      soc: {
        case_id: 'CASE-2026-0725-001',
        alert_id: 'alert-phish-gov-001',
        escalation_level: 2,
        sla_breach_risk: 'medium'
      },
      threat: {
        framework: 'MITRE ATT&CK',
        tactic: { id: 'TA0001', name: 'Initial Access' },
        technique: { id: 'T1566.001', name: 'Spearphishing Attachment' }
      },
      raw_log: '{"caseId":"CASE-2026-0725-001","title":"Critical phishing campaign targeting Algerian government entities","severity":3,"tlp":2}'
    }
  }
];

const mockIndices: ESIndexSummary[] = [
  {
    name: 'wazuh-alerts-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-wazuh-001',
    primary_shards: 3,
    replica_shards: 1,
    document_count: 154230,
    deleted_documents: 1245,
    size: '2.3GB',
    size_bytes: 2469606195,
    primary_size: '1.7GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:15:32Z',
    ilm_phase: 'hot',
    templates_applied: ['wazuh-template']
  },
  {
    name: 'suricata-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-suricata-001',
    primary_shards: 5,
    replica_shards: 1,
    document_count: 892450,
    deleted_documents: 5678,
    size: '8.7GB',
    size_bytes: 9338793984,
    primary_size: '6.5GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:12:18Z',
    ilm_phase: 'hot',
    templates_applied: ['suricata-template']
  },
  {
    name: 'misp-events-2026.07.25',
    health: 'yellow' as any,
    status: 'open',
    uuid: 'uuid-misp-001',
    primary_shards: 1,
    replica_shards: 1,
    document_count: 12340,
    deleted_documents: 123,
    size: '450MB',
    size_bytes: 471859200,
    primary_size: '225MB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:08:15Z',
    ilm_phase: 'hot',
    templates_applied: ['misp-template']
  },
  {
    name: 'syslog-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-syslog-001',
    primary_shards: 2,
    replica_shards: 1,
    document_count: 567890,
    deleted_documents: 3456,
    size: '4.2GB',
    size_bytes: 4509715660,
    primary_size: '3.1GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:11:05Z',
    ilm_phase: 'hot',
    templates_applied: ['syslog-template']
  },
  {
    name: 'firewall-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-fw-001',
    primary_shards: 3,
    replica_shards: 1,
    document_count: 2345678,
    deleted_documents: 9876,
    size: '12.5GB',
    size_bytes: 13421772800,
    primary_size: '9.2GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:09:42Z',
    ilm_phase: 'hot',
    templates_applied: ['firewall-template']
  },
  {
    name: 'audit-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-audit-001',
    primary_shards: 2,
    replica_shards: 1,
    document_count: 345678,
    deleted_documents: 2100,
    size: '1.8GB',
    size_bytes: 1932735283,
    primary_size: '1.3GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:06:33Z',
    ilm_phase: 'hot',
    templates_applied: ['audit-template']
  },
  {
    name: 'application-2026.07.25',
    health: 'green' as any,
    status: 'open',
    uuid: 'uuid-app-001',
    primary_shards: 4,
    replica_shards: 1,
    document_count: 4567890,
    deleted_documents: 15000,
    size: '15.3GB',
    size_bytes: 16426732800,
    primary_size: '11.2GB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:04:18Z',
    ilm_phase: 'hot',
    templates_applied: ['app-template']
  },
  {
    name: 'thehive-alerts-2026.07.25',
    health: 'yellow' as any,
    status: 'open',
    uuid: 'uuid-thehive-001',
    primary_shards: 1,
    replica_shards: 1,
    document_count: 5678,
    deleted_documents: 89,
    size: '180MB',
    size_bytes: 188743680,
    primary_size: '90MB',
    creation_date: '2026-07-25T00:00:00Z',
    last_modified: '2026-07-25T10:02:45Z',
    ilm_phase: 'hot',
    templates_applied: ['thehive-template']
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply filters to log list
 */
function applyFilters(logs: ESLogDocument[], filter: Partial<ESLogFilter>): ESLogDocument[] {
  let filtered = [...logs];

  // Time range filtering
  if (filter.time_range && filter.time_range !== ESTimeRange.CUSTOM) {
    const now = new Date();
    let startTime: Date;
    
    switch (filter.time_range) {
      case ESTimeRange.LAST_15_MINUTES:
        startTime = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case ESTimeRange.LAST_30_MINUTES:
        startTime = new Date(now.getTime() - 30 * 60 * 1000);
        break;
      case ESTimeRange.LAST_HOUR:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case ESTimeRange.LAST_24_HOURS:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case ESTimeRange.LAST_7_DAYS:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case ESTimeRange.LAST_30_DAYS:
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    filtered = filtered.filter(log => 
      new Date(log._source!['@timestamp']) >= startTime
    );
  }

  // Custom time range
  if (filter.time_start || filter.time_end) {
    const start = filter.time_start ? new Date(filter.time_start) : new Date(0);
    const end = filter.time_end ? new Date(filter.time_end) : new Date();
    
    filtered = filtered.filter(log => {
      const ts = new Date(log._source!['@timestamp']);
      return ts >= start && ts <= end;
    });
  }

  // Severity filter
  if (filter.severities?.length) {
    filtered = filtered.filter(log =>
      filter.severities!.includes(log._source?.event?.severity as LogSeverity)
    );
  }

  // Source filter
  if (filter.sources?.length) {
    filtered = filtered.filter(log =>
      filter.sources!.includes(log._source?.event?.module as LogSource)
    );
  }

  // Host filter
  if (filter.hosts?.length) {
    filtered = filtered.filter(log =>
      filter.hosts!.includes(log._source?.host?.name || '')
    );
  }

  // Event categories filter
  if (filter.event_categories?.length) {
    filtered = filtered.filter(log =>
      log._source?.event?.category?.some(cat => 
        filter.event_categories!.includes(cat)
      )
    );
  }

  // Tags filter
  if (filter.tags?.length) {
    filtered = filtered.filter(log =>
      log._source?.tags?.some(tag => 
        filter.tags!.includes(tag)
      )
    );
  }

  // Message contains filter
  if (filter.message_contains) {
    const searchTerm = filter.message_contains.toLowerCase();
    filtered = filtered.filter(log =>
      log._source?.message?.toLowerCase().includes(searchTerm) ||
      log._source?.raw_log?.toLowerCase().includes(searchTerm)
    );
  }

  // Source IPs filter
  if (filter.src_ips?.length) {
    filtered = filtered.filter(log =>
      filter.src_ips!.includes(log._source?.source?.ip as string)
    );
  }

  // Destination IPs filter
  if (filter.dest_ips?.length) {
    filtered = filtered.filter(log =>
      filter.dest_ips!.includes(log._source?.destination?.ip as string)
    );
  }

  return filtered;
}

/**
 * Sort logs
 */
function sortLogs(
  logs: ESLogDocument[],
  sortBy: string = '@timestamp',
  sortOrder: SortOrder = SortOrder.DESC
): ESLogDocument[] {
  return [...logs].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case '@timestamp':
        comparison = new Date(a._source!['@timestamp']).getTime() - 
                    new Date(b._source!['@timestamp']).getTime();
        break;
      case 'severity':
        comparison = (b._source?.event?.severity || 0) - (a._source?.event?.severity || 0);
        break;
      case 'host.name':
        comparison = (a._source?.host?.name || '').localeCompare(b._source?.host?.name || '');
        break;
      case 'source.ip':
        comparison = (a._source?.source?.ip || '').localeCompare(b._source?.source?.ip || '');
        break;
      default:
        comparison = 0;
    }

    return sortOrder === SortOrder.DESC ? -comparison : comparison;
  });
}

/**
 * Calculate aggregations from logs
 */
function calculateAggregations(logs: ESLogDocument[]): Record<string, any> {
  const aggregations: Record<string, any> = {
    by_severity: {},
    by_source: {},
    by_host: {},
    by_event_category: {},
    timeline: {}
  };

  // Initialize counters
  Object.values(LogSeverity).forEach(s => {
    if (typeof s === 'number') aggregations.by_severity[s] = 0;
  });
  Object.values(LogSource).forEach(s => {
    aggregations.by_source[s] = 0;
  });

  logs.forEach(log => {
    // Severity aggregation
    const severity = log._source?.event?.severity;
    if (severity !== undefined) {
      aggregations.by_severity[severity] = (aggregations.by_severity[severity] || 0) + 1;
    }

    // Source aggregation
    const source = log._source?.event?.module;
    if (source) {
      aggregations.by_source[source] = (aggregations.by_source[source] || 0) + 1;
    }

    // Host aggregation
    const host = log._source?.host?.name;
    if (host) {
      aggregations.by_host[host] = (aggregations.by_host[host] || 0) + 1;
    }

    // Event category aggregation
    const categories = log._source?.event?.category || [];
    categories.forEach((cat: string) => {
      aggregations.by_event_category[cat] = (aggregations.by_event_category[cat] || 0) + 1;
    });

    // Timeline aggregation (hourly)
    const hour = new Date(log._source!['@timestamp']).toISOString().slice(0, 13) + ':00:00';
    aggregations.timeline[hour] = (aggregations.timeline[hour] || 0) + 1;
  });

  // Convert timeline to array format
  aggregations.timeline_array = Object.entries(aggregations.timeline)
    .map(([key, count]) => ({ key_as_string: key, key: new Date(key).getTime(), doc_count: count }))
    .sort((a, b) => a.key - b.key);

  return aggregations;
}

/**
 * Paginate results
 */
function paginate<T>(items: T[], page: number = 1, pageSize: number = 20): {
  items: T[];
  total: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;

  return {
    items: items.slice(startIndex, startIndex + pageSize),
    total,
    totalPages
  };
}

// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/es/logs
 * Search and list logs with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filter: ESLogFilter = {
      time_range: searchParams.get('time_range') as ESTimeRange || ESTimeRange.LAST_24_HOURS,
      time_start: searchParams.get('time_start') || undefined,
      time_end: searchParams.get('time_end') || undefined,
      index_patterns: searchParams.get('index_patterns')?.split(',') || undefined,
      query_string: searchParams.get('query_string') || undefined,
      severities: searchParams.get('severities')?.split(',').map(Number).filter(n => !isNaN(n)) as LogSeverity[] | undefined,
      sources: searchParams.get('sources')?.split(',') as LogSource[] | undefined,
      hosts: searchParams.get('hosts')?.split(',') || undefined,
      event_categories: searchParams.get('event_categories')?.split(',') || undefined,
      message_contains: searchParams.get('message_contains') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      src_ips: searchParams.get('src_ips')?.split(',') || undefined,
      dest_ips: searchParams.get('dest_ips')?.split(',') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : 20,
      sort_by: searchParams.get('sort_by') || '@timestamp',
      sort_order: (searchParams.get('sort_order') as SortOrder) || SortOrder.DESC,
      highlight: searchParams.get('highlight') === 'true',
      fields: searchParams.get('fields')?.split(',') || undefined
    };

    // Determine which endpoint is being called based on path
    const pathname = request.nextUrl.pathname;

    // Handle different sub-routes
    if (pathname.includes('/aggregations')) {
      return handleGetAggregations(request);
    }
    
    if (pathname.includes('/indices')) {
      return handleGetIndices(request);
    }
    
    if (pathname.includes('/stats')) {
      return handleGetStats(request);
    }

    // Main logs search endpoint
    let filteredLogs = applyFilters(mockLogs, filter);

    // Sort
    filteredLogs = sortLogs(filteredLogs, filter.sort_by!, filter.sort_order);

    // Paginate
    const paginatedResult = paginate(filteredLogs, filter.page!, filter.page_size!);

    // Calculate aggregations
    const aggregations = calculateAggregations(mockLogs);

    const result: ESLogResultSet = {
      logs: paginatedResult.items,
      total: paginatedResult.total,
      page: filter.page!,
      page_size: filter.page_size!,
      total_pages: paginatedResult.totalPages,
      aggregations,
      query_time_ms: 12,
      applied_filters: filter
    };

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        execution_time_ms: 12,
        cached: false,
        es_took_ms: 8,
        es_timed_out: false,
        es_shards: {
          total: 12,
          successful: 12,
          skipped: 0,
          failed: 0
        }
      }
    });

  } catch (error) {
    console.error('[ES Logs API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/es/logs
 * Create log entry or perform bulk operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'bulk-ingest':
        // Handle bulk ingest of logs
        return handleBulkIngest(params.logs || [], params.index_pattern || 'logs-*');

      case 'add-note':
        // Add analyst note to log
        return NextResponse.json({
          success: true,
          data: {
            log_id: params.log_id,
            note_id: `note-${Date.now()}`,
            content: params.content,
            created_at: new Date().toISOString(),
            created_by: params.user_id || 'analyst'
          }
        });

      case 'tag':
        // Tag log entries
        return NextResponse.json({
          success: true,
          data: {
            tagged_count: params.log_ids?.length || 0,
            tags_added: params.tags || [],
            operation_id: `op-${Date.now()}`
          }
        });

      case 'export':
        // Export logs
        return handleExport(params);

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[ES Logs API] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// SUB-HANDLER FUNCTIONS
// ============================================================================

/**
 * Handle GET /api/es/logs/aggregations
 */
async function handleGetAggregations(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  
  const timeRange = {
    gte: searchParams.get('gte') || 'now-24h',
    lte: searchParams.get('lte') || 'now'
  };
  const interval = searchParams.get('interval') || '1h';

  // Mock analytics data
  const analytics: ESLogAnalytics = {
    timeline: [
      { timestamp: '2026-07-25T02:00:00Z', count: 145 },
      { timestamp: '2026-07-25T03:00:00Z', count: 132 },
      { timestamp: '2026-07-25T04:00:00Z', count: 98 },
      { timestamp: '2026-07-25T05:00:00Z', count: 87 },
      { timestamp: '2026-07-25T06:00:00Z', count: 112 },
      { timestamp: '2026-07-25T07:00:00Z', count: 178 },
      { timestamp: '2026-07-25T08:00:00Z', count: 256 },
      { timestamp: '2026-07-25T09:00:00Z', count: 389 },
      { timestamp: '2026-07-25T10:00:00Z', count: 445 },
      { timestamp: '2026-07-25T11:00:00Z', count: 312 }
    ],
    by_severity: {
      '0': 5,
      '1': 45,
      '2': 120,
      '3': 280,
      '4': 520,
      '5': 340,
      '6': 180,
      '7': 95
    },
    by_source: {
      wazuh: 2450,
      suricata: 1890,
      misp: 320,
      system: 560,
      firewall: 1200,
      audit: 430,
      application: 890,
      custom: 150
    },
    by_host: [
      { host: 'srv-web-prod-01', count: 892 },
      { host: 'srv-bastion-01', count: 654 },
      { host: 'srv-dns-01', count: 432 },
      { host: 'srv-admin-01', count: 321 },
      { host: 'fw-perimeter-01', count: 1156 },
      { host: 'srv-web-dev-01', count: 267 }
    ],
    by_event_category: [
      { category: 'intrusion_detection', count: 1890 },
      { category: 'network', count: 1650 },
      { category: 'authentication', count: 540 },
      { category: 'configuration', count: 380 },
      { category: 'web', count: 720 },
      { category: 'threat-intelligence', count: 290 },
      { category: 'case-management', count: 145 },
      { category: 'malware', count: 420 }
    ],
    top_ips: [
      { ip: '185.220.101.0', count: 342, direction: 'src' },
      { ip: '91.121.87.100', count: 287, direction: 'src' },
      { ip: '196.200.100.50', count: 856, direction: 'dest' },
      { ip: '194.163.128.50', count: 156, direction: 'src' },
      { ip: '103.21.244.72', count: 89, direction: 'dest' }
    ],
    unique_ips: 1234,
    unique_hosts: 45,
    avg_events_per_second: 127,
    peak_events_per_second: 356,
    time_range: { start: timeRange.gte, end: timeRange.lte }
  };

  return NextResponse.json({
    success: true,
    data: analytics,
    meta: {
      execution_time_ms: 45,
      cached: false
    }
  });
}

/**
 * Handle GET /api/es/logs/indices
 */
async function handleGetIndices(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  
  const pattern = searchParams.get('pattern') || '*';
  const health = searchParams.get('health');
  const status = searchParams.get('status');

  let indices = [...mockIndices];

  // Filter by pattern (simple implementation)
  if (pattern !== '*') {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    indices = indices.filter(idx => regex.test(idx.name));
  }

  // Filter by health
  if (health) {
    indices = indices.filter(idx => idx.health === health);
  }

  // Filter by status
  if (status) {
    indices = indices.filter(idx => idx.status === status);
  }

  // Calculate totals
  const totals = {
    total_indices: indices.length,
    total_documents: indices.reduce((sum, idx) => sum + idx.document_count, 0),
    total_size_bytes: indices.reduce((sum, idx) => sum + idx.size_bytes, 0),
    total_primary_shards: indices.reduce((sum, idx) => sum + idx.primary_shards, 0),
    total_replica_shards: indices.reduce((sum, idx) => sum + idx.replica_shards, 0),
    health_distribution: {
      green: indices.filter(i => i.health === 'green').length,
      yellow: indices.filter(i => i.health === 'yellow').length,
      red: indices.filter(i => i.health === 'red').length
    }
  };

  return NextResponse.json({
    success: true,
    data: {
      indices,
      totals
    },
    meta: {
      execution_time_ms: 8,
      cached: false
    }
  });
}

/**
 * Handle GET /api/es/logs/stats
 */
async function handleGetStats(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const indexPattern = searchParams.get('index') || '*';

  // Mock stats data
  const stats: ESIndexStats & {
    daily_stats?: Array<{ date: string; documents: number; size: string }>;
    field_cardinality?: Record<string, number>;
  } = {
    shards: { total: 21, primaries: 21, replication: 1 },
    docs: { count: 8923456, deleted: 37567 },
    store: { size_in_bytes: 46385646848, size: '43.2 GB' },
    indexing: {
      index_total: 2345678,
      index_time: '45m 23s',
      index_current: 12,
      index_failed: 234,
      throttle_time: '2s'
    },
    merges: {
      current: 2,
      current_docs: 4500,
      current_size_in_bytes: '15mb',
      total: 1234,
      total_time: '1h 23m',
      total_docs: 56789000,
      total_size_in_bytes: '2.3gb',
      failed: 0
    },
    refresh: {
      total: 3456789,
      total_time_in_millis: 2345678,
      external_total: 123456,
      external_total_time: '12m 34s',
      listeners: 0
    },
    flush: {
      total: 5678,
      periodic: 5670,
      total_time: '8m 45s'
    },
    get: {
      total: 12345678,
      time: '2h 34m',
      exists_total: 11234567,
      exists_time: '2h 12m',
      missing_total: 1111111,
      missing_time: '12m 34s',
      current: 0
    },
    search: {
      open_contexts: 5,
      query_total: 23456789,
      query_time: '5h 45m',
      query_current: 3,
      fetch_total: 22345678,
      fetch_time: '4h 32m',
      scroll_total: 1234,
      scroll_time: '23m 45s',
      point_in_time_total: 567,
      point_in_time_time: '5m 12s'
    },
    segments: {
      count: 45,
      memory_in_bytes: '234mb',
      terms_memory_in_bytes: '123mb',
      stored_fields_memory_in_bytes: '45mb',
      term_vectors_memory_in_bytes: '12mb',
      norms_memory_in_bytes: '8mb',
      points_memory_in_bytes: '23mb',
      doc_values_memory_in_bytes: '156mb',
      index_writer_memory_in_bytes: '34mb',
      index_writer_max_memory_in_bytes: '512mb',
      version_map_memory_in_bytes: '18mb',
      fixed_bit_set_memory_in_bytes: '5mb',
      writable_index_writer_buffer_bytes: 12345678,
      max_unsafe_auto_id_timestamp: 1758768623456
    },
    completion: { size_in_bytes: '0b' },
    translog: {
      operations: 12345,
      size_in_bytes: '234mb',
      uncommitted_operations: 234,
      uncommitted_size_in_bytes: '5mb',
      earliest_last_modified_age: 234
    },
    request_cache: {
      memory_size_in_bytes: '45mb',
      evictions: 1234,
      hit_count: 5678901,
      miss_count: 1234567
    },
    recovery: {
      current_as_source: 0,
      current_as_target: 0
    },
    // Additional computed stats
    daily_stats: [
      { date: '2026-07-19', documents: 8234567, size: '41.2 GB' },
      { date: '2026-07-20', documents: 8456234, size: '41.8 GB' },
      { date: '2026-07-21', documents: 8567890, size: '42.1 GB' },
      { date: '2026-07-22', documents: 8678901, size: '42.5 GB' },
      { date: '2026-07-23', documents: 8789012, size: '42.8 GB' },
      { date: '2026-07-24', documents: 8856234, size: '43.0 GB' },
      { date: '2026-07-25', documents: 8923456, size: '43.2 GB' }
    ],
    field_cardinality: {
      'host.name': 45,
      'source.ip': 1234,
      'destination.ip': 567,
      'event.module': 8,
      'event.category': 12,
      'event.severity': 8,
      'observer.name': 6
    }
  };

  return NextResponse.json({
    success: true,
    data: stats,
    meta: {
      execution_time_ms: 15,
      cached: false,
      index_pattern: indexPattern
    }
  });
}

/**
 * Handle bulk ingest
 */
async function handleBulkIngest(
  logs: Array<Partial<ESLogDocument['_source']>>,
  indexPattern: string
): Promise<NextResponse> {
  // Simulate bulk ingestion
  const ingestedCount = logs.length;
  const errors: Array<{ id: string; error: string }> = [];

  // Simulate some random errors for realism
  logs.forEach((_, index) => {
    if (Math.random() < 0.02) { // 2% error rate
      errors.push({ id: `doc-${index}`, error: 'Document validation failed' });
    }
  });

  const bulkResult: ESBulkResponse = {
    took: Math.floor(Math.random() * 100) + 10,
    errors: errors.length > 0,
    items: logs.map((_, index) => ({
      index: {
        _index: `${indexPattern.replace('*', new Date().toISOString().slice(0, 10))}`,
        _id: `generated-${Date.now()}-${index}`,
        _version: 1,
        result: errors.find(e => e.id === `doc-${index}`) ? 'error' : 'created',
        _shards: { total: 2, successful: 2, failed: 0 },
        _seq_no: index,
        _primary_term: 1,
        status: 201
      }
    }))
  };

  return NextResponse.json({
    success: true,
    data: {
      ...bulkResult,
      summary: {
        total_submitted: logs.length,
        successfully_ingested: ingestedCount - errors.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    },
    meta: {
      execution_time_ms: bulkResult.took,
      cached: false
    }
  });
}

/**
 * Handle export
 */
async function handleExport(params: any): Promise<NextResponse> {
  const format = params.format || 'json';
  const filters = params.filters || {};
  
  // Get filtered logs
  const filteredLogs = applyFilters(mockLogs, filters);
  
  // Generate export filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `logs-export-${timestamp}.${format}`;

  // Format output based on format
  let content: string;
  let contentType: string;

  switch (format) {
    case 'csv':
      contentType = 'text/csv';
      content = generateCSV(filteredLogs);
      break;
    case 'ndjson':
      contentType = 'application/x-ndjson';
      content = filteredLogs.map(log => JSON.stringify(log._source)).join('\n');
      break;
    case 'xml':
      contentType = 'application/xml';
      content = generateXML(filteredLogs);
      break;
    default:
      contentType = 'application/json';
      content = JSON.stringify(filteredLogs.map(l => l._source), null, 2);
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}

/**
 * Generate CSV from logs
 */
function generateCSV(logs: ESLogDocument[]): string {
  const headers = [
    'timestamp', 'severity', 'source', 'message', 'host', 'src_ip', 'dst_ip', 'tags'
  ];
  
  const rows = logs.map(log => [
    log._source?.['@timestamp'] || '',
    log._source?.event?.severity_name || '',
    log._source?.event?.module || '',
    `"${(log._source?.message || '').replace(/"/g, '""')}"`,
    log._source?.host?.name || '',
    log._source?.source?.ip || '',
    log._source?.destination?.ip || '',
    `"${(log._source?.tags || []).join(';')}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Generate XML from logs
 */
function generateXML(logs: ESLogDocument[]): string {
  const xmlLogs = logs.map(log => `
    <log>
      <timestamp>${log._source?.['@timestamp']}</timestamp>
      <severity>${log._source?.event?.severity}</severity>
      <source>${log._source?.event?.module}</source>
      <message><![CDATA[${log._source?.message}]]></message>
      <host>${log._source?.host?.name}</host>
      <src_ip>${log._source?.source?.ip}</src_ip>
      <dst_ip>${log._source?.destination?.ip}</dst_ip>
      <tags>${(log._source?.tags || []).join(',')}</tags>
    </log>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<logs count="${logs.length}">
${xmlLogs}
</logs>`;
}
