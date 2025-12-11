import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  accountType: 'personal' | 'business';
  companyName?: string;
  kycStatus?: 'pending' | 'verified';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem('fina_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('fina_user', JSON.stringify(userData));
    setLocation('/dashboard');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fina_user');
    setLocation('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
