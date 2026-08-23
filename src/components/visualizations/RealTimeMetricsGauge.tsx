'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Threshold configuration for gauge zones
 * Each threshold defines a color zone based on percentage ranges
 */
export interface GaugeThreshold {
  /** Minimum value for this threshold (percentage 0-100) */
  min: number;
  /** Maximum value for this threshold (percentage 0-100) */
  max: number;
  /** Color for this threshold zone */
  color: string;
  /** Label for this zone */
  label?: string;
}

/** Default thresholds: Green (0-60), Yellow (60-80), Red (80-100) */
const DEFAULT_THRESHOLDS: GaugeThreshold[] = [
  { min: 0, max: 60, color: '#22c55e', label: 'Normal' },
  { min: 60, max: 80, color: '#eab308', label: 'Warning' },
  { min: 80, max: 100, color: '#ef4444', label: 'Critical' },
];

export interface RealTimeMetricsGaugeProps {
  /** Current value to display */
  value: number;
  /** Minimum possible value (default: 0) */
  min?: number;
  /** Maximum possible value (default: 100) */
  max?: number;
  /** Label displayed below the gauge */
  label?: string;
  /** Unit suffix displayed after value */
  unit?: string;
  /** Custom threshold configuration */
  thresholds?: GaugeThreshold[];
  /** Size of the gauge in pixels (default: 200) */
  size?: number;
  /** Enable/disable animations (default: true) */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when value changes significantly */
  onThresholdChange?: (threshold: GaugeThreshold | undefined) => void;
  /** Show pulse animation on value change (default: true) */
  showPulse?: boolean;
  /** Custom stroke width */
  strokeWidth?: number;
}

/**
 * RealTimeMetricsGauge - Animated circular progress gauge component
 * 
 * Features:
 * - SVG-based crisp rendering at any size
 * - Smooth animated transitions between values
 * - Multiple configurable threshold zones (green/yellow/red)
 * - Pulse animation when value changes
 * - Dark theme compatible
 * - Responsive sizing
 * 
 * @example
 * ```tsx
 * <RealTimeMetricsGauge
 *   value={75}
 * label="CPU Usage"
 * unit="%"
 * size={180}
 * />
 * ```
 */
