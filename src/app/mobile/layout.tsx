'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'
import { RefreshCw, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  headerContent?: React.ReactNode
}

export function MobileLayout({
  children,
  title = 'Djezzy SOC',
  showBackButton = false,
  onBack,
  rightAction,
  headerContent
}: MobileLayoutProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  
  const startY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Network status detection - initialize state from navigator
  const [isOnline, setIsOnlineState] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  
  // Use ref to avoid direct setState in effect
  const isOnlineRef = useRef(isOnline)
  
  // Wrapper function that updates both ref and state
  const setIsOnline = useCallback((value: boolean) => {
    isOnlineRef.current = value
    setIsOnlineState(value)
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || !containerRef.current) return
    
    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current
    
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault()
      // Add resistance - slower pull as distance increases
      setPullDistance(Math.min(distance * 0.5, 100))
    }
  }, [isPulling])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    
    if (pullDistance > 70 && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(80)
      
      // Simulate refresh action
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Dispatch custom event for refresh
      window.dispatchEvent(new CustomEvent('mobile-refresh'))
      
      if ('vibrate' in navigator) {
        navigator.vibrate(30)
      }
    }
    
    setIsRefreshing(false)
    setPullDistance(0)
    setIsPulling(false)
  }, [isPulling, pullDistance, isRefreshing])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Status bar spacer for notched devices */}
      <div className="h-[env(safe-area-inset-top)] bg-white dark:bg-gray-900" />
      
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800",
        "transition-shadow duration-300",
        pullDistance > 20 && "shadow-sm"
      )}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left section */}
          <div className="flex items-center gap-3 min-w-[100px]">
            {showBackButton ? (
              <button
                onClick={() => {
                  onBack?.()
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 
                           active:scale-95 transition-all touch-manipulation min-h-[44px] min-w-[44px]"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#E31837' }}
              >
                <span className="text-white font-bold text-xs">DZ</span>
              </div>
            )}
            
            <h1 className="font-semibold text-base text-gray-900 dark:text-white truncate">
              {title}
            </h1>
          </div>
          
          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              isOnline 
                ? "text-green-600 bg-green-100" 
                : "text-orange-600 bg-orange-100"
            )}>
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hors ligne</span>
                </>
              )}
            </div>
            
            {rightAction}
          </div>
        </div>
        
        {/* Optional header content (tabs, search, etc.) */}
        {headerContent && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            {headerContent}
          </div>
        )}
        
        {/* Pull to refresh indicator */}
        <div 
          className="overflow-hidden transition-all duration-200"
          style={{ height: `${pullDistance}px` }}
        >
          <div className={cn(
            "flex items-center justify-center gap-2 py-2 text-sm text-gray-500",
            isRefreshing && "text-djezzy-red"
          )} style={{ color: isRefreshing ? '#E31837' : undefined }}>
            <RefreshCw className={cn(
              "w-4 h-4",
              isRefreshing && "animate-spin"
            )} />
            <span>{isRefreshing ? 'Actualisation...' : 'Relâcher pour actualiser'}</span>
          </div>
        </div>
      </header>

      {/* Main content area with pull-to-refresh support */}
      <main 
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-contain pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Content wrapper with safe area padding */}
        <div className="min-h-full">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <MobileNavigation />

      {/* Offline banner */}
      {!isOnline && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+56px)] left-0 right-0 z-50 
                      bg-orange-500 text-white px-4 py-2 text-center text-sm animate-slide-down">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Mode hors ligne - Les actions seront synchronisées</span>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style jsx>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Pull-to-refresh hook for child components
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  useEffect(() => {
    const handler = async () => {
      await onRefresh()
    }
    
    window.addEventListener('mobile-refresh', handler)
    return () => window.removeEventListener('mobile-refresh', handler)
  }, [onRefresh])
}
