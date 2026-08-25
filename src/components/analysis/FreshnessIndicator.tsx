import type { FreshnessDisplayStatus, FreshnessResult } from "@/lib/trends/freshness";
import {
  formatLastSuccessAt,
  freshnessStatusLabel,
  staleAnalysisMessage,
} from "@/lib/trends/freshness-display";

interface FreshnessIndicatorProps {
  displayStatus: FreshnessDisplayStatus;
  lastSuccessAt: string | null;
  timeZone: string;
}

function statusIcon(status: FreshnessDisplayStatus): string {
  switch (status) {
    case "current":
      return "✓";
    case "stale":
      return "!";
    case "generating":
      return "…";
    case "generation_failed":
      return "×";
  }
}

function statusClassName(status: FreshnessDisplayStatus): string {
  switch (status) {
    case "current":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "stale":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "generating":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "generation_failed":
      return "border-red-200 bg-red-50 text-red-900";
  }
}

export function FreshnessIndicator({
  displayStatus,
  lastSuccessAt,
  timeZone,
}: FreshnessIndicatorProps) {
  const label = freshnessStatusLabel(displayStatus);
  const formattedLastSuccess = formatLastSuccessAt(lastSuccessAt, timeZone);
  const isStale = displayStatus === "stale";

  return (
    <div
      className="space-y-2"
      role="status"
      aria-live="polite"
      aria-label={`Analysis freshness: ${label}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${statusClassName(displayStatus)}`}
        >
          <span aria-hidden="true">{statusIcon(displayStatus)}</span>
          <span>{label}</span>
        </span>
        {formattedLastSuccess ? (
          <span className="text-sm text-tl-muted">
            Last successful generation: {formattedLastSuccess} ({timeZone})
          </span>
        ) : (
          <span className="text-sm text-tl-muted">
            No successful analysis yet
          </span>
        )}
      </div>
      {isStale ? (
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <span aria-hidden="true" className="font-semibold">
            !
          </span>
          <span>{staleAnalysisMessage()}</span>
        </p>
      ) : null}
    </div>
  );
}

export function deriveFreshnessDisplayStatus(
  persisted: FreshnessResult,
  isGenerating: boolean,
  generationFailed: boolean
): FreshnessDisplayStatus {
  if (isGenerating) {
    return "generating";
  }
  if (generationFailed) {
    return "generation_failed";
  }
  return persisted.status;
}
