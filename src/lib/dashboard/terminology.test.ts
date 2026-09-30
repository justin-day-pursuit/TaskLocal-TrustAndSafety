import { describe, expect, it } from "vitest";

import { ISSUE_PATTERNS_CHART_TITLE } from "@/app/analysis/AnalysisWorkspace";
import {
  FLAG_REASON_THEMES_COPY,
} from "@/components/trends/FlagReasonThemes";
import { HIGH_RISK_CASES_COPY } from "@/components/trends/HighRiskCases";
import { QUERY_COPY } from "@/lib/queries/query-status";

const FORBIDDEN_FLAG = /\bflag(ged)?\b/i;
const FORBIDDEN_TREND_REPORT = /trend report/i;
const FORBIDDEN_ACTION_NEEDED = /action needed/i;

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
}

describe("dashboard terminology (user-visible copy)", () => {
  it("QUERY_COPY status strings avoid forbidden terminology", () => {
    for (const [key, messages] of Object.entries(QUERY_COPY)) {
      for (const [phase, text] of Object.entries(messages)) {
        assertCleanUserCopy(`${key}.${phase}`, text);
      }
    }
  });

  it("analysis and high-risk UI literals avoid forbidden terminology", () => {
    assertCleanUserCopy(
      "ISSUE_PATTERNS_CHART_TITLE",
      ISSUE_PATTERNS_CHART_TITLE
    );
    for (const [key, text] of Object.entries(FLAG_REASON_THEMES_COPY)) {
      assertCleanUserCopy(`FLAG_REASON_THEMES_COPY.${key}`, text);
    }
    for (const [key, text] of Object.entries(HIGH_RISK_CASES_COPY)) {
      assertCleanUserCopy(`HIGH_RISK_CASES_COPY.${key}`, text);
    }
  });
});
