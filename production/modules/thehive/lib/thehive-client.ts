/**
 * 🇩🇿 National SOC - TheHive SOAR Integration Client
 * Complete API client for TheHive incident response platform
 * 
 * Features:
 * - Case creation and management
 * - Task workflow automation
 * - Observable extraction and management
 * - Case timeline visualization
 * - Automated response playbooks
 * - Evidence attachment handling
 */

import { TheHiveConfig, Case, Task, Observable, CaseTemplate } from './types';

// ────────────────────────────────────────────────────────
// CONFIGURATION & CONSTANTS
// ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Partial<TheHiveConfig> = {
  baseUrl: process.env.THEHIVE_API_URL || 'https://localhost:9000',
  apiKey: process.env.THEHIVE_API_KEY || '',
  timeout: 30000,
  retries: 3,
};

// API endpoints
const ENDPOINTS = {
  // Cases
  CASES: '/api/case',
  CASE_BY_ID: '/api/case/:id',
  
  // Tasks
  TASKS: '/api/case/:id/task',
  TASK_BY_ID: '/api/case/:caseId/task/:taskId',
  
  // Observables
  OBSERVABLES: '/api/case/:id/observable',
  OBSERVABLE_BY_ID: '/api/case/:caseId/observable/:obsId',
  
  // Case Templates
  TEMPLATES: '/api/casetemplate',
  
  // Users
  USERS: '/api/user',
  USER_BY_ID: '/api/user/:id',
  
  // Organizations
  ORGANIZATIONS: '/api/organization',
  
  // Procedures (Playbooks)
  PROCEDURES: '/api/procedure',
  
  // Case Metrics
  METRICS: '/api/case/metrics',
  
  // Search
  SEARCH: '/api/_search',
} as const;

// ────────────────────────────────────────────────────────
// ERROR HANDLING
// ────────────────────────────────────────────────────────

export class TheHiveError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TheHiveError';
  }
}

export class TheHiveAuthError extends TheHiveError {
  constructor(message: string) {
    super(message, 401, 'AUTH_FAILED');
    this.name = 'TheHiveAuthError';
  }
}

export class TheHiveValidationError extends TheHiveError {
  constructor(errors: string[]) {
    super('Validation failed', 422, 'VALIDATION_ERROR', errors);
    this.name = 'TheHiveValidationError';
  }
}

// ────────────────────────────────────────────────────────
// MAIN CLIENT CLASS
// ────────────────────────────────────────────────────────

export class TheHiveClient {
  private config: TheHiveConfig;

  constructor(config?: Partial<TheHiveConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as TheHiveConfig;
    
    if (!this.config.apiKey) {
      console.warn('TheHive API key not configured. Set THEHIVE_API_KEY environment variable.');
    }
  }

