'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  XCircle,
  Clock,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Alert severity levels with associated styling
 */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Severity configuration mapping */
export const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-950/50',
    borderColor: 'border-red-500/50',
    icon: XCircle,
    label: 'CRITICAL',
  },
  high: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-950/50',
    borderColor: 'border-orange-500/50',
    icon: ShieldAlert,
    label: 'HIGH',
  },
  medium: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-950/50',
    borderColor: 'border-yellow-500/50',
    icon: AlertTriangle,
    label: 'MEDIUM',
  },
  low: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/50',
    borderColor: 'border-blue-500/50',
    icon: Info,
    label: 'LOW',
  },
  info: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-800/50',
    borderColor: 'border-slate-500/50',
    icon: AlertCircle,
    label: 'INFO',
  },
};

/** Single alert item structure */
export interface AlertItem {
  /** Unique identifier */
  id: string;
  /** Alert title (will be truncated if too long) */
  title: string;
  /** Severity level */
  severity: AlertSeverity;
  /** ISO timestamp of when alert was generated */
  timestamp: string;
  /** Optional source system name */
  source?: string;
  /** Optional additional description */
  description?: string;
  /** Navigation URL when clicked */
  href?: string;
}

export interface LiveAlertsTickerProps {
  /** Array of alerts to display */
  alerts: AlertItem[];
  /** Maximum number of visible alerts before scrolling (default: 10) */
  maxVisible?: number;
  /** Scroll speed in pixels per second (default: 30) */
  scrollSpeed?: number;
  /** Enable/disable auto-scroll (default: true) */
  autoScroll?: boolean;
  /** Callback when an alert is clicked */
  onAlertClick?: (alert: AlertItem) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show pause/play controls (default: true) */
  showControls?: boolean;
  /** Show timestamps (default: true) */
  showTimestamps?: boolean;
  /** Custom header text */
  headerText?: string;
  /** Enable infinite loop scrolling (default: true) */
  infiniteScroll?: boolean;
}

/**
 * LiveAlertsTicker - Horizontal scrolling real-time alerts component
 * 
 * Features:
 * - Color-coded severity indicators (critical=red, high=orange, etc.)
 * - Auto-scrolling with pause on hover
 * - Smooth CSS animations
 * - Click to navigate to alert details
 * - Infinite scroll for continuous feed
 * - Responsive design
 * 
 * @example
 * ```tsx
 * <LiveAlertsTicker
 *   alerts={alertsData}
 *   onAlertClick={(alert) => router.push(`/alerts/${alert.id}`)}
 * />
 * ```
 */
export function LiveAlertsTicker({
  alerts = [],
  maxVisible = 10,
  scrollSpeed = 30,
  autoScroll = true,
  onAlertClick,
  className,
  showControls = true,
  showTimestamps = true,
  headerText = 'LIVE ALERTS',
  infiniteScroll = true,
}: LiveAlertsTickerProps) {
  // State management
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine if we need to scroll based on alert count
  const needsScroll = alerts.length > maxVisible;

  // Create duplicated alerts array for infinite scroll effect
  const displayAlerts = useMemo(() => {
    if (!infiniteScroll || !needsScroll) return alerts;
    // Duplicate alerts for seamless looping
    return [...alerts, ...alerts];
  }, [alerts, infiniteScroll, needsScroll]);

  // Format timestamp for display
  const formatTime = useCallback((timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  }, []);

  // Handle alert click
  const handleAlertClick = useCallback(
    (alert: AlertItem, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAlertClick?.(alert);
    },
    [onAlertClick]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (alert: AlertItem, e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAlertClick?.(alert);
      }
    },
    [onAlertClick]
  );

  // Auto-pause logic based on hover state
  useEffect(() => {
    if (autoScroll && isHovered && !isPaused) {
      setIsPaused(true);
    }
  }, [isHovered, autoScroll, isPaused]);

  // Calculate animation duration based on content width
  const animationDuration = useMemo(() => {
    if (!needsScroll) return undefined;
    // Estimate duration based on number of extra items
    const overflowItems = Math.max(0, alerts.length - maxVisible);
    return `${(overflowItems * 200) / scrollSpeed}s`;
  }, [needsScroll, alerts.length, maxVisible, scrollSpeed]);

  // Render single alert item
  const renderAlertItem = (alert: AlertItem, index: number) => {
    const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
    const IconComponent = config.icon;

    return (
      <div
        key={`${alert.id}-${index}`}
        onClick={(e) => handleAlertClick(alert, e)}
        onKeyDown={(e) => handleKeyDown(alert, e)}
        tabIndex={0}
        role="button"
        aria-label={`Alert: ${alert.title}, Severity: ${config.label}`}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer',
          'transition-all duration-200 flex-shrink-0 min-w-[280px] max-w-[350px]',
          config.bgColor,
          config.borderColor,
          'hover:brightness-110 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
          `focus:ring-${alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'orange' : 'blue'}-500`
        )}
      >
        {/* Severity Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            config.bgColor
          )}
        >
          <IconComponent className={cn('w-4 h-4', config.color)} />
        </div>

        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider',
                config.color,
                config.borderColor
              )}
            >
              {config.label}
            </Badge>
            {showTimestamps && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {formatTime(alert.timestamp)}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 truncate">
            {alert.title}
          </p>
          {alert.source && (
            <p className="text-xs text-slate-500 truncate">{alert.source}</p>
          )}
        </div>

        {/* Navigation Arrow */}
        <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </div>
    );
  };

  // Empty state
  if (alerts.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 px-6 py-4 rounded-lg border border-slate-800 bg-slate-900/50',
          className
        )}
      >
        <Info className="w-5 h-5 text-slate-500" />
        <span className="text-sm text-slate-500">No active alerts</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-slate-900/80 backdrop-blur-sm',
        'border-slate-700/50 shadow-lg',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (autoScroll) setIsPaused(false);
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                'bg-red-500 animate-ping',
                isPaused && 'animate-none opacity-0'
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                isPaused ? 'bg-yellow-500' : 'bg-red-500'
              )}
            />
          </span>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
            {headerText}
          </h3>
          <Badge variant="secondary" className="text-xs ml-2">
            {alerts.length} active
          </Badge>
        </div>

        {/* Controls */}
        {showControls && needsScroll && (
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              'transition-colors duration-200',
              'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            )}
            aria-label={isPaused ? 'Resume scrolling' : 'Pause scrolling'}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            )}
          </button>
        )}
      </div>

      {/* Alerts Container */}
      <div className="relative overflow-hidden">
        {!needsScroll ? (
          /* Static layout when few alerts */
          <div className="flex gap-3 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            {alerts.map((alert, i) => renderAlertItem(alert, i))}
          </div>
        ) : (
          /* Scrolling layout */
          <div
            ref={scrollContainerRef}
            className={cn(
              'flex gap-3 p-3 overflow-hidden',
              !isPaused && 'animate-marquee'
            )}
            style={{
              animationDuration: animationDuration,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {displayAlerts.map((alert, i) => renderAlertItem(alert, i))}
          </div>
        )}

        {/* Gradient fade edges for visual polish */}
        {needsScroll && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
          </>
        )}
      </div>

      {/* Embedded CSS for marquee animation */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }

        /* Custom scrollbar styles */
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

// Named export for barrel file
export default LiveAlertsTicker;
