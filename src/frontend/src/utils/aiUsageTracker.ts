/**
 * Server-side AI usage tracking via the `ai_usage` Supabase table.
 *
 * Table schema (create this in Supabase if not already present):
 *   CREATE TABLE ai_usage (
 *     user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *     queries_used INTEGER NOT NULL DEFAULT 0
 *   );
 *   ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users can read own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
 *   CREATE POLICY "Users can upsert own usage" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
 *   CREATE POLICY "Users can update own usage" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);
 */

import { supabase } from "../contexts/AuthContext";

/**
 * Reads the server-side AI query count for the authenticated user.
 * Returns 0 if the table row doesn't exist yet or the user is not signed in.
 */
export async function fetchServerUsage(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("queries_used")
      .eq("user_id", userId)
      .single();
    if (error || !data) return 0;
    const row = data as { queries_used?: number };
    return typeof row.queries_used === "number" ? row.queries_used : 0;
  } catch {
    return 0;
  }
}

/**
 * Increments the server-side AI query count by 1 for the authenticated user.
 * Uses upsert so the row is created on the first query automatically.
 * Fails silently — usage enforcement is also done on the frontend so this
 * is a best-effort server-side guard against localStorage clearing.
 */
export async function incrementServerUsage(
  userId: string,
  currentCount: number,
): Promise<void> {
  if (!userId) return;
  try {
    // Upsert: if the row exists, increment; if not, insert with count 1
    await supabase.from("ai_usage").upsert({
      user_id: userId,
      queries_used: currentCount + 1,
    });
  } catch {
    // Silent fail — localStorage count is the fallback enforcement
  }
}
