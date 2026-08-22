'use client'

import React, { useState, useEffect } from 'react'
import {
  Search, Plus, Save, Play, Pause, RotateCcw,
  Filter, Tag, MessageSquare, Clock, User, Target,
  Shield, Crosshair, GitBranch, Database, FileText,
  ChevronRight, ChevronDown, ChevronUp, X, Check,
  AlertTriangle, Brain, Network, Lock, Eye, Download,
  Share2, Bookmark, MoreHorizontal, Grid3X3, List,
  Terminal, Code, Fingerprint, Bug, Sword, Radar
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import StatusIndicator from '@/components/shared/StatusIndicator'
import SmartFilter from '@/components/shared/SmartFilter'
// Import demo data for realistic Djezzy SOC threat hunting data
import { 
  huntSessions as demoHuntSessions, 
  huntIOCs 
} from '@/lib/demo-data'

// ============================================================
// TYPES FOR THREAT HUNTING
// ============================================================

interface Hypothesis {
  id: string
  title: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  author: string
  createdAt: Date
  updatedAt: Date
  tags: string[]
  iocsFound: number
  relatedAlerts: number
  mitreTactics?: string[]
  mitreTechniques?: string[]
}

interface HuntSession {
  id: string
  hypothesisId: string
  name: string
  status: 'running' | 'paused' | 'completed' | 'failed'
  startedAt: Date
  resultsCount: number
  queriesExecuted: number
}

interface QueryCondition {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'not_equals' | 'greater_than' | 'less_than' | 'regex' | 'exists'
  value: string
  logic: 'AND' | 'OR'
}

interface HuntResult {
  id: string
  timestamp: Date
  source: string
  eventType: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  summary: string
  iocs: string[]
  rawLog?: string
}

// ============================================================
// MITRE ATT&CK DATA
// ============================================================

const MITRE_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', description: 'The adversary is trying to gather information' },
  { id: 'TA0042', name: 'Resource Development', description: 'The adversary is trying to establish resources' },
  { id: 'TA0001', name: 'Initial Access', description: 'The adversary is trying to get into your network' },
  { id: 'TA0002', name: 'Execution', description: 'The adversary is trying to run malicious code' },
  { id: 'TA0003', name: 'Persistence', description: 'The adversary is trying to maintain their foothold' },
  { id: 'TA0004', name: 'Privilege Escalation', description: 'The adversary is trying to gain higher-level permissions' },
  { id: 'TA0005', name: 'Defense Evasion', description: 'The adversary is trying to avoid being detected' },
  { id: 'TA0006', name: 'Credential Access', description: 'The adversary is trying to steal account names and passwords' },
  { id: 'TA0007', name: 'Discovery', description: 'The adversary is trying to figure out your environment' },
  { id: 'TA0008', name: 'Lateral Movement', description: 'The adversary is trying to move through your environment' },
  { id: 'TA0009', name: 'Collection', description: 'The adversary is trying to gather data of interest' },
  { id: 'TA0011', name: 'Command and Control', description: 'The adversary is trying to communicate with compromised systems' },
  { id: 'TA0010', name: 'Exfiltration', description: 'The adversary is trying to steal data' },
  { id: 'TA0040', name: 'Impact', description: 'The adversary is trying to manipulate, interrupt, or destroy your systems' }
]

