import { describe, expect, it } from "vitest";

import { MAX_GEMINI_PROMPT_ROWS, selectRowsForGemini } from "@/lib/trends/prompt-rows";
import type { TrendReviewRow } from "@/lib/trends/types";

function row(
  index: number,
  options: { flag?: boolean; handled?: boolean; rating?: number } = {}
): TrendReviewRow {
  const flag = options.flag ?? false;
  return {
    id: `rev_${index}`,
    handled: options.handled ?? false,
    stripped: {
      reviewer: "customer",
      rating: options.rating ?? 4,
      comment: `comment ${index}`,
      flag,
      reason: flag ? "issue" : "",
      created: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      serviceDate: null,
    },
  };
}

describe("selectRowsForGemini", () => {
  it("keeps small datasets intact and assigns sampleIds", () => {
    const rows = [row(1), row(2, { flag: true })];
    const selected = selectRowsForGemini(rows, [rows[1]]);

    expect(selected.promptRows).toHaveLength(2);
    expect(selected.promptRows.map((item) => item.sampleId)).toEqual(["S1", "S2"]);
    expect(selected.promptRows[0]).toMatchObject({
      sampleId: "S1",
      handled: false,
      comment: "comment 1",
    });
    expect(selected.promptNewRows).toEqual([
      expect.objectContaining({ sampleId: "S2", comment: "comment 2" }),
    ]);
    expect(selected.sampleById.get("S2")?.id).toBe("rev_2");
  });

  it("does not put review ids on prompt rows", () => {
    const rows = [row(1), row(2, { flag: true })];
    const selected = selectRowsForGemini(rows, [rows[1]]);
    const serialized = JSON.stringify({
      promptRows: selected.promptRows,
      promptNewRows: selected.promptNewRows,
    });

    expect(serialized).not.toContain("rev_");
    expect(selected.promptRows[0]).not.toHaveProperty("id");
    expect(selected.promptNewRows[0]).not.toHaveProperty("id");
  });

  it("caps large datasets and prefers flagged plus newest rows", () => {
    const rows = Array.from({ length: 400 }, (_, index) =>
      row(index, { flag: index === 10 || index === 11 })
    );
    const selected = selectRowsForGemini(rows, [rows[399]]);

    expect(selected.promptRows.length).toBeLessThanOrEqual(MAX_GEMINI_PROMPT_ROWS);
    expect(selected.promptRows.some((item) => item.flag)).toBe(true);
    expect(selected.promptRows.every((item) => /^S\d+$/.test(item.sampleId))).toBe(
      true
    );
    expect(selected.promptNewRows).toHaveLength(1);
  });

  it("prefers unhandled flags and 1-2 star rows in the cap", () => {
    const rows = Array.from({ length: 400 }, (_, index) => {
      if (index === 0) {
        return row(index, { flag: true, handled: false });
      }
      if (index === 20) {
        return row(index, { rating: 1 });
      }
      return row(index);
    });
    const selected = selectRowsForGemini(rows, []);
    const comments = selected.promptRows.map((item) => item.comment);

    expect(selected.promptRows).toHaveLength(MAX_GEMINI_PROMPT_ROWS);
    expect(comments).toContain("comment 0");
    expect(comments).toContain("comment 20");
  });
});
