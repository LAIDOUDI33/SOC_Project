'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface StatusIndicatorProps {
  status: 'excellent' | 'good' | 'warning' | 'critical' | 'operational' | 'degraded' | 'down' | 'online' | 'offline'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  animated?: boolean
}

const statusConfig = {
  excellent: { color: 'bg-green-500', label: 'Excellent', pulseColor: '' },
  good: { color: 'bg-blue-500', label: 'Good', pulseColor: '' },
  warning: { color: 'bg-yellow-500', label: 'Warning', pulseColor: '' },
  critical: { color: 'bg-red-500', label: 'Critical', pulseColor: '' },
  operational: { color: 'bg-green-500', label: 'Operational', pulseColor: '' },
  degraded: { color: 'bg-yellow-500', label: 'Degraded', pulseColor: '' },
  down: { color: 'bg-red-500', label: 'Down', pulseColor: '' },
  online: { color: 'bg-green-500', label: 'Online', pulseColor: '' },
  offline: { color: 'bg-slate-500', label: 'Offline', pulseColor: '' }
}

const sizeConfig = {
  sm: { dot: 'h-2 w-2', text: 'text-xs' },
  md: { dot: 'h-3 w-3', text: 'text-sm' },
  lg: { dot: 'h-4 w-4', text: 'text-base' }
}

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false,
  className,
  animated = true
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeStyle = sizeConfig[size]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="relative flex h-fit w-fit">
        <span
          className={cn(
            config.color,
            sizeStyle.dot,
            'rounded-full',
            animated && status !== 'offline' && 'animate-ping opacity-75 absolute inline-flex h-full w-full'
          )}
        />
        <span
          className={cn(
            config.color,
            sizeStyle.dot,
            'rounded-full relative inline-flex'
          )}
        />
      </span>
      {showLabel && (
        <span className={cn(sizeStyle.text, 'font-medium text-slate-300')}>
          {config.label}
        </span>
      )}
    </div>
  )
}

export default StatusIndicator
