/**
 * National SOC Platform - Server-Sent Events (SSE) Utilities
 * 
 * Provides infrastructure for real-time data streaming:
 * - Connection management
 * - Event formatting
 * - Heartbeat/keep-alive handling
 * - Client tracking for broadcast
 */

import { Random } from 'crypto';

// Types for SSE connections
export interface SSEConnection {
  id: string;
  controller: ReadableStreamDefaultController;
  createdAt: Date;
  lastActivity: Date;
  channels: Set<string>;
}

export interface SSEMessage {
  event: string;
  data: any;
  id?: string;
  retry?: number;
}

// Active connections store (singleton)
const activeConnections = new Map<string, SSEConnection>();

// Cleanup interval (remove stale connections every 30 seconds)
const CLEANUP_INTERVAL = 30 * 1000;
const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Start cleanup process
let cleanupTimer: NodeJS.Timeout | null = null;

export function startCleanupProcess() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      cleanupStaleConnections();
    }, CLEANUP_INTERVAL);
  }
}

function cleanupStaleConnections() {
  const now = Date.now();
  for (const [id, conn] of activeConnections.entries()) {
    if (now - conn.lastActivity.getTime() > CONNECTION_TIMEOUT) {
      try {
        conn.controller.close();
      } catch (e) {
        // Connection already closed
      }
      activeConnections.delete(id);
      console.log(`🧹 Cleaned up stale SSE connection: ${id}`);
    }
  }
}

/**
 * Create a new SSE connection and return the response
 */
export function createSSEConnection(channels: string[] = ['all']): Response {
  const connectionId = generateConnectionId();
  
  const stream = new ReadableStream({
    start(controller) {
      // Create connection object
      const connection: SSEConnection = {
        id: connectionId,
        controller,
        createdAt: new Date(),
        lastActivity: new Date(),
        channels: new Set(channels)
      };
      
      activeConnections.set(connectionId, connection);
      
      // Send initial connection message
      sendEvent(controller, {
        event: 'connected',
        data: {
          connectionId,
          channels: Array.from(channels),
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        }
      });
      
      console.log(`✅ SSE Connected: ${connectionId} [${channels.join(', ')}]`);
      
      // Start heartbeat for this connection
      startHeartbeat(connectionId);
    },
    cancel() {
      activeConnections.delete(connectionId);
      console.log(`❌ SSE Disconnected: ${connectionId}`);
    }
  });

  // SECURITY: Restrict CORS to configured origins only
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  const origin = typeof window !== 'undefined' ? window.location.origin : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  };
  
  // Only set CORS headers for valid origins
  if (origin && allowedOrigins.some(allowed => origin.includes(allowed.trim()))) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'Cache-Control, Authorization';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return new Response(stream, { headers });
}

/**
 * Send an event to a specific connection controller
 */
export function sendEvent(
  controller: ReadableStreamDefaultController,
  message: SSEMessage
): void {
  try {
    const payload = formatSSEMessage(message);
    controller.enqueue(new TextEncoder().encode(payload));
  } catch (error) {
    console.error('Error sending SSE event:', error);
  }
}

/**
 * Broadcast an event to all connections subscribed to a channel
 */
export function broadcastEvent(channel: string, message: SSEMessage): number {
  let sentCount = 0;
  
  for (const [connId, conn] of activeConnections) {
    if (conn.channels.has('all') || conn.channels.has(channel)) {
      try {
        sendEvent(conn.controller, message);
        conn.lastActivity = new Date();
        sentCount++;
      } catch (error) {
        // Connection might be dead, remove it
        activeConnections.delete(connId);
      }
    }
  }
  
  if (sentCount > 0) {
    console.log(`📡 Broadcast "${message.event}" to ${sentCount} clients [${channel}]`);
  }
  
  return sentCount;
}

/**
 * Format a message as SSE-compliant text
 */
function formatSSEMessage(message: SSEMessage): string {
  let output = '';
  
  if (message.id) {
    output += `id: ${message.id}\n`;
  }
  
  output += `event: ${message.event}\n`;
  output += `data: ${JSON.stringify(message.data)}\n\n`;
  
  return output;
}

/**
 * Generate a unique connection ID
 */
function generateConnectionId(): string {
  return `sse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Start heartbeat interval for a connection
 */
function startHeartbeat(connectionId: string): void {
  const HEARTBEAT_INTERVAL = 15 * 1000; // 15 seconds
  
  const beat = setInterval(() => {
    const conn = activeConnections.get(connectionId);
    if (!conn) {
      clearInterval(beat);
      return;
    }
    
    try {
      sendEvent(conn.controller, {
        event: 'heartbeat',
        data: {
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        }
      });
    } catch (error) {
      clearInterval(beat);
      activeConnections.delete(connectionId);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Get statistics about active connections
 */
export function getConnectionStats(): {
  total: number;
  byChannel: Record<string, number>;
} {
  const byChannel: Record<string, number> = {};
  
  for (const conn of activeConnections.values()) {
    for (const channel of conn.channels) {
      byChannel[channel] = (byChannel[channel] || 0) + 1;
    }
  }
  
  return {
    total: activeConnections.size,
    byChannel
  };
}

// Auto-start cleanup on module import
startCleanupProcess();

export { activeConnections };
