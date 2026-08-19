import { FlaggedQueueTable } from "@/components/flagged/FlaggedQueueTable";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getBookingsByIds } from "@/lib/queries/bookings";
import {
  computeRepeatFlagCounts,
  getFlaggedReviews,
} from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";

export default async function FlaggedPage() {
  const { data, error } = await getFlaggedReviews();

  let repeatFlagCounts = {};
  let bookingsError: string | null = null;

  if (data && data.length > 0) {
    const bookingIds = [...new Set(data.map((review) => review.bookingId))];
    const bookingsResult = await getBookingsByIds(bookingIds);
    bookingsError = bookingsResult.error;

    if (bookingsResult.data) {
      repeatFlagCounts = computeRepeatFlagCounts(data, bookingsResult.data);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">
          Flagged Reviews
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Open flagged reviews, oldest first. Higher open-flag counts indicate
          repeat issues against the same party.
        </p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {!error && bookingsError ? <ErrorBanner message={bookingsError} /> : null}

      {!error && !bookingsError ? (
        <FlaggedQueueTable
          reviews={data ?? []}
          repeatFlagCounts={repeatFlagCounts}
          emptyMessage="No flagged reviews found."
        />
      ) : null}
    </div>
  );
}
