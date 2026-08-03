/**
 * Djezzy National SOC Platform - Input Validation & Sanitization Library
 * 
 * ANRT Compliant:
 * - IMSI/MSISDN masking required
 * - XSS prevention
 * - SQL Injection prevention
 * - Data validation for Algerian telecom formats
 * 
 * @module security/input-validation
 * @version 1.0.0
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  trimWhitespace?: boolean;
  sanitizeHTML?: boolean;
  sanitizeSQL?: boolean;
}

export interface IMSIValidationResult extends ValidationResult {
  masked?: string;
  countryCode?: string;
  networkCode?: string;
}

export interface MSISDNValidationResult extends ValidationResult {
  masked?: string;
  internationalFormat?: string;
  localFormat?: string;
}

// ============================================================================
// Constants - Algerian Telecom Patterns
// ============================================================================

/**
 * Algerian Mobile Number Prefixes (MNC)
 * Djezzy: 605, 606 (was Nedjma)
 * Mobilis: 601, 602, 603, 604
 * Ooredoo: 550, 551, 552, 553, 554
 */
const ALGERIAN_MOBILE_PREFIXES = [
  '0550', '0551', '0552', '0553', '0554', // Ooredoo
  '0560', '0561', '0562', '0563', '0564', '0565', '0566', '0567', '0568', '0569', // Djezzy
  '0660', '0661', '0662', '0663', '0664', '0665', '0666', '0667', '0668', '0669', // Mobilis
  '0670', '0671', '0672', '0673', '0674', '0675', '0676', '0677', '0678', '0679', // Mobilis
];

/** 
 * IMSI Pattern for Algeria
 * Format: MCC (603) + MNC (01 or 02 for Djezzy) + MSIN (up to 10 digits)
 */
const IMSI_PATTERN = /^603(0[12])\d{9,10}$/;

/** Country code for Algeria */
const ALGERIA_COUNTRY_CODE = '+213';

/** ANRT Required masking pattern */
const MASK_PATTERN = '***';

// ============================================================================
// HTML Sanitization Configuration
// ============================================================================

/** Allowed HTML tags for sanitization (minimal set) */
const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'br', 'p'
]);

/** Allowed attributes per tag */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  '*': new Set(['class']),
};

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validates and sanitizes a generic string input
 * 
 * @param input - Raw input to validate
 * @param options - Validation options
 * @returns ValidationResult with sanitized output and any errors
 * 
 * @example
 * ```typescript
 * const result = validateString(userInput, {
 *   maxLength: 100,
 *   sanitizeHTML: true,
 *   trimWhitespace: true
 * });
 * ```
 */
export function validateString(
  input: unknown,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    maxLength = 10000,
    minLength = 0,
    pattern,
    allowEmpty = false,
    trimWhitespace = true,
    sanitizeHTML = false,
    sanitizeSQL = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Type check
  if (input === null || input === undefined) {
    return {
      valid: allowEmpty,
      errors: allowEmpty ? [] : ['Input is required'],
      warnings: [],
    };
  }

  let value = String(input);

  // Trim whitespace
  if (trimWhitespace) {
    value = value.trim();
  }

  // Empty check
  if (value.length === 0) {
    if (!allowEmpty) {
      errors.push('Input cannot be empty');
    }
    return {
      valid: allowEmpty && errors.length === 0,
      sanitized: '',
      errors,
      warnings,
    };
  }

  // Length checks
  if (value.length < minLength) {
    errors.push(`Input must be at least ${minLength} characters`);
  }

  if (value.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    value = value.substring(0, maxLength);
    warnings.push('Input was truncated to maximum length');
  }

  // Pattern check
  if (pattern && !pattern.test(value)) {
    errors.push('Input does not match required format');
  }

  // HTML Sanitization
  if (sanitizeHTML) {
    const sanitizedResult = sanitizeHTMLContent(value);
    value = sanitizedResult.sanitized;
    if (sanitizedResult.warnings.length > 0) {
      warnings.push(...sanitizedResult.warnings);
    }
  }

  // SQL Sanitization (basic)
  if (sanitizeSQL) {
    const sqlResult = detectSQLPatterns(value);
    if (sqlResult.detected) {
      errors.push('Potential SQL injection detected');
      warnings.push(...sqlResult.patterns);
    }
  }

  return {
    valid: errors.length === 0,
    sanitized: value,
    errors,
    warnings,
  };
}

