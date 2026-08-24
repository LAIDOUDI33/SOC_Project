/**
 * AI Prediction & Forecasting API Endpoint
 * 
 * Provides predictive analytics for SOC operations:
 * - Incident trend forecasting
 * - Attack prediction
 * - Capacity planning
 * - Risk scoring
 * 
 * POST /api/ai/predict/forecast - Generate time-series forecast
 * POST /api/ai/predict/attack - Predict attack trends
 * POST /api/ai/predict/capacity - Predict resource needs
 * POST /api/ai/predict/risk - Calculate risk scores
 * GET  /api/ai/predict/models - List available models
 * 
 * @version 1.0.0
 * @route /api/ai/predict
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPredictionEngine } from '@/lib/ai/internal/prediction-engine';
import { getMLEngine } from '@/lib/ai/internal/ml-engine';

// Initialize prediction engine on first request
let engineInitialized = false;

async function ensureEngine() {
  if (!engineInitialized) {
    try {
      const engine = getPredictionEngine();
      if (!engine.isReady()) {
        await engine.initialize();
      }
      engineInitialized = true;
    } catch (error) {
      console.error('[AI Prediction] Failed to initialize engine:', error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureEngine();
    
    const body = await request.json();
    const { predictionType, data, options } = body;

    if (!predictionType || !data) {
      return NextResponse.json(
        { error: 'predictionType and data are required' },
        { status: 400 }
      );
    }

    switch (predictionType) {
      case 'forecast':
        return await generateForecast(data, options);
      
      case 'attack':
        return await predictAttacks(data, options);
      
      case 'capacity':
        return await predictCapacity(data, options);
      
      case 'risk':
        return await calculateRisk(data, options);
      
      default:
        return NextResponse.json(
          { error: `Unknown prediction type: ${predictionType}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[AI Prediction] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Prediction failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate time-series forecast
 */
