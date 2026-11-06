import React, { useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  getStoredUsername,
  setStoredAuth,
  clearStoredAuth,
  onUnauthorized,
} from '@/api/client';
import { login as apiLogin, logout as apiLogout } from '@/api/subsrecon';
import { LoginRequest, AppError } from '@/types/api';
import { AuthContext, AuthUser } from './auth-context-base';
import { toast } from 'react-toastify';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = getStoredToken();
    const username = getStoredUsername();

    if (token && username) {
      setUser({ token, username });
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await apiLogout();
      }
    } catch {
      // Ignore logout errors if session was already expired
    } finally {
      clearStoredAuth();
      setUser(null);
      toast.info('Session ended.', { toastId: 'session-ended' });
    }
  }, []);

  // Listen to 401 unauthorized events
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      toast.error('Session expired or unauthorized. Please sign in again.', {
        toastId: 'auth-expired',
      });
    });

    return unsubscribe;
  }, []);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      const response = await apiLogin(credentials);
      if (response.success && response.data) {
        const { token, username } = response.data;
        setStoredAuth(token, username);
        setUser({ token, username });
        toast.success(`Welcome back, ${username}!`, { toastId: 'login-success' });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: unknown) {
      const appError = err as AppError;
      throw appError;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthProvider;
