/**
 * Djezzy National SOC Platform - CSRF Protection
 * Cross-Site Request Forgery token generation and validation
 * Implements Double Submit Cookie pattern with HMAC binding
 * 
 * @module security/csrf-protection
 * @version 1.0.0
 * @compliance OWASP CSRF Prevention Cheat Sheet, ANRT-SEC-012
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

// ============================================
// Types and Interfaces
// ============================================

export interface CsrfTokenOptions {
  /** Token length in bytes (default: 32) */
  tokenLength?: number;
  /** Token expiry in seconds (default: 3600 = 1 hour) */
  maxAge?: number;
  /** Secret key for HMAC signing */
  secret: string;
  /** Cookie name for CSRF token */
  cookieName?: string;
  /** Header name for CSRF token (recommended) */
  headerName?: string;
  /** Form field name for fallback */
  fieldName?: string;
}

export interface CsrfToken {
  /** The raw token value (to be sent to client) */
  token: string;
  /** Signed version (for cookie) */
  signedToken: string;
  /** Expiration timestamp */
  expiresAt: Date;
}

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
  refreshToken?: boolean;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_OPTIONS: Required<Pick<CsrfTokenOptions, 'tokenLength' | 'maxAge' | 'cookieName' | 'headerName' | 'fieldName'>> = {
  tokenLength: 32,
  maxAge: 3600, // 1 hour
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  fieldName: '_csrf',
};

// ============================================
// CSRF Protection Class
// ============================================

export class CsrfProtection {
  private options: Required<CsrfTokenOptions>;
  
  constructor(options: CsrfTokenOptions) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as Required<CsrfTokenOptions>;
    
    if (!options.secret) {
      throw new Error('CSRF secret is required');
    }
  }
  
  /**
   * Generate a new CSRF token pair
   * Returns both the raw token (for forms/headers) and signed token (for cookies)
   */
  generate(): CsrfToken {
    const token = randomBytes(this.options.tokenLength).toString('base64url');
    const expiresAt = new Date(Date.now() + this.options.maxAge * 1000);
    const signedToken = this.signToken(token, expiresAt);
    
    return {
      token,
      signedToken,
      expiresAt,
    };
  }
  
  /**
   * Sign a token using HMAC-SHA256
   * Format: base64(timestamp).base64(signature).base64(token)
   */
  private signToken(token: string, expiresAt: Date): string {
    const timestamp = Math.floor(expiresAt.getTime() / 1000).toString();
    const signature = createHmac('sha256', this.secret)
      .update(`${timestamp}.${token}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    return Buffer.from(`${timestamp}.${signature}.${token}`).toString('base64url');
  }
  
  /**
   * Parse and verify a signed token
   */
  private parseSignedToken(signedToken: string): { token: string; valid: boolean; expired?: boolean } {
    try {
      const decoded = Buffer.from(signedToken, 'base64url').toString('utf8');
      const parts = decoded.split('.');
      
      if (parts.length !== 3) {
        return { token: '', valid: false };
      }
      
      const [timestampStr, signature, token] = parts;
      const timestamp = parseInt(timestampStr, 10);
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (now > timestamp + this.options.maxAge) {
        return { token, valid: false, expired: true };
      }
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.secret)
        .update(`${timestamp}.${token}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { token, valid: false };
      }
      
      return { token, valid: true };
    } catch {
      return { token: '', valid: false };
    }
  }
  
  /**
   * Validate a CSRF token from request
   * Supports both header-based and form-based validation
   */
  validate(
    submittedToken: string,
    cookieToken: string
  ): CsrfValidationResult {
    // Parse the cookie (signed) token to get expected value
    const parsedCookie = this.parseSignedToken(cookieToken);
    
    if (!parsedCookie.valid) {
      return {
        valid: false,
        error: parsedCookie.expired ? 'CSRF token has expired' : 'Invalid CSRF cookie',
        refreshToken: true,
      };
    }
    
    // Constant-time comparison of tokens
    try {
      const isValid = timingSafeEqual(
        Buffer.from(submittedToken),
        Buffer.from(parsedCookie.token)
      );
      
      if (!isValid) {
        return {
          valid: false,
          error: 'CSRF token mismatch',
        };
      }
      
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid CSRF token format',
      };
    }
  }
  
  /**
   * Validate CSRF from request-like object
   * Extracts tokens from headers or body
   */
  validateFromRequest(request: {
    headers: Record<string, string | undefined>;
    body?: Record<string, unknown>;
  }): CsrfValidationResult {
    // Get cookie token
    const cookieHeader = request.headers['cookie'];
    const cookieToken = this.extractCookie(cookieHeader || '', this.options.cookieName);
    
    if (!cookieToken) {
      return {
        valid: false,
        error: 'Missing CSRF cookie',
        refreshToken: true,
      };
    }
    
    // Get submitted token (prefer header, fall back to body)
    const submittedToken =
      request.headers[this.options.headerName.toLowerCase()] ||
      (request.body?.[this.options.fieldName] as string) ||
      '';
    
    if (!submittedToken) {
      return {
        valid: false,
        error: 'Missing CSRF token in request',
      };
    }
    
    return this.validate(submittedToken, cookieToken);
  }
  
  /**
   * Extract a specific cookie value from Cookie header
   */
  private extractCookie(cookieHeader: string, name: string): string | undefined {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      const [cookieName, ...cookieValueParts] = cookie.split('=');
      if (cookieName.trim() === name) {
        return cookieValueParts.join('=').trim();
      }
    }
    return undefined;
  }
  
  /**
   * Generate Set-Cookie header value for CSRF token
   */
  getCookieHeaderValue(signedToken: string): string {
    const attributes = [
      `${this.options.cookieName}=${signedToken}`,
      'Path=/',
      'HttpOnly=false', // Must be readable by JavaScript
      'Secure',
      'SameSite=Strict',
      `Max-Age=${this.options.maxAge}`,
    ];
    
    return attributes.join('; ');
  }
  
  /**
   * Middleware factory for Next.js/Express API routes
   */
  middleware(excludePaths?: RegExp[]) {
    return (
      req: Request & { csrfValidated?: boolean },
      res: Response & { setHeader?: (name: string, value: string) => void },
      next: () => void
    ) => {
      const url = new URL(req.url);
      
      // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Generate and set token for safe methods
        const token = this.generate();
        
        // Note: In actual implementation, set cookie properly
        res.headers = new Headers({
          ...Object.fromEntries(res.headers?.entries() || []),
          'X-CSRF-Token': token.token,
          'Set-Cookie': this.getCookieHeaderValue(token.signedToken),
        });
        
        return next();
      }
      
      // Check if path is excluded
      if (excludePaths?.some(pattern => pattern.test(url.pathname))) {
        return next();
      }
      
      // For state-changing methods, validate CSRF
      const result = this.validateFromRequest({
        headers: Object.fromEntries(req.headers.entries()),
        body: undefined, // Body would need to be parsed separately
      });
      
      if (!result.valid) {
        return Response.json(
          {
            error: 'CSRF validation failed',
            code: 'CSRF_ERROR',
            message: result.error,
            ...(result.refreshToken ? { refreshRequired: true } : {}),
          },
          { status: 403 }
        );
      }
      
      req.csrfValidated = true;
      next();
    };
  }
  
  /**
   * Generate nonce for Content Security Policy
   * Used in conjunction with CSP headers
   */
  generateNonce(): string {
    return randomBytes(16).toString('base64url');
  }
}

