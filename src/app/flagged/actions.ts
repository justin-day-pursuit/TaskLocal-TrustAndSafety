"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveReview } from "@/lib/queries/reviews";

export async function resolveReviewAction(reviewId: string) {
  const { data, error } = await resolveReview(reviewId);

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: "Review not found or already resolved." };
  }

  revalidatePath("/flagged");
  revalidatePath(`/flagged/${reviewId}`);
}

export async function resolveReviewAndRedirect(reviewId: string) {
  const result = await resolveReviewAction(reviewId);

  if (result?.error) {
    return result;
  }

  redirect("/flagged");
}
