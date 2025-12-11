import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
  accountType: 'personal' | 'business';
  kycStatus: 'Not Started' | 'In Progress' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  // Mapped fields for UI
  status: 'Active' | 'Suspended' | 'Pending KYC' | 'Frozen';
  kycLevel: 0 | 1 | 2;
  joinedDate: string;
}

interface UserContextType {
  users: UserProfile[];
  isLoading: boolean;
  updateUserStatus: (id: string, status: UserProfile['status']) => void;
  updateUserKYC: (id: string, level: UserProfile['kycLevel']) => void;
  getUser: (email: string) => UserProfile | undefined;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function mapUserToProfile(user: any): UserProfile {
  // Map kycStatus to kycLevel
  let kycLevel: 0 | 1 | 2 = 0;
  if (user.kycStatus === 'Approved') kycLevel = 2;
  else if (user.kycStatus === 'In Progress') kycLevel = 1;
  
  // Map to status for UI
  let status: UserProfile['status'] = 'Active';
  if (user.kycStatus === 'Not Started') status = 'Pending KYC';
  
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    status,
    kycLevel,
    joinedDate: new Date(user.createdAt).toLocaleDateString(),
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const users: UserProfile[] = (data?.users || []).map(mapUserToProfile);

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const updateUserStatus = (id: string, status: UserProfile['status']) => {
    // Map status to database field if needed
    updateMutation.mutate({ id, updates: { status } });
    toast.success("User Updated", { description: `User status changed to ${status}` });
  };

  const updateUserKYC = (id: string, level: UserProfile['kycLevel']) => {
    // Map kycLevel to kycStatus
    let kycStatus = 'Not Started';
    if (level === 1) kycStatus = 'In Progress';
    if (level === 2) kycStatus = 'Approved';
    
    updateMutation.mutate({ id, updates: { kycStatus } });
    toast.success("KYC Updated", { description: `User KYC level changed to ${level}` });
  };

  const getUser = (email: string) => {
    return users.find(u => u.email === email);
  };

  return (
    <UserContext.Provider value={{ users, isLoading, updateUserStatus, updateUserKYC, getUser, refetch }}>
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
