'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface DrillDownCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  detailContent?: React.ReactNode
  defaultExpanded?: boolean
  className?: string
  headerClassName?: string
  actions?: React.ReactNode
  onExpand?: (expanded: boolean) => void
}

export function DrillDownCard({
  title,
  subtitle,
  children,
  detailContent,
  defaultExpanded = false,
  className,
  headerClassName,
  actions,
  onExpand
}: DrillDownCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpand?.(newState)
  }

  return (
    <Card className={cn(
      'bg-slate-900 border-slate-700 transition-all duration-200 hover:border-slate-600',
      isExpanded && 'border-blue-500/50',
      className
    )}>
      {/* Header - Always visible */}
      <CardHeader 
        className={cn(
          'pb-3 cursor-pointer select-none',
          headerClassName
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            )}
            
            <div className="min-w-0">
              <CardTitle className="text-white text-sm font-medium truncate">
                {title}
              </CardTitle>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            {actions}
            
            {detailContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white"
                onClick={handleToggle}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Main Content */}
      <CardContent className={cn('pt-0', !isExpanded && 'pb-4')}>
        {children}
      </CardContent>

      {/* Expanded Detail Content */}
      {isExpanded && detailContent && (
        <div className="px-6 pb-4 border-t border-slate-700 pt-4 animate-in slide-in-from-top-2 duration-200">
          {detailContent}
        </div>
      )}
    </Card>
  )
}

// Metric Card Variant - Pre-styled for KPI display
interface MetricCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
  className?: string
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  className,
  onClick
}: MetricCardProps) {
  return (
    <DrillDownCard 
      title={title} 
      className={cn('cursor-pointer', className)}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          {icon && <div className="text-slate-400">{icon}</div>}
          
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{value}</div>
            {trend !== undefined && (
              <div className={`text-xs font-medium ${
                trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
              }`}>
                {trend > 0 ? '+' : ''}{trend}% {trendLabel || ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </DrillDownCard>
  )
}

export default DrillDownCard
