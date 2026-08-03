/**
 * Djezzy SOC Platform - Session State Caching Strategy
 * 
 * High-performance session management with Redis-backed storage:
 * - Distributed session support for multi-instance deployments
 * - Automatic session cleanup and expiration
 * - Secure session token generation
 * - Activity tracking for security monitoring
 */

import { initCacheRedis } from './api-response-caching';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

interface SessionData {
  /** Unique session identifier */
  sessionId: string;
  /** User ID this session belongs to */
  userId: string;
  /** Username for display purposes */
  username: string;
  /** User roles/permissions snapshot */
  roles: string[];
  /** Permissions derived from roles */
  permissions: string[];
  /** When session was created */
  createdAt: number;
  /** Last activity timestamp (for idle timeout) */
  lastActivityAt: number;
  /** IP address of session creation */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Whether session is from MFA-verified device */
  mfaVerified: boolean;
  /** Custom data stored in session */
  data?: Record<string, unknown>;
  /** Tenant/organization ID for multi-tenancy */
  tenantId: string;
}

interface SessionConfig {
  /** Absolute session timeout in seconds (max lifetime) */
  absoluteTimeout: number;
  /** Idle timeout in seconds (no activity) */
  idleTimeout: number;
  /** Sliding window expiration (extend on activity) */
  slidingExpiration: boolean;
  /** Enable concurrent session limiting */
  maxConcurrentSessions: number;
  /** Enable device fingerprinting */
  enableDeviceFingerprint: boolean;
  /** Session key prefix in Redis */
  keyPrefix: string;
}

interface SessionStats {
  activeSessions: number;
  sessionsCreatedToday: number;
  sessionsExpiredToday: number;
  avgSessionDuration: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  absoluteTimeout: 8 * 60 * 60,      // 8 hours max
  idleTimeout: 30 * 60,              // 30 minutes idle
  slidingExpiration: true,
  maxConcurrentSessions: 5,
  enableDeviceFingerprint: true,
  keyPrefix: 'soc:session:',
};

let sessionConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG };

/**
 * Configure session settings
 */
export function configureSession(options: Partial<SessionConfig>): void {
  sessionConfig = { ...sessionConfig, ...options };
}

// ============================================================
// SESSION CREATION
// ============================================================

interface CreateSessionOptions {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  mfaVerified?: boolean;
  tenantId: string;
  data?: Record<string, unknown>;
}

/**
 * Create a new user session
 */
export async function createSession(options: CreateSessionOptions): Promise<SessionData> {
  const redis = initCacheRedis();
  
  // Generate secure session ID
  const sessionId = generateSecureSessionId();
  
  const now = Date.now();
  
  const session: SessionData = {
    sessionId,
    userId: options.userId,
    username: options.username,
    roles: options.roles,
    permissions: options.permissions,
    createdAt: now,
    lastActivityAt: now,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    mfaVerified: options.mfaVerified || false,
    data: options.data,
    tenantId: options.tenantId,
  };
  
  // Check concurrent session limit
  if (sessionConfig.maxConcurrentSessions > 0) {
    await enforceSessionLimit(options.userId);
  }
  
  // Store session in Redis
  const sessionKey = `${sessionConfig.keyPrefix}${sessionId}`;
  await redis.setex(
    sessionKey,
    sessionConfig.absoluteTimeout,
    JSON.stringify(session)
  );
  
  // Index session by user for lookup
  const userSessionsKey = `${sessionConfig.keyPrefix}user:${options.userId}`;
  await redis.sadd(userSessionsKey, sessionId);
  await redis.expire(userSessionsKey, sessionConfig.absoluteTimeout);
  
  // Track session creation stats
  await incrementStat('sessions_created_today');
  
  return session;
}

/**
 * Generate cryptographically secure session ID
 */
function generateSecureSessionId(): string {
  const bytes = crypto.randomBytes(32);
  return `sess_${bytes.toString('base64url').replace(/=/g, '')}`;
}

// ============================================================
// SESSION RETRIEVAL & VALIDATION
// ============================================================

/**
 * Get and validate a session by ID
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  if (!sessionId) return null;
  
  try {
    const redis = initCacheRedis();
    const sessionKey = `${sessionConfig.keyPrefix}${sessionId}`;
    
    const raw = await redis.get(sessionKey);
    
    if (!raw) {
      return null; // Session not found or expired
    }
    
    const session: SessionData = JSON.parse(raw);
    
    // Check idle timeout
    if (Date.now() - session.lastActivityAt > sessionConfig.idleTimeout * 1000) {
      await destroySession(sessionId);
      await incrementStat('sessions_expired_today');
      return null; // Session expired due to inactivity
    }
    
    return session;
  } catch (error) {
    console.error('[SessionCache] Error retrieving session:', error);
    return null;
  }
}

/**
 * Validate session and optionally refresh activity timestamp
 */
