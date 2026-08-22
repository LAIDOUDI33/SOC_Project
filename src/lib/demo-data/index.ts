/**
 * Djezzy National SOC Platform - Demo Data Library
 * 
 * Comprehensive mock data for all dashboards with realistic
 * Algerian telecom context (Djezzy, +213 country code)
 * 
 * @version 1.0.0
 * @last-updated 2026-01-22
 */

// ============================================================
// TYPES
// ============================================================

export interface KPIData {
  title: string
  value: string | number
  change: number
  changeLabel: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  icon?: string
}

export interface AlertData {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  source: string
  timestamp: string
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed'
  assignee: string
  description: string
  sourceIp?: string
  destIp?: string
  mitreTechnique?: string
}

export interface TrendDataPoint {
  date: string
  alerts: number
  incidents: number
  resolved: number
  riskScore: number
}

export interface RiskHeatMapData {
  businessUnit: string
  riskScore: number
  trend: 'up' | 'down' | 'stable'
  category: string
}

export interface SLAData {
  name: string
  target: number
  actual: number
  status: 'met' | 'breached' | 'at-risk'
}

export interface SS7TrafficData {
  messagesPerSecond: number
  peakMessagesPerSecond: number
  protocolDistribution: Record<string, number>
  topTalkers: SS7TopTalker[]
  fraudAlerts: FraudAlert[]
  timeSeriesData: TimeSeriesPoint[]
}

export interface SS7TopTalker {
  opc: string
  dpc: string
  mps: number
  protocol: string
  totalMessages: number
}

export interface FraudAlert {
  type: string
  count: number
  blocked: number
  financialImpact: number
  detectionRate: number
}

export interface TimeSeriesPoint {
  timestamp: string
  value: number
}

export interface ANRTComplianceData {
  overallScore: number
  requirements: ANRTRequirement[]
  lastAuditDate: string
  nextAuditDate: string
  auditorName: string
}

export interface ANRTRequirement {
  id: string
  name: string
  category: string
  status: 'compliant' | 'partial' | 'non-compliant' | 'pending-review'
  evidenceCount: number
  lastAssessment: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface HuntSession {
  id: string
  name: string
  status: 'active' | 'completed' | 'paused' | 'archived'
  results: number
  iocsFound: number
  author: string
  createdAt: string
  lastActivity: string
  hypothesis: string
  tags: string[]
}

export interface SystemComponent {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'maintenance'
  uptime: number
  cpu: number
  memory: number
  disk: number
  lastCheck: string
}

export interface IncidentData {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'contained' | 'eradicated' | 'recovered' | 'closed'
  createdAt: string
  assignee: string
  phase: string
  affectedAssets: number
  description: string
}

// ============================================================
// EXECUTIVE DASHBOARD DATA
// ============================================================

export const executiveKPIs: KPIData[] = [
  {
    title: 'Risk Score',
    value: '23',
    change: -12,
    changeLabel: 'vs last month (improved)',
    status: 'excellent',
    icon: 'shield'
  },
  {
    title: 'MTTR (hrs)',
    value: '2.4',
    change: -18,
    changeLabel: 'improvement this quarter',
    status: 'good',
    icon: 'clock'
  },
  {
    title: 'Asset Coverage',
    value: '94.2%',
    change: 2.1,
    changeLabel: 'new assets monitored',
    status: 'good',
    icon: 'target'
  },
  {
    title: 'Compliance %',
    value: '98.5%',
    change: 0.5,
    changeLabel: 'ANRT requirements met',
    status: 'excellent',
    icon: 'check-circle'
  }
]

export const trendData30Days: TrendDataPoint[] = generateTrendData(30)

function generateTrendData(days: number): TrendDataPoint[] {
  const data: TrendDataPoint[] = []
  const now = new Date()
  
  // Base values for realistic Djezzy SOC data
  const baseAlerts = 85
  const baseIncidents = 12
  const baseResolved = 68
  const baseRiskScore = 28
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Add realistic variation with slight trends
    const dayVariation = Math.sin(i / 5) * 15
    const randomFactor = (Math.random() - 0.5) * 20
    
    data.push({
      date: date.toISOString().split('T')[0],
      alerts: Math.floor(baseAlerts + dayVariation + randomFactor + (i < 10 ? -15 : 5)),
      incidents: Math.floor(baseIncidents + (Math.random() - 0.3) * 8),
      resolved: Math.floor(baseResolved + dayVariation * 0.8 + randomFactor * 0.5),
      riskScore: Math.max(15, Math.min(45, Math.floor(baseRiskScore + (days - i) * 0.3 + (Math.random() - 0.5) * 5)))
    })
  }
  
  return data
}

