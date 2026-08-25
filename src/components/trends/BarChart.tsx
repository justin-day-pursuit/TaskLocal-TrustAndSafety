import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import {
  CHART_COLORS,
  CHART_LAYOUT,
  formatChartCount,
  formatChartCountExact,
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
  valueFormat,
}: BarChartProps) {
  const captionId = useId();
  const plot = getPlotRect();
  const { width, height, padding, innerHeight } = plot;
  const formatTick = valueFormat ?? formatChartCount;
  const formatExact = valueFormat ?? formatChartCountExact;

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
          x={CHART_LAYOUT.yAxisTitleX}
          y={padding.top + innerHeight / 2}
          fill={CHART_COLORS.muted}
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90 ${CHART_LAYOUT.yAxisTitleX} ${padding.top + innerHeight / 2})`}
        >
          {yLabel}
        </text>
        {layout.ticks.map((value) => {
          const y =
            padding.top + innerHeight - (value / layout.yMax) * innerHeight;
          return (
            <g key={value}>
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
                {formatTick(value)}
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
                <title>{`${point.label}: ${formatExact(point.value)}`}</title>
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
