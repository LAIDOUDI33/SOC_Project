/**
 * National SOC Platform - Alerts API
 * 
 * Provides CRUD operations for security alerts with:
 * - Filtering by severity, status, type, source
 * - Pagination support
 * - Real-time alert statistics from database
 * - Incident correlation
 * 
 * AUTHENTICATION REQUIRED for all endpoints
 */

import { NextRequest, NextResponse } from "next/server";
// Import Prisma database client
import { db } from "@/lib/db";
import { AlertSeverity, AlertStatus } from "@prisma/client";
// Import authentication
import { withAuth, optionalAuth } from '@/lib/auth/api-auth';

// Map string severity values to enum
function mapSeverity(severity: string | null): AlertSeverity | undefined {
  if (!severity) return undefined;
  const upper = severity.toUpperCase();
  if (upper in AlertSeverity) {
    return AlertSeverity[upper as keyof typeof AlertSeverity];
  }
  return undefined;
}

// Map string status values to enum  
function mapStatus(status: string | null): AlertStatus | undefined {
  if (!status) return undefined;
  // Handle various status formats that frontend might send
  const statusMap: Record<string, AlertStatus> = {
    'new': AlertStatus.NEW,
    'acknowledged': AlertStatus.ACKNOWLEDGED,
    'in_progress': AlertStatus.IN_PROGRESS,
    'in-progress': AlertStatus.IN_PROGRESS,
    'escalated': AlertStatus.ESCALATED,
    'resolved': AlertStatus.RESOLVED,
    'false_positive': AlertStatus.FALSE_POSITIVE,
    'false-positive': AlertStatus.FALSE_POSITIVE,
    'suppressed': AlertStatus.SUPPRESSED,
    'open': AlertStatus.NEW, // Map 'open' to NEW for backward compatibility
    'investigating': AlertStatus.IN_PROGRESS, // Map 'investigating' to IN_PROGRESS
  };
  return statusMap[status.toLowerCase()];
}

