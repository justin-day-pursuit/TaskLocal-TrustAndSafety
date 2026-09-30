import { Suspense } from "react";

import { AnalysisWorkspace } from "@/app/analysis/AnalysisWorkspace";
import { QueryLoadingStatus } from "@/components/ui/QueryCallStatus";
import { getAppTimeZone } from "@/lib/config/app-timezone";
import { computeFreshness } from "@/lib/trends/freshness";
import { loadLastTrendReport } from "@/lib/trends/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface AnalysisPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const rawParams = await searchParams;
  const generateParam = rawParams.generate;
  const autoGenerate =
    generateParam === "1" || generateParam === "true";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-tl-surface">
      <Suspense fallback={<QueryLoadingStatus copyKey="analysisReport" />}>
        <AnalysisPageData autoGenerate={autoGenerate} />
      </Suspense>
    </div>
  );
}

async function AnalysisPageData({ autoGenerate }: { autoGenerate: boolean }) {
  const loaded = await loadLastTrendReport();
  const appTimeZone = getAppTimeZone();
  const freshness = computeFreshness({
    lastSuccessAt: loaded.data?.generatedAt ?? null,
    now: new Date(),
    timeZone: appTimeZone,
  });

  return (
    <AnalysisWorkspace
      initialReport={loaded.data}
      initialFreshness={freshness}
      appTimeZone={appTimeZone}
      autoGenerate={autoGenerate}
      loadError={loaded.error}
      loadFailureKind={loaded.failureKind}
    />
  );
}