/**
 * Validates an email address format
 * RFC 5322 compliant with practical restrictions
 */
export function validateEmail(email: unknown): ValidationResult {
  const result = validateString(email, {
    maxLength: 254, // RFC 5322 max length
    minLength: 5,
    trimWhitespace: true,
  });

  if (!result.valid || !result.sanitized) {
    return result;
  }

  // Practical email regex (RFC 5322 simplified)
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailPattern.test(result.sanitized)) {
    result.errors.push('Invalid email address format');
    result.valid = false;
  }

  // Check for common disposable email patterns (optional security measure)
  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail'];
  const domain = result.sanitized.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.some(d => domain.includes(d))) {
    result.warnings.push('Disposable email address detected');
  }

  return result;
}

/**
 * Validates a URL for safety
 * Prevents javascript:, data:, and other dangerous protocols
 */
export function validateURL(url: unknown): ValidationResult {
  const result = validateString(url, {
    maxLength: 2048,
    trimWhitespace: true,
  });

  if (!result.valid || !result.sanitized) {
    return result;
  }

  try {
    const parsedUrl = new URL(result.sanitized);

    // Protocol whitelist
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      result.errors.push(`Protocol ${parsedUrl.protocol} is not allowed`);
      result.valid = false;
      return result;
    }

    // Block internal/network addresses (SSRF prevention)
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // IPv4 localhost/private
    if (/^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(hostname)) {
      result.errors.push('Internal network addresses are not allowed');
      result.valid = false;
      return result;
    }

    // IPv6 localhost
    if (hostname === '::1' || hostname === '[::1]' || hostname === '::') {
      result.errors.push('Localhost addresses are not allowed');
      result.valid = false;
      return result;
    }

    // AWS/GCP/Azure metadata endpoints (SSRF prevention)
    if (hostname.includes('metadata.google.internal') || 
        hostname.endsWith('amazonaws.com') && hostname.startsWith('169.')) {
      result.errors.push('Cloud metadata endpoints are not allowed');
      result.valid = false;
      return result;
    }

    // Force HTTPS in production
    if (parsedUrl.protocol === 'http:') {
      result.warnings.push('HTTPS should be preferred over HTTP');
    }

  } catch {
    result.errors.push('Invalid URL format');
    result.valid = false;
  }

  return result;
}

// ============================================================================
// Telecom-Specific Validation (ANRT Compliance)
// ============================================================================

/**
 * Validates and masks an IMSI (International Mobile Subscriber Identity)
 * 
 * ANRT Requirement: IMSI values must be masked in all outputs
 * 
 * IMSI Structure:
 * - MCC (Mobile Country Code): 3 digits (Algeria = 603)
 * - MNC (Mobile Network Code): 2-3 digits (Djezzy = 01 or 02)
 * - MSIN (Mobile Subscriber Identification Number): up to 10 digits
 * 
 * @param imsi - The IMSI to validate
 * @returns IMSIValidationResult with masked value
 * 
 * @example
 * ```typescript
 * const result = validateIMSI('60301123456789');
 * console.log(result.masked); // ***123456789
 * console.log(result.valid);  // true
 * ```
 */
