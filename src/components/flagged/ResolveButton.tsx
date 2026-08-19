"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { resolveReviewAction } from "@/app/flagged/actions";

interface ResolveButtonProps {
  reviewId: string;
  label?: string;
  className?: string;
}

export function ResolveButton({
  reviewId,
  label = "Resolve",
  className,
}: ResolveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await resolveReviewAction(reviewId);

      if (result?.error) {
        window.alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        className ??
        "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isPending ? "Resolving…" : label}
    </button>
  );
}
