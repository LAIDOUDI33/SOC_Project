/**
 * National SOC Platform - PII Anonymization Module
 * 
 * Provides secure hashing functions for Personally Identifiable Information (PII)
 * using SHA-256 with a configurable salt for GDPR/ANSSI compliance.
 * 
 * @module security/anonymization
 * @version 1.0.0
 * @security Critical - Handles sensitive data anonymization
 */

import { createHash, randomUUID } from 'crypto';

// ============================================================================
// Configuration & Validation
// ============================================================================

/**
 * Get the anonymization salt from environment variables
 * Validates that it's properly configured in production
 */
function getAnonymizationSalt(): string {
  const salt = process.env.ANONYMIZATION_SALT;
  
  if (!salt) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: ANONYMIZATION_SALT environment variable is not set. ' +
        'This is REQUIRED in production for PII anonymization. ' +
        'Generate one with: openssl rand -hex 32'
      );
    }
    
    // In development, use a default salt but warn
    console.warn(
      '[SECURITY WARNING] ANONYMIZATION_SALT not set. Using development-only default. ' +
      'This MUST be configured in production!'
    );
    return 'development-salt-do-not-use-in-production';
  }
  
  // Validate salt strength in production
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && salt.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: ANONYMIZATION_SALT is too short (minimum 32 characters). ' +
      'Generate a stronger salt with: openssl rand -hex 32'
    );
  }
  
  // Check for obvious default values that shouldn't be used in production
  if (nodeEnv === 'production' && salt.includes('change-me')) {
    throw new Error(
      'CRITICAL SECURITY ERROR: ANONYMIZATION_SALT appears to be using a placeholder value. ' +
      'Generate a unique salt with: openssl rand -hex 32'
    );
  }
  
  return salt;
}

// ============================================================================
// Core Hashing Function
// ============================================================================

/**
 * Hash data using SHA-256 with the configured salt
 * Uses HMAC-like construction: SHA-256(salt + data + salt) for added security
 * 
 * @param data - The data to hash
 * @param additionalContext - Optional additional context/namespace for domain separation
 * @returns Hex-encoded hash string
 */
export function anonymize(data: string, additionalContext?: string): string {
  const salt = getAnonymizationSalt();
  
  // Create hash with salt sandwich pattern for enhanced security
  // This prevents length extension attacks and provides domain separation
  const hash = createHash('sha256');
  hash.update(salt);
  
  if (additionalContext) {
    hash.update(`:${additionalContext}:`);
  }
  
  hash.update(data);
  hash.update(salt); // Trailing salt prevents suffix attacks
  
  return hash.digest('hex');
}

/**
 * Hash data with a deterministic but unique-per-session approach
 * Useful for creating consistent anonymized IDs within a session
 * 
 * @param data - The data to hash
 * @param namespace - Domain namespace for isolation
 * @returns Anonymized identifier
 */
export function anonymizeWithNamespace(data: string, namespace: string): string {
  return anonymize(data, namespace);
}

// ============================================================================
// PII-Specific Anonymization Functions
// ============================================================================

/**
 * Anonymize an IP address while preserving prefix for geo-analysis
 * 
 * For IPv4: Hashes the last octet, keeps first 3 for rough geolocation
 * For IPv6: Hashes the last 64 bits, keeps prefix for routing analysis
 * 
 * @param ipAddress - The IP address to anonymize
 * @returns Anonymized IP address (e.g., "192.168.1.<hash>")
 * 
 * @example
 * ```typescript
 * import { anonymizeIP } from '@/lib/security/anonymization';
 * 
 * const anonymized = anonymizeIP('192.168.1.100');
 * // Returns: "192.168.1.a3f2b8c1d4e5..."
 * ```
 */
