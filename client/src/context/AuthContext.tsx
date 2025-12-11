import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUserManagement } from './UserContext';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  accountType: 'personal' | 'business';
  companyName?: string;
  kycStatus?: 'pending' | 'verified';
  role?: 'user' | 'admin';
  status?: 'Active' | 'Suspended' | 'Pending KYC' | 'Frozen'; // Added status
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
  const { getUser } = useUserManagement();

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem('fina_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // SYNC WITH USER MANAGEMENT
      const liveUser = getUser(parsedUser.email);
      
      if (liveUser) {
        // If user is found in the "DB", update local session with latest status/KYC
        const updatedUser: User = {
          ...parsedUser,
          status: liveUser.status,
          kycStatus: liveUser.kycLevel > 0 ? 'verified' : 'pending',
          role: liveUser.role
        };
        
        // If suspended, logout immediately
        if (liveUser.status === 'Suspended' || liveUser.status === 'Frozen') {
           setUser(null);
           localStorage.removeItem('fina_user');
           return;
        }

        setUser(updatedUser);
      } else {
        // Fallback for demo users not in list
        setUser(parsedUser);
      }
    }
  }, [getUser]);

  const login = (userData: User) => {
    // Check status before login
    const liveUser = getUser(userData.email);
    if (liveUser && (liveUser.status === 'Suspended' || liveUser.status === 'Frozen')) {
      alert("Your account is suspended. Please contact support.");
      return;
    }

    setUser(userData);
    localStorage.setItem('fina_user', JSON.stringify(userData));
    if (userData.role === 'admin') {
      setLocation('/admin');
    } else {
      setLocation('/dashboard');
    }
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
