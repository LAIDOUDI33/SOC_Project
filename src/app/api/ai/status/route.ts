/**
 * AI Service Status & Health Check API
 * 
 * Provides health status and information about all AI services:
 * - Component availability
 * - Model status
 * - Performance metrics
 * - Configuration info
 * 
 * GET  /api/ai/status - Get comprehensive AI service status
 * POST /api/ai/init - (Re)initialize AI services
 * 
 * @version 1.0.0
 * @route /api/ai/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAICoordinator } from '@/lib/ai/internal/ai-coordinator';
import { getOllamaClient } from '@/lib/ai/internal/ollama-client';
import { getMLEngine } from '@/lib/ai/internal/ml-engine';
import { getNLPEngine } from '@/lib/ai/internal/nlp-engine';
import { getVisionEngine } from '@/lib/ai/internal/vision-engine';
import { getPredictionEngine } from '@/lib/ai/internal/prediction-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Gather status from all AI components
    const [coordinatorStatus, ollamaStatus, mlStatus, nlpStatus, visionStatus, predictionStatus] = await Promise.all([
      getCoordinatorHealth(),
      getOllamaHealth(),
      getMLHealth(),
      getNLPHealth(),
      getVisionHealth(),
      getPredictionHealth()
    ]);

    // Calculate overall status
    const components = [
      coordinatorStatus,
      ollamaStatus,
      mlStatus,
      nlpStatus,
      visionStatus,
      predictionStatus
    ];

    const operationalCount = components.filter(c => c.status === 'operational' || c.status === 'ready').length;
    const overallStatus = operationalCount === components.length ? 'healthy' :
                          operationalCount >= components.length / 2 ? 'degraded' : 'unhealthy';

    const response: any = {
      success: true,
      timestamp: new Date().toISOString(),
      overall: {
        status: overallStatus,
        componentsOperational: `${operationalCount}/${components.length}`,
        version: '1.0.0',
        uptime: process.uptime()
      },
      services: {
        coordinator: coordinatorStatus,
        ollama: ollamaStatus,
        mlEngine: mlStatus,
        nlpEngine: nlpStatus,
        visionEngine: visionStatus,
        predictionEngine: predictionStatus
      }
    };

    if (detailed) {
      response.capabilities = {
        llm: {
          available: ollamaStatus.status === 'operational',
          models: ollamaStatus.models || [],
          features: ['chat', 'analysis', 'report-generation', 'incident-analysis']
        },
        ml: {
          available: mlStatus.status === 'operational',
          models: mlStatus.models || [],
          features: ['anomaly-detection', 'classification', 'prediction', 'risk-scoring']
        },
        nlp: {
          available: nlpStatus.status === 'operational',
          languages: nlpStatus.languages || ['en'],
          features: ['entity-extraction', 'classification', 'sentiment', 'summarization']
        },
        vision: {
          available: visionStatus.status === 'operational',
          formats: visionStatus.formats || [],
          features: ['ocr', 'document-analysis', 'id-verification', 'forgery-detection']
        },
        prediction: {
          available: predictionStatus.status === 'operational',
          methods: predictionStatus.methods || [],
          features: ['forecasting', 'attack-prediction', 'capacity-planning']
        }
      };

      response.endpoints = [
        {
          path: '/api/ai/chat',
          methods: ['POST', 'GET'],
          description: 'LLM chat interface and conversation history'
        },
        {
          path: '/api/ai/analyze',
          methods: ['POST'],
          description: 'AI-powered analysis (incidents, threats, logs, IOCs)'
        },
        {
          path: '/api/ai/predict',
          methods: ['POST', 'GET'],
          description: 'Predictive analytics and forecasting'
        },
        {
          path: '/api/ai/vision',
          methods: ['POST'],
          description: 'Computer vision and document analysis'
        },
        {
          path: '/api/ai/status',
          methods: ['GET'],
          description: 'This endpoint - AI service status and health'
        }
      ];
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[AI Status] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get AI status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Re-initialize AI services (admin function)
 */
