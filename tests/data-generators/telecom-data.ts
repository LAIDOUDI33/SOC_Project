/**
 * National SOC Platform - Telecom-Scale Test Data Generator
 * 
 * Generates realistic test data for 20M+ subscriber telecom scenarios:
 * - MSISDN (phone numbers) in international format
 * - IMEI/IMSI device identifiers
 * - SS7/GTP/SIP network protocol data
 * - Incident scenarios with TATC codes
 * - Threat indicators with telecom-specific types
 * 
 * @module tests/data-generators/telecom-data
 * @version 1.0.0
 */

import { randomUUID } from 'crypto';

// ============================================================
// TELECOM IDENTIFIER GENERATORS
// ============================================================

/**
 * Generate a valid-looking MSISDN (international phone number)
 * Format: +[country][network][subscriber]
 */
export function generateMSISDN(country: string = '228'): string {
  // Common mobile prefixes for different countries
  const prefixes: Record<string, string[]> = {
    '228': ['90', '91', '92', '93', '94', '95', '96', '97', '98', '99'], // Togo
    '233': ['20', '24', '26', '27', '50', '53', '54', '55', '57'], // Ghana
    '225': ['01', '05', '07', '08'], // Côte d'Ivoire
    '229': ['41', '43', '44', '45', '46', '47', '48', '49', '50', '51'], // Benin
    '1': ['201', '202', '203', '205', '207', '208', '209', '210', '212'] // US
  };

  const countryPrefixes = prefixes[country] || ['XX'];
  const prefix = countryPrefixes[Math.floor(Math.random() * countryPrefixes.length)];
  
  // Generate remaining digits (total length should be ~10-12 after country code)
  const remainingLength = 8;
  let remaining = '';
  for (let i = 0; i < remainingLength; i++) {
    remaining += Math.floor(Math.random() * 10);
  }

  return `+${country}${prefix}${remaining}`;
}

/**
 * Generate a valid-looking IMEI (15 digits)
 * IMEI format: AA-BBBBBB-CCCCCC-D
 * - AA: Reporting Body Identifier
 * - BBBBBB: Manufacturer code
 * - CCCCCC: Serial number
 * - D: Checksum (Luhn algorithm)
 */
export function generateIMEI(): string {
  // Common TAC (Type Allocation Code) prefixes for major manufacturers
  const tacPrefixes = [
    '35508', // Samsung
    '35821', // Apple iPhone
    '35952', // Apple
    '86744', // Huawei
    '86918', // Xiaomi
    '35676', // Nokia
    '35483', // Sony
  ];

  const tac = tacPrefixes[Math.floor(Math.random() * tacPrefixes.length)];
  
  // Generate serial number (6 digits)
  let serial = '';
  for (let i = 0; i < 6; i++) {
    serial += Math.floor(Math.random() * 10);
  }

  const imeiWithoutCheck = `${tac}${serial}`;
  const checkDigit = calculateLuhnChecksum(imeiWithoutCheck);

  return imeiWithoutCheck + checkDigit;
}

/**
 * Generate a valid-looking IMSI (up to 15 digits)
 * IMSI format: MCC+MINSIN (MCC=3 digits, MNC=2-3 digits, MSIN=remainder)
 */
export function generateIMSI(mcc: string = '614', mnc: string = '01'): string {
  // MCC (Mobile Country Code) examples:
  // 614 - Australia Telstra, 615 - Australia Optus
  // 284 - Bulgaria, 228 - Senegal
  
  // MSIN (Mobile Subscription Identification Number) - typically 10 digits
  let msin = '';
  for (let i = 0; i < 10; i++) {
    msin += Math.floor(Math.random() * 10);
  }

  return `${mcc}${mnc}${msin}`;
}

/**
 * Calculate Luhn checksum digit (for IMEI validation)
 */
function calculateLuhnChecksum(number: string): number {
  let sum = 0;
  let isEven = true;

  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return (10 - (sum % 10)) % 10;
}

// ============================================================
// NETWORK DATA GENERATORS
// ============================================================

export interface SS7MessageData {
  messageType: string;
  opc: string; // Originating Point Code
  dpc: string; // Destination Point Code
  globalTitle: string;
  callingNumber: string;
  calledNumber: string;
  timestamp: Date;
  anomalyScore: number;
  isAnomalous: boolean;
}

/**
 * Generate SS7 message data for testing
 */
