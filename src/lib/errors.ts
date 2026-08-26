import { NextResponse } from 'next/server'

// Error code enum for consistent error handling
export enum ErrorCode {
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// Custom error classes for better error handling
export class AppError extends Error {
  statusCode: number
  code: string
  details?: Record<string, unknown>

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

// SOCError is an alias for AppError for backward compatibility
export { AppError as SOCError }

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR', fields)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class RateLimitExceededError extends AppError {
  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter })
    this.name = 'RateLimitExceededError'
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown): NextResponse {
  console.error('🚨 Application Error:', error)

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          ...(error.details && { details: error.details })
        }
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error instanceof Error && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    
    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Unique constraint violation',
              code: 'UNIQUE_VIOLATION',
              target: prismaError.meta?.target
            }
          },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Record not found',
              code: 'NOT_FOUND'
            }
          },
          { status: 404 }
        )
      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Database operation failed',
              code: 'DATABASE_ERROR',
              originalMessage: error.message
            }
          },
          { status: 500 }
        )
    }
  }

  // Generic error response
  return NextResponse.json(
    {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      }
    },
    { status: 500 }
  )
}

// Async handler wrapper for consistent error handling
export async function asyncHandler<T>(
  fn: () => Promise<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = await fn()
    return { data }
  } catch (error) {
    const formattedError = formatErrorResponse(error)
    return { error: formattedError }
  }
}

// Not found handler
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: `${resource} not found`,
        code: 'NOT_FOUND'
      }
    },
    { status: 404 }
  )
}

// Success response helper
export function successResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}
