import React, { createContext, useContext, ReactNode } from "react";
import { useB2bGetMe, type B2BUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: B2BUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error } = useB2bGetMe({
    query: {
      retry: false,
    }
  });

  const isAuthenticated = !!user && !error;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
