import type { DashboardCardSignal } from "@/lib/dashboard/card-signals";
import { cardSignalText } from "@/lib/dashboard/card-signals";

interface ActionCardProps {
  label: string;
  value: number | string;
  description: string;
  selected: boolean;
  signal: DashboardCardSignal;
  iconLabel: string;
  onSelect: () => void;
}

function signalIcon(signal: DashboardCardSignal): string | null {
  switch (signal) {
    case "attention":
      return "!";
    case "high-risk":
      return "⚠";
    case "stale-warning":
      return "⏱";
    default:
      return null;
  }
}

export function ActionCard({
  label,
  value,
  description,
  selected,
  signal,
  iconLabel,
  onSelect,
}: ActionCardProps) {
  const signalText = cardSignalText(signal);
  const icon = signalIcon(signal);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${label}: ${value}${signalText ? `, ${signalText}` : ""}`}
      className={`w-full rounded-lg border p-5 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
        selected
          ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900 ring-offset-2"
          : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <span className="text-sm font-medium text-zinc-700" aria-hidden="true">
          {iconLabel === "Reports" ? "R" : iconLabel === "Unresolved reports" ? "U" : "H"}
        </span>
      </div>
      <span className="sr-only">{iconLabel}</span>
      <p className="mt-2 text-[1.75rem] font-semibold leading-none text-zinc-900">
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      {signalText ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900">
          {icon ? <span aria-hidden="true">{icon}</span> : null}
          <span>{signalText}</span>
        </p>
      ) : null}
    </button>
  );
}