export function RealTimeMetricsGauge({
  value,
  min = 0,
  max = 100,
  label,
  unit = '',
  thresholds = DEFAULT_THRESHOLDS,
  size = 200,
  animate = true,
  className,
  onThresholdChange,
  showPulse = true,
  strokeWidth = 12,
}: RealTimeMetricsGaugeProps) {
  // Internal state for animated value
  const [displayValue, setDisplayValue] = useState(value);
  const [isPulsing, setIsPulsing] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState<GaugeThreshold | undefined>();

  // Calculate percentage from value range
  const percentage = useMemo(() => {
    const rawPercentage = ((value - min) / (max - min)) * 100;
    return Math.min(100, Math.max(0, rawPercentage));
  }, [value, min, max]);

  // Determine current threshold based on percentage
  const activeThreshold = useMemo(() => {
    return thresholds.find(
      (t) => percentage >= t.min && percentage < t.max
    ) || thresholds[thresholds.length - 1];
  }, [percentage, thresholds]);

  // SVG geometry calculations
  const { center, radius, circumference, strokeDashoffset } = useMemo(() => {
    const c = size / 2;
    // Account for stroke width to prevent clipping
    const r = (size - strokeWidth * 2) / 2;
    const circ = 2 * Math.PI * r;
    // Calculate dash offset based on percentage (SVG draws clockwise from top)
    const offset = circ - (circ * displayValue) / (max - min);
    return { center: c, radius: r, circumference: circ, strokeDashoffset: Math.max(0, offset) };
  }, [size, strokeWidth, displayValue, max, min]);

  // Get color for current position (gradient through thresholds)
  const currentColor = useMemo(() => {
    for (const t of thresholds) {
      if (percentage >= t.min && percentage <= t.max) {
        return t.color;
      }
    }
    return thresholds[thresholds.length - 1]?.color || '#22c55e';
  }, [percentage, thresholds]);

  // Generate gradient stops for threshold zones
  const gradientStops = useMemo(() => {
    return thresholds.map((t, i) => (
      <stop
        key={i}
        offset={`${t.max}%`}
        stopColor={t.color}
        stopOpacity={1}
      />
    ));
  }, [thresholds]);

  // Animate value changes smoothly
  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const diff = value - startValue;
    const duration = 800; // Animation duration in ms
    const startTime = performance.now();

    // Easing function for smooth animation (ease-out cubic)
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      setDisplayValue(startValue + diff * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      }
    };

    requestAnimationFrame(animateFrame);
  }, [value, animate]);

  // Handle threshold change detection and pulse animation
  useEffect(() => {
    if (activeThreshold !== currentThreshold) {
      setCurrentThreshold(activeThreshold);
      onThresholdChange?.(activeThreshold);
      
      // Trigger pulse animation
      if (showPulse) {
        setIsPulsing(true);
        const timer = setTimeout(() => setIsPulsing(false), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [activeThreshold, currentThreshold, onThresholdChange, showPulse]);

  // Format value for display
  const formattedValue = useMemo(() => {
    if (Number.isInteger(value)) {
      return `${Math.round(displayValue)}${unit}`;
    }
    return `${displayValue.toFixed(1)}${unit}`;
  }, [displayValue, value, unit]);

  return (
    <div 
      className={cn('relative inline-flex flex-col items-center', className)}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={label || 'Metric gauge'}
    >
      {/* SVG Gauge */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Definitions for gradients and filters */}
        <defs>
          {/* Gradient for progress arc */}
          <linearGradient id={`gauge-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops}
          </linearGradient>
          
          {/* Glow filter for active state */}
          <filter id={`gauge-glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Drop shadow for depth */}
          <filter id={`gauge-shadow-${label}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700/50"
        />

        {/* Threshold zone indicators (subtle background arcs) */}
        {thresholds.map((threshold, index) => {
          const startOffset = circumference - (circumference * threshold.min) / 100;
          const endOffset = circumference - (circumference * threshold.max) / 100;
          const zoneLength = startOffset - endOffset;
          
          return (
            <circle
              key={`zone-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={threshold.color}
              strokeWidth={strokeWidth * 0.4}
              strokeDasharray={`${zoneLength} ${circumference}`}
              strokeDashoffset={-endOffset}
              opacity={0.2}
              strokeLinecap="round"
            />
          );
        })}

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gauge-gradient-${label})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={isPulsing ? `url(#gauge-glow-${label})` : `url(#gauge-shadow-${label})`}
          className="transition-all duration-300"
          style={{
            transition: isPulsing ? 'filter 0.3s ease' : undefined,
          }}
        />
      </svg>

      {/* Center content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'text-3xl font-bold tabular-nums transition-colors duration-300',
            isPulsing && 'scale-105'
          )}
          style={{ color: currentColor }}
        >
          {formattedValue}
        </span>
        
        {/* Threshold indicator badge */}
        {activeThreshold?.label && (
          <span
            className={cn(
              'text-xs font-medium mt-1 px-2 py-0.5 rounded-full',
              'bg-slate-800/80 text-slate-300'
            )}
            style={{ 
              borderColor: currentColor,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            {activeThreshold.label}
          </span>
        )}
      </div>

      {/* Pulse ring animation */}
      {isPulsing && (
        <div
          className="absolute inset-0 rounded-full border-2 animate-ping opacity-30"
          style={{ borderColor: currentColor }}
        />
      )}

      {/* Label below gauge */}
      {label && (
        <p className="mt-3 text-sm font-medium text-slate-400 text-center">
          {label}
        </p>
      )}

      {/* Min/Max labels */}
      <div className="flex justify-between w-full px-2 mt-1 text-xs text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      {/* Embedded styles for animations */}
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 0.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}

// Named export for barrel file
export default RealTimeMetricsGauge;
