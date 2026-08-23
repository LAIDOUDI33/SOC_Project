'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck, FileText, Clock, AlertTriangle, CheckCircle,
  XCircle, Calendar, Download, Filter, Search, Eye,
  TrendingUp, TrendingDown, Minus, ChevronRight, BookOpen,
  ClipboardCheck, Scale, Award, AlertCircle, RefreshCw,
  Upload, FolderOpen, Tag, Users, Building,
  Timer, Flag, Target, BarChart3
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import StatusIndicator from '@/components/shared/StatusIndicator'
import MetricTrend from '@/components/shared/MetricTrend'
import SmartFilter from '@/components/shared/SmartFilter'
import DataExporter from '@/components/shared/DataExporter'
// Import demo data for realistic ANRT compliance data
import { 
  anrtComplianceData, 
  complianceHistory 
} from '@/lib/demo-data'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// ============================================================
// TYPES FOR COMPLIANCE DASHBOARD
// ============================================================

interface ANRTRequirement {
  id: string
  category: string
  reference: string
  title: string
  description: string
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-assessed'
  controlOwner: string
  lastAssessment: Date
  nextReview: Date
  evidenceCount: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
}

interface AuditFinding {
  id: string
  title: string
  category: string
  severity: 'critical' | 'major' | 'minor' | 'observation'
  status: 'open' | 'in-progress' | 'remediated' | 'closed' | 'accepted-risk'
  discoveredDate: Date
  targetResolution: Date
  assignedTo: string
  description: string
  remediationActions?: string[]
}

