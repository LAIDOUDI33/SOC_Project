'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield, AlertTriangle, Activity, Clock, Users, Server,
  Globe, Lock, Eye, TrendingUp, Bell, Search, Filter,
  CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronDown,
  RefreshCw, Wifi, Database, Cpu, HardDrive, Network, Zap,
  Scale, Target, Radar, Crosshair, Bot, FileSearch, Play,
  Settings, BarChart3, Brain, ShieldCheck, Fingerprint, Key,
  Radio, Phone, Signal, Router, Cloud, DatabaseBackup,
  BookOpen, ClipboardCheck, Award, FileText, Bug, UserCheck,
  LayoutDashboard, LineChart, PieChart, Monitor, Terminal,
  ArrowRight, Menu, X, Home, Grid3X3, Layers, Workflow,
  CreditCard, FolderOpen, List
} from 'lucide-react'

// Import demo data for dashboard stats
import { 
  getDashboardSummary, 
  recentAlerts, 
  executiveKPIs,
  ss7TrafficData,
  anrtComplianceData,
  systemComponents
} from '@/lib/demo-data'

// Import SS7 Components
import SS7TrafficMonitor from '@/components/ss7/SS7TrafficMonitor'
import FraudDetectionPanel from '@/components/ss7/FraudDetectionPanel'
import { Badge } from '@/components/ui/badge'

// ============================================================
// COMPLETE MODULE STRUCTURE FOR DJEZZY NATIONAL SOC PLATFORM
// All 8 Phases with Sub-modules
// ============================================================

interface Module {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  status: 'active' | 'coming-soon' | 'beta'
  phase: number
  subModules?: SubModule[]
  path?: string
}

interface SubModule {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  itemCount?: number
  badge?: string
}

// ============================================================
// CLIENT-SAFE CLOCK COMPONENT - Prevents Hydration Mismatch
// Only renders time on client-side after mount
// ============================================================
function ClockDisplay() {
  const [time, setTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTime(new Date().toLocaleTimeString())
    
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return <div className="text-cyan-400 font-mono w-20">&nbsp;</div>
  }

  return <div className="text-cyan-400 font-mono">{time}</div>
}

