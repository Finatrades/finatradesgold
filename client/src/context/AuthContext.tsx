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
  adminPortal: boolean;
  login: (email: string, password: string) => Promise<MfaChallenge | null>;
  adminLogin: (email: string, password: string) => Promise<MfaChallenge | null>;
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
  const [adminPortal, setAdminPortal] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check local storage on mount
    const storedUserId = localStorage.getItem('fina_user_id');
    if (storedUserId) {
      refreshUserById(storedUserId);
    } else {
      setLoading(false);
    }
    
    // Restore admin portal state from session storage
    const adminSession = sessionStorage.getItem('adminPortalSession');
    if (adminSession === 'true') {
      setAdminPortal(true);
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
        // Handle admin redirect case
        if (error.redirectTo) {
          const adminError = new Error(error.message || 'Login failed') as Error & { redirectTo?: string };
          adminError.redirectTo = error.redirectTo;
          throw adminError;
        }
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
      setAdminPortal(false);
      
      // Regular login always goes to user dashboard, even for admins
      // Admins must use /admin/login to access admin panel
      prefetchDashboardData(data.user.id);
      preloadNGeniusSDK().catch(() => {});
      setLocation('/dashboard');
      
      return null;
    } catch (error) {
      throw error;
    }
  };

  // Admin-specific login that grants admin portal access
  const adminLogin = async (email: string, password: string): Promise<MfaChallenge | null> => {
    try {
      const response = await fetch('/api/admin/login', {
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
        // Store that this is an admin login for MFA verification
        sessionStorage.setItem('pendingAdminLogin', 'true');
        return {
          requiresMfa: true,
          challengeToken: data.challengeToken,
          mfaMethod: data.mfaMethod,
        };
      }
      
      setUser(data.user);
      localStorage.setItem('fina_user_id', data.user.id);
      setAdminPortal(true);
      sessionStorage.setItem('adminPortalSession', 'true');
      setLocation('/admin/dashboard');
      
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
      
      // Set admin portal based on server response
      const isAdminPortal = data.adminPortal === true;
      setAdminPortal(isAdminPortal);
      
      if (isAdminPortal && data.user.role === 'admin') {
        sessionStorage.setItem('adminPortalSession', 'true');
        setLocation('/admin/dashboard');
      } else {
        prefetchDashboardData(data.user.id);
        preloadNGeniusSDK().catch(() => {});
        setLocation('/dashboard');
      }
      
      // Clean up pending admin login flag
      sessionStorage.removeItem('pendingAdminLogin');
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
    setAdminPortal(false);
    localStorage.removeItem('fina_user_id');
    sessionStorage.removeItem('adminPortalSession');
    sessionStorage.removeItem('pendingAdminLogin');
    
    // Also call server logout to destroy session
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    
    setLocation('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, adminPortal, login, adminLogin, verifyMfa, register, logout, refreshUser, loading, setUser }}>
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
