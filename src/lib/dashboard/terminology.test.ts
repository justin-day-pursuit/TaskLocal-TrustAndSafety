import { describe, expect, it } from "vitest";

import { ISSUE_PATTERNS_CHART_TITLE } from "@/app/analysis/AnalysisWorkspace";
import { ROOT_LAYOUT_DESCRIPTION } from "@/lib/dashboard/site-metadata";
import {
  FLAG_REASON_THEMES_COPY,
} from "@/components/trends/FlagReasonThemes";
import { HIGH_RISK_CASES_COPY } from "@/components/trends/HighRiskCases";
import {
  REVIEW_CATALOG_USER_FACING_QUERY_FALLBACKS,
} from "@/lib/queries/review-catalog";
import { QUERY_COPY } from "@/lib/queries/query-status";
import {
  REVIEWS_USER_FACING_QUERY_FALLBACKS,
} from "@/lib/queries/reviews";
import { GENERATE_USER_FACING_COPY } from "@/lib/trends/generate";
import { emptyInsightsUserVisibleCopy } from "@/lib/trends/insights";
import { PERSIST_USER_FACING_COPY } from "@/lib/trends/persist";

const FORBIDDEN_FLAG = /\bflag(ged)?\b/i;
const FORBIDDEN_TREND_REPORT = /trend report/i;
const FORBIDDEN_ACTION_NEEDED = /action needed/i;
const FORBIDDEN_TREND_WORD = /\btrend\b/i;

const TREND_HEADING_ALLOWLIST = new Set(["Issue trends", "Sentiment trends"]);

function collectScannedUserFacingStrings(): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  for (const [key, messages] of Object.entries(QUERY_COPY)) {
    for (const [phase, text] of Object.entries(messages)) {
      entries.push([`QUERY_COPY.${key}.${phase}`, text]);
    }
  }

  for (const [key, text] of Object.entries(PERSIST_USER_FACING_COPY)) {
    entries.push([`PERSIST_USER_FACING_COPY.${key}`, text]);
  }

  for (const [key, text] of Object.entries(GENERATE_USER_FACING_COPY)) {
    entries.push([`GENERATE_USER_FACING_COPY.${key}`, text]);
  }

  for (const [key, text] of Object.entries(REVIEWS_USER_FACING_QUERY_FALLBACKS)) {
    entries.push([`REVIEWS_USER_FACING_QUERY_FALLBACKS.${key}`, text]);
  }

  for (const [key, text] of Object.entries(
    REVIEW_CATALOG_USER_FACING_QUERY_FALLBACKS
  )) {
    entries.push([`REVIEW_CATALOG_USER_FACING_QUERY_FALLBACKS.${key}`, text]);
  }

  emptyInsightsUserVisibleCopy().forEach((text, index) => {
    entries.push([`emptyInsights[${index}]`, text]);
  });

  entries.push(["ROOT_LAYOUT_DESCRIPTION", ROOT_LAYOUT_DESCRIPTION]);
  entries.push(["ISSUE_PATTERNS_CHART_TITLE", ISSUE_PATTERNS_CHART_TITLE]);

  for (const [key, text] of Object.entries(FLAG_REASON_THEMES_COPY)) {
    entries.push([`FLAG_REASON_THEMES_COPY.${key}`, text]);
  }

  for (const [key, text] of Object.entries(HIGH_RISK_CASES_COPY)) {
    entries.push([`HIGH_RISK_CASES_COPY.${key}`, text]);
  }

  return entries;
}

function assertCleanUserCopy(label: string, value: string): void {
  expect(value, `${label} must not contain forbidden flag wording`).not.toMatch(
    FORBIDDEN_FLAG
  );
  expect(value, `${label} must not mention trend report`).not.toMatch(
    FORBIDDEN_TREND_REPORT
  );
  expect(value, `${label} must not mention action needed`).not.toMatch(
    FORBIDDEN_ACTION_NEEDED
  );

  if (TREND_HEADING_ALLOWLIST.has(value)) {
    return;
  }

  expect(value, `${label} must not use bare 'trend'`).not.toMatch(
    FORBIDDEN_TREND_WORD
  );
}

describe("dashboard terminology (user-visible copy)", () => {
  it("scanned user-facing strings avoid forbidden terminology", () => {
    const scanned = collectScannedUserFacingStrings();
    expect(scanned.length).toBeGreaterThan(20);
    for (const [label, text] of scanned) {
      assertCleanUserCopy(label, text);
    }
  });

  it("allowlist permits PRD section headings when scanned exactly", () => {
    for (const heading of TREND_HEADING_ALLOWLIST) {
      expect(() => assertCleanUserCopy("allowlist", heading)).not.toThrow();
    }
    expect(() =>
      assertCleanUserCopy(
        "emptyInsights.sentiment",
        "No sentiment trend can be concluded from an empty set."
      )
    ).toThrow();
  });
});
