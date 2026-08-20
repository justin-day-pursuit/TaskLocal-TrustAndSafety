import {
  computeRepeatFlagCounts,
  type RepeatFlagCounts,
} from "@/lib/queries/reviews";
import type { Booking, Review } from "@/lib/types/database";

/**
 * Render contract for review list pages with optional secondary enrichment.
 *
 * - Primary query failure blocks the list and surfaces only the primary error.
 * - Primary query success always renders the list, even when enrichment fails.
 * - Enrichment failure shows a supplementary ErrorBanner and degrades derived
 *   fields (repeat-flag counts stay empty; computeRepeatFlagCounts yields 0).
 *
 * Apply the same helper on future pages such as `/reviews`.
 */
export interface ReviewListPresentation {
  showReviewList: boolean;
  primaryError: string | null;
  enrichmentError: string | null;
  repeatFlagCounts: RepeatFlagCounts;
}

export interface EnrichmentQueryResult<T> {
  data: T | null;
  error: string | null;
}

export function buildReviewListPresentation(
  reviews: Review[] | null,
  reviewsError: string | null,
  enrichment: EnrichmentQueryResult<Booking[]> | null
): ReviewListPresentation {
  if (reviewsError) {
    return {
      showReviewList: false,
      primaryError: reviewsError,
      enrichmentError: null,
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
    enrichmentError,
    repeatFlagCounts,
  };
}
