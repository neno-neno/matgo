"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchProfileInventoryAuthed } from "@/lib/api";

type AuthUser = {
  id: string;
  role: "master" | "teacher" | "student";
  full_name: string;
  email: string;
  username?: string | null;
  student_pin?: string | null;
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

function getThemeStorageKey(userId: string) {
  return `${THEME_STORAGE_KEY}:${userId}`;
}

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
        const storedTheme = window.localStorage.getItem(getThemeStorageKey(parsed.user.id));
        setActiveThemeState(storedTheme || null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || !token || !user) {
      return;
    }
    let cancelled = false;
    const currentUser = user;
    const currentToken = token;
    if (!currentUser) {
      return;
    }

    async function syncThemeFromInventory() {
      try {
        const storageKey = getThemeStorageKey(currentUser.id);
        const storedTheme = window.localStorage.getItem(storageKey);
        if (storedTheme) {
          if (!cancelled) {
            setActiveThemeState(storedTheme);
          }
          return;
        }

        const inventory = await fetchProfileInventoryAuthed(currentToken, currentUser.id);
        if (cancelled) {
          return;
        }
        const equippedTheme = inventory.items.find((item) => item.category === "theme" && item.equipped);
        setActiveThemeState(equippedTheme?.id ?? null);
      } catch {
        if (!cancelled) {
          setActiveThemeState(null);
        }
      }
    }

    syncThemeFromInventory();
    return () => {
      cancelled = true;
    };
  }, [ready, token, user]);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    if (activeTheme) {
      document.body.dataset.matgoTheme = activeTheme;
      window.localStorage.setItem(getThemeStorageKey(user.id), activeTheme);
      return;
    }
    delete document.body.dataset.matgoTheme;
    window.localStorage.removeItem(getThemeStorageKey(user.id));
  }, [activeTheme, ready, user]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      ready,
      activeTheme,
      login: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        try {
          const storedTheme = window.localStorage.getItem(getThemeStorageKey(nextUser.id));
          setActiveThemeState(storedTheme || null);
        } catch {
          setActiveThemeState(null);
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
      },
      logout: () => {
        setToken(null);
        setUser(null);
        setActiveThemeState(null);
        delete document.body.dataset.matgoTheme;
        window.localStorage.removeItem(STORAGE_KEY);
        window.location.replace("/login");
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
