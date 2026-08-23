'use client'

import React from 'react'
import {
  Search, Grid3X3, List, ChevronDown, ArrowRight,
  LayoutDashboard, ShieldCheck, Router, Radio, Phone,
  UserCheck, BarChart3, Brain, Scale, Crosshair, Workflow,
  AlertTriangle, Bug, Key, Monitor, Terminal, Target,
  FileSearch, Play, Settings, FileText, Activity, Lock,
  Shield, TrendingUp, Radar, Cloud, Signal, Wifi, Fingerprint,
  DatabaseBackup, BookOpen, Award, Users, Zap, FolderOpen
} from 'lucide-react'

// Module and SubModule interfaces
interface SubModule {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  itemCount?: number
  badge?: string
  score?: string
  accuracy?: string
}

export interface Module {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  status: 'active' | 'coming-soon' | 'beta'
  phase: number
  subModules?: SubModule[]
  path?: string
}

// Helper Components
const StatusBadge = ({ status }: { status: Module['status'] }) => {
  const styles = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    'coming-soon': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    beta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${styles[status]}`}>
      {status === 'active' ? '● Active' : status === 'beta' ? 'β Beta' : '○ Coming Soon'}
    </span>
  )
}

export const PhaseBadge = ({ phase }: { phase: number }) => (
  <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
    Phase {phase}
  </span>
)

// Complete Module Definition - exported for reuse
export const socModules: Module[] = [
  // ══════════════════════════════════════════════════════
  // PHASE 1-4: FOUNDATION & CORE INFRASTRUCTURE
  // ══════════════════════════════════════════════════════
  {
    id: 'siem',
    name: 'SIEM Platform',
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: 'Security Information & Event Management',
    status: 'active',
    phase: 1,
    subModules: [
      { id: 'siem-dashboard', name: 'SIEM Dashboard', icon: <Monitor className="w-4 h-4" />, description: 'Real-time security monitoring', itemCount: 847 },
      { id: 'log-management', name: 'Log Management', icon: <FileText className="w-4 h-4" />, description: 'Centralized log collection & storage', itemCount: 2847 },
      { id: 'correlation-engine', name: 'Correlation Engine', icon: <Brain className="w-4 h-4" />, description: 'Multi-source event correlation', badge: 'AI-Powered' },
      { id: 'rule-management', name: 'Rule Management', icon: <Settings className="w-4 h-4" />, description: 'Detection rules & policies', itemCount: 1247 },
      { id: 'log-analytics', name: 'Log Analytics', icon: <BarChart3 className="w-4 h-4" />, description: 'Advanced log search & analysis' }
    ]
  },
  {
    id: 'edr',
    name: 'EDR/XDR',
    icon: <ShieldCheck className="w-5 h-5" />,
    description: 'Endpoint Detection & Response',
    status: 'active',
    phase: 2,
    subModules: [
      { id: 'endpoint-monitoring', name: 'Endpoint Monitoring', icon: <Monitor className="w-4 h-4" />, description: 'Real-time endpoint visibility', itemCount: 2847 },
      { id: 'threat-hunting-edr', name: 'Threat Hunting', icon: <Crosshair className="w-4 h-4" />, description: 'Proactive threat detection' },
      { id: 'incident-response', name: 'Incident Response', icon: <Target className="w-4 h-4" />, description: 'Automated response actions', badge: 'SOAR' },
      { id: 'forensics', name: 'Digital Forensics', icon: <Search className="w-4 h-4" />, description: 'Endpoint forensics & analysis' }
    ]
  },
  {
    id: 'network-security',
    name: 'Network Security',
    icon: <Router className="w-5 h-5" />,
    description: 'Network Detection & Response (NDR)',
    status: 'active',
    phase: 3,
    subModules: [
      { id: 'ids-ips', name: 'IDS/IPS', icon: <Shield className="w-4 h-4" />, description: 'Intrusion detection & prevention', itemCount: 156 },
      { id: 'traffic-analysis', name: 'Traffic Analysis', icon: <Activity className="w-4 h-4" />, description: 'Network traffic monitoring', itemCount: 4521 },
      { id: 'vulnerability-scanner', name: 'Vulnerability Scanner', icon: <Bug className="w-4 h-4" />, description: 'Network vulnerability assessment', badge: 'Auto' },
      { id: 'firewall-mgmt', name: 'Firewall Management', icon: <Lock className="w-4 h-4" />, description: 'Firewall rule management' }
    ]
  },

  // ══════════════════════════════════════════════════════
  // TELECOM-SPECIFIC MODULES (Djezzy Special) - SS7 TOOLS
  // ══════════════════════════════════════════════════════
  {
    id: 'ss7-tools',
    name: 'SS7 Security Tools',
    icon: <Radio className="w-5 h-5" />,
    description: 'SS7 Protocol Analysis, Fraud Detection & Signaling Security',
    status: 'active',
    phase: 4,
    subModules: [
      { id: 'ss7-decoder', name: 'SS7 Decoder', icon: <Terminal className="w-4 h-4" />, description: 'MAP/CAP/ISUP message decoding', badge: 'Core' },
      { id: 'traffic-monitor', name: 'Traffic Monitor', icon: <Activity className="w-4 h-4" />, description: 'Real-time signaling traffic analysis', itemCount: 1250 },
      { id: 'fraud-detector', name: 'Fraud Detector', icon: <AlertTriangle className="w-4 h-4" />, description: 'IRSF/SIM Swap/Wangiri detection', badge: 'AI' },
      { id: 'signaling-analyzer', name: 'Signaling Analyzer', icon: <BarChart3 className="w-4 h-4" />, description: 'OPC/DPC traffic analysis' },
      { id: 'message-inspector', name: 'Message Inspector', icon: <Search className="w-4 h-4" />, description: 'Deep packet inspection' }
    ]
  },
  {
    id: 'telecom-security',
    name: 'Telecom Security',
    icon: <Phone className="w-5 h-5" />,
    description: 'Telecom Protocol Security (SS7/Diameter/SIP/GTP)',
    status: 'active',
    phase: 4,
    subModules: [
      { id: 'ss7-firewall', name: 'SS7 Firewall', icon: <Radio className="w-4 h-4" />, description: 'SS7 signaling protection', itemCount: 23, badge: 'Critical' },
      { id: 'gtp-inspector', name: 'GTP Inspector', icon: <Signal className="w-4 h-4" />, description: 'GTP tunnel inspection', itemCount: 12 },
      { id: 'diameter-analyzer', name: 'Diameter Analyzer', icon: <Wifi className="w-4 h-4" />, description: 'Diameter protocol analysis', itemCount: 8 },
      { id: 'sip-sentry', name: 'SIP Sentry', icon: <Phone className="w-4 h-4" />, description: 'VoIP/SIP fraud prevention', itemCount: 34 },
      { id: 'ims-protection', name: 'IMS Protection', icon: <Cloud className="w-4 h-4" />, description: 'IMS network security' },
      { id: 'sim-swap-detector', name: 'SIM Swap Detection', icon: <Fingerprint className="w-4 h-4" />, description: 'Fraud detection system', badge: 'AI' }
    ]
  },
  {
    id: 'fraud-detection',
    name: 'Fraud Prevention',
    icon: <UserCheck className="w-5 h-5" />,
    description: 'Telecom Fraud Detection & Prevention',
    status: 'active',
    phase: 4,
    subModules: [
      { id: 'fraud-dashboard', name: 'Fraud Dashboard', icon: <BarChart3 className="w-4 h-4" />, description: 'Fraud analytics overview', itemCount: 89 },
      { id: 'subscription-fraud', name: 'Subscription Fraud', icon: <UserCheck className="w-4 h-4" />, description: 'Subscription fraud detection' },
      { id: 'billing-fraud', name: 'Billing Fraud', icon: <CreditCardIcon className="w-4 h-4" />, description: 'Billing bypass detection' },
      { id: 'roaming-fraud', name: 'Roaming Fraud', icon: <GlobeIcon className="w-4 h-4" />, description: 'IRSF & roaming fraud' }
    ]
  },

  // ══════════════════════════════════════════════════════
  // PHASE 5: ANALYTICS ENGINE
  // ══════════════════════════════════════════════════════
  {
    id: 'analytics',
    name: 'Analytics Engine',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Advanced Security Analytics & Intelligence',
    status: 'active',
    phase: 5,
    subModules: [
      { id: 'threat-intel', name: 'Threat Intelligence', icon: <Radar className="w-4 h-4" />, description: 'Threat feeds & IOC management', itemCount: 14, badge: 'Live' },
      { id: 'behavioral-analytics', name: 'Behavioral Analytics', icon: <Brain className="w-4 h-4" />, description: 'UBA & entity behavior', badge: 'ML' },
      { id: 'threat-scoring', name: 'Threat Scoring', icon: <Target className="w-4 h-4" />, description: 'Risk scoring engine' },
      { id: 'ml-predictions', name: 'ML Predictions', icon: <TrendingUp className="w-4 h-4" />, description: 'Predictive threat analysis', badge: 'Beta' },
      { id: 'reporting', name: 'Reporting', icon: <FileText className="w-4 h-4" />, description: 'Custom reports & dashboards', itemCount: 24 }
    ]
  },

  // ══════════════════════════════════════════════════════
  // PHASE 6: COMPLIANCE AUTOMATION
  // ══════════════════════════════════════════════════════
  {
    id: 'compliance',
    name: 'Compliance Center',
    icon: <Scale className="w-5 h-5" />,
    description: 'Regulatory Compliance & Audit Management',
    status: 'active',
    phase: 6,
    subModules: [
      { id: 'artp-reporting', name: 'ARTP Reporting', icon: <ClipboardCheckIcon className="w-4 h-4" />, description: 'Algerian telecom regulator reports', itemCount: 12, badge: 'Auto' },
      { id: 'anssi-alignment', name: 'ANSSI Alignment', icon: <Award className="w-4 h-4" />, description: 'French security framework alignment', score: '87%' },
      { id: 'iso27001', name: 'ISO 27001', icon: <BookOpen className="w-4 h-4" />, description: 'Information security management', score: '94%' },
      { id: 'nist-framework', name: 'NIST CSF', icon: <Shield className="w-4 h-4" />, description: 'NIST Cybersecurity Framework', score: '82%' },
      { id: 'evidence-vault', name: 'Evidence Vault', icon: <DatabaseBackup className="w-4 h-4" />, description: 'Audit evidence management', itemCount: 342 },
      { id: 'gap-analysis', name: 'Gap Analysis', icon: <BarChart3 className="w-4 h-4" />, description: 'Compliance gap tracking' }
    ]
  },

  // ══════════════════════════════════════════════════════
  // PHASE 7: ML/ANALYTICS INTEGRATION
  // ══════════════════════════════════════════════════════
  {
    id: 'ml-platform',
    name: 'ML/AI Platform',
    icon: <Brain className="w-5 h-5" />,
    description: 'Machine Learning & AI Capabilities',
    status: 'active',
    phase: 7,
    subModules: [
      { id: 'anomaly-detection', name: 'Anomaly Detection', icon: <Radar className="w-4 h-4" />, description: 'ML-powered anomaly detection', accuracy: '96.1%' },
      { id: 'predictive-analytics', name: 'Predictive Analytics', icon: <TrendingUp className="w-4 h-4" />, description: 'Threat prediction models', accuracy: '94.2%' },
      { id: 'uba-engine', name: 'UBA Engine', icon: <Users className="w-4 h-4" />, description: 'User behavior analytics', accuracy: '89.7%' },
      { id: 'model-management', name: 'Model Management', icon: <Settings className="w-4 h-4" />, description: 'ML model versioning & A/B testing', itemCount: 8 },
      { id: 'automated-response-ai', name: 'AI Response', icon: <BotIcon className="w-4 h-4" />, description: 'AI-driven incident response' }
    ]
  },

  // ══════════════════════════════════════════════════════
  // PHASE 8: THREAT HUNTING & SOAR (NEW!)
  // ══════════════════════════════════════════════════════
  {
    id: 'threat-hunting',
    name: 'Threat Hunting',
    icon: <Crosshair className="w-5 h-5" />,
    description: 'Proactive Threat Hunting Operations',
    status: 'active',
    phase: 8,
    subModules: [
      { id: 'hunt-sessions', name: 'Hunt Sessions', icon: <Play className="w-4 h-4" />, description: 'Active hunting operations', itemCount: 4, badge: 'Active' },
      { id: 'hypothesis-builder', name: 'Hypothesis Builder', icon: <Target className="w-4 h-4" />, description: 'Create hunting hypotheses', itemCount: 12 },
      { id: 'query-workbench', name: 'Query Workbench', icon: <Terminal className="w-4 h-4" />, description: 'Advanced threat queries' },
      { id: 'ioc-extraction', name: 'IOC Extraction', icon: <FileSearch className="w-4 h-4" />, description: 'Automatic IOC extraction', itemCount: 38 },
      { id: 'timeline-analysis', name: 'Timeline Analysis', icon: <ClockIcon className="w-4 h-4" />, description: 'Attack timeline reconstruction' }
    ]
  },
  {
    id: 'soar',
    name: 'SOAR Platform',
    icon: <Workflow className="w-5 h-5" />,
    description: 'Security Orchestration, Automation & Response',
    status: 'active',
    phase: 8,
    subModules: [
      { id: 'playbooks', name: 'Playbooks', icon: <Play className="w-4 h-4" />, description: 'Response playbooks library', itemCount: 6, badge: '561 Runs' },
      { id: 'case-management', name: 'Case Management', icon: <FolderOpen className="w-4 h-4" />, description: 'Investigation case management', itemCount: 5 },
      { id: 'automation-rules', name: 'Automation Rules', icon: <Zap className="w-4 h-4" />, description: 'Automation rule engine', itemCount: 47 },
      { id: 'task-automation', name: 'Task Automation', icon: <Workflow className="w-4 h-4" />, description: 'Automated task workflows' },
      { id: 'integration-hub', name: 'Integration Hub', icon: <Grid3X3 className="w-4 h-4" />, description: 'Third-party integrations', itemCount: 12 }
    ]
  },

  // ══════════════════════════════════════════════════════
  // OPERATIONAL MODULES
  // ══════════════════════════════════════════════════════
  {
    id: 'incidents',
    name: 'Incident Management',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Incident Lifecycle Management',
    status: 'active',
    phase: 1,
    subModules: [
      { id: 'incident-queue', name: 'Incident Queue', icon: <List className="w-4 h-4" />, description: 'Active incidents', itemCount: 8, badge: '2 Critical' },
      { id: 'response-playbooks', name: 'Response Playbooks', icon: <BookOpen className="w-4 h-4" />, description: 'Standard procedures' },
      { id: 'escalation', name: 'Escalation Matrix', icon: <ArrowRight className="w-4 h-4" />, description: 'Escalation procedures' },
      { id: 'post-incident', name: 'Post-Incident Review', icon: <FileText className="w-4 h-4" />, description: 'Lessons learned' }
    ]
  },
  {
    id: 'vulnerability',
    name: 'Vulnerability Mgmt',
    icon: <Bug className="w-5 h-5" />,
    description: 'Vulnerability Assessment & Patching',
    status: 'beta',
    phase: 3,
    subModules: [
      { id: 'vuln-scanner', name: 'Scanner', icon: <Radar className="w-4 h-4" />, description: 'Vulnerability scanning', itemCount: 234 },
      { id: 'patch-mgmt', name: 'Patch Management', icon: <Settings className="w-4 h-4" />, description: 'Patch deployment' },
      { id: 'risk-prioritization', name: 'Risk Prioritization', icon: <Target className="w-4 h-4" />, description: 'CVSS-based prioritization' }
    ]
  },
  {
    id: 'identity-access',
    name: 'Identity & Access',
    icon: <Key className="w-5 h-5" />,
    description: 'IAM & Privileged Access Management',
    status: 'active',
    phase: 2,
    subModules: [
      { id: 'ldap-sync', name: 'LDAP Sync', icon: <Users className="w-4 h-4" />, description: 'Directory synchronization', badge: 'Synced' },
      { id: 'pam', name: 'Privileged Access', icon: <Lock className="w-4 h-4" />, description: 'PAM console access' },
      { id: 'mfa', name: 'MFA Management', icon: <Fingerprint className="w-4 h-4" />, description: 'Multi-factor authentication' },
      { id: 'sso', name: 'SSO/SAML', icon: <Key className="w-4 h-4" />, description: 'Single sign-on' }
    ]
  }
]

// Route mappings
export const moduleRoutes: Record<string, string> = {
  'siem': '/dashboards/analyst',
  'edr': '/dashboards/analyst',
  'network-security': '/dashboards/analyst',
  'ss7-tools': '/dashboards/telecom',
  'telecom-security': '/dashboards/telecom',
  'fraud-detection': '/dashboards/telecom',
  'analytics': '/dashboards/analyst',
  'compliance': '/dashboards/compliance',
  'ml-platform': '/dashboards/executive',
  'threat-hunting': '/dashboards/threat-hunting',
  'soar': '/dashboards/threat-hunting',
  'incidents': '/dashboards/analyst',
  'identity-access': '/dashboards/analyst',
}

export const subModuleRoutes: Record<string, string> = {
  'siem-dashboard': '/dashboards/analyst',
  'log-management': '/dashboards/analyst',
  'correlation-engine': '/dashboards/analyst',
  'rule-management': '/dashboards/analyst',
  'log-analytics': '/dashboards/analyst',
  'endpoint-monitoring': '/dashboards/analyst',
  'threat-hunting-edr': '/dashboards/threat-hunting',
  'incident-response': '/dashboards/analyst',
  'forensics': '/dashboards/analyst',
  'ids-ips': '/dashboards/analyst',
  'traffic-analysis': '/dashboards/analyst',
  'vulnerability-scanner': '/dashboards/analyst',
  'firewall-mgmt': '/dashboards/analyst',
  'ss7-decoder': '/dashboards/telecom',
  'traffic-monitor': '/dashboards/telecom',
  'fraud-detector': '/dashboards/telecom',
  'signaling-analyzer': '/dashboards/telecom',
  'message-inspector': '/dashboards/telecom',
  'ss7-firewall': '/dashboards/telecom',
  'gtp-inspector': '/dashboards/telecom',
  'diameter-analyzer': '/dashboards/telecom',
  'sip-sentry': '/dashboards/telecom',
  'ims-protection': '/dashboards/telecom',
  'sim-swap-detector': '/dashboards/telecom',
  'fraud-dashboard': '/dashboards/telecom',
  'subscription-fraud': '/dashboards/telecom',
  'billing-fraud': '/dashboards/telecom',
  'roaming-fraud': '/dashboards/telecom',
  'threat-intel': '/dashboards/analyst',
  'behavioral-analytics': '/dashboards/executive',
  'threat-scoring': '/dashboards/executive',
  'ml-predictions': '/dashboards/executive',
  'reporting': '/dashboards/executive',
  'artp-reporting': '/dashboards/compliance',
  'anssi-alignment': '/dashboards/compliance',
  'iso27001': '/dashboards/compliance',
  'nist-framework': '/dashboards/compliance',
  'evidence-vault': '/dashboards/compliance',
  'gap-analysis': '/dashboards/compliance',
  'anomaly-detection': '/dashboards/executive',
  'predictive-analytics': '/dashboards/executive',
  'uba-engine': '/dashboards/executive',
  'model-management': '/dashboards/executive',
  'automated-response-ai': '/dashboards/threat-hunting',
  'hunt-sessions': '/dashboards/threat-hunting',
  'hypothesis-builder': '/dashboards/threat-hunting',
  'query-workbench': '/dashboards/threat-hunting',
  'ioc-extraction': '/dashboards/threat-hunting',
  'timeline-analysis': '/dashboards/threat-hunting',
  'playbooks': '/dashboards/threat-hunting',
  'case-management': '/dashboards/analyst',
  'automation-rules': '/dashboards/threat-hunting',
  'task-automation': '/dashboards/threat-hunting',
  'integration-hub': '/dashboards/analyst',
  'ldap-sync': '/dashboards/analyst',
  'pam': '/dashboards/analyst',
  'mfa': '/dashboards/analyst',
  'sso': '/dashboards/analyst',
}

interface DashboardSidebarProps {
  showMobileMenu: boolean
  selectedModule: string | null
  viewMode: 'grid' | 'list'
  searchQuery: string
  filteredModules: Module[]
  onModuleClick: (moduleId: string) => void
  onSubModuleClick: (subModuleId: string) => void
  onViewModeChange: (mode: 'grid' | 'list') => void
  onSearchChange: (value: string) => void
}

export function DashboardSidebar({
  showMobileMenu,
  selectedModule,
  viewMode,
  searchQuery,
  filteredModules,
  onModuleClick,
  onSubModuleClick,
  onViewModeChange,
  onSearchChange,
}: DashboardSidebarProps) {
  return (
    <aside className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-full md:w-80 lg:w-96 bg-slate-900/50 border-r border-slate-800 min-h-screen p-6 overflow-y-auto`}>
      <div className="space-y-6">
        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{filteredModules.length} Modules Available</span>
            <div className="flex gap-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Phase Legend */}
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
          <div className="text-xs font-medium text-slate-300 mb-2">Implementation Phases</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[1,2,3,4,5,6,7,8].map(phase => (
              <div key={phase} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Phase {phase}
              </div>
            ))}
          </div>
        </div>

        {/* Modules Grid/List */}
        <div className={viewMode === 'grid' ? 'space-y-3' : 'space-y-2'}>
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className={`group bg-slate-800/30 rounded-xl border transition-all cursor-pointer ${
                selectedModule === module.id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
              }`}
              onClick={() => onModuleClick(module.id)}
            >
              {/* Module Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      module.status === 'active' ? 'bg-cyan-500/20 text-cyan-400' :
                      module.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {module.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-cyan-400 transition-colors">
                        {module.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{module.description}</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                    selectedModule === module.id ? 'rotate-180' : ''
                  }`} />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <PhaseBadge phase={module.phase} />
                  <StatusBadge status={module.status} />
                  {module.id === 'ss7-tools' && (
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      ★ Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-modules (Expandable) */}
              {selectedModule === module.id && module.subModules && (
                <div className="border-t border-slate-700 p-3 space-y-1 max-h-64 overflow-y-auto">
                  {module.subModules.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group/sub cursor-pointer hover:border-cyan-500/30 border border-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSubModuleClick(sub.id)
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-4 h-4 text-slate-400 group-hover/sub:text-cyan-400 flex-shrink-0 inline-flex items-center justify-center">{sub.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate group-hover/sub:text-cyan-400">
                            {sub.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{sub.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sub.badge && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {sub.badge}
                          </span>
                        )}
                        {sub.score && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                            {sub.score}
                          </span>
                        )}
                        {sub.accuracy && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                            {sub.accuracy}
                          </span>
                        )}
                        {sub.itemCount !== undefined && (
                          <span className="text-xs text-slate-400 font-mono min-w-[28px] text-right">
                            {sub.itemCount}
                          </span>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover/sub:text-cyan-400 opacity-0 group-hover/sub:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

// Additional missing icons as inline components
function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  )
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
    </svg>
  )
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"></rect>
      <circle cx="12" cy="5" r="2"></circle>
      <path d="M12 7v4"></path>
      <line x1="8" y1="16" x2="8" y2="16"></line>
      <line x1="16" y1="16" x2="16" y2="16"></line>
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
}

export default DashboardSidebar
