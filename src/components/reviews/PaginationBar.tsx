"use client";

import Link from "next/link";

import {
  PAGE_SIZE_OPTIONS,
  type PageSize,
} from "@/lib/reviews/search-params";
import type { PaginationDisplay } from "@/lib/reviews/pagination";

interface PaginationBarProps {
  page: number;
  pageSize: PageSize;
  display: PaginationDisplay;
  prevHref?: string;
  nextHref?: string;
  resetHref?: string;
  pageSizeHrefs: Record<PageSize, string>;
  showPageReset?: boolean;
}

export function PaginationBar({
  page,
  pageSize,
  display,
  prevHref,
  nextHref,
  resetHref,
  pageSizeHrefs,
  showPageReset = false,
}: PaginationBarProps) {
  const totalPages =
    display.total > 0 ? Math.ceil(display.total / pageSize) : 1;

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-600">
        {display.total === 0 ? (
          "Showing 0 of 0"
        ) : (
          <>
            Showing{" "}
            <span className="font-medium text-zinc-900">
              {display.from}–{display.to}
            </span>{" "}
            of{" "}
            <span className="font-medium text-zinc-900">{display.total}</span>
          </>
        )}
        {showPageReset && resetHref ? (
          <>
            {" "}
            —{" "}
            <Link
              href={resetHref}
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Reset to page 1
            </Link>
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Rows per page
          <select
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            value={pageSize}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10) as PageSize;
              window.location.href = pageSizeHrefs[next];
            }}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <nav className="inline-flex items-center gap-1" aria-label="Pagination">
          {prevHref ? (
            <Link
              href={prevHref}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400">
              Previous
            </span>
          )}
          <span className="px-2 text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          {nextHref ? (
            <Link
              href={nextHref}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400">
              Next
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}
