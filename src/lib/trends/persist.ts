import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createServerClient } from "@/lib/supabase/server";
import { isGeminiInsights } from "@/lib/trends/insights";
import type { TrendAggregates, TrendReport, TrendWatermark } from "@/lib/trends/types";

export const DEFAULT_TREND_REPORT_PATH = path.join(
  process.cwd(),
  "data",
  "trends-last-report.json"
);

const STORAGE_BUCKET = "tasklocal-trends";
const STORAGE_OBJECT = "last-report.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWatermark(value: unknown): value is TrendWatermark {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.rowCount === "number" &&
    (typeof value.newestCreated === "string" || value.newestCreated === null)
  );
}

function isAggregates(value: unknown): value is TrendAggregates {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.totalReviews === "number" &&
    Array.isArray(value.monthlyFlags) &&
    Array.isArray(value.monthlySentiment) &&
    Array.isArray(value.ratingDistribution) &&
    Array.isArray(value.topReasons) &&
    Array.isArray(value.topKeywords)
  );
}

export function isTrendReport(value: unknown): value is TrendReport {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.generatedAt === "string" &&
    typeof value.modelUsed === "string" &&
    isAggregates(value.aggregates) &&
    isGeminiInsights(value.insights) &&
    isWatermark(value.watermark) &&
    Array.isArray(value.groundingSample)
  );
}

async function loadFromFile(filePath: string): Promise<TrendReport | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isTrendReport(parsed) ? parsed : null;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code !== "ENOENT") {
      console.error("[trends] Failed to read local trend report", error);
    }
    return null;
  }
}

async function saveToFile(
  report: TrendReport,
  filePath: string
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

async function ensureTrendsBucket(): Promise<{ error: string | null }> {
  try {
    const supabase = createServerClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      return { error: listError.message };
    }
    if (buckets?.some((bucket) => bucket.name === STORAGE_BUCKET)) {
      return { error: null };
    }
    const { error: createError } = await supabase.storage.createBucket(
      STORAGE_BUCKET,
      { public: false }
    );
    if (createError && !/already exists|duplicate/i.test(createError.message)) {
      return { error: createError.message };
    }
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare storage bucket";
    return { error: message };
  }
}

async function loadFromSupabaseStorage(): Promise<TrendReport | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(STORAGE_OBJECT);

    if (error || !data) {
      return null;
    }

    const parsed: unknown = JSON.parse(await data.text());
    return isTrendReport(parsed) ? parsed : null;
  } catch (error) {
    console.error("[trends] Failed to load report from Supabase Storage", error);
    return null;
  }
}

async function saveToSupabaseStorage(
  report: TrendReport
): Promise<{ error: string | null }> {
  try {
    const prepared = await ensureTrendsBucket();
    if (prepared.error) {
      return prepared;
    }

    const supabase = createServerClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(STORAGE_OBJECT, Buffer.from(JSON.stringify(report), "utf8"), {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save trend report to Supabase Storage";
    return { error: message };
  }
}

export async function loadLastTrendReport(
  filePath?: string
): Promise<TrendReport | null> {
  if (filePath) {
    return loadFromFile(filePath);
  }

  const stored = await loadFromSupabaseStorage();
  if (stored) {
    return stored;
  }
  return loadFromFile(DEFAULT_TREND_REPORT_PATH);
}

export async function saveTrendReport(
  report: TrendReport,
  filePath?: string
): Promise<{ error: string | null }> {
  if (filePath) {
    return saveToFile(report, filePath);
  }

  const stored = await saveToSupabaseStorage(report);
  const local = await saveToFile(report, DEFAULT_TREND_REPORT_PATH);

  if (!stored.error) {
    return { error: null };
  }
  if (!local.error) {
    return {
      error: `Saved on this server only. Supabase Storage failed (${stored.error}), so a Vercel redeploy may lose this report.`,
    };
  }
  return { error: stored.error };
}
