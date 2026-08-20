import { describe, expect, it } from "vitest";

import { computeRepeatFlagCounts } from "@/lib/queries/reviews";
import type { Booking, Review } from "@/lib/types/database";

function makeReview(
  overrides: Pick<Review, "id" | "bookingId" | "reviewerRole"> &
    Partial<Omit<Review, "id" | "bookingId" | "reviewerRole">>
): Review {
  return {
    rating: 1,
    comment: "",
    flag: true,
    reason: "test",
    handled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBooking(
  overrides: Pick<Booking, "id"> & Partial<Omit<Booking, "id">>
): Booking {
  return {
    listingId: "lst_1",
    customerId: "cus_1",
    providerId: "pro_1",
    status: "completed",
    priceAtBooking: 100,
    requestedAt: "2026-01-01T00:00:00.000Z",
    serviceDate: null,
    ...overrides,
  };
}

describe("computeRepeatFlagCounts", () => {
  it("returns 0 for the only open flag in a same-party same-direction group (exclude self)", () => {
    const reviews = [
      makeReview({
        id: "rev_1",
        bookingId: "bkg_1",
        reviewerRole: "customer",
      }),
    ];
    const bookings = [makeBooking({ id: "bkg_1", providerId: "pro_a" })];

    expect(computeRepeatFlagCounts(reviews, bookings)).toEqual({ rev_1: 0 });
  });

  it("counts other open flags about the same reviewed party in the same direction", () => {
    const reviews = [
      makeReview({
        id: "rev_1",
        bookingId: "bkg_1",
        reviewerRole: "customer",
      }),
      makeReview({
        id: "rev_2",
        bookingId: "bkg_2",
        reviewerRole: "customer",
      }),
    ];
    const bookings = [
      makeBooking({ id: "bkg_1", providerId: "pro_shared" }),
      makeBooking({ id: "bkg_2", providerId: "pro_shared" }),
    ];

    expect(computeRepeatFlagCounts(reviews, bookings)).toEqual({
      rev_1: 1,
      rev_2: 1,
    });
  });

  it("keeps customer and provider directions in separate groups", () => {
    const reviews = [
      makeReview({
        id: "rev_cust",
        bookingId: "bkg_1",
        reviewerRole: "customer",
      }),
      makeReview({
        id: "rev_prov",
        bookingId: "bkg_1",
        reviewerRole: "provider",
      }),
    ];
    const bookings = [
      makeBooking({
        id: "bkg_1",
        customerId: "cus_x",
        providerId: "pro_y",
      }),
    ];

    expect(computeRepeatFlagCounts(reviews, bookings)).toEqual({
      rev_cust: 0,
      rev_prov: 0,
    });
  });

  it("returns 0 when the review booking is missing from the map", () => {
    const reviews = [
      makeReview({
        id: "rev_orphan",
        bookingId: "bkg_missing",
        reviewerRole: "provider",
      }),
    ];

    expect(computeRepeatFlagCounts(reviews, [])).toEqual({ rev_orphan: 0 });
  });
});
