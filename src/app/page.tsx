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
    <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Overview of review activity and flagged issues across the
            marketplace.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ConnectionStatus
            connected={connection.connected}
            error={connection.error}
          />
          <Link
            href="/trends?generate=1"
            className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Generate trend report
          </Link>
        </div>
      </div>

      {errors.length > 0 ? (
        <ErrorBanner message={errors.join(" ")} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Reviews"
          value={statsResult.data?.total ?? "—"}
          description="All reviews in the shared database"
          href="/reviews"
        />
        <StatCard
          label="Flagged Reviews"
          value={statsResult.data?.flagged ?? "—"}
          description="Reviews marked with an issue"
          href="/reviews?flag=true"
        />
        <StatCard
          label="Unhandled Flags"
          value={statsResult.data?.unhandled ?? "—"}
          description="Flagged reviews not yet resolved"
          href="/action-needed"
        />
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-medium text-zinc-900">Moderation workflow</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Use the Action needed queue to triage open reports, review booking and
          listing context, and resolve items when reviewed.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            <Link
              href="/action-needed"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Action needed queue
            </Link>{" "}
            — oldest unresolved flags first, with repeat-flag counts
          </li>
          <li>
            <Link
              href="/reviews"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Reviews catalog
            </Link>{" "}
            — browse and filter all reviews, including flagged items
          </li>
          <li>
            Review detail — full review, booking, and listing context before
            resolving
          </li>
          <li>
            <Link
              href="/trends?generate=1"
              className="font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Generate trend report
            </Link>{" "}
            — Gemini analysis of stripped reviews: flag trends, sentiment,
            keywords, and an action plan
          </li>
        </ul>
      </section>
    </div>
    </div>
  );
}
