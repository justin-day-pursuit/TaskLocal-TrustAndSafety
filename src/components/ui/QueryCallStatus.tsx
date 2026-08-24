import {
  copyForFailure,
  QUERY_COPY,
  type QueryCopyKey,
  type QueryFailureKind,
} from "@/lib/queries/query-status";

export function QuerySpinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden
    />
  );
}

interface QueryCallStatusProps {
  status: "loading" | "error" | "timeout";
  message: string;
  detail?: string | null;
}

export function QueryCallStatus({
  status,
  message,
  detail,
}: QueryCallStatusProps) {
  if (status === "loading") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600"
        role="status"
        aria-live="polite"
      >
        <QuerySpinner className="text-zinc-700" />
        <p>{message}</p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        role="alert"
      >
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      <p>{message}</p>
      {detail ? (
        <p className="mt-1 text-xs font-normal text-red-600">{detail}</p>
      ) : null}
    </div>
  );
}

export function QueryFailureStatus({
  copyKey,
  kind,
  detail,
}: {
  copyKey: QueryCopyKey;
  kind: QueryFailureKind | null | undefined;
  detail?: string | null;
}) {
  const status = kind === "timeout" ? "timeout" : "error";
  return (
    <QueryCallStatus
      status={status}
      message={copyForFailure(copyKey, kind)}
      detail={status === "error" ? detail : null}
    />
  );
}

export function QueryLoadingStatus({ copyKey }: { copyKey: QueryCopyKey }) {
  return (
    <QueryCallStatus status="loading" message={QUERY_COPY[copyKey].loading} />
  );
}
