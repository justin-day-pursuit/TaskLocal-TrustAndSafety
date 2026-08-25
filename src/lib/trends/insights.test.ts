import { describe, expect, it } from "vitest";

import {
  groundHighRiskItems,
  isGeminiInsights,
  MAX_HIGH_RISK_CASES,
  parseGeminiInsightsText,
  parseHighRiskCase,
  parseHighRiskItems,
} from "@/lib/trends/insights";
import { isTrendReport } from "@/lib/trends/persist";
import type { GeminiHighRiskItem, TrendReviewRow } from "@/lib/trends/types";

const baseInsights = {
  goingWell: ["Ratings are mostly high"],
  needsWork: ["No-show flags rose"],
  actionPlan: ["Follow up on no-shows this week"],
  flagTrendsExplanation: "Flags clustered in January.",
  flagTrendsConclusions: "Watch no-show volume.",
  sentimentExplanation: "Average rating dipped in January.",
  sentimentConclusions: "Recovered in February.",
  sentimentOverallLabel: "mixed",
  keywordsExplanation: "Cleaning and professional dominate comments.",
  keywordThemes: [{ term: "professional", meaning: "service quality" }],
  changeSinceLast: {
    hasPrevious: true,
    newReviewCount: 1,
    whatChanged: ["One new flagged review"],
    emergingTrends: ["No-shows"],
  },
  highRiskCase: null,
};

function trendRow(
  id: string,
  options: { handled?: boolean; flag?: boolean; comment?: string } = {}
): TrendReviewRow {
  return {
    id,
    handled: options.handled ?? false,
    stripped: {
      reviewer: "customer",
      rating: 1,
      comment: options.comment ?? "threat in the comment",
      flag: options.flag ?? true,
      reason: "safety",
      created: "2026-04-01T12:00:00.000Z",
      serviceDate: null,
    },
  };
}

function highRiskItem(
  sampleId: string,
  overrides: Partial<GeminiHighRiskItem> = {}
): GeminiHighRiskItem {
  return {
    sampleId,
    severity: "high",
    riskType: "safety",
    summary: `summary ${sampleId}`,
    whyItMatters: "why",
    recommendedAction: "act",
    ...overrides,
  };
}

describe("parseHighRiskItems", () => {
  it("treats a missing highRiskItems field as an empty list", () => {
    const insights = parseGeminiInsightsText(JSON.stringify(baseInsights));
    expect(insights.highRiskItems).toEqual([]);
  });

  it("drops invalid sampleIds and enum values", () => {
    const items = parseHighRiskItems([
      highRiskItem("S1"),
      highRiskItem(""),
      highRiskItem("rev_secret"),
      highRiskItem("S2", { severity: "medium" as GeminiHighRiskItem["severity"] }),
      highRiskItem("S3", { riskType: "other" as GeminiHighRiskItem["riskType"] }),
      { sampleId: "S4" },
      null,
    ]);

    expect(items).toEqual([highRiskItem("S1")]);
  });

  it("parses valid highRiskItems from Gemini JSON", () => {
    const insights = parseGeminiInsightsText(
      JSON.stringify({
        ...baseInsights,
        highRiskItems: [
          highRiskItem("S1", {
            severity: "critical",
            riskType: "trust",
            summary: "Possible scam",
          }),
        ],
      })
    );

    expect(insights.highRiskItems).toEqual([
      highRiskItem("S1", {
        severity: "critical",
        riskType: "trust",
        summary: "Possible scam",
      }),
    ]);
  });
});

