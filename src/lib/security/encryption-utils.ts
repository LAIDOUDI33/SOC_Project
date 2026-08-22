/**
 * Djezzy National SOC Platform - Encryption Utilities
 * Comprehensive encryption/decryption for ANRT compliance (AES-256 minimum)
 * 
 * @module security/encryption-utils
 * @version 1.0.0
 * @compliance ANRT-SEC-009, NIST SP 800-38D, FIPS 140-2
 */

import { randomBytes, createCipheriv, createDecipheriv, scrypt, createHash, pbkdf2, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);

// ============================================
// Types and Interfaces
// ============================================

export interface EncryptionConfig {
  /** AES key (32 bytes for AES-256) */
  key: Buffer;
  /** Initialization vector length (16 bytes for AES) */
  ivLength?: number;
  /** Algorithm to use (default: aes-256-gcm) */
  algorithm?: 'aes-256-gcm' | 'aes-256-cbc' | 'aes-128-gcm' | 'chacha20-poly1305';
}

export interface EncryptedData {
  /** IV or nonce used for encryption */
  iv: string;
  /** Ciphertext (base64 encoded) */
  ciphertext: string;
  /** Authentication tag (for GCM/ChaCha modes) */
  tag?: string;
  /** Algorithm used */
  algorithm: string;
  /** Timestamp of encryption */
  encryptedAt: string;
  /** Key identifier for key rotation tracking */
  keyId?: string;
}

export interface HashOptions {
  algorithm?: 'sha256' | 'sha384' | 'sha512' | 'bcrypt' | 'argon2id';
  saltLength?: number;
  iterations?: number;
  /** For bcrypt only */
  rounds?: number;
  /** For argon2 only */
  memoryCost?: number;
  parallelism?: number;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  iterations: number;
  algorithm: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: 'rsa' | 'ec';
  keySize: number;
}

// ============================================
// Constants
// ============================================

const ALGORITHM_CONFIGS = {
  'aes-256-gcm': {
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    name: 'aes-256-gcm',
  },
  'aes-256-cbc': {
    keyLength: 32,
    ivLength: 16,
    name: 'aes-256-cbc',
  },
  'aes-128-gcm': {
    keyLength: 16,
    ivLength: 16,
    tagLength: 16,
    name: 'aes-128-gcm',
  },
};

// ============================================
// Symmetric Encryption Class
// ============================================

export class EncryptionUtils {
  private config: Required<Pick<EncryptionConfig, 'algorithm' | 'ivLength'>>;
  
  constructor(config: EncryptionConfig) {
    this.config = {
      algorithm: config.algorithm || 'aes-256-gcm',
      ivLength: config.ivLength || 16,
    };
    
    // Validate key length
    const expectedKeyLength = ALGORITHM_CONFIGS[this.config.algorithm]?.keyLength || 32;
    if (config.key.length !== expectedKeyLength) {
      throw new Error(
        `Invalid key length: expected ${expectedKeyLength} bytes for ${this.config.algorithm}, got ${config.key.length}`
      );
    }
    
    // Store config with key
    (this as any).key = config.key;
  }
  
