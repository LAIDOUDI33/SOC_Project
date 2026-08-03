/**
 * Djezzy National SOC Platform - Session Management
 * Secure session handling with ANRT compliance
 * Implements secure session creation, validation, and destruction
 * 
 * @module security/session-management
 * @version 1.0.0
 * @compliance OWASP Session Management Cheat Sheet, ANRT-SEC-007
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// ============================================
// Types and Interfaces
// ============================================

export interface SessionConfig {
  /** Session secret for signing */
  secret: string;
  /** Session max age in seconds (default: 8 hours) */
  maxAge?: number;
  /** Absolute session timeout in seconds (default: 24 hours) */
  absoluteTimeout?: number;
  /** Idle timeout in seconds (default: 30 minutes) */
  idleTimeout?: number;
  /** Number of concurrent sessions allowed per user (default: 3) */
  maxConcurrentSessions?: number;
  /** Whether to regenerate session ID on auth level change */
  regenerateOnAuthChange?: boolean;
  /** Cookie settings */
  cookie: {
    name: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    /** Additional cookie attributes */
    extraAttributes?: string[];
  };
}

export interface SessionData {
  /** Unique session identifier */
  sessionId: string;
  /** User ID this session belongs to */
  userId: string;
  /** Username for display */
  userName?: string;
  /** User roles */
  roles: string[];
  /** Authentication level */
  authLevel: 'none' | 'partial' | 'authenticated' | 'mfa_verified' | 'elevated';
  /** IP address when session was created */
  ipAddress: string;
  /** User agent when session was created */
  userAgent: string;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Session expiration timestamp */
  expiresAt: number;
  /** Whether session is currently valid */
  isValid: boolean;
  /** Invalid reason if not valid */
  invalidReason?: string;
  /** Custom data stored in session */
  data?: Record<string, unknown>;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  error?: SessionError;
  action?: 'continue' | 'refresh' | 'destroy' | 'reauthenticate';
}

export type SessionError =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_IDLE_TIMEOUT'
  | 'SESSION_INVALIDATED'
  | 'SESSION_SIGNATURE_INVALID'
  | 'SESSION_IP_MISMATCH'
  | 'SESSION_UA_MISMATCH'
  | 'CONCURRENT_SESSION_LIMIT_EXCEEDED';

export interface ConcurrentSessionInfo {
  activeSessions: number;
  maxAllowed: number;
  sessions: Array<{
    sessionId: string;
    createdAt: Date;
    lastActivity: Date;
    currentDevice?: boolean;
  }>;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: Required<Pick<SessionConfig, 'maxAge' | 'absoluteTimeout' | 'idleTimeout' | 'maxConcurrentSessions' | 'regenerateOnAuthChange'>> & { cookie: Required<SessionConfig['cookie']> } = {
  maxAge: 28800, // 8 hours
  absoluteTimeout: 86400, // 24 hours
  idleTimeout: 1800, // 30 minutes
  maxConcurrentSessions: 3,
  regenerateOnAuthChange: true,
  cookie: {
    name: '_soc_session',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    extraAttributes: [],
  },
};

// ============================================
// Session Manager Class
// ============================================

export class SessionManager {
  private config: Required<SessionConfig>;
  private store: Map<string, SessionData> = new Map();
  private userSessionIndex: Map<string, Set<string>> = new Map();
  
  constructor(config: SessionConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      cookie: {
        ...DEFAULT_CONFIG.cookie,
        ...config.cookie,
      },
    } as Required<SessionConfig>;
    
