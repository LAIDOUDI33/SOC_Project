'use client'

import React from 'react'
import { Server } from 'lucide-react'

interface SystemHealthItem {
  name: string
  status: 'operational' | 'degraded' | 'down'
  uptime: string
}

const defaultSystems: SystemHealthItem[] = [
  { name: 'SIEM Core', status: 'operational', uptime: '99.97%' },
  { name: 'Database', status: 'operational', uptime: '99.99%' },
  { name: 'ML Engine', status: 'operational', uptime: '99.95%' },
  { name: 'SS7 Firewall', status: 'operational', uptime: '100%' },
  { name: 'SS7 Decoder', status: 'operational', uptime: '100%' },
  { name: 'Fraud Detector', status: 'operational', uptime: '99.98%' },
  { name: 'Threat Intel', status: 'degraded', uptime: '98.5%' },
  { name: 'SOAR Engine', status: 'operational', uptime: '99.98%' }
]

interface SystemHealthPanelProps {
  systems?: SystemHealthItem[]
}

export function SystemHealthPanel({ systems = defaultSystems }: SystemHealthPanelProps) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-cyan-400" />
        Platform Health Overview
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {systems.map((system, idx) => (
          <div key={idx} className="text-center p-3 rounded-lg bg-slate-800/50">
            <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${
              system.status === 'operational' ? 'bg-green-400' : 
              system.status === 'degraded' ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400 animate-pulse'
            }`} />
            <div className="text-sm font-medium">{system.name}</div>
            <div className="text-xs text-slate-400 mt-1">{system.uptime}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SystemHealthPanel
