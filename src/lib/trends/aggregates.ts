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

function fillMonthRange(keys: string[]): string[] {
  const known = keys.filter((key) => key !== "unknown").sort();
  if (known.length === 0) {
    return keys.includes("unknown") ? ["unknown"] : [];
  }

  const [startYear, startMonth] = known[0].split("-").map(Number);
  const [endYear, endMonth] = known[known.length - 1].split("-").map(Number);
  const filled: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    filled.push(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  if (keys.includes("unknown")) {
    filled.push("unknown");
  }
  return filled;
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

  const months = fillMonthRange([...monthly.keys()]);

  const monthlyFlags: MonthlyFlagPoint[] = months.map((month) => {
    const bucket = monthly.get(month);
    const total = bucket?.total ?? 0;
    const flagged = bucket?.flagged ?? 0;
    return {
      month,
      total,
      flagged,
      flagRate: total === 0 ? 0 : round(flagged / total, 3),
    };
  });

  const monthlySentiment: MonthlySentimentPoint[] = months
    .map((month) => {
      const bucket = monthly.get(month);
      if (!bucket || bucket.total === 0) {
        return null;
      }
      return {
        month,
        averageRating: round(bucket.ratingSum / bucket.total, 2),
        reviewCount: bucket.total,
      };
    })
    .filter((point): point is MonthlySentimentPoint => point !== null);

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
