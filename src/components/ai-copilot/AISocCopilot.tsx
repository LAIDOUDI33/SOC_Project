'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Send, Bot, User, Sparkles, Shield, AlertTriangle, Search, 
  Lightbulb, Activity, Brain, ChevronDown, ChevronUp,
  Copy, ThumbsUp, ThumbsDown, RefreshCw, Zap, Target,
  FileText, Network, Lock, Globe, Database, Cpu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'analysis' | 'recommendation' | 'alert' | 'investigation'
  confidence?: number
  sources?: string[]
  actions?: Array<{
    label: string
    action: string
    icon: React.ReactNode
  }>
}

interface SuggestedQuery {
  text: string
  icon: React.ReactNode
  category: 'investigation' | 'detection' | 'threat' | 'response'
}

const suggestedQueries: SuggestedQuery[] = [
  {
    text: "What happened in the last 24 hours?",
    icon: <Activity className="h-4 w-4" />,
    category: 'investigation'
  },
  {
    text: "Show me high-risk alerts requiring attention",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'detection'
  },
  {
    text: "Analyze the phishing campaign targeting our executives",
    icon: <Search className="h-4 w-4" />,
    category: 'threat'
  },
  {
    text: "Recommend containment actions for incident #4521",
    icon: <Shield className="h-4 w-4" />,
    category: 'response'
  },
  {
    text: "Which users show anomalous behavior today?",
    icon: <Brain className="h-4 w-4" />,
    category: 'detection'
  },
  {
    text: "Summarize the active threat landscape",
    icon: <Globe className="h-4 w-4" />,
    category: 'threat'
  }
]

const aiCapabilities = [
  { name: 'Threat Analysis', icon: <Brain className="h-4 w-4" />, status: 'active' },
  { name: 'Investigation Assist', icon: <Search className="h-4 w-4" />, status: 'active' },
  { name: 'Detection Tuning', icon: <Target className="h-4 w-4" />, status: 'active' },
  { name: 'Response Advisor', icon: <Shield className="h-4 w-4" />, status: 'standby' },
  { name: 'Threat Hunting', icon: <Zap className="h-4 w-4" />, status: 'active' },
  { name: 'Compliance Check', icon: <FileText className="h-4 w-4" />, status: 'active' },
]

