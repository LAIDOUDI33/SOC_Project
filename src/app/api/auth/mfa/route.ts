/**
 * National SOC Platform - MFA (Multi-Factor Authentication) API
 * 
 * Endpoints for MFA management:
 * - POST /api/auth/mfa/setup - Initialize MFA setup (generate secret)
 * - POST /api/auth/mfa/verify - Verify TOTP code
 * - POST /api/auth/mfa/enable - Enable MFA after verification
 * - POST /api/auth/mfa/disable - Disable MFA
 * - GET /api/auth/mfa/status - Check MFA status for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateMFASecret, verifyTOTPCode, generateSecureToken, verifyAccessToken, extractTokenFromHeader } from '@/lib/auth/utils';
import crypto from 'crypto';

// ============================================================
// ENCRYPTION UTILITIES FOR MFA SECRETS
// ============================================================

/**
 * Encrypt sensitive data (MFA secrets) using AES-256-GCM
 * SECURITY: Never store plaintext secrets in database
 */
async function encryptSensitiveData(plaintext: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and be at least 32 characters');
  }
  
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
async function decryptSensitiveData(encrypted: string): Promise<string> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set');
  }
  
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ============================================================
// TYPES
// ============================================================

interface MFASetupRequest {
  action: 'setup' | 'verify' | 'enable' | 'disable' | 'status';
  code?: string; // TOTP code for verification
  password?: string; // Current password to confirm identity before disable
}

interface MFASession {
  userId: string;
  tempSecret: string;
  createdAt: Date;
  verified: boolean;
}

// Temporary storage for MFA setup sessions (use Redis in production)
const mfaSessions = new Map<string, MFASession>();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, session] of mfaSessions.entries()) {
    if (now.getTime() - session.createdAt.getTime() > 10 * 60 * 1000) { // 10 min expiry
      mfaSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ============================================================
// HANDLERS
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: MFASetupRequest = await request.json();
    const { action } = body;

    switch (action) {
      case 'setup':
        return handleSetupMFA(request);
      
      case 'verify':
        return handleVerifyCode(body);
      
      case 'enable':
        return handleEnableMFA(body);
      
      case 'disable':
        return handleDisableMFA(request, body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('MFA API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleGetStatus(request);
}

// ============================================================
// SETUP MFA
// ============================================================

async function handleSetupMFA(request: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const authResult = await authenticateFromRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required', errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    // Note: MFA status should be checked from database, not JWT payload
    // For now, we'll allow re-setup of MFA if needed
    // if (authResult.user.isMfaEnabled) { ... }
    
    // Generate new TOTP secret
    const { secret, qrUrl } = generateMFASecret();

    // Store temporary session
    const sessionId = generateSecureToken(32);
    mfaSessions.set(sessionId, {
      userId: authResult.user.userId,
      tempSecret: secret,
      createdAt: new Date(),
      verified: false,
    });

    // Log event
    await logMFAEvent(authResult.user.userId, 'MFA_SETUP_INITIATED');

    return NextResponse.json({
      success: true,
      sessionId,
      secret, // Return secret so user can add to authenticator app
      qrUrl, // QR code URL for scanning
      instructions: [
        '1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
        '2. Or enter the secret key manually',
        '3. Enter the verification code from your app to complete setup',
        '4. Save backup codes in a secure location',
      ],
      expiresIn: '10 minutes', // Session expiry
    });

  } catch (error: any) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize MFA setup' },
      { status: 500 }
    );
  }
}

// ============================================================
// VERIFY CODE
// ============================================================

async function handleVerifyCode(body: Partial<MFASetupRequest>): Promise<NextResponse> {
  const { sessionId, code } = body as any;

  if (!sessionId || !code) {
    return NextResponse.json(
      { success: false, error: 'Session ID and code are required' },
      { status: 400 }
    );
  }

  // Get MFA session
  const session = mfaSessions.get(sessionId);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session', errorCode: 'SESSION_EXPIRED' },
      { status: 400 }
    );
  }

  // Verify the TOTP code
  const isValid = verifyTOTPCode(session.tempSecret, code!);

  if (!isValid) {
    await logMFAEvent(session.userId, 'MFA_VERIFY_FAILED');
    
    return NextResponse.json(
      { success: false, error: 'Invalid verification code', errorCode: 'INVALID_CODE' },
      { status: 400 }
    );
  }

  // Mark session as verified
  session.verified = true;
  mfaSessions.set(sessionId, session);

  await logMFAEvent(session.userId, 'MFA_VERIFY_SUCCESS');

  return NextResponse.json({
    success: true,
    message: 'Code verified successfully. Call enable action to activate MFA.',
    verified: true,
  });
}

