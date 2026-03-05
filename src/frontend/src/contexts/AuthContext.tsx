import { createClient } from "@supabase/supabase-js";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const SUPABASE_URL = "https://cvelhiuefcykduwgnjjs.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM";

// ---------------------------------------------------------------------------
// Supabase JS client (official SDK)
// ---------------------------------------------------------------------------
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
  currentPlan: string | null;
  sessionChecked: boolean;
  setCurrentPlan: (plan: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  userId: null,
  accessToken: null,
  currentPlan: null,
  sessionChecked: false,
  setCurrentPlan: () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  onSessionReady?: () => void;
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

export function AuthProvider({ children, onSessionReady }: AuthProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  // Tracks whether the initial session check has completed (for hiding UI flash)
  const [sessionChecked, setSessionChecked] = useState(false);

  const onSessionReadyRef = useRef(onSessionReady);
  onSessionReadyRef.current = onSessionReady;

  useEffect(() => {
    const applySession = (token: string, uid: string) => {
      localStorage.setItem("supabase_access_token", token);
      localStorage.setItem("supabase_user_id", uid);
      setAccessToken(token);
      setUserId(uid);
    };

    const clearSession = () => {
      localStorage.removeItem("supabase_access_token");
      localStorage.removeItem("supabase_user_id");
      setAccessToken(null);
      setUserId(null);
    };

    // STEP 1 — Check session immediately after page loads
    // This covers: magic link redirects, existing sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        applySession(session.access_token, session.user.id);
        onSessionReadyRef.current?.();
      } else {
        // Fallback: restore from localStorage if SDK session not available
        const storedToken = localStorage.getItem("supabase_access_token");
        const storedUid = localStorage.getItem("supabase_user_id");
        if (storedToken && storedUid) {
          setAccessToken(storedToken);
          setUserId(storedUid);
          onSessionReadyRef.current?.();
        }
      }
      // Show UI only after session check completes
      setSessionChecked(true);
    });

    // STEP 2 — Listen for auth changes (magic link redirect, sign in, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySession(session.access_token, session.user.id);
        onSessionReadyRef.current?.();
      } else {
        clearSession();
      }
      setSessionChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_access_token");
    localStorage.removeItem("supabase_user_id");
    setAccessToken(null);
    setUserId(null);
    setCurrentPlan(null);
  };

  const isAuthenticated = !!(accessToken && userId);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        accessToken,
        currentPlan,
        sessionChecked,
        setCurrentPlan,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
