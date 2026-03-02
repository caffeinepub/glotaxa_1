import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
  currentPlan: string | null;
  setCurrentPlan: (plan: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userId: null,
  accessToken: null,
  currentPlan: null,
  setCurrentPlan: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('supabase_access_token');
    const uid = localStorage.getItem('supabase_user_id');
    setAccessToken(token);
    setUserId(uid);
  }, []);

  const logout = () => {
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_user_id');
    setAccessToken(null);
    setUserId(null);
    setCurrentPlan(null);
  };

  const isAuthenticated = !!(accessToken && userId);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userId, accessToken, currentPlan, setCurrentPlan, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
