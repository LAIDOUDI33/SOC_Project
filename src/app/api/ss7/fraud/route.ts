/**
 * SS7 Fraud Detection API
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Endpoints:
 * GET /api/ss7/fraud/alerts - Active fraud alerts
 * GET /api/ss7/fraud/statistics - Fraud stats by type
 * POST /api/ss7/fraud/rules - Create/update detection rule
 * POST /api/ss7/fraud/block - Block suspicious subscriber
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFraudDetector, FraudType, AlertStatus } from '@/lib/ss7/fraud-detector';

// Generate sample fraud alerts
function generateFraudAlerts(status?: string, type?: string) {
  const now = new Date();
  const alertTypes = Object.values(FraudType);
  const statuses = [AlertStatus.NEW, AlertStatus.INVESTIGATING, AlertStatus.CONFIRMED, AlertStatus.BLOCKED];
  
  const alerts: any[] = [];
  for (let i = 0; i < 15; i++) {
    const alertType = type ? type : alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const alertStatus = status ? status : statuses[Math.floor(Math.random() * statuses.length)];
    
    alerts.push({
      id: `fraud_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
      type: alertType,
      severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
      status: alertStatus,
      confidence: Math.floor(Math.random() * 40) + 60,
      subscriber: {
        msisdn: `+213${['55', '66', '77'][Math.floor(Math.random() * 3)]}${String(Math.floor(Math.random() * 9000000) + 1000000).padStart(7, '0')}`,
        imsi: `60301${String(Math.floor(Math.random() * 99999999999)).padStart(11, '0')}`,
        maskedMSISDN: '+213*****' + String(Math.floor(Math.random() * 90) + 10).padStart(2, '0'),
        maskedIMSI: '60301********',
      },
      indicators: [
        `${alertType}_suspicious_pattern`,
        `${alertType}_high_volume`,
        ...(Math.random() > 0.5 ? [`${alertType}_anomaly_detected`] : []),
      ],
      financialImpact: {
        estimatedLossDZD: Math.floor(Math.random() * 300000) + 5000,
        currency: 'DZD',
        calculationBasis: 'Estimated based on pattern analysis',
      },
      ruleId: `${alertType}-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
      ruleName: getRuleName(alertType),
      source: 'ss7-fraud-detector',
      artpReportable: ['IRSF', 'SIM_SWAP', 'BYPASS_FRAUD', 'ROAMING_ANOMALY'].includes(alertType),
    });
  }
  
  // Apply filters
  let filtered = alerts;
  if (status) filtered = filtered.filter(a => a.status === status);
  if (type) filtered = filtered.filter(a => a.type === type);
  
  // Sort by timestamp descending
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function getRuleName(type: string): string {
  const names: Record<string, string> = {
    [FraudType.IRSF]: [
      'High Volume International Calls to Premium Destinations',
      'IRSF Pattern - Exactly 60 Second Calls',
      'International Revenue Share Fraud Detection'
    ][Math.floor(Math.random() * 3)],
    [FraudType.SIM_SWAP]: [
      'Multiple SIM Provisioning Attempts',
      'Authentication Failure Burst After SIM Change',
      'Location Update During Active Call'
    ][Math.floor(Math.random() * 3)],
    [FraudType.WANGIRI]: [
      'One-Ring Call Pattern Detection',
      'Short Duration Calls Pattern'
    ][Math.floor(Math.random() * 2)],
    [FraudType.BYPASS_FRAUD]: [
      'GSM Gateway / Simbox Detection',
      'Simbox Traffic Pattern Analysis'
    ][Math.floor(Math.random() * 2)],
    [FraudType.PREMIUM_RATE_ABUSE]: 'Premium Rate Service Abuse Detection',
    [FraudType.ROAMING_ANOMALY]: [
      'Impossible Roaming Speed Detection',
      'Excessive Country Hopping Detection'
    ][Math.floor(Math.random() * 2)],
    [FraudType.INTERCEPTION]: 'Suspicious Interception Activity',
    [FraudType.CLONING]: 'IMEI Cloning Detection',
    [FraudType.SUBSCRIPTION_FRAUD]: 'Subscription Fraud Detection',
    [FraudType.TRAFFIC_PUMPING]: 'Traffic Pumping Detection',
  };
  
  return names[type] || 'Unknown Rule';
}

// Generate fraud statistics
function generateFraudStatistics(type?: string) {
  const baseStats: any = {
    totalAlerts: Math.floor(Math.random() * 200) + 50,
    alertsByStatus: {
      [AlertStatus.NEW]: Math.floor(Math.random() * 30) + 10,
      [AlertStatus.INVESTIGATING]: Math.floor(Math.random() * 20) + 5,
      [AlertStatus.CONFIRMED]: Math.floor(Math.random() * 15) + 3,
      [AlertStatus.BLOCKED]: Math.floor(Math.random() * 25) + 10,
      [AlertStatus.RESOLVED]: Math.floor(Math.random() * 40) + 15,
    },
    alertsBySeverity: {
      critical: Math.floor(Math.random() * 10) + 2,
      high: Math.floor(Math.random() * 30) + 15,
      medium: Math.floor(Math.random() * 50) + 25,
      low: Math.floor(Math.random() * 40) + 20,
    },
    totalEstimatedLossDZD: Math.floor(Math.random() * 5000000) + 500000,
    blockedSubscribers: Math.floor(Math.random() * 50) + 10,
    topFraudTypes: [],
    recentAlerts: generateFraudAlerts().slice(0, 10),
  };
  
  // Generate fraud type breakdown
  const fraudTypes = Object.values(FraudType);
  baseStats.topFraudTypes = fraudTypes.map(ft => ({
    type: ft,
    count: Math.floor(Math.random() * 80) + 5,
  })).sort((a, b) => b.count - a.count).slice(0, 8);
  
  // Filter by type if specified
  if (type) {
    baseStats.totalAlerts = baseStats.topFraudTypes.find(t => t.type === type)?.count || 0;
  }
  
  // Calculate time-based stats
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    alerts: Math.floor(Math.random() * 20) + (i >= 9 && i <= 18 ? 15 : 0), // More during business hours
    blocked: Math.floor(Math.random() * 5),
    resolved: Math.floor(Math.random() * 8),
  }));
  
  return {
    ...baseStats,
    periodStart: new Date(Date.now() - 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    hourlyBreakdown: hourlyData,
  };
}

// Get configured rules
function getConfiguredRules() {
  return [
    {
      id: 'irsf-001',
      name: 'High Volume International Calls to Premium Destinations',
      type: FraudType.IRSF,
      enabled: true,
      severity: 'critical',
      threshold: {
        internationalCallsPerHour: 10,
        uniqueInternationalDestinations: 5,
        averageCallDurationSeconds: 60,
        premiumRateTargetPercentage: 30,
      },
      action: ['block_subscriber', 'notify_arpt'],
      cooldownMinutes: 60,
      artpReportable: true,
    },
    {
      id: 'simswap-001',
      name: 'Multiple SIM Provisioning Attempts',
      type: FraudType.SIM_SWAP,
      enabled: true,
      severity: 'critical',
      threshold: {
        provisioningAttemptsPerHour: 3,
      },
      action: ['suspend_sim', 'alert_analyst'],
      cooldownMinutes: 30,
      artpReportable: true,
    },
    {
      id: 'wangiri-001',
      name: 'One-Ring Call Pattern Detection',
      type: FraudType.WANGIRI,
      enabled: true,
      severity: 'medium',
      threshold: {
        shortDurationCallsPerHour: 20,
        maxWangiriDurationSeconds: 5,
      },
      action: ['alert_analyst', 'add_watchlist'],
      cooldownMinutes: 240,
      artpReportable: false,
    },
    {
      id: 'roaming-001',
      name: 'Impossible Roaming Speed Detection',
      type: FraudType.ROAMING_ANOMALY,
      enabled: true,
      severity: 'critical',
      threshold: {
        impossibleDistanceKm: 800,
        timeBetweenLocationsHours: 1,
      },
      action: ['block_subscriber', 'alert_analyst'],
      cooldownMinutes: 60,
      artpReportable: true,
    },
  ];
}

// GET handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'alerts':
        return handleGetAlerts(searchParams);
        
      case 'statistics':
        return handleGetStatistics(searchParams);
        
      case 'rules':
        return handleGetRules();
        
      default:
        return handleGetDashboard(searchParams);
    }
  } catch (error) {
    console.error('SS7 Fraud API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'rules':
        return handleUpdateRule(body);
        
      case 'block':
        return handleBlockSubscriber(body);
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('SS7 Fraud POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetAlerts(searchParams: URLSearchParams) {
  const status = searchParams.get('status') ?? undefined;
  const type = searchParams.get('type') ?? undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const alerts = generateFraudAlerts(status, type).slice(0, limit);
  
  return NextResponse.json({
    success: true,
    data: {
      alerts,
      totalCount: alerts.length,
      filters: { status, type, limit },
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleGetStatistics(searchParams: URLSearchParams) {
  const type = searchParams.get('type') ?? undefined;
  const period = searchParams.get('period') || '24h';
  
  const stats = generateFraudStatistics(type);
  
  return NextResponse.json({
    success: true,
    data: {
      ...stats,
      period,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleGetRules() {
  const rules = getConfiguredRules();
  
  return NextResponse.json({
    success: true,
    data: {
      rules,
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleGetDashboard(searchParams: URLSearchParams) {
  const alerts = generateFraudAlerts();
  const stats = generateFraudStatistics();
  const rules = getConfiguredRules();
  
  return NextResponse.json({
    success: true,
    data: {
      summary: {
        activeAlerts: alerts.filter(a => 
          a.status === AlertStatus.NEW || a.status === AlertStatus.INVESTIGATING
        ).length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        blockedToday: stats.blockedSubscribers,
        estimatedLoss: stats.totalEstimatedLossDZD,
      },
      recentAlerts: alerts.slice(0, 10),
      statistics: stats,
      rules: rules.filter(r => r.enabled),
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleUpdateRule(body: any) {
  const { ruleId, updates } = body;
  
  if (!ruleId) {
    return NextResponse.json(
      { success: false, error: 'ruleId is required' },
      { status: 400 }
    );
  }
  
  // Simulate rule update
  return NextResponse.json({
    success: true,
    message: `Rule ${ruleId} updated successfully`,
    data: {
      ruleId,
      updatedFields: Object.keys(updates || {}),
      updatedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleBlockSubscriber(body: any) {
  const { alertId, reason, subscriberId } = body;
  
  if (!alertId && !subscriberId) {
    return NextResponse.json(
      { success: false, error: 'alertId or subscriberId is required' },
      { status: 400 }
    );
  }
  
  // Simulate blocking operation
  return NextResponse.json({
    success: true,
    message: 'Subscriber blocked successfully',
    data: {
      blockId: `blk_${Date.now()}`,
      alertId: alertId || null,
      subscriberId: subscriberId || null,
      reason: reason || 'Fraud activity detected',
      blockedAt: new Date().toISOString(),
      blockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      notifiedSystems: ['HLR', 'MSC', 'SMSC', 'GMLC'],
    },
    timestamp: new Date().toISOString(),
  });
}
