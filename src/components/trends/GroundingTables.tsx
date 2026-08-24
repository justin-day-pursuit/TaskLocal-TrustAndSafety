import type { ReactNode } from "react";

import type {
  KeywordCount,
  MonthlyFlagPoint,
  ReasonCount,
  StrippedReview,
} from "@/lib/trends/types";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Table({
  caption,
  headers,
  children,
}: {
  caption: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <caption className="bg-zinc-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {caption}
        </caption>
        <thead className="bg-white">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-2 font-medium text-zinc-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

interface GroundingTablesProps {
  monthlyFlags: MonthlyFlagPoint[];
  topReasons: ReasonCount[];
  topKeywords: KeywordCount[];
  sample: StrippedReview[];
}

export function GroundingTables({
  monthlyFlags,
  topReasons,
  topKeywords,
  sample,
}: GroundingTablesProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-zinc-900">Grounding tables</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Monthly, reason, and keyword tables use the full local dataset. The
          row table below is a recent sample of stripped columns, not every
          review.
        </p>
      </div>

      <Table
        caption="Monthly review and flag counts"
        headers={["Month", "Reviews", "Flagged", "Flag rate"]}
      >
        {monthlyFlags.length === 0 ? (
          <tr>
            <td className="px-4 py-3 text-zinc-500" colSpan={4}>
              No monthly rows.
            </td>
          </tr>
        ) : (
          monthlyFlags.map((row) => (
            <tr key={row.month}>
              <td className="px-4 py-2 text-zinc-800">{row.month}</td>
              <td className="px-4 py-2 text-zinc-800">{row.total}</td>
              <td className="px-4 py-2 text-zinc-800">{row.flagged}</td>
              <td className="px-4 py-2 text-zinc-800">
                {formatPercent(row.flagRate)}
              </td>
            </tr>
          ))
        )}
      </Table>

      <Table caption="Top flag reasons" headers={["Reason", "Count"]}>
        {topReasons.length === 0 ? (
          <tr>
            <td className="px-4 py-3 text-zinc-500" colSpan={2}>
              No flagged reasons.
            </td>
          </tr>
        ) : (
          topReasons.map((row) => (
            <tr key={row.reason}>
              <td className="px-4 py-2 text-zinc-800">{row.reason}</td>
              <td className="px-4 py-2 text-zinc-800">{row.count}</td>
            </tr>
          ))
        )}
      </Table>

      <Table caption="Top comment keywords" headers={["Keyword", "Count"]}>
        {topKeywords.length === 0 ? (
          <tr>
            <td className="px-4 py-3 text-zinc-500" colSpan={2}>
              No keywords extracted.
            </td>
          </tr>
        ) : (
          topKeywords.map((row) => (
            <tr key={row.term}>
              <td className="px-4 py-2 text-zinc-800">{row.term}</td>
              <td className="px-4 py-2 text-zinc-800">{row.count}</td>
            </tr>
          ))
        )}
      </Table>

      <Table
        caption={`Recent stripped sample (${sample.length} newest row${sample.length === 1 ? "" : "s"})`}
        headers={[
          "Reviewer",
          "Rating",
          "Comment",
          "Flag",
          "Reason",
          "Created",
          "Service date",
        ]}
      >
        {sample.length === 0 ? (
          <tr>
            <td className="px-4 py-3 text-zinc-500" colSpan={7}>
              No stripped rows.
            </td>
          </tr>
        ) : (
          sample.map((row, index) => (
            <tr key={`${row.created}-${index}`}>
              <td className="px-4 py-2 capitalize text-zinc-800">
                {row.reviewer}
              </td>
              <td className="px-4 py-2 text-zinc-800">{row.rating}</td>
              <td className="max-w-xs truncate px-4 py-2 text-zinc-800" title={row.comment}>
                {row.comment || "—"}
              </td>
              <td className="px-4 py-2 text-zinc-800">
                {row.flag ? "Yes" : "No"}
              </td>
              <td className="px-4 py-2 text-zinc-800">{row.reason || "—"}</td>
              <td className="px-4 py-2 text-zinc-800">
                {formatDate(row.created)}
              </td>
              <td className="px-4 py-2 text-zinc-800">
                {formatDate(row.serviceDate)}
              </td>
            </tr>
          ))
        )}
      </Table>
    </section>
  );
}
