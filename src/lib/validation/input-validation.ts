/**
 * Input Validation Utilities for Production
 * Validates all user inputs against strict schemas
 */
import { z } from 'zod';

// Common validation patterns
export const commonValidators = {
  // UUID format
  uuid: z.string().uuid(),
  
  // Email with domain validation
  email: z.string()
    .email('Invalid email format')
    .regex(/@djezzy\.dz$/, 'Email must be from djezzy.dz domain'),
  
  // Phone number (Algerian format)
  phone: z.string()
    .regex(/^\+213[5-7]\d{8}$/, 'Invalid Algerian phone number'),
  
  // IMSI (International Mobile Subscriber Identity)
  imsi: z.string()
    .regex(/^60301\d{11}$/, 'Invalid Djezzy IMSI format'),
  
  // MSISDN (Mobile station international subscriber directory number)
  msisdn: z.string()
    .regex(/^\+213[5-7]\d{8}$/, 'Invalid Djezzy MSISDN format'),
  
  // IP address (IPv4 or IPv6)
  ip: z.union([
    z.string().ip({ version: 4 }),
    z.string().ip({ version: 6 })
  ]),
  
  // Hostname
  hostname: z.string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/, 'Invalid hostname'),
  
  // URL (with protocol validation)
  url: z.string()
    .url('Invalid URL format')
    .refine(url => ['http:', 'https:'].includes(new URL(url).protocol)),
  
  // Date (ISO format)
  isoDate: z.string()
    .datetime({ message: 'Invalid date format. Use ISO 8601' })
};

// Incident validation schemas
export const incidentSchemas = {
  create: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(500, 'Title too long'),
    description: z.string()
      .max(5000, 'Description too long')
      .optional(),
    incidentType: z.enum(['SECURITY', 'TELECOM_FRAUD', 'DATA_BREACH', 'COMPLIANCE'], {
      errorMap: () => ({ message: 'Invalid incident type' })
    }),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    priority: z.number()
      .int()
      .min(1)
      .max(4),
    assigneeId: commonValidators.uuid.optional(),
    affectedAssets: z.array(commonValidators.uuid).optional(),
    affectedServices: z.array(z.string()).optional(),
  }),
  
  update: z.object({
    status: z.enum(['NEW', 'TRIAGE', 'IN_PROGRESS', 'CONTAINED', 'ERADICATED', 'RECOVERY', 'CLOSED']).optional(),
    phase: z.enum(['DETECTION', 'ANALYSIS', 'CONTAINMENT', 'ERADICATION', 'RECOVERY', 'LESSONS_LEARNED']).optional(),
    resolution: z.string().max(2000).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update'
  })
};

// Alert validation schemas
export const alertSchemas = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
    status: z.enum(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE', 'SUPPRESSED']).optional(),
    source: z.string().max(50).optional(),
    search: z.string().max(200).optional(),
    dateFrom: commonValidators.isoDate.optional(),
    dateTo: commonValidators.isoDate.optional(),
  }),
  
  acknowledge: z.object({
    comment: z.string()
      .min(1, 'Acknowledgment comment is required')
      .max(1000, 'Comment too long')
  })
};

// SS7-specific validations
export const ss7Validators = {
  pointCode: z.string()
    .regex(/^\d{1,3}-\d{3}-\d{3}$/, 'Invalid SS7 point code format (e.g., 3-065-001)'),
  
  hexData: z.string()
    .regex(/^[0-9a-fA-F]+$/, 'Invalid hexadecimal data')
    .min(2, 'Hex data too short'),
  
  globalTitle: z.string()
    .regex(/^[0-9A-F]{1,15}$/, 'Invalid global title format')
};

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  errors: Array<{ field: string; message: string }>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return {
    success: false,
    error: 'Validation failed',
    errors
  };
}

// Request validation wrapper for API routes
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{
    valid: boolean;
    data?: T;
    errors?: Array<{ field: string; message: string }>;
    response?: NextResponse;
  }> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return {
        valid: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid JSON body', errorCode: 'INVALID_JSON' },
          { status: 400 }
        )
      };
    }
    
    const validation = validateInput(schema, body);
    
    if (!validation.success) {
      return {
        valid: false,
        errors: validation.errors,
        response: NextResponse.json(
          {
            success: false,
            error: validation.error,
            details: validation.errors,
            errorCode: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      };
    }
    
    return { valid: true, data: validation.data };
  };
}
