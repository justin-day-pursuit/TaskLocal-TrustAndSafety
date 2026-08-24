import { createHash } from "node:crypto";

import type { StrippedReview, TrendWatermark } from "@/lib/trends/types";

export function rowFingerprint(row: StrippedReview): string {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 16);
}

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
    comparable: rows.length > 0,
    fingerprints: rows.map(rowFingerprint),
  };
}

function isComparableWatermark(watermark: TrendWatermark): boolean {
  if (watermark.comparable === false) {
    return false;
  }
  if (watermark.comparable === true) {
    return true;
  }
  return watermark.rowCount > 0 && watermark.newestCreated !== null;
}

export function splitNewVsPrior(
  rows: StrippedReview[],
  watermark: TrendWatermark | null
): { newRows: StrippedReview[]; priorCount: number; hasPrevious: boolean } {
  if (!watermark || !isComparableWatermark(watermark)) {
    return { newRows: [], priorCount: 0, hasPrevious: false };
  }

  if (watermark.fingerprints && watermark.fingerprints.length > 0) {
    const seen = new Set(watermark.fingerprints);
    const newRows = rows.filter((row) => !seen.has(rowFingerprint(row)));
    return {
      newRows,
      priorCount: rows.length - newRows.length,
      hasPrevious: true,
    };
  }

  if (!watermark.newestCreated) {
    return { newRows: rows, priorCount: 0, hasPrevious: true };
  }

  const cutoff = watermark.newestCreated;
  const newRows = rows.filter((row) => row.created > cutoff);

  return {
    newRows,
    priorCount: rows.length - newRows.length,
    hasPrevious: true,
  };
}