export const riskHeatMap: RiskHeatMapData[] = [
  { businessUnit: 'Core Network (MSC/HLR)', riskScore: 42, trend: 'down', category: 'Infrastructure' },
  { businessUnit: 'Radio Access Network', riskScore: 35, trend: 'stable', category: 'Infrastructure' },
  { businessUnit: 'IT Systems & Servers', riskScore: 28, trend: 'down', category: 'Technology' },
  { businessUnit: 'Customer Services (CRM)', riskScore: 22, trend: 'stable', category: 'Operations' },
  { businessUnit: 'Billing Systems', riskScore: 38, trend: 'up', category: 'Financial' },
  { businessUnit: 'SS7/Diameter Signaling', riskScore: 55, trend: 'down', category: 'Network Security' },
  { businessUnit: 'Data Centers (Algiers/Oran)', riskScore: 18, trend: 'stable', category: 'Infrastructure' },
  { businessUnit: 'Partner Integrations (B2B)', riskScore: 48, trend: 'up', category: 'External' },
  { businessUnit: 'Mobile Money (Djezzy Cash)', riskScore: 32, trend: 'down', category: 'Financial' },
  { businessUnit: 'Fiber Optic Backbone', riskScore: 25, trend: 'stable', category: 'Infrastructure' }
]

export const slaData: SLAData[] = [
  { name: 'Critical Incident Response (<15min)', target: 95, actual: 97.2, status: 'met' },
  { name: 'High Severity Detection Rate', target: 98, actual: 98.7, status: 'met' },
  { name: 'Threat Intel Dissemination (<30min)', target: 90, actual: 94.5, status: 'met' },
  { name: 'Vulnerability Remediation (72h)', target: 85, actual: 82.3, status: 'at-risk' },
  { name: 'SS7 Attack Response (<5min)', target: 99, actual: 99.8, status: 'met' },
  { name: 'Report Generation (24h)', target: 100, actual: 100, status: 'met' }
]

// ============================================================
// ALERTS DATA (Realistic Djezzy/Algerian Telecom Context)
// ============================================================

