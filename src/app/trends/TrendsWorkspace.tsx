"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BarChart } from "@/components/trends/BarChart";
import { ChartCard } from "@/components/trends/ChartCard";
import { GroundingTables } from "@/components/trends/GroundingTables";
import { InsightsPanel } from "@/components/trends/InsightsPanel";
import { LineChart } from "@/components/trends/LineChart";
import { WordCloud } from "@/components/trends/WordCloud";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { generateTrendsReportAction } from "@/app/trends/actions";
import type { TrendReport } from "@/lib/trends/types";

interface TrendsWorkspaceProps {
  initialReport: TrendReport | null;
  autoGenerate: boolean;
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

function truncateLabel(label: string, max = 16): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, max)}…`;
}

export function TrendsWorkspace({
  initialReport,
  autoGenerate,
}: TrendsWorkspaceProps) {
  const router = useRouter();
  const [report, setReport] = useState<TrendReport | null>(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [persistWarning, setPersistWarning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function runGenerate() {
    setError(null);
    setPersistWarning(null);
    setIsGenerating(true);
    try {
      const result = await generateTrendsReportAction();
      if (result.error || !result.data) {
        setError(result.error ?? "Failed to generate the trend report.");
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
  }, [autoGenerate, initialReport, router]);

  const hasReport = report !== null;
  const showChange = Boolean(report?.insights.changeSinceLast.hasPrevious);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Trends</h2>
          <p className="mt-1 text-sm text-zinc-500">
            On-demand Gemini analysis. Review IDs and booking keys are removed
            first. Comments and flag reasons are sent to Google and may contain
            personal details.
          </p>
          {report ? (
            <p className="mt-2 text-xs text-zinc-500">
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
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isGenerating
            ? "Generating…"
            : hasReport
              ? "Regenerate trend report"
              : "Generate trend report"}
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {persistWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {persistWarning}
        </div>
      ) : null}

      {isGenerating ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
          Analyzing stripped reviews with Gemini. This can take a minute. Chart
          numbers are computed locally so they stay grounded in the dataset.
        </div>
      ) : null}

      {!hasReport && !isGenerating ? (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8">
          <h3 className="text-lg font-medium text-zinc-900">No trend report yet</h3>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
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
            />
            {report.aggregates.topReasons.length > 0 ? (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Flags by reason
                </p>
                <BarChart
                  data={report.aggregates.topReasons.map((point) => ({
                    label: truncateLabel(point.reason),
                    value: point.count,
                  }))}
                  yLabel="Count"
                />
              </div>
            ) : null}
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
            />
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Rating distribution
              </p>
              <BarChart
                data={report.aggregates.ratingDistribution.map((point) => ({
                  label: `${point.rating}★`,
                  value: point.count,
                }))}
                yLabel="Reviews"
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Repeated keywords in comments"
            explanation={report.insights.keywordsExplanation}
          >
            <WordCloud keywords={report.aggregates.topKeywords} />
            {report.insights.keywordThemes.length > 0 ? (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                {report.insights.keywordThemes.map((theme, index) => (
                  <li key={`${theme.term}-${index}`}>
                    <span className="font-medium text-zinc-800">{theme.term}</span>
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
