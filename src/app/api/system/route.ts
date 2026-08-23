/**
 * National SOC Platform - System Health & Configuration API
 * 
 * Provides system health monitoring and configuration management:
 * - System component status
 * - Database health checks
 * - Configuration management
 * - Audit log access
 * - Report generation status
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/system - Fetch system health and configuration
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "health"; // health, config, audit, reports

    switch (section) {
      case "health":
        return await getSystemHealth();
      
      case "config":
        return await getSystemConfig();
      
      case "audit":
        return await getAuditLogs(searchParams);
      
      case "reports":
        return await getReports();
      
      case "users":
        return await getUsers();
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown section: ${section}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Error fetching system data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch system data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// System Health Check
async function getSystemHealth() {
  const startTime = Date.now();

  // Run database health check
  let dbHealthy = true;
  let dbLatency = 0;
  
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbHealthy = false;
  }

  // Get counts for dashboard
  const [userCount, alertCount, incidentCount, configCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.alert.count({
      where: { status: { in: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'] } }
    }),
    db.incident.count({
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } }
    }),
    db.systemConfig.count()
  ]);

  // Mock infrastructure components (would integrate with actual monitoring)
  const components = [
    { name: 'Database', status: dbHealthy ? 'operational' : 'down', latency: dbLatency },
    { name: 'API Server', status: 'operational', latency: Math.random() * 10 + 5 },
    { name: 'Prisma ORM', status: 'operational', latency: dbLatency },
    { name: 'Cache Layer', status: 'operational', latency: Math.random() * 2 + 1 },
    { name: 'File Storage', status: 'operational', latency: Math.random() * 15 + 5 }
  ];

  const allOperational = components.every(c => c.status === 'operational');
  const overallScore = allOperational ? 98 : 75;

  return NextResponse.json({
    success: true,
    section: 'health',
    data: {
      overall: {
        status: allOperational ? 'healthy' : 'degraded',
        score: overallScore,
        uptime: 99.95,
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime
      },
      components,
      metrics: {
        activeUsers: userCount,
        activeAlerts: alertCount,
        openIncidents: incidentCount,
        configEntries: configCount
      },
      version: {
        api: '2.0.0',
        schema: '2.0.0',
        node: process.version,
        prisma: '6.x'
      }
    },
    timestamp: new Date().toISOString()
  });
}

// System Configuration
async function getSystemConfig() {
  const configs = await db.systemConfig.findMany({
    orderBy: { category: 'asc' }
  });

  // Group by category
  const grouped = configs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push({
      key: config.key,
      value: config.isSensitive ? '***REDACTED***' : config.value,
      description: config.description,
      isSensitive: config.isSensitive,
      lastModified: config.updatedAt
    });
    return acc;
  }, {} as Record<string, any>);

  return NextResponse.json({
    success: true,
    section: 'config',
    data: {
      configurations: grouped,
      totalEntries: configs.length
    },
    timestamp: new Date().toISOString()
  });
}

// Audit Logs
async function getAuditLogs(searchParams: URLSearchParams) {
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const category = searchParams.get("category");
  const action = searchParams.get("action");

  const where: any = {};
  
  if (category) where.category = category.toUpperCase();
  if (action) where.action = { contains: action, mode: 'insensitive' };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    }),
    db.auditLog.count({ where })
  ]);

  return NextResponse.json({
    success: true,
    section: 'audit',
    data: {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        user: log.user ? { id: log.user.id, name: log.user.name } : null,
        severity: log.severity.toLowerCase(),
        category: log.category.toLowerCase(),
        outcome: log.outcome.toLowerCase(),
        ipAddress: log.ipAddress,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total }
    },
    timestamp: new Date().toISOString()
  });
}

// Reports
async function getReports() {
  const reports = await db.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    success: true,
    section: 'reports',
    data: {
      reports: reports.map(report => ({
        id: report.id,
        title: report.title,
        type: report.reportType.toLowerCase(),
        format: report.format.toLowerCase(),
        status: report.status.toLowerCase(),
        schedule: report.schedule?.toLowerCase(),
        filePath: report.filePath,
        fileSize: report.fileSize,
        generatedAt: report.completedAt || report.createdAt,
        generatedBy: report.generatedBy
      }))
    },
    timestamp: new Date().toISOString()
  });
}

// Users (for admin/management)
async function getUsers() {
  const users = await db.user.findMany({
    where: { isActive: true },
    include: {
      role: { select: { name: true, description: true } },
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({
    success: true,
    section: 'users',
    data: {
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role.name,
        roleDescription: user.role.description,
        isMfaEnabled: user.isMfaEnabled,
        lastLogin: user.lastLoginAt
      })),
      totalUsers: users.length
    },
    timestamp: new Date().toISOString()
  });
}