export async function validateSession(
  sessionId: string,
  { refreshActivity = true }: { refreshActivity?: boolean } = {}
): Promise<{ valid: boolean; session: SessionData | null }> {
  const session = await getSession(sessionId);
  
  if (!session) {
    return { valid: false, session: null };
  }
  
  // Refresh last activity time if configured
  if (refreshActivity && sessionConfig.slidingExpiration) {
    await updateSessionActivity(sessionId);
  }
  
  return { valid: true, session };
}

// ============================================================
// SESSION UPDATES
// ============================================================

/**
 * Update session's last activity timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const redis = initCacheRedis();
    const sessionKey = `${sessionConfig.keyPrefix}${sessionId}`;
    
    // Use Lua script for atomic update
    const luaScript = `
      local session = redis.call('GET', KEYS[1])
      if not session then
        return nil
      end
      local parsed = cjson.decode(session)
      parsed.lastActivityAt = tonumber(ARGV[1])
      redis.call('SETEX', KEYS[1], ARGV[2], cjson.encode(parsed))
      return parsed
    `;
    
    await redis.eval(
      luaScript,
      1,
      sessionKey,
      Date.now().toString(),
      String(sessionConfig.absoluteTimeout)
    );
  } catch (error) {
    console.error('[SessionCache] Error updating activity:', error);
  }
}

/**
 * Update custom session data
 */
export async function updateSessionData(
  sessionId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const redis = initCacheRedis();
    const sessionKey = `${sessionConfig.keyPrefix}${sessionId}`;
    
    const luaScript = `
      local session = redis.call('GET', KEYS[1])
      if not session then
        return false
      end
      local parsed = cjson.decode(session)
      local newData = cjson.decode(ARGV[1])
      for k, v in pairs(newData) do
        parsed.data[k] = v
      end
      redis.call('SETEX', KEYS[1], ARGV[2], cjson.encode(parsed))
      return true
    `;
    
    const result = await redis.eval(
      luaScript,
      1,
      sessionKey,
      JSON.stringify(data),
      String(sessionConfig.absoluteTimeout)
    );
    
    return result === 1;
  } catch (error) {
    console.error('[SessionCache] Error updating session data:', error);
    return false;
  }
}

/**
 * Update user roles/permissions in session (after role change)
 */
export async function updateSessionPermissions(
  sessionId: string,
  roles: string[],
  permissions: string[]
): Promise<void> {
  await updateSessionData(sessionId, { _roles: roles, _permissions: permissions });
}

// ============================================================
// SESSION DESTRUCTION
// ============================================================

/**
 * Destroy a specific session (logout)
 */
export async function destroySession(sessionId: string): Promise<boolean> {
  try {
    const redis = initCacheRedis();
    const sessionKey = `${sessionConfig.keyPrefix}${sessionId}`;
    
    // Get session before deleting to clean up user index
    const raw = await redis.get(sessionKey);
    
    if (raw) {
      const session: SessionData = JSON.parse(raw);
      
      // Remove from user's session set
      const userSessionsKey = `${sessionConfig.keyPrefix}user:${session.userId}`;
      await redis.srem(userSessionsKey, sessionId);
    }
    
    // Delete the session itself
    const result = await redis.del(sessionKey);
    
    return result > 0;
  } catch (error) {
    console.error('[SessionCache] Error destroying session:', error);
    return false;
  }
}

/**
 * Destroy all sessions for a user (e.g., password change, security event)
 */
export async function destroyUserSessions(userId: string): Promise<number> {
  try {
    const redis = initCacheRedis();
    const userSessionsKey = `${sessionConfig.keyPrefix}user:${userId}`;
    
    // Get all session IDs for this user
    const sessionIds = await redis.smembers(userSessionsKey);
    
    if (sessionIds.length === 0) {
      return 0;
    }
    
    // Delete all sessions
    const pipeline = redis.pipeline();
    
    for (const sessionId of sessionIds) {
      pipeline.del(`${sessionConfig.keyPrefix}${sessionId}`);
    }
    
    pipeline.del(userSessionsKey);
    
    await pipeline.exec();
    
    return sessionIds.length;
  } catch (error) {
    console.error('[SessionCache] Error destroying user sessions:', error);
    return 0;
  }
}

/**
 * Enforce maximum concurrent sessions per user
 */
