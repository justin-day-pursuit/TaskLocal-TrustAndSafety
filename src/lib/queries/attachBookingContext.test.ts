import { describe, expect, it } from "vitest";

import { attachBookingContext } from "@/lib/queries/reviews";
import type { Booking, Review } from "@/lib/types/database";

function makeReview(overrides: Partial<Review> & Pick<Review, "id" | "bookingId">): Review {
  return {
    reviewerRole: "customer",
    rating: 1,
    comment: "late and rude",
    flag: true,
    reason: "conduct",
    handled: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> & Pick<Booking, "id">): Booking {
  return {
    listingId: "lst_1",
    customerId: "cus_1",
    providerId: "prv_1",
    status: "completed",
    priceAtBooking: 80,
    requestedAt: "2026-08-01T00:00:00.000Z",
    serviceDate: null,
    ...overrides,
  };
}

describe("attachBookingContext", () => {
  it("joins booking party ids and status onto each flagged review", () => {
    const reviews = [
      makeReview({ id: "rev_1", bookingId: "bkg_1" }),
      makeReview({ id: "rev_2", bookingId: "bkg_2" }),
    ];
    const bookings = [
      makeBooking({
        id: "bkg_1",
        customerId: "cus_a",
        providerId: "prv_a",
        listingId: "lst_a",
        status: "completed",
      }),
      makeBooking({
        id: "bkg_2",
        customerId: "cus_b",
        providerId: "prv_b",
        listingId: "lst_b",
        status: "cancelled",
      }),
    ];

    expect(attachBookingContext(reviews, bookings)).toEqual([
      {
        ...reviews[0],
        customerId: "cus_a",
        providerId: "prv_a",
        listingId: "lst_a",
        bookingStatus: "completed",
      },
      {
        ...reviews[1],
        customerId: "cus_b",
        providerId: "prv_b",
        listingId: "lst_b",
        bookingStatus: "cancelled",
      },
    ]);
  });

  it("leaves booking fields null when the booking is missing", () => {
    const reviews = [makeReview({ id: "rev_orphan", bookingId: "bkg_missing" })];

    expect(attachBookingContext(reviews, [])).toEqual([
      {
        ...reviews[0],
        customerId: null,
        providerId: null,
        listingId: null,
        bookingStatus: null,
      },
    ]);
  });
});
