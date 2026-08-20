import { describe, expect, it } from "vitest";

import {
  buildCreatedAtDateFilters,
  getCreatedWithinWindow,
  reviewMatchesCreatedAtFilters,
} from "@/lib/reviews/date-filters";

const NOW = new Date("2026-08-20T15:30:00.000Z");

describe("getCreatedWithinWindow", () => {
  it("returns null for all", () => {
    expect(getCreatedWithinWindow("all", NOW)).toBeNull();
  });

  it("starts today at the UTC day boundary", () => {
    expect(getCreatedWithinWindow("today", NOW)).toEqual({
      gte: "2026-08-20T00:00:00.000Z",
    });
  });

  it("uses rolling 7/30/365 day windows", () => {
    expect(getCreatedWithinWindow("week", NOW)?.gte).toBe(
      "2026-08-13T15:30:00.000Z"
    );
    expect(getCreatedWithinWindow("month", NOW)?.gte).toBe(
      "2026-07-21T15:30:00.000Z"
    );
    expect(getCreatedWithinWindow("year", NOW)?.gte).toBe(
      "2025-08-20T15:30:00.000Z"
    );
  });
});

describe("createdWithin AND createdMonth", () => {
  it("requires both filters when both are set", () => {
    const filters = buildCreatedAtDateFilters("week", 8, NOW);

    expect(
      reviewMatchesCreatedAtFilters("2026-08-19T12:00:00.000Z", filters)
    ).toBe(true);
    expect(
      reviewMatchesCreatedAtFilters("2026-08-10T12:00:00.000Z", filters)
    ).toBe(false);
    expect(
      reviewMatchesCreatedAtFilters("2026-07-25T12:00:00.000Z", filters)
    ).toBe(false);
    expect(
      reviewMatchesCreatedAtFilters("2025-08-19T12:00:00.000Z", filters)
    ).toBe(false);
  });

  it("matches month-of-year across years when recency is all", () => {
    const filters = buildCreatedAtDateFilters("all", 3, NOW);

    expect(
      reviewMatchesCreatedAtFilters("2024-03-15T00:00:00.000Z", filters)
    ).toBe(true);
    expect(
      reviewMatchesCreatedAtFilters("2024-04-15T00:00:00.000Z", filters)
    ).toBe(false);
  });
});
