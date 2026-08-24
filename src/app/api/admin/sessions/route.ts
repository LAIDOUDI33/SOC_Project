import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

// Admin-only access
async function checkAdminAccess(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;
  return null;
}

const querySessionsSchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('50'),
  userId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  search: z.string().optional(),
  sortBy: z.string().default('lastActiveAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/admin/sessions - List all sessions with filtering
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = querySessionsSchema.parse(Object.fromEntries(searchParams));

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.status === 'active') {
      where.isActive = true;
    } else if (query.status === 'inactive') {
      where.isActive = false;
    }

    if (query.search) {
      where.OR = [
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { userAgent: { contains: query.search, mode: 'insensitive' } },
        { deviceInfo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Fetch sessions with user info
    const [sessions, total] = await Promise.all([
      db.session.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: { select: { name: true } } }
          }
        },
        skip,
        take: limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      db.session.count({ where }),
    ]);

    // Calculate session statistics
    const now = new Date();
    const [
      totalActive,
      activeLast5min,
      activeLast30min,
      activeLast1hour,
      staleSessions,
    ] = await Promise.all([
      db.session.count({ where: { isActive: true } }),
      db.session.count({
        where: {
          isActive: true,
          lastActiveAt: { gt: new Date(now.getTime() - 5 * 60 * 1000) }
        }
      }),
      db.session.count({
        where: {
          isActive: true,
          lastActiveAt: { gt: new Date(now.getTime() - 30 * 60 * 1000) }
        }
      }),
      db.session.count({
        where: {
          isActive: true,
          lastActiveAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) }
        }
      }),
      db.session.count({
        where: {
          isActive: true,
          lastActiveAt: { lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }
        }
      }),
    ]);

    // Get unique users with active sessions
    const uniqueActiveUsers = await db.session.groupBy({
      by: ['userId'],
      where: { isActive: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        statistics: {
          totalActive,
          uniqueActiveUsers: uniqueActiveUsers.length,
          activeLast5min,
          activeLast30min,
          activeLast1hour,
          staleSessions,
          inactiveSessions: total - totalActive,
        }
      }
    });
  } catch (error) {
    console.error('Admin sessions list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sessions - Terminate sessions
export async function DELETE(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { sessionIds, userId, terminateAllStale, terminateAllForUser } = body;

    let deletedCount = 0;
    let targetDescription = '';

    if (sessionIds && Array.isArray(sessionIds)) {
      // Terminate specific sessions
      const result = await db.session.deleteMany({
        where: {
          id: { in: sessionIds }
        }
      });
      deletedCount = result.count;
      targetDescription = `${sessionIds.length} specific session(s)`;
    } else if (terminateAllStale) {
      // Terminate all stale sessions (inactive for > 2 hours)
      const result = await db.session.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { lastActiveAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }}
          ]
        }
      });
      deletedCount = result.count;
      targetDescription = 'all stale sessions';
    } else if (terminateAllForUser && userId) {
      // Terminate all sessions for a specific user
      const result = await db.session.deleteMany({
        where: { userId }
      });
      deletedCount = result.count;
      targetDescription = `all sessions for user ${userId}`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Must specify sessionIds, terminateAllStale, or terminateAllForUser with userId' },
        { status: 400 }
      );
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'SESSIONS_TERMINATED',
        entityType: 'Session',
        details: `Admin terminated ${targetDescription} (${deletedCount} sessions)`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully terminated ${deletedCount} session(s)`,
      data: { terminatedCount: deletedCount }
    });
  } catch (error) {
    console.error('Admin sessions termination error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate sessions' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sessions - Session actions
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, sessionId, userId } = body;

    switch (action) {
      case 'force-logout': {
        // Force logout a specific session
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'Session ID is required' },
            { status: 400 }
          );
        }

        const session = await db.session.findUnique({ where: { id: sessionId } });
        if (!session) {
          return NextResponse.json(
            { success: false, error: 'Session not found' },
            { status: 404 }
          );
        }

        await db.session.delete({ where: { id: sessionId } });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'SESSION_FORCE_LOGOUT',
            entityType: 'Session',
            entityId: sessionId,
            details: `Admin force-logged out session for user ${session.userId}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Session terminated successfully'
        });
      }

      case 'force-logout-user': {
        // Force logout all sessions for a user
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'User ID is required' },
            { status: 400 }
          );
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found' },
            { status: 404 }
          );
        }

        const result = await db.session.deleteMany({ where: { userId } });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'USER_FORCE_LOGOUT',
            entityType: 'User',
            entityId: userId,
            details: `Admin force-logged out user ${user.email} from all devices (${result.count} sessions)`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: `User logged out from all ${result.count} sessions`
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin sessions action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute session action' },
      { status: 500 }
    );
  }
}