// ============================================================
// ENABLE MFA
// ============================================================

async function handleEnableMFA(body: Partial<MFASetupRequest>): Promise<NextResponse> {
  const { sessionId, code } = body as any;

  if (!sessionId || !code) {
    return NextResponse.json(
      { success: false, error: 'Session ID and final verification code required' },
      { status: 400 }
    );
  }

  // Get and validate session
  const session = mfaSessions.get(sessionId);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 400 }
    );
  }

  if (!session.verified) {
    return NextResponse.json(
      { success: false, error: 'Please verify your code first using the verify action' },
      { status: 400 }
    );
  }

  // Final verification with the code
  const isValid = verifyTOTPCode(session.tempSecret, code!);

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: 'Final verification failed. Please restart setup.' },
      { status: 400 }
    );
  }

  try {
    // Enable MFA for user - ENCRYPT the secret before storing!
    const encryptedSecret = await encryptSensitiveData(session.tempSecret);
    
    await db.user.update({
      where: { id: session.userId },
      data: {
        isMfaEnabled: true,
        mfaSecret: encryptedSecret, // Now properly encrypted with AES-256-GCM
      }
    });

    // Clean up session
    mfaSessions.delete(sessionId);

    // Generate backup codes
    const backupCodes = generateBackupCodes(8); // 8 backup codes

    // Log event
    await logMFAEvent(session.userId, 'MFA_ENABLED');

    return NextResponse.json({
      success: true,
      message: 'MFA has been enabled successfully',
      backupCodes, // Show these once!
      warning: 'Save your backup codes securely. They will not be shown again.',
      nextSteps: [
        'Use your authenticator app to generate codes when logging in',
        'Keep backup codes safe for emergency access',
        'You can disable MFA at any time from security settings',
      ],
    });

  } catch (error: any) {
    console.error('MFA enable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enable MFA' },
      { status: 500 }
    );
  }
}

// ============================================================
// DISABLE MFA
// ============================================================

async function handleDisableMFA(request: NextRequest, body: Partial<MFASetupRequest>): Promise<NextResponse> {
  // Authenticate user
  const authResult = await authenticateFromRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { password } = body;

  if (!password) {
    return NextResponse.json(
      { success: false, error: 'Current password is required to disable MFA' },
      { status: 400 }
    );
  }

  try {
    // Verify user's current password
    const user = await db.user.findUnique({ where: { id: authResult.user.userId } });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { verifyPassword } = await import('@/lib/auth/utils');
    const isValid = await verifyPassword(password!, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Disable MFA
    await db.user.update({
      where: { id: authResult.user.userId },
      data: {
        isMfaEnabled: false,
        mfaSecret: null,
      }
    });

    await logMFAEvent(authResult.user.userId, 'MFA_DISABLED');

    return NextResponse.json({
      success: true,
      message: 'MFA has been disabled successfully',
      warning: 'Your account is now less secure. Consider re-enabling MFA.',
    });

  } catch (error: any) {
    console.error('MFA disable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET STATUS
// ============================================================

async function handleGetStatus(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticateFromRequest(request);
  
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { id: authResult.user.userId },
      select: {
        isMfaEnabled: true,
        mfaSecret: true, // Will be null/undefined in response
        updatedAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      mfa: {
        enabled: user?.isMfaEnabled || false,
        configured: !!user?.mfaSecret,
        lastModified: user?.updatedAt,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Authenticate user from request token
 */
async function authenticateFromRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: { userId: string; email: string; username: string };
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const verification = await verifyAccessToken(token);

    if (!verification.valid || !verification.payload) {
      return { success: false, error: 'Invalid token' };
    }

    return {
      success: true,
      user: {
        userId: verification.payload.userId,
        email: verification.payload.email,
        username: verification.payload.username,
      },
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate backup codes for MFA recovery
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code in format XXXX-XXXX
    const bytes = crypto.randomBytes(4);
    const code = bytes.toString('hex').toUpperCase().slice(0, 8);
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Log MFA-related events
 */
async function logMFAEvent(userId: string, eventType: string): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: eventType,
        resource: 'mfa',
        outcome: 'SUCCESS',
      }
    });
  } catch (error) {
    console.error('Failed to log MFA event:', error);
  }
}
