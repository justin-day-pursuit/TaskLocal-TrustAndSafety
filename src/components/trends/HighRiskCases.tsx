import Link from "next/link";

import {
  parseReviewsCatalogParams,
  reviewsHref,
} from "@/lib/reviews/search-params";
import type { HighRiskCase, HighRiskSeverity, HighRiskType } from "@/lib/trends/types";

const COMMENT_EXCERPT_LENGTH = 160;

const RISK_TYPE_LABELS: Record<HighRiskType, string> = {
  safety: "Safety",
  trust: "Trust",
  policy: "Policy",
  platform: "Platform",
};

interface HighRiskCasesProps {
  cases: HighRiskCase[];
}

function severityClassName(severity: HighRiskSeverity): string {
  if (severity === "critical") {
    return "bg-tl-danger text-white";
  }
  return "bg-amber-500 text-white";
}

function caseHref(item: HighRiskCase): string {
  if (item.flag && !item.handled) {
    return `/action-needed/${item.reviewId}`;
  }
  return reviewsHref(parseReviewsCatalogParams({ qReview: item.reviewId }));
}

function commentExcerpt(comment: string): string {
  if (!comment) {
    return "—";
  }
  if (comment.length <= COMMENT_EXCERPT_LENGTH) {
    return comment;
  }
  return `${comment.slice(0, COMMENT_EXCERPT_LENGTH)}…`;
}

export function HighRiskCases({ cases }: HighRiskCasesProps) {
  return (
    <section className="rounded-[10px] border border-tl-border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-tl-text">High-risk cases</h3>
      <p className="mt-1 text-sm text-tl-muted">
        Sample of reviews sent to Gemini, not a full-corpus scan. Open a case in
        the action-needed queue or reviews catalog.
      </p>
      {cases.length === 0 ? (
        <p className="mt-4 text-sm text-tl-muted">
          No high-risk or critical cases identified in this sample.
        </p>
      ) : (
        <div
          role="list"
          aria-label="High-risk cases"
          className="mt-4 grid gap-3 lg:grid-cols-2"
        >
          {cases.map((item) => (
            <article
              key={item.reviewId}
              role="listitem"
              className="rounded-[10px] border border-tl-border bg-tl-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${severityClassName(item.severity)}`}
                >
                  {item.severity}
                </span>
                <span className="inline-flex rounded-full bg-tl-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                  {RISK_TYPE_LABELS[item.riskType]}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-tl-text">{item.summary}</p>
              {item.whyItMatters ? (
                <p className="mt-2 text-sm text-tl-text">{item.whyItMatters}</p>
              ) : null}
              {item.recommendedAction ? (
                <p className="mt-2 text-sm text-tl-muted">
                  <span className="font-medium text-tl-text">Recommended: </span>
                  {item.recommendedAction}
                </p>
              ) : null}
              <p className="mt-2 text-sm italic text-tl-muted">
                “{commentExcerpt(item.comment)}”
              </p>
              <Link
                href={caseHref(item)}
                className="mt-3 inline-flex text-sm font-medium text-tl-primary underline-offset-2 hover:underline"
              >
                {item.flag && !item.handled
                  ? "Open in action needed"
                  : "View in reviews catalog"}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