export function validateIMSI(imsi: unknown): IMSIValidationResult {
  const baseResult: IMSIValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
  };

  // Basic type conversion and cleanup
  if (imsi === null || imsi === undefined) {
    baseResult.errors.push('IMSI is required');
    return baseResult;
  }

  let cleanIMSI = String(imsi).replace(/\D/g, ''); // Remove non-digits

  if (cleanIMSI.length === 0) {
    baseResult.errors.push('IMSI cannot be empty');
    return baseResult;
  }

  // Length validation (15 digits standard)
  if (cleanIMSI.length < 14 || cleanIMSI.length > 15) {
    baseResult.errors.push(`IMSI must be 14-15 digits, got ${cleanIMSI.length}`);
  }

  // Format validation
  if (!IMSI_PATTERN.test(cleanIMSI)) {
    baseResult.errors.push('IMSI format is invalid for Algerian networks');
    
    // Check if it's at least valid structure (even if not our network)
    if (!/^603\d{11,12}$/.test(cleanIMSI)) {
      baseResult.valid = false;
      return baseResult;
    }
    baseResult.warnings.push('IMSI may belong to another Algerian operator');
  }

  // Extract components
  baseResult.countryCode = cleanIMSI.substring(0, 3); // MCC
  baseResult.networkCode = cleanIMSI.substring(3, 5); // MNC

  // Check if it's a Djezzy IMSI
  const djezzyMNCs = ['01', '02'];
  if (!djezzyMNCs.includes(baseResult.networkCode)) {
    baseResult.warnings.push(`IMSI belongs to MNC ${baseResult.networkCode}, not Djezzy`);
  }

  // ANRT REQUIRED: Mask the IMSI
  // Show only last 9 digits (MSIN portion without first digit of MSIN)
  baseResult.masked = maskIMSI(cleanIMSI);

  baseResult.valid = baseResult.errors.length === 0;
  baseResult.sanitized = cleanIMSI; // Store full value only for internal use

  return baseResult;
}

/**
 * Masks an IMSI value according to ANRT requirements
 * Format: ***XXXXXXXXX (first 6 digits masked)
 */
function maskIMSI(imsi: string): string {
  if (imsi.length <= 6) return MASK_PATTERN;
  return MASK_PATTERN + imsi.substring(6);
}

/**
 * Validates and masks an MSISDN (Mobile Station International Subscriber Directory Number)
 * 
 * ANRT Requirement: MSISDN values must be masked in all outputs
 * 
 * Algerian Mobile Number Formats:
 * - International: +213 5XX XXX XXXX
 * - Local (with prefix): 0 5XX XXX XXXX
 * - Local (without prefix): 5XX XXX XXXX
 * 
 * @param msisdn - The MSISDN to validate
 * @returns MSISDNValidationResult with masked value
 * 
 * @example
 * ```typescript
 * const result = validateMSISDN('+213561123456');
 * console.log(result.masked);            // *** *** 2345
 * console.log(result.internationalFormat); // +213561123456
 * ```
 */
export function validateMSISDN(msisdn: unknown): MSISDNValidationResult {
  const baseResult: MSISDNValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
  };

  if (msisdn === null || msisdn === undefined) {
    baseResult.errors.push('MSISDN is required');
    return baseResult;
  }

  let cleanMSISDN = String(msisdn).replace(/[\s\-().]/g, '').toLowerCase();

  // Remove leading +
  if (cleanMSISDN.startsWith('+')) {
    cleanMSISDN = cleanMSISDN.substring(1);
  }

  // Remove international prefix if present
  if (cleanMSISDN.startsWith('213')) {
    cleanMSISDN = '0' + cleanMSISDN.substring(3);
  }

  // Ensure starts with 0 for local format
  if (!cleanMSISDN.startsWith('0') && cleanMSISDN.length === 10) {
    cleanMSISDN = '0' + cleanMSISDN;
  }

  // Validate length (should be 10 digits with leading 0)
  if (cleanMSISDN.length !== 10) {
    baseResult.errors.push(`MSISDN must be 10 digits (local format), got ${cleanMSISDN.length}`);
    return baseResult;
  }

  // Must be all digits
  if (!/^\d+$/.test(cleanMSISDN)) {
    baseResult.errors.push('MSISDN must contain only digits');
    return baseResult;
  }

  // Validate against known prefixes
  const prefix = cleanMSISDN.substring(0, 4);
  if (!ALGERIAN_MOBILE_PREFIXES.includes(prefix)) {
    baseResult.errors.push(`Invalid mobile number prefix: ${prefix}`);
    baseResult.warnings.push('Number may not be a valid Algerian mobile number');
    return baseResult;
  }

  // Determine carrier from prefix
  const djezzyPrefixes = ALGERIAN_MOBILE_PREFIXES.filter(p => p.startsWith('056') || p.startsWith('066'));
  if (djezzyPrefixes.includes(prefix)) {
    // Valid Djezzy number
  } else {
    baseResult.warnings.push('Number belongs to another Algerian operator');
  }

  // Store formats
  baseResult.localFormat = cleanMSISDN; // 0XXXXXXXXX
  baseResult.internationalFormat = ALGERIA_COUNTRY_CODE + cleanMSISDN.substring(1); // +213XXXXXXXXX

  // ANRT REQUIRED: Mask the MSISDN
  // Show only last 4 digits
  baseResult.masked = maskMSISDN(cleanMSISDN);

  baseResult.valid = baseResult.errors.length === 0;
  baseResult.sanitized = cleanMSISDN; // Full value for internal use only

  return baseResult;
}

