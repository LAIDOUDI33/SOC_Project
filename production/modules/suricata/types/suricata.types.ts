/**
 * 🇩🇿 National SOC - Suricata IDS/IPS Integration Types
 * TypeScript type definitions for Suricata network intrusion detection
 */

// ────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────

export interface SuricataConfig {
  /** Suricata API base URL */
  baseUrl: string;
  /** API key (if authentication enabled) */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
}

// ────────────────────────────────────────────────────────
// ALERT TYPES
// ────────────────────────────────────────────────────────

export interface SuricataAlert {
  /** Unique alert identifier */
  id: string;
  
  /** Alert timestamp */
  timestamp: string;
  
  /** Alert details */
  alert: {
    action: 'allowed' | 'blocked' | 'dropped' | 'rejected';
    gid: number;
    signature_id: number;
    rev: number;
    signature: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
    msg?: string;
  };
  
  /** Source IP */
  src_ip?: string;
  
  /** Source port */
  src_port?: number;
  
  /** Destination IP */
  dst_ip?: string;
  
  /** Destination port */
  dst_port?: number;
  
  /** Protocol (TCP, UDP, ICMP) */
  proto?: string;
  
  /** Packet info */
  packet_info?: string;
  
  /** Community ID (for correlation) */
  community_id?: string;
  
  /** PCAP file reference */
  pcap_cnt?: number;
  
  /** VLAN tag */
  vlan?: number[];
  
  /** Flow ID */
  flow_id?: number;
  
  // ────────────────────────────────────────────────────
  // Protocol-specific data
  // ────────────────────────────────────────────────────
  
  /** HTTP request data */
  http?: {
    hostname?: string;
    url?: string;
    http_method?: string;
    http_user_agent?: string;
    http_content_type?: string;
    http_referer?: string;
    status?: number;
    protocol?: string;
    length?: number;
  };
  
  /** DNS query data */
  dns?: {
    query?: string;
    query_type_name?: string; // A, AAAA, CNAME, MX, etc.
    rcode_name?: string;
    rrtype?: string;
    rcode?: number;
    type?: number;
  };
  
  /** TLS/SSL connection data */
  tls?: {
    session_resumed?: boolean;
    version?: string;
    subject?: string;
    issuer?: string;
    fingerprint?: string;
    ja3?: string;
    ja3s?: string;
    sni?: string;
    not_before?: string;
    not_after?: string;
  };
  
  /** File extraction data */
  files?: Array<{
    filename?: string;
    name?: string;
    size?: number;
    length?: number;
    md5?: string;
    sha1?: string;
    sha256?: string;
    magic?: string;
    type?: string;
    contenttype?: string;
    encoded?: boolean;
  }>;
  
  /** Raw payload (base64 encoded) */
  payload?: Buffer;
}

// ────────────────────────────────────────────────────────
// RULE TYPES
// ────────────────────────────────────────────────────────

export interface SuricataRule {
  /** Rule ID (SID) */
  sid: number;
  
  /** Full rule text */
  rule: string;
  
  /** Action: alert, pass, drop, reject */
  action: string;
  
  /** Protocol: tcp, udp, icmp, ip, any */
  protocol: string;
  
  /** Source address/match */
  source: string;
  
  /** Source port(s) */
  source_port: string;
  
  /** Direction: ->, <>, <> */
  direction: string;
  
  /** Destination address/match */
  destination: string;
  
  /** Destination port(s) */
  destination_port: string;
  
  /** Rule options/content */
  options: Array<{
    name: string;
    value: string;
  }>;
  
  /** Message/msg field */
  message: string;
  
  /** Classification/category */
  classification?: string;
  
  /** Reference URLs */
  references?: string[];
  
  /** Priority (1-255) */
  priority?: number;
  
  /** Classtype */
  classtype?: string;
  
  /** Whether rule is enabled */
  enabled: boolean;
  
  /** Revision number */
  rev: number;
  
  /** Group/tag */
  group?: string;
  
  /** Last modified timestamp */
  updated_at?: string;
  
  /** Rule metadata */
  metadata?: Record<string, string>;
}

// ────────────────────────────────────────────────────────
// STATISTICS TYPES
// ────────────────────────────────────────────────────────

export interface SuricataStats {
  /** Uptime in seconds */
  uptime: number;
  
  /** Packet capture statistics */
  capture: {
    kernel_packets: number;
    kernel_drops: number;
    bytes: number;
    packets: number;
    avg_bytes_per_packet: number;
    max_bytes_per_packet: number;
  };
  
  /** Detection engine statistics */
  detect: {
    alert_count: number;
    engine_time: {
      max: number;
      avg: number;
    };
  };
  
  /** Application layer stats */
  app_layer: {
    http: { sessions: number; requests: number; responses: number };
    dns: { queries: number; responses: number };
    tls: { sessions: number };
    smtp: { sessions: number };
    ssh: { sessions: number };
  };
  
  /** Decoder statistics */
  decoders: Record<string, any>;
  
  /** Flow statistics */
  flows: {
    total: number;
    tcp: number;
    udp: number;
    icmp: number;
  };
}

// ────────────────────────────────────────────────────────
// DASHBOARD SUMMARY TYPE
// ────────────────────────────────────────────────────────

export interface SuricataDashboardSummary {
  health: {
    healthy: boolean;
    version: string;
    uptime: number;
    running: boolean;
    capture_stats: any;
    error?: string;
  };
  alerts: {
    today: number;
    criticalToday: number;
    thisWeek: number;
    topSignatures: Array<{ signature: string; count: number }>;
    topSrcIPs: Array<{ ip: string; count: number }>;
    topDstIPs: Array<{ ip: string; count: number }>;
    byProtocol: Record<string, number>;
    byAction: Record<string, number>;
  };
  rules: {
    total: number;
    enabled: number;
    disabled: number;
    lastUpdated: string;
  };
}