export function anonymizeIP(ipAddress: string): string {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return '<invalid-ip>';
  }
  
  const trimmedIP = ipAddress.trim();
  
  // Detect IPv4 vs IPv6
  if (trimmedIP.includes(':')) {
    // IPv6: Keep first 64 bits (prefix), hash the rest
    const parts = trimmedIP.split(':');
    if (parts.length <= 4) {
      // Short IPv6 or :: shorthand - hash entire thing
      return `ipv6:${anonymize(trimmedIP, 'ip-v6')}`;
    }
    
    // Keep first 4 groups (64 bits), hash the rest
    const prefix = parts.slice(0, 4).join(':');
    const suffix = parts.slice(4).join(':');
    const hashedSuffix = anonymize(suffix, 'ip-v6-suffix').substring(0, 16);
    
    return `${prefix}:${hashedSuffix}`;
  }
  
  // IPv4: Keep first 3 octets, hash the last one
  const octets = trimmedIP.split('.');
  if (octets.length !== 4) {
    // Not a standard IPv4 - hash the whole thing
    return `ipv4:${anonymize(trimmedIP, 'ip-v4')}`;
  }
  
  const prefix = octets.slice(0, 3).join('.');
  const hashedLastOctet = anonymize(octets[3], 'ip-v4-octet').substring(0, 8);
  
  return `${prefix}.${hashedLastOctet}`;
}

/**
 * Anonymize an email address
 * Preserves domain for analytics while hashing the local part
 * 
 * @param email - The email address to anonymize
 * @returns Anonymized email (e.g., "<hash>@example.com")
 * 
 * @example
 * ```typescript
 * const anonymized = anonymizeEmail('user@example.com');
 * // Returns: "a3f2b8c1d4e5...@example.com"
 * ```
 */
export function anonymizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '<invalid-email>';
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  const atIndex = trimmedEmail.lastIndexOf('@');
  
  if (atIndex <= 0 || atIndex >= trimmedEmail.length - 1) {
    // Invalid email format - hash entire string
    return `<${anonymize(trimmedEmail, 'email-invalid')}>`;
  }
  
  const localPart = trimmedEmail.substring(0, atIndex);
  const domain = trimmedEmail.substring(atIndex + 1);
  
  const hashedLocal = anonymize(localPart, 'email-local').substring(0, 12);
  
  return `${hashedLocal}@${domain}`;
}

/**
 * Anonymize a phone number
 * Removes all formatting, preserves country code and area code for geographic analysis
 * 
 * @param phoneNumber - The phone number to anonymize
 * @returns Anonymized phone number (e.g., "+213 5XX XXX <hash>")
 * 
 * @example
 * ```typescript
 * const anonymized = anonymizePhoneNumber('+213555123456');
 * // Returns: "+213 555 XXXX a3f2..."
 * ```
 */
export function anonymizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '<invalid-phone>';
  }
  
  // Remove all non-digit and non-plus characters
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  if (cleaned.length < 7) {
    // Too short to meaningfully anonymize
    return `<${anonymize(cleaned, 'phone-short')}>`;
  }
  
  // Determine format based on length and leading character
  if (cleaned.startsWith('+')) {
    // International format: +CC NNN NNN NNNN
    // Keep country code + area code (first ~5-7 digits after +), hash the rest
    const digitsOnly = cleaned.substring(1); // Remove +
    
    if (digitsOnly.length <= 7) {
      return `+<${anonymize(digitsOnly, 'phone-intl-short')}>`;
    }
    
    const visiblePart = digitsOnly.substring(0, Math.min(5, digitsOnly.length - 2));
    const hiddenPart = digitsOnly.substring(Math.min(5, digitsOnly.length - 2));
    const hashedHidden = anonymize(hiddenPart, 'phone-intl-hidden').substring(0, 8);
    
    return `+${visiblePart} ${'X'.repeat(hiddenPart.length)} ${hashedHidden}`;
  }
  
  // Local format: keep area code, hide the rest
  const visibleLength = Math.min(3, cleaned.length - 4);
  if (visibleLength <= 0) {
    return `<${anonymize(cleaned, 'phone-local-full')}>`;
  }
  
  const visiblePart = cleaned.substring(0, visibleLength);
  const hiddenPart = cleaned.substring(visibleLength);
  const hashedHidden = anonymize(hiddenPart, 'phone-local-hidden').substring(0, 8);
  
  return `${visiblePart}${'X'.repeat(hiddenPart.length)} ${hashedHidden}`;
}

