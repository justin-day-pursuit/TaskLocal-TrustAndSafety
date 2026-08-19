import Link from "next/link";

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
        <h3 className="text-lg font-medium text-zinc-900">Moderation workflow</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Use the flagged queue to triage open reports, review booking and
          listing context, and resolve items when reviewed.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            <Link href="/flagged" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              Flagged queue
            </Link>{" "}
            — oldest unresolved flags first, with repeat-flag counts
          </li>
          <li>
            Review detail — full review, booking, and listing context before
            resolving
          </li>
        </ul>
      </section>
    </div>
  );
}
