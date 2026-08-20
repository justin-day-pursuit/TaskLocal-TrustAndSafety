import { describe, expect, it } from "vitest";

import {
  filterReviewsByBookingIds,
  intersectBookingIds,
  sortReviewsByBookingField,
  sortReviewsByBookingIdOrder,
} from "@/lib/reviews/booking-id-set";
import type { Booking, Review } from "@/lib/types/database";

function review(id: string, bookingId: string): Review {
  return {
    id,
    bookingId,
    reviewerRole: "customer",
    rating: 4,
    comment: "ok",
    flag: false,
    reason: "",
    handled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function booking(
  id: string,
  overrides: Partial<Booking> = {}
): Booking {
  return {
    id,
    listingId: "lst_1",
    customerId: "cus_1",
    providerId: "prv_1",
    status: "completed",
    priceAtBooking: 100,
    requestedAt: "2026-01-01T00:00:00.000Z",
    serviceDate: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("intersectBookingIds", () => {
  it("keeps booking ids present in the allowed set", () => {
    expect(intersectBookingIds(["bkg_1", "bkg_2", "bkg_3"], new Set(["bkg_2"]))).toEqual([
      "bkg_2",
    ]);
  });
});

describe("filterReviewsByBookingIds", () => {
  it("selects reviews whose bookingId is in the id set", () => {
    const reviews = [review("rev_1", "bkg_1"), review("rev_2", "bkg_2")];
    expect(filterReviewsByBookingIds(reviews, new Set(["bkg_2"]))).toEqual([
      review("rev_2", "bkg_2"),
    ]);
  });
});

describe("sortReviewsByBookingIdOrder", () => {
  it("orders reviews by booking query order and puts missing bookings last", () => {
    const reviews = [
      review("rev_c", "bkg_missing"),
      review("rev_b", "bkg_2"),
      review("rev_a", "bkg_1"),
    ];
    const bookingById = new Map([
      ["bkg_1", booking("bkg_1")],
      ["bkg_2", booking("bkg_2")],
    ]);

    expect(
      sortReviewsByBookingIdOrder(reviews, ["bkg_1", "bkg_2"], bookingById).map(
        (item) => item.id
      )
    ).toEqual(["rev_a", "rev_b", "rev_c"]);
  });
});

describe("sortReviewsByBookingField", () => {
  it("sorts by booking price and puts null serviceDate last", () => {
    const reviews = [
      review("rev_high", "bkg_high"),
      review("rev_null", "bkg_null"),
      review("rev_low", "bkg_low"),
    ];
    const bookingById = new Map([
      ["bkg_high", booking("bkg_high", { priceAtBooking: 300, serviceDate: "2026-01-03T00:00:00.000Z" })],
      ["bkg_low", booking("bkg_low", { priceAtBooking: 100, serviceDate: "2026-01-01T00:00:00.000Z" })],
      ["bkg_null", booking("bkg_null", { priceAtBooking: 200, serviceDate: null })],
    ]);

    expect(
      sortReviewsByBookingField(reviews, bookingById, "priceAtBooking", "asc").map(
        (item) => item.id
      )
    ).toEqual(["rev_low", "rev_null", "rev_high"]);

    expect(
      sortReviewsByBookingField(reviews, bookingById, "serviceDate", "asc").map(
        (item) => item.id
      )
    ).toEqual(["rev_low", "rev_high", "rev_null"]);
  });
});
