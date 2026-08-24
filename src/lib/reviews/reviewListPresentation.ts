import {
  computeRepeatFlagCounts,
  type RepeatFlagCounts,
} from "@/lib/queries/reviews";
import {
  classifyQueryFailure,
  type QueryFailureKind,
} from "@/lib/queries/query-status";
import type { Booking, Review } from "@/lib/types/database";

/**
 * Render contract for review list pages with optional secondary enrichment.
 *
 * - Primary query failure or timeout blocks the list and surfaces only the
 *   primary status (error vs timeout).
 * - Primary query success always renders the list, even when enrichment fails
 *   or times out.
 * - Enrichment failure/timeout shows a supplementary status and degrades
 *   derived fields (repeat-flag counts stay empty; computeRepeatFlagCounts
 *   yields 0).
 *
 * Apply the same helper on `/action-needed` and `/reviews`.
 */
export interface ReviewListPresentation {
  showReviewList: boolean;
  primaryError: string | null;
  primaryFailureKind: QueryFailureKind | null;
  enrichmentError: string | null;
  enrichmentFailureKind: QueryFailureKind | null;
  repeatFlagCounts: RepeatFlagCounts;
}

export interface EnrichmentQueryResult<T> {
  data: T | null;
  error: string | null;
  failureKind?: QueryFailureKind | null;
}

function kindFromError(
  error: string | null,
  kind?: QueryFailureKind | null
): QueryFailureKind | null {
  if (!error) {
    return null;
  }
  return kind ?? classifyQueryFailure(error).kind;
}

export function buildReviewListPresentation(
  reviews: Review[] | null,
  reviewsError: string | null,
  enrichment: EnrichmentQueryResult<Booking[]> | null,
  reviewsFailureKind: QueryFailureKind | null = null
): ReviewListPresentation {
  if (reviewsError) {
    return {
      showReviewList: false,
      primaryError: reviewsError,
      primaryFailureKind: kindFromError(reviewsError, reviewsFailureKind),
      enrichmentError: null,
      enrichmentFailureKind: null,
      repeatFlagCounts: {},
    };
  }

  const enrichmentError = enrichment?.error ?? null;
  const repeatFlagCounts =
    reviews && enrichment?.data
      ? computeRepeatFlagCounts(reviews, enrichment.data)
      : {};

  return {
    showReviewList: true,
    primaryError: null,
    primaryFailureKind: null,
    enrichmentError,
    enrichmentFailureKind: kindFromError(
      enrichmentError,
      enrichment?.failureKind
    ),
    repeatFlagCounts,
  };
}
