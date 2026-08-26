"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.VIEWER]: 1,
  [UserRole.ANALYST]: 2,
  [UserRole.SUPERVISOR]: 3,
  [UserRole.ADMIN]: 4,
};

// Permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.VIEWER]: [
    "view:dashboard",
    "view:alerts",
    "view:incidents",
    "view:threats",
    "view:systems",
    "view:reports"
  ],
  [UserRole.ANALYST]: [
    // Inherits all VIEWER permissions
    "view:dashboard", "view:alerts", "view:incidents", 
    "view:threats", "view:systems", "view:reports",
    // Analyst-specific
    "acknowledge:alert",
    "update:incident",
    "add:comment",
    "export:data"
  ],
  [UserRole.SUPERVISOR]: [
    // Inherits all ANALYST permissions
    "view:dashboard", "view:alerts", "view:incidents", 
    "view:threats", "view:systems", "view:reports",
    "acknowledge:alert", "update:incident", "add:comment", "export:data",
    // Supervisor-specific
    "assign:incident",
    "escalate:incident",
    "close:incident",
    "manage:playbooks",
    "view:audit:logs"
  ],
  [UserRole.ADMIN]: [
    // All permissions including SUPERVISOR
    "view:dashboard", "view:alerts", "view:incidents", 
    "view:threats", "view:systems", "view:reports",
    "acknowledge:alert", "update:incident", "add:comment", "export:data",
    "assign:incident", "escalate:incident", "close:incident",
    "manage:playbooks", "view:audit:logs",
    // Admin-specific
    "manage:users",
    "manage:roles",
    "manage:settings",
    "manage:integrations",
    "system:configuration",
    "view:all:data"
  ]
};

// Main RBAC hook
export function useRBAC() {
  const { data: session, status } = useSession();
  
  const user = session?.user as any;
  const role = user?.role as UserRole | undefined;
  const isLoading = status === "loading";
  const isAuthenticated = !!session;

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  // Check if user has at least the specified role level
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!role) return false;
    return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  };

  // Check multiple permissions (AND logic - all required)
  const hasAllPermissions = (...permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  // Check multiple permissions (OR logic - at least one)
  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  // Get all user permissions
  const getPermissions = (): string[] => {
    if (!role) return [];
    return ROLE_PERMISSIONS[role] || [];
  };

  // Get role display info
  const getRoleInfo = () => ({
    name: role || "GUEST",
    label: role ? role.replace("_", " ") : "Guest User",
    color: getRoleColor(role),
    level: ROLE_HIERARCHY[role || UserRole.VIEWER] || 0,
    permissionsCount: getPermissions().length
  });

  return {
    // Auth state
    user,
    role,
    isAuthenticated,
    isLoading,
    
    // Permission checks
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
    getPermissions,
    getRoleInfo,
    
    // Convenience booleans for common roles
    isAdmin: role === UserRole.ADMIN,
    isSupervisor: role === UserRole.SUPERVISOR || role === UserRole.ADMIN,
    isAnalyst: role === UserRole.ANALYST || role === UserRole.SUPERVISOR || role === UserRole.ADMIN,
    isViewer: !!role, // Any authenticated user
  };
}

// Helper function to get role color
function getRoleColor(role?: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "text-purple-400 bg-purple-500/10 border-purple-500/30";
    case UserRole.SUPERVISOR:
      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    case UserRole.ANALYST:
      return "text-green-400 bg-green-500/10 border-green-500/30";
    case UserRole.VIEWER:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border-gray-500/30";
  }
}

// Protected Component Wrapper
interface ProtectedComponentProps {
  children: React.ReactNode;
  permission?: string;
  role?: UserRole;
  fallback?: React.ReactNode;
  unauthorizedMessage?: string;
}

export function ProtectedComponent({
  children,
  permission,
  role,
  fallback = null,
  unauthorizedMessage = "You don't have permission to access this content."
}: ProtectedComponentProps) {
  const { hasPermission: checkPermission, hasRole: checkRole, isAuthenticated, isLoading } = useRBAC();

  // Show nothing while loading
  if (isLoading) {
    return <div className="animate-pulse bg-slate-800 rounded-lg h-32" />;
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check permission if specified
  if (permission && !checkPermission(permission)) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-400">{unauthorizedMessage}</p>
      </div>
    );
  }

  // Check role if specified
  if (role && !checkRole(role)) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-400">{unauthorizedMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
