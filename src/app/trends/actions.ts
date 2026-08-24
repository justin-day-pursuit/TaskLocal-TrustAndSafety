"use server";

import { generateTrendReport } from "@/lib/trends/generate";
import type { GenerateTrendsResult } from "@/lib/trends/types";

export async function generateTrendsReportAction(): Promise<GenerateTrendsResult> {
  return generateTrendReport();
}
