import { createServerClient } from "@/lib/supabase/server";

export async function testConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from("Review").select("id").limit(1);

    if (error) {
      return { connected: false, error: error.message };
    }

    return { connected: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown connection error";
    return { connected: false, error: message };
  }
}
