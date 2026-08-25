import { describe, expect, it } from "vitest";

import {
  dashboardHref,
  mergeDashboardParams,
  parseDashboardParams,
  serializeDashboardParams,
} from "@/lib/dashboard/search-params";

describe("parseDashboardParams", () => {
  it("applies documented defaults for an empty query", () => {
    expect(parseDashboardParams({})).toEqual({
      view: undefined,
      q: undefined,
      role: "all",
      page: 1,
      pageSize: 25,
      expanded: undefined,
    });
  });

  it("parses every PRD §9 dashboard param", () => {
    expect(
      parseDashboardParams({
        view: "highRisk",
        q: " threat ",
        role: "provider",
        page: "2",
        pageSize: "50",
        expanded: "rev_open",
      })
    ).toEqual({
      view: "highRisk",
      q: "threat",
      role: "provider",
      page: 2,
      pageSize: 50,
      expanded: "rev_open",
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      parseDashboardParams({
        view: "closed",
        role: "admin",
        page: "0",
        pageSize: "99",
      })
    ).toEqual({
      view: undefined,
      q: undefined,
      role: "all",
      page: 1,
      pageSize: 25,
      expanded: undefined,
    });
  });

  it("accepts each valid view value", () => {
    for (const view of ["today", "unhandled", "highRisk"] as const) {
      expect(parseDashboardParams({ view }).view).toBe(view);
    }
  });

  it("accepts each valid pageSize", () => {
    for (const pageSize of ["10", "25", "50"] as const) {
      expect(parseDashboardParams({ pageSize }).pageSize).toBe(Number(pageSize));
    }
  });
});

describe("serializeDashboardParams", () => {
  it("omits default role, page, and pageSize", () => {
    expect(
      serializeDashboardParams({
        view: "today",
        role: "all",
        page: 1,
        pageSize: 25,
      })
    ).toBe("view=today");
  });

  it("round-trips every param through parse", () => {
    const params = {
      view: "unhandled" as const,
      q: "harassment",
      role: "customer" as const,
      page: 3,
      pageSize: 10 as const,
      expanded: "rev_abc",
    };
    const qs = serializeDashboardParams(params);
    expect(parseDashboardParams(Object.fromEntries(new URLSearchParams(qs)))).toEqual(
      params
    );
  });
});

describe("dashboardHref", () => {
  it("builds the dashboard path with query string", () => {
    expect(
      dashboardHref({
        view: "highRisk",
        role: "all",
        page: 1,
        pageSize: 25,
      })
    ).toBe("/?view=highRisk");
  });

  it("returns root when params are all defaults", () => {
    expect(
      dashboardHref({
        role: "all",
        page: 1,
        pageSize: 25,
      })
    ).toBe("/");
  });
});

describe("mergeDashboardParams", () => {
  const base = parseDashboardParams({
    view: "today",
    q: "threat",
    role: "customer",
    page: "3",
    pageSize: "50",
    expanded: "rev_1",
  });

  it("resets page to 1 when a filter changes", () => {
    expect(mergeDashboardParams(base, { q: "harassment" }).page).toBe(1);
    expect(mergeDashboardParams(base, { view: "unhandled" }).page).toBe(1);
    expect(mergeDashboardParams(base, { role: "provider" }).page).toBe(1);
  });

  it("does not reset page when only expanded changes", () => {
    expect(mergeDashboardParams(base, { expanded: "rev_2" }).page).toBe(3);
    expect(mergeDashboardParams(base, { expanded: undefined }).page).toBe(3);
  });

  it("does not reset page when page or pageSize changes", () => {
    expect(mergeDashboardParams(base, { page: 4 }).page).toBe(4);
    expect(mergeDashboardParams(base, { pageSize: 10 }).page).toBe(3);
  });
});