export function generateSS7Message(options?: { anomalyRate?: number }): SS7MessageData {
  const anomalyRate = options?.anomalyRate || 0.1;
  const isAnomalous = Math.random() < anomalyRate;

  const messageTypes = [
    'SRI', // Send Routing Info
    'ISM', // Insert Subscriber Data
    'ATI', // Any Time Interrogation
    'MAP_ERROR',
    'USSD_REQUEST'
  ];

  return {
    messageType: messageTypes[Math.floor(Math.random() * messageTypes.length)],
    opc: generatePointCode(),
    dpc: generatePointCode(),
    globalTitle: generateMSISDN(),
    callingNumber: generateMSISDN(),
    calledNumber: generateMSISDN(),
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
    anomalyScore: isAnomalous ? 70 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 30),
    isAnomalous
  };
}

/**
 * Generate GTP session data for testing
 */
export interface GTPSessionData {
  imsi: string;
  msisdn: string;
  ipAddress: string;
  apn: string;
  sessionDuration: number;
  bytesUp: number;
  bytesDown: number;
  anomalyScore: number;
  isActive: boolean;
}

export function generateGTPSession(): GTPSessionData {
  const apns = [
    'internet.operator.com',
    'mms.operator.com',
    'iot.operator.com',
    'corporate.apn.com'
  ];

  return {
    imsi: generateIMSI(),
    msisdn: generateMSISDN(),
    ipAddress: generateIPAddress(),
    apn: apns[Math.floor(Math.random() * apns.length)],
    sessionDuration: Math.floor(Math.random() * 7200), // Up to 2 hours
    bytesUp: Math.floor(Math.random() * 500000000),
    bytesDown: Math.floor(Math.random() * 2000000000),
    anomalyScore: Math.floor(Math.random() * 100),
    isActive: Math.random() > 0.3
  };
}

/**
 * Generate SIP call/session data
 */
export interface SIPSessionData {
  callerAor: string;
  calleeAor: string;
  callerIp: string;
  calleeIp: string;
  duration: number;
  fraudIndicators: string[] | null;
  anomalyScore: number;
}

