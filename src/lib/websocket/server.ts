/**
 * National SOC Platform - Production WebSocket Server
 * Algeria 2026-2030 | Real-time Event Streaming
 * 
 * Enhanced WebSocket server with:
 * - Authentication & authorization
 * - Room-based subscriptions
 * - Rate limiting
 * - Reconnection handling
 * - Message persistence for missed events
 */

import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

// ============= TYPES =============

interface AuthenticatedSocket extends Socket {
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
  userId?: string // For targeted events
}

interface RoomConfig {
  name: string
  description: string
  requiredRole?: string[]
  maxClients?: number
  persistMessages?: boolean
}

// ============= CONFIGURATION =============

const PORT = parseInt(process.env.WS_PORT || '3003')
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

// Available rooms with access control
const ROOMS: Record<string, RoomConfig> = {
  'alerts': {
    name: 'Alerts Feed',
    description: 'Real-time security alerts',
    requiredRole: ['VIEWER', 'ANALYST', 'SENIOR_ANALYST', 'INCIDENT_RESPONDER', 'THREAT_HUNTER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'],
    maxClients: 100,
    persistMessages: true
  },
  'incidents': {
    name: 'Incident Updates',
    description: 'Real-time incident lifecycle events',
    requiredRole: ['ANALYST', 'SENIOR_ANALYST', 'INCIDENT_RESPONDER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']
  },
  'metrics': {
    name: 'Dashboard Metrics',
    description: 'Real-time SOC metrics and KPIs',
    requiredRole: ['VIEWER', 'ANALYST', 'SENIOR_ANALYST', 'INCIDENT_RESPONDER', 'THREAT_HUNTER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']
  },
  'threat_intel': {
    name: 'Threat Intelligence',
    description: 'IOC updates and threat feed notifications',
    requiredRole: ['ANALYST', 'SENIOR_ANALYST', 'THREAT_HUNTER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']
  },
  'system_status': {
    name: 'System Health',
    description: 'Infrastructure health monitoring',
    requiredRole: ['MANAGER', 'ADMIN', 'SUPER_ADMIN']
  },
  'notifications': {
    name: 'Notifications',
    description: 'Personal notification stream',
    persistMessages: true
  }
}

// ============= STATE MANAGEMENT =============

class ConnectionState {
  private clients = new Map<string, Set<string>>() // room -> socketIds
  private userSessions = new Map<string, string>() // userId -> socketId
  private messageBuffer = new Map<string, SOCEvent[]>() // room -> recent messages
  private readonly BUFFER_SIZE = 100

  addClient(room: string, socketId: string): void {
    if (!this.clients.has(room)) {
      this.clients.set(room, new Set())
    }
    this.clients.get(room)!.add(socketId)
  }

  removeClient(room: string, socketId: string): void {
    this.clients.get(room)?.delete(socketId)
    if (this.clients.get(room)?.size === 0) {
      this.clients.delete(room)
    }
  }

  setUserSession(userId: string, socketId: string): void {
    this.userSessions.set(userId, socketId)
  }

  removeUserSession(userId: string): void {
    this.userSessions.delete(userId)
  }

  getSocketForUser(userId: string): string | undefined {
    return this.userSessions.get(userId)
  }

  getRoomSize(room: string): number {
    return this.clients.get(room)?.size ?? 0
  }

  bufferMessage(room: string, event: SOCEvent): void {
    if (!ROOMS[room]?.persistMessages) return
    
    if (!this.messageBuffer.has(room)) {
      this.messageBuffer.set(room, [])
    }
    
    const buffer = this.messageBuffer.get(room)!
    buffer.push(event)
    
    if (buffer.length > this.BUFFER_SIZE) {
      buffer.shift()
    }
  }

  getRecentMessages(room: string, count: number = 20): SOCEvent[] {
    const buffer = this.messageBuffer.get(room) ?? []
    return buffer.slice(-count)
  }

  getStats() {
    return {
      totalConnections: this.userSessions.size,
      rooms: Object.fromEntries(
        [...this.clients.entries()].map(([room, sockets]) => [room, sockets.size])
      )
    }
  }
}

const state = new ConnectionState()

// ============= SERVER SETUP =============