export async function POST() {
  try {
    const coordinator = getAICoordinator();
    
    // Shutdown existing instances
    if (coordinator.isReady()) {
      await coordinator.shutdown();
    }

    // Re-initialize
    await coordinator.initialize();

    const healthStatus = await coordinator.getHealthStatus();

    return NextResponse.json({
      success: true,
      message: 'AI services re-initialized successfully',
      status: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[AI Status] Re-init error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to re-initialize AI services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================
// Health Check Helpers
// ============================================================

async function getCoordinatorHealth(): Promise<any> {
  try {
    const coordinator = getAICoordinator();
    
    if (!coordinator.isReady()) {
      return { status: 'not_initialized' };
    }

    const health = await coordinator.getHealthStatus();
    
    return {
      status: health.status === 'healthy' ? 'operational' : 'degraded',
      uptimeSeconds: health.uptimeSeconds,
      totalRequests: health.totalRequestsProcessed,
      cacheHitRate: health.cacheHitRate
    };

  } catch (error) {
    return { status: 'error', error: String(error) };
  }
}

async function getOllamaHealth(): Promise<any> {
  try {
    const ollama = getOllamaClient();
    const status = await ollama.healthCheck();
    
    return {
      status: status.running ? 'operational' : 'unavailable',
      version: status.version,
      modelsLoaded: status.modelsLoaded,
      gpuAvailable: status.gpuAvailable,
      memoryMB: status.totalMemoryMB
    };

  } catch (error) {
    return { status: 'not_configured' };
  }
}

async function getMLHealth(): Promise<any> {
  try {
    const mlEngine = getMLEngine();
    const stats = mlEngine.getStats();
    const models = mlEngine.getLoadedModels();
    
    return {
      status: stats.initialized ? 'operational' : 'unavailable',
      modelsLoaded: stats.modelsLoaded,
      modelNames: models.map(m => m.name),
      totalInferences: stats.totalInferences,
      avgLatencyMs: Math.round(stats.avgLatencyMs * 100) / 100,
      cacheSize: stats.cacheSize
    };

  } catch (error) {
    return { status: 'not_configured' };
  }
}

async function getNLPHealth(): Promise<any> {
  try {
    const nlpEngine = getNLPEngine();
    const stats = nlpEngine.getStats();
    
    return {
      status: nlpEngine.isReady() ? 'operational' : 'unavailable',
      documentsProcessed: stats.documentsProcessed,
      entitiesExtracted: stats.entitiesExtracted,
      classificationsPerformed: stats.classificationsPerformed,
      avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs * 100) / 100,
      languages: ['en', 'fr', 'ar'] // Supported languages
    };

  } catch (error) {
    return { status: 'not_configured' };
  }
}

async function getVisionHealth(): Promise<any> {
  try {
    const visionEngine = getVisionEngine();
    const stats = visionEngine.getStats();
    
    return {
      status: visionEngine.isReady() ? 'operational' : 'unavailable',
      imagesProcessed: stats.imagesProcessed,
      documentsAnalyzed: stats.documentsAnalyzed,
      ocrOperations: stats.ocrOperations,
      forgeriesDetected: stats.forgeriesDetected,
      formats: ['png', 'jpeg', 'tiff', 'bmp', 'webp']
    };

  } catch (error) {
    return { status: 'not_configured' };
  }
}

async function getPredictionHealth(): Promise<any> {
  try {
    const predEngine = getPredictionEngine();
    const stats = predEngine.getStats();
    
    return {
      status: predEngine.isReady() ? 'operational' : 'unavailable',
      forecastsGenerated: stats.forecastsGenerated,
      avgAccuracy: Math.round(stats.avgAccuracy * 100) / 100,
      avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs * 100) / 100,
      methods: [
        'exponential_smoothing',
        'moving_average',
        'linear_regression',
        'seasonal_decomposition',
        'arima',
        'ensemble'
      ]
    };

  } catch (error) {
    return { status: 'not_configured' };
  }
}
