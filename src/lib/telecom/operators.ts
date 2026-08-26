/**
 * National SOC Platform - Telecom Operator Integration Module
 * Algeria 2026-2030 | Mobile Operator Configuration
 * 
 * Comprehensive telecom operator support:
 * - Mobilis (Algeria Telecom Mobile)
 * - Djezzy (Vodafone Partner)
 * - Ooredoo Algeria
 * 
 * Features:
 * - Operator-specific configurations
 * - Network element mapping
 * - Protocol parsing (GTP, SS7, Diameter)
 * - ARPT regulatory compliance
 * - Subscriber privacy protection
 */

// ============= OPERATOR DEFINITIONS =============

export interface TelecomOperator {
  id: string
  name: string
  displayName: string
  country: string
  mcc: string // Mobile Country Code
  mnc: string // Mobile Network Code
  networkType: '2G' | '3G' | '4G' | '5G' | 'All'
  
  // Network Infrastructure
  coreNetwork: {
    hlr?: { host: string; port: number; protocol: string }
    msc?: { host: string; port: number; protocol: string }
    sgsn?: { host: string; port: number; protocol: string }
    ggsn?: { host: string; port: number; protocol: string }
    pgw?: { host: string; port: number; protocol: string }
    hss?: { host: string; port: number; protocol: string }
    pcrf?: { host: string; port: number; protocol: string }
  }
  
  // Radio Access Network
  ran: {
    bscCount?: number
    rncCount?: number
    enodebCount?: int
    gnodebCount?: int
  }
  
  // Security Monitoring Endpoints
  monitoring: {
    siemEndpoint: string
    idsEndpoint: string
    logAggregator: string
    flowCollector: string
  }
  
  // Compliance Settings
  compliance: {
    arptReportingRequired: boolean
    dataRetentionDays: number
    subscriberPrivacyLevel: 'standard' | 'enhanced' | 'maximum'
    encryptionRequired: boolean
    auditLogRetentionDays: number
  }
  
  // Alert Thresholds
  thresholds: {
    maxFailedAuthPerMinute: number
    maxRoamingAttemptsPerHour: number
    suspiciousLocationChange: number // km
    maxSmsBurst: number // per minute
    maxDataSessionDuration: number // hours
    signalingStormThreshold: number // messages/second
  }
  
  // Contact Information
  contacts: {
    nocEmail: string
    nocPhone: string
    securityTeam: string
    arptLiaison: string
  }
}

// ============= ALGERIAN OPERATOR CONFIGURATIONS =============

