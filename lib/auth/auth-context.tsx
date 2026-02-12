"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "./types";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signInUrl: string;
  signOutUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  signInUrl: string;
  signOutUrl: string;
  initialUser: AuthUser | null;
}

/**
 * Client-side provider for resolved auth state and URLs.
 */
export function AuthProvider({
  children,
  signInUrl,
  signOutUrl,
  initialUser,
}: AuthProviderProps) {
  const [user] = useState<AuthUser | null>(initialUser);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    signInUrl,
    signOutUrl,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/**
 * Accesses the resolved auth context in client components.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
