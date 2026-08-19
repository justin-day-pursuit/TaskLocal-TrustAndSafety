import Link from "next/link";

import { RepeatFlagBadge } from "@/components/flagged/RepeatFlagBadge";
import type { RepeatFlagCounts } from "@/lib/queries/reviews";
import type { Review } from "@/lib/types/database";

interface FlaggedQueueTableProps {
  reviews: Review[];
  repeatFlagCounts: RepeatFlagCounts;
  emptyMessage?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FlaggedQueueTable({
  reviews,
  repeatFlagCounts,
  emptyMessage = "No flagged reviews found.",
}: FlaggedQueueTableProps) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {reviews.map((review) => (
            <tr key={review.id} className="hover:bg-zinc-50">
              <td className="px-4 py-3">
                <Link
                  href={`/flagged/${review.id}`}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
