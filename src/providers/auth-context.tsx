'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import authService, { UserDetails, LoginPayload } from '@/services/auth.service';
import { PDMRole, PDMPermissions } from '@/types/auth.types';

interface AuthContextType {
  user: UserDetails | null;
  role: PDMRole | null;
  permissions: PDMPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  hasPermission: (permissionKey: keyof PDMPermissions) => boolean;
  isRole: (...roles: PDMRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const userDetails = await authService.getLoggedUser();
      setUser(userDetails);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pdm_user_session', JSON.stringify(userDetails));
      }
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pdm_user_session');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credentials: LoginPayload) => {
    setIsLoading(true);
    try {
      const res = await authService.login(credentials);
      if (res && res.user) {
        setUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pdm_user_session', JSON.stringify(res.user));
        }
      } else {
        await checkSession();
      }
      router.push('/dashboard');
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout request completed with warning:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
      queryClient.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pdm_user_session');
        localStorage.removeItem('pdm_session');
      }
      router.push('/login?logout=success');
    }
  };

  const hasPermission = (permissionKey: keyof PDMPermissions): boolean => {
    if (!user || !user.permissions) return false;
    return !!user.permissions[permissionKey];
  };

  const isRole = (...roles: PDMRole[]): boolean => {
    if (!user || !user.role) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        permissions: user?.permissions || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refetchUser: checkSession,
        hasPermission,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
