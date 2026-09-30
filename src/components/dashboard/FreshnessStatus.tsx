"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { generateAnalysisReportAction } from "@/app/analysis/actions";
import {
  QueryCallStatus,
  QueryFailureStatus,
  QuerySpinner,
} from "@/components/ui/QueryCallStatus";
import { QUERY_COPY, type QueryFailureKind } from "@/lib/queries/query-status";
import type { FreshnessDisplayStatus, FreshnessResult } from "@/lib/trends/freshness";
import {
  formatLastSuccessAt,
  freshnessStatusLabel,
  staleAnalysisMessage,
} from "@/lib/trends/freshness-display";
import type { TrendReport } from "@/lib/trends/types";

interface FreshnessStatusProps {
  initialReport: TrendReport | null;
  initialFreshness: FreshnessResult;
  appTimeZone: string;
  loadError?: string | null;
  loadFailureKind?: QueryFailureKind | null;
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
      return "border-emerald-300 bg-emerald-50 text-emerald-950";
    case "stale":
      return "border-amber-400 bg-amber-50 text-amber-950";
    case "generating":
      return "border-sky-300 bg-sky-50 text-sky-950";
    case "generation_failed":
      return "border-red-300 bg-red-50 text-red-950";
  }
}

function deriveDisplayStatus(
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

export function FreshnessStatus({
  initialReport,
  initialFreshness,
  appTimeZone,
  loadError = null,
  loadFailureKind = null,
}: FreshnessStatusProps) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [freshness, setFreshness] = useState(initialFreshness);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const [failureKind, setFailureKind] = useState<QueryFailureKind | null>(
    loadFailureKind
  );
  const [persistWarning, setPersistWarning] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const displayStatus = deriveDisplayStatus(
    freshness,
    isGenerating,
    generationFailed
  );
  const label = freshnessStatusLabel(displayStatus);
  const formattedLastSuccess = formatLastSuccessAt(
    report?.generatedAt ?? null,
    appTimeZone
  );
  const showStaleMessage = displayStatus === "stale";

  async function runGenerate() {
    setError(null);
    setFailureKind(null);
    setPersistWarning(null);
    setGenerationFailed(false);
    setIsGenerating(true);

    try {
      const result = await generateAnalysisReportAction();
      if (result.error || !result.data) {
        setError(result.error ?? "Failed to generate the analysis report.");
        setFailureKind(result.failureKind ?? "error");
        setGenerationFailed(true);
        return;
      }

      setReport(result.data);
      setFreshness({
        status: "current",
        isStale: false,
        latestCutoffISO: freshness.latestCutoffISO,
      });
      setPersistWarning(result.persistWarning);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section
      aria-labelledby="dashboard-analysis-controls"
      className="rounded-lg border border-zinc-300 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <h2
            id="dashboard-analysis-controls"
            className="text-[1.875rem] font-semibold leading-tight text-zinc-900"
          >
            Dashboard
          </h2>
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
                <span className="text-sm text-zinc-600">
                  Last successful generation: {formattedLastSuccess} ({appTimeZone})
                </span>
              ) : (
                <span className="text-sm text-zinc-600">
                  No successful analysis yet
                </span>
              )}
            </div>
            {showStaleMessage ? (
              <p className="flex items-start gap-2 text-sm text-amber-950">
                <span aria-hidden="true" className="font-semibold">
                  !
                </span>
                <span>{staleAnalysisMessage()}</span>
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void runGenerate();
          }}
          disabled={isGenerating}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isGenerating ? (
            <>
              <QuerySpinner className="text-white" />
              {QUERY_COPY.trendGenerate.loading}
            </>
          ) : report ? (
            "Regenerate analysis"
          ) : (
            "Generate analysis"
          )}
        </button>
      </div>

      {error ? (
        <div className="mt-4">
          <QueryFailureStatus
            copyKey="trendGenerate"
            kind={failureKind}
            detail={error}
          />
        </div>
      ) : null}

      {persistWarning ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {persistWarning}
        </div>
      ) : null}

      {isGenerating ? (
        <div className="mt-4">
          <QueryCallStatus
            status="loading"
            message={QUERY_COPY.trendGenerate.loading}
          />
        </div>
      ) : null}
    </section>
  );
}
