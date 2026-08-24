import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ReviewsCatalogShell } from "@/components/reviews/ReviewsCatalogShell";
import { PaginationBar } from "@/components/reviews/PaginationBar";
import { PostgrestCapNote } from "@/components/reviews/PostgrestCapNote";
import { ReviewsCatalogTable } from "@/components/reviews/ReviewsCatalogTable";
import {
  QueryFailureStatus,
  QueryLoadingStatus,
} from "@/components/ui/QueryCallStatus";
import { getReviewCatalog } from "@/lib/queries/review-catalog";
import { resolveExpandedReviewId } from "@/lib/reviews/expanded-param";
import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";
import {
  DEFAULT_PAGE,
  mergeReviewsCatalogParams,
  parseReviewsCatalogParams,
  requiresBookingFirstQuery,
  reviewsHref,
  type PageSize,
  type ReviewsCatalogParams,
} from "@/lib/reviews/search-params";

export const dynamic = "force-dynamic";

interface ReviewsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const rawParams = await searchParams;
  const catalogParams = parseReviewsCatalogParams(rawParams);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h2 className="text-2xl font-semibold text-zinc-900">Reviews</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Full catalog of marketplace reviews — search, filter, and sort across
          review and booking fields.
        </p>
      </div>

      <ReviewsCatalogShell params={catalogParams}>
        <Suspense fallback={<QueryLoadingStatus copyKey="reviewsCatalog" />}>
          <ReviewsCatalogResults params={catalogParams} />
        </Suspense>
      </ReviewsCatalogShell>
    </div>
  );
}

async function ReviewsCatalogResults({
  params,
}: {
  params: ReviewsCatalogParams;
}) {
  const catalog = await getReviewCatalog(params);

  if (catalog.totalCount > 0 && catalog.page !== params.page) {
    redirect(
      reviewsHref(mergeReviewsCatalogParams(params, { page: catalog.page }))
    );
  }

  const presentation = buildReviewListPresentation(
    catalog.error ? null : catalog.reviews,
    catalog.error,
    catalog.error
      ? null
      : {
          data: catalog.bookings,
          error: catalog.bookingsError,
          failureKind: catalog.bookingsFailureKind,
        },
    catalog.failureKind
  );
  const expandedReviewId = resolveExpandedReviewId(
    catalog.reviews,
    params.expanded
  );

  const showCapNote =
    requiresBookingFirstQuery(params) && catalog.postgrestCapHit;

  const showPageReset =
    params.page > DEFAULT_PAGE && catalog.totalCount === 0 && !catalog.error;

  function hrefForPage(page: number): string {
    return reviewsHref(mergeReviewsCatalogParams(params, { page }));
  }

  function hrefForPageSize(pageSize: PageSize): string {
    return reviewsHref(
      mergeReviewsCatalogParams(params, {
        page: DEFAULT_PAGE,
        pageSize,
      })
    );
  }

  const totalPages =
    catalog.totalCount > 0
      ? Math.ceil(catalog.totalCount / catalog.pageSize)
      : 1;
  const hasPrev = catalog.page > 1;
  const hasNext = catalog.page < totalPages;

  const pageSizeHrefs = {
    10: hrefForPageSize(10),
    25: hrefForPageSize(25),
    50: hrefForPageSize(50),
  } as const;

  return (
    <>
      {showCapNote ? (
        <div className="mt-3">
          <PostgrestCapNote visible />
        </div>
      ) : null}

      {presentation.primaryError ? (
        <div className="mt-3">
          <QueryFailureStatus
            copyKey="reviewsCatalog"
            kind={presentation.primaryFailureKind}
            detail={presentation.primaryError}
          />
        </div>
      ) : null}
      {presentation.enrichmentError ? (
        <div className="mt-3">
          <QueryFailureStatus
            copyKey="bookings"
            kind={presentation.enrichmentFailureKind}
            detail={presentation.enrichmentError}
          />
        </div>
      ) : null}

      {presentation.showReviewList ? (
        <>
          <div className="min-h-[12rem] flex-1 overflow-y-auto">
            <ReviewsCatalogTable
              reviews={catalog.reviews}
              bookings={catalog.bookings}
              bookingsError={presentation.enrichmentError}
              listParams={params}
              expandedReviewId={expandedReviewId}
            />
          </div>
          <div className="shrink-0">
            <PaginationBar
              page={catalog.page}
              pageSize={catalog.pageSize}
              display={catalog.display}
              prevHref={hasPrev ? hrefForPage(catalog.page - 1) : undefined}
              nextHref={hasNext ? hrefForPage(catalog.page + 1) : undefined}
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
