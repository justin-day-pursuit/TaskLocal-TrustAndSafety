import Link from "next/link";

import type { FreshnessDisplayStatus } from "@/lib/trends/freshness";
import {
  formatLastSuccessAt,
  freshnessStatusLabel,
  staleAnalysisMessage,
} from "@/lib/trends/freshness-display";
import type { TrendReport } from "@/lib/trends/types";

interface AnalysisOverviewProps {
  report: TrendReport | null;
  displayStatus: FreshnessDisplayStatus;
  appTimeZone: string;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-base text-zinc-600">{empty}</p>;
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-base text-zinc-800">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

export function AnalysisOverview({
  report,
  displayStatus,
  appTimeZone,
}: AnalysisOverviewProps) {
  if (!report) {
    return (
      <section
        aria-labelledby="dashboard-analysis-overview"
        className="rounded-lg border border-dashed border-zinc-300 bg-white p-6"
      >
        <h3
          id="dashboard-analysis-overview"
          className="text-lg font-medium text-zinc-900"
        >
          Analysis overview
        </h3>
        <p className="mt-2 max-w-2xl text-base text-zinc-600">
          Generate analysis to see an executive brief, changes since the last
          report, issue trends, and sentiment trends here.
        </p>
      </section>
    );
  }

  const formattedGeneratedAt = formatLastSuccessAt(report.generatedAt, appTimeZone);
  const freshnessLabel = freshnessStatusLabel(displayStatus);
  const showChange = report.insights.changeSinceLast.hasPrevious;

  return (
    <section aria-labelledby="dashboard-analysis-overview" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3
          id="dashboard-analysis-overview"
          className="text-lg font-medium text-zinc-900"
        >
          Analysis overview
        </h3>
        <p className="text-sm text-zinc-600">
          {formattedGeneratedAt ? (
            <>
              Generated {formattedGeneratedAt} ({appTimeZone}) ·{" "}
              <span className="font-medium text-zinc-900">{freshnessLabel}</span>
            </>
          ) : (
            <span className="font-medium text-zinc-900">{freshnessLabel}</span>
          )}
        </p>
      </div>

      {displayStatus === "stale" ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span aria-hidden="true">!</span>
          <span>{staleAnalysisMessage()}</span>
        </p>
      ) : null}

      <div className="grid gap-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-medium text-zinc-900">Executive brief</h4>
          <div className="mt-4 grid gap-6 lg:grid-cols-3">
            <div>
              <h5 className="text-sm font-semibold text-zinc-900">Going well</h5>
              <div className="mt-2">
                <BulletList
                  items={report.insights.goingWell}
                  empty="No strengths called out for this run."
                />
              </div>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-zinc-900">
                Needs attention
              </h5>
              <div className="mt-2">
                <BulletList
                  items={report.insights.needsWork}
                  empty="No issues called out for this run."
                />
              </div>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-zinc-900">
                Recommended actions
              </h5>
              <div className="mt-2">
                <BulletList
                  items={report.insights.actionPlan}
                  empty="No actions recommended for this run."
                />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-medium text-zinc-900">
            Changes since last report
          </h4>
          {showChange ? (
            <>
              <p className="mt-1 text-sm text-zinc-600">
                {report.insights.changeSinceLast.newReviewCount} new review
                {report.insights.changeSinceLast.newReviewCount === 1 ? "" : "s"}{" "}
                since the previous run.
              </p>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <div>
                  <h5 className="text-sm font-semibold text-zinc-900">Changes</h5>
                  <div className="mt-2">
                    <BulletList
                      items={report.insights.changeSinceLast.whatChanged}
                      empty="No material change described."
                    />
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-zinc-900">
                    Emerging patterns
                  </h5>
                  <div className="mt-2">
                    <BulletList
                      items={report.insights.changeSinceLast.emergingTrends}
                      empty="No emerging patterns described."
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-base text-zinc-600">
              This is the first analysis report — there is no prior report to
              compare against yet.
            </p>
          )}
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-medium text-zinc-900">Issue trends</h4>
          <p className="mt-2 text-base text-zinc-800">
            {report.insights.flagTrendsExplanation}
          </p>
          <p className="mt-3 text-base text-zinc-700">
            {report.insights.flagTrendsConclusions}
          </p>
          {report.insights.flagReasonThemes.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-zinc-800">
              {report.insights.flagReasonThemes.map((theme) => (
                <li key={theme.theme}>
                  <span className="font-medium">{theme.theme}</span>: {theme.meaning}
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-medium text-zinc-900">Sentiment trends</h4>
          <p className="mt-2 text-base text-zinc-800">
            {report.insights.sentimentExplanation}
          </p>
          <p className="mt-3 text-base text-zinc-700">
            {report.insights.sentimentOverallLabel}.{" "}
            {report.insights.sentimentConclusions}
          </p>
        </article>
      </div>

      <p className="text-sm text-zinc-600">
        Full charts and grounding tables are available on the{" "}
        <Link href="/trends" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
          Analysis
        </Link>{" "}
        page.
      </p>
    </section>
  );
}
