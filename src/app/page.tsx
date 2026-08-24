'use client'

import React, { useState } from 'react'
import {
  Shield, Bot, Network, Lock, Zap, BarChart3,
  Globe, AlertTriangle, Activity, Users, Database,
  Eye, Settings, Bell, Search, Menu, X,
  Brain, Target, Radar, Workflow, ChevronRight,
  Clock, UserCog
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { AISocCopilot } from '@/components/ai-copilot/AISocCopilot'
import { SecurityKnowledgeGraph } from '@/components/security-graph/SecurityKnowledgeGraph'
import { ThreatIntelligenceCenter } from '@/components/threat-intel/ThreatIntelligenceCenter'
import { SOARPlaybookEngine } from '@/components/soar-engine/SOARPlaybookEngine'
import { FullAdminInterface } from '@/components/admin/FullAdminInterface'

// Dashboard Stats
const platformStats = {
  eventsProcessed: 2847392,
  alertsGenerated: 847,
  activeIncidents: 23,
  threatScore: 87,
  detectionCoverage: 94.2,
  automationRate: 78,
  mttD: 847, // seconds
  mttr: 4230 // seconds (1.17 hours)
}

const quickActions = [
  { label: 'Run Threat Hunt', icon: Radar, color: 'from-purple-500 to-pink-500' },
  { label: 'Generate Report', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
  { label: 'Review Detections', icon: Eye, color: 'from-emerald-500 to-green-400' },
  { label: 'System Health', icon: Activity, color: 'from-orange-500 to-yellow-400' },
]

export default function CyberSOCPlatform() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [copilotExpanded, setCopilotExpanded] = useState(true)
  const [showAdminInterface, setShowAdminInterface] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden text-slate-400 hover:text-white"
                onClick={() => setShowMobileNav(!showMobileNav)}
              >
                {showMobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="relative">
                <div className="p-2 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  CyberSOC
                  <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 text-xs font-semibold px-2 py-0.5">
                    AI-Native
                  </Badge>
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">Cyber Defense Operating System</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Events/sec</p>
                  <p className="text-sm font-bold text-emerald-400">{(platformStats.eventsProcessed / 86400).toFixed(0)}</p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Active Incidents</p>
                  <p className="text-sm font-bold text-orange-400">{platformStats.activeIncidents}</p>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div className="text-right">
                  <p className="text-xs text-slate-400">Threat Score</p>
                  <p className={`text-sm font-bold ${platformStats.threatScore >= 80 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {platformStats.threatScore}/100
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-slate-400 hover:text-white relative ${showAdminInterface ? 'bg-red-500/20 text-red-400' : ''}`}
                onClick={() => setShowAdminInterface(!showAdminInterface)}
              >
                <UserCog className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold cursor-pointer hover:ring-2 ring-emerald-500/50 transition-all">
                SA
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Show Admin Interface or Main Dashboard */}
      {showAdminInterface ? (
        <FullAdminInterface />
      ) : (
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-slate-900 border-r border-slate-800
          transform transition-transform duration-300 ease-in-out
          ${showMobileNav ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-4">
            {/* Navigation */}
            <nav className="space-y-1 flex-1 overflow-y-auto">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-3">
                Main Modules
              </p>
              
              {[
                { id: 'overview', label: 'Command Center', icon: Brain, badge: 'AI', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
                { id: 'siem', label: 'SIEM & Detection', icon: Zap, badge: null },
                { id: 'graph', label: 'Knowledge Graph', icon: Network, badge: 'Live', badgeColor: 'bg-blue-500/20 text-blue-400' },
                { id: 'threats', label: 'Threat Intel', icon: Radar, badge: '47 IOCs', badgeColor: 'bg-orange-500/20 text-orange-400' },
                { id: 'soar', label: 'SOAR Engine', icon: Workflow, badge: 'Active', badgeColor: 'bg-purple-500/20 text-purple-400' },
                { id: 'hunt', label: 'Threat Hunting', icon: Target, badge: null },
                { id: 'dfir', label: 'DFIR Workspace', icon: Search, badge: null },
                { id: 'mssp', label: 'MSSP Portal', icon: Users, badge: 'New', badgeColor: 'bg-cyan-500/20 text-cyan-400' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left
                    ${activeTab === item.id 
                      ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-white border border-emerald-500/30' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-emerald-400' : ''}`} />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className={`${item.badgeColor || 'bg-slate-700 text-slate-300'} border-0 text-[10px]`}>
                      {item.badge}
                    </Badge>
                  )}
                </button>
              ))}

              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-6 mb-2 px-3">
                Analytics
              </p>
              
              {[
                { id: 'analytics', label: 'Security Analytics', icon: BarChart3 },
                { id: 'compliance', label: 'Compliance', icon: Shield },
                { id: 'risk', label: 'Risk Management', icon: AlertTriangle },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left
                    ${activeTab === item.id 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* User & Status */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center gap-3 px-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  SA
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">Security Analyst</p>
                  <p className="text-xs text-emerald-400">Online</p>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Platform Status</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Operational</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Detection</p>
                    <p className="text-white font-medium">{platformStats.detectionCoverage}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Automation</p>
                    <p className="text-white font-medium">{platformStats.automationRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:ml-0 ml-64">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            {/* Overview Tab - Command Center with AI Copilot */}
            <TabsContent value="overview" className="h-full m-0">
              <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Page Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Brain className="h-7 w-7 text-emerald-500" />
                      SOC Command Center
                    </h2>
                    <p className="text-slate-400 mt-1">AI-augmented security operations overview</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {quickActions.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className={`bg-gradient-to-r ${action.color} border-0 text-white hover:opacity-90 hidden sm:flex`}
                      >
                        <action.icon className="h-4 w-4 mr-1" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'MTTD', value: `${Math.floor(platformStats.mttD / 60)}:${(platformStats.mttD % 60).toString().padStart(2, '0')}`, change: '-12%', positive: true, icon: Activity, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
                    { title: 'MTTR', value: `${Math.floor(platformStats.mttr / 3600)}h ${(Math.floor((platformStats.mttr % 3600) / 60))}m`, change: '-18%', positive: true, icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
                    { title: 'Alerts Today', value: platformStats.alertsGenerated.toString(), change: '+5%', positive: false, icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
                    { title: 'Automation Rate', value: `${platformStats.automationRate}%`, change: '+8%', positive: true, icon: Zap, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
                  ].map((metric, i) => (
                    <Card key={i} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-sm">{metric.title}</span>
                          <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                            <metric.icon className={`h-4 w-4 ${metric.color}`} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs ${metric.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {metric.change}
                          </span>
                          <span className="text-xs text-slate-500">vs yesterday</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Main Content Grid - AI Copilot + Graph */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* AI SOC Copilot */}
                  <div className={`${copilotExpanded ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
                    <AISocCopilot />
                  </div>

                  {/* Security Knowledge Graph */}
                  {!copilotExpanded && (
                    <div className="lg:col-span-1">
                      <SecurityKnowledgeGraph />
                    </div>
                  )}
                </div>

                {/* Bottom Row - Threat Intel + SOAR Preview */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Threat Intelligence Summary */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-white flex items-center gap-2">
                          <Radar className="h-5 w-5 text-orange-500" />
                          Threat Intelligence Summary
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
                          View All <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Active Campaigns */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Campaigns</p>
                        
                        <div className="space-y-2">
                          {[
                            { name: 'Operation Phishing Storm', actor: 'APT-29', severity: 'high', iocs: 47, status: 'active' },
                            { name: 'RansomWave Q3 2024', actor: 'LockBit', severity: 'critical', iocs: 234, status: 'active' },
                          { name: 'Supply Chain Attack', actor: 'Unknown', severity: 'medium', iocs: 12, status: 'monitoring' },
                          ].map((campaign, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                              <div className={`w-2 h-2 rounded-full ${
                                campaign.severity === 'critical' ? 'bg-red-500 animate-pulse' :
                                campaign.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{campaign.name}</p>
                                <p className="text-xs text-slate-400">{campaign.actor} • {campaign.iocs} IOCs</p>
                              </div>
                              <Badge variant="secondary" className={
                                campaign.status === 'active' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                'bg-slate-700 text-slate-300'
                              }>
                                {campaign.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Critical IOCs */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Critical IOCs</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { type: 'IP', value: '185.220.101.45', risk: 95 },
                            { type: 'Domain', value: 'evil-c2[.]ru', risk: 98 },
                            { type: 'Hash', value: 'a1b2c3d4...', risk: 92 },
                            { type: 'Email', value: 'ceo-fraud@...', risk: 88 },
                          ].map((ioc, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 border border-slate-700 hover:border-red-500/50 cursor-pointer transition-colors">
                                  <span className="text-[10px] font-medium text-slate-500">{ioc.type}</span>
                                  <span className="text-xs font-mono text-white max-w-[100px] truncate">{ioc.value}</span>
                                  <span className="text-xs font-bold text-red-400">{ioc.risk}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-slate-800 border-slate-600">
                                <p className="font-mono text-xs">{ioc.value}</p>
                                <p className="text-xs text-red-400 mt-1">Risk Score: {ioc.risk}/100</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* SOAR Playbooks Status */}
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-white flex items-center gap-2">
                          <Workflow className="h-5 w-5 text-purple-500" />
                          Active Playbooks
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
                          Manage All <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        {
                          name: 'Phishing Response',
                          incident: 'INC-4521',
                          progress: 35,
                          autonomy: 2,
                          status: 'running',
                          currentStep: 'Containment Actions',
                          timeRunning: '2h 15m'
                        },
                        {
                          name: 'Data Exfiltration',
                          incident: 'INC-4522',
                          progress: 15,
                          autonomy: 3,
                          status: 'running',
                          currentStep: 'Evidence Preservation',
                          timeRunning: '45m'
                        },
                        {
                          name: 'Malware Containment',
                          incident: 'INC-4520',
                          progress: 100,
                          autonomy: 2,
                          status: 'completed',
                          currentStep: 'Post-Incident Review',
                          timeRunning: 'Completed'
                        },
                      ].map((playbook, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                playbook.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                playbook.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-500'
                              }`} />
                              <span className="text-sm font-medium text-white">{playbook.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={
                                playbook.autonomy >= 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                playbook.autonomy >= 2 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                'bg-slate-700 text-slate-300'
                              }>
                                L{playbook.autonomy}
                              </Badge>
                              <span className="text-xs text-slate-400">{playbook.incident}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Current: {playbook.currentStep}</span>
                              <span className="text-slate-400">{playbook.timeRunning}</span>
                            </div>
                            
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  playbook.status === 'completed' ? 'bg-emerald-500' :
                                  playbook.status === 'running' ? 'bg-blue-500' : 'bg-slate-500'
                                }`}
                                style={{ width: `${playbook.progress}%` }}
                              />
                            </div>
                            
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{playbook.progress}% complete</span>
                              <span className={
                                playbook.status === 'completed' ? 'text-emerald-400' :
                                playbook.status === 'running' ? 'text-blue-400' : 'text-slate-400'
                              }>
                                {playbook.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* SIEM Tab */}
            <TabsContent value="siem" className="h-full m-0">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Zap className="h-7 w-7 text-emerald-500" />
                    SIEM & Detection Engine
                  </h2>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
                    Real-time Processing Active
                  </Badge>
                </div>

                {/* SIEM Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'EPS (Events/Sec)', value: '32,847', trend: '+12%' },
                    { label: 'Detection Rules', value: '1,247', trend: '+24' },
                    { label: 'False Positive Rate', value: '4.2%', trend: '-1.8%' },
                    { label: 'Correlation Engine', value: 'Active', trend: null },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-slate-900 border-slate-800">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-white">{stat.value}</p>
                        {stat.trend && (
                          <p className={`text-xs mt-1 ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stat.trend} from last hour
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Full-width components for other tabs */}
                <SecurityKnowledgeGraph />
              </div>
            </TabsContent>

            {/* Knowledge Graph Tab */}
            <TabsContent value="graph" className="h-full m-0">
              <div className="p-6">
                <SecurityKnowledgeGraph />
              </div>
            </TabsContent>

            {/* Threat Intel Tab */}
            <TabsContent value="threats" className="h-full m-0">
              <div className="p-6">
                <ThreatIntelligenceCenter />
              </div>
            </TabsContent>

            {/* SOAR Tab */}
            <TabsContent value="soar" className="h-full m-0">
              <div className="p-6">
                <SOARPlaybookEngine />
              </div>
            </TabsContent>

            {/* Other tabs placeholder */}
            {['hunt', 'dfir', 'mssp', 'analytics', 'compliance', 'risk'].map((tabId) => (
              <TabsContent key={tabId} value={tabId} className="h-full m-0">
                <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-800 inline-block">
                      {tabId === 'hunt' && <Target className="h-12 w-12 text-emerald-500 mx-auto" />}
                      {tabId === 'dfir' && <Search className="h-12 w-12 text-blue-500 mx-auto" />}
                      {tabId === 'mssp' && <Users className="h-12 w-12 text-purple-500 mx-auto" />}
                      {tabId === 'analytics' && <BarChart3 className="h-12 w-12 text-orange-500 mx-auto" />}
                      {tabId === 'compliance' && <Shield className="h-12 w-12 text-green-500 mx-auto" />}
                      {tabId === 'risk' && <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />}
                    </div>
                    <h3 className="text-xl font-bold text-white capitalize">{tabId.replace('_', ' ')}</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                      This module is part of the CyberSOC strategic roadmap implementation.
                      Full functionality coming in the next development phase.
                    </p>
                    <Badge className="mt-4 bg-slate-800 text-slate-300 border-slate-600">
                      Phase 2 Development
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>
      )}

      {/* Mobile Overlay */}
      {showMobileNav && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setShowMobileNav(false)}
        />
      )}
    </div>
  )
}
