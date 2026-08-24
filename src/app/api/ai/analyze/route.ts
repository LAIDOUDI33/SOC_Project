/**
 * AI Analysis API Endpoint
 * 
 * Provides AI-powered analysis for security data:
 * - Incident analysis (multi-AI approach)
 * - Threat intelligence processing
 * - Log analysis
 * - IOC extraction
 * 
 * POST /api/ai/analyze - Analyze security data
 * POST /api/ai/analyze/incident - Analyze specific incident
 * POST /api/ai/analyze/threat-intel - Process threat intelligence
 * POST /api/ai/analyze/logs - Analyze log data
 * 
 * @version 1.0.0
 * @route /api/ai/analyze
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAICoordinator } from '@/lib/ai/internal/ai-coordinator';
import { getNLPEngine } from '@/lib/ai/internal/nlp-engine';
import { getMLEngine } from '@/lib/ai/internal/ml-engine';

// Initialize AI coordinator on first request
let coordinatorInitialized = false;

async function ensureCoordinator() {
  if (!coordinatorInitialized) {
    try {
      const coordinator = getAICoordinator();
      if (!coordinator.isReady()) {
        await coordinator.initialize();
      }
      coordinatorInitialized = true;
    } catch (error) {
      console.error('[AI Analysis] Failed to initialize coordinator:', error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCoordinator();
    
    const body = await request.json();
    const { analysisType, data, options } = body;

    if (!analysisType || !data) {
      return NextResponse.json(
        { error: 'analysisType and data are required' },
        { status: 400 }
      );
    }

    switch (analysisType) {
      case 'incident':
        return await analyzeIncident(data, options);
      
      case 'threat-intel':
        return await analyzeThreatIntel(data, options);
      
      case 'logs':
        return await analyzeLogs(data, options);
      
      case 'text':
        return await analyzeText(data, options);
      
      case 'ioc-extraction':
        return await extractIOCs(data, options);
      
      default:
        return NextResponse.json(
          { error: `Unknown analysis type: ${analysisType}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Analyze a security incident using multiple AI components
 */
async function analyzeIncident(incidentData: any, options?: any) {
  const coordinator = getAICoordinator();
  
  if (!coordinator.isReady()) {
    // Fallback to basic analysis without full coordinator
    return await basicIncidentAnalysis(incidentData);
  }

  try {
    const result = await coordinator.analyzeIncident({
      incidentId: incidentData.id || `inc_${Date.now()}`,
      incidentData,
      rawLogs: incidentData.rawLogs,
      relatedAlerts: incidentData.relatedAlerts,
      context: {
        timeRange: incidentData.timeRange,
        affectedAssets: incidentData.affectedAssets || [],
        analystNotes: incidentData.analystNotes
      }
    });

    return NextResponse.json({
      success: true,
      analysisType: 'incident',
      data: result
    });

  } catch (coordinatorError) {
    console.error('[AI Analysis] Coordinator failed, using fallback:', coordinatorError);
    return await basicIncidentAnalysis(incidentData);
  }
}

/**
 * Basic incident analysis fallback (when coordinator unavailable)
 */
async function basicIncidentAnalysis(incidentData: any) {
  const nlpEngine = getNLPEngine();
  
  // Extract text from incident
  const textToAnalyze = [
    JSON.stringify(incidentData),
    ...(incidentData.rawLogs || []).slice(0, 5)
  ].join('\n');

  // Extract entities and classify
  const [entities, classification] = await Promise.all([
    nlpEngine.extractEntities(textToAnalyze),
    nlpEngine.classifyThreat(textToAnalyze)
  ]);

  return NextResponse.json({
    success: true,
    analysisType: 'incident',
    mode: 'basic', // Indicates fallback mode
    data: {
      incidentId: incidentData.id || 'unknown',
      summary: `Incident of type ${incidentData.type || 'unknown'} with severity ${incidentData.severity || 'unknown'}`,
      severityAssessment: classification.severity,
      attackClassification: classification.category,
      extractedIOCs: entities.filter(e => 
        ['IP_ADDRESS', 'DOMAIN', 'HASH_MD5', 'HASH_SHA256', 'URL'].includes(e.type)
      ).map(e => ({ type: e.type, value: e.text, confidence: e.confidence })),
      confidence: classification.confidence,
      aiModelsUsed: ['NLP Engine'],
      warning: 'Full AI coordination not available - results may be limited'
    }
  });
}

