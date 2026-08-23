/**
 * Djezzy National SOC Platform - Environment Validation System
 * 
 * Comprehensive environment variable validation for production deployments:
 * - Validates all required environment variables at startup
 * - Provides detailed error and warning messages
 * - Supports both critical (blocking) and non-critical validations
 * - Generates config hash for audit logging without exposing secrets
 * 
 * ANRT Compliance:
 * - All validation occurs within secure boundaries
 * - No secret values logged or exposed
 * - Config hash enables verification without disclosure
 * 
 * @module lib/production/env-validation
 * @version 2.0.0
 */

import crypto from 'crypto';

// ============================================================================
// Types and Interfaces
// ============================================================================

/** Severity level for validation issues */
export type ValidationSeverity = 'critical' | 'error' | 'warning' | 'info';

/** Single validation result */
export interface ValidationResult {
  /** Variable name being validated */
  variable: string;
  /** Whether this validation passed */
  valid: boolean;
  /** Severity level if invalid */
  severity: ValidationSeverity;
  /** Human-readable message */
  message: string;
  /** Additional details for debugging */
  details?: string;
  /** Whether this issue blocks startup in production */
  blocksStartup: boolean;
}

/** Complete validation result */
export interface EnvironmentValidationResult {
  /** Overall validation status */
  valid: boolean;
  /** List of all errors (blocking issues) */
  errors: string[];
  /** List of warnings (non-blocking issues) */
  warnings: string[];
  /** List of info messages */
  infos: string[];
  /** Detailed results for each check */
  results: ValidationResult[];
  /** Hash of configuration for audit purposes */
  configHash: string;
  /** Node environment */
  nodeEnv: string;
  /** Timestamp of validation */
  timestamp: string;
  /** Total checks performed */
  totalChecks: number;
  /** Passed checks count */
  passedChecks: number;
}

/** Configuration options for validator */
export interface EnvValidationOptions {
  /** Throw error on critical failures in production (default: true) */
  throwOnCritical?: boolean;
  /** Include optional variables in validation (default: true) */
  validateOptional?: boolean;
  /** Custom required variables to check */
  additionalRequiredVars?: string[];
  /** Skip specific validations */
  skipValidations?: string[];
  /** Custom validators to run */
  customValidators?: ValidatorFunction[];
}

/** Function signature for custom validators */
export type ValidatorFunction = () => Promise<ValidationResult> | ValidationResult;

// ============================================================================
// Constants and Defaults
// ============================================================================

/** Default salt value that should never be used in production */
const DEFAULT_ANONYMIZATION_SALT = 'change-me-to-a-random-string';

/** Minimum lengths for sensitive values */
const MIN_LENGTHS = {
  JWT_SECRET: 32,
  ENCRYPTION_KEY: 32,
  API_KEY: 16,
  SESSION_SECRET: 24,
} as const;

/** Valid NODE_ENV values */
const VALID_NODE_ENVS = ['development', 'staging', 'production', 'test'] as const;

/** URL patterns for validation */
const URL_PATTERNS = {
  /** Database URL pattern (supports PostgreSQL, MySQL, SQLite, etc.) */
  DATABASE_URL: /^(postgresql|postgres|mysql|mongodb|sqlite|file):\/\/.+/i,
  /** Redis URL pattern */
  REDIS_URL: /^(redis|rediss):\/\/.+/i,
  /** Generic HTTP(S) URL pattern */
  HTTP_URL: /^https?:\/\/.+/i,
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate JWT_SECRET environment variable
 * - Must be set (no default)
 * - Minimum 32 characters for security
 * - Should contain mixed characters for strength
 */
function validateJwtSecret(): ValidationResult {
  const value = process.env.JWT_SECRET;
  
  if (!value) {
    return {
      variable: 'JWT_SECRET',
      valid: false,
      severity: 'critical',
      message: 'JWT_SECRET is not set. This is required for authentication token signing.',
      details: 'Generate a strong random string with at least 32 characters.',
      blocksStartup: true,
    };
  }
  
  if (value.length < MIN_LENGTHS.JWT_SECRET) {
    return {
      variable: 'JWT_SECRET',
      valid: false,
      severity: 'critical',
      message: `JWT_SECRET is too short (${value.length} chars). Minimum ${MIN_LENGTHS.JWT_SECRET} characters required.`,
      details: 'Use a cryptographically secure random string for production.',
      blocksStartup: true,
    };
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^password$/i, /^secret$/i, /^changeme$/i, /^default$/i,
    /^[a-z]+$/, /^\d+$/, /^(.)\1+$/,
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(value)) {
      return {
        variable: 'JWT_SECRET',
        valid: false,
        severity: 'warning',
        message: 'JWT_SECRET appears to use a weak pattern.',
        details: 'Consider using a more complex random string with mixed case, numbers, and symbols.',
        blocksStartup: false,
      };
    }
  }
  
  return {
    variable: 'JWT_SECRET',
    valid: true,
    severity: 'info',
    message: `JWT_SECRET is properly configured (${value.length} characters).`,
    blocksStartup: false,
  };
}

