/**
 * National SOC Platform - Real-time WebSocket Hook
 * Algeria 2026-2030 | React Integration for Live Updates
 * 
 * Provides React hooks for subscribing to real-time SOC events:
 * - Alert updates and new alerts
 * - Incident lifecycle changes
 * - Dashboard metrics
 * - System health status
 * - Personal notifications
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// ============= TYPES =============

interface SOCSocket extends Socket {
  userId?: string
  userRole?: string
  isAuthenticated: boolean
}

interface SOCEvent {
  id: string
  type: string
  channel: string
  data: any
  timestamp: Date
}

interface UseSocketOptions {
  url?: string
  token?: string
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
}

interface RoomSubscription {
  room: string
  subscribed: boolean
  memberCount: number
}

// ============= MAIN HOOK =============

export function useSocket(options: UseSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003',
    token,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<SOCEvent | null>(null)
  const [rooms, setRooms] = useState<Record<string, RoomSubscription>>({})
  const [error, setError] = useState<string | null>(null)
  
  const socketRef = useRef<SOCSocket | null>(null)
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map())

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return

    const socket: SOCSocket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelayMax: reconnectionDelay * 2,
      timeout: 10000
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('📡 Socket connected:', socket.id)
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', (reason) => {
      console.log('📡 Socket disconnected:', reason)
      setIsConnected(false)
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect()
      }
    })

    socket.on('connect_error', (err) => {
      console.error('📡 Connection error:', err.message)
      setError(err.message)
      setIsConnected(false)
    })

    // Generic event handler for all SOC events
    socket.on('soc_event', (event: SOCEvent) => {
      setLastMessage(event)
      
      // Call any registered handlers for this event type
      const handlers = eventHandlersRef.current.get(event.type)
      if (handlers) {
        handlers.forEach(handler => handler(event))
      }
    })

    // Room update notifications
    socket.on('room_update', (update: { room: string; members: number; action: string }) => {
      setRooms(prev => ({
        ...prev,
        [update.room]: {
          ...prev[update.room],
          memberCount: update.members
        }
      }))
    })

    // Error handling
    socket.on('error', (err: { code: string; message: string }) => {
      console.error('📡 Socket error:', err)
      setError(err.message)
    })

    return () => {
      socket.disconnect()
      setIsConnected(false)
    }
  }, [url, token, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay])

  // Join a room
  const joinRoom = useCallback((room: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) {
        resolve(false)
        return
      }

      socketRef.current.emit('join_room', room, (response: { success: boolean; room: string; members: number }) => {
        if (response.success) {
          setRooms(prev => ({
            ...prev,
            [room]: { room, subscribed: true, memberCount: response.members }
          }))
        }
        resolve(response.success)
      })
    })
  }, [])

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('leave_room', room)
    setRooms(prev => {
      const updated = { ...prev }
      delete updated[room]
      return updated
    })
  }, [])

  // Subscribe to multiple rooms at once
  const subscribe = useCallback((roomList: string[]) => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('subscribe', roomList)
  }, [])

  // Register an event handler for specific event type
  const onEvent = useCallback((eventType: string, handler: Function) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set())
    }
    eventHandlersRef.current.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }, [])

  // Broadcast an event (for admin actions)
  const broadcast = useCallback((event: Omit<SOCEvent, 'id' | 'timestamp'>) => {
    if (!socketRef.current?.connected || !socketRef.current.isAuthenticated) {
      console.warn('Cannot broadcast: not connected or authenticated')
      return false
    }

    socketRef.current.emit('broadcast', event as any)
    return true
  }, [])

  // Request metrics snapshot
  const requestMetricsSnapshot = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Not connected'))
        return
      }

      socketRef.current!.emit('request_metrics_snapshot', (data: any) => {
        resolve(data)
      })
      
      setTimeout(() => reject(new Error('Timeout')), 5000)
    })
  }, [])

  // Ping server for latency measurement
  const ping = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Not connected'))
        return
      }

      const start = Date.now()
      socketRef.current!.emit('pong', () => {
        resolve(Date.now() - start)
      })
      
      setTimeout(() => reject(new Error('Timeout')), 5000)
    })
  }, [])

  return {
    isConnected,
    lastMessage,
    rooms,
    error,
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    subscribe,
    onEvent,
    broadcast,
    requestMetricsSnapshot,
    ping
  }
}

// ============= SPECIALIZED HOOKS =============

/**
 * Hook for real-time alert updates
 */
