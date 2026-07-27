/**
 * National SOC Platform - Comprehensive Demo Data Seed
 * 
 * Complete dataset for CEO presentation including:
 * - 90 days of realistic security events
 * - Multiple incident scenarios (APT, DDoS, Insider, Ransomware)
 * - Full compliance framework data (ARTP, ANSSI, ISO27001, NIST)
 * - ML model predictions and behavioral analytics
 * - Telecom-specific data (SS7, GTP, SIP anomalies)
 * - Operational metrics demonstrating SOC effectiveness
 * 
 * @version 2.0.0 (Phase 7 Enhancement)
 * @purpose CEO Presentation Demo Data
 */

import { PrismaClient, AlertSeverity, AlertStatus, IncidentPriority, IncidentStatus, ThreatCapability, ThreatActivity, IOCType, IOCThreatLevel, ComponentStatus, DataSourceStatus, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================
// CONFIGURATION
// ============================================================

const DEMO_CONFIG = {
  // Date range for demo data (90 days)
  daysOfHistory: 90,
  startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  
  // Scale factors for realistic volumes
  dailyAlerts: { min: 2800, max: 4500 },
  dailyIncidents: { min: 8, max: 25 },
  
  // Djezzy-specific configuration
  organization: {
    name: 'Djezzy Algeria',
    subscribers: '18.5M', // Million subscribers
    networkElements: 45000, // Cell sites, switches, etc.
    employees: 2500,
    socAnalysts: 24,
  }
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 Seeding Comprehensive Demo Data for CEO Presentation...\n')
  
  const startTime = Date.now()
  
  // Clear existing data (for clean demo)
  await clearExistingData()
  
  // Seed in order (respecting foreign keys)
  await seedUsers()
  await seedSystemComponents()
  await seedDataSources()
  await seedThreatActorsAndIOCs()
  await seedHistoricalMetrics()
  await seedDemoAlerts() // Large dataset
  await seedDemoIncidents() // Realistic scenarios
  await seedAuditLogs()
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ Demo data seeding completed in ${elapsed}s`)
  console.log('\n📊 Dataset Summary:')
  await printDatasetSummary()
}

// ============================================================
// CLEAR EXISTING DATA
// ============================================================

async function clearExistingData() {
  console.log('🗑️  Clearing existing demo data...')
  await prisma.auditLog.deleteMany()
  await prisma.dailyMetric.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.incident.deleteMany()
  await prisma.iOC.deleteMany()
  await prisma.threatActor.deleteMany()
  await prisma.dataSource.deleteMany()
  await prisma.systemComponent.deleteMany()
  await prisma.user.deleteMany()
  console.log('   ✅ Cleared all tables\n')
}

// ============================================================
// USERS - Djezzy SOC Team
// ============================================================

async function seedUsers() {
  console.log('👥 Creating Djezzy SOC Team...')
  
  const users = [
    // SOC Leadership
    {
      email: 'ciso@djezzy.dz',
      name: 'Dr. Mohammed Cherif',
      passwordHash: '$2b$10$demo_hash_ciso',
      role: UserRole.ADMIN,
      department: 'Information Security',
      isActive: true,
    },
    {
      email: 'soc.manager@djezzy.dz',
      name: 'Leila Hadj-Ahmed',
      passwordHash: '$2b$10$demo_hash_manager',
      role: UserRole.SUPERVISOR,
      department: 'SOC Operations',
      isActive: true,
    },
    
    // SOC Analysts - Shift A
    {
      email: 'ahmed.benali@djezzy.dz',
      name: 'Ahmed Benali',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'Incident Response Team',
      isActive: true,
    },
    {
      email: 'fatima.zerhouni@djezzy.dz',
      name: 'Fatima Zerhouni',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.SUPERVISOR,
      department: 'Threat Intelligence Unit',
      isActive: true,
    },
    {
      email: 'karim.mansouri@djezzy.dz',
      name: 'Karim Mansouri',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'Malware Analysis Lab',
      isActive: true,
    },
    {
      email: 'amina.khaled@djezzy.dz',
      name: 'Amina Khaled',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'SOC Operations',
      isActive: true,
    },
    
    // SOC Analysts - Shift B
    {
      email: 'yacine.boudiaf@djezzy.dz',
      name: 'Yacine Boudiaf',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'Network Security',
      isActive: true,
    },
    {
      email: 'nadia.belloula@djezzy.dz',
      name: 'Nadia Belloula',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'Telecom Security',
      isActive: true,
    },
    {
      email: 'omar.mokhtari@djezzy.dz',
      name: 'Omar Mokhtari',
      passwordHash: '$2b$10$demo_hash_analyst',
      role: UserRole.ANALYST,
      department: 'Forensics Team',
      isActive: true,
    },
    
    // Viewers / Stakeholders
    {
      email: 'cto.viewer@djezzy.dz',
      name: 'CTO Office Viewer',
      passwordHash: '$2b$10$demo_hash_viewer',
      role: UserRole.VIEWER,
      department: 'Executive',
      isActive: true,
    },
    {
      email: 'compliance@djezzy.dz',
      name: 'Compliance Officer',
      passwordHash: '$2b$10$demo_hash_viewer',
      role: UserRole.VIEWER,
      department: 'Compliance & Risk',
      isActive: true,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user
    })
  }
  
  console.log(`   ✅ Created ${users.length} users\n`)
}

// ============================================================
// SYSTEM COMPONENTS - Djezzy Infrastructure
// ============================================================

async function seedSystemComponents() {
  console.log('🖥️  Creating System Components...')
  
  const components = [
    // Core Security Infrastructure
    {
      name: 'Wazuh SIEM Cluster (Primary)',
      type: 'SIEM' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.97,
      cpuUsage: 45.2,
      memoryUsage: 62.8,
      diskUsage: 54.3,
      responseTimeMs: 23,
      errorRate: 0.02,
      hostname: 'siem-01.djezzy.local',
      ipAddress: '10.100.1.10',
      port: 1514,
      version: '4.7.0',
      incidentCount: 2,
      lastIncident: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Wazuh SIEM Cluster (Secondary)',
      type: 'SIEM' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.95,
      cpuUsage: 38.7,
      memoryUsage: 58.4,
      diskUsage: 51.2,
      responseTimeMs: 19,
      errorRate: 0.01,
      hostname: 'siem-02.djezzy.local',
      ipAddress: '10.100.1.11',
      port: 1514,
      version: '4.7.0',
      incidentCount: 0,
    },
    {
      name: 'TheHive SOAR Platform',
      type: 'SOAR' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.98,
      cpuUsage: 28.3,
      memoryUsage: 71.2,
      diskUsage: 67.5,
      responseTimeMs: 45,
      errorRate: 0.05,
      hostname: 'soar-01.djezzy.local',
      ipAddress: '10.100.1.20',
      port: 9000,
      version: '5.3.0',
      incidentCount: 1,
      lastIncident: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'MISP Threat Intelligence',
      type: 'TIP' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.99,
      cpuUsage: 22.1,
      memoryUsage: 48.9,
      diskUsage: 72.3,
      responseTimeMs: 32,
      errorRate: 0.01,
      hostname: 'misp-01.djezzy.local',
      ipAddress: '10.100.1.30',
      port: 443,
      version: '2.4.150',
      incidentCount: 0,
    },
    
    // Endpoint Detection
    {
      name: 'Wazuh EDR Agents (Enterprise)',
      type: 'EDR' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 98.5,
      cpuUsage: 12.4,
      memoryUsage: 34.6,
      diskUsage: 28.9,
      responseTimeMs: 85,
      errorRate: 0.8,
      version: '4.7.0',
      incidentCount: 5,
      lastIncident: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    
    // Network Security
    {
      name: 'Suricata IDS Cluster',
      type: 'IDS' as const,
      status: ComponentStatus.DEGRADED,
      uptime: 99.2,
      cpuUsage: 78.5,
      memoryUsage: 82.3,
      diskUsage: 45.6,
      responseTimeMs: 12,
      errorRate: 2.3,
      hostname: 'ids-edge-01.djezzy.local',
      ipAddress: '10.200.1.10',
      version: '7.0.0',
      incidentCount: 3,
      lastIncident: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      name: 'Palo Alto NGFW (Perimeter)',
      type: 'FIREWALL' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.999,
      cpuUsage: 34.2,
      memoryUsage: 45.8,
      diskUsage: 33.4,
      responseTimeMs: 0.2,
      errorRate: 0.001,
      hostname: 'fw-perimeter-01.djezzy.local',
      ipAddress: '196.203.X.X',
      version: '11.1.0',
      incidentCount: 12,
      lastIncident: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      name: 'Squid Proxy Cluster',
      type: 'PROXY' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.95,
      cpuUsage: 41.3,
      memoryUsage: 52.7,
      diskUsage: 61.8,
      responseTimeMs: 8,
      errorRate: 0.15,
      hostname: 'proxy-01.djezzy.local',
      ipAddress: '10.100.2.10',
      port: 3128,
      version: '5.9',
      incidentCount: 1,
    },
    
    // Telecom-Specific
    {
      name: 'SS7 Firewall (Signaling)',
      type: 'FIREWALL' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.998,
      cpuUsage: 25.6,
      memoryUsage: 38.4,
      diskUsage: 42.1,
      responseTimeMs: 0.5,
      errorRate: 0.002,
      hostname: 'ss7-fw-01.telco.djezzy',
      version: '3.2.1',
      incidentCount: 0,
    },
    {
      name: 'Diameter Router',
      type: 'PROXY' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.997,
      cpuUsage: 55.8,
      memoryUsage: 64.2,
      diskUsage: 38.7,
      responseTimeMs: 2,
      errorRate: 0.08,
      hostname: 'diameter-01.telco.djezzy',
      incidentCount: 0,
    },
    
    // Infrastructure
    {
      name: 'PostgreSQL Database Cluster',
      type: 'STORAGE' as const,
      status: ComponentStatus.HEALTHY,
      uptime: 99.999,
      cpuUsage: 42.3,
      memoryUsage: 71.5,
      diskUsage: 68.9,
      responseTimeMs: 5,
      errorRate: 0.01,
      hostname: 'db-primary.djezzy.local',
      ipAddress: '10.100.10.10',
      port: 5432,
      version: '15.4',
      incidentCount: 0,
    },
    {
      name: 'Veeam Backup System',
      type: 'BACKUP' as const,
      status: ComponentStatus.MAINTENANCE,
      uptime: 99.9,
      cpuUsage: 65.4,
      memoryUsage: 74.8,
      diskUsage: 78.2,
      responseTimeMs: 120,
      errorRate: 0.5,
      hostname: 'backup-01.djezzy.local',
      version: '12.1',
      incidentCount: 0,
    },
  ]

  for (const component of components) {
    await prisma.systemComponent.upsert({
      where: { name: component.name },
      update: {},
      create: component
    })
  }
  
  console.log(`   ✅ Created ${components.length} system components\n`)
}

// ============================================================
// DATA SOURCES - Log Ingestion
// ============================================================

async function seedDataSources() {
  console.log('📡 Creating Data Sources...')
  
  const sources = [
    // Network Security Logs
    {
      name: 'Palo Alto NGFW Traffic Logs',
      type: 'Palo Alto Networks NGFW',
      status: DataSourceStatus.CONNECTED,
      eps: 8500,
      eventsToday: BigInt(420000000),
      eventsTotal: BigInt(31500000000),
      connectionString: 'syslog://10.200.1.10:514',
      parserType: 'PaloAlto_Traffic',
      retentionDays: 90,
      errorCount: 2,
    },
    {
      name: 'Suricata IDS Alerts',
      type: 'Suricata IDS',
      status: DataSourceStatus.CONNECTED,
      eps: 2200,
      eventsToday: BigInt(108000000),
      eventsTotal: BigInt(8100000000),
      connectionString: 'file:///var/log/suricata/eve.json',
      parserType: 'Suricata_JSON',
      retentionDays: 180,
      errorCount: 0,
    },
    {
      name: 'DNS Server Logs (BIND)',
      type: 'BIND DNS',
      status: DataSourceStatus.CONNECTED,
      eps: 15000,
      eventsToday: BigInt(750000000),
      eventsTotal: BigInt(56250000000),
      connectionString: 'syslog://dns-01:514',
      parserType: 'BIND_QueryLog',
      retentionDays: 30,
      errorCount: 1,
    },
    
    // Endpoint Logs
    {
      name: 'Windows Event Log (Domain Controllers)',
      type: 'Microsoft Windows Event Log',
      status: DataSourceStatus.CONNECTED,
      eps: 5200,
      eventsToday: BigInt(255000000),
      eventsTotal: BigInt(19125000000),
      connectionString: 'winlog://dc-01,dc-02,dc-03',
      parserType: 'Windows_Event',
      retentionDays: 180,
      errorCount: 0,
    },
    {
      name: 'Wazuh Agent Logs (Endpoints)',
      type: 'Wazuh Agent',
      status: DataSourceStatus.WARNING,
      eps: 3800,
      eventsToday: BigInt(186000000),
      eventsTotal: BigInt(13950000000),
      connectionString: 'agent:*',
      parserType: 'Wazuh_JSON',
      retentionDays: 90,
      errorCount: 145, // Some agents offline
      errorMessage: '145 agents not reporting (3.2% coverage gap)',
    },
    
    // Telecom-Specific Sources
    {
      name: 'SS7 Signaling Logs',
      type: 'SS7 Signaling Monitor',
      status: DataSourceStatus.CONNECTED,
      eps: 25000,
      eventsToday: BigInt(1250000000),
      eventsTotal: BigInt(93750000000),
      connectionString: 'ss7-monitor://ss7-core',
      parserType: 'SS7_Signaling',
      retentionDays: 365, // Regulatory requirement
      errorCount: 0,
    },
    {
      name: 'GTP/GRX Traffic Logs',
      type: 'GTP Protocol Analyzer',
      status: DataSourceStatus.CONNECTED,
      eps: 18000,
      eventsToday: BigInt(900000000),
      eventsTotal: BigInt(67500000000),
      connectionString: 'gtp-probe://ggsn-01,ggsn-02',
      parserType: 'GTP_Traffic',
      retentionDays: 180,
      errorCount: 0,
    },
    {
      name: 'SIP/VoIP CDRs',
      type: 'SIP Proxy Call Detail',
      status: DataSourceStatus.CONNECTED,
      eps: 12000,
      eventsToday: BigInt(600000000),
      eventsTotal: BigInt(45000000000),
      connectionString: 'sip-proxy://softswitch-01',
      parserType: 'SIP_CDR',
      retentionDays: 365, // Legal intercept requirements
      errorCount: 0,
    },
    {
      name: 'Diameter CCR/CCA Logs',
      type: 'Diameter Protocol',
      status: DataSourceStatus.CONNECTED,
      eps: 8000,
      eventsToday: BigInt(400000000),
      eventsTotal: BigInt(30000000000),
      connectionString: 'diameter://pcrf-01,ocs-01',
      parserType: 'Diameter_CCR',
      retentionDays: 180,
      errorCount: 0,
    },
    
    // Application & Authentication
    {
      name: 'Active Directory Authentication',
      type: 'Microsoft Active Directory',
      status: DataSourceStatus.CONNECTED,
      eps: 3200,
      eventsToday: BigInt(156000000),
      eventsTotal: BigInt(11700000000),
      connectionString: 'ldap://dc-01:389',
      parserType: 'AD_Auth',
      retentionDays: 365,
      errorCount: 0,
    },
    {
      name: 'VPN Remote Access',
      type: 'Cisco ASA VPN',
      status: DataSourceStatus.CONNECTED,
      eps: 850,
      eventsToday: BigInt(42000000),
      eventsTotal: BigInt(3150000000),
      connectionString: 'syslog://vpn-gw:514',
      parserType: 'Cisco_ASA_VPN',
      retentionDays: 180,
      errorCount: 0,
    },
    {
      name: 'Email Security (MIMEcast)',
      type: 'MIMEcast Email Security',
      status: DataSourceStatus.CONNECTED,
      eps: 2100,
      eventsToday: BigInt(102000000),
      eventsTotal: BigInt(7650000000),
      connectionString: 'api://mimecast.dz',
      parserType: 'Mimecast_API',
      retentionDays: 365,
      errorCount: 0,
    },
    
    // Cloud & Applications
    {
      name: 'Office 365 Audit Logs',
      type: 'Microsoft Office 365',
      status: DataSourceStatus.CONNECTED,
      eps: 650,
      eventsToday: BigInt(32000000),
      eventsTotal: BigInt(2400000000),
      connectionString: 'api://graph.microsoft.com',
      parserType: 'O365_Management',
      retentionDays: 365,
      errorCount: 0,
    },
    {
      name: 'AWS CloudTrail',
      type: 'Amazon Web Services',
      status: DataSourceStatus.CONNECTED,
      eps: 1200,
      eventsToday: BigInt(59000000),
      eventsTotal: BigInt(4425000000),
      connectionString: 's3://djezzy-cloudtrail/',
      parserType: 'CloudTrail_JSON',
      retentionDays: 90,
      errorCount: 0,
    },
  ]

  for (const source of sources) {
    await prisma.dataSource.upsert({
      where: { name: source.name },
      update: {},
      create: source
    })
  }
  
  console.log(`   ✅ Created ${sources.length} data sources (${sources.reduce((sum, s) => sum + s.eps, 0).toLocaleString()} total EPS)\n`)
}

// ============================================================
// THREAT INTELLIGENCE - Actors & IOCs
// ============================================================

async function seedThreatActorsAndIOCs() {
  console.log('🎭 Creating Threat Intelligence...')
  
  // Create threat actors relevant to telecom/North Africa region
  const actors = [
    {
      name: 'APT28 (Fancy Bear)',
      aliases: 'Sofacy, STRONTIUM, TsarTeam',
      country: 'Russia',
      capability: ThreatCapability.ADVANCED,
      activityStatus: ThreatActivity.ACTIVE,
      targetSectors: JSON.stringify(['Government', 'Telecommunications', 'Defense', 'Energy']),
      targetRegions: JSON.stringify(['Europe', 'NATO', 'North Africa', 'Middle East']),
      motivation: 'Espionage, Geopolitical',
      confidence: 95,
      firstSeen: new Date('2015-01-01'),
      lastSeen: new Date(),
      description: 'Russian GRU-linked APT targeting government and critical infrastructure worldwide. Known for sophisticated spear-phishing and zero-day exploitation.',
      ttps: JSON.stringify(['T1566.001', 'T1203', 'T1059.001', 'S0006']), // MITRE techniques
      references: JSON.stringify(['https://www.cisa.gov/news-events/cybersecurity-advisories', 'MITRE ATT&CK G0117']),
    },
    {
      name: 'Lazarus Group',
      aliases: 'Hidden Cobra, Zinc, APT38',
      country: 'North Korea',
      capability: ThreatCapability.ADVANCED,
      activityStatus: ThreatActivity.ACTIVE,
      targetSectors: JSON.stringify(['Financial Services', 'Telecommunications', 'Cryptocurrency', 'Government']),
      targetRegions: JSON.stringify(['Global', 'Asia-Pacific', 'Southeast Asia']),
      motivation: 'Financial gain, Espionage, Sabotage',
      confidence: 92,
      firstSeen: new Date('2009-01-01'),
      lastSeen: new Date(),
      description: 'North Korean state-sponsored group known for financial heists (Bangladesh Bank heist, WannaCry), cryptocurrency theft, and espionage operations.',
      ttps: JSON.stringify(['T1059.001', 'S0054', 'T1486', 'T1078']),
      references: JSON.stringify(['US-CERT TA17-164A', 'MITRE ATT&CK S0131']),
    },
    {
      name: 'Silent Librarian',
      aliases: 'COBALT DYKEM, TA407',
      country: 'Iran',
      capability: ThreatCapability.MODERATE,
      activityStatus: ThreatActivity.ACTIVE,
      targetSectors: JSON.stringify(['Academic', 'Research', 'Government']),
      targetRegions: JSON.stringify(['Global', 'Middle East', 'North Africa']),
      motivation: 'Espionage, Intellectual Property theft',
      confidence: 88,
      firstSeen: new Date('2013-01-01'),
      lastSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      description: 'Iranian threat group targeting academic institutions for intellectual property and research data.',
      ttps: JSON.stringify(['T1566', 'T1110.001', 'T1021.003']),
      references: JSON.stringify(['FBI FLASH UA-103020-001']),
    },
    {
      name: 'OilRig (APT34)',
      aliases: 'Helix Kitten, Twisted Kitten',
      country: 'Iran',
      capability: ThreatCapability.ADVANCED,
      activityStatus: ThreatActivity.ACTIVE,
      targetSectors: JSON.stringify(['Energy', 'Telecommunications', 'Financial Services', 'Government']),
      targetRegions: JSON.stringify(['Middle East', 'North Africa']),
      motivation: 'Espionage, Surveillance',
      confidence: 90,
      firstSeen: new Date('2014-01-01'),
      lastSeen: new Date(),
      description: 'Iranian threat actor specializing in Middle East telecommunications and energy sector targeting. Known for custom malware (TwoFace, POWRUNER).',
      ttps: JSON.stringify(['T1566.002', 'T1059.007', 'T1086', 'T1003']),
      references: JSON.stringify(['FireEye APT34 Report', 'Microsoft OilRig analysis']),
    },
    {
      name: 'Tick Group',
      aliases: 'RedBrick, RedBot',
      country: 'China',
      capability: ThreatCapability.MODERATE,
      activityStatus: ThreatActivity.DORMANT,
      targetSectors: JSON.stringify(['Technology', 'Manufacturing', 'Telecommunications']),
      targetRegions: JSON.stringify(['East Asia', 'Southeast Asia']),
      motivation: 'Espionage, Intellectual Property',
      confidence: 75,
      firstSeen: new Date('2010-01-01'),
      lastSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      description: 'Chinese cyber espionage group targeting technology companies for IP theft.',
      ttps: JSON.stringify(['T1105', 'T1059.001', 'T1047']),
      references: JSON.stringify(['Symantec Tick Group report']),
    },
    {
      name: 'Scattered Spider',
      aliases: '0ktapus, UNC3944, Muddled Librarian',
      country: 'Unknown (likely West Africa/UK)',
      capability: ThreatCapability.MODERATE,
      activityStatus: ThreatActivity.ACTIVE,
      targetSectors: JSON.stringify(['Telecommunications', 'Technology', 'Business Process Outsourcing', 'Finance']),
      targetRegions: JSON.stringify(['Global', 'North America', 'Europe']),
      motivation: 'Financial gain, Data extortion',
      confidence: 89,
      firstSeen: new Date('2022-01-01'),
      lastSeen: new Date(),
      description: 'Rapidly emerging threat group specializing in social engineering, SIM swapping, and MFA bypass attacks against telecom and tech companies.',
      ttps: JSON.stringify(['T1566.001', 'T1589.002', 'T1621', 'T1539']),
      references: JSON.stringify(['CISA Scattered Spider Advisory', 'CrowdStrike UNC3944']),
    },
  ]

  for (const actor of actors) {
    await prisma.threatActor.upsert({
      where: { name: actor.name },
      update: {},
      create: actor
    })
  }

  // Create IOCs relevant to current threats
  const iocs = [
    // Scattered Spider related (high relevance to telecom)
    {
      type: IOCType.DOMAIN,
      value: 'support-verify-djezzy.tk',
      threatLevel: IOCThreatLevel.CRITICAL,
      source: 'MISP Community',
      sourceUrl: 'https://misp.example.org/events/view/12345',
      description: 'Typosquat domain targeting Djezzy employees for credential harvesting',
      tags: JSON.stringify(['typosquat', 'phishing', 'telecom-targeted', 'scattered-spider']),
      malwareFamily: 'GoPhish Kit',
      campaign: 'Operation TelePort',
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      detectionCount: 47,
      lastDetected: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      type: IOCType.IP,
      value: '185.141.63[.]81',
      threatLevel: IOCThreatLevel.HIGH,
      source: 'AlienVault OTX',
      description: 'Known Scattered Spider infrastructure - SIM swap coordination server',
      tags: JSON.stringify(['scattered-spider', 'sim-swap', 'infrastructure']),
      campaign: 'Operation TelePort',
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      detectionCount: 23,
      lastDetected: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    
    // General high-priority IOCs
    {
      type: IOCType.HASH_SHA256,
      value: 'e7a5b84c3f2d1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
      threatLevel: IOCThreatLevel.CRITICAL,
      source: 'VirusTotal',
      sourceUrl: 'https://www.virustotal.com/gui/file/e7a5b84c3f2d...',
      description: 'Remcos RAT variant used by multiple APT groups - recent telecom targeting',
      tags: JSON.stringify(['rat', 'remcos', 'apt', 'remote-access-trojan']),
      malwareFamily: 'Remcos',
      detectionCount: 156,
      lastDetected: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      type: IOCType.URL,
      value: 'http://updates.microsoft-security[.]info/download/update.exe',
      threatLevel: IOCThreatLevel.HIGH,
      source: 'PhishTank',
      description: 'Fake Microsoft update page distributing malware',
      tags: JSON.stringify(['phishing', 'fake-update', 'initial-access']),
      malwareFamily: 'Unknown Dropper',
      detectionCount: 89,
      lastDetected: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    
    // Telecom-specific IOCs
    {
      type: IOCType.IP,
      value: '91.121.87[.]44',
      threatLevel: IOCThreatLevel.MEDIUM,
      source: 'CERT-DZ Feed',
      description: 'SS7 scanning probe detected from this IP - potential signaling attack reconnaissance',
      tags: JSON.stringify(['ss7', 'signaling', 'reconnaissance', 'telecom']),
      detectionCount: 12,
      lastDetected: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: IOCType.DOMAIN,
      value: 'mms-djezzy-promo[.]com',
      threatLevel: IOCThreatLevel.HIGH,
      source: 'Internal Detection',
      description: 'Fake Djezzy MMS promo domain - SMiShing campaign targeting subscribers',
      tags: JSON.stringify(['smishing', 'subscriber-fraud', 'brand-impersonation']),
      campaign: 'SMS Fraud Wave Q3',
      detectionCount: 234,
      lastDetected: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    
    // Regional threat IOCs
    {
      type: IOCType.IP,
      value: '196.203.45[.]112',
      threatLevel: IOCThreatLevel.MEDIUM,
      source: 'AbuseIPDB',
      description: 'Algerian IP involved in credential stuffing attacks against local services',
      tags: JSON.stringify(['credential-stuffing', 'brute-force', 'algeria']),
      detectionCount: 67,
      lastDetected: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      type: IOCType.EMAIL,
      value: 'ceo-fraud@protonmail[.]com',
      threatLevel: IOCThreatLevel.HIGH,
      source: 'Internal Detection',
      description: 'BEC email address attempting CEO fraud against Djezzy executives',
      tags: JSON.stringify(['bec', 'ceo-fraud', 'business-email-compromise']),
      campaign: 'BEC Campaign North Africa',
      detectionCount: 8,
      lastDetected: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
  ]

  for (const ioc of iocs) {
    await prisma.iOC.create({ data: ioc })
  }

  console.log(`   ✅ Created ${actors.length} threat actors and ${iocs.length} IOCs\n`)
}

// ============================================================
// HISTORICAL METRICS (90 days)
// ============================================================

async function seedHistoricalMetrics() {
  console.log('📈 Generating 90 days of historical metrics...')
  
  for (let daysAgo = DEMO_CONFIG.daysOfHistory; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(0, 0, 0, 0)

    // Generate realistic patterns with weekly seasonality
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weekendFactor = isWeekend ? 0.65 : 1
    
    // Add some randomness and trends
    const trendFactor = 1 + (DEMO_CONFIG.daysOfHistory - daysAgo) * 0.002 // Slight upward trend
    const randomFactor = 0.9 + Math.random() * 0.2 // ±10% random variation
    
    const baseAlerts = (DEMO_CONFIG.dailyAlerts.min + DEMO_CONFIG.dailyAlerts.max) / 2
    const totalAlerts = Math.round(baseAlerts * weekendFactor * trendFactor * randomFactor)
    
    const baseIncidents = (DEMO_CONFIG.dailyIncidents.min + DEMO_CONFIG.dailyIncidents.max) / 2
    const totalIncidents = Math.round(baseIncidents * weekendFactor * randomFactor)

    await prisma.dailyMetric.create({
      data: {
        date,
        totalAlerts,
        criticalAlerts: Math.round(totalAlerts * 0.025), // 2.5% critical
        highAlerts: Math.round(totalAlerts * 0.08), // 8% high
        mediumAlerts: Math.round(totalAlerts * 0.22), // 22% medium
        lowAlerts: Math.round(totalAlerts * 0.35), // 35% low
        resolvedAlerts: Math.round(totalAlerts * 0.85), // 85% resolved same day
        
        totalIncidents,
        p1Incidents: Math.round(totalIncidents * 0.08),
        p2Incidents: Math.round(totalIncidents * 0.18),
        p3Incidents: Math.round(totalIncidents * 0.35),
        p4Incidents: totalIncidents - Math.round(totalIncidents * 0.61),
        closedIncidents: Math.round(totalIncidents * 0.72),
        avgMTTR: 2.2 + Math.random() * 2, // 2-4 hours average
        
        avgEPS: 95000 + Math.random() * 15000, // 95k-110k EPS average
        peakEPS: 145000 + Math.random() * 30000, // Peak during business hours
        totalEvents: BigInt(Math.round((95000 + Math.random() * 15000) * 86400)),
        
        newIOCs: Math.floor(Math.random() * 15) + 3, // 3-18 new IOCs per day
        threatsBlocked: Math.floor(Math.random() * 50) + 20, // 20-70 threats blocked
        
        endpointsTotal: 42500 + Math.floor(Math.random() * 500),
        endpointsOnline: 40800 + Math.floor(Math.random() * 400),
      }
    })
  }
  
  console.log('   ✅ Generated 90 days of daily metrics\n')
}

// ============================================================
// DEMO ALERTS - Realistic sample with scenarios
// ============================================================

async function seedDemoAlerts() {
  console.log('⚠️  Creating demo alerts (sample set for presentation)...')
  
  const alerts = []
  const now = new Date()
  
  // Critical alerts (recent, for active display)
  const criticalAlerts = [
    {
      alertId: 'ALT-2026-14789',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.NEW,
      source: 'Wazuh SIEM',
      title: 'Multiple Authentication Failures - Domain Admin Account',
      description: 'Detected 47 failed authentication attempts for account "srv_admin_dc01" from IP 185.141.63[.]81 within 5 minutes. Pattern consistent with brute force attack or credential stuffing.',
      endpoint: 'dc-01.djezzy.local',
      category: 'Authentication Attack',
      mitreTactic: 'Credential Access',
      mitreTechnique: 'T1110.001', // Brute Force: Password Guessing
    },
    {
      alertId: 'ALT-2026-14788',
      timestamp: new Date(now.getTime() - 32 * 60 * 1000),
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.INVESTIGATING,
      source: 'Suricata IDS',
      title: 'SQL Injection Attempt Detected - Customer Portal',
      description: 'Blocked SQL injection attempt on customer self-care portal. Payload included UNION-based injection targeting customer PII tables. Source IP: 91.121.87[.]44',
      endpoint: 'web-portal-external.djezzy.dz',
      category: 'Web Application Attack',
      mitreTactic: 'Initial Access',
      mitreTechnique: 'T1190', // Exploit Public-Facing Application
    },
    {
      alertId: 'ALT-2026-14787',
      timestamp: new Date(now.getTime() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.ACKNOWLEDGED,
      source: 'MISP TIP',
      title: 'Critical IOC Match - Remcos RAT Hash',
      description: 'File hash match in sandbox analysis matches known Remcos RAT variant (SHA256: e7a5b84c...). File submitted from workstation FIN-023 in Finance department.',
      endpoint: 'FIN-023.djezzy.local',
      category: 'Malware Detection',
      mitreTactic: 'Execution',
      mitreTechnique: 'T1059.005', // Visual Basic
    },
    {
      alertId: 'ALT-2026-14786',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      severity: AlertSeverity.CRITICAL,
      status: AlertStatus.NEW,
      source: 'SS7 Monitor',
      title: 'Anomalous SS7 Signaling Pattern Detected',
      description: 'Unusual SS7 SendRoutingInfoForSM message burst to subscriber range 213550XXXX (500+ requests in 60 seconds). Potential location tracking or SMS interception attempt.',
      endpoint: 'stp-01.telco.djezzy',
      category: 'Telecom Signaling Attack',
      mitreTactic: 'Collection',
      mitreTechnique: 'T1119', // Automated Collection
    },
  ]
  
  // High severity alerts
  const highAlerts = [
    {
      alertId: 'ALT-2026-14785',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000),
      severity: AlertSeverity.HIGH,
      status: AlertStatus.NEW,
      source: 'Wazuh SIEM',
      title: 'Privilege Escalation Attempt - Linux Server',
      description: 'User "svc_backup" attempted CVE-2023-2640 exploitation on db-backup-01. Polkit privilege escalation attempt blocked.',
      endpoint: 'db-backup-01.djezzy.local',
      category: 'Privilege Escalation',
      mitreTactic: 'Privilege Escalation',
      mitreTechnique: 'T1548.001', // Abuse Elevation Control Mechanism: Setuid and Setgid
    },
    {
      alertId: 'ALT-2026-14784',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000),
      severity: AlertSeverity.HIGH,
      status: AlertStatus.INVESTIGATING,
      source: 'Palo Alto NGFW',
      title: 'Large Data Transfer to Personal Cloud Storage',
      description: 'Workstation HR-012 uploaded 2.3GB to personal Google Drive account. Contains .xlsx and .csv files matching PII patterns.',
      endpoint: 'HR-012.djezzy.local',
      category: 'Data Exfiltration',
      mitreTactic: 'Exfiltration',
      mitreTechnique: 'T1567.002', // Exfiltration to Cloud Storage
    },
    {
      alertId: 'ALT-2026-14783',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      severity: AlertSeverity.HIGH,
      status: AlertStatus.ACKNOWLEDGED,
      source: 'TheHive SOAR',
      title: 'Phishing Campaign Detected - Targeting Executives',
      description: 'Identified targeted phishing campaign with 12 emails sent to C-level executives. Theme: "Urgent - Contract Review Required". Contains macro-enabled document.',
      category: 'Phishing',
      mitreTactic: 'Initial Access',
      mitreTechnique: 'T1566.001', // Spearphishing Attachment
    },
    {
      alertId: 'ALT-2026-14782',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      severity: AlertSeverity.HIGH,
      status: AlertStatus.RESOLVED,
      source: 'Wazuh EDR',
      title: 'Ransomware Behavior Blocked',
      description: 'Stopped mass encryption behavior on file-server-03. Ransom note template detected. Isolated endpoint successfully. No files encrypted.',
      endpoint: 'file-server-03.djezzy.local',
      category: 'Malware - Ransomware',
      mitreTactic: 'Impact',
      mitreTechnique: 'T1486', // Data Encrypted for Impact
    },
    {
      alertId: 'ALT-2026-14781',
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      severity: AlertSeverity.HIGH,
      status: AlertStatus.RESOLVED,
      source: 'Suricata IDS',
      title: 'DDoS Attack Mitigated - DNS Amplification',
      description: 'Mitigated 2.4Gbps DNS amplification attack targeting authoritative DNS servers. Lasted 18 minutes. No service impact reported.',
      endpoint: 'dns-01.djezzy.dz, dns-02.djezzy.dz',
      category: 'Denial of Service',
      mitreTactic: 'Impact',
      mitreTechnique: 'T1498', // Network Denial of Service
    },
  ]
  
  // Medium severity alerts (sample)
  const mediumAlerts = Array.from({ length: 15 }, (_, i) => ({
    alertId: `ALT-2026-${14780 - i}`,
    timestamp: new Date(now.getTime() - (i + 1) * 30 * 60 * 1000),
    severity: AlertSeverity.MEDIUM,
    status: [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED][i % 3],
    source: ['Wazuh SIEM', 'Suricata IDS', 'Palo Alto NGFW', 'MISP TIP'][i % 4],
    title: [
      'Unusual Login Time - After Hours VPN Access',
      'Potential Credential Reuse Detected',
      'Suspicious PowerShell Execution',
      'New Binary Execution - Unsigned Program',
      'DNS Tunneling Activity Detected',
      'Large Number of File Modifications',
      'Unusual User-Agent String',
      'Potential Data Aggregation Activity',
      'Scheduled Task Creation Detected',
      'Registry Modification - Run Keys',
      'Unusual Service Installation',
      'Network Scan Detected from Internal Host',
      'Potential Lateral Movement - SMB Access',
      'Suspicious Email Forwarding Rule',
      'Unauthorized Software Installation'
    ][i],
    description: `Medium severity security event requiring investigation and potential response action. Part of routine SOC monitoring.`,
    category: ['Access Anomaly', 'Malware Indicators', 'Reconnaissance', 'Policy Violation'][i % 4],
  }))
  
  // Combine all alerts
  alerts.push(...criticalAlerts, ...highAlerts, ...mediumAlerts)
  
  // Insert into database
  for (const alert of alerts) {
    await prisma.alert.create({ data: alert })
  }
  
  console.log(`   ✅ Created ${alerts.length} demo alerts (4 critical, 5 high, 15 medium)\n`)
}

// ============================================================
// DEMO INCIDENTS - Realistic scenarios for CEO presentation
// ============================================================

async function seedDemoIncidents() {
  console.log('🚨 Creating demo incidents (realistic scenarios)...')
  
  const now = new Date()
  const incidents = [
    // ACTIVE CRITICAL INCIDENT - APT-style attack
    {
      incidentId: 'INC-2026-0089',
      title: 'Targeted Attack Campaign - Executive Phishing & Initial Compromise',
      description: 'Ongoing investigation into targeted phishing campaign affecting 3 executive staff members. Initial access via malicious document led to execution of remote access trojan. Threat actor showing advanced persistent threat characteristics including defense evasion and lateral movement attempts. Incident escalated to P1 due to potential data exposure risk.',
      severity: IncidentPriority.P1,
      status: IncidentStatus.CONTAINED,
      category: 'Advanced Persistent Threat',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'fatima.zerhouni@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000), // 18 hours ago
      containedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // Contained 6h ago
      mttrHours: null, // Still open
      actionsTaken: 14,
      affectedSystems: 5,
      dataBreach: false, // Contained before exfiltration confirmed
      publicImpact: false,
      resolution: null,
      lessonsLearned: null,
    },
    
    // RECENT HIGH INCIDENT - DDoS
    {
      incidentId: 'INC-2026-0090',
      title: 'DDoS Attack Against Mobile Core Network Elements',
      description: 'Coordinated DDoS attack targeting GGSN and SGSN nodes causing intermittent service degradation for mobile data subscribers in Algiers region. Peak attack volume 4.2Gbps. Mitigation implemented via upstream scrubbing center. Coordination with ARTP notified per regulatory requirements.',
      severity: IncidentPriority.P2,
      status: IncidentStatus.RECOVERED,
      category: 'Denial of Service',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'ahmed.benali@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
      containedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000),
      eradicatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      recoveredAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      mttrHours: 24,
      actionsTaken: 22,
      affectedSystems: 8,
      dataBreach: false,
      publicImpact: true, // Service impact to subscribers
      resolution: 'Attack mitigated through combination of rate limiting, Geo-IP blocking, and upstream scrubbing. Post-incident review identified need for enhanced DDoS detection at signaling layer.',
      lessonsLearned: '1. Implement earlier detection thresholds for signaling layer attacks\n2. Enhance coordination procedures with upstream ISP\n3. Update playbooks for multi-vector DDoS scenarios\n4. Consider additional DDoS mitigation service for mobile core protection',
    },
    
    // INSIDER THREAT SCENARIO (resolved)
    {
      incidentId: 'INC-2026-0078',
      title: 'Data Exfiltration Attempt by Privileged User',
      description: 'Security analytics detected unusual data access patterns by database administrator. Investigation revealed systematic export of customer records over 2-week period totaling approximately 45,000 subscriber records. Employee terminated and legal proceedings initiated. Law enforcement notification completed.',
      severity: IncidentPriority.P1,
      status: IncidentStatus.CLOSED,
      category: 'Insider Threat / Data Theft',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'soc.manager@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      containedAt: new Date(now.getTime() - 13.5 * 24 * 60 * 60 * 1000),
      eradicatedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      recoveredAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      mttrHours: 168, // 7 days to full recovery
      actionsTaken: 35,
      affectedSystems: 3,
      dataBreach: true,
      publicImpact: false, // Contained before public disclosure needed
      resolution: 'Immediate access revocation, forensic imaging completed, affected customers notified per ARTP requirements, legal action initiated. Enhanced DLP controls deployed.',
      lessonsLearned: '1. Implement enhanced UBA monitoring for privileged users\n2. Deploy database activity monitoring (DAM)\n3. Add data export alerts for bulk queries\n4. Review and reduce excessive data access privileges\n5. Enhance pre-employment screening for sensitive roles',
    },
    
    // RANSOMWARE INCIDENT (contained quickly)
    {
      incidentId: 'INC-2026-0085',
      title: 'Ransomware Containment - Quick Response Success Story',
      description: 'Ransomware execution detected on finance department workstation via automated EDR alerting. Rapid containment isolated affected host within 4 minutes of initial execution. Zero files encrypted due to quick response. Patient zero identified via phishing email received 30 minutes prior.',
      severity: IncidentPriority.P2,
      status: IncidentStatus.CLOSED,
      category: 'Malware - Ransomware',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'karim.mansouri@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      containedAt: new Date(now.getTime() - 4.98 * 24 * 60 * 60 * 1000), // Very fast containment!
      eradicatedAt: new Date(now.getTime() - 4.5 * 24 * 60 * 60 * 1000),
      recoveredAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      mttrHours: 24,
      actionsTaken: 18,
      affectedSystems: 1,
      dataBreach: false,
      publicImpact: false,
      resolution: 'Successful rapid containment demonstrates value of EDR deployment and SOC 24/7 monitoring. Image restored from backup. User retrained on phishing awareness.',
      lessonsLearned: '1. Continue investment in EDR capabilities\n2. Expand phishing simulation training\n3. Document success story for management reporting\n4. Share playbook improvements with industry peers',
    },
    
    // TELECOM FRAUD INCIDENT
    {
      incidentId: 'INC-2026-0082',
      title: 'SIM Swap Fraud Ring - Subscriber Impact',
      description: 'Coordinated SIM swap fraud attack affecting 23 subscribers. Attackers social-engineered retail staff and call center agents to issue replacement SIM cards. Used to gain access to banking and cryptocurrency accounts. Total financial loss to subscribers estimated at $340,000. Criminal investigation ongoing with judicial police.',
      severity: IncidentPriority.P1,
      status: IncidentStatus.ERADICATED,
      category: 'Telecom Fraud / SIM Swap',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'nadia.belloula@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      containedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      eradicatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      mttrHours: 96,
      actionsTaken: 28,
      affectedSystems: 4,
      dataBreach: true,
      publicImpact: true,
      resolution: 'Fraud ring dismantled. Internal controls enhanced. Additional verification steps for SIM changes. Staff training reinforced. Coordination with banks for victim support.',
      lessonsLearned: '1. Implement enhanced identity verification for SIM changes\n2. Add delay flags for high-value account SIM swaps\n3. Improve anomaly detection on dealer channel activities\n4. Strengthen call center authentication procedures\n5. Develop subscriber notification system for SIM changes',
    },
    
    // COMPLIANCE INCIDENT
    {
      incidentId: 'INC-2026-0075',
      title: 'ARTP Reporting Deadline Miss - Corrective Action',
      description: 'Internal audit identified missed ARTP cybersecurity incident reporting deadline. 3 incidents from previous quarter not reported within required 72-hour window. Root cause: manual reporting process failure. Self-reported to ARTP with remediation plan.',
      severity: IncidentPriority.P3,
      status: IncidentStatus.CLOSED,
      category: 'Compliance / Regulatory',
      assigneeId: (await prisma.user.findUnique({ where: { email: 'compliance@djezzy.dz' } }))?.id,
      detectedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      containedAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      eradicatedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      recoveredAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      mttrHours: 168,
      actionsTaken: 16,
      affectedSystems: 2,
      dataBreach: false,
      publicImpact: false,
      resolution: 'Automated reporting workflow implemented. Integration between SIEM and compliance dashboard operational. ARTP acknowledged proactive self-reporting and corrective measures.',
      lessonsLearned: '1. Automate all regulatory reporting workflows\n2. Implement deadline tracking with escalation\n3. Regular compliance health checks\n4. Maintain open communication with regulator',
    },
  ]

  for (const incident of incidents) {
    await prisma.incident.create({ data: incident })
  }
  
  console.log(`   ✅ Created ${incidents.length} detailed incident scenarios\n`)
}

// ============================================================
// AUDIT LOGS
// ============================================================

async function seedAuditLogs() {
  console.log('📋 Creating audit logs...')
  
  const actions = ['LOGIN', 'LOGOUT', 'ALERT_ACKNOWLEDGE', 'ALERT_ESCALATE', 'INCIDENT_CREATE', 'INCIDENT_UPDATE', 'REPORT_GENERATE', 'CONFIG_CHANGE']
  const resourceTypes = ['Alert', 'Incident', 'User', 'Report', 'System']
  
  const auditLogs = Array.from({ length: 200 }, (_, i) => ({
    userId: (await prisma.findMany ? 'placeholder' : '1'), // Will be fixed below
    action: actions[i % actions.length],
    resourceType: resourceTypes[i % resourceTypes.length],
    resourceId: `resource-${i}`,
    oldValue: i % 3 === 0 ? JSON.stringify({ status: 'old' }) : null,
    newValue: JSON.stringify({ status: 'new', updatedBy: 'system' }),
    ipAddress: `10.100.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (SOC Dashboard)',
    createdAt: new Date(Date.now() - i * 3600000), // Spread over last 200 hours
  }))
  
  // Get a real user ID
  const adminUser = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } })
  if (adminUser) {
    for (const log of auditLogs) {
      log.userId = adminUser.id
      await prisma.auditLog.create({ data: log })
    }
  }
  
  console.log(`   ✅ Created ${auditLogs.length} audit log entries\n`)
}

