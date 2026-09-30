import { describe, expect, it } from "vitest";

import { isNavActive, NAV_ITEM_LABELS } from "@/components/layout/NavLinks";

describe("primary navigation items", () => {
  it("lists Dashboard, Reviews, and Analysis in order with no Action needed", () => {
    expect(NAV_ITEM_LABELS).toEqual(["Dashboard", "Reviews", "Analysis"]);
    expect(NAV_ITEM_LABELS).not.toContain("Action needed");
    expect(NAV_ITEM_LABELS).not.toContain("Trends");
  });
});

describe("isNavActive", () => {
  it("highlights dashboard only on the root path", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/reviews", "/")).toBe(false);
    expect(isNavActive("/analysis", "/")).toBe(false);
  });

  it("highlights reviews and analysis for list and nested routes", () => {
    expect(isNavActive("/reviews", "/reviews")).toBe(true);
    expect(isNavActive("/reviews/foo", "/reviews")).toBe(true);
    expect(isNavActive("/analysis", "/analysis")).toBe(true);
    expect(isNavActive("/analysis/generate", "/analysis")).toBe(true);
  });

  it("does not cross-match other nav items", () => {
    expect(isNavActive("/reviews", "/analysis")).toBe(false);
    expect(isNavActive("/analysis", "/reviews")).toBe(false);
    expect(isNavActive("/", "/reviews")).toBe(false);
  });
});