const MITRE_TECHNIQUES = [
  // Initial Access
  { id: 'T1566', name: 'Spearphishing Attachment', tactic: 'TA0001' },
  { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'TA0001' },
  { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'TA0001' },
  { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'TA0001' },
  { id: 'T1078', name: 'Valid Accounts', tactic: 'TA0001' },
  // Execution
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'TA0002' },
  { id: 'T1059.001', name: 'PowerShell', tactic: 'TA0002' },
  { id: 'T1059.003', name: 'Windows Command Shell', tactic: 'TA0002' },
  { id: 'T1059.004', name: 'Unix Shell', tactic: 'TA0002' },
  { id: 'T1203', name: 'Exploitation for Client Execution', tactic: 'TA0002' },
  // Persistence
  { id: 'T1547', name: 'Boot or Logon Autostart Execution', tactic: 'TA0003' },
  { id: 'T1547.001', name: 'Registry Run Keys / Startup Folder', tactic: 'TA0003' },
  { id: 'T1547.003', name: 'Time Providers', tactic: 'TA0003' },
  { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'TA0003' },
  // Defense Evasion
  { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'TA0005' },
  { id: 'T1006', name: 'Direct Volume Access', tactic: 'TA0005' },
  { id: 'T1112', name: 'Modify Registry', tactic: 'TA0005' },
  // Credential Access
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'TA0006' },
  { id: 'T1552', name: 'Unsecured Credentials', tactic: 'TA0006' },
  { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', tactic: 'TA0006' },
  // Discovery
  { id: 'T1083', name: 'File and Directory Discovery', tactic: 'TA0007' },
  { id: 'T1049', name: 'System Network Connections Discovery', tactic: 'TA0007' },
  { id: 'T1018', name: 'Remote System Discovery', tactic: 'TA0007' },
  // Lateral Movement
  { id: 'T1021', name: 'Remote Services', tactic: 'TA0008' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'TA0008' },
  { id: 'T1021.002', name: 'SMB/Windows Admin Shares', tactic: 'TA0008' },
  { id: 'T1570', name: 'Lateral Tool Transfer', tactic: 'TA0008' },
  // Collection
  { id: 'T1005', name: 'Data from Local System', tactic: 'TA0009' },
  { id: 'T1039', name: 'Data from Network Shared Drive', tactic: 'TA0009' },
  { id: 'T1114', name: 'Email Collection', tactic: 'TA0009' },
  // Command & Control
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'TA0011' },
  { id: 'T1071.001', name: 'Web Protocols', tactic: 'TA0011' },
  { id: 'T1090', name: 'Proxy', tactic: 'TA0011' },
  { id: 'T1090.001', name: 'Internal Proxy', tactic: 'TA0011' },
  // Exfiltration
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'TA0010' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'TA0010' },
  { id: 'T1530', name: 'Data from Cloud Storage Object', tactic: 'TA0010' }
]

const FIELD_OPTIONS = [
  { value: 'source_ip', label: 'Source IP' },
  { value: 'dest_ip', label: 'Destination IP' },
  { value: 'source_port', label: 'Source Port' },
  { value: 'dest_port', label: 'Destination Port' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'event_type', label: 'Event Type' },
  { value: 'severity', label: 'Severity' },
  { value: 'signature', label: 'Signature' },
  { value: 'username', label: 'Username' },
  { value: 'hostname', label: 'Hostname' },
  { value: 'process_name', label: 'Process Name' },
  { value: 'file_path', label: 'File Path' },
  { value: 'hash_md5', label: 'MD5 Hash' },
  { value: 'hash_sha256', label: 'SHA256 Hash' },
  { value: 'domain', label: 'Domain' },
  { value: 'url', label: 'URL' },
  { value: 'imsi', label: 'IMSI (Telecom)' },
  { value: 'msisdn', label: 'MSISDN (Phone)' }
]

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'regex', label: 'Regex Match' },
  { value: 'exists', label: 'Exists' }
]

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

