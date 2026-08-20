import type { Review } from "@/lib/types/database";

/** Ignore `expanded` when it does not match a row on the current page. */
export function resolveExpandedReviewId(
  reviews: Review[],
  expanded?: string
): string | undefined {
  if (!expanded) {
    return undefined;
  }

  return reviews.some((review) => review.id === expanded)
    ? expanded
    : undefined;
}
