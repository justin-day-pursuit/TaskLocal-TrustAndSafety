import { TrendsWorkspace } from "@/app/trends/TrendsWorkspace";
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

  const initialReport = await loadLastTrendReport();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <TrendsWorkspace
        initialReport={initialReport}
        autoGenerate={autoGenerate}
      />
    </div>
  );
}
