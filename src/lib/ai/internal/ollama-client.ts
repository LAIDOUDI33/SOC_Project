/**
 * OLLAMA Client - Self-Hosted LLM Integration
 * 
 * REAL IMPLEMENTATION: Connects to local Ollama instance (localhost:11434)
 * No external API calls - all inference runs locally
 * 
 * Supported Models:
 * - Llama 3.1/3.2 (8B, 70B, 405B)
 * - Mistral (7B)
 * - CodeLlama
 * - Qwen 2.5
 * - Custom fine-tuned models
 * 
 * @version 1.0.0
 * @module ai/internal/ollama-client
 */

// ============================================================
// Types & Interfaces
// ============================================================

export interface OllamaConfig {
  host: string;              // Default: 'http://localhost:11434'
  model: string;             // 'llama3.1:70b', 'mistral:7b', etc.
  timeout?: number;          // Request timeout in ms (default: 120000 for LLMs)
  numCtx?: number;           // Context window size (default: 8192)
  temperature?: number;      // 0.0-1.0 (default: 0.1 for deterministic output)
  numPredict?: number;       // Max tokens to generate (default: 2048)
  enableGPU?: boolean;       // Use GPU acceleration if available
  keepAlive?: string;        // Model stay in memory (default: '5m')
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: OllamaMessage[];
  stream?: boolean;
  options?: Partial<OllamaConfig>;
}

export interface ChatResponse {
  model: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  totalDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
}

export interface StreamChunk {
  model: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
}

export interface GenerateRequest {
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  options?: Partial<OllamaConfig>;
}

export interface GenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  totalDuration?: number;
  loadDuration?: number;
  sampleCount?: number;
  sampleDuration?: number;
  promptEvalCount?: number;
  promptEvalDuration?: number;
  evalCount?: number;
  evalDuration?: number;
}

export interface ModelInfo {
  name: string;
  modifiedAt: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaStatus {
  running: boolean;
  version: string;
  modelsLoaded: string[];
  totalMemoryMB: number;
  gpuAvailable: boolean;
}

// ============================================================
// OllamaClient Class
// ============================================================

export class OllamaClient {
  private config: OllamaConfig;
  private abortController: AbortController | null = null;

  constructor(config: OllamaConfig) {
    this.config = {
      host: config.host || 'http://localhost:11434',
      model: config.model || 'llama3.1:8b',
      timeout: config.timeout || 120000,
      numCtx: config.numCtx || 8192,
      temperature: config.temperature || 0.1,
      numPredict: config.numPredict || 2048,
      enableGPU: config.enableGPU ?? true,
      keepAlive: config.keepAlive || '5m'
    };
  }

  // ============================================================
  // Connection & Health Checks
  // ============================================================

