import { describe, expect, it } from "vitest";

import { MAX_GEMINI_PROMPT_ROWS, selectRowsForGemini } from "@/lib/trends/prompt-rows";
import type { StrippedReview } from "@/lib/trends/types";

function row(index: number, flag = false): StrippedReview {
  return {
    reviewer: "customer",
    rating: 4,
    comment: `comment ${index}`,
    flag,
    reason: flag ? "issue" : "",
    created: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    serviceDate: null,
  };
}

describe("selectRowsForGemini", () => {
  it("keeps small datasets intact", () => {
    const rows = [row(1), row(2, true)];
    const selected = selectRowsForGemini(rows, [rows[1]]);
    expect(selected.promptRows).toEqual(rows);
    expect(selected.promptNewRows).toEqual([rows[1]]);
  });

  it("caps large datasets and prefers flagged plus newest rows", () => {
    const rows = Array.from({ length: 400 }, (_, index) =>
      row(index, index === 10 || index === 11)
    );
    const selected = selectRowsForGemini(rows, [rows[399]]);

    expect(selected.promptRows.length).toBeLessThanOrEqual(MAX_GEMINI_PROMPT_ROWS);
    expect(selected.promptRows.some((item) => item.flag)).toBe(true);
    expect(selected.promptNewRows).toHaveLength(1);
  });
});
