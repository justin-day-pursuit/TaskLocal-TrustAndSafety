import { queryBookingsForReviewCatalog, getBookingsByIds } from "@/lib/queries/bookings";
import { queryFail, type QueryFailureKind } from "@/lib/queries/query-status";
import {
  collectUniqueBookingIds,
  sortReviewsByBookingField,
} from "@/lib/reviews/booking-id-set";
import {
  buildCreatedAtDateFilters,
  POSTGREST_MAX_ROWS,
} from "@/lib/reviews/date-filters";
import {
  clampPage,
  computePaginationDisplay,
  slicePage,
  toSupabaseRange,
  type PaginationDisplay,
} from "@/lib/reviews/pagination";
import {
  isBookingSortField,
  requiresBookingFirstQuery,
  type PageSize,
  type ReviewsCatalogParams,
} from "@/lib/reviews/search-params";
import { buildIlikeOrFilter } from "@/lib/postgrest/ilike-or-filter";
import { createServerClient } from "@/lib/supabase/server";
import type { Booking, Review, ReviewerRole } from "@/lib/types/database";

export interface PaginatedReviewListResult {
  reviews: Review[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  display: PaginationDisplay;
  bookings: Booking[];
  bookingsError: string | null;
  bookingsFailureKind: QueryFailureKind | null;
  postgrestCapHit: boolean;
  error: string | null;
  failureKind: QueryFailureKind | null;
}

function buildReviewCatalogQuery(
  params: ReviewsCatalogParams,
  selectOptions?: { count?: "exact" | "planned" | "estimated"; head?: boolean }
) {
  const supabase = createServerClient();
  let query = supabase.from("Review").select("*", selectOptions);

  if (params.qReview) {
    query = query.or(
      buildIlikeOrFilter(["id", "bookingId"], params.qReview)
    );
  }

  if (params.reviewerRole !== "all") {
    query = query.eq("reviewerRole", params.reviewerRole);
  }

  if (params.flag !== "all") {
    query = query.eq("flag", params.flag === "true");
  }

  if (params.handled !== "all" && params.flag !== "false") {
    query = query.eq("handled", params.handled === "true");
  }

  const dateFilters = buildCreatedAtDateFilters(
    params.createdWithin,
    params.createdMonth
  );

  if (dateFilters.createdWithin) {
    query = query.gte("createdAt", dateFilters.createdWithin.gte);
  }

  if (dateFilters.createdMonthPattern) {
    query = query.ilike("createdAt", `%${dateFilters.createdMonthPattern}%`);
  }

  return query;
}

async function enrichReviewsWithBookings(reviews: Review[]): Promise<{
  bookings: Booking[];
  bookingsError: string | null;
  bookingsFailureKind: QueryFailureKind | null;
}> {
  const bookingIds = collectUniqueBookingIds(reviews);
  const { data, error, failureKind } = await getBookingsByIds(bookingIds);
  return {
    bookings: data ?? [],
    bookingsError: error,
    bookingsFailureKind: failureKind,
  };
}

function emptyCatalogResult(
  params: ReviewsCatalogParams,
  overrides: Partial<PaginatedReviewListResult> = {}
): PaginatedReviewListResult {
  return {
    reviews: [],
    totalCount: 0,
    page: clampPage(params.page, 0, params.pageSize),
    pageSize: params.pageSize,
    display: computePaginationDisplay(params.page, params.pageSize, 0),
    bookings: [],
    bookingsError: null,
    bookingsFailureKind: null,
    postgrestCapHit: false,
    error: null,
    failureKind: null,
    ...overrides,
  };
}

export async function getReviewCatalog(
  params: ReviewsCatalogParams
): Promise<PaginatedReviewListResult> {
  try {
    if (requiresBookingFirstQuery(params)) {
      return getReviewCatalogBookingFirst(params);
    }
    return getReviewCatalogReviewFirst(params);
  } catch (error) {
    const failure = queryFail(error, "Failed to load review catalog");
    return emptyCatalogResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }
}

async function getReviewCatalogReviewFirst(
  params: ReviewsCatalogParams
): Promise<PaginatedReviewListResult> {
  const countQuery = buildReviewCatalogQuery(params, {
    count: "exact",
    head: true,
  });
  const { count, error: countError } = await countQuery;

  if (countError) {
    const failure = queryFail(countError.message, "Failed to load review catalog");
    return emptyCatalogResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }

  const totalCount = count ?? 0;
  const page = clampPage(params.page, totalCount, params.pageSize);
  const { from, to } = toSupabaseRange(page, params.pageSize);

  let query = buildReviewCatalogQuery(params, { count: "exact" });

  if (!isBookingSortField(params.sort)) {
    query = query.order(params.sort, {
      ascending: params.dir === "asc",
      nullsFirst: false,
    });
  } else {
    query = query.order("id", { ascending: true });
  }

  const { data, error } = await query.range(from, to);

  if (error) {
    const failure = queryFail(error.message, "Failed to load review catalog");
    return emptyCatalogResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }

  const reviews = (data ?? []) as Review[];
  const enrichment = await enrichReviewsWithBookings(reviews);

  return {
    reviews,
    totalCount,
    page,
    pageSize: params.pageSize,
    display: computePaginationDisplay(page, params.pageSize, totalCount),
    bookings: enrichment.bookings,
    bookingsError: enrichment.bookingsError,
    bookingsFailureKind: enrichment.bookingsFailureKind,
    postgrestCapHit: totalCount >= POSTGREST_MAX_ROWS,
    error: null,
    failureKind: null,
  };
}

async function getReviewCatalogBookingFirst(
  params: ReviewsCatalogParams
): Promise<PaginatedReviewListResult> {
  const bookingResult = await queryBookingsForReviewCatalog({
    qBooking: params.qBooking,
    bookingStatus: params.bookingStatus,
    sort: isBookingSortField(params.sort) ? params.sort : undefined,
    dir: params.dir,
    limit: POSTGREST_MAX_ROWS,
  });

  if (bookingResult.error) {
    return emptyCatalogResult(params, {
      error: bookingResult.error,
      failureKind: bookingResult.failureKind,
    });
  }

  const bookings = bookingResult.data;
  const bookingIds = bookings.map((booking) => booking.id);

  if (bookingIds.length === 0) {
    return emptyCatalogResult(params, {
      postgrestCapHit: bookingResult.postgrestCapHit,
    });
  }

  const { data, error } = await buildReviewCatalogQuery(params).in(
    "bookingId",
    bookingIds
  );

  if (error) {
    const failure = queryFail(error.message, "Failed to load review catalog");
    return emptyCatalogResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
      postgrestCapHit: bookingResult.postgrestCapHit,
    });
  }

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  let matchedReviews = (data ?? []) as Review[];

  if (isBookingSortField(params.sort)) {
    matchedReviews = sortReviewsByBookingField(
      matchedReviews,
      bookingById,
      params.sort,
      params.dir
    );
  } else {
    matchedReviews.sort((a, b) => {
      const field = params.sort;
      const left = field === "rating" ? a.rating : a.createdAt;
      const right = field === "rating" ? b.rating : b.createdAt;
      const compare =
        field === "rating"
          ? (left as number) - (right as number)
          : String(left).localeCompare(String(right));
      const ordered = params.dir === "asc" ? compare : -compare;
      return ordered !== 0 ? ordered : a.id.localeCompare(b.id);
    });
  }

  const totalCount = matchedReviews.length;
  const page = clampPage(params.page, totalCount, params.pageSize);
  const reviews = slicePage(matchedReviews, page, params.pageSize);
  const enrichment = await enrichReviewsWithBookings(reviews);

  return {
    reviews,
    totalCount,
    page,
    pageSize: params.pageSize,
    display: computePaginationDisplay(page, params.pageSize, totalCount),
    bookings: enrichment.bookings,
    bookingsError: enrichment.bookingsError,
    bookingsFailureKind: enrichment.bookingsFailureKind,
    postgrestCapHit:
      bookingResult.postgrestCapHit || totalCount >= POSTGREST_MAX_ROWS,
    error: null,
    failureKind: null,
  };
}

function flaggedQueueParams(
  params: { reviewerRole?: ReviewerRole; page: number; pageSize: PageSize }
): ReviewsCatalogParams {
  return {
    reviewerRole: params.reviewerRole ?? "all",
    flag: "true",
    handled: "false",
    bookingStatus: "all",
    sort: "createdAt",
    dir: "asc",
    createdWithin: "all",
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getFlaggedReviewsPaginated(params: {
  reviewerRole?: ReviewerRole;
  page: number;
  pageSize: PageSize;
}): Promise<PaginatedReviewListResult> {
  try {
    const supabase = createServerClient();
    let countQuery = supabase
      .from("Review")
      .select("*", { count: "exact", head: true })
      .eq("flag", true)
      .eq("handled", false);

    if (params.reviewerRole !== undefined) {
      countQuery = countQuery.eq("reviewerRole", params.reviewerRole);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      const failure = queryFail(
        countError.message,
        "Failed to load flagged reviews"
      );
      return emptyCatalogResult(flaggedQueueParams(params), {
        error: failure.error,
        failureKind: failure.failureKind,
      });
    }

    const totalCount = count ?? 0;
    const page = clampPage(params.page, totalCount, params.pageSize);
    const { from, to } = toSupabaseRange(page, params.pageSize);

    let query = supabase
      .from("Review")
      .select("*")
      .eq("flag", true)
      .eq("handled", false)
      .order("createdAt", { ascending: true })
      .range(from, to);

    if (params.reviewerRole !== undefined) {
      query = query.eq("reviewerRole", params.reviewerRole);
    }

    const { data, error } = await query;

    if (error) {
      const failure = queryFail(error.message, "Failed to load flagged reviews");
      return emptyCatalogResult(flaggedQueueParams(params), {
        error: failure.error,
        failureKind: failure.failureKind,
      });
    }

    const reviews = (data ?? []) as Review[];
    const enrichment = await enrichReviewsWithBookings(reviews);

    return {
      reviews,
      totalCount,
      page,
      pageSize: params.pageSize,
      display: computePaginationDisplay(page, params.pageSize, totalCount),
      bookings: enrichment.bookings,
      bookingsError: enrichment.bookingsError,
      bookingsFailureKind: enrichment.bookingsFailureKind,
      postgrestCapHit: totalCount >= POSTGREST_MAX_ROWS,
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail(error, "Failed to load flagged reviews");
    return emptyCatalogResult(flaggedQueueParams(params), {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }
}
