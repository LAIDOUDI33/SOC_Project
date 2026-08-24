'use client'

import React, { useState, useMemo } from 'react'
import {
  Zap, Play, Pause, SkipForward, RotateCcw, CheckCircle,
  AlertTriangle, Clock, Shield, Lock, Unlock, Users,
  Settings, FileText, Eye, Ban, ArrowRight, ChevronDown,
  ChevronRight, CircleDot, Activity, Bot, UserCheck,
  Timer, ListChecks, Workflow, Pencil, Save, Send,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  Trigger,
} from '@/components/ui/tooltip'

// Types
interface PlaybookStep {
  id: string
  name: string
  type: 'manual' | 'automated' | 'approval' | 'conditional' | 'parallel'
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'waiting_approval'
  description: string
  action?: string
  target?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  estimatedDuration?: number
  actualDuration?: number
  output?: string
  error?: string
  subSteps?: PlaybookStep[]
  approvals?: {
    required: number
    received: number
    approvers: Array<{ name: string; status: 'pending' | 'approved' | 'rejected'; timestamp?: Date }>
  }
}

interface Playbook {
  id: string
  name: string
  category: 'incident_response' | 'threat_hunting' | 'containment' | 'remediation' | 'compliance'
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'draft' | 'active' | 'completed' | 'paused' | 'failed'
  autonomyLevel: 0 | 1 | 2 | 3 | 4
  triggerType: 'alert' | 'incident' | 'manual' | 'scheduled'
  steps: PlaybookStep[]
  currentStepIndex: number
  progress: number
  startedAt?: Date
  completedAt?: Date
  assignedTo?: string
  incidentId?: string
  metrics?: {
    mttD?: number
    mttr?: number
    actionsExecuted: number
    actionsSkipped: number
    humanInterventions: number
  }
}

interface ApprovalRequest {
  id: string
  playbookId: string
  stepId: string
  requester: string
  requestedAt: Date
  action: string
  target: string
  riskLevel: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  approvers: Array<{ name: string; role: string; decision?: 'approved' | 'rejected'; comment?: string; timestamp?: Date }>
}

