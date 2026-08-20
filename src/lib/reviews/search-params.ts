import { BOOKING_STATUSES, REVIEWER_ROLES } from "@/lib/constants/enums";
import type { BookingStatus, ReviewerRole } from "@/lib/types/database";

/** PRD §7 `/reviews` URL contract — typed state with documented defaults. */

export const DEFAULT_SORT = "createdAt" as const;
export const DEFAULT_DIR = "desc" as const;
export const DEFAULT_CREATED_WITHIN = "all" as const;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const SORT_FIELDS = [
  "rating",
  "createdAt",
  "priceAtBooking",
  "requestedAt",
  "serviceDate",
] as const;
export type ReviewSortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const CREATED_WITHIN_OPTIONS = [
  "all",
  "today",
  "week",
  "month",
  "year",
] as const;
export type CreatedWithin = (typeof CREATED_WITHIN_OPTIONS)[number];

export type TriStateBoolean = "all" | "true" | "false";

export interface ReviewsCatalogParams {
  qReview?: string;
  qBooking?: string;
  reviewerRole: ReviewerRole | "all";
  flag: TriStateBoolean;
  handled: TriStateBoolean;
  bookingStatus: BookingStatus | "all";
  sort: ReviewSortField;
  dir: SortDirection;
  createdWithin: CreatedWithin;
  createdMonth?: number;
  page: number;
  pageSize: PageSize;
  expanded?: string;
}

export interface ActionNeededListParams {
  role: ReviewerRole | "all";
  page: number;
  pageSize: PageSize;
  expanded?: string;
}

const BOOKING_SORT_FIELDS: ReadonlySet<ReviewSortField> = new Set([
  "priceAtBooking",
  "requestedAt",
  "serviceDate",
]);

const FILTER_KEYS: (keyof ReviewsCatalogParams)[] = [
  "qReview",
  "qBooking",
  "reviewerRole",
  "flag",
  "handled",
  "bookingStatus",
  "sort",
  "dir",
  "createdWithin",
  "createdMonth",
];

function firstString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function parseTriStateBoolean(raw: string | undefined): TriStateBoolean {
  if (raw === "true" || raw === "false") {
    return raw;
  }
  return "all";
}

function parseReviewerRole(raw: string | undefined): ReviewerRole | "all" {
  if (raw && (REVIEWER_ROLES as readonly string[]).includes(raw)) {
    return raw as ReviewerRole;
  }
  return "all";
}

function parseBookingStatus(raw: string | undefined): BookingStatus | "all" {
  if (raw && (BOOKING_STATUSES as readonly string[]).includes(raw)) {
    return raw as BookingStatus;
  }
  return "all";
}

function parseSortField(raw: string | undefined): ReviewSortField {
  if (raw && (SORT_FIELDS as readonly string[]).includes(raw)) {
    return raw as ReviewSortField;
  }
  return DEFAULT_SORT;
}

function parseSortDirection(raw: string | undefined): SortDirection {
  if (raw === "asc" || raw === "desc") {
    return raw;
  }
  return DEFAULT_DIR;
}

function parseCreatedWithin(raw: string | undefined): CreatedWithin {
  if (raw && (CREATED_WITHIN_OPTIONS as readonly string[]).includes(raw)) {
    return raw as CreatedWithin;
  }
  return DEFAULT_CREATED_WITHIN;
}

function parseCreatedMonth(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const month = Number.parseInt(raw, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return undefined;
  }
  return month;
}

function parsePage(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PAGE;
  }
  const page = Number.parseInt(raw, 10);
  if (!Number.isInteger(page) || page < 1) {
    return DEFAULT_PAGE;
  }
  return page;
}

function parsePageSize(raw: string | undefined): PageSize {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_PAGE_SIZE;
  }
  const size = Number.parseInt(raw, 10);
  if (size === 10 || size === 25 || size === 50) {
    return size;
  }
  return DEFAULT_PAGE_SIZE;
}

function parseOptionalSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseReviewsCatalogParams(
  input: Record<string, string | string[] | undefined>
): ReviewsCatalogParams {
  return {
    qReview: parseOptionalSearch(firstString(input.qReview)),
    qBooking: parseOptionalSearch(firstString(input.qBooking)),
    reviewerRole: parseReviewerRole(firstString(input.reviewerRole)),
    flag: parseTriStateBoolean(firstString(input.flag)),
    handled: parseTriStateBoolean(firstString(input.handled)),
    bookingStatus: parseBookingStatus(firstString(input.bookingStatus)),
    sort: parseSortField(firstString(input.sort)),
    dir: parseSortDirection(firstString(input.dir)),
    createdWithin: parseCreatedWithin(firstString(input.createdWithin)),
    createdMonth: parseCreatedMonth(firstString(input.createdMonth)),
    page: parsePage(firstString(input.page)),
    pageSize: parsePageSize(firstString(input.pageSize)),
    expanded: parseOptionalSearch(firstString(input.expanded)),
  };
}

function appendParam(
  parts: string[],
  key: string,
  value: string | number | undefined
): void {
  if (value === undefined || value === "") {
    return;
  }
  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
}

export function serializeReviewsCatalogParams(
  params: ReviewsCatalogParams
): string {
  const parts: string[] = [];

  appendParam(parts, "qReview", params.qReview);
  appendParam(parts, "qBooking", params.qBooking);

  if (params.reviewerRole !== "all") {
    appendParam(parts, "reviewerRole", params.reviewerRole);
  }
  if (params.flag !== "all") {
    appendParam(parts, "flag", params.flag);
  }
  if (params.handled !== "all") {
    appendParam(parts, "handled", params.handled);
  }
  if (params.bookingStatus !== "all") {
    appendParam(parts, "bookingStatus", params.bookingStatus);
  }
  if (params.sort !== DEFAULT_SORT) {
    appendParam(parts, "sort", params.sort);
  }
  if (params.dir !== DEFAULT_DIR) {
    appendParam(parts, "dir", params.dir);
  }
  if (params.createdWithin !== DEFAULT_CREATED_WITHIN) {
    appendParam(parts, "createdWithin", params.createdWithin);
  }
  appendParam(parts, "createdMonth", params.createdMonth);
  if (params.page !== DEFAULT_PAGE) {
    appendParam(parts, "page", params.page);
  }
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    appendParam(parts, "pageSize", params.pageSize);
  }
  appendParam(parts, "expanded", params.expanded);

  return parts.join("&");
}

export function mergeReviewsCatalogParams(
  current: ReviewsCatalogParams,
  updates: Partial<ReviewsCatalogParams>
): ReviewsCatalogParams {
  const next: ReviewsCatalogParams = { ...current, ...updates };
  const filterChanged = FILTER_KEYS.some((key) => {
    if (!(key in updates)) {
      return false;
    }
    return updates[key] !== current[key];
  });

  if (filterChanged) {
    next.page = DEFAULT_PAGE;
  }

  return next;
}

export function isBookingSortField(sort: ReviewSortField): boolean {
  return BOOKING_SORT_FIELDS.has(sort);
}

export function requiresBookingFirstQuery(params: ReviewsCatalogParams): boolean {
  return (
    Boolean(params.qBooking) ||
    params.bookingStatus !== "all" ||
    isBookingSortField(params.sort)
  );
}

export function parseActionNeededListParams(
  input: Record<string, string | string[] | undefined>
): ActionNeededListParams {
  return {
    role: parseReviewerRole(firstString(input.role)),
    page: parsePage(firstString(input.page)),
    pageSize: parsePageSize(firstString(input.pageSize)),
    expanded: parseOptionalSearch(firstString(input.expanded)),
  };
}

export function serializeActionNeededListParams(
  params: ActionNeededListParams
): string {
  const parts: string[] = [];

  if (params.role !== "all") {
    appendParam(parts, "role", params.role);
  }
  if (params.page !== DEFAULT_PAGE) {
    appendParam(parts, "page", params.page);
  }
  if (params.pageSize !== DEFAULT_PAGE_SIZE) {
    appendParam(parts, "pageSize", params.pageSize);
  }
  appendParam(parts, "expanded", params.expanded);

  return parts.join("&");
}
