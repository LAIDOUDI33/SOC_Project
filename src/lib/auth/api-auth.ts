/**
 * National SOC Platform - API Authentication Middleware
 * 
 * Provides authentication/authorization for API routes:
 * - JWT token verification
 * - Role-based access control
 * - Rate limiting integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, hasPermission, ROLE_PERMISSIONS } from './utils';

// ============================================================
// TYPES
// ============================================================

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  errorCode?: string;
}

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

/**
 * Authenticate request and extract user info
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // SECURITY: Only accept token via Authorization header or secure cookie
    // Query parameter tokens are NOT accepted (would be logged in access logs, proxy logs, etc.)
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader);
    
    // Fall back to cookie-based auth (HTTP-only, Secure flag in production)
    if (!token) {
      token = request.cookies.get('auth-token')?.value;
    }
    
    if (!token) {
      return {
        success: false,
        error: 'Authentication required. Provide Bearer token in Authorization header.',
        errorCode: 'NO_TOKEN'
      };
    }
    
    const verification = await verifyAccessToken(token);
    
    if (!verification.valid || !verification.payload) {
      return {
        success: false,
        error: 'Invalid or expired token',
        errorCode: 'INVALID_TOKEN'
      };
    }
    
    return {
      success: true,
      user: {
        userId: verification.payload.userId,
        email: verification.payload.email,
        username: verification.payload.username,
        roleId: verification.payload.roleId,
        roleName: verification.payload.roleName,
        permissions: verification.payload.permissions || []
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      errorCode: 'AUTH_ERROR'
    };
  }
}

/**
 * Check if user has required permission(s)
 */
export function requirePermission(
  user: AuthenticatedUser,
  permission: string | string[]
): { allowed: boolean; error?: string } {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAll = permissions.every(perm => 
    user.permissions.includes(perm) || hasPermission(user.roleName, perm)
  );
  
  if (!hasAll) {
    return {
      allowed: false,
      error: `Insufficient permissions. Required: ${permissions.join(', ')}`
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user has required role(s)
 */
export function requireRole(
  user: AuthenticatedUser,
  roles: string | string[]
): { allowed: boolean; error?: string } {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!requiredRoles.includes(user.roleName)) {
    return {
      allowed: false,
      error: `Required role: ${requiredRoles.join(' or ')}`
    };
  }
  
  return { allowed: true };
}

// ============================================================
// MIDDLEWARE HELPERS
// ============================================================

/**
 * Higher-order function to wrap API handlers with auth
 * Usage: withAuth(handler, { permissions: ['alerts:read'] })
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
  options?: {
    permissions?: string | string[];
    roles?: string | string[];
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Authenticate
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error,
          errorCode: authResult.errorCode 
        },
        { status: 401 }
      );
    }
    
    // Check permissions if specified
    if (options?.permissions) {
      const permCheck = requirePermission(authResult.user, options.permissions);
      if (!permCheck.allowed) {
        return NextResponse.json(
          { success: false, error: permCheck.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    
    // Check roles if specified
    if (options?.roles) {
      const roleCheck = requireRole(authResult.user, options.roles);
      if (!roleCheck.allowed) {
        return NextResponse.json(
          { success: false, error: roleCheck.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }
    
    // Call original handler with authenticated user
    return handler(request, authResult.user, ...args);
  };
}

/**
 * Optional auth - doesn't fail if no token, but adds user if present
 */
export async function optionalAuth(request: NextRequest): Promise<{
  user?: AuthenticatedUser;
  isAuthenticated: boolean;
}> {
  const result = await authenticateRequest(request);
  
  if (result.success && result.user) {
    return { user: result.user, isAuthenticated: true };
  }
  
  return { isAuthenticated: false };
}

// ============================================================
// STANDARDIZED RESPONSES
// ============================================================

export const AuthResponses = {
  unauthorized: () => NextResponse.json(
    { success: false, error: 'Authentication required', errorCode: 'UNAUTHORIZED' },
    { status: 401 }
  ),
  
  forbidden: (message?: string) => NextResponse.json(
    { success: false, error: message || 'Access denied', errorCode: 'FORBIDDEN' },
    { status: 403 }
  ),
  
  tokenExpired: () => NextResponse.json(
    { success: false, error: 'Token expired', errorCode: 'TOKEN_EXPIRED' },
    { status: 401 }
  ),
  
  invalidToken: () => NextResponse.json(
    { success: false, error: 'Invalid token', errorCode: 'INVALID_TOKEN' },
    { status: 401 }
  )
};

export default {
  authenticateRequest,
  requirePermission,
  requireRole,
  withAuth,
  optionalAuth,
  AuthResponses
};
