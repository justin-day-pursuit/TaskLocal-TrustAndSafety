"use server";

import { generateTrendReport } from "@/lib/trends/generate";
import type { GenerateTrendsResult } from "@/lib/trends/types";

export async function generateAnalysisReportAction(): Promise<GenerateTrendsResult> {
  return generateTrendReport();
}
