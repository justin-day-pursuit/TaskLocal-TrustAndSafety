import { Suspense } from "react";

import { TrendsWorkspace } from "@/app/trends/TrendsWorkspace";
import { QueryLoadingStatus } from "@/components/ui/QueryCallStatus";
import { loadLastTrendReport } from "@/lib/trends/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface TrendsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
  const rawParams = await searchParams;
  const generateParam = rawParams.generate;
  const autoGenerate =
    generateParam === "1" || generateParam === "true";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Suspense fallback={<QueryLoadingStatus copyKey="trendReport" />}>
        <TrendsPageData autoGenerate={autoGenerate} />
      </Suspense>
    </div>
  );
}

async function TrendsPageData({ autoGenerate }: { autoGenerate: boolean }) {
  const loaded = await loadLastTrendReport();

  return (
    <TrendsWorkspace
      initialReport={loaded.data}
      autoGenerate={autoGenerate}
      loadError={loaded.error}
      loadFailureKind={loaded.failureKind}
    />
  );
}