export function useAlertUpdates(options: { token?: string } = {}) {
  const { joinRoom, onEvent, isConnected } = useSocket(options)
  const [alerts, setAlerts] = useState<any[]>([])
  const [lastAlert, setLastAlert] = useState<any>(null)

  useEffect(() => {
    if (!isConnected) return

    // Subscribe to alerts room
    joinRoom('alerts')

    // Register alert event handlers
    const unsubscribes = [
      onEvent('alert_created', (event: SOCEvent) => {
        setAlerts(prev => [event.data, ...prev.slice(0, 99)]) // Keep last 100
        setLastAlert(event.data)
      }),
      onEvent('alert_updated', (event: SOCEvent) => {
        setAlerts(prev => prev.map(a => 
          a.id === event.data.id ? { ...a, ...event.data } : a
        ))
      }),
      onEvent('alert_escalated', (event: SOCEvent) => {
        setAlerts(prev => prev.map(a => 
          a.id === event.data.id ? { ...a, ...event.data } : a
        ))
      }),
      onEvent('alert_resolved', (event: SOCEvent) => {
        setAlerts(prev => prev.map(a => 
          a.id === event.data.id ? { ...a, ...event.data } : a
        ))
      })
    ]

    return () => unsubscribes.forEach(unsub => unsub())
  }, [isConnected, joinRoom, onEvent])

  return { alerts, lastAlert, isConnected }
}

/**
 * Hook for real-time incident updates
 */
export function useIncidentUpdates(options: { token?: string } = {}) {
  const { joinRoom, onEvent, isConnected } = useSocket(options)
  const [incidents, setIncidents] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<any>(null)

  useEffect(() => {
    if (!isConnected) return

    joinRoom('incidents')

    const unsubscribe = onEvent('incident_updated', (event: SOCEvent) => {
      setIncidents(prev => {
        const existing = prev.find(i => i.id === event.data.id)
        if (existing) {
          return prev.map(i => i.id === event.data.id ? { ...i, ...event.data } : i)
        }
        return [event.data, ...prev]
      })
      setLastUpdate(event.data)
    })

    return () => unsubscribe()
  }, [isConnected, joinRoom, onEvent])

  return { incidents, lastUpdate, isConnected }
}

/**
 * Hook for real-time metrics
 */
export function useRealtimeMetrics(options: { token?: string } = {}) {
  const { joinRoom, onEvent, requestMetricsSnapshot, isConnected } = useSocket(options)
  const [metrics, setMetrics] = useState<Record<string, any>>({})
  const [systemHealth, setSystemHealth] = useState<any>(null)

  useEffect(() => {
    if (!isConnected) return

    joinRoom('metrics')

    const unsubscribe = onEvent('metric_update', (event: SOCEvent) => {
      setMetrics(prev => ({
        ...prev,
        [event.data.metric]: {
          value: event.data.value,
          change: event.data.change,
          timestamp: event.data.timestamp
        }
      }))
    })

    // Request initial snapshot
    requestMetricsSnapshot().then(setSystemHealth).catch(console.error)

    return () => unsubscribe()
  }, [isConnected, joinRoom, onEvent, requestMetricsSnapshot])

  return { metrics, systemHealth, isConnected }
}

/**
 * Hook for personal notifications
 */
export function useNotifications(userId: string, options: { token?: string } = {}) {
  const { joinRoom, onEvent, isConnected } = useSocket(options)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isConnected || !userId) return

    // Subscribe to user-specific notification room
    joinRoom(`notifications:${userId}`)

    const unsubscribe = onEvent('notification', (event: SOCEvent) => {
      setNotifications(prev => [event.data, ...prev.slice(0, 49)])
      setUnreadCount(prev => prev + 1)
    })

    return () => unsubscribe()
  }, [isConnected, userId, joinRoom, onEvent])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAsRead, markAllAsRead, isConnected }
}

/**
 * Hook for system health monitoring (admin only)
 */
export function useSystemStatus(options: { token?: string } = {}) {
  const { joinRoom, onEvent, isConnected } = useSocket(options)
  const [components, setComponents] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!isConnected) return

    joinRoom('system_status')

    const unsubscribe = onEvent('system_status_change', (event: SOCEvent) => {
      setComponents(prev => ({
        ...prev,
        [event.data.componentId]: {
          name: event.data.componentName,
          status: event.data.newStatus,
          healthScore: event.data.healthScore,
          changedAt: event.data.timestamp
        }
      }))
    })

    return () => unsubscribe()
  }, [isConnected, joinRoom, onEvent])

  return { components, isConnected }
}

export default useSocket
