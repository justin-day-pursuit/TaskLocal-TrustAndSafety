interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}
    </div>
  );
}
