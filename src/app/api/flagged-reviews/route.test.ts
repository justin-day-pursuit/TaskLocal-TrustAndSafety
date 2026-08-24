import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listFlaggedReviewsWithBookings } = vi.hoisted(() => ({
  listFlaggedReviewsWithBookings: vi.fn(),
}));

vi.mock("@/lib/queries/reviews", () => ({ listFlaggedReviewsWithBookings }));

import { GET } from "@/app/api/flagged-reviews/route";

const SECRET = "test-dashboard-api-secret";
const originalSecret = process.env.DASHBOARD_API_SECRET;

function authorizedRequest(): Request {
  return new Request("http://localhost/api/flagged-reviews", {
    headers: { authorization: `Bearer ${SECRET}` },
  });
}

describe("GET /api/flagged-reviews", () => {
  beforeEach(() => {
    process.env.DASHBOARD_API_SECRET = SECRET;
    listFlaggedReviewsWithBookings.mockReset();
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.DASHBOARD_API_SECRET;
    } else {
      process.env.DASHBOARD_API_SECRET = originalSecret;
    }
  });

  it("rejects callers without a valid bearer token before querying", async () => {
    const response = await GET(new Request("http://localhost/api/flagged-reviews"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ data: null, error: "Unauthorized" });
    expect(listFlaggedReviewsWithBookings).not.toHaveBeenCalled();
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
      failureKind: null,
    });

    const response = await GET(authorizedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: rows, error: null });
  });

  it("returns 500 when the privileged query fails", async () => {
    listFlaggedReviewsWithBookings.mockResolvedValue({
      data: null,
      error: "permission denied",
      failureKind: "error",
    });

    const response = await GET(authorizedRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ data: null, error: "permission denied" });
  });

  it("returns 504 when the privileged query times out", async () => {
    listFlaggedReviewsWithBookings.mockResolvedValue({
      data: null,
      error: "The operation timed out.",
      failureKind: "timeout",
    });

    const response = await GET(authorizedRequest());
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toEqual({ data: null, error: "The operation timed out." });
  });
});
