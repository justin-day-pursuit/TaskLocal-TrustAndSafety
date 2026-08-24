"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resolveReviewAction } from "@/app/action-needed/actions";
import {
  QueryFailureStatus,
  QuerySpinner,
} from "@/components/ui/QueryCallStatus";
import { QUERY_COPY, type QueryFailureKind } from "@/lib/queries/query-status";

interface ResolveButtonProps {
  reviewId: string;
  label?: string;
  className?: string;
  redirectTo?: string;
}

export function ResolveButton({
  reviewId,
  label = "Resolve",
  className,
  redirectTo,
}: ResolveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<{
    kind: QueryFailureKind;
    error: string;
  } | null>(null);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setFailure(null);
    startTransition(async () => {
      const result = await resolveReviewAction(reviewId);

      if (result?.error) {
        setFailure({
          kind: result.failureKind ?? "error",
          error: result.error,
        });
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isPending ? (
          <>
            <QuerySpinner className="text-white" />
            {QUERY_COPY.resolve.loading}
          </>
        ) : (
          label
        )}
      </button>
      {failure ? (
        <QueryFailureStatus
          copyKey="resolve"
          kind={failure.kind}
          detail={failure.error}
        />
      ) : null}
    </div>
  );
}
