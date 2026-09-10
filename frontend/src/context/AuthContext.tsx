"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@/types";
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    setTokenState(existingToken);
    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch {
      clearAuthToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (
    identifier: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<User> => {
    const res = await loginUser({ identifier, password, remember_me: rememberMe });
    setUser(res.user);
    setTokenState(res.access_token);
    return res.user;
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<User> => {
    const res = await registerUser({ username, email, password });
    setUser(res.user);
    setTokenState(res.access_token);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch {
      clearAuthToken();
    } finally {
      setUser(null);
      setTokenState(null);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