function createServer(): Server {
  const io = new Server(PORT, {
    cors: {
      origin: process.env.APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  })

  setupMiddleware(io)
  setupHandlers(io)

  return io
}

// ============= MIDDLEWARE =============

function setupMiddleware(io: Server): void {
  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token
      
      if (!token) {
        // Allow unauthenticated connection for public rooms
        socket.isAuthenticated = false
        return next()
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      if (decoded?.userId) {
        socket.userId = decoded.userId
        socket.userRole = decoded.role
        socket.isAuthenticated = true
        
        // Register user session
        state.setUserSession(decoded.userId, socket.id)
        
        console.log(`✅ Authenticated user: ${decoded.userId} (${decoded.role})`)
      } else {
        socket.isAuthenticated = false
      }
      
      next()
    } catch (error) {
      console.error('WebSocket auth error:', error)
      socket.isAuthenticated = false
      next(new Error('Authentication failed'))
    }
  })

  // Rate limiting middleware
  const rateLimits = new Map<string, { count: number; resetTime: number }>()
  
  io.use((socket: any, next) => {
    const clientId = socket.userId || socket.id
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxRequests = 100
    
    let limit = rateLimits.get(clientId)
    
    if (!limit || now > limit.resetTime) {
      limit = { count: 1, resetTime: now + windowMs }
      rateLimits.set(clientId, limit)
    } else {
      limit.count++
      
      if (limit.count > maxRequests) {
        return next(new Error('Rate limit exceeded'))
      }
    }
    
    next()
  })
}

// ============= EVENT HANDLERS =============

function setupHandlers(io: Server): void {
  io.on('connection', (socket: any) => {
    console.log(`📱 Client connected: ${socket.id} (auth: ${socket.isAuthenticated})`)
    
    // Send connection info
    socket.emit('connected', {
      socketId: socket.id,
      isAuthenticated: socket.isAuthenticated,
      serverTime: new Date(),
      availableRooms: Object.fromEntries(
        Object.entries(ROOMS).map(([key, config]) => [
          key, 
          { 
            name: config.name, 
            description: config.description,
            members: state.getRoomSize(key)
          }
        ])
      )
    })

    // Join room handler
    socket.on('join_room', async (roomName: string, callback?: Function) => {
      const roomConfig = ROOMS[roomName]
      
      if (!roomConfig) {
        socket.emit('error', { code: 'INVALID_ROOM', message: `Room '${roomName}' does not exist` })
        return
      }

      // Check role-based access
      if (roomConfig.requiredRole && socket.isAuthenticated) {
        if (!roomConfig.requiredRole.includes(socket.userRole)) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Insufficient permissions for this room' })
          return
        }
      }

      // Check room capacity
      if (roomConfig.maxClients && state.getRoomSize(roomName) >= roomConfig.maxClients) {
        socket.emit('error', { code: 'ROOM_FULL', message: 'Room is at capacity' })
        return
      }

      // Join the room
      socket.join(roomName)
      state.addClient(roomName, socket.id)
      
      console.log(`📋 ${socket.id} joined room: ${roomName}`)
      
      // Send recent messages if persisted
      if (roomConfig.persistMessages) {
        const recentMessages = state.getRecentMessages(roomName)
        if (recentMessages.length > 0) {
          socket.emit('recent_messages', { room: roomName, messages: recentMessages })
        }
      }

      // Broadcast updated member count
      io.to(roomName).emit('room_update', {
        room: roomName,
        members: state.getRoomSize(roomName),
        action: 'join'
      })

      // Acknowledge
      if (callback) {
        callback({ success: true, room: roomName, members: state.getRoomSize(roomName) })
      }
    })

    // Leave room handler
    socket.on('leave_room', (roomName: string) => {
      socket.leave(roomName)
      state.removeClient(roomName, socket.id)
      
      console.log(`📋 ${socket.id} left room: ${roomName}`)
      
      io.to(roomName).emit('room_update', {
        room: roomName,
        members: state.getRoomSize(roomName),
        action: 'leave'
      })
    })

    // Subscribe to multiple rooms at once
    socket.on('subscribe', (rooms: string[]) => {
      const results: Array<{ room: string; success: boolean; error?: string }> = []
      
      for (const room of rooms) {
        const roomConfig = ROOMS[room]
        if (!roomConfig) {
          results.push({ room, success: false, error: 'Invalid room' })
          continue
        }
        
        if (roomConfig.requiredRole && !roomConfig.requiredRole.includes(socket.userRole)) {
          results.push({ room, success: false, error: 'Forbidden' })
          continue
        }
        
        socket.join(room)
        state.addClient(room, socket.id)
        results.push({ room, success: true })
      }
      
      socket.emit('subscription_result', results)
    })

    // Handle incoming broadcasts from API/services
    socket.on('broadcast', (event: SOCEvent) => {
      // Only allow authenticated users to broadcast
      if (!socket.isAuthenticated) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Authentication required' })
        return
      }

      // Add metadata
      event.id = event.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      event.timestamp = event.timestamp || new Date()
      event.userId = socket.userId

      // Buffer message if configured
      state.bufferMessage(event.channel, event)

      // Broadcast to target channel
      if (event.channel === `notifications:${event.userId}`) {
        // Targeted notification
        const targetSocket = state.getSocketForUser(event.userId!)
        if (targetSocket) {
          io.to(targetSocket).emit('soc_event', event)
        }
      } else {
        io.to(event.channel).emit('soc_event', event)
      }

      console.log(`📤 Broadcast: ${event.type} -> ${event.channel}`)
    })

    // Request current metrics snapshot
    socket.on('request_metrics_snapshot', async () => {
      try {
        const { checkDatabaseHealth } = await import('../db')
        const health = await checkDatabaseHealth()
        socket.emit('metrics_snapshot', {
          timestamp: new Date(),
          database: health,
          websocket: {
            connections: state.getStats(),
            uptime: process.uptime()
          }
        })
      } catch (error) {
        socket.emit('error', { code: 'SNAPSHOT_FAILED', message: 'Failed to generate snapshot' })
      }
    })

    // Ping/Pong for latency measurement
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date(), server: 'soc-websocket-prod' })
    })

    // Get server stats (admin only)
    socket.on('get_stats', () => {
      if (socket.userRole === 'SUPER_ADMIN' || socket.userRole === 'ADMIN') {
        socket.emit('server_stats', state.getStats())
      } else {
        socket.emit('error', { code: 'FORBIDDEN', message: 'Admin access required' })
      }
    })

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`)
      
      // Clean up user session
      if (socket.userId) {
        state.removeUserSession(socket.userId)
      }
      
      // Clean up from all rooms
      for (const room of Object.keys(ROOMS)) {
        state.removeClient(room, socket.id)
        
        // Notify room about departure
        if (io.sockets.adapter.rooms.has(room)) {
          io.to(room).emit('room_update', {
            room,
            members: state.getRoomSize(room),
            action: 'leave'
          })
        }
      }
    })

    // Error handling
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })
  })
}

// ============= START SERVER =============

const io = createServer()

console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🇩🇿 Algeria National SOC - WebSocket Server           ║
║     Production Mode: ${process.env.NODE_ENV === 'production' ? 'ENABLED ✅' : 'DISABLED ⚠️'}              
║     Port: ${PORT}                                            
║     PID: ${process.pid}                                        
╚═══════════════════════════════════════════════════════════╝
`)

