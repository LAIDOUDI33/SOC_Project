/**
 * National SOC Platform - SAML 2.0 API Routes
 * 
 * Endpoints for SAML SSO integration:
 * - GET /api/auth/saml/metadata - SP Metadata (XML)
 * - POST /api/auth/saml/callback - ACS (Assertion Consumer Service)
 * - POST /api/auth/saml/logout - Single Logout
 * - GET /api/auth/saml/idps - Available IdPs for discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { processResponse, initiateLogout as samlInitiateLogout, processLogoutResponse, getMetadata, getIdPDiscoveryInfo, checkSAMLHealth } from '@/lib/auth/saml';
import { generateTokenPair } from '@/lib/auth/utils';
import { db } from '@/lib/db';

// ============================================================
// METADATA ENDPOINT
// ============================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'metadata':
      return handleGetMetadata();
    
    case 'idps':
      return handleGetIdPs();
    
    case 'health':
      return handleSAMLHealth();
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: metadata, idps, health' },
        { status: 400 }
      );
  }
}

async function handleGetMetadata(): Promise<NextResponse> {
  try {
    const metadata = getMetadata();
    
    return new NextResponse(metadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/samlmetadata+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
  } catch (error: any) {
    console.error('SAML metadata error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate metadata' },
      { status: 500 }
    );
  }
}

async function handleGetIdPs(): Promise<NextResponse> {
  try {
    const idps = getIdPDiscoveryInfo();
    
    return NextResponse.json({
      success: true,
      idps,
      discoveryUrl: '/auth/login?sso=true', // Frontend URL for IdP selection
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleSAMLHealth(): Promise<NextResponse> {
  try {
    const health = await checkSAMLHealth();
    
    return NextResponse.json({
      success: true,
      ...health,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 503 }
    );
  }
}

// ============================================================
// CALLBACK AND LOGOUT (POST)
// ============================================================

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    // JSON request (for logout response)
    const body = await request.json().catch(() => ({}));
    
    if (body.action === 'logout-response') {
      return handleLogoutResponse(body);
    }
  }

  // Form-encoded SAML response (from IdP)
  const formData = await request.formData().catch(() => null);
  
  if (!formData) {
    return NextResponse.json(
      { success: false, error: 'Invalid request format' },
      { status: 400 }
    );
  }

  const samlResponse = formData.get('SAMLResponse') as string;
  const relayState = formData.get('RelayState') as string | undefined;

  if (!samlResponse) {
    return NextResponse.json(
      { success: false, error: 'Missing SAMLResponse parameter' },
      { status: 400 }
    );
  }

  return handleCallback(samlResponse, relayState);
}

/**
 * Handle SAML assertion callback (Assertion Consumer Service)
 */
async function handleCallback(samlResponse: string, relayState?: string): Promise<NextResponse> {
  try {
    console.log('[SAML] Processing callback...');
    
    // Process and validate SAML response
    const result = await processResponse(samlResponse, { relayState });

    if (!result.success || !result.user) {
      console.error('[SAML] Callback failed:', result.error, result.errorCode);
      
      // Return error that frontend can display or redirect to login with error
      return NextResponse.json({
        success: false,
        error: result.error || 'SSO authentication failed',
        errorCode: result.errorCode || 'SSO_ERROR',
        redirectUrl: `/auth/login?error=${encodeURIComponent(result.errorCode || 'sso_failed')}`,
      }, { status: 401 });
    }

    const user = result.user;

    // Find or create user in database
    let dbUser = await db.user.findUnique({
      where: { username: user.attributes.id },
      include: { role: true }
    });

    if (!dbUser) {
      // Create new user from SAML data
      const defaultRole = await db.role.findFirst({ where: { name: user.attributes._role || 'analyst' } })
        || await db.role.findFirst();

      dbUser = await db.user.create({
        data: {
          email: user.attributes.email,
          username: user.attributes.id,
          passwordHash: 'SAML_SSO',
          name: user.attributes.name,
          roleId: defaultRole?.id || '',
          isActive: true,
          isMfaEnabled: false,
          lastLoginAt: new Date(),
        },
        include: { role: true }
      });
    } else {
      // Update existing user
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: {
          email: user.attributes.email,
          name: user.attributes.name,
          lastLoginAt: new Date(),
        },
        include: { role: true }
      });

      // Update role if different
      const newRole = user.attributes._role;
      if (newRole && newRole !== dbUser.role.name) {
        const role = await db.role.findUnique({ where: { name: newRole } });
        if (role) {
          await db.user.update({
            where: { id: dbUser.id },
            data: { roleId: role.id }
          });
          dbUser.role = role;
        }
      }
    }

    // Generate JWT tokens
    const tokens = await generateTokenPair({
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      roleId: dbUser.roleId,
      roleName: dbUser.role.name,
      permissions: [],
    });

    // Log successful SSO authentication
    await logSAMLEvent(dbUser.id, 'SSO_LOGIN', 'success', {
      nameID: user.nameID,
      idpId: user.idpId,
      sessionIndex: user.sessionIndex,
      assertionId: user.assertionId,
      groups: user.attributes.groups,
      relayState,
    });

    // Return success with tokens and redirect info
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role.name,
        isMfaEnabled: dbUser.isMfaEnabled,
        department: user.attributes.department,
        employeeId: user.attributes.employeeId,
      },
      tokens,
      authMethod: 'saml',
      authDetails: {
        idpUsed: result.idpUsed,
        nameID: user.nameID,
        sessionIndex: user.sessionIndex,
        expiresAt: user.expiresAt.toISOString(),
      },
      redirectUrl: relayState || '/dashboard', // Redirect after login
    });

  } catch (error: any) {
    console.error('[SAML] Callback processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process SAML response',
      errorCode: 'PROCESSING_ERROR',
      redirectUrl: `/auth/login?error=processing_error`,
    }, { status: 500 });
  }
}

/**
 * Handle SAML Logout Response
 */
async function handleLogoutResponse(body: any): Promise<NextResponse> {
  try {
    const { samlResponse } = body;

    if (!samlResponse) {
      return NextResponse.json(
        { success: false, error: 'Missing SAMLResponse' },
        { status: 400 }
      );
    }

    const result = await processLogoutResponse(samlResponse);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully logged out from IdP',
        redirectUrl: '/auth/login',
      });
    }

    return NextResponse.json(result, { status: 400 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Initiate SAML Single Logout
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ success: true }); // No session to logout
    }

    // In a real implementation, we'd extract the SAML session ID from our session store
    // For now, just return success
    const sessionId = ''; // Would come from session management

    if (!sessionId) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active SAML session' 
      });
    }

    const result = await samlInitiateLogout(sessionId);

    if (result.success && result.logoutUrl) {
      return NextResponse.json({
        success: true,
        logoutUrl: result.logoutUrl,
        requestId: result.requestId,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('SAML logout error:', error);
    // Still return success - local session should be cleared
    return NextResponse.json({ success: true });
  }
}

// ============================================================
// AUDIT LOGGING
// ============================================================

async function logSAMLEvent(
  userId: string,
  eventType: string,
  outcome: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: `AUTH_SAML_${eventType}`,
        resource: 'sso_authentication',
        outcome: (outcome === 'success' ? 'SUCCESS' : outcome === 'failure' ? 'FAILURE' : 'SUCCESS') as any,
        ipAddress: '',
        userAgent: '',
        metadata: JSON.stringify(metadata || {}),
      }
    });
  } catch (error) {
    console.error('Failed to log SAML event:', error);
  }
}