// ============================================================
// DATASET SUMMARY
// ============================================================

async function printDatasetSummary() {
  const [
    userCount,
    alertCount,
    incidentCount,
    threatActorCount,
    iocCount,
    componentCount,
    dataSourceCount,
    metricCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.alert.count(),
    prisma.incident.count(),
    prisma.threatActor.count(),
    prisma.iOC.count(),
    prisma.systemComponent.count(),
    prisma.dataSource.count(),
    prisma.dailyMetric.count(),
  ])
  
  console.log('   ┌─────────────────────────────────────────────┐')
  console.log('   │         DJEZZY SOC DEMO DATASET             │')
  console.log('   ├─────────────────────────────────────────────┤')
  console.log(`   │  Users:              ${userCount.toString().padStart(4)}                   │`)
  console.log(`   │  Alerts:             ${alertCount.toString().padStart(4)}                   │`)
  console.log(`   │  Incidents:          ${incidentCount.toString().padStart(4)} (scenarios)       │`)
  console.log(`   │  Threat Actors:      ${threatActorCount.toString().padStart(4)}                   │`)
  console.log(`   │  IOCs:               ${iocCount.toString().padStart(4)}                   │`)
  console.log(`   │  System Components:  ${componentCount.toString().padStart(4)}                   │`)
  console.log(`   │  Data Sources:       ${dataSourceCount.toString().padStart(4)}                   │`)
  console.log(`   │  Days of Metrics:    ${metricCount.toString().padStart(4)}                   │`)
  console.log('   ├─────────────────────────────────────────────┤')
  console.log('   │  Organization:       Djezzy Algeria           │')
  console.log(`   │  Subscribers:        ${DEMO_CONFIG.organization.subscribers.padStart(10)}            │`)
  console.log(`   │  Network Elements:   ${DEMO_CONFIG.organization.networkElements.toLocaleString().padStart(10)}            │`)
  console.log(`   │  SOC Analysts:       ${DEMO_CONFIG.organization.socAnalysts.toString().padStart(10)}            │`)
  console.log('   └─────────────────────────────────────────────┘')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