/**
 * Validate DATABASE_URL environment variable
 * - Must be a valid connection string format
 * - Supports multiple database types
 */
function validateDatabaseUrl(): ValidationResult {
  const value = process.env.DATABASE_URL;
  
  if (!value) {
    return {
      variable: 'DATABASE_URL',
      valid: false,
      severity: 'critical',
      message: 'DATABASE_URL is not set. Database connection is required.',
      details: 'Set DATABASE_URL to your database connection string (e.g., postgresql://user:pass@host:5432/db).',
      blocksStartup: true,
    };
  }
  
  // Check for common formats
  if (!URL_PATTERNS.DATABASE_URL.test(value) && !value.startsWith('file:') && !value.endsWith('.db') && !value.endsWith('.sqlite')) {
    return {
      variable: 'DATABASE_URL',
      valid: false,
      severity: 'error',
      message: 'DATABASE_URL format appears invalid.',
      details: `Expected format like "postgresql://..." or "file:./dev.db". Got prefix: "${value.substring(0, 20)}..."`,
      blocksStartup: true,
    };
  }
  
  // Security warning for credentials in URL
  if (value.includes(':') && value.includes('@') && /:\/\//.test(value)) {
    // This is expected for connection strings, but warn about plaintext passwords
    if (!value.startsWith('file:') && !value.startsWith('rediss://')) {
      return {
        variable: 'DATABASE_URL',
        valid: true,
        severity: 'info',
        message: 'DATABASE_URL is configured. Consider using SSL/TLS connections in production.',
        blocksStartup: false,
      };
    }
  }
  
  return {
    variable: 'DATABASE_URL',
    valid: true,
    severity: 'info',
    message: 'DATABASE_URL is properly configured.',
    blocksStartup: false,
  };
}

/**
 * Validate REDIS_URL environment variable (optional)
 * - If provided, must be valid Redis URL format
 * - Not required if Redis caching is disabled
 */
function validateRedisUrl(): ValidationResult {
  const value = process.env.REDIS_URL;
  
  // Redis is optional - skip if not configured
  if (!value) {
    return {
      variable: 'REDIS_URL',
      valid: true,
      severity: 'info',
      message: 'REDIS_URL is not set. Running without Redis (in-memory fallback for rate limiting).',
      blocksStartup: false,
    };
  }
  
  if (!URL_PATTERNS.REDIS_URL.test(value)) {
    return {
      variable: 'REDIS_URL',
      valid: false,
      severity: 'error',
      message: 'REDIS_URL format is invalid.',
      details: `Expected "redis://host:port" or "rediss://host:port" for TLS. Got: "${value.substring(0, 30)}..."`,
      blocksStartup: false, // Non-fatal - app can run without Redis
    };
  }
  
  // Recommend TLS in production
  if (process.env.NODE_ENV === 'production' && !value.startsWith('rediss://')) {
    return {
      variable: 'REDIS_URL',
      valid: true,
      severity: 'warning',
      message: 'Redis connection is not using TLS (rediss://). Recommended for production.',
      blocksStartup: false,
    };
  }
  
  return {
    variable: 'REDIS_URL',
    valid: true,
    severity: 'info',
    message: 'REDIS_URL is properly configured.',
    blocksStartup: false,
  };
}

/**
 * Validate ANONYMIZATION_SALT environment variable
 * - Cannot use default placeholder value
 * - Should be unique per deployment
 */
