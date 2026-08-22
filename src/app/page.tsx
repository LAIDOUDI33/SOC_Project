'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DashboardHeader,
  DashboardSidebar,
  SS7MonitoringPanel,
  WelcomeBanner,
  DashboardAccessCards,
  MetricCards,
  FeaturedModules,
  SystemHealthPanel,
  socModules,
  moduleRoutes,
  subModuleRoutes
} from '@/components/dashboard'

export default function SOCDashboard() {
  const router = useRouter()
  const [selectedModule, setSelectedModule] = useState<string>('ss7-tools')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSS7Tools, setShowSS7Tools] = useState(true)

  // Handle module card click - navigate to the appropriate dashboard
  const handleModuleClick = (moduleId: string) => {
    const route = moduleRoutes[moduleId]
    if (route) {
      router.push(route)
    } else {
      // Fallback: toggle expansion if no route exists
      setSelectedModule(selectedModule === moduleId ? '' : moduleId)
    }
  }

  // Handle sub-module item click - navigate to the appropriate dashboard
  const handleSubModuleClick = (subModuleId: string) => {
    const route = subModuleRoutes[subModuleId]
    if (route) {
      router.push(route)
    }
  }

  // Debounced search state for performance (PER-010 fix)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter modules based on search query
  const filteredModules = socModules.filter(module =>
    (module.name && module.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
    (module.description && module.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <DashboardHeader 
        showMobileMenu={showMobileMenu}
        onToggleMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
      />

      <div className="flex">
        {/* Sidebar Navigation */}
        <DashboardSidebar
          showMobileMenu={showMobileMenu}
          selectedModule={selectedModule}
          viewMode={viewMode}
          searchQuery={searchQuery}
          filteredModules={filteredModules}
          onModuleClick={handleModuleClick}
          onSubModuleClick={handleSubModuleClick}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* SS7 Security Tools - Featured Section */}
          <SS7MonitoringPanel 
            showSS7Tools={showSS7Tools}
            selectedModule={selectedModule}
            onClose={() => setShowSS7Tools(false)}
          />

          {/* Welcome Banner */}
          <WelcomeBanner />

          {/* Dashboard Access Cards */}
          <DashboardAccessCards />

          {/* Quick Stats / Metric Cards */}
          <MetricCards />

          {/* Featured Modules Grid */}
          <FeaturedModules onModuleClick={handleModuleClick} />

          {/* System Health Overview */}
          <SystemHealthPanel />
        </main>
      </div>
    </div>
  )
}
