type ConnectionStatusValue = "connected" | "error" | "timeout";

interface ConnectionStatusProps {
  status: ConnectionStatusValue;
  error?: string;
}

export function ConnectionStatus({ status, error }: ConnectionStatusProps) {
  const connected = status === "connected";
  const timedOut = status === "timeout";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        connected
          ? "bg-emerald-50 text-emerald-700"
          : timedOut
            ? "bg-amber-50 text-amber-800"
            : "bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected
            ? "bg-emerald-500"
            : timedOut
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />
      {connected
        ? "Connected to Supabase"
        : timedOut
          ? "Connection timed out"
          : "Not connected"}
      {!connected && error ? (
        <span
          className={`font-normal ${timedOut ? "text-amber-700" : "text-red-600"}`}
        >
          — {error}
        </span>
      ) : null}
    </div>
  );
}
