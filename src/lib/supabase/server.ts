import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Privileged server client for Customer / Booking / Review (and review-context
 * Listing reads). Uses the service role key so the dashboard still works after
 * `005_enable_authenticated_rls.sql`.
 */
export function createServerClient() {
  return createServiceRoleClient();
}

/** Anon/publishable key — public Provider and active Listing reads only. */
export function createPublicServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey);
}
