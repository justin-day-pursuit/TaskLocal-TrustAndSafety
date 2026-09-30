import { describe, expect, it } from "vitest";

import {
  formatLastSuccessAt,
  freshnessStatusLabel,
  hasHighRiskCase,
  staleAnalysisMessage,
} from "@/lib/trends/freshness-display";
import { computeFreshness } from "@/lib/trends/freshness";

describe("freshnessStatusLabel", () => {
  it("maps display statuses to PRD labels", () => {
    expect(freshnessStatusLabel("current")).toBe("Current");
    expect(freshnessStatusLabel("stale")).toBe("Analysis due");
    expect(freshnessStatusLabel("generating")).toBe("Generating");
    expect(freshnessStatusLabel("generation_failed")).toBe("Generation failed");
  });
});

describe("formatLastSuccessAt", () => {
  it("returns null when no timestamp exists", () => {
    expect(formatLastSuccessAt(null, "UTC")).toBeNull();
  });

  it("formats in the configured timezone", () => {
    const formatted = formatLastSuccessAt("2026-01-15T14:30:00.000Z", "UTC");
    expect(formatted).toMatch(/Jan 15, 2026/);
  });
});

describe("staleAnalysisMessage", () => {
  it("uses the PRD stale copy", () => {
    expect(staleAnalysisMessage()).toBe(
      "Analysis has not been generated since today's review cutoff."
    );
  });
});

describe("freshness parity with U1 computeFreshness", () => {
  it("labels stale analysis as Analysis due", () => {
    const persisted = computeFreshness({
      lastSuccessAt: "2026-01-15T13:00:00.000Z",
      now: new Date("2026-01-15T15:00:00.000Z"),
      timeZone: "America/New_York",
    });

    expect(freshnessStatusLabel(persisted.status)).toBe("Analysis due");
    expect(persisted.isStale).toBe(true);
  });
});

describe("hasHighRiskCase", () => {
  it("detects a present high-risk case", () => {
    expect(
      hasHighRiskCase({
        title: "Safety concern",
        summary: "Repeated unsafe behavior",
        rationale: "Multiple reports mention harm.",
        searchTerms: ["unsafe"],
      })
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(hasHighRiskCase(null)).toBe(false);
    expect(hasHighRiskCase(undefined)).toBe(false);
  });
});
