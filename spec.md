# Glotaxa

## Current State
AI VAT Assistant usage is tracked primarily in localStorage (`ai_vat_usage`, `ai_vat_history`). The UsageMeter fetches a count from the Supabase Edge Function `get-usage`, but the AI query counter is incremented only on the frontend. A user can clear localStorage to reset their free query count and bypass the 5-query free tier limit.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/aiUsageTracker.ts` — utility that reads and increments AI usage via the `ai_usage` Supabase table (`user_id`, `queries_used` columns) using `supabase.from()`. For unauthenticated users, falls back to localStorage only.
- On page load in `AIVATAssistant.tsx`, fetch the server-side usage count for authenticated users and sync it with the displayed value (taking the max of server vs local to avoid downgrading).
- On each successful AI query, call `incrementServerUsage()` to upsert the counter in Supabase.

### Modify
- `AIVATAssistant.tsx` — load initial usage from server on mount (for authenticated users); increment server-side after each query.
- `UsageMeter.tsx` — no functional change needed; it already reads from the Edge Function. The real fix is upstream in the AIVATAssistant page.

### Remove
- Nothing removed. localStorage is kept as a fallback for unauthenticated/offline users.

## Implementation Plan
1. Create `aiUsageTracker.ts` with two functions:
   - `fetchServerUsage(supabase, userId): Promise<number>` — reads `ai_usage` table for `user_id`
   - `incrementServerUsage(supabase, userId): Promise<void>` — upserts `ai_usage` table incrementing `queries_used` by 1
2. In `AIVATAssistant.tsx`:
   - Import and call `fetchServerUsage` in `useEffect` after `accessToken`/`userId` are available; set usage to `Math.max(serverCount, localCount)`
   - After each successful AI response, call `incrementServerUsage`
3. Keep localStorage as fallback so guests and offline users still see their count
