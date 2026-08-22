/**
 * National SOC Platform - Incidents API
 * 
 * Manages security incidents with full lifecycle support:
 * - CRUD operations for incidents
 * - Incident timeline and updates
 * - Evidence management
 * - Task tracking
 * - SLA monitoring
 * 
 * AUTHENTICATION REQUIRED for all endpoints
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { IncidentSeverity, IncidentStatus, IncidentPhase, IncidentType, TaskStatus } from "@prisma/client";
import { withAuth } from '@/lib/auth/api-auth';
import { requireAnalyst } from '@/lib/auth/middleware';

// GET /api/incidents - Fetch incidents with filtering (AUTH REQUIRED)
export const GET = withAuth(async (request: Request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") as IncidentSeverity | null;
    const status = searchParams.get("status") as IncidentStatus | null;
    const phase = searchParams.get("phase") as IncidentPhase | null;
    const type = searchParams.get("type") as IncidentType | null;
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeDetails = searchParams.get("details") === "true";

    // Build where clause
    const where: any = {};
    
    if (severity && Object.values(IncidentSeverity).includes(severity)) {
      where.severity = severity;
    }
    
    if (status && Object.values(IncidentStatus).includes(status)) {
      where.status = status;
    }
    
    if (phase && Object.values(IncidentPhase).includes(phase)) {
      where.phase = phase;
    }
    
    if (type && Object.values(IncidentType).includes(type)) {
      where.incidentType = type;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tatcCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute queries in parallel
    const [incidents, total, stats] = await Promise.all([
      db.incident.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          alerts: includeDetails ? {
            take: 5,
            orderBy: { firstSeen: 'desc' },
            select: { id: true, title: true, severity: true, status: true }
          } : false,
          updates: includeDetails ? {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              author: { select: { id: true, name: true } }
            }
          } : false,
          tasks: includeDetails ? {
            where: { status: { not: TaskStatus.COMPLETED } },
            take: 5,
            orderBy: { dueDate: 'asc' }
          } : false,
          evidence: includeDetails ? {
            take: 3,
            orderBy: { collectedAt: 'desc' }
          } : false,
          _count: {
            select: {
              alerts: true,
              updates: true,
              tasks: true,
              evidence: true
            }
          }
        },
      }),
      db.incident.count({ where }),
      // Aggregate statistics
      db.incident.groupBy({
        by: ['status', 'severity'],
        _count: { id: true },
        where: {
          status: { notIn: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: incidents.map(incident => ({
        id: incident.id,
        tatcCode: incident.tatcCode,
        title: incident.title,
        description: incident.description,
        incidentType: incident.incidentType.toLowerCase(),
        severity: incident.severity.toLowerCase(),
        status: incident.status.toLowerCase(),
        phase: incident.phase.toLowerCase(),
        priority: incident.priority,
        impactScore: incident.impactScore,
        confidenceScore: incident.confidenceScore,
        detectedAt: incident.detectedAt,
        resolvedAt: incident.resolvedAt,
        targetResolution: incident.targetResolution,
        slaBreach: incident.slaBreach,
        assignedToId: incident.assignedToId,
        affectedAssets: incident.affectedAssets ? JSON.parse(incident.affectedAssets) : [],
        affectedServices: incident.affectedServices ? JSON.parse(incident.affectedServices) : [],
        // Counts
        _count: incident._count,
        // Detailed relations (only when requested)
        alerts: incident.alerts,
        updates: incident.updates?.map(update => ({
          id: update.id,
          message: update.message,
          status: update.status?.toLowerCase(),
          phase: update.phase?.toLowerCase(),
          isInternal: update.isInternal,
          createdAt: update.createdAt,
          author: update.author
        })),
        tasks: incident.tasks,
        evidence: incident.evidence,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        byStatus: stats.reduce((acc, s) => ({
          ...acc,
          [s.status]: {
            ...(acc[s.status] || {}),
            [s.severity.toLowerCase()]: s._count.id
          }
        }), {} as Record<string, any>),
        totalActive: incidents.filter(i => 
          ![IncidentStatus.RESOLVED, IncidentStatus.CLOSED].includes(i.status)
        ).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching incidents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incidents", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/incidents - Create or update incidents (AUTH REQUIRED)
export const POST = withAuth(async (request: Request, user) => {
  try {
    const body = await request.json();
    const { action, id, ...incidentData } = body;
    
    // Log who is creating/modifying incidents
    console.log(`[INCIDENTS] User ${user.userId} (${user.roleName}) performing action: ${action}`);

    // Create new incident
    if (action === "create") {
      // SECURITY: Use crypto.randomUUID() for unpredictable, unique identifiers
      // Previous implementation used Math.random() which is predictable
      const generateTATCCode = () => {
        const year = new Date().getFullYear();
        const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
        return `TATC-${year}-${uniqueId}`;
      };

      const incident = await db.incident.create({
        data: {
          title: incidentData.title,
          description: incidentData.description,
          incidentType: incidentData.type?.toUpperCase() || IncidentType.SECURITY,
          severity: incidentData.severity?.toUpperCase() || IncidentSeverity.HIGH,
          status: IncidentStatus.OPEN,
          phase: IncidentPhase.DETECTION,
          priority: incidentData.priority || 2,
          tatcCode: generateTATCCode(),
          reportedBy: incidentData.reportedBy,
          assignedToId: incidentData.assigneeId,
          affectedAssets: incidentData.affectedAssets ? JSON.stringify(incidentData.affectedAssets) : null,
          affectedServices: incidentData.affectedServices ? JSON.stringify(incidentData.affectedServices) : null,
          confidenceScore: incidentData.confidenceScore || 50.0,
          impactScore: incidentData.impactScore || 5.0,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          alerts: { take: 5, orderBy: { firstSeen: 'desc' } }
        }
      });

      // Create initial update
      await db.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          authorId: incidentData.reporterId || incident.assignedToId,
          message: `Incident created: ${incident.title}`,
          status: IncidentStatus.OPEN,
          phase: IncidentPhase.DETECTION
        }
      });

      return NextResponse.json({
        success: true,
        message: "Incident created successfully",
        data: incident,
        timestamp: new Date().toISOString(),
      });
    }

    // Update incident status/phase
    if (action === "update" && id) {
      const { status, phase, assigneeId, ...updates } = incidentData;
      
      const updateData: any = { ...updates };

      if (status) updateData.status = status.toUpperCase();
      if (phase) updateData.phase = phase.toUpperCase();
      if (assigneeId) updateData.assignedTo = { connect: { id: assigneeId } };

      // Auto-set resolvedAt when resolving
      if (status?.toUpperCase() === IncidentStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }

      const updatedIncident = await db.incident.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true } }
        }
      });

      // Add update log entry
      if (status || phase) {
        await db.incidentUpdate.create({
          data: {
            incidentId: id,
            authorId: body.authorId,
            message: `Incident ${status ? `status changed to ${status}` : ''}${phase ? `, phase updated to ${phase}` : ''}`,
            status: status?.toUpperCase(),
            phase: phase?.toUpperCase()
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Incident ${id} updated`,
        data: updatedIncident,
        timestamp: new Date().toISOString(),
      });
    }

    // Add incident update/comment
    if (action === "addUpdate" && id) {
      const { message, authorId, isInternal, status, phase } = incidentData;

      const update = await db.incidentUpdate.create({
        data: {
          incidentId: id,
          authorId: authorId,
          message,
          isInternal: isInternal || false,
          status: status?.toUpperCase(),
          phase: phase?.toUpperCase()
        },
        include: {
          author: { select: { id: true, name: true } }
        }
      });

      return NextResponse.json({
        success: true,
        message: "Update added to incident",
        data: update,
        timestamp: new Date().toISOString(),
      });
    }

    // Link alert to incident
    if (action === "linkAlert" && id) {
      const { alertId } = incidentData;

      await db.alert.update({
        where: { id: alertId },
        data: {
          incidentId: id,
          status: 'ESCALATED'
        }
      });

      return NextResponse.json({
        success: true,
        message: `Alert ${alertId} linked to incident ${id}`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Invalid action. Supported actions: create, update, addUpdate, linkAlert",
        supportedActions: ['create', 'update', 'addUpdate', 'linkAlert']
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error processing incident request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
