import type {
  KeywordCount,
  MonthlyFlagPoint,
  MonthlySentimentPoint,
  RatingCount,
  ReasonCount,
  StrippedReview,
  TrendAggregates,
} from "@/lib/trends/types";
import { countCommentKeywords } from "@/lib/trends/keywords";

function monthKey(iso: string): string {
  const match = iso.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : "unknown";
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function computeTrendAggregates(
  rows: StrippedReview[]
): TrendAggregates {
  const monthly = new Map<
    string,
    { total: number; flagged: number; ratingSum: number }
  >();
  const reasonCounts = new Map<string, number>();
  const ratingCounts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
  ]);

  let flaggedCount = 0;
  let ratingSum = 0;

  for (const row of rows) {
    const key = monthKey(row.created);
    const bucket = monthly.get(key) ?? {
      total: 0,
      flagged: 0,
      ratingSum: 0,
    };
    bucket.total += 1;
    bucket.ratingSum += row.rating;
    if (row.flag) {
      bucket.flagged += 1;
      flaggedCount += 1;
      const reason = row.reason.trim() || "(no reason given)";
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    monthly.set(key, bucket);
    ratingSum += row.rating;

    const roundedRating = Math.min(5, Math.max(1, Math.round(row.rating)));
    ratingCounts.set(roundedRating, (ratingCounts.get(roundedRating) ?? 0) + 1);
  }

  const months = [...monthly.keys()].sort();

  const monthlyFlags: MonthlyFlagPoint[] = months.map((month) => {
    const bucket = monthly.get(month)!;
    return {
      month,
      total: bucket.total,
      flagged: bucket.flagged,
      flagRate: bucket.total === 0 ? 0 : round(bucket.flagged / bucket.total, 3),
    };
  });

  const monthlySentiment: MonthlySentimentPoint[] = months.map((month) => {
    const bucket = monthly.get(month)!;
    return {
      month,
      averageRating: round(bucket.ratingSum / bucket.total, 2),
      reviewCount: bucket.total,
    };
  });

  const ratingDistribution: RatingCount[] = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratingCounts.get(rating) ?? 0,
  }));

  const topReasons: ReasonCount[] = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, 12);

  const topKeywords: KeywordCount[] = countCommentKeywords(rows, 25);

  return {
    totalReviews: rows.length,
    flaggedCount,
    flagRate: rows.length === 0 ? 0 : round(flaggedCount / rows.length, 3),
    averageRating: rows.length === 0 ? 0 : round(ratingSum / rows.length, 2),
    monthlyFlags,
    monthlySentiment,
    ratingDistribution,
    topReasons,
    topKeywords,
  };
}
