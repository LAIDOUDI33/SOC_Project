/**
 * National SOC Platform - Threat Hunting Validation Schemas
 * 
 * Production-ready Zod validation schemas for threat hunting operations.
 * Provides type-safe input validation for IOCs, hunt sessions, and queries.
 * 
 * @module validation/threat-validation
 * @version 2.0.0 (Production Ready)
 */

import { z } from 'zod';

// ============================================================
// ENUM DEFINITIONS
// ============================================================

export const IndicatorTypeEnum = z.enum([
  'IPV4', 'IPV6', 'DOMAIN', 'URL', 'HASH', 'EMAIL',
  'MSISDN', 'IMEI', 'IMSI', 'MAC_ADDRESS', 'SS7_GT',
  'FILE_NAME', 'REGISTRY_KEY', 'MUTANT', 'CVE', 'JA3_HASH',
  'CERTIFICATE_HASH', 'BITCOIN_ADDRESS', 'OTHER'
], {
  errorMap: () => ({ message: 'Invalid indicator type' })
});

export const ThreatLevelEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'], {
  errorMap: () => ({ message: 'Must be one of: CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN' })
});

export const TLPMarkingEnum = z.enum(['RED', 'AMBER', 'GREEN', 'WHITE', 'CLEAR'], {
  errorMap: () => ({ message: 'Invalid TLP marking' })
});

export const HuntStatusEnum = z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'], {
  errorMap: () => ({ message: 'Invalid hunt session status' })
});

export const QueryLanguageEnum = z.enum(['KQL', 'LUCENE', 'SIGMA', 'EQL', 'YARA', 'SQL'], {
  errorMap: () => ({ message: 'Unsupported query language' })
});

export const DataSourceEnum = z.enum(['SIEM', 'EDR', 'NSM', 'DNS', 'PROXY', 'MAIL', 'ACTIVE_DIRECTORY', 'CLOUD', 'THREAT_INTEL', 'CUSTOM'], {
  errorMap: () => ({ message: 'Invalid data source' })
});

// ============================================================
// INDICATOR/IOC SCHEMAS
// ============================================================

/**
 * Validate IOC value based on type
 */