function validateAnonymizationSalt(): ValidationResult {
  const value = process.env.ANONYMIZATION_SALT || DEFAULT_ANONYMIZATION_SALT;
  
  if (!value || value === DEFAULT_ANONYMIZATION_SALT) {
    return {
      variable: 'ANONYMIZATION_SALT',
      valid: false,
      severity: 'error',
      message: 'ANONYMIZATION_SALT is using the default placeholder value.',
      details: `Change from "${DEFAULT_ANONYMIZATION_SALT}" to a unique random string for PII anonymization.`,
      blocksStartup: process.env.NODE_ENV === 'production',
    };
  }
  
  if (value.length < 16) {
    return {
      variable: 'ANONYMIZATION_SALT',
      valid: false,
      severity: 'warning',
      message: `ANONYMIZATION_SALT is short (${value.length} chars). Recommended minimum 16 characters.`,
      blocksStartup: false,
    };
  }
  
  return {
    variable: 'ANONYMIZATION_SALT',
    valid: true,
    severity: 'info',
    message: 'ANONYMIZATION_SALT is properly configured.',
    blocksStartup: false,
  };
}

/**
 * Validate NODE_ENV environment variable
 * - Must be one of: development, staging, production, test
 */
function validateNodeEnv(): ValidationResult {
  const value = process.env.NODE_ENV;
  
  if (!value) {
    return {
      variable: 'NODE_ENV',
      valid: false,
      severity: 'warning',
      message: 'NODE_ENV is not set. Defaulting to "development".',
      details: 'Explicitly set NODE_ENV for predictable behavior.',
      blocksStartup: false,
    };
  }
  
  if (!VALID_NODE_ENVS.includes(value as typeof VALID_NODE_ENVS[number])) {
    return {
      variable: 'NODE_ENV',
      valid: false,
      severity: 'error',
      message: `NODE_ENV has invalid value: "${value}".`,
      details: `Valid values are: ${VALID_NODE_ENVS.join(', ')}.`,
      blocksStartup: true,
    };
  }
  
  return {
    variable: 'NODE_ENV',
    valid: true,
    severity: 'info',
    message: `NODE_ENV is set to "${value}".`,
    blocksStartup: false,
  };
}

/**
 * Validate ALLOWED_ORIGINS environment variable (optional)
 * - If set, must be comma-separated URLs
 * - Used for CORS configuration
 */
function validateAllowedOrigins(): ValidationResult {
  const value = process.env.ALLOWED_ORIGINS;
  
  if (!value) {
    return {
      variable: 'ALLOWED_ORIGINS',
      valid: true,
      severity: 'info',
      message: 'ALLOWED_ORIGINS is not set. Using default CORS policy.',
      blocksStartup: false,
    };
  }
  
  const origins = value.split(',').map(o => o.trim()).filter(o => o);
  
  if (origins.length === 0) {
    return {
      variable: 'ALLOWED_ORIGINS',
      valid: false,
      severity: 'warning',
      message: 'ALLOWED_ORIGINS is set but empty after parsing.',
      blocksStartup: false,
    };
  }
  
  // Validate each origin format
  const invalidOrigins = origins.filter(origin => {
    if (origin === '*') return false; // Wildcard is allowed
    if (origin === 'null') return false; // Null origin is allowed
    return !URL_PATTERNS.HTTP_URL.test(origin);
  });
  
  if (invalidOrigins.length > 0) {
    return {
      variable: 'ALLOWED_ORIGINS',
      valid: false,
      severity: 'warning',
      message: `Some ALLOWED_ORIGins have invalid format: ${invalidOrigins.join(', ')}`,
      details: 'Each origin should be a full URL like "https://example.com".',
      blocksStartup: false,
    };
  }
  
  // Security warning for wildcard in production
  if (process.env.NODE_ENV === 'production' && origins.includes('*')) {
    return {
      variable: 'ALLOWED_ORIGINS',
      valid: true,
      severity: 'warning',
      message: 'ALLOWED_ORIGINS includes wildcard (*). This may be insecure in production.',
      blocksStartup: false,
    };
  }
  
  return {
    variable: 'ALLOWED_ORIGINS',
    valid: true,
    severity: 'info',
    message: `ALLOWED_ORIGINS configured with ${origins.length} origin(s).`,
    blocksStartup: false,
  };
}

