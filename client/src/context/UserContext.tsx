import React, { createContext, useContext, useState, useEffect } from 'react';
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

// Initial Mock Data
const MOCK_USERS: UserProfile[] = [
  { id: '1', firstName: 'Demo', lastName: 'User', email: 'demo@finatrades.com', role: 'user', status: 'Pending KYC', kycLevel: 0, joinedDate: '2024-12-01' },
  { id: '2', firstName: 'Alice', lastName: 'Freeman', email: 'alice@example.com', role: 'user', status: 'Active', kycLevel: 1, joinedDate: '2024-11-15' },
  { id: '3', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', role: 'user', status: 'Active', kycLevel: 1, joinedDate: '2024-11-20' },
  { id: '4', firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', role: 'user', status: 'Suspended', kycLevel: 0, joinedDate: '2024-12-01' },
  { id: '99', firstName: 'Admin', lastName: 'Super', email: 'admin@finatrades.com', role: 'admin', status: 'Active', kycLevel: 2, joinedDate: '2024-10-01' },
];

interface UserContextType {
  users: UserProfile[];
  updateUserStatus: (id: string, status: UserProfile['status']) => void;
  updateUserKYC: (id: string, level: UserProfile['kycLevel']) => void;
  getUser: (email: string) => UserProfile | undefined;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);

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