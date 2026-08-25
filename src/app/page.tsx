import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ActionCards } from "@/components/dashboard/ActionCards";
import { AnalysisOverview } from "@/components/dashboard/AnalysisOverview";
import { DashboardReportList } from "@/components/dashboard/DashboardReportList";
import { DashboardReportListFilters } from "@/components/dashboard/DashboardReportListFilters";
import { FreshnessStatus } from "@/components/dashboard/FreshnessStatus";
import { PaginationBar } from "@/components/reviews/PaginationBar";
import {
  QueryFailureStatus,
  QueryLoadingStatus,
} from "@/components/ui/QueryCallStatus";
import { getAppTimeZone } from "@/lib/config/app-timezone";
import {
  DEFAULT_PAGE,
  mergeDashboardParams,
  parseDashboardParams,
  dashboardHref,
  type DashboardParams,
} from "@/lib/dashboard/search-params";
import type { PageSize } from "@/lib/reviews/search-params";
import { hasHighRiskCase } from "@/lib/trends/freshness-display";
import {
  buildDashboardListPresentation,
  getDashboardReportList,
  getHighRiskCount,
  getNewReportsTodayCount,
  getUnhandledReportsCount,
} from "@/lib/queries/dashboard";
import { computeFreshness } from "@/lib/trends/freshness";
import { loadLastTrendReport } from "@/lib/trends/persist";
import { resolveExpandedReviewId } from "@/lib/reviews/expanded-param";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const rawParams = await searchParams;
  const params = parseDashboardParams(rawParams);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50">
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<QueryLoadingStatus copyKey="trendReport" />}>
          <DashboardFreshnessSection />
        </Suspense>

        <Suspense fallback={<QueryLoadingStatus copyKey="dashboardStats" />}>
          <DashboardActionSection params={params} />
        </Suspense>

        {params.view ? (
          <Suspense fallback={<QueryLoadingStatus copyKey="flaggedReviews" />}>
            <DashboardReportSection params={params} />
          </Suspense>
        ) : null}

        <Suspense fallback={<QueryLoadingStatus copyKey="trendReport" />}>
          <DashboardAnalysisSection />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardFreshnessSection() {
  const appTimeZone = getAppTimeZone();
  const loaded = await loadLastTrendReport();
  const freshness = computeFreshness({
    lastSuccessAt: loaded.data?.generatedAt ?? null,
    now: new Date(),
    timeZone: appTimeZone,
  });

  return (
    <FreshnessStatus
      initialReport={loaded.data}
      initialFreshness={freshness}
      appTimeZone={appTimeZone}
      loadError={loaded.error}
      loadFailureKind={loaded.failureKind}
    />
  );
}

async function DashboardActionSection({ params }: { params: DashboardParams }) {
  const appTimeZone = getAppTimeZone();
  const loaded = await loadLastTrendReport();
  const searchTerms = loaded.data?.insights.highRiskCase?.searchTerms ?? null;
  const highRiskConfigured = hasHighRiskCase(loaded.data?.insights.highRiskCase);
  const analysisStale = computeFreshness({
    lastSuccessAt: loaded.data?.generatedAt ?? null,
    now: new Date(),
    timeZone: appTimeZone,
  }).isStale;

  const [todayResult, unhandledResult, highRiskResult] = await Promise.all([
    getNewReportsTodayCount(appTimeZone),
    getUnhandledReportsCount(),
    getHighRiskCount(searchTerms),
  ]);

  return (
    <ActionCards
      params={params}
      counts={{
        today: todayResult.error ? "—" : todayResult.count,
        unhandled: unhandledResult.error ? "—" : unhandledResult.count,
        highRisk: highRiskResult.error ? "—" : highRiskResult.count,
      }}
      countErrors={{
        today: Boolean(todayResult.error),
        unhandled: Boolean(unhandledResult.error),
        highRisk: Boolean(highRiskResult.error),
      }}
      analysisStale={analysisStale}
      highRiskConfigured={highRiskConfigured}
    />
  );
}

async function DashboardReportSection({ params }: { params: DashboardParams }) {
  if (!params.view) {
    return null;
  }

  const loaded = await loadLastTrendReport();
  const searchTerms = loaded.data?.insights.highRiskCase?.searchTerms ?? null;
  const highRiskConfigured = hasHighRiskCase(loaded.data?.insights.highRiskCase);
  const listResult = await getDashboardReportList(params, { searchTerms });

  if (listResult.totalCount > 0 && listResult.page !== params.page) {
    redirect(
      dashboardHref(mergeDashboardParams(params, { page: listResult.page }))
    );
  }

  const presentation = buildDashboardListPresentation(listResult);
  const expandedReviewId = resolveExpandedReviewId(
    listResult.reviews,
    params.expanded
  );

  const totalPages =
    listResult.totalCount > 0
      ? Math.ceil(listResult.totalCount / listResult.pageSize)
      : 1;
  const hasPrev = listResult.page > 1;
  const hasNext = listResult.page < totalPages;
  const showPageReset =
    params.page > DEFAULT_PAGE && listResult.totalCount === 0 && !listResult.error;

  function hrefForPage(page: number): string {
    return dashboardHref(mergeDashboardParams(params, { page }));
  }

  function hrefForPageSize(pageSize: PageSize): string {
    return dashboardHref(
      mergeDashboardParams(params, { page: DEFAULT_PAGE, pageSize })
    );
  }

  const pageSizeHrefs = {
    10: hrefForPageSize(10),
    25: hrefForPageSize(25),
    50: hrefForPageSize(50),
  } as const;

  return (
    <section aria-labelledby="dashboard-report-list" className="space-y-4">
      <h3 id="dashboard-report-list" className="text-lg font-medium text-zinc-900">
        Report list
      </h3>

      <DashboardReportListFilters params={params} />

      {presentation.primaryError ? (
        <QueryFailureStatus
          copyKey="flaggedReviews"
          kind={presentation.primaryFailureKind}
          detail={presentation.primaryError}
        />
      ) : null}

      {presentation.enrichmentError ? (
        <QueryFailureStatus
          copyKey="bookings"
          kind={presentation.enrichmentFailureKind}
          detail={presentation.enrichmentError}
        />
      ) : null}

      {presentation.showReviewList ? (
        <>
          <DashboardReportList
            view={params.view}
            reviews={listResult.reviews}
            bookings={listResult.bookings}
            bookingsError={presentation.enrichmentError}
            params={params}
            expandedReviewId={expandedReviewId}
            highRiskConfigured={highRiskConfigured}
          />
          <PaginationBar
            page={listResult.page}
            pageSize={listResult.pageSize}
            display={listResult.display}
            prevHref={hasPrev ? hrefForPage(listResult.page - 1) : undefined}
            nextHref={hasNext ? hrefForPage(listResult.page + 1) : undefined}
            resetHref={hrefForPage(DEFAULT_PAGE)}
            pageSizeHrefs={pageSizeHrefs}
            showPageReset={showPageReset}
          />
        </>
      ) : null}
    </section>
  );
}

async function DashboardAnalysisSection() {
  const appTimeZone = getAppTimeZone();
  const loaded = await loadLastTrendReport();
  const freshness = computeFreshness({
    lastSuccessAt: loaded.data?.generatedAt ?? null,
    now: new Date(),
    timeZone: appTimeZone,
  });

  return (
    <AnalysisOverview
      report={loaded.data}
      displayStatus={freshness.status}
      appTimeZone={appTimeZone}
    />
  );
}
