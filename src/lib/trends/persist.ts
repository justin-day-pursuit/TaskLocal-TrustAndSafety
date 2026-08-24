import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TrendReport } from "@/lib/trends/types";

export const DEFAULT_TREND_REPORT_PATH = path.join(
  process.cwd(),
  "data",
  "trends-last-report.json"
);

function isTrendReport(value: unknown): value is TrendReport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const report = value as Partial<TrendReport>;
  return (
    typeof report.generatedAt === "string" &&
    typeof report.modelUsed === "string" &&
    typeof report.aggregates === "object" &&
    report.aggregates !== null &&
    typeof report.insights === "object" &&
    report.insights !== null &&
    typeof report.watermark === "object" &&
    report.watermark !== null
  );
}

export async function loadLastTrendReport(
  filePath = DEFAULT_TREND_REPORT_PATH
): Promise<TrendReport | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isTrendReport(parsed) ? parsed : null;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "ENOENT") {
      return null;
    }
    return null;
  }
}

export async function saveTrendReport(
  report: TrendReport,
  filePath = DEFAULT_TREND_REPORT_PATH
): Promise<{ error: string | null }> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save trend report";
    return { error: message };
  }
}
