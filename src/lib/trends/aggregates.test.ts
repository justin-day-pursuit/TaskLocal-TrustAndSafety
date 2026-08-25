import { describe, expect, it } from "vitest";

import { computeTrendAggregates } from "@/lib/trends/aggregates";
import { buildWatermark, splitNewVsPrior } from "@/lib/trends/delta";
import { countCommentKeywords } from "@/lib/trends/keywords";
import { parseGeminiInsightsText } from "@/lib/trends/insights";
import type { StrippedReview } from "@/lib/trends/types";

function row(
  overrides: Partial<StrippedReview> = {}
): StrippedReview {
  return {
    reviewer: "customer",
    rating: 5,
    comment: "great cleaning service professional",
    flag: false,
    reason: "",
    created: "2026-01-15T00:00:00.000Z",
    serviceDate: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("trend aggregates and keywords", () => {
  it("computes monthly flag and sentiment series from stripped rows", () => {
    const rows = [
      row({ created: "2026-01-02T00:00:00.000Z", rating: 5, flag: false }),
      row({
        created: "2026-01-20T00:00:00.000Z",
        rating: 1,
        flag: true,
        reason: "no-show",
        comment: "provider never arrived cleaning",
      }),
      row({
        created: "2026-02-05T00:00:00.000Z",
        rating: 4,
        flag: false,
        comment: "on time and professional",
      }),
    ];

    const aggregates = computeTrendAggregates(rows);

    expect(aggregates.totalReviews).toBe(3);
    expect(aggregates.flaggedCount).toBe(1);
    expect(aggregates.flagRate).toBeCloseTo(1 / 3, 3);
    expect(aggregates.averageRating).toBeCloseTo(3.33, 2);
    expect(aggregates.monthlyFlags).toEqual([
      { month: "2026-01", total: 2, flagged: 1, flagRate: 0.5 },
      { month: "2026-02", total: 1, flagged: 0, flagRate: 0 },
    ]);
    expect(aggregates.monthlySentiment[0]?.averageRating).toBe(3);
    expect(aggregates.topReasons).toEqual([{ reason: "no-show", count: 1 }]);
    expect(aggregates.ratingDistribution.find((item) => item.rating === 5)?.count).toBe(1);
  });

  it("fills missing months in the flag series", () => {
    const aggregates = computeTrendAggregates([
      row({ created: "2026-01-02T00:00:00.000Z" }),
      row({ created: "2026-03-05T00:00:00.000Z" }),
    ]);

    expect(aggregates.monthlyFlags.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(aggregates.monthlyFlags[1]).toEqual({
      month: "2026-02",
      total: 0,
      flagged: 0,
      flagRate: 0,
    });
    expect(aggregates.monthlySentiment.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-03",
    ]);
  });

  it("counts repeated comment keywords and drops stopwords", () => {
    const keywords = countCommentKeywords(
      [
        row({ comment: "The cleaning was very professional" }),
        row({ comment: "professional cleaning, professional crew" }),
      ],
      10
    );

    expect(keywords[0]).toEqual({ term: "professional", count: 3 });
    expect(keywords.find((item) => item.term === "the")).toBeUndefined();
    expect(keywords.find((item) => item.term === "very")).toBeUndefined();
  });
});

describe("new vs prior split", () => {
  it("treats the first run as having no new-since-last rows", () => {
    const rows = [row(), row({ created: "2026-02-01T00:00:00.000Z" })];

    expect(splitNewVsPrior(rows, null)).toEqual({
      newRows: [],
      priorCount: 0,
      hasPrevious: false,
    });
    const watermark = buildWatermark(rows);
    expect(watermark.rowCount).toBe(2);
    expect(watermark.newestCreated).toBe("2026-02-01T00:00:00.000Z");
    expect(watermark.comparable).toBe(true);
    expect(watermark.fingerprints).toHaveLength(2);
  });

  it("does not treat an empty prior report as a comparable watermark", () => {
    const rows = [row({ created: "2026-03-01T00:00:00.000Z" })];
    const emptyPrior = buildWatermark([]);

    expect(emptyPrior.comparable).toBe(false);
    expect(splitNewVsPrior(rows, emptyPrior)).toEqual({
      newRows: [],
      priorCount: 0,
      hasPrevious: false,
    });
  });

  it("returns only rows newer than the watermark when fingerprints are missing", () => {
    const rows = [
      row({ created: "2026-01-01T00:00:00.000Z" }),
      row({ created: "2026-02-01T00:00:00.000Z" }),
      row({ created: "2026-03-01T00:00:00.000Z", comment: "new damage report" }),
    ];

    const split = splitNewVsPrior(rows, {
      rowCount: 2,
      newestCreated: "2026-02-01T00:00:00.000Z",
      comparable: true,
      fingerprints: [],
    });

    expect(split.hasPrevious).toBe(true);
    expect(split.priorCount).toBe(2);
    expect(split.newRows).toHaveLength(1);
    expect(split.newRows[0]?.comment).toBe("new damage report");
  });

  it("detects backfilled rows via fingerprints even when created is older", () => {
    const prior = [
      row({ created: "2026-02-01T00:00:00.000Z", comment: "existing" }),
    ];
    const current = [
      row({ created: "2026-01-01T00:00:00.000Z", comment: "backfill" }),
      ...prior,
    ];

    const split = splitNewVsPrior(current, buildWatermark(prior));

    expect(split.hasPrevious).toBe(true);
    expect(split.newRows).toHaveLength(1);
    expect(split.newRows[0]?.comment).toBe("backfill");
  });
});

describe("parseGeminiInsightsText", () => {
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
  };

  it("parses JSON insights and ignores markdown fences", () => {
    const insights = parseGeminiInsightsText(`\`\`\`json
${JSON.stringify(baseInsights)}
\`\`\``);

    expect(insights.actionPlan[0]).toMatch(/Follow up/);
    expect(insights.changeSinceLast.newReviewCount).toBe(1);
    expect(insights.keywordThemes[0]?.term).toBe("professional");
    expect(insights.flagReasonThemes).toEqual([]);
    expect(insights.highRiskItems).toEqual([]);
  });

  it("treats a missing flagReasonThemes field as an empty list", () => {
    const insights = parseGeminiInsightsText(JSON.stringify(baseInsights));
    expect(insights.flagReasonThemes).toEqual([]);
    expect(insights.highRiskItems).toEqual([]);
  });

  it("parses flagReasonThemes without inventing counts", () => {
    const insights = parseGeminiInsightsText(
      JSON.stringify({
        ...baseInsights,
        flagReasonThemes: [
          {
            theme: "No-show",
            meaning: "The provider did not arrive.",
            examples: ["provider never showed", "no-show"],
          },
          null,
          { theme: "", meaning: "", examples: [] },
        ],
      })
    );

    expect(insights.flagReasonThemes).toEqual([
      {
        theme: "No-show",
        meaning: "The provider did not arrive.",
        examples: ["provider never showed", "no-show"],
      },
    ]);
    expect(JSON.stringify(insights.flagReasonThemes)).not.toMatch(/"count"/);
  });

  it("keeps keyword category when valid and omits it otherwise", () => {
    const insights = parseGeminiInsightsText(
      JSON.stringify({
        ...baseInsights,
        keywordThemes: [
          { term: "professional", meaning: "service quality", category: "praise" },
          { term: "late", meaning: "punctuality", category: "not-a-category" },
          { term: "cleaning", meaning: "job type" },
        ],
      })
    );

    expect(insights.keywordThemes).toEqual([
      { term: "professional", meaning: "service quality", category: "praise" },
      { term: "late", meaning: "punctuality" },
      { term: "cleaning", meaning: "job type" },
    ]);
  });

  it("skips null keyword themes instead of throwing", () => {
    const insights = parseGeminiInsightsText(
      JSON.stringify({
        goingWell: [],
        needsWork: [],
        actionPlan: [],
        flagTrendsExplanation: "x",
        flagTrendsConclusions: "x",
        sentimentExplanation: "x",
        sentimentConclusions: "x",
        sentimentOverallLabel: "mixed",
        keywordsExplanation: "x",
        keywordThemes: [null, { term: "late", meaning: "punctuality" }],
        changeSinceLast: {
          hasPrevious: false,
          newReviewCount: 9,
          whatChanged: [],
          emergingTrends: [],
        },
      })
    );

    expect(insights.keywordThemes).toEqual([
      { term: "late", meaning: "punctuality" },
    ]);
    expect(insights.flagReasonThemes).toEqual([]);
    expect(insights.highRiskItems).toEqual([]);
  });
});
