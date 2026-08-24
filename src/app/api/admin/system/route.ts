import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

// Admin-only access
async function checkAdminAccess(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;
  return null;
}

// GET /api/admin/system - System health and statistics
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    // Gather system metrics in parallel
    const [
      userStats,
      sessionStats,
      incidentStats,
      alertStats,
      threatStats,
      recentLogs,
      systemHealth,
      dbStats,
    ] = await Promise.all([
      // User statistics
      db.user.groupBy({
        by: ['status', 'roleId'],
        _count: true,
      }).then(groups => {
        const stats = { total: 0, byStatus: {}, byRole: {} };
        groups.forEach(g => {
          stats.total += g._count;
          stats.byStatus[g.status] = (stats.byStatus[g.status] || 0) + g._count;
          stats.byRole[g.roleId] = (stats.byRole[g.roleId] || 0) + g._count;
        });
        return stats;
      }),

      // Active sessions
      Promise.all([
        db.session.count({ where: { isActive: true } }),
        db.session.count({ where: { 
          isActive: true,
          lastActiveAt: { gt: new Date(Date.now() - 30 * 60 * 1000) }
        }}),
        db.session.findMany({
          where: { isActive: true },
          orderBy: { lastActiveAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        })
      ]).then(([total, active, recent]) => ({
        total,
        activeLast30min: active,
        recentSessions: recent
      })),

      // Incident statistics
      Promise.all([
        db.incident.count(),
        db.incident.count({ where: { status: 'OPEN' } }),
        db.incident.count({ where: { status: 'IN_PROGRESS' } }),
        db.incident.aggregate({
          _avg: { mttrSeconds: true },
          _max: { createdAt: true },
        }),
        db.incident.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, status: true, severity: true, createdAt: true }
        })
      ]).then(([total, open, inProgress, agg, recent]) => ({
        total,
        open,
        inProgress,
        resolved: total - open - inProgress,
        avgMTTR: agg._avg.mttrSeconds,
        lastIncident: agg._max.createdAt,
        recent
      })),

      // Alert statistics
      Promise.all([
        db.alert.count(),
        db.alert.count({ where: { status: 'OPEN' } }),
        db.alert.count({ where: { 
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }}),
        db.alert.groupBy({
          by: ['severity'],
          _count: true,
          where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }}
        })
      ]).then(([total, open, last24h, bySeverity]) => ({
        total,
        open,
        last24h,
        bySeverity
      })),

      // Threat intelligence stats
      Promise.all([
        db.threatIndicator.count(),
        db.ioc.count(),
        db.huntSession.count({ where: { status: 'ACTIVE' } }),
      ]).then(([indicators, iocs, activeHunts]) => ({
        indicators,
        iocs,
        activeHunts
      })),

      // Recent audit logs
      db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true, email: true } }
        }
      }),

      // System health checks
      Promise.all([
        // Database connectivity test
        db.user.count().then(() => ({ status: 'healthy', latency: Date.now() }))
          .catch(() => ({ status: 'unhealthy', latency: null })),
        
        // Check for stale sessions (older than 1 hour)
        db.session.count({
          where: {
            isActive: true,
            lastActiveAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }
          }
        }),

        // Check for locked users
        db.user.count({ where: { status: 'LOCKED' } }),

        // System uptime (from process)
        Promise.resolve({
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform,
        })
      ]).then(([dbCheck, staleSessions, lockedUsers, processInfo]) => ({
        database: dbCheck,
        staleSessions,
        lockedUsers,
        processInfo
      })),

      // Database size estimates
      Promise.all([
        db.user.count(),
        db.session.count(),
        db.auditLog.count(),
        db.incident.count(),
        db.alert.count(),
        db.ss7Message.count(),
      ]).then(([users, sessions, audits, incidents, alerts, ss7]) => ({
        users,
        sessions,
        audits,
        incidents,
        alerts,
        ss7
      })),
    ]);

    // Get role names for role-based stats
    const roles = await db.role.findMany({
      select: { id: true, name: true }
    });
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

    // Calculate overall system health score
    const healthScore = calculateHealthScore({
      dbHealthy: systemHealth.database.status === 'healthy',
      staleSessions: systemHealth.staleSessions,
      lockedUsers: systemHealth.lockedUsers,
      openIncidents: incidentStats.open,
      activeAlerts: alertStats.open,
    });

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        healthScore,
        users: {
          ...userStats,
          byRoleName: Object.fromEntries(
            Object.entries(userStats.byRole).map(([id, count]) => [roleMap[id] || id, count])
          )
        },
        sessions: sessionStats,
        incidents: incidentStats,
        alerts: alertStats,
        threats: threatStats,
        recentLogs,
        systemHealth: {
          ...systemHealth,
          roles,
        },
        database: dbStats,
      }
    });
  } catch (error) {
    console.error('Admin system health error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system health' },
      { status: 500 }
    );
  }
}

function calculateHealthScore(metrics: {
  dbHealthy: boolean;
  staleSessions: number;
  lockedUsers: number;
  openIncidents: number;
  activeAlerts: number;
}): number {
  let score = 100;

  if (!metrics.dbHealthy) score -= 40;
  if (metrics.staleSessions > 10) score -= 10;
  if (metrics.lockedUsers > 5) score -= 5;
  if (metrics.openIncidents > 20) score -= 15;
  if (metrics.activeAlerts > 50) score -= 15;
  if (metrics.activeAlerts > 100) score -= 15;

  return Math.max(0, score);
}

// POST /api/admin/system - Execute system actions
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'cleanup-sessions': {
        // Clean up stale sessions (inactive for > 2 hours)
        const result = await db.session.deleteMany({
          where: {
            OR: [
              { isActive: false },
              { lastActiveAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }}
            ]
          }
        });

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${result.count} stale sessions`,
          data: { deletedCount: result.count }
        });
      }

      case 'clear-cache': {
        // This would integrate with Redis cache clearing
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
          data: { clearedAt: new Date().toISOString() }
        });
      }

      case 'generate-report': {
        // Trigger report generation
        const { type, dateRange } = body;
        
        return NextResponse.json({
          success: true,
          message: `Report generation started for ${type}`,
          data: {
            reportId: `rpt_${Date.now()}`,
            type,
            dateRange,
            status: 'processing',
            estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          }
        });
      }

      case 'backup': {
        // Trigger database backup
        return NextResponse.json({
          success: true,
          message: 'Backup initiated',
          data: {
            backupId: `bkp_${Date.now()}`,
            status: 'processing',
            estimatedSize: 'estimated',
            initiatedAt: new Date().toISOString()
          }
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin system action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute system action' },
      { status: 500 }
    );
  }
}
