import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type PageSize,
} from "@/lib/reviews/search-params";

export interface PaginationRange {
  from: number;
  to: number;
}

export interface PaginationDisplay {
  from: number;
  to: number;
  total: number;
}

/** 1-based page clamped to valid range; page 0 and negatives become 1. */
export function clampPage(
  page: number,
  totalCount: number,
  pageSize: PageSize
): number {
  const normalizedPage =
    Number.isInteger(page) && page >= 1 ? page : DEFAULT_PAGE;

  if (totalCount <= 0) {
    return DEFAULT_PAGE;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return Math.min(normalizedPage, totalPages);
}

/** Supabase `.range(from, to)` — both inclusive, zero-based. */
export function toSupabaseRange(
  page: number,
  pageSize: PageSize
): PaginationRange {
  const safePage = page >= 1 ? page : DEFAULT_PAGE;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

export function computePaginationDisplay(
  page: number,
  pageSize: PageSize,
  totalCount: number
): PaginationDisplay {
  if (totalCount <= 0) {
    return { from: 0, to: 0, total: 0 };
  }

  const clampedPage = clampPage(page, totalCount, pageSize);
  const from = (clampedPage - 1) * pageSize + 1;
  const to = Math.min(clampedPage * pageSize, totalCount);

  return { from, to, total: totalCount };
}

export function slicePage<T>(
  items: T[],
  page: number,
  pageSize: PageSize
): T[] {
  if (items.length === 0) {
    return [];
  }

  const clampedPage = clampPage(page, items.length, pageSize);
  const { from, to } = toSupabaseRange(clampedPage, pageSize);
  return items.slice(from, to + 1);
}

export function normalizePageSize(value: number): PageSize {
  if (value === 10 || value === 25 || value === 50) {
    return value;
  }
  return DEFAULT_PAGE_SIZE;
}
