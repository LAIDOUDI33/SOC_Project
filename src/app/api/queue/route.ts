/**
 * National SOC Platform - Queue Management API
 * Algeria 2026-2030 | Admin Endpoint
 * 
 * Provides administrative endpoints for message queue management:
 * - Queue status and metrics
 * - Consumer management (start/stop/pause)
 * - Message inspection and replay
 * - Dead Letter Queue management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQueueClient, QUEUES, EXCHANGES, EventType, QueueMetrics } from '@/lib/queue/client'

// ===========================================
// Authentication Helper
// ===========================================

async function verifyAdmin(request: Request): Promise<{ authorized: boolean; error?: string }> {
  const adminKey = request.headers.get('x-admin-key')
  if (adminKey === process.env.ADMIN_API_KEY) {
    return { authorized: true }
  }
  
  const userRole = request.headers.get('x-user-role')
  if (userRole === 'admin') {
    return { authorized: true }
  }
  
  return { authorized: false, error: 'Admin authentication required' }
}

// ===========================================
// GET /api/queue - Queue Status & Information
// ===========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'status'

  try {
    switch (type) {
      case 'status':
        return await getQueueStatus()
      
      case 'queues':
        return await getQueuesInfo(searchParams.get('queue'))
      
      case 'consumers':
        return await getConsumersInfo()
      
      case 'metrics':
        return await getQueueMetrics()
      
      case 'dlq':
        return await getDLQStatus()
      
      case 'config':
        return await getQueueConfig()
      
      default:
        return NextResponse.json(
          { error: `Invalid type: ${type}. Use: status, queues, consumers, metrics, dlq, config` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Queue API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch queue information',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ===========================================
// POST /api/queue - Queue Operations
// ===========================================

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = await request.json()
  const action = body.action

  try {
    switch (action) {
      case 'connect':
        return await connectQueue()
      
      case 'disconnect':
        return await disconnectQueue()
      
      case 'purge':
        return await purgeQueue(body.queue)
      
      case 'replay-dlq':
        return await replayDLQMessages(body.dlq, body.count || 100)
      
      case 'publish-test':
        return await publishTestMessage(body.type, body.data)
      
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use: connect, disconnect, purge, replay-dlq, publish-test` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Queue API] Operation error:', error)
    return NextResponse.json(
      { error: 'Operation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// ===========================================
// Handler Functions
// ===========================================

async function getQueueStatus(): Promise<NextResponse> {
  const queueClient = getQueueClient()
  const health = queueClient.getHealth()

  return NextResponse.json({
    status: health.connected ? 'connected' : 'disconnected',
    connection: {
      url: process.env.RABBITMQ_URL?.replace(/\/\/.*@/, '//***@') || 'not configured',
      connected: health.connected,
      consumers: health.consumers
    },
    timestamp: new Date().toISOString(),
    ...health.metrics
  })
}

async function getQueuesInfo(queueName?: string | null): Promise<NextResponse> {
  const queueClient = getQueueClient()

  if (!queueClient.getHealth().connected) {
    return NextResponse.json(
      { error: 'Not connected to message broker' },
      { status: 503 }
    )
  }

  if (queueName) {
    // Get specific queue info
    const info = await queueClient.getQueueInfo(queueName)
    return NextResponse.json({
      queue: queueName,
      ...info
    })
  }

  // Get all configured queues info
  const queues = Object.values(QUEUES)
  const queueInfos: Record<string, any> = {}

  for (const queue of queues) {
    try {
      queueInfos[queue] = await queueClient.getQueueInfo(queue)
    } catch (error) {
      queueInfos[queue] = { error: 'Failed to fetch info' }
    }
  }

  return NextResponse.json({
    queues: queueInfos,
    totalQueues: queues.length,
    timestamp: new Date().toISOString()
  })
}

async function getConsumersInfo(): Promise<NextResponse> {
  // Would need to track consumer instances properly
  // For now, return placeholder
  return NextResponse.json({
    consumers: [],
    totalConsumers: 0,
    note: 'Consumer tracking requires consumer registration',
    timestamp: new Date().toISOString()
  })
}

async function getQueueMetrics(): Promise<NextResponse> {
  const queueClient = getQueueClient()
  const health = queueClient.getHealth()

  return NextResponse.json({
    metrics: health.metrics,
    period: {
      start: new Date(Date.now() - 3600000), // Last hour
      end: new Date()
    },
    throughput: {
      messagesPerSecond: calculateThroughput(health.metrics),
      avgProcessingTimeMs: health.metrics.avgProcessingTimeMs
    }
  })
}

async function getDLQStatus(): Promise<NextResponse> {
  const queueClient = getQueueClient()

  if (!queueClient.getHealth().connected) {
    return NextResponse.json({ dlqs: [], totalMessages: 0 }, { status: 503 })
  }

  const dlqs = [
    QUEUES.DLQ_ALERTS,
    QUEUES.DLQ_INCIDENTS,
    QUEUES.DLQ_THREATS,
    QUEUES.DLQ_TELECOM,
    QUEUES.DLQ_GENERAL
  ]

  const dlqInfos: Array<{ name: string; messages: number }> = []

  for (const dlq of dlqs) {
    try {
      const info = await queueClient.getQueueInfo(dlq)
      dlqInfos.push({
        name: dlq,
        messages: info.messages
      })
    } catch (error) {
      dlqInfos.push({ name: dlq, messages: -1, error: String(error) })
    }
  }

  const totalMessages = dlqInfos.reduce((sum, dlq) => sum + Math.max(0, dlq.messages), 0)

  return NextResponse.json({
    deadLetterQueues: dlqInfos,
    totalMessages,
    alertLevel: totalMessages > 1000 ? 'critical' : totalMessages > 100 ? 'warning' : 'normal'
  })
}

async function getQueueConfig(): Promise<NextResponse> {
  return NextResponse.json({
    exchanges: EXCHANGES,
    queues: QUEUES,
    eventTypes: EventType,
    configuration: {
      prefetch: parseInt(process.env.QUEUE_PREFETCH || '10'),
      maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
      reconnectDelayMs: parseInt(process.env.QUEUE_RECONNECT_DELAY || '5000'),
      maxReconnectAttempts: parseInt(process.env.QUEUE_MAX_RECONNECT_ATTEMPTS || '10')
    }
  })
}

async function connectQueue(): Promise<NextResponse> {
  const queueClient = getQueueClient()
  
  try {
    await queueClient.connect()
    
    return NextResponse.json({
      success: true,
      message: 'Connected to message broker successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to connect',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

async function disconnectQueue(): Promise<NextResponse> {
  const queueClient = getQueueClient()
  
  try {
    await queueClient.disconnect()
    
    return NextResponse.json({
      success: true,
      message: 'Disconnected from message broker',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}

async function purgeQueue(queueName: string): Promise<NextResponse> {
  if (!queueName) {
    return NextResponse.json(
      { error: 'Queue name is required' },
      { status: 400 }
    )
  }

  const queueClient = getQueueClient()

  if (!queueClient.getHealth().connected) {
    return NextResponse.json(
      { error: 'Not connected to message broker' },
      { status: 503 }
    )
  }

  try {
    const info = await queueClient.getQueueInfo(queueName)
    const messageCount = info.messages
    
    await queueClient.purgeQueue(queueName)

    return NextResponse.json({
      success: true,
      message: `Purged ${messageCount} messages from ${queueName}`,
      purgedCount: messageCount,
      queue: queueName,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to purge queue' },
      { status: 500 }
    )
  }
}

async function replayDLQMessages(dlqName: string, count: number): Promise<NextResponse> {
  if (!dlqName) {
    return NextResponse.json(
      { error: 'DLQ name is required' },
      { status: 400 }
    )
  }

  const queueClient = getQueueClient()

  if (!queueClient.getHealth().connected) {
    return NextResponse.json(
      { error: 'Not connected to message broker' },
      { status: 503 }
    )
  }

  // DLQ replay would require reading messages and republishing
  // This is a simplified implementation
  return NextResponse.json({
    success: true,
    message: `Would replay up to ${count} messages from ${dlqName}`,
    note: 'Full implementation requires RabbitMQ management plugin or shovel plugin',
    dlq: dlqName,
    requestedCount: count,
    timestamp: new Date().toISOString()
  })
}

async function publishTestMessage(eventType: string, data: any): Promise<NextResponse> {
  const queueClient = getQueueClient()

  if (!queueClient.getHealth().connected) {
    return NextResponse.json(
      { error: 'Not connected to message broker' },
      { status: 503 }
    )
  }

  try {
    const published = await queueClient.publish(eventType as EventType, data || {
      test: true,
      timestamp: new Date(),
      source: 'test-api'
    })

    return NextResponse.json({
      success: published,
      message: published ? 'Test message published successfully' : 'Failed to publish',
      eventType,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to publish test message',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ===========================================
// Utility Functions
// ===========================================

function calculateThroughput(metrics: any): number {
  // Calculate approximate messages per second based on consumed count
  // In production, this would use proper time-windowed metrics
  const consumed = metrics.consumed || 0
  return Math.round(consumed / 3600) // Rough estimate over last hour
}
