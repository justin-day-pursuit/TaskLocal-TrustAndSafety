import { afterEach, describe, expect, it } from "vitest";

import { getAppTimeZone, resolveAppTimeZone } from "@/lib/config/app-timezone";

const ENV_KEY = "APP_TIME_ZONE";
const originalValue = process.env[ENV_KEY];

function restoreEnv() {
  if (originalValue === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalValue;
  }
}

describe("resolveAppTimeZone", () => {
  it("defaults unset, empty, and invalid zones to UTC", () => {
    expect(resolveAppTimeZone(undefined)).toBe("UTC");
    expect(resolveAppTimeZone("")).toBe("UTC");
    expect(resolveAppTimeZone("   ")).toBe("UTC");
    expect(resolveAppTimeZone("Not/AZone")).toBe("UTC");
  });

  it("returns valid IANA zones unchanged", () => {
    expect(resolveAppTimeZone("America/New_York")).toBe("America/New_York");
    expect(resolveAppTimeZone("UTC")).toBe("UTC");
  });

  it("never throws on garbage input", () => {
    expect(() => resolveAppTimeZone("Not/AZone")).not.toThrow();
    expect(() => resolveAppTimeZone("")).not.toThrow();
  });
});

describe("getAppTimeZone", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("reads APP_TIME_ZONE from the environment", () => {
    process.env[ENV_KEY] = "America/New_York";
    expect(getAppTimeZone()).toBe("America/New_York");

    delete process.env[ENV_KEY];
    expect(getAppTimeZone()).toBe("UTC");

    process.env[ENV_KEY] = "Not/AZone";
    expect(getAppTimeZone()).toBe("UTC");
  });
});
