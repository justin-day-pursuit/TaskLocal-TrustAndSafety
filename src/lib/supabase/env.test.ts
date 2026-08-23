import { afterEach, describe, expect, it } from "vitest";

import {
  assertServiceRoleNotPublic,
  getServiceRoleEnv,
  getSupabaseEnv,
} from "@/lib/supabase/env";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
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

describe("supabase env", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("reads the publishable client env without requiring the service role key", () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });

    expect(getSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "anon-key",
    });
  });

  it("reads SUPABASE_SERVICE_ROLE_KEY from a non-public env var", () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: undefined,
      VITE_SUPABASE_SERVICE_ROLE_KEY: undefined,
    });

    expect(getServiceRoleEnv()).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key",
    });
  });

  it("throws when the service role key is missing", () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });

    expect(() => getServiceRoleEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => getServiceRoleEnv()).toThrow(/NEXT_PUBLIC_|VITE_/);
  });

  it("throws if the service role key is exposed as NEXT_PUBLIC_ or VITE_", () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "leaked-key",
    });

    expect(() => assertServiceRoleNotPublic()).toThrow(/must not be exposed/);
    expect(() => getServiceRoleEnv()).toThrow(/must not be exposed/);
  });
});