// ============================================
// Synchronized Token Pattern (Alternative)
// ============================================

/**
 * Server-side stored CSRF tokens (for stateful applications)
 * Requires session storage (Redis, etc.)
 */
export class SynchronizedCsrfProtection {
  private storage: Map<string, { token: string; expiresAt: Date }>;
  private options: CsrfTokenOptions;
  
  constructor(options: CsrfTokenOptions) {
    this.storage = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options } as CsrfTokenOptions;
  }
  
  /**
   * Generate and store a new CSRF token for a session
   */
  async generateForSession(sessionId: string): Promise<string> {
    const token = randomBytes(this.options.tokenLength || 32).toString('base64url');
    const expiresAt = new Date(Date.now() + (this.options.maxAge || 3600) * 1000);
    
    this.storage.set(sessionId, { token, expiresAt });
    
    // Clean up expired tokens periodically
    this.cleanupExpired();
    
    return token;
  }
  
  /**
   * Validate a CSRF token against stored value
   */
  async validateForSession(
    sessionId: string,
    submittedToken: string
  ): Promise<CsrfValidationResult> {
    const stored = this.storage.get(sessionId);
    
    if (!stored) {
      return { valid: false, error: 'No CSRF token found for session', refreshToken: true };
    }
    
    if (stored.expiresAt < new Date()) {
      this.storage.delete(sessionId);
      return { valid: false, error: 'CSRF token has expired', refreshToken: true };
    }
    
    try {
      const isValid = timingSafeEqual(
        Buffer.from(stored.token),
        Buffer.from(submittedToken)
      );
      
      // One-time use: remove after successful validation
      if (isValid) {
        this.storage.delete(sessionId);
      }
      
      return { valid: isValid, error: isValid ? undefined : 'CSRF token mismatch' };
    } catch {
      return { valid: false, error: 'Invalid CSRF token format' };
    }
  }
  
  /**
   * Remove all tokens for a session (on logout)
   */
  revokeSession(sessionId: string): void {
    this.storage.delete(sessionId);
  }
  
  /**
   * Clean up expired tokens
   */
  private cleanupExpired(): void {
    const now = new Date();
    for (const [key, value] of this.storage.entries()) {
      if (value.expiresAt < now) {
        this.storage.delete(key);
      }
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create a CSRF protection instance with recommended defaults
 */
export function createCsrfProtection(secret: string): CsrfProtection {
  return new CsrfProtection({ secret });
}

/**
 * Generate a one-time CSRF token for API usage
 * Useful for single-page applications without cookies
 */
export function generateOneTimeToken(secret: string, userId: string, action: string): string {
  const timestamp = Date.now().toString();
  const data = `${userId}:${action}:${timestamp}`;
  
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  return Buffer.from(`${data}:${signature}`).toString('base64url');
}

/**
 * Validate a one-time CSRF token
 */
export function validateOneTimeToken(
  token: string,
  secret: string,
  userId: string,
  action: string,
  maxAgeMs: number = 300000 // 5 minutes default
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [parsedUserId, parsedAction, timestamp, signature] = decoded.split(':');
    
    // Verify user and action match
    if (parsedUserId !== userId || parsedAction !== action) {
      return false;
    }
    
    // Verify timestamp within allowed window
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > maxAgeMs) {
      return false;
    }
    
    // Verify signature
    const data = `${userId}:${action}:${timestamp}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(data)
      .digest('hex');
    
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// ============================================
// Exports
// ============================================

export default {
  CsrfProtection,
  SynchronizedCsrfProtection,
  createCsrfProtection,
  generateOneTimeToken,
  validateOneTimeToken,
};
