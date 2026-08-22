'use client'

import React from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, BarChart3, Shield, Crosshair, Radio, Scale, ArrowRight 
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  getDashboardSummary, 
  recentAlerts, 
  executiveKPIs,
  ss7TrafficData,
  anrtComplianceData
} from '@/lib/demo-data'

export function DashboardAccessCards() {
  return (
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
          <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
  )
}

export default DashboardAccessCards
