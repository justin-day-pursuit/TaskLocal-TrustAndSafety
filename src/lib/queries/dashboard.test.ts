import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAppTimeZone } from "@/lib/config/app-timezone";
import { parseDashboardParams } from "@/lib/dashboard/search-params";
import {
  buildDashboardListPresentation,
  getCalendarDayWindow,
  getDashboardReportList,
  getHighRiskCount,
  getNewReportsTodayCount,
  getUnhandledReportsCount,
} from "@/lib/queries/dashboard";
import { matchHighRiskReviews } from "@/lib/queries/high-risk";
import type { Review } from "@/lib/types/database";

const mockOr = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/queries/high-risk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries/high-risk")>();
  return {
    ...actual,
    matchHighRiskReviews: vi.fn(actual.matchHighRiskReviews),
  };
});

vi.mock("@/lib/queries/bookings", () => ({
  getBookingsByIds: vi.fn(async (ids: string[]) => ({
    data: ids.map((id) => ({
      id,
      listingId: "lst_1",
      customerId: "cus_1",
      providerId: "pro_1",
      status: "completed",
      priceAtBooking: 100,
      requestedAt: "2026-04-01T10:00:00.000Z",
      serviceDate: null,
    })),
    error: null,
    failureKind: null,
  })),
}));

const ENV_KEY = "APP_TIME_ZONE";
const originalTimeZone = process.env[ENV_KEY];

function restoreTimeZone() {
  if (originalTimeZone === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalTimeZone;
  }
}

function review(
  id: string,
  options: {
    comment?: string;
    reason?: string;
    flag?: boolean;
    handled?: boolean;
    reviewerRole?: Review["reviewerRole"];
    createdAt?: string;
  } = {}
): Review {
  return {
    id,
    bookingId: `bkg_${id}`,
    reviewerRole: options.reviewerRole ?? "customer",
    rating: 1,
    comment: options.comment ?? "",
    reason: options.reason ?? "",
    flag: options.flag ?? true,
    handled: options.handled ?? false,
    createdAt: options.createdAt ?? "2026-04-01T12:00:00.000Z",
  };
}

describe("getCalendarDayWindow", () => {
  afterEach(() => {
    restoreTimeZone();
  });

  it("uses midnight-to-midnight boundaries in a non-UTC zone", () => {
    const now = new Date("2026-08-25T23:30:00-04:00");
    const window = getCalendarDayWindow("America/New_York", now);
    expect(window.gte).toBe("2026-08-25T04:00:00.000Z");
    expect(window.lt).toBe("2026-08-26T04:00:00.000Z");
  });

  it("classifies reviews before, at, and after local midnight correctly", () => {
    const zone = "America/New_York";
    const day = new Date("2026-08-25T12:00:00-04:00");
    const window = getCalendarDayWindow(zone, day);

    const beforeMidnight = "2026-08-26T03:59:59.999Z";
    const atNextDayMidnight = "2026-08-26T04:00:00.000Z";
    const afterNextDayMidnight = "2026-08-26T04:00:00.001Z";

    expect(beforeMidnight >= window.gte && beforeMidnight < window.lt).toBe(true);
    expect(atNextDayMidnight >= window.gte && atNextDayMidnight < window.lt).toBe(
      false
    );
    expect(afterNextDayMidnight >= window.gte && afterNextDayMidnight < window.lt).toBe(
      false
    );
  });

  it("falls back invalid APP_TIME_ZONE to UTC boundaries", () => {
    process.env[ENV_KEY] = "Not/AZone";
    const now = new Date("2026-08-25T15:00:00.000Z");
    const window = getCalendarDayWindow(resolveAppTimeZone(process.env[ENV_KEY]), now);
    expect(window.gte).toBe("2026-08-25T00:00:00.000Z");
    expect(window.lt).toBe("2026-08-26T00:00:00.000Z");
  });
});

describe("getHighRiskCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 for null or empty search terms without querying", async () => {
    await expect(getHighRiskCount(null)).resolves.toEqual({
      count: 0,
      error: null,
      failureKind: null,
    });
    await expect(getHighRiskCount([])).resolves.toEqual({
      count: 0,
      error: null,
      failureKind: null,
    });
    expect(matchHighRiskReviews).not.toHaveBeenCalled();
  });

  it("delegates to matchHighRiskReviews for non-empty terms", async () => {
    vi.mocked(matchHighRiskReviews).mockResolvedValueOnce({
      reviews: [review("rev_1", { comment: "threat" })],
      count: 1,
      error: null,
      failureKind: null,
    });

    await expect(getHighRiskCount(["threat"])).resolves.toEqual({
      count: 1,
      error: null,
      failureKind: null,
    });
    expect(matchHighRiskReviews).toHaveBeenCalledWith(["threat"]);
  });
});

