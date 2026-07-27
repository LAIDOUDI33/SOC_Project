/**
 * National SOC Platform - LDAP/Active Directory API
 * 
 * Endpoints for LDAP integration:
 * - GET /api/auth/ldap/health - LDAP connection health
 * - GET /api/auth/ldap/user/:username - Get LDAP user info (admin)
 * - POST /api/auth/ldap/sync - Trigger manual sync (admin)
 * - GET /api/auth/ldap/groups - List available groups for mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser as ldapAuth, 
  syncUserWithDatabase, 
  resolveUserGroups, 
  performBulkSync, 
  checkLDAPHealth,
  getConnectionPool,
} from '@/lib/auth/ldap';
import { withAuth, requireAdmin } from '@/lib/auth/middleware';

// ============================================================
// HEALTH CHECK
// ============================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'health':
      return handleHealthCheck();
    
    case 'user':
      return handleGetUser(searchParams.get('username'));
    
    case 'groups':
      return handleGetGroups();
    
    case 'config':
      return handleGetConfig();
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: health, user, groups, config' },
        { status: 400 }
      );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'sync':
      return handleBulkSync();
    
    case 'test-auth':
      return handleTestAuth(request);
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: sync, test-auth' },
        { status: 400 }
      );
  }
}

// ============================================================
// HANDLERS
// ============================================================

async function handleHealthCheck(): Promise<NextResponse> {
  try {
    const health = await checkLDAPHealth();

    return NextResponse.json({
      success: true,
      ...health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('LDAP health check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        status: 'unhealthy',
        error: error.message,
        details: [error.message],
      },
      { status: 503 }
    );
  }
}

async function handleGetUser(username: string | null): Promise<NextResponse> {
  if (!username) {
    return NextResponse.json(
      { success: false, error: 'Username parameter is required' },
      { status: 400 }
    );
  }

  // Require authentication and admin role for this endpoint
  const authResult = await withAuth(requireAdmin)(new NextRequest('http://localhost/api/auth/ldap?user=' + username));
  
  if (authResult.response) {
    return authResult.response;
  }

  try {
    // We can't actually authenticate without password, so we'll do a search instead
    // This would need a separate "search by username" function in the service
    
    return NextResponse.json({
      success: false,
      error: 'Direct user lookup requires admin LDAP credentials',
      hint: 'Use /api/auth/ldap?action=test-auth to verify a specific user exists',
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function handleGetGroups(): Promise<NextResponse> {
  // Would list all groups available for role mapping
  // This requires admin access to LDAP
  
  return NextResponse.json({
    success: true,
    groups: [
      // These would come from actual LDAP query
      { dn: 'CN=SOC Administrators,OU=SOC Groups,DC=djezzy,DC=dz', name: 'SOC Administrators', mappedRole: 'soc_admin' },
      { dn: 'CN=SOC Analysts,OU=SOC Groups,DC=djezzy,DC=dz', name: 'SOC Analysts', mappedRole: 'analyst' },
      { dn: 'CN=Thunt Hunters,OU=SOC Groups,DC=djezzy,DC=dz', name: 'Thunt Hunters', mappedRole: 'threat_hunter' },
      { dn: 'CN=Telecom Engineers,OU=SOC Groups,DC=djezzy,DC=dz', name: 'Telecom Engineers', mappedRole: 'telecom_engineer' },
      { dn: 'CN=Compliance Officers,OU=SOC Groups,DC=djezzy,DC=dz', name: 'Compliance Officers', mappedRole: 'compliance_officer' },
    ],
    message: 'Group listing requires LDAP connection. Showing configured mappings.',
  });
}

async function handleGetConfig(): Promise<NextResponse> {
  // Return sanitized configuration (no passwords/secrets)
  return NextResponse.json({
    success: true,
    config: {
      servers: process.env.LDAP_URL ? ['configured'] : [],
      baseDN: process.env.LDAP_BASE_DN || 'not configured',
      userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'not configured',
      syncEnabled: process.env.LDAP_SYNC_ENABLED === 'true',
      syncInterval: process.env.LDAP_SYNC_INTERVAL || '60 minutes',
      features: {
        passwordExpiryCheck: true,
        accountLockoutCheck: true,
        groupMembershipSync: true,
        nestedGroupLookup: true,
      },
    },
  });
}

async function handleBulkSync(): Promise<NextResponse> {
  // Require admin role
  const authResult = await withAuth(requireAdmin)(new NextRequest('http://localhost/api/auth/ldap?sync'));
  
  if (authResult.response) {
    return authResult.response;
  }

  try {
    console.log('[LDAP] Starting bulk sync...');
    const result = await performBulkSync();
    
    console.log(`[LDAP] Sync completed: ${result.usersCreated} created, ${result.usersUpdated} updated, ${result.usersDeactivated} deactivated`);
    
    return NextResponse.json({
      success: result.synced,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[LDAP] Bulk sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        synced: false,
      },
      { status: 500 }
    );
  }
}

async function handleTestAuth(request: NextRequest): Promise<NextResponse> {
  // Requires admin to test other users' auth
  const authResult = await withAuth(requireAdmin)(request);
  
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password required for test' },
        { status: 400 }
      );
    }

    const result = await ldapAuth(username, password);

    // Don't generate tokens for test auth, just return result
    return NextResponse.json({
      success: result.success,
      authenticated: result.success,
      userFound: !!result.user,
      errorCode: result.errorCode,
      warning: result.warning,
      mfaRequired: result.mfaRequired,
      passwordExpiryDays: result.passwordExpiryDays,
      // Don't return full user details for security
      userInfo: result.user ? {
        username: result.user.username,
        email: result.user.email,
        displayName: result.user.displayName,
        department: result.user.department,
        groups: result.user.groups,
        accountEnabled: result.user.accountEnabled,
      } : undefined,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
