import {
  KEYWORD_THEME_CATEGORIES,
  type GeminiFlagReasonTheme,
  type GeminiInsights,
  type GeminiKeywordTheme,
  type KeywordThemeCategory,
} from "@/lib/trends/types";

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
    flagReasonThemes: [],
    changeSinceLast: {
      hasPrevious: false,
      newReviewCount: 0,
      whatChanged: [],
      emergingTrends: [],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseKeywordThemeCategory(
  value: unknown
): KeywordThemeCategory | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return KEYWORD_THEME_CATEGORIES.find((category) => category === value);
}

export function parseKeywordThemes(value: unknown): GeminiKeywordTheme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((theme) => isRecord(theme))
    .map((theme) => {
      const category = parseKeywordThemeCategory(theme.category);
      const parsed: GeminiKeywordTheme = {
        term: String(theme.term ?? ""),
        meaning: String(theme.meaning ?? ""),
      };
      if (category) {
        parsed.category = category;
      }
      return parsed;
    });
}

export function parseFlagReasonThemes(value: unknown): GeminiFlagReasonTheme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((theme) => isRecord(theme))
    .map((theme) => ({
      theme: String(theme.theme ?? ""),
      meaning: String(theme.meaning ?? ""),
      examples: Array.isArray(theme.examples)
        ? theme.examples.map(String).filter((example) => example.length > 0)
        : [],
    }))
    .filter((theme) => theme.theme.length > 0 || theme.meaning.length > 0);
}

export function normalizeGeminiInsights(insights: GeminiInsights): GeminiInsights {
  return {
    ...insights,
    keywordThemes: parseKeywordThemes(insights.keywordThemes),
    flagReasonThemes: parseFlagReasonThemes(
      (insights as { flagReasonThemes?: unknown }).flagReasonThemes
    ),
  };
}

export function isGeminiInsights(value: unknown): value is GeminiInsights {
  if (!isRecord(value)) {
    return false;
  }

  const flagReasonThemes = value.flagReasonThemes;

  return (
    Array.isArray(value.goingWell) &&
    Array.isArray(value.needsWork) &&
    Array.isArray(value.actionPlan) &&
    typeof value.flagTrendsExplanation === "string" &&
    typeof value.flagTrendsConclusions === "string" &&
    typeof value.sentimentExplanation === "string" &&
    typeof value.sentimentConclusions === "string" &&
    typeof value.sentimentOverallLabel === "string" &&
    typeof value.keywordsExplanation === "string" &&
    Array.isArray(value.keywordThemes) &&
    (flagReasonThemes === undefined || Array.isArray(flagReasonThemes)) &&
    isRecord(value.changeSinceLast)
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

  const change = parsed.changeSinceLast;

  return normalizeGeminiInsights({
    goingWell: parsed.goingWell.map(String),
    needsWork: parsed.needsWork.map(String),
    actionPlan: parsed.actionPlan.map(String),
    flagTrendsExplanation: parsed.flagTrendsExplanation,
    flagTrendsConclusions: parsed.flagTrendsConclusions,
    sentimentExplanation: parsed.sentimentExplanation,
    sentimentConclusions: parsed.sentimentConclusions,
    sentimentOverallLabel: parsed.sentimentOverallLabel,
    keywordsExplanation: parsed.keywordsExplanation,
    keywordThemes: parsed.keywordThemes,
    flagReasonThemes: parseFlagReasonThemes(
      (parsed as { flagReasonThemes?: unknown }).flagReasonThemes
    ),
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
  });
}

export function groundChangeSinceLast(
  insights: GeminiInsights,
  hasPrevious: boolean,
  newReviewCount: number
): GeminiInsights {
  return {
    ...insights,
    changeSinceLast: {
      ...insights.changeSinceLast,
      hasPrevious,
      newReviewCount,
    },
  };
}
