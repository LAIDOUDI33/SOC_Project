/**
 * AI Coordinator - Unified Orchestration Service
 * 
 * Central hub that coordinates all AI/ML components:
 * - OllamaClient (LLM for analysis, reports, explanations)
 * - MLEngine (TensorFlow/PyTorch models for inference)
 * - NLPEngine (Entity extraction, classification)
 * - VisionEngine (Document analysis, OCR, forgery detection)
 * - PredictionEngine (Time-series forecasting)
 * 
 * Provides unified API for SOC applications:
 * - Incident intelligence (multi-AI analysis)
 * - Threat intelligence processing
 * - Automated report generation
 * - Real-time decision support
 * 
 * @version 1.0.0
 * @module ai/internal/ai-coordinator
 */

import { OllamaClient, getOllamaClient, type OllamaConfig } from './ollama-client';
import { MLEngine, getMLEngine, type ModelConfig } from './ml-engine';
import { NLPEngine, getNLPEngine, type NLPConfig } from './nlp-engine';
import { VisionEngine, getVisionEngine, type VisionConfig } from './vision-engine';
import { PredictionEngine, getPredictionEngine, type PredictionConfig } from './prediction-engine';

// ============================================================
// Types & Interfaces
// ============================================================

export interface AICoordinatorConfig {
  // Component configurations
  ollama?: OllamaConfig;
  ml?: {
    models: ModelConfig[];
    engineConfig?: ConstructorParameters<typeof MLEngine>[0];
  };
  nlp?: NLPConfig;
  vision?: VisionConfig;
  prediction?: PredictionConfig;

  // Coordinator settings
  enableCaching: boolean;
  cacheTTLMinutes: number;
  maxConcurrentRequests: number;
  logging: boolean;
  fallbackBehavior: 'error' | 'partial' | 'graceful';
}

export interface IncidentIntelligenceRequest {
  incidentId: string;
  incidentData: any;
  rawLogs?: string[];
  relatedAlerts?: any[];
  context?: {
    timeRange: { start: Date; end: Date };
    affectedAssets: string[];
    analystNotes?: string;
  };
}

export interface IncidentIntelligenceResponse {
  incidentId: string;
  
  // LLM Analysis
  summary: string;
  severityAssessment: string;
  attackClassification: string;
  rootCauseHypothesis: string;
  
  // ML Analysis
  anomalyScore: number;
  threatCategory: string;
  confidence: number;
  
  // NLP Analysis
  extractedIOCs: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  entities: Array<{
    type: string;
    text: string;
    relevance: number;
  }>;
  
  // Predictions
  similarIncidentsCount: number;
  riskOfEscalation: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: Array<{
    action: string;
    priority: 'immediate' | 'short-term' | 'long-term';
    automation: 'full' | 'partial' | 'manual';
    rationale: string;
  }>;
  
  // Metadata
  processingTimeMs: number;
  aiModelsUsed: string[];
  confidenceScore: number; // Overall confidence in analysis
}

export interface ThreatIntelProcessingRequest {
  sourceType: 'misp' | 'opencti' | 'manual' | 'feed';
  rawData: string | object;
  sourceMetadata?: {
    name: string;
    reliability: number; // 0-1
    timestamp: Date;
  };
}

export interface ThreatIntelProcessingResponse {
  processedId: string;
  
  // Extracted Intelligence
  iocs: Array<{
    type: string;
    value: string;
    confidence: number;
    threatLevel: 'critical' | 'high' | 'medium' | 'low';
    firstSeen?: Date;
    lastSeen?: Date;
  }>;
  
  // Analysis
  threatActors: string[];
  attackPatterns: string[]; // MITRE ATT&CK
  targetedSectors: string[];
  malwareFamilies: string[];
  
  // Classification
  category: string;
  severity: string;
  credibility: number; // 0-1
  
  // Enrichment
  relatedReports: string[];
  ttps: Array<{ tactic: string; technique: string }>;
  
  // Recommendations
  defensiveMeasures: string[];
  monitoringRecommendations: string[];
  
  // Metadata
  processedAt: Date;
  processingTimeMs: number;
}

export interface AutomatedReportRequest {
  reportType: 'executive' | 'technical' | 'compliance' | 'incident' | 'trend';
  period: { start: Date; end: Date };
  data: {
    incidents?: any[];
    alerts?: any[];
    metrics?: any;
    threats?: any[];
    complianceStatus?: any;
  };
  options?: {
    language?: 'en' | 'fr' | 'ar';
    includeCharts?: boolean;
    detailLevel: 'summary' | 'detailed' | 'comprehensive';
    targetAudience: 'executive' | 'analyst' | 'technical' | 'auditor';
  };
}

export interface AutomatedReportResponse {
  reportId: string;
  title: string;
  generatedAt: Date;
  
  content: {
    markdown: string;
    html?: string;
    sections: Array<{
      title: string;
      content: string;
      keyMetrics?: Array<{ label: string; value: string; trend: 'up' | 'down' | 'stable' }>;
    }>;
  };
  
  metadata: {
    wordCount: number;
    readingTimeMinutes: number;
    dataPointsAnalyzed: number;
    aiGenerated: boolean;
    confidence: number;
  };
  