export const recentAlerts: AlertData[] = [
  {
    id: 'ALT-2026-00147',
    severity: 'critical',
    title: 'Brute Force Attack Detected - SSH Service',
    source: 'Wazuh SIEM',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Ahmed B.',
    description: 'Multiple failed login attempts from IP 41.101.150.123 targeting core network management server in Algiers DC',
    sourceIp: '41.101.150.123',
    destIp: '196.3.150.50',
    mitreTechnique: 'T1110.001'
  },
  {
    id: 'ALT-2026-00146',
    severity: 'critical',
    title: 'SS7 MAP_AnyTimeInterrogation Surge Detected',
    source: 'SS7 Monitor',
    timestamp: new Date(Date.now() - 28 * 60000).toISOString(),
    status: 'open',
    assignee: 'Karim M.',
    description: 'Unusual spike in ATI queries from OPC 3-065-1 to HLR, potential subscriber tracking attack. Origin: International gateway',
    mitreTechnique: 'T1402'
  },
  {
    id: 'ALT-2026-00145',
    severity: 'high',
    title: 'Suspicious SIM Swap Activity - Oran Region',
    source: 'Fraud Detection System',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'acknowledged',
    assignee: 'Fatima Z.',
    description: 'Multiple SIM swap requests for premium subscribers within 24h from same dealer ID DJZ-ORAN-0147',
    sourceIp: '196.200.87.45',
    mitreTechnique: 'T1534'
  },
  {
    id: 'ALT-2026-00144',
    severity: 'high',
    title: 'DDoS Attack Pattern - DNS Infrastructure',
    source: 'Suricata IDS',
    timestamp: new Date(Date.now() - 67 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Yacine K.',
    description: 'Amplification attack detected against Djezzy DNS servers, query volume 12x normal baseline. Source IPs: 500+ unique Algerian IPs (potential botnet)',
    sourceIp: 'Multiple sources',
    destIp: '196.3.150.10',
    mitreTechnique: 'T1498'
  },
  {
    id: 'ALT-2026-00143',
    severity: 'high',
    title: 'Unauthorized API Access - Billing System',
    source: 'Wazuh SIEM',
    timestamp: new Date(Date.now() - 89 * 60000).toISOString(),
    status: 'open',
    assignee: 'Amina L.',
    description: 'Authentication bypass attempt on billing API endpoint /api/v2/subscribers/balance. Source: Internal network segment 10.40.50.x',
    sourceIp: '10.40.50.178',
    destIp: '10.40.50.10',
    mitreTechnique: 'T1078'
  },
  {
    id: 'ALT-2026-00142',
    severity: 'medium',
    title: 'Malware Signature Detected - Finance Dept',
    source: 'CrowdStrike EDR',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    status: 'resolved',
    assignee: 'Mohamed S.',
    description: 'Trojan.emotet variant detected on workstation FIN-WS-042. File quarantined, user credentials rotated.',
    mitreTechnique: 'T1059.005'
  },
  {
    id: 'ALT-2026-00141',
    severity: 'medium',
    title: 'Phishing Campaign Targeting Djezzy Employees',
    source: 'Proofpoint Email Security',
    timestamp: new Date(Date.now() - 145 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Nadia B.',
    description: 'Spear-phishing emails impersonating IT support requesting password reset. 23 emails blocked, 3 reported by users.',
    mitreTechnique: 'T1566.001'
  },
  {
    id: 'ALT-2026-00140',
    severity: 'high',
    title: 'Diameter Attack - Roaming Interface',
    source: 'SS7 Firewall',
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    status: 'open',
    assignee: 'Omar F.',
    description: 'Invalid ULR/ULA messages detected on S6a interface. Potential IMSI brute force via roaming partner AS12388 (Mediterranean Telecom)',
    mitreTechnique: 'T1404'
  },
  {
    id: 'ALT-2026-00139',
    severity: 'medium',
    title: 'Vulnerability Scan Detected - External Perimeter',
    source: 'Palo Alto NGFW',
    timestamp: new Date(Date.now() - 210 * 60000).toISOString(),
    status: 'acknowledged',
    assignee: 'Samir H.',
    description: 'Automated vulnerability scanning from IP 185.220.101.10 (Tor exit node). Blocked at perimeter firewall.',
    sourceIp: '185.220.101.10',
    mitreTechnique: 'T1595'
  },
  {
    id: 'ALT-2026-00138',
    severity: 'low',
    title: 'Policy Violation - Unauthorized Software',
    source: 'Microsoft Defender',
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
    status: 'closed',
    assignee: 'System',
    description: 'Torrent client detected on workstation ENG-WS-089. Policy enforcement action taken automatically.',
    mitreTechnique: 'T1072'
  },
  {
    id: 'ALT-2026-00137',
    severity: 'critical',
    title: 'IRSF Fraud Pattern Detected - Premium Rate Numbers',
    source: 'Fraud Management System',
    timestamp: new Date(Date.now() - 270 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Leila M.',
    description: 'Unusual traffic surge to +213 XXX international premium rate numbers. Estimated loss: 2,450,000 DZD/hour if not blocked.',
    mitreTechnique: 'T1401'
  },
  {
    id: 'ALT-2026-00136',
    severity: 'medium',
    title: 'SSL Certificate Expiring - Customer Portal',
    source: 'Certificate Monitor',
    timestamp: new Date(Date.now() - 300 * 60000).toISOString(),
    status: 'open',
    assignee: 'Rachid A.',
    description: 'SSL certificate for www.djezzy.dz expires in 7 days. Renewal required to prevent browser warnings.',
    mitreTechnique: ''
  },
  {
    id: 'ALT-2026-00135',
    severity: 'high',
    title: 'Data Exfiltration Attempt - Database Server',
    source: 'Imperva WAF',
    timestamp: new Date(Date.now() - 340 * 60000).toISOString(),
    status: 'resolved',
    assignee: 'Hakim T.',
    description: 'SQL injection attempt followed by large data export query blocked. Attacker used UNION-based technique on customer database.',
    sourceIp: '91.121.87.33',
    destIp: '196.3.151.25',
    mitreTechnique: 'T1190'
  },
  {
    id: 'ALT-2026-00134',
    severity: 'low',
    title: 'Configuration Drift - Core Router',
    source: 'Network Configuration Manager',
    timestamp: new Date(Date.now() - 380 * 60000).toISOString(),
    status: 'acknowledged',
    assignee: 'Nora C.',
    description: 'Unauthorized configuration change detected on CR-ALG-01. ACL rule modified outside maintenance window.',
    mitreTechnique: ''
  },
  {
    id: 'ALT-2026-00133',
    severity: 'medium',
    title: 'Insider Threat Indicator - Bulk Data Access',
    source: 'Splunk UEBA',
    timestamp: new Date(Date.now() - 420 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Djamel R.',
    description: 'User account service_desk_ali accessed 15,000+ customer records in 2 hours - 5x normal pattern. Behavioral anomaly flagged.',
    mitreTechnique: 'T1530'
  },
  {
    id: 'ALT-2026-00132',
    severity: 'high',
    title: 'Zero-Day Exploit Attempt - Web Application',
    source: 'ModSecurity WAF',
    timestamp: new Date(Date.now() - 480 * 60000).toISOString(),
    status: 'open',
    assignee: 'Salima K.',
    description: 'CVE-2024-XXXX exploitation attempt on self-care portal. Request payload indicates known exploit kit usage.',
    sourceIp: '194.163.32.45',
    destIp: '196.3.152.80',
    mitreTechnique: 'T1190'
  },
  {
    id: 'ALT-2026-00131',
    severity: 'medium',
    title: 'APT Indicator - APT28 Tool Signature',
    source: 'CrowdStrike EDR',
    timestamp: new Date(Date.now() - 520 * 60000).toISOString(),
    status: 'investigating',
    assignee: 'Cyber Threat Intel Team',
    description: 'XAgent backdoor communication pattern detected on executive laptop. Possible spear-phishing initial access.',
    mitreTechnique: 'T1105'
  },
  {
    id: 'ALT-2026-00130',
    severity: 'low',
    title: 'Geographic Anomaly - VPN Login',
    source: 'RSA SecurID',
    timestamp: new Date(Date.now() - 560 * 60000).toISOString(),
    status: 'closed',
    assignee: 'System',
    description: 'Impossible travel detected: User logged in from Algiers at 08:00 and London at 08:45. Account temporarily locked.',
    mitreTechnique: 'T1078'
  },
  {
    id: 'ALT-2026-00129',
    severity: 'high',
    title: 'Wangiri Fraud Pattern Identified',
    source: 'FMS (Fraud Management)',
    timestamp: new Date(Date.now() - 600 * 60000).toISOString(),
    status: 'resolved',
    assignee: 'Fraud Team',
    description: 'Missed call fraud ring identified. 847 subscriber numbers involved in wangiri scheme. Blocks applied, ANRT notified per regulation.',
    mitreTechnique: 'T1401'
  },
  {
    id: 'ALT-2026-00128',
    severity: 'medium',
    title: 'IoT Device Anomaly - Smart Meter Network',
    source: 'IoT Security Platform',
    timestamp: new Date(Date.now() - 650 * 60000).toISOString(),
    status: 'open',
    assignee: 'Infrastructure Team',
    description: 'Unusual outbound traffic from 23 smart meters in Constantine region. Potential Mirai variant infection.',
    mitreTechnique: 'T1046'
  }
]

// ============================================================
// TELECOM/SS7 DASHBOARD DATA
// ============================================================

export const ss7TrafficData: SS7TrafficData = {
  messagesPerSecond: 1247,
  peakMessagesPerSecond: 2891,
  protocolDistribution: {
    MAP: 45,
    CAP: 15,
    ISUP: 25,
    SCCP: 10,
    TCAP: 5
  },
  topTalkers: [
    { opc: '3-001-0', dpc: '51-1-0', mps: 342, protocol: 'MAP', totalMessages: 29540000 },
    { opc: '3-065-1', dpc: '3-001-0', mps: 287, protocol: 'ISUP', totalMessages: 24790000 },
    { opc: '3-101-2', dpc: '3-065-1', mps: 198, protocol: 'MAP', totalMessages: 17110000 },
    { opc: '3-102-0', dpc: '3-001-0', mps: 156, protocol: 'CAP', totalMessages: 13480000 },
    { opc: '3-042-1', dpc: '3-101-2', mps: 134, protocol: 'TCAP', totalMessages: 11580000 },
    { opc: '3-003-0', dpc: '3-065-1', mps: 98, protocol: 'MAP', totalMessages: 8467000 },
    { opc: '3-201-0', dpc: '3-001-0', mps: 76, protocol: 'SCCP', totalMessages: 6566000 },
    { opc: '3-001-0', dpc: '3-201-0', mps: 65, protocol: 'ISUP', totalMessages: 5616000 },
    { opc: '51-1-0', dpc: '3-102-0', mps: 54, protocol: 'CAP', totalMessages: 4665000 },
    { opc: '3-065-1', dpc: '3-042-1', mps: 43, protocol: 'MAP', totalMessages: 3715000 }
  ],
  fraudAlerts: [
    { type: 'IRSF (International Revenue Share Fraud)', count: 23, blocked: 18, financialImpact: 2450000, detectionRate: 98.5 },
    { type: 'SIM Swap Fraud', count: 7, blocked: 6, financialImpact: 890000, detectionRate: 95.2 },
    { type: 'Wangiri/Missed Call Fraud', count: 156, blocked: 156, financialImpact: 320000, detectionRate: 99.9 },
    { type: 'CLI Spoofing', count: 12, blocked: 11, financialImpact: 450000, detectionRate: 92.1 },
    { type: 'PBX Hacking', count: 4, blocked: 4, financialImpact: 180000, detectionRate: 100 },
    { type: 'Premium Rate Number Abuse', count: 31, blocked: 28, financialImpact: 1270000, detectionRate: 97.8 }
  ],
  timeSeriesData: generateSS7TimeSeries(24)
}

function generateSS7TimeSeries(hours: number): TimeSeriesPoint[] {
  const data: TimeSeriesPoint[] = []
  const now = new Date()
  
  // Realistic traffic patterns for Algerian mobile network
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now)
    timestamp.setHours(timestamp.getHours() - i)
    
    // Simulate daily patterns: low at night, peaks during day
    const hour = timestamp.getHours()
    let baseLoad = 800
    
    if (hour >= 7 && hour <= 9) baseLoad = 1800  // Morning rush
    else if (hour >= 11 && hour <= 13) baseLoad = 2200  // Lunch period
    else if (hour >= 17 && hour <= 20) baseLoad = 2500  // Evening peak
    else if (hour >= 0 && hour <= 5) baseLoad = 400  // Night
    
    const variation = (Math.random() - 0.5) * baseLoad * 0.3
    
    data.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(Math.max(200, baseLoad + variation))
    })
  }
  
  return data
}

