// ============================================================
// National SOC Platform - MSSP Customer Portal API
// Multi-tenant customer views and self-service capabilities
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// Types
interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: 'basic' | 'professional' | 'enterprise' | 'custom';
  is_active: boolean;
  settings: any;
}

interface CustomerUser {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: 'tenant_admin' | 'analyst' | 'viewer';
  last_login?: Date;
}

interface CustomerDashboard {
  // Security metrics (tenant-scoped)
  total_alerts: number;
  critical_alerts: number;
  resolved_today: number;
  mttr_hours: number; // Mean time to resolution
  
  // Incident metrics
  active_incidents: number;
  open_critical: number;
  avg_resolution_time: number;
  
  // Compliance metrics
  compliance_score: number;
  open_findings: number;
  remediated_this_month: number;
  
  // SLA metrics
  sla_compliance_rate: number;
  sla_breaches_this_month: number;
  
  // Timeline data
  alerts_trend_24h: Array<{ hour: string; count: number }>;
  incidents_by_severity: Record<string, number>;
  
  // Recent activity
  recent_alerts: any[];
  recent_incidents: any[];
  open_tickets: any[];
}

// GET /api/mssp - Customer portal data
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'dashboard':
        return getCustomerDashboard(auth.userId!, auth.tenantId!);
      case 'alerts':
        return getCustomerAlerts(auth.tenantId!, searchParams);
      case 'incidents':
        return getCustomerIncidents(auth.tenantId!, searchParams);
      case 'tickets':
        return getCustomerTickets(auth.tenantId!, searchParams);
      case 'reports':
        return getAvailableReports(auth.tenantId!);
      case 'sla':
        return getSLAMetrics(auth.tenantId!);
      case 'users':
        return getTenantUsers(auth.tenantId!);
      default:
        return getPortalInfo(auth.tenantId!);
    }
  } catch (error) {
    console.error('MSSP Portal API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mssp - Customer actions
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create-ticket':
        return createSupportTicket(data, auth.userId!, auth.tenantId!);
      case 'acknowledge-alert':
        return acknowledgeAlert(data, auth.userId!, auth.tenantId!);
      case 'request-report':
        return requestReport(data, auth.userId!, auth.tenantId!);
      case 'update-settings':
        return updateTenantSettings(data, auth.userId!, auth.tenantId!);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MSSP Portal POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Implementation functions
async function getPortalInfo(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          users: true,
          alerts: true,
          incidents: true,
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan_type: tenant.planType,
      logo_url: tenant.settings?.logo_url,
      primary_color: tenant.settings?.primary_color,
      support_email: tenant.settings?.support_email,
      support_phone: tenant.settings?.support_phone,
    },
    stats: {
      users: tenant._count.users,
      alerts: tenant._count.alerts,
      incidents: tenant._count.incidents,
    },
    features: getFeaturesForPlan(tenant.planType),
  });
}

