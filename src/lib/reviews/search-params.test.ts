import { describe, expect, it } from "vitest";

import { buildIlikeOrFilter } from "@/lib/postgrest/ilike-or-filter";
import {
  buildActionNeededDetailHref,
  buildActionNeededHref,
  mergeReviewsCatalogParams,
  parseActionNeededListParams,
  parseReviewsCatalogParams,
  requiresBookingFirstQuery,
  serializeActionNeededListParams,
  serializeReviewsCatalogParams,
} from "@/lib/reviews/search-params";

describe("parseReviewsCatalogParams", () => {
  it("applies documented defaults for an empty query", () => {
    expect(parseReviewsCatalogParams({})).toEqual({
      reviewerRole: "all",
      report: "all",
      handled: "all",
      sort: "createdAt",
      dir: "desc",
      createdWithin: "all",
      createdMonth: undefined,
      page: 1,
      pageSize: 25,
      qText: undefined,
      qReview: undefined,
      qBooking: undefined,
      expanded: undefined,
    });
  });

  it("parses every PRD §7 param", () => {
    expect(
      parseReviewsCatalogParams({
        qText: " rude ",
        qReview: " rev_abc ",
        qBooking: " bkg_1 ",
        reviewerRole: "customer",
        report: "true",
        handled: "false",
        sort: "priceAtBooking",
        dir: "asc",
        createdWithin: "week",
        createdMonth: "3",
        page: "2",
        pageSize: "50",
        expanded: "rev_open",
      })
    ).toEqual({
      qText: "rude",
      qReview: "rev_abc",
      qBooking: "bkg_1",
      reviewerRole: "customer",
      report: "true",
      handled: "false",
      sort: "priceAtBooking",
      dir: "asc",
      createdWithin: "week",
      createdMonth: 3,
      page: 2,
      pageSize: 50,
      expanded: "rev_open",
    });
  });

  it("canonicalizes legacy flag to report", () => {
    expect(parseReviewsCatalogParams({ flag: "true" })).toMatchObject({
      report: "true",
    });
    expect(serializeReviewsCatalogParams(parseReviewsCatalogParams({ flag: "true" }))).toBe(
      "report=true"
    );
  });

  it("prefers report over legacy flag when both are present", () => {
    expect(
      parseReviewsCatalogParams({ flag: "true", report: "false" })
    ).toMatchObject({
      report: "false",
    });
  });

  it("ignores removed bookingStatus param", () => {
    const parsed = parseReviewsCatalogParams({ bookingStatus: "completed" });
    expect(parsed).not.toHaveProperty("bookingStatus");
    expect(serializeReviewsCatalogParams(parsed)).not.toContain("bookingStatus");
  });

  it("ignores unknown params", () => {
    expect(
      parseReviewsCatalogParams({ unknownParam: "x", report: "true" })
    ).toMatchObject({
      report: "true",
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      parseReviewsCatalogParams({
        reviewerRole: "admin",
        report: "maybe",
        handled: "nope",
        sort: "comment",
        dir: "sideways",
        createdWithin: "decade",
        createdMonth: "13",
        page: "0",
        pageSize: "99",
      })
    ).toMatchObject({
      reviewerRole: "all",
      report: "all",
      handled: "all",
      sort: "createdAt",
      dir: "desc",
      createdWithin: "all",
      createdMonth: undefined,
      page: 1,
      pageSize: 25,
    });
  });

  it("strips handled when report is not reported", () => {
    expect(
      parseReviewsCatalogParams({ report: "false", handled: "true" })
    ).toMatchObject({
      report: "false",
      handled: "all",
    });
  });
});

describe("serializeReviewsCatalogParams", () => {
  it("omits default values from the query string", () => {
    expect(serializeReviewsCatalogParams(parseReviewsCatalogParams({}))).toBe("");
  });

  it("round-trips qText", () => {
    const parsed = parseReviewsCatalogParams({ qText: "unsafe language" });
    const roundTrip = parseReviewsCatalogParams(
      Object.fromEntries(new URLSearchParams(serializeReviewsCatalogParams(parsed)))
    );
    expect(roundTrip.qText).toBe("unsafe language");
  });

  it("round-trips stable for non-default params", () => {
    const parsed = parseReviewsCatalogParams({
      qReview: "rev",
      report: "true",
      sort: "rating",
      dir: "asc",
      createdWithin: "month",
      createdMonth: "12",
      page: "3",
      pageSize: "10",
      expanded: "rev_1",
    });

    const roundTrip = parseReviewsCatalogParams(
      Object.fromEntries(new URLSearchParams(serializeReviewsCatalogParams(parsed)))
    );

    expect(roundTrip).toEqual(parsed);
  });

  it("round-trips every PRD §7 param including booking-side filters", () => {
    const parsed = parseReviewsCatalogParams({
      qText: "issue",
      qReview: "rev_abc",
      qBooking: "bkg_1",
      reviewerRole: "provider",
      report: "false",
      handled: "true",
      sort: "serviceDate",
      dir: "asc",
      createdWithin: "year",
      createdMonth: "6",
      page: "2",
      pageSize: "50",
      expanded: "rev_open",
    });

    expect(parsed.handled).toBe("all");

    const roundTrip = parseReviewsCatalogParams(
      Object.fromEntries(new URLSearchParams(serializeReviewsCatalogParams(parsed)))
    );

    expect(roundTrip).toEqual(parsed);
  });

  it("omits handled from the query string when report is not reported", () => {
    const parsed = parseReviewsCatalogParams({
      report: "false",
      handled: "true",
    });

    expect(serializeReviewsCatalogParams(parsed)).toBe("report=false");
  });
});

describe("mergeReviewsCatalogParams", () => {
  it("resets page to 1 when a filter changes", () => {
    const current = parseReviewsCatalogParams({ page: "4", report: "true" });
    const next = mergeReviewsCatalogParams(current, { handled: "false" });

    expect(next.page).toBe(1);
    expect(next.report).toBe("true");
    expect(next.handled).toBe("false");
  });

  it("resets page to 1 when qText changes", () => {
    const current = parseReviewsCatalogParams({ page: "4" });
    const next = mergeReviewsCatalogParams(current, { qText: "spam" });

    expect(next.page).toBe(1);
    expect(next.qText).toBe("spam");
  });

  it("keeps page when only pagination fields change", () => {
    const current = parseReviewsCatalogParams({ page: "4" });
    const next = mergeReviewsCatalogParams(current, { page: 5, pageSize: 50 });

    expect(next.page).toBe(5);
    expect(next.pageSize).toBe(50);
  });

  it("does not reset page when only expanded toggles", () => {
    const current = parseReviewsCatalogParams({ page: "4" });
    const next = mergeReviewsCatalogParams(current, { expanded: "rev_1" });

    expect(next.page).toBe(4);
    expect(next.expanded).toBe("rev_1");
  });

  it("resets handled to all when report becomes not reported", () => {
    const current = parseReviewsCatalogParams({
      report: "true",
      handled: "true",
      page: "3",
    });
    const next = mergeReviewsCatalogParams(current, { report: "false" });

    expect(next.report).toBe("false");
    expect(next.handled).toBe("all");
    expect(next.page).toBe(1);
  });
});

describe("requiresBookingFirstQuery", () => {
  it("is true when booking-side controls are active", () => {
    expect(requiresBookingFirstQuery(parseReviewsCatalogParams({ qBooking: "bkg" }))).toBe(
      true
    );
    expect(
      requiresBookingFirstQuery(parseReviewsCatalogParams({ sort: "serviceDate" }))
    ).toBe(true);
  });

  it("is false for removed bookingStatus and review-only controls", () => {
    expect(
      requiresBookingFirstQuery(parseReviewsCatalogParams({ bookingStatus: "requested" }))
    ).toBe(false);
    expect(
      requiresBookingFirstQuery(
        parseReviewsCatalogParams({ qText: "issue", qReview: "rev", report: "true", sort: "rating" })
      )
    ).toBe(false);
  });
});

describe("review catalog qText filter", () => {
  it("builds escaped .or() on comment/reason", () => {
    const filter = buildIlikeOrFilter(["comment", "reason"], "foo%bar");
    expect(filter).toBe(
      'comment.ilike."%foo\\%bar%",reason.ilike."%foo\\%bar%"'
    );
  });
});

describe("action-needed list params", () => {
  it("round-trips role/page/pageSize/expanded", () => {
    const parsed = parseActionNeededListParams({
      role: "provider",
      page: "2",
      pageSize: "10",
      expanded: "rev_2",
    });

    const roundTrip = parseActionNeededListParams(
      Object.fromEntries(
        new URLSearchParams(serializeActionNeededListParams(parsed))
      )
    );

    expect(roundTrip).toEqual(parsed);
  });
});

describe("buildActionNeededHref", () => {
  it("returns dashboard unhandled view when params are defaults", () => {
    expect(
      buildActionNeededHref(parseActionNeededListParams({}))
    ).toBe("/?view=unhandled");
  });

  it("preserves role and page on the dashboard unhandled path", () => {
    expect(
      buildActionNeededHref(
        parseActionNeededListParams({ role: "customer", page: "2" })
      )
    ).toBe("/?view=unhandled&role=customer&page=2");
  });
});

describe("buildActionNeededDetailHref", () => {
  it("carries list search params on the dashboard expanded URL", () => {
    expect(
      buildActionNeededDetailHref(
        "rev_abc",
        parseActionNeededListParams({ role: "customer", page: "2" })
      )
    ).toBe("/?view=unhandled&role=customer&page=2&expanded=rev_abc");
  });
});
