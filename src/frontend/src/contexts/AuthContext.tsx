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
// Lightweight Supabase auth helpers (no SDK dependency — direct REST/hash)
// ---------------------------------------------------------------------------

/**
 * Parse an access_token + user.id from the URL hash that Supabase appends
 * after a magic-link or OTP email confirmation redirect.
 */
function parseSessionFromHash(): {
  accessToken: string;
  userId: string;
} | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1); // strip leading '#'
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const userId = params.get("user_id");

  if (accessToken) {
    return { accessToken, userId: userId ?? "" };
  }
  return null;
}

/**
 * Sign out by calling the Supabase REST endpoint with the current access token.
 */
async function supabaseSignOut(accessToken: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }).catch(() => {
    // Best-effort; we clear local state regardless
  });
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

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

  // Keep onSessionReady in a ref so the effect doesn't need it as a dependency
  const onSessionReadyRef = useRef(onSessionReady);
  onSessionReadyRef.current = onSessionReady;

  useEffect(() => {
    const applySession = (token: string, uid: string) => {
      localStorage.setItem("supabase_access_token", token);
      localStorage.setItem("supabase_user_id", uid);
      setAccessToken(token);
      setUserId(uid);
    };

    // 1. Restore any previously stored session (silent restore, no redirect)
    const storedToken = localStorage.getItem("supabase_access_token");
    const storedUid = localStorage.getItem("supabase_user_id");
    if (storedToken && storedUid) {
      setAccessToken(storedToken);
      setUserId(storedUid);
    }

    // 2. Detect session from URL hash (magic-link / OTP email-link redirect)
    //    Supabase appends #access_token=...&type=magiclink (or type=email) to the
    //    redirect URL when the user clicks the magic link or the email OTP link.
    const hashSession = parseSessionFromHash();
    if (hashSession) {
      applySession(hashSession.accessToken, hashSession.userId);
      // Clean the hash so it doesn't re-trigger on refresh
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      onSessionReadyRef.current?.();
      return;
    }

    // 3. If there was a stored session but no hash redirect, still signal ready
    //    so the app can navigate to the dashboard on fresh page loads.
    if (storedToken && storedUid && !hashSession) {
      // Already applied above; just fire the signal if this is a fresh load
      // without a hash but with a stored session.
      onSessionReadyRef.current?.();
    }
  }, []);

  const logout = () => {
    const token = accessToken;
    localStorage.removeItem("supabase_access_token");
    localStorage.removeItem("supabase_user_id");
    setAccessToken(null);
    setUserId(null);
    setCurrentPlan(null);
    if (token) {
      supabaseSignOut(token);
    }
  };

  const isAuthenticated = !!(accessToken && userId);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        accessToken,
        currentPlan,
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
