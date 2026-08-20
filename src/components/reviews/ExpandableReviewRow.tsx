"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  serializeActionNeededListParams,
  serializeReviewsCatalogParams,
  type ActionNeededListParams,
  type ReviewsCatalogParams,
} from "@/lib/reviews/search-params";

interface ReviewRowExpandContextValue {
  expandedId: string | undefined;
  toggleExpanded: (reviewId: string) => void;
  isExpanded: (reviewId: string) => boolean;
}

const ReviewRowExpandContext = createContext<ReviewRowExpandContextValue | null>(
  null
);

type ReviewRowExpandProviderProps =
  | {
      listPath: "/action-needed";
      listParams: ActionNeededListParams;
      initialExpandedId?: string;
      children: ReactNode;
    }
  | {
      listPath: "/reviews";
      listParams: ReviewsCatalogParams;
      initialExpandedId?: string;
      children: ReactNode;
    };

function buildHref(
  listPath: "/action-needed" | "/reviews",
  listParams: ActionNeededListParams | ReviewsCatalogParams,
  expanded?: string
): string {
  if (listPath === "/action-needed") {
    const qs = serializeActionNeededListParams({
      ...(listParams as ActionNeededListParams),
      expanded,
    });
    return qs ? `/action-needed?${qs}` : "/action-needed";
  }

  const qs = serializeReviewsCatalogParams({
    ...(listParams as ReviewsCatalogParams),
    expanded,
  });
  return qs ? `/reviews?${qs}` : "/reviews";
}

export function ReviewRowExpandProvider(props: ReviewRowExpandProviderProps) {
  const { listPath, listParams, initialExpandedId, children } = props;
  const router = useRouter();

  const toggleExpanded = useCallback(
    (reviewId: string) => {
      const next = initialExpandedId === reviewId ? undefined : reviewId;
      router.replace(buildHref(listPath, listParams, next), { scroll: false });
    },
    [initialExpandedId, listParams, listPath, router]
  );

  const value = useMemo(
    () => ({
      expandedId: initialExpandedId,
      toggleExpanded,
      isExpanded: (reviewId: string) => initialExpandedId === reviewId,
    }),
    [initialExpandedId, toggleExpanded]
  );

  return (
    <ReviewRowExpandContext.Provider value={value}>
      {children}
    </ReviewRowExpandContext.Provider>
  );
}

export function useReviewRowExpand(): ReviewRowExpandContextValue {
  const context = useContext(ReviewRowExpandContext);

  if (!context) {
    throw new Error("useReviewRowExpand must be used within ReviewRowExpandProvider");
  }

  return context;
}

interface ExpandableReviewRowProps {
  reviewId: string;
  colSpan: number;
  summaryCells: ReactNode;
  panel: ReactNode;
}

export function ExpandableReviewRow({
  reviewId,
  colSpan,
  summaryCells,
  panel,
}: ExpandableReviewRowProps) {
  const { toggleExpanded, isExpanded } = useReviewRowExpand();
  const expanded = isExpanded(reviewId);
  const controlId = `review-row-${reviewId}`;

  function handleToggle() {
    toggleExpanded(reviewId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  }

  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-zinc-50 ${expanded ? "bg-zinc-50" : ""}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls={`${controlId}-panel`}
      >
        <td className="w-8 px-2 py-3">
          <span
            aria-hidden
            className={`inline-block text-zinc-500 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
        </td>
        {summaryCells}
      </tr>
      {expanded ? (
        <tr id={`${controlId}-panel`}>
          <td colSpan={colSpan + 1} className="p-0">
            {panel}
          </td>
        </tr>
      ) : null}
    </>
  );
}
