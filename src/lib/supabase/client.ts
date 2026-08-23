import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

/** Browser client with the publishable/anon key. Public Provider / active Listing only. */
export function createBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey);
}
