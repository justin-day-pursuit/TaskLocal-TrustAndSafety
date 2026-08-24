"use client";

import { useTransition, type ReactNode, type TransitionStartFunction } from "react";

import { ReviewsCatalogControls } from "@/components/reviews/ReviewsCatalogControls";
import { QueryLoadingStatus } from "@/components/ui/QueryCallStatus";
import type { ReviewsCatalogParams } from "@/lib/reviews/search-params";

interface ReviewsCatalogShellProps {
  params: ReviewsCatalogParams;
  children: ReactNode;
}

export function ReviewsCatalogShell({
  params,
  children,
}: ReviewsCatalogShellProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="min-h-0 shrink overflow-y-auto">
        <ReviewsCatalogControls
          params={params}
          startTransition={startTransition}
        />
      </div>
      {isPending ? (
        <QueryLoadingStatus copyKey="reviewsCatalog" />
      ) : (
        children
      )}
    </>
  );
}

export type { TransitionStartFunction };
