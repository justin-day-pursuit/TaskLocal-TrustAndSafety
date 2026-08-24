import { describe, expect, it } from "vitest";

import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";
import type { Booking, Review } from "@/lib/types/database";

const sampleReview: Review = {
  id: "rev_1",
  bookingId: "bkg_1",
  reviewerRole: "customer",
  rating: 2,
  comment: "late",
  flag: true,
  reason: "no-show",
  handled: false,
  createdAt: "2026-08-01T00:00:00.000Z",
};

const sampleBooking: Booking = {
  id: "bkg_1",
  listingId: "lst_1",
  customerId: "cus_1",
  providerId: "pro_1",
  status: "completed",
  priceAtBooking: 80,
  requestedAt: "2026-07-01T00:00:00.000Z",
  serviceDate: "2026-08-01T00:00:00.000Z",
};

describe("buildReviewListPresentation", () => {
  describe("/action-needed queue contract", () => {
    it("blocks the list when the primary reviews query fails", () => {
      const presentation = buildReviewListPresentation(
        null,
        "Reviews unavailable",
        null
      );

      expect(presentation.showReviewList).toBe(false);
      expect(presentation.primaryError).toBe("Reviews unavailable");
      expect(presentation.primaryFailureKind).toBe("error");
      expect(presentation.enrichmentError).toBeNull();
      expect(presentation.enrichmentFailureKind).toBeNull();
    });

    it("blocks the list with a timeout kind when the primary query times out", () => {
      const presentation = buildReviewListPresentation(
        null,
        "The operation timed out.",
        null,
        "timeout"
      );

      expect(presentation.showReviewList).toBe(false);
      expect(presentation.primaryFailureKind).toBe("timeout");
      expect(presentation.enrichmentFailureKind).toBeNull();
    });

    it("still renders the list when bookings enrichment fails", () => {
      const presentation = buildReviewListPresentation(
        [sampleReview],
        null,
        { data: null, error: "Bookings fetch failed" }
      );

      expect(presentation.showReviewList).toBe(true);
      expect(presentation.primaryError).toBeNull();
      expect(presentation.primaryFailureKind).toBeNull();
      expect(presentation.enrichmentError).toBe("Bookings fetch failed");
      expect(presentation.enrichmentFailureKind).toBe("error");
      expect(presentation.repeatFlagCounts).toEqual({});
    });
  });

  describe("/reviews catalog contract", () => {
    it("uses the same helper: list visible with enrichment banner on bookings timeout", () => {
      const presentation = buildReviewListPresentation(
        [sampleReview],
        null,
        {
          data: null,
          error: "The operation timed out.",
          failureKind: "timeout",
        }
      );

      expect(presentation.showReviewList).toBe(true);
      expect(presentation.enrichmentError).toBe("The operation timed out.");
      expect(presentation.enrichmentFailureKind).toBe("timeout");
      expect(presentation.repeatFlagCounts).toEqual({});
    });

    it("computes repeat-flag counts when enrichment succeeds", () => {
      const secondReview: Review = {
        ...sampleReview,
        id: "rev_2",
        bookingId: "bkg_2",
      };
      const secondBooking: Booking = {
        ...sampleBooking,
        id: "bkg_2",
      };

      const presentation = buildReviewListPresentation(
        [sampleReview, secondReview],
        null,
        { data: [sampleBooking, secondBooking], error: null }
      );

      expect(presentation.showReviewList).toBe(true);
      expect(presentation.enrichmentError).toBeNull();
      expect(presentation.repeatFlagCounts).toEqual({ rev_1: 1, rev_2: 1 });
    });
  });
});
