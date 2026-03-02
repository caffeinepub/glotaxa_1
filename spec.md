# Specification

## Summary
**Goal:** Integrate Supabase OTP-based authentication, plan fetching, invoice edge function, and plan upgrade into the Glotaxa frontend.

**Planned changes:**
- Add a Login screen with an email input and "Send OTP" button that POSTs to the Supabase OTP endpoint; on success, navigate to the OTP Verification screen
- Add an OTP Verification screen showing the email (read-only), a 6-digit OTP input, and a "Verify OTP" button that POSTs to the Supabase token endpoint; on success, save `supabase_access_token` and `supabase_user_id` to localStorage and navigate to the Dashboard
- On Dashboard load, fetch the authenticated user's plan from Supabase REST API and display it in the UI as `currentPlan` state (badge or label)
- Wire the "Generate Invoice" button to POST to the Supabase Edge Function `create-invoice`; on HTTP 200 show success and navigate to Invoice Preview; on HTTP 403 show the limit message and navigate to the Pricing page
- Wire each plan upgrade button on the Pricing page to PATCH the user's plan in Supabase REST; on success update `currentPlan` state and show a confirmation message
- Add a session guard that redirects unauthenticated users to Login when accessing Dashboard, Invoice, or Pricing pages
- Add a logout function that clears `supabase_access_token` and `supabase_user_id` from localStorage and redirects to Login

**User-visible outcome:** Users can log in via email OTP, view their current plan on the Dashboard, generate invoices (with plan-limit enforcement), upgrade their plan from the Pricing page, and log out securely.
