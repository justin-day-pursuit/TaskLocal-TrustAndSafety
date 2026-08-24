import type { QueryFailureKind } from "@/lib/queries/query-status";

export const STRIPPED_REVIEW_KEYS = [
  "reviewer",
  "rating",
  "comment",
  "flag",
  "reason",
  "created",
  "serviceDate",
] as const;

export type StrippedReviewKey = (typeof STRIPPED_REVIEW_KEYS)[number];

export interface StrippedReview {
  reviewer: "customer" | "provider";
  rating: number;
  comment: string;
  flag: boolean;
  reason: string;
  created: string;
  serviceDate: string | null;
}

export interface MonthlyFlagPoint {
  month: string;
  total: number;
  flagged: number;
  flagRate: number;
}

export interface MonthlySentimentPoint {
  month: string;
  averageRating: number;
  reviewCount: number;
}

export interface RatingCount {
  rating: number;
  count: number;
}

export interface ReasonCount {
  reason: string;
  count: number;
}

export interface KeywordCount {
  term: string;
  count: number;
}

export interface TrendAggregates {
  totalReviews: number;
  flaggedCount: number;
  flagRate: number;
  averageRating: number;
  monthlyFlags: MonthlyFlagPoint[];
  monthlySentiment: MonthlySentimentPoint[];
  ratingDistribution: RatingCount[];
  topReasons: ReasonCount[];
  topKeywords: KeywordCount[];
}

export interface GeminiKeywordTheme {
  term: string;
  meaning: string;
}

export interface GeminiChangeSinceLast {
  hasPrevious: boolean;
  newReviewCount: number;
  whatChanged: string[];
  emergingTrends: string[];
}

export interface GeminiInsights {
  goingWell: string[];
  needsWork: string[];
  actionPlan: string[];
  flagTrendsExplanation: string;
  flagTrendsConclusions: string;
  sentimentExplanation: string;
  sentimentConclusions: string;
  sentimentOverallLabel: string;
  keywordsExplanation: string;
  keywordThemes: GeminiKeywordTheme[];
  changeSinceLast: GeminiChangeSinceLast;
}

export interface TrendWatermark {
  rowCount: number;
  newestCreated: string | null;
  comparable: boolean;
  fingerprints: string[];
}

export interface TrendReport {
  generatedAt: string;
  modelUsed: string;
  watermark: TrendWatermark;
  aggregates: TrendAggregates;
  insights: GeminiInsights;
  groundingSample: StrippedReview[];
  priorSummary: {
    goingWell: string[];
    needsWork: string[];
    actionPlan: string[];
  } | null;
}

export interface GenerateTrendsResult {
  data: TrendReport | null;
  error: string | null;
  failureKind: QueryFailureKind | null;
  persistWarning: string | null;
}
