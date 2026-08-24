import { Suspense } from "react";
import { redirect } from "next/navigation";

import { FlaggedQueueTable } from "@/components/flagged/FlaggedQueueTable";
import {
  parseReviewerRoleFilter,
  reviewerRoleFromFilter,
  ReviewerRoleTabs,
} from "@/components/flagged/ReviewerRoleTabs";
import { PaginationBar } from "@/components/reviews/PaginationBar";
import {
  QueryFailureStatus,
  QueryLoadingStatus,
} from "@/components/ui/QueryCallStatus";
import { getFlaggedReviewsPaginated } from "@/lib/queries/review-catalog";
import { resolveExpandedReviewId } from "@/lib/reviews/expanded-param";
import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";
import {
  buildActionNeededHref,
  DEFAULT_PAGE,
  parseActionNeededListParams,
  type ActionNeededListParams,
  type PageSize,
} from "@/lib/reviews/search-params";

export const dynamic = "force-dynamic";

interface ActionNeededPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function mergeActionNeededListParams(
  current: ActionNeededListParams,
  updates: Partial<ActionNeededListParams>
): ActionNeededListParams {
  const next: ActionNeededListParams = { ...current, ...updates };
  if ("role" in updates && updates.role !== current.role) {
    next.page = DEFAULT_PAGE;
  }
  return next;
}

export default async function ActionNeededPage({
  searchParams,
}: ActionNeededPageProps) {
  const rawParams = await searchParams;
  const listParams = parseActionNeededListParams(rawParams);
  const roleFilter = parseReviewerRoleFilter(rawParams.role);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">
              Action needed
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Open flagged reviews waiting to be resolved, oldest first
            </p>
          </div>
          <ReviewerRoleTabs active={roleFilter} listParams={listParams} />
        </div>
      </div>

      <Suspense fallback={<QueryLoadingStatus copyKey="flaggedReviews" />}>
        <ActionNeededResults listParams={listParams} roleFilter={roleFilter} />
      </Suspense>
    </div>
  );
}

async function ActionNeededResults({
  listParams,
  roleFilter,
}: {
  listParams: ActionNeededListParams;
  roleFilter: ReturnType<typeof parseReviewerRoleFilter>;
}) {
  const reviewerRole = reviewerRoleFromFilter(roleFilter);

  const result = await getFlaggedReviewsPaginated({
    reviewerRole,
    page: listParams.page,
    pageSize: listParams.pageSize,
  });

  if (result.totalCount > 0 && result.page !== listParams.page) {
    redirect(
      buildActionNeededHref(
        mergeActionNeededListParams(listParams, { page: result.page })
      )
    );
  }

  const presentation = buildReviewListPresentation(
    result.error ? null : result.reviews,
    result.error,
    result.error
      ? null
      : {
          data: result.bookings,
          error: result.bookingsError,
          failureKind: result.bookingsFailureKind,
        },
    result.failureKind
  );
  const expandedReviewId = resolveExpandedReviewId(
    result.reviews,
    listParams.expanded
  );

  const showPageReset =
    listParams.page > DEFAULT_PAGE &&
    result.totalCount === 0 &&
    !result.error;

  function hrefForPage(page: number): string {
    return buildActionNeededHref(
      mergeActionNeededListParams(listParams, { page })
    );
  }

  function hrefForPageSize(pageSize: PageSize): string {
    return buildActionNeededHref(
      mergeActionNeededListParams(listParams, {
        page: DEFAULT_PAGE,
        pageSize,
      })
    );
  }

  const totalPages =
    result.totalCount > 0
      ? Math.ceil(result.totalCount / result.pageSize)
      : 1;
  const hasPrev = result.page > 1;
  const hasNext = result.page < totalPages;

  const pageSizeHrefs = {
    10: hrefForPageSize(10),
    25: hrefForPageSize(25),
    50: hrefForPageSize(50),
  } as const;

  return (
    <>
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
          <div className="min-h-[12rem] flex-1 overflow-y-auto">
            <FlaggedQueueTable
              reviews={result.reviews}
              bookings={result.bookings}
              bookingsError={presentation.enrichmentError}
              repeatFlagCounts={presentation.repeatFlagCounts}
              listParams={listParams}
              expandedReviewId={expandedReviewId}
              emptyMessage="No flagged reviews found."
            />
          </div>
          <div className="shrink-0">
            <PaginationBar
              page={result.page}
              pageSize={result.pageSize}
              display={result.display}
              prevHref={hasPrev ? hrefForPage(result.page - 1) : undefined}
              nextHref={hasNext ? hrefForPage(result.page + 1) : undefined}
              resetHref={hrefForPage(DEFAULT_PAGE)}
              pageSizeHrefs={pageSizeHrefs}
              showPageReset={showPageReset}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