// Algeria Wilaya data for geographic analysis
export const algeriaWilayaData = [
  { code: '16', name: 'Alger', alertCount: 147, riskLevel: 'high', subscriberCount: 4200000 },
  { code: '31', name: 'Oran', alertCount: 89, riskLevel: 'medium', subscriberCount: 1800000 },
  { code: '40', name: 'Constantine', alertCount: 67, riskLevel: 'medium', subscriberCount: 1200000 },
  { code: '03', name: 'Annaba', alertCount: 34, riskLevel: 'low', subscriberCount: 650000 },
  { code: '09', name: 'Blida', alertCount: 45, riskLevel: 'medium', subscriberCount: 980000 },
  { code: '10', name: 'Bouira', alertCount: 23, riskLevel: 'low', subscriberCount: 720000 },
  { code: '19', name: 'Setif', alertCount: 56, riskLevel: 'medium', subscriberCount: 1500000 },
  { code: '25', name: 'Bejaia', alertCount: 38, riskLevel: 'low', subscriberCount: 850000 },
  { code: '27', name: 'Jijel', alertCount: 18, riskLevel: 'low', subscriberCount: 380000 },
  { code: '28', name: 'Skikda', alertCount: 29, riskLevel: 'low', subscriberCount: 520000 },
  { code: '34', name: 'Biskra', alertCount: 41, riskLevel: 'medium', subscriberCount: 680000 },
  { code: '36', name: 'Ouargla', alertCount: 22, riskLevel: 'low', subscriberCount: 580000 },
  { code: '39', name: 'Tlemcen', alertCount: 52, riskLevel: 'medium', subscriberCount: 890000 },
  { code: '44', name: 'Sidi Bel Abbes', alertCount: 31, riskLevel: 'low', subscriberCount: 620000 },
  { code: '48', name: 'Relizane', alertCount: 15, riskLevel: 'low', subscriberCount: 340000 }
]

