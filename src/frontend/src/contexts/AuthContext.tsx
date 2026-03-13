import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  createClient,
} from "../lib/supabase-shim";

export { SUPABASE_URL, SUPABASE_ANON_KEY };

// ---------------------------------------------------------------------------
// Supabase client (local shim — no external package needed)
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

    // STEP 1 — Listen for auth state changes FIRST (before getSession).
    // This ensures magic link redirects (which fire SIGNED_IN via onAuthStateChange)
    // are caught even if getSession hasn't resolved yet.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySession(session.access_token, session.user.id);
        onSessionReadyRef.current?.();
      } else {
        clearSession();
      }
      // Mark session checked on any auth event
      setSessionChecked(true);
    });

    // STEP 2 — Check existing session on page load.
    // Covers: returning users with stored sessions, magic link hash fragments.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        applySession(session.access_token, session.user.id);
        onSessionReadyRef.current?.();
      }
      // Always mark session checked after initial lookup
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
