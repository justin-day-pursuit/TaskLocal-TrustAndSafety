import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  getPlotRect,
  layoutBars,
} from "@/lib/trends/chart-layout";

interface BarChartProps {
  data: { label: string; value: number }[];
  yLabel: string;
  caption?: string;
  valueFormat?: (value: number) => string;
}

export function BarChart({
  data,
  yLabel,
  caption,
  valueFormat = (value) => String(value),
}: BarChartProps) {
  const captionId = useId();
  const plot = getPlotRect();
  const { width, height, padding, innerHeight } = plot;

  if (data.length === 0) {
    return (
      <p className="text-sm text-tl-muted">No data points to chart yet.</p>
    );
  }

  const layout = layoutBars(data.map((point) => point.value));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${yLabel} bar chart`}
        aria-describedby={caption ? captionId : undefined}
        className="h-auto w-full"
      >
        <text
          x={12}
          y={padding.top + innerHeight / 2}
          fill={CHART_COLORS.muted}
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90 12 ${padding.top + innerHeight / 2})`}
        >
          {yLabel}
        </text>
        {[0, 0.5, 1].map((tick) => {
          const y = padding.top + innerHeight - tick * innerHeight;
          const value = layout.yMax * tick;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={CHART_COLORS.grid}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill={CHART_COLORS.muted}
                fontSize="10"
              >
                {valueFormat(value)}
              </text>
            </g>
          );
        })}
        {data.map((point, index) => {
          const bar = layout.bars[index];
          if (!bar) {
            return null;
          }
          return (
            <g key={`${point.label}-${index}`}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={CHART_COLORS.bar}
                rx={CHART_LAYOUT.barRadius}
              >
                <title>{`${point.label}: ${valueFormat(point.value)}`}</title>
              </rect>
              <text
                x={bar.x + bar.width / 2}
                y={height - 16}
                textAnchor="middle"
                fill={CHART_COLORS.muted}
                fontSize="10"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {caption ? <ChartCaption id={captionId}>{caption}</ChartCaption> : null}
    </div>
  );
}
