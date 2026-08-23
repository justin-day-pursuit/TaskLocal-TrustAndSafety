const MISSING_PUBLISHABLE =
  "Missing Supabase env vars. Copy .env.local.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

const MISSING_SERVICE_ROLE =
  "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local (local) or as a Vercel environment variable (production). Never prefix it with NEXT_PUBLIC_ or VITE_ — that would ship admin database access to the browser.";

const PUBLIC_SERVICE_ROLE_LEAK =
  "SUPABASE_SERVICE_ROLE_KEY must not be exposed as a public env var. Remove NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_SERVICE_ROLE_KEY.";

export function assertServiceRoleNotPublic(): void {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(PUBLIC_SERVICE_ROLE_LEAK);
  }
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(MISSING_PUBLISHABLE);
  }

  return { url, publishableKey };
}

export function getServiceRoleEnv() {
  assertServiceRoleNotPublic();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(MISSING_SERVICE_ROLE);
  }

  return { url, serviceRoleKey };
}
