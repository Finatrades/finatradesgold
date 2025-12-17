import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import type { User } from '@shared/schema';
import { prefetchDashboardData, clearQueryCache } from '@/lib/queryClient';
import { preloadNGeniusSDK } from '@/lib/ngenius-sdk-loader';

interface MfaChallenge {
  requiresMfa: boolean;
  challengeToken: string;
  mfaMethod: 'totp' | 'email';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<MfaChallenge | null>;
  verifyMfa: (challengeToken: string, token: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
  setUser?: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check local storage on mount
    const storedUserId = localStorage.getItem('fina_user_id');
    if (storedUserId) {
      refreshUserById(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUserById = async (userId: string) => {
    try {
      const response = await fetch(`/api/auth/me/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Preload NGenius SDK in background for faster card payments
        if (data.user?.role !== 'admin') {
          preloadNGeniusSDK().catch(() => {});
        }
      } else {
        localStorage.removeItem('fina_user_id');
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('fina_user_id');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
      await refreshUserById(user.id);
    }
  };

  const login = async (email: string, password: string): Promise<MfaChallenge | null> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Check if MFA is required
      if (data.requiresMfa) {
        return {
          requiresMfa: true,
          challengeToken: data.challengeToken,
          mfaMethod: data.mfaMethod,
        };
      }
      
      setUser(data.user);
      localStorage.setItem('fina_user_id', data.user.id);
      
      if (data.user.role === 'admin') {
        setLocation('/admin');
      } else {
        prefetchDashboardData(data.user.id);
        // Preload NGenius SDK in background for faster card payments
        preloadNGeniusSDK().catch(() => {});
        setLocation('/dashboard');
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  };
  
  const verifyMfa = async (challengeToken: string, token: string) => {
    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'MFA verification failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('fina_user_id', data.user.id);
      
      if (data.user.role === 'admin') {
        setLocation('/admin');
      } else {
        prefetchDashboardData(data.user.id);
        // Preload NGenius SDK in background for faster card payments
        preloadNGeniusSDK().catch(() => {});
        setLocation('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('fina_user_id', data.user.id);
      setLocation('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearQueryCache();
    setUser(null);
    localStorage.removeItem('fina_user_id');
    sessionStorage.removeItem('adminPortalSession');
    setLocation('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, verifyMfa, register, logout, refreshUser, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