const generateMockHypotheses = (): Hypothesis[] => [
  {
    id: 'hyp-001',
    title: 'Suspicious PowerShell Activity on Domain Controllers',
    description: 'Investigate anomalous PowerShell execution patterns on critical infrastructure systems',
    status: 'active',
    author: 'Analyst Ahmed',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(),
    tags: ['powershell', 'domain-controller', 'lateral-movement'],
    iocsFound: 12,
    relatedAlerts: 47,
    mitreTactics: ['TA0002', 'TA0008'],
    mitreTechniques: ['T1059.001', 'T1021.002']
  },
  {
    id: 'hyp-002',
    title: 'Potential Data Exfiltration via DNS Tunneling',
    description: 'Hunt for DNS queries that may indicate data exfiltration using tunneling techniques',
    status: 'active',
    author: 'Analyst Fatima',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 3600000),
    tags: ['dns', 'exfiltration', 'network'],
    iocsFound: 5,
    relatedAlerts: 23,
    mitreTactics: ['TA0010', 'TA0011'],
    mitreTechniques: ['T1048', 'T1071.001']
  },
  {
    id: 'hyp-003',
    title: 'SS7 Signaling Anomaly Detection',
    description: 'Investigate unusual SS7 signaling patterns that may indicate subscriber tracking attacks',
    status: 'completed',
    author: 'Telecom Analyst Omar',
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date(Date.now() - 86400000 * 1),
    tags: ['ss7', 'telecom', 'subscriber-tracking'],
    iocsFound: 28,
    relatedAlerts: 156,
    mitreTactics: ['TA0009', 'TA0040'],
    mitreTechniques: ['T1005', 'T1530']
  },
  {
    id: 'hyp-004',
    title: 'SIM Swap Fraud Pattern Analysis',
    description: 'Identify patterns associated with SIM swap attacks targeting high-value accounts',
    status: 'draft',
    author: 'Fraud Analyst Leila',
    createdAt: new Date(Date.now() - 3600000 * 12),
    updatedAt: new Date(Date.now() - 3600000 * 12),
    tags: ['sim-swap', 'fraud', 'telecom'],
    iocsFound: 0,
    relatedAlerts: 8,
    mitreTactics: ['TA0001', 'TA0040'],
    mitreTechniques: ['T1566', 'T1078']
  },
  {
    id: 'hyp-005',
    title: 'Credential Stuffing Attack Investigation',
    description: 'Analyze authentication logs for credential stuffing patterns against customer portals',
    status: 'active',
    author: 'SOC Analyst Karim',
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 7200000),
    tags: ['credentials', 'authentication', 'web-app'],
    iocsFound: 34,
    relatedAlerts: 892,
    mitreTactics: ['TA0001', 'TA0006'],
    mitreTechniques: ['T1110', 'T1003']
  }
]

const generateMockSessions = (): HuntSession[] => [
  { id: 'sess-001', hypothesisId: 'hyp-001', name: 'PS Hunt - DCs Week 48', status: 'running', startedAt: new Date(Date.now() - 7200000), resultsCount: 234, queriesExecuted: 15 },
  { id: 'sess-002', hypothesisId: 'hyp-002', name: 'DNS Exfil Detection', status: 'paused', startedAt: new Date(Date.now() - 86400000), resultsCount: 89, queriesExecuted: 8 },
  { id: 'sess-003', hypothesisId: 'hyp-003', name: 'SS7 Anomaly Q4', status: 'completed', startedAt: new Date(Date.now() - 86400000 * 10), resultsCount: 1247, queriesExecuted: 42 },
  { id: 'sess-004', hypothesisId: 'hyp-005', name: 'Auth Attack Analysis', status: 'running', startedAt: new Date(Date.now() - 14400000), resultsCount: 5678, queriesExecuted: 24 }
]

