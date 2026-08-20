import type { CreatedWithin } from "@/lib/reviews/search-params";

/** PostgREST default max rows per request (PRD §6 T6). */
export const POSTGREST_MAX_ROWS = 1000;

export interface UtcDateWindow {
  /** Inclusive lower bound (ISO 8601 UTC). */
  gte: string;
}

/**
 * Rolling recency window on `Review.createdAt` in UTC (PRD §7).
 * Returns `null` when `createdWithin` is `all`.
 */
export function getCreatedWithinWindow(
  createdWithin: CreatedWithin,
  now: Date = new Date()
): UtcDateWindow | null {
  switch (createdWithin) {
    case "all":
      return null;
    case "today": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      return { gte: start.toISOString() };
    }
    case "week":
      return { gte: subtractUtcDays(now, 7).toISOString() };
    case "month":
      return { gte: subtractUtcDays(now, 30).toISOString() };
    case "year":
      return { gte: subtractUtcDays(now, 365).toISOString() };
  }
}

function subtractUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Two-digit month for PostgREST `ilike` on ISO timestamps (e.g. March → "03"). */
export function formatCreatedMonthPattern(month: number): string {
  return `-${String(month).padStart(2, "0")}-`;
}

export interface CreatedAtDateFilters {
  createdWithin: UtcDateWindow | null;
  createdMonthPattern: string | null;
}

export function buildCreatedAtDateFilters(
  createdWithin: CreatedWithin,
  createdMonth: number | undefined,
  now: Date = new Date()
): CreatedAtDateFilters {
  return {
    createdWithin: getCreatedWithinWindow(createdWithin, now),
    createdMonthPattern:
      createdMonth !== undefined
        ? formatCreatedMonthPattern(createdMonth)
        : null,
  };
}

export function reviewMatchesCreatedMonth(
  createdAt: string,
  month: number
): boolean {
  const pattern = formatCreatedMonthPattern(month);
  return createdAt.includes(pattern);
}

export function reviewMatchesCreatedAtFilters(
  createdAt: string,
  filters: CreatedAtDateFilters
): boolean {
  if (
    filters.createdWithin &&
    createdAt < filters.createdWithin.gte
  ) {
    return false;
  }

  if (filters.createdMonthPattern) {
    const month = Number.parseInt(
      filters.createdMonthPattern.slice(1, 3),
      10
    );
    if (!reviewMatchesCreatedMonth(createdAt, month)) {
      return false;
    }
  }

  return true;
}
