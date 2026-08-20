import Link from "next/link";
import { notFound } from "next/navigation";

import { RepeatFlagBadge } from "@/components/flagged/RepeatFlagBadge";
import { ResolveButton } from "@/components/flagged/ResolveButton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  getRepeatFlagCountForReview,
  getReviewDetail,
} from "@/lib/queries/reviews";
import {
  buildActionNeededHref,
  parseActionNeededListParams,
} from "@/lib/reviews/search-params";

export const dynamic = "force-dynamic";

interface FlaggedDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

export default async function FlaggedDetailPage({
  params,
  searchParams,
}: FlaggedDetailPageProps) {
  const { id } = await params;
  const rawParams = await searchParams;
  const listParams = parseActionNeededListParams(rawParams);
  const queueHref = buildActionNeededHref({
    ...listParams,
    expanded: undefined,
  });
  const { data, error } = await getReviewDetail(id);

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink href={queueHref} />
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const { review, booking, listing } = data;
  const repeatFlagResult = await getRepeatFlagCountForReview(review.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BackLink href={queueHref} />
          <h2 className="mt-4 text-2xl font-semibold text-zinc-900">
            Review detail
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Flagged review with booking and listing context.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {repeatFlagResult.data !== null ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span>Open flags against party:</span>
              <RepeatFlagBadge count={repeatFlagResult.data} />
            </div>
          ) : null}
          {!review.handled ? (
            <ResolveButton
              reviewId={review.id}
              label="Resolve"
              redirectTo={queueHref}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
          ) : (
            <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
              Resolved
            </span>
          )}
        </div>
      </div>

      {repeatFlagResult.error ? (
        <ErrorBanner message={repeatFlagResult.error} />
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-medium text-zinc-900">Review</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Rating" value={review.rating} />
          <DetailField
            label="Reviewer role"
            value={<span className="capitalize">{review.reviewerRole}</span>}
          />
          <DetailField
            label="Created"
            value={formatDateTime(review.createdAt)}
          />
          <DetailField label="Reason" value={review.reason || "—"} />
          <DetailField
            label="Comment"
            value={
              review.comment ? (
                <span className="whitespace-pre-wrap">{review.comment}</span>
              ) : (
                "—"
              )
            }
          />
          <DetailField
            label="Status"
            value={review.handled ? "Resolved" : "Open"}
          />
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-medium text-zinc-900">Booking</h3>
        {booking ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Status" value={booking.status} />
            <DetailField label="Provider ID" value={booking.providerId} />
            <DetailField label="Customer ID" value={booking.customerId} />
            <DetailField label="Listing ID" value={booking.listingId} />
          </dl>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Booking record not found for this review.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-medium text-zinc-900">Listing</h3>
        {listing ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailField label="Title" value={listing.title} />
            <DetailField label="Category" value={listing.category} />
          </dl>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Listing record not found for this booking.
          </p>
        )}
      </section>
    </div>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
    >
      ← Back to queue
    </Link>
  );
}
