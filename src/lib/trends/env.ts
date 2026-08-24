const MISSING_KEY =
  "Missing GEMINI_API_KEY. Set it in .env.local (Google AI Studio key at https://aistudio.google.com/apikey). Never prefix it with NEXT_PUBLIC_ or VITE_.";

const PUBLIC_LEAK =
  "GEMINI_API_KEY must not be exposed as a public env var. Remove NEXT_PUBLIC_GEMINI_API_KEY, VITE_GEMINI_API_KEY, NEXT_PUBLIC_GOOGLE_API_KEY, and VITE_GOOGLE_API_KEY.";

export const GEMINI_MODEL_CHAIN = [
  "gemini-3.1-pro-preview",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
] as const;

export function assertGeminiKeyNotPublic(): string | null {
  if (
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY
  ) {
    return PUBLIC_LEAK;
  }
  return null;
}

export function getGeminiApiKey(): { key: string | null; error: string | null } {
  const leaked = assertGeminiKeyNotPublic();
  if (leaked) {
    return { key: null, error: leaked };
  }

  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  if (!key || key === "your_gemini_api_key_here") {
    return { key: null, error: MISSING_KEY };
  }

  return { key, error: null };
}

export function getGeminiModelOverride(): string | null {
  const model = process.env.GEMINI_MODEL?.trim();
  return model ? model : null;
}

export function resolveGeminiModels(override: string | null): string[] {
  if (override) {
    return [override];
  }
  return [...GEMINI_MODEL_CHAIN];
}

export function isAuthGeminiError(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : NaN;

  if (status === 401 || status === 403) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /401|403|PERMISSION_DENIED|API_KEY_INVALID|invalid api key|unauthoriz/i.test(
    message
  );
}

export function isRetryableGeminiError(error: unknown): boolean {
  if (isAuthGeminiError(error)) {
    return false;
  }

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: number }).status)
      : NaN;

  if (status === 404 || status === 429) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /404|429|NOT_FOUND|RESOURCE_EXHAUSTED|not found|not available|quota/i.test(
    message
  );
}

export function publicGeminiError(error: unknown): string {
  if (isAuthGeminiError(error)) {
    return "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local (or Vercel env) and try again.";
  }
  return "Gemini analysis failed. Try again in a minute. If it keeps failing, check the server logs.";
}
