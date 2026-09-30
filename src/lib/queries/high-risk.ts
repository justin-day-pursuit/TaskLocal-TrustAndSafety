import {
  buildIlikeOrFilter,
  splitPostgrestOrClauses,
} from "@/lib/postgrest/ilike-or-filter";
import { queryFail, type QueryFailureKind } from "@/lib/queries/query-status";
import { createServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types/database";

const MATCH_FIELDS = ["comment", "reason"] as const;

export interface MatchHighRiskReviewsResult {
  reviews: Review[];
  count: number;
  error: string | null;
  failureKind: QueryFailureKind | null;
}

function normalizeSearchTerms(searchTerms: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const term of searchTerms) {
    const trimmed = term.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

export function buildHighRiskSearchOrFilter(searchTerms: string[]): string | null {
  const terms = normalizeSearchTerms(searchTerms);
  if (terms.length === 0) {
    return null;
  }

  const clauses: string[] = [];
  for (const term of terms) {
    clauses.push(...splitPostgrestOrClauses(buildIlikeOrFilter(MATCH_FIELDS, term)));
  }

  return clauses.join(",");
}

export function hasMatchableReviewText(review: Review): boolean {
  return review.comment.trim().length > 0 || review.reason.trim().length > 0;
}

export function dedupeReviewsById(reviews: Review[]): Review[] {
  const seen = new Set<string>();
  const deduped: Review[] = [];

  for (const review of reviews) {
    if (seen.has(review.id)) {
      continue;
    }
    seen.add(review.id);
    deduped.push(review);
  }

  return deduped;
}

export function filterHighRiskMatches(reviews: Review[]): Review[] {
  return dedupeReviewsById(reviews).filter(
    (review) => review.flag && hasMatchableReviewText(review)
  );
}

export async function matchHighRiskReviews(
  searchTerms: string[]
): Promise<MatchHighRiskReviewsResult> {
  const terms = normalizeSearchTerms(searchTerms);
  if (terms.length === 0) {
    return {
      reviews: [],
      count: 0,
      error: null,
      failureKind: null,
    };
  }

  const orFilter = buildHighRiskSearchOrFilter(terms);
  if (!orFilter) {
    return {
      reviews: [],
      count: 0,
      error: null,
      failureKind: null,
    };
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Review")
      .select("*")
      .eq("flag", true)
      .or(orFilter);

    if (error) {
      const failure = queryFail<Review[]>(error, "Failed to match high-risk reviews", []);
      return {
        reviews: failure.data ?? [],
        count: 0,
        error: failure.error,
        failureKind: failure.failureKind,
      };
    }

    const reviews = filterHighRiskMatches(data ?? []);
    return {
      reviews,
      count: reviews.length,
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail<Review[]>(error, "Failed to match high-risk reviews", []);
    return {
      reviews: failure.data ?? [],
      count: 0,
      error: failure.error,
      failureKind: failure.failureKind,
    };
  }
}
