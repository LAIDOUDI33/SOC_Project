'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { MobileCard } from './MobileCard'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Bug, 
  Shield, 
  Wifi, 
  Server,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Flag,
  Source
} from 'lucide-react'

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface MobileAlertCardProps {
  id: string
  title: string
  description?: string
  severity: SeverityLevel
  source: string
  timestamp: Date | string
  isAcknowledged?: boolean
  onAcknowledge?: (id: string) => void
  onDismiss?: (id: string) => void
  onClick?: (id: string) => void
  className?: string
}

const severityConfig: Record<SeverityLevel, {
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
  label: string
  labelFr: string
}> = {
  critical: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: <AlertCircle className="w-5 h-5" />,
    label: 'CRITICAL',
    labelFr: 'Critique'
  },
  high: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'HIGH',
    labelFr: 'Élevé'
  },
  medium: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'MEDIUM',
    labelFr: 'Moyen'
  },
  low: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: <Info className="w-5 h-5" />,
    label: 'LOW',
    labelFr: 'Faible'
  },
  info: {
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-200 dark:border-gray-700',
    icon: <Info className="w-5 h-5" />,
    label: 'INFO',
    labelFr: 'Info'
  }
}

const sourceIcons: Record<string, React.ReactNode> = {
  siem: <Shield className="w-3.5 h-3.5" />,
  ids: <Bug className="w-3.5 h-3.5" />,
  network: <Wifi className="w-3.5 h-3.5" />,
  server: <Server className="w-3.5 h-3.5" />
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return `Il y a ${diffSecs}s`
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  
  return targetDate.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  })
}

export function MobileAlertCard({
  id,
  title,
  description,
  severity,
  source,
  timestamp,
  isAcknowledged = false,
  onAcknowledge,
  onDismiss,
  onClick,
  className
}: MobileAlertCardProps) {
  const config = severityConfig[severity]
  
  // Determine card variant based on severity
  let variant: 'alert' | 'incident' | 'warning' | 'default' = 'default'
  if (severity === 'critical') variant = 'alert'
  else if (severity === 'high') variant = 'warning'
  else if (severity === 'medium') variant = 'incident'

  return (
    <MobileCard
      variant={variant}
      className={cn(
        "transition-all duration-300",
        isAcknowledged && "opacity-70",
        className
      )}
      onClick={() => onClick?.(id)}
      onSwipeLeft={onDismiss ? () => onDismiss(id) : undefined}
      onSwipeRight={onAcknowledge ? () => onAcknowledge(id) : undefined}
      swipeLeftLabel="Rejeter"
      swipeRightLabel="Acquitter"
      header={
        <div className="flex items-center justify-between">
          {/* Severity indicator */}
          <div className={cn("flex items-center gap-2", config.color)}>
            {config.icon}
            <span className="text-xs font-semibold uppercase tracking-wide">
              {config.labelFr}
            </span>
          </div>
          
          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatRelativeTime(timestamp)}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          {/* Source indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Source className="w-3.5 h-3.5" />
            <span className="uppercase">{source}</span>
            {sourceIcons[source.toLowerCase()] && (
              <span className={cn("p-0.5 rounded", config.bgColor)}>
                {sourceIcons[source.toLowerCase()]}
              </span>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isAcknowledged && onAcknowledge && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAcknowledge(id)
                  if ('vibrate' in navigator) navigator.vibrate(20)
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium",
                  "bg-green-100 text-green-700 hover:bg-green-200",
                  "active:scale-95 transition-all min-h-[36px] min-w-[36px]",
                  "touch-manipulation"
                )}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>OK</span>
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(id)
                  if ('vibrate' in navigator) navigator.vibrate(10)
                }}
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-full",
                  "text-gray-400 hover:text-red-500 hover:bg-red-50",
                  "active:scale-95 transition-all min-h-[36px] min-w-[36px]",
                  "touch-manipulation"
                )}
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {/* Title */}
        <h4 className={cn(
          "font-semibold text-sm leading-tight line-clamp-2",
          isAcknowledged ? "line-through text-gray-500" : "text-gray-900 dark:text-white"
        )}>
          {title}
        </h4>
        
        {/* Description */}
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        
        {/* Acknowledged badge */}
        {isAcknowledged && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Acquittée</span>
          </div>
        )}
        
        {/* Priority flag for critical alerts */}
        {severity === 'critical' && !isAcknowledged && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium animate-pulse">
            <Flag className="w-3 h-3" />
            <span>Priorité</span>
          </div>
        )}
      </div>
    </MobileCard>
  )
}

// Quick acknowledge button component
export function QuickAckButton({ 
  count, 
  onClick 
}: { 
  count: number
  onClick: () => void 
}) {
  return (
    <button
      onClick={() => {
        onClick()
        if ('vibrate' in navigator) navigator.vibrate([20, 50, 20])
      }}
      className={cn(
        "fixed bottom-24 right-4 z-40 flex flex-col items-center justify-center",
        "w-14 h-14 rounded-full shadow-lg",
        "bg-djezzy-red text-white",
        "active:scale-90 transition-transform duration-150",
        "touch-manipulation"
      )}
      style={{ backgroundColor: '#E31837' }}
    >
      <CheckCircle className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-djezzy-red text-xs font-bold rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
