import { FlaggedQueueTable } from "@/components/flagged/FlaggedQueueTable";
import {
  parseReviewerRoleFilter,
  reviewerRoleFromFilter,
  ReviewerRoleTabs,
} from "@/components/flagged/ReviewerRoleTabs";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getBookingsByIds } from "@/lib/queries/bookings";
import { getFlaggedReviews } from "@/lib/queries/reviews";
import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";

export const dynamic = "force-dynamic";

interface ActionNeededPageProps {
  searchParams: Promise<{ role?: string | string[] }>;
}

export default async function ActionNeededPage({
  searchParams,
}: ActionNeededPageProps) {
  const params = await searchParams;
  const roleFilter = parseReviewerRoleFilter(params.role);
  const reviewerRole = reviewerRoleFromFilter(roleFilter);

  const { data, error } = await getFlaggedReviews(reviewerRole);

  let bookingsResult: Awaited<ReturnType<typeof getBookingsByIds>> | null =
    null;

  if (data && data.length > 0) {
    const bookingIds = [...new Set(data.map((review) => review.bookingId))];
    bookingsResult = await getBookingsByIds(bookingIds);
  }

  const presentation = buildReviewListPresentation(data, error, bookingsResult);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Action needed
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            open flagged reviews waiting to be resolved, oldest first
          </p>
        </div>
        <ReviewerRoleTabs active={roleFilter} />
      </div>

      {presentation.primaryError ? (
        <ErrorBanner message={presentation.primaryError} />
      ) : null}
      {presentation.enrichmentError ? (
        <ErrorBanner message={presentation.enrichmentError} />
      ) : null}

      {presentation.showReviewList ? (
        <FlaggedQueueTable
          reviews={data ?? []}
          repeatFlagCounts={presentation.repeatFlagCounts}
          emptyMessage="No flagged reviews found."
        />
      ) : null}
    </div>
  );
}