/**
 * Validate ENCRYPTION_KEY environment variable (optional)
 * - If encryption features are enabled, key must be strong
 * - Minimum 32 characters for AES-256
 */
function validateEncryptionKey(): ValidationResult {
  const value = process.env.ENCRYPTION_KEY;
  const encryptionEnabled = process.env.ENABLE_ENCRYPTION !== 'false';
  
  // Only validate if encryption would be used
  if (!encryptionEnabled) {
    return {
      variable: 'ENCRYPTION_KEY',
      valid: true,
      severity: 'info',
      message: 'Encryption is disabled. ENCRYPTION_KEY not required.',
      blocksStartup: false,
    };
  }
  
  if (!value) {
    return {
      variable: 'ENCRYPTION_KEY',
      valid: false,
      severity: 'error',
      message: 'ENCRYPTION_KEY is not set but encryption is enabled.',
      details: `Set ENCRYPTION_KEY with at least ${MIN_LENGTHS.ENCRYPTION_KEY} characters for AES-256 encryption.`,
      blocksStartup: true,
    };
  }
  
  if (value.length < MIN_LENGTHS.ENCRYPTION_KEY) {
    return {
      variable: 'ENCRYPTION_KEY',
      valid: false,
      severity: 'error',
      message: `ENCRYPTION_KEY is too short (${value.length} chars). Minimum ${MIN_LENGTHS.ENCRYPTION_KEY} required for AES-256.`,
      blocksStartup: true,
    };
  }
  
  return {
    variable: 'ENCRYPTION_KEY',
    valid: true,
    severity: 'info',
    message: `ENCRYPTION_KEY is properly configured (${value.length} characters).`,
    blocksStartup: false,
  };
}

/**
 * Validate PORT environment variable
 */
function validatePort(): ValidationResult {
  const value = process.env.PORT;
  
  if (!value) {
    return {
      variable: 'PORT',
      valid: true,
      severity: 'info',
      message: 'PORT is not set. Using default port 3000.',
      blocksStartup: false,
    };
  }
  
  const portNum = parseInt(value, 10);
  
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return {
      variable: 'PORT',
      valid: false,
      severity: 'error',
      message: `PORT has invalid value: "${value}". Must be between 1 and 65535.`,
      blocksStartup: true,
    };
  }
  
  if (portNum < 1024) {
    return {
      variable: 'PORT',
      valid: true,
      severity: 'warning',
      message: `PORT is ${portNum} (privileged). May require elevated permissions.`,
      blocksStartup: false,
    };
  }
  
  return {
    variable: 'PORT',
    valid: true,
    severity: 'info',
    message: `PORT is set to ${portNum}.`,
    blocksStartup: false,
  };
}

/**
 * Validate LOG_LEVEL environment variable
 */
function validateLogLevel(): ValidationResult {
  const value = process.env.LOG_LEVEL;
  const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
  
  if (!value) {
    return {
      variable: 'LOG_LEVEL',
      valid: true,
      severity: 'info',
      message: 'LOG_LEVEL is not set. Using default level.',
      blocksStartup: false,
    };
  }
  
  if (!validLevels.includes(value.toLowerCase())) {
    return {
      variable: 'LOG_LEVEL',
      valid: false,
      severity: 'warning',
      message: `LOG_LEVEL has unknown value: "${value}". Valid levels: ${validLevels.join(', ')}`,
      blocksStartup: false,
    };
  }
  
  // Warning about debug/trace in production
  if (process.env.NODE_ENV === 'production' && ['debug', 'trace'].includes(value.toLowerCase())) {
    return {
      variable: 'LOG_LEVEL',
      valid: true,
      severity: 'warning',
      message: `LOG_LEVEL is set to "${value}" in production. This may impact performance and log volume.`,
      blocksStartup: false,
    };
  }
  
  return {
    variable: 'LOG_LEVEL',
    valid: true,
    severity: 'info',
    message: `LOG_LEVEL is set to "${value}".`,
    blocksStartup: false,
  };
}

// ============================================================================
// Main Validation Functions
// ============================================================================

/**
 * Generate a hash of the current configuration for audit purposes.
 * Does NOT include actual secret values - only their presence and properties.
 */
