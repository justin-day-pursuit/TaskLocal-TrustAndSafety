import type { StrippedReview, TrendReviewRow } from "@/lib/trends/types";

export const MAX_GEMINI_PROMPT_ROWS = 150;
export const MAX_GEMINI_NEW_ROWS = 80;

export interface PromptReviewPayload {
  sampleId: string;
  handled: boolean;
  reviewer: StrippedReview["reviewer"];
  rating: number;
  comment: string;
  flag: boolean;
  reason: string;
  created: string;
  serviceDate: string | null;
}

export interface GeminiRowSelection {
  promptRows: PromptReviewPayload[];
  promptNewRows: PromptReviewPayload[];
  sampleById: Map<string, TrendReviewRow>;
}

function uniqueById(rows: TrendReviewRow[]): TrendReviewRow[] {
  const seen = new Set<string>();
  const unique: TrendReviewRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

function toPromptPayload(
  sampleId: string,
  row: TrendReviewRow
): PromptReviewPayload {
  return {
    sampleId,
    handled: row.handled,
    reviewer: row.stripped.reviewer,
    rating: row.stripped.rating,
    comment: row.stripped.comment,
    flag: row.stripped.flag,
    reason: row.stripped.reason,
    created: row.stripped.created,
    serviceDate: row.stripped.serviceDate,
  };
}

export function selectRowsForGemini(
  rows: TrendReviewRow[],
  newRows: TrendReviewRow[]
): GeminiRowSelection {
  const promptNewSource = newRows.slice(0, MAX_GEMINI_NEW_ROWS);

  const selected =
    rows.length <= MAX_GEMINI_PROMPT_ROWS
      ? rows
      : uniqueById([
          ...rows.filter((row) => row.stripped.flag && !row.handled),
          ...rows.filter((row) => row.stripped.flag),
          ...rows.filter((row) => row.stripped.rating <= 2),
          ...rows.slice(-80),
          ...promptNewSource,
          ...rows,
        ]).slice(0, MAX_GEMINI_PROMPT_ROWS);

  const sampleById = new Map<string, TrendReviewRow>();
  const reviewIdToSampleId = new Map<string, string>();
  const promptRows: PromptReviewPayload[] = [];

  selected.forEach((row, index) => {
    const sampleId = `S${index + 1}`;
    sampleById.set(sampleId, row);
    reviewIdToSampleId.set(row.id, sampleId);
    promptRows.push(toPromptPayload(sampleId, row));
  });

  let nextIndex = selected.length + 1;
  const promptNewRows: PromptReviewPayload[] = [];
  for (const row of promptNewSource) {
    let sampleId = reviewIdToSampleId.get(row.id);
    if (!sampleId) {
      sampleId = `S${nextIndex}`;
      nextIndex += 1;
      sampleById.set(sampleId, row);
      reviewIdToSampleId.set(row.id, sampleId);
    }
    promptNewRows.push(toPromptPayload(sampleId, row));
  }

  return { promptRows, promptNewRows, sampleById };
}
