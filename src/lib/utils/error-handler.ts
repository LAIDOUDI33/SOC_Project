/**
 * National SOC Platform - Secure Error Handler
 * 
 * Provides consistent error handling that:
 * - Hides internal details in production
 * - Logs errors securely (no sensitive data)
 * - Returns appropriate HTTP status codes
 * - Prevents information leakage
 * 
 * @module lib/utils/error-handler
 * @version 1.0.0
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface ErrorContext {
  /** The operation that failed */
  operation: string;
  /** Whether this is a user-facing error */
  userFacing?: boolean;
  /** Additional context for logging (never exposed to client) */
  context?: Record<string, unknown>;
  /** Custom error code for client */
  errorCode?: string;
  /** HTTP status code (default: 500) */
  statusCode?: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  requestId?: string;
  timestamp: string;
  // Only in development:
  details?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const isProduction = process.env.NODE_ENV === 'production';

// Error messages safe to expose to clients
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'INVALID_CREDENTIALS': 'Invalid email or password',
  'USER_NOT_FOUND': 'User not found',
  'ACCOUNT_LOCKED': 'Account temporarily locked. Please try again later.',
  'TOKEN_EXPIRED': 'Session expired. Please log in again.',
  'INVALID_TOKEN': 'Invalid authentication token.',
  'MFA_REQUIRED': 'Multi-factor authentication required.',
  'MFA_INVALID': 'Invalid verification code.',
  
  // Authorization errors
  'UNAUTHORIZED': 'Authentication required.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Invalid input data.',
  'INVALID_EMAIL': 'Please provide a valid email address.',
  'WEAK_PASSWORD': 'Password does not meet security requirements.',
  'INVALID_FORMAT': 'Data format is invalid.',
  
  // Resource errors
  'NOT_FOUND': 'Resource not found.',
  'CONFLICT': 'Resource already exists or conflict detected.',
  'RATE_LIMITED': 'Too many requests. Please try again later.',
  
  // General errors
  'SERVER_ERROR': 'An unexpected error occurred. Please try again.',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
};

// ============================================================================
// Main Error Handler
// ============================================================================

/**
 * Create a secure error response
 * 
 * In development: Includes error details for debugging
 * In production: Hides internal details, logs them server-side only
 * 
 * @example
 * ```typescript
 * import { createErrorResponse } from '@/lib/utils/error-handler';
 * 
 * export async function GET() {
 *   try {
 *     // ... operation that might fail
 *   } catch (error) {
 *     return createErrorResponse(error, {
 *       operation: 'fetch-data',
 *       statusCode: 500,
 *       errorCode: 'FETCH_FAILED'
 *     });
 *   }
 * }
 * ```
 */
export function createErrorResponse(
  error: unknown, 
  context: ErrorContext
): NextResponse<ErrorResponse> {
  const {
    operation,
    userFacing = true,
    context: additionalContext = {},
    errorCode = 'SERVER_ERROR',
    statusCode = 500
  } = context;

  // Generate unique request ID for tracing
  const requestId = crypto.randomUUID?.slice(0, 8).toUpperCase() || 
    Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Extract error information safely
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Log the full error server-side (never exposed to client)
  logErrorSecurely({
    operation,
    errorMessage,
    errorStack,
    requestId,
    additionalContext
  });

  // Build response based on environment
  const response: ErrorResponse = {
    success: false,
    error: getSafeErrorMessage(errorCode, userFacing),
    errorCode,
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Include details only in non-production environments
  if (!isProduction) {
    response.details = `${errorMessage} [${operation}]`;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Create a validation error response (400)
 */
export function createValidationErrorResponse(
  message: string,
  errors?: string[]
): NextResponse {
  const response = {
    success: false as const,
    error: message || 'Validation failed',
    errorCode: 'VALIDATION_ERROR' as const,
    timestamp: new Date().toISOString(),
    ...(errors && !isProduction ? { details: errors.join(', ') } : {}),
    ...(errors && isProduction ? { fields: errors } : {})
  };

  return NextResponse.json(response, { status: 400 });
}

/**
 * Create an unauthorized response (401)
 */
export function createUnauthorizedResponse(
  message?: string
): NextResponse {
  return NextResponse.json({
    success: false,
    error: message || 'Authentication required',
    errorCode: 'UNAUTHORIZED',
    timestamp: new Date().toISOString()
  }, { status: 401 });
}

/**
 * Create a forbidden response (403)
 */
export function createForbiddenResponse(
  message?: string
): NextResponse {
  return NextResponse.json({
    success: false,
    error: message || 'Access denied',
    errorCode: 'FORBIDDEN',
    timestamp: new Date().toISOString()
  }, { status: 403 });
}

/**
 * Create a not found response (404)
 */
export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse {
  return NextResponse.json({
    success: false,
    error: `${resource} not found`,
    errorCode: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  }, { status: 404 });
}

/**
 * Create a rate limited response (429)
 */
export function createRateLimitedResponse(
  retryAfterSeconds: number = 60
): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Too many requests. Please slow down.',
    errorCode: 'RATE_LIMITED',
    retryAfter: retryAfterSeconds,
    timestamp: new Date().toISOString()
  }, { 
    status: 429,
    headers: {
      'Retry-After': String(retryAfterSeconds)
    }
  });
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Get safe error message based on environment and context
 */
function getSafeErrorMessage(errorCode: string, userFacing: boolean): string {
  if (!userFacing) {
    return isProduction 
      ? 'An internal error occurred.' 
      : SAFE_ERROR_MESSAGES[errorCode] || 'Internal error.';
  }

  return SAFE_ERROR_MESSAGES[errorCode] || SAFE_ERROR_MESSAGES['SERVER_ERROR'];
}

/**
 * Log errors securely without exposing sensitive data
 */
function logErrorSecurely(data: {
  operation: string;
  errorMessage: string;
  errorStack?: string;
  requestId: string;
  additionalContext: Record<string, unknown>;
}): void {
  // Structure the log entry properly
  const logEntry = {
    level: 'ERROR',
    requestId: data.requestId,
    operation: data.operation,
    message: data.errorMessage,
    // Include stack trace in development only
    ...(isProduction ? {} : { stack: data.errorStack }),
    // Sanitize additional context before logging
    ...sanitizeContext(data.additionalContext),
    timestamp: new Date().toISOString()
  };

  // Use structured logging format
  console.error(JSON.stringify(logEntry));
}

/**
 * Remove potentially sensitive data from context before logging
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'passwd', 'pwd', 'secret', 'token', 'apiKey', 'api_key',
    'authorization', 'cookie', 'creditCard', 'ssn', 'socialSecurity',
    'email', 'phone', 'address', 'ip'
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this key might contain sensitive data
    const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
    
    if (isSensitive && typeof value === 'string') {
      // Mask the value but preserve length indication
      sanitized[key] = value.length > 8 
        ? `${value.substring(0, 3)}***${value.substring(value.length - 2)}`
        : '***';
    } else if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// Async Error Wrapper
// ============================================================================

/**
 * Wrap async route handlers with automatic error handling
 * 
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request) => {
 *   // Your handler logic
 *   return NextResponse.json({ data });
 * }, { operation: 'fetch-items' });
 * ```
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: Partial<ErrorContext> = {}
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error, {
        operation: options.operation || 'unknown',
        ...options
      });
    }
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createRateLimitedResponse,
  withErrorHandler
};