/**
 * Anonymize a person's name
 * Completely hashes the name as it's fully identifying
 * Returns a consistent pseudonym for the same input
 * 
 * @param name - The full name to anonymize
 * @returns Anonymized name (e.g., "User_<hash>")
 * 
 * @example
 * ```typescript
 * const anonymized = anonymizeName('John Doe');
 * // Returns: "User_a3f2b8c1d4e5f6..."
 * ```
 */
export function anonymizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '<invalid-name>';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return '<empty-name>';
  }
  
  const hash = anonymize(trimmedName, 'person-name').substring(0, 12);
  
  return `User_${hash}`;
}

/**
 * Anonymize any arbitrary PII data
 * Generic function for custom PII types
 * 
 * @param data - The PII data to anonymize
 * @param piiType - Type label for domain separation (e.g., 'ssn', 'passport')
 * @returns Anonymized data string
 */
export function anonymizePII(data: string, piiType: string): string {
  if (!data || typeof data !== 'string') {
    return `<invalid-${piiType}>`;
  }
  
  return `<${anonymize(data.trim(), `pii-${piiType}`)}>`;
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Anonymize multiple values of the same type
 * More efficient than calling individual functions for bulk operations
 * 
 * @param values - Array of values to anonymize
 * @param type - Type of PII ('ip', 'email', 'phone', 'name', or custom)
 * @returns Array of anonymized values
 * 
 * @example
 * ```typescript
 * const emails = ['user1@ex.com', 'user2@ex.com'];
 * const anonymized = anonymizeBatch(emails, 'email');
 * ```
 */
export function anonymizeBatch(values: string[], type: 'ip' | 'email' | 'phone' | 'name' | string): string[] {
  const anonymizer = getAnonymizerForType(type);
  return values.map(value => anonymizer(value));
}

function getAnonymizerForType(type: string): (value: string) => string {
  switch (type) {
    case 'ip':
      return anonymizeIP;
    case 'email':
      return anonymizeEmail;
    case 'phone':
      return anonymizePhoneNumber;
    case 'name':
      return anonymizeName;
    default:
      return (value: string) => anonymizePII(value, type);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if anonymization is properly configured
 * Returns true if ANONYMIZATION_SALT is set and valid
 * 
 * @throws In production if salt is misconfigured
 */
export function isAnonymizationConfigured(): boolean {
  try {
    getAnonymizationSalt();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a deterministic anonymous ID for an entity
 * Useful for creating foreign keys in anonymized datasets
 * 
 * @param entityType - Type of entity ('user', 'device', 'session', etc.)
 * @param identifier - Unique identifier of the entity
 * @returns Consistent anonymous ID
 */
export function generateAnonymousId(entityType: string, identifier: string): string {
  const hash = anonymize(identifier, `entity-${entityType}`);
  return `${entityType}_${hash.substring(0, 16)}`;
}

/**
 * Validate that a value looks like properly anonymized data
 * Used for testing and audit purposes
 * 
 * @param value - Value to check
 * @param expectedFormat - Expected format type
 * @returns True if the value appears to be properly anonymized
 */
export function isValidAnonymizedValue(value: string, expectedFormat?: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // Common patterns for anonymized values
  const patterns = {
    ip: /^(\d{1,3}\.){2}\d{1,3}\.[a-f0-9]{8}$/i,
    email: /^[a-f0-9]{12}@.+$/,
    phone: /^\+?[\dX\s]+[a-f0-9]{8}$/i,
    name: /^User_[a-f0-9]{12}$/i,
    generic: /^<[a-f0-9]{64}>$/
  };
  
  if (expectedFormat && patterns[expectedFormat as keyof typeof patterns]) {
    return patterns[expectedFormat as keyof typeof patterns].test(value);
  }
  
  // If no specific format, check if it looks like any anonymized value
  return Object.values(patterns).some(pattern => pattern.test(value));
}

// ============================================================================
// Exports
// ============================================================================

export default {
  anonymize,
  anonymizeWithNamespace,
  anonymizeIP,
  anonymizeEmail,
  anonymizePhoneNumber,
  anonymizeName,
  anonymizePII,
  anonymizeBatch,
  isAnonymizationConfigured,
  generateAnonymousId,
  isValidAnonymizedValue
};
