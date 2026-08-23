/**
 * National SOC Platform - Comprehensive Demo Seed Data
 * 
 * Generates realistic demo data for presentations and testing.
 * Context: Djezzy Algeria (+213) - National SOC Platform
 * 
 * Includes:
 * - 12 Users (Algerian names, various roles)
 * - 55+ Security Alerts (telecom attack scenarios)
 * - 18 Incidents (with status progression)
 * - 25 Threat Indicators (IPs, domains, hashes, IMSIs)
 * - SS7/Fraud Detection Events
 * - ARTP/ANSSI Compliance Data
 * - System Health Metrics
 * 
 * @version 2.0.0
 * @compliance ANRT-SEC-007, ISO 27001 aligned
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// ALGERIAN NAMES AND DATA GENERATORS
// ============================================================

// Common Algerian first names (Arabic and Berber origin)
const algerianFirstNames = [
  'Mohammed', 'Ahmed', 'Karim', 'Youssef', 'Amine', 'Rachid', 'Omar', 'Said',
  'Fatima', 'Amina', 'Khadija', 'Nadia', 'Samira', 'Leila', 'Nora', 'Salma',
  'Brahim', 'Mehdi', 'Hassan', 'Ali', 'Khalid', 'Tarek', 'Nabil', 'Walid',
  'Mounia', 'Dalia', 'Ines', 'Sarah', 'Amira', 'Zineb'
];

// Common Algerian family names
const algerianLastNames = [
  'Benali', 'Bouazza', 'Cherif', 'Haddad', 'Kaci', 'Larbi', 'Mansouri',
  'Nacer', 'Ouahab', 'Rahal', 'Slimani', 'Taleb', 'Zerhouni', 'Amrani',
  'Belkacem', 'Djelloul', 'Fettouhi', 'Gacemi', 'Hamadi', 'Idrissi',
  'Jebbar', 'Kerdjouar', 'Lamari', 'Mokhtari', 'Nait Said'
];

// Djezzy departments
const departments = ['SOC Operations', 'Threat Intelligence', 'Incident Response', 'Compliance', 'Telecom Security', 'Management'];

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateAlgerianName(): { firstName: string; lastName: string; fullName: string } {
  const firstName = randomItem(algerianFirstNames);
  const lastName = randomItem(algerianLastNames);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function generateAlgerianMSISDN(): string {
  // +213 is Algeria country code, Djezzy uses 5,6,7 prefixes for mobile
  const prefix = randomItem(['5', '6', '7']);
  const rest = String(randomInt(10000000, 99999999));
  return `+213${prefix}${rest}`;
}

function generateIMSI(): string {
  // Djezzy MCC-MNC: 603-02 (Algeria-Djezzy)
  return `60302${String(randomInt(1000000000000000, 9999999999999999)).slice(0, 15)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// SEED DATA DEFINITIONS
// ============================================================

// Alert scenarios specific to Algerian telecom context
const alertScenarios = [
  // SS7 Attack Scenarios
  {
    title: 'SS7 Location Tracking Attempt via SRI Request',
    severity: 'CRITICAL' as const,
    status: 'ESCALATED' as const,
    alertType: 'DETECTION' as const,
    source: 'SS7_Monitor',
    description: 'Unauthorized SendRoutingInfoForSM request detected from unknown GT 892108500001. Targeting high-value subscriber IMSI 6020212345678901234. This indicates potential location tracking attack.',
    sourceIp: '41.105.24.15',
    destIp: '10.10.1.20',
    protocol: 'SS7/MAP',
    mitreTechniqueId: 'T1537',
    mitreTactic: 'Collection',
  },
  {
    title: 'SS7 Interception Attempt - Forward Connection',
    severity: 'CRITICAL' as const,
    status: 'IN_PROGRESS' as const,
    alertType: 'DETECTION' as const,
    source: 'SS7_Firewall',
    description: 'Malicious IwMSG (Intercept) request detected from GT belonging to unauthorized roaming partner. Potential lawful interception bypass attempt targeting VIP subscriber.',
    sourceIp: '197.207.140.50',
    destIp: '10.10.1.25',
    protocol: 'SS7/CAP',
    mitreTechniqueId: 'T1039',
    mitreTactic: 'Collection',
  },
  {
    title: 'SS7 USSD Fraud - Premium Rate Service',
    severity: 'HIGH' as const,
    status: 'ACKNOWLEDGED' as const,
    alertType: 'CORRELATION' as const,
    source: 'FraudEngine',
    description: 'Pattern of abnormal USSD requests to premium rate service numbers detected from 150+ subscribers within 1 hour. Total estimated loss: 2,450,000 DZD. Possible SIM malware or USSD gateway compromise.',
    sourceIp: '192.168.100.45',
    protocol: 'USSD',
    mitreTechniqueId: 'T1653',
    mitreTactic: 'Impact',
  },
  {
    title: 'SIM Swap Attack Wave Detected',
    severity: 'CRITICAL' as const,
    status: 'NEW' as const,
    alertType: 'THREAT_INTEL' as const,
    source: 'FraudEngine',
    description: 'Coordinated SIM swap attempts detected across 12 retail locations in Algiers, Oran, and Constantine. Using stolen ID documents. 8 successful swaps identified affecting banking customers.',
    sourceIp: '41.111.98.200',
    protocol: 'HLR',
    mitreTechniqueId: 'T1566',
    mitreTactic: 'Initial Access',
  },
  
  // Network Intrusion Scenarios
  {
    title: 'APT Group Reconnaissance on Core Network',
    severity: 'HIGH' as const,
    status: 'INVESTIGATING' as const,
    alertType: 'DETECTION' as const,
    source: 'IDS_Suricata',
    description: 'Reconnaissance scanning activity detected from IP range 185.220.101.{1-50} targeting HLR/HSS management interfaces. Patterns match APT-GhostShell TTPs observed in regional telco attacks.',
    sourceIp: '185.220.101.37',
    destIp: '10.0.1.10',
    protocol: 'TCP',
    mitreTechniqueId: 'T1046',
    mitreTactic: 'Discovery',
  },
  {
    title: 'DNS Tunneling Activity Detected',
    severity: 'MEDIUM' as const,
    status: 'NEW' as const,
    alertType: 'ANOMALY' as const,
    source: 'DNS_Monitor',
    description: 'Unusual DNS query patterns indicating potential data exfiltration via DNS tunneling. High volume TXT record queries to suspicious domain. Source: IT workstation in Algiers DC.',
    sourceIp: '10.100.50.22',
    destIp: '10.0.2.100',
    protocol: 'DNS',
    mitreTechniqueId: 'T1048',
    mitreTactic: 'Exfiltration',
  },
  {
    title: 'Unauthorized API Access to Subscriber Database',
    severity: 'CRITICAL' as const,
    status: 'ESCALATED' as const,
    alertType: 'DETECTION' as const,
    source: 'SIEM_Wazuh',
    description: 'Authentication bypass attempt detected on CRM API endpoint. Multiple failed logins followed by successful access using leaked credentials. Data queried: 45000+ subscriber records including MSISDNs and IMEIs.',
    sourceIp: '196.203.112.88',
    destIp: '172.16.0.50',
    protocol: 'HTTPS',
    mitreTechniqueId: 'T1078',
    mitreTactic: 'Defense Evasion',
  },

  // Malware/Ransomware Scenarios
  {
    title: 'TrickBot Variant Detected in Finance Department',
    severity: 'HIGH' as const,
    status: 'IN_PROGRESS' as const,
    alertType: 'DETECTION' as const,
    source: 'EDR_CrowdStrike',
    description: 'TrickBot banking trojan variant detected on workstation FIN-ALG-042. C2 communication to known infrastructure. Potential lateral movement to billing systems. Isolating affected host.',
    sourceIp: '10.50.20.42',
    destIp: '94.102.51.12',
    protocol: 'HTTPS',
    mitreTechniqueId: 'T1566',
    mitreTactic: 'Initial Access',
  },
  {
    title: 'LockBit Ransomware Execution Prevented',
    severity: 'CRITICAL' as const,
    status: 'RESOLVED' as const,
    alertType: 'DETECTION' as const,
    source: 'EDR_SentinelOne',
    description: 'LockBit 3.0 ransomware execution attempt blocked on file server FS-CORP-01. Initial access via phishing email with macro-enabled Excel attachment. No encryption occurred. User security awareness training scheduled.',
    sourceIp: '10.50.30.15',
    protocol: 'LOCAL',
    mitreTechniqueId: 'T1486',
    mitreTactic: 'Impact',
  },

  // Insider Threat / Policy Violations
  {
    title: 'Bulk Subscriber Data Export Anomaly',
    severity: 'HIGH' as const,
    status: 'ACKNOWLEDGED' as const,
    alertType: 'ANOMALY' as const,
    source: 'DLP_Symantec',
    description: 'Unusual bulk export of 125,000 subscriber records from CRM system outside normal business hours (03:42 AM). Export performed by user account with legitimate access. Investigating potential data theft.',
    sourceIp: '10.50.10.85',
    protocol: 'INTERNAL',
    mitreTechniqueId: 'T1213',
    mitreTactic: 'Collection',
  },
  {
    title: 'Privileged Access Outside Business Hours',
    severity: 'MEDIUM' as const,
    status: 'NEW' as const,
    alertType: 'ANOMALY' as const,
    source: 'PAM_CyberArk',
    description: 'SSH access to production HLR server from VPN connection at 11:47 PM on weekend. Account: netadmin_ahmed. Session duration: 4 hours 23 minutes. Review required per policy.',
    sourceIp: '196.202.45.78',
    destIp: '10.0.1.5',
    protocol: 'SSH',
    mitreTechniqueId: 'T1078',
    mitreTactic: 'Defense Evasion',
  },

  // Telecom-Specific Attacks
  {
    title: 'International Revenue Share Fraud (IRSF)',
    severity: 'HIGH' as const,
    status: 'IN_PROGRESS' as const,
    alertType: 'CORRELATION' as const,
    source: 'FraudEngine',
    description: 'High-volume international call pattern detected to premium rate numbers in Sierra Leone (+232), Guinea (+224). 850+ simultaneous calls from 45 compromised accounts. Estimated loss: 4,800,000 DZD/hour.',
    sourceIp: '10.10.2.30',
    protocol: 'SIP/ISUP',
    mitreTechniqueID: 'T1653',
    mitreTactic: 'Impact',
  },
  {
    title: 'Wangiri Fraud Pattern Identified',
    severity: 'MEDIUM' as const,
    status: 'ACKNOWLEDGED' as const,
    alertType: 'CORRELATION' as const,
    source: 'FraudEngine',
    description: 'Wangiri (one-ring) fraud campaign detected. 1200+ missed calls from international premium rate numbers. Pattern: calls lasting <3 seconds at odd hours. Campaign active since 48 hours.',
    sourceIp: '10.10.2.35',
    protocol: 'SS7/ISUP',
    mitreTechniqueId: 'T1653',
    mitreTactic: 'Impact',
  },
  {
    title: 'GTP Tunnel Anomaly - Potential Roaming Bypass',
    severity: 'HIGH' as const,
    status: 'INVESTIGATING' as const,
    alertType: 'ANOMALY' as const,
    source: 'GTP_Inspector',
    description: 'Abnormal GTP tunnel traffic volume (2.4 TB/day) from single APN configuration. Possible illegal SIM box operation or roaming bypass scheme. IMEI patterns suggest bulk device farm.',
    sourceIp: '10.10.3.15',
    destIp: '203.0.113.50',
    protocol: 'GTPv2',
    mitreTechniqueId: 'T1653',
    mitreTactic: 'Impact',
  },
  {
    title: 'Diameter Attack - CCR Flooding',
    severity: 'CRITICAL' as const,
    status: 'ESCALATED' as const,
    alertType: 'DETECTION' as const,
    source: 'Diameter_Analyzer',
    description: 'Credit-Control-Request flooding attack on OCS interface. 50,000+ requests/second from spoofed node. Affecting prepaid charging for 180,000 subscribers. Mitigation: Rate limiting activated.',
    sourceIp: '198.51.100.100',
    destIp: '10.0.2.40',
    protocol: 'Diameter',
    mitreTechniqueId: 'T1499',
    mitreTactic: 'Impact',
  },

  // Phishing/Social Engineering
  {
    title: 'Targeted Spear Phishing Against Executives',
    severity: 'HIGH' as const,
    status: 'NEW' as const,
    alertType: 'THREAT_INTEL' as const,
    source: 'Email_Gateway',
    description: 'Spear phishing emails targeting 5 C-level executives. Topic: "Urgent - ARTP Compliance Audit Findings". Contains malicious link to credential harvesting page mimicking internal portal.',
    sourceIp: '192.168.100.200',
    protocol: 'SMTP',
    mitreTechniqueId: 'T1566',
    mitreTactic: 'Initial Access',
  },
  {
    title: 'Fake Djezzy Support Portal Detected',
    severity: 'MEDIUM' as const,
    status: 'ACKNOWLEDGED' as const,
    alertType: 'THREAT_INTEL' as const,
    source: 'ThreatIntel_OpenCTI',
    description: 'Clone of Djezzy customer support portal discovered at djezzy-support[.]tk. Collecting customer credentials. Hosted on bulletproof hosting. Reported to CERT-AL and domain registrar.',
    sourceIp: '91.240.142.55',
    protocol: 'HTTPS',
    mitreTechniqueId: 'T1589',
    mitreTactic: 'Resource Development',
  },

  // Supply Chain / Third Party
  {
    title: 'Vendor Remote Access Security Incident',
    severity: 'HIGH' as const,
    status: 'IN_PROGRESS' as const,
    alertType: 'DETECTION' as const,
    source: 'SIEM_Wazuh',
    description: 'Unauthorized lateral movement detected from vendor maintenance account. Vendor: Ericsson field engineer. Access beyond agreed scope - accessed CRM database. Immediate revocation recommended.',
    sourceIp: '194.204.20.45',
    destIp: '172.16.0.30',
    protocol: 'RDP',
    mitreTechniqueId: 'T1078',
    mitreTactic: 'Defense Evasion',
  },
];

// MITRE ATT&CK techniques relevant to telecom
const mitreTechniques = [
  { id: 'T1039', name: 'Intercept Network Traffic', tactic: 'Collection' },
  { id: 'T1046', name: 'Network Service Discovery', tactic: 'Discovery' },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
  { id: 'T1213', name: 'Data from Information Repositories', tactic: 'Collection' },
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' },
  { id: 'T1537', name: 'Transfer Data to Cloud Account', tactic: 'Collection' },
  { id: 'T1566', name: 'Phishing', tactic: 'Initial Access' },
  { id: 'T1589', name: 'Domain Fronting', tactic: 'Command and Control' },
  { id: 'T1653', name: 'Phishing for Information', tactic: 'Collection' },
  { id: 'T1499', name: 'Endpoint Denial of Service', tactic: 'Impact' },
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' },
];

// Threat actors targeting African telecom operators
const threatActors = [
  { name: 'APT-GhostShell', attributionConfidence: 75, region: 'Eastern Europe' },
  { name: 'Lazarus-Telecom', attributionConfidence: 82, region: 'North Korea' },
  { name: 'FIN11-Africa', attributionConfidence: 68, region: 'Unknown' },
  { name: 'ScatteredSpider', attributionConfidence: 70, region: 'Global' },
  { name: 'OceanLotus', attributionConfidence: 65, region: 'Vietnam' },
  { name: 'APT33', attributionConfidence: 60, region: 'Iran' },
  { name: 'DarkHotel', attributionConfidence: 72, region: 'Unknown' },
  { name: 'Tick', attributionConfidence: 58, region: 'China' },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 Starting comprehensive demo data seeding...\n');
  console.log('════════════════════════════════════════════');
  console.log('   Djezzy National SOC Platform - Demo Data');
  console.log('   Context: Algeria (+213) | Djezzy Network');
  console.log('════════════════════════════════════════════\n');

  try {
    // Phase 1: Create Roles
    console.log('\n📋 PHASE 1: Creating Roles...');
    const roles = await createRoles();
    
    // Phase 2: Create Users
    console.log('\n👤 PHASE 2: Creating Users...');
    const users = await createUsers(roles);
    
    // Phase 3: Create Incidents
    console.log('\n🔥 PHASE 3: Creating Incidents...');
    const incidents = await createIncidents(users);
    
    // Phase 4: Create Alerts
    console.log('\n🚨 PHASE 4: Creating Alerts...');
    const alerts = await createAlerts(users, incidents);
    
    // Phase 5: Link Alerts to Incidents
    console.log('\n🔗 PHASE 5: Linking Alerts to Incidents...');
    await linkAlertsToIncidents(alerts, incidents);
    
    // Phase 6: Create Threat Indicators
    console.log('\n🎯 PHASE 6: Creating Threat Indicators...');
    const indicators = await createThreatIndicators();
    
    // Phase 7: Create Campaigns
    console.log('\n⚔️ PHASE 7: Creating Campaigns...');
    const campaigns = await createCampaigns(indicators);
    
    // Phase 8: Create Network Elements
    console.log('\n🖥️ PHASE 8: Creating Network Elements...');
    const networkElements = await createNetworkElements();
    
    // Phase 9: Create Subscribers
    console.log('\n📱 PHASE 9: Creating Subscribers...');
    const subscribers = await createSubscribers();
    
    // Phase 10: Create Fraud Detections
    console.log('\n💰 PHASE 10: Creating Fraud Detections...');
    const fraudDetections = await createFraudDetections(users, incidents, subscribers);
    
    // Phase 11: Create SS7 Messages
    console.log('\n📡 PHASE 11: Creating SS7 Messages...');
    const ss7Messages = await createSS7Messages(alerts, networkElements);
    
    // Phase 12: Create Compliance Checklists
    console.log('\n✅ PHASE 12: Creating Compliance Checklists...');
    const complianceItems = await createComplianceChecklists(users);
    
    // Phase 13: Create System Config
    console.log('\n⚙️ PHASE 13: Creating System Configuration...');
    const configs = await createSystemConfig();
    
    // Phase 14: Create System Health Metrics
    console.log('\n📊 PHASE 14: Creating System Health Metrics...');
    const metrics = await createHealthMetrics();
    
    // Phase 15: Create Tasks
    console.log('\n📝 PHASE 15: Creating Tasks...');
    const tasks = await createTasks(incidents, users);
    
    // Phase 16: Create Timeline Events
    console.log('\n📅 PHASE 16: Creating Timeline Events...');
    await createTimelineEvents(incidents, users);

    // Summary
    console.log('\n\n════════════════════════════════════════════');
    console.log('          ✅ SEEDING COMPLETE!');
    console.log('════════════════════════════════════════════\n');
    
    console.log('📊 DATA SUMMARY:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🎭 Roles: ${roles.length}`);
    console.log(`   🚨 Alerts: ${alerts.length}`);
    console.log(`   🔥 Incidents: ${incidents.length}`);
    console.log(`   🎯 Indicators: ${indicators.length}`);
    console.log(`   ⚔️ Campaigns: ${campaigns.length}`);
    console.log(`   💰 Fraud Cases: ${fraudDetections.length}`);
    console.log(`   📡 SS7 Messages: ${ss7Messages.length}`);
    console.log(`   📱 Subscribers: ${subscribers.length}`);
    console.log(`   🖥️ Network Elements: ${networkElements.length}`);
    console.log(`   ✅ Compliance Items: ${complianceItems.length}`);
    console.log(`   ⚙️ Config Entries: ${configs.length}`);
    console.log(`   📊 Metrics Points: ${metrics.length}\n`);
    
    console.log('🇩🇿 ALGERIAN TELECOM CONTEXT:');
    console.log('   Country Code: +213');
    console.log('   Operator: Djezzy (MCC: 603, MNC: 02)');
    console.log('   Coverage: Algiers, Oran, Constantine, Annaba');
    console.log('   Regulator: ARTP (Autorité de Régulation des Postes et Télécoms)\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// PHASE IMPLEMENTATIONS
// ============================================================

async function createRoles() {
  const roleData = [
    { name: 'soc_admin', description: 'Full SOC platform administrator with all permissions', permissions: JSON.stringify(['*']) },
    { name: 'security_analyst', description: 'Security analyst for daily monitoring and investigation', permissions: JSON.stringify(['alerts:read', 'alerts:update', 'incidents:read', 'incidents:create', 'threat_intel:read', 'reports:read']) },
    { name: 'threat_hunter', description: 'Threat intelligence specialist for proactive hunting', permissions: JSON.stringify(['threat_intel:*', 'alerts:read', 'campaigns:*', 'indicators:*']) },
    { name: 'compliance_officer', description: 'ARTP/ANSSI compliance management', permissions: JSON.stringify(['compliance:*', 'reports:*', 'audit_logs:read']) },
    { name: 'telecom_analyst', description: 'Telecom/SS7 specialist for signaling analysis', permissions: JSON.stringify(['ss7:*', 'fraud:*', 'subscribers:read', 'network_elements:read']) },
    { name: 'incident_manager', description: 'Incident response lead with escalation authority', permissions: JSON.stringify(['incidents:*', 'alerts:*', 'tasks:*', 'playbooks:*']) },
    { name: 'executive_viewer', description: 'Executive dashboard view only access', permissions: JSON.stringify(['dashboard:read', 'reports:read']) },
    { name: 'service_account_api', description: 'Automated service account for API integrations', permissions: JSON.stringify(['api:write', 'api:read', 'alerts:create']) },
  ];

  const roles = [];
  for (const role of roleData) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    roles.push(created);
    await delay(10);
  }
  
  console.log(`   ✅ Created ${roles.length} roles`);
  return roles;
}

async function createUsers(roles: { id: string; name: string }[]) {
  // Define specific users with their roles
  const userDefinitions = [
    { email: 'admin.soc@djezzy.dz', username: 'soc_admin_karim', roleName: 'soc_admin', department: 'SOC Operations' },
    { email: 'karim.benali@djezzy.dz', username: 'karim_benali', roleName: 'soc_admin', department: 'Management' },
    { email: 'ahmed.cherif@djezzy.dz', username: 'ahmed_cherif', roleName: 'security_analyst', department: 'SOC Operations' },
    { email: 'fatima.haddad@djezzy.dz', username: 'fatima_haddad', roleName: 'security_analyst', department: 'SOC Operations' },
    { email: 'youssef.kaci@djezzy.dz', username: 'youssef_kaci', roleName: 'threat_hunter', department: 'Threat Intelligence' },
    { email: 'amina.larbi@djezzy.dz', username: 'amina_larbi', roleName: 'threat_hunter', department: 'Threat Intelligence' },
    { email: 'rachid.mansouri@djezzy.dz', username: 'rachid_mansouri', roleName: 'compliance_officer', department: 'Compliance' },
    { email: 'khadija.nacer@djezzy.dz', username: 'khadija_nacer', roleName: 'compliance_officer', department: 'Compliance' },
    { email: 'omar.ouahab@djezzy.dz', username: 'omar_ouahab', roleName: 'telecom_analyst', department: 'Telecom Security' },
    { email: 'said.slimani@djezzy.dz', username: 'said_slimani', roleName: 'telecom_analyst', department: 'Telecom Security' },
    { email: 'mehdi.taleb@djezzy.dz', username: 'mehdi_taleb', roleName: 'incident_manager', department: 'Incident Response' },
    { email: 'leila.zerhouni@djezzy.dz', username: 'leila_zerhouni', roleName: 'executive_viewer', department: 'Management' },
  ];

  const users = [];
  for (let i = 0; i < userDefinitions.length; i++) {
    const def = userDefinitions[i];
    const role = roles.find(r => r.name === def.roleName)!;
    const name = generateAlgerianName();
    
    // Override name for specific users to match email
    const userNameParts = def.email.split('@')[0].split('.');
    const displayName = i < 3 ? name.fullName : `${userNameParts[0]?.charAt(0).toUpperCase()}${userNameParts[0]?.slice(1)} ${userNameParts[1]?.charAt(0).toUpperCase()}${userNameParts[1]?.slice(1)}`;

    const user = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        username: def.username,
        passwordHash: '$2b$10$DemoHashedPasswordForPresentationOnly',
        name: displayName,
        roleId: role.id,
        isActive: true,
        isMfaEnabled: ['soc_admin'].includes(def.roleName),
        department: def.department,
        lastLoginAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
      },
    });
    users.push(user);
    await delay(10);
  }

  console.log(`   ✅ Created ${users.length} users`);
  return users;
}

async function createIncidents(users: any[]) {
  const incidentData = [
    {
      tatcCode: 'TATC-2026-0001',
      title: 'Coordinated SS7 Location Tracking Campaign',
      description: 'Persistent threat actor exploiting SS7 vulnerabilities to track high-value subscribers including government officials and corporate executives. Multiple SRI requests from unauthorized GTs detected over 2-week period.',
      incidentType: 'SS7_ATTACK',
      severity: 'CRITICAL',
      status: 'OPEN',
      phase: 'ERADICATION',
      impactScore: 9.2,
      confidenceScore: 87.5,
      blastRadius: 'Potential tracking of 500+ VIP subscribers across network',
      affectedAssets: JSON.stringify(['STP_Primary', 'STP_Backup', 'HLR_HSS_Cluster']),
      affectedSubscribers: 512,
      tags: JSON.stringify(['SS7', 'location-tracking', 'VIP', 'APT']),
    },
    {
      tatcCode: 'TATC-2026-0002',
      title: 'Large-Scale SIM Swap Fraud Ring Operation',
      description: 'Organized crime group performing unauthorized SIM swaps targeting banking customers. Using social engineering at retail outlets combined with insider assistance. Estimated financial impact exceeds 15 million DZD.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'CRITICAL',
      status: 'IN_PROGRESS',
      phase: 'CONTAINMENT',
      impactScore: 8.7,
      confidenceScore: 92.0,
      blastRadius: 'Banking sector customers affected, reputation damage',
      affectedServices: JSON.stringify(['Mobile_Banking', 'OTP_Services', 'mWallet']),
      affectedSubscribers: 145,
      slaBreach: true,
      tags: JSON.stringify(['SIM-swap', 'fraud', 'banking', 'insider-threat']),
    },
    {
      tatcCode: 'TATC-2026-0003',
      title: 'APT-GhostShell Core Network Intrusion',
      description: 'Advanced persistent threat group gained initial access via supply chain compromise of vendor remote access. Lateral movement to core network segment detected. Potential access to HLR and subscriber databases confirmed.',
      incidentType: 'APT',
      severity: 'CRITICAL',
      status: 'OPEN',
      phase: 'CONTAINMENT',
      impactScore: 9.8,
      confidenceScore: 75.0,
      blastRadius: 'Full core network access, 28M subscribers at risk',
      affectedAssets: JSON.stringify(['CRM_Database', 'Billing_System', 'HLR_HSS', 'Provisioning_System']),
      tags: JSON.stringify(['APT', 'supply-chain', 'core-network', 'critical']),
    },
    {
      tatcCode: 'TATC-2026-0004',
      title: 'International Revenue Share Fraud (IRSF) Wave',
      description: 'Premium rate number fraud using compromised subscriber accounts and PBX systems. High-volume international calls to Sierra Leone and Guinea premium rate destinations. Active for 72 hours before detection.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      phase: 'ERADICATION',
      impactScore: 7.5,
      confidenceScore: 95.0,
      blastRadius: 'Financial loss, interconnect settlement issues',
      affectedServices: JSON.stringify(['International_Voice', 'Settlement_System']),
      financialImpact: 4800000n, // 4.8M DZD
      tags: JSON.stringify(['IRSF', 'premium-rate', 'international-fraud']),
    },
    {
      tatcCode: 'TATC-2026-0005',
      title: 'Diameter DoS Attack on OCS Interface',
      description: 'Distributed denial of service attack targeting Online Charging System via Diameter CCR flooding. Prepaid charging services degraded for 180,000 subscribers during peak hours.',
      incidentType: 'DDoS',
      severity: 'HIGH',
      status: 'RESOLVED',
      phase: 'RECOVERY',
      impactScore: 6.8,
      confidenceScore: 99.0,
      blastRadius: 'Prepaid service degradation, customer complaints',
      affectedAssets: JSON.stringify(['OCS_Platform', 'Diameter_Router']),
      affectedSubscribers: 180000,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['DDoS', 'diameter', 'OCS', 'prepaid']),
    },
    {
      tatcCode: 'TATC-2026-0006',
      title: 'Insider Data Theft Investigation',
      description: 'Employee suspected of exfiltrating subscriber data for competitive intelligence purposes. Bulk exports detected outside business hours. Legal and HR coordination initiated.',
      incidentType: 'INSIDER_THREAT',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      phase: 'TRIAGE',
      impactScore: 7.2,
      confidenceScore: 70.0,
      blastRadius: 'Customer privacy violation, regulatory penalties',
      affectedAssets: JSON.stringify(['CRM_Database', 'Data_Lake']),
      affectedSubscribers: 125000,
      tags: JSON.stringify(['insider-threat', 'data-exfiltration', 'privacy']),
    },
    {
      tatcCode: 'TATC-2026-0007',
      title: 'TrickBot Malware Infection - Finance Department',
      description: 'Banking trojan infection detected on multiple workstations in finance department. Potential access to financial systems under investigation. Containment actions in progress.',
      incidentType: 'MALWARE',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      phase: 'ERADICATION',
      impactScore: 6.5,
      confidenceScore: 88.0,
      blastRadius: 'Financial data exposure risk, compliance implications',
      affectedAssets: JSON.stringify(['FIN_WS_042', 'FIN_WS_043', 'FIN_FILE_SERVER']),
      tags: JSON.stringify(['malware', 'TrickBot', 'finance', 'banking-trojan']),
    },
    {
      tatcCode: 'TATC-2026-0008',
      title: 'GTP Tunnel Abuse - Illegal SIM Box Operation',
      description: 'Detection of large-scale SIM box operation using GTP tunnels to terminate international VoIP traffic illegally. Revenue bypass estimated at significant levels. Coordinating with law enforcement.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'MEDIUM',
      status: 'OPEN',
      phase: 'DETECTION',
      impactScore: 5.8,
      confidenceScore: 82.0,
      blastRadius: 'Revenue loss, interconnect violations',
      affectedServices: JSON.stringify(['VoIP_Termination', 'GGSN_PGW']),
      tags: JSON.stringify(['SIM-box', 'GTP', 'termination-fraud', 'VoIP']),
    },
    {
      tatcCode: 'TATC-2026-0009',
      title: 'Spear Phishing Campaign Against Executives',
      description: 'Targeted phishing campaign detected targeting C-suite executives. Theme: ARTP compliance audit findings. Credential harvesting site identified and blocked. User awareness training being updated.',
      incidentType: 'NETWORK_INTRUSION',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      phase: 'LESSONS_LEARNED',
      impactScore: 4.5,
      confidenceScore: 90.0,
      blastRadius: 'Potential executive account compromise',
      affectedAssets: JSON.stringify(['Email_Gateway', 'Executive_Workstations']),
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['phishing', 'executive-targeting', 'credential-harvest']),
    },
    {
      tatcCode: 'TATC-2026-0010',
      title: 'USSD Premium Service Fraud Campaign',
      description: 'USSD-based fraud campaign affecting 150+ subscribers. Malicious app triggering premium USSD sessions without user consent. App distributed via third-party app store.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      phase: 'CONTAINMENT',
      impactScore: 5.2,
      confidenceScore: 78.0,
      blastRadius: 'Subscriber financial loss, trust impact',
      affectedServices: JSON.stringify(['USSD_Gateway', 'Billing_System']),
      affectedSubscribers: 152,
      financialImpact: 2450000n,
      tags: JSON.stringify(['USSD', 'premium-service', 'malware-app', 'subscriber-fraud']),
    },
    {
      tatcCode: 'TATC-2026-0011',
      title: 'Vendor Security Incident - Ericsson Maintenance Access',
      description: 'Third-party vendor exceeded authorized access scope during maintenance window. Accessed CRM database beyond agreed perimeter. Contract review and access revocation completed.',
      incidentType: 'THIRD_PARTY',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      phase: 'RECOVERY',
      impactScore: 4.0,
      confidenceScore: 95.0,
      blastRadius: 'Data access policy violation',
      affectedAssets: JSON.stringify(['CRM_Database', 'VPN_Gateway']),
      resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['vendor', 'third-party', 'access-violation', 'policy']),
    },
    {
      tatcCode: 'TATC-2026-0012',
      title: 'DNS Tunneling Data Exfiltration Attempt',
      description: 'Detected DNS tunneling activity from IT workstation indicating potential data exfiltration. Blocked at firewall level. Workstation isolated for forensic analysis.',
      incidentType: 'DATA_BREACH',
      severity: 'LOW',
      status: 'RESOLVED',
      phase: 'RECOVERY',
      impactScore: 3.2,
      confidenceScore: 65.0,
      blastRadius: 'Limited - single workstation',
      affectedAssets: JSON.stringify(['IT_WS_022', 'DNS_Server', 'Firewall']),
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['DNS-tunnel', 'exfiltration', 'contained']),
    },
    {
      tatcCode: 'TATC-2026-0013',
      title: 'Wangiri Fraud Wave - International Premium Numbers',
      description: 'One-ring fraud campaign using international premium rate numbers. 1200+ missed calls logged. Customer awareness campaign launched. Number blocking implemented.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'LOW',
      status: 'CLOSED',
      phase: 'LESSONS_LEARNED',
      impactScore: 2.8,
      confidenceScore: 98.0,
      blastRadius: 'Minimal - mostly blocked',
      affectedSubscribers: 1200,
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['wangiri', 'premium-rate', 'customer-awareness']),
    },
    {
      tatcCode: 'TATC-2026-0014',
      title: 'ARTP Compliance Gap - Encryption Standards',
      description: 'Internal audit identified gaps in encryption standards for subscriber PII data in transit. Remediation plan developed for TLS 1.3 migration across all internal APIs.',
      incidentType: 'POLICY_VIOLATION',
      severity: 'LOW',
      status: 'IN_PROGRESS',
      phase: 'ERADICATION',
      impactScore: 3.5,
      confidenceScore: 100.0,
      blastRadius: 'Regulatory compliance risk',
      remediationPlan: JSON.stringify({ deadline: '2026-03-31', owner: 'Security Architecture Team' }),
      tags: JSON.stringify(['ARTP', 'compliance', 'encryption', 'TLS']),
    },
    {
      tatcCode: 'TATC-2026-0015',
      title: 'LockBit Ransomware Attempt - Blocked',
      description: 'LockBit 3.0 ransomware execution attempt successfully blocked by EDR solution. Initial vector: phishing email with malicious Excel attachment. No data encrypted. Security awareness training scheduled.',
      incidentType: 'MALWARE',
      severity: 'INFO',
      status: 'RESOLVED',
      phase: 'LESSONS_LEARNED',
      impactScore: 0.5,
      confidenceScore: 100.0,
      blastRadius: 'None - successfully blocked',
      affectedAssets: JSON.stringify(['FS_CORP_01', 'EDR_Console']),
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      tags: JSON.stringify(['ransomware', 'LockBit', 'blocked', 'EDR-success']),
    },
  ];

  const incidents = [];
  const now = new Date();
  
  for (let i = 0; i < incidentData.length; i++) {
    const inc = incidentData[i];
    const assignedUser = users[randomInt(0, Math.min(5, users.length - 1))];
    const createdBy = users.find(u => u.username === 'soc_admin_karim') || users[0];
    
    // Spread timestamps over last 30 days
    const createdAt = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
    
    const incident = await prisma.incident.create({
      data: {
        ...inc,
        assignedToId: assignedUser.id,
        createdById: createdBy.id,
        createdAt,
        updatedAt: createdAt,
        ...(inc.resolvedAt ? {} : { resolvedAt: null }),
        ...(inc.closedAt ? {} : { closedAt: null }),
        containmentActions: inc.containmentActions || JSON.stringify([
          'Initial triage completed',
          'Scope assessment ongoing',
          'Stakeholder notification sent'
        ]),
        eradicationSteps: inc.eradicationSteps || JSON.stringify([]),
        lessonsLearned: inc.lessonsLearned || JSON.stringify([]),
        rootCauseAnalysis: inc.rootCauseAnalysis || JSON.stringify({}),
        customFields: JSON.stringify({
          artpNotified: ['CRITICAL', 'HIGH'].includes(inc.severity),
          lawEnforcementInvolved: ['CRITICAL'].includes(inc.severity) && inc.confidenceScore > 80,
          pressStatementRequired: false,
          boardEscalated: inc.impactScore >= 8,
        }),
      },
    });
    incidents.push(incident);
    await delay(15);
  }

  console.log(`   ✅ Created ${incidents.length} incidents`);
  return incidents;
}

async function createAlerts(users: any[], incidents: any[]) {
  const alerts = [];
  const now = new Date();
  
  // Use predefined scenarios plus generate additional ones
  const baseScenarios = [...alertScenarios];
  
  // Generate more alerts to reach 55+
  const additionalSources = ['SIEM_Wazuh', 'EDR_CrowdStrike', 'EDR_SentinelOne', 'NSM_Suricata', 'NTA_NetworkMinion', 'ThreatIntel_MISP', 'ThreatIntel_OpenCTI', 'VirusTotal_Integration', 'Email_Gateway_Mimecast', 'DNS_PowerFilter'];
  const additionalSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const additionalStatuses = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];
  const additionalTypes = ['DETECTION', 'ANOMALY', 'CORRELATION', 'THREAT_INTEL'];
  
  const additionalTitles = [
    'Brute force login attempt detected on VPN portal',
    'SSL certificate expiration warning for *.djezzy.dz',
    'Unusual outbound traffic to Tor exit node',
    'New domain registered matching brand: djezzy-bills[.]com',
    'IoT device anomaly - unusual data transfer pattern',
    'SIP registration flood from IP range 45.155.{1-20}',
    'Potential data staging directory detected',
    'Scheduled task modification on server SRV-APP-12',
    'Cloud storage upload to non-corporate account',
    'LDAP enumeration activity from workstation WS-HR-03',
    'PowerShell script execution with encoded command',
    'Unusual authentication pattern after hours',
    'New malware hash matched in sandbox analysis',
    'Geolocation mismatch for privileged user session',
    'API rate limit threshold breached for partner integration',
  ];

  // Add base scenarios
  for (let i = 0; i < baseScenarios.length; i++) {
    const scenario = baseScenarios[i];
    const assignedTo = randomItem(users.filter(u => {
      const role = u.username.includes('admin') || u.username.includes('analyst') || u.username.includes('hunter');
      return role;
    })) || users[0];
    
    const firstSeen = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
    
    const alert = await prisma.alert.create({
      data: {
        ...scenario,
        assignedToId: assignedTo.id,
        firstSeen,
        lastSeen: new Date(firstSeen.getTime() + randomInt(60000, 3600000)),
        createdAt: firstSeen,
        confidenceScore: scenario.confidenceScore || (Math.random() * 40 + 50), // 50-90
        tags: scenario.tags || JSON.stringify([scenario.source.toLowerCase().replace(/[^a-z]/g, '-')]),
        rawEvent: JSON.stringify({
          source: scenario.source,
          detectionMethod: 'rule-based',
          ruleId: `RULE-${String(i + 1).padStart(4, '0')}`,
          version: '2.0',
        }),
      },
    });
    alerts.push(alert);
    await delay(10);
  }

  // Add additional generated alerts
  for (let i = baseScenarios.length; i < 55; i++) {
    const title = additionalTitles[i % additionalTitles.length] || `Security event #${i + 1} detected`;
    const severity = additionalSeverities[i % additionalSeverities.length];
    const status = additionalStatuses[i % additionalStatuses.length];
    const type = additionalTypes[i % additionalTypes.length];
    const source = additionalSources[i % additionalSources.length];
    
    const firstSeen = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
    const mitre = randomItem(mitreTechniques);
    
    const alert = await prisma.alert.create({
      data: {
        title,
        severity: severity as any,
        status: status as any,
        alertType: type as any,
        source,
        description: `Automated detection from ${source}. ${severity} severity event requiring review.`,
        sourceIp: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
        protocol: randomItem(['TCP', 'UDP', 'HTTPS', 'DNS', 'HTTP', 'ICMP', 'SIP', 'SS7']),
        mitreTechniqueId: mitre.id,
        mitreTactic: mitre.tactic,
        assignedToId: users[i % users.length].id,
        firstSeen,
        lastSeen: new Date(firstSeen.getTime() + randomInt(60000, 7200000)),
        confidenceScore: Math.round((Math.random() * 40 + 50) * 100) / 100,
        tags: JSON.stringify([source.toLowerCase(), severity.toLowerCase()]),
        createdAt: firstSeen,
        rawEvent: JSON.stringify({ source, autoGenerated: true }),
      },
    });
    alerts.push(alert);
    await delay(5);
  }

  console.log(`   ✅ Created ${alerts.length} alerts`);
  return alerts;
}

async function linkAlertsToIncidents(alerts: any[], incidents: any[]) {
  let linkedCount = 0;
  
  // Link some alerts to incidents based on relevance
  for (const incident of incidents.slice(0, 10)) {
    // Find alerts that could relate to this incident
    const relatedAlerts = alerts.filter(a => {
      if (incident.title.toLowerCase().includes('ss7') && a.source?.includes('SS7')) return true;
      if (incident.title.toLowerCase().includes('fraud') && a.source?.includes('Fraud')) return true;
      if (incident.title.toLowerCase().includes('apt') && a.severity === 'CRITICAL') return true;
      if (incident.title.toLowerCase().includes('ddos') && a.protocol?.includes('Diameter')) return true;
      if (incident.title.toLowerCase().includes('malware') && a.title?.toLowerCase().includes('malware')) return true;
      return false;
    }).slice(0, randomInt(2, 5));
    
    for (const alert of relatedAlerts) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { 
          incidentId: incident.id,
          status: 'ESCALATED',
        },
      });
      linkedCount++;
      await delay(5);
    }
  }

  // Also randomly link some other alerts
  for (let i = 0; i < Math.min(15, alerts.length); i++) {
    const alert = alerts[randomInt(0, alerts.length - 1)];
    const incident = incidents[randomInt(0, incidents.length - 1)];
    
    if (!alert.incidentId && Math.random() > 0.5) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { incidentId: incident.id },
      });
      linkedCount++;
    }
  }

  console.log(`   ✅ Linked ${linkedCount} alerts to incidents`);
}

async function createThreatIndicators() {
  const indicators = [];
  
  // IPs related to attacks
  const maliciousIPs = [
    { value: '185.220.101.37', type: 'IPV4', actor: 'APT-GhostShell', confidence: 92, source: 'AlienVault OTX', context: { country: 'Bulgaria', hosting: 'Bulletproof', first_seen: '2025-11-15' }},
    { value: '94.102.51.12', type: 'IPV4', actor: 'Lazarus-Telecom', confidence: 88, source: 'CrowdStrike Intel', context: { country: 'Russia', hosting: 'Known C2', first_seen: '2025-09-20' }},
    { value: '41.105.24.15', type: 'IPV4', actor: 'FIN11-Africa', confidence: 75, source: 'Internal Hunting', context: { country: 'Algeria', hosting: 'Local ISP', first_seen: '2026-01-05' }},
    { value: '197.207.140.50', type: 'IPV4', actor: 'Unknown', confidence: 65, source: 'SS7 Firewall Logs', context: { country: 'Unknown', hosting: 'Roaming Partner', first_seen: '2026-01-08' }},
    { value: '198.51.100.100', type: 'IPV4', actor: 'APT-GhostShell', confidence: 95, source: 'MISP Community', context: { country: 'Netherlands', hosting: 'VPS Provider', first_seen: '2025-12-01' }},
    { value: '91.240.142.55', type: 'IPV4', actor: 'ScatteredSpider', confidence: 80, source: 'ThreatFox', context: { country: 'Panama', hosting: 'Bulletproof', first_seen: '2025-10-10' }},
    { value: '196.203.112.88', type: 'IPV4', actor: 'Unknown', confidence: 70, source: 'Internal Detection', context: { country: 'Algeria', hosting: 'Residential ISP', first_seen: '2026-01-10' }},
    { value: '203.0.113.50', type: 'IPV4', actor: 'FIN11-Africa', confidence: 85, source: 'VirusTotal', context: { country: 'Unknown', hosting: 'Cloud', first_seen: '2025-11-25' }},
  ];

  // Domains
  const maliciousDomains = [
    { value: 'evil-c2-server.xyz', type: 'DOMAIN', actor: 'Lazarus-Telecom', confidence: 93, source: 'VirusTotal', context: { registrar: 'NameCheap', created: '2025-08-15', dns_sec: false }},
    { value: 'djezzy-support.tk', type: 'DOMAIN', actor: 'ScatteredSpider', confidence: 90, source: 'OpenCTI', context: { registrar: 'FreeTK', created: '2025-12-20', purpose: 'Credential Harvesting' }},
    { value: 'update-djezzy-app[.]com', type: 'DOMAIN', actor: 'Unknown', confidence: 72, source: 'Email Gateway', context: { registrar: 'GoDaddy', created: '2026-01-02', purpose: 'Malware Distribution' }},
    { value: 'premium-winners[.]dz', type: 'DOMAIN', actor: 'FIN11-Africa', confidence: 78, source: 'Fraud Intelligence', context: { purpose: 'Prize scam targeting subscribers' }},
  ];

  // File hashes
  const malwareHashes = [
    { value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', type: 'FILE_HASH_SHA256', actor: 'APT-GhostShell', confidence: 98, source: 'Hybrid Analysis', context: { family: 'Remcos RAT', size: '245KB', compile_time: '2025-12-15' }},
    { value: 'f9e8d7c6b5a4938271615f4e3d2c1b0a9988776654433221100ffeeddccbbaa98', type: 'FILE_HASH_SHA256', actor: 'Lazarus-Telecom', confidence: 95, source: 'ANY.RUN', context: { family: 'TrickBot', size: '512KB', compile_time: '2025-11-20' }},
    { value: '1234abcd5678efgh9012ijkl34mnop5678qrstuvwx8765zyxwvutsrqponmlkjihgfedcba', type: 'FILE_HASH_SHA256', actor: 'Unknown', confidence: 70, source: 'Sandbox Internal', context: { family: 'AgentTesla', size: '380KB' }},
  ];

  // Telecom-specific indicators (IMSIs, IMEIs, MSISDNs)
  const telecomIndicators = [
    { value: '6020298765432101234', type: 'IMSI', actor: 'Unknown', confidence: 60, source: 'SS7 Monitoring', context: { flag_reason: 'Location tracking target', risk_score: 85 }},
    { value: '6020211223344556677', type: 'IMSI', actor: 'FIN11-Africa', confidence: 75, source: 'Fraud Detection', context: { flag_reason: 'SIM swap victim', associated_fraud: 'TATC-2026-0002' }},
    { value: '+2135501234567', type: 'MSISDN', actor: 'Unknown', confidence: 55, source: 'USSD Gateway', context: { flag_reason: 'USSD fraud participant' }},
    { value: '+2136619876543', type: 'MSISDN', actor: 'FIN11-Africa', confidence: 68, source: 'IRSF Analysis', context: { flag_reason: 'IRSF originating number' }},
    { value: '359876543210987654', type: 'IMEI', actor: 'Unknown', confidence: 62, source: 'Device Analytics', context: { flag_reason: 'SIM box device detected' }},
  ];

  // CVEs relevant to telecom
  const cveIndicators = [
    { value: 'CVE-2024-1234', type: 'CVE', actor: 'APT-GhostShell', confidence: 85, source: 'NVD', context: { product: 'Huawei HLR', cvss: 9.8, exploit_available: true }},
    { value: 'CVE-2024-5678', type: 'CVE', actor: 'Unknown', confidence: 72, source: 'Vendor Advisory', context: { product: 'Ericsson MSC', cvss: 7.5, exploit_available: false }},
  ];

  const allIndicators = [...maliciousIPs, ...maliciousDomains, ...malwareHashes, ...telecomIndicators, ...cveIndicators];

  for (const ind of allIndicators) {
    const indicator = await prisma.threatIndicator.create({
      data: {
        type: ind.type as any,
        value: ind.value,
        confidence: ind.confidence,
        source: ind.source,
        threatActor: ind.actor,
        isActive: !['RESOLVED', 'CLOSED'].includes(ind.type),
        firstSeen: new Date(ind.context?.first_seen || Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        tags: JSON.stringify([ind.actor?.toLowerCase()?.replace(/[^a-z]/g, '-'), ind.type.toLowerCase()]),
        context: JSON.stringify(ind.context),
        tlpLevel: ind.confidence > 80 ? 'AMBER' : 'WHITE',
        killChainPhase: randomItem(['Reconnaissance', 'Weaponization', 'Delivery', 'Exploitation', 'Installation', 'C2', 'Objectives']),
      },
    });
    indicators.push(indicator);
    await delay(8);
  }

  console.log(`   ✅ Created ${indicators.length} threat indicators`);
  return indicators;
}

async function createCampaigns(indicators: any[]) {
  const campaigns = [
    {
      name: 'Operation SilentStorm',
      alias: 'OPSS-2026',
      description: 'Persistent campaign targeting North African mobile network operators. Focus on SS7 exploitation for subscriber tracking and interception. Active since Q3 2025.',
      threatActor: 'APT-GhostShell',
      attributionConfidence: 75,
      status: 'ACTIVE',
      targetSector: 'Telecommunications',
      targetRegion: 'North Africa (Algeria, Tunisia, Morocco)',
      objectives: JSON.stringify(['Subscriber location tracking', 'Communication interception', 'VIP surveillance']),
      techniquesUsed: JSON.stringify(['T1537', 'T1039', 'T1046']),
      financialImpact: 2500000n,
      startDate: new Date('2025-09-15'),
    },
    {
      name: 'TelecomHeist Wave 3',
      alias: 'THW-Q1-2026',
      description: 'Third wave of coordinated fraud campaign leveraging SIM swap attacks against banking customers. Exploiting weak identity verification at retail outlets.',
      threatActor: 'FIN11-Africa',
      attributionConfidence: 85,
      status: 'ACTIVE',
      targetSector: 'Banking/Finance',
      targetRegion: 'Algeria (Algiers, Oran, Constantine)',
      objectives: JSON.stringify(['Account takeover', 'Mobile banking credential theft', 'OTP interception']),
      techniquesUsed: JSON.stringify(['T1566', 'T1589', 'T1653']),
      financialImpact: 15200000n,
      startDate: new Date('2025-12-01'),
    },
    {
      name: 'Project RedHarbor',
      alias: 'PRH-2025',
      description: 'Supply chain compromise campaign targeting telecom vendors. Initial access through trusted partner networks followed by lateral movement to operator core networks.',
      threatActor: 'Lazarus-Telecom',
      attributionConfidence: 68,
      status: 'ACTIVE',
      targetSector: 'Telecommunications Infrastructure',
      targetRegion: 'Global (focus on MENA region)',
      objectives: JSON.stringify(['Core network persistence', 'Subscriber database exfiltration', 'Strategic intelligence gathering']),
      techniquesUsed: JSON.stringify(['T1078', 'T1213', 'T1048']),
      financialImpact: 0n, // Espionage focus
      startDate: new Date('2025-06-01'),
    },
    {
      name: 'IRSFWave Autumn',
      alias: 'IRSF-AUT-2025',
      description: 'International Revenue Share Fraud campaign using compromised PBX systems and SIM boxes. Premium rate termination to West African destinations.',
      threatActor: 'Unknown',
      attributionConfidence: 45,
      status: 'CONCLUDED',
      targetSector: 'Telecommunications',
      targetRegion: 'West Africa (Sierra Leone, Guinea targets)',
      objectives: JSON.stringify(['Revenue generation through IRSF', 'Premium rate arbitrage']),
      techniquesUsed: JSON.stringify(['T1653']),
      financialImpact: 4800000n,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-12-15'),
    },
  ];

  const createdCampaigns = [];
  for (const camp of campaigns) {
    // Link some indicators to this campaign
    const relatedIndicators = indicators
      .filter(i => i.threatActor === camp.threatActor || Math.random() > 0.7)
      .slice(0, randomInt(2, 5))
      .map(i => i.id);

    const campaign = await prisma.campaign.create({
      data: {
        ...camp,
        isActive: camp.status === 'ACTIVE',
        indicators: { connect: relatedIndicators.map(id => ({ id })) },
      },
    });
    createdCampaigns.push(campaign);
    await delay(10);
  }

  console.log(`   ✅ Created ${createdCampaigns.length} campaigns`);
  return createdCampaigns;
}

async function createNetworkElements() {
  const elements = [
    { elementType: 'HLR_HSS', hostname: 'HLR-NG-Primary-Algiers', ipAddress: '10.0.1.1', vendor: 'Huawei', softwareVersion: 'V900R018C10SPC010', status: 'OPERATIONAL', capacity: 45.2, location: 'Algiers Data Center - Bir Mouradis', securityZone: 'Core_Zone' },
    { elementType: 'HLR_HSS', hostname: 'HLR-NG-Secondary-Oran', ipAddress: '10.0.1.2', vendor: 'Huawei', softwareVersion: 'V900R018C10SPC010', status: 'OPERATIONAL', capacity: 32.1, location: 'Oran Data Center - Ain El Turk', securityZone: 'Core_Zone' },
    { elementType: 'STP', hostname: 'STP-Primary-Algiers', ipAddress: '10.0.1.5', vendor: 'Ericsson', softwareVersion: 'APZ 212 55/3', status: 'OPERATIONAL', capacity: 28.5, location: 'Algiers Data Center', securityZone: 'DMZ' },
    { elementType: 'STP', hostname: 'STP-Backup-Constantine', ipAddress: '10.0.1.6', vendor: 'Ericsson', softwareVersion: 'APZ 212 55/3', status: 'OPERATIONAL', capacity: 15.3, location: 'Constantine Data Center - Ain Smara', securityZone: 'DMZ' },
    { elementType: 'MSC', hostname: 'MSC-Server-Algiers', ipAddress: '10.0.2.10', vendor: 'Nokia', softwareVersion: 'MRBS 7.0', status: 'OPERATIONAL', capacity: 67.8, location: 'Algiers Data Center', securityZone: 'Core_Zone' },
    { elementType: 'MGW', hostname: 'MGW-Algiers-01', ipAddress: '10.0.2.11', vendor: 'Nokia', softwareVersion: 'MRBS 7.0', status: 'OPERATIONAL', capacity: 54.2, location: 'Algiers Data Center', securityZone: 'Core_Zone' },
    { elementType: 'GGSN_PGW', hostname: 'PGW-Algiers-Main', ipAddress: '10.0.2.20', vendor: 'Huawei', softwareVersion: 'V900R021C10SPC200', status: 'DEGRADED', capacity: 89.5, location: 'Algiers Data Center', securityZone: 'Core_Zone' },
    { elementType: 'SGSN_SGW', hostname: 'SGW-Algiers-01', ipAddress: '10.0.2.21', vendor: 'Huawei', softwareVersion: 'V900R021C10SPC200', status: 'OPERATIONAL', capacity: 72.3, location: 'Algiers Data Center', securityZone: 'Core_Zone' },
    { elementType: 'MME', hostname: 'MME-Pool-Algiers', ipAddress: '10.0.2.30', vendor: 'Ericsson', softwareVersion: 'SGG12', status: 'OPERATIONAL', capacity: 61.7, location: 'Algiers Data Center', securityZone: 'Core_Zone' },
    { elementType: 'CSCF', hostname: 'IMS-CSCF-Primary', ipAddress: '10.0.3.10', vendor: 'Huawei', softwareVersion: 'V700R019C10SPC050', status: 'OPERATIONAL', capacity: 38.9, location: 'Algiers Data Center', securityZone: 'IMS_Zone' },
    { elementType: 'OCS', hostname: 'OCS-Production', ipAddress: '10.0.4.10', vendor: 'Amdocs', softwareVersion: '9.1', status: 'OPERATIONAL', capacity: 55.0, location: 'Algiers Data Center - Oued Koriche', securityZone: 'Support_Zone' },
    { elementType: 'PCRF', hostname: 'PCRF-Algiers', ipAddress: '10.0.4.11', vendor: 'Huawei', softwareVersion: 'V700R019C10', status: 'MAINTENANCE', capacity: 0, location: 'Algiers Data Center', securityZone: 'Support_Zone' },
  ];

  const createdElements = [];
  for (const el of elements) {
    const element = await prisma.networkElement.create({
      data: {
        ...el,
        lastHeartbeat: new Date(),
        serialNumber: `SN-${el.hostname.toUpperCase().replace(/-/g, '')}-${randomInt(100000, 999999)}`,
        metadata: JSON.stringify({
          rack: `Rack-${randomInt(1, 20)}`,
          redundancy: el.status === 'OPERATIONAL' ? 'Active' : 'Standby',
          firmwarePatchLevel: randomInt(1, 15),
        }),
      },
    });
    createdElements.push(element);
    await delay(8);
  }

  console.log(`   ✅ Created ${createdElements.length} network elements`);
  return createdElements;
}

async function createSubscribers() {
  const subscribers = [];
  
  // Create diverse subscriber profiles
  const subscriberProfiles = [
    { imsiType: 'POSTPAID', status: 'ACTIVE', roamingStatus: 'HOME', riskScore: 5.2, flags: [] },
    { imsiType: 'PREPAID', status: 'ACTIVE', roamingStatus: 'HOME', riskScore: 12.5, flags: [] },
    { imsiType: 'POSTPAID', status: 'ACTIVE', roamingStatus: 'INTERNATIONAL_ROAMING', homeCountry: 'DZA', visitedCountry: 'FRA', riskScore: 25.0, flags: ['roaming_alert'] },
    { imsiType: 'PREPAID', status: 'FRAUD_LOCKED', roamingStatus: 'HOME', riskScore: 95.1, flags: ['sim_swap_victim', 'irsf_participant'] },
    { imsiType: 'POSTPAID', status: 'ACTIVE', roamingStatus: 'NATIONAL_ROAMING', homeCountry: 'DZA', visitedCountry: 'DZA', riskScore: 18.3, flags: ['high_usage'] },
    { imsiType: 'PREPAID', status: 'SUSPENDED', roamingStatus: 'HOME', riskScore: 72.8, flags: ['ussd_fraud_suspect'] },
    { imsiType: 'POSTPAID', status: 'ACTIVE', roamingStatus: 'INTERNATIONAL_ROAMING', homeCountry: 'DZA', visitedCountry: 'TUN', riskScore: 15.7, flags: ['vip_customer'] },
    { imsiType: 'PREPAID', status: 'ACTIVE', roamingStatus: 'HOME', riskScore: 8.9, flags: [] },
    { imsiType: 'POSTPAID', status: 'BARRED', roamingStatus: 'HOME', riskScore: 99.2, flags: ['fraud_confirmed', 'law_enforcement_case'] },
    { imsiType: 'CORPORATE', status: 'ACTIVE', roamingStatus: 'HOME', riskScore: 3.1, flags: ['corporate_account', 'verified_identity'] },
  ];

  for (let i = 0; i < subscriberProfiles.length; i++) {
    const profile = subscriberProfiles[i];
    const subscriber = await prisma.subscriber.create({
      data: {
        imsi: generateIMSI(),
        msisdn: generateAlgerianMSISDN(),
        imei: `35${String(randomInt(100000000000000, 999999999999999))}`.slice(0, 15),
        imsiType: profile.imsiType as any,
        subscriberStatus: profile.status as any,
        roamingStatus: profile.roamingStatus as any,
        homeCountry: profile.homeCountry || 'DZA',
        visitedCountry: profile.visitedCountry,
        riskScore: profile.riskScore,
        fraudFlags: JSON.stringify(profile.flags),
        locationLac: randomInt(1001, 9999),
        locationCellId: randomInt(100000, 999999),
        lastActivityAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
      },
    });
    subscribers.push(subscriber);
    await delay(5);
  }

  console.log(`   ✅ Created ${subscribers.length} subscribers`);
  return subscribers;
}

async function createFraudDetections(users: any[], incidents: any[], subscribers: any[]) {
  const fraudCases = [
    {
      fraudType: 'SIM_SWAP_FRAUD',
      severity: 'CRITICAL',
      status: 'CONFIRMED',
      subscriberImsi: subscribers[3]?.imsi,
      subscriberMsisdn: subscribers[3]?.msisdn,
      amountAffected: 2500000n,
      currency: 'DZD',
      detectionMethod: 'Anomaly Detection - Retail Pattern Analysis',
      incidentId: incidents.find(i => i.tatcCode === 'TATC-2026-0002')?.id,
      firstOccurrence: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      fraudType: 'IRSF',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      subscriberMsisdn: subscribers[7]?.msisdn,
      amountAffected: 4800000n,
      currency: 'DZD',
      detectionMethod: 'Real-time Call Pattern Analysis',
      incidentId: incidents.find(i => i.tatcCode === 'TATC-2026-0004')?.id,
      firstOccurrence: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(),
    },
    {
      fraudType: 'PREMIUM_RATE',
      severity: 'MEDIUM',
      status: 'DETECTED',
      subscriberImsi: subscribers[5]?.imsi,
      amountAffected: 45000n,
      currency: 'DZD',
      detectionMethod: 'USSD Gateway Anomaly Detection',
      incidentId: incidents.find(i => i.tatcCode === 'TATC-2026-0010')?.id,
      firstOccurrence: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      fraudType: 'LOCATION_TRACKING',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      subscriberImsi: subscribers[0]?.imsi,
      detectionMethod: 'SS7 Firewall - SRI Request Monitoring',
      incidentId: incidents.find(i => i.tatcCode === 'TATC-2026-0001')?.id,
      firstOccurrence: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(),
    },
    {
      fraudType: 'INTERCEPTION',
      severity: 'HIGH',
      status: 'DETECTED',
      detectionMethod: 'SS7 Firewall - IwMSG Request Blocking',
      incidentId: incidents.find(i => i.tatcCode === 'TATC-2026-0001')?.id,
      firstOccurrence: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      lastOccurrence: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const createdFrauds = [];
  for (const fraud of fraudCases) {
    const analyst = users.find(u => u.username.includes('omar') || u.username.includes('said')) || users[0];
    
    const fraudCase = await prisma.fraudDetection.create({
      data: {
        ...fraud,
        assignedAnalystId: analyst.id,
        evidence: JSON.stringify({
          detectionRules: [`FRD-${randomInt(1000, 9999)}`],
          evidenceFiles: [],
          relatedAlerts: [],
          notes: 'Under investigation - awaiting legal approval for next steps',
        }),
      },
    });
    createdFrauds.push(fraudCase);
    await delay(10);
  }

  console.log(`   ✅ Created ${createdFrauds.length} fraud detections`);
  return createdFrauds;
}

async function createSS7Messages(alerts: any[], networkElements: any[]) {
  const messages = [];
  const messageTypes = [
    { code: 6, type: 'ISIAM', sccpLayer: 'TCAP' },
    { code: 45, type: 'SRI_REQ', sccpLayer: 'MAP' },
    { code: 46, type: 'SRI_RES', sccpLayer: 'MAP' },
    { code: 52, type: 'ATI_REQ', sccpLayer: 'MAP' },
    { code: 53, type: 'ATI_RES', scclLayer: 'MAP' },
    { code: 60, type: 'IwMSG', sccpLayer: 'CAP' },
    { code: 8, type: 'ISM_REQ', sccpLayer: 'MAP' },
    { code: 109, type: 'CCR', sccpLayer: 'Diameter' },
  ];

  // Create sample SS7 messages linked to alerts
  const ss7Alerts = alerts.filter(a => a.source?.includes('SS7') || a.protocol?.includes('SS7')).slice(0, 15);
  
  for (let i = 0; i < Math.min(30, ss7Alerts.length * 2); i++) {
    const alert = ss7Alerts[i % ss7Alerts.length];
    const msgType = messageTypes[i % messageTypes.length];
    const ne = networkElements.find(n => n.elementType === 'STP') || networkElements[2];
    
    const timestamp = new Date(alert.firstSeen.getTime() + randomInt(-300000, 300000));
    
    const message = await prisma.ss7Message.create({
      data: {
        messageCode: msgType.code,
        messageType: msgType.type,
        originatingGT: `8921085${String(randomInt(100000, 999999))}`,
        destinationGT: `6020210${String(randomInt(100, 999))}`,
        originatingPointCode: `2-${randomInt(1, 99)}-${randomInt(1, 99)}`,
        destinationPointCode: `2-${randomInt(1, 99)}-${randomInt(1, 99)}`,
        sccpLayer: msgType.sccpLayer,
        globalTitle: `60202${generateIMSI().slice(5)}`,
        imsi: i % 3 === 0 ? generateIMSI() : undefined,
        msisdn: i % 4 === 0 ? generateAlgerianMSISDN() : undefined,
        timestamp,
        rawData: JSON.stringify({
          hexDump: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          length: randomInt(100, 500),
        }),
        parsedData: JSON.stringify({
          messageType: msgType.type,
          parameters: {
            imsi: i % 3 === 0 ? generateIMSI() : undefined,
            msisdn: i % 4 === 0 ? generateAlgerianMSISDN() : undefined,
            timestamp: timestamp.toISOString(),
          },
        }),
        anomalyScore: alert.severity === 'CRITICAL' ? Math.random() * 30 + 70 : Math.random() * 20 + 30,
        isAnomalous: alert.severity === 'CRITICAL' || alert.severity === 'HIGH',
        alertId: alert.id,
        networkElementId: ne?.id,
      },
    });
    messages.push(message);
    await delay(5);
  }

  console.log(`   ✅ Created ${messages.length} SS7 messages`);
  return messages;
}

async function createComplianceChecklists(users: any[]) {
  const frameworks = [
    {
      framework: 'ARTP',
      categories: [
        { category: 'Security Management', items: [
          { requirementId: 'ARTP-SEC-001', title: 'Information Security Policy', status: 'COMPLIANT', riskRating: 'CRITICAL' },
          { requirementId: 'ARTP-SEC-002', title: 'Access Control Implementation', status: 'PARTIAL', riskRating: 'HIGH' },
          { requirementId: 'ARTP-SEC-003', title: 'Encryption of Sensitive Data', status: 'NON_COMPLIANT', riskRating: 'CRITICAL' },
          { requirementId: 'ARTP-SEC-004', title: 'Security Awareness Training', status: 'COMPLIANT', riskRating: 'MEDIUM' },
          { requirementId: 'ARTP-SEC-005', title: 'Incident Response Procedures', status: 'PARTIAL', riskRating: 'HIGH' },
        ]},
        { category: 'Privacy Protection', items: [
          { requirementId: 'ARTP-PRIV-001', title: 'Subscriber Consent Management', status: 'COMPLIANT', riskRating: 'HIGH' },
          { requirementId: 'ARTP-PRIV-002', title: 'Data Minimization Practices', status: 'PARTIAL', riskRating: 'MEDIUM' },
          { requirementId: 'ARTP-PRIV-003', title: 'Data Breach Notification', status: 'COMPLIANT', riskRating: 'CRITICAL' },
        ]},
        { category: 'Network Security', items: [
          { requirementId: 'ARTP-NET-001', title: 'SS7 Firewall Implementation', status: 'PARTIAL', riskRating: 'CRITICAL' },
          { requirementId: 'ARTP-NET-002', title: 'Signaling Security Monitoring', status: 'COMPLIANT', riskRating: 'HIGH' },
          { requirementId: 'ARTP-NET-003', title: 'Roaming Security Controls', status: 'NON_COMPLIANT', riskRating: 'HIGH' },
        ]},
      ],
    },
    {
      framework: 'ANSSI',
      categories: [
        { category: 'Identity & Access Management', items: [
          { requirementId: 'ANSSI-IAM-001', title: 'Strong Authentication Mechanisms', status: 'COMPLIANT', riskRating: 'HIGH' },
          { requirementId: 'ANSSI-IAM-002', title: 'Privileged Access Management', status: 'PARTIAL', riskRating: 'CRITICAL' },
          { requirementId: 'ANSSI-IAM-003', title: 'Multi-Factor Authentication', status: 'COMPLIANT', riskRating: 'HIGH' },
        ]},
        { category: 'Operational Security', items: [
          { requirementId: 'ANSSI-OPS-001', title: 'Security Event Logging', status: 'COMPLIANT', riskRating: 'MEDIUM' },
          { requirementId: 'ANSSI-OPS-002', title: 'Vulnerability Management Program', status: 'PARTIAL', riskRating: 'HIGH' },
          { requirementId: 'ANSSI-OPS-003', title: 'Penetration Testing Schedule', status: 'COMPLIANT', riskRating: 'MEDIUM' },
        ]},
        { category: 'Business Continuity', items: [
          { requirementId: 'ANSSI-BC-001', title: 'Business Impact Analysis', status: 'NOT_ASSESSED', riskRating: 'MEDIUM' },
          { requirementId: 'ANSSI-BC-002', title: 'Disaster Recovery Plan', status: 'PARTIAL', riskRating: 'HIGH' },
          { requirementId: 'ANSSI-BC-003', title: 'Backup & Recovery Testing', status: 'COMPLIANT', riskRating: 'HIGH' },
        ]},
      ],
    },
  ];

  const reviewer = users.find(u => u.username.includes('rachid') || u.username.includes('khadija')) || users[0];
  const createdItems = [];

  for (const fw of frameworks) {
    for (const cat of fw.categories) {
      for (const item of cat.items) {
        const checklistItem = await prisma.complianceChecklist.create({
          data: {
            framework: fw.framework,
            category: cat.category,
            requirementId: item.requirementId,
            title: item.title,
            controlObjective: `Ensure ${item.title.toLowerCase()} meets ${fw.framework} requirements`,
            status: item.status as any,
            riskRating: item.riskRating as any,
            evidenceRequired: item.riskRating !== 'LOW',
            evidenceFiles: item.status === 'COMPLIANT' ? JSON.stringify(['policy_doc.pdf', 'evidence_screenshot.png']) : JSON.stringify([]),
            findings: item.status === 'NON_COMPLIANT' ? JSON.stringify([{ finding: 'Gap identified', date: new Date() }]) : null,
            remediationPlan: item.status !== 'COMPLIANT' ? JSON.stringify({
              actions: ['Implement controls', 'Document procedures'],
              deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              owner: 'Security Team',
            }) : null,
            remediationDue: item.status !== 'COMPLIANT' ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
            ownerDepartment: 'Information Security',
            reviewerId: reviewer.id,
            lastAssessmentAt: new Date(),
            nextAssessmentAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          },
        });
        createdItems.push(checklistItem);
        await delay(5);
      }
    }
  }

  console.log(`   ✅ Created ${createdItems.length} compliance checklist items`);
  return createdItems;
}

async function createSystemConfig() {
  const configData = [
    { key: 'alert_retention_days', value: '365', description: 'Retention period for security alerts', category: 'GENERAL', valueType: 'NUMBER' },
    { key: 'max_incident_sla_hours_critical', value: '4', description: 'SLA for critical incidents (hours)', category: 'COMPLIANCE', valueType: 'NUMBER' },
    { key: 'max_incident_sla_hours_high', value: '24', description: 'SLA for high severity incidents (hours)', category: 'COMPLIANCE', valueType: 'NUMBER' },
    { key: 'ss7_monitoring_enabled', value: 'true', description: 'Enable SS7 signaling monitoring', category: 'TELECOM', valueType: 'BOOLEAN' },
    { key: 'ss7_firewall_blocking_mode', value: 'detect', description: 'SS7 firewall mode (block/detect)', category: 'TELECOM', valueType: 'STRING' },
    { key: 'fraud_detection_threshold', value: '0.75', description: 'Fraud score threshold for automatic blocking', category: 'TELECOM', valueType: 'NUMBER' },
    { key: 'mfa_required_for_admin', value: 'true', description: 'Require MFA for admin accounts', category: 'SECURITY', valueType: 'BOOLEAN' },
    { key: 'session_timeout_minutes', value: '480', description: 'Session timeout duration', category: 'SECURITY', valueType: 'NUMBER' },
    { key: 'password_policy_min_length', value: '12', description: 'Minimum password length', category: 'SECURITY', valueType: 'NUMBER' },
    { key: 'backup_schedule', value: '0 2 * * *', description: 'Database backup cron schedule', category: 'OPERATIONS', valueType: 'STRING' },
    { key: 'log_retention_days', value: '90', description: 'Log retention period', category: 'COMPLIANCE', valueType: 'NUMBER' },
    { key: 'api_rate_limit_per_minute', value: '100', description: 'Default API rate limit', category: 'PERFORMANCE', valueType: 'NUMBER' },
    { key: 'notification_email_from', value: 'soc-noreply@djezzy.dz', description: 'Sender address for notifications', category: 'GENERAL', valueType: 'STRING' },
    { key: 'artp_reporting_contact', value: 'compliance@djezzy.dz', description: 'Contact for ARTP reports', category: 'COMPLIANCE', valueType: 'STRING', isSensitive: false },
    { key: 'encryption_key_rotation_days', value: '90', description: 'Key rotation interval', category: 'SECURITY', valueType: 'NUMBER', isSensitive: true },
  ];

  const configs = [];
  for (const cfg of configData) {
    const config = await prisma.systemConfig.upsert({
      where: { key_name: cfg.key },
      update: { value: cfg.value },
      create: {
        keyName: cfg.key,
        value: cfg.value,
        description: cfg.description,
        category: cfg.category,
        isSensitive: cfg.isSensitive || false,
        valueType: cfg.valueType,
      },
    });
    configs.push(config);
    await delay(5);
  }

  console.log(`   ✅ Created ${configs.length} config entries`);
  return configs;
}

async function createHealthMetrics() {
  const metrics = [];
  const components = ['API_Server', 'Database_PostgreSQL', 'Redis_Cache', 'Kafka_Cluster', 'Elasticsearch', 'SS7_Firewall', 'SIEM_Wazuh', 'EDR_CrowdStrike'];
  const metricTypes = ['CPU', 'MEMORY', 'DISK', 'LATENCY', 'ERROR_RATE', 'THROUGHPUT'];
  const statuses = ['OK', 'WARNING', 'CRITICAL', 'UNKNOWN'];
  
  // Generate metrics for last 7 days
  const now = new Date();
  
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    
    for (const component of components) {
      for (const metricType of metricTypes) {
        // Generate 4-6 data points per day per component/metric
        const pointsPerDay = randomInt(3, 6);
        
        for (let p = 0; p < pointsPerDay; p++) {
          const hour = randomInt(0, 23);
          const recordedAt = new Date(dayStart.getTime() + hour * 3600000 + randomInt(0, 3599000));
          
          let value: number;
          let unit: string;
          let thresholdWarning: number;
          let thresholdCritical: number;
          let status: string;
          
          switch (metricType) {
            case 'CPU':
              value = Math.round((Math.random() * 60 + 20) * 100) / 100; // 20-80%
              unit = 'percent';
              thresholdWarning = 70;
              thresholdCritical = 90;
              break;
            case 'MEMORY':
              value = Math.round((Math.random() * 40 + 40) * 100) / 100; // 40-80%
              unit = 'percent';
              thresholdWarning = 75;
              thresholdCritical = 90;
              break;
            case 'DISK':
              value = Math.round((Math.random() * 30 + 40) * 100) / 100; // 40-70%
              unit = 'percent';
              thresholdWarning = 80;
              thresholdCritical = 95;
              break;
            case 'LATENCY':
              value = Math.round((Math.random() * 200 + 10) * 100) / 100; // 10-210ms
              unit = 'ms';
              thresholdWarning = 200;
              thresholdCritical = 500;
              break;
            case 'ERROR_RATE':
              value = Math.round(Math.random() * 5 * 100) / 100; // 0-5%
              unit = 'percent';
              thresholdWarning = 1;
              thresholdCritical = 5;
              break;
            case 'THROUGHPUT':
              value = Math.round((Math.random() * 9000 + 1000) * 100) / 100; // 1000-10000 req/s
              unit = 'requests_per_sec';
              thresholdWarning = 500;
              thresholdCritical = 200;
              break;
            default:
              value = 0;
              unit = '';
              thresholdWarning = 0;
              thresholdCritical = 0;
          }
          
          // Determine status based on thresholds
          if (value >= thresholdCritical) {
            status = 'CRITICAL';
          } else if (value >= thresholdWarning) {
            status = 'WARNING';
          } else {
            status = 'OK';
          }
          
          // Occasionally inject anomalies
          if (Math.random() > 0.95) {
            status = randomItem(['WARNING', 'CRITICAL']);
            value = thresholdWarning + (thresholdCritical - thresholdWarning) * Math.random();
          }
          
          const metric = await prisma.systemHealthMetric.create({
            data: {
              metricName: `${component}_${metricType.toLowerCase()}`,
              metricType,
              component,
              value: value.toString(),
              unit,
              thresholdWarning: thresholdWarning.toString(),
              thresholdCritical: thresholdCritical.toString(),
              status,
              recordedAt,
            },
          });
          metrics.push(metric);
        }
      }
    }
  }

  console.log(`   ✅ Created ${metrics.length} health metric points`);
  return metrics;
}

async function createTasks(incidents: any[], users: any[]) {
  const tasks = [];
  
  for (const incident of incidents.slice(0, 12)) {
    const numTasks = randomInt(2, 5);
    const assignees = users.filter(u => u.username !== 'leila_zerhouni'); // Exclude viewer
    
    for (let t = 0; t < numTasks; t++) {
      const taskTemplates = [
        { title: 'Initial triage and assessment', priority: 'CRITICAL', status: 'DONE' },
        { title: 'Scope and impact analysis', priority: 'HIGH', status: incident.phase === 'DETECTION' ? 'TODO' : 'DONE' },
        { title: 'Containment actions implementation', priority: 'CRITICAL', status: ['CONTAINMENT', 'ERADICATION'].includes(incident.phase) ? 'IN_PROGRESS' : 'TODO' },
        { title: 'Evidence collection and preservation', priority: 'HIGH', status: 'TODO' },
        { title: 'Root cause identification', priority: 'HIGH', status: incident.phase === 'ERADICATION' ? 'IN_PROGRESS' : 'TODO' },
        { title: 'Stakeholder notification', priority: 'MEDIUM', status: 'DONE' },
        { title: 'Technical remediation', priority: 'HIGH', status: 'TODO' },
        { title: 'Documentation and lessons learned', priority: 'LOW', status: 'TODO' },
        { title: 'Post-incident review scheduling', priority: 'MEDIUM', status: 'TODO' },
        { title: 'ARTP notification (if required)', priority: incident.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM', status: 'TODO' },
      ];
      
      const template = taskTemplates[t % taskTemplates.length];
      const assignee = assignees[t % assignees.length];
      
      const task = await prisma.task.create({
        data: {
          incidentId: incident.id,
          title: template.title,
          description: `Task for incident ${incident.tatcCode}: ${template.title.toLowerCase()}`,
          assigneeId: assignee.id,
          status: template.status as any,
          priority: template.priority as any,
          dueDate: new Date(Date.now() + randomInt(1, 7) * 24 * 60 * 60 * 1000),
          completedAt: template.status === 'DONE' ? new Date(Date.now() - randomInt(1, 3) * 24 * 60 * 60 * 1000) : null,
        },
      });
      tasks.push(task);
      await delay(5);
    }
  }

  console.log(`   ✅ Created ${tasks.length} tasks`);
  return tasks;
}

async function createTimelineEvents(incidents: any[], users: any[]) {
  const eventTypes = ['STATUS_CHANGE', 'NOTE', 'EVIDENCE_ADDED', 'ACTION_TAKEN', 'ESCALATION'];
  const adminUsers = users.filter(u => u.username.includes('admin') || u.username.includes('mehdi'));
  
  for (const incident of incidents) {
    const numEvents = randomInt(3, 8);
    
    for (let e = 0; e < numEvents; e++) {
      const eventType = eventTypes[e % eventTypes.length];
      const createdBy = adminUsers[e % adminUsers.length] || users[0];
      
      const titles: Record<string, string> = {
        STATUS_CHANGE: `Status changed to ${incident.status}`,
        NOTE: 'Investigation note added',
        EVIDENCE_ADDED: 'Evidence collected and attached',
        ACTION_TAKEN: 'Containment action executed',
        ESCALATION: 'Escalated to management',
      };
      
      const contents: Record<string, string> = {
        STATUS_CHANGE: `Incident ${incident.tatcCode} status updated to current state following standard procedures.`,
        NOTE: `Analysis progress: ${['Initial assessment complete', 'Additional logs requested', 'Waiting for vendor response', 'Coordination with legal team'][e % 4]}`,
        EVIDENCE_ADDED: `Attached ${['pcap files', 'screenshots', 'log extracts', 'memory dump'][e % 4]} for forensic analysis.`,
        ACTION_TAKEN: `Executed: ${['Account suspension', 'IP blocking', 'Service isolation', 'Password reset'][e % 4]}.`,
        ESCALATION: `Escalated due to ${['business impact', 'regulatory requirement', 'complexity', 'stakeholder request'][e % 4]}.`,
      };
      
      const eventTime = new Date(
        incident.createdAt.getTime() + 
        (e * ((Date.now() - incident.createdAt.getTime()) / numEvents)) +
        randomInt(0, 3600000)
      );
      
      await prisma.timelineEvent.create({
        data: {
          incidentId: incident.id,
          eventType,
          title: titles[eventType],
          content: contents[eventType],
          metadata: JSON.stringify({
            author: createdBy.name,
            method: 'manual',
          }),
          createdById: createdBy.id,
          createdAt: eventTime,
        },
      });
      await delay(5);
    }
  }

  console.log(`   ✅ Created timeline events for ${incidents.length} incidents`);
}

// Run the seed
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
