"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { generateAnalysisReportAction } from "@/app/analysis/actions";
import {
  deriveFreshnessDisplayStatus,
  FreshnessIndicator,
} from "@/components/analysis/FreshnessIndicator";
import { HighRiskCaseSummary } from "@/components/analysis/HighRiskCaseSummary";
import { BarChart } from "@/components/trends/BarChart";
import { ChartCard } from "@/components/trends/ChartCard";
import { FlagReasonThemes } from "@/components/trends/FlagReasonThemes";
import { GroundingTables } from "@/components/trends/GroundingTables";
import { HighRiskCases } from "@/components/trends/HighRiskCases";
import { InsightsPanel } from "@/components/trends/InsightsPanel";
import { LineChart } from "@/components/trends/LineChart";
import { WordCloud } from "@/components/trends/WordCloud";
import {
  QueryCallStatus,
  QueryFailureStatus,
  QuerySpinner,
} from "@/components/ui/QueryCallStatus";
import { QUERY_COPY, type QueryFailureKind } from "@/lib/queries/query-status";
import {
  computeFreshness,
  type FreshnessResult,
} from "@/lib/trends/freshness";
import type { TrendReport } from "@/lib/trends/types";
import { semanticCloudItems } from "@/lib/trends/word-cloud-layout";

interface AnalysisWorkspaceProps {
  initialReport: TrendReport | null;
  initialFreshness: FreshnessResult;
  appTimeZone: string;
  autoGenerate: boolean;
  loadError?: string | null;
  loadFailureKind?: QueryFailureKind | null;
}

let autoGenerateStarted = false;

