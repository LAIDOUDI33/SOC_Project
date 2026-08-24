// ============================================================
// National SOC Platform - Attack Surface Management Module
// Comprehensive attack surface discovery, monitoring, and management
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { auditLog } from '@/lib/security/audit-logger';

// Types
interface AttackSurfaceAsset {
  id: string;
  name: string;
  type: 'domain' | 'ip' | 'url' | 'service' | 'cloud_resource' | 'api_endpoint';
  value: string;
  status: 'active' | 'inactive' | 'retired' | 'unknown';
  risk_score: number;
  exposure_level: 'critical' | 'high' | 'medium' | 'low' | 'internal';
  ip_address?: string;
  ports?: number[];
  environment: 'production' | 'staging' | 'development' | 'test';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  is_monitored: boolean;
  last_scanned?: Date;
  tags?: string[];
  first_seen: Date;
  last_updated: Date;
  created_by: string;
}

// Helper functions
function calculateRiskScore(asset: Partial<AttackSurfaceAsset>): number {
  let score = 0;
  
  const exposureScores = { critical: 40, high: 30, medium: 20, low: 10, internal: 5 };
  score += exposureScores[asset.exposure_level || 'medium'] || 0;
  
  const envMultipliers = { production: 1.5, staging: 1.2, development: 1.0, test: 0.8 };
  score *= envMultipliers[asset.environment || 'development'];
  
  if (asset.classification === 'public') score *= 1.3;
  
  return Math.min(100, Math.round(score));
}

function determineExposureLevel(riskScore: number): AttackSurfaceAsset['exposure_level'] {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'medium';
  if (riskScore >= 20) return 'low';
  return 'internal';
}

async function discoverAssets(target: string) {
  // Simulated discovery - would integrate with scanners in production
  return [
    {
      type: 'domain',
      value: target,
      name: `Primary Domain: ${target}`,
      status: 'active',
      environment: 'production',
      classification: 'public',
    },
    {
      type: 'url',
      value: `https://www.${target}`,
      name: `Main Website`,
      status: 'active',
      environment: 'production',
      classification: 'public',
      ports: [443],
    },
    {
      type: 'ip',
      value: '203.0.113.50',
      name: `Web Server IP`,
      status: 'active',
      ports: [22, 80, 443],
      environment: 'production',
      classification: 'public',
    },
  ];
}

// GET handler
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
        return getDashboardMetrics();
      case 'exposure':
        return getExposureSummary();
      default:
        return listAssets(searchParams);
    }
  } catch (error) {
    console.error('Attack Surface API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'discover':
        return runDiscovery(data);
      default:
        return createAsset(data, auth.userId!);
    }
  } catch (error) {
    console.error('Attack Surface POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const existing = await db.attackSurfaceAsset.findUnique({ where: { id } });
    
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    await db.attackSurfaceAsset.update({
      where: { id },
      data: { status: 'retired', retired_at: new Date(), last_updated: new Date() },
    });

    await auditLog(auth.userId!, 'DELETE', 'attack_surface_asset', id, `Retired asset: ${existing.name}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attack Surface DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Implementation functions
async function listAssets(params: URLSearchParams) {
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');
  const type = params.get('type');
  const search = params.get('search');

  const whereClause: any = {};
  if (type) whereClause.type = type;
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { value: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [assets, total] = await Promise.all([
    db.attackSurfaceAsset.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { risk_score: 'desc' },
    }),
    db.attackSurfaceAsset.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    data: assets.map(asset => ({
      ...asset,
      risk_score: calculateRiskScore(asset),
      exposure_level: determineExposureLevel(calculateRiskScore(asset)),
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getDashboardMetrics() {
  const [
    totalAssets,
    exposedAssets,
    criticalExposures,
    assetsByType,
    monitoredAssets,
  ] = await Promise.all([
    db.attackSurfaceAsset.count(),
    db.attackSurfaceAsset.count({ where: { exposure_level: { in: ['critical', 'high'] } } }),
    db.attackSurfaceAsset.count({ where: { exposure_level: 'critical' } }),
    db.attackSurfaceAsset.groupBy({ by: ['type'], _count: { type: true } }),
    db.attackSurfaceAsset.count({ where: { is_monitored: true } }),
  ]);

  const avgRiskResult = await db.attackSurfaceAsset.aggregate({ _avg: { risk_score: true } });

  return NextResponse.json({
    total_assets: totalAssets,
    exposed_assets: exposedAssets,
    critical_exposures: criticalExposures,
    average_risk_score: Math.round(avgRiskResult._avg.risk_score || 0),
    assets_by_type: Object.fromEntries(assetsByType.map(t => [t.type, t._count.type])),
    monitored_assets: monitoredAssets,
  });
}

async function getExposureSummary() {
  const exposedAssets = await db.attackSurfaceAsset.findMany({
    where: { OR: [{ exposure_level: { in: ['critical', 'high'] } }, { risk_score: { gte: 60 } }] },
    orderBy: { risk_score: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    total_exposed: exposedAssets.length,
    critical_count: exposedAssets.filter(a => a.exposure_level === 'critical').length,
    high_count: exposedAssets.filter(a => a.exposure_level === 'high').length,
    assets: exposedAssets.map(asset => ({
      ...asset,
      calculated_risk: calculateRiskScore(asset),
    })),
  });
}

async function createAsset(data: any, userId: string) {
  const asset = await db.attackSurfaceAsset.create({
    data: {
      ...data,
      value: data.value.toLowerCase(),
      risk_score: 0,
      exposure_level: 'internal',
      first_seen: new Date(),
      last_updated: new Date(),
      created_by: userId,
    },
  });

  const riskScore = calculateRiskScore(asset);
  const updated = await db.attackSurfaceAsset.update({
    where: { id: asset.id },
    data: { risk_score, exposure_level: determineExposureLevel(riskScore) },
  });

  await auditLog(userId, 'CREATE', 'attack_surface_asset', asset.id, `Created asset: ${asset.name}`);
  
  return NextResponse.json(updated, { status: 201 });
}

async function runDiscovery(data: { target: string }) {
  const discoveredAssets = await discoverAssets(data.target);
  
  const savedAssets = [];
  for (const asset of discoveredAssets) {
    try {
      const saved = await db.attackSurfaceAsset.create({
        data: {
          ...asset,
          risk_score: calculateRiskScore(asset),
          exposure_level: determineExposureLevel(calculateRiskScore(asset)),
          created_by: 'system_discovery',
        },
      });
      savedAssets.push(saved);
    } catch (e) {
      if (e.code !== 'P2002') throw e;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Discovery complete. Found ${savedAssets.length} assets.`,
    assets: savedAssets,
  });
}