function validateIOCValue(type: string, value: string): boolean {
  const trimmedValue = value.trim();
  
  switch (type.toUpperCase()) {
    case 'IPV4':
      // IPv4 with optional CIDR
      return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(trimmedValue) &&
        trimmedValue.split('.').slice(0, 4).every(octet => {
          const num = parseInt(octet);
          return num >= 0 && num <= 255;
        });
    
    case 'IPV6':
      // Basic IPv6 validation
      return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(trimmedValue) ||
             /^\[([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\]$/.test(trimmedValue);
    
    case 'DOMAIN':
      // Domain name (max 253 chars, valid characters)
      return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(trimmedValue) &&
             trimmedValue.length <= 253;
    
    case 'URL':
      try {
        const url = new URL(trimmedValue);
        return ['http:', 'https:', 'ftp:'].includes(url.protocol);
      } catch {
        return false;
      }
    
    case 'EMAIL':
      // RFC 5322 simplified
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedValue) &&
             trimmedValue.length <= 320;
    
    case 'MSISDN':
      // MSISDN format (with or without +)
      return /^\+?[1-9]\d{6,14}$/.test(trimmedValue.replace(/\s|-/g, ''));
    
    case 'IMEI':
      // IMEI (15 digits, Luhn checksum validated at application level)
      return /^\d{15}$/.test(trimmedValue);
    
    case 'HASH':
      // MD5 (32), SHA1 (40), SHA256 (64), SHA512 (128)
      return /^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$|^[a-fA-F0-9]{128}$/.test(trimmedValue);
    
    case 'MAC_ADDRESS':
      return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(trimmedValue);
    
    case 'CVE':
      return /^CVE-\d{4}-\d{4,}$/i.test(trimmedValue);
    
    default:
      return trimmedValue.length > 0 && trimmedValue.length <= 10000;
  }
}

export const AddIndicatorSchema = z.object({
  type: IndicatorTypeEnum,
  
  value: z.string()
    .min(1, 'Indicator value is required')
    .max(10000, 'Indicator value too long')
    .trim(),
  
  confidence: z.number()
    .float('Confidence must be a decimal number')
    .min(0, 'Confidence must be between 0 and 100')
    .max(100, 'Confidence must be between 0 and 100')
    .optional()
    .default(50.0),
  
  source: z.string()
    .max(200, 'Source name too long')
    .optional()
    .default('Manual'),
  
  threatActor: z.string()
    .max(200, 'Threat actor name too long')
    .optional(),
  
  malwareFamily: z.string()
    .max(200, 'Malware family name too long')
    .optional(),
  
  tags: z.array(z.string().max(50)).max(30).optional().default([]),
  
  tlp: TLPMarkingEnum.optional().default('WHITE'),
  
  description: z.string().max(5000).optional(),
  
  // For telecom-specific indicators
  subscriberContext: z.object({
    msisdn: z.string().optional(),
    imsi: z.string().optional(),
    accountType: z.enum(['PREPAID', 'POSTPAID', 'CORPORATE', 'UNKNOWN']).optional(),
    riskScore: z.number().min(0).max(100).optional()
  }).optional(),
  
  // TTL for auto-expiration
  ttlHours: z.number()
    .int()
    .min(0, 'TTL cannot be negative')
    .max(87600, 'Maximum TTL is 10 years') // 87600 hours = 10 years
    .optional(),
  
  // External references
  externalReferences: z.array(z.object({
    source: z.string().max(100),
    url: z.string().url(),
    referenceId: z.string().max(100).optional()
  })).max(20).optional().default([]),
}).refine(
  data => validateIOCValue(data.type, data.value),
  { message: 'Invalid indicator value for the specified type', path: ['value'] }
);

export const AddIOCSchema = z.object({
  iocId: z.string()
    .regex(/^IOC-[a-zA-Z0-9\-]+$/, 'IOC ID must match format: IOC-XXXXXXXX')
    .optional(),
  
  type: IndicatorTypeEnum.optional().default('IPV4'),
  
  value: z.string()
    .min(1, 'IOC value is required')
    .max(10000)
    .trim(),
  
  threatLevel: ThreatLevelEnum.optional().default('MEDIUM'),
  
  description: z.string().max(5000).optional(),
  
  source: z.string().max(200).optional(),
  
  confidence: z.number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .default(50),
  
  isValidated: z.boolean().default(false),
  
  falsePositiveRate: z.number()
    .float()
    .min(0)
    .max(1)
    .optional()
    .default(0.0),
  
  labels: z.array(z.string().max(100)).max(50).optional().default([]),
  
  tlp: TLPMarkingEnum.optional().default('WHITE'),
  
  // Kill chain phase
  killChainPhase: z.enum([
    'RECONNAISSANCE', 'WEAPONIZATION', 'DELIVERY', 
    'EXPLOITATION', 'INSTALLATION', 'COMMAND_AND_CONTROL',
    'ACTIONS_ON_OBJECTIVES'
  ]).optional(),
  
  // Related campaigns
  campaignIds: z.array(z.string()).max(10).optional().default([]),
}).refine(
  data => validateIOCValue(data.type || 'IPV4', data.value),
  { message: 'Invalid IOC value for the specified type', path: ['value'] }
);

// ============================================================
// HUNT SESSION SCHEMAS
// ============================================================

export const CreateHuntSessionSchema = z.object({
  name: z.string()
    .min(3, 'Hunt name must be at least 3 characters')
    .max(200, 'Hunt name cannot exceed 200 characters')
    .trim()
    .refine(val => val.length > 0, { message: 'Name cannot be empty' }),
  
  description: z.string()
    .max(5000, 'Description too long')
    .optional()
    .default(''),
  
  hypothesis: z.string()
    .min(10, 'Hypothesis must be at least 10 characters - describe what you are investigating')
    .max(10000, 'Hypothesis too long')
    .trim(),
  
  hunterId: z.string()
    .min(1, 'Hunter ID is required'),
  
  hunterName: z.string()
    .max(200, 'Hunter name too long')
    .optional(),
  
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  
  // Query configuration (can be set on creation or later)
  queryConfig: z.object({
    query: z.string().max(100000, 'Query too long').optional(),
    queryLanguage: QueryLanguageEnum.optional().default('KQL'),
    dataSource: DataSourceEnum.optional().default('SIEM'),
    timeRange: z.object({
      start: z.string().datetime({ message: 'Invalid start datetime' }),
      end: z.string().datetime({ message: 'Invalid end datetime' })
    }).optional()
  }).optional(),
  
  // Collaboration settings
  collaborators: z.array(z.object({
    userId: z.string(),
    role: z.enum(['VIEWER', 'ANALYST', 'EDITOR'])
  })).max(10).optional().default([]),
  
  // Notification settings
  notifyOnFindings: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(true),
}).strict('Unknown fields in request body');

export const UpdateHuntSessionSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  hypothesis: z.string().min(10).max(10000).trim().optional(),
  status: HuntStatusEnum.optional(),
  
  queryConfig: z.object({
    query: z.string().max(100000).optional(),
    queryLanguage: QueryLanguageEnum.optional(),
    dataSource: DataSourceEnum.optional(),
    timeRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional()
    }).optional()
  }).optional(),
  
  tags: z.array(z.string().max(50)).max(20).optional(),
  
  reviewers: z.array(z.string()).max(10).optional(),
  
  progress: z.number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  
  notes: z.string().max(10000).optional(),
}).strict();

