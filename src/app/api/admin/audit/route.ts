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

const queryAuditSchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('50'),
  search: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const validEntityTypes = [
  'User', 'Role', 'Session', 'Incident', 'Alert', 'ThreatIndicator',
  'IOC', 'HuntSession', 'SS7Message', 'GTPSession', 'Subscriber',
  'System', 'Configuration', 'ComplianceReport'
];

const validActions = [
  // User actions
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'MFA_ENABLED', 'MFA_DISABLED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
  'ROLE_CHANGED', 'STATUS_CHANGED',
  // Incident actions
  'INCIDENT_CREATED', 'INCIDENT_UPDATED', 'INCIDENT_ESCALATED', 'INCIDENT_RESOLVED',
  'INCIDENT_CLOSED', 'EVIDENCE_ADDED', 'TASK_CREATED', 'TASK_COMPLETED',
  // Alert actions
  'ALERT_TRIGGERED', 'ALERT_ACKNOWLEDGED', 'ALERT_ESCALATED', 'ALERT_CLOSED',
  // Threat actions
  'IOC_ADDED', 'IOC_UPDATED', 'IOC_DELETED', 'HUNT_STARTED', 'HUNT_COMPLETED',
  // System actions
  'CONFIG_CHANGED', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'EXPORT_PERFORMED',
  'SESSION_CLEANUP', 'CACHE_CLEARED',
];

// GET /api/admin/audit - List audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = queryAuditSchema.parse(Object.fromEntries(searchParams));

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 200); // Max 200 per page for logs
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (query.search) {
      where.OR = [
        { details: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { userAgent: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType && validEntityTypes.includes(query.entityType)) {
      where.entityType = query.entityType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Fetch audit logs with user info
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        skip,
        take: limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      db.auditLog.count({ where }),
    ]);

    // Get available filters
    const [actions, entityTypes, users] = await Promise.all([
      db.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 50,
      }),
      db.auditLog.groupBy({
        by: ['entityType'],
        _count: true,
        orderBy: { _count: { entityType: 'desc' } },
      }),
      db.auditLog.groupBy({
        by: ['userId'],
        _count: true,
        where: { userId: { not: 'system' } },
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      }).then(async (groups) => {
        const userIds = groups.map(g => g.userId).filter(id => id !== 'system');
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true }
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));
        return groups.map(g => ({
          userId: g.userId,
          count: g._count,
          user: userMap[g.userId] || null
        }));
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          actions: validActions,
          entityTypes: validEntityTypes,
          actionCounts: Object.fromEntries(actions.map(a => [a.action, a._count])),
          entityTypeCounts: Object.fromEntries(entityTypes.map(e => [e.entityType, e._count])),
          topUsers: users,
        }
      }
    });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/audit - Create manual audit entry or export
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'export') {
      // Export audit logs
      const { format = 'json', filters = {} } = data;
      
      const where: any = {};
      if (filters.startDate) where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
      if (filters.endDate) where.createdAt = { ...where.createdAt, lte: new Date(filters.endDate) };
      if (filters.action) where.action = filters.action;
      if (filters.userId) where.userId = filters.userId;

      const logs = await db.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10000, // Limit exports
      });

      if (format === 'csv') {
        // Convert to CSV
        const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'User Agent'];
        const rows = logs.map(log => [
          log.createdAt.toISOString(),
          log.user?.name || 'System',
          log.action,
          log.entityType,
          log.entityId,
          `"${(log.details || '').replace(/"/g, '""')}"`,
          log.ipAddress,
          `"${(log.userAgent || '').replace(/"/g, '""')}"`
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          logs,
          exportDate: new Date().toISOString(),
          totalCount: logs.length,
          format
        }
      });
    }

    if (action === 'create-entry') {
      // Create manual audit entry
      const { entityType, entityId, details, severity = 'INFO' } = data;
      
      const log = await db.auditLog.create({
        data: {
          userId: 'system', // Admin-created entries are system entries
          action: 'MANUAL_ENTRY',
          entityType: entityType || 'System',
          entityId,
          details: details || 'Manual audit entry created by administrator',
          severity,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'admin-api',
        }
      });

      return NextResponse.json({
        success: true,
        data: log,
        message: 'Audit entry created successfully'
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin audit post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process audit request' },
      { status: 500 }
    );
  }
}