describe("groundHighRiskItems", () => {
  it("drops unknown sampleIds, sorts critical first, dedupes, and caps", () => {
    const sampleById = new Map<string, TrendReviewRow>([
      ["S1", trendRow("rev_one", { comment: "one" })],
      ["S2", trendRow("rev_two", { comment: "two" })],
      ["S3", trendRow("rev_one", { comment: "duplicate id" })],
    ]);

    for (let index = 4; index <= 14; index += 1) {
      sampleById.set(`S${index}`, trendRow(`rev_${index}`));
    }

    const grounded = groundHighRiskItems(
      [
        highRiskItem("S2", { severity: "high" }),
        highRiskItem("S99"),
        highRiskItem("S1", { severity: "critical" }),
        highRiskItem("S3", { severity: "high" }),
        ...Array.from({ length: 11 }, (_, index) =>
          highRiskItem(`S${index + 4}`, { severity: "high" })
        ),
      ],
      sampleById
    );

    expect(grounded.some((item) => item.sampleId === "S99")).toBe(false);
    expect(grounded[0]).toMatchObject({
      sampleId: "S1",
      reviewId: "rev_one",
      severity: "critical",
      comment: "one",
    });
    expect(grounded.some((item) => item.reviewId === "rev_one")).toBe(true);
    expect(grounded.filter((item) => item.reviewId === "rev_one")).toHaveLength(1);
    expect(grounded).toHaveLength(MAX_HIGH_RISK_CASES);
    expect(grounded.map((item) => item.reviewId)).not.toContain("rev_secret");
  });
});

describe("parseHighRiskCase", () => {
  it("returns null for null, undefined, and malformed objects", () => {
    expect(parseHighRiskCase(null)).toBeNull();
    expect(parseHighRiskCase(undefined)).toBeNull();
    expect(parseHighRiskCase("bad")).toBeNull();
    expect(parseHighRiskCase({ title: "x" })).toBeNull();
    expect(parseHighRiskCase({
      title: "Case",
      summary: "Summary",
      rationale: "Because",
      searchTerms: [],
    })).toBeNull();
    expect(parseHighRiskCase({
      title: "Case",
      summary: "Summary",
      rationale: "Because",
      searchTerms: ["", "  "],
    })).toBeNull();
  });

  it("strips empty search terms and keeps valid payloads", () => {
    expect(
      parseHighRiskCase({
        title: " Harassment pattern ",
        summary: " Repeated threats ",
        rationale: " Multiple flagged comments ",
        searchTerms: [" threat ", "", "harassment"],
      })
    ).toEqual({
      title: "Harassment pattern",
      summary: "Repeated threats",
      rationale: "Multiple flagged comments",
      searchTerms: ["threat", "harassment"],
    });
  });
});

describe("highRiskCase insights contract", () => {
  it("parses highRiskCase from Gemini JSON and defaults missing field to null", () => {
    const withCase = parseGeminiInsightsText(
      JSON.stringify({
        ...baseInsights,
        highRiskCase: {
          title: "Threat cluster",
          summary: "Several threats in comments",
          rationale: "Repeated threatening language",
          searchTerms: ["threat", "harassment"],
        },
      })
    );
    expect(withCase.highRiskCase).toEqual({
      title: "Threat cluster",
      summary: "Several threats in comments",
      rationale: "Repeated threatening language",
      searchTerms: ["threat", "harassment"],
    });

    const missing = parseGeminiInsightsText(JSON.stringify(baseInsights));
    expect(missing.highRiskCase).toBeNull();
  });

  it("coerces malformed highRiskCase to null while keeping other insights", () => {
    const insights = parseGeminiInsightsText(
      JSON.stringify({
        ...baseInsights,
        highRiskCase: { title: 123, searchTerms: ["x"] },
      })
    );
    expect(insights.highRiskCase).toBeNull();
    expect(insights.goingWell).toEqual(baseInsights.goingWell);
  });

  it("accepts old persisted insights without highRiskCase", () => {
    const legacy = JSON.parse(JSON.stringify(baseInsights)) as Record<string, unknown>;
    delete legacy.highRiskCase;
    expect(isGeminiInsights(legacy)).toBe(true);
  });

  it("loads an old trend report without highRiskCase via isTrendReport", () => {
    const legacyReport = {
      generatedAt: "2026-08-24T00:00:00.000Z",
      modelUsed: "gemini-3.5-flash",
      watermark: {
        rowCount: 0,
        newestCreated: null,
        comparable: false,
        fingerprints: [],
      },
      aggregates: {
        totalReviews: 0,
        flaggedCount: 0,
        flagRate: 0,
        averageRating: 0,
        monthlyFlags: [],
        monthlySentiment: [],
        ratingDistribution: [],
        topReasons: [],
        topKeywords: [],
      },
      insights: baseInsights,
      groundingSample: [],
      priorSummary: null,
    };
    delete (legacyReport.insights as { highRiskCase?: unknown }).highRiskCase;
    expect(isTrendReport(legacyReport)).toBe(true);
  });
});