// Sample Data
const samplePlaybooks: Playbook[] = [
  {
    id: 'pb-001',
    name: 'Phishing Incident Response - Executive Targeting',
    category: 'incident_response',
    severity: 'high',
    status: 'active',
    autonomyLevel: 2,
    triggerType: 'incident',
    currentStepIndex: 2,
    progress: 35,
    startedAt: new Date('2024-08-24T09:45:00'),
    incidentId: 'INC-2024-4521',
    assignedTo: 'soc-analyst-team@cybersoc',
    metrics: {
      mttD: 847, // seconds
      mttr: null,
      actionsExecuted: 5,
      actionsSkipped: 0,
      humanInterventions: 1
    },
    steps: [
      {
        id: 's1', name: 'Initial Triage', type: 'automated', status: 'completed',
        description: 'Collect initial alert data and assess severity',
        action: 'Aggregate alerts from email gateway, EDR, SIEM',
        riskLevel: 'low', estimatedDuration: 30, actualDuration: 28,
        output: '12 alerts aggregated, severity confirmed as HIGH'
      },
      {
        id: 's2', name: 'User Impact Assessment', type: 'automated', status: 'completed',
        description: 'Identify affected users and their access levels',
        action: 'Query identity provider for user details and privileges',
        riskLevel: 'low', estimatedDuration: 60, actualDuration: 55,
        output: '3 users affected (1 executive, 2 managers)'
      },
      {
        id: 's3', name: 'Containment Actions', type: 'approval', status: 'running',
        description: 'Execute containment measures to prevent further damage',
        action: 'Isolate endpoints, suspend accounts, block IOCs',
        riskLevel: 'high', estimatedDuration: 300,
        approvals: {
          required: 2,
          received: 1,
          approvers: [
            { name: 'John Smith (SOC Manager)', status: 'approved', timestamp: new Date() },
            { name: 'Jane Doe (CISO)', status: 'pending' }
          ]
        },
        subSteps: [
          { id: 's3a', name: 'Isolate Endpoint WORKSTATION-0147', type: 'automated', status: 'completed', description: 'Network isolation of compromised endpoint', action: 'EDR isolate command', riskLevel: 'high', output: 'Endpoint isolated successfully' },
          { id: 's3b', name: 'Suspend User Account', type: 'automated', status: 'completed', description: 'Disable login for affected user', action: 'LDAP disable account', riskLevel: 'high', output: 'Account maria.chen@finance suspended' },
          { id: 's3c', name: 'Block Malicious Domains', type: 'automated', status: 'running', description: 'Add identified domains to DNS blocklist', action: 'DNS sinkhole update', riskLevel: 'medium' },
          { id: 's3d', name: 'Revoke Active Sessions', type: 'approval', status: 'waiting_approval', description: 'Invalidate all active sessions for affected user', action: 'Session revocation API call', riskLevel: 'medium', approvals: { required: 1, received: 0, approvers: [{ name: 'CISO', status: 'pending' }] } }
        ]
      },
      {
        id: 's4', name: 'Forensic Collection', type: 'manual', status: 'pending',
        description: 'Preserve evidence for investigation',
        action: 'Memory dump, disk image, log collection',
        riskLevel: 'low', estimatedDuration: 1800
      },
      {
        id: 's5', name: 'Notification & Escalation', type: 'automated', status: 'pending',
        description: 'Notify stakeholders and escalate if needed',
        action: 'Send notifications to security team, management, affected users',
        riskLevel: 'low', estimatedDuration: 120
      },
      {
        id: 's6', name: 'Remediation & Recovery', type: 'conditional', status: 'pending',
        description: 'Restore systems to normal operation',
        action: 'Clean endpoint, restore account, verify integrity',
        riskLevel: 'medium', estimatedDuration: 3600
      },
      {
        id: 's7', name: 'Post-Incident Review', type: 'manual', status: 'pending',
        description: 'Document lessons learned and update detections',
        action: 'Create incident report, update playbooks, tune rules',
        riskLevel: 'low', estimatedDuration: 3600
      }
    ]
  },
  {
    id: 'pb-002',
    name: 'Data Exfiltration Containment - Insider Threat',
    category: 'containment',
    severity: 'critical',
    status: 'active',
    autonomyLevel: 3,
    triggerType: 'alert',
    currentStepIndex: 1,
    progress: 15,
    startedAt: new Date('2024-08-24T14:33:00'),
    incidentId: 'INC-2024-4522',
    metrics: {
      mttD: 234,
      mttr: null,
      actionsExecuted: 2,
      actionsSkipped: 0,
      humanInterventions: 0
    },
    steps: [
      {
        id: 's1', name: 'Immediate Isolation', type: 'automated', status: 'completed',
        description: 'Critical assets isolation - autonomous response authorized',
        action: 'Isolate file server, suspend user, block external IP',
        riskLevel: 'critical', estimatedDuration: 120, actualDuration: 95,
        output: 'All immediate containment actions executed successfully'
      },
      {
        id: 's2', name: 'Evidence Preservation', type: 'automated', status: 'running',
        description: 'Automated forensic snapshot before any cleanup',
        action: 'Create memory image, capture network state, preserve logs',
        riskLevel: 'medium', estimatedDuration: 600
      },
      {
        id: 's3', name: 'Human Investigation Handoff', type: 'manual', status: 'pending',
        description: 'Prepare evidence package for DFIR team handoff',
        action: 'Compile timeline, extract artifacts, create case file',
        riskLevel: 'low', estimatedDuration: 1800
      }
    ]
  }
]

