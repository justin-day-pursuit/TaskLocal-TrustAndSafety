import { afterEach, describe, expect, it } from "vitest";

import {
  assertGeminiKeyNotPublic,
  getGeminiApiKey,
  isAuthGeminiError,
  isRetryableGeminiError,
  resolveGeminiModels,
} from "@/lib/trends/env";

const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_MODEL",
  "NEXT_PUBLIC_GEMINI_API_KEY",
  "VITE_GEMINI_API_KEY",
  "NEXT_PUBLIC_GOOGLE_API_KEY",
  "VITE_GOOGLE_API_KEY",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function setEnv(
  overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>
) {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

describe("gemini env", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("fails closed when the API key is missing", () => {
    setEnv({});

    const result = getGeminiApiKey();

    expect(result.key).toBeNull();
    expect(result.error).toMatch(/GEMINI_API_KEY/);
    expect(result.error).toMatch(/NEXT_PUBLIC_|VITE_/);
  });

  it("fails closed when the placeholder key is still in place", () => {
    setEnv({ GEMINI_API_KEY: "your_gemini_api_key_here" });

    const result = getGeminiApiKey();

    expect(result.key).toBeNull();
    expect(result.error).toMatch(/GEMINI_API_KEY/);
  });

  it("prefers GEMINI_API_KEY over GOOGLE_API_KEY", () => {
    setEnv({
      GEMINI_API_KEY: "gemini-key",
      GOOGLE_API_KEY: "google-key",
    });

    expect(getGeminiApiKey()).toEqual({ key: "gemini-key", error: null });
  });

  it("accepts GOOGLE_API_KEY when GEMINI_API_KEY is unset", () => {
    setEnv({ GOOGLE_API_KEY: "google-key" });

    expect(getGeminiApiKey()).toEqual({ key: "google-key", error: null });
  });

  it("rejects a public leak of the Gemini key", () => {
    setEnv({
      GEMINI_API_KEY: "gemini-key",
      NEXT_PUBLIC_GEMINI_API_KEY: "leaked",
    });

    expect(assertGeminiKeyNotPublic()).toMatch(/must not be exposed/);
    expect(getGeminiApiKey().error).toMatch(/must not be exposed/);
  });

  it("uses the model chain when no override is set", () => {
    expect(resolveGeminiModels(null)).toEqual([
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
    ]);
  });

  it("locks a single model when GEMINI_MODEL is set", () => {
    expect(resolveGeminiModels("gemini-3.1-pro-preview")).toEqual([
      "gemini-3.1-pro-preview",
    ]);
  });

  it("retries on 404, 429, and not-found errors but not auth failures", () => {
    expect(isRetryableGeminiError({ status: 404, message: "nope" })).toBe(true);
    expect(isRetryableGeminiError({ status: 429 })).toBe(true);
    expect(isRetryableGeminiError(new Error("NOT_FOUND"))).toBe(true);
    expect(isRetryableGeminiError(new Error("schema mismatch"))).toBe(false);
    expect(isRetryableGeminiError({ status: 403 })).toBe(false);
    expect(isAuthGeminiError({ status: 403 })).toBe(true);
    expect(isRetryableGeminiError(new Error("PERMISSION_DENIED"))).toBe(false);
  });
});
