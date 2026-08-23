import { beforeEach, describe, expect, it, vi } from "vitest";

const { listFlaggedReviewsWithBookings } = vi.hoisted(() => ({
  listFlaggedReviewsWithBookings: vi.fn(),
}));

vi.mock("@/lib/queries/reviews", () => ({ listFlaggedReviewsWithBookings }));

import { GET } from "@/app/api/flagged-reviews/route";

describe("GET /api/flagged-reviews", () => {
  beforeEach(() => {
    listFlaggedReviewsWithBookings.mockReset();
  });

  it("returns flagged reviews with booking context", async () => {
    const rows = [
      {
        id: "rev_1",
        bookingId: "bkg_1",
        flag: true,
        customerId: "cus_1",
        providerId: "prv_1",
        listingId: "lst_1",
        bookingStatus: "completed",
      },
    ];
    listFlaggedReviewsWithBookings.mockResolvedValue({
      data: rows,
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: rows, error: null });
  });

  it("returns 500 when the privileged query fails", async () => {
    listFlaggedReviewsWithBookings.mockResolvedValue({
      data: null,
      error: "permission denied",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ data: null, error: "permission denied" });
  });
});
