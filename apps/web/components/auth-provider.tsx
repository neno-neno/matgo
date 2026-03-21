"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  role: "master" | "teacher" | "student";
  full_name: string;
  email: string;
  avatar_url?: string | null;
  grade_band?: string | null;
  bio?: string | null;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  lives: number;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (nextUser: AuthUser) => void;
};

const STORAGE_KEY = "mtd-auth";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { token: string; user: AuthUser };
        setToken(parsed.token);
        setUser(parsed.user);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      ready,
      login: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
      },
      logout: () => {
        setToken(null);
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
      updateUser: (nextUser) => {
        setUser(nextUser);
        if (token) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: nextUser }));
        }
      },
    }),
    [ready, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