  attachments?: Array<{
    type: 'chart' | 'table' | 'diagram';
    title: string;
    data: any;
  }>;
}

export interface DecisionSupportQuery {
  queryType: 'incident_response' | 'threat_hunting' | 'vulnerability_prioritization' | 'resource_allocation' | 'escalation';
  context: any;
  options?: {
    explainReasoning?: boolean;
    provideAlternatives?: boolean;
    considerConstraints?: string[];
  };
}

export interface DecisionSupportResponse {
  queryId: string;
  recommendation: {
    primaryAction: string;
    rationale: string;
    expectedOutcome: string;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
  };
  
  alternatives?: Array<{
    action: string;
    pros: string[];
    cons: string[];
    whenToUse: string;
  }>;
  
  reasoning?: string; // If explainReasoning enabled
  
  constraintsConsidered: string[];
  dataSourcesUsed: string[];
  processingTimeMs: number;
}

export interface AICoordinatorHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    ollama: { status: string; modelLoaded: string; latencyMs: number };
    mlEngine: { status: string; modelsLoaded: number; avgLatencyMs: number };
    nlpEngine: { status: string; documentsProcessed: number };
    visionEngine: { status: string; available: boolean };
    predictionEngine: { status: string; forecastsGenerated: number };
  };
  uptimeSeconds: number;
  totalRequestsProcessed: number;
  cacheHitRate: number;
}

// ============================================================
// AI Coordinator Class
// ============================================================

export class AICoordinator {
  private config: AICoordinatorConfig;
  
  // AI Components
  private ollama: OllamaClient | null = null;
  private mlEngine: MLEngine | null = null;
  private nlpEngine: NLPEngine | null = null;
  private visionEngine: VisionEngine | null = null;
  private predictionEngine: PredictionEngine | null = null;

  // State
  private initialized: boolean = false;
  private startTime: Date = new Date();
  private totalRequests: number = 0;
  private cache: Map<string, { data: any; timestamp: Date }> = new Map();