const generateMockResults = (): HuntResult[] => Array.from({ length: 20 }, (_, i) => ({
  id: `result-${i + 1}`,
  timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
  source: ['SIEM/Wazuh', 'EDR/GRR', 'Network/Suricata', 'Telecom Probe'][Math.floor(Math.random() * 4)],
  eventType: ['Process Creation', 'Network Connection', 'Authentication', 'DNS Query', 'SS7 Message'][Math.floor(Math.random() * 5)],
  severity: ['info', 'low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 5)] as HuntResult['severity'],
  summary: `Detected suspicious activity matching hunt criteria - Event #${1000 + i}`,
  iocs: [`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, `IOC-HASH-${Math.random().toString(36).substr(2, 8).toUpperCase()}`],
  rawLog: undefined
}))

// ============================================================
// COMPONENTS
// ============================================================

function HypothesisForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (hypothesis: Omit<Hypothesis, 'id' | 'createdAt' | 'updatedAt' | 'iocsFound' | 'relatedAlerts'>) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTactics, setSelectedTactics] = useState<string[]>([])
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [showMitreSelector, setShowMitreSelector] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      description,
      status: 'draft',
      author: 'Current Analyst',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      mitreTactics: selectedTactics.length > 0 ? selectedTactics : undefined,
      mitreTechniques: selectedTechniques.length > 0 ? selectedTechniques : undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Hypothesis Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a clear, testable hypothesis..."
          className="bg-slate-800 border-slate-600"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you are hunting for and why..."
          rows={3}
          className="bg-slate-800 border-slate-600 resize-none"
        />
      </div>

      {/* MITRE ATT&CK Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Crosshair className="h-4 w-4" />
          MITRE ATT&amp;CK Mapping
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMitreSelector(!showMitreSelector)}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Target className="h-4 w-4 mr-2" />
          {showMitreSelector ? 'Hide' : 'Show'} MITRE Selector
          {(selectedTactics.length > 0 || selectedTechniques.length > 0) && (
            <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400">
              {selectedTactics.length + selectedTechniques.length}
            </Badge>
          )}
        </Button>

        {showMitreSelector && (
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-4">
            {/* Tactics Selection */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Tactics</p>
              <ScrollArea className="h-[150px]">
                <div className="flex flex-wrap gap-2">
                  {MITRE_TACTICS.map(tactic => (
                    <button
                      key={tactic.id}
                      type="button"
                      onClick={() => {
                        if (selectedTactics.includes(tactic.id)) {
                          setSelectedTactics(selectedTactics.filter(t => t !== tactic.id))
                        } else {
                          setSelectedTactics([...selectedTactics, tactic.id])
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        selectedTactics.includes(tactic.id)
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                          : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                      }`}
                      title={tactic.description}
                    >
                      {tactic.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Techniques Selection */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">
                Techniques (filtered by selected tactics)
              </p>
              <ScrollArea className="h-[150px]">
                <div className="flex flex-wrap gap-2">
                  {MITRE_TECHNIQUES
                    .filter(tech => 
                      selectedTactics.length === 0 || selectedTactics.includes(tech.tactic)
                    )
                    .map(tech => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => {
                          if (selectedTechniques.includes(tech.id)) {
                            setSelectedTechniques(selectedTechniques.filter(t => t !== tech.id))
                          } else {
                            setSelectedTechniques([...selectedTechniques, tech.id])
                          }
                        }}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          selectedTechniques.includes(tech.id)
                            ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                            : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-slate-600'
                        }`}
                      >
                        {tech.name}
                      </button>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Tags (comma-separated)</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="powershell, lateral-movement, detection"
          className="bg-slate-800 border-slate-600"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-400">
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Hypothesis
        </Button>
      </div>
    </form>
  )
}

function QueryBuilder({
  conditions,
  setConditions,
  onExecute
}: {
  conditions: QueryCondition[]
  setConditions: React.Dispatch<React.SetStateAction<QueryCondition[]>>
  onExecute: () => void
}) {
  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: `cond-${Date.now()}`,
        field: '',
        operator: 'equals',
        value: '',
        logic: conditions.length > 0 ? 'AND' : 'AND'
      }
    ])
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          Query Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            {index > 0 && (
              <Select
                value={condition.logic}
                onValueChange={(v) => updateCondition(condition.id, { logic: v as 'AND' | 'OR' })}
              >
                <SelectTrigger className="w-[70px] h-8 bg-slate-700 border-slate-600 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            )}
            {index === 0 && <div className="w-[70px]" />}
            
            <Select
              value={condition.field}
              onValueChange={(v) => updateCondition(condition.id, { field: v })}
            >
              <SelectTrigger className="flex-1 h-8 bg-slate-700 border-slate-600 text-xs min-w-[140px]">
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(v) => updateCondition(condition.id, { operator: v as QueryCondition['operator'] })}
            >
              <SelectTrigger className="w-[130px] h-8 bg-slate-700 border-slate-600 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATOR_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 h-8 bg-slate-700 border-slate-600 text-sm"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-400"
              onClick={() => removeCondition(condition.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
          
          <Button
            size="sm"
            onClick={onExecute}
            disabled={conditions.some(c => !c.field || !c.value)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Execute Query
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function HypothesesList({
  hypotheses,
  onSelect,
  activeId
}: {
  hypotheses: Hypothesis[]
  onSelect: (id: string) => void
  activeId?: string
}) {
  const getStatusColor = (status: Hypothesis['status']) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'completed': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'draft': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'archived': return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
    }
  }

  return (
    <div className="space-y-2">
      {hypotheses.map(hypothesis => (
        <Card
          key={hypothesis.id}
          className={`cursor-pointer transition-all duration-200 ${
            activeId === hypothesis.id
              ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900 border-slate-700 hover:border-slate-600'
          }`}
          onClick={() => onSelect(hypothesis.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white truncate">{hypothesis.title}</h4>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(hypothesis.status)}`}>
                    {hypothesis.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{hypothesis.description}</p>
                
                {/* MITRE Tags */}
                {hypothesis.mitreTechniques && hypothesis.mitreTechniques.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {hypothesis.mitreTechniques.slice(0, 3).map(techId => {
                      const tech = MITRE_TECHNIQUES.find(t => t.id === techId)
                      return tech ? (
                        <Badge key={techId} variant="outline" className="text-[10px] border-orange-500/40 text-orange-400 px-1.5 py-0">
                          {tech.name}
                        </Badge>
                      ) : null
                    })}
                    {hypothesis.mitreTechniques.length > 3 && (
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 px-1.5 py-0">
                        +{hypothesis.mitreTechniques.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {hypothesis.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.ceil((Date.now() - hypothesis.updatedAt.getTime()) / 3600000)}h ago
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 text-right">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-400 font-medium">{hypothesis.iocsFound} IOCs</span>
                  <span className="text-cyan-400 font-medium">{hypothesis.relatedAlerts} alerts</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SessionsTable({ sessions }: { sessions: HuntSession[] }) {
  const getStatusIcon = (status: HuntSession['status']) => {
    switch (status) {
      case 'running':
        return <StatusIndicator status="good" size="sm" showLabel />
      case 'paused':
        return <StatusIndicator status="warning" size="sm" showLabel />
      case 'completed':
        return <StatusIndicator status="excellent" size="sm" showLabel />
      case 'failed':
        return <StatusIndicator status="critical" size="sm" showLabel />
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          Active Hunt Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Session Name</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-slate-400 font-medium">Started</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">Results</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">Queries</th>
                <th className="text-right py-2 px-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-3">
                    <span className="text-white font-medium">{session.name}</span>
                  </td>
                  <td className="py-2 px-3">{getStatusIcon(session.status)}</td>
                  <td className="py-2 px-3 text-slate-400">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3 text-right text-cyan-400 font-mono">
                    {session.resultsCount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400 font-mono">
                    {session.queriesExecuted}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {session.status === 'running' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300">
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {session.status === 'paused' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:text-green-300">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultsPanel({ results }: { results: HuntResult[] }) {
  const getSeverityColor = (severity: HuntResult['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            Hunt Results
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 ml-2">
              {results.length} found
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {results.map(result => (
              <div
                key={result.id}
                className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getSeverityColor(result.severity)}`}>
                      {result.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">{result.source}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {result.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mb-2">{result.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {result.iocs.map((ioc, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] border-red-500/40 text-red-400 px-1.5 py-0 font-mono">
                      <Fingerprint className="h-3 w-3 mr-1" />
                      {ioc}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAIN THREAT HUNTING DASHBOARD COMPONENT
// ============================================================

export default function ThreatHuntingDashboard() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [sessions, setSessions] = useState<HuntSession[]>([])
  const [results, setResults] = useState<HuntResult[]>([])
  const [activeHypothesis, setActiveHypothesis] = useState<string | null>(null)
  const [queryConditions, setQueryConditions] = useState<QueryCondition[]>([
    { id: 'cond-1', field: '', operator: 'equals', value: '', logic: 'AND' }
  ])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setHypotheses(generateMockHypotheses())
      setSessions(generateMockSessions())
      setResults(generateMockResults())
      setIsLoading(false)
    }, 600)
  }, [])

  const handleCreateHypothesis = (data: Omit<Hypothesis, 'id' | 'createdAt' | 'updatedAt' | 'iocsFound' | 'relatedAlerts'>) => {
    const newHypothesis: Hypothesis = {
      ...data,
      id: `hyp-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      iocsFound: 0,
      relatedAlerts: 0
    }
    setHypotheses([newHypothesis, ...hypotheses])
    setShowCreateDialog(false)
  }

  const handleExecuteQuery = () => {
    console.log('Executing query:', queryConditions)
    // Simulate query execution
    setResults(generateMockResults())
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Radar className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-slate-400">Loading Threat Hunting Workspace...</p>
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
                <Crosshair className="h-7 w-7 text-purple-400" />
                Threat Hunting Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Proactive Threat Detection &amp; Hypothesis-Driven Investigations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Hypothesis
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <Sword className="h-5 w-5 text-purple-400" />
                      Create New Hunt Hypothesis
                    </DialogTitle>
                  </DialogHeader>
                  <HypothesisForm
                    onSubmit={handleCreateHypothesis}
                    onCancel={() => setShowCreateDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs defaultValue="workspace" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="workspace" className="data-[state=active]:bg-slate-700">
              <Radar className="h-4 w-4 mr-2" />
              Workspace
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-700">
              <Brain className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-slate-700">
              <Bookmark className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
          </TabsList>

          {/* Workspace Tab */}
          <TabsContent value="workspace" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Hypotheses List */}
              <div className="lg:col-span-1 space-y-4">
                <SmartFilter
                  onFilterChange={(filters) => console.log('Filters:', filters)}
                  placeholder="Search hypotheses..."
                  showSeverityFilter={false}
                  showStatusFilter={true}
                  showSourceFilter={false}
                />
                <HypothesesList
                  hypotheses={hypotheses}
                  onSelect={setActiveHypothesis}
                  activeId={activeHypothesis || undefined}
                />
              </div>

              {/* Right Column - Query Builder & Results */}
              <div className="lg:col-span-2 space-y-6">
                <QueryBuilder
                  conditions={queryConditions}
                  setConditions={setQueryConditions}
                  onExecute={handleExecuteQuery}
                />
                <ResultsPanel results={results} />
              </div>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionsTable sessions={sessions} />
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Living off the Land', count: 45, icon: <Code className="h-5 w-5" />, color: 'text-blue-400' },
                { title: 'Telecom Fraud Patterns', count: 32, icon: <Phone className="h-5 w-5" />, color: 'text-orange-400' },
                { title: 'Insider Threat Indicators', count: 28, icon: <User className="h-5 w-5" />, color: 'text-purple-400' },
                { title: 'APT Detection Rules', count: 67, icon: <Bug className="h-5 w-5" />, color: 'text-red-400' },
                { title: 'Data Exfiltration Signs', count: 41, icon: <Download className="h-5 w-5" />, color: 'text-cyan-400' },
                { title: 'Credential Attacks', count: 53, icon: <Lock className="h-5 w-5" />, color: 'text-yellow-400' }
              ].map((template, index) => (
                <Card key={index} className="bg-slate-900 border-slate-700 hover:border-slate-600 cursor-pointer transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-slate-800 ${template.color}`}>
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{template.title}</h4>
                        <p className="text-sm text-slate-400">{template.count} hunt templates available</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
