"use client";

import Link from "next/link";

import {
  ExpandableReviewRow,
  ReviewRowExpandProvider,
} from "@/components/reviews/ExpandableReviewRow";
import { ReviewExpandPanel } from "@/components/reviews/ReviewExpandPanel";
import { indexBookingsById } from "@/lib/reviews/bookings-by-id";
import type { ReviewsCatalogParams } from "@/lib/reviews/search-params";
import type { Booking, Review } from "@/lib/types/database";

const COMMENT_MAX_LENGTH = 80;

interface ReviewsCatalogTableProps {
  reviews: Review[];
  bookings: Booking[];
  bookingsError?: string | null;
  listParams: ReviewsCatalogParams;
  expandedReviewId?: string;
  emptyMessage?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function truncateComment(comment: string): string {
  if (comment.length <= COMMENT_MAX_LENGTH) {
    return comment || "—";
  }
  return `${comment.slice(0, COMMENT_MAX_LENGTH)}…`;
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

const SUMMARY_COL_SPAN = 9;

export function ReviewsCatalogTable({
  reviews,
  bookings,
  bookingsError,
  listParams,
  expandedReviewId,
  emptyMessage = "No reviews match your filters.",
}: ReviewsCatalogTableProps) {
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
      listPath="/reviews"
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
              <th className="px-4 py-3 text-left font-medium text-zinc-600">ID</th>
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
                Comment
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Flag
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Reason
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Handled
              </th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {reviews.map((review) => {
              const needsAction = review.flag && !review.handled;

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
                      variant="reviews"
                    />
                  }
                  summaryCells={
                    <>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-800">
                        {review.id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-800">
                        {review.bookingId}
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-800">
                        {review.reviewerRole}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">{review.rating}</td>
                      <td
                        className="max-w-xs px-4 py-3 text-zinc-700"
                        title={review.comment || undefined}
                      >
                        {truncateComment(review.comment)}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {needsAction ? (
                          <Link
                            href="/action-needed"
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium text-amber-800 underline-offset-2 hover:underline"
                          >
                            Yes
                          </Link>
                        ) : (
                          formatBoolean(review.flag)
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {review.reason || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-800">
                        {formatBoolean(review.handled)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                        {formatDate(review.createdAt)}
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
