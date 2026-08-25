import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import { CHART_COLORS } from "@/lib/trends/chart-layout";
import type { KeywordCount } from "@/lib/trends/types";

interface WordCloudProps {
  keywords: KeywordCount[];
  caption?: string;
}

function wordCloudColor(weight: number): string {
  if (weight >= 0.66) {
    return CHART_COLORS.bar;
  }
  if (weight >= 0.33) {
    return "#7c3aed";
  }
  return CHART_COLORS.line;
}

export function WordCloud({ keywords, caption }: WordCloudProps) {
  const captionId = useId();

  if (keywords.length === 0) {
    return (
      <p className="text-sm text-tl-muted">
        No repeated comment keywords to display yet.
      </p>
    );
  }

  const maxCount = Math.max(...keywords.map((item) => item.count), 1);

  return (
    <div>
      <div
        role="img"
        aria-label="Keyword cloud"
        aria-describedby={caption ? captionId : undefined}
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-[10px] bg-tl-surface px-4 py-6"
      >
        {keywords.map((item) => {
          const weight = item.count / maxCount;
          const fontSize = 12 + weight * 22;
          const opacity = 0.7 + weight * 0.3;
          return (
            <span
              key={item.term}
              title={`${item.term}: ${item.count}`}
              className="font-medium"
              style={{
                fontSize: `${fontSize}px`,
                opacity,
                color: wordCloudColor(weight),
              }}
            >
              {item.term}
            </span>
          );
        })}
      </div>
      {caption ? <ChartCaption id={captionId}>{caption}</ChartCaption> : null}
    </div>
  );
}
