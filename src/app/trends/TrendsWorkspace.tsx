"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import { generateTrendsReportAction } from "@/app/trends/actions";
import { QUERY_COPY, type QueryFailureKind } from "@/lib/queries/query-status";
import type { TrendReport } from "@/lib/trends/types";
import { semanticCloudItems } from "@/lib/trends/word-cloud-layout";

interface TrendsWorkspaceProps {
  initialReport: TrendReport | null;
  autoGenerate: boolean;
  loadError?: string | null;
  loadFailureKind?: QueryFailureKind | null;
}

let autoGenerateStarted = false;

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const CHART_CAPTIONS = {
  flaggedReviews:
    "Count of flagged reviews per month. Taller bars mean more issues reached moderation that month.",
  flagsByReason:
    "Flag reasons are free-typed. Similar wording is grouped into themes. Quoted phrases are copied from the original reason text.",
  averageRating:
    "Mean star rating by month (1–5). The slope shows whether overall sentiment is improving or worsening.",
  ratingDistribution:
    "How many reviews landed on each star. A pile-up at 1★ is a safety/quality signal even when the monthly average looks fine.",
  keywordCloud:
    "Only sentiment, task, issue, and praise words are plotted. Larger, more central terms showed up more often in comments. Terms sit in four wedges: praise, task, issue, and sentiment.",
} as const;

export function TrendsWorkspace({
  initialReport,
  autoGenerate,
  loadError = null,
  loadFailureKind = null,
}: TrendsWorkspaceProps) {
  const router = useRouter();
  const [report, setReport] = useState<TrendReport | null>(initialReport);
  const [error, setError] = useState<string | null>(loadError);
  const [failureKind, setFailureKind] = useState<QueryFailureKind | null>(
    loadFailureKind
  );
  const [errorCopyKey, setErrorCopyKey] = useState<"trendReport" | "trendGenerate">(
    loadError ? "trendReport" : "trendGenerate"
  );
  const [persistWarning, setPersistWarning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function runGenerate() {
    setError(null);
    setFailureKind(null);
    setPersistWarning(null);
    setIsGenerating(true);
    try {
      const result = await generateTrendsReportAction();
      if (result.error || !result.data) {
        setError(result.error ?? "Failed to generate the trend report.");
        setFailureKind(result.failureKind ?? "error");
        setErrorCopyKey("trendGenerate");
        return;
      }
      setReport(result.data);
      setPersistWarning(result.persistWarning);
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (!autoGenerate) {
      return;
    }
    if (loadError) {
      router.replace("/trends");
      return;
    }
    if (initialReport) {
      router.replace("/trends");
      return;
    }
    if (autoGenerateStarted) {
      return;
    }
    autoGenerateStarted = true;
    const timeout = window.setTimeout(() => {
      void runGenerate().then(() => {
        router.replace("/trends");
      });
    }, 0);
    return () => window.clearTimeout(timeout);
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
        <div>
          <h2 className="text-2xl font-semibold text-tl-text">Trends</h2>
          <p className="mt-1 text-sm text-tl-muted">
            On-demand Gemini analysis. Review IDs and booking keys are removed
            first. Direct identifiers (emails, phone numbers, links) are removed
            before analysis. Remaining comments and flag reasons are sent to
            Google.
          </p>
          {report ? (
            <p className="mt-2 text-xs text-tl-muted">
              Analyzed with {report.modelUsed} · {formatGeneratedAt(report.generatedAt)} ·{" "}
              {report.aggregates.totalReviews} reviews ·{" "}
              {formatPercent(report.aggregates.flagRate)} flagged · avg rating{" "}
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
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-tl-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:bg-tl-muted disabled:hover:brightness-100"
        >
          {isGenerating ? (
            <>
              <QuerySpinner className="text-white" />
              {QUERY_COPY.trendGenerate.loading}
            </>
          ) : hasReport ? (
            "Regenerate trend report"
          ) : (
            "Generate trend report"
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {persistWarning}
        </div>
      ) : null}

      {isGenerating ? (
        <QueryCallStatus
          status="loading"
          message={QUERY_COPY.trendGenerate.loading}
        />
      ) : null}

      {!hasReport && !isGenerating && !error ? (
        <section className="rounded-[10px] border border-dashed border-tl-border bg-white p-8">
          <h3 className="text-lg font-medium text-tl-text">No trend report yet</h3>
          <p className="mt-2 max-w-2xl text-sm text-tl-muted">
            Click generate to analyze reviewer, rating, comment, flag, reason,
            created, and service date. Gemini writes explanations and an action
            plan. Flag trends, sentiment, keywords, and tables are calculated
            from the same rows on this server.
          </p>
        </section>
      ) : null}

      {report ? (
        <>
          <InsightsPanel insights={report.insights} showChange={showChange} />

          <HighRiskCases cases={report.highRiskCases ?? []} />

          <ChartCard
            title="Flag / issue trends"
            explanation={report.insights.flagTrendsExplanation}
            conclusions={report.insights.flagTrendsConclusions}
          >
            <BarChart
              data={report.aggregates.monthlyFlags.map((point) => ({
                label: point.month,
                value: point.flagged,
              }))}
              yLabel="Flagged reviews"
              caption={CHART_CAPTIONS.flaggedReviews}
            />
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-tl-muted">
                Flags by reason
              </p>
              <FlagReasonThemes
                themes={report.insights.flagReasonThemes}
                hasFlaggedReasons={report.aggregates.topReasons.length > 0}
                caption={CHART_CAPTIONS.flagsByReason}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Sentiment trends"
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