// Complete Module Definition
const socModules: Module[] = [
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
      { id: 'log-analytics', name: 'Log Analytics', icon: <LineChart className="w-4 h-4" />, description: 'Advanced log search & analysis' }
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
      { id: 'billing-fraud', name: 'Billing Fraud', icon: <CreditCard className="w-4 h-4" />, description: 'Billing bypass detection' },
      { id: 'roaming-fraud', name: 'Roaming Fraud', icon: <Globe className="w-4 h-4" />, description: 'IRSF & roaming fraud' }
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
      { id: 'artp-reporting', name: 'ARTP Reporting', icon: <ClipboardCheck className="w-4 h-4" />, description: 'Algerian telecom regulator reports', itemCount: 12, badge: 'Auto' },
      { id: 'anssi-alignment', name: 'ANSSI Alignment', icon: <Award className="w-4 h-4" />, description: 'French security framework alignment', score: '87%' },
      { id: 'iso27001', name: 'ISO 27001', icon: <BookOpen className="w-4 h-4" />, description: 'Information security management', score: '94%' },
      { id: 'nist-framework', name: 'NIST CSF', icon: <Shield className="w-4 h-4" />, description: 'NIST Cybersecurity Framework', score: '82%' },
      { id: 'evidence-vault', name: 'Evidence Vault', icon: <DatabaseBackup className="w-4 h-4" />, description: 'Audit evidence management', itemCount: 342 },
      { id: 'gap-analysis', name: 'Gap Analysis', icon: <LineChart className="w-4 h-4" />, description: 'Compliance gap tracking' }
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
      { id: 'automated-response-ai', name: 'AI Response', icon: <Bot className="w-4 h-4" />, description: 'AI-driven incident response' }
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
      { id: 'timeline-analysis', name: 'Timeline Analysis', icon: <Clock className="w-4 h-4" />, description: 'Attack timeline reconstruction' }
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
    id: 'identity',
    identity: 'Identity & Access',
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

const PhaseBadge = ({ phase }: { phase: number }) => (
  <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
    Phase {phase}
  </span>
)

export default function SOCDashboard() {
  const [selectedModule, setSelectedModule] = useState<string>('ss7-tools')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSS7Tools, setShowSS7Tools] = useState(true)

  const filteredModules = socModules.filter(module =>
    (module.name && module.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (module.description && module.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">National SOC</h1>
                <p className="text-xs text-slate-400">Djezzy Security Operations Center • Algeria</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-slate-300">All Systems Operational</span>
              </div>
              <ClockDisplay />
            </div>

            {/* Actions */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 hover:bg-slate-800 rounded-lg"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation - Full Module View */}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{filteredModules.length} Modules Available</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
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
                  onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
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
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group/sub"
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

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* SS7 Security Tools - Featured Section */}
          {(selectedModule === 'ss7-tools' || selectedModule === null) && showSS7Tools && (
            <section className="mb-8">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
                    <Radio className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">SS7 Security Tools</h2>
                    <p className="text-slate-400 text-sm">Real-time signaling analysis, fraud detection & message decoding</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                    ● Live Monitoring
                  </span>
                  <button 
                    onClick={() => setShowSS7Tools(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SS7 Tools Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* SS7 Traffic Monitor */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-semibold">Traffic Monitor</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Real-time
                    </div>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-hidden">
                    <SS7TrafficMonitor />
                  </div>
                </div>

                {/* Fraud Detection Panel */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlertIcon className="w-5 h-5 text-orange-400" />
                      <h3 className="font-semibold">Fraud Detection</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      Active Alerts
                    </div>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-hidden">
                    <FraudDetectionPanel />
                  </div>
                </div>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Messages/sec', value: '1,247', icon: <Zap className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { label: 'Active Alerts', value: '23', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                  { label: 'Blocked Today', value: '8', icon: <Shield className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Est. Loss (DZD)', value: '125K', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-400', bg: 'bg-green-500/10' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-sm">{stat.label}</span>
                      <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Djezzy National SOC</h2>
                <p className="text-slate-300 max-w-2xl">
                  Complete Security Operations Center platform with <strong>14 major modules</strong> and <strong>65+ sub-modules</strong>. 
                  Select a module from the sidebar to explore its features.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>All 8 Phases Implemented</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Real-time Monitoring Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>Production Ready</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <Layers className="w-24 h-24 text-cyan-400/20" />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              QUICK DASHBOARD ACCESS - Navigation to all dashboards
          ═══════════════════════════════════════════════════════════════ */}
          <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-500/5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20">
                  <LayoutDashboard className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">📊 Dashboard Access</h2>
                  <p className="text-sm text-slate-400">Navigate to specialized security dashboards</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {getDashboardSummary().totalAlerts} Active Alerts
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Executive Dashboard */}
              <Link href="/dashboards/executive" 
                className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-800/30 border border-blue-500/40 hover:border-blue-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                <BarChart3 className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-bold text-white mb-1">Executive</h3>
                <p className="text-xs text-slate-400 mb-3">KPI & Risk Overview</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    Risk: {executiveKPIs[0].value}
                  </span>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Analyst Dashboard */}
              <Link href="/dashboards/analyst"
                className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-800/30 border border-purple-500/40 hover:border-purple-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                <Shield className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-bold text-white mb-1">Analyst</h3>
                <p className="text-xs text-slate-400 mb-3">Security Operations</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                    {recentAlerts.filter(a => a.severity === 'critical').length} Critical
                  </span>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Threat Hunting Dashboard */}
              <Link href="/dashboards/threat-hunting"
                className="group relative overflow-hidden bg-gradient-to-br from-red-600/20 to-red-800/30 border border-red-500/40 hover:border-red-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
                <Crosshair className="w-8 h-8 text-red-400 mb-3" />
                <h3 className="font-bold text-white mb-1">Threat Hunting</h3>
                <p className="text-xs text-slate-400 mb-3">Proactive Detection</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                    3 Active Hunts
                  </span>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-8 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Telecom/SS7 Dashboard */}
              <Link href="/dashboards/telecom"
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-600/20 to-emerald-800/30 border border-emerald-500/40 hover:border-emerald-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                <Radio className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="font-bold text-white mb-1">Telecom Security</h3>
                <p className="text-xs text-slate-400 mb-3">SS7/Diameter Center</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    {ss7TrafficData.messagesPerSecond.toLocaleString()} msg/s
                  </span>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Compliance Dashboard */}
              <Link href="/dashboards/compliance"
                className="group relative overflow-hidden bg-gradient-to-br from-amber-600/20 to-amber-800/30 border border-amber-500/40 hover:border-amber-400 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                <Scale className="w-8 h-8 text-amber-400 mb-3" />
                <h3 className="font-bold text-white mb-1">Compliance</h3>
                <p className="text-xs text-slate-400 mb-3">ANRT Regulations</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                    {anrtComplianceData.overallScore}% Score
                  </span>
                </div>
                <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Modules', value: '14', icon: <Grid3X3 className="w-5 h-5" />, color: 'text-cyan-400' },
              { label: 'Sub-Modules', value: '65+', icon: <Layers className="w-5 h-5" />, color: 'text-purple-400' },
              { label: 'API Endpoints', value: '25+', icon: <Terminal className="w-5 h-5" />, color: 'text-green-400' },
              { label: 'Integration Points', value: '15', icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{stat.label}</span>
                  <div className={stat.color}>{stat.icon}</div>
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Featured Modules Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Key Modules for CEO Presentation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                socModules.find(m => m.id === 'ss7-tools'),
                socModules.find(m => m.id === 'telecom-security'),
                socModules.find(m => m.id === 'compliance'),
                socModules.find(m => m.id === 'soar'),
                socModules.find(m => m.id === 'threat-hunting'),
                socModules.find(m => m.id === 'ml-platform')
              ].map((module, idx) => module && (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 hover:border-cyan-500/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedModule(module.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
                      {module.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold group-hover:text-cyan-400 transition-colors">{module.name}</h4>
                      <p className="text-xs text-slate-400">{module.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <PhaseBadge phase={module.phase} />
                    <span>{module.subModules?.length || 0} Sub-modules</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Health Overview */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Platform Health Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: 'SIEM Core', status: 'operational', uptime: '99.97%' },
                { name: 'Database', status: 'operational', uptime: '99.99%' },
                { name: 'ML Engine', status: 'operational', uptime: '99.95%' },
                { name: 'SS7 Firewall', status: 'operational', uptime: '100%' },
                { name: 'SS7 Decoder', status: 'operational', uptime: '100%' },
                { name: 'Fraud Detector', status: 'operational', uptime: '99.98%' },
                { name: 'Threat Intel', status: 'degraded', uptime: '98.5%' },
                { name: 'SOAR Engine', status: 'operational', uptime: '99.98%' }
              ].map((system, idx) => (
                <div key={idx} className="text-center p-3 rounded-lg bg-slate-800/50">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${
                    system.status === 'operational' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                  }`} />
                  <div className="text-sm font-medium">{system.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{system.uptime}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Additional missing icons
const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const ShieldAlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