  /**
   * Encrypt data using configured algorithm
   */
  encrypt(plaintext: string, options?: { keyId?: string; aad?: string }): EncryptedData {
    const iv = randomBytes(this.config.ivLength);
    const key = (this as any).key as Buffer;
    
    let ciphertext: Buffer;
    let tag: Buffer | undefined;
    
    if (this.config.algorithm === 'aes-256-gcm') {
      const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      
      if (options?.aad) {
        cipher.setAAD(Buffer.from(options.aad));
      }
      
      cipher.update(plaintext, 'utf8');
      cipher.final();
      
      ciphertext = Buffer.concat([cipher.getAuthTag(), cipher.read()]);
      tag = cipher.getAuthTag();
    } else if (this.config.algorithm === 'aes-256-cbc') {
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    } else {
      throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
    
    return {
      iv: iv.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      tag: tag?.toString('base64'),
      algorithm: this.config.algorithm,
      encryptedAt: new Date().toISOString(),
      keyId: options?.keyId,
    };
  }
  
  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData, options?: { aad?: string }): string {
    const key = (this as any).key as Buffer;
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    
    try {
      if (encryptedData.algorithm === 'aes-256-gcm') {
        if (!encryptedData.tag) {
          throw new Error('Missing authentication tag for GCM decryption');
        }
        
        const tag = Buffer.from(encryptedData.tag, 'base64');
        
        // Extract actual ciphertext (without tag)
        const actualCiphertext = ciphertext.slice(0, ciphertext.length - 16);
        
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        
        if (options?.aad) {
          decipher.setAAD(Buffer.from(options.aad));
        }
        
        const decrypted = decipher.update(actualCiphertext) + decipher.final('utf8');
        return decrypted;
        
      } else if (encryptedData.algorithm === 'aes-256-cbc') {
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = decipher.update(ciphertext) + decipher.final('utf8');
        return decrypted;
      }
      
      throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
    } catch (error) {
      // Don't expose error details in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Decryption failed');
      }
      throw error;
    }
  }
  
  /**
   * Encrypt an object (JSON serialization)
   */
  encryptObject<T extends Record<string, unknown>>(
    data: T,
    options?: { keyId?: string; aad?: string }
  ): EncryptedData {
    const plaintext = JSON.stringify(data);
    return this.encrypt(plaintext, options);
  }
  
  /**
   * Decrypt to object
   */
  decryptObject<T>(encryptedData: EncryptedData, options?: { aad?: string }): T {
    const decrypted = this.decrypt(encryptedData, options);
    return JSON.parse(decrypted) as T;
  }
  
  /**
   * Generate a new random encryption key
   */
  static generateKey(algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'aes-128-gcm' = 'aes-256-gcm'): Buffer {
    const keyLength = ALGORITHM_CONFIGS[algorithm]?.keyLength || 32;
    return randomBytes(keyLength);
  }
  
  /**
   * Convert key to storable format (base64)
   */
  static keyToString(key: Buffer): string {
    return key.toString('base64');
  }
  
  /**
   * Restore key from stored format
   */
  static keyFromString(base64Key: string): Buffer {
    return Buffer.from(base64Key, 'base64');
  }
}

// ============================================
// Password Hashing
// ============================================

export class PasswordHasher {
  private defaultIterations: number;
  private defaultSaltLength: number;
  
  constructor(options?: { iterations?: number; saltLength?: number }) {
    this.defaultIterations = options?.iterations || 600000; // OWASP recommendation for PBKDF2
    this.defaultSaltLength = options?.saltLength || 32;
  }
  
  /**
   * Hash a password securely
   * Uses PBKDF2-HMAC-SHA512 by default
   */
  async hash(password: string, options?: HashOptions): Promise<PasswordHashResult> {
    const algorithm = options?.algorithm || 'sha512';
    const salt = randomBytes(options?.saltLength || this.defaultSaltLength);
    const iterations = options?.iterations || this.defaultIterations;
    
    switch (options?.algorithm) {
      case 'sha256':
      case 'sha384':
      case 'sha512':
        const derivedKey = await pbkdf2Async(
          password,
          salt,
          iterations,
          64, // Output key material length
          `sha${algorithm.replace('sha', '')}`
        );
        
        return {
          hash: derivedKey.toString('base64'),
          salt: salt.toString('base64'),
          iterations,
          algorithm: `pbkdf2-${algorithm}`,
        };
        
      case 'bcrypt':
        // Would use bcrypt library in real implementation
        throw new Error('bcrypt requires external library - use sha512 or install bcrypt');
        
      case 'argon2id':
        // Would use argon2 library in real implementation
        throw new Error('argon2 requires external library - use sha512 or install argon2');
        
      default:
        // Default to SHA-512 via PBKDF2
        const defaultDerived = await pbkdf2Async(password, salt, iterations, 64, 'sha512');
        return {
          hash: defaultDerived.toString('base64'),
          salt: salt.toString('base64'),
          iterations,
          algorithm: 'pbkdf2-sha512',
        };
    }
  }
  
