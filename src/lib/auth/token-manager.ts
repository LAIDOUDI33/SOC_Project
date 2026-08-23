/**
 * Token Blacklist & Session Management for Production
 * Handles token revocation, session tracking, and cleanup
 */
import { db } from '@/lib/db';
import crypto from 'crypto';

// In-memory blacklist for immediate lookups (synced to DB)
const tokenBlacklist = new Set<string>();
let lastBlacklistSync = Date.now();

interface BlacklistedToken {
  jti: string;           // JWT ID
  tokenHash: string;     // Hash of the full token
  reason: string;        // Why it was blacklisted
  blacklistedAt: Date;
  expiresAt: Date;        // When the token would have expired anyway
  blacklistedBy: string; // User ID who revoked it
}

/**
 * Add a token to the blacklist
 */
export async function blacklistToken(
  token: string, 
  reason: string = 'logout',
  userId?: string
): Promise<void> {
  try {
    // Decode JWT to get JTI (without verification for blacklisting)
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const jti = payload.jti || payload.sub; // Use JTI or subject
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date((payload.exp || 0) * 1000);
    
    // Add to in-memory blacklist (immediate effect)
    const blacklistKey = `${jti}:${tokenHash}`;
    tokenBlacklist.add(blacklistKey);
    
    // Persist to database (async)
    try {
      await db.blacklistedToken.create({
        data: {
          jti,
          tokenHash,
          reason,
          blacklistedAt: new Date(),
          expiresAt,
          blacklistedBy: userId || 'system'
        }
      });
    } catch (dbError) {
      // Table might not exist yet - still block in memory
      console.warn('Could not persist token blacklist to database');
    }
    
    // Clean up expired entries periodically
    if (Date.now() - lastBlacklistSync > 5 * 60 * 1000) { // Every 5 minutes
      syncBlacklistFromDb();
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Invalid tokens are "blacklisted"
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const jti = payload.jti || payload.sub;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const blacklistKey = `${jti}:${tokenHash}`;
    
    // Check in-memory first (fast path)
    if (tokenBlacklist.has(blacklistKey)) {
      return true;
    }
    
    // Check database (slow path, for distributed systems)
    try {
      const blacklisted = await db.blacklistedToken.findFirst({
        where: {
          OR: [
            { jti },
            { tokenHash }
          ],
          expiresAt: { gt: new Date() }
        }
      });
      
      if (blacklisted) {
        tokenBlacklist.add(blacklistKey); // Cache for future lookups
        return true;
      }
    } catch (dbError) {
      // Table doesn't exist - rely on in-memory only
    }
    
    return false;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return true; // Fail secure
  }
}

/**
 * Sync blacklist from database to memory
 */
async function syncBlacklistFromDb(): Promise<void> {
  try {
    const blacklistedTokens = await db.blacklistedToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: { jti: true, tokenHash: true }
    });
    
    // Rebuild in-memory set
    tokenBlacklist.clear();
    for (const token of blacklistedTokens) {
      const key = `${token.jti}:${token.tokenHash}`;
      tokenBlacklist.add(key);
    }
    
    lastBlacklistSync = Date.now();
  } catch (error) {
    // Ignore if table doesn't exist
  }
}

/**
 * Clean up expired blacklist entries
 */
export async function cleanupExpiredBlacklistedTokens(): Promise<number> {
  try {
    const result = await db.blacklistedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    
    return result.count;
  } catch (error) {
    return 0;
  }
}

/**
 * Invalidate all sessions for a user (e.g., password change, compromise)
 */
export async function invalidateAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
  try {
    await db.session.updateMany({
      where: {
        userId,
        ...(excludeSessionId && { id: { not: excludeSessionId } })
      },
      data: { expiresAt: new Date() } // Effectively expire them
    });
    
    // Also blacklist all their refresh tokens
    const activeSessions = await db.session.findMany({
      where: { userId, refreshToken: { not: null } }
    });
    
    for (const session of activeSessions) {
      if (session.refreshToken && session.id !== excludeSessionId) {
        await blacklistToken(session.refreshToken, 'session_invalidation', userId);
      }
    }
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
  }
}

/**
 * Create a new session record
 */
export async function createSession(
  userId: string,
  token: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
  deviceFingerprint?: string
): Promise<void> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Calculate expiry (access token: 15 min, refresh token: 7 days)
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await db.session.create({
      data: {
        userId,
        token: tokenHash,
        refreshToken: refreshTokenHash,
        ipAddress,
        userAgent,
        deviceFingerprint,
        expiresAt: refreshTokenExpiry,
        lastActivity: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
  }
}

/**
 * Validate and extend session (for refresh token flow)
 */
export async function validateAndExtendSession(
  sessionId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return false;
    }
    
    // Verify refresh token hash matches
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (session.refreshToken !== refreshTokenHash) {
      return false;
    }
    
    // Extend session
    await db.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Cleanup expired sessions (run via cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    
    return result.count;
  } catch (error) {
    return 0;
  }
}