// ============================================================
// COMPLIANCE DASHBOARD DATA (ANRT Regulations)
// ============================================================

export const anrtComplianceData: ANRTComplianceData = {
  overallScore: 96,
  lastAuditDate: '2025-12-15',
  nextAuditDate: '2026-06-15',
  auditorName: 'ANRT Cybersecurity Division',
  requirements: [
    { id: 'ANRT-001', name: 'Data Localization (Law 18-05)', category: 'Legal', status: 'compliant', evidenceCount: 12, lastAssessment: '2025-12-10', riskLevel: 'low' },
    { id: 'ANRT-002', name: 'Subscriber Privacy (IMSI Protection)', category: 'Privacy', status: 'compliant', evidenceCount: 18, lastAssessment: '2025-12-12', riskLevel: 'low' },
    { id: 'ANRT-003', name: 'Lawful Interception Capability', category: 'Regulatory', status: 'compliant', evidenceCount: 8, lastAssessment: '2025-11-28', riskLevel: 'low' },
    { id: 'ANRT-004', name: 'Cybersecurity Notification (72h)', category: 'Incident Response', status: 'compliant', evidenceCount: 15, lastAssessment: '2025-12-14', riskLevel: 'low' },
    { id: 'ANRT-005', name: 'SS7/Diameter Security Controls', category: 'Network Security', status: 'compliant', evidenceCount: 22, lastAssessment: '2025-12-15', riskLevel: 'low' },
    { id: 'ANRT-006', name: 'Encryption Standards (AES-256)', category: 'Cryptography', status: 'compliant', evidenceCount: 10, lastAssessment: '2025-12-08', riskLevel: 'low' },
    { id: 'ANRT-007', name: 'Access Control & Authentication', category: 'Identity', status: 'compliant', evidenceCount: 14, lastAssessment: '2025-12-11', riskLevel: 'low' },
    { id: 'ANRT-008', name: 'Audit Log Retention (2 years)', category: 'Compliance', status: 'compliant', evidenceCount: 9, lastAssessment: '2025-12-05', riskLevel: 'low' },
    { id: 'ANRT-009', name: 'Incident Response Plan (CSIRT)', category: 'Incident Response', status: 'compliant', evidenceCount: 16, lastAssessment: '2025-12-13', riskLevel: 'low' },
    { id: 'ANRT-010', name: 'Third-party Risk Management', category: 'Vendor Management', status: 'partial', evidenceCount: 6, lastAssessment: '2025-11-20', riskLevel: 'medium' },
    { id: 'ANRT-011', name: 'Business Continuity Planning', category: 'Resilience', status: 'compliant', evidenceCount: 11, lastAssessment: '2025-12-02', riskLevel: 'low' },
    { id: 'ANRT-012', name: 'Staff Training & Awareness', category: 'Human Resources', status: 'compliant', evidenceCount: 24, lastAssessment: '2025-12-14', riskLevel: 'low' },
    { id: 'ANRT-013', name: 'Physical Security (DC Access)', category: 'Physical Security', status: 'compliant', evidenceCount: 7, lastAssessment: '2025-11-30', riskLevel: 'low' },
    { id: 'ANRT-014', name: 'Network Segmentation', category: 'Network Security', status: 'compliant', evidenceCount: 13, lastAssessment: '2025-12-09', riskLevel: 'low' },
    { id: 'ANRT-015', name: 'Vulnerability Management Program', category: 'Security Operations', status: 'partial', evidenceCount: 8, lastAssessment: '2025-12-01', riskLevel: 'medium' }
  ]
}

// Compliance score history (for charts)
export const complianceHistory = [
  { month: 'Jul 2025', score: 89 },
  { month: 'Aug 2025', score: 91 },
  { month: 'Sep 2025', score: 92 },
  { month: 'Oct 2025', score: 94 },
  { month: 'Nov 2025', score: 95 },
  { month: 'Dec 2025', score: 96 },
  { month: 'Jan 2026', score: 96 }
]

// ============================================================
// THREAT HUNTING DATA
// ============================================================

