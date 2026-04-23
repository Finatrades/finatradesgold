import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
  status: 'Active' | 'Suspended' | 'Pending KYC' | 'Frozen';
  kycLevel: 0 | 1 | 2; // 0=None, 1=Personal, 2=Business
  joinedDate: string;
  lastLogin?: string;
}

interface UserContextType {
  users: UserProfile[];
  updateUserStatus: (id: string, status: UserProfile['status']) => void;
  updateUserKYC: (id: string, level: UserProfile['kycLevel']) => void;
  getUser: (email: string) => UserProfile | undefined;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const updateUserStatus = (id: string, status: UserProfile['status']) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    toast.success("User Updated", { description: `User status changed to ${status}` });
  };

  const updateUserKYC = (id: string, level: UserProfile['kycLevel']) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, kycLevel: level } : u));
    toast.success("KYC Updated", { description: `User KYC level changed to ${level}` });
  };

  const getUser = (email: string) => {
    return users.find(u => u.email === email);
  };

  return (
    <UserContext.Provider value={{ users, updateUserStatus, updateUserKYC, getUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserManagement must be used within a UserProvider');
  }
  return context;
}