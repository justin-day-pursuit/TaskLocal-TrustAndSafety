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
    const { data, error } = await supabase.from("Review").select("flag, handled");

    if (error) {
      return { data: null, error: error.message };
    }

    const reviews = data ?? [];
    const stats: ReviewStats = {
      total: reviews.length,
      flagged: reviews.filter((review) => review.flag).length,
      unhandled: reviews.filter((review) => review.flag && !review.handled).length,
    };

    return { data: stats, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load review stats";
    return { data: null, error: message };
  }
}
