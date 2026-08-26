/**
 * National SOC Platform - Queue Module
 * Algeria 2026-2030 | Exports
 * 
 * Main entry point for all message queue functionality.
 */

// Core queue client
export {
  getQueueClient,
  QueueClient,
  QueueConfig,
  QueueMessage,
  PublishOptions,
  ConsumeOptions,
  MessageHandler,
  ConsumerInfo,
  QueueMetrics,
  EventType,
  QUEUES,
  EXCHANGES,
  type QueueMessage as BaseQueueMessage
} from './client'

// Event producers
export {
  alertEvents,
  incidentEvents,
  threatEvents,
  telecomEvents,
  systemEvents
} from './producers'

export type {
  AlertEventData,
  IncidentEventData,
  ThreatIndicatorData,
  IOCData,
  GTPSessionData,
  SS7CallData,
  DiameterRequestData,
  RadiusAuthData,
  SIPRegistrationData
} from './producers'

// Event consumers
export {
  alertConsumers,
  incidentConsumers,
  threatConsumers,
  telecomConsumers,
  systemConsumers
} from './consumers'

// Initialization and management
export {
  initializeQueue,
  shutdownQueue,
  getQueueStatus
} from './init'
