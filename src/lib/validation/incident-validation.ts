/**
 * National SOC Platform - Incident Management Validation Schemas
 * 
 * Production-ready Zod validation schemas for incident operations.
 * Provides type-safe input validation with detailed error messages.
 * 
 * @module validation/incident-validation
 * @version 2.0.0 (Production Ready)
 */

import { z } from 'zod';

// ============================================================
// ENUM DEFINITIONS
// ============================================================

export const IncidentSeverityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], {
  errorMap: () => ({ message: 'Must be one of: CRITICAL, HIGH, MEDIUM, LOW' })
});

export const IncidentStatusEnum = z.enum([
  'OPEN', 'IN_PROGRESS', 'CONTAINED', 'ERADICATED', 
  'RECOVERING', 'RESOLVED', 'CLOSED', 'POST_MORTEM'
], {
  errorMap: () => ({ message: 'Invalid incident status' })
});

export const IncidentPhaseEnum = z.enum([
  'DETECTION', 'ANALYSIS', 'CONTAINMENT', 'ERADICATION',
  'RECOVERY', 'LESSONS_LEARNED', 'CLOSED'
], {
  errorMap: () => ({ message: 'Invalid incident phase' })
});

export const IncidentTypeEnum = z.enum([
  'SECURITY', 'FRAUD', 'DATA_BREACH', 'DDOS', 'MALWARE', 
  'PHISHING', 'INSIDER_THREAT', 'THIRD_PARTY', 'TELECOM_FRAUD',
  'INTERCEPTION', 'NETWORK_INTRUSION', 'APT', 'SS7_ATTACK', 'SIM_SWAP'
], {
  errorMap: () => ({ message: 'Invalid incident type' })
});

export const PriorityEnum = z.enum(['P1', 'P2', 'P3', 'P4', 'P5'], {
  errorMap: () => ({ message: 'Must be P1-P5 (P1=Critical)' })
});

// ============================================================
// CREATE INCIDENT SCHEMA
// ============================================================

export const CreateIncidentSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(500, 'Title cannot exceed 500 characters')
    .trim()
    .refine(val => val.length > 0, { message: 'Title cannot be empty or whitespace only' }),
  
  description: z.string()
    .max(10000, 'Description cannot exceed 10,000 characters')
    .optional()
    .default(''),
  
  type: IncidentTypeEnum.optional().default('SECURITY'),
  
  severity: IncidentSeverityEnum.optional().default('HIGH'),
  
  priority: z.number()
    .int('Priority must be an integer')
    .min(1, 'Priority must be at least 1 (P1)')
    .max(5, 'Priority cannot exceed 5 (P5)')
    .optional()
    .default(2),
  
  reportedBy: z.string()
    .uuid('Reporter ID must be a valid UUID')
    .optional(),
  
  assigneeId: z.string()
    .uuid('Assignee ID must be a valid UUID')
    .optional(),
  
  reporterId: z.string()
    .uuid('Reporter ID must be a valid UUID')
    .optional(),
  
  affectedAssets: z.array(z.string())
    .max(100, 'Cannot specify more than 100 affected assets')
    .optional()
    .default([]),
  
  affectedServices: z.array(z.string())
    .max(50, 'Cannot specify more than 50 affected services')
    .optional()
    .default([]),
  
  confidenceScore: z.number()
    .float('Confidence score must be a decimal number')
    .min(0, 'Confidence score must be between 0 and 100')
    .max(100, 'Confidence score must be between 0 and 100')
    .optional()
    .default(50.0),
  
  impactScore: z.number()
    .float('Impact score must be a decimal number')
    .min(0, 'Impact score must be between 0 and 10')
    .max(10, 'Impact score must be between 0 and 10')
    .optional()
    .default(5.0),
  
  // Telecom-specific fields
  subscribersAffected: z.number()
    .int('Subscriber count must be an integer')
    .min(0, 'Cannot affect negative subscribers')
    .optional(),
  
  tatcCode: z.string()
    .regex(/^TATC-\d{4}-[A-Z0-9]{8}$/, 'TATC code format: TATC-YYYY-XXXXXXXX')
    .optional(),
  
  // External references
  externalTicketId: z.string().max(200).optional(),
  sourceReference: z.string().max(500).optional(),
  
  // Initial evidence URLs
  evidenceUrls: z.array(z.string().url()).max(20).optional().default([]),
  
  // Tags for categorization
  tags: z.array(z.string().max(50)).max(30).optional().default([]),
}).strict('Unknown fields in request body');

// ============================================================
// UPDATE INCIDENT SCHEMA
// ============================================================

