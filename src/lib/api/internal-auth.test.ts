import { afterEach, describe, expect, it } from "vitest";

import { authorizeInternalApi, getDashboardApiSecret } from "@/lib/api/internal-auth";

const ENV_KEYS = [
  "DASHBOARD_API_SECRET",
  "NEXT_PUBLIC_DASHBOARD_API_SECRET",
  "VITE_DASHBOARD_API_SECRET",
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

function requestWithAuth(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }
  return new Request("http://localhost/api/flagged-reviews", { headers });
}

describe("internal API auth", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("fails closed when DASHBOARD_API_SECRET is unset", async () => {
    setEnv({ DASHBOARD_API_SECRET: undefined });

    expect(getDashboardApiSecret()).toBeNull();

    const response = authorizeInternalApi(requestWithAuth("Bearer anything"));
    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
    await expect(response!.json()).resolves.toMatchObject({
      data: null,
      error: expect.stringMatching(/locked/i),
    });
  });

  it("fails closed if the secret is exposed as NEXT_PUBLIC_ or VITE_", async () => {
    setEnv({
      DASHBOARD_API_SECRET: "real-secret",
      NEXT_PUBLIC_DASHBOARD_API_SECRET: "leaked-secret",
    });

    expect(getDashboardApiSecret()).toBeNull();

    const response = authorizeInternalApi(requestWithAuth("Bearer real-secret"));
    expect(response?.status).toBe(503);
  });

  it("rejects a missing or wrong bearer token", async () => {
    setEnv({ DASHBOARD_API_SECRET: "correct-secret" });

    const missing = authorizeInternalApi(requestWithAuth());
    expect(missing?.status).toBe(401);

    const wrong = authorizeInternalApi(requestWithAuth("Bearer other-secret"));
    expect(wrong?.status).toBe(401);

    const notBearer = authorizeInternalApi(requestWithAuth("correct-secret"));
    expect(notBearer?.status).toBe(401);
  });

  it("allows a matching Authorization Bearer token", () => {
    setEnv({ DASHBOARD_API_SECRET: "correct-secret" });

    expect(authorizeInternalApi(requestWithAuth("Bearer correct-secret"))).toBeNull();
  });
});
