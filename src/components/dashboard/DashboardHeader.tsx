'use client'

import React from 'react'
import { Shield, RefreshCw, Bell } from 'lucide-react'

// ============================================================
// CLIENT-SAFE CLOCK COMPONENT - Prevents Hydration Mismatch
// Only renders time on client-side after mount
// ============================================================
function ClockDisplay() {
  const [time, setTime] = React.useState<string>('')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    setTime(new Date().toLocaleTimeString())
    
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return <div className="text-cyan-400 font-mono w-20">&nbsp;</div>
  }

  return <div className="text-cyan-400 font-mono">{time}</div>
}

interface DashboardHeaderProps {
  showMobileMenu: boolean
  onToggleMobileMenu: () => void
}

export function DashboardHeader({ showMobileMenu, onToggleMobileMenu }: DashboardHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">National SOC</h1>
              <p className="text-xs text-slate-400">Djezzy Security Operations Center • Algeria</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-slate-300">All Systems Operational</span>
            </div>
            <ClockDisplay />
          </div>

          {/* Actions */}
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 hover:bg-slate-800 rounded-lg"
          onClick={onToggleMobileMenu}
        >
          {showMobileMenu ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}

export default DashboardHeader
