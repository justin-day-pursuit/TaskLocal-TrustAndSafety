import { describe, expect, it } from "vitest";

import { resolveExpandedReviewId } from "@/lib/reviews/expanded-param";
import type { Review } from "@/lib/types/database";

const reviews: Review[] = [
  {
    id: "rev_1",
    bookingId: "bkg_1",
    reviewerRole: "customer",
    rating: 4,
    comment: "Good",
    flag: true,
    reason: "spam",
    handled: false,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

describe("resolveExpandedReviewId", () => {
  it("returns the id when it matches a visible review", () => {
    expect(resolveExpandedReviewId(reviews, "rev_1")).toBe("rev_1");
  });

  it("ignores invalid or missing ids", () => {
    expect(resolveExpandedReviewId(reviews, "rev_missing")).toBeUndefined();
    expect(resolveExpandedReviewId(reviews, undefined)).toBeUndefined();
  });
});
