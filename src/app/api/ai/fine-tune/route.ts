// ============================================================
// National SOC Platform - AI Fine-Tuning Module
// Fine-tune AI models on historical SOC data
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// Types
interface TrainingDataset {
  id: string;
  name: string;
  task_type: string;
  date_range: any;
  record_count: number;
  train_size: number;
  validation_size: number;
  test_size: number;
  is_processed: boolean;
  created_by: string;
  created_at: Date;
}

interface ModelVersion {
  id: string;
  name: string;
  base_model: string;
  task_type: string;
  hyperparameters: any;
  metrics: any;
  status: string;
  version: string;
  trained_at: Date;
}

interface FineTuningJob {
  id: string;
  model_version_id: string;
  status: string;
  progress: number;
  logs: string[];
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  result_metrics?: any;
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
      case 'datasets':
        return listDatasets();
      case 'models':
        return listModels(searchParams);
      case 'jobs':
        return listJobs();
      default:
        return getFineTuneStatus();
    }
  } catch (error) {
    console.error('AI Fine-tune API Error:', error);
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
      case 'create-dataset':
        return createDataset(data, auth.userId!);
      case 'start-training':
        return startTraining(data, auth.userId!);
      default:
        return runFineTuning(data, auth.userId!);
    }
  } catch (error) {
    console.error('AI Fine-tune POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Implementation functions
async function listDatasets() {
  const datasets = await db.trainingDataset.findMany({
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: datasets });
}

async function listModels(params: URLSearchParams) {
  const taskType = params.get('task_type');
  
  const whereClause: any = {};
  if (taskType) whereClause.task_type = taskType;

  const models = await db.modelVersion.findMany({
    where: whereClause,
    orderBy: { version: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: models });
}

async function listJobs() {
  const jobs = await db.fineTuningJob.findMany({
    include: {
      model_version: {
        select: { id: true, name: true, base_model: true, task_type: true },
      },
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: jobs });
}

async function getFineTuneStatus() {
  // Get overall fine-tuning status
  const [totalDatasets, processedDatasets, totalModels, activeModels, recentJobs] = await Promise.all([
    db.trainingDataset.count(),
    db.trainingDataset.count({ where: { is_processed: true } }),
    db.modelVersion.count(),
    db.modelVersion.count({ where: { status: 'deployed' } }),
    db.fineTuningJob.findMany({
      where: { status: { in: ['queued', 'running'] } },
      orderBy: { created_at: 'asc' },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    datasets: { total: totalDatasets, ready: processedDatasets },
    models: { total: totalModels, deployed: activeModels },
    active_jobs: recentJobs,
  });
}

async function createDataset(data: any, userId: string) {
  const { name, task_type, date_range_start, date_range_end } = data;

  if (!name || !task_type || !date_range_start || !date_range_end) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const start = new Date(date_range_start);
  const end = new Date(date_range_end);

  if (start >= end) {
    return NextResponse.json(
      { error: 'Start date must be before end date' },
      { status: 400 }
    );
  }

  const dataset = await db.trainingDataset.create({
    data: {
      name,
      task_type,
      date_range: { start, end },
      created_by: userId,
      is_processed: false,
    },
  });

  // Start async data extraction
  extractDataForDataset(dataset.id, task_type, { start, end });

  return NextResponse.json(dataset, { status: 201 });
}

async function startTraining(data: any, userId: string) {
  const { base_model, task_type, dataset_id, hyperparameters } = data;

  if (!base_model || !task_type || !dataset_id) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const dataset = await db.trainingDataset.findUnique({ where: { id: dataset_id } });
  if (!dataset) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  }

  if (!dataset.is_processed) {
    return NextResponse.json(
      { error: 'Dataset still processing' },
      { status: 400 }
    );
  }

  // Create model version
  const modelVersion = await db.modelVersion.create({
    data: {
      name: `${base_model}-${task_type}-${Date.now()}`,
      base_model: base_model,
      task_type: task_type,
      hyperparameters: hyperparameters || getDefaultHyperparams(task_type),
      training_dataset_id: dataset_id,
      version: `v${Date.now()}`,
      trained_by: userId,
      status: 'training',
    },
  });

  // Create training job
  const job = await db.fineTuningJob.create({
    data: {
      model_version_id: modelVersion.id,
      status: 'queued',
      progress: 0,
      logs: [`Job created at ${new Date().toISOString()}`],
    },
  });

  // Execute training asynchronously
  executeTraining(job.id, modelVersion.id);

  return NextResponse.json(job, { status: 201 });
}

async function runFineTuning(data: any, userId: string) {
  // Quick fine-tuning endpoint for common operations
  const { model, task, samples } = data;

  // Simulate fine-tuning process
  const jobId = `ft-${Date.now()}`;

  return NextResponse.json({
    job_id: jobId,
    status: 'queued',
    message: `Fine-tuning ${model} for ${task} with ${samples?.length || 'auto'} samples`,
    estimated_time: '15-30 minutes',
  });
}

async function extractDataForDataset(datasetId: string, taskType: string, dateRange: any) {
  try {
    // Extract historical data based on task type
    let rawData: any[] = [];

    switch (taskType) {
      case 'incident_classification':
        rawData = await extractIncidentData(dateRange);
        break;
      case 'alert_correlation':
        rawData = await extractAlertCorrelationData(dateRange);
        break;
      case 'anomaly_detection':
        rawData = await extractAnomalyDetectionData(dateRange);
        break;
      case 'ss7_fraud_detection':
        rawData = await extractSS7FraudData(dateRange);
        break;
      default:
        rawData = await extractGenericData(dateRange);
    }

    // Calculate splits
    const total = rawData.length;
    const trainSize = Math.floor(total * 0.8);
    const valSize = Math.floor(total * 0.1);
    const testSize = total - trainSize - valSize;

    // Update dataset
    await db.trainingDataset.update({
      where: { id: datasetId },
      data: {
        record_count: total,
        train_size: trainSize,
        validation_size: valSize,
        test_size: testSize,
        is_processed: true,
      },
    });

    console.log(`Dataset ${datasetId} complete: ${total} records`);
  } catch (error) {
    console.error(`Dataset extraction failed:`, error);
    
    await db.trainingDataset.update({
      where: { id: datasetId },
      data: { is_processed: false },
    });
  }
}

async function executeTraining(jobId: string, modelVersionId: string) {
  try {
    // Update to running
    await db.fineTuningJob.update({
      where: { id: jobId },
      data: { status: 'running', started_at: new Date() },
    });

    // Simulate training epochs
    const epochs = 3;
    for (let epoch = 0; epoch < epochs; epoch++) {
      const progress = 25 + ((epoch + 1) / epochs) * 70;
      
      await db.fineTuningJob.update({
        where: { id: jobId },
        data: {
          progress,
          current_epoch: epoch + 1,
          total_epochs: epochs,
          logs: { push: `[${new Date().toISOString()}] Epoch ${epoch + 1}/${epochs} complete` },
        },
      });

      // Simulate training time
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Complete training
    const metrics = generateMockMetrics();

    await db.fineTuningJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        result_metrics: metrics,
        logs: { push: `[${new Date().toISOString()}] Training completed successfully` },
      },
    });

    await db.modelVersion.update({
      where: { id: modelVersionId },
      data: {
        status: 'ready',
        metrics,
        trained_at: new Date(),
      },
    });

  } catch (error) {
    console.error(`Training failed for job ${jobId}:`, error);

    await db.fineTuningJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date(),
      },
    });

    await db.modelVersion.update({
      where: { id: modelVersionId },
      data: { status: 'failed' },
    });
  }
}

