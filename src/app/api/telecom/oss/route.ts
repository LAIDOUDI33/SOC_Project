/**
 * National SOC Platform - OSS (Operations Support Systems) API
 * 
 * REST API endpoints for Operations Support Systems integration:
 * - GET /api/telecom/oss/network/status - Network health overview
 * - GET /api/telecom/oss/faults - Active faults list
 * - GET /api/telecom/oss/performance/kpis - Performance KPIs
 * - POST /api/telecom/oss/incidents - Create OSS incident
 * 
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ossIntegration,
  OSSIntegrationError,
  FaultManagementError
} from "@/lib/telecom/oss-integration";

// ============================================================
// Helper Functions
// ============================================================

function createSuccessResponse(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  });
}

function createErrorResponse(error: unknown, statusCode: number = 500) {
  console.error("[OSS-API] Error:", error);
  
  if (error instanceof OSSIntegrationError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    }, { status: error.statusCode });
  }
  
  return NextResponse.json({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}

// ============================================================
// Main Route Handler
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "overview";
  
  try {
    switch (action) {
      case "network_status":
        return await handleGetNetworkStatus();
      
      case "network_elements":
        return await handleGetNetworkElements(searchParams);
      
      case "faults":
        return await handleGetFaults(searchParams);
      
      case "kpis":
        return await handleGetKPIs(searchParams);
      
      case "incidents":
        return await handleGetIncidents(searchParams);
      
      case "sla":
        return await handleGetSLAMetrics(searchParams);
      
      case "inventory":
        return await handleGetInventory(searchParams);
      
      case "cmdb":
        return await handleGetCMDBRecords(searchParams);
      
      case "overview":
        return await handleOSSOverview();
      
      default:
        return createErrorResponse(
          { message: `Unknown action: ${action}`, code: "INVALID_ACTION" },
          400
        );
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case "create_incident":
        return await handleCreateIncident(body);
      
      case "acknowledge_fault":
        return await handleAcknowledgeFault(body);
      
      case "activate_service":
        return await handleActivateService(body);
      
      default:
        return createErrorResponse(
          { message: `Unknown action: ${action}`, code: "INVALID_ACTION" },
          400
        );
    }
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return createErrorResponse(
        { message: "Invalid JSON in request body", code: "INVALID_JSON" },
        400
      );
    }
    return createErrorResponse(error);
  }
}

// ============================================================
// Handler Functions - GET Endpoints
// ============================================================

async function handleGetNetworkStatus() {
  const overview = await ossIntegration.getNetworkOverview();

  return createSuccessResponse(overview, {
    resourceType: "NetworkStatus"
  });
}

async function handleGetNetworkElements(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("type")) filters.type = params.get("type");
  if (params.get("vendor")) filters.vendor = params.get("vendor");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);
  if (params.get("offset")) filters.offset = parseInt(params.get("offset")!);

  const result = await ossIntegration.getNetworkElements(filters as any);

  return createSuccessResponse(result, {
    resourceType: "NetworkElement"
  });
}

async function handleGetFaults(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("severity")) filters.severity = params.get("severity");
  if (params.get("type")) filters.type = params.get("type");
  if (params.get("neId")) filters.neId = params.get("neId");
  if (params.get("state")) filters.state = params.get("state");
  if (params.get("startDate")) filters.startDate = new Date(params.get("startDate")!);
  if (params.get("endDate")) filters.endDate = new Date(params.get("endDate")!);
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const result = await ossIntegration.getActiveFaults(filters as any);

  return createSuccessResponse(result, {
    resourceType: "Fault"
  });
}

async function handleGetKPIs(params: URLSearchParams) {
  const period = (params.get("period") || "24h") as "1h" | "24h" | "7d" | "30d";
  const kpis = await ossIntegration.getPerformanceKPIs(period);

  return createSuccessResponse(kpis, {
    resourceType: "KPIDashboard",
    period
  });
}

async function handleGetIncidents(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("severity")) filters.severity = params.get("severity");
  if (params.get("priority")) filters.priority = params.get("priority");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("assignmentGroup")) filters.assignmentGroup = params.get("assignmentGroup");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);
  if (params.get("offset")) filters.offset = parseInt(params.get("offset")!);

  const result = await ossIntegration.getIncidents(filters as any);

  return createSuccessResponse(result, {
    resourceType: "Incident"
  });
}

async function handleGetSLAMetrics(params: URLSearchParams) {
  const segment = params.get("segment");
  const slaMetrics = await ossIntegration.getSLAMetrics(segment || undefined);

  return createSuccessResponse(slaMetrics, {
    resourceType: "SLAMonitoring"
  });
}

async function handleGetInventory(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("itemType")) filters.itemType = params.get("itemType");
  if (params.get("manufacturer")) filters.manufacturer = params.get("manufacturer");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("location")) filters.location = params.get("location");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const inventory = await ossIntegration.getInventory(filters as any);

  return createSuccessResponse(inventory, {
    resourceType: "NetworkInventory"
  });
}

async function handleGetCMDBRecords(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("ciType")) filters.ciType = params.get("ciType");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("search")) filters.search = params.get("search");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const records = await ossIntegration.getCMDBRecords(filters as any);

  return createSuccessResponse(records, {
    resourceType: "CMDBRecord"
  });
}

async function handleOSSOverview() {
  // Get overview metrics from multiple OSS functions in parallel
  const [
    networkOverview,
    faults,
    kpis,
    incidents,
    slaMetrics
  ] = await Promise.all([
    ossIntegration.getNetworkOverview(),
    ossIntegration.getActiveFaults({ limit: 20 }),
    ossIntegration.getPerformanceKPIs("24h"),
    ossIntegration.getIncidents({ limit: 20 }),
    ossIntegration.getSLAMetrics()
  ]);

  const overview = {
    network: {
      totalElements: networkOverview.totalElements,
      operational: networkOverview.byStatus.OPERATIONAL || 0,
      degraded: networkOverview.byStatus.DEGRADED || 0,
      faulted: networkOverview.byStatus.FAULTED || 0,
      maintenance: networkOverview.byStatus.MAINTENANCE || 0,
      offline: networkOverview.byStatus.OFFLINE || 0,
      healthScore: networkOverview.healthSummary.healthScore,
      lastUpdate: networkOverview.healthSummary.lastUpdateTime
    },
    faults: {
      activeTotal: faults.summary?.totalActive || 0,
      acknowledged: faults.summary?.totalAcknowledged || 0,
      critical: faults.summary?.bySeverity?.CRITICAL || 0,
      major: faults.summary?.bySeverity?.MAJOR || 0,
      minor: faults.summary?.bySeverity?.MINOR || 0,
      warning: faults.summary?.bySeverity?.WARNING || 0,
      mttrTargetHours: faults.summary?.mttrTargetHours || 4,
      avgResolutionHours: faults.summary?.avgResolutionTimeHours || 4.5
    },
    performance: {
      overallHealthScore: kpis.overallHealthScore,
      networkAvailability: kpis.kpis.find(k => k.name === 'Disponibilité Réseau')?.currentValue || 99.9,
      callSetupRate: kpis.kpis.find(k => k.name === 'Taux de Réussite d\'Appel')?.currentValue || 98,
      dropCallRate: kpis.kpis.find(k => k.name === 'Taux de Coupe d\'Appel')?.currentValue || 0.5,
      dataThroughput: kpis.kpis.find(k => k.name === 'Débit Moyen Data')?.currentValue || 15,
      latency: kpis.kpis.find(k => k.name === 'Latence Moyenne')?.currentValue || 30,
      alertsCount: kpis.alerts.length,
      trends: kpis.trends
    },
    incidents: {
      totalOpen: incidents.incidents.filter(i => 
        i.status === 'NEW' || i.status === 'IN_PROGRESS' || i.status === 'PENDING'
      ).length,
      critical: incidents.incidents.filter(i => i.severity === 'CRITICAL').length,
      high: incidents.incidents.filter(i => i.severity === 'MAJOR').length,
      breachedSLA: incidents.incidents.filter(i => i.slaBreached).length,
      byAssignmentGroup: getIncidentCountsByGroup(incidents.incidents)
    },
    sla: {
      totalServices: slaMetrics.length,
      compliant: slaMetrics.filter(s => s.status === 'COMPLIANT').length,
      atRisk: slaMetrics.filter(s => s.status === 'AT_RISK').length,
      breaches: slaMetrics.filter(s => s.status === 'BREACH').length,
      totalCreditsIssued: slaMetrics.reduce((sum, s) => sum + s.creditsAmount, 0)
    },
    recentEvents: networkOverview.recentEvents.map(e => ({
      type: e.eventType,
      count: e.count,
      latestTime: e.latestTime
    })),
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(overview, {
    resourceType: "OSSOverview"
  });
}

// ============================================================
// Handler Functions - POST Endpoints
// ============================================================

async function handleCreateIncident(body: Record<string, unknown>) {
  const requiredFields = ["title", "description", "severity", "category"];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      return createErrorResponse(
        { message: `Missing required field: ${field}`, code: "MISSING_FIELD" },
        400
      );
    }
  }

  const incident = await ossIntegration.createIncident({
    title: body.title as string,
    description: body.description as string,
    severity: body.severity as any,
    priority: body.priority as any || "P3",
    category: body.category as string,
    subcategory: body.subcategory || "",
    assignmentGroup: body.assignmentGroup || "NOC-L2",
    reporter: body.reporter || "api-user",
    relatedFaults: body.relatedFaults || [],
    relatedChanges: body.relatedChanges || []
  });

  console.log(`[OSS-API] Incident created: ${incident.incidentId}`);

  return createSuccessResponse(incident, {
    resourceType: "Incident",
    action: "created"
  });
}

async function handleAcknowledgeFault(body: Record<string, unknown>) {
  const { faultId, userId, notes } = body;

  if (!faultId || !userId) {
    return createErrorResponse(
      { message: "faultId and userId are required", code: "MISSING_PARAMETERS" },
      400
    );
  }

  const fault = await ossIntegration.acknowledgeFault(
    faultId as string,
    userId as string,
    notes as string
  );

  return createSuccessResponse(fault, {
    resourceType: "Fault",
    action: "acknowledged"
  });
}

async function handleActivateService(body: Record<string, unknown>) {
  const requiredFields = ["serviceType", "subscriberIdentifier", "action"];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      return createErrorResponse(
        { message: `Missing required field: ${field}`, code: "MISSING_FIELD" },
        400
      );
    }
  }

  const serviceRequest = await ossIntegration.activateService({
    serviceType: body.serviceType as any,
    subscriberIdentifier: body.subscriberIdentifier as string,
    action: body.action as any,
    parameters: body.parameters || {},
    priority: body.priority as any || "NORMAL",
    requestedBy: body.requestedBy || "api-user"
  });

  return createSuccessResponse(serviceRequest, {
    resourceType: "ServiceActivationRequest",
    action: "created"
  });
}

// ============================================================
// Utility Functions
// ============================================================

function getIncidentCountsByGroup(incidents: Array<{ assignmentGroup?: string }>): Array<{ group: string; count: number }> {
  const groupCounts = new Map<string, number>();
  
  for (const inc of incidents) {
    if (inc.assignmentGroup) {
      groupCounts.set(inc.assignmentGroup, (groupCounts.get(inc.assignmentGroup) || 0) + 1);
    }
  }

  return Array.from(groupCounts.entries())
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
