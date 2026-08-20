"use client";

import Link from "next/link";
import { useState } from "react";

import { ResolveButton } from "@/components/flagged/ResolveButton";
import type { Booking, Review } from "@/lib/types/database";

export type ReviewExpandPanelVariant = "action-needed" | "reviews";

interface ReviewExpandPanelProps {
  review: Review;
  booking: Booking | null;
  bookingsError?: string | null;
  variant: ReviewExpandPanelVariant;
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
      <dd className="mt-1 break-words text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatServiceDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ReviewExpandPanel({
  review,
  booking,
  bookingsError,
  variant,
}: ReviewExpandPanelProps) {
  const [bookingVisible, setBookingVisible] = useState(true);
  const needsAction = review.flag && !review.handled;

  return (
    <div className="space-y-4 bg-zinc-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Expanded details
        </p>
        <div
          className="flex flex-wrap items-center gap-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {variant === "action-needed" ? (
            <>
              <ResolveButton reviewId={review.id} />
              <Link
                href={`/action-needed/${review.id}`}
                className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Open full page
              </Link>
            </>
          ) : needsAction ? (
            <Link
              href="/action-needed"
              className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              View in action needed
            </Link>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby={`review-block-${review.id}`}
        className="rounded-lg border border-zinc-200 bg-white p-4"
      >
        <h4
          id={`review-block-${review.id}`}
          className="text-sm font-semibold text-zinc-900"
        >
          Review
        </h4>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="ID" value={review.id} />
          <DetailField label="Booking ID" value={review.bookingId} />
          <DetailField
            label="Reviewer role"
            value={<span className="capitalize">{review.reviewerRole}</span>}
          />
          <DetailField label="Rating" value={review.rating} />
          <DetailField label="Flag" value={formatBoolean(review.flag)} />
          <DetailField label="Handled" value={formatBoolean(review.handled)} />
          <DetailField label="Reason" value={review.reason || "—"} />
          <DetailField
            label="Created"
            value={formatDateTime(review.createdAt)}
          />
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
        </dl>
      </section>

      <section
        aria-labelledby={`booking-block-${review.id}`}
        className="rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h4
            id={`booking-block-${review.id}`}
            className="text-sm font-semibold text-zinc-900"
          >
            Booking
          </h4>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setBookingVisible((visible) => !visible);
            }}
            aria-expanded={bookingVisible}
            aria-controls={`booking-fields-${review.id}`}
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            {bookingVisible ? "Hide booking" : "Show booking"}
          </button>
        </div>

        {bookingVisible ? (
          booking ? (
            <dl
              id={`booking-fields-${review.id}`}
              className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <DetailField label="ID" value={booking.id} />
              <DetailField label="Status" value={booking.status} />
              <DetailField label="Provider ID" value={booking.providerId} />
              <DetailField label="Customer ID" value={booking.customerId} />
              <DetailField label="Listing ID" value={booking.listingId} />
              <DetailField
                label="Price at booking"
                value={booking.priceAtBooking}
              />
              <DetailField
                label="Requested"
                value={formatDateTime(booking.requestedAt)}
              />
              <DetailField
                label="Service date"
                value={formatServiceDate(booking.serviceDate)}
              />
            </dl>
          ) : (
            <p
              id={`booking-fields-${review.id}`}
              className="mt-3 text-sm text-amber-800"
              role="status"
            >
              {bookingsError ??
                "Booking record not found for this review."}
            </p>
          )
        ) : null}
      </section>
    </div>
  );
}
