"use client";

import Link from "next/link";

import { ResolveButton } from "@/components/flagged/ResolveButton";
import {
  ExpandableReviewRow,
  ReviewRowExpandProvider,
} from "@/components/reviews/ExpandableReviewRow";
import { ReviewExpandPanel } from "@/components/reviews/ReviewExpandPanel";
import { viewEmptyMessage, viewFilterLabel } from "@/lib/dashboard/view-labels";
import type { DashboardParams, DashboardView } from "@/lib/dashboard/search-params";
import { indexBookingsById } from "@/lib/reviews/bookings-by-id";
import type { Review } from "@/lib/types/database";

interface DashboardReportListProps {
  view: DashboardView;
  reviews: Review[];
  bookings: import("@/lib/types/database").Booking[];
  bookingsError?: string | null;
  params: DashboardParams;
  expandedReviewId?: string;
  highRiskConfigured: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function reportStatus(review: Review): string {
  if (!review.flag) {
    return "Not reported";
  }
  return review.handled ? "Resolved" : "Unhandled";
}

const SUMMARY_COL_SPAN = 7;

export function DashboardReportList({
  view,
  reviews,
  bookings,
  bookingsError,
  params,
  expandedReviewId,
  highRiskConfigured,
}: DashboardReportListProps) {
  const emptyMessage = viewEmptyMessage(view, {
    hasSearch: Boolean(params.q),
    highRiskConfigured,
  });

  if (reviews.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center"
        role="status"
      >
        <p className="text-base text-zinc-700">{emptyMessage}</p>
        {params.q ? (
          <Link
            href={`/?view=${view}`}
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            Clear search and reset filters
          </Link>
        ) : null}
      </div>
    );
  }

  const bookingsById = indexBookingsById(bookings);

  return (
    <ReviewRowExpandProvider
      listPath="/"
      listParams={params}
      initialExpandedId={expandedReviewId}
    >
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-base">
          <caption className="sr-only">
            {viewFilterLabel(view)} report list
          </caption>
          <thead className="bg-zinc-50">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand row">
                <span className="sr-only">Expand</span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Review
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Booking
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Reviewer
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Rating
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Report status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Reported
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.map((review) => {
              const needsResolve = review.flag && !review.handled;

              return (
                <ExpandableReviewRow
                  key={review.id}
                  reviewId={review.id}
                  colSpan={SUMMARY_COL_SPAN}
                  panel={
                    <ReviewExpandPanel
                      review={review}
                      booking={bookingsById.get(review.bookingId) ?? null}
                      bookingsError={bookingsError}
                      variant="action-needed"
                    />
                  }
                  summaryCells={
                    <>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {review.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-zinc-800">{review.bookingId}</td>
                      <td className="px-4 py-3 capitalize text-zinc-800">
                        {review.reviewerRole}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">{review.rating}</td>
                      <td className="px-4 py-3 text-zinc-800">
                        {review.reason || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {reportStatus(review)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDate(review.createdAt)}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {needsResolve ? (
                          <ResolveButton reviewId={review.id} />
                        ) : (
                          <span className="text-sm text-zinc-500">—</span>
                        )}
                      </td>
                    </>
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </ReviewRowExpandProvider>
  );
}
