import type { GeminiInsights } from "@/lib/trends/types";

export function emptyInsights(message?: string): GeminiInsights {
  const detail =
    message ??
    "There are no reviews in the dataset yet. Generate again after reviews exist.";

  return {
    goingWell: [],
    needsWork: [detail],
    actionPlan: [
      "Collect completed-booking reviews before relying on trend analysis.",
    ],
    flagTrendsExplanation: detail,
    flagTrendsConclusions: "No flag trend can be concluded from an empty set.",
    sentimentExplanation: detail,
    sentimentConclusions: "No sentiment trend can be concluded from an empty set.",
    sentimentOverallLabel: "insufficient data",
    keywordsExplanation: detail,
    keywordThemes: [],
    changeSinceLast: {
      hasPrevious: false,
      newReviewCount: 0,
      whatChanged: [],
      emergingTrends: [],
    },
  };
}

export function isGeminiInsights(value: unknown): value is GeminiInsights {
  if (!value || typeof value !== "object") {
    return false;
  }

  const insights = value as Partial<GeminiInsights>;
  return (
    Array.isArray(insights.goingWell) &&
    Array.isArray(insights.needsWork) &&
    Array.isArray(insights.actionPlan) &&
    typeof insights.flagTrendsExplanation === "string" &&
    typeof insights.flagTrendsConclusions === "string" &&
    typeof insights.sentimentExplanation === "string" &&
    typeof insights.sentimentConclusions === "string" &&
    typeof insights.sentimentOverallLabel === "string" &&
    typeof insights.keywordsExplanation === "string" &&
    Array.isArray(insights.keywordThemes) &&
    typeof insights.changeSinceLast === "object" &&
    insights.changeSinceLast !== null
  );
}

export function parseGeminiInsightsText(text: string): GeminiInsights {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(trimmed);
  if (!isGeminiInsights(parsed)) {
    throw new Error("Gemini returned JSON that did not match the insights schema.");
  }

  const change = parsed.changeSinceLast as GeminiInsights["changeSinceLast"];

  return {
    goingWell: parsed.goingWell.map(String),
    needsWork: parsed.needsWork.map(String),
    actionPlan: parsed.actionPlan.map(String),
    flagTrendsExplanation: parsed.flagTrendsExplanation,
    flagTrendsConclusions: parsed.flagTrendsConclusions,
    sentimentExplanation: parsed.sentimentExplanation,
    sentimentConclusions: parsed.sentimentConclusions,
    sentimentOverallLabel: parsed.sentimentOverallLabel,
    keywordsExplanation: parsed.keywordsExplanation,
    keywordThemes: parsed.keywordThemes.map((theme) => ({
      term: String(theme.term ?? ""),
      meaning: String(theme.meaning ?? ""),
    })),
    changeSinceLast: {
      hasPrevious: Boolean(change.hasPrevious),
      newReviewCount: Number(change.newReviewCount) || 0,
      whatChanged: Array.isArray(change.whatChanged)
        ? change.whatChanged.map(String)
        : [],
      emergingTrends: Array.isArray(change.emergingTrends)
        ? change.emergingTrends.map(String)
        : [],
    },
  };
}
