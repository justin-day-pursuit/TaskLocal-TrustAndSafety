import { redirect } from "next/navigation";

import {
  reviewsHref,
  ReviewsCatalogControls,
} from "@/components/reviews/ReviewsCatalogControls";
import { PaginationBar } from "@/components/reviews/PaginationBar";
import { PostgrestCapNote } from "@/components/reviews/PostgrestCapNote";
import { ReviewsCatalogTable } from "@/components/reviews/ReviewsCatalogTable";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getReviewCatalog } from "@/lib/queries/review-catalog";
import { buildReviewListPresentation } from "@/lib/reviews/reviewListPresentation";
import {
  DEFAULT_PAGE,
  mergeReviewsCatalogParams,
  parseReviewsCatalogParams,
  requiresBookingFirstQuery,
  type PageSize,
} from "@/lib/reviews/search-params";

export const dynamic = "force-dynamic";

interface ReviewsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const rawParams = await searchParams;
  const catalogParams = parseReviewsCatalogParams(rawParams);
  const catalog = await getReviewCatalog(catalogParams);

  if (catalog.totalCount > 0 && catalog.page !== catalogParams.page) {
    redirect(
      reviewsHref(
        mergeReviewsCatalogParams(catalogParams, { page: catalog.page })
      )
    );
  }

  const presentation = buildReviewListPresentation(
    catalog.error ? null : catalog.reviews,
    catalog.error,
    catalog.error
      ? null
      : { data: catalog.bookings, error: catalog.bookingsError }
  );

  const showCapNote =
    requiresBookingFirstQuery(catalogParams) && catalog.postgrestCapHit;

  const showPageReset =
    catalogParams.page > DEFAULT_PAGE &&
    catalog.totalCount === 0 &&
    !catalog.error;

  function hrefForPage(page: number): string {
    return reviewsHref(mergeReviewsCatalogParams(catalogParams, { page }));
  }

  function hrefForPageSize(pageSize: PageSize): string {
    return reviewsHref(
      mergeReviewsCatalogParams(catalogParams, {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Reviews</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Full catalog of marketplace reviews — search, filter, and sort across
          review and booking fields.
        </p>
      </div>

      <ReviewsCatalogControls params={catalogParams} />

      {showCapNote ? <PostgrestCapNote visible /> : null}

      {presentation.primaryError ? (
        <ErrorBanner message={presentation.primaryError} />
      ) : null}
      {presentation.enrichmentError ? (
        <ErrorBanner message={presentation.enrichmentError} />
      ) : null}

      {presentation.showReviewList ? (
        <div className="space-y-4">
          <ReviewsCatalogTable reviews={catalog.reviews} />
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
      ) : null}
    </div>
  );
}
