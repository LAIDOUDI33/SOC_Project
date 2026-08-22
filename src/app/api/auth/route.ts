/**
 * National SOC Platform - Authentication API
 * 
 * Unified authentication endpoint supporting:
 * - Local database authentication (existing)
 * - LDAP/Active Directory authentication (Djezzy corporate)
 * - SAML 2.0 SSO initiation
 * - Session management
 * - Token refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokenPair, 
  verifyRefreshToken,
  generateSecureToken,
  validatePasswordStrength,
  type AuthResult,
  type TokenPair,
} from '@/lib/auth/utils';
import { authenticateUser as ldapAuth, syncUserWithDatabase, checkLDAPHealth } from '@/lib/auth/ldap';
import { initiateLogin as samlInitiateLogin, processResponse as samlProcessResponse } from '@/lib/auth/saml';
import { authRateLimiter } from '@/lib/middleware/rate-limit';

// ============================================================
// REQUEST TYPES
// ============================================================

interface LoginRequest {
  action: 'login' | 'register' | 'logout' | 'refresh' | 'me' | 'sso-init' | 'ldap-login';
  email?: string;
  username?: string;
  password?: string;
  name?: string;
  refreshToken?: string;
  idpId?: string; // For SSO
  relayState?: string; // For SSO
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  // SECURITY: Apply rate limiting to all auth endpoints
  const rateLimitResult = authRateLimiter(request);
  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  try {
    const body: LoginRequest = await request.json();
    const { action } = body;

    switch (action) {
      case 'login':
        return handleLocalLogin(body);
      
      case 'ldap-login':
        return handleLDAPLogin(body);
      
      case 'sso-init':
        return handleSSOInit(body);
      
      case 'register':
        return handleRegister(body);
      
      case 'logout':
        return handleLogout(request);
      
      case 'refresh':
        return handleTokenRefresh(body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'me':
      return handleGetMe(request);
    
    case 'methods':
      return getAvailableMethods();
    
    case 'health':
      return checkAuthHealth();
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action parameter' },
        { status: 400 }
      );
  }
}

// ============================================================
// LOCAL AUTHENTICATION
// ============================================================

async function handleLocalLogin(body: Partial<LoginRequest>): Promise<NextResponse> {
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required', errorCode: 'MISSING_CREDENTIALS' },
      { status: 400 }
    );
  }

  try {
    // Find user by email or username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: email }
        ],
        isActive: true
      },
      include: { role: true }
    });

    if (!user || user.passwordHash === 'LDAP_AUTH' || user.passwordHash === 'SAML_SSO') {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or use LDAP/SSO login', errorCode: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password!, user.passwordHash);
    
    if (!isValid) {
      // Log failed attempt (would implement rate limiting here)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Check if MFA is required
    if (user.isMfaEnabled) {
      return NextResponse.json({
        success: true,
        requiresMfa: true,
        userId: user.id,
        message: 'MFA verification required'
      });
    }

    // Generate tokens
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: [], // Would load from role
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Log audit event
    await logAuthEvent(user.id, 'LOGIN_LOCAL', 'success');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role.name,
        isMfaEnabled: user.isMfaEnabled,
      },
      tokens,
      authMethod: 'local'
    });

  } catch (error: any) {
    console.error('Local login error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed', errorCode: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================
// LDAP/ACTIVE DIRECTORY AUTHENTICATION
// ============================================================

async function handleLDAPLogin(body: Partial<LoginRequest>): Promise<NextResponse> {
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'Username and password are required', errorCode: 'MISSING_CREDENTIALS' },
      { status: 400 }
    );
  }

  try {
    // Authenticate against LDAP/AD
    const ldapResult = await ldapAuth(username!, password!);

    if (!ldapResult.success || !ldapResult.user) {
      // Log failed attempt
      await logAuthEvent('', 'LDAP_LOGIN', 'failure', { username, errorCode: ldapResult.errorCode });
      
      return NextResponse.json(
        { 
          success: false, 
          error: ldapResult.error || 'LDAP authentication failed',
          errorCode: ldapResult.errorCode || 'LDAP_ERROR'
        },
        { status: 401 }
      );
    }

    // Sync user with local database
    const syncResult = await syncUserWithDatabase(ldapResult.user);

    // Get full user record with role
    const user = await db.user.findUnique({
      where: { id: syncResult.userId },
      include: { role: true }
    });

    if (!user) {
      throw new Error('Failed to create/retrieve user after LDAP sync');
    }

    // Generate tokens
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: [],
    });

    // Log successful login
    await logAuthEvent(user.id, 'LDAP_LOGIN', 'success', {
      ldapDN: ldapResult.user.dn,
      groups: ldapResult.user.groups,
      warning: ldapResult.warning,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role.name,
        isMfaEnabled: user.isMfaEnabled,
        department: ldapResult.user.department,
        title: ldapResult.user.title,
      },
      tokens,
      authMethod: 'ldap',
      warning: ldapResult.warning,
      passwordExpiryDays: ldapResult.passwordExpiryDays,
      synced: {
        created: syncResult.created,
        updated: syncResult.updated,
        roleAssigned: syncResult.roleAssigned,
      }
    });

  } catch (error: any) {
    console.error('LDAP login error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'LDAP authentication service unavailable',
        errorCode: 'LDAP_SERVICE_ERROR'
      },
      { status: 503 }
    );
  }
}

// ============================================================
// SAML SSO INITIATION
// ============================================================

async function handleSSOInit(body: Partial<LoginRequest>): Promise<NextResponse> {
  const { idpId, relayState } = body;

  try {
    const result = await samlInitiateLogin(idpId, { relayState });

    if (!result.success || !result.redirectUrl) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to initiate SSO', errorCode: 'SSO_INIT_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl: result.redirectUrl,
      requestId: result.requestId,
      idpId: idpId || 'default',
    });

  } catch (error: any) {
    console.error('SSO init error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'SSO initialization failed', errorCode: 'SSO_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================
// REGISTRATION
// ============================================================

async function handleRegister(body: Partial<LoginRequest>): Promise<NextResponse> {
  const { email, username, password, name } = body as RegisterData;

  if (!email || !username || !password || !name) {
    return NextResponse.json(
      { success: false, error: 'All fields are required', errorCode: 'MISSING_FIELDS' },
      { status: 400 }
    );
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password!);
  if (!passwordValidation.isValid) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Password does not meet requirements',
        errors: passwordValidation.errors,
        errorCode: 'WEAK_PASSWORD'
      },
      { status: 400 }
    );
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: email! },
          { username: username! }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email or username already exists', errorCode: 'USER_EXISTS' },
        { status: 409 }
      );
    }

    // Get default role
    const defaultRole = await db.role.findFirst({ where: { name: 'analyst' } })
      || await db.role.findFirst();

    if (!defaultRole) {
      return NextResponse.json(
        { success: false, error: 'System configuration error', errorCode: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password!);

    const user = await db.user.create({
      data: {
        email: email!,
        username: username!,
        passwordHash: hashedPassword,
        name: name!,
        roleId: defaultRole.id,
      },
      include: { role: true }
    });

    // Generate tokens
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: [],
    });

    // Log registration event
    await logAuthEvent(user.id, 'REGISTER', 'success');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role.name,
        isMfaEnabled: user.isMfaEnabled,
      },
      tokens,
      authMethod: 'local'
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed', errorCode: 'REGISTRATION_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================
// LOGOUT
// ============================================================

async function handleLogout(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      // Verify token to get user ID for logging
      const verification = await verifyRefreshToken(token);
      if (verification.valid && verification.payload) {
        await logAuthEvent(verification.payload.userId, 'LOGOUT', 'success');
        
        // Invalidate refresh token (in production, add to token blacklist)
        // For now, just log the event
      }
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' });

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// ============================================================
// TOKEN REFRESH
// ============================================================

async function handleTokenRefresh(body: Partial<LoginRequest>): Promise<NextResponse> {
  const { refreshToken } = body;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: 'Refresh token is required', errorCode: 'MISSING_TOKEN' },
      { status: 400 }
    );
  }

  try {
    const verification = await verifyRefreshToken(refreshToken!);

    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token', errorCode: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: verification.payload.userId },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive', errorCode: 'USER_INACTIVE' },
        { status: 401 }
      );
    }

    // Generate new token pair
    const tokens = await generateTokenPair({
      id: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: [],
    });

    return NextResponse.json({
      success: true,
      tokens,
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Token refresh failed', errorCode: 'REFRESH_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET CURRENT USER
// ============================================================

async function handleGetMe(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify access token (we need a way to verify access tokens too)
    // For now, decode without verification for basic info
    // In production, always verify!
    const { verifyAccessToken } = await import('@/lib/auth/utils');
    const verification = await verifyAccessToken(token);

    if (!verification.valid || !verification.payload) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid token' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const user = await db.user.findUnique({
      where: { id: verification.payload.userId },
      include: { 
        role: true,
        _count: {
          select: {
            sessions: true,
            tasks: true,
            auditLogs: true,
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role.name,
        roleName: user.role.description,
        isMfaEnabled: user.isMfaEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        stats: {
          activeSessions: user._count.sessions,
          openTasks: user._count.tasks,
          recentAuditLogs: user._count.auditLogs,
        }
      }
    });

  } catch (error: any) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}

// ============================================================
// AVAILABLE AUTH METHODS
// ============================================================

function getAvailableMethods(): NextResponse {
  return NextResponse.json({
    success: true,
    methods: [
      {
        id: 'local',
        name: 'Local Account',
        description: 'Email and password authentication',
        enabled: true,
        icon: 'lock',
      },
      {
        id: 'ldap',
        name: 'Corporate Active Directory',
        description: 'Djezzy domain account (SSO)',
        enabled: process.env.LDAP_URL ? true : false,
        icon: 'building-2',
      },
      {
        id: 'saml',
        name: 'Single Sign-On (SAML)',
        description: 'Enterprise SSO via ADFS/Azure AD',
        enabled: process.env.SAML_IDP_SSO_URL ? true : false,
        icon: 'globe',
      }
    ].filter(m => m.enabled),
    defaultMethod: process.env.DEFAULT_AUTH_METHOD || 'local',
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================

async function checkAuthHealth(): Promise<NextResponse> {
  try {
    const [ldapHealth] = await Promise.all([
      checkLDAPHealth().catch(() => ({ status: 'unhealthy' as const, latencyMs: 0, details: [] })),
    ]);

    return NextResponse.json({
      success: true,
      status: 'operational',
      components: {
        local: { status: 'healthy', latencyMs: 0 },
        ldap: {
          status: ldapHealth.status,
          latencyMs: ldapHealth.latencyMs,
          serverCount: ldapHealth.serverCount,
        },
        saml: {
          status: process.env.SAML_IDP_SSO_URL ? 'configured' : 'not_configured',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 503 }
    );
  }
}

// ============================================================
// AUDIT LOGGING
// ============================================================

async function logAuthEvent(
  userId: string,
  eventType: string,
  outcome: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: userId || undefined,
        action: `AUTH_${eventType}`,
        entityType: 'authentication',
        outcome,
        ipAddress: metadata?.ipAddress || '',
        userAgent: metadata?.userAgent || '',
        details: JSON.stringify(metadata || {}),
        timestamp: new Date(),
      }
    });
  } catch (error) {
    console.error('Failed to log auth event:', error);
    // Don't throw - logging shouldn't break auth flow
  }
}
