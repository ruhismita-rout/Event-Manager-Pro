import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

export type AuthRole = "organizer";

export type AuthUser = {
  role: AuthRole;
  name: string;
};

type LoginInput = {
  name: string;
  code: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isOrganizer: boolean;
  loginOrganizer: (input: LoginInput) => { success: true } | { success: false; error: string };
  logout: () => void;
};

const AUTH_STORAGE_KEY = "eventflow.auth";
const ORGANIZER_ACCESS_CODE = import.meta.env.VITE_ORGANIZER_ACCESS_CODE || "eventflow";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthUser> | null;
    if (parsed?.role !== "organizer" || typeof parsed.name !== "string" || !parsed.name.trim()) {
      return null;
    }

    return { role: "organizer", name: parsed.name.trim() };
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getAuthRoleFromStorage(): AuthRole | null {
  return readStoredUser()?.role ?? null;
}

export function getAuthNameFromStorage(): string | null {
  return readStoredUser()?.name ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isOrganizer: user?.role === "organizer",
    loginOrganizer: ({ name, code }) => {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return { success: false, error: "Enter a display name for the organizer window." };
      }

      if (code.trim() !== ORGANIZER_ACCESS_CODE) {
        return { success: false, error: "Invalid organizer access code." };
      }

      const nextUser: AuthUser = { role: "organizer", name: normalizedName };
      setUser(nextUser);
      writeStoredUser(nextUser);
      return { success: true };
    },
    logout: () => {
      setUser(null);
      writeStoredUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function RequireOrganizer({ children }: { children: React.ReactNode }) {
  const { isOrganizer } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isOrganizer) {
      setLocation("/login", { replace: true });
    }
  }, [isOrganizer, setLocation]);

  if (!isOrganizer) {
    return null;
  }

  return <>{children}</>;
}
