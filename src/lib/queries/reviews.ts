import { createServerClient } from "@/lib/supabase/server";
import type { Review } from "@/lib/types/database";

export interface ReviewStats {
  total: number;
  flagged: number;
  unhandled: number;
}

export async function getFlaggedReviews(): Promise<{
  data: Review[] | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("Review")
      .select("*")
      .eq("flag", true)
      .order("createdAt", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Review[], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load flagged reviews";
    return { data: null, error: message };
  }
}

export async function getReviewStats(): Promise<{
  data: ReviewStats | null;
  error: string | null;
}> {
  try {
    const supabase = createServerClient();
    const [totalResult, flaggedResult, unhandledResult] = await Promise.all([
      supabase.from("Review").select("*", { count: "exact", head: true }),
      supabase
        .from("Review")
        .select("*", { count: "exact", head: true })
        .eq("flag", true),
      supabase
        .from("Review")
        .select("*", { count: "exact", head: true })
        .eq("flag", true)
        .eq("handled", false),
    ]);

    const error =
      totalResult.error?.message ??
      flaggedResult.error?.message ??
      unhandledResult.error?.message ??
      null;

    if (error) {
      return { data: null, error };
    }

    const stats: ReviewStats = {
      total: totalResult.count ?? 0,
      flagged: flaggedResult.count ?? 0,
      unhandled: unhandledResult.count ?? 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load review stats";
    return { data: null, error: message };
  }
}
