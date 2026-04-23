import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "";

interface User {
  id: string;
  finatradesId: string;
  customFinatradesId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  kycStatus: string;
  kycTier: number;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem("@finatrades_token"),
        AsyncStorage.getItem("@finatrades_user"),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Login failed");
    }

    const data = await response.json();
    const userData: User = data.user;
    const authToken = data.token || "session";

    await Promise.all([
      AsyncStorage.setItem("@finatrades_token", authToken),
      AsyncStorage.setItem("@finatrades_user", JSON.stringify(userData)),
    ]);

    setToken(authToken);
    setUser(userData);
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
    } catch {}

    await Promise.all([
      AsyncStorage.removeItem("@finatrades_token"),
      AsyncStorage.removeItem("@finatrades_user"),
    ]);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
