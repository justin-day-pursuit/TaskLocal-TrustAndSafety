import { createClient } from "@supabase/supabase-js";

import { fetchWithDbTimeout } from "@/lib/queries/query-status";
import { getServiceRoleEnv } from "@/lib/supabase/env";

/**
 * Server-only Supabase client. Bypasses Row Level Security.
 * Never import this from a Client Component or any file that ships to the browser.
 */
export function createServiceRoleClient() {
  const { url, serviceRoleKey } = getServiceRoleEnv();
  return createClient(url, serviceRoleKey, {
    global: {
      fetch: fetchWithDbTimeout,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
