import { computeTrendAggregates } from "@/lib/trends/aggregates";
import { buildWatermark, splitNewVsPrior } from "@/lib/trends/delta";
import { getGeminiApiKey } from "@/lib/trends/env";
import { analyzeWithGemini } from "@/lib/trends/gemini";
import { emptyInsights, groundChangeSinceLast, groundHighRiskItems } from "@/lib/trends/insights";
import { loadLastTrendReport, saveTrendReport } from "@/lib/trends/persist";
import { fetchTrendReviewRows } from "@/lib/trends/query";
import type { GenerateTrendsResult, StrippedReview, TrendReport } from "@/lib/trends/types";
import {
  GEMINI_QUERY_TIMEOUT_MS,
  toQueryFailure,
  withTimeout,
} from "@/lib/queries/query-status";

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
    return {
      data: null,
      error: keyResult.error,
      failureKind: "error",
      persistWarning: null,
    };
  }
  const apiKey = keyResult.key;

  const fetched = await fetchTrendReviewRows();
  if (fetched.error || !fetched.data) {
    return {
      data: null,
      error: fetched.error ?? "Failed to load reviews.",
      failureKind: fetched.failureKind ?? "error",
      persistWarning: null,
    };
  }

  const trendRows = fetched.data;
  const rows = trendRows.map((row) => row.stripped);
  const previousResult = await loadLastTrendReport();
  if (previousResult.error) {
    return {
      data: null,
      error: previousResult.error,
      failureKind: previousResult.failureKind ?? "error",
      persistWarning: null,
    };
  }
  const previous = previousResult.data;
  const delta = splitNewVsPrior(rows, previous?.watermark ?? null);
  const aggregates = computeTrendAggregates(rows);
  const watermark = buildWatermark(rows);

  let insights = groundChangeSinceLast(
    emptyInsights(),
    delta.hasPrevious,
    delta.newRows.length
  );
  let modelUsed = "none (no reviews)";
  let highRiskCases = groundHighRiskItems([], new Map());

  if (rows.length > 0) {
    try {
      const newRowSet = new Set(delta.newRows);
      const gemini = await withTimeout(
        (signal) =>
          analyzeWithGemini({
            apiKey,
            rows: trendRows,
            aggregates,
            newRows: trendRows.filter((row) => newRowSet.has(row.stripped)),
            previous,
            hasPrevious: delta.hasPrevious,
            newReviewCount: delta.newRows.length,
            abortSignal: signal,
          }),
        GEMINI_QUERY_TIMEOUT_MS
      );

      if (gemini.error || !gemini.insights) {
        const failure = toQueryFailure(
          gemini.error ?? "Failed to generate the trend report.",
          "Failed to generate the trend report."
        );
        return {
          data: null,
          error: failure.error,
          failureKind: failure.failureKind,
          persistWarning: null,
        };
      }

      insights = groundChangeSinceLast(
        gemini.insights,
        delta.hasPrevious,
        delta.newRows.length
      );
      highRiskCases = groundHighRiskItems(
        insights.highRiskItems,
        gemini.sampleById
      );
      modelUsed = gemini.modelUsed;
    } catch (error) {
      const failure = toQueryFailure(
        error,
        "Failed to generate the trend report."
      );
      return {
        data: null,
        error: failure.error,
        failureKind: failure.failureKind,
        persistWarning: null,
      };
    }
  }

  const report: TrendReport = {
    generatedAt: new Date().toISOString(),
    modelUsed,
    watermark,
    aggregates,
    insights,
    highRiskCases,
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

  return {
    data: report,
    error: null,
    failureKind: null,
    persistWarning: saved.error,
  };
}