    if (!config.secret) {
      throw new Error('Session secret is required');
    }
    
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 60000);
  }
  
  /**
   * Create a new session for a user
   */
  async createSession(params: {
    userId: string;
    userName?: string;
    roles: string[];
    ipAddress: string;
    userAgent: string;
    authLevel?: SessionData['authLevel'];
    data?: Record<string, unknown>;
  }): Promise<{ session: SessionData; cookieValue: string }> {
    const sessionId = this.generateSecureSessionId();
    const now = Date.now();
    
    // Check concurrent session limit
    await this.enforceConcurrentSessionLimit(params.userId);
    
    const session: SessionData = {
      sessionId,
      userId: params.userId,
      userName: params.userName,
      roles: params.roles || [],
      authLevel: params.authLevel || 'authenticated',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + this.config.maxAge * 1000,
      isValid: true,
      data: params.data,
    };
    
    // Store session
    this.store.set(sessionId, session);
    
    // Index by user
    this.addToUserIndex(params.userId, sessionId);
    
    // Create signed cookie value
    const cookieValue = this.signSessionCookie(sessionId);
    
    return { session, cookieValue };
  }
  
  /**
   * Validate an existing session from cookie/token
   */
  async validateSession(
    cookieValue: string,
    options?: {
      ipAddress?: string;
      userAgent?: string;
      extendIdle?: boolean; // Extend idle timeout on validation
    }
  ): Promise<SessionValidationResult> {
    // Verify signature and extract session ID
    const sessionId = this.verifySessionCookie(cookieValue);
    
    if (!sessionId) {
      return {
        valid: false,
        error: 'SESSION_SIGNATURE_INVALID',
        action: 'destroy',
      };
    }
    
    // Get session from store
    const session = this.store.get(sessionId);
    
    if (!session) {
      return {
        valid: false,
        error: 'SESSION_NOT_FOUND',
        action: 'destroy',
      };
    }
    
    // Check if session is marked invalid
    if (!session.isValid) {
      return {
        valid: false,
        error: session.invalidReason || 'SESSION_INVALIDATED',
        action: 'destroy',
      };
    }
    
    // Check absolute timeout
    if (Date.now() - session.createdAt > this.config.absoluteTimeout * 1000) {
      await this.invalidateSession(sessionId, 'SESSION_EXPIRED');
      return {
        valid: false,
        error: 'SESSION_EXPIRED',
        action: 'destroy',
      };
    }
    
    // Check idle timeout
    const idleTime = Date.now() - session.lastActivityAt;
    if (idleTime > this.config.idleTimeout * 1000) {
      return {
        valid: false,
        error: 'SESSION_IDLE_TIMEOUT',
        action: 'reauthenticate',
      };
    }
    
    // Check IP address binding (if enabled)
    if (options?.ipAddress && this.shouldCheckIp()) {
      if (!this.isIpMatch(session.ipAddress, options.ipAddress)) {
        return {
          valid: false,
          error: 'SESSION_IP_MISMATCH',
          action: 'reauthenticate',
        };
      }
    }
    
    // Check user agent binding (if enabled)
    if (options?.userAgent && this.shouldCheckUa()) {
      if (session.userAgent !== options.userAgent) {
        return {
          valid: false,
          error: 'SESSION_UA_MISMATCH',
          action: 'reauthenticate',
        };
      }
    }
    
    // Extend idle timeout if requested
    if (options?.extendIdle !== false) {
      session.lastActivityAt = Date.now();
      session.expiresAt = Math.min(
        session.expiresAt + this.config.idleTimeout * 1000,
        session.createdAt + this.config.absoluteTimeout * 1000
      );
    }
    
    return {
      valid: true,
      session,
      action: 'continue',
    };
  }
  
  /**
   * Update session authentication level
   * Regenerates session ID if configured to do so
   */
  async updateAuthLevel(
    sessionId: string,
    newAuthLevel: SessionData['authLevel'],
    additionalRoles?: string[]
  ): Promise<{ session: SessionData; newCookieValue?: string }> {
    const session = this.store.get(sessionId);
    
    if (!session || !session.isValid) {
      throw new Error('Session not found or invalid');
    }
    
    const oldAuthLevel = session.authLevel;
    session.authLevel = newAuthLevel;
    session.lastActivityAt = Date.now();
    
    if (additionalRoles) {
      session.roles = [...new Set([...session.roles, ...additionalRoles])];
    }
    
    // Regenerate session ID on auth level change
    let newCookieValue: string | undefined;
    if (this.config.regenerateOnAuthChange && oldAuthLevel !== newAuthLevel) {
      const newSessionId = this.generateSecureSessionId();
      
      // Migrate data
      this.store.delete(sessionId);
      session.sessionId = newSessionId;
      this.store.set(newSessionId, session);
      
      // Update user index
      this.removeFromUserIndex(session.userId, sessionId);
      this.addToUserIndex(session.userId, newSessionId);
      
      newCookieValue = this.signSessionCookie(newSessionId);
    }
    
    return { session, newCookieValue };
  }
  
  /**
   * Invalidate/destroy a session
   */
  async invalidateSession(
    sessionId: string,
    reason?: string
  ): Promise<void> {
    const session = this.store.get(sessionId);
    
    if (session) {
      session.isValid = false;
      session.invalidReason = reason || 'SESSION_INVALIDATED';
      this.removeFromUserIndex(session.userId, sessionId);
      
      // Remove after a grace period (for audit)
      setTimeout(() => {
        this.store.delete(sessionId);
      }, 3600000); // 1 hour
    }
  }
  
  /**
   * Destroy all sessions for a user (e.g., password change, compromise)
   */
  async invalidateAllUserSessions(userId: string, reason?: string): Promise<number> {
    const sessionIds = this.userSessionIndex.get(userId);
    
    if (!sessionIds) return 0;
    
    let count = 0;
    for (const sessionId of sessionIds) {
      await this.invalidateSession(sessionId, reason || 'ALL_SESSIONS_INVALIDATED');
      count++;
    }
    
    this.userSessionIndex.delete(userId);
    return count;
  }
  
  /**
   * Get concurrent session info for a user
   */
  getConcurrentSessions(userId: string): ConcurrentSessionInfo {
    const sessionIds = this.userSessionIndex.get(userId);
    const sessions: ConcurrentSessionInfo['sessions'] = [];
    
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        const session = this.store.get(sessionId);
        if (session && session.isValid) {
          sessions.push({
            sessionId: session.sessionId.slice(0, 16) + '...', // Partial ID for security
            createdAt: new Date(session.createdAt),
            lastActivity: new Date(session.lastActivityAt),
          });
        }
      }
    }
    
    return {
      activeSessions: sessions.length,
      maxAllowed: this.config.maxConcurrentSessions,
      sessions,
    };
  }
  
  /**
   * Generate Set-Cookie header value for session
   */
  getSetCookieHeader(cookieValue: string): string {
    const attrs = [
      `${this.config.cookie.name}=${cookieValue}`,
      `Path=${this.config.cookie.path}`,
      `HttpOnly`,
      `Secure`,
      `SameSite=${this.config.cookie.sameSite.charAt(0).toUpperCase() + this.config.cookie.sameCode.slice(1)}`,
      `Max-Age=${this.config.maxAge}`,
      ...(this.config.cookie.domain ? [`Domain=${this.config.cookie.domain}`] : []),
      ...(this.config.cookie.extraAttributes || []),
    ];
    
    return attrs.join('; ');
  }
  
  /**
   * Generate Clear-Cookie header value for logout
   */  
  getClearCookieHeader(): string {
    return `${this.config.cookie.name}=; Path=${this.config.cookie.path}; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private generateSecureSessionId(): string {
    // Generate a cryptographically random session ID
    const bytes = randomBytes(32);
    return bytes.toString('base64url');
  }
  
  private signSessionCookie(sessionId: string): string {
    // Create HMAC-SHA256 signature
    const timestamp = Date.now().toString();
    const data = `${sessionId}.${timestamp}`;
    const signature = createHmac('sha256', this.config.secret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    return Buffer.from(`${data}.${signature}`).toString('base64url');
  }
  
  private verifySessionCookie(cookieValue: string): string | null {
    try {
      const decoded = Buffer.from(cookieValue, 'base64url').toString('utf8');
      const parts = decoded.split('.');
      
      if (parts.length !== 3) return null;
      
      const [sessionId, timestamp, signature] = parts;
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.config.secret)
        .update(`${sessionId}.${timestamp}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }
      
      // Check timestamp freshness (prevent replay within reasonable window)
      const cookieTime = parseInt(timestamp, 10);
      if (Date.now() - cookieTime > this.config.maxAge * 1000) {
        return null; // Cookie too old
      }
      
      return sessionId;
    } catch {
      return null;
    }
  }
  
  private shouldCheckIp(): boolean {
    // Could be configurable; default to checking in production
    return process.env.NODE_ENV === 'production';
  }
  
  private shouldCheckUa(): boolean {
    // User agent checking can be problematic with some browsers
    return process.env.SESSION_CHECK_UA === 'true';
  }
  
  private isIpMatch(storedIp: string, requestIp: string): boolean {
    // Handle proxied requests (X-Forwarded-For)
    // For simplicity, exact match here; could implement CIDR matching
    return storedIp === requestIp;
  }
  
  private addToUserIndex(userId: string, sessionId: string): void {
    if (!this.userSessionIndex.has(userId)) {
      this.userSessionIndex.set(userId, new Set());
    }
    this.userSessionIndex.get(userId)!.add(sessionId);
  }
  
  private removeFromUserIndex(userId: string, sessionId: string): void {
    const sessions = this.userSessionIndex.get(userId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.userSessionIndex.delete(userId);
      }
    }
  }
  
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const sessionIds = this.userSessionIndex.get(userId);
    
    if (sessionIds && sessionIds.size >= this.config.maxConcurrentSessions) {
      // Find oldest session and invalidate it
      let oldestSessionId: string | null = null;
      let oldestTime = Infinity;
      
      for (const sid of sessionIds) {
        const session = this.store.get(sid);
        if (session && session.isValid && session.lastActivityAt < oldestTime) {
          oldestTime = session.lastActivityAt;
          oldestSessionId = sid;
        }
      }
      
      if (oldestSessionId) {
        await this.invalidateSession(oldestSessionId, 'CONCURRENT_SESSION_LIMIT_EXCEEDED');
      }
    }
  }
  
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.store.entries()) {
      // Clean up expired or invalid sessions older than 1 hour
      if (
        !session.isValid ||
        session.expiresAt < now ||
        now - session.createdAt > this.config.absoluteTimeout * 1000 + 3600000
      ) {
        this.store.delete(sessionId);
        this.removeFromUserIndex(session.userId, sessionId);
      }
    }
  }
}