export function AISocCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "I'm your AI SOC Copilot. I can help you investigate threats, analyze security events, tune detections, and coordinate response actions. What would you like to work on?",
      timestamp: new Date(),
      type: 'text',
      actions: [
        { label: 'Show Recent Alerts', action: 'alerts', icon: <AlertTriangle className="h-3 w-3" /> },
        { label: 'Active Incidents', action: 'incidents', icon: <Activity className="h-3 w-3" /> },
        { label: 'Threat Landscape', action: 'threats', icon: <Globe className="h-3 w-3" /> },
      ]
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Simulate AI response generation
  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500))

    const lowerMsg = userMessage.toLowerCase()
    
    if (lowerMsg.includes('what happened') || lowerMsg.includes('last 24') || lowerMsg.includes('summary')) {
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `## Security Operations Summary - Last 24 Hours

### Key Metrics
- **Total Events Processed**: 2,847,392
- **Alerts Generated**: 847 (↓12% from yesterday)
- **Incidents Created**: 23
- **Critical Severity**: 7 alerts requiring immediate attention

### Notable Events
1. **Phishing Campaign Detected** (09:42 UTC) - 47 targeted emails blocked, 3 users clicked but were contained
2. **Brute Force Attack Blocked** (11:15 UTC) - Source IP 185.220.x.x, 2,847 failed attempts against VPN portal
3. **Anomalous Data Transfer** (14:33 UTC) - User admin@finance dept transferred 4.2GB to external storage (under investigation)

### Active Threats
- **APT-29 Indicators**: 3 IOCs matched in network traffic
- **Ransomware Variant**: New LockBit 3.0 signature detected in sandbox
- **Insider Risk**: 2 users flagged for unusual access patterns

### Recommendations
1. Prioritize investigation of data transfer anomaly (high business impact)
2. Review phishing campaign targets for additional training
3. Update firewall rules for brute force source IP`,
        timestamp: new Date(),
        type: 'analysis',
        confidence: 94,
        sources: ['SIEM Engine', 'UEBA Module', 'Threat Intel Feed', 'EDR Telemetry'],
        actions: [
          { label: 'View Full Report', action: 'report', icon: <FileText className="h-3 w-3" /> },
          { label: 'Start Investigation', action: 'investigate', icon: <Search className="h-3 w-3" /> },
          { label: 'Export Summary', action: 'export', icon: <Database className="h-3 w-3" /> },
        ]
      }
    }
    
    if (lowerMsg.includes('phishing') || lowerMsg.includes('campaign') || lowerMsg.includes('email')) {
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `## Phishing Campaign Analysis

### Campaign Overview
**Identifier**: PHISH-CMP-2024-0847  
**Status**: Active - Contained  
**First Seen**: 2024-08-24 09:42:17 UTC  
**Target**: Executive Leadership Team (C-suite + VPs)

### Attack Vector
- **Method**: Business Email Compromise (BEC) with vendor impersonation
- **Sender**: spoofed@critical-supplier.com (legitimate domain compromised)
- **Payload**: HTML attachment with credential harvesting form
- **Technique**: MITRE ATT&CK T1566 (Phishing)

### Impact Assessment
| Metric | Value |
|--------|-------|
| Emails Sent | 47 |
| Delivered | 12 (25.5%) |
| Clicked Link | 3 (6.4%) |
| Credentials Entered | 0 (form blocked) |
| Reported by Users | 8 (17%) |

### Containment Actions Taken
✅ Malicious domains blocked via DNS sinkhole  
✅ Sender added to blocklist  
✅ Affected users' sessions invalidated  
✅ MFA re-enrollment triggered for clicked users  

### Recommended Next Steps
1. **Immediate**: Reset credentials for all 3 users who clicked
2. **Short-term**: Brief executive team on targeted nature
3. **Long-term**: Enhance email filtering rules for BEC patterns`,
        timestamp: new Date(),
        type: 'investigation',
        confidence: 91,
        sources: ['Email Security Gateway', 'Threat Intel', 'User Reports', 'DNS Logs'],
        actions: [
          { label: 'View IOC Details', action: 'iocs', icon: <Lock className="h-3 w-3" /> },
          { label: 'Run Playbook', action: 'playbook', icon: <Zap className="h-3 w-3" /> },
          { label: 'Full Timeline', action: 'timeline', icon: <Activity className="h-3 w-3" /> },
        ]
      }
    }
    
    if (lowerMsg.includes('containment') || lowerMsg.includes('response') || lowerMsg.includes('incident')) {
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `## Incident Response Recommendations

### Incident #4521 - Critical Data Exfiltration Attempt

#### Current Status: **CONTAINMENT IN PROGRESS**

### Situation Summary
- **Type**: Insider Threat / Data Exfiltration
- **Severity**: CRITICAL
- **Affected Asset**: FILESERVER-PROD-02
- **Data at Risk**: Financial reports, customer PII (~4.2GB)

### Recommended Containment Actions

#### Immediate (Autonomous - Level 2 Approved)
| Action | Priority | Status |
|--------|----------|--------|
| Isolate affected endpoint | P1 | ✅ Completed |
| Suspend user account | P1 | ✅ Completed |
| Block external IP (185.220.x.x) | P1 | ✅ Completed |
| Preserve forensic snapshot | P1 | 🔄 In Progress |

#### Requires Approval (Level 3+)
| Action | Risk | Recommendation |
|--------|------|----------------|
| Disable user's VPN access | Medium | **APPROVE** - Standard procedure |
| Revoke all active sessions | Low | **APPROVE** - Containment priority |
| Notify legal/compliance | Informational | **APPROVE** - Regulatory requirement |
| Initiate legal hold on emails | Low | **APPROVE** - Evidence preservation |

### Autonomy Assessment
Current incident qualifies for **Level 2 Autonomous Response** based on:
- Clear indicator pattern (multiple anomalies correlated)
- Pre-approved playbook exists (#PB-INSIDER-DATA-EXFIL)
- Impact scope is containable
- No production system disruption expected

**Would you like me to execute approved actions automatically?**`,
        timestamp: new Date(),
        type: 'recommendation',
        confidence: 89,
        sources: ['SOAR Engine', 'Playbook Library', 'Policy Engine', 'Risk Scorer'],
        actions: [
          { label: 'Execute Auto-Response', action: 'auto-respond', icon: <Cpu className="h-3 w-3" /> },
          { label: 'Request Human Approval', action: 'approve', icon: <Shield className="h-3 w-3" /> },
          { label: 'Escalate to L3', action: 'escalate', icon: <AlertTriangle className="h-3 w-3" /> },
        ]
      }
    }
    
    if (lowerMsg.includes('anomalous') || lowerMsg.includes('user behavior') || lowerMsg.includes('ueba')) {
      return {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `## UEBA Anomaly Detection Results

### Users Flagged Today: 5

#### 🔴 High Risk (Immediate Review Required)

**user: maria.chen@finance.dept**
- **Risk Score**: 94/100 (↑23 from baseline)
- **Anomalies Detected**:
  - Accessed 847 files (baseline: 45, +1781%)
  - Exported 4.2GB to personal cloud storage
  - Login from new geolocation (Algeria → unusual)
  - After-hours activity (02:00-04:00 local)
- **MITRE Techniques**: T1005 (Data Staged), T1486 (Data Encrypted for Impact)
- **Assessment**: **HIGH CONFIDENCE** - Potential data exfiltration

**user: ahmed.benali@engineering**
- **Risk Score**: 78/100 (↑34 from baseline)
- **Anomalies Detected**:
  - SSH connections to 12 internal servers (baseline: 2)
  - Ran privileged commands on database servers
  - Downloaded network scanning tools
  - Multiple failed authentication attempts
- **MITRE Techniques**: T1021.004 (Remote Services: SSH), T1048 (Exfiltration Over Alternative Protocol)
- **Assessment**: **MEDIUM-HIGH** - Possible reconnaissance/lateral movement

#### 🟡 Medium Risk (Monitor)
- **sara.lewis@hr.dept** - Score: 62 (+15) - Unusual payroll access pattern
- **admin.it@ops** - Score: 58 (+12) - Bulk user export operation
- **guest.contractor@vendor** - Score: 51 (+28) - Accessing out-of-scope resources

### Recommended Actions
1. **IMMEDIATE**: Investigate maria.chen - initiate insider threat playbook
2. **URGENT**: Review ahmed.beni credentials and access logs
3. **MONITOR**: Continue tracking medium-risk users`,
        timestamp: new Date(),
        type: 'analysis',
        confidence: 92,
        sources: ['UEBA Engine', 'Identity Provider', 'Endpoint Telemetry', 'Network Flow'],
        actions: [
          { label: 'Investigate Top User', action: 'investigate-user', icon: <Search className="h-3 w-3" /> },
          { label: 'Tune Detection Rules', action: 'tune', icon: <Target className="h-3 w-3" /> },
          { label: 'Export UEBA Report', action: 'export', icon: <FileText className="h-3 w-3" /> },
        ]
      }
    }
    
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `I understand you're asking about: "${userMessage}"

Let me analyze this across our security data fabric...

### Analysis Complete

Based on current security posture and available intelligence:

**Key Findings:**
- Cross-referenced 2.8M events from SIEM, EDR, NDR, and Identity telemetry
- Correlated with latest threat intelligence feeds
- Checked against MITRE ATT&CK framework coverage
- Evaluated risk scores against asset criticality matrix

**Assessment:**
I can provide detailed analysis on this topic. Would you like me to:
1. **Deep dive** into specific indicators or entities?
2. **Generate a report** with full evidence chain?
3. **Initiate automated investigation** using threat hunting workflows?
4. **Check detection coverage** for related attack techniques?

Please clarify your focus area and I'll provide targeted analysis.`,
      timestamp: new Date(),
      type: 'text',
      confidence: 87,
      sources: ['SIEM', 'Threat Intel', 'Knowledge Graph', 'Detection Engine'],
      actions: [
        { label: 'Deep Dive', action: 'deep-dive', icon: <Search className="h-3 w-3" /> },
        { label: 'Generate Report', action: 'report', icon: <FileText className="h-3 w-3" /> },
        { label: 'Auto-Investigate', action: 'auto-investigate', icon: <Brain className="h-3 w-3" /> },
      ]
    }
  }

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const aiResponse = await generateAIResponse(userMessage.content)
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI response error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I encountered an error processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
        type: 'alert'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading])

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query)
    inputRef.current?.focus()
  }

  const handleActionClick = (action: string) => {
    console.log('Action triggered:', action)
  }

  const formatMessageContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('### ')) {
          return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-slate-200">{line.replace('### ', '')}</h4>
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-white">{line.replace('## ', '')}</h3>
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="text-lg font-bold mt-4 mb-2 text-white">{line.replace('# ', '')}</h2>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-emerald-400 my-1">{line.replace(/\*\*/g, '')}</p>
        }
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line.split('|').filter(c => c.trim())
          if (cells.some(c => c.includes('---'))) return null
          return (
            <div key={i} className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 py-1 text-xs">
              {cells.map((cell, j) => (
                <span key={j} className={j === 0 ? 'font-medium text-slate-300' : 'text-slate-400'}>
                  {cell.trim().replace(/\*\*/g, '')}
                </span>
              ))}
            </div>
          )
        }
        if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
          return <p key={i} className="ml-4 text-sm text-slate-300 my-0.5 flex items-start gap-2"><span className="text-emerald-400 mt-1">•</span>{line.replace(/^[-\d.]\s/, '').replace(/\*\*/g, '')}</p>
        }
        if (line.startsWith('✅') || line.startsWith('🔄')) {
          return <p key={i} className="ml-4 text-sm text-slate-300 my-0.5">{line}</p>
        }
        if (line.trim()) {
          return <p key={i} className="text-sm text-slate-300 my-1 leading-relaxed">{line.replace(/\*\*/g, '')}</p>
        }
        return null
      })
      .filter(Boolean)
  }

  return (
    <TooltipProvider>
      <Card className={`bg-slate-900 border-slate-700 shadow-2xl transition-all duration-300 ${isExpanded ? 'h-[calc(100vh-2rem)]' : 'h-auto'}`}>
        <CardHeader className="border-b border-slate-700/50 p-4 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  AI SOC Copilot
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Native
                  </Badge>
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Security Operations Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {aiCapabilities.slice(0, 3).map((cap, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div className={`p-1.5 rounded-lg ${cap.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {cap.icon}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>{cap.name}: {cap.status}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronUp className="h-5 w-5 text-slate-400" />}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
            <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-280px)]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : message.role === 'system'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-white'
                    }`}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.type === 'alert'
                            ? 'bg-red-900/30 border border-red-500/50 text-red-200'
                            : 'bg-slate-800 border border-slate-700 text-slate-200'
                      }`}>
                        {formatMessageContent(message.content)}
                        
                        {message.confidence && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">Confidence</span>
                              <span className="text-emerald-400 font-medium">{message.confidence}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  message.confidence >= 90 ? 'bg-emerald-500' :
                                  message.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${message.confidence}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {message.sources && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.sources.map((source, i) => (
                              <Badge key={i} variant="outline" className="text-xs py-0 border-slate-600 text-slate-400">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {message.actions && (
                        <div className="mt-2 flex flex-wrap gap-2 justify-end">
                          {message.actions.map((action, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              className="text-xs bg-slate-800 border-slate-600 hover:bg-slate-700 hover:text-white"
                              onClick={() => handleActionClick(action.action)}
                            >
                              {action.icon}
                              <span className="ml-1">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-xs text-slate-500">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {message.role === 'assistant' && (
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="p-1 hover:bg-slate-700 rounded transition-colors">
                                  <Copy className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Copy</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="p-1 hover:bg-slate-700 rounded transition-colors">
                                  <ThumbsUp className="h-3 w-3 text-slate-500 hover:text-emerald-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Helpful</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="p-1 hover:bg-slate-700 rounded transition-colors">
                                  <ThumbsDown className="h-3 w-3 text-slate-500 hover:text-red-400" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Not Helpful</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
                        <span className="text-sm text-slate-300">Analyzing security data...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <Separator className="mb-3 bg-slate-700" />
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Suggested queries:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedQueries.map((query, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-slate-800/50 border-slate-700 hover:bg-slate-700 hover:text-white justify-start h-auto py-2 px-3"
                      onClick={() => handleSuggestedQuery(query.text)}
                    >
                      <span className="mr-2 text-emerald-400">{query.icon}</span>
                      <span className="truncate">{query.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask about threats, incidents, detections..."
                  className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                AI responses are based on available security data. Always verify critical findings.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  )
}
