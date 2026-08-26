/**
 * National SOC Platform - Role-Based Access Control Hook (DISABLED)
 * Algeria 2026-2030 | Public Access Mode
 * 
 * ⚠️ RBAC IS CURRENTLY DISABLED
 * 
 * This module provides stub hooks that always grant full access.
 * The platform is running in public access mode without authentication.
 * 
 * To re-enable RBAC:
 * 1. Restore original useSession from next-auth/react
 * 2. Re-enable permission checks against user role
 */

'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole, ROLE_PERMISSIONS } from '../lib/auth'

// ============= TYPES =============

interface UseRBACOptions {
  requiredRole?: UserRole | UserRole[]
  requiredPermission?: keyof typeof ROLE_PERMISSIONS[UserRole]
  redirectTo?: string
}

// ============= MAIN RBAC HOOK (Public Access Mode) =============

/**
 * useRBAC hook - Always grants full access in public mode
 */
export function useRBAC(options: UseRBACOptions = {}) {
  const router = useRouter()
  
  // In public access mode, all permissions are granted
  const isLoading = false
  const isAuthenticated = true // Always authenticated in public mode
  const isAuthorized = true    // Always authorized in public mode
  
  // Mock user for public access (SUPER_ADMIN level)
  const user = {
    id: 'public-user',
    email: 'public@soc.local',
    name: 'SOC Operator',
    role: UserRole.SUPER_ADMIN as UserRole
  }
  
  const userRole = UserRole.SUPER_ADMIN

  // Check if user has specific permission - ALWAYS TRUE in public mode
  const checkPermission = (_permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean => {
    return true
  }

  // Check if user meets minimum role level - ALWAYS TRUE in public mode
  const checkMinimumLevel = (_level: number): boolean => {
    return true
  }

  // Check if user has required role(s) - ALWAYS TRUE in public mode
  const hasRequiredRole = (): boolean => {
    return true
  }

  // Check if user has required permission (from options) - ALWAYS TRUE
  const hasRequiredPermission = (): boolean => {
    return true
  }

  // Get current user's permissions object (full admin permissions)
  const permissions = ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]

  // No redirects needed in public access mode
  useEffect(() => {
    // No-op: no authentication or authorization checks
  }, [])

  return {
    // State
    user,
    userRole,
    isLoading,
    isAuthenticated,
    isAuthorized,
    
    // Permission checks (all return true)
    checkPermission,
    checkMinimumLevel,
    hasRequiredRole,
    hasRequiredPermission,
    
    // Permissions object (full admin)
    permissions,
    
    // Convenience booleans (all true)
    canViewDashboard: true,
    canViewAlerts: true,
    canManageAlerts: true,
    canCreateIncidents: true,
    canManageIncidents: true,
    canAccessThreatIntel: true,
    canManageThreatIntel: true,
    canAccessSystemConfig: true,
    canManageUsers: true,
    canViewReports: true,
    canExportData: true,
    canAccessApiKeys: true,
    
    // Role checks (all true)
    isAdmin: true,
    isManager: true,
    isAnalyst: true,
    isViewerOnly: false
  }
}

// ============= SPECIALIZED HOOKS (All Grant Full Access) =============

/**
 * Hook for alert-related permissions - All granted
 */
export function useAlertPermissions() {
  return {
    ...useRBAC(),
    canView: true,
    canManage: true,
    canAssign: true,
    canEscalate: true,
    canResolve: true,
    isLoading: false,
    isAuthenticated: true,
    isAuthorized: true
  }
}

/**
 * Hook for incident-related permissions - All granted
 */
export function useIncidentPermissions() {
  return {
    ...useRBAC(),
    canCreate: true,
    canManage: true,
    canClose: true,
    canEscalate: true,
    canGenerateReport: true,
    isLoading: false,
    isAuthenticated: true,
    isAuthorized: true
  }
}

/**
 * Hook for threat intelligence permissions - All granted
 */
export function useThreatIntelPermissions() {
  return {
    ...useRBAC(),
    canView: true,
    canManage: true,
    canImport: true,
    canExport: true,
    canConfigureFeeds: true,
    isLoading: false,
    isAuthenticated: true,
    isAuthorized: true
  }
}

/**
 * Hook for admin/system configuration permissions - All granted
 */
export function useAdminPermissions() {
  return {
    ...useRBAC(),
    canAccessAdminPanel: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canConfigureIntegrations: true,
    canManageApiKeys: true,
    isSuperAdmin: true,
    isLoading: false,
    isAuthenticated: true,
    isAuthorized: true
  }
}

// ============= AUTHORIZATION COMPONENTS =============

interface AuthorizedProps {
  children: React.ReactNode
  roles?: UserRole | UserRole[]
  permission?: keyof typeof ROLE_PERMISSIONS[UserRole]
  fallback?: React.ReactNode
}

/**
 * Component that ALWAYS renders children in public access mode
 */
export function Authorized({ 
  children, 
  fallback = null 
}: AuthorizedProps) {
  // Always render children in public access mode
  return <>{children}</>
}
