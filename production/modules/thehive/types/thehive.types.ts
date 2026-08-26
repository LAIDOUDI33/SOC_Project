/**
 * 🇩🇿 National SOC - TheHive Integration Types
 * TypeScript type definitions for TheHive SOAR platform
 */

// ────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────

export interface TheHiveConfig {
  /** TheHive API base URL */
  baseUrl: string;
  /** API key (from user profile) */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
}

// ────────────────────────────────────────────────────────
// CASE TYPES
// ────────────────────────────────────────────────────────

export interface Case {
  /** Unique case identifier */
  id: string;
  
  /** Case title */
  title: string;
  
  /** Case description (markdown supported) */
  description: string;
  
  /** Severity: 1=Critical, 2=High, 3=Medium, 4=Low */
  severity: number;
  
  /** Case status */
  status: 'Open' | 'InProgress' | 'Resolved' | 'Deleted' | 'Duplicated';
  
  /** Resolution status when closed */
  resolutionStatus?: 'TruePositive' | 'FalsePositive' | 'Indeterminate' | 'Other';
  
  /** Tags for categorization and search */
  tags: string[];
  
  /** Traffic Light Protocol level */
  tlp: number; // 0=White/Unrestricted, 1=Green, 2=Amber, 3=Red
  
  /** Permissible Actions Protocol level */
  pap: number; // 0=White, 1=Green, 2=Amber, 3=Red
  
  /** Whether case is flagged/priority */
  flag: boolean;
  
  /** User ID of assignee */
  assignee?: string;
  
  /** Case template used */
  caseTemplate?: string;
  
  /** Custom field values */
  customFields?: Record<string, any>;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** User who created the case */
  createdBy: string;
  
  /** Number of tasks */
  taskCount?: number;
  
  /** Number of observables */
  observableCount?: number;
}

// ────────────────────────────────────────────────────────
// TASK TYPES
// ────────────────────────────────────────────────────────

export interface Task {
  /** Unique task identifier */
  id: string;
  
  /** Parent case ID */
  caseId?: string;
  
  /** Task title */
  title: string;
  
  /** Task description */
  description: string;
  
  /** Task group/category */
  group: string;
  
  /** Task status */
  status: 'Waiting' | 'InProgress' | 'Completed' | 'Cancel';
  
  /** User assigned to task */
  assignee?: string;
  
  /** Whether task is flagged */
  flag: boolean;
  
  /** When task was created */
  createdAt: string;
  
  /** When task was completed (if applicable) */
  completedAt?: string;
  
  /** User who created task */
  createdBy: string;
  
  /** Task order in list */
  order: number;
}

// ────────────────────────────────────────────────────────
// OBSERVABLE TYPES
// ────────────────────────────────────────────────────────

export interface Observable {
  /** Unique observable identifier */
  id: string;
  
  /** Parent case ID */
  caseId?: string;
  
  /** Data type (ip, domain, hash, url, mail, etc.) */
  dataType: string;
  
  /** Observable value */
  data: string;
  
  /** Description/message about this observable */
  message: string;
  
  /** Associated tags */
  tags: string[];
  
  /** TLP level */
  tlp: number;
  
  /** PAP level */
  pap: number;
  
  /** Marked as Indicator of Compromise */
  ioc: boolean;
  
  /** Sighted in environment */
  sighted: boolean;
  
  /** Number of times sighted */
  sightingCount?: number;
  
  /** Linked analysis data */
  data?: any;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Source of observable */
  source: string;
  
  /** Report dates if from external feed */
  startDate?: string;
  endDate?: string;
}

// ────────────────────────────────────────────────────────
// CASE TEMPLATE TYPES
// ────────────────────────────────────────────────────────

export interface CaseTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template display name */
  title: string;
  
  /** Template description */
  description?: string;
  
  /** Default severity for cases using this template */
  defaultSeverity?: number;
  
  /** Pre-defined tags */
  tags?: string[];
  
  /** Custom fields defined in template */
  customFields?: Record<string, any>;
}

// ────────────────────────────────────────────────────────
// USER TYPES
// ────────────────────────────────────────────────────────

export interface TheHiveUser {
  /** User identifier */
  id: string;
  
  /** Username */
  login: string;
  
  /** Display name */
  name: string;
  
  /** Email address */
  email?: string;
  
  /** Organization ID */
  organization: string;
  
  /** User roles */
  roles: string[];
  
  /** Account status */
  status: 'Active' | 'Locked' | 'Ok';
  
  /** Profile (admin, analyst, org-admin, read-only, user) */
  profile: string;
  
  /** Avatar/initials */
  avatar?: string;
}

// ────────────────────────────────────────────────────────
// ORGANIZATION TYPES
// ────────────────────────────────────────────────────────

export interface Organization {
  /** Organization identifier */
  id: string;
  
  /** Organization name */
  name: string;
  
  /** Organization description */
  description?: string;
  
  /** Users count */
  usersCount?: number;
}

// ────────────────────────────────────────────────────────
// METRICS & ANALYTICS TYPES
// ────────────────────────────────────────────────────────

export interface CaseMetrics {
  totalCases: number;
  openCases: number;
  inProgressCases: number;
  resolvedCases: number;
  deletedCases: number;
  
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  
  byStatus: Record<string, number>;
  
  avgResolutionTimeHours: number;
  
  casesByDay: Array<{
    date: string;
    count: number;
  }>;
  
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

// ────────────────────────────────────────────────────────
// DASHBOARD SUMMARY TYPE
// ────────────────────────────────────────────────────────

export interface TheHiveDashboardSummary {
  metrics: CaseMetrics;
  recentCases: Case[];
  myOpenTasks: Task[];
  urgentCases: Case[]; // Critical + High, open
  unassignedCases: Case[];
  overdueTasks: Task[];
}

// ────────────────────────────────────────────────────────
// AUTOMATION RESULT TYPES
// ────────────────────────────────────────────────────────

export interface AutomatedCaseResult {
  success: boolean;
  case?: Case;
  tasks?: Task[];
  observables?: Observable[];
  error?: string;
  processingTimeMs: number;
}

// ────────────────────────────────────────────────────────
// WEBHOOK / INTEGRATION TYPES
// ────────────────────────────────────────────────────────

export interface TheHiveWebhookPayload {
  event_type: 'case_created' | 'case_updated' | 'case_deleted' |
               'task_created' | 'task_updated' |
               'observable_created' | 'observable_updated';
  object_id: string;
  object_type: 'case' | 'task' | 'observable';
  userId: string;
  details: Case | Task | Observable;
  timestamp: string;
  base_url: string;
}