// Start simulation in development mode only
if (process.env.NODE_ENV !== 'production') {
  startSimulation(io)
}

// ============= DEVELOPMENT SIMULATION =============

function startSimulation(io: Server): void {
  console.log('🎮 Starting simulation mode...')

  // Simulate metric updates every 10 seconds
  setInterval(() => {
    const metrics = [
      { metric: 'Events/sec', value: Math.floor(Math.random() * 1000000), change: (Math.random() - 0.5) * 20 },
      { metric: 'Active Alerts', value: Math.floor(Math.random() * 500), change: (Math.random() - 0.5) * 10 },
      { metric: 'Threats Blocked', value: Math.floor(Math.random() * 10000), change: (Math.random() - 0.5) * 15 },
      { metric: 'EPS Processing', value: `${(Math.random() * 1000).toFixed(0)}K`, change: (Math.random() - 0.5) * 5 },
    ]
    
    const randomMetric = metrics[Math.floor(Math.random() * metrics.length)]
    
    const event: SOCEvent = {
      type: 'metric_update',
      channel: 'metrics',
      data: { ...randomMetric, timestamp: new Date() },
      timestamp: new Date()
    }
    
    state.bufferMessage('metrics', event)
    io.to('metrics').emit('soc_event', event)
  }, 10000)

  // Simulate occasional alert creation
  setInterval(() => {
    if (Math.random() > 0.7) {
      const severities = ['critical', 'high', 'medium', 'low']
      const sources = ['Wazuh EDR', 'Suricata IDS', 'MISP Threat Intel', 'TheHive SOAR']
      
      const event: SOCEvent = {
        type: 'alert_created',
        channel: 'alerts',
        data: {
          id: `ALT-${Date.now()}`,
          title: 'New security event detected',
          severity: severities[Math.floor(Math.random() * severities.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          timestamp: new Date(),
          status: 'new'
        },
        timestamp: new Date()
      }
      
      state.bufferMessage('alerts', event)
      io.to('alerts').emit('soc_event', event)
    }
  }, 30000)
}

// ============= GRACEFUL SHUTDOWN =============

function gracefulShutdown(signal: string): void {
  console.log(`\n🛑 ${signal} received, closing connections...`)
  
  setTimeout(() => {
    console.warn('⏰ Force closing after timeout')
    process.exit(1)
  }, 10000)
  
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export { createServer, state, ROOMS }
