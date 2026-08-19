import { createServerClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types/database";

export async function getListingById(id: string): Promise<{
  data: Listing | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Listing")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Listing | null, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load listing";
    return { data: null, error: message };
  }
}

export async function getListingsByIds(listingIds: string[]): Promise<{
  data: Listing[] | null;
  error: string | null;
}> {
  if (listingIds.length === 0) {
    return { data: [], error: null };
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Listing")
      .select("*")
      .in("id", listingIds);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Listing[], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load listings";
    return { data: null, error: message };
  }
}
