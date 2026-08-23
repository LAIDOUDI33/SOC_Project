'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DashboardHeader,
  DashboardSidebar,
  WelcomeBanner,
  DashboardAccessCards,
  MetricCards,
  FeaturedModules,
  SystemHealthPanel,
  socModules,
  moduleRoutes,
  subModuleRoutes
} from '@/components/dashboard'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SOCDashboard() {
  const router = useRouter()
  const [selectedModule, setSelectedModule] = useState<string>('ss7-tools')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSS7Tools, setShowSS7Tools] = useState(true)
  const [isAdminMode, setIsAdminMode] = useState(false)

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

  // If in admin mode, show admin panel
  if (isAdminMode) {
    return (
      <div className="relative">
        {/* Admin Mode Exit Button */}
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-[100] bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
          onClick={() => setIsAdminMode(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <AdminPanel />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <DashboardHeader 
        showMobileMenu={showMobileMenu}
        onToggleMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
        onAdminClick={() => setIsAdminMode(true)}
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
          {/* SS7 Security Tools - Featured Section - Temporarily disabled due to import issue */}
          {/* <SS7MonitoringPanel 
            showSS7Tools={showSS7Tools}
            selectedModule={selectedModule}
            onClose={() => setShowSS7Tools(false)}
          /> */}

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

      {/* Floating Admin Access Button */}
      <button
        onClick={() => setIsAdminMode(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-full shadow-lg shadow-red-500/25 transition-all hover:scale-105 z-50 group"
        title="Open Admin Panel"
      >
        <Shield className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
        <span className="absolute right-full mr-3 px-2 py-1 bg-slate-900 text-sm text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Admin Panel
        </span>
      </button>
    </div>
  )
}
