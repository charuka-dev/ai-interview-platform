import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, type User } from "./apiClient";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem("token"));

  // On mount, if we have a persisted token validate it by hitting /api/auth/me
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        // Token invalid / expired — clear it
        localStorage.removeItem("token");
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((t: string) => {
    localStorage.setItem("token", t);
    setToken(t);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: t } = await authApi.login(email, password);
      persist(t);
      const me = await authApi.me();
      setUser(me);
    },
    [persist]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { token: t } = await authApi.register(email, password, name);
      persist(t);
      const me = await authApi.me();
      setUser(me);
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
