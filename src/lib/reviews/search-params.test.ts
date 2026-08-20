import { describe, expect, it } from "vitest";

import {
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
      flag: "all",
      handled: "all",
      bookingStatus: "all",
      sort: "createdAt",
      dir: "desc",
      createdWithin: "all",
      createdMonth: undefined,
      page: 1,
      pageSize: 25,
      qReview: undefined,
      qBooking: undefined,
      expanded: undefined,
    });
  });

  it("parses every PRD §7 param", () => {
    expect(
      parseReviewsCatalogParams({
        qReview: " rev_abc ",
        qBooking: " bkg_1 ",
        reviewerRole: "customer",
        flag: "true",
        handled: "false",
        bookingStatus: "completed",
        sort: "priceAtBooking",
        dir: "asc",
        createdWithin: "week",
        createdMonth: "3",
        page: "2",
        pageSize: "50",
        expanded: "rev_open",
      })
    ).toEqual({
      qReview: "rev_abc",
      qBooking: "bkg_1",
      reviewerRole: "customer",
      flag: "true",
      handled: "false",
      bookingStatus: "completed",
      sort: "priceAtBooking",
      dir: "asc",
      createdWithin: "week",
      createdMonth: 3,
      page: 2,
      pageSize: 50,
      expanded: "rev_open",
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      parseReviewsCatalogParams({
        reviewerRole: "admin",
        flag: "maybe",
        handled: "nope",
        bookingStatus: "pending",
        sort: "comment",
        dir: "sideways",
        createdWithin: "decade",
        createdMonth: "13",
        page: "0",
        pageSize: "99",
      })
    ).toMatchObject({
      reviewerRole: "all",
      flag: "all",
      handled: "all",
      bookingStatus: "all",
      sort: "createdAt",
      dir: "desc",
      createdWithin: "all",
      createdMonth: undefined,
      page: 1,
      pageSize: 25,
    });
  });
});

describe("serializeReviewsCatalogParams", () => {
  it("omits default values from the query string", () => {
    expect(serializeReviewsCatalogParams(parseReviewsCatalogParams({}))).toBe("");
  });

  it("round-trips stable for non-default params", () => {
    const parsed = parseReviewsCatalogParams({
      qReview: "rev",
      flag: "true",
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
});

describe("mergeReviewsCatalogParams", () => {
  it("resets page to 1 when a filter changes", () => {
    const current = parseReviewsCatalogParams({ page: "4", flag: "true" });
    const next = mergeReviewsCatalogParams(current, { handled: "false" });

    expect(next.page).toBe(1);
    expect(next.flag).toBe("true");
    expect(next.handled).toBe("false");
  });

  it("keeps page when only pagination fields change", () => {
    const current = parseReviewsCatalogParams({ page: "4" });
    const next = mergeReviewsCatalogParams(current, { page: 5, pageSize: 50 });

    expect(next.page).toBe(5);
    expect(next.pageSize).toBe(50);
  });
});

describe("requiresBookingFirstQuery", () => {
  it("is true when booking-side controls are active", () => {
    expect(requiresBookingFirstQuery(parseReviewsCatalogParams({ qBooking: "bkg" }))).toBe(
      true
    );
    expect(
      requiresBookingFirstQuery(parseReviewsCatalogParams({ bookingStatus: "requested" }))
    ).toBe(true);
    expect(
      requiresBookingFirstQuery(parseReviewsCatalogParams({ sort: "serviceDate" }))
    ).toBe(true);
  });

  it("is false for review-only controls", () => {
    expect(
      requiresBookingFirstQuery(
        parseReviewsCatalogParams({ qReview: "rev", flag: "true", sort: "rating" })
      )
    ).toBe(false);
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