/**
 * Masks an MSISDN value according to ANRT requirements
 * Format: *** *** XXXX (last 4 digits visible)
 */
function maskMSISDN(msisdn: string): string {
  if (msisdn.length <= 4) return MASK_PATTERN;
  
  // Format: *** *** 2345
  const lastFour = msisdn.slice(-4);
  return `*** *** ${lastFour}`;
}

/**
 * Batch validates multiple MSISDNs
 * Useful for export functionality
 */
export function validateMSISDNBatch(msisdns: string[]): MSISDNValidationResult[] {
  return msisdns.map(msisdn => validateMSISDN(msisdn));
}

/**
 * Returns masked array of MSISDNs for display/export
 */
export function maskMSISDNBatch(msisdns: string[]): string[] {
  return msisdns.map(msisdn => {
    const result = validateMSISDN(msisdn);
    return result.masked || 'INVALID';
  });
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitizes HTML content by removing dangerous tags and attributes
 * Uses a simple parser approach suitable for server-side rendering
 */
export function sanitizeHTMLContent(input: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];
  let sanitized = input;

  // Remove script tags and content
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(sanitized)) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    warnings.push('Script tags removed');
  }

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove dangerous tags entirely
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, '$1');
      warnings.push(`<${tag}> tag removed`);
    }
  });

  // Remove style tags that might contain expressions
  sanitized = sanitized.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, content) => {
    if (/expression\s*\(|javascript\s*:/i.test(content)) {
      warnings.push('Dangerous style content removed');
      return '';
    }
    return '';
  });

  // HTML entity encode remaining special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return { sanitized, warnings };
}

/**
 * Detects potential SQL injection patterns
 * Does NOT prevent all SQL injection - use parameterized queries!
 */
