// Type stub for @supabase/supabase-js
// The runtime client is loaded via the supabase-js package; this stub keeps TS happy
// when the package types aren't resolved.
declare module "@supabase/supabase-js" {
  export interface Session {
    access_token: string;
    refresh_token: string;
    user: User;
  }

  export interface User {
    id: string;
    email?: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    aud: string;
    created_at: string;
  }

  export interface AuthError {
    message: string;
    status?: number;
  }

  export interface OtpResponse {
    data: Record<string, unknown>;
    error: AuthError | null;
  }

  export type AuthChangeEvent =
    | "SIGNED_IN"
    | "SIGNED_OUT"
    | "TOKEN_REFRESHED"
    | "USER_UPDATED"
    | "PASSWORD_RECOVERY"
    | "INITIAL_SESSION";

  export interface SupabaseAuthClient {
    signInWithOtp(params: {
      email: string;
      options?: {
        emailRedirectTo?: string;
        shouldCreateUser?: boolean;
        data?: Record<string, unknown>;
      };
    }): Promise<OtpResponse>;

    verifyOtp(params: {
      email: string;
      token: string;
      type: string;
    }): Promise<{
      data: { session: Session | null; user: User | null };
      error: AuthError | null;
    }>;

    getSession(): Promise<{
      data: { session: Session | null };
      error: AuthError | null;
    }>;

    getUser(): Promise<{
      data: { user: User | null };
      error: AuthError | null;
    }>;

    onAuthStateChange(
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ): { data: { subscription: { unsubscribe: () => void } } };

    signOut(): Promise<{ error: AuthError | null }>;
  }

  // Chainable query builder — supports arbitrary chaining then resolves
  type QueryResult = Record<string, unknown>;

  interface QueryBuilder
    extends Promise<{ data: QueryResult | null; error: AuthError | null }> {
    select(columns?: string): QueryBuilder;
    eq(column: string, value: unknown): QueryBuilder;
    single(): Promise<{ data: QueryResult | null; error: AuthError | null }>;
    limit(n: number): QueryBuilder;
    update(data: Record<string, unknown>): QueryBuilder;
    insert(
      data: Record<string, unknown>,
    ): Promise<{ data: QueryResult | null; error: AuthError | null }>;
    upsert(
      data: Record<string, unknown>,
    ): Promise<{ data: QueryResult | null; error: AuthError | null }>;
  }

  export interface SupabaseClient {
    auth: SupabaseAuthClient;
    from(table: string): QueryBuilder;
  }

  export function createClient(url: string, key: string): SupabaseClient;
}
