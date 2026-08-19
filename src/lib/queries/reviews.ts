import { createServerClient } from "@/lib/supabase/server";
import { getBookingsByIds } from "@/lib/queries/bookings";
import type { Booking, Review, ReviewerRole } from "@/lib/types/database";

export interface ReviewStats {
  total: number;
  flagged: number;
  unhandled: number;
}

export type RepeatFlagCounts = Record<string, number>;

function getReviewedPartyId(review: Review, booking: Booking): string | null {
  if (review.reviewerRole === "customer") {
    return booking.providerId;
  }
  if (review.reviewerRole === "provider") {
    return booking.customerId;
  }
  return null;
}

function repeatFlagGroupKey(reviewerRole: ReviewerRole, partyId: string): string {
  return `${reviewerRole}:${partyId}`;
}

export function computeRepeatFlagCounts(
  openFlaggedReviews: Review[],
  bookings: Booking[]
): RepeatFlagCounts {
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const groupReviewIds = new Map<string, string[]>();

  for (const review of openFlaggedReviews) {
    const booking = bookingById.get(review.bookingId);
    if (!booking) {
      continue;
    }

    const partyId = getReviewedPartyId(review, booking);
    if (!partyId) {
      continue;
    }

    const key = repeatFlagGroupKey(review.reviewerRole, partyId);
    const reviewIds = groupReviewIds.get(key) ?? [];
    reviewIds.push(review.id);
    groupReviewIds.set(key, reviewIds);
  }

  const counts: RepeatFlagCounts = {};

  for (const review of openFlaggedReviews) {
    const booking = bookingById.get(review.bookingId);
    if (!booking) {
      counts[review.id] = 0;
      continue;
    }

    const partyId = getReviewedPartyId(review, booking);
    if (!partyId) {
      counts[review.id] = 0;
      continue;
    }

    const key = repeatFlagGroupKey(review.reviewerRole, partyId);
    const reviewIds = groupReviewIds.get(key) ?? [];
    counts[review.id] = reviewIds.filter((id) => id !== review.id).length;
  }

  return counts;
}

export async function getRepeatFlagCountForReview(reviewId: string): Promise<{
  data: number | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const { data: review, error: reviewError } = await supabase
      .from("Review")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError) {
      return { data: null, error: reviewError.message };
    }

    if (!review) {
      return { data: null, error: "Review not found" };
    }

    const typedReview = review as Review;
    const { data: booking, error: bookingError } = await supabase
      .from("Booking")
      .select("*")
      .eq("id", typedReview.bookingId)
      .maybeSingle();

    if (bookingError) {
      return { data: null, error: bookingError.message };
    }

    if (!booking) {
      return { data: 0, error: null };
    }

    const partyId = getReviewedPartyId(typedReview, booking as Booking);
    if (!partyId) {
      return { data: 0, error: null };
    }

    const { data: openFlaggedReviews, error: flagsError } = await supabase
      .from("Review")
      .select("*")
      .eq("flag", true)
      .eq("handled", false)
      .eq("reviewerRole", typedReview.reviewerRole);

    if (flagsError) {
      return { data: null, error: flagsError.message };
    }

    const reviews = (openFlaggedReviews ?? []) as Review[];
    const bookingIds = [...new Set(reviews.map((r) => r.bookingId))];
    const { data: bookings, error: bookingsError } =
      await getBookingsByIds(bookingIds);

    if (bookingsError) {
      return { data: null, error: bookingsError };
    }

    const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
    const count = reviews.filter((r) => {
      if (r.id === reviewId) {
        return false;
      }
      const reviewBooking = bookingById.get(r.bookingId);
      if (!reviewBooking) {
        return false;
      }
      return getReviewedPartyId(r, reviewBooking) === partyId;
    }).length;

    return { data: count, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to compute repeat flag count";
    return { data: null, error: message };
  }
}

export async function getFlaggedReviews(reviewerRole?: ReviewerRole): Promise<{
  data: Review[] | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    let query = supabase
      .from("Review")
      .select("*")
      .eq("flag", true)
      .eq("handled", false)
      .order("createdAt", { ascending: true });

    if (reviewerRole !== undefined) {
      query = query.eq("reviewerRole", reviewerRole);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Review[], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load flagged reviews";
    return { data: null, error: message };
  }
}

export async function getReviewStats(): Promise<{
  data: ReviewStats | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const [totalResult, flaggedResult, unhandledResult] = await Promise.all([
      supabase.from("Review").select("*", { count: "exact", head: true }),
      supabase
        .from("Review")
        .select("*", { count: "exact", head: true })
        .eq("flag", true),
      supabase
        .from("Review")
        .select("*", { count: "exact", head: true })
        .eq("flag", true)
        .eq("handled", false),
    ]);

    const error =
      totalResult.error?.message ??
      flaggedResult.error?.message ??
      unhandledResult.error?.message ??
      null;

    if (error) {
      return { data: null, error };
    }

    const stats: ReviewStats = {
      total: totalResult.count ?? 0,
      flagged: flaggedResult.count ?? 0,
      unhandled: unhandledResult.count ?? 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load review stats";
    return { data: null, error: message };
  }
}
