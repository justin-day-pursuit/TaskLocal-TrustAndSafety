"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { BOOKING_STATUSES, REVIEWER_ROLES } from "@/lib/constants/enums";
import {
  CREATED_WITHIN_OPTIONS,
  DEFAULT_DIR,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  SORT_FIELDS,
  mergeReviewsCatalogParams,
  reviewsHref,
  type ReviewsCatalogParams,
  type ReviewSortField,
  type SortDirection,
} from "@/lib/reviews/search-params";

interface ReviewsCatalogControlsProps {
  params: ReviewsCatalogParams;
}

function navigate(
  router: ReturnType<typeof useRouter>,
  current: ReviewsCatalogParams,
  next: ReviewsCatalogParams
) {
  const href = reviewsHref(next);
  const currentHref = reviewsHref(current);
  if (href === currentHref) {
    router.refresh();
  } else {
    router.push(href);
  }
}

const SORT_LABELS: Record<ReviewSortField, string> = {
  rating: "Rating",
  createdAt: "Created",
  priceAtBooking: "Price at booking",
  requestedAt: "Requested",
  serviceDate: "Service date",
};

const CREATED_WITHIN_LABELS: Record<
  (typeof CREATED_WITHIN_OPTIONS)[number],
  string
> = {
  all: "All time",
  today: "Today (UTC)",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 365 days",
};

const BOOKING_STATUS_LABELS: Record<(typeof BOOKING_STATUSES)[number], string> =
  {
    requested: "Requested",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  };

function CatalogSearchForm({
  inputName,
  label,
  placeholder,
  submitLabel,
  initialValue,
  onSearch,
}: {
  inputName: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  initialValue: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <label className="block text-xs font-medium text-zinc-600" htmlFor={inputName}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputName}
          type="search"
          name={inputName}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function ReviewsCatalogControls({ params }: ReviewsCatalogControlsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function pushUpdates(updates: Partial<ReviewsCatalogParams>) {
    const next = mergeReviewsCatalogParams(params, updates);
    startTransition(() => {
      navigate(router, params, next);
    });
  }

  function handleReviewSearch(trimmed: string) {
    pushUpdates({ qReview: trimmed || undefined });
  }

  function handleBookingSearch(trimmed: string) {
    pushUpdates({ qBooking: trimmed || undefined });
  }

  function clearFilters() {
    navigate(router, params, {
      reviewerRole: "all",
      flag: "all",
      handled: "all",
      bookingStatus: "all",
      sort: DEFAULT_SORT,
      dir: DEFAULT_DIR,
      createdWithin: "all",
      createdMonth: undefined,
      page: DEFAULT_PAGE,
      pageSize: params.pageSize,
    });
  }

  const handledAvailable = params.flag !== "false";
  const hasActiveFilters =
    Boolean(params.qReview) ||
    Boolean(params.qBooking) ||
    params.reviewerRole !== "all" ||
    params.flag !== "all" ||
    (handledAvailable && params.handled !== "all") ||
    params.bookingStatus !== "all" ||
    params.sort !== DEFAULT_SORT ||
    params.dir !== DEFAULT_DIR ||
    params.createdWithin !== "all" ||
    params.createdMonth !== undefined;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">Search & filters</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            All controls combine with AND. Changing a filter resets to page 1.
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CatalogSearchForm
          key={`qReview:${params.qReview ?? ""}`}
          inputName="qReview"
          label="Review IDs"
          placeholder="Review or booking id"
          submitLabel="Search reviews"
          initialValue={params.qReview ?? ""}
          onSearch={handleReviewSearch}
        />

        <CatalogSearchForm
          key={`qBooking:${params.qBooking ?? ""}`}
          inputName="qBooking"
          label="Booking IDs"
          placeholder="Booking, listing, customer, or provider id"
          submitLabel="Search bookings"
          initialValue={params.qBooking ?? ""}
          onSearch={handleBookingSearch}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-zinc-600">
          Reviewer role
          <select
            value={params.reviewerRole}
            onChange={(event) =>
              pushUpdates({
                reviewerRole: event.target.value as ReviewsCatalogParams["reviewerRole"],
              })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="all">All</option>
            {REVIEWER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Flag
          <select
            value={params.flag}
            onChange={(event) =>
              pushUpdates({
                flag: event.target.value as ReviewsCatalogParams["flag"],
              })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="true">Flagged</option>
            <option value="false">Not flagged</option>
          </select>
        </label>

        {handledAvailable ? (
          <label className="block text-xs font-medium text-zinc-600">
            Handled
            <select
              value={params.handled}
              onChange={(event) =>
                pushUpdates({
                  handled: event.target.value as ReviewsCatalogParams["handled"],
                })
              }
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="true">Handled</option>
              <option value="false">Unhandled</option>
            </select>
          </label>
        ) : null}

        <label className="block text-xs font-medium text-zinc-600">
          Booking status
          <select
            value={params.bookingStatus}
            onChange={(event) =>
              pushUpdates({
                bookingStatus:
                  event.target.value as ReviewsCatalogParams["bookingStatus"],
              })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="all">All</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-zinc-600">
          Sort by
          <select
            value={params.sort}
            onChange={(event) =>
              pushUpdates({ sort: event.target.value as ReviewSortField })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            {SORT_FIELDS.map((field) => (
              <option key={field} value={field}>
                {SORT_LABELS[field]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Direction
          <select
            value={params.dir}
            onChange={(event) =>
              pushUpdates({ dir: event.target.value as SortDirection })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Created within
          <select
            value={params.createdWithin}
            onChange={(event) =>
              pushUpdates({
                createdWithin:
                  event.target.value as ReviewsCatalogParams["createdWithin"],
              })
            }
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            {CREATED_WITHIN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CREATED_WITHIN_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-zinc-600">
          Created month (UTC)
          <select
            value={params.createdMonth ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              pushUpdates({
                createdMonth: raw ? Number.parseInt(raw, 10) : undefined,
              });
            }}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="">Any month</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {new Date(Date.UTC(2000, month - 1, 1)).toLocaleString(
                    "en-US",
                    { month: "long", timeZone: "UTC" }
                  )}
                </option>
              )
            )}
          </select>
        </label>
      </div>
    </div>
  );
}

export { DEFAULT_PAGE_SIZE };
