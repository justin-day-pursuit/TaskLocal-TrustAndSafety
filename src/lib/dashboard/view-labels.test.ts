import { describe, expect, it } from "vitest";

import {
  cardSignalForView,
  cardSignalText,
} from "@/lib/dashboard/card-signals";
import { toggleDashboardView, viewEmptyMessage } from "@/lib/dashboard/view-labels";

describe("toggleDashboardView", () => {
  it("opens a view when none is selected", () => {
    expect(toggleDashboardView(undefined, "today")).toBe("today");
  });

  it("closes the view when the same card is clicked again", () => {
    expect(toggleDashboardView("unhandled", "unhandled")).toBeUndefined();
  });

  it("swaps views without stacking lists", () => {
    expect(toggleDashboardView("today", "highRisk")).toBe("highRisk");
  });
});

describe("viewEmptyMessage", () => {
  it("names the active filter for unhandled reports", () => {
    expect(
      viewEmptyMessage("unhandled", { hasSearch: false, highRiskConfigured: false })
    ).toBe("No unhandled reports are waiting for review.");
  });

  it("explains high-risk no-match when terms exist but no rows match", () => {
    expect(
      viewEmptyMessage("highRisk", { hasSearch: false, highRiskConfigured: true })
    ).toBe("No reported reviews match the latest high-risk analysis terms.");
  });
});

describe("cardSignalForView", () => {
  it("shows attention when new reports exist", () => {
    expect(
      cardSignalForView("today", 2, {
        analysisStale: false,
        highRiskConfigured: false,
      })
    ).toBe("attention");
  });

  it("shows stale warning on high-risk card when analysis is stale", () => {
    expect(
      cardSignalForView("highRisk", 1, {
        analysisStale: true,
        highRiskConfigured: true,
      })
    ).toBe("stale-warning");
  });

  it("pairs signal text with icon labels for non-color-only cues", () => {
    expect(cardSignalText("high-risk")).toBe("High-risk matches");
    expect(cardSignalText("attention")).toBe("Needs attention");
  });
});