const autonomyLevels = [
  { level: 0, name: 'Observe Only', description: 'No automated actions, manual approval for everything', icon: Eye, color: 'text-blue-400' },
  { level: 1, name: 'Recommend', description: 'AI suggests actions, human decides', icon: Lightbulb, color: 'text-green-400' },
  { level: 2, name: 'Low-Risk Auto', description: 'Execute low-risk actions automatically', icon: Play, color: 'text-yellow-400' },
  { level: 3, name: 'Approved Auto', description: 'Execute pre-approved playbooks autonomously', icon: Zap, color: 'text-orange-400' },
  { level: 4, name: 'Full Autonomous', description: 'Controlled autonomous defense with human oversight', icon: Bot, color: 'text-red-400' },
]

const stepStatusConfig = {
  pending: { icon: CircleDot, color: 'text-slate-400', bg: 'bg-slate-700/50', label: 'Pending' },
  running: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20 animate-pulse', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Completed' },
  skipped: { icon: SkipForward, color: 'text-slate-400', bg: 'bg-slate-700/50', label: 'Skipped' },
  failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
  waiting_approval: { icon: Lock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Waiting Approval' },
}

export function SOARPlaybookEngine() {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook>(samplePlaybooks[0])
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [approvalDialog, setApprovalDialog] = useState<ApprovalRequest | null>(null)

  const currentStep = selectedPlaybook?.steps[selectedPlaybook.currentStepIndex]
  const autonomyConfig = autonomyLevels[selectedPlaybook.autonomyLevel]

  const handleApprove = (stepId: string) => {
    console.log('Approving step:', stepId)
    // In real implementation, this would call the approval API
  }

  const handleReject = (stepId: string) => {
    console.log('Rejecting step:', stepId)
  }

  const handlePauseResume = () => {
    setIsPaused(!isPaused)
  }

  const handleStepAction = (action: string, stepId: string) => {
    console.log('Step action:', action, 'for step:', stepId)
  }

  return (
    <TooltipProvider>
      <Card className="bg-slate-900 border-slate-700 h-full">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-emerald-500" />
                SOAR Playbook Engine
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">Autonomous response orchestration with human governance</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Level {selectedPlaybook.autonomyLevel}: {autonomyConfig.name}
              </Badge>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            </div>
          </div>

          {/* Autonomy Level Indicator */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400">Autonomy:</span>
            <div className="flex-1 flex items-center gap-1">
              {autonomyLevels.map((level) => (
                <div
                  key={level.level}
                  className={`flex-1 h-2 rounded-full ${
                    level.level <= selectedPlaybook.autonomyLevel
                      ? `bg-gradient-to-r ${level.level === 0 ? 'from-blue-500 to-blue-400' : level.level === 1 ? 'from-green-500 to-green-400' : level.level === 2 ? 'from-yellow-500 to-yellow-400' : level.level === 3 ? 'from-orange-500 to-orange-400' : 'from-red-500 to-red-400'}`
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-medium ${autonomyConfig.color}`}>{autonomyConfig.name}</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Playbook Selector */}
          <div className="p-4 border-b border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Active Playbooks</h3>
              <Select value={selectedPlaybook.id} onValueChange={(id) => setSelectedPlaybook(samplePlaybooks.find(p => p.id === id) || samplePlaybooks[0])}>
                <SelectTrigger className="w-[280px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {samplePlaybooks.map(pb => (
                    <SelectItem key={pb.id} value={pb.id}>
                      <div className="flex items-center gap-2">
                        <span>{pb.name.substring(0, 30)}...</span>
                        <Badge variant="secondary" className={`
                          ${pb.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            pb.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}
                        `}>
                          {pb.severity}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Playbook Info */}
            <div className="grid grid-cols-6 gap-3">
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Progress</p>
                <p className="text-lg font-bold text-white">{selectedPlaybook.progress}%</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Current Step</p>
                <p className="text-lg font-bold text-white">{selectedPlaybook.currentStepIndex + 1}/{selectedPlaybook.steps.length}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">MTTD</p>
                <p className="text-lg font-bold text-emerald-400">{selectedPlaybook.metrics?.mttD}s</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Actions Done</p>
                <p className="text-lg font-bold text-blue-400">{selectedPlaybook.metrics?.actionsExecuted}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Human Steps</p>
                <p className="text-lg font-bold text-yellow-400">{selectedPlaybook.metrics?.humanInterventions}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-2 text-center">
                <p className="text-xs text-slate-400">Incident</p>
                <p className="text-xs font-mono text-purple-400">{selectedPlaybook.incidentId}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Overall Progress</span>
                <span className="text-white font-medium">{selectedPlaybook.progress}%</span>
              </div>
              <Progress value={selectedPlaybook.progress} className="h-2" />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex h-[calc(100vh-420px)]">
            {/* Steps Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedPlaybook.steps.map((step, index) => {
                const statusConfig = stepStatusConfig[step.status]
                const StatusIcon = statusConfig.icon
                const isCurrentStep = index === selectedPlaybook.currentStepIndex

                return (
                  <div key={step.id} className={`rounded-xl border transition-all ${
                      isCurrentStep 
                        ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10' 
                        : 'border-slate-700 bg-slate-800/50'
                    }`}>
                    {/* Step Header */}
                    <div 
                      className="flex items-start gap-3 p-4 cursor-pointer"
                      onClick={() => setShowDetails(showDetails === step.id ? null : step.id)}
                    >
                      {/* Step Number & Status */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                        </div>
                        {index < selectedPlaybook.steps.length - 1 && (
                          <div className={`w-0.5 h-8 ${index < selectedPlaybook.currentStepIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">{step.name}</h4>
                          <Badge variant="secondary" className={`
                            ${step.type === 'automated' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              step.type === 'manual' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              step.type === 'approval' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-slate-700 text-slate-300'}
                          `}>
                            {step.type}
                          </Badge>
                          <Badge variant="secondary" className={`
                            ${step.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              step.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                              step.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              'bg-green-500/20 text-green-400 border-green-500/30'}
                          `}>
                            {step.riskLevel}
                          </Badge>
                          {isCurrentStep && (
                            <Badge className="bg-emerald-500 text-white animate-pulse">CURRENT</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-300 mb-2">{step.description}</p>
                        
                        {step.action && (
                          <p className="text-xs text-slate-400 font-mono bg-slate-900 rounded px-2 py-1 inline-block">
                            {step.action}
                          </p>
                        )}

                        {/* Output or Error */}
                        {step.output && (
                          <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-md">
                            <p className="text-xs text-emerald-400 flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {step.output}
                            </p>
                          </div>
                        )}

                        {step.error && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
                            <p className="text-xs text-red-400 flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {step.error}
                            </p>
                          </div>
                        )}

                        {/* Duration */}
                        {(step.actualDuration || step.estimatedDuration) && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Timer className="h-3 w-3" />
                            {step.actualDuration ? (
                              <>
                                <span>{Math.floor(step.actualDuration / 60)}m {step.actualDuration % 60}s</span>
                                <span className="text-emerald-400">(actual)</span>
                              </>
                            ) : (
                              <>
                                <span>~{Math.floor(step.estimatedDuration / 60)}m</span>
                                <span>(estimated)</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Approvals Status */}
                        {step.approvals && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <Lock className="h-3 w-3 text-yellow-400" />
                              <span className="text-slate-300">
                                Approvals: {step.approvals.received}/{step.approvals.required}
                              </span>
                            </div>
                            {step.approvers?.map((approver, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs bg-slate-900 rounded px-2 py-1">
                                {approver.status === 'approved' ? (
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Clock className="h-3 w-3 text-yellow-400 animate-pulse" />
                                )}
                                <span className="text-slate-300">{approver.split('(')[0]}</span>
                                {approver.status === 'approved' && approver.timestamp && (
                                  <span className="text-slate-500 ml-auto">
                                    {approver.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expand/Collapse Icon */}
                      <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${showDetails === step.id ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Expanded Details - Sub-steps */}
                    {showDetails === step.id && step.subSteps && (
                      <div className="px-4 pb-4 pl-16 space-y-2">
                        <Separator className="bg-slate-700 mb-3" />
                        {step.subSteps.map((subStep) => {
                          const subStatusConfig = stepStatusConfig[subStep.status]
                          const SubIcon = subStatusConfig.icon
                          
                          return (
                            <div key={subStep.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                              subStep.status === 'running' ? 'border-blue-500/50 bg-blue-500/5' :
                              subStep.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                              subStep.status === 'waiting_approval' ? 'border-yellow-500/50 bg-yellow-500/5' :
                              'border-slate-700 bg-slate-800/50'
                            }`}>
                              <SubIcon className={`h-4 w-4 mt-0.5 ${subStatusConfig.color}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-white">{subStep.name}</span>
                                  <Badge variant="secondary" className={`${subStatusConfig.bg} ${subStatusConfig.color} border-0 text-xs`}>
                                    {subStatusConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400">{subStep.description}</p>
                                
                                {subStep.output && (
                                  <p className="text-xs text-emerald-400 mt-1">{subStep.output}</p>
                                )}

                                {subStep.approvals && subStep.status === 'waiting_approval' && (
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                                      onClick={() => handleApprove(subStep.id)}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-red-900/50 border-red-500/50 hover:bg-red-900 text-red-300 text-xs"
                                      onClick={() => handleReject(subStep.id)}
                                    >
                                      <Ban className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Control Panel */}
            <div className="w-72 border-l border-slate-700 p-4 space-y-4 bg-slate-900">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Workflow className="h-4 w-4 text-emerald-500" />
                Control Panel
              </h3>

              {/* Playback Controls */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={isPaused ? "default" : "outline"}
                    size="sm"
                    className={isPaused ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-800 border-slate-600 hover:bg-slate-700"}
                    onClick={handlePauseResume}
                  >
                    {isPaused ? <><Play className="h-4 w-4 mr-1" /> Resume</> : <><Pause className="h-4 w-4 mr-1" /> Pause</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restart
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip Current Step
                </Button>
              </div>

              <Separator className="bg-slate-700" />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400">Quick Actions</h4>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Playbook
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export Run Report
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Notify Stakeholders
                </Button>
              </div>

              <Separator className="bg-slate-700" />

              {/* Current Step Actions */}
              {currentStep && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-slate-400">Current Step Actions</h4>
                  
                  <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-white">{currentStep.name}</p>
                    
                    {currentStep.status === 'waiting_approval' && (
                      <div className="space-y-2 pt-2">
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => handleApprove(currentStep.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve This Step
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-red-900/50 border-red-500/50 hover:bg-red-900 text-red-300"
                          onClick={() => handleReject(currentStep.id)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Reject & Hold
                        </Button>
                      </div>
                    )}
                    
                    {currentStep.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600"
                        onClick={() => handleStepAction('cancel', currentStep.id)}
                      >
                        Cancel Execution
                      </Button>
                    )}
                    
                    {currentStep.status === 'pending' && (
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={() => handleStepAction('execute', currentStep.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Execute Manually
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-slate-700" />

              {/* Audit Log Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 flex items-center justify-between">
                  Recent Activity
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                    <ListChecks className="h-3 w-3" />
                  </Button>
                </h4>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {[
                    { time: '14:35', action: 'Step completed', detail: 'Initial Triage', icon: CheckCircle, color: 'text-emerald-400' },
                    { time: '14:34', action: 'Auto-executed', detail: 'Alert aggregation', icon: Zap, color: 'text-blue-400' },
                    { time: '14:33', action: 'Approval granted', detail: 'By John Smith', icon: UserCheck, color: 'text-green-400' },
                    { time: '14:32', action: 'Step started', detail: 'User Impact Assessment', icon: Activity, color: 'text-blue-400' },
                    { time: '14:31', action: 'Playbook triggered', detail: 'By INC-2024-4521', icon: Play, color: 'text-purple-400' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <log.icon className={`h-3 w-3 mt-0.5 ${log.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300">{log.action}</p>
                        <p className="text-slate-500 truncate">{log.detail}</p>
                      </div>
                      <span className="text-slate-500 flex-shrink-0">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