export const ALGERIAN_OPERATORS: Record<string, TelecomOperator> = {
  mobilis: {
    id: 'mobilis',
    name: 'Mobilis',
    displayName: 'Mobilis (Algérie Télécom Mobile)',
    country: 'DZ',
    mcc: '603',
    mnc: '01',
    networkType: 'All',
    
    coreNetwork: {
      hlr: { host: 'hlr.mobilis.dz', port: 3747, protocol: 'MAP' },
      msc: { host: 'msc.mobilis.dz', port: 2940, protocol: 'SS7/MAP' },
      sgsn: { host: 'sgsn.mobilis.dz', port: 3386, protocol: 'GTPv1' },
      ggsn: { host: 'ggsn.mobilis.dz', port: 2123, protocol: 'GTPv1' },
      pgw: { host: 'pgw.mobilis.dz', port: 2123, protocol: 'GTPv2' },
      hss: { host: 'hss.mobilis.dz', port: 3868, protocol: 'Diameter' },
      pcrf: { host: 'pcrf.mobilis.dz', port: 3868, protocol: 'Diameter' }
    },
    
    ran: {
      bscCount: 48,
      rncCount: 12,
      enodebCount: 3500,
      gnodebCount: 850
    },
    
    monitoring: {
      siemEndpoint: 'https://soc.mobilis.dz/api/wazuh',
      idsEndpoint: 'https://soc.mobilis.dz/api/suricata',
      logAggregator: 'https://log.mobilis.dz:9200',
      flowCollector: 'flow.mobilis.dz:2055'
    },
    
    compliance: {
      arptReportingRequired: true,
      dataRetentionDays: 2555, // 7 years per Algerian law
      subscriberPrivacyLevel: 'maximum',
      encryptionRequired: true,
      auditLogRetentionDays: 2555
    },
    
    thresholds: {
      maxFailedAuthPerMinute: 10,
      maxRoamingAttemptsPerHour: 50,
      suspiciousLocationChange: 500, // km
      maxSmsBurst: 30,
      maxDataSessionDuration: 24,
      signalingStormThreshold: 10000
    },
    
    contacts: {
      nocEmail: 'noc@mobilis.dz',
      nocPhone: '+213 555 0101',
      securityTeam: 'security@mobilis.dz',
      arptLiaison: 'arpt@mobilis.dz'
    }
  },

  djezzy: {
    id: 'djezzy',
    name: 'Djezzy',
    displayName: 'Djezzy (Vodafone Algeria)',
    country: 'DZ',
    mcc: '603',
    mnc: '02',
    networkType: 'All',
    
    coreNetwork: {
      hlr: { host: 'hlr.djezzy.dz', port: 3747, protocol: 'MAP' },
      msc: { host: 'msc.djezzy.dz', port: 2940, protocol: 'SS7/MAP' },
      sgsn: { host: 'sgsn.djezzy.dz', port: 3386, protocol: 'GTPv1' },
      ggsn: { host: 'ggsn.djezzy.dz', port: 2123, protocol: 'GTPv1' },
      pgw: { host: 'pgw.djezzy.dz', port: 2123, protocol: 'GTPv2' },
      hss: { host: 'hss.djezzy.dz', port: 3868, protocol: 'Diameter' },
      pcrf: { host: 'pcrf.djezzy.dz', port: 3868, protocol: 'Diameter' }
    },
    
    ran: {
      bscCount: 42,
      rncCount: 10,
      enodebCount: 2800,
      gnodebCount: 620
    },
    
    monitoring: {
      siemEndpoint: 'https://soc.djezzy.dz/api/wazuh',
      idsEndpoint: 'https://soc.djezzy.dz/api/suricata',
      logAggregator: 'https://log.djezzy.dz:9200',
      flowCollector: 'flow.djezzy.dz:2055'
    },
    
    compliance: {
      arptReportingRequired: true,
      dataRetentionDays: 2555,
      subscriberPrivacyLevel: 'enhanced',
      encryptionRequired: true,
      auditLogRetentionDays: 2555
    },
    
    thresholds: {
      maxFailedAuthPerMinute: 15,
      maxRoamingAttemptsPerHour: 60,
      suspiciousLocationChange: 400,
      maxSmsBurst: 40,
      maxDataSessionDuration: 24,
      signalingStormThreshold: 12000
    },
    
    contacts: {
      nocEmail: 'noc@djezzy.dz',
      nocPhone: '+213 555 0202',
      securityTeam: 'security@djezzy.dz',
      arptLiaison: 'arpt@djezzy.dz'
    }
  },

  ooredoo: {
    id: 'ooredoo',
    name: 'Ooredoo',
    displayName: 'Ooredoo Algeria',
    country: 'DZ',
    mcc: '603',
    mnc: '03',
    networkType: 'All',
    
    coreNetwork: {
      hlr: { host: 'hlr.ooredoo.dz', port: 3747, protocol: 'MAP' },
      msc: { host: 'msc.ooredoo.dz', port: 2940, protocol: 'SS7/MAP' },
      sgsn: { host: 'sgsn.ooredoo.dz', port: 3386, protocol: 'GTPv1' },
      ggsn: { host: 'ggsn.ooredoo.dz', port: 2123, protocol: 'GTPv1' },
      pgw: { host: 'pgw.ooredoo.dz', port: 2123, protocol: 'GTPv2' },
      hss: { host: 'hss.ooredoo.dz', port: 3868, protocol: 'Diameter' },
      pcrf: { host: 'pcrf.ooredoo.dz', port: 3868, protocol: 'Diameter' }
    },
    
    ran: {
      bscCount: 35,
      rncCount: 8,
      enodebCount: 2200,
      gnodebCount: 480
    },
    
    monitoring: {
      siemEndpoint: 'https://soc.ooredoo.dz/api/wazuh',
      idsEndpoint: 'https://soc.ooredoo.dz/api/suricata',
      logAggregator: 'https://log.ooredoo.dz:9200',
      flowCollector: 'flow.ooredoo.dz:2055'
    },
    
    compliance: {
      arptReportingRequired: true,
      dataRetentionDays: 2555,
      subscriberPrivacyLevel: 'enhanced',
      encryptionRequired: true,
      auditLogRetentionDays: 2555
    },
    
    thresholds: {
      maxFailedAuthPerMinute: 12,
      maxRoamingAttemptsPerHour: 45,
      suspiciousLocationChange: 450,
      maxSmsBurst: 35,
      maxDataSessionDuration: 24,
      signalingStormThreshold: 11000
    },
    
    contacts: {
      nocEmail: 'noc@ooredoo.dz',
      nocPhone: '+213 555 0303',
      securityTeam: 'security@ooredoo.dz',
      arptLiaison: 'arpt@ooredoo.dz'
    }
  }
}

