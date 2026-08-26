/**
 * National SOC Platform - Authentication System (DISABLED)
 * Algeria 2026-2030 | Public Access Mode
 * 
 * ⚠️ AUTHENTICATION IS CURRENTLY DISABLED
 * 
 * This module provides stub exports for compatibility.
 * The platform is running in public access mode without authentication.
 * 
 * To re-enable authentication:
 * 1. Restore the original NextAuth configuration
 * 2. Update middleware.ts to require authentication
 * 3. Update use-rbac.tsx to check sessions
 */

import { UserRole } from '@prisma/client'

// ============= TYPES =============

interface SOCUser {
  id: string
  email: string
  name: string
  role: UserRole
  department?: string
  mfaEnabled: boolean
  isActive: boolean
  permissions?: any
}

interface SOCSession {
  user: SOCUser
  mfaVerified: boolean
  loginAt: Date
  ipAddress?: string
}

// ============= ROLE PERMISSIONS MAP (For Reference) =============
// All permissions return true in public access mode

export const ROLE_PERMISSIONS: Record<UserRole, {
  level: number
  canViewDashboard: boolean
  canViewAlerts: boolean
  canManageAlerts: boolean
  canCreateIncidents: boolean
  canManageIncidents: boolean
  canAccessThreatIntel: boolean
  canManageThreatIntel: boolean
  canAccessSystemConfig: boolean
  canManageUsers: boolean
  canViewReports: boolean
  canExportData: boolean
  canAccessApiKeys: boolean
}> = {
  SUPER_ADMIN: {
    level: 100,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: true, canManageIncidents: true, canAccessThreatIntel: true,
    canManageThreatIntel: true, canAccessSystemConfig: true, canManageUsers: true,
    canViewReports: true, canExportData: true, canAccessApiKeys: true
  },
  ADMIN: {
    level: 90,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: true, canManageIncidents: true, canAccessThreatIntel: true,
    canManageThreatIntel: true, canAccessSystemConfig: true, canManageUsers: true,
    canViewReports: true, canExportData: true, canAccessApiKeys: true
  },
  MANAGER: {
    level: 80,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: true, canManageIncidents: true, canAccessThreatIntel: true,
    canManageThreatIntel: false, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: true, canAccessApiKeys: false
  },
  THREAT_HUNTER: {
    level: 70,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: false, canManageIncidents: false, canAccessThreatIntel: true,
    canManageThreatIntel: true, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: true, canAccessApiKeys: false
  },
  INCIDENT_RESPONDER: {
    level: 60,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: true, canManageIncidents: true, canAccessThreatIntel: true,
    canManageThreatIntel: false, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: true, canAccessApiKeys: false
  },
  SENIOR_ANALYST: {
    level: 50,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: true, canManageIncidents: true, canAccessThreatIntel: true,
    canManageThreatIntel: false, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: true, canAccessApiKeys: false
  },
  ANALYST: {
    level: 40,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: true,
    canCreateIncidents: false, canManageIncidents: false, canAccessThreatIntel: true,
    canManageThreatIntel: false, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: false, canAccessApiKeys: false
  },
  VIEWER: {
    level: 10,
    canViewDashboard: true, canViewAlerts: true, canManageAlerts: false,
    canCreateIncidents: false, canManageIncidents: false, canAccessThreatIntel: false,
    canManageThreatIntel: false, canAccessSystemConfig: false, canManageUsers: false,
    canViewReports: true, canExportData: false, canAccessApiKeys: false
  }
}

// ============= DISABLED AUTH FUNCTIONS =============
// These are stubs that return null/undefined for compatibility

/**
 * Auth function - Returns null (no session) in public access mode
 * @deprecated Authentication is disabled
 */
export async function auth(): Promise<any> {
  // Return a mock session for public access
  return {
    user: {
      id: 'public-user',
      email: 'public@soc.local',
      name: 'Public User',
      role: 'SUPER_ADMIN',
      mfaEnabled: false
    }
  } as any
}

/**
 * signIn - No-op in public access mode
 * @deprecated Authentication is disabled
 */
export async function signIn(): Promise<void> {
  console.log('[Auth Disabled] signIn called - ignored')
}

/**
 * signOut - No-op in public access mode
 * @deprecated Authentication is disabled
 */
export async function signOut(): Promise<void> {
  console.log('[Auth Disabled] signOut called - ignored')
}

/**
 * Handlers for NextAuth API routes - returns empty handlers
 * @deprecated Authentication is disabled
 */
export const handlers = {
  GET: async () => new Response('Auth disabled', { status: 404 }),
  POST: async () => new Response('Auth disabled', { status: 404 })
}

// ============= RBAC UTILITIES (Always Grant Access) =============

/**
 * Check if user has required permission - ALWAYS RETURNS TRUE in public mode
 */
export function hasPermission(
  _userRole: UserRole,
  _permission: keyof typeof ROLE_PERMISSIONS[UserRole]
): boolean {
  return true // All permissions granted in public access mode
}

/**
 * Check if user's role meets minimum level - ALWAYS RETURNS TRUE in public mode
 */
export function hasMinimumRole(_userRole: UserRole, _minimumLevel: number): boolean {
  return true // All roles pass in public access mode
}

/**
 * Get allowed roles for specific action - Returns all roles
 */
export function getAllowedRoles(_permission: keyof typeof ROLE_PERMISSIONS[UserRole]): UserRole[] {
  return Object.keys(ROLE_PERMISSIONS) as UserRole[]
}

/**
 * Require specific role(s) - No-op in public mode (never throws)
 */
export function requireRole(
  _userRole: UserRole,
  _requiredRoles: UserRole[] | UserRole
): void {
  // Always passes in public access mode
}

// ============= EXPORTS =============

export { handlers, auth, signIn, signOut }
export type { SOCUser, SOCSession }
export { ROLE_PERMISSIONS }