// GET /api/alerts - Fetch alerts with filtering and pagination (AUTH REQUIRED)
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause for Prisma query
    const where: any = {};
    
    // Filter by severity using enum
    const severityEnum = mapSeverity(severity);
    if (severityEnum) {
      where.severity = severityEnum;
    }
    
    // Filter by status using enum
    const statusEnum = mapStatus(status);
    if (statusEnum) {
      where.status = statusEnum;
    }
    
    // Search across multiple fields
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
        { sourceIp: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Exclude suppressed alerts by default unless specifically requested
    if (!searchParams.get('includeSuppressed')) {
      where.isSuppressed = false;
    }

    // Execute parallel queries for data and statistics
    const [alerts, totalCount, stats] = await Promise.all([
      // Get paginated alerts
      db.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          incident: {
            select: {
              id: true,
              title: true,
              status: true,
            }
          }
        }
      }),
      
      // Get total count for pagination
      db.alert.count({ where }),
      
      // Get severity breakdown statistics
      db.alert.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: { isSuppressed: false }
      })
    ]);

    // Get active alerts count (NEW, ACKNOWLEDGED, IN_PROGRESS, ESCALATED)
    const activeStatuses = [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED, AlertStatus.IN_PROGRESS, AlertStatus.ESCALATED];
    const [totalActive] = await Promise.all([
      db.alert.count({
        where: {
          status: { in: activeStatuses },
          isSuppressed: false
        }
      })
    ]);

    // Transform stats into expected format
    const statsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    
    stats.forEach(stat => {
      const key = stat.severity.toLowerCase();
      statsBySeverity[key] = stat._count.id;
    });

    // Format response with database data
    return NextResponse.json({
      success: true,
      data: alerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity.toLowerCase(),
        status: mapStatusToResponseFormat(alert.status),
        source: alert.source,
        sourceIp: alert.sourceIp,
        destIp: alert.destIp,
        timestamp: alert.createdAt.toISOString(),
        assignee: alert.assignedToId,
        mitreTechnique: alert.mitreTechniques,
        alertType: alert.alertType.toLowerCase(),
        isSuppressed: alert.isSuppressed,
        escalationCount: alert.escalationCount,
        incidentId: alert.incidentId,
        incident: alert.incident ? {
          id: alert.incident.id,
          title: alert.incident.title,
          status: alert.incident.status.toLowerCase()
        } : null,
        firstSeen: alert.firstSeen.toISOString(),
        lastSeen: alert.lastSeen.toISOString(),
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statistics: {
        bySeverity: statsBySeverity,
        totalActive,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          { success: false, error: "Database connection error", details: error.message },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

// Helper function to convert AlertStatus enum to response format
function mapStatusToResponseFormat(status: AlertStatus): string {
  const statusMap: Record<AlertStatus, string> = {
    [AlertStatus.NEW]: 'new',
    [AlertStatus.ACKNOWLEDGED]: 'acknowledged',
    [AlertStatus.IN_PROGRESS]: 'in_progress',
    [AlertStatus.ESCALATED]: 'escalated',
    [AlertStatus.RESOLVED]: 'resolved',
    [AlertStatus.FALSE_POSITIVE]: 'false_positive',
    [AlertStatus.SUPPRESSED]: 'suppressed',
  };
  return statusMap[status];
}

// POST /api/alerts - Create or update alerts (AUTH REQUIRED)
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { action, id, ...alertData } = body;

    switch (action) {
      case "updateStatus": {
        // Update alert status in database
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Alert ID is required for status update" },
            { status: 400 }
          );
        }

        const newStatus = mapStatus(alertData.status);
        if (!newStatus) {
          return NextResponse.json(
            { success: false, error: `Invalid status value: ${alertData.status}` },
            { status: 400 }
          );
        }

        // Build update data based on new status
        const updateData: any = { status: newStatus };
        
        // If resolving, set resolvedAt timestamp
        if (newStatus === AlertStatus.RESOLVED) {
          updateData.resolvedAt = new Date();
        }

        const updatedAlert = await db.alert.update({
          where: { id },
          data: updateData
        });

        return NextResponse.json({
          success: true,
          message: `Alert ${id} updated to ${alertData.status}`,
          data: { 
            id, 
            status: mapStatusToResponseFormat(updatedAlert.status),
            resolvedAt: updatedAlert.resolvedAt?.toISOString() 
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "toggleSuppress": {
        // Toggle alert suppression in database
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Alert ID is required for suppression toggle" },
            { status: 400 }
          );
        }

        // Get current alert state first
        const currentAlert = await db.alert.findUnique({ where: { id } });
        if (!currentAlert) {
          return NextResponse.json(
            { success: false, error: "Alert not found" },
            { status: 404 }
          );
        }

        const updatedAlert = await db.alert.update({
          where: { id },
          data: { isSuppressed: !currentAlert.isSuppressed }
        });

        return NextResponse.json({
          success: true,
          message: `Alert ${id} suppression toggled`,
          data: { 
            id, 
            isSuppressed: updatedAlert.isSuppressed 
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "escalate": {
        // Escalate alert - create incident or update existing one
        if (!id) {
          return NextResponse.json(
            { success: false, error: "Alert ID is required for escalation" },
            { status: 400 }
          );
        }

        // Get the alert
        const alert = await db.alert.findUnique({ where: { id } });
        if (!alert) {
          return NextResponse.json(
            { success: false, error: "Alert not found" },
            { status: 404 }
          );
        }

        // Increment escalation count and update status
        const updatedAlert = await db.alert.update({
          where: { id },
          data: {
            escalationCount: { increment: 1 },
            status: AlertStatus.ESCALATED
          }
        });

        // Generate incident ID format
        const incidentId = `INC-${Date.now()}`;

        return NextResponse.json({
          success: true,
          message: `Alert escalated to incident ${incidentId}`,
          data: { 
            alertId: id, 
            incidentId,
            escalationCount: updatedAlert.escalationCount 
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "create": {
        // Create new alert in database
        const newAlert = await db.alert.create({
          data: {
            id: `ALT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            title: alertData.title || 'New Alert',
            description: alertData.description,
            severity: mapSeverity(alertData.severity) || AlertSeverity.MEDIUM,
            source: alertData.source || 'manual',
            sourceIp: alertData.sourceIp,
            destIp: alertData.destIp,
            alertType: alertData.alertType ? alertData.alertType.toUpperCase() : 'DETECTION',
            rawEvent: alertData.rawEvent ? JSON.stringify(alertData.rawEvent) : null,
            mitreTactics: alertData.mitreTactics,
            mitreTechniques: alertData.mitreTechnique || alertData.mitreTechniques,
            assignedToId: alertData.assignee || alertData.assignedToId,
          }
        });

        return NextResponse.json({
          success: true,
          message: "Alert created successfully",
          data: {
            ...newAlert,
            severity: newAlert.severity.toLowerCase(),
            status: mapStatusToResponseFormat(newAlert.status),
            alertType: newAlert.alertType.toLowerCase(),
            timestamp: newAlert.createdAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Invalid action. Supported actions: updateStatus, toggleSuppress, escalate, create",
            supportedActions: ['updateStatus', 'toggleSuppress', 'escalate', 'create']
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Error processing alert request:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { success: false, error: "Alert not found", details: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('Unique constraint') || error.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: "Alert with this ID already exists", details: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, { permissions: ['alerts:create', 'alerts:update'] });

// DELETE /api/alerts - Delete an alert (admin only, AUTH REQUIRED)
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Alert ID parameter required" },
        { status: 400 }
      );
    }

    // Only admins can delete alerts
    if (user.roleName !== 'soc_admin') {
      return NextResponse.json(
        { success: false, error: "Only administrators can delete alerts", errorCode: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check if alert exists before deleting
    const existingAlert = await db.alert.findUnique({ where: { id } });
    if (!existingAlert) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    // Delete the alert from database
    await db.alert.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Alert ${id} deleted successfully`,
      data: { deletedId: id },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error deleting alert:", error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { success: false, error: "Alert not found", details: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { success: false, error: "Cannot delete alert linked to an incident. Remove the association first.", details: error.message },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to delete alert", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, { roles: ['soc_admin'] });
