import type { FreshnessDisplayStatus } from "@/lib/trends/freshness";
import type { HighRiskCase, HighRiskCasePayload } from "@/lib/trends/types";

export const FRESHNESS_STATUS_LABELS: Record<FreshnessDisplayStatus, string> = {
  current: "Current",
  stale: "Analysis due",
  generating: "Generating",
  generation_failed: "Generation failed",
};

export function freshnessStatusLabel(status: FreshnessDisplayStatus): string {
  return FRESHNESS_STATUS_LABELS[status];
}

export function formatLastSuccessAt(
  iso: string | null,
  timeZone: string
): string | null {
  if (!iso) {
    return null;
  }

  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function staleAnalysisMessage(): string {
  return "Analysis has not been generated since today's review cutoff.";
}

export function hasHighRiskCase(
  highRiskCase: HighRiskCase | undefined
): highRiskCase is HighRiskCasePayload {
  return highRiskCase !== null && highRiskCase !== undefined;
}
