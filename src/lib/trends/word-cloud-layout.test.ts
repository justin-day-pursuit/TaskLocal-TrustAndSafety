import { describe, expect, it } from "vitest";

import {
  CATEGORY_SECTORS,
  WORD_CLOUD_LAYOUT,
  boxesOverlap,
  layoutCircularWordCloud,
  semanticCloudItems,
} from "@/lib/trends/word-cloud-layout";
import type { KeywordThemeCategory } from "@/lib/trends/types";

function distanceFromCenter(
  word: { x: number; y: number },
  size = WORD_CLOUD_LAYOUT.size
): number {
  const cx = size / 2;
  const cy = size / 2;
  return Math.hypot(word.x - cx, word.y - cy);
}

function angleOf(word: { x: number; y: number }, size = WORD_CLOUD_LAYOUT.size): number {
  const cx = size / 2;
  const cy = size / 2;
  const angle = Math.atan2(word.y - cy, word.x - cx);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

function inSector(angle: number, category: KeywordThemeCategory): boolean {
  const { start, end } = CATEGORY_SECTORS[category];
  const epsilon = 0.08;
  return angle + epsilon >= start && angle - epsilon <= end;
}

describe("semanticCloudItems", () => {
  it("sizes plotted terms from local topKeywords and omits unmatched themes", () => {
    const items = semanticCloudItems(
      [
        { term: "professional", meaning: "quality", category: "praise" },
        { term: "Late", meaning: "timing", category: "issue" },
        { term: "service", meaning: "generic filler" },
        { term: "invented", meaning: "not in local counts", category: "task" },
        { term: "no-show", meaning: "missed appointment", category: "issue" },
      ],
      [
        { term: "professional", count: 9 },
        { term: "late", count: 4 },
        { term: "service", count: 12 },
        { term: "cleaning", count: 2 },
        { term: "show", count: 7 },
      ]
    );

    expect(items).toEqual([
      { term: "professional", category: "praise", count: 9 },
      { term: "Late", category: "issue", count: 4 },
      { term: "no-show", category: "issue", count: 7 },
    ]);
    expect(items.find((item) => item.term === "service")).toBeUndefined();
    expect(items.find((item) => item.term === "invented")).toBeUndefined();
  });
});

describe("layoutCircularWordCloud", () => {
  it("places the highest-count term nearest the center", () => {
    const laidOut = layoutCircularWordCloud([
      { term: "great", count: 12, category: "praise" },
      { term: "cleaning", count: 4, category: "task" },
      { term: "late", count: 3, category: "issue" },
      { term: "rude", count: 2, category: "sentiment" },
    ]);

    const center = laidOut.reduce((closest, word) =>
      distanceFromCenter(word) < distanceFromCenter(closest) ? word : closest
    );
    expect(center.term).toBe("great");
    expect(center.radius).toBe(0);

    for (const word of laidOut) {
      if (word.term === "great") {
        continue;
      }
      expect(distanceFromCenter(word)).toBeGreaterThan(distanceFromCenter(center));
    }
  });

  it("puts remaining terms in different category sectors by rendered position", () => {
    const laidOut = layoutCircularWordCloud([
      { term: "core", count: 10, category: "praise" },
      { term: "friendly", count: 4, category: "praise" },
      { term: "plumbing", count: 4, category: "task" },
      { term: "damaged", count: 4, category: "issue" },
      { term: "disappointed", count: 4, category: "sentiment" },
    ]);

    const outward = laidOut.filter((word) => word.term !== "core");
    expect(outward).toHaveLength(4);

    for (const word of outward) {
      expect(inSector(angleOf(word), word.category)).toBe(true);
    }

    const uniqueBuckets = new Set(
      outward.map((word) => Math.floor(angleOf(word) / (Math.PI / 2)))
    );
    expect(uniqueBuckets.size).toBe(4);
    expect(new Set(outward.map((word) => angleOf(word))).size).toBe(4);
  });

  it("does not overlap word boxes beyond a small epsilon", () => {
    const laidOut = layoutCircularWordCloud([
      { term: "professional", count: 11, category: "praise" },
      { term: "friendly", count: 6, category: "praise" },
      { term: "cleaning", count: 8, category: "task" },
      { term: "assembly", count: 5, category: "task" },
      { term: "no-show", count: 7, category: "issue" },
      { term: "late", count: 4, category: "issue" },
      { term: "rude", count: 3, category: "sentiment" },
      { term: "great", count: 5, category: "sentiment" },
    ]);

    for (let i = 0; i < laidOut.length; i += 1) {
      for (let j = i + 1; j < laidOut.length; j += 1) {
        expect(boxesOverlap(laidOut[i]!, laidOut[j]!)).toBe(false);
      }
    }
  });

  it("keeps a dense cloud free of overlaps and inside category wedges", () => {
    const dense: Array<{
      term: string;
      count: number;
      category: KeywordThemeCategory;
    }> = [
      { term: "professional", count: 20, category: "praise" },
      { term: "friendly", count: 14, category: "praise" },
      { term: "thorough", count: 11, category: "praise" },
      { term: "punctual", count: 9, category: "praise" },
      { term: "cleaning", count: 18, category: "task" },
      { term: "plumbing", count: 13, category: "task" },
      { term: "assembly", count: 10, category: "task" },
      { term: "moving", count: 8, category: "task" },
      { term: "noshow", count: 16, category: "issue" },
      { term: "late", count: 12, category: "issue" },
      { term: "damaged", count: 9, category: "issue" },
      { term: "incomplete", count: 7, category: "issue" },
      { term: "rude", count: 15, category: "sentiment" },
      { term: "great", count: 11, category: "sentiment" },
      { term: "disappointed", count: 8, category: "sentiment" },
      { term: "excellent", count: 6, category: "sentiment" },
    ];

    const laidOut = layoutCircularWordCloud(dense);
    expect(laidOut.length).toBeGreaterThanOrEqual(12);

    for (let i = 0; i < laidOut.length; i += 1) {
      for (let j = i + 1; j < laidOut.length; j += 1) {
        expect(boxesOverlap(laidOut[i]!, laidOut[j]!)).toBe(false);
      }
    }

    const center = laidOut.reduce((closest, word) =>
      distanceFromCenter(word) < distanceFromCenter(closest) ? word : closest
    );
    for (const word of laidOut) {
      if (word.term === center.term) {
        continue;
      }
      expect(inSector(angleOf(word), word.category)).toBe(true);
    }
  });
});