export const UpdateIncidentSchema = z.object({
  status: IncidentStatusEnum.optional(),
  
  phase: IncidentPhaseEnum.optional(),
  
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(500, 'Title cannot exceed 500 characters')
    .trim()
    .optional(),
  
  description: z.string()
    .max(10000, 'Description cannot exceed 10,000 characters')
    .optional(),
  
  severity: IncidentSeverityEnum.optional(),
  
  priority: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  
  assigneeId: z.string().uuid().optional(),
  
  commanderId: z.string().uuid().optional(), // Incident Commander
  
  assignedTeam: z.string().max(100).optional(),
  
  escalationLevel: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  
  affectedAssets: z.array(z.string()).max(100).optional(),
  
  affectedServices: z.array(z.string()).max(50).optional(),
  
  confidenceScore: z.number().float().min(0).max(100).optional(),
  
  impactScore: z.number().float().min(0).max(10).optional(),
  
  subscribersAffected: z.number().int().min(0).optional(),
  
  resolutionTarget: z.string()
    .datetime({ message: 'Invalid ISO 8601 datetime format' })
    .optional(),
  
  containmentTarget: z.string()
    .datetime({ message: 'Invalid ISO 8601 datetime format' })
    .optional(),
  
  // MITRE ATT&CK mapping
  tactics: z.array(z.string()).max(20).optional(),
  techniques: z.array(z.string()).max(50).optional(),
  
  // Impact assessment fields
  confidentialityImpact: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  integrityImpact: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  availabilityImpact: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  
  // Close/resolution fields
  resolutionSummary: z.string().max(5000).optional(),
  rootCause: z.string().max(5000).optional(),
  lessonsLearned: z.string().max(10000).optional(),
}).strict('Unknown fields in update request');

// ============================================================
// ADD UPDATE/COMMENT SCHEMA
// ============================================================

export const AddUpdateSchema = z.object({
  message: z.string()
    .min(1, 'Update message is required')
    .max(10000, 'Message cannot exceed 10,000 characters')
    .trim(),
  
  authorId: z.string()
    .uuid('Author ID must be a valid UUID'),
  
  isInternal: z.boolean()
    .default(false),
  
  status: IncidentStatusEnum.optional(),
  
  phase: IncidentPhaseEnum.optional(),
  
  // Optional attachments
  attachments: z.array(z.object({
    filename: z.string().max(255),
    url: z.string().url(),
    mimeType: z.string().max(100),
    sizeBytes: z.number().int().positive().optional()
  })).max(10).optional().default([]),
}).strict('Unknown fields in update request');

// ============================================================
// LINK ALERT SCHEMA
// ============================================================

export const LinkAlertSchema = z.object({
  alertId: z.string()
    .min(1, 'Alert ID is required')
    .regex(/^[A-Za-z0-9\-]+$/, 'Alert ID contains invalid characters'),
  
  linkReason: z.string()
    .max(500, 'Link reason cannot exceed 500 characters')
    .optional(),
  
  autoEscalate: z.boolean().default(false),
}).strict('Unknown fields in link alert request');

// ============================================================
// QUERY/FILTER SCHEMA (for GET requests)
// ============================================================

export const IncidentQuerySchema = z.object({
  severity: IncidentSeverityEnum.optional(),
  status: IncidentStatusEnum.optional(),
  phase: IncidentPhaseEnum.optional(),
  type: IncidentTypeEnum.optional(),
  
  search: z.string()
    .max(200, 'Search query too long')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Search contains invalid characters')
    .optional(),
  
  assigneeId: z.string().uuid().optional(),
  commanderId: z.string().uuid().optional(),
  
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  
  slaBreach: z.enum(['true', 'false']).optional(),
  
  subscribersAffected: z.enum(['true', 'false']).optional(),
  
  tags: z.string().optional(), // Comma-separated
  
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Maximum 100 records per page')
    .default(20),
  
  offset: z.coerce.number()
    .int()
    .min(0, 'Offset cannot be negative')
    .default(0),
  
  sortBy: z.enum([
    'detectedAt', 'updatedAt', 'severity', 'status', 
    'priority', 'impactScore', 'targetResolution'
  ]).default('detectedAt'),
  
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  details: z.enum(['true', 'false']).default('false'),
  
  cursor: z.string().optional(), // For cursor-based pagination
});

// ============================================================
// BULK OPERATIONS SCHEMA
// ============================================================

export const BulkUpdateSchema = z.object({
  incidentIds: z.array(z.string())
    .min(1, 'At least one incident ID required')
    .max(50, 'Maximum 50 incidents per bulk operation'),
  
  updates: UpdateIncidentSchema,
  
  reason: z.string()
    .min(10, 'Bulk update reason must be at least 10 characters')
    .max(1000, 'Reason too long'),
  
  createTasks: z.boolean().default(false),
});

export const BulkCloseSchema = z.object({
  incidentIds: z.array(z.string())
    .min(1)
    .max(50),
  
  resolutionSummary: z.string()
    .min(50, 'Resolution summary required for bulk close')
    .max(5000),
  
  rootCause: z.string().max(5000).optional(),
  
  postMortemRequired: z.boolean().default(false),
});

// ============================================================
// EXPORT TYPES
// ============================================================

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentSchema>;
export type AddUpdateInput = z.infer<typeof AddUpdateSchema>;
export type LinkAlertInput = z.infer<typeof LinkAlertSchema>;
export type IncidentQueryInput = z.infer<typeof IncidentQuerySchema>;
export type BulkUpdateInput = z.infer<typeof BulkUpdateSchema>;
export type BulkCloseInput = z.infer<typeof BulkCloseSchema>;

// Validation error formatter
export function formatZodError(error: z.ZodError): {
  code: string;
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const path = err.path.join('.') || 'root';
    fields[path] = err.message;
  });
  
  return {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    fields
  };
}

export default {
  CreateIncidentSchema,
  UpdateIncidentSchema,
  AddUpdateSchema,
  LinkAlertSchema,
  IncidentQuerySchema,
  BulkUpdateSchema,
  BulkCloseSchema,
  formatZodError
};