// ============= PROTOCOL CONFIGURATIONS =============

export interface ProtocolConfig {
  name: string
  port: number
  description: string
  securityRisks: string[]
  monitoringPriority: 'critical' | 'high' | 'medium'
  parserModule: string
}

export const TELECOM_PROTOCOLS: Record<string, ProtocolConfig> = {
  gtp_v1: {
    name: 'GTPv1 (GPRS Tunneling Protocol v1)',
    port: 2123,
    description: 'Used for GPRS/3G data tunneling between SGSN and GGSN',
    securityRisks: ['Tunnel hijacking', 'DoS via malformed packets', 'Data exfiltration'],
    monitoringPriority: 'critical',
    parserModule: 'gtp-v1-parser'
  },
  gtp_v2: {
    name: 'GTPv2 (GPRS Tunneling Protocol v2)',
    port: 2123,
    description: 'Used for LTE/4G data tunneling between SGW and PGW',
    securityRisks: ['Tunnel hijacking', 'Bearer theft', 'Location tracking'],
    monitoringPriority: 'critical',
    parserModule: 'gtp-v2-parser'
  },
  ss7_map: {
    name: 'SS7/MAP (Mobile Application Part)',
    port: 2940,
    description: 'Core network signaling for mobility management',
    securityRisks: ['Subscriber tracking', 'SMS interception', 'Call redirection', 'SS7 attacks'],
    monitoringPriority: 'critical',
    parserModule: 'ss7-map-parser'
  },
  diameter: {
    name: 'Diameter (AAA Protocol)',
    port: 3868,
    description: 'Authentication, Authorization, Accounting for LTE/5G',
    securityRisks: ['Credential theft', 'Roaming fraud', 'Service bypass'],
    monitoringPriority: 'high',
    parserModule: 'diameter-parser'
  },
  radius: {
    name: 'RADIUS (Remote Auth Dial-In User Service)',
    port: 1812,
    description: 'Legacy AAA protocol for 2G/3G authentication',
    securityRisks: ['Credential replay', 'Shared secret compromise'],
    monitoringPriority: 'high',
    parserModule: 'radius-parser'
  },
  sip: {
    name: 'SIP (Session Initiation Protocol)',
    port: 5060,
    description: 'VoLTE/VoWiFi call signaling',
    securityRisks: ['Call interception', 'Registration hijacking', 'Toll fraud'],
    monitoringPriority: 'high',
    parserModule: 'sip-parser'
  }
}

// ============= THREAT SPECIFIC TO TELECOM =============

export interface TelecomThreat {
  id: string
  category: string
  name: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  protocols: string[]
  indicators: string[]
  mitreTechnique: string
  arptReportable: boolean
  responsePlaybook: string
}

