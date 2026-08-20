"use client";

import Link from "next/link";

import { RepeatFlagBadge } from "@/components/flagged/RepeatFlagBadge";
import { ResolveButton } from "@/components/flagged/ResolveButton";
import {
  ExpandableReviewRow,
  ReviewRowExpandProvider,
} from "@/components/reviews/ExpandableReviewRow";
import { ReviewExpandPanel } from "@/components/reviews/ReviewExpandPanel";
import type { RepeatFlagCounts } from "@/lib/queries/reviews";
import { indexBookingsById } from "@/lib/reviews/bookings-by-id";
import type { ActionNeededListParams } from "@/lib/reviews/search-params";
import type { Booking, Review } from "@/lib/types/database";

interface FlaggedQueueTableProps {
  reviews: Review[];
  bookings: Booking[];
  bookingsError?: string | null;
  repeatFlagCounts: RepeatFlagCounts;
  listParams: ActionNeededListParams;
  expandedReviewId?: string;
  emptyMessage?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SUMMARY_COL_SPAN = 8;

export function FlaggedQueueTable({
  reviews,
  bookings,
  bookingsError,
  repeatFlagCounts,
  listParams,
  expandedReviewId,
  emptyMessage = "No flagged reviews found.",
}: FlaggedQueueTableProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  const bookingsById = indexBookingsById(bookings);

  return (
    <ReviewRowExpandProvider
      listPath="/action-needed"
      listParams={listParams}
      initialExpandedId={expandedReviewId}
    >
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="Expand row">
                <span className="sr-only">Expand</span>
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Review
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Booking
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Reviewer
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Rating
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Reason
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Flagged
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Open flags
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.map((review) => (
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
                    <td className="px-4 py-3">
                      <Link
                        href={`/action-needed/${review.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                      >
                        {review.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{review.bookingId}</td>
                    <td className="px-4 py-3 capitalize text-zinc-800">
                      {review.reviewerRole}
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{review.rating}</td>
                    <td className="px-4 py-3 text-zinc-800">
                      {review.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(review.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <RepeatFlagBadge count={repeatFlagCounts[review.id] ?? 0} />
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <ResolveButton reviewId={review.id} />
                    </td>
                  </>
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </ReviewRowExpandProvider>
  );
}
