/**
 * National SOC Platform - Behavioral Analytics (UEBA) API
 * 
 * User and Entity Behavior Analytics endpoints:
 * - GET /api/analytics/behavior - Behavior dashboard
 * - GET /api/analytics/behavior/profiles - Get entity profiles
 * - GET /api/analytics/behavior/anomalies - Get behavioral anomalies
 * - POST /api/analytics/behavior/analyze - Trigger behavior analysis
 * - GET /api/analytics/behavior/risk-scores - Risk score distribution
 * 
 * @module api/analytics/behavior
 * @version 2.0.0 (Analytics Phase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireRole } from '@/lib/auth/api-auth';
import {
  analyzeEntityBehavior,
  getBehaviorProfile,
  calculateRiskScore,
  detectAnomalousBehavior,
  updateBaseline,
  getPeerGroupComparison,
  getSessionAnalysis,
  type BehaviorProfile,
  type RiskScore,
  type AnomalyResult,
  type EntityType,
  type RiskLevel
} from '@/lib/analytics/ml/behavioral-analytics';

// GET /api/analytics/behavior - Main UEBA endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }

  const requestId = `ueba_${Date.now()}`;
  const { searchParams } = new URL(request.url);

  try {
    const type = searchParams.get('type') || 'dashboard';
    const entityType = (searchParams.get('entityType') || 'user') as EntityType;
    const limit = parseInt(searchParams.get('limit') || '20');

    let data;

    switch (type) {
      case 'profiles':
        // Get behavior profiles for entities
        const entityId = searchParams.get('entityId');
        
        if (entityId) {
          // Single entity profile
          data = await getBehaviorProfile({
            entityId,
            entityType,
            includeSessionData: true,
            includeRiskFactors: true
          });
        } else {
          // List profiles with filtering
          const riskLevel = searchParams.get('riskLevel') as RiskLevel;
          const sortBy = searchParams.get('sortBy') || 'riskScore';
          
          // Return summary (full list would be too large)
          data = {
            message: "Use POST /api/analytics/behavior/query for profile lists",
            tip: "Provide entityId for single profile lookup",
            example: `/api/analytics/behavior?type=profiles&entityId=user-123&entityType=user`
          };
        }
        break;

      case 'anomalies':
        // Get detected anomalies
        const anomalyHours = parseInt(searchParams.get('hours') || '24');
        const severity = searchParams.get('severity');
        
        data = await detectAnomalousBehavior({
          timeWindowHours: anomalyHours,
          entityType,
          minRiskScore: severity === 'critical' ? 85 : severity === 'high' ? 70 : 50,
          includeContext: true,
          limit
        });
        break;

      case 'risk-scores':
        // Risk score distribution and statistics
        data = await calculateRiskScore({
          entityType,
          groupBy: (searchParams.get('groupBy') || 'department') as 'department' | 'role' | 'location' | 'peerGroup',
          timeWindow: (searchParams.get('timeWindow') || '24h') as '1h' | '6h' | '24h' | '7d' | '30d',
          includeTrends: true,
          includeDistribution: true
        });
        break;

      case 'sessions':
        // Active session analysis
        const sessionId = searchParams.get('sessionId');
        
        if (sessionId) {
          data = await getSessionAnalysis({
            sessionId,
            includeAlerts: true,
            includeRiskTrajectory: true
          });
        } else {
          data = {
            message: " sessionId parameter required for session analysis",
            example: `/api/analytics/behavior/type=sessions&sessionId=session-abc-123`
          };
        }
        break;

      case 'peer-comparison':
        // Peer group analysis
        const peerEntityId = searchParams.get('entityId');
        
        if (peerEntityId) {
          data = await getPeerGroupComparison({
            entityId: peerEntityId,
            entityType,
            includeDeviations: true,
            includeRecommendations: true
          });
        } else {
          return NextResponse.json({
            success: false,
            error: "entityId parameter required for peer comparison"
          }, { status: 400 });
        }
        break;

      case 'dashboard':
      default:
        // Full dashboard aggregation
        const [
          riskScores,
          recentAnomalies,
          highRiskEntities
        ] = await Promise.all([
          calculateRiskScore({ entityType, timeWindow: '24h', includeDistribution: true }),
          detectAnomalousBehavior({ timeWindowHours: 24, minRiskScore: 70, limit: 10 }),
          detectAnomalousBehavior({ timeWindowHours: 24, minRiskScore: 85, limit: 5 })
        ]);

        data = {
          riskSummary: riskScores,
          criticalAlerts: highRiskEntities,
          recentAnomalies: recentAnomalies,
          totalMonitoredEntities: riskScores.totalEntities || 0,
          highRiskCount: riskScores.distribution?.high || 0,
          criticalCount: riskScores.distribution?.critical || 0,
          generatedAt: new Date().toISOString()
        };
    }

    console.log(`[BEHAVIORAL-ANALYTICS] ${type} query completed`, {
      requestId,
      userId: authResult.user.userId,
      entityType,
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      requestId,
      type,
      entityType,
      calculatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      data
    });

  } catch (error) {
    console.error(`[BEHAVIORAL-ANALYTICS] Error:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Behavior analysis failed',
      requestId
    }, { status: 500 });
  }
}

// POST /api/analytics/behavior/analyze - Trigger behavior analysis
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // Require Analyst+ role
  const roleCheck = requireRole(authResult.user, ['ANALYST', 'ADMIN', 'MANAGER', 'SOC-MANAGER']);
  if (!roleCheck.success) {
    return NextResponse.json({ success: false, error: roleCheck.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action || 'analyze';

    let result;

    switch (action) {
      case 'analyze':
        // Full behavior analysis for an entity
        result = await analyzeEntityBehavior({
          entityId: body.entityId,
          entityType: body.entityType || 'user',
          analysisDepth: body.depth || 'full',
          includeRecommendations: true
        });
        break;

      case 'update-baseline':
        // Force baseline recalculation (Admin only)
        if (!['ADMIN', 'SOC-MANAGER'].includes(authResult.user.role)) {
          return NextResponse.json({
            success: false,
            error: 'Administrator access required for baseline updates'
          }, { status: 403 });
        }
        
        result = await updateBaseline({
          entityId: body.entityId,
          entityType: body.entityType || 'user',
          recalculationMethod: body.method || 'rolling',
          lookbackDays: body.lookbackDays || 30
        });
        break;

      case 'batch-analyze':
        // Analyze multiple entities
        const entityIds: string[] = body.entityIds;
        
        if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'entityIds array is required'
          }, { status: 400 });
        }

        if (entityIds.length > 100) {
          return NextResponse.json({
            success: false,
            error: 'Maximum 100 entities per batch analysis'
          }, { status: 400 });
        }

        // Process in parallel (limit concurrency)
        const batchSize = 10;
        const results = [];
        
        for (let i = 0; i < entityIds.length; i += batchSize) {
          const batch = entityIds.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(entityId => 
              analyzeEntityBehavior({
                entityId,
                entityType: body.entityType || 'user',
                analysisDepth: 'standard'
              }).catch(e => ({ entityId, error: e.message }))
            )
          );
          results.push(...batchResults);
        }

        result = {
          analyzed: results.filter(r => !('error' in r)).length,
          errors: results.filter(r => 'error' in r).length,
          entities: results
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Use: analyze, update-baseline, batch-analyze`
        }, { status: 400 });
    }

    console.log(`[BEHAVIORAL-ANALYTICS] ${action} completed`, {
      userId: authResult.user.userId,
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      action,
      performedBy: authResult.user.userId,
      performedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      result
    });

  } catch (error) {
    console.error(`[BEHAVIORAL-ANALYTICS] Action error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to execute behavior analysis action'
    }, { status: 500 });
  }
}
