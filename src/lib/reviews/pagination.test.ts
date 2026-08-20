import { describe, expect, it } from "vitest";

import {
  clampPage,
  computePaginationDisplay,
  slicePage,
  toSupabaseRange,
} from "@/lib/reviews/pagination";

describe("clampPage", () => {
  it("normalizes page 0 and negatives to 1", () => {
    expect(clampPage(0, 100, 25)).toBe(1);
    expect(clampPage(-3, 100, 25)).toBe(1);
  });

  it("clamps past-end pages to the last page", () => {
    expect(clampPage(99, 100, 25)).toBe(4);
    expect(clampPage(3, 100, 25)).toBe(3);
  });

  it("returns page 1 for empty totals", () => {
    expect(clampPage(5, 0, 25)).toBe(1);
  });
});

describe("toSupabaseRange", () => {
  it("returns inclusive zero-based bounds", () => {
    expect(toSupabaseRange(1, 25)).toEqual({ from: 0, to: 24 });
    expect(toSupabaseRange(2, 10)).toEqual({ from: 10, to: 19 });
  });
});

describe("computePaginationDisplay", () => {
  it('shows "Showing X–Y of Z" values', () => {
    expect(computePaginationDisplay(2, 25, 60)).toEqual({
      from: 26,
      to: 50,
      total: 60,
    });
    expect(computePaginationDisplay(3, 25, 60)).toEqual({
      from: 51,
      to: 60,
      total: 60,
    });
    expect(computePaginationDisplay(1, 25, 0)).toEqual({
      from: 0,
      to: 0,
      total: 0,
    });
  });
});

describe("slicePage", () => {
  it("slices using clamped page bounds", () => {
    const items = Array.from({ length: 30 }, (_, index) => index + 1);

    expect(slicePage(items, 2, 10)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(slicePage(items, 99, 10)).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  });
});