function generateConfigHash(): string {
  const configFingerprint = [
    `JWT_SECRET:${process.env.JWT_SECRET ? `${process.env.JWT_SECRET.length}:${process.env.JWT_SECRET[0]}...` : 'unset'}`,
    `DATABASE_URL:${process.env.DATABASE_URL ? extractDbType(process.env.DATABASE_URL) : 'unset'}`,
    `REDIS_URL:${process.env.REDIS_URL ? 'set' : 'unset'}`,
    `ANONYMIZATION_SALT:${process.env.ANONYMIZATION_SALT ? `${process.env.ANONYMIZATION_SALT.length}chars` : 'default'}`,
    `NODE_ENV:${process.env.NODE_ENV || 'unset'}`,
    `ENCRYPTION_KEY:${process.env.ENCRYPTION_KEY ? `${process.env.ENCRYPTION_KEY.length}chars` : 'unset'}`,
    `PORT:${process.env.PORT || '3000'}`,
    `TIMESTAMP:${Date.now()}`,
  ].join('|');
  
  return crypto.createHash('sha256').update(configFingerprint).digest('hex').substring(0, 16);
}

/**
 * Extract database type from connection string (without exposing credentials)
 */
function extractDbType(url: string): string {
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql';
  if (url.startsWith('mysql://')) return 'mysql';
  if (url.startswith?.('mongodb://') || url.startsWith('mongodb+srv://')) return 'mongodb';
  if (url.startsWith('file:') || url.endsWith('.db') || url.endsWith('.sqlite')) return 'sqlite';
  return 'unknown';
}

/**
 * Run all environment validations and return comprehensive result.
 * 
 * @param options - Optional validation configuration
 * @returns Complete validation result with errors, warnings, and config hash
 * 
 * @example
 * ```typescript
 * import { validateEnvironment } from '@/lib/production/env-validation';
 * 
 * const result = validateEnvironment();
 * 
 * if (!result.valid && process.env.NODE_ENV === 'production') {
 *   console.error('Critical configuration errors:', result.errors);
 *   process.exit(1);
 * }
 * ```
 */
export function validateEnvironment(options?: EnvValidationOptions): EnvironmentValidationResult {
  const opts = {
    throwOnCritical: true,
    validateOptional: true,
    ...options,
  };
  
  const results: ValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  
  // Define core validators
  const coreValidators: (() => ValidationResult)[] = [
    validateNodeEnv,
    validateJwtSecret,
    validateDatabaseUrl,
    validateRedisUrl,
    validateAnonymizationSalt,
    validateAllowedOrigins,
    validateEncryptionKey,
    validatePort,
    validateLogLevel,
  ];
  
  // Run all core validators
  for (const validator of coreValidators) {
    if (opts.skipValidations?.includes(validator.name)) continue;
    
    try {
      const result = validator();
      results.push(result);
      
      if (!result.valid) {
        switch (result.severity) {
          case 'critical':
          case 'error':
            errors.push(`[${result.variable}] ${result.message}`);
            break;
          case 'warning':
            warnings.push(`[${result.variable}] ${result.message}`);
            break;
          default:
            infos.push(`[${result.variable}] ${result.message}`);
        }
      } else {
        infos.push(`[${result.variable}] ${result.message}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      results.push({
        variable: 'unknown',
        valid: false,
        severity: 'error',
        message: `Validator threw exception: ${errorMsg}`,
        blocksStartup: false,
      });
      errors.push(errorMsg);
    }
  }
  
  // Run custom validators if provided
  if (opts.customValidators) {
    for (const customValidator of opts.customValidators) {
      try {
        const result = customValidator();
        
        // Handle async custom validators (resolve synchronously for now)
        if (result instanceof Promise) {
          result.then(r => {
            results.push(r);
            if (!r.valid) {
              if (r.severity === 'critical' || r.severity === 'error') {
                errors.push(`[${r.variable}] ${r.message}`);
              } else {
                warnings.push(`[${r.variable}] ${r.message}`);
              }
            }
          }).catch(() => {});
          continue;
        }
        
        results.push(result);
        if (!result.valid) {
          switch (result.severity) {
            case 'critical':
            case 'error':
              errors.push(`[${result.variable}] ${result.message}`);
              break;
            case 'warning':
              warnings.push(`[${result.variable}] ${result.message}`);
              break;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Custom validator error: ${errorMsg}`);
      }
    }
  }
  
  // Determine overall validity
  const hasBlockingErrors = results.some(r => !r.valid && r.blocksStartup);
  const valid = errors.length === 0 || !hasBlockingErrors;
  
  const result: EnvironmentValidationResult = {
    valid,
    errors,
    warnings,
    infos,
    results,
    configHash: generateConfigHash(),
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    totalChecks: results.length,
    passedChecks: results.filter(r => r.valid).length,
  };
  
  // Log results
  logValidationResults(result);
  
  // Throw in production if critical vars missing
  if (opts.throwOnCritical && process.env.NODE_ENV === 'production' && hasBlockingErrors) {
    const errorMessage = `Environment validation failed with ${errors.length} blocking error(s):\n${errors.join('\n')}`;
    throw new EnvironmentValidationError(errorMessage, result);
  }
  
  return result;
}

