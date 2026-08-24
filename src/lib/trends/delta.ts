import type { StrippedReview, TrendWatermark } from "@/lib/trends/types";

export function buildWatermark(rows: StrippedReview[]): TrendWatermark {
  let newestCreated: string | null = null;

  for (const row of rows) {
    if (!newestCreated || row.created > newestCreated) {
      newestCreated = row.created;
    }
  }

  return {
    rowCount: rows.length,
    newestCreated,
  };
}

export function splitNewVsPrior(
  rows: StrippedReview[],
  watermark: TrendWatermark | null
): { newRows: StrippedReview[]; priorCount: number } {
  if (!watermark?.newestCreated) {
    return { newRows: [], priorCount: 0 };
  }

  const cutoff = watermark.newestCreated;
  const newRows = rows.filter((row) => row.created > cutoff);

  return {
    newRows,
    priorCount: rows.length - newRows.length,
  };
}
