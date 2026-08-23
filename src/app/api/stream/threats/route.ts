/**
 * National SOC Platform - Threat Stream Endpoint (SSE)
 * 
 * Provides real-time updates for:
 * - New indicators/IOCs added
 * - Validation status changes
 * - Threat level updates
 * - Bulk import progress
 * - Campaign updates
 * 
 * @module api/stream/threats
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { sseManager, SSEChannels } from '@/lib/realtime/sse-manager';

// GET /api/stream/threats - Server-Sent Events stream for threat intel
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate request
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Authentication required for SSE stream' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const user = authResult.user;
  const requestId = `stream_threat_${Date.now()}`;

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeIOCs = searchParams.get('iocs') !== 'false'; // default true
    const includeIndicators = searchParams.get('indicators') !== 'false'; // default true
    const includeCampaigns = searchParams.get('campaigns') === 'true';
    const includeHunts = searchParams.get('hunts') === 'true';

    // Build channel list
    const channels = [SSEChannels.THREATS];
    if (includeHunts) channels.push(SSEChannels.HUNT_SESSIONS);
    if (includeCampaigns) channels.push(SSEChannels.NOTIFICATIONS);

    // Create SSE connection
    const { stream, connectionId } = await sseManager.createConnection(
      user.userId,
      channels,
      requestId
    );

    console.log(`[STREAM][THREATS] User ${user.userId} connected`, { 
      connectionId, 
      channels,
      processingTimeMs: Date.now() - startTime 
    });

    // Return SSE stream response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Request-ID': requestId,
        'X-Connection-ID': connectionId,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID'
      },
      status: 200
    });

  } catch (error) {
    console.error(`[STREAM][THREATS] Error creating stream:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create stream';
    let statusCode = 500;
    
    if (errorMessage.includes('Maximum connections')) {
      statusCode = 429;
    } else if (errorMessage.includes('capacity')) {
      statusCode = 503;
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      requestId 
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/stream/threats - Subscribe/unsubscribe to channels
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { connectionId, action, channels } = body;

    if (!connectionId || !action) {
      return Response.json({
        success: false,
        error: 'Missing connectionId or action'
      }, { status: 400 });
    }

    let success = false;

    if (action === 'subscribe' && Array.isArray(channels)) {
      success = sseManager.subscribeToChannels(connectionId, channels);
    } else if (action === 'unsubscribe' && Array.isArray(channels)) {
      success = sseManager.unsubscribeFromChannels(connectionId, channels);
    } else if (action === 'close') {
      sseManager.closeConnection(connectionId);
      success = true;
    }

    return Response.json({
      success,
      action,
      ...(channels && { channels })
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to update subscription'
    }, { status: 500 });
  }
}
