/**
 * AI Module - Complete Internal AI Tools Suite
 * 
 * Exports all AI/ML components for the SOC platform:
 * 
 * **Core Components:**
 * - OllamaClient: Self-hosted LLM integration (Llama, Mistral, etc.)
 * - MLEngine: TensorFlow/PyTorch model inference
 * - NLPEngine: NLP pipeline (entity extraction, classification)
 * - VisionEngine: Computer vision (OCR, document analysis)
 * - PredictionEngine: Time-series forecasting
 * - AICoordinator: Unified orchestration service
 * 
 * **Features:**
 * - 100% internal/localhost operation (no external APIs)
 * - Production-ready with error handling and fallbacks
 * - SOC-specific (incident analysis, threat intel, reports)
 * - Multi-language support (EN, FR, AR for Algeria operations)
 * 
 * @version 1.0.0
 * @module ai/internal
 */

// ============================================================
// Core AI Components
// ============================================================

export { OllamaClient, getOllamaClient, createOllamaClient } from './ollama-client';
export type {
  OllamaConfig,
  OllamaMessage,
  ChatRequest,
  ChatResponse,
  GenerateRequest,
  GenerateResponse,
  ModelInfo,
  OllamaStatus,
  IncidentAnalysis,
  PlaybookSuggestion
} from './ollama-client';

export { MLEngine, getMLEngine, createMLEngine } from './ml-engine';
export type {
  ModelConfig,
  ModelFramework,
  PredictionInput,
  PredictionResult,
  AnomalyResult,
  ClassificationResult,
  TimeSeriesPrediction,
  MLEngineConfig,
  TrainingMetrics
} from './ml-engine';

export { NLPEngine, getNLPEngine, createNLPEngine } from './nlp-engine';
export type {
  NLPConfig,
  EntityType,
  ExtractedEntity,
  NLPDocument,
  ClassificationResult as NLPClassificationResult,
  ThreatClassification,
  SentimentResult,
  SummaryOptions,
  NLPStats
} from './nlp-engine';

export { VisionEngine, getVisionEngine, createVisionEngine } from './vision-engine';
export type {
  VisionConfig,
  ImageInput,
  DetectedObject,
  DocumentAnalysis,
  IDVerificationResult,
  OCRResult,
  ImageQualityMetrics,
  ForgeryAnalysisResult,
  VisionStats
} from './vision-engine';

export { PredictionEngine, getPredictionEngine, createPredictionEngine } from './prediction-engine';
export type {
  PredictionConfig,
  PredictionMethod,
  TimeSeriesPoint,
  ForecastResult,
  TrendAnalysis,
  CapacityPrediction,
  AttackForecast,
  PredictionStats
} from './prediction-engine';

// ============================================================
// Orchestration Layer
// ============================================================

export { AICoordinator, getAICoordinator, createAICoordinator } from './ai-coordinator';
export type {
  AICoordinatorConfig,
  IncidentIntelligenceRequest,
  IncidentIntelligenceResponse,
  ThreatIntelProcessingRequest,
  ThreatIntelProcessingResponse,
  AutomatedReportRequest,
  AutomatedReportResponse,
  DecisionSupportQuery,
  DecisionSupportResponse,
  AICoordinatorHealthStatus
} from './ai-coordinator';

// ============================================================
// Initialization Helper
// ============================================================

import { AICoordinator as CoordinatorClass } from './ai-coordinator';

export interface FullAIConfig {
  ollama?: {
    host?: string;
    model?: string;
    temperature?: number;
  };
  mlModels?: Array<{
    name: string;
    path: string;
    framework: 'tensorflow' | 'pytorch' | 'sklearn' | 'rule-based';
    inputShape?: number[];
    outputClasses?: string[];
  }>;
  nlp?: {
    entityTypes?: string[];
    languages?: string[];
  };
  vision?: {
    enableOCR?: boolean;
    ocrLanguages?: string[];
  };
  prediction?: {
    defaultHorizonDays?: number;
    detectSeasonality?: boolean;
  };
}

/**
 * Initialize complete AI stack with sensible defaults
 */
export async function initializeAIStack(config?: FullAIConfig): Promise<CoordinatorClass> {
  console.log('🤖 Initializing Complete AI Stack...');
  
  const coordinator = new CoordinatorClass({
    ollama: config?.ollama ? {
      host: config.ollama.host || 'http://localhost:11434',
      model: config.ollama.model || 'llama3.1:8b',
      temperature: config.ollama.temperature || 0.1
    } : undefined,
    
    ml: config?.mlModels ? {
      models: config.mlModels.map(m => ({
        name: m.name,
        path: m.path,
        framework: m.framework,
        inputShape: m.inputShape || [],
        outputClasses: m.outputClasses || [],
        version: '1.0.0',
        description: `${m.name} ML model`
      }))
    } : undefined,

    nlp: config?.nlp ? {
      entityTypes: (config.nlp.entityTypes || [
        'IP_ADDRESS', 'DOMAIN', 'URL', 'EMAIL',
        'HASH_MD5', 'HASH_SHA256', 'CVE', 'MALWARE_NAME'
      ]) as any,
      autoDetectLanguage: true
    } : undefined,

    vision: config?.vision ? {
      ocrLanguages: config.vision.ocrLanguages || ['eng', 'fra']
    } : undefined,

    prediction: config?.prediction ? {
      defaultHorizonDays: config.prediction.defaultHorizonDays || 30,
      detectSeasonality: config.prediction.detectSeasonality ?? true
    } : undefined,

    logging: true,
    fallbackBehavior: 'graceful'
  });

  await coordinator.initialize();
  
  return coordinator;
}

// Default export is the coordinator class
export default AICoordinator;
