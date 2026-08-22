'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Phone, Radio, Signal, MapPin, AlertTriangle, Shield,
  Activity, Globe, Clock, TrendingUp, TrendingDown,
  Users, Server, Database, Lock, Eye, Download,
  RefreshCw, Filter, Search, ChevronRight, Zap,
  Wifi, Router, Network, Satellite, Bell,
  Navigation, PhoneCall, CreditCard, UserX
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
import StatusIndicator from '@/components/shared/StatusIndicator'
import MetricTrend from '@/components/shared/MetricTrend'
import SmartFilter from '@/components/shared/SmartFilter'
// Import demo data for realistic Djezzy telecom data
import { 
  ss7TrafficData, 
  algeriaWilayaData 
} from '@/lib/demo-data'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts'

// ============================================================
// TYPES FOR TELECOM SECURITY CENTER
// ============================================================

interface SS7Event {
  id: string
  timestamp: Date
  type: 'sendAuthInfo' | 'provideRoamingNumber' | 'updateLocation' | 'cancelLocation' | 'insertSubscriberData'
  source: string
  destination: string
  imsi?: string
  msisdn?: string
  riskScore: number
  status: 'normal' | 'suspicious' | 'malicious'
}

interface DiameterMessage {
  id: string
  timestamp: Date
  command: 'CCR' | 'CCA' | 'DWR' | 'DWA' | 'AAR' | 'AAA'
  applicationId: string
  originHost: string
  destinationHost: string
  resultCode: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface FraudAlert {
  id: string
  type: 'irsf' | 'sim_swap' | 'premium_rate' | 'bypass_fraud' | 'wangiri'
  severity: 'critical' | 'high' | 'medium' | 'low'
  msisdn: string
  imsi?: string
  amount?: number
  location: string
  detectedAt: Date
  status: 'investigating' | 'blocked' | 'monitoring' | 'false_positive'
}

interface SIMSwapEvent {
  id: string
  msisdn: string
  previousCarrier: string
  newCarrier: string
  timestamp: Date
  riskScore: number
  status: 'legitimate' | 'suspicious' | 'fraudulent'
  verificationMethod: 'in-person' | 'otp' | 'none'
}

interface GeographicThreat {
  wilaya: string
  lat: number
  lng: number
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  eventCount: number
  topEventType: string
}

// ============================================================
// ALGERIA WILAYAS DATA - Using demo data library
// ============================================================

const ALGERIA_WILAYAS: GeographicThreat[] = algeriaWilayaData.map(w => ({
  wilaya: w.name,
  lat: 36.0 + Math.random() * 5, // Approximate coordinates for demo
  lng: -1 + Math.random() * 7,
  threatLevel: w.riskLevel as GeographicThreat['threatLevel'],
  eventCount: w.alertCount,
  topEventType: 'Security Event'
}))

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

const generateSS7Events = (): SS7Event[] => Array.from({ length: 50 }, (_, i) => ({
  id: `ss7-${i + 1}`,
  timestamp: new Date(Date.now() - Math.random() * 3600000),
  type: ['sendAuthInfo', 'provideRoamingNumber', 'updateLocation', 'cancelLocation', 'insertSubscriberData'][Math.floor(Math.random() * 5)] as SS7Event['type'],
  source: `STP-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
  destination: `HLR-${Math.floor(Math.random() * 5) + 1}`,
  imsi: `21301${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
  msisdn: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
  riskScore: Math.floor(Math.random() * 100),
  status: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'suspicious' : 'malicious') : 'normal'
}))

const generateDiameterMessages = (): DiameterMessage[] => Array.from({ length: 30 }, (_, i) => ({
  id: `dia-${i + 1}`,
  timestamp: new Date(Date.now() - Math.random() * 3600000),
  command: ['CCR', 'CCA', 'DWR', 'DWA', 'AAR', 'AAA'][Math.floor(Math.random() * 6)] as DiameterMessage['command'],
  applicationId: `App${['Dx', 'Rx', 'Gx', 'Cx'][Math.floor(Math.random() * 4)]}`,
  originHost: `diameter-node-${Math.floor(Math.random() * 10) + 1}.djezzy.dz`,
  destinationHost: `pcrf.djezzy.dz`,
  resultCode: [2001, 2002, 4010, 5003, 5012][Math.floor(Math.random() * 5)],
  riskLevel: ['low', 'low', 'low', 'medium', 'medium', 'high', 'critical'][Math.floor(Math.random() * 7)] as DiameterMessage['riskLevel']
}))

const generateFraudAlerts = (): FraudAlert[] => [
  {
    id: 'fraud-001',
    type: 'irsf',
    severity: 'critical',
    msisdn: '+213551234567',
    amount: 12500,
    location: 'Tizi Ouzou',
    detectedAt: new Date(Date.now() - 1800000),
    status: 'investigating'
  },
  {
    id: 'fraud-002',
    type: 'sim_swap',
    severity: 'high',
    msisdn: '+213669876543',
    imsi: '213012345678901',
    location: 'Oran',
    detectedAt: new Date(Date.now() - 3600000),
    status: 'blocked'
  },
  {
    id: 'fraud-003',
    type: 'premium_rate',
    severity: 'medium',
    msisdn: '+213771234567',
    amount: 2500,
    location: 'Blida',
    detectedAt: new Date(Date.now() - 7200000),
    status: 'monitoring'
  },
  {
    id: 'fraud-004',
    type: 'wangiri',
    severity: 'low',
    msisdn: '+213559876543',
    location: 'Constantine',
    detectedAt: new Date(Date.now() - 10800000),
    status: 'monitoring'
  },
  {
    id: 'fraud-005',
    type: 'bypass_fraud',
    severity: 'high',
    msisdn: '+213661234567',
    location: 'Alger',
    detectedAt: new Date(Date.now() - 14400000),
    status: 'investigating'
  }
]

const generateSIMSwapEvents = (): SIMSwapEvent[] => Array.from({ length: 15 }, (_, i) => ({
  id: `simswap-${i + 1}`,
  msisdn: `+213${Math.floor(Math.random() * 900000000 + 500000000)}`,
  previousCarrier: ['Djezzy', 'Mobilis', 'Ooredoo'][Math.floor(Math.random() * 3)],
  newCarrier: 'Djezzy',
  timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
  riskScore: Math.floor(Math.random() * 100),
  status: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'suspicious' : 'fraudulent') : 'legitimate',
  verificationMethod: ['in-person', 'otp', 'none'][Math.floor(Math.random() * 3)] as SIMSwapEvent['verificationMethod']
}))

