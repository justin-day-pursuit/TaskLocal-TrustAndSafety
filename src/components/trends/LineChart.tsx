import { useId } from "react";

import { ChartCaption } from "@/components/trends/ChartCaption";
import {
  CHART_COLORS,
  getPlotRect,
  layoutLineXs,
  scaleMaxWithHeadroom,
  valueToY,
} from "@/lib/trends/chart-layout";

interface LineChartProps {
  data: { label: string; value: number }[];
  yLabel: string;
  yMin?: number;
  yMax?: number;
  caption?: string;
  valueFormat?: (value: number) => string;
}

export function LineChart({
  data,
  yLabel,
  yMin = 0,
  yMax,
  caption,
  valueFormat = (value) => value.toFixed(1),
}: LineChartProps) {
  const captionId = useId();
  const plot = getPlotRect();
  const { width, height, padding, innerHeight } = plot;

  if (data.length === 0) {
    return (
      <p className="text-sm text-tl-muted">No data points to chart yet.</p>
    );
  }

  const dataMax = Math.max(...data.map((point) => point.value), 1);
  const maxValue = yMax ?? scaleMaxWithHeadroom(dataMax);
  const minValue = yMin;
  const range = Math.max(maxValue - minValue, 0.1);
  const xs = layoutLineXs(data.length, plot);

  const points = data.map((point, index) => ({
    ...point,
    x: xs[index] ?? plot.plotLeft,
    y: valueToY(point.value, minValue, maxValue, plot),
  }));

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${yLabel} line chart`}
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
          const value = minValue + range * tick;
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
        <polyline
          fill="none"
          stroke={CHART_COLORS.line}
          strokeWidth="2"
          points={polyline}
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="3.5" fill={CHART_COLORS.line}>
              <title>{`${point.label}: ${valueFormat(point.value)}`}</title>
            </circle>
            <text
              x={point.x}
              y={height - 16}
              textAnchor="middle"
              fill={CHART_COLORS.muted}
              fontSize="10"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      {caption ? <ChartCaption id={captionId}>{caption}</ChartCaption> : null}
    </div>
  );
}
