"use server";

import { revalidatePath } from "next/cache";

import { resolveReview } from "@/lib/queries/reviews";
import type { QueryFailureKind } from "@/lib/queries/query-status";

export async function resolveReviewAction(reviewId: string): Promise<
  | void
  | {
      error: string;
      failureKind: QueryFailureKind;
    }
> {
  const { data, error, failureKind } = await resolveReview(reviewId);

  if (error) {
    return { error, failureKind: failureKind ?? "error" };
  }

  if (!data) {
    return {
      error: "Review not found or already resolved.",
      failureKind: "error",
    };
  }

  revalidatePath("/");
  revalidatePath("/action-needed");
  revalidatePath(`/action-needed/${reviewId}`);
  revalidatePath("/reviews");
  revalidatePath("/flagged");
  revalidatePath(`/flagged/${reviewId}`);
}
