"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ROLES } from "./roles";

export interface AuthUserState {
  id: string;
  email: string;
  name: string;
  badge: string | null;
  targetUrl: string | null;
  participantId?: string | null;
  teamId?: string | null;
  officialId?: string | null;
}

export interface AuthContextValue {
  user: AuthUserState | null;
  roles: string[];
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserState | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setRoles(data.user.roles || []);
          setPermissions(data.user.permissions || []);
        } else {
          setUser(null);
          setRoles([]);
          setPermissions([]);
        }
      } else {
        setUser(null);
        setRoles([]);
        setPermissions([]);
      }
    } catch (err) {
      setUser(null);
      setRoles([]);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  const hasPermissionCheck = useCallback(
    (permission: string): boolean => {
      if (roles.includes(ROLES.SUPER_ADMIN)) return true;
      return permissions.includes(permission);
    },
    [roles, permissions]
  );

  const hasAnyPermissionCheck = useCallback(
    (perms: string[]): boolean => {
      if (roles.includes(ROLES.SUPER_ADMIN)) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [roles, permissions]
  );

  const hasRoleCheck = useCallback(
    (roleName: string): boolean => {
      return roles.includes(roleName);
    },
    [roles]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      window.location.href = "/login";
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        isLoading,
        isAuthenticated: !!user,
        hasPermission: hasPermissionCheck,
        hasAnyPermission: hasAnyPermissionCheck,
        hasRole: hasRoleCheck,
        logout,
        refreshAuth: fetchAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    // Graceful fallback for non-wrapped components
    return {
      user: null,
      roles: [],
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasRole: () => false,
      logout: async () => {},
      refreshAuth: async () => {},
    };
  }
  return context;
}

/**
 * UI Visibility Gate Component
 * Controls UX display based on permissions.
 * NOTE: Backend authorization remains mandatory!
 */
export const PermissionGate: React.FC<{
  permission?: string;
  permissions?: string[];
  role?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, permissions, role, children, fallback = null }) => {
  const { hasPermission, hasAnyPermission, hasRole, isLoading } = useAuth();

  if (isLoading) return null;

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
