'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Bell, X, Check, CheckCircle, AlertTriangle,
  Info, AlertCircle, Clock, ExternalLink, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'alert'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  source?: string
}

interface NotificationPanelProps {
  notifications?: Notification[]
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
  onDismiss?: (id: string) => void
  onAction?: (id: string) => void
  onClose: () => void
  className?: string
}

const defaultNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'alert',
    title: 'Critical Security Alert',
    message: 'Potential SS7 signaling attack detected in Algiers region',
    timestamp: new Date(Date.now() - 300000),
    read: false,
    actionUrl: '/dashboards/telecom',
    actionLabel: 'View Details',
    source: 'Telecom Probe'
  },
  {
    id: 'notif-2',
    type: 'warning',
    title: 'Compliance Deadline Approaching',
    message: 'ANRT Annual Security Report due in 15 days - 65% complete',
    timestamp: new Date(Date.now() - 1800000),
    read: false,
    actionUrl: '/dashboards/compliance',
    actionLabel: 'View Progress',
    source: 'Compliance Engine'
  },
  {
    id: 'notif-3',
    type: 'info',
    title: 'Threat Hunt Completed',
    message: 'Hypothesis "APT Lateral Movement" completed with 12 IOCs found',
    timestamp: new Date(Date.now() - 3600000),
    read: true,
    actionUrl: '/dashboards/threat-hunting',
    actionLabel: 'View Results',
    source: 'Threat Hunting'
  },
  {
    id: 'notif-4',
    type: 'success',
    title: 'Report Generated Successfully',
    message: 'Weekly Executive Summary report has been generated and distributed',
    timestamp: new Date(Date.now() - 7200000),
    read: true,
    source: 'Reporting System'
  }
]

const notificationTypeConfig = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  alert: {
    icon: Bell,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  }
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function NotificationPanel({
  notifications = defaultNotifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onAction,
  onClose,
  className
}: NotificationPanelProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications)

  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const unreadCount = localNotifications.filter(n => !n.read).length

  const handleMarkRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    onMarkRead?.(id)
  }

  const handleMarkAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })))
    onMarkAllRead?.()
  }

  const handleDismiss = (id: string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id))
    onDismiss?.(id)
  }

  return (
    <div className={cn(
      'absolute right-4 top-16 w-[380px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-white" />
          <h2 className="font-semibold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-slate-400 hover:text-white h-7"
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="max-h-[400px]">
        {localNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400">All caught up!</p>
            <p className="text-sm text-slate-500">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {localNotifications.map(notification => {
              const config = notificationTypeConfig[notification.type]
              const IconComponent = config.icon

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 transition-colors hover:bg-slate-800/50 cursor-pointer',
                    !notification.read && config.bgColor,
                    !notification.read && `border-l-2 ${config.borderColor.replace('border-', 'border-l-')}`
                  )}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={cn('mt-0.5', config.color)}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className={cn(
                          'font-medium text-sm truncate',
                          notification.read ? 'text-slate-300' : 'text-white'
                        )}>
                          {notification.title}
                          {!notification.read && (
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2 align-middle" />
                          )}
                        </h3>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDismiss(notification.id)
                          }}
                          className="flex-shrink-0 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(notification.timestamp)}
                          {notification.source && (
                            <>
                              <span>•</span>
                              <span>{notification.source}</span>
                            </>
                          )}
                        </div>

                        {notification.actionLabel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAction?.(notification.id)
                            }}
                            className="h-6 text-xs text-blue-400 hover:text-blue-300 px-2"
                          >
                            {notification.actionLabel}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-850">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-400 hover:text-white justify-center gap-2"
          onClick={() => {
            // Navigate to full notifications page or settings
          }}
        >
          <Settings className="h-4 w-4" />
          Notification Settings
        </Button>
      </div>
    </div>
  )
}

// Notification Bell Button Component
interface NotificationBellProps {
  notifications?: Notification[]
  onClick: () => void
  className?: string
}

export function NotificationBell({ 
  notifications = defaultNotifications, 
  onClick,
  className 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setIsOpen(!isOpen)
          onClick()
        }}
        className="relative border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Bell className="h-4 w-4" />
        
        {/* Unread indicator */}
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            
            {/* Pulse animation for unread */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-ping rounded-full bg-red-500 opacity-75" />
          </>
        )}
      </Button>
    </div>
  )
}

export default NotificationPanel
