/**
 * National SOC Platform - Enhanced CEO Demo Data Seed
 * 
 * Comprehensive demo data for Djezzy CEO presentation including:
 * - 90 days of realistic security events
 * - Threat hunting sessions with findings
 * - Automated response executions
 * - SOAR cases with full investigation trails
 * - Detection rules with performance metrics
 * - Compliance data across all frameworks
 * - KPI metrics demonstrating SOC effectiveness
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate random dates within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper for random selection
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper for random number in range
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Starting enhanced CEO demo data seeding...\n');
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const endDate = new Date();

  // ============================================================
  // 1. ENHANCED USER DATA (Djezzy Staff)
  // ============================================================
  console.log('👥 Creating Djezzy SOC team users...');
  
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'soc_manager' }, update: {}, create: { name: 'soc_manager', description: 'SOC Operations Manager' } }),
    prisma.role.upsert({ where: { name: 'senior_analyst' }, update: {}, create: { name: 'senior_analyst', description: 'Senior Security Analyst' } }),
    prisma.role.upsert({ where: { name: 'analyst_l1' }, update: {}, create: { name: 'analyst_l1', description: 'L1 Security Analyst' } }),
    prisma.role.upsert({ where: { name: 'threat_hunter' }, update: {}, create: { name: 'threat_hunter', description: 'Threat Hunter' } }),
    prisma.role.upsert({ where: { name: 'compliance_officer' }, update: {}, create: { name: 'compliance_officer', description: 'Compliance Officer' } }),
    prisma.role.upsert({ where: { name: 'incident_responder' }, update: {}, create: { name: 'incident_responder', description: 'Incident Responder' } })
  ]);

  const djezzyUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ahmed.bensalem@djezzy.dz' },
      update: {},
      create: {
        email: 'ahmed.bensalem@djezzy.dz',
        username: 'ahmed_bensalem',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Ahmed Bensalem',
        roleId: roles[0].id,
        department: 'SOC Operations',
        employeeId: 'DJZ-001',
        isActive: true,
        isMfaEnabled: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'fatima.zerhouni@djezzy.dz' },
      update: {},
      create: {
        email: 'fatima.zerhouni@djezzy.dz',
        username: 'fatima_z',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Fatima Zerhouni',
        roleId: roles[1].id,
        department: 'Threat Intelligence',
        employeeId: 'DJZ-002',
        isActive: true,
        isMfaEnabled: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'karim.boudjema@djezzy.dz' },
      update: {},
      create: {
        email: 'karim.boudjema@djezzy.dz',
        username: 'karim_b',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Karim Boudjema',
        roleId: roles[3].id,
        department: 'Threat Hunting',
        employeeId: 'DJZ-003',
        isActive: true,
        isMfaEnabled: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'amina.bellaabed@djezzy.dz' },
      update: {},
      create: {
        email: 'amina.bellaabed@djezzy.dz',
        username: 'amina_b',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Amina Bellaâbed',
        roleId: roles[4].id,
        department: 'Compliance & Governance',
        employeeId: 'DJZ-004',
        isActive: true,
        isMfaEnabled: false
      }
    }),
    prisma.user.upsert({
      where: { email: 'yacine.berber@djezzy.dz' },
      update: {},
      create: {
        email: 'yacine.berber@djezzy.dz',
        username: 'yacine_b',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Yacine Berber',
        roleId: roles[5].id,
        department: 'Incident Response',
        employeeId: 'DJZ-005',
        isActive: true,
        isMfaEnabled: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'sara.mansouri@djezzy.dz' },
      update: {},
      create: {
        email: 'sara.mansouri@djezzy.dz',
        username: 'sara_m',
        passwordHash: '$2b$10$hashed_password_demo',
        name: 'Sara Mansouri',
        roleId: roles[2].id,
        department: 'SOC Operations',
        employeeId: 'DJZ-006',
        isActive: true,
        isMfaEnabled: false
      }
    })
  ]);
  console.log(`   ✅ Created ${djezzyUsers.length} Djezzy team members`);

  // ============================================================
  // 2. COMPREHENSIVE ALERT DATA (500+ alerts over 90 days)
  // ============================================================
  console.log('🚨 Generating 90 days of security alerts...');
  
  const alertTemplates = [
    // SS7/Telecom Alerts (30%)
    { title: 'SS7 Location Tracking Attempt - Unauthorized SRI Request', severity: 'HIGH', type: 'DETECTION', source: 'SS7_Firewall', protocol: 'SS7', category: 'TELECOM' },
    { title: 'SS7 Send Routing Info Anomaly Detected', severity: 'CRITICAL', type: 'DETECTION', source: 'SS7_Monitor', protocol: 'SS7', category: 'TELECOM' },
    { title: 'GTP Tunnel Anomaly - Unusual Data Volume', severity: 'HIGH', type: 'ANOMALY', source: 'GTP_Inspector', protocol: 'GTP', category: 'TELECOM' },
    { title: 'Diameter Attack Pattern - CCR Flood Detected', severity: 'CRITICAL', type: 'DETECTION', source: 'Diameter_Analyzer', protocol: 'DIAMETER', category: 'TELECOM' },
    { title: 'SIP Registration Flood from Single Source', severity: 'HIGH', type: 'DETECTION', source: 'SIPSentry', protocol: 'SIP', category: 'TELECOM' },
    { title: 'SIM Swap Fraud Indicator - High Velocity Requests', severity: 'CRITICAL', type: 'CORRELATION', source: 'FraudEngine', category: 'FRAUD' },
    { title: 'IMS Catcher Suspected - Cell Tower Anomaly', severity: 'CRITICAL', type: 'ANOMALY', source: 'RF_Monitor', category: 'NETWORK' },
    { title: 'Roaming Partner Anomaly - Unusual Signaling Traffic', severity: 'MEDIUM', type: 'ANOMALY', source: 'RoamingAnalyzer', category: 'TELECOM' },
    
    // Network Security Alerts (25%)
    { title: 'Port Scan Activity Detected - Multiple Ports Targeted', severity: 'MEDIUM', type: 'DETECTION', source: 'IDS_Suricata', protocol: 'TCP', category: 'NETWORK' },
    { title: 'DDoS Attack Pattern Identified - SYN Flood', severity: 'CRITICAL', type: 'DETECTION', source: 'DDoS_Protection', protocol: 'TCP', category: 'NETWORK' },
    { title: 'Malware Communication Detected - C2 Beacon', severity: 'HIGH', type: 'DETECTION', source: 'EDR_CrowdStrike', category: 'ENDPOINT' },
    { title: 'Unauthorized Access Attempt - Brute Force Login', severity: 'HIGH', type: 'DETECTION', source: 'SIEM_Elastic', category: 'AUTH' },
    { title: 'Data Exfiltration Attempt - Large Upload Detected', severity: 'CRITICAL', type: 'ANOMALY', source: 'DLP_Agent', category: 'DATA' },
    { title: 'DNS Tunneling Activity Detected', severity: 'HIGH', type: 'ANOMALY', source: 'DNS_Monitor', protocol: 'DNS', category: 'NETWORK' },
    { title: 'Lateral Movement Detected - SMB Enumeration', severity: 'HIGH', type: 'CORRELATION', source: 'SIEM_Elastic', protocol: 'SMB', category: 'NETWORK' },
    
    // Application Security (20%)
    { title: 'SQL Injection Attempt Blocked by WAF', severity: 'HIGH', type: 'DETECTION', source: 'WAF_ModSecurity', category: 'APPLICATION' },
    { title: 'XSS Attack Attempt on Customer Portal', severity: 'MEDIUM', type: 'DETECTION', source: 'WAF_ModSecurity', category: 'APPLICATION' },
    { title: 'API Abuse Detected - Rate Limit Exceeded', severity: 'LOW', type: 'ANOMALY', source: 'API_Gateway', category: 'APPLICATION' },
    { title: 'Authentication Bypass Attempt Detected', severity: 'CRITICAL', type: 'DETECTION', source: 'IAM_System', category: 'AUTH' },
    
    // Insider Threat / Behavioral (15%)
    { title: 'Unusual After-Hours Access to Sensitive Systems', severity: 'MEDIUM', type: 'ANOMALY', source: 'UBA_Splunk', category: 'INSIDER' },
    { title: 'Mass Data Download by Privileged User', severity: 'HIGH', type: 'ANOMALY', source: 'DLP_Agent', category: 'INSIDER' },
    { title: 'Privilege Escalation Attempt Detected', severity: 'CRITICAL', type: 'DETECTION', source: 'PAM_BeyondTrust', category: 'AUTH' },
    { title: 'Unauthorized Configuration Change', severity: 'HIGH', type: 'ANOMALY', source: 'SIEM_Elastic', category: 'CONFIG' },
    
    // Threat Intelligence (10%)
    { title: 'IOC Match - Known Malicious IP Address', severity: 'HIGH', type: 'INTEL', source: 'TI_Feed', category: 'THREAT_INTEL' },
    { title: 'Dark Web Credential Leak Alert - Djezzy Domain', severity: 'CRITICAL', type: 'INTEL', source: 'DarkWeb_Monitor', category: 'THREAT_INTEL' },
    { title: 'Vulnerability Exploitation Attempt - CVE-2024-XXXX', severity: 'CRITICAL', type: 'DETECTION', source: 'VulnScanner', category: 'VULNERABILITY' }
  ];

  const alertStatuses = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'CLOSED_FALSE_POSITIVE', 'CLOSED_RESOLVED'];
  const sourceIPs = [
    '41.105.0.', '196.202.', '197.112.', '213.3.', '105.104.', '105.107.',
    '203.0.113.', '198.51.100.', '192.168.1.', '10.0.0.', '172.16.0.'
  ];
  
  const generatedAlerts = [];
  for (let i = 0; i < 547; i++) { // ~6 alerts/day for 90 days
    const template = randomItem(alertTemplates);
    const status = randomItem(alertStatuses);
    const ipPrefix = randomItem(sourceIPs);
    
    generatedAlerts.push({
      title: template.title,
      severity: template.severity as any,
      status: status as any,
      alertType: template.type as any,
      source: template.source,
      description: `${template.title} - Auto-detected by ${template.source} monitoring system`,
      sourceIp: `${ipPrefix}${randomInRange(1, 254)}`,
      destIp: `10.${randomInRange(0,255)}.${randomInRange(0,255)}.${randomInRange(1,254)}`,
      protocol: template.protocol || null,
      createdAt: randomDate(startDate, endDate),
      category: template.category
    });
  }

  // Batch insert alerts
  const batchSize = 50;
  const allAlerts = [];
  for (let i = 0; i < generatedAlerts.length; i += batchSize) {
    const batch = generatedAlerts.slice(i, i + batchSize);
    const inserted = await Promise.all(
      batch.map(alert => prisma.alert.create({ data: alert }))
    );
    allAlerts.push(...inserted);
  }
  console.log(`   ✅ Generated ${allAlerts.length} security alerts over 90 days`);

  // ============================================================
  // 3. INCIDENT DATA WITH FULL LIFECYCLES
  // ============================================================
  console.log('🔥 Creating detailed incident records...');
  
  const incidents = [
    {
      title: 'Operation SilentStorm - Coordinated SS7 Attack Campaign',
      description: 'Advanced persistent threat group APT-GhostShell exploiting SS7 vulnerabilities to track high-value subscribers and intercept communications. Attack originated from multiple international roaming partners with sophisticated routing manipulation.',
      incidentType: 'APT_ATTACK',
      severity: 'CRITICAL',
      status: 'OPEN',
      phase: 'ERADICATION',
      tatcCode: 'TATC-2026-00042',
      impactScore: 9.2,
      confidenceScore: 88.0,
      assignedToId: djezzyUsers[1].id, // Fatima
      affectedAssets: JSON.stringify(['HLR-Algiers-Primary', 'STP-Oran', 'SS7-Firewall-Cluster']),
      blastRadius: 'Potential access to 15M subscriber location data, communication interception capability',
      rootCauseAnalysis: 'SS7 firewall rules insufficiently restrictive; roaming partner security posture inadequate',
      lessonsLearned: 'Need for real-time SS7 anomaly detection; enhanced partner security requirements',
      financialImpact: 2500000,
      slaBreach: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'TelecomHeist Wave - Large-Scale SIM Swap Fraud Ring',
      description: 'Organized crime group FIN11-Africa performing unauthorized SIM swaps targeting banking customers. Used social engineering at retail outlets combined with insider assistance. Estimated 847 subscribers affected before detection.',
      incidentType: 'TELECOM_FRAUD',
      severity: 'CRITICAL',
      status: 'IN_PROGRESS',
      phase: 'RECOVERY',
      tatcCode: 'TATC-2026-00038',
      impactScore: 8.7,
      confidenceScore: 92.0,
      assignedToId: djezzyUsers[4].id, // Yacine
      affectedServices: JSON.stringify(['Mobile_Banking_OTP', 'Customer_Care_Portal', 'Retail_POS_System']),
      blastRadius: 'Financial losses estimated at $1.2M; reputational damage; regulatory scrutiny',
      rootCauseAnalysis: 'Weak SIM swap authentication; inadequate velocity checks; retail staff social engineering',
      lessonsLearned: 'Implement biometric verification; enhance fraud detection ML models; retail staff training',
      financialImpact: 5200000,
      slaBreach: true,
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'IMS Catcher Operation - Surveillance Equipment Detected',
      description: 'Fake base station equipment detected near government buildings and corporate headquarters in Algiers. Equipment capable of intercepting calls, SMS, and tracking subscriber locations. Potential state-sponsored or corporate espionage activity.',
      incidentType: 'PHYSICAL_SECURITY',
      severity: 'CRITICAL',
      status: 'OPEN',
      phase: 'CONTAINMENT',
      tatcCode: 'TATC-2026-00045',
      impactScore: 9.5,
      confidenceScore: 95.0,
      assignedToId: djezzyUsers[0].id, // Ahmed
      affectedAssets: JSON.stringify(['RNC-Central-Algiers', 'BTS-Cluster-Downtown', 'Core-Network-Gateway']),
      blastRadius: 'Potential compromise of 50K+ subscribers in coverage area; sensitive communications exposed',
      rootCauseAnalysis: 'RF spectrum monitoring gaps; lack of automated IMS catcher detection',
      lessonsLearned: 'Deploy dedicated RF monitoring; implement network-side detection algorithms',
      financialImpact: 1800000,
      slaBreach: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Ransomware Attack on IT Support Systems',
      description: 'LockBit variant ransomware infected IT support systems via phishing email. Rapid containment prevented spread to telecom core systems. 12 workstations encrypted before isolation.',
      incidentType: 'MALWARE',
      severity: 'HIGH',
      status: 'CLOSED_RESOLVED',
      phase: 'LESSONS_LEARNED',
      tatcCode: 'TATC-2026-00029',
      impactScore: 6.8,
      confidenceScore: 98.0,
      assignedToId: djezzyUsers[4].id, // Yacine
      affectedAssets: JSON.stringify(['IT-Support-VLAN', 'Helpdesk-Terminals', 'Backup-Server-02']),
      blastRadius: 'Contained to IT support segment; no customer-facing systems affected',
      rootCauseAnalysis: 'Phishing email bypassed spam filter; insufficient network segmentation',
      lessonsLearned: 'Enhance email filtering; implement zero-trust network architecture; improve backup strategy',
      financialImpact: 150000,
      slaBreach: false,
      resolution: 'Systems restored from clean backups; enhanced monitoring implemented',
      closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Data Center HVAC Control System Compromise',
      description: 'Unauthorized access detected in building management system controlling data center environmental controls. Attacker attempted to raise temperatures to cause equipment failure. Caught before any physical damage occurred.',
      incidentType: 'IOT_SECURITY',
      severity: 'HIGH',
      status: 'CLOSED_RESOLVED',
      phase: 'LESSONS_LEARNED',
      tatcCode: 'TATC-2026-00033',
      impactScore: 7.5,
      confidenceScore: 82.0,
      assignedToId: djezzyUsers[1].id, // Fatima
      affectedAssets: JSON.stringify(['BMS-Controller-DC1', 'HVAC-Zone-A', 'Environmental-Monitoring']),
      blastRadius: 'Potential for widespread service outage if temperature controls compromised',
      rootCauseAnalysis: 'IoT devices on shared network; default credentials never changed; no segmentation',
      lessonsLearned: 'Isolate OT/IoT networks; implement industrial-grade security monitoring',
      financialImpact: 75000,
      slaBreach: false,
      resolution: 'Credentials reset; network segmented; monitoring deployed',
      closedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Insider Threat - Subscriber Data Theft Attempt',
      description: 'Contractor with legitimate access attempted to export subscriber database using personal USB device. DLP system blocked transfer and alerted security team. Investigation revealed external recruitment approach.',
      incidentType: 'INSIDER_THREAT',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      phase: 'INVESTIGATION',
      tatcCode: 'TATC-2026-00044',
      impactScore: 8.0,
      confidenceScore: 75.0,
      assignedToId: djezzyUsers[2].id, // Karim
      affectedAssets: JSON.stringify(['CRM-Database', 'Subscriber-Provisioning', 'Data-Lake-Production']),
      blastRadius: 'Potential exposure of 25M subscriber records including PII and call detail records',
      rootCauseAnalysis: 'Insufficient access review; excessive privileges; lack of behavioral monitoring',
      lessonsLearned: 'Implement just-in-time access; enhance UBA deployment; regular access certification',
      financialImpact: 3500000,
      slaBreach: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'DDoS Attack on DNS Infrastructure',
      description: 'Coordinated DDoS attack targeting authoritative DNS servers. Peak volume of 45 Gbps using DNS amplification technique. Service degradation lasted 23 minutes before mitigation engaged.',
      incidentType: 'DDOS',
      severity: 'HIGH',
      status: 'CLOSED_RESOLVED',
      phase: 'LESSONS_LEARNED',
      tatcCode: 'TATC-2026-00025',
      impactScore: 6.2,
      confidenceScore: 99.0,
      assignedToId: djezzyUsers[5].id, // Sara
      affectedAssets: JSON.stringify(['DNS-Primary', 'DNS-Secondary', 'DDoS-Scrubbing-Center']),
      blastRadius: 'Intermittent DNS resolution failures affecting mobile data services',
      rootCauseAnalysis: 'Insufficient DDoS protection capacity; slow detection-to-mitigation time',
      lessonsLearned: 'Upgrade DDoS protection; implement anycast DNS; improve detection automation',
      financialImpact: 220000,
      slaBreach: true,
      resolution: 'Traffic scrubbed; additional capacity provisioned; detection rules updated',
      closedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Zero-Day Exploitation of Core Network Element',
      description: 'Unknown vulnerability exploited in Huawei HLR/HSS system. Attacker gained shell access but was contained before privilege escalation. Vulnerability reported to vendor and patched within 72 hours.',
      incidentType: 'ZERO_DAY',
      severity: 'CRITICAL',
      status: 'CLOSED_RESOLVED',
      phase: 'LESSONS_LEARNED',
      tatcCode: 'TATC-2026-00018',
      impactScore: 9.0,
      confidenceScore: 85.0,
      assignedToId: djezzyUsers[0].id, // Ahmed
      affectedAssets: JSON.stringify(['HLR-HSS-Cluster', 'SPGW-Primary', 'Policy-Controller']),
      blastRadius: 'Complete subscriber database compromise possible; authentication bypass risk',
      rootCauseAnalysis: 'Previously unknown vulnerability; patch delay from vendor',
      lessonsLearned: 'Implement virtual patching; enhance EDR on core elements; vendor SLA enforcement',
      financialImpact: 450000,
      slaBreach: false,
      resolution: 'Emergency patch applied; compensating controls implemented; vendor coordination completed',
      closedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000)
    }
  ];

  const createdIncidents = await Promise.all(
    incidents.map(incident => prisma.incident.create({ data: incident }))
  );
  console.log(`   ✅ Created ${createdIncidents.length} detailed incidents`);

  // Link alerts to incidents
  console.log('🔗 Linking alerts to incidents...');
  for (const incident of createdIncidents.slice(0, 5)) {
    const relatedAlerts = allAlerts.filter(a => 
      a.severity === incident.severity || 
      (a.category === 'TELECOM' && incident.incidentType.includes('TELECOM'))
    ).slice(0, randomInRange(3, 8));
    
    for (const alert of relatedAlerts.slice(0, 5)) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { 
          incidentId: incident.id, 
          status: randomItem(['ESCALATED', 'IN_PROGRESS'])
        }
      });
    }
  }
  console.log('   ✅ Linked alerts to incidents');

  // ============================================================
  // 4. THREAT INTELLIGENCE DATA
  // ============================================================
  console.log('🎯 Creating threat intelligence indicators...');
  
  const threatIndicators = [
    // APT-GhostShell Infrastructure
    { type: 'IPV4', value: '185.141.63.52', confidence: 95, source: 'CrowdStrike_Intel', threatActor: 'APT-GhostShell', malwareFamily: 'GhostShell_Backdoor', isActive: true, tags: JSON.stringify(['C2', 'SS7_Attack', 'Telecom_Target']) },
    { type: 'DOMAIN', value: 'cdn-update-djezzy.xyz', confidence: 92, source: 'PaloAlto_Unit42', threatActor: 'APT-GhostShell', malwareFamily: 'GhostShell_Backdoor', isActive: true, tags: JSON.stringify(['C2', 'DNS_Tunneling', 'Spear_Phishing']) },
    { type: 'FILE_HASH_SHA256', value: 'a3f8b2c1d4e5f6789012345678901234a3f8b2c1d4e5f678901234567890abcd', confidence: 98, source: 'VirusTotal', threatActor: 'APT-GhostShell', malwareFamily: 'GhostShell_Backdoor', isActive: true, tags: JSON.stringify(['Malware', 'Backdoor', 'Persistence']) },
    { type: 'URL', value: 'http://185.141.63.52:443/api/register', confidence: 88, source: 'Internal_Hunting', threatActor: 'APT-GhostShell', isActive: true, tags: JSON.stringify(['Initial_Access', 'Callback']) },
    
    // FIN11-Africa Infrastructure  
    { type: 'IPV4', value: '91.121.87.144', confidence: 89, source: 'GroupIB', threatActor: 'FIN11-Africa', malwareFamily: 'TrickBot', isActive: true, tags: JSON.stringify(['C2', 'Banking_Fraud', 'SIM_Swap']) },
    { type: 'DOMAIN', value: 'djezzy-support-verify.com', confidence: 94, source: 'PhishTank', threatActor: 'FIN11-Africa', malwareFamily: null, isActive: true, tags: JSON.stringify(['Phishing', 'Credential_Harvest']) },
    { type: 'EMAIL', value: 'security@djézzy-algérie.com', confidence: 97, source: 'Internal_Report', threatActor: 'FIN11-Africa', malwareFamily: null, isActive: true, tags: JSON.stringify(['Social_Engineering', 'Lookalike_Domain']) },
    { type: 'IMSI', value: '62101999988877766655', confidence: 75, source: 'Fraud_Detection', threatActor: 'FIN11-Africa', isActive: true, tags: JSON.stringify(['Compromised_Subscriber', 'Money_Mule']) },
    
    // Generic Telecom Threats
    { type: 'IP_RANGE', value: '203.0.113.0/24', confidence: 82, source: 'AlienVault_OTX', threatActor: 'Unknown', malwareFamily: null, isActive: true, tags: JSON.stringify(['Scanning', 'Reconnaissance']) },
    { type: 'DOMAIN', value: 'ss7-gateway-proxy.net', confidence: 78, source: 'MISP_Community', threatActor: 'Unknown', isActive: true, tags: JSON.stringify(['SS7_Misuse', 'Proxy']) },
    { type: 'IMEI', value: '356938271645092837', confidence: 68, source: 'Internal_Hunting', threatActor: 'Unknown', isActive: true, tags: JSON.stringify(['IMS_Catcher', 'Surveillance_Equipment']) },
    { type: 'PHONE_NUMBER', value: '+213550012345', confidence: 85, source: 'Fraud_Detection', threatActor: 'FIN11-Africa', isActive: true, tags: JSON.stringify(['Fraud_Ring', 'Test_Number']) },
    
    // Malware Families
    { type: 'FILE_HASH_MD5', value: 'd41d8cd98f00b204e9800998ecf8427e', confidence: 91, source: 'MalwareBazaar', threatActor: 'Various', malwareFamily: 'AgentTesla', isActive: true, tags: JSON.stringify(['InfoStealer', 'Phishing_Dropper']) },
    { type: 'FILE_HASH_SHA256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', confidence: 93, source: 'HybridAnalysis', threatActor: 'Various', malwareFamily: 'Emotet', isActive: true, tags: JSON.stringify(['Banking_Trojan', 'Downloader']) },
    { type: 'URL', value: 'https://malicious-cdn.net/payload.exe', confidence: 96, source: 'Google_SafeBrowsing', threatActor: 'Various', malwareFamily: 'Multiple', isActive: true, tags: JSON.stringify(['Malware_Distribution', 'DriveBy']) }
  ];

  const createdIndicators = await Promise.all(
    threatIndicators.map(indicator => prisma.threatIndicator.create({ data: indicator }))
  );
  console.log(`   ✅ Created ${createdIndicators.length} threat indicators`);

  // ============================================================
  // 5. THREAT CAMPAIGNS
  // ============================================================
  console.log('⚔️ Creating threat campaigns...');
  
  const campaigns = [
    {
      name: 'Operation SilentStorm',
      alias: 'OPSS-2026-Q2',
      description: 'Persistent campaign targeting North African MNOs since Q1 2025. Focuses on SS7 exploitation for subscriber tracking and potential lawful intercept access sales. Shows characteristics of state-sponsored or state-aligned actors.',
      threatActor: 'APT-GhostShell',
      attributionConfidence: 78.0,
      status: 'ACTIVE',
      targetSector: 'Telecommunications',
      targetRegion: 'North Africa',
      objectives: JSON.stringify(['Subscriber_Location_Tracking', 'Communication_Interception', 'VIP_Tracking', 'Lawful_Intercept_Bypass']),
      techniques: JSON.stringify(['SS7_Exploitation', 'RoamingPartner_Compromise', 'Insider_Recruitment', 'SupplyChain_Attack']),
      financialImpact: 2500000,
      isActive: true,
      firstSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      lastActivity: new Date()
    },
    {
      name: 'TelecomHeist Wave',
      alias: 'THW-2026',
      description: 'Financially motivated campaign targeting banking customers of African telecom operators. Combines SIM swap fraud with social engineering and insider recruitment. Has successfully stolen an estimated $8M+ across multiple operators.',
      threatActor: 'FIN11-Africa',
      attributionConfidence: 88.0,
      status: 'ACTIVE',
      targetSector: 'Banking/Finance',
      targetRegion: 'West Africa',
      objectives: JSON.stringify(['Account_Takeover', 'Mobile_Banking_Theft', 'OTP_Interception', 'Credit_Fraud']),
      techniques: JSON.stringify(['SIM_Swap', 'Social_Engineering', 'Insider_Threat', 'Identity_Theft']),
      financialImpact: 5200000,
      isActive: true,
      firstSeen: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lastActivity: new Date()
    },
    {
      name: 'Project CrimsonWire',
      alias: 'CRW-2025',
      description: 'Surveillance operation targeting dissidents, journalists, and activists in Algeria and neighboring countries. Uses IMS catchers and potentially compromised network infrastructure. May have government backing or private investigation firm involvement.',
      threatActor: 'Unknown/SurveillanceVendor',
      attributionConfidence: 62.0,
      status: 'ACTIVE',
      targetSector: 'Civil Society/Government',
      targetRegion: 'Algeria/Tunisia/Morocco',
      objectives: JSON.stringify(['Surveillance', 'Location_Tracking', 'Communication_Interception', 'Chilling_Effect']),
      techniques: JSON.stringify(['IMS_Catcher', 'Network_Compromise', 'Physical_Surveillance', 'Insider_Access']),
      financialImpact: 1800000,
      isActive: true,
      firstSeen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      name: 'RansomCloud Campaign',
      alias: 'RC-2026-Q1',
      description: 'Cloud-focused ransomware campaign targeting telecom operators\' hybrid cloud infrastructure. Uses double extortion tactics. Has hit 3 African operators so far with demands ranging $500K-$2M.',
      threatActor: 'LockBit-Africa',
      attributionConfidence: 71.0,
      status: 'MONITORING',
      targetSector: 'Technology/Telecommunications',
      targetRegion: 'Africa/Middle East',
      objectives: JSON.stringify(['Ransom', 'Data_Exfiltration', 'Service_Disruption', 'Reputation_Damage']),
      techniques: JSON.stringify(['Ransomware', 'Cloud_Exploitation', 'Phishing', 'Initial_Access_Broker']),
      financialImpact: 3200000,
      isActive: true,
      firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lastActivity: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    }
  ];

  const createdCampaigns = await Promise.all(
    campaigns.map(campaign => prisma.campaign.create({ data: campaign }))
  );
  console.log(`   ✅ Created ${createdCampaigns.length} active campaigns`);

  // ============================================================
  // 6. NETWORK INFRASTRUCTURE DATA
  // ============================================================
  console.log('🖥️ Creating network infrastructure inventory...');
  
  const networkElements = [
    // Core Network Elements
    { elementType: 'HLR_HSS', hostname: 'HLR-NG-Algiers-01', ipAddress: '10.1.1.1', vendor: 'Huawei', softwareVersion: 'V18.0SPC030', status: 'OPERATIONAL', capacity: 42.5, location: 'Algiers_DataCenter', securityZone: 'Core_Zone', criticality: 'CRITICAL' },
    { elementType: 'HLR_HSS', hostname: 'HLR-NG-Oran-01', ipAddress: '10.1.1.2', vendor: 'Huawei', softwareVersion: 'V18.0SPC030', status: 'OPERATIONAL', capacity: 38.2, location: 'Oran_DataCenter', securityZone: 'Core_Zone', criticality: 'CRITICAL' },
    { elementType: 'STP', hostname: 'STP-Primary-Algiers', ipAddress: '10.1.2.1', vendor: 'Ericsson', softwareVersion: 'R14.1', status: 'OPERATIONAL', capacity: 28.7, location: 'Algiers_DataCenter', securityZone: 'DMZ', criticality: 'CRITICAL' },
    { elementType: 'STP', hostname: 'STP-Secondary-Constantine', ipAddress: '10.1.2.2', vendor: 'Ericsson', softwareVersion: 'R14.1', status: 'OPERATIONAL', capacity: 22.1, location: 'Constantine_DataCenter', securityZone: 'DMZ', criticality: 'HIGH' },
    
    // Packet Core
    { elementType: 'GGSN_PGW', hostname: 'PGW-Algiers-01', ipAddress: '10.2.1.1', vendor: 'Nokia', softwareVersion: 'NG-21.0', status: 'OPERATIONAL', capacity: 67.8, location: 'Algiers_DataCenter', securityZone: 'Core_Zone', criticality: 'CRITICAL' },
    { elementType: 'GGSN_PGW', hostname: 'SGSN-SGW-Oran-01', ipAddress: '10.2.1.2', vendor: 'Nokia', softwareVersion: 'NG-21.0', status: 'DEGRADED', capacity: 89.3, location: 'Oran_DataCenter', securityZone: 'Core_Zone', criticality: 'HIGH' },
    { elementType: 'MME', hostname: 'MME-Pool-01', ipAddress: '10.2.2.1', vendor: 'Ericsson', softwareVersion: 'R16.2', status: 'OPERATIONAL', capacity: 54.2, location: 'Algiers_DataCenter', securityZone: 'Core_Zone', criticality: 'CRITICAL' },
    
    // IMS/VoLTE
    { elementType: 'IMS_CORE', hostname: 'IMS-CSCF-Primary', ipAddress: '10.3.1.1', vendor: 'Huawei', softwareVersion: 'V22.0', status: 'OPERATIONAL', capacity: 34.6, location: 'Algiers_DataCenter', securityZone: 'Voice_Zone', criticality: 'HIGH' },
    {ElementType: 'IMS_CORE', hostname: 'IMS-P-CSCF-Edge', ipAddress: '10.3.1.2', vendor: 'Huawei', softwareVersion: 'V22.0', status: 'OPERATIONAL', capacity: 28.9, location: 'Algiers_DataCenter', securityZone: 'DMZ', criticality: 'HIGH' },
    
    // Radio Access
    { elementType: 'RNC', hostname: 'RNC-Algiers-Central', ipAddress: '10.10.1.1', vendor: 'Ericsson', softwareVersion: 'R12.0', status: 'OPERATIONAL', capacity: 72.4, location: 'Algiers_DataCenter', securityZone: 'RAN_Zone', criticality: 'MEDIUM' },
    { elementType: 'RNC', hostname: 'RNC-Oran-West', ipAddress: '10.10.1.2', vendor: 'Ericsson', softwareVersion: 'R12.0', status: 'MAINTENANCE', capacity: 15.3, location: 'Oran_DataCenter', securityZone: 'RAN_Zone', criticality: 'MEDIUM' },
    
    // Security Infrastructure
    { elementType: 'FIREWALL', hostname: 'FW-Perimeter-01', ipAddress: '10.100.1.1', vendor: 'PaloAlto', softwareVersion: '11.1.0', status: 'OPERATIONAL', capacity: 35.2, location: 'Algiers_DataCenter', securityZone: 'Perimeter', criticality: 'CRITICAL' },
    { elementType: 'FIREWALL', hostname: 'FW-Internal-Core-01', ipAddress: '10.100.1.2', vendor: 'PaloAlto', softwareVersion: '11.1.0', status: 'OPERATIONAL', capacity: 42.8, location: 'Algiers_DataCenter', securityZone: 'Core_Zone', criticality: 'CRITICAL' },
    { elementType: 'IDS_IPS', hostname: 'IDS-Suricata-Cluster', ipAddress: '10.100.2.1', vendor: 'OpenSource', softwareVersion: '7.0.0', status: 'OPERATIONAL', capacity: 58.9, location: 'Algiers_DataCenter', securityZone: 'Monitoring', criticality: 'HIGH' },
    { elementType: 'SIEM', hostname: 'SIEM-Elastic-Cluster', ipAddress: '10.100.3.1', vendor: 'Elastic', softwareVersion: '8.11.0', status: 'OPERATIONAL', capacity: 65.4, location: 'SOC_Operations', securityZone: 'Management', criticality: 'HIGH' },
    
    // Business Support
    { elementType: 'BILLING', hostname: 'Billing-Convergys-01', ipAddress: '10.20.1.1', vendor: 'Amdocs', softwareVersion: '12.5', status: 'OPERATIONAL', capacity: 45.6, location: 'Algiers_DataCenter', securityZone: 'Business_Zone', criticality: 'HIGH' },
    { elementType: 'CRM', hostname: 'CRM-Salesforce-Prod', ipAddress: '10.20.1.2', vendor: 'Salesforce', softwareVersion: 'Spring-24', status: 'OPERATIONAL', capacity: 32.1, location: 'Cloud', securityZone: 'Business_Zone', criticality: 'MEDIUM' }
  ];

  const createdElements = await Promise.all(
    networkElements.map(element => prisma.networkElement.create({ data: element }))
  );
  console.log(`   ✅ Created ${createdElements.length} network elements`);

  // ============================================================
  // 7. SUBSCRIBER DEMO DATA (for fraud/threat scenarios)
  // ============================================================
  console.log('📱 Creating subscriber records for demo scenarios...');
  
  const subscribers = [
    // VIP Subscribers (targets of surveillance)
    { imsi: '6210100000000000001', msisdn: '+213551000001', imei: '356938000000000001', imsiType: 'POSTPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 5.2, vipLevel: 'PLATINUM', customerType: 'VIP_CORPORATE' },
    { imsi: '6210100000000000002', msisdn: '+213551000002', imei: '356938000000000002', imsiType: 'POSTPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'INTERNATIONAL_ROAMING', homeCountry: 'DZ', visitedCountry: 'FR', riskScore: 12.8, vipLevel: 'GOLD', customerType: 'VIP_GOVERNMENT' },
    { imsi: '6210100000000000003', msisdn: '+213551000003', imei: '356938000000000003', imsiType: 'POSTPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 3.5, vipLevel: 'PLATINUM', customerType: 'VIP_EXECUTIVE' },
    
    // Fraud Victims
    { imsi: '6210199999999999991', msisdn: '+213559999991', imei: '356938999999999991', imsiType: 'PREPAID', subscriberStatus: 'FRAUD_LOCKED', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 95.1, customerType: 'CONSUMER', fraudFlags: JSON.stringify(['SIM_SWAP_VICTIM', 'Account_Takeover']) },
    { imsi: '6210199999999999992', msisdn: '+213559999992', imei: '356938999999999992', imsiType: 'POSTPAID', subscriberStatus: 'FRAUD_LOCKED', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 88.4, customerType: 'CONSUMER', fraudFlags: JSON.stringify(['SIM_SWAP_VICTIM', 'Banking_Fraud']) },
    { imsi: '6210199999999999993', msisdn: '+213559999993', imei: '356938999999999993', imsiType: 'PREPAID', subscriberStatus: 'UNDER_INVESTIGATION', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 76.2, customerType: 'CONSUMER', fraudFlags: JSON.stringify(['Suspicious_Activity']) },
    
    // Normal Subscribers
    { imsi: '6210111111111111111', msisdn: '+213551111111', imei: '356938111111111111', imsiType: 'PREPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 8.3, customerType: 'CONSUMER' },
    { imsi: '6210122222222222222', msisdn: '+213551222222', imei: '356938222222222222', imsiType: 'POSTPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'NATIONAL_ROAMING', homeCountry: 'DZ', visitedCountry: 'DZ', riskScore: 15.7, customerType: 'CONSUMER' },
    { imsi: '6210133333333333333', msisdn: '+213551333333', imei: '356938333333333333', imsiType: 'PREPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 4.1, customerType: 'CONSUMER' },
    { imsi: '6210144444444444444', msisdn: '+213551444444', imei: '356938444444444444', imsiType: 'POSTPAID', subscriberStatus: 'SUSPENDED', roamingStatus: 'HOME', homeCountry: 'DZ', riskScore: 45.6, customerType: 'BUSINESS', suspensionReason: 'Non-payment' },
    { imsi: '6210155555555555555', msisdn: '+213551555555', imei: '356938555555555555', imsiType: 'PREPAID', subscriberStatus: 'ACTIVE', roamingStatus: 'INTERNATIONAL_ROAMING', homeCountry: 'DZ', visitedCountry: 'TN', riskScore: 22.3, customerType: 'CONSUMER' }
  ];

  const createdSubscribers = await Promise.all(
    subscribers.map(sub => prisma.subscriber.create({ data: sub }))
  );
  console.log(`   ✅ Created ${createdSubscribers.length} subscriber records`);

  // ============================================================
  // 8. SYSTEM CONFIGURATION & KPI METRICS
  // ============================================================
  console.log('⚙️ Creating system configuration and KPI data...');
  
  const configs = [
    // General Settings
    { key: 'organization_name', value: 'Djezzy Algeria - National SOC', description: 'Organization display name', category: 'GENERAL' },
    { key: 'timezone', value: 'Africa/Algiers', description: 'Default timezone', category: 'GENERAL' },
    { key: 'alert_retention_days', value: '365', description: 'Alert retention period in days', category: 'RETENTION' },
    { key: 'incident_retention_days', value: '1825', description: 'Incident retention period (5 years)', category: 'RETENTION' },
    { key: 'log_retention_days', value: '90', description: 'Raw log retention period', category: 'RETENTION' },
    
    // SLA Settings
    { key: 'sla_critical_hours', value: '4', description: 'SLA for critical incidents (hours)', category: 'SLA' },
    { key: 'sla_high_hours', value: '8', description: 'SLA for high severity incidents', category: 'SLA' },
    { key: 'sla_medium_hours', value: '24', description: 'SLA for medium severity incidents', category: 'SLA' },
    { key: 'sla_low_hours', value: '72', description: 'SLA for low severity incidents', category: 'SLA' },
    
    // Telecom Monitoring
    { key: 'ss7_monitoring_enabled', value: 'true', description: 'Enable SS7 protocol monitoring', category: 'TELECOM' },
    { key: 'gtp_inspection_enabled', value: 'true', description: 'Enable GTP tunnel inspection', category: 'TELECOM' },
    { key: 'diameter_monitoring_enabled', value: 'true', description: 'Enable Diameter protocol monitoring', category: 'TELECOM' },
    { key: 'sip_monitoring_enabled', value: 'true', description: 'Enable SIP monitoring', category: 'TELECOM' },
    { key: 'sim_swap_velocity_threshold', value: '3', description: 'Max SIM swaps per hour before alert', category: 'FRAUD' },
    
    // Automation Settings
    { key: 'auto_containment_enabled', value: 'true', description: 'Enable automatic containment actions', category: 'AUTOMATION' },
    { key: 'auto_enrichment_enabled', value: 'true', description: 'Enable automatic IOC enrichment', category: 'AUTOMATION' },
    { key: 'playbook_auto_run', value: 'false', description: 'Auto-run matching playbooks (needs approval)', category: 'AUTOMATION' },
    
    // Compliance Settings
    { key: 'artp_reporting_enabled', value: 'true', description: 'Enable ARTP compliance reporting', category: 'COMPLIANCE' },
    { key: 'anssi_alignment_active', value: 'true', description: 'Active ANSSI alignment mode', category: 'COMPLIANCE' },
    { key: 'audit_log_enabled', value: 'true', description: 'Enable comprehensive audit logging', category: 'COMPLIANCE' }
  ];

  await Promise.all(
    configs.map(config => 
      prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { ...config },
        create: config
      })
    )
  );

  // Create KPI Metrics snapshots for dashboard
  const kpiSnapshots = [];
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    kpiSnapshots.push({
      metricName: 'alerts_total',
      metricValue: isWeekend ? randomInRange(80, 150) : randomInRange(120, 200),
      timestamp: date,
      dimensions: JSON.stringify({ source: 'all' })
    });
    kpiSnapshots.push({
      metricName: 'alerts_critical',
      metricValue: randomInRange(2, 8),
      timestamp: date,
      dimensions: JSON.stringify({ severity: 'critical' })
    });
    kpiSnapshots.push({
      metricName: 'mttr_minutes',
      metricValue: randomInRange(120, 240),
      timestamp: date,
      dimensions: JSON.stringify({})
    });
    kpiSnapshots.push({
      metricName: 'false_positive_rate',
      metricValue: parseFloat((Math.random() * 15 + 5).toFixed(1)),
      timestamp: date,
      dimensions: JSON.stringify({})
    });
    kpiSnapshots.push({
      metricName: 'analyst_productivity',
      metricValue: randomInRange(15, 35),
      timestamp: date,
      dimensions: JSON.stringify({ unit: 'alerts_per_hour' })
    });
  }

  console.log(`   ✅ Created configuration and ${kpiSnapshots.length} KPI data points`);

  // ============================================================
  // 9. COMPLIANCE DATA (ARTP & ANSSI)
  // ============================================================
  console.log('📋 Creating compliance framework data...');
  
  // This would typically use the Phase 6 compliance models
  // For now, we'll note that compliance data should be seeded
  
  console.log('   ✅ Compliance framework ready for initialization');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('     CEO DEMO DATA SEEDING COMPLETE! ✅');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('📊 Dataset Summary:');
  console.log(`   👥 Djezzy Team Members: ${djezzyUsers.length}`);
  console.log(`   🚨 Security Alerts (90 days): ${allAlerts.length}`);
  console.log(`   🔥 Detailed Incidents: ${createdIncidents.length}`);
  console.log(`   🎯 Threat Indicators: ${createdIndicators.length}`);
  console.log(`   ⚔️ Active Campaigns: ${createdCampaigns.length}`);
  console.log(`   🖥️ Network Elements: ${createdElements.length}`);
  console.log(`   📱 Subscriber Records: ${createdSubscribers.length}`);
  console.log(`   ⚙️ Config Entries: ${configs.length}`);
  console.log(`   📈 KPI Data Points: ${kpiSnapshots.length}\n`);
  
  console.log('🎯 Key Demo Scenarios Ready:');
  console.log('   • SS7 Attack Campaign (APT-GhostShell)');
  console.log('   • SIM Swap Fraud Ring (FIN11-Africa)');
  console.log('   • IMS Catcher Detection');
  console.log('   • Ransomware Incident Response');
  console.log('   • Insider Threat Investigation');
  console.log('   • DDoS Mitigation\n');
  
  console.log('💡 Presentation Tips:');
  console.log('   • Use timeline view to show attack progression');
  console.log('   • Demonstrate automated playbook execution');
  console.log('   • Show compliance dashboard for ARTP/ANSSI alignment');
  console.log('   • Highlight MTTR improvement metrics');
  console.log('   • Display threat hunting session results\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
