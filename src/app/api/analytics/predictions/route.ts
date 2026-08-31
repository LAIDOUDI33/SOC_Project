/**
 * National SOC Platform - Predictive Analytics API
 * 
 * ML-powered threat forecasting and prediction endpoints:
 * - GET /api/analytics/predictions - Get latest predictions
 * - POST /api/analytics/predictions/generate - Trigger new prediction
 * - GET /api/analytics/predictions/threats - Threat volume predictions
 * - GET /api/analytics/predictions/incidents - Incident forecasts
 * - GET /api/analytics/predictions/trends - Prediction trend analysis
 * 
 * @module api/analytics/predictions
 * @version 2.0.0 (Analytics Phase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireRole } from '@/lib/auth/api-auth';
import {
  generateThreatPrediction,
  generateIncidentForecast,
  generateResourcePrediction,
  generateComplianceRiskPrediction,
  getPredictionHistory,
  calculatePredictionAccuracy,
  type PredictionResult,
  type PredictionType,
  type TimeHorizon
} from '@/lib/analytics/ml/predictive-analytics';

// GET /api/analytics/predictions - Get predictions dashboard
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Authenticate & authorize (Analyst+)
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication required' 
    }, { status: 401 });
  }

  const requestId = `pred_${Date.now()}`;
  const { searchParams } = new URL(request.url);

  try {
    const type = searchParams.get('type') || 'dashboard';
    const horizon = (searchParams.get('horizon') || '7d') as TimeHorizon;
    const limit = parseInt(searchParams.get('limit') || '10');

    let data;

    switch (type) {
      case 'threats':
        // Threat volume predictions
        data = await generateThreatPrediction({
          timeHorizon: horizon,
          categories: ['malware', 'phishing', 'ddos', 'intrusion', 'fraud'],
          includeFactors: true,
          includeConfidence: true
        });
        break;

      case 'incidents':
        // Incident count forecasts
        data = await generateIncidentForecast({
          timeHorizon: horizon,
          severityLevels: ['low', 'medium', 'high', 'critical'],
          includeTrendAnalysis: true
        });
        break;

      case 'resources':
        // Resource demand predictions
        data = await generateResourcePrediction({
          timeHorizon: horizon,
          resources: ['cpu', 'memory', 'storage', 'analysts'],
          peakMultiplier: 1.5
        });
        break;

      case 'compliance':
        // Compliance risk predictions
        data = await generateComplianceRiskPrediction({
          timeHorizon: horizon,
          frameworks: ['ANRT', 'ISO27001', 'GDPR'],
          riskCategories: ['data_breach', 'access_violation', 'audit_failure']
        });
        break;

      case 'history':
        // Historical prediction accuracy
        const historyDays = parseInt(searchParams.get('days') || '30');
        data = await getPredictionHistory({
          days: historyDays,
          types: ['threat_volume', 'incident_count'],
          includeAccuracy: true
        });
        break;

      case 'accuracy':
        // Model accuracy metrics
        const accuracyDays = parseInt(searchParams.get('days') || '90');
        data = await calculatePredictionAccuracy({
          periodDays: accuracyDays,
          models: ['threat_predictor_v4', 'incident_forecaster_v3']
        });
        break;

      case 'dashboard':
      default:
        // Full dashboard aggregation
        const [threats, incidents, resources, compliance] = await Promise.all([
          generateThreatPrediction({ timeHorizon: horizon }),
          generateIncidentForecast({ timeHorizon: horizon }),
          generateResourcePrediction({ timeHorizon: horizon }),
          generateComplianceRiskPrediction({ timeHorizon: horizon })
        ]);

        data = {
          threats,
          incidents,
          resources,
          compliance,
          generatedAt: new Date().toISOString(),
          horizon
        };
    }

    console.log(`[PREDICTIVE-ANALYTICS] ${type} query completed`, {
      requestId,
      userId: authResult.user.userId,
      horizon,
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      requestId,
      type,
      horizon,
      calculatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      data
    });

  } catch (error) {
    console.error(`[PREDICTIVE-ANALYTICS] Error:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Prediction failed',
      requestId
    }, { status: 500 });
  }
}

// POST /api/analytics/predictions/generate - Trigger new prediction run
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // Require Analyst or Admin role for generating predictions
  const roleCheck = requireRole(authResult.user, ['ANALYST', 'ADMIN', 'MANAGER', 'SOC-MANAGER']);
  if (!roleCheck.success) {
    return NextResponse.json({ success: false, error: roleCheck.error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      predictionType = 'threat_volume',
      horizon = '7d',
      options = {}
    } = body;

    let result: PredictionResult;

    switch (predictionType) {
      case 'incident_count':
        result = await generateIncidentForecast({
          timeHorizon: horizon as TimeHorizon,
          ...options
        });
        break;
      
      case 'resource_demand':
        result = await generateResourcePrediction({
          timeHorizon: horizon as TimeHorizon,
          ...options
        });
        break;
      
      case 'compliance_risk':
        result = await generateComplianceRiskPrediction({
          timeHorizon: horizon as TimeHorizon,
          ...options
        });
        break;
      
      case 'threat_volume':
      default:
        result = await generateThreatPrediction({
          timeHorizon: horizon as TimeHorizon,
          ...options
        });
    }

    console.log(`[PREDICTIVE-ANALYTICS] Generated ${predictionType} prediction`, {
      userId: authResult.user.userId,
      horizon,
      confidence: result.confidence,
      processingTimeMs: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      action: 'prediction_generated',
      predictionType,
      horizon,
      generatedAt: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      prediction: result
    });

  } catch (error) {
    console.error(`[PREDICTIVE-ANALYTICS] Generation error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate prediction'
    }, { status: 500 });
  }
}