export const huntSessions: HuntSession[] = [
  {
    id: 'HUNT-2026-001',
    name: 'APT28 Indicators - Djezzy Executive Targeting',
    status: 'active',
    results: 47,
    iocsFound: 12,
    author: 'Karim M.',
    createdAt: '2026-01-20T08:30:00Z',
    lastActivity: new Date().toISOString(),
    hypothesis: 'APT28 is targeting telecom executives in North Africa using spear-phishing with XAgent malware',
    tags: ['APT', 'Russia', 'Executive', 'XAgent']
  },
  {
    id: 'HUNT-2026-002',
    name: 'SS7 Vulnerability Scanning Activity Analysis',
    status: 'active',
    results: 134,
    iocsFound: 8,
    author: 'Fatima Z.',
    createdAt: '2026-01-19T10:15:00Z',
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    hypothesis: 'Unknown threat actor probing SS7 infrastructure for MAP vulnerabilities prior to IRSF campaign',
    tags: ['SS7', 'Signaling', 'Reconnaissance']
  },
  {
    id: 'HUNT-2026-003',
    name: 'Internal Lateral Movement Detection',
    status: 'completed',
    results: 289,
    iocsFound: 3,
    author: 'Ahmed B.',
    createdAt: '2026-01-15T09:00:00Z',
    lastActivity: '2026-01-18T16:45:00Z',
    hypothesis: 'Detect potential insider threat or compromised credential usage patterns in billing system',
    tags: ['Insider', 'Lateral Movement', 'Credential']
  },
  {
    id: 'HUNT-2026-004',
    name: 'SIM Box Farm Identification',
    status: 'completed',
    results: 567,
    iocsFound: 23,
    author: 'Fraud Team',
    createdAt: '2026-01-10T14:20:00Z',
    lastActivity: '2026-01-17T11:30:00Z',
    hypothesis: 'Identify active SIM box termination points used for international bypass fraud',
    tags: ['Fraud', 'SIM Box', 'Revenue Assurance']
  },
  {
    id: 'HUNT-2026-005',
    name: 'Zero-Day Web Exploitation Hunting',
    status: 'paused',
    results: 78,
    iocsFound: 2,
    author: 'Yacine K.',
    createdAt: '2026-01-18T07:45:00Z',
    lastActivity: '2026-01-21T09:00:00Z',
    hypothesis: 'Search for web application exploitation attempts targeting self-care portal using novel techniques',
    tags: ['Web', 'Zero-Day', 'Application Security']
  },
  {
    id: 'HUNT-2026-006',
    name: 'DNS Tunneling Detection',
    status: 'active',
    results: 156,
    iocsFound: 5,
    author: 'Nadia B.',
    createdAt: '2026-01-21T06:00:00Z',
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
    hypothesis: 'Identify potential data exfiltration via DNS tunneling from internal network',
    tags: ['DNS', 'Exfiltration', 'Covert Channel']
  }
]

// IOCs found during hunts
export const huntIOCs = [
  { type: 'IP Address', value: '185.220.101.10', confidence: 95, source: 'HUNT-001', firstSeen: '2026-01-18' },
  { type: 'Domain', value: 'djezzy-secure-update[.]tk', confidence: 92, source: 'HUNT-001', firstSeen: '2026-01-19' },
  { type: 'Hash', value: 'a1b2c3d4e5f6...SHA256', confidence: 98, source: 'HUNT-001', firstSeen: '2026-01-20' },
  { type: 'URL', value: 'http://196.3.150[.]99/admin/login', confidence: 87, source: 'HUNT-002', firstSeen: '2026-01-19' },
  { type: 'GT', value: '3-065-1-XXX-XXX', confidence: 75, source: 'HUNT-002', firstSeen: '2026-01-19' },
  { type: 'IMSI Range', value: '2130150XXXXXXXX', confidence: 70, source: 'HUNT-004', firstSeen: '2026-01-12' },
  { type: 'IP Address', value: '91.121.87.[33-38]', confidence: 88, source: 'HUNT-003', firstSeen: '2026-01-16' },
  { type: 'Email', value: 'support@djezzy-security[.]com', confidence: 94, source: 'HUNT-001', firstSeen: '2026-01-17' }
]

// ============================================================
// SYSTEM HEALTH DATA
// ============================================================

