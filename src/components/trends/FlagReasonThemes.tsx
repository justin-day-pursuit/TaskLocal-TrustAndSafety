import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import type { GeminiFlagReasonTheme } from "@/lib/trends/types";

export const FLAG_REASON_THEMES_COPY = {
  emptyWithReasons:
    "No report-reason themes yet. Regenerate to cluster free-typed reasons.",
  emptyNoReasons: "No report reasons to theme yet.",
  listAriaLabel: "Report reason themes",
} as const;

interface FlagReasonThemesProps {
  themes: GeminiFlagReasonTheme[];
  hasFlaggedReasons: boolean;
  caption?: string;
}

export function FlagReasonThemes({
  themes,
  hasFlaggedReasons,
  caption,
}: FlagReasonThemesProps) {
  const captionId = useId();

  return (
    <div>
      {themes.length === 0 ? (
        <p className="text-sm text-tl-muted">
          {hasFlaggedReasons
            ? FLAG_REASON_THEMES_COPY.emptyWithReasons
            : FLAG_REASON_THEMES_COPY.emptyNoReasons}
        </p>
      ) : (
        <div
          role="list"
          aria-label={FLAG_REASON_THEMES_COPY.listAriaLabel}
          aria-describedby={caption ? captionId : undefined}
          className="grid gap-3 sm:grid-cols-2"
        >
          {themes.map((theme, index) => (
            <article
              key={`${theme.theme}-${index}`}
              role="listitem"
              className="rounded-[10px] border border-tl-border bg-tl-surface p-4"
            >
              <span className="inline-flex rounded-full bg-tl-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                {theme.theme}
              </span>
              {theme.meaning ? (
                <p className="mt-2 text-sm text-tl-text">{theme.meaning}</p>
              ) : null}
              {theme.examples.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {theme.examples.map((example) => (
                    <li
                      key={example}
                      className="text-sm italic text-tl-muted"
                    >
                      “{example}”
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {caption ? <ChartCaption id={captionId}>{caption}</ChartCaption> : null}
    </div>
  );
}