// ============================================
// Middleware Factory
// ============================================

/**
 * Create session middleware for Next.js API routes
 */
export function createSessionMiddleware(sessionManager: SessionManager) {
  return async (
    req: Request & { user?: SessionData },
    res: Response & { setHeader?: (name: string, value: string) => void },
    next: () => void
  ) => {
    // Extract session cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionCookie = extractCookie(cookieHeader, sessionManager['config'].cookie.name);
    
    if (!sessionCookie) {
      // No session - continue as unauthenticated
      return next();
    }
    
    // Validate session
    const result = await sessionManager.validateSession(sessionCookie, {
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: req.headers.get('user-agent') || undefined,
    });
    
    if (result.valid && result.session) {
      req.user = result.session;
      
      // Set refreshed cookie if needed
      // In actual implementation, would use proper response object
    } else if (result.action === 'destroy') {
      // Clear invalid session cookie
      // Response would include Set-Cookie: _soc_session=; Max-Age=0
    }
    
    next();
  };
}

function extractCookie(cookieHeader: string, name: string): string | undefined {
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [cookieName, ...cookieValueParts] = cookie.split('=');
    if (cookieName.trim() === name) {
      return cookieValueParts.join('=').trim();
    }
  }
  return undefined;
}

// ============================================
// Exports
// ============================================

export default {
  SessionManager,
  createSessionMiddleware,
};
