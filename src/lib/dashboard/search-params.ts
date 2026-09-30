import { REVIEWER_ROLES } from "@/lib/constants/enums";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/lib/reviews/search-params";
import type { ReviewerRole } from "@/lib/types/database";

/** PRD §9 dashboard URL contract — typed state with documented defaults. */

export const DASHBOARD_VIEWS = ["today", "unhandled", "highRisk"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export interface DashboardParams {
  view?: DashboardView;
  q?: string;
  role: ReviewerRole | "all";
  page: number;
  pageSize: PageSize;
  expanded?: string;
}

const FILTER_KEYS: (keyof DashboardParams)[] = ["view", "q", "role"];

function firstString(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw === null ? undefined : String(raw);
}

function parseOptionalSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function parseView(raw: string | undefined): DashboardView | undefined {
  if (raw && (DASHBOARD_VIEWS as readonly string[]).includes(raw)) {
    return raw as DashboardView;
  }
  return undefined;
}

function parseReviewerRole(raw: string | undefined): ReviewerRole | "all" {
  if (raw && (REVIEWER_ROLES as readonly string[]).includes(raw)) {
    return raw as ReviewerRole;
  }
  return "all";
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
    return size as PageSize;
  }
  return DEFAULT_PAGE_SIZE;
}

export function parseDashboardParams(
  input: Record<string, string | string[] | undefined>
): DashboardParams {
  return {
    view: parseView(firstString(input.view)),
    q: parseOptionalSearch(firstString(input.q)),
    role: parseReviewerRole(firstString(input.role)),
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

export function serializeDashboardParams(params: DashboardParams): string {
  const parts: string[] = [];

  appendParam(parts, "view", params.view);
  appendParam(parts, "q", params.q);

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

export function dashboardHref(params: DashboardParams): string {
  const qs = serializeDashboardParams(params);
  return qs ? `/?${qs}` : "/";
}

export function mergeDashboardParams(
  current: DashboardParams,
  updates: Partial<DashboardParams>
): DashboardParams {
  const next: DashboardParams = { ...current, ...updates };

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

export { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };
