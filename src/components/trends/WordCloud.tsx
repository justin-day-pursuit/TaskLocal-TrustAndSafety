import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import { CHART_COLORS } from "@/lib/trends/chart-layout";
import {
  WORD_CLOUD_LAYOUT,
  layoutCircularWordCloud,
  type CloudWordInput,
} from "@/lib/trends/word-cloud-layout";

interface WordCloudProps {
  items: CloudWordInput[];
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

export function WordCloud({ items, caption }: WordCloudProps) {
  const captionId = useId();
  const size = WORD_CLOUD_LAYOUT.size;

  if (items.length === 0) {
    return (
      <p className="text-sm text-tl-muted">
        Regenerate to build the semantic keyword cloud
      </p>
    );
  }

  const maxCount = Math.max(...items.map((item) => item.count), 1);
  const laidOut = layoutCircularWordCloud(items, size);

  return (
    <div>
      <div className="mx-auto max-w-md">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Semantic keyword cloud"
          aria-describedby={caption ? captionId : undefined}
          className="h-auto w-full rounded-[10px] bg-tl-surface"
        >
          {laidOut.map((word) => {
            const weight = word.count / maxCount;
            return (
              <text
                key={`${word.category}-${word.term}`}
                x={word.x}
                y={word.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={wordCloudColor(weight)}
                fontSize={word.fontSize}
                fontWeight={weight >= 0.66 ? 650 : 500}
                opacity={0.72 + weight * 0.28}
              >
                <title>{`${word.term}: ${word.count}`}</title>
                {word.term}
              </text>
            );
          })}
        </svg>
      </div>
      {caption ? <ChartCaption id={captionId}>{caption}</ChartCaption> : null}
    </div>
  );
}
