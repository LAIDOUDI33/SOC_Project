/**
 * National SOC Platform - Queue Initialization
 * Algeria 2026-2030 | Startup Configuration
 * 
 * This module initializes the message queue system on startup:
 * - Connects to RabbitMQ
 * - Sets up topology (exchanges, queues, bindings)
 * - Registers consumers for event processing
 * - Starts monitoring
 */

import { getQueueClient } from './client'
import { alertConsumers, incidentConsumers, threatConsumers, telecomConsumers, systemConsumers } from './consumers'

// Track registered consumer IDs for cleanup
const registeredConsumers: string[] = []

/**
 * Initialize the message queue system
 * Call this in your Next.js instrumentation or layout
 */
export async function initializeQueue(): Promise<void> {
  console.log('[Queue] Initializing message queue system...')
  
  try {
    // Connect to RabbitMQ
    const queue = getQueueClient()
    await queue.connect()
    
    // Check connection health
    const health = queue.getHealth()
    if (!health.connected) {
      throw new Error('Failed to connect to message broker')
    }
    
    console.log('[Queue] Connected to message broker successfully')
    
    // Register consumers based on configuration
    await registerConsumers()
    
    // Setup error handling
    setupErrorHandling(queue)
    
    console.log('[Queue] Message queue system initialized successfully')
    
  } catch (error) {
    console.error('[Queue] Failed to initialize:', error)
    console.warn('[Queue] Running without message queue (degraded mode)')
  }
}

/**
 * Register all consumers
 */
async function registerConsumers(): Promise<void> {
  console.log('[Queue] Registering consumers...')
  
  try {
    // Alert processing consumers (always enabled)
    if (shouldEnableConsumer('alerts')) {
      const alertProcessor = await alertConsumers.startAlertProcessor()
      registeredConsumers.push(alertProcessor)
      
      const notificationDispatcher = await alertConsumers.startNotificationDispatcher()
      registeredConsumers.push(notificationDispatcher)
      
      const escalationHandler = await alertConsumers.startEscalationHandler()
      registeredConsumers.push(escalationHandler)
      
      console.log(`[Queue] ✓ Alert consumers registered (3)`)
    }

    // Incident workflow consumers
    if (shouldEnableConsumer('incidents')) {
      const incidentProcessor = await incidentConsumers.startIncidentProcessor()
      registeredConsumers.push(incidentProcessor)
      
      const workflowHandler = await incidentConsumers.startWorkflowHandler()
      registeredConsumers.push(workflowHandler)
      
      const slaMonitor = await incidentConsumers.startSLAMonitor()
      registeredConsumers.push(slaMonitor)
      
      console.log(`[Queue] ✓ Incident consumers registered (3)`)
    }

    // Threat intelligence consumers
    if (shouldEnableConsumer('threats')) {
      const threatProcessor = await threatConsumers.startThreatProcessor()
      registeredConsumers.push(threatProcessor)
      
      const enrichmentService = await threatConsumers.startEnrichmentService()
      registeredConsumers.push(enrichmentService)
      
      console.log(`[Queue] ✓ Threat intelligence consumers registered (2)`)
    }

    // Telecom protocol consumers (high-throughput)
    if (shouldEnableConsumer('telecom')) {
      const telecomEventProcessor = await telecomConsumers.startTelecomEventProcessor()
      registeredConsumers.push(telecomEventProcessor)
      
      const gtpProcessor = await telecomConsumers.startGTPProcessor()
      registeredConsumers.push(gtpProcessor)
      
      const ss7Processor = await telecomConsumers.startSS7Processor()
      registeredConsumers.push(ss7Processor)
      
      console.log(`[Queue] ✓ Telecom consumers registered (3)`)
    }

    // System consumers (always enabled)
    const auditLogConsumer = await systemConsumers.startAuditLogConsumer()
    registeredConsumers.push(auditLogConsumer)
    
    const notificationConsumer = await systemConsumers.startNotificationConsumer()
    registeredConsumers.push(notificationConsumer)
    
    console.log(`[Queue] ✓ System consumers registered (2)`)
    
    console.log(`[Queue] Total consumers registered: ${registeredConsumers.length}`)
    
  } catch (error) {
    console.error('[Queue] Failed to register consumers:', error)
    throw error
  }
}

/**
 * Gracefully shutdown queue system
 */
export async function shutdownQueue(): Promise<void> {
  console.log('[Queue] Shutting down message queue system...')
  
  try {
    const queue = getQueueClient()
    
    // Cancel all consumers
    for (const consumerId of registeredConsumers) {
      try {
        await queue.pauseConsumer(consumerId)
        console.log(`[Queue] Stopped consumer: ${consumerId}`)
      } catch (error) {
        console.error(`[Queue] Error stopping consumer ${consumerId}:`, error)
      }
    }
    
    registeredConsumers.length = 0
    
    // Disconnect from broker
    await queue.disconnect()
    
    console.log('[Queue] Message queue system shut down successfully')
    
  } catch (error) {
    console.error('[Queue] Shutdown error:', error)
  }
}

/**
 * Get current queue status (for monitoring)
 */
export async function getQueueStatus(): Promise<{
  connected: boolean
  consumerCount: number
  metrics: any
}> {
  const queue = getQueueClient()
  return {
    connected: queue.getHealth().connected,
    consumerCount: registeredConsumers.length,
    metrics: queue.getHealth().metrics
  }
}

// ===========================================
// Helper Functions
// ===========================================

function shouldEnableConsumer(type: string): boolean {
  // Check environment variable or feature flags
  const enabledFlag = process.env[`QUEUE_ENABLE_${type.toUpperCase()}`]
  
  if (enabledFlag !== undefined) {
    return enabledFlag === 'true' || enabledFlag === '1'
  }
  
  // Default: enable all consumers
  return true
}

function setupErrorHandling(queue: ReturnType<typeof getQueueClient>): void {
  // Handle connection loss
  queue.setOnConnectionLost(() => {
    console.warn('[Queue] Connection lost - attempting automatic reconnection')
  })
  
  queue.setOnConnectionRestored(() => {
    console.log('[Queue] Connection restored - re-registering consumers')
    registerConsumers().catch(console.error)
  })
}
