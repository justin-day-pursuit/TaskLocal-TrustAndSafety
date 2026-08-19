import { createServerClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types/database";

export async function getBookingsByIds(bookingIds: string[]): Promise<{
  data: Booking[] | null;
  error: string | null;
}> {
  if (bookingIds.length === 0) {
    return { data: [], error: null };
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Booking")
      .select("*")
      .in("id", bookingIds);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Booking[], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load bookings";
    return { data: null, error: message };
  }
}