export const TELECOM_THREATS: TelecomThreat[] = [
  {
    id: 'TEL-001',
    category: 'SS7_ATTACK',
    name: 'SS7 Location Tracking',
    description: 'Attacker exploits SS7 vulnerabilities to track subscriber location',
    severity: 'critical',
    protocols: ['ss7_map'],
    indicators: ['sendRoutingInfoForSM', 'provideSubscriberInfo'],
    mitreTechnique: 'T1419',
    arptReportable: true,
    responsePlaybook: 'ss7-location-tracking'
  },
  {
    id: 'TEL-002',
    category: 'SS7_ATTACK',
    name: 'SMS Interception',
    description: 'Interception of SMS messages via SS7 signaling vulnerabilities',
    severity: 'critical',
    protocols: ['ss7_map'],
    indicators: ['forwardShortMessage', 'mt-forwardShortMessage'],
    mitreTechnique: 'T1420',
    arptReportable: true,
    responsePlaybook: 'sms-interception'
  },
  {
    id: 'TEL-003',
    category: 'GTP_ATTACK',
    name: 'GTP Tunnel Hijacking',
    description: 'Hijacking of GTP tunnels to intercept or manipulate user data traffic',
    severity: 'critical',
    protocols: ['gtp_v1', 'gtp_v2'],
    indicators: ['createPDPContext', 'createSessionRequest', 'abnormal TEID patterns'],
    mitreTechnique: 'T1573',
    arptReportable: true,
    responsePlaybook: 'gtp-hijack'
  },
  {
    id: 'TEL-004',
    category: 'FRAUD',
    name: 'SIM Swapping Fraud',
    description: 'Unauthorized SIM swap to gain access to victim\'s phone number',
    severity: 'high',
    protocols: ['ss7_map', 'diameter'],
    indicators: ['multiple authentication failures', 'SIM change requests from unusual locations'],
    mitreTechnique: 'T1539',
    arptReportable: true,
    responsePlaybook: 'sim-swap-fraud'
  },
  {
    id: 'TEL-005',
    category: 'ROAMING_FRAUD',
    name: 'IRSF (International Revenue Share Fraud)',
    description: 'Fraudulent calls to premium rate numbers to generate revenue share',
    severity: 'high',
    protocols: ['ss7_map', 'sip'],
    indicators: ['high volume international calls', 'premium number destinations', 'unusual roaming patterns'],
    mitreTechnique: 'T1589',
    arptReportable: true,
    responsePlaybook: 'irsf-fraud'
  },
  {
    id: 'TEL-006',
    category: 'DOS',
    name: 'Signaling Storm Attack',
    description: 'Overwhelming network elements with excessive signaling messages',
    severity: 'critical',
    protocols: ['gtp_v1', 'gtp_v2', 'ss7_map', 'diameter'],
    indicators: ['signaling message rate > threshold', 'CPU/memory exhaustion on network elements'],
    mitreTechnique: 'T1498',
    arptReportable: true,
    responsePlaybook: 'signaling-storm'
  },
  {
    id: 'TEL-007',
    category: 'SUBSCRIBER_PRIVACY',
    name: 'Unauthorized Data Access',
    description: 'Access to subscriber data without proper authorization',
    severity: 'high',
    protocols: ['diameter', 'ss7_map'],
    indicators: ['unusual HLR/HSS queries', 'bulk subscriber data requests'],
    mitreTechnique: 'T1119',
    arptReportable: true,
    responsePlaybook: 'data-access-violation'
  },
  {
    id: 'TEL-008',
    category: 'BYPASS',
    name: 'Service Bypass / Free Data',
    description: 'Exploiting GTP/Diameter to obtain free data services',
    severity: 'medium',
    protocols: ['gtp_v1', 'gtp_v2', 'diameter'],
    indicators: ['zero-rating rule bypass', 'APN manipulation', 'QoS class exploitation'],
    mitreTechnique: 'T1499',
    arptReportable: false,
    responsePlaybook: 'service-bypass'
  }
]

// ============= NETWORK ELEMENT TYPES =============

export interface NetworkElementType {
  id: string
  name: string
  category: 'core' | 'access' | 'transmission' | 'service'
  protocols: string[]
  criticality: 'critical' | 'high' | 'medium'
  typicalAlerts: string[]
}

export const NETWORK_ELEMENT_TYPES: NetworkElementType[] = [
  {
    id: 'HLR',
    name: 'Home Location Register',
    category: 'core',
    protocols: ['ss7_map'],
    criticality: 'critical',
    typicalAlerts: ['authentication_failure', 'subscriber_query_anomaly', 'unauthorized_access']
  },
  {
    id: 'MSC',
    name: 'Mobile Switching Center',
    category: 'core',
    protocols: ['ss7_map', 'sip'],
    criticality: 'critical',
    typicalAlerts: ['call_setup_failure', 'handover_failure', 'signaling_congestion']
  },
  {
    id: 'SGSN',
    name: 'Serving GPRS Support Node',
    category: 'core',
    protocols: ['gtp_v1', 'ss7_map'],
    criticality: 'high',
    typicalAlerts: ['pdp_context_error', 'gtp_tunnel_attack', 'roaming_anomaly']
  },
  {
    id: 'GGSN',
    name: 'Gateway GPRS Support Node',
    category: 'core',
    protocols: ['gtp_v1'],
    criticality: 'high',
    typicalAlerts: ['apn_misuse', 'data_exfiltration', 'tunnel_hijack']
  },
  {
    id: 'PGW',
    name: 'Packet Gateway (LTE)',
    category: 'core',
    protocols: ['gtp_v2', 'diameter'],
    criticality: 'critical',
    typicalAlerts: ['bearer_theft', 'qos_violation', 'apn_abuse']
  },
  {
    id: 'HSS',
    name: 'Home Subscriber Server',
    category: 'core',
    protocols: ['diameter'],
    criticality: 'critical',
    typicalAlerts: ['auth_data_breach', 'subscriber_profiling', 'location_tracking']
  },
  {
    id: 'eNodeB',
    name: 'Evolved Node B (4G BTS)',
    category: 'access',
    protocols: ['s1ap'],
    criticality: 'medium',
    typicalAlerts: ['cell_outage', 'interference_detection', 'unauthorized_device']
  },
  {
    id: 'gNodeB',
    name: 'Next Generation NodeB (5G BTS)',
    category: 'access',
    protocols: ['ngap'],
    criticality: 'medium',
    typicalAlerts: ['cell_outage', 'slicing_conflict', 'mass_registration']
  }
]

// ============= EXPORTS =============

export default ALGERIAN_OPERATORS
