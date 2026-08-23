'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Radio, Activity, AlertTriangle, X, Zap, Shield, TrendingUp } from 'lucide-react'

// Dynamic imports for SS7 components
const SS7TrafficMonitor = dynamic(
  () => import('@/components/ss7/SS7TrafficMonitor'),
  { ssr: false, loading: () => <div className="p-4 animate-pulse bg-slate-800 rounded-lg">Loading SS7 Monitor...</div> }
)

const FraudDetectionPanel = dynamic(
  () => import('@/components/ss7/FraudDetectionPanel'),
  { ssr: false, loading: () => <div className="p-4 animate-pulse bg-slate-800 rounded-lg">Loading Fraud Detection...</div> }
)

// ShieldAlert icon component
const ShieldAlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

interface SS7MonitoringPanelProps {
  showSS7Tools: boolean
  selectedModule: string | null
  onClose: () => void
}

export function SS7MonitoringPanel({ showSS7Tools, selectedModule, onClose }: SS7MonitoringPanelProps) {
  if ((selectedModule !== 'ss7-tools' && selectedModule !== null) || !showSS7Tools) {
    return null
  }

  return (
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
            onClick={onClose}
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
  )
}

export default SS7MonitoringPanel