export function detectSQLPatterns(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = [];
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /(--|#)(\s|$)/gm,
    /(\/\*)/gm,
    /(\bor\b\s+\d+\s*=\s*\d+)/gi,
    /(\bunion\b.*\bselect\b)/gi,
    /(\bwaitfor\b.*\bdelay\b)/gi,
    /(\bbenchmark\s*\()/gi,
    /(\bsleep\s*\()/gi,
    /(\bload_file\s*\()/gi,
    /(\binto\s+(outfile|dumpfile)\b)/gi,
    /(\binformation_schema)/gi,
    /(@@version|\bversion\s*\())/gi,
    /(\bconcat\s*\()/gi,
    /(\bchar\s*\()/gi,
    /(\b0x[0-9a-f]+)/gi,
  ];

  sqlPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      patterns.push(`Potential SQL pattern: ${pattern.source}`);
    }
  });

  return {
    detected: patterns.length > 0,
    patterns,
  };
}

/**
 * Detects potential command injection patterns
 */
export function detectCommandInjection(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = [];
  const commandPatterns = [
    /[;&|`$]/,
    /\$\([^)]+\)/,
    /`[^`]+`/,
    /\b(exec|eval|system|passthru|popen|proc_open)\s*\(/i,
    /\b(wget|curl|nc|netcat|bash|sh|python|perl|ruby|php)\b/i,
  ];

  commandPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      patterns.push(`Potential command injection pattern: ${pattern.source}`);
    }
  });

  return {
    detected: patterns.length > 0,
    patterns,
  };
}

/**
 * Detects potential XSS patterns in input
 */
export function detectXSSPatterns(input: string): { detected: boolean; patterns: string[] } {
  const patterns: string[] = [];
  const xssPatterns = [
    /<script\b[^>]*>.*?<\/script>/gis,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+onerror/gi,
    /<svg[^>]*onload/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
    /document\.cookie/gi,
    /document\.write/gi,
    /alert\s*\(/gi,
    /fromCharCode/gi,
  ];

  xssPatterns.forEach(pattern => {
    if (pattern.test(input)) {
      patterns.push(`Potential XSS pattern: ${pattern.source}`);
    }
  });

  return {
    detected: patterns.length > 0,
    patterns,
  };
}

// ============================================================================
// Object Validation
// ============================================================================

/**
 * Validates an object against a schema definition
 * Useful for API request body validation
 */
export function validateObject<T>(
  obj: unknown,
  schema: Record<keyof T, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    options?: ValidationOptions;
    customValidator?: (value: unknown) => string | null;
  }>
): { valid: boolean; errors: Record<string, string[]>; sanitized: Partial<T> } {
  const errors: Record<string, string[]> = {};
  const sanitized: Partial<T> = {};

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: { root: ['Invalid object'] }, sanitized: {} };
  }

  const record = obj as Record<string, unknown>;

  for (const [key, rules] of Object.entries(schema)) {
    const value = record[key];
    const keyErrors: string[] = [];

    // Required check
    if (rules.required && (value === undefined || value === null)) {
      keyErrors.push(`${key} is required`);
      errors[key] = keyErrors;
      continue;
    }

    // Skip optional fields that aren't provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }

    // Type check
    switch (rules.type) {
      case 'string': {
        const result = validateString(value, rules.options);
        if (!result.valid) {
          keyErrors.push(...result.errors);
        } else {
          (sanitized as Record<string, unknown>)[key] = result.sanitized;
        }
        break;
      }
      case 'number': {
        if (typeof value !== 'number' || isNaN(value)) {
          keyErrors.push(`${key} must be a number`);
        } else {
          (sanitized as Record<string, unknown>)[key] = value;
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          keyErrors.push(`${key} must be a boolean`);
        } else {
          (sanitized as Record<string, unknown>)[key] = value;
        }
        break;
      }
      case 'array': {
        if (!Array.isArray(value)) {
          keyErrors.push(`${key} must be an array`);
        } else {
          (sanitized as Record<string, unknown>)[key] = value;
        }
        break;
      }
      case 'object': {
        if (typeof value !== 'object' || Array.isArray(value)) {
          keyErrors.push(`${key} must be an object`);
        } else {
          (sanitized as Record<string, unknown>)[key] = value;
        }
        break;
      }
    }

    // Custom validator
    if (rules.customValidator && keyErrors.length === 0) {
      const customError = rules.customValidator(value);
      if (customError) {
        keyErrors.push(customError);
      }
    }

    if (keyErrors.length > 0) {
      errors[key] = keyErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Creates a safe export payload with sensitive data masked
 * ANRT compliant export function
 */
export function createSafeExport<T extends Record<string, unknown>>(
  data: T[],
  maskFields: (keyof T)[]
): Partial<T>[] {
  return data.map(item => {
    const safeItem: Partial<T> = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (maskFields.includes(key as keyof T)) {
        // Mask the field based on its apparent type
        if (typeof value === 'string') {
          if (/^\d{10,15}$/.test(value.replace(/\D/g, ''))) {
            // Looks like phone/IMSI
            (safeItem as Record<string, unknown>)[key] = validateMSISDN(value).masked || value;
          } else {
            // Generic masking
            (safeItem as Record<string, unknown>)[key] = `${value.substring(0, 3)}***`;
          }
        } else {
          (safeItem as Record<string, unknown>)[key] = '[REDACTED]';
        }
      } else {
        (safeItem as Record<string, unknown>)[key] = value;
      }
    }
    
    return safeItem;
  });
}

// Default export with all functions
export default {
  validateString,
  validateEmail,
  validateURL,
  validateIMSI,
  validateMSISDN,
  validateMSISDNBatch,
  maskMSISDNBatch,
  sanitizeHTMLContent,
  detectSQLPatterns,
  detectCommandInjection,
  detectXSSPatterns,
  validateObject,
  createSafeExport,
};