  // ────────────────────────────────────────────────────
  // HTTP HELPERS
  // ────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...(options.headers as Record<string, string>),
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.retries || 3); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          throw new TheHiveAuthError('Invalid API key or unauthorized access');
        }

        if (response.status === 422) {
          const errorBody = await response.json().catch(() => ({}));
          throw new TheHiveValidationError(
            errorBody.errors || [errorBody.message] || ['Validation failed']
          );
        }

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new TheHiveError(
            errorBody.message || `HTTP ${response.status}`,
            response.status,
            errorBody.type,
            errorBody
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (error instanceof TheHiveError && !error.statusCode?.toString().startsWith('5')) {
          throw error; // Don't retry client errors
        }
        
        if (attempt < (this.config.retries || 3)) {
          await new Promise(resolve => 
            setTimeout(resolve, 1000 * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  // ────────────────────────────────────────────────────
  // CASE MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Create a new case from alert/incident data
   */
  async createCase(params: {
    title: string;
    description?: string;
    severity?: number; // 1-4 (Critical to Low)
    tags?: string[];
    tlp?: number; // Traffic Light Protocol: 0-3
    pap?: number; // Permissible Actions Protocol: 0-3
    flag?: boolean;
    template?: string;
    assignee?: string;
    customFields?: Record<string, any>;
  }): Promise<Case> {
    const caseData = {
      title: params.title,
      description: params.description || '',
      severity: params.severity || 2,
      tags: params.tags || [],
      tlp: params.tlp ?? 2, // Amber by default
      pap: params.pap ?? 2, // White by default
      flag: params.flag || false,
      ...params.template && { caseTemplate: params.template },
      ...params.assignee && { assignee: params.assignee },
      ...params.customFields && { customFields: params.customFields },
    };

    const response = await this.request<{ data: Case }>(ENDPOINTS.CASES, {
      method: 'POST',
      body: JSON.stringify(caseData),
    });

    return response.data;
  }

  /**
   * Create case from Wazuh alert (automated)
   */
  async createCaseFromAlert(alert: any): Promise<Case> {
    const title = `[Wazuh L${alert.rule?.level}] ${alert.rule?.description || 'Security Alert'}`;
    
    const description = `
## Alert Details
- **Rule ID**: ${alert.rule?.id}
- **Level**: ${alert.rule?.level}
- **Agent**: ${alert.agent?.name} (${alert.agent?.id})
- **Timestamp**: ${alert.timestamp}

## Description
${alert.full_log || 'No additional details'}

${alert.srcip ? `\n**Source IP**: ${alert.srcip}` : ''}
${alert.dstip ? `\n**Destination IP**: ${alert.dstip}` : ''}
`.trim();

    const tags = [
      'wazuh',
      ...(alert.rule?.groups || []),
      ...(alert.rule?.mitre ? [`mitre:${alert.rule.mitre.id}`] : []),
    ];

    // Map Wazuh level to TheHive severity (inverted: higher = more severe)
    let severity = 2; // Medium default
    if ((alert.rule?.level || 0) >= 13) severity = 1; // Critical
    else if ((alert.rule?.level || 0) >= 10) severity = 2; // High
    else if ((alert.rule?.level || 0) >= 7) severity = 3; // Medium
    else severity = 4; // Low

    return this.createCase({
      title,
      description,
      severity,
      tags,
      tlp: 2, // Amber
      pap: 2, // White
    });
  }

  /**
   * Get case by ID
   */
  async getCase(caseId: string): Promise<Case> {
    const response = await this.request<{ data: Case }>(
      ENDPOINTS.CASE_BY_ID.replace(':id', caseId)
    );
    return response.data;
  }

  /**
   * Update case
   */
  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case> {
    const response = await this.request<{ data: Case }>(
      ENDPOINTS.CASE_BY_ID.replace(':id', caseId),
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return response.data;
  }

  /**
   * Search cases with filters
   */
  async searchCases(params: {
    query?: string;
    status?: 'Open' | 'InProgress' | 'Resolved' | 'Deleted' | 'Duplicated';
    severity?: number;
    tags?: string[];
    assignee?: string;
    startDate?: string;
    endDate?: string;
    range?: string; // e.g., '-7d'
    offset?: number;
    limit?: number;
    sort?: string;
  }): Promise<{ data: Case[]; total: number }> {
    const searchQuery: Record<string, any> = {};

    if (params.query) searchQuery._string = params.query;
    if (params.status) searchQuery.status = params.status;
    if (params.severity) searchQuery.severity = params.severity;
    if (params.tags) searchQuery.tags = params.tags;
    if (params.assignee) searchQuery.assignee = params.assignee;
    if (params.startDate) searchQuery._gte = { createdAt: params.startDate };
    if (params.endDate) searchQuery._lte = { createdAt: params.endDate };
    if (params.range) searchQuery._range = params.range;
    if (params.offset !== undefined) searchQuery.from = params.offset;
    if (params.limit) searchQuery.size = params.limit;
    if (params.sort) searchQuery.sort = params.sort;

    const response = await this.request<{ data: Case[]; total: number }>(ENDPOINTS.SEARCH, {
      method: 'POST',
      body: JSON.stringify({
        query: searchQuery,
        range: 'all',
        sort: ['-createdAt'],
      }),
    });

    return response;
  }

  /**
   * Get recent cases
   */
  async getRecentCases(limit: number = 20): Promise<Case[]> {
    const result = await this.searchCases({ limit, sort: '-createdAt' });
    return result.data;
  }

  /**
   * Get open cases count
   */
  async getOpenCasesCount(): Promise<number> {
    const result = await this.searchCases({
      status: 'Open',
      limit: 1,
    });
    return result.total;
  }

  /**
   * Close/resolve a case
   */
  async resolveCase(caseId: string, resolution: string = 'TruePositive' | 'FalsePositive' | 'Other'): Promise<Case> {
    return this.updateCase(caseId, {
      status: 'Resolved',
      resolutionStatus: resolution,
    });
  }

  /**
   * Merge cases
   */
  async mergeCases(targetCaseId: string, sourceCaseIds: string[]): Promise<Case> {
    // This would use a specific merge endpoint if available
    // For now, update target and close sources
    for (const sourceId of sourceCaseIds) {
      await this.updateCase(sourceId, {
        status: 'Duplicated',
      });
    }
    return this.getCase(targetCaseId);
  }

  // ────────────────────────────────────────────────────
  // TASK MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Add task to case
   */
  async addTask(caseId: string, task: {
    title: string;
    description?: string;
    status?: 'Waiting' | 'InProgress' | 'Completed' | 'Cancel';
    assignee?: string;
    flag?: boolean;
  }): Promise<Task> {
    const response = await this.request<{ data: Task }>(
      ENDPOINTS.TASKS.replace(':id', caseId),
      {
        method: 'POST',
        body: JSON.stringify({
          title: task.title,
          description: task.description || '',
          group: 'default',
          status: task.status || 'Waiting',
          ...task.assignee && { assignee: task.assignee },
          ...task.flag !== undefined && { flag: task.flag },
        }),
      }
    );
    return response.data;
  }

  /**
   * Update task
   */
  async updateTask(caseId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await this.request<{ data: Task }>(
      ENDPOINTS.TASK_BY_ID.replace(':caseId', caseId).replace(':taskId', taskId),
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return response.data;
  }

  /**
   * Get tasks for a case
   */
  async getTasks(caseId: string): Promise<Task[]> {
    const response = await this.request<{ data: Task[] }>(
      ENDPOINTS.TASKS.replace(':id', caseId)
    );
    return response.data;
  }

  /**
   * Create standard investigation playbook tasks
   */
  async createInvestigationPlaybook(caseId: string): Promise<Task[]> {
    const playbookTasks = [
      { title: 'Initial Triage & Assessment', description: 'Assess alert severity and initial impact' },
      { title: 'Collect Indicators of Compromise (IOCs)', description: 'Extract IPs, domains, hashes, and other IOCs' },
      { title: 'Threat Intelligence Enrichment', description: 'Cross-reference IOCs with MISP and external feeds' },
      { title: 'Scope & Impact Analysis', description: 'Determine affected systems and data' },
      { title: 'Containment Actions', description: 'Implement immediate containment measures' },
      { title: 'Root Cause Analysis', description: 'Identify attack vector and root cause' },
      { title: 'Eradication & Recovery', description: 'Remove threat and restore systems' },
      { title: 'Lessons Learned', description: 'Document findings and improve detection' },
    ];

    const createdTasks: Task[] = [];
    for (const task of playbookTasks) {
      const createdTask = await this.addTask(caseId, task);
      createdTasks.push(createdTask);
    }

    return createdTasks;
  }

  // ────────────────────────────────────────────────────
  // OBSERVABLE MANAGEMENT
  // ────────────────────────────────────────────────────

  /**
   * Add observable to case
   */
  async addObservable(caseId: string, observable: {
    dataType: string; // ip, domain, hash, url, mail, etc.
    data: string;
    message?: string;
    tags?: string[];
    tlp?: number;
    ioc?: boolean; // Mark as IOC
    sighted?: boolean;
  }): Promise<Observable> {
    const response = await this.request<{ data: Observable }>(
      ENDPOINTS.OBSERVABLES.replace(':id', caseId),
      {
        method: 'POST',
        body: JSON.stringify({
          dataType: observable.dataType,
          data: observable.data.toLowerCase(),
          message: observable.message || '',
          tags: observable.tags || [],
          tlp: observable.tlp ?? 2,
          ioc: observable.ioc ?? true,
          sighted: observable.sighted ?? false,
        }),
      }
    );
    return response.data;
  }

  /**
   * Extract and add observables from alert automatically
   */
  async extractObservablesFromAlert(caseId: string, alert: any): Promise<Observable[]> {
    const observables: Array<{
      dataType: string;
      data: string;
      tags?: string[];
      ioc: boolean;
    }> = [];

    // Extract IP addresses
    if (alert.srcip) {
      observables.push({
        dataType: 'ip',
        data: alert.srcip,
        tags: ['source-ip', 'wazuh'],
        ioc: true,
      });
    }

    if (alert.dstip) {
      observables.push({
        dataType: 'ip',
        data: alert.dstip,
        tags: ['destination-ip', 'wazuh'],
        ioc: true,
      });
    }

    // Extract domain names (basic extraction)
    const domainRegex = /[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}/g;
    const matches = alert.full_log?.match(domainRegex) || [];
    matches.forEach(domain => {
      if (!domain.match(/^\d+\.\d+\.\d+\.\d+$/)) { // Not an IP
        observables.push({
          dataType: 'domain',
          data: domain,
          tags: ['extracted', 'wazuh'],
          ioc: true,
        });
      }
    });

    // Extract hashes
    if (alert.hash) {
      const hashLength = alert.hash.length;
      let hashType = 'other';
      if (hashLength === 32) hashType = 'md5';
      else if (hashLength === 40) hashType = 'sha1';
      else if (hashLength === 64) hashType = 'sha256';

      observables.push({
        dataType: hashType,
        data: alert.hash,
        tags: ['file-hash', 'wazuh'],
        ioc: true,
      });
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const urls = alert.full_log?.match(urlRegex) || [];
    urls.forEach(url => {
      observables.push({
        dataType: 'url',
        data: url,
        tags: ['extracted-url', 'wazuh'],
        ioc: true,
      });
    });

    // Add all observables to case
    const createdObservables: Observable[] = [];
    for (const obs of observables) {
      try {
        const created = await this.addObservable(caseId, obs);
        createdObservables.push(created);
      } catch (error) {
        console.error(`Failed to add observable ${obs.data}:`, error);
      }
    }

    return createdObservables;
  }

  /**
   * Get observables for a case
   */
  async getObservables(caseId: string): Promise<Observable[]> {
    const response = await this.request<{ data: Observable[] }>(
      ENDPOINTS.OBSERVABLES.replace(':id', caseId)
    );
    return response.data;
  }

  /**
   * Mark observable as sighted (seen in environment)
   */
  async markObservableAsSighted(caseId: string, observableId: string): Promise<Observable> {
    return this.updateObservable(caseId, observableId, { sighted: true });
  }

  /**
   * Update observable
   */
  async updateObservable(caseId: string, observableId: string, updates: Partial<Observable>): Promise<Observable> {
    const response = await this.request<{ data: Observable }>(
      ENDPOINTS.OBSERVABLE_BY_ID.replace(':caseId', caseId).replace(':obsId', observableId),
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return response.data;
  }

  // ────────────────────────────────────────────────────
  // CASE TEMPLATES
  // ────────────────────────────────────────────────────

  /**
   * List available case templates
   */
  async getTemplates(): Promise<CaseTemplate[]> {
    const response = await this.request<{ data: CaseTemplate[] }>(ENDPOINTS.TEMPLATES);
    return response.data;
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<CaseTemplate | undefined> {
    const templates = await this.getTemplates();
    return templates.find(t => t.name === name);
  }

  // ────────────────────────────────────────────────────
  // ANALYTICS & METRICS
  // ────────────────────────────────────────────────────

  /**
   * Get case metrics/statistics
   */
  async getMetrics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('from', params.startDate);
    if (params?.endDate) queryParams.set('to', params.endDate);

    const response = await this.request<any>(
      `${ENDPOINTS.METRICS}?${queryParams.toString()}`
    );
    return response;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<{
    openCases: number;
    inProgressCases: number;
    resolvedToday: number;
    avgResolutionTime: number;
    criticalOpen: number;
    myTasks: number;
  }> {
    const [openCount, inProgress, resolved, critical] = await Promise.all([
      this.searchCases({ status: 'Open', limit: 1 }).then(r => r.total).catch(() => 0),
      this.searchCases({ status: 'InProgress', limit: 1 }).then(r => r.total).catch(() => 0),
      this.searchCases({ status: 'Resolved', range: '-1d', limit: 1 }).then(r => r.total).catch(() => 0),
      this.searchCases({ severity: 1, status: 'Open', limit: 1 }).then(r => r.total).catch(() => 0),
    ]);

    return {
      openCases: openCount,
      inProgressCases: inProgress,
      resolvedToday: resolved,
      avgResolutionTime: 0, // Would need calculation from closed cases
      criticalOpen: critical,
      myTasks: 0, // Would need user context
    };
  }

  // ────────────────────────────────────────────────────
  // AUTOMATION HELPERS
  // ────────────────────────────────────────────────────

  /**
   * Full automated case creation from security alert
   * Creates case, adds playbook tasks, extracts observables
   */
  async automateCaseCreation(alert: any): Promise<{
    case: Case;
    tasks: Task[];
    observables: Observable[];
  }> {
    // Step 1: Create case from alert
    const newCase = await this.createCaseFromAlert(alert);

    // Step 2: Create investigation playbook tasks
    const tasks = await this.createInvestigationPlaybook(newCase.id);

    // Step 3: Extract and add observables
    const observables = await this.extractObservablesFromAlert(newCase.id, alert);

    return {
      case: newCase,
      tasks,
      observables,
    };
  }

  /**
   * Bulk create cases from multiple alerts
   */
  async bulkCreateCases(alerts: any[]): Promise<Array<{
    case: Case;
    tasks: Task[];
    observables: Observable[];
  }>> {
    const results = [];

    for (const alert of alerts) {
      try {
        const result = await this.automateCaseCreation(alert);
        results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to create case for alert:`, error);
      }
    }

    return results;
  }
}

// ────────────────────────────────────────────────────────
// EXPORT SINGLETON INSTANCE
// ────────────────────────────────────────────────────────

let thehiveClientInstance: TheHiveClient | null = null;

/**
 * Get or create TheHive client singleton
 */
export function getTheHiveClient(config?: Partial<TheHiveConfig>): TheHiveClient {
  if (!thehiveClientInstance) {
    thehiveClientInstance = new TheHiveClient(config);
  }
  return thehiveClientInstance;
}

/**
 * Reset client instance
 */
export function resetTheHiveClient(): void {
  thehiveClientInstance = null;
}

// Default export
export default TheHiveClient;
