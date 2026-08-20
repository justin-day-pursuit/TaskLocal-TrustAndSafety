import type { Booking } from "@/lib/types/database";

export function indexBookingsById(bookings: Booking[]): Map<string, Booking> {
  return new Map(bookings.map((booking) => [booking.id, booking]));
}
