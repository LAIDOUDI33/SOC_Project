/**
 * National SOC Platform - BSS (Business Support Systems) API
 * 
 * REST API endpoints for Business Support Systems integration:
 * - GET /api/telecom/bss/subscribers/:msisdn - Get subscriber info
 * - GET /api/telecom/bss/billing/cdrs - Query CDRs
 * - POST /api/telecom/bss/fraud/report - Report fraud incident
 * - GET /api/telecom/bss/revenue/assurance - Revenue assurance metrics
 * 
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  bssIntegration,
  formatMSISDN,
  validateMSISDN,
  BSSIntegrationError,
  RateLimitExceededError
} from "@/lib/telecom/bss-integration";

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
  console.error("[BSS-API] Error:", error);
  
  if (error instanceof BSSIntegrationError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    }, { status: error.statusCode });
  }
  
  if (error instanceof RateLimitExceededError) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: "RATE_LIMITED",
      retryAfter: 60,
      timestamp: new Date().toISOString()
    }, { status: 429 });
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
      case "subscriber":
        return await handleGetSubscriber(searchParams);
      
      case "cdrs":
        return await handleQueryCDRs(searchParams);
      
      case "revenue":
        return await handleGetRevenueAssurance(searchParams);
      
      case "orders":
        return await handleGetOrders(searchParams);
      
      case "catalog":
        return await handleGetProductCatalog(searchParams);
      
      case "crm":
        return await handleGetCRMEvents(searchParams);
      
      case "compliance":
        return await handleGetComplianceStatus();
      
      case "correlations":
        return await handleGetFraudCorrelations(searchParams);
      
      case "overview":
        return await handleBSSOverview();
      
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
      case "fraud_report":
        return await handleReportFraud(body);
      
      case "create_order":
        return await handleCreateOrder(body);
      
      case "crm_event":
        return await handleCreateCRMEvent(body);
      
      case "consent_update":
        return await handleUpdateConsent(body);
      
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
// Handler Functions
// ============================================================

async function handleGetSubscriber(params: URLSearchParams) {
  const msisdn = params.get("msisdn");
  
  if (!msisdn) {
    return createErrorResponse(
      { message: "MSISDN parameter is required", code: "MISSING_PARAMETER" },
      400
    );
  }

  const includeBilling = params.get("includeBilling") === "true";
  const subscriber = await bssIntegration.getSubscriber(msisdn, { includeBilling });

  return createSuccessResponse(subscriber, {
    resourceType: "Subscriber",
    resourceId: formatMSISDN(msisdn)
  });
}

async function handleQueryCDRs(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("msisdn")) filters.msisdn = params.get("msisdn");
  if (params.get("recordType")) {
    filters.recordType = params.getAll("recordType") as any[];
  }
  if (params.get("startDate")) filters.startDate = new Date(params.get("startDate")!);
  if (params.get("endDate")) filters.endDate = new Date(params.get("endDate")!);
  if (params.get("isRoaming")) filters.isRoaming = params.get("isRoaming") === "true";
  if (params.get("isInternational")) filters.isInternational = params.get("isInternational") === "true";
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);
  if (params.get("offset")) filters.offset = parseInt(params.get("offset")!);

  const result = await bssIntegration.queryCDRs(filters as any);

  return createSuccessResponse(result, {
    resourceType: "CDR",
    queryFilters: filters
  });
}

async function handleGetRevenueAssurance(params: URLSearchParams) {
  const period = (params.get("period") || "24h") as "24h" | "7d" | "30d" | "90d";
  const metrics = await bssIntegration.getRevenueAssuranceMetrics(period);

  return createSuccessResponse(metrics, {
    resourceType: "RevenueAssurance",
    period
  });
}

async function handleGetOrders(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("msisdn")) filters.msisdn = params.get("msisdn");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("type")) filters.type = params.get("type");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const result = await bssIntegration.getOrders(filters as any);

  return createSuccessResponse(result, {
    resourceType: "Order"
  });
}

async function handleGetProductCatalog(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("type")) filters.type = params.get("type");
  if (params.get("segment")) filters.segment = params.get("segment");
  filters.activeOnly = params.get("activeOnly") !== "false";

  const products = await bssIntegration.getProductCatalog(filters as any);

  return createSuccessResponse(products, {
    resourceType: "ProductCatalog"
  });
}

async function handleGetCRMEvents(params: URLSearchParams) {
  const msisdn = params.get("msisdn");
  
  if (!msisdn) {
    return createErrorResponse(
      { message: "MSISDN parameter is required", code: "MISSING_PARAMETER" },
      400
    );
  }

  const filters: Record<string, unknown> = { msisdn };
  if (params.get("eventType")) filters.eventType = params.get("eventType");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const events = await bssIntegration.getCRMEvents(msisdn, filters as any);

  return createSuccessResponse(events, {
    resourceType: "CRMEvent"
  });
}

async function handleGetComplianceStatus() {
  const compliance = await bssIntegration.getComplianceReport();

  return createSuccessResponse(compliance, {
    resourceType: "ComplianceReport"
  });
}

async function handleGetFraudCorrelations(params: URLSearchParams) {
  const filters: Record<string, unknown> = {};
  
  if (params.get("msisdn")) filters.msisdn = params.get("msisdn");
  if (params.get("correlationType")) filters.correlationType = params.get("correlationType");
  if (params.get("status")) filters.status = params.get("status");
  if (params.get("limit")) filters.limit = parseInt(params.get("limit")!);

  const correlations = await bssIntegration.getFraudBillingCorrelations(filters as any);

  return createSuccessResponse(correlations, {
    resourceType: "FraudCorrelation"
  });
}

async function handleBSSOverview() {
  // Get overview metrics from multiple BSS functions in parallel
  const [
    revenueMetrics,
    recentCorrelations,
    orderStats
  ] = await Promise.all([
    bssIntegration.getRevenueAssuranceMetrics("24h"),
    bssIntegration.getFraudBillingCorrelations({ limit: 10 }),
    bssIntegration.getOrders({ limit: 0 })
  ]);

  const overview = {
    revenue: {
      totalRevenue24h: revenueMetrics.totalRevenue,
      expectedRevenue: revenueMetrics.expectedRevenue,
      leakageAmount: revenueMetrics.revenueLeakage,
      leakagePercentage: revenueMetrics.leakagePercentage.toFixed(2),
      fraudImpact: revenueMetrics.fraudImpact.detectedFraudAmount,
      recoveredAmount: revenueMetrics.fraudImpact.recoveredAmount
    },
    fraud: {
      activeCorrelations: recentCorrelations.length,
      criticalAlerts: recentCorrelations.filter(c => c.severity === 'CRITICAL').length,
      highRiskAlerts: recentCorrelations.filter(c => c.severity === 'HIGH').length,
      topTypes: getTopFraudTypes(recentCorrelations)
    },
    orders: {
      totalToday: orderStats.total,
      pending: orderStats.orders.filter(o => o.status === 'PENDING').length,
      completed: orderStats.orders.filter(o => o.status === 'COMPLETED').length,
      failed: orderStats.orders.filter(o => o.status === 'FAILED').length
    },
    compliance: {
      anorCompliant: revenueMetrics.complianceStatus.anorCompliant,
      arptCompliant: revenueMetrics.complianceStatus.arptCompliant,
      pendingReports: revenueMetrics.complianceStatus.pendingReports
    },
    timestamp: new Date().toISOString()
  };

  return createSuccessResponse(overview, {
    resourceType: "BSSOverview"
  });
}

async function handleReportFraud(body: Record<string, unknown>) {
  const requiredFields = ["fraudType", "msisdn", "description"];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      return createErrorResponse(
        { message: `Missing required field: ${field}`, code: "MISSING_FIELD" },
        400
      );
    }
  }

  // Validate MSISDN
  const msisdnValidation = validateMSISDN(body.msisdn as string);
  if (!msisdnValidation.valid) {
    return createErrorResponse(msisdnValidation.error!, "INVALID_MSISDN", 400);
  }

  const fraudReport = {
    reportId: `FRD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    fraudType: body.fraudType,
    msisdn: formatMSISDN(body.msisdn as string),
    description: body.description,
    estimatedLoss: body.estimatedLoss || 0,
    evidence: body.evidence || [],
    reportedBy: body.reportedBy || "system",
    reportedAt: new Date(),
    priority: body.priority || "MEDIUM",
    status: "OPEN"
  };

  // Log the fraud report
  console.log(`[BSS-API] Fraud reported: ${fraudReport.reportId} - ${body.fraudType}`);

  return createSuccessResponse(fraudReport, {
    resourceType: "FraudReport",
    action: "created"
  });
}

async function handleCreateOrder(body: Record<string, unknown>) {
  const requiredFields = ["orderType", "msisdn", "customerName"];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      return createErrorResponse(
        { message: `Missing required field: ${field}`, code: "MISSING_FIELD" },
        400
      );
    }
  }

  // Validate MSISDN
  const msisdnValidation = validateMSISDN(body.msisdn as string);
  if (!msisdnValidation.valid) {
    return createErrorResponse(msisdnValidation.error!, "INVALID_MSISDN", 400);
  }

  const order = await bssIntegration.createOrder({
    orderType: body.orderType as any,
    msisdn: formatMSISDN(body.msisdn as string),
    customerName: body.customerName as string,
    value: body.value || 0,
    channel: body.channel || "ONLINE",
    items: body.items || []
  });

  return createSuccessResponse(order, {
    resourceType: "Order",
    action: "created"
  });
}

async function handleCreateCRMEvent(body: Record<string, unknown>) {
  const requiredFields = ["eventType", "msisdn"];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      return createErrorResponse(
        { message: `Missing required field: ${field}`, code: "MISSING_FIELD" },
        400
      );
    }
  }

  // Validate MSISDN
  const msisdnValidation = validateMSISDN(body.msisdn as string);
  if (!msisdnValidation.valid) {
    return createErrorResponse(msisdnValidation.error!, "INVALID_MSISDN", 400);
  }

  const event = await bssIntegration.createCRMEvent({
    eventType: body.eventType as any,
    msisdn: formatMSISDN(body.msisdn as string),
    channel: body.channel || "API",
    summary: body.summary || "",
    priority: body.priority || "MEDIUM",
    agentId: body.agentId
  });

  return createSuccessResponse(event, {
    resourceType: "CRMEvent",
    action: "created"
  });
}

async function handleUpdateConsent(body: Record<string, unknown>) {
  const { msisdn, updates, userId } = body;

  if (!msisdn || !userId) {
    return createErrorResponse(
      { message: "msisdn and userId are required", code: "MISSING_PARAMETERS" },
      400
    );
  }

  // Validate MSISDN
  const msisdnValidation = validateMSISDN(msisdn as string);
  if (!msisdnValidation.valid) {
    return createErrorResponse(msisdnValidation.error!, "INVALID_MSISDN", 400);
  }

  const consentFlags = await bssIntegration.updateSubscriberConsent(
    msisdn as string,
    updates as any,
    userId as string
  );

  return createSuccessResponse(consentFlags, {
    resourceType: "ConsentFlags",
    action: "updated"
  });
}

// ============================================================
// Utility Functions
// ============================================================

function getTopFraudTypes(correlations: Array<{ correlationType: string; count?: number }>): Array<{ type: string; count: number }> {
  const typeCounts = new Map<string, number>();
  
  for (const corr of correlations) {
    typeCounts.set(corr.correlationType, (typeCounts.get(corr.correlationType) || 0) + 1);
  }

  return Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