async function enforceSessionLimit(userId: string): Promise<void> {
  if (sessionConfig.maxConcurrentSessions <= 0) return;
  
  try {
    const redis = initCacheRedis();
    const userSessionsKey = `${sessionConfig.keyPrefix}user:${userId}`;
    
    const sessionIds = await redis.smembers(userSessionsKey);
    
    if (sessionIds.length >= sessionConfig.maxConcurrentSessions) {
      // Remove oldest sessions (by lastActivityAt)
      const sessionsWithTime: Array<{ id: string; time: number }> = [];
      
      for (const sid of sessionIds) {
        const raw = await redis.get(`${sessionConfig.keyPrefix}${sid}`);
        if (raw) {
          const session: SessionData = JSON.parse(raw);
          sessionsWithTime.push({ id: sid, time: session.lastActivityAt });
        }
      }
      
      // Sort by activity time (oldest first)
      sessionsWithTime.sort((a, b) => a.time - b.time);
      
      // Remove excess oldest sessions
      const toRemove = sessionsWithTime.slice(0, sessionsWithTime.length - sessionConfig.maxConcurrentSessions + 1);
      
      for (const session of toRemove) {
        await destroySession(session.id);
      }
    }
  } catch (error) {
    console.error('[SessionCache] Error enforcing session limit:', error);
  }
}

// ============================================================
// SESSION LISTING & STATS
// ============================================================

/**
 * Get all active session IDs for a user
 */
export async function getUserSessions(userId: string): Promise<string[]> {
  try {
    const redis = initCacheRedis();
    const userSessionsKey = `${sessionConfig.keyPrefix}user:${userId}`;
    
    return await redis.smembers(userSessionsKey);
  } catch (error) {
    console.error('[SessionCache] Error getting user sessions:', error);
    return [];
  }
}

/**
 * Get detailed info about user's active sessions
 */
export async function getUserSessionDetails(userId: string): Promise<Partial<SessionData>[]> {
  const sessionIds = await getUserSessions(userId);
  const sessions: Partial<SessionData>[] = [];
  
  for (const sessionId of sessionIds) {
    const session = await getSession(sessionId);
    if (session) {
      // Strip sensitive data
      sessions.push({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent.substring(0, 100), // Truncate long UAs
        mfaVerified: session.mfaVerified,
      });
    }
  }
  
  return sessions;
}

/**
 * Get global session statistics
 */
export async function getSessionStats(): Promise<SessionStats> {
  try {
    const redis = initCacheRedis();
    
    // Count active sessions
    let activeCount = 0;
    const stream = redis.scanStream({
      match: `${sessionConfig.keyPrefix}*`,
      count: 100,
      type: 'string',
    });
    
    for await (const keys of stream) {
      activeCount += keys.length;
    }
    
    // Get daily stats
    const createdToday = parseInt(await redis.get('soc:stat:sessions_created_today') || '0');
    const expiredToday = parseInt(await redis.get('soc:stat:sessions_expired_today') || '0');
    
    return {
      activeSessions: activeCount,
      sessionsCreatedToday: createdToday,
      sessionsExpiredToday: expiredToday,
      avgSessionDuration: 0, // Would need tracking implementation
    };
  } catch (error) {
    console.error('[SessionCache] Error getting stats:', error);
    return {
      activeSessions: 0,
      sessionsCreatedToday: 0,
      sessionsExpiredToday: 0,
      avgSessionDuration: 0,
    };
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

async function incrementStat(statName: string): Promise<void> {
  try {
    const redis = initCacheRedis();
    const key = `soc:stat:${statName}`;
    
    const exists = await redis.exists(key);
    await redis.incr(key);
    
    // Set expiry at start of next day if new counter
    if (!exists) {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
      await redis.expire(key, secondsUntilMidnight);
    }
  } catch (error) {
    // Stats are non-critical
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  // Redis TTL handles most cleanup automatically
  // This is for any orphaned entries or additional cleanup logic
  
  let cleaned = 0;
  
  try {
    const redis = initCacheRedis();
    const now = Date.now();
    const idleThreshold = now - (sessionConfig.idleTimeout * 1000);
    
    const stream = redis.scanStream({
      match: `${sessionConfig.keyPrefix}*`,
      count: 50,
    });
    
    for await (const keys of stream) {
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          const session: SessionData = JSON.parse(raw);
          if (session.lastActivityAt < idleThreshold) {
            await redis.del(key);
            cleaned++;
          }
        }
      }
    }
  } catch (error) {
    console.error('[SessionCache] Cleanup error:', error);
  }
  
  return cleaned;
}

// Export types
export type { SessionData, SessionConfig, CreateSessionOptions, SessionStats };
