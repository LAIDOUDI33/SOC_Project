// National SOC Platform - Real-time WebSocket Service
// Provides live updates for alerts, metrics, and system status

import { Server } from 'socket.io'

interface AlertUpdate {
  type: 'alert_created' | 'alert_updated' | 'alert_escalated' | 'alert_resolved'
  data: Record<string, unknown>
}

interface MetricUpdate {
  type: 'metric_update'
  data: {
    metric: string
    value: number | string
    change: number
    timestamp: Date
  }
}

interface SystemStatusUpdate {
  type: 'system_status_change'
  data: {
    componentId: string
    componentName: string
    oldStatus: string
    newStatus: string
    healthScore: number
    timestamp: Date
  }
}

interface NotificationUpdate {
  type: 'notification'
  data: {
    id: string
    title: string
    message: string
    severity: string
    userId?: string
    timestamp: Date
  }
}

type SOCMessage = AlertUpdate | MetricUpdate | SystemStatusUpdate | NotificationUpdate

const PORT = 3003

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

console.log(`🔌 SOC WebSocket Service running on port ${PORT}`)

// Store connected clients by room
const rooms = new Map<string, Set<string>>()

// Helper to broadcast to room
function broadcastToRoom(room: string, message: SOCMessage) {
  io.to(room).emit('soc_update', message)
}

// Helper to send to specific client
function sendToClient(socketId: string, message: SOCMessage) {
  io.to(socketId).emit('soc_update', message)
}

io.on('connection', (socket) => {
  console.log(`📱 Client connected: ${socket.id}`)
  
  // Join rooms based on user preferences
  socket.on('join_room', (room: string) => {
    socket.join(room)
    if (!rooms.has(room)) {
      rooms.set(room, new Set())
    }
    rooms.get(room)!.add(socket.id)
    console.log(`📋 Client ${socket.id} joined room: ${room}`)
    
    // Send current room size
    socket.emit('room_info', { room, members: rooms.get(room)?.size || 0 })
  })
  
  // Leave room
  socket.on('leave_room', (room: string) => {
    socket.leave(room)
    rooms.get(room)?.delete(socket.id)
    console.log(`📋 Client ${socket.id} left room: ${room}`)
  })
  
  // Subscribe to alert updates
  socket.on('subscribe_alerts', () => {
    socket.join('alerts')
    socket.emit('subscribed', { channel: 'alerts' })
    console.log(`📋 Client ${socket.id} subscribed to alerts`)
  })
  
  // Subscribe to metrics updates
  socket.on('subscribe_metrics', () => {
    socket.join('metrics')
    socket.emit('subscribed', { channel: 'metrics' })
    console.log(`📋 Client ${socket.id} subscribed to metrics`)
  })
  
  // Subscribe to system status
  socket.on('subscribe_system_status', () => {
    socket.join('system_status')
    socket.emit('subscribed', { channel: 'system_status' })
    console.log(`📋 Client ${socket.id} subscribed to system status`)
  })
  
  // Subscribe to notifications
  socket.on('subscribe_notifications', (userId: string) => {
    socket.join(`notifications:${userId}`)
    socket.emit('subscribed', { channel: `notifications:${userId}` })
    console.log(`📋 Client ${socket.id} subscribed to notifications for user: ${userId}`)
  })
  
  // Handle incoming messages (e.g., from API routes)
  socket.on('broadcast_alert', (data: AlertUpdate) => {
    broadcastToRoom('alerts', data)
    console.log(`🚨 Alert broadcasted: ${data.type}`)
  })
  
  socket.on('broadcast_metric', (data: MetricUpdate) => {
    broadcastToRoom('metrics', data)
    console.log(`📊 Metric updated: ${data.metric}`)
  })
  
  socket.on('broadcast_system_status', (data: SystemStatusUpdate) => {
    broadcastToRoom('system_status', data)
    console.log(`🖥️ System status changed: ${data.componentName}`)
  })
  
  socket.on('send_notification', (data: NotificationUpdate) => {
    if (data.data.userId) {
      broadcastToRoom(`notifications:${data.data.userId}`, data)
    } else {
      broadcastToRoom('notifications', data)
    }
    console.log(`🔔 Notification sent: ${data.data.title}`)
  })
  
  // Handle ping/pong for health check
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date(), server: 'soc-websocket' })
  })
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`)
    
    // Clean up from all rooms
    for (const [room, clients] of rooms.entries()) {
      clients.delete(socket.id)
      if (clients.size === 0) {
        rooms.delete(room)
      }
    }
  })
})

// Simulate real-time updates for demo purposes
function startSimulation() {
  // Simulate metric updates every 10 seconds
  setInterval(() => {
    const metrics = [
      { metric: 'Events/sec', value: Math.floor(Math.random() * 1000000), change: (Math.random() - 0.5) * 20 },
      { metric: 'Active Alerts', value: Math.floor(Math.random() * 500), change: (Math.random() - 0.5) * 10 },
      { metric: 'Threats Blocked', value: Math.floor(Math.random() * 10000), change: (Math.random() - 0.5) * 15 },
      { metric: 'EPS Processing', value: `${(Math.random() * 1000).toFixed(0)}K`, change: (Math.random() - 0.5) * 5 },
    ]
    
    const randomMetric = metrics[Math.floor(Math.random() * metrics.length)]
    
    const update: MetricUpdate = {
      type: 'metric_update',
      data: {
        ...randomMetric,
        timestamp: new Date()
      }
    }
    
    broadcastToRoom('metrics', update)
  }, 10000)
  
  // Simulate occasional alert creation
  setInterval(() => {
    if (Math.random() > 0.7) { // 30% chance every 30 seconds
      const severities = ['critical', 'high', 'medium', 'low']
      const sources = ['Wazuh EDR', 'Suricata IDS', 'MISP Threat Intel', 'TheHive SOAR']
      
      const update: AlertUpdate = {
        type: 'alert_created',
        data: {
          id: `ALT-${Date.now()}`,
          title: 'New security event detected',
          severity: severities[Math.floor(Math.random() * severities.length)],
          source: sources[Math.floor(Math.random() * sources.length)],
          timestamp: new Date(),
          status: 'new'
        }
      }
      
      broadcastToRoom('alerts', update)
    }
  }, 30000)
}

// Start simulation in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('🎮 Starting simulation mode...')
  startSimulation()
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing connections...')
  io.close(() => {
    console.log('✅ All connections closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing connections...')
  io.close(() => {
    console.log('✅ All connections closed')
    process.exit(0)
  })
})

export { io, PORT }
