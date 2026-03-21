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
  activeTheme: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (nextUser: AuthUser) => void;
  setActiveTheme: (themeId: string | null) => void;
};

const STORAGE_KEY = "mtd-auth";
const THEME_STORAGE_KEY = "mtd-theme";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTheme, setActiveThemeState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { token: string; user: AuthUser };
        setToken(parsed.token);
        setUser(parsed.user);
      }
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        setActiveThemeState(storedTheme);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (activeTheme) {
      document.body.dataset.matgoTheme = activeTheme;
      window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
      return;
    }
    delete document.body.dataset.matgoTheme;
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  }, [activeTheme, ready]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      ready,
      activeTheme,
      login: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
      },
      logout: () => {
        setToken(null);
        setUser(null);
        setActiveThemeState(null);
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      },
      updateUser: (nextUser) => {
        setUser(nextUser);
        if (token) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: nextUser }));
        }
      },
      setActiveTheme: (themeId) => {
        setActiveThemeState(themeId);
      },
    }),
    [activeTheme, ready, token, user],
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
