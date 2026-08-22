'use client'

import React from 'react'
import { Star } from 'lucide-react'
import { socModules, Module, PhaseBadge } from './DashboardSidebar'

interface FeaturedModulesProps {
  onModuleClick: (moduleId: string) => void
}

// Star icon component
const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

export function FeaturedModules({ onModuleClick }: FeaturedModulesProps) {
  const featuredModuleIds = ['ss7-tools', 'telecom-security', 'compliance', 'soar', 'threat-hunting', 'ml-platform']
  
  const featuredModules = featuredModuleIds
    .map(id => socModules.find(m => m.id === id))
    .filter((m): m is Module => m !== undefined)

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <StarIcon className="w-5 h-5 text-yellow-400" />
        Key Modules for CEO Presentation
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {featuredModules.map((module, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-5 hover:border-cyan-500/50 transition-all cursor-pointer group"
            onClick={() => onModuleClick(module.id)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
                {module.icon}
              </div>
              <div>
                <h4 className="font-semibold group-hover:text-cyan-400 transition-colors">{module.name}</h4>
                <p className="text-xs text-slate-400">{module.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <PhaseBadge phase={module.phase} />
              <span>{module.subModules?.length || 0} Sub-modules</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeaturedModules
