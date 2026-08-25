import { getAppTimeZone, resolveAppTimeZone } from "@/lib/config/app-timezone";
import type { DashboardParams, DashboardView } from "@/lib/dashboard/search-params";
import { getBookingsByIds } from "@/lib/queries/bookings";
import {
  buildHighRiskSearchOrFilter,
  filterHighRiskMatches,
  matchHighRiskReviews,
} from "@/lib/queries/high-risk";
import {
  DB_QUERY_TIMEOUT_MS,
  queryFail,
  withTimeout,
  type QueryFailureKind,
} from "@/lib/queries/query-status";
import { buildIlikeOrFilter } from "@/lib/postgrest/ilike-or-filter";
import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";
import {
  clampPage,
  computePaginationDisplay,
  toSupabaseRange,
  type PaginationDisplay,
} from "@/lib/reviews/pagination";
import type { PageSize } from "@/lib/reviews/search-params";
import { createServerClient } from "@/lib/supabase/server";
import type { Booking, Review, ReviewerRole } from "@/lib/types/database";

const TEXT_SEARCH_FIELDS = ["comment", "reason"] as const;

export interface CalendarDayWindow {
  /** Inclusive lower bound (ISO 8601 UTC). */
  gte: string;
  /** Exclusive upper bound (ISO 8601 UTC). */
  lt: string;
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface DashboardCountResult {
  count: number;
  error: string | null;
  failureKind: QueryFailureKind | null;
}

export interface DashboardReportListResult {
  reviews: Review[];
  totalCount: number;
  page: number;
  pageSize: PageSize;
  display: PaginationDisplay;
  bookings: Booking[];
  bookingsError: string | null;
  bookingsFailureKind: QueryFailureKind | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number
): Pick<ZonedDateParts, "year" | "month" | "day"> {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  };
}

function zonedLocalDateTimeToUtc(
  local: ZonedDateParts,
  timeZone: string
): Date {
  const desiredUtcMs = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second
  );

  let guessMs = desiredUtcMs;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedDateParts(new Date(guessMs), timeZone);
    const actualUtcMs = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const deltaMs = desiredUtcMs - actualUtcMs;
    if (deltaMs === 0) {
      break;
    }
    guessMs += deltaMs;
  }

  return new Date(guessMs);
}

/**
 * Current calendar day in the configured IANA timezone (PRD §5.2 card 1).
 * Uses midnight-to-midnight local boundaries, not a rolling 24h window.
 */