// ============================================================
// QUERY EXECUTION SCHEMA
// ============================================================

export const ExecuteQuerySchema = z.object({
  sessionId: z.string()
    .min(1, 'Session ID is required'),
  
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(100000, 'Query exceeds maximum length'),
  
  queryLanguage: QueryLanguageEnum.default('KQL'),
  
  dataSource: DataSourceEnum.default('SIEM'),
  
  timeRange: z.object({
    start: z.string().datetime({ message: 'Invalid start time' }),
    end: z.string().datetime({ message: 'Invalid end time' })
  }),
  
  limit: z.coerce.number()
    .int()
    .min(1, 'Minimum 1 result')
    .max(10000, 'Maximum 10000 results per query')
    .default(1000),
  
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0),
  
  // Execution options
  options: z.object({
    timeoutSeconds: z.number()
      .int()
      .min(5, 'Minimum 5 second timeout')
      .max(300, 'Maximum 5 minute timeout')
      .default(60),
    
    includeRawEvents: z.boolean().default(false),
    
    aggregateBy: z.enum([
      'none', 'time_1m', 'time_5m', 'time_15m', 'time_1h', 'time_1d',
      'source_ip', 'destination_ip', 'threat_actor', 'severity'
    ]).default('none'),
    
    // Auto-extract IOCs from results
    extractIOCs: z.boolean().default(true),
    
    iocTypesToExtract: z.array(IndicatorTypeEnum).default([
      'IPV4', 'DOMAIN', 'URL', 'HASH', 'MSISDN', 'EMAIL'
    ])
  }).default({})
});

// ============================================================
// FINDING/RESULT SCHEMA
// ============================================================

export const CreateFindingSchema = z.object({
  sessionId: z.string().min(1),
  
  title: z.string()
    .min(3, 'Title required')
    .max(500, 'Title too long'),
  
  description: z.string()
    .min(10, 'Description must provide context')
    .max(10000, 'Description too long'),
  
  severity: ThreatLevelEnum.default('MEDIUM'),
  
  confidence: z.number().float().min(0).max(100).default(50),
  
  // Evidence supporting this finding
  evidence: z.array(z.object({
    type: z.enum(['LOG_ENTRY', 'NETWORK_FLOW', 'FILE_HASH', 'SCREENSHOT', 'RAW_DATA']),
    content: z.string().max(50000),
    source: z.string().max(200),
    timestamp: z.string().datetime().optional()
  })).max(50).optional().default([]),
  
  // Extracted IOCs
  extractedIOCs: z.array(z.object({
    type: IndicatorTypeEnum,
    value: z.string(),
    context: z.string().max(1000).optional()
  })).max(100).optional().default([]),
  
  // MITRE ATT&CK mapping
  tactics: z.array(z.string()).max(10).optional(),
  techniques: z.array(z.string()).max(20).optional(),
  
  // Recommended actions
  recommendations: z.array(z.string().max(1000)).max(20).optional().default([]),
  
  // Status of this finding
  status: z.enum(['NEW', 'INVESTIGATING', 'CONFIRMED_FALSE_POSITIVE', 'CONFIRMED_TRUE_POSITIVE', 'ESCALATED']).default('NEW'),
  
  // Link to existing incident if applicable
  linkedIncidentId: z.string().uuid().optional(),
});

