import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildHighRiskSearchOrFilter,
  dedupeReviewsById,
  filterHighRiskMatches,
  matchHighRiskReviews,
} from "@/lib/queries/high-risk";
import { splitPostgrestOrClauses } from "@/lib/postgrest/ilike-or-filter";
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

function review(
  id: string,
  options: {
    comment?: string;
    reason?: string;
    flag?: boolean;
  } = {}
): Review {
  return {
    id,
    bookingId: "bkg_1",
    reviewerRole: "customer",
    rating: 1,
    comment: options.comment ?? "",
    reason: options.reason ?? "",
    flag: options.flag ?? true,
    handled: false,
    createdAt: "2026-04-01T12:00:00.000Z",
  };
}

describe("buildHighRiskSearchOrFilter", () => {
  it("returns null for empty or whitespace-only terms", () => {
    expect(buildHighRiskSearchOrFilter([])).toBeNull();
    expect(buildHighRiskSearchOrFilter(["", "  "])).toBeNull();
  });

  it("builds comment/reason OR clauses per term and dedupes terms case-insensitively", () => {
    const filter = buildHighRiskSearchOrFilter(["threat", "THREAT", "harassment"]);
    expect(filter).not.toBeNull();
    const clauses = splitPostgrestOrClauses(filter!);
    expect(clauses).toHaveLength(4);
    expect(clauses).toEqual(
      expect.arrayContaining([
        'comment.ilike."%threat%"',
        'reason.ilike."%threat%"',
        'comment.ilike."%harassment%"',
        'reason.ilike."%harassment%"',
      ])
    );
  });

  it("escapes special PostgREST/ILIKE characters literally", () => {
    const filter = buildHighRiskSearchOrFilter(['50% off', 'a_b', 'foo,bar', 'say "hi"', 'x)or']);
    expect(filter).not.toBeNull();
    const clauses = splitPostgrestOrClauses(filter!);
    expect(clauses).toHaveLength(10);
    expect(filter).toContain('"%50\\% off%"');
    expect(filter).toContain('"%a\\_b%"');
    expect(filter).toContain('"%foo,bar%"');
    expect(filter).toContain('"%say \\"hi\\"%"');
    expect(filter).toContain('"%x)or%"');
  });
});

describe("filterHighRiskMatches", () => {
  it("dedupes by id and excludes non-flagged or empty text rows", () => {
    const rows = [
      review("rev_1", { comment: "threat" }),
      review("rev_1", { comment: "duplicate" }),
      review("rev_2", { reason: "harassment" }),
      review("rev_3", { comment: "ignored", flag: false }),
      review("rev_4", { comment: "", reason: "" }),
      review("rev_5", { comment: "   ", reason: "\t" }),
    ];

    expect(filterHighRiskMatches(rows)).toEqual([
      review("rev_1", { comment: "threat" }),
      review("rev_2", { reason: "harassment" }),
    ]);
    expect(dedupeReviewsById(rows)).toHaveLength(5);
  });
});

describe("matchHighRiskReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      or: mockOr,
    });
  });

  it("returns count 0 with no error for null-equivalent empty terms", async () => {
    await expect(matchHighRiskReviews([])).resolves.toEqual({
      reviews: [],
      count: 0,
      error: null,
      failureKind: null,
    });
    await expect(matchHighRiskReviews(["", "  "])).resolves.toEqual({
      reviews: [],
      count: 0,
      error: null,
      failureKind: null,
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("queries flagged reviews with escaped OR filter and returns deduped matches", async () => {
    mockOr.mockResolvedValue({
      data: [
        review("rev_1", { comment: "threat in comment" }),
        review("rev_2", { reason: "threat in reason" }),
        review("rev_3", { comment: "threat", reason: "threat" }),
      ],
      error: null,
    });

    const result = await matchHighRiskReviews(["threat", "threat"]);

    expect(mockFrom).toHaveBeenCalledWith("Review");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("flag", true);
    expect(mockOr).toHaveBeenCalledWith(
      'comment.ilike."%threat%",reason.ilike."%threat%"'
    );
    expect(result.error).toBeNull();
    expect(result.failureKind).toBeNull();
    expect(result.count).toBe(3);
    expect(result.reviews.map((row) => row.id)).toEqual([
      "rev_1",
      "rev_2",
      "rev_3",
    ]);
  });

  it("returns count 0 when Supabase finds no matching rows", async () => {
    mockOr.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await matchHighRiskReviews(["nonexistent-term"]);
    expect(result).toEqual({
      reviews: [],
      count: 0,
      error: null,
      failureKind: null,
    });
  });

  it("post-filters flagged rows with empty comment and reason after query", async () => {
    mockOr.mockResolvedValue({
      data: [
        review("rev_1", { comment: "threat" }),
        review("rev_2", { comment: "", reason: "" }),
        review("rev_3", { comment: "ignored", flag: false }),
      ],
      error: null,
    });

    const result = await matchHighRiskReviews(["threat"]);
    expect(result.count).toBe(1);
    expect(result.reviews.map((row) => row.id)).toEqual(["rev_1"]);
  });

  it("returns query failure when Supabase errors", async () => {
    mockOr.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });

    const result = await matchHighRiskReviews(["threat"]);
    expect(result.reviews).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.error).toBe("database unavailable");
    expect(result.failureKind).toBe("error");
  });
});
