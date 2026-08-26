/**
 * MISP Feeds API Route
 * Algeria National SOC Platform 2026-2030
 * 
 * Handles:
 * - Feed listing and status
 * - Feed caching and updates
 * - Event import from feeds
 * - Feed preview before import
 * - Server synchronization (push/pull)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeMISPClient,
  getMISPClient,
} from '../../lib/misp-client';
import type {
  MISPFeed,
  MISPServer,
  MISPEvent,
  MISPAPIResponse,
} from '../../types/misp.types';

// Configuration from environment
const MISP_CONFIG = {
  url: process.env.MISP_URL || 'https://misp.algeria-soc.dz',
  apiKey: process.env.MISP_API_KEY || '',
};

/**
 * GET /api/misp/feeds
 * Get feeds and sync server information
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize client if needed
    try {
      getMISPClient();
    } catch {
      initializeMISPClient(MISP_CONFIG);
    }

    const client = getMISPClient();
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'list': {
        // Get all configured feeds
        const feeds = await client.getFeeds();

        return NextResponse.json<MISPAPIResponse<MISPFeed[]>>({
          success: true,
          message: `Retrieved ${feeds.length} feeds`,
          data: feeds,
        });
      }

      case 'preview': {
        // Preview feed content before import
        const feedId = searchParams.get('feedId');
        if (!feedId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Feed ID is required', data: null },
            { status: 400 }
          );
        }

        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const events = await client.previewFeed(feedId, limit);

        return NextResponse.json<MISPAPIResponse<MISPEvent[]>>({
          success: true,
          message: `Previewing ${events.length} events from feed ${feedId}`,
          data: events,
        });
      }

      case 'servers': {
        // Get configured sync servers
        const servers = await client.getServers();

        return NextResponse.json<MISPAPIResponse<MISPServer[]>>({
          success: true,
          message: `Retrieved ${servers.length} sync servers`,
          data: servers,
        });
      }

      case 'status': {
        // Get overall feed/sync status
        const [feeds, servers] = await Promise.all([
          client.getFeeds().catch(() => []),
          client.getServers().catch(() => []),
        ]);

        const activeFeeds = feeds.filter(f => f.enabled).length;
        const lastFetchTimes = Object.fromEntries(
          feeds.map(f => [f.name, f.last_fetched_time])
        );

        return NextResponse.json<MISPAPIResponse<{
          totalFeeds: number;
          activeFeeds: number;
          totalServers: number;
          serversWithPush: number;
          serversWithPull: number;
          lastFetchTimes: Record<string, string>;
        }>>({
          success: true,
          message: 'Feed and sync status retrieved',
          data: {
            totalFeeds: feeds.length,
            activeFeeds,
            totalServers: servers.length,
            serversWithPush: servers.filter(s => s.push).length,
            serversWithPull: servers.filter(s => s.pull).length,
            lastFetchTimes,
          },
        });
      }

      default:
        // Default: return feed summary
        const feeds = await client.getFeeds().catch(() => []);

        return NextResponse.json<MISPAPIResponse<{
          count: number;
          enabled: number;
          disabled: number;
          names: string[];
        }>>({
          success: true,
          message: 'Feed summary retrieved',
          data: {
            count: feeds.length,
            enabled: feeds.filter(f => f.enabled).length,
            disabled: feeds.filter(f => !f.enabled).length,
            names: feeds.map(f => f.name),
          },
        });
    }
  } catch (error) {
    console.error('[MISP Feeds GET] Error:', error);

    return NextResponse.json<MISPAPIResponse<null>>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
        errors: [(error instanceof Error ? error.message : 'Unknown error')],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/misp/feeds
 * Perform feed operations
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize client if needed
    try {
      getMISPClient();
    } catch {
      initializeMISPClient(MISP_CONFIG);
    }

    const client = getMISPClient();
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'fetch': {
        // Fetch/update a specific feed
        const feedId = body.feedId;
        if (!feedId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Feed ID is required', data: null },
            { status: 400 }
          );
        }

        const result = await client.fetchFeed(feedId);

        return NextResponse.json<MISPAPIResponse<typeof result>>({
          success: result.success,
          message: `Feed ${feedId} fetched`,
          data: result,
        });
      }

      case 'cacheAll': {
        // Cache all enabled feeds
        const result = await client.cacheFeeds();

        return NextResponse.json<MISPAPIResponse<typeof result>>({
          success: true,
          message: `Cached ${result.cached}/${result.total} feeds (${result.failed} failed)`,
          data: result,
        });
      }

      case 'import': {
        // Import events from a feed
        const feedId = body.feedId;
        if (!feedId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Feed ID is required', data: null },
            { status: 400 }
          );
        }

        const result = await client.importFeedEvents(feedId, {
          eventIds: body.eventIds,
          toIds: body.toIds,
          merge: body.merge,
        });

        return NextResponse.json<MISPAPIResponse<typeof result>>({
          success: result.success,
          message: `Imported ${result.processed} events from feed ${feedId}`,
          data: result,
        });
      }

      case 'pull': {
        // Pull events from remote server
        const serverId = body.serverId;
        if (!serverId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Server ID is required', data: null },
            { status: 400 }
          );
        }

        const result = await client.pullFromServer(serverId, {
          technique: body.technique,
        });

        return NextResponse.json<MISPAPIResponse<typeof result>>({
          success: true,
          message: `Pulled ${result.pulled} events (result.failures failures)`,
          data: result,
        });
      }

      case 'push': {
        // Push events to remote server
        const serverId = body.serverId;
        if (!serverId) {
          return NextResponse.json<MISPAPIResponse<null>>(
            { success: false, message: 'Server ID is required', data: null },
            { status: 400 }
          );
        }

        const result = await client.pushToServer(serverId);

        return NextResponse.json<MISPAPIResponse<typeof result>>({
          success: true,
          message: `Pushed ${result.pushed} events (result.failures failures)`,
          data: result,
        });
      }

      default:
        return NextResponse.json<MISPAPIResponse<null>>(
          {
            success: false,
            message: `Unknown action: ${action}`,
            data: null,
            errors: [`Invalid action: ${action}`],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MISP Feeds POST] Error:', error);

    return NextResponse.json<MISPAPIResponse<null>>(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: null,
        errors: [(error instanceof Error ? error.message : 'Unknown error')],
      },
      { status: 500 }
    );
  }
}