  /**
   * Check if Ollama server is running and accessible
   */
  async healthCheck(): Promise<OllamaStatus> {
    try {
      const response = await fetch(`${this.config.host}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.status}`);
      }

      const versionData = await response.json();
      
      // Get loaded models
      const psResponse = await fetch(`${this.config.host}/api/ps`, {
        signal: AbortSignal.timeout(5000)
      });
      const psData = await psResponse.json();
      
      return {
        running: true,
        version: versionData.version || 'unknown',
        modelsLoaded: psData.models?.map((m: any) => m.name) || [],
        totalMemoryMB: this.estimateMemoryUsage(psData.models || []),
        gpuAvailable: true // Assume GPU if Ollama is running with CUDA
      };
    } catch (error) {
      return {
        running: false,
        version: 'unknown',
        modelsLoaded: [],
        totalMemoryMB: 0,
        gpuAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Wait for Ollama to be ready (useful during startup)
   */
  async waitForReady(maxRetries = 30, intervalMs = 1000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.healthCheck();
      if (status.running) return true;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }

  // ============================================================
  // Model Management
  // ============================================================

  /**
   * List all available models in Ollama
   */
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.config.host}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Pull (download) a model from Ollama registry
   * Supports progress tracking via callback
   */
  async pullModel(
    modelName: string, 
    onProgress?: (status: { status: string; completed: number; total: number }) => void
  ): Promise<void> {
    const response = await fetch(`${this.config.host}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: this.createAbortSignal()
    });

    if (!response.ok && !response.body) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    // Stream progress updates
    if (response.body && onProgress) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const lines = decoder.decode(value).split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const status = JSON.parse(line);
            onProgress(status);
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }
  }

  /**
   * Show detailed information about a specific model
   */
  async showModelInfo(modelName: string): Promise<any> {
    const response = await fetch(`${this.config.host}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: this.createAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete a model from Ollama
   */
  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.config.host}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: this.createAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.statusText}`);
    }
  }

  // ============================================================
  // Text Generation (Single Prompt)
  // ============================================================

  /**
   * Generate text from a single prompt
   */
  async generate(
    prompt: string, 
    options?: Partial<GenerateRequest>
  ): Promise<GenerateResponse> {
    const requestBody: GenerateRequest = {
      prompt,
      system: options?.system,
      template: options?.template,
      context: options?.context,
      stream: false,
      raw: options?.raw || false,
      options: {
        temperature: options?.options?.temperature ?? this.config.temperature,
        num_predict: options?.options?.numPredict ?? this.config.numPredict,
        num_ctx: this.config.numCtx,
        ...options?.options
      }
    };

    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: this.createAbortSignal()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama generate failed (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Generate text with streaming (for real-time display)
   */
  async *generateStream(
    prompt: string,
    options?: Partial<GenerateRequest>
  ): AsyncGenerator<StreamChunk> {
    const requestBody: GenerateRequest = {
      prompt,
      system: options?.system,
      stream: true,
      options: {
        temperature: options?.options?.temperature ?? this.config.temperature,
        num_predict: options?.options?.numPredict ?? this.config.numPredict,
        num_ctx: this.config.numCtx,
        ...options?.options
      }
    };

    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: this.createAbortSignal()
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama generate stream failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  // ============================================================
  // Chat Completion (Multi-turn Conversation)
  // ============================================================

  /**
   * Chat completion with full conversation history
   */
  async chat(messages: OllamaMessage[], options?: Partial<ChatRequest>): Promise<ChatResponse> {
    const requestBody: ChatRequest = {
      messages,
      model: this.config.model,
      stream: options?.stream || false,
      options: {
        temperature: options?.options?.temperature ?? this.config.temperature,
        num_predict: options?.options?.numPredict ?? this.config.numPredict,
        num_ctx: this.config.numCtx,
        keep_alive: this.config.keepAlive,
        ...options?.options
      }
    };

    const response = await fetch(`${this.config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: this.createAbortSignal()
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama chat failed (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(
    messages: OllamaMessage[],
    options?: Partial<ChatRequest>
  ): AsyncGenerator<StreamChunk> {
    const requestBody: ChatRequest = {
      messages,
      model: this.config.model,
      stream: true,
      options: {
        temperature: options?.options?.temperature ?? this.config.temperature,
        num_predict: options?.options?.numPredict ?? this.config.numPredict,
        num_ctx: this.config.numCtx,
        keep_alive: this.config.keepAlive,
        ...options?.options
      }
    };

    const response = await fetch(`${this.config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: this.createAbortSignal()
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama chat stream failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }

  // ============================================================
  // SOC-Specific Methods
  // ============================================================

  /**
   * Analyze a security incident using LLM
   * Returns structured analysis with recommendations
   */
  async analyzeIncident(incidentData: any): Promise<IncidentAnalysis> {
    const systemPrompt = `You are an expert SOC (Security Operations Center) analyst for a telecommunications company.
Your task is to analyze security incidents and provide actionable insights.

For each incident, you MUST respond with valid JSON in this exact format:
{
  "summary": "Brief incident summary (2-3 sentences)",
  "severity": "critical|high|medium|low",
  "confidence": 0.0-1.0,
  "attackType": "MITRE ATT&CK technique name",
  "tactics": ["tactic1", "tactic2"],
  "iocs": [{"type": "ip|domain|hash|email", "value": "..."}],
  "affectedAssets": ["asset1", "asset2"],
  "rootCauseAnalysis": "Likely root cause",
  "recommendedActions": [
    {"priority": "immediate|short-term|long-term", "action": "...", "description": "..."}
  ],
  "relatedThreats": ["threat1", "threat2"],
  "complianceImpact": ["ARTP-X", "ANSSI-Y"]
}

Rules:
- Be specific and actionable
- Reference MITRE ATT&CK framework when applicable
- Consider telecom-specific threats (SS7 fraud, SIM swapping, etc.)
- Always include IOCs if present in the data
- Assess compliance impact for ARTP/ANSSI frameworks`;

    const userPrompt = `Analyze the following security incident:

**Incident Details:**
${JSON.stringify(incidentData, null, 2)}

**Context:**
- This is a telecommunications SOC platform
- We monitor SS7 signaling, network traffic, endpoints, and applications
- Compliance frameworks: ARTP (Algeria), ANSSI (France), NIST
- Time: ${new Date().toISOString()}

Provide your analysis in the required JSON format.`;

    try {
      const response = await this.generate(userPrompt, {
        system: systemPrompt,
        options: { temperature: 0.1 } // Low temp for consistent structured output
      });

      // Parse the JSON response
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if JSON parsing fails
      return {
        summary: response.response.substring(0, 500),
        severity: 'medium',
        confidence: 0.6,
        attackType: 'unknown',
        tactics: [],
        iocs: [],
        affectedAssets: [],
        rootCauseAnalysis: response.response,
        recommendedActions: [{ priority: 'immediate', action: 'investigate', description: 'Manual review required' }],
        relatedThreats: [],
        complianceImpact: []
      };
    } catch (error) {
      console.error('[Ollama] Incident analysis failed:', error);
      throw new Error(`Failed to analyze incident: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate executive summary report from incident data
   */
  async generateExecutiveReport(
    incidents: any[],
    period: { start: Date; end: Date },
    metrics: any
  ): Promise<string> {
    const systemPrompt = `You are a senior security analyst writing reports for C-suite executives.
Generate clear, concise executive summaries that focus on:
- Business impact (revenue, reputation, regulatory)
- Key metrics and trends
- Risk assessment
- Strategic recommendations

Use professional but accessible language. Avoid excessive technical jargon.
Format the report in Markdown with clear sections.`;

    const userPrompt = `Generate an executive security report for the following period:

**Period:** ${period.start.toISOString()} to ${period.end.toISOString()}

**Key Metrics:**
${JSON.stringify(metrics, null, 2)}

**Notable Incidents (${incidents.length} total):**
${incidents.slice(0, 20).map((inc, i) => `${i + 1}. [${inc.severity?.toUpperCase()}] ${inc.title || inc.type}: ${inc.summary || 'No summary'}`).join('\n')}

**Requirements:**
1. Executive Summary (2-3 paragraphs)
2. Key Metrics Dashboard (table format)
3. Incident Overview (top 10 by severity)
4. Threat Landscape Analysis
5. Risk Assessment (High/Medium/Low)
6. Recommendations (Immediate / 30-day / 90-day)
7. Compliance Status (ARTP/ANSSI)

Format as professional Markdown document.`;

    const response = await this.generate(userPrompt, {
      system: systemPrompt,
      options: { 
        temperature: 0.3, // Slightly more creative for reports
        numPredict: 4096 // Longer output for reports
      }
    });

    return response.response;
  }

  /**
   * Explain technical security concepts in plain language
   */
  async explainTechnicalConcept(concept: string, audience: 'executive' | 'analyst' | 'technical'): Promise<string> {
    const audienceInstructions = {
      executive: 'Explain in business terms, focus on risk and impact, avoid jargon',
      analyst: 'Explain with moderate technical detail, include detection/response implications',
      technical: 'Provide deep technical explanation, include code examples where relevant'
    };

    const prompt = `Explain the following security concept for a ${audience} audience:

**Concept:** ${concept}

**Guidelines:** ${audienceInstructions[audience]}

Provide:
1. Simple definition
2. How it works (simplified)
3. Real-world example in telecom context
4. Why it matters for our SOC
5. Detection/mitigation strategies`;

    const response = await this.generate(prompt, {
      options: { temperature: 0.2 }
    });

    return response.response;
  }

  /**
   * Suggest SOAR playbook actions based on incident type
   */
  async suggestPlaybookActions(
    incidentType: string,
    context: any
  ): Promise<PlaybookSuggestion[]> {
    const systemPrompt = `You are a SOAR (Security Orchestration, Automation, and Response) expert.
Suggest automated response actions for security incidents.

Each suggestion MUST be in this JSON format:
{
  "actions": [
    {
      "name": "Action Name",
      "type": "isolate|block|collect|notify|remediate|escalate",
      "target": "endpoint|network|user|account|service",
      "automation": "full|partial|manual",
      "priority": 1-5 (1=highest)",
      "description": "What this action does",
      "command": "Example command or API call",
      "rollback": "How to undo this action"
    }
  ]
}`;

    const prompt = `Suggest SOAR playbook actions for:

**Incident Type:** ${incidentType}
**Context:** ${JSON.stringify(context)}

Consider:
- Our available integrations: EDR (GRR/Osquery), SIEM (Wazuh), NSM (Suricata), SOAR (TheHive)
- Telecom environment specifics
- Minimize business disruption
- Preserve evidence for forensics`;

    const response = await this.generate(prompt, {
      system: systemPrompt,
      options: { temperature: 0.1 }
    });

    try {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.actions || [];
      }
    } catch {
      // Return empty array if parsing fails
    }

    return [];
  }

  // ============================================================
  // Embeddings (for RAG / Semantic Search)
  // ============================================================

  /**
   * Generate embeddings for text (useful for semantic search, RAG)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.host}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Good embedding model for Ollama
        prompt: text
      }),
      signal: this.createAbortSignal()
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  private createAbortSignal(): AbortSignal {
    this.abortController = new AbortController();
    return setTimeout(() => this.abortController?.abort(), this.config.timeout) as unknown as AbortSignal;
  }

  private estimateMemoryUsage(models: any[]): number {
    // Rough estimation based on model sizes
    return models.reduce((total, model) => {
      const sizeGB = (model.size || 0) / (1024 * 1024 * 1024);
      return total + sizeGB * 1024; // Convert to MB
    }, 0);
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Get current configuration
   */  
  getConfig(): Readonly<OllamaConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================
// Response Types
// ============================================================

export interface IncidentAnalysis {
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  attackType: string;
  tactics: string[];
  iocs: Array<{ type: string; value: string }>;
  affectedAssets: string[];
  rootCauseAnalysis: string;
  recommendedActions: Array<{
    priority: 'immediate' | 'short-term' | 'long-term';
    action: string;
    description: string;
  }>;
  relatedThreats: string[];
  complianceImpact: string[];
}

export interface PlaybookSuggestion {
  name: string;
  type: 'isolate' | 'block' | 'collect' | 'notify' | 'remediate' | 'escalate';
  target: 'endpoint' | 'network' | 'user' | 'account' | 'service';
  automation: 'full' | 'partial' | 'manual';
  priority: number;
  description: string;
  command: string;
  rollback: string;
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Create configured Ollama client instance
 */
export function createOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  return new OllamaClient({
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    ...config
  });
}

// Singleton instance for application-wide use
let ollamaInstance: OllamaClient | null = null;

export function getOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  if (!ollamaInstance) {
    ollamaInstance = createOllamaClient(config);
  }
  return ollamaInstance;
}

export default OllamaClient;
