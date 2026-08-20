import { buildIlikeOrFilter } from "@/lib/postgrest/ilike-or-filter";
import { createServerClient } from "@/lib/supabase/server";
import { POSTGREST_MAX_ROWS } from "@/lib/reviews/date-filters";
import type { ReviewSortField, SortDirection } from "@/lib/reviews/search-params";
import type { Booking, BookingStatus } from "@/lib/types/database";

export interface BookingQueryOptions {
  qBooking?: string;
  bookingStatus?: BookingStatus | "all";
  sort?: ReviewSortField;
  dir?: SortDirection;
  limit?: number;
}

export interface BookingQueryResult {
  data: Booking[];
  error: string | null;
  /** True when the booking-side result set hit the PostgREST row cap. */
  postgrestCapHit: boolean;
  totalFetched: number;
}

export async function queryBookingsForReviewCatalog(
  options: BookingQueryOptions
): Promise<BookingQueryResult> {
  const limit = options.limit ?? POSTGREST_MAX_ROWS;

  try {
    const supabase = createServerClient();
    let query = supabase.from("Booking").select("*");

    if (options.qBooking) {
      query = query.or(
        buildIlikeOrFilter(
          ["id", "listingId", "customerId", "providerId"],
          options.qBooking
        )
      );
    }

    if (options.bookingStatus && options.bookingStatus !== "all") {
      query = query.eq("status", options.bookingStatus);
    }

    if (options.sort === "priceAtBooking") {
      query = query.order("priceAtBooking", {
        ascending: (options.dir ?? "asc") === "asc",
        nullsFirst: false,
      });
    } else if (options.sort === "requestedAt") {
      query = query.order("requestedAt", {
        ascending: (options.dir ?? "asc") === "asc",
        nullsFirst: false,
      });
    } else if (options.sort === "serviceDate") {
      query = query.order("serviceDate", {
        ascending: (options.dir ?? "asc") === "asc",
        nullsFirst: false,
      });
    } else {
      query = query.order("id", { ascending: true });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      return {
        data: [],
        error: error.message,
        postgrestCapHit: false,
        totalFetched: 0,
      };
    }

    const bookings = (data ?? []) as Booking[];
    return {
      data: bookings,
      error: null,
      postgrestCapHit: bookings.length >= limit,
      totalFetched: bookings.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load bookings";
    return {
      data: [],
      error: message,
      postgrestCapHit: false,
      totalFetched: 0,
    };
  }
}

export async function getBookingsByIds(bookingIds: string[]): Promise<{
  data: Booking[] | null;
  error: string | null;
}> {
  if (bookingIds.length === 0) {
    return { data: [], error: null };
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Booking")
      .select("*")
      .in("id", bookingIds);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Booking[], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load bookings";
    return { data: null, error: message };
  }
}
