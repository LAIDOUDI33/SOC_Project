'use client'

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

type CardVariant = 'default' | 'alert' | 'incident' | 'metric' | 'success' | 'warning' | 'error'

interface MobileCardProps {
  children: React.ReactNode
  variant?: CardVariant
  className?: string
  onClick?: () => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  swipeLeftLabel?: string
  swipeRightLabel?: string
  expandable?: boolean
  expandedContent?: React.ReactNode
  isLoading?: boolean
  isError?: boolean
  errorText?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  disabled?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  alert: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  incident: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
  metric: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
  error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
}

export function MobileCard({
  children,
  variant = 'default',
  className,
  onClick,
  onSwipeLeft,
  onSwipeRight,
  swipeLeftLabel,
  swipeRightLabel,
  expandable = false,
  expandedContent,
  isLoading = false,
  isError = false,
  errorText = 'Une erreur est survenue',
  header,
  footer,
  disabled = false
}: MobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [showRipple, setShowRipple] = useState<{ x: number; y: number } | null>(null)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    setIsSwiping(true)
  }, [disabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || disabled) return
    
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const diffX = currentX - startXRef.current
    const diffY = currentY - startYRef.current
    
    // Only horizontal swipes (with some tolerance for vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      e.preventDefault()
      // Limit swipe distance
      setSwipeOffset(Math.max(-120, Math.min(120, diffX)))
    }
  }, [isSwiping, disabled])

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping || disabled) return
    
    // Trigger swipe actions based on threshold
    if (swipeOffset < -80 && onSwipeLeft) {
      onSwipeLeft()
    } else if (swipeOffset > 80 && onSwipeRight) {
      onSwipeRight()
    }
    
    setSwipeOffset(0)
    setIsSwiping(false)
  }, [isSwiping, swipeOffset, onSwipeLeft, onSwipeRight, disabled])

  // Ripple effect handler
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return
    
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      setShowRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      
      setTimeout(() => setShowRipple(null), 600)
    }
    
    // Haptic feedback simulation
    if ('vibrate' in navigator) {
      navigator.vibrate(15)
    }
    
    onClick()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "rounded-2xl border p-4 animate-pulse",
        variantStyles[variant],
        className
      )}>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className={cn(
        "rounded-2xl border p-4",
        variantStyles.error,
        className
      )}>
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{errorText}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe action indicators */}
      {(onSwipeLeft || onSwipeRight) && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-10 px-4">
          {swipeRightLabel && swipeOffset > 30 && (
            <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-full opacity-90">
              {swipeRightLabel}
            </span>
          )}
          {swipeLeftLabel && swipeOffset < -30 && (
            <span className="text-xs font-medium text-red-600 bg-red-100 px-3 py-1.5 rounded-full opacity-90">
              {swipeLeftLabel}
            </span>
          )}
        </div>
      )}
      
      {/* Main card */}
      <div
        ref={cardRef}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          "relative rounded-2xl border transition-all duration-200",
          "overflow-hidden touch-manipulation select-none",
          variantStyles[variant],
          onClick && !disabled && "active:scale-[0.98] cursor-pointer hover:shadow-md",
          disabled && "opacity-60 cursor-not-allowed",
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick(e as unknown as React.MouseEvent<HTMLDivElement>)
          }
        }}
      >
        {/* Ripple effect */}
        {showRipple && (
          <span
            className="absolute rounded-full bg-black/10 animate-ripple pointer-events-none"
            style={{
              left: showRipple.x - 50,
              top: showRipple.y - 50,
              width: 100,
              height: 100
            }}
          />
        )}
        
        {/* Header */}
        {header && (
          <div className="px-4 pt-4 pb-2 border-b border-inherit">
            {header}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
        
        {/* Expand button */}
        {expandable && expandedContent && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
              if ('vibrate' in navigator) navigator.vibrate(10)
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 
                       hover:text-gray-700 dark:hover:text-gray-300 border-t border-inherit
                       active:bg-gray-100 dark:active:bg-gray-800 transition-colors min-h-[44px]"
          >
            <span>{isExpanded ? 'Réduire' : 'Développer'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
        
        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-inherit bg-gray-50/50 dark:bg-gray-900/50">
            {footer}
          </div>
        )}
        
        {/* Expanded content */}
        {isExpanded && expandedContent && (
          <div className="px-4 py-3 border-t border-inherit bg-gray-50/50 dark:bg-gray-900/50 animate-slide-down">
            {expandedContent}
          </div>
        )}
      </div>
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
        @keyframes slide-down {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
        .animate-slide-down {
          animation: slide-down 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

// Skeleton loader component for mobile cards
export function MobileCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 animate-pulse">
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gray-200 dark:bg-gray-700 rounded",
            i === lines - 1 ? "w-2/3" : i === 0 ? "w-full" : "w-4/5"
          )}
        />
      ))}
    </div>
  )
}