function formatGeneratedAt(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const ISSUE_PATTERNS_CHART_TITLE = "Issue patterns";

const CHART_CAPTIONS = {
  flaggedReviews:
    "Count of reported reviews per month. Taller bars mean more issues reached moderation that month.",
  flagsByReason:
    "Report reasons are free-typed. Similar wording is grouped into themes. Quoted phrases are copied from the original reason text.",
  averageRating:
    "Mean star rating by month (1–5). The slope shows whether overall sentiment is improving or worsening.",
  ratingDistribution:
    "How many reviews landed on each star. A pile-up at 1★ is a safety/quality signal even when the monthly average looks fine.",
  keywordCloud:
    "Only sentiment, task, issue, and praise words are plotted. Larger, more central terms showed up more often in comments. Terms sit in four wedges: praise, task, issue, and sentiment.",
} as const;

export function AnalysisWorkspace({
  initialReport,
  initialFreshness,
  appTimeZone,
  autoGenerate,
  loadError = null,
  loadFailureKind = null,
}: AnalysisWorkspaceProps) {
  const router = useRouter();
  const [report, setReport] = useState<TrendReport | null>(initialReport);
  const [freshness, setFreshness] = useState<FreshnessResult>(initialFreshness);
  const [error, setError] = useState<string | null>(loadError);
  const [failureKind, setFailureKind] = useState<QueryFailureKind | null>(
    loadFailureKind
  );
  const [errorCopyKey, setErrorCopyKey] = useState<
    "analysisReport" | "analysisGenerate"
  >(loadError ? "analysisReport" : "analysisGenerate");
  const [persistWarning, setPersistWarning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);

  const lastSuccessAt = report?.generatedAt ?? null;

  const displayStatus = useMemo(
    () =>
      deriveFreshnessDisplayStatus(freshness, isGenerating, generationFailed),
    [freshness, generationFailed, isGenerating]
  );

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
        setErrorCopyKey("analysisGenerate");
        setGenerationFailed(true);
        return;
      }
      setReport(result.data);
      setPersistWarning(result.persistWarning);
      setFreshness(
        computeFreshness({
          lastSuccessAt: result.data.generatedAt,
          now: new Date(),
          timeZone: appTimeZone,
        })
      );
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!autoGenerate) {
      return;
    }
    if (loadError) {
      router.replace("/analysis");
      return;
    }
    if (initialReport) {
      router.replace("/analysis");
      return;
    }
    if (autoGenerateStarted) {
      return;
    }
    autoGenerateStarted = true;
    const timeout = window.setTimeout(() => {
      void runGenerate().then(() => {
        router.replace("/analysis");
      });
    }, 0);
    return () => window.clearTimeout(timeout);
    // runGenerate intentionally omitted: one-shot auto-generate on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, initialReport, loadError, router]);

  const hasReport = report !== null;
  const showChange = Boolean(report?.insights.changeSinceLast.hasPrevious);
  const cloudItems = report
    ? semanticCloudItems(
        report.insights.keywordThemes,
        report.aggregates.topKeywords
      )
    : [];
  const hasLocalOrThemeKeywords = Boolean(
    report &&
      (report.aggregates.topKeywords.length > 0 ||
        report.insights.keywordThemes.length > 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold text-tl-text">Analysis</h2>
            <p className="mt-1 text-sm text-tl-muted">
              On-demand Gemini analysis. Review IDs and booking keys are removed
              first. Direct identifiers (emails, phone numbers, links) are
              removed before analysis. Remaining comments and report reasons are
              sent to Google.
            </p>
          </div>
          <FreshnessIndicator
            displayStatus={displayStatus}
            lastSuccessAt={lastSuccessAt}
            timeZone={appTimeZone}
          />
          {report ? (
            <p className="text-xs text-tl-muted">
              Analyzed with {report.modelUsed} ·{" "}
              {formatGeneratedAt(report.generatedAt, appTimeZone)} ·{" "}
              {report.aggregates.totalReviews} reviews ·{" "}
              {formatPercent(report.aggregates.flagRate)} reported · avg rating{" "}
              {report.aggregates.averageRating.toFixed(2)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            void runGenerate();
          }}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-tl-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tl-primary disabled:cursor-not-allowed disabled:bg-tl-muted disabled:hover:brightness-100"
        >
          {isGenerating ? (
            <>
              <QuerySpinner className="text-white" />
              {QUERY_COPY.analysisGenerate.loading}
            </>
          ) : hasReport ? (
            "Regenerate analysis"
          ) : (
            "Generate analysis"
          )}
        </button>
      </div>

      {error ? (
        <QueryFailureStatus
          copyKey={errorCopyKey}
          kind={failureKind}
          detail={error}
        />
      ) : null}
      {persistWarning ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="status"
        >
          {persistWarning}
        </div>
      ) : null}

      {isGenerating ? (
        <QueryCallStatus
          status="loading"
          message={QUERY_COPY.analysisGenerate.loading}
        />
      ) : null}

      {!hasReport && !isGenerating && !error ? (
        <section className="rounded-[10px] border border-dashed border-tl-border bg-white p-8">
          <h3 className="text-lg font-medium text-tl-text">
            No analysis report yet
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-tl-muted">
            Click generate to analyze reviewer, rating, comment, report, reason,
            created, and service date. Gemini writes explanations and an action
            plan. Issue patterns, sentiment, keywords, and tables are calculated
            from the same rows on this server.
          </p>
        </section>
      ) : null}

      {report ? (
        <>
          <InsightsPanel insights={report.insights} showChange={showChange} />

          <HighRiskCaseSummary
            highRiskCase={report.insights.highRiskCase}
            isStale={freshness.isStale}
          />

          <HighRiskCases cases={report.highRiskCases ?? []} />

          <ChartCard
            title={ISSUE_PATTERNS_CHART_TITLE}
            explanation={report.insights.flagTrendsExplanation}
            conclusions={report.insights.flagTrendsConclusions}
          >
            <BarChart
              data={report.aggregates.monthlyFlags.map((point) => ({
                label: point.month,
                value: point.flagged,
              }))}
              yLabel="Reported reviews"
              caption={CHART_CAPTIONS.flaggedReviews}
            />
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tl-muted">
                Reports by reason
              </p>
              <FlagReasonThemes
                themes={report.insights.flagReasonThemes}
                hasFlaggedReasons={report.aggregates.topReasons.length > 0}
                caption={CHART_CAPTIONS.flagsByReason}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Sentiment over time"
            explanation={report.insights.sentimentExplanation}
            conclusions={`${report.insights.sentimentOverallLabel}. ${report.insights.sentimentConclusions}`}
          >
            <LineChart
              data={report.aggregates.monthlySentiment.map((point) => ({
                label: point.month,
                value: point.averageRating,
              }))}
              yLabel="Average rating"
              yMin={1}
              yMax={5}
              valueFormat={(value) => value.toFixed(1)}
              caption={CHART_CAPTIONS.averageRating}
            />
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tl-muted">
                Rating distribution
              </p>
              <BarChart
                data={report.aggregates.ratingDistribution.map((point) => ({
                  label: `${point.rating}★`,
                  value: point.count,
                }))}
                yLabel="Reviews"
                caption={CHART_CAPTIONS.ratingDistribution}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Repeated keywords in comments"
            explanation={report.insights.keywordsExplanation}
          >
            {cloudItems.length > 0 ? (
              <WordCloud
                items={cloudItems}
                caption={CHART_CAPTIONS.keywordCloud}
              />
            ) : (
              <p className="text-sm text-tl-muted">
                {hasLocalOrThemeKeywords
                  ? "Regenerate to build the semantic keyword cloud"
                  : "No repeated comment keywords to display yet."}
              </p>
            )}
            {report.insights.keywordThemes.length > 0 ? (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-tl-muted">
                {report.insights.keywordThemes.map((theme, index) => (
                  <li key={`${theme.term}-${index}`}>
                    <span className="font-medium text-tl-text">{theme.term}</span>
                    {": "}
                    {theme.meaning}
                  </li>
                ))}
              </ul>
            ) : null}
          </ChartCard>

          <GroundingTables
            monthlyFlags={report.aggregates.monthlyFlags}
            topReasons={report.aggregates.topReasons}
            topKeywords={report.aggregates.topKeywords}
            sample={report.groundingSample}
          />
        </>
      ) : null}
    </div>
  );
}
