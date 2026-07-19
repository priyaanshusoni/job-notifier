"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api, User, SESSION_EXPIRED_EVENT } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  setAuth: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setAuth: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // The JWT lives in an httpOnly cookie the browser sends automatically,
  // so the session is restored by asking the server who we are.
  useEffect(() => {
    api.auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const setAuth = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Clears the httpOnly cookie server-side; fire-and-forget
    api.auth.logout().catch(() => {});
  }, []);

  // Expired/invalid session detected by the API client → log out everywhere
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      window.location.href = "/login";
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setAuth, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