export function generateSIPSession(): SIPSessionData {
  const fraudPatterns = [
    ['short_duration', 'high_frequency'],
    ['international_premium_rate'],
    null,
    null,
    ['unusual_destination']
  ];

  return {
    callerAor: `sip:${generateMSISDN().replace('+', '')}@operator.com`,
    calleeAor: `sip:${generateMSISDN().replace('+', '')}@operator.com`,
    callerIp: generateIPAddress(),
    calleeIp: generateIPAddress(),
    duration: Math.floor(Math.random() * 3600),
    fraudIndicators: fraudPatterns[Math.floor(Math.random() * fraudPatterns.length)],
    anomalyScore: Math.floor(Math.random() * 100)
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generatePointCode(): string {
  // ITU-T Q.704 point code format (varies by network)
  return String(Math.floor(Math.random() * 16383)).padStart(5, '0');
}

function generateIPAddress(): string {
  // Generate IPv4 address
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// ============================================================
// INCIDENT TEST DATA GENERATORS
// ============================================================

export interface TestIncident {
  tatcCode?: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  category: string;
  subscribersAffected: number;
  sourceIp?: string;
  destIp?: string;
  msisdn?: string;
  imei?: string;
  mitreTechniques?: string[];
}

const INCIDENT_TEMPLATES = [
  {
    titlePattern: 'DDoS Attack Detected from {count} Sources',
    categories: ['NETWORK_ATTACK', 'DDOS', 'VOLUMETRIC'],
    severities: ['CRITICAL', 'HIGH']
  },
  {
    titlePattern: 'SIM Swap Fraud Attempt on MSISDN {msisdn}',
    categories: ['FRAUD', 'SUBSCRIBER_COMPROMISE', 'SIM_SWAP'],
    severities: ['CRITICAL', 'HIGH']
  },
  {
    titlePattern: 'SS7 Signaling Anomaly - {messageType} Flood',
    categories: ['PROTOCOL_ABUSE', 'SS7_ATTACK', 'SIGNALING_FRAUD'],
    severities: ['HIGH', 'CRITICAL']
  },
  {
    titlePattern: 'GTP Tunnel Misconfiguration Detected',
    categories: ['MISCONFIGURATION', 'GTP_LEAK', 'DATA_EXFILTRATION'],
    severities: ['MEDIUM', 'HIGH']
  },
  {
    titlePattern: 'Wangiri Fraud Campaign Detected',
    categories: ['FRAUD', 'TELECOM_FRAUD', 'WANGIRI'],
    severities: ['MEDIUM', 'HIGH']
  },
  {
    titlePattern: 'Premium Rate Service Abuse Pattern',
    categories: ['FRAUD', 'PRS_ABUSE', 'BILLING_FRAUD'],
    severities: ['MEDIUM', 'LOW']
  },
  {
    titlePattern: 'Location Tracking via SS7 Vulnerability',
    categories: ['PRIVACY_VIOLATION', 'SS7_EXPLOIT', 'SURVEILLANCE'],
    severities: ['CRITICAL', 'HIGH']
  },
  {
    titlePattern: 'IoT Device Botnet Activity from {count} Devices',
    categories: ['BOTNET', 'IOT_COMPROMISE', 'NETWORK_ATTACK'],
    severities: ['HIGH', 'CRITICAL']
  }
];

const TATC_CODES = [
  'TATC-2024-001', 'TATC-2024-002', 'TATC-2024-003',
  'TATC-2024-004', 'TATC-2024-005', 'TATC-2024-006',
  'TATC-2024-007', 'TATC-2024-008', 'TATC-2024-009',
  'TATC-2024-010'
];

/**
 * Generate a realistic incident for testing
 */
export function generateTestIncident(options?: { severity?: string; forceAnomaly?: boolean }): TestIncident {
  const template = INCIDENT_TEMPLATES[Math.floor(Math.random() * INCIDENT_TEMPLATES.length)];
  const severity = options?.severity || template.severities[Math.floor(Math.random() * template.severities.length)] as any;

  let title = template.titlePattern
    .replace('{count}', String(Math.floor(Math.random() * 1000) + 10))
    .replace('{msisdn}', generateMSISDN())
    .replace('{messageType}', ['SRI', 'ISM', 'ATI'][Math.floor(Math.random() * 3)]);

  // Determine subscribers affected based on severity
  let subscribersAffected: number;
  switch (severity) {
    case 'CRITICAL':
      subscribersAffected = Math.floor(Math.random() * 500000) + 100000; // 100K-600K
      break;
    case 'HIGH':
      subscribersAffected = Math.floor(Math.random() * 50000) + 10000; // 10K-60K
      break;
    case 'MEDIUM':
      subscribersAffected = Math.floor(Math.random() * 5000) + 1000; // 1K-6K
      break;
    default:
      subscribersAffected = Math.floor(Math.random() * 500) + 10; // 10-510
  }

  const hasSubscriberData = Math.random() > 0.3;

  return {
    tatcCode: TATC_CODES[Math.floor(Math.random() * TATC_CODES.length)],
    title,
    description: `Automated test incident: ${title}. This is generated test data for integration testing of the SOC platform at telecom scale.`,
    severity,
    status: ['NEW', 'IN_PROGRESS', 'ESCALATED'][Math.floor(Math.random() * 3)],
    category: template.categories[Math.floor(Math.random() * template.categories.length)],
    subscribersAffected,
    sourceIp: hasSubscriberData ? generateIPAddress() : undefined,
    destIp: hasSubscriberData ? generateIPAddress() : undefined,
    msisdn: hasSubscriberData ? generateMSISDN() : undefined,
    imei: hasSubscriberData && Math.random() > 0.5 ? generateIMEI() : undefined,
    mitreTechniques: getRandomMITRETechniques()
  };
}

function getRandomMITRETechniques(): string[] {
  const techniques = [
    ['T1048', 'Exfiltration Over Alternative Protocol'],
    ['T1078', 'Valid Accounts'],
    ['T1119', 'Automated Collection'],
    ['T1486', 'Data Encrypted for Impact'],
    ['T1498', 'Network Denial of Service'],
    ['T1499', 'Endpoint Denial of Service'],
    ['T1557', 'Man-in-the-Middle'],
    []
  ];
  return techniques[Math.floor(Math.random() * techniques.length)];
}

// ============================================================
// THREAT/IOC TEST DATA GENERATORS
// ============================================================

export interface TestThreatIndicator {
  type: string;
  value: string;
  threatLevel: string;
  source: string;
  confidence: number;
  tlpLevel: string;
  description: string;
  campaignId?: string;
}

const IOC_TYPES = [
  'ipv4', 'ipv6', 'domain', 'url', 'hash_sha256',
  'msisdn', 'imei', 'imsi', 'ss7_gt', 'ip_range'
];

const THREAT_SOURCES = [
  'INTERNAL_HUNT',
  'FEED_AUTOMATED',
  'COMMUNITY',
  'GOVERNMENT',
  'VENDOR',
  'HONEYNET',
  'DARKWEB_MONITORING'
];

/**
 * Generate a threat indicator/IOC for testing
 */
export function generateTestIOC(type?: string): TestThreatIndicator {
  const iocType = type || IOC_TYPES[Math.floor(Math.random() * IOC_TYPES.length)];
  
  let value: string;
  switch (iocType) {
    case 'ipv4':
      value = generateIPAddress();
      break;
    case 'ipv6':
      value = `2001:0db8:${Math.floor(Math.random() * 0xffff).toString(16)}:${Math.floor(Math.random() * 0xffff).toString(16)}::1`;
      break;
    case 'domain':
      value = `malicious-${randomUUID().substring(0, 8)}.evil.com`;
      break;
    case 'url':
      value = `http://phishing-${randomUUID().substring(0, 8)}.com/login`;
      break;
    case 'hash_sha256':
      value = Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      break;
    case 'msisdn':
      value = generateMSISDN();
      break;
    case 'imei':
      value = generateIMEI();
      break;
    case 'imsi':
      value = generateIMSI();
      break;
    case 'ss7_gt':
      value = generateMSISDN();
      break;
    case 'ip_range':
      value = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0/24`;
      break;
    default:
      value = generateIPAddress();
  }

  const threatLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const tlpLevels = ['RED', 'AMBER', 'GREEN', 'WHITE'];

  return {
    type: iocType,
    value,
    threatLevel: threatLevels[Math.floor(Math.random() * threatLevels.length)],
    source: THREAT_SOURCES[Math.floor(Math.random() * THREAT_SOURCES.length)],
    confidence: Math.floor(Math.random() * 40) + 60, // 60-100 range
    tlpLevel: tlpLevels[Math.floor(Math.random() * tlpLevels.length)],
    description: `Test IOC (${iocType}): ${value} - Auto-generated for testing`
  };
}

// ============================================================
// BULK DATA GENERATION
// ============================================================

/**
 * Generate bulk test incidents
 */
export function generateBulkIncidents(count: number): TestIncident[] {
  return Array.from({ length: count }, () => generateTestIncident());
}

/**
 * Generate bulk test IOCs
 */
export function generateBulkIOCs(count: number): TestThreatIndicator[] {
  return Array.from({ length: count }, () => generateTestIOC());
}

/**
 * Generate complete test dataset for telecom-scale testing
 */
export function generateTelecomTestDataset(options?: {
  incidentsCount?: number;
  iocsCount?: number;
  ss7MessagesCount?: number;
  gtpSessionsCount?: number;
  sipSessionsCount?: number;
}) {
  const defaults = {
    incidentsCount: 100,
    iocsCount: 500,
    ss7MessagesCount: 1000,
    gtpSessionsCount: 500,
    sipSessionsCount: 300
  };

  const config = { ...defaults, ...options };

  console.log(`[TEST-DATA] Generating telecom-scale test dataset:`);
  console.log(`  - Incidents: ${config.incidentsCount}`);
  console.log(`  - IOCs: ${config.iocsCount}`);
  console.log(`  - SS7 Messages: ${config.ss7MessagesCount}`);
  console.log(`  - GTP Sessions: ${config.gtpSessionsCount}`);
  console.log(`  - SIP Sessions: ${config.sipSessionsCount}`);

  return {
    incidents: generateBulkIncidents(config.incidentsCount),
    iocs: generateBulkIOCs(config.iocsCount),
    ss7Messages: Array.from({ length: config.ss7MessagesCount }, () => generateSS7Message()),
    gtpSessions: Array.from({ length: config.gtpSessionsCount }, () => generateGTPSession()),
    sipSessions: Array.from({ length: config.sipSessionsCount }, () => generateSIPSession()),
    generatedAt: new Date(),
    totalRecords: config.incidentsCount + config.iocsCount + config.ss7MessagesCount + config.gtpSessionsCount + config.sipSessionsCount
  };
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  generateMSISDN,
  generateIMEI,
  generateIMSI,
  generateSS7Message,
  generateGTPSession,
  generateSIPSession,
  generateTestIncident,
  generateTestIOC,
  generateBulkIncidents,
  generateBulkIOCs,
  generateTelecomTestDataset
};