export function getCalendarDayWindow(
  timeZone: string,
  now: Date = new Date()
): CalendarDayWindow {
  const resolvedZone = resolveAppTimeZone(timeZone);
  const local = getZonedDateParts(now, resolvedZone);
  const start = zonedLocalDateTimeToUtc(
    {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    resolvedZone
  );
  const nextDay = addCalendarDays(local.year, local.month, local.day, 1);
  const end = zonedLocalDateTimeToUtc(
    {
      ...nextDay,
      hour: 0,
      minute: 0,
      second: 0,
    },
    resolvedZone
  );

  return {
    gte: start.toISOString(),
    lt: end.toISOString(),
  };
}

function applyRoleFilter<T extends { eq: (column: string, value: ReviewerRole) => T }>(
  query: T,
  role: ReviewerRole | "all"
): T {
  if (role === "all") {
    return query;
  }
  return query.eq("reviewerRole", role);
}

function applyTextSearchFilter<T extends { or: (filter: string) => T }>(
  query: T,
  q?: string
): T {
  if (!q) {
    return query;
  }
  return query.or(buildIlikeOrFilter(TEXT_SEARCH_FIELDS, q));
}

function reviewMatchesTextSearch(review: Review, q?: string): boolean {
  if (!q) {
    return true;
  }
  const needle = q.toLowerCase();
  return (
    review.comment.toLowerCase().includes(needle) ||
    review.reason.toLowerCase().includes(needle)
  );
}

function reviewMatchesRole(review: Review, role: ReviewerRole | "all"): boolean {
  if (role === "all") {
    return true;
  }
  return review.reviewerRole === role;
}

function sortReviewsNewestFirst(reviews: Review[]): Review[] {
  return [...reviews].sort((left, right) => {
    const compare = right.createdAt.localeCompare(left.createdAt);
    return compare !== 0 ? compare : right.id.localeCompare(left.id);
  });
}

function emptyListResult(
  params: DashboardParams,
  overrides: Partial<DashboardReportListResult> = {}
): DashboardReportListResult {
  return {
    reviews: [],
    totalCount: 0,
    page: clampPage(params.page, 0, params.pageSize),
    pageSize: params.pageSize,
    display: computePaginationDisplay(params.page, params.pageSize, 0),
    bookings: [],
    bookingsError: null,
    bookingsFailureKind: null,
    error: null,
    failureKind: null,
    ...overrides,
  };
}

async function enrichReviewsWithBookings(reviews: Review[]): Promise<{
  bookings: Booking[];
  bookingsError: string | null;
  bookingsFailureKind: QueryFailureKind | null;
}> {
  const bookingIds = [...new Set(reviews.map((review) => review.bookingId))];
  const { data, error, failureKind } = await getBookingsByIds(bookingIds);
  return {
    bookings: data ?? [],
    bookingsError: error,
    bookingsFailureKind: failureKind,
  };
}

async function awaitDbQuery<T>(query: PromiseLike<T>): Promise<T> {
  return withTimeout(Promise.resolve(query), DB_QUERY_TIMEOUT_MS);
}

async function runCountQuery(
  buildQuery: () => PromiseLike<{ count: number | null; error: unknown | null }>,
  fallbackMessage: string
): Promise<DashboardCountResult> {
  try {
    const { count, error } = await awaitDbQuery(buildQuery());
    if (error) {
      const failure = queryFail(error, fallbackMessage);
      return {
        count: 0,
        error: failure.error,
        failureKind: failure.failureKind,
      };
    }
    return {
      count: count ?? 0,
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail(error, fallbackMessage);
    return {
      count: 0,
      error: failure.error,
      failureKind: failure.failureKind,
    };
  }
}

export async function getNewReportsTodayCount(
  timeZone: string = getAppTimeZone(),
  now: Date = new Date()
): Promise<DashboardCountResult> {
  const window = getCalendarDayWindow(timeZone, now);

  return runCountQuery(async () => {
    const supabase = createServerClient();
    return supabase
      .from("Review")
      .select("*", { count: "exact", head: true })
      .eq("flag", true)
      .gte("createdAt", window.gte)
      .lt("createdAt", window.lt);
  }, "Failed to count new reports today");
}

export async function getUnhandledReportsCount(): Promise<DashboardCountResult> {
  return runCountQuery(async () => {
    const supabase = createServerClient();
    return supabase
      .from("Review")
      .select("*", { count: "exact", head: true })
      .eq("flag", true)
      .eq("handled", false);
  }, "Failed to count unhandled reports");
}

export async function getHighRiskCount(
  searchTerms: string[] | null | undefined
): Promise<DashboardCountResult> {
  if (!searchTerms || searchTerms.length === 0) {
    return { count: 0, error: null, failureKind: null };
  }

  const result = await matchHighRiskReviews(searchTerms);
  return {
    count: result.count,
    error: result.error,
    failureKind: result.failureKind,
  };
}

async function listTodayReports(
  params: DashboardParams
): Promise<DashboardReportListResult> {
  const window = getCalendarDayWindow(getAppTimeZone());

  try {
    const supabase = createServerClient();

    let countQuery = supabase
      .from("Review")
      .select("*", { count: "exact", head: true })
      .eq("flag", true)
      .gte("createdAt", window.gte)
      .lt("createdAt", window.lt);
    countQuery = applyTextSearchFilter(countQuery, params.q);
    countQuery = applyRoleFilter(countQuery, params.role);

    const { count, error: countError } = await awaitDbQuery(countQuery);

    if (countError) {
      const failure = queryFail(countError, "Failed to load dashboard report list");
      return emptyListResult(params, {
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
      .gte("createdAt", window.gte)
      .lt("createdAt", window.lt);
    query = applyTextSearchFilter(query, params.q);
    query = applyRoleFilter(query, params.role);
    query = query.order("createdAt", { ascending: false }).range(from, to);

    const { data, error } = await awaitDbQuery(query);

    if (error) {
      const failure = queryFail(error, "Failed to load dashboard report list");
      return emptyListResult(params, {
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
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail(error, "Failed to load dashboard report list");
    return emptyListResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }
}

async function listUnhandledReports(
  params: DashboardParams
): Promise<DashboardReportListResult> {
  try {
    const supabase = createServerClient();

    let countQuery = supabase
      .from("Review")
      .select("*", { count: "exact", head: true })
      .eq("flag", true)
      .eq("handled", false);
    countQuery = applyTextSearchFilter(countQuery, params.q);
    countQuery = applyRoleFilter(countQuery, params.role);

    const { count, error: countError } = await awaitDbQuery(countQuery);

    if (countError) {
      const failure = queryFail(countError, "Failed to load dashboard report list");
      return emptyListResult(params, {
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
      .eq("handled", false);
    query = applyTextSearchFilter(query, params.q);
    query = applyRoleFilter(query, params.role);
    query = query.order("createdAt", { ascending: false }).range(from, to);

    const { data, error } = await awaitDbQuery(query);

    if (error) {
      const failure = queryFail(error, "Failed to load dashboard report list");
      return emptyListResult(params, {
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
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail(error, "Failed to load dashboard report list");
    return emptyListResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }
}

async function listHighRiskReports(
  params: DashboardParams,
  searchTerms: string[] | null | undefined
): Promise<DashboardReportListResult> {
  if (!searchTerms || searchTerms.length === 0) {
    return emptyListResult(params);
  }

  const orFilter = buildHighRiskSearchOrFilter(searchTerms);
  if (!orFilter) {
    return emptyListResult(params);
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await awaitDbQuery(
      supabase.from("Review").select("*").eq("flag", true).or(orFilter)
    );

    if (error) {
      const failure = queryFail(error, "Failed to load dashboard report list");
      return emptyListResult(params, {
        error: failure.error,
        failureKind: failure.failureKind,
      });
    }

    const matched = filterHighRiskMatches((data ?? []) as Review[])
      .filter((review) => reviewMatchesTextSearch(review, params.q))
      .filter((review) => reviewMatchesRole(review, params.role));
    const sorted = sortReviewsNewestFirst(matched);
    const totalCount = sorted.length;
    const page = clampPage(params.page, totalCount, params.pageSize);
    const { from, to } = toSupabaseRange(page, params.pageSize);
    const reviews = sorted.slice(from, to + 1);
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
      error: null,
      failureKind: null,
    };
  } catch (error) {
    const failure = queryFail(error, "Failed to load dashboard report list");
    return emptyListResult(params, {
      error: failure.error,
      failureKind: failure.failureKind,
    });
  }
}

export async function getDashboardReportList(
  params: DashboardParams,
  options: { searchTerms?: string[] | null } = {}
): Promise<DashboardReportListResult> {
  if (!params.view) {
    return emptyListResult(params);
  }

  switch (params.view as DashboardView) {
    case "today":
      return listTodayReports(params);
    case "unhandled":
      return listUnhandledReports(params);
    case "highRisk":
      return listHighRiskReports(params, options.searchTerms);
    default:
      return emptyListResult(params);
  }
}

export function buildDashboardListPresentation(
  listResult: DashboardReportListResult
) {
  const enrichment =
    listResult.bookingsError !== null
      ? {
          data: null,
          error: listResult.bookingsError,
          failureKind: listResult.bookingsFailureKind,
        }
      : {
          data: listResult.bookings,
          error: null,
          failureKind: null,
        };

  return buildReviewListPresentation(
    listResult.reviews,
    listResult.error,
    enrichment,
    listResult.failureKind
  );
}
