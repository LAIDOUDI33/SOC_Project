/**
 * National SOC Platform - Alerts API
 * 
 * Provides CRUD operations for security alerts with:
 * - Filtering by severity, status, type, source
 * - Pagination support
 * - Real-time alert statistics
 * - Incident correlation
 * 
 * AUTHENTICATION REQUIRED for all endpoints
 */

import { NextRequest, NextResponse } from "next/server";
// Import demo data for realistic Djezzy SOC data
import { recentAlerts, getDashboardSummary } from "@/lib/demo-data";
// Import authentication
import { withAuth, optionalAuth } from '@/lib/auth/api-auth';

// GET /api/alerts - Fetch alerts with filtering and pagination (AUTH REQUIRED)
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Filter alerts based on parameters
    let filteredAlerts = [...recentAlerts];
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity.toLowerCase());
    }
    
    if (status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === status.toLowerCase());
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAlerts = filteredAlerts.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.id.toLowerCase().includes(searchLower)
      );
    }

    // Paginate results
    const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);

    // Calculate statistics
    const stats = {
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      high: recentAlerts.filter(a => a.severity === 'high').length,
      medium: recentAlerts.filter(a => a.severity === 'medium').length,
      low: recentAlerts.filter(a => a.severity === 'low').length,
      info: recentAlerts.filter(a => a.severity === 'info').length,
    };

    // Format response with demo data
    return NextResponse.json({
      success: true,
      data: paginatedAlerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        sourceIp: alert.sourceIp,
        destIp: alert.destIp,
        timestamp: alert.timestamp,
        assignee: alert.assignee,
        mitreTechnique: alert.mitreTechnique,
      })),
      pagination: {
        total: filteredAlerts.length,
        limit,
        offset,
        hasMore: offset + limit < filteredAlerts.length,
        totalPages: Math.ceil(filteredAlerts.length / limit),
      },
      statistics: {
        bySeverity: stats,
        totalActive: filteredAlerts.filter(a => ['open', 'acknowledged', 'investigating'].includes(a.status)).length,
      },
      summary: getDashboardSummary(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

// POST /api/alerts - Create or update alerts (AUTH REQUIRED)
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { action, id, ...alertData } = body;

    // Simulate alert operations with demo data
    if (action === "updateStatus" && id) {
      return NextResponse.json({
        success: true,
        message: `Alert ${id} updated to ${alertData.status}`,
        data: { id, status: alertData.status },
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "toggleSuppress" && id) {
      return NextResponse.json({
        success: true,
        message: `Alert ${id} suppression toggled`,
        data: { id, isSuppressed: true },
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "escalate" && id) {
      return NextResponse.json({
        success: true,
        message: `Alert escalated to incident INC-${Date.now()}`,
        data: { alertId: id, incidentId: `INC-${Date.now()}` },
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "create") {
      // Use crypto.randomUUID() instead of predictable timestamp-based ID
      const newAlert = {
        id: `ALT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        ...alertData,
        timestamp: new Date().toISOString(),
        status: 'open',
        createdBy: user.userId
      };

      return NextResponse.json({
        success: true,
        message: "Alert created successfully",
        data: newAlert,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "Invalid action. Supported actions: updateStatus, toggleSuppress, escalate, create",
        supportedActions: ['updateStatus', 'toggleSuppress', 'escalate', 'create']
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ Error processing alert request:", error);
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

    return NextResponse.json({
      success: true,
      message: `Alert ${id} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error deleting alert:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}, { roles: ['soc_admin'] });
