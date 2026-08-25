import type { DashboardView } from "@/lib/dashboard/search-params";

export function viewFilterLabel(view: DashboardView): string {
  switch (view) {
    case "today":
      return "New reports today";
    case "unhandled":
      return "Total unhandled reports";
    case "highRisk":
      return "High-risk case";
  }
}

export function viewEmptyMessage(
  view: DashboardView,
  options: { hasSearch: boolean; highRiskConfigured: boolean }
): string {
  if (options.hasSearch) {
    return `No reported reviews match your search in ${viewFilterLabel(view).toLowerCase()}.`;
  }

  switch (view) {
    case "today":
      return "No new reports were filed today.";
    case "unhandled":
      return "No unhandled reports are waiting for review.";
    case "highRisk":
      if (!options.highRiskConfigured) {
        return "The latest analysis did not identify a high-risk case to match.";
      }
      return "No reported reviews match the latest high-risk analysis terms.";
  }
}

export function toggleDashboardView(
  current: DashboardView | undefined,
  next: DashboardView
): DashboardView | undefined {
  return current === next ? undefined : next;
}