/**
 * Process threat intelligence data
 */
async function analyzeThreatIntel(threatData: any, options?: any) {
  const coordinator = getAICoordinator();

  if (!coordinator.isReady()) {
    return await basicThreatIntelAnalysis(threatData);
  }

  try {
    const result = await coordinator.processThreatIntel({
      sourceType: threatData.sourceType || 'manual',
      rawData: threatData.rawData || threatData,
      sourceMetadata: {
        name: threatData.sourceName || 'unknown',
        reliability: threatData.reliability || 0.5,
        timestamp: new Date(threatData.timestamp || Date.now())
      }
    });

    return NextResponse.json({
      success: true,
      analysisType: 'threat-intel',
      data: result
    });

  } catch (error) {
    return await basicThreatIntelAnalysis(threatData);
  }
}

/**
 * Basic threat intel analysis fallback
 */
async function basicThreatIntelAnalysis(threatData: any) {
  const nlpEngine = getNLPEngine();
  
  const rawData = typeof threatData.rawData === 'string' 
    ? threatData.rawData 
    : JSON.stringify(threatData.rawData || threatData);

  // Extract IOCs and classify
  const [iocs, classification] = await Promise.all([
    nlpEngine.extractEntities(rawData),
    nlpEngine.classifyThreat(rawData)
  ]);

  return NextResponse.json({
    success: true,
    analysisType: 'threat-intel',
    mode: 'basic',
    data: {
      processedId: `ti_basic_${Date.now()}`,
      iocs: iocs.map(e => ({
        type: e.type,
        value: e.text,
        confidence: e.confidence,
        threatLevel: e.confidence > 0.9 ? 'high' : e.confidence > 0.7 ? 'medium' : 'low'
      })),
      category: classification.category,
      severity: classification.severity,
      credibility: classification.confidence,
      defensiveMeasures: classification.recommendedActions.slice(0, 5),
      aiModelsUsed: ['NLP Engine']
    }
  });
}

/**
 * Analyze log data for threats and anomalies
 */
async function analyzeLogs(logData: any, options?: any) {
  const mlEngine = getMLEngine();
  const nlpEngine = getNLPEngine();

  const logs = Array.isArray(logData.logs) ? logData.logs : [logData];
  const logText = logs.join('\n');
  
  // Extract features from logs
  const features = extractLogFeatures(logs);

  let anomalyResult = null;
  let entityResult = null;

  // Run ML and NLP in parallel
  const [mlResult, nlpResult] = await Promise.allSettled([
    mlEngine.hasModel('log-anomaly') 
      ? mlEngine.predict('log-anomaly', { features })
      : Promise.reject('No log model'),
    nlpEngine.extractEntities(logText)
  ]);

  if (mlResult.status === 'fulfilled') {
    anomalyResult = mlResult.value;
  }

  if (nlpResult.status === 'fulfilled') {
    entityResult = nlpResult.value;
  }

  return NextResponse.json({
    success: true,
    analysisType: 'logs',
    data: {
      totalLogsAnalyzed: logs.length,
      anomalyDetected: anomalyResult?.prediction === 'anomaly',
      anomalyScore: anomalyResult?.probabilities?.['anomaly'] || 0,
      extractedEntities: entityResult?.length || 0,
      iocs: entityResult?.filter(e => 
        ['IP_ADDRESS', 'DOMAIN', 'URL', 'EMAIL', 'HASH_*'].some(t => e.type.includes(t))
      ) || [],
      recommendations: generateLogRecommendations(anomalyResult, entityResult),
      aiModelsUsed: [
        ...(anomalyResult ? ['ML Engine'] : []),
        ...(entityResult ? ['NLP Engine'] : [])
      ]
    }
  });
}

/**
 * Analyze generic text content
 */