// Data extraction functions
async function extractIncidentData(dateRange: any): Promise<any[]> {
  const incidents = await db.incident.findMany({
    where: {
      created_at: { gte: dateRange.start, lte: dateRange.end },
      status: { notIn: ['CLOSED', 'FALSE_POSITIVE'] },
    },
    take: 5000,
    include: { alerts: true },
  });

  return incidents.map(inc => ({
    input: { title: inc.title, description: inc.description, severity: inc.severity },
    output: { category: inferCategory(inc), priority: inferPriority(inc.severity) },
  }));
}

async function extractAlertCorrelationData(dateRange: any): Promise<any[]> {
  // Simplified correlation data extraction
  return [];
}

async function extractAnomalyDetectionData(dateRange: any): Promise<any[]> {
  // Simplified anomaly detection data extraction
  return [];
}

async function extractSS7FraudData(dateRange: any): Promise<any[]> {
  const messages = await db.sS7Message.findMany({
    where: { timestamp: { gte: dateRange.start, lte: dateRange.end } },
    take: 10000,
  });

  return messages.map(msg => ({
    input: {
      message_type: msg.messageType,
      calling_number: msg.callingNumber,
      called_number: msg.calledNumber,
      imsi: msg.imsi,
    },
    output: detectFraudIndicators(msg),
  }));
}

async function extractGenericData(dateRange: any): Promise<any[]> {
  return [];
}

// Helper functions
function inferCategory(incident: any): string {
  const text = `${incident.title} ${incident.description}`.toLowerCase();
  
  if (/malware|trojan|ransomware/.test(text)) return 'malware';
  if (/phishing|credential/.test(text)) return 'phishing';
  if (/ddos|denial/.test(text)) return 'ddos';
  if (/unauthorized|intrusion/.test(text)) return 'intrusion';
  
  return 'other';
}

function inferPriority(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'P0', HIGH: 'P1', MEDIUM: 'P2', LOW: 'P3'
  };
  return map[severity] || 'P3';
}

function detectFraudIndicators(msg: any): any {
  let confidence = 0;
  const riskFactors: string[] = [];

  // Check patterns
  if (/^900|^9[01]/.test(msg.calledNumber)) {
    riskFactors.push('Premium destination');
    confidence += 30;
  }

  const hour = new Date(msg.timestamp).getHours();
  if (hour >= 0 && hour < 6) {
    riskFactors.push('Off-hours activity');
    confidence += 15;
  }

  if (msg.messageType === 'SendRoutingInfoForSM') {
    riskFactors.push('Location query');
    confidence += 20;
  }

  return {
    is_fraudulent: confidence > 50,
    fraud_type: confidence > 70 ? 'IRSF' : confidence > 50 ? 'SUSPICIOUS' : null,
    confidence: Math.min(100, confidence),
    risk_factors: riskFactors,
  };
}

function getDefaultHyperparams(taskType: string): any {
  const defaults: Record<string, any> = {
    incident_classification: { learning_rate: 0.001, batch_size: 32, epochs: 10 },
    anomaly_detection: { learning_rate: 0.0005, batch_size: 64, epochs: 20 },
    entity_extraction: { learning_rate: 0.0005, batch_size: 16, epochs: 15 },
    ss7_fraud_detection: { learning_rate: 0.001, batch_size: 64, epochs: 15 },
  };

  return defaults[taskType] || { learning_rate: 0.001, batch_size: 32, epochs: 10 };
}

function generateMockMetrics(): any {
  return {
    accuracy: 0.85 + Math.random() * 0.1,
    precision: 0.82 + Math.random() * 0.12,
    recall: 0.80 + Math.random() * 0.15,
    f1_score: 0.83 + Math.random() * 0.12,
    loss: 0.3 + Math.random() * 0.2,
    avg_inference_time_ms: 150 + Math.random() * 100,
  };
}
