import { POSTGREST_MAX_ROWS } from "@/lib/reviews/date-filters";
import { queryFail, queryOk, type QueryFailureKind } from "@/lib/queries/query-status";
import { createServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types/database";
import { stripReviewForAnalysis } from "@/lib/trends/strip";
import type { StrippedReview, TrendReviewRow } from "@/lib/trends/types";

const BOOKING_IN_CHUNK = 100;

interface ReviewRow {
  id: string;
  bookingId: string;
  reviewerRole: Review["reviewerRole"];
  rating: number;
  comment: string;
  flag: boolean;
  reason: string;
  handled: boolean;
  createdAt: string;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

async function fetchAllReviews(): Promise<{
  data: ReviewRow[] | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  try {
    const supabase = createServerClient();
    const rows: ReviewRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("Review")
        .select(
          "id, bookingId, reviewerRole, rating, comment, flag, reason, handled, createdAt"
        )
        .order("createdAt", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + POSTGREST_MAX_ROWS - 1);

      if (error) {
        return queryFail(error, "Failed to load reviews");
      }

      const page = (data ?? []) as ReviewRow[];
      rows.push(...page);

      if (page.length < POSTGREST_MAX_ROWS) {
        break;
      }
      offset += POSTGREST_MAX_ROWS;
    }

    return queryOk(rows);
  } catch (error) {
    return queryFail(error, "Failed to load reviews");
  }
}

async function fetchServiceDatesByBookingId(
  bookingIds: string[]
): Promise<{
  data: Map<string, string | null>;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  const serviceDates = new Map<string, string | null>();
  if (bookingIds.length === 0) {
    return queryOk(serviceDates);
  }

  try {
    const supabase = createServerClient();

    for (const ids of chunk(bookingIds, BOOKING_IN_CHUNK)) {
      const { data, error } = await supabase
        .from("Booking")
        .select("id, serviceDate")
        .in("id", ids);

      if (error) {
        return queryFail(error, "Failed to load service dates", serviceDates);
      }

      for (const booking of data ?? []) {
        const row = booking as { id: string; serviceDate: string | null };
        serviceDates.set(row.id, row.serviceDate);
      }
    }

    return queryOk(serviceDates);
  } catch (error) {
    return queryFail(error, "Failed to load service dates", serviceDates);
  }
}

export async function fetchTrendReviewRows(): Promise<{
  data: TrendReviewRow[] | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  const reviewsResult = await fetchAllReviews();
  if (reviewsResult.error || !reviewsResult.data) {
    return {
      data: null,
      error: reviewsResult.error,
      failureKind: reviewsResult.failureKind,
    };
  }

  const bookingIds = [
    ...new Set(reviewsResult.data.map((review) => review.bookingId)),
  ];
  const datesResult = await fetchServiceDatesByBookingId(bookingIds);
  if (datesResult.error) {
    return {
      data: null,
      error: datesResult.error,
      failureKind: datesResult.failureKind,
    };
  }

  const rows = reviewsResult.data.map((review) => ({
    id: review.id,
    handled: Boolean(review.handled),
    stripped: stripReviewForAnalysis(
      review,
      datesResult.data.get(review.bookingId) ?? null
    ),
  }));

  return queryOk(rows);
}

export async function fetchStrippedReviews(): Promise<{
  data: StrippedReview[] | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  const result = await fetchTrendReviewRows();
  if (result.error || !result.data) {
    return {
      data: null,
      error: result.error,
      failureKind: result.failureKind,
    };
  }

  return queryOk(result.data.map((row) => row.stripped));
}
