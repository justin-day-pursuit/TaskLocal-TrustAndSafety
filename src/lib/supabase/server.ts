import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

export function createServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey);
}
