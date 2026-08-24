import type { KeywordCount, StrippedReview } from "@/lib/trends/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "was",
  "were",
  "are",
  "but",
  "not",
  "you",
  "your",
  "they",
  "them",
  "their",
  "have",
  "has",
  "had",
  "been",
  "from",
  "very",
  "just",
  "about",
  "into",
  "would",
  "could",
  "should",
  "really",
  "also",
  "than",
  "then",
  "when",
  "what",
  "which",
  "while",
  "there",
  "here",
  "some",
  "more",
  "most",
  "only",
  "other",
  "over",
  "after",
  "before",
  "because",
  "did",
  "does",
  "doing",
  "too",
  "out",
  "our",
  "all",
  "any",
  "can",
  "get",
  "got",
  "one",
  "two",
  "job",
  "work",
]);

export function tokenizeComment(comment: string): string[] {
  return comment
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

export function countCommentKeywords(
  rows: StrippedReview[],
  limit = 25
): KeywordCount[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const word of tokenizeComment(row.comment)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}
