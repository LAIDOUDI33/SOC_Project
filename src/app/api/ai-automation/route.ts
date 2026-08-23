import { NextRequest, NextResponse } from 'next/server'
import { 
  aiAutomationEngine, 
  AI_MODEL_REGISTRY, 
  AUTOMATED_PLAYBOOKS,
  AITask
} from '@/lib/ai-automation/ai-engine'

// GET /api/ai-automation - Get AI automation data and status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'overview'

    switch (type) {
      case 'models':
        return NextResponse.json({
          success: true,
          data: AI_MODEL_REGISTRY.map(m => ({
            id: m.id,
            name: m.name,
            version: m.version,
            type: m.type,
            status: m.status,
            accuracy: Math.round(m.accuracy * 1000) / 10,
            f1Score: Math.round(m.f1Score * 1000) / 10,
            inferenceTime: m.inferenceTime,
            lastTrained: m.lastTrained,
            description: m.description
          }))
        })

      case 'playbooks':
        return NextResponse.json({
          success: true,
          data: AUTOMATED_PLAYBOOKS.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            executionCount: p.executionCount,
            successRate: Math.round(p.successRate * 1000) / 10,
            avgExecutionTime: p.avgExecutionTime,
            lastExecuted: p.lastExecuted,
            triggerCount: p.triggerConditions.length,
            actionCount: p.actions.length
          }))
        })

      case 'metrics': {
        const metrics = aiAutomationEngine.getMetrics()
        return NextResponse.json({ success: true, data: metrics })
      }

      case 'health': {
        const health = aiAutomationEngine.getSystemHealth()
        return NextResponse.json({ success: true, data: health })
      }

      case 'predictions': {
        // Generate a sample prediction
        const task = aiAutomationEngine.enqueueTask({
          name: 'Sample Threat Prediction',
          type: 'prediction',
          priority: 'medium',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 15,
          status: 'pending',
          // Store model config in result metadata instead
          result: {
            modelId: 'threat-classifier-v3',
            input: {
              protocol_type: 'SS7',
              source_country: 'unknown',
              destination_pattern: 'premium_rate',
              frequency: 150,
              subscriber_risk_score: 0.85
            },
            prediction: 'High probability of SS7-based fraud attempt detected'
          }
        })

        // Wait for completion (in production, would use polling or WebSocket)
        await new Promise(resolve => setTimeout(resolve, 2000))

        return NextResponse.json({
          success: true,
          data: {
            taskId: task.id,
            status: task.status,
            result: task.result || 'Processing...'
          }
        })
      }

      case 'anomalies': {
        const detectionTask = aiAutomationEngine.enqueueTask({
          name: 'Anomaly Detection Scan',
          type: 'detection',
          priority: 'high',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 30,
          status: 'pending',
          result: {
            dataSource: 'network_flow',
            maxSeverity: 'critical',
            timeWindow: '1h'
          }
        })

        await new Promise(resolve => setTimeout(resolve, 2500))

        return NextResponse.json({
          success: true,
          data: {
            taskId: detectionTask.id,
            anomalies: detectionTask.result || [],
            count: Array.isArray(detectionTask.result) ? detectionTask.result.length : 0
          }
        })
      }

      case 'nlp-analysis': {
        const text = searchParams.get('text') || ''
        
        if (!text) {
          return NextResponse.json(
            { success: false, error: 'Text parameter required for NLP analysis' },
            { status: 400 }
          )
        }

        const nlpResult = await aiAutomationEngine.processNLP(text, [
          { type: 'entity_extraction', enabled: true, confidenceThreshold: 0.8 },
          { type: 'sentiment_analysis', enabled: true, confidenceThreshold: 0.7 },
          { type: 'summarization', enabled: true, confidenceThreshold: 0.6 },
          { type: 'classification', enabled: true, confidenceThreshold: 0.75 }
        ])

        return NextResponse.json({ success: true, data: nlpResult })
      }

      case 'self-healing': {
        const actions = [
          {
            component: 'wazuh-siem',
            issueType: 'high_memory_usage',
            detectionMethod: 'resource_monitoring',
            remediationSteps: ['Restart non-critical processes', 'Clear cache', 'Optimize queries'],
            rollbackPlan: 'Restore from snapshot if issues persist',
            successCriteria: ['Memory usage below 80%', 'No data loss'],
            impact: 'low' as const
          },
          {
            component: 'elasticsearch-cluster',
            issueType: 'disk_space_critical',
            detectionMethod: 'storage_monitoring',
            remediationSteps: ['Delete old indices', 'Compress logs', 'Archive to cold storage'],
            rollbackPlan: 'Restore deleted indices from backup',
            successCriteria: ['Disk usage below 85%', 'Search performance maintained'],
            impact: 'medium' as const
          },
          {
            component: 'kafka-broker',
            issueType: 'consumer_lag_high',
            detectionMethod: 'metrics_analysis',
            remediationSteps: ['Scale consumer group', 'Optimize partition assignment', 'Increase batch size'],
            rollbackPlan: 'Revert consumer configuration',
            successCriteria: ['Consumer lag < 1000 messages', 'No message loss'],
            impact: 'medium' as const
          },
          {
            component: 'postgresql-primary',
            issueType: 'connection_pool_exhausted',
            detectionMethod: 'connection_monitoring',
            remediationSteps: ['Kill idle connections', 'Increase pool size', 'Identify leaky queries'],
            rollbackPlan: 'Restore original pool configuration',
            successCriteria: ['Available connections > 20%', 'Query latency normal'],
            impact: 'high' as const
          }
        ]

        return NextResponse.json({ success: true, data: actions })
      }

      case 'tasks': {
        const tasks = aiAutomationEngine['completedTasks'].slice(-20)
        const queue = aiAutomationEngine['taskQueue']
        const running = Array.from(aiAutomationEngine['runningTasks'].values())

        return NextResponse.json({
          success: true,
          data: {
            completed: tasks,
            queued: queue,
            running,
            stats: {
              totalCompleted: aiAutomationEngine['completedTasks'].length,
              queueLength: queue.length,
              runningCount: running.length
            }
          }
        })
      }

      default:
        // Return overview with all key information
        const metrics = aiAutomationEngine.getMetrics()
        const health = aiAutomationEngine.getSystemHealth()

        return NextResponse.json({
          success: true,
          data: {
            models: {
              total: health.modelsTotal,
              ready: health.modelsReady,
              list: AI_MODEL_REGISTRY.slice(0, 5).map(m => ({
                id: m.id,
                name: m.name,
                accuracy: Math.round(m.accuracy * 1000) / 10,
                status: m.status
              }))
            },
            playbooks: {
              total: AUTOMATED_PLAYBOOKS.length,
              active: health.activePlaybooks,
              topByExecution: AUTOMATED_PLAYBOOKS
                .sort((a, b) => b.executionCount - a.executionCount)
                .slice(0, 5)
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  executions: p.executionCount,
                  successRate: Math.round(p.successRate * 1000) / 10
                }))
            },
            metrics,
            health,
            recentActivity: generateRecentActivity()
          }
        })
    }
  } catch (error) {
    console.error('AI Automation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/ai-automation - Execute AI operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'run-prediction': {
        const { modelId, input } = body
        
        if (!modelId || !input) {
          return NextResponse.json(
            { success: false, error: 'modelId and input required' },
            { status: 400 }
          )
        }

        const task = aiAutomationEngine.enqueueTask({
          name: `Prediction: ${modelId}`,
          type: 'prediction',
          priority: body.priority || 'medium',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 20,
          status: 'pending',
          result: { modelId, input }
        })

        return NextResponse.json({
          success: true,
          data: {
            taskId: task.id,
            message: 'Prediction task queued',
            status: task.status
          }
        })
      }

      case 'execute-playbook': {
        const { playbookId, priority, config } = body
        
        if (!playbookId) {
          return NextResponse.json(
            { success: false, error: 'playbookId required' },
            { status: 400 }
          )
        }

        const task = aiAutomationEngine.enqueueTask({
          name: `Execute Playbook: ${playbookId}`,
          type: 'response',
          priority: priority || 'high',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 300,
          status: 'pending',
          result: { playbookId, ...config }
        })

        return NextResponse.json({
          success: true,
          data: {
            taskId: task.id,
            message: 'Playbook execution queued',
            status: task.status
          }
        })
      }

      case 'run-detection': {
        const { dataSource, maxSeverity } = body

        const task = aiAutomationEngine.enqueueTask({
          name: 'Anomaly Detection Scan',
          type: 'detection',
          priority: 'high',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 45,
          status: 'pending',
          result: { dataSource, maxSeverity }
        })

        return NextResponse.json({
          success: true,
          data: {
            taskId: task.id,
            message: 'Detection scan initiated',
            status: task.status
          }
        })
      }

      case 'retrain-model': {
        const { modelId, additionalData } = body

        if (!modelId) {
          return NextResponse.json(
            { success: false, error: 'modelId required' },
            { status: 400 }
          )
        }

        const task = aiAutomationEngine.enqueueTask({
          name: `Retrain Model: ${modelId}`,
          type: 'learning',
          priority: 'low',
          status: 'pending',
          confidence: 0,
          dependencies: [],
          estimatedDuration: 86400, // 24 hours in production
          config: { modelId, additionalData }
        })

        return NextResponse.json({
          success: true,
          data: {
            taskId: task.id,
            message: 'Model retraining scheduled',
            estimatedTime: '24-48 hours',
            status: task.status
          }
        })
      }

      case 'nlp-process': {
        const { text, tasks } = body

        if (!text) {
          return NextResponse.json(
            { success: false, error: 'Text content required' },
            { status: 400 }
          )
        }

        const nlpResult = await aiAutomationEngine.processNLP(text, tasks || [
          { type: 'entity_extraction', enabled: true, confidenceThreshold: 0.8 },
          { type: 'sentiment_analysis', enabled: true, confidenceThreshold: 0.7 },
          { type: 'classification', enabled: true, confidenceThreshold: 0.75 }
        ])

        return NextResponse.json({ success: true, data: nlpResult })
      }

      case 'self-heal': {
        const { component, issueType } = body

        if (!component || !issueType) {
          return NextResponse.json(
            { success: false, error: 'component and issueType required' },
            { status: 400 }
          )
        }

        const healingResult = await aiAutomationEngine.executeSelfHealing(component, issueType)

        return NextResponse.json({
          success: !!healingResult,
          data: healingResult || {
            message: `No self-healing action found for ${component}/${issueType}`,
            suggestion: 'Manual intervention may be required'
          }
        })
      }

      case 'create-playbook': {
        const { name, description, triggers, actions } = body

        if (!name || !triggers || !actions) {
          return NextResponse.json(
            { success: false, error: 'name, triggers, and actions required' },
            { status: 400 }
          )
        }

        // In production, this would save to database
        const newPlaybook = {
          id: `pb-custom-${Date.now()}`,
          name,
          description: description || '',
          triggerConditions: triggers,
          actions: actions,
          status: 'testing' as const,
          executionCount: 0,
          successRate: 0,
          avgExecutionTime: 0,
          createdBy: 'user',
          version: 1
        }

        return NextResponse.json({
          success: true,
          data: newPlaybook,
          message: 'Playbook created successfully. Set status to "active" after testing.'
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI Automation POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate recent activity mock data
function generateRecentActivity(): Array<{
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  icon: string;
  severity: string;
  duration: number;
  automated: boolean;
}> {
  const activities: Array<{
    id: string;
    timestamp: Date;
    type: string;
    description: string;
    icon: string;
    severity: string;
    duration: number;
    automated: boolean;
  }> = []
  const actionTypes = [
    { type: 'prediction', desc: 'Threat classification completed', icon: 'brain' },
    { type: 'response', desc: 'DDoS mitigation playbook executed', icon: 'shield' },
    { type: 'detection', desc: 'Anomaly detected and contained', icon: 'radar' },
    { type: 'analysis', desc: 'Trend analysis report generated', icon: 'chart' },
    { type: 'learning', desc: 'Model retraining completed', icon: 'refresh' },
    { type: 'remediation', desc: 'Self-healing action executed', icon: 'wrench' }
  ]

  for (let i = 0; i < 10; i++) {
    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)]
    activities.push({
      id: `activity-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      type: action.type,
      description: action.desc,
      icon: action.icon,
      severity: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)],
      duration: Math.floor(Math.random() * 30000) + 1000,
      automated: Math.random() > 0.2
    })
  }

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}
