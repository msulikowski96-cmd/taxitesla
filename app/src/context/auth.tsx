import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ProfileUpdate, RegisterInput, User } from '../api';
import { getToken, setToken } from '../api/storage';

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  register(input: RegisterInput): Promise<void>;
  login(login: string, password: string): Promise<void>;
  logout(): Promise<void>;
  updateProfile(update: ProfileUpdate): Promise<void>;
  deleteAccount(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTok] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getToken();
      if (saved) {
        try {
          setUser(await api.me(saved));
          setTok(saved);
        } catch {
          await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const startSession = useCallback(async (res: { user: User; token: string }) => {
    await setToken(res.token);
    setTok(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      register: async (input) => startSession(await api.register(input)),
      login: async (l, p) => startSession(await api.login(l, p)),
      logout,
      updateProfile: async (update) => {
        if (!token) return;
        setUser(await api.updateProfile(token, update));
      },
      deleteAccount: async () => {
        if (!token) return;
        await api.deleteAccount(token);
        await logout();
      },
    }),
    [user, token, loading, startSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