/**
 * Log validation results appropriately based on severity
 */
function logValidationResults(result: EnvironmentValidationResult): void {
  const prefix = '[ENV-VALIDATION]';
  
  // Always log summary
  console.log(`${prefix} Validation complete: ${result.passedChecks}/${result.totalChecks} checks passed`);
  console.log(`${prefix} Config hash: ${result.configHash}`);
  console.log(`${prefix} Environment: ${result.nodeEnv}`);
  
  // Log errors
  for (const error of result.errors) {
    console.error(`${prefix} ERROR: ${error}`);
  }
  
  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`${prefix} WARNING: ${warning}`);
  }
  
  // Log info in non-production
  if (result.nodeEnv !== 'production') {
    for (const info of result.infos.slice(0, 5)) { // Limit info logging
      console.log(`${prefix} ${info}`);
    }
    if (result.infos.length > 5) {
      console.log(`${prefix} ...and ${result.infos.length - 5} more info items`);
    }
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * Error thrown when environment validation fails critically
 */
export class EnvironmentValidationError extends Error {
  public readonly validationResult: EnvironmentValidationResult;
  
  constructor(message: string, validationResult: EnvironmentValidationResult) {
    super(message);
    this.name = 'EnvironmentValidationError';
    this.validationResult = validationResult;
    
    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnvironmentValidationError);
    }
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Quick check if environment is valid (throws in production on failure)
 * Use this at application entry point.
 * 
 * @example
 * ```typescript
 * // In your server entry point or layout.tsx
 * import { assertValidEnvironment } from '@/lib/production/env-validation';
 * 
 * assertValidEnvironment(); // Throws in production if invalid
 * ```
 */
export function assertValidEnvironment(): void {
  validateEnvironment({ throwOnCritical: true });
}

/**
 * Get configuration hash without running full validation
 * Useful for logging and monitoring
 */
export function getConfigHash(): string {
  return generateConfigHash();
}

/**
 * Check if a specific environment variable is safely configured
 */
export function isVariableSafe(varName: string): boolean {
  const validators: Record<string, () => ValidationResult> = {
    JWT_SECRET: validateJwtSecret,
    DATABASE_URL: validateDatabaseUrl,
    REDIS_URL: validateRedisUrl,
    ANONYMIZATION_SALT: validateAnonymizationSalt,
    NODE_ENV: validateNodeEnv,
    ALLOWED_ORIGINS: validateAllowedOrigins,
    ENCRYPTION_KEY: validateEncryptionKey,
    PORT: validatePort,
    LOG_LEVEL: validateLogLevel,
  };
  
  const validator = validators[varName];
  if (!validator) {
    console.warn(`[ENV-VALIDATION] Unknown variable: ${varName}`);
    return false;
  }
  
  return validator().valid;
}

/**
 * Get masked value of an environment variable (safe for logging)
 * Shows only first/last characters and length
 */
export function getMaskedValue(varName: string): string {
  const value = process.env[varName];
  
  if (!value) return '[NOT SET]';
  if (value.length <= 8) return '***';
  
  return `${value.substring(0, 3)}...${value.substring(value.length - 3)} (${value.length} chars)`;
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default export - main validation function
 * Call this from server entry point to validate environment at startup
 */
export default function validateConfig(options?: EnvValidationOptions): EnvironmentValidationResult {
  return validateEnvironment(options);
}
