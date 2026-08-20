import type { Booking, Review } from "@/lib/types/database";
import type { ReviewSortField, SortDirection } from "@/lib/reviews/search-params";

export interface OrderedBookingRef {
  id: string;
  booking: Booking | null;
}

function compareNullableStrings(
  a: string | null,
  b: string | null,
  dir: SortDirection
): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }

  const result = a.localeCompare(b);
  return dir === "asc" ? result : -result;
}

function compareNumbers(a: number, b: number, dir: SortDirection): number {
  const result = a - b;
  return dir === "asc" ? result : -result;
}

export function getBookingSortValue(
  booking: Booking | null,
  sort: ReviewSortField
): string | number | null {
  if (!booking) {
    return null;
  }

  switch (sort) {
    case "priceAtBooking":
      return booking.priceAtBooking;
    case "requestedAt":
      return booking.requestedAt;
    case "serviceDate":
      return booking.serviceDate;
    default:
      return null;
  }
}

export function compareReviewsByBookingField(
  a: Review,
  b: Review,
  bookingById: Map<string, Booking>,
  sort: ReviewSortField,
  dir: SortDirection
): number {
  const bookingA = bookingById.get(a.bookingId) ?? null;
  const bookingB = bookingById.get(b.bookingId) ?? null;
  const valueA = getBookingSortValue(bookingA, sort);
  const valueB = getBookingSortValue(bookingB, sort);

  if (valueA === null && valueB === null) {
    return a.id.localeCompare(b.id);
  }
  if (valueA === null) {
    return 1;
  }
  if (valueB === null) {
    return -1;
  }

  if (typeof valueA === "number" && typeof valueB === "number") {
    const byValue = compareNumbers(valueA, valueB, dir);
    return byValue !== 0 ? byValue : a.id.localeCompare(b.id);
  }

  const byValue = compareNullableStrings(
    String(valueA),
    String(valueB),
    dir
  );
  return byValue !== 0 ? byValue : a.id.localeCompare(b.id);
}

/**
 * Sort reviews to match booking-id order from a booking-first query.
 * Reviews whose booking is missing sort last (stable by review id).
 */
export function sortReviewsByBookingIdOrder(
  reviews: Review[],
  orderedBookingIds: string[],
  bookingById: Map<string, Booking>
): Review[] {
  const rank = new Map(orderedBookingIds.map((id, index) => [id, index]));

  return [...reviews].sort((a, b) => {
    const rankA = rank.get(a.bookingId);
    const rankB = rank.get(b.bookingId);
    const hasA = rankA !== undefined && bookingById.has(a.bookingId);
    const hasB = rankB !== undefined && bookingById.has(b.bookingId);

    if (!hasA && !hasB) {
      return a.id.localeCompare(b.id);
    }
    if (!hasA) {
      return 1;
    }
    if (!hasB) {
      return -1;
    }

    return (rankA as number) - (rankB as number) || a.id.localeCompare(b.id);
  });
}

export function sortReviewsByBookingField(
  reviews: Review[],
  bookingById: Map<string, Booking>,
  sort: ReviewSortField,
  dir: SortDirection
): Review[] {
  return [...reviews].sort((a, b) =>
    compareReviewsByBookingField(a, b, bookingById, sort, dir)
  );
}

export function collectUniqueBookingIds(reviews: Review[]): string[] {
  return [...new Set(reviews.map((review) => review.bookingId))];
}

export function filterReviewsByBookingIds(
  reviews: Review[],
  bookingIds: Set<string>
): Review[] {
  return reviews.filter((review) => bookingIds.has(review.bookingId));
}

export function intersectBookingIds(
  bookingIds: string[],
  allowedIds: Set<string>
): string[] {
  return bookingIds.filter((id) => allowedIds.has(id));
}
