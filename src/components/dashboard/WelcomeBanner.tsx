'use client'

import React from 'react'
import { CheckCircle, Activity, Shield, Layers } from 'lucide-react'

export function WelcomeBanner() {
  return (
    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Djezzy National SOC</h2>
          <p className="text-slate-300 max-w-2xl">
            Complete Security Operations Center platform with <strong>14 major modules</strong> and <strong>65+ sub-modules</strong>. 
            Select a module from the sidebar to explore its features.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>All 8 Phases Implemented</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-time Monitoring Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Production Ready</span>
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <Layers className="w-24 h-24 text-cyan-400/20" />
        </div>
      </div>
    </div>
  )
}

export default WelcomeBanner