export const systemComponents: SystemComponent[] = [
  {
    name: 'Wazuh SIEM Cluster (Primary)',
    status: 'healthy',
    uptime: 99.97,
    cpu: 45,
    memory: 62,
    disk: 58,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'PostgreSQL Database (Analytics)',
    status: 'healthy',
    uptime: 99.99,
    cpu: 32,
    memory: 71,
    disk: 64,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'Elasticsearch Cluster (Logs)',
    status: 'healthy',
    uptime: 99.95,
    cpu: 58,
    memory: 78,
    disk: 72,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'SS7 Monitoring Probe (Algiers)',
    status: 'healthy',
    uptime: 99.98,
    cpu: 22,
    memory: 41,
    disk: 35,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'SS7 Monitoring Probe (Oran)',
    status: 'healthy',
    uptime: 99.94,
    cpu: 28,
    memory: 45,
    disk: 38,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'TheHive Incident Platform',
    status: 'healthy',
    uptime: 99.99,
    cpu: 18,
    memory: 55,
    disk: 42,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'Cortex Analysis Engine',
    status: 'degraded',
    uptime: 98.5,
    cpu: 85,
    memory: 89,
    disk: 55,
    lastCheck: new Date(Date.now() - 300000).toISOString()
  },
  {
    name: 'MISP Threat Intelligence',
    status: 'healthy',
    uptime: 99.97,
    cpu: 35,
    memory: 52,
    disk: 61,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'Grafana Dashboards',
    status: 'healthy',
    uptime: 99.99,
    cpu: 12,
    memory: 34,
    disk: 28,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'Kafka Message Queue',
    status: 'healthy',
    uptime: 99.98,
    cpu: 42,
    memory: 48,
    disk: 45,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'CrowdStrike Falcon Sensor Gateway',
    status: 'healthy',
    uptime: 99.95,
    cpu: 25,
    memory: 38,
    disk: 30,
    lastCheck: new Date().toISOString()
  },
  {
    name: 'ANRT Reporting Module',
    status: 'maintenance',
    uptime: 95.0,
    cpu: 5,
    memory: 22,
    disk: 40,
    lastCheck: new Date(Date.now() - 600000).toISOString()
  }
]

// ============================================================
// INCIDENT DATA
// ============================================================

export const recentIncidents: IncidentData[] = [
  {
    id: 'INC-2026-00089',
    title: 'SS7 IRSF Attack Campaign Mitigation',
    severity: 'critical',
    status: 'contained',
    createdAt: '2026-01-21T02:15:00Z',
    assignee: 'SOC Tier 2',
    phase: 'Eradication',
    affectedAssets: 4,
    description: 'International revenue share fraud campaign targeting premium rate numbers in Tunisia. Blocked 23 fraudulent MSISDNs.'
  },
  {
    id: 'INC-2026-00088',
    title: 'APT Spear-Phishing Campaign',
    severity: 'high',
    status: 'open',
    createdAt: '2026-01-20T14:30:00Z',
    assignee: 'Threat Intel Team',
    phase: 'Analysis',
    affectedAssets: 3,
    description: 'Targeted phishing emails sent to 15 executives containing XAgent dropper. 2 workstations potentially compromised.'
  },
  {
    id: 'INC-2026-00087',
    title: 'Database SQL Injection Attempt',
    severity: 'high',
    status: 'recovered',
    createdAt: '2026-01-19T09:45:00Z',
    assignee: 'AppSec Team',
    phase: 'Lessons Learned',
    affectedAssets: 2,
    description: 'SQL injection attempt on customer portal. Attack blocked by WAF, no data exfiltration confirmed.'
  },
  {
    id: 'INC-2026-00086',
    title: 'Insider Threat Investigation',
    severity: 'medium',
    status: 'open',
    createdAt: '2026-01-18T11:20:00Z',
    assignee: 'HR & SOC Joint',
    phase: 'Detection',
    affectedAssets: 1,
    description: 'Anomalous bulk data access pattern detected from service desk account. Investigation ongoing.'
  },
  {
    id: 'INC-2026-00085',
    title: 'DDoS Attack on DNS Infrastructure',
    severity: 'high',
    status: 'closed',
    createdAt: '2026-01-16T16:00:00Z',
    assignee: 'Network Security Team',
    phase: 'Closed',
    affectedAssets: 6,
    description: 'Amplification attack mitigated via Cloudflare scrubbing. Peak traffic 12Gbps. No service impact.'
  },
  {
    id: 'INC-2026-00084',
    title: 'Malware Infection - Finance Department',
    severity: 'medium',
    status: 'closed',
    createdAt: '2026-01-14T08:30:00Z',
    assignee: 'Endpoint Security',
    phase: 'Closed',
    affectedAssets: 1,
    description: 'Emotet variant detected and contained. Machine reimaged, credentials rotated.'
  },
  {
    id: 'INC-2026-00083',
    title: 'SIM Swap Fraud Ring',
    severity: 'critical',
    status: 'contained',
    createdAt: '2026-01-12T07:00:00Z',
    assignee: 'Fraud & Law Enforcement',
    phase: 'Eradication',
    affectedAssets: 2,
    description: 'Organized crime group performing SIM swaps to intercept banking OTPs. 7 accounts affected, ANRT notified.'
  }
]

// ============================================================
// THREAT INTELLIGENCE FEED DATA
// ============================================================

