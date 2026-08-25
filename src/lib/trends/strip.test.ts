import { describe, expect, it } from "vitest";

import { stripReviewForAnalysis, strippedReviewKeys } from "@/lib/trends/strip";
import type { Review } from "@/lib/types/database";

const review: Review = {
  id: "rev_secret",
  bookingId: "bkg_secret",
  reviewerRole: "customer",
  rating: 2,
  comment: "late and rude",
  flag: true,
  reason: "safety",
  handled: true,
  createdAt: "2026-04-01T12:00:00.000Z",
};

describe("stripReviewForAnalysis", () => {
  it("keeps only the allowed analysis columns", () => {
    const stripped = stripReviewForAnalysis(review, "2026-03-30T00:00:00.000Z");

    expect(stripped).toEqual({
      reviewer: "customer",
      rating: 2,
      comment: "late and rude",
      flag: true,
      reason: "safety",
      created: "2026-04-01T12:00:00.000Z",
      serviceDate: "2026-03-30T00:00:00.000Z",
    });
    expect(strippedReviewKeys(stripped)).toEqual([
      "comment",
      "created",
      "flag",
      "rating",
      "reason",
      "reviewer",
      "serviceDate",
    ]);
    expect(JSON.stringify(stripped)).not.toContain("rev_secret");
    expect(JSON.stringify(stripped)).not.toContain("bkg_secret");
    expect(JSON.stringify(stripped)).not.toContain("handled");
  });

  it("redacts emails and phones from comment and reason", () => {
    const stripped = stripReviewForAnalysis(
      {
        ...review,
        comment: "Call me at 415-555-0199 or jane@example.com — late",
        reason: "Threats; contact @bad_actor or https://evil.example/x",
      },
      null
    );

    expect(stripped.comment).toBe("Call me at [redacted] or [redacted] — late");
    expect(stripped.comment).not.toContain("415-555-0199");
    expect(stripped.comment).not.toContain("jane@example.com");
    expect(stripped.reason).toContain("[redacted]");
    expect(stripped.reason).not.toContain("@bad_actor");
    expect(stripped.reason).not.toContain("https://evil.example/x");
    expect(stripped.reason).toContain("Threats");
  });
});
