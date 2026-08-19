import { DataTable } from "@/components/ui/DataTable";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getFlaggedReviews } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";

export default async function FlaggedPage() {
  const { data, error } = await getFlaggedReviews();

  const rows =
    data?.map((review) => [
      review.id,
      review.bookingId,
      review.reviewerRole,
      review.rating,
      review.reason || "—",
      review.handled ? "Yes" : "No",
    ]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">
          Flagged Reviews
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Reviews flagged for trust and safety issues, newest first.
        </p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {!error ? (
        <DataTable
          columns={[
            "Review ID",
            "Booking ID",
            "Reviewer",
            "Rating",
            "Reason",
            "Handled",
          ]}
          rows={rows}
          emptyMessage="No flagged reviews found."
        />
      ) : null}
    </div>
  );
}