describe("dashboard counts and lists parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches new-reports-today count and list totals", async () => {
    const rows = [
      review("rev_1", { createdAt: "2026-08-26T10:00:00.000Z" }),
      review("rev_2", { createdAt: "2026-08-26T11:00:00.000Z" }),
    ];

    mockSelect.mockImplementation((_cols?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        return {
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data: rows, error: null }),
              }),
            }),
          }),
        }),
      };
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const params = parseDashboardParams({ view: "today" });
    const [countResult, listResult] = await Promise.all([
      getNewReportsTodayCount("UTC", new Date("2026-08-26T12:00:00.000Z")),
      getDashboardReportList(params),
    ]);

    expect(countResult.count).toBe(2);
    expect(listResult.totalCount).toBe(2);
    expect(listResult.reviews).toHaveLength(2);
  });

  it("matches unhandled count and list totals", async () => {
    const rows = [review("rev_1"), review("rev_2")];

    mockSelect.mockImplementation((_cols?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        return {
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        }),
      };
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const params = parseDashboardParams({ view: "unhandled" });
    const [countResult, listResult] = await Promise.all([
      getUnhandledReportsCount(),
      getDashboardReportList(params),
    ]);

    expect(countResult.count).toBe(2);
    expect(listResult.totalCount).toBe(2);
  });

  it("matches high-risk count and list totals via U2 matcher", async () => {
    const rows = [
      review("rev_1", { comment: "threat", createdAt: "2026-04-02T12:00:00.000Z" }),
      review("rev_2", { reason: "threat", createdAt: "2026-04-01T12:00:00.000Z" }),
    ];

    vi.mocked(matchHighRiskReviews).mockResolvedValueOnce({
      reviews: rows,
      count: 2,
      error: null,
      failureKind: null,
    });

    mockOr.mockResolvedValue({ data: rows, error: null });
    mockEq.mockReturnValue({ or: mockOr });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const params = parseDashboardParams({ view: "highRisk" });
    const [countResult, listResult] = await Promise.all([
      getHighRiskCount(["threat"]),
      getDashboardReportList(params, { searchTerms: ["threat"] }),
    ]);

    expect(countResult.count).toBe(2);
    expect(listResult.totalCount).toBe(2);
    expect(listResult.reviews.map((row) => row.id)).toEqual(["rev_1", "rev_2"]);
  });
});

describe("getDashboardReportList filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list when view is closed", async () => {
    const result = await getDashboardReportList(parseDashboardParams({}));
    expect(result.totalCount).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("applies escaped q substring on comment/reason for unhandled view", async () => {
    const ilikeSpy = vi.spyOn(
      await import("@/lib/postgrest/ilike-or-filter"),
      "buildIlikeOrFilter"
    );

    mockSelect.mockImplementation((_cols?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.head) {
        return {
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ count: 1, error: null }),
            }),
          }),
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [review("rev_1", { comment: "50% threat" })],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await getDashboardReportList(
      parseDashboardParams({ view: "unhandled", q: "50%" })
    );

    expect(ilikeSpy).toHaveBeenCalledWith(["comment", "reason"], "50%");
    expect(ilikeSpy.mock.results[0]?.value).toContain('"%50\\%%"');
    expect(result.error).toBeNull();
    expect(result.totalCount).toBe(1);
    expect(result.reviews).toHaveLength(1);

    ilikeSpy.mockRestore();
  });

  it("applies role filter for today view", async () => {
    const roleFilters: unknown[] = [];

    mockSelect.mockImplementation((_cols?: string, options?: { count?: string; head?: boolean }) => {
      const eq = vi.fn((column: string, value: unknown) => {
        if (column === "reviewerRole") {
          roleFilters.push(value);
        }
        return {
          eq,
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [review("rev_1", { reviewerRole: "provider" })],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      });

      if (options?.head) {
        return {
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                eq,
              }),
            }),
          }),
        };
      }

      return {
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                eq,
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [review("rev_1", { reviewerRole: "provider" })],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    await getDashboardReportList(
      parseDashboardParams({ view: "today", role: "provider" })
    );

    expect(roleFilters).toContain("provider");
  });
});

describe("buildDashboardListPresentation", () => {
  it("degrades gracefully when booking enrichment fails", () => {
    const presentation = buildDashboardListPresentation({
      reviews: [review("rev_1")],
      totalCount: 1,
      page: 1,
      pageSize: 25,
      display: { from: 1, to: 1, total: 1 },
      bookings: [],
      bookingsError: "booking lookup failed",
      bookingsFailureKind: "error",
      error: null,
      failureKind: null,
    });

    expect(presentation.showReviewList).toBe(true);
    expect(presentation.enrichmentError).toBe("booking lookup failed");
    expect(presentation.repeatFlagCounts).toEqual({});
  });
});
