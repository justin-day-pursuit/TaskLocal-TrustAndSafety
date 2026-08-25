import type { DashboardView } from "@/lib/dashboard/search-params";

export type DashboardCardSignal =
  | "attention"
  | "high-risk"
  | "stale-warning"
  | null;

export function cardSignalForView(
  view: DashboardView,
  count: number,
  options: { analysisStale: boolean; highRiskConfigured: boolean }
): DashboardCardSignal {
  switch (view) {
    case "today":
    case "unhandled":
      return count > 0 ? "attention" : null;
    case "highRisk":
      if (options.analysisStale && count > 0) {
        return "stale-warning";
      }
      if (count > 0) {
        return "high-risk";
      }
      if (options.analysisStale && options.highRiskConfigured) {
        return "stale-warning";
      }
      return null;
  }
}

export function cardSignalText(signal: DashboardCardSignal): string | null {
  switch (signal) {
    case "attention":
      return "Needs attention";
    case "high-risk":
      return "High-risk matches";
    case "stale-warning":
      return "Stale analysis";
    default:
      return null;
  }
}