const generateTrafficMetrics = () => {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    ss7Messages: Math.floor(Math.random() * 50000) + 10000,
    diameterRequests: Math.floor(Math.random() * 30000) + 5000,
    sipCalls: Math.floor(Math.random() * 10000) + 2000,
    anomalies: Math.floor(Math.random() * 20)
  }))
}

// ============================================================
// CHART CONFIGURATIONS
// ============================================================

const trafficChartConfig: ChartConfig = {
  ss7Messages: { label: 'SS7 Messages', color: '#06b6d4' },
  diameterRequests: { label: 'Diameter Requests', color: '#f59e0b' },
  sipCalls: { label: 'SIP Calls', color: '#10b981' },
  anomalies: { label: 'Anomalies', color: '#ef4444' }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function TelecomMetricCard({
  title,
  value,
  icon,
  trend,
  color,
  subtitle
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color: string
  subtitle?: string
}) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend !== undefined && (
              <div className="mt-1">
                <MetricTrend value={trend} showArrow size="sm" />
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SS7MonitoringPanel({ events }: { events: SS7Event[] }) {
  const suspiciousEvents = events.filter(e => e.status === 'suspicious')
  const maliciousEvents = events.filter(e => e.status === 'malicious')

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            SS7/Diameter Signaling Monitor
          </CardTitle>
          <Badge variant="outline" className={maliciousEvents.length > 0 ? 'border-red-500/50 text-red-400' : 'border-green-500/50 text-green-400'}>
            {events.length} Events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-slate-800/50 text-center">
            <p className="text-xl font-bold text-white">{events.length}</p>
            <p className="text-xs text-slate-400">Total Events</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center border border-green-500/20">
            <p className="text-xl font-bold text-green-400">{events.filter(e => e.status === 'normal').length}</p>
            <p className="text-xs text-slate-400">Normal</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 text-center border border-yellow-500/20">
            <p className="text-xl font-bold text-yellow-400">{suspiciousEvents.length}</p>
            <p className="text-xs text-slate-400">Suspicious</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 text-center border border-red-500/20">
            <p className="text-xl font-bold text-red-400">{maliciousEvents.length}</p>
            <p className="text-xs text-slate-400">Malicious</p>
          </div>
        </div>

        {/* Recent Events Table */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {events.slice(0, 10).map(event => (
            <div key={event.id} className={`flex items-center justify-between p-2 rounded-lg ${
              event.status === 'malicious' ? 'bg-red-500/10 border border-red-500/20' :
              event.status === 'suspicious' ? 'bg-yellow-500/10 border border-yellow-500/20' :
              'bg-slate-800/30'
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <StatusIndicator 
                  status={event.status === 'normal' ? 'good' : event.status === 'suspicious' ? 'warning' : 'critical'} 
                  size="sm" 
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-white truncate block">{event.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-xs text-slate-500">{event.source} → {event.destination}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className={`font-mono text-sm ${event.riskScore > 70 ? 'text-red-400' : event.riskScore > 40 ? 'text-yellow-400' : 'text-slate-400'}`}>
                  {event.riskScore}
                </span>
                <span className="text-xs text-slate-500 w-[60px] text-right">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FraudDetectionPanel({ alerts }: { alerts: FraudAlert[] }) {
  const getFraudTypeIcon = (type: FraudAlert['type']) => {
    switch (type) {
      case 'irsf': return <PhoneCall className="h-4 w-4" />
      case 'sim_swap': return <UserX className="h-4 w-4" />
      case 'premium_rate': return <CreditCard className="h-4 w-4" />
      case 'bypass_fraud': return <Router className="h-4 w-4" />
      case 'wangiri': return <Phone className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: FraudAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-500/10'
      case 'high': return 'border-orange-500/50 bg-orange-500/10'
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10'
      case 'low': return 'border-blue-500/50 bg-blue-500/10'
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            Fraud Detection Alerts
          </CardTitle>
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
            {alerts.filter(a => a.status !== 'false_positive').length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getFraudTypeIcon(alert.type)}
                  <span className="font-medium text-white capitalize text-sm">
                    {alert.type.replace('_', ' ')}
                  </span>
                  <Badge variant="outline" className={`text-xs ${
                    alert.severity === 'critical' ? 'border-red-500/50 text-red-400' :
                    alert.severity === 'high' ? 'border-orange-500/50 text-orange-400' :
                    alert.severity === 'medium' ? 'border-yellow-500/50 text-yellow-400' :
                    'border-blue-500/50 text-blue-400'
                  }`}>
                    {alert.severity}
                  </Badge>
                </div>
                <StatusIndicator 
                  status={
                    alert.status === 'blocked' ? 'excellent' :
                    alert.status === 'monitoring' ? 'warning' :
                    alert.status === 'investigating' ? 'good' : 'critical'
                  } 
                  size="sm"
                  showLabel
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="font-mono">{alert.msisdn}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {alert.location}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {alert.amount && (
                    <span className="text-orange-400 font-medium">
                      DZD {alert.amount.toLocaleString()}
                    </span>
                  )}
                  <span>{Math.ceil((Date.now() - alert.detectedAt.getTime()) / 3600000)}h ago</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SIMSwapMonitor({ events }: { events: SIMSwapEvent[] }) {
  const suspiciousSwaps = events.filter(e => e.status !== 'legitimate')

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-pink-400" />
            SIM Swap Monitoring
          </CardTitle>
          <Badge variant={suspiciousSwaps.length > 0 ? "destructive" : "secondary"} className={
            suspiciousSwaps.length > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
          }>
            {suspiciousSwaps.length} Suspicious
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Verification Methods Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-lg font-bold text-green-400">
              {events.filter(e => e.verificationMethod === 'in-person').length}
            </p>
            <p className="text-xs text-slate-400">In-Person Verified</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-lg font-bold text-blue-400">
              {events.filter(e => e.verificationMethod === 'otp').length}
            </p>
            <p className="text-xs text-slate-400">OTP Verified</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-lg font-bold text-red-400">
              {events.filter(e => e.verificationMethod === 'none').length}
            </p>
            <p className="text-xs text-slate-400">No Verification</p>
          </div>
        </div>

        {/* Recent SIM Swaps */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {events.slice(0, 8).map(event => (
            <div key={event.id} className={`flex items-center justify-between p-2 rounded-lg ${
              event.status === 'fraudulent' ? 'bg-red-500/10 border border-red-500/20' :
              event.status === 'suspicious' ? 'bg-yellow-500/10 border border-yellow-500/20' :
              'bg-slate-800/30'
            }`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-white">{event.msisdn}</span>
                <span className="text-xs text-slate-400">{event.previousCarrier} → Djezzy</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${
                  event.verificationMethod === 'in-person' ? 'border-green-500/50 text-green-400' :
                  event.verificationMethod === 'otp' ? 'border-blue-500/50 text-blue-400' :
                  'border-red-500/50 text-red-400'
                }`}>
                  {event.verificationMethod === 'in-person' ? 'In-Person' :
                   event.verificationMethod === 'otp' ? 'OTP' : 'None'}
                </Badge>
                <span className={`font-mono text-xs ${
                  event.riskScore > 70 ? 'text-red-400' :
                  event.riskScore > 40 ? 'text-yellow-400' : 'text-slate-400'
                }`}>{event.riskScore}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AlgeriaThreatMap({ data }: { data: GeographicThreat[] }) {
  const getThreatColor = (level: GeographicThreat['threatLevel']) => {
    switch (level) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
    }
  }

  // Simplified representation of Algeria map with dots
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          Geographic Threat Distribution (Algeria)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[350px] bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
          {/* Simplified map background */}
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 400 450" className="w-full h-full">
              <path
                d="M120,50 L180,30 L280,45 L340,90 L360,150 L350,220 L320,290 L270,350 L200,420 L130,380 L80,310 L60,240 L70,160 L95,100 Z"
                fill="#334155"
                stroke="#475569"
                strokeWidth="2"
              />
            </svg>
          </div>
          
          {/* Threat points */}
          {data.map((location, index) => {
            // Convert lat/lng to SVG coordinates (simplified)
            const x = ((location.lng + 1.32) / 8) * 350 + 25
            const y = ((36.9 - location.lat) / 7) * 400 + 25
            
            return (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: `${x}px`, top: `${y}px` }}
              >
                <div className={`w-3 h-3 rounded-full ${getThreatColor(location.threatLevel)} animate-pulse`} />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 shadow-xl whitespace-nowrap">
                    <p className="text-sm font-medium text-white">{location.wilaya}</p>
                    <p className="text-xs text-slate-400">{location.eventCount} events</p>
                    <p className="text-xs text-cyan-400">{location.topEventType}</p>
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 rounded-lg p-2 space-y-1">
            <p className="text-xs font-medium text-slate-300 mb-1">Threat Level</p>
            {[
              { level: 'critical', color: 'bg-red-500' },
              { level: 'high', color: 'bg-orange-500' },
              { level: 'medium', color: 'bg-yellow-500' },
              { level: 'low', color: 'bg-green-500' }
            ].map(item => (
              <div key={item.level} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-xs text-slate-400 capitalize">{item.level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Risk Wilayas */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {data
            .sort((a, b) => b.eventCount - a.eventCount)
            .slice(0, 4)
            .map((wilaya, index) => (
              <div key={wilaya.wilaya} className="p-2 rounded bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{wilaya.wilaya}</span>
                  <div className={`w-2 h-2 rounded-full ${getThreatColor(wilaya.threatLevel)}`} />
                </div>
                <p className="text-xs text-slate-400">{wilaya.eventCount} events</p>
              </div>
            ))
          }
        </div>
      </CardContent>
    </Card>
  )
}

function TrafficChart({ data }: { data: ReturnType<typeof generateTrafficMetrics> }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Traffic Metrics (24h)
          </CardTitle>
          <Select defaultValue="24h">
            <SelectTrigger className="w-[100px] h-8 bg-slate-800 border-slate-600 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trafficChartConfig} className="h-[250px] w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => v.split(':')[0]} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="ss7Messages" stackId="1" stroke="#06b6d4" fill="#06b6d430" strokeWidth={2} />
            <Area type="monotone" dataKey="diameterRequests" stackId="1" stroke="#f59e0b" fill="#f59e0b30" strokeWidth={2} />
            <Area type="monotone" dataKey="sipCalls" stackId="1" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function SignalingAnomalyIndicators() {
  const indicators = [
    { name: 'SS7 Message Rate', current: 1245, baseline: 1100, unit: '/sec', status: 'warning' as const },
    { name: 'Diameter CCR Rate', current: 892, baseline: 850, unit: '/min', status: 'good' as const },
    { name: 'Unusual Roaming Patterns', current: 23, baseline: 15, unit: 'count', status: 'warning' as const },
    { name: 'Location Update Spikes', current: 342, baseline: 280, unit: '/min', status: 'critical' as const },
    { name: 'Authentication Failures', current: 4.2, baseline: 2.0, unit: '%', status: 'critical' as const },
    { name: 'IMEI Changes', current: 12, baseline: 8, unit: '/hour', status: 'warning' as const }
  ]

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          Signaling Anomaly Indicators
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {indicators.map(indicator => {
            const deviation = ((indicator.current - indicator.baseline) / indicator.baseline * 100)
            
            return (
              <div key={indicator.name} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 truncate">{indicator.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white">{indicator.current}{indicator.unit}</span>
                      <StatusIndicator status={indicator.status} size="sm" />
                    </div>
                  </div>
                  <Progress 
                    value={Math.min((indicator.current / indicator.baseline) * 100, 200)} 
                    className={`h-1.5 ${
                      deviation > 30 ? '[&>div]:bg-red-500' :
                      deviation > 15 ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-green-500'
                    }`}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-500">Baseline: {indicator.baseline}{indicator.unit}</span>
                    <span className={`text-xs font-medium ${
                      deviation > 30 ? 'text-red-400' :
                      deviation > 15 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                    </span>
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

// ============================================================
// MAIN TELECOM SECURITY CENTER COMPONENT
// ============================================================

export default function TelecomSecurityCenter() {
  const [ss7Events, setSS7Events] = useState<SS7Event[]>([])
  const [diameterMessages, setDiameterMessages] = useState<DiameterMessage[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [simSwapEvents, setSimSwapEvents] = useState<SIMSwapEvent[]>([])
  const [trafficData, setTrafficData] = useState<ReturnType<typeof generateTrafficMetrics>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setSS7Events(generateSS7Events())
      setDiameterMessages(generateDiameterMessages())
      setFraudAlerts(generateFraudAlerts())
      setSimSwapEvents(generateSIMSwapEvents())
      setTrafficData(generateTrafficMetrics())
      setIsLoading(false)
    }, 600)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Satellite className="h-12 w-12 animate-spin text-cyan-500 mx-auto" />
          <p className="text-slate-400">Loading Telecom Security Center...</p>
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
                <Signal className="h-7 w-7 text-cyan-400" />
                Telecom Security Center
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                SS7/Diameter Monitoring • Fraud Detection • SIM Swap Protection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
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
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TelecomMetricCard
            title="SS7 Messages/sec"
            value="1,245"
            icon={<Radio className="h-5 w-5 text-cyan-400" />}
            trend={13.2}
            color="bg-cyan-500/20"
            subtitle="+13% vs baseline"
          />
          <TelecomMetricCard
            title="Active Fraud Cases"
            value={fraudAlerts.filter(a => a.status !== 'false_positive').length}
            icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
            trend={-5.3}
            color="bg-orange-500/20"
            inverseColors
            subtitle="2 critical priority"
          />
          <TelecomMetricCard
            title="SIM Swap Attempts (24h)"
            value={simSwapEvents.length}
            icon={<Phone className="h-5 w-5 text-pink-400" />}
            trend={8.7}
            color="bg-pink-500/20"
            subtitle={`${simSwapEvents.filter(e => e.status !== 'legitimate').length} flagged`}
          />
          <TelecomMetricCard
            title="Network Nodes Monitored"
            value="47"
            icon={<Server className="h-5 w-5 text-emerald-400" />}
            trend={0}
            color="bg-emerald-500/20"
            subtitle="All operational"
          />
        </div>

        {/* Main Grid */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              <Globe className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="signaling" className="data-[state=active]:bg-slate-700">
              <Radio className="h-4 w-4 mr-2" />
              Signaling
            </TabsTrigger>
            <TabsTrigger value="fraud" className="data-[state=active]:bg-slate-700">
              <Shield className="h-4 w-4 mr-2" />
              Fraud
            </TabsTrigger>
            <TabsTrigger value="geographic" className="data-[state=active]:bg-slate-700">
              <Navigation className="h-4 w-4 mr-2" />
              Geographic
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SS7MonitoringPanel events={ss7Events} />
              <FraudDetectionPanel alerts={fraudAlerts} />
            </div>
            <TrafficChart data={trafficData} />
          </TabsContent>

          {/* Signaling Tab */}
          <TabsContent value="signaling" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SS7MonitoringPanel events={ss7Events} />
              <SignalingAnomalyIndicators />
            </div>
            <TrafficChart data={trafficData} />
          </TabsContent>

          {/* Fraud Tab */}
          <TabsContent value="fraud" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FraudDetectionPanel alerts={fraudAlerts} />
              <SIMSwapMonitor events={simSwapEvents} />
            </div>
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="geographic" className="space-y-6">
            <AlgeriaThreatMap data={ALGERIA_WILAYAS} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