async function generateForecast(data: any, options?: any) {
  const engine = getPredictionEngine();

  if (!engine.isReady()) {
    return NextResponse.json(
      { error: 'Prediction engine not initialized' },
      { status: 503 }
    );
  }

  // Validate and transform input data
  const timeSeriesData = data.points || data.data || data;
  
  if (!Array.isArray(timeSeriesData) || timeSeriesData.length < 10) {
    return NextResponse.json(
      { error: 'Insufficient data points (minimum 10 required)' },
      { status: 400 }
    );
  }

  // Transform to expected format
  const formattedData = timeSeriesData.map((point: any) => ({
    timestamp: new Date(point.timestamp || point.date || point.time || point.x),
    value: typeof point.value === 'number' ? point.value : parseFloat(point.y || point.count || 0)
  })).filter((point: any) => !isNaN(point.timestamp.getTime()) && !isNaN(point.value));

  if (formattedData.length < 10) {
    return NextResponse.json(
      { error: 'Valid data points insufficient after parsing' },
      { status: 400 }
    );
  }

  try {
    const forecastResult = await engine.forecast(formattedData, {
      horizonDays: options?.horizonDays || 30,
      method: options?.method,
      confidenceInterval: options?.confidenceInterval || 0.95
    });

    return NextResponse.json({
      success: true,
      predictionType: 'forecast',
      data: forecastResult,
      metadata: {
        inputDataPoints: formattedData.length,
        dateRange: {
          start: formattedData[0].timestamp,
          end: formattedData[formattedData.length - 1].timestamp
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (forecastError) {
    console.error('[AI Prediction] Forecast generation error:', forecastError);
    
    return NextResponse.json(
      { 
        error: 'Forecast generation failed',
        details: forecastError instanceof Error ? forecastError.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Predict attack trends and patterns
 */
async function predictAttacks(data: any, options?: any) {
  const engine = getPredictionEngine();

  if (!engine.isReady()) {
    return NextResponse.json(
      { error: 'Prediction engine not initialized' },
      { status: 503 }
    );
  }

  // Validate incident data
  const incidents = data.incidents || data;
  
  if (!Array.isArray(incidents) || incidents.length < 5) {
    return NextResponse.json(
      { error: 'Insufficient incident data (minimum 5 required)' },
      { status: 400 }
    );
  }

  // Transform incident data
  const transformedIncidents = incidents.map((inc: any) => ({
    timestamp: new Date(inc.createdAt || inc.timestamp || inc.created_at || inc.date),
    category: inc.category || inc.type || 'unknown',
    severity: inc.severity || 'medium',
    count: 1
  })).filter(inc => !isNaN(inc.timestamp.getTime()));

  if (transformedIncidents.length < 5) {
    return NextResponse.json(
      { error: 'Valid incidents insufficient after parsing' },
      { status: 400 }
    );
  }

  try {
    const attackForecast = await engine.generateAttackForecast(transformedIncidents);

    return NextResponse.json({
      success: true,
      predictionType: 'attack',
      data: attackForecast,
      metadata: {
        totalIncidentsAnalyzed: transformedIncidents.length,
        categories: [...new Set(transformedIncidents.map(i => i.category))],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (attackError) {
    console.error('[AI Prediction] Attack prediction error:', attackError);
    
    return NextResponse.json(
      { 
        error: 'Attack prediction failed',
        details: attackError instanceof Error ? attackError.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Predict capacity/resource needs
 */
async function predictCapacity(data: any, options?: any) {
  const engine = getPredictionEngine();

  if (!engine.isReady()) {
    return NextResponse.json(
      { error: 'Prediction engine not initialized' },
      { status: 503 }
    );
  }

  const { resourceType, historicalUsage, currentCapacity } = data;

  if (!resourceType || !historicalUsage || !currentCapacity) {
    return NextResponse.json(
      { error: 'resourceType, historicalUsage, and currentCapacity are required' },
      { status: 400 }
    );
  }

  // Transform usage data
  const usageData = (Array.isArray(historicalUsage) ? historicalUsage : []).map((point: any) => ({
    timestamp: new Date(point.timestamp || point.date || point.time),
    value: typeof point.value === 'number' ? point.value : parseFloat(point.usage || point.utilization || 0)
  })).filter((point: any) => !isNaN(point.timestamp.getTime()) && !isNaN(point.value));

  if (usageData.length < 7) {
    return NextResponse.json(
      { error: 'Need at least 7 days of usage data' },
      { status: 400 }
    );
  }

  try {
    const capacityResult = await engine.predictCapacity(
      usageData,
      resourceType,
      currentCapacity
    );

    return NextResponse.json({
      success: true,
      predictionType: 'capacity',
      data: capacityResult,
      metadata: {
        resourceType,
        dataPointsUsed: usageData.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (capacityError) {
    console.error('[AI Prediction] Capacity prediction error:', capacityError);
    
    return NextResponse.json(
      { 
        error: 'Capacity prediction failed',
        details: capacityError instanceof Error ? capacityError.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate risk scores using ML models
 */
async function calculateRisk(data: any, options?: any) {
  const mlEngine = getMLEngine();

  if (!mlEngine.hasModel('behavior-analyzer') && 
      !mlEngine.hasModel('insider-threat') && 
      !mlEngine.hasModel('compromise-indicator')) {
    
    // Fallback to rule-based risk calculation
    return calculateRuleBasedRisk(data);
  }

  const { entityType, entityId, attributes, history } = data;

  if (!entityType || !entityId || !attributes) {
    return NextResponse.json(
      { error: 'entityType, entityId, and attributes are required' },
      { status: 400 }
    );
  }

  try {
    const riskResult = await mlEngine.calculateRiskScore({
      entityType,
      entityId,
      attributes,
      history: history || []
    });

    return NextResponse.json({
      success: true,
      predictionType: 'risk',
      data: riskResult,
      metadata: {
        entityType,
        entityId,
        generatedAt: new Date().toISOString(),
        aiModelsUsed: ['ML Engine']
      }
    });

  } catch (riskError) {
    console.error('[AI Prediction] Risk calculation error:', riskError);
    
    // Fall back to rule-based
    return calculateRuleBasedRisk(data);
  }
}

/**
 * Rule-based risk calculation fallback
 */
function calculateRuleBasedRisk(data: any) {
  const attributes = data.attributes || {};
  
  // Simple scoring based on attribute values
  let score = 0;
  const factors: Array<{ factor: string; score: number; weight: number; contribution: number }> = [];

  // Analyze each attribute
  Object.entries(attributes).forEach(([key, value]) => {
    if (typeof value !== 'number') return;
    
    let attributeScore = 0;
    let weight = 1;

    // Higher values increase risk for most security metrics
    if (key.includes('failed_login') || key.includes('denied')) {
      attributeScore = Math.min(value / 10, 1); // Normalize
      weight = 2; // High weight for auth failures
    } else if (key.includes('anomaly') || key.includes('suspicious')) {
      attributeScore = Math.min(value / 5, 1);
      weight = 2.5;
    } else if (key.includes('data_access') && value > 1000) {
      attributeScore = Math.min(value / 10000, 1);
      weight = 1.5;
    } else if (key.includes('off_hours') || key.includes('unusual_time')) {
      attributeScore = Math.min(value / 20, 1);
      weight = 1.8;
    } else {
      attributeScore = Math.min(value / 100, 1);
      weight = 1;
    }

    const contribution = attributeScore * weight * 25; // Scale to 0-100
    
    factors.push({ factor: key, score: attributeScore * 100, weight: weight * 20, contribution });
    score += contribution;
  });

  // Normalize score
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0) || 1;
  const normalizedScore = Math.min(100, Math.round(score / (totalWeight / 4)));

  // Determine risk level
  const riskLevel = normalizedScore >= 75 ? 'critical' :
                    normalizedScore >= 50 ? 'high' :
                    normalizedScore >= 25 ? 'medium' : 'low';

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (riskLevel === 'critical') {
    recommendations.push('Immediate investigation required');
    recommendations.push('Consider temporary access suspension');
  } else if (riskLevel === 'high') {
    recommendations.push('Increased monitoring recommended');
    recommendations.push('Review recent activity');
  } else if (riskLevel === 'medium') {
    recommendations.push('Continue monitoring');
    recommendations.push('Schedule review');
  }

  // Add specific recommendations based on top factors
  const topFactors = factors.sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  topFactors.forEach(f => {
    if (f.contribution > 15) {
      recommendations.push(`High ${f.factor.replace(/_/g, ' ')} score detected`);
    }
  });

  return NextResponse.json({
    success: true,
    predictionType: 'risk',
    mode: 'rule-based', // Indicates fallback mode
    data: {
      overallScore: normalizedScore,
      riskLevel,
      factors: factors.sort((a, b) => b.contribution - a.contribution),
      trend: 'stable', // Would analyze historical data
      recommendations: recommendations.slice(0, 6)
    },
    metadata: {
      entityType: data.entityType,
      entityId: data.entityId,
      generatedAt: new Date().toISOString(),
      aiModelsUsed: ['Rule Engine']
    }
  });
}

// GET handler for model info
export async function GET() {
  try {
    await ensureEngine();
    
    const engine = getPredictionEngine();
    const mlEngine = getMLEngine();

    return NextResponse.json({
      success: true,
      data: {
        predictionEngine: {
          ready: engine.isReady(),
          stats: engine.getStats()
        },
        mlEngine: {
          ready: !!mlEngine,
          loadedModels: mlEngine.getLoadedModels()
        },
        availableMethods: [
          'exponential_smoothing',
          'moving_average',
          'linear_regression',
          'seasonal_decomposition',
          'arima',
          'ensemble'
        ],
        supportedPredictions: [
          'forecast',
          'attack',
          'capacity',
          'risk'
        ]
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get prediction service info' },
      { status: 500 }
    );
  }
}
