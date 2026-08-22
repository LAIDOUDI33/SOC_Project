'use client'

import React from 'react'
import { Grid3X3, Layers, Terminal, Zap } from 'lucide-react'

interface MetricCardsProps {
  // Future: can accept dynamic data
  metrics?: Array<{
    label: string
    value: string
    icon: React.ReactNode
    color: string
  }>
}

const defaultMetrics = [
  { label: 'Total Modules', value: '14', icon: <Grid3X3 className="w-5 h-5" />, color: 'text-cyan-400' },
  { label: 'Sub-Modules', value: '65+', icon: <Layers className="w-5 h-5" />, color: 'text-purple-400' },
  { label: 'API Endpoints', value: '25+', icon: <Terminal className="w-5 h-5" />, color: 'text-green-400' },
  { label: 'Integration Points', value: '15', icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400' }
]

export function MetricCards({ metrics = defaultMetrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {metrics.map((stat, idx) => (
        <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{stat.label}</span>
            <div className={stat.color}>{stat.icon}</div>
          </div>
          <div className="text-2xl font-bold">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}

export default MetricCards
