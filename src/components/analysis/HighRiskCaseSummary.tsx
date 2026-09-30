import Link from "next/link";

import type { HighRiskCase } from "@/lib/trends/types";
import { hasHighRiskCase } from "@/lib/trends/freshness-display";

interface HighRiskCaseSummaryProps {
  highRiskCase: HighRiskCase;
  isStale: boolean;
}

export function HighRiskCaseSummary({
  highRiskCase,
  isStale,
}: HighRiskCaseSummaryProps) {
  return (
    <section
      className="rounded-[10px] border border-tl-border bg-white p-6 shadow-sm"
      aria-labelledby="high-risk-case-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="high-risk-case-heading"
            className="text-lg font-medium text-tl-text"
          >
            High-risk case
          </h3>
          <p className="mt-1 text-sm text-tl-muted">
            From the latest successful analysis. Open matching reports on the
            dashboard.
          </p>
        </div>
        {isStale ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
            <span aria-hidden="true">!</span>
            <span>Stale analysis</span>
          </span>
        ) : null}
      </div>

      {hasHighRiskCase(highRiskCase) ? (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-tl-text">
              {highRiskCase.title}
            </h4>
            <p className="mt-2 text-sm text-tl-text">{highRiskCase.summary}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-tl-text">Rationale</h4>
            <p className="mt-1 text-sm text-tl-muted">{highRiskCase.rationale}</p>
          </div>
          {highRiskCase.searchTerms.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-tl-text">
                Search terms
              </h4>
              <ul
                className="mt-2 flex flex-wrap gap-2"
                aria-label="High-risk search terms"
              >
                {highRiskCase.searchTerms.map((term) => (
                  <li key={term}>
                    <span className="inline-flex rounded-full bg-tl-surface px-2.5 py-0.5 text-xs font-medium text-tl-text ring-1 ring-tl-border">
                      {term}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link
            href="/?view=highRisk"
            className="inline-flex text-sm font-medium text-tl-primary underline-offset-2 hover:underline"
          >
            View high-risk reports on dashboard
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-tl-muted">
          No high-risk case was identified in the latest analysis. The model did
          not surface a case that requires immediate attention.
        </p>
      )}
    </section>
  );
}
