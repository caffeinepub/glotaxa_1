/**
 * Lightweight Supabase client shim.
 * Implements the subset of @supabase/supabase-js API used by this app
 * using plain fetch calls — no external package required.
 */

export const SUPABASE_URL = "https://cvelhiuefcykduwgnjjs.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZWxoaXVlZmN5a2R1d2duampzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUzNjcsImV4cCI6MjA4NzgzMTM2N30.dNtP6PMMTt8RMZhw-ANvATGgLL6FlsuffVcR9jES-rM";

export interface Session {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
}

export interface AuthError {
  message: string;
  status?: number;
}

type AuthChangeEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "INITIAL_SESSION";

type AuthStateCallback = (
  event: AuthChangeEvent,
  session: Session | null,
) => void;

// ─── Session Storage ────────────────────────────────────────────────────────

const SESSION_KEY = "_supa_session";

function storeSession(s: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {}
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ─── Auth State Listeners ───────────────────────────────────────────────────

const authListeners: Set<AuthStateCallback> = new Set();
let currentSession: Session | null = null;

function notifyListeners(event: AuthChangeEvent, session: Session | null) {
  currentSession = session;
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch {}
  }
}

// ─── Magic-link hash fragment handling ─────────────────────────────────────

function parseHashToken(): { access_token?: string; type?: string } {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get("access_token") ?? undefined,
    type: params.get("type") ?? undefined,
  };
}

async function exchangeAccessToken(
  accessToken: string,
): Promise<Session | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id: string; email?: string };
    return { access_token: accessToken, user };
  } catch {
    return null;
  }
}

// ─── Auth client ────────────────────────────────────────────────────────────

const auth = {
  async signInWithOtp(params: {
    email: string;
    options?: { emailRedirectTo?: string };
  }) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: params.email,
        create_user: true,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error_description?: string;
        msg?: string;
      };
      return {
        data: {},
        error: {
          message: body.error_description ?? body.msg ?? "Failed to send link",
        },
      };
    }
    return { data: {}, error: null };
  },

  async getSession(): Promise<{
    data: { session: Session | null };
    error: AuthError | null;
  }> {
    // Check for magic-link hash fragment first
    const { access_token, type } = parseHashToken();
    if (
      access_token &&
      (type === "magiclink" || type === "recovery" || type === "email")
    ) {
      const session = await exchangeAccessToken(access_token);
      if (session) {
        storeSession(session);
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        notifyListeners("SIGNED_IN", session);
        return { data: { session }, error: null };
      }
    }

    // Fall back to stored session
    const stored = loadSession();
    if (stored) {
      currentSession = stored;
      return { data: { session: stored }, error: null };
    }
    return { data: { session: null }, error: null };
  },

  async getUser(): Promise<{
    data: { user: Session["user"] | null };
    error: AuthError | null;
  }> {
    const session = currentSession ?? loadSession();
    if (!session) return { data: { user: null }, error: null };
    return { data: { user: session.user }, error: null };
  },

  onAuthStateChange(callback: AuthStateCallback) {
    authListeners.add(callback);
    // Immediately fire with current session if available
    const stored = currentSession ?? loadSession();
    if (stored) {
      setTimeout(() => callback("INITIAL_SESSION", stored), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },

  async signOut() {
    clearSession();
    notifyListeners("SIGNED_OUT", null);
    return { error: null };
  },
};

// ─── REST query builder ──────────────────────────────────────────────────────

interface QueryState {
  table: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  select?: string;
  filters: { col: string; val: unknown }[];
  body?: Record<string, unknown>;
  returnSingle?: boolean;
}

type DBResult = {
  data: Record<string, unknown> | null;
  error: AuthError | null;
};

async function makeRequest(state: QueryState): Promise<DBResult> {
  const session = currentSession ?? loadSession();
  const token = session?.access_token ?? null;

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let url = `${SUPABASE_URL}/rest/v1/${state.table}`;
  const params: string[] = [];
  if (state.select) params.push(`select=${encodeURIComponent(state.select)}`);
  for (const { col, val } of state.filters) {
    params.push(`${col}=eq.${encodeURIComponent(String(val))}`);
  }
  if (params.length) url += `?${params.join("&")}`;

  try {
    const res = await fetch(url, {
      method: state.method,
      headers,
      body: state.body ? JSON.stringify(state.body) : undefined,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      return { data: null, error: { message: err.message ?? res.statusText } };
    }
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    const data = state.returnSingle
      ? Array.isArray(parsed)
        ? (parsed[0] ?? null)
        : parsed
      : Array.isArray(parsed)
        ? (parsed[0] ?? null)
        : parsed;
    return { data: data as Record<string, unknown> | null, error: null };
  } catch (err) {
    return { data: null, error: { message: String(err) } };
  }
}

// QueryBuilder extends Promise<DBResult> so it can be awaited directly
class QueryBuilder extends Promise<DBResult> {
  private _state: QueryState;

  constructor(
    state: QueryState,
    executor?: (
      resolve: (value: DBResult | PromiseLike<DBResult>) => void,
      reject: (reason?: unknown) => void,
    ) => void,
  ) {
    super(
      executor ??
        ((resolve) => {
          makeRequest(state)
            .then(resolve)
            .catch(() => {
              resolve({ data: null, error: { message: "Query failed" } });
            });
        }),
    );
    this._state = state;
  }

  private clone(patch: Partial<QueryState>): QueryBuilder {
    return new QueryBuilder({ ...this._state, ...patch });
  }

  select(columns?: string): QueryBuilder {
    return this.clone({ select: columns ?? "*", method: "GET" });
  }

  eq(col: string, val: unknown): QueryBuilder {
    return this.clone({
      filters: [...this._state.filters, { col, val }],
    });
  }

  limit(_n: number): QueryBuilder {
    return this.clone({});
  }

  update(data: Record<string, unknown>): QueryBuilder {
    return this.clone({ method: "PATCH", body: data });
  }

  single(): Promise<DBResult> {
    return makeRequest({ ...this._state, returnSingle: true });
  }

  insert(data: Record<string, unknown>): Promise<DBResult> {
    return makeRequest({ ...this._state, method: "POST", body: data });
  }

  upsert(data: Record<string, unknown>): Promise<DBResult> {
    return makeRequest({ ...this._state, method: "POST", body: data });
  }
}

// ─── RPC helper ─────────────────────────────────────────────────────────────

async function rpc(
  fn: string,
  params?: Record<string, unknown>,
): Promise<{ data: unknown; error: AuthError | null }> {
  const session = currentSession ?? loadSession();
  const token = session?.access_token ?? null;

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(params ?? {}),
    });

    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message =
        (parsed as { message?: string; error?: string } | null)?.message ??
        (parsed as { message?: string; error?: string } | null)?.error ??
        res.statusText;
      return { data: null, error: { message, status: res.status } };
    }

    return { data: parsed, error: null };
  } catch (err) {
    return { data: null, error: { message: String(err) } };
  }
}

// ─── Main client ────────────────────────────────────────────────────────────

export function createClient(_url: string, _key: string) {
  return {
    auth,
    from(table: string): QueryBuilder {
      return new QueryBuilder({ table, method: "GET", filters: [] });
    },
    rpc(fn: string, params?: Record<string, unknown>) {
      return rpc(fn, params);
    },
  };
}