  /**
   * Verify a password against a hash
   * SECURITY: Uses constant-time comparison to prevent timing attacks
   */
  async verify(password: string, hashResult: PasswordHashResult): Promise<boolean> {
    try {
      const salt = Buffer.from(hashResult.salt, 'base64');
      
      const derivedKey = await pbkdf2Async(
        password,
        salt,
        hashResult.iterations,
        64,
        'sha512'
      );
      
      // SECURITY: Use crypto.timingSafeEqual for constant-time comparison
      // This prevents timing attacks that could reveal password similarity
      const computedHash = derivedKey.toString('base64');
      const storedHash = hashResult.hash;
      
      // Convert strings to buffers for timingSafeEqual comparison
      const computedBuf = Buffer.from(computedHash, 'utf8');
      const storedBuf = Buffer.from(storedHash, 'utf8');
      
      // Lengths must match for timingSafeEqual
      if (computedBuf.length !== storedBuf.length) {
        return false;
      }
      
      try {
        return timingSafeEqual(computedBuf, storedBuf);
      } catch {
        // Fallback for Node.js versions without timingSafeEqual support
        let result = 0;
        for (let i = 0; i < computedBuf.length; i++) {
          result |= computedBuf[i] ^ storedBuf[i];
        }
        return result === 0;
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Check if password needs rehashing (parameters changed)
   */
  needsRehash(hashResult: PasswordHashResult, currentOptions?: HashOptions): boolean {
    const targetIterations = currentOptions?.iterations || this.defaultIterations;
    
    return hashResult.iterations < targetIterations;
  }
}

// ============================================
// Token Generation and Verification
// ============================================

export class TokenGenerator {
  private secret: Buffer;
  
  constructor(secret: string | Buffer) {
    this.secret = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : secret;
  }
  
  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32, encoding: 'hex' | 'base64url' = 'hex'): string {
    const bytes = randomBytes(length);
    
    switch (encoding) {
      case 'base64url':
        return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      case 'hex':
      default:
        return bytes.toString('hex');
    }
  }
  
  /**
   * Generate a signed token (HMAC-based)
   */
  sign(payload: Record<string, unknown>, expiresIn?: number): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadStr = JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      ...(expiresIn ? { exp: Math.floor(Date.now() / 1000) + expiresIn } : {}),
    });
    const payloadEncoded = base64UrlEncode(payloadStr);
    
    const signature = createHmac('sha256', this.secret)
      .update(`${header}.${payloadEncoded}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    return `${header}.${payloadEncoded}.${signature}`;
  }
  
  /**
   * Verify a signed token
   */
  verify(token: string): { valid: boolean; payload?: Record<string, unknown>; expired?: boolean } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false };
      }
      
      const [headerEncoded, payloadEncoded, signature] = parts;
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.secret)
        .update(`${headerEncoded}.${payloadEncoded}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      if (signature !== expectedSignature) {
        return { valid: false };
      }
      
      // Decode payload
      const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as Record<string, unknown>;
      
      // Check expiration
      if (payload.exp && typeof payload.exp === 'number') {
        if (Math.floor(Date.now() / 1000) > payload.exp) {
          return { valid: false, expired: true, payload };
        }
      }
      
      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }
}

// ============================================
// Hashing Utilities
// ============================================

export class HashUtils {
  /**
   * Create a one-way hash (for lookup keys, identifiers, etc.)
   * NOT suitable for passwords!
   */
  static hash(data: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }
  
  /**
   * Create HMAC for data integrity verification
   */
  static hmac(data: string, key: string | Buffer, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha256'): string {
    return createHmac(algorithm, key).update(data).digest('hex');
  }
  
  /**
   * Generate a deterministic ID from input (for deduplication)
   */
  static deterministicId(input: string, prefix: string = ''): string {
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 16);
    return prefix ? `${prefix}_${hash}` : hash;
  }
  
  /**
   * Anonymize/hash PII for logging purposes
   * SECURITY: Requires ANONYMIZATION_SALT to be set - fails fast in production if not configured
   */
  static anonymizePii(pii: string): string {
    const salt = process.env.ANONYMIZATION_SALT;
    
    // SECURITY: Fail fast in production if salt not configured
    if (!salt) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: ANONYMIZATION_SALT environment variable must be set in production.\n' +
          'Generate with: openssl rand -base64 32'
        );
      }
      // In development, use a warning but allow operation
      console.warn(
        'WARNING: ANONYMIZATION_SALT not set. Using development-only fallback. ' +
        'This MUST be configured in production!'
      );
      return `${pii.charAt(0)}[DEV_MODE]${pii.charAt(pii.length - 1)}`;
    }
    
    const hash = createHmac('sha256', salt).update(pii).digest('hex').slice(0, 12);
    return `${pii.charAt(0)}${hash}${pii.charAt(pii.length - 1)}`;
  }
}

// ============================================
// Helper Functions
// ============================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  return Buffer.from(base64, 'base64').toString('utf8');
}

// ============================================
// Exports
// ============================================

export default {
  EncryptionUtils,
  PasswordHasher,
  TokenGenerator,
  HashUtils,
};
