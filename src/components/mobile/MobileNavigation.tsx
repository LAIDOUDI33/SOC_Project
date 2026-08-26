'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Bell, 
  AlertTriangle, 
  Shield, 
  User,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

const navItems: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/mobile',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    label: 'Alertes',
    href: '/mobile/alerts',
    icon: <Bell className="w-5 h-5" />,
    badge: 12 // This would come from state/API
  },
  {
    label: 'Incidents',
    href: '/mobile/incidents',
    icon: <AlertTriangle className="w-5 h-5" />,
    badge: 3
  },
  {
    label: 'Menaces',
    href: '/mobile/threat-intel',
    icon: <Shield className="w-5 h-5" />
  },
  {
    label: 'Profil',
    href: '/mobile/profile',
    icon: <User className="w-5 h-5" />
  }
]

export function MobileNavigation() {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState('/mobile')
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // Find matching nav item
    const matchedItem = navItems.find(item => 
      pathname === item.href || 
      (item.href !== '/mobile' && pathname.startsWith(item.href))
    )
    if (matchedItem && matchedItem.href !== activeTab) {
      // Use requestAnimationFrame to defer state updates
      const transitionFrame = requestAnimationFrame(() => {
        setIsTransitioning(true)
        setTimeout(() => {
          setActiveTab(matchedItem.href)
          setIsTransitioning(false)
        }, 150)
      })
      return () => cancelAnimationFrame(transitionFrame)
    }
  }, [pathname, activeTab])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
      {/* Safe area padding for notched devices */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.href || 
              (item.href !== '/mobile' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3",
                  "transition-all duration-200 ease-out",
                  "active:scale-95 touch-manipulation",
                  isTransitioning && isActive && "animate-tab-pulse"
                )}
                onClick={() => {
                  if ('vibrate' in navigator) {
                    navigator.vibrate(10)
                  }
                }}
              >
                {/* Active indicator background */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-djezzy-red transition-all duration-300" />
                )}
                
                {/* Icon container with badge */}
                <div className="relative">
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-djezzy-red/10 text-djezzy-red" 
                      : "text-gray-500 dark:text-gray-400"
                  )}>
                    {item.icon}
                  </div>
                  
                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={cn(
                      "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1",
                      "text-[10px] font-bold text-white rounded-full",
                      item.badge > 9 ? "px-1.5" : "",
                      isActive ? "bg-djezzy-red" : "bg-orange-500",
                      "animate-bounce-in"
                    )}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  "mt-1 text-[10px] font-medium leading-tight text-center max-w-[64px] truncate transition-colors duration-200",
                  isActive 
                    ? "text-djezzy-red" 
                    : "text-gray-500 dark:text-gray-400"
                )}>
                  {item.label}
                </span>
                
                {/* Touch feedback ripple (visual only) */}
                <span className="absolute inset-0 rounded-xl opacity-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-opacity duration-150" />
              </Link>
            )
          })}
        </div>
        
        {/* Home indicator area for iOS */}
        <div className="flex justify-center pb-2 pt-1">
          <div className="w-32 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
      
      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes tab-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-tab-pulse {
          animation: tab-pulse 0.3s ease-out;
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </nav>
  )
}

// Djezzy red color constant
const DJEZZY_RED = '#E31837'
