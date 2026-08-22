/**
 * National SOC Platform - Authentication Context
 * 
 * React context for managing authentication state:
 * - User session management
 * - Token refresh
 * - Auto-logout on expiry
 * - Global auth state
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Types
interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  isMfaEnabled: boolean;
  permissions?: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  
  // Helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  getAccessToken: () => string | null;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
// SECURITY NOTE: localStorage is vulnerable to XSS.
// For production, migrate to httpOnly cookies via server-side token management.
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'soc_access_token',
  REFRESH_TOKEN: 'soc_refresh_token',
  TOKEN_EXPIRES: 'soc_token_expires',
  USER_DATA: 'soc_user_data'
};

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        // Check if token is still valid
        const response = await fetch('/api/auth?action=me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token invalid, try to refresh
          const refreshed = await attemptTokenRefresh();
          if (!refreshed) {
            clearAuthData();
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      const data = await response.json();

      if (data.success && !data.requiresMfa) {
        setAuthData(data.user, data.tokens);
        return { success: true };
      }

      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (registerData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...registerData
        })
      });

      const data = await response.json();

      if (data.success) {
        setAuthData(data.user, data.tokens);
        return { success: true };
      }

      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (token) {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'logout' })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
      setUser(null);
    }
  }, []);

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) return false;

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh',
          refreshToken
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update tokens in storage
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.tokens.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.tokens.refreshToken);
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, data.tokens.expiresAt);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, []);

  // Permission check
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // This would normally check against role permissions
    // For now, admins have all permissions
    if (user.role === 'soc_admin') return true;
    
    return user.permissions.includes(permission);
  }, [user]);

  // Role check
  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role;
  }, [user]);

  // Get access token
  const getAccessToken = useCallback((): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }, []);

  // Helper to store auth data
  // SECURITY: In production, tokens should be managed via httpOnly cookies
  // This client-side storage is acceptable for development/internal tools
  // but should be migrated for internet-facing deployments
  const setAuthData = (userData: any, tokens: AuthTokens) => {
    // Validate token format before storing
    if (!tokens.accessToken || !tokens.refreshToken) {
      console.error('Invalid tokens received');
      return;
    }
    
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, tokens.expiresAt);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    
    setUser(userData);
  };

  // Helper to clear auth data
  const clearAuthData = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  };

  // Attempt token refresh
  const attemptTokenRefresh = async (): Promise<boolean> => {
    const refreshed = await refreshTokens();
    
    if (!refreshed) {
      clearAuthData();
      return false;
    }

    // Re-fetch user data with new token
    try {
      const newToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const response = await fetch('/api/auth?action=me', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!user) return;

    const checkInterval = setInterval(async () => {
      const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);
      
      if (expiresAt) {
        const expiryTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;

        // Refresh 5 minutes before expiry
        if (timeUntilExpiry < 5 * 60 * 1000) {
          const refreshed = await refreshTokens();
          
          if (!refreshed) {
            // Refresh failed, logout
            await logout();
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [user, refreshTokens, logout]);

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshTokens,
    hasPermission,
    hasRole,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requiredPermissions?: string[]; requiredRoles?: string[] }
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
    const router = require('next/navigation').useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    // Check permissions/roles if specified
    if (isAuthenticated && options) {
      const { requiredPermissions, requiredRoles } = options;
      
      if (requiredRoles?.length && !requiredRoles.some(role => hasRole(role))) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        );
      }

      if (requiredPermissions?.length && !requiredPermissions.some(perm => hasPermission(perm))) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Insufficient Permissions</h1>
              <p className="text-gray-600">You need additional permissions to view this page.</p>
            </div>
          </div>
        );
      }
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect
    }

    return <Component {...props} />;
  };
}

// Export default
export default AuthProvider;
