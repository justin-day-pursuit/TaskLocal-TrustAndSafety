import { computeTrendAggregates } from "@/lib/trends/aggregates";
import { buildWatermark, splitNewVsPrior } from "@/lib/trends/delta";
import { getGeminiApiKey } from "@/lib/trends/env";
import { analyzeWithGemini } from "@/lib/trends/gemini";
import { emptyInsights } from "@/lib/trends/insights";
import { loadLastTrendReport, saveTrendReport } from "@/lib/trends/persist";
import { fetchStrippedReviews } from "@/lib/trends/query";
import type { GenerateTrendsResult, StrippedReview, TrendReport } from "@/lib/trends/types";

const GROUNDING_SAMPLE_SIZE = 40;

function mostRecentRows(rows: StrippedReview[], limit: number): StrippedReview[] {
  if (rows.length <= limit) {
    return rows;
  }
  return rows.slice(rows.length - limit);
}

export async function generateTrendReport(): Promise<GenerateTrendsResult> {
  const keyResult = getGeminiApiKey();
  if (keyResult.error || !keyResult.key) {
    return { data: null, error: keyResult.error };
  }

  const fetched = await fetchStrippedReviews();
  if (fetched.error || !fetched.data) {
    return { data: null, error: fetched.error ?? "Failed to load reviews." };
  }

  const rows = fetched.data;
  const previous = await loadLastTrendReport();
  const { newRows } = splitNewVsPrior(rows, previous?.watermark ?? null);
  const aggregates = computeTrendAggregates(rows);
  const watermark = buildWatermark(rows);

  let insights = emptyInsights();
  let modelUsed = "none (no reviews)";

  if (rows.length > 0) {
    const gemini = await analyzeWithGemini({
      apiKey: keyResult.key,
      rows,
      aggregates,
      newRows,
      previous,
    });

    if (gemini.error || !gemini.insights) {
      return { data: null, error: gemini.error };
    }

    insights = gemini.insights;
    modelUsed = gemini.modelUsed;
  }

  const report: TrendReport = {
    generatedAt: new Date().toISOString(),
    modelUsed,
    watermark,
    aggregates,
    insights,
    groundingSample: mostRecentRows(rows, GROUNDING_SAMPLE_SIZE),
    priorSummary: previous
      ? {
          goingWell: previous.insights.goingWell,
          needsWork: previous.insights.needsWork,
          actionPlan: previous.insights.actionPlan,
        }
      : null,
  };

  const saved = await saveTrendReport(report);
  if (saved.error) {
    return { data: null, error: saved.error };
  }

  return { data: report, error: null };
}