async function getCustomerDashboard(userId: string, tenantId: string): Promise<NextResponse> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all metrics in parallel
  const [
    alertMetrics,
    incidentMetrics,
    complianceData,
    slaData,
    recentAlerts,
    recentIncidents,
    openTickets,
    alertsTrend,
  ] = await Promise.all([
    // Alert metrics
    db.alert.aggregate({
      where: {
        tenant_id: tenantId,
        created_at: { gte: todayStart },
      },
      _count: true,
      _sum: { severity: true },
    }),

    // Incident metrics
    db.incident.findMany({
      where: {
        tenant_id: tenantId,
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
      select: { id: true, severity: true, created_at: true },
      take: 100,
    }),

    // Compliance score
    db.complianceAssessment.findFirst({
      where: {
        tenant_id: tenantId,
        created_at: { gte: monthStart },
      },
      orderBy: { created_at: 'desc' },
    }),

    // SLA data
    db.slaMetric.findMany({
      where: {
        tenant_id: tenantId,
        period_start: { gte: monthStart },
      },
    }),

    // Recent alerts (last 10)
    db.alert.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        source: true,
        created_at: true,
      },
    }),

    // Recent incidents (last 5)
    db.incident.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        created_at: true,
      },
    }),

    // Open tickets
    db.supportTicket.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['open', 'in_progress', 'pending'] },
      },
      orderBy: { priority: 'desc', created_at: 'asc' },
      take: 5,
    }),

    // Alerts trend (last 24 hours by hour)
    db.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*) as count
      FROM alerts
      WHERE 
        tenant_id = ${tenantId}
        AND created_at >= ${yesterdayStart}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `,
  ]);

  // Calculate derived metrics
  const totalAlerts = alertMetrics._count || 0;
  const criticalAlerts = incidentMetrics.filter(i => i.severity === 'CRITICAL').length;
  const activeIncidents = incidentMetrics.length;

  // Calculate MTTR (Mean Time To Resolution) for this month
  const resolvedIncidents = await db.incident.findMany({
    where: {
      tenant_id: tenantId,
      status: 'CLOSED',
      resolvedAt: { gte: monthStart },
    },
    select: { createdAt: true, resolvedAt: true },
  });

  const avgResolutionTime = resolvedIncidents.length > 0
    ? resolvedIncidents.reduce((sum, inc) => {
        const hours = inc.resolvedAt && inc.createdAt
          ? (inc.resolvedAt.getTime() - inc.createdAt.getTime()) / (1000 * 60 * 60)
          : 0;
        return sum + hours;
      }, 0) / resolvedIncidents.length
    : 0;

  // SLA compliance rate
  const slaBreaches = slaData.filter(s => !s.met_sla).length;
  const totalSLAMetrics = slaData.length;
  const slaComplianceRate = totalSLAMetrics > 0 ? ((totalSLAMetrics - slaBreaches) / totalSLAMetrics) * 100 : 100;

  // Incidents by severity
  const incidentsBySeverity = incidentMetrics.reduce((acc, inc) => {
    acc[inc.severity] = (acc[inc.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dashboard: CustomerDashboard = {
    total_alerts: totalAlerts,
    critical_alerts: criticalAlerts,
    resolved_today: 0, // Would calculate from today's resolutions
    mttr_hours: Math.round(avgResolutionTime * 10) / 10,
    
    active_incidents: activeIncidents,
    open_critical: criticalAlerts,
    avg_resolution_time: Math.round(avgResolutionTime * 10) / 10,
    
    compliance_score: complianceData?.overallScore || 85,
    open_findings: 12, // Would calculate from findings
    remediated_this_month: 8,
    
    sla_compliance_rate: Math.round(slaComplianceRate * 10) / 10,
    sla_breaches_this_month: slaBreaches,
    
    alerts_trend_24h: (alertsTrend as any[]).map(row => ({
      hour: `${String(row.hour).padStart(2, '0')}:00`,
      count: Number(row.count),
    })),
    incidents_by_severity: incidentsBySeverity,
    
    recent_alerts: recentAlerts,
    recent_incidents: recentIncidents,
    open_tickets: openTickets,
  };

  return NextResponse.json(dashboard);
}

async function getCustomerAlerts(tenantId: string, params: URLSearchParams) {
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');
  const severity = params.get('severity');
  const status = params.get('status');
  const search = params.get('search');

  const whereClause: any = { tenant_id: tenantId };
  
  if (severity) whereClause.severity = severity;
  if (status) whereClause.status = status;
  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [alerts, total] = await Promise.all([
    db.alert.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    db.alert.count({ where: whereClause }),
  ]);

  return NextResponse_json({
    data: alerts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getCustomerIncidents(tenantId: string, params: URLSearchParams) {
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');
  const status = params.get('status');

  const whereClause: any = { tenant_id: tenantId };
  if (status) whereClause.status = status;

  const [incidents, total] = await Promise.all([
    db.incident.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { alerts: true, updates: true } },
      },
    }),
    db.incident.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: incidents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getCustomerTickets(tenantId: string, params: URLSearchParams) {
  const tickets = await db.supportTicket.findMany({
    where: { tenant_id: tenantId },
    orderBy: { priority: 'desc', updated_at: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: tickets });
}

async function getAvailableReports(tenantId: string) {
  const reports = await db.report.findMany({
    where: {
      tenant_id: tenantId,
      OR: [
        { is_template: true },
        { generated_for: tenantId },
      ],
    },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      is_template: true,
      last_generated: true,
    },
    orderBy: [{ is_template: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ data: reports });
}

async function getSLAMetrics(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const slaMetrics = await db.slaMetric.findMany({
    where: {
      tenant_id: tenantId,
      period_start: { gte: monthStart },
    },
    orderBy: { period_start: 'desc' },
  });

  // Calculate overall SLA compliance
  const metSLA = slaMetrics.filter(m => m.metSla).length;
  const totalSLA = slaMetrics.length;
  const complianceRate = totalSLA > 0 ? (metSLA / totalSLA) * 100 : 100;

  return NextResponse.json({
    overall_compliance_rate: Math.round(complianceRate * 10) / 10,
    total_metrics: totalSLA,
    met_sla: metSLA,
    breached: totalSLA - metSLA,
    metrics: slaMetrics.map(m => ({
      metric_name: m.metricName,
      target_value: m.targetValue,
      actual_value: m.actualValue,
      met_sla: m.metSla,
      period_start: m.periodStart,
      period_end: m.periodEnd,
    })),
  });
}

async function getTenantUsers(tenantId: string) {
  const users = await db.user.findMany({
    where: { tenant_id: tenantId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      last_login: true,
      created_at: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: users });
}

async function createSupportTicket(data: any, userId: string, tenantId: string) {
  const { subject, description, priority, category } = data;

  if (!subject || !description) {
    return NextResponse.json(
      { error: 'Subject and description are required' },
      { status: 400 }
    );
  }

  const ticket = await db.supportTicket.create({
    data: {
      subject,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      tenant_id: tenantId,
      created_by: userId,
      status: 'open',
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}

async function acknowledgeAlert(data: any, userId: string, tenantId: string) {
  const { alert_id, note } = data;

  if (!alert_id) {
    return NextResponse.json({ error: 'alert_id is required' }, { status: 400 });
  }

  // Verify alert belongs to tenant
  const alert = await db.alert.findFirst({
    where: { id: alert_id, tenant_id: tenantId },
  });

  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  // Update alert status
  const updated = await db.alert.update({
    where: { id: alert_id },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledged_by: userId,
      acknowledged_at: new Date(),
    },
  });

  // Create timeline entry if note provided
  if (note) {
    await db.incidentUpdate.create({
      data: {
        incident_id: alert.incident_id || '',
        user_id: userId,
        message: `Acknowledged via portal: ${note}`,
      },
    });
  }

  return NextResponse.json(updated);
}

async function requestReport(data: any, userId: string, tenantId: string) {
  const { report_id, parameters, format } = data;

  if (!report_id) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
  }

  // Create report generation job
  const job = await db.reportJob.create({
    data: {
      report_id,
      requested_by: userId,
      tenant_id: tenantId,
      parameters: parameters || {},
      format: format || 'pdf',
      status: 'queued',
    },
  });

  return NextResponse.json(job, { status: 201 });
}

async function updateTenantSettings(data: any, userId: string, tenantId: string) {
  // Only tenant_admin can update settings
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.role !== 'tenant_admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { notifications, branding, integrations } = data;

  const currentTenant = await db.tenant.findUnique({ where: { id: tenantId } });
  const currentSettings = currentTenant?.settings || {};

  const updatedSettings = {
    ...currentSettings,
    notifications: { ...currentSettings.notifications, ...notifications },
    branding: { ...currentSettings.branding, ...branding },
    integrations: { ...currentSettings.integrations, ...integrations },
  };

  const updated = await db.tenant.update({
    where: { id: tenantId },
    data: { settings: updatedSettings },
  });

  return NextResponse.json(updated);
}

// Helper functions
function getFeaturesForPlan(plan: string): string[] {
  const features: Record<string, string[]> = {
    basic: [
      'Security Dashboard',
      'Alert Viewing',
      'Basic Reports',
      'Email Support',
    ],
    professional: [
      'Everything in Basic',
      'Incident Management',
      'Threat Intelligence',
      'Custom Reports',
      'API Access',
      'Priority Support',
    ],
    enterprise: [
      'Everything in Professional',
      'Advanced Analytics',
      'MSSP Portal',
      'White-label Options',
      'Dedicated Support',
      'Custom Integrations',
      'SLA Guarantees',
    ],
    custom: [
      'Enterprise Features',
      'Custom Development',
      'On-premise Option',
      'Training Included',
    ],
  };

  return features[plan] || features['basic'];
}
