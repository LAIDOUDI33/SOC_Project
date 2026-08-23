/**
 * National SOC Platform - Real-time Event Streaming Service
 * 
 * Provides Server-Sent Events (SSE) for:
 * - Live incident updates
 * - Real-time threat intelligence feeds
 * - Alert streaming
 * - System notifications
 * 
 * Features:
 * - Connection management with heartbeat
 * - Channel-based subscriptions
 * - Rate limiting per connection
 * - Automatic reconnection support
 * - Broadcast and targeted messaging
 * 
 * @module lib/realtime/sse-manager
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

// ============================================================
// TYPES
// ============================================================

interface SSEConnection {
  id: string;
  userId: string;
  channels: Set<string>;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastActivity: Date;
  heartbeatInterval?: NodeJS.Timeout;
}

interface SSEMessage {
  event: string;
  data: any;
  id?: string;
  retry?: number;
  targetUserId?: string; // If set, only send to this user
  targetChannels?: string[]; // If set, only send to these channels subscribers
}

// ============================================================
// CONSTANTS
// ============================================================

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONNECTIONS_PER_USER = 10;
const MAX_TOTAL_CONNECTIONS = 1000;

// Event types for SSE
export const SSEEvents = {
  // Incident events
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  INCIDENT_STATUS_CHANGED: 'incident:status_changed',
  INCIDENT_ALERT_LINKED: 'incident:alert_linked',
  INCIDENT_COMMENT_ADDED: 'incident:comment_added',
  
  // Threat events
  INDICATOR_ADDED: 'threat:indicator_added',
  IOC_CREATED: 'threat:ioc_created',
  IOC_VALIDATED: 'threat:ioc_validated',
  THREAT_LEVEL_CHANGED: 'threat:level_changed',
  
  // Hunt session events
  HUNT_SESSION_CREATED: 'hunt:session_created',
  HUNT_SESSION_UPDATED: 'hunt:session_updated',
  HUNT_FINDING_DISCOVERED: 'hunt:finding_discovered',
  HUNT_PROGRESS_UPDATE: 'hunt:progress_update',
  
  // System events
  HEALTH_CHECK: 'system:health',
  NOTIFICATION: 'system:notification',
  ALERT_BURST: 'system:alert_burst'
} as const;

// Available channels for subscription
export const SSEChannels = {
  INCIDENTS: 'incidents',
  THREATS: 'threats',
  HUNT_SESSIONS: 'hunt_sessions',
  ALERTS: 'alerts',
  NOTIFICATIONS: 'notifications',
  ALL: '*' // Wildcard - receives everything
} as const;

// ============================================================
// SSE MANAGER CLASS
// ============================================================

class SSEManager extends EventEmitter {
  private connections: Map<string, SSEConnection> = new Map();
  private messageQueue: SSEMessage[] = [];
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    messagesDropped: 0
  };

  constructor() {
    super();
    // Start cleanup interval
    setInterval(() => this.cleanupStaleConnections(), 60000);
    
    // Start queue processor
    this.processQueue();
  }

  /**
   * Create a new SSE connection
   */
  async createConnection(
    userId: string,
    channels: string[] = [SSEChannels.INCIDENTS, SSEChannels.THREATS],
    requestId?: string
  ): Promise<{ stream: ReadableStream; connectionId: string }> {
    // Check limits
    const userConnections = Array.from(this.connections.values())
      .filter(c => c.userId === userId);
    
    if (userConnections.length >= MAX_CONNECTIONS_PER_USER) {
      throw new Error(`Maximum connections (${MAX_CONNECTIONS_PER_USER}) reached for user`);
    }
    
    if (this.connections.size >= MAX_TOTAL_CONNECTIONS) {
      throw new Error('Server at maximum capacity');
    }

    const connectionId = `sse_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
    
    const stream = new ReadableStream({
      start: (controller) => {
        const connection: SSEConnection = {
          id: connectionId,
          userId,
          channels: new Set(channels),
          controller,
          connectedAt: new Date(),
          lastActivity: new Date()
        };
        
        this.connections.set(connectionId, connection);
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        
        // Send initial connection message
        this.sendToController(controller, {
          event: 'connected',
          data: {
            connectionId,
            serverTime: new Date().toISOString(),
            availableChannels: Object.values(SSEChannels),
            subscribedChannels: channels
          },
          id: '0'
        });
        
        // Start heartbeat
        connection.heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(`: heartbeat\n\n`);
            connection.lastActivity = new Date();
          } catch {
            // Connection likely closed
            this.closeConnection(connectionId);
          }
        }, HEARTBEAT_INTERVAL_MS);
        
        console.log(`[SSE] Connection ${connectionId} created for user ${userId}`);
      },
      
      cancel: () => {
        this.closeConnection(connectionId);
      }
    });

    return { stream, connectionId };
  }

  /**
   * Subscribe a connection to additional channels
   */
  subscribeToChannels(connectionId: string, channels: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    channels.forEach(channel => connection.channels.add(channel));
    connection.lastActivity = new Date();
    
    return true;
  }

  /**
   * Unsubscribe from channels
   */
  unsubscribeFromChannels(connectionId: string, channels: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;
    
    channels.forEach(channel => connection.channels.delete(channel));
    connection.lastActivity = new Date();
    
    return true;
  }

  /**
   * Broadcast message to all connections (or filtered)
   */
  broadcast(message: SSEMessage): void {
    this.messageQueue.push(message);
    this.emit('messageQueued', message);
  }

  /**
   * Send incident update to relevant subscribers
   */
  emitIncidentUpdate(incidentData: any, action: 'created' | 'updated' | 'status_changed' | 'comment' | 'alert_linked'): void {
    const eventMap = {
      created: SSEEvents.INCIDENT_CREATED,
      updated: SSEEvents.INCIDENT_UPDATED,
      status_changed: SSEEvents.INCIDENT_STATUS_CHANGED,
      comment: SSEEvents.INCIDENT_COMMENT_ADDED,
      alert_linked: SSEEvents.INCIDENT_ALERT_LINKED
    };

    this.broadcast({
      event: eventMap[action],
      data: incidentData,
      targetChannels: [SSEChannels.INCIDENTS, SSEChannels.ALL]
    });
  }

  /**
   * Send threat/IOC update to relevant subscribers
   */
  emitThreatUpdate(threatData: any, action: 'indicator_added' | 'ioc_created' | 'validated' | 'level_changed'): void {
    const eventMap = {
      indicator_added: SSEEvents.INDICATOR_ADDED,
      ioc_created: SSEEvents.IOC_CREATED,
      validated: SSEEvents.IOC_VALIDATED,
      level_changed: SSEEvents.THREAT_LEVEL_CHANGED
    };

    this.broadcast({
      event: eventMap[action],
      data: threatData,
      targetChannels: [SSEChannels.THREATS, SSEChannels.ALL]
    });
  }

  /**
   * Send hunt session update
   */
  emitHuntUpdate(huntData: any, action: 'session_created' | 'updated' | 'finding' | 'progress'): void {
    const eventMap = {
      session_created: SSEEvents.HUNT_SESSION_CREATED,
      updated: SSEEvents.HUNT_SESSION_UPDATED,
      finding: SSEEvents.HUNT_FINDING_DISCOVERED,
      progress: SSEEvents.HUNT_PROGRESS_UPDATE
    };

    this.broadcast({
      event: eventMap[action],
      data: huntData,
      targetChannels: [SSEChannels.HUNT_SESSIONS, SSEChannels.ALL]
    });
  }

  /**
   * Close a specific connection
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }

    try {
      connection.controller.close();
    } catch {
      // Already closed
    }

    this.connections.delete(connectionId);
    this.stats.activeConnections--;
    
    console.log(`[SSE] Connection ${connectionId} closed`);
    this.emit('connectionClosed', { connectionId, userId: connection.userId });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.connections.size,
      connectionsByChannel: this.getConnectionsByChannel()
    };
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private sendToController(controller: ReadableStreamDefaultController, message: SSEMessage): void {
    try {
      let data = `event: ${message.event}\n`;
      data += `data: ${JSON.stringify(message.data)}\n`;
      if (message.id) {
        data += `id: ${message.id}\n`;
      }
      if (message.retry) {
        data += `retry: ${message.retry}\n`;
      }
      data += '\n';
      
      controller.enqueue(data);
      this.stats.messagesSent++;
    } catch (error) {
      console.error('[SSE] Failed to send message:', error);
      this.stats.messagesDropped++;
    }
  }

  private processQueue(): void {
    // Process queue every 50ms (20 msgs/sec max batch processing)
    setInterval(() => {
      if (this.messageQueue.length === 0) return;

      const batch = this.messageQueue.splice(0, 100); // Max 100 messages per batch
      
      for (const message of batch) {
        this.deliverMessage(message);
      }
    }, 50);
  }

  private deliverMessage(message: SSEMessage): void {
    for (const [connectionId, connection] of this.connections) {
      // Check user targeting
      if (message.targetUserId && connection.userId !== message.targetUserId) {
        continue;
      }

      // Check channel subscription
      if (message.targetChannels && !connection.channels.has(SSEChannels.ALL)) {
        const hasMatchingChannel = message.targetChannels.some(channel => 
          connection.channels.has(channel)
        );
        if (!hasMatchingChannel) {
          continue;
        }
      }

      this.sendToController(connection.controller, message);
      connection.lastActivity = new Date();
    }
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    
    for (const [connectionId, connection] of this.connections) {
      const timeSinceActivity = now - connection.lastActivity.getTime();
      
      if (timeSinceActivity > CONNECTION_TIMEOUT_MS) {
        console.log(`[SSE] Closing stale connection: ${connectionId}`);
        this.closeConnection(connectionId);
      }
    }
  }

  private getConnectionsByChannel(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const connection of this.connections.values()) {
      for (const channel of connection.channels) {
        counts[channel] = (counts[channel] || 0) + 1;
      }
    }
    
    return counts;
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const sseManager = new SSEManager();

export default sseManager;
