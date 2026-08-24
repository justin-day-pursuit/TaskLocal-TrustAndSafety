import { GoogleGenAI, Type, type Schema } from "@google/genai";

import {
  getGeminiModelOverride,
  isRetryableGeminiError,
  resolveGeminiModels,
} from "@/lib/trends/env";
import { parseGeminiInsightsText } from "@/lib/trends/insights";
import type {
  GeminiInsights,
  StrippedReview,
  TrendAggregates,
  TrendReport,
} from "@/lib/trends/types";

const INSIGHTS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    goingWell: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    needsWork: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    actionPlan: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    flagTrendsExplanation: { type: Type.STRING },
    flagTrendsConclusions: { type: Type.STRING },
    sentimentExplanation: { type: Type.STRING },
    sentimentConclusions: { type: Type.STRING },
    sentimentOverallLabel: { type: Type.STRING },
    keywordsExplanation: { type: Type.STRING },
    keywordThemes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING },
          meaning: { type: Type.STRING },
        },
        required: ["term", "meaning"],
      },
    },
    changeSinceLast: {
      type: Type.OBJECT,
      properties: {
        hasPrevious: { type: Type.BOOLEAN },
        newReviewCount: { type: Type.INTEGER },
        whatChanged: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        emergingTrends: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "hasPrevious",
        "newReviewCount",
        "whatChanged",
        "emergingTrends",
      ],
    },
  },
  required: [
    "goingWell",
    "needsWork",
    "actionPlan",
    "flagTrendsExplanation",
    "flagTrendsConclusions",
    "sentimentExplanation",
    "sentimentConclusions",
    "sentimentOverallLabel",
    "keywordsExplanation",
    "keywordThemes",
    "changeSinceLast",
  ],
};

export interface AnalyzeWithGeminiInput {
  apiKey: string;
  rows: StrippedReview[];
  aggregates: TrendAggregates;
  newRows: StrippedReview[];
  previous: TrendReport | null;
}

function buildPrompt(input: AnalyzeWithGeminiInput): string {
  const previousSummary = input.previous
    ? {
        generatedAt: input.previous.generatedAt,
        modelUsed: input.previous.modelUsed,
        goingWell: input.previous.insights.goingWell,
        needsWork: input.previous.insights.needsWork,
        actionPlan: input.previous.insights.actionPlan,
        watermark: input.previous.watermark,
        previousAggregates: {
          totalReviews: input.previous.aggregates.totalReviews,
          flaggedCount: input.previous.aggregates.flaggedCount,
          flagRate: input.previous.aggregates.flagRate,
          averageRating: input.previous.aggregates.averageRating,
        },
      }
    : null;

  return [
    "You are a Trust & Safety analyst for an internal marketplace moderation dashboard.",
    "Analyze the stripped review dataset and write concise, actionable insights for admins.",
    "Privacy: rows contain no unique IDs. Do not speculate about specific people or bookings.",
    "Grounding: the provided aggregates are the source of truth for counts, rates, and averages. Do not invent different numbers.",
    "You may use the code execution tool (pandas/numpy) to verify the aggregates. If you do, still return the JSON schema.",
    "Write for a stakeholder: what is going well, what still needs work, and a concrete action plan.",
    "If a previous report is included, compare new rows and current aggregates against it. Describe new trends, what changed, and the overall trajectory.",
    "If there is a previous report but newReviewCount is 0, say there is no new review data since the last run and restate the overall trend.",
    "Keep bullet strings short (one or two sentences).",
    "",
    "Current aggregates (source of truth):",
    JSON.stringify(input.aggregates),
    "",
    "Previous report context:",
    JSON.stringify(previousSummary),
    "",
    `New rows since last report (${input.newRows.length}):`,
    JSON.stringify(input.newRows),
    "",
    `Full current stripped dataset (${input.rows.length} rows; columns are reviewer, rating, comment, flag, reason, created, serviceDate):`,
    JSON.stringify(input.rows),
  ].join("\n");
}

async function generateOnModel(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  useCodeExecution: boolean
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: INSIGHTS_SCHEMA,
      ...(useCodeExecution ? { tools: [{ codeExecution: {} }] } : {}),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error(`Gemini model ${model} returned an empty response.`);
  }
  return text;
}

export async function analyzeWithGemini(
  input: AnalyzeWithGeminiInput
): Promise<{ insights: GeminiInsights | null; modelUsed: string; error: string | null }> {
  const models = resolveGeminiModels(getGeminiModelOverride());
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const prompt = buildPrompt(input);
  const errors: string[] = [];

  for (const model of models) {
    for (const useCodeExecution of [true, false]) {
      try {
        const text = await generateOnModel(ai, model, prompt, useCodeExecution);
        const insights = parseGeminiInsightsText(text);
        return { insights, modelUsed: model, error: null };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Gemini call failed on ${model}`;
        errors.push(
          `${model}${useCodeExecution ? "+codeExecution" : ""}: ${message}`
        );

        const shouldTryNextMode = isRetryableGeminiError(error) || useCodeExecution;
        if (!shouldTryNextMode && getGeminiModelOverride()) {
          return {
            insights: null,
            modelUsed: model,
            error: `Gemini model ${model} failed: ${message}`,
          };
        }
        if (!shouldTryNextMode) {
          break;
        }
      }
    }
  }

  return {
    insights: null,
    modelUsed: "",
    error: `Gemini analysis failed. ${errors.join(" | ")}`,
  };
}
