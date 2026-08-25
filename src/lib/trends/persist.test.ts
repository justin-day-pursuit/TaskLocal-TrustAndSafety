import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emptyInsights } from "@/lib/trends/insights";
import { loadLastTrendReport, saveTrendReport } from "@/lib/trends/persist";
import { computeTrendAggregates } from "@/lib/trends/aggregates";
import type { TrendReport } from "@/lib/trends/types";

describe("trend report persist", () => {
  it("round-trips a saved report", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "trends-"));
    const filePath = path.join(dir, "trends-last-report.json");
    const report: TrendReport = {
      generatedAt: "2026-08-24T00:00:00.000Z",
      modelUsed: "gemini-3.5-flash",
      watermark: {
        rowCount: 0,
        newestCreated: null,
        comparable: false,
        fingerprints: [],
      },
      aggregates: computeTrendAggregates([]),
      insights: emptyInsights(),
      highRiskCases: [],
      groundingSample: [],
      priorSummary: null,
    };

    const saved = await saveTrendReport(report, filePath);
    expect(saved.error).toBeNull();

    const raw = await readFile(filePath, "utf8");
    expect(raw).toContain("gemini-3.5-flash");

    const loaded = await loadLastTrendReport(filePath);
    expect(loaded.error).toBeNull();
    expect(loaded.failureKind).toBeNull();
    expect(loaded.data?.modelUsed).toBe("gemini-3.5-flash");
    expect(loaded.data?.insights.needsWork.length).toBeGreaterThan(0);
    expect(loaded.data?.insights.flagReasonThemes).toEqual([]);
    expect(loaded.data?.highRiskCases).toEqual([]);
  });

  it("loads an old report missing flagReasonThemes as an empty list", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "trends-"));
    const filePath = path.join(dir, "trends-last-report.json");
    const report: TrendReport = {
      generatedAt: "2026-08-24T00:00:00.000Z",
      modelUsed: "gemini-3.5-flash",
      watermark: {
        rowCount: 0,
        newestCreated: null,
        comparable: false,
        fingerprints: [],
      },
      aggregates: computeTrendAggregates([]),
      insights: emptyInsights(),
      highRiskCases: [],
      groundingSample: [],
      priorSummary: null,
    };
    const raw = JSON.parse(JSON.stringify(report)) as {
      insights: { flagReasonThemes?: unknown };
    };
    delete raw.insights.flagReasonThemes;
    await writeFile(filePath, `${JSON.stringify(raw)}\n`, "utf8");

    const loaded = await loadLastTrendReport(filePath);
    expect(loaded.error).toBeNull();
    expect(loaded.data?.insights.flagReasonThemes).toEqual([]);
    expect(loaded.data?.insights.keywordThemes).toEqual([]);
    expect(loaded.data?.highRiskCases).toEqual([]);
  });

  it("loads an old report missing highRiskCases as an empty list", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "trends-"));
    const filePath = path.join(dir, "trends-last-report.json");
    const report: TrendReport = {
      generatedAt: "2026-08-24T00:00:00.000Z",
      modelUsed: "gemini-3.5-flash",
      watermark: {
        rowCount: 0,
        newestCreated: null,
        comparable: false,
        fingerprints: [],
      },
      aggregates: computeTrendAggregates([]),
      insights: emptyInsights(),
      highRiskCases: [],
      groundingSample: [],
      priorSummary: null,
    };
    const raw = JSON.parse(JSON.stringify(report)) as {
      highRiskCases?: unknown;
    };
    delete raw.highRiskCases;
    await writeFile(filePath, `${JSON.stringify(raw)}\n`, "utf8");

    const loaded = await loadLastTrendReport(filePath);
    expect(loaded.error).toBeNull();
    expect(loaded.data?.highRiskCases).toEqual([]);
  });

  it("returns an empty success when no report file exists", async () => {
    const loaded = await loadLastTrendReport(
      path.join(os.tmpdir(), "missing-trends-report.json")
    );
    expect(loaded).toEqual({
      data: null,
      error: null,
      failureKind: null,
    });
  });
});
