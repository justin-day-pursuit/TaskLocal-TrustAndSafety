interface ConnectionStatusProps {
  connected: boolean;
  error?: string;
}

export function ConnectionStatus({ connected, error }: ConnectionStatusProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        connected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {connected ? "Connected to Supabase" : "Not connected"}
      {!connected && error ? (
        <span className="font-normal text-red-600">— {error}</span>
      ) : null}
    </div>
  );
}