// ============================================================
// BULK IOC OPERATIONS
// ============================================================

export const BulkImportIOCSchema = z.object({
  iocs: z.array(AddIOCSchema.or(AddIndicatorSchema))
    .min(1, 'At least one IOC required')
    .max(1000, 'Maximum 1000 IOCs per import'),
  
  source: z.string()
    .max(200, 'Source name too long')
    .optional()
    .default('Bulk Import'),
  
  importOptions: z.object({
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(true),
    validateValues: z.boolean().default(true),
    createCampaign: z.boolean().default(false),
    campaignName: z.string().max(200).optional()
  }).default({}),
  
  tags: z.array(z.string().max(50)).max(20).optional().default([])
});

// ============================================================
// QUERY FILTERS FOR GET REQUESTS
// ============================================================

export const ThreatQuerySchema = z.object({
  type: IndicatorTypeEnum.optional(),
  threatActor: z.string()
    .max(200, 'Threat actor filter too long')
    .optional(),
  active: z.enum(['true', 'false']).optional(),
  tlp: TLPMarkingEnum.optional(),
  threatLevel: ThreatLevelEnum.optional(),
  validated: z.enum(['true', 'false']).optional(),
  source: z.string().max(200).optional(),
  
  search: z.string()
    .max(200, 'Search query too long')
    .optional(),
  
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  
  tags: z.string().optional(), // Comma-separated
  
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0),
  
  sortBy: z.enum(['lastSeen', 'firstSeen', 'confidence', 'value', 'createdAt'])
    .default('lastSeen'),
  
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  includeCampaigns: z.enum(['true', 'false']).default('true'),
  includeStatistics: z.enum(['true', 'false']).default('true'),
});

export const HuntSessionQuerySchema = z.object({
  status: HuntStatusEnum.optional(),
  hunterId: z.string().optional(),
  
  search: z.string().max(200).optional(),
  
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(50),
  
  offset: z.coerce.number()
    .int()
    .min(0)
    .default(0),
  
  sortBy: z.enum(['updatedAt', 'createdAt', 'name', 'status'])
    .default('updatedAt'),
  
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  includeResults: z.enum(['true', 'false']).default('false'),
});

// ============================================================
// EXPORT TYPES
// ============================================================

export type AddIndicatorInput = z.infer<typeof AddIndicatorSchema>;
export type AddIOCInput = z.infer<typeof AddIOCSchema>;
export type CreateHuntSessionInput = z.infer<typeof CreateHuntSessionSchema>;
export type UpdateHuntSessionInput = z.infer<typeof UpdateHuntSessionSchema>;
export type ExecuteQueryInput = z.infer<typeof ExecuteQuerySchema>;
export type CreateFindingInput = z.infer<typeof CreateFindingSchema>;
export type BulkImportIOCInput = z.infer<typeof BulkImportIOCSchema>;
export type ThreatQueryInput = z.infer<typeof ThreatQuerySchema>;
export type HuntSessionQueryInput = z.infer<typeof HuntSessionQuerySchema>;

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
  AddIndicatorSchema,
  AddIOCSchema,
  CreateHuntSessionSchema,
  UpdateHuntSessionSchema,
  ExecuteQuerySchema,
  CreateFindingSchema,
  BulkImportIOCSchema,
  ThreatQuerySchema,
  HuntSessionQuerySchema,
  formatZodError
};