interface RegulatoryDeadline {
  id: string
  regulation: string
  requirement: string
  deadline: Date
  status: 'on-track' | 'at-risk' | 'overdue' | 'completed'
  owner: string
  progress: number
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface ControlEffectiveness {
  domain: string
  designEffectiveness: number
  operatingEffectiveness: number
  coverage: number
  lastTested: Date
}

// ============================================================
// ANRT REGULATORY FRAMEWORK DATA (Simplified)
// ============================================================

const ANRT_CATEGORIES = [
  { id: 'incidents', name: 'Incident Management', icon: AlertTriangle },
  { id: 'access-control', name: 'Access Control', icon: ShieldCheck },
  { id: 'data-protection', name: 'Data Protection', icon: FileText },
  { id: 'network-security', name: 'Network Security', icon: Building },
  { id: 'logging-monitoring', name: 'Logging & Monitoring', icon: Eye },
  { id: 'business-continuity', name: 'Business Continuity', icon: ClipboardCheck }
]

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

const generateANRTRequirements = (): ANRTRequirement[] => [
  {
    id: 'anrt-001',
    category: 'Incident Management',
    reference: 'ANRT/DZ/2024-001',
    title: 'Security Incident Response Plan',
    description: 'Maintain a documented and tested incident response plan with defined roles and responsibilities',
    status: 'compliant',
    controlOwner: 'SOC Manager',
    lastAssessment: new Date(Date.now() - 86400000 * 30),
    nextReview: new Date(Date.now() + 86400000 * 60),
    evidenceCount: 12,
    riskLevel: 'critical'
  },
  {
    id: 'anrt-002',
    category: 'Access Control',
    reference: 'ANRT/DZ/2024-002',
    title: 'User Access Management',
    description: 'Implement proper user access provisioning, review, and deprovisioning processes',
    status: 'compliant',
    controlOwner: 'IAM Team Lead',
    lastAssessment: new Date(Date.now() - 86400000 * 45),
    nextReview: new Date(Date.now() + 86400000 * 15),
    evidenceCount: 8,
    riskLevel: 'high'
  },
  {
    id: 'anrt-003',
    category: 'Data Protection',
    reference: 'ANRT/DZ/2024-003',
    title: 'Personal Data Encryption',
    description: 'Encrypt personal data at rest and in transit using approved algorithms',
    status: 'partial',
    controlOwner: 'Security Architect',
    lastAssessment: new Date(Date.now() - 86400000 * 20),
    nextReview: new Date(Date.now() + 86400000 * 10),
    evidenceCount: 5,
    riskLevel: 'critical'
  },
  {
    id: 'anrt-004',
    category: 'Network Security',
    reference: 'ANRT/DZ/2024-004',
    title: 'Network Segmentation',
    description: 'Implement network segmentation to isolate critical systems and limit lateral movement',
    status: 'compliant',
    controlOwner: 'Network Security Team',
    lastAssessment: new Date(Date.now() - 86400000 * 15),
    nextReview: new Date(Date.now() + 86400000 * 45),
    evidenceCount: 6,
    riskLevel: 'high'
  },
  {
    id: 'anrt-005',
    category: 'Logging & Monitoring',
    reference: 'ANRT/DZ/2024-005',
    title: 'Security Event Logging',
    description: 'Log all security-relevant events with sufficient detail for forensic analysis',
    status: 'partial',
    controlOwner: 'SOC Operations',
    lastAssessment: new Date(Date.now() - 86400000 * 10),
    nextReview: new Date(Date.now() + 86400000 * 20),
    evidenceCount: 9,
    riskLevel: 'medium'
  },
  {
    id: 'anrt-006',
    category: 'Business Continuity',
    reference: 'ANRT/DZ/2024-006',
    title: 'Disaster Recovery Testing',
    description: 'Conduct regular disaster recovery tests with documented results',
    status: 'non-compliant',
    controlOwner: 'BCP Manager',
    lastAssessment: new Date(Date.now() - 86400000 * 90),
    nextReview: new Date(Date.now() + 86400000 * 5),
    evidenceCount: 2,
    riskLevel: 'critical'
  },
  {
    id: 'anrt-007',
    category: 'Data Protection',
    reference: 'ANRT/DZ/2024-007',
    title: 'Data Retention Policy',
    description: 'Implement data retention policies compliant with Algerian regulations',
    status: 'compliant',
    controlOwner: 'DPO',
    lastAssessment: new Date(Date.now() - 86400000 * 60),
    nextReview: new Date(Date.now() + 86400000 * 30),
    evidenceCount: 7,
    riskLevel: 'medium'
  },
  {
    id: 'anrt-008',
    category: 'Access Control',
    reference: 'ANRT/DZ/2024-008',
    title: 'Privileged Access Management',
    description: 'Implement PAM solution for privileged account management and session recording',
    status: 'partial',
    controlOwner: 'Security Engineering',
    lastAssessment: new Date(Date.now() - 86400000 * 25),
    nextReview: new Date(Date.now() + 86400000 * 35),
    evidenceCount: 4,
    riskLevel: 'high'
  }
]

const generateAuditFindings = (): AuditFinding[] => [
  {
    id: 'audit-001',
    title: 'Incomplete DR Test Documentation',
    category: 'Business Continuity',
    severity: 'major',
    status: 'open',
    discoveredDate: new Date(Date.now() - 86400000 * 14),
    targetResolution: new Date(Date.now() + 86400000 * 16),
    assignedTo: 'BCP Manager',
    description: 'Last quarterly DR test was conducted but documentation is incomplete',
    remediationActions: ['Complete DR test report', 'Update BCP documentation', 'Schedule follow-up test']
  },
  {
    id: 'audit-002',
    title: 'Encryption Gap in Legacy Systems',
    category: 'Data Protection',
    severity: 'critical',
    status: 'in-progress',
    discoveredDate: new Date(Date.now() - 864000 * 21),
    targetResolution: new Date(Date.now() + 86400000 * 10),
    assignedTo: 'Security Architect',
    description: 'Two legacy billing systems still using outdated encryption protocols',
    remediationActions: ['Upgrade encryption to AES-256', 'Implement TLS 1.3', 'Document exceptions if needed']
  },
  {
    id: 'audit-003',
    title: 'Log Retention Below Requirement',
    category: 'Logging & Monitoring',
    severity: 'minor',
    status: 'remediated',
    discoveredDate: new Date(Date.now() - 86400000 * 45),
    targetResolution: new Date(Date.now() - 86400000 * 5),
    assignedTo: 'SOC Operations',
    description: 'Some log sources only retaining 180 days instead of required 365 days',
    remediationActions: ['Extended retention policy', 'Added storage capacity']
  },
  {
    id: 'audit-004',
    title: 'Access Review Overdue',
    category: 'Access Control',
    severity: 'major',
    status: 'open',
    discoveredDate: new Date(Date.now() - 86400000 * 7),
    targetResolution: new Date(Date.now() + 86400000 * 23),
    assignedTo: 'IAM Team Lead',
    description: 'Quarterly access review for critical systems is 2 weeks overdue',
    remediationActions: ['Initiate access review', 'Identify stale accounts', 'Revoke unnecessary access']
  },
  {
    id: 'audit-005',
    title: 'Missing SIEM Correlation Rules',
    category: 'Logging & Monitoring',
    severity: 'observation',
    status: 'accepted-risk',
    discoveredDate: new Date(Date.now() - 86400000 * 30),
    targetResolution: null as any,
    assignedTo: 'SOC Manager',
    description: 'Additional correlation rules recommended for telecom-specific threats',
    remediationActions: ['Add SS7 anomaly rules', 'Implement fraud detection correlations']
  }
]

const generateDeadlines = (): RegulatoryDeadline[] => [
  {
    id: 'deadline-001',
    regulation: 'ANRT Cybersecurity Framework',
    requirement: 'Annual penetration testing completion',
    deadline: new Date(Date.now() + 86400000 * 15),
    status: 'at-risk',
    owner: 'Security Assurance Team',
    progress: 65,
    priority: 'critical'
  },
  {
    id: 'deadline-002',
    regulation: 'ANRT Data Protection Directive',
    requirement: 'DPO annual report submission',
    deadline: new Date(Date.now() + 86400000 * 30),
    status: 'on-track',
    owner: 'DPO',
    progress: 80,
    priority: 'high'
  },
  {
    id: 'deadline-003',
    regulation: 'ANRT Telecom Security Standards',
    requirement: 'SS7 security controls audit',
    deadline: new Date(Date.now() + 86400000 * 5),
    status: 'overdue',
    owner: 'Telecom Security Team',
    progress: 90,
    priority: 'critical'
  },
  {
    id: 'deadline-004',
    regulation: 'Internal Policy',
    requirement: 'Q4 compliance attestation',
    deadline: new Date(Date.now() + 86400000 * 45),
    status: 'on-track',
    owner: 'Compliance Team',
    progress: 25,
    priority: 'medium'
  },
  {
    id: 'deadline-005',
    regulation: 'ANRT Incident Reporting',
    requirement: 'Quarterly incident statistics submission',
    deadline: new Date(Date.now() + 86400000 * 60),
    status: 'on-track',
    owner: 'SOC Manager',
    progress: 40,
    priority: 'high'
  }
]

const generateControlEffectiveness = (): ControlEffectiveness[] => [
  { domain: 'Identity & Access', designEffectiveness: 92, operatingEffectiveness: 88, coverage: 95, lastTested: new Date(Date.now() - 86400000 * 30) },
  { domain: 'Network Security', designEffectiveness: 88, operatingEffectiveness: 85, coverage: 92, lastTested: new Date(Date.now() - 86400000 * 45) },
  { domain: 'Endpoint Protection', designEffectiveness: 95, operatingEffectiveness: 91, coverage: 98, lastTested: new Date(Date.now() - 86400000 * 20) },
  { domain: 'Data Protection', designEffectiveness: 78, operatingEffectiveness: 72, coverage: 85, lastTested: new Date(Date.now() - 86400000 * 60) },
  { domain: 'Application Security', designEffectiveness: 82, operatingEffectiveness: 78, coverage: 75, lastTested: new Date(Date.now() - 86400000 * 50) },
  { domain: 'Physical Security', designEffectiveness: 96, operatingEffectiveness: 94, coverage: 99, lastTested: new Date(Date.now() - 86400000 * 90) }
]

// ============================================================
// CHART CONFIGURATIONS
// ============================================================

const complianceChartConfig: ChartConfig = {
  compliant: { label: 'Compliant', color: '#22c55e' },
  partial: { label: 'Partial', color: '#f59e0b' },
  nonCompliant: { label: 'Non-Compliant', color: '#ef4444' },
  notAssessed: { label: 'Not Assessed', color: '#64748b' }
}

const effectivenessChartConfig: ChartConfig = {
  designEffectiveness: { label: 'Design Effectiveness', color: '#06b6d4' },
  operatingEffectiveness: { label: 'Operating Effectiveness', color: '#8b5cf6' },
  coverage: { label: 'Coverage', color: '#22c55e' }
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#64748b']

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ComplianceScoreCard({
  score,
  trend,
  label,
  subtitle
}: {
  score: number
  trend?: number
  label: string
  subtitle?: string
}) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-400'
    if (s >= 70) return 'text-yellow-400'
    if (s >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const getProgressColor = (s: number) => {
    if (s >= 90) return '[&>div]:bg-green-500'
    if (s >= 70) return '[&>div]:bg-yellow-500'
    if (s >= 50) return '[&>div]:bg-orange-500'
    return '[&>div]:bg-red-500'
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-6">
        <p className="text-sm text-slate-400 mb-1">{label}</p>
        <div className={`text-3xl font-bold ${getScoreColor(score)} mb-2`}>
          {score}%
        </div>
        <Progress value={score} className={`h-2 ${getProgressColor(score)}`} />
        <div className="flex items-center justify-between mt-2">
          {trend !== undefined && (
            <MetricTrend value={trend} showArrow size="sm" />
          )}
          {subtitle && (
            <span className="text-xs text-slate-500">{subtitle}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ANRTRequirementsMatrix({ requirements }: { requirements: ANRTRequirement[] }) {
  const getStatusBadge = (status: ANRTRequirement['status']) => {
    switch (status) {
      case 'compliant':
        return <Badge variant="outline" className="border-green-500/50 text-green-400">Compliant</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">Partial</Badge>
      case 'non-compliant':
        return <Badge variant="outline" className="border-red-500/50 text-red-400">Non-Compliant</Badge>
      case 'not-assessed':
        return <Badge variant="outline" className="border-slate-500/50 text-slate-400">Not Assessed</Badge>
    }
  }

  const getRiskBadge = (risk: ANRTRequirement['riskLevel']) => {
    switch (risk) {
      case 'critical': return <StatusIndicator status="critical" size="sm" />
      case 'high': return <StatusIndicator status="warning" size="sm" />
      case 'medium': return <StatusIndicator status="good" size="sm" />
      case 'low': return <StatusIndicator status="excellent" size="sm" />
    }
  }

  const daysUntilDeadline = (date: Date) => Math.ceil((date.getTime() - Date.now()) / 86400000)

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-blue-400" />
            ANRT Requirements Tracking Matrix
          </CardTitle>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Reference</th>
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Requirement</th>
                <th className="text-center py-3 px-2 text-slate-400 font-medium">Status</th>
                <th className="text-center py-3 px-2 text-slate-400 font-medium">Risk</th>
                <th className="text-center py-3 px-2 text-slate-400 font-medium">Evidence</th>
                <th className="text-right py-3 px-2 text-slate-400 font-medium">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map(req => (
                <tr key={req.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-mono text-xs text-cyan-400">{req.reference}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="text-white font-medium">{req.title}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{req.description}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">{getStatusBadge(req.status)}</td>
                  <td className="py-3 px-2 text-center">{getRiskBadge(req.riskLevel)}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`font-mono ${req.evidenceCount > 5 ? 'text-green-400' : req.evidenceCount > 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {req.evidenceCount}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`text-xs ${daysUntilDeadline(req.nextReview) < 30 ? 'text-orange-400' : 'text-slate-400'}`}>
                      {daysUntilDeadline(req.nextReview)}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function AuditFindingsLifecycle({ findings }: { findings: AuditFinding[] }) {
  const getSeverityIcon = (severity: AuditFinding['severity']) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'major': return <AlertTriangle className="h-4 w-4 text-orange-400" />
      case 'minor': return <AlertCircle className="h-4 w-4 text-yellow-400" />
      case 'observation': return <Eye className="h-4 w-4 text-blue-400" />
    }
  }

  const getStatusColor = (status: AuditFinding['status']) => {
    switch (status) {
      case 'open': return 'border-red-500/30 bg-red-500/5'
      case 'in-progress': return 'border-blue-500/30 bg-blue-500/5'
      case 'remediated': return 'border-green-500/30 bg-green-500/5'
      case 'closed': return 'border-slate-500/30 bg-slate-500/5'
      case 'accepted-risk': return 'border-purple-500/30 bg-purple-500/5'
    }
  }

  const openFindings = findings.filter(f => f.status === 'open' || f.status === 'in-progress')
  const closedFindings = findings.filter(f => f.status === 'closed' || f.status === 'remediated')

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-orange-400" />
            Audit Findings Lifecycle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-red-500/20 text-red-400">
              {openFindings.length} Open
            </Badge>
            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
              {closedFindings.length} Closed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {findings.map(finding => (
            <div key={finding.id} className={`p-4 rounded-lg border ${getStatusColor(finding.status)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(finding.severity)}
                  <h4 className="font-medium text-white">{finding.title}</h4>
                  <Badge variant="outline" className={`text-xs capitalize ${
                    finding.status === 'open' ? 'border-red-500/50 text-red-400' :
                    finding.status === 'in-progress' ? 'border-blue-500/50 text-blue-400' :
                    finding.status === 'remediated' ? 'border-green-500/50 text-green-400' :
                    finding.status === 'closed' ? 'border-slate-500/50 text-slate-400' :
                    'border-purple-500/50 text-purple-400'
                  }`}>
                    {finding.status.replace('-', ' ')}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500">
                  {finding.assignedTo}
                </span>
              </div>
              
              <p className="text-sm text-slate-400 mb-3">{finding.description}</p>

              {/* Remediation Actions */}
              {finding.remediationActions && finding.remediationActions.length > 0 && (
                <div className="space-y-1 mb-3">
                  <p className="text-xs font-medium text-slate-300">Remediation Actions:</p>
                  {finding.remediationActions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle className="h-3 w-3 text-cyan-400" />
                      {action}
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                <span>Discovered: {finding.discoveredDate.toLocaleDateString()}</span>
                {finding.targetResolution && (
                  <span className={new Date(finding.targetResolution) < new Date() ? 'text-red-400' : ''}>
                    Target: {finding.targetResolution.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DeadlineCountdown({ deadlines }: { deadlines: RegulatoryDeadline[] }) {
  const getDeadlineStatus = (status: RegulatoryDeadline['status']) => {
    switch (status) {
      case 'on-track': return { color: 'bg-green-500/20 border-green-500/30', badge: 'bg-green-500/20 text-green-400' }
      case 'at-risk': return { color: 'bg-yellow-500/20 border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' }
      case 'overdue': return { color: 'bg-red-500/20 border-red-500/30', badge: 'bg-red-500/20 text-red-400' }
      case 'completed': return { color: 'bg-slate-500/20 border-slate-500/30', badge: 'bg-slate-500/20 text-slate-400' }
    }
  }

  const daysRemaining = (date: Date) => Math.ceil((date.getTime() - Date.now()) / 86400000)

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-red-400" />
          Regulatory Deadline Countdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deadlines.map(deadline => {
            const style = getDeadlineStatus(deadline.status)
            const remaining = daysRemaining(deadline.deadline)
            
            return (
              <div key={deadline.id} className={`p-3 rounded-lg border ${style.color}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white text-sm">{deadline.requirement}</p>
                    <p className="text-xs text-slate-400">{deadline.regulation}</p>
                  </div>
                  <Badge variant="secondary" className={style.badge}>
                    {deadline.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white font-medium">{deadline.progress}%</span>
                    </div>
                    <Progress value={deadline.progress} className="h-1.5" />
                  </div>
                  
                  <div className="text-right min-w-[80px]">
                    <p className={`text-lg font-bold ${
                      remaining < 0 ? 'text-red-400' :
                      remaining <= 7 ? 'text-orange-400' :
                      remaining <= 30 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
                    </p>
                    <p className="text-[10px] text-slate-500">{deadline.owner}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ControlEffectivenessChart({ data }: { data: ControlEffectiveness[] }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          Control Effectiveness Scoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={effectivenessChartConfig} className="h-[280px] w-full">
          <RadarChart data={data}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Radar name="Design Effectiveness" dataKey="designEffectiveness" stroke="#06b6d4" fill="#06b6d420" strokeWidth={2} />
            <Radar name="Operating Effectiveness" dataKey="operatingEffectiveness" stroke="#8b5cf6" fill="#8b5cf620" strokeWidth={2} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <LegendWrapper />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function LegendWrapper() {
  return (
    <ChartLegend content={<ChartLegendContent />} />
  )
}

function ComplianceDistributionChart({ requirements }: { requirements: ANRTRequirement[] }) {
  const distribution = [
    { name: 'Compliant', value: requirements.filter(r => r.status === 'compliant').length, color: '#22c55e' },
    { name: 'Partial', value: requirements.filter(r => r.status === 'partial').length, color: '#f59e0b' },
    { name: 'Non-Compliant', value: requirements.filter(r => r.status === 'non-compliant').length, color: '#ef4444' },
    { name: 'Not Assessed', value: requirements.filter(r => r.status === 'not-assessed').length, color: '#64748b' }
  ].filter(d => d.value > 0)

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-400" />
          Compliance Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ChartContainer config={complianceChartConfig} className="h-[200px] w-full">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
              <LegendWrapper />
            </PieChart>
          </ChartContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {distribution.map(item => (
            <div key={item.name} className="text-center p-2 rounded-lg bg-slate-800/50">
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-slate-400">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAIN COMPLIANCE DASHBOARD COMPONENT
// ============================================================

export default function ComplianceDashboard() {
  const [requirements, setRequirements] = useState<ANRTRequirement[]>([])
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [deadlines, setDeadlines] = useState<RegulatoryDeadline[]>([])
  const [controlEffectiveness, setControlEffectiveness] = useState<ControlEffectiveness[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate overall compliance score
  const overallScore = useMemo(() => {
    if (requirements.length === 0) return 0
    const compliant = requirements.filter(r => r.status === 'compliant').length
    const partial = requirements.filter(r => r.status === 'partial').length
    return Math.round(((compliant + partial * 0.5) / requirements.length) * 100)
  }, [requirements])

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setRequirements(generateANRTRequirements())
      setFindings(generateAuditFindings())
      setDeadlines(generateDeadlines())
      setControlEffectiveness(generateControlEffectiveness())
      setIsLoading(false)
    }, 600)
  }, [])

  const handleGenerateReport = () => {
    console.log('Generating compliance report...')
    // Will connect to reporting API
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-green-500 mx-auto" />
          <p className="text-slate-400">Loading Compliance Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-green-400" />
                Compliance Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                ANRT Regulatory Compliance • Control Effectiveness • Audit Management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleGenerateReport}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <DataExporter 
                onExport={(format) => console.log(`Exporting as ${format}`)}
                formats={['pdf', 'csv']} 
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Score Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComplianceScoreCard
            score={overallScore}
            trend={3.2}
            label="Overall Compliance"
            subtitle="vs ANRT requirements"
          />
          <ComplianceScoreCard
            score={Math.round(controlEffectiveness.reduce((acc, c) => acc + c.designEffectiveness, 0) / controlEffectiveness.length)}
            trend={1.5}
            label="Control Design"
            subtitle="average effectiveness"
          />
          <ComplianceScoreCard
            score={Math.round(controlEffectiveness.reduce((acc, c) => acc + c.operatingEffectiveness, 0) / controlEffectiveness.length)}
            trend={-2.1}
            label="Control Operation"
            subtitle="average effectiveness"
          />
          <ComplianceScoreCard
            score={100 - ((findings.filter(f => f.status === 'open').length / findings.length) * 100)}
            trend={-5.3}
            label="Audit Health"
            subtitle={`${findings.filter(f => f.status === 'open').length} open findings`}
          />
        </div>

        {/* Main Content Grid */}
        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="requirements" className="data-[state=active]:bg-slate-700">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
            <TabsTrigger value="findings" className="data-[state=active]:bg-slate-700">
              <Search className="h-4 w-4 mr-2" />
              Findings
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="data-[state=active]:bg-slate-700">
              <Timer className="h-4 w-4 mr-2" />
              Deadlines
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Requirements Tab */}
          <TabsContent value="requirements">
            <ANRTRequirementsMatrix requirements={requirements} />
          </TabsContent>

          {/* Findings Tab */}
          <TabsContent value="findings">
            <AuditFindingsLifecycle findings={findings} />
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines">
            <DeadlineCountdown deadlines={deadlines} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ComplianceDistributionChart requirements={requirements} />
              <ControlEffectivenessChart data={controlEffectiveness} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
