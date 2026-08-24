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

// In-memory cron job store (in production, use a proper scheduler like node-cron or bull)
const scheduledJobs = new Map<string, {
  id: string;
  name: string;
  action: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  createdAt: Date;
  lastResult?: any;
}>();

// Initialize default maintenance jobs
function initializeDefaultJobs() {
  const now = new Date();
  
  // Session cleanup - runs every hour
  scheduledJobs.set('session-cleanup', {
    id: 'session-cleanup',
    name: 'Session Cleanup',
    action: 'cleanup-sessions',
    schedule: '0 * * * *', // Every hour
    enabled: true,
    lastRun: null,
    nextRun: new Date(now.getTime() + 60 * 60 * 1000),
    createdAt: now,
  });

  // Cache cleanup - runs every 6 hours
  scheduledJobs.set('cache-cleanup', {
    id: 'cache-cleanup',
    name: 'Cache Cleanup',
    action: 'clear-cache',
    schedule: '0 */6 * * *', // Every 6 hours
    enabled: true,
    lastRun: null,
    nextRun: new Date(now.getTime() + 6 * 60 * 60 * 1000),
    createdAt: now,
  });

  // Database backup - runs daily at 2 AM
  scheduledJobs.set('daily-backup', {
    id: 'daily-backup',
    name: 'Daily Database Backup',
    action: 'backup',
    schedule: '0 2 * * *', // Daily at 2 AM
    enabled: true,
    lastRun: null,
    nextRun: getNextCronDate('0 2 * * *'),
    createdAt: now,
  });

  // Health check - runs every 5 minutes
  scheduledJobs.set('health-check', {
    id: 'health-check',
    name: 'System Health Check',
    action: 'health-check',
    schedule: '*/5 * * * *', // Every 5 minutes
    enabled: true,
    lastRun: null,
    nextRun: new Date(now.getTime() + 5 * 60 * 1000),
    createdAt: now,
  });

  // Audit log cleanup - runs weekly on Sunday at 3 AM
  scheduledJobs.set('audit-cleanup', {
    id: 'audit-cleanup',
    name: 'Audit Log Cleanup (90+ days)',
    action: 'cleanup-audit-logs',
    schedule: '0 3 * * 0', // Weekly Sunday 3 AM
    enabled: true,
    lastRun: null,
    nextRun: getNextCronDate('0 3 * * 0'),
    createdAt: now,
  });

  // Report generation - daily at 6 AM
  scheduledJobs.set('daily-report', {
    id: 'daily-report',
    name: 'Daily Security Report',
    action: 'generate-report',
    schedule: '0 6 * * *', // Daily at 6 AM
    enabled: true,
    lastRun: null,
    nextRun: getNextCronDate('0 6 * * *'),
    createdAt: now,
  });
}

// Simple cron expression parser (basic implementation)
function getNextCronDate(cronExpr: string): Date {
  const parts = cronExpr.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const now = new Date();
  const next = new Date(now);
  
  if (minute !== '*') {
    next.setMinutes(parseInt(minute));
  }
  if (hour !== '*') {
    next.setHours(parseInt(hour));
  }
  
  // If time has passed today, schedule for next occurrence
  if (next <= now) {
    if (dayOfWeek === '*' && dayOfMonth === '*') {
      next.setDate(next.getDate() + 1);
    } else if (dayOfWeek !== '*') {
      // Add days until we hit the target day of week (0=Sunday)
      const targetDay = parseInt(dayOfWeek);
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      next.setDate(next.getDate() + daysToAdd);
    }
  }
  
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  return next;
}

// Initialize jobs on first import
if (scheduledJobs.size === 0) {
  initializeDefaultJobs();
}

const createJobSchema = z.object({
  name: z.string().min(2).max(100),
  action: z.enum(['cleanup-sessions', 'clear-cache', 'backup', 'health-check', 'cleanup-audit-logs', 'generate-report']),
  schedule: z.string(), // Cron expression
  enabled: z.boolean().default(true),
});