  constructor(config: Partial<AICoordinatorConfig> = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheTTLMinutes: config.cacheTTLMinutes || 30,
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
      logging: config.logging ?? true,
      fallbackBehavior: config.fallbackBehavior || 'graceful',
      ...config
    };
  }

  /**
   * Initialize all AI components
   */
  async initialize(): Promise<void> {
    console.log('[AI Coordinator] 🚀 Initializing AI orchestration layer...');
    const startTime = Date.now();

    try {
      // Initialize Ollama (LLM)
      if (this.config.ollama) {
        try {
          this.ollama = getOllamaClient(this.config.ollama);
          const ollamaStatus = await this.ollama.healthCheck();
          if (ollamaStatus.running) {
            console.log(`[AI Coordinator] ✅ Ollama connected (model: ${this.config.ollama.model})`);
          } else {
            console.log('[AI Coordinator] ⚠️ Ollama not running, LLM features will be limited');
            this.ollama = null;
          }
        } catch (e) {
          console.warn('[AI Coordinator] ⚠️ Ollama initialization failed:', e);
        }
      }

      // Initialize ML Engine
      if (this.config.ml?.models) {
        try {
          this.mlEngine = getMLEngine(this.config.ml.engineConfig);
          await this.mlEngine.initialize(this.config.ml.models);
          console.log(`[AI Coordinator] ✅ ML Engine ready (${this.config.ml.models.length} models)`);
        } catch (e) {
          console.warn('[AI Coordinator] ⚠️ ML Engine initialization failed:', e);
        }
      }

      // Initialize NLP Engine
      try {
        this.nlpEngine = getNLPEngine(this.config.nlp);
        await this.nlpEngine.initialize();
        console.log('[AI Coordinator] ✅ NLP Engine ready');
      } catch (e) {
        console.warn('[AI Coordinator] ⚠️ NLP Engine initialization failed:', e);
      }

      // Initialize Vision Engine
      try {
        this.visionEngine = getVisionEngine(this.config.vision);
        await this.visionEngine.initialize();
        console.log('[AI Coordinator] ✅ Vision Engine ready');
      } catch (e) {
        console.warn('[AI Coordinator] ⚠️ Vision Engine initialization failed:', e);
      }

      // Initialize Prediction Engine
      try {
        this.predictionEngine = getPredictionEngine(this.config.prediction);
        await this.predictionEngine.initialize();
        console.log('[AI Coordinator] ✅ Prediction Engine ready');
      } catch (e) {
        console.warn('[AI Coordinator] ⚠️ Prediction Engine initialization failed:', e);
      }

      this.initialized = true;
      const initTime = Date.now() - startTime;
      console.log(`[AI Coordinator] 🎉 AI Coordinator ready! (${initTime}ms)`);

    } catch (error) {
      console.error('[AI Coordinator] ❌ Initialization failed:', error);
      
      if (this.config.fallbackBehavior === 'error') {
        throw error;
      }
      
      // Graceful degradation - continue with available components
      this.initialized = true;
      console.log('[AI Coordinator] ⚠️ Running in degraded mode');
    }
  }

  // ============================================================
  // Main API Methods
  // ============================================================

  /**
   * Analyze incident using multiple AI components
   */
  async analyzeIncident(request: IncidentIntelligenceRequest): Promise<IncidentIntelligenceResponse> {
    const startTime = Date.now();
    this.totalRequests++;
    
    this.log(`Analyzing incident ${request.incidentId}`);

    // Run analyses in parallel
    const [llmAnalysis, mlAnalysis, nlpAnalysis] = await Promise.allSettled([
      this.analyzeIncidentWithLLM(request),
      this.analyzeIncidentWithML(request),
      this.analyzeIncidentWithNLP(request)
    ]);

    // Extract results (handle failures gracefully)
    const llmResult = llmAnalysis.status === 'fulfilled' ? llmAnalysis.value : this.getDefaultLLMResult();
    const mlResult = mlAnalysis.status === 'fulfilled' ? mlAnalysis.value : this.getDefaultMLResult();
    const nlpResult = nlpAnalysis.status === 'fulfilled' ? nlpAnalysis.value : this.getDefaultNLPResult();

    // Generate recommendations combining all insights
    const recommendedActions = this.generateIntegratedActions(llmResult, mlResult, nlpResult);
    
    // Assess escalation risk
    const riskOfEscalation = this.assessEscalationRisk(mlResult, llmResult);

    // Calculate overall confidence
    const confidenceScore = this.calculateOverallConfidence([
      llmResult.confidence || 0.7,
      mlResult.confidence || 0.6,
      nlpResult.confidence || 0.8
    ]);

    return {
      incidentId: request.incidentId,
      summary: llmResult.summary,
      severityAssessment: llmResult.severity,
      attackClassification: llmResult.attackType,
      rootCauseHypothesis: llmResult.rootCauseAnalysis,
      anomalyScore: mlResult.anomalyScore,
      threatCategory: mlResult.category,
      confidence: mlResult.confidence,
      extractedIOCs: nlpResult.iocs,
      entities: nlpResult.entities,
      similarIncidentsCount: nlpResult.similarIncidents || 0,
      riskOfEscalation,
      recommendedActions,
      processingTimeMs: Date.now() - startTime,
      aiModelsUsed: this.getUsedModels([llmAnalysis, mlAnalysis, nlpAnalysis]),
      confidenceScore
    };
  }

  /**
   * Process threat intelligence feed
   */
  async processThreatIntel(request: ThreatIntelProcessingRequest): Promise<ThreatIntelProcessingResponse> {
    const startTime = Date.now();
    this.totalRequests++;

    const rawData = typeof request.rawData === 'string' ? request.rawData : JSON.stringify(request.rawData);

    // Step 1: Extract IOCs using NLP
    let iocs: ThreatIntelProcessingResponse['iocs'] = [];
    let entities: any[] = [];
    
    if (this.nlpEngine) {
      try {
        const extractedEntities = await this.nlpEngine.extractEntities(rawData);
        iocs = extractedEntities.map(e => ({
          type: e.type,
          value: e.text,
          confidence: e.confidence,
          threatLevel: this.assessIOCThreatLevel(e.type, e.confidence)
        }));
        
        entities = extractedEntities.slice(0, 20); // Top 20 entities
      } catch (e) {
        this.log('NLP extraction failed for threat intel', 'warn');
      }
    }

    // Step 2: Classify threat
    let category = 'unknown';
    let severity = 'medium';
    let credibility = request.sourceMetadata?.reliability || 0.5;

    if (this.nlpEngine) {
      try {
        const classification = await this.nlpEngine.classifyThreat(rawData);
        category = classification.category;
        severity = classification.severity;
        
        // Adjust credibility based on classification confidence
        credibility = Math.min(1, credibility * classification.confidence + classification.confidence * 0.3);
      } catch (e) {
        this.log('Threat classification failed', 'warn');
      }
    }

    // Step 3: Extract additional context with LLM
    let threatActors: string[] = [];
    let attackPatterns: string[] = [];
    let ttps: ThreatIntelProcessingResponse['ttps'] = [];

    if (this.ollama) {
      try {
        const prompt = `Analyze this threat intelligence and extract:
1. Threat actor names/groups
2. MITRE ATT&CK technique IDs (Txxxx format)
3. Targeted sectors/industries
4. Malware families mentioned

Threat Intelligence:
${rawData.substring(0, 5000)}

Respond in JSON format.`;

        const response = await this.ollama.generate(prompt, {
          system: 'You are a cyber threat intelligence analyst. Extract structured information from threat reports.',
          options: { temperature: 0.1 }
        });

        // Parse LLM response
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          threatActors = parsed.threatActors || [];
          attackPatterns = parsed.attackPatterns || [];
          
          if (parsed.tactics && parsed.techniques) {
            ttps = parsed.tactics.map((t: string, i: number) => ({
              tactic: t,
              technique: parsed.techniques[i] || ''
            }));
          }
        }
      } catch (e) {
        this.log('LLM threat analysis failed', 'warn');
      }
    }

    // Step 4: Generate defensive measures
    const defensiveMeasures = this.generateDefensiveMeasures(category, severity, iocs);
    const monitoringRecommendations = this.generateMonitoringRecommendations(iocs, attackPatterns);

    return {
      processedId: `ti_${Date.now()}`,
      iocs,
      threatActors,
      attackPatterns,
      targetedSectors: [], // Would extract from LLM or knowledge base
      malwareFamilies: [],
      category,
      severity,
      credibility,
      relatedReports: [],
      ttps,
      defensiveMeasures,
      monitoringRecommendations,
      processedAt: new Date(),
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generate automated security report
   */
  async generateReport(request: AutomatedReportRequest): Promise<AutomatedReportResponse> {
    const startTime = Date.now();
    this.totalRequests++;

    // Prepare data summary for LLM
    const dataSummary = this.prepareDataSummaryForLLM(request.data, request.reportType);

    // Generate main content with LLM
    let markdownContent = '';
    let sections: AutomatedReportResponse['content']['sections'] = [];

    if (this.ollama) {
      try {
        const prompt = this.buildReportPrompt(request, dataSummary);
        const response = await this.ollama.generate(prompt, {
          system: this.getReportSystemPrompt(request.options),
          options: { 
            temperature: 0.3, // Slightly creative for reports
            numPredict: 4096 // Longer output
          }
        });

        markdownContent = response.response;
        sections = this.parseReportSections(markdownContent);
      } catch (e) {
        this.log('Report generation failed', 'error');
        markdownContent = this.getFallbackReportContent(request);
        sections = this.getFallbackSections(request);
      }
    } else {
      markdownContent = this.getFallbackReportContent(request);
      sections = this.getFallbackSections(request);
    }

    // Generate predictions/trends if prediction engine available
    let attachments: AutomatedReportResponse['attachments'] = [];

    if (request.reportType === 'trend' && this.predictionEngine && request.data.incidents) {
      try {
        const forecast = await this.predictionEngine.forecast(
          request.data.incidents.map(inc => ({
            timestamp: new Date(inc.createdAt || inc.timestamp),
            value: 1
          })),
          { horizonDays: 30 }
        );

        attachments.push({
          type: 'chart',
          title: 'Incident Trend Forecast',
          data: {
            historical: request.data.incidents.length,
            predicted: forecast.predictedValues.reduce((a, b) => a + b, 0),
            trend: forecast.trends.direction,
            confidence: forecast.modelInfo.accuracy
          }
        });
      } catch (e) {
        this.log('Forecast generation for report failed', 'warn');
      }
    }

    return {
      reportId: `rpt_${Date.now()}`,
      title: this.generateReportTitle(request),
      generatedAt: new Date(),
      content: {
        markdown: markdownContent,
        sections
      },
      metadata: {
        wordCount: markdownContent.split(/\s+/).length,
        readingTimeMinutes: Math.ceil(markdownContent.split(/\s+/).length / 200),
        dataPointsAnalyzed: Object.values(request.data).flat().length,
        aiGenerated: !!this.ollama,
        confidence: 0.85
      },
      attachments
    };
  }

  /**
   * Get AI-powered decision support
   */
  async getDecisionSupport(query: DecisionSupportQuery): Promise<DecisionSupportResponse> {
    const startTime = Date.now();
    this.totalRequests++;

    // Build context-aware prompt
    const prompt = this.buildDecisionPrompt(query);
    
    let recommendation: DecisionSupportResponse['recommendation'];
    let alternatives: DecisionSupportResponse['alternatives'] = [];
    let reasoning: string | undefined;

    if (this.ollama) {
      try {
        const response = await this.ollama.generate(prompt, {
          system: `You are a senior SOC manager and security expert providing decision support.
Provide actionable, well-reasoned recommendations considering business impact, security posture, and resource constraints.`,
          options: { temperature: 0.2 }
        });

        // Parse structured response
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          recommendation = {
            primaryAction: parsed.recommendation || parsed.primaryAction,
            rationale: parsed.rationale,
            expectedOutcome: parsed.expectedOutcome || '',
            riskLevel: parsed.riskLevel || 'medium',
            confidence: parsed.confidence || 0.7
          };

          if (query.options?.provideAlternatives && parsed.alternatives) {
            alternatives = parsed.alternatives;
          }

          if (query.options?.explainReasoning) {
            reasoning = parsed.reasoning || response.response.substring(0, 1000);
          }
        } else {
          recommendation = this.parseUnstructuredDecision(response.response);
        }
      } catch (e) {
        this.log('Decision support failed', 'error');
        recommendation = this.getDefaultDecision(query.queryType);
      }
    } else {
      recommendation = this.getDefaultDecision(query.queryType);
    }

    return {
      queryId: `ds_${Date.now()}`,
      recommendation,
      alternatives: query.options?.provideAlternatives ? alternatives : undefined,
      reasoning: query.options?.explainReasoning ? reasoning : undefined,
      constraintsConsidered: query.options?.considerConstraints || [],
      dataSourcesUsed: this.getAvailableDataSources(),
      processingTimeMs: Date.now() - startTime
    };
  }

  // ============================================================
  // Health & Status
  // ============================================================

  /**
   * Get comprehensive health status of all AI components
   */
  async getHealthStatus(): Promise<AICoordinatorHealthStatus> {
    const components: AICoordinatorHealthStatus['components'] = {
      ollama: await this.getOllamaHealth(),
      mlEngine: this.getMLEngineHealth(),
      nlpEngine: this.getNLPHealth(),
      visionEngine: this.getVisionHealth(),
      predictionEngine: this.getPredictionHealth()
    };

    const statuses = Object.values(components).map(c => c.status);
    const overallStatus = statuses.every(s => s === 'operational' || s === 'ready') ? 'healthy' :
                          statuses.some(s => s === 'operational' || s === 'ready') ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      components,
      uptimeSeconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      totalRequestsProcessed: this.totalRequests,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // ============================================================
  // Internal Methods
  // ============================================================

  private async analyzeIncidentWithLLM(request: IncidentIntelligenceRequest): Promise<any> {
    if (!this.ollama) throw new Error('Ollama not available');

    return await this.ollama.analyzeIncident({
      ...request.incidentData,
      relatedAlerts: request.relatedAlerts,
      analystNotes: request.context?.analystNotes,
      timeRange: request.context?.timeRange
    });
  }

  private async analyzeIncidentWithML(request: IncidentIntelligenceRequest): Promise<any> {
    if (!this.mlEngine) throw new Error('ML Engine not available');

    // Extract features from incident data
    const features = this.extractIncidentFeatures(request.incidentData);
    
    // Run through relevant models
    const [anomalyResult, classificationResult] = await Promise.all([
      this.mlEngine.predict('ss7-autoencoder', { features }).catch(() => ({ anomalyScore: 0.5, confidence: 0.5 })),
      this.mlEngine.classifyThreat(request.incidentData).catch(() => ({ label: 'unknown', confidence: 0.5 }))
    ]);

    return {
      anomalyScore: anomalyResult.probabilities?.['anomaly'] || anomalyResult.confidence || 0.5,
      category: classificationResult.label,
      confidence: classificationResult.confidence
    };
  }

  private async analyzeIncidentWithNLP(request: IncidentIntelligenceRequest): Promise<any> {
    if (!this.nlpEngine) throw new Error('NLP Engine not available');

    // Combine text sources
    const textToAnalyze = [
      JSON.stringify(request.incidentData),
      ...(request.rawLogs || []).slice(0, 10), // Limit logs
      request.context?.analystNotes || ''
    ].join('\n\n');

    // Extract entities and classify
    const [entities, classification] = await Promise.all([
      this.nlpEngine.extractEntities(textToAnalyze),
      this.nlpEngine.classifyThreat(textToAnalyze)
    ]);

    return {
      iocs: entities.filter(e => 
        ['IP_ADDRESS', 'DOMAIN', 'HASH_MD5', 'HASH_SHA256', 'URL', 'EMAIL'].includes(e.type)
      ).map(e => ({ type: e.type, value: e.text, confidence: e.confidence })),
      entities: entities.slice(0, 10).map(e => ({
        type: e.type,
        text: e.text,
        relevance: e.confidence
      })),
      category: classification.category,
      severity: classification.severity,
      confidence: classification.confidence,
      similarIncidents: 0 // Would require database lookup
    };
  }

  private extractIncidentFeatures(incidentData: any): number[] {
    // Convert incident to numerical feature vector
    return [
      this.normalizeSeverity(incidentData.severity),
      incidentData.alertCount || 0,
      incidentData.affectedAssets?.length || 0,
      this.timeOfDayFeature(incidentData.timestamp),
      incidentData.durationHours || 0,
      incidentData.sourceCount || 0,
      this.hashStringToFeature(JSON.stringify(incidentData.title || '')),
      incidentData.confidence || 0.5
    ];
  }

  private normalizeSeverity(severity: string): number {
    switch ((severity || '').toLowerCase()) {
      case 'critical': return 1.0;
      case 'high': return 0.75;
      case 'medium': return 0.5;
      case 'low': return 0.25;
      default: return 0.5;
    }
  }

  private timeOfDayFeature(timestamp?: string | Date): number {
    if (!timestamp) return 0.5;
    const date = new Date(timestamp);
    return (date.getHours() + date.getMinutes() / 60) / 24;
  }

  private hashStringToFeature(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
  }

  private generateIntegratedActions(
    llmResult: any,
    mlResult: any,
    nlpResult: any
  ): IncidentIntelligenceResponse['recommendedActions'] {
    const actions: IncidentIntelligenceResponse['recommendedActions'] = [];

    // From LLM analysis
    if (llmResult.recommendedActions) {
      actions.push(...llmResult.recommendedActions.slice(0, 2).map((action: any) => ({
        action: action.action,
        priority: action.priority,
        automation: 'partial',
        rationale: action.description
      })));
    }

    // From ML analysis (anomaly-based)
    if (mlResult.anomalyScore > 0.7) {
      actions.push({
        action: 'Initiate forensic investigation',
        priority: 'immediate',
        automation: 'manual',
        rationale: `High anomaly score (${(mlResult.anomalyScore * 100).toFixed(1)}%) indicates potential sophisticated attack`
      });
    }

    // From NLP analysis (IOC-based)
    if (nlpResult.iocs?.length > 5) {
      actions.push({
        action: 'Block/monitor identified IOCs',
        priority: 'immediate',
        automation: 'full',
        rationale: `${nlpResult.iocs.length} indicators of compromise extracted`
      });
    }

    // Ensure we have at least some actions
    if (actions.length === 0) {
      actions.push({
        action: 'Continue monitoring and investigate further',
        priority: 'short-term',
        automation: 'manual',
        rationale: 'Standard incident response procedures'
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { immediate: 0, 'short-term': 1, 'long-term': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private assessEscalationRisk(mlResult: any, llmResult: any): IncidentIntelligenceResponse['riskOfEscalation'] {
    const factors = [
      mlResult.anomalyScore > 0.8 ? 1 : 0,
      (llmResult.severity === 'critical' || llmResult.severity === 'high') ? 1 : 0,
      (mlResult.category === 'malware' || mlResult.category === 'intrusion') ? 1 : 0
    ];

    const riskScore = factors.reduce((a, b) => a + b, 0);

    return riskScore >= 2 ? 'critical' :
           riskScore >= 1 ? 'high' :
           riskScore >= 0.5 ? 'medium' : 'low';
  }

  private calculateOverallConfidence(scores: number[]): number {
    if (scores.length === 0) return 0.5;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    // Weight towards minimum (conservative estimate)
    return avg * 0.6 + min * 0.4;
  }

  private assessIOCThreatLevel(type: string, confidence: number): 'critical' | 'high' | 'medium' | 'low' {
    const highRiskTypes = ['MALWARE_NAME', 'IP_ADDRESS', 'DOMAIN'];
    const mediumRiskTypes = ['URL', 'EMAIL', 'HASH_SHA256'];

    if (highRiskTypes.includes(type) && confidence > 0.8) return 'critical';
    if (highRiskTypes.includes(type)) return 'high';
    if (mediumRiskTypes.includes(type)) return 'medium';
    return 'low';
  }

  private generateDefensiveMeasures(
    category: string,
    severity: string,
    iocs: any[]
  ): string[] {
    const measures: string[] = [];

    // Category-specific
    switch (category) {
      case 'malware':
        measures.push('Update antivirus/EDR signatures');
        measures.push('Isolate affected endpoints');
        measures.push('Scan for persistence mechanisms');
        break;
      case 'phishing':
        measures.push('Block sender domains in email gateway');
        measures.push('Reset potentially compromised credentials');
        measures.push('Enhance user awareness training');
        break;
      case 'ddos':
        measures.push('Activate DDoS mitigation services');
        measures.push('Implement rate limiting at edge');
        measures.push('Contact upstream ISP for filtering');
        break;
      default:
        measures.push('Monitor for related activity');
        measures.push('Update detection rules');
    }

    // IOC-specific
    if (iocs.some(i => i.type === 'IP_ADDRESS')) {
      measures.push('Add suspicious IPs to blocklist');
    }
    if (iocs.some(i => i.type === 'DOMAIN')) {
      measures.push('Add domains to DNS sinkhole');
    }
    if (iocs.some(i => i.type === 'HASH_*')) {
      measures.push('Distribute file hashes to EDR solutions');
    }

    return [...new Set(measures)].slice(0, 8);
  }

  private generateMonitoringRecommendations(
    iocs: any[],
    attackPatterns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (attackPatterns.length > 0) {
      recommendations.push(`Create detection rules for MITRE techniques: ${attackPatterns.join(', ')}`);
    }

    if (iocs.some(i => i.type === 'IP_ADDRESS')) {
      recommendations.push('Configure network monitoring for suspicious IPs');
    }

    if (iocs.some(i => i.type === 'DOMAIN')) {
      recommendations.push('Enable DNS query logging for suspicious domains');
    }

    recommendations.push('Increase logging verbosity for affected systems');
    recommendations.push('Set up automated alerting for IOC matches');

    return recommendations;
  }

  private prepareDataSummaryForLLM(data: any, reportType: string): string {
    // Summarize data for LLM context window management
    const summaries: string[] = [];

    if (data.incidents?.length) {
      summaries.push(`${data.incidents.length} incidents`);
    }
    if (data.alerts?.length) {
      summaries.push(`${data.alerts.length} alerts`);
    }
    if (data.metrics) {
      summaries.push(`Metrics: ${JSON.stringify(data.metrics).substring(0, 500)}`);
    }

    return summaries.join(', ');
  }

  private buildReportPrompt(request: AutomatedReportRequest, dataSummary: string): string {
    return `Generate a ${request.reportType} security report for the following period:

**Period:** ${request.period.start.toISOString()} to ${request.period.end.toISOString()}
**Data Summary:** ${dataSummary}
**Target Audience:** ${request.options?.targetAudience || 'executive'}
**Detail Level:** ${request.options?.detailLevel || 'detailed'}
**Language:** ${request.options?.language || 'en'}

Requirements:
1. Professional tone appropriate for ${request.options?.targetAudience || 'executives'}
2. Include executive summary (2-3 paragraphs)
3. Key metrics and trends
4. Notable incidents/threats
5. Risk assessment
6. Recommendations (prioritized)
${request.options?.includeCharts ? '7. Reference chart descriptions' : ''}
${request.reportType === 'compliance' ? '8. Compliance status (ARTP/ANSSI)' : ''

Format as Markdown with clear section headers.`;
  }

  private getReportSystemPrompt(options?: AutomatedReportResponse['options']): string {
    const audienceInstructions: Record<string, string> = {
      executive: 'Focus on business impact, risk, and strategic recommendations. Use minimal technical jargon.',
      analyst: 'Include technical details, detection methods, and operational recommendations.',
      technical: 'Provide deep technical analysis, code examples, and implementation details.',
      auditor: 'Focus on compliance, controls, evidence, and audit trails.'
    };

    return `You are a professional security report writer for a telecommunications SOC platform.
${audienceInstructions[options?.targetAudience || 'executive']}
Generate clear, accurate, and actionable reports.`;
  }

  private parseReportSections(markdown: string): AutomatedReportResponse['content']['sections'] {
    const sections: AutomatedReportResponse['content']['sections'] = [];
    const lines = markdown.split('\n');
    let currentSection: { title: string; content: string } | null = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: line.replace(/^#+\s*/, ''), content: '' };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private generateReportTitle(request: AutomatedReportRequest): string {
    const typeLabels: Record<string, string> = {
      executive: 'Executive Security Summary',
      technical: 'Technical Security Report',
      compliance: 'Compliance Status Report',
      incident: 'Incident Response Report',
      trend: 'Security Trend Analysis'
    };

    const periodStart = request.period.start.toLocaleDateString();
    const periodEnd = request.period.end.toLocaleDateString();

    return `${typeLabels[request.reportType]} (${periodStart} - ${periodEnd})`;
  }

  private getFallbackReportContent(request: AutomatedReportRequest): string {
    return `# ${this.generateReportTitle(request)}

## Executive Summary

This report covers the security posture and activities for the specified period.

**Note:** Full AI-generated content unavailable. Please ensure Ollama service is running for enhanced reporting.

## Data Overview

- Period: ${request.period.start.toISOString()} to ${request.period.end.toISOString()}
- Incidents analyzed: ${request.data.incidents?.length || 0}
- Alerts generated: ${request.data.alerts?.length || 0}

## Recommendations

1. Review security metrics regularly
2. Maintain updated detection rules
3. Conduct regular security assessments
`;
  }

  private getFallbackSections(request: AutomatedReportRequest): AutomatedReportResponse['content']['sections'] {
    return [
      { title: 'Executive Summary', content: 'AI report generation unavailable.' },
      { title: 'Data Overview', content: 'Basic statistics only.' },
      { title: 'Recommendations', content: 'Manual review required.' }
    ];
  }

  private buildDecisionPrompt(query: DecisionSupportQuery): string {
    return `Provide a security decision recommendation for:

**Query Type:** ${query.queryType}
**Context:** ${JSON.stringify(query.context).substring(0, 2000)}
**Constraints:** ${query.options?.considerConstraints?.join(', ') || 'None specified'}

Provide your recommendation in this JSON format:
{
  "recommendation": "Primary recommended action",
  "rationale": "Why this is the best option",
  "expectedOutcome": "Expected result",
  "riskLevel": "low|medium|high",
  "confidence": 0.0-1.0${query.options?.provideAlternatives ? ',
  "alternatives": [
    {"action": "...", "pros": ["..."], "cons": ["..."], "whenToUse": "..."}
  ]' : ''}${query.options?.explainReasoning ? ',
  "reasoning": "Detailed explanation of the decision process"' : ''}
}`;
  }

  private parseUnstructuredDecision(text: string): DecisionSupportResponse['recommendation'] {
    // Try to extract decision from unstructured text
    return {
      primaryAction: text.substring(0, 200),
      rationale: text.substring(0, 500),
      expectedOutcome: 'Improved security posture',
      riskLevel: 'medium',
      confidence: 0.6
    };
  }

  private getDefaultDecision(queryType: string): DecisionSupportResponse['recommendation'] {
    const defaults: Record<string, DecisionSupportResponse['recommendation']> = {
      incident_response: {
        primaryAction: 'Follow standard incident response playbook',
        rationale: 'Established procedures provide consistent handling',
        expectedOutcome: 'Controlled incident resolution',
        riskLevel: 'medium',
        confidence: 0.7
      },
      threat_hunting: {
        primaryAction: 'Begin with hypothesis-based investigation',
        rationale: 'Structured approach yields better results',
        expectedOutcome: 'Identified threats and TTPs',
        riskLevel: 'low',
        confidence: 0.65
      },
      vulnerability_prioritization: {
        primaryAction: 'Prioritize by CVSS score and exploitability',
        rationale: 'Risk-based prioritization maximizes impact',
        expectedOutcome: 'Reduced attack surface',
        riskLevel: 'medium',
        confidence: 0.75
      },
      resource_allocation: {
        primaryAction: 'Allocate based on current threat landscape',
        rationale: 'Dynamic allocation responds to evolving threats',
        expectedOutcome: 'Optimal resource utilization',
        riskLevel: 'low',
        confidence: 0.6
      },
      escalation: {
        primaryAction: 'Escalate based on severity and business impact',
        rationale: 'Proper escalation ensures appropriate attention',
        expectedOutcome: 'Timely resolution',
        riskLevel: 'medium',
        confidence: 0.7
      }
    };

    return defaults[queryType] || defaults.incident_response;
  }

  private getAvailableDataSources(): string[] {
    const sources: string[] = [];
    if (this.ollama) sources.push('LLM (Ollama)');
    if (this.mlEngine) sources.push('ML Models');
    if (this.nlpEngine) sources.push('NLP Processing');
    if (this.predictionEngine) sources.push('Predictive Analytics');
    return sources;
  }

  private async getOllamaHealth(): Promise<AICoordinatorHealthStatus['components']['ollama']> {
    if (!this.ollama) {
      return { status: 'not_configured', modelLoaded: '', latencyMs: 0 };
    }

    try {
      const start = Date.now();
      const status = await this.ollama.healthCheck();
      return {
        status: status.running ? 'operational' : 'unavailable',
        modelLoaded: status.modelsLoaded[0] || 'none',
        latencyMs: Date.now() - start
      };
    } catch {
      return { status: 'error', modelLoaded: '', latencyMs: 0 };
    }
  }

  private getMLEngineHealth(): AICoordinatorHealthStatus['components']['mlEngine']> {
    if (!this.mlEngine) {
      return { status: 'not_configured', modelsLoaded: 0, avgLatencyMs: 0 };
    }

    const stats = this.mlEngine.getStats();
    return {
      status: stats.initialized ? 'operational' : 'unavailable',
      modelsLoaded: stats.modelsLoaded,
      avgLatencyMs: stats.avgLatencyMs
    };
  }

  private getNLPHealth(): AICoordinatorHealthStatus['components']['nlpEngine']> {
    if (!this.nlpEngine) {
      return { status: 'not_configured', documentsProcessed: 0 };
    }

    const stats = this.nlpEngine.getStats();
    return {
      status: this.nlpEngine.isReady() ? 'operational' : 'unavailable',
      documentsProcessed: stats.documentsProcessed
    };
  }

  private getVisionHealth(): AICoordinatorHealthStatus['components']['visionEngine']> {
    if (!this.visionEngine) {
      return { status: 'not_configured', available: false };
    }

    return {
      status: this.visionEngine.isReady() ? 'operational' : 'unavailable',
      available: this.visionEngine.isReady()
    };
  }

  private getPredictionHealth(): AICoordinatorHealthStatus['components']['predictionEngine']> {
    if (!this.predictionEngine) {
      return { status: 'not_configured', forecastsGenerated: 0 };
    }

    const stats = this.predictionEngine.getStats();
    return {
      status: this.predictionEngine.isReady() ? 'operational' : 'unavailable',
      forecastsGenerated: stats.forecastsGenerated
    };
  }

  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return 0; // Would track actual hits vs misses
  }

  private getUsedModels(results: PromiseSettledResult<any>[]): string[] {
    const models: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const modelNames = ['Ollama LLM', 'ML Engine', 'NLP Engine'];
        models.push(modelNames[index]);
      }
    });

    return models;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.config.logging) {
      console.log(`[AI Coordinator] [${level.toUpperCase()}] ${message}`);
    }
  }

  // Default result handlers
  private getDefaultLLMResult(): any {
    return {
      summary: 'LLM analysis unavailable',
      severity: 'medium',
      attackType: 'unknown',
      rootCauseAnalysis: 'Unable to determine without LLM',
      recommendedActions: [],
      confidence: 0.3
    };
  }

  private getDefaultMLResult(): any {
    return {
      anomalyScore: 0.5,
      category: 'unknown',
      confidence: 0.4
    };
  }

  private getDefaultNLPResult(): any {
    return {
      iocs: [],
      entities: [],
      category: 'unknown',
      severity: 'medium',
      confidence: 0.5,
      similarIncidents: 0
    };
  }

  // ============================================================
  // Public Utility Methods
  // ============================================================

  /**
   * Shutdown all AI components
   */
  async shutdown(): Promise<void> {
    console.log('[AI Coordinator] 🛑 Shutting down...');

    const shutdownPromises: Promise<void>[] = [];

    if (this.ollama) {
      // Ollama doesn't need explicit shutdown
    }
    if (this.mlEngine) {
      shutdownPromises.push(this.mlEngine.shutdown());
    }
    if (this.nlpEngine) {
      this.nlpEngine.shutdown();
    }
    if (this.visionEngine) {
      shutdownPromises.push(this.visionEngine.shutdown());
    }
    if (this.predictionEngine) {
      this.predictionEngine.shutdown();
    }

    await Promise.all(shutdownPromises);
    this.cache.clear();
    this.initialized = false;

    console.log('[AI Coordinator] 🔴 Shutdown complete');
  }

  /**
   * Check if coordinator is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get configuration
   */  
  getConfig(): Readonly<AICoordinatorConfig> {
    return { ...this.config };
  }
}

// ============================================================
// Factory Function & Singleton
// ============================================================

/**
 * Create configured AI Coordinator instance
 */
export function createAICoordinator(config?: Partial<AICoordinatorConfig>): AICoordinator {
  return new AICoordinator(config);
}

let coordinatorInstance: AICoordinator | null = null;

/**
 * Get singleton AI Coordinator instance
 */
export function getAICoordinator(config?: Partial<AICoordinatorConfig>): AICoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = createAICoordinator(config);
  }
  return coordinatorInstance;
}

export default AICoordinator;
