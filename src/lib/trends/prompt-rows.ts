import type { StrippedReview } from "@/lib/trends/types";
import { rowFingerprint } from "@/lib/trends/delta";

export const MAX_GEMINI_PROMPT_ROWS = 150;
export const MAX_GEMINI_NEW_ROWS = 80;

function uniqueRows(rows: StrippedReview[]): StrippedReview[] {
  const seen = new Set<string>();
  const unique: StrippedReview[] = [];
  for (const row of rows) {
    const key = rowFingerprint(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export function selectRowsForGemini(
  rows: StrippedReview[],
  newRows: StrippedReview[]
): { promptRows: StrippedReview[]; promptNewRows: StrippedReview[] } {
  const promptNewRows = newRows.slice(0, MAX_GEMINI_NEW_ROWS);

  if (rows.length <= MAX_GEMINI_PROMPT_ROWS) {
    return { promptRows: rows, promptNewRows };
  }

  const flagged = rows.filter((row) => row.flag);
  const newest = rows.slice(-80);
  const promptRows = uniqueRows([...flagged, ...newest, ...promptNewRows]).slice(
    0,
    MAX_GEMINI_PROMPT_ROWS
  );

  return { promptRows, promptNewRows };
}