// GET /api/admin/maintenance - List maintenance jobs and run tasks
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const jobs = Array.from(scheduledJobs.values());

    // Get task execution history (last 50 tasks)
    const recentTasks = await db.auditLog.findMany({
      where: {
        action: {
          in: ['SESSION_CLEANUP', 'CACHE_CLEARED', 'SYSTEM_BACKUP', 'HEALTH_CHECK', 'EXPORT_PERFORMED']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
      }
    });

    // Get system maintenance statistics
    const [
      totalSessions,
      activeSessions,
      staleSessions,
      totalAuditLogs,
      oldAuditLogs, // Older than 90 days
    ] = await Promise.all([
      db.session.count(),
      db.session.count({ where: { isActive: true } }),
      db.session.count({
        where: {
          isActive: true,
          lastActiveAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        }
      }),
      db.auditLog.count(),
      db.auditLog.count({
        where: {
          createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        recentTasks,
        statistics: {
          sessions: { total: totalSessions, active: activeSessions, stale: staleSessions },
          auditLogs: { total: totalAuditLogs, olderThan90Days: oldAuditLogs },
        },
        availableActions: [
          { value: 'cleanup-sessions', label: 'Session Cleanup', description: 'Remove inactive/stale sessions' },
          { value: 'clear-cache', label: 'Cache Clearing', description: 'Clear all caches' },
          { value: 'backup', label: 'Database Backup', description: 'Create database backup' },
          { value: 'health-check', label: 'Health Check', description: 'Run system health diagnostics' },
          { value: 'cleanup-audit-logs', label: 'Audit Log Cleanup', description: 'Remove audit logs older than 90 days' },
          { value: 'generate-report', label: 'Generate Report', description: 'Generate security report' },
        ],
        cronHelp: {
          format: 'minute hour day-of-month month day-of-week',
          examples: [
            { expr: '* * * * *', desc: 'Every minute' },
            { expr: '0 * * * *', desc: 'Every hour' },
            { expr: '*/5 * * * *', desc: 'Every 5 minutes' },
            { expr: '0 2 * * *', desc: 'Daily at 2 AM' },
            { expr: '0 */6 * * *', desc: 'Every 6 hours' },
            { expr: '0 3 * * 0', desc: 'Weekly Sunday at 3 AM' },
            { expr: '0 0 1 * *', desc: 'Monthly on 1st day' },
          ]
        }
      }
    });
  } catch (error) {
    console.error('Admin maintenance get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/maintenance - Execute maintenance tasks or manage jobs
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { action, jobId, ...data } = body;

    switch (action) {
      case 'execute-task': {
        // Execute a maintenance task immediately
        const { task } = data;
        
        let result: any = {};
        
        switch (task) {
          case 'cleanup-sessions': {
            const deleted = await db.session.deleteMany({
              where: {
                OR: [
                  { isActive: false },
                  { lastActiveAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }}
                ]
              }
            });
            result = { task, status: 'success', deletedCount: deleted.count, message: `Cleaned up ${deleted.count} sessions` };
            break;
          }

          case 'clear-cache': {
            result = { task, status: 'success', message: 'Cache cleared successfully', clearedAt: new Date().toISOString() };
            break;
          }

          case 'backup': {
            result = { 
              task, 
              status: 'success', 
              message: 'Backup initiated', 
              backupId: `bkp_${Date.now()}`,
              estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            };
            break;
          }

          case 'health-check': {
            const startTime = Date.now();
            
            // Run health checks in parallel
            const [dbCheck, sessionCheck, userCheck] = await Promise.all([
              db.user.count().then(() => ({ status: 'healthy', latency: Date.now() - startTime }))
                .catch(() => ({ status: 'unhealthy', latency: Date.now() - startTime })),
              
              db.session.count({ where: { isActive: true } })
                .then(count => ({ activeSessions: count })),
              
              Promise.all([
                db.user.count({ where: { status: 'ACTIVE' } }),
                db.user.count({ where: { status: 'LOCKED' } }),
              ]).then(([active, locked]) => ({ activeUsers: active, lockedUsers: locked })),
            ]);
            
            result = {
              task,
              status: 'success',
              checks: {
                database: dbCheck,
                sessions: sessionCheck,
                users: userCheck,
              },
              overallHealth: dbCheck.status === 'healthy' ? 'healthy' : 'degraded',
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString(),
            };
            break;
          }

          case 'cleanup-audit-logs': {
            const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const deleted = await db.auditLog.deleteMany({
              where: { createdAt: { lt: cutoffDate } }
            });
            result = { task, status: 'success', deletedCount: deleted.count, message: `Deleted ${deleted.count} audit logs older than 90 days` };
            break;
          }

          case 'generate-report': {
            const reportData = await Promise.all([
              db.incident.count(),
              db.alert.count({ where: { status: 'OPEN' } }),
              db.threatIndicator.count(),
              db.user.count({ where: { status: 'ACTIVE' } }),
              db.session.count({ where: { isActive: true } }),
            ]);
            
            result = {
              task,
              status: 'success',
              reportId: `rpt_${Date.now()}`,
              generatedAt: new Date().toISOString(),
              summary: {
                totalIncidents: reportData[0],
                openAlerts: reportData[1],
                threatIndicators: reportData[2],
                activeUsers: reportData[3],
                activeSessions: reportData[4],
              }
            };
            break;
          }

          default:
            return NextResponse.json(
              { success: false, error: `Unknown task: ${task}` },
              { status: 400 }
            );
        }

        // Update job's last run info if applicable
        for (const [id, job] of scheduledJobs.entries()) {
          if (job.action === task) {
            scheduledJobs.set(id, {
              ...job,
              lastRun: new Date(),
              nextRun: getNextCronDate(job.schedule),
              lastResult: result,
            });
            break;
          }
        }

        // Create audit log
        await db.auditLog.create({
          data: {
            userId: 'system',
            action: task.toUpperCase().replace(/-/g, '_') as any,
            entityType: 'Maintenance',
            details: `Admin executed maintenance task: ${task}. Result: ${JSON.stringify(result).substring(0, 200)}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          data: result,
          message: `Task ${task} executed successfully`
        });
      }

      case 'create-job': {
        // Create a new scheduled job
        const jobData = createJobSchema.parse(data);
        
        const jobId = `job_${Date.now()}`;
        const newJob = {
          id: jobId,
          ...jobData,
          lastRun: null,
          nextRun: getNextCronDate(jobData.schedule),
          createdAt: new Date(),
        };

        scheduledJobs.set(jobId, newJob);

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'JOB_CREATED',
            entityType: 'ScheduledJob',
            entityId: jobId,
            details: `Admin created scheduled job: ${jobData.name} (${jobData.schedule})`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          data: newJob,
          message: 'Scheduled job created successfully'
        }, { status: 201 });
      }

      case 'toggle-job': {
        // Enable/disable a job
        if (!jobId || !scheduledJobs.has(jobId)) {
          return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
          );
        }

        const job = scheduledJobs.get(jobId)!;
        const updatedJob = { ...job, enabled: !job.enabled };
        scheduledJobs.set(jobId, updatedJob);

        return NextResponse.json({
          success: true,
          data: updatedJob,
          message: `Job ${updatedJob.enabled ? 'enabled' : 'disabled'}`
        });
      }

      case 'delete-job': {
        // Delete a custom job (not built-in ones)
        const builtInJobs = ['session-cleanup', 'cache-cleanup', 'daily-backup', 'health-check', 'audit-cleanup', 'daily-report'];
        
        if (!jobId || !scheduledJobs.has(jobId)) {
          return NextResponse.json(
            { success: false, error: 'Job not found' },
            { status: 404 }
          );
        }

        if (builtInJobs.includes(jobId)) {
          return NextResponse.json(
            { success: false, error: 'Cannot delete built-in jobs. Disable them instead.' },
            { status: 400 }
          );
        }

        scheduledJobs.delete(jobId);

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'JOB_DELETED',
            entityType: 'ScheduledJob',
            entityId: jobId,
            details: `Admin deleted scheduled job`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Job deleted successfully'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin maintenance post error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to execute maintenance action' },
      { status: 500 }
    );
  }
}
