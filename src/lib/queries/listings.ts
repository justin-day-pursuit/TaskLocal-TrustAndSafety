import { queryFail, queryOk, type QueryFailureKind } from "@/lib/queries/query-status";
import { createServerClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types/database";

export async function getListingById(id: string): Promise<{
  data: Listing | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Listing")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return queryFail(error, "Failed to load listing");
    }

    return queryOk((data as Listing | null) ?? null);
  } catch (error) {
    return queryFail(error, "Failed to load listing");
  }
}

export async function getListingsByIds(listingIds: string[]): Promise<{
  data: Listing[] | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
}> {
  if (listingIds.length === 0) {
    return queryOk([]);
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Listing")
      .select("*")
      .in("id", listingIds);

    if (error) {
      return queryFail(error, "Failed to load listings");
    }

    return queryOk(data as Listing[]);
  } catch (error) {
    return queryFail(error, "Failed to load listings");
  }
}