export const threatIntelFeeds = [
  { name: 'MISP Community Feed', status: 'active', iocCount: 45230, lastUpdate: new Date(Date.now() - 1800000).toISOString(), coverage: 'Global' },
  { name: 'AlienVault OTX', status: 'active', iocCount: 128500, lastUpdate: new Date(Date.now() - 900000).toISOString(), coverage: 'Global' },
  { name: 'GSMA Fraud Intelligence', status: 'active', iocCount: 3450, lastUpdate: new Date(Date.now() - 3600000).toISOString(), coverage: 'Telecom' },
  { name: 'CFCS-AM (Morocco CSIRT)', status: 'active', iocCount: 2300, lastUpdate: new Date(Date.now() - 7200000).toISOString(), coverage: 'Regional' },
  { name: 'ANRT Threat Sharing', status: 'active', iocCount: 890, lastUpdate: new Date(Date.now() - 14400000).toISOString(), coverage: 'National' },
  { name: 'Telecom ISAC', status: 'degraded', iocCount: 67800, lastUpdate: new Date(Date.now() - 28800000).toISOString(), coverage: 'Industry' },
  { name: 'CrowdStrike Intel', status: 'active', iocCount: 234000, lastUpdate: new Date(Date.now() - 600000).toISOString(), coverage: 'Global' }
]

// ============================================================
// ANALYST WORKSPACE DATA
// ============================================================

export const analystStats = {
  totalAlertsToday: 147,
  criticalOpen: 3,
  highOpen: 12,
  mediumOpen: 28,
  avgResponseTime: '4.2 min',
  escalationRate: '8.3%',
  falsePositiveRate: '23.5%',
  mttr: '2.4 hours',
  analystOnDuty: [
    { name: 'Ahmed B.', role: 'Tier 1 Analyst', shift: 'Morning', activeCases: 8 },
    { name: 'Fatima Z.', role: 'Tier 2 Analyst', shift: 'Morning', activeCases: 5 },
    { name: 'Karim M.', role: 'Tier 1 Analyst', shift: 'Afternoon', activeCases: 0 },
    { name: 'Amina L.', role: 'SOC Supervisor', shift: 'Full Day', activeCases: 3 }
  ],
  queueBreakdown: {
    new: 23,
    acknowledged: 18,
    investigating: 31,
    waiting: 9,
    resolvedToday: 66
  }
}

// ============================================================
// GEOGRAPHIC/NETWORK DATA
// ============================================================

export const networkTopology = [
  { id: 'alg-dc-01', name: 'Algiers Data Center', type: 'datacenter', location: { lat: 36.7538, lng: 3.0588 }, status: 'healthy', devices: 245 },
  { id: 'oran-dc-01', name: 'Oran Data Center', type: 'datacenter', location: { lat: 35.6911, lng: -0.6417 }, status: 'healthy', devices: 128 },
  { id: 'const-dc-01', name: 'Constantine POP', type: 'pop', location: { lat: 36.3650, lng: 6.6147 }, status: 'healthy', devices: 67 },
  { id: 'msc-01', name: 'MSC Primary (Algiers)', type: 'msc', location: { lat: 36.7538, lng: 3.0588 }, status: 'healthy', devices: 12 },
  { id: 'hlr-01', name: 'HLR Primary (Algiers)', type: 'hlr', location: { lat: 36.7538, lng: 3.0588 }, status: 'healthy', devices: 4 },
  { id: 'stp-01', name: 'STP Primary', type: 'stp', location: { lat: 36.7538, lng: 3.0588 }, status: 'healthy', devices: 2 },
  { id: 'gw-intl', name: 'International Gateway', type: 'gateway', location: { lat: 36.7538, lng: 3.0588 }, status: 'degraded', devices: 8 },
  { id: 'isp-01', name: 'Internet Service Point', type: 'isp', location: { lat: 36.7538, lng: 3.0588 }, status: 'healthy', devices: 15 }
]

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get dashboard summary statistics
 */
export function getDashboardSummary() {
  return {
    totalAlerts: recentAlerts.length,
    criticalAlerts: recentAlerts.filter(a => a.severity === 'critical').length,
    openIncidents: recentIncidents.filter(i => i.status === 'open' || i.status === 'contained').length,
    activeHunts: huntSessions.filter(h => h.status === 'active').length,
    complianceScore: anrtComplianceData.overallScore,
    systemHealth: Math.round(systemComponents.filter(c => c.status === 'healthy').length / systemComponents.length * 100),
    ss7MsgPerSecond: ss7TrafficData.messagesPerSecond,
    fraudBlockedToday: ss7TrafficData.fraudAlerts.reduce((sum, f) => sum + f.blocked, 0),
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Generate real-time alert feed simulation
 */
export function generateLiveAlert(): AlertData | null {
  // 20% chance of generating a new alert each call
  if (Math.random() > 0.2) return null
  
  const templates = [
    { severity: 'medium' as const, title: 'Login Failure - Multiple Attempts', source: 'Wazuh SIEM' },
    { severity: 'low' as const, title: 'Policy Violation Detected', source: 'CrowdStrike' },
    { severity: 'high' as const, title: 'Suspicious Network Traffic', source: 'Suricata IDS' },
    { severity: 'info' as const, title: 'Configuration Change Detected', source: 'NetMonitor' },
    { severity: 'medium' as const, title: 'Malware Hash Match', source: 'Threat Intel' }
  ]
  
  const template = templates[Math.floor(Math.random() * templates.length)]
  const id = `ALT-${Date.now()}`
  
  return {
    id,
    ...template,
    timestamp: new Date().toISOString(),
    status: 'open',
    assignee: 'Auto-Assigned',
    description: `Auto-generated ${template.title.toLowerCase()} alert`
  }
}
