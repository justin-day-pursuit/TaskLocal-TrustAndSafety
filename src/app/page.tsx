import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatCard } from "@/components/ui/StatCard";
import { testConnection } from "@/lib/queries/connection";
import { getReviewStats } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [connection, statsResult] = await Promise.all([
    testConnection(),
    getReviewStats(),
  ]);

  const errors = [
    !connection.connected ? connection.error : null,
    statsResult.error,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Overview of review activity and flagged issues across the
            marketplace.
          </p>
        </div>
        <ConnectionStatus
          connected={connection.connected}
          error={connection.error}
        />
      </div>

      {errors.length > 0 ? (
        <ErrorBanner message={errors.join(" ")} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Reviews"
          value={statsResult.data?.total ?? "—"}
          description="All reviews in the shared database"
        />
        <StatCard
          label="Flagged Reviews"
          value={statsResult.data?.flagged ?? "—"}
          description="Reviews marked with an issue"
        />
        <StatCard
          label="Unhandled Flags"
          value={statsResult.data?.unhandled ?? "—"}
          description="Flagged reviews not yet resolved"
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-medium text-zinc-900">Coming next</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
          <li>Flagged booking drill-down with booking and provider context</li>
          <li>Trend charts for flags, review volume, and sentiment</li>
          <li>Natural language themes from reciprocal review comments</li>
        </ul>
      </section>
    </div>
  );
}
