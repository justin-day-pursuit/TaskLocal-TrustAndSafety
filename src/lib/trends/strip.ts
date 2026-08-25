import type { Review } from "@/lib/types/database";
import { redactFreeText } from "@/lib/trends/redact";
import {
  STRIPPED_REVIEW_KEYS,
  type StrippedReview,
} from "@/lib/trends/types";

export { STRIPPED_REVIEW_KEYS };

export function stripReviewForAnalysis(
  review: Pick<
    Review,
    "reviewerRole" | "rating" | "comment" | "flag" | "reason" | "createdAt"
  >,
  serviceDate: string | null
): StrippedReview {
  return {
    reviewer: review.reviewerRole,
    rating: review.rating,
    comment: redactFreeText(review.comment),
    flag: review.flag,
    reason: redactFreeText(review.reason),
    created: review.createdAt,
    serviceDate,
  };
}

export function strippedReviewKeys(row: StrippedReview): string[] {
  return Object.keys(row).sort();
}

export function allowedStripKeys(): string[] {
  return [...STRIPPED_REVIEW_KEYS].sort();
}
