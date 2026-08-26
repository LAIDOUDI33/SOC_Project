/**
 * Algeria National SOC Platform - Enhanced Seed Data
 * 
 * This script populates the database with realistic data for:
 * - Algerian Telecom Operators (Mobilis, Djezzy, Ooredoo)
 * - ARPT Compliance Framework
 * - Threat Intelligence for North Africa/MENA region
 * - Sample Incidents, Alerts, and Security Events
 * 
 * Run: npx prisma db seed --file prisma/seed-algeria.ts
 */

import { PrismaClient, UserRole, AlertSeverity, AlertStatus, AlertCategory, IncidentSeverity, IncidentStatus, IncidentCategory, IncidentClassification, ImpactLevel, UrgencyLevel, ComponentCategory, ComponentStatus, ThreatActorType, ThreatMotivation, CapabilityLevel, IndicatorType, IndicatorSeverity, IndicatorAction, TLPLevel, IntegrationType, IntegrationStatus, TaskStatus, Priority, TaskType, EvidenceType, EvidenceStatus, NotificationType, NotificationSeverity, AuditAction, ResourceType, PlaybookCategory, PlaybookSeverity, ComplianceFramework, ReportStatus, AssetType, AssetCategory, AssetCriticality, AssetOperationalStatus, SecurityZone, TelecomProtocol, RatType, RoamingStatus, SlaTarget, DataSensitivity, RetentionClass, RetentionAction, DashboardType, DashboardScope, WidgetType, MfaMethod, AuthType, AutomationEngine, TestResult, KillChainPhase, OriginConfidence, SourceQuality, ReportFormat, NotificationChannel, CommentableType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================
// ALGERIAN TELECOM OPERATOR DATA
// ============================================

const ALGERIAN_OPERATORS = {
  MOBILIS: {
    name: 'Mobilis',
    fullName: 'Algérie Télécom Mobile (Mobilis)',
    mcc: '603',  // Mobile Country Code for Algeria
    mnc: '01',   // Mobile Network Code for Mobilis
    networkName: 'Mobilis',
    hlrAddress: 'hlr.mobilis.dz',
    gtpProxy: 'gtp.mobilis.dz:2123',
    radiusServer: 'radius.mobilis.dz:1812',
    ss7PointCode: '2-15-1',
    apns: ['internet.mobilis.dz', 'mms.mobilis.dz', 'iot.mobilis.dz'],
    color: '#00A651',  // Green
    subscriberCount: 18000000,  // ~18M subscribers
    marketShare: 42,
  },
  DJEZZY: {
    name: 'Djezzy',
    fullName: 'Djezzy (Nedjma)',
    mcc: '603',
    mnc: '02',   // MNC for Djezzy
    networkName: 'DJEZZY',
    hlrAddress: 'hlr.djezzy.dz',
    gtpProxy: 'gtp.djezzy.dz:2123',
    radiusServer: 'radius.djezzy.dz:1812',
    ss7PointCode: '2-15-2',
    apns: ['djezzy.net', 'mms.djezzy.net'],
    color: '#ED1C24',  // Red
    subscriberCount: 16000000,  // ~16M subscribers
    marketShare: 37,
  },
  OOREDOO: {
    name: 'Ooredoo',
    fullName: 'Ooredoo Algérie',
    mcc: '603',
    mnc: '03',   // MNC for Ooredoo
    networkName: 'OOREDOO DZ',
    hlrAddress: 'hss.ooredoo.dz',
    gtpProxy: 'gtp.ooredoo.dz:2123',
    radiusServer: 'radius.ooredoo.dz:1812',
    ss7PointCode: '2-15-3',
    apns ['ooredoo.dz', 'ooredoo.internet.dz'],
    color: '#E31837',  // Ooredoo Red
    subscriberCount: 9000000,  // ~9M subscribers
    marketShare: 21,
  }
}

// Algeria regions (Wilayas) for geo-distribution
const ALGERIA_WILAYAS = [
  { code: '16', name: 'Alger', population: 2800000, lat: 36.7538, lng: 3.0588 },
  { code: '31', name: 'Oran', population: 1700000, lat: 35.6911, lng: -0.6417 },
  { code: '40', name: 'Constantine', population: 950000, lat: 36.3650, lng: 6.6147 },
  { code: '09', name: 'Batna', population: 630000, lat: 35.5550, lng: 6.1781 },
  { code: '44', name: 'Sétif', population: 850000, lat: 36.1895, lng: 5.4094 },
  { code: '06', name: 'Béjaïa', population: 520000, lat: 36.7204, lng: 5.0637 },
  { code: '28', name: 'M\'sila', population: 480000, lat: 35.7069, lng: 4.5381 },
  { code: '19', name: 'Djelfa', population: 680000, lat: 34.7500, lng: 3.2500 },
  { code: '12', name: 'Annaba', population: 600000, lat: 36.9000, lng: 7.7667 },
  { code: '29', name: 'Mostaganem', population: 450000, lat: 35.9314, lng: 0.0889 },
]

async function main() {
  console.log('🇩🇿 Seeding Algeria National SOC Platform Database...\n')
  
  const startTime = Date.now()
  
  // ============= CLEAN EXISTING DATA =============
  console.log('🧹 Cleaning existing data...')
  await prisma.comment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.task.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.incident.deleteMany()
  await prisma.indicator.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.threatActor.deleteMany()
  await prisma.complianceReport.deleteMany()
  await prisma.playbook.deleteMany()
  await prisma.integration.deleteMany()
  await prisma.systemComponent.deleteMany()
  await prisma.widget.deleteMany()
  await prisma.dashboard.deleteMany()
  await prisma.retentionPolicy.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ Data cleaned\n')

  // ============= USERS (SOC Team Members) =============
  console.log('👥 Creating SOC team users...')
  
  const users = await Promise.all([
    // Super Admin
    prisma.user.create({
      data: {
        email: 'admin@algeria-soc.dz',
        name: 'Dr. Amina Benali',
        passwordHash: await hash('Admin@2026!Secure', 12),
        role: UserRole.SUPER_ADMIN,
        department: 'Direction Générale',
        phone: '+213 555 0101',
        locale: 'fr-DZ',
        mfaEnabled: true,
        mfaMethod: MfaMethod.TOTP,
      }
    }),
    // SOC Manager
    prisma.user.create({
      data: {
        email: 'soc-manager@algeria-soc.dz',
        name: 'Karim Hadj-Ahmed',
        passwordHash: await hash('Manager@2026!Secure', 12),
        role: UserRole.MANAGER,
        department: 'Centre des Opérations de Sécurité',
        phone: '+213 555 0102',
        locale: 'fr-DZ',
      }
    }),
    // Senior Analysts
    prisma.user.create({
      data: {
        email: 'analyst-senior@algeria-soc.dz',
        name: 'Fatima Zerhouni',
        passwordHash: await hash('Analyst@2026!Secure', 12),
        role: UserRole.SENIOR_ANALYST,
        department: 'Analyse des Menaces',
        phone: '+213 555 0103',
        locale: 'fr-DZ',
      }
    }),
    // Threat Hunter
    prisma.user.create({
      data: {
        email: 'hunter@algeria-soc.dz',
        name: 'Yacine Bouaziz',
        passwordHash: await hash('Hunter@2026!Secure', 12),
        role: UserRole.THREAT_HUNTER,
        department: 'Chasse aux Menaces',
        phone: '+213 555 0104',
        locale: 'fr-DZ',
      }
    }),
    // Incident Responder
    prisma.user.create({
      data: {
        email: 'responder@algeria-soc.dz',
        name: 'Leila Mansouri',
        passwordHash: await hash('Responder@2026!Secure', 12),
        role: UserRole.INCIDENT_RESPONDER,
        department: 'Réponse aux Incidents',
        phone: '+213 555 0105',
        locale: 'fr-DZ',
      }
    }),
    // Telecom Specialist
    prisma.user.create({
      data: {
        email: 'telecom-analyst@algeria-soc.dz',
        name: 'Mohamed Chérif',
        passwordHash: await hash('Telecom@2026!Secure', 12),
        role: UserRole.ANALYST,
        department: 'Sécurité Télécom',
        phone: '+213 555 0106',
        locale: 'fr-DZ',
      }
    }),
    // ARPT Compliance Officer
    prisma.user.create({
      data: {
        email: 'arpt-officer@algeria-soc.dz',
        name: 'Sara Amrouche',
        passwordHash: await hash('Arpt@2026!Secure', 12),
        role: UserRole.ANALYST,
        department: 'Conformité ARPT',
        phone: '+213 555 0107',
        locale: 'fr-DZ',
      }
    }),
    // Viewer (Junior)
    prisma.user.create({
      data: {
        email: 'viewer@algeria-soc.dz',
        name: 'Omar Kaci',
        passwordHash: await hash('Viewer@2026!Secure', 12),
        role: UserRole.VIEWER,
        department: 'Stagiaire SOC',
        phone: '+213 555 0108',
        locale: 'fr-DZ',
      }
    }),
  ])
  console.log(`✅ Created ${users.length} users\n`)

  // ============= TELECOM OPERATOR ASSETS =============
  console.log('📡 Registering telecom operator infrastructure...')
  
  const assets = []
  
  // Mobilis Infrastructure
  for (const [type, config] of [
    [AssetType.HLR, { name: 'HLR-MOB-Primary', location: 'Alger (Oued Smar)', vendor: 'Huawei' }],
    [AssetType.HSS, { name: 'HSS-MOB-LTE', location: 'Alger (Oued Smar)', vendor: 'Ericsson' }],
    [AssetType.MSC, { name: 'MSC-MOB-Alger', location: 'Alger (Didouche)', vendor: 'Nokia' }],
    [AssetType.GGSN, { name: 'GGSN-MOB-Core', location: 'Alger (Data Center)', vendor: 'Huawei' }],
    [AssetType.SGSN, { name: 'SGSN-MOB-Core', location: 'Alger (Data Center)', vendor: 'Huawei' }],
    [AssetType.STP, { name: 'STP-MOB-Primary', location: 'Alger (Core)', vendor: 'ZTE' }],
    [AssetType.DRA, { name: 'DRA-MOB-Diameter', location: 'Alger (Core)', vendor: 'Oracle' }],
    [AssetType.ENODEB, { name: 'eNB-MOB-Alger-Centre', location: 'Alger Centre', vendor: 'Huawei' }],
    [AssetType.ENODEB, { name: 'eNB-MOB-Oran', location: 'Oran (Sidi Chahmi)', vendor: 'Ericsson' }],
    [AssetType.ENODEB, { name: 'eNB-MOB-Constantine', location: 'Constantine (Nouville)', vendor: 'Huawei' }],
  ] as [AssetType, { name: string; location: string; vendor: string }][]) {
    assets.push(await prisma.asset.create({
      data: {
        assetId: `AST-${String(type).substring(0, 3)}-${(assets.length + 1).toString().padStart(3, '0')}`,
        name: config.name,
        description: `${config.vendor} ${type} - ${ALGERIAN_OPERATORS.MOBILIS.name}`,
        type,
        category: type.includes('NODEB') || type.includes('BTS') || type.includes('RNC') || type.includes('BSC') ? AssetCategory.RADIO_ACCESS_NETWORK : AssetCategory.CORE_NETWORK,
        criticality: [AssetType.HLR, AssetType.HSS].includes(type) ? AssetCriticality.MISSION_CRITICAL : AssetCriticality.BUSINESS_CRITICAL,
        location: config.location,
        locationCode: config.location.split('(')[1]?.replace(')', '') || '',
        region: config.location.split('(')[0]?.trim() || '',
        vendor: config.vendor,
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.RESTRICTED,
        complianceRequired: ['ARPT_TELECOM', 'ISO_27001'],
        arptRegistered: true,
        arptRegistrationRef: `ARPT-ATM-${Date.now().toString(36)}`,
        monitoringEnabled: true,
        monitoringTool: 'Prometheus/Grafana',
        ownerId: users[5].id, // Telecom analyst
      }
    }))
  }

  // Djezzy Infrastructure
  for (const [type, config] of [
    [AssetType.HLR, { name: 'HLR-DJZ-Primary', location: 'Alger (Bab Ezzouar)', vendor: 'Ericsson' }],
    [AssetType.HSS, { name: 'HSS-DJZ-LTE', location: 'Alger (Bab Ezzouar)', vendor: 'Ericsson' }],
    [AssetType.MSC, { name: 'MSC-DJZ-Alger', location: 'Alger (Hussein Dey)', vendor: 'Ericsson' }],
    [AssetType.GGSN, { name: 'GGSN-DJZ-Core', location: 'Oran (Shatel)', vendor: 'Nokia' }],
    [AssetType.STP, { name: 'STP-DJZ-Primary', location: 'Alger (Core)', vendor: 'Huawei' }],
    [AssetType.ENODEB, { name: 'eNB-DJZ-Alger-Centre', location: 'Alger Centre', vendor: 'Ericsson' }],
    [AssetType.ENODEB, { name: 'eNB-DJZ-Oran', location: 'Oran (Es Senia)', vendor: 'Nokia' }],
  ] as [AssetType, { name: string; location: string; vendor: string }][]) {
    assets.push(await prisma.asset.create({
      data: {
        assetId: `AST-${String(type).substring(0, 3)}-${(assets.length + 1).toString().padStart(3, '0')}`,
        name: config.name,
        description: `${config.vendor} ${type} - ${ALGERIAN_OPERATORS.DJEZZY.name}`,
        type,
        category: type.includes('NODEB') || type.includes('BTS') ? AssetCategory.RADIO_ACCESS_NETWORK : AssetCategory.CORE_NETWORK,
        criticality: [AssetType.HLR, AssetType.HSS].includes(type) ? AssetCriticality.MISSION_CRITICAL : AssetCriticality.BUSINESS_CRITICAL,
        location: config.location,
        locationCode: config.location.split('(')[1]?.replace(')', '') || '',
        region: config.location.split('(')[0]?.trim() || '',
        vendor: config.vendor,
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.RESTRICTED,
        complianceRequired: ['ARPT_TELECOM', 'ISO_27001'],
        arptRegistered: true,
        arptRegistrationRef: `ARPT-DJZ-${Date.now().toString(36)}`,
        monitoringEnabled: true,
        monitoringTool: 'Prometheus/Grafana',
        ownerId: users[5].id,
      }
    }))
  }

  // Ooredoo Infrastructure
  for (const [type, config] of [
    [AssetType.HSS, { name: 'HSS-OOR-Primary', location: 'Alger (Rouiba)', vendor: 'Nokia' }],
    [AssetType.MME, { name: 'MME-OOR-Core', location: 'Alger (Rouiba)', vendor: 'Nokia' }],
    [AssetType.SGW, { name: 'SGW-OOR-Core', location: 'Alger (Data Center)', vendor: 'Nokia' }],
    [AssetType.PGW, { name: 'PGW-OOR-Core', location: 'Alger (Data Center)', vendor: 'Nokia' }],
    [AssetType.ENODEB, { name: 'eNB-OOR-Alger-Centre', location: 'Alger Centre', vendor: 'Nokia' }],
    [AssetType.ENODEB, { name: 'eNB-OOR-Oran', location: 'Oran (Aéroport)', vendor: 'Nokia' }],
  ] as [AssetType, { name: string; location: string; vendor: string }][]) {
    assets.push(await prisma.asset.create({
      data: {
        assetId: `AST-${String(type).substring(0, 3)}-${(assets.length + 1).toString().padStart(3, '0')}`,
        name: config.name,
        description: `${config.vendor} ${type} - ${ALGERIAN_OPERATORS.OOREDOO.name}`,
        type,
        category: type.includes('NODEB') || type.includes('BTS') ? AssetCategory.RADIO_ACCESS_NETWORK : AssetCategory.CORE_NETWORK,
        criticality: [AssetType.HSS, AssetType.MME].includes(type) ? AssetCriticality.MISSION_CRITICAL : AssetCriticality.BUSINESS_CRITICAL,
        location: config.location,
        locationCode: config.location.split('(')[1]?.replace(')', '') || '',
        region: config.location.split('(')[0]?.trim() || '',
        vendor: config.vendor,
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.RESTRICTED,
        complianceRequired: ['ARPT_TELECOM', 'ISO_27001'],
        arptRegistered: true,
        arptRegistrationRef: `ARPT-OOR-${Date.now().toString(36)}`,
        monitoringEnabled: true,
        monitoringTool: 'Prometheus/Grafana',
        ownerId: users[5].id,
      }
    }))
  }

  // SOC Platform Assets
  const socAssets = await Promise.all([
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-001',
        name: 'SOC Dashboard Server',
        description: 'Next.js 16 Application Server - Primary Node',
        type: AssetType.SERVER,
        category: AssetCategory.IT_INFRASTRUCTURE,
        criticality: AssetCriticality.MISSION_CRITICAL,
        location: 'DC-Alger-1',
        ipAddress: '10.0.1.10',
        hostname: 'soc-primary.algeria-soc.dz',
        vendor: 'Dell',
        model: 'PowerEdge R750',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.HIGH_SECURITY,
        monitoringEnabled: true,
        monitoringTool: 'Prometheus/Node Exporter',
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-002',
        name: 'PostgreSQL Database Cluster',
        description: 'PostgreSQL 15 Primary Instance - SOC Data',
        type: AssetType.DATABASE,
        category: AssetCategory.IT_INFRASTRUCTURE,
        criticality: AssetCriticality.MISSION_CRITICAL,
        location: 'DC-Alger-1',
        ipAddress: '10.0.1.20',
        hostname: 'postgres-primary.algeria-soc.dz',
        vendor: 'PostgreSQL',
        model: '15.4',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.RESTRICTED,
        monitoringEnabled: true,
        monitoringTool: 'Prometheus/pgExporter',
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-003',
        name: 'Redis Cache Cluster',
        description: 'Redis 7 Cache Layer - Session & Rate Limiting',
        type: AssetType.CACHE,
        category: AssetCategory.IT_INFRASTRUCTURE,
        criticality: AssetCriticality.HIGH,
        location: 'DC-Alger-1',
        ipAddress: '10.0.1.30',
        hostname: 'redis-cluster.algeria-soc.dz',
        vendor: 'Redis',
        model: '7.2',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.INTERNAL,
        monitoringEnabled: true,
        monitoringTool: 'Redis Exporter',
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-004',
        name: 'Wazuh SIEM Server',
        description: 'Wazuh 4.x - Security Information Event Management',
        type: AssetType.SIEM,
        category: AssetCategory.SECURITY_SYSTEMS,
        criticality: AssetCriticality.MISSION_CRITICAL,
        location: 'DC-Alger-1',
        ipAddress: '10.0.2.10',
        hostname: 'wazuh.algeria-soc.dz',
        vendor: 'Wazuh',
        model: '4.7.0',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.HIGH_SECURITY,
        monitoringEnabled: true,
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-005',
        name: 'Suricata IDS/IPS',
        description: 'Suricata 7.x - Network Intrusion Detection',
        type: AssetType.IDS_IPS,
        category: AssetCategory.SECURITY_SYSTEMS,
        criticality: AssetCriticality.HIGH,
        location: 'DC-Alger-NetworkEdge',
        ipAddress: '10.0.0.100',
        hostname: 'suricata.algeria-soc.dz',
        vendor: 'OISF',
        model: '7.0.3',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.DMZ,
        monitoringEnabled: true,
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-006',
        name: 'TheHive Case Management',
        description: 'TheHive 5.x - Incident Response & Case Management',
        type: AssetType.CASE_MANAGEMENT,
        category: AssetCategory.APPLICATIONS,
        criticality: AssetCriticality.HIGH,
        location: 'DC-Alger-1',
        ipAddress: '10.0.2.20',
        hostname: 'thehive.algeria-soc.dz',
        vendor: 'TheHive Project',
        model: '5.3',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.HIGH_SECURITY,
        monitoringEnabled: true,
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-007',
        name: 'MISP Threat Intelligence',
        description: 'MISP 2.4 - Malware Information Sharing Platform',
        type: AssetType.INTELLIGENCE_PLATFORM,
        category: AssetCategory.SECURITY_SYSTEMS,
        criticality: AssetCriticality.HIGH,
        location: 'DC-Alger-1',
        ipAddress: '10.0.2.30',
        hostname: 'misp.algeria-soc.dz',
        vendor: 'MISP Project',
        model: '2.4.180',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.HIGH_SECURITY,
        monitoringEnabled: true,
        ownerId: users[0].id,
      }
    }),
    prisma.asset.create({
      data: {
        assetId: 'AST-SOC-008',
        name: 'RabbitMQ Message Queue',
        description: 'RabbitMQ 4.x - Event Processing Pipeline',
        type: AssetType.MESSAGE_QUEUE,
        category: AssetCategory.IT_INFRASTRUCTURE,
        criticality: AssetCriticality.HIGH,
        location: 'DC-Alger-1',
        ipAddress: '10.0.1.40',
        hostname: 'rabbitmq.algeria-soc.dz',
        vendor: 'Broadcom',
        model: '4.0.0',
        operationalStatus: AssetOperationalStatus.OPERATIONAL,
        securityZone: SecurityZone.INTERNAL,
        monitoringEnabled: true,
        ownerId: users[0].id,
      }
    }),
  ])
  assets.push(...socAssets)
  console.log(`✅ Created ${assets.length} telecom & SOC assets\n`)

  // ============= SYSTEM COMPONENTS =============
  console.log('⚙️ Registering system components...')
  
  const components = await Promise.all([
    // Core SOC Components
    prisma.systemComponent.create({
      data: {
        name: 'soc-dashboard',
        displayName: 'SOC Dashboard (Next.js)',
        category: ComponentCategory.INFRASTRUCTURE,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 98,
        version: '16.0.0',
        uptimeSeconds: 2592000n, // 30 days
        cpuUsage: 35.2,
        memoryUsage: 62.5,
        endpoint: 'https://soc.algeria-soc.dz',
        eventsToday: 125000n,
        alertsToday: 47,
        errorsToday: 2,
        slaUptimeTarget: 99.9,
        slaUptimeActual: 99.95,
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'postgresql-db',
        displayName: 'PostgreSQL 15 Database',
        category: ComponentCategory.DATABASE,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 99,
        version: '15.4',
        uptimeSeconds: 2592000n,
        cpuUsage: 45.0,
        memoryUsage: 78.2,
        diskUsage: 62.0,
        endpoint: 'postgresql://localhost:5432/soc_prod',
        slaUptimeTarget: 99.99,
        slaUptimeActual: 99.98,
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'redis-cache',
        displayName: 'Redis 7 Cache',
        category: ComponentCategory.CACHE,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 100,
        version: '7.2.4',
        uptimeSeconds: 2592000n,
        cpuUsage: 15.5,
        memoryUsage: 45.0,
        memoryUsage: 42.0,
        endpoint: 'redis://localhost:6379',
        eventsToday: 500000n,
        slaUptimeTarget: 99.95,
        slaUptimeActual: 99.97,
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'wazuh-siem',
        displayName: 'Wazuh SIEM',
        category: ComponentCategory.SIEM,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 95,
        version: '4.7.0',
        uptimeSeconds: 2500000n,
        cpuUsage: 68.0,
        memoryUsage: 72.0,
        endpoint: 'https://wazuh.algeria-soc.dz',
        eventsToday: 850000n,
        alertsToday: 234,
        errorsToday: 5,
        dependencies: ['postgresql-db', 'redis-cache'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'suricata-ids',
        displayName: 'Suricata IDS/IPS',
        category: ComponentCategory.IDS_IPS,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 92,
        version: '7.0.3',
        uptimeSeconds: 2400000n,
        cpuUsage: 82.0,
        memoryUsage: 58.0,
        networkIn: 1200000000n,
        networkOut: 450000000n,
        eventsToday: 2100000n,
        alertsToday: 89,
        dependencies: ['redis-cache'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'thehive-cases',
        displayName: 'TheHive Case Management',
        category: ComponentCategory.SOAR,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 97,
        version: '5.3.4',
        uptimeSeconds: 2550000n,
        cpuUsage: 42.0,
        memoryUsage: 55.0,
        endpoint: 'https://thehive.algeria-soc.dz',
        dependencies: ['postgresql-db', 'elasticsearch'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'misp-intel',
        displayName: 'MISP Threat Intelligence',
        category: ComponentCategory.TIP,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 96,
        version: '2.4.180',
        uptimeSeconds: 2480000n,
        cpuUsage: 55.0,
        memoryUsage: 68.0,
        endpoint: 'https://misp.algeria-soc.dz',
        dependencies: ['postgresql-db', 'redis-cache'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'rabbitmq-queue',
        displayName: 'RabbitMQ Message Queue',
        category: ComponentCategory.MESSAGE_QUEUE,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 99,
        version: '4.0.0',
        uptimeSeconds: 2600000n,
        cpuUsage: 22.0,
        memoryUsage: 38.0,
        endpoint: 'amqp://rabbitmq:5672',
        eventsToday: 1500000n,
        dependencies: [],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'grafana-monitoring',
        displayName: 'Grafana Monitoring',
        category: ComponentCategory.MONITORING,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 100,
        version: '11.0.0',
        uptimeSeconds: 2700000n,
        cpuUsage: 18.0,
        memoryUsage: 32.0,
        endpoint: 'https://grafana.algeria-soc.dz',
        dependencies: ['prometheus-tsdb'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'prometheus-tsdb',
        displayName: 'Prometheus Time Series DB',
        category: ComponentCategory.MONITORING,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 100,
        version: '2.52.0',
        uptimeSeconds: 2700000n,
        cpuUsage: 28.0,
        memoryUsage: 48.0,
        diskUsage: 55.0,
        endpoint: 'http://prometheus:9090',
      }
    }),
    // Telecom-specific components
    prisma.systemComponent.create({
      data: {
        name: 'telecom-gateway-mobilis',
        displayName: 'Telecom Gateway - Mobilis',
        category: ComponentCategory.TELECOM_SIGNALLING,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 94,
        version: '3.2.1',
        uptimeSeconds: 2000000n,
        cpuUsage: 55.0,
        memoryUsage: 65.0,
        endpoint: 'gtp://gtp.mobilis.dz:2123',
        eventsToday: 3500000n,
        alertsToday: 12,
        dependencies: ['rabbitmq-queue', 'postgresql-db'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'telecom-gateway-djezzy',
        displayName: 'Telecom Gateway - Djezzy',
        category: ComponentCategory.TELECOM_SIGNALLING,
        status: ComponentStatus.DEGRADED,
        healthScore: 78,
        version: '3.1.0',
        uptimeSeconds: 1900000n,
        cpuUsage: 88.0,
        memoryUsage: 85.0,
        endpoint: 'gtp://gtp.djezzy.dz:2123',
        eventsToday: 2800000n,
        alertsToday: 34,
        errorsToday: 8,
        dependencies: ['rabbitmq-queue', 'postgresql-db'],
      }
    }),
    prisma.systemComponent.create({
      data: {
        name: 'telecom-gateway-ooredoo',
        displayName: 'Telecom Gateway - Ooredoo',
        category: ComponentCategory.TELECOM_CORE,
        status: ComponentStatus.OPERATIONAL,
        healthScore: 96,
        version: '3.3.0',
        uptimeSeconds: 2100000n,
        cpuUsage: 48.0,
        memoryUsage: 58.0,
        endpoint: 's6a://hss.ooredoo.dz:3868',
        eventsToday: 2200000n,
        alertsToday: 8,
        dependencies: ['rabbitmq-queue', 'postgresql-db'],
      }
    }),
  ])
  console.log(`✅ Registered ${components.length} system components\n`)

  // ============= INTEGRATIONS =============
  console.log('🔌 Configuring integrations...')
  
  const integrations = await Promise.all([
    // Wazuh SIEM
    prisma.integration.create({
      data: {
        name: 'Wazuh SIEM Production',
        type: IntegrationType.SIEM,
        description: 'Primary Wazuh cluster for log collection and correlation',
        endpoint: 'https://wazuh.algeria-soc.dz',
        authType: AuthType.API_KEY,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        lastHealthCheck: new Date(),
        eventsProcessed: 125000000n,
        capabilities: ['log_collection', 'alert_generation', 'file_integrity', 'vulnerability_detection'],
        supportedActions: ['fetch_alerts', 'fetch_agents', 'run_query'],
        healthScore: 95,
        responseTimeAvg: 120,
        syncFrequency: '30s',
        isEnabled: true,
        runningVersion: '4.7.0',
        config: { maxAlertsPerQuery: 1000, retentionDays: 90 },
      }
    }),
    // Suricata
    prisma.integration.create({
      data: {
        name: 'Suricata IDS Cluster',
        type: IntegrationType.IDS_IPS,
        description: 'Network intrusion detection at DC perimeter',
        endpoint: 'http://suricata:8080',
        authType: AuthType.NO_AUTH,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 89000000n,
        capabilities: ['packet_inspection', 'signature_detection', 'protocol_analysis'],
        supportedActions: ['get_alerts', 'get_stats', 'update_rules'],
        healthScore: 92,
        responseTimeAvg: 85,
        syncFrequency: '15s',
        isEnabled: true,
        runningVersion: '7.0.3',
      }
    }),
    // TheHive
    prisma.integration.create({
      data: {
        name: 'TheHive IR Platform',
        type: IntegrationType.CASE_MANAGEMENT,
        description: 'Incident case management and response orchestration',
        endpoint: 'https://thehive.algeria-soc.dz',
        authType: AuthType.API_KEY,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 4500n,
        capabilities: ['case_management', 'task_tracking', 'observable_analysis'],
        supportedActions: ['create_case', 'update_case', 'add_observable'],
        healthScore: 97,
        responseTimeAvg: 200,
        syncFrequency: '1m',
        isEnabled: true,
        runningVersion: '5.3.4',
      }
    }),
    // MISP
    prisma.integration.create({
      data: {
        name: 'MISP Threat Intel',
        type: IntegrationType.INTELLIGENCE_PLATFORM,
        description: 'Threat intelligence sharing platform',
        endpoint: 'https://misp.algeria-soc.dz',
        authType: AuthType.API_KEY,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 156000n,
        capabilities: ['ioc_management', 'threat_feeds', 'yara_rules', 'sigma_rules'],
        supportedActions: ['search_iocs', 'create_event', 'get_feed'],
        healthScore: 96,
        responseTimeAvg: 350,
        syncFrequency: '5m',
        isEnabled: true,
        runningVersion: '2.4.180',
      }
    }),
    // Mobilis Telecom Integration
    prisma.integration.create({
      data: {
        name: 'Mobilis Signaling Interface',
        type: IntegrationType.TELECOM_SIGTRAN,
        description: 'SIGTRAN/SS7 gateway for Mobilis network monitoring',
        endpoint: 'sigtran://stp.mobilis.dz:3456',
        authType: AuthType.MTLS,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 35000000n,
        capabilities: ['ss7_monitoring', 'gtp_analysis', 'diameter_inspection'],
        supportedActions: ['query_hlr', 'trace_call', 'analyze_signaling'],
        healthScore: 94,
        responseTimeAvg: 50,
        syncFrequency: 'realtime',
        isEnabled: true,
        operatorConfig: ALGERIAN_OPERATORS.MOBILIS as any,
      }
    }),
    // Djezzy Telecom Integration
    prisma.integration.create({
      data: {
        name: 'Djezzy Signaling Interface',
        type: IntegrationType.TELECOM_SIGTRAN,
        description: 'SIGTRAN/SS7 gateway for Djezzy network monitoring',
        endpoint: 'sigtran://stp.djezzy.dz:3456',
        authType: AuthType.MTLS,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 28000000n,
        errorCount: 15,
        consecutiveErrors: 2,
        capabilities: ['ss7_monitoring', 'gtp_analysis', 'fraud_detection'],
        supportedActions: ['query_hlr', 'trace_call', 'detect_fraud'],
        healthScore: 78,
        responseTimeAvg: 180,
        syncFrequency: 'realtime',
        isEnabled: true,
        operatorConfig: ALGERIAN_OPERATORS.DJEZZY as any,
      }
    }),
    // Ooredoo Telecom Integration
    prisma.integration.create({
      data: {
        name: 'Ooredoo Diameter Interface',
        type: IntegrationType.TELECOM_GTP,
        description: 'GTP/Diameter interface for Ooredoo LTE/5G monitoring',
        endpoint: 's6a://dra.ooredoo.dz:3868',
        authType: AuthType.MTLS,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        eventsProcessed: 22000000n,
        capabilities: ['lte_monitoring', '5g_sa_analysis', 'diameter_routing'],
        supportedActions: ['query_hss', 'trace_session', 'analyze_5g'],
        healthScore: 96,
        responseTimeAvg: 45,
        syncFrequency: 'realtime',
        isEnabled: true,
        operatorConfig: ALGERIAN_OPERATORS.OOREDOO as any,
      }
    }),
    // Grafana
    prisma.integration.create({
      data: {
        name: 'Grafana Dashboards',
        type: IntegrationType.MONITORING,
        description: 'Visualization and alerting platform',
        endpoint: 'https://grafana.algeria-soc.dz',
        authType: AuthType.API_KEY,
        status: IntegrationStatus.ACTIVE,
        lastSync: new Date(),
        capabilities: ['dashboards', 'alerts', 'data_sources'],
        supportedActions: ['list_dashboards', 'get_dashboard', 'create_alert'],
        healthScore: 100,
        responseTimeAvg: 90,
        syncFrequency: '30s',
        isEnabled: true,
        runningVersion: '11.0.0',
      }
    }),
  ])
  console.log(`✅ Configured ${integrations.length} integrations\n`)

  // ============= THREAT ACTORS (North Africa Focus) =============
  console.log('🎭 Creating threat actor profiles...')
  
  const threatActors = await Promise.all([
    prisma.threatActor.create({
      data: {
        name: 'APT40 / MENA Phantom',
        alias: ['MENA Cyber Group', 'Operation Desert Storm'],
        description: 'Advanced persistent threat group targeting North African telecommunications infrastructure. Believed to be state-sponsored with focus on intelligence gathering from mobile operators.',
        type: ThreatActorType.APT,
        motivation: ThreatMotivation.ESPIONAGE,
        capability: CapabilityLevel.ADVANCED,
        confidence: 0.85,
        country: 'CN',
        region: 'Asia',
        originConfidence: OriginConfidence.HIGH,
        firstSeen: new Date('2023-06-15'),
        lastSeen: new Date(),
        isActive: true,
        targetSectors: ['Telecommunications', 'Government', 'Energy'],
        targetCountries: ['DZ', 'TN', 'MA', 'EG'],
        targetRegions: ['MENA', 'North Africa', 'Maghreb'],
        tactics: ['InitialAccess', 'Collection', 'Exfiltration'],
        techniques: ['T1190', 'T1078', 'T1041'], // Exploit Public-Facing App, Valid Accounts, Exfiltration Over C2 Channel
        financialMotivation: null,
        knownInfrastructure: ['103.21.244.[0-255]', 'malware-cdn[.]net'],
        sourceQuality: SourceQuality.GOOD,
        notes: 'Known to use custom malware targeting SS7 vulnerabilities. Active since 2023.',
      }
    }),
    prisma.threatActor.create({
      data: {
        name: 'Scorpion Fraud Ring',
        alias: ['SIM Swap Gang', 'Operation Scorpion'],
        description: 'Organized crime syndicate specializing in SIM swap attacks against Algerian mobile subscribers. Primary motivation is financial theft via banking app takeover.',
        type: ThreatActorType.CRIME_SYNDICATE,
        motivation: ThreatMotivation.FINANCIAL_GAIN,
        capability: CapabilityLevel.INTERMEDIATE,
        confidence: 0.92,
        country: 'DZ',
        region: 'North Africa',
        originConfidence: OriginConfidence.VERY_HIGH,
        firstSeen: new Date('2024-01-20'),
        lastSeen: new Date(),
        isActive: true,
        targetSectors: ['Banking', 'Telecommunications', 'E-commerce'],
        targetCountries: ['DZ'],
        targetRegions: ['Maghreb'],
        tactics: ['InitialAccess', 'Credential Access', 'Impact'],
        techniques: ['T1566', 'T1539', 'T1589'], // Phishing, Steal Web Session Cookie, Gather Victim Identity Info
        financialMotivation: 'Estimated losses exceed 50M DZD in 2024-2025',
        knownInfrastructure: ['192.168.[0-255].[0-255]', 'phishing-[a-z]{5}.top'],
        sourceQuality: SourceQuality.EXCELLENT,
        notes: 'Active collaboration with insider threats at telecom operators confirmed.',
      }
    }),
    prisma.threatActor.create({
      data: {
        name: 'Ghost Signal',
        alias: ['SS7 Phantom', 'Interceptor Group'],
        description: 'Threat actor exploiting SS7 protocol vulnerabilities for location tracking and call interception. Targets high-value individuals in North Africa.',
        type: ThreatActorType.STATE_SPONSORED,
        motivation: ThreatMotivation.INTELLIGENCE_GATHERING,
        capability: CapabilityLevel.EXPERT,
        confidence: 0.78,
        country: 'UNKNOWN',
        region: 'Global',
        originConfidence: OriginConfidence.MEDIUM,
        firstSeen: new Date('2022-11-10'),
        lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        isActive: true,
        targetSectors: ['Government', 'Military', 'Diplomatic'],
        targetCountries: ['DZ', 'MA', 'TN', 'LY'],
        targetRegions: ['MENA'],
        tactics: ['Discovery', 'Collection', 'Command and Control'],
        techniques: ['T1046', 'T1482', 'T1573'], // System Service Discovery, Domain Trust Discovery, Encrypted Channel
        financialMotivation: null,
        knownInfrastructure: ['SS7 global title spoofing', 'roaming partner exploitation'],
        sourceQuality: SourceQuality.MEDIUM,
        notes: 'Likely nation-state capability. Uses legitimate roaming agreements for interception.',
      }
    }),
    prisma.threatActor.create({
      data: {
        name: 'Premium Rate Pirates',
        alias: ['IRSF Gang', 'PBX Hackers'],
        description: 'International Revenue Share Fraud (IRSF) operation targeting Algerian operators. Compromises PBX systems to generate premium-rate traffic.',
        type: ThreatActorType.CRIME_SYNDICATE,
        motivation: ThreatMotivation.TELECOM_REVENUE_FRAUD,
        capability: CapabilityLevel.INTERMEDIATE,
        confidence: 0.88,
        country: 'NG',
        region: 'West Africa',
        originConfidence: OriginConfidence.HIGH,
        firstSeen: new Date('2024-03-05'),
        lastSeen: new Date(),
        isActive: true,
        targetSectors: ['Telecommunications'],
        targetCountries: ['DZ', 'MA', 'TN'],
        targetRegions: ['Africa', 'MENA'],
        tactics: ['InitialAccess', 'Persistence', 'Impact'],
        techniques: ['T1190', 'T1078', 'T1484'], // Exploit Public-Facing App, Valid Accounts, Domain/Hostname Modification
        financialMotivation: 'Estimated monthly revenue: $200K-$500K USD',
        knownInfrastructure: ['compromised-pbx-[0-9]{3}[.]com'],
        sourceQuality: SourceQuality.GOOD,
        notes: 'Collaborates with international IRSF networks. Uses premium rate numbers in high-cost destinations.',
      }
    }),
    prisma.threatActor.create({
      data: {
        name: 'Hacktivist Algeria',
        alias: ['Digital Resistance', 'Cyber Dissidents'],
        description: 'Hacktivist collective targeting government and telecom infrastructure in protest actions. Low sophistication but high visibility.',
        type: ThreatActorType.HACKTIVIST,
        motivation: ThreatMotivation.IDEOLOGICAL,
        capability: CapabilityLevel.NOVICE,
        confidence: 0.95,
        country: 'DZ',
        region: 'North Africa',
        originConfidence: OriginConfidence.VERY_HIGH,
        firstSeen: new Date('2024-02-14'),
        lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        isActive: true,
        targetSectors: ['Government', 'Telecommunications', 'Media'],
        targetCountries: ['DZ'],
        targetRegions: ['Maghreb'],
        tactics: ['InitialAccess', 'Impact'],
        techniques: ['T1498', 'T1499'], // Denial of Service, Endpoint Denial of Service
        financialMotivation: null,
        knownInfrastructure: ['Various booter services'],
        sourceQuality: SourceQuality.EXCELLENT,
        notes: 'Primarily uses DDoS attacks and website defacements. Announces operations on social media.',
      }
    }),
  ])
  console.log(`✅ Created ${threatActors.length} threat actor profiles\n`)

  // ============= INDICATORS OF COMPROMISE (IOCs) =============
  console.log('🎯 Loading indicators of compromise...')
  
  const indicators = []
  
  // Add IOCs for each threat actor
  for (const actor of threatActors) {
    const iocsByActor: Record<string, Partial<{
      type: IndicatorType;
      value: string;
      tlp: TLPLevel;
      severity: IndicatorSeverity;
      action: IndicatorAction;
      killChainPhase: KillChainPhase;
    }>[]> = {
      'APT40 / MENA Phantom': [
        { type: IndicatorType.IP_ADDRESS, value: '103.21.244.56', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.CRITICAL, action: IndicatorAction.BLOCK_AND_ALERT, killChainPhase: KillChainPhase.COMMAND_AND_CONTROL },
        { type: IndicatorType.DOMAIN, value: 'malware-cdn-update.net', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, action: IndicatorAction.BLOCK_AND_ALERT, killChainPhase: KillChainPhase.COMMAND_AND_CONTROL },
        { type: IndicatorType.FILE_HASH_SHA256, value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', tlp: TLPLevel.RED, severity: IndicatorSeverity.CRITICAL, action: IndicatorAction.QUARANTINE_FILE, killChainPhase: KillChainPhase.INSTALLATION },
        { type: IndicatorType.YARA_RULE, value: 'Rule_APT40_MenaPhantom_Backdoor v2.1', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, action: IndicatorAction.ALERT_ONLY, killChainPhase: KillChainPhase.WEAPONIZATION },
        { type: IndicatorType.SS7_GLOBAL_TITLE, value: '2-15-1-XXXX (pattern match)', tlp: TLPLevel.GREEN, severity: IndicatorSeverity.MEDIUM, action: IndicatorAction.NOTIFY_OPERATOR, killChainPhase: KillChainPhase.EXPLOITATION },
      ],
      'Scorpion Fraud Ring': [
        { type: IndicatorType.PHONE_NUMBER, value: '+213-555-01XX (SIM swap targets)', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, action: IndicatorAction.ALERT_ONLY, killChainPhase: KillChainPhase.ACTIONS_ON_OBJECTIVES },
        { type: IndicatorType.EMAIL, value: 'securite-mobilis@verification-dz.com', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.HIGH, action: IndicatorAction.BLOCK_AND_ALERT, killChainPhase: KillChainPhase.DELIVERY },
        { type: IndicatorType.URL, value: 'http://verification-compte-mobilis.dz/login', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.CRITICAL, action: IndicatorAction.BLOCK_AND_ALERT, killChainPhase: KillChainPhase.DELIVERY },
        { type: IndicatorType.IMSI, value: '60301XXXXXXXXXX (target range)', tlp: TLPLevel.AMBER_STRICT, severity: IndicatorSeverity.CRITICAL, action: IndicatorAction.NOTIFY_OPERATOR, killChainPhase: KillChainPhase.RECONNAISSANCE },
        { type: IndicatorType.JA3_HASH, value: 'b32309126f9cd7f8bde8e87b4e54a1f4e', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.MEDIUM, action: IndicatorAction.ALERT_ONLY, killChainPhase: KillChainPhase.COMMAND_AND_CONTROL },
      ],
      'Ghost Signal': [
        { type: IndicatorType.SS7_GLOBAL_TITLE, value: 'Unknown HLR queries pattern', tlp: TLPLevel.RED, severity: IndicatorSeverity.CRITICAL, action: IndicatorAction.NOTIFY_OPERATOR, killChainPhase: KillChainPhase.RECONNAISSANCE },
        { type: IndicatorType.IP_CIDR_BLOCK, value: '45.33.32.0/24', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, action: IndicatorAction.BLOCK_AND_ALERT, killChainPhase: KillChainPhase.COMMAND_AND_CONTROL },
        { type: IndicatorType.GTP_TUNNEL_ID, value: 'Suspicious tunnel patterns', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, action: IndicatorAction.ALERT_ONLY, killChainPhase: KillChainPhase.EXPLOITATION },
      ],
      'Premium Rate Pirates': [
        { type: IndicatorType.PHONE_NUMBER, value: '+882-XXXXXXXXX (satellite premium)', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.MEDIUM, action: IndicatorAction.RATE_LIMIT, killChainPhase: KillChainPhase.ACTIONS_ON_OBJECTIVES },
        { type: IndicatorType.IP_ADDRESS, value: '185.162.247.[0-255]', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.HIGH, action: IndicatorAction.BLOCK, killChainPhase: KillChainPhase.COMMAND_AND_CONTROL },
        { type: IndicatorType.DOMAIN, value: 'compromised-pbx-047.com', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.HIGH, action: IndicatorAction.BLOCK, killChainPhase: KillChainPhase.DELIVERY },
      ],
      'Hacktivist Algeria': [
        { type: IndicatorType.URL, value: 'http://tempora-mutantur.dz/', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.LOW, action: IndicatorAction.ALERT_ONLY, killChainPhase: KillChainPhase.WEAPONIZATION },
        { type: IndicatorType.HOSTNAME, value: 'ddos-booter-alg.dynu.com', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.MEDIUM, action: IndicatorAction.BLOCK, killChainPhase: KillChainPhase.WEAPONIZATION },
      ],
    }
    
    const iocs = iocsByActor[actor.name] || []
    
    for (const ioc of iocs) {
      indicators.push(await prisma.indicator.create({
        data: {
          type: ioc.type!,
          value: ioc.value!,
          description: `IOC associated with ${actor.name}`,
          tlp: ioc.tlp!,
          confidence: 0.8 + Math.random() * 0.2,
          severity: ioc.severity!,
          source: 'SOC Analysis',
          threatActorId: actor.id,
          validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          isActive: true,
          detectionCount: Math.floor(Math.random() * 50),
          firstDetected: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          lastDetected: new Date(),
          action: ioc.action!,
          killChainPhase: ioc.killChainPhase,
          tags: [actor.name.toLowerCase().replace(/\s+/g, '-'), 'algeria', 'mena'],
          labels: ['validated', 'active'],
        }
      }))
    }
  }
  
  // Add generic telecom-specific IOCs
  const genericIocs = [
    { type: IndicatorType.IMSI, value: '603012000000001', tlp: TLPLevel.GREEN, severity: IndicatorSeverity.HIGH, description: 'Test IMSI for monitoring validation' },
    { type: IndicatorType.IMEI, value: '356938035643809', tlp: TLPLevel.GREEN, severity: IndicatorSeverity.MEDIUM, description: 'Known compromised IMEI' },
    { type: IndicatorType.ICCID, value: '8921032000001234567f', tlp: TLPLevel.GREEN, severity: IndicatorSeverity.MEDIUM, description: 'Fraudulent ICCID pattern' },
    { type: IndicatorType.MSISDN, value: '+213550000001', tlp: TLPLevel.AMBER, severity: IndicatorSeverity.HIGH, description: 'Test MSISDN for fraud detection' },
    { type: IndicatorType.APN_NAME, value: 'malicious-apn.dz', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.CRITICAL, description: 'Unauthorized APN configuration' },
    { type: IndicatorType.SURICATA_RULE, value: 'alert http any any -> any any (msg:"ALGERIA-SOC Suspicious SS7 Traffic"; flow:to_server; content:"ss7-attack"; sid:1000001; rev:1;)', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.HIGH, description: 'Custom Suricata rule for SS7 attack detection' },
    { type: IndicatorType.SIGMA_RULE, value: 'title: Algeria Telecom Anomaly\ndetection:\n  selection...\nlevel: high', tlp: TLPLevel.WHITE, severity: IndicatorSeverity.MEDIUM, description: 'Sigma rule for telecom anomaly detection' },
  ]
  
  for (const ioc of genericIocs) {
    indicators.push(await prisma.indicator.create({
      data: {
        type: ioc.type,
        value: ioc.value,
        description: ioc.description,
        tlp: ioc.tlp,
        severity: ioc.severity,
        source: 'SOC Intelligence Team',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        action: IndicatorAction.ALERT_ONLY,
        tags: ['algeria', 'telecom', 'validation'],
        labels: ['generic', 'monitoring'],
      }
    }))
  }
  console.log(`✅ Loaded ${indicators.length} indicators\n`)

  // ============= SAMPLE INCIDENTS =============
  console.log('🚨 Creating sample incidents...')
  
  const incidents = await Promise.all([
    // Critical SS7 Attack Incident
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-042',
        title: 'SS7 Location Tracking Attack Detected on Mobilis Network',
        description: 'Security analysts detected suspicious SS7 SendRoutingInfoForSM requests targeting high-profile subscribers. The attack appears to use a compromised roaming partner to query subscriber locations. Initial analysis indicates potential state-sponsored activity.',
        severity: IncidentSeverity.SEV0,
        status: IncidentStatus.IN_PROGRESS,
        category: IncidentCategory.SS7_VULNERABILITY,
        classification: IncidentClassification.TRUE_POSITIVE,
        impact: ImpactLevel.CRITICAL,
        urgency: UrgencyLevel.CRITICAL,
        handlerId: users[3].id, // Threat hunter
        team: 'Threat Hunting Team',
        escalationTeam: ['SOC Management', 'ARPT Liaison', 'Mobilis Security'],
        slaTarget: SlaTarget.P1_CRITICAL_15MIN,
        slaActualResponse: 8, // minutes
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        acknowledgedAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
        containedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        telecomImpact: { affectedProtocols: ['SS7_MAP'], estimatedQueries: 15000, durationMinutes: 127 },
        subscribersAffected: 245n,
        baseStationsAffected: 0,
        networkRegion: '16', // Alger
        servicesImpacted: ['Location Services', 'SMS Routing'],
        affectedAssets: [assets[0].id], // HLR-MOB-Primary
        dataBreach: false,
        dataSensitivity: DataSensitivity.TELECOM_SUBSCRIBER,
        rootCause: 'Compromised SS7 roaming partner link exploited for location tracking queries',
        remediationActions: ['Block malicious global titles', 'Implement additional SS7 firewalls rules', 'Coordinate with mobilis NOC', 'Notify ARPT if required'],
        arptNotifiable: true,
        regulatoryFindings: 'Potential violation of telecommunications privacy regulations. Assessment ongoing.',
        costEstimate: 500000.0, // Estimated response cost in DZD
        currency: 'DZD',
        tags: ['ss7', 'location-tracking', 'mobilis', 'critical', 'privacy'],
        complianceImpact: ['ARPT_TELECOM', 'GDPR'],
      }
    }),
    // SIM Swap Fraud Campaign
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-043',
        title: 'Coordinated SIM Swap Attack Campaign Targeting Banking Customers',
        description: 'Multiple SIM swap requests detected across all three operators within 48-hour window. Attackers are using social engineering to convince customer service representatives to port victim numbers. At least 12 banking accounts have been compromised with total estimated losses of 2.5M DZD.',
        severity: IncidentSeverity.SEV1,
        status: IncidentStatus.CONTAINED,
        category: IncidentCategory.SIM_SWAP_ATTACK,
        classification: IncidentClassification.TRUE_POSITIVE,
        impact: ImpactLevel.MAJOR,
        urgency: UrgencyLevel.HIGH,
        handlerId: users[4].id, // Incident responder
        team: 'Incident Response Team',
        escalationTeam: ['SOC Management', 'Banking Liaison', 'All Operators'],
        slaTarget: SlaTarget.P2_HIGH_1HOUR,
        slaActualResponse: 25,
        detectedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        acknowledgedAt: new Date(Date.now() - 47 * 60 * 60 * 1000),
        containedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        subscribersAffected: 12n,
        servicesImpacted: ['Mobile Banking', 'Authentication Services'],
        dataBreach: true,
        recordsAffected: 12,
        dataSensitivity: DataSensitivity.PERSONAL_DATA_PII,
        rootCause: 'Social engineering combined with information gathering from social media',
        resolution: 'Additional verification procedures implemented across all operators. Affected customers notified.',
        lessonsLearned: 'Need for enhanced CSR training and real-time fraud detection integration between banks and operators.',
        arptNotifiable: true,
        arptNotificationDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
        arptReference: 'ARPT-2026-SIMSWAP-001',
        actualCost: 3200000.0,
        currency: 'DZD',
        tags: ['sim-swap', 'fraud', 'banking', 'social-engineering', 'multi-operator'],
        complianceImpact: ['ARPT_TELECOM', 'NCSA_ALGERIA', 'Banking Regulations'],
      }
    }),
    // DDoS Attack
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-044',
        title: 'DDoS Attack Against Ooredoo DNS Infrastructure',
        description: 'Volumetric DDoS attack peaking at 45 Gbps targeting Ooredoo authoritative DNS servers. Attack originated from botnet with primarily Algerian IP space (likely infected IoT devices). Service degradation observed for 23 minutes.',
        severity: IncidentSeverity.SEV2,
        status: IncidentStatus.RECOVERY,
        category: IncidentCategory.DDoS,
        classification: IncidentClassification.TRUE_POSITIVE,
        impact: ImpactLevel.MODERATE,
        urgency: UrgencyLevel.HIGH,
        handlerId: users[2].id, // Senior analyst
        team: 'Network Security Team',
        slaTarget: SlaTarget.P3_MEDIUM_4HOURS,
        detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        acknowledgedAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
        containedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        baseStationsAffected: 0,
        networkRegion: 'NATIONAL',
        servicesImpacted: ['DNS Resolution', 'Web Portal'],
        rootCause: 'IoT botnet utilized for DNS amplification attack',
        remediationActions: ['Activated Cloudflare mitigation', 'Implemented rate limiting', 'Coordinated with CERT-DZ'],
        totalDowntime: 23, // minutes
        tags: ['ddos', 'dns', 'ooredoo', 'botnet', 'iot'],
      }
    }),
    // Insider Threat
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-045',
        title: 'Privileged Access Abuse - Djezzy Provisioning System',
        description: 'Detection of unauthorized subscriber record access by privileged account in Djezzy provisioning system. Account queried 2,500+ subscriber records outside normal operational parameters. Potential data exfiltration under investigation.',
        severity: IncidentSeverity.SEV1,
        status: IncidentStatus.TRIAGE,
        category: IncidentCategory.INSIDER_THREAT,
        classification: IncidentClassification.UNKNOWN,
        impact: ImpactLevel.MAJOR,
        urgency: UrgencyLevel.CRITICAL,
        handlerId: users[1].id, // Manager
        team: 'Insider Threat Team',
        escalationTeam: ['HR', 'Legal', 'Djezzy Management', 'Law Enforcement'],
        slaTarget: SlaTarget.P1_CRITICAL_15MIN,
        detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        subscribersAffected: 2500n,
        servicesImpacted: ['Subscriber Privacy', 'Provisioning System Integrity'],
        dataBreach: true,
        recordsAffected: 2500,
        dataSensitivity: DataSensitivity.PERSONAL_DATA_PII,
        arptNotifiable: true,
        tags: ['insider-threat', 'djezzy', 'privileged-access', 'investigation', 'pia'],
        complianceImpact: ['ARPT_TELECOM', 'Labor Law', 'Data Protection'],
      }
    }),
    // GTP Tunnel Exploitation
    prisma.incident.create({
      data: {
        incidentId: 'INC-2026-046',
        title: 'GTP Tunnel Hijacking Attempt Detected',
        description: 'Security monitoring detected attempts to establish unauthorized GTP tunnels towards external gateways. Attack technique consistent with DNS spoofing via rogue GTP-U tunnels. All three operators may be affected.',
        severity: IncidentSeverity.SEV2,
        status: IncidentStatus.DETECTED,
        category: IncidentCategory.SIGNALLING_ATTACK,
        classification: IncidentClassification.TRUE_POSITIVE,
        impact: ImpactLevel.MODERATE,
        urgency: UrgencyLevel.HIGH,
        handlerId: users[5].id, // Telecom analyst
        team: 'Telecom Security Team',
        slaTarget: SlaTarget.P2_HIGH_1HOUR,
        detectedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        telecomImpact: { affectedProtocols: ['GTP', 'GTP_V2'], tunnelAttempts: 45, targetGateways: ['Internet'] },
        servicesImpacted: ['Data Session Integrity', 'User Plane Security'],
        tags: ['gtp', 'tunnel-hijacking', 'dns-spoofing', 'data-plane'],
        complianceImpact: ['GSMA_NAAS', 'ETSI_EN303'],
      }
    }),
  ])
  console.log(`✅ Created ${incidents.length} sample incidents\n`)

  // ============= SAMPLE ALERTS =============
  console.log('📊 Generating sample alerts...')
  
  const alerts = []
  const alertTemplates = [
    // SS7 Attack Alerts
    {
      title: 'SS7 SendRoutingInfoForSM Anomaly - Unusual Query Pattern',
      description: 'Multiple SRI-for-SM queries from unexpected global title. Pattern indicates possible location tracking attempt.',
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.SS7_ATTACK,
      source: 'Suricata-SS7',
      telecomProtocol: TelecomProtocol.SS7_MAP,
      sourceIp: '45.33.32.100',
      imsi: '603012345678901',
      msisdn: '+213550012345',
      threatIntelMatch: true,
      iocIndicator: '45.33.32.[0-255]',
      iocType: IndicatorType.IP_ADDRESS,
      incidentId: incidents[0].id,
      assignedToId: users[3].id,
      arptReportable: true,
    },
    {
      title: 'SS7 Unauthorized Subscribe Operation',
      description: 'Subscribe operation received from unverified global title. Possible IMSI catcher activity.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.IMSI_CATCHER,
      source: 'TelecomGateway-Mobilis',
      telecomProtocol: TelecomProtocol.SS7_MAP,
      imsi: '603019876543210',
      msisdn: '+213550987654',
      threatIntelMatch: false,
      incidentId: incidents[0].id,
      arptReportable: true,
    },
    // SIM Swap Alerts
    {
      title: 'Multiple Port Requests for Single Subscriber',
      description: 'Unusual pattern: 3 port requests within 24 hours for same MSISDN. Possible SIM swap preparation.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.SIM_SWAP,
      source: 'FraudDetectionSystem',
      msisdn: '+213551234567',
      threatIntelMatch: true,
      iocIndicator: '+213-555-01XX (SIM swap targets)',
      iocType: IndicatorType.PHONE_NUMBER,
      incidentId: incidents[1].id,
      assignedToId: users[4].id,
      arptReportable: true,
    },
    {
      title: 'CSR Authentication Bypass Attempt',
      description: 'Failed authentication attempt using leaked CSR credentials. IP matches known phishing C2 server.',
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.UNAUTHORIZED_ACCESS,
      source: 'Wazuh',
      sourceIp: '185.162.247.50',
      username: 'csr_mobilis_02',
      threatIntelMatch: true,
      iocIndicator: '185.162.247.[0-255]',
      iocType: IndicatorType.IP_ADDRESS,
      incidentId: incidents[1].id,
      arptReportable: true,
    },
    // DDoS Alerts
    {
      title: 'DNS Amplification Attack Detected',
      description: 'High volume of DNS queries with amplification characteristics. Source: diverse Algerian IP space.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.DOS,
      source: 'Suricata',
      sourceIp: '10.0.0.0/8', // Internal IPs (botnet)
      destinationIp: '172.16.5.10', // DNS server
      destinationPort: 53,
      protocol: 'UDP',
      packetLength: 512,
      incidentId: incidents[2].id,
      assignedToId: users[2].id,
    },
    {
      title: 'Traffic Volume Anomaly Exceeding Baseline 400%',
      description: 'Inbound traffic to DNS infrastructure significantly above threshold. Possible DDoS.',
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.NETWORK_ANOMALY,
      source: 'Prometheus',
      destinationIp: '172.16.5.0/24',
      incidentId: incidents[2].id,
    },
    // Insider Threat Alerts
    {
      title: 'Bulk Subscriber Record Access Outside Business Hours',
      description: 'Service account accessed 500+ subscriber records at 02:43 AM. Pattern inconsistent with scheduled jobs.',
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.INSIDER_THREAT,
      source: 'Wazuh',
      username: 'svc_provision_djezzy',
      sourceIp: '10.5.1.100',
      rawEvent: { eventType: 'database_query', table: 'subscribers', count: 2567, timestamp: '2026-07-26T02:43:12Z' },
      incidentId: incidents[3].id,
      assignedToId: users[1].id,
      arptReportable: true,
    },
    {
      title: 'Large Data Export from Provisioning System',
      description: 'CSV export initiated containing PII fields. File size: 45MB. Recipient: external email domain.',
      severity: AlertSeverity.CRITICAL,
      category: AlertCategory.DATA_BREACH,
      source: 'DLP_System',
      username: 'svc_provision_djezzy',
      rawEvent: { action: 'export', format: 'csv', rows: 2500, piiFields: ['name', 'address', 'id_document'] },
      incidentId: incidents[3].id,
      arptReportable: true,
    },
    // GTP Alerts
    {
      title: 'Rogue GTP Tunnel Establishment Attempt',
      description: 'Create Session Request to non-approved destination. Destination IP not in allowed GTP peer list.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.SIGNALLING_ATTACK,
      source: 'TelecomGateway-Ooredoo',
      telecomProtocol: TelecomProtocol.GTP,
      sourceIp: '10.6.1.50', // PGW
      destinationIp: '91.121.80.50', // External
      destinationPort: 2152,
      imsi: '603031111222333',
      apn: 'internet.ooredoo.dz',
      ratType: RatType.LTE,
      incidentId: incidents[4].id,
      assignedToId: users[5].id,
    },
    {
      title: 'GTP-U Packet Anomaly - Unexpected Outer Header',
      description: 'GTP-U packets with malformed outer header detected. Possible tunnel hijacking indicator.',
      severity: AlertSeverity.MEDIUM,
      category: AlertCategory.NETWORK_ANOMALY,
      source: 'Suricata-GTP',
      telecomProtocol: TelecomProtocol.GTP,
      sourceIp: '10.6.1.51',
      destinationPort: 2152,
      incidentId: incidents[4].id,
    },
    // Generic Security Alerts
    {
      title: 'Brute Force Login Attempt - Admin Panel',
      description: '100+ failed login attempts in 5 minutes from single IP. Target: SOC admin panel.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.UNAUTHORIZED_ACCESS,
      source: 'Wazuh',
      sourceIp: '198.51.100.23',
      username: 'admin',
      mitreTechnique: 'T1110 - Brute Force',
    },
    {
      title: 'Malware Signature Detected - Agent Workstation',
      description: 'Emotet variant detected on analyst workstation. File quarantined. Investigation pending.',
      severity: AlertSeverity.HIGH,
      category: AlertCategory.MALWARE,
      source: 'Wazuh-EDR',
      hostname: 'WS-ANALYST-03',
      filePath: 'C:\\Users\\analyst\\Downloads\\invoice.doc.exe',
      mitreTechnique: 'T1566 - Phishing Attachment',
      mitreId: 'T1566',
    },
    {
      title: 'SSL Certificate Expiring Soon - Grafana',
      description: 'SSL certificate for Grafana dashboard expires in 7 days. Renewal required.',
      severity: AlertSeverity.LOW,
      category: AlertCategory.POLICY_VIOLATION,
      source: 'Certificate Monitor',
      hostname: 'grafana.algeria-soc.dz',
    },
    {
      title: 'Phishing Email Blocked - Tax Refund Theme',
      description: 'Phishing email with "DGI Tax Refund" theme blocked at gateway. Targeted at finance department.',
      severity: AlertSeverity.MEDIUM,
      category: AlertCategory.PHISHING,
      source: 'Email Gateway',
      sourceIp: '192.168.100.55',
      iocIndicator: 'http://impots-dz[.]com/login',
      iocType: IndicatorType.URL,
    },
  ]
  
  for (let i = 0; i < alertTemplates.length; i++) {
    const template = alertTemplates[i]
    const alert = await prisma.alert.create({
      data: {
        alertId: `ALT-202607${(i + 1).toString().padStart(5, '0')}`,
        ...template,
        status: template.severity === AlertSeverity.CRITICAL ? AlertStatus.ACKNOWLEDGED : AlertStatus.NEW,
        confidence: 0.7 + Math.random() * 0.3,
        timestamp: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        firstSeen: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        tags: [template.category?.toLowerCase() || 'security', 'algeria-soc'],
      }
    })
    alerts.push(alert)
  }
  console.log(`✅ Generated ${alerts.length} alerts\n`)

  // ============= PLAYBOOKS =============
  console.log('📋 Loading security playbooks...')
  
  const playbooks = await Promise.all([
    prisma.playbook.create({
      data: {
        name: 'SS7 Attack Response Procedure',
        description: 'Standard operating procedure for responding to SS7 signaling attacks including location tracking, interception, and fraud attempts.',
        category: PlaybookCategory.SS7_ATTACK_RESPONSE,
        severity: PlaybookSeverity.CRITICAL,
        content: `# SS7 Attack Response Playbook

## Overview
This playbook provides step-by-step procedures for responding to SS7 signaling attacks detected on Algerian mobile operator networks.

## Scope
- Applies to all three operators: Mobilis, Djezzy, Ooredoo
- Covers MAP, CAP, ISUP, and SCCP protocols
- Coordinates with ARPT for regulatory requirements

## Trigger Conditions
- Detection of unusual SRI-for-SM patterns
- Unauthorized global title activity
- Location tracking anomalies
- IMSI catcher indicators

## Procedures
### Phase 1: Immediate Containment (0-15 minutes)
1. Verify alert legitimacy
2. Block malicious global titles at STP firewall
3. Notify operator NOC
4. Escalate to SOC Manager

### Phase 2: Investigation (15min - 4 hours)
1. Analyze CDR records for affected subscribers
2. Correlate with other security events
3. Assess data breach scope
4. Document timeline

### Phase 3: Recovery (4-24 hours)
1. Implement permanent firewall rules
2. Coordinate with roaming partners
3. Prepare ARPT notification if required
4. Post-incident review`,
        steps: [
          { order: 1, name: 'Verify Alert', type: 'investigation', automated: false, assigneeRole: 'ANALYST' },
          { order: 2, name: 'Block Global Titles', type: 'containment', automated: true, assigneeRole: 'AUTOMATION' },
          { order: 3, name: 'Notify Operator NOC', type: 'communication', automated: false, assigneeRole: 'MANAGER' },
          { order: 4, name: 'Analyze CDR Records', type: 'forensics', automated: false, assigneeRole: 'THREAT_HUNTER' },
          { order: 5, name: 'Assess Breach Scope', type: 'analysis', automated: false, assigneeRole: 'SENIOR_ANALYST' },
          { order: 6, name: 'Implement Permanent Rules', type: 'containment', automated: true, assigneeRole: 'AUTOMATION' },
          { order: 7, name: 'Prepare ARPT Report', type: 'documentation', automated: false, assigneeRole: 'ARPT_OFFICER' },
          { order: 8, name: 'Post-Incident Review', type: 'analysis', automated: false, assigneeRole: 'MANAGER' },
        ],
        isAutomated: true,
        automationEngine: AutomationEngine.CUSTOM,
        triggers: [{ type: 'alert_category', value: 'SS7_ATTACK' }, { type: 'alert_severity', value: 'CRITICAL' }],
        isPublished: true,
        executionCount: 12,
        successRate: 0.83,
        avgExecutionTime: 145, // minutes
        authorId: users[0].id,
        reviewers: [users[1].id, users[3].id],
        tags: ['ss7', 'telecom', 'signaling', 'critical', 'arpt'],
      }
    }),
    prisma.playbook.create({
      data: {
        name: 'SIM Swap Fraud Response',
        description: 'Response procedures for SIM swap fraud attacks targeting banking customers through mobile operator compromise.',
        category: PlaybookCategory.SIM_SWAP_RESPONSE,
        severity: PlaybookSeverity.HIGH,
        content: `# SIM Swap Fraud Response Playbook

## Overview
Procedures for investigating and responding to SIM swap fraud campaigns affecting banking customers.

## Key Stakeholders
- SOC Team
- Bank Security Teams
- All Three Operators (Mobilis, Djezzy, Ooredoo)
- Law Enforcement (if required)

## Response Phases
1. **Detection**: Identify anomalous port/SIM change patterns
2. **Containment**: Freeze affected accounts, block fraudulent ports
3. **Investigation**: Trace attack vector, identify victims
4. **Recovery**: Restore legitimate service, assist victims
5. **Prevention**: Implement controls to prevent recurrence`,
        steps: [
          { order: 1, name: 'Confirm SIM Swap Pattern', type: 'investigation', automated: false },
          { order: 2, name: 'Identify All Affected Subscribers', type: 'analysis', automated: true },
          { order: 3, name: 'Notify Banks', type: 'communication', automated: false },
          { order: 4, name: 'Block Fraudulent Ports', type: 'containment', automated: true },
          { order: 5, name: 'Preserve Evidence', type: 'forensics', automated: false },
          { order: 6, name: 'Victim Support Process', type: 'recovery', automated: false },
        ],
        isAutomated: false,
        isPublished: true,
        executionCount: 8,
        successRate: 0.75,
        authorId: users[4].id,
        tags: ['sim-swap', 'fraud', 'banking', 'multi-operator'],
      }
    }),
    prisma.playbook.create({
      data: {
        name: 'DDoS Mitigation - Telecom Infrastructure',
        description: 'Mitigation procedures for DDoS attacks targeting DNS, GTP, and web infrastructure of mobile operators.',
        category: PlaybookCategory.DDoS_MITIGATION,
        severity: PlaybookSeverity.HIGH,
        content: `# DDoS Mitigation Playbook

## Attack Types Covered
- Volumetric Attacks (UDP/TCP floods)
- Protocol Attacks (SYN flood, Ping of Death)
- Application Layer Attacks (Slowloris, DNS amplification)

## Mitigation Tiers
1. **Tier 1**: On-premise (Suricata, local WAF)
2. **Tier 2**: ISP Coordination (Algérie Télécom backbone)
3. **Tier 3**: Cloud Scrubbing (Cloudflare, Akamai)`,
        steps: [
          { order: 1, name: 'Characterize Attack', type: 'analysis', automated: true },
          { order: 2, name: 'Activate Local Mitigation', type: 'containment', automated: true },
          { order: 3, name: 'Engage ISP', type: 'coordination', automated: false },
          { order: 4, name: 'Activate Cloud Scrubbing', type: 'containment', automated: true },
          { order: 5, name: 'Monitor and Adjust', type: 'analysis', automated: true },
        ],
        isAutomated: true,
        automationEngine: AutomationEngine.CUSTOM,
        isPublished: true,
        tags: ['ddos', 'mitigation', 'dns', 'infrastructure'],
      }
    }),
    prisma.playbook.create({
      data: {
        name: 'Insider Threat Investigation',
        description: 'Procedures for investigating suspected insider threats involving privileged access abuse or data theft.',
        category: PlaybookCategory.INSIDER_THREAT,
        severity: PlaybookSeverity.CRITICAL,
        content: `# Insider Threat Investigation Playbook

## Legal Considerations
- Follow Algerian labor law requirements
- Coordinate with HR and Legal before action
- Preserve chain of custody for potential prosecution

## Investigation Types
1. **Privileged Access Abuse**
2. **Data Theft/Exfiltration**
3. **Sabotage**
4. **Policy Violations`,
        steps: [
          { order: 1, name: 'Preserve Evidence', type: 'forensics', automated: false },
          { order: 2, name: 'Scope Assessment', type: 'analysis', automated: true },
          { order: 3, name: 'Legal/HR Consultation', type: 'coordination', automated: false },
          { order: 4, name: 'Interview Planning', type: 'investigation', automated: false },
          { order: 5, name: 'Account Restriction Decision', type: 'containment', automated: false },
        ],
        approvalRequired: true,
        approverRoles: ['SUPER_ADMIN', 'MANAGER'],
        isPublished: true,
        tags: ['insider-threat', 'privilege-abuse', 'hr', 'legal'],
      }
    }),
  ])
  console.log(`✅ Loaded ${playbooks.length} playbooks\n`)

  // ============= COMPLIANCE REPORTS =============
  console.log('📄 Generating compliance reports...')
  
  const reports = await Promise.all([
    prisma.complianceReport.create({
      data: {
        name: 'Monthly ARPT Compliance Report - July 2026',
        framework: ComplianceFramework.ARPT_TELECOM,
        status: ReportStatus.PUBLISHED,
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-07-31'),
        generatedAt: new Date(),
        summary: 'Monthly compliance report for Autorité de Régulation de la Poste et des Télécommunications (ARPT). Covers security incidents, fraud statistics, and network availability metrics.',
        findings: [
          { category: 'incidents', count: 5, severity: 'high', description: '5 security incidents handled this month' },
          { category: 'arpt_notifications', count: 2, severity: 'info', description: '2 ARPT notifications submitted' },
          { category: 'availability', score: 99.97, description: 'Overall network availability met SLA' },
        ],
        recommendations: [
          'Enhance SS7 firewall rules based on recent attack patterns',
          'Implement cross-operator fraud detection sharing',
          'Schedule quarterly penetration testing' ],
        score: 87.5,
        riskScore: 12.5,
        authorId: users[6].id, // ARPT officer
        approvedBy: users[0].id,
        approvedAt: new Date(),
        fileFormat: ReportFormat.PDF,
        retentionClass: RetentionClass.REGULATORY,
        retainUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
        arptSubmissionId: 'ARPT-RPT-2026-07-001',
        arptSubmissionDate: new Date(),
        arptAcknowledged: true,
        arptAckDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tags: ['arpt', 'monthly', 'compliance', 'july-2026'],
      }
    }),
    prisma.complianceReport.create({
      data: {
        name: 'ISO 27001 Internal Audit - Q2 2026',
        framework: ComplianceFramework.ISO_27001,
        status: ReportStatus.APPROVED,
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2026-06-30'),
        generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        summary: 'Quarterly internal audit of ISO 27001 controls covering information security management system.',
        findings: [
          { control: 'A.9.4', status: 'compliant', evidence: 'Access review completed' },
          { control: 'A.12.6', status: 'partial', evidence: 'Vulnerability management needs improvement' },
          { control: 'A.16.1', status: 'compliant', evidence: 'Incident response tested' },
        ],
        score: 92.0,
        riskScore: 8.0,
        authorId: users[1].id,
        reviewerId: users[0].id,
        approvedBy: users[0].id,
        approvedAt: new Date(),
        retentionClass: RetentionClass.LONG_TERM,
        tags: ['iso27001', 'audit', 'q2-2026', 'isms'],
      }
    }),
    prisma.complianceReport.create({
      data: {
        name: 'NCSA Alignment Assessment - 2026',
        framework: ComplianceFramework.NCSA_ALGERIA,
        status: ReportStatus.REVIEWING,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-12-31'),
        summary: 'Annual assessment of alignment with National Cybersecurity Strategy of Algeria objectives.',
        score: 78.0,
        riskScore: 22.0,
        authorId: users[0].id,
        retentionClass: RetentionClass.EXTENDED,
        tags: ['ncsa', 'national-strategy', 'cybersecurity', '2026'],
      }
    }),
  ])
  console.log(`✅ Generated ${reports.length} compliance reports\n`)

  // ============= RETENTION POLICIES =============
  console.log('📦 Configuring retention policies...')
  
  const retentionPolicies = await Promise.all([
    prisma.retentionPolicy.create({
      data: {
        name: 'ARPT Audit Log Retention',
        description: 'Mandatory retention of audit logs per ARPT regulations. Minimum 5 years for security-relevant logs.',
        entityType: ResourceType.AUDIT_LOG,
        action: RetentionAction.ARCHIVE,
        retentionPeriodDays: 1825, // 5 years
        gracePeriodDays: 30,
        conditions: { action: ['LOGIN', 'DATA_EXPORT', 'CONFIG_CHANGE', 'INCIDENT_CREATE'] },
        filters: { arptRetainRequired: true },
        schedule: '0 2 * * 0', // Weekly Sunday 2 AM
        isSystemPolicy: true,
        isEnabled: true,
      }
    }),
    prisma.retentionPolicy.create({
      data: {
        name: 'Telecom Event Retention',
        description: 'Retention policy for telecom signaling events (CDR, signaling captures) per ARPT requirements.',
        entityType: ResourceType.TELECOM_EVENT,
        action: RetentionAction.ARCHIVE,
        retentionPeriodDays: 730, // 2 years
        gracePeriodDays: 90,
        conditions: { protocols: ['SS7_MAP', 'GTP', 'DIAMETER', 'RADIUS'] },
        schedule: '0 3 * * *', // Daily 3 AM
        isSystemPolicy: true,
        isEnabled: true,
      }
    }),
    prisma.retentionPolicy.create({
      data: {
        name: 'Alert Archive Policy',
        description: 'Archive resolved alerts after 90 days to cold storage.',
        entityType: ResourceType.ALERT,
        action: RetentionAction.MOVE_TO_COLD_STORAGE,
        retentionPeriodDays: 90,
        gracePeriodDays: 14,
        conditions: { status: ['RESOLVED', 'CLOSED', 'FALSE_POSITIVE'] },
        schedule: '0 1 * * *', // Daily 1 AM
        isEnabled: true,
      }
    }),
    prisma.retentionPolicy.create({
      data: {
        name: 'PII Data Anonymization',
        description: 'Anonymize personally identifiable information after regulatory retention period expires.',
        entityType: ResourceType.SUBSCRIBER_RECORD,
        action: RetentionAction.ANONYMIZE,
        retentionPeriodDays: 1095, // 3 years
        gracePeriodDays: 180,
        isSystemPolicy: true,
        isEnabled: true,
      }
    }),
  ])
  console.log(`✅ Configured ${retentionPolicies.length} retention policies\n`)

  // ============= DEFAULT DASHBOARDS =============
  console.log('📊 Creating default dashboards...')
  
  const dashboards = await Promise.all([
    prisma.dashboard.create({
      data: {
        name: 'SOC Operations Overview',
        description: 'Main SOC operations dashboard showing real-time security posture across all operators',
        type: DashboardType.SOC_OVERVIEW,
        scope: DashboardScope.GLOBAL,
        refreshInterval: 30,
        isDefault: true,
        layout: { cols: 12, rows: 8 },
        createdBy: users[0].id,
      }
    }),
    prisma.dashboard.create({
      data: {
        name: 'Telecom Security Status',
        description: 'Real-time view of telecom-specific security events across Mobilis, Djezzy, and Ooredoo',
        type: DashboardType.TELECOM_OPERATIONS,
        scope: DashboardScope.TEAM,
        refreshInterval: 15,
        layout: { cols: 12, rows: 10 },
        sharedWith: [users[5].id, users[3].id],
        createdBy: users[5].id,
      }
    }),
    prisma.dashboard.create({
      data: {
        name: 'Threat Intelligence Feed',
        description: 'Latest threat intelligence from MISP and internal analysis',
        type: DashboardType.THREAT_INTELLIGENCE,
        scope: DashboardScope.TEAM,
        refreshInterval: 300,
        sharedWith: [users[3].id, users[2].id],
        createdBy: users[3].id,
      }
    }),
    prisma.dashboard.create({
      data: {
        name: 'ARPT Compliance Dashboard',
        description: 'Regulatory compliance metrics and reporting status for ARPT',
        type: DashboardType.COMPLIANCE,
        scope: DashboardScope.ROLE_BASED,
        refreshInterval: 3600,
        editableBy: [users[0].id, users[6].id],
        createdBy: users[6].id,
      }
    }),
    prisma.dashboard.create({
      data: {
        name: 'Executive Summary',
        description: 'High-level KPIs and metrics for executive stakeholders',
        type: DashboardType.EXECUTIVE,
        scope: DashboardScope.PUBLIC,
        refreshInterval: 300,
        isFavorite: true,
        createdBy: users[0].id,
      }
    }),
  ])

  // Add widgets to main dashboard
  const widgets = await Promise.all([
    prisma.widget.create({
      data: {
        dashboardId: dashboards[0].id,
        type: WidgetType.STATUS_GRID,
        title: 'System Health Overview',
        positionX: 0, positionY: 0, width: 6, height: 3,
        config: { showComponents: true, showAlerts: true },
      }
    }),
    prisma.widget.create({
      data: {
        dashboardId: dashboards[0].id,
        type: WidgetType.ALERT_FEED,
        title: 'Recent Alerts',
        positionX: 6, positionY: 0, width: 6, height: 3,
        config: { maxItems: 10, autoRefresh: true },
      }
    }),
    prisma.widget.create({
      data: {
        dashboardId: dashboards[0].id,
        type: WidgetType.LINE_CHART,
        title: 'Alert Trend (7 Days)',
        positionX: 0, positionY: 3, width: 6, height: 3,
        dataSource: 'alerts',
        query: 'group by date(severity)',
      }
    }),
    prisma.widget.create({
      data: {
        dashboardId: dashboards[0].id,
        type: WidgetType.INCIDENT_LIST,
        title: 'Active Incidents',
        positionX: 6, positionY: 3, width: 6, height: 3,
        config: { showSeverity: true, showHandler: true },
      }
    }),
    prisma.widget.create({
      data: {
        dashboardId: dashboards[0].id,
        type: WidgetType.TELECOM_TRAFFIC,
        title: 'Operator Protocol Distribution',
        positionX: 0, positionY: 6, width: 12, height: 2,
        dataSource: 'telecom_stats',
      }
    }),
  ])
  console.log(`✅ Created ${dashboards.length} dashboards with ${widgets.length} widgets\n`)

  // ============= SAMPLE AUDIT LOGS =============
  console.log('📝 Recording audit trail...')
  
  const auditLogs = await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: users[0].id,
        userName: users[0].name,
        userRole: users[0].role,
        action: AuditAction.LOGIN,
        resourceType: ResourceType.USER,
        resourceId: users[0].id,
        resourceName: users[0].email,
        ipAddress: '10.0.0.100',
        sessionId: 'session-admin-001',
        success: true,
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: users[3].id,
        userName: users[3].name,
        userRole: users[3].role,
        action: AuditAction.INCIDENT_ESCALATE,
        resourceType: ResourceType.INCIDENT,
        resourceId: incidents[0].id,
        resourceName: incidents[0].incidentId,
        oldValue: { escalationLevel: 0 },
        newValue: { escalationLevel: 2, escalatedTo: 'SOC Management' },
        changedFields: ['escalationLevel', 'escalatedTo'],
        ipAddress: '10.0.0.101',
        success: true,
        durationMs: 1250,
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: users[4].id,
        userName: users[4].name,
        userRole: users[4].role,
        action: AuditAction.ALERT_ACKNOWLEDGE,
        resourceType: ResourceType.ALERT,
        resourceId: alerts[2].id,
        resourceName: alerts[2].alertId,
        oldValue: { status: 'NEW' },
        newValue: { status: 'ACKNOWLEDGED' },
        changedFields: ['status'],
        ipAddress: '10.0.0.102',
        success: true,
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: users[0].id,
        userName: users[0].name,
        userRole: users[0].role,
        action: AuditAction.PLAYBOOK_EXECUTE,
        resourceType: ResourceType.PLAYBOOK,
        resourceId: playbooks[0].id,
        resourceName: playbooks[0].name,
        metadata: { triggeredBy: 'alert', alertId: alerts[0].id },
        ipAddress: '10.0.0.100',
        success: true,
        durationMs: 4500,
      }
    }),
    prisma.auditLog.create({
      data: {
        userId: users[6].id,
        userName: users[6].name,
        userRole: users[6].role,
        action: AuditAction.REPORT_GENERATE,
        resourceType: ResourceType.COMPLIANCE_REPORT,
        resourceId: reports[0].id,
        resourceName: reports[0].name,
        metadata: { framework: 'ARPT_TELECOM', period: 'July 2026' },
        ipAddress: '10.0.0.105',
        success: true,
        durationMs: 15000,
      }
    }),
  ])
  console.log(`✅ Recorded ${auditLogs.length} audit entries\n`)

  // ============= SAMPLE NOTIFICATIONS =============
  console.log('🔔 Creating notifications...')
  
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[3].id,
        type: NotificationType.ALERT_ESCALATED,
        title: 'Critical SS7 Attack Escalated to You',
        message: `Incident ${incidents[0].incidentId} has been escalated due to critical severity. Immediate attention required.`,
        severity: NotificationSeverity.CRITICAL,
        actionUrl: `/incidents/${incidents[0].id}`,
        actionText: 'View Incident',
        resourceId: incidents[0].id,
        resourceType: 'INCIDENT',
        deliveryChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SLACK],
        sendAt: new Date(),
      }
    }),
    prisma.notification.create({
      data: {
        userId: users[4].id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned: Interview Banking Liaison',
        message: 'You have been assigned a new task for incident INC-2026-043.',
        severity: NotificationSeverity.HIGH,
        actionUrl: '/tasks',
        actionText: 'View Tasks',
        deliveryChannels: [NotificationChannel.IN_APP],
        sendAt: new Date(),
      }
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: NotificationType.SYSTEM_DEGRADED,
        title: 'Djezzy Gateway Degraded Performance',
        message: 'Integration telecom-gateway-djezzy is showing degraded performance. Health score: 78%.',
        severity: NotificationSeverity.MEDIUM,
        resourceId: integrations[5].id,
        resourceType: 'INTEGRATION',
        deliveryChannels: [NotificationChannel.IN_APP, NotificationChannel.SLACK],
        sendAt: new Date(Date.now() - 30 * 60 * 1000),
      }
    }),
    prisma.notification.create({
      data: {
        userId: users[6].id,
        type: NotificationType.ARPT_DEADLINE,
        title: 'ARPT Report Deadline Approaching',
        message: 'Monthly ARPT compliance report is due in 3 days.',
        severity: NotificationSeverity.HIGH,
        actionUrl: '/compliance/reports/new',
        actionText: 'Create Report',
        deliveryChannels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        sendAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      }
    }),
  ])
  console.log(`✅ Created ${notifications.length} notifications\n`)

  // ============= SUMMARY =============
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log('═'.repeat(60))
  console.log('🇩🇿  ALGERIA NATIONAL SOC PLATFORM - SEED COMPLETE')
  console.log('═'.repeat(60))
  console.log(``)
  console.log('📊 SEED DATA SUMMARY:')
  console.log(`   • Users:                ${users.length}`)
  console.log(`   • Assets (Telecom+SOC): ${assets.length}`)
  console.log(`   • System Components:    ${components.length}`)
  console.log(`   • Integrations:         ${integrations.length}`)
  console.log(`   • Threat Actors:        ${threatActors.length}`)
  console.log(`   • Indicators (IOCs):    ${indicators.length}`)
  console.log(`   • Incidents:            ${incidents.length}`)
  console.log(`   • Alerts:               ${alerts.length}`)
  console.log(`   • Playbooks:            ${playbooks.length}`)
  console.log(`   • Compliance Reports:  ${reports.length}`)
  console.log(`   • Retention Policies:  ${retentionPolicies.length}`)
  console.log(`   • Dashboards:           ${dashboards.length}`)
  console.log(`   • Widgets:              ${widgets.length}`)
  console.log(`   • Audit Logs:           ${auditLogs.length}`)
  console.log(`   • Notifications:        ${notifications.length}`)
  console.log(``)
  console.log(`⏱️  Seed completed in ${duration}s`)
  console.log(``)
  console.log('👤 Default Credentials:')
  console.log(`   • Super Admin:  admin@algeria-soc.dz / Admin@2026!Secure`)
  console.log(`   • Manager:      soc-manager@algeria-soc.dz / Manager@2026!Secure`)
  console.log(`   • Analyst:      analyst-senior@algeria-soc.dz / Analyst@2026!Secure`)
  console.log(``)
  console.log('📡 Telecom Operators Configured:')
  console.log(`   • Mobilis  (${ALGERIAN_OPERATORS.MOBILIS.subscriberCount.toLocaleString()} subs, ${ALGERIAN_OPERATORS.MOBILIS.marketShare}% share)`)
  console.log(`   • Djezzy   (${ALGERIAN_OPERATORS.DJEZZY.subscriberCount.toLocaleString()} subs, ${ALGERIAN_OPERATORS.DJEZZY.marketShare}% share)`)
  console.log(`   • Ooredoo  (${ALGERIAN_OPERATORS.OOREDOO.subscriberCount.toLocaleString()} subs, ${ALGERIAN_OPERATORS.OOREDOO.marketShare}% share)`)
  console.log(``)
  console.log('✅ Database seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
