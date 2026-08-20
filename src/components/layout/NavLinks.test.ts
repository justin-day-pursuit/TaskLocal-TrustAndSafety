import { describe, expect, it } from "vitest";

import { isNavActive } from "@/components/layout/NavLinks";

describe("isNavActive", () => {
  it("highlights action-needed for list and detail routes", () => {
    expect(isNavActive("/action-needed", "/action-needed")).toBe(true);
    expect(isNavActive("/action-needed/rev_x", "/action-needed")).toBe(true);
  });

  it("does not over-match other nav items or root", () => {
    expect(isNavActive("/reviews", "/action-needed")).toBe(false);
    expect(isNavActive("/", "/action-needed")).toBe(false);
    expect(isNavActive("/action-needed", "/")).toBe(false);
    expect(isNavActive("/", "/")).toBe(true);
  });
});
