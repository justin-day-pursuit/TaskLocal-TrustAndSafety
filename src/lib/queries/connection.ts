import { createServerClient } from "@/lib/supabase/server";
import { queryFail, type QueryFailureKind } from "@/lib/queries/query-status";

export async function testConnection(): Promise<{
  connected: boolean;
  error?: string;
  failureKind?: QueryFailureKind;
}> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("Review").select("id").limit(1);

    if (error) {
      const failure = queryFail(error.message, "Unknown connection error");
      return {
        connected: false,
        error: failure.error,
        failureKind: failure.failureKind,
      };
    }

    return { connected: true };
  } catch (error) {
    const failure = queryFail(error, "Unknown connection error");
    return {
      connected: false,
      error: failure.error,
      failureKind: failure.failureKind,
    };
  }
}