async function analyzeText(textData: any, options?: any) {
  const nlpEngine = getNLPEngine();
  
  const text = typeof textData.text === 'string' 
    ? textData.text 
    : JSON.stringify(textData);

  if (text.length > 100000) {
    return NextResponse.json(
      { error: 'Text too long (max 100000 characters)' },
      { status: 400 }
    );
  }

  // Run multiple NLP analyses in parallel
  const [entities, classification, sentiment, summary] = await Promise.all([
    nlpEngine.extractEntities(text, options?.entityTypes),
    nlpEngine.classifyThreat(text),
    nlpEngine.analyzeSentiment(text),
    Promise.resolve(nlpEngine.generateSummary(text, {
      maxLength: options?.summaryLength || 200,
      sentenceCount: options?.sentenceCount || 5
    }))
  ]);

  return NextResponse.json({
    success: true,
    analysisType: 'text',
    data: {
      originalTextLength: text.length,
      entities: {
        total: entities.length,
        byType: groupBy(entities, 'type'),
        items: entities.slice(0, 50)
      },
      classification,
      sentiment,
      summary,
      language: nlpEngine.detectLanguage(text),
      aiModelsUsed: ['NLP Engine']
    }
  });
}

/**
 * Extract Indicators of Compromise (IOCs) from text
 */
async function extractIOCs(data: any, options?: any) {
  const nlpEngine = getNLPEngine();
  
  const text = typeof data.text === 'string' 
    ? data.text 
    : JSON.stringify(data);

  // Focus on IOC-related entity types only
  const iocTypes = [
    'IP_ADDRESS', 'DOMAIN', 'URL', 'EMAIL',
    'HASH_MD5', 'HASH_SHA1', 'HASH_SHA256',
    'CVE', 'MALWARE_NAME'
  ];

  const entities = await nlpEngine.extractEntities(text, iocTypes as any);

  // Group and structure IOCs
  const groupedIOCs = groupBy(entities, 'type');
  const uniqueIOCs = deduplicateIOCs(entities);

  return NextResponse.json({
    success: true,
    analysisType: 'ioc-extraction',
    data: {
      totalIOCs: uniqueIOCs.length,
      iocGroups: Object.entries(groupedIOCs).map(([type, items]) => ({
        type,
        count: items.length,
        items: items.map(i => ({
          value: i.text,
          confidence: i.confidence,
          metadata: i.metadata
        }))
      })),
      rawIOCs: uniqueIOCs,
      extractionStats: {
        inputTextLength: text.length,
        extractionTimeMs: Date.now(), // Would measure actual time
        confidenceThreshold: options?.minConfidence || 0.7
      },
      aiModelsUsed: ['NLP Engine']
    }
  });
}

// ============================================================
// Helper Functions
// ============================================================

function extractLogFeatures(logs: string[]): number[] {
  // Simple feature extraction from logs
  const logText = logs.join(' ');
  
  return [
    logs.length,                                    // Number of logs
    (logText.match(/error|failed|denied/gi) || []).length / Math.max(logs.length, 1), // Error rate
    (logText.match(/warning|warn/gi) || []).length / Math.max(logs.length, 1), // Warning rate
    (logText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || []).length, // IP count
    (logText.match(/[a-fA-F0-9]{32}/g) || []).length + (logText.match(/[a-fA-F0-9]{40}/g) || []).length, // Hash count
    logText.length / logs.length,                     // Average log length
    new Set(logText.split(/\s+/)).size / Math.max(logText.split(/\s+/).length, 1), // Unique word ratio
    (logText.match(/\d{4}-\d{2}-\d{2}/g) || []).length / Math.max(logs.length, 1) // Date density
  ];
}

function generateLogRecommendations(anomalyResult: any, entities: any[]): string[] {
  const recommendations: string[] = [];

  if (anomalyResult?.prediction === 'anomaly') {
    recommendations.push('⚠️ Anomalous activity detected in logs');
    recommendations.push('Investigate unusual patterns immediately');
  }

  if (entities) {
    const ipCount = entities.filter((e: any) => e.type === 'IP_ADDRESS').length;
    const hashCount = entities.filter((e: any) => 
      ['HASH_MD5', 'HASH_SHA256'].includes(e.type)
    ).length;

    if (ipCount > 10) {
      recommendations.push(`${ipCount} unique IPs detected - review network activity`);
    }
    if (hashCount > 0) {
      recommendations.push(`${hashCount} file hashes found - check for malware indicators`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('No significant threats detected in analyzed logs');
    recommendations.push('Continue standard monitoring procedures');
  }

  return recommendations;
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

function deduplicateIOCs(entities: any[]): any[] {
  const seen = new Set<string>();
  return entities.filter(entity => {
    const key = `${entity.type}:${entity.text.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
