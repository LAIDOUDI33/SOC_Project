'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricTrendProps {
  value: number
  showArrow?: boolean
  showIcon?: boolean
  label?: string
  format?: 'percent' | 'number' | 'currency'
  inverseColors?: boolean // For metrics where negative is good (like MTTR)
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MetricTrend({
  value,
  showArrow = true,
  showIcon = false,
  label,
  format = 'percent',
  inverseColors = false,
  className,
  size = 'md'
}: MetricTrendProps) {
  const isPositive = value > 0
  const isNeutral = value === 0

  const getFormattedValue = () => {
    switch (format) {
      case 'percent':
        return `${isPositive ? '+' : ''}${value.toFixed(1)}%`
      case 'number':
        return `${isPositive ? '+' : ''}${value.toFixed(1)}`
      case 'currency':
        return `${isPositive ? '+' : ''}$${Math.abs(value).toFixed(2)}`
      default:
        return `${value}`
    }
  }

  const getColorClasses = () => {
    if (isNeutral) return 'text-slate-400'
    
    if (inverseColors) {
      return isPositive ? 'text-red-400' : 'text-green-400'
    }
    
    return isPositive ? 'text-green-400' : 'text-red-400'
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {(showArrow || showIcon) && (
        <span className={cn(getColorClasses(), iconSize[size])}>
          {isNeutral ? (
            <Minus />
          ) : isPositive ? (
            <TrendingUp />
          ) : (
            <TrendingDown />
          )}
        </span>
      )}
      
      <span className={cn(sizeClasses[size], getColorClasses(), 'font-medium')}>
        {getFormattedValue()}
      </span>
      
      {label && (
        <span className="text-slate-500 text-xs">{label}</span>
      )}
    </div>
  )
}

// Sparkline version for mini charts
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#10B981',
  showArea = true,
  className
}: SparklineProps) {
  if (!data || data.length < 2) return null
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  const areaPath = `M0,${height} L${points} L${width},${height} Z`
  const linePath = `M${points}`

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={`${color}20`}
          stroke="none"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default MetricTrend
